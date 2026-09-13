/**
 * What a caller has to implement to draw its own thing onto a series.
 */
import { type Time } from '@/lib/lightweight-charts/model/horz-scale-behavior-time/types';
import { type ISeriesPrimitiveBase } from '@/lib/lightweight-charts/model/iseries-primitive';
import { type SeriesOptionsMap, type SeriesType } from '@/lib/lightweight-charts/model/series-options';

import { type IChartApiBase } from '@/lib/lightweight-charts/api/ichart-api';
import { type ISeriesApi } from '@/lib/lightweight-charts/api/iseries-api';

/**
 * Object containing references to the chart and series instances, and a requestUpdate method for triggering
 * a refresh of the chart.
 */
type SeriesAttachedParameter<THorzScaleItem = Time, TSeriesType extends SeriesType = keyof SeriesOptionsMap> = {
    /**
     * Chart instance.
     */
    chart: IChartApiBase<THorzScaleItem>;
    /**
     * Series to which the Primitive is attached.
     */
    series: ISeriesApi<TSeriesType, THorzScaleItem>;
    /**
     * Request an update (redraw the chart)
     */
    requestUpdate: () => void;
};

/**
 * Interface for series primitives. It must be implemented to add some external graphics to series.
 */
export type ISeriesPrimitive<THorzScaleItem = Time> = ISeriesPrimitiveBase<
    SeriesAttachedParameter<THorzScaleItem, SeriesType>
>;
