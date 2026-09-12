import { isRunningOnClientSide } from '@/lib/lightweight-charts/helpers/is-running-on-client-side';

import { type ChartOptionsInternal, TrackingModeExitMode } from '@/lib/lightweight-charts/model/chart-model';

import { crosshairOptionsDefaults } from '@/lib/lightweight-charts/api/options/crosshair-options-defaults';
import { gridOptionsDefaults } from '@/lib/lightweight-charts/api/options/grid-options-defaults';
import { layoutOptionsDefaults } from '@/lib/lightweight-charts/api/options/layout-options-defaults';
import { priceScaleOptionsDefaults } from '@/lib/lightweight-charts/api/options/price-scale-options-defaults';
import { timeScaleOptionsDefaults } from '@/lib/lightweight-charts/api/options/time-scale-options-defaults';
import { watermarkOptionsDefaults } from '@/lib/lightweight-charts/api/options/watermark-options-defaults';

export function chartOptionsDefaults<THorzScaleItem>(): ChartOptionsInternal<THorzScaleItem> {
    return {
        width: 0,
        height: 0,
        autoSize: false,
        layout: layoutOptionsDefaults,
        crosshair: crosshairOptionsDefaults,
        grid: gridOptionsDefaults,
        overlayPriceScales: {
            ...priceScaleOptionsDefaults,
        },
        leftPriceScale: {
            ...priceScaleOptionsDefaults,
            visible: false,
        },
        rightPriceScale: {
            ...priceScaleOptionsDefaults,
            visible: true,
        },
        timeScale: timeScaleOptionsDefaults,
        watermark: watermarkOptionsDefaults,
        localization: {
            locale: isRunningOnClientSide ? navigator.language : '',
            dateFormat: "dd MMM 'yy",
        },
        handleScroll: {
            mouseWheel: true,
            pressedMouseMove: true,
            horzTouchDrag: true,
            vertTouchDrag: true,
        },
        handleScale: {
            axisPressedMouseMove: {
                time: true,
                price: true,
            },
            axisDoubleClickReset: {
                time: true,
                price: true,
            },
            mouseWheel: true,
            pinch: true,
        },
        kineticScroll: {
            mouse: false,
            touch: true,
        },
        trackingMode: {
            exitMode: TrackingModeExitMode.OnNextTap,
        },
    };
}
