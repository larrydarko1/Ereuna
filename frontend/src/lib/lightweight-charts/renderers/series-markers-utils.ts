/**
 * How big a marker is at a given bar spacing, and how far it sits from its
 * bar.
 *
 * Sizes are forced odd so that a marker has a true centre pixel to sit on the
 * bar's centre.
 */
import { ceiledEven, ceiledOdd } from '@/lib/lightweight-charts/helpers/mathex';
import { type SeriesMarkerShape } from '@/lib/lightweight-charts/model/series-markers';

type Constants = (typeof Constants)[keyof typeof Constants];

export type BitmapShapeItemCoordinates = {
    x: number;
    y: number;
    pixelRatio: number;
};

const Constants = {
    MinShapeSize: 12,
    MaxShapeSize: 30,
    MinShapeMargin: 3,
} as const;

export function shapeSize(shape: SeriesMarkerShape, originalSize: number): number {
    switch (shape) {
        case 'arrowDown':
        case 'arrowUp':
            return size(originalSize, 1);
        case 'circle':
            return size(originalSize, 0.8);
        case 'square':
        case 'roundedSquare':
            return size(originalSize, 0.7);
    }
}

export function calculateShapeHeight(barSpacing: number): number {
    return ceiledEven(size(barSpacing, 1));
}

export function shapeMargin(barSpacing: number): number {
    return Math.max(size(barSpacing, 0.1), Constants.MinShapeMargin);
}

/**
 * How much room the markers need above or below the bars: the full margin when
 * something sits outside the bar on that side, half when it only sits inside it.
 */
export function calculateAdjustedMargin(margin: number, placement: { hasSide: boolean; hasInBar: boolean }): number {
    if (placement.hasSide) {
        return margin;
    }

    if (placement.hasInBar) {
        return Math.ceil(margin / 2);
    }

    return 0;
}

function size(barSpacing: number, coeff: number): number {
    const result = Math.min(Math.max(barSpacing, Constants.MinShapeSize), Constants.MaxShapeSize) * coeff;
    return ceiledOdd(result);
}
