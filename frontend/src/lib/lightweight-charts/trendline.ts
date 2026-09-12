import {
    type IChartApi,
    type ISeriesApi,
    type MouseEventParams,
    type SeriesType,
    type Time,
} from '@/lib/lightweight-charts/index';
import { type CanvasPoint, distanceToSegment } from '@/lib/lightweight-charts/geometry';
import { getThemeColor } from '@/lib/lightweight-charts/theme-color';

export type TrendLinePoint = {
    time: Time;
    price: number;
    x: number;
    y: number;
};

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

export class TrendLineManager {
    private chart: IChartApi;
    private mainSeries: ISeriesApi<SeriesType>;
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private isActive = false;
    private trendLines: TrendLine[] = [];
    private currentLine: { point1: TrendLinePoint | null; point2: TrendLinePoint | null } = {
        point1: null,
        point2: null,
    };
    private selectedLineId: string | null = null;

    // A drag is in flight exactly while this is set — there is no separate flag
    // to fall out of step with it
    private dragTarget: DragTarget | null = null;
    private onChangeCallback: (() => void) | null = null;
    private onActivateCallback: (() => void) | null = null;

    constructor(chart: IChartApi, mainSeries: ISeriesApi<SeriesType>) {
        this.chart = chart;
        this.mainSeries = mainSeries;

        this.setupCanvas();
        this.chart.timeScale().subscribeVisibleLogicalRangeChange(this.handleVisibleRangeChange);

        // Selecting a line and deleting it both work whether or not the tool is
        // the active one, so these two listeners outlive activate/deactivate
        this.chart.subscribeClick(this.handleGlobalClick);
        document.addEventListener('keydown', this.handleKeyDown);
    }

    public onChange(callback: () => void): void {
        this.onChangeCallback = callback;
    }

    /**
     * Registers the callback that asks the toolbar to switch to this tool,
     * which is what clicking an existing line does.
     */
    public onActivate(callback: () => void): void {
        this.onActivateCallback = callback;
    }

    public activate(): void {
        if (this.isActive) return;

        this.isActive = true;
        this.currentLine = { point1: null, point2: null };

        this.chart.subscribeClick(this.handleClick);
        this.chart.subscribeCrosshairMove(this.handleCrosshairMove);
    }

    public deactivate(): void {
        if (!this.isActive) return;

        this.isActive = false;
        this.currentLine = { point1: null, point2: null };
        this.dragTarget = null;

        this.chart.unsubscribeClick(this.handleClick);
        this.chart.unsubscribeCrosshairMove(this.handleCrosshairMove);
    }

    public toggle(): void {
        if (this.isActive) {
            this.deactivate();
        } else {
            this.activate();
        }
    }

    public isToolActive(): boolean {
        return this.isActive;
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

    public draw(): void {
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

    public destroy(): void {
        this.deactivate();

        this.chart.timeScale().unsubscribeVisibleLogicalRangeChange(this.handleVisibleRangeChange);
        this.chart.unsubscribeClick(this.handleGlobalClick);
        document.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('resize', this.handleResize);

        this.canvas?.parentElement?.removeChild(this.canvas);

        this.canvas = null;
        this.ctx = null;
    }

    // The handlers are arrow properties so that `this` survives being handed to
    // addEventListener and to the chart's own subscriptions, and so that the
    // reference passed to unsubscribe is the one that was subscribed
    private handleVisibleRangeChange = (): void => {
        this.draw();
    };

    private handleResize = (): void => {
        this.resizeCanvas();
    };

    /**
     * Clicking a line picks it up even when another tool is in front, which is
     * the only way to reach one without first hunting for the right toolbar
     * button.
     */
    private handleGlobalClick = (param: MouseEventParams<Time>): void => {
        if (this.isActive || param.point === undefined) return;

        const lineId = this.hitTestLine(param.point);
        if (lineId === null) return;

        this.selectedLineId = lineId;
        this.draw();
        this.onActivateCallback?.();
    };

    private handleKeyDown = (event: KeyboardEvent): void => {
        if (event.key !== 'Backspace' && event.key !== 'Delete') return;

        // Not while the caret is in a field — there the key means "erase a
        // character"
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }

        if (this.selectedLineId !== null) {
            event.preventDefault(); // Backspace would otherwise navigate back
            this.removeSelectedLine();
        }
    };

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

    private setupCanvas(): void {
        // An overlay canvas above the boxes' own
        const chartContainer = this.chart.chartElement();

        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '99';

        chartContainer.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this.resizeCanvas();
        window.addEventListener('resize', this.handleResize);
    }

    private resizeCanvas(): void {
        const chartContainer = this.canvas?.parentElement;
        if (this.canvas === null || chartContainer === null || chartContainer === undefined) return;

        const rect = chartContainer.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;

        this.ctx?.scale(window.devicePixelRatio, window.devicePixelRatio);

        this.draw();
    }

    /**
     * Turns a crosshair event into a point on the plot, or `null` when it did
     * not land on one — off the edge there is no bar and no price.
     */
    private readPoint(param: MouseEventParams<Time>): TrendLinePoint | null {
        if (param.point === undefined || param.time === undefined) return null;

        const price = this.mainSeries.coordinateToPrice(param.point.y);
        if (price === null) return null;

        return { time: param.time, price, x: param.point.x, y: param.point.y };
    }

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

    private clear(): void {
        if (this.ctx === null || this.canvas === null) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
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

        this.drawControlPoint(line.point1, themeColor);
        this.drawControlPoint(line.point2, themeColor);
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

    private drawControlPoint(point: CanvasPoint, color: string): void {
        const ctx = this.ctx;
        if (ctx === null) return;

        // The handle reads as a ring cut out of the chart, which only works if
        // the middle is the chart's own background
        const holeColor = getThemeColor('--color-bg');

        ctx.beginPath();
        ctx.arc(point.x, point.y, CONTROL_POINT_RADIUS, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = holeColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(point.x, point.y, CONTROL_POINT_RADIUS - 2, 0, 2 * Math.PI);
        ctx.fillStyle = holeColor;
        ctx.fill();
    }

    private notifyChange(): void {
        this.onChangeCallback?.();
    }
}

function generateLineId(): string {
    return `tl_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
