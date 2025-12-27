/**
 * Pattern Detection Utilities for Technical Analysis
 * Implements geometric/rule-based pattern recognition algorithms
 */

export interface PivotPoint {
    index: number;
    time: number;
    price: number;
}

export interface PatternMatch {
    type: PatternType;
    points: PivotPoint[];
    confidence: number;
    description: string;
    timeframe: { start: number; end: number };
}

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

export interface OHLCData {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
}

/**
 * Find pivot highs and lows in price data
 */
export function findPivots(
    data: OHLCData[],
    leftBars: number = 5,
    rightBars: number = 5
): { highs: PivotPoint[]; lows: PivotPoint[] } {
    const highs: PivotPoint[] = [];
    const lows: PivotPoint[] = [];

    for (let i = leftBars; i < data.length - rightBars; i++) {
        // Check if it's a pivot high
        let isHigh = true;
        for (let j = i - leftBars; j <= i + rightBars; j++) {
            if (j !== i && data[j].high >= data[i].high) {
                isHigh = false;
                break;
            }
        }
        if (isHigh) {
            highs.push({
                index: i,
                time: data[i].time,
                price: data[i].high
            });
        }

        // Check if it's a pivot low
        let isLow = true;
        for (let j = i - leftBars; j <= i + rightBars; j++) {
            if (j !== i && data[j].low <= data[i].low) {
                isLow = false;
                break;
            }
        }
        if (isLow) {
            lows.push({
                index: i,
                time: data[i].time,
                price: data[i].low
            });
        }
    }

    return { highs, lows };
}

/**
 * Detect Double Top patterns
 */
export function detectDoubleTops(
    highs: PivotPoint[],
    tolerance: number = 0.02
): PatternMatch[] {
    const patterns: PatternMatch[] = [];

    for (let i = 0; i < highs.length - 1; i++) {
        for (let j = i + 1; j < highs.length; j++) {
            const priceDiff = Math.abs(highs[i].price - highs[j].price);
            const avgPrice = (highs[i].price + highs[j].price) / 2;
            const priceDeviation = priceDiff / avgPrice;

            // Check if the two peaks are at similar levels
            if (priceDeviation <= tolerance) {
                // Require some time separation between peaks
                const timeSeparation = highs[j].index - highs[i].index;
                if (timeSeparation >= 5) {
                    patterns.push({
                        type: 'doubleTop',
                        points: [highs[i], highs[j]],
                        confidence: 1 - priceDeviation / tolerance,
                        description: 'Double Top - Bearish Reversal',
                        timeframe: { start: highs[i].time, end: highs[j].time }
                    });
                }
            }
        }
    }

    return patterns;
}

/**
 * Detect Double Bottom patterns
 */
export function detectDoubleBottoms(
    lows: PivotPoint[],
    tolerance: number = 0.02
): PatternMatch[] {
    const patterns: PatternMatch[] = [];

    for (let i = 0; i < lows.length - 1; i++) {
        for (let j = i + 1; j < lows.length; j++) {
            const priceDiff = Math.abs(lows[i].price - lows[j].price);
            const avgPrice = (lows[i].price + lows[j].price) / 2;
            const priceDeviation = priceDiff / avgPrice;

            if (priceDeviation <= tolerance) {
                const timeSeparation = lows[j].index - lows[i].index;
                if (timeSeparation >= 5) {
                    patterns.push({
                        type: 'doubleBottom',
                        points: [lows[i], lows[j]],
                        confidence: 1 - priceDeviation / tolerance,
                        description: 'Double Bottom - Bullish Reversal',
                        timeframe: { start: lows[i].time, end: lows[j].time }
                    });
                }
            }
        }
    }

    return patterns;
}

/**
 * Detect Head and Shoulders pattern
 */
export function detectHeadAndShoulders(
    highs: PivotPoint[],
    tolerance: number = 0.03
): PatternMatch[] {
    const patterns: PatternMatch[] = [];

    // Need at least 3 peaks for H&S
    for (let i = 0; i < highs.length - 2; i++) {
        const leftShoulder = highs[i];
        const head = highs[i + 1];
        const rightShoulder = highs[i + 2];

        // Head should be higher than both shoulders
        if (head.price > leftShoulder.price && head.price > rightShoulder.price) {
            // Shoulders should be roughly at the same level
            const shoulderDiff = Math.abs(leftShoulder.price - rightShoulder.price);
            const avgShoulderPrice = (leftShoulder.price + rightShoulder.price) / 2;
            const shoulderDeviation = shoulderDiff / avgShoulderPrice;

            if (shoulderDeviation <= tolerance) {
                // Head should be significantly higher than shoulders (at least 2% higher)
                const headHeight = (head.price - avgShoulderPrice) / avgShoulderPrice;
                if (headHeight >= 0.02) {
                    patterns.push({
                        type: 'headAndShoulders',
                        points: [leftShoulder, head, rightShoulder],
                        confidence: Math.min(1, 1 - shoulderDeviation / tolerance),
                        description: 'Head and Shoulders - Bearish Reversal',
                        timeframe: { start: leftShoulder.time, end: rightShoulder.time }
                    });
                }
            }
        }
    }

    return patterns;
}

/**
 * Detect Inverse Head and Shoulders pattern
 */
export function detectInverseHeadAndShoulders(
    lows: PivotPoint[],
    tolerance: number = 0.03
): PatternMatch[] {
    const patterns: PatternMatch[] = [];

    for (let i = 0; i < lows.length - 2; i++) {
        const leftShoulder = lows[i];
        const head = lows[i + 1];
        const rightShoulder = lows[i + 2];

        // Head should be lower than both shoulders
        if (head.price < leftShoulder.price && head.price < rightShoulder.price) {
            const shoulderDiff = Math.abs(leftShoulder.price - rightShoulder.price);
            const avgShoulderPrice = (leftShoulder.price + rightShoulder.price) / 2;
            const shoulderDeviation = shoulderDiff / avgShoulderPrice;

            if (shoulderDeviation <= tolerance) {
                const headDepth = (avgShoulderPrice - head.price) / avgShoulderPrice;
                if (headDepth >= 0.02) {
                    patterns.push({
                        type: 'inverseHeadAndShoulders',
                        points: [leftShoulder, head, rightShoulder],
                        confidence: Math.min(1, 1 - shoulderDeviation / tolerance),
                        description: 'Inverse Head and Shoulders - Bullish Reversal',
                        timeframe: { start: leftShoulder.time, end: rightShoulder.time }
                    });
                }
            }
        }
    }

    return patterns;
}

/**
 * Calculate linear regression for trendline slope
 */
function calculateSlope(points: PivotPoint[]): number {
    if (points.length < 2) return 0;

    const n = points.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    points.forEach((point, idx) => {
        sumX += idx;
        sumY += point.price;
        sumXY += idx * point.price;
        sumX2 += idx * idx;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
}

/**
 * Detect Triangle patterns (Ascending, Descending, Symmetric)
 */
export function detectTriangles(
    highs: PivotPoint[],
    lows: PivotPoint[],
    minPoints: number = 4
): PatternMatch[] {
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
        const timeframe = {
            start: allPoints[0].time,
            end: allPoints[allPoints.length - 1].time
        };

        // Ascending Triangle: flat resistance, rising support
        if (Math.abs(highSlope) < 0.01 && lowSlope > 0.02) {
            patterns.push({
                type: 'ascendingTriangle',
                points: allPoints,
                confidence: 0.7,
                description: 'Ascending Triangle - Bullish Continuation',
                timeframe
            });
        }

        // Descending Triangle: declining resistance, flat support
        if (highSlope < -0.02 && Math.abs(lowSlope) < 0.01) {
            patterns.push({
                type: 'descendingTriangle',
                points: allPoints,
                confidence: 0.7,
                description: 'Descending Triangle - Bearish Continuation',
                timeframe
            });
        }

        // Symmetric Triangle: converging trendlines
        if (highSlope < -0.01 && lowSlope > 0.01 && Math.abs(highSlope + lowSlope) < 0.03) {
            patterns.push({
                type: 'symmetricTriangle',
                points: allPoints,
                confidence: 0.65,
                description: 'Symmetric Triangle - Continuation (Direction Uncertain)',
                timeframe
            });
        }
    }

    return patterns;
}

/**
 * Detect Flag patterns (Bullish and Bearish)
 */
export function detectFlags(
    data: OHLCData[],
    highs: PivotPoint[],
    lows: PivotPoint[]
): PatternMatch[] {
    const patterns: PatternMatch[] = [];

    if (data.length < 20 || highs.length < 2 || lows.length < 2) return patterns;

    // Look at recent price action
    const recentBars = 15;
    const recentData = data.slice(-recentBars);

    // Calculate if there's a strong trend before the consolidation
    const trendBars = 10;
    const trendStart = data[data.length - recentBars - trendBars];
    const consolidationStart = data[data.length - recentBars];

    if (!trendStart || !consolidationStart) return patterns;

    const trendMove = (consolidationStart.close - trendStart.close) / trendStart.close;

    // Strong uptrend followed by sideways/slight down movement = bullish flag
    if (trendMove > 0.05) {
        const recentHighs = highs.filter(h => h.index >= data.length - recentBars);
        const recentLows = lows.filter(l => l.index >= data.length - recentBars);

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
                        end: data[data.length - 1].time
                    }
                });
            }
        }
    }

    // Strong downtrend followed by sideways/slight up movement = bearish flag
    if (trendMove < -0.05) {
        const recentHighs = highs.filter(h => h.index >= data.length - recentBars);
        const recentLows = lows.filter(l => l.index >= data.length - recentBars);

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
                        end: data[data.length - 1].time
                    }
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
    } = {}
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
            'bearishFlag'
        ]
    } = options;

    if (data.length < 20) return [];

    const { highs, lows } = findPivots(data, minBarsForPivot, minBarsForPivot);
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
    triangles.forEach(pattern => {
        if (enabledPatterns.includes(pattern.type)) {
            allPatterns.push(pattern);
        }
    });

    const flags = detectFlags(data, highs, lows);
    flags.forEach(pattern => {
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
        let overlaps = false;

        for (const existing of result) {
            // Check if patterns overlap significantly in time
            const overlapStart = Math.max(pattern.timeframe.start, existing.timeframe.start);
            const overlapEnd = Math.min(pattern.timeframe.end, existing.timeframe.end);

            if (overlapStart < overlapEnd) {
                const overlapDuration = overlapEnd - overlapStart;
                const patternDuration = pattern.timeframe.end - pattern.timeframe.start;

                // If more than 60% overlap, consider it duplicate
                if (overlapDuration / patternDuration > 0.6) {
                    overlaps = true;
                    break;
                }
            }
        }

        if (!overlaps) {
            result.push(pattern);
        }
    }

    return result;
}
