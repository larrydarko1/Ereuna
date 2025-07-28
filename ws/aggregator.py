import asyncio
import json
from datetime import datetime, timedelta, timezone
import logging

logger = logging.getLogger("aggregator")
logger.setLevel(logging.INFO)

def get_1min_bucket(ts):
    # ts: ISO8601 string or epoch ms
    if isinstance(ts, (int, float)):
        dt = datetime.utcfromtimestamp(ts / 1000).replace(tzinfo=timezone.utc)
    elif isinstance(ts, str):
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone(timezone.utc)
    else:
        raise ValueError("Unknown timestamp format")
    return dt.replace(second=0, microsecond=0)

async def start_aggregator(message_queue, mongo_client):
    db = mongo_client['EreunaDB']
    collection = db['OHCLVData1m']
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

                bucket = get_1min_bucket(ts)
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
                    if now >= bkt + timedelta(minutes=1):
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
                        logger.info(f"Inserted {len(docs)} OHCLVData1m candles")
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
                logger.info(f"Aggregator shutdown: flushed {len(docs)} 1m candles")
            except Exception as e:
                logger.error(f"MongoDB insert error on shutdown: {e}")
                
async def aggregate_higher_timeframes(mongo_client):
    db = mongo_client['EreunaDB']
    col_1m = db['OHCLVData1m']
    configs = [
        {"minutes": 5, "collection": db['OHCLVData5m'], "window": 5},
        {"minutes": 15, "collection": db['OHCLVData15m'], "window": 15},
        {"minutes": 30, "collection": db['OHCLVData30m'], "window": 30},
        {"minutes": 60, "collection": db['OHCLVData1hr'], "window": 60},
        {"minutes": 1440, "collection": db['OHCLVData'], "window": 1440},  # Daily aggregation
    ]

    while True:
        try:
            now = datetime.utcnow().replace(second=0, microsecond=0, tzinfo=timezone.utc)
            since = now - timedelta(days=2)
            symbols = col_1m.distinct("tickerID", {"timestamp": {"$gte": since}})
            for cfg in configs:
                tf = cfg["minutes"]
                window = cfg["window"]
                col = cfg["collection"]
                for symbol in symbols:
                    # Find the latest completed bucket for this timeframe
                    if tf == 1440:
                        # Daily bucket: truncate to midnight UTC
                        last_bucket = now.replace(hour=0, minute=0, second=0, microsecond=0)
                        last_complete = last_bucket - timedelta(days=1)
                        start = last_complete
                        end = last_complete + timedelta(days=1)
                    else:
                        last_bucket = now - timedelta(minutes=now.minute % tf, seconds=now.second, microseconds=now.microsecond)
                        last_complete = last_bucket - timedelta(minutes=tf)
                        start = last_complete
                        end = last_complete + timedelta(minutes=tf)
                    # Get the N 1m candles for this bucket
                    candles = list(col_1m.find(
                        {
                            "tickerID": symbol,
                            "timestamp": {
                                "$gte": start,
                                "$lt": end
                            }
                        }
                    ).sort("timestamp", 1))
                    if len(candles) == window:
                        o = candles[0]["open"]
                        c = candles[-1]["close"]
                        h = max(c["high"] for c in candles)
                        l = min(c["low"] for c in candles)
                        doc = {
                            "timestamp": start,
                            "tickerID": symbol,
                            "open": o,
                            "close": c,
                            "high": h,
                            "low": l
                        }
                        try:
                            col.insert_one(doc)
                        except Exception as e:
                            # Ignore duplicate key errors, log others
                            if "duplicate key" not in str(e):
                                logger.error(f"Insert error for {symbol} {start}: {e}")
            logger.info("Higher timeframe aggregation complete")
        except Exception as e:
            logger.error(f"Error in higher timeframe aggregation: {e}")
        await asyncio.sleep(60)  # Run every minute for 1m candles
        
