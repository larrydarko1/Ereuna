/**
 * The baseline series' line, which changes colour where it crosses the base
 * value.
 */
import { type BitmapCoordinatesRenderingScope } from 'fancy-canvas';

import { getNotNull } from '@/lib/charting/engine/helpers/assertions';
import { type Coordinate } from '@/lib/charting/engine/model/coordinate';
import { type BaselineStrokeColorerStyle } from '@/lib/charting/engine/model/series/series-bar-colorer';
import { GradientStyleCache } from '@/lib/charting/engine/renderers/gradient-style-cache';
import {
    type LineItemBase as LineStrokeItemBase,
    PaneRendererLineBase,
    type PaneRendererLineDataBase,
} from '@/lib/charting/engine/renderers/line-renderer-base';

export type BaselineStrokeItem = LineStrokeItemBase & BaselineStrokeColorerStyle;
export type PaneRendererBaselineLineData = {
    baseLevelCoordinate: Coordinate;
} & PaneRendererLineDataBase<BaselineStrokeItem>;

export class PaneRendererBaselineLine extends PaneRendererLineBase<PaneRendererBaselineLineData> {
    private readonly _strokeCache: GradientStyleCache = new GradientStyleCache();

    protected override _strokeStyle(
        renderingScope: BitmapCoordinatesRenderingScope,
        item: BaselineStrokeItem,
    ): CanvasRenderingContext2D['strokeStyle'] {
        // _fillStyle/_strokeStyle only run from inside _drawImpl, which has
        // already bailed when there is no data
        const data = getNotNull(this._data);

        return this._strokeCache.get(renderingScope, {
            topColor1: item.topLineColor,
            topColor2: item.topLineColor,
            bottomColor1: item.bottomLineColor,
            bottomColor2: item.bottomLineColor,
            bottom: renderingScope.bitmapSize.height as Coordinate,
            baseLevelCoordinate: data.baseLevelCoordinate,
        });
    }
}
