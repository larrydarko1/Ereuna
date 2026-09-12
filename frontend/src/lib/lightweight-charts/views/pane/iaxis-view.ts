import { type IAxisRenderer } from '@/lib/lightweight-charts/renderers/iaxis-view-renderer';

export type IAxisView = {
    renderer(): IAxisRenderer | null;
}
