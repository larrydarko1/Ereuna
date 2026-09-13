/**
 * The baseline series' two fills, above and below its base value.
 */
import { type BitmapCoordinatesRenderingScope } from 'fancy-canvas';

import { getNotNull } from '@/lib/charting/engine/helpers/assertions';

import { type Coordinate } from '@/lib/charting/engine/model/coordinate';
import { type BaselineFillColorerStyle } from '@/lib/charting/engine/model/series/series-bar-colorer';

import {
    type AreaFillItemBase,
    PaneRendererAreaBase,
    type PaneRendererAreaDataBase,
} from '@/lib/charting/engine/renderers/area-renderer-base';
import { GradientStyleCache } from '@/lib/charting/engine/renderers/gradient-style-cache';

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
