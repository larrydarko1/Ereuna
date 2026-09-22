/**
 * The line series' stroke.
 */
import { type MediaCoordinatesRenderingScope } from 'fancy-canvas';

import { type LineStrokeColorerStyle } from '@/lib/charting/engine/model/series/series-bar-colorer';
import {
    type LineItemBase,
    PaneRendererLineBase,
    type PaneRendererLineDataBase,
} from '@/lib/charting/engine/renderers/line-renderer-base';

export type LineStrokeItem = LineItemBase & LineStrokeColorerStyle;
export type PaneRendererLineData = {} & PaneRendererLineDataBase<LineStrokeItem>;

export class PaneRendererLine extends PaneRendererLineBase<PaneRendererLineData> {
    protected override _strokeStyle(
        _renderingScope: MediaCoordinatesRenderingScope,
        item: LineStrokeItem,
    ): CanvasRenderingContext2D['strokeStyle'] {
        return item.lineColor;
    }
}
