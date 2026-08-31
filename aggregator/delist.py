# Imports and shared variables for standalone and cross-file compatibility
import os
import datetime as dt
import motor.motor_asyncio
from dotenv import load_dotenv

load_dotenv()
mongo_uri = os.getenv('MONGODB_URI')
mongo_client = motor.motor_asyncio.AsyncIOMotorClient(mongo_uri)
db = mongo_client['EreunaDB']

#scans documents for delisted stocks, it removes stocks that have ohclvdata older than 14 days            
async def scanDelisted():
    current_date = dt.datetime.now()
    time_period = dt.timedelta(days=14)
    date_threshold = current_date - time_period
    delisted = []
    asset_info_collection = db['AssetInfo']
    ohclv_data_collection = db['OHCLVData']
    async for stock in asset_info_collection.find({}):
        ticker = stock['Symbol']
        pipeline = [
            {'$match': {'tickerID': ticker}},
            {'$sort': {'timestamp': -1}},
            {'$limit': 1},
            {'$project': {'_id': 0, 'timestamp': 1}}
        ]
        most_recent_timestamp = [doc async for doc in ohclv_data_collection.aggregate(pipeline)]
        if most_recent_timestamp:
            if most_recent_timestamp[0]['timestamp'] < date_threshold:
                delisted.append(ticker)
        else:
            delisted.append(ticker)
    await Delist(delisted)

#removes delisted tickers from the database
async def Delist(delisted):

    asset_info_collection = db['AssetInfo']
    for i, asset in enumerate(delisted):
        try:
            # Set Delisted to True and wipe RSScore1W, RSScore1M, RSScore4M
            await asset_info_collection.update_one(
                {'Symbol': asset},
                {'$set': {
                    'Delisted': True,
                    'RSScore1W': None,
                    'RSScore1M': None,
                    'RSScore4M': None
                }}
            )
        except Exception as e:
            pass
            
async def prune_intraday_collections():
    current_date = dt.datetime.now()
    time_period = dt.timedelta(days=14)
    date_threshold = current_date - time_period

    intraday_collections = [
        'OHCLVData15m',
        'OHCLVData1hr',
        'OHCLVData1m',
        'OHCLVData30m',
        'OHCLVData5m'
    ]

    for collection_name in intraday_collections:
        collection = db[collection_name]
        result = await collection.delete_many({'timestamp': {'$lt': date_threshold}})
        print(f"Pruned {result.deleted_count} documents from {collection_name}")
