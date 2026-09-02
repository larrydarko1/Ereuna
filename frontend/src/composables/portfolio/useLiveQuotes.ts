/**
 * useLiveQuotes — the last traded price of every held symbol, pushed as it moves.
 * The aggregator buckets each print into a 1-minute candle and publishes it, so
 * the price is already in Redis by the time it is worth showing. This subscribes
 * to the symbols currently held and receives only the ones that changed.
 * Prices arrive as a partial map and are merged, never replaced: a message
 * carrying only the symbol that moved must not blank the twenty that did not.
 */
import { onScopeDispose, readonly, ref, watch, type DeepReadonly, type Ref } from 'vue';

export type UseLiveQuotesReturn = {
    quotes: DeepReadonly<Ref<Record<string, number>>>;
    connected: DeepReadonly<Ref<boolean>>;
};

/** Backoff between reconnects, so a stopped aggregator is not hammered. */
const RETRY_MS = [1000, 2000, 5000, 15000, 30000];

export function useLiveQuotes(symbols: () => readonly string[], enabled: () => boolean): UseLiveQuotesReturn {
    const quotes = ref<Record<string, number>>({});
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
        const watched = symbols();
        if (disposed || watched.length === 0 || !enabled()) return;

        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const url = `${protocol}://${window.location.host}/ws/quotes?symbols=${encodeURIComponent(watched.join(','))}`;

        const next = new WebSocket(url);
        socket = next;

        next.onopen = () => {
            connected.value = true;
            attempt = 0;
        };

        next.onmessage = (event: MessageEvent<string>) => {
            const parsed = parse(event.data);
            // A message for a symbol list we have since left must not land on
            // the portfolio that replaced it.
            if (parsed !== null && socket === next) quotes.value = { ...quotes.value, ...parsed };
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
        // Joined rather than compared by identity: the caller derives this list
        // from the positions, so it is a new array on every reload even when it
        // names exactly the same symbols.
        () => [symbols().join(','), enabled()] as const,
        () => {
            close();
            quotes.value = {};
            attempt = 0;
            open();
        },
        { immediate: true },
    );

    onScopeDispose(() => {
        disposed = true;
        close();
    });

    return { quotes: readonly(quotes), connected: readonly(connected) };
}

/** A pushed message, or null when it is not a quote map we can use. */
function parse(raw: string): Record<string, number> | null {
    try {
        const message: unknown = JSON.parse(raw);
        if (typeof message !== 'object' || message === null) return null;

        const envelope = message as { type?: unknown; quotes?: unknown };
        if (envelope.type !== 'quotes' || typeof envelope.quotes !== 'object' || envelope.quotes === null) return null;

        const parsed: Record<string, number> = {};
        for (const [symbol, price] of Object.entries(envelope.quotes as Record<string, unknown>)) {
            if (typeof price === 'number' && Number.isFinite(price)) parsed[symbol] = price;
        }
        return parsed;
    } catch {
        return null;
    }
}
