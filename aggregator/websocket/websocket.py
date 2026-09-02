import sys
sys.path.append('.')
import os
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, Request, status, Body, Response
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import asyncio
import motor.motor_asyncio
import logging
from aggregator.aggregator import pubsub_channels, get_latest_in_progress_candle
import redis.asyncio as aioredis
import typing
from dateutil.parser import isoparse
import datetime
from starlette.websockets import WebSocketDisconnect
from prometheus_client import Counter, Gauge, generate_latest, CONTENT_TYPE_LATEST
import pytz

load_dotenv()

# --- Logging setup ---
LOG_FILE = 'websocket.log'
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s %(message)s',
    handlers=[logging.FileHandler(LOG_FILE), logging.StreamHandler()]
)
logger = logging.getLogger("websocket")

# Prometheus metrics
websocket_requests = Counter('websocket_requests_total', 'Total requests to websocket service')
websocket_health = Gauge('websocket_health_status', 'Health status of websocket (1=healthy, 0=unhealthy)')
websocket_connections = Gauge('websocket_active_connections', 'Active WebSocket connections')

# Filter out health check/metrics logs from uvicorn access logger
class HealthCheckFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        message = record.getMessage()
        return not any(endpoint in message for endpoint in ['/metrics', '/ready', '/health'])

logging.getLogger("uvicorn.access").addFilter(HealthCheckFilter())

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
def make_bounded_queue(maxsize: int = 2000) -> asyncio.Queue:
    """Increased to 2000 for high-end VPS (32GB RAM allows larger buffers)"""
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

async def get_in_progress_from_redis(ticker: str, timeframe: str):
    """Fetch the latest in-progress candle directly from Redis if not in local cache."""
    global redis_client
    if redis_client is None:
        return None
    try:
        key = f"aggr:last:{ticker.upper()}:{timeframe}"
        val = await redis_client.get(key)
        if val:
            if isinstance(val, bytes):
                val = val.decode('utf-8')
            data = json.loads(val)
            # Parse timestamp fields to datetime
            if 'timestamp' in data and isinstance(data['timestamp'], str):
                data['timestamp'] = isoparse(data['timestamp'])
            if 'start' in data and isinstance(data['start'], str):
                data['start'] = isoparse(data['start'])
            return data
    except Exception as e:
        logger.debug(f"Failed to fetch from Redis aggr:last: {e}")
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

# --- Market hours calculation (auto DST) ---
def get_market_hours_utc():
    et = pytz.timezone('US/Eastern')
    now_et = datetime.datetime.now(et)
    open_et = now_et.replace(hour=9, minute=30, second=0, microsecond=0)
    close_et = now_et.replace(hour=16, minute=0, second=0, microsecond=0)
    return (open_et.astimezone(pytz.UTC).hour, open_et.astimezone(pytz.UTC).minute,
            close_et.astimezone(pytz.UTC).hour, close_et.astimezone(pytz.UTC).minute)

MARKET_OPEN_H, MARKET_OPEN_M, MARKET_CLOSE_H, MARKET_CLOSE_M = get_market_hours_utc()
logger.info(f"Market hours: {MARKET_OPEN_H}:{MARKET_OPEN_M:02d} - {MARKET_CLOSE_H}:{MARKET_CLOSE_M:02d} UTC")

def is_market_hours():
    now = datetime.datetime.utcnow()
    if now.weekday() >= 5:  # Weekend
        return False
    open_time = now.replace(hour=MARKET_OPEN_H, minute=MARKET_OPEN_M, second=0, microsecond=0)
    close_time = now.replace(hour=MARKET_CLOSE_H, minute=MARKET_CLOSE_M, second=0, microsecond=0)
    return open_time <= now <= close_time

async def market_hours_monitor(interval=10):
    """Monitor market hours and yield True when market is open, False when closed"""
    while True:
        yield is_market_hours()
        await asyncio.sleep(interval)

# --- Health check endpoints ---
@app.get("/ready")
async def ready():
    return {"status": "ready"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    websocket_requests.inc()
    # Update health gauge based on service status
    try:
        websocket_health.set(1)
    except Exception:
        websocket_health.set(0)
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)

# --- WebSocket endpoint for live candles ---
#
# This endpoint pushes one candle per tick and nothing else.
#
# Its predecessor, /ws/chartdata, answered every tick by resending the whole
# window — up to 2,000 bars, the matching volume array, and four moving
# averages recomputed in Python over that window — per connected client, in
# order to move the last candle. It also read the user's chart settings from
# `Users.ChartSettings` keyed by a `?user=<username>` query parameter it did
# not verify, which is both an authentication hole and a schema that no longer
# exists.
#
# History and overlays are the Node API's job (`GET /api/charts/:symbol/series`,
# which authenticates with the session cookie and computes the overlays from
# the user's own settings). All that is left for this service is the thing only
# it knows: the candle currently being built out of the live trade feed. That
# carries no user data, so it needs no identity, and it is one small object
# rather than a megabyte.
CANDLE_TIMEFRAMES = {
    'daily': '1d',
    'weekly': '1w',
    'intraday1m': '1m',
    'intraday5m': '5m',
    'intraday15m': '15m',
    'intraday30m': '30m',
    'intraday1hr': '1hr',
}

INTRADAY_TIMEFRAMES = {'intraday1m', 'intraday5m', 'intraday15m', 'intraday30m', 'intraday1hr'}


def format_candle(candle: dict, timeframe: str) -> typing.Optional[dict]:
    """One aggregator candle in the shape the chart API already serves.

    The time format has to match `market-bars.ts` exactly or the client cannot
    address the same bar: an intraday bar is the UTC instant to the second, a
    daily or weekly bar is the calendar date alone.
    """
    ts = candle.get('timestamp', candle.get('start'))
    if ts is None:
        return None

    if isinstance(ts, str):
        ts = isoparse(ts)
    if ts.tzinfo is not None:
        ts = ts.astimezone(datetime.timezone.utc).replace(tzinfo=None)

    iso = ts.isoformat()
    return {
        'time': iso[:19] if timeframe in INTRADAY_TIMEFRAMES else iso[:10],
        'open': float(candle['open']),
        'high': float(candle['high']),
        'low': float(candle['low']),
        'close': float(candle['close']),
        'volume': float(candle.get('volume', 0) or 0),
        'final': bool(candle.get('final', False)),
    }


@app.websocket('/ws/candles')
async def websocket_candles(
    websocket: WebSocket,
    symbol: str = Query(...),
    timeframe: str = Query('daily'),
):
    await websocket.accept()
    symbol = symbol.upper()

    if timeframe not in CANDLE_TIMEFRAMES:
        await websocket.send_text(json.dumps({'type': 'error', 'error': 'invalid timeframe'}))
        await websocket.close()
        return

    pubsub_tf = CANDLE_TIMEFRAMES[timeframe]
    logger.info(f"Client connected to /ws/candles: symbol={symbol}, timeframe={timeframe}")
    websocket_connections.inc()

    # A chart opened halfway through a bucket should not stare at a stale
    # candle until the next trade: send whatever the bucket holds right now.
    opening = await get_in_progress_from_redis(symbol, pubsub_tf)
    if opening is None:
        opening = get_in_progress_cached(symbol, pubsub_tf)
    if opening is not None:
        formatted = format_candle(opening, timeframe)
        if formatted is not None:
            await websocket.send_text(json.dumps({'type': 'candle', 'candle': formatted}))

    q = make_bounded_queue()
    monitor = market_hours_monitor()
    subscribed = False
    monitor_task = None

    async def follow_market_hours():
        # Outside market hours nothing is published, so the subscription is
        # dropped rather than held open against a silent channel overnight.
        nonlocal subscribed
        async for market_open in monitor:
            if market_open and not subscribed:
                pubsub_channels[(symbol, pubsub_tf)].append(q)
                subscribed = True
            elif not market_open and subscribed:
                try:
                    pubsub_channels[(symbol, pubsub_tf)].remove(q)
                except (KeyError, ValueError):
                    pass
                subscribed = False

    try:
        monitor_task = asyncio.create_task(follow_market_hours())
        while True:
            try:
                candle = await asyncio.wait_for(q.get(), timeout=1.0)
            except asyncio.TimeoutError:
                # The timeout is the disconnect check: without it a client that
                # went away during a quiet market would be noticed only on the
                # next trade.
                continue

            formatted = format_candle(candle, timeframe)
            if formatted is None:
                continue
            await websocket.send_text(json.dumps({'type': 'candle', 'candle': formatted}))
    except WebSocketDisconnect:
        logger.info(f"[ws/candles] Client disconnected: symbol={symbol}")
    except Exception as exc:
        logger.error(f"Exception in /ws/candles: {exc}")
    finally:
        websocket_connections.dec()
        if monitor_task is not None and not monitor_task.done():
            monitor_task.cancel()
            try:
                await monitor_task
            except asyncio.CancelledError:
                pass
        if subscribed:
            try:
                pubsub_channels[(symbol, pubsub_tf)].remove(q)
            except (KeyError, ValueError):
                pass
        try:
            await websocket.close()
        except Exception:
            pass


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
                # Try Redis first, then local cache
                cached = await get_in_progress_from_redis(sym, '1m')
                if not cached:
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
                # Try Redis first, then local cache
                cached_daily = await get_in_progress_from_redis(sym, '1d')
                if not cached_daily:
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
        # Only use cached candle during market hours for initial load
        cached_candle = None
        if is_market_hours():
            # Try Redis first, then local cache
            cached_candle = await get_in_progress_from_redis(ticker, '1d')
            if not cached_candle:
                cached_candle = get_in_progress_cached(ticker, '1d')
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

    # --- Per-client queue and pubsub subscription with dynamic market hours ---
    client_queue = make_bounded_queue()
    pubsub_refs = []
    listener_tasks = []  # Track tasks for cleanup
    monitor = market_hours_monitor()
    subscribed = False
    monitor_task = None
    
    async def check_market_transition_watchpanel():
        nonlocal subscribed
        async for market_open in monitor:
            if market_open and not subscribed:
                for ticker in tickers:
                    async def pubsub_listener(q, t):
                        while True:
                            cndl = await q.get()
                            await client_queue.put((t, cndl))
                    q = make_bounded_queue()
                    pubsub_channels[(ticker, '1d')].append(q)
                    pubsub_refs.append((ticker, q))
                    task = asyncio.create_task(pubsub_listener(q, ticker))
                    listener_tasks.append(task)
                subscribed = True
                logger.info(f"[Market OPEN] Subscribed to watchpanel pubsub for {len(tickers)} tickers")
            elif not market_open and subscribed:
                for task in listener_tasks:
                    if not task.done():
                        task.cancel()
                listener_tasks.clear()
                for ticker, q in pubsub_refs:
                    try:
                        pubsub_channels[(ticker, '1d')].remove(q)
                    except (KeyError, ValueError):
                        pass
                pubsub_refs.clear()
                subscribed = False
                logger.info(f"[Market CLOSED] Unsubscribed from watchpanel pubsub")
    
    try:
        monitor_task = asyncio.create_task(check_market_transition_watchpanel())
        while True:
            try:
                ticker, cndl = await asyncio.wait_for(client_queue.get(), timeout=1.0)
            except asyncio.TimeoutError:
                continue
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
        # Cancel all listener tasks
        for task in listener_tasks:
            if not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
                except Exception as e:
                    logger.debug(f"Error awaiting cancelled listener task: {e}")
        
        # Remove from pubsub channels
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
        # Only use cached candle during market hours for initial load
        cached_candle = None
        if is_market_hours():
            # Try Redis first, then local cache
            cached_candle = await get_in_progress_from_redis(ticker, '1d')
            if not cached_candle:
                cached_candle = get_in_progress_cached(ticker, '1d')
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

    # --- Per-client queue and pubsub subscription with dynamic market hours ---
    client_queue = make_bounded_queue()
    pubsub_refs = []
    listener_tasks = []  # Track tasks for cleanup
    monitor = market_hours_monitor()
    subscribed = False
    monitor_task = None
    
    async def check_market_transition_data_values():
        nonlocal subscribed
        async for market_open in monitor:
            if market_open and not subscribed:
                for ticker in ticker_list:
                    async def pubsub_listener(q, t):
                        while True:
                            cndl = await q.get()
                            await client_queue.put((t, cndl))
                    q = make_bounded_queue()
                    pubsub_channels[(ticker, '1d')].append(q)
                    pubsub_refs.append((ticker, q))
                    task = asyncio.create_task(pubsub_listener(q, ticker))
                    listener_tasks.append(task)
                subscribed = True
                logger.info(f"[Market OPEN] Subscribed to data-values pubsub for {len(ticker_list)} tickers")
            elif not market_open and subscribed:
                for task in listener_tasks:
                    if not task.done():
                        task.cancel()
                listener_tasks.clear()
                for ticker, q in pubsub_refs:
                    try:
                        pubsub_channels[(ticker, '1d')].remove(q)
                    except (KeyError, ValueError):
                        pass
                pubsub_refs.clear()
                subscribed = False
                logger.info(f"[Market CLOSED] Unsubscribed from data-values pubsub")
    
    try:
        monitor_task = asyncio.create_task(check_market_transition_data_values())
        while True:
            # Wait for any update from any ticker
            try:
                ticker, cndl = await asyncio.wait_for(client_queue.get(), timeout=1.0)
            except asyncio.TimeoutError:
                continue
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
        # Cancel monitor task
        if monitor_task and not monitor_task.done():
            monitor_task.cancel()
            try:
                await monitor_task
            except asyncio.CancelledError:
                pass
        # Cancel all listener tasks
        for task in listener_tasks:
            if not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
                except Exception as e:
                    logger.debug(f"Error awaiting cancelled listener task: {e}")
        
        # Remove from pubsub channels
        for ticker, q in pubsub_refs:
            try:
                pubsub_channels[(ticker, '1d')].remove(q)
            except (KeyError, ValueError):
                pass
        try:
            await websocket.close()
        except Exception:
            pass
