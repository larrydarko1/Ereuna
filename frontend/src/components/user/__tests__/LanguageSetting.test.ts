import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { i18n, SUPPORTED_LOCALES } from '@/i18n';
import { mockApi } from '@/__tests__/support/msw';
import LanguageSetting from '@/components/user/LanguageSetting.vue';

const api = mockApi();

const setting = (): VueWrapper => mount(LanguageSetting);

/** The switch loads the API module on demand, so the write is several ticks away. */
const pick = async (wrapper: VueWrapper, locale: string): Promise<void> => {
    await wrapper.get('select').setValue(locale);
    await vi.waitFor(() => expect(api.calls).not.toHaveLength(0));
    await flushPromises();
};

beforeEach(() => {
    api.on('PATCH /api/preferences', { language: 'fr' });
});

describe('LanguageSetting', () => {
    it('offers every locale the app ships', () => {
        expect(setting().findAll('option')).toHaveLength(SUPPORTED_LOCALES.length);
    });

    it('shows the locale currently in use', () => {
        expect((setting().get('select').element as HTMLSelectElement).value).toBe('en');
    });

    it('switches the app to the locale that was picked', async () => {
        await pick(setting(), 'fr');

        expect(i18n.global.locale.value).toBe('fr');
    });

    it('remembers the choice on the account', async () => {
        await pick(setting(), 'fr');

        expect(api.last().body).toEqual({ language: 'fr' });
    });

    it('ignores a value that is not a locale it ships', async () => {
        const wrapper = setting();
        (wrapper.get('select').element as HTMLSelectElement).value = 'kl';

        await wrapper.get('select').trigger('change');
        await flushPromises();

        expect(i18n.global.locale.value).toBe('en');
    });
});
