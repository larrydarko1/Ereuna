import { IChartApi } from './index';

export interface ScreenshotConfig {
    includeWatermark: boolean;
    includeLogo: boolean;
    includeChartInfo: boolean;
    logoUrl?: string;
    appName: string;
    websiteUrl: string;
    backgroundColor: string;
    watermarkOpacity: number;
}

export interface ChartInfo {
    symbol: string;
    name: string;
    timeframe: string;
    price?: string;
    change?: string;
    changePercent?: string;
    date: string;
}

export class ChartScreenshot {
    private chart: IChartApi;
    private chartContainer: HTMLElement | null = null;
    private defaultConfig: ScreenshotConfig = {
        includeWatermark: true,
        includeLogo: true,
        includeChartInfo: true,
        appName: 'Ereuna',
        websiteUrl: 'ereuna.io',
        backgroundColor: '#1a1b26',
        watermarkOpacity: 0.8
    };

    constructor(chart: IChartApi, containerId: string = 'wk-chart') {
        this.chart = chart;
        this.chartContainer = document.getElementById(containerId);
    }

    public async takeScreenshot(
        chartInfo: ChartInfo,
        config: Partial<ScreenshotConfig> = {}
    ): Promise<void> {
        const finalConfig = { ...this.defaultConfig, ...config };

        if (!this.chartContainer) {
            console.error('Chart container not found');
            return;
        }

        try {
            // Get the chart canvas
            const chartCanvas = await this.captureChartCanvas();
            if (!chartCanvas) {
                console.error('Failed to capture chart');
                return;
            }

            // Create final canvas with branding
            const finalCanvas = await this.createBrandedCanvas(
                chartCanvas,
                chartInfo,
                finalConfig
            );

            // Download the image
            this.downloadCanvas(finalCanvas, chartInfo.symbol);
        } catch (error) {
            console.error('Error taking screenshot:', error);
        }
    }

    private async captureChartCanvas(): Promise<HTMLCanvasElement | null> {
        if (!this.chartContainer) return null;

        // Get all canvas elements to calculate the total height
        const canvases = Array.from(this.chartContainer.querySelectorAll('canvas'));
        if (canvases.length === 0) return null;

        const rect = this.chartContainer.getBoundingClientRect();
        let maxBottom = 0;
        let minTop = Infinity;

        // Find the actual bounds by checking all canvases
        canvases.forEach(canvas => {
            const canvasRect = canvas.getBoundingClientRect();
            minTop = Math.min(minTop, canvasRect.top - rect.top);
            maxBottom = Math.max(maxBottom, canvasRect.bottom - rect.top);
        });

        const width = rect.width;
        const height = maxBottom - minTop; // Use actual height from canvases

        // Create a new canvas
        const combinedCanvas = document.createElement('canvas');
        const dpr = window.devicePixelRatio || 1;
        combinedCanvas.width = width * dpr;
        combinedCanvas.height = height * dpr;
        const ctx = combinedCanvas.getContext('2d');

        if (!ctx) return null;

        // Scale for device pixel ratio
        ctx.scale(dpr, dpr);

        // Draw background
        const styles = getComputedStyle(document.documentElement);
        const bgColor = styles.getPropertyValue('--base1').trim() || '#1a1b26';
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);

        // Draw each canvas layer in order, adjusted for the minTop offset
        canvases.forEach(canvas => {
            const canvasRect = canvas.getBoundingClientRect();
            const x = canvasRect.left - rect.left;
            const y = (canvasRect.top - rect.top) - minTop; // Adjust for the offset

            // Draw canvas at its relative position
            ctx.drawImage(canvas, x, y, canvasRect.width, canvasRect.height);
        });

        return combinedCanvas;
    }

    private async createBrandedCanvas(
        chartCanvas: HTMLCanvasElement,
        chartInfo: ChartInfo,
        config: ScreenshotConfig
    ): Promise<HTMLCanvasElement> {
        const dpr = window.devicePixelRatio || 1;
        const padding = 40 * dpr; // Reduced padding
        const headerHeight = config.includeChartInfo ? 70 * dpr : config.includeLogo ? 45 * dpr : 0;
        const chartPadding = 10 * dpr; // Minimal padding around chart

        const finalWidth = chartCanvas.width + (padding * 2);
        const finalHeight = chartCanvas.height + headerHeight + (chartPadding * 2) + padding;

        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = finalWidth;
        finalCanvas.height = finalHeight;
        const ctx = finalCanvas.getContext('2d');

        if (!ctx) return chartCanvas;

        // Scale for better quality
        ctx.scale(1, 1);

        // Fill background
        ctx.fillStyle = config.backgroundColor;
        ctx.fillRect(0, 0, finalWidth, finalHeight);

        // Draw header with branding and chart info
        if (config.includeChartInfo || config.includeLogo) {
            await this.drawHeader(ctx, chartInfo, config, padding, finalWidth, dpr);
        }

        // Create a slightly darker box for the chart itself
        const chartBoxX = padding;
        const chartBoxY = headerHeight + chartPadding;
        const chartBoxWidth = finalWidth - (padding * 2);
        const chartBoxHeight = chartCanvas.height + (chartPadding * 2);
        const borderRadius = 16 * dpr;

        // Draw chart background box with rounded corners - same color as inner canvas
        const styles = getComputedStyle(document.documentElement);
        const bgColor = styles.getPropertyValue('--base1').trim() || '#1a1b26';
        ctx.fillStyle = bgColor;
        this.roundRect(ctx, chartBoxX, chartBoxY, chartBoxWidth, chartBoxHeight, borderRadius);
        ctx.fill();

        // Calculate chart dimensions to fit within the box
        const maxChartWidth = chartBoxWidth - (chartPadding * 2);
        const maxChartHeight = chartBoxHeight - (chartPadding * 2);

        // Limit chart height to maintain 5% margin from top (simulating space above highest candle)
        const maxAllowedHeight = 1080 * dpr; // Target max height for professional look
        const adjustedChartHeight = Math.min(chartCanvas.height, maxAllowedHeight);

        const chartDrawWidth = Math.min(chartCanvas.width, maxChartWidth);
        const chartDrawHeight = Math.min(adjustedChartHeight, maxChartHeight);

        // Draw the chart centered in its box
        ctx.drawImage(
            chartCanvas,
            0, 0, chartCanvas.width, chartCanvas.height,
            padding + chartPadding,
            headerHeight + chartPadding + chartPadding,
            chartDrawWidth,
            chartDrawHeight
        );

        return finalCanvas;
    }

    private async drawHeader(
        ctx: CanvasRenderingContext2D,
        chartInfo: ChartInfo,
        config: ScreenshotConfig,
        x: number,
        width: number,
        dpr: number = 1
    ): Promise<void> {
        // Get colors with proper contrast for the screenshot background
        const colors = this.getContrastColors(config.backgroundColor);
        const textColor = colors.textColor;
        const textColorSecondary = colors.textColorSecondary;

        ctx.fillStyle = textColor;
        ctx.textBaseline = 'top';

        // First line: Logo (left) and Date/Timeframe (right)
        const firstLineY = -5 * dpr; // Minimal top margin for logo at absolute top

        // Draw logo - much larger size and theme-adaptable
        if (config.includeLogo) {
            await this.drawLogo(ctx, x, firstLineY, 90 * dpr, textColor, dpr);
        }

        if (!config.includeChartInfo) return;

        // Draw timeframe and date on the right side of first line
        ctx.textAlign = 'right';
        ctx.font = `${15 * dpr}px Arial`;
        ctx.fillStyle = textColorSecondary;
        ctx.fillText(chartInfo.timeframe, width - x, firstLineY + (18 * dpr));

        // Measure timeframe width to position date
        const timeframeWidth = ctx.measureText(chartInfo.timeframe).width;
        ctx.fillText(chartInfo.date, width - x - timeframeWidth - (20 * dpr), firstLineY + (18 * dpr));

        // Second line: Ticker, Company Name, Price, Change (below date/timeframe on the right)
        const secondLineY = firstLineY + (40 * dpr); // Position below date/timeframe

        // Build the info text from right to left for right alignment
        let infoText = '';
        let priceText = '';
        let changeText = '';

        // Prepare change text
        if (chartInfo.change && chartInfo.changePercent) {
            changeText = `${chartInfo.change} (${chartInfo.changePercent})`;
        }

        // Prepare price text
        if (chartInfo.price) {
            priceText = chartInfo.price;
        }

        // Draw price
        if (priceText) {
            ctx.textAlign = 'right';
            ctx.font = `bold ${20 * dpr}px Arial`;
            ctx.fillStyle = textColor;
            let rightX = width - x;

            // Draw change first (rightmost)
            if (changeText) {
                const isPositive = !chartInfo.change!.startsWith('-');
                ctx.fillStyle = isPositive ? '#10b981' : '#ef4444';
                ctx.font = `${15 * dpr}px Arial`;
                ctx.fillText(changeText, rightX, secondLineY + (2 * dpr));
                rightX -= ctx.measureText(changeText).width + (10 * dpr);

                // Draw price
                ctx.font = `bold ${20 * dpr}px Arial`;
                ctx.fillStyle = textColor;
            }

            ctx.fillText(priceText, rightX, secondLineY);
            rightX -= ctx.measureText(priceText).width + (14 * dpr);

            // Draw company name
            ctx.font = `${14 * dpr}px Arial`;
            ctx.fillStyle = textColorSecondary;
            const availableWidth = rightX - x - (14 * dpr); // Space for name
            const truncatedName = this.truncateText(ctx, chartInfo.name, availableWidth);
            ctx.fillText(truncatedName, rightX, secondLineY + (3 * dpr));
            rightX -= ctx.measureText(truncatedName).width + (14 * dpr);

            // Draw ticker symbol (leftmost)
            ctx.font = `bold ${20 * dpr}px Arial`;
            ctx.fillStyle = textColor;
            ctx.fillText(chartInfo.symbol, rightX, secondLineY);
        }

        // Third line: Branding text below ticker/name/price (theme-adaptable)
        const thirdLineY = secondLineY + (28 * dpr);
        ctx.textAlign = 'right';
        ctx.font = `${11 * dpr}px Arial`;
        ctx.fillStyle = textColorSecondary; // Uses theme color
        ctx.fillText('Made with Ereuna — ereuna.io', width - x, thirdLineY);
        ctx.globalAlpha = 1;
    }

    private drawFooter(
        ctx: CanvasRenderingContext2D,
        config: ScreenshotConfig,
        x: number,
        y: number,
        width: number,
        dpr: number = 1
    ): void {
        const styles = getComputedStyle(document.documentElement);
        const textColorSecondary = styles.getPropertyValue('--text2').trim() || '#9ca3af';

        ctx.globalAlpha = 0.5; // Lighter opacity
        ctx.fillStyle = textColorSecondary;
        ctx.font = `${11 * dpr}px Arial`;
        ctx.textBaseline = 'middle';

        // Center the branding text
        ctx.textAlign = 'center';
        ctx.fillText('Made by Ereuna — ereuna.io', width / 2, y);

        ctx.textAlign = 'left';
        ctx.globalAlpha = 1;
    }

    private drawFooterOld(
        ctx: CanvasRenderingContext2D,
        config: ScreenshotConfig,
        x: number,
        y: number,
        width: number,
        dpr: number = 1
    ): void {
        const styles = getComputedStyle(document.documentElement);
        const textColorSecondary = styles.getPropertyValue('--text2').trim() || '#9ca3af';

        ctx.globalAlpha = 0.7;
        ctx.fillStyle = textColorSecondary;
        ctx.font = `${12 * dpr}px Arial`;
        ctx.textBaseline = 'middle';

        // Left side - "Made With Ereuna"
        ctx.textAlign = 'left';
        ctx.fillText('Made With Ereuna', x, y);

        // Right side - domain
        ctx.textAlign = 'right';
        ctx.fillText(config.websiteUrl, width - x, y);

        ctx.textAlign = 'left';
        ctx.globalAlpha = 1;
    }

    private async drawLogo(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        height: number,
        color: string,
        dpr: number = 1
    ): Promise<void> {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const aspectRatio = img.width / img.height;
                const logoWidth = height * aspectRatio;

                // Create temporary canvas to apply color (theme-adaptable)
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = logoWidth;
                tempCanvas.height = height;
                const tempCtx = tempCanvas.getContext('2d');

                if (tempCtx) {
                    tempCtx.drawImage(img, 0, 0, logoWidth, height);

                    // Apply color overlay to make it theme-adaptable
                    tempCtx.globalCompositeOperation = 'source-in';
                    tempCtx.fillStyle = color; // Uses current theme text color
                    tempCtx.fillRect(0, 0, logoWidth, height);

                    // Draw to main canvas
                    ctx.drawImage(tempCanvas, x, y, logoWidth, height);
                }
                resolve();
            };
            img.onerror = () => resolve(); // Fail gracefully
            img.src = '/src/assets/icons/ereuna.svg';
        });
    }

    private truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
        const metrics = ctx.measureText(text);
        if (metrics.width <= maxWidth) {
            return text;
        }

        let truncated = text;
        while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
            truncated = truncated.slice(0, -1);
        }
        return truncated + '...';
    }

    private roundRect(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number
    ): void {
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

    private isLightColor(color: string): boolean {
        // Convert hex to RGB and calculate relative luminance
        let r = 0, g = 0, b = 0;

        if (color.startsWith('#')) {
            const hex = color.slice(1);
            if (hex.length === 3) {
                r = parseInt(hex[0] + hex[0], 16);
                g = parseInt(hex[1] + hex[1], 16);
                b = parseInt(hex[2] + hex[2], 16);
            } else {
                r = parseInt(hex.slice(0, 2), 16);
                g = parseInt(hex.slice(2, 4), 16);
                b = parseInt(hex.slice(4, 6), 16);
            }
        }

        // Calculate relative luminance using the formula
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5; // Light if luminance > 0.5
    }

    private getContrastColors(backgroundColor: string): { textColor: string, textColorSecondary: string } {
        // Override colors based on background brightness for proper contrast
        const isLight = this.isLightColor(backgroundColor);

        if (isLight) {
            // Dark text for light backgrounds
            return {
                textColor: '#1a1b26',
                textColorSecondary: '#6b7280'
            };
        } else {
            // Light text for dark backgrounds
            return {
                textColor: '#ffffff',
                textColorSecondary: '#9ca3af'
            };
        }
    }

    private adjustColorBrightness(color: string, amount: number): string {
        // Simple brightness adjustment for hex colors
        if (color.startsWith('#')) {
            const num = parseInt(color.slice(1), 16);
            let r = (num >> 16) + amount;
            let g = ((num >> 8) & 0x00FF) + amount;
            let b = (num & 0x0000FF) + amount;

            r = Math.max(0, Math.min(255, r));
            g = Math.max(0, Math.min(255, g));
            b = Math.max(0, Math.min(255, b));

            return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
        }
        return color;
    }

    private downloadCanvas(canvas: HTMLCanvasElement, symbol: string): void {
        canvas.toBlob((blob) => {
            if (!blob) {
                console.error('Failed to create blob');
                return;
            }

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().split('T')[0];
            link.download = `${symbol}_chart_${timestamp}.png`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
        }, 'image/png');
    }

    public async copyToClipboard(
        chartInfo: ChartInfo,
        config: Partial<ScreenshotConfig> = {}
    ): Promise<boolean> {
        const finalConfig = { ...this.defaultConfig, ...config };

        if (!this.chartContainer) {
            console.error('Chart container not found');
            return false;
        }

        try {
            const chartCanvas = await this.captureChartCanvas();
            if (!chartCanvas) {
                console.error('Failed to capture chart');
                return false;
            }

            const finalCanvas = await this.createBrandedCanvas(
                chartCanvas,
                chartInfo,
                finalConfig
            );

            return new Promise((resolve) => {
                finalCanvas.toBlob(async (blob) => {
                    if (!blob) {
                        resolve(false);
                        return;
                    }

                    try {
                        await navigator.clipboard.write([
                            new ClipboardItem({ 'image/png': blob })
                        ]);
                        resolve(true);
                    } catch (error) {
                        console.error('Failed to copy to clipboard:', error);
                        resolve(false);
                    }
                }, 'image/png');
            });
        } catch (error) {
            console.error('Error copying to clipboard:', error);
            return false;
        }
    }
}
