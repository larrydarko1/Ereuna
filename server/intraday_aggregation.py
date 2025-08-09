from pymongo import InsertOne
from datetime import timedelta

# Helper for bucket expression in MongoDB aggregation
def get_bucket_expr(minutes):
    return {
        '$toDate': {
            '$subtract': [
                {'$toLong': '$timestamp'},
                {'$mod': [
                    {'$toLong': '$timestamp'},
                    1000 * 60 * minutes
                ]}
            ]
        }
    }

async def aggregate_intraday_candles(db, source_collection, target_collection, interval_minutes):
    print(f"Aggregating {interval_minutes}m candles from 1m data...")
    pipeline = [
        {'$addFields': {'bucket': get_bucket_expr(interval_minutes)}},
        {'$group': {
            '_id': {'tickerID': '$tickerID', 'bucket': '$bucket'},
            'open': {'$first': '$open'},
            'high': {'$max': '$high'},
            'low': {'$min': '$low'},
            'close': {'$last': '$close'},
            'volume': {'$sum': '$volume'},
            'timestamp': {'$first': '$bucket'}
        }},
        {'$sort': {'_id.tickerID': 1, '_id.bucket': 1}}
    ]
    results = [doc async for doc in db[source_collection].aggregate(pipeline)]
    updates = []
    for result in results:
        updates.append(
            InsertOne({
                'tickerID': result['_id']['tickerID'],
                'timestamp': result['timestamp'],
                'open': result['open'],
                'high': result['high'],
                'low': result['low'],
                'close': result['close'],
                'volume': result['volume']
            })
        )
    if updates:
        try:
            result = await db[target_collection].bulk_write(updates)
            print(f"Inserted {result.inserted_count} {interval_minutes}m candles")
        except Exception as e:
            print(f"Error updating {interval_minutes}m candles: {e}")

# 5m candles
async def update5mCandles(db):
    await aggregate_intraday_candles(db, 'OHCLVData1m', 'OHCLVData5m', 5)

# 15m candles
async def update15mCandles(db):
    await aggregate_intraday_candles(db, 'OHCLVData1m', 'OHCLVData15m', 15)

# 30m candles
async def update30mCandles(db):
    await aggregate_intraday_candles(db, 'OHCLVData1m', 'OHCLVData30m', 30)

# 1hr candles
async def update1hrCandles(db):
    await aggregate_intraday_candles(db, 'OHCLVData1m', 'OHCLVData1hr', 60)

