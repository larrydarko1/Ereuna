import asyncio
import os
import logging
import signal

from redis.asyncio import from_url as redis_from_url
import motor.motor_asyncio

from server.aggregator import aggregator as aggregator_mod
from server.aggregator.aggregator import (
    start_aggregator,
    flush_daily_weekly_candles_at_market_close,
    redis_stream_adapter
)
from server.aggregator.organizer import Daily

async def schedule_organizer_daily():
    """Run organizer.Daily() once at each market close (20:00 UTC)."""
    from datetime import datetime, timedelta, timezone
    def is_trading_day(dt):
        return dt.weekday() < 5

    while True:
        now = datetime.utcnow().replace(tzinfo=timezone.utc)
        # Next run at 20:00 UTC today or next trading day
        next_run = now.replace(hour=20, minute=0, second=0, microsecond=0)
        if now >= next_run or not is_trading_day(now):
            # find next trading day
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
        except Exception as e:
            logger = logging.getLogger('aggregator_entry')
            logger.exception(f'Error running Daily(): {e}')

logger = logging.getLogger('aggregator_entry')

async def main():
    REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    MONGO_URI = os.getenv('MONGO_URI', 'mongodb://mongodb:27017/')

    # Create redis and mongo clients
    redis_client = redis_from_url(REDIS_URL)
    mongo_client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)

    # Expose redis client to aggregator module so it can publish aggregated candles
    try:
        aggregator_mod.redis_pub = redis_client
    except Exception:
        logger.exception('Failed to assign redis_pub to aggregator module')

    queue = asyncio.Queue()

    # Start adapter to read from Redis stream into queue
    adapter_task = asyncio.create_task(redis_stream_adapter(queue, redis_client))

    # Start aggregator and flush tasks
    aggregator_task = asyncio.create_task(start_aggregator(queue, mongo_client))

    db = mongo_client.get_database('EreunaDB')
    daily_collection = db.get_collection('OHCLVData')
    weekly_collection = db.get_collection('OHCLVData2')
    flush_task = asyncio.create_task(flush_daily_weekly_candles_at_market_close(daily_collection, weekly_collection))
    organizer_task = asyncio.create_task(schedule_organizer_daily())

    # Graceful shutdown
    async def _shutdown():
        logger.info('Shutting down aggregator...')
        adapter_task.cancel()
        aggregator_task.cancel()
        flush_task.cancel()
        organizer_task.cancel()
        await asyncio.gather(adapter_task, aggregator_task, flush_task, return_exceptions=True)
        try:
            await redis_client.close()
        except Exception:
            pass
        mongo_client.close()

    loop = asyncio.get_event_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, lambda: asyncio.create_task(_shutdown()))

    await asyncio.gather(adapter_task, aggregator_task, flush_task)

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
