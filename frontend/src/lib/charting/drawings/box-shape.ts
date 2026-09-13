/**
 * The geometry of a box, apart from the tool that edits one.
 *
 * A box is stored as the two corners that were clicked, which may be any
 * diagonal pair — so nothing may assume `point1` is the top-left, and
 * everything that needs edges goes through `boundsOf`.
 */
import { type Box, type BoxCorner, type BoxPoint } from '@/lib/charting/drawings/box-types';

export type Bounds = { left: number; top: number; right: number; bottom: number };

export function boundsOf(box: Box): Bounds {
    return {
        left: Math.min(box.point1.x, box.point2.x),
        top: Math.min(box.point1.y, box.point2.y),
        right: Math.max(box.point1.x, box.point2.x),
        bottom: Math.max(box.point1.y, box.point2.y),
    };
}

/** The four corners of a box, in the order a hit test should try them. */
export function cornersOf(box: Box): { corner: BoxCorner; x: number; y: number }[] {
    const bounds = boundsOf(box);

    return [
        { corner: 'tl', x: bounds.left, y: bounds.top },
        { corner: 'tr', x: bounds.right, y: bounds.top },
        { corner: 'bl', x: bounds.left, y: bounds.bottom },
        { corner: 'br', x: bounds.right, y: bounds.bottom },
    ];
}

/**
 * Drags the one grabbed corner, keeping the two edges it is not on where they
 * are — a corner owns one edge of each axis, not a whole point.
 *
 * Which stored point holds which edge is worked out first, because `point1` is
 * only the corner that was clicked first: a box dragged out right-to-left holds
 * its left edge in `point2`, and moving the wrong one turns a resize into a
 * flip.
 */
export function resizeBox(box: Box, corner: BoxCorner, pointer: BoxPoint): void {
    const [leftPoint, rightPoint] = box.point1.x <= box.point2.x ? [box.point1, box.point2] : [box.point2, box.point1];
    const [topPoint, bottomPoint] = box.point1.y <= box.point2.y ? [box.point1, box.point2] : [box.point2, box.point1];

    // A canvas y grows downward, so the top edge is the smaller one
    const movedHorizontally = corner === 'tl' || corner === 'bl' ? leftPoint : rightPoint;
    const movedVertically = corner === 'tl' || corner === 'tr' ? topPoint : bottomPoint;

    movedHorizontally.time = pointer.time;
    movedHorizontally.x = pointer.x;
    movedVertically.price = pointer.price;
    movedVertically.y = pointer.y;
}

export function generateBoxId(): string {
    return `box_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
