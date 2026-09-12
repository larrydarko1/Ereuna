import { CrosshairMode, type CrosshairOptions } from '@/lib/lightweight-charts/model/crosshair';
import { LineStyle } from '@/lib/lightweight-charts/renderers/draw-line';

export const crosshairOptionsDefaults: CrosshairOptions = {
    vertLine: {
        color: '#9598A1',
        width: 1,
        style: LineStyle.LargeDashed,
        visible: true,
        labelVisible: true,
        labelBackgroundColor: '#131722',
    },
    horzLine: {
        color: '#9598A1',
        width: 1,
        style: LineStyle.LargeDashed,
        visible: true,
        labelVisible: true,
        labelBackgroundColor: '#131722',
    },
    mode: CrosshairMode.Magnet,
};
