import { describe, expect, it, vi } from 'vitest';

import { type DrawingStage, clickAt, pressKey, stage } from '@/lib/charting/__tests__/helpers/drawing-harness';
import { mouse } from '@/lib/charting/__tests__/helpers/pointer';
import { type FreehandPath, FreehandManager } from '@/lib/charting/drawings/freehand';

type Drawn = { stage: DrawingStage; tool: FreehandManager; overlay: HTMLElement };

const LINE = [
    { x: 200, y: 150 },
    { x: 240, y: 170 },
    { x: 280, y: 190 },
    { x: 320, y: 210 },
];

function tool(active = true): Drawn {
    const drawing = stage();
    const manager = new FreehandManager(drawing.chart, drawing.series);
    if (active) manager.activate();

    // The tool's own canvas is the one it just appended over the chart
    const canvases = drawing.chart.chartElement().querySelectorAll('canvas');
    const overlay = canvases[canvases.length - 1];
    if (overlay === undefined) throw new Error('the tool mounted no canvas');

    return { stage: drawing, tool: manager, overlay };
}

/** One stroke: press, a few moves, release. */
function stroke(drawn: Drawn, points: { x: number; y: number }[]): void {
    const [first, ...rest] = points;
    if (first === undefined) return;

    mouse(drawn.overlay, 'mousedown', first);
    for (const point of rest) mouse(drawn.overlay, 'mousemove', point);
    mouse(drawn.overlay, 'mouseup', points[points.length - 1] ?? first);
}

describe('drawing a stroke', () => {
    it('records every point the pointer passed through', () => {
        const drawn = tool();

        stroke(drawn, LINE);

        const path = drawn.tool.getPaths()[0] as FreehandPath;
        expect(drawn.tool.getPaths()).toHaveLength(1);
        expect(path.points.length).toBe(LINE.length);
        expect(path.id).toMatch(/^freehand_\d+_[a-z0-9]+$/);
    });

    it('anchors each point to a bar and a price rather than to pixels', () => {
        const drawn = tool();

        stroke(drawn, LINE);

        const path = drawn.tool.getPaths()[0] as FreehandPath;
        expect(path.points[0]?.time).toBeDefined();
        expect(path.points[0]?.price).toBeGreaterThan(0);
    });

    it('throws away a press that never moved', () => {
        const drawn = tool();

        stroke(drawn, [{ x: 200, y: 150 }]);

        expect(drawn.tool.getPaths()).toHaveLength(0);
    });

    it('tells its owner each time a stroke is finished', () => {
        const drawn = tool();
        const changed = vi.fn();
        drawn.tool.onChange(changed);

        stroke(drawn, LINE);

        expect(changed).toHaveBeenCalledTimes(1);
    });

    it('ends the stroke when the pointer leaves the canvas', () => {
        const drawn = tool();

        mouse(drawn.overlay, 'mousedown', LINE[0] ?? { x: 0, y: 0 });
        mouse(drawn.overlay, 'mousemove', LINE[1] ?? { x: 0, y: 0 });
        mouse(drawn.overlay, 'mouseleave', LINE[1] ?? { x: 0, y: 0 });

        expect(drawn.tool.getPaths()).toHaveLength(1);
    });

    it('draws nothing at all while the tool is put away', () => {
        const drawn = tool(false);

        stroke(drawn, LINE);

        expect(drawn.tool.getPaths()).toHaveLength(0);
    });

    it('takes the pointer only for as long as it is up', () => {
        const drawn = tool();
        expect(drawn.overlay.style.pointerEvents).toBe('auto');

        drawn.tool.deactivate();

        expect(drawn.overlay.style.pointerEvents).toBe('none');
    });
});

describe('selecting, moving and deleting a stroke', () => {
    it('selects the stroke a press lands on rather than starting a new one', () => {
        const drawn = tool();
        stroke(drawn, LINE);

        mouse(drawn.overlay, 'mousedown', { x: 240, y: 170 });
        mouse(drawn.overlay, 'mouseup', { x: 240, y: 170 });

        expect(drawn.tool.getPaths()).toHaveLength(1);
    });

    it('deletes the selected stroke on Delete', () => {
        const drawn = tool();
        stroke(drawn, LINE);
        mouse(drawn.overlay, 'mousedown', { x: 240, y: 170 });
        mouse(drawn.overlay, 'mouseup', { x: 240, y: 170 });

        pressKey('Delete');

        expect(drawn.tool.getPaths()).toHaveLength(0);
    });

    it('leaves it alone when Delete arrives from inside a text field', () => {
        const drawn = tool();
        stroke(drawn, LINE);
        mouse(drawn.overlay, 'mousedown', { x: 240, y: 170 });
        mouse(drawn.overlay, 'mouseup', { x: 240, y: 170 });
        const field = document.createElement('textarea');
        document.body.appendChild(field);

        pressKey('Delete', field);

        expect(drawn.tool.getPaths()).toHaveLength(1);
        field.remove();
    });

    it('moves the whole stroke on a second press and drag', () => {
        const drawn = tool();
        stroke(drawn, LINE);
        const before = (drawn.tool.getPaths()[0] as FreehandPath).points[0]?.price ?? 0;

        // The first press selects, the second one picks it up
        mouse(drawn.overlay, 'mousedown', { x: 240, y: 170 });
        mouse(drawn.overlay, 'mouseup', { x: 240, y: 170 });
        mouse(drawn.overlay, 'mousedown', { x: 240, y: 170 });
        mouse(drawn.overlay, 'mousemove', { x: 240, y: 230 });
        mouse(drawn.overlay, 'mouseup', { x: 240, y: 230 });

        expect((drawn.tool.getPaths()[0] as FreehandPath).points[0]?.price).not.toBe(before);
    });

    it('refuses to move a locked stroke', () => {
        const drawn = tool();
        stroke(drawn, LINE);
        const path = drawn.tool.getPaths()[0] as FreehandPath;
        drawn.tool.loadPaths([{ ...path, locked: true }]);
        const before = path.points[0]?.price;

        mouse(drawn.overlay, 'mousedown', { x: 240, y: 170 });
        mouse(drawn.overlay, 'mouseup', { x: 240, y: 170 });
        mouse(drawn.overlay, 'mousedown', { x: 240, y: 170 });
        mouse(drawn.overlay, 'mousemove', { x: 240, y: 230 });

        expect((drawn.tool.getPaths()[0] as FreehandPath).points[0]?.price).toBe(before);
    });

    it('deletes nothing while nothing is selected', () => {
        const drawn = tool();
        stroke(drawn, LINE);

        drawn.tool.removeSelectedPath();

        expect(drawn.tool.getPaths()).toHaveLength(1);
    });

    it('asks the toolbar to switch to it when one of its strokes is clicked while it is put away', () => {
        const drawn = tool();
        stroke(drawn, LINE);
        const activate = vi.fn();
        drawn.tool.onActivate(activate);

        drawn.tool.deactivate();
        clickAt(drawn.stage, 240, 170);

        expect(activate).toHaveBeenCalled();
    });

    it('stays put when a click while it is away lands on nothing', () => {
        const drawn = tool();
        stroke(drawn, LINE);
        const activate = vi.fn();
        drawn.tool.onActivate(activate);

        drawn.tool.deactivate();
        clickAt(drawn.stage, 450, 350);

        expect(activate).not.toHaveBeenCalled();
    });
});

describe('the overlay itself', () => {
    it('takes its canvas down and forgets its strokes on destroy', () => {
        const drawn = tool();
        stroke(drawn, LINE);
        const before = drawn.stage.chart.chartElement().querySelectorAll('canvas').length;

        drawn.tool.destroy();

        expect(drawn.stage.chart.chartElement().querySelectorAll('canvas')).toHaveLength(before - 1);
        expect(drawn.tool.getPaths()).toHaveLength(0);
    });

    it('toggles between drawing and not', () => {
        const drawn = tool();

        drawn.tool.toggle();
        expect(drawn.tool.isToolActive()).toBe(false);

        drawn.tool.toggle();
        expect(drawn.tool.isToolActive()).toBe(true);
    });

    it('redraws the strokes when the visible range moves and when the window resizes', () => {
        const drawn = tool();
        stroke(drawn, LINE);

        drawn.stage.chart.timeScale().setVisibleLogicalRange({ from: 10, to: 40 });
        window.dispatchEvent(new Event('resize'));

        expect(drawn.tool.getPaths()).toHaveLength(1);
    });

    it('takes a whole set of strokes at once', () => {
        const drawn = tool();
        stroke(drawn, LINE);
        const path = drawn.tool.getPaths()[0] as FreehandPath;

        drawn.tool.loadPaths([path, { ...path, id: 'fh_second', lineWidth: 4 }]);

        expect(drawn.tool.getPaths()).toHaveLength(2);
    });
});
