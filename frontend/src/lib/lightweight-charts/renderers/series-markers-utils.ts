import { ceiledEven, ceiledOdd } from '@/lib/lightweight-charts/helpers/mathex';

import { type SeriesMarkerShape } from '@/lib/lightweight-charts/model/series-markers';

const Constants = {
    MinShapeSize: 12,
    MaxShapeSize: 30,
    MinShapeMargin: 3,
} as const;
type Constants = (typeof Constants)[keyof typeof Constants];

function size(barSpacing: number, coeff: number): number {
    const result = Math.min(Math.max(barSpacing, Constants.MinShapeSize), Constants.MaxShapeSize) * coeff;
    return ceiledOdd(result);
}

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

export type BitmapShapeItemCoordinates = {
    x: number;
    y: number;
    pixelRatio: number;
}

export function calculateAdjustedMargin(margin: number, hasSide: boolean, hasInBar: boolean): number {
    if (hasSide) {
        return margin;
    } if (hasInBar) {
        return Math.ceil(margin / 2);
    }

    return 0;
}
