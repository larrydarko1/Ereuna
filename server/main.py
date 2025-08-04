import sys
sys.path.append('.')
from organizer import Daily
import datetime as dt
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


# Only stocks/ETFs: get tickers from DB at startup
stock_symbols = []
ssl_ctx = ssl._create_unverified_context()

def stock_filter(msg):
    return msg.get("messageType") == "A" and isinstance(msg.get("data"), list) and len(msg["data"]) >= 3


import time
import signal
import sys


# Bandwidth tracking for stocks


# Bandwidth tracking for stocks only
stock_bandwidth_stats = {}  # {symbol: {'bytes': int, 'messages': int}}
stock_bandwidth_history = {}  # {symbol: [(timestamp, bytes)]}
last_report_time = 0
MARKET_OPEN_HOUR = 13  # UTC 13:30 (9:30am ET)
MARKET_CLOSE_HOUR = 20  # UTC 20:00 (4:00pm ET)
MARKET_OPEN_MINUTE = 30
MARKET_CLOSE_MINUTE = 0

def print_total_bandwidth():
    print("\n=== TOTAL BANDWIDTH USAGE PER TICKER (STOCKS) ===")
    total_bytes = 0
    total_msgs = 0
    for symbol, stats in stock_bandwidth_stats.items():
        print(f"{symbol.upper()}: {stats['bytes']/1024/1024:.2f} MB, {stats['messages']} msgs")
        total_bytes += stats['bytes']
        total_msgs += stats['messages']
    print(f"TOTAL STOCKS: {total_bytes/1024/1024:.2f} MB, {total_msgs} msgs (all stock/ETF tickers)")
    print("===============================================\n")

# Print totals on shutdown
def handle_shutdown(signum, frame):
    print("\nReceived shutdown signal. Printing total bandwidth usage...")
    print_total_bandwidth()
    sys.exit(0)

signal.signal(signal.SIGINT, handle_shutdown)
signal.signal(signal.SIGTERM, handle_shutdown)

def is_market_hours():
    now = datetime.datetime.utcnow()
    # Exclude weekends (Saturday=5, Sunday=6)
    if now.weekday() >= 5:
        return False
    open_time = now.replace(hour=MARKET_OPEN_HOUR, minute=MARKET_OPEN_MINUTE, second=0, microsecond=0)
    close_time = now.replace(hour=MARKET_CLOSE_HOUR, minute=MARKET_CLOSE_MINUTE, second=0, microsecond=0)
    return open_time <= now <= close_time


async def relay_tiingo(ws_url, subscribe_msg, ssl_ctx, filter_fn):
    global last_report_time
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
                            d = tiingo_data.get("data")
                            service = tiingo_data.get("service")
                            # --- Bandwidth measurement for stocks only ---
                            if service == "iex" and isinstance(d, list) and len(d) > 2:
                                symbol = d[1].lower()
                                msg_bytes = len(msg.encode("utf-8"))
                                stats = stock_bandwidth_stats.setdefault(symbol, {'bytes': 0, 'messages': 0})
                                stats['bytes'] += msg_bytes
                                stats['messages'] += 1
                                # Save history for periodic reporting
                                history = stock_bandwidth_history.setdefault(symbol, [])
                                history.append((time.time(), msg_bytes))
                                # --- Cache the latest quote ---
                                latest_quotes[symbol] = tiingo_data
                                # --- End cache ---
                                try:
                                    await message_queue.put(json.dumps(tiingo_data))
                                except asyncio.QueueFull:
                                    await message_queue.get()
                                    await message_queue.put(json.dumps(tiingo_data))
                    # --- Periodic bandwidth report (every 60s, only during market hours) ---
                    now = time.time()
                    if is_market_hours() and (now - last_report_time > 60):
                        print("\n--- Bandwidth usage per ticker (last 60s, market hours only) ---")
                        for symbol, history in stock_bandwidth_history.items():
                            cutoff = now - 60
                            bytes_last_min = sum(b for t, b in history if t >= cutoff)
                            msgs_last_min = sum(1 for t, b in history if t >= cutoff)
                            print(f"STOCK {symbol.upper()}: {bytes_last_min/1024:.2f} KB/min, {msgs_last_min} msgs/min")
                        print("-------------------------------------------------------------\n")
                        print_total_bandwidth()
                        last_report_time = now
                        # Optionally, prune old history to save memory
                        for symbol in stock_bandwidth_history:
                            stock_bandwidth_history[symbol] = [(t, b) for t, b in stock_bandwidth_history[symbol] if t >= now - 300]
        except Exception as e:
            print(f"Exception in relay_tiingo: {e}")
            print_total_bandwidth()
            await asyncio.sleep(5)  # Retry after delay

# --- Market hours background manager ---
async def market_hours_manager():
    global stock_symbols
    tiingo_task = None
    aggregator_task = None
    higher_tf_task = None
    subscribed = False
    assetinfo_coll = db.AssetInfo
    while True:
        try:
            if is_market_hours():
                if not subscribed:
                    # Fetch tickers from AssetInfo where AssetType is Stock or ETF
                    cursor = assetinfo_coll.find({"AssetType": {"$in": ["Stock", "ETF"]}}, {"Symbol": 1})
                    symbols = set()
                    async for doc in cursor:
                        syms = doc.get("Symbol")
                        if isinstance(syms, list):
                            for s in syms:
                                if isinstance(s, str):
                                    symbols.add(s.upper())
                        elif isinstance(syms, str):
                            symbols.add(syms.upper())
                    stock_symbols = sorted(symbols)
                    print(f"[MarketHours] Subscribing to {len(stock_symbols)} stock/ETF tickers from AssetInfo.")
                    stock_ws_url = "wss://api.tiingo.com/iex"
                    stock_subscribe_msg = {
                        "eventName": "subscribe",
                        "authorization": TIINGO_API_KEY,
                        "eventData": {
                            "thresholdLevel": 6,
                            "tickers": stock_symbols
                        }
                    }
                    tiingo_task = asyncio.create_task(relay_tiingo(stock_ws_url, stock_subscribe_msg, ssl_ctx, stock_filter))
                    aggregator_task = asyncio.create_task(start_aggregator(message_queue, mongo_client))
                    higher_tf_task = asyncio.create_task(aggregate_higher_timeframes(mongo_client))
                    subscribed = True
            else:
                if subscribed:
                    print("[MarketHours] Market closed. Cancelling Tiingo and aggregator tasks.")
                    for t in [tiingo_task, aggregator_task, higher_tf_task]:
                        if t:
                            t.cancel()
                            try:
                                await t
                            except Exception:
                                pass
                    tiingo_task = None
                    aggregator_task = None
                    higher_tf_task = None
                    subscribed = False
            await asyncio.sleep(10)  # Check every 10 seconds
        except Exception as e:
            print(f"[MarketHours] Exception in market_hours_manager: {e}")
            import traceback
            traceback.print_exc()
            await asyncio.sleep(10)

# Start the market hours manager on startup
@app.on_event("startup")
async def start_market_hours_manager():
    asyncio.create_task(market_hours_manager())


# --- Concise Scheduler for Daily() ---
SCHED_CLOSE_HOUR = 20  # UTC 20:00 (4:00pm ET)
SCHED_CLOSE_MIN = 0
SCHED_DELAY_HOURS = 3

def is_trading_day(dtobj):
    return dtobj.weekday() < 5

def next_run_time(now=None):
    now = now or dt.datetime.utcnow()
    # Today's market close
    today_close = now.replace(hour=SCHED_CLOSE_HOUR, minute=SCHED_CLOSE_MIN, second=0, microsecond=0)
    if is_trading_day(now) and now < today_close:
        return today_close + dt.timedelta(hours=SCHED_DELAY_HOURS)
    # Find next trading day
    for i in range(1, 8):
        candidate = now + dt.timedelta(days=i)
        if is_trading_day(candidate):
            return candidate.replace(hour=SCHED_CLOSE_HOUR, minute=SCHED_CLOSE_MIN, second=0, microsecond=0) + dt.timedelta(hours=SCHED_DELAY_HOURS)

async def daily_scheduler():
    while True:
        now = dt.datetime.utcnow()
        run_at = next_run_time(now)
        wait = (run_at - now).total_seconds()
        if wait > 0:
            print(f"[Scheduler] Next Daily() at {run_at} UTC ({wait/60:.1f} min)")
            await asyncio.sleep(wait)
        else:
            print("[Scheduler] Running Daily() now (missed scheduled time)")
        try:
            await Daily()
        except Exception as e:
            print(f"[Scheduler] Exception in Daily(): {e}")

@app.on_event("startup")
async def start_daily_scheduler():
    asyncio.create_task(daily_scheduler())

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
            except (WebSocketDisconnect, RuntimeError):
                return
        else:
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
                if isinstance(d, list) and len(d) > 2 and isinstance(d[1], str) and data.get("service") == "iex":
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
                if service == "iex" and isinstance(d, list) and len(d) > 2:
                    symbol = d[1].lower()
                    if symbol not in symbols:
                        continue
                    latest_close = float(d[2])
                    timestamp = d[0]
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

                if service == "iex" and isinstance(d, list) and len(d) > 2:
                    symbol = d[1].lower()
                    latest_close = float(d[2])
                    timestamp = d[0]
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