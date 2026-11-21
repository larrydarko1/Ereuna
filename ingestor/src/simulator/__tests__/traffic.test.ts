import { assert, describe, expect, it } from 'vitest';

import {
    buildMarket,
    nextPrice,
    pickSymbol,
    sessionIntensity,
    toPrintedPrice,
    toVendorInstant,
    tradesInTick,
} from '@/simulator/traffic.js';

const BARS = [
    { symbol: 'AAPL', close: 200, volume: 3 },
    { symbol: 'MSFT', close: 400, volume: 1 },
];

/** A seeded generator (mulberry32), so a statistical test draws the same numbers every run. */
function seeded(seed: number): () => number {
    let state = seed;
    return (): number => {
        state = (state + 0x6d2b79f5) | 0;
        let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
        mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
        return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
    };
}

const always =
    (value: number): (() => number) =>
    (): number =>
        value;

describe('buildMarket', () => {
    it('starts every symbol from its last real close', () => {
        const market = buildMarket(BARS, 20);
        expect(market.symbols.map(({ symbol, price }) => [symbol, price])).toEqual([
            ['AAPL', 200],
            ['MSFT', 400],
        ]);
    });

    it('leaves out a symbol with no price to walk from', () => {
        const market = buildMarket([...BARS, { symbol: 'DEAD', close: 0, volume: 10 }], 20);
        expect(market.symbols.map(({ symbol }) => symbol)).toEqual(['AAPL', 'MSFT']);
    });

    it.each([
        ['AAPL', 0.75],
        ['MSFT', 0.25],
    ])('sizes %s so it moves about 2%% over a session, however often it trades', (ticker, share) => {
        const symbol = buildMarket(BARS, 20).symbols.find((candidate) => candidate.symbol === ticker);
        assert.isDefined(symbol);
        expect(symbol.volatility * Math.sqrt(20 * 23_400 * share)).toBeCloseTo(0.02, 6);
    });
});

describe('pickSymbol', () => {
    it('chooses by share of volume', () => {
        const market = buildMarket(BARS, 20);
        expect(pickSymbol(market, always(0.7))?.symbol).toBe('AAPL');
        expect(pickSymbol(market, always(0.8))?.symbol).toBe('MSFT');
    });

    it('trades the busiest symbol in proportion to its volume', () => {
        const market = buildMarket(BARS, 20);
        const random = seeded(7);
        const draws = Array.from({ length: 20_000 }, () => pickSymbol(market, random)?.symbol);
        const share = draws.filter((symbol) => symbol === 'AAPL').length / draws.length;
        expect(share).toBeCloseTo(0.75, 1);
    });

    it('still trades a symbol that printed no volume, as an illiquid one does', () => {
        const market = buildMarket([{ symbol: 'THIN', close: 5, volume: 0 }], 20);
        expect(pickSymbol(market, always(0.5))?.symbol).toBe('THIN');
    });

    it('has nothing to pick from an empty market', () => {
        expect(pickSymbol(buildMarket([], 20), always(0.5))).toBeNull();
    });
});

describe('nextPrice', () => {
    it('moves the price by a step of the symbol size', () => {
        const [symbol] = buildMarket(BARS, 20).symbols;
        assert.isDefined(symbol);
        const next = nextPrice(symbol, seeded(1));
        expect(next).not.toBe(200);
        expect(Math.abs(next / 200 - 1)).toBeLessThan(0.01);
    });

    it('never reaches zero, however wild the walk', () => {
        const random = seeded(3);
        const symbol = { symbol: 'WILD', price: 1, volatility: 0.5 };
        for (let i = 0; i < 10_000; i++) symbol.price = nextPrice(symbol, random);
        expect(symbol.price).toBeGreaterThan(0);
    });
});

describe('toPrintedPrice', () => {
    it.each([
        [123.456, 123.46],
        [0.123456, 0.1235],
        [0.000_01, 0.0001],
    ])('prints %f as %f', (price, printed) => {
        expect(toPrintedPrice(price)).toBe(printed);
    });
});

describe('sessionIntensity', () => {
    it.each([
        ['the open', '2026-11-11T14:30:00Z', 2],
        ['lunch', '2026-11-11T17:45:00Z', 0.5],
        ['before the open', '2026-11-11T13:00:00Z', 0.1],
        ['the close', '2026-11-11T21:00:00Z', 0.1],
    ])('runs the tape at %s at %f of the average', (_label, instant, intensity) => {
        expect(sessionIntensity(new Date(instant))).toBeCloseTo(intensity, 2);
    });

    it('follows New York time across the daylight saving change', () => {
        expect(sessionIntensity(new Date('2026-07-01T13:30:00Z'))).toBeCloseTo(2, 2);
    });

    it('averages 1 over the session, so the rate given is the rate delivered', () => {
        const open = Date.parse('2026-11-11T14:30:00Z');
        const minutes = Array.from({ length: 390 }, (_, minute) => sessionIntensity(new Date(open + minute * 60_000)));
        expect(minutes.reduce((sum, value) => sum + value, 0) / minutes.length).toBeCloseTo(1, 2);
    });
});

describe('tradesInTick', () => {
    it('prints the whole part of the expected count every tick', () => {
        expect(tradesInTick(20, 100, 1, always(0.99))).toBe(2);
    });

    it('prints the fractional part with that probability', () => {
        expect(tradesInTick(3, 100, 1, always(0.2))).toBe(1);
        expect(tradesInTick(3, 100, 1, always(0.5))).toBe(0);
    });

    it('scales with how busy the tape is', () => {
        expect(tradesInTick(20, 100, 2, always(0.99))).toBe(4);
    });
});

describe('toVendorInstant', () => {
    it('stamps New York wall time with its offset and nanosecond digits', () => {
        expect(toVendorInstant(Date.parse('2026-11-11T15:31:02.123Z'), always(0.5))).toBe(
            '2026-11-11T10:31:02.123500000-05:00',
        );
    });

    it('carries the summer offset', () => {
        expect(toVendorInstant(Date.parse('2026-07-01T15:00:00.007Z'), always(0))).toBe(
            '2026-07-01T11:00:00.007000000-04:00',
        );
    });

    it('reads back as the same instant', () => {
        const at = Date.parse('2026-11-11T20:59:59.999Z');
        expect(Date.parse(toVendorInstant(at, seeded(5)))).toBe(at);
    });
});
