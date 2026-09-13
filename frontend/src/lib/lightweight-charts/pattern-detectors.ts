/**
 * One function per chart pattern. Each takes pivots (and, for flags, the bars
 * behind them) and reports every match it can see, with no awareness of what
 * the others found — deciding between two detectors that matched the same bars
 * is `pattern-detection.ts`'s job, not theirs.
 *
 * `confidence` is scaled off each detector's own tolerance, so it ranks matches
 * within a type and is not meaningful across types.
 */
import { calculateSlope } from '@/lib/lightweight-charts/pattern-pivots';
import { type OHLCData, type PatternMatch, type PivotPoint } from '@/lib/lightweight-charts/pattern-types';

// Two peaks closer together than this are one peak with noise on it, not a
// double top or bottom
const MIN_PEAK_SEPARATION = 5;

// A head within 2% of the shoulder line is a flat triple top, not head and
// shoulders — the prominence is what makes the pattern readable
const MIN_HEAD_PROMINENCE = 0.02;

export function detectDoubleTops(highs: PivotPoint[], tolerance = 0.02): PatternMatch[] {
    const patterns: PatternMatch[] = [];

    for (let i = 0; i < highs.length - 1; i++) {
        const first = highs[i];
        if (first === undefined) continue;

        for (let j = i + 1; j < highs.length; j++) {
            const second = highs[j];
            if (second === undefined) continue;

            const priceDiff = Math.abs(first.price - second.price);
            const avgPrice = (first.price + second.price) / 2;
            const priceDeviation = priceDiff / avgPrice;

            // The two peaks have to sit at similar levels, far enough apart
            if (priceDeviation > tolerance) continue;
            if (second.index - first.index < MIN_PEAK_SEPARATION) continue;

            patterns.push({
                type: 'doubleTop',
                points: [first, second],
                confidence: 1 - priceDeviation / tolerance,
                description: 'Double Top - Bearish Reversal',
                timeframe: { start: first.time, end: second.time },
            });
        }
    }

    return patterns;
}

export function detectDoubleBottoms(lows: PivotPoint[], tolerance = 0.02): PatternMatch[] {
    const patterns: PatternMatch[] = [];

    for (let i = 0; i < lows.length - 1; i++) {
        const first = lows[i];
        if (first === undefined) continue;

        for (let j = i + 1; j < lows.length; j++) {
            const second = lows[j];
            if (second === undefined) continue;

            const priceDiff = Math.abs(first.price - second.price);
            const avgPrice = (first.price + second.price) / 2;
            const priceDeviation = priceDiff / avgPrice;

            if (priceDeviation > tolerance) continue;
            if (second.index - first.index < MIN_PEAK_SEPARATION) continue;

            patterns.push({
                type: 'doubleBottom',
                points: [first, second],
                confidence: 1 - priceDeviation / tolerance,
                description: 'Double Bottom - Bullish Reversal',
                timeframe: { start: first.time, end: second.time },
            });
        }
    }

    return patterns;
}

// "Head and shoulders" is one pattern's proper name, not two jobs joined
// eslint-disable-next-line contracts/name-contract
export function detectHeadAndShoulders(highs: PivotPoint[], tolerance = 0.03): PatternMatch[] {
    const patterns: PatternMatch[] = [];

    for (let i = 0; i < highs.length - 2; i++) {
        const leftShoulder = highs[i];
        const head = highs[i + 1];
        const rightShoulder = highs[i + 2];
        if (leftShoulder === undefined || head === undefined || rightShoulder === undefined) continue;

        // Head should be higher than both shoulders
        if (head.price <= leftShoulder.price || head.price <= rightShoulder.price) continue;

        // Shoulders should be roughly at the same level
        const shoulderDiff = Math.abs(leftShoulder.price - rightShoulder.price);
        const avgShoulderPrice = (leftShoulder.price + rightShoulder.price) / 2;
        const shoulderDeviation = shoulderDiff / avgShoulderPrice;
        if (shoulderDeviation > tolerance) continue;

        const headHeight = (head.price - avgShoulderPrice) / avgShoulderPrice;
        if (headHeight < MIN_HEAD_PROMINENCE) continue;

        patterns.push({
            type: 'headAndShoulders',
            points: [leftShoulder, head, rightShoulder],
            confidence: Math.min(1, 1 - shoulderDeviation / tolerance),
            description: 'Head and Shoulders - Bearish Reversal',
            timeframe: { start: leftShoulder.time, end: rightShoulder.time },
        });
    }

    return patterns;
}

// "Head and shoulders" is one pattern's proper name, not two jobs joined
// eslint-disable-next-line contracts/name-contract
export function detectInverseHeadAndShoulders(lows: PivotPoint[], tolerance = 0.03): PatternMatch[] {
    const patterns: PatternMatch[] = [];

    for (let i = 0; i < lows.length - 2; i++) {
        const leftShoulder = lows[i];
        const head = lows[i + 1];
        const rightShoulder = lows[i + 2];
        if (leftShoulder === undefined || head === undefined || rightShoulder === undefined) continue;

        // Head should be lower than both shoulders
        if (head.price >= leftShoulder.price || head.price >= rightShoulder.price) continue;

        const shoulderDiff = Math.abs(leftShoulder.price - rightShoulder.price);
        const avgShoulderPrice = (leftShoulder.price + rightShoulder.price) / 2;
        const shoulderDeviation = shoulderDiff / avgShoulderPrice;
        if (shoulderDeviation > tolerance) continue;

        const headDepth = (avgShoulderPrice - head.price) / avgShoulderPrice;
        if (headDepth < MIN_HEAD_PROMINENCE) continue;

        patterns.push({
            type: 'inverseHeadAndShoulders',
            points: [leftShoulder, head, rightShoulder],
            confidence: Math.min(1, 1 - shoulderDeviation / tolerance),
            description: 'Inverse Head and Shoulders - Bullish Reversal',
            timeframe: { start: leftShoulder.time, end: rightShoulder.time },
        });
    }

    return patterns;
}

/**
 * Ascending, descending and symmetric triangles, told apart by which of the
 * two boundary lines is flat. Only the last five pivots on each side are
 * considered — a triangle is a statement about the current consolidation, and
 * fitting the whole history would find one in any range-bound stretch.
 */
export function detectTriangles(highs: PivotPoint[], lows: PivotPoint[]): PatternMatch[] {
    const patterns: PatternMatch[] = [];

    if (highs.length < 2 || lows.length < 2) return patterns;

    const recentHighs = highs.slice(-Math.min(5, highs.length));
    const recentLows = lows.slice(-Math.min(5, lows.length));
    if (recentHighs.length < 2 || recentLows.length < 2) return patterns;

    const highSlope = calculateSlope(recentHighs);
    const lowSlope = calculateSlope(recentLows);

    const allPoints = [...recentHighs, ...recentLows].sort((a, b) => a.time - b.time);
    const firstPoint = allPoints[0];
    const lastPoint = allPoints[allPoints.length - 1];
    if (firstPoint === undefined || lastPoint === undefined) return patterns;

    const timeframe = { start: firstPoint.time, end: lastPoint.time };

    // Flat resistance, rising support
    if (Math.abs(highSlope) < 0.01 && lowSlope > 0.02) {
        patterns.push({
            type: 'ascendingTriangle',
            points: allPoints,
            confidence: 0.7,
            description: 'Ascending Triangle - Bullish Continuation',
            timeframe,
        });
    }

    // Declining resistance, flat support
    if (highSlope < -0.02 && Math.abs(lowSlope) < 0.01) {
        patterns.push({
            type: 'descendingTriangle',
            points: allPoints,
            confidence: 0.7,
            description: 'Descending Triangle - Bearish Continuation',
            timeframe,
        });
    }

    // Both lines converging on each other
    if (highSlope < -0.01 && lowSlope > 0.01 && Math.abs(highSlope + lowSlope) < 0.03) {
        patterns.push({
            type: 'symmetricTriangle',
            points: allPoints,
            confidence: 0.65,
            description: 'Symmetric Triangle - Continuation (Direction Uncertain)',
            timeframe,
        });
    }

    return patterns;
}

/**
 * A flag is a sharp move followed by a shallow consolidation against it, so
 * this one needs the bars as well as the pivots: the move is measured on
 * closes over the ten bars before the last fifteen.
 */
export function detectFlags(data: OHLCData[], highs: PivotPoint[], lows: PivotPoint[]): PatternMatch[] {
    const patterns: PatternMatch[] = [];

    if (data.length < 20 || highs.length < 2 || lows.length < 2) return patterns;

    const recentBars = 15;
    const trendBars = 10;
    const trendStart = data[data.length - recentBars - trendBars];
    const consolidationStart = data[data.length - recentBars];
    const lastBar = data[data.length - 1];

    if (trendStart === undefined || consolidationStart === undefined || lastBar === undefined) return patterns;

    const trendMove = (consolidationStart.close - trendStart.close) / trendStart.close;
    const recentHighs = highs.filter((h) => h.index >= data.length - recentBars);
    const recentLows = lows.filter((l) => l.index >= data.length - recentBars);
    if (recentHighs.length < 2 || recentLows.length < 2) return patterns;

    const highSlope = calculateSlope(recentHighs);
    const lowSlope = calculateSlope(recentLows);
    const timeframe = { start: consolidationStart.time, end: lastBar.time };
    const isParallel = Math.abs(highSlope - lowSlope) < 0.02;

    // A strong rise, then a drift that is flat or slightly against it
    if (trendMove > 0.05 && highSlope < 0.01 && lowSlope < 0.01 && isParallel) {
        patterns.push({
            type: 'bullishFlag',
            points: [...recentHighs, ...recentLows],
            confidence: 0.7,
            description: 'Bullish Flag - Continuation Pattern',
            timeframe,
        });
    }

    if (trendMove < -0.05 && highSlope > -0.01 && lowSlope > -0.01 && isParallel) {
        patterns.push({
            type: 'bearishFlag',
            points: [...recentHighs, ...recentLows],
            confidence: 0.7,
            description: 'Bearish Flag - Continuation Pattern',
            timeframe,
        });
    }

    return patterns;
}
