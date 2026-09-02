import sys
sys.path.append('.')
import os
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import asyncio
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

# This service reads Redis and nothing else. Both endpoints serve the candle
# the aggregator is currently building, which lives in Redis by the time it is
# worth sending; the durable history is the Node API's to serve, from Mongo,
# over an authenticated connection. So there is no database client here, and no
# API key: what is served is public market data the client already named.

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
    global redis_client, redis_listener_task
    redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    logger.info(f"websocket startup: REDIS_URL={redis_url}")
    try:
        redis_client = aioredis.from_url(redis_url)
        await redis_client.ping()
        redis_listener_task = asyncio.create_task(_redis_aggregated_listener())
        logger.info('Redis connected; aggregated listener started')
    except Exception as exc:
        # Redis is the only source this service has. Without it every endpoint
        # would accept connections and then sit silent, which reads as a broken
        # feed rather than a broken service, so fail loudly instead.
        logger.exception(f'Failed to connect to Redis: {exc}')
        raise


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


# --- WebSocket endpoint for live position quotes ---
#
# One price per symbol, pushed when it changes.
#
# Its predecessor polled MongoDB once per symbol per second, per connected
# client: a portfolio of twenty positions was twenty queries a second, and ten
# open tabs were two hundred. It also authenticated with `VITE_EREUNA_KEY`
# passed through `Sec-WebSocket-Protocol` — a build-time constant compiled into
# the browser bundle, so every visitor already had it. That was not
# authentication, and removing it costs nothing: a last-traded price is public
# market data, and the client names the symbols it wants anyway.
#
# The aggregator already publishes every 1-minute bucket to Redis, so the price
# is there to be read. This subscribes once, filters to the requested symbols,
# and sends only what moved.
QUOTE_TIMEFRAME = '1m'
MAX_QUOTE_SYMBOLS = 250


def parse_symbols(raw: str) -> list[str]:
    """The requested symbols, upper-cased, de-duplicated, order preserved."""
    seen: dict[str, None] = {}
    for part in raw.split(','):
        symbol = part.strip().upper()
        if symbol and len(symbol) <= 32:
            seen.setdefault(symbol)
    return list(seen)[:MAX_QUOTE_SYMBOLS]


async def opening_quotes(symbols: list[str]) -> dict[str, float]:
    """The current price of each symbol, so a fresh client is not blank until
    the next trade. Read from the aggregator's last-bucket keys, never Mongo."""
    quotes: dict[str, float] = {}
    for symbol in symbols:
        candle = await get_in_progress_from_redis(symbol, QUOTE_TIMEFRAME)
        if candle is None:
            candle = get_in_progress_cached(symbol, QUOTE_TIMEFRAME)
        if candle is not None and candle.get('close') is not None:
            quotes[symbol] = float(candle['close'])
    return quotes


@app.websocket('/ws/quotes')
async def websocket_quotes(websocket: WebSocket, symbols: str = Query(...)):
    await websocket.accept()

    watched = parse_symbols(symbols)
    if not watched:
        await websocket.send_text(json.dumps({'type': 'error', 'error': 'no symbols'}))
        await websocket.close()
        return

    logger.info(f"Client connected to /ws/quotes: {len(watched)} symbols")
    websocket_connections.inc()

    last: dict[str, float] = await opening_quotes(watched)
    if last:
        await websocket.send_text(json.dumps({'type': 'quotes', 'quotes': last}))

    q = make_bounded_queue()
    monitor = market_hours_monitor()
    subscribed: list[str] = []
    monitor_task = None

    def subscribe() -> None:
        for symbol in watched:
            pubsub_channels[(symbol, QUOTE_TIMEFRAME)].append(q)
            subscribed.append(symbol)

    def unsubscribe() -> None:
        while subscribed:
            symbol = subscribed.pop()
            try:
                pubsub_channels[(symbol, QUOTE_TIMEFRAME)].remove(q)
            except (KeyError, ValueError):
                pass

    async def follow_market_hours():
        # Nothing is published outside market hours, so the subscriptions are
        # dropped rather than held open against silent channels overnight.
        async for market_open in monitor:
            if market_open and not subscribed:
                subscribe()
            elif not market_open and subscribed:
                unsubscribe()

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

            symbol = str(candle.get('ticker') or candle.get('tickerID') or '').upper()
            close = candle.get('close')
            if symbol not in watched or close is None:
                continue

            price = float(close)
            if last.get(symbol) == price:
                continue
            last[symbol] = price
            await websocket.send_text(json.dumps({'type': 'quotes', 'quotes': {symbol: price}}))
    except WebSocketDisconnect:
        logger.info('[ws/quotes] Client disconnected')
    except Exception as exc:
        logger.error(f"Exception in /ws/quotes: {exc}")
    finally:
        websocket_connections.dec()
        if monitor_task is not None and not monitor_task.done():
            monitor_task.cancel()
            try:
                await monitor_task
            except asyncio.CancelledError:
                pass
        unsubscribe()
        try:
            await websocket.close()
        except Exception:
            pass
