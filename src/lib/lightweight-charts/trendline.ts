import { IChartApi, MouseEventParams, Time } from './index';

export interface TrendLinePoint {
    time: Time;
    price: number;
    x: number;
    y: number;
}

export interface TrendLine {
    id: string;
    point1: TrendLinePoint;
    point2: TrendLinePoint;
    color: string;
    lineWidth: number;
    lineStyle: 'solid' | 'dashed' | 'dotted';
    locked: boolean;
    extended: boolean; // Whether to extend the line beyond the two points
}

export class TrendLineManager {
    private chart: IChartApi;
    private mainSeries: any = null;
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private isActive: boolean = false;
    private trendLines: TrendLine[] = [];
    private currentLine: { point1: TrendLinePoint | null; point2: TrendLinePoint | null } = {
        point1: null,
        point2: null
    };
    private selectedLineId: string | null = null;
    private isDragging: boolean = false;
    private dragTarget: { lineId: string; pointIndex: 1 | 2 } | null = null;
    private clickHandler: ((param: MouseEventParams<Time>) => void) | null = null;
    private moveHandler: ((param: MouseEventParams<Time>) => void) | null = null;
    private defaultColor: string = '#2962FF';
    private defaultLineWidth: number = 1;
    private visibleRangeChangeHandler: (() => void) | null = null;

    constructor(chart: IChartApi, mainSeries?: any) {
        this.chart = chart;
        this.mainSeries = mainSeries;
        this.setupCanvas();
        this.subscribeToChartEvents();
    }

    private subscribeToChartEvents(): void {
        // Subscribe to visible range changes (pan/zoom)
        this.visibleRangeChangeHandler = () => {
            this.draw();
        };
        this.chart.timeScale().subscribeVisibleLogicalRangeChange(this.visibleRangeChangeHandler);
    }

    public setMainSeries(series: any): void {
        this.mainSeries = series;
    }

    private setupCanvas(): void {
        const chartContainer = (this.chart as any).chartElement?.() || document.querySelector('#wk-chart');
        if (!chartContainer) return;

        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '99';

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
        if (!this.mainSeries) return null;
        try {
            return this.mainSeries.coordinateToPrice(y);
        } catch (e) {
            return null;
        }
    }

    private getYFromPrice(price: number): number | null {
        if (!this.mainSeries) return null;
        try {
            return this.mainSeries.priceToCoordinate(price);
        } catch (e) {
            return null;
        }
    }

    private getXFromTime(time: Time): number | null {
        try {
            return this.chart.timeScale().timeToCoordinate(time);
        } catch (e) {
            return null;
        }
    }

    public activate(): void {
        if (this.isActive) return;

        this.isActive = true;
        this.currentLine = { point1: null, point2: null };

        this.clickHandler = (param: MouseEventParams<Time>) => {
            if (!param.point || !param.time) return;

            const price = this.getPriceFromY(param.point.y);
            if (price === null || price === undefined) return;

            // If we're currently dragging, stop dragging on this click
            if (this.isDragging) {
                this.isDragging = false;
                this.dragTarget = null;
                this.draw();
                return;
            }

            // Check if clicking near an existing line's endpoint to start dragging
            const hitTest = this.hitTestPoint(param.point.x, param.point.y);
            if (hitTest) {
                this.dragTarget = hitTest;
                this.isDragging = true;
                this.selectedLineId = hitTest.lineId;
                this.draw();
                return;
            }

            // Check if clicking on an existing line to select it
            const lineHit = this.hitTestLine(param.point.x, param.point.y);
            if (lineHit) {
                this.selectedLineId = lineHit;
                this.draw();
                return;
            }

            // Otherwise, we're drawing a new line
            if (!this.currentLine.point1) {
                // First click: Set first point
                this.currentLine.point1 = {
                    time: param.time,
                    price: price,
                    x: param.point.x,
                    y: param.point.y
                };
                this.selectedLineId = null;
            } else {
                // Second click: Set second point and create the line
                this.currentLine.point2 = {
                    time: param.time,
                    price: price,
                    x: param.point.x,
                    y: param.point.y
                };

                // Create the trendline with theme-aware color
                const styles = getComputedStyle(document.documentElement);
                const themeColor = styles.getPropertyValue('--text2').trim() || this.defaultColor;

                const newLine: TrendLine = {
                    id: this.generateId(),
                    point1: { ...this.currentLine.point1 },
                    point2: { ...this.currentLine.point2 },
                    color: themeColor,
                    lineWidth: this.defaultLineWidth,
                    lineStyle: 'solid',
                    locked: false,
                    extended: false
                };
                this.trendLines.push(newLine);
                this.currentLine = { point1: null, point2: null };
                this.selectedLineId = newLine.id;
            }

            this.draw();
        };

        this.moveHandler = (param: MouseEventParams<Time>) => {
            if (!param.point || !param.time) return;

            const price = this.getPriceFromY(param.point.y);
            if (price === null || price === undefined) return;

            // If dragging a point, update it
            if (this.isDragging && this.dragTarget) {
                const line = this.trendLines.find(l => l.id === this.dragTarget!.lineId);
                if (line && !line.locked) {
                    const pointKey = this.dragTarget.pointIndex === 1 ? 'point1' : 'point2';
                    line[pointKey] = {
                        time: param.time,
                        price: price,
                        x: param.point.x,
                        y: param.point.y
                    };
                    this.draw();
                }
                return;
            }

            // If drawing a new line, track the second point (preview)
            if (this.currentLine.point1) {
                this.currentLine.point2 = {
                    time: param.time,
                    price: price,
                    x: param.point.x,
                    y: param.point.y
                };
                this.draw();
            }
        };

        this.chart.subscribeClick(this.clickHandler);
        this.chart.subscribeCrosshairMove(this.moveHandler);
    }

    public deactivate(): void {
        if (!this.isActive) return;

        this.isActive = false;
        this.currentLine = { point1: null, point2: null };
        this.isDragging = false;
        this.dragTarget = null;

        if (this.clickHandler) {
            this.chart.unsubscribeClick(this.clickHandler);
            this.clickHandler = null;
        }

        if (this.moveHandler) {
            this.chart.unsubscribeCrosshairMove(this.moveHandler);
            this.moveHandler = null;
        }
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
        if (this.selectedLineId) {
            this.trendLines = this.trendLines.filter(l => l.id !== this.selectedLineId);
            this.selectedLineId = null;
            this.draw();
        }
    }

    public removeAllLines(): void {
        this.trendLines = [];
        this.selectedLineId = null;
        this.currentLine = { point1: null, point2: null };
        this.draw();
    }

    public updateSelectedLineColor(color: string): void {
        if (this.selectedLineId) {
            const line = this.trendLines.find(l => l.id === this.selectedLineId);
            if (line) {
                line.color = color;
                this.draw();
            }
        }
    }

    public toggleSelectedLineExtension(): void {
        if (this.selectedLineId) {
            const line = this.trendLines.find(l => l.id === this.selectedLineId);
            if (line) {
                line.extended = !line.extended;
                this.draw();
            }
        }
    }

    public setDefaultColor(color: string): void {
        this.defaultColor = color;
    }

    private generateId(): string {
        return `tl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private hitTestPoint(x: number, y: number): { lineId: string; pointIndex: 1 | 2 } | null {
        const hitRadius = 8; // pixels

        for (const line of this.trendLines) {
            if (line.locked) continue;

            // Update coordinates based on current chart state
            this.updateLineCoordinates(line);

            const dist1 = Math.sqrt(
                Math.pow(line.point1.x - x, 2) + Math.pow(line.point1.y - y, 2)
            );
            if (dist1 <= hitRadius) {
                return { lineId: line.id, pointIndex: 1 };
            }

            const dist2 = Math.sqrt(
                Math.pow(line.point2.x - x, 2) + Math.pow(line.point2.y - y, 2)
            );
            if (dist2 <= hitRadius) {
                return { lineId: line.id, pointIndex: 2 };
            }
        }

        return null;
    }

    private hitTestLine(x: number, y: number): string | null {
        const hitDistance = 6; // pixels

        for (const line of this.trendLines) {
            // Update coordinates based on current chart state
            this.updateLineCoordinates(line);

            const distance = this.distanceToLine(
                x, y,
                line.point1.x, line.point1.y,
                line.point2.x, line.point2.y
            );

            if (distance <= hitDistance) {
                return line.id;
            }
        }

        return null;
    }

    private distanceToLine(
        px: number, py: number,
        x1: number, y1: number,
        x2: number, y2: number
    ): number {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq !== 0) {
            param = dot / lenSq;
        }

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;

        return Math.sqrt(dx * dx + dy * dy);
    }

    private updateLineCoordinates(line: TrendLine): void {
        // Update x,y coordinates based on current time/price values
        const x1 = this.getXFromTime(line.point1.time);
        const y1 = this.getYFromPrice(line.point1.price);
        const x2 = this.getXFromTime(line.point2.time);
        const y2 = this.getYFromPrice(line.point2.price);

        if (x1 !== null) line.point1.x = x1;
        if (y1 !== null) line.point1.y = y1;
        if (x2 !== null) line.point2.x = x2;
        if (y2 !== null) line.point2.y = y2;
    }

    private clear(): void {
        if (!this.ctx || !this.canvas) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    public draw(): void {
        this.clear();
        if (!this.ctx) return;

        const ctx = this.ctx;

        // Draw all completed trendlines
        for (const line of this.trendLines) {
            // Update coordinates
            this.updateLineCoordinates(line);

            const isSelected = line.id === this.selectedLineId;
            this.drawTrendLine(line, isSelected);
        }

        // Draw the line being created
        if (this.currentLine.point1 && this.currentLine.point2) {
            // Get theme color for temporary line
            const styles = getComputedStyle(document.documentElement);
            const themeColor = styles.getPropertyValue('--text2').trim() || this.defaultColor;

            const tempLine: TrendLine = {
                id: 'temp',
                point1: this.currentLine.point1,
                point2: this.currentLine.point2,
                color: themeColor,
                lineWidth: this.defaultLineWidth,
                lineStyle: 'dashed',
                locked: false,
                extended: false
            };
            this.drawTrendLine(tempLine, false);
        }
    }

    private drawTrendLine(line: TrendLine, isSelected: boolean): void {
        if (!this.ctx || !this.canvas) return;

        const ctx = this.ctx;
        const { point1, point2, color, lineWidth, lineStyle, extended } = line;

        // Get CSS variable for theming (use --text2 as neutral color)
        const styles = getComputedStyle(document.documentElement);
        const themeColor = styles.getPropertyValue('--text2').trim() || color;

        // Set line style
        ctx.strokeStyle = themeColor;
        ctx.lineWidth = isSelected ? lineWidth + 1 : lineWidth;

        // Set dash pattern
        switch (lineStyle) {
            case 'dashed':
                ctx.setLineDash([8, 4]);
                break;
            case 'dotted':
                ctx.setLineDash([2, 3]);
                break;
            default:
                ctx.setLineDash([]);
        }

        // Draw the line
        ctx.beginPath();

        if (extended && this.canvas) {
            // Calculate extended line points
            const dx = point2.x - point1.x;
            const dy = point2.y - point1.y;
            const length = Math.sqrt(dx * dx + dy * dy);

            if (length > 0) {
                const unitX = dx / length;
                const unitY = dy / length;

                // Extend to canvas edges
                const canvasWidth = this.canvas.width / window.devicePixelRatio;
                const canvasHeight = this.canvas.height / window.devicePixelRatio;
                const extension = Math.max(canvasWidth, canvasHeight) * 2;

                const startX = point1.x - unitX * extension;
                const startY = point1.y - unitY * extension;
                const endX = point2.x + unitX * extension;
                const endY = point2.y + unitY * extension;

                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
            }
        } else {
            ctx.moveTo(point1.x, point1.y);
            ctx.lineTo(point2.x, point2.y);
        }

        ctx.stroke();
        ctx.setLineDash([]);

        // Draw control points if selected
        if (isSelected && !line.locked) {
            this.drawControlPoint(point1.x, point1.y, color);
            this.drawControlPoint(point2.x, point2.y, color);
        }
    }

    private drawControlPoint(x: number, y: number, color: string): void {
        if (!this.ctx) return;

        const ctx = this.ctx;
        const radius = 5;

        // Get CSS variable for theming
        const styles = getComputedStyle(document.documentElement);
        const themeColor = styles.getPropertyValue('--text2').trim() || color;

        // Outer circle
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = themeColor;
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner circle
        ctx.beginPath();
        ctx.arc(x, y, radius - 2, 0, 2 * Math.PI);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
    }

    public getTrendLines(): TrendLine[] {
        return [...this.trendLines];
    }

    public loadTrendLines(lines: TrendLine[]): void {
        this.trendLines = lines;
        this.draw();
    }

    public destroy(): void {
        this.deactivate();

        // Unsubscribe from visible range changes
        if (this.visibleRangeChangeHandler) {
            this.chart.timeScale().unsubscribeVisibleLogicalRangeChange(this.visibleRangeChangeHandler);
            this.visibleRangeChangeHandler = null;
        }

        if (this.canvas && this.canvas.parentElement) {
            this.canvas.parentElement.removeChild(this.canvas);
        }
        window.removeEventListener('resize', () => this.resizeCanvas());
    }
}
