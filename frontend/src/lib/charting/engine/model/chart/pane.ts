/**
 * One pane: the sources drawn on it, its two price scales and any overlays,
 * and how much vertical room it takes relative to its siblings.
 */
import { assert, getDefined, getNotNull } from '@/lib/charting/engine/helpers/assertions';
import { Delegate } from '@/lib/charting/engine/helpers/delegate';
import { type IDestroyable } from '@/lib/charting/engine/helpers/idestroyable';
import { type ISubscription } from '@/lib/charting/engine/helpers/isubscription';
import { clone, type DeepPartial } from '@/lib/charting/engine/helpers/strict-type-checks';
import {
    type ChartOptionsBase,
    type IChartModelBase,
    type OverlayPriceScaleOptions,
    type VisiblePriceScaleOptions,
} from '@/lib/charting/engine/model/chart/chart-model';
import { DefaultPriceScaleId, isDefaultPriceScale } from '@/lib/charting/engine/model/price/default-price-scale';
import { Grid } from '@/lib/charting/engine/model/chart/grid';
import { type IPriceDataSource } from '@/lib/charting/engine/model/price/iprice-data-source';
import {
    PriceScale,
    type PriceScaleOptions,
    type PriceScaleState,
} from '@/lib/charting/engine/model/price/price-scale';
import { sortSources } from '@/lib/charting/engine/model/chart/sort-sources';
import { type ITimeScale } from '@/lib/charting/engine/model/time/time-scale';

export type PriceScalePosition = 'left' | 'right' | 'overlay';

type MinMaxOrderInfo = {
    minZOrder: number;
    maxZOrder: number;
};

export const DEFAULT_STRETCH_FACTOR = 1000;

export class Pane implements IDestroyable {
    private readonly _timeScale: ITimeScale;
    private readonly _model: IChartModelBase;
    private readonly _grid: Grid;

    private _dataSources: IPriceDataSource[] = [];
    private _overlaySourcesByScaleId = new Map<string, IPriceDataSource[]>();

    private _height = 0;
    private _width = 0;
    private _stretchFactor: number = DEFAULT_STRETCH_FACTOR;
    private _cachedOrderedSources: readonly IPriceDataSource[] | null = null;

    private _destroyed: Delegate = new Delegate();

    private _leftPriceScale: PriceScale;
    private _rightPriceScale: PriceScale;

    public constructor(timeScale: ITimeScale, model: IChartModelBase) {
        this._timeScale = timeScale;
        this._model = model;
        this._grid = new Grid(this);

        const options = model.options();

        this._leftPriceScale = this._createPriceScale(DefaultPriceScaleId.Left, options.leftPriceScale);
        this._rightPriceScale = this._createPriceScale(DefaultPriceScaleId.Right, options.rightPriceScale);

        this._leftPriceScale
            .modeChanged()
            .subscribe(this._onPriceScaleModeChanged.bind(this, this._leftPriceScale), { linkedObject: this });
        this._rightPriceScale
            .modeChanged()
            .subscribe(this._onPriceScaleModeChanged.bind(this, this._rightPriceScale), { linkedObject: this });

        this.applyScaleOptions(options);
    }

    public applyScaleOptions(options: DeepPartial<ChartOptionsBase>): void {
        if (options.leftPriceScale !== undefined) {
            this._leftPriceScale.applyOptions(options.leftPriceScale);
        }
        if (options.rightPriceScale !== undefined) {
            this._rightPriceScale.applyOptions(options.rightPriceScale);
        }
        if (options.localization !== undefined) {
            this._leftPriceScale.updateFormatter();
            this._rightPriceScale.updateFormatter();
        }
        if (options.overlayPriceScales !== undefined) {
            const sourceArrays = Array.from(this._overlaySourcesByScaleId.values());
            for (const sources of sourceArrays) {
                const priceScale = getNotNull(getDefined(sources[0]).priceScale());
                priceScale.applyOptions(options.overlayPriceScales);
                if (options.localization !== undefined) {
                    priceScale.updateFormatter();
                }
            }
        }
    }

    public priceScaleById(id: string): PriceScale | null {
        switch (id) {
            case DefaultPriceScaleId.Left: {
                return this._leftPriceScale;
            }
            case DefaultPriceScaleId.Right: {
                return this._rightPriceScale;
            }
        }
        if (this._overlaySourcesByScaleId.has(id)) {
            return getDefined(getDefined(this._overlaySourcesByScaleId.get(id))[0]).priceScale();
        }
        return null;
    }

    public destroy(): void {
        this.model().priceScalesOptionsChanged().unsubscribeAll(this);

        this._leftPriceScale.modeChanged().unsubscribeAll(this);
        this._rightPriceScale.modeChanged().unsubscribeAll(this);

        this._dataSources.forEach((source: IPriceDataSource) => {
            source.destroy?.();
        });
        this._destroyed.fire();
    }

    public stretchFactor(): number {
        return this._stretchFactor;
    }

    public setStretchFactor(factor: number): void {
        this._stretchFactor = factor;
    }

    public model(): IChartModelBase {
        return this._model;
    }

    public width(): number {
        return this._width;
    }

    public height(): number {
        return this._height;
    }

    public setWidth(width: number): void {
        this._width = width;
        this.updateAllSources();
    }

    public setHeight(height: number): void {
        this._height = height;

        this._leftPriceScale.setHeight(height);
        this._rightPriceScale.setHeight(height);

        // process overlays
        this._dataSources.forEach((ds: IPriceDataSource) => {
            if (this.isOverlay(ds)) {
                const priceScale = ds.priceScale();
                if (priceScale !== null) {
                    priceScale.setHeight(height);
                }
            }
        });

        this.updateAllSources();
    }

    public dataSources(): readonly IPriceDataSource[] {
        return this._dataSources;
    }

    public isOverlay(source: IPriceDataSource): boolean {
        const priceScale = source.priceScale();
        if (priceScale === null) {
            return true;
        }
        return this._leftPriceScale !== priceScale && this._rightPriceScale !== priceScale;
    }

    public addDataSource(source: IPriceDataSource, targetScaleId: string, zOrder?: number): void {
        const targetZOrder = zOrder !== undefined ? zOrder : this._getZOrderMinMax().maxZOrder + 1;
        this._insertDataSource(source, targetScaleId, targetZOrder);
    }

    public removeDataSource(source: IPriceDataSource): void {
        const index = this._dataSources.indexOf(source);
        assert(index !== -1, 'removeDataSource: invalid data source');

        this._dataSources.splice(index, 1);

        const priceScaleId = getNotNull(source.priceScale()).id();
        if (this._overlaySourcesByScaleId.has(priceScaleId)) {
            const overlaySources = getDefined(this._overlaySourcesByScaleId.get(priceScaleId));
            const overlayIndex = overlaySources.indexOf(source);
            if (overlayIndex !== -1) {
                overlaySources.splice(overlayIndex, 1);
                if (overlaySources.length === 0) {
                    this._overlaySourcesByScaleId.delete(priceScaleId);
                }
            }
        }

        const priceScale = source.priceScale();
        // if source has owner, it returns owner's price scale
        // and it does not have source in their list
        if (priceScale !== null && priceScale.dataSources().indexOf(source) >= 0) {
            priceScale.removeDataSource(source);
        }

        if (priceScale !== null) {
            priceScale.invalidateSourcesCache();
            this.recalculatePriceScale(priceScale);
        }

        this._cachedOrderedSources = null;
    }

    public priceScalePosition(priceScale: PriceScale): PriceScalePosition {
        if (priceScale === this._leftPriceScale) {
            return 'left';
        }
        if (priceScale === this._rightPriceScale) {
            return 'right';
        }

        return 'overlay';
    }

    public leftPriceScale(): PriceScale {
        return this._leftPriceScale;
    }

    public rightPriceScale(): PriceScale {
        return this._rightPriceScale;
    }

    public startScalePrice(priceScale: PriceScale, x: number): void {
        priceScale.startScale(x);
    }

    public scalePriceTo(priceScale: PriceScale, x: number): void {
        priceScale.scaleTo(x);

        // Upstream note: this could update only the views the scale affects
        this.updateAllSources();
    }

    public endScalePrice(priceScale: PriceScale): void {
        priceScale.endScale();
    }

    public startScrollPrice(priceScale: PriceScale, x: number): void {
        priceScale.startScroll(x);
    }

    public scrollPriceTo(priceScale: PriceScale, x: number): void {
        priceScale.scrollTo(x);
        this.updateAllSources();
    }

    public endScrollPrice(priceScale: PriceScale): void {
        priceScale.endScroll();
    }

    public updateAllSources(): void {
        this._dataSources.forEach((source: IPriceDataSource) => {
            source.updateAllViews();
        });
    }

    public defaultPriceScale(): PriceScale {
        let priceScale: PriceScale | null;

        if (this._model.options().rightPriceScale.visible && this._rightPriceScale.dataSources().length !== 0) {
            priceScale = this._rightPriceScale;
        } else if (this._model.options().leftPriceScale.visible && this._leftPriceScale.dataSources().length !== 0) {
            priceScale = this._leftPriceScale;
        } else {
            priceScale = this._dataSources[0]?.priceScale() ?? null;
        }

        // With no visible scale and no sources, the right one still has to be
        // the answer: every pane has a default scale
        return priceScale ?? this._rightPriceScale;
    }

    public defaultVisiblePriceScale(): PriceScale | null {
        let priceScale: PriceScale | null = null;

        if (this._model.options().rightPriceScale.visible) {
            priceScale = this._rightPriceScale;
        } else if (this._model.options().leftPriceScale.visible) {
            priceScale = this._leftPriceScale;
        }
        return priceScale;
    }

    public recalculatePriceScale(priceScale: PriceScale | null): void {
        if (priceScale === null || !priceScale.isAutoScale()) {
            return;
        }

        this._recalculatePriceScaleImpl(priceScale);
    }

    public resetPriceScale(priceScale: PriceScale): void {
        const visibleBars = this._timeScale.visibleStrictRange();
        priceScale.setMode({ autoScale: true });
        if (visibleBars !== null) {
            priceScale.recalculatePriceRange(visibleBars);
        }
        this.updateAllSources();
    }

    public momentaryAutoScale(): void {
        this._recalculatePriceScaleImpl(this._leftPriceScale);
        this._recalculatePriceScaleImpl(this._rightPriceScale);
    }

    public recalculate(): void {
        this.recalculatePriceScale(this._leftPriceScale);
        this.recalculatePriceScale(this._rightPriceScale);

        this._dataSources.forEach((ds: IPriceDataSource) => {
            if (this.isOverlay(ds)) {
                this.recalculatePriceScale(ds.priceScale());
            }
        });

        this.updateAllSources();
        this._model.lightUpdate();
    }

    public orderedSources(): readonly IPriceDataSource[] {
        if (this._cachedOrderedSources === null) {
            this._cachedOrderedSources = sortSources<IPriceDataSource>(this._dataSources);
        }

        return this._cachedOrderedSources;
    }

    public onDestroyed(): ISubscription {
        return this._destroyed;
    }

    public grid(): Grid {
        return this._grid;
    }

    private _recalculatePriceScaleImpl(priceScale: PriceScale): void {
        const sourceForAutoScale = priceScale.sourcesForAutoScale();

        if (sourceForAutoScale.length > 0 && !this._timeScale.isEmpty()) {
            const visibleBars = this._timeScale.visibleStrictRange();
            if (visibleBars !== null) {
                priceScale.recalculatePriceRange(visibleBars);
            }
        }

        priceScale.updateAllViews();
    }

    private _getZOrderMinMax(): MinMaxOrderInfo {
        const sources = this.orderedSources();
        if (sources.length === 0) {
            return { minZOrder: 0, maxZOrder: 0 };
        }

        let minZOrder = 0;
        let maxZOrder = 0;
        for (const ds of sources) {
            const zOrder = ds.zorder();
            if (zOrder !== null) {
                if (zOrder < minZOrder) {
                    minZOrder = zOrder;
                }

                if (zOrder > maxZOrder) {
                    maxZOrder = zOrder;
                }
            }
        }

        return { minZOrder: minZOrder, maxZOrder: maxZOrder };
    }

    private _insertDataSource(source: IPriceDataSource, priceScaleId: string, zOrder: number): void {
        let priceScale = this.priceScaleById(priceScaleId);

        if (priceScale === null) {
            priceScale = this._createPriceScale(priceScaleId, this._model.options().overlayPriceScales);
        }

        this._dataSources.push(source);
        if (!isDefaultPriceScale(priceScaleId)) {
            const overlaySources = this._overlaySourcesByScaleId.get(priceScaleId) ?? [];
            overlaySources.push(source);
            this._overlaySourcesByScaleId.set(priceScaleId, overlaySources);
        }

        priceScale.addDataSource(source);
        source.setPriceScale(priceScale);

        source.setZorder(zOrder);

        this.recalculatePriceScale(priceScale);

        this._cachedOrderedSources = null;
    }

    private _onPriceScaleModeChanged(priceScale: PriceScale, oldMode: PriceScaleState, newMode: PriceScaleState): void {
        if (oldMode.mode === newMode.mode) {
            return;
        }

        // momentary auto scale if we toggle percentage/indexedTo100 mode
        this._recalculatePriceScaleImpl(priceScale);
    }

    private _createPriceScale(id: string, options: OverlayPriceScaleOptions | VisiblePriceScaleOptions): PriceScale {
        const actualOptions: PriceScaleOptions = { visible: true, autoScale: true, ...clone(options) };
        const priceScale = new PriceScale(
            id,
            actualOptions,
            this._model.options().layout,
            this._model.options().localization,
        );
        priceScale.setHeight(this.height());
        return priceScale;
    }
}
