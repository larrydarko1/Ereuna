import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type ChartInfo, type ScreenshotConfig, ChartScreenshot } from '@/lib/charting/screenshot';

type Painted = { text: string[]; images: unknown[][]; fills: string[] };

const INFO: ChartInfo = {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    timeframe: '1D',
    price: '189.45',
    change: '+2.13',
    changePercent: '+1.14%',
    date: '2026-09-13',
};

let downloaded: { name: string; href: string }[] = [];
let createdUrls = 0;
let revokedUrls = 0;
let logoLoads: 'ok' | 'fail' = 'ok';

const RECT = { x: 0, y: 0, top: 0, left: 0, right: 600, bottom: 400, width: 600, height: 400 } as DOMRect;

/**
 * The same quote with some of its optional fields absent. `exactOptionalPropertyTypes`
 * is on, so an absent field has to be missing rather than set to undefined.
 */
function without(...fields: (keyof ChartInfo)[]): ChartInfo {
    const info: Record<string, unknown> = { ...INFO };
    for (const field of fields) delete info[field];
    return info as unknown as ChartInfo;
}

/** A container holding stacked canvases, which is the shape the compositor expects. */
function container(canvasCount = 2): HTMLElement {
    const element = document.createElement('div');
    element.getBoundingClientRect = (): DOMRect => RECT;

    for (let i = 0; i < canvasCount; i += 1) {
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 400;
        canvas.getBoundingClientRect = (): DOMRect => RECT;
        element.appendChild(canvas);
    }

    document.body.appendChild(element);
    return element;
}

/**
 * Takes one export and reports what was painted.
 *
 * Nothing the module produces can be read back — jsdom rasterises nothing — so
 * every assertion about the output is an assertion about the context calls, and
 * `measureText` is overridable because the truncation only bites on wide glyphs.
 */
async function exported(
    info: ChartInfo,
    config: Partial<ScreenshotConfig> = {},
    glyphWidth = 6,
    canvasCount = 2,
): Promise<Painted> {
    const painted: Painted = { text: [], images: [], fills: [] };
    const original = HTMLCanvasElement.prototype.getContext;

    HTMLCanvasElement.prototype.getContext = function getContext(this: HTMLCanvasElement, ...args: never[]): unknown {
        const context = (original as (...a: never[]) => unknown).apply(this, args) as Record<string, unknown>;
        const recorder = {
            ...context,
            fillText: (text: string): void => {
                painted.text.push(text);
            },
            drawImage: (...called: unknown[]): void => {
                painted.images.push(called);
            },
            measureText: (text: string) => ({ width: text.length * glyphWidth }),
        };

        return new Proxy(recorder, {
            set(target: Record<string, unknown>, property: string, value: unknown): boolean {
                if (property === 'fillStyle') painted.fills.push(String(value));
                target[property] = value;
                return true;
            },
        });
    } as typeof HTMLCanvasElement.prototype.getContext;

    try {
        await new ChartScreenshot(container(canvasCount)).takeScreenshot(info, config);
    } finally {
        HTMLCanvasElement.prototype.getContext = original;
    }

    return painted;
}

beforeEach(() => {
    downloaded = [];
    createdUrls = 0;
    revokedUrls = 0;
    logoLoads = 'ok';

    // jsdom encodes no bitmaps and downloads nothing, so the two ends of the
    // export — the PNG and the anchor that saves it — are stood in for
    HTMLCanvasElement.prototype.toBlob = function toBlob(callback: BlobCallback): void {
        callback(new Blob(['png'], { type: 'image/png' }));
    };

    URL.createObjectURL = vi.fn((): string => {
        createdUrls += 1;
        return `blob:test/${createdUrls}`;
    });
    URL.revokeObjectURL = vi.fn((): void => {
        revokedUrls += 1;
    });

    HTMLAnchorElement.prototype.click = function click(this: HTMLAnchorElement): void {
        downloaded.push({ name: this.download, href: this.href });
    };

    // The wordmark is fetched over the network, which jsdom will not do
    Object.defineProperty(Image.prototype, 'src', {
        configurable: true,
        set(this: HTMLImageElement): void {
            Object.defineProperty(this, 'width', { configurable: true, value: 300 });
            Object.defineProperty(this, 'height', { configurable: true, value: 90 });
            queueMicrotask(() => {
                if (logoLoads === 'ok') this.onload?.(new Event('load'));
                else this.onerror?.(new Event('error'));
            });
        },
    });
});

afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
});

describe('exporting a chart', () => {
    it('saves a PNG named for the symbol and the day', async () => {
        await new ChartScreenshot(container()).takeScreenshot(INFO);

        expect(downloaded).toHaveLength(1);
        expect(downloaded[0]?.name).toMatch(/^AAPL_chart_\d{4}-\d{2}-\d{2}\.png$/);
    });

    it('releases the blob it handed the browser', async () => {
        await new ChartScreenshot(container()).takeScreenshot(INFO);

        expect(createdUrls).toBe(1);
        expect(revokedUrls).toBe(1);
    });

    it('composites every canvas layer the container holds', async () => {
        const painted = await exported(INFO, { includeLogo: false }, 6, 3);

        // The three layers onto the capture surface, then the capture onto the export
        expect(painted.images.length).toBeGreaterThanOrEqual(4);
    });

    it('refuses a container with nothing drawn in it', async () => {
        const empty = document.createElement('div');
        document.body.appendChild(empty);

        await expect(new ChartScreenshot(empty).takeScreenshot(INFO)).rejects.toThrow(/no canvas/);
    });

    it('says so when the wordmark cannot be fetched', async () => {
        logoLoads = 'fail';

        await expect(new ChartScreenshot(container()).takeScreenshot(INFO)).rejects.toThrow(/wordmark/);
    });
});

describe('what the export carries', () => {
    it('writes the ticker, the name, the price, the change and the date', async () => {
        const painted = await exported(INFO, { includeLogo: false });

        expect(painted.text).toContain('AAPL');
        expect(painted.text).toContain('189.45');
        expect(painted.text).toContain('+2.13 (+1.14%)');
        expect(painted.text).toContain('1D');
        expect(painted.text).toContain('2026-09-13');
    });

    it('writes nothing at all when the header is switched off', async () => {
        const painted = await exported(INFO, { includeLogo: false, includeChartInfo: false });

        expect(painted.text).toHaveLength(0);
    });

    it('leaves the change off when there is no change to report', async () => {
        const painted = await exported(without('change', 'changePercent'), { includeLogo: false });

        expect(painted.text.some((text) => text.includes('('))).toBe(false);
        expect(painted.text).toContain('189.45');
    });

    it('colours a fall differently from a rise', async () => {
        const rising = await exported(INFO, { includeLogo: false });
        const falling = await exported({ ...INFO, change: '-2.13', changePercent: '-1.14%' }, { includeLogo: false });

        expect(rising.fills).toContain('#10b981');
        expect(falling.fills).toContain('#ef4444');
    });

    it('writes no quote line at all when there is no price', async () => {
        const painted = await exported(without('price'), { includeLogo: false });

        expect(painted.text).not.toContain('AAPL');
        expect(painted.text).toContain('1D');
    });

    it('shortens a company name that will not fit', async () => {
        const painted = await exported(
            { ...INFO, name: 'A Company With A Very Long Name Indeed' },
            { includeLogo: false },
            60,
        );

        expect(painted.text.some((text) => text.endsWith('...'))).toBe(true);
    });

    it('draws the wordmark when it is asked for', async () => {
        const painted = await exported(INFO, { includeLogo: true });

        // The two chart layers, the logo onto its recolouring surface, that
        // surface onto the header, and the capture onto the export
        expect(painted.images.length).toBeGreaterThanOrEqual(5);
    });

    it('writes dark text on a light background and light text on a dark one', async () => {
        const onLight = await exported(INFO, { includeLogo: false, backgroundColor: '#ffffff' });
        const onDark = await exported(INFO, { includeLogo: false, backgroundColor: '#000' });

        expect(onLight.fills).toContain('#1a1b26');
        expect(onDark.fills).toContain('#ffffff');
    });

    it('treats a background that is not a hex colour as dark', async () => {
        const painted = await exported(INFO, { includeLogo: false, backgroundColor: 'rebeccapurple' });

        expect(painted.fills).toContain('#ffffff');
    });
});
