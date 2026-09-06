import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import type { CorporateAction } from '@ereuna/shared';
import { i18n } from '@/i18n';
import { formatDate, formatNumber } from '@/utils/formatters';
import ActionsPanel from '@/components/charts/ActionsPanel.vue';

const panel = (
    actions: CorporateAction[],
    kind: 'dividends' | 'splits' = 'dividends',
    expandable = false,
): VueWrapper => mount(ActionsPanel, { props: { actions, kind, expandable } });

const dividend = (amount: number | null = 0.24): CorporateAction =>
    ({ date: '2026-02-10', amount }) as unknown as CorporateAction;

const split = (ratio: number | null = 4): CorporateAction =>
    ({ date: '2026-02-10', ratio }) as unknown as CorporateAction;

describe('ActionsPanel', () => {
    it('shows one row per action', () => {
        expect(panel([dividend(), dividend()]).findAll('tbody tr')).toHaveLength(2);
    });

    it('dates each action in the reader locale', () => {
        expect(panel([dividend()]).get('tbody th').text()).toBe(formatDate('2026-02-10'));
    });

    it('shows a dividend to the cent it was actually paid at', () => {
        expect(
            panel([dividend(0.2375)])
                .findAll('.actions__numeric')[1]
                ?.text(),
        ).toBe(formatNumber(0.2375, 4));
    });

    it('shows a split ratio to two places, which is all one needs', () => {
        expect(
            panel([split(4)], 'splits')
                .findAll('.actions__numeric')[1]
                ?.text(),
        ).toBe(formatNumber(4, 2));
    });

    it('dashes an action the vendor sent no figure for', () => {
        expect(
            panel([dividend(null)])
                .findAll('.actions__numeric')[1]
                ?.text(),
        ).toBe('—');
    });

    it('reads a split off the ratio, not off the amount', () => {
        expect(
            panel([dividend(0.24)], 'splits')
                .findAll('.actions__numeric')[1]
                ?.text(),
        ).toBe('—');
    });

    it('says which kind of action it has none of', () => {
        expect(panel([]).get('.actions__empty').text()).toBe(i18n.global.t('sidebar.noDividendData'));
        expect(panel([], 'splits').get('.actions__empty').text()).toBe(i18n.global.t('sidebar.noSplitsData'));
    });

    it('offers to show the whole history only while there is one to show', async () => {
        expect(panel([dividend()], 'dividends', false).find('.actions__more').exists()).toBe(false);
        expect(panel([], 'dividends', true).find('.actions__more').exists()).toBe(false);

        const wrapper = panel([dividend()], 'dividends', true);
        await wrapper.get('.actions__more').trigger('click');

        expect(wrapper.emitted('expand')).toHaveLength(1);
    });

    it('keeps two actions dated the same day apart', () => {
        expect(panel([dividend(0.2), dividend(0.3)]).findAll('tbody tr')).toHaveLength(2);
    });
});
