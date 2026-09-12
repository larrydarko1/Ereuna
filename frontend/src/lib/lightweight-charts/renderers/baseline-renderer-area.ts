import { type BitmapCoordinatesRenderingScope } from 'fancy-canvas';

import { getNotNull } from '@/lib/lightweight-charts/helpers/assertions';

import { type Coordinate } from '@/lib/lightweight-charts/model/coordinate';
import { type BaselineFillColorerStyle } from '@/lib/lightweight-charts/model/series-bar-colorer';

import {
    type AreaFillItemBase,
    PaneRendererAreaBase,
    type PaneRendererAreaDataBase,
} from '@/lib/lightweight-charts/renderers/area-renderer-base';
import { GradientStyleCache } from '@/lib/lightweight-charts/renderers/gradient-style-cache';

export type BaselineFillItem = AreaFillItemBase & BaselineFillColorerStyle;
export type PaneRendererBaselineData = {} & PaneRendererAreaDataBase<BaselineFillItem>;
export class PaneRendererBaselineArea extends PaneRendererAreaBase<PaneRendererBaselineData> {
    private readonly _fillCache: GradientStyleCache = new GradientStyleCache();

    protected override _fillStyle(
        renderingScope: BitmapCoordinatesRenderingScope,
        item: BaselineFillItem,
    ): CanvasRenderingContext2D['fillStyle'] {
        // _fillStyle/_strokeStyle only run from inside _drawImpl, which has
        // already bailed when there is no data
        const data = getNotNull(this._data);

        return this._fillCache.get(renderingScope, {
            topColor1: item.topFillColor1,
            topColor2: item.topFillColor2,
            bottomColor1: item.bottomFillColor1,
            bottomColor2: item.bottomFillColor2,
            bottom: renderingScope.bitmapSize.height as Coordinate,
            baseLevelCoordinate: data.baseLevelCoordinate,
        });
    }
}
