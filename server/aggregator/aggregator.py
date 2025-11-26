import asyncio
import json
from datetime import datetime, timedelta, timezone, time as dt_time
import logging
from collections import defaultdict
import os
import redis.asyncio as aioredis
import typing
import pytz
from pymongo.errors import BulkWriteError
import time

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

async def upload_worker(db, worker_id: int, queue: asyncio.Queue):
    """
    Background worker that processes candle uploads from queue.
    Smooths out upload spikes when 8500 symbols complete simultaneously.
    """
    worker_logger = logging.getLogger(f"upload_worker_{worker_id}")
    global upload_workers_active
    upload_workers_active += 1
    
    # Worker-specific batch buffer
    batch_buffer = defaultdict(list)  # {collection_name: [docs]}
    last_flush = datetime.utcnow()
    WORKER_BATCH_SIZE = 200  # Smaller batches per worker
    WORKER_FLUSH_INTERVAL = 0.5  # Flush every 500ms
    
    worker_logger.info(f"Upload worker {worker_id} started")
    
    try:
        while True:
            try:
                # Get upload task with timeout to allow periodic flushing
                upload_task = await asyncio.wait_for(queue.get(), timeout=WORKER_FLUSH_INTERVAL)
                
                collection_name = upload_task['collection']
                doc = upload_task['doc']
                
                # Add to batch buffer
                batch_buffer[collection_name].append(doc)
                
                # Check if we should flush this collection
                time_since_flush = (datetime.utcnow() - last_flush).total_seconds()
                
                for coll_name, docs in list(batch_buffer.items()):
                    if len(docs) >= WORKER_BATCH_SIZE or time_since_flush >= WORKER_FLUSH_INTERVAL:
                        if docs:
                            # Upload batch
                            try:
                                coll = db.get_collection(coll_name)
                                result = await batch_insert_with_retry(
                                    coll,
                                    docs,
                                    f"{coll_name} (worker_{worker_id})",
                                    max_retries=2,
                                    chunk_size=100
                                )
                                
                                if result['success'] > 0:
                                    worker_logger.debug(f"Uploaded {result['success']}/{result['total']} to {coll_name}")
                                
                                batch_buffer[coll_name] = []
                                last_flush = datetime.utcnow()
                                
                            except Exception as e:
                                worker_logger.error(f"Upload error for {coll_name}: {e}")
                                batch_buffer[coll_name] = []
                
            except asyncio.TimeoutError:
                # Periodic flush even if batch not full
                time_since_flush = (datetime.utcnow() - last_flush).total_seconds()
                if time_since_flush >= WORKER_FLUSH_INTERVAL:
                    for coll_name, docs in list(batch_buffer.items()):
                        if docs:
                            try:
                                coll = db.get_collection(coll_name)
                                result = await batch_insert_with_retry(
                                    coll,
                                    docs,
                                    f"{coll_name} (worker_{worker_id}_periodic)",
                                    max_retries=2,
                                    chunk_size=100
                                )
                                batch_buffer[coll_name] = []
                            except Exception as e:
                                worker_logger.error(f"Periodic flush error for {coll_name}: {e}")
                                batch_buffer[coll_name] = []
                    last_flush = datetime.utcnow()
                    
    except asyncio.CancelledError:
        # Flush remaining on shutdown
        worker_logger.info(f"Worker {worker_id} shutting down, flushing {sum(len(docs) for docs in batch_buffer.values())} remaining candles")
        for coll_name, docs in batch_buffer.items():
            if docs:
                try:
                    coll = db.get_collection(coll_name)
                    await batch_insert_with_retry(coll, docs, f"{coll_name} (worker_{worker_id}_shutdown)", max_retries=3, chunk_size=100)
                except Exception as e:
                    worker_logger.error(f"Shutdown flush error for {coll_name}: {e}")
        upload_workers_active -= 1
        raise

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

# Upload failure tracking
upload_failures = defaultdict(int)
last_upload_attempt = {}

# Upload queue to handle massive concurrent candle completions (8500 symbols × 7 timeframes)
upload_queue = None  # Will be initialized in start_aggregator
upload_workers_active = 0

# Recently completed candles cache (keeps candles available during upload)
# {(symbol, timeframe, timestamp): {'candle': dict, 'completed_at': datetime}}
recently_completed_candles = {}

# Metrics callbacks (set by app.py)
metrics_callbacks = {
    'upload_success': None,
    'upload_failed': None,
    'upload_invalid': None,
    'upload_batch_size': None,
    'upload_duration': None,
    'pending_candles': None
}

def validate_candle_data(candle: dict) -> bool:
    """
    Validate that a candle has complete OHLC data.
    Returns True if valid, False otherwise.
    NOTE: Volume is always 0 for real-time data (supplier doesn't provide it)
    """
    required_fields = ['open', 'high', 'low', 'close', 'timestamp', 'tickerID']
    
    # Check all required fields exist
    for field in required_fields:
        if field not in candle:
            logger.warning(f"Candle missing required field '{field}': {candle}")
            return False
    
    # Check OHLC values are not None and are valid numbers
    ohlc = [candle['open'], candle['high'], candle['low'], candle['close']]
    if any(v is None for v in ohlc):
        logger.warning(f"Candle has None OHLC values: {candle.get('tickerID')} at {candle.get('timestamp')}")
        return False
    
    # Validate OHLC relationships: high >= max(open, close) and low <= min(open, close)
    try:
        if candle['high'] < max(candle['open'], candle['close']):
            logger.warning(f"Invalid candle: high < max(open, close) for {candle.get('tickerID')}")
            return False
        
        if candle['low'] > min(candle['open'], candle['close']):
            logger.warning(f"Invalid candle: low > min(open, close) for {candle.get('tickerID')}")
            return False
    except (TypeError, ValueError) as e:
        logger.warning(f"Invalid OHLC values for {candle.get('tickerID')}: {e}")
        return False
    
    return True

async def batch_insert_with_retry(collection, documents: list, collection_name: str, max_retries: int = 3, chunk_size: int = 500) -> dict:
    """
    OPTIMIZED: Insert documents in chunks with retry logic and partial success tracking.
    Returns dict with success/failure stats.
    """
    start_time = time.time()
    
    if not documents:
        return {'total': 0, 'success': 0, 'failed': 0}
    
    # Validate all documents before attempting insert
    validated_docs = []
    invalid_count = 0
    for doc in documents:
        if validate_candle_data(doc):
            validated_docs.append(doc)
        else:
            invalid_count += 1
    
    if invalid_count > 0:
        logger.warning(f"[{collection_name}] Filtered out {invalid_count} invalid candles before upload")
        # Record invalid count in metrics
        if metrics_callbacks['upload_invalid']:
            try:
                metrics_callbacks['upload_invalid'](collection_name, invalid_count)
            except Exception:
                pass
    
    if not validated_docs:
        return {'total': len(documents), 'success': 0, 'failed': len(documents), 'invalid': invalid_count}
    
    total_success = 0
    total_failed = 0
    
    # Split into chunks to prevent overwhelming MongoDB
    for i in range(0, len(validated_docs), chunk_size):
        chunk = validated_docs[i:i+chunk_size]
        retry_count = 0
        success = False
        
        while retry_count < max_retries and not success:
            try:
                result = await collection.insert_many(chunk, ordered=False)
                total_success += len(result.inserted_ids)
                success = True
                
                # Reset failure counter for this collection on success
                if collection_name in upload_failures:
                    upload_failures[collection_name] = 0
                    
            except BulkWriteError as bwe:
                # Partial success - some documents were inserted
                inserted_count = bwe.details.get('nInserted', 0)
                total_success += inserted_count
                
                write_errors = bwe.details.get('writeErrors', [])
                total_failed += len(write_errors)
                
                # Log duplicate key errors separately (they're expected sometimes)
                dup_errors = [e for e in write_errors if e.get('code') == 11000]
                other_errors = [e for e in write_errors if e.get('code') != 11000]
                
                if dup_errors:
                    logger.debug(f"[{collection_name}] Chunk {i//chunk_size + 1}: {len(dup_errors)} duplicate key errors (expected)")
                
                if other_errors:
                    logger.error(f"[{collection_name}] Chunk {i//chunk_size + 1}: {len(other_errors)} write errors: {other_errors[:3]}")
                    upload_failures[collection_name] += len(other_errors)
                
                success = True  # Don't retry bulk write errors
                
            except Exception as e:
                retry_count += 1
                upload_failures[collection_name] += 1
                
                if retry_count < max_retries:
                    wait_time = min(2 ** retry_count, 10)  # Exponential backoff, max 10s
                    logger.warning(f"[{collection_name}] Chunk {i//chunk_size + 1} insert failed (attempt {retry_count}/{max_retries}): {e}. Retrying in {wait_time}s...")
                    await asyncio.sleep(wait_time)
                else:
                    logger.error(f"[{collection_name}] Chunk {i//chunk_size + 1} failed after {max_retries} attempts: {e}")
                    total_failed += len(chunk)
    
    # Log persistent failures
    if upload_failures[collection_name] > 10:
        logger.error(f"[{collection_name}] CRITICAL: {upload_failures[collection_name]} consecutive upload failures detected!")
    
    # Record metrics
    duration = time.time() - start_time
    if metrics_callbacks['upload_success']:
        try:
            metrics_callbacks['upload_success'](collection_name, total_success)
        except Exception:
            pass
    if metrics_callbacks['upload_failed']:
        try:
            metrics_callbacks['upload_failed'](collection_name, total_failed)
        except Exception:
            pass
    if metrics_callbacks['upload_batch_size']:
        try:
            metrics_callbacks['upload_batch_size'](collection_name, len(documents))
        except Exception:
            pass
    if metrics_callbacks['upload_duration']:
        try:
            metrics_callbacks['upload_duration'](collection_name, duration)
        except Exception:
            pass
    
    return {
        'total': len(documents),
        'success': total_success,
        'failed': total_failed,
        'invalid': invalid_count
    }

async def cleanup_old_candles():
    """
    PERFORMANCE: Periodically clean up old 1m candles from memory to prevent unbounded growth.
    Keep last 4 hours with 32GB RAM (increased from 2 hours for standard VPS).
    Also update pending candle metrics and clean recently_completed_candles cache.
    """
    while True:
        await asyncio.sleep(300)  # Run every 5 minutes
        try:
            now = datetime.utcnow().replace(tzinfo=timezone.utc)
            cutoff = now - timedelta(hours=4)  # Keep 4 hours with 32GB RAM
            
            before_count = len(candles)
            keys_to_delete = [k for k, v in candles.items() if k[1] < cutoff]
            for k in keys_to_delete:
                candles.pop(k, None)
            
            if keys_to_delete:
                logger.info(f"[MemoryCleanup] Removed {len(keys_to_delete)} old 1m candles (kept {before_count - len(keys_to_delete)})")
            
            # Clean recently_completed_candles cache (TTL: 5 seconds)
            recent_cutoff = now - timedelta(seconds=5)
            recent_before = len(recently_completed_candles)
            recent_to_delete = [k for k, v in recently_completed_candles.items() 
                              if v['completed_at'] < recent_cutoff]
            for k in recent_to_delete:
                recently_completed_candles.pop(k, None)
            
            if recent_to_delete:
                logger.debug(f"[MemoryCleanup] Removed {len(recent_to_delete)} recently completed candles from cache")
            
            # Update pending candle metrics
            if metrics_callbacks['pending_candles']:
                try:
                    metrics_callbacks['pending_candles']('1m', len(candles))
                    metrics_callbacks['pending_candles']('higher_tf', len(pending_candles))
                    metrics_callbacks['pending_candles']('daily', len(pending_daily_candles))
                    metrics_callbacks['pending_candles']('weekly', len(pending_weekly_candles))
                except Exception:
                    pass
                    
        except Exception as e:
            logger.error(f"[MemoryCleanup] Error during cleanup: {e}")

def get_latest_in_progress_candle(symbol, timeframe):
    """
    Returns the latest in-progress candle for the given symbol and timeframe.
    For '1m', finds the candle in 'candles' with the latest timestamp for symbol.
    For higher timeframes, returns from 'pending_candles'.
    For '1d', returns from pending_daily_candles.
    Also checks recently_completed_candles as fallback (candles being uploaded).
    """
    if timeframe == '1m':
        relevant = [(k, v) for k, v in candles.items() if k[0] == symbol]
        if not relevant:
            # Check recently completed cache (candles being uploaded)
            recent_relevant = [(k, v) for k, v in recently_completed_candles.items() 
                             if k[0] == symbol and k[1] == '1m']
            if recent_relevant:
                latest_recent = max(recent_relevant, key=lambda x: x[0][2])  # Sort by timestamp
                return {**latest_recent[1]['candle'], 'final': True}
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
        # Check recently completed cache
        recent_relevant = [(k, v) for k, v in recently_completed_candles.items() 
                         if k[0] == symbol and k[1] == timeframe]
        if recent_relevant:
            latest_recent = max(recent_relevant, key=lambda x: x[0][2])
            return {**latest_recent[1]['candle'], 'final': True}
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

# Market hours with automatic DST handling
def get_market_close_hour_utc():
    """Calculate market close hour in UTC (4:00 PM ET), automatically accounting for DST"""
    et = pytz.timezone('US/Eastern')
    now_et = datetime.now(et)
    close_et = now_et.replace(hour=16, minute=0, second=0, microsecond=0)
    close_utc = close_et.astimezone(pytz.UTC)
    return close_utc.hour

async def start_aggregator(message_queue, mongo_client):
    # Ensure mongo_client is a Motor client
    if not hasattr(mongo_client, 'get_database'):
        logger.error("mongo_client is not a Motor client. Please use motor.motor_asyncio.AsyncIOMotorClient.")
        raise TypeError("mongo_client must be a Motor AsyncIOMotorClient instance.")


    db = mongo_client.get_database('EreunaDB')
    collection = db.get_collection('OHCLVData1m')
    daily_collection = db.get_collection('OHCLVData')
    weekly_collection = db.get_collection('OHCLVData2')
    MARKET_CLOSE_UTC_HOUR = get_market_close_hour_utc()  # Automatically handles DST
    logger.info(f"Aggregator market close hour: {MARKET_CLOSE_UTC_HOUR}:00 UTC (4:00 PM ET)")
    
    # PERFORMANCE: Upload queue to smooth out massive concurrent candle completions
    # With 8500 symbols × 7 timeframes, candles complete simultaneously at aligned intervals
    global upload_queue
    upload_queue = asyncio.Queue(maxsize=100000)  # Large queue for peak loads
    
    # Start upload worker pool (parallel uploads to MongoDB)
    NUM_UPLOAD_WORKERS = 8  # Match your vCPU count for parallelism
    upload_worker_tasks = []
    for i in range(NUM_UPLOAD_WORKERS):
        task = asyncio.create_task(upload_worker(db, i, upload_queue))
        upload_worker_tasks.append(task)
    logger.info(f"Started {NUM_UPLOAD_WORKERS} upload workers for parallel MongoDB writes")
    
    # PERFORMANCE: Batch insert buffers and throttling
    last_publish_time = {}  # {(symbol, tf): timestamp} for throttling
    PUBLISH_THROTTLE = 0.5  # Publish updates every 0.5s (lower latency for pro app)
    
    # Upload metrics
    upload_stats = {
        '1m': {'batches': 0, 'success': 0, 'failed': 0},
        'higher_tf': {'batches': 0, 'success': 0, 'failed': 0}
    }
    last_stats_log = datetime.utcnow()

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
        last_log_time = datetime.utcnow()
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
                    processed_count += 1
                else:
                    logger.warning(f"Unknown service or data format: {data}")
                    continue

                # Log summary every minute
                now_log = datetime.utcnow()
                if (now_log - last_log_time).total_seconds() >= 60:
                    logger.info(f"[Aggregator] Status - Active 1m candles: {len(candles)}, Pending higher TF: {len(pending_candles)}, Daily: {len(pending_daily_candles)}, Weekly: {len(pending_weekly_candles)}")
                    last_log_time = now_log

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
                    logger.info(f"[Aggregator] Created new 1m candle for {symbol} at {bucket}")
                else:
                    candle["high"] = max(candle["high"], price)
                    candle["low"] = min(candle["low"], price)
                    candle["close"] = price
                    logger.debug(f"[Aggregator] Updated 1m candle for {symbol} at {bucket} - price: {price}")

                # --- OPTIMIZED: Throttled publish for in-progress 1m candle ---
                pub_key = (symbol, "1m")
                now_time = datetime.utcnow()
                last_pub = last_publish_time.get(pub_key)
                if last_pub is None or (now_time - last_pub).total_seconds() >= PUBLISH_THROTTLE:
                    asyncio.create_task(publish_candle(symbol, "1m", {
                        "timestamp": candles[key]["timestamp"],
                        "tickerID": candles[key]["tickerID"],
                        "open": candles[key]["open"],
                        "close": candles[key]["close"],
                        "high": candles[key]["high"],
                        "low": candles[key]["low"],
                        "volume": candles[key].get("volume", 0),
                        "final": False
                    }))
                    last_publish_time[pub_key] = now_time

                # Check for finished buckets and queue for upload
                now = datetime.utcnow().replace(second=0, microsecond=0, tzinfo=timezone.utc)
                finished = []
                for (sym, bkt), cndl in list(candles.items()):
                    if now >= bkt + timedelta(minutes=1):
                        # Queue finished candle for upload (handled by workers)
                        doc = {
                            "timestamp": cndl["timestamp"],
                            "tickerID": cndl["tickerID"],
                            "open": cndl["open"],
                            "close": cndl["close"],
                            "high": cndl["high"],
                            "low": cndl["low"],
                            "volume": cndl.get("volume", 0)
                        }
                        
                        # Store in recently_completed cache (available to websocket during upload)
                        cache_key = (sym, '1m', cndl["timestamp"])
                        recently_completed_candles[cache_key] = {
                            'candle': doc,
                            'completed_at': now
                        }
                        
                        # Add to upload queue (non-blocking)
                        try:
                            upload_queue.put_nowait({
                                'collection': 'OHCLVData1m',
                                'doc': doc
                            })
                        except asyncio.QueueFull:
                            logger.warning(f"Upload queue full, waiting to enqueue 1m candle for {sym}")
                            await upload_queue.put({'collection': 'OHCLVData1m', 'doc': doc})
                        
                        finished.append((sym, bkt))
                        
                        # Publish finalized candle immediately (important for real-time)
                        asyncio.create_task(publish_candle(sym, "1m", {
                            "timestamp": cndl["timestamp"],
                            "tickerID": cndl["tickerID"],
                            "open": cndl["open"],
                            "close": cndl["close"],
                            "high": cndl["high"],
                            "low": cndl["low"],
                            "volume": cndl.get("volume", 0),
                            "final": True
                        }))
                
                # Now safe to remove from main cache (still available in recently_completed)
                for k in finished:
                    candles.pop(k, None)
                
                # Log upload queue status periodically
                time_since_stats = (datetime.utcnow() - last_stats_log).total_seconds()
                if time_since_stats >= 60:  # Every minute
                    queue_size = upload_queue.qsize()
                    logger.info(f"[Aggregator] Upload queue: {queue_size} pending, Active 1m candles: {len(candles)}, Higher TF: {len(pending_candles)}, Daily: {len(pending_daily_candles)}, Weekly: {len(pending_weekly_candles)}")
                    last_stats_log = datetime.utcnow()


                # --- Higher timeframe candle logic with throttled publishing ---
                for tf, minutes in HIGHER_TIMEFRAMES.items():
                    bucket_start, bucket_end = get_bucket(ts, minutes)
                    tf_key = (symbol, tf)
                    tf_candle = pending_candles.get(tf_key)
                    if not tf_candle or tf_candle.get('end') != bucket_end:
                        # Finalize previous candle if exists and not finalized
                        if tf_candle and not tf_candle.get('final', False):
                            tf_candle['final'] = True
                            tf_coll_name = f'OHCLVData{tf}' if tf != '1hr' else 'OHCLVData1hr'
                            doc = {
                                'tickerID': symbol,
                                'timestamp': tf_candle['start'],
                                'open': tf_candle['open'],
                                'high': tf_candle['high'],
                                'low': tf_candle['low'],
                                'close': tf_candle['close'],
                                'volume': tf_candle['volume']
                            }
                            
                            # Store in recently_completed cache (available to websocket during upload)
                            cache_key = (symbol, tf, tf_candle['start'])
                            recently_completed_candles[cache_key] = {
                                'candle': doc,
                                'completed_at': datetime.utcnow().replace(tzinfo=timezone.utc)
                            }
                            
                            # Queue for upload (handled by workers)
                            tf_coll_name = f'OHCLVData{tf}' if tf != '1hr' else 'OHCLVData1hr'
                            try:
                                upload_queue.put_nowait({
                                    'collection': tf_coll_name,
                                    'doc': doc
                                })
                            except asyncio.QueueFull:
                                logger.warning(f"Upload queue full, waiting to enqueue {tf} candle for {symbol}")
                                await upload_queue.put({'collection': tf_coll_name, 'doc': doc})
                            
                            # Publish finalized immediately
                            asyncio.create_task(publish_candle(symbol, tf, {**doc, 'final': True}))
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

                    # OPTIMIZED: Throttled publish for in-progress higher TF candles
                    pub_key = (symbol, tf)
                    last_pub = last_publish_time.get(pub_key)
                    if last_pub is None or (now_time - last_pub).total_seconds() >= PUBLISH_THROTTLE:
                        asyncio.create_task(publish_candle(symbol, tf, {
                            'tickerID': symbol,
                            'open': pending_candles[tf_key]['open'],
                            'high': pending_candles[tf_key]['high'],
                            'low': pending_candles[tf_key]['low'],
                            'close': pending_candles[tf_key]['close'],
                            'volume': pending_candles[tf_key]['volume'],
                            'timestamp': pending_candles[tf_key]['start'],
                            'final': False
                        }))
                        last_publish_time[pub_key] = now_time

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

                # OPTIMIZED: Throttled publish for daily candles
                pub_key = (symbol, '1d')
                last_pub = last_publish_time.get(pub_key)
                if last_pub is None or (now_time - last_pub).total_seconds() >= PUBLISH_THROTTLE:
                    asyncio.create_task(publish_candle(symbol, '1d', {
                        'tickerID': symbol,
                        'open': pending_daily_candles[daily_key]['open'],
                        'high': pending_daily_candles[daily_key]['high'],
                        'low': pending_daily_candles[daily_key]['low'],
                        'close': pending_daily_candles[daily_key]['close'],
                        'volume': pending_daily_candles[daily_key]['volume'],
                        'timestamp': pending_daily_candles[daily_key]['start'],
                        'final': False
                    }))
                    last_publish_time[pub_key] = now_time

                # Finalize and persist higher timeframe candles if their interval is over
                # (This catches any stragglers that didn't finalize at bucket transitions)
                for tf, minutes in HIGHER_TIMEFRAMES.items():
                    tf_key = (symbol, tf)
                    tf_candle = pending_candles.get(tf_key)
                    if tf_candle and not tf_candle['final'] and now >= tf_candle['end']:
                        tf_candle['final'] = True
                        tf_coll_name = f'OHCLVData{tf}' if tf != '1hr' else 'OHCLVData1hr'
                        doc = {
                            'tickerID': symbol,
                            'timestamp': tf_candle['start'],
                            'open': tf_candle['open'],
                            'high': tf_candle['high'],
                            'low': tf_candle['low'],
                            'close': tf_candle['close'],
                            'volume': tf_candle['volume']
                        }
                        # Queue for upload
                        try:
                            upload_queue.put_nowait({'collection': tf_coll_name, 'doc': doc})
                        except asyncio.QueueFull:
                            await upload_queue.put({'collection': tf_coll_name, 'doc': doc})
                        
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

                # OPTIMIZED: Throttled publish for weekly candles
                pub_key = (symbol, '1w')
                last_pub = last_publish_time.get(pub_key)
                if last_pub is None or (now_time - last_pub).total_seconds() >= PUBLISH_THROTTLE:
                    asyncio.create_task(publish_candle(symbol, '1w', {
                        'tickerID': symbol,
                        'open': pending_weekly_candles[weekly_key]['open'],
                        'high': pending_weekly_candles[weekly_key]['high'],
                        'low': pending_weekly_candles[weekly_key]['low'],
                        'close': pending_weekly_candles[weekly_key]['close'],
                        'volume': pending_weekly_candles[weekly_key]['volume'],
                        'timestamp': pending_weekly_candles[weekly_key]['start'],
                        'final': False
                    }))
                    last_publish_time[pub_key] = now_time


            except Exception as e:
                logger.error(f"Aggregator message error: {e}, msg: {msg}")
                anomaly_count += 1
            if anomaly_count > 0 and anomaly_count % 10 == 0:
                logger.warning(f"Aggregator anomalies detected: {anomaly_count}")
    except asyncio.CancelledError:
        # On shutdown, flush all remaining candles with validation and retry
        docs = []
        for cndl in candles.values():
            doc = {
                "timestamp": cndl["timestamp"],
                "tickerID": cndl["tickerID"],
                "open": cndl["open"],
                "close": cndl["close"],
                "high": cndl["high"],
                "low": cndl["low"],
                "volume": cndl.get("volume", 0)
            }
            if validate_candle_data(doc):
                docs.append(doc)
        
        if docs:
            try:
                result = await batch_insert_with_retry(
                    collection,
                    docs,
                    'OHCLVData1m (shutdown)',
                    max_retries=5,
                    chunk_size=500
                )
                logger.info(f"Aggregator shutdown: flushed {result['success']}/{result['total']} 1m candles (failed: {result['failed']}, invalid: {result.get('invalid', 0)})")
                
                # Publish remaining candles on shutdown (only successful ones)
                for cndl in docs[:result['success']]:
                    await publish_candle(cndl["tickerID"], "1m", {**cndl, "final": True})
            except Exception as e:
                logger.error(f"MongoDB insert error on shutdown: {e}")

async def flush_daily_weekly_candles_at_market_close(daily_collection, weekly_collection, market_close_utc_hour=None):
    """
    Flush ALL candles at market close. If market_close_utc_hour is None, calculate dynamically with DST.
    This ensures all pending candles (intraday, daily, weekly) are:
    1. Marked as final
    2. Uploaded to MongoDB
    3. Published to Redis
    4. Removed from memory
    """
    while True:
        # Recalculate market close hour on each iteration to handle DST changes
        if market_close_utc_hour is None:
            close_hour = get_market_close_hour_utc()
        else:
            close_hour = market_close_utc_hour
        
        now = datetime.utcnow().replace(tzinfo=timezone.utc)
        # Wait until the next market close (automatically accounts for DST)
        next_close = now.replace(hour=close_hour, minute=0, second=0, microsecond=0)
        if now >= next_close:
            next_close += timedelta(days=1)
        wait_seconds = (next_close - now).total_seconds()
        logger.info(f"[MarketClose] Waiting {wait_seconds/3600:.2f} hours until next market close at {next_close}")
        await asyncio.sleep(wait_seconds)

        logger.info("=" * 60)
        logger.info("[MarketClose] MARKET CLOSED - Starting candle finalization process")
        logger.info("=" * 60)

        # Get database reference for intraday timeframes
        db = daily_collection.database
        
        total_flushed = 0

        # Step 1: Flush ALL 1-minute candles that are still pending
        one_min_flushed = 0
        collection_1m = db.get_collection('OHCLVData1m')
        docs_1m = []
        for (sym, bkt), cndl in list(candles.items()):
            docs_1m.append({
                "timestamp": cndl["timestamp"],
                "tickerID": cndl["tickerID"],
                "open": cndl["open"],
                "close": cndl["close"],
                "high": cndl["high"],
                "low": cndl["low"],
                "volume": cndl.get("volume", 0)
            })
        if docs_1m:
            try:
                result = await batch_insert_with_retry(
                    collection_1m,
                    docs_1m,
                    'OHCLVData1m (market close)',
                    max_retries=5,  # More retries at market close
                    chunk_size=500
                )
                logger.info(f"[MarketClose] ✓ Flushed {result['success']}/{result['total']} pending 1m candles to MongoDB (failed: {result['failed']}, invalid: {result.get('invalid', 0)})")
                
                # Publish each finalized 1m candle (only successful ones)
                success_docs = [doc for doc in docs_1m if validate_candle_data(doc)]
                for cndl in success_docs[:result['success']]:  # Only publish what was actually inserted
                    await publish_candle(cndl["tickerID"], "1m", {**cndl, "final": True})
                
                one_min_flushed = result['success']
                # Clear from memory
                candles.clear()
            except Exception as e:
                logger.error(f"[MarketClose] ✗ Critical error flushing 1m candles: {e}")
                # Still clear memory to prevent buildup
                candles.clear()
        
        total_flushed += one_min_flushed

        # Build a map of the last 1m close price for each symbol to ensure consistency
        # Only use validated candles
        last_1m_close = {}
        for doc in docs_1m:
            if validate_candle_data(doc):
                sym = doc['tickerID']
                # Keep the most recent close price (docs_1m should be in chronological order)
                last_1m_close[sym] = doc['close']
        
        logger.info(f"[MarketClose] Captured last 1m close prices for {len(last_1m_close)} symbols")

        # Step 2: Flush ALL intraday candles (5m, 15m, 30m, 1hr) with synchronized close prices
        intraday_flushed = 0
        intraday_synced = 0
        intraday_docs_by_collection = defaultdict(list)
        
        # First, prepare all documents with validation
        for (symbol, tf), tf_candle in list(pending_candles.items()):
            # Mark as final regardless of current state
            tf_candle['final'] = True
            
            # Synchronize close price with last 1m candle if available
            original_close = tf_candle['close']
            if symbol in last_1m_close:
                tf_candle['close'] = last_1m_close[symbol]
                if original_close != tf_candle['close']:
                    intraday_synced += 1
                    logger.debug(f"[MarketClose] Synced {tf} close for {symbol}: {original_close:.2f} -> {tf_candle['close']:.2f}")
            
            tf_coll_name = f'OHCLVData{tf}' if tf != '1hr' else 'OHCLVData1hr'
            doc = {
                'tickerID': symbol,
                'timestamp': tf_candle['start'],
                'open': tf_candle['open'],
                'high': tf_candle['high'],
                'low': tf_candle['low'],
                'close': tf_candle['close'],
                'volume': tf_candle['volume']
            }
            
            # Validate before adding to batch
            if validate_candle_data(doc):
                intraday_docs_by_collection[tf_coll_name].append((symbol, tf, doc))
            else:
                logger.warning(f"[MarketClose] Skipping invalid {tf} candle for {symbol}")
        
        # Batch insert by collection
        for tf_coll_name, doc_list in intraday_docs_by_collection.items():
            docs = [d[2] for d in doc_list]  # Extract just the docs
            try:
                tf_coll = db.get_collection(tf_coll_name)
                result = await batch_insert_with_retry(
                    tf_coll,
                    docs,
                    f'{tf_coll_name} (market close)',
                    max_retries=5,
                    chunk_size=100
                )
                
                # Publish finalized candles (only successful ones)
                for i, (symbol, tf, doc) in enumerate(doc_list[:result['success']]):
                    await publish_candle(symbol, tf, {**doc, 'final': True})
                    intraday_flushed += 1
                    logger.debug(f"[MarketClose] ✓ Flushed {tf} candle for {symbol}")
                
                if result['success'] > 0:
                    logger.info(f"[MarketClose] ✓ Batch flushed {result['success']}/{result['total']} {tf_coll_name} candles (failed: {result['failed']}, invalid: {result.get('invalid', 0)})")
                
            except Exception as e:
                logger.error(f"[MarketClose] ✗ Error batch flushing {tf_coll_name}: {e}")
        
        # Remove all from memory (even failed ones to prevent buildup)
        pending_candles.clear()
        
        if intraday_flushed > 0:
            logger.info(f"[MarketClose] ✓ Flushed {intraday_flushed} intraday candles (5m, 15m, 30m, 1hr)")
            if intraday_synced > 0:
                logger.info(f"[MarketClose] ✓ Synchronized {intraday_synced} intraday candles to match 1m close")
        total_flushed += intraday_flushed

        # Step 3: Flush ALL daily candles with synchronized close prices
        daily_flushed = 0
        daily_synced = 0
        daily_docs = []
        
        for symbol, daily_candle in list(pending_daily_candles.items()):
            # Mark as final regardless of current state
            daily_candle['final'] = True
            
            # Synchronize close price with last 1m candle if available
            original_close = daily_candle['close']
            if symbol in last_1m_close:
                daily_candle['close'] = last_1m_close[symbol]
                if original_close != daily_candle['close']:
                    daily_synced += 1
                    logger.debug(f"[MarketClose] Synced daily close for {symbol}: {original_close:.2f} -> {daily_candle['close']:.2f}")
            
            doc = {
                'tickerID': symbol,
                'timestamp': daily_candle['start'],
                'open': daily_candle['open'],
                'high': daily_candle['high'],
                'low': daily_candle['low'],
                'close': daily_candle['close'],
                'volume': daily_candle['volume']
            }
            
            # Validate before adding to batch
            if validate_candle_data(doc):
                daily_docs.append((symbol, doc))
            else:
                logger.warning(f"[MarketClose] Skipping invalid daily candle for {symbol}")
        
        # Batch insert all daily candles
        if daily_docs:
            docs = [d[1] for d in daily_docs]
            try:
                result = await batch_insert_with_retry(
                    daily_collection,
                    docs,
                    'OHCLVData (daily, market close)',
                    max_retries=5,
                    chunk_size=100
                )
                
                # Publish finalized candles (only successful ones)
                for i, (symbol, doc) in enumerate(daily_docs[:result['success']]):
                    await publish_candle(symbol, '1d', {**doc, 'final': True})
                    daily_flushed += 1
                    logger.debug(f"[MarketClose] ✓ Flushed daily candle for {symbol}")
                
                if result['success'] > 0:
                    logger.info(f"[MarketClose] ✓ Flushed {result['success']}/{result['total']} daily candles (failed: {result['failed']}, invalid: {result.get('invalid', 0)})")
                    if daily_synced > 0:
                        logger.info(f"[MarketClose] ✓ Synchronized {daily_synced} daily candles to match 1m close")
                
            except Exception as e:
                logger.error(f"[MarketClose] ✗ Critical error flushing daily candles: {e}")
        
        # Remove all from memory (even failed ones)
        pending_daily_candles.clear()
        total_flushed += daily_flushed

        # Step 4: Flush ALL weekly candles with synchronized close prices
        weekly_flushed = 0
        weekly_synced = 0
        weekly_docs = []
        
        for symbol, weekly_candle in list(pending_weekly_candles.items()):
            # Mark as final regardless of current state
            weekly_candle['final'] = True
            
            # Synchronize close price with last 1m candle if available
            original_close = weekly_candle['close']
            if symbol in last_1m_close:
                weekly_candle['close'] = last_1m_close[symbol]
                if original_close != weekly_candle['close']:
                    weekly_synced += 1
                    logger.debug(f"[MarketClose] Synced weekly close for {symbol}: {original_close:.2f} -> {weekly_candle['close']:.2f}")
            
            doc = {
                'tickerID': symbol,
                'timestamp': weekly_candle['start'],
                'open': weekly_candle['open'],
                'high': weekly_candle['high'],
                'low': weekly_candle['low'],
                'close': weekly_candle['close'],
                'volume': weekly_candle['volume']
            }
            
            # Validate before adding to batch
            if validate_candle_data(doc):
                weekly_docs.append((symbol, doc))
            else:
                logger.warning(f"[MarketClose] Skipping invalid weekly candle for {symbol}")
        
        # Batch insert all weekly candles
        if weekly_docs:
            docs = [d[1] for d in weekly_docs]
            try:
                result = await batch_insert_with_retry(
                    weekly_collection,
                    docs,
                    'OHCLVData2 (weekly, market close)',
                    max_retries=5,
                    chunk_size=100
                )
                
                # Publish finalized candles (only successful ones)
                for i, (symbol, doc) in enumerate(weekly_docs[:result['success']]):
                    await publish_candle(symbol, '1w', {**doc, 'final': True})
                    weekly_flushed += 1
                    logger.debug(f"[MarketClose] ✓ Flushed weekly candle for {symbol}")
                
                if result['success'] > 0:
                    logger.info(f"[MarketClose] ✓ Flushed {result['success']}/{result['total']} weekly candles (failed: {result['failed']}, invalid: {result.get('invalid', 0)})")
                    if weekly_synced > 0:
                        logger.info(f"[MarketClose] ✓ Synchronized {weekly_synced} weekly candles to match 1m close")
                
            except Exception as e:
                logger.error(f"[MarketClose] ✗ Critical error flushing weekly candles: {e}")
        
        # Remove all from memory (even failed ones)
        pending_weekly_candles.clear()
        total_flushed += weekly_flushed

        # Final summary
        total_synced = intraday_synced + daily_synced + weekly_synced
        logger.info("=" * 60)
        logger.info(f"[MarketClose] FINALIZATION COMPLETE - Total candles flushed: {total_flushed}")
        logger.info(f"[MarketClose]   - 1m candles: {one_min_flushed}")
        logger.info(f"[MarketClose]   - Intraday candles: {intraday_flushed} (synced: {intraday_synced})")
        logger.info(f"[MarketClose]   - Daily candles: {daily_flushed} (synced: {daily_synced})")
        logger.info(f"[MarketClose]   - Weekly candles: {weekly_flushed} (synced: {weekly_synced})")
        logger.info(f"[MarketClose] Total close prices synchronized: {total_synced}")
        logger.info(f"[MarketClose] All pending candles marked final, uploaded, and flushed from memory")
        logger.info("=" * 60)

# To run both tasks together:
async def main_aggregator_and_flush(message_queue, mongo_client):
    db = mongo_client.get_database('EreunaDB')
    daily_collection = db.get_collection('OHCLVData')
    weekly_collection = db.get_collection('OHCLVData2')
    # Start all tasks including memory cleanup
    aggregator_task = asyncio.create_task(start_aggregator(message_queue, mongo_client))
    flush_task = asyncio.create_task(flush_daily_weekly_candles_at_market_close(daily_collection, weekly_collection))
    cleanup_task = asyncio.create_task(cleanup_old_candles())
    await asyncio.gather(aggregator_task, flush_task, cleanup_task)
    

async def redis_stream_adapter(queue: asyncio.Queue, redis_client: aioredis.Redis, stream='tiingo:stream', group='aggregator', consumer=None, block=5000, count=500):
    """
    OPTIMIZED: Read messages from a Redis Stream using XREADGROUP with larger batches (500 instead of 100).
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

    logger.info(f"Redis stream adapter started (stream={stream}, group={group}, consumer={consumer}, batch_size={count})")
    message_count = 0
    last_report_time = datetime.utcnow()
    try:
        while True:
            try:
                resp = await redis_client.xreadgroup(groupname=group, consumername=consumer, streams={stream: '>'}, count=count, block=block)
                if not resp:
                    await asyncio.sleep(0.01)  # Reduced from 0.1 for lower latency
                    continue
                # resp is list like [(stream, [(id, {b'data': b'...'}), ...])]
                for _stream_name, messages in resp:
                    batch_size = len(messages)
                    message_count += batch_size
                    
                    # PERFORMANCE: Batch acknowledge at the end instead of per-message
                    msg_ids = []
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
                            msg_ids.append(msg_id)
                            continue

                        # Put into queue for aggregator to process
                        try:
                            await queue.put(data)
                            msg_ids.append(msg_id)
                        except Exception as e:
                            logger.error(f"Failed to put redis message into queue: {e}")
                    
                    # Batch acknowledge all messages at once
                    if msg_ids:
                        try:
                            await redis_client.xack(stream, group, *msg_ids)
                        except Exception as e:
                            logger.warning(f"Failed to batch XACK {len(msg_ids)} messages: {e}")
                    
                    # Report throughput every minute
                    now = datetime.utcnow()
                    if (now - last_report_time).total_seconds() >= 60:
                        rate = message_count / 60
                        logger.info(f"[RedisStream] Throughput: {rate:.1f} msg/sec (total: {message_count})")
                        message_count = 0
                        last_report_time = now
                        
            except Exception as e:
                logger.error(f"Error reading from Redis stream: {e}")
                await asyncio.sleep(1)
    except asyncio.CancelledError:
        logger.info("Redis stream adapter cancelled; exiting")
        return
