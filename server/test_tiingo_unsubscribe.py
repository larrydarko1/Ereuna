#!/usr/bin/env python3
"""
Test script to verify Tiingo's exact unsubscribe behavior.
This will:
1. Connect to Tiingo WebSocket
2. Subscribe to RDDT
3. Wait for a few messages
4. Send unsubscribe message
5. Observe and log exactly what happens
"""
import asyncio
import json
import os
import ssl
import sys
import websockets
from datetime import datetime

# Get API key from environment
TIINGO_API_KEY = os.getenv('TIINGO_KEY')
if not TIINGO_API_KEY:
    print("ERROR: TIINGO_KEY environment variable not set!")
    sys.exit(1)

# WebSocket URL for IEX data feed
WS_URL = f"wss://api.tiingo.com/iex?token={TIINGO_API_KEY}"

def log(msg):
    """Print timestamped log message"""
    timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    print(f"[{timestamp}] {msg}")

async def test_unsubscribe():
    """Test Tiingo unsubscribe behavior"""
    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE
    subscription_id = None
    
    log("=" * 70)
    log("TIINGO UNSUBSCRIBE TEST - RDDT")
    log("=" * 70)
    
    try:
        log(f"Connecting to: {WS_URL}")
        async with websockets.connect(WS_URL, ssl=ssl_ctx) as ws:
            log("✓ Connected successfully!")
            
            # Step 1: Subscribe to RDDT
            subscribe_msg = {
                "eventName": "subscribe",
                "authorization": TIINGO_API_KEY,
                "eventData": {
                    "thresholdLevel": 6,
                    "tickers": ["rddt"]
                }
            }
            
            log("\n--- STEP 1: Subscribing to RDDT ---")
            log(f"Sending: {json.dumps(subscribe_msg, indent=2)}")
            await ws.send(json.dumps(subscribe_msg))
            
            # Wait for subscription confirmation
            log("Waiting for subscription response...")
            response = await asyncio.wait_for(ws.recv(), timeout=10)
            log(f"Received: {response}")
            
            # Parse subscription ID
            try:
                data = json.loads(response)
                if "data" in data and "subscriptionId" in data["data"]:
                    subscription_id = data["data"]["subscriptionId"]
                    log(f"✓ Extracted subscriptionId: {subscription_id}")
                elif "response" in data and "subscriptionId" in data["response"]:
                    subscription_id = data["response"]["subscriptionId"]
                    log(f"✓ Extracted subscriptionId: {subscription_id}")
            except Exception as e:
                log(f"Warning: Could not parse subscriptionId: {e}")
            
            # Step 2: Receive a few messages to confirm subscription is active
            log("\n--- STEP 2: Receiving market data ---")
            message_count = 0
            for i in range(3):
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=5)
                    message_count += 1
                    # Only show first 200 chars of data messages
                    display_msg = msg if len(msg) < 200 else msg[:200] + "..."
                    log(f"Message {message_count}: {display_msg}")
                except asyncio.TimeoutError:
                    log(f"Timeout waiting for message {i+1}")
                    break
            
            if message_count == 0:
                log("WARNING: No market data received. Market might be closed.")
            
            # Step 3: Unsubscribe
            log("\n--- STEP 3: Unsubscribing ---")
            unsubscribe_msg = {
                "eventName": "unsubscribe",
                "authorization": TIINGO_API_KEY,
                "eventData": {
                    "subscriptionId": subscription_id,
                    "tickers": ["rddt"]
                }
            }
            
            log(f"Sending: {json.dumps(unsubscribe_msg, indent=2)}")
            await ws.send(json.dumps(unsubscribe_msg))
            log("✓ Unsubscribe message sent")
            
            # Step 4: Observe what happens next
            log("\n--- STEP 4: Observing Tiingo's response ---")
            log("Attempting to receive response (10 second timeout)...")
            
            try:
                response = await asyncio.wait_for(ws.recv(), timeout=10)
                log(f"✓ RECEIVED MESSAGE: {response}")
                log("🔍 Tiingo sent a response message!")
                
                # Try to receive more to see if connection closes after
                log("Checking if connection stays open...")
                try:
                    more = await asyncio.wait_for(ws.recv(), timeout=3)
                    log(f"Additional message: {more}")
                except asyncio.TimeoutError:
                    log("No more messages after 3 seconds")
                    
            except websockets.exceptions.ConnectionClosed as e:
                log(f"✓ CONNECTION CLOSED BY TIINGO")
                log(f"   Close code: {e.code}")
                log(f"   Close reason: {e.reason or '(no reason provided)'}")
                log("🔍 Tiingo closed the connection immediately after unsubscribe!")
                
            except asyncio.TimeoutError:
                log("⏱️  TIMEOUT - No response after 10 seconds")
                log("🔍 Tiingo did not send a message or close the connection")
                log("Checking connection state...")
                if ws.closed:
                    log(f"   WebSocket is closed (code: {ws.close_code}, reason: {ws.close_reason})")
                else:
                    log("   WebSocket is still open!")
                    
            except Exception as e:
                log(f"❌ UNEXPECTED ERROR: {type(e).__name__}: {e}")
            
            # Final state check
            log("\n--- FINAL STATE ---")
            log(f"WebSocket closed: {ws.closed}")
            if ws.closed:
                log(f"Close code: {ws.close_code}")
                log(f"Close reason: {ws.close_reason or '(no reason)'}")
            
    except Exception as e:
        log(f"\n❌ ERROR during test: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
    
    log("\n" + "=" * 70)
    log("TEST COMPLETE")
    log("=" * 70)

if __name__ == "__main__":
    print("\n")
    asyncio.run(test_unsubscribe())
    print("\n")
