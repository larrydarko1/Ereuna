import { describe, expect, it, vi } from 'vitest';
import { mount, RouterLinkStub, type VueWrapper } from '@vue/test-utils';
import { i18n } from '@/i18n';
import { INVESTING_QUOTES } from '@/constants/quotes';
import AuthLayout from '@/components/auth/AuthLayout.vue';

const layout = (props: Record<string, unknown> = {}, slot = '<form />'): VueWrapper =>
    mount(AuthLayout, {
        props: { title: 'Sign in', ...props },
        slots: { default: slot },
        global: { stubs: { RouterLink: RouterLinkStub } },
    });

describe('AuthLayout', () => {
    it('makes the title the page heading', () => {
        expect(layout().get('h1').text()).toBe('Sign in');
    });

    it('shows a subtitle only when there is one', () => {
        expect(layout().find('.auth__subtitle').exists()).toBe(false);
        expect(layout({ subtitle: 'Welcome back' }).get('.auth__subtitle').text()).toBe('Welcome back');
    });

    it('renders the form it wraps', () => {
        expect(layout({}, '<form class="sign-in" />').find('.sign-in').exists()).toBe(true);
    });

    it('names the decorative aside for a screen reader', () => {
        expect(layout().get('aside').attributes('aria-label')).toBe(i18n.global.t('auth.quoteRegion'));
    });

    it('links the brand back to sign-in', () => {
        expect(layout().getComponent(RouterLinkStub).props('to')).toBe('/login');
    });

    it('shows one of the quotes, with its author', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
        const first = INVESTING_QUOTES[0];

        const wrapper = layout();

        expect(wrapper.get('blockquote').text()).toBe(first?.text);
        expect(wrapper.get('figcaption').text()).toBe(`— ${first?.author ?? ''}`);
        vi.restoreAllMocks();
    });

    it('picks the last quote too, rather than reading past the end', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.999999);
        const last = INVESTING_QUOTES[INVESTING_QUOTES.length - 1];

        expect(layout().get('blockquote').text()).toBe(last?.text);
        vi.restoreAllMocks();
    });
});
