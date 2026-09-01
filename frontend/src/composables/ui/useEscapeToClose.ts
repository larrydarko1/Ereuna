/**
 * Close a dialog, popup or drawer on Escape.
 * Bound to the document rather than the element because a modal's focus may
 * legitimately sit anywhere inside it, and a keydown on a nested input would
 * otherwise never reach a handler bound to the wrapper.
 * The listener is registered on mount and removed on unmount, so a closed
 * dialog cannot keep answering keystrokes meant for the page behind it.
 */
import { onMounted, onUnmounted } from 'vue';

export function useEscapeToClose(close: () => void): void {
    function onKeydown(event: KeyboardEvent): void {
        if (event.key === 'Escape') close();
    }

    onMounted(() => document.addEventListener('keydown', onKeydown));
    onUnmounted(() => document.removeEventListener('keydown', onKeydown));
}
