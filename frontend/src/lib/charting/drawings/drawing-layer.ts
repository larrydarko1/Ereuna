/**
 * The half of every drawing tool that is not about the shape it draws.
 *
 * Each tool owns one absolutely-positioned canvas stacked over the chart, and
 * all of them need the same things from it: mount it, keep it in step with the
 * device pixel ratio and the container, redraw on every pan and scale change,
 * answer Delete, let a click reach an existing shape even while a different
 * tool is up, and take every listener back down on destroy. That is all here,
 * and what remains in a tool's own module is the shape.
 *
 * The listener bookkeeping is the reason this is a base class rather than a
 * helper: `removeEventListener` and the chart's `unsubscribe*` match on
 * identity, so the handlers have to be the same arrow properties that were
 * registered, and a tool that rebuilt one would leak it instead.
 */
import { type IChartApi } from '@/lib/charting/engine/api/create-chart';
import { type MouseEventParams } from '@/lib/charting/engine/api/ichart-api';
import { type ISeriesApi } from '@/lib/charting/engine/api/iseries-api';
import { type Time } from '@/lib/charting/engine/model/time/types';
import { type SeriesType } from '@/lib/charting/engine/model/series/series-options';
import { type CanvasPoint } from '@/lib/charting/shared/geometry';

/**
 * A point every tool stores the same way: in time and price, which survive a
 * pan, alongside the pixels they last resolved to.
 */
export type AnchoredPoint = {
    time: Time;
    price: number;
    x: number;
    y: number;
};

export abstract class DrawingLayer {
    protected readonly chart: IChartApi;
    protected readonly mainSeries: ISeriesApi<SeriesType>;
    protected canvas: HTMLCanvasElement | null = null;
    protected ctx: CanvasRenderingContext2D | null = null;

    private active = false;
    private readonly zIndex: number;
    private changeCallback: (() => void) | null = null;
    private activateCallback: (() => void) | null = null;

    protected constructor(chart: IChartApi, mainSeries: ISeriesApi<SeriesType>, zIndex: number) {
        this.chart = chart;
        this.mainSeries = mainSeries;
        this.zIndex = zIndex;
    }

    public onChange(callback: () => void): void {
        this.changeCallback = callback;
    }

    /**
     * Registers the callback that asks the toolbar to switch to this tool,
     * which is what clicking one of its existing shapes does.
     */
    public onActivate(callback: () => void): void {
        this.activateCallback = callback;
    }

    public isToolActive(): boolean {
        return this.active;
    }

    public activate(): void {
        if (this.active) return;

        this.active = true;
        this.startInteraction();
    }

    public deactivate(): void {
        if (!this.active) return;

        this.active = false;
        this.stopInteraction();
    }

    public toggle(): void {
        if (this.active) {
            this.deactivate();
        } else {
            this.activate();
        }
    }

    /** Repaints the whole overlay from the tool's stored shapes. */
    public abstract draw(): void;

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

    /**
     * Builds the canvas and starts listening.
     *
     * A subclass calls this as the LAST statement of its constructor, never
     * earlier and never from here: mounting paints, painting calls `draw`, and
     * `draw` reads fields that a subclass only initialises after the base
     * constructor has returned.
     */
    protected mount(): void {
        const chartContainer = this.chart.chartElement();

        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = String(this.zIndex);

        chartContainer.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this.resizeCanvas();

        window.addEventListener('resize', this.handleResize);
        this.chart.timeScale().subscribeVisibleLogicalRangeChange(this.handleVisibleRangeChange);

        // Selecting a shape and deleting it both work whether or not this tool
        // is the active one, so these two outlive activate/deactivate
        this.chart.subscribeClick(this.handleGlobalClick);
        document.addEventListener('keydown', this.handleKeyDown);
    }

    /** Wires up whatever this tool listens to while it is the selected one. */
    protected abstract startInteraction(): void;

    /** Undoes `startInteraction`, and drops any half-finished shape. */
    protected abstract stopInteraction(): void;

    /** Selects the shape under the pointer, reporting whether one was there. */
    protected abstract selectAt(pointer: CanvasPoint): boolean;

    /** Whether a shape of this tool's is currently selected. */
    protected abstract hasSelection(): boolean;

    /** Deletes the selected shape, redraws, and notifies. */
    protected abstract removeSelected(): void;

    /**
     * Turns a crosshair event into a point on the plot, or `null` when it did
     * not land on one — off the edge there is no bar and no price.
     */
    protected readPoint(param: MouseEventParams<Time>): AnchoredPoint | null {
        if (param.point === undefined || param.time === undefined) return null;

        const price = this.mainSeries.coordinateToPrice(param.point.y);
        if (price === null) return null;

        return { time: param.time, price, x: param.point.x, y: param.point.y };
    }

    protected clear(): void {
        if (this.ctx === null || this.canvas === null) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    protected notifyChange(): void {
        this.changeCallback?.();
    }

    protected notifyActivate(): void {
        this.activateCallback?.();
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

    // The handlers below are arrow properties so that `this` survives being
    // handed to addEventListener and to the chart's own subscriptions, and so
    // that the reference passed to unsubscribe is the one that was subscribed
    private handleVisibleRangeChange = (): void => {
        this.draw();
    };

    private handleResize = (): void => {
        this.resizeCanvas();
    };

    /**
     * Clicking a shape picks it up even when another tool is in front, which is
     * the only way to reach one without first hunting for the right toolbar
     * button.
     */
    private handleGlobalClick = (param: MouseEventParams<Time>): void => {
        if (this.active || param.point === undefined) return;
        if (!this.selectAt(param.point)) return;

        this.draw();
        this.notifyActivate();
    };

    private handleKeyDown = (event: KeyboardEvent): void => {
        if (event.key !== 'Backspace' && event.key !== 'Delete') return;

        // Not while the caret is in a field — there the key means "erase a
        // character"
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }

        if (!this.hasSelection()) return;

        event.preventDefault(); // Backspace would otherwise navigate back
        this.removeSelected();
    };
}
