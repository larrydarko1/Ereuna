import motor.motor_asyncio
from datetime import datetime, timedelta, timezone
import asyncio

MONGO_URI = 'mongodb://localhost:27017/'
DB_NAME = 'EreunaDB'
COLLECTION_1M = 'OHCLVData1m'
COLLECTION_DAILY = 'OHCLVData'
COLLECTION_WEEKLY = 'OHCLVData2'
INTRADAY_MAP = {
    '5m': ('OHCLVData5m', 5),
    '15m': ('OHCLVData15m', 15),
    '30m': ('OHCLVData30m', 30),
    '1hr': ('OHCLVData1hr', 60)
}

async def recover_all_timeframes(date: datetime):
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    start = date.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
    end = start + timedelta(days=1)
    week_start = start - timedelta(days=start.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    week_end = week_start + timedelta(days=7)

    symbols = await db[COLLECTION_1M].distinct('tickerID', {'timestamp': {'$gte': start, '$lt': end}})
    for symbol in symbols:
        docs = await db[COLLECTION_1M].find({'tickerID': symbol, 'timestamp': {'$gte': start, '$lt': end}}).sort('timestamp', 1).to_list(length=2000)
        if not docs:
            continue
        # --- Daily ---
        daily_candle = {
            'tickerID': symbol,
            'timestamp': start,
            'open': docs[0]['open'],
            'high': max(doc['high'] for doc in docs),
            'low': min(doc['low'] for doc in docs),
            'close': docs[-1]['close'],
            'volume': sum(doc.get('volume', 0) for doc in docs)
        }
        await db[COLLECTION_DAILY].delete_many({'tickerID': symbol, 'timestamp': start})
        await db[COLLECTION_DAILY].insert_one(daily_candle)
        print(f"Rebuilt daily candle for {symbol}")

        # --- Weekly ---
        weekly_doc = await db[COLLECTION_WEEKLY].find_one({'tickerID': symbol, 'timestamp': week_start})
        if weekly_doc:
            weekly_doc['high'] = max(weekly_doc['high'], daily_candle['high'])
            weekly_doc['low'] = min(weekly_doc['low'], daily_candle['low'])
            weekly_doc['close'] = daily_candle['close']
            weekly_doc['volume'] += daily_candle['volume']
            await db[COLLECTION_WEEKLY].delete_many({'tickerID': symbol, 'timestamp': week_start})
            await db[COLLECTION_WEEKLY].insert_one(weekly_doc)
            print(f"Updated weekly candle for {symbol}")
        else:
            weekly_candle = daily_candle.copy()
            weekly_candle['timestamp'] = week_start
            await db[COLLECTION_WEEKLY].insert_one(weekly_candle)
            print(f"Created new weekly candle for {symbol}")

        # --- Intraday timeframes ---
        for tf, (coll_name, minutes) in INTRADAY_MAP.items():
            buckets = {}
            for doc in docs:
                ts = doc['timestamp']
                bucket_start = ts.replace(second=0, microsecond=0)
                bucket_start = bucket_start - timedelta(minutes=bucket_start.minute % minutes)
                key = bucket_start
                if key not in buckets:
                    buckets[key] = {
                        'tickerID': symbol,
                        'timestamp': key,
                        'open': doc['open'],
                        'high': doc['high'],
                        'low': doc['low'],
                        'close': doc['close'],
                        'volume': doc.get('volume', 0)
                    }
                else:
                    b = buckets[key]
                    b['high'] = max(b['high'], doc['high'])
                    b['low'] = min(b['low'], doc['low'])
                    b['close'] = doc['close']
                    b['volume'] += doc.get('volume', 0)
            candles = list(buckets.values())
            await db[coll_name].delete_many({'tickerID': symbol, 'timestamp': {'$gte': start, '$lt': end}})
            if candles:
                await db[coll_name].insert_many(candles)
            print(f"Rebuilt {tf} candles for {symbol}: {len(candles)}")
    print("Recovery complete.")

if __name__ == "__main__":
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
    asyncio.run(recover_all_timeframes(today))
