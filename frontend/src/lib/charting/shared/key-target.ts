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
        (target instanceof HTMLElement && target.isContentEditable === true)
    );
}
