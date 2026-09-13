/**
 * How a widget asks a data source for the axis views it wants to draw.
 */
import { type IDataSource } from '@/lib/charting/engine/model/chart/idata-source';
import { type IAxisView } from '@/lib/charting/engine/views/pane/iaxis-view';

type IAxisViewsGetter = (source: IDataSource) => readonly IAxisView[];

export type IPriceAxisViewsGetter = IAxisViewsGetter;
export type ITimeAxisViewsGetter = IAxisViewsGetter;
