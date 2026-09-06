/**
 * useLiveQuotes — the last traded price of every held symbol, pushed as it moves.
 * The aggregator buckets each print into a 1-minute candle and publishes it, so
 * the price is already in Redis by the time it is worth showing. This subscribes
 * to the symbols currently held over the shared socket and receives only the
 * ones that changed.
 * Prices arrive as a partial map and are merged, never replaced: a message
 * carrying only the symbol that moved must not blank the twenty that did not.
 */
import { onScopeDispose, readonly, ref, watch, type DeepReadonly, type Ref } from 'vue';
import { useSocket } from '@/api/socket';

export type UseLiveQuotesReturn = {
    quotes: DeepReadonly<Ref<Record<string, number>>>;
    connected: DeepReadonly<Ref<boolean>>;
};

type QuoteUpdate = {
    quotes: Record<string, number>;
};

export function useLiveQuotes(symbols: () => readonly string[], enabled: () => boolean): UseLiveQuotesReturn {
    const quotes = ref<Record<string, number>>({});
    const { socket, connected } = useSocket();

    function receive(update: QuoteUpdate): void {
        const watched = new Set(symbols());
        const merged = { ...quotes.value };
        // Filtered rather than merged wholesale: a message for the portfolio we
        // have since left must not add rows to the one that replaced it.
        for (const [symbol, price] of Object.entries(update.quotes)) {
            if (watched.has(symbol)) merged[symbol] = price;
        }
        quotes.value = merged;
    }

    function subscribe(): void {
        const watched = symbols();
        if (watched.length === 0 || !enabled()) return;
        socket.emit('quote:watch', { symbols: [...watched] });
    }

    socket.on('quote:update', receive);
    // The server holds subscriptions per connection, so a reconnect starts with
    // none. Re-asking is what makes a dropped feed resume on its own.
    socket.on('connect', subscribe);

    watch(
        // One string rather than a tuple: the caller derives this list from the
        // positions, so it is a new array on every reload even when it names
        // exactly the same symbols — and a tuple is a new array too, which
        // re-subscribed and blanked every price on each reload.
        () => `${symbols().join(',')}|${String(enabled())}`,
        () => {
            quotes.value = {};
            subscribe();
        },
        { immediate: true },
    );

    onScopeDispose(() => {
        socket.off('quote:update', receive);
        socket.off('connect', subscribe);
    });

    return { quotes: readonly(quotes), connected };
}
