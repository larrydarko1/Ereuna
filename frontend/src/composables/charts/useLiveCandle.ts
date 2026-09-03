/**
 * useLiveCandle — the candle currently being built, pushed as trades arrive.
 * The aggregator holds an open connection to the trade feed and buckets every
 * print into the timeframe it belongs to. This subscribes to one (symbol,
 * timeframe) pair over the shared socket and receives that bucket each time it
 * changes: one small object, not the whole window.
 * A socket watches one pair at a time, so subscribing replaces whatever the
 * previous chart was watching. That is the app's shape — one chart is mounted
 * at a time — and it is what makes switching symbol a single message.
 */
import { onScopeDispose, readonly, ref, watch, type DeepReadonly, type Ref } from 'vue';
import type { ChartTimeframe, LiveCandle } from '@ereuna/shared';
import { useSocket } from '@/api/socket';

export type LiveCandleKey = {
    symbol: string;
    timeframe: ChartTimeframe;
};

export type UseLiveCandleReturn = {
    candle: DeepReadonly<Ref<LiveCandle | null>>;
    connected: DeepReadonly<Ref<boolean>>;
};

type CandleUpdate = {
    symbol: string;
    timeframe: ChartTimeframe;
    candle: LiveCandle;
};

export function useLiveCandle(key: () => LiveCandleKey, enabled: () => boolean): UseLiveCandleReturn {
    const candle = ref<LiveCandle | null>(null);
    const { socket, connected } = useSocket();

    function receive(update: CandleUpdate): void {
        const { symbol, timeframe } = key();
        // A message for a pair we have since left must not land on the chart
        // that replaced it — the switch and the update race each other.
        if (update.symbol === symbol && update.timeframe === timeframe) candle.value = update.candle;
    }

    function subscribe(): void {
        const { symbol, timeframe } = key();
        if (symbol === '' || !enabled()) return;
        socket.emit('candle:watch', { symbol, timeframe });
    }

    socket.on('candle:update', receive);
    // The server holds subscriptions per connection, so a reconnect starts with
    // none. Re-asking is what makes a dropped feed resume on its own.
    socket.on('connect', subscribe);

    watch(
        () => [key().symbol, key().timeframe, enabled()] as const,
        () => {
            candle.value = null;
            subscribe();
        },
        { immediate: true },
    );

    onScopeDispose(() => {
        socket.off('candle:update', receive);
        socket.off('connect', subscribe);
    });

    return { candle: readonly(candle), connected };
}
