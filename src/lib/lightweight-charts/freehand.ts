import { IChartApi, MouseEventParams, Time } from './index';

export interface FreehandPoint {
    time: Time;
    price: number;
    x: number;
    y: number;
}

export interface FreehandPath {
    id: string;
    points: FreehandPoint[];
    color: string;
    lineWidth: number;
    locked: boolean;
}

export class FreehandManager {
    private chart: IChartApi;
    private mainSeries: any = null;
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private isActive: boolean = false;
    private paths: FreehandPath[] = [];
    private selectedPathId: string | null = null;
    private isDrawing: boolean = false;
    private isDragging: boolean = false;
    private currentPath: FreehandPath | null = null;
    private dragOffset: { x: number; y: number } | null = null;
    private clickHandler: ((param: MouseEventParams<Time>) => void) | null = null;
    private moveHandler: ((param: MouseEventParams<Time>) => void) | null = null;
    private mouseDownHandler: ((param: MouseEventParams<Time>) => void) | null = null;
    private mouseUpHandler: (() => void) | null = null;
    private defaultLineWidth: number = 1.5;
    private visibleRangeChangeHandler: (() => void) | null = null;
    private onChangeCallback: (() => void) | null = null;

    constructor(chart: IChartApi, mainSeries?: any) {
        this.chart = chart;
        this.mainSeries = mainSeries;
        this.setupCanvas();
        this.subscribeToChartEvents();
    }

    /**
     * Set callback to be called when drawings change
     */
    public onChange(callback: () => void): void {
        this.onChangeCallback = callback;
    }

    /**
     * Trigger onChange callback if set
     */
    private triggerChange(): void {
        if (this.onChangeCallback) {
            this.onChangeCallback();
        }
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
        this.canvas.style.zIndex = '97'; // Below boxes

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

    private getTimeFromX(x: number): Time | null {
        const timeScale = this.chart.timeScale();
        try {
            return timeScale.coordinateToTime(x) as Time;
        } catch (e) {
            return null;
        }
    }

    private getXFromTime(time: Time): number | null {
        const timeScale = this.chart.timeScale();
        try {
            return timeScale.timeToCoordinate(time) ?? null;
        } catch (e) {
            return null;
        }
    }

    private getYFromPrice(price: number): number | null {
        if (!this.mainSeries) return null;
        try {
            return this.mainSeries.priceToCoordinate(price) ?? null;
        } catch (e) {
            return null;
        }
    }

    public activate(): void {
        if (this.isActive) return;

        this.isActive = true;
        this.isDrawing = false;
        this.isDragging = false;
        this.currentPath = null;

        // Mouse down starts drawing or selects path
        this.mouseDownHandler = (param: MouseEventParams<Time>) => {
            if (!param.point || !param.time) return;

            const price = this.getPriceFromY(param.point.y);
            if (price === null || price === undefined) return;

            // Check if clicking on an existing path
            const pathId = this.hitTestPath(param.point.x, param.point.y);

            if (pathId && this.selectedPathId === pathId) {
                // Start dragging selected path
                this.isDragging = true;
                this.dragOffset = { x: 0, y: 0 }; // Will be used for relative movement
                return;
            }

            if (pathId) {
                // Select the path
                this.selectedPathId = pathId;
                this.draw();
                return;
            }

            // Start new drawing
            this.isDrawing = true;
            this.selectedPathId = null;

            const styles = getComputedStyle(document.documentElement);
            const color = styles.getPropertyValue('--text2').trim() || '#ffffff';

            this.currentPath = {
                id: this.generateId(),
                points: [{
                    time: param.time,
                    price: price,
                    x: param.point.x,
                    y: param.point.y
                }],
                color: color,
                lineWidth: this.defaultLineWidth,
                locked: false
            };
        };

        // Mouse move adds points while drawing or moves path while dragging
        this.moveHandler = (param: MouseEventParams<Time>) => {
            if (!param.point || !param.time) return;

            const price = this.getPriceFromY(param.point.y);
            if (price === null || price === undefined) return;

            if (this.isDrawing && this.currentPath) {
                // Add point to current path
                this.currentPath.points.push({
                    time: param.time,
                    price: price,
                    x: param.point.x,
                    y: param.point.y
                });
                this.draw();
            } else if (this.isDragging && this.selectedPathId) {
                // Move entire path
                const path = this.paths.find(p => p.id === this.selectedPathId);
                if (path && !path.locked && path.points.length > 0) {
                    const firstPoint = path.points[0];
                    const deltaX = param.point.x - firstPoint.x;
                    const deltaY = param.point.y - firstPoint.y;

                    // Update all points in the path
                    path.points = path.points.map(point => ({
                        ...point,
                        time: this.getTimeFromX(point.x + deltaX) || point.time,
                        price: this.getPriceFromY(point.y + deltaY) || point.price,
                        x: point.x + deltaX,
                        y: point.y + deltaY
                    }));

                    this.draw();
                }
            }
        };

        // Mouse up finishes drawing or dragging
        this.mouseUpHandler = () => {
            if (this.isDrawing && this.currentPath) {
                if (this.currentPath.points.length > 1) {
                    // Only save if we have more than one point
                    this.paths.push(this.currentPath);
                    this.selectedPathId = this.currentPath.id;
                    this.triggerChange(); // Trigger auto-save
                }
                this.currentPath = null;
                this.isDrawing = false;
                this.draw();
            }

            if (this.isDragging) {
                this.isDragging = false;
                this.dragOffset = null;
            }
        };

        // Subscribe to events
        if (this.canvas) {
            this.canvas.style.pointerEvents = 'auto'; // Enable mouse events on canvas
            this.canvas.addEventListener('mousedown', this.handleCanvasMouseDown);
            this.canvas.addEventListener('mousemove', this.handleCanvasMouseMove);
            this.canvas.addEventListener('mouseup', this.handleCanvasMouseUp);
            this.canvas.addEventListener('mouseleave', this.handleCanvasMouseLeave);
        }

        this.chart.subscribeCrosshairMove(this.moveHandler);
    }

    // Canvas event handlers that convert to chart coordinates
    private handleCanvasMouseDown = (e: MouseEvent) => {
        const rect = this.canvas?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const time = this.getTimeFromX(x);
        const price = this.getPriceFromY(y);

        if (this.mouseDownHandler && time !== null && price !== null) {
            this.mouseDownHandler({
                time: time,
                point: { x, y },
                seriesData: new Map()
            } as MouseEventParams<Time>);
        }
    };

    private handleCanvasMouseMove = (e: MouseEvent) => {
        const rect = this.canvas?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const time = this.getTimeFromX(x);
        const price = this.getPriceFromY(y);

        if (this.moveHandler && time !== null && price !== null) {
            this.moveHandler({
                time: time,
                point: { x, y },
                seriesData: new Map()
            } as MouseEventParams<Time>);
        }
    };

    private handleCanvasMouseUp = () => {
        if (this.mouseUpHandler) {
            this.mouseUpHandler();
        }
    };

    private handleCanvasMouseLeave = () => {
        // Treat leaving canvas as mouse up
        if (this.isDrawing || this.isDragging) {
            this.handleCanvasMouseUp();
        }
    };

    public deactivate(): void {
        if (!this.isActive) return;

        this.isActive = false;
        this.isDrawing = false;
        this.isDragging = false;
        this.currentPath = null;
        this.dragOffset = null;

        if (this.canvas) {
            this.canvas.style.pointerEvents = 'none';
            this.canvas.removeEventListener('mousedown', this.handleCanvasMouseDown);
            this.canvas.removeEventListener('mousemove', this.handleCanvasMouseMove);
            this.canvas.removeEventListener('mouseup', this.handleCanvasMouseUp);
            this.canvas.removeEventListener('mouseleave', this.handleCanvasMouseLeave);
        }

        if (this.moveHandler) {
            this.chart.unsubscribeCrosshairMove(this.moveHandler);
            this.moveHandler = null;
        }

        this.mouseDownHandler = null;
        this.mouseUpHandler = null;
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
        if (this.selectedPathId) {
            this.paths = this.paths.filter(p => p.id !== this.selectedPathId);
            this.selectedPathId = null;
            this.draw();
            this.triggerChange(); // Trigger auto-save
        }
    }

    public removeAllPaths(): void {
        this.paths = [];
        this.selectedPathId = null;
        this.currentPath = null;
        this.draw();
        this.triggerChange(); // Trigger auto-save
    }

    private generateId(): string {
        return `freehand_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private hitTestPath(x: number, y: number): string | null {
        const tolerance = 8; // Pixels

        for (const path of this.paths) {
            this.updatePathCoordinates(path);

            // Check if click is near any segment of the path
            for (let i = 0; i < path.points.length - 1; i++) {
                const p1 = path.points[i];
                const p2 = path.points[i + 1];

                const distance = this.pointToSegmentDistance(x, y, p1.x, p1.y, p2.x, p2.y);
                if (distance <= tolerance) {
                    return path.id;
                }
            }
        }

        return null;
    }

    private pointToSegmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSquared = dx * dx + dy * dy;

        if (lengthSquared === 0) {
            // Segment is a point
            return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
        }

        // Calculate projection parameter
        let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
        t = Math.max(0, Math.min(1, t));

        // Find closest point on segment
        const closestX = x1 + t * dx;
        const closestY = y1 + t * dy;

        // Return distance to closest point
        return Math.sqrt((px - closestX) * (px - closestX) + (py - closestY) * (py - closestY));
    }

    private updatePathCoordinates(path: FreehandPath): void {
        path.points.forEach(point => {
            const x = this.getXFromTime(point.time);
            const y = this.getYFromPrice(point.price);

            if (x !== null) point.x = x;
            if (y !== null) point.y = y;
        });
    }

    private clear(): void {
        if (!this.ctx || !this.canvas) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    public draw(): void {
        this.clear();
        if (!this.ctx) return;

        // Draw all paths
        for (const path of this.paths) {
            this.updatePathCoordinates(path);
            const isSelected = path.id === this.selectedPathId;
            this.drawPath(path, isSelected);
        }

        // Draw current path being drawn
        if (this.isDrawing && this.currentPath && this.currentPath.points.length > 0) {
            this.drawPath(this.currentPath, false);
        }
    }

    private drawPath(path: FreehandPath, isSelected: boolean): void {
        if (!this.ctx || path.points.length < 2) return;

        const ctx = this.ctx;
        const styles = getComputedStyle(document.documentElement);
        const color = styles.getPropertyValue('--text2').trim() || path.color;

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = path.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Move to first point
        ctx.moveTo(path.points[0].x, path.points[0].y);

        // Draw lines through all points
        for (let i = 1; i < path.points.length; i++) {
            ctx.lineTo(path.points[i].x, path.points[i].y);
        }

        ctx.stroke();

        // If selected, draw small circles at endpoints
        if (isSelected) {
            ctx.fillStyle = color;
            const firstPoint = path.points[0];
            const lastPoint = path.points[path.points.length - 1];

            ctx.beginPath();
            ctx.arc(firstPoint.x, firstPoint.y, 3, 0, 2 * Math.PI);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(lastPoint.x, lastPoint.y, 3, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    public getPaths(): FreehandPath[] {
        return [...this.paths];
    }

    public loadPaths(paths: FreehandPath[]): void {
        this.paths = paths;
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

        this.canvas = null;
        this.ctx = null;
        this.paths = [];
        this.selectedPathId = null;
    }
}
