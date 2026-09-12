import { DateFormatter } from '@/lib/lightweight-charts/formatters/date-formatter';
import { DateTimeFormatter } from '@/lib/lightweight-charts/formatters/date-time-formatter';

import { getNotNull } from '@/lib/lightweight-charts/helpers/assertions';
import { type Mutable } from '@/lib/lightweight-charts/helpers/mutable';
import { type DeepPartial, merge } from '@/lib/lightweight-charts/helpers/strict-type-checks';

import { type SeriesDataItemTypeMap } from '@/lib/lightweight-charts/model/data-consumer';
import {
    type DataItem,
    type HorzScaleItemConverterToInternalObj,
    type IHorzScaleBehavior,
    type InternalHorzScaleItem,
    type InternalHorzScaleItemKey,
} from '@/lib/lightweight-charts/model/ihorz-scale-behavior';
import { type LocalizationOptions } from '@/lib/lightweight-charts/model/localization-options';
import { type SeriesType } from '@/lib/lightweight-charts/model/series-options';
import { type TickMark } from '@/lib/lightweight-charts/model/tick-marks';
import { type TickMarkWeightValue, type TimeScalePoint } from '@/lib/lightweight-charts/model/time-data';
import { markWithGreaterWeight, type TimeMark } from '@/lib/lightweight-charts/model/time-scale';
import { defaultTickMarkFormatter } from '@/lib/lightweight-charts/model/horz-scale-behavior-time/default-tick-mark-formatter';
import { type TimeChartOptions } from '@/lib/lightweight-charts/model/horz-scale-behavior-time/time-based-chart-options';
import { fillWeightsForPoints } from '@/lib/lightweight-charts/model/horz-scale-behavior-time/time-scale-point-weight-generator';
import {
    convertStringsToBusinessDays,
    convertStringToBusinessDay,
    convertTime,
    selectTimeConverter,
} from '@/lib/lightweight-charts/model/horz-scale-behavior-time/time-utils';
import {
    TickMarkType,
    TickMarkWeight,
    type Time,
    type TimePoint,
} from '@/lib/lightweight-charts/model/horz-scale-behavior-time/types';

/**
 * Represents options for formatting dates, times, and prices according to a locale.
 */
type TimeLocalizationOptions = {
    /**
     * Date formatting string.
     *
     */
    dateFormat: string;
} & LocalizationOptions<Time>;

/**
 * The `TickMarkFormatter` is used to customize tick mark labels on the time scale.
 *
 * This function should return `time` as a string formatted according to `tickMarkType` type (year, month, etc) and `locale`.
 *
 * Note that the returned string should be the shortest possible value and should have no more than 8 characters.
 * Otherwise, the tick marks will overlap each other.
 *
 * If the formatter function returns `null` then the default tick mark formatter will be used as a fallback.
 *
 * @example
 * ```js
 * const customFormatter = (time, tickMarkType, locale) => {
 *     // your code here
 * };
 * ```
 */
export type TickMarkFormatter = (time: Time, tickMarkType: TickMarkType, locale: string) => string | null;

/** What the time axis is currently spelling out, which decides the tick labels. */
type AxisVisibility = { timeVisible: boolean; secondsVisible: boolean };

/** What a tick mark of this weight spells out, given what the axis is showing. */
function weightToTickMarkType(weight: TickMarkWeightValue, shows: AxisVisibility): TickMarkType {
    const { timeVisible, secondsVisible } = shows;

    switch (weight) {
        case TickMarkWeight.LessThanSecond:
        case TickMarkWeight.Second:
            if (!timeVisible) {
                return TickMarkType.DayOfMonth;
            }

            return secondsVisible ? TickMarkType.TimeWithSeconds : TickMarkType.Time;

        case TickMarkWeight.Minute1:
        case TickMarkWeight.Minute5:
        case TickMarkWeight.Minute30:
        case TickMarkWeight.Hour1:
        case TickMarkWeight.Hour3:
        case TickMarkWeight.Hour6:
        case TickMarkWeight.Hour12:
            return timeVisible ? TickMarkType.Time : TickMarkType.DayOfMonth;

        case TickMarkWeight.Day:
            return TickMarkType.DayOfMonth;

        case TickMarkWeight.Month:
            return TickMarkType.Month;

        case TickMarkWeight.Year:
            return TickMarkType.Year;

        default:
            // A weight outside the known set. The switch used to fall through and
            // return undefined against a signature that promised a TickMarkType
            return TickMarkType.DayOfMonth;
    }
}

export class HorzScaleBehaviorTime implements IHorzScaleBehavior<Time> {
    private _dateTimeFormatter!: DateFormatter | DateTimeFormatter;
    private _options!: TimeChartOptions;

    public options(): TimeChartOptions {
        return this._options;
    }

    public setOptions(options: TimeChartOptions): void {
        this._options = options;
        this.updateFormatter(options.localization);
    }

    public preprocessData(data: DataItem<Time> | DataItem<Time>[]): void {
        if (Array.isArray(data)) {
            convertStringsToBusinessDays(data);
        } else {
            convertStringToBusinessDay(data);
        }
    }

    public createConverterToInternalObj(
        data: SeriesDataItemTypeMap<Time>[SeriesType][],
    ): HorzScaleItemConverterToInternalObj<Time> {
        return getNotNull(selectTimeConverter(data));
    }

    public key(item: InternalHorzScaleItem | Time): InternalHorzScaleItemKey {
        if (typeof item === 'object' && 'timestamp' in item) {
            return (item as unknown as TimePoint).timestamp as unknown as InternalHorzScaleItemKey;
        }
        return this.key(this.convertHorzItemToInternal(item as Time));
    }

    public cacheKey(item: InternalHorzScaleItem): number {
        const time = item as unknown as TimePoint;
        return time.businessDay === undefined
            ? new Date(time.timestamp * 1000).getTime()
            : new Date(Date.UTC(time.businessDay.year, time.businessDay.month - 1, time.businessDay.day)).getTime();
    }

    public convertHorzItemToInternal(item: Time): InternalHorzScaleItem {
        return convertTime(item);
    }

    public updateFormatter(options: TimeLocalizationOptions): void {
        if (this._options === undefined) {
            return;
        }
        const dateFormat = options.dateFormat;

        if (this._options.timeScale.timeVisible) {
            this._dateTimeFormatter = new DateTimeFormatter({
                dateFormat: dateFormat,
                timeFormat: this._options.timeScale.secondsVisible ? '%h:%m:%s' : '%h:%m',
                dateTimeSeparator: '   ',
                locale: options.locale,
            });
        } else {
            this._dateTimeFormatter = new DateFormatter(dateFormat, options.locale);
        }
    }

    public formatHorzItem(item: InternalHorzScaleItem): string {
        const tp = item as unknown as TimePoint;
        return this._dateTimeFormatter.format(new Date(tp.timestamp * 1000));
    }

    public formatTickmark(tickMark: TickMark, localizationOptions: LocalizationOptions<Time>): string {
        const tickMarkType = weightToTickMarkType(tickMark.weight, {
            timeVisible: this._options.timeScale.timeVisible,
            secondsVisible: this._options.timeScale.secondsVisible,
        });

        const options = this._options.timeScale;

        if (options.tickMarkFormatter !== undefined) {
            const tickMarkString = options.tickMarkFormatter(
                tickMark.originalTime as Time,
                tickMarkType,
                localizationOptions.locale,
            );
            if (tickMarkString !== null) {
                return tickMarkString;
            }
        }

        return defaultTickMarkFormatter(
            tickMark.time as unknown as TimePoint,
            tickMarkType,
            localizationOptions.locale,
        );
    }

    public maxTickMarkWeight(tickMarks: TimeMark[]): TickMarkWeightValue {
        const firstMark = tickMarks[0];
        if (firstMark === undefined) {
            return TickMarkWeight.LessThanSecond as TickMarkWeightValue;
        }

        let maxWeight = tickMarks.reduce(markWithGreaterWeight, firstMark).weight;

        // special case: it looks strange if 15:00 is bold but 14:00 is not
        // so if maxWeight > TickMarkWeight.Hour1 and < TickMarkWeight.Day reduce it to TickMarkWeight.Hour1
        if (maxWeight > TickMarkWeight.Hour1 && maxWeight < TickMarkWeight.Day) {
            maxWeight = TickMarkWeight.Hour1 as TickMarkWeightValue;
        }
        return maxWeight;
    }

    public fillWeightsForPoints(sortedTimePoints: readonly Mutable<TimeScalePoint>[], startIndex: number): void {
        fillWeightsForPoints(sortedTimePoints, startIndex);
    }

    public static applyDefaults(options?: DeepPartial<TimeChartOptions>): DeepPartial<TimeChartOptions> {
        return merge({ localization: { dateFormat: "dd MMM 'yy" } }, options ?? {});
    }
}
