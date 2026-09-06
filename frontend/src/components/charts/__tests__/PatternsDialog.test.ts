import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import type { PatternMatch } from '@/lib/lightweight-charts/pattern-detection';
import { i18n } from '@/i18n';
import { formatDate, formatNumber } from '@/utils/formatters';
import PatternsDialog from '@/components/charts/PatternsDialog.vue';

const START = Date.UTC(2026, 0, 1) / 1000;
const END = Date.UTC(2026, 1, 1) / 1000;

const pattern = (over: Partial<PatternMatch> = {}): PatternMatch =>
    ({
        type: 'doubleTop',
        points: [],
        confidence: 0.82,
        description: 'Two peaks at the same level',
        timeframe: { start: START, end: END },
        ...over,
    }) as PatternMatch;

const open = (patterns: PatternMatch[]): VueWrapper =>
    mount(PatternsDialog, { props: { symbol: 'AAPL', patterns }, attachTo: document.body });

const $ = (selector: string): HTMLElement => {
    const element = document.body.querySelector<HTMLElement>(selector);
    if (element === null) throw new Error(`no ${selector} in the dialog`);
    return element;
};

const all = (selector: string): HTMLElement[] => [...document.body.querySelectorAll<HTMLElement>(selector)];

afterEach(() => {
    document.body.innerHTML = '';
});

describe('PatternsDialog', () => {
    it('names the instrument the patterns were found on', () => {
        open([pattern()]);

        expect($('.patterns__subject').textContent).toBe('AAPL');
    });

    it('says there are none, and why there might not be', () => {
        open([]);

        expect($('.patterns__empty').textContent).toBe(i18n.global.t('charts.patterns.none'));
        expect($('.patterns__hint').textContent).toBe(i18n.global.t('charts.patterns.noneHint'));
    });

    it('shows one entry per pattern', () => {
        expect(open([pattern(), pattern({ type: 'bullishFlag' })]).exists()).toBe(true);
        expect(all('.patterns__item')).toHaveLength(2);
    });

    it('names a pattern from the locale', () => {
        open([pattern()]);

        expect($('.patterns__name').textContent?.trim()).toBe(i18n.global.t('charts.patterns.types.doubleTop'));
    });

    it('falls back to the detector’s own name rather than printing a key', () => {
        open([pattern({ type: 'somethingNew' as PatternMatch['type'] })]);

        expect($('.patterns__name').textContent?.trim()).toBe('somethingNew');
    });

    it('colours a pattern by which way it reads', () => {
        open([
            pattern({ type: 'doubleTop' }),
            pattern({ type: 'doubleBottom' }),
            pattern({ type: 'symmetricTriangle' }),
        ]);
        const names = all('.patterns__name');

        expect(names[0]?.classList.contains('patterns__name--bearish')).toBe(true);
        expect(names[1]?.classList.contains('patterns__name--bullish')).toBe(true);
        expect(names[2]?.classList.contains('patterns__name--neutral')).toBe(true);
    });

    it('treats an unknown pattern as taking no side', () => {
        open([pattern({ type: 'somethingNew' as PatternMatch['type'] })]);

        expect($('.patterns__name').classList.contains('patterns__name--neutral')).toBe(true);
    });

    it('shows the confidence as a whole percentage', () => {
        open([pattern({ confidence: 0.824 })]);

        expect($('.patterns__confidence').textContent).toContain(`${formatNumber(82.4, 0)}%`);
    });

    it('reads the detector’s epoch seconds as the span the pattern covers', () => {
        open([pattern()]);

        expect($('.patterns__span').textContent).toBe(
            `${formatDate(new Date(START * 1000))} – ${formatDate(new Date(END * 1000))}`,
        );
    });

    it('closes on the dialog close', async () => {
        const wrapper = open([pattern()]);

        $('.dialog__close').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();

        expect(wrapper.emitted('close')).toHaveLength(1);
    });
});
