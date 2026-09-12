import { defaultFontFamily } from '@/lib/lightweight-charts/helpers/make-font';

import { type WatermarkOptions } from '@/lib/lightweight-charts/model/watermark';

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
