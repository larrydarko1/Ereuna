/**
 * The vocabulary the pattern detectors share: the bars they read, the pivots
 * they reduce those bars to, and the match they report.
 *
 * These live apart from any one detector because every detector and the
 * overlay that draws the results all speak them, and a type in one detector's
 * file would make the others import from it for no reason.
 */

/** One local extreme in the series, and the bar it sits on. */
export type PivotPoint = {
    index: number;
    time: number;
    price: number;
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

/**
 * One detected pattern. `confidence` is 0–1 and only comparable between
 * matches of the same type — each detector scales it off its own tolerance.
 */
export type PatternMatch = {
    type: PatternType;
    points: PivotPoint[];
    confidence: number;
    description: string;
    timeframe: { start: number; end: number };
};

export type OHLCData = {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
};
