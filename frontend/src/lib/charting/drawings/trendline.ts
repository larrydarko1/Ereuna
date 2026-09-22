/**
 * The trendline tool: two clicks to draw one, either endpoint to drag it, the
 * line itself to select it.
 *
 * A line is stored in time and price rather than pixels, so it stays put over a
 * pan or a scale change; `updateLineCoordinates` is what re-derives the pixels
 * before anything reads them.
 */
import { type AnchoredPoint, DrawingLayer } from '@/lib/charting/drawings/drawing-layer';
import { type IChartApi } from '@/lib/charting/engine/api/create-chart';
import { type MouseEventParams } from '@/lib/charting/engine/api/ichart-api';
import { type ISeriesApi } from '@/lib/charting/engine/api/iseries-api';
import { type SeriesType } from '@/lib/charting/engine/model/series/series-options';
import { type Time } from '@/lib/charting/engine/model/time/types';
import { drawHandle } from '@/lib/charting/shared/canvas-path';
import { type CanvasPoint, distanceToSegment } from '@/lib/charting/shared/geometry';
import { getThemeColor } from '@/lib/charting/shared/theme-color';

export type TrendLinePoint = AnchoredPoint;

export type TrendLine = {
    id: string;
    point1: TrendLinePoint;
    point2: TrendLinePoint;
    color: string;
    lineWidth: number;
    lineStyle: 'solid' | 'dashed' | 'dotted';
    locked: boolean;
    extended: boolean; // Drawn out to the canvas edges rather than stopping at the two points
};

type DragTarget = { lineId: string; pointIndex: 1 | 2 };

const DEFAULT_LINE_WIDTH = 1;

// How close a click has to land to grab an endpoint, and to select the line itself
const POINT_HIT_RADIUS = 8;
const LINE_HIT_DISTANCE = 6;
const CONTROL_POINT_RADIUS = 5;

const DASH_PATTERNS: Record<TrendLine['lineStyle'], number[]> = {
    solid: [],
    dashed: [8, 4],
    dotted: [2, 3],
};

// The half-drawn line carries an id no real line can collide with, so it never
// matches the selection and never picks up the selected styling
const PREVIEW_LINE_ID = 'preview';

const TRENDLINE_LAYER_Z_INDEX = 99;

export class TrendLineManager extends DrawingLayer {
    private trendLines: TrendLine[] = [];
    private currentLine: { point1: TrendLinePoint | null; point2: TrendLinePoint | null } = {
        point1: null,
        point2: null,
    };
    private selectedLineId: string | null = null;

    // A drag is in flight exactly while this is set — there is no separate flag
    // to fall out of step with it
    private dragTarget: DragTarget | null = null;

    public constructor(chart: IChartApi, mainSeries: ISeriesApi<SeriesType>) {
        super(chart, mainSeries, TRENDLINE_LAYER_Z_INDEX);
        this.mount();
    }

    public removeSelectedLine(): void {
        if (this.selectedLineId === null) return;

        this.trendLines = this.trendLines.filter((line) => line.id !== this.selectedLineId);
        this.selectedLineId = null;
        this.draw();
        this.notifyChange();
    }

    public getTrendLines(): TrendLine[] {
        return [...this.trendLines];
    }

    public loadTrendLines(lines: TrendLine[]): void {
        this.trendLines = lines;
        this.draw();
    }

    public override draw(): void {
        this.clear();
        if (this.ctx === null) return;

        for (const line of this.trendLines) {
            this.updateLineCoordinates(line);
            this.drawTrendLine(line);
        }

        // The line being drawn right now, following the pointer
        const { point1, point2 } = this.currentLine;
        if (point1 === null || point2 === null) return;

        this.drawTrendLine({
            id: PREVIEW_LINE_ID,
            point1,
            point2,
            color: getThemeColor('--color-text-muted'),
            lineWidth: DEFAULT_LINE_WIDTH,
            lineStyle: 'dashed', // Dashed while it is still provisional
            locked: false,
            extended: false,
        });
    }

    protected override startInteraction(): void {
        this.currentLine = { point1: null, point2: null };

        this.chart.subscribeClick(this.handleClick);
        this.chart.subscribeCrosshairMove(this.handleCrosshairMove);
    }

    protected override stopInteraction(): void {
        this.currentLine = { point1: null, point2: null };
        this.dragTarget = null;

        this.chart.unsubscribeClick(this.handleClick);
        this.chart.unsubscribeCrosshairMove(this.handleCrosshairMove);
    }

    protected override selectAt(pointer: CanvasPoint): boolean {
        const lineId = this.hitTestLine(pointer);
        if (lineId === null) return false;

        this.selectedLineId = lineId;
        return true;
    }

    protected override hasSelection(): boolean {
        return this.selectedLineId !== null;
    }

    protected override removeSelected(): void {
        this.removeSelectedLine();
    }

    private handleClick = (param: MouseEventParams<Time>): void => {
        const pointer = this.readPoint(param);
        if (pointer === null) return;

        // A click is also what ends a drag: the chart reports clicks and
        // crosshair moves, never a mouseup
        if (this.dragTarget !== null) {
            this.dragTarget = null;
            this.draw();
            return;
        }

        const endpoint = this.hitTestPoint(pointer);
        if (endpoint !== null) {
            this.dragTarget = endpoint;
            this.selectedLineId = endpoint.lineId;
            this.draw();
            return;
        }

        const lineId = this.hitTestLine(pointer);
        if (lineId !== null) {
            this.selectedLineId = lineId;
            this.draw();
            return;
        }

        this.placePoint(pointer);
        this.draw();
    };

    private handleCrosshairMove = (param: MouseEventParams<Time>): void => {
        const pointer = this.readPoint(param);
        if (pointer === null) return;

        if (this.dragTarget !== null) {
            this.dragEndpoint(pointer);
            return;
        }

        // Half-drawn: the far end follows the pointer as a preview
        if (this.currentLine.point1 !== null) {
            this.currentLine.point2 = pointer;
            this.draw();
        }
    };

    /**
     * A trendline is drawn in two clicks: the first pins one end, the second
     * closes it.
     */
    private placePoint(pointer: TrendLinePoint): void {
        if (this.currentLine.point1 === null) {
            this.currentLine.point1 = pointer;
            this.selectedLineId = null;
            return;
        }

        this.trendLines.push({
            id: generateLineId(),
            point1: { ...this.currentLine.point1 },
            point2: { ...pointer },
            color: getThemeColor('--color-text-muted'),
            lineWidth: DEFAULT_LINE_WIDTH,
            lineStyle: 'solid',
            locked: false,
            extended: false,
        });

        this.currentLine = { point1: null, point2: null };

        // Left unselected, so the next click starts a new line rather than
        // grabbing the one just finished
        this.selectedLineId = null;
        this.notifyChange();
    }

    private dragEndpoint(pointer: TrendLinePoint): void {
        const target = this.dragTarget;
        if (target === null) return;

        const line = this.trendLines.find((candidate) => candidate.id === target.lineId);
        if (line === undefined || line.locked) return;

        if (target.pointIndex === 1) {
            line.point1 = pointer;
        } else {
            line.point2 = pointer;
        }

        this.draw();
    }

    private hitTestPoint(pointer: CanvasPoint): DragTarget | null {
        for (const line of this.trendLines) {
            if (line.locked) continue;

            this.updateLineCoordinates(line);

            if (Math.hypot(line.point1.x - pointer.x, line.point1.y - pointer.y) <= POINT_HIT_RADIUS) {
                return { lineId: line.id, pointIndex: 1 };
            }

            if (Math.hypot(line.point2.x - pointer.x, line.point2.y - pointer.y) <= POINT_HIT_RADIUS) {
                return { lineId: line.id, pointIndex: 2 };
            }
        }

        return null;
    }

    private hitTestLine(pointer: CanvasPoint): string | null {
        for (const line of this.trendLines) {
            this.updateLineCoordinates(line);

            if (distanceToSegment(pointer, line.point1, line.point2) <= LINE_HIT_DISTANCE) {
                return line.id;
            }
        }

        return null;
    }

    /**
     * Re-derives a line's pixel endpoints from the time and price it is stored
     * in, which the chart invalidates on every pan and every scale change.
     */
    private updateLineCoordinates(line: TrendLine): void {
        const timeScale = this.chart.timeScale();
        const x1 = timeScale.timeToCoordinate(line.point1.time);
        const y1 = this.mainSeries.priceToCoordinate(line.point1.price);
        const x2 = timeScale.timeToCoordinate(line.point2.time);
        const y2 = this.mainSeries.priceToCoordinate(line.point2.price);

        // An end scrolled off the scale keeps its last coordinate rather than
        // collapsing the line onto the axis
        if (x1 !== null) line.point1.x = x1;
        if (y1 !== null) line.point1.y = y1;
        if (x2 !== null) line.point2.x = x2;
        if (y2 !== null) line.point2.y = y2;
    }

    private drawTrendLine(line: TrendLine): void {
        const ctx = this.ctx;
        if (ctx === null) return;

        // The stored colour is deliberately not read: a line follows whichever
        // theme is on now, so one drawn in a dark theme is still legible in a
        // light one
        const themeColor = getThemeColor('--color-text-muted');
        const isSelected = line.id === this.selectedLineId;

        ctx.strokeStyle = themeColor;
        ctx.lineWidth = isSelected ? line.lineWidth + 1 : line.lineWidth;
        ctx.setLineDash(DASH_PATTERNS[line.lineStyle]);

        const [start, end] = line.extended ? this.extendToEdges(line) : [line.point1, line.point2];

        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Handles only while the line is actually being edited — two dots on
        // every selected line is noise
        if (!isSelected || line.locked || this.dragTarget === null) return;

        // The hole has to be the chart's own background for the ring to read
        const handle = { radius: CONTROL_POINT_RADIUS, color: themeColor, holeColor: getThemeColor('--color-bg') };
        drawHandle(ctx, line.point1, handle);
        drawHandle(ctx, line.point2, handle);
    }

    /**
     * Walks an extended line's two ends out past the canvas in both directions,
     * so the visible segment is the whole of what the viewport can show.
     */
    private extendToEdges(line: TrendLine): [CanvasPoint, CanvasPoint] {
        const runX = line.point2.x - line.point1.x;
        const runY = line.point2.y - line.point1.y;
        const length = Math.hypot(runX, runY);

        // Both ends on the same pixel give no direction to extend along
        if (length === 0 || this.canvas === null) return [line.point1, line.point2];

        const canvasWidth = this.canvas.width / window.devicePixelRatio;
        const canvasHeight = this.canvas.height / window.devicePixelRatio;
        const extension = Math.max(canvasWidth, canvasHeight) * 2;

        const unitX = runX / length;
        const unitY = runY / length;

        return [
            { x: line.point1.x - unitX * extension, y: line.point1.y - unitY * extension },
            { x: line.point2.x + unitX * extension, y: line.point2.y + unitY * extension },
        ];
    }
}

function generateLineId(): string {
    return `tl_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
