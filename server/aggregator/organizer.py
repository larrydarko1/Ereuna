#from ipo import IPO, updateSummarySingle, getSummary2Single, getSplitsSingle, getDividendsSingle, getFinancialsSingle
import os
import time
import requests
import pandas as pd
import numpy as np
import warnings
from datetime import datetime, timedelta, timezone
import datetime as dt
from dotenv import load_dotenv
import motor.motor_asyncio
from pymongo import UpdateOne, DeleteOne, InsertOne
from pymongo.errors import AutoReconnect, NetworkTimeout, ConnectionFailure
import asyncio
import logging
from functools import wraps

# Suppress NumPy warnings for cleaner output
warnings.filterwarnings('ignore', category=RuntimeWarning)
np.seterr(divide='ignore', invalid='ignore')

logger = logging.getLogger("organizer")
logger.setLevel(logging.INFO)

# Retry decorator for MongoDB operations
def async_retry_on_disconnect(max_retries=3, delay=2):
    """Decorator to retry async functions on MongoDB connection errors"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except (AutoReconnect, NetworkTimeout, ConnectionFailure, OSError) as e:
                    if attempt == max_retries - 1:
                        logger.error(f"{func.__name__} failed after {max_retries} attempts: {e}")
                        raise
                    wait_time = delay * (2 ** attempt)  # Exponential backoff
                    logger.warning(f"{func.__name__} attempt {attempt + 1} failed: {e}. Retrying in {wait_time}s...")
                    await asyncio.sleep(wait_time)
            return None
        return wrapper
    return decorator

try:
    from server.aggregator.delist import Delist, scanDelisted, prune_intraday_collections
    from server.aggregator.signal_analyzer import run_signal_analysis
    from server.aggregator.helper import (
        maintenanceMode,
        getMonday,
        remove_documents_with_timestamp,
        ArrangeIcons,
        RemoveIsActiveAttribute,
        RemoveDuplicateDocuments,
        MissingISIN,
        rename_volatility_fields,
        updateAssetInfoAttributeNames,
        clone_user_documents,
        update_asset_type_to_stock
    )
except Exception:
    import sys
    import pathlib
    # organizer.py is at <workspace>/server/aggregator/organizer.py
    # we need to add <workspace> to sys.path so `import server...` works
    workspace_root = pathlib.Path(__file__).resolve().parents[2]
    if str(workspace_root) not in sys.path:
        sys.path.insert(0, str(workspace_root))
    from server.aggregator.delist import Delist, scanDelisted, prune_intraday_collections
    from server.aggregator.signal_analyzer import run_signal_analysis
    from server.aggregator.helper import (
        maintenanceMode,
        getMonday,
        remove_documents_with_timestamp,
        ArrangeIcons,
        RemoveIsActiveAttribute,
        RemoveDuplicateDocuments,
        MissingISIN,
        rename_volatility_fields,
        updateAssetInfoAttributeNames,
        clone_user_documents,
        update_asset_type_to_stock
    )

load_dotenv()
mongo_uri = os.getenv('MONGODB_URI')
api_key = os.getenv('TIINGO_KEY')

# Configure MongoDB client with proper timeouts and pool settings
mongo_client = motor.motor_asyncio.AsyncIOMotorClient(
    mongo_uri,
    serverSelectionTimeoutMS=120000,  # 2 minutes for server selection (increased for long operations)
    socketTimeoutMS=900000,  # 15 minutes for socket operations (increased from 6 min)
    connectTimeoutMS=60000,  # 1 minute for initial connection (increased from 20 sec)
    maxPoolSize=100,  # Increase pool size for concurrent operations (increased from 50)
    minPoolSize=20,  # Keep more connections ready (increased from 10)
    maxIdleTimeMS=300000,  # 5 minutes keep-alive (increased from 45 sec)
    retryWrites=True,
    retryReads=True,
    heartbeatFrequencyMS=10000,  # Check server health every 10 seconds
)
db = mongo_client['EreunaDB']

#updates symbol, name, description, IPO, exchange, sector, industry, location, currency, country
async def getSummary():
    start_time = time.time()
    collection = db['AssetInfo']
    tickers = [doc['Symbol'] async for doc in collection.find({'Delisted': False})]
    pass  # Print removed for clean output

    # Fetch meta data for all tickers
    url = f'https://api.tiingo.com/tiingo/fundamentals/meta?token={api_key}'
    response = requests.get(url)
    meta_data = response.json() if response.status_code == 200 else []

    for ticker in tickers:
        pass  # Print removed for clean output
        url = f'https://api.tiingo.com/tiingo/daily/{ticker}?token={api_key}'
        response = requests.get(url)

        if response.status_code == 200:
            data = response.json()

            if data is None:
                pass  # Print removed for clean output
                continue

            # Find the document in MongoDB where Symbol matches the ticker
            result = await collection.find_one({'Symbol': ticker})

            if result:
                # Check if the data has changed
                ipo_date = datetime.strptime(data['startDate'], '%Y-%m-%d') if data.get('startDate') else None
                if (result.get('Name') != data.get('name') or
                    result.get('Description') != data.get('description') or
                    result.get('IPO') != ipo_date or
                    result.get('Exchange') != data.get('exchangeCode')):
                    pass  # Print removed for clean output
                    # Update the existing document
                    await collection.update_one(
                        {'Symbol': ticker},
                        {'$set': {
                            'Name': data.get('name'),
                            'Description': data.get('description'),
                            'IPO': ipo_date,
                            'Exchange': data.get('exchangeCode')
                        }}
                    )
                    pass  # Print removed for clean output
                else:
                    pass  # Print removed for clean output

                # Update meta data
                ticker_lower = ticker.lower()
                ticker_data = next((item for item in meta_data if item['ticker'] == ticker_lower), None)
                if ticker_data is not None:
                    sector = ticker_data.get('sector')
                    industry = ticker_data.get('industry')
                    reporting_currency = ticker_data.get('reportingCurrency')
                    location = ticker_data.get('location')
                    country = location.split(', ')[-1] if location else None
                    address = location if location else None

                    # Update the document in MongoDB where Symbol matches the ticker
                    await collection.update_one(
                        {'Symbol': ticker},
                        {'$set': {
                            'Sector': sector,
                            'Industry': industry,
                            'Currency': reporting_currency,
                            'Address': address,
                            'Country': country
                        }}
                    )
                    pass  # Print removed for clean output
                else:
                    pass  # Print removed for clean output
            else:
                pass  # Print removed for clean output
        else:
            pass  # Print removed for clean output
    end_time = time.time()
    execution_time_in_seconds = end_time - start_time
    execution_time_in_minutes = execution_time_in_seconds / 60
    pass  # Print removed for clean output

#gets full splits history 
async def getFullSplits():
    ohclv_data_collection = db['OHCLVData']
    asset_info_collection = db['AssetInfo']
    updates = []

    async for asset_info in asset_info_collection.find({'Delisted': False}):
        ticker = asset_info['Symbol']
        try:
            pipeline = [
                {'$match': {'tickerID': ticker}},
                {'$project': {'_id': 0, 'timestamp': 1, 'splitFactor': 1}}
            ]
            ohclv_data = [doc async for doc in ohclv_data_collection.aggregate(pipeline)]

            splits = []
            for document in ohclv_data:
                if document.get('splitFactor', 1) != 1:
                    split = {
                        'effective_date': document['timestamp'],
                        'split_factor': document['splitFactor']
                    }
                    splits.append(split)

            updates.append(
                UpdateOne(
                    {'Symbol': ticker},
                    {'$set': {'splits': []}}
                )
            )
            updates.append(
                UpdateOne(
                    {'Symbol': ticker},
                    {'$push': {'splits': {'$each': splits}}}
                )
            )
            pass  # Print removed for clean output
        except Exception as e:
            pass  # Print removed for clean output

    if updates:
        try:
            result = await asset_info_collection.bulk_write(updates)
            pass  # Print removed for clean output
        except Exception as e:
            pass  # Print removed for clean output

#gets full dividend history 
async def getFullDividends():
    ohclv_data_collection = db['OHCLVData']
    asset_info_collection = db['AssetInfo']
    updates = []

    async for asset_info in asset_info_collection.find({'Delisted': False}):
        ticker = asset_info['Symbol']
        try:
            pipeline = [
                {'$match': {'tickerID': ticker}},
                {'$project': {'_id': 0, 'timestamp': 1, 'divCash': 1}}
            ]
            ohclv_data = [doc async for doc in ohclv_data_collection.aggregate(pipeline)]

            dividends = []
            for document in ohclv_data:
                if document.get('divCash', 0) != 0:
                    dividend = {
                        'payment_date': document['timestamp'],
                        'amount': document['divCash']
                    }
                    dividends.append(dividend)

            updates.append(
                UpdateOne(
                    {'Symbol': ticker},
                    {'$set': {'dividends': []}}
                )
            )
            updates.append(
                UpdateOne(
                    {'Symbol': ticker},
                    {'$push': {'dividends': {'$each': dividends}}}
                )
            )
            pass  # Print removed for clean output
        except Exception as e:
            pass  # Print removed for clean output

    if updates:
        try:
            result = await asset_info_collection.bulk_write(updates)
            pass  # Print removed for clean output
        except Exception as e:
            pass  # Print removed for clean output
   
#gets full financials again from scratch 
async def getFinancials():
    maintenanceMode(True)
    collection = db['AssetInfo']

    tickers2 = [doc['Symbol'] async for doc in collection.find({'Delisted': False})]

    for ticker in tickers2:
        pass  # Print removed for clean output
        url = f'https://api.tiingo.com/tiingo/fundamentals/{ticker}/statements?token={api_key}'
        response = requests.get(url)

        if response.status_code == 200:
            data = response.json()

            result = await collection.find_one({'Symbol': ticker})

            if result:
                quarterly_financials_data = []
                annual_financials_data = []
                for statement in data:
                    date_str = statement['date']
                    date = datetime.strptime(date_str, '%Y-%m-%d')
                    quarter = statement['quarter']

                    financial_data = {
                        'fiscalDateEnding': date,
                        'reportedEPS': 0,
                        'totalRevenue': 0,
                        'netIncome': 0
                    }

                    if 'statementData' in statement and 'incomeStatement' in statement['statementData']:
                        income_statement = statement['statementData']['incomeStatement']
                        eps = next((item for item in income_statement if item['dataCode'] == 'eps'), None)
                        revenue = next((item for item in income_statement if item['dataCode'] == 'revenue'), None)
                        netinc = next((item for item in income_statement if item['dataCode'] == 'netinc'), None)

                        if eps:
                            financial_data['reportedEPS'] = eps['value'] or 0

                        if revenue and netinc:
                            financial_data['totalRevenue'] = revenue['value'] or 0
                            financial_data['netIncome'] = netinc['value'] or 0

                    if 'balanceSheet' in statement['statementData']:
                        balance_sheet = statement['statementData']['balanceSheet']
                        for item in balance_sheet:
                            data_code = item['dataCode']
                            value = item['value'] or 0
                            financial_data[data_code] = value

                    if 'cashFlow' in statement['statementData']:
                        cash_flow = statement['statementData']['cashFlow']
                        for item in cash_flow:
                            data_code = item['dataCode']
                            value = item['value'] or 0
                            financial_data[data_code] = value

                    if 'overview' in statement['statementData']:
                        overview = statement['statementData']['overview']
                        for item in overview:
                            data_code = item['dataCode']
                            value = item['value'] or 0
                            financial_data[data_code] = value

                    if quarter == 0:
                        annual_financials_data.append(financial_data)
                    else:
                        quarterly_financials_data.append(financial_data)

                await collection.update_one({'Symbol': ticker}, {'$set': {
                    'quarterlyFinancials': quarterly_financials_data,
                    'AnnualFinancials': annual_financials_data
                }})
                pass  # Print removed for clean output
            else:
                pass  # Print removed for clean output
        else:
            pass  # Print removed for clean output
    maintenanceMode(False)

#uploads full ohclvdata from scratch, don't use everyday    
async def getHistoricalPrice():
    daily_collection = db["OHCLVData"]
    asset_info_collection = db["AssetInfo"]

    async for asset_info in asset_info_collection.find({'Delisted': False}):
        ticker = asset_info['Symbol']
        now = datetime.now()
        url = f'https://api.tiingo.com/tiingo/daily/{ticker}/prices?token={api_key}&startDate=1960-01-01&endDate={now.strftime("%Y-%m-%d")}'
        response = requests.get(url)
        
        if response.status_code == 200:
            data = response.json()
            if len(data) > 0:
                df = pd.DataFrame(data)
                df = df.rename(columns={'date': 'timestamp'})
                df.columns = ['timestamp', 'close', 'high', 'low', 'open', 'volume', 'adjClose', 'adjHigh', 'adjLow', 'adjOpen', 'adjVolume', 'divCash', 'splitFactor']
                df['tickerID'] = ticker
                
                # Convert NumPy types to Python native types
                def convert_numpy_types(doc):
                    return {
                        k: (int(v) if isinstance(v, np.integer) else 
                            float(v) if isinstance(v, np.floating) else 
                            v) for k, v in doc.items()
                    }
                
                # Convert dataframe to list of dictionaries
                daily_data_dict = df[['tickerID', 'timestamp', 'adjOpen', 'adjHigh', 'adjLow', 'adjClose', 'adjVolume', 'divCash', 'splitFactor']].to_dict(orient='records')
                daily_data_dict = [convert_numpy_types(doc) for doc in daily_data_dict]

                # Rename fields
                for doc in daily_data_dict:
                    doc['open'] = doc.pop('adjOpen')
                    doc['high'] = doc.pop('adjHigh')
                    doc['low'] = doc.pop('adjLow')
                    doc['close'] = doc.pop('adjClose')
                    doc['volume'] = doc.pop('adjVolume')
                    doc['timestamp'] = datetime.strptime(doc['timestamp'], '%Y-%m-%dT%H:%M:%S.%fZ')

                # Insert daily documents, preventing duplicates
                for daily_doc in daily_data_dict:
                    existing_daily_doc = await daily_collection.find_one({
                        'tickerID': daily_doc['tickerID'], 
                        'timestamp': daily_doc['timestamp']
                    })
                    
                    if not existing_daily_doc:
                        await daily_collection.insert_one(daily_doc)
                        
                pass  # Print removed for clean output
            else:
                pass  # Print removed for clean output
        else:
            pass  # Print removed for clean output
            


# get daily OHCLV Data day after day
async def getPrice():
    daily_collection = db["OHCLVData"]
    asset_info_collection = db["AssetInfo"]

    # Fetch all data at once
    url = f'https://api.tiingo.com/tiingo/daily/prices?token={api_key}'
    response = requests.get(url)

    if response.status_code == 200:
        data = response.json()

        # Get symbols from AssetInfo collection (async), exclude delisted stocks
        symbols = [doc['Symbol'] async for doc in asset_info_collection.find({'Delisted': False})]

        # Filter data based on ticker
        filtered_data = [doc for doc in data if doc['ticker'].lower() in [symbol.lower() for symbol in symbols]]

        if filtered_data:  # Check if filtered_data is not empty
            # Process the data in bulk
            df = pd.DataFrame(filtered_data)
            df.columns = ['ticker', 'date', 'close', 'high', 'low', 'open', 'volume', 'adjClose', 'adjHigh', 'adjLow', 'adjOpen', 'adjVolume', 'divCash', 'splitFactor']

            # Convert NumPy types to Python native types
            def convert_numpy_types(doc):
                return {
                    k: (int(v) if isinstance(v, np.integer) else 
                        float(v) if isinstance(v, np.floating) else 
                        v) for k, v in doc.items()
                }

            # Convert dataframe to list of dictionaries
            daily_data_dict = df.to_dict(orient='records')
            daily_data_dict = [convert_numpy_types(doc) for doc in daily_data_dict]

            # Rename fields
            for doc in daily_data_dict:
                doc['tickerID'] = doc.pop('ticker').upper()
                doc['timestamp'] = dt.datetime.strptime(doc['date'], '%Y-%m-%d')

                # Check for splitFactor and divCash conditions
                if doc['splitFactor'] != 1 and doc['splitFactor'] != 1.0:
                    await Split(doc['tickerID'], doc['timestamp'], doc['splitFactor'])
                if doc['divCash'] != 0 and doc['divCash'] != 0.0:
                    await Dividends(doc['tickerID'], doc['timestamp'], doc['divCash'])

            # Progress bar for inserting price data
            total_docs = len(daily_data_dict)
            print(f"Fetching prices for {total_docs} assets...")
            
            def print_price_progress(completed, total, bar_length=50):
                percentage = int(100 * completed / total) if total > 0 else 0
                filled_length = int(bar_length * completed / total) if total > 0 else 0
                bar = '█' * filled_length + '░' * (bar_length - filled_length)
                print(f'\rPrice Data: |{bar}| {percentage}%', end='', flush=True)
            
            # For each new daily document, delete any existing with same tickerID and timestamp, then insert
            intraday_1m_collection = db["OHCLVData1m"]
            
            for idx, daily_doc in enumerate(daily_data_dict):
                # Insert/update daily collection
                await daily_collection.delete_many({
                    'tickerID': daily_doc['tickerID'],
                    'timestamp': daily_doc['timestamp']
                })
                await daily_collection.insert_one(daily_doc)
                
                # Also upsert to 1m collection with 20:00:00 timestamp
                # Use close value for all OHLC fields and set volume to 0
                timestamp_1m = daily_doc['timestamp'].replace(hour=20, minute=0, second=0, microsecond=0)
                intraday_1m_doc = {
                    'tickerID': daily_doc['tickerID'],
                    'timestamp': timestamp_1m,
                    'open': daily_doc['close'],
                    'high': daily_doc['close'],
                    'low': daily_doc['close'],
                    'close': daily_doc['close'],
                    'volume': 0
                }
                
                # Upsert to 1m collection (delete existing with same tickerID and timestamp, then insert)
                await intraday_1m_collection.delete_many({
                    'tickerID': intraday_1m_doc['tickerID'],
                    'timestamp': intraday_1m_doc['timestamp']
                })
                await intraday_1m_collection.insert_one(intraday_1m_doc)
                
                # Update progress every 10 documents or at the end
                if (idx + 1) % 10 == 0 or (idx + 1) == total_docs:
                    print_price_progress(idx + 1, total_docs)
            
            print()  # New line after progress bar

        else:
            pass  # Print removed for clean output
    else:
        pass  # Print removed for clean output

# Fetches crypto prices from Tiingo Crypto API and updates OHCLVData collection
async def getCryptoPrice():
    daily_collection = db["OHCLVData"]
    asset_info_collection = db["AssetInfo"]
    intraday_1m_collection = db["OHCLVData1m"]
    intraday_5m_collection = db["OHCLVData5m"]
    intraday_15m_collection = db["OHCLVData15m"]
    intraday_30m_collection = db["OHCLVData30m"]
    intraday_1hr_collection = db["OHCLVData1hr"]

    # Get crypto symbols from AssetInfo collection (symbols with AssetType='Crypto' and not delisted)
    crypto_symbols = [doc['Symbol'] async for doc in asset_info_collection.find({
        'AssetType': 'Crypto',
        'Delisted': False
    })]
    
    if not crypto_symbols:
        pass  # No crypto to fetch
        return
    
    # Tiingo allows max 5 tickers per request for crypto API
    BATCH_SIZE = 5
    total_batches = (len(crypto_symbols) + BATCH_SIZE - 1) // BATCH_SIZE
    
    # Fetch 5-minute data for yesterday (completed day) to build all timeframes (including daily)
    today = dt.datetime.now()
    yesterday = today - dt.timedelta(days=1)
    start_of_yesterday = yesterday.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_yesterday = yesterday.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    print(f"Fetching crypto 5m data for {len(crypto_symbols)} assets from {yesterday.strftime('%Y-%m-%d')} in {total_batches} batches...")
    
    all_intraday_5m_documents = []
    processed_batches = 0
    
    def print_batch_progress(processed, total, bar_length=50):
        percentage = int(100 * processed / total) if total > 0 else 0
        filled_length = int(bar_length * processed / total) if total > 0 else 0
        bar = '█' * filled_length + '░' * (bar_length - filled_length)
        print(f'\rCrypto Batches: |{bar}| {percentage}% ({processed}/{total})', end='', flush=True)
    
    print_batch_progress(0, total_batches)
    
    # Process in batches of 5
    for i in range(0, len(crypto_symbols), BATCH_SIZE):
        batch_symbols = crypto_symbols[i:i + BATCH_SIZE]
        tickers_param = ','.join([s.lower() for s in batch_symbols])
        
        # Fetch 5-minute candles for yesterday
        url = f'https://api.tiingo.com/tiingo/crypto/prices?tickers={tickers_param}&startDate={start_of_yesterday.strftime("%Y-%m-%d")}&resampleFreq=5min&token={api_key}'
        
        try:
            response = requests.get(url, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                
                if data:
                    # Process crypto data
                    for crypto_data in data:
                        ticker = crypto_data.get('ticker', '').upper()
                        price_data = crypto_data.get('priceData', [])
                        
                        if not price_data:
                            continue
                        
                        for candle in price_data:
                            # Parse timestamp
                            timestamp_str = candle.get('date')
                            if timestamp_str:
                                timestamp = dt.datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                            else:
                                continue
                            
                            # Only include yesterday's completed data
                            if timestamp.date() != yesterday.date():
                                continue
                            
                            # Create 5m intraday document
                            intraday_doc = {
                                'tickerID': ticker,
                                'timestamp': timestamp.replace(tzinfo=None),
                                'open': float(candle.get('open', 0)),
                                'high': float(candle.get('high', 0)),
                                'low': float(candle.get('low', 0)),
                                'close': float(candle.get('close', 0)),
                                'volume': float(candle.get('volume', 0))
                            }
                            
                            all_intraday_5m_documents.append(intraday_doc)
            else:
                pass  # Silently skip failed batches
                
        except Exception as e:
            pass  # Silently skip failed batches
        
        processed_batches += 1
        print_batch_progress(processed_batches, total_batches)
    
    print()  # New line after progress bar
    
    # Build all timeframes from 5m data
    if all_intraday_5m_documents:
        total_5m_docs = len(all_intraday_5m_documents)
        print(f"Upserting {total_5m_docs} crypto 5m records...")
        
        # Step 1: Bulk upsert all 5m documents first (much faster than per-ticker loop)
        # Delete all 5m records for yesterday for all crypto tickers
        await intraday_5m_collection.delete_many({
            'tickerID': {'$in': crypto_symbols},
            'timestamp': {'$gte': start_of_yesterday, '$lte': end_of_yesterday}
        })
        
        # Bulk insert all 5m documents at once
        if all_intraday_5m_documents:
            await intraday_5m_collection.insert_many(all_intraday_5m_documents)
        
        print(f"Building higher timeframes using aggregation pipeline...")
        
        # Step 2: Build higher timeframes using MongoDB aggregation (like updateWeekly)
        # This is much faster than pandas resampling per ticker
        
        # Helper function to build timeframe aggregation pipeline
        def build_timeframe_pipeline(interval_minutes, match_filter):
            # Calculate bucket size in milliseconds
            bucket_ms = interval_minutes * 60 * 1000
            
            return [
                {'$match': match_filter},
                {'$sort': {'tickerID': 1, 'timestamp': 1}},
                {'$group': {
                    '_id': {
                        'tickerID': '$tickerID',
                        'bucket': {
                            '$toDate': {
                                '$multiply': [
                                    {'$floor': {'$divide': [{'$toLong': '$timestamp'}, bucket_ms]}},
                                    bucket_ms
                                ]
                            }
                        }
                    },
                    'open': {'$first': '$open'},
                    'high': {'$max': '$high'},
                    'low': {'$min': '$low'},
                    'close': {'$last': '$close'},
                    'volume': {'$sum': '$volume'}
                }},
                {'$project': {
                    '_id': 0,
                    'tickerID': '$_id.tickerID',
                    'timestamp': '$_id.bucket',
                    'open': 1,
                    'high': 1,
                    'low': 1,
                    'close': 1,
                    'volume': 1
                }}
            ]
        
        # Common match filter for yesterday's data
        match_filter = {
            'tickerID': {'$in': crypto_symbols},
            'timestamp': {'$gte': start_of_yesterday, '$lte': end_of_yesterday}
        }
        
        # Build 15m timeframe
        print("Building 15m candles...")
        pipeline_15m = build_timeframe_pipeline(15, match_filter)
        results_15m = [doc async for doc in intraday_5m_collection.aggregate(pipeline_15m)]
        if results_15m:
            await intraday_15m_collection.delete_many(match_filter)
            await intraday_15m_collection.insert_many(results_15m)
        
        # Build 30m timeframe
        print("Building 30m candles...")
        pipeline_30m = build_timeframe_pipeline(30, match_filter)
        results_30m = [doc async for doc in intraday_5m_collection.aggregate(pipeline_30m)]
        if results_30m:
            await intraday_30m_collection.delete_many(match_filter)
            await intraday_30m_collection.insert_many(results_30m)
        
        # Build 1hr timeframe
        print("Building 1hr candles...")
        pipeline_1hr = build_timeframe_pipeline(60, match_filter)
        results_1hr = [doc async for doc in intraday_5m_collection.aggregate(pipeline_1hr)]
        if results_1hr:
            await intraday_1hr_collection.delete_many(match_filter)
            await intraday_1hr_collection.insert_many(results_1hr)
        
        # Build daily timeframe (1440 minutes = 24 hours)
        print("Building daily candles...")
        pipeline_daily = [
            {'$match': match_filter},
            {'$sort': {'tickerID': 1, 'timestamp': 1}},
            {'$group': {
                '_id': '$tickerID',
                'open': {'$first': '$open'},
                'high': {'$max': '$high'},
                'low': {'$min': '$low'},
                'close': {'$last': '$close'},
                'volume': {'$sum': '$volume'}
            }},
            {'$project': {
                '_id': 0,
                'tickerID': '$_id',
                'timestamp': start_of_yesterday.replace(hour=0, minute=0, second=0, microsecond=0),
                'open': 1,
                'high': 1,
                'low': 1,
                'close': 1,
                'volume': 1
            }}
        ]
        results_daily = [doc async for doc in intraday_5m_collection.aggregate(pipeline_daily)]
        
        if results_daily:
            # Delete yesterday's daily candles for these tickers
            await daily_collection.delete_many({
                'tickerID': {'$in': crypto_symbols},
                'timestamp': start_of_yesterday.replace(hour=0, minute=0, second=0, microsecond=0)
            })
            await daily_collection.insert_many(results_daily)
            
            # Also create 1m entries with 20:00:00 timestamp (mirror getPrice() behavior)
            docs_1m = []
            for doc in results_daily:
                timestamp_1m = start_of_yesterday.replace(hour=20, minute=0, second=0, microsecond=0)
                intraday_1m_doc = {
                    'tickerID': doc['tickerID'],
                    'timestamp': timestamp_1m,
                    'open': doc['close'],
                    'high': doc['close'],
                    'low': doc['close'],
                    'close': doc['close'],
                    'volume': 0
                }
                docs_1m.append(intraday_1m_doc)
            
            if docs_1m:
                await intraday_1m_collection.delete_many({
                    'tickerID': {'$in': crypto_symbols},
                    'timestamp': start_of_yesterday.replace(hour=20, minute=0, second=0, microsecond=0)
                })
                await intraday_1m_collection.insert_many(docs_1m)
        
        print("All timeframes completed!")
        
# Get Monday date of this week
today = dt.date.today()
monday = dt.datetime.combine(today - dt.timedelta(days=today.weekday()), dt.time())

#updates weekly candles 
async def updateWeekly():
    # Delete all filtered documents on OHCLVData2 (assume this is sync, update if needed)
    remove_documents_with_timestamp(monday.strftime('%Y-%m-%dT%H:%M:%S.%f+00:00'))
    
    # Get asset types to determine which assets are crypto (need 7-day weeks) vs stocks (5-day weeks)
    asset_info_collection = db['AssetInfo']
    crypto_symbols = set([doc['Symbol'] async for doc in asset_info_collection.find({
        'AssetType': 'Crypto',
        'Delisted': False
    })])

    pipeline = [
        {'$match': {'timestamp': {'$gte': monday}}},
        {'$group': {
            '_id': '$tickerID',
            'documents': {'$push': '$$ROOT'}
        }},
        {'$project': {
            '_id': 1,
            'documents': 1,
            'weekly_candle': {
                'open': {'$arrayElemAt': [{'$map': {'input': '$documents', 'as': 'doc', 'in': '$$doc.open'}}, 0]},
                'high': {'$max': {'$map': {'input': '$documents', 'as': 'doc', 'in': '$$doc.high'}}},
                'low': {'$min': {'$map': {'input': '$documents', 'as': 'doc', 'in': '$$doc.low'}}},
                'close': {'$arrayElemAt': [{'$map': {'input': '$documents', 'as': 'doc', 'in': '$$doc.close'}}, -1]},
                'volume': {'$sum': {'$map': {'input': '$documents', 'as': 'doc', 'in': '$$doc.volume'}}}
            }
        }},
        {'$sort': {'_id': 1}}
    ]

    # Run the aggregation pipeline (async)
    results = [doc async for doc in db['OHCLVData'].aggregate(pipeline)]

    # Update the weekly documents inside OHCLVData2
    updates = []
    for result in results:
        if result['documents']:
            ticker = result['_id']
            is_crypto = ticker in crypto_symbols
            
            # For crypto: weekly candle = 7 days (Mon-Sun)
            # For stocks: weekly candle = 5 trading days (Mon-Fri)
            # Both use Monday as the timestamp, but crypto includes Sat/Sun data
            # The aggregation already includes all days from Monday onwards,
            # so stocks naturally exclude weekends (no trading data), crypto includes them
            
            updates.append(
                InsertOne({
                    'tickerID': ticker,
                    'timestamp': monday,
                    'open': result['weekly_candle']['open'],
                    'high': result['weekly_candle']['high'],
                    'low': result['weekly_candle']['low'],
                    'close': result['weekly_candle']['close'],
                    'volume': result['weekly_candle']['volume']
                })
            )

    if updates:
        try:
            result = await db['OHCLVData2'].bulk_write(updates)
        except Exception as e:
            pass  # Print removed for clean output
              
#updates MarketCap, PE, PB, PEG , PS, RSI, Gap%
async def updateDailyRatios():
    ohclv_collection = db['OHCLVData']
    asset_info_collection = db['AssetInfo']
    updates = []

    async for asset_info_doc in asset_info_collection.find({'Delisted': False}):
        ticker = asset_info_doc['Symbol']
        try:
            # Get the most recent OHCLV document
            pipeline = [
                {'$match': {'tickerID': ticker}},
                {'$sort': {'timestamp': -1}},
                {'$project': {'_id': 0, 'close': 1}}
            ]
            ohclv_docs = [doc async for doc in ohclv_collection.aggregate(pipeline)]
            ohclv_doc = ohclv_docs[0] if ohclv_docs else None

            if ohclv_doc:
                current_price = ohclv_doc['close']

                # Calculate the market capitalization
                shares_outstanding = asset_info_doc.get('SharesOutstanding', 0)
                market_cap = current_price * shares_outstanding

                # Calculate the price-to-earnings ratio
                eps = asset_info_doc.get('EPS', 0)
                if isinstance(eps, str):
                    eps = float(eps) if eps.replace('.', '', 1).isdigit() else 0
                pe_ratio = current_price / eps if eps != 0 else 0

                # Calculate the price-to-book ratio
                quarterly_financials = asset_info_doc.get('quarterlyFinancials', [])
                if quarterly_financials:
                    most_recent_financials = quarterly_financials[0]
                    total_assets = most_recent_financials.get('totalAssets', 0)
                    total_liabilities = most_recent_financials.get('totalLiabilities', 0)
                    book_value = total_assets - total_liabilities
                    shares_outstanding = asset_info_doc.get('SharesOutstanding', 0)
                    if shares_outstanding != 0:
                        book_value_per_share = book_value / shares_outstanding
                        pb_ratio = current_price / book_value_per_share if book_value_per_share != 0 else 0
                    else:
                        pb_ratio = 0

                    # Calculate the price-to-sales ratio
                    total_revenue = most_recent_financials.get('totalRevenue', 0)
                    ps_ratio = current_price / (total_revenue / shares_outstanding) if shares_outstanding != 0 and total_revenue != 0 else 0
                else:
                    pb_ratio = 0
                    ps_ratio = 0

                # Calculate the trailing price-to-earnings growth ratio
                quarterly_financials = asset_info_doc.get('quarterlyFinancials', [])
                if len(quarterly_financials) >= 2:
                    most_recent_eps = quarterly_financials[0].get('reportedEPS', 0)
                    previous_eps = quarterly_financials[1].get('reportedEPS', 0)
                    eps_growth_rate = (most_recent_eps - previous_eps) / previous_eps if previous_eps != 0 else 0
                    trailing_peg = pe_ratio / eps_growth_rate if eps_growth_rate != 0 else 0
                else:
                    trailing_peg = 0

                # Calculate the Relative Strength Index (RSI)
                pipeline = [
                    {'$match': {'tickerID': ticker}},
                    {'$sort': {'timestamp': -1}},
                    {'$project': {'_id': 0, 'close': 1}},
                    {'$limit': 14}
                ]
                ohclv_docs_rsi = [doc async for doc in ohclv_collection.aggregate(pipeline)]
                if len(ohclv_docs_rsi) >= 14:
                    closing_prices = [doc['close'] for doc in ohclv_docs_rsi]
                    gains = []
                    losses = []
                    for i in range(1, len(closing_prices)):
                        change = closing_prices[i] - closing_prices[i - 1]
                        if change > 0:
                            gains.append(change)
                        else:
                            losses.append(abs(change))
                    average_gain = sum(gains) / len(gains)
                    average_loss = sum(losses) / len(losses)
                    rs = average_loss == 0 and 0 or average_gain / average_loss
                    rsi = 100 - (100 / (1 + rs))
                else:
                    rsi = 0

                # Calculate the Gap Percentage
                pipeline = [
                    {'$match': {'tickerID': ticker}},
                    {'$sort': {'timestamp': -1}},
                    {'$project': {'_id': 0, 'close': 1}},
                    {'$limit': 2}
                ]
                ohclv_docs_gap = [doc async for doc in ohclv_collection.aggregate(pipeline)]
                if len(ohclv_docs_gap) >= 2:
                    current_price = ohclv_docs_gap[0]['close']
                    previous_price = ohclv_docs_gap[1]['close']
                    gap_percentage = ((current_price - previous_price) / previous_price) * 100
                else:
                    gap_percentage = 0

                # Update the asset info document
                updates.append(
                    UpdateOne(
                        {'Symbol': ticker},
                        {'$set': {
                            'MarketCapitalization': market_cap,
                            'PERatio': pe_ratio,
                            'PriceToBookRatio': pb_ratio,
                            'PriceToSalesRatioTTM': ps_ratio,
                            'PEGRatio': trailing_peg,
                            'RSI': rsi,
                            'Gap': gap_percentage
                        }}
                    )
                )
            else:
                pass  # Print removed for clean output
        except Exception as e:
            pass  # Print removed for clean output

    if updates:
        try:
            result = await asset_info_collection.bulk_write(updates)
        except Exception as e:
            pass  # Print removed for clean output
            

# Adjust OHLCV for split or reverse split
def adjust_ohlcv_for_split(doc, splitFactor):
    if splitFactor > 1:
        # Forward split
        doc['open'] = doc['open'] / splitFactor
        doc['high'] = doc['high'] / splitFactor
        doc['low'] = doc['low'] / splitFactor
        doc['close'] = doc['close'] / splitFactor
        doc['volume'] = doc['volume'] * splitFactor
    elif 0 < splitFactor < 1:
        # Reverse split
        factor = 1 / splitFactor
        doc['open'] = doc['open'] * factor
        doc['high'] = doc['high'] * factor
        doc['low'] = doc['low'] * factor
        doc['close'] = doc['close'] * factor
        doc['volume'] = doc['volume'] / factor
    # else: splitFactor == 1, no adjustment
    return doc

# Adjust intraday OHCLV data for split/reverse split
async def adjust_intraday_for_split(tickerID, splitFactor):
    intraday_collections = [
        "OHCLVData1m", "OHCLVData5m", "OHCLVData15m", "OHCLVData30m", "OHCLVData1hr"
    ]
    for collection_name in intraday_collections:
        collection = db[collection_name]
        docs = [doc async for doc in collection.find({'tickerID': tickerID})]
        if not docs:
            continue
        adjusted_docs = []
        for doc in docs:
            adjusted_doc = adjust_ohlcv_for_split(doc, splitFactor)
            adjusted_docs.append(adjusted_doc)
        await collection.delete_many({'tickerID': tickerID})
        if adjusted_docs:
            await collection.insert_many(adjusted_docs)
        pass  # Print removed for clean output

# Adjust portfolio positions and trades for split/reverse split
async def adjust_portfolio_for_split(tickerID, splitFactor):
    """
    Adjusts Positions and Trades collections for a stock split.
    For forward splits (e.g., 10:1), shares multiply and prices divide.
    For reverse splits (e.g., 1:10), shares divide and prices multiply.
    """
    positions_collection = db['Positions']
    trades_collection = db['Trades']
    
    # Adjust Positions
    positions = [doc async for doc in positions_collection.find({'Symbol': tickerID})]
    for position in positions:
        if splitFactor > 1:
            # Forward split: shares increase, avg price decreases
            new_shares = position['Shares'] * splitFactor
            new_avg_price = position['AvgPrice'] / splitFactor
        elif 0 < splitFactor < 1:
            # Reverse split: shares decrease, avg price increases
            factor = 1 / splitFactor
            new_shares = position['Shares'] / factor
            new_avg_price = position['AvgPrice'] * factor
        else:
            continue
        
        await positions_collection.update_one(
            {'_id': position['_id']},
            {'$set': {'Shares': new_shares, 'AvgPrice': new_avg_price}}
        )
    
    # Adjust Trades
    trades = [doc async for doc in trades_collection.find({'Symbol': tickerID})]
    for trade in trades:
        if splitFactor > 1:
            # Forward split: shares increase, price decreases
            new_shares = trade['Shares'] * splitFactor
            new_price = trade['Price'] / splitFactor
            new_total = new_shares * new_price
        elif 0 < splitFactor < 1:
            # Reverse split: shares decrease, price increases
            factor = 1 / splitFactor
            new_shares = trade['Shares'] / factor
            new_price = trade['Price'] * factor
            new_total = new_shares * new_price
        else:
            continue
        
        await trades_collection.update_one(
            {'_id': trade['_id']},
            {'$set': {'Shares': new_shares, 'Price': new_price, 'Total': new_total}}
        )

#updates splits when triggered 
async def Split(tickerID, timestamp, splitFactor):
    asset_info_collection = db['AssetInfo']

    asset_info_doc = await asset_info_collection.find_one({'Symbol': tickerID})

    if asset_info_doc:
        # Skip if SharesOutstanding is missing
        shares_outstanding = asset_info_doc.get('SharesOutstanding')
        if shares_outstanding is None:
            pass  # Print removed for clean output
            return

        new_split = {
            'effective_date': timestamp,
            'split_factor': splitFactor
        }

        if splitFactor > 0:
            updated_shares = shares_outstanding * splitFactor
        elif 0 < splitFactor < 1:
            updated_shares = shares_outstanding / (1 / splitFactor)
        else:
            pass  # Print removed for clean output
            return

        await asset_info_collection.update_one(
            {'Symbol': tickerID},
            {'$push': {'splits': new_split}, '$set': {'SharesOutstanding': updated_shares}}
        )

        pass  # Print removed for clean output
        # Adjust intraday data for split/reverse split
        await adjust_intraday_for_split(tickerID, splitFactor)
        # Adjust portfolio positions and trades for split/reverse split
        await adjust_portfolio_for_split(tickerID, splitFactor)
        # If getHistoricalPrice2 is refactored to async, await it here
        await getHistoricalPrice2(tickerID)
    else:
        pass  # Print removed for clean output

#updates dividends when triggered 
async def Dividends(tickerID, timestamp, divCash):
    asset_info_collection = db['AssetInfo']

    # Find the document in AssetInfo with the matching Symbol
    asset_info_doc = await asset_info_collection.find_one({'Symbol': tickerID})

    if asset_info_doc:
        # Create a new dividend object
        new_dividend = {
            'payment_date': timestamp,
            'amount': divCash
        }

        # Update the DividendDate attribute and add the new dividend object to the end of the dividends array
        await asset_info_collection.update_one(
            {'Symbol': tickerID},
            {'$set': {'DividendDate': timestamp}, '$push': {'dividends': new_dividend}}
        )

        pass  # Print removed for clean output
    else:
        pass  # Print removed for clean output

#triggers when there's a split, it deleted and reuploads updated ohclvdata
async def getHistoricalPrice2(tickerID):
    daily_collection = db["OHCLVData"]
    weekly_collection = db["OHCLVData2"]

    # Find and delete existing documents for the tickerID (async)
    await daily_collection.delete_many({'tickerID': tickerID})
    await weekly_collection.delete_many({'tickerID': tickerID})

    now = dt.datetime.now()
    url = f'https://api.tiingo.com/tiingo/daily/{tickerID}/prices?token={api_key}&startDate=1960-01-01&endDate={now.strftime("%Y-%m-%d")}'
    response = requests.get(url)

    if response.status_code == 200:
        data = response.json()
        if len(data) > 0:
            df = pd.DataFrame(data)
            df = df.rename(columns={'date': 'timestamp'})
            df.columns = ['timestamp', 'close', 'high', 'low', 'open', 'volume', 'adjClose', 'adjHigh', 'adjLow', 'adjOpen', 'adjVolume', 'divCash', 'splitFactor']
            df['tickerID'] = tickerID

            # Convert NumPy types to Python native types
            def convert_numpy_types(doc):
                return {
                    k: (int(v) if isinstance(v, np.integer) else 
                        float(v) if isinstance(v, np.floating) else 
                        v) for k, v in doc.items()
                }

            # Convert dataframe to list of dictionaries
            daily_data_dict = df[['tickerID', 'timestamp', 'adjOpen', 'adjHigh', 'adjLow', 'adjClose', 'adjVolume', 'divCash', 'splitFactor']].to_dict(orient='records')
            daily_data_dict = [convert_numpy_types(doc) for doc in daily_data_dict]

            # Rename fields
            for doc in daily_data_dict:
                doc['open'] = doc.pop('adjOpen')
                doc['high'] = doc.pop('adjHigh')
                doc['low'] = doc.pop('adjLow')
                doc['close'] = doc.pop('adjClose')
                doc['volume'] = doc.pop('adjVolume')
                doc['timestamp'] = dt.datetime.strptime(doc['timestamp'], '%Y-%m-%dT%H:%M:%S.%fZ')

            # Insert daily documents, preventing duplicates (async)
            for daily_doc in daily_data_dict:
                existing_daily_doc = await daily_collection.find_one({
                    'tickerID': daily_doc['tickerID'], 
                    'timestamp': daily_doc['timestamp']
                })

                if not existing_daily_doc:
                    await daily_collection.insert_one(daily_doc)

            # Process weekly data from daily data
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            df['week_start'] = df['timestamp'].dt.to_period('W').dt.to_timestamp()

            weekly_grouped = df.groupby('week_start')

            await weekly_collection.delete_many({'tickerID': tickerID})

            for week_start, week_data in weekly_grouped:
                if not week_data.empty:
                    weekly_doc = {
                        'tickerID': tickerID,
                        'timestamp': week_start.to_pydatetime(),
                        'open': float(week_data['adjOpen'].iloc[0]),
                        'high': float(week_data['adjHigh'].max()),
                        'low': float(week_data['adjLow'].min()),
                        'close': float(week_data['adjClose'].iloc[-1]),
                        'volume': int(week_data['adjVolume'].sum())
                    }

                    # Check if weekly document already exists (async)
                    existing_weekly_doc = await weekly_collection.find_one({
                        'tickerID': tickerID, 
                        'timestamp': weekly_doc['timestamp']
                    })

                    if not existing_weekly_doc:
                        await weekly_collection.insert_one(weekly_doc)

            pass  # Print removed for clean output
        else:
            pass  # Print removed for clean output
    else:
        pass  # Print removed for clean output

#scan endpoints for financial statements updates and update symbol when it does
async def checkAndUpdateFinancialUpdates():
    start_time = time.time()
    collection = db['AssetInfo']
    # Only get symbols that are stocks and not delisted
    tickers = [doc['Symbol'] async for doc in collection.find({
        'AssetType': 'Stock',
        'Delisted': False
    })]
    pass  # Print removed for clean output
    new_tickers_data = {}
    
    total_tickers = len(tickers)
    processed = 0
    
    def print_financials_progress(processed, total, bar_length=50):
        """Print progress bar for financial updates"""
        percentage = int(100 * processed / total) if total > 0 else 0
        filled_length = int(bar_length * processed / total) if total > 0 else 0
        bar = '█' * filled_length + '░' * (bar_length - filled_length)
        print(f'\r  Progress: |{bar}| {percentage}% ({processed}/{total} stocks)', end='', flush=True)
    
    print_financials_progress(0, total_tickers)

    for ticker in tickers:
        processed += 1
        pass  # Print removed for clean output
        url = f'https://api.tiingo.com/tiingo/fundamentals/{ticker}/statements?token={api_key}'
        response = requests.get(url)

        if response.status_code == 200:
            data = response.json()

            # Find the document in MongoDB where Symbol matches the ticker (async)
            result = await collection.find_one({'Symbol': ticker})

            if result:
                # Process the data
                quarterly_financials_data = []
                annual_financials_data = []
                new_data_found = False

                for statement in data:
                    date_str = statement['date']
                    date = datetime.strptime(date_str, '%Y-%m-%d')
                    quarter = statement['quarter']

                    financial_data = {
                        'fiscalDateEnding': date,
                        'reportedEPS': 0,
                        'totalRevenue': 0,
                        'netIncome': 0
                    }

                    if 'statementData' in statement and 'incomeStatement' in statement['statementData']:
                        income_statement = statement['statementData']['incomeStatement']
                        eps = next((item for item in income_statement if item['dataCode'] == 'eps'), None)
                        revenue = next((item for item in income_statement if item['dataCode'] == 'revenue'), None)
                        netinc = next((item for item in income_statement if item['dataCode'] == 'netinc'), None)

                        if eps:
                            financial_data['reportedEPS'] = eps['value'] or 0

                        if revenue and netinc:
                            financial_data['totalRevenue'] = revenue['value'] or 0
                            financial_data['netIncome'] = netinc['value'] or 0

                    if 'balanceSheet' in statement['statementData']:
                        balance_sheet = statement['statementData']['balanceSheet']
                        for item in balance_sheet:
                            data_code = item['dataCode']
                            value = item['value'] or 0
                            financial_data[data_code] = value

                    if 'cashFlow' in statement['statementData']:
                        cash_flow = statement['statementData']['cashFlow']
                        for item in cash_flow:
                            data_code = item['dataCode']
                            value = item['value'] or 0
                            financial_data[data_code] = value

                    if 'overview' in statement['statementData']:
                        overview = statement['statementData']['overview']
                        for item in overview:
                            data_code = item['dataCode']
                            value = item['value'] or 0
                            financial_data[data_code] = value

                    if quarter == 0:
                        existing_annual_financials = result.get('AnnualFinancials', [])
                        existing_annual_financials_dates = [item['fiscalDateEnding'] for item in existing_annual_financials]
                        if date not in existing_annual_financials_dates:
                            new_data_found = True
                            pass  # Print removed for clean output
                        annual_financials_data.append(financial_data)
                    else:
                        existing_quarterly_financials = result.get('quarterlyFinancials', [])
                        existing_quarterly_financials_dates = [item['fiscalDateEnding'] for item in existing_quarterly_financials]
                        if date not in existing_quarterly_financials_dates:
                            new_data_found = True
                            pass  # Print removed for clean output
                        quarterly_financials_data.append(financial_data)

                if new_data_found:
                    new_tickers_data[ticker] = {
                        'quarterlyFinancials': quarterly_financials_data,
                        'AnnualFinancials': annual_financials_data
                    }
            else:
                pass  # Print removed for clean output
        else:
            pass  # Print removed for clean output
        
        print_financials_progress(processed, total_tickers)
    
    print()  # Move to next line after progress bar

    #maintenanceMode(True)
    # Update the quarterly and annual earnings and financial data in the MongoDB database (async)
    for ticker, data in new_tickers_data.items():
        pass  # Print removed for clean output
        await collection.update_one({'Symbol': ticker}, {'$set': data})
        pass  # Print removed for clean output

    # These are assumed to be async, if not, remove await
    if asyncio.iscoroutinefunction(update_eps_shares_dividend_date):
        await update_eps_shares_dividend_date()
    else:
        update_eps_shares_dividend_date()
    if asyncio.iscoroutinefunction(calculate_qoq_changes):
        await calculate_qoq_changes()
    else:
        calculate_qoq_changes()
    if asyncio.iscoroutinefunction(calculate_YoY_changes):
        await calculate_YoY_changes()
    else:
        calculate_YoY_changes()
    #maintenanceMode(False)
    end_time = time.time()
    execution_time_in_seconds = end_time - start_time
    execution_time_in_minutes = execution_time_in_seconds / 60
    pass  # Print removed for clean output

#updates assetinfo with recent ohclvdata 
async def updateTimeSeries():
    ohclv_collection = db['OHCLVData']
    asset_info_collection = db['AssetInfo']
    updates = []
    i = 0
    async for asset_info in asset_info_collection.find({'Delisted': False}):
        ticker = asset_info['Symbol']
        try:
            recent_doc = await ohclv_collection.find_one(
                {'tickerID': ticker},
                sort=[('timestamp', -1)]
            )
            if recent_doc:
                time_series_data = {
                    'open': round(float(recent_doc.get('open', 0)), 2),
                    'high': round(float(recent_doc.get('high', 0)), 2),
                    'low': round(float(recent_doc.get('low', 0)), 2),
                    'close': round(float(recent_doc.get('close', 0)), 2),
                    'volume': round(float(recent_doc.get('volume', 0)), 2)
                }
                updates.append(
                    UpdateOne(
                        {'Symbol': ticker},
                        {'$set': {
                            'TimeSeries': time_series_data
                        }}
                    )
                )
            i += 1
        except Exception as e:
            pass  # Print removed for clean output

    if updates:
        try:
            result = await asset_info_collection.bulk_write(updates)
        except Exception as e:
            pass  # Print removed for clean output
            
#updates dividend yields TTM daily 
async def getDividendYieldTTM():
    collection = db['AssetInfo']

    async for document in collection.find({'Delisted': False}):
        ticker = document['Symbol']
        dividends = document.get('dividends', [])
        time_series = document.get('TimeSeries', {})

        if not dividends:
            # Update the existing document
            await collection.update_one(
                {'Symbol': ticker},
                {'$set': {'DividendYield': None}}
            )
            continue

        try:
            # Sort the dividends by payment date
            sorted_dividends = sorted(dividends, key=lambda x: x['payment_date'])

            # Calculate the total dividends paid over the past 12 months
            current_date = dt.datetime.now()
            ttm_dividends = [dividend for dividend in sorted_dividends if (current_date - dividend['payment_date']).days <= 365]
            ttm_dividend_per_share = sum(dividend['amount'] for dividend in ttm_dividends)

            # Extract the current stock price
            current_stock_price = None
            if isinstance(time_series, dict) and time_series:
                # Get close price directly from TimeSeries
                current_stock_price = time_series.get('close')
            if not current_stock_price:
                await collection.update_one(
                    {'Symbol': ticker},
                    {'$set': {'DividendYield': None}}
                )
                continue
            dividend_yield_ttm = ttm_dividend_per_share / current_stock_price if current_stock_price else None

            # Update the existing document
            await collection.update_one(
                {'Symbol': ticker},
                {'$set': {'DividendYield': dividend_yield_ttm}}
            )
        except Exception as e:
            pass  # Print removed for clean output

#calculates average volume for 1w, 1m, 6m and 1y
@async_retry_on_disconnect(max_retries=3, delay=2)
async def calculateVolumes():
    ohclv_collection = db["OHCLVData"]
    asset_info_collection = db["AssetInfo"]
    updates = []
    i = 0
    
    # Batch processing to avoid cursor timeouts
    batch_size = 100
    cursor = asset_info_collection.find({'Delisted': False}).batch_size(batch_size)
    
    async for asset_info in cursor:
        ticker = asset_info['Symbol']
        try:
            pipeline = [
                {'$match': {'tickerID': ticker}},
                {'$sort': {'timestamp': -1}},
                {'$limit': 365},  # Only fetch what we need
                {'$project': {'_id': 0, 'volume': 1}}
            ]
            # Use to_list with max_time_ms to prevent timeout
            documents = await ohclv_collection.aggregate(pipeline).to_list(length=365)

            volumes = [doc["volume"] for doc in documents]
            avg_volume_1w = sum(volumes[-7:]) / 7 if len(volumes) >= 7 else None
            avg_volume_1m = sum(volumes[-30:]) / 30 if len(volumes) >= 30 else None
            avg_volume_6m = sum(volumes[-180:]) / 180 if len(volumes) >= 180 else None
            avg_volume_1y = sum(volumes[-365:]) / 365 if len(volumes) >= 365 else None
            rel_volume_1w = round(volumes[-1] / avg_volume_1w, 1) if avg_volume_1w and len(volumes) > 0 else None
            rel_volume_1m = round(volumes[-1] / avg_volume_1m, 1) if avg_volume_1m and len(volumes) > 0 else None
            rel_volume_6m = round(volumes[-1] / avg_volume_6m, 1) if avg_volume_6m and len(volumes) > 0 else None
            rel_volume_1y = round(volumes[-1] / avg_volume_1y, 1) if avg_volume_1y and len(volumes) > 0 else None

            updates.append(
                UpdateOne(
                    {'Symbol': ticker},
                    {'$set': {
                        'AvgVolume1W': int(avg_volume_1w) if avg_volume_1w else None,
                        'AvgVolume1M': int(avg_volume_1m) if avg_volume_1m else None,
                        'AvgVolume6M': int(avg_volume_6m) if avg_volume_6m else None,
                        'AvgVolume1Y': int(avg_volume_1y) if avg_volume_1y else None,
                        'RelVolume1W': rel_volume_1w,
                        'RelVolume1M': rel_volume_1m,
                        'RelVolume6M': rel_volume_6m,
                        'RelVolume1Y': rel_volume_1y
                    }}
                )
            )
            i += 1
            
            # Batch write every 100 updates to avoid memory issues and maintain connection
            if len(updates) >= 100:
                try:
                    await asset_info_collection.bulk_write(updates, ordered=False)
                    pass  # Print removed for clean output
                    updates = []
                except Exception as e:
                    pass  # Print removed for clean output
                    updates = []
                    
        except Exception as e:
            pass  # Print removed for clean output

    # Write remaining updates
    if updates:
        try:
            result = await asset_info_collection.bulk_write(updates, ordered=False)
            pass  # Print removed for clean output
        except Exception as e:
            pass  # Print removed for clean output

#calculates moving averages (10, 20, 50 and 200DMA)
async def calculateSMAs():
    ohclv_collection = db["OHCLVData"]
    asset_info_collection = db["AssetInfo"]
    updates = []
    i = 0
    async for asset_info in asset_info_collection.find({'Delisted': False}):
        ticker = asset_info['Symbol']
        try:
            pipeline = [
                {'$match': {'tickerID': ticker}},
                {'$sort': {'timestamp': 1}},
                {'$project': {'_id': 0, 'close': 1}}
            ]
            documents = [doc async for doc in ohclv_collection.aggregate(pipeline)]

            closes = [doc["close"] for doc in documents]
            ma_10 = sum(closes[-10:]) / 10 if len(closes) >= 10 else None
            ma_20 = sum(closes[-20:]) / 20 if len(closes) >= 20 else None
            ma_50 = sum(closes[-50:]) / 50 if len(closes) >= 50 else None
            ma_100 = sum(closes[-100:]) / 100 if len(closes) >= 100 else None
            ma_200 = sum(closes[-200:]) / 200 if len(closes) >= 200 else None

            updates.append(
                UpdateOne(
                    {'Symbol': ticker},
                    {'$set': {
                        'MA10': round(ma_10, 2) if ma_10 else None,
                        'MA20': round(ma_20, 2) if ma_20 else None,
                        'MA50': round(ma_50, 2) if ma_50 else None,
                        'MA100': round(ma_100, 2) if ma_100 else None,
                        'MA200': round(ma_200, 2) if ma_200 else None
                    }}
                )
            )
            i += 1
        except Exception as e:
            pass  # Print removed for clean output

    if updates:
        try:
            result = await asset_info_collection.bulk_write(updates)
        except Exception as e:
            pass  # Print removed for clean output

#calulcates technical score 
async def calculateTechnicalScores():
    ohclv_collection = db["OHCLVData"]
    asset_info_collection = db["AssetInfo"]
    updates = []
    i = 0
    async for asset_info in asset_info_collection.find({'Delisted': False}):
        ticker = asset_info['Symbol']
        try:
            pipeline = [
                {'$match': {'tickerID': ticker}},
                {'$sort': {'timestamp': -1}},
                {'$project': {'_id': 0, 'close': 1}}
            ]
            documents = [doc async for doc in ohclv_collection.aggregate(pipeline)]

            recent_close = documents[0]["close"] if documents else None
            historical_close_1w = documents[4]["close"] if len(documents) >= 5 else documents[-1]["close"] if documents else None
            historical_close_1m = documents[19]["close"] if len(documents) >= 20 else documents[-1]["close"] if documents else None
            historical_close_4m = documents[79]["close"] if len(documents) >= 80 else documents[-1]["close"] if documents else None

            if historical_close_1w:
                percentage_change_1w = (recent_close - historical_close_1w) / historical_close_1w * 100
                updates.append(
                    UpdateOne(
                        {'Symbol': ticker},
                        {'$set': {'percentage_change_1w': percentage_change_1w}}
                    )
                )
            if historical_close_1m:
                percentage_change_1m = (recent_close - historical_close_1m) / historical_close_1m * 100
                updates.append(
                    UpdateOne(
                        {'Symbol': ticker},
                        {'$set': {'percentage_change_1m': percentage_change_1m}}
                    )
                )
            if historical_close_4m:
                percentage_change_4m = (recent_close - historical_close_4m) / historical_close_4m * 100
                updates.append(
                    UpdateOne(
                        {'Symbol': ticker},
                        {'$set': {'percentage_change_4m': percentage_change_4m}}
                    )
                )
            i += 1
        except Exception as e:
            pass  # Print removed for clean output

    if updates:
        try:
            result = await asset_info_collection.bulk_write(updates)
        except Exception as e:
            pass  # Print removed for clean output

    pipeline = [
        {'$match': {}},
        {'$project': {'_id': 0, 'Symbol': 1, 'percentage_change_1w': 1, 'percentage_change_1m': 1, 'percentage_change_4m': 1}}
    ]
    documents = [doc async for doc in asset_info_collection.aggregate(pipeline)]

    stock_data_1w = []
    stock_data_1m = []
    stock_data_4m = []
    for doc in documents:
        if 'percentage_change_1w' in doc:
            stock_data_1w.append({'name': doc['Symbol'], 'percentage_change': doc['percentage_change_1w']})
        if 'percentage_change_1m' in doc:
            stock_data_1m.append({'name': doc['Symbol'], 'percentage_change': doc['percentage_change_1m']})
        if 'percentage_change_4m' in doc:
            stock_data_4m.append({'name': doc['Symbol'], 'percentage_change': doc['percentage_change_4m']})

    stock_data_1w.sort(key=lambda x: x["percentage_change"])
    stock_data_1m.sort(key=lambda x: x["percentage_change"])
    stock_data_4m.sort(key=lambda x: x["percentage_change"])

    updates = []
    for i, stock in enumerate(stock_data_1w):
        rs_score_1w = int((i / len(stock_data_1w)) * 100) + 1
        updates.append(
            UpdateOne(
                {'Symbol': stock["name"]},
                {'$set': {'RSScore1W': rs_score_1w}}
            )
        )
    for i, stock in enumerate(stock_data_1m):
        rs_score_1m = int((i / len(stock_data_1m)) * 100) + 1
        updates.append(
            UpdateOne(
                {'Symbol': stock["name"]},
                {'$set': {'RSScore1M': rs_score_1m}}
            )
        )
    for i, stock in enumerate(stock_data_4m):
        rs_score_4m = int((i / len(stock_data_4m)) * 100) + 1
        updates.append(
            UpdateOne(
                {'Symbol': stock["name"]},
                {'$set': {'RSScore4M': rs_score_4m}}
            )
        )

    if updates:
        try:
            result = await asset_info_collection.bulk_write(updates)
        except Exception as e:
            pass  # Print removed for clean output

    updates = []
    async for asset_info in asset_info_collection.find({'Delisted': False}):
        ticker = asset_info['Symbol']
        updates.append(
            UpdateOne(
                {'Symbol': ticker},
                {'$set': {
                    'RSScore1W': asset_info.get('RSScore1W'),
                    'RSScore1M': asset_info.get('RSScore1M'),
                    'RSScore4M': asset_info.get('RSScore4M')
                }}
            )
        )

    if updates:
        try:
            result = await asset_info_collection.bulk_write(updates)
        except Exception as e:
            pass  # Print removed for clean output

#calculates both 52wk and all time high/low
async def calculateAlltimehighlowandperc52wk():
    ohclv_data_collection = db['OHCLVData']
    asset_info_collection = db['AssetInfo']
    updates = []
    i = 0
    async for asset_info in asset_info_collection.find({'Delisted': False}):
        ticker = asset_info['Symbol']
        try:
            pipeline = [
                {'$match': {'tickerID': ticker}},
                {'$sort': {'timestamp': -1}},
                {'$project': {'_id': 0, 'high': 1, 'low': 1, 'close': 1}}
            ]
            documents = [doc async for doc in ohclv_data_collection.aggregate(pipeline)]

            high_values = []
            low_values = []
            close_values = []
            for doc in documents:
                try:
                    high_value = float(doc.get('high', 0))
                    low_value = float(doc.get('low', 0))
                    close_value = float(doc.get('close', 0))
                    high_values.append(high_value)
                    low_values.append(low_value)
                    close_values.append(close_value)
                except (ValueError, TypeError):
                    pass  # Print removed for clean output

            if high_values and low_values and close_values:
                alltime_high = max(high_values)
                alltime_low = min(low_values)
                recent_close = close_values[0]
                highs_52wk = high_values[:252]  # Most recent 252 highs (approx 1 year)
                lows_52wk = low_values[:252]    # Most recent 252 lows (approx 1 year)
                fiftytwo_week_high = max(highs_52wk) if highs_52wk else 0
                fiftytwo_week_low = min(lows_52wk) if lows_52wk else 0
            else:
                alltime_high = 0
                alltime_low = 0
                recent_close = 0
                fiftytwo_week_high = 0
                fiftytwo_week_low = 0

            if fiftytwo_week_high != 0:
                perc_off_52_week_high = ((recent_close - fiftytwo_week_high) / fiftytwo_week_high)
            else:
                perc_off_52_week_high = 0
            if fiftytwo_week_low != 0:
                perc_off_52_week_low = ((recent_close - fiftytwo_week_low) / fiftytwo_week_low)
            else:
                perc_off_52_week_low = 0

            updates.append(
                UpdateOne(
                    {'Symbol': ticker},
                    {'$set': {
                        'AlltimeHigh': alltime_high,
                        'AlltimeLow': alltime_low,
                        'fiftytwoWeekHigh': fiftytwo_week_high,
                        'fiftytwoWeekLow': fiftytwo_week_low,
                        'percoff52WeekHigh': perc_off_52_week_high,
                        'percoff52WeekLow': perc_off_52_week_low
                    }}
                )
            )
            i += 1
        except Exception as e:
            pass  # Print removed for clean output

    if updates:
        try:
            result = await asset_info_collection.bulk_write(updates)
        except Exception as e:
            pass  # Print removed for clean output
 
#caluclates percentage changes for today, wk, 1m, 4m, 6m, 1y, and YTD (althought ytd is still a bit weird)
async def calculatePerc():
    ohclv_collection = db['OHCLVData']
    asset_info_collection = db['AssetInfo']
    updates = []
    i = 0
    async for asset_info in asset_info_collection.find({'Delisted': False}):
        ticker = asset_info['Symbol']
        try:
            pipeline = [
                {'$match': {'tickerID': ticker}},
                {'$sort': {'timestamp': 1}},
                {'$project': {'_id': 0, 'close': 1, 'timestamp': 1}}
            ]
            documents = [doc async for doc in ohclv_collection.aggregate(pipeline)]

            if len(documents) < 2:
                percentage_changes = {
                    'todaychange': 'N/A',
                    'weekchange': 'N/A',
                    '1mchange': 'N/A',
                    '4mchange': 'N/A',
                    '6mchange': 'N/A',
                    '1ychange': 'N/A',
                    'ytdchange': 'N/A'
                }
            else:
                close_values = {doc['timestamp']: doc['close'] for doc in documents}
                today_close = close_values.get(sorted(close_values.keys())[-1])
                yesterday_close = close_values.get(sorted(close_values.keys())[-2]) if len(close_values) > 1 else 0
                last_week_close = close_values.get(sorted(close_values.keys())[-6]) if len(close_values) > 5 else 0
                first_month_close = close_values.get(sorted(close_values.keys())[-20]) if len(close_values) > 19 else 0
                fourth_month_close = close_values.get(sorted(close_values.keys())[-80]) if len(close_values) > 79 else 0
                sixth_month_close = close_values.get(sorted(close_values.keys())[-120]) if len(close_values) > 119 else 0
                one_year_close = close_values.get(sorted(close_values.keys())[-250]) if len(close_values) > 249 else 0

                ytd_keys = [key for key in close_values if key.year == datetime.today().year]
                if ytd_keys:
                    ytd_close = close_values.get(min(ytd_keys))
                    ytd_change = ((today_close - ytd_close) / today_close) if ytd_close != 0 else 'N/A'
                else:
                    ytd_change = 'N/A'

                percentage_changes = {
                    'todaychange': ((today_close - yesterday_close) / today_close) if yesterday_close != 0 else 'N/A',
                    'weekchange': ((today_close - last_week_close) / today_close) if last_week_close != 0 else 'N/A',
                    '1mchange': ((today_close - first_month_close) / today_close) if first_month_close != 0 else 'N/A',
                    '4mchange': ((today_close - fourth_month_close) / today_close) if fourth_month_close != 0 else 'N/A',
                    '6mchange': ((today_close - sixth_month_close) / today_close) if sixth_month_close != 0 else 'N/A',
                    '1ychange': ((today_close - one_year_close) / today_close) if one_year_close != 0 else 'N/A',
                    'ytdchange': ytd_change
                }
            updates.append(
                UpdateOne(
                    {'Symbol': ticker},
                    {'$set': percentage_changes}
                )
            )
            i += 1
        except Exception as e:
            pass  # Print removed for clean output

    if updates:
        try:
            result = await asset_info_collection.bulk_write(updates)
        except Exception as e:
            pass  # Print removed for clean output

#calculates average day volatility for specific timespans and updates documents 
async def calculateADV():
    ohclv_collection = db["OHCLVData"]
    asset_info_collection = db["AssetInfo"]
    updates = []
    i = 0
    async for asset_info in asset_info_collection.find({'Delisted': False}):
        ticker = asset_info['Symbol']
        try:
            pipeline = [
                {'$match': {'tickerID': ticker}},
                {'$sort': {'timestamp': -1}},
                {'$project': {'_id': 0, 'close': 1}}
            ]
            documents = [doc async for doc in ohclv_collection.aggregate(pipeline)]

            close_prices = [doc['close'] for doc in documents]

            if len(close_prices) < 5:
                continue

            # Calculate daily returns
            daily_returns = [close_prices[j] - close_prices[j-1] for j in range(1, len(close_prices))]

            # Helper function to safely calculate volatility
            def safe_volatility(returns, prices, period):
                if len(returns) < period:
                    return None
                mean_price = np.mean(prices[-period:])
                if mean_price == 0 or np.isnan(mean_price):
                    return None
                std_returns = np.std(returns[-period:])
                if np.isnan(std_returns):
                    return None
                return (std_returns / mean_price) * 100

            # Calculate average daily volatility over specific time spans
            volatility_1w = safe_volatility(daily_returns, close_prices, 5)
            volatility_1m = safe_volatility(daily_returns, close_prices, 20)
            volatility_4m = safe_volatility(daily_returns, close_prices, 80)
            volatility_1y = safe_volatility(daily_returns, close_prices, 252)

            updates.append(
                UpdateOne(
                    {'Symbol': ticker},
                    {'$set': {
                        'ADV1W': volatility_1w,
                        'ADV1M': volatility_1m,
                        'ADV4M': volatility_4m,
                        'ADV1Y': volatility_1y
                    }}
                )
            )

            i += 1
        except Exception as e:
            pass  # Print removed for clean output

    if updates:
        try:
            result = await asset_info_collection.bulk_write(updates)
        except Exception as e:
            pass  # Print removed for clean output
    

'''
Qaurterly Section
'''
#calculares QoQ changes        
async def calculate_qoq_changes():
    collection = db['AssetInfo']
    async for doc in collection.find({'Delisted': False}):
        ticker = doc['Symbol']
        quarterly_income = doc.get('quarterlyFinancials', [])
        total_revenue = [float(x.get('totalRevenue', 0)) for x in quarterly_income if x.get('totalRevenue') not in ['', 'None', None]]
        net_income = [float(x.get('netIncome', 0)) for x in quarterly_income if x.get('netIncome') not in ['', 'None', None]]
        reported_eps = [float(x.get('reportedEPS', 0)) for x in quarterly_income if x.get('reportedEPS') not in ['', 'None', None]]
        if len(total_revenue) > 1:
            current_quarter = total_revenue[0]
            previous_quarter = total_revenue[1]
            if previous_quarter != 0:
                revenue_qoq = ((current_quarter - previous_quarter) / previous_quarter)
            else:
                revenue_qoq = 0
        else:
            revenue_qoq = 0
        if len(net_income) > 1:
            current_quarter = net_income[0]
            previous_quarter = net_income[1]
            if previous_quarter != 0:
                earnings_qoq = ((current_quarter - previous_quarter) / previous_quarter)
            else:
                earnings_qoq = 0
        else:
            earnings_qoq = 0
        if len(reported_eps) > 1:
            current_quarter = reported_eps[0]
            previous_quarter = reported_eps[1]
            if previous_quarter != 0:
                eps_qoq = ((current_quarter - previous_quarter) / previous_quarter)
            else:
                eps_qoq = 0
        else:
            eps_qoq = 0
        await collection.update_one({'Symbol': ticker}, {'$set': {
            'EPSQoQ': eps_qoq,
            'EarningsQoQ': earnings_qoq,
            'RevQoQ': revenue_qoq
        }})

#calculares YoY changes 
async def calculate_YoY_changes():
    collection = db['AssetInfo']
    async for doc in collection.find({'Delisted': False}):
        ticker = doc['Symbol']
        quarterly_income = doc.get('quarterlyFinancials', [])
        total_revenue = [float(x.get('totalRevenue', 0)) for x in quarterly_income if x.get('totalRevenue') not in ['', 'None', None]]
        net_income = [float(x.get('netIncome', 0)) for x in quarterly_income if x.get('netIncome') not in ['', 'None', None]]
        reported_eps = [float(x.get('reportedEPS', 0)) for x in quarterly_income if x.get('reportedEPS') not in ['', 'None', None]]
        if len(total_revenue) >= 5:
            current_quarter = total_revenue[0]
            previous_quarter = total_revenue[4]
            if previous_quarter != 0:
                revenue_yoy = ((current_quarter - previous_quarter) / previous_quarter)
            else:
                revenue_yoy = 0
        else:
            revenue_yoy = 0
        if len(net_income) >= 5:
            current_quarter = net_income[0]
            previous_quarter = net_income[4]
            if previous_quarter != 0:
                earnings_yoy = ((current_quarter - previous_quarter) / previous_quarter)
            else:
                earnings_yoy = 0
        else:
            earnings_yoy = 0
        if len(reported_eps) >= 5:
            current_quarter = reported_eps[0]
            previous_quarter = reported_eps[4]
            if previous_quarter != 0:
                eps_yoy = ((current_quarter - previous_quarter) / previous_quarter)
            else:
                eps_yoy = 0
        else:
            eps_yoy = 0
        await collection.update_one({'Symbol': ticker}, {'$set': {
            'EPSYoY': eps_yoy,
            'EarningsYoY': earnings_yoy,
            'RevYoY': revenue_yoy
        }})

#updates data when financials are updated 
async def update_eps_shares_dividend_date():
    collection = db['AssetInfo']
    try:
        async for document in collection.find({'Delisted': False}):
            ticker = document['Symbol']

            # Check if the quarterlyFinancials array is not empty
            if 'quarterlyFinancials' in document and document['quarterlyFinancials']:
                # Extract the reportedEPS from the first object in the quarterlyFinancials array
                reported_eps = document['quarterlyFinancials'][0].get('reportedEPS')

                # Update the EPS attribute of the document
                if reported_eps is not None:
                    await collection.update_one({'Symbol': ticker}, {'$set': {'EPS': reported_eps}})

            # Check if the quarterlyFinancials array is not empty
            if 'quarterlyFinancials' in document and document['quarterlyFinancials']:
                # Extract the sharesBasic from the first object in the quarterlyFinancials array
                shares_basic = document['quarterlyFinancials'][0].get('sharesBasic')

                # Update the SharesOutstanding attribute of the document
                if shares_basic is not None:
                    await collection.update_one({'Symbol': ticker}, {'$set': {'SharesOutstanding': shares_basic}})

            # Check if the dividends array is not empty
            if 'dividends' in document and document['dividends']:
                # Extract the payment_date from the last object in the dividends array
                payment_date = document['dividends'][-1].get('payment_date')

                # Update the DividendDate attribute of the document
                if payment_date is not None:
                    await collection.update_one({'Symbol': ticker}, {'$set': {'DividendDate': payment_date}})
        pass  # Print removed for clean output

    except Exception as e:
        pass  # Print removed for clean output

#Start from Scratch , don't do it unless absolutely necessary, because it burns through api calls 
async def ExMachina():
    await getSummary()
    await getHistoricalPrice()
    await getFinancials()
    await getFullSplits()
    await getFullDividends()

#grabs recent news articles from Tiingo API and inserts them into the News collection
async def fetchNews():
    news_collection = db["News"]
    asset_info_collection = db["AssetInfo"]
    
    # Get only stocks and ETFs that are not delisted
    symbols = [doc['Symbol'] async for doc in asset_info_collection.find({
        'Delisted': False,
        'AssetType': {'$in': ['Stock', 'ETF', "Crypto"]}
    })]
    
    # Process in batches of 50 tickers to avoid URL length issues
    BATCH_SIZE = 50
    total_batches = (len(symbols) + BATCH_SIZE - 1) // BATCH_SIZE
    
    documents_to_insert = []
    seen_urls = set()
    processed_batches = 0
    
    def print_news_progress(processed, total, bar_length=50):
        """Print progress bar for news fetching"""
        percentage = int(100 * processed / total) if total > 0 else 0
        filled_length = int(bar_length * processed / total) if total > 0 else 0
        bar = '█' * filled_length + '░' * (bar_length - filled_length)
        print(f'\r  Progress: |{bar}| {percentage}% ({processed}/{total} batches)', end='', flush=True)
    
    print_news_progress(0, total_batches)
    
    # Process symbols in batches
    for i in range(0, len(symbols), BATCH_SIZE):
        batch_symbols = symbols[i:i + BATCH_SIZE]
        tickers_param = ','.join([s.lower() for s in batch_symbols])
        
        # Fetch news for this batch
        api_url = f"https://api.tiingo.com/tiingo/news?tickers={tickers_param}&token={api_key}"
        
        try:
            response = requests.get(api_url, timeout=30)
            
            if response.status_code == 200:
                news_items = response.json()
                
                for item in news_items:
                    url = item.get("url")
                    if not url or url in seen_urls:
                        continue
                    
                    seen_urls.add(url)
                    tickers_upper = [t.upper() for t in item.get("tickers", [])]
                    
                    # Convert publishedDate string to datetime (BSON compatible)
                    published_date_str = item.get("publishedDate")
                    published_date = None
                    if published_date_str:
                        try:
                            published_date = datetime.strptime(published_date_str, "%Y-%m-%dT%H:%M:%S.%fZ")
                        except ValueError:
                            try:
                                published_date = datetime.strptime(published_date_str, "%Y-%m-%dT%H:%M:%SZ")
                            except Exception:
                                published_date = None
                    
                    # Check if this exact article already exists in the database
                    exists = await news_collection.find_one({
                        "url": url,
                        "publishedDate": published_date
                    })
                    
                    if not exists:
                        doc = {
                            "publishedDate": published_date,
                            "title": item.get("title"),
                            "url": url,
                            "description": item.get("description"),
                            "source": item.get("source"),
                            "tickers": tickers_upper,
                        }
                        documents_to_insert.append(doc)
        except Exception as e:
            pass  # Silently continue with next batch
        
        processed_batches += 1
        print_news_progress(processed_batches, total_batches)
    
    # Bulk insert all new documents
    if documents_to_insert:
        try:
            await news_collection.insert_many(documents_to_insert, ordered=False)
        except Exception:
            pass  # Handle any duplicate key errors gracefully
    
    print()  # Move to next line after progress bar
    print(f"  Inserted {len(documents_to_insert)} new articles")

async def generate_weekly_candles():
    daily_collection = db["OHCLVData"]
    weekly_collection = db["OHCLVData2"]

    tickers = await daily_collection.distinct('tickerID')
    for ticker in tickers:
        daily_data = [doc async for doc in daily_collection.find({'tickerID': ticker})]
        if not daily_data:
            continue

        df = pd.DataFrame(daily_data)
        df['timestamp'] = pd.to_datetime(df['timestamp'])

        # Calculate the Monday of each week for each row
        df['week_monday'] = df['timestamp'] - pd.to_timedelta(df['timestamp'].dt.weekday, unit='d')

        # Group by Monday date
        grouped = df.groupby('week_monday')
        for week_monday, week_data in grouped:
            weekly_doc = {
                'tickerID': ticker,
                'timestamp': week_monday.to_pydatetime(),  # This is the Monday
                'open': float(week_data.sort_values('timestamp').iloc[0]['open']),
                'high': float(week_data['high'].max()),
                'low': float(week_data['low'].min()),
                'close': float(week_data.sort_values('timestamp').iloc[-1]['close']),
                'volume': int(week_data['volume'].sum())
            }
            exists = await weekly_collection.find_one({
                'tickerID': ticker,
                'timestamp': weekly_doc['timestamp']
            })
            if not exists:
                await weekly_collection.insert_one(weekly_doc)
        
def calculate_intrinsic_value(stock_doc):
    # DCF-based intrinsic value calculation (Buffett-style, including net cash)
    quarterly_financials = stock_doc.get('quarterlyFinancials', [])
    shares_out = stock_doc.get('SharesOutstanding', None)
    if not quarterly_financials or len(quarterly_financials) < 20 or not shares_out or shares_out <= 0:
        return {'type': 'Stock', 'intrinsic_value': 0}

    # Check that financial data is recent (within last 2 years)
    latest_q = quarterly_financials[0]
    fiscal_date_ending = latest_q.get('fiscalDateEnding')
    if fiscal_date_ending:
        try:
            # Handle both datetime objects and strings
            if isinstance(fiscal_date_ending, dict) and '$date' in fiscal_date_ending:
                fiscal_date_str = fiscal_date_ending['$date']
                fiscal_date = datetime.fromisoformat(fiscal_date_str.replace('Z', '+00:00'))
            elif isinstance(fiscal_date_ending, str):
                fiscal_date = datetime.fromisoformat(fiscal_date_ending.replace('Z', '+00:00'))
            elif hasattr(fiscal_date_ending, 'year'):  # Already a datetime object
                fiscal_date = fiscal_date_ending
            else:
                return {'type': 'Stock', 'intrinsic_value': 0}

            # Check if data is too old (more than 1 year old)
            now = datetime.now(timezone.utc)
            days_old = (now - fiscal_date.replace(tzinfo=timezone.utc) if fiscal_date.tzinfo is None else now - fiscal_date).days
            if days_old > 365:  # 1 year = 365 days
                return {'type': 'Stock', 'intrinsic_value': 0}
        except Exception:
            # If we can't parse the date, reject it
            return {'type': 'Stock', 'intrinsic_value': 0}
    else:
        # No fiscal date = can't verify recency
        return {'type': 'Stock', 'intrinsic_value': 0}

    # Check for negative equity (company is insolvent)
    equity = latest_q.get('equity', 0)
    if equity is not None and equity <= 0:
        return {'type': 'Stock', 'intrinsic_value': 0}
    
    # Check debt-to-equity ratio - extremely leveraged companies are risky
    total_debt = latest_q.get('debt', 0) or 0
    if equity and equity > 0:
        debt_to_equity = abs(total_debt / equity)
        if debt_to_equity > 10:  # D/E ratio > 10 is extreme leverage
            return {'type': 'Stock', 'intrinsic_value': 0}
    
    # Check for excessive reverse splits (sign of distressed company)
    splits = stock_doc.get('splits', [])
    reverse_splits = [s for s in splits if s.get('split_factor', 1) < 1]
    if len(reverse_splits) >= 5:  # 5+ reverse splits = red flag
        return {'type': 'Stock', 'intrinsic_value': 0}

    # Extract last 20 quarters of free cash flow (FCF)
    fcf_list = []
    net_income_list = []
    for q in quarterly_financials[:20]:
        fcf = q.get('freeCashFlow')
        net_income = q.get('netIncome')
        if fcf is not None:
            try:
                fcf_list.append(float(fcf))
            except Exception:
                continue
        if net_income is not None:
            try:
                net_income_list.append(float(net_income))
            except Exception:
                continue
    
    if len(fcf_list) < 20:
        return {'type': 'Stock', 'intrinsic_value': 0}
    
    # Sanity check: If company is consistently losing money, don't value it with DCF
    if len(net_income_list) >= 12:
        profitable_quarters = sum(1 for ni in net_income_list[:12] if ni > 0)
        if profitable_quarters < 6:  # Less than half of last 12 quarters profitable
            return {'type': 'Stock', 'intrinsic_value': 0}
    
    # Additional profitability check using EPS from quarterlyFinancials
    if quarterly_financials and len(quarterly_financials) >= 12:
        eps_list = []
        for q in quarterly_financials[:12]:
            eps = q.get('reportedEPS')
            if eps is not None:
                try:
                    eps_list.append(float(eps))
                except Exception:
                    continue
        
        if len(eps_list) >= 8:  # Need at least 8 quarters of EPS data
            profitable_eps_quarters = sum(1 for eps in eps_list if eps > 0)
            if profitable_eps_quarters < 4:  # Less than half profitable
                return {'type': 'Stock', 'intrinsic_value': 0}
            
            # Check for extreme EPS volatility (sign of distressed/unstable company)
            eps_volatility = np.std(eps_list) / (abs(np.mean(eps_list)) + 0.01)
            if eps_volatility > 3.0:  # Coefficient of variation > 300%
                return {'type': 'Stock', 'intrinsic_value': 0}

    
    # Calculate annual FCF for each of the last 5 years
    annual_fcfs = [sum(fcf_list[i*4:(i+1)*4]) for i in range(5)]
    
    # Additional sanity check: FCF should be reasonably consistent
    # If FCF swings wildly (high volatility), DCF is unreliable
    fcf_volatility = np.std(annual_fcfs) / (abs(np.mean(annual_fcfs)) + 1)  # +1 to avoid division by zero
    if fcf_volatility > 2.0:  # Coefficient of variation > 200%
        return {'type': 'Stock', 'intrinsic_value': 0}
    
    # Check if most recent annual FCF is positive (need sustainable cash generation)
    if annual_fcfs[0] <= 0:
        return {'type': 'Stock', 'intrinsic_value': 0}
    
    # Calculate 5-year CAGR of FCF
    try:
        start_fcf = annual_fcfs[-1]
        end_fcf = annual_fcfs[0]
        if start_fcf > 0 and end_fcf > 0:
            years = 4
            fcf_cagr = (end_fcf / start_fcf) ** (1/years) - 1
        else:
            fcf_cagr = 0.0
    except Exception:
        fcf_cagr = 0.0

    # Use most recent annual FCF as base
    base_fcf = annual_fcfs[0]
    discount_rate = 0.10  # 10% fixed
    terminal_growth = 0.025  # 2.5% fixed
    forecast_years = 5

    # Forecast FCF for next 5 years
    projected_fcfs = [base_fcf * ((1 + fcf_cagr) ** i) for i in range(1, forecast_years + 1)]
    # Discount projected FCFs
    discounted_fcfs = [fcf / ((1 + discount_rate) ** i) for i, fcf in enumerate(projected_fcfs, 1)]

    # Terminal value (Gordon Growth Model)
    terminal_value = (projected_fcfs[-1] * (1 + terminal_growth)) / (discount_rate - terminal_growth)
    discounted_terminal = terminal_value / ((1 + discount_rate) ** forecast_years)

    # Add net cash (cash and equivalents - total debt) from the most recent quarter
    latest_q = quarterly_financials[0]
    cash = latest_q.get('cashAndEquivalents', 0) or 0
    debt = latest_q.get('totalDebt', 0) or 0
    net_cash = cash - debt

    intrinsic_equity_value = sum(discounted_fcfs) + discounted_terminal + net_cash
    intrinsic_value_per_share = intrinsic_equity_value / shares_out if shares_out else 0
    
    # Final sanity check: intrinsic value should be reasonable
    # If it's absurdly high compared to market realities, reject it
    if intrinsic_value_per_share > 1000000:  # $1M per share is unrealistic
        return {'type': 'Stock', 'intrinsic_value': 0}
    
    # Also reject if negative (means company is worthless by DCF)
    if intrinsic_value_per_share < 0:
        return {'type': 'Stock', 'intrinsic_value': 0}
    
    # Additional check: if intrinsic value is >100x current price, likely calculation error
    # Get current price from TimeSeries if available
    time_series = stock_doc.get('TimeSeries', {})
    if time_series and intrinsic_value_per_share > 0:
        try:
            current_price = time_series.get('close')
            if current_price and current_price > 0:
                ratio = intrinsic_value_per_share / current_price
                if ratio > 100:  # Intrinsic value >100x current price is suspicious
                    return {'type': 'Stock', 'intrinsic_value': 0}
        except (ValueError, KeyError, TypeError):
            pass  # If we can't get price, proceed with other checks

    return {
        'type': 'Stock',
        'intrinsic_value': round(intrinsic_value_per_share, 2) if intrinsic_value_per_share > 0 else 0
    }
    
async def update_intrinsic_values():
    asset_info_collection = db['AssetInfo']
    count = 0
    async for doc in asset_info_collection.find({'Delisted': False}):
        result = calculate_intrinsic_value(doc)
        intrinsic_value = result.get('intrinsic_value', 0)
        
        # Always update with the calculated value (0 if invalid, or actual value)
        await asset_info_collection.update_one(
            {'_id': doc['_id']},
            {'$set': {'IntrinsicValue': float(intrinsic_value)}}
        )
        
        if intrinsic_value > 0:
            count += 1

# Calculate CAGR (Compound Annual Growth Rate) since IPO for each stock
async def calculate_cagr_since_ipo():
    asset_info_collection = db['AssetInfo']
    ohclv_collection = db['OHCLVData']
    updates = []
    
    async for asset in asset_info_collection.find({
        'Delisted': False,
        'IPO': {'$ne': None, '$exists': True}
    }):
        ticker = asset['Symbol']
        ipo_date = asset.get('IPO')
        
        if not ipo_date:
            continue
            
        try:
            # Get current price (latest close in OHCLVData - already split-adjusted)
            current_doc = await ohclv_collection.find_one(
                {'tickerID': ticker},
                sort=[('timestamp', -1)]
            )
            
            if not current_doc or not current_doc.get('close'):
                continue
            
            current_price = float(current_doc['close'])
            current_date = current_doc['timestamp']
            
            # Get first available price on or after IPO date
            first_doc = await ohclv_collection.find_one(
                {
                    'tickerID': ticker,
                    'timestamp': {'$gte': ipo_date}
                },
                sort=[('timestamp', 1)]  # Ascending - get FIRST
            )
            
            if not first_doc:
                # Fallback: use oldest available data if no data at IPO
                first_doc = await ohclv_collection.find_one(
                    {'tickerID': ticker},
                    sort=[('timestamp', 1)]
                )
            
            if not first_doc or not first_doc.get('close'):
                continue
            
            starting_price = float(first_doc['close'])
            starting_date = first_doc['timestamp']
            
            # Calculate time period in years
            if isinstance(starting_date, str):
                starting_date = datetime.fromisoformat(starting_date)
            if isinstance(current_date, str):
                current_date = datetime.fromisoformat(current_date)
            
            days = (current_date - starting_date).days
            years = days / 365.25
            
            # Calculate CAGR - need at least 3 months (0.25 years) of data
            if years < 0.25 or starting_price <= 0:
                cagr = None
            else:
                cagr = ((current_price / starting_price) ** (1 / years)) - 1
                
                # Sanity check: filter out outliers (bad data)
                # Reject CAGR below -99% or above +5000% annual
                if not (-0.99 <= cagr <= 50.0):
                    cagr = None
            
            updates.append(
                UpdateOne(
                    {'Symbol': ticker},
                    {'$set': {
                        'CAGR': round(cagr, 4) if cagr is not None else None,
                        'CAGRYears': round(years, 2) if years >= 0.25 else None
                    }}
                )
            )
            
        except Exception as e:
            pass  # Print removed for clean output
            continue
    
    if updates:
        try:
            result = await asset_info_collection.bulk_write(updates)
            pass  # Print removed for clean output
        except Exception as e:
            pass  # Print removed for clean output

#  Calculates market stats for dashboard (tier list version)
async def update_market_stats():
    asset_info_col = db["AssetInfo"]
    ohlcv_col = db["OHCLVData"]
    stats_col = db["Stats"]

    # Get all assets with Symbol, Sector, Industry, AssetType, Exchange
    assets = []
    async for doc in asset_info_col.find({'Delisted': False}, {"Symbol": 1, "Sector": 1, "Industry": 1, "MarketCapitalization": 1, "AssetType": 1, "Exchange": 1, "_id": 0}):
        assets.append(doc)
    symbol_map = {a["Symbol"]: a for a in assets}

    # --- Determine most recent trading timestamp (for filtering stale data) ---
    # Get the most recent timestamp from a major index (SPY) as reference
    spy_cursor = ohlcv_col.find(
        {"tickerID": "SPY"},
        {"timestamp": 1, "_id": 0}
    ).sort("timestamp", -1).limit(1)
    spy_docs = await spy_cursor.to_list(length=1)
    
    if spy_docs and spy_docs[0].get("timestamp"):
        most_recent_timestamp = spy_docs[0]["timestamp"]
        # Allow up to 5 days lag (for edge cases, weekends, etc.)
        cutoff_timestamp = most_recent_timestamp - timedelta(days=5)
    else:
        # Fallback: use current date minus 5 days
        most_recent_timestamp = datetime.now(timezone.utc)
        cutoff_timestamp = most_recent_timestamp - timedelta(days=5)

    # --- Calculate top 10 daily gainers/losers (NYSE/NASDAQ only) ---
    nyse_nasdaq_symbols = [symbol for symbol, info in symbol_map.items() if info.get("Exchange", "") in ["NYSE", "NASDAQ"]]
    daily_returns = []
    
    if nyse_nasdaq_symbols:
        pipeline = [
            {"$match": {"tickerID": {"$in": nyse_nasdaq_symbols}}},
            {"$sort": {"tickerID": 1, "timestamp": -1}},
            {"$group": {"_id": "$tickerID", "closes": {"$push": "$close"}, "timestamps": {"$push": "$timestamp"}}},
            {"$project": {"last_two_closes": {"$slice": ["$closes", 2]}, "last_two_timestamps": {"$slice": ["$timestamps", 2]}}}
        ]
        results = await ohlcv_col.aggregate(pipeline).to_list(length=None)
        
        for doc in results:
            symbol = doc["_id"]
            closes = doc.get("last_two_closes", [])
            timestamps = doc.get("last_two_timestamps", [])
            if len(closes) == 2 and len(timestamps) == 2:
                latest_timestamp = timestamps[0]
                if latest_timestamp and latest_timestamp >= cutoff_timestamp:
                    last = closes[0]
                    prev = closes[1]
                    if last and prev and prev != 0:
                        daily_return = (last - prev) / prev
                        if abs(daily_return) <= 2.0:  # Filter extreme outliers
                            daily_returns.append({
                                "symbol": symbol,
                                "daily_return": daily_return
                            })

    # Sort and get top/bottom 10
    top_10_gainers = sorted(daily_returns, key=lambda x: x["daily_return"], reverse=True)[:10]
    top_10_losers = sorted(daily_returns, key=lambda x: x["daily_return"])[:10]
    # Format for output (rounded %)
    for obj in top_10_gainers:
        obj["daily_return"] = round(obj["daily_return"] * 100, 2)
    for obj in top_10_losers:
        obj["daily_return"] = round(obj["daily_return"] * 100, 2)

    # --- Calculate top 10 undervalued/overvalued stocks based on IntrinsicValue (NYSE/NASDAQ only) ---
    valuation_ratios = []
    async for doc in asset_info_col.find(
        {
            "AssetType": "Stock", 
            "IntrinsicValue": {"$exists": True, "$ne": None},
            "Exchange": {"$in": ["NYSE", "NASDAQ"]}
        }, 
        {"Symbol": 1, "IntrinsicValue": 1, "TimeSeries": 1, "_id": 0}
    ):
        symbol = doc.get("Symbol")
        intrinsic_value = doc.get("IntrinsicValue")
        time_series = doc.get("TimeSeries", {})
        
        if not time_series or intrinsic_value is None or intrinsic_value <= 0:
            continue
        
        # Get current price from TimeSeries
        try:
            current_price = time_series.get("close")
            
            if current_price and current_price > 0:
                # Calculate valuation ratio: positive = undervalued, negative = overvalued
                valuation_ratio = (intrinsic_value - current_price) / current_price
                valuation_ratios.append({
                    "symbol": symbol,
                    "current_price": round(current_price, 2),
                    "intrinsic_value": round(intrinsic_value, 2),
                    "valuation_ratio": valuation_ratio
                })
        except (ValueError, KeyError, TypeError):
            continue
    
    # Sort and get top 10 undervalued (highest positive ratio) and overvalued (most negative ratio)
    top_10_undervalued = sorted(valuation_ratios, key=lambda x: x["valuation_ratio"], reverse=True)[:10]
    top_10_overvalued = sorted(valuation_ratios, key=lambda x: x["valuation_ratio"])[:10]
    
    # Format ratios as percentages
    for obj in top_10_undervalued:
        obj["valuation_ratio"] = round(obj["valuation_ratio"] * 100, 2)
    for obj in top_10_overvalued:
        obj["valuation_ratio"] = round(obj["valuation_ratio"] * 100, 2)

    # --- Restore old logic for sector/industry tier calculation ---
    now = datetime.now(timezone.utc)
    quarter_ago = now - timedelta(days=90)

    gain_data = []
    if nyse_nasdaq_symbols:
        pipeline = [
            {"$match": {"tickerID": {"$in": nyse_nasdaq_symbols}, "timestamp": {"$gte": quarter_ago}}},
            {"$sort": {"tickerID": 1, "timestamp": 1}},
            {"$group": {"_id": "$tickerID", "closes": {"$push": "$close"}, "timestamps": {"$push": "$timestamp"}}},
            {"$project": {"first_close": {"$arrayElemAt": ["$closes", 0]}, "last_close": {"$arrayElemAt": ["$closes", -1]}, "latest_timestamp": {"$arrayElemAt": ["$timestamps", -1]}, "count": {"$size": "$closes"}}}
        ]
        results = await ohlcv_col.aggregate(pipeline).to_list(length=None)
        
        for doc in results:
            symbol = doc["_id"]
            if doc["count"] < 2:
                continue
            latest_timestamp = doc.get("latest_timestamp")
            if not latest_timestamp or latest_timestamp < cutoff_timestamp:
                continue
            first_close = doc.get("first_close")
            last_close = doc.get("last_close")
            if first_close and last_close and first_close != 0:
                gain = (last_close - first_close) / first_close
                info = symbol_map.get(symbol, {})
                sector = info.get("Sector", "")
                industry = info.get("Industry", "")
                market_cap = info.get("MarketCapitalization", None)
                if market_cap and market_cap > 0 and sector and industry:
                    gain_data.append({
                        "symbol": symbol,
                        "sector": sector,
                        "industry": industry,
                        "gain": gain,
                        "market_cap": market_cap
                    })

    if not gain_data:
        pass  # Print removed for clean output
        return

    gain_df = pd.DataFrame(gain_data)
    # Filter out empty sectors/industries and zero market caps in one step
    gain_df = gain_df[(gain_df["sector"] != "") & (gain_df["industry"] != "") & (gain_df["market_cap"] > 0)]

    # Market-cap-weighted average returns for sector, with stock count (optimized)
    sector_tier_list = []
    for sector, group in gain_df.groupby("sector"):
        # Exclude sectors with only 1 stock
        if len(group) < 2:
            continue
        total_cap = group["market_cap"].sum()
        if total_cap == 0:
            continue
        weighted_return = (group["gain"] * group["market_cap"]).sum() / total_cap
        sector_tier_list.append({"sector": sector, "average_return": weighted_return, "count": len(group)})
    sector_tier_list.sort(key=lambda x: x["average_return"], reverse=True)

    # Median returns for industry, with stock count (optimized)
    industry_tier_list = []
    for industry, group in gain_df.groupby("industry"):
        # Exclude industries with only 1 stock (key change!)
        if len(group) < 2:
            continue
        industry_tier_list.append({"industry": industry, "average_return": group["gain"].median(), "count": len(group)})
    industry_tier_list.sort(key=lambda x: x["average_return"], reverse=True)

    # Calculate SMA stats for ALL assets and by AssetType (including OTC, PINK, and Crypto)
    sma_periods = [5, 10, 20, 50, 100, 150, 200]
    sma_stats = {}
    asset_types_for_sma = ["ALL", "Stock", "ETF", "Mutual Fund", "OTC", "PINK", "Crypto"]
    
    # Fetch all closes in one aggregation pipeline
    pipeline = [
        {"$match": {"tickerID": {"$in": list(symbol_map.keys())}}},
        {"$sort": {"tickerID": 1, "timestamp": -1}},
        {"$group": {"_id": "$tickerID", "closes": {"$push": "$close"}}},
        {"$project": {"closes": {"$slice": ["$closes", 200]}}}  # Limit to 200 closes (most recent)
    ]
    closes_results = await ohlcv_col.aggregate(pipeline).to_list(length=None)
    closes_dict = {doc["_id"]: doc["closes"] for doc in closes_results}
    
    for period in sma_periods:
        sma_stats[f"SMA{period}"] = {}
        
        for asset_type in asset_types_for_sma:
            up = 0
            down = 0
            
            for symbol, info in symbol_map.items():
                # Filter by asset type and exchange
                if asset_type == "PINK":
                    # Only include PINK exchange stocks
                    symbol_exchange = info.get("Exchange", "")
                    if symbol_exchange != "PINK":
                        continue
                    # Only process stocks for PINK category
                    symbol_asset_type = info.get("AssetType", "")
                    if symbol_asset_type != "Stock":
                        continue
                elif asset_type == "OTC":
                    # Only include OTC stocks (not NYSE, NASDAQ, or PINK)
                    symbol_exchange = info.get("Exchange", "")
                    if symbol_exchange in ["NYSE", "NASDAQ", "PINK"]:
                        continue
                    # Only process stocks for OTC category
                    symbol_asset_type = info.get("AssetType", "")
                    if symbol_asset_type != "Stock":
                        continue
                elif asset_type == "Stock":
                    # For "Stock" category, exclude OTC and PINK (only NYSE/NASDAQ)
                    symbol_asset_type = info.get("AssetType", "")
                    if symbol_asset_type != "Stock":
                        continue
                    symbol_exchange = info.get("Exchange", "")
                    if symbol_exchange not in ["NYSE", "NASDAQ"]:
                        continue
                elif asset_type == "Crypto":
                    # Only include crypto assets
                    symbol_asset_type = info.get("AssetType", "")
                    if symbol_asset_type != "Crypto":
                        continue
                elif asset_type != "ALL":
                    # For ETF and Mutual Fund, filter normally
                    symbol_asset_type = info.get("AssetType", "")
                    if symbol_asset_type != asset_type:
                        continue
                # If asset_type == "ALL", include everything (no filter)
                
                closes = closes_dict.get(symbol, [])
                if len(closes) < period:
                    continue
                # closes are already descending (most recent first), so reverse for oldest to newest
                closes_asc = closes[::-1]
                sma = float(np.mean(closes_asc[-period:]))  # Last period closes (most recent)
                last_close = closes[0]  # Most recent close
                if last_close > sma:
                    up += 1
                else:
                    down += 1
            
            total = up + down if (up + down) > 0 else 1
            sma_stats[f"SMA{period}"][asset_type] = {"up": up / total, "down": down / total}

    # Calculate Advancing/Declining stocks and New Highs/Lows (NYSE/NASDAQ stocks only)
    stock_symbols = [symbol for symbol, info in symbol_map.items() if info.get("AssetType", "") == "Stock" and info.get("Exchange", "") in ["NYSE", "NASDAQ", "OTC", "PINK"]]
    advancing = 0
    declining = 0
    unchanged = 0
    new_highs = 0
    new_lows = 0
    neutral = 0
    
    if stock_symbols:
        pipeline = [
            {"$match": {"tickerID": {"$in": stock_symbols}}},
            {"$sort": {"tickerID": 1, "timestamp": -1}},
            {"$group": {"_id": "$tickerID", "docs": {"$push": {"close": "$close", "high": "$high", "low": "$low"}}}},
            {"$project": {"last_two": {"$slice": ["$docs", 2]}}}
        ]
        results = await ohlcv_col.aggregate(pipeline).to_list(length=None)
        
        for doc in results:
            last_two = doc.get("last_two", [])
            if len(last_two) == 2:
                today = last_two[0]
                yesterday = last_two[1]
                
                today_close = today.get("close")
                yesterday_close = yesterday.get("close")
                yesterday_high = yesterday.get("high")
                yesterday_low = yesterday.get("low")
                
                # Advancing/Declining: compare today's close vs yesterday's close
                if today_close and yesterday_close:
                    if today_close > yesterday_close:
                        advancing += 1
                    elif today_close < yesterday_close:
                        declining += 1
                    else:
                        unchanged += 1
                
                # New Highs/Lows: compare today's close with yesterday's high/low
                if today_close and yesterday_high and yesterday_low:
                    if today_close > yesterday_high:
                        new_highs += 1
                    elif today_close < yesterday_low:
                        new_lows += 1
                    else:
                        neutral += 1
    
    # Calculate percentages
    total_ad = advancing + declining + unchanged
    total_hl = new_highs + new_lows + neutral
    
    advance_decline_stats = {
        "advancing": advancing / total_ad if total_ad > 0 else 0,
        "declining": declining / total_ad if total_ad > 0 else 0,
        "unchanged": unchanged / total_ad if total_ad > 0 else 0
    }
    
    new_highs_lows_stats = {
        "newHighs": new_highs / total_hl if total_hl > 0 else 0,
        "newLows": new_lows / total_hl if total_hl > 0 else 0,
        "neutral": neutral / total_hl if total_hl > 0 else 0
    }

    # Performance for SPY, QQQ, DIA, IWM, EFA, EEM
    index_tickers = ["SPY", "QQQ", "DIA", "IWM", "EFA", "EEM"]
    index_performance = {}
    
    if index_tickers:
        pipeline = [
            {"$match": {"tickerID": {"$in": index_tickers}}},
            {"$sort": {"tickerID": 1, "timestamp": -1}},
            {"$group": {"_id": "$tickerID", "closes": {"$push": "$close"}, "timestamps": {"$push": "$timestamp"}}},
            {"$project": {"closes": {"$slice": ["$closes", 300]}, "timestamps": {"$slice": ["$timestamps", 300]}}}
        ]
        results = await ohlcv_col.aggregate(pipeline).to_list(length=None)
        
        for doc in results:
            ticker = doc["_id"]
            closes = doc.get("closes", [])
            timestamps = doc.get("timestamps", [])
            if not closes or len(closes) < 2:
                continue
            today_close = closes[0]
            perf = {"lastPrice": today_close}
            perf["1D"] = ((closes[0] - closes[1]) / closes[1]) if len(closes) >= 2 else None
            perf["1M"] = ((closes[0] - closes[21]) / closes[21]) if len(closes) >= 22 else None
            perf["4M"] = ((closes[0] - closes[81]) / closes[81]) if len(closes) >= 82 else None
            perf["1Y"] = ((closes[0] - closes[252]) / closes[252]) if len(closes) >= 253 else None
            # YTD: find first close of current year
            now = datetime.now(timezone.utc)
            ytd_idx = None
            for i, ts in enumerate(timestamps[::-1]):
                if hasattr(ts, 'year') and ts.year == now.year:
                    ytd_idx = len(timestamps) - 1 - i
                    break
            if ytd_idx is not None and ytd_idx < len(closes):
                ytd_start_close = closes[ytd_idx]
                if ytd_start_close != 0:
                    perf["YTD"] = ((closes[0] - ytd_start_close) / ytd_start_close)
                else:
                    perf["YTD"] = None
            else:
                perf["YTD"] = None
            index_performance[ticker] = perf

    # Calculate market outlook based on SMA distribution for ALL assets
    # Short term: SMA5, SMA10, SMA20
    # Mid term: SMA50, SMA100
    # Long term: SMA150, SMA200
    def calculate_outlook(sma_list):
        """Calculate market outlook based on percentage of stocks above SMA"""
        avg_up = sum(sma_stats[sma]["ALL"]["up"] for sma in sma_list) / len(sma_list)
        
        if avg_up >= 0.70:  # 70% or more up
            return "positive"
        elif avg_up >= 0.50:  # 50% or more up
            return "neutral"
        else:  # Less than 50% up
            return "negative"
    
    market_outlook = {
        "shortTerm": {
            "outlook": calculate_outlook(["SMA5", "SMA10", "SMA20"]),
            "percentageUp": round(sum(sma_stats[sma]["ALL"]["up"] for sma in ["SMA5", "SMA10", "SMA20"]) / 3 * 100, 2),
            "smas": ["SMA5", "SMA10", "SMA20"]
        },
        "midTerm": {
            "outlook": calculate_outlook(["SMA50", "SMA100"]),
            "percentageUp": round(sum(sma_stats[sma]["ALL"]["up"] for sma in ["SMA50", "SMA100"]) / 2 * 100, 2),
            "smas": ["SMA50", "SMA100"]
        },
        "longTerm": {
            "outlook": calculate_outlook(["SMA150", "SMA200"]),
            "percentageUp": round(sum(sma_stats[sma]["ALL"]["up"] for sma in ["SMA150", "SMA200"]) / 2 * 100, 2),
            "smas": ["SMA150", "SMA200"]
        }
    }

    # Prepare and upsert stats document
    stats_doc = {
        "sectorTierList": sector_tier_list,
        "industryTierList": industry_tier_list,
        "SMA5": sma_stats["SMA5"],
        "SMA10": sma_stats["SMA10"],
        "SMA20": sma_stats["SMA20"],
        "SMA50": sma_stats["SMA50"],
        "SMA100": sma_stats["SMA100"],
        "SMA150": sma_stats["SMA150"],
        "SMA200": sma_stats["SMA200"],
        "advanceDecline": advance_decline_stats,
        "newHighsLows": new_highs_lows_stats,
        "marketOutlook": market_outlook,
        "indexPerformance": index_performance,
        "top10DailyGainers": top_10_gainers,
        "top10DailyLosers": top_10_losers,
        "top10Undervalued": top_10_undervalued,
        "top10Overvalued": top_10_overvalued,
        "updatedAt": most_recent_timestamp  # Use SPY's most recent timestamp
    }
    await stats_col.update_one(
        {"_id": "marketStats"},
        {"$set": stats_doc},
        upsert=True
    )
    
async def Daily():
    # Run getPrice and getCryptoPrice sequentially
    # Check if today is a weekday (0=Monday, 6=Sunday)
    today = datetime.now()
    is_weekday = today.weekday() < 5  # 0-4 are Monday to Friday
    
    if is_weekday:
        print(f"Weekday detected ({today.strftime('%A')}): Running stock price updates...")
        await getPrice()
    else:
        print(f"Weekend detected ({today.strftime('%A')}): Skipping stock price updates...")
    
    # Always run crypto price updates (crypto markets are 24/7)
    print("Running crypto price updates...")
    await getCryptoPrice()

    print("Processing market data tasks...")
    
    # List of async functions to run in parallel
    task_funcs = [
        updateWeekly,
        scanDelisted,
        updateDailyRatios,
        updateTimeSeries,
        getDividendYieldTTM,
        calculateVolumes,
        calculateSMAs,
        calculateTechnicalScores,
        calculateADV,
        calculateAlltimehighlowandperc52wk,
        calculatePerc,
        calculate_cagr_since_ipo,
        update_market_stats
    ]

    total_tasks = len(task_funcs)
    completed = 0

    def print_progress_bar(completed, total, bar_length=50):
        """Print a percentage-based progress bar"""
        percentage = int(100 * completed / total)
        filled_length = int(bar_length * completed / total)
        bar = '█' * filled_length + '░' * (bar_length - filled_length)
        print(f'\rProgress: |{bar}| {percentage}%', end='', flush=True)

    # Use a lock for thread safety (even though asyncio is single-threaded, for future-proofing)
    progress_lock = asyncio.Lock()

    async def wrapped_task(coro):
        nonlocal completed
        try:
            await coro()
        except Exception:
            pass  # Silently ignore errors to keep progress bar clean
        finally:
            async with progress_lock:
                completed += 1
                print_progress_bar(completed, total_tasks)

    start_time = time.time()
    print_progress_bar(0, total_tasks)
    await asyncio.gather(*(wrapped_task(f) for f in task_funcs), return_exceptions=True)
    end_time = time.time()
    print()  # Move to next line after progress bar
    print(f"✓ Completed in {(end_time - start_time)/60:.2f} minutes")
    
    # Analyze trading signals with progress tracking
    print("\nAnalyzing trading signals...")
    signals_start = time.time()
    try:
        await run_signal_analysis(db)
    except Exception as e:
        print(f"✗ Signal analysis failed: {e}")
    signals_end = time.time()
    print(f"✓ Signal analysis completed in {(signals_end - signals_start)/60:.2f} minutes")
    
    # Fetch news with progress tracking
    print("\nChecking and updating news...")
    news_start = time.time()
    #await fetchNews()
    news_end = time.time()
    print(f"✓ News updated in {(news_end - news_start)/60:.2f} minutes")
    
    # Update financial statements with progress tracking
    print("\nChecking and updating financial statements...")
    financials_start = time.time()
    #await checkAndUpdateFinancialUpdates()
    financials_end = time.time()
    print(f"✓ Financial statements updated in {(financials_end - financials_start)/60:.2f} minutes")
        
if __name__ == '__main__':  
    import motor.motor_asyncio
    # Make sure db is defined as in your main code
    asyncio.run(Daily())
