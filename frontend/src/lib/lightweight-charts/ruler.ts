/**
 * The measuring tool: drag between two points to read the move between them
 * in price, percent and bars.
 *
 * Unlike the other tools nothing it draws is kept — a ruler exists only while the
 * pointer is down.
 */
import { type IChartApi } from '@/lib/lightweight-charts/api/create-chart';
import { type MouseEventParams } from '@/lib/lightweight-charts/api/ichart-api';
import { type ISeriesApi } from '@/lib/lightweight-charts/api/iseries-api';
import { type Time } from '@/lib/lightweight-charts/model/horz-scale-behavior-time/types';
import { type SeriesType } from '@/lib/lightweight-charts/model/series-options';
import { traceRoundedRect } from '@/lib/lightweight-charts/canvas-path';
import { getThemeColor } from '@/lib/lightweight-charts/theme-color';
import { timeToTimestamp } from '@/lib/lightweight-charts/time-conversion';

export type RulerPoint = {
    time: Time;
    price: number;
    x: number;
    y: number;
};

const SECONDS_PER_DAY = 86400;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_MINUTE = 60;

export class ChartRuler {
    private chart: IChartApi;
    private mainSeries: ISeriesApi<SeriesType>;
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private isActive = false;
    private isLocked = false;
    private anchorPoint: RulerPoint | null = null;
    private currentPoint: RulerPoint | null = null;
    private clickHandler: ((param: MouseEventParams<Time>) => void) | null = null;
    private moveHandler: ((param: MouseEventParams<Time>) => void) | null = null;

    constructor(chart: IChartApi, mainSeries: ISeriesApi<SeriesType>) {
        this.chart = chart;
        this.mainSeries = mainSeries;
        this.setupCanvas();
    }

    public resetMeasurement(): void {
        this.anchorPoint = null;
        this.currentPoint = null;
        this.isLocked = false;
        this.clear();
    }

    public activate(): void {
        if (this.isActive) return;

        this.isActive = true;
        this.anchorPoint = null;
        this.currentPoint = null;

        this.clickHandler = (param: MouseEventParams<Time>): void => {
            const point = this.readPoint(param);
            if (point === null) return;

            if (this.anchorPoint === null) {
                // First click: set the anchor
                this.anchorPoint = point;
                this.isLocked = false;
            } else if (!this.isLocked) {
                // Second click: lock the measurement
                this.currentPoint = point;
                this.isLocked = true;
            } else {
                // Third click: start over
                this.anchorPoint = point;
                this.currentPoint = null;
                this.isLocked = false;
            }
            this.draw();
        };

        this.moveHandler = (param: MouseEventParams<Time>): void => {
            // The pointer only drags the far end while a measurement is open
            if (this.anchorPoint === null || this.isLocked) return;

            const point = this.readPoint(param);
            if (point === null) return;

            this.currentPoint = point;
            this.draw();
        };

        this.chart.subscribeClick(this.clickHandler);
        this.chart.subscribeCrosshairMove(this.moveHandler);
    }

    public deactivate(): void {
        if (!this.isActive) return;

        this.isActive = false;
        this.isLocked = false;
        this.anchorPoint = null;
        this.currentPoint = null;

        if (this.clickHandler !== null) {
            this.chart.unsubscribeClick(this.clickHandler);
            this.clickHandler = null;
        }

        if (this.moveHandler !== null) {
            this.chart.unsubscribeCrosshairMove(this.moveHandler);
            this.moveHandler = null;
        }

        this.clear();
    }

    public toggle(): void {
        if (this.isActive) {
            this.deactivate();
        } else {
            this.activate();
        }
    }

    public isRulerActive(): boolean {
        return this.isActive;
    }

    public destroy(): void {
        this.deactivate();

        this.canvas?.parentElement?.removeChild(this.canvas);

        this.canvas = null;
        this.ctx = null;
    }

    private setupCanvas(): void {
        // An overlay canvas above the chart's own layers
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
        window.addEventListener('resize', () => this.resizeCanvas());
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
     * Turns a crosshair event into a ruler point, or `null` when it did not land
     * on the plot — off the edge there is no bar and no price to measure from
     */
    private readPoint(param: MouseEventParams<Time>): RulerPoint | null {
        if (param.point === undefined || param.time === undefined) return null;

        const price = this.mainSeries.coordinateToPrice(param.point.y);
        if (price === null) return null;

        return { time: param.time, price, x: param.point.x, y: param.point.y };
    }

    private clear(): void {
        if (this.ctx === null || this.canvas === null) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    private draw(): void {
        this.clear();

        const ctx = this.ctx;
        const anchor = this.anchorPoint;
        const current = this.currentPoint;
        if (ctx === null || anchor === null || current === null) return;

        const priceChange = current.price - anchor.price;
        const priceChangePercent = (priceChange / anchor.price) * 100;
        const timeText = this.formatTimeDifference(anchor.time, current.time);

        const isPositive = priceChangePercent >= 0;
        const lineColor = isPositive ? getThemeColor('--color-positive') : getThemeColor('--color-negative');

        ctx.beginPath();
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.moveTo(anchor.x, anchor.y);
        ctx.lineTo(current.x, current.y);
        ctx.stroke();
        ctx.setLineDash([]);

        this.drawPoint(anchor.x, anchor.y, lineColor);
        this.drawPoint(current.x, current.y, lineColor);

        const changeText = `${isPositive ? '+' : ''}${priceChangePercent.toFixed(2)}%`;
        const priceText = `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}`;

        this.drawInfoBox({
            x: (anchor.x + current.x) / 2,
            y: (anchor.y + current.y) / 2,
            changeText,
            priceText,
            timeText,
            isPositive,
        });
    }

    private drawPoint(x: number, y: number, color: string): void {
        const ctx = this.ctx;
        if (ctx === null) return;

        // Shadow for depth
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;

        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Inner dot, so the anchor stays visible against its own fill
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fillStyle = getThemeColor('--color-text-inverted');
        ctx.fill();
    }

    private drawInfoBox(box: {
        x: number;
        y: number;
        changeText: string;
        priceText: string;
        timeText: string;
        isPositive: boolean;
    }): void {
        const ctx = this.ctx;
        if (ctx === null || this.canvas === null) return;

        const { x, y, changeText, priceText, timeText, isPositive } = box;
        const padding = 10;
        const lineHeight = 20;
        const borderRadius = 6;

        const accentColor = isPositive ? getThemeColor('--color-positive') : getThemeColor('--color-negative');

        ctx.font = '600 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
        const changeWidth = ctx.measureText(changeText).width;
        const priceWidth = ctx.measureText(priceText).width;
        ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
        const timeWidth = ctx.measureText(timeText).width;
        const maxWidth = Math.max(changeWidth, priceWidth, timeWidth);

        const boxWidth = maxWidth + padding * 2 + 10;
        const boxHeight = lineHeight * 3 + padding * 2;

        // Keep the box on screen: above the midpoint by default, below it when
        // that would clip, and pinned inside either edge
        const canvasWidth = this.canvas.width / window.devicePixelRatio;
        let boxX = Math.max(10, x - boxWidth / 2);
        const boxY = y - boxHeight - 20 < 10 ? y + 20 : y - boxHeight - 20;

        if (boxX + boxWidth > canvasWidth - 10) {
            boxX = canvasWidth - boxWidth - 10;
        }

        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;

        ctx.fillStyle = getThemeColor('--color-surface');
        traceRoundedRect(ctx, { x: boxX, y: boxY, width: boxWidth, height: boxHeight, radius: borderRadius });
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 2;
        traceRoundedRect(ctx, { x: boxX, y: boxY, width: boxWidth, height: boxHeight, radius: borderRadius });
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        // Percentage change, bold and carrying the direction's colour
        ctx.font = '600 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
        ctx.fillStyle = accentColor;
        ctx.fillText(changeText, boxX + padding, boxY + padding);

        ctx.fillStyle = getThemeColor('--color-text');
        ctx.fillText(priceText, boxX + padding, boxY + padding + lineHeight);

        ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
        ctx.fillStyle = getThemeColor('--color-text-muted');
        ctx.fillText(timeText, boxX + padding, boxY + padding + lineHeight * 2);
    }

    private formatTimeDifference(from: Time, to: Time): string {
        const diffSeconds = Math.abs(timeToTimestamp(to) - timeToTimestamp(from));

        const days = Math.floor(diffSeconds / SECONDS_PER_DAY);
        const hours = Math.floor((diffSeconds % SECONDS_PER_DAY) / SECONDS_PER_HOUR);
        const minutes = Math.floor((diffSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m`;

        return `${Math.floor(diffSeconds)}s`;
    }
}
