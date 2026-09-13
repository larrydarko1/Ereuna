/**
 * What a pane view provides: the renderer that will draw it.
 */
import { type IPaneRenderer } from '@/lib/lightweight-charts/renderers/ipane-renderer';

export type IPaneView = {
    renderer(addAnchors?: boolean): IPaneRenderer | null;
};
