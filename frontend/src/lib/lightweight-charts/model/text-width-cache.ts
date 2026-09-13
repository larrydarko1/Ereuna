/**
 * Caches text measurements.
 *
 * `measureText` forces a layout, and the axes measure the same handful of labels
 * on every frame, so the cache is what keeps an idle chart from doing work.
 */
import { getDefined } from '@/lib/lightweight-charts/helpers/assertions';

export type CanvasCtxLike = Pick<CanvasRenderingContext2D, 'measureText' | 'save' | 'restore' | 'textBaseline'>;

const defaultReplacementRe = /[2-9]/g;

export class TextWidthCache {
    private readonly _maxSize: number;
    private _actualSize = 0;
    private _usageTick = 1;
    private _oldestTick = 1;
    // A Map rather than an object, so that evicting the oldest tick is a delete
    // by key instead of a dynamic property delete
    private _tick2Labels = new Map<number, string>();
    private _cache = new Map<string, { metrics: TextMetrics; tick: number }>();

    public constructor(size = 50) {
        this._maxSize = size;
    }

    public reset(): void {
        this._actualSize = 0;
        this._cache.clear();
        this._usageTick = 1;
        this._oldestTick = 1;
        this._tick2Labels.clear();
    }

    public measureText(ctx: CanvasCtxLike, text: string, optimizationReplacementRe?: RegExp): number {
        return this._getMetrics(ctx, text, optimizationReplacementRe).width;
    }

    public yMidCorrection(ctx: CanvasCtxLike, text: string, optimizationReplacementRe?: RegExp): number {
        const metrics = this._getMetrics(ctx, text, optimizationReplacementRe);
        // jsdom's measureText returns only `width`, so the two bounding-box
        // metrics can genuinely be missing even though the type says otherwise
        const ascent: number | undefined = metrics.actualBoundingBoxAscent;
        const descent: number | undefined = metrics.actualBoundingBoxDescent;

        return ((ascent ?? 0) - (descent ?? 0)) / 2;
    }

    private _getMetrics(ctx: CanvasCtxLike, text: string, optimizationReplacementRe?: RegExp): TextMetrics {
        const re = optimizationReplacementRe ?? defaultReplacementRe;
        const cacheString = String(text).replace(re, '0');

        if (this._cache.has(cacheString)) {
            return getDefined(this._cache.get(cacheString)).metrics;
        }

        if (this._actualSize === this._maxSize) {
            const oldestValue = this._tick2Labels.get(this._oldestTick);
            this._tick2Labels.delete(this._oldestTick);
            if (oldestValue !== undefined) {
                this._cache.delete(oldestValue);
            }
            this._oldestTick++;
            this._actualSize--;
        }

        ctx.save();
        ctx.textBaseline = 'middle';
        const metrics = ctx.measureText(cacheString);
        ctx.restore();

        if (metrics.width === 0 && text.length > 0) {
            // measureText can return 0 in FF depending on a canvas size, don't cache it
            return metrics;
        }

        this._cache.set(cacheString, { metrics: metrics, tick: this._usageTick });
        this._tick2Labels.set(this._usageTick, cacheString);
        this._actualSize++;
        this._usageTick++;
        return metrics;
    }
}
