import { type IPaneView } from '@/lib/lightweight-charts/views/pane/ipane-view';

export type UpdateType = 'data' | 'other' | 'options';

export type IUpdatablePaneView = {
    update(updateType?: UpdateType): void;
} & IPaneView
