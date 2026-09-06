import { describe, expect, it } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import type { NewsRow } from '@/api/market';
import { i18n } from '@/i18n';
import { mockApi } from '@/__tests__/support/msw';
import NewsPanel from '@/components/charts/NewsPanel.vue';

const api = mockApi();

const headline = (over: Partial<NewsRow> = {}): NewsRow => ({
    title: 'Apple beats estimates',
    url: 'https://news.example.com/apple',
    source: 'Example Wire',
    summary: null,
    imageUrl: null,
    tickers: ['AAPL'],
    publishedDate: new Date().toISOString(),
    ...over,
});

const panel = async (items: NewsRow[], props: Record<string, unknown> = {}): Promise<VueWrapper> => {
    api.on('GET /api/market/news', { items });
    const wrapper = mount(NewsPanel, { props: { symbol: 'AAPL', ...props } });
    await flushPromises();
    return wrapper;
};

describe('NewsPanel', () => {
    it('asks for this symbol alone', async () => {
        await panel([]);

        expect(api.last().search.getAll('symbols[]')).toEqual(['AAPL']);
        expect(api.last().search.get('limit')).toBe('6');
    });

    it('asks for as many headlines as it was told to show', async () => {
        await panel([], { limit: 3 });

        expect(api.last().search.get('limit')).toBe('3');
    });

    it('reads nothing at all until there is a symbol on the chart', async () => {
        const wrapper = await panel([], { symbol: '' });

        expect(api.calls).toHaveLength(0);
        expect(wrapper.get('.news__note').text()).toBe(i18n.global.t('sidebar.noNewsAvailable'));
    });

    it('lists one item per headline', async () => {
        expect(
            (await panel([headline(), headline({ url: 'https://news.example.com/b' })])).findAll('.news__item'),
        ).toHaveLength(2);
    });

    it('drops a headline whose link is not a web address', async () => {
        expect((await panel([headline({ url: 'javascript:alert(1)' })])).findAll('.news__item')).toHaveLength(0);
    });

    it('opens a headline in a new tab without leaking the referrer', async () => {
        const link = (await panel([headline()])).get('.news__link');

        expect(link.attributes('target')).toBe('_blank');
        expect(link.attributes('rel')).toBe('noopener noreferrer');
    });

    it('leaves the source out when the vendor did not give one', async () => {
        expect((await panel([headline({ source: null })])).get('.news__meta').findAll('span')).toHaveLength(0);
    });

    it('says there is no news rather than drawing an empty list', async () => {
        expect((await panel([])).get('.news__note').text()).toBe(i18n.global.t('sidebar.noNewsAvailable'));
    });

    it('reports a failed read in place of the list', async () => {
        api.on('GET /api/market/news', { error: 'INTERNAL' }, { status: 500 });
        const wrapper = mount(NewsPanel, { props: { symbol: 'AAPL' } });
        await flushPromises();

        expect(wrapper.get('.news__note').text()).toBe(i18n.global.t('errors.INTERNAL'));
    });

    it('reloads for the symbol the chart moved to', async () => {
        const wrapper = await panel([headline()]);

        await wrapper.setProps({ symbol: 'MSFT' });
        await flushPromises();

        expect(api.last().search.getAll('symbols[]')).toEqual(['MSFT']);
    });
});
