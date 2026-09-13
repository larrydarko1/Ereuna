/**
 * The grid, as drawn on a pane.
 */
import { type Pane } from '@/lib/charting/engine/model/chart/pane';
import { type TimeMark } from '@/lib/charting/engine/model/time/time-scale';
import { GridRenderer, type GridRendererData } from '@/lib/charting/engine/renderers/grid-renderer';
import { type IPaneRenderer } from '@/lib/charting/engine/renderers/ipane-renderer';

import { type IUpdatablePaneView } from '@/lib/charting/engine/views/pane/iupdatable-pane-view';

export class GridPaneView implements IUpdatablePaneView {
    private readonly _pane: Pane;
    private readonly _renderer: GridRenderer = new GridRenderer();
    private _invalidated = true;

    public constructor(pane: Pane) {
        this._pane = pane;
    }

    public update(): void {
        this._invalidated = true;
    }

    public renderer(): IPaneRenderer | null {
        if (this._invalidated) {
            const gridOptions = this._pane.model().options().grid;

            const data: GridRendererData = {
                horzLinesVisible: gridOptions.horzLines.visible,
                vertLinesVisible: gridOptions.vertLines.visible,
                horzLinesColor: gridOptions.horzLines.color,
                vertLinesColor: gridOptions.vertLines.color,
                horzLineStyle: gridOptions.horzLines.style,
                vertLineStyle: gridOptions.vertLines.style,
                priceMarks: this._pane.defaultPriceScale().marks(),
                // need this conversiom because TimeMark is a part of external interface
                // and fields inside TimeMark are not minified
                timeMarks: (this._pane.model().timeScale().marks() ?? []).map((tm: TimeMark) => {
                    return { coord: tm.coord };
                }),
            };

            this._renderer.setData(data);
            this._invalidated = false;
        }

        return this._renderer;
    }
}
