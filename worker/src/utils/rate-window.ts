/** Pacing requests to a vendor's allowance over a sliding window. */

/**
 * How long until one more request fits the allowance: zero while fewer than
 * `limit` were sent inside the window, otherwise until the one that has to
 * leave it first ages out. `sent` holds send times, oldest first. A sliding
 * window never lets more than `limit` through in any stretch of `windowMs`, so
 * it holds whether the vendor counts by clock hour or by rolling hour.
 */
export function msUntilNextSlot(sent: readonly number[], now: number, limit: number, windowMs: number): number {
    const inWindow = sent.filter((at) => at > now - windowMs);
    const blocking = inWindow[inWindow.length - limit];
    return blocking === undefined ? 0 : blocking + windowMs - now;
}
