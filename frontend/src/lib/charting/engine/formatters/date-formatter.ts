/**
 * Formats a date on its own, for a tick mark or a crosshair label.
 */
import { formatDate } from '@/lib/charting/engine/formatters/format-date';

export class DateFormatter {
    private readonly _locale: string;
    private readonly _dateFormat: string;

    public constructor(dateFormat: string, locale: string) {
        this._dateFormat = dateFormat;
        this._locale = locale;
    }

    public format(date: Date): string {
        return formatDate(date, this._dateFormat, this._locale);
    }
}
