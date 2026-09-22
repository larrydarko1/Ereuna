/**
 * What a caller has to implement to draw its own thing onto a series.
 */
import { type IChartApiBase } from '@/lib/charting/engine/api/ichart-api';
import { type ISeriesApi } from '@/lib/charting/engine/api/iseries-api';
import { type ISeriesPrimitiveBase } from '@/lib/charting/engine/model/series/iseries-primitive';
import { type SeriesOptionsMap, type SeriesType } from '@/lib/charting/engine/model/series/series-options';
import { type Time } from '@/lib/charting/engine/model/time/types';

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
