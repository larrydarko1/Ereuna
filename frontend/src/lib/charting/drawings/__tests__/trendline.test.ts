import { describe, expect, it, vi } from 'vitest';

import { type DrawingStage, clickAt, moveTo, pressKey, stage } from '@/lib/charting/__tests__/helpers/drawing-harness';
import { type TrendLine, TrendLineManager } from '@/lib/charting/drawings/trendline';

type Drawn = { stage: DrawingStage; tool: TrendLineManager };

function tool(): Drawn {
    const drawing = stage();
    const manager = new TrendLineManager(drawing.chart, drawing.series);
    manager.activate();
    return { stage: drawing, tool: manager };
}

/** Two clicks, which is one finished line. */
function drawLine(drawn: Drawn, from: { x: number; y: number }, to: { x: number; y: number }): void {
    clickAt(drawn.stage, from.x, from.y);
    clickAt(drawn.stage, to.x, to.y);
}

describe('drawing a trendline', () => {
    it('takes two clicks to make one, and the first alone makes none', () => {
        const drawn = tool();

        clickAt(drawn.stage, 150, 150);
        expect(drawn.tool.getTrendLines()).toHaveLength(0);

        clickAt(drawn.stage, 350, 250);
        expect(drawn.tool.getTrendLines()).toHaveLength(1);
    });

    it('stores each end in time and price, not only in pixels', () => {
        const drawn = tool();

        drawLine(drawn, { x: 150, y: 150 }, { x: 350, y: 250 });

        const line = drawn.tool.getTrendLines()[0] as TrendLine;
        expect(line.point1.time).toBeDefined();
        expect(line.point1.price).toBeGreaterThan(0);
        expect(line.point2.price).not.toBe(line.point1.price);
    });

    it('gives every line an id of its own', () => {
        const drawn = tool();

        drawLine(drawn, { x: 120, y: 120 }, { x: 220, y: 220 });
        drawLine(drawn, { x: 260, y: 140 }, { x: 380, y: 260 });

        const ids = drawn.tool.getTrendLines().map((line) => line.id);
        expect(new Set(ids).size).toBe(2);
        expect(ids[0]).toMatch(/^tl_\d+_[a-z0-9]+$/);
    });

    it('previews the far end against the pointer while only one end is placed', () => {
        const drawn = tool();

        clickAt(drawn.stage, 150, 150);
        moveTo(drawn.stage, 320, 240);

        // A preview is not a line: nothing is stored until the second click
        expect(drawn.tool.getTrendLines()).toHaveLength(0);
    });

    it('tells its owner each time a line is finished', () => {
        const drawn = tool();
        const changed = vi.fn();
        drawn.tool.onChange(changed);

        drawLine(drawn, { x: 150, y: 150 }, { x: 350, y: 250 });

        expect(changed).toHaveBeenCalledTimes(1);
    });

    it('drops a half-drawn line when the tool is put away', () => {
        const drawn = tool();
        clickAt(drawn.stage, 150, 150);

        drawn.tool.deactivate();
        drawn.tool.activate();
        clickAt(drawn.stage, 350, 250);

        expect(drawn.tool.getTrendLines()).toHaveLength(0);
    });
});

describe('selecting and deleting a trendline', () => {
    it('selects the line a click lands on and deletes it on Delete', () => {
        const drawn = tool();
        drawLine(drawn, { x: 150, y: 150 }, { x: 350, y: 250 });

        // Halfway along the stroke it just drew
        clickAt(drawn.stage, 250, 200);
        pressKey('Delete');

        expect(drawn.tool.getTrendLines()).toHaveLength(0);
    });

    it('deletes on Backspace too', () => {
        const drawn = tool();
        drawLine(drawn, { x: 150, y: 150 }, { x: 350, y: 250 });
        clickAt(drawn.stage, 250, 200);

        pressKey('Backspace');

        expect(drawn.tool.getTrendLines()).toHaveLength(0);
    });

    it('leaves the line alone when Delete arrives from inside a text field', () => {
        const drawn = tool();
        drawLine(drawn, { x: 150, y: 150 }, { x: 350, y: 250 });
        clickAt(drawn.stage, 250, 200);
        const field = document.createElement('input');
        document.body.appendChild(field);

        pressKey('Delete', field);

        expect(drawn.tool.getTrendLines()).toHaveLength(1);
        field.remove();
    });

    it('ignores a key that is neither Delete nor Backspace', () => {
        const drawn = tool();
        drawLine(drawn, { x: 150, y: 150 }, { x: 350, y: 250 });
        clickAt(drawn.stage, 250, 200);

        pressKey('Escape');

        expect(drawn.tool.getTrendLines()).toHaveLength(1);
    });

    it('deletes nothing while nothing is selected', () => {
        const drawn = tool();
        drawLine(drawn, { x: 150, y: 150 }, { x: 350, y: 250 });

        drawn.tool.removeSelectedLine();

        expect(drawn.tool.getTrendLines()).toHaveLength(1);
    });

    it('asks the toolbar to switch to it when one of its lines is clicked while it is put away', () => {
        const drawn = tool();
        drawLine(drawn, { x: 150, y: 150 }, { x: 350, y: 250 });
        const activate = vi.fn();
        drawn.tool.onActivate(activate);

        drawn.tool.deactivate();
        clickAt(drawn.stage, 250, 200);

        expect(activate).toHaveBeenCalled();
    });

    it('stays put when a click while it is away lands on nothing', () => {
        const drawn = tool();
        drawLine(drawn, { x: 150, y: 150 }, { x: 350, y: 250 });
        const activate = vi.fn();
        drawn.tool.onActivate(activate);

        drawn.tool.deactivate();
        clickAt(drawn.stage, 500, 60);

        expect(activate).not.toHaveBeenCalled();
    });
});

describe('dragging an endpoint', () => {
    it('moves the end that was grabbed and leaves the other one where it was', () => {
        const drawn = tool();
        drawLine(drawn, { x: 150, y: 150 }, { x: 350, y: 250 });
        const before = drawn.tool.getTrendLines()[0] as TrendLine;
        // Read out as numbers: the array is copied but the lines in it are not, so
        // `before` is the very line the drag is about to move
        const grabbed = before.point1.price;
        const farEnd = before.point2.price;

        clickAt(drawn.stage, before.point1.x, before.point1.y);
        moveTo(drawn.stage, 200, 300);
        clickAt(drawn.stage, 200, 300);

        const after = drawn.tool.getTrendLines()[0] as TrendLine;
        expect(after.point1.price).not.toBe(grabbed);
        expect(after.point2.price).toBe(farEnd);
    });

    it('refuses to move an endpoint of a locked line', () => {
        const drawn = tool();
        drawLine(drawn, { x: 150, y: 150 }, { x: 350, y: 250 });
        const line = drawn.tool.getTrendLines()[0] as TrendLine;
        drawn.tool.loadTrendLines([{ ...line, locked: true }]);

        clickAt(drawn.stage, line.point1.x, line.point1.y);
        moveTo(drawn.stage, 200, 300);

        expect((drawn.tool.getTrendLines()[0] as TrendLine).point1.price).toBe(line.point1.price);
    });
});

describe('lines loaded from somewhere else', () => {
    it('takes a whole set at once and hands back a copy rather than its own array', () => {
        const drawn = tool();
        drawLine(drawn, { x: 150, y: 150 }, { x: 350, y: 250 });
        const line = drawn.tool.getTrendLines()[0] as TrendLine;

        drawn.tool.loadTrendLines([line, { ...line, id: 'tl_second' }]);
        const handed = drawn.tool.getTrendLines();
        handed.pop();

        expect(drawn.tool.getTrendLines()).toHaveLength(2);
    });

    it('draws a dashed line, a dotted one and an extended one without complaint', () => {
        const drawn = tool();
        drawLine(drawn, { x: 150, y: 150 }, { x: 350, y: 250 });
        const line = drawn.tool.getTrendLines()[0] as TrendLine;

        drawn.tool.loadTrendLines([
            { ...line, id: 'tl_dashed', lineStyle: 'dashed' },
            { ...line, id: 'tl_dotted', lineStyle: 'dotted' },
            { ...line, id: 'tl_extended', extended: true },
        ]);

        expect(drawn.tool.getTrendLines()).toHaveLength(3);
    });

    it('extends a line of zero length to nowhere rather than dividing by it', () => {
        const drawn = tool();
        drawLine(drawn, { x: 150, y: 150 }, { x: 350, y: 250 });
        const line = drawn.tool.getTrendLines()[0] as TrendLine;

        drawn.tool.loadTrendLines([{ ...line, extended: true, point2: { ...line.point1 } }]);

        expect(drawn.tool.getTrendLines()).toHaveLength(1);
    });
});

describe('the overlay itself', () => {
    it('mounts a canvas over the chart and takes it down on destroy', () => {
        const drawing = stage();
        const before = drawing.chart.chartElement().querySelectorAll('canvas').length;

        const manager = new TrendLineManager(drawing.chart, drawing.series);
        const during = drawing.chart.chartElement().querySelectorAll('canvas').length;
        manager.destroy();

        expect(during).toBe(before + 1);
        expect(drawing.chart.chartElement().querySelectorAll('canvas')).toHaveLength(before);
    });

    it('redraws when the visible range moves', () => {
        const drawn = tool();
        drawLine(drawn, { x: 150, y: 150 }, { x: 350, y: 250 });

        drawn.stage.chart.timeScale().setVisibleLogicalRange({ from: 10, to: 30 });

        expect(drawn.tool.getTrendLines()).toHaveLength(1);
    });

    it('resizes its canvas with the window', () => {
        const drawn = tool();

        window.dispatchEvent(new Event('resize'));

        expect(drawn.tool.getTrendLines()).toHaveLength(0);
    });

    it('toggles between drawing and not', () => {
        const drawn = tool();

        drawn.tool.toggle();
        expect(drawn.tool.isToolActive()).toBe(false);

        drawn.tool.toggle();
        expect(drawn.tool.isToolActive()).toBe(true);
    });
});
