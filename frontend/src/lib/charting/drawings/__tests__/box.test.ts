import { describe, expect, it, vi } from 'vitest';

import { type DrawingStage, clickAt, moveTo, pressKey, stage } from '@/lib/charting/__tests__/helpers/drawing-harness';
import { type Box, BoxManager } from '@/lib/charting/drawings/box';
import { boundsOf } from '@/lib/charting/drawings/box-shape';

type Drawn = { stage: DrawingStage; tool: BoxManager };

function tool(): Drawn {
    const drawing = stage();
    const manager = new BoxManager(drawing.chart, drawing.series);
    manager.activate();
    return { stage: drawing, tool: manager };
}

/** Two clicks, which is one finished box. */
function drawBox(drawn: Drawn, from: { x: number; y: number }, to: { x: number; y: number }): void {
    clickAt(drawn.stage, from.x, from.y);
    clickAt(drawn.stage, to.x, to.y);
}

function only(drawn: Drawn): Box {
    const box = drawn.tool.getBoxes()[0];
    if (box === undefined) throw new Error('no box was drawn');
    return box;
}

describe('drawing a box', () => {
    it('takes two clicks to make one, and the first alone makes none', () => {
        const drawn = tool();

        clickAt(drawn.stage, 200, 120);
        expect(drawn.tool.getBoxes()).toHaveLength(0);

        clickAt(drawn.stage, 400, 260);
        expect(drawn.tool.getBoxes()).toHaveLength(1);
    });

    it('stores both corners in time and price', () => {
        const drawn = tool();

        drawBox(drawn, { x: 200, y: 120 }, { x: 400, y: 260 });

        const box = only(drawn);
        expect(box.point1.time).toBeDefined();
        expect(box.point1.price).toBeGreaterThan(box.point2.price);
        expect(box.id).toMatch(/^box_\d+_[a-z0-9]+$/);
    });

    it('previews the far corner against the pointer while only one is placed', () => {
        const drawn = tool();

        clickAt(drawn.stage, 200, 120);
        moveTo(drawn.stage, 380, 240);

        expect(drawn.tool.getBoxes()).toHaveLength(0);
    });

    it('tells its owner each time a box is finished', () => {
        const drawn = tool();
        const changed = vi.fn();
        drawn.tool.onChange(changed);

        drawBox(drawn, { x: 200, y: 120 }, { x: 400, y: 260 });

        expect(changed).toHaveBeenCalledTimes(1);
    });

    it('drops a half-drawn box when the tool is put away', () => {
        const drawn = tool();
        clickAt(drawn.stage, 200, 120);

        drawn.tool.deactivate();
        drawn.tool.activate();
        clickAt(drawn.stage, 400, 260);

        expect(drawn.tool.getBoxes()).toHaveLength(0);
    });
});

describe('selecting and deleting a box', () => {
    it('selects the box a click inside it lands on and deletes it on Delete', () => {
        const drawn = tool();
        drawBox(drawn, { x: 200, y: 120 }, { x: 400, y: 260 });

        clickAt(drawn.stage, 300, 190);
        pressKey('Delete');

        expect(drawn.tool.getBoxes()).toHaveLength(0);
    });

    it('deletes nothing while nothing is selected', () => {
        const drawn = tool();
        drawBox(drawn, { x: 200, y: 120 }, { x: 400, y: 260 });

        drawn.tool.removeSelectedBox();

        expect(drawn.tool.getBoxes()).toHaveLength(1);
    });

    it('asks the toolbar to switch to it when one of its boxes is clicked while it is put away', () => {
        const drawn = tool();
        drawBox(drawn, { x: 200, y: 120 }, { x: 400, y: 260 });
        const activate = vi.fn();
        drawn.tool.onActivate(activate);

        drawn.tool.deactivate();
        clickAt(drawn.stage, 300, 190);

        expect(activate).toHaveBeenCalled();
    });
});

describe('moving and resizing a box', () => {
    it('moves the whole box when its body is dragged', () => {
        const drawn = tool();
        drawBox(drawn, { x: 200, y: 120 }, { x: 400, y: 260 });
        const before = boundsOf(only(drawn));
        const width = before.right - before.left;

        clickAt(drawn.stage, 300, 190);
        moveTo(drawn.stage, 340, 210);
        clickAt(drawn.stage, 340, 210);

        const after = boundsOf(only(drawn));
        expect(after.left).not.toBeCloseTo(before.left, 0);
        expect(after.right - after.left).toBeCloseTo(width, 0);
    });

    it('moves only the grabbed corner when a corner is dragged', () => {
        const drawn = tool();
        drawBox(drawn, { x: 200, y: 120 }, { x: 400, y: 260 });
        const before = boundsOf(only(drawn));

        clickAt(drawn.stage, before.left, before.top);
        moveTo(drawn.stage, before.left + 60, before.top + 40);
        clickAt(drawn.stage, before.left + 60, before.top + 40);

        const after = boundsOf(only(drawn));
        expect(after.right).toBeCloseTo(before.right, 0);
        expect(after.bottom).toBeCloseTo(before.bottom, 0);
        expect(after.left).toBeGreaterThan(before.left);
    });

    it('refuses to move a locked box', () => {
        const drawn = tool();
        drawBox(drawn, { x: 200, y: 120 }, { x: 400, y: 260 });
        const box = only(drawn);
        drawn.tool.loadBoxes([{ ...box, locked: true }]);
        const before = boundsOf(only(drawn));

        clickAt(drawn.stage, 300, 190);
        moveTo(drawn.stage, 360, 220);

        expect(boundsOf(only(drawn)).left).toBeCloseTo(before.left, 0);
    });
});

describe('boxes loaded from somewhere else', () => {
    it('takes a whole set at once and hands back a copy of the list', () => {
        const drawn = tool();
        drawBox(drawn, { x: 200, y: 120 }, { x: 400, y: 260 });
        const box = only(drawn);

        drawn.tool.loadBoxes([box, { ...box, id: 'box_second' }]);
        drawn.tool.getBoxes().pop();

        expect(drawn.tool.getBoxes()).toHaveLength(2);
    });

    it('draws a box with no fill and one with a thick border alike', () => {
        const drawn = tool();
        drawBox(drawn, { x: 200, y: 120 }, { x: 400, y: 260 });
        const box = only(drawn);

        drawn.tool.loadBoxes([
            { ...box, id: 'box_clear', fillOpacity: 0 },
            { ...box, id: 'box_thick', borderWidth: 4 },
        ]);

        expect(drawn.tool.getBoxes()).toHaveLength(2);
    });
});

describe('the overlay itself', () => {
    it('mounts a canvas over the chart and takes it down on destroy', () => {
        const drawing = stage();
        const before = drawing.chart.chartElement().querySelectorAll('canvas').length;

        const manager = new BoxManager(drawing.chart, drawing.series);
        const during = drawing.chart.chartElement().querySelectorAll('canvas').length;
        manager.destroy();

        expect(during).toBe(before + 1);
        expect(drawing.chart.chartElement().querySelectorAll('canvas')).toHaveLength(before);
    });

    it('toggles between drawing and not', () => {
        const drawn = tool();

        drawn.tool.toggle();
        expect(drawn.tool.isToolActive()).toBe(false);

        drawn.tool.toggle();
        expect(drawn.tool.isToolActive()).toBe(true);
    });

    it('redraws the boxes when the visible range moves', () => {
        const drawn = tool();
        drawBox(drawn, { x: 200, y: 120 }, { x: 400, y: 260 });

        drawn.stage.chart.timeScale().setVisibleLogicalRange({ from: 10, to: 40 });

        expect(drawn.tool.getBoxes()).toHaveLength(1);
    });
});
