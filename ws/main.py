import os
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

@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket, symbol: str = Query(...)):
    await websocket.accept()
    if not symbol:
        await websocket.send_text(json.dumps({"error": "No symbol provided"}))
        await websocket.close()
        return

    try:
        print(f"Connecting to Tiingo for symbol: {symbol}")
        async with websockets.connect(TIINGO_WS_URL) as tiingo_ws:
            subscribe_msg = {
                "eventName": "subscribe",
                "authorization": TIINGO_API_KEY,
                "eventData": {
                    "thresholdLevel": 6,
                    "tickers": [symbol]
                }
            }
            print("Sending subscribe message:", subscribe_msg)
            await tiingo_ws.send(json.dumps(subscribe_msg))

            while True:
                msg = await tiingo_ws.recv()
                print("Received from Tiingo:", msg)
                try:
                    tiingo_data = json.loads(msg)
                except Exception as e:
                    print("JSON decode error:", e)
                    continue

                # Only handle dict messages
                if isinstance(tiingo_data, dict):
                    # Handle error messages
                    if tiingo_data.get("messageType") == "E":
                        await websocket.send_text(json.dumps({"error": tiingo_data.get("response", {}).get("message", "Unknown error from Tiingo")}))
                        await websocket.close()
                        break
                    # Handle info/heartbeat messages
                    if tiingo_data.get("messageType") in ("I", "H"):
                        continue
                    # Handle aggregate tick data
                    if tiingo_data.get("messageType") == "A" and "data" in tiingo_data:
                        data = tiingo_data["data"]
                        # data is a list: [timestamp, symbol, last]
                        if isinstance(data, list) and len(data) >= 3:
                            payload = {
                                "symbol": data[1],
                                "last": data[2],
                                "timestamp": data[0],
                            }
                            await websocket.send_text(json.dumps(payload))
                        continue
                # If message is not a dict, just ignore or log
                else:
                    print("Non-dict message from Tiingo:", tiingo_data)
                # Optionally, handle info messages or ignore them
    except WebSocketDisconnect:
        print("WebSocket client disconnected")
    except Exception as e:
        print("Exception:", e)
        await websocket.send_text(json.dumps({"error": str(e)}))
        await websocket.close()

# To run: uvicorn ws.main:app --reload
# To test: wscat -c "ws://localhost:8000/ws/stream?symbol=AAPL"