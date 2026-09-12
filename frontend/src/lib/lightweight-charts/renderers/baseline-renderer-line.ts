import { type BitmapCoordinatesRenderingScope } from 'fancy-canvas';

import { type Coordinate } from '@/lib/lightweight-charts/model/coordinate';
import { type BaselineStrokeColorerStyle } from '@/lib/lightweight-charts/model/series-bar-colorer';

import { GradientStyleCache } from '@/lib/lightweight-charts/renderers/gradient-style-cache';
import {
    type LineItemBase as LineStrokeItemBase,
    PaneRendererLineBase,
    type PaneRendererLineDataBase,
} from '@/lib/lightweight-charts/renderers/line-renderer-base';

export type BaselineStrokeItem = LineStrokeItemBase & BaselineStrokeColorerStyle;
export type PaneRendererBaselineLineData = {
    baseLevelCoordinate: Coordinate;
} & PaneRendererLineDataBase<BaselineStrokeItem>

export class PaneRendererBaselineLine extends PaneRendererLineBase<PaneRendererBaselineLineData> {
    private readonly _strokeCache: GradientStyleCache = new GradientStyleCache();

    protected override _strokeStyle(
        renderingScope: BitmapCoordinatesRenderingScope,
        item: BaselineStrokeItem,
    ): CanvasRenderingContext2D['strokeStyle'] {
        const data = this._data!;

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
