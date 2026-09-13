/**
 * The `MouseEvent.button` values, named.
 *
 * A bare `event.button === 1` at a call site says nothing about which button that
 * is, and the numbers are not in the order anyone expects.
 */
export type MouseEventButton = (typeof MouseEventButton)[keyof typeof MouseEventButton];

/**
 * Mouse button constants for MouseEvents.
 * e.button values for MouseEvents.
 * It's NOT e.buttons (with s)!
 */
export const MouseEventButton = {
    Left: 0,
    Middle: 1,
    Right: 2,
    Fourth: 3,
    Fifth: 4,
} as const;
