import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import type { OutlookReading } from '@ereuna/shared';
import { i18n } from '@/i18n';
import OutlookPills from '@/components/dashboard/OutlookPills.vue';

const reading = (over: Partial<OutlookReading> = {}): OutlookReading => ({
    term: 'short',
    verdict: 'bullish',
    percentUp: 62.5,
    periods: [5, 10],
    ...over,
});

const pills = (readings: OutlookReading[]): VueWrapper => mount(OutlookPills, { props: { readings } });

describe('OutlookPills', () => {
    it('shows one pill per reading', () => {
        expect(pills([reading(), reading({ term: 'mid' }), reading({ term: 'long' })]).findAll('li')).toHaveLength(3);
    });

    it('renders nothing for an empty outlook', () => {
        expect(pills([]).findAll('li')).toHaveLength(0);
    });

    it('names the term and the verdict', () => {
        const wrapper = pills([reading({ term: 'mid', verdict: 'bearish' })]);

        expect(wrapper.get('.outlook__term').text()).toBe(i18n.global.t('dashboard.outlook.midTerm'));
        expect(wrapper.get('.outlook__verdict').text()).toBe(i18n.global.t('dashboard.outlook.bearish'));
    });

    it('colours the verdict by what it says', () => {
        expect(
            pills([reading({ verdict: 'neutral' })])
                .get('.outlook__verdict')
                .classes(),
        ).toContain('outlook__verdict--neutral');
    });

    it('shows the periods the verdict was taken from, so it can be argued with', () => {
        expect(
            pills([reading({ periods: [5, 20, 50] })])
                .get('.outlook__periods')
                .text(),
        ).toBe('5 · 20 · 50');
    });
});
