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
                if data.get("service") != "crypto_data":
                    continue
                d = data.get("data")
                if not (isinstance(d, list) and len(d) > 5):
                    continue
                symbol = d[1].upper()
                price = float(d[5])
                ts = d[2]  # ISO8601 string

                bucket = get_5min_bucket(ts)
                key = (symbol, bucket)
                candle = candles.get(key)
                if not candle:
                    # Use the bucket start time as the candle timestamp (UTC, from payload)
                    candles[key] = {
                        "timestamp": bucket,  # Already UTC and rounded
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
                    # If the current time is 5 minutes past the bucket, flush it
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