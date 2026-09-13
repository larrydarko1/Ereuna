/**
 * Layout defaults. The colours here are placeholders — the chart is rebuilt
 * with the app's theme tokens on every theme change.
 */
import { defaultFontFamily } from '@/lib/lightweight-charts/helpers/make-font';

import { ColorType, type LayoutOptions } from '@/lib/lightweight-charts/model/layout-options';

export const layoutOptionsDefaults: LayoutOptions = {
    background: {
        type: ColorType.Solid,
        color: '#FFFFFF',
    },
    textColor: '#191919',
    fontSize: 12,
    fontFamily: defaultFontFamily,
};
