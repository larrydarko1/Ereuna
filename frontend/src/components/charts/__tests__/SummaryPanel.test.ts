import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import type { SummaryField } from '@ereuna/shared';
import type { AssetProfile } from '@/api/chart';
import { i18n } from '@/i18n';
import { SUMMARY_FIELD_SPECS } from '@/constants/summaryFields';
import SummaryPanel from '@/components/charts/SummaryPanel.vue';

const FIELDS: SummaryField[] = ['symbol', 'name', 'exchange'];

const panel = (profile: AssetProfile | null, fields: SummaryField[] = FIELDS): VueWrapper =>
    mount(SummaryPanel, { props: { profile, fields } });

const profile = (over: Partial<AssetProfile> = {}): AssetProfile =>
    ({ symbol: 'AAPL', name: 'Apple Inc', exchange: 'NASDAQ', ...over }) as AssetProfile;

describe('SummaryPanel', () => {
    it('shows one row per field it was told to show, in that order', () => {
        const wrapper = panel(profile());

        expect(wrapper.findAll('.summary-row')).toHaveLength(3);
        expect(wrapper.findAll('.summary-row__value').map((node) => node.text())).toContain('Apple Inc');
    });

    it('labels each row from the locale rather than from the field name', () => {
        const wrapper = panel(profile(), ['name']);

        expect(wrapper.get('.summary-row__label').text()).toBe(
            i18n.global.t(`summary.${SUMMARY_FIELD_SPECS.name.labelKey}`),
        );
    });

    it('dashes every row while there is no profile to read', () => {
        const wrapper = panel(null);

        expect(wrapper.findAll('.summary-row__value').map((node) => node.text())).toEqual(['—', '—', '—']);
    });

    it('dashes a field the profile does not carry', () => {
        const wrapper = panel(profile({ exchange: undefined }) as AssetProfile, ['exchange']);

        expect(wrapper.get('.summary-row__value').text()).toBe('—');
    });

    it('shows nothing at all when the layout hides every field', () => {
        expect(panel(profile(), []).findAll('.summary-row')).toHaveLength(0);
    });
});
