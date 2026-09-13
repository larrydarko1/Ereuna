/**
 * Walks a series' points as a path, straight or curved.
 *
 * The curve is a Catmull-Rom spline converted to beziers, with the control points
 * derived from each point's neighbours — which is why the walk needs the points
 * either side of the segment it is drawing.
 */
import { type BitmapCoordinatesRenderingScope } from 'fancy-canvas';
import { getDefined } from '@/lib/charting/engine/helpers/assertions';
import { type Coordinate } from '@/lib/charting/engine/model/coordinate';
import { type SeriesItemsIndexesRange } from '@/lib/charting/engine/model/time/time-data';
import { type LinePoint, LineType } from '@/lib/charting/engine/renderers/draw-line';

/** The stroke to walk: which points, in what shape, over which range. */
export type LinePath<TItem extends LinePoint> = {
    items: readonly TItem[];
    lineType: LineType;
    visibleRange: SeriesItemsIndexesRange;
    barWidth: number;
};

const curveTension = 6;

export function walkLine<TItem extends LinePoint, TStyle extends CanvasRenderingContext2D['fillStyle']>(
    renderingScope: BitmapCoordinatesRenderingScope,
    path: LinePath<TItem>,
    // the values returned by styleGetter are compared using the operator !==,
    // so if styleGetter returns objects, then styleGetter should return the same object for equal styles
    styleGetter: (renderingScope: BitmapCoordinatesRenderingScope, item: TItem) => TStyle,
    finishStyledArea: (
        renderingScope: BitmapCoordinatesRenderingScope,
        style: TStyle,
        areaFirstItem: LinePoint,
        newAreaFirstItem: LinePoint,
    ) => void,
): void {
    const { items, lineType, visibleRange, barWidth } = path;

    if (items.length === 0 || visibleRange.from >= items.length || visibleRange.to <= 0) {
        return;
    }

    const { context: ctx, horizontalPixelRatio, verticalPixelRatio } = renderingScope;

    const firstItem = items[visibleRange.from];
    if (firstItem === undefined) {
        return;
    }

    let currentStyle = styleGetter(renderingScope, firstItem);
    let currentStyleFirstItem = firstItem;

    if (visibleRange.to - visibleRange.from < 2) {
        const halfBarWidth = barWidth / 2;

        ctx.beginPath();

        const item1: LinePoint = { x: (firstItem.x - halfBarWidth) as Coordinate, y: firstItem.y };
        const item2: LinePoint = { x: (firstItem.x + halfBarWidth) as Coordinate, y: firstItem.y };

        ctx.moveTo(item1.x * horizontalPixelRatio, item1.y * verticalPixelRatio);
        ctx.lineTo(item2.x * horizontalPixelRatio, item2.y * verticalPixelRatio);

        finishStyledArea(renderingScope, currentStyle, item1, item2);
    } else {
        const changeStyle = (newStyle: TStyle, currentItem: TItem): void => {
            finishStyledArea(renderingScope, currentStyle, currentStyleFirstItem, currentItem);

            ctx.beginPath();
            currentStyle = newStyle;
            currentStyleFirstItem = currentItem;
        };

        // One segment of the stroke. A style change mid-step has to be made
        // between the two halves of the step, which is why WithSteps handles it
        // here rather than leaving it to the caller below.
        const appendSegment = (index: number, item: TItem, previous: TItem, itemStyle: TStyle): void => {
            switch (lineType) {
                case LineType.Simple:
                    ctx.lineTo(item.x * horizontalPixelRatio, item.y * verticalPixelRatio);
                    return;

                case LineType.WithSteps:
                    ctx.lineTo(item.x * horizontalPixelRatio, previous.y * verticalPixelRatio);

                    if (itemStyle !== currentStyle) {
                        changeStyle(itemStyle, item);
                        ctx.lineTo(item.x * horizontalPixelRatio, previous.y * verticalPixelRatio);
                    }

                    ctx.lineTo(item.x * horizontalPixelRatio, item.y * verticalPixelRatio);
                    return;

                case LineType.Curved: {
                    const [cp1, cp2] = getControlPoints(items, index - 1, index);
                    ctx.bezierCurveTo(
                        cp1.x * horizontalPixelRatio,
                        cp1.y * verticalPixelRatio,
                        cp2.x * horizontalPixelRatio,
                        cp2.y * verticalPixelRatio,
                        item.x * horizontalPixelRatio,
                        item.y * verticalPixelRatio,
                    );
                    return;
                }
            }
        };

        let currentItem = currentStyleFirstItem;

        ctx.beginPath();
        ctx.moveTo(firstItem.x * horizontalPixelRatio, firstItem.y * verticalPixelRatio);

        for (let i = visibleRange.from + 1; i < visibleRange.to; ++i) {
            const item = items[i];
            const previous = items[i - 1];
            if (item === undefined || previous === undefined) continue;

            currentItem = item;
            const itemStyle = styleGetter(renderingScope, currentItem);

            appendSegment(i, currentItem, previous, itemStyle);

            if (lineType !== LineType.WithSteps && itemStyle !== currentStyle) {
                changeStyle(itemStyle, currentItem);
                ctx.moveTo(currentItem.x * horizontalPixelRatio, currentItem.y * verticalPixelRatio);
            }
        }

        if (
            currentStyleFirstItem !== currentItem ||
            (currentStyleFirstItem === currentItem && lineType === LineType.WithSteps)
        ) {
            finishStyledArea(renderingScope, currentStyle, currentStyleFirstItem, currentItem);
        }
    }
}

function subtract(p1: LinePoint, p2: LinePoint): LinePoint {
    return { x: (p1.x - p2.x) as Coordinate, y: (p1.y - p2.y) as Coordinate };
}

function add(p1: LinePoint, p2: LinePoint): LinePoint {
    return { x: (p1.x + p2.x) as Coordinate, y: (p1.y + p2.y) as Coordinate };
}

function divide(p1: LinePoint, n: number): LinePoint {
    return { x: (p1.x / n) as Coordinate, y: (p1.y / n) as Coordinate };
}

/**
 * @returns Two control points that can be used as arguments to {@link CanvasRenderingContext2D.bezierCurveTo} to draw a curved line between `points[fromPointIndex]` and `points[toPointIndex]`.
 */
function getControlPoints(
    points: readonly LinePoint[],
    fromPointIndex: number,
    toPointIndex: number,
): [LinePoint, LinePoint] {
    // The indices are clamped into range above, so the only way one of these is
    // undefined is an empty `points`, which is not a case this can answer
    const from = getDefined(points[fromPointIndex]);
    const to = getDefined(points[toPointIndex]);
    const beforeFrom = getDefined(points[Math.max(0, fromPointIndex - 1)]);
    const afterTo = getDefined(points[Math.min(points.length - 1, toPointIndex + 1)]);

    const cp1 = add(from, divide(subtract(to, beforeFrom), curveTension));
    const cp2 = subtract(to, divide(subtract(afterTo, from), curveTension));

    return [cp1, cp2];
}
