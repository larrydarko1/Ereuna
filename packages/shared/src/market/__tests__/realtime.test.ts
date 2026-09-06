import { describe, expect, it } from 'vitest';
import {
    AGGREGATE_CHANNEL_PATTERN,
    AGGREGATOR_TIMEFRAMES,
    AGGREGATOR_TO_CHART,
    BUCKET_MS,
    CHART_TO_AGGREGATOR,
    QUOTE_TIMEFRAME,
    TIINGO_GROUP,
    TIINGO_STREAM,
    TIINGO_STREAM_MAXLEN,
    aggregateChannel,
    lastCandleKey,
} from '#market/realtime.js';

describe('the timeframe tables', () => {
    it('maps every chart timeframe onto a bucket the aggregator publishes', () => {
        for (const bucket of Object.values(CHART_TO_AGGREGATOR)) {
            expect(AGGREGATOR_TIMEFRAMES).toContain(bucket);
        }
    });

    it('round-trips chart → bucket → chart for every entry', () => {
        for (const [chart, bucket] of Object.entries(CHART_TO_AGGREGATOR)) {
            expect(AGGREGATOR_TO_CHART[bucket]).toBe(chart);
        }
    });

    it('round-trips bucket → chart → bucket for every entry', () => {
        for (const [bucket, chart] of Object.entries(AGGREGATOR_TO_CHART)) {
            expect(CHART_TO_AGGREGATOR[chart]).toBe(bucket);
        }
    });

    it('gives every bucket a width, in ascending order', () => {
        const widths = AGGREGATOR_TIMEFRAMES.map((tf) => BUCKET_MS[tf]);
        expect(widths).toEqual([60_000, 300_000, 900_000, 1_800_000, 3_600_000, 86_400_000, 604_800_000]);
        expect([...widths].sort((a, b) => a - b)).toEqual(widths);
    });

    it('rides quotes on the fastest bucket', () => {
        expect(QUOTE_TIMEFRAME).toBe(AGGREGATOR_TIMEFRAMES[0]);
        expect(BUCKET_MS[QUOTE_TIMEFRAME]).toBe(Math.min(...Object.values(BUCKET_MS)));
    });
});

describe('aggregateChannel', () => {
    it.each(AGGREGATOR_TIMEFRAMES)('names the channel for %s', (timeframe) => {
        expect(aggregateChannel(timeframe)).toBe(`aggr:${timeframe}`);
    });

    it("produces a name the API's psubscribe pattern actually matches", () => {
        const prefix = AGGREGATE_CHANNEL_PATTERN.replace('*', '');
        for (const timeframe of AGGREGATOR_TIMEFRAMES) {
            expect(aggregateChannel(timeframe).startsWith(prefix)).toBe(true);
        }
    });
});

describe('lastCandleKey', () => {
    it('upper-cases the symbol, so a lower-case request reads the key the aggregator wrote', () => {
        expect(lastCandleKey('aapl', '1m')).toBe('aggr:last:AAPL:1m');
        expect(lastCandleKey('AAPL', '1m')).toBe('aggr:last:AAPL:1m');
    });

    it('keeps symbol and timeframe in separate segments', () => {
        expect(lastCandleKey('BRK.B', '1d').split(':')).toEqual(['aggr', 'last', 'BRK.B', '1d']);
    });

    it('does not collide with the pubsub channel namespace', () => {
        expect(lastCandleKey('AAPL', '1m')).not.toBe(aggregateChannel('1m'));
    });
});

describe('the raw stream contract', () => {
    it('names the stream and the consumer group the ingestor and aggregator both use', () => {
        expect(TIINGO_STREAM).toBe('tiingo:stream');
        expect(TIINGO_GROUP).toBe('aggregator');
    });

    it('caps the stream — it is a buffer, not a record', () => {
        expect(TIINGO_STREAM_MAXLEN).toBeGreaterThan(0);
        expect(Number.isInteger(TIINGO_STREAM_MAXLEN)).toBe(true);
    });
});
