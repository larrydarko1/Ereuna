/** CSV export. */

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

export function downloadCsv(filename: string, csv: string): void {
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    // Revoking immediately is safe once the click has been dispatched, and not
    // revoking is a leak that lasts as long as the tab does.
    URL.revokeObjectURL(url);
}
