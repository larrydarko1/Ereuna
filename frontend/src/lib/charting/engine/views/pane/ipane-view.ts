/**
 * What a pane view provides: the renderer that will draw it.
 */
import { type IPaneRenderer } from '@/lib/charting/engine/renderers/ipane-renderer';

export type IPaneView = {
    renderer(addAnchors?: boolean): IPaneRenderer | null;
};
