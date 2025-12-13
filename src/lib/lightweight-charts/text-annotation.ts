import { IChartApi, MouseEventParams, Time } from './index';

export interface TextAnnotationPoint {
    time: Time;
    price: number;
    x: number;
    y: number;
}

export interface TextAnnotation {
    id: string;
    point: TextAnnotationPoint;
    text: string;
    fontSize: number;
    textColor: string;
    backgroundColor: string;
    backgroundOpacity: number;
    locked: boolean;
}

export class TextAnnotationManager {
    private chart: IChartApi;
    private mainSeries: any = null;
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private isActive: boolean = false;
    private annotations: TextAnnotation[] = [];
    private selectedAnnotationId: string | null = null;
    private isDragging: boolean = false;
    private dragOffset: { x: number; y: number } | null = null;
    private clickHandler: ((param: MouseEventParams<Time>) => void) | null = null;
    private moveHandler: ((param: MouseEventParams<Time>) => void) | null = null;
    private defaultFontSize: number = 11;
    private defaultBackgroundOpacity: number = 0.7;
    private textInput: HTMLInputElement | null = null;
    private visibleRangeChangeHandler: (() => void) | null = null;
    private isEditingText: boolean = false;
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
        this.canvas.style.zIndex = '100'; // Above trendlines and boxes

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

        this.clickHandler = (param: MouseEventParams<Time>) => {
            if (!param.point || !param.time) return;

            const price = this.getPriceFromY(param.point.y);
            if (price === null || price === undefined) return;

            // If we're currently dragging, stop dragging on this click
            if (this.isDragging) {
                this.isDragging = false;
                this.dragOffset = null;
                this.draw();
                return;
            }

            // Check if clicking on an existing annotation
            const annotationHit = this.hitTestAnnotation(param.point.x, param.point.y);
            if (annotationHit) {
                this.selectedAnnotationId = annotationHit;
                this.isDragging = true;

                const annotation = this.annotations.find(a => a.id === annotationHit);
                if (annotation) {
                    this.dragOffset = {
                        x: param.point.x - annotation.point.x,
                        y: param.point.y - annotation.point.y
                    };
                }
                this.draw();
                return;
            }

            // Create new annotation
            this.promptForText((text) => {
                if (text && text.trim()) {
                    const styles = getComputedStyle(document.documentElement);
                    const textColor = styles.getPropertyValue('--text1').trim() || '#ffffff';
                    const bgColor = styles.getPropertyValue('--base3').trim() || '#414868';

                    const newAnnotation: TextAnnotation = {
                        id: this.generateId(),
                        point: {
                            time: param.time!,
                            price: price,
                            x: param.point!.x,
                            y: param.point!.y
                        },
                        text: text.trim(),
                        fontSize: this.defaultFontSize,
                        textColor: textColor,
                        backgroundColor: bgColor,
                        backgroundOpacity: this.defaultBackgroundOpacity,
                        locked: false
                    };

                    this.annotations.push(newAnnotation);
                    this.selectedAnnotationId = newAnnotation.id;
                    this.draw();
                    this.triggerChange(); // Trigger auto-save
                }
            }, '', param.point!.x, param.point!.y);
        };

        this.moveHandler = (param: MouseEventParams<Time>) => {
            if (!param.point || !param.time) return;

            const price = this.getPriceFromY(param.point.y);
            if (price === null || price === undefined) return;

            // If dragging an annotation, update its position
            if (this.isDragging && this.selectedAnnotationId && this.dragOffset) {
                const annotation = this.annotations.find(a => a.id === this.selectedAnnotationId);
                if (annotation && !annotation.locked) {
                    annotation.point = {
                        time: param.time,
                        price: price,
                        x: param.point.x - this.dragOffset.x,
                        y: param.point.y - this.dragOffset.y
                    };
                    this.draw();
                }
            }
        };

        this.chart.subscribeClick(this.clickHandler);
        this.chart.subscribeCrosshairMove(this.moveHandler);
    }

    public deactivate(): void {
        if (!this.isActive) return;

        this.isActive = false;
        this.isDragging = false;
        this.dragOffset = null;
        this.removeTextInput();

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

    public removeSelectedAnnotation(): void {
        if (this.selectedAnnotationId) {
            this.annotations = this.annotations.filter(a => a.id !== this.selectedAnnotationId);
            this.selectedAnnotationId = null;
            this.draw();
            this.triggerChange(); // Trigger auto-save
        }
    }

    public removeAllAnnotations(): void {
        this.annotations = [];
        this.selectedAnnotationId = null;
        this.draw();
        this.triggerChange(); // Trigger auto-save
    }

    public editSelectedAnnotation(): void {
        if (this.selectedAnnotationId) {
            const annotation = this.annotations.find(a => a.id === this.selectedAnnotationId);
            if (annotation) {
                this.updateAnnotationCoordinates(annotation);
                this.promptForText((text) => {
                    if (text && text.trim()) {
                        annotation.text = text.trim();
                        this.draw();
                    }
                }, annotation.text, annotation.point.x, annotation.point.y);
            }
        }
    }

    private promptForText(callback: (text: string) => void, defaultText: string = '', x?: number, y?: number): void {
        // Remove any existing input
        this.removeTextInput();

        const chartContainer = (this.chart as any).chartElement?.() || document.querySelector('#wk-chart');
        if (!chartContainer) return;

        // Create input element
        this.textInput = document.createElement('input');
        this.textInput.type = 'text';
        this.textInput.value = defaultText;
        this.textInput.placeholder = 'Enter text...';

        // Style the input
        const styles = getComputedStyle(document.documentElement);
        const textColor = styles.getPropertyValue('--text1').trim() || '#ffffff';
        const bgColor = styles.getPropertyValue('--base3').trim() || '#414868';

        Object.assign(this.textInput.style, {
            position: 'absolute',
            left: `${x || 100}px`,
            top: `${y || 100}px`,
            fontSize: '11px',
            padding: '4px 8px',
            border: `1px solid ${textColor}`,
            borderRadius: '3px',
            background: bgColor,
            color: textColor,
            outline: 'none',
            zIndex: '1000',
            fontFamily: 'Arial, sans-serif',
            minWidth: '120px'
        });

        chartContainer.appendChild(this.textInput);
        this.textInput.focus();
        this.textInput.select();

        // Handle submission
        const handleSubmit = () => {
            const text = this.textInput?.value || '';
            this.removeTextInput();
            callback(text);
        };

        // Handle cancel
        const handleCancel = () => {
            this.removeTextInput();
        };

        // Enter key submits
        this.textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                handleCancel();
            }
        });

        // Blur submits
        this.textInput.addEventListener('blur', handleSubmit);
    }

    private removeTextInput(): void {
        if (this.textInput && this.textInput.parentElement) {
            this.textInput.remove();
            this.textInput = null;
        }
    }

    private generateId(): string {
        return `txt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private hitTestAnnotation(x: number, y: number): string | null {
        for (const annotation of this.annotations) {
            this.updateAnnotationCoordinates(annotation);

            const bounds = this.getAnnotationBounds(annotation);
            if (x >= bounds.x && x <= bounds.x + bounds.width &&
                y >= bounds.y && y <= bounds.y + bounds.height) {
                return annotation.id;
            }
        }

        return null;
    }

    private getAnnotationBounds(annotation: TextAnnotation): { x: number; y: number; width: number; height: number } {
        if (!this.ctx) return { x: 0, y: 0, width: 0, height: 0 };

        const ctx = this.ctx;
        const styles = getComputedStyle(document.documentElement);
        const textColor = styles.getPropertyValue('--text1').trim() || annotation.textColor;

        ctx.font = `${annotation.fontSize}px Arial`;
        const metrics = ctx.measureText(annotation.text);
        const textWidth = metrics.width;
        const textHeight = annotation.fontSize * 1.2;

        const padding = 6;
        const width = textWidth + padding * 2;
        const height = textHeight + padding * 2;

        return {
            x: annotation.point.x,
            y: annotation.point.y - height / 2,
            width: width,
            height: height
        };
    }

    private updateAnnotationCoordinates(annotation: TextAnnotation): void {
        const x = this.getXFromTime(annotation.point.time);
        const y = this.getYFromPrice(annotation.point.price);

        if (x !== null) annotation.point.x = x;
        if (y !== null) annotation.point.y = y;
    }

    private clear(): void {
        if (!this.ctx || !this.canvas) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    public draw(): void {
        this.clear();
        if (!this.ctx) return;

        for (const annotation of this.annotations) {
            this.updateAnnotationCoordinates(annotation);
            const isSelected = annotation.id === this.selectedAnnotationId;
            this.drawAnnotation(annotation, isSelected);
        }
    }

    private drawAnnotation(annotation: TextAnnotation, isSelected: boolean): void {
        if (!this.ctx) return;

        const ctx = this.ctx;
        const styles = getComputedStyle(document.documentElement);
        const textColor = styles.getPropertyValue('--text1').trim() || annotation.textColor;
        const bgColor = styles.getPropertyValue('--base3').trim() || annotation.backgroundColor;

        ctx.font = `${annotation.fontSize}px Arial`;
        const metrics = ctx.measureText(annotation.text);
        const textWidth = metrics.width;
        const textHeight = annotation.fontSize * 1.2;

        const padding = 6;
        const boxWidth = textWidth + padding * 2;
        const boxHeight = textHeight + padding * 2;
        const boxX = annotation.point.x;
        const boxY = annotation.point.y - boxHeight / 2;

        // Draw background with rounded corners
        ctx.fillStyle = this.hexToRgba(bgColor, annotation.backgroundOpacity);
        this.roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 4);
        ctx.fill();

        // Draw border if selected
        if (isSelected) {
            ctx.strokeStyle = textColor;
            ctx.lineWidth = 2;
            this.roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 4);
            ctx.stroke();
        }

        // Draw text
        ctx.fillStyle = textColor;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillText(annotation.text, boxX + padding, annotation.point.y);
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

    private hexToRgba(hex: string, alpha: number): string {
        hex = hex.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    public getAnnotations(): TextAnnotation[] {
        return [...this.annotations];
    }

    public loadAnnotations(annotations: TextAnnotation[]): void {
        this.annotations = annotations;
        this.draw();
    }

    public destroy(): void {
        this.deactivate();
        this.removeTextInput();

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
