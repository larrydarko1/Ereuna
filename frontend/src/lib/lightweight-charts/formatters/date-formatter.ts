import { formatDate } from '@/lib/lightweight-charts/formatters/format-date';

export class DateFormatter {
    private readonly _locale: string;
    private readonly _dateFormat: string;

    public constructor(dateFormat = 'yyyy-MM-dd', locale = 'default') {
        this._dateFormat = dateFormat;
        this._locale = locale;
    }

    public format(date: Date): string {
        return formatDate(date, this._dateFormat, this._locale);
    }
}
