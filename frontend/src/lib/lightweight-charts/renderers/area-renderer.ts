/**
 * The area series' fill.
 */
import { type BitmapCoordinatesRenderingScope } from 'fancy-canvas';

import { type Coordinate } from '@/lib/lightweight-charts/model/coordinate';
import { type AreaFillColorerStyle } from '@/lib/lightweight-charts/model/series-bar-colorer';

import {
    type AreaFillItemBase,
    PaneRendererAreaBase,
    type PaneRendererAreaDataBase,
} from '@/lib/lightweight-charts/renderers/area-renderer-base';
import { GradientStyleCache } from '@/lib/lightweight-charts/renderers/gradient-style-cache';

export type AreaFillItem = AreaFillItemBase & AreaFillColorerStyle;
export type PaneRendererAreaData = {} & PaneRendererAreaDataBase<AreaFillItem>;

export class PaneRendererArea extends PaneRendererAreaBase<PaneRendererAreaData> {
    private readonly _fillCache: GradientStyleCache = new GradientStyleCache();

    protected override _fillStyle(
        renderingScope: BitmapCoordinatesRenderingScope,
        item: AreaFillItem,
    ): CanvasRenderingContext2D['fillStyle'] {
        return this._fillCache.get(renderingScope, {
            topColor1: item.topColor,
            topColor2: '',
            bottomColor1: '',
            bottomColor2: item.bottomColor,
            bottom: renderingScope.bitmapSize.height as Coordinate,
        });
    }
}
