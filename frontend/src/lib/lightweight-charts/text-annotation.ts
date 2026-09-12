import {
    type IChartApi,
    type ISeriesApi,
    type MouseEventParams,
    type SeriesType,
    type Time,
} from '@/lib/lightweight-charts/index';
import { traceRoundedRect } from '@/lib/lightweight-charts/canvas-path';
import { type CanvasPoint } from '@/lib/lightweight-charts/geometry';
import { getThemeColor, hexToRgba } from '@/lib/lightweight-charts/theme-color';

export type TextAnnotationPoint = {
    time: Time;
    price: number;
    x: number;
    y: number;
};

export type TextAnnotation = {
    id: string;
    point: TextAnnotationPoint;
    text: string;
    fontSize: number;
    textColor: string;
    backgroundColor: string;
    backgroundOpacity: number;
    locked: boolean;
};

type AnnotationBounds = { x: number; y: number; width: number; height: number };

const DEFAULT_FONT_SIZE = 11;
const DEFAULT_BACKGROUND_OPACITY = 0.7;
const FONT_FAMILY = 'Arial, sans-serif';
const LINE_HEIGHT_RATIO = 1.2;
const BOX_PADDING = 6;
const BOX_RADIUS = 4;

// English, because this input is built in the DOM and cannot reach i18n. It
// belongs in the locale files, which means the input belongs in a component.
const TEXT_INPUT_PLACEHOLDER = 'Enter text...';

export class TextAnnotationManager {
    private chart: IChartApi;
    private mainSeries: ISeriesApi<SeriesType>;
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private isActive = false;
    private annotations: TextAnnotation[] = [];
    private selectedAnnotationId: string | null = null;

    // A drag is in flight exactly while this is set — there is no separate flag
    // to fall out of step with it
    private dragOffset: CanvasPoint | null = null;
    private textInput: HTMLInputElement | null = null;
    private onChangeCallback: (() => void) | null = null;
    private onActivateCallback: (() => void) | null = null;

    constructor(chart: IChartApi, mainSeries: ISeriesApi<SeriesType>) {
        this.chart = chart;
        this.mainSeries = mainSeries;

        this.setupCanvas();
        this.chart.timeScale().subscribeVisibleLogicalRangeChange(this.handleVisibleRangeChange);

        // Selecting an annotation and deleting it both work whether or not the
        // tool is the active one, so these two listeners outlive
        // activate/deactivate
        this.chart.subscribeClick(this.handleGlobalClick);
        document.addEventListener('keydown', this.handleKeyDown);
    }

    public onChange(callback: () => void): void {
        this.onChangeCallback = callback;
    }

    /**
     * Registers the callback that asks the toolbar to switch to this tool,
     * which is what clicking an existing annotation does.
     */
    public onActivate(callback: () => void): void {
        this.onActivateCallback = callback;
    }

    public activate(): void {
        if (this.isActive) return;

        this.isActive = true;

        this.chart.subscribeClick(this.handleClick);
        this.chart.subscribeCrosshairMove(this.handleCrosshairMove);
    }

    public deactivate(): void {
        if (!this.isActive) return;

        this.isActive = false;
        this.dragOffset = null;
        this.removeTextInput();

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

    public removeSelectedAnnotation(): void {
        if (this.selectedAnnotationId === null) return;

        this.annotations = this.annotations.filter((annotation) => annotation.id !== this.selectedAnnotationId);
        this.selectedAnnotationId = null;
        this.draw();
        this.notifyChange();
    }

    public getAnnotations(): TextAnnotation[] {
        return [...this.annotations];
    }

    public loadAnnotations(annotations: TextAnnotation[]): void {
        this.annotations = annotations;
        this.draw();
    }

    public draw(): void {
        this.clear();
        if (this.ctx === null) return;

        for (const annotation of this.annotations) {
            this.updateAnnotationCoordinates(annotation);
            this.drawAnnotation(annotation);
        }
    }

    public destroy(): void {
        this.deactivate();
        this.removeTextInput();

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
     * Clicking an annotation picks it up even when another tool is in front,
     * which is the only way to reach one without first hunting for the right
     * toolbar button.
     */
    private handleGlobalClick = (param: MouseEventParams<Time>): void => {
        if (this.isActive || param.point === undefined) return;

        const annotationId = this.hitTestAnnotation(param.point);
        if (annotationId === null) return;

        this.selectedAnnotationId = annotationId;
        this.draw();
        this.onActivateCallback?.();
    };

    private handleKeyDown = (event: KeyboardEvent): void => {
        if (event.key !== 'Backspace' && event.key !== 'Delete') return;

        // Not while the caret is in a field — there the key means "erase a
        // character", including inside this tool's own text input
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }

        if (this.selectedAnnotationId !== null) {
            event.preventDefault(); // Backspace would otherwise navigate back
            this.removeSelectedAnnotation();
        }
    };

    private handleClick = (param: MouseEventParams<Time>): void => {
        if (param.point === undefined) return;

        // A click is also what ends a drag: the chart reports clicks and
        // crosshair moves, never a mouseup
        if (this.dragOffset !== null) {
            this.dragOffset = null;
            this.draw();
            return;
        }

        const annotationId = this.hitTestAnnotation(param.point);
        if (annotationId !== null) {
            this.grabAnnotation(annotationId, param.point);
            return;
        }

        const anchor = this.readAt(param.point);
        if (anchor === null) return;

        this.openTextInput(param.point, (text) => {
            this.addAnnotation(anchor, text);
        });
    };

    private handleCrosshairMove = (param: MouseEventParams<Time>): void => {
        const offset = this.dragOffset;
        if (offset === null || param.point === undefined) return;

        const annotation = this.annotations.find((candidate) => candidate.id === this.selectedAnnotationId);
        if (annotation === undefined || annotation.locked) return;

        // The anchor is re-read at the shifted position rather than at the
        // pointer, or the annotation would jump by the grab offset the next
        // time it is drawn from its stored time and price
        const moved = this.readAt({ x: param.point.x - offset.x, y: param.point.y - offset.y });
        if (moved === null) return;

        annotation.point = moved;
        this.draw();
    };

    private setupCanvas(): void {
        // An overlay canvas above the trendlines' and the boxes' own
        const chartContainer = this.chart.chartElement();

        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '100';

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
     * Anchors a canvas position to the bar and price under it, which is what an
     * annotation is stored as — pixels mean nothing once the chart pans.
     */
    private readAt(pointer: CanvasPoint): TextAnnotationPoint | null {
        const time = this.chart.timeScale().coordinateToTime(pointer.x);
        const price = this.mainSeries.coordinateToPrice(pointer.y);
        if (time === null || price === null) return null;

        return { time, price, x: pointer.x, y: pointer.y };
    }

    private grabAnnotation(annotationId: string, pointer: CanvasPoint): void {
        this.selectedAnnotationId = annotationId;

        const annotation = this.annotations.find((candidate) => candidate.id === annotationId);
        if (annotation !== undefined) {
            // Where inside the label the grab landed, so it does not jump its
            // corner to the pointer
            this.dragOffset = { x: pointer.x - annotation.point.x, y: pointer.y - annotation.point.y };
        }

        this.draw();
    }

    private addAnnotation(anchor: TextAnnotationPoint, text: string): void {
        this.annotations.push({
            id: generateAnnotationId(),
            point: anchor,
            text,
            fontSize: DEFAULT_FONT_SIZE,
            textColor: getThemeColor('--color-text'),
            backgroundColor: getThemeColor('--color-elevated'),
            backgroundOpacity: DEFAULT_BACKGROUND_OPACITY,
            locked: false,
        });

        // Left unselected, so the next click starts a new annotation rather
        // than grabbing the one just written
        this.selectedAnnotationId = null;
        this.draw();
        this.notifyChange();
    }

    /**
     * Floats a text field over the chart at the click, and hands back whatever
     * was typed. Empty text is a cancellation, not an empty annotation.
     */
    private openTextInput(at: CanvasPoint, onSubmit: (text: string) => void): void {
        this.removeTextInput();

        const textColor = getThemeColor('--color-text');
        const backgroundColor = getThemeColor('--color-elevated');

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = TEXT_INPUT_PLACEHOLDER;

        Object.assign(input.style, {
            position: 'absolute',
            left: `${at.x}px`,
            top: `${at.y}px`,
            fontSize: `${DEFAULT_FONT_SIZE}px`,
            fontFamily: FONT_FAMILY,
            padding: '4px 8px',
            border: `1px solid ${textColor}`,
            borderRadius: `${BOX_RADIUS}px`,
            background: backgroundColor,
            color: textColor,
            outline: 'none',
            zIndex: '1000',
            minWidth: '120px',
        });

        this.textInput = input;
        this.chart.chartElement().appendChild(input);
        input.focus();
        input.select();

        // Committing removes the field, which blurs it and would commit a second
        // time — so whichever of the three ways out fires first is the only one
        // that counts
        let settled = false;
        const settle = (text: string): void => {
            if (settled) return;
            settled = true;

            this.removeTextInput();
            if (text !== '') onSubmit(text);
        };

        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                settle(input.value.trim());
            } else if (event.key === 'Escape') {
                event.preventDefault();
                settle('');
            }
        });

        input.addEventListener('blur', () => {
            settle(input.value.trim());
        });
    }

    private removeTextInput(): void {
        this.textInput?.remove();
        this.textInput = null;
    }

    private hitTestAnnotation(pointer: CanvasPoint): string | null {
        const ctx = this.ctx;
        if (ctx === null) return null;

        for (const annotation of this.annotations) {
            this.updateAnnotationCoordinates(annotation);
            const bounds = measureAnnotation(ctx, annotation);

            const inside =
                pointer.x >= bounds.x &&
                pointer.x <= bounds.x + bounds.width &&
                pointer.y >= bounds.y &&
                pointer.y <= bounds.y + bounds.height;

            if (inside) return annotation.id;
        }

        return null;
    }

    /**
     * Re-derives an annotation's pixels from the time and price it is stored in,
     * which the chart invalidates on every pan and every scale change.
     */
    private updateAnnotationCoordinates(annotation: TextAnnotation): void {
        const left = this.chart.timeScale().timeToCoordinate(annotation.point.time);
        const top = this.mainSeries.priceToCoordinate(annotation.point.price);

        // An annotation scrolled off a scale keeps its last coordinate rather
        // than collapsing onto the axis
        if (left !== null) annotation.point.x = left;
        if (top !== null) annotation.point.y = top;
    }

    private clear(): void {
        if (this.ctx === null || this.canvas === null) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    private drawAnnotation(annotation: TextAnnotation): void {
        const ctx = this.ctx;
        if (ctx === null) return;

        // The stored colours are deliberately not read: an annotation follows
        // whichever theme is on now, so one written in a dark theme is still
        // legible in a light one
        const textColor = getThemeColor('--color-text');
        const backgroundColor = getThemeColor('--color-elevated');
        const bounds = measureAnnotation(ctx, annotation);

        ctx.fillStyle = hexToRgba(backgroundColor, annotation.backgroundOpacity);
        traceRoundedRect(ctx, { ...bounds, radius: BOX_RADIUS });
        ctx.fill();

        // An outline only while the annotation is actually being moved — it is
        // a grab affordance, not decoration
        if (annotation.id === this.selectedAnnotationId && this.dragOffset !== null) {
            ctx.strokeStyle = textColor;
            ctx.lineWidth = 2;
            traceRoundedRect(ctx, { ...bounds, radius: BOX_RADIUS });
            ctx.stroke();
        }

        ctx.fillStyle = textColor;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillText(annotation.text, bounds.x + BOX_PADDING, annotation.point.y);
    }

    private notifyChange(): void {
        this.onChangeCallback?.();
    }
}

/**
 * The label's box, measured against the canvas — the text's own width is the
 * only thing that decides it, so it has to be asked for rather than stored.
 *
 * Sets `ctx.font` as a side effect, which is also what the caller needs set
 * before it draws the text.
 */
function measureAnnotation(ctx: CanvasRenderingContext2D, annotation: TextAnnotation): AnnotationBounds {
    ctx.font = `${annotation.fontSize}px ${FONT_FAMILY}`;

    const width = ctx.measureText(annotation.text).width + BOX_PADDING * 2;
    const height = annotation.fontSize * LINE_HEIGHT_RATIO + BOX_PADDING * 2;

    // The anchor is the box's left edge, vertically centred on the price it marks
    return { x: annotation.point.x, y: annotation.point.y - height / 2, width, height };
}

function generateAnnotationId(): string {
    return `txt_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
