import os
import requests
from datetime import datetime
import datetime as dt
import pandas as pd
import motor.motor_asyncio
from dotenv import load_dotenv
from organizer import getHistoricalPrice2

load_dotenv()
mongo_uri = os.getenv('MONGODB_URI')
api_key = os.getenv('TIINGO_KEY')
mongo_client = motor.motor_asyncio.AsyncIOMotorClient(mongo_uri)
db = mongo_client['EreunaDB']

async def updateSummarySingle(ticker):
    print(f'processing {ticker}')
    url = f'https://api.tiingo.com/tiingo/daily/{ticker}?token={api_key}'
    response = requests.get(url)

    if response.status_code == 200:
        data = response.json()
        collection = db['AssetInfo']
        ipo_date = datetime.strptime(data['startDate'], '%Y-%m-%d') if data.get('startDate') else None
        await collection.update_one(
            {'Symbol': ticker},
            {'$set': {
                'Name': data['name'].upper(),
                'Description': data['description'],
                'IPO': ipo_date,
                'Exchange': data['exchangeCode']
            }}
        )
    else:
        print(f"Error fetching data for {ticker}: {response.status_code}")

async def getSummary2Single(ticker):
    url = f'https://api.tiingo.com/tiingo/fundamentals/meta?token={api_key}'
    response = requests.get(url)

    if response.status_code == 200:
        data = response.json()
        collection = db['AssetInfo']
        ticker_lower = ticker.lower()
        ticker_data = next((item for item in data if item['ticker'] == ticker_lower), None)
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
        await collection.update_one(
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
        
async def getSplitsSingle(ticker):
    ohclv_data_collection = db['OHCLVData']
    asset_info_collection = db['AssetInfo']

    try:
        # Find the documents in OHCLVData with the current ticker (async)
        pipeline = [
            {'$match': {'tickerID': ticker}},
            {'$project': {'_id': 0, 'timestamp': 1, 'splitFactor': 1}}
        ]
        ohclv_data = [doc async for doc in ohclv_data_collection.aggregate(pipeline)]

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

        # Remove the existing splits (async)
        await asset_info_collection.update_one(
            {'Symbol': ticker},
            {'$set': {'splits': []}}
        )

        # Add the new splits (async)
        await asset_info_collection.update_one(
            {'Symbol': ticker},
            {'$push': {'splits': {'$each': splits}}}
        )
        print(f'Updated splits for ticker: {ticker}')
    except Exception as e:
        print(f'Error updating splits for ticker: {ticker} - {str(e)}')

async def getDividendsSingle(ticker):
    ohclv_data_collection = db['OHCLVData']
    asset_info_collection = db['AssetInfo']

    try:
        # Find the documents in OHCLVData with the current ticker (async)
        pipeline = [
            {'$match': {'tickerID': ticker}},
            {'$project': {'_id': 0, 'timestamp': 1, 'divCash': 1}}
        ]
        ohclv_data = [doc async for doc in ohclv_data_collection.aggregate(pipeline)]

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

        # Remove the existing dividends (async)
        await asset_info_collection.update_one(
            {'Symbol': ticker},
            {'$set': {'dividends': []}}
        )

        # Add the new dividends (async)
        await asset_info_collection.update_one(
            {'Symbol': ticker},
            {'$push': {'dividends': {'$each': dividends}}}
        )
        print(f'Updated dividends for ticker: {ticker}')
    except Exception as e:
        print(f'Error updating dividends for ticker: {ticker} - {str(e)}')

async def getFinancialsSingle(ticker):
    asset_info_collection = db['AssetInfo']
    print(f'processing {ticker}')
    url = f'https://api.tiingo.com/tiingo/fundamentals/{ticker}/statements?token={api_key}'
    response = requests.get(url)

    if response.status_code == 200:
        data = response.json()

        result = await asset_info_collection.find_one({'Symbol': ticker})

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

            await asset_info_collection.update_one({'Symbol': ticker}, {'$set': {
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

#inserts new stocks listed 
async def IPO(tickers):
    for ticker in tickers:
        print(f"Processing {ticker}")
        await updateSummarySingle(ticker)
        await getSummary2Single(ticker)
        await getHistoricalPrice2(ticker)
        await getSplitsSingle(ticker)
        await getDividendsSingle(ticker)
        await getFinancialsSingle(ticker)