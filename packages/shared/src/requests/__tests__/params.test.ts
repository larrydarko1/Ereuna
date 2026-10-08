import { describe, expect, it } from 'vitest';

import { filterParams, idParam, logoParams, tradeParams } from '#requests/params.js';

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

describe('tradeParams', () => {
    it('reads a slot and a trade id, the slot coerced from its path segment', () => {
        expect(tradeParams.parse({ number: '2', id: '507f1f77bcf86cd799439011' })).toEqual({
            number: 2,
            id: '507f1f77bcf86cd799439011',
        });
    });
});

describe('filterParams', () => {
    it('takes a key the screener registry holds, and no other', () => {
        expect(filterParams.parse({ name: 'Growth', filter: 'pe' })).toEqual({ name: 'Growth', filter: 'pe' });
        expect(filterParams.safeParse({ name: 'Growth', filter: 'made-up' }).success).toBe(false);
    });
});

describe('logoParams', () => {
    it('accepts an exchange and a mark file, the colon of a crypto pair included', () => {
        expect(logoParams.safeParse({ exchange: 'NASDAQ', file: 'AAPL.svg' }).success).toBe(true);
        expect(logoParams.safeParse({ exchange: 'CRYPTO', file: 'XAUT:USD.svg' }).success).toBe(true);
    });

    it.each([
        ['a dot segment', { exchange: 'NASDAQ', file: '..svg' }],
        ['a separator', { exchange: 'NAS/DAQ', file: 'AAPL.svg' }],
        ['another extension', { exchange: 'NASDAQ', file: 'AAPL.png' }],
    ])('refuses %s — no path may leave the logo root', (_label, params) => {
        expect(logoParams.safeParse(params).success).toBe(false);
    });
});
