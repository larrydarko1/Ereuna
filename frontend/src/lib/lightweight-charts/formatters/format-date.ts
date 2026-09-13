/**
 * The date formatter every other formatter is built on.
 *
 * It builds the parts with `Intl.DateTimeFormat` and then substitutes them into
 * the caller's pattern, rather than letting Intl decide the order — the pattern is
 * an option, and locale order would ignore it.
 */
import { numberToStringWithLeadingZero as numToStr } from '@/lib/lightweight-charts/formatters/price-formatter';

export function formatDate(date: Date, format: string, locale: string): string {
    return format
        .replace(/yyyy/g, yyyy(date))
        .replace(/yy/g, yy(date))
        .replace(/MMMM/g, MMMM(date, locale))
        .replace(/MMM/g, MMM(date, locale))
        .replace(/MM/g, MM(date))
        .replace(/dd/g, dd(date));
}

const getMonth = (date: Date): number => date.getUTCMonth() + 1;

const getDay = (date: Date): number => date.getUTCDate();

const getYear = (date: Date): number => date.getUTCFullYear();

const dd = (date: Date): string => numToStr(getDay(date), 2);

const MMMM = (date: Date, locale: string): string =>
    new Date(date.getUTCFullYear(), date.getUTCMonth(), 1).toLocaleString(locale, { month: 'long' });

const MMM = (date: Date, locale: string): string =>
    new Date(date.getUTCFullYear(), date.getUTCMonth(), 1).toLocaleString(locale, { month: 'short' });

const MM = (date: Date): string => numToStr(getMonth(date), 2);

const yy = (date: Date): string => numToStr(getYear(date) % 100, 2);

const yyyy = (date: Date): string => numToStr(getYear(date), 4);
