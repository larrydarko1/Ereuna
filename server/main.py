from fastapi import FastAPI
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import time
import requests
from dotenv import load_dotenv
import os
from pymongo import MongoClient, UpdateOne
from bson import ObjectId
from datetime import datetime
import datetime as dt
import pandas as pd
import numpy as np
import pytz

app = FastAPI()
# Create a scheduler
scheduler = BackgroundScheduler()

# uvicorn main:app --reload 

load_dotenv()  # Load environment variables from .env file

# MongoDB connection setup
mongo_uri = os.getenv('MONGODB_URI')  # Load MongoDB URI from environment variable
client = MongoClient(mongo_uri)
db = client['EreunaDB']  
api_key = os.getenv('TIINGO_KEY')  # Load API key from environment variable


#maintenance mode
def set_maintenance_mode(mode):
    collection = db["systemSettings"]
    
    # Update the document with name = 'EreunaApp'
    collection.update_one(
        {"name": "EreunaApp"},
        {
            "$set": {
                "maintenance": mode,
                "lastUpdated": datetime.now()  # Set to current date in BSON format
            }
        }
    )
    
#symbol, name, description, IPO, exchange
def getSummary():
    start_time = time.time()
    collection = db['AssetInfo']
    tickers = [doc['Symbol'] for doc in collection.find()]
    print('checking for summary updates')
    updated_tickers = []

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
                    updated_tickers.append(ticker)
                    print(f'new summary data found for {ticker}, added to update list')
            else:
                print(f"No document found for {ticker}")
        else:
            print(f"Error fetching data for {ticker}: {response.status_code}")

    # Call the updateSummary function for each updated ticker
    updateSummary(updated_tickers)
    end_time = time.time()
    execution_time_in_seconds = end_time - start_time
    execution_time_in_minutes = execution_time_in_seconds / 60
    print(f'getSummary took {execution_time_in_minutes:.2f} minutes to execute')

def updateSummary(updated_tickers):
    start_time = time.time()
    collection = db['AssetInfo']

    for ticker in updated_tickers:
        print(f'processing {ticker}')
        url = f'https://api.tiingo.com/tiingo/daily/{ticker}?token={api_key}'
        response = requests.get(url)

        if response.status_code == 200:
            data = response.json()

            # Update the existing document
            result = collection.update_one(
                {'Symbol': ticker},
                {'$set': {
                    'Name': data['name'],
                    'Description': data['description'],
                    'IPO': datetime.strptime(data['startDate'], '%Y-%m-%d') if data.get('startDate') else None,  # Convert to BSON date
                    'Exchange': data['exchangeCode']
                }}
            )

            if result.matched_count == 1:
                print(f'{ticker} Summary Updated Successfully')
            else:
                print(f"No document found for {ticker}, skipping update")
        else:
            print(f"Error fetching data for {ticker}: {response.status_code}")
    end_time = time.time()
    execution_time_in_seconds = end_time - start_time
    execution_time_in_minutes = execution_time_in_seconds / 60
    print(f'updateSummary took {execution_time_in_minutes:.2f} minutes to execute')

    
#sector, industry, currency, location, country         /// IT'S FUCKED, IT CREATES A COPY OF THE DOCUMENTS EVERY FUCKING TIME
def getSummary2():
    url = f'https://api.tiingo.com/tiingo/fundamentals/meta?token={api_key}'
    response = requests.get(url)

    if response.status_code == 200:
        data = response.json()
        collection = db['AssetInfo']
        for document in collection.find():
            ticker = document['Symbol']
            ticker = ticker.lower()
            ticker_data = next((item for item in data if item['ticker'] == ticker), None)
            if ticker_data is None:
                print(f'No data found for {ticker}')
                continue

            # Extract the required information
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
                }},
                upsert=True
            )
            print(f'{ticker} Summary Data Updated Successfully')
    else:
        print(f"Failed to retrieve data. Status code: {response.status_code}")
        print(response.text)
    
# daily OHCLV 
def getPrice():
    daily_collection = db["OHCLVData"]
    weekly_collection = db["OHCLVData2"]
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
                doc['timestamp'] = datetime.strptime(doc['date'], '%Y-%m-%d')

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

            # Process weekly data from daily data
            df['timestamp'] = pd.to_datetime(df['date'])
            weekly_grouped = df.groupby(pd.Grouper(key='timestamp', freq='W-MON'))

            for week_start, week_data in weekly_grouped:
                if not week_data.empty:
                    # Check if weekly document already exists
                    existing_weekly_doc = weekly_collection.find_one({
                        'tickerID': week_data['ticker'].iloc[0].upper(), 
                        'timestamp': week_start.to_pydatetime()
                    })
                    
                    if existing_weekly_doc:
                        # Update the existing weekly document
                        for index, row in week_data.iterrows():
                            existing_weekly_doc['high'] = max(existing_weekly_doc['high'], float(row['high']))
                            existing_weekly_doc['low'] = min(existing_weekly_doc['low'], float(row['low']))
                            existing_weekly_doc['close'] = float(row['close'])
                            existing_weekly_doc['volume'] += int(row['volume'])

                        # Remove the existing document
                        weekly_collection.delete_one({'tickerID': existing_weekly_doc['tickerID'], 'timestamp': existing_weekly_doc['timestamp']})

                        # Insert the updated document
                        weekly_collection.insert_one(existing_weekly_doc)
                        print(f"Updated weekly document for {existing_weekly_doc['tickerID']} on {existing_weekly_doc['timestamp']}")
                    else:
                        # Create a new weekly document
                        weekly_doc = {
                            'tickerID': week_data['ticker'].iloc[0].upper(),
                            'timestamp': week_start.to_pydatetime(),
                            'open': float(week_data['open'].iloc[0]),
                            'high': float(week_data['high'].iloc[0]),
                            'low': float(week_data['low'].iloc[0]),
                            'close': float(week_data['close'].iloc[0]),
                            'volume': int(week_data['volume'].iloc[0])
                        }
                        weekly_collection.insert_one(weekly_doc)
                        print(f"Inserted weekly document for {weekly_doc['tickerID']} on {weekly_doc['timestamp']}")
        else:
            print("No data found for the specified tickers.")
    else:
        print(f"Error: {response.text}")
    

#MarketCap, PE, PB, PEG with for loop, not individual stocks
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
                else:
                    pb_ratio = 0

                # Calculate the trailing price-to-earnings growth ratio
                quarterly_earnings = asset_info_doc.get('quarterlyEarnings', [])
                if len(quarterly_earnings) >= 2:
                    most_recent_eps = quarterly_earnings[0].get('reportedEPS', 0)
                    previous_eps = quarterly_earnings[1].get('reportedEPS', 0)
                    eps_growth_rate = (most_recent_eps - previous_eps) / previous_eps if previous_eps != 0 else 0
                    trailing_peg = pe_ratio / eps_growth_rate if eps_growth_rate != 0 else 0
                else:
                    trailing_peg = 0

                # Update the asset info document
                updates.append(
                    UpdateOne(
                        {'Symbol': ticker},
                        {'$set': {
                            'MarketCapitalization': market_cap,
                            'PERatio': pe_ratio,
                            'PriceToBookRatio': pb_ratio,
                            'PEGRatio': trailing_peg
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

#updates dividend yiels 
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

#scan endpoints for financial statements updates and update symbol when it does
def checkFinancialUpdates():
    start_time = time.time()
    collection = db['AssetInfo']
    new_tickers = []

    # Get the list of stocks from the database
    tickers = [doc['Symbol'] for doc in collection.find()]
    print('checking for financial statements updates')
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
                for statement in data:
                    date_str = statement['date']
                    date = datetime.strptime(date_str, '%Y-%m-%d')
                    quarter = statement['quarter']

                    if 'statementData' in statement and 'incomeStatement' in statement['statementData']:
                        if quarter == 0:
                            existing_annual_earnings = result.get('annualEarnings', [])
                            existing_annual_earnings_dates = [item['fiscalDateEnding'] for item in existing_annual_earnings]
                            if date not in existing_annual_earnings_dates:
                                new_tickers.append(ticker)
                                print(f'new annual data found for {ticker}, added to upgrade list')
                        else:
                            existing_quarterly_earnings = result.get('quarterlyEarnings', [])
                            existing_quarterly_earnings_dates = [item['fiscalDateEnding'] for item in existing_quarterly_earnings]
                            if date not in existing_quarterly_earnings_dates:
                                new_tickers.append(ticker)
                                print(f'new quarterly data found for {ticker}, added to upgrade list')

    # Call the updateFinancial function for each new ticker
    updateFinancial(new_tickers)
    end_time = time.time()
    execution_time_in_seconds = end_time - start_time
    execution_time_in_minutes = execution_time_in_seconds / 60
    print(f'checkFinancialUpdates took {execution_time_in_minutes:.2f} minutes to execute')

#update new financial data to scanned documents 
def updateFinancial(new_tickers):
    start_time = time.time()
    set_maintenance_mode(True)
    collection = db['AssetInfo']

    for ticker in new_tickers:
        print(f'processing {ticker}')
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

                # Update the quarterly and annual earnings and financial data in the MongoDB database
                collection.update_one({'Symbol': ticker}, {'$set': {
                    'quarterlyEarnings': quarterly_earnings_data,
                    'annualEarnings': annual_earnings_data,
                    'quarterlyFinancials': quarterly_financials_data,
                    'AnnualFinancials': annual_financials_data
                }})
                print(f"Successfully updated earnings and financial data for {ticker}")
            else:
                print(f"No document found for {ticker}")
        else:
            print(f"Error fetching data for {ticker}: {response.status_code}")
    update_eps_shares_dividend_date()
    set_maintenance_mode(False)
    end_time = time.time()
    execution_time_in_seconds = end_time - start_time
    execution_time_in_minutes = execution_time_in_seconds / 60
    print(f'updateFinancial took {execution_time_in_minutes:.2f} minutes to execute')

#gets full splits history 
def getSplits():
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
def getDividends():
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

#updates assetinfo with recent ohclvdata 
def update_asset_info_with_time_series():
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
   
#calculates average volume for 1w, 1m, 6m and 1y
def calculate_volumes():
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
def calculate_moving_averages():
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
def calculate_rs_scores():
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
def calculate_alltime_high_low_and_perc52wk():
    ohclv_data_collection = db['OHCLVData']
    asset_info_collection = db['AssetInfo']
    updates = []

    print("Calculating All-Time Highs, Lows, and Percentages...")
    for i, asset_info in enumerate(asset_info_collection.find()):
        ticker = asset_info['Symbol']
        try:
            pipeline = [
                {'$match': {'tickerID': ticker}},
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
                    # Handle non-numeric values (e.g., log a warning, skip the value, etc.)
                    print(f"Warning: Non-numeric value '{close_value}' found in 'close' field for ticker {ticker}")

            if close_values:
                alltime_high = max(close_values)
                alltime_low = min(close_values)
                recent_close = close_values[0]
            else:
                alltime_high = 0
                alltime_low = 0
                recent_close = 0

            fifty_two_week_high = asset_info.get('52WeekHigh', 0)
            fifty_two_week_low = asset_info.get('52WeekLow', 0)
            if fifty_two_week_high != 0:
                perc_off_52_week_high = ((recent_close - fifty_two_week_high) / fifty_two_week_high) 
            else:
                perc_off_52_week_high = 0
            if fifty_two_week_low != 0:
                perc_off_52_week_low = ((recent_close - fifty_two_week_low) / fifty_two_week_low) 
            else:
                perc_off_52_week_low = 0
            updates.append(
                UpdateOne(
                    {'Symbol': ticker},
                    {'$set': {
                        'AlltimeHigh': alltime_high,
                        'AlltimeLow': alltime_low,
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
def calculate_change_perc():
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
        
        
def calculate_qoq_changes():
    collection = db['AssetInfo']
    for doc in collection.find():
        ticker = doc['Symbol']
        quarterly_income = doc.get('quarterlyIncome', [])
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

def calculate_YoY_changes():
    collection = db['AssetInfo']
    for doc in collection.find():
        ticker = doc['Symbol']
        quarterly_income = doc.get('quarterlyIncome', [])
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

#gets full financials again from scratch 
def getFinancials():
    set_maintenance_mode(True)
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
    set_maintenance_mode(False)

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

#uploads full ohclvdata from scratch, don't use everyday    
def getHistoricalPrice():
    daily_collection = db["OHCLVData"]
    weekly_collection = db["OHCLVData2"]
    asset_info_collection = db["AssetInfo"]

    for asset_info in asset_info_collection.find():
        ticker = asset_info['Symbol']
        now = datetime.now()
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
                    doc['timestamp'] = datetime.strptime(doc['timestamp'], '%Y-%m-%dT%H:%M:%S.%fZ')

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
                weekly_grouped = df.groupby(pd.Grouper(key='timestamp', freq='W-MON'))
                
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
                        
                        if not existing_weekly_doc:
                            weekly_collection.insert_one(weekly_doc)
                print(f"Successfully processed {ticker}")
            else:
                print(f"No data found for {ticker}")
        else:
            print(f"Error: {response.text}")

#triggers when there's a split, it deleted and reuploads updated ohclvdata
def getHistoricalPrice2(tickerID):
    daily_collection = db["OHCLVData"]
    weekly_collection = db["OHCLVData2"]

    # Find and delete existing documents for the tickerID
    daily_collection.delete_many({'tickerID': tickerID})
    weekly_collection.delete_many({'tickerID': tickerID})

    now = datetime.now()
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
                doc['timestamp'] = datetime.strptime(doc['timestamp'], '%Y-%m-%dT%H:%M:%S.%fZ')

            # Insert daily documents
            for daily_doc in daily_data_dict:
                daily_collection.insert_one(daily_doc)
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            weekly_grouped = df.groupby(pd.Grouper(key='timestamp', freq='W-MON'))
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
                    weekly_collection.insert_one(weekly_doc)
            print(f"Successfully processed {tickerID}")
        else:
            print(f"No data found for {tickerID}")
    else:
        print(f"Error: {response.text}")
        

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


def ArrangeIcons():
    current_dir = os.getcwd()
    pictures_dir = os.path.join(current_dir, 'server', 'pictures')
    if os.path.exists(pictures_dir):
        svg_file_names = []
        for filename in os.listdir(pictures_dir):
            if filename.endswith('.svg'):
                svg_file_name = filename.split('.')[0]
                svg_file_names.append(svg_file_name)
        for svg_file_name in svg_file_names:
            asset_info_collection = db['AssetInfo']
            document = asset_info_collection.find_one({'Symbol': svg_file_name})
            if document:
                exchange = document.get('Exchange')
                if exchange:
                    exchange_dir = os.path.join(current_dir, 'server', 'pictures', exchange)
                    if not os.path.exists(exchange_dir):
                        os.makedirs(exchange_dir)
                    svg_file_path = os.path.join(pictures_dir, f'{svg_file_name}.svg')
                    os.replace(svg_file_path, os.path.join(exchange_dir, f'{svg_file_name}.svg'))
                    print(f'Moved {svg_file_name}.svg to {exchange} folder')
                else:
                    print(f'No Exchange attribute found for {svg_file_name}')
            else:
                print(f'No document found for {svg_file_name}')
    else:
        print("The 'pictures' folder does not exist.")
        
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
                weekly_grouped = df.groupby(pd.Grouper(key='timestamp', freq='W-MON'))

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

                        if not existing_weekly_doc:
                            weekly_collection.insert_one(weekly_doc)
                print(f"Successfully processed {ticker}")
            else:
                print(f"No data found for {ticker}")
        else:
            print(f"Error: {response.text}")

#run every day
def Daily():
    set_maintenance_mode(True)
    
    functions = [
        ('getPrice', getPrice),
        ('checkDelist', scanDelisted),
        ('updateDailyRatios', updateDailyRatios),
        ('update_timeseries', update_asset_info_with_time_series),
        ('update_yield', getDividendYieldTTM),
        ('calculate_volumes', calculate_volumes),
        ('calculate_moving_averages', calculate_moving_averages),
        ('calculate_rs_scores', calculate_rs_scores),
        ('calculate__high_low', calculate_alltime_high_low_and_perc52wk),
        ('calculate_change_perc', calculate_change_perc),
        ('getIndexes', getIndex), 
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
    set_maintenance_mode(False)
    checkFinancialUpdates()

#scheduler
scheduler.add_job(Daily, CronTrigger(hour=17, minute=15, timezone='US/Eastern'))
scheduler.start()

'''
def RemoveIsActiveAttribute():
    asset_info_collection = db['AssetInfo']

    print("Removing 'isActive' attribute from documents in AssetInfo collection...")
    try:
        # Update all documents in the AssetInfo collection to remove the 'isActive' attribute
        result = asset_info_collection.update_many({}, {"$unset": {"LastUpdated": ""}})
        print(f"Removed 'isActive' attribute from {result.modified_count} documents")
    except Exception as e:
        print(f"Error removing 'isActive' attribute: {e}")
        
            
def RemoveDuplicateDocuments():
    asset_info_collection = db['AssetInfo']

    print("Removing duplicate documents from AssetInfo collection...")
    try:
        # Aggregate pipeline to find duplicate documents
        pipeline = [
            {"$group": {"_id": "$Symbol", "docs": {"$push": "$$ROOT"}}},
            {"$match": {"docs.1": {"$exists": True}}},  # Filter groups with more than one document
            {"$project": {"docs": 1, "_id": 0}}
        ]

        # Find duplicate documents
        duplicate_docs = list(asset_info_collection.aggregate(pipeline))

        # Remove duplicate documents with less attributes
        for docs in duplicate_docs:
            # Sort documents by the number of attributes in descending order
            sorted_docs = sorted(docs['docs'], key=lambda x: len(x), reverse=True)

            # Remove duplicate documents with less attributes
            for doc in sorted_docs[1:]:
                asset_info_collection.delete_one({"_id": doc["_id"]})

        print("Removed duplicate documents with less attributes")
    except Exception as e:
        print(f"Error removing duplicate documents: {e}")
        
'''
