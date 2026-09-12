import { type IPaneRenderer } from '@/lib/lightweight-charts/renderers/ipane-renderer';

export interface IPaneView {
    renderer(addAnchors?: boolean): IPaneRenderer | null;
}
