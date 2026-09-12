import { type IPaneView } from '@/lib/lightweight-charts/views/pane/ipane-view';
import { type IPriceAxisView } from '@/lib/lightweight-charts/views/price-axis/iprice-axis-view';
import { type ITimeAxisView } from '@/lib/lightweight-charts/views/time-axis/itime-axis-view';

import { type IDataSource } from '@/lib/lightweight-charts/model/idata-source';
import { type Pane } from '@/lib/lightweight-charts/model/pane';
import { type PriceScale } from '@/lib/lightweight-charts/model/price-scale';

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
