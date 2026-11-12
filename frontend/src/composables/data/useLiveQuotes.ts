/**
 * useLiveQuotes — the last traded price of every symbol on screen, and its
 * change since the previous close, pushed as it moves.
 * The aggregator buckets each print into a 1-minute candle and publishes it,
 * and the API attaches the change, so a quote arrives ready to show. This
 * subscribes to the symbols a portfolio holds or a watchlist lists, over the
 * shared socket, and receives only the ones that changed. The server keeps one
 * quote subscription per socket, so one caller is mounted at a time: the
 * portfolio and the chart view's watchlist are separate pages.
 * Quotes arrive as a partial map and are merged, never replaced: a message
 * carrying only the symbol that moved must not blank the twenty that did not.
 */
import { onScopeDispose, readonly, ref, watch, type DeepReadonly, type Ref } from 'vue';

import type { EventPayload, LiveQuote } from '@ereuna/shared';

import { useSocket } from '@/api/socket';

export type UseLiveQuotesReturn = {
    quotes: DeepReadonly<Ref<Record<string, LiveQuote>>>;
    connected: DeepReadonly<Ref<boolean>>;
};

export function useLiveQuotes(symbols: () => readonly string[], enabled: () => boolean): UseLiveQuotesReturn {
    const quotes = ref<Record<string, LiveQuote>>({});
    const { socket, connected } = useSocket();

    function receive(update: EventPayload<'quote:update'>): void {
        // Taken while switched off too: the aggregator refuses prints outside
        // the session, so what lands after the bell is the closing bucket
        const watched = new Set(symbols());
        const merged = { ...quotes.value };
        // Filtered rather than merged wholesale: a message for the portfolio or
        // list we have since left must not add rows to the one that replaced it.
        for (const [symbol, quote] of Object.entries(update.quotes)) {
            if (watched.has(symbol)) merged[symbol] = quote;
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
        // re-subscribed and blanked every price on each reload. Sorted, because
        // reordering a watchlist changes nothing the server sends.
        () => `${[...symbols()].sort().join(',')}|${String(enabled())}`,
        () => {
            // Switching off keeps the quotes: the session's last price stays the
            // price until the next session opens, which starts afresh
            if (!enabled()) return;
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
