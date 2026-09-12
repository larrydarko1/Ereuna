import { type IAxisRenderer } from '@/lib/lightweight-charts/renderers/iaxis-view-renderer';

export interface IAxisView {
    renderer(): IAxisRenderer | null;
}
