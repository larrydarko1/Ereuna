/**
 * Pattern Overlay Manager
 * Manages the visual representation of detected chart patterns on the chart
 */

import type { IChartApi } from './api/create-chart';
import type { ISeriesApi } from './api/iseries-api';
import type { Time } from './model/horz-scale-behavior-time/types';
import type { SeriesMarker } from './model/series-markers';
import { LineStyle } from './renderers/draw-line';
import { PatternMatch, PivotPoint } from './pattern-detection';

interface PatternVisual {
    pattern: PatternMatch;
    shapes: any[]; // Store references to drawn shapes
}

export class PatternOverlayManager {
    private chart: IChartApi;
    private mainSeries: ISeriesApi<'Candlestick'> | ISeriesApi<'Line'>;
    private patterns: PatternVisual[] = [];
    private patternSeries: ISeriesApi<'Line'>[] = [];
    private markers: SeriesMarker<Time>[] = [];

    constructor(
        chart: IChartApi,
        mainSeries: ISeriesApi<'Candlestick'> | ISeriesApi<'Line'>
    ) {
        this.chart = chart;
        this.mainSeries = mainSeries;
    }

    /**
     * Display detected patterns on the chart
     */
    displayPatterns(patterns: PatternMatch[]): void {
        // Clear existing patterns first
        this.clearPatterns();

        patterns.forEach(pattern => {
            this.drawPattern(pattern);
        });
    }

    /**
     * Draw a single pattern on the chart
     */
    private drawPattern(pattern: PatternMatch): void {
        const visual: PatternVisual = {
            pattern,
            shapes: []
        };

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
        if (pattern.points.length < 2) return;

        const color = pattern.type === 'doubleTop' ? '#ef5350' : '#26a69a';
        const points = pattern.points;

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
            { time: points[0].time as Time, value: points[0].price },
            { time: points[1].time as Time, value: points[1].price }
        ];

        lineSeries.setData(lineData);
        this.patternSeries.push(lineSeries);
    }

    /**
     * Draw head and shoulders pattern
     */
    private drawHeadAndShoulders(pattern: PatternMatch): void {
        if (pattern.points.length < 3) return;

        const color = pattern.type === 'headAndShoulders' ? '#ef5350' : '#26a69a';
        const [leftShoulder, head, rightShoulder] = pattern.points;

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
            { time: leftShoulder.time as Time, value: (leftShoulder.price + rightShoulder.price) / 2 },
            { time: rightShoulder.time as Time, value: (leftShoulder.price + rightShoulder.price) / 2 }
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
            { time: leftShoulder.time as Time, value: leftShoulder.price },
            { time: head.time as Time, value: head.price },
            { time: rightShoulder.time as Time, value: rightShoulder.price }
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

            const upperData = highs.map(p => ({
                time: p.time as Time,
                value: p.price
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

            const lowerData = lows.map(p => ({
                time: p.time as Time,
                value: p.price
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

            const flagData = sortedPoints.map(p => ({
                time: p.time as Time,
                value: p.price
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
        const marker: SeriesMarker<Time> = {
            time: lastPoint.time as Time,
            position: pattern.type.includes('Top') || pattern.type.includes('headAndShoulders')
                ? 'aboveBar'
                : 'belowBar',
            color: this.getMarkerColor(pattern.type),
            shape: 'circle',
            text: this.getPatternLabel(pattern.type),
            size: 1,
            originalTime: lastPoint.time as Time,
        };

        this.markers.push(marker);
    }

    /**
     * Apply all markers to the main series
     */
    private applyMarkers(): void {
        if (this.markers.length > 0) {
            // Sort markers by time in ascending order
            const sortedMarkers = [...this.markers].sort((a, b) => {
                const timeA = typeof a.time === 'number' ? a.time :
                    typeof a.time === 'string' ? new Date(a.time).getTime() / 1000 :
                        new Date((a.time as any).year, (a.time as any).month - 1, (a.time as any).day).getTime() / 1000;
                const timeB = typeof b.time === 'number' ? b.time :
                    typeof b.time === 'string' ? new Date(b.time).getTime() / 1000 :
                        new Date((b.time as any).year, (b.time as any).month - 1, (b.time as any).day).getTime() / 1000;
                return timeA - timeB;
            });

            const existingMarkers = (this.mainSeries as any).markers?.() || [];
            this.mainSeries.setMarkers([...existingMarkers, ...sortedMarkers]);
        }
    }

    /**
     * Clear all pattern overlays
     */
    clearPatterns(): void {
        // Remove all pattern series
        this.patternSeries.forEach(series => {
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
        if (type.includes('Bottom') || type.includes('inverse') ||
            type === 'ascendingTriangle' || type === 'bullishFlag') {
            return '#26a69a'; // Bullish patterns - green
        } else if (type.includes('Top') || type === 'headAndShoulders' ||
            type === 'descendingTriangle' || type === 'bearishFlag') {
            return '#ef5350'; // Bearish patterns - red
        } else {
            return '#ffa726'; // Neutral - orange
        }
    }

    /**
     * Get short label for pattern
     */
    private getPatternLabel(type: string): string {
        const labels: Record<string, string> = {
            doubleTop: 'DT',
            doubleBottom: 'DB',
            headAndShoulders: 'H&S',
            inverseHeadAndShoulders: 'IH&S',
            ascendingTriangle: '△↗',
            descendingTriangle: '△↘',
            symmetricTriangle: '△',
            bullishFlag: '⚑↗',
            bearishFlag: '⚑↘',
            wedgeRising: '◇↗',
            wedgeFalling: '◇↘'
        };

        return labels[type] || '?';
    }

    /**
     * Get all currently displayed patterns
     */
    getPatterns(): PatternMatch[] {
        return this.patterns.map(v => v.pattern);
    }

    /**
     * Finalize and apply all visual elements
     */
    finalize(): void {
        this.applyMarkers();
    }
}
