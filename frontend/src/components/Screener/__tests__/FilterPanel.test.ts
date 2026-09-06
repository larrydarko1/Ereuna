import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import type { FilterDescriptor } from '@/api/screener';
import type { FilterGrouping } from '@/composables/screener/useFilterRegistry';
import type { ActiveFilter, FilterKind } from '@/composables/screener/useScreenerFilters';
import { i18n } from '@/i18n';
import { formatDate, formatNumber } from '@/utils/formatters';
import FilterPanel from '@/components/screener/FilterPanel.vue';

const descriptor = (over: Partial<FilterDescriptor> = {}): FilterDescriptor =>
    ({
        key: 'market-cap',
        label: 'Market cap',
        kind: 'range',
        available: true,
        bounds: null,
        ...over,
    }) as FilterDescriptor;

const grouping = (filters: FilterDescriptor[]): FilterGrouping[] => [{ group: 'priceSize', filters }];

const panel = (
    filters: FilterDescriptor[],
    values: Record<string, ActiveFilter> = {},
    props: Record<string, unknown> = {},
): VueWrapper =>
    mount(FilterPanel, {
        props: {
            groups: grouping(filters),
            valueFor: (key: string, _kind: FilterKind): ActiveFilter | null => values[key] ?? null,
            ...props,
        },
    });

describe('FilterPanel', () => {
    it('heads each group and renders a card per filter', () => {
        const wrapper = panel([descriptor(), descriptor({ key: 'price' })]);

        expect(wrapper.get('.filter-panel__heading').text()).toBe(i18n.global.t('screener.groups.priceSize'));
        expect(wrapper.findAll('.filter-card')).toHaveLength(2);
    });

    it('picks the control that matches the filter kind', () => {
        const wrapper = panel([
            descriptor({ key: 'market-cap', kind: 'range' }),
            descriptor({ key: 'ipo-date', kind: 'date' }) as FilterDescriptor,
            descriptor({ key: 'sector', kind: 'enum', options: ['Tech'] }) as FilterDescriptor,
            descriptor({ key: 'sma', kind: 'ma', directions: ['abv'], targets: ['price'] }) as FilterDescriptor,
            descriptor({ key: 'optionable', kind: 'flag' }) as FilterDescriptor,
        ]);

        expect(wrapper.findAll('.range-filter')).toHaveLength(1);
        expect(wrapper.findAll('.date-filter')).toHaveLength(1);
        expect(wrapper.findAll('.enum-filter')).toHaveLength(1);
        expect(wrapper.findAll('.ma-filter')).toHaveLength(1);
        expect(wrapper.findAll('.flag-filter')).toHaveLength(1);
    });

    it('summarises a range as its two ends', () => {
        const wrapper = panel([descriptor()], { 'market-cap': { kind: 'range', min: 1, max: 2 } });

        expect(wrapper.get('.filter-card__summary').text()).toBe(`${formatNumber(1, 2)} – ${formatNumber(2, 2)}`);
    });

    it('summarises a date span in the reader locale', () => {
        const wrapper = panel([descriptor({ key: 'ipo-date', kind: 'date' }) as FilterDescriptor], {
            'ipo-date': { kind: 'date', from: '2020-01-01', to: '2026-01-01' },
        });

        expect(wrapper.get('.filter-card__summary').text()).toBe(
            `${formatDate('2020-01-01')} – ${formatDate('2026-01-01')}`,
        );
    });

    it('names a short enum selection and counts a long one', () => {
        const short = panel([descriptor({ key: 'sector', kind: 'enum', options: [] }) as FilterDescriptor], {
            sector: { kind: 'enum', values: ['Tech', 'Energy'] },
        });
        const long = panel([descriptor({ key: 'sector', kind: 'enum', options: [] }) as FilterDescriptor], {
            sector: { kind: 'enum', values: ['Tech', 'Energy', 'Health'] },
        });

        expect(short.get('.filter-card__summary').text()).toBe('Tech, Energy');
        expect(long.get('.filter-card__summary').text()).toBe(i18n.global.t('screener.selectedCount', { count: 3 }));
    });

    it('summarises a moving average as its relation and its target', () => {
        const wrapper = panel(
            [descriptor({ key: 'sma', kind: 'ma', directions: ['abv'], targets: ['50'] }) as FilterDescriptor],
            { sma: { kind: 'ma', direction: 'abv', target: '50' } },
        );

        expect(wrapper.get('.filter-card__summary').text()).toBe(
            `${i18n.global.t('screener.direction.abv')} ${i18n.global.t('screener.maDays', { days: '50' })}`,
        );
    });

    it('summarises a flag as a plain yes', () => {
        const wrapper = panel([descriptor({ key: 'optionable', kind: 'flag' }) as FilterDescriptor], {
            optionable: { kind: 'flag', enabled: true },
        });

        expect(wrapper.get('.filter-card__summary').text()).toBe(i18n.global.t('common.yes'));
    });

    it('hands a control only a value of its own kind', () => {
        const wrapper = panel([descriptor()], { 'market-cap': { kind: 'enum', values: ['Tech'] } });

        expect(wrapper.findAll('.range-filter input')[0]?.attributes('value')).toBeUndefined();
    });

    it('passes an applied value up with the key it belongs to', async () => {
        const wrapper = panel([descriptor()]);

        await wrapper.findAll('.range-filter input')[0]?.setValue('10');
        await wrapper.get('.range-filter').trigger('submit');

        expect(wrapper.emitted('apply')?.[0]).toEqual(['market-cap', { min: 10, max: undefined }]);
    });

    it('passes a clear up from the card', async () => {
        const wrapper = panel([descriptor()], { 'market-cap': { kind: 'range', min: 1, max: 2 } });

        await wrapper.get('.filter-card__clear').trigger('click');

        expect(wrapper.emitted('clear')?.[0]).toEqual(['market-cap']);
    });

    it('reads a flag being turned off as a clear, since the API stores flags as presence', async () => {
        const wrapper = panel([descriptor({ key: 'optionable', kind: 'flag' }) as FilterDescriptor], {
            optionable: { kind: 'flag', enabled: true },
        });

        await wrapper.get('.flag-filter input').setValue(false);

        expect(wrapper.emitted('clear')?.[0]).toEqual(['optionable']);
        expect(wrapper.emitted('apply')).toBeUndefined();
    });

    it('reads a flag being turned on as an apply', async () => {
        const wrapper = panel([descriptor({ key: 'optionable', kind: 'flag' }) as FilterDescriptor]);

        await wrapper.get('.flag-filter input').setValue(true);

        expect(wrapper.emitted('apply')?.[0]).toEqual(['optionable', { enabled: true }]);
    });

    it('marks every card unavailable while no screener is selected', () => {
        const wrapper = panel([descriptor()], {}, { disabled: true });

        expect(wrapper.get('.filter-panel__notice').text()).toBe(i18n.global.t('screener.selectScreener'));
        expect(wrapper.get('.filter-card__toggle').attributes('disabled')).toBeDefined();
    });

    it('marks only the card being written as busy', () => {
        const wrapper = panel(
            [descriptor(), descriptor({ key: 'price' })],
            { 'market-cap': { kind: 'range', min: 1, max: 2 }, 'price': { kind: 'range', min: 1, max: 2 } },
            { saving: 'market-cap' },
        );

        expect(wrapper.findAll('.filter-card__clear')[0]?.attributes('disabled')).toBeDefined();
        expect(wrapper.findAll('.filter-card__clear')[1]?.attributes('disabled')).toBeUndefined();
    });
});
