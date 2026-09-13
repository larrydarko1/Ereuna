/**
 * Picks the spacing between price marks: the smallest step from the allowed
 * set that still leaves the labels far enough apart to read.
 */
import { getDefined } from '@/lib/charting/engine/helpers/assertions';
import { equal, greaterOrEqual, isBaseDecimal } from '@/lib/charting/engine/helpers/mathex';

type Constants = (typeof Constants)[keyof typeof Constants];

const Constants = {
    TickSpanEpsilon: 1e-14,
} as const;

export class PriceTickSpanCalculator {
    private readonly _base: number;
    private readonly _integralDividers: number[];
    private readonly _fractionalDividers: number[];

    public constructor(base: number, integralDividers: number[]) {
        this._base = base;
        this._integralDividers = integralDividers;

        if (isBaseDecimal(this._base)) {
            this._fractionalDividers = [2, 2.5, 2];
        } else {
            this._fractionalDividers = [];
            for (let baseRest = this._base; baseRest !== 1;) {
                if (baseRest % 2 === 0) {
                    this._fractionalDividers.push(2);
                    baseRest /= 2;
                } else if (baseRest % 5 === 0) {
                    this._fractionalDividers.push(2, 2.5);
                    baseRest /= 5;
                } else {
                    throw new Error('unexpected base');
                }

                if (this._fractionalDividers.length > 100) {
                    throw new Error('something wrong with base');
                }
            }
        }
    }

    public tickSpan(high: number, low: number, maxTickSpan: number): number {
        const minMovement = this._base === 0 ? 0 : 1 / this._base;

        let resultTickSpan = Math.pow(10, Math.max(0, Math.ceil(Math.log10(high - low))));

        let index = 0;
        let divider = getDefined(this._integralDividers[0]);

        while (true) {
            // the second part is actual for small with very small values like 1e-10
            // greaterOrEqual fails for such values
            const resultTickSpanLargerMinMovement =
                greaterOrEqual(resultTickSpan, minMovement, Constants.TickSpanEpsilon) &&
                resultTickSpan > minMovement + Constants.TickSpanEpsilon;
            const resultTickSpanLargerMaxTickSpan = greaterOrEqual(
                resultTickSpan,
                maxTickSpan * divider,
                Constants.TickSpanEpsilon,
            );
            const resultTickSpanLarger1 = greaterOrEqual(resultTickSpan, 1, Constants.TickSpanEpsilon);
            const haveToContinue =
                resultTickSpanLargerMinMovement && resultTickSpanLargerMaxTickSpan && resultTickSpanLarger1;
            if (!haveToContinue) {
                break;
            }
            resultTickSpan /= divider;
            divider = getDefined(this._integralDividers[++index % this._integralDividers.length]);
        }

        if (resultTickSpan <= minMovement + Constants.TickSpanEpsilon) {
            resultTickSpan = minMovement;
        }

        resultTickSpan = Math.max(1, resultTickSpan);

        if (this._fractionalDividers.length > 0 && equal(resultTickSpan, 1, Constants.TickSpanEpsilon)) {
            index = 0;
            divider = getDefined(this._fractionalDividers[0]);
            while (
                greaterOrEqual(resultTickSpan, maxTickSpan * divider, Constants.TickSpanEpsilon) &&
                resultTickSpan > minMovement + Constants.TickSpanEpsilon
            ) {
                resultTickSpan /= divider;
                divider = getDefined(this._fractionalDividers[++index % this._fractionalDividers.length]);
            }
        }

        return resultTickSpan;
    }
}
