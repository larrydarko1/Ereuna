/** CSV export. */

/** The mime type that makes a browser treat the download as a spreadsheet. */
export const CSV_TYPE = 'text/csv;charset=utf-8';

/** RFC 4180 quoting: wrap anything containing a delimiter, and double its quotes. */
function escapeCell(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return '';
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.split('"').join('""')}"` : text;
}

export function toCsv(headers: readonly string[], rows: readonly (readonly (string | number | null)[])[]): string {
    // A leading BOM is what makes Excel read the file as UTF-8 rather than as
    // the local codepage, which is the difference between "Nestlé" and "NestlÃ©".
    return `﻿${[headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n')}\r\n`;
}
