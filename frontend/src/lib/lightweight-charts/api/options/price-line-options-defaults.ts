import { type PriceLineOptions } from '@/lib/lightweight-charts/model/price-line-options';
import { LineStyle } from '@/lib/lightweight-charts/renderers/draw-line';

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
