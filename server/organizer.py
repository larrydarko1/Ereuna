#from ipo import IPO, updateSummarySingle, getSummary2Single, getSplitsSingle, getDividendsSingle, getFinancialsSingle
from delist import Delist, scanDelisted, prune_intraday_collections
import os
import time
import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta, timezone
import datetime as dt
from dotenv import load_dotenv
import motor.motor_asyncio
from pymongo import UpdateOne, DeleteOne, InsertOne
import asyncio
import logging

logger = logging.getLogger("organizer")
logger.setLevel(logging.INFO)

from helper import (
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
mongo_client = motor.motor_asyncio.AsyncIOMotorClient(mongo_uri)
db = mongo_client['EreunaDB']

#updates symbol, name, description, IPO, exchange, sector, industry, location, currency, country
async def getSummary():
    start_time = time.time()
    collection = db['AssetInfo']
    tickers = [doc['Symbol'] async for doc in collection.find({})]
    print('checking for summary updates')

    # Fetch meta data for all tickers
    url = f'https://api.tiingo.com/tiingo/fundamentals/meta?token={api_key}'
    response = requests.get(url)
    meta_data = response.json() if response.status_code == 200 else []

    for ticker in tickers:
        print(f'scanning {ticker}')
        url = f'https://api.tiingo.com/tiingo/daily/{ticker}?token={api_key}'
        response = requests.get(url)

        if response.status_code == 200:
            data = response.json()

            if data is None:
                print(f'No data found for {ticker}')
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
                    print(f'new summary data found for {ticker}, updating')
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
                    print(f'{ticker} Summary Updated Successfully')
                else:
                    print(f'No changes found for {ticker}')

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
                    print(f'{ticker} Summary Data Updated Successfully')
                else:
                    print(f'No meta data found for {ticker}')
            else:
                print(f"No document found for {ticker}")
        else:
            print(f"Error fetching data for {ticker}: {response.status_code}")
    end_time = time.time()
    execution_time_in_seconds = end_time - start_time
    execution_time_in_minutes = execution_time_in_seconds / 60
    print(f'get_and_update_summary took {execution_time_in_minutes:.2f} minutes to execute')

#gets full splits history 
async def getFullSplits():
    ohclv_data_collection = db['OHCLVData']
    asset_info_collection = db['AssetInfo']
    updates = []

    async for asset_info in asset_info_collection.find({}):
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
            print(f'Updated splits for ticker: {ticker}')
        except Exception as e:
            print(f'Error updating splits for ticker: {ticker} - {str(e)}')

    if updates:
        try:
            result = await asset_info_collection.bulk_write(updates)
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")

#gets full dividend history 
async def getFullDividends():
    ohclv_data_collection = db['OHCLVData']
    asset_info_collection = db['AssetInfo']
    updates = []

    async for asset_info in asset_info_collection.find({}):
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
            print(f'Updated dividends for ticker: {ticker}')
        except Exception as e:
            print(f'Error updating dividends for ticker: {ticker} - {str(e)}')

    if updates:
        try:
            result = await asset_info_collection.bulk_write(updates)
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")
   
#gets full financials again from scratch 
async def getFinancials():
    maintenanceMode(True)
    collection = db['AssetInfo']

    tickers2 = [doc['Symbol'] async for doc in collection.find({})]

    for ticker in tickers2:
        print(f'processing {ticker}')
        url = f'https://api.tiingo.com/tiingo/fundamentals/{ticker}/statements?token={api_key}'
        response = requests.get(url)

        if response.status_code == 200:
            data = response.json()

            result = await collection.find_one({'Symbol': ticker})

            if result:
                quarterly_earnings_data = []
                annual_earnings_data = []
                quarterly_financials_data = []
                annual_financials_data = []
                for statement in data:
                    date_str = statement['date']
                    date = datetime.strptime(date_str, '%Y-%m-%d')
                    quarter = statement['quarter']

                    earnings_data = {
                        'fiscalDateEnding': date,
                        'reportedEPS': 0
                    }

                    financial_data = {
                        'fiscalDateEnding': date,
                        'totalRevenue': 0,
                        'netIncome': 0
                    }

                    if 'statementData' in statement and 'incomeStatement' in statement['statementData']:
                        income_statement = statement['statementData']['incomeStatement']
                        eps = next((item for item in income_statement if item['dataCode'] == 'eps'), None)
                        revenue = next((item for item in income_statement if item['dataCode'] == 'revenue'), None)
                        netinc = next((item for item in income_statement if item['dataCode'] == 'netinc'), None)

                        if eps:
                            earnings_data['reportedEPS'] = eps['value'] or 0

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
                        annual_earnings_data.append(earnings_data)
                        annual_financials_data.append(financial_data)
                    else:
                        quarterly_earnings_data.append(earnings_data)
                        quarterly_financials_data.append(financial_data)

                await collection.update_one({'Symbol': ticker}, {'$set': {
                    'quarterlyEarnings': quarterly_earnings_data,
                    'annualEarnings': annual_earnings_data,
                    'quarterlyFinancials': quarterly_financials_data,
                    'AnnualFinancials': annual_financials_data
                }})
                print(f"Successfully updated financial data for {ticker}")
            else:
                print(f"No document found for {ticker}")
        else:
            print(f"Error fetching data for {ticker}: {response.status_code}")
    maintenanceMode(False)

#uploads full ohclvdata from scratch, don't use everyday    
async def getHistoricalPrice():
    daily_collection = db["OHCLVData"]
    asset_info_collection = db["AssetInfo"]

    async for asset_info in asset_info_collection.find({}):
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
                        
                print(f"Successfully processed {ticker}")
            else:
                print(f"No data found for {ticker}")
        else:
            print(f"Error: {response.text}")
            


# get daily OHCLV Data day after day
async def getPrice():
    daily_collection = db["OHCLVData"]
    asset_info_collection = db["AssetInfo"]

    # Fetch all data at once
    url = f'https://api.tiingo.com/tiingo/daily/prices?token={api_key}'
    response = requests.get(url)

    if response.status_code == 200:
        data = response.json()

        # Get symbols from AssetInfo collection (async)
        symbols = [doc['Symbol'] async for doc in asset_info_collection.find({})]

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
                    Split(doc['tickerID'], doc['timestamp'], doc['splitFactor'])
                if doc['divCash'] != 0 and doc['divCash'] != 0.0:
                    Dividends(doc['tickerID'], doc['timestamp'], doc['divCash'])

            # For each new daily document, delete any existing with same tickerID and timestamp, then insert
            for daily_doc in daily_data_dict:
                await daily_collection.delete_many({
                    'tickerID': daily_doc['tickerID'],
                    'timestamp': daily_doc['timestamp']
                })
                await daily_collection.insert_one(daily_doc)
                print(f"Upserted daily document for {daily_doc['tickerID']} on {daily_doc['timestamp']}")

        else:
            print("No data found for the specified tickers.")
    else:
        print(f"Error: {response.text}")
        
# Get Monday date of this week
today = dt.date.today()
monday = dt.datetime.combine(today - dt.timedelta(days=today.weekday()), dt.time())

#updates weekly candles 
async def updateWeekly():
    # Delete all filtered documents on OHCLVData2 (assume this is sync, update if needed)
    remove_documents_with_timestamp(monday.strftime('%Y-%m-%dT%H:%M:%S.%f+00:00'))

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

    # Log the results
    for result in results:
        print("Result:")
        print(result)

    # Update the weekly documents inside OHCLVData2
    updates = []
    for result in results:
        if result['documents']:
            updates.append(
                InsertOne({
                    'tickerID': result['_id'],
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
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")
              
#updates MarketCap, PE, PB, PEG , PS, RSI, Gap%
async def updateDailyRatios():
    ohclv_collection = db['OHCLVData']
    asset_info_collection = db['AssetInfo']
    updates = []

    async for asset_info_doc in asset_info_collection.find({}):
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
                quarterly_earnings = asset_info_doc.get('quarterlyEarnings', [])
                if len(quarterly_earnings) >= 2:
                    most_recent_eps = quarterly_earnings[0].get('reportedEPS', 0)
                    previous_eps = quarterly_earnings[1].get('reportedEPS', 0)
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
                print(f"{ticker} Daily Ratios Updated Successfully")
            else:
                print(f"No OHCLV data found for {ticker}")
        except Exception as e:
            print(f"Error processing {ticker}: {e}")

    if updates:
        try:
            result = await asset_info_collection.bulk_write(updates)
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")
            
#updates splits when triggered 
async def Split(tickerID, timestamp, splitFactor):
    asset_info_collection = db['AssetInfo']

    asset_info_doc = await asset_info_collection.find_one({'Symbol': tickerID})

    if asset_info_doc:
        # Skip if SharesOutstanding is missing
        shares_outstanding = asset_info_doc.get('SharesOutstanding')
        if shares_outstanding is None:
            print(f"SharesOutstanding missing for {tickerID}. Skipping split update.")
            return

        new_split = {
            'effective_date': timestamp,
            'split_factor': splitFactor
        }

        if splitFactor > 0:
            updated_shares = shares_outstanding * splitFactor
        elif splitFactor < 0:
            updated_shares = shares_outstanding / abs(splitFactor)
        else:
            print("Invalid split factor. It should be a non-zero number.")
            return

        await asset_info_collection.update_one(
            {'Symbol': tickerID},
            {'$push': {'splits': new_split}, '$set': {'SharesOutstanding': updated_shares}}
        )

        print(f"Split factor triggered for {tickerID} on {timestamp} with split factor {splitFactor}")
        # If getHistoricalPrice2 is refactored to async, await it here
        getHistoricalPrice2(tickerID)
    else:
        print(f"No document found in AssetInfo for {tickerID}")

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

        print(f"Dividend triggered for {tickerID} on {timestamp} with dividend amount {divCash}")
    else:
        print(f"No document found in AssetInfo for {tickerID}")

#triggers when there's a split, it deleted and reuploads updated ohclvdata
async def getHistoricalPrice2(tickerID):
    daily_collection = db["OHCLVData"]
    weekly_collection = db["OHCLVData2"]

    # Find and delete existing documents for the tickerID (async)
    await daily_collection.delete_many({'tickerID': tickerID})
    await weekly_collection.delete_many({'tickerID': tickerID})

    now = dt.datetime.now()
    url = f'https://api.tiingo.com/tiingo/daily/{tickerID}/prices?token={api_key}&startDate=1990-01-01&endDate={now.strftime("%Y-%m-%d")}'
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

            print(f"Successfully processed {tickerID}")
        else:
            print(f"No data found for {tickerID}")
    else:
        print(f"Error: {response.text}")

#scan endpoints for financial statements updates and update symbol when it does
async def checkAndUpdateFinancialUpdates():
    start_time = time.time()
    collection = db['AssetInfo']
    tickers = [doc['Symbol'] async for doc in collection.find({})]
    print('checking for financial statements updates')
    new_tickers_data = {}

    for ticker in tickers:
        print(f'scanning {ticker}')
        url = f'https://api.tiingo.com/tiingo/fundamentals/{ticker}/statements?token={api_key}'
        response = requests.get(url)

        if response.status_code == 200:
            data = response.json()

            # Find the document in MongoDB where Symbol matches the ticker (async)
            result = await collection.find_one({'Symbol': ticker})

            if result:
                # Process the data
                quarterly_earnings_data = []
                annual_earnings_data = []
                quarterly_financials_data = []
                annual_financials_data = []
                new_data_found = False

                for statement in data:
                    date_str = statement['date']
                    date = datetime.strptime(date_str, '%Y-%m-%d')
                    quarter = statement['quarter']

                    earnings_data = {
                        'fiscalDateEnding': date,
                        'reportedEPS': 0
                    }

                    financial_data = {
                        'fiscalDateEnding': date,
                        'totalRevenue': 0,
                        'netIncome': 0
                    }

                    if 'statementData' in statement and 'incomeStatement' in statement['statementData']:
                        income_statement = statement['statementData']['incomeStatement']
                        eps = next((item for item in income_statement if item['dataCode'] == 'eps'), None)
                        revenue = next((item for item in income_statement if item['dataCode'] == 'revenue'), None)
                        netinc = next((item for item in income_statement if item['dataCode'] == 'netinc'), None)

                        if eps:
                            earnings_data['reportedEPS'] = eps['value'] or 0

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
                        existing_annual_earnings = result.get('annualEarnings', [])
                        existing_annual_earnings_dates = [item['fiscalDateEnding'] for item in existing_annual_earnings]
                        if date not in existing_annual_earnings_dates:
                            new_data_found = True
                            print(f'new annual data found for {ticker}')
                        annual_earnings_data.append(earnings_data)
                        annual_financials_data.append(financial_data)
                    else:
                        existing_quarterly_earnings = result.get('quarterlyEarnings', [])
                        existing_quarterly_earnings_dates = [item['fiscalDateEnding'] for item in existing_quarterly_earnings]
                        if date not in existing_quarterly_earnings_dates:
                            new_data_found = True
                            print(f'new quarterly data found for {ticker}')
                        quarterly_earnings_data.append(earnings_data)
                        quarterly_financials_data.append(financial_data)

                if new_data_found:
                    new_tickers_data[ticker] = {
                        'quarterlyEarnings': quarterly_earnings_data,
                        'annualEarnings': annual_earnings_data,
                        'quarterlyFinancials': quarterly_financials_data,
                        'AnnualFinancials': annual_financials_data
                    }
            else:
                print(f"No document found for {ticker}")
        else:
            print(f"Error fetching data for {ticker}: {response.status_code}")

    maintenanceMode(True)
    # Update the quarterly and annual earnings and financial data in the MongoDB database (async)
    for ticker, data in new_tickers_data.items():
        print(f'processing {ticker}')
        await collection.update_one({'Symbol': ticker}, {'$set': data})
        print(f"Successfully updated earnings and financial data for {ticker}")

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
    maintenanceMode(False)
    end_time = time.time()
    execution_time_in_seconds = end_time - start_time
    execution_time_in_minutes = execution_time_in_seconds / 60
    print(f'checkAndUpdateFinancialUpdates took {execution_time_in_minutes:.2f} minutes to execute')

#updates assetinfo with recent ohclvdata 
async def updateTimeSeries():
    ohclv_collection = db['OHCLVData']
    asset_info_collection = db['AssetInfo']
    updates = []

    print("Updating Asset Time Series...")
    i = 0
    async for asset_info in asset_info_collection.find({}):
        ticker = asset_info['Symbol']
        try:
            recent_doc = await ohclv_collection.find_one(
                {'tickerID': ticker},
                sort=[('timestamp', -1)]
            )
            if recent_doc:
                time_series_data = {
                    '1. open': round(float(recent_doc.get('open', 0)), 2),
                    '2. high': round(float(recent_doc.get('high', 0)), 2),
                    '3. low': round(float(recent_doc.get('low', 0)), 2),
                    '4. close': round(float(recent_doc.get('close', 0)), 2),
                    '5. volume': round(float(recent_doc.get('volume', 0)), 2)
                }
                current_date = recent_doc['timestamp'].strftime('%Y-%m-%d')
                updates.append(
                    UpdateOne(
                        {'Symbol': ticker},
                        {'$set': {
                            'TimeSeries': {current_date: time_series_data}
                        }}
                    )
                )
            i += 1
            count = await asset_info_collection.count_documents({})
            print(f"Processed {i} out of {count} stocks")
        except Exception as e:
            print(f"Error processing {ticker}: {e}")

    if updates:
        try:
            result = await asset_info_collection.bulk_write(updates)
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")
            
#updates dividend yields TTM daily 
async def getDividendYieldTTM():
    collection = db['AssetInfo']

    async for document in collection.find({}):
        ticker = document['Symbol']
        dividends = document.get('dividends', [])
        time_series = document.get('TimeSeries', {})

        if not dividends:
            print(f'No data found for {ticker}')
            # Update the existing document
            await collection.update_one(
                {'Symbol': ticker},
                {'$set': {'DividendYield': None}}
            )
            print(f'{ticker} Dividend Yield TTM Updated Successfully')
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
                # Get the most recent date
                most_recent_date = max(time_series.keys())
                current_stock_price = time_series[most_recent_date].get('4. close')
            if not current_stock_price:
                print(f'No price data for {ticker}, skipping dividend yield calculation.')
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
            print(f'{ticker} Dividend Yield TTM Updated Successfully')
        except Exception as e:
            print(f"Error processing {ticker}: {str(e)}")

#calculates average volume for 1w, 1m, 6m and 1y
async def calculateVolumes():
    ohclv_collection = db["OHCLVData"]
    asset_info_collection = db["AssetInfo"]
    updates = []

    print("Calculating Volumes...")
    i = 0
    async for asset_info in asset_info_collection.find({}):
        ticker = asset_info['Symbol']
        try:
            pipeline = [
                {'$match': {'tickerID': ticker}},
                {'$sort': {'timestamp': -1}},
                {'$project': {'_id': 0, 'volume': 1}}
            ]
            documents = [doc async for doc in ohclv_collection.aggregate(pipeline)]

            volumes = [doc["volume"] for doc in documents]
            avg_volume_1w = sum(volumes[-7:]) / 7 if len(volumes) >= 7 else None
            avg_volume_1m = sum(volumes[-30:]) / 30 if len(volumes) >= 30 else None
            avg_volume_6m = sum(volumes[-180:]) / 180 if len(volumes) >= 180 else None
            avg_volume_1y = sum(volumes[-365:]) / 365 if len(volumes) >= 365 else None
            rel_volume_1w = round(volumes[-1] / avg_volume_1w, 1) if avg_volume_1w else None
            rel_volume_1m = round(volumes[-1] / avg_volume_1m, 1) if avg_volume_1m else None
            rel_volume_6m = round(volumes[-1] / avg_volume_6m, 1) if avg_volume_6m else None
            rel_volume_1y = round(volumes[-1] / avg_volume_1y, 1) if avg_volume_1y else None

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
            count = await asset_info_collection.count_documents({})
            print(f"Processed {i} out of {count} stocks")
        except Exception as e:
            print(f"Error processing {ticker}: {e}")

    if updates:
        try:
            result = await asset_info_collection.bulk_write(updates)
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")

#calculates moving averages (10, 20, 50 and 200DMA)
async def calculateSMAs():
    ohclv_collection = db["OHCLVData"]
    asset_info_collection = db["AssetInfo"]
    updates = []

    print("Calculating Moving Averages...")
    i = 0
    async for asset_info in asset_info_collection.find({}):
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
            count = await asset_info_collection.count_documents({})
            print(f"Processed {i} out of {count} stocks")
        except Exception as e:
            print(f"Error processing {ticker}: {e}")

    if updates:
        try:
            result = await asset_info_collection.bulk_write(updates)
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")

#calulcates technical score 
async def calculateTechnicalScores():
    ohclv_collection = db["OHCLVData"]
    asset_info_collection = db["AssetInfo"]
    updates = []

    print("Calculating Percentage Changes...")
    i = 0
    async for asset_info in asset_info_collection.find({}):
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
            count = await asset_info_collection.count_documents({})
            print(f"Processed {i} out of {count} stocks")
        except Exception as e:
            print(f"Error processing {ticker}: {e}")

    if updates:
        try:
            result = await asset_info_collection.bulk_write(updates)
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")

    print("Calculating RS Scores...")
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
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")

    print("Updating Asset Info...")
    updates = []
    async for asset_info in asset_info_collection.find({}):
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
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")

#calculates both 52wk and all time high/low
async def calculateAlltimehighlowandperc52wk():
    ohclv_data_collection = db['OHCLVData']
    asset_info_collection = db['AssetInfo']
    updates = []

    print("Calculating All-Time Highs, Lows, 52-Week Highs/Lows, and Percentages...")
    i = 0
    async for asset_info in asset_info_collection.find({}):
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
                    print(f"Warning: Non-numeric value found in OHCLV fields for ticker {ticker}")

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
            count = await asset_info_collection.count_documents({})
            print(f"Processed {i} out of {count} stocks")
        except Exception as e:
            print(f"Error processing {ticker}: {e}")

    if updates:
        try:
            result = await asset_info_collection.bulk_write(updates)
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")
 
#caluclates percentage changes for today, wk, 1m, 4m, 6m, 1y, and YTD (althought ytd is still a bit weird)
async def calculatePerc():
    ohclv_collection = db['OHCLVData']
    asset_info_collection = db['AssetInfo']
    updates = []

    print("Calculating Percentage Changes...")
    i = 0
    async for asset_info in asset_info_collection.find({}):
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
            count = await asset_info_collection.count_documents({})
            print(f"Processed {i} out of {count} stocks")
        except Exception as e:
            print(f"Error processing {ticker}: {e}")

    if updates:
        try:
            result = await asset_info_collection.bulk_write(updates)
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")

#calculates average day volatility for specific timespans and updates documents 
async def calculateADV():
    ohclv_collection = db["OHCLVData"]
    asset_info_collection = db["AssetInfo"]
    updates = []

    print("Calculating Volatility Scores...")
    i = 0
    async for asset_info in asset_info_collection.find({}):
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

            # Calculate average daily volatility over specific time spans
            volatility_1w = (np.std(daily_returns[-5:]) / np.mean(close_prices[-5:])) * 100 if len(daily_returns) >= 5 else None
            volatility_1m = (np.std(daily_returns[-20:]) / np.mean(close_prices[-20:])) * 100 if len(daily_returns) >= 20 else None
            volatility_4m = (np.std(daily_returns[-80:]) / np.mean(close_prices[-80:])) * 100 if len(daily_returns) >= 80 else None
            volatility_1y = (np.std(daily_returns[-252:]) / np.mean(close_prices[-252:])) * 100 if len(daily_returns) >= 252 else None

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
            count = await asset_info_collection.count_documents({})
            print(f"Processed {i} out of {count} stocks")
        except Exception as e:
            print(f"Error processing {ticker}: {e}")

    if updates:
        try:
            result = await asset_info_collection.bulk_write(updates)
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")

    print("Done calculating volatility scores.")
    

'''
Qaurterly Section
'''
#calculares QoQ changes        
async def calculate_qoq_changes():
    collection = db['AssetInfo']
    async for doc in collection.find({}):
        ticker = doc['Symbol']
        quarterly_income = doc.get('quarterlyFinancials', [])
        quarterly_earnings = doc.get('quarterlyEarnings', [])
        total_revenue = [float(x.get('totalRevenue', 0)) for x in quarterly_income if x.get('totalRevenue') not in ['', 'None', None]]
        net_income = [float(x.get('netIncome', 0)) for x in quarterly_income if x.get('netIncome') not in ['', 'None', None]]
        reported_eps = [float(x.get('reportedEPS', 0)) for x in quarterly_earnings if x.get('reportedEPS') not in ['', 'None', None]]
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
    async for doc in collection.find({}):
        ticker = doc['Symbol']
        quarterly_income = doc.get('quarterlyFinancials', [])
        quarterly_earnings = doc.get('quarterlyEarnings', [])
        total_revenue = [float(x.get('totalRevenue', 0)) for x in quarterly_income if x.get('totalRevenue') not in ['', 'None', None]]
        net_income = [float(x.get('netIncome', 0)) for x in quarterly_income if x.get('netIncome') not in ['', 'None', None]]
        reported_eps = [float(x.get('reportedEPS', 0)) for x in quarterly_earnings if x.get('reportedEPS') not in ['', 'None', None]]
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
        async for document in collection.find({}):
            ticker = document['Symbol']

            # Check if the quarterlyEarnings array is not empty
            if 'quarterlyEarnings' in document and document['quarterlyEarnings']:
                # Extract the reportedEPS from the first object in the quarterlyEarnings array
                reported_eps = document['quarterlyEarnings'][0].get('reportedEPS')

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
        print("Update successful")

    except Exception as e:
        print("Update failed: ", str(e))

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
    symbols = [doc['Symbol'] async for doc in asset_info_collection.find({})]
    total_inserted = 0
    MAX_NEWS_PER_SYMBOL = 5

    for symbol in symbols:
        api_url = f"https://api.tiingo.com/tiingo/news?tickers={symbol.lower()}&token={api_key}"
        response = requests.get(api_url)

        if response.status_code == 200:
            news_items = response.json()
            # Sort news by publishedDate descending (most recent first)
            news_items.sort(key=lambda x: x.get("publishedDate", ""), reverse=True)
            # Only keep the most recent MAX_NEWS_PER_SYMBOL articles
            news_items = news_items[:MAX_NEWS_PER_SYMBOL]
            documents = []
            for item in news_items:
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
                doc = {
                    "publishedDate": published_date,
                    "title": item.get("title"),
                    "url": item.get("url"),
                    "description": item.get("description"),
                    "source": item.get("source"),
                    "tickers": tickers_upper,
                }
                exists = await news_collection.find_one({
                    "url": doc["url"],
                    "publishedDate": doc["publishedDate"]
                })
                if not exists:
                    documents.append(doc)
            # Remove old news for this symbol if more than MAX_NEWS_PER_SYMBOL exist
            existing_news = [doc async for doc in news_collection.find({"tickers": symbol.upper()}).sort("publishedDate", -1)]
            if len(existing_news) + len(documents) > MAX_NEWS_PER_SYMBOL:
                # Remove oldest to keep only MAX_NEWS_PER_SYMBOL
                to_remove = existing_news[MAX_NEWS_PER_SYMBOL - len(documents):]
                for doc in to_remove:
                    await news_collection.delete_one({"_id": doc["_id"]})
            if documents:
                await news_collection.insert_many(documents)
                total_inserted += len(documents)
                print(f"Inserted {len(documents)} news articles for {symbol}.")
            else:
                print(f"No new news articles found for {symbol}.")
        else:
            print(f"Failed to fetch news for {symbol}: {response.status_code} {response.text}")

    print(f"Total news articles inserted: {total_inserted}")

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
        print(f"Weekly candles generated for {ticker}")
        
def calculate_intrinsic_value(stock_doc):
    # DCF-based intrinsic value calculation (Buffett-style, including net cash)
    quarterly_financials = stock_doc.get('quarterlyFinancials', [])
    shares_out = stock_doc.get('SharesOutstanding', None)
    if not quarterly_financials or len(quarterly_financials) < 20 or not shares_out or shares_out <= 0:
        return {'type': None, 'intrinsic_value': None}

    # Extract last 20 quarters of free cash flow (FCF)
    fcf_list = []
    for q in quarterly_financials[:20]:
        fcf = q.get('freeCashFlow')
        if fcf is not None:
            try:
                fcf_list.append(float(fcf))
            except Exception:
                continue
    if len(fcf_list) < 20:
        return {'type': None, 'intrinsic_value': None}

    # Calculate annual FCF for each of the last 5 years
    annual_fcfs = [sum(fcf_list[i*4:(i+1)*4]) for i in range(5)]
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
    intrinsic_value_per_share = intrinsic_equity_value / shares_out if shares_out else None

    return {
        'type': 'Stock',
        'intrinsic_value': round(intrinsic_value_per_share, 2) if intrinsic_value_per_share else None
    }
    
async def update_intrinsic_values():
    asset_info_collection = db['AssetInfo']
    count = 0
    async for doc in asset_info_collection.find({}):
        result = calculate_intrinsic_value(doc)
        intrinsic_value = result.get('intrinsic_value')
        if intrinsic_value is not None:
            await asset_info_collection.update_one(
                {'_id': doc['_id']},
                {'$set': {'IntrinsicValue': float(intrinsic_value)}}
            )
            count += 1
    print(f"Updated IntrinsicValue for {count} documents in AssetInfo.")
    
async def Daily():
    # Run getPrice first (sequentially)
    await getPrice()

    # List of async functions to run in parallel
    tasks = [
        updateWeekly(),
        scanDelisted(),
        prune_intraday_collections(),
        updateDailyRatios(),
        updateTimeSeries(),
        getDividendYieldTTM(),
        calculateVolumes(),
        calculateSMAs(),
        calculateTechnicalScores(),
        calculateADV(),
        calculateAlltimehighlowandperc52wk(),
        calculatePerc(),
        update_intrinsic_values(),
    ]

    start_time = time.time()
    await asyncio.gather(*tasks)
    end_time = time.time()
    print(f"Total execution time: {(end_time - start_time)/60:.2f} minutes")
    #await checkAndUpdateFinancialUpdates()
    #await fetchNews()

if __name__ == '__main__':  
    import motor.motor_asyncio
    # Make sure db is defined as in your main code
    asyncio.run(Daily())
