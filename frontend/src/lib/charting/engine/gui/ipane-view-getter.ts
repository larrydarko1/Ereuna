/**
 * How a widget asks a data source for one of its pane view lists.
 */
import { type IDataSource } from '@/lib/charting/engine/model/chart/idata-source';
import { type Pane } from '@/lib/charting/engine/model/chart/pane';
import { type IPaneView } from '@/lib/charting/engine/views/pane/ipane-view';

export type IPaneViewsGetter = (source: IDataSource, pane: Pane) => readonly IPaneView[];
