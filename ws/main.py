import os
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import websockets
import ssl
import asyncio

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

message_queue = asyncio.Queue(maxsize=1000)  # Holds latest messages

crypto_symbols = ["BTCUSD", "ETHUSD"]
stock_symbols = ["RDDT", "TSLA", "SPY", "MNMD"]

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

# To run: uvicorn ws.main:app --reload
# wscat -c "ws://localhost:8000/ws/stream"
# wscat -c "ws://localhost:8000/ws/symbols?symbols=RDDT,TSLA"