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
    ohclv_data_collection = db['OHCLVData']
    ohclv_data_collection2 = db['OHCLVData2']
    notes_collection = db['Notes']
    users_collection = db['Users']
    watchlists_collection = db['Watchlists']
    print("Deleting documents from collections...")
    for i, asset in enumerate(delisted):
        try:
            await asset_info_collection.delete_one({'Symbol': asset})
            await ohclv_data_collection.delete_many({'tickerID': asset})
            await ohclv_data_collection2.delete_many({'tickerID': asset})
            await notes_collection.delete_many({'Symbol': asset})
            await users_collection.update_many({}, {'$pull': {'Hidden': asset}})
            await watchlists_collection.update_many({}, {'$pull': {'List': asset}})
            print(f"Processed {i+1} out of {len(delisted)} assets")
        except Exception as e:
            print(f"Error processing {asset}: {e}")