import { type HoveredObject } from '@/lib/lightweight-charts/model/chart-model';
import { type Coordinate } from '@/lib/lightweight-charts/model/coordinate';
import { type IPriceDataSource } from '@/lib/lightweight-charts/model/iprice-data-source';
import {
    type PrimitiveHoveredItem,
    type SeriesPrimitivePaneViewZOrder,
} from '@/lib/lightweight-charts/model/iseries-primitive';
import { type Pane } from '@/lib/lightweight-charts/model/pane';
import { type IPaneView } from '@/lib/lightweight-charts/views/pane/ipane-view';

export type HitTestResult = {
    source: IPriceDataSource;
    object?: HoveredObject | undefined;
    view?: IPaneView | undefined;
    cursorStyle?: string | undefined;
};

export type HitTestPaneViewResult = {
    view: IPaneView;
    object?: HoveredObject;
};

type BestPrimitiveHit = {
    hit: PrimitiveHoveredItem;
    source: IPriceDataSource;
};

// returns true if item is above reference
function comparePrimitiveZOrder(
    item: SeriesPrimitivePaneViewZOrder,
    reference?: SeriesPrimitivePaneViewZOrder,
): boolean {
    return (
        reference === undefined ||
        (item === 'top' && reference !== 'top') ||
        (item === 'normal' && reference === 'bottom')
    );
}

function findBestPrimitiveHitTest(
    sources: readonly IPriceDataSource[],
    x: Coordinate,
    y: Coordinate,
): BestPrimitiveHit | null {
    let bestPrimitiveHit: PrimitiveHoveredItem | undefined;
    let bestHitSource: IPriceDataSource | undefined;
    for (const source of sources) {
        const primitiveHitResults = source.primitiveHitTest?.(x, y) ?? [];
        for (const hitResult of primitiveHitResults) {
            if (comparePrimitiveZOrder(hitResult.zOrder, bestPrimitiveHit?.zOrder)) {
                bestPrimitiveHit = hitResult;
                bestHitSource = source;
            }
        }
    }
    if (bestPrimitiveHit === undefined || bestHitSource === undefined) {
        return null;
    }
    return {
        hit: bestPrimitiveHit,
        source: bestHitSource,
    };
}

function convertPrimitiveHitResult(primitiveHit: BestPrimitiveHit): HitTestResult {
    return {
        source: primitiveHit.source,
        object: {
            externalId: primitiveHit.hit.externalId,
        },
        cursorStyle: primitiveHit.hit.cursorStyle,
    };
}

/**
 * Performs a hit test on a collection of pane views to determine which view and object
 * is located at a given coordinate (x, y) and returns the matching pane view and
 * hit-tested result object, or null if no match is found.
 */
function hitTestPaneView(paneViews: readonly IPaneView[], x: Coordinate, y: Coordinate): HitTestPaneViewResult | null {
    for (const paneView of paneViews) {
        const renderer = paneView.renderer();
        if (renderer !== null && renderer.hitTest !== undefined) {
            const result = renderer.hitTest(x, y);
            if (result !== null) {
                return {
                    view: paneView,
                    object: result,
                };
            }
        }
    }

    return null;
}

export function hitTestPane(pane: Pane, x: Coordinate, y: Coordinate): HitTestResult | null {
    const sources = pane.orderedSources();
    const bestPrimitiveHit = findBestPrimitiveHitTest(sources, x, y);
    if (bestPrimitiveHit?.hit.zOrder === 'top') {
        // a primitive hit on the 'top' layer will always beat the built-in hit tests
        // (on normal layer) so we can return early here.
        return convertPrimitiveHitResult(bestPrimitiveHit);
    }
    for (const source of sources) {
        if (
            bestPrimitiveHit !== null &&
            bestPrimitiveHit.source === source &&
            bestPrimitiveHit.hit.zOrder !== 'bottom' &&
            bestPrimitiveHit.hit.isBackground !== true
        ) {
            // a primitive will be drawn above a built-in item like a series marker
            // therefore it takes precedence here.
            return convertPrimitiveHitResult(bestPrimitiveHit);
        }
        const sourceResult = hitTestPaneView(source.paneViews(pane), x, y);
        if (sourceResult !== null) {
            return {
                source: source,
                view: sourceResult.view,
                object: sourceResult.object,
                cursorStyle:
                    sourceResult.object?.externalId === undefined || sourceResult.object.externalId === ''
                        ? undefined
                        : 'pointer',
            };
        }
        if (
            bestPrimitiveHit !== null &&
            bestPrimitiveHit.source === source &&
            bestPrimitiveHit.hit.zOrder !== 'bottom' &&
            bestPrimitiveHit.hit.isBackground === true
        ) {
            return convertPrimitiveHitResult(bestPrimitiveHit);
        }
    }
    if (bestPrimitiveHit !== null) {
        // return primitive hits for the 'bottom' layer
        return convertPrimitiveHitResult(bestPrimitiveHit);
    }

    return null;
}
