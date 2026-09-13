import { describe, expect, it, vi } from 'vitest';

import { type DrawingStage, clickAt, moveTo, pressKey, stage } from '@/lib/charting/__tests__/helpers/drawing-harness';
import { type TextAnnotation, TextAnnotationManager } from '@/lib/charting/drawings/text-annotation';

type Drawn = { stage: DrawingStage; tool: TextAnnotationManager };

function tool(active = true): Drawn {
    const drawing = stage();
    const manager = new TextAnnotationManager(drawing.chart, drawing.series);
    if (active) manager.activate();
    return { stage: drawing, tool: manager };
}

/** The field the tool opens over the chart for the label being typed. */
function field(drawn: Drawn): HTMLInputElement {
    const input = drawn.stage.chart.chartElement().querySelector('input');
    if (input === null) throw new Error('the tool opened no text field');
    return input;
}

/** Click, type, and commit with Enter — one finished label. */
function writeAt(drawn: Drawn, x: number, y: number, text: string): void {
    clickAt(drawn.stage, x, y);
    const input = field(drawn);
    input.value = text;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
}

function only(drawn: Drawn): TextAnnotation {
    const annotation = drawn.tool.getAnnotations()[0];
    if (annotation === undefined) throw new Error('nothing was annotated');
    return annotation;
}

describe('placing a label', () => {
    it('opens a field where the click landed and keeps what was typed into it', () => {
        const drawn = tool();

        writeAt(drawn, 260, 180, 'breakout');

        expect(only(drawn).text).toBe('breakout');
        expect(only(drawn).point.time).toBeDefined();
        expect(only(drawn).id).toMatch(/^txt_\d+_[a-z0-9]+$/);
    });

    it('takes the field away once the label is committed', () => {
        const drawn = tool();

        writeAt(drawn, 260, 180, 'breakout');

        expect(drawn.stage.chart.chartElement().querySelector('input')).toBeNull();
    });

    it('keeps nothing when the field is left empty', () => {
        const drawn = tool();

        writeAt(drawn, 260, 180, '');

        expect(drawn.tool.getAnnotations()).toHaveLength(0);
    });

    it('keeps nothing when the field is abandoned with Escape', () => {
        const drawn = tool();
        clickAt(drawn.stage, 260, 180);
        const input = field(drawn);
        input.value = 'never mind';

        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));

        expect(drawn.tool.getAnnotations()).toHaveLength(0);
        expect(drawn.stage.chart.chartElement().querySelector('input')).toBeNull();
    });

    it('commits what was typed when the field loses focus instead', () => {
        const drawn = tool();
        clickAt(drawn.stage, 260, 180);
        const input = field(drawn);
        input.value = '  support  ';

        input.dispatchEvent(new FocusEvent('blur'));

        expect(only(drawn).text).toBe('support');
    });

    it('tells its owner each time a label is placed', () => {
        const drawn = tool();
        const changed = vi.fn();
        drawn.tool.onChange(changed);

        writeAt(drawn, 260, 180, 'breakout');

        expect(changed).toHaveBeenCalledTimes(1);
    });

    it('replaces the open field rather than stacking a second one', () => {
        const drawn = tool();
        clickAt(drawn.stage, 260, 180);

        clickAt(drawn.stage, 320, 220);

        expect(drawn.stage.chart.chartElement().querySelectorAll('input')).toHaveLength(1);
    });
});

describe('selecting, moving and deleting a label', () => {
    it('deletes the selected label on Delete', () => {
        const drawn = tool();
        writeAt(drawn, 260, 180, 'breakout');
        const annotation = only(drawn);

        clickAt(drawn.stage, annotation.point.x + 4, annotation.point.y + 4);
        pressKey('Delete');

        expect(drawn.tool.getAnnotations()).toHaveLength(0);
    });

    it('leaves it alone when Delete arrives from inside a field', () => {
        const drawn = tool();
        writeAt(drawn, 260, 180, 'breakout');
        const annotation = only(drawn);
        clickAt(drawn.stage, annotation.point.x + 4, annotation.point.y + 4);
        const input = document.createElement('input');
        document.body.appendChild(input);

        pressKey('Delete', input);

        expect(drawn.tool.getAnnotations()).toHaveLength(1);
        input.remove();
    });

    it('moves the label when it is grabbed and dragged', () => {
        const drawn = tool();
        writeAt(drawn, 260, 180, 'breakout');
        const before = only(drawn).point.price;
        const at = only(drawn).point;

        clickAt(drawn.stage, at.x + 4, at.y + 4);
        moveTo(drawn.stage, at.x + 4, at.y + 70);
        clickAt(drawn.stage, at.x + 4, at.y + 70);

        expect(only(drawn).point.price).not.toBe(before);
    });

    it('refuses to move a locked label', () => {
        const drawn = tool();
        writeAt(drawn, 260, 180, 'breakout');
        const annotation = only(drawn);
        drawn.tool.loadAnnotations([{ ...annotation, locked: true }]);
        const before = annotation.point.price;

        clickAt(drawn.stage, annotation.point.x + 4, annotation.point.y + 4);
        moveTo(drawn.stage, annotation.point.x + 4, annotation.point.y + 70);

        expect(only(drawn).point.price).toBe(before);
    });

    it('deletes nothing while nothing is selected', () => {
        const drawn = tool();
        writeAt(drawn, 260, 180, 'breakout');

        drawn.tool.removeSelectedAnnotation();

        expect(drawn.tool.getAnnotations()).toHaveLength(1);
    });

    it('asks the toolbar to switch to it when one of its labels is clicked while it is put away', () => {
        const drawn = tool();
        writeAt(drawn, 260, 180, 'breakout');
        const annotation = only(drawn);
        const activate = vi.fn();
        drawn.tool.onActivate(activate);

        drawn.tool.deactivate();
        clickAt(drawn.stage, annotation.point.x + 4, annotation.point.y + 4);

        expect(activate).toHaveBeenCalled();
    });

    it('stays put when a click while it is away lands on nothing', () => {
        const drawn = tool();
        writeAt(drawn, 260, 180, 'breakout');
        const activate = vi.fn();
        drawn.tool.onActivate(activate);

        drawn.tool.deactivate();
        clickAt(drawn.stage, 450, 340);

        expect(activate).not.toHaveBeenCalled();
    });
});

describe('the overlay itself', () => {
    it('draws nothing and opens no field while the tool is put away', () => {
        const drawn = tool(false);

        clickAt(drawn.stage, 260, 180);

        expect(drawn.stage.chart.chartElement().querySelector('input')).toBeNull();
        expect(drawn.tool.getAnnotations()).toHaveLength(0);
    });

    it('takes its canvas and any open field down on destroy', () => {
        const drawn = tool();
        clickAt(drawn.stage, 260, 180);
        const before = drawn.stage.chart.chartElement().querySelectorAll('canvas').length;

        drawn.tool.destroy();

        expect(drawn.stage.chart.chartElement().querySelectorAll('canvas')).toHaveLength(before - 1);
        expect(drawn.stage.chart.chartElement().querySelector('input')).toBeNull();
    });

    it('toggles between placing labels and not', () => {
        const drawn = tool();

        drawn.tool.toggle();
        expect(drawn.tool.isToolActive()).toBe(false);

        drawn.tool.toggle();
        expect(drawn.tool.isToolActive()).toBe(true);
    });

    it('redraws its labels when the visible range moves and when the window resizes', () => {
        const drawn = tool();
        writeAt(drawn, 260, 180, 'breakout');

        drawn.stage.chart.timeScale().setVisibleLogicalRange({ from: 10, to: 40 });
        window.dispatchEvent(new Event('resize'));

        expect(drawn.tool.getAnnotations()).toHaveLength(1);
    });

    it('takes a whole set of labels at once, including a styled one', () => {
        const drawn = tool();
        writeAt(drawn, 260, 180, 'breakout');
        const annotation = only(drawn);

        drawn.tool.loadAnnotations([
            annotation,
            { ...annotation, id: 'text_big', fontSize: 20, backgroundOpacity: 0, text: 'two\nlines' },
        ]);

        expect(drawn.tool.getAnnotations()).toHaveLength(2);
    });
});
