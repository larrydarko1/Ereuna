/**
 * Browser sniffing, kept to the handful of places a real behavioural
 * difference forces it — wheel deltas, touch emulation and the chromium-only
 * pointer quirks.
 *
 * Feature detection is preferred everywhere it works; these are the cases where
 * there is nothing to detect.
 */
import { isRunningOnClientSide } from '@/lib/charting/engine/helpers/is-running-on-client-side';

export function isFF(): boolean {
    if (!isRunningOnClientSide) {
        return false;
    }
    return window.navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
}

export function isIOS(): boolean {
    if (!isRunningOnClientSide) {
        return false;
    }
    return /iPhone|iPad|iPod/.test(window.navigator.platform);
}

export function isChrome(): boolean {
    if (!isRunningOnClientSide) {
        return false;
    }
    return window.chrome !== undefined;
}

// Determine whether the browser is running on windows.
export function isWindows(): boolean {
    if (!isRunningOnClientSide) {
        return false;
    }
    // more accurate if available
    if (navigator.userAgentData?.platform !== undefined) {
        return navigator.userAgentData.platform === 'Windows';
    }
    return navigator.userAgent.toLowerCase().indexOf('win') >= 0;
}

// Determine whether the browser is Chromium based.
export function isChromiumBased(): boolean {
    if (!isRunningOnClientSide) {
        return false;
    }
    if (navigator.userAgentData === undefined) {
        return false;
    }
    return navigator.userAgentData.brands.some((brand: UADataBrand) => {
        return brand.brand.includes('Chromium');
    });
}
