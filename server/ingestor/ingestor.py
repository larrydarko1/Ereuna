import sys
sys.path.append('.')
import datetime as dt
import os
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, Request, status, Body
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import websockets
import ssl
import asyncio
import motor.motor_asyncio
import traceback
import logging
from server.aggregator.aggregator import pubsub_channels, get_latest_in_progress_candle
import redis.asyncio as aioredis
from bson import ObjectId
from dateutil.parser import isoparse
import datetime
from starlette.websockets import WebSocketDisconnect
from pydantic import BaseModel, validator
import re

load_dotenv()

# --- Logging setup (stdout-only for Docker/promtail) ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("websocket")
TIINGO_API_KEY = os.getenv('TIINGO_KEY')

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection setup
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
mongo_client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db = mongo_client.get_database('EreunaDB')

# Redis-only pipeline: no local in-process queue
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
try:
    redis_client = aioredis.from_url(REDIS_URL)
    logger.info(f"Initialized async Redis client for {REDIS_URL}")
except Exception as e:
    redis_client = None
    logger.warning(f"Failed to initialize Redis client at {REDIS_URL}: {e}")

# In-memory cache for latest quotes per symbol
latest_quotes = {}  # {symbol: tiingo_data_dict}


# Only stocks/ETFs: get tickers from DB at startup in production
API_KEY = os.getenv("VITE_EREUNA_KEY")
stock_symbols = []
ssl_ctx = ssl.create_default_context()

def stock_filter(msg):
    return msg.get("messageType") == "A" and isinstance(msg.get("data"), list) and len(msg["data"]) >= 3

import time
import signal
import sys

# Bandwidth tracking for stocks only
stock_bandwidth_stats = {}  # {symbol: {'bytes': int, 'messages': int}}
stock_bandwidth_history = {}  # {symbol: [(timestamp, bytes)]}
last_report_time = 0
MARKET_OPEN_HOUR = 13  # UTC 13:30 (9:30am ET)
MARKET_CLOSE_HOUR = 20  # UTC 20:00 (4:00pm ET)
MARKET_OPEN_MINUTE = 30
MARKET_CLOSE_MINUTE = 1

def print_total_bandwidth():
    print("\n=== TOTAL BANDWIDTH USAGE PER TICKER (STOCKS) ===")
    total_bytes = 0
    total_msgs = 0
    for symbol, stats in stock_bandwidth_stats.items():
        print(f"{symbol.upper()}: {stats['bytes']/1024/1024:.2f} MB, {stats['messages']} msgs")
        total_bytes += stats['bytes']
        total_msgs += stats['messages']
    print(f"TOTAL STOCKS: {total_bytes/1024/1024:.2f} MB, {total_msgs} msgs (all stock/ETF tickers)")
    print("===============================================\n")

# Print totals on shutdown
def handle_shutdown(signum, frame):
    print("\nReceived shutdown signal. Printing total bandwidth usage...")
    print_total_bandwidth()
    sys.exit(0)

signal.signal(signal.SIGINT, handle_shutdown)
signal.signal(signal.SIGTERM, handle_shutdown)

def is_market_hours():
    now = datetime.datetime.utcnow()
    # Exclude weekends (Saturday=5, Sunday=6)
    if now.weekday() >= 5:
        return False
    open_time = now.replace(hour=MARKET_OPEN_HOUR, minute=MARKET_OPEN_MINUTE, second=0, microsecond=0)
    close_time = now.replace(hour=MARKET_CLOSE_HOUR, minute=MARKET_CLOSE_MINUTE, second=0, microsecond=0)
    return open_time <= now <= close_time

# Subscription management
manual_override_active = False
current_subscription_id = None  # Stores active subscriptionId
current_tickers = []           # Stores tickers for current subscription
current_subscribe_msg = None   # Stores last subscribe message
current_tiingo_ws = None       # Stores active websocket
# Background task handles (set on startup)
market_task = None
daily_scheduler_task = None

async def relay_tiingo(ws_url, subscribe_msg, ssl_ctx, filter_fn):
    global current_subscription_id, current_tickers, current_subscribe_msg, current_tiingo_ws
    logger.info(f"Starting relay_tiingo for tickers: {subscribe_msg.get('eventData', {}).get('tickers', [])}")
    while True:
        if manual_override_active:
            logger.info("[relay_tiingo] Manual override active, stopping relay loop.")
            break
        try:
            logger.info(f"Connecting to Tiingo websocket: {ws_url}")
            async with websockets.connect(ws_url, ssl=ssl_ctx) as tiingo_ws:
                current_tiingo_ws = tiingo_ws
                # Only send subscribe during market hours
                if not is_market_hours():
                    logger.info("[relay_tiingo] Not market hours; skipping subscribe and closing connection.")
                    # clear any state and close connection, then wait before retrying
                    current_tiingo_ws = None
                    try:
                        await tiingo_ws.close()
                    except Exception:
                        pass
                    await asyncio.sleep(30)
                    continue
                logger.info(f"Sending subscribe message: {subscribe_msg}")
                await tiingo_ws.send(json.dumps(subscribe_msg))
                current_subscribe_msg = subscribe_msg
                try:
                    subscribe_response = await asyncio.wait_for(tiingo_ws.recv(), timeout=5)
                    logger.info(f"[relay_tiingo] Initial subscribe response: {subscribe_response}")
                    try:
                        resp_obj = json.loads(subscribe_response)
                        current_subscription_id = resp_obj.get('data', {}).get('subscriptionId')
                        logger.info(f"[relay_tiingo] Extracted subscriptionId: {current_subscription_id}")
                        current_tickers = subscribe_msg.get("eventData", {}).get("tickers", [])
                    except Exception as e:
                        logger.error(f"[relay_tiingo] Error parsing subscriptionId: {e}")
                except Exception as e:
                    logger.error(f"[relay_tiingo] Error receiving initial subscribe response: {e}")
                try:
                    while True:
                        if manual_override_active:
                            print("[relay_tiingo] Manual override active, closing websocket and exiting.")
                            break
                        msg = await tiingo_ws.recv()
                        try:
                            tiingo_data = json.loads(msg)
                        except Exception as e:
                            logger.error(f"JSON decode error: {e}")
                            continue
                        if isinstance(tiingo_data, dict):
                            if tiingo_data.get("messageType") in ("I", "H"):
                                continue
                            if filter_fn(tiingo_data):
                                d = tiingo_data.get("data")
                                service = tiingo_data.get("service")
                                if service == "iex" and isinstance(d, list) and len(d) > 2:
                                    symbol = d[1].lower()
                                    msg_bytes = len(msg.encode("utf-8"))
                                    stats = stock_bandwidth_stats.setdefault(symbol, {'bytes': 0, 'messages': 0})
                                    stats['bytes'] += msg_bytes
                                    stats['messages'] += 1
                                    latest_quotes[symbol] = tiingo_data
                                    # Publish raw message to Redis pubsub and append to Redis Stream
                                    try:
                                        if redis_client is not None:
                                            try:
                                                pub_result = await redis_client.publish('tiingo:raw', msg)
                                                logger.debug(f"Published raw tiingo message to channel 'tiingo:raw' (subscribers={pub_result}) for symbol {symbol}")
                                            except Exception as pub_e:
                                                logger.warning(f"Redis publish failed: {pub_e}")
                                            try:
                                                xadd_id = await redis_client.xadd('tiingo:stream', {'data': msg}, maxlen=10000, approximate=True)
                                                logger.debug(f"Appended raw tiingo message to Redis stream 'tiingo:stream' (id={xadd_id}) for symbol {symbol}")
                                            except Exception as xadd_e:
                                                logger.warning(f"Redis XADD failed: {xadd_e}")
                                        else:
                                            logger.warning("Redis client not available; raw message dropped")
                                    except Exception as red_e:
                                        logger.error(f"Unexpected Redis error while publishing raw message: {red_e}")
                except Exception as inner_e:
                    logger.error(f"relay_tiingo inner exception: {inner_e}")
                    try:
                        unsubscribe_msg = {
                            "eventName": "unsubscribe",
                            "authorization": subscribe_msg.get("authorization"),
                            "eventData": {
                                "subscriptionId": current_subscription_id,
                                "tickers": current_tickers
                            }
                        }
                        logger.info(f"[relay_tiingo] Triggering unsubscribe: {unsubscribe_msg}")
                        await tiingo_ws.send(json.dumps(unsubscribe_msg))
                        logger.info("[relay_tiingo] Sent unsubscribe (with subscriptionId)")
                        try:
                            response = await asyncio.wait_for(tiingo_ws.recv(), timeout=2)
                            logger.info(f"[relay_tiingo] Tiingo response after unsubscribe: {response}")
                        except asyncio.TimeoutError:
                            logger.warning("[relay_tiingo] No response from Tiingo after unsubscribe (timeout)")
                        except Exception as resp_e:
                            logger.error(f"[relay_tiingo] Error receiving Tiingo response after unsubscribe: {resp_e}")
                    except Exception as unsub_e:
                        logger.error(f"Error sending unsubscribe: {unsub_e}")
                    current_subscription_id = None
                    current_tickers = []
                    current_subscribe_msg = None
                    current_tiingo_ws = None
                    if manual_override_active:
                        logger.info("[relay_tiingo] Manual override active after exception, exiting relay loop.")
                        break
                    raise inner_e
        except Exception as e:
            logger.error(f"Exception in relay_tiingo: {e}")
            print_total_bandwidth()
            if manual_override_active:
                logger.info("[relay_tiingo] Manual override active after outer exception, exiting relay loop.")
                break
            await asyncio.sleep(5)

# --- Market hours background manager ---
async def market_hours_manager():
    global stock_symbols, tiingo_ws
    global current_tiingo_ws
    tiingo_task = None
    aggregator_task = None
    higher_tf_task = None
    subscribed = False
    # assetinfo_coll = db.AssetInfo  # Not used for now
    ws_url = "wss://api.tiingo.com/iex"
    stock_subscribe_msg = None
    # tiingo_ws is now always global
    logger.info("Starting market_hours_manager loop.")
    while True:
        if manual_override_active:
            logger.info("[MarketHours] Manual override active, stopping market hours manager loop.")
            # Cancel relay and aggregator tasks if running
            for t in [tiingo_task, aggregator_task, higher_tf_task]:
                if t:
                    t.cancel()
                    try:
                        await t
                    except Exception:
                        pass
            break
        try:
            if is_market_hours():
                if manual_override_active:
                    print("[MarketHours] Manual override active: stopping subscription attempts.")
                    break
                if not subscribed:
                    # hardcoded tickers for testing
                    stock_symbols = ['TSLA', 'RDDT']
                    tickers_to_subscribe = stock_symbols
                    logger.info(f"[MarketHours] Subscribing to {len(stock_symbols)} stock/ETF tickers: {stock_symbols}")
                    stock_subscribe_msg = {
                        "eventName": "subscribe",
                        "authorization": TIINGO_API_KEY,
                        "eventData": {
                            "thresholdLevel": 6,
                            "tickers": tickers_to_subscribe
                        }
                    }
                    # Start relay task; relay_tiingo will open the websocket and send subscribe (only during market hours)
                    tiingo_task = asyncio.create_task(relay_tiingo(ws_url, stock_subscribe_msg, ssl_ctx, stock_filter))
                    subscribed = True
            else:
                if subscribed:
                    print("[MarketHours] Market closed. Unsubscribing from Tiingo and cancelling tasks.")
                    # Send unsubscribe message before closing connection
                    try:
                        unsubscribe_msg = {
                            "eventName": "unsubscribe",
                            "authorization": TIINGO_API_KEY,
                            "eventData": {
                                "subscriptionId": current_subscription_id,
                                "tickers": current_tickers
                            }
                        }
                        logger.info(f"[MarketHours] Sending unsubscribe message to Tiingo: {unsubscribe_msg}")
                        if current_tiingo_ws:
                            try:
                                await current_tiingo_ws.send(json.dumps(unsubscribe_msg))
                                try:
                                    response = await asyncio.wait_for(current_tiingo_ws.recv(), timeout=2)
                                    logger.info(f"[MarketHours] Tiingo response after unsubscribe: {response}")
                                except asyncio.TimeoutError:
                                    logger.warning("[MarketHours] No response from Tiingo after unsubscribe (timeout)")
                                except Exception as resp_e:
                                    logger.error(f"[MarketHours] Error receiving Tiingo response after unsubscribe: {resp_e}")
                                try:
                                    await current_tiingo_ws.close()
                                except Exception:
                                    pass
                            except Exception as e:
                                logger.error(f"[MarketHours] Error sending unsubscribe via current_tiingo_ws: {e}")
                    except Exception as unsub_e:
                        logger.error(f"[MarketHours] Error sending unsubscribe: {unsub_e}")
                    # Cancel relay and aggregator tasks
                    for t in [tiingo_task, aggregator_task, higher_tf_task]:
                        if t:
                            t.cancel()
                            try:
                                await t
                            except Exception:
                                pass
                    tiingo_task = None
                    aggregator_task = None
                    higher_tf_task = None
                    tiingo_ws = None
                    subscribed = False
            await asyncio.sleep(10)  # Check every 10 seconds
        except Exception as e:
            logger.error(f"[MarketHours] Exception in market_hours_manager: {e}")
            import traceback
            traceback.print_exc()
            await asyncio.sleep(10)


# Start the market hours manager on startup
@app.on_event("startup")
async def start_market_hours_manager():
    logger.info("Starting market_hours_manager task on startup.")
    global market_task, flush_task
    market_task = asyncio.create_task(market_hours_manager())
    # Note: daily/weekly flush and organizer scheduling moved to aggregator service

# IPO management moved to aggregator service

# --- Health check endpoints ---
@app.get("/ready")
async def ready():
    """Health check endpoint for container readiness probes"""
    return {"status": "ready"}

@app.get("/health")
async def health():
    """Health check endpoint for container liveness probes"""
    return {"status": "healthy"}

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint - basic implementation"""
    return {"status": "ok", "service": "ingestor"}
    
# --- Admin endpoint to manually unsubscribe all tickers ---
@app.post("/admin/unsubscribe_all")
async def admin_unsubscribe_all(request: Request):
    global current_tiingo_ws, manual_override_active
    # Authorization: require API key in x-api-key header or sec-websocket-protocol
    api_key = request.headers.get('x-api-key') or request.headers.get('sec-websocket-protocol')
    if api_key != API_KEY:
        logger.warning(f"Unauthorized admin unsubscribe attempt: {api_key}")
        return {"status": "error", "message": "Unauthorized"}
    manual_override_active = True
    unsubscribe_msg = {
        "eventName": "unsubscribe",
        "authorization": TIINGO_API_KEY,
        "eventData": {
            "subscriptionId": current_subscription_id,
            "tickers": current_tickers
        }
    }
    try:
        logger.info(f"[Admin] Attempting unsubscribe_all: {unsubscribe_msg}")
        # If there's an active Tiingo websocket, send unsubscribe. Otherwise, no-op.
        if current_tiingo_ws:
            try:
                await current_tiingo_ws.send(json.dumps(unsubscribe_msg))
                logger.info("[Admin] Unsubscribe message sent via active websocket.")
                return {"status": "unsubscribed", "message": "Unsubscribe message sent via active websocket."}
            except Exception as e:
                logger.error(f"[Admin] Error sending unsubscribe via active websocket: {e}")
                return {"status": "error", "message": str(e)}
        else:
            logger.info("[Admin] No active Tiingo websocket; nothing to unsubscribe.")
            return {"status": "no-op", "message": "No active Tiingo websocket; nothing to unsubscribe."}
    except Exception as e:
        logger.error(f"[Admin] Unexpected error during unsubscribe_all: {e}")
        return {"status": "error", "message": str(e)}

# --- WebSocket endpoint for operator to monitor raw Tiingo stream ---
@app.websocket("/ws/tiingo_raw")
async def websocket_tiingo_raw(websocket: WebSocket):
    logger.info("Operator connected to /ws/tiingo_raw websocket.")
    await websocket.accept()
    if redis_client is None:
        await websocket.send_text(json.dumps({'error': 'Redis not configured on server'}))
        await websocket.close()
        return
    try:
        # Create a pubsub subscriber
        pubsub = redis_client.pubsub()
        await pubsub.subscribe('tiingo:raw')
        logger.info("/ws/tiingo_raw subscribed to Redis channel tiingo:raw")
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message is None:
                await asyncio.sleep(0.1)
                continue
            # message['data'] is bytes or str
            data = message.get('data')
            if isinstance(data, bytes):
                try:
                    data = data.decode('utf-8')
                except Exception:
                    data = str(data)
            await websocket.send_text(data)
    except WebSocketDisconnect:
        logger.info("Operator disconnected from /ws/tiingo_raw websocket.")
    except Exception as e:
        logger.error(f"Error in /ws/tiingo_raw websocket: {e}")
        await websocket.send_text(json.dumps({"error": str(e)}))
    finally:
        await websocket.close()

def is_trading_day(dtobj):
    return dtobj.weekday() < 5

def next_run_time(now=None):
    now = now or dt.datetime.utcnow()
    today_sched = now.replace(hour=23, minute=0, second=0, microsecond=0)
    if is_trading_day(now) and now < today_sched:
        return today_sched
    # Otherwise, find next trading day
    for i in range(1, 8):
        candidate = now + dt.timedelta(days=i)
        if is_trading_day(candidate):
            return candidate.replace(hour=23, minute=0, second=0, microsecond=0)

# Daily scheduler moved to aggregator service


@app.on_event("shutdown")
async def shutdown_handler():
    """Cleanly cancel background tasks and close external clients on shutdown."""
    global market_task, daily_scheduler_task, manual_override_active, current_tiingo_ws, redis_client, mongo_client
    logger.info("Shutdown initiated: cancelling background tasks and closing connections.")
    # Signal loops to stop
    manual_override_active = True

    # Try to unsubscribe and close active Tiingo websocket
    try:
        if current_tiingo_ws:
            try:
                unsubscribe_msg = {
                    "eventName": "unsubscribe",
                    "authorization": TIINGO_API_KEY,
                    "eventData": {
                        "subscriptionId": current_subscription_id,
                        "tickers": current_tickers
                    }
                }
                logger.info("[Shutdown] Sending unsubscribe to Tiingo before close")
                try:
                    await current_tiingo_ws.send(json.dumps(unsubscribe_msg))
                except Exception:
                    pass
                try:
                    await current_tiingo_ws.close()
                except Exception:
                    pass
            except Exception as e:
                logger.debug(f"Error while closing Tiingo websocket: {e}")
            current_tiingo_ws = None
    except Exception:
        pass

    # Cancel tasks
    tasks = [market_task, daily_scheduler_task]
    for t in tasks:
        if t:
            try:
                t.cancel()
            except Exception:
                pass

    # Await cancellation with timeout
    try:
        await asyncio.sleep(0)  # let cancellations propagate
        cancel_wait = 0
        # wait up to 3 seconds for tasks to finish
        while cancel_wait < 3:
            pending = [t for t in tasks if t and not t.done()]
            if not pending:
                break
            await asyncio.sleep(0.1)
            cancel_wait += 0.1
    except Exception:
        pass

    # Close Redis client
    try:
        if redis_client is not None:
            try:
                await redis_client.close()
                logger.info("Redis client closed")
            except Exception as e:
                logger.warning(f"Error closing Redis client: {e}")
    except Exception:
        pass

    # Close Mongo client
    try:
        try:
            mongo_client.close()
            logger.info("Mongo client closed")
        except Exception as e:
            logger.warning(f"Error closing Mongo client: {e}")
    except Exception:
        pass

    logger.info("Shutdown handler complete.")
        
'''
curl -X POST https://localhost:8001/admin/unsubscribe_all \
  -H "x-api-key: A3hdbeuyewhedhweuHHS3263ed9d8h32dh238dh32hd82hd928hdjddh23hd8923Y" --insecure
  
curl -X POST https://localhost:8000/admin/add_ipo_ticker \
  -H "Content-Type: application/json" \
  -H "x-api-key: A3hdbeuyewhedhweuHHS3263ed9d8h32dh238dh32hd82hd928hdjddh23hd8923Y" \
  -d '{"tickers": ["TSLA", "AMZN" ]}' --insecure
'''
# wscat -c "wss://localhost:8001/ws/tiingo_raw" --no-check
# wscat -c "wss://localhost:8000/ws/quotes?symbols=TSLA&x-api-key=A3hdbeuyewhedhweuHHS3263ed9d8h32dh238dh32hd82hd928hdjddh23hd8923Y" --no-check