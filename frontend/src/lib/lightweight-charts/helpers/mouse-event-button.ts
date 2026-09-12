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
export type MouseEventButton = (typeof MouseEventButton)[keyof typeof MouseEventButton];
