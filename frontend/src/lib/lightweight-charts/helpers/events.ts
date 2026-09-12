import { isChrome } from '@/lib/lightweight-charts/helpers/browsers';
import { MouseEventButton } from '@/lib/lightweight-charts/helpers/mouse-event-button';

export function preventScrollByWheelClick(el: HTMLElement): void {
    if (!isChrome()) {
        return;
    }

    el.addEventListener('mousedown', (e: MouseEvent) => {
        if (e.button === MouseEventButton.Middle) {
            // prevent incorrect scrolling event
            e.preventDefault();
            return false;
        }
        return undefined;
    });
}
