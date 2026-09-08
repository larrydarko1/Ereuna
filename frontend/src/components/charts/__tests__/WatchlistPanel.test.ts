import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { clearAuth } from '@/api/client';
import { i18n } from '@/i18n';
import { mockApi } from '@/__tests__/support/msw';
import { formatNumber, formatPercent } from '@/utils/formatters';
import WatchlistPanel from '@/components/charts/WatchlistPanel.vue';

const api = mockApi();

const summary = (name: string, tickerCount = 0): Record<string, unknown> => ({
    id: name,
    name,
    position: 0,
    tickerCount,
    updatedAt: '2026-03-02T00:00:00.000Z',
});

const row = (ticker: string, quote: Record<string, unknown> | null = null): Record<string, unknown> => ({
    ticker,
    quote,
});

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

beforeEach(() => {
    // The lists live at module scope so the strip and the panel agree; ending
    // the session is how the app itself resets them.
    clearAuth();
    localStorage.clear();
    document.body.innerHTML = '';
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
        api.on('POST /api/watchlists/Tech/tickers', { list: [{ ticker: 'AAPL' }, { ticker: 'NVDA' }] });
        const wrapper = await panel();

        await wrapper.get('.watchlist__add-input').setValue(' nvda ');
        await wrapper.get('.watchlist__add').trigger('submit');
        await flushPromises();

        const added = api.calls.find((call) => call.method === 'POST');
        expect(added?.body).toEqual({ symbol: 'NVDA' });
        expect((wrapper.get('.watchlist__add-input').element as HTMLInputElement).value).toBe('');
    });

    it('keeps the draft and explains a refused add', async () => {
        seed();
        api.on('POST /api/watchlists/Tech/tickers', { error: 'WATCHLIST_TICKER_EXISTS' }, { status: 409 });
        const wrapper = await panel();

        await wrapper.get('.watchlist__add-input').setValue('NOPE');
        await wrapper.get('.watchlist__add').trigger('submit');
        await flushPromises();

        expect(wrapper.get('[role="alert"]').text()).toBe(i18n.global.t('errors.WATCHLIST_TICKER_EXISTS'));
        expect((wrapper.get('.watchlist__add-input').element as HTMLInputElement).value).toBe('NOPE');
    });

    it('removes a symbol from the list', async () => {
        seed();
        api.on('DELETE /api/watchlists/Tech/tickers/MSFT', { list: [{ ticker: 'AAPL' }] });
        const wrapper = await panel();

        await icon(wrapper, 1, i18n.global.t('watchlist.removeSymbol', { symbol: 'MSFT' })).trigger('click');
        await flushPromises();

        expect(wrapper.findAll('.watchlist__ticker').map((node) => node.text())).toEqual(['AAPL']);
    });

    it('reorders the list, sending the whole new order', async () => {
        seed();
        api.on('PUT /api/watchlists/Tech/tickers', { list: [{ ticker: 'MSFT' }, { ticker: 'AAPL' }] });
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
        const input = $('.dialog input') as HTMLInputElement;
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
        const input = $('.dialog input') as HTMLInputElement;
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
        expect(($('.dialog input') as HTMLInputElement).value).toBe('Tech');

        const input = $('.dialog input') as HTMLInputElement;
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

        await chooseFile(wrapper, Array.from({ length: 101 }, (_, index) => `SYM${index}`).join('\n'));

        expect(api.calls.some((call) => call.method === 'POST')).toBe(false);
        expect(wrapper.get('[role="alert"]').text()).toBe(i18n.global.t('watchlist.tooManySymbols', { max: 100 }));
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

    it('reports a failed read rather than an empty panel', async () => {
        api.on('GET /api/watchlists', { error: 'INTERNAL' }, { status: 500 });

        const wrapper = await panel();

        expect(wrapper.get('[role="alert"]').text()).toBe(i18n.global.t('errors.INTERNAL'));
    });
});

/** A file input cannot be assigned, so the change event carries the file itself. */
async function chooseFile(wrapper: VueWrapper, contents: string): Promise<void> {
    const input = wrapper.get('.watchlist__file').element as HTMLInputElement;
    const file = new File([contents], 'list.txt', { type: 'text/plain' });
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await flushPromises();
}
