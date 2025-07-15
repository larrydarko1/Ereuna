import asyncio
import json
from datetime import datetime, timedelta, timezone
import logging

logger = logging.getLogger("aggregator")
logger.setLevel(logging.INFO)

def get_5min_bucket(ts):
    # ts: ISO8601 string or epoch ms
    if isinstance(ts, (int, float)):
        dt = datetime.utcfromtimestamp(ts / 1000).replace(tzinfo=timezone.utc)
    elif isinstance(ts, str):
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone(timezone.utc)
    else:
        raise ValueError("Unknown timestamp format")
    dt = dt.replace(second=0, microsecond=0)
    minute = (dt.minute // 5) * 5
    return dt.replace(minute=minute)

async def start_aggregator(message_queue, mongo_client):
    db = mongo_client['EreunaDB']
    collection = db['OHCLVData5m']
    candles = {}  # {(symbol, bucket): candle_dict}

    try:
        while True:
            msg = await message_queue.get()
            try:
                data = json.loads(msg)
                service = data.get("service")
                d = data.get("data")
                if not isinstance(d, list):
                    continue

                # --- Parse symbol, price, timestamp for both crypto and stocks ---
                if service == "crypto_data" and len(d) > 5:
                    symbol = d[1].upper()
                    price = float(d[5])
                    ts = d[2]
                elif service == "iex" and len(d) > 2:
                    symbol = d[1].upper()
                    price = float(d[2])
                    ts = d[0]
                else:
                    continue

                bucket = get_5min_bucket(ts)
                key = (symbol, bucket)
                candle = candles.get(key)
                if not candle:
                    candles[key] = {
                        "timestamp": bucket,
                        "tickerID": symbol,
                        "open": price,
                        "high": price,
                        "low": price,
                        "close": price,
                    }
                else:
                    candle["high"] = max(candle["high"], price)
                    candle["low"] = min(candle["low"], price)
                    candle["close"] = price

                # Check for finished buckets and flush them
                now = datetime.utcnow().replace(second=0, microsecond=0, tzinfo=timezone.utc)
                finished = []
                docs = []
                for (sym, bkt), cndl in candles.items():
                    if now >= bkt + timedelta(minutes=5):
                        docs.append({
                            "timestamp": cndl["timestamp"],
                            "tickerID": cndl["tickerID"],
                            "open": cndl["open"],
                            "close": cndl["close"],
                            "high": cndl["high"],
                            "low": cndl["low"]
                        })
                        finished.append((sym, bkt))
                if docs:
                    try:
                        await asyncio.get_event_loop().run_in_executor(
                            None, lambda: collection.insert_many(docs)
                        )
                        logger.info(f"Inserted {len(docs)} OHCLVData5m candles")
                    except Exception as e:
                        logger.error(f"MongoDB insert error: {e}")
                    for k in finished:
                        candles.pop(k, None)

            except Exception as e:
                logger.error(f"Aggregator message error: {e}")

    except asyncio.CancelledError:
        # On shutdown, flush all remaining candles
        docs = []
        for cndl in candles.values():
            docs.append({
                "timestamp": cndl["timestamp"],
                "tickerID": cndl["tickerID"],
                "open": cndl["open"],
                "close": cndl["close"],
                "high": cndl["high"],
                "low": cndl["low"]
            })
        if docs:
            try:
                await asyncio.get_event_loop().run_in_executor(
                    None, lambda: collection.insert_many(docs)
                )
                logger.info(f"Aggregator shutdown: flushed {len(docs)} candles")
            except Exception as e:
                logger.error(f"MongoDB insert error on shutdown: {e}")
                
async def aggregate_higher_timeframes(mongo_client):
    db = mongo_client['EreunaDB']
    col_5m = db['OHCLVData5m']
    configs = [
        {"minutes": 15, "collection": db['OHCLVData15m'], "window": 3},
        {"minutes": 30, "collection": db['OHCLVData30m'], "window": 6},
        {"minutes": 60, "collection": db['OHCLVData1hr'], "window": 12},
    ]

    while True:
        try:
            now = datetime.utcnow().replace(second=0, microsecond=0, tzinfo=timezone.utc)
            # Get all distinct symbols in the last hour
            since = now - timedelta(hours=1)
            symbols = col_5m.distinct("tickerID", {"timestamp": {"$gte": since}})
            for cfg in configs:
                tf = cfg["minutes"]
                window = cfg["window"]
                col = cfg["collection"]
                # For each symbol, aggregate the last N 5m candles for each completed bucket
                for symbol in symbols:
                    # Find the latest completed bucket for this timeframe
                    last_bucket = now - timedelta(minutes=now.minute % tf, seconds=now.second, microseconds=now.microsecond)
                    # Don't aggregate the current incomplete bucket
                    last_complete = last_bucket - timedelta(minutes=tf)
                    # Get the N 5m candles for this bucket
                    candles = list(col_5m.find(
                        {
                            "tickerID": symbol,
                            "timestamp": {
                                "$gte": last_complete,
                                "$lt": last_complete + timedelta(minutes=tf)
                            }
                        }
                    ).sort("timestamp", 1))
                    if len(candles) == window:
                        o = candles[0]["open"]
                        c = candles[-1]["close"]
                        h = max(c["high"] for c in candles)
                        l = min(c["low"] for c in candles)
                        doc = {
                            "timestamp": last_complete,
                            "tickerID": symbol,
                            "open": o,
                            "close": c,
                            "high": h,
                            "low": l
                        }
                        # Upsert to avoid duplicates
                        col.update_one(
                            {"tickerID": symbol, "timestamp": last_complete},
                            {"$set": doc},
                            upsert=True
                        )
            logger.info("Higher timeframe aggregation complete")
        except Exception as e:
            logger.error(f"Error in higher timeframe aggregation: {e}")
        await asyncio.sleep(300)  # Run every 5 minutes