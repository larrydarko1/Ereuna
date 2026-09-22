/**
 * What the panes require of anything they draw, as a type.
 *
 * Split from `data-source.ts` so the widgets can depend on the shape without
 * depending on the base class.
 */
import { type Pane } from '@/lib/charting/engine/model/chart/pane';
import { type Coordinate } from '@/lib/charting/engine/model/coordinate';
import { type PriceScale } from '@/lib/charting/engine/model/price/price-scale';
import {
    type PrimitiveHoveredItem,
    type SeriesPrimitivePaneViewZOrder,
} from '@/lib/charting/engine/model/series/iseries-primitive';
import { type IAxisView } from '@/lib/charting/engine/views/pane/iaxis-view';
import { type IPaneView } from '@/lib/charting/engine/views/pane/ipane-view';
import { type IPriceAxisView } from '@/lib/charting/engine/views/price-axis/iprice-axis-view';
import { type ITimeAxisView } from '@/lib/charting/engine/views/time-axis/itime-axis-view';

export type ZOrdered = {
    zorder(): number | null;
};
/**
 * Prefix meanings:
 * - bottom: Pane views that are painted at the bottom (above background color, below grid lines)
 * - top: Pane views that are painted on the most top layer and ABOVE the crosshair
 */
type IPluginPaneViews = {
    bottomPaneViews?(pane: Pane): readonly IPaneView[];
    pricePaneViews?(zOrder: SeriesPrimitivePaneViewZOrder): readonly IAxisView[];
    timePaneViews?(zOrder: SeriesPrimitivePaneViewZOrder): readonly IAxisView[];
    primitiveHitTest?(x: Coordinate, y: Coordinate): PrimitiveHoveredItem[];
};

type IDataSourcePaneViews = {
    paneViews(pane: Pane): readonly IPaneView[];
    labelPaneViews(pane?: Pane): readonly IPaneView[];

    /**
     * Pane views that are painted on the most top layer
     */
    topPaneViews?(pane: Pane): readonly IPaneView[];
} & IPluginPaneViews;

export type IDataSource = {
    setZorder(value: number): void;
    priceScale(): PriceScale | null;
    setPriceScale(scale: PriceScale | null): void;

    updateAllViews(): void;

    priceAxisViews(pane?: Pane, priceScale?: PriceScale): readonly IPriceAxisView[];
    paneViews(pane: Pane): readonly IPaneView[];
    labelPaneViews(pane?: Pane): readonly IPaneView[];

    /**
     * Pane views that are painted on the most top layer
     */
    topPaneViews?(pane: Pane): readonly IPaneView[];
    timeAxisViews(): readonly ITimeAxisView[];

    visible(): boolean;

    destroy?(): void;
} & IDataSourcePaneViews &
    ZOrdered;
