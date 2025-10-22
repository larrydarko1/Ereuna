import os
import asyncio
import logging
from fastapi import FastAPI
from redis.asyncio import from_url as redis_from_url
import motor.motor_asyncio
from urllib.parse import urlparse, urlunparse

from server.aggregator import aggregator as aggregator_mod
from server.aggregator.aggregator import (
    start_aggregator,
    flush_daily_weekly_candles_at_market_close,
    redis_stream_adapter,
)
from server.aggregator.organizer import Daily
from pydantic import BaseModel, validator
from server.aggregator.ipo import IPO
import re

logger = logging.getLogger('aggregator_server')

# Filter out health check/metrics logs from uvicorn access logger
class HealthCheckFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        message = record.getMessage()
        return not any(endpoint in message for endpoint in ['/metrics', '/ready', '/health'])

logging.getLogger("uvicorn.access").addFilter(HealthCheckFilter())

app = FastAPI(title='Ereuna Aggregator')


@app.on_event('startup')
async def startup():
    logger.debug('Aggregator server starting up')
    REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
    logger.debug(f"startup env: REDIS_URL={REDIS_URL}, MONGO_URI={MONGO_URI}")

    # create clients
    try:
        app.state.redis_client = redis_from_url(REDIS_URL)
        logger.debug(f"Connecting to Redis at {REDIS_URL}")
        try:
            pong = await app.state.redis_client.ping()
            logger.debug(f"Redis ping successful: {pong}")
        except Exception as e:
            logger.warning(f"Redis ping failed: {e}")
            # Try localhost fallback for local dev if configured as 'redis'
            try:
                if 'redis://redis' in REDIS_URL:
                    alt = REDIS_URL.replace('redis://redis', 'redis://localhost')
                    logger.debug(f"Attempting Redis fallback to {alt}")
                    app.state.redis_client = redis_from_url(alt)
                    pong2 = await app.state.redis_client.ping()
                    logger.debug(f"Redis fallback ping successful: {pong2}")
            except Exception as e2:
                logger.warning(f"Redis fallback also failed: {e2}")
    except Exception:
        logger.exception('Failed to create redis client')

    # create motor client and verify connectivity; if configured for Docker hostnames
    # and the host is unreachable in local dev, attempt a localhost fallback.
    try:
        app.state.mongo_client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
        try:
            await app.state.mongo_client.admin.command('ping')
            logger.debug('Mongo ping successful')
        except Exception as me:
            logger.warning(f"Mongo ping failed: {me}")
            # Attempt a localhost fallback by replacing hostname with 'localhost', preserving port
            try:
                p = urlparse(MONGO_URI)
                host = p.hostname
                port = p.port
                if host and host != 'localhost':
                    new_netloc = 'localhost' + (f":{port}" if port else '')
                    alt = urlunparse((p.scheme, new_netloc, p.path or '', p.params or '', p.query or '', p.fragment or ''))
                    logger.debug(f"Attempting Mongo fallback to {alt}")
                    app.state.mongo_client = motor.motor_asyncio.AsyncIOMotorClient(alt)
                    await app.state.mongo_client.admin.command('ping')
                    logger.debug('Mongo fallback ping successful')
                    MONGO_URI = alt
                else:
                    logger.debug('Mongo URI host is localhost or undefined; no fallback attempted')
            except Exception as me2:
                logger.warning(f"Mongo fallback also failed: {me2}")
    except Exception:
        logger.exception('Failed to create mongo client')

    # expose redis to aggregator module
    try:
        aggregator_mod.redis_pub = app.state.redis_client
    except Exception:
        logger.exception('Failed to set aggregator_mod.redis_pub')

    app.state.queue = asyncio.Queue()

    # start background tasks
    app.state.adapter_task = asyncio.create_task(redis_stream_adapter(app.state.queue, app.state.redis_client))
    app.state.aggregator_task = asyncio.create_task(start_aggregator(app.state.queue, app.state.mongo_client))

    db = app.state.mongo_client.get_database('EreunaDB')
    daily_collection = db.get_collection('OHCLVData')
    weekly_collection = db.get_collection('OHCLVData2')
    app.state.flush_task = asyncio.create_task(flush_daily_weekly_candles_at_market_close(daily_collection, weekly_collection))

    # organizer task to run Daily() 3 hours after market close (23:00 UTC / 7:00 PM ET)
    async def schedule_organizer_daily():
        from datetime import datetime, timedelta, timezone

        def is_trading_day(dt):
            return dt.weekday() < 5

        while True:
            now = datetime.utcnow().replace(tzinfo=timezone.utc)
            # Next run at 23:00 UTC (3 hours after market close at 20:00 UTC)
            next_run = now.replace(hour=23, minute=0, second=0, microsecond=0)
            if now >= next_run or not is_trading_day(now):
                days = 1
                while True:
                    candidate = now + timedelta(days=days)
                    if is_trading_day(candidate):
                        next_run = candidate.replace(hour=20, minute=0, second=0, microsecond=0)
                        break
                    days += 1
            wait = (next_run - now).total_seconds()
            if wait > 0:
                await asyncio.sleep(wait)
            try:
                await Daily()
            except Exception:
                logger.exception('Error running Daily()')

    app.state.organizer_task = asyncio.create_task(schedule_organizer_daily())


# NOTE: debug endpoint removed — use /ready and logs for health info


@app.on_event('shutdown')
async def shutdown():
    logger.info('Aggregator server shutting down')
    # cancel tasks
    tasks = ['adapter_task', 'aggregator_task', 'flush_task', 'organizer_task']
    for name in tasks:
        t = getattr(app.state, name, None)
        if t:
            try:
                t.cancel()
            except Exception:
                pass

    # allow tasks to cancel
    await asyncio.sleep(0)
    # attempt graceful close
    try:
        if getattr(app.state, 'redis_client', None) is not None:
            try:
                await app.state.redis_client.close()
            except Exception:
                pass
    except Exception:
        pass
    try:
        if getattr(app.state, 'mongo_client', None) is not None:
            try:
                app.state.mongo_client.close()
            except Exception:
                pass
    except Exception:
        pass


@app.get('/health')
async def health():
    return {'status': 'ok'}


@app.get('/ready')
async def ready():
    # check redis and mongo connectivity
    ok = {'redis': False, 'mongo': False}
    try:
        if getattr(app.state, 'redis_client', None) is not None:
            try:
                r = await app.state.redis_client.ping()
                ok['redis'] = bool(r)
            except Exception:
                ok['redis'] = False
    except Exception:
        ok['redis'] = False
    try:
        if getattr(app.state, 'mongo_client', None) is not None:
            try:
                await app.state.mongo_client.admin.command('ping')
                ok['mongo'] = True
            except Exception:
                ok['mongo'] = False
    except Exception:
        ok['mongo'] = False
    return ok


@app.get('/metrics')
async def metrics():
    """Prometheus metrics endpoint - basic implementation"""
    return {"status": "ok", "service": "aggregator"}


class IPORequest(BaseModel):
    tickers: list[str]

    @validator('tickers', each_item=True)
    def validate_ticker(cls, v):
        # Only allow uppercase letters, numbers, max 8 chars
        if not re.match(r'^[A-Z0-9\.]{1,8}$', v.upper()):
            raise ValueError(f"Invalid ticker: {v}")
        return v.upper()


@app.post('/admin/add_ipo_ticker')
async def admin_add_ipo_ticker(request, ipo_req: IPORequest):
    API_KEY = os.getenv('VITE_EREUNA_KEY')
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
