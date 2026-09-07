import { beforeEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { i18n } from '@/i18n';
import { clearAuth } from '@/api/client';
import { THEMES } from '@/composables/ui/themes';
import { useTheme } from '@/composables/ui/useTheme';
import ThemePicker from '@/components/user/ThemePicker.vue';

const picker = (): VueWrapper => mount(ThemePicker);

const { currentTheme } = useTheme();

beforeEach(() => {
    clearAuth();
});

describe('ThemePicker', () => {
    it('offers every theme the app ships', () => {
        expect(picker().findAll('option')).toHaveLength(THEMES.length);
    });

    it('groups the dark themes apart from the light ones', () => {
        const labels = picker()
            .findAll('optgroup')
            .map((node) => node.attributes('label'));

        expect(labels).toEqual([i18n.global.t('user.themes.dark'), i18n.global.t('user.themes.light')]);
    });

    it('counts each group by the themes in it', () => {
        const groups = picker().findAll('optgroup');
        const dark = THEMES.filter((theme) => theme.mode === 'dark').length;

        expect(groups[0]?.findAll('option')).toHaveLength(dark);
        expect(groups[1]?.findAll('option')).toHaveLength(THEMES.length - dark);
    });

    it('shows the theme in use as the selected one', () => {
        expect((picker().get('select').element as HTMLSelectElement).value).toBe(currentTheme.value);
    });

    it('previews the selected theme with a swatch for every colour it defines', () => {
        const first = THEMES[0];

        expect(picker().findAll('.themes__swatch')).toHaveLength(Object.keys(first?.preview ?? {}).length);
    });

    it('applies the theme that was picked', async () => {
        const wrapper = picker();
        const target = THEMES.filter((theme) => theme.mode === 'light')[0];

        await wrapper.get('select').setValue(target?.id);

        expect(currentTheme.value).toBe(target?.id);
    });

    it('ignores a value that names no theme the stylesheet defines', async () => {
        const wrapper = picker();
        const before = currentTheme.value;
        (wrapper.get('select').element as HTMLSelectElement).value = 'tokyo-night';

        await wrapper.get('select').trigger('change');

        expect(currentTheme.value).toBe(before);
    });
});
