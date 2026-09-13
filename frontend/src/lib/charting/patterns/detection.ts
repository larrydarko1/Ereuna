/**
 * Runs the pattern detectors over a bar series and reconciles what they find.
 *
 * The detectors themselves are deliberately independent and overlapping — a
 * head and shoulders and a double top will both match the same three peaks —
 * so the reconciliation here is the whole point of the module: sort by
 * confidence and drop anything that mostly covers bars a better match already
 * claimed.
 */
import {
    detectDoubleBottoms,
    detectDoubleTops,
    detectFlags,
    detectHeadAndShoulders,
    detectInverseHeadAndShoulders,
    detectTriangles,
} from '@/lib/charting/patterns/detectors';
import { getPivots } from '@/lib/charting/patterns/pivots';
import { type OHLCData, type PatternMatch, type PatternType } from '@/lib/charting/patterns/types';

// Share of a match's span that may overlap a higher-confidence match before the
// two are the same finding reported twice
const MAX_PATTERN_OVERLAP = 0.6;

/** Every pattern this module knows how to look for, minus the two it cannot yet find. */
const DEFAULT_PATTERNS: PatternType[] = [
    'doubleTop',
    'doubleBottom',
    'headAndShoulders',
    'inverseHeadAndShoulders',
    'ascendingTriangle',
    'descendingTriangle',
    'symmetricTriangle',
    'bullishFlag',
    'bearishFlag',
];

/**
 * Every pattern visible in `data`, best first, with overlapping matches
 * collapsed to the most confident one.
 *
 * Under twenty bars there is nothing a pattern could be read off, so the
 * result is empty rather than a set of low-confidence guesses.
 */
export function detectAllPatterns(
    data: OHLCData[],
    options: {
        minBarsForPivot?: number;
        tolerance?: number;
        enabledPatterns?: PatternType[];
    } = {},
): PatternMatch[] {
    const { minBarsForPivot = 5, tolerance = 0.025, enabledPatterns = DEFAULT_PATTERNS } = options;

    if (data.length < 20) return [];

    const { highs, lows } = getPivots(data, { leftBars: minBarsForPivot, rightBars: minBarsForPivot });
    const found: PatternMatch[] = [];

    if (enabledPatterns.includes('doubleTop')) found.push(...detectDoubleTops(highs, tolerance));
    if (enabledPatterns.includes('doubleBottom')) found.push(...detectDoubleBottoms(lows, tolerance));
    if (enabledPatterns.includes('headAndShoulders')) found.push(...detectHeadAndShoulders(highs, tolerance));
    if (enabledPatterns.includes('inverseHeadAndShoulders')) {
        found.push(...detectInverseHeadAndShoulders(lows, tolerance));
    }

    // Triangles and flags each report several types from one pass, so they are
    // filtered on the way out rather than gated on the way in
    for (const pattern of [...detectTriangles(highs, lows), ...detectFlags(data, highs, lows)]) {
        if (enabledPatterns.includes(pattern.type)) found.push(pattern);
    }

    return deduplicatePatterns(found);
}

/** Highest confidence first, dropping anything that mostly repeats a match already kept. */
function deduplicatePatterns(patterns: PatternMatch[]): PatternMatch[] {
    if (patterns.length === 0) return patterns;

    const sorted = [...patterns].sort((a, b) => b.confidence - a.confidence);
    const result: PatternMatch[] = [];

    for (const pattern of sorted) {
        if (!result.some((existing) => isOverlapping(pattern, existing))) {
            result.push(pattern);
        }
    }

    return result;
}

/** Two matches covering mostly the same bars are one finding reported twice. */
function isOverlapping(pattern: PatternMatch, existing: PatternMatch): boolean {
    const overlapStart = Math.max(pattern.timeframe.start, existing.timeframe.start);
    const overlapEnd = Math.min(pattern.timeframe.end, existing.timeframe.end);
    if (overlapStart >= overlapEnd) return false;

    const overlapDuration = overlapEnd - overlapStart;
    const patternDuration = pattern.timeframe.end - pattern.timeframe.start;

    return overlapDuration / patternDuration > MAX_PATTERN_OVERLAP;
}
