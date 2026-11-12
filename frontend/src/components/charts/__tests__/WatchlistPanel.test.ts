import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LIMITS, type WatchlistSummary } from '@ereuna/shared';

import { watchlistRow as row, watchlistSummary } from '@/__tests__/support/answers';
import { elementOf, query } from '@/__tests__/support/dom';
import { mockApi } from '@/__tests__/support/msw';
import { socket } from '@/__tests__/support/socket';
import { clearAuth } from '@/api/client';
import WatchlistPanel from '@/components/charts/WatchlistPanel.vue';
import { i18n } from '@/i18n';
import { formatNumber, formatPercent } from '@/utils/formatters';

vi.mock('@/api/socket', async () => (await import('@/__tests__/support/socket')).socketModule());

const api = mockApi();

/** A Friday during the session, and the same day after the bell. */
const OPEN = new Date('2026-03-06T15:00:00Z'); // 10:00 New York
const CLOSED = new Date('2026-03-06T22:00:00Z'); // 17:00 New York

/** How often the market badge re-reads the clock. */
const CLOCK_TICK_MS = 30_000;

const summary = (name: string, tickerCount = 0): WatchlistSummary => watchlistSummary(name, { id: name, tickerCount });

const panel = async (props: Record<string, unknown> = {}): Promise<VueWrapper> => {
    const wrapper = mount(WatchlistPanel, { props, attachTo: document.body });
    await flushPromises();
    return wrapper;
};

/** Dialogs are teleported to <body>, which the wrapper does not traverse. */
const $ = (selector: string): HTMLElement => {
    const element = document.body.querySelector<HTMLElement>(selector);
    if (element === null) throw new Error(`no ${selector} on the page`);
    return element;
};

const seed = (tickers: string[] = ['AAPL', 'MSFT']): void => {
    api.on('GET /api/watchlists', { items: [summary('Tech', tickers.length), summary('Energy')] });
    api.on('GET /api/watchlists/Tech', { name: 'Tech', rows: tickers.map((ticker) => row(ticker)) });
    api.on('GET /api/watchlists/Energy', { name: 'Energy', rows: [] });
};

const icon = (wrapper: VueWrapper, index: number, label: string): ReturnType<VueWrapper['findAll']>[number] => {
    const node = wrapper
        .findAll('.watchlist__row')
        [index]?.findAll('.watchlist__icon')
        .find((button) => button.attributes('aria-label')?.startsWith(label) === true);
    if (node === undefined) throw new Error(`no ${label} button on row ${index}`);
    return node;
};

/** A file input cannot be assigned, so the change event carries the file itself. */
async function chooseFile(wrapper: VueWrapper, contents: string): Promise<void> {
    const input = elementOf(wrapper.get('.watchlist__file').element, HTMLInputElement);
    const file = new File([contents], 'list.txt', { type: 'text/plain' });
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await flushPromises();
}

beforeEach(() => {
    // The lists live at module scope so the strip and the panel agree; ending
    // the session is how the app itself resets them.
    clearAuth();
    localStorage.clear();
    document.body.innerHTML = '';
    socket.reset();
    api.on('GET /api/market/holidays', { holidays: [] });
    // Only the clock is faked: flushPromises runs on the real setTimeout.
    // After the bell by default, so the live feed is off unless a test opens it
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(CLOSED);
});

afterEach(() => {
    vi.useRealTimers();
});

// The rows live at module scope, so a panel left mounted re-subscribes when
// the next test loads its own
enableAutoUnmount(afterEach);

describe('WatchlistPanel live prices', () => {
    beforeEach(() => {
        vi.setSystemTime(OPEN);
        api.on('GET /api/watchlists', { items: [summary('Tech', 2)] });
        api.on('GET /api/watchlists/Tech', {
            name: 'Tech',
            rows: [row('AAPL', { close: 200, changePercent: 1 }), row('MSFT', { close: 400, changePercent: -1 })],
        });
    });

    it('subscribes to every listed symbol while the market is open', async () => {
        await panel();

        expect(socket.emitted).toEqual([{ event: 'quote:watch', payload: { symbols: ['AAPL', 'MSFT'] } }]);
    });

    it('shows the live price, and the change the server measured', async () => {
        const wrapper = await panel();

        socket.deliver('quote:update', { quotes: { AAPL: { price: 210, changePercent: 5 } } });
        await flushPromises();

        expect(wrapper.findAll('.watchlist__price').map((node) => node.text())).toEqual([
            formatNumber(210, 2),
            formatNumber(400, 2),
        ]);
        expect(wrapper.findAll('.watchlist__change').map((node) => node.text())).toEqual([
            formatPercent(5),
            formatPercent(-1),
        ]);
    });

    it('shows a live price with no change when the server had nothing to measure it against', async () => {
        api.on('GET /api/watchlists/Tech', { name: 'Tech', rows: [row('NEW')] });
        const wrapper = await panel();

        socket.deliver('quote:update', { quotes: { NEW: { price: 12.5, changePercent: null } } });
        await flushPromises();

        expect(wrapper.get('.watchlist__price').text()).toBe(formatNumber(12.5, 2));
        expect(wrapper.get('.watchlist__change').text()).toBe('');
    });

    it('shows the stored close, and subscribes to nothing, while the market is shut', async () => {
        vi.setSystemTime(CLOSED);
        const wrapper = await panel();

        expect(socket.emitted).toEqual([]);
        expect(wrapper.get('.watchlist__price').text()).toBe(formatNumber(200, 2));
    });

    it('keeps the last live quote after the bell rather than falling back to the rows read before it', async () => {
        const wrapper = await panel();
        socket.deliver('quote:update', { quotes: { AAPL: { price: 210, changePercent: 5 } } });
        await flushPromises();

        vi.setSystemTime(CLOSED);
        vi.advanceTimersByTime(CLOCK_TICK_MS);
        await flushPromises();

        expect(wrapper.get('.watchlist__price').text()).toBe(formatNumber(210, 2));
        expect(wrapper.get('.watchlist__change').text()).toBe(formatPercent(5));
    });

    it('re-reads the rows when the session opens, so the change is measured from the newest close', async () => {
        vi.setSystemTime(new Date('2026-03-06T14:29:45Z')); // 09:29:45 New York
        await panel();
        const reads = (): number => api.calls.filter((call) => call.path === '/api/watchlists/Tech').length;
        expect(reads()).toBe(1);

        vi.advanceTimersByTime(CLOCK_TICK_MS);
        await flushPromises();

        expect(reads()).toBe(2);
        expect(socket.emitted).toEqual([{ event: 'quote:watch', payload: { symbols: ['AAPL', 'MSFT'] } }]);
    });
});

describe('WatchlistPanel', () => {
    it('reads the lists when it opens and shows the rows of the first one', async () => {
        seed();

        const wrapper = await panel();

        expect(wrapper.findAll('option').map((node) => node.text())).toEqual(['Tech (2)', 'Energy (0)']);
        expect(wrapper.findAll('.watchlist__ticker').map((node) => node.text())).toEqual(['AAPL', 'MSFT']);
    });

    it('says there are no watchlists rather than showing an empty picker', async () => {
        api.on('GET /api/watchlists', { items: [] });

        const wrapper = await panel();

        expect(wrapper.get('.watchlist__message').text()).toBe(i18n.global.t('watchlist.noWatchlists'));
        expect(wrapper.get('select').attributes('disabled')).toBeDefined();
    });

    it('says a list is empty rather than showing an empty table', async () => {
        seed([]);

        const wrapper = await panel();

        expect(wrapper.get('.watchlist__message').text()).toBe(i18n.global.t('watchlist.noSymbols'));
    });

    it('opens the list that was picked', async () => {
        seed();
        const wrapper = await panel();

        await wrapper.get('select').setValue('Energy');
        await flushPromises();

        expect(api.calls.some((call) => call.path === '/api/watchlists/Energy')).toBe(true);
    });

    it('shows a price and a change, and a dash for a symbol with no bar yet', async () => {
        api.on('GET /api/watchlists', { items: [summary('Tech', 2)] });
        api.on('GET /api/watchlists/Tech', {
            name: 'Tech',
            rows: [row('AAPL', { close: 190.12, changePercent: 0.0234 }), row('MSFT')],
        });

        const wrapper = await panel();

        expect(wrapper.findAll('.watchlist__price').map((node) => node.text())).toEqual([formatNumber(190.12, 2), '—']);
        expect(wrapper.get('.watchlist__change').text()).toBe(formatPercent(0.0234));
    });

    it('colours a rise and a fall apart, and neither for a flat day', async () => {
        api.on('GET /api/watchlists', { items: [summary('Tech', 3)] });
        api.on('GET /api/watchlists/Tech', {
            name: 'Tech',
            rows: [
                row('UP', { close: 1, changePercent: 0.01 }),
                row('DOWN', { close: 1, changePercent: -0.01 }),
                row('FLAT', { close: 1, changePercent: 0 }),
            ],
        });

        const wrapper = await panel();
        const changes = wrapper.findAll('.watchlist__change');

        expect(changes[0]?.classes()).toContain('watchlist__change--up');
        expect(changes[1]?.classes()).toContain('watchlist__change--down');
        expect(changes[2]?.classes()).toEqual(['watchlist__change']);
    });

    it('marks the symbol the chart is on', async () => {
        seed();

        const wrapper = await panel({ symbol: 'MSFT' });

        expect(wrapper.findAll('.watchlist__row')[1]?.classes()).toContain('watchlist__row--active');
    });

    it('puts the symbol that was clicked on the chart', async () => {
        seed();
        const wrapper = await panel();

        await wrapper.findAll('.watchlist__symbol')[1]?.trigger('click');

        expect(wrapper.emitted('select')?.[0]).toEqual(['MSFT']);
    });

    it('adds a symbol upper-cased, whatever was typed', async () => {
        seed();
        api.on('POST /api/watchlists/Tech/tickers', {
            list: [
                { ticker: 'AAPL', exchange: 'NASDAQ' },
                { ticker: 'NVDA', exchange: 'NASDAQ' },
            ],
        });
        const wrapper = await panel();

        await wrapper.get('.watchlist__add-input').setValue(' nvda ');
        await wrapper.get('.watchlist__add').trigger('submit');
        await flushPromises();

        const added = api.calls.find((call) => call.method === 'POST');
        expect(added?.body).toEqual({ symbol: 'NVDA' });
        expect(elementOf(wrapper.get('.watchlist__add-input').element, HTMLInputElement).value).toBe('');
    });

    it('keeps the draft and explains a refused add', async () => {
        seed();
        api.on('POST /api/watchlists/Tech/tickers', { error: 'WATCHLIST_TICKER_EXISTS' }, { status: 409 });
        const wrapper = await panel();

        await wrapper.get('.watchlist__add-input').setValue('NOPE');
        await wrapper.get('.watchlist__add').trigger('submit');
        await flushPromises();

        expect(wrapper.get('[role="alert"]').text()).toBe(i18n.global.t('errors.WATCHLIST_TICKER_EXISTS'));
        expect(elementOf(wrapper.get('.watchlist__add-input').element, HTMLInputElement).value).toBe('NOPE');
    });

    it('removes a symbol from the list', async () => {
        seed();
        api.on('DELETE /api/watchlists/Tech/tickers/MSFT', { list: [{ ticker: 'AAPL', exchange: 'NASDAQ' }] });
        const wrapper = await panel();

        await icon(wrapper, 1, i18n.global.t('watchlist.removeSymbol', { symbol: 'MSFT' })).trigger('click');
        await flushPromises();

        expect(wrapper.findAll('.watchlist__ticker').map((node) => node.text())).toEqual(['AAPL']);
    });

    it('reorders the list, sending the whole new order', async () => {
        seed();
        api.on('PUT /api/watchlists/Tech/tickers', {
            list: [
                { ticker: 'MSFT', exchange: 'NASDAQ' },
                { ticker: 'AAPL', exchange: 'NASDAQ' },
            ],
        });
        const wrapper = await panel();

        await icon(wrapper, 1, i18n.global.t('watchlist.moveUp', { symbol: 'MSFT' })).trigger('click');
        await flushPromises();

        expect(api.calls.find((call) => call.method === 'PUT')?.body).toEqual({ symbols: ['MSFT', 'AAPL'] });
    });

    it('will not move a row off either end of the list', async () => {
        seed();
        const wrapper = await panel();

        expect(
            icon(wrapper, 0, i18n.global.t('watchlist.moveUp', { symbol: 'AAPL' })).attributes('disabled'),
        ).toBeDefined();
        expect(
            icon(wrapper, 1, i18n.global.t('watchlist.moveDown', { symbol: 'MSFT' })).attributes('disabled'),
        ).toBeDefined();
    });

    it('creates a list from the prompt', async () => {
        seed();
        api.on('POST /api/watchlists', summary('Growth'));
        api.on('GET /api/watchlists/Growth', { name: 'Growth', rows: [] });
        const wrapper = await panel();

        await wrapper.findAll('.watchlist__tools button')[0]?.trigger('click');
        const input = query('.dialog input', HTMLInputElement);
        input.value = 'Growth';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        $('.prompt__submit').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await flushPromises();

        expect(api.calls.find((call) => call.method === 'POST')?.body).toEqual({ name: 'Growth' });
        expect(document.body.querySelector('.dialog')).toBeNull();
        wrapper.unmount();
    });

    it('keeps the prompt open when the name is refused', async () => {
        seed();
        api.on('POST /api/watchlists', { error: 'WATCHLIST_NAME_TAKEN' }, { status: 409 });
        const wrapper = await panel();

        await wrapper.findAll('.watchlist__tools button')[0]?.trigger('click');
        const input = query('.dialog input', HTMLInputElement);
        input.value = 'Tech';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        $('.prompt__submit').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await flushPromises();

        expect(document.body.querySelector('.dialog')).not.toBeNull();
        wrapper.unmount();
    });

    it('renames the list that is open, starting from its current name', async () => {
        seed();
        api.on('PATCH /api/watchlists/Tech', summary('Renamed', 2));
        api.on('GET /api/watchlists/Renamed', { name: 'Renamed', rows: [row('AAPL')] });
        const wrapper = await panel();

        await wrapper.findAll('.watchlist__tools button')[1]?.trigger('click');
        expect(query('.dialog input', HTMLInputElement).value).toBe('Tech');

        const input = query('.dialog input', HTMLInputElement);
        input.value = 'Renamed';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        $('.prompt__submit').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await flushPromises();

        expect(api.calls.find((call) => call.method === 'PATCH')?.body).toEqual({ name: 'Renamed' });
        wrapper.unmount();
    });

    it('asks before deleting a list, naming it', async () => {
        seed();
        const wrapper = await panel();

        await wrapper.findAll('.watchlist__tools button')[2]?.trigger('click');

        expect($('.watchlist__confirm').textContent).toBe(
            i18n.global.t('watchlist.confirmDeleteBody', { name: 'Tech' }),
        );
        wrapper.unmount();
    });

    it('imports the symbols a file holds, upper-cased and de-duplicated', async () => {
        seed([]);
        api.on('POST /api/watchlists/Tech/tickers', { list: [] });
        const wrapper = await panel();

        await chooseFile(wrapper, 'aapl, msft\nnvda\naapl');

        expect(api.calls.filter((call) => call.method === 'POST').map((call) => call.body)).toEqual([
            { symbol: 'AAPL' },
            { symbol: 'MSFT' },
            { symbol: 'NVDA' },
        ]);
        expect(wrapper.get('[role="status"]').text()).toBe(
            i18n.global.t('watchlist.imported', { added: 3, skipped: 0 }),
        );
    });

    it('counts the symbols the API refused rather than failing the whole import', async () => {
        seed([]);
        // Registered last wins, so the one-shot refusal answers the first symbol
        api.on('POST /api/watchlists/Tech/tickers', { list: [] });
        api.on('POST /api/watchlists/Tech/tickers', { error: 'WATCHLIST_TICKER_EXISTS' }, { status: 409, once: true });
        const wrapper = await panel();

        await chooseFile(wrapper, 'aapl\nmsft');

        expect(wrapper.get('[role="status"]').text()).toBe(
            i18n.global.t('watchlist.imported', { added: 1, skipped: 1 }),
        );
    });

    it('refuses a file with no symbols in it', async () => {
        seed([]);
        const wrapper = await panel();

        await chooseFile(wrapper, '   \n  ');

        expect(api.calls.some((call) => call.method === 'POST')).toBe(false);
        expect(wrapper.get('[role="alert"]').text()).toBe(i18n.global.t('watchlist.noSymbolsInFile'));
    });

    it('refuses a file past the ceiling the API enforces, before any write', async () => {
        seed([]);
        const wrapper = await panel();

        await chooseFile(
            wrapper,
            Array.from({ length: LIMITS.tickersPerWatchlist + 1 }, (_, index) => `SYM${index}`).join('\n'),
        );

        expect(api.calls.some((call) => call.method === 'POST')).toBe(false);
        expect(wrapper.get('[role="alert"]').text()).toBe(
            i18n.global.t('watchlist.tooManySymbols', { max: LIMITS.tickersPerWatchlist }),
        );
    });

    it('exports the open list as one symbol per line', async () => {
        seed();
        const anchor = document.createElement('a');
        const clicked = vi.spyOn(anchor, 'click').mockImplementation(() => {});
        vi.spyOn(document, 'createElement').mockImplementation((tag: string) =>
            tag === 'a' ? anchor : document.createElementNS('http://www.w3.org/1999/xhtml', tag),
        );
        URL.createObjectURL = vi.fn(() => 'blob:list');
        URL.revokeObjectURL = vi.fn();
        const wrapper = await panel();

        await wrapper.findAll('.watchlist__tools button')[4]?.trigger('click');

        expect(clicked).toHaveBeenCalled();
        expect(anchor.download).toBe('Tech.txt');
        vi.restoreAllMocks();
    });

    it('offers no export for a list with nothing in it', async () => {
        seed([]);
        const wrapper = await panel();

        expect(wrapper.findAll('.watchlist__tools button')[4]?.attributes('disabled')).toBeDefined();
    });

    // The screener's results table has had this since it was written; the
    // watchlist beside the chart is the other list a symbol is picked from.
    it('walks the list with the arrow keys', async () => {
        seed(['AAPL', 'MSFT', 'NVDA']);
        const wrapper = await panel({ symbol: 'AAPL' });

        await wrapper.findAll('.watchlist__symbol')[0]?.trigger('keydown', { key: 'ArrowDown' });

        expect(wrapper.emitted('select')?.at(-1)).toEqual(['MSFT']);
    });

    it('stops at the ends rather than wrapping round', async () => {
        seed(['AAPL', 'MSFT']);
        const wrapper = await panel({ symbol: 'AAPL' });

        await wrapper.findAll('.watchlist__symbol')[0]?.trigger('keydown', { key: 'ArrowUp' });

        expect(wrapper.emitted('select')).toBeUndefined();
    });

    it('moves focus with the selection, so the next row scrolls into view', async () => {
        seed(['AAPL', 'MSFT']);
        const wrapper = await panel({ symbol: 'AAPL' });

        await wrapper.findAll('.watchlist__symbol')[0]?.trigger('keydown', { key: 'ArrowDown' });

        expect(document.activeElement).toBe(wrapper.findAll('.watchlist__symbol')[1]?.element);
        wrapper.unmount();
    });

    // A row both lists hold is kept across the switch, so it no longer sits
    // where the screen puts it among the rows mounted around it
    it('focuses the row it selected after switching away and back', async () => {
        seed(['AAPL', 'MSFT', 'NVDA']);
        api.on('GET /api/watchlists/Energy', { name: 'Energy', rows: [row('NVDA')] });
        const wrapper = await panel({ symbol: 'AAPL' });
        await wrapper.get('select').setValue('Energy');
        await flushPromises();
        await wrapper.get('select').setValue('Tech');
        await flushPromises();

        await wrapper.findAll('.watchlist__symbol')[0]?.trigger('keydown', { key: 'ArrowDown' });

        expect(wrapper.emitted('select')?.at(-1)).toEqual(['MSFT']);
        expect(document.activeElement?.textContent).toContain('MSFT');
    });

    it('moves from the row the key was pressed on when the chart is on a symbol from another list', async () => {
        seed(['AAPL', 'MSFT', 'NVDA']);
        const wrapper = await panel({ symbol: 'XOM' });

        await wrapper.findAll('.watchlist__symbol')[1]?.trigger('keydown', { key: 'ArrowDown' });

        expect(wrapper.emitted('select')?.at(-1)).toEqual(['NVDA']);
        expect(document.activeElement?.textContent).toContain('NVDA');
    });

    it('reports a failed read rather than an empty panel', async () => {
        api.on('GET /api/watchlists', { error: 'INTERNAL' }, { status: 500 });

        const wrapper = await panel();

        expect(wrapper.get('[role="alert"]').text()).toBe(i18n.global.t('errors.INTERNAL'));
    });
});
