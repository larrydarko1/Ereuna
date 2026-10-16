/**
 * Pattern Overlay Manager
 * Manages the visual representation of detected chart patterns on the chart
 */

import type { IChartApi } from '@/lib/charting/engine/api/create-chart';
import type { ISeriesApi } from '@/lib/charting/engine/api/iseries-api';
import { nominal } from '@/lib/charting/engine/helpers/nominal';
import type { SeriesMarker } from '@/lib/charting/engine/model/series/series-markers';
import type { SeriesType } from '@/lib/charting/engine/model/series/series-options';
import type { Time, UTCTimestamp } from '@/lib/charting/engine/model/time/types';
import { LineStyle } from '@/lib/charting/engine/renderers/draw-line';
import { type PatternMatch, type PatternType } from '@/lib/charting/patterns/types';
import { timeToTimestamp } from '@/lib/charting/shared/time-conversion';

type PatternVisual = {
    pattern: PatternMatch;
};

export class PatternOverlayManager {
    private readonly chart: IChartApi;
    private readonly mainSeries: ISeriesApi<SeriesType>;
    private patterns: PatternVisual[] = [];
    private patternSeries: ISeriesApi<'Line'>[] = [];
    private markers: SeriesMarker<Time>[] = [];

    constructor(chart: IChartApi, mainSeries: ISeriesApi<SeriesType>) {
        this.chart = chart;
        this.mainSeries = mainSeries;
    }

    /**
     * Display detected patterns on the chart
     */
    displayPatterns(patterns: PatternMatch[]): void {
        // Clear existing patterns first
        this.clearPatterns();

        patterns.forEach((pattern) => {
            this.drawPattern(pattern);
        });
    }

    /**
     * Draw a single pattern on the chart
     */
    private drawPattern(pattern: PatternMatch): void {
        const visual: PatternVisual = { pattern };

        // Draw based on pattern type
        switch (pattern.type) {
            case 'doubleTop':
            case 'doubleBottom':
                this.drawDoublePattern(pattern);
                break;

            case 'headAndShoulders':
            case 'inverseHeadAndShoulders':
                this.drawHeadAndShoulders(pattern);
                break;

            case 'ascendingTriangle':
            case 'descendingTriangle':
            case 'symmetricTriangle':
                this.drawTriangle(pattern);
                break;

            case 'bullishFlag':
            case 'bearishFlag':
                this.drawFlag(pattern);
                break;
        }

        // Add marker at the end of the pattern
        this.addPatternMarker(pattern);

        this.patterns.push(visual);
    }

    /**
     * Draw double top/bottom pattern
     */
    private drawDoublePattern(pattern: PatternMatch): void {
        const [first, second] = pattern.points;
        if (first === undefined || second === undefined) return;

        const color = pattern.type === 'doubleTop' ? '#ef5350' : '#26a69a';

        // Create line series connecting the two peaks/troughs
        const lineSeries = this.chart.addLineSeries({
            color,
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false,
        });

        // Draw horizontal line connecting the two points
        const lineData = [
            { time: nominal<UTCTimestamp>(first.time), value: first.price },
            { time: nominal<UTCTimestamp>(second.time), value: second.price },
        ];

        lineSeries.setData(lineData);
        this.patternSeries.push(lineSeries);
    }

    /**
     * Draw head and shoulders pattern
     */
    // eslint-disable-next-line contracts/name-contract -- "head and shoulders" is one pattern's proper name, not two jobs joined
    private drawHeadAndShoulders(pattern: PatternMatch): void {
        const [leftShoulder, head, rightShoulder] = pattern.points;
        if (leftShoulder === undefined || head === undefined || rightShoulder === undefined) return;

        const color = pattern.type === 'headAndShoulders' ? '#ef5350' : '#26a69a';

        // Draw neckline (connecting the shoulders)
        const necklineSeries = this.chart.addLineSeries({
            color,
            lineWidth: 2,
            lineStyle: LineStyle.Solid,
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false,
        });

        const necklineData = [
            { time: nominal<UTCTimestamp>(leftShoulder.time), value: (leftShoulder.price + rightShoulder.price) / 2 },
            { time: nominal<UTCTimestamp>(rightShoulder.time), value: (leftShoulder.price + rightShoulder.price) / 2 },
        ];

        necklineSeries.setData(necklineData);
        this.patternSeries.push(necklineSeries);

        // Draw connecting lines from shoulders to head
        const connectingSeries = this.chart.addLineSeries({
            color,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false,
        });

        const connectingData = [
            { time: nominal<UTCTimestamp>(leftShoulder.time), value: leftShoulder.price },
            { time: nominal<UTCTimestamp>(head.time), value: head.price },
            { time: nominal<UTCTimestamp>(rightShoulder.time), value: rightShoulder.price },
        ];

        connectingSeries.setData(connectingData);
        this.patternSeries.push(connectingSeries);
    }

    /**
     * Draw triangle pattern
     */
    private drawTriangle(pattern: PatternMatch): void {
        const color = this.getTriangleColor(pattern.type);

        // Separate highs and lows
        const sortedPoints = [...pattern.points].sort((a, b) => a.time - b.time);
        const highs = sortedPoints.filter((_, i) => i % 2 === 0);
        const lows = sortedPoints.filter((_, i) => i % 2 === 1);

        // Draw upper trendline
        if (highs.length >= 2) {
            const upperSeries = this.chart.addLineSeries({
                color,
                lineWidth: 2,
                lineStyle: LineStyle.Solid,
                crosshairMarkerVisible: false,
                lastValueVisible: false,
                priceLineVisible: false,
            });

            const upperData = highs.map((p) => ({
                time: nominal<UTCTimestamp>(p.time),
                value: p.price,
            }));

            upperSeries.setData(upperData);
            this.patternSeries.push(upperSeries);
        }

        // Draw lower trendline
        if (lows.length >= 2) {
            const lowerSeries = this.chart.addLineSeries({
                color,
                lineWidth: 2,
                lineStyle: LineStyle.Solid,
                crosshairMarkerVisible: false,
                lastValueVisible: false,
                priceLineVisible: false,
            });

            const lowerData = lows.map((p) => ({
                time: nominal<UTCTimestamp>(p.time),
                value: p.price,
            }));

            lowerSeries.setData(lowerData);
            this.patternSeries.push(lowerSeries);
        }
    }

    /**
     * Draw flag pattern
     */
    private drawFlag(pattern: PatternMatch): void {
        const color = pattern.type === 'bullishFlag' ? '#26a69a' : '#ef5350';

        const sortedPoints = [...pattern.points].sort((a, b) => a.time - b.time);

        // Draw the flag channel
        if (sortedPoints.length >= 2) {
            const flagSeries = this.chart.addLineSeries({
                color,
                lineWidth: 2,
                lineStyle: LineStyle.Dashed,
                crosshairMarkerVisible: false,
                lastValueVisible: false,
                priceLineVisible: false,
            });

            const flagData = sortedPoints.map((p) => ({
                time: nominal<UTCTimestamp>(p.time),
                value: p.price,
            }));

            flagSeries.setData(flagData);
            this.patternSeries.push(flagSeries);
        }
    }

    /**
     * Add a marker to indicate the pattern
     */
    private addPatternMarker(pattern: PatternMatch): void {
        const lastPoint = pattern.points[pattern.points.length - 1];
        if (lastPoint === undefined) return;

        const marker: SeriesMarker<Time> = {
            time: nominal<UTCTimestamp>(lastPoint.time),
            position:
                pattern.type.includes('Top') || pattern.type.includes('headAndShoulders') ? 'aboveBar' : 'belowBar',
            color: this.getMarkerColor(pattern.type),
            shape: 'circle',
            text: this.getPatternLabel(pattern.type),
            size: 1,
            originalTime: lastPoint.time,
        };

        this.markers.push(marker);
    }

    /**
     * Apply all markers to the main series
     */
    private applyMarkers(): void {
        if (this.markers.length === 0) {
            return;
        }

        // setMarkers requires ascending time order
        const sortedMarkers = [...this.markers].sort(
            (first, second) => timeToTimestamp(first.time) - timeToTimestamp(second.time),
        );

        this.mainSeries.setMarkers([...this.mainSeries.markers(), ...sortedMarkers]);
    }

    /**
     * Clear all pattern overlays
     */
    clearPatterns(): void {
        // Remove all pattern series
        this.patternSeries.forEach((series) => {
            this.chart.removeSeries(series);
        });

        this.patternSeries = [];
        this.patterns = [];
        this.markers = [];
    }

    /**
     * Get color for triangle types
     */
    private getTriangleColor(type: string): string {
        switch (type) {
            case 'ascendingTriangle':
                return '#26a69a'; // Bullish - green
            case 'descendingTriangle':
                return '#ef5350'; // Bearish - red
            case 'symmetricTriangle':
                return '#ffa726'; // Neutral - orange
            default:
                return '#9e9e9e';
        }
    }

    /**
     * Get marker color based on pattern type
     */
    private getMarkerColor(type: string): string {
        if (
            type.includes('Bottom') ||
            type.includes('inverse') ||
            type === 'ascendingTriangle' ||
            type === 'bullishFlag'
        ) {
            return '#26a69a'; // Bullish patterns - green
        }

        if (
            type.includes('Top') ||
            type === 'headAndShoulders' ||
            type === 'descendingTriangle' ||
            type === 'bearishFlag'
        ) {
            return '#ef5350'; // Bearish patterns - red
        }

        return '#ffa726'; // Neutral - orange
    }

    /**
     * Get short label for pattern
     */
    private getPatternLabel(type: PatternType): string {
        const labels: Record<PatternType, string> = {
            doubleTop: 'DT',
            doubleBottom: 'DB',
            headAndShoulders: 'H&S',
            inverseHeadAndShoulders: 'IH&S',
            ascendingTriangle: '△↗',
            descendingTriangle: '△↘',
            symmetricTriangle: '△',
            bullishFlag: '⚑↗',
            bearishFlag: '⚑↘',
        };

        return labels[type];
    }

    /**
     * Get all currently displayed patterns
     */
    getPatterns(): PatternMatch[] {
        return this.patterns.map((v) => v.pattern);
    }

    /**
     * Finalize and apply all visual elements
     */
    finalize(): void {
        this.applyMarkers();
    }
}
