/**
 * How a widget asks a data source for the axis views it wants to draw.
 */
import { type IDataSource } from '@/lib/lightweight-charts/model/idata-source';
import { type IAxisView } from '@/lib/lightweight-charts/views/pane/iaxis-view';

type IAxisViewsGetter = (source: IDataSource) => readonly IAxisView[];

export type IPriceAxisViewsGetter = IAxisViewsGetter;
export type ITimeAxisViewsGetter = IAxisViewsGetter;
