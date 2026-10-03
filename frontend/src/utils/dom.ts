/**
 * The element an event fired on, checked to be a `kind` (`targetOf(event, HTMLInputElement)`).
 * `event.target` is only typed `EventTarget | null`; this checks it instead of casting it, and
 * a handler bound to one kind of element that hears from another is a template bug, so it throws.
 */
export function targetOf<T extends Element>(event: Event, kind: new () => T): T {
    if (!(event.target instanceof kind))
        throw new Error(`expected the ${event.type} event to come from a ${kind.name}`);
    return event.target;
}
