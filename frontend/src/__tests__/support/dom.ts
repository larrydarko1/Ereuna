/**
 * Elements checked rather than cast. `wrapper.get(...).element` and
 * `querySelector` both hand back a bare `Element`; asserting it is an input
 * here fails the test by name when the template changes, where a cast would
 * read `.value` off the wrong element and compare `undefined`.
 */

/** `element`, checked to be a `kind`. */
export function elementOf<T extends Element>(element: unknown, kind: new () => T): T {
    if (element instanceof kind) return element;
    throw new Error(`expected a ${kind.name}, got ${element instanceof Element ? element.tagName : 'nothing'}`);
}

/** The first match for `selector` under `root` (the whole document by default), checked to be a `kind`. */
export function query<T extends Element>(selector: string, kind: new () => T, root: ParentNode = document): T {
    return elementOf(root.querySelector(selector), kind);
}
