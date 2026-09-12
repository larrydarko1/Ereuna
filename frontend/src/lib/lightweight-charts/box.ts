import {
    type IChartApi,
    type ISeriesApi,
    type MouseEventParams,
    type SeriesType,
    type Time,
} from '@/lib/lightweight-charts/index';
import { type CanvasPoint } from '@/lib/lightweight-charts/geometry';
import { getThemeColor, hexToRgba } from '@/lib/lightweight-charts/theme-color';

export type BoxPoint = {
    time: Time;
    price: number;
    x: number;
    y: number;
};

export type Box = {
    id: string;
    point1: BoxPoint; // The corner clicked first
    point2: BoxPoint; // The corner clicked second, diagonally opposite
    fillColor: string;
    borderColor: string;
    fillOpacity: number;
    borderWidth: number;
    locked: boolean;
};

type BoxCorner = 'tl' | 'tr' | 'bl' | 'br';

type DragTarget = { boxId: string; corner: BoxCorner | 'body' };

const DEFAULT_FILL_OPACITY = 0.15;
const DEFAULT_BORDER_WIDTH = 1;

// How close to a corner a click has to land to grab it rather than start a new box
const CORNER_HIT_RADIUS = 8;
const CORNER_HANDLE_RADIUS = 4;

// The half-drawn box carries an id no real box can collide with, so it never
// matches the selection and never picks up the selected styling
const PREVIEW_BOX_ID = 'preview';

export class BoxManager {
    private chart: IChartApi;
    private mainSeries: ISeriesApi<SeriesType>;
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private isActive = false;
    private boxes: Box[] = [];
    private currentBox: { point1: BoxPoint | null; point2: BoxPoint | null } = {
        point1: null,
        point2: null,
    };
    private selectedBoxId: string | null = null;

    // A drag is in flight exactly while this is set — there is no separate flag
    // to fall out of step with it
    private dragTarget: DragTarget | null = null;
    private dragOffset: CanvasPoint | null = null;
    private onChangeCallback: (() => void) | null = null;
    private onActivateCallback: (() => void) | null = null;

    constructor(chart: IChartApi, mainSeries: ISeriesApi<SeriesType>) {
        this.chart = chart;
        this.mainSeries = mainSeries;

        this.setupCanvas();
        this.chart.timeScale().subscribeVisibleLogicalRangeChange(this.handleVisibleRangeChange);

        // Selecting a box and deleting it both work whether or not the tool is
        // the active one, so these two listeners outlive activate/deactivate
        this.chart.subscribeClick(this.handleGlobalClick);
        document.addEventListener('keydown', this.handleKeyDown);
    }

    public onChange(callback: () => void): void {
        this.onChangeCallback = callback;
    }

    /**
     * Registers the callback that asks the toolbar to switch to this tool,
     * which is what clicking an existing box does.
     */
    public onActivate(callback: () => void): void {
        this.onActivateCallback = callback;
    }

    public activate(): void {
        if (this.isActive) return;

        this.isActive = true;
        this.currentBox = { point1: null, point2: null };

        this.chart.subscribeClick(this.handleClick);
        this.chart.subscribeCrosshairMove(this.handleCrosshairMove);
    }

    public deactivate(): void {
        if (!this.isActive) return;

        this.isActive = false;
        this.currentBox = { point1: null, point2: null };
        this.dragTarget = null;
        this.dragOffset = null;

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

    public removeSelectedBox(): void {
        if (this.selectedBoxId === null) return;

        this.boxes = this.boxes.filter((box) => box.id !== this.selectedBoxId);
        this.selectedBoxId = null;
        this.draw();
        this.notifyChange();
    }

    public getBoxes(): Box[] {
        return [...this.boxes];
    }

    public loadBoxes(boxes: Box[]): void {
        this.boxes = boxes;
        this.draw();
    }

    public draw(): void {
        this.clear();
        if (this.ctx === null) return;

        for (const box of this.boxes) {
            this.updateBoxCoordinates(box);
            this.drawBox(box);
        }

        // The box being drawn right now, following the pointer
        const { point1, point2 } = this.currentBox;
        if (point1 === null || point2 === null) return;

        const themeColor = getThemeColor('--color-text-muted');
        this.drawBox({
            id: PREVIEW_BOX_ID,
            point1,
            point2,
            fillColor: themeColor,
            borderColor: themeColor,
            fillOpacity: DEFAULT_FILL_OPACITY,
            borderWidth: DEFAULT_BORDER_WIDTH,
            locked: false,
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
     * Clicking a box picks it up even when another tool is in front, which is
     * the only way to reach one without first hunting for the right toolbar
     * button.
     */
    private handleGlobalClick = (param: MouseEventParams<Time>): void => {
        if (this.isActive || param.point === undefined) return;

        const boxId = this.hitTestBody(param.point);
        if (boxId === null) return;

        this.selectedBoxId = boxId;
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

        if (this.selectedBoxId !== null) {
            event.preventDefault(); // Backspace would otherwise navigate back
            this.removeSelectedBox();
        }
    };

    private handleClick = (param: MouseEventParams<Time>): void => {
        const pointer = this.readPoint(param);
        if (pointer === null) return;

        // A click is also what ends a drag: the chart reports clicks and
        // crosshair moves, never a mouseup
        if (this.dragTarget !== null) {
            this.dragTarget = null;
            this.dragOffset = null;
            this.draw();
            return;
        }

        if (this.grabBox(pointer)) return;

        this.placeCorner(pointer);
        this.draw();
    };

    private handleCrosshairMove = (param: MouseEventParams<Time>): void => {
        const pointer = this.readPoint(param);
        if (pointer === null) return;

        if (this.dragTarget !== null) {
            this.dragTo(pointer);
            return;
        }

        // Half-drawn: the far corner follows the pointer as a preview
        if (this.currentBox.point1 !== null) {
            this.currentBox.point2 = pointer;
            this.draw();
        }
    };

    private setupCanvas(): void {
        // An overlay canvas below the trendlines' own
        const chartContainer = this.chart.chartElement();

        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '98';

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
    private readPoint(param: MouseEventParams<Time>): BoxPoint | null {
        if (param.point === undefined || param.time === undefined) return null;

        const price = this.mainSeries.coordinateToPrice(param.point.y);
        if (price === null) return null;

        return { time: param.time, price, x: param.point.x, y: param.point.y };
    }

    /**
     * Picks up whatever the click landed on — a corner to resize, or a body to
     * move — and reports whether it took hold of anything.
     */
    private grabBox(pointer: CanvasPoint): boolean {
        const corner = this.hitTestCorner(pointer);
        if (corner !== null) {
            this.dragTarget = corner;
            this.dragOffset = null;
            this.selectedBoxId = corner.boxId;
            this.draw();
            return true;
        }

        const boxId = this.hitTestBody(pointer);
        const box = this.boxes.find((candidate) => candidate.id === boxId);
        if (box === undefined) return false;

        this.dragTarget = { boxId: box.id, corner: 'body' };
        this.selectedBoxId = box.id;

        // Where inside the box the grab landed, so the shape does not jump its
        // corner to the pointer
        this.dragOffset = {
            x: pointer.x - Math.min(box.point1.x, box.point2.x),
            y: pointer.y - Math.min(box.point1.y, box.point2.y),
        };

        this.draw();
        return true;
    }

    /**
     * A box is drawn in two clicks: the first pins a corner, the second closes
     * the shape.
     */
    private placeCorner(pointer: BoxPoint): void {
        if (this.currentBox.point1 === null) {
            this.currentBox.point1 = pointer;
            this.selectedBoxId = null;
            return;
        }

        const themeColor = getThemeColor('--color-text-muted');

        this.boxes.push({
            id: generateBoxId(),
            point1: { ...this.currentBox.point1 },
            point2: { ...pointer },
            fillColor: themeColor,
            borderColor: themeColor,
            fillOpacity: DEFAULT_FILL_OPACITY,
            borderWidth: DEFAULT_BORDER_WIDTH,
            locked: false,
        });

        this.currentBox = { point1: null, point2: null };

        // Left unselected, so the next click starts a new box rather than
        // grabbing the one just finished
        this.selectedBoxId = null;
        this.notifyChange();
    }

    /** Applies one frame of a drag to whichever box was grabbed. */
    private dragTo(pointer: BoxPoint): void {
        const target = this.dragTarget;
        if (target === null) return;

        const box = this.boxes.find((candidate) => candidate.id === target.boxId);
        if (box === undefined || box.locked) return;

        if (target.corner === 'body') {
            this.moveBox(box, pointer);
        } else {
            resizeBox(box, target.corner, pointer);
        }

        this.draw();
    }

    private moveBox(box: Box, pointer: CanvasPoint): void {
        const offset = this.dragOffset;
        if (offset === null) return;

        const width = Math.abs(box.point2.x - box.point1.x);
        const height = Math.abs(box.point2.y - box.point1.y);

        const left = pointer.x - offset.x;
        const top = pointer.y - offset.y;

        // A box is stored in time and price and redrawn from those, so a move
        // that only wrote pixels would be undone by the next pan
        const timeScale = this.chart.timeScale();
        const startTime = timeScale.coordinateToTime(left);
        const endTime = timeScale.coordinateToTime(left + width);
        const topPrice = this.mainSeries.coordinateToPrice(top);
        const bottomPrice = this.mainSeries.coordinateToPrice(top + height);

        if (startTime === null || endTime === null || topPrice === null || bottomPrice === null) return;

        // A moved box is normalised to point1 = top-left, which is what the
        // offset was measured against
        box.point1 = { time: startTime, price: topPrice, x: left, y: top };
        box.point2 = { time: endTime, price: bottomPrice, x: left + width, y: top + height };
    }

    private hitTestCorner(pointer: CanvasPoint): { boxId: string; corner: BoxCorner } | null {
        for (const box of this.boxes) {
            if (box.locked) continue;

            this.updateBoxCoordinates(box);
            const bounds = boundsOf(box);

            const corners: { corner: BoxCorner; x: number; y: number }[] = [
                { corner: 'tl', x: bounds.left, y: bounds.top },
                { corner: 'tr', x: bounds.right, y: bounds.top },
                { corner: 'bl', x: bounds.left, y: bounds.bottom },
                { corner: 'br', x: bounds.right, y: bounds.bottom },
            ];

            for (const candidate of corners) {
                if (Math.hypot(candidate.x - pointer.x, candidate.y - pointer.y) <= CORNER_HIT_RADIUS) {
                    return { boxId: box.id, corner: candidate.corner };
                }
            }
        }

        return null;
    }

    private hitTestBody(pointer: CanvasPoint): string | null {
        for (const box of this.boxes) {
            this.updateBoxCoordinates(box);
            const bounds = boundsOf(box);

            const inside =
                pointer.x >= bounds.left &&
                pointer.x <= bounds.right &&
                pointer.y >= bounds.top &&
                pointer.y <= bounds.bottom;

            if (inside) return box.id;
        }

        return null;
    }

    /**
     * Re-derives a box's pixel corners from the time and price it is stored in,
     * which the chart invalidates on every pan and every scale change.
     */
    private updateBoxCoordinates(box: Box): void {
        const timeScale = this.chart.timeScale();
        const x1 = timeScale.timeToCoordinate(box.point1.time);
        const y1 = this.mainSeries.priceToCoordinate(box.point1.price);
        const x2 = timeScale.timeToCoordinate(box.point2.time);
        const y2 = this.mainSeries.priceToCoordinate(box.point2.price);

        // A corner scrolled off the scale keeps its last coordinate rather than
        // collapsing the box onto the axis
        if (x1 !== null) box.point1.x = x1;
        if (y1 !== null) box.point1.y = y1;
        if (x2 !== null) box.point2.x = x2;
        if (y2 !== null) box.point2.y = y2;
    }

    private clear(): void {
        if (this.ctx === null || this.canvas === null) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    private drawBox(box: Box): void {
        const ctx = this.ctx;
        if (ctx === null) return;

        // The stored colours are deliberately not read: a box follows whichever
        // theme is on now, so one drawn in a dark theme is still legible in a
        // light one
        const themeColor = getThemeColor('--color-text-muted');
        const bounds = boundsOf(box);
        const width = bounds.right - bounds.left;
        const height = bounds.bottom - bounds.top;
        const isSelected = box.id === this.selectedBoxId;

        ctx.fillStyle = hexToRgba(themeColor, box.fillOpacity);
        ctx.fillRect(bounds.left, bounds.top, width, height);

        ctx.strokeStyle = themeColor;
        ctx.lineWidth = isSelected ? box.borderWidth + 1 : box.borderWidth;
        ctx.strokeRect(bounds.left, bounds.top, width, height);

        // Handles only while the box is actually being edited — four dots on
        // every selected box is noise
        if (!isSelected || box.locked || this.dragTarget === null) return;

        this.drawCornerHandle(bounds.left, bounds.top, themeColor);
        this.drawCornerHandle(bounds.right, bounds.top, themeColor);
        this.drawCornerHandle(bounds.left, bounds.bottom, themeColor);
        this.drawCornerHandle(bounds.right, bounds.bottom, themeColor);
    }

    private drawCornerHandle(left: number, top: number, color: string): void {
        const ctx = this.ctx;
        if (ctx === null) return;

        // The handle reads as a ring cut out of the chart, which only works if
        // the middle is the chart's own background
        const holeColor = getThemeColor('--color-bg');

        ctx.beginPath();
        ctx.arc(left, top, CORNER_HANDLE_RADIUS, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = holeColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(left, top, CORNER_HANDLE_RADIUS - 1.5, 0, 2 * Math.PI);
        ctx.fillStyle = holeColor;
        ctx.fill();
    }

    private notifyChange(): void {
        this.onChangeCallback?.();
    }
}

function boundsOf(box: Box): { left: number; top: number; right: number; bottom: number } {
    return {
        left: Math.min(box.point1.x, box.point2.x),
        top: Math.min(box.point1.y, box.point2.y),
        right: Math.max(box.point1.x, box.point2.x),
        bottom: Math.max(box.point1.y, box.point2.y),
    };
}

/**
 * Drags the one grabbed corner, keeping the two it is not adjacent to where
 * they are — a corner owns one edge of each axis, not a whole point.
 */
function resizeBox(box: Box, corner: BoxCorner, pointer: BoxPoint): void {
    switch (corner) {
        case 'tl':
            box.point1 = { ...pointer };
            break;
        case 'br':
            box.point2 = { ...pointer };
            break;
        case 'tr':
            box.point1.time = pointer.time;
            box.point1.x = pointer.x;
            box.point2.price = pointer.price;
            box.point2.y = pointer.y;
            break;
        case 'bl':
            box.point2.time = pointer.time;
            box.point2.x = pointer.x;
            box.point1.price = pointer.price;
            box.point1.y = pointer.y;
            break;
    }
}

function generateBoxId(): string {
    return `box_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
