import { IChartApi, MouseEventParams, Time } from './index';

export interface BoxPoint {
    time: Time;
    price: number;
    x: number;
    y: number;
}

export interface Box {
    id: string;
    point1: BoxPoint; // Top-left or first corner
    point2: BoxPoint; // Bottom-right or second corner
    fillColor: string;
    borderColor: string;
    fillOpacity: number;
    borderWidth: number;
    locked: boolean;
}

export class BoxManager {
    private chart: IChartApi;
    private mainSeries: any = null;
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private isActive: boolean = false;
    private boxes: Box[] = [];
    private currentBox: { point1: BoxPoint | null; point2: BoxPoint | null } = {
        point1: null,
        point2: null
    };
    private selectedBoxId: string | null = null;
    private isDragging: boolean = false;
    private dragTarget: { boxId: string; corner: 'tl' | 'tr' | 'bl' | 'br' | 'body' } | null = null;
    private dragOffset: { x: number; y: number } | null = null;
    private clickHandler: ((param: MouseEventParams<Time>) => void) | null = null;
    private moveHandler: ((param: MouseEventParams<Time>) => void) | null = null;
    private defaultFillOpacity: number = 0.15;
    private defaultBorderWidth: number = 1;
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
        this.canvas.style.zIndex = '98'; // Below trendlines

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
        this.currentBox = { point1: null, point2: null };

        this.clickHandler = (param: MouseEventParams<Time>) => {
            if (!param.point || !param.time) return;

            const price = this.getPriceFromY(param.point.y);
            if (price === null || price === undefined) return;

            // If we're currently dragging, stop dragging on this click
            if (this.isDragging) {
                this.isDragging = false;
                this.dragTarget = null;
                this.dragOffset = null;
                this.draw();
                return;
            }

            // Check if clicking near a corner to drag it
            const cornerHit = this.hitTestCorner(param.point.x, param.point.y);
            if (cornerHit) {
                this.dragTarget = cornerHit;
                this.isDragging = true;
                this.selectedBoxId = cornerHit.boxId;
                this.draw();
                return;
            }

            // Check if clicking inside a box body to move it
            const bodyHit = this.hitTestBody(param.point.x, param.point.y);
            if (bodyHit) {
                const box = this.boxes.find(b => b.id === bodyHit);
                if (box) {
                    this.dragTarget = { boxId: bodyHit, corner: 'body' };
                    this.isDragging = true;
                    this.selectedBoxId = bodyHit;
                    // Store offset from box corner to click point
                    this.dragOffset = {
                        x: param.point.x - Math.min(box.point1.x, box.point2.x),
                        y: param.point.y - Math.min(box.point1.y, box.point2.y)
                    };
                    this.draw();
                    return;
                }
            }

            // Otherwise, we're drawing a new box
            if (!this.currentBox.point1) {
                // First click: Set first corner
                this.currentBox.point1 = {
                    time: param.time,
                    price: price,
                    x: param.point.x,
                    y: param.point.y
                };
                this.selectedBoxId = null;
            } else {
                // Second click: Set second corner and create the box
                this.currentBox.point2 = {
                    time: param.time,
                    price: price,
                    x: param.point.x,
                    y: param.point.y
                };

                // Get theme colors
                const styles = getComputedStyle(document.documentElement);
                const themeColor = styles.getPropertyValue('--text2').trim() || '#a9b1d6';

                const newBox: Box = {
                    id: this.generateId(),
                    point1: { ...this.currentBox.point1 },
                    point2: { ...this.currentBox.point2 },
                    fillColor: themeColor,
                    borderColor: themeColor,
                    fillOpacity: this.defaultFillOpacity,
                    borderWidth: this.defaultBorderWidth,
                    locked: false
                };

                this.boxes.push(newBox);
                this.currentBox = { point1: null, point2: null };
                this.selectedBoxId = newBox.id;
            }

            this.draw();
        };

        this.moveHandler = (param: MouseEventParams<Time>) => {
            if (!param.point || !param.time) return;

            const price = this.getPriceFromY(param.point.y);
            if (price === null || price === undefined) return;

            // If dragging a corner, update it
            if (this.isDragging && this.dragTarget) {
                const box = this.boxes.find(b => b.id === this.dragTarget!.boxId);
                if (box && !box.locked) {
                    if (this.dragTarget.corner === 'body' && this.dragOffset) {
                        // Move entire box
                        const width = Math.abs(box.point2.x - box.point1.x);
                        const height = Math.abs(box.point2.y - box.point1.y);

                        const newX1 = param.point.x - this.dragOffset.x;
                        const newY1 = param.point.y - this.dragOffset.y;

                        const price1 = this.getPriceFromY(newY1);
                        const price2 = this.getPriceFromY(newY1 + height);

                        if (price1 !== null && price2 !== null) {
                            box.point1.x = newX1;
                            box.point1.y = newY1;
                            box.point1.price = price1;

                            box.point2.x = newX1 + width;
                            box.point2.y = newY1 + height;
                            box.point2.price = price2;
                        }
                    } else {
                        // Resize box by moving corner
                        const point = {
                            time: param.time,
                            price: price,
                            x: param.point.x,
                            y: param.point.y
                        };

                        switch (this.dragTarget.corner) {
                            case 'tl':
                                box.point1 = point;
                                break;
                            case 'br':
                                box.point2 = point;
                                break;
                            case 'tr':
                                box.point1.time = point.time;
                                box.point1.x = point.x;
                                box.point2.price = point.price;
                                box.point2.y = point.y;
                                break;
                            case 'bl':
                                box.point2.time = point.time;
                                box.point2.x = point.x;
                                box.point1.price = point.price;
                                box.point1.y = point.y;
                                break;
                        }
                    }
                    this.draw();
                }
                return;
            }

            // If drawing a new box, track the second corner (preview)
            if (this.currentBox.point1) {
                this.currentBox.point2 = {
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
        this.currentBox = { point1: null, point2: null };
        this.isDragging = false;
        this.dragTarget = null;
        this.dragOffset = null;

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

    public removeSelectedBox(): void {
        if (this.selectedBoxId) {
            this.boxes = this.boxes.filter(b => b.id !== this.selectedBoxId);
            this.selectedBoxId = null;
            this.draw();
        }
    }

    public removeAllBoxes(): void {
        this.boxes = [];
        this.selectedBoxId = null;
        this.currentBox = { point1: null, point2: null };
        this.draw();
    }

    private generateId(): string {
        return `box_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private hitTestCorner(x: number, y: number): { boxId: string; corner: 'tl' | 'tr' | 'bl' | 'br' } | null {
        const hitRadius = 8;

        for (const box of this.boxes) {
            if (box.locked) continue;

            this.updateBoxCoordinates(box);

            const x1 = Math.min(box.point1.x, box.point2.x);
            const y1 = Math.min(box.point1.y, box.point2.y);
            const x2 = Math.max(box.point1.x, box.point2.x);
            const y2 = Math.max(box.point1.y, box.point2.y);

            // Top-left
            if (Math.sqrt(Math.pow(x1 - x, 2) + Math.pow(y1 - y, 2)) <= hitRadius) {
                return { boxId: box.id, corner: 'tl' };
            }
            // Top-right
            if (Math.sqrt(Math.pow(x2 - x, 2) + Math.pow(y1 - y, 2)) <= hitRadius) {
                return { boxId: box.id, corner: 'tr' };
            }
            // Bottom-left
            if (Math.sqrt(Math.pow(x1 - x, 2) + Math.pow(y2 - y, 2)) <= hitRadius) {
                return { boxId: box.id, corner: 'bl' };
            }
            // Bottom-right
            if (Math.sqrt(Math.pow(x2 - x, 2) + Math.pow(y2 - y, 2)) <= hitRadius) {
                return { boxId: box.id, corner: 'br' };
            }
        }

        return null;
    }

    private hitTestBody(x: number, y: number): string | null {
        for (const box of this.boxes) {
            this.updateBoxCoordinates(box);

            const x1 = Math.min(box.point1.x, box.point2.x);
            const y1 = Math.min(box.point1.y, box.point2.y);
            const x2 = Math.max(box.point1.x, box.point2.x);
            const y2 = Math.max(box.point1.y, box.point2.y);

            if (x >= x1 && x <= x2 && y >= y1 && y <= y2) {
                return box.id;
            }
        }

        return null;
    }

    private updateBoxCoordinates(box: Box): void {
        // Update x,y coordinates based on current time/price values
        const x1 = this.getXFromTime(box.point1.time);
        const y1 = this.getYFromPrice(box.point1.price);
        const x2 = this.getXFromTime(box.point2.time);
        const y2 = this.getYFromPrice(box.point2.price);

        if (x1 !== null) box.point1.x = x1;
        if (y1 !== null) box.point1.y = y1;
        if (x2 !== null) box.point2.x = x2;
        if (y2 !== null) box.point2.y = y2;
    }

    private clear(): void {
        if (!this.ctx || !this.canvas) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    public draw(): void {
        this.clear();
        if (!this.ctx) return;

        // Draw all completed boxes
        for (const box of this.boxes) {
            this.updateBoxCoordinates(box);
            const isSelected = box.id === this.selectedBoxId;
            this.drawBox(box, isSelected);
        }

        // Draw the box being created
        if (this.currentBox.point1 && this.currentBox.point2) {
            const styles = getComputedStyle(document.documentElement);
            const themeColor = styles.getPropertyValue('--text2').trim() || '#a9b1d6';

            const tempBox: Box = {
                id: 'temp',
                point1: this.currentBox.point1,
                point2: this.currentBox.point2,
                fillColor: themeColor,
                borderColor: themeColor,
                fillOpacity: this.defaultFillOpacity,
                borderWidth: this.defaultBorderWidth,
                locked: false
            };
            this.drawBox(tempBox, false);
        }
    }

    private drawBox(box: Box, isSelected: boolean): void {
        if (!this.ctx) return;

        const ctx = this.ctx;
        const { point1, point2, fillColor, borderColor, fillOpacity, borderWidth } = box;

        // Get theme color
        const styles = getComputedStyle(document.documentElement);
        const themeColor = styles.getPropertyValue('--text2').trim() || fillColor;

        // Calculate rectangle bounds
        const x = Math.min(point1.x, point2.x);
        const y = Math.min(point1.y, point2.y);
        const width = Math.abs(point2.x - point1.x);
        const height = Math.abs(point2.y - point1.y);

        // Draw filled rectangle
        ctx.fillStyle = this.hexToRgba(themeColor, fillOpacity);
        ctx.fillRect(x, y, width, height);

        // Draw border
        ctx.strokeStyle = themeColor;
        ctx.lineWidth = isSelected ? borderWidth + 1 : borderWidth;
        ctx.strokeRect(x, y, width, height);

        // Draw corner handles if selected
        if (isSelected && !box.locked) {
            const x1 = Math.min(point1.x, point2.x);
            const y1 = Math.min(point1.y, point2.y);
            const x2 = Math.max(point1.x, point2.x);
            const y2 = Math.max(point1.y, point2.y);

            this.drawCornerHandle(x1, y1, themeColor);
            this.drawCornerHandle(x2, y1, themeColor);
            this.drawCornerHandle(x1, y2, themeColor);
            this.drawCornerHandle(x2, y2, themeColor);
        }
    }

    private drawCornerHandle(x: number, y: number, color: string): void {
        if (!this.ctx) return;

        const ctx = this.ctx;
        const radius = 4;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, y, radius - 1.5, 0, 2 * Math.PI);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
    }

    private hexToRgba(hex: string, alpha: number): string {
        // Remove # if present
        hex = hex.replace('#', '');

        // Parse hex color
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    public getBoxes(): Box[] {
        return [...this.boxes];
    }

    public loadBoxes(boxes: Box[]): void {
        this.boxes = boxes;
        this.draw();
    }

    public destroy(): void {
        this.deactivate();

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
