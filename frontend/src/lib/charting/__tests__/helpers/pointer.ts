/**
 * Pointer input, synthesised.
 *
 * The widgets bind plain mouse and touch listeners, so driving them needs nothing
 * cleverer than a dispatched event — with one catch: jsdom ships `TouchEvent` but
 * not `Touch`, so a touch list has to be assembled by hand and hung on the event.
 */
import { vi } from 'vitest';

type Point = { x: number; y: number };

type MouseName = 'mousedown' | 'mouseenter' | 'mouseleave' | 'mousemove' | 'mouseup' | 'dblclick' | 'click';

type TouchName = 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel';

/** `Delay.ResetClick` in the engine's own mouse handler. */
const RESET_CLICK_MS = 500;

export function mouse(target: HTMLElement, name: MouseName, at: Point, init?: MouseEventInit): void {
    target.dispatchEvent(
        new MouseEvent(name, {
            bubbles: true,
            cancelable: true,
            clientX: at.x,
            clientY: at.y,
            ...init,
        }),
    );
}

/** Press and release in one place, then let the double click window expire. */
export function click(target: HTMLElement, at: Point): void {
    press(target, at);
    settleClicks();
}

/**
 * Two clicks in the same place. The handler synthesises a double click out of the
 * pair itself and only listens for a real `dblclick` on mobile Safari, so this is
 * the only way to reach `mouseDoubleClickEvent`.
 */
export function doubleClick(target: HTMLElement, at: Point): void {
    press(target, at);
    press(target, at);
    settleClicks();
}

/**
 * Runs out the handler's double click window.
 *
 * A second click inside it is read as half of a double click, and one that landed
 * somewhere else is discarded rather than reported — so without this, every click
 * after the first in a test is swallowed. A real pointer waits; a test moves the
 * clock, and only when the test installed a fake one.
 */
function settleClicks(): void {
    if (vi.isFakeTimers()) vi.advanceTimersByTime(RESET_CLICK_MS);
}

function press(target: HTMLElement, at: Point): void {
    mouse(target, 'mousedown', at);
    mouse(document.documentElement, 'mouseup', at);
}

/** Press, move and release — one drag, in the three events the handler expects. */
export function drag(target: HTMLElement, from: Point, to: Point, steps = 4): void {
    mouse(target, 'mousedown', from);
    for (let step = 1; step <= steps; step += 1) {
        mouse(document.documentElement, 'mousemove', {
            x: from.x + ((to.x - from.x) * step) / steps,
            y: from.y + ((to.y - from.y) * step) / steps,
        });
    }
    mouse(document.documentElement, 'mouseup', to);
}

export function wheel(target: HTMLElement, at: Point, deltaY: number): void {
    target.dispatchEvent(
        new WheelEvent('wheel', { bubbles: true, cancelable: true, clientX: at.x, clientY: at.y, deltaY }),
    );
}

export function touch(target: HTMLElement, name: TouchName, points: Point[]): void {
    const event = new Event(name, { bubbles: true, cancelable: true });
    const list = points.map((point, index) => ({
        identifier: index,
        target,
        clientX: point.x,
        clientY: point.y,
        pageX: point.x,
        pageY: point.y,
        screenX: point.x,
        screenY: point.y,
    }));

    // `touches` is read-only on the interface and absent from a plain Event, so
    // the three lists are defined onto the instance instead of passed to it
    for (const listName of ['touches', 'targetTouches', 'changedTouches']) {
        Object.defineProperty(event, listName, { configurable: true, value: list });
    }
    target.dispatchEvent(event);
}

/**
 * One finger, pressed on the target and moved. Only the press is bound to the
 * widget's own canvas: the move and the release are listened for on the document,
 * so that a finger leaving the chart still finishes its gesture.
 */
export function touchDrag(target: HTMLElement, from: Point, to: Point, steps = 4): void {
    touch(target, 'touchstart', [from]);
    for (let step = 1; step <= steps; step += 1) {
        touch(document.documentElement, 'touchmove', [
            {
                x: from.x + ((to.x - from.x) * step) / steps,
                y: from.y + ((to.y - from.y) * step) / steps,
            },
        ]);
    }
    touch(document.documentElement, 'touchend', [to]);
}
