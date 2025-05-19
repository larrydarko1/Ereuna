import os
import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import websockets

load_dotenv()
TIINGO_API_KEY = os.getenv('TIINGO_KEY')
TIINGO_WS_URL = "wss://api.tiingo.com/iex"

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Track connected clients and their subscribed symbols
clients = {}

@app.websocket("/ws/realtime")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        # Receive the symbol the client wants to subscribe to
        data = await websocket.receive_text()
        req = json.loads(data)
        symbol = req.get("symbol")
        if not symbol:
            await websocket.send_text(json.dumps({"error": "No symbol provided"}))
            await websocket.close()
            return

        # Start Tiingo connection for this symbol
        async with websockets.connect(TIINGO_WS_URL) as tiingo_ws:
            # Authenticate
            await tiingo_ws.send(json.dumps({
                "eventName": "auth",
                "data": {"token": TIINGO_API_KEY}
            }))
            # Subscribe to the symbol
            await tiingo_ws.send(json.dumps({
                "eventName": "subscribe",
                "data": {"thresholdLevel": 5, "tickers": [symbol]}
            }))

            while True:
                msg = await tiingo_ws.recv()
                tiingo_data = json.loads(msg)
                # Extract relevant data (adjust as needed)
                if "data" in tiingo_data and tiingo_data["data"]:
                    tick = tiingo_data["data"][0]
                    payload = {
                        "symbol": tick.get("ticker"),
                        "last": tick.get("last"),
                        "timestamp": tick.get("timestamp"),
                        # Add more fields as needed
                    }
                    await websocket.send_text(json.dumps(payload))
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_text(json.dumps({"error": str(e)}))
        await websocket.close()
        

@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket, symbol: str = Query(...)):
    await websocket.accept()
    if not symbol:
        await websocket.send_text(json.dumps({"error": "No symbol provided"}))
        await websocket.close()
        return

    try:
        async with websockets.connect(TIINGO_WS_URL) as tiingo_ws:
            # Authenticate
            await tiingo_ws.send(json.dumps({
                "eventName": "auth",
                "data": {"token": TIINGO_API_KEY}
            }))
            # Subscribe to the symbol
            await tiingo_ws.send(json.dumps({
                "eventName": "subscribe",
                "data": {"thresholdLevel": 5, "tickers": [symbol]}
            }))

            while True:
                msg = await tiingo_ws.recv()
                tiingo_data = json.loads(msg)
                if "data" in tiingo_data and tiingo_data["data"]:
                    tick = tiingo_data["data"][0]
                    payload = {
                        "symbol": tick.get("ticker"),
                        "open": tick.get("open"),
                        "high": tick.get("high"),
                        "low": tick.get("low"),
                        "close": tick.get("close"),
                        "last": tick.get("last"),
                        "volume": tick.get("volume"),
                        "timestamp": tick.get("timestamp"),
                        "date": tick.get("date") if "date" in tick else tick.get("timestamp", "")[:10]
                    }
                    await websocket.send_text(json.dumps(payload))
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_text(json.dumps({"error": str(e)}))
        await websocket.close()
        #ws://localhost:8000/ws/stream?symbol=AAPL
        
#uvicorn ws.main:app --reload
