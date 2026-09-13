/**
 * Grid defaults for both axes.
 */
import { type GridOptions } from '@/lib/charting/engine/model/chart/grid';
import { LineStyle } from '@/lib/charting/engine/renderers/draw-line';

export const gridOptionsDefaults: GridOptions = {
    vertLines: {
        color: '#D6DCDE',
        style: LineStyle.Solid,
        visible: true,
    },
    horzLines: {
        color: '#D6DCDE',
        style: LineStyle.Solid,
        visible: true,
    },
};
