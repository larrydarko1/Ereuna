/**
 * The horizontal scale strategy for time.
 *
 * It is what makes the generic scale concrete: how to compare two times, how to
 * weight one for tick mark selection, and how to turn the caller's `Time` into the
 * internal key the scale actually indexes on.
 */
import { DateFormatter } from '@/lib/charting/engine/formatters/date-formatter';
import { DateTimeFormatter } from '@/lib/charting/engine/formatters/date-time-formatter';
import { assert, getNotNull } from '@/lib/charting/engine/helpers/assertions';
import { type Mutable } from '@/lib/charting/engine/helpers/mutable';
import { nominal } from '@/lib/charting/engine/helpers/nominal';
import { type DeepPartial, merge } from '@/lib/charting/engine/helpers/strict-type-checks';
import { type LocalizationOptions } from '@/lib/charting/engine/model/chart/localization-options';
import { type SeriesDataItemTypeMap } from '@/lib/charting/engine/model/data/data-consumer';
import { type SeriesType } from '@/lib/charting/engine/model/series/series-options';
import { defaultTickMarkFormatter } from '@/lib/charting/engine/model/time/default-tick-mark-formatter';
import {
    type DataItem,
    type HorzScaleItemConverterToInternalObj,
    type IHorzScaleBehavior,
    type InternalHorzScaleItem,
    type InternalHorzScaleItemKey,
} from '@/lib/charting/engine/model/time/ihorz-scale-behavior';
import { type TickMark } from '@/lib/charting/engine/model/time/tick-marks';
import { type TimeChartOptions } from '@/lib/charting/engine/model/time/time-based-chart-options';
import { type TickMarkWeightValue, type TimeScalePoint } from '@/lib/charting/engine/model/time/time-data';
import { markWithGreaterWeight, type TimeMark } from '@/lib/charting/engine/model/time/time-scale';
import { fillWeightsForPoints } from '@/lib/charting/engine/model/time/time-scale-point-weight-generator';
import {
    convertStringsToBusinessDays,
    convertStringToBusinessDay,
    convertTime,
    selectTimeConverter,
    timePointOf,
} from '@/lib/charting/engine/model/time/time-utils';
import { isTime, isTimePoint, TickMarkType, TickMarkWeight, type Time } from '@/lib/charting/engine/model/time/types';

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

export class HorzScaleBehaviorTime implements IHorzScaleBehavior<Time> {
    private _dateTimeFormatter!: DateFormatter | DateTimeFormatter;
    // Null until `createChart` hands the options over, which is after the time
    // scale's constructor has already asked for a formatter
    private _options: TimeChartOptions | null = null;

    public options(): TimeChartOptions {
        return getNotNull(this._options);
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
        data: SeriesDataItemTypeMap[SeriesType][],
    ): HorzScaleItemConverterToInternalObj<Time> {
        return getNotNull(selectTimeConverter(data));
    }

    public key(item: InternalHorzScaleItem | Time): InternalHorzScaleItemKey {
        if (isTimePoint(item)) {
            return nominal<InternalHorzScaleItemKey>(item.timestamp);
        }
        assert(isTime(item), 'a horizontal item is either a time point or a time');
        return this.key(this.convertHorzItemToInternal(item));
    }

    public cacheKey(item: InternalHorzScaleItem): number {
        const time = timePointOf(item);
        return time.businessDay === undefined
            ? new Date(time.timestamp * 1000).getTime()
            : new Date(Date.UTC(time.businessDay.year, time.businessDay.month - 1, time.businessDay.day)).getTime();
    }

    public convertHorzItemToInternal(item: Time): InternalHorzScaleItem {
        return convertTime(item);
    }

    public updateFormatter(options: TimeLocalizationOptions): void {
        if (this._options === null) {
            return;
        }
        const dateFormat = options.dateFormat;

        if (this._options.timeScale.timeVisible) {
            this._dateTimeFormatter = new DateTimeFormatter({
                dateFormat,
                timeFormat: this._options.timeScale.secondsVisible ? '%h:%m:%s' : '%h:%m',
                dateTimeSeparator: '   ',
                locale: options.locale,
            });
        } else {
            this._dateTimeFormatter = new DateFormatter(dateFormat, options.locale);
        }
    }

    public formatHorzItem(item: InternalHorzScaleItem): string {
        const tp = timePointOf(item);
        return this._dateTimeFormatter.format(new Date(tp.timestamp * 1000));
    }

    public formatTickmark(tickMark: TickMark, localizationOptions: LocalizationOptions<Time>): string {
        const options = this.options().timeScale;
        const tickMarkType = weightToTickMarkType(tickMark.weight, {
            timeVisible: options.timeVisible,
            secondsVisible: options.secondsVisible,
        });

        if (options.tickMarkFormatter !== undefined) {
            assert(isTime(tickMark.originalTime), 'a time scale tick mark carries the time it was given');
            const tickMarkString = options.tickMarkFormatter(
                tickMark.originalTime,
                tickMarkType,
                localizationOptions.locale,
            );
            if (tickMarkString !== null) {
                return tickMarkString;
            }
        }

        return defaultTickMarkFormatter(timePointOf(tickMark.time), tickMarkType, localizationOptions.locale);
    }

    public maxTickMarkWeight(tickMarks: TimeMark[]): TickMarkWeightValue {
        const firstMark = tickMarks[0];
        if (firstMark === undefined) {
            return nominal<TickMarkWeightValue>(TickMarkWeight.LessThanSecond);
        }

        let maxWeight = tickMarks.reduce(markWithGreaterWeight, firstMark).weight;

        // special case: it looks strange if 15:00 is bold but 14:00 is not
        // so if maxWeight > TickMarkWeight.Hour1 and < TickMarkWeight.Day reduce it to TickMarkWeight.Hour1
        if (maxWeight > TickMarkWeight.Hour1 && maxWeight < TickMarkWeight.Day) {
            maxWeight = nominal<TickMarkWeightValue>(TickMarkWeight.Hour1);
        }
        return maxWeight;
    }

    public fillWeightsForPoints(sortedTimePoints: readonly Mutable<TimeScalePoint>[], startIndex: number): void {
        fillWeightsForPoints(sortedTimePoints, startIndex);
    }

    public static applyDefaults(options?: DeepPartial<TimeChartOptions>): DeepPartial<TimeChartOptions> {
        const defaults: DeepPartial<TimeChartOptions> = { localization: { dateFormat: "dd MMM 'yy" } };
        return merge(defaults, options ?? {});
    }
}

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
