/**
 * Defaults for a price line added to a series.
 */
import { type PriceLineOptions } from '@/lib/charting/engine/model/price/price-line-options';
import { LineStyle } from '@/lib/charting/engine/renderers/draw-line';

export const priceLineOptionsDefaults: PriceLineOptions = {
    color: '#FF0000',
    price: 0,
    lineStyle: LineStyle.Dashed,
    lineWidth: 1,
    lineVisible: true,
    axisLabelVisible: true,
    title: '',
    axisLabelColor: '',
    axisLabelTextColor: '',
};
