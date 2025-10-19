import sys
sys.path.append('.')
from server.aggregator.organizer import Daily
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
from server.aggregator.aggregator import start_aggregator, pubsub_channels, get_latest_in_progress_candle
import redis.asyncio as aioredis
import typing
from bson import ObjectId
from dateutil.parser import isoparse
import datetime
from starlette.websockets import WebSocketDisconnect
from server.aggregator.ipo import IPO
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

# Config / DB
API_KEY = os.getenv('VITE_EREUNA_KEY')
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
mongo_client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db = mongo_client.get_database('EreunaDB')

# Local cache for latest in-progress candles (updated from Redis pubsub)
latest_cache: dict[tuple[str, str], dict] = {}

# Redis client and listener task (initialized on startup)
redis_client: typing.Optional[aioredis.Redis] = None
redis_listener_task: typing.Optional[asyncio.Task] = None

# Queue helpers to avoid unbounded memory growth per-client
def make_bounded_queue(maxsize: int = 128) -> asyncio.Queue:
    return asyncio.Queue(maxsize=maxsize)

def safe_put_nowait(q: asyncio.Queue, item) -> bool:
    """Try to put_nowait into q; if full, drop the oldest item and try again.
    Returns True if put succeeded, False otherwise.
    """
    try:
        q.put_nowait(item)
        return True
    except asyncio.QueueFull:
        try:
            # Drop oldest
            q.get_nowait()
        except Exception:
            pass
        try:
            q.put_nowait(item)
            return True
        except Exception:
            return False

def get_in_progress_cached(ticker: str, timeframe: str):
    """Return cached in-progress candle first from Redis-backed latest_cache, then fall back to aggregator module cache."""
    key = (ticker.upper(), timeframe)
    val = latest_cache.get(key)
    if val:
        return val
    try:
        return get_latest_in_progress_candle(ticker, timeframe)
    except Exception:
        return None

async def _redis_aggregated_listener():
    """Listen to aggregator Redis pubsub (aggr:*) and forward messages into local pubsub_channels
    so websocket clients get real-time updates across processes.
    """
    global redis_client
    if redis_client is None:
        return
    try:
        pub = redis_client.pubsub()
        # Subscribe to aggregated channels for all timeframes
        await pub.psubscribe('aggr:*')
        logger.debug('Subscribed to Redis aggregated channels (aggr:*)')
        while True:
            msg = await pub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if msg is None:
                await asyncio.sleep(0.01)
                continue
            try:
                data_raw = msg.get('data')
                if isinstance(data_raw, (bytes, bytearray)):
                    data_raw = data_raw.decode('utf-8')
                payload = json.loads(data_raw)
                ticker = payload.get('tickerID')
                tf = payload.get('timeframe')
                if not ticker or not tf:
                    continue
                key = (ticker.upper(), tf)
                # Normalize and convert timestamp/start fields to datetime objects so
                # websocket handlers can safely call .isoformat() and compare timestamps.
                try:
                    # prefer 'timestamp' key, fallback to 'start'
                    if 'timestamp' in payload and payload['timestamp'] is not None:
                        try:
                            payload['timestamp'] = isoparse(payload['timestamp']) if isinstance(payload['timestamp'], str) else payload['timestamp']
                        except Exception:
                            pass
                    if 'start' in payload and payload['start'] is not None:
                        try:
                            payload['start'] = isoparse(payload['start']) if isinstance(payload['start'], str) else payload['start']
                        except Exception:
                            pass
                except Exception:
                    # best-effort conversion; continue even if parsing fails
                    pass
                # update latest cache
                latest_cache[key] = payload
                # forward to local pubsub queues
                queues = list(pubsub_channels.get(key, []))
                for q in queues:
                    try:
                        # avoid blocking pubsub dispatcher; drop oldest if necessary
                        safe_put_nowait(q, payload)
                    except Exception:
                        logger.debug('Failed to forward aggregated payload to local queue')
            except Exception as e:
                logger.exception(f'Error parsing aggregated Redis message: {e}')
    except asyncio.CancelledError:
        logger.info('Redis aggregated listener cancelled')
        return
    except Exception as e:
        logger.exception(f'Redis aggregated listener error: {e}')


# startup/shutdown handlers are registered after `app` is defined

# FastAPI app and middleware
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event('startup')
async def websocket_startup():
    global redis_client, redis_listener_task, mongo_client, db
    REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
    logger.info(f"websocket startup: MONGO_URI={MONGO_URI}, REDIS_URL={REDIS_URL}")
    
    # Test Redis connection
    try:
        logger.info(f"Connecting to Redis at {REDIS_URL}")
        redis_client = aioredis.from_url(REDIS_URL)
        try:
            pong = await redis_client.ping()
            logger.info(f"Redis ping successful: {pong}")
        except Exception as e:
            logger.warning(f"Redis ping failed during websocket startup: {e}")
            # If configured host is 'redis' (docker), try localhost fallback for local dev
            try:
                if 'redis://redis' in REDIS_URL:
                    alt = REDIS_URL.replace('redis://redis', 'redis://localhost')
                    logger.info(f"Attempting Redis fallback to {alt}")
                    redis_client = aioredis.from_url(alt)
                    pong2 = await redis_client.ping()
                    logger.info(f"Redis fallback ping successful: {pong2}")
            except Exception as e2:
                logger.warning(f"Redis fallback also failed: {e2}")
        # start listener task (listener will early-return if redis_client is None)
        redis_listener_task = asyncio.create_task(_redis_aggregated_listener())
    except Exception as e:
        logger.exception(f'Failed to start Redis aggregated listener: {e}')

    # Test MongoDB connection
    try:
        try:
            await mongo_client.admin.command('ping')
            logger.info('Mongo ping successful')
        except Exception as me:
            logger.warning(f"Mongo ping failed in websocket startup: {me}")
            # If we're in Docker (mongodb host), don't try localhost fallback
            # If we're in local dev (localhost), try the mongodb service name
            if 'localhost' in MONGO_URI:
                try:
                    alt_m = MONGO_URI.replace('mongodb://localhost', 'mongodb://mongodb')
                    logger.info(f"Attempting MongoDB fallback to {alt_m}")
                    mongo_client = motor.motor_asyncio.AsyncIOMotorClient(alt_m)
                    db = mongo_client.get_database('EreunaDB')
                    await mongo_client.admin.command('ping')
                    logger.info('Mongo fallback ping successful')
                except Exception as me2:
                    logger.warning(f"Mongo fallback also failed: {me2}")
    except Exception:
        logger.exception('Error during websocket mongo fallback check')


@app.on_event('shutdown')
async def websocket_shutdown():
    global redis_client, redis_listener_task
    if redis_listener_task:
        redis_listener_task.cancel()
        try:
            await redis_listener_task
        except Exception:
            pass
    if redis_client:
        try:
            await redis_client.close()
        except Exception:
            pass

MARKET_OPEN_HOUR = 13  # UTC 13:30 (9:30am ET)
MARKET_CLOSE_HOUR = 20  # UTC 20:00 (4:00pm ET)
MARKET_OPEN_MINUTE = 30
MARKET_CLOSE_MINUTE = 1

def is_market_hours():
    now = datetime.datetime.utcnow()
    # Exclude weekends
    if now.weekday() >= 5:
        return False
    open_time = now.replace(hour=MARKET_OPEN_HOUR, minute=MARKET_OPEN_MINUTE, second=0, microsecond=0)
    close_time = now.replace(hour=MARKET_CLOSE_HOUR, minute=MARKET_CLOSE_MINUTE, second=0, microsecond=0)
    return open_time <= now <= close_time

# --- Health check endpoints ---
@app.get("/ready")
async def ready():
    return {"status": "ready"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint - basic implementation"""
    return {"status": "ok", "service": "websocket"}

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
        q = make_bounded_queue()
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

    async def fetch_best_close(sym: str):
        try:
            if is_market_hours():
                # prefer in-progress cached candle (if exists) for more real-time accuracy
                cached = get_in_progress_cached(sym, '1m')
                if cached and 'close' in cached:
                    return float(cached['close'])
                # fall back to DB latest 1m
                doc = await db['OHCLVData1m'].find({'tickerID': sym}).sort('timestamp', -1).limit(1).to_list(length=1)
                if doc and len(doc) > 0 and 'close' in doc[0]:
                    return float(doc[0]['close'])
                return None
            else:
                # outside market hours prefer daily close (more precise final close)
                doc = await db['OHCLVData'].find({'tickerID': sym}).sort('timestamp', -1).limit(1).to_list(length=1)
                if doc and len(doc) > 0 and 'close' in doc[0]:
                    return float(doc[0]['close'])
                # fallback to cached in-progress daily if available
                cached_daily = get_in_progress_cached(sym, '1d')
                if cached_daily and 'close' in cached_daily:
                    return float(cached_daily['close'])
                # finally fallback to latest 1m if nothing else
                doc1m = await db['OHCLVData1m'].find({'tickerID': sym}).sort('timestamp', -1).limit(1).to_list(length=1)
                if doc1m and len(doc1m) > 0 and 'close' in doc1m[0]:
                    return float(doc1m[0]['close'])
                return None
        except Exception as e:
            logger.exception(f"Error fetching best close for {sym}: {e}")
            return None

    try:
        while True:
            result = {}
            for sym in symbol_list:
                val = await fetch_best_close(sym)
                result[sym] = val
            try:
                await websocket.send_text(json.dumps(result))
            except WebSocketDisconnect:
                logger.info("Client disconnected during send_text in /ws/quotes.")
                break
            # send updates more frequently during market hours
            await asyncio.sleep(1 if is_market_hours() else 5)
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
    client_queue = make_bounded_queue()
    pubsub_refs = []
    for ticker in tickers:
        async def pubsub_listener(q, t):
            while True:
                cndl = await q.get()
                await client_queue.put((t, cndl))
        q = make_bounded_queue()
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
    client_queue = make_bounded_queue()
    # Register a pubsub listener for each ticker that puts updates into the client queue
    pubsub_refs = []
    for ticker in ticker_list:
        async def pubsub_listener(q, t):
            while True:
                cndl = await q.get()
                await client_queue.put((t, cndl))
        q = make_bounded_queue()
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
    q = make_bounded_queue()
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
    q = make_bounded_queue()
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
