import { describe, expect, it } from 'vitest';
import { SUMMARY_FIELDS } from '@ereuna/shared';
import { i18n } from '@/i18n';
import { SUMMARY_FIELD_SPECS, type SummaryFormat } from '@/constants/summaryFields';

const FORMATS: readonly SummaryFormat[] = [
    'text',
    'copyable',
    'link',
    'prose',
    'date',
    'number',
    'integer',
    'compact',
    'percent',
    'ratio',
];

describe('SUMMARY_FIELD_SPECS', () => {
    it('describes every field the shared list offers, and nothing else', () => {
        expect(Object.keys(SUMMARY_FIELD_SPECS).sort()).toEqual([...SUMMARY_FIELDS].sort());
    });

    it('gives every row a format the renderer knows', () => {
        for (const spec of Object.values(SUMMARY_FIELD_SPECS)) expect(FORMATS).toContain(spec.format);
    });

    it('translates every label rather than hard-coding English', () => {
        for (const [field, spec] of Object.entries(SUMMARY_FIELD_SPECS)) {
            expect(i18n.global.te(`summary.${spec.labelKey}`), `${field} → summary.${spec.labelKey}`).toBe(true);
        }
    });

    it('reads a ratio as a ratio and a scaled percentage as a percentage', () => {
        expect(SUMMARY_FIELD_SPECS.dividendYield.format).toBe('ratio');
        expect(SUMMARY_FIELD_SPECS.gap.format).toBe('percent');
    });

    it('keeps a P/E as a number, so 24.9 does not round to 24', () => {
        expect(SUMMARY_FIELD_SPECS.pe.format).toBe('number');
    });
});
