import { describe, expect, it } from 'vitest';

import { boundsOf, cornersOf, generateBoxId, resizeBox } from '@/lib/charting/drawings/box-shape';
import { type Box, type BoxPoint } from '@/lib/charting/drawings/box-types';

function point(x: number, y: number): BoxPoint {
    // Price runs opposite to a canvas y, which is what makes a corner drag carry
    // both halves of the same point
    return { time: x as BoxPoint['time'], price: -y, x, y };
}

function boxFrom(first: BoxPoint, second: BoxPoint): Box {
    return {
        id: 'box_test',
        point1: first,
        point2: second,
        fillColor: '#2962ff',
        borderColor: '#2962ff',
        fillOpacity: 0.15,
        borderWidth: 1,
        locked: false,
    };
}

describe('boundsOf', () => {
    it('reads the edges off a box drawn top-left to bottom-right', () => {
        expect(boundsOf(boxFrom(point(10, 20), point(60, 80)))).toEqual({
            left: 10,
            top: 20,
            right: 60,
            bottom: 80,
        });
    });

    it('reads the same edges off the same box drawn from the opposite corner', () => {
        expect(boundsOf(boxFrom(point(60, 80), point(10, 20)))).toEqual({
            left: 10,
            top: 20,
            right: 60,
            bottom: 80,
        });
    });
});

describe('cornersOf', () => {
    it('places each corner at the edges its name says, whichever way the box was drawn', () => {
        const drawn = cornersOf(boxFrom(point(60, 80), point(10, 20)));

        expect(drawn).toEqual([
            { corner: 'tl', x: 10, y: 20 },
            { corner: 'tr', x: 60, y: 20 },
            { corner: 'bl', x: 10, y: 80 },
            { corner: 'br', x: 60, y: 80 },
        ]);
    });
});

describe('resizeBox', () => {
    it('moves the grabbed corner and leaves the opposite one alone', () => {
        const box = boxFrom(point(10, 20), point(60, 80));

        resizeBox(box, 'tl', point(30, 40));

        expect(boundsOf(box)).toEqual({ left: 30, top: 40, right: 60, bottom: 80 });
    });

    it('moves one edge of each axis when a side corner is grabbed', () => {
        const box = boxFrom(point(10, 20), point(60, 80));

        resizeBox(box, 'tr', point(90, 5));

        expect(boundsOf(box)).toEqual({ left: 10, top: 5, right: 90, bottom: 80 });
    });

    it('moves the corner it was told to whichever diagonal the box was drawn along', () => {
        // `point1` is only the corner clicked first — here it holds the right
        // edge, so a top-left drag that moved `point1` would flip the box
        const box = boxFrom(point(60, 80), point(10, 20));

        resizeBox(box, 'tl', point(30, 40));

        expect(boundsOf(box)).toEqual({ left: 30, top: 40, right: 60, bottom: 80 });
    });

    it('moves the right corner for every diagonal a box can be drawn along', () => {
        const drawn = [
            [point(10, 20), point(60, 80)],
            [point(60, 80), point(10, 20)],
            [point(60, 20), point(10, 80)],
            [point(10, 80), point(60, 20)],
        ] as const;

        for (const [first, second] of drawn) {
            const box = boxFrom({ ...first }, { ...second });
            resizeBox(box, 'br', point(90, 95));

            expect(boundsOf(box)).toEqual({ left: 10, top: 20, right: 90, bottom: 95 });
        }
    });

    it('carries the price and the time of the grabbed corner, not just its pixels', () => {
        const box = boxFrom(point(10, 20), point(60, 80));

        resizeBox(box, 'br', point(90, 95));

        expect(box.point2).toEqual(point(90, 95));
    });
});

describe('generateBoxId', () => {
    it('answers with a fresh id every time', () => {
        const ids = new Set(Array.from({ length: 100 }, () => generateBoxId()));

        expect(ids.size).toBe(100);
    });

    it('marks the id as a box so nothing else can collide with it', () => {
        expect(generateBoxId()).toMatch(/^box_\d+_[a-z0-9]+$/);
    });
});
