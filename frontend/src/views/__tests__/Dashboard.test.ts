import { beforeEach, describe, expect, it } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { i18n } from '@/i18n';
import { mockApi } from '@/__tests__/support/msw';
import { overview } from '@/__tests__/support/overview';
import { toDateInput } from '@/utils/formatters';
import Dashboard from '@/views/Dashboard.vue';

const api = mockApi();

const view = async (): Promise<VueWrapper> => {
    const wrapper = mount(Dashboard);
    await flushPromises();
    return wrapper;
};

beforeEach(() => {
    api.on('GET /api/market/calendar', { date: toDateInput(new Date()), earnings: [], dividends: [], splits: [] });
    api.on('GET /api/market/news', { items: [] });
});

describe('Dashboard', () => {
    it('reads the whole summary in one request', async () => {
        api.on('GET /api/market/stats', overview());

        await view();

        expect(api.calls.filter((call) => call.path === '/api/market/stats')).toHaveLength(1);
    });

    it('shows the clock before the summary has landed, but no panels', () => {
        api.on('GET /api/market/stats', overview());
        const wrapper = mount(Dashboard);

        expect(wrapper.find('.clock').exists()).toBe(true);
        expect(wrapper.findAll('.dashboard__grid')).toHaveLength(0);
        expect(wrapper.get('.dashboard__note').text()).toBe(i18n.global.t('dashboard.loading'));
    });

    it('fills every panel from the one document', async () => {
        api.on('GET /api/market/stats', overview());

        const wrapper = await view();

        expect(wrapper.find('.index-table').exists()).toBe(true);
        expect(wrapper.find('.ma-breadth').exists()).toBe(true);
        expect(wrapper.find('.movers').exists()).toBe(true);
        expect(wrapper.find('.outlook').exists()).toBe(true);
        expect(wrapper.find('.breadth').exists()).toBe(true);
    });

    it('ranks sectors and industries side by side, in a row of their own', async () => {
        api.on('GET /api/market/stats', overview());

        const wrapper = await view();

        expect(wrapper.findAll('.tier')).toHaveLength(2);
        expect(wrapper.findAll('.dashboard__grid--pair .tier')).toHaveLength(2);
    });

    it('dates the summary by when the ingestor last wrote it', async () => {
        api.on('GET /api/market/stats', overview());

        const wrapper = await view();

        expect(wrapper.get('.clock__ingest').text()).not.toContain(i18n.global.t('dashboard.never'));
    });

    it('reports a failed read in place of the panels', async () => {
        api.on('GET /api/market/stats', { error: 'INTERNAL' }, { status: 500 });

        const wrapper = await view();

        expect(wrapper.get('[role="alert"]').text()).toBe(i18n.global.t('errors.INTERNAL'));
        expect(wrapper.find('.dashboard__grid').exists()).toBe(false);
    });

    it('reads the summary once and asks for nothing else', async () => {
        api.on('GET /api/market/stats', overview());

        await view();

        expect(api.calls.map((call) => call.path)).toEqual(['/api/market/stats']);
    });
});
