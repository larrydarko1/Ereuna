import { type LogicalRange } from '@/lib/lightweight-charts/model/time-data';

export const InvalidationLevel = {
    None: 0,
    Cursor: 1,
    Light: 2,
    Full: 3,
} as const;
export type InvalidationLevel = (typeof InvalidationLevel)[keyof typeof InvalidationLevel];

// `Math.max` widens two levels back to `number`, which is not one of them
function higherLevel(a: InvalidationLevel, b: InvalidationLevel): InvalidationLevel {
    return a > b ? a : b;
}

export type PaneInvalidation = {
    level: InvalidationLevel;
    autoScale?: boolean | undefined;
};

function mergePaneInvalidation(
    beforeValue: PaneInvalidation | undefined,
    newValue: PaneInvalidation,
): PaneInvalidation {
    if (beforeValue === undefined) {
        return newValue;
    }
    const level = higherLevel(beforeValue.level, newValue.level);
    const autoScale = beforeValue.autoScale === true || newValue.autoScale === true;
    return { level, autoScale };
}

export const TimeScaleInvalidationType = {
    FitContent: 0,
    ApplyRange: 1,
    ApplyBarSpacing: 2,
    ApplyRightOffset: 3,
    Reset: 4,
    Animation: 5,
    StopAnimation: 6,
} as const;
export type TimeScaleInvalidationType = (typeof TimeScaleInvalidationType)[keyof typeof TimeScaleInvalidationType];

export type TimeScaleApplyRangeInvalidation = {
    type: typeof TimeScaleInvalidationType.ApplyRange;
    value: LogicalRange;
};

export type TimeScaleFitContentInvalidation = {
    type: typeof TimeScaleInvalidationType.FitContent;
};

export type TimeScaleApplyRightOffsetInvalidation = {
    type: typeof TimeScaleInvalidationType.ApplyRightOffset;
    value: number;
};

export type TimeScaleApplyBarSpacingInvalidation = {
    type: typeof TimeScaleInvalidationType.ApplyBarSpacing;
    value: number;
};

export type TimeScaleResetInvalidation = {
    type: typeof TimeScaleInvalidationType.Reset;
};

export type ITimeScaleAnimation = {
    getPosition(time: number): number;
    finished(time: number): boolean;
};
export type StartTimeScaleAnimationInvalidation = {
    type: typeof TimeScaleInvalidationType.Animation;
    value: ITimeScaleAnimation;
};

export type StopTimeScaleAnimationInvalidation = {
    type: typeof TimeScaleInvalidationType.StopAnimation;
};

export type TimeScaleInvalidation =
    | TimeScaleApplyRangeInvalidation
    | TimeScaleFitContentInvalidation
    | TimeScaleApplyRightOffsetInvalidation
    | TimeScaleApplyBarSpacingInvalidation
    | TimeScaleResetInvalidation
    | StartTimeScaleAnimationInvalidation
    | StopTimeScaleAnimationInvalidation;

export class InvalidateMask {
    private _invalidatedPanes = new Map<number, PaneInvalidation>();
    private _globalLevel: InvalidationLevel;
    private _timeScaleInvalidations: TimeScaleInvalidation[] = [];

    public constructor(globalLevel: InvalidationLevel) {
        this._globalLevel = globalLevel;
    }

    public invalidatePane(paneIndex: number, invalidation: PaneInvalidation): void {
        const prevValue = this._invalidatedPanes.get(paneIndex);
        const newValue = mergePaneInvalidation(prevValue, invalidation);
        this._invalidatedPanes.set(paneIndex, newValue);
    }

    public fullInvalidation(): InvalidationLevel {
        return this._globalLevel;
    }

    public invalidateForPane(paneIndex: number): PaneInvalidation {
        const paneInvalidation = this._invalidatedPanes.get(paneIndex);
        if (paneInvalidation === undefined) {
            return {
                level: this._globalLevel,
            };
        }
        return {
            level: higherLevel(this._globalLevel, paneInvalidation.level),
            autoScale: paneInvalidation.autoScale,
        };
    }

    public setFitContent(): void {
        this.stopTimeScaleAnimation();
        // modifies both bar spacing and right offset
        this._timeScaleInvalidations = [{ type: TimeScaleInvalidationType.FitContent }];
    }

    public applyRange(range: LogicalRange): void {
        this.stopTimeScaleAnimation();
        // modifies both bar spacing and right offset
        this._timeScaleInvalidations = [{ type: TimeScaleInvalidationType.ApplyRange, value: range }];
    }

    public setTimeScaleAnimation(animation: ITimeScaleAnimation): void {
        this._removeTimeScaleAnimation();
        this._timeScaleInvalidations.push({ type: TimeScaleInvalidationType.Animation, value: animation });
    }

    public stopTimeScaleAnimation(): void {
        this._removeTimeScaleAnimation();
        this._timeScaleInvalidations.push({ type: TimeScaleInvalidationType.StopAnimation });
    }

    public resetTimeScale(): void {
        this.stopTimeScaleAnimation();
        // modifies both bar spacing and right offset
        this._timeScaleInvalidations = [{ type: TimeScaleInvalidationType.Reset }];
    }

    public setBarSpacing(barSpacing: number): void {
        this.stopTimeScaleAnimation();
        this._timeScaleInvalidations.push({ type: TimeScaleInvalidationType.ApplyBarSpacing, value: barSpacing });
    }

    public setRightOffset(offset: number): void {
        this.stopTimeScaleAnimation();
        this._timeScaleInvalidations.push({ type: TimeScaleInvalidationType.ApplyRightOffset, value: offset });
    }

    public timeScaleInvalidations(): readonly TimeScaleInvalidation[] {
        return this._timeScaleInvalidations;
    }

    public merge(other: InvalidateMask): void {
        for (const tsInvalidation of other._timeScaleInvalidations) {
            this._applyTimeScaleInvalidation(tsInvalidation);
        }

        this._globalLevel = higherLevel(this._globalLevel, other._globalLevel);
        other._invalidatedPanes.forEach((invalidation: PaneInvalidation, index: number) => {
            this.invalidatePane(index, invalidation);
        });
    }

    public static light(): InvalidateMask {
        return new InvalidateMask(InvalidationLevel.Light);
    }

    public static full(): InvalidateMask {
        return new InvalidateMask(InvalidationLevel.Full);
    }

    private _applyTimeScaleInvalidation(invalidation: TimeScaleInvalidation): void {
        switch (invalidation.type) {
            case TimeScaleInvalidationType.FitContent:
                this.setFitContent();
                break;
            case TimeScaleInvalidationType.ApplyRange:
                this.applyRange(invalidation.value);
                break;
            case TimeScaleInvalidationType.ApplyBarSpacing:
                this.setBarSpacing(invalidation.value);
                break;
            case TimeScaleInvalidationType.ApplyRightOffset:
                this.setRightOffset(invalidation.value);
                break;
            case TimeScaleInvalidationType.Reset:
                this.resetTimeScale();
                break;
            case TimeScaleInvalidationType.Animation:
                this.setTimeScaleAnimation(invalidation.value);
                break;
            case TimeScaleInvalidationType.StopAnimation:
                this._removeTimeScaleAnimation();
        }
    }

    private _removeTimeScaleAnimation(): void {
        const index = this._timeScaleInvalidations.findIndex(
            (inv: TimeScaleInvalidation) => inv.type === TimeScaleInvalidationType.Animation,
        );
        if (index !== -1) {
            this._timeScaleInvalidations.splice(index, 1);
        }
    }
}
