import { beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';

import type { LiveQuote } from '@ereuna/shared';

import { socket } from '@/__tests__/support/socket';
import { useLiveQuotes, type UseLiveQuotesReturn } from '@/composables/data/useLiveQuotes';

// Imported inside the factory: `vi.mock` is hoisted above this file's imports,
// so the support module cannot be referenced from the outer scope here.
vi.mock('@/api/socket', async () => (await import('@/__tests__/support/socket')).socketModule());

const quote = (price: number): LiveQuote => ({ price, changePercent: null });

function inScope(
    symbols: () => readonly string[],
    enabled: () => boolean = () => true,
): { quotes: UseLiveQuotesReturn; stop: () => void } {
    const scope = effectScope();
    const quotes = scope.run(() => useLiveQuotes(symbols, enabled))!;
    return { quotes, stop: () => scope.stop() };
}

beforeEach(() => {
    socket.reset();
});

describe('subscribing', () => {
    it('asks for the symbols currently held', () => {
        inScope(() => ['AAPL', 'MSFT']);

        expect(socket.emitted).toEqual([{ event: 'quote:watch', payload: { symbols: ['AAPL', 'MSFT'] } }]);
    });

    it('asks for nothing when nothing is held', () => {
        inScope(() => []);

        expect(socket.emitted).toEqual([]);
    });

    it('asks for nothing while the feed is switched off', () => {
        inScope(
            () => ['AAPL'],
            () => false,
        );

        expect(socket.emitted).toEqual([]);
    });

    it('does not re-subscribe for a new array naming the same symbols', async () => {
        const reload = ref(0);
        inScope(() => (reload.value >= 0 ? ['AAPL', 'MSFT'] : []));

        reload.value += 1;
        await nextTick();

        expect(socket.emitted).toHaveLength(1);
    });

    it('does not re-subscribe when the same symbols are reordered', async () => {
        const symbols = ref(['AAPL', 'MSFT']);
        const { quotes } = inScope(() => symbols.value);
        socket.deliver('quote:update', { quotes: { AAPL: quote(180) } });

        symbols.value = ['MSFT', 'AAPL'];
        await nextTick();

        expect(socket.emitted).toHaveLength(1);
        expect(quotes.quotes.value).toEqual({ AAPL: quote(180) });
    });

    it('re-subscribes when the held symbols actually change, and drops the old prices', async () => {
        const symbols = ref(['AAPL']);
        const { quotes } = inScope(() => symbols.value);
        socket.deliver('quote:update', { quotes: { AAPL: quote(180) } });
        expect(quotes.quotes.value).toEqual({ AAPL: quote(180) });

        symbols.value = ['MSFT'];
        await nextTick();

        expect(quotes.quotes.value).toEqual({});
        expect(socket.emitted[1]).toEqual({ event: 'quote:watch', payload: { symbols: ['MSFT'] } });
    });

    it('re-asks after a reconnect', () => {
        inScope(() => ['AAPL']);

        socket.deliver('connect', undefined);

        expect(socket.emitted).toHaveLength(2);
    });
});

describe('receiving', () => {
    it('merges a partial map rather than replacing it', () => {
        const { quotes } = inScope(() => ['AAPL', 'MSFT']);

        socket.deliver('quote:update', { quotes: { AAPL: quote(180), MSFT: quote(410) } });
        socket.deliver('quote:update', { quotes: { AAPL: quote(181) } });

        expect(quotes.quotes.value).toEqual({ AAPL: quote(181), MSFT: quote(410) });
    });

    it('drops a price for a symbol the portfolio does not hold', () => {
        const { quotes } = inScope(() => ['AAPL']);

        socket.deliver('quote:update', { quotes: { AAPL: quote(180), TSLA: quote(250) } });

        expect(quotes.quotes.value).toEqual({ AAPL: quote(180) });
    });

    it('keeps the last quotes when the feed switches off at the bell', async () => {
        const enabled = ref(true);
        const { quotes } = inScope(
            () => ['AAPL'],
            () => enabled.value,
        );
        socket.deliver('quote:update', { quotes: { AAPL: quote(180) } });

        enabled.value = false;
        await nextTick();

        expect(quotes.quotes.value).toEqual({ AAPL: quote(180) });
        expect(socket.emitted).toHaveLength(1);
    });

    it('takes the closing bucket that lands just after the bell', async () => {
        const enabled = ref(true);
        const { quotes } = inScope(
            () => ['AAPL'],
            () => enabled.value,
        );

        enabled.value = false;
        await nextTick();
        socket.deliver('quote:update', { quotes: { AAPL: quote(181) } });

        expect(quotes.quotes.value).toEqual({ AAPL: quote(181) });
    });

    it('starts afresh when the next session opens', async () => {
        const enabled = ref(true);
        const { quotes } = inScope(
            () => ['AAPL'],
            () => enabled.value,
        );
        socket.deliver('quote:update', { quotes: { AAPL: quote(180) } });
        enabled.value = false;
        await nextTick();

        enabled.value = true;
        await nextTick();

        expect(quotes.quotes.value).toEqual({});
        expect(socket.emitted).toHaveLength(2);
    });

    it('reports whether the socket is up', () => {
        const { quotes } = inScope(() => ['AAPL']);

        expect(quotes.connected.value).toBe(true);
    });
});

describe('teardown', () => {
    it('unbinds both handlers', () => {
        const { stop } = inScope(() => ['AAPL']);

        stop();

        expect(socket.listeners('quote:update')).toBe(0);
        expect(socket.listeners('connect')).toBe(0);
    });
});
