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
        expect(picker().findAll('.themes__card')).toHaveLength(THEMES.length);
    });

    it('groups the dark themes apart from the light ones', () => {
        const wrapper = picker();
        const headings = wrapper.findAll('.themes__heading').map((node) => node.text());

        expect(headings).toEqual([i18n.global.t('user.themes.dark'), i18n.global.t('user.themes.light')]);
    });

    it('counts each group by the themes in it', () => {
        const groups = picker().findAll('.themes__group');
        const dark = THEMES.filter((theme) => theme.mode === 'dark').length;

        expect(groups[0]?.findAll('.themes__card')).toHaveLength(dark);
        expect(groups[1]?.findAll('.themes__card')).toHaveLength(THEMES.length - dark);
    });

    it('shows a swatch for every colour a theme previews', () => {
        const first = THEMES[0];
        const card = picker().get('.themes__card');

        expect(card.findAll('.themes__swatch')).toHaveLength(Object.keys(first?.preview ?? {}).length);
    });

    it('marks the theme in use as pressed, and only that one', () => {
        const wrapper = picker();

        expect(wrapper.findAll('.themes__card[aria-pressed="true"]')).toHaveLength(1);
    });

    it('applies the theme that was picked', async () => {
        const wrapper = picker();
        // Cards are grouped dark-first, so the fourth on screen is the fourth dark one
        const target = THEMES.filter((theme) => theme.mode === 'dark')[3];

        await wrapper.findAll('.themes__card')[3]?.trigger('click');

        expect(currentTheme.value).toBe(target?.id);
        expect(wrapper.findAll('.themes__card')[3]?.classes()).toContain('themes__card--active');
    });
});
