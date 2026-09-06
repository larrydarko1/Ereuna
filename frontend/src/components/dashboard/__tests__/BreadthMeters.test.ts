import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import type { BreadthSplit } from '@ereuna/shared';
import { i18n } from '@/i18n';
import BreadthMeters from '@/components/dashboard/BreadthMeters.vue';

const split = (over: Partial<BreadthSplit> = {}): BreadthSplit => ({
    advancing: 0.6,
    declining: 0.3,
    unchanged: 0.1,
    newHighs: 0.2,
    newLows: 0.5,
    neutral: 0.3,
    ...over,
});

const meters = (breadth: BreadthSplit): VueWrapper => mount(BreadthMeters, { props: { breadth } });

describe('BreadthMeters', () => {
    it('draws one bar per reading', () => {
        expect(meters(split()).findAll('.breadth__bar')).toHaveLength(2);
    });

    it('widths each band by its share of the universe', () => {
        const fills = meters(split()).findAll('.breadth__fill');

        expect(fills[0]?.attributes('style')).toContain('width: 60%');
        expect(fills[1]?.attributes('style')).toContain('width: 10%');
        expect(fills[2]?.attributes('style')).toContain('width: 30%');
    });

    it('reads the split out for a screen reader, since the bar is only a picture', () => {
        const label = meters(split()).get('.breadth__bar').attributes('aria-label');

        expect(label).toBe(
            i18n.global.t('dashboard.breadth.advanceDeclineReading', {
                positive: '60.0',
                negative: '30.0',
                neutral: '10.0',
            }),
        );
    });

    it('takes the second bar from the highs and lows', () => {
        const label = meters(split()).findAll('.breadth__bar')[1]?.attributes('aria-label');

        expect(label).toContain('20.0');
        expect(label).toContain('50.0');
    });

    it('prints the three figures beside the bar', () => {
        expect(
            meters(split())
                .findAll('.breadth__value')
                .map((node) => node.text()),
        ).toEqual(['60.0%', '10.0%', '30.0%', '20.0%', '30.0%', '50.0%']);
    });

    it('draws a flat universe as an empty bar rather than nothing', () => {
        const wrapper = meters(split({ advancing: 0, declining: 0, unchanged: 0 }));

        expect(wrapper.findAll('.breadth__bar')).toHaveLength(2);
        expect(wrapper.findAll('.breadth__fill')[0]?.attributes('style')).toContain('width: 0%');
    });
});
