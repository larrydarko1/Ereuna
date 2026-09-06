/**
 * frontend test bootstrap — the browser APIs jsdom does not implement.
 *
 * jsdom covers the DOM and HTML specs, not the observer or media-query APIs
 * that came later, and a component reaching for one of them throws before it
 * renders. Each stub below is the smallest shape the app actually calls.
 *
 * i18n is installed globally rather than per-mount: every SFC here calls `$t`,
 * so a mount without it renders the dotted key path and the assertion that
 * catches that failure is nowhere near the cause.
 */
import { config } from '@vue/test-utils';
import { beforeEach, vi } from 'vitest';
import { i18n } from '@/i18n';

class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
}

globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
globalThis.IntersectionObserver = ResizeObserverStub as unknown as typeof IntersectionObserver;

globalThis.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: (): void => {},
    removeEventListener: (): void => {},
    // The deprecated pair as well: the vendored charting fork watches the
    // device pixel ratio through them, and jsdom implements neither
    addListener: (): void => {},
    removeListener: (): void => {},
    dispatchEvent: (): boolean => false,
})) as unknown as typeof matchMedia;

globalThis.scrollTo = ((): void => {}) as unknown as typeof scrollTo;
Element.prototype.scrollIntoView = (): void => {};

// jsdom runs no layout, so `offsetParent` is null for every element and any
// "is this on screen" test answers no — which is how the dialog decides what is
// focusable. Attached elements report their parent, which is what a browser
// does for everything that is not fixed or hidden.
Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get(): Element | null {
        return (this as HTMLElement).isConnected ? ((this as HTMLElement).parentElement ?? document.body) : null;
    },
});

// jsdom implements <canvas> as an element but not as a drawing surface, so
// `getContext` answers null and the vendored charting fork asserts on it before
// it draws anything. The stub answers every call it makes with a no-op; nothing
// here asserts on pixels, only on the DOM the component renders around them.
const CANVAS_METHODS = [
    'arc',
    'beginPath',
    'bezierCurveTo',
    'clearRect',
    'clip',
    'closePath',
    'createLinearGradient',
    'drawImage',
    'fill',
    'fillRect',
    'fillText',
    'lineTo',
    'moveTo',
    'putImageData',
    'quadraticCurveTo',
    'rect',
    'restore',
    'rotate',
    'save',
    'scale',
    'setLineDash',
    'setTransform',
    'stroke',
    'strokeRect',
    'strokeText',
    'transform',
    'translate',
] as const;

HTMLCanvasElement.prototype.getContext = function getContext(): unknown {
    const context: Record<string, unknown> = {
        canvas: this,
        getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
        createImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
        measureText: (text: string) => ({ width: text.length * 6 }),
        isPointInPath: () => false,
    };
    for (const method of CANVAS_METHODS) context[method] = (): void => {};
    return context;
} as unknown as typeof HTMLCanvasElement.prototype.getContext;

HTMLCanvasElement.prototype.toDataURL = (): string => 'data:image/png;base64,';

config.global.plugins = [i18n];

// Locale and theme both persist to localStorage, so one suite's choice would
// otherwise be the next suite's starting state.
beforeEach(() => {
    localStorage.clear();
    i18n.global.locale.value = 'en';
    vi.useRealTimers();
});
