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

#DOESN'T WORK, FIX IT (try it)             
async def aggregate_higher_timeframes(mongo_client):
    # Ensure mongo_client is a Motor client
    if not hasattr(mongo_client, 'get_database'):
        logger.error("mongo_client is not a Motor client. Please use motor.motor_asyncio.AsyncIOMotorClient.")
        raise TypeError("mongo_client must be a Motor AsyncIOMotorClient instance.")
    db = mongo_client.get_database('EreunaDB')
    col_1m = db.get_collection('OHCLVData1m')
    configs = [
        {"minutes": 5, "collection": db.get_collection('OHCLVData5m')},
        {"minutes": 15, "collection": db.get_collection('OHCLVData15m')},
        {"minutes": 30, "collection": db.get_collection('OHCLVData30m')},
        {"minutes": 60, "collection": db.get_collection('OHCLVData1hr')},
        {"minutes": 1440, "collection": db.get_collection('OHCLVData')},  # Daily aggregation
        {"minutes": 10080, "collection": db.get_collection('OHCLVData2')},  # Weekly aggregation
    ]

    while True:
        try:
            now = datetime.utcnow().replace(second=0, microsecond=0, tzinfo=timezone.utc)
            symbols = await col_1m.distinct("tickerID", {"timestamp": {"$gte": now - timedelta(days=7)}})
            for cfg in configs:
                tf = cfg["minutes"]
                col = cfg["collection"]
                bucket_delta = timedelta(minutes=tf)
                delete_ops = []
                insert_docs = []
                publish_ops = []
                for symbol in symbols:
                    min_candle = await col_1m.find_one({"tickerID": symbol}, sort=[("timestamp", 1)])
                    max_candle = await col_1m.find_one({"tickerID": symbol}, sort=[("timestamp", -1)])
                    if not min_candle or not max_candle:
                        continue
                    min_time = min_candle["timestamp"]
                    max_time = max_candle["timestamp"]
                    if tf == 1440:
                        bucket_start = min_time.replace(hour=0, minute=0, second=0, microsecond=0)
                    elif tf == 10080:
                        weekday = min_time.weekday()
                        bucket_start = min_time - timedelta(days=weekday, hours=min_time.hour, minutes=min_time.minute, seconds=min_time.second, microseconds=min_time.microsecond)
                    else:
                        bucket_start = min_time - timedelta(minutes=min_time.minute % tf, seconds=min_time.second, microseconds=min_time.microsecond)
                    last_bucket = None
                    while bucket_start <= now:
                        bucket_end = bucket_start + bucket_delta
                        candles = await col_1m.find({
                            "tickerID": symbol,
                            "timestamp": {"$gte": bucket_start, "$lt": bucket_end}
                        }).sort("timestamp", 1).to_list(length=None)
                        if candles:
                            doc = {
                                "timestamp": bucket_start,
                                "tickerID": symbol,
                                "open": candles[0]["open"],
                                "close": candles[-1]["close"],
                                "high": max(c["high"] for c in candles),
                                "low": min(c["low"] for c in candles),
                                "volume": sum(c.get("volume", 0) for c in candles),
                                "count": len(candles)
                            }
                            last_bucket = (symbol, bucket_start, doc)
                        bucket_start += bucket_delta
                    # Only update the most recent (in-progress) bucket for this symbol/timeframe
                    if last_bucket:
                        symbol, bucket_start, doc = last_bucket
                        delete_ops.append({"tickerID": symbol, "timestamp": bucket_start})
                        insert_docs.append(doc)
                        publish_ops.append((symbol, f"{tf}m", doc))
                if delete_ops and insert_docs:
                    try:
                        # Delete all in-progress buckets in batch
                        await col.delete_many({"$or": delete_ops})
                        # Insert all new in-progress docs in batch
                        await col.insert_many(insert_docs)
                        for symbol, tf_str, doc in publish_ops:
                            await publish_candle(symbol, tf_str, doc)
                    except Exception as e:
                        logger.error(f"Batch delete/insert error for {col.name}: {e}")
        except Exception as e:
            logger.error(f"Error in higher timeframe aggregation: {e}")
        await asyncio.sleep(60)  # Run every minute
