/**
 * Whether a key event was aimed at somewhere text is typed. Every drawing tool
 * deletes its selection on Backspace or Delete, and none may while the caret is
 * in a field — there the key means "erase a character", including inside a
 * tool's own dialog or text input.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
    return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && isContentEditable(target))
    );
}

// jsdom does not implement `isContentEditable`, so it can be missing even
// though the DOM's own type says otherwise
function isContentEditable(element: Partial<Pick<HTMLElement, 'isContentEditable'>>): boolean {
    return element.isContentEditable === true;
}
