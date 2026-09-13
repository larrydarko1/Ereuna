/**
 * Reduces a bar series to the local extremes every pattern is defined in terms
 * of, and fits a line through a run of them.
 *
 * Both detectors and the orchestrator need these, and neither belongs to a
 * single pattern — a double top and a triangle are both read off the same
 * pivots.
 */
import { type OHLCData, type PivotPoint } from '@/lib/lightweight-charts/pattern-types';

/**
 * The bars that are the highest (or lowest) within `leftBars` before and
 * `rightBars` after themselves.
 *
 * The comparison is strict on both sides, so a flat run of equal highs yields
 * no pivot at all rather than one arbitrary bar out of the run.
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

        let isHigh = true;
        for (let j = i - leftBars; j <= i + rightBars; j++) {
            const other = data[j];
            if (j !== i && other !== undefined && other.high >= bar.high) {
                isHigh = false;
                break;
            }
        }
        if (isHigh) {
            highs.push({ index: i, time: bar.time, price: bar.high });
        }

        let isLow = true;
        for (let j = i - leftBars; j <= i + rightBars; j++) {
            const other = data[j];
            if (j !== i && other !== undefined && other.low <= bar.low) {
                isLow = false;
                break;
            }
        }
        if (isLow) {
            lows.push({ index: i, time: bar.time, price: bar.low });
        }
    }

    return { highs, lows };
}

/**
 * Least-squares slope of the prices, against each point's ORDINAL position
 * rather than its time. Pivots are irregularly spaced, and the detectors
 * compare the result against fixed thresholds — regressing on real time would
 * make those thresholds mean something different at every timeframe.
 */
export function calculateSlope(points: PivotPoint[]): number {
    if (points.length < 2) return 0;

    const count = points.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    points.forEach((point, idx) => {
        sumX += idx;
        sumY += point.price;
        sumXY += idx * point.price;
        sumX2 += idx * idx;
    });

    return (count * sumXY - sumX * sumY) / (count * sumX2 - sumX * sumX);
}
