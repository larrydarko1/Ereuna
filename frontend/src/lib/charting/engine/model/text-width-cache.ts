/**
 * Caches text measurements.
 *
 * `measureText` forces a layout, and the axes measure the same handful of labels
 * on every frame, so the cache is what keeps an idle chart from doing work.
 */
import { getDefined } from '@/lib/charting/engine/helpers/assertions';

type CanvasCtxLike = Pick<CanvasRenderingContext2D, 'measureText' | 'save' | 'restore' | 'textBaseline'>;

// jsdom's measureText returns only `width`, so the two bounding-box metrics can
// genuinely be missing even though the DOM's own type says otherwise
type MeasuredText = Pick<TextMetrics, 'width'> &
    Partial<Pick<TextMetrics, 'actualBoundingBoxAscent' | 'actualBoundingBoxDescent'>>;

const defaultReplacementRe = /[2-9]/g;

export class TextWidthCache {
    private readonly _maxSize: number;
    private _actualSize = 0;
    private _usageTick = 1;
    private _oldestTick = 1;
    // A Map rather than an object, so that evicting the oldest tick is a delete
    // by key instead of a dynamic property delete
    private readonly _tick2Labels = new Map<number, string>();
    private readonly _cache = new Map<string, { metrics: MeasuredText; tick: number }>();

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
        const { actualBoundingBoxAscent: ascent = 0, actualBoundingBoxDescent: descent = 0 } = this._getMetrics(
            ctx,
            text,
            optimizationReplacementRe,
        );

        return (ascent - descent) / 2;
    }

    private _getMetrics(ctx: CanvasCtxLike, text: string, optimizationReplacementRe?: RegExp): MeasuredText {
        const re = optimizationReplacementRe ?? defaultReplacementRe;
        const cacheString = text.replace(re, '0');

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
        const metrics: MeasuredText = ctx.measureText(cacheString);
        ctx.restore();

        if (metrics.width === 0 && text.length > 0) {
            // measureText can return 0 in FF depending on a canvas size, don't cache it
            return metrics;
        }

        this._cache.set(cacheString, { metrics, tick: this._usageTick });
        this._tick2Labels.set(this._usageTick, cacheString);
        this._actualSize++;
        this._usageTick++;
        return metrics;
    }
}
