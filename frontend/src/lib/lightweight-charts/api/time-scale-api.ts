import { type Size } from 'fancy-canvas';

import { type TimeAxisWidget } from '@/lib/lightweight-charts/gui/time-axis-widget';

import { assert } from '@/lib/lightweight-charts/helpers/assertions';
import { Delegate } from '@/lib/lightweight-charts/helpers/delegate';
import { type IDestroyable } from '@/lib/lightweight-charts/helpers/idestroyable';
import { clone, type DeepPartial } from '@/lib/lightweight-charts/helpers/strict-type-checks';

import { type ChartModel } from '@/lib/lightweight-charts/model/chart-model';
import { type Coordinate } from '@/lib/lightweight-charts/model/coordinate';
import {
    type IHorzScaleBehavior,
    type InternalHorzScaleItem,
} from '@/lib/lightweight-charts/model/ihorz-scale-behavior';
import {
    type Logical,
    type LogicalRange,
    type Range,
    type TimePointIndex,
} from '@/lib/lightweight-charts/model/time-data';
import { type HorzScaleOptions, type TimeScale } from '@/lib/lightweight-charts/model/time-scale';

import {
    type ITimeScaleApi,
    type LogicalRangeChangeEventHandler,
    type SizeChangeEventHandler,
    type TimeRangeChangeEventHandler,
} from '@/lib/lightweight-charts/api/itime-scale-api';
const Constants = {
    AnimationDurationMs: 1000,
} as const;
type Constants = (typeof Constants)[keyof typeof Constants];

export class TimeScaleApi<THorzScaleItem> implements ITimeScaleApi<THorzScaleItem>, IDestroyable {
    private _model: ChartModel<THorzScaleItem>;
    private _timeScale: TimeScale<THorzScaleItem>;
    private readonly _timeAxisWidget: TimeAxisWidget<THorzScaleItem>;
    private readonly _timeRangeChanged = new Delegate<Range<THorzScaleItem> | null>();
    private readonly _logicalRangeChanged = new Delegate<LogicalRange | null>();
    private readonly _sizeChanged = new Delegate<number, number>();

    private readonly _horzScaleBehavior: IHorzScaleBehavior<THorzScaleItem>;

    public constructor(
        model: ChartModel<THorzScaleItem>,
        timeAxisWidget: TimeAxisWidget<THorzScaleItem>,
        horzScaleBehavior: IHorzScaleBehavior<THorzScaleItem>,
    ) {
        this._model = model;
        this._timeScale = model.timeScale();
        this._timeAxisWidget = timeAxisWidget;
        this._timeScale.visibleBarsChanged().subscribe(this._onVisibleBarsChanged.bind(this));
        this._timeScale.logicalRangeChanged().subscribe(this._onVisibleLogicalRangeChanged.bind(this));
        this._timeAxisWidget.sizeChanged().subscribe(this._onSizeChanged.bind(this));

        this._horzScaleBehavior = horzScaleBehavior;
    }

    public destroy(): void {
        this._timeScale.visibleBarsChanged().unsubscribeAll(this);
        this._timeScale.logicalRangeChanged().unsubscribeAll(this);
        this._timeAxisWidget.sizeChanged().unsubscribeAll(this);
        this._timeRangeChanged.destroy();
        this._logicalRangeChanged.destroy();
        this._sizeChanged.destroy();
    }

    public scrollPosition(): number {
        return this._timeScale.rightOffset();
    }

    public scrollToPosition(position: number): void {
        this._model.setRightOffset(position);
    }

    /** The same move, eased over {@link Constants.AnimationDurationMs}. */
    public scrollToPositionAnimated(position: number): void {
        this._timeScale.scrollToOffsetAnimated(position, Constants.AnimationDurationMs);
    }

    public scrollToRealTime(): void {
        this._timeScale.scrollToRealTime();
    }

    public findVisibleRange(): Range<THorzScaleItem> | null {
        const timeRange = this._timeScale.visibleTimeRange();

        if (timeRange === null) {
            return null;
        }

        return {
            from: timeRange.from.originalTime as THorzScaleItem,
            to: timeRange.to.originalTime as THorzScaleItem,
        };
    }

    public setVisibleRange(range: Range<THorzScaleItem>): void {
        const convertedRange: Range<InternalHorzScaleItem> = {
            from: this._horzScaleBehavior.convertHorzItemToInternal(range.from),
            to: this._horzScaleBehavior.convertHorzItemToInternal(range.to),
        };
        const logicalRange = this._timeScale.logicalRangeForTimeRange(convertedRange);

        this._model.setTargetLogicalRange(logicalRange);
    }

    public findVisibleLogicalRange(): LogicalRange | null {
        const logicalRange = this._timeScale.visibleLogicalRange();
        if (logicalRange === null) {
            return null;
        }

        return {
            from: logicalRange.left(),
            to: logicalRange.right(),
        };
    }

    public setVisibleLogicalRange(range: Range<number>): void {
        assert(range.from <= range.to, 'The from index cannot be after the to index.');
        this._model.setTargetLogicalRange(range as LogicalRange);
    }

    public resetTimeScale(): void {
        this._model.resetTimeScale();
    }

    public fitContent(): void {
        this._model.fitContent();
    }

    public logicalToCoordinate(logical: Logical): Coordinate | null {
        const timeScale = this._model.timeScale();

        if (timeScale.isEmpty()) {
            return null;
        }
        return timeScale.indexToCoordinate(logical as unknown as TimePointIndex);
    }

    public coordinateToLogical(x: number): Logical | null {
        if (this._timeScale.isEmpty()) {
            return null;
        }
        return this._timeScale.coordinateToIndex(x as Coordinate) as unknown as Logical;
    }

    public timeToCoordinate(time: THorzScaleItem): Coordinate | null {
        const timePoint = this._horzScaleBehavior.convertHorzItemToInternal(time);
        const timePointIndex = this._timeScale.timeToIndex(timePoint);
        if (timePointIndex === null) {
            return null;
        }

        return this._timeScale.indexToCoordinate(timePointIndex);
    }

    public coordinateToTime(x: number): THorzScaleItem | null {
        const timeScale = this._model.timeScale();
        const timePointIndex = timeScale.coordinateToIndex(x as Coordinate);
        const timePoint = timeScale.indexToTimeScalePoint(timePointIndex);
        if (timePoint === null) {
            return null;
        }

        return timePoint.originalTime as THorzScaleItem;
    }

    public width(): number {
        return this._timeAxisWidget.getSize().width;
    }

    public height(): number {
        return this._timeAxisWidget.getSize().height;
    }

    public subscribeVisibleTimeRangeChange(handler: TimeRangeChangeEventHandler<THorzScaleItem>): void {
        this._timeRangeChanged.subscribe(handler);
    }

    public unsubscribeVisibleTimeRangeChange(handler: TimeRangeChangeEventHandler<THorzScaleItem>): void {
        this._timeRangeChanged.unsubscribe(handler);
    }

    public subscribeVisibleLogicalRangeChange(handler: LogicalRangeChangeEventHandler): void {
        this._logicalRangeChanged.subscribe(handler);
    }

    public unsubscribeVisibleLogicalRangeChange(handler: LogicalRangeChangeEventHandler): void {
        this._logicalRangeChanged.unsubscribe(handler);
    }

    public subscribeSizeChange(handler: SizeChangeEventHandler): void {
        this._sizeChanged.subscribe(handler);
    }

    public unsubscribeSizeChange(handler: SizeChangeEventHandler): void {
        this._sizeChanged.unsubscribe(handler);
    }

    public applyOptions(options: DeepPartial<HorzScaleOptions>): void {
        this._timeScale.applyOptions(options);
    }

    public options(): Readonly<HorzScaleOptions> {
        return {
            ...clone(this._timeScale.options()),
            barSpacing: this._timeScale.barSpacing(),
        };
    }

    private _onVisibleBarsChanged(): void {
        if (this._timeRangeChanged.hasListeners()) {
            this._timeRangeChanged.fire(this.findVisibleRange());
        }
    }

    private _onVisibleLogicalRangeChanged(): void {
        if (this._logicalRangeChanged.hasListeners()) {
            this._logicalRangeChanged.fire(this.findVisibleLogicalRange());
        }
    }

    private _onSizeChanged(size: Size): void {
        this._sizeChanged.fire(size.width, size.height);
    }
}
