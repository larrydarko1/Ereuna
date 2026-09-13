/**
 * Rejects a set of chart options that contradict each other, or that ask for
 * something this browser cannot do.
 *
 * Upstream wrote these to the console in a development build and swallowed them
 * in a production one. Neither half survives here: `no-console` is an error
 * across the whole frontend and there is no logging surface to write to, and
 * carrying on with the caller's options half-applied is exactly the kind of
 * silent fallback this codebase does not keep. Every one of these is a mistake
 * at the call site, so it surfaces the first time the chart is built.
 */
export function rejectOptions(message: string): never {
    throw new Error(message);
}
