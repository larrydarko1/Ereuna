from fastapi import FastAPI
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
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
import time
import requests
from dotenv import load_dotenv
import os
from pymongo import MongoClient, UpdateOne, DeleteOne, InsertOne
from bson import ObjectId
from datetime import datetime
import datetime as dt
import pandas as pd
import numpy as np

#Middleware
app = FastAPI()
scheduler = BackgroundScheduler()
load_dotenv()  
mongo_uri = os.getenv('MONGODB_URI') 
client = MongoClient(mongo_uri)
db = client['EreunaDB']  
api_key = os.getenv('TIINGO_KEY')

#updates symbol, name, description, IPO, exchange, sector, industry, location, currency, country
def getSummary():
    start_time = time.time()
    collection = db['AssetInfo']
    tickers = [doc['Symbol'] for doc in collection.find()]
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
            result = collection.find_one({'Symbol': ticker})

            if result:
                # Check if the data has changed
                if (result.get('Name') != data['name'] or
                    result.get('Description') != data['description'] or
                    result.get('IPO') != (datetime.strptime(data['startDate'], '%Y-%m-%d') if data.get('startDate') else None) or
                    result.get('Exchange') != data['exchangeCode']):
                    print(f'new summary data found for {ticker}, updating')
                    # Update the existing document
                    collection.update_one(
                        {'Symbol': ticker},
                        {'$set': {
                            'Name': data['name'],
                            'Description': data['description'],
                            'IPO': datetime.strptime(data['startDate'], '%Y-%m-%d') if data.get('startDate') else None,  # Convert to BSON date
                            'Exchange': data['exchangeCode']
                        }}
                    )
                    print(f'{ticker} Summary Updated Successfully')
                else:
                    print(f'No changes found for {ticker}')

                # Update meta data
                ticker = ticker.lower()
                ticker_data = next((item for item in meta_data if item['ticker'] == ticker), None)
                if ticker_data is not None:
                    sector = ticker_data.get('sector')
                    industry = ticker_data.get('industry')
                    reporting_currency = ticker_data.get('reportingCurrency')
                    location = ticker_data.get('location')
                    country = location.split(', ')[-1] if location else None
                    address = location if location else None

                    # Update the document in MongoDB where Symbol matches the ticker
                    collection.update_one(
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
def getFullSplits():
    ohclv_data_collection = db['OHCLVData']
    asset_info_collection = db['AssetInfo']
    updates = []

    for asset_info in asset_info_collection.find():
        ticker = asset_info['Symbol']
        try:
            # Find the documents in OHCLVData with the current ticker
            pipeline = [
                {'$match': {'tickerID': ticker}},
                {'$project': {'_id': 0, 'timestamp': 1, 'splitFactor': 1}}
            ]
            ohclv_data = list(ohclv_data_collection.aggregate(pipeline))

            # Initialize a list to store the splits
            splits = []

            # Loop through each document in OHCLVData
            for document in ohclv_data:
                # Check if the split factor is not 1
                if document.get('splitFactor', 1) != 1:
                    # Create a new split document
                    split = {
                        'effective_date': document['timestamp'],
                        'split_factor': document['splitFactor']
                    }
                    # Add the split to the list
                    splits.append(split)

            # Remove the existing splits
            updates.append(
                UpdateOne(
                    {'Symbol': ticker},
                    {'$set': {'splits': []}}
                )
            )

            # Add the new splits
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
            result = asset_info_collection.bulk_write(updates)
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")

#gets full dividend history 
def getFullDividends():
    ohclv_data_collection = db['OHCLVData']
    asset_info_collection = db['AssetInfo']
    updates = []

    for asset_info in asset_info_collection.find():
        ticker = asset_info['Symbol']
        try:
            # Find the documents in OHCLVData with the current ticker
            pipeline = [
                {'$match': {'tickerID': ticker}},
                {'$project': {'_id': 0, 'timestamp': 1, 'divCash': 1}}
            ]
            ohclv_data = list(ohclv_data_collection.aggregate(pipeline))

            # Initialize a list to store the dividends
            dividends = []

            # Loop through each document in OHCLVData
            for document in ohclv_data:
                # Check if the divCash is not 0
                if document.get('divCash', 0) != 0:
                    # Create a new dividend document
                    dividend = {
                        'payment_date': document['timestamp'],
                        'amount': document['divCash']
                    }
                    # Add the dividend to the list
                    dividends.append(dividend)

            # Remove the existing dividends
            updates.append(
                UpdateOne(
                    {'Symbol': ticker},
                    {'$set': {'dividends': []}}
                )
            )

            # Add the new dividends
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
            result = asset_info_collection.bulk_write(updates)
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")
   
#gets full financials again from scratch 
def getFinancials():
    maintenanceMode(True)
    collection = db['AssetInfo']

    tickers2 = [doc['Symbol'] for doc in collection.find()]

    for ticker in tickers2:
        print(f'processing {ticker}')
        url = f'https://api.tiingo.com/tiingo/fundamentals/{ticker}/statements?token={api_key}'
        response = requests.get(url)

        if response.status_code == 200:
            data = response.json()

            result = collection.find_one({'Symbol': ticker})

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

                collection.update_one({'Symbol': ticker}, {'$set': {
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
def getHistoricalPrice():
    daily_collection = db["OHCLVData"]
    asset_info_collection = db["AssetInfo"]

    for asset_info in asset_info_collection.find():
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
                    existing_daily_doc = daily_collection.find_one({
                        'tickerID': daily_doc['tickerID'], 
                        'timestamp': daily_doc['timestamp']
                    })
                    
                    if not existing_daily_doc:
                        daily_collection.insert_one(daily_doc)
                        
                print(f"Successfully processed {ticker}")
            else:
                print(f"No data found for {ticker}")
        else:
            print(f"Error: {response.text}")

# get daily OHCLV Data day after day
def getPrice():
    daily_collection = db["OHCLVData"]
    asset_info_collection = db["AssetInfo"]

    # Fetch all data at once
    url = f'https://api.tiingo.com/tiingo/daily/prices?token={api_key}'
    response = requests.get(url)

    if response.status_code == 200:
        data = response.json()

        # Get symbols from AssetInfo collection
        symbols = [doc['Symbol'] for doc in asset_info_collection.find()]

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

            # Insert daily documents, preventing duplicates
            for daily_doc in daily_data_dict:
                existing_daily_doc = daily_collection.find_one({
                    'tickerID': daily_doc['tickerID'], 
                    'timestamp': daily_doc['timestamp']
                })
                
                if not existing_daily_doc:
                    daily_collection.insert_one(daily_doc)
                    print(f"Inserted daily document for {daily_doc['tickerID']} on {daily_doc['timestamp']}")
                else:
                    print(f"Daily document for {daily_doc['tickerID']} on {daily_doc['timestamp']} already exists")

        else:
            print("No data found for the specified tickers.")
    else:
        print(f"Error: {response.text}")
        
# Get Monday date of this week
today = dt.date.today()
monday = dt.datetime.combine(today - dt.timedelta(days=today.weekday()), dt.time())

#updates weekly candles 
def updateWeekly():
    # Delete all filtered documents on OHCLVData2
    remove_documents_with_timestamp(monday.strftime('%Y-%m-%dT%H:%M:%S.%f+00:00'))

    # Create a single aggregation pipeline
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

    # Run the aggregation pipeline
    results = list(db['OHCLVData'].aggregate(pipeline))

    # Log the results
    for result in results:
        print("Result:")
        print(result)

    # Update the weekly documents inside OHCLVData2
    updates = []
    for result in results:
        if result['documents']:  # Check if the stock has data for the current week
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
            result = db['OHCLVData2'].bulk_write(updates)
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")
              
#updates MarketCap, PE, PB, PEG , PS, RSI, Gap%
def updateDailyRatios():
    ohclv_collection = db['OHCLVData']
    asset_info_collection = db['AssetInfo']
    updates = []

    for asset_info_doc in asset_info_collection.find():
        ticker = asset_info_doc['Symbol']
        try:
            # Get the most recent OHCLV document
            pipeline = [
                {'$match': {'tickerID': ticker}},
                {'$sort': {'timestamp': -1}},
                {'$project': {'_id': 0, 'close': 1}}
            ]
            ohclv_doc = list(ohclv_collection.aggregate(pipeline))[0]

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
                ohclv_docs = list(ohclv_collection.aggregate(pipeline))
                if len(ohclv_docs) >= 14:
                    closing_prices = [doc['close'] for doc in ohclv_docs]
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
                ohclv_docs = list(ohclv_collection.aggregate(pipeline))
                if len(ohclv_docs) >= 2:
                    current_price = ohclv_docs[0]['close']
                    previous_price = ohclv_docs[1]['close']
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
            result = asset_info_collection.bulk_write(updates)
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")
            
#updates splits when triggered 
def Split(tickerID, timestamp, splitFactor):
    # Connect to AssetInfo
    asset_info_collection = db['AssetInfo']

    # Find the document in AssetInfo with the matching Symbol
    asset_info_doc = asset_info_collection.find_one({'Symbol': tickerID})

    if asset_info_doc:
        # Create a new split object
        new_split = {
            'effective_date': timestamp,
            'split_factor': splitFactor
        }

        # Update the SharesOutstanding attribute
        if splitFactor > 0:
            # Split: multiply SharesOutstanding by splitFactor
            updated_shares = asset_info_doc['SharesOutstanding'] * splitFactor
        elif splitFactor < 0:
            # Reverse split: divide SharesOutstanding by the absolute value of splitFactor
            updated_shares = asset_info_doc['SharesOutstanding'] / abs(splitFactor)
        else:
            print("Invalid split factor. It should be a non-zero number.")
            return

        # Update the document
        asset_info_collection.update_one(
            {'Symbol': tickerID},
            {'$push': {'splits': new_split}, '$set': {'SharesOutstanding': updated_shares}}
        )

        print(f"Split factor triggered for {tickerID} on {timestamp} with split factor {splitFactor}")

        # Call the getHistoricalPrice function with the tickerID as a parameter
        getHistoricalPrice2(tickerID)
    else:
        print(f"No document found in AssetInfo for {tickerID}")

#updates dividends when triggered 
def Dividends(tickerID, timestamp, divCash):
    # Connect to AssetInfo
    asset_info_collection = db['AssetInfo']

    # Find the document in AssetInfo with the matching Symbol
    asset_info_doc = asset_info_collection.find_one({'Symbol': tickerID})

    if asset_info_doc:
        # Create a new dividend object
        new_dividend = {
            'payment_date': timestamp,
            'amount': divCash
        }

        # Update the DividendDate attribute and add the new dividend object to the end of the dividends array
        asset_info_collection.update_one(
            {'Symbol': tickerID},
            {'$set': {'DividendDate': timestamp}, '$push': {'dividends': new_dividend}}
        )

        print(f"Dividend triggered for {tickerID} on {timestamp} with dividend amount {divCash}")
    else:
        print(f"No document found in AssetInfo for {tickerID}")

#triggers when there's a split, it deleted and reuploads updated ohclvdata
def getHistoricalPrice2(tickerID):
    daily_collection = db["OHCLVData"]
    weekly_collection = db["OHCLVData2"]

    # Find and delete existing documents for the tickerID
    daily_collection.delete_many({'tickerID': tickerID})
    weekly_collection.delete_many({'tickerID': tickerID})

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

            # Insert daily documents, preventing duplicates
            for daily_doc in daily_data_dict:
                existing_daily_doc = daily_collection.find_one({
                    'tickerID': daily_doc['tickerID'], 
                    'timestamp': daily_doc['timestamp']
                })

                if not existing_daily_doc:
                    daily_collection.insert_one(daily_doc)

            # Process weekly data from daily data
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            df['week_start'] = df['timestamp'].dt.to_period('W').dt.to_timestamp()

            weekly_grouped = df.groupby('week_start')

            weekly_collection.delete_many({'tickerID': tickerID})

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

                    # Check if weekly document already exists
                    existing_weekly_doc = weekly_collection.find_one({
                        'tickerID': tickerID, 
                        'timestamp': weekly_doc['timestamp']
                    })

                    if not existing_weekly_doc:
                        weekly_collection.insert_one(weekly_doc)

            print(f"Successfully processed {tickerID}")
        else:
            print(f"No data found for {tickerID}")
    else:
        print(f"Error: {response.text}")

#scan endpoints for financial statements updates and update symbol when it does
def checkAndUpdateFinancialUpdates():
    start_time = time.time()
    collection = db['AssetInfo']
    tickers = [doc['Symbol'] for doc in collection.find()]
    print('checking for financial statements updates')
    new_tickers_data = {}

    for ticker in tickers:
        print(f'scanning {ticker}')
        url = f'https://api.tiingo.com/tiingo/fundamentals/{ticker}/statements?token={api_key}'
        response = requests.get(url)

        if response.status_code == 200:
            data = response.json()

            # Find the document in MongoDB where Symbol matches the ticker
            result = collection.find_one({'Symbol': ticker})

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
    # Update the quarterly and annual earnings and financial data in the MongoDB database
    for ticker, data in new_tickers_data.items():
        print(f'processing {ticker}')
        collection.update_one({'Symbol': ticker}, {'$set': data})
        print(f"Successfully updated earnings and financial data for {ticker}")

    update_eps_shares_dividend_date()
    calculate_qoq_changes()
    calculate_YoY_changes()
    maintenanceMode(False)
    end_time = time.time()
    execution_time_in_seconds = end_time - start_time
    execution_time_in_minutes = execution_time_in_seconds / 60
    print(f'checkAndUpdateFinancialUpdates took {execution_time_in_minutes:.2f} minutes to execute')

#updates assetinfo with recent ohclvdata 
def updateTimeSeries():
    ohclv_collection = db['OHCLVData']
    asset_info_collection = db['AssetInfo']
    updates = []

    print("Updating Asset Time Series...")
    for i, asset_info in enumerate(asset_info_collection.find()):
        ticker = asset_info['Symbol']
        try:
            recent_doc = ohclv_collection.find_one(
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
            print(f"Processed {i+1} out of {asset_info_collection.count_documents({})} stocks")
        except Exception as e:
            print(f"Error processing {ticker}: {e}")

    if updates:
        try:
            result = asset_info_collection.bulk_write(updates)
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")
            
#updates dividend yields TTM daily 
def getDividendYieldTTM():
    collection = db['AssetInfo']

    for document in collection.find():
        ticker = document['Symbol']
        dividends = document.get('dividends', [])
        time_series = document.get('TimeSeries', [])

        if not dividends:
            print(f'No data found for {ticker}')
            # Update the existing document
            collection.update_one(
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
            current_stock_price = list(time_series.values())[0].get('4. close')
            dividend_yield_ttm = ttm_dividend_per_share / current_stock_price

            # Update the existing document
            collection.update_one(
                {'Symbol': ticker},
                {'$set': {'DividendYield': dividend_yield_ttm}}
            )
            print(f'{ticker} Dividend Yield TTM Updated Successfully')
        except Exception as e:
            print(f"Error processing {ticker}: {str(e)}")

#calculates average volume for 1w, 1m, 6m and 1y
def calculateVolumes():
    ohclv_collection = db["OHCLVData"]
    asset_info_collection = db["AssetInfo"]
    updates = []

    print("Calculating Volumes...")
    for i, asset_info in enumerate(asset_info_collection.find()):
        ticker = asset_info['Symbol']
        try:
            pipeline = [
                {'$match': {'tickerID': ticker}},
                {'$sort': {'timestamp': -1}},
                {'$project': {'_id': 0, 'volume': 1}}
            ]
            documents = list(ohclv_collection.aggregate(pipeline))

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
            print(f"Processed {i+1} out of {asset_info_collection.count_documents({})} stocks")
        except Exception as e:
            print(f"Error processing {ticker}: {e}")

    if updates:
        try:
            result = asset_info_collection.bulk_write(updates)
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")

#calculates moving averages (10, 20, 50 and 200DMA)
def calculateSMAs():
    ohclv_collection = db["OHCLVData"]
    asset_info_collection = db["AssetInfo"]
    updates = []

    print("Calculating Moving Averages...")
    for i, asset_info in enumerate(asset_info_collection.find()):
        ticker = asset_info['Symbol']
        try:
            pipeline = [
                {'$match': {'tickerID': ticker}},
                {'$sort': {'timestamp': 1}},
                {'$project': {'_id': 0, 'close': 1}}
            ]
            documents = list(ohclv_collection.aggregate(pipeline))

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
            print(f"Processed {i+1} out of {asset_info_collection.count_documents({})} stocks")
        except Exception as e:
            print(f"Error processing {ticker}: {e}")

    if updates:
        try:
            result = asset_info_collection.bulk_write(updates)
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")

#calulcates technical score 
def calculateTechnicalScores():
    ohclv_collection = db["OHCLVData"]
    asset_info_collection = db["AssetInfo"]
    updates = []

    print("Calculating Percentage Changes...")
    for i, asset_info in enumerate(asset_info_collection.find()):
        ticker = asset_info['Symbol']
        try:
            pipeline = [
                {'$match': {'tickerID': ticker}},
                {'$sort': {'timestamp': -1}},
                {'$project': {'_id': 0, 'close': 1}}
            ]
            documents = list(ohclv_collection.aggregate(pipeline))

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
            print(f"Processed {i+1} out of {asset_info_collection.count_documents({})} stocks")
        except Exception as e:
            print(f"Error processing {ticker}: {e}")

    if updates:
        try:
            result = asset_info_collection.bulk_write(updates)
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")

    print("Calculating RS Scores...")
    pipeline = [
        {'$match': {}},
        {'$project': {'_id': 0, 'Symbol': 1, 'percentage_change_1w': 1, 'percentage_change_1m': 1, 'percentage_change_4m': 1}}
    ]
    documents = list(asset_info_collection.aggregate(pipeline))

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
            result = asset_info_collection.bulk_write(updates)
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")

    print("Updating Asset Info...")
    updates = []
    for asset_info in asset_info_collection.find():
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
            result = asset_info_collection.bulk_write(updates)
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")

#calculates both 52wk and all time high/low
def calculateAlltimehighlowandperc52wk():
    ohclv_data_collection = db['OHCLVData']
    asset_info_collection = db['AssetInfo']
    updates = []

    print("Calculating All-Time Highs, Lows, 52-Week Highs/Lows, and Percentages...")
    for i, asset_info in enumerate(asset_info_collection.find()):
        ticker = asset_info['Symbol']
        try:
            pipeline = [
                {'$match': {'tickerID': ticker}},
                {'$sort': {'timestamp': -1}},
                {'$project': {'_id': 0, 'close': 1}}
            ]
            documents = list(ohclv_data_collection.aggregate(pipeline))

            close_values = []
            for doc in documents:
                close_value = doc['close']
                try:
                    close_value = float(close_value)
                    close_values.append(close_value)
                except ValueError:
                    print(f"Warning: Non-numeric value '{close_value}' found in 'close' field for ticker {ticker}")

            if close_values:
                alltime_high = max(close_values)
                alltime_low = min(close_values)
                recent_close = close_values[0]
                closes_52wk = close_values[:252]  # Most recent 252 closes (approx 1 year)
                fiftytwo_week_high = max(closes_52wk) if closes_52wk else 0
                fiftytwo_week_low = min(closes_52wk) if closes_52wk else 0
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
            print(f"Processed {i+1} out of {asset_info_collection.count_documents({})} stocks")
        except Exception as e:
            print(f"Error processing {ticker}: {e}")

    if updates:
        try:
            result = asset_info_collection.bulk_write(updates)
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")
 
#caluclautes percentage changes for today, wk, 1m, 4m, 6m, 1y, and YTD (althought ytd is still a bit weird)
def calculatePerc():
    ohclv_collection = db['OHCLVData']
    asset_info_collection = db['AssetInfo']
    updates = []

    print("Calculating Percentage Changes...")
    for i, asset_info in enumerate(asset_info_collection.find()):
        ticker = asset_info['Symbol']
        try:
            pipeline = [
                {'$match': {'tickerID': ticker}},
                {'$sort': {'timestamp': 1}},
                {'$project': {'_id': 0, 'close': 1, 'timestamp': 1}}
            ]
            documents = list(ohclv_collection.aggregate(pipeline))

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
            print(f"Processed {i+1} out of {asset_info_collection.count_documents({})} stocks")
        except Exception as e:
            print(f"Error processing {ticker}: {e}")

    if updates:
        try:
            result = asset_info_collection.bulk_write(updates)
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")
  
#scans documents for delisted stocks, it removes stocks that have ohclvdata older than 14 days            
def scanDelisted():
    current_date = dt.datetime.now()
    time_period = dt.timedelta(days=14)
    date_threshold = current_date - time_period
    delisted = []
    stocks = db['AssetInfo'].find()
    for stock in stocks:
        ticker = stock['Symbol']
        pipeline = [
            {'$match': {'tickerID': ticker}},
            {'$sort': {'timestamp': -1}},
            {'$limit': 1},
            {'$project': {'_id': 0, 'timestamp': 1}}
        ]
        most_recent_timestamp = list(db['OHCLVData'].aggregate(pipeline))
        if most_recent_timestamp:
            if most_recent_timestamp[0]['timestamp'] < date_threshold:
                delisted.append(ticker)
        else:
            delisted.append(ticker)
    Delist(delisted)

#removes delisted tickers from the database
def Delist(delisted):
    asset_info_collection = db['AssetInfo']
    ohclv_data_collection = db['OHCLVData']
    ohclv_data_collection2 = db['OHCLVData2']
    notes_collection = db['Notes']
    users_collection = db['Users']
    watchlists_collection = db['Watchlists']
    print("Deleting documents from collections...")
    for i, asset in enumerate(delisted):
        try:
            asset_info_collection.delete_one({'Symbol': asset})
            ohclv_data_collection.delete_many({'tickerID': asset})
            ohclv_data_collection2.delete_many({'tickerID': asset})
            notes_collection.delete_many({'Symbol': asset})
            users_collection.update_many({}, {'$pull': {'Hidden': asset}})
            watchlists_collection.update_many({}, {'$pull': {'List': asset}})
            print(f"Processed {i+1} out of {len(delisted)} assets")
        except Exception as e:
            print(f"Error processing {asset}: {e}")

#get OHCLVData from Nasdaq100, S&P500, Dow Jones 30, Russell 2000
def getIndex():
    indexes = ['QQQ', 'SPY', 'DIA', 'IWM']
    daily_collection = db["OHCLVData"]
    weekly_collection = db["OHCLVData2"]

    for ticker in indexes:
        now = dt.datetime.now()
        url = f'https://api.tiingo.com/tiingo/daily/{ticker}/prices?token={api_key}&startDate=1990-01-01&endDate={now.strftime("%Y-%m-%d")}'
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
                    doc['timestamp'] = dt.datetime.strptime(doc['timestamp'], '%Y-%m-%dT%H:%M:%S.%fZ')

                # Insert daily documents, preventing duplicates
                for daily_doc in daily_data_dict:
                    existing_daily_doc = daily_collection.find_one({
                        'tickerID': daily_doc['tickerID'], 
                        'timestamp': daily_doc['timestamp']
                    })

                    if not existing_daily_doc:
                        daily_collection.insert_one(daily_doc)

                # Process weekly data from daily data
                df['timestamp'] = pd.to_datetime(df['timestamp'])
                df['week_start'] = df['timestamp'].dt.to_period('W').dt.to_timestamp()

                weekly_grouped = df.groupby('week_start')

                weekly_collection.delete_many({'tickerID': ticker})

                for week_start, week_data in weekly_grouped:
                    if not week_data.empty:
                        weekly_doc = {
                            'tickerID': ticker,
                            'timestamp': week_start.to_pydatetime(),
                            'open': float(week_data['adjOpen'].iloc[0]),
                            'high': float(week_data['adjHigh'].max()),
                            'low': float(week_data['adjLow'].min()),
                            'close': float(week_data['adjClose'].iloc[-1]),
                            'volume': int(week_data['adjVolume'].sum())
                        }

                        # Check if weekly document already exists
                        existing_weekly_doc = weekly_collection.find_one({
                            'tickerID': ticker, 
                            'timestamp': weekly_doc['timestamp']
                        })

                        
                        weekly_collection.insert_one(weekly_doc)

                print(f"Successfully processed {ticker}")
            else:
                print(f"No data found for {ticker}")
        else:
            print(f"Error: {response.text}")

#calculates average day volatility for specific timespans and updates documents 
def calculateADV():
    ohclv_collection = db["OHCLVData"]
    asset_info_collection = db["AssetInfo"]
    updates = []

    print("Calculating Volatility Scores...")
    for i, asset_info in enumerate(asset_info_collection.find()):
        ticker = asset_info['Symbol']
        try:
            pipeline = [
                {'$match': {'tickerID': ticker}},
                {'$sort': {'timestamp': -1}},
                {'$project': {'_id': 0, 'close': 1}}
            ]
            documents = list(ohclv_collection.aggregate(pipeline))

            close_prices = [doc['close'] for doc in documents]

            if len(close_prices) < 5:
                continue

            # Calculate daily returns
            daily_returns = [close_prices[i] - close_prices[i-1] for i in range(1, len(close_prices))]

            # Calculate average daily volatility over specific time spans
            volatility_1w = (np.std(daily_returns[-5:]) / np.mean(close_prices[-5:])) * 100
            volatility_1m = (np.std(daily_returns[-20:]) / np.mean(close_prices[-20:])) * 100
            volatility_4m = (np.std(daily_returns[-80:]) / np.mean(close_prices[-80:])) * 100
            volatility_1y = (np.std(daily_returns[-252:]) / np.mean(close_prices[-252:])) * 100

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

            print(f"Processed {i+1} out of {asset_info_collection.count_documents({})} stocks")
        except Exception as e:
            print(f"Error processing {ticker}: {e}")

    if updates:
        try:
            result = asset_info_collection.bulk_write(updates)
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")

    print("Done calculating volatility scores.")
    

'''
Qaurterly Section
'''
#calculares QoQ changes        
def calculate_qoq_changes():
    collection = db['AssetInfo']
    for doc in collection.find():
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
        collection.update_one({'Symbol': ticker}, {'$set': {
            'EPSQoQ': eps_qoq,
            'EarningsQoQ': earnings_qoq,
            'RevQoQ': revenue_qoq
        }})

#calculares YoY changes 
def calculate_YoY_changes():
    collection = db['AssetInfo']
    for doc in collection.find():
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
        collection.update_one({'Symbol': ticker}, {'$set': {
            'EPSYoY': eps_yoy,
            'EarningsYoY': earnings_yoy,
            'RevYoY': revenue_yoy
        }})

#updates data when financials are updated 
def update_eps_shares_dividend_date():
    try:
        collection = db['AssetInfo']

        # Iterate over each document in the collection
        for document in collection.find():
            ticker = document['Symbol']

            # Check if the quarterlyEarnings array is not empty
            if 'quarterlyEarnings' in document and document['quarterlyEarnings']:
                # Extract the reportedEPS from the first object in the quarterlyEarnings array
                reported_eps = document['quarterlyEarnings'][0].get('reportedEPS')

                # Update the EPS attribute of the document
                if reported_eps is not None:
                    collection.update_one({'Symbol': ticker}, {'$set': {'EPS': reported_eps}})

            # Check if the quarterlyFinancials array is not empty
            if 'quarterlyFinancials' in document and document['quarterlyFinancials']:
                # Extract the sharesBasic from the first object in the quarterlyFinancials array
                shares_basic = document['quarterlyFinancials'][0].get('sharesBasic')

                # Update the SharesOutstanding attribute of the document
                if shares_basic is not None:
                    collection.update_one({'Symbol': ticker}, {'$set': {'SharesOutstanding': shares_basic}})

            # Check if the dividends array is not empty
            if 'dividends' in document and document['dividends']:
                # Extract the payment_date from the last object in the dividends array
                payment_date = document['dividends'][-1].get('payment_date')

                # Update the DividendDate attribute of the document
                if payment_date is not None:
                    collection.update_one({'Symbol': ticker}, {'$set': {'DividendDate': payment_date}})
        print("Update successful")

    except Exception as e:
        print("Update failed: ", str(e))

'''
IPO section

# List of new tickers to insert inside the database
with open('server/new.txt', 'r') as file:
    tickers = file.read().replace("'", "").split(', ')
'''  
def updateSummarySingle(ticker):
    print(f'processing {ticker}')
    url = f'https://api.tiingo.com/tiingo/daily/{ticker}?token={api_key}'
    response = requests.get(url)

    if response.status_code == 200:
        data = response.json()

        # Update the existing document
        collection = db['AssetInfo']
        result = collection.update_one(
            {'Symbol': ticker},
            {'$set': {
                'Name': data['name'].upper(),
                'Description': data['description'],
                'IPO': datetime.strptime(data['startDate'], '%Y-%m-%d') if data.get('startDate') else None,  # Convert to BSON date
                'Exchange': data['exchangeCode']
            }}
        )
    else:
        print(f"Error fetching data for {ticker}: {response.status_code}")

def getSummary2Single(ticker):
    url = f'https://api.tiingo.com/tiingo/fundamentals/meta?token={api_key}'
    response = requests.get(url)

    if response.status_code == 200:
        data = response.json()
        collection = db['AssetInfo']
        ticker = ticker.lower()
        ticker_data = next((item for item in data if item['ticker'] == ticker), None)
        if ticker_data is None:
            print(f'No data found for {ticker}')
            return

        # Extract the required information
        sector = ticker_data.get('sector')
        industry = ticker_data.get('industry')
        reporting_currency = ticker_data.get('reportingCurrency')
        location = ticker_data.get('location')
        country = location.split(', ')[-1] if location else None
        address = location if location else None

        # Update the document in MongoDB where Symbol matches the ticker
        collection.update_one(
            {'Symbol': ticker.upper()},
            {'$set': {
                'Sector': sector,
                'Industry': industry,
                'Currency': reporting_currency,
                'Address': address,
                'Country': country
            }},
            upsert=True
        )
        print(f'{ticker} Summary Data Updated Successfully')
    else:
        print(f"Failed to retrieve data. Status code: {response.status_code}")
        print(response.text)
        
def getSplitsSingle(ticker):
    ohclv_data_collection = db['OHCLVData']
    asset_info_collection = db['AssetInfo']

    try:
        # Find the documents in OHCLVData with the current ticker
        pipeline = [
            {'$match': {'tickerID': ticker}},
            {'$project': {'_id': 0, 'timestamp': 1, 'splitFactor': 1}}
        ]
        ohclv_data = list(ohclv_data_collection.aggregate(pipeline))

        # Initialize a list to store the splits
        splits = []

        # Loop through each document in OHCLVData
        for document in ohclv_data:
            # Check if the split factor is not 1
            if document.get('splitFactor', 1) != 1:
                # Create a new split document
                split = {
                    'effective_date': document['timestamp'],
                    'split_factor': document['splitFactor']
                }
                # Add the split to the list
                splits.append(split)

        # Remove the existing splits
        asset_info_collection.update_one(
            {'Symbol': ticker},
            {'$set': {'splits': []}}
        )

        # Add the new splits
        asset_info_collection.update_one(
            {'Symbol': ticker},
            {'$push': {'splits': {'$each': splits}}}
        )
        print(f'Updated splits for ticker: {ticker}')
    except Exception as e:
        print(f'Error updating splits for ticker: {ticker} - {str(e)}')

def getDividendsSingle(ticker):
    ohclv_data_collection = db['OHCLVData']
    asset_info_collection = db['AssetInfo']

    try:
        # Find the documents in OHCLVData with the current ticker
        pipeline = [
            {'$match': {'tickerID': ticker}},
            {'$project': {'_id': 0, 'timestamp': 1, 'divCash': 1}}
        ]
        ohclv_data = list(ohclv_data_collection.aggregate(pipeline))

        # Initialize a list to store the dividends
        dividends = []

        # Loop through each document in OHCLVData
        for document in ohclv_data:
            # Check if the divCash is not 0
            if document.get('divCash', 0) != 0:
                # Create a new dividend document
                dividend = {
                    'payment_date': document['timestamp'],
                    'amount': document['divCash']
                }
                # Add the dividend to the list
                dividends.append(dividend)

        # Remove the existing dividends
        asset_info_collection.update_one(
            {'Symbol': ticker},
            {'$set': {'dividends': []}}
        )

        # Add the new dividends
        asset_info_collection.update_one(
            {'Symbol': ticker},
            {'$push': {'dividends': {'$each': dividends}}}
        )
        print(f'Updated dividends for ticker: {ticker}')
    except Exception as e:
        print(f'Error updating dividends for ticker: {ticker} - {str(e)}')

def getFinancialsSingle(ticker):
    print(f'processing {ticker}')
    url = f'https://api.tiingo.com/tiingo/fundamentals/{ticker}/statements?token={api_key}'
    response = requests.get(url)

    if response.status_code == 200:
        data = response.json()

        collection = db['AssetInfo']
        result = collection.find_one({'Symbol': ticker})

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

            collection.update_one({'Symbol': ticker}, {'$set': {
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

def update_exchanges():
    asset_info_collection = db['AssetInfo']

    try:
        # Find the documents in AssetInfo with Exchange attribute
        pipeline = [
            {'$match': {'Exchange': {'$exists': True}}},
            {'$project': {'_id': 0, 'Symbol': 1, 'Exchange': 1}}
        ]
        asset_info_data = list(asset_info_collection.aggregate(pipeline))

        # Loop through each document in AssetInfo
        for document in asset_info_data:
            # Check if the Exchange value is NYSE ARCA or NYSE MKT
            if document['Exchange'] in ['NYSE ARCA', 'NYSE MKT']:
                # Update the Exchange value to NYSE
                asset_info_collection.update_one(
                    {'Symbol': document['Symbol']},
                    {'$set': {'Exchange': 'NYSE'}}
                )
                print(f'Updated exchange for symbol: {document["Symbol"]}')
    except Exception as e:
        print(f'Error updating exchanges - {str(e)}')

#inserts new stocks listed 
def IPO(tickers):
    for ticker in tickers:
        print(f"Processing {ticker}")
        updateSummarySingle(ticker)
        getSummary2Single(ticker)
        getHistoricalPrice2(ticker)
        getSplitsSingle(ticker)
        getDividendsSingle(ticker)
        getFinancialsSingle(ticker)

#Start from Scratch , don't do it unless absolutely necessary, because it burns through api calls 
def ExMachina():
    getSummary()
    getHistoricalPrice()
    getFinancials()
    getFullSplits()
    getFullDividends()
    
#run every day
def Daily():
    functions = [
        ('getPrice', getPrice),
        ('getWeekly', updateWeekly),
        ('checkDelist', scanDelisted),
        ('updateDailyRatios', updateDailyRatios),
        ('update_timeseries', updateTimeSeries),
        ('update_yield', getDividendYieldTTM),
        ('calculate_volumes', calculateVolumes),
        ('calculate_moving_averages', calculateSMAs),
        ('calculate_technical_scores', calculateTechnicalScores),
        ('calculate_average_volatility', calculateADV),
        ('calculate__high_low', calculateAlltimehighlowandperc52wk),
        ('calculate_change_perc', calculatePerc),
    ]
    execution_times = {}
    start_time = time.time()
    
    for func_name, func in functions:
        func_start_time = time.time()
        func()
        func_end_time = time.time()
        execution_time_in_seconds = func_end_time - func_start_time
        execution_time_in_minutes = execution_time_in_seconds / 60
        execution_times[func_name] = execution_time_in_minutes

    end_time = time.time()
    total_execution_time_in_seconds = end_time - start_time
    total_execution_time_in_minutes = total_execution_time_in_seconds / 60

    print('Execution times:')
    for func_name, execution_time in execution_times.items():
        print(f'{func_name} took {execution_time:.2f} minutes to execute')
    
    print(f'\nTotal execution time: {total_execution_time_in_minutes:.2f} minutes')
    #checkAndUpdateFinancialUpdates()
    #fetchNews()

#scheduler
scheduler.add_job(Daily, CronTrigger(hour=18, minute=30, day_of_week='mon-fri', timezone='US/Eastern'))
scheduler.start()

# get the OHCLV for IEX throught tiingo rest api, and updates database before tiingo aggregation, if successfull, it saves us 3 hours 
def getIEXPrice():
    daily_collection = db["OHCLVData"]
    weekly_collection = db["OHCLVData2"]
    asset_info_collection = db["AssetInfo"]

    # Fetch all data at once from the IEX REST endpoint
    url = f'https://api.tiingo.com/iex'
    params = {"token": api_key}
    response = requests.get(url, params=params)

    if response.status_code == 200:
        data = response.json()

        # Get symbols from AssetInfo collection
        symbols = [doc['Symbol'] for doc in asset_info_collection.find()]

        # Filter data based on ticker
        filtered_data = [doc for doc in data if doc['ticker'].lower() in [symbol.lower() for symbol in symbols]]

        if filtered_data:
            # Convert to DataFrame for easier processing
            df = pd.DataFrame(filtered_data)
            # These are the typical fields from the IEX endpoint
            # Adjust columns if needed based on actual API response
            df.columns = [
                'ticker', 'timestamp', 'lastSaleTimestamp', 'quoteTimestamp', 'open', 'high', 'low', 'mid', 'tngoLast',
                'last', 'lastSize', 'bidSize', 'bidPrice', 'askPrice', 'askSize', 'prevClose', 'volume'
            ][:len(df.columns)]

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

            # Rename fields and parse timestamp
            for doc in daily_data_dict:
                doc['tickerID'] = doc.pop('ticker').upper()
                # Parse timestamp to datetime
                if 'timestamp' in doc and doc['timestamp']:
                    try:
                        doc['timestamp'] = dt.datetime.fromisoformat(doc['timestamp'].replace('Z', '+00:00'))
                    except Exception as e:
                        print(f"Error parsing timestamp for {doc['tickerID']}: {e}")
                        continue

            # Insert daily documents, preventing duplicates
            for daily_doc in daily_data_dict:
                existing_daily_doc = daily_collection.find_one({
                    'tickerID': daily_doc['tickerID'], 
                    'timestamp': daily_doc['timestamp']
                })
                if not existing_daily_doc:
                    daily_collection.insert_one(daily_doc)
                    print(f"Inserted IEX daily doc for {daily_doc['tickerID']} on {daily_doc['timestamp']}")
                else:
                    print(f"IEX daily doc for {daily_doc['tickerID']} on {daily_doc['timestamp']} already exists")

            # Insert into weekly collection (optional, similar to getPrice)
            for daily_doc in daily_data_dict:
                weekly_timestamp = getMonday(daily_doc['timestamp'])
                existing_weekly_doc = weekly_collection.find_one({
                    'tickerID': daily_doc['tickerID'], 
                    'timestamp': weekly_timestamp
                })
                if not existing_weekly_doc:
                    weekly_collection.insert_one(daily_doc)
                    print(f"Inserted IEX weekly doc for {daily_doc['tickerID']} on {weekly_timestamp}")

        else:
            print("No data found for the specified tickers.")
    else:
        print(f"Error: {response.status_code} - {response.text}")

#grabs recent news articles from Tiingo API and inserts them into the News collection
def fetchNews():
    news_collection = db["News"]
    asset_info_collection = db["AssetInfo"]
    symbols = [doc['Symbol'] for doc in asset_info_collection.find()]
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
                exists = news_collection.find_one({
                    "url": doc["url"],
                    "publishedDate": doc["publishedDate"]
                })
                if not exists:
                    documents.append(doc)
            # Remove old news for this symbol if more than MAX_NEWS_PER_SYMBOL exist
            existing_news = list(news_collection.find({"tickers": symbol.upper()}).sort("publishedDate", -1))
            if len(existing_news) + len(documents) > MAX_NEWS_PER_SYMBOL:
                # Remove oldest to keep only MAX_NEWS_PER_SYMBOL
                to_remove = existing_news[MAX_NEWS_PER_SYMBOL - len(documents):]
                for doc in to_remove:
                    news_collection.delete_one({"_id": doc["_id"]})
            if documents:
                news_collection.insert_many(documents)
                total_inserted += len(documents)
                print(f"Inserted {len(documents)} news articles for {symbol}.")
            else:
                print(f"No new news articles found for {symbol}.")
        else:
            print(f"Failed to fetch news for {symbol}: {response.status_code} {response.text}")

    print(f"Total news articles inserted: {total_inserted}")

def generate_weekly_candles():
    daily_collection = db["OHCLVData"]
    weekly_collection = db["OHCLVData2"]

    tickers = daily_collection.distinct('tickerID')
    for ticker in tickers:
        daily_data = list(daily_collection.find({'tickerID': ticker}))
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
            exists = weekly_collection.find_one({
                'tickerID': ticker,
                'timestamp': weekly_doc['timestamp']
            })
            if not exists:
                weekly_collection.insert_one(weekly_doc)
        print(f"Weekly candles generated for {ticker}")
    
        
