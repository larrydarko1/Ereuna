
import os
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import websockets
import ssl
import asyncio
import motor.motor_asyncio
import traceback
from aggregator import start_aggregator, aggregate_higher_timeframes, pubsub_channels
from bson import ObjectId
from dateutil.parser import isoparse
import datetime

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
mongo_client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db = mongo_client.get_database('EreunaDB')

message_queue = asyncio.Queue(maxsize=100000)  # Holds latest messages

# In-memory cache for latest quotes per symbol
latest_quotes = {}  # {symbol: tiingo_data_dict}

crypto_symbols = ["BTCEUR", "ETHEUR"]
stock_symbols = ["RDDT", "TSLA"]

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
                            # --- Cache the latest quote ---
                            d = tiingo_data.get("data")
                            service = tiingo_data.get("service")
                            if service == "iex" and isinstance(d, list) and len(d) > 2:
                                symbol = d[1].lower()
                                latest_quotes[symbol] = tiingo_data
                            elif service == "crypto_data" and isinstance(d, list) and len(d) > 5:
                                symbol = d[1].lower()
                                latest_quotes[symbol] = tiingo_data
                            # --- End cache ---
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
    asyncio.create_task(start_aggregator(message_queue, mongo_client))
    asyncio.create_task(aggregate_higher_timeframes(mongo_client))

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
    # Send the latest cached value for each symbol before streaming
    for symbol in symbol_set:
        cached = latest_quotes.get(symbol)
        if cached:
            d = cached.get("data")
            service = cached.get("service")
            try:
                if service == "iex" and isinstance(d, list) and len(d) > 2:
                    price = float(d[2])
                    await websocket.send_text(f"{symbol.upper()}: {price}")
                elif service == "crypto_data" and isinstance(d, list) and len(d) > 5:
                    price = float(d[5])
                    await websocket.send_text(f"{symbol.upper()}: {price}")
            except (WebSocketDisconnect, RuntimeError):
                return
        else:
            # If no cached data, send a placeholder or skip (optionally fetch from DB)
            try:
                await websocket.send_text(f"{symbol.upper()}: No recent data available")
            except (WebSocketDisconnect, RuntimeError):
                return

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
                            try:
                                await websocket.send_text(f"{symbol}: {price}")
                            except (WebSocketDisconnect, RuntimeError):
                                return
                    # IEX (stocks/ETFs)
                    elif len(d) > 2 and isinstance(d[1], str) and data.get("service") == "iex":
                        symbol = d[1].upper()
                        price = float(d[2])
                        if symbol.lower() in symbol_set:
                            try:
                                await websocket.send_text(f"{symbol}: {price}")
                            except (WebSocketDisconnect, RuntimeError):
                                return
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

    # Send the latest cached value for each symbol before streaming
    for symbol in symbols:
        cached = latest_quotes.get(symbol)
        if cached:
            d = cached.get("data")
            service = cached.get("service")
            try:
                if service == "iex" and isinstance(d, list) and len(d) > 2:
                    latest_close = float(d[2])
                    timestamp = d[0]
                elif service == "crypto_data" and isinstance(d, list) and len(d) > 5:
                    latest_close = float(d[5])
                    timestamp = d[2]
                else:
                    continue
                # Fetch previous close from MongoDB (or cache if you have it)
                asset_doc = await db.AssetInfo.find_one({"Symbol": symbol.upper()})
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
            except (WebSocketDisconnect, RuntimeError):
                return
        else:
            # If no cached data, send a placeholder or skip (optionally fetch from DB)
            try:
                await websocket.send_text(json.dumps({"symbol": symbol.upper(), "error": "No recent data available"}))
            except (WebSocketDisconnect, RuntimeError):
                return

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
                asset_doc = await db.AssetInfo.find_one({"Symbol": symbol.upper()})
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
                    try:
                        await websocket.send_text(json.dumps(payload))
                    except (WebSocketDisconnect, RuntimeError):
                        return
                else:
                    print(f"AssetInfo endpoint error: missing or zero previous_close for {symbol}, got: {previous_close}")
            except (WebSocketDisconnect, RuntimeError):
                return
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
        user_doc = await db.Users.find_one({"Username": user})
        if not user_doc or "WatchPanel" not in user_doc:
            await websocket.send_text(json.dumps({"error": "User or WatchPanel not found"}))
            await websocket.close()
            return

        watchpanel_symbols = [s.lower() for s in user_doc["WatchPanel"] if isinstance(s, str)]
        if not watchpanel_symbols:
            await websocket.send_text(json.dumps({"error": "No symbols in WatchPanel"}))
            await websocket.close()
            return


        # Send the latest cached value for each symbol before streaming
        for symbol in watchpanel_symbols:
            cached = latest_quotes.get(symbol)
            if cached:
                d = cached.get("data")
                service = cached.get("service")
                try:
                    if service == "iex" and isinstance(d, list) and len(d) > 2:
                        latest_close = float(d[2])
                    elif service == "crypto_data" and isinstance(d, list) and len(d) > 5:
                        latest_close = float(d[5])
                    else:
                        continue

                    # Fetch previous close from MongoDB (or cache if you have it)
                    asset_doc = await db.AssetInfo.find_one({"Symbol": symbol.upper()})
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
                    if previous_close is not None and previous_close != 0:
                        percent_change = (latest_close - previous_close) / previous_close * 100
                        payload = {
                            "Symbol": symbol.upper(),
                            "percentageReturn": f"{percent_change:+.2f}%"
                        }
                        await websocket.send_text(json.dumps(payload))
                except (WebSocketDisconnect, RuntimeError):
                    return
            else:
                # If no cached data, send a placeholder or skip (optionally fetch from DB)
                try:
                    await websocket.send_text(json.dumps({"Symbol": symbol.upper(), "error": "No recent data available"}))
                except (WebSocketDisconnect, RuntimeError):
                    return

        # Now continue streaming new updates as they arrive
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
                asset_doc = await db.AssetInfo.find_one({"Symbol": symbol.upper()})
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
                    try:
                        await websocket.send_text(json.dumps(payload))
                    except (WebSocketDisconnect, RuntimeError):
                        return
            except (WebSocketDisconnect, RuntimeError):
                return
            except Exception:
                continue
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")
        traceback.print_exc()
        await websocket.close()
        
def calcMA(data, period):
    if len(data) < period:
        return []
    arr = []
    for i in range(period - 1, len(data)):
        window = data[i - period + 1:i + 1]
        sum_close = sum(item['close'] for item in window)
        average = sum_close / period
        arr.append({
            'time': window[-1]['timestamp'].isoformat() if hasattr(window[-1]['timestamp'], 'isoformat') else str(window[-1]['timestamp']),
            'value': round(average, 2)
        })
    return arr

@app.websocket('/ws/chartdata')
async def websocket_chartdata(websocket: WebSocket, ticker: str = Query(...)):
    await websocket.accept()
    ticker = ticker.upper()
    timeframes = [
        ("1m", db['OHCLVData1m'], 1440),
        ("5m", db['OHCLVData5m'], 288),
        ("15m", db['OHCLVData15m'], 96),
        ("30m", db['OHCLVData30m'], 48),
        ("60m", db['OHCLVData1hr'], 24),
        ("1440m", db['OHCLVData'], 2000),  # daily
        ("10080m", db['OHCLVData2'], 500),  # weekly
    ]
    queues = []
    tasks = []
    try:
        # Send initial historical data for all timeframes
        initial_payload = {}
        for tf, coll, length in timeframes:
            data = await coll.find({'tickerID': ticker}).sort('timestamp', 1).to_list(length=length)
            candles = []
            for item in data:
                # Prepare base candle
                candle = {
                    'open': float(str(item['open'])[:8]),
                    'high': float(str(item['high'])[:8]),
                    'low': float(str(item['low'])[:8]),
                    'close': float(str(item['close'])[:8])
                }
                ts_val = item['timestamp']
                dt = None
                if isinstance(ts_val, (int, float)):
                    dt = datetime.datetime.utcfromtimestamp(ts_val)
                elif hasattr(ts_val, 'isoformat'):
                    try:
                        dt = ts_val
                    except Exception:
                        pass
                elif isinstance(ts_val, str):
                    try:
                        dt = isoparse(ts_val)
                    except Exception:
                        pass
                if dt is not None:
                    if tf in ["1m", "5m", "15m", "30m", "60m"]:
                        candle['time'] = int(dt.timestamp())
                    elif tf in ["1440m", "10080m"]:
                        candle['time'] = dt.strftime("%Y-%m-%d")
                    else:
                        candle['time'] = int(dt.timestamp())
                else:
                    candle['time'] = str(ts_val)
                candles.append(candle)
            initial_payload[tf] = candles
        await websocket.send_text(json.dumps({'type': 'init', 'data': initial_payload}))

        # Subscribe to all timeframes for this ticker
        for tf, _, _ in timeframes:
            q = asyncio.Queue()
            pubsub_channels[(ticker, tf)].append(q)
            queues.append((tf, q))

        while True:
            try:
                tasks = [asyncio.create_task(q.get()) for _, q in queues]
                done, pending = await asyncio.wait(
                    tasks,
                    return_when=asyncio.FIRST_COMPLETED
                )
                for finished in done:
                    # Find which queue this task belonged to
                    for idx, task in enumerate(tasks):
                        if task is finished:
                            tf, _ = queues[idx]
                            break
                    cndl = finished.result()
                    # Clean and format candle for frontend: ObjectId->str, datetime->iso, time->ISO 8601 string
                    def clean_candle(obj):
                        if isinstance(obj, dict):
                            return {k: clean_candle(v) for k, v in obj.items()}
                        elif isinstance(obj, list):
                            return [clean_candle(i) for i in obj]
                        elif isinstance(obj, ObjectId):
                            return str(obj)
                        elif isinstance(obj, (datetime.datetime, datetime.date)):
                            # Always output as ISO 8601 string with 'Z' if UTC
                            if obj.tzinfo is not None:
                                return obj.astimezone(datetime.timezone.utc).replace(tzinfo=None).isoformat() + 'Z'
                            return obj.isoformat()
                        else:
                            return obj
                    cndl_clean = clean_candle(cndl)
                    # Set 'time' field for Lightweight Charts compatibility
                    # Intraday (1m, 5m, 15m, 30m, 60m): time = UNIX timestamp (int, seconds)
                    # Daily/Weekly (1440m, 10080m): time = 'YYYY-MM-DD' string
                    if 'timestamp' in cndl_clean:
                        ts_val = cndl_clean['timestamp']
                        # Try to parse timestamp as datetime
                        dt = None
                        if isinstance(ts_val, (int, float)):
                            dt = datetime.datetime.utcfromtimestamp(ts_val)
                        elif isinstance(ts_val, str):
                            try:
                                dt = isoparse(ts_val)
                            except Exception:
                                pass
                        if dt is not None:
                            if tf in ["1m", "5m", "15m", "30m", "60m"]:
                                cndl_clean['time'] = int(dt.timestamp())
                            elif tf in ["1440m", "10080m"]:
                                cndl_clean['time'] = dt.strftime("%Y-%m-%d")
                            else:
                                cndl_clean['time'] = int(dt.timestamp())
                        else:
                            # fallback: just pass as string
                            cndl_clean['time'] = str(ts_val)
                        del cndl_clean['timestamp']
                    print(f"[WS] Sending new_candle: timeframe={tf}, candle={cndl_clean}")
                    await websocket.send_text(json.dumps({"type": "new_candle", "timeframe": tf, "candle": cndl_clean}))
                # Cancel all pending tasks to avoid warnings
                for p in pending:
                    p.cancel()
                    try:
                        await p
                    except asyncio.CancelledError:
                        pass
            except WebSocketDisconnect:
                # Client disconnected, break loop and cleanup
                break
            except Exception as e:
                import traceback
                print(f"Exception in /ws/chartdata loop: {e}")
                traceback.print_exc()
                try:
                    await websocket.send_text(json.dumps({'error': str(e)}))
                except Exception:
                    pass
                break
    except WebSocketDisconnect:
        print("WebSocketDisconnect: client closed connection on /ws/chartdata")
    except Exception as e:
        import traceback
        print(f"Exception in /ws/chartdata: {e}")
        traceback.print_exc()
        try:
            await websocket.send_text(json.dumps({'error': str(e)}))
        except Exception:
            pass
    finally:
        # Clean up any tasks left (if loop exited with tasks still pending)
        for t in tasks:
            if not t.done():
                t.cancel()
                try:
                    await t
                except asyncio.CancelledError:
                    pass
        for tf, q in queues:
            try:
                pubsub_channels[(ticker, tf)].remove(q)
            except (KeyError, ValueError):
                pass
        try:
            await websocket.close()
        except Exception:
            pass

# To run: uvicorn ws.main:app --reload
# wscat -c "ws://localhost:8000/ws/stream"
# wscat -c "ws://localhost:8000/ws/assetinfo?tickers=TSLA,AAPL,BTCUSD"
# wscat -c "ws://localhost:8000/ws/watchpanel?user=LarryDarko"
# wscat -c "ws://localhost:8000/ws/symbols?symbols=RDDT,TSLA"
# wscat -c "ws://localhost:8000/ws/raw" - this listens to raw messages to better understand the data structure
# wscat -c "ws://localhost:8000/ws/chartdata?ticker=TSLA"