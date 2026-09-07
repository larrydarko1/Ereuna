import { describe, expect, it } from 'vitest';
import { CHART_STYLES, PANEL_SECTIONS, SUMMARY_FIELDS } from '@ereuna/shared';
import {
    chartSettingsSchema,
    idParam,
    makePaginationQuery,
    panelLayoutSchema,
    passwordSchema,
    portfolioNumberSchema,
    requiredString,
    resourceNameSchema,
    symbolSchema,
    usernameSchema,
} from '@/lib/schemas.js';
import { config } from '@/lib/config.js';

describe('passwordSchema', () => {
    it('accepts a password meeting every rule', () => {
        expect(passwordSchema.safeParse('Str0ng!pass').success).toBe(true);
    });

    it.each([
        ['too short', 'Ab1!efg'],
        ['no uppercase', 'str0ng!pass'],
        ['no lowercase', 'STR0NG!PASS'],
        ['no digit', 'Strong!pass'],
        ['no special character', 'Str0ngpass'],
        ['too long', `Aa1!${'x'.repeat(130)}`],
    ])('rejects one with %s', (_label, value) => {
        expect(passwordSchema.safeParse(value).success).toBe(false);
    });

    it('reports every rule a password broke, not just the first', () => {
        const result = passwordSchema.safeParse('abc');
        expect(result.success).toBe(false);
        expect(result.error?.issues.length).toBeGreaterThan(1);
    });
});

describe('usernameSchema', () => {
    it('trims and accepts letters, numbers and underscores', () => {
        expect(usernameSchema.parse('  larry_1  ')).toBe('larry_1');
    });

    it.each([
        ['too short', 'ab'],
        ['too long', 'a'.repeat(31)],
        ['a space inside', 'lar ry'],
        ['a hyphen', 'lar-ry'],
        ['a dollar sign, which is also a Mongo operator prefix', '$where'],
        ['empty', ''],
    ])('rejects a username that is %s', (_label, value) => {
        expect(usernameSchema.safeParse(value).success).toBe(false);
    });
});

describe('symbolSchema', () => {
    it('upper-cases, so a lower-case request hits the same cache key', () => {
        expect(symbolSchema.parse('aapl')).toBe('AAPL');
    });

    it('allows the punctuation real tickers carry', () => {
        expect(symbolSchema.parse('brk.b')).toBe('BRK.B');
        expect(symbolSchema.parse('^gspc')).toBe('^GSPC');
        expect(symbolSchema.parse('rds-a')).toBe('RDS-A');
    });

    it.each([
        ['empty', ''],
        ['longer than twenty characters', 'A'.repeat(21)],
        ['carrying a slash', 'A/B'],
        ['carrying a Mongo operator', '$ne'],
        ['carrying a regex metacharacter', 'A.*'],
        ['carrying a space', 'A B'],
    ])('rejects a symbol %s — these reach queries and cache keys', (_label, value) => {
        expect(symbolSchema.safeParse(value).success).toBe(false);
    });
});

describe('resourceNameSchema', () => {
    it('trims and accepts an ordinary name', () => {
        expect(resourceNameSchema.parse('  Growth  ')).toBe('Growth');
    });

    it.each([
        ['whitespace only', '   '],
        ['longer than sixty characters', 'x'.repeat(61)],
    ])('rejects a name that is %s', (_label, value) => {
        expect(resourceNameSchema.safeParse(value).success).toBe(false);
    });
});

describe('portfolioNumberSchema', () => {
    it('coerces the string a path parameter always is', () => {
        expect(portfolioNumberSchema.parse('3')).toBe(3);
    });

    it('takes its ceiling from config rather than from the caller', () => {
        expect(portfolioNumberSchema.safeParse(config.limits.portfolioSlots - 1).success).toBe(true);
        expect(portfolioNumberSchema.safeParse(config.limits.portfolioSlots).success).toBe(false);
    });

    it.each([
        ['negative', '-1'],
        ['fractional', '1.5'],
        ['not a number', 'first'],
    ])('rejects a slot that is %s', (_label, value) => {
        expect(portfolioNumberSchema.safeParse(value).success).toBe(false);
    });
});

describe('chartSettingsSchema', () => {
    const valid = {
        style: CHART_STYLES[0],
        indicators: [{ type: 'SMA' as const, period: 20, visible: true }],
    };

    it('accepts a complete settings object', () => {
        expect(chartSettingsSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects an unknown chart style', () => {
        expect(chartSettingsSchema.safeParse({ ...valid, style: 'hologram' }).success).toBe(false);
    });

    it('bounds the indicator period at the configured maximum', () => {
        const over = { type: 'SMA' as const, period: config.limits.maxIndicatorPeriod + 1, visible: true };
        expect(chartSettingsSchema.safeParse({ ...valid, indicators: [over] }).success).toBe(false);
    });

    it('bounds how many indicators one chart may carry', () => {
        const many = Array.from({ length: config.limits.indicatorsPerChart + 1 }, () => valid.indicators[0]);
        expect(chartSettingsSchema.safeParse({ ...valid, indicators: many }).success).toBe(false);
    });

    // A field required here that the client does not send 400s every save, and
    // the chart then silently keeps the defaults it was already drawing.
    it('requires nothing beyond the style and the indicators', () => {
        const parsed = chartSettingsSchema.parse(valid);
        expect(Object.keys(parsed).sort()).toEqual(['indicators', 'style']);
    });
});

describe('panelLayoutSchema', () => {
    it('accepts a layout that lists each key once', () => {
        expect(
            panelLayoutSchema.safeParse({ sections: [PANEL_SECTIONS[0]], summaryFields: [SUMMARY_FIELDS[0]] }).success,
        ).toBe(true);
    });

    it('rejects a section listed twice — it would render in two places', () => {
        expect(
            panelLayoutSchema.safeParse({
                sections: [PANEL_SECTIONS[0], PANEL_SECTIONS[0]],
                summaryFields: [],
            }).success,
        ).toBe(false);
    });

    it('rejects a summary field listed twice', () => {
        expect(
            panelLayoutSchema.safeParse({
                sections: [],
                summaryFields: [SUMMARY_FIELDS[0], SUMMARY_FIELDS[0]],
            }).success,
        ).toBe(false);
    });

    it('rejects an unknown section', () => {
        expect(panelLayoutSchema.safeParse({ sections: ['nowhere'], summaryFields: [] }).success).toBe(false);
    });
});

describe('makePaginationQuery', () => {
    it('defaults to the first page at the given size', () => {
        expect(makePaginationQuery().parse({})).toEqual({ page: 1, limit: 24 });
    });

    it('takes a caller-supplied default and maximum', () => {
        const schema = makePaginationQuery({ defaultLimit: 10, maxLimit: 50 });
        expect(schema.parse({}).limit).toBe(10);
        expect(schema.safeParse({ limit: 50 }).success).toBe(true);
        expect(schema.safeParse({ limit: 51 }).success).toBe(false);
    });

    it('coerces the strings a query string always is', () => {
        expect(makePaginationQuery().parse({ page: '2', limit: '5' })).toEqual({ page: 2, limit: 5 });
    });

    it.each([
        ['page zero', { page: 0 }],
        ['a negative page', { page: -1 }],
        ['a fractional page', { page: 1.5 }],
        ['limit zero', { limit: 0 }],
    ])('rejects %s', (_label, query) => {
        expect(makePaginationQuery().safeParse(query).success).toBe(false);
    });
});

describe('requiredString', () => {
    it("rejects an absent and an empty value with the caller's message", () => {
        const schema = requiredString('Ticker is required');
        expect(schema.safeParse('AAPL').success).toBe(true);
        expect(schema.safeParse('').error?.issues[0]?.message).toBe('Ticker is required');
        expect(schema.safeParse(undefined).error?.issues[0]?.message).toBe('Ticker is required');
    });
});

describe('idParam', () => {
    it('accepts a 24-character hex id in either case', () => {
        expect(idParam.safeParse({ id: '507f1f77bcf86cd799439011' }).success).toBe(true);
        expect(idParam.safeParse({ id: '507F1F77BCF86CD799439011' }).success).toBe(true);
    });

    it.each([
        ['too short', '507f1f77bcf86cd79943901'],
        ['too long', '507f1f77bcf86cd7994390111'],
        ['not hex', '507f1f77bcf86cd79943901z'],
        ['empty', ''],
    ])('rejects an id that is %s', (_label, id) => {
        expect(idParam.safeParse({ id }).success).toBe(false);
    });
});
