/**
 * The realtime market-data contract: what the ingestor, the aggregator and the
 * API agree on without importing each other.
 * Redis is the only seam between the three processes. The ingestor writes the
 * raw trade feed to `tiingo:stream`, the aggregator reads it through a consumer
 * group and republishes finished buckets on `aggr:{timeframe}` plus a
 * last-known-value key per pair, and the API's socket gateway pattern-subscribes
 * to those channels and fans out to connected clients. Every one of those names
 * lives here, because a typo in any of them is a silent feed that still starts.
 */

/** Timeframes the aggregator buckets into. These are the Redis channel suffixes. */
export const AGGREGATOR_TIMEFRAMES = ['1m', '5m', '15m', '30m', '1hr', '1d', '1w'] as const;

export type AggregatorTimeframe = (typeof AGGREGATOR_TIMEFRAMES)[number];

/** The chart timeframe a client asks for, mapped to the bucket that feeds it. */
export const CHART_TO_AGGREGATOR = {
    daily: '1d',
    weekly: '1w',
    intraday1m: '1m',
    intraday5m: '5m',
    intraday15m: '15m',
    intraday30m: '30m',
    intraday1hr: '1hr',
} as const;

/** The bucket a client's chart timeframe came from, for labelling what is pushed back. */
export const AGGREGATOR_TO_CHART = {
    '1d': 'daily',
    '1w': 'weekly',
    '1m': 'intraday1m',
    '5m': 'intraday5m',
    '15m': 'intraday15m',
    '30m': 'intraday30m',
    '1hr': 'intraday1hr',
} as const;

/** Bucket width in milliseconds, for deciding whether a stored bucket is still the live one. */
export const BUCKET_MS = {
    '1m': 60_000,
    '5m': 300_000,
    '15m': 900_000,
    '30m': 1_800_000,
    '1hr': 3_600_000,
    '1d': 86_400_000,
    '1w': 604_800_000,
} as const satisfies Record<AggregatorTimeframe, number>;

/** Quotes ride the 1-minute bucket: it is the fastest one the aggregator publishes. */
export const QUOTE_TIMEFRAME = '1m' satisfies AggregatorTimeframe;

/** The raw trade feed, ingestor → aggregator. A stream, so a restart resumes. */
export const TIINGO_STREAM = 'tiingo:stream';
export const TIINGO_GROUP = 'aggregator';
/** Cap on the raw stream, trimmed approximately — it is a buffer, not a record. */
export const TIINGO_STREAM_MAXLEN = 10_000;

/** Aggregated buckets, aggregator → every API process. */
export const AGGREGATE_CHANNEL_PATTERN = 'aggr:*';

export function aggregateChannel(timeframe: AggregatorTimeframe): string {
    return `aggr:${timeframe}`;
}

/**
 * The last bucket published for a pair. A client that opens a chart halfway
 * through a bucket reads this rather than staring at nothing until the next
 * trade, so it is a snapshot for late joiners and not a store of record.
 */
export function lastCandleKey(symbol: string, timeframe: AggregatorTimeframe): string {
    return `aggr:last:${symbol.toUpperCase()}:${timeframe}`;
}

/** One bucket as it crosses Redis. Timestamps are ISO 8601 strings. */
export type AggregateMessage = {
    tickerID: string;
    timeframe: AggregatorTimeframe;
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
    final?: boolean;
};

/**
 * One bucket as it reaches the browser. `time` matches the REST series exactly
 * or the client cannot address the same bar: an intraday bar is the UTC instant
 * to the second, a daily or weekly bar is the calendar date alone.
 */
export type LiveCandle = {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    final: boolean; // True once the bucket has closed and will not change again
};
