/**
 * What the panes require of anything they draw, as a type.
 *
 * Split from `data-source.ts` so the widgets can depend on the shape without
 * depending on the base class.
 */
import { type IAxisView } from '@/lib/lightweight-charts/views/pane/iaxis-view';
import { type IPaneView } from '@/lib/lightweight-charts/views/pane/ipane-view';
import { type IPriceAxisView } from '@/lib/lightweight-charts/views/price-axis/iprice-axis-view';
import { type ITimeAxisView } from '@/lib/lightweight-charts/views/time-axis/itime-axis-view';

import { type Coordinate } from '@/lib/lightweight-charts/model/coordinate';
import {
    type PrimitiveHoveredItem,
    type SeriesPrimitivePaneViewZOrder,
} from '@/lib/lightweight-charts/model/iseries-primitive';
import { type Pane } from '@/lib/lightweight-charts/model/pane';
import { type PriceScale } from '@/lib/lightweight-charts/model/price-scale';

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
