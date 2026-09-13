/**
 * Every chart option's starting value, assembled from the per-concern defaults.
 *
 * It is a function rather than a constant because the nested objects would
 * otherwise be shared between charts, and applying options to one would change the
 * other.
 */
import { isRunningOnClientSide } from '@/lib/charting/engine/helpers/is-running-on-client-side';

import { type ChartOptionsInternal, TrackingModeExitMode } from '@/lib/charting/engine/model/chart/chart-model';

import { crosshairOptionsDefaults } from '@/lib/charting/engine/api/options/crosshair-options-defaults';
import { gridOptionsDefaults } from '@/lib/charting/engine/api/options/grid-options-defaults';
import { layoutOptionsDefaults } from '@/lib/charting/engine/api/options/layout-options-defaults';
import { priceScaleOptionsDefaults } from '@/lib/charting/engine/api/options/price-scale-options-defaults';
import { timeScaleOptionsDefaults } from '@/lib/charting/engine/api/options/time-scale-options-defaults';
import { watermarkOptionsDefaults } from '@/lib/charting/engine/api/options/watermark-options-defaults';

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
