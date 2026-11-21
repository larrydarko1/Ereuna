/**
 * useLivePortfolio — the open slot priced at the session's latest trades, as the
 * server pushes it.
 * The server holds the slot's positions and cost basis and re-prices them as
 * trades arrive; the page lays what it sends over the summary it read, and
 * computes no portfolio number of its own. The holdings change only with a
 * write, which re-reads the summary, so a new summary is the cue to watch again
 * and have the server re-read them too.
 * At the bell the last valuation stays, and the closing bucket that lands a
 * moment later is still taken; the next session's open starts afresh.
 */
import { onScopeDispose, shallowRef, watch, type Ref } from 'vue';

import type { EventPayload, PortfolioSummary, PortfolioValuation } from '@ereuna/shared';

import { useSocket } from '@/api/socket';

export type UseLivePortfolioReturn = {
    valuation: Readonly<Ref<PortfolioValuation | null>>;
};

export function useLivePortfolio(
    summary: () => PortfolioSummary | null,
    enabled: () => boolean,
): UseLivePortfolioReturn {
    const valuation = shallowRef<PortfolioValuation | null>(null);
    const { socket } = useSocket();
    let watching = false;

    function receive(update: EventPayload<'portfolio:update'>): void {
        // A push for the slot just left must not land on the one that replaced it
        if (update.number === summary()?.number) valuation.value = update;
    }

    /** The slot worth pricing: the open one, while it holds something and the session trades. */
    function target(): number | null {
        const current = summary();
        return enabled() && current !== null && current.positions.length > 0 ? current.number : null;
    }

    function send(number: number | null): void {
        if (number === null && !watching) return;
        watching = number !== null;
        socket.emit('portfolio:watch', { number });
    }

    // The server holds the watch per connection, so a reconnect starts with none
    function resubscribe(): void {
        const number = target();
        if (number !== null) send(number);
    }

    socket.on('portfolio:update', receive);
    socket.on('connect', resubscribe);

    watch(
        [summary, enabled],
        ([current, on], [before, wasOn]) => {
            const reread = current !== before;
            if (reread || (on && wasOn !== true)) valuation.value = null;
            // Switching off keeps the watch for the closing bucket; a new summary
            // while off would only be priced with holdings it no longer has
            if (on) send(target());
            else if (reread) send(null);
        },
        { immediate: true },
    );

    onScopeDispose(() => {
        socket.off('portfolio:update', receive);
        socket.off('connect', resubscribe);
        send(null);
    });

    return { valuation };
}
