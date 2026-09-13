/**
 * A pane view that is told how much changed, so it can rebuild only that
 * much — a cursor move does not need the data re-read.
 */
import { type IPaneView } from '@/lib/lightweight-charts/views/pane/ipane-view';

export type UpdateType = 'data' | 'other' | 'options';

export type IUpdatablePaneView = {
    update(updateType?: UpdateType): void;
} & IPaneView;
