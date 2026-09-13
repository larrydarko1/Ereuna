/**
 * The grid lines behind a pane's content.
 */
import { type LineStyle } from '@/lib/charting/engine/renderers/draw-line';
import { GridPaneView } from '@/lib/charting/engine/views/pane/grid-pane-view';
import { type IUpdatablePaneView } from '@/lib/charting/engine/views/pane/iupdatable-pane-view';

import { type Pane } from '@/lib/charting/engine/model/chart/pane';

/** Grid line options. */
type GridLineOptions = {
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
};

/** Structure describing grid options. */
export type GridOptions = {
    /**
     * Vertical grid line options.
     */
    vertLines: GridLineOptions;

    /**
     * Horizontal grid line options.
     */
    horzLines: GridLineOptions;
};

export class Grid {
    private _paneView: GridPaneView;

    public constructor(pane: Pane) {
        this._paneView = new GridPaneView(pane);
    }

    public paneView(): IUpdatablePaneView {
        return this._paneView;
    }
}
