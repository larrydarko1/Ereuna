/**
 * Rejects data and options that would produce a chart nobody could read —
 * values out of order, the wrong shape for the series type, a price format that
 * contradicts itself.
 *
 * Upstream ran these only in a development build. They always run here, because
 * the alternative is a silently wrong chart and this codebase does not keep silent
 * fallbacks.
 */
import { assert, getDefined } from '@/lib/charting/engine/helpers/assertions';
import { isFulfilledData, type SeriesDataItemTypeMap } from '@/lib/charting/engine/model/data/data-consumer';
import { type IHorzScaleBehavior } from '@/lib/charting/engine/model/time/ihorz-scale-behavior';
import { type CreatePriceLineOptions } from '@/lib/charting/engine/model/price/price-line-options';
import { type SeriesMarker } from '@/lib/charting/engine/model/series/series-markers';
import { type SeriesType } from '@/lib/charting/engine/model/series/series-options';

type Checker<THorzScaleItem> = (item: SeriesDataItemTypeMap<THorzScaleItem>[SeriesType]) => void;

export function checkPriceLineOptions(options: CreatePriceLineOptions): void {
    assert(
        typeof options.price === 'number',
        `the type of 'price' price line's property must be a number, got '${typeof options.price}'`,
    );
}

export function checkItemsAreOrdered<THorzScaleItem>(
    data: readonly (SeriesMarker<THorzScaleItem> | SeriesDataItemTypeMap<THorzScaleItem>[SeriesType])[],
    bh: IHorzScaleBehavior<THorzScaleItem>,
    allowDuplicates = false,
): void {
    if (data.length === 0) {
        return;
    }

    let prevTime = bh.key(getDefined(data[0]).time);
    for (let i = 1; i < data.length; ++i) {
        const item = data[i];
        if (item === undefined) continue;

        const currentTime = bh.key(item.time);
        const checkResult = allowDuplicates ? prevTime <= currentTime : prevTime < currentTime;
        assert(checkResult, `data must be asc ordered by time, index=${i}, time=${currentTime}, prev time=${prevTime}`);
        prevTime = currentTime;
    }
}

export function checkSeriesValuesType<THorzScaleItem>(
    type: SeriesType,
    data: readonly SeriesDataItemTypeMap<THorzScaleItem>[SeriesType][],
): void {
    data.forEach(getChecker<THorzScaleItem>(type));
}

function getChecker<THorzScaleItem>(type: SeriesType): Checker<THorzScaleItem> {
    switch (type) {
        case 'Bar':
        case 'Candlestick':
            return checkBarItem.bind(null, type);

        case 'Area':
        case 'Baseline':
        case 'Line':
        case 'Histogram':
            return checkLineItem.bind(null, type);

        case 'Custom':
            return checkCustomItem.bind(null, type);
    }
}

function checkBarItem<THorzScaleItem>(
    type: 'Bar' | 'Candlestick',
    barItem: SeriesDataItemTypeMap<THorzScaleItem>[typeof type],
): void {
    if (!isFulfilledData(barItem)) {
        return;
    }

    assert(
        typeof barItem.open === 'number',
        `${type} series item data value of open must be a number, got=${typeof barItem.open}, value=${barItem.open}`,
    );
    assert(
        typeof barItem.high === 'number',
        `${type} series item data value of high must be a number, got=${typeof barItem.high}, value=${barItem.high}`,
    );
    assert(
        typeof barItem.low === 'number',
        `${type} series item data value of low must be a number, got=${typeof barItem.low}, value=${barItem.low}`,
    );
    assert(
        typeof barItem.close === 'number',
        `${type} series item data value of close must be a number, got=${typeof barItem.close}, value=${barItem.close}`,
    );
}

function checkLineItem<THorzScaleItem>(
    type: 'Area' | 'Baseline' | 'Line' | 'Histogram',
    lineItem: SeriesDataItemTypeMap<THorzScaleItem>[typeof type],
): void {
    if (!isFulfilledData(lineItem)) {
        return;
    }

    assert(
        typeof lineItem.value === 'number',
        `${type} series item data value must be a number, got=${typeof lineItem.value}, value=${lineItem.value}`,
    );
}

function checkCustomItem<THorzScaleItem>(
    _type: 'Custom',
    _customItem: SeriesDataItemTypeMap<THorzScaleItem>['Custom'],
): void {
    // Nothing to check yet...
    return;
}
