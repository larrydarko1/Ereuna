import { beforeEach, describe, expect, it } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { PANEL_SECTIONS } from '@ereuna/shared';
import type { AssetProfile, ChartEvents } from '@/api/chart';
import { clearAuth } from '@/api/client';
import { i18n } from '@/i18n';
import { mockApi } from '@/__tests__/support/msw';
import { loadPreferences } from '@/composables/data/usePreferences';
import ChartSidebar from '@/components/charts/ChartSidebar.vue';

const api = mockApi();

const preferences = (panels: Record<string, unknown> | null): Record<string, unknown> => ({
    language: 'en',
    theme: null,
    defaultSymbol: 'AAPL',
    hiddenSymbols: [],
    chartSettings: null,
    panels,
    screenerColumns: [],
});

const action = (date: string, amount: number): Record<string, unknown> => ({ date, amount, ratio: amount });

const events = (count: number): ChartEvents =>
    ({
        dividends: Array.from({ length: count }, (_, index) => action(`2026-0${(index % 9) + 1}-01`, index + 1)),
        splits: Array.from({ length: count }, (_, index) => action(`2025-0${(index % 9) + 1}-01`, index + 2)),
    }) as unknown as ChartEvents;

const profile = { symbol: 'AAPL', name: 'Apple Inc' } as AssetProfile;

const sidebar = async (props: Record<string, unknown> = {}): Promise<VueWrapper> => {
    const wrapper = mount(ChartSidebar, { props: { symbol: 'AAPL', ...props }, attachTo: document.body });
    await flushPromises();
    return wrapper;
};

const titles = (wrapper: VueWrapper): string[] => wrapper.findAll('.panel__title').map((node) => node.text());

beforeEach(async () => {
    clearAuth();
    document.body.innerHTML = '';
    api.on('GET /api/preferences', preferences(null));
    api.on('GET /api/market/AAPL/financials', { symbol: 'AAPL', annual: [], quarterly: [] });
    api.on('GET /api/notes', { items: [], total: 0, page: 1, pages: 1 });
    await loadPreferences();
});

describe('ChartSidebar', () => {
    it('shows every section in the default layout', async () => {
        const wrapper = await sidebar();

        expect(titles(wrapper)).toEqual(PANEL_SECTIONS.map((section) => i18n.global.t(`sidebar.sections.${section}`)));
    });

    it('shows only the sections the saved layout keeps, in its order', async () => {
        api.on('GET /api/preferences', preferences({ sections: ['notes', 'summary'], summaryFields: ['symbol'] }));
        await loadPreferences(true);

        const wrapper = await sidebar();

        expect(titles(wrapper)).toEqual([
            i18n.global.t('sidebar.sections.notes'),
            i18n.global.t('sidebar.sections.summary'),
        ]);
    });

    it('reads the filings for the symbol on the chart', async () => {
        await sidebar();

        expect(api.calls.some((call) => call.path === '/api/market/AAPL/financials')).toBe(true);
    });

    it('reads no filings until there is a symbol', async () => {
        await sidebar({ symbol: '' });

        expect(api.calls.some((call) => call.path.includes('financials'))).toBe(false);
    });

    it('shows the four most recent actions of each kind', async () => {
        const wrapper = await sidebar({ events: events(9) });

        expect(wrapper.findAll('.actions tbody tr')).toHaveLength(8);
    });

    it('expands one table without expanding the other', async () => {
        const wrapper = await sidebar({ events: events(9) });

        await wrapper.findAll('.actions__more')[0]?.trigger('click');

        // Dividends opened to nine; splits is still showing its four.
        expect(wrapper.findAll('.actions tbody tr')).toHaveLength(13);
    });

    it('goes back to the four most recent for the next instrument', async () => {
        const wrapper = await sidebar({ events: events(9) });
        await wrapper.findAll('.actions__more')[0]?.trigger('click');

        // A new symbol arrives as a new history, which is what collapses the
        // table — not the count, which the next instrument may well match.
        await wrapper.setProps({ symbol: 'MSFT', events: events(9) });
        await flushPromises();

        expect(wrapper.findAll('.actions tbody tr')).toHaveLength(8);
    });

    it('offers nothing to expand when the whole history already fits', async () => {
        const wrapper = await sidebar({ events: events(0) });

        expect(wrapper.find('.actions__more').exists()).toBe(false);
    });

    it('fills the summary from the profile it was given', async () => {
        const wrapper = await sidebar({ profile });

        expect(wrapper.find('.summary').text()).toContain('Apple Inc');
    });

    it('opens the statements on demand, and closes them again', async () => {
        const wrapper = await sidebar();

        await wrapper.get('.sidebar__financials').trigger('click');
        expect(document.body.querySelector('.dialog')).not.toBeNull();

        document.body.querySelector('.dialog__close')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await flushPromises();

        expect(document.body.querySelector('.dialog')).toBeNull();
        wrapper.unmount();
    });

    it('gives each earnings panel the quarterly filings', async () => {
        api.on('GET /api/market/AAPL/financials', {
            symbol: 'AAPL',
            annual: [],
            quarterly: [{ fiscalDateEnding: '2026-03-31', reportedEPS: 1.5, netIncome: 1, totalRevenue: 2 }],
        });

        const wrapper = await sidebar();

        expect(wrapper.findAll('.financials tbody tr').length).toBeGreaterThan(0);
    });
});
