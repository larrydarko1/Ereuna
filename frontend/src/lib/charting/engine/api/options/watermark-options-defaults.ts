/**
 * Watermark defaults — invisible, since nothing here draws one unless it is
 * asked to.
 */
import { defaultFontFamily } from '@/lib/charting/engine/helpers/make-font';

import { type WatermarkOptions } from '@/lib/charting/engine/model/chart/watermark';

export const watermarkOptionsDefaults: WatermarkOptions = {
    color: 'rgba(0, 0, 0, 0)',
    visible: false,
    fontSize: 48,
    fontFamily: defaultFontFamily,
    fontStyle: '',
    text: '',
    horzAlign: 'center',
    vertAlign: 'center',
};
