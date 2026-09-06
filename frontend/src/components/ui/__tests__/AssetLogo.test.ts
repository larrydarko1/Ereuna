import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import AssetLogo from '@/components/ui/AssetLogo.vue';

describe('AssetLogo', () => {
    it("points at the API's own path, not at a build asset", () => {
        const wrapper = mount(AssetLogo, { props: { symbol: 'AAPL', exchange: 'NASDAQ' } });

        expect(wrapper.get('img').attributes('src')).toBe('/api/logos/NASDAQ/AAPL.svg');
    });

    it('encodes a symbol that cannot sit in a path segment as it is', () => {
        const wrapper = mount(AssetLogo, { props: { symbol: 'BRK/B', exchange: 'NYSE' } });

        expect(wrapper.get('img').attributes('src')).toBe('/api/logos/NYSE/BRK%2FB.svg');
    });

    it('carries an empty alt — the row beside it already names the instrument', () => {
        const wrapper = mount(AssetLogo, { props: { symbol: 'AAPL', exchange: 'NASDAQ' } });

        expect(wrapper.get('img').attributes('alt')).toBe('');
        expect(wrapper.get('img').attributes('loading')).toBe('lazy');
    });

    it.each([null, ''])('falls back to initials when the exchange is %j', async (exchange) => {
        const wrapper = mount(AssetLogo, { props: { symbol: 'AAPL', exchange } });

        expect(wrapper.find('img').exists()).toBe(false);
        expect(wrapper.text()).toBe('AA');
    });

    it('falls back to initials once the request 404s — most tickers have no mark', async () => {
        const wrapper = mount(AssetLogo, { props: { symbol: 'nosuch', exchange: 'NASDAQ' } });

        await wrapper.get('img').trigger('error');

        expect(wrapper.find('img').exists()).toBe(false);
        expect(wrapper.text()).toBe('NO');
    });

    it('tries again for a new symbol — the previous 404 says nothing about this one', async () => {
        const wrapper = mount(AssetLogo, { props: { symbol: 'NOSUCH', exchange: 'NASDAQ' } });
        await wrapper.get('img').trigger('error');

        await wrapper.setProps({ symbol: 'AAPL' });

        expect(wrapper.get('img').attributes('src')).toBe('/api/logos/NASDAQ/AAPL.svg');
    });

    it('tries again when only the exchange changes', async () => {
        const wrapper = mount(AssetLogo, { props: { symbol: 'AAPL', exchange: 'NASDAQ' } });
        await wrapper.get('img').trigger('error');

        await wrapper.setProps({ exchange: 'NYSE' });

        expect(wrapper.find('img').exists()).toBe(true);
    });

    it('renders at the size asked for', () => {
        const wrapper = mount(AssetLogo, { props: { symbol: 'AAPL', exchange: 'NASDAQ', size: 'sm' } });

        expect(wrapper.get('img').classes()).toContain('logo--sm');
    });
});
