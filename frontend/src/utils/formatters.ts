/**
 * Display formatting for the numbers a market app is mostly made of.
 * Everything locale-aware goes through `Intl`, seeded from the active i18n
 * locale, so a German user sees 1.234,56 without this module knowing anything
 * about German. Nothing here rounds for storage — these are display strings.
 */
import { i18n } from '@/i18n';

/** Money, with the currency symbol. Two decimals, or none once past a million. */
export function formatCurrency(value: number, currency = 'USD'): string {
    const locale = i18n.global.locale.value;
    const compact = Math.abs(value) >= 1_000_000;
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        notation: compact ? 'compact' : 'standard',
        maximumFractionDigits: compact ? 2 : 2,
    }).format(value);
}

/** A plain number at a fixed precision — share counts, ratios, multiples. */
export function formatNumber(value: number, decimals = 2): string {
    return new Intl.NumberFormat(i18n.global.locale.value, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value);
}

/** Market cap, volume, enterprise value: 1_500_000_000 → "1.5B". */
export function formatCompact(value: number): string {
    return new Intl.NumberFormat(i18n.global.locale.value, {
        notation: 'compact',
        maximumFractionDigits: 2,
    }).format(value);
}

/** A percentage that already is one: 12.5 → "+12.50%". */
export function formatPercent(value: number, decimals = 2): string {
    const formatted = formatNumber(value, decimals);
    return `${value > 0 ? '+' : ''}${formatted}%`;
}

/** A signed figure that should read as a gain or a loss. */
export function formatSigned(value: number, decimals = 2): string {
    return `${value > 0 ? '+' : ''}${formatNumber(value, decimals)}`;
}

/**
 * Which direction a figure moved, for choosing a colour or an icon.
 * Zero is its own answer rather than being folded into "down": a position that
 * has not moved is not a loss, and colouring it red says it is.
 */
export function direction(value: number | null | undefined): 'up' | 'down' | 'flat' {
    if (value == null || value === 0 || Number.isNaN(value)) return 'flat';
    return value > 0 ? 'up' : 'down';
}

export function formatDate(iso: string | Date): string {
    return new Date(iso).toLocaleDateString(i18n.global.locale.value, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export function formatDateTime(iso: string | Date): string {
    return new Date(iso).toLocaleString(i18n.global.locale.value, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/** The `YYYY-MM-DD` an <input type="date"> and the API both expect. */
export function toDateInput(value: string | Date): string {
    const date = new Date(value);
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

/** Relative time up to 30 days, then an absolute date. */
export function timeAgo(iso: string | Date): string {
    const { t } = i18n.global;
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return t('time.justNow');
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t('time.minutesAgo', { n: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('time.hoursAgo', { n: hours });
    const days = Math.floor(hours / 24);
    if (days < 30) return t('time.daysAgo', { n: days });
    return formatDate(iso);
}
