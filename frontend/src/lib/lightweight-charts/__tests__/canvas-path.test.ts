import { beforeEach, describe, expect, it, vi } from 'vitest';

import { drawHandle, traceRoundedRect } from '@/lib/lightweight-charts/canvas-path';

/**
 * jsdom has no 2D context, so the calls are recorded instead of rasterised —
 * what these functions are responsible for is the path they trace and the order
 * they trace it in, not the pixels a real canvas would produce.
 */
function recordingContext(): CanvasRenderingContext2D & { calls: string[] } {
    const calls: string[] = [];
    const record =
        (name: string) =>
        (...args: unknown[]): void => {
            calls.push(`${name}(${args.join(',')})`);
        };

    return {
        calls,
        beginPath: record('beginPath'),
        closePath: record('closePath'),
        moveTo: record('moveTo'),
        lineTo: record('lineTo'),
        quadraticCurveTo: record('quadraticCurveTo'),
        arc: record('arc'),
        fill: record('fill'),
        stroke: record('stroke'),
    } as unknown as CanvasRenderingContext2D & { calls: string[] };
}

describe('traceRoundedRect', () => {
    let ctx: CanvasRenderingContext2D & { calls: string[] };

    beforeEach(() => {
        ctx = recordingContext();
    });

    it('opens a path and closes it, leaving the fill to the caller', () => {
        traceRoundedRect(ctx, { x: 0, y: 0, width: 100, height: 50, radius: 8 });

        expect(ctx.calls[0]).toBe('beginPath()');
        expect(ctx.calls[ctx.calls.length - 1]).toBe('closePath()');
        expect(ctx.calls).not.toContain('fill()');
        expect(ctx.calls).not.toContain('stroke()');
    });

    it('rounds all four corners', () => {
        traceRoundedRect(ctx, { x: 0, y: 0, width: 100, height: 50, radius: 8 });

        expect(ctx.calls.filter((c) => c.startsWith('quadraticCurveTo'))).toHaveLength(4);
    });

    it('starts one radius in from the top-left and returns there', () => {
        traceRoundedRect(ctx, { x: 10, y: 20, width: 100, height: 50, radius: 8 });

        expect(ctx.calls[1]).toBe('moveTo(18,20)');
        expect(ctx.calls).toContain('quadraticCurveTo(10,20,18,20)');
    });

    it('keeps the traced box inside the bounds it was given', () => {
        traceRoundedRect(ctx, { x: 10, y: 20, width: 100, height: 50, radius: 8 });

        const coordinates = ctx.calls
            .flatMap((call) => call.replace(/^\w+\(|\)$/g, '').split(','))
            .filter((value) => value !== '')
            .map(Number);
        const xs = coordinates.filter((_, i) => i % 2 === 0);
        const ys = coordinates.filter((_, i) => i % 2 === 1);

        expect(Math.min(...xs)).toBe(10);
        expect(Math.max(...xs)).toBe(110);
        expect(Math.min(...ys)).toBe(20);
        expect(Math.max(...ys)).toBe(70);
    });

    it('does not use the native roundRect, which Safari 14 does not have', () => {
        const roundRect = vi.fn();
        traceRoundedRect({ ...ctx, roundRect } as unknown as CanvasRenderingContext2D, {
            x: 0,
            y: 0,
            width: 10,
            height: 10,
            radius: 2,
        });

        expect(roundRect).not.toHaveBeenCalled();
    });
});

describe('drawHandle', () => {
    it('paints the ring, then the hole over it', () => {
        const ctx = recordingContext();

        drawHandle(ctx, { x: 40, y: 60 }, { radius: 5, color: '#2962ff', holeColor: '#101014' });

        expect(ctx.calls).toEqual([
            'beginPath()',
            `arc(40,60,5,0,${2 * Math.PI})`,
            'fill()',
            'stroke()',
            'beginPath()',
            `arc(40,60,3.5,0,${2 * Math.PI})`,
            'fill()',
        ]);
    });

    it('fills the hole with the background colour rather than cutting it out', () => {
        const ctx = recordingContext();

        drawHandle(ctx, { x: 0, y: 0 }, { radius: 4, color: '#2962ff', holeColor: '#101014' });

        // The last fill is the hole, so the style it was left on is the one the
        // hole was painted with — a composite would have taken the chart with it
        expect(ctx.fillStyle).toBe('#101014');
        expect(ctx.strokeStyle).toBe('#101014');
    });
});
