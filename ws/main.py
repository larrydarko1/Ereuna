import os
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import websockets
import ssl
import asyncio
from pymongo import MongoClient
import traceback

load_dotenv()
TIINGO_API_KEY = os.getenv('TIINGO_KEY')

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection setup
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
mongo_client = MongoClient(MONGO_URI)
db = mongo_client['EreunaDB']

message_queue = asyncio.Queue(maxsize=1000)  # Holds latest messages

crypto_symbols = ["BTCEUR", "ETHEUR"]
stock_symbols = ["RDDT", "TSLA", "SPY", "DIA", "QQQ", "IWM", "UBER", "AAPL", "AMZN", "GOOGL", "NFLX", "NVDA", "META", "MSFT"]

def crypto_filter(msg):
    return msg.get("messageType") == "A" and isinstance(msg.get("data"), list) and len(msg["data"]) > 0 and msg["data"][0] == "Q"
def stock_filter(msg):
    return msg.get("messageType") == "A" and isinstance(msg.get("data"), list) and len(msg["data"]) >= 3

crypto_ws_url = "wss://api.tiingo.com/crypto"
crypto_subscribe_msg = {
    "eventName": "subscribe",
    "authorization": TIINGO_API_KEY,
    "eventData": {
        "tickers": crypto_symbols,
        "channels": ["trades"],
        "thresholdLevel": 2
    }
}
stock_ws_url = "wss://api.tiingo.com/iex"
stock_subscribe_msg = {
    "eventName": "subscribe",
    "authorization": TIINGO_API_KEY,
    "eventData": {
        "thresholdLevel": 6,
        "tickers": stock_symbols
    }
}
ssl_ctx = ssl._create_unverified_context()

async def relay_tiingo(ws_url, subscribe_msg, ssl_ctx, filter_fn):
    while True:
        try:
            async with websockets.connect(ws_url, ssl=ssl_ctx) as tiingo_ws:
                await tiingo_ws.send(json.dumps(subscribe_msg))
                while True:
                    msg = await tiingo_ws.recv()
                    try:
                        tiingo_data = json.loads(msg)
                    except Exception as e:
                        print(f"JSON decode error: {e}")
                        continue
                    if isinstance(tiingo_data, dict):
                        if tiingo_data.get("messageType") in ("I", "H"):
                            continue
                        if filter_fn(tiingo_data):
                            try:
                                await message_queue.put(json.dumps(tiingo_data))
                            except asyncio.QueueFull:
                                await message_queue.get()
                                await message_queue.put(json.dumps(tiingo_data))
        except Exception as e:
            print(f"Exception in relay_tiingo: {e}")
            await asyncio.sleep(5)  # Retry after delay

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(relay_tiingo(crypto_ws_url, crypto_subscribe_msg, ssl_ctx, crypto_filter))
    asyncio.create_task(relay_tiingo(stock_ws_url, stock_subscribe_msg, ssl_ctx, stock_filter))

@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            msg = await message_queue.get()
            await websocket.send_text(msg)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.close()
        
# for looking at raw messages
@app.websocket("/ws/raw")
async def websocket_raw(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            msg = await message_queue.get()
            await websocket.send_text(msg)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.close()

        
@app.websocket("/ws/symbols")
async def websocket_symbols(websocket: WebSocket, symbols: str = Query(...)):
    await websocket.accept()
    symbol_set = set(s.lower() for s in symbols.split(","))
    try:
        while True:
            msg = await message_queue.get()
            try:
                data = json.loads(msg)
                d = data.get("data")
                # Crypto: ["Q", "btcusd", ... , price, ...]
                if isinstance(d, list):
                    # Crypto
                    if len(d) > 4 and isinstance(d[1], str) and data.get("service") == "crypto_data":
                        symbol = d[1].upper()
                        price = float(d[5])
                        if symbol.lower() in symbol_set:
                            await websocket.send_text(f"{symbol}: {price}")
                    # IEX (stocks/ETFs)
                    elif len(d) > 2 and isinstance(d[1], str) and data.get("service") == "iex":
                        symbol = d[1].upper()
                        price = float(d[2])
                        if symbol.lower() in symbol_set:
                            await websocket.send_text(f"{symbol}: {price}")
            except Exception:
                continue
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.close()
        

@app.websocket("/ws/assetinfo")
async def websocket_assetinfo(websocket: WebSocket, tickers: str = Query(...)):
    await websocket.accept()
    symbols = set(s.lower() for s in tickers.split(","))
    try:
        while True:
            msg = await message_queue.get()
            try:
                data = json.loads(msg)
                d = data.get("data")
                service = data.get("service")
                # Stocks (IEX)
                if service == "iex" and isinstance(d, list) and len(d) > 2:
                    symbol = d[1].lower()
                    if symbol not in symbols:
                        continue
                    latest_close = float(d[2])
                    timestamp = d[0]
                # Crypto
                elif service == "crypto_data" and isinstance(d, list) and len(d) > 5:
                    symbol = d[1].lower()
                    if symbol not in symbols:
                        continue
                    latest_close = float(d[5])
                    timestamp = d[2]
                else:
                    continue
                # Fetch previous close from MongoDB
                asset_doc = db.AssetInfo.find_one({"Symbol": symbol.upper()})
                previous_close = None
                if asset_doc and "TimeSeries" in asset_doc and asset_doc["TimeSeries"]:
                    ts_dict = asset_doc["TimeSeries"]
                    if isinstance(ts_dict, dict):
                        ts = next(iter(ts_dict.values()))
                        prev_close_val = ts.get("4. close")
                        try:
                            previous_close = float(prev_close_val)
                        except (TypeError, ValueError) as err:
                            print(f"AssetInfo endpoint error: invalid '4. close' value: {prev_close_val} (type: {type(prev_close_val)}) for symbol {symbol.upper()}")
                            traceback.print_exc()
                            continue
                    else:
                        print(f"AssetInfo endpoint error: TimeSeries is not a dict for {symbol.upper()}")
                        continue
                if previous_close is not None and previous_close != 0:
                    close_diff = latest_close - previous_close
                    percent_change = (close_diff / previous_close) * 100
                    payload = {
                        "symbol": symbol.upper(),
                        "close": latest_close,
                        "closeDiff": f"{close_diff:+.2f}",
                        "latestClose": latest_close,
                        "percentChange": f"{percent_change:+.2f}%",
                        "previousClose": previous_close,
                        "timestamp": timestamp
                    }
                    await websocket.send_text(json.dumps(payload))
                else:
                    print(f"AssetInfo endpoint error: missing or zero previous_close for {symbol}, got: {previous_close}")
            except Exception as e:
                print(f"AssetInfo endpoint error: {e}")
                traceback.print_exc()
                continue
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")
        traceback.print_exc()
        await websocket.close()

@app.websocket("/ws/watchpanel")
async def websocket_watchpanel(websocket: WebSocket, user: str = Query(...)):
    await websocket.accept()
    try:
        # Fetch user's WatchPanel list from Users collection
        user_doc = db.Users.find_one({"Username": user})
        if not user_doc or "WatchPanel" not in user_doc:
            await websocket.send_text(json.dumps({"error": "User or WatchPanel not found"}))
            await websocket.close()
            return

        watchpanel_symbols = [s.lower() for s in user_doc["WatchPanel"] if isinstance(s, str)]
        if not watchpanel_symbols:
            await websocket.send_text(json.dumps({"error": "No symbols in WatchPanel"}))
            await websocket.close()
            return

        while True:
            msg = await message_queue.get()
            try:
                data = json.loads(msg)
                d = data.get("data")
                service = data.get("service")

                # Determine symbol and latest price
                if service == "iex" and isinstance(d, list) and len(d) > 2:
                    symbol = d[1].lower()
                    latest_close = float(d[2])
                    timestamp = d[0]
                elif service == "crypto_data" and isinstance(d, list) and len(d) > 5:
                    symbol = d[1].lower()
                    latest_close = float(d[5])
                    timestamp = d[2]
                else:
                    continue

                if symbol not in watchpanel_symbols:
                    continue

                # Fetch previous close from MongoDB
                asset_doc = db.AssetInfo.find_one({"Symbol": symbol.upper()})
                previous_close = None
                if asset_doc and "TimeSeries" in asset_doc and asset_doc["TimeSeries"]:
                    ts_dict = asset_doc["TimeSeries"]
                    if isinstance(ts_dict, dict):
                        ts = next(iter(ts_dict.values()))
                        prev_close_val = ts.get("4. close")
                        try:
                            previous_close = float(prev_close_val)
                        except (TypeError, ValueError):
                            continue
                    else:
                        continue

                if previous_close is not None and previous_close != 0:
                    percent_change = (latest_close - previous_close) / previous_close * 100
                    payload = {
                        "Symbol": symbol.upper(),
                        "percentageReturn": f"{percent_change:+.2f}%"
                    }
                    await websocket.send_text(json.dumps(payload))
            except Exception:
                continue
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")
        traceback.print_exc()
        await websocket.close()

# To run: uvicorn ws.main:app --reload
# wscat -c "ws://localhost:8000/ws/stream"
# wscat -c "ws://localhost:8000/ws/assetinfo?tickers=TSLA,AAPL,BTCUSD"
# wscat -c "ws://localhost:8000/ws/watchpanel?user=LarryDarko"
# wscat -c "ws://localhost:8000/ws/symbols?symbols=RDDT,TSLA"
# wscat -c "ws://localhost:8000/ws/raw" - this listens to raw messages to better understand the data structure