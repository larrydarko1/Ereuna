import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AggregateMessage } from '@ereuna/shared';
import type { CandleDoc } from '@/writer.js';

const publishCandle = vi.fn<(message: AggregateMessage) => void>();
const enqueue = vi.fn<(timeframe: string, doc: CandleDoc) => void>();

vi.mock('@/publisher.js', () => ({ publishCandle: (message: AggregateMessage) => publishCandle(message) }));
vi.mock('@/writer.js', () => ({ enqueue: (timeframe: string, doc: CandleDoc) => enqueue(timeframe, doc) }));

const { applyTrade, closeSession, openBucketCount, seedWeekly, sweep } = await import('@/builder.js');

const at = (iso: string): number => Date.parse(iso);

/** Every finished candle handed to the writer for one timeframe. */
const written = (timeframe: string): CandleDoc[] =>
    enqueue.mock.calls.filter(([tf]) => tf === timeframe).map(([, doc]) => doc);

/** Every message published for one timeframe. */
const sent = (timeframe: string): AggregateMessage[] =>
    publishCandle.mock.calls.map(([message]) => message).filter((message) => message.timeframe === timeframe);

beforeEach(() => {
    closeSession();
    publishCandle.mockClear();
    enqueue.mockClear();
});

describe('applyTrade', () => {
    it('opens a bucket on the first trade', () => {
        applyTrade('AAPL', 100, at('2026-09-03T14:37:10Z'), 1000);

        const [update] = sent('1m');
        expect(update).toMatchObject({ tickerID: 'AAPL', open: 100, high: 100, low: 100, close: 100, final: false });
        expect(update?.timestamp).toBe('2026-09-03T14:37:00.000Z');
        expect(enqueue).not.toHaveBeenCalled();
    });

    it('moves high, low and close within the same bucket', () => {
        applyTrade('AAPL', 100, at('2026-09-03T14:37:10Z'), 1000);
        applyTrade('AAPL', 105, at('2026-09-03T14:37:20Z'), 2000);
        applyTrade('AAPL', 95, at('2026-09-03T14:37:30Z'), 3000);
        applyTrade('AAPL', 99, at('2026-09-03T14:37:40Z'), 4000);

        const latest = sent('1m').at(-1);
        expect(latest).toMatchObject({ open: 100, high: 105, low: 95, close: 99, final: false });
    });

    it('closes the previous bucket when a trade crosses the boundary', () => {
        applyTrade('AAPL', 100, at('2026-09-03T14:37:10Z'), 1000);
        applyTrade('AAPL', 101, at('2026-09-03T14:38:05Z'), 2000);

        const finished = written('1m');
        expect(finished).toHaveLength(1);
        expect(finished[0]).toMatchObject({ tickerID: 'AAPL', open: 100, close: 100 });
        expect(finished[0]?.timestamp.toISOString()).toBe('2026-09-03T14:37:00.000Z');

        const final = sent('1m').find((message) => message.final);
        expect(final).toMatchObject({ close: 100, final: true });
    });

    it('feeds every timeframe from one trade', () => {
        applyTrade('AAPL', 100, at('2026-09-03T14:37:10Z'), 1000);

        for (const timeframe of ['1m', '5m', '15m', '30m', '1hr', '1d', '1w']) {
            expect(sent(timeframe), timeframe).toHaveLength(1);
        }
    });

    it('throttles in-progress updates but never a finished candle', () => {
        applyTrade('AAPL', 100, at('2026-09-03T14:37:10Z'), 1000);
        // Inside the 500 ms window: the bar moved, but nothing is published.
        applyTrade('AAPL', 101, at('2026-09-03T14:37:11Z'), 1200);
        expect(sent('1m')).toHaveLength(1);

        applyTrade('AAPL', 102, at('2026-09-03T14:37:12Z'), 1700);
        expect(sent('1m')).toHaveLength(2);

        // A boundary crossing publishes the closed bar regardless of the window.
        applyTrade('AAPL', 103, at('2026-09-03T14:38:01Z'), 1800);
        expect(sent('1m').filter((message) => message.final)).toHaveLength(1);
    });

    it('keeps symbols apart', () => {
        applyTrade('AAPL', 100, at('2026-09-03T14:37:10Z'), 1000);
        applyTrade('MSFT', 400, at('2026-09-03T14:37:11Z'), 1000);

        expect(sent('1m').map((message) => [message.tickerID, message.close])).toEqual([
            ['AAPL', 100],
            ['MSFT', 400],
        ]);
    });
});

describe('sweep', () => {
    it('closes a bucket that ended with no further trade', () => {
        applyTrade('AAPL', 100, at('2026-09-03T14:37:10Z'), 1000);
        enqueue.mockClear();

        sweep(at('2026-09-03T14:37:59Z'));
        expect(enqueue).not.toHaveBeenCalled();

        sweep(at('2026-09-03T14:38:00Z'));
        expect(written('1m')).toHaveLength(1);
    });

    it('leaves the longer timeframes open when only the minute bar has ended', () => {
        applyTrade('AAPL', 100, at('2026-09-03T14:37:10Z'), 1000);
        enqueue.mockClear();

        sweep(at('2026-09-03T14:38:00Z'));
        expect(written('1m')).toHaveLength(1);
        expect(written('5m')).toHaveLength(0);
        expect(written('1d')).toHaveLength(0);
    });
});

describe('closeSession', () => {
    it('finalises every timeframe, including the ones that have not ended', () => {
        applyTrade('AAPL', 100, at('2026-09-03T14:37:10Z'), 1000);
        enqueue.mockClear();

        closeSession();

        expect(written('1d')).toHaveLength(1);
        expect(written('1w')).toHaveLength(1);
        expect(openBucketCount()).toBe(0);
    });
});

describe('seedWeekly', () => {
    it('continues a week-to-date bar rather than reopening it', () => {
        const weekStart = new Date('2026-08-31T00:00:00Z');
        seedWeekly([{ tickerID: 'AAPL', timestamp: weekStart, open: 90, high: 110, low: 85, close: 95, volume: 0 }]);

        applyTrade('AAPL', 100, at('2026-09-03T14:37:10Z'), 1000);

        const weekly = sent('1w').at(-1);
        expect(weekly).toMatchObject({ open: 90, high: 110, low: 85, close: 100 });
        expect(weekly?.timestamp).toBe(weekStart.toISOString());
    });
});
