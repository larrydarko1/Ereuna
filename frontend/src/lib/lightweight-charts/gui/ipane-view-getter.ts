import { type IDataSource } from '@/lib/lightweight-charts/model/idata-source';
import { type Pane } from '@/lib/lightweight-charts/model/pane';
import { type IPaneView } from '@/lib/lightweight-charts/views/pane/ipane-view';

export type IPaneViewsGetter = (source: IDataSource, pane: Pane) => readonly IPaneView[];
