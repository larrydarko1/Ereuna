import { type TimeAxisViewRenderer } from '@/lib/lightweight-charts/renderers/time-axis-view-renderer';

export type ITimeAxisView = {
    renderer(): TimeAxisViewRenderer;
};
