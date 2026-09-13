/**
 * Price scale defaults, used for the left scale, the right one and any
 * overlay.
 */
import { PriceScaleMode, type PriceScaleOptions } from '@/lib/charting/engine/model/price/price-scale';

export const priceScaleOptionsDefaults: PriceScaleOptions = {
    autoScale: true,
    mode: PriceScaleMode.Normal,
    invertScale: false,
    alignLabels: true,
    borderVisible: true,
    borderColor: '#2B2B43',
    entireTextOnly: false,
    visible: false,
    ticksVisible: false,
    scaleMargins: {
        bottom: 0.1,
        top: 0.2,
    },
    minimumWidth: 0,
};
