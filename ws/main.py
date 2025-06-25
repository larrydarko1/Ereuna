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

# streams real time data for crypto, forex and stocks
@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    await websocket.accept()

    # Hardcoded symbol lists
    crypto_symbols = ["BTCUSD", "ETHUSD"]
    stock_symbols = ["AAPL", "MSFT", "AMZN"]
    forex_symbols = ["EURUSD", "EURCHF"]

    async def relay_tiingo(ws_url, subscribe_msg, ssl_ctx, filter_fn):
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
                        # Handle error messages
                        if tiingo_data.get("messageType") == "E":
                            await websocket.send_text(json.dumps({"error": tiingo_data.get("response", {}).get("message", "Unknown error from Tiingo")}))
                            await websocket.close()
                            break
                        # Handle info/heartbeat messages
                        if tiingo_data.get("messageType") in ("I", "H"):
                            continue
                        # Filter and relay
                        if filter_fn(tiingo_data):
                            await websocket.send_text(json.dumps(tiingo_data))
        except Exception as e:
            print(f"Exception in relay_tiingo: {e}")
            await websocket.send_text(json.dumps({"error": str(e)}))
            await websocket.close()

    # Define filter functions
    def crypto_filter(msg):
        return msg.get("messageType") == "A" and isinstance(msg.get("data"), list) and len(msg["data"]) > 0 and msg["data"][0] == "Q"
    def stock_filter(msg):
        return msg.get("messageType") == "A" and isinstance(msg.get("data"), list) and len(msg["data"]) >= 3
    def forex_filter(msg):
        return msg.get("messageType") == "A" and isinstance(msg.get("data"), list) and len(msg["data"]) > 0 and msg["data"][0] == "Q"

    # Prepare connection details
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
    forex_ws_url = "wss://api.tiingo.com/fx"
    forex_subscribe_msg = {
        "eventName": "subscribe",
        "authorization": TIINGO_API_KEY,
        "eventData": {
            "tickers": forex_symbols,
            "thresholdLevel": 5
        }
    }
    ssl_ctx = ssl._create_unverified_context()

    # Run all relays concurrently
    await asyncio.gather(
        relay_tiingo(crypto_ws_url, crypto_subscribe_msg, ssl_ctx, crypto_filter),
        relay_tiingo(stock_ws_url, stock_subscribe_msg, ssl_ctx, stock_filter),
        relay_tiingo(forex_ws_url, forex_subscribe_msg, ssl_ctx, forex_filter)
    )

# To run: uvicorn ws.main:app --reload
# wscat -c "ws://localhost:8000/ws/stream"