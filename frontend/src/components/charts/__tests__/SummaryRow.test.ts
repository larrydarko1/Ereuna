import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import type { SummaryFormat } from '@/constants/summaryFields';
import { i18n } from '@/i18n';
import { formatCompact, formatDate, formatNumber } from '@/utils/formatters';
import SummaryRow from '@/components/charts/SummaryRow.vue';

const row = (value: string | number | null, format: SummaryFormat = 'text'): VueWrapper =>
    mount(SummaryRow, { props: { label: 'Market cap', value, format } });

const shown = (value: string | number | null, format: SummaryFormat): string =>
    row(value, format).get('.summary-row__value, .summary-row__prose').text();

afterEach(() => {
    vi.restoreAllMocks();
});

describe('SummaryRow', () => {
    it('dashes a value the reference data does not carry', () => {
        expect(shown(null, 'text')).toBe('—');
        expect(shown('', 'text')).toBe('—');
    });

    it('reads each numeric format the way its unit is written', () => {
        expect(shown(1234.567, 'number')).toBe(formatNumber(1234.567, 2));
        expect(shown(1234.567, 'integer')).toBe(formatNumber(1234.567, 0));
        expect(shown(1_500_000_000, 'compact')).toBe(formatCompact(1_500_000_000));
        expect(shown(3.2, 'percent')).toBe(`${formatNumber(3.2, 2)}%`);
    });

    it('reads a stored fraction as the percentage it means', () => {
        expect(shown(0.032, 'ratio')).toBe(`${formatNumber(3.2, 2)}%`);
    });

    it('reads a date in the reader locale', () => {
        expect(shown('2026-03-04', 'date')).toBe(formatDate('2026-03-04'));
    });

    it('leaves plain text alone', () => {
        expect(shown('NASDAQ', 'text')).toBe('NASDAQ');
    });

    it('links a bare host, assuming the secure scheme', () => {
        expect(row('example.com', 'link').get('a').attributes('href')).toBe('https://example.com/');
    });

    it('keeps a link that already names its scheme', () => {
        expect(row('http://example.com/ir', 'link').get('a').attributes('href')).toBe('http://example.com/ir');
    });

    it('opens a link in a new tab without leaking the referrer', () => {
        const link = row('example.com', 'link').get('a');

        expect(link.attributes('target')).toBe('_blank');
        expect(link.attributes('rel')).toBe('noopener noreferrer');
    });

    it('renders a script URL as text rather than as something clickable', () => {
        const wrapper = row('javascript:alert(1)', 'link');

        expect(wrapper.find('a').exists()).toBe(false);
        expect(wrapper.get('.summary-row__value').text()).toBe('javascript:alert(1)');
    });

    it('renders an unparseable link as text', () => {
        expect(row('http://', 'link').find('a').exists()).toBe(false);
    });

    it('offers a copy button only for a copyable value that exists', () => {
        expect(row('US0378331005', 'copyable').find('.summary-row__copy').exists()).toBe(true);
        expect(row(null, 'copyable').find('.summary-row__copy').exists()).toBe(false);
        expect(row('NASDAQ', 'text').find('.summary-row__copy').exists()).toBe(false);
    });

    it('copies the raw value, not the formatted one', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
        const wrapper = row(1_500_000_000, 'copyable');

        await wrapper.get('.summary-row__copy').trigger('click');

        expect(writeText).toHaveBeenCalledWith('1500000000');
        expect(wrapper.get('.summary-row__copy svg').attributes('data-icon')).toBe('check');
    });

    it('goes back to offering a copy after a moment', async () => {
        vi.useFakeTimers();
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText: vi.fn().mockResolvedValue(undefined) },
        });
        const wrapper = row('US0378331005', 'copyable');

        await wrapper.get('.summary-row__copy').trigger('click');
        await vi.advanceTimersByTimeAsync(2000);

        expect(wrapper.get('.summary-row__copy svg').attributes('data-icon')).toBe('copy');
        vi.useRealTimers();
    });

    it('stays quiet when the browser refuses the clipboard', async () => {
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
        });
        const wrapper = row('US0378331005', 'copyable');

        await wrapper.get('.summary-row__copy').trigger('click');
        await Promise.resolve();

        expect(wrapper.get('.summary-row__copy svg').attributes('data-icon')).toBe('copy');
    });

    it('collapses a paragraph until it is asked for', async () => {
        const wrapper = row('A long description of the company.', 'prose');
        const toggle = wrapper.get('.summary-row__toggle');

        expect(toggle.attributes('aria-expanded')).toBe('false');
        expect(toggle.text()).toBe(i18n.global.t('summary.showAll'));

        await toggle.trigger('click');

        expect(wrapper.get('.summary-row__prose').classes()).toContain('summary-row__prose--expanded');
        expect(wrapper.get('.summary-row__toggle').text()).toBe(i18n.global.t('summary.showLess'));
    });

    it('offers nothing to expand when there is no description', () => {
        expect(row(null, 'prose').find('.summary-row__toggle').exists()).toBe(false);
    });
});
