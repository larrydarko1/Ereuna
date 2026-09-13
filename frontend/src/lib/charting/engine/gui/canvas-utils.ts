/**
 * Creates and disposes the canvases every widget draws on.
 *
 * Releasing one is not just dropping the reference: Safari keeps the backing store
 * alive until the canvas is resized to nothing, which is what `releaseCanvas` is
 * for.
 */
import {
    bindCanvasElementBitmapSizeTo,
    type CanvasElementBitmapSizeBinding,
    size as makeSize,
    type Size,
} from 'fancy-canvas';

import { getNotNull } from '@/lib/charting/engine/helpers/assertions';

export function createBoundCanvas(parentElement: HTMLElement, size: Size): CanvasElementBitmapSizeBinding {
    const doc = getNotNull(parentElement.ownerDocument);
    const canvas = doc.createElement('canvas');
    parentElement.appendChild(canvas);

    const binding = bindCanvasElementBitmapSizeTo(canvas, {
        type: 'device-pixel-content-box',
        options: {
            allowResizeObserver: false,
        },
        transform: (bitmapSize: Size, canvasElementClientSize: Size): Size =>
            makeSize({
                width: Math.max(bitmapSize.width, canvasElementClientSize.width),
                height: Math.max(bitmapSize.height, canvasElementClientSize.height),
            }),
    });
    binding.resizeCanvasElement(size);
    return binding;
}

export function releaseCanvas(canvas: HTMLCanvasElement): void {
    // This function fixes the iOS Safari error "Total canvas memory use exceeds the maximum limit".
    // Seems that iOS Safari stores canvas elements for some additional time internally.
    // So if we create/destroy a lot of canvas elements in a short period of time we can get this error.
    // We resize the canvas to 1x1 pixels to force it to release memmory resources.
    canvas.width = 1;
    canvas.height = 1;
    canvas.getContext('2d')?.clearRect(0, 0, 1, 1);
}
