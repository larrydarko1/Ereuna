"""
Organizer entry point — the nightly run.

One job, on a clock: three hours after the closing bell, rebuild everything that
is derived rather than streamed. Prices and fundamentals are fetched, splits and
dividends applied, technical scores, market statistics and intrinsic values
recomputed. It runs every day including weekends, because `Daily()` decides for
itself which parts apply on a non-trading day.

There is no HTTP interface. The service it replaced exposed one only to hold a
health probe and an `/admin/add_ipo_ticker` route that authenticated with a key
compiled into the browser bundle — which is to say, with a public string. Adding
a listing is now `python -m organizer.ipo SYMBOL`, run by whoever has a shell.

This is the last Python left in the repo, and it is next to be translated.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from organizer.organizer import Daily

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(name)s %(message)s')
logger = logging.getLogger('organizer')

EASTERN = ZoneInfo('America/New_York')
RUN_HOUR_ET = 19  # Three hours after the 16:00 close, so late prints have settled


def seconds_until_next_run(now=None):
    """How long until the next 19:00 Eastern. Resolved through the timezone
    itself rather than a fixed UTC hour, which is only right for seven months
    of the year."""
    now = now or datetime.now(EASTERN)
    next_run = now.replace(hour=RUN_HOUR_ET, minute=0, second=0, microsecond=0)
    if now >= next_run:
        next_run += timedelta(days=1)
    return (next_run - now).total_seconds()


async def main():
    logger.info('Organizer started')
    while True:
        wait = seconds_until_next_run()
        logger.info(f'Next run in {wait / 3600:.2f} hours')
        await asyncio.sleep(wait)
        try:
            await Daily()
        except Exception:
            logger.exception('Nightly run failed')


if __name__ == '__main__':
    asyncio.run(main())
