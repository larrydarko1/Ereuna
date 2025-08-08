import asyncio
import json
from datetime import datetime, timedelta, timezone
import logging
import motor.motor_asyncio
from organizer import updateTimeSeries
from collections import defaultdict

# Global pubsub registry: { (symbol, timeframe): [asyncio.Queue, ...] }
pubsub_channels = defaultdict(list)

async def publish_candle(symbol, timeframe, candle):
    for queue in pubsub_channels[(symbol, timeframe)]:
        await queue.put(candle)

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
    # Ensure mongo_client is a Motor client
    if not hasattr(mongo_client, 'get_database'):
        logger.error("mongo_client is not a Motor client. Please use motor.motor_asyncio.AsyncIOMotorClient.")
        raise TypeError("mongo_client must be a Motor AsyncIOMotorClient instance.")
    db = mongo_client.get_database('EreunaDB')
    collection = db.get_collection('OHCLVData1m')
    candles = {}  # {(symbol, bucket): candle_dict}

    try:
        processed_count = 0
        anomaly_count = 0
        while True:
            msg = await message_queue.get()
            try:
                data = json.loads(msg)
                service = data.get("service")
                d = data.get("data")
                if not isinstance(d, list):
                    logger.warning(f"Malformed data: {data}")
                    continue

                # --- Parse symbol, price, timestamp for IEX data only ---
                if service == "iex" and len(d) > 2:
                    symbol = d[1].upper()
                    price = float(d[2])
                    ts = d[0]
                else:
                    logger.warning(f"Unknown service or data format: {data}")
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
                        await collection.insert_many(docs)
                        processed_count += len(docs)
                        # Publish each new candle to pubsub
                        for cndl in docs:
                            await publish_candle(cndl["tickerID"], "1m", cndl)
                    except Exception as e:
                        logger.error(f"MongoDB insert error: {e}, docs: {docs}")
                    for k in finished:
                        candles.pop(k, None)
            except Exception as e:
                logger.error(f"Aggregator message error: {e}, msg: {msg}")
                anomaly_count += 1
            if anomaly_count > 0 and anomaly_count % 10 == 0:
                logger.warning(f"Aggregator anomalies detected: {anomaly_count}")
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
                await collection.insert_many(docs)
                logger.info(f"Aggregator shutdown: flushed {len(docs)} 1m candles")
                # Publish remaining candles on shutdown
                for cndl in docs:
                    await publish_candle(cndl["tickerID"], "1m", cndl)
            except Exception as e:
                logger.error(f"MongoDB insert error on shutdown: {e}")
                
async def aggregate_higher_timeframes(mongo_client):
    # Ensure mongo_client is a Motor client
    if not hasattr(mongo_client, 'get_database'):
        logger.error("mongo_client is not a Motor client. Please use motor.motor_asyncio.AsyncIOMotorClient.")
        raise TypeError("mongo_client must be a Motor AsyncIOMotorClient instance.")
    db = mongo_client.get_database('EreunaDB')
    col_1m = db.get_collection('OHCLVData1m')
    configs = [
        {"minutes": 5, "collection": db.get_collection('OHCLVData5m'), "window": 5},
        {"minutes": 15, "collection": db.get_collection('OHCLVData15m'), "window": 15},
        {"minutes": 30, "collection": db.get_collection('OHCLVData30m'), "window": 30},
        {"minutes": 60, "collection": db.get_collection('OHCLVData1hr'), "window": 60},
        {"minutes": 1440, "collection": db.get_collection('OHCLVData'), "window": 1440},  # Daily aggregation
        {"minutes": 10080, "collection": db.get_collection('OHCLVData2'), "window": 10080},  # Weekly aggregation
    ]

    processed_count = 0
    anomaly_count = 0
    while True:
        try:
            now = datetime.utcnow().replace(second=0, microsecond=0, tzinfo=timezone.utc)
            since = now - timedelta(days=2)
            symbols = await col_1m.distinct("tickerID", {"timestamp": {"$gte": since}})
            for cfg in configs:
                tf = cfg["minutes"]
                window = cfg["window"]
                col = cfg["collection"]
                for symbol in symbols:
                    # Always update the current bucket every minute
                    if tf == 1440:
                        # Daily bucket: truncate to midnight UTC
                        bucket_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
                        start = bucket_start
                        end = bucket_start + timedelta(days=1)
                    elif tf == 10080:
                        # Weekly bucket: truncate to start of week (Monday 00:00 UTC)
                        weekday = now.weekday()
                        week_start = now - timedelta(days=weekday, hours=now.hour, minutes=now.minute, seconds=now.second, microseconds=now.microsecond)
                        start = week_start
                        end = week_start + timedelta(days=7)
                    else:
                        bucket_start = now - timedelta(minutes=now.minute % tf, seconds=now.second, microseconds=now.microsecond)
                        start = bucket_start
                        end = bucket_start + timedelta(minutes=tf)
                    candles = await col_1m.find(
                        {
                            "tickerID": symbol,
                            "timestamp": {
                                "$gte": start,
                                "$lt": end
                            }
                        }
                    ).sort("timestamp", 1).to_list(length=window)
                    if len(candles) > 0:
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
                            "low": l,
                            "count": len(candles)
                        }
                        try:
                            await col.delete_one({"tickerID": symbol, "timestamp": start})
                            await col.insert_one(doc)
                            processed_count += 1
                            # Publish new higher timeframe candle to pubsub
                            await publish_candle(symbol, f"{tf}m", doc)
                        except Exception as e:
                            logger.error(f"Insert error for {symbol} {start}: {e}")
                            anomaly_count += 1
                    else:
                        logger.info(f"No data for {symbol} {start} in {tf}m bucket")
                        anomaly_count += 1
            if anomaly_count > 0 and anomaly_count % 10 == 0:
                logger.warning(f"Aggregation anomalies detected: {anomaly_count}")
        except Exception as e:
            logger.error(f"Error in higher timeframe aggregation: {e}")
            anomaly_count += 1
        await asyncio.sleep(60)  # Run every minute for 1m candles
