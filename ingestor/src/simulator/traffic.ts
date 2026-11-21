/**
 * The simulated market: which symbol trades next, at what price, and how busy
 * the tape is at a given minute. Pure, with the clock and the randomness passed
 * in, so the shape of a day can be tested without a socket.
 * Three things make it look like a real session rather than noise:
 *   - prices walk from the last real close, in small random steps;
 *   - a symbol trades in proportion to its last real volume, so the leaders
 *     print constantly and a small cap a few times an hour;
 *   - the tape is busiest at the open and the close, quietest at lunch.
 */

export type Random = () => number;

/** What the simulator starts a symbol from: its last real daily close and volume. */
export type LastBar = { symbol: string; close: number; volume: number };

type SimulatedSymbol = { symbol: string; price: number; volatility: number };

export type Market = {
    symbols: SimulatedSymbol[];
    /** Running totals of the symbols' volume shares, for picking one in proportion to it. */
    cumulative: number[];
};

const SESSION_SECONDS = 23_400;
const SESSION_MINUTES = 390;
const OPEN_MINUTE = 9 * 60 + 30;

/** A day's move for a typical stock, about 2%, whatever the trade rate. */
const DAILY_VOLATILITY = 0.02;

/** How much busier the open and the close are than lunch. */
const RUSH = 3;

/** The tape outside regular hours, against an average session minute. */
const OFF_HOURS = 0.1;

const NY_CLOCK = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
});

const NY_PARTS = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'longOffset',
});

/**
 * The market the simulator trades, built from the symbols' last real bars.
 * A symbol's per-trade step is sized from how often it will trade, so a leader
 * printing thousands of times a day moves about as much by the close as a small
 * cap printing a dozen times.
 */
export function buildMarket(bars: readonly LastBar[], tradesPerSecond: number): Market {
    const live = bars.filter((bar) => bar.close > 0);
    // A symbol with no volume still trades now and then, as an illiquid one does
    const weights = live.map((bar) => Math.max(bar.volume, 1));
    const total = weights.reduce((sum, weight) => sum + weight, 0);

    let running = 0;
    const cumulative = weights.map((weight) => {
        running += weight / total;
        return running;
    });

    const symbols = live.map((bar, i) => {
        const tradesPerDay = Math.max(tradesPerSecond * SESSION_SECONDS * ((weights[i] ?? 0) / total), 1);
        return { symbol: bar.symbol, price: bar.close, volatility: DAILY_VOLATILITY / Math.sqrt(tradesPerDay) };
    });

    return { symbols, cumulative };
}

/** The symbol that trades next, chosen in proportion to its volume. */
export function pickSymbol(market: Market, random: Random): SimulatedSymbol | null {
    const draw = random();
    let low = 0;
    let high = market.cumulative.length - 1;
    while (low < high) {
        const middle = Math.floor((low + high) / 2);
        if ((market.cumulative[middle] ?? 1) < draw) low = middle + 1;
        else high = middle;
    }
    return market.symbols[low] ?? null;
}

/** One trade's move. Multiplicative, so a price walks toward zero but never reaches it. */
export function nextPrice(symbol: SimulatedSymbol, random: Random): number {
    return symbol.price * Math.exp(symbol.volatility * gaussian(random));
}

/**
 * A price as the tape prints it: cents, or four places under a dollar. The walk
 * keeps its own precision, so rounding never accumulates into the trend.
 */
export function toPrintedPrice(price: number): number {
    const decimals = price < 1 ? 4 : 2;
    return Math.max(Number(price.toFixed(decimals)), 10 ** -decimals);
}

/**
 * How busy the tape is at `now`, against an average session minute: a U from
 * about twice the average at the bell to half of it at lunch, and a trickle
 * outside regular hours. The curve averages 1 over the session, so the trade
 * rate the simulator is given is the rate it delivers over a day.
 */
export function sessionIntensity(now: Date): number {
    const [hour = 0, minute = 0] = NY_CLOCK.format(now).split(':').map(Number);
    const fraction = (hour * 60 + minute - OPEN_MINUTE) / SESSION_MINUTES;
    if (fraction < 0 || fraction >= 1) return OFF_HOURS;
    const fromMiddle = 2 * fraction - 1;
    return (1 + RUSH * fromMiddle * fromMiddle) / (1 + RUSH / 3);
}

/**
 * How many trades to print in one tick of `tickMs`. The fractional part is
 * printed with that probability, so a rate of 0.3 a tick still averages 0.3.
 */
export function tradesInTick(tradesPerSecond: number, tickMs: number, intensity: number, random: Random): number {
    const expected = (tradesPerSecond * tickMs * intensity) / 1000;
    const whole = Math.floor(expected);
    return whole + (random() < expected - whole ? 1 : 0);
}

/**
 * An instant as the vendor stamps it: New York wall time with its offset and
 * nanosecond digits, `2026-11-11T10:31:02.123456789-05:00`. The digits below
 * the millisecond are filled in, as the real feed's are, so the aggregator's
 * parsing is exercised on the same shape.
 */
export function toVendorInstant(at: number, random: Random): string {
    const parts = Object.fromEntries(NY_PARTS.formatToParts(new Date(at)).map((part) => [part.type, part.value]));
    const zone = parts['timeZoneName'];
    // New York always has an offset; without one the aggregator would read the wall time as UTC
    if (zone?.startsWith('GMT') !== true) throw new Error(`No New York offset in ${String(zone)}`);
    const offset = zone.replace('GMT', '');
    const millis = String(at % 1000).padStart(3, '0');
    const nanos = String(Math.floor(random() * 1_000_000)).padStart(6, '0');
    return `${parts['year']}-${parts['month']}-${parts['day']}T${parts['hour']}:${parts['minute']}:${parts['second']}.${millis}${nanos}${offset}`;
}

/** A standard normal draw (Box–Muller). */
function gaussian(random: Random): number {
    // 1 - random() keeps the radius draw off zero, where the log is infinite
    const radius = 1 - random();
    const angle = random();
    return Math.sqrt(-2 * Math.log(radius)) * Math.cos(2 * Math.PI * angle);
}
