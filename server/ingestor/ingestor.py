"""
SIMPLE Tiingo Ingestor - No race conditions, no complexity
- Market open: Subscribe to tickers
- Receive data: Send to Redis
- Market close OR exception: Unsubscribe and exit cleanly
- Next day: Fresh start
"""
import sys
sys.path.append('.')
import datetime
import os
import json
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import websockets
import ssl
import asyncio
import motor.motor_asyncio
import logging
import redis.asyncio as aioredis
import signal
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
import pytz

load_dotenv()

# --- Logging setup ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("ingestor")

# Filter health check logs
class HealthCheckFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        message = record.getMessage()
        return not any(endpoint in message for endpoint in ['/metrics', '/ready', '/health'])

logging.getLogger("uvicorn.access").addFilter(HealthCheckFilter())

# --- Config ---
TIINGO_API_KEY = os.getenv('TIINGO_KEY')
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

# --- FastAPI app ---
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Clients ---
mongo_client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db = mongo_client.get_database('EreunaDB')

try:
    redis_client = aioredis.from_url(REDIS_URL)
    logger.info(f"✓ Redis connected: {REDIS_URL}")
except Exception as e:
    redis_client = None
    logger.error(f"✗ Redis connection failed: {e}")

# --- Market hours calculation (auto DST) ---
def get_market_hours_utc():
    et = pytz.timezone('US/Eastern')
    now_et = datetime.datetime.now(et)
    open_et = now_et.replace(hour=9, minute=30, second=0, microsecond=0)
    close_et = now_et.replace(hour=16, minute=0, second=0, microsecond=0)
    return (open_et.astimezone(pytz.UTC).hour, open_et.astimezone(pytz.UTC).minute,
            close_et.astimezone(pytz.UTC).hour, close_et.astimezone(pytz.UTC).minute)

MARKET_OPEN_H, MARKET_OPEN_M, MARKET_CLOSE_H, MARKET_CLOSE_M = get_market_hours_utc()
logger.info(f"Market hours: {MARKET_OPEN_H}:{MARKET_OPEN_M:02d} - {MARKET_CLOSE_H}:{MARKET_CLOSE_M:02d} UTC")

async def is_holiday():
    """
    Check if today is a market holiday by querying the Stats collection.
    Returns True if today is a holiday (in New York timezone).
    """
    try:
        # Get current date in New York timezone
        ny_tz = pytz.timezone('America/New_York')
        today = datetime.datetime.now(ny_tz).strftime('%Y-%m-%d')
        
        # Query the Stats collection for holidays
        holidays_doc = await db.Stats.find_one({"_id": "Holidays"})
        
        if not holidays_doc or "Holidays" not in holidays_doc:
            logger.warning("No holidays document found in Stats collection")
            return False
        
        # Check if today matches any holiday date
        for holiday in holidays_doc["Holidays"]:
            if holiday.get("date") == today:
                return True
        
        return False
    except Exception as e:
        logger.error(f"Error checking holidays: {e}")
        return False  # Fail open - don't block trading on error

def is_market_hours():
    now = datetime.datetime.utcnow()
    if now.weekday() >= 5:  # Weekend
        return False
    open_time = now.replace(hour=MARKET_OPEN_H, minute=MARKET_OPEN_M, second=0, microsecond=0)
    close_time = now.replace(hour=MARKET_CLOSE_H, minute=MARKET_CLOSE_M, second=0, microsecond=0)
    return open_time <= now <= close_time

# --- Bandwidth tracking ---
bandwidth_stats = {}  # {symbol: {'bytes': int, 'messages': int}}

def print_bandwidth():
    print("\n=== BANDWIDTH USAGE SUMMARY ===")
    total_bytes = sum(s['bytes'] for s in bandwidth_stats.values())
    total_msgs = sum(s['messages'] for s in bandwidth_stats.values())
    unique_symbols = len(bandwidth_stats)
    
    print(f"Total Symbols: {unique_symbols}")
    print(f"Total Messages: {total_msgs:,}")
    print(f"Total Bandwidth: {total_bytes/1024/1024:.2f} MB ({total_bytes/1024/1024/1024:.3f} GB)")
    if total_msgs > 0:
        print(f"Avg per Message: {total_bytes/total_msgs:.0f} bytes")
    print("================================\n")

# --- Shutdown flag ---
shutdown_requested = False

def handle_shutdown(signum, frame):
    global shutdown_requested
    print("\n🛑 Shutdown signal received")
    print_bandwidth()
    shutdown_requested = True

signal.signal(signal.SIGINT, handle_shutdown)
signal.signal(signal.SIGTERM, handle_shutdown)

# --- THE CORE: Simple subscription function ---
async def tiingo_subscription():
    """
    Connect to Tiingo, subscribe, relay to Redis, unsubscribe on close/error.
    THIS IS IT. Nothing more, nothing less.
    """
    # Get tickers from DB
    logger.info("Loading tickers from database...")
    try:
        query = {
            "Delisted": False,
            "Exchange": {"$in": ["NASDAQ", "NYSE"]}
        }
        docs = await db.AssetInfo.find(query, {"Symbol": 1, "_id": 0}).to_list(length=None)
        tickers = [d.get("Symbol").upper() for d in docs if d.get("Symbol")]
        tickers = list(dict.fromkeys(tickers))  # dedupe
        logger.info(f"✓ Loaded {len(tickers)} tickers for bandwidth test (Stocks + ETFs, non-delisted)")
    except Exception as e:
        logger.error(f"✗ Failed to load tickers: {e}")
        return
    
    if not tickers:
        logger.warning("No tickers to subscribe to")
        return
    
    # Connect to Tiingo
    ws_url = "wss://api.tiingo.com/iex"
    ssl_ctx = ssl.create_default_context()
    subscription_id = None
    
    try:
        logger.info(f"Connecting to {ws_url}...")
        async with websockets.connect(ws_url, ssl=ssl_ctx) as ws:
            logger.info("✓ Connected to Tiingo")
            
            # Subscribe
            subscribe_msg = {
                "eventName": "subscribe",
                "authorization": TIINGO_API_KEY,
                "eventData": {
                    "thresholdLevel": 6,
                    "tickers": tickers
                }
            }
            
            logger.info(f"Subscribing to {len(tickers)} tickers...")
            await ws.send(json.dumps(subscribe_msg))
            
            # Wait for confirmation
            response = await asyncio.wait_for(ws.recv(), timeout=10)
            logger.info(f"Subscribe response: {response}")
            
            resp_data = json.loads(response)
            subscription_id = resp_data.get('data', {}).get('subscriptionId')
            if not subscription_id:
                raise ValueError(f"No subscriptionId in response: {response}")
            
            logger.info(f"✓ Subscribed with ID: {subscription_id}")
            
            # Receive and relay messages
            while True:
                # Check if market closed or shutdown requested
                if not is_market_hours() or shutdown_requested:
                    logger.info("Market closed or shutdown requested - breaking loop")
                    break
                
                # Receive message with timeout
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=5)
                except asyncio.TimeoutError:
                    continue  # Normal timeout, just check conditions and continue
                
                # Parse message
                try:
                    data = json.loads(msg)
                except Exception as e:
                    logger.error(f"JSON decode error: {e}")
                    continue
                
                # Skip heartbeat/info messages
                if data.get("messageType") in ("I", "H"):
                    continue
                
                # Process market data
                if (data.get("messageType") == "A" and 
                    data.get("service") == "iex" and
                    isinstance(data.get("data"), list) and len(data["data"]) > 2):
                    
                    symbol = data["data"][1].lower()
                    msg_bytes = len(msg.encode("utf-8"))
                    
                    # Track bandwidth
                    stats = bandwidth_stats.setdefault(symbol, {'bytes': 0, 'messages': 0})
                    stats['bytes'] += msg_bytes
                    stats['messages'] += 1
                    
                    # Send to Redis
                    if redis_client:
                        try:
                            await redis_client.publish('tiingo:raw', msg)
                            await redis_client.xadd('tiingo:stream', {'data': msg}, maxlen=10000, approximate=True)
                        except Exception as e:
                            logger.error(f"Redis error: {e}")
    
            # Unsubscribe before closing
            if subscription_id:
                logger.info(f"Unsubscribing from subscription {subscription_id}...")
                try:
                    unsubscribe_msg = {
                        "eventName": "unsubscribe",
                        "authorization": TIINGO_API_KEY,
                        "eventData": {
                            "subscriptionId": subscription_id,
                            "tickers": tickers
                        }
                    }
                    await ws.send(json.dumps(unsubscribe_msg))
                    response = await asyncio.wait_for(ws.recv(), timeout=5)
                    logger.info(f"Unsubscribe response: {response}")
                    
                    resp_data = json.loads(response)
                    # 404 is expected if Tiingo already unsubscribed (e.g., market close)
                    if resp_data.get('response', {}).get('code') == 404:
                        logger.info("✓ Subscription already ended by Tiingo (404)")
                    elif resp_data.get('response', {}).get('code') == 200:
                        logger.info("✓ Unsubscribe successful (200)")
                except Exception as e:
                    logger.info(f"Unsubscribe error (connection may already be closed): {e}")
    
    except Exception as e:
        logger.error(f"Error in subscription: {e}")
    
    finally:
        logger.info("Subscription ended cleanly")
        print_bandwidth()

# --- Market hours loop ---
async def market_loop():
    """Check market hours every 10 seconds, run subscription when open"""
    logger.info("Market loop started")
    holiday_logged = False
    
    while not shutdown_requested:
        # Check if today is a holiday
        if await is_holiday():
            if not holiday_logged:
                holiday_logged = True
            await asyncio.sleep(60)
            continue
        
        # Reset flag when no longer a holiday
        holiday_logged = False
        
        if is_market_hours():
            logger.info("🔔 Market is OPEN - starting subscription")
            await tiingo_subscription()
            logger.info("Subscription ended, waiting for next market open...")
        else:
            logger.debug("Market closed, checking again in 10s...")
        
        await asyncio.sleep(10)
    
    logger.info("Market loop ended")

# --- Startup ---
@app.on_event("startup")
async def startup():
    logger.info("🚀 Ingestor starting...")
    asyncio.create_task(market_loop())

# --- Shutdown ---
@app.on_event("shutdown")
async def shutdown():
    global shutdown_requested
    logger.info("🛑 Ingestor shutting down...")
    shutdown_requested = True
    await asyncio.sleep(2)  # Give tasks time to cleanup
    
    if redis_client:
        try:
            await redis_client.close()
            logger.info("✓ Redis closed")
        except Exception as e:
            logger.error(f"Error closing Redis: {e}")
    
    try:
        mongo_client.close()
        logger.info("✓ Mongo closed")
    except Exception as e:
        logger.error(f"Error closing Mongo: {e}")
    
    logger.info("✓ Shutdown complete")

# --- Health endpoints ---
@app.get("/ready")
async def ready():
    return {"status": "ready"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/metrics")
async def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
