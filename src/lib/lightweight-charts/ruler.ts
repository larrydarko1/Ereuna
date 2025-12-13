import { IChartApi, MouseEventParams, Time } from './index';

export interface RulerPoint {
    time: Time;
    price: number;
    x: number;
    y: number;
}

export class ChartRuler {
    private chart: IChartApi;
    private mainSeries: any = null;
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private isActive: boolean = false;
    private isLocked: boolean = false;
    private anchorPoint: RulerPoint | null = null;
    private currentPoint: RulerPoint | null = null;
    private clickHandler: ((param: MouseEventParams<Time>) => void) | null = null;
    private moveHandler: ((param: MouseEventParams<Time>) => void) | null = null;

    constructor(chart: IChartApi, mainSeries?: any) {
        this.chart = chart;
        this.mainSeries = mainSeries;
        this.setupCanvas();
    }

    public setMainSeries(series: any): void {
        this.mainSeries = series;
        // Reset measurement when series changes to avoid stale data
        this.resetMeasurement();
    }

    public resetMeasurement(): void {
        this.anchorPoint = null;
        this.currentPoint = null;
        this.isLocked = false;
        this.clear();
    }

    private setupCanvas(): void {
        // Create an overlay canvas for drawing the ruler
        const chartContainer = (this.chart as any).chartElement?.() || document.querySelector('#wk-chart');
        if (!chartContainer) return;

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
        if (!this.canvas) return;
        const chartContainer = this.canvas.parentElement;
        if (!chartContainer) return;

        const rect = chartContainer.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;

        if (this.ctx) {
            this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        }

        this.draw();
    }

    private getPriceFromY(y: number): number | null {
        if (!this.mainSeries) {
            return null;
        }

        try {
            // Use the series API's coordinateToPrice method
            const price = this.mainSeries.coordinateToPrice(y);
            return price;
        } catch (e) {
            return null;
        }
    }

    public activate(): void {
        if (this.isActive) return;

        this.isActive = true;
        this.anchorPoint = null;
        this.currentPoint = null;

        // Set up event handlers
        this.clickHandler = (param: MouseEventParams<Time>) => {
            if (!param.point || !param.time) return;

            // Get price from Y coordinate using the series API
            const price = this.getPriceFromY(param.point.y);

            if (price === null || price === undefined) return;

            if (!this.anchorPoint) {
                // First click: Set anchor point
                this.anchorPoint = {
                    time: param.time,
                    price: price,
                    x: param.point.x,
                    y: param.point.y
                };
                this.isLocked = false;
            } else if (!this.isLocked) {
                // Second click: Lock the measurement
                this.currentPoint = {
                    time: param.time,
                    price: price,
                    x: param.point.x,
                    y: param.point.y
                };
                this.isLocked = true;
            } else {
                // Third click: Start a new measurement
                this.anchorPoint = {
                    time: param.time,
                    price: price,
                    x: param.point.x,
                    y: param.point.y
                };
                this.currentPoint = null;
                this.isLocked = false;
            }
            this.draw();
        };

        this.moveHandler = (param: MouseEventParams<Time>) => {
            // Only track mouse movement if we have an anchor but haven't locked yet
            if (!this.anchorPoint || this.isLocked || !param.point || !param.time) {
                return;
            }

            // Get price from Y coordinate using the series API
            const price = this.getPriceFromY(param.point.y);

            if (price === null || price === undefined) return;

            this.currentPoint = {
                time: param.time,
                price: price,
                x: param.point.x,
                y: param.point.y
            };

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

        if (this.clickHandler) {
            this.chart.unsubscribeClick(this.clickHandler);
            this.clickHandler = null;
        }

        if (this.moveHandler) {
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

    private clear(): void {
        if (!this.ctx || !this.canvas) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    private draw(): void {
        this.clear();

        if (!this.ctx || !this.anchorPoint || !this.currentPoint) return;

        const ctx = this.ctx;
        const dpr = window.devicePixelRatio;

        // Calculate metrics
        const priceChange = this.currentPoint.price - this.anchorPoint.price;
        const priceChangePercent = (priceChange / this.anchorPoint.price) * 100;
        const timeDiff = this.calculateTimeDifference(this.anchorPoint.time, this.currentPoint.time);

        // Get CSS variables for theming
        const styles = getComputedStyle(document.documentElement);
        const accentColor = styles.getPropertyValue('--accent2').trim() || '#2962FF';
        const positiveColor = styles.getPropertyValue('--positive').trim() || '#089981';
        const negativeColor = styles.getPropertyValue('--negative').trim() || '#F23645';

        // Draw line
        ctx.beginPath();
        ctx.strokeStyle = priceChangePercent >= 0 ? positiveColor : negativeColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.moveTo(this.anchorPoint.x, this.anchorPoint.y);
        ctx.lineTo(this.currentPoint.x, this.currentPoint.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw circles at anchor and current points
        const lineColor = priceChangePercent >= 0 ? positiveColor : negativeColor;
        this.drawPoint(this.anchorPoint.x, this.anchorPoint.y, lineColor);
        this.drawPoint(this.currentPoint.x, this.currentPoint.y, lineColor);

        // Draw info box
        const midX = (this.anchorPoint.x + this.currentPoint.x) / 2;
        const midY = (this.anchorPoint.y + this.currentPoint.y) / 2;

        const changeText = `${priceChangePercent >= 0 ? '+' : ''}${priceChangePercent.toFixed(2)}%`;
        const priceText = `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}`;
        const timeText = timeDiff;

        this.drawInfoBox(midX, midY, changeText, priceText, timeText, priceChangePercent >= 0);
    }

    private drawPoint(x: number, y: number, color: string): void {
        if (!this.ctx) return;

        const ctx = this.ctx;

        // Shadow for depth
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;

        // Outer circle
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Inner circle
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
    }

    private drawInfoBox(x: number, y: number, changeText: string, priceText: string, timeText: string, isPositive: boolean): void {
        if (!this.ctx) return;

        const ctx = this.ctx;
        const padding = 10;
        const lineHeight = 20;
        const borderRadius = 6;

        // Get CSS variables for theming
        const styles = getComputedStyle(document.documentElement);
        const base2 = styles.getPropertyValue('--base2').trim() || '#1a1a1a';
        const text1 = styles.getPropertyValue('--text1').trim() || '#ffffff';
        const text2 = styles.getPropertyValue('--text2').trim() || '#b0b0b0';
        const positiveColor = styles.getPropertyValue('--positive').trim() || '#089981';
        const negativeColor = styles.getPropertyValue('--negative').trim() || '#F23645';
        const accentColor = isPositive ? positiveColor : negativeColor;

        // Set font
        ctx.font = '600 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

        // Measure text
        const changeWidth = ctx.measureText(changeText).width;
        const priceWidth = ctx.measureText(priceText).width;
        ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
        const timeWidth = ctx.measureText(timeText).width;
        const maxWidth = Math.max(changeWidth, priceWidth, timeWidth);

        const boxWidth = maxWidth + padding * 2 + 10;
        const boxHeight = lineHeight * 3 + padding * 2;

        // Adjust position to keep box on screen
        let boxX = x - boxWidth / 2;
        let boxY = y - boxHeight - 20;

        if (boxX < 10) boxX = 10;
        if (boxY < 10) boxY = y + 20;
        if (boxX + boxWidth > (this.canvas?.width || 0) / window.devicePixelRatio - 10) {
            boxX = (this.canvas?.width || 0) / window.devicePixelRatio - boxWidth - 10;
        }

        // Draw shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;

        // Draw rounded rectangle background
        ctx.fillStyle = base2;
        this.roundRect(ctx, boxX, boxY, boxWidth, boxHeight, borderRadius);
        ctx.fill();

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Draw border
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 2;
        this.roundRect(ctx, boxX, boxY, boxWidth, boxHeight, borderRadius);
        ctx.stroke();

        // Draw text
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        // Percentage change (bold and colored)
        ctx.font = '600 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
        ctx.fillStyle = accentColor;
        ctx.fillText(changeText, boxX + padding, boxY + padding);

        // Price change
        ctx.fillStyle = text1;
        ctx.fillText(priceText, boxX + padding, boxY + padding + lineHeight);

        // Time difference (lighter)
        ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
        ctx.fillStyle = text2;
        ctx.fillText(timeText, boxX + padding, boxY + padding + lineHeight * 2);
    }

    private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    private calculateTimeDifference(time1: Time, time2: Time): string {
        // Convert times to timestamps
        const t1 = typeof time1 === 'number' ? time1 : new Date(time1 as string).getTime() / 1000;
        const t2 = typeof time2 === 'number' ? time2 : new Date(time2 as string).getTime() / 1000;

        const diffSeconds = Math.abs(t2 - t1);

        // Calculate time units
        const days = Math.floor(diffSeconds / 86400);
        const hours = Math.floor((diffSeconds % 86400) / 3600);
        const minutes = Math.floor((diffSeconds % 3600) / 60);

        if (days > 0) {
            return `${days}d ${hours}h`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m`;
        } else {
            return `${Math.floor(diffSeconds)}s`;
        }
    }

    public destroy(): void {
        this.deactivate();

        if (this.canvas && this.canvas.parentElement) {
            this.canvas.parentElement.removeChild(this.canvas);
        }

        this.canvas = null;
        this.ctx = null;
    }
}
