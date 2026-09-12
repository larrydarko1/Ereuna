import { traceRoundedRect } from '@/lib/lightweight-charts/canvas-path';
import { getThemeColor } from '@/lib/lightweight-charts/theme-color';

export type ScreenshotConfig = {
    includeWatermark: boolean;
    includeLogo: boolean;
    includeChartInfo: boolean;
    logoUrl?: string;
    appName: string;
    websiteUrl: string;
    backgroundColor: string;
    watermarkOpacity: number;
};

export type ChartInfo = {
    symbol: string;
    name: string;
    timeframe: string;
    price?: string;
    change?: string;
    changePercent?: string;
    date: string;
};

type HeaderLayout = {
    ctx: CanvasRenderingContext2D;
    chartInfo: ChartInfo;
    config: ScreenshotConfig;
    x: number;
    width: number;
    dpr: number;
};

// The full wordmark, from public/ — the URL is stable in dev and in the build
// and needs no bundler entry. The logo is drawn at a fixed height and its
// intrinsic ratio decides the width.
const LOGO_URL = '/logo.svg';
const LOGO_HEIGHT = 90;

// Header is taller when it carries the ticker line under the wordmark
const HEADER_HEIGHT_WITH_INFO = 70;
const HEADER_HEIGHT_LOGO_ONLY = 45;

// An export wider than this is a screen artefact, not a chart
const MAX_CHART_HEIGHT = 1080;

const POSITIVE_CHANGE_COLOR = '#10b981';
const NEGATIVE_CHANGE_COLOR = '#ef4444';

export class ChartScreenshot {
    private chartContainer: HTMLElement;
    private defaultConfig: ScreenshotConfig = {
        includeWatermark: true,
        includeLogo: true,
        includeChartInfo: true,
        appName: 'Ereuna',
        websiteUrl: 'ereuna.io',
        backgroundColor: '#1a1b26',
        watermarkOpacity: 0.8,
    };

    // Reads the canvas layers straight out of the container, so it never needs
    // the chart instance
    constructor(container: HTMLElement) {
        this.chartContainer = container;
    }

    public async takeScreenshot(chartInfo: ChartInfo, config: Partial<ScreenshotConfig> = {}): Promise<void> {
        const finalConfig = { ...this.defaultConfig, ...config };

        const chartCanvas = this.captureChartCanvas();
        const finalCanvas = await this.createBrandedCanvas(chartCanvas, chartInfo, finalConfig);

        await this.downloadCanvas(finalCanvas, chartInfo.symbol);
    }

    /**
     * Flattens the chart's stacked canvas layers into one bitmap.
     *
     * The library paints the panes, the crosshair and every overlay onto
     * separate canvases; an export has to composite them in DOM order or it
     * captures only whichever layer happens to be read.
     */
    private captureChartCanvas(): HTMLCanvasElement {
        const canvases = Array.from(this.chartContainer.querySelectorAll('canvas'));
        if (canvases.length === 0) {
            throw new Error('Chart container holds no canvas to capture');
        }

        const rect = this.chartContainer.getBoundingClientRect();
        let maxBottom = 0;
        let minTop = Infinity;

        // The layers do not all start at the container's top edge, so the real
        // bounds come from the layers themselves
        canvases.forEach((canvas) => {
            const canvasRect = canvas.getBoundingClientRect();
            minTop = Math.min(minTop, canvasRect.top - rect.top);
            maxBottom = Math.max(maxBottom, canvasRect.bottom - rect.top);
        });

        const width = rect.width;
        const height = maxBottom - minTop;

        const combinedCanvas = document.createElement('canvas');
        const dpr = window.devicePixelRatio;
        combinedCanvas.width = width * dpr;
        combinedCanvas.height = height * dpr;

        const ctx = combinedCanvas.getContext('2d');
        if (ctx === null) {
            throw new Error('Could not acquire a 2d context for the capture canvas');
        }

        ctx.scale(dpr, dpr);

        ctx.fillStyle = getThemeColor('--color-bg');
        ctx.fillRect(0, 0, width, height);

        canvases.forEach((canvas) => {
            const canvasRect = canvas.getBoundingClientRect();
            ctx.drawImage(
                canvas,
                canvasRect.left - rect.left,
                canvasRect.top - rect.top - minTop,
                canvasRect.width,
                canvasRect.height,
            );
        });

        return combinedCanvas;
    }

    private async createBrandedCanvas(
        chartCanvas: HTMLCanvasElement,
        chartInfo: ChartInfo,
        config: ScreenshotConfig,
    ): Promise<HTMLCanvasElement> {
        const dpr = window.devicePixelRatio;
        const padding = 40 * dpr;
        const chartPadding = 10 * dpr;

        let headerHeight = 0;
        if (config.includeChartInfo) headerHeight = HEADER_HEIGHT_WITH_INFO * dpr;
        else if (config.includeLogo) headerHeight = HEADER_HEIGHT_LOGO_ONLY * dpr;

        const finalWidth = chartCanvas.width + padding * 2;
        const finalHeight = chartCanvas.height + headerHeight + chartPadding * 2 + padding;

        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = finalWidth;
        finalCanvas.height = finalHeight;

        const ctx = finalCanvas.getContext('2d');
        if (ctx === null) {
            throw new Error('Could not acquire a 2d context for the export canvas');
        }

        ctx.fillStyle = config.backgroundColor;
        ctx.fillRect(0, 0, finalWidth, finalHeight);

        if (config.includeChartInfo || config.includeLogo) {
            await this.drawHeader({ ctx, chartInfo, config, x: padding, width: finalWidth, dpr });
        }

        const chartBoxY = headerHeight + chartPadding;
        const chartBoxWidth = finalWidth - padding * 2;
        const chartBoxHeight = chartCanvas.height + chartPadding * 2;

        // The chart sits in its own rounded panel, painted the page ground so
        // the plot reads as inset rather than floating on the export's border
        ctx.fillStyle = getThemeColor('--color-bg');
        traceRoundedRect(ctx, {
            x: padding,
            y: chartBoxY,
            width: chartBoxWidth,
            height: chartBoxHeight,
            radius: 16 * dpr,
        });
        ctx.fill();

        const chartDrawWidth = Math.min(chartCanvas.width, chartBoxWidth - chartPadding * 2);
        const chartDrawHeight = Math.min(
            Math.min(chartCanvas.height, MAX_CHART_HEIGHT * dpr),
            chartBoxHeight - chartPadding * 2,
        );

        ctx.drawImage(
            chartCanvas,
            0,
            0,
            chartCanvas.width,
            chartCanvas.height,
            padding + chartPadding,
            headerHeight + chartPadding * 2,
            chartDrawWidth,
            chartDrawHeight,
        );

        return finalCanvas;
    }

    private async drawHeader(layout: HeaderLayout): Promise<void> {
        const { ctx, chartInfo, config, x, width, dpr } = layout;

        // The export's background is the caller's choice, not the theme's, so
        // the text colour is derived from it rather than read off the document
        const { textColor, textColorSecondary } = this.getContrastColors(config.backgroundColor);

        ctx.fillStyle = textColor;
        ctx.textBaseline = 'top';

        // First line: the wordmark on the left, date and timeframe on the right
        const firstLineY = 6 * dpr;

        if (config.includeLogo) {
            await this.drawLogo({ ctx, x, y: firstLineY, height: LOGO_HEIGHT * dpr, color: textColor });
        }

        if (!config.includeChartInfo) return;

        ctx.textAlign = 'right';
        ctx.font = `${15 * dpr}px Arial`;
        ctx.fillStyle = textColorSecondary;
        ctx.fillText(chartInfo.timeframe, width - x, firstLineY + 18 * dpr);

        const timeframeWidth = ctx.measureText(chartInfo.timeframe).width;
        ctx.fillText(chartInfo.date, width - x - timeframeWidth - 20 * dpr, firstLineY + 18 * dpr);

        this.drawQuoteLine(layout, firstLineY + 40 * dpr, textColor, textColorSecondary);
    }

    /**
     * Ticker, company name, price and change, laid out right to left because the
     * change is the rightmost element and every other width depends on it
     */
    private drawQuoteLine(layout: HeaderLayout, lineY: number, textColor: string, textColorSecondary: string): void {
        const { ctx, chartInfo, x, width, dpr } = layout;

        const priceText = chartInfo.price ?? '';
        if (priceText === '') return;

        const change = chartInfo.change ?? '';
        const changePercent = chartInfo.changePercent ?? '';
        const changeText = change === '' || changePercent === '' ? '' : `${change} (${changePercent})`;

        ctx.textAlign = 'right';
        let rightX = width - x;

        if (changeText !== '') {
            ctx.fillStyle = change.startsWith('-') ? NEGATIVE_CHANGE_COLOR : POSITIVE_CHANGE_COLOR;
            ctx.font = `${15 * dpr}px Arial`;
            ctx.fillText(changeText, rightX, lineY + 2 * dpr);
            rightX -= ctx.measureText(changeText).width + 10 * dpr;
        }

        ctx.font = `bold ${20 * dpr}px Arial`;
        ctx.fillStyle = textColor;
        ctx.fillText(priceText, rightX, lineY);
        rightX -= ctx.measureText(priceText).width + 14 * dpr;

        ctx.font = `${14 * dpr}px Arial`;
        ctx.fillStyle = textColorSecondary;
        const truncatedName = this.truncateText(ctx, chartInfo.name, rightX - x - 14 * dpr);
        ctx.fillText(truncatedName, rightX, lineY + 3 * dpr);
        rightX -= ctx.measureText(truncatedName).width + 14 * dpr;

        ctx.font = `bold ${20 * dpr}px Arial`;
        ctx.fillStyle = textColor;
        ctx.fillText(chartInfo.symbol, rightX, lineY);
    }

    private async drawLogo(logo: {
        ctx: CanvasRenderingContext2D;
        x: number;
        y: number;
        height: number;
        color: string;
    }): Promise<void> {
        const { ctx, x, y, height, color } = logo;

        const img = await this.loadLogo();
        const logoWidth = height * (img.width / img.height);

        // The wordmark is a single-colour glyph recoloured to the export's text
        // colour, so one asset covers both light and dark backgrounds
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = logoWidth;
        tempCanvas.height = height;

        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx === null) {
            throw new Error('Could not acquire a 2d context to recolour the logo');
        }

        tempCtx.drawImage(img, 0, 0, logoWidth, height);
        tempCtx.globalCompositeOperation = 'source-in';
        tempCtx.fillStyle = color;
        tempCtx.fillRect(0, 0, logoWidth, height);

        ctx.drawImage(tempCanvas, x, y, logoWidth, height);
    }

    private async loadLogo(): Promise<HTMLImageElement> {
        return new Promise<HTMLImageElement>((resolve, reject): void => {
            const img = new Image();
            img.onload = (): void => resolve(img);
            img.onerror = (): void => reject(new Error(`Could not load the wordmark from ${LOGO_URL}`));
            img.src = LOGO_URL;
        });
    }

    private truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
        if (ctx.measureText(text).width <= maxWidth) {
            return text;
        }

        let truncated = text;
        while (truncated.length > 0 && ctx.measureText(`${truncated}...`).width > maxWidth) {
            truncated = truncated.slice(0, -1);
        }

        return `${truncated}...`;
    }

    /**
     * The export's background is a colour the caller picked, which may be light
     * or dark, so the header text is chosen against its luminance
     */
    private getContrastColors(backgroundColor: string): { textColor: string; textColorSecondary: string } {
        if (this.isLightColor(backgroundColor)) {
            return { textColor: '#1a1b26', textColorSecondary: '#6b7280' };
        }

        return { textColor: '#ffffff', textColorSecondary: '#9ca3af' };
    }

    private isLightColor(color: string): boolean {
        if (!color.startsWith('#')) return false;

        const hex = color.slice(1);
        const isShorthand = hex.length === 3;

        const readChannel = (index: number): number =>
            isShorthand
                ? parseInt(hex.slice(index, index + 1).repeat(2), 16)
                : parseInt(hex.slice(index * 2, index * 2 + 2), 16);

        const red = readChannel(0);
        const green = readChannel(1);
        const blue = readChannel(2);

        // Rec. 601 luma, which is what the eye reads as brightness
        return (0.299 * red + 0.587 * green + 0.114 * blue) / 255 > 0.5;
    }

    private async downloadCanvas(canvas: HTMLCanvasElement, symbol: string): Promise<void> {
        const blob = await this.encodePng(canvas);

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${symbol}_chart_${new Date().toISOString().slice(0, 10)}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    }

    private async encodePng(canvas: HTMLCanvasElement): Promise<Blob> {
        return new Promise<Blob>((resolve, reject): void => {
            canvas.toBlob((blob): void => {
                if (blob === null) {
                    reject(new Error('Canvas could not be encoded as PNG'));
                    return;
                }

                resolve(blob);
            }, 'image/png');
        });
    }
}
