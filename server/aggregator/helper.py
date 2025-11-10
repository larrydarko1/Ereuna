from dotenv import load_dotenv
import os
from pymongo import MongoClient, UpdateOne, DeleteOne, InsertOne
from bson import ObjectId
from datetime import datetime
import datetime as dt
import pandas as pd
import requests

#Middleware
load_dotenv()  
mongo_uri = os.getenv('MONGODB_URI') 

# Configure MongoDB client with longer timeouts and better connection pooling for long-running operations
client = MongoClient(
    mongo_uri,
    serverSelectionTimeoutMS=60000,  # 60 seconds for server selection
    connectTimeoutMS=60000,  # 60 seconds for initial connection
    socketTimeoutMS=600000,  # 10 minutes for socket operations
    maxPoolSize=50,  # Increase connection pool
    retryWrites=True,  # Enable automatic retries for write operations
    retryReads=True,  # Enable automatic retries for read operations
)
db = client['EreunaDB']  
api_key = os.getenv('TIINGO_KEY')


#set maintenance mode on the app when it's set to True, users can't login when that happens
def maintenanceMode(mode):
    collection = db["systemSettings"]
    collection.update_one(
        {"name": "EreunaApp"},
        {
            "$set": {
                "maintenance": mode,
                "lastUpdated": datetime.now() 
            }
        }
    )

# Get the first day of the week (Monday)
def getMonday(timestamp):
    first_day_of_week = timestamp - dt.timedelta(days=timestamp.weekday())
    return first_day_of_week
 
# function to remove documents with a specific timestamp from the OHCLVData2 collection   
def remove_documents_with_timestamp(timestamp_str):
    weekly_collection = db["OHCLVData2"]
    timestamp = dt.datetime.strptime(timestamp_str, '%Y-%m-%dT%H:%M:%S.%f+00:00')
    weekly_collection.delete_many({'timestamp': timestamp})

#arranges pictures based on market
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
        
# function to remove the 'isActive' attribute from AssetInfo documents
def RemoveIsActiveAttribute():
    asset_info_collection = db['AssetInfo']

    print("Removing 'isActive' attribute from documents in AssetInfo collection...")
    try:
        # Update all documents in the AssetInfo collection to remove the 'isActive' attribute
        result = asset_info_collection.update_many({}, {"$unset": {"LastUpdated": ""}})
        print(f"Removed 'isActive' attribute from {result.modified_count} documents")
    except Exception as e:
        print(f"Error removing 'isActive' attribute: {e}")
        
# function to remove duplicate documents in AssetInfo collection
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

# function to find symbols in AssetInfo collection that do not have an ISIN attribute
def MissingISIN():
    asset_info_collection = db['AssetInfo']

    try:
        # Find the documents in AssetInfo without ISIN attribute
        pipeline = [
            {'$match': {'ISIN': {'$exists': False}}},
            {'$project': {'_id': 0, 'Symbol': 1}}
        ]
        asset_info_data = list(asset_info_collection.aggregate(pipeline))

        # Create a list of symbols without ISIN
        symbols_without_isin = [document['Symbol'] for document in asset_info_data]

        # Print the list of symbols
        print(symbols_without_isin)
    except Exception as e:
        print(f'Error finding symbols without ISIN - {str(e)}')

# function to rename volatility fields in AssetInfo collection
def rename_volatility_fields():
    asset_info_collection = db["AssetInfo"]
    
    # Define the updates to be made
    updates = []
    for doc in asset_info_collection.find():
        update = {}
        if 'volatility_4m' in doc:
            update['$rename'] = {'volatility_4m': 'ADV4M'}
        if 'volatility_1m' in doc:
            if '$rename' not in update:
                update['$rename'] = {}
            update['$rename']['volatility_1m'] = 'ADV1M'
        if 'volatility_1y' in doc:
            if '$rename' not in update:
                update['$rename'] = {}
            update['$rename']['volatility_1y'] = 'ADV1Y'
        if 'volatility_1w' in doc:
            if '$rename' not in update:
                update['$rename'] = {}
            update['$rename']['volatility_1w'] = 'ADV1W'
        
        if update:
            updates.append(UpdateOne({'_id': doc['_id']}, update))
    
    # Apply the updates
    result = asset_info_collection.bulk_write(updates)
    
    # Print the result
    print(f"Updated {result.modified_count} documents")

def updateAssetInfoAttributeNames():
    asset_info_collection = db['AssetInfo']
    updates = []

    print("Updating attribute names in AssetInfo collection...")
    for i, asset_info in enumerate(asset_info_collection.find()):
        ticker = asset_info['Symbol']
        try:
            # Prepare the update operation
            updates.append(
                UpdateOne(
                    {'Symbol': ticker},
                    {'$set': {
                        'fiftytwoWeekHigh': asset_info.get('52WeekHigh', None),
                        'fiftytwoWeekLow': asset_info.get('52WeekLow', None)
                    }}
                )
            )
            # Prepare the unset operation
            updates.append(
                UpdateOne(
                    {'Symbol': ticker},
                    {'$unset': {
                        '52WeekHigh': "",
                        '52WeekLow': ""
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
            
# Function to clone ZephyrStar's documents to new users
def clone_user_documents():
    # List of new usernames
    new_usernames = [
        "LunaNight",
        "Kairos23",
        "AuroraSky",
        "NovaSparks",
        "RivenBlack",
        "LilaMoon",
        "SageWinds",
        "CaelumBlue",
        "PiperRise"
    ]

    # Connect to collections
    watchlists_collection = db["Watchlists"]
    screeners_collection = db["Screeners"]
    users_collection = db["Users"]

    # Query for ZephyrStar's documents
    zephyr_watchlists = list(watchlists_collection.find({"UsernameID": "ZephyrStar"}))
    zephyr_screeners = list(screeners_collection.find({"UsernameID": "ZephyrStar"}))
    zephyr_user = users_collection.find_one({"Username": "ZephyrStar"})
    panel = zephyr_user.get("panel", []) if zephyr_user else []
    panel2 = zephyr_user.get("panel2", []) if zephyr_user else []

    # Helper to clone docs with new UsernameID, skipping if already exists
    def clone_docs(docs, username, collection):
        cloned = []
        for doc in docs:
            doc_copy = doc.copy()
            doc_copy.pop("_id", None)
            doc_copy["UsernameID"] = username
            # Check for existence by a unique field (e.g. Name or Title, plus UsernameID)
            query = {"UsernameID": username}
            if "Name" in doc_copy:
                query["Name"] = doc_copy["Name"]
            else:
                # fallback: use all fields except _id
                query.update({k: v for k, v in doc_copy.items() if k != "_id"})
            if not collection.find_one(query):
                cloned.append(doc_copy)
        return cloned

    # Insert cloned docs for each username and update Users panel/panel2
    for username in new_usernames:
        new_watchlists = clone_docs(zephyr_watchlists, username, watchlists_collection)
        if new_watchlists:
            watchlists_collection.insert_many(new_watchlists)
        new_screeners = clone_docs(zephyr_screeners, username, screeners_collection)
        if new_screeners:
            screeners_collection.insert_many(new_screeners)
        users_collection.update_one(
            {"Username": username},
            {"$set": {"panel": panel, "panel2": panel2}},
            upsert=True
        )
        print(f"Cloned documents and updated panels for {username}")

# Function to update the AssetType field to 'Stock' for all documents in AssetInfo
def update_asset_type_to_stock():
    asset_info_collection = db['AssetInfo']
    updates = []

    print("Updating 'AssetType' to 'Stock' for all documents in AssetInfo...")
    for i, asset_info in enumerate(asset_info_collection.find()):
        ticker = asset_info.get('Symbol')
        try:
            updates.append(
                UpdateOne(
                    {'_id': asset_info['_id']},
                    {'$set': {'AssetType': 'Stock'}}
                )
            )
            print(f"Prepared update for {ticker}")
        except Exception as e:
            print(f"Error preparing update for {ticker}: {e}")

    if updates:
        try:
            result = asset_info_collection.bulk_write(updates)
            print(f"Updated {result.modified_count} documents with AssetType='Stock'")
        except Exception as e:
            print(f"Error updating documents: {e}")

#adds ETFs to the AssetInfo collection from a CSV file
def insertETFs():
    # Read the CSV file
    df = pd.read_csv('server/supported_tickers.csv')

    # Normalize exchange values
    nyse_variants = ['NYSE', 'NYSE ARCA', 'NYSE MKT', 'NYSE NAT']
    nasdaq_variants = ['NASDAQ']

    def normalize_exchange(val):
        if val in nyse_variants:
            return 'NYSE'
        elif val in nasdaq_variants:
            return 'NASDAQ'
        else:
            return val

    df['exchange_normalized'] = df['exchange'].apply(normalize_exchange)

    # Filter rows
    filtered = df[
        (df['assetType'] == 'ETF') &
        (df['exchange_normalized'].isin(['NYSE', 'NASDAQ'])) &
        (df['endDate'] == '2025-06-11')
    ]

    docs = []
    for _, row in filtered.iterrows():
        try:
            ipo_date = datetime.strptime(str(row['startDate']), '%Y-%m-%d')
        except Exception:
            continue  # Skip rows with invalid or missing startDate

        doc = {
            'Symbol': row['ticker'],
            'AssetType': 'ETF',
            'Exchange': row['exchange_normalized'],
            'IPO': ipo_date
        }
        docs.append(doc)

    if docs:
        for doc in docs:
            # Prevent duplicates by checking for existing Symbol and Exchange
            db['AssetInfo'].update_one(
                {'Symbol': doc['Symbol'], 'Exchange': doc['Exchange']},
                {'$setOnInsert': doc},
                upsert=True
            )

# Function to print the most recent endDate from the supported_tickers.csv file
def print_most_recent_enddate():
    # Read the CSV file
    df = pd.read_csv('server/supported_tickers.csv')

    # Convert endDate to datetime, coerce errors to NaT
    df['endDate'] = pd.to_datetime(df['endDate'], errors='coerce')

    # Drop rows where endDate is NaT (missing or invalid)
    df = df.dropna(subset=['endDate'])

    # Sort by endDate descending
    df_sorted = df.sort_values(by='endDate', ascending=False)

    # Print the row with the most recent endDate
    if not df_sorted.empty:
        print(df_sorted.iloc[0])
    else:
        print("No valid endDate found.")

# Function to print rows with ticker from the supported_tickers.csv file
def print_row_with_ticker():
    # Read the CSV file
    df = pd.read_csv('server/supported_tickers.csv')

    # Find rows where ticker is 'SPY'
    spy_rows = df[df['ticker'] == 'SPY'] #change string to whatever ticker you want to search for

    if not spy_rows.empty:
        print(spy_rows)
    else:
        print("No row with ticker 'SPY' found.")

def print_unique_exchange_values():
    # Read the CSV file
    df = pd.read_csv('server/supported_tickers.csv')

    # Get unique values in the 'exchange' column
    unique_exchanges = df['exchange'].unique()

    print("Unique exchange values:")
    for exchange in unique_exchanges:
        print(exchange)

    
# add a notification to the database
def addCommunication():
    mongo_uri = os.getenv('MONGODB_URI')
    client = MongoClient(mongo_uri)
    db = client['EreunaDB']
    alerts_collection = db['Alerts']

    # Prompt user for header and message
    print("Hello Sexy, let's add a new notification")
    header = input("Enter notification header: ").strip()
    message = input("Enter notification message: ").strip()

    if not header or not message:
        print("Header and message cannot be empty.")
        return

    doc = {
        "header": header,
        "message": message,
        "publishedDate": datetime.utcnow()
    }

    result = alerts_collection.insert_one(doc)
    if result.inserted_id:
        print("Notification inserted successfully.")
    else:
        print("Failed to insert notification.")

# Fetch all supported crypto tickers from Tiingo and upsert into AssetInfo collection
def fetch_tiingo_crypto_metadata_and_store():
    try:
        api_key = os.getenv('TIINGO_KEY')
        if not api_key:
            print("TIINGO_KEY not found in environment variables.")
            return
        headers = {"Authorization": f"Token {api_key}"}
        url = "https://api.tiingo.com/tiingo/crypto"
        response = requests.get(url, headers=headers)
        print("Status code:", response.status_code)
        print("Raw response:", response.text[:500])  # Print first 500 chars for inspection

        if response.status_code == 200:
            data = response.json()
            if not isinstance(data, list):
                print("Unexpected data format:", type(data))
                return
            asset_info_collection = db['AssetInfo']
            count = 0
            for obj in data:
                ticker = obj.get('ticker')
                name = obj.get('name')
                if ticker and name:
                    doc = {
                        'Symbol': ticker.upper(),
                        'Name': name,
                        'AssetType': 'Crypto'
                    }
                    asset_info_collection.update_one(
                        {'Symbol': ticker.upper(), 'AssetType': 'Crypto'},
                        {'$set': doc},
                        upsert=True
                    )
                    count += 1
            print(f"Upserted {count} crypto tickers into AssetInfo.")
        else:
            print(f"Failed to fetch crypto metadata: {response.status_code} {response.text}")
    except Exception as e:
        print(f"Exception occurred: {e}")

def fetchAllNews():
    client = MongoClient(mongo_uri)
    db = client['EreunaDB']
    news_collection = db["News"]
    asset_info_collection = db["AssetInfo"]
    symbols = [doc['Symbol'] for doc in asset_info_collection.find()]
    total_inserted = 0

    for symbol in symbols:
        api_url = f"https://api.tiingo.com/tiingo/news?tickers={symbol.lower()}&token={api_key}"
        response = requests.get(api_url)

        if response.status_code == 200:
            news_items = response.json()
            documents = []
            for item in news_items:
                tickers_upper = [t.upper() for t in item.get("tickers", [])]
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
            if documents:
                news_collection.insert_many(documents)
                total_inserted += len(documents)
                print(f"Inserted {len(documents)} news articles for {symbol}.")
            else:
                print(f"No new news articles found for {symbol}.")
        else:
            print(f"Failed to fetch news for {symbol}: {response.status_code} {response.text}")

    print(f"Total news articles inserted: {total_inserted}")

def fetch_single_crypto_price(symbol='IDTRY', db_collection_name='OHCLVData'):
    url = (
        f'https://api.tiingo.com/tiingo/crypto/prices'
        f'?tickers={symbol.lower()}&startDate=2019-01-02&resampleFreq=1Day&token={api_key}'
    )
    response = requests.get(url)
    daily_collection = db[db_collection_name]
    print(f"Status code: {response.status_code}")
    try:
        data = response.json()
        if isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict):
            if 'priceData' in data[0] and data[0]['priceData']:
                price_data = data[0]['priceData']
                for entry in price_data:
                    try:
                        record = {
                            'timestamp': datetime.strptime(entry['date'], '%Y-%m-%dT%H:%M:%S%z'),
                            'tickerID': symbol,
                            'open': float(entry['open']),
                            'high': float(entry['high']),
                            'low': float(entry['low']),
                            'close': float(entry['close']),
                            'volume': float(entry['volume'])
                        }
                        existing = daily_collection.find_one({'tickerID': symbol, 'timestamp': record['timestamp']})
                        if not existing:
                            daily_collection.insert_one(record)
                    except Exception as e:
                        print(f"Error processing record for {symbol}: {e}")
                print(f"Successfully processed {symbol}")
            else:
                print(f"No price data found for {symbol}. Response: {data}")
        else:
            print(f"Unexpected format for {symbol}. Response: {data}")
    except Exception as e:
        print(f"Error parsing response: {e}")
        print("Raw response text:")
        print(response.text)
        
#fetch_single_crypto_price(symbol='IDTRY', db_collection_name='OHCLVData')

def getHistoricalCryptoPrice():
    client = MongoClient(mongo_uri)
    db = client['EreunaDB']  
    daily_collection = db["OHCLVData"]
    asset_info_collection = db["AssetInfo"]

    # Only select crypto tickers
    crypto_assets = asset_info_collection.find({'AssetType': 'Crypto'})
    tickers = [asset['Symbol'] for asset in crypto_assets]

    for ticker in tickers:
        ticker_lower = ticker.lower()
        url = (
            f'https://api.tiingo.com/tiingo/crypto/prices'
            f'?tickers={ticker_lower}&startDate=2025-07-20&resampleFreq=1Day&token={api_key}'
        )
        response = requests.get(url)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict):
                if 'priceData' in data[0] and data[0]['priceData']:
                    price_data = data[0]['priceData']
                    for entry in price_data:
                        try:
                            record = {
                                'timestamp': datetime.strptime(entry['date'], '%Y-%m-%dT%H:%M:%S%z'),
                                'tickerID': ticker,
                                'open': float(entry['open']),
                                'high': float(entry['high']),
                                'low': float(entry['low']),
                                'close': float(entry['close']),
                                'volume': float(entry['volume'])
                            }
                            existing = daily_collection.find_one({'tickerID': ticker, 'timestamp': record['timestamp']})
                            if not existing:
                                daily_collection.insert_one(record)
                        except Exception as e:
                            print(f"Error processing record for {ticker}: {e}")
                    print(f"Successfully processed {ticker}")
                else:
                    print(f"No price data found for {ticker}. Response: {data}")
            else:
                print(f"Unexpected format for {ticker}. Response: {data}")
        else:
            print(f"Error fetching {ticker}: {response.text}")

def fetch_all_crypto_prices(db_collection_name='OHCLVData'):
    asset_info_collection = db["AssetInfo"]
    # Extract list of crypto tickers as strings
    tickers = [asset['Symbol'] for asset in asset_info_collection.find({'AssetType': 'Crypto'})]
    print(f"Found {len(tickers)} crypto tickers.")
    for ticker in tickers:
        fetch_single_crypto_price(symbol=ticker, db_collection_name=db_collection_name)

def insert_SHE_and_SHEB_stocks():
    # Read the CSV file
    df = pd.read_csv('server/supported_tickers.csv')

    # Filter for SHE (CNY) and SHEB (HKD) stocks
    she_filtered = df[
        (df['assetType'] == 'Stock') &
        (df['exchange'] == 'SHE') &
        (df['endDate'] == '2025-06-10')
    ]
    sheb_filtered = df[
        (df['assetType'] == 'Stock') &
        (df['exchange'] == 'SHEB') &
        (df['endDate'] == '2025-06-10')
    ]

    docs = []
    for _, row in she_filtered.iterrows():
        try:
            ipo_date = datetime.strptime(str(row['startDate']), '%Y-%m-%d')
        except Exception:
            continue  # Skip rows with invalid or missing startDate
        doc = {
            'Symbol': row['ticker'],
            'AssetType': 'Stock',
            'Exchange': 'SHE',
            'IPO': ipo_date,
            'Currency': 'CNY'
        }
        docs.append(doc)
    for _, row in sheb_filtered.iterrows():
        try:
            ipo_date = datetime.strptime(str(row['startDate']), '%Y-%m-%d')
        except Exception:
            continue
        doc = {
            'Symbol': row['ticker'],
            'AssetType': 'Stock',
            'Exchange': 'SHEB',
            'IPO': ipo_date,
            'Currency': 'HKD'
        }
        docs.append(doc)

    if docs:
        for doc in docs:
            db['AssetInfo'].update_one(
                {'Symbol': doc['Symbol'], 'Exchange': doc['Exchange']},
                {'$setOnInsert': doc},
                upsert=True
            )

def remove_she_and_sheb_documents():
    asset_info_collection = db['AssetInfo']
    result = asset_info_collection.delete_many({'Exchange': {'$in': ['SHE', 'SHEB']}})
    print(f"Deleted {result.deleted_count} documents with Exchange 'SHE' or 'SHEB'.")

def create_user_portfolios(username=None):
    portfolios_collection = db["Portfolios"]
    if not username:
        username = input("Enter username for portfolio creation (default: LarryDarko): ").strip() or "LarryDarko"
    docs = [
        {
            "Username": username,
            "Number": i + 1,
            "Trades": [],
            "portfolio": [],
            "cash": 0
        }
        for i in range(10)
    ]
    result = portfolios_collection.insert_many(docs)
    print(f"Created {len(result.inserted_ids)} portfolios for user '{username}'.")

async def update_exchanges():
    asset_info_collection = db['AssetInfo']

    try:
        # Find the documents in AssetInfo with Exchange attribute (async)
        pipeline = [
            {'$match': {'Exchange': {'$exists': True}}},
            {'$project': {'_id': 0, 'Symbol': 1, 'Exchange': 1}}
        ]
        asset_info_data = [doc async for doc in asset_info_collection.aggregate(pipeline)]

        # Loop through each document in AssetInfo
        for document in asset_info_data:
            # Check if the Exchange value is NYSE ARCA or NYSE MKT
            if document['Exchange'] in ['NYSE ARCA', 'NYSE MKT']:
                # Update the Exchange value to NYSE (async)
                await asset_info_collection.update_one(
                    {'Symbol': document['Symbol']},
                    {'$set': {'Exchange': 'NYSE'}}
                )
                print(f'Updated exchange for symbol: {document["Symbol"]}')
    except Exception as e:
        print(f'Error updating exchanges - {str(e)}')
        
