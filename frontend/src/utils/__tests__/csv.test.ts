import { describe, expect, it } from 'vitest';
import { CSV_TYPE, toCsv } from '@/utils/csv';

describe('toCsv', () => {
    it('leads with a BOM, so Excel reads it as UTF-8', () => {
        expect(toCsv(['name'], [['Nestlé']]).startsWith('﻿')).toBe(true);
    });

    it('separates rows with CRLF and ends the file with one', () => {
        expect(toCsv(['a', 'b'], [[1, 2]])).toBe('﻿a,b\r\n1,2\r\n');
    });

    it('quotes a cell containing the delimiter', () => {
        expect(toCsv(['name'], [['Smith, John']])).toContain('"Smith, John"');
    });

    it('doubles the quotes inside a quoted cell', () => {
        expect(toCsv(['name'], [['He said "hi"']])).toContain('"He said ""hi"""');
    });

    it('quotes a cell containing a newline', () => {
        expect(toCsv(['note'], [['line one\nline two']])).toContain('"line one\nline two"');
    });

    it('writes a missing cell as nothing at all', () => {
        expect(toCsv(['a', 'b'], [[null, 1]])).toBe('﻿a,b\r\n,1\r\n');
    });

    it('writes headers alone when there are no rows', () => {
        expect(toCsv(['a'], [])).toBe('﻿a\r\n');
    });

    it('names the mime type that makes a browser treat it as a spreadsheet', () => {
        expect(CSV_TYPE).toBe('text/csv;charset=utf-8');
    });
});
