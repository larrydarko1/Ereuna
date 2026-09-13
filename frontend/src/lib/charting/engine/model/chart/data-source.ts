/**
 * The base every drawable thing on a pane extends: its z-order, its price
 * scale, and the views it offers to be drawn with.
 */
import { type IPaneView } from '@/lib/charting/engine/views/pane/ipane-view';
import { type IPriceAxisView } from '@/lib/charting/engine/views/price-axis/iprice-axis-view';
import { type ITimeAxisView } from '@/lib/charting/engine/views/time-axis/itime-axis-view';

import { type IDataSource } from '@/lib/charting/engine/model/chart/idata-source';
import { type Pane } from '@/lib/charting/engine/model/chart/pane';
import { type PriceScale } from '@/lib/charting/engine/model/price/price-scale';

export abstract class DataSource implements IDataSource {
    protected _priceScale: PriceScale | null = null;

    private _zorder = 0;

    public zorder(): number {
        return this._zorder;
    }

    public setZorder(zorder: number): void {
        this._zorder = zorder;
    }

    public priceScale(): PriceScale | null {
        return this._priceScale;
    }

    public setPriceScale(priceScale: PriceScale | null): void {
        this._priceScale = priceScale;
    }

    public abstract priceAxisViews(pane?: Pane, priceScale?: PriceScale): readonly IPriceAxisView[];
    public abstract paneViews(pane?: Pane): readonly IPaneView[];

    public labelPaneViews(_pane?: Pane): readonly IPaneView[] {
        return [];
    }

    public timeAxisViews(): readonly ITimeAxisView[] {
        return [];
    }

    public visible(): boolean {
        return true;
    }

    public abstract updateAllViews(): void;
}
