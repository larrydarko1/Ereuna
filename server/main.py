import sys
sys.path.append('.')
from organizer import Daily
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
from aggregator import start_aggregator, pubsub_channels, get_latest_in_progress_candle
from bson import ObjectId
from dateutil.parser import isoparse
import datetime
from starlette.websockets import WebSocketDisconnect
from ipo import IPO
from pydantic import BaseModel, validator
import re

load_dotenv()

# --- Logging setup ---
LOG_FILE = 'websocket.log'
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s %(message)s',
    handlers=[logging.FileHandler(LOG_FILE), logging.StreamHandler()]
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

message_queue = asyncio.Queue(maxsize=100000)  # Holds latest messages

# In-memory cache for latest quotes per symbol
latest_quotes = {}  # {symbol: tiingo_data_dict}


# Only stocks/ETFs: get tickers from DB at startup in production
API_KEY = os.getenv("VITE_EREUNA_KEY")
stock_symbols = []
ssl_ctx = ssl._create_unverified_context()

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
                                    try:
                                        await message_queue.put(json.dumps(tiingo_data))
                                    except asyncio.QueueFull:
                                        logger.warning(f"Message queue full, dropping oldest for symbol: {symbol}")
                                        await message_queue.get()
                                        await message_queue.put(json.dumps(tiingo_data))
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
                    stock_symbols = ['TSLA', 'NET', 'AMZN', 'META', 'AAPL', 'ARKK', 'IWM', 'DIA', 'RDDT', 'RBLX']
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
                    # Open websocket connection here so we can reuse for unsubscribe
                    tiingo_ws = await websockets.connect(ws_url, ssl=ssl_ctx)
                    await tiingo_ws.send(json.dumps(stock_subscribe_msg))
                    # Start relay and aggregator tasks
                    tiingo_task = asyncio.create_task(relay_tiingo(ws_url, stock_subscribe_msg, ssl_ctx, stock_filter))
                    aggregator_task = asyncio.create_task(start_aggregator(message_queue, mongo_client))
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
                        if tiingo_ws:
                            await tiingo_ws.send(json.dumps(unsubscribe_msg))
                            try:
                                response = await asyncio.wait_for(tiingo_ws.recv(), timeout=2)
                                logger.info(f"[MarketHours] Tiingo response after unsubscribe: {response}")
                            except asyncio.TimeoutError:
                                logger.warning("[MarketHours] No response from Tiingo after unsubscribe (timeout)")
                            except Exception as resp_e:
                                logger.error(f"[MarketHours] Error receiving Tiingo response after unsubscribe: {resp_e}")
                            await tiingo_ws.close()
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
    asyncio.create_task(market_hours_manager())
    # Start daily/weekly candle flush coroutine
    from aggregator import flush_daily_weekly_candles_at_market_close
    daily_collection = db.get_collection('OHCLVData')
    weekly_collection = db.get_collection('OHCLVData2')
    logger.info("Starting flush_daily_weekly_candles_at_market_close task on startup.")
    asyncio.create_task(flush_daily_weekly_candles_at_market_close(daily_collection, weekly_collection))

class IPORequest(BaseModel):
    tickers: list[str]

    @validator('tickers', each_item=True)
    def validate_ticker(cls, v):
        # Only allow uppercase letters, numbers, max 8 chars
        if not re.match(r'^[A-Z0-9\.]{1,8}$', v.upper()):
            raise ValueError(f"Invalid ticker: {v}")
        return v.upper()

@app.post("/admin/add_ipo_ticker", status_code=200)
async def admin_add_ipo_ticker(request: Request, ipo_req: IPORequest = Body(...)):
    api_key = request.headers.get('x-api-key') or request.headers.get('sec-websocket-protocol')
    if api_key != API_KEY:
        logger.warning(f"Unauthorized IPO insert attempt: {api_key}")
        return {"error": "Unauthorized"}
    tickers = ipo_req.tickers
    logger.info(f"Admin IPO insert: {tickers}")
    try:
        await IPO(tickers)
        logger.info(f"IPO tickers processed: {tickers}")
        return {"success": True, "tickers": tickers}
    except Exception as e:
        logger.error(f"IPO insert error: {e}")
        return {"error": str(e)}
    
# --- Admin endpoint to manually unsubscribe all tickers ---
@app.post("/admin/unsubscribe_all")
async def admin_unsubscribe_all():
    global tiingo_ws, manual_override_active
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
        logger.info(f"[Admin] Sending unsubscribe_all: {unsubscribe_msg}")
        await current_tiingo_ws.send(json.dumps(unsubscribe_msg))
        logger.info(f"[Admin] Unsubscribe message sent.")
        # Do not call recv() here; relay_tiingo will handle the response.
        return {"status": "unsubscribed", "message": "Unsubscribe message sent."}
    except Exception as e:
        logger.error(f"[Admin] Error during unsubscribe: {e}")
        return {"status": "error", "message": str(e)}

# --- WebSocket endpoint for operator to monitor raw Tiingo stream ---
@app.websocket("/ws/tiingo_raw")
async def websocket_tiingo_raw(websocket: WebSocket):
    logger.info("Operator connected to /ws/tiingo_raw websocket.")
    await websocket.accept()
    try:
        while True:
            msg = await message_queue.get()
            await websocket.send_text(msg)
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

async def daily_scheduler():
    while True:
        now = dt.datetime.utcnow()
        run_at = next_run_time(now)
        wait = (run_at - now).total_seconds()
        if wait > 0:
            print(f"[Scheduler] Next Daily() at {run_at} UTC ({wait/60:.1f} min)")
            await asyncio.sleep(wait)
        else:
            print("[Scheduler] Running Daily() now (missed scheduled time)")
        try:
            await Daily()
        except Exception as e:
            print(f"[Scheduler] Exception in Daily(): {e}")

@app.on_event("startup")
async def start_daily_scheduler():
    asyncio.create_task(daily_scheduler())

# --- WebSocket endpoint for chart data, matching REST API logic ---
@app.websocket('/ws/chartdata')
async def websocket_chartdata(
    websocket: WebSocket,
    ticker: str = Query(...),
    timeframe: str = Query('daily'),
    user: str = Query(None)
):
    logger.info(f"Client connected to /ws/chartdata: ticker={ticker}, timeframe={timeframe}, user={user}")
    await websocket.accept()
    ticker = ticker.upper()
    tf_map = {
        'daily':   (db['OHCLVData'], 'date', 2000),
        'weekly':  (db['OHCLVData2'], 'date', 500),
        'intraday1m':   (db['OHCLVData1m'], 'datetime', None),
        'intraday5m':   (db['OHCLVData5m'], 'datetime', None),
        'intraday15m':  (db['OHCLVData15m'], 'datetime', None),
        'intraday30m':  (db['OHCLVData30m'], 'datetime', None),
        'intraday1hr':  (db['OHCLVData1hr'], 'datetime', None),
    }
    if timeframe not in tf_map:
        logger.warning(f"Invalid timeframe requested: {timeframe}")
        try:
            await websocket.send_text(json.dumps({'error': 'Invalid timeframe'}))
        except WebSocketDisconnect:
            logger.info("Client disconnected before error could be sent.")
        await websocket.close()
        return
    coll, timeType, length = tf_map[timeframe]
    chartSettings = None
    if user:
        user_doc = await db.Users.find_one({'Username': user})
        if user_doc and user_doc.get('ChartSettings'):
            chartSettings = user_doc['ChartSettings']
    arr = await coll.find({'tickerID': ticker}).sort('timestamp', -1).to_list(length=length)
    arr = list(reversed(arr))
    pubsub_tf = {
        'daily': '1d',
        'weekly': '1w',
        'intraday1m': '1m',
        'intraday5m': '5m',
        'intraday15m': '15m',
        'intraday30m': '30m',
        'intraday1hr': '1hr',
    }[timeframe]
    cached_candle = get_latest_in_progress_candle(ticker, pubsub_tf)
    ohlc_arr = arr.copy()
    if cached_candle:
        def to_naive_utc(dt):
            import datetime
            if dt.tzinfo is not None:
                return dt.astimezone(datetime.timezone.utc).replace(tzinfo=None)
            return dt
        cached_ts = cached_candle.get('timestamp', cached_candle.get('start'))
        if not ohlc_arr:
            ohlc_arr.append(cached_candle)
        else:
            try:
                last_ts = ohlc_arr[-1].get('timestamp', ohlc_arr[-1].get('start'))
                if to_naive_utc(last_ts) == to_naive_utc(cached_ts):
                    ohlc_arr[-1] = cached_candle
                elif to_naive_utc(last_ts) < to_naive_utc(cached_ts):
                    ohlc_arr.append(cached_candle)
            except KeyError as e:
                logger.error(f"KeyError during timestamp comparison: {e}\ncached_candle={cached_candle}\nohlc_arr_last={ohlc_arr[-1]}")
    def get_item_time(item):
        ts = item.get('timestamp', item.get('start'))
        if ts is None:
            return None
        if timeType == 'datetime':
            return ts.isoformat()[:19]
        else:
            return ts.isoformat()[:10]
    ohlc = [
        {
            'time': get_item_time(item),
            'open': float(str(item['open'])[:8]),
            'high': float(str(item['high'])[:8]),
            'low': float(str(item['low'])[:8]),
            'close': float(str(item['close'])[:8])
        }
        for item in ohlc_arr if get_item_time(item) is not None
    ] if ohlc_arr else []
    if timeframe == 'intraday1m':
        volume = [
            {
                'time': get_item_time(item),
                'value': item.get('volume', 0)
            }
            for item in ohlc_arr if get_item_time(item) is not None
        ] if ohlc_arr else []
    else:
        volume = [
            {
                'time': get_item_time(item),
                'value': item['volume']
            }
            for item in ohlc_arr if get_item_time(item) is not None
        ] if ohlc_arr else []
    def calcMA_py(Data, period, timeType = 'date'):
        if len(Data) < period:
            return []
        arr = []
        for i in range(period - 1, len(Data)):
            window = Data[i - period + 1:i + 1]
            sum_close = sum(item['close'] for item in window)
            average = sum_close / period
            arr.append({
                'time': window[-1]['timestamp'].isoformat()[:19] if timeType == 'datetime' else window[-1]['timestamp'].isoformat()[:10],
                'value': round(average, 2)
            })
        return arr
    def calcEMA_py(Data, period, timeType = 'date'):
        if len(Data) < period:
            return []
        arr = []
        k = 2 / (period + 1)
        emaPrev = sum(item['close'] for item in Data[:period]) / period
        for i in range(period - 1, len(Data)):
            close = Data[i]['close']
            if i == period - 1:
                arr.append({
                    'time': Data[i]['timestamp'].isoformat()[:19] if timeType == 'datetime' else Data[i]['timestamp'].isoformat()[:10],
                    'value': round(emaPrev, 2)
                })
            else:
                emaPrev = close * k + emaPrev * (1 - k)
                arr.append({
                    'time': Data[i]['timestamp'].isoformat()[:19] if timeType == 'datetime' else Data[i]['timestamp'].isoformat()[:10],
                    'value': round(emaPrev, 2)
                })
        return arr
    ma_data = {}
    if chartSettings and isinstance(chartSettings.get('indicators'), list):
        for idx, indicator in enumerate(chartSettings['indicators']):
            if not indicator.get('visible'):
                continue
            if indicator.get('type') == 'EMA':
                maArr = calcEMA_py(arr, indicator.get('timeframe', 10), timeType)
            else:
                maArr = calcMA_py(arr, indicator.get('timeframe', 10), timeType)
            ma_data[f'MA{idx+1}'] = maArr
    else:
        ma_data['MA1'] = calcMA_py(arr, 10, timeType) if arr else []
        ma_data['MA2'] = calcMA_py(arr, 20, timeType) if arr else []
        ma_data['MA3'] = calcMA_py(arr, 50, timeType) if arr else []
        ma_data['MA4'] = calcMA_py(arr, 200, timeType) if arr else []
    intrinsicValue = None
    if chartSettings and chartSettings.get('intrinsicValue', {}).get('visible'):
        assetInfo = await db.AssetInfo.find_one({'Symbol': ticker})
        if assetInfo and 'IntrinsicValue' in assetInfo:
            intrinsicValue = assetInfo['IntrinsicValue']
    payload = {
        'ohlc': ohlc,
        'volume': volume,
        **ma_data
    }
    if intrinsicValue is not None:
        payload['intrinsicValue'] = intrinsicValue
    try:
        await websocket.send_text(json.dumps({'type': 'init', 'data': payload}))
    except WebSocketDisconnect:
        logger.info("Client disconnected before initial chartdata could be sent.")
        return
    if is_market_hours():
        q = asyncio.Queue()
        pubsub_channels[(ticker, pubsub_tf)].append(q)
        logger.info(f"Subscribed to pubsub for {ticker} ({pubsub_tf}) [market hours]")
        try:
            in_progress_candle = None
            while True:
                try:
                    cndl = await q.get()
                    is_final = cndl.get('final', False)
                    if is_final:
                        arr.append(cndl)
                        if len(arr) > length:
                            arr = arr[-length:]
                        in_progress_candle = None
                    else:
                        in_progress_candle = cndl
                    ohlc_arr = arr.copy()
                    if in_progress_candle:
                        if not ohlc_arr or ohlc_arr[-1]['timestamp'] != in_progress_candle['timestamp']:
                            ohlc_arr.append(in_progress_candle)
                        else:
                            ohlc_arr[-1] = in_progress_candle
                    ohlc = [
                        {
                            'time': item['timestamp'].isoformat()[:19] if timeType == 'datetime' else item['timestamp'].isoformat()[:10],
                            'open': float(str(item['open'])[:8]),
                            'high': float(str(item['high'])[:8]),
                            'low': float(str(item['low'])[:8]),
                            'close': float(str(item['close'])[:8])
                        }
                        for item in ohlc_arr
                    ]
                    if timeframe == 'intraday1m':
                        volume = [
                            {
                                'time': item['timestamp'].isoformat()[:19] if timeType == 'datetime' else item['timestamp'].isoformat()[:10],
                                'value': item.get('volume', 0)
                            }
                            for item in ohlc_arr
                        ]
                    else:
                        volume = [
                            {
                                'time': item['timestamp'].isoformat()[:19] if timeType == 'datetime' else item['timestamp'].isoformat()[:10],
                                'value': item['volume']
                            }
                            for item in ohlc_arr
                        ]
                    ma_data = {}
                    if chartSettings and isinstance(chartSettings.get('indicators'), list):
                        for idx, indicator in enumerate(chartSettings['indicators']):
                            if not indicator.get('visible'):
                                continue
                            if indicator.get('type') == 'EMA':
                                maArr = calcEMA_py(ohlc_arr, indicator.get('timeframe', 10), timeType)
                            else:
                                maArr = calcMA_py(ohlc_arr, indicator.get('timeframe', 10), timeType)
                            ma_data[f'MA{idx+1}'] = maArr
                    else:
                        ma_data['MA1'] = calcMA_py(ohlc_arr, 10, timeType) if ohlc_arr else []
                        ma_data['MA2'] = calcMA_py(ohlc_arr, 20, timeType) if ohlc_arr else []
                        ma_data['MA3'] = calcMA_py(ohlc_arr, 50, timeType) if ohlc_arr else []
                        ma_data['MA4'] = calcMA_py(ohlc_arr, 200, timeType) if ohlc_arr else []
                    intrinsicValue = None
                    if chartSettings and chartSettings.get('intrinsicValue', {}).get('visible'):
                        assetInfo = await db.AssetInfo.find_one({'Symbol': ticker})
                        if assetInfo and 'IntrinsicValue' in assetInfo:
                            intrinsicValue = assetInfo['IntrinsicValue']
                    update_payload = {
                        'ohlc': ohlc,
                        'volume': volume,
                        **ma_data
                    }
                    if intrinsicValue is not None:
                        update_payload['intrinsicValue'] = intrinsicValue
                    try:
                        await websocket.send_text(json.dumps({'type': 'update', 'data': update_payload}))
                    except WebSocketDisconnect:
                        logger.info(f"Client disconnected from /ws/chartdata: ticker={ticker}, timeframe={timeframe}, user={user}")
                        break
                except Exception as e:
                    logger.error(f"Exception in /ws/chartdata loop: {e}")
                    import traceback
                    traceback.print_exc()
                    try:
                        await websocket.send_text(json.dumps({'error': str(e)}))
                    except WebSocketDisconnect:
                        logger.info("Client disconnected during error send.")
                        break
                    except Exception:
                        pass
                    break
        finally:
            try:
                pubsub_channels[(ticker, pubsub_tf)].remove(q)
            except (KeyError, ValueError):
                pass
            try:
                await websocket.close()
            except Exception:
                pass
    else:
        logger.info(f"Market is closed. Not subscribing to pubsub for {ticker} ({pubsub_tf})")

# --- GET latest quotes for active portfolio ---
def sanitize_input(val):
    # Basic sanitization: strip and uppercase
    if not isinstance(val, str):
        return None
    return val.strip().upper()

@app.websocket("/ws/quotes")
async def websocket_quotes(
    websocket: WebSocket,
    symbols: str = Query(...)
):
    # Get API key from Sec-WebSocket-Protocol header
    api_key = websocket.headers.get('sec-websocket-protocol')
    if api_key != API_KEY:
        await websocket.accept()
        try:
            await websocket.send_text(json.dumps({"error": "Invalid API key"}))
        except WebSocketDisconnect:
            logger.info("Client disconnected before error could be sent.")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept(subprotocol=api_key)
    symbol_list = [sanitize_input(s) for s in symbols.split(',') if s.strip()]
    try:
        while True:
            result = {}
            for sym in symbol_list:
                doc = await db['OHCLVData1m'].find({'tickerID': sym}).sort('timestamp', -1).limit(1).to_list(length=1)
                if doc and len(doc) > 0 and 'close' in doc[0]:
                    result[sym] = float(doc[0]['close'])
                else:
                    result[sym] = None
            try:
                await websocket.send_text(json.dumps(result))
            except WebSocketDisconnect:
                logger.info("Client disconnected during send_text in /ws/quotes.")
                break
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        logger.info("Client disconnected from /ws/quotes.")
    except Exception as e:
        logger.error(f"Exception in /ws/quotes: {e}")
        try:
            await websocket.send_text(json.dumps({"error": str(e)}))
        except WebSocketDisconnect:
            logger.info("Client disconnected during error send in /ws/quotes.")
        except Exception:
            pass
        await websocket.close()

# --- WebSocket endpoint for user's WatchPanel ---
@app.websocket("/ws/watchpanel")
async def websocket_watchpanel(
    websocket: WebSocket,
    user: str = Query(...)
):
    # Get API key from Sec-WebSocket-Protocol header
    api_key = websocket.headers.get('sec-websocket-protocol')
    if api_key != API_KEY:
        logger.warning(f"[WatchPanel WS] Invalid API key: {api_key}")
        await websocket.accept()
        await websocket.send_text(json.dumps({"error": "Invalid API key"}))
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Accept with correct subprotocol for handshake
    await websocket.accept(subprotocol=api_key)
    # Fetch user's WatchPanel symbols (max 20)
    user_doc = await db.Users.find_one({'Username': user})
    if not user_doc or not isinstance(user_doc.get('WatchPanel'), list):
        logger.warning(f"[WatchPanel WS] WatchPanel not found for user: {user}")
        await websocket.send_text(json.dumps({"error": "WatchPanel not found"}))
        await websocket.close()
        return

    tickers = user_doc['WatchPanel'][:20]
    # In-memory cache for last two closes per ticker for this client
    last_two_closes = {}
    watch_panel_data = []
    for ticker in tickers:
        docs = await db['OHCLVData'].find({'tickerID': ticker}).sort('timestamp', -1).limit(2).to_list(length=2)
        cached_candle = get_latest_in_progress_candle(ticker, '1d')
        def get_ts(doc):
            return doc.get('timestamp', doc.get('start'))
        if cached_candle and docs:
            latest = cached_candle
            cached_ts = get_ts(cached_candle)
            doc0_ts = get_ts(docs[0]) if docs else None
            previous = docs[0] if docs and doc0_ts != cached_ts else (docs[1] if len(docs) > 1 else None)
        elif docs:
            latest = docs[0]
            previous = docs[1] if len(docs) > 1 else None
        else:
            continue
        last_two_closes[ticker] = [latest, previous] if previous else [latest]
        latest_close = float(str(latest['close'])[:8])
        previous_close = float(str(previous['close'])[:8]) if previous else None
        if previous_close is not None:
            percentage_change = ((latest_close - previous_close) / previous_close) * 100
            watch_panel_data.append({
                "Symbol": ticker,
                "percentageReturn": f"{percentage_change:.2f}%"
            })
    try:
        await websocket.send_text(json.dumps({"type": "init", "data": watch_panel_data}))
    except Exception as e:
        logger.error(f"[WatchPanel WS] Error sending initial data: {e}")
        await websocket.close()
        return

    # --- Per-client queue and pubsub subscription ---
    client_queue = asyncio.Queue()
    pubsub_refs = []
    for ticker in tickers:
        async def pubsub_listener(q, t):
            while True:
                cndl = await q.get()
                await client_queue.put((t, cndl))
        q = asyncio.Queue()
        pubsub_channels[(ticker, '1d')].append(q)
        pubsub_refs.append((ticker, q))
        asyncio.create_task(pubsub_listener(q, ticker))

    try:
        while True:
            ticker, cndl = await client_queue.get()
            prevs = last_two_closes.get(ticker, [])
            # If the update is for a new timestamp, shift previous
            if prevs and prevs[0].get('timestamp', prevs[0].get('start')) != cndl['timestamp']:
                previous = prevs[0]
                latest = cndl
                last_two_closes[ticker] = [latest, previous]
            else:
                latest = cndl
                previous = prevs[1] if len(prevs) > 1 else None
                last_two_closes[ticker] = [latest] + ([previous] if previous else [])
            latest_close = float(str(latest['close'])[:8])
            previous_close = float(str(previous['close'])[:8]) if previous else None
            if previous_close is not None:
                percentage_change = ((latest_close - previous_close) / previous_close) * 100
                update = {
                    "Symbol": ticker,
                    "percentageReturn": f"{percentage_change:.2f}%"
                }
                try:
                    await websocket.send_text(json.dumps({"type": "update", "data": [update]}))
                except Exception as e:
                    logger.error(f"[WatchPanel WS] Error sending update: {e}")
                    break
    except WebSocketDisconnect:
        logger.info(f"[WatchPanel WS] Client disconnected: user={user}")
    except Exception as e:
        logger.error(f"[WatchPanel WS] Exception: {e}")
        try:
            await websocket.send_text(json.dumps({"error": str(e)}))
        except Exception:
            pass
    finally:
        for ticker, q in pubsub_refs:
            try:
                pubsub_channels[(ticker, '1d')].remove(q)
            except (KeyError, ValueError):
                pass
        try:
            await websocket.close()
        except Exception:
            pass

# --- WebSocket endpoint for data values (latest close, change, %change) ---
@app.websocket("/ws/data-values")
async def websocket_data_values(
    websocket: WebSocket,
    tickers: str = Query(...),
):
    # Authenticate using sec-websocket-protocol header
    api_key = websocket.headers.get('sec-websocket-protocol')
    if api_key != API_KEY:
        await websocket.accept()
        try:
            await websocket.send_text(json.dumps({"error": "Invalid API key"}))
        except WebSocketDisconnect:
            logger.info("Client disconnected before error could be sent.")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept(subprotocol=api_key)
    ticker_list = [sanitize_input(t) for t in tickers.split(',') if t.strip()]
    if not ticker_list:
        try:
            await websocket.send_text(json.dumps({"error": "No tickers provided"}))
        except WebSocketDisconnect:
            logger.info("Client disconnected before error could be sent.")
        await websocket.close()
        return

    # In-memory cache for last two closes per ticker for this client
    last_two_closes = {}
    results = {}
    for ticker in ticker_list:
        cached_candle = get_latest_in_progress_candle(ticker, '1d')
        docs = await db['OHCLVData'].find({'tickerID': ticker}).sort('timestamp', -1).limit(2).to_list(length=2)
        def get_ts(doc):
            return doc.get('timestamp', doc.get('start'))
        if cached_candle and docs:
            latest = cached_candle
            cached_ts = get_ts(cached_candle)
            doc0_ts = get_ts(docs[0]) if docs else None
            previous = docs[0] if docs and doc0_ts != cached_ts else (docs[1] if len(docs) > 1 else None)
        elif docs:
            latest = docs[0]
            previous = docs[1] if len(docs) > 1 else None
        else:
            continue
        # Store in-memory for fast update lookup
        last_two_closes[ticker] = [latest, previous] if previous else [latest]
        responseData = {
            "close": float(latest['close']),
            "timestamp": str(latest.get('timestamp', latest.get('start'))),
        }
        if previous:
            closeDiff = float(latest['close']) - float(previous['close'])
            percentChange = ((closeDiff / float(previous['close'])) * 100) if float(previous['close']) != 0 else 0
            responseData["closeDiff"] = round(closeDiff, 2)
            responseData["percentChange"] = round(percentChange, 2)
            responseData["latestClose"] = float(latest['close'])
            responseData["previousClose"] = float(previous['close'])
            responseData["timestampPrevious"] = str(previous.get('timestamp', previous.get('start')))
        else:
            responseData["closeDiff"] = 0
            responseData["percentChange"] = 0
            responseData["message"] = "Insufficient historical data for comparison"
        results[ticker] = responseData

    # Send initial data
    try:
        await websocket.send_text(json.dumps({"type": "init", "data": results}))
    except WebSocketDisconnect:
        return

    # --- Per-client queue and pubsub subscription ---
    client_queue = asyncio.Queue()
    # Register a pubsub listener for each ticker that puts updates into the client queue
    pubsub_refs = []
    for ticker in ticker_list:
        async def pubsub_listener(q, t):
            while True:
                cndl = await q.get()
                await client_queue.put((t, cndl))
        q = asyncio.Queue()
        pubsub_channels[(ticker, '1d')].append(q)
        pubsub_refs.append((ticker, q))
        # Start a background task for each ticker's pubsub queue
        asyncio.create_task(pubsub_listener(q, ticker))

    try:
        while True:
            # Wait for any update from any ticker
            ticker, cndl = await client_queue.get()
            # Use in-memory cache for last two closes, update it
            prevs = last_two_closes.get(ticker, [])
            # If the update is for a new timestamp, shift previous
            if prevs and prevs[0].get('timestamp', prevs[0].get('start')) != cndl['timestamp']:
                previous = prevs[0]
                latest = cndl
                last_two_closes[ticker] = [latest, previous]
            else:
                # If same timestamp, just update latest
                latest = cndl
                previous = prevs[1] if len(prevs) > 1 else None
                last_two_closes[ticker] = [latest] + ([previous] if previous else [])
            responseData = {
                "close": float(latest['close']),
                "timestamp": str(latest.get('timestamp', latest.get('start'))),
            }
            if previous:
                closeDiff = float(latest['close']) - float(previous['close'])
                percentChange = ((closeDiff / float(previous['close'])) * 100) if float(previous['close']) != 0 else 0
                responseData["closeDiff"] = round(closeDiff, 2)
                responseData["percentChange"] = round(percentChange, 2)
                responseData["latestClose"] = float(latest['close'])
                responseData["previousClose"] = float(previous['close'])
                responseData["timestampPrevious"] = str(previous.get('timestamp', previous.get('start')))
            else:
                responseData["closeDiff"] = 0
                responseData["percentChange"] = 0
                responseData["message"] = "Insufficient historical data for comparison"
            # Send only the updated ticker
            try:
                await websocket.send_text(json.dumps({"type": "update", "data": {ticker: responseData}}))
            except WebSocketDisconnect:
                break
    except WebSocketDisconnect:
        logger.info(f"[ws/data-values] Client disconnected: tickers={ticker_list}")
    except Exception as e:
        logger.error(f"[ws/data-values] Exception: {e}")
        try:
            await websocket.send_text(json.dumps({"error": str(e)}))
        except WebSocketDisconnect:
            logger.info("Client disconnected during error send.")
        except Exception:
            pass
    finally:
        for ticker, q in pubsub_refs:
            try:
                pubsub_channels[(ticker, '1d')].remove(q)
            except (KeyError, ValueError):
                pass
        try:
            await websocket.close()
        except Exception:
            pass

# --- WebSocket endpoint for weekly chart data with real-time updates / screener ---
@app.websocket("/ws/chartdata-wk")
async def websocket_chartdata(
    websocket: WebSocket,
    ticker: str = Query(...),
    before: str = Query(None),
):
    # Authenticate using sec-websocket-protocol header
    api_key = websocket.headers.get('sec-websocket-protocol')
    if api_key != API_KEY:
        await websocket.accept()
        try:
            await websocket.send_text(json.dumps({"error": "Invalid API key"}))
        except WebSocketDisconnect:
            logger.info("Client disconnected before error could be sent.")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept(subprotocol=api_key)
    ticker = sanitize_input(ticker.upper())
    coll = db['OHCLVData2']
    query = {'tickerID': ticker}
    if before:
        try:
            before_date = datetime.datetime.fromisoformat(before)
            query['timestamp'] = {'$lt': before_date}
        except Exception:
            pass

    weeklyData = await coll.find(query).sort('timestamp', -1).limit(500).to_list(length=500)
    weeklyData = list(reversed(weeklyData))

    # Use cached candle for latest if available
    cached_candle = get_latest_in_progress_candle(ticker, '1w')
    if cached_candle:
        def get_ts(doc):
            return doc.get('timestamp', doc.get('start'))
        cached_ts = get_ts(cached_candle)
        last_ts = get_ts(weeklyData[-1]) if weeklyData else None
        if not weeklyData or last_ts != cached_ts:
            weeklyData.append(cached_candle)
        else:
            weeklyData[-1] = cached_candle

    # Helper for MA
    def calcMA(Data, period):
        if len(Data) < period:
            return []
        arr = []
        for i in range(period - 1, len(Data)):
            window = Data[i - period + 1:i + 1]
            sum_close = sum(item['close'] for item in window)
            average = sum_close / period
            ts = window[-1].get('timestamp', window[-1].get('start'))
            arr.append({
                'time': ts.isoformat()[:10] if ts else None,
                'value': round(average, 2),
            })
        return arr

    def get_item_time(item):
        ts = item.get('timestamp', item.get('start'))
        return ts.isoformat()[:10] if ts else None

    weekly = {
        'ohlc': [
            {
                'time': get_item_time(item),
                'open': float(str(item['open'])[:8]),
                'high': float(str(item['high'])[:8]),
                'low': float(str(item['low'])[:8]),
                'close': float(str(item['close'])[:8]),
            }
            for item in weeklyData if get_item_time(item) is not None
        ] if weeklyData else [],
        'volume': [
            {
                'time': get_item_time(item),
                'value': item['volume'],
            }
            for item in weeklyData if get_item_time(item) is not None
        ] if weeklyData else [],
        'MA10': calcMA(weeklyData, 10) if weeklyData else [],
        'MA20': calcMA(weeklyData, 20) if weeklyData else [],
        'MA50': calcMA(weeklyData, 50) if weeklyData else [],
        'MA200': calcMA(weeklyData, 200) if weeklyData else [],
    }

    # Initial send
    try:
        await websocket.send_text(json.dumps({'type': 'init', 'data': weekly}))
    except WebSocketDisconnect:
        logger.info("Client disconnected before initial data could be sent.")
        return

    # Subscribe to pubsub for real-time weekly updates
    q = asyncio.Queue()
    pubsub_channels[(ticker, '1w')].append(q)
    try:
        while True:
            cndl = await q.get()
            # Add new candle to weeklyData, keep max 500
            weeklyData.append(cndl)
            if len(weeklyData) > 500:
                weeklyData = weeklyData[-500:]
            # Recalculate arrays
            weekly = {
                'ohlc': [
                    {
                        'time': get_item_time(item),
                        'open': float(str(item['open'])[:8]),
                        'high': float(str(item['high'])[:8]),
                        'low': float(str(item['low'])[:8]),
                        'close': float(str(item['close'])[:8]),
                    }
                    for item in weeklyData if get_item_time(item) is not None
                ] if weeklyData else [],
                'volume': [
                    {
                        'time': get_item_time(item),
                        'value': item['volume'],
                    }
                    for item in weeklyData if get_item_time(item) is not None
                ] if weeklyData else [],
                'MA10': calcMA(weeklyData, 10) if weeklyData else [],
                'MA20': calcMA(weeklyData, 20) if weeklyData else [],
                'MA50': calcMA(weeklyData, 50) if weeklyData else [],
                'MA200': calcMA(weeklyData, 200) if weeklyData else [],
            }
            try:
                await websocket.send_text(json.dumps({'type': 'update', 'data': weekly}))
            except WebSocketDisconnect:
                logger.info(f"Client disconnected during update send in /ws/chartdata-wk: ticker={ticker}")
                break
    except WebSocketDisconnect:
        logger.info(f"[ws/chartdata-wk] Client disconnected: ticker={ticker}")
    except Exception as e:
        logger.error(f"[ws/chartdata-wk] Exception: {e}")
        try:
            await websocket.send_text(json.dumps({"error": str(e)}))
        except WebSocketDisconnect:
            logger.info("Client disconnected during error send in /ws/chartdata-wk.")
        except Exception:
            pass
    finally:
        try:
            pubsub_channels[(ticker, '1w')].remove(q)
        except (KeyError, ValueError):
            pass
        try:
            await websocket.close()
        except Exception:
            pass

# --- WebSocket endpoint for daily chart data (Chart2.vue) ---
@app.websocket("/ws/chartdata-dl")
async def websocket_chartdata_dl(
    websocket: WebSocket,
    ticker: str = Query(...),
    before: str = Query(None),
):
    # Authenticate using sec-websocket-protocol header
    api_key = websocket.headers.get('sec-websocket-protocol')
    if api_key != API_KEY:
        await websocket.accept()
        try:
            await websocket.send_text(json.dumps({"error": "Invalid API key"}))
        except WebSocketDisconnect:
            logger.info("Client disconnected before error could be sent.")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept(subprotocol=api_key)
    ticker = sanitize_input(ticker.upper())
    coll = db['OHCLVData']
    query = {'tickerID': ticker}
    if before:
        try:
            before_date = datetime.datetime.fromisoformat(before)
            query['timestamp'] = {'$lt': before_date}
        except Exception:
            pass

    dailyData = await coll.find(query).sort('timestamp', -1).limit(2000).to_list(length=2000)
    dailyData = list(reversed(dailyData))

    # Use cached candle for latest if available
    cached_candle = get_latest_in_progress_candle(ticker, '1d')
    if cached_candle:
        def get_ts(doc):
            return doc.get('timestamp', doc.get('start'))
        cached_ts = get_ts(cached_candle)
        last_ts = get_ts(dailyData[-1]) if dailyData else None
        if not dailyData or last_ts != cached_ts:
            dailyData.append(cached_candle)
        else:
            dailyData[-1] = cached_candle

    # Helper for MA
    def calcMA(Data, period):
        if len(Data) < period:
            return []
        arr = []
        for i in range(period - 1, len(Data)):
            window = Data[i - period + 1:i + 1]
            sum_close = sum(item['close'] for item in window)
            average = sum_close / period
            ts = window[-1].get('timestamp', window[-1].get('start'))
            arr.append({
                'time': ts.isoformat()[:10] if ts else None,
                'value': round(average, 2),
            })
        return arr

    def get_item_time(item):
        ts = item.get('timestamp', item.get('start'))
        return ts.isoformat()[:10] if ts else None

    daily = {
        'ohlc': [
            {
                'time': get_item_time(item),
                'open': float(str(item['open'])[:8]),
                'high': float(str(item['high'])[:8]),
                'low': float(str(item['low'])[:8]),
                'close': float(str(item['close'])[:8]),
            }
            for item in dailyData if get_item_time(item) is not None
        ] if dailyData else [],
        'volume': [
            {
                'time': get_item_time(item),
                'value': item['volume'],
            }
            for item in dailyData if get_item_time(item) is not None
        ] if dailyData else [],
        'MA10': calcMA(dailyData, 10) if dailyData else [],
        'MA20': calcMA(dailyData, 20) if dailyData else [],
        'MA50': calcMA(dailyData, 50) if dailyData else [],
        'MA200': calcMA(dailyData, 200) if dailyData else [],
    }

    # Initial send
    try:
        await websocket.send_text(json.dumps({'type': 'init', 'data': daily}))
    except WebSocketDisconnect:
        logger.info("Client disconnected before initial data could be sent.")
        return

    # Subscribe to pubsub for real-time daily updates
    q = asyncio.Queue()
    pubsub_channels[(ticker, '1d')].append(q)
    try:
        while True:
            cndl = await q.get()
            # Add new candle to dailyData, keep max 2000
            dailyData.append(cndl)
            if len(dailyData) > 2000:
                dailyData = dailyData[-2000:]
            # Recalculate arrays
            daily = {
                'ohlc': [
                    {
                        'time': get_item_time(item),
                        'open': float(str(item['open'])[:8]),
                        'high': float(str(item['high'])[:8]),
                        'low': float(str(item['low'])[:8]),
                        'close': float(str(item['close'])[:8]),
                    }
                    for item in dailyData if get_item_time(item) is not None
                ] if dailyData else [],
                'volume': [
                    {
                        'time': get_item_time(item),
                        'value': item['volume'],
                    }
                    for item in dailyData if get_item_time(item) is not None
                ] if dailyData else [],
                'MA10': calcMA(dailyData, 10) if dailyData else [],
                'MA20': calcMA(dailyData, 20) if dailyData else [],
                'MA50': calcMA(dailyData, 50) if dailyData else [],
                'MA200': calcMA(dailyData, 200) if dailyData else [],
            }
            try:
                await websocket.send_text(json.dumps({'type': 'update', 'data': daily}))
            except WebSocketDisconnect:
                logger.info(f"Client disconnected during update send in /ws/chartdata-dl: ticker={ticker}")
                break
    except WebSocketDisconnect:
        logger.info(f"[ws/chartdata-dl] Client disconnected: ticker={ticker}")
    except Exception as e:
        logger.error(f"[ws/chartdata-dl] Exception: {e}")
        try:
            await websocket.send_text(json.dumps({"error": str(e)}))
        except WebSocketDisconnect:
            logger.info("Client disconnected during error send in /ws/chartdata-dl.")
        except Exception:
            pass
    finally:
        try:
            pubsub_channels[(ticker, '1d')].remove(q)
        except (KeyError, ValueError):
            pass
        try:
            await websocket.close()
        except Exception:
            pass
        
        
# curl -X POST https://localhost:8000/admin/unsubscribe_all
'''
curl -X POST https://localhost:8000/admin/add_ipo_ticker \
  -H "Content-Type: application/json" \
  -H "x-api-key: A3hdbeuyewhedhweuHHS3263ed9d8h32dh238dh32hd82hd928hdjddh23hd8923Y" \
  -d '{"tickers": ["TSLA", "AMZN" ]}' --insecure
'''
# wscat -c "wss://localhost:8000/ws/tiingo_raw" --no-check
# wscat -c "wss://localhost:8000/ws/quotes?symbols=TSLA&x-api-key=A3hdbeuyewhedhweuHHS3263ed9d8h32dh238dh32hd82hd928hdjddh23hd8923Y" --no-check