/**
 * useLiveCandle — the candle currently being built, pushed as trades arrive.
 * The aggregator holds an open connection to the trade feed and buckets every
 * print into the timeframe it belongs to. This subscribes to one (symbol,
 * timeframe) pair over the shared socket and receives that bucket each time it
 * changes: one small object, not the whole window.
 * The server holds one set of pairs per connection, and a page may chart more
 * than one (the screener's daily over weekly). So every chart's pair goes into
 * one set for the tab, and the whole set is sent whenever it changes: a second
 * chart adds its pair instead of replacing the first one's.
 */
import { onScopeDispose, readonly, ref, watch, type DeepReadonly, type Ref } from 'vue';

import type { CandlePair, EventPayload, LiveCandle } from '@ereuna/shared';

import { useSocket } from '@/api/socket';

export type UseLiveCandleReturn = {
    candle: DeepReadonly<Ref<LiveCandle | null>>;
    connected: DeepReadonly<Ref<boolean>>;
};

/** How many mounted charts want each pair, keyed by `pairKey`. */
const claims = new Map<string, { pair: CandlePair; count: number }>();

let syncQueued = false;

export function useLiveCandle(key: () => CandlePair, enabled: () => boolean): UseLiveCandleReturn {
    const candle = ref<LiveCandle | null>(null);
    const { socket, connected } = useSocket();
    let held: CandlePair | null = null;

    function receive(update: EventPayload<'candle:update'>): void {
        const { symbol, timeframe } = key();
        // A message for a pair we have since left must not land on the chart
        // that replaced it — the switch and the update race each other.
        if (update.symbol === symbol && update.timeframe === timeframe) candle.value = update.candle;
    }

    function hold(pair: CandlePair | null): void {
        if (held !== null) release(held);
        if (pair !== null) claim(pair);
        held = pair;
        queueSync();
    }

    // The server holds subscriptions per connection, so a reconnect starts with
    // none. Re-asking is what makes a dropped feed resume on its own.
    function resubscribe(): void {
        if (held !== null) queueSync();
    }

    /** One message for every chart that changed in the same tick, a page's mount included. */
    function queueSync(): void {
        if (syncQueued) return;
        syncQueued = true;
        queueMicrotask(() => {
            syncQueued = false;
            socket.emit('candle:watch', { pairs: [...claims.values()].map((entry) => entry.pair) });
        });
    }

    socket.on('candle:update', receive);
    socket.on('connect', resubscribe);

    watch(
        () => [key().symbol, key().timeframe, enabled()] as const,
        ([symbol, timeframe, on]) => {
            candle.value = null;
            const pair = symbol !== '' && on ? { symbol, timeframe } : null;
            if (pair === null && held === null) return;
            hold(pair);
        },
        { immediate: true },
    );

    onScopeDispose(() => {
        socket.off('candle:update', receive);
        socket.off('connect', resubscribe);
        if (held !== null) hold(null);
    });

    return { candle: readonly(candle), connected };
}

function claim(pair: CandlePair): void {
    const entry = claims.get(pairKey(pair));
    if (entry === undefined) claims.set(pairKey(pair), { pair, count: 1 });
    else entry.count += 1;
}

function release(pair: CandlePair): void {
    const entry = claims.get(pairKey(pair));
    if (entry === undefined) return;
    entry.count -= 1;
    if (entry.count === 0) claims.delete(pairKey(pair));
}

function pairKey(pair: CandlePair): string {
    return `${pair.symbol}:${pair.timeframe}`;
}
