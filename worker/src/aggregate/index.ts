/**
 * The aggregate role: the trade stream turned into candles.
 * Reads the ingestor's Redis stream, buckets it at seven timeframes, upserts
 * each finished candle into MongoDB and publishes both the finished and the
 * in-progress ones so the API's socket gateway can push them to a browser.
 * THIS ROLE MUST RUN AS EXACTLY ONE PROCESS. Buckets are held in memory and the
 * consumer group splits the stream between whoever reads it, so a second copy
 * would build half a candle out of half the trades and then overwrite the other
 * half's row. That is the reason the worker has roles at all: a deployment can
 * give this one `replicas: 1` while scaling anything else.
 */
import { startSession, stopSession } from '@/aggregate/session.js';
import { consumeTrades } from '@/aggregate/stream.js';
import { startWriter, stopWriter } from '@/aggregate/writer.js';
import { logger } from '@/lib/logger.js';

let stopping = false;

export async function startAggregator(): Promise<void> {
    startWriter();
    await startSession();
    logger.info('Aggregating trades');
    await consumeTrades(() => stopping);
}

/**
 * The buffered candles are the ones already finalised and not yet flushed;
 * dropping them would leave a gap in stored history that nothing rebuilds.
 */
export async function stopAggregator(): Promise<void> {
    stopping = true;
    stopSession();
    await stopWriter();
}
