import { describe, expect, it } from 'vitest';
import { intrinsicValue, type ValuationInput } from '@/organize/intrinsic-value.js';
import type { Statement } from '@/organize/fundamentals.js';

const NOW = new Date('2026-09-05T00:00:00.000Z');

/**
 * Twenty quarters ending in `NOW`'s quarter, newest first, all profitable and
 * all with the same free cash flow — the shape that passes every guard so a
 * test can move one input at a time.
 */
function statements(overrides: Partial<Statement>[] = []): Statement[] {
    return Array.from({ length: 20 }, (_unused, index) => ({
        fiscalDateEnding: new Date(Date.UTC(2026, 6 - index * 3, 30)),
        reportedEPS: 1,
        totalRevenue: 1_000,
        netIncome: 100,
        freeCashFlow: 100,
        equity: 1_000,
        debt: 200,
        cashAndEq: 300,
        ...overrides[index],
    }));
}

function input(overrides: Partial<ValuationInput> = {}): ValuationInput {
    return {
        quarterly: statements(),
        sharesOutstanding: 100,
        splits: [],
        price: 10,
        now: NOW,
        ...overrides,
    };
}

describe('intrinsicValue', () => {
    it('values a steady profitable business above zero', () => {
        const value = intrinsicValue(input());
        expect(value).not.toBeNull();
        expect(value).toBeGreaterThan(0);
    });

    it('rounds to the cent', () => {
        const value = intrinsicValue(input()) ?? 0;
        expect(value).toBe(Math.round(value * 100) / 100);
    });

    it('scales inversely with the share count', () => {
        const one = intrinsicValue(input({ sharesOutstanding: 100 })) ?? 0;
        const two = intrinsicValue(input({ sharesOutstanding: 200 })) ?? 0;
        expect(two).toBeCloseTo(one / 2, 1);
    });

    it('adds net cash on top of the discounted business', () => {
        const withCash = intrinsicValue(input({ quarterly: statements([{ cashAndEq: 10_000 }]) })) ?? 0;
        const withoutCash = intrinsicValue(input({ quarterly: statements([{ cashAndEq: 0 }]) })) ?? 0;
        expect(withCash - withoutCash).toBeCloseTo(10_000 / 100, 2);
    });

    it('subtracts debt as part of net cash — the Python subtracted a code the vendor never sends', () => {
        const lowDebt = intrinsicValue(input({ quarterly: statements([{ debt: 0 }]) })) ?? 0;
        const highDebt = intrinsicValue(input({ quarterly: statements([{ debt: 500 }]) })) ?? 0;
        expect(lowDebt - highDebt).toBeCloseTo(5, 2);
    });

    it('grows the projection when cash flow has been rising', () => {
        const rising = statements().map((statement, index) => ({ ...statement, freeCashFlow: 200 - index * 5 }));
        const flat = statements();
        expect(intrinsicValue(input({ quarterly: rising })) ?? 0).toBeGreaterThan(
            intrinsicValue(input({ quarterly: flat })) ?? 0,
        );
    });
});

describe('the guards that return null', () => {
    it('refuses an empty statement set', () => {
        expect(intrinsicValue(input({ quarterly: [] }))).toBeNull();
    });

    it('refuses fewer than five years of quarters — the growth rate would span nothing', () => {
        expect(intrinsicValue(input({ quarterly: statements().slice(0, 19) }))).toBeNull();
    });

    it.each([
        ['no share count', null],
        ['a zero share count', 0],
        ['a negative share count', -100],
    ])('refuses %s', (_label, sharesOutstanding) => {
        expect(intrinsicValue(input({ sharesOutstanding }))).toBeNull();
    });

    it('refuses a filing more than a year old', () => {
        const stale = statements([{ fiscalDateEnding: new Date('2025-01-01T00:00:00.000Z') }]);
        expect(intrinsicValue(input({ quarterly: stale }))).toBeNull();
    });

    it('refuses a filing with no usable date at all', () => {
        const undated = statements([{ fiscalDateEnding: new Date('not a date') }]);
        expect(intrinsicValue(input({ quarterly: undated }))).toBeNull();
    });

    it.each([
        ['no equity', null],
        ['zero equity', 0],
        ['negative equity', -1_000],
    ])('refuses %s', (_label, equity) => {
        expect(intrinsicValue(input({ quarterly: statements([{ equity }]) }))).toBeNull();
    });

    it('refuses debt more than ten times equity', () => {
        expect(intrinsicValue(input({ quarterly: statements([{ debt: 10_001 }]) }))).toBeNull();
    });

    it('refuses a company that has reverse-split five times', () => {
        const splits = Array.from({ length: 5 }, () => ({ ratio: 0.1 }));
        expect(intrinsicValue(input({ splits }))).toBeNull();
    });

    it('accepts forward splits however many there are', () => {
        const splits = Array.from({ length: 20 }, () => ({ ratio: 2 }));
        expect(intrinsicValue(input({ splits }))).not.toBeNull();
    });

    it('treats a split with no ratio as a forward split rather than guessing', () => {
        const splits = Array.from({ length: 5 }, () => ({}));
        expect(intrinsicValue(input({ splits }))).not.toBeNull();
    });

    it('refuses a company loss-making in more than half of the last twelve quarters', () => {
        const lossy = statements().map((statement, index) =>
            index < 7 ? { ...statement, netIncome: -100 } : statement,
        );
        expect(intrinsicValue(input({ quarterly: lossy }))).toBeNull();
    });

    it('refuses a company with negative EPS in more than half of the last eight', () => {
        const lossy = statements().map((statement, index) =>
            index < 9 ? { ...statement, reportedEPS: -1 } : statement,
        );
        expect(intrinsicValue(input({ quarterly: lossy }))).toBeNull();
    });

    it('refuses EPS too volatile to extrapolate from', () => {
        const erratic = statements().map((statement, index) => ({
            ...statement,
            reportedEPS: index === 0 ? 1_000_000 : 0.01,
        }));
        expect(intrinsicValue(input({ quarterly: erratic }))).toBeNull();
    });

    it('accepts a company with too few EPS readings to judge the volatility of', () => {
        const sparse = statements().map((statement, index) =>
            index < 15 ? { ...statement, reportedEPS: null } : statement,
        );
        expect(intrinsicValue(input({ quarterly: sparse as unknown as Statement[] }))).not.toBeNull();
    });

    it('refuses a set missing any free cash flow reading', () => {
        const gap = statements([{}, {}, { freeCashFlow: null }]);
        expect(intrinsicValue(input({ quarterly: gap as unknown as Statement[] }))).toBeNull();
    });

    it('refuses a business whose most recent year burned cash', () => {
        const burning = statements().map((statement, index) =>
            index < 4 ? { ...statement, freeCashFlow: -100 } : statement,
        );
        expect(intrinsicValue(input({ quarterly: burning }))).toBeNull();
    });

    it('refuses cash flow too erratic to project — noise, not a trend', () => {
        const erratic = statements().map((statement, index) => ({
            ...statement,
            freeCashFlow: index % 8 < 4 ? 10_000 : 1,
        }));
        expect(intrinsicValue(input({ quarterly: erratic }))).toBeNull();
    });

    it('refuses a valuation more than a hundred times the traded price — that is a restated share count', () => {
        expect(intrinsicValue(input({ price: 0.001 }))).toBeNull();
    });

    it('still values a company with no traded price to compare against', () => {
        expect(intrinsicValue(input({ price: null }))).not.toBeNull();
        expect(intrinsicValue(input({ price: 0 }))).not.toBeNull();
    });

    it('defaults `now` to the current clock when the caller omits it', () => {
        const current = statements([{ fiscalDateEnding: new Date() }]);
        const { now: _unused, ...rest } = input({ quarterly: current });
        expect(intrinsicValue(rest)).not.toBeNull();
    });
});
