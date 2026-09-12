import { isString } from '@/lib/lightweight-charts/helpers/strict-type-checks';

import { type TimedData } from '@/lib/lightweight-charts/model/data-layer';
import { type InternalHorzScaleItem } from '@/lib/lightweight-charts/model/ihorz-scale-behavior';
import {
    type BusinessDay,
    isBusinessDay,
    isUTCTimestamp,
    type Time,
    type UTCTimestamp,
} from '@/lib/lightweight-charts/model/horz-scale-behavior-time/types';

export type TimeConverter = (time: Time) => InternalHorzScaleItem;

export function businessDayConverter(time: Time): InternalHorzScaleItem {
    let businessDay = time;
    if (isString(time)) {
        businessDay = stringToBusinessDay(time);
    }
    if (!isBusinessDay(businessDay)) {
        throw new Error('time must be of type BusinessDay');
    }

    const date = new Date(Date.UTC(businessDay.year, businessDay.month - 1, businessDay.day, 0, 0, 0, 0));

    return {
        timestamp: Math.round(date.getTime() / 1000) as UTCTimestamp,
        businessDay,
    } as unknown as InternalHorzScaleItem;
}

export function timestampConverter(time: Time): InternalHorzScaleItem {
    if (!isUTCTimestamp(time)) {
        throw new Error('time must be of type isUTCTimestamp');
    }
    return {
        timestamp: time,
    } as unknown as InternalHorzScaleItem;
}

export function selectTimeConverter(data: TimedData<Time>[]): TimeConverter | null {
    const first = data[0];
    if (first === undefined) {
        return null;
    }
    if (isBusinessDay(first.time) || isString(first.time)) {
        return businessDayConverter;
    }
    return timestampConverter;
}

const validDateRegex = /^\d\d\d\d-\d\d-\d\d$/;

export function convertTime(time: Time): InternalHorzScaleItem {
    if (isUTCTimestamp(time)) {
        return timestampConverter(time);
    }

    if (!isBusinessDay(time)) {
        return businessDayConverter(stringToBusinessDay(time));
    }

    return businessDayConverter(time);
}

export function stringToBusinessDay(value: string): BusinessDay {
    // Chrome's Date constructor accepts a malformed date string and parses it in
    // an implementation-specific way — 2019-1-1 is not read as 2019-01-01 — so
    // the format is checked before the date is. Upstream ran this in development
    // builds only, on perf grounds; one regex per business day is not worth a
    // date that silently means something else.
    // https://bugs.chromium.org/p/chromium/issues/detail?id=968939
    if (!validDateRegex.test(value)) {
        throw new Error(`Invalid date string=${value}, expected format=yyyy-mm-dd`);
    }

    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) {
        throw new Error(`Invalid date string=${value}, expected format=yyyy-mm-dd`);
    }

    return {
        day: parsed.getUTCDate(),
        month: parsed.getUTCMonth() + 1,
        year: parsed.getUTCFullYear(),
    };
}

export function convertStringToBusinessDay(value: TimedData<Time>): void {
    if (isString(value.time)) {
        value.time = stringToBusinessDay(value.time);
    }
}

export function convertStringsToBusinessDays(data: TimedData<Time>[]): void {
    return data.forEach(convertStringToBusinessDay);
}
