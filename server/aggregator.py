import asyncio
import json
from datetime import datetime, timedelta, timezone
import logging
import motor.motor_asyncio
from organizer import updateTimeSeries
from collections import defaultdict

def get_bucket(ts, minutes):
    if isinstance(ts, (int, float)):
        dt = datetime.utcfromtimestamp(ts / 1000).replace(tzinfo=timezone.utc)
    elif isinstance(ts, str):
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone(timezone.utc)
    else:
        raise ValueError("Unknown timestamp format")
    bucket_start = dt.replace(second=0, microsecond=0)
    bucket_start = bucket_start - timedelta(minutes=bucket_start.minute % minutes)
    bucket_end = bucket_start + timedelta(minutes=minutes)
    return bucket_start, bucket_end

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
    # In-memory cache for pending higher timeframe candles
    # Structure: { (symbol, timeframe): { 'open': ..., 'high': ..., ... , 'start': datetime, 'end': datetime, 'final': bool } }
    pending_candles = {}
    HIGHER_TIMEFRAMES = {
        '5m': 5,
        '15m': 15,
        '30m': 30,
        '1hr': 60
    }
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

                # --- Publish the current state of the in-progress 1m candle (with final: False) ---
                await publish_candle(symbol, "1m", {
                    "timestamp": candles[key]["timestamp"],
                    "tickerID": candles[key]["tickerID"],
                    "open": candles[key]["open"],
                    "close": candles[key]["close"],
                    "high": candles[key]["high"],
                    "low": candles[key]["low"],
                    "final": False
                })

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
                        # Publish each finalized 1m candle to pubsub (with final=True)
                        for cndl in docs:
                            await publish_candle(cndl["tickerID"], "1m", {**cndl, "final": True})
                    except Exception as e:
                        logger.error(f"MongoDB insert error: {e}, docs: {docs}")
                    for k in finished:
                        candles.pop(k, None)

                # --- Higher timeframe candle logic (mirroring 1m logic) ---
                for tf, minutes in HIGHER_TIMEFRAMES.items():
                    bucket_start, bucket_end = get_bucket(ts, minutes)
                    tf_key = (symbol, tf)
                    tf_candle = pending_candles.get(tf_key)
                    if not tf_candle or tf_candle.get('end') != bucket_end:
                        # Finalize previous candle if exists and not finalized
                        if tf_candle and not tf_candle.get('final', False):
                            tf_candle['final'] = True
                            tf_coll_name = f'OHCLVData{tf}' if tf != '1hr' else 'OHCLVData1hr'
                            tf_coll = db.get_collection(tf_coll_name)
                            doc = {
                                'tickerID': symbol,
                                'timestamp': tf_candle['start'],
                                'open': tf_candle['open'],
                                'high': tf_candle['high'],
                                'low': tf_candle['low'],
                                'close': tf_candle['close'],
                                'volume': tf_candle['volume']
                            }
                            try:
                                await tf_coll.insert_one(doc)
                            except Exception as e:
                                logger.error(f"Error inserting {tf} candle: {e}")
                            await publish_candle(symbol, tf, {**doc, 'final': True})
                        # Start new candle
                        pending_candles[tf_key] = {
                            'open': price,
                            'high': price,
                            'low': price,
                            'close': price,
                            'volume': 0,
                            'start': bucket_start,
                            'end': bucket_end,
                            'final': False
                        }
                    else:
                        tf_candle['high'] = max(tf_candle['high'], price)
                        tf_candle['low'] = min(tf_candle['low'], price)
                        tf_candle['close'] = price
                    # Optionally, accumulate volume if available in d
                    if isinstance(d, dict) and 'volume' in d:
                        pending_candles[tf_key]['volume'] += float(d['volume'])

                    # Publish the current state of the pending higher timeframe candle (with final: False)
                    await publish_candle(symbol, tf, {
                        'tickerID': symbol,
                        'open': pending_candles[tf_key]['open'],
                        'high': pending_candles[tf_key]['high'],
                        'low': pending_candles[tf_key]['low'],
                        'close': pending_candles[tf_key]['close'],
                        'volume': pending_candles[tf_key]['volume'],
                        'timestamp': pending_candles[tf_key]['start'],
                        'final': False
                    })

                # Finalize and persist higher timeframe candles if their interval is over
                for tf, minutes in HIGHER_TIMEFRAMES.items():
                    tf_key = (symbol, tf)
                    tf_candle = pending_candles.get(tf_key)
                    if tf_candle and not tf_candle['final'] and now >= tf_candle['end']:
                        tf_candle['final'] = True
                        tf_coll_name = f'OHCLVData{tf}' if tf != '1hr' else 'OHCLVData1hr'
                        tf_coll = db.get_collection(tf_coll_name)
                        doc = {
                            'tickerID': symbol,
                            'timestamp': tf_candle['start'],
                            'open': tf_candle['open'],
                            'high': tf_candle['high'],
                            'low': tf_candle['low'],
                            'close': tf_candle['close'],
                            'volume': tf_candle['volume']
                        }
                        try:
                            await tf_coll.insert_one(doc)
                        except Exception as e:
                            logger.error(f"Error inserting {tf} candle: {e}")
                        await publish_candle(symbol, tf, {**doc, 'final': True})
                        del pending_candles[tf_key]
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

