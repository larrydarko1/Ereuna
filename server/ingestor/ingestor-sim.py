import sys
sys.path.append('.')
import datetime as dt
import os
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, Request, status, Body, Response
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
from prometheus_client import Counter, Gauge, generate_latest, CONTENT_TYPE_LATEST

load_dotenv()

# --- Logging setup (stdout-only for Docker/promtail) ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("websocket")

# Prometheus metrics
ingestor_requests = Counter('ingestor_requests_total', 'Total requests to ingestor')
ingestor_health = Gauge('ingestor_health_status', 'Health status of ingestor (1=healthy, 0=unhealthy)')
ingestor_connections = Gauge('ingestor_websocket_connections', 'Active WebSocket connections')

# Filter out health check/metrics logs from uvicorn access logger
class HealthCheckFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        message = record.getMessage()
        return not any(endpoint in message for endpoint in ['/metrics', '/ready', '/health'])

logging.getLogger("uvicorn.access").addFilter(HealthCheckFilter())

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
    logger.info(f"[SIMULATION] Starting simulated relay_tiingo for tickers: {subscribe_msg}")
    current_tickers = subscribe_msg
    import random
    while True:
        if manual_override_active:
            logger.info("[SIMULATION] Manual override active, stopping simulated relay loop.")
            break
        if not is_market_hours():
            logger.info("[SIMULATION] Not market hours; skipping simulated data.")
            await asyncio.sleep(30)
            continue
        for symbol in current_tickers:
            # Simulate a Tiingo message
            price = round(random.uniform(100, 500), 2)
            volume = random.randint(1000, 100000)
            now = datetime.datetime.utcnow().isoformat()
            msg_obj = {
                "service": "iex",
                "messageType": "A",
                "data": [now, symbol.lower(), price, volume],
            }
            msg = json.dumps(msg_obj)
            msg_bytes = len(msg.encode("utf-8"))
            stats = stock_bandwidth_stats.setdefault(symbol.lower(), {'bytes': 0, 'messages': 0})
            stats['bytes'] += msg_bytes
            stats['messages'] += 1
            latest_quotes[symbol.lower()] = msg_obj
            # Publish raw message to Redis pubsub and append to Redis Stream
            try:
                if redis_client is not None:
                    try:
                        pub_result = await redis_client.publish('tiingo:raw', msg)
                        logger.debug(f"[SIMULATION] Published simulated tiingo message to channel 'tiingo:raw' (subscribers={pub_result}) for symbol {symbol}")
                    except Exception as pub_e:
                        logger.warning(f"[SIMULATION] Redis publish failed: {pub_e}")
                    try:
                        xadd_id = await redis_client.xadd('tiingo:stream', {'data': msg}, maxlen=10000, approximate=True)
                        logger.debug(f"[SIMULATION] Appended simulated tiingo message to Redis stream 'tiingo:stream' (id={xadd_id}) for symbol {symbol}")
                    except Exception as xadd_e:
                        logger.warning(f"[SIMULATION] Redis XADD failed: {xadd_e}")
                else:
                    logger.warning("[SIMULATION] Redis client not available; simulated message dropped")
            except Exception as red_e:
                logger.error(f"[SIMULATION] Unexpected Redis error while publishing simulated message: {red_e}")
        await asyncio.sleep(1)  # Simulate 1 second interval between messages

# --- Market hours background manager ---
async def market_hours_manager():
    global stock_symbols
    logger.info("[SIMULATION] Starting market_hours_manager loop.")
    tiingo_task = None
    while True:
        if manual_override_active:
            logger.info("[SIMULATION] Manual override active, stopping market hours manager loop.")
            if tiingo_task:
                tiingo_task.cancel()
                try:
                    await tiingo_task
                except Exception:
                    pass
            break
        try:
            if is_market_hours():
                if not tiingo_task or tiingo_task.done():
                    stock_symbols = ['TSLA', 'RDDT']
                    logger.info(f"[SIMULATION] Simulating {len(stock_symbols)} stock/ETF tickers: {stock_symbols}")
                    tiingo_task = asyncio.create_task(relay_tiingo(None, stock_symbols, None, stock_filter))
            else:
                if tiingo_task and not tiingo_task.done():
                    logger.info("[SIMULATION] Market closed. Stopping simulated relay task.")
                    tiingo_task.cancel()
                    try:
                        await tiingo_task
                    except Exception:
                        pass
                    tiingo_task = None
            await asyncio.sleep(10)
        except Exception as e:
            logger.error(f"[SIMULATION] Exception in market_hours_manager: {e}")
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
    """Prometheus metrics endpoint"""
    ingestor_requests.inc()
    # Update health gauge based on service status
    try:
        ingestor_health.set(1)
    except Exception:
        ingestor_health.set(0)
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
    
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
                logger.info("[Admin] Unsubscribe message sent via active websocket, waiting for response...")
                # Wait for Tiingo's response
                try:
                    response = await asyncio.wait_for(current_tiingo_ws.recv(), timeout=5)
                    logger.info(f"[Admin] ✓ Tiingo unsubscribe response received: {response}")
                    return {"status": "unsubscribed", "message": "Unsubscribe successful", "tiingo_response": response}
                except asyncio.TimeoutError:
                    logger.warning("[Admin] ⚠ Timeout waiting for Tiingo unsubscribe response")
                    return {"status": "unsubscribed", "message": "Unsubscribe message sent but no response received (timeout)"}
                except websockets.exceptions.ConnectionClosed as close_e:
                    logger.info(f"[Admin] ✓ Tiingo closed connection (code: {close_e.code}, reason: {close_e.reason or 'none'})")
                    return {"status": "unsubscribed", "message": f"Tiingo closed connection (code: {close_e.code})"}
            except Exception as e:
                logger.error(f"[Admin] ✗ Error sending unsubscribe via active websocket: {e}")
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
                    logger.info("[Shutdown] Unsubscribe message sent, waiting for response...")
                    # Try to receive response
                    try:
                        response = await asyncio.wait_for(current_tiingo_ws.recv(), timeout=3)
                        logger.info(f"[Shutdown] ✓ Tiingo unsubscribe response: {response}")
                    except asyncio.TimeoutError:
                        logger.warning("[Shutdown] ⚠ Timeout waiting for Tiingo response")
                    except websockets.exceptions.ConnectionClosed as close_e:
                        logger.info(f"[Shutdown] ✓ Tiingo closed connection (code: {close_e.code})")
                except Exception as send_e:
                    logger.debug(f"[Shutdown] Error sending unsubscribe: {send_e}")
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