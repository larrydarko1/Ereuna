import sys
sys.path.append('.')
from organizer import Daily
from intraday_aggregation import aggregate_intraday_candles
import datetime as dt
import os
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import websockets
import ssl
import asyncio
import motor.motor_asyncio
import traceback
from aggregator import start_aggregator, pubsub_channels
from bson import ObjectId
from dateutil.parser import isoparse
import datetime

load_dotenv()
TIINGO_API_KEY = os.getenv('TIINGO_KEY')

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
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


# Only stocks/ETFs: get tickers from DB at startup
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


async def relay_tiingo(ws_url, subscribe_msg, ssl_ctx, filter_fn):
    while True:
        try:
            async with websockets.connect(ws_url, ssl=ssl_ctx) as tiingo_ws:
                await tiingo_ws.send(json.dumps(subscribe_msg))
                try:
                    while True:
                        msg = await tiingo_ws.recv()
                        try:
                            tiingo_data = json.loads(msg)
                        except Exception as e:
                            print(f"JSON decode error: {e}")
                            continue
                        if isinstance(tiingo_data, dict):
                            if tiingo_data.get("messageType") in ("I", "H"):
                                continue
                            if filter_fn(tiingo_data):
                                d = tiingo_data.get("data")
                                service = tiingo_data.get("service")
                                # --- Bandwidth measurement for stocks only ---
                                if service == "iex" and isinstance(d, list) and len(d) > 2:
                                    symbol = d[1].lower()
                                    msg_bytes = len(msg.encode("utf-8"))
                                    stats = stock_bandwidth_stats.setdefault(symbol, {'bytes': 0, 'messages': 0})
                                    stats['bytes'] += msg_bytes
                                    stats['messages'] += 1
                                    # --- Cache the latest quote ---
                                    latest_quotes[symbol] = tiingo_data
                                    # --- End cache ---
                                    try:
                                        await message_queue.put(json.dumps(tiingo_data))
                                    except asyncio.QueueFull:
                                        await message_queue.get()
                                        await message_queue.put(json.dumps(tiingo_data))
                except Exception as inner_e:
                    print(f"relay_tiingo inner exception: {inner_e}")
                    # --- Explicitly unsubscribe from all tickers before closing ---
                    try:
                        # Per Tiingo docs 3.3.2, unsubscribe by sending a subscribe event with an empty tickers array
                        unsubscribe_msg = {
                            "eventName": "subscribe",
                            "authorization": subscribe_msg.get("authorization"),
                            "eventData": {
                                "tickers": []
                            }
                        }
                        print("[relay_tiingo] Triggering unsubscribe: sending subscribe with empty tickers array...")
                        await tiingo_ws.send(json.dumps(unsubscribe_msg))
                        print("[relay_tiingo] Sent unsubscribe (subscribe with empty tickers array)")
                        # Try to receive and log Tiingo response after unsubscribe
                        try:
                            response = await asyncio.wait_for(tiingo_ws.recv(), timeout=2)
                            print(f"[relay_tiingo] Tiingo response after unsubscribe: {response}")
                        except asyncio.TimeoutError:
                            print("[relay_tiingo] No response from Tiingo after unsubscribe (timeout)")
                        except Exception as resp_e:
                            print(f"[relay_tiingo] Error receiving Tiingo response after unsubscribe: {resp_e}")
                    except Exception as unsub_e:
                        print(f"Error sending unsubscribe: {unsub_e}")
                    # Now close the websocket (context manager will handle)
                    raise inner_e
        except Exception as e:
            print(f"Exception in relay_tiingo: {e}")
            print_total_bandwidth()
            await asyncio.sleep(5)  # Retry after delay

# --- Market hours background manager ---
async def market_hours_manager():
    global stock_symbols
    tiingo_task = None
    aggregator_task = None
    higher_tf_task = None
    subscribed = False
    # assetinfo_coll = db.AssetInfo  # Not used for now
    while True:
        try:
            if is_market_hours():
                if not subscribed:
                    # Use hardcoded tickers for testing
                    stock_symbols = ['TSLA', 'AAPL']
                    print(f"[MarketHours] Subscribing to {len(stock_symbols)} stock/ETF tickers: {stock_symbols}")
                    stock_ws_url = "wss://api.tiingo.com/iex"
                    stock_subscribe_msg = {
                        "eventName": "subscribe",
                        "authorization": TIINGO_API_KEY,
                        "eventData": {
                            "thresholdLevel": 6,
                            "tickers": stock_symbols
                        }
                    }
                    tiingo_task = asyncio.create_task(relay_tiingo(stock_ws_url, stock_subscribe_msg, ssl_ctx, stock_filter))
                    aggregator_task = asyncio.create_task(start_aggregator(message_queue, mongo_client))
                    subscribed = True
            else:
                if subscribed:
                    print("[MarketHours] Market closed. Cancelling Tiingo and aggregator tasks.")
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
                    subscribed = False
            await asyncio.sleep(10)  # Check every 10 seconds
        except Exception as e:
            print(f"[MarketHours] Exception in market_hours_manager: {e}")
            import traceback
            traceback.print_exc()
            await asyncio.sleep(10)

# Start the market hours manager on startup
@app.on_event("startup")
async def start_market_hours_manager():
    asyncio.create_task(market_hours_manager())

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
    await websocket.accept()
    ticker = ticker.upper()
    # Map timeframe to collection and time format
    tf_map = {
        'daily':   (db['OHCLVData'], 'date', 2000),
        'weekly':  (db['OHCLVData2'], 'date', 500),
        'intraday1m':   (db['OHCLVData1m'], 'datetime', 1440),
        'intraday5m':   (db['OHCLVData5m'], 'datetime', 288),
        'intraday15m':  (db['OHCLVData15m'], 'datetime', 96),
        'intraday30m':  (db['OHCLVData30m'], 'datetime', 48),
        'intraday1hr':  (db['OHCLVData1hr'], 'datetime', 24),
    }
    if timeframe not in tf_map:
        await websocket.send_text(json.dumps({'error': 'Invalid timeframe'}))
        await websocket.close()
        return
    coll, timeType, length = tf_map[timeframe]
    # Get user chart settings if user param is present
    chartSettings = None
    if user:
        user_doc = await db.Users.find_one({'Username': user})
        if user_doc and user_doc.get('ChartSettings'):
            chartSettings = user_doc['ChartSettings']
    # Fetch historical data (most recent N, in correct order)
    arr = await coll.find({'tickerID': ticker}).sort('timestamp', -1).to_list(length=length)
    arr = list(reversed(arr))

    # Check for cached in-progress candle
    pubsub_tf = {
        'daily': '1440m',
        'weekly': '10080m',
        'intraday1m': '1m',
        'intraday5m': '5m',
        'intraday15m': '15m',
        'intraday30m': '30m',
        'intraday1hr': '1hr',
    }[timeframe]
    cached_candle = None
    # Find the latest in-progress candle in pubsub_channels (if any)
    q_list = pubsub_channels.get((ticker, pubsub_tf), [])
    if q_list:
        # Try to get the last published candle from any queue (if available)
        # This is a workaround, ideally you should keep a separate cache for in-progress candles
        try:
            # If queues have items, get the last one
            for q in q_list:
                if not q.empty():
                    cached_candle = await q.get()
                    # Put it back so we don't consume it
                    await q.put(cached_candle)
                    break
        except Exception:
            pass

    # Build OHLC and volume arrays, append cached candle if available and not duplicate
    ohlc_arr = arr.copy()
    if cached_candle and (not ohlc_arr or ohlc_arr[-1]['timestamp'] != cached_candle['timestamp']):
        ohlc_arr.append(cached_candle)
    elif cached_candle and ohlc_arr and ohlc_arr[-1]['timestamp'] == cached_candle['timestamp']:
        ohlc_arr[-1] = cached_candle

    ohlc = [
        {
            'time': item['timestamp'].isoformat()[:19] if timeType == 'datetime' else item['timestamp'].isoformat()[:10],
            'open': float(str(item['open'])[:8]),
            'high': float(str(item['high'])[:8]),
            'low': float(str(item['low'])[:8]),
            'close': float(str(item['close'])[:8])
        }
        for item in ohlc_arr
    ] if ohlc_arr else []
    # Use 0 for missing volume in 1m timeframe
    if timeframe == 'intraday1m':
        volume = [
            {
                'time': item['timestamp'].isoformat()[:19] if timeType == 'datetime' else item['timestamp'].isoformat()[:10],
                'value': item.get('volume', 0)
            }
            for item in ohlc_arr
        ] if ohlc_arr else []
    else:
        volume = [
            {
                'time': item['timestamp'].isoformat()[:19] if timeType == 'datetime' else item['timestamp'].isoformat()[:10],
                'value': item['volume']
            }
            for item in ohlc_arr
        ] if ohlc_arr else []
    # Calculate MAs/EMAs
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
        # Default: provide 10, 20, 50, 200 SMA
        ma_data['MA1'] = calcMA_py(arr, 10, timeType) if arr else []
        ma_data['MA2'] = calcMA_py(arr, 20, timeType) if arr else []
        ma_data['MA3'] = calcMA_py(arr, 50, timeType) if arr else []
        ma_data['MA4'] = calcMA_py(arr, 200, timeType) if arr else []
    # IntrinsicValue
    intrinsicValue = None
    if chartSettings and chartSettings.get('intrinsicValue', {}).get('visible'):
        assetInfo = await db.AssetInfo.find_one({'Symbol': ticker})
        if assetInfo and 'IntrinsicValue' in assetInfo:
            intrinsicValue = assetInfo['IntrinsicValue']
    # Build initial payload
    payload = {
        'ohlc': ohlc,
        'volume': volume,
        **ma_data
    }
    if intrinsicValue is not None:
        payload['intrinsicValue'] = intrinsicValue
    await websocket.send_text(json.dumps({'type': 'init', 'data': payload}))
    # Subscribe to pubsub for this ticker/timeframe
    pubsub_tf = {
        'daily': '1440m',
        'weekly': '10080m',
        'intraday1m': '1m',
        'intraday5m': '5m',
        'intraday15m': '15m',
        'intraday30m': '30m',
        'intraday1hr': '1hr',
    }[timeframe]
    q = asyncio.Queue()
    pubsub_channels[(ticker, pubsub_tf)].append(q)
    try:
        in_progress_candle = None
        while True:
            try:
                cndl = await q.get()
                # Check if this is a finalized candle (has 'final': True)
                is_final = cndl.get('final', False)
                if is_final:
                    arr.append(cndl)
                    if len(arr) > length:
                        arr = arr[-length:]
                    in_progress_candle = None
                else:
                    # In-progress candle: update or append
                    in_progress_candle = cndl
                # Build ohlc array: arr + in-progress candle (if any and not duplicate)
                ohlc_arr = arr.copy()
                if in_progress_candle:
                    if not ohlc_arr or ohlc_arr[-1]['timestamp'] != in_progress_candle['timestamp']:
                        ohlc_arr.append(in_progress_candle)
                    else:
                        ohlc_arr[-1] = in_progress_candle
                # Format ohlc for frontend
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
                # Use 0 for missing volume in 1m timeframe
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
                # Recalc MAs/EMAs
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
                # IntrinsicValue (only recalc if needed)
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
                import logging
                logger = logging.getLogger("chartdata_ws")
                logger.info(f"Sending update to frontend: ticker={ticker}, timeframe={timeframe}, update_payload={update_payload}")
                await websocket.send_text(json.dumps({'type': 'update', 'data': update_payload}))
            except WebSocketDisconnect:
                break
            except Exception as e:
                import traceback
                print(f"Exception in /ws/chartdata loop: {e}")
                traceback.print_exc()
                try:
                    await websocket.send_text(json.dumps({'error': str(e)}))
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
