import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import EmptyState from '@/components/ui/EmptyState.vue';

describe('EmptyState', () => {
    it('states what is missing as a heading, so it is reachable by role', () => {
        const wrapper = mount(EmptyState, { props: { title: 'This portfolio is empty' } });

        expect(wrapper.get('h2').text()).toBe('This portfolio is empty');
    });

    it('explains the state when there is something to explain', () => {
        const wrapper = mount(EmptyState, { props: { title: 'Nothing hidden', body: 'Hide one and it lands here.' } });

        expect(wrapper.get('.empty-state__body').text()).toBe('Hide one and it lands here.');
    });

    it('leaves the body out rather than rendering an empty paragraph', () => {
        expect(
            mount(EmptyState, { props: { title: 'Nothing hidden' } })
                .find('.empty-state__body')
                .exists(),
        ).toBe(false);
    });

    it('holds the actions it was given', () => {
        const wrapper = mount(EmptyState, {
            props: { title: 'No screeners yet' },
            slots: { default: '<button type="button">Create one</button>' },
        });

        expect(wrapper.get('.empty-state__actions button').text()).toBe('Create one');
    });

    it('leaves the action row out when nothing fills it', () => {
        expect(
            mount(EmptyState, { props: { title: 'No results found' } })
                .find('.empty-state__actions')
                .exists(),
        ).toBe(false);
    });
});
