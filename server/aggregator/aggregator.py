import asyncio
import json
from datetime import datetime, timedelta, timezone, time as dt_time
import logging
from collections import defaultdict
import os
import redis.asyncio as aioredis
import typing

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
    # Also publish to Redis so other processes (websocket) can receive in-progress/final candles
    try:
        # schedule fire-and-forget
        asyncio.create_task(publish_candle_to_redis(symbol, timeframe, candle))
    except Exception:
        pass

# Optional Redis publisher (set by entrypoint):
redis_pub: typing.Optional[aioredis.Redis] = None

def _serialize_for_redis(obj):
    """Return JSON-serializable representation for common types (datetimes)."""
    if hasattr(obj, 'isoformat'):
        try:
            return obj.isoformat()
        except Exception:
            return str(obj)
    return obj

    
    
async def publish_candle_to_redis(symbol, timeframe, candle):
    """Publish candle to Redis pub/sub channel 'aggr:{timeframe}'.
    This is fire-and-forget and never required for correctness (DB writes still happen).
    """
    global redis_pub
    if redis_pub is None:
        return
    try:
        payload = {'tickerID': symbol, 'timeframe': timeframe}
        # shallow-copy and convert non-serializable values
        for k, v in candle.items():
            if v is None:
                payload[k] = None
            else:
                payload[k] = _serialize_for_redis(v)
        # safe json dump
        msg = json.dumps(payload, default=_serialize_for_redis)
        # publish to pattern channel so subscribers can psubscribe to aggr:*
        try:
            pub_count = await redis_pub.publish(f"aggr:{timeframe}", msg)
            logging.getLogger('aggregator').debug(f"Published aggregated candle to Redis channel 'aggr:{timeframe}' (subscribers={pub_count}) for {symbol}")
            # store the last published aggregated message in Redis for diagnostics
            try:
                await redis_pub.set(f"aggr:last:{symbol}:{timeframe}", msg)
            except Exception as set_e:
                logging.getLogger('aggregator').warning(f"Failed to set aggr:last key for {symbol} {timeframe}: {set_e}")
        except Exception as e:
            logging.getLogger('aggregator').warning(f"Failed to publish aggregated candle to Redis channel 'aggr:{timeframe}': {e}")
    except Exception as e:
        logger = logging.getLogger('aggregator')
        logger.debug(f"Failed to publish aggregated candle to Redis: {e}")

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


"""
Module-level caches and helper
"""
candles = {}  # {(symbol, bucket): candle_dict} for 1m candles
pending_candles = {}  # {(symbol, timeframe): candle_dict} for higher timeframes
pending_daily_candles = {} # Daily candle cache: {(symbol): candle_dict}
pending_weekly_candles = {} # Weekly candle cache: {(symbol): candle_dict}

def get_latest_in_progress_candle(symbol, timeframe):
    """
    Returns the latest in-progress candle for the given symbol and timeframe.
    For '1m', finds the candle in 'candles' with the latest timestamp for symbol.
    For higher timeframes, returns from 'pending_candles'.
    For '1d', returns from pending_daily_candles.
    """
    if timeframe == '1m':
        relevant = [(k, v) for k, v in candles.items() if k[0] == symbol]
        if not relevant:
            return None
        latest = max(relevant, key=lambda x: x[0][1])
        cndl = latest[1]
        return {**cndl, 'final': False}
    elif timeframe == '1d':
        cndl = pending_daily_candles.get(symbol)
        if cndl and not cndl.get('final', False):
            return cndl.copy()
        return None
    elif timeframe == '1w':
        cndl = pending_weekly_candles.get(symbol)
        if cndl and not cndl.get('final', False):
            return cndl.copy()
        return None
    else:
        cndl = pending_candles.get((symbol, timeframe))
        if cndl and not cndl.get('final', False):
            return cndl.copy()
        return None

HIGHER_TIMEFRAMES = {
    '5m': 5,
    '15m': 15,
    '30m': 30,
    '1hr': 60
}

def get_week_start(dt):
    # Always return Monday 00:00 UTC for the week of dt
    dt = dt.astimezone(timezone.utc)
    monday = dt - timedelta(days=dt.weekday())
    return monday.replace(hour=0, minute=0, second=0, microsecond=0)

async def start_aggregator(message_queue, mongo_client):
    # Ensure mongo_client is a Motor client
    if not hasattr(mongo_client, 'get_database'):
        logger.error("mongo_client is not a Motor client. Please use motor.motor_asyncio.AsyncIOMotorClient.")
        raise TypeError("mongo_client must be a Motor AsyncIOMotorClient instance.")


    db = mongo_client.get_database('EreunaDB')
    collection = db.get_collection('OHCLVData1m')
    daily_collection = db.get_collection('OHCLVData')
    weekly_collection = db.get_collection('OHCLVData2')
    MARKET_CLOSE_UTC_HOUR = 20  # 20:00 UTC is 16:00 US/Eastern

    # --- Weekly candle cache initialization ---
    now_utc = datetime.utcnow().replace(tzinfo=timezone.utc)
    week_start_utc = get_week_start(now_utc)
    # Query all weekly candles for current week
    weekly_docs = await weekly_collection.find({"timestamp": week_start_utc}).to_list(length=10000)
    symbols_to_delete = []
    for doc in weekly_docs:
        symbol = doc["tickerID"]
        pending_weekly_candles[symbol] = {
            "open": doc["open"],
            "high": doc["high"],
            "low": doc["low"],
            "close": doc["close"],
            "volume": doc.get("volume", 0),
            "start": week_start_utc,
            "end": week_start_utc + timedelta(days=7),
            "final": False
        }
        symbols_to_delete.append(symbol)
    # Delete current week's weekly candle documents from DB
    if symbols_to_delete:
        await weekly_collection.delete_many({"tickerID": {"$in": symbols_to_delete}, "timestamp": week_start_utc})

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
                        "volume": 0
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
                    "volume": candles[key].get("volume", 0),
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
                            "low": cndl["low"],
                            "volume": cndl.get("volume", 0)
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

                # --- Daily candle logic (UTC) ---
                # Use UTC midnight for candle timestamp, finalize at market close (20:00 UTC)
                if isinstance(ts, (int, float)):
                    dt_utc = datetime.utcfromtimestamp(ts / 1000).replace(tzinfo=timezone.utc)
                elif isinstance(ts, str):
                    dt_utc = datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone(timezone.utc)
                else:
                    raise ValueError("Unknown timestamp format")

                day_start_utc = dt_utc.replace(hour=0, minute=0, second=0, microsecond=0)
                market_close_utc = day_start_utc.replace(hour=MARKET_CLOSE_UTC_HOUR, minute=0, second=0, microsecond=0)
                if market_close_utc <= day_start_utc:
                    market_close_utc += timedelta(days=1)

                daily_key = symbol
                daily_candle = pending_daily_candles.get(daily_key)
                if not daily_candle or daily_candle.get('end') != market_close_utc:
                    # Finalize previous daily candle if exists and not finalized
                    # Start new daily candle
                    pending_daily_candles[daily_key] = {
                        'open': price,
                        'high': price,
                        'low': price,
                        'close': price,
                        'volume': 0,
                        'start': day_start_utc,
                        'end': market_close_utc,
                        'final': False
                    }
                else:
                    daily_candle['high'] = max(daily_candle['high'], price)
                    daily_candle['low'] = min(daily_candle['low'], price)
                    daily_candle['close'] = price
                # Optionally, accumulate volume if available in d
                if isinstance(d, dict) and 'volume' in d:
                    pending_daily_candles[daily_key]['volume'] += float(d['volume'])

                # Publish the current state of the pending daily candle (with final: False)
                await publish_candle(symbol, '1d', {
                    'tickerID': symbol,
                    'open': pending_daily_candles[daily_key]['open'],
                    'high': pending_daily_candles[daily_key]['high'],
                    'low': pending_daily_candles[daily_key]['low'],
                    'close': pending_daily_candles[daily_key]['close'],
                    'volume': pending_daily_candles[daily_key]['volume'],
                    'timestamp': pending_daily_candles[daily_key]['start'],
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

                # --- Weekly candle logic (UTC week start) ---
                week_start_utc = get_week_start(dt_utc)
                week_end_utc = week_start_utc + timedelta(days=7)
                weekly_key = symbol
                weekly_candle = pending_weekly_candles.get(weekly_key)
                if not weekly_candle or weekly_candle.get('end') != week_end_utc:
                    # Finalize previous weekly candle if exists and not finalized
                    # Start new weekly candle
                    pending_weekly_candles[weekly_key] = {
                        'open': price,
                        'high': price,
                        'low': price,
                        'close': price,
                        'volume': 0,
                        'start': week_start_utc,
                        'end': week_end_utc,
                        'final': False
                    }
                else:
                    weekly_candle['high'] = max(weekly_candle['high'], price)
                    weekly_candle['low'] = min(weekly_candle['low'], price)
                    weekly_candle['close'] = price
                # Optionally, accumulate volume if available in d
                if isinstance(d, dict) and 'volume' in d:
                    pending_weekly_candles[weekly_key]['volume'] += float(d['volume'])

                # Publish the current state of the pending weekly candle (with final: False)
                await publish_candle(symbol, '1w', {
                    'tickerID': symbol,
                    'open': pending_weekly_candles[weekly_key]['open'],
                    'high': pending_weekly_candles[weekly_key]['high'],
                    'low': pending_weekly_candles[weekly_key]['low'],
                    'close': pending_weekly_candles[weekly_key]['close'],
                    'volume': pending_weekly_candles[weekly_key]['volume'],
                    'timestamp': pending_weekly_candles[weekly_key]['start'],
                    'final': False
                })


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

async def flush_daily_weekly_candles_at_market_close(daily_collection, weekly_collection, market_close_utc_hour=20):
    while True:
        now = datetime.utcnow().replace(tzinfo=timezone.utc)
        # Wait until the next market close (20:00 UTC)
        next_close = now.replace(hour=market_close_utc_hour, minute=0, second=0, microsecond=0)
        if now >= next_close:
            next_close += timedelta(days=1)
        wait_seconds = (next_close - now).total_seconds()
        await asyncio.sleep(wait_seconds)

        # Flush daily candles
        for symbol, daily_candle in list(pending_daily_candles.items()):
            if not daily_candle.get('final', False):
                daily_candle['final'] = True
                doc = {
                    'tickerID': symbol,
                    'timestamp': daily_candle['start'],
                    'open': daily_candle['open'],
                    'high': daily_candle['high'],
                    'low': daily_candle['low'],
                    'close': daily_candle['close'],
                    'volume': daily_candle['volume']
                }
                try:
                    await daily_collection.insert_one(doc)
                except Exception as e:
                    logger.error(f"Error inserting daily candle (flush): {e}")
                del pending_daily_candles[symbol]

        # Flush weekly candles
        for symbol, weekly_candle in list(pending_weekly_candles.items()):
            if not weekly_candle.get('final', False):
                weekly_candle['final'] = True
                doc = {
                    'tickerID': symbol,
                    'timestamp': weekly_candle['start'],
                    'open': weekly_candle['open'],
                    'high': weekly_candle['high'],
                    'low': weekly_candle['low'],
                    'close': weekly_candle['close'],
                    'volume': weekly_candle['volume']
                }
                try:
                    await weekly_collection.insert_one(doc)
                except Exception as e:
                    logger.error(f"Error inserting weekly candle (flush): {e}")
                del pending_weekly_candles[symbol]

        logger.info("Flushed daily and weekly candles at market close.")

# To run both tasks together:
async def main_aggregator_and_flush(message_queue, mongo_client):
    db = mongo_client.get_database('EreunaDB')
    daily_collection = db.get_collection('OHCLVData')
    weekly_collection = db.get_collection('OHCLVData2')
    # Start both tasks
    aggregator_task = asyncio.create_task(start_aggregator(message_queue, mongo_client))
    flush_task = asyncio.create_task(flush_daily_weekly_candles_at_market_close(daily_collection, weekly_collection))
    await asyncio.gather(aggregator_task, flush_task)
    

async def redis_stream_adapter(queue: asyncio.Queue, redis_client: aioredis.Redis, stream='tiingo:stream', group='aggregator', consumer=None, block=5000, count=100):
    """
    Read messages from a Redis Stream using XREADGROUP and put the raw message data into the provided asyncio.Queue.
    Messages are expected as a field 'data' containing the raw JSON string.
    """
    if consumer is None:
        consumer = f"consumer-{os.getpid()}"
    # Create group if not exists
    try:
        await redis_client.xgroup_create(stream, group, id='0', mkstream=True)
    except Exception:
        # group probably exists
        pass

    logger.info(f"Redis stream adapter started (stream={stream}, group={group}, consumer={consumer})")
    try:
        while True:
            try:
                resp = await redis_client.xreadgroup(groupname=group, consumername=consumer, streams={stream: '>'}, count=count, block=block)
                if not resp:
                    await asyncio.sleep(0.1)
                    continue
                # resp is list like [(stream, [(id, {b'data': b'...'}), ...])]
                for _stream_name, messages in resp:
                    for msg_id, fields in messages:
                        data = None
                        if b'data' in fields:
                            raw = fields[b'data']
                            if isinstance(raw, bytes):
                                try:
                                    data = raw.decode('utf-8')
                                except Exception:
                                    data = str(raw)
                            else:
                                data = str(raw)
                        elif 'data' in fields:
                            data = fields['data']
                        else:
                            logger.warning(f"Redis stream message without 'data' field: {fields}")
                            # Acknowledge and continue
                            try:
                                await redis_client.xack(stream, group, msg_id)
                            except Exception:
                                pass
                            continue

                        # Put into queue for aggregator to process
                        try:
                            await queue.put(data)
                        except Exception as e:
                            logger.error(f"Failed to put redis message into queue: {e}")
                        # Acknowledge the message
                        try:
                            await redis_client.xack(stream, group, msg_id)
                        except Exception as e:
                            logger.warning(f"Failed to XACK message {msg_id}: {e}")
            except Exception as e:
                logger.error(f"Error reading from Redis stream: {e}")
                await asyncio.sleep(1)
    except asyncio.CancelledError:
        logger.info("Redis stream adapter cancelled; exiting")
        return
    
