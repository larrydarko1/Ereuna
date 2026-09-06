import { beforeEach, describe, expect, it } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { clearAuth, findSessionUser } from '@/api/client';
import { i18n } from '@/i18n';
import { mockApi } from '@/__tests__/support/msw';
import { testRouter } from '@/__tests__/support/router';
import User from '@/views/User.vue';

const api = mockApi();

const ACCOUNT = { id: 'u1', username: 'larry', twoFactorEnabled: false };

const view = async (): Promise<VueWrapper> => {
    const router = testRouter();
    await router.push('/account');
    await router.isReady();
    const wrapper = mount(User, { global: { plugins: [router] } });
    await flushPromises();
    return wrapper;
};

/** The username hint sits on the card, above the form it belongs to. */
const usernameCard = (wrapper: VueWrapper): string => {
    const card = wrapper.findAll('.setting').find((node) => node.find('.username-form').exists());
    if (card === undefined) throw new Error('no username card on the page');
    return card.text();
};

const tab = (wrapper: VueWrapper, index: number): ReturnType<VueWrapper['findAll']>[number] => {
    const node = wrapper.findAll('.account__tab')[index];
    if (node === undefined) throw new Error(`no tab at ${index}`);
    return node;
};

beforeEach(() => {
    clearAuth();
    localStorage.clear();
    api.on('GET /api/account', ACCOUNT);
    api.on('GET /api/preferences', {
        language: 'en',
        theme: null,
        defaultSymbol: 'AAPL',
        hiddenSymbols: [],
        chartSettings: null,
        panels: null,
        screenerColumns: [],
    });
    api.on('GET /api/account/recovery-codes', { remaining: 7 });
});

describe('User', () => {
    it('spins until the account has been read', () => {
        const wrapper = mount(User, { global: { plugins: [testRouter()] } });

        expect(wrapper.findComponent({ name: 'AppSpinner' }).exists()).toBe(true);
    });

    it('opens on the account section', async () => {
        const wrapper = await view();

        expect(tab(wrapper, 0).attributes('aria-selected')).toBe('true');
        expect(wrapper.find('.username-form').exists()).toBe(true);
    });

    it('is a tablist whose panel names the tab it belongs to', async () => {
        const wrapper = await view();

        expect(wrapper.get('[role="tabpanel"]').attributes('aria-labelledby')).toBe(tab(wrapper, 0).attributes('id'));
    });

    it('swaps the region below for the section that was picked', async () => {
        const wrapper = await view();

        await tab(wrapper, 1).trigger('click');
        expect(wrapper.find('.themes__grid').exists()).toBe(true);

        await tab(wrapper, 2).trigger('click');
        await flushPromises();
        expect(wrapper.find('.security__status').exists()).toBe(true);
    });

    it('shows the username the account carries', async () => {
        const wrapper = await view();

        expect(usernameCard(wrapper)).toContain('larry');
    });

    it('adopts a rename into the session hint the app boots from', async () => {
        api.on('PATCH /api/account/username', { ...ACCOUNT, username: 'newname' });
        const wrapper = await view();

        await wrapper.findAll('.username-form input')[0]?.setValue('newname');
        await wrapper.findAll('.username-form input')[1]?.setValue('secret');
        await wrapper.get('.username-form').trigger('submit');
        await flushPromises();

        expect(findSessionUser()?.username).toBe('newname');
        expect(usernameCard(wrapper)).toContain('newname');
    });

    it('remembers that the second factor was turned on', async () => {
        api.on('POST /api/account/2fa', { secret: 'JBSWY3DPEHPK3PXP', uri: 'otpauth://totp/Ereuna:larry' });
        api.on('POST /api/account/2fa/confirm', { recoveryCodes: ['aaa-111'] });
        const wrapper = await view();
        await tab(wrapper, 2).trigger('click');
        await flushPromises();

        expect(wrapper.get('.security__status').text()).toBe(i18n.global.t('user.security.statusOff'));
    });

    it('reports a failed read in place of every section', async () => {
        api.on('GET /api/account', { error: 'INTERNAL' }, { status: 500 });
        const wrapper = await view();

        expect(wrapper.get('[role="alert"]').text()).toBe(i18n.global.t('errors.INTERNAL'));
        expect(wrapper.find('[role="tabpanel"]').exists()).toBe(false);
    });
});
