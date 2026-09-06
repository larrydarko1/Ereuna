import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import SettingCard from '@/components/user/SettingCard.vue';

const card = (props: Record<string, unknown> = {}): VueWrapper =>
    mount(SettingCard, { props: { title: 'Password', ...props }, slots: { default: '<form class="body" />' } });

describe('SettingCard', () => {
    it('makes the title the section heading', () => {
        expect(card().get('h2').text()).toBe('Password');
    });

    it('shows a description only when there is one', () => {
        expect(card().find('.setting__description').exists()).toBe(false);
        expect(card({ description: 'Change it' }).get('.setting__description').text()).toBe('Change it');
    });

    it('renders the setting it wraps', () => {
        expect(card().find('.body').exists()).toBe(true);
    });
});
