import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import type { AssetSummary } from '@/api/chart';
import { i18n } from '@/i18n';
import { mockApi } from '@/__tests__/support/msw';
import SymbolSearch from '@/components/charts/SymbolSearch.vue';

const api = mockApi();

const asset = (symbol: string, over: Partial<AssetSummary> = {}): AssetSummary =>
    ({ symbol, name: `${symbol} Inc`, exchange: 'NASDAQ', ...over }) as AssetSummary;

const search = (): VueWrapper => mount(SymbolSearch, { attachTo: document.body });

/** The box debounces, so a search only leaves once the timer has run. */
const type = async (wrapper: VueWrapper, value: string): Promise<void> => {
    await wrapper.get('input').setValue(value);
    await vi.advanceTimersByTimeAsync(250);
    await flushPromises();
};

const options = (wrapper: VueWrapper): string[] => wrapper.findAll('.symbol-search__ticker').map((node) => node.text());

describe('SymbolSearch', () => {
    it('is a combobox that says whether its list is open', () => {
        const wrapper = search();

        expect(wrapper.get('input').attributes('role')).toBe('combobox');
        expect(wrapper.get('input').attributes('aria-expanded')).toBe('false');
    });

    it('searches for what was typed and lists the matches', async () => {
        vi.useFakeTimers();
        api.on('GET /api/charts/search', { items: [asset('AAPL'), asset('AAPU')] });
        const wrapper = search();

        await type(wrapper, 'aap');

        expect(api.last().search.get('q')).toBe('aap');
        expect(options(wrapper)).toEqual(['AAPL', 'AAPU']);
        vi.useRealTimers();
    });

    it('waits for the typing to stop rather than searching per keystroke', async () => {
        vi.useFakeTimers();
        api.on('GET /api/charts/search', { items: [] });
        const wrapper = search();

        await wrapper.get('input').setValue('a');
        await wrapper.get('input').setValue('aa');
        await vi.advanceTimersByTimeAsync(250);
        await flushPromises();

        expect(api.calls).toHaveLength(1);
        expect(api.last().search.get('q')).toBe('aa');
        vi.useRealTimers();
    });

    it('searches for nothing at all when the box is emptied', async () => {
        vi.useFakeTimers();
        api.on('GET /api/charts/search', { items: [asset('AAPL')] });
        const wrapper = search();
        await type(wrapper, 'aapl');

        await type(wrapper, '   ');

        expect(options(wrapper)).toEqual([]);
        expect(api.calls).toHaveLength(1);
        vi.useRealTimers();
    });

    it('says so when nothing matched', async () => {
        vi.useFakeTimers();
        api.on('GET /api/charts/search', { items: [] });
        const wrapper = search();

        await type(wrapper, 'zzzz');

        expect(wrapper.get('.symbol-search__message').text()).toBe(i18n.global.t('search.noResults'));
        vi.useRealTimers();
    });

    it('reports a failed search in place of the list', async () => {
        vi.useFakeTimers();
        api.on('GET /api/charts/search', { error: 'INTERNAL' }, { status: 500 });
        const wrapper = search();

        await type(wrapper, 'aapl');

        expect(wrapper.get('[role="alert"]').text()).toBe(i18n.global.t('errors.INTERNAL'));
        vi.useRealTimers();
    });

    it('highlights the first match, so Enter picks the obvious one', async () => {
        vi.useFakeTimers();
        api.on('GET /api/charts/search', { items: [asset('AAPL'), asset('MSFT')] });
        const wrapper = search();
        await type(wrapper, 'a');

        await wrapper.get('input').trigger('keydown', { key: 'Enter' });

        expect(wrapper.emitted('select')?.[0]).toEqual(['AAPL']);
        vi.useRealTimers();
    });

    it('walks the list with the arrow keys, wrapping at both ends', async () => {
        vi.useFakeTimers();
        api.on('GET /api/charts/search', { items: [asset('AAPL'), asset('MSFT')] });
        const wrapper = search();
        await type(wrapper, 'a');

        await wrapper.get('input').trigger('keydown', { key: 'ArrowDown' });
        expect(wrapper.get('[aria-selected="true"]').text()).toContain('MSFT');

        await wrapper.get('input').trigger('keydown', { key: 'ArrowDown' });
        expect(wrapper.get('[aria-selected="true"]').text()).toContain('AAPL');

        await wrapper.get('input').trigger('keydown', { key: 'ArrowUp' });
        expect(wrapper.get('[aria-selected="true"]').text()).toContain('MSFT');
        vi.useRealTimers();
    });

    it('points the input at the option that is highlighted', async () => {
        vi.useFakeTimers();
        api.on('GET /api/charts/search', { items: [asset('AAPL')] });
        const wrapper = search();

        await type(wrapper, 'a');

        expect(wrapper.get('input').attributes('aria-activedescendant')).toBe(
            wrapper.get('[role="option"]').attributes('id'),
        );
        vi.useRealTimers();
    });

    it('does nothing on Enter with nothing highlighted', async () => {
        const wrapper = search();

        await wrapper.get('input').trigger('keydown', { key: 'Enter' });

        expect(wrapper.emitted('select')).toBeUndefined();
    });

    it('picks the option that was clicked and empties the box', async () => {
        vi.useFakeTimers();
        api.on('GET /api/charts/search', { items: [asset('AAPL'), asset('MSFT')] });
        const wrapper = search();
        await type(wrapper, 'a');

        await wrapper.findAll('[role="option"]')[1]?.trigger('mousedown');

        expect(wrapper.emitted('select')?.[0]).toEqual(['MSFT']);
        expect((wrapper.get('input').element as HTMLInputElement).value).toBe('');
        expect(wrapper.find('.symbol-search__popover').exists()).toBe(false);
        vi.useRealTimers();
    });

    it('follows the pointer, so a click lands on what is under it', async () => {
        vi.useFakeTimers();
        api.on('GET /api/charts/search', { items: [asset('AAPL'), asset('MSFT')] });
        const wrapper = search();
        await type(wrapper, 'a');

        await wrapper.findAll('[role="option"]')[1]?.trigger('mouseenter');

        expect(wrapper.get('[aria-selected="true"]').text()).toContain('MSFT');
        vi.useRealTimers();
    });

    it('closes on escape without picking anything', async () => {
        vi.useFakeTimers();
        api.on('GET /api/charts/search', { items: [asset('AAPL')] });
        const wrapper = search();
        await type(wrapper, 'a');

        await wrapper.get('input').trigger('keydown', { key: 'Escape' });

        expect(wrapper.find('.symbol-search__popover').exists()).toBe(false);
        expect(wrapper.emitted('select')).toBeUndefined();
        vi.useRealTimers();
    });

    it('reopens the list when the box is focused again', async () => {
        vi.useFakeTimers();
        api.on('GET /api/charts/search', { items: [asset('AAPL')] });
        const wrapper = search();
        await type(wrapper, 'a');
        await wrapper.get('input').trigger('keydown', { key: 'Escape' });

        await wrapper.get('input').trigger('focus');

        expect(wrapper.find('.symbol-search__popover').exists()).toBe(true);
        vi.useRealTimers();
    });

    it('closes once focus has left the whole widget', async () => {
        vi.useFakeTimers();
        api.on('GET /api/charts/search', { items: [asset('AAPL')] });
        const wrapper = search();
        await type(wrapper, 'a');

        await wrapper.get('.symbol-search').trigger('focusout', { relatedTarget: document.body });

        expect(wrapper.find('.symbol-search__popover').exists()).toBe(false);
        vi.useRealTimers();
    });

    it('stays open while focus moves onto one of its own options', async () => {
        vi.useFakeTimers();
        api.on('GET /api/charts/search', { items: [asset('AAPL')] });
        const wrapper = search();
        await type(wrapper, 'a');

        await wrapper.get('.symbol-search').trigger('focusout', {
            relatedTarget: wrapper.get('[role="option"]').element,
        });

        expect(wrapper.find('.symbol-search__popover').exists()).toBe(true);
        vi.useRealTimers();
    });

    it('shows an asset the vendor named nothing without a blank row', async () => {
        vi.useFakeTimers();
        api.on('GET /api/charts/search', { items: [asset('AAPL', { name: null, exchange: null })] });
        const wrapper = search();

        await type(wrapper, 'a');

        expect(wrapper.get('.symbol-search__name').text()).toBe('');
        expect(wrapper.get('.symbol-search__exchange').text()).toBe('');
        vi.useRealTimers();
    });
});
