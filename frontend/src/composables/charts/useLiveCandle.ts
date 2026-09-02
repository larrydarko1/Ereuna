/**
 * useLiveCandle — the candle currently being built, pushed as trades arrive.
 * The aggregator holds an open connection to the trade feed and buckets every
 * print into the timeframe it belongs to. This subscribes to one (symbol,
 * timeframe) pair and receives that bucket each time it changes: one small
 * object, not the whole window.
 */
import { onScopeDispose, readonly, ref, watch, type DeepReadonly, type Ref } from 'vue';
import type { ChartTimeframe } from '@ereuna/shared';

export type LiveCandle = {
    time: string; // Same format as the REST series: `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss`
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    final: boolean; // True once the bucket has closed and will not change again
};

export type LiveCandleKey = {
    symbol: string;
    timeframe: ChartTimeframe;
};

export type UseLiveCandleReturn = {
    candle: DeepReadonly<Ref<LiveCandle | null>>;
    connected: DeepReadonly<Ref<boolean>>;
};

/** Backoff between reconnects, so a stopped aggregator is not hammered. */
const RETRY_MS = [1000, 2000, 5000, 15000, 30000];

export function useLiveCandle(key: () => LiveCandleKey, enabled: () => boolean): UseLiveCandleReturn {
    const candle = ref<LiveCandle | null>(null);
    const connected = ref(false);

    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let disposed = false;

    function close(): void {
        if (retry !== undefined) clearTimeout(retry);
        retry = undefined;

        if (socket !== null) {
            // Drop the handlers first: closing fires `onclose`, and a reconnect
            // scheduled from a close we asked for is a socket nobody wanted.
            socket.onopen = null;
            socket.onmessage = null;
            socket.onclose = null;
            socket.onerror = null;
            socket.close();
            socket = null;
        }
        connected.value = false;
    }

    function open(): void {
        const { symbol, timeframe } = key();
        if (disposed || symbol === '' || !enabled()) return;

        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const url = `${protocol}://${window.location.host}/ws/candles?symbol=${encodeURIComponent(
            symbol,
        )}&timeframe=${encodeURIComponent(timeframe)}`;

        const next = new WebSocket(url);
        socket = next;

        next.onopen = () => {
            connected.value = true;
            attempt = 0;
        };

        next.onmessage = (event: MessageEvent<string>) => {
            const parsed = parse(event.data);
            // A message for a pair we have since left must not land on the
            // chart that replaced it.
            if (parsed !== null && socket === next) candle.value = parsed;
        };

        next.onclose = () => {
            connected.value = false;
            if (socket !== next) return;
            socket = null;
            schedule();
        };

        next.onerror = () => {
            // `onclose` always follows, and that is where the retry lives.
            connected.value = false;
        };
    }

    function schedule(): void {
        if (disposed || !enabled()) return;
        const delay = RETRY_MS[Math.min(attempt, RETRY_MS.length - 1)] ?? 30000;
        attempt += 1;
        retry = setTimeout(open, delay);
    }

    watch(
        () => [key().symbol, key().timeframe, enabled()] as const,
        () => {
            close();
            candle.value = null;
            attempt = 0;
            open();
        },
        { immediate: true },
    );

    onScopeDispose(() => {
        disposed = true;
        close();
    });

    return { candle: readonly(candle), connected: readonly(connected) };
}

/** A pushed message, or null when it is not a candle we can use. */
function parse(raw: string): LiveCandle | null {
    try {
        const message: unknown = JSON.parse(raw);
        if (typeof message !== 'object' || message === null) return null;

        const envelope = message as { type?: unknown; candle?: unknown };
        if (envelope.type !== 'candle' || typeof envelope.candle !== 'object' || envelope.candle === null) return null;

        const value = envelope.candle as Record<string, unknown>;
        if (typeof value.time !== 'string') return null;

        const numbers = ['open', 'high', 'low', 'close', 'volume'] as const;
        if (numbers.some((field) => typeof value[field] !== 'number' || !Number.isFinite(value[field] as number))) {
            return null;
        }

        return {
            time: value.time,
            open: value.open as number,
            high: value.high as number,
            low: value.low as number,
            close: value.close as number,
            volume: value.volume as number,
            final: value.final === true,
        };
    } catch {
        return null;
    }
}
