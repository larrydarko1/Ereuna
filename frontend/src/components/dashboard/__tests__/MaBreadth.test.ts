import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { BREADTH_UNIVERSES, type BreadthUniverse, type MovingAverageBreadth } from '@ereuna/shared';
import { i18n } from '@/i18n';
import MaBreadth from '@/components/dashboard/MaBreadth.vue';

type Series = Record<BreadthUniverse, MovingAverageBreadth[]>;

const empty = (): Series =>
    Object.fromEntries(BREADTH_UNIVERSES.map((universe) => [universe, []])) as unknown as Series;

const seeded = (over: Partial<Series>): Series => ({ ...empty(), ...over });

const breadth = (series: Series): VueWrapper => mount(MaBreadth, { props: { series } });

describe('MaBreadth', () => {
    it('offers every universe the shared contract names', () => {
        expect(breadth(empty()).findAll('option')).toHaveLength(BREADTH_UNIVERSES.length);
    });

    it('starts on the whole market', () => {
        const wrapper = breadth(seeded({ all: [{ period: 50, above: 0.6, below: 0.4 }] }));

        expect(wrapper.findAll('.ma-breadth__row')).toHaveLength(1);
        expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('all');
    });

    it('swaps the rows when another universe is picked', async () => {
        const wrapper = breadth(
            seeded({
                all: [{ period: 50, above: 0.6, below: 0.4 }],
                etf: [
                    { period: 20, above: 0.5, below: 0.5 },
                    { period: 200, above: 0.7, below: 0.3 },
                ],
            }),
        );

        await wrapper.get('select').setValue('etf');

        expect(wrapper.findAll('.ma-breadth__row')).toHaveLength(2);
    });

    it('says there is no data rather than drawing an empty list', () => {
        expect(breadth(empty()).get('.ma-breadth__empty').text()).toBe(i18n.global.t('dashboard.noData'));
    });

    it('widths each half of the bar by its share', () => {
        const fills = breadth(seeded({ all: [{ period: 50, above: 0.62, below: 0.38 }] })).findAll('.ma-breadth__fill');

        expect(fills[0]?.attributes('style')).toContain('width: 62%');
        expect(fills[1]?.attributes('style')).toContain('width: 38%');
    });

    it('reads the split out for a screen reader', () => {
        const wrapper = breadth(seeded({ all: [{ period: 50, above: 0.625, below: 0.375 }] }));

        expect(wrapper.get('.ma-breadth__bar').attributes('aria-label')).toBe(
            i18n.global.t('dashboard.sma.reading', { above: '62.5', below: '37.5' }),
        );
    });

    it('rounds the printed figures, which the label does not', () => {
        const wrapper = breadth(seeded({ all: [{ period: 50, above: 0.625, below: 0.375 }] }));

        expect(wrapper.get('.ma-breadth__above').text()).toBe('63%');
        expect(wrapper.get('.ma-breadth__below').text()).toBe('38%');
    });
});
