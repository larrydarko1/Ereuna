import {
    type IChartApi,
    type ISeriesApi,
    type MouseEventParams,
    type SeriesType,
    type Time,
} from '@/lib/lightweight-charts/index';
import { type CanvasPoint, distanceToSegment } from '@/lib/lightweight-charts/geometry';
import { getThemeColor } from '@/lib/lightweight-charts/theme-color';

export type FreehandPoint = {
    time: Time;
    price: number;
    x: number;
    y: number;
};

export type FreehandPath = {
    id: string;
    points: FreehandPoint[];
    color: string;
    lineWidth: number;
    locked: boolean;
};

const DEFAULT_LINE_WIDTH = 1.5;

// How close a click has to land to any segment of a stroke to select it
const PATH_HIT_TOLERANCE = 8;
const ENDPOINT_DOT_RADIUS = 3;

// A stroke of one point is a stray click, not a drawing
const MIN_PATH_POINTS = 2;

export class FreehandManager {
    private chart: IChartApi;
    private mainSeries: ISeriesApi<SeriesType>;
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private isActive = false;
    private paths: FreehandPath[] = [];
    private selectedPathId: string | null = null;

    // Drawing and dragging are each in flight exactly while their own state is
    // set, so there is no separate flag to fall out of step with them
    private currentPath: FreehandPath | null = null;
    private dragFrom: CanvasPoint | null = null;
    private onChangeCallback: (() => void) | null = null;
    private onActivateCallback: (() => void) | null = null;

    constructor(chart: IChartApi, mainSeries: ISeriesApi<SeriesType>) {
        this.chart = chart;
        this.mainSeries = mainSeries;

        this.setupCanvas();
        this.chart.timeScale().subscribeVisibleLogicalRangeChange(this.handleVisibleRangeChange);

        // Selecting a stroke and deleting it both work whether or not the tool
        // is the active one, so these two listeners outlive activate/deactivate
        this.chart.subscribeClick(this.handleGlobalClick);
        document.addEventListener('keydown', this.handleKeyDown);
    }

    public onChange(callback: () => void): void {
        this.onChangeCallback = callback;
    }

    /**
     * Registers the callback that asks the toolbar to switch to this tool,
     * which is what clicking an existing stroke does.
     */
    public onActivate(callback: () => void): void {
        this.onActivateCallback = callback;
    }

    public activate(): void {
        if (this.isActive) return;

        this.isActive = true;
        this.currentPath = null;
        this.dragFrom = null;

        if (this.canvas === null) return;

        // Freehand is the one tool that needs the raw pointer: the chart only
        // reports discrete clicks and crosshair moves, and a stroke is a drag.
        // Taking the events means the overlay has to stop being transparent to
        // them for as long as the tool is up.
        this.canvas.style.pointerEvents = 'auto';
        this.canvas.addEventListener('mousedown', this.handlePointerDown);
        this.canvas.addEventListener('mousemove', this.handlePointerMove);
        this.canvas.addEventListener('mouseup', this.handlePointerUp);
        this.canvas.addEventListener('mouseleave', this.handlePointerUp);
    }

    public deactivate(): void {
        if (!this.isActive) return;

        this.isActive = false;
        this.currentPath = null;
        this.dragFrom = null;

        if (this.canvas === null) return;

        this.canvas.style.pointerEvents = 'none';
        this.canvas.removeEventListener('mousedown', this.handlePointerDown);
        this.canvas.removeEventListener('mousemove', this.handlePointerMove);
        this.canvas.removeEventListener('mouseup', this.handlePointerUp);
        this.canvas.removeEventListener('mouseleave', this.handlePointerUp);
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

    public removeSelectedPath(): void {
        if (this.selectedPathId === null) return;

        this.paths = this.paths.filter((path) => path.id !== this.selectedPathId);
        this.selectedPathId = null;
        this.draw();
        this.notifyChange();
    }

    public getPaths(): FreehandPath[] {
        return [...this.paths];
    }

    public loadPaths(paths: FreehandPath[]): void {
        this.paths = paths;
        this.draw();
    }

    public draw(): void {
        this.clear();
        if (this.ctx === null) return;

        for (const path of this.paths) {
            this.updatePathCoordinates(path);
            this.drawPath(path);
        }

        // The stroke under the pointer right now
        if (this.currentPath !== null) this.drawPath(this.currentPath);
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
        this.paths = [];
        this.selectedPathId = null;
    }

    // The handlers are arrow properties so that `this` survives being handed to
    // addEventListener and to the chart's own subscriptions, and so that the
    // reference passed to remove is the one that was added
    private handleVisibleRangeChange = (): void => {
        this.draw();
    };

    private handleResize = (): void => {
        this.resizeCanvas();
    };

    /**
     * Clicking a stroke picks it up even when another tool is in front, which
     * is the only way to reach one without first hunting for the right toolbar
     * button.
     */
    private handleGlobalClick = (param: MouseEventParams<Time>): void => {
        if (this.isActive || param.point === undefined) return;

        const pathId = this.hitTestPath(param.point);
        if (pathId === null) return;

        this.selectedPathId = pathId;
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

        if (this.selectedPathId !== null) {
            event.preventDefault(); // Backspace would otherwise navigate back
            this.removeSelectedPath();
        }
    };

    private handlePointerDown = (event: MouseEvent): void => {
        const pointer = this.readCanvasPointer(event);
        if (pointer === null) return;

        const pathId = this.hitTestPath(pointer);

        // A second press on an already-selected stroke moves it; the first only
        // selects, so that drawing over an existing stroke stays possible
        if (pathId !== null && pathId === this.selectedPathId) {
            this.dragFrom = pointer;
            return;
        }

        if (pathId !== null) {
            this.selectedPathId = pathId;
            this.draw();
            return;
        }

        const start = this.readPoint(pointer);
        if (start === null) return;

        this.selectedPathId = null;
        this.currentPath = {
            id: generatePathId(),
            points: [start],
            color: getThemeColor('--color-text-muted'),
            lineWidth: DEFAULT_LINE_WIDTH,
            locked: false,
        };
    };

    private handlePointerMove = (event: MouseEvent): void => {
        const pointer = this.readCanvasPointer(event);
        if (pointer === null) return;

        if (this.currentPath !== null) {
            const point = this.readPoint(pointer);
            if (point === null) return;

            this.currentPath.points.push(point);
            this.draw();
            return;
        }

        if (this.dragFrom !== null) this.movePath(pointer);
    };

    private handlePointerUp = (): void => {
        this.dragFrom = null;

        const path = this.currentPath;
        this.currentPath = null;
        if (path === null) return;

        if (path.points.length >= MIN_PATH_POINTS) {
            this.paths.push(path);

            // Left unselected, so the next press starts a new stroke rather
            // than grabbing the one just drawn
            this.selectedPathId = null;
            this.notifyChange();
        }

        this.draw();
    };

    private setupCanvas(): void {
        // An overlay canvas below the boxes' own
        const chartContainer = this.chart.chartElement();

        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '97';

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

    /** Where on the overlay canvas a raw mouse event landed. */
    private readCanvasPointer(event: MouseEvent): CanvasPoint | null {
        const rect = this.canvas?.getBoundingClientRect();
        if (rect === undefined) return null;

        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    /**
     * Anchors a canvas position to the bar and price under it, which is what a
     * stroke is stored as — pixels mean nothing once the chart pans.
     */
    private readPoint(pointer: CanvasPoint): FreehandPoint | null {
        const time = this.chart.timeScale().coordinateToTime(pointer.x);
        const price = this.mainSeries.coordinateToPrice(pointer.y);
        if (time === null || price === null) return null;

        return { time, price, x: pointer.x, y: pointer.y };
    }

    /** Translates the selected stroke by how far the pointer moved this frame. */
    private movePath(pointer: CanvasPoint): void {
        const from = this.dragFrom;
        if (from === null) return;

        this.dragFrom = pointer;

        const path = this.paths.find((candidate) => candidate.id === this.selectedPathId);
        if (path === undefined || path.locked) return;

        const deltaX = pointer.x - from.x;
        const deltaY = pointer.y - from.y;

        path.points = path.points.map((point) => {
            // A point dragged past the edge of a scale has no bar and no price
            // to be stored against, so it stays where it was
            const moved = this.readPoint({ x: point.x + deltaX, y: point.y + deltaY });
            return moved ?? point;
        });

        this.draw();
        this.notifyChange();
    }

    private hitTestPath(pointer: CanvasPoint): string | null {
        for (const path of this.paths) {
            this.updatePathCoordinates(path);

            for (let i = 0; i < path.points.length - 1; i++) {
                const from = path.points[i];
                const to = path.points[i + 1];
                if (from === undefined || to === undefined) continue;

                if (distanceToSegment(pointer, from, to) <= PATH_HIT_TOLERANCE) return path.id;
            }
        }

        return null;
    }

    /**
     * Re-derives a stroke's pixels from the times and prices it is stored in,
     * which the chart invalidates on every pan and every scale change.
     */
    private updatePathCoordinates(path: FreehandPath): void {
        const timeScale = this.chart.timeScale();

        for (const point of path.points) {
            const left = timeScale.timeToCoordinate(point.time);
            const top = this.mainSeries.priceToCoordinate(point.price);

            // A point scrolled off a scale keeps its last coordinate rather
            // than collapsing the stroke onto the axis
            if (left !== null) point.x = left;
            if (top !== null) point.y = top;
        }
    }

    private clear(): void {
        if (this.ctx === null || this.canvas === null) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    private drawPath(path: FreehandPath): void {
        const ctx = this.ctx;
        const [start, ...rest] = path.points;
        if (ctx === null || start === undefined || rest.length === 0) return;

        // The stored colour is deliberately not read: a stroke follows whichever
        // theme is on now, so one drawn in a dark theme is still legible in a
        // light one
        const color = getThemeColor('--color-text-muted');

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = path.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.moveTo(start.x, start.y);
        for (const point of rest) {
            ctx.lineTo(point.x, point.y);
        }
        ctx.stroke();

        // Endpoint dots only while the stroke is actually being moved — they
        // are a grab affordance, not decoration
        if (path.id !== this.selectedPathId || this.dragFrom === null) return;

        const end = rest[rest.length - 1] ?? start;
        ctx.fillStyle = color;

        for (const point of [start, end]) {
            ctx.beginPath();
            ctx.arc(point.x, point.y, ENDPOINT_DOT_RADIUS, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    private notifyChange(): void {
        this.onChangeCallback?.();
    }
}

function generatePathId(): string {
    return `freehand_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
