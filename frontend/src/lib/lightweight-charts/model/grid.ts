import { type LineStyle } from '@/lib/lightweight-charts/renderers/draw-line';
import { GridPaneView } from '@/lib/lightweight-charts/views/pane/grid-pane-view';
import { type IUpdatablePaneView } from '@/lib/lightweight-charts/views/pane/iupdatable-pane-view';

import { type Pane } from '@/lib/lightweight-charts/model/pane';

/** Grid line options. */
export interface GridLineOptions {
    /**
     * Line color.
     *
     * @defaultValue `'#D6DCDE'`
     */
    color: string;

    /**
     * Line style.
     *
     * @defaultValue {@link LineStyle.Solid}
     */
    style: LineStyle;

    /**
     * Display the lines.
     *
     * @defaultValue `true`
     */
    visible: boolean;
}

/** Structure describing grid options. */
export interface GridOptions {
    /**
     * Vertical grid line options.
     */
    vertLines: GridLineOptions;

    /**
     * Horizontal grid line options.
     */
    horzLines: GridLineOptions;
}

export class Grid {
    private _paneView: GridPaneView;

    public constructor(pane: Pane) {
        this._paneView = new GridPaneView(pane);
    }

    public paneView(): IUpdatablePaneView {
        return this._paneView;
    }
}
