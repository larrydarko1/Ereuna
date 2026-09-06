import { beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/i18n';
import {
    direction,
    formatCompact,
    formatCurrency,
    formatDate,
    formatDateTime,
    formatNumber,
    formatPercent,
    formatRatio,
    formatSigned,
    timeAgo,
    toDateInput,
} from '@/utils/formatters';

/** Non-breaking and narrow spaces vary by ICU build; the digits are the point. */
const plain = (value: string): string => value.replace(/\u00a0|\u202f/gu, ' ');

beforeEach(() => {
    i18n.global.locale.value = 'en';
});

describe('formatCurrency', () => {
    it('writes two decimals under a million', () => {
        expect(plain(formatCurrency(1234.5))).toBe('$1,234.50');
    });

    it('goes compact once past a million, in either direction', () => {
        expect(plain(formatCurrency(2_500_000))).toBe('$2.5M');
        expect(plain(formatCurrency(-2_500_000))).toBe('-$2.5M');
    });

    it('takes the currency it is given', () => {
        expect(plain(formatCurrency(10, 'EUR'))).toBe('€10.00');
    });

    it('follows the active locale without knowing anything about it', () => {
        i18n.global.locale.value = 'de';

        expect(plain(formatCurrency(1234.5, 'EUR'))).toBe('1.234,50 €');
    });
});

describe('formatNumber', () => {
    it('holds the precision it is asked for', () => {
        expect(formatNumber(1.5)).toBe('1.50');
        expect(formatNumber(1.5, 0)).toBe('2');
        expect(formatNumber(1.23456, 4)).toBe('1.2346');
    });

    it('groups thousands the way the locale does', () => {
        i18n.global.locale.value = 'de';

        expect(formatNumber(1234567.5)).toBe('1.234.567,50');
    });
});

describe('formatCompact', () => {
    it('abbreviates the large figures a market app is made of', () => {
        expect(plain(formatCompact(1_500_000_000))).toBe('1.5B');
        expect(plain(formatCompact(999))).toBe('999');
    });
});

describe('formatPercent and formatRatio', () => {
    it('signs a gain and leaves a loss to its own minus', () => {
        expect(formatPercent(12.5)).toBe('+12.50%');
        expect(formatPercent(-12.5)).toBe('-12.50%');
    });

    it('leaves zero unsigned', () => {
        expect(formatPercent(0)).toBe('0.00%');
    });

    it('reads a fraction as the percentage it means', () => {
        expect(formatRatio(0.0125)).toBe('+1.25%');
    });
});

describe('formatSigned', () => {
    it('signs a gain', () => {
        expect(formatSigned(3.5)).toBe('+3.50');
        expect(formatSigned(-3.5)).toBe('-3.50');
        expect(formatSigned(0)).toBe('0.00');
    });
});

describe('direction', () => {
    it('answers flat for zero — an unmoved position is not a loss', () => {
        expect(direction(0)).toBe('flat');
    });

    it('answers flat when there is no figure at all', () => {
        expect(direction(null)).toBe('flat');
        expect(direction(undefined)).toBe('flat');
        expect(direction(Number.NaN)).toBe('flat');
    });

    it('answers up and down either side of zero', () => {
        expect(direction(0.01)).toBe('up');
        expect(direction(-0.01)).toBe('down');
    });
});

describe('dates', () => {
    it('writes a date in the active locale', () => {
        expect(formatDate('2026-03-02T00:00:00Z')).toBe('Mar 2, 2026');
    });

    it('accepts a Date as readily as a string', () => {
        expect(formatDate(new Date('2026-03-02T00:00:00Z'))).toBe('Mar 2, 2026');
    });

    it('writes a timestamp with the time of day', () => {
        expect(plain(formatDateTime('2026-03-02T14:30:00Z'))).toMatch(/Mar 2/);
    });

    it('writes the local day for a date input, not the UTC one', () => {
        const local = new Date(2026, 2, 2, 1, 30);

        expect(toDateInput(local)).toBe('2026-03-02');
    });
});

describe('timeAgo', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-02T12:00:00Z'));
    });

    it('says just now under a minute', () => {
        expect(timeAgo('2026-03-02T11:59:30Z')).toBe(i18n.global.t('time.justNow'));
    });

    it('counts minutes under an hour', () => {
        expect(timeAgo('2026-03-02T11:30:00Z')).toBe(i18n.global.t('time.minutesAgo', { n: 30 }));
    });

    it('counts hours under a day', () => {
        expect(timeAgo('2026-03-02T06:00:00Z')).toBe(i18n.global.t('time.hoursAgo', { n: 6 }));
    });

    it('counts days under a month', () => {
        expect(timeAgo('2026-02-25T12:00:00Z')).toBe(i18n.global.t('time.daysAgo', { n: 5 }));
    });

    it('falls back to an absolute date past thirty days', () => {
        expect(timeAgo('2026-01-01T12:00:00Z')).toBe('Jan 1, 2026');
    });
});
