import { type GridOptions } from '@/lib/lightweight-charts/model/grid';
import { LineStyle } from '@/lib/lightweight-charts/renderers/draw-line';

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
