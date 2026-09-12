/**
 * Pattern Detection Utilities for Technical Analysis
 * Implements geometric/rule-based pattern recognition algorithms
 */

export type PivotPoint = {
    index: number;
    time: number;
    price: number;
};

export type PatternMatch = {
    type: PatternType;
    points: PivotPoint[];
    confidence: number;
    description: string;
    timeframe: { start: number; end: number };
};

export type PatternType =
    | 'doubleTop'
    | 'doubleBottom'
    | 'headAndShoulders'
    | 'inverseHeadAndShoulders'
    | 'ascendingTriangle'
    | 'descendingTriangle'
    | 'symmetricTriangle'
    | 'bullishFlag'
    | 'bearishFlag'
    | 'wedgeRising'
    | 'wedgeFalling';

export type OHLCData = {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
};

// Two peaks closer together than this are one peak with noise on it, not a
// double top or bottom
const MIN_PEAK_SEPARATION = 5;

// A head within 2% of the shoulder line is a flat triple top, not head and
// shoulders — the prominence is what makes the pattern readable
const MIN_HEAD_PROMINENCE = 0.02;

// Share of a match's span that may overlap a higher-confidence match before the
// two are the same finding reported twice
const MAX_PATTERN_OVERLAP = 0.6;

/**
 * Find pivot highs and lows in price data
 */
export function getPivots(
    data: OHLCData[],
    options: { leftBars?: number; rightBars?: number } = {},
): { highs: PivotPoint[]; lows: PivotPoint[] } {
    const { leftBars = 5, rightBars = 5 } = options;
    const highs: PivotPoint[] = [];
    const lows: PivotPoint[] = [];

    for (let i = leftBars; i < data.length - rightBars; i++) {
        const bar = data[i];
        if (bar === undefined) continue;

        // Check if it's a pivot high
        let isHigh = true;
        for (let j = i - leftBars; j <= i + rightBars; j++) {
            const other = data[j];
            if (j !== i && other !== undefined && other.high >= bar.high) {
                isHigh = false;
                break;
            }
        }
        if (isHigh) {
            highs.push({
                index: i,
                time: bar.time,
                price: bar.high,
            });
        }

        // Check if it's a pivot low
        let isLow = true;
        for (let j = i - leftBars; j <= i + rightBars; j++) {
            const other = data[j];
            if (j !== i && other !== undefined && other.low <= bar.low) {
                isLow = false;
                break;
            }
        }
        if (isLow) {
            lows.push({
                index: i,
                time: bar.time,
                price: bar.low,
            });
        }
    }

    return { highs, lows };
}

/**
 * Detect Double Top patterns
 */
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

/**
 * Detect Double Bottom patterns
 */
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

/**
 * Detect Head and Shoulders pattern
 */
// "Head and shoulders" is one pattern's proper name, not two jobs joined
// eslint-disable-next-line contracts/name-contract
export function detectHeadAndShoulders(highs: PivotPoint[], tolerance = 0.03): PatternMatch[] {
    const patterns: PatternMatch[] = [];

    // Need at least 3 peaks for H&S
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

/**
 * Detect Inverse Head and Shoulders pattern
 */
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
 * Calculate linear regression for trendline slope
 */
function calculateSlope(points: PivotPoint[]): number {
    if (points.length < 2) return 0;

    const count = points.length;
    let sumX = 0,
        sumY = 0,
        sumXY = 0,
        sumX2 = 0;

    points.forEach((point, idx) => {
        sumX += idx;
        sumY += point.price;
        sumXY += idx * point.price;
        sumX2 += idx * idx;
    });

    const slope = (count * sumXY - sumX * sumY) / (count * sumX2 - sumX * sumX);
    return slope;
}

/**
 * Detect Triangle patterns (Ascending, Descending, Symmetric)
 */
export function detectTriangles(highs: PivotPoint[], lows: PivotPoint[]): PatternMatch[] {
    const patterns: PatternMatch[] = [];

    // Need at least 2 highs and 2 lows
    if (highs.length < 2 || lows.length < 2) return patterns;

    // Look for recent pivots (last 20-50 bars)
    const recentHighs = highs.slice(-Math.min(5, highs.length));
    const recentLows = lows.slice(-Math.min(5, lows.length));

    if (recentHighs.length >= 2 && recentLows.length >= 2) {
        const highSlope = calculateSlope(recentHighs);
        const lowSlope = calculateSlope(recentLows);

        const allPoints = [...recentHighs, ...recentLows].sort((a, b) => a.time - b.time);
        const firstPoint = allPoints[0];
        const lastPoint = allPoints[allPoints.length - 1];
        if (firstPoint === undefined || lastPoint === undefined) return patterns;

        const timeframe = {
            start: firstPoint.time,
            end: lastPoint.time,
        };

        // Ascending Triangle: flat resistance, rising support
        if (Math.abs(highSlope) < 0.01 && lowSlope > 0.02) {
            patterns.push({
                type: 'ascendingTriangle',
                points: allPoints,
                confidence: 0.7,
                description: 'Ascending Triangle - Bullish Continuation',
                timeframe,
            });
        }

        // Descending Triangle: declining resistance, flat support
        if (highSlope < -0.02 && Math.abs(lowSlope) < 0.01) {
            patterns.push({
                type: 'descendingTriangle',
                points: allPoints,
                confidence: 0.7,
                description: 'Descending Triangle - Bearish Continuation',
                timeframe,
            });
        }

        // Symmetric Triangle: converging trendlines
        if (highSlope < -0.01 && lowSlope > 0.01 && Math.abs(highSlope + lowSlope) < 0.03) {
            patterns.push({
                type: 'symmetricTriangle',
                points: allPoints,
                confidence: 0.65,
                description: 'Symmetric Triangle - Continuation (Direction Uncertain)',
                timeframe,
            });
        }
    }

    return patterns;
}

/**
 * Detect Flag patterns (Bullish and Bearish)
 */
export function detectFlags(data: OHLCData[], highs: PivotPoint[], lows: PivotPoint[]): PatternMatch[] {
    const patterns: PatternMatch[] = [];

    if (data.length < 20 || highs.length < 2 || lows.length < 2) return patterns;

    // Look at recent price action
    const recentBars = 15;

    // Calculate if there's a strong trend before the consolidation
    const trendBars = 10;
    const trendStart = data[data.length - recentBars - trendBars];
    const consolidationStart = data[data.length - recentBars];
    const lastBar = data[data.length - 1];

    if (trendStart === undefined || consolidationStart === undefined || lastBar === undefined) return patterns;

    const trendMove = (consolidationStart.close - trendStart.close) / trendStart.close;

    // Strong uptrend followed by sideways/slight down movement = bullish flag
    if (trendMove > 0.05) {
        const recentHighs = highs.filter((h) => h.index >= data.length - recentBars);
        const recentLows = lows.filter((l) => l.index >= data.length - recentBars);

        if (recentHighs.length >= 2 && recentLows.length >= 2) {
            const highSlope = calculateSlope(recentHighs);
            const lowSlope = calculateSlope(recentLows);

            // Parallel or slightly declining lines
            if (highSlope < 0.01 && lowSlope < 0.01 && Math.abs(highSlope - lowSlope) < 0.02) {
                patterns.push({
                    type: 'bullishFlag',
                    points: [...recentHighs, ...recentLows],
                    confidence: 0.7,
                    description: 'Bullish Flag - Continuation Pattern',
                    timeframe: {
                        start: consolidationStart.time,
                        end: lastBar.time,
                    },
                });
            }
        }
    }

    // Strong downtrend followed by sideways/slight up movement = bearish flag
    if (trendMove < -0.05) {
        const recentHighs = highs.filter((h) => h.index >= data.length - recentBars);
        const recentLows = lows.filter((l) => l.index >= data.length - recentBars);

        if (recentHighs.length >= 2 && recentLows.length >= 2) {
            const highSlope = calculateSlope(recentHighs);
            const lowSlope = calculateSlope(recentLows);

            if (highSlope > -0.01 && lowSlope > -0.01 && Math.abs(highSlope - lowSlope) < 0.02) {
                patterns.push({
                    type: 'bearishFlag',
                    points: [...recentHighs, ...recentLows],
                    confidence: 0.7,
                    description: 'Bearish Flag - Continuation Pattern',
                    timeframe: {
                        start: consolidationStart.time,
                        end: lastBar.time,
                    },
                });
            }
        }
    }

    return patterns;
}

/**
 * Main pattern detection function
 */
export function detectAllPatterns(
    data: OHLCData[],
    options: {
        minBarsForPivot?: number;
        tolerance?: number;
        enabledPatterns?: PatternType[];
    } = {},
): PatternMatch[] {
    const {
        minBarsForPivot = 5,
        tolerance = 0.025,
        enabledPatterns = [
            'doubleTop',
            'doubleBottom',
            'headAndShoulders',
            'inverseHeadAndShoulders',
            'ascendingTriangle',
            'descendingTriangle',
            'symmetricTriangle',
            'bullishFlag',
            'bearishFlag',
        ],
    } = options;

    if (data.length < 20) return [];

    const { highs, lows } = getPivots(data, { leftBars: minBarsForPivot, rightBars: minBarsForPivot });
    const allPatterns: PatternMatch[] = [];

    // Detect each pattern type if enabled
    if (enabledPatterns.includes('doubleTop')) {
        allPatterns.push(...detectDoubleTops(highs, tolerance));
    }

    if (enabledPatterns.includes('doubleBottom')) {
        allPatterns.push(...detectDoubleBottoms(lows, tolerance));
    }

    if (enabledPatterns.includes('headAndShoulders')) {
        allPatterns.push(...detectHeadAndShoulders(highs, tolerance));
    }

    if (enabledPatterns.includes('inverseHeadAndShoulders')) {
        allPatterns.push(...detectInverseHeadAndShoulders(lows, tolerance));
    }

    const triangles = detectTriangles(highs, lows);
    triangles.forEach((pattern) => {
        if (enabledPatterns.includes(pattern.type)) {
            allPatterns.push(pattern);
        }
    });

    const flags = detectFlags(data, highs, lows);
    flags.forEach((pattern) => {
        if (enabledPatterns.includes(pattern.type)) {
            allPatterns.push(pattern);
        }
    });

    // Sort by confidence and remove overlapping patterns
    return deduplicatePatterns(allPatterns);
}

/**
 * Remove overlapping patterns, keeping the highest confidence ones
 */
function deduplicatePatterns(patterns: PatternMatch[]): PatternMatch[] {
    if (patterns.length === 0) return patterns;

    // Sort by confidence descending
    const sorted = [...patterns].sort((a, b) => b.confidence - a.confidence);
    const result: PatternMatch[] = [];

    for (const pattern of sorted) {
        if (!result.some((existing) => isOverlapping(pattern, existing))) {
            result.push(pattern);
        }
    }

    return result;
}

/**
 * Two matches covering mostly the same bars are one finding reported twice
 */
function isOverlapping(pattern: PatternMatch, existing: PatternMatch): boolean {
    const overlapStart = Math.max(pattern.timeframe.start, existing.timeframe.start);
    const overlapEnd = Math.min(pattern.timeframe.end, existing.timeframe.end);
    if (overlapStart >= overlapEnd) return false;

    const overlapDuration = overlapEnd - overlapStart;
    const patternDuration = pattern.timeframe.end - pattern.timeframe.start;

    return overlapDuration / patternDuration > MAX_PATTERN_OVERLAP;
}
