import { afterEach, describe, expect, it } from 'vitest';

import {
    type CanvasRecording,
    type DrawingStage,
    clickAt,
    moveTo,
    recordCanvas,
    stage,
} from '@/lib/charting/__tests__/helpers/drawing-harness';
import { ChartRuler } from '@/lib/charting/drawings/ruler';

type Measured = { stage: DrawingStage; tool: ChartRuler; drawn: CanvasRecording };

let recording: CanvasRecording | null = null;

function tool(active = true): Measured {
    const drawing = stage();
    recording = recordCanvas();
    const ruler = new ChartRuler(drawing.chart, drawing.series);
    if (active) ruler.activate();
    return { stage: drawing, tool: ruler, drawn: recording };
}

/** Everything the tool wrote into its info box. */
function labels(measured: Measured): string[] {
    return measured.drawn.calls.filter((call) => call.method === 'fillText').map((call) => String(call.args[0]));
}

afterEach(() => {
    recording?.restore();
    recording = null;
});

describe('measuring between two points', () => {
    it('writes the move in percent, in price and in time', () => {
        const measured = tool();

        clickAt(measured.stage, 200, 260);
        moveTo(measured.stage, 380, 140);

        const written = labels(measured);
        expect(written.some((text) => /%$/.test(text))).toBe(true);
        expect(written.some((text) => /^[+-]\d/.test(text))).toBe(true);
        expect(written.some((text) => /\d+d \d+h/.test(text))).toBe(true);
    });

    it('reads an upward move as positive and a downward one as negative', () => {
        const up = tool();
        clickAt(up.stage, 200, 300);
        moveTo(up.stage, 380, 120);
        const rising = labels(up).find((text) => text.endsWith('%'));

        up.tool.destroy();
        up.drawn.restore();

        const down = tool();
        clickAt(down.stage, 200, 120);
        moveTo(down.stage, 380, 300);
        const falling = labels(down).find((text) => text.endsWith('%'));

        expect(rising?.startsWith('+')).toBe(true);
        expect(falling?.startsWith('-')).toBe(true);
    });

    it('draws nothing until an anchor is placed', () => {
        const measured = tool();

        moveTo(measured.stage, 380, 140);

        expect(labels(measured)).toHaveLength(0);
    });

    it('holds the measurement still on the second click', () => {
        const measured = tool();
        clickAt(measured.stage, 200, 260);
        moveTo(measured.stage, 380, 140);
        clickAt(measured.stage, 380, 140);
        const locked = labels(measured).length;

        moveTo(measured.stage, 300, 200);

        expect(labels(measured)).toHaveLength(locked);
    });

    it('starts a new measurement on the third click', () => {
        const measured = tool();
        clickAt(measured.stage, 200, 260);
        moveTo(measured.stage, 380, 140);
        clickAt(measured.stage, 380, 140);

        clickAt(measured.stage, 250, 200);
        moveTo(measured.stage, 400, 160);

        // A fresh pair, so the box is written again after the lock was broken
        expect(labels(measured).length).toBeGreaterThan(3);
    });

    it('forgets the measurement when it is reset', () => {
        const measured = tool();
        clickAt(measured.stage, 200, 260);
        moveTo(measured.stage, 380, 140);
        const before = labels(measured).length;

        measured.tool.resetMeasurement();
        moveTo(measured.stage, 300, 200);

        expect(labels(measured)).toHaveLength(before);
    });
});

describe('the tool itself', () => {
    it('measures nothing at all while it is put away', () => {
        const measured = tool(false);

        clickAt(measured.stage, 200, 260);
        moveTo(measured.stage, 380, 140);

        expect(labels(measured)).toHaveLength(0);
    });

    it('toggles between measuring and not', () => {
        const measured = tool();

        measured.tool.toggle();
        expect(measured.tool.isRulerActive()).toBe(false);

        measured.tool.toggle();
        expect(measured.tool.isRulerActive()).toBe(true);
    });

    it('clears what it drew when it is put away', () => {
        const measured = tool();
        clickAt(measured.stage, 200, 260);
        moveTo(measured.stage, 380, 140);
        const before = labels(measured).length;

        measured.tool.deactivate();
        moveTo(measured.stage, 300, 200);

        expect(labels(measured)).toHaveLength(before);
    });

    it('takes its canvas down on destroy', () => {
        const drawing = stage();
        const before = drawing.chart.chartElement().querySelectorAll('canvas').length;

        const ruler = new ChartRuler(drawing.chart, drawing.series);
        const during = drawing.chart.chartElement().querySelectorAll('canvas').length;
        ruler.destroy();

        expect(during).toBe(before + 1);
        expect(drawing.chart.chartElement().querySelectorAll('canvas')).toHaveLength(before);
    });

    it('resizes its canvas with the window', () => {
        const measured = tool();

        window.dispatchEvent(new Event('resize'));

        expect(measured.tool.isRulerActive()).toBe(true);
    });
});
