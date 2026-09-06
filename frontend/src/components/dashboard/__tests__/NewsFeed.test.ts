import { describe, expect, it } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import type { NewsRow } from '@/api/market';
import { i18n } from '@/i18n';
import { mockApi } from '@/__tests__/support/msw';
import NewsFeed from '@/components/dashboard/NewsFeed.vue';

const api = mockApi();

const headline = (over: Partial<NewsRow> = {}): NewsRow => ({
    title: 'Rates hold steady',
    url: 'https://news.example.com/rates',
    source: 'Example Wire',
    summary: null,
    imageUrl: null,
    tickers: ['SPY', 'QQQ'],
    publishedDate: new Date().toISOString(),
    ...over,
});

const feed = async (items: NewsRow[], props: Record<string, unknown> = {}): Promise<VueWrapper> => {
    api.on('GET /api/market/news', { items });
    const wrapper = mount(NewsFeed, { props });
    await flushPromises();
    return wrapper;
};

describe('NewsFeed', () => {
    it('shows a loading note before the feed lands', () => {
        api.on('GET /api/market/news', { items: [] });

        expect(mount(NewsFeed).get('.news__note').text()).toBe(i18n.global.t('dashboard.loading'));
    });

    it('lists one item per headline', async () => {
        const wrapper = await feed([headline(), headline({ url: 'https://news.example.com/jobs' })]);

        expect(wrapper.findAll('.news__item')).toHaveLength(2);
    });

    it('opens a headline in a new tab without leaking the referrer', async () => {
        const link = (await feed([headline()])).get('.news__link');

        expect(link.attributes('href')).toBe('https://news.example.com/rates');
        expect(link.attributes('target')).toBe('_blank');
        expect(link.attributes('rel')).toBe('noopener noreferrer');
    });

    it('drops a headline whose link is not a web address', async () => {
        const wrapper = await feed([headline({ url: 'javascript:alert(1)' }), headline()]);

        expect(wrapper.findAll('.news__item')).toHaveLength(1);
    });

    it('shows at most four tickers, so one story cannot fill the row', async () => {
        const wrapper = await feed([headline({ tickers: ['A', 'B', 'C', 'D', 'E'] })]);

        expect(wrapper.get('.news__tickers').text()).toBe('A · B · C · D');
    });

    it('leaves the ticker row out when a story names none', async () => {
        expect((await feed([headline({ tickers: [] })])).find('.news__tickers').exists()).toBe(false);
    });

    it('leaves the source out when the vendor did not give one', async () => {
        const meta = (await feed([headline({ source: null, tickers: [] })])).get('.news__meta');

        expect(meta.findAll('span')).toHaveLength(0);
    });

    it('dates each headline in a machine-readable form as well', async () => {
        const published = '2026-03-04T15:30:45.000Z';

        expect((await feed([headline({ publishedDate: published })])).get('time').attributes('datetime')).toBe(
            published,
        );
    });

    it('says there is no data rather than drawing an empty list', async () => {
        expect((await feed([])).get('.news__note').text()).toBe(i18n.global.t('dashboard.noData'));
    });

    it('asks for as many headlines as it was told to show', async () => {
        await feed([], { limit: 3 });

        expect(api.last().search.get('limit')).toBe('3');
    });

    it('reports a failed read in place of the list', async () => {
        api.on('GET /api/market/news', { error: 'INTERNAL' }, { status: 500 });
        const wrapper = mount(NewsFeed);
        await flushPromises();

        expect(wrapper.get('[role="alert"]').text()).toBe(i18n.global.t('errors.INTERNAL'));
    });
});
