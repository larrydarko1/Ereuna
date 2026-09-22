/**
 * The rectangle tool: two clicks to draw one, corners to resize it, body to
 * move it.
 *
 * A box is stored in time and price rather than pixels, so it stays put over a
 * pan or a scale change; `updateBoxCoordinates` is what re-derives the pixels
 * before anything reads them.
 */
import { boundsOf, cornersOf, generateBoxId, resizeBox } from '@/lib/charting/drawings/box-shape';
import { type Box, type BoxCorner, type BoxPoint } from '@/lib/charting/drawings/box-types';
import { DrawingLayer } from '@/lib/charting/drawings/drawing-layer';
import { type IChartApi } from '@/lib/charting/engine/api/create-chart';
import { type MouseEventParams } from '@/lib/charting/engine/api/ichart-api';
import { type ISeriesApi } from '@/lib/charting/engine/api/iseries-api';
import { type SeriesType } from '@/lib/charting/engine/model/series/series-options';
import { type Time } from '@/lib/charting/engine/model/time/types';
import { drawHandle } from '@/lib/charting/shared/canvas-path';
import { type CanvasPoint } from '@/lib/charting/shared/geometry';
import { getThemeColor, hexToRgba } from '@/lib/charting/shared/theme-color';

export type { Box, BoxPoint } from '@/lib/charting/drawings/box-types';

type DragTarget = { boxId: string; corner: BoxCorner | 'body' };

const DEFAULT_FILL_OPACITY = 0.15;
const DEFAULT_BORDER_WIDTH = 1;

// How close to a corner a click has to land to grab it rather than start a new box
const CORNER_HIT_RADIUS = 8;
const CORNER_HANDLE_RADIUS = 4;

// The half-drawn box carries an id no real box can collide with, so it never
// matches the selection and never picks up the selected styling
const PREVIEW_BOX_ID = 'preview';

const BOX_LAYER_Z_INDEX = 98;

export class BoxManager extends DrawingLayer {
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

    public constructor(chart: IChartApi, mainSeries: ISeriesApi<SeriesType>) {
        super(chart, mainSeries, BOX_LAYER_Z_INDEX);
        this.mount();
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

    public override draw(): void {
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

    protected override startInteraction(): void {
        this.currentBox = { point1: null, point2: null };

        this.chart.subscribeClick(this.handleClick);
        this.chart.subscribeCrosshairMove(this.handleCrosshairMove);
    }

    protected override stopInteraction(): void {
        this.currentBox = { point1: null, point2: null };
        this.dragTarget = null;
        this.dragOffset = null;

        this.chart.unsubscribeClick(this.handleClick);
        this.chart.unsubscribeCrosshairMove(this.handleCrosshairMove);
    }

    protected override selectAt(pointer: CanvasPoint): boolean {
        const boxId = this.hitTestBody(pointer);
        if (boxId === null) return false;

        this.selectedBoxId = boxId;
        return true;
    }

    protected override hasSelection(): boolean {
        return this.selectedBoxId !== null;
    }

    protected override removeSelected(): void {
        this.removeSelectedBox();
    }

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

            for (const candidate of cornersOf(box)) {
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

        // The hole has to be the chart's own background for the ring to read
        const handle = { radius: CORNER_HANDLE_RADIUS, color: themeColor, holeColor: getThemeColor('--color-bg') };
        for (const corner of cornersOf(box)) {
            drawHandle(ctx, corner, handle);
        }
    }
}
