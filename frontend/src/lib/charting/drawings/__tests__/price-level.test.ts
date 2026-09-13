import { afterEach, describe, expect, it, vi } from 'vitest';

import { type DrawingStage, clickAt, pressKey, stage } from '@/lib/charting/__tests__/helpers/drawing-harness';
import { LineStyle } from '@/lib/charting/engine/renderers/draw-line';
import { type PriceLevelData, PriceLevelManager } from '@/lib/charting/drawings/price-level';

type Levelled = { stage: DrawingStage; tool: PriceLevelManager };

const managers: PriceLevelManager[] = [];

afterEach(() => {
    while (managers.length > 0) managers.pop()?.destroy();
    document
        .querySelectorAll('.price-level-input-dialog, .price-level-overlay, .price-level-context-menu')
        .forEach((node) => {
            node.remove();
        });
});

function tool(active = true): Levelled {
    const drawing = stage();
    const manager = new PriceLevelManager(drawing.chart, drawing.series, drawing.chart.chartElement());
    managers.push(manager);
    if (active) manager.activate();
    return { stage: drawing, tool: manager };
}

/** The dialog the tool opens over the page for the level being edited. */
function dialog(): HTMLElement {
    const element = document.querySelector('.price-level-input-dialog');
    if (!(element instanceof HTMLElement)) throw new Error('the tool opened no dialog');
    return element;
}

function fieldsOf(element: HTMLElement): {
    price: HTMLInputElement;
    text: HTMLInputElement;
    color: HTMLInputElement;
    style: HTMLSelectElement;
} {
    const price = element.querySelector('input[type="number"]');
    const text = element.querySelector('input[type="text"]');
    const color = element.querySelector('input[type="color"]');
    const style = element.querySelector('select');
    if (
        !(price instanceof HTMLInputElement) ||
        !(text instanceof HTMLInputElement) ||
        !(color instanceof HTMLInputElement) ||
        !(style instanceof HTMLSelectElement)
    ) {
        throw new Error('the dialog is missing a field');
    }
    return { price, text, color, style };
}

function buttonNamed(element: HTMLElement, name: string): HTMLButtonElement {
    const found = Array.from(element.querySelectorAll('button')).find((each) => each.textContent === name);
    if (found === undefined) throw new Error(`the dialog has no ${name} button`);
    return found;
}

/** The menu is built out of divs rather than buttons, so its items are found by text. */
function menuItemNamed(element: HTMLElement, name: string): HTMLElement {
    const found = Array.from(element.querySelectorAll('.context-menu-item')).find((each) => each.textContent === name);
    if (!(found instanceof HTMLElement)) throw new Error(`the menu has no ${name} item`);
    return found;
}

/** Click the plot, fill the dialog in and save — one finished level. */
function addLevel(levelled: Levelled, text = 'target'): void {
    clickAt(levelled.stage, 260, 180);
    const opened = dialog();
    fieldsOf(opened).text.value = text;
    buttonNamed(opened, 'Save').click();
}

describe('placing a level', () => {
    it('opens the dialog at the price the click landed on, and keeps it once saved', () => {
        const levelled = tool();

        clickAt(levelled.stage, 260, 180);
        const priced = Number(fieldsOf(dialog()).price.value);
        buttonNamed(dialog(), 'Save').click();

        const saved = levelled.tool.serialize()[0] as PriceLevelData;
        expect(priced).toBeGreaterThan(0);
        expect(saved.price).toBeCloseTo(priced, 5);
    });

    it('closes the dialog once the level is saved', () => {
        const levelled = tool();

        addLevel(levelled);

        expect(document.querySelector('.price-level-input-dialog')).toBeNull();
    });

    it('keeps nothing when the dialog is cancelled', () => {
        const levelled = tool();

        clickAt(levelled.stage, 260, 180);
        buttonNamed(dialog(), 'Cancel').click();

        expect(levelled.tool.serialize()).toHaveLength(0);
        expect(document.querySelector('.price-level-input-dialog')).toBeNull();
    });

    it('keeps nothing when the backdrop is clicked', () => {
        const levelled = tool();

        clickAt(levelled.stage, 260, 180);
        (document.querySelector('.price-level-overlay') as HTMLElement).click();

        expect(levelled.tool.serialize()).toHaveLength(0);
    });

    it('offers no delete on a level that does not exist yet', () => {
        const levelled = tool();

        clickAt(levelled.stage, 260, 180);

        const names = Array.from(dialog().querySelectorAll('button'), (each) => each.textContent);
        expect(names).not.toContain('Delete');
    });

    it('shows the label it was given, and the price when it was given none', () => {
        const levelled = tool();

        addLevel(levelled, 'stop');
        addLevel(levelled, '');

        const labels = Array.from(
            levelled.stage.chart.chartElement().querySelectorAll('.price-level-label'),
            (node) => node.textContent,
        );
        expect(labels[0]).toBe('stop');
        expect(labels[1]).toMatch(/^\d+\.\d{2}$/);
    });

    it('tells its owner each time a level is saved', () => {
        const levelled = tool();
        const changed = vi.fn();
        levelled.tool.onChange(changed);

        addLevel(levelled);

        expect(changed).toHaveBeenCalledTimes(1);
    });

    it('places nothing at all while the tool is put away', () => {
        const levelled = tool(false);

        clickAt(levelled.stage, 260, 180);

        expect(document.querySelector('.price-level-input-dialog')).toBeNull();
        expect(levelled.tool.serialize()).toHaveLength(0);
    });
});

describe('editing a level that exists', () => {
    it('reopens the dialog on a double click of its label, offering a delete this time', () => {
        const levelled = tool();
        addLevel(levelled);
        const label = levelled.stage.chart.chartElement().querySelector('.price-level-label') as HTMLElement;

        label.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

        const names = Array.from(dialog().querySelectorAll('button'), (each) => each.textContent);
        expect(names).toContain('Delete');
    });

    it('carries the new colour, label and style onto the level', () => {
        const levelled = tool();
        addLevel(levelled);
        const label = levelled.stage.chart.chartElement().querySelector('.price-level-label') as HTMLElement;

        label.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
        const fields = fieldsOf(dialog());
        fields.text.value = 'support';
        fields.color.value = '#ff0000';
        fields.style.selectedIndex = 2;
        buttonNamed(dialog(), 'Save').click();

        const saved = levelled.tool.serialize()[0] as PriceLevelData;
        expect(saved.text).toBe('support');
        expect(saved.color).toBe('#ff0000');
        expect(saved.lineStyle).toBe(LineStyle.Dashed);
        expect(label.textContent).toBe('support');
    });

    it('deletes the level from the dialog', () => {
        const levelled = tool();
        addLevel(levelled);
        const label = levelled.stage.chart.chartElement().querySelector('.price-level-label') as HTMLElement;

        label.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
        buttonNamed(dialog(), 'Delete').click();

        expect(levelled.tool.serialize()).toHaveLength(0);
        expect(levelled.stage.chart.chartElement().querySelector('.price-level-label')).toBeNull();
    });
});

describe('the right-click menu on a level', () => {
    it('opens at the pointer and edits from there', () => {
        const levelled = tool();
        addLevel(levelled);
        const label = levelled.stage.chart.chartElement().querySelector('.price-level-label') as HTMLElement;

        label.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 120, clientY: 90 }));
        const menu = document.querySelector('.price-level-context-menu') as HTMLElement;
        menuItemNamed(menu, 'Edit').click();

        expect(menu.style.left).toBe('120px');
        expect(document.querySelector('.price-level-input-dialog')).not.toBeNull();
        expect(document.querySelector('.price-level-context-menu')).toBeNull();
    });

    it('deletes from there too', () => {
        const levelled = tool();
        addLevel(levelled);
        const label = levelled.stage.chart.chartElement().querySelector('.price-level-label') as HTMLElement;

        label.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 120, clientY: 90 }));
        menuItemNamed(document.querySelector('.price-level-context-menu') as HTMLElement, 'Delete').click();

        expect(levelled.tool.serialize()).toHaveLength(0);
    });

    it('dismisses on a click anywhere else', () => {
        const levelled = tool();
        addLevel(levelled);
        const label = levelled.stage.chart.chartElement().querySelector('.price-level-label') as HTMLElement;
        label.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 120, clientY: 90 }));

        document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(document.querySelector('.price-level-context-menu')).toBeNull();
    });
});

describe('selecting and deleting a level', () => {
    it('deletes the selected level on Delete', () => {
        const levelled = tool();
        addLevel(levelled);
        const label = levelled.stage.chart.chartElement().querySelector('.price-level-label') as HTMLElement;

        label.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        pressKey('Delete');

        expect(levelled.tool.serialize()).toHaveLength(0);
    });

    it('leaves it alone when Delete arrives from inside a field', () => {
        const levelled = tool();
        addLevel(levelled);
        const label = levelled.stage.chart.chartElement().querySelector('.price-level-label') as HTMLElement;
        label.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        const input = document.createElement('input');
        document.body.appendChild(input);

        pressKey('Delete', input);

        expect(levelled.tool.serialize()).toHaveLength(1);
        input.remove();
    });

    it('marks only the last one clicked as selected', () => {
        const levelled = tool();
        addLevel(levelled, 'first');
        addLevel(levelled, 'second');
        const labels = levelled.stage.chart.chartElement().querySelectorAll('.price-level-label');

        (labels[0] as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
        (labels[1] as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect((labels[0] as HTMLElement).style.boxShadow).toBe('none');
        expect((labels[1] as HTMLElement).style.boxShadow).not.toBe('none');
    });

    it('deletes nothing while nothing is selected', () => {
        const levelled = tool();
        addLevel(levelled);

        levelled.tool.removeSelectedLevel();

        expect(levelled.tool.serialize()).toHaveLength(1);
    });
});

describe('saving and restoring a set of levels', () => {
    it('restores what it serialised, without calling that a change', () => {
        const levelled = tool();
        addLevel(levelled, 'target');
        const saved = levelled.tool.serialize();
        const changed = vi.fn();
        levelled.tool.onChange(changed);

        levelled.tool.deserialize(saved);

        expect(levelled.tool.serialize()[0]?.text).toBe('target');
        expect(changed).not.toHaveBeenCalled();
    });

    it('empties the chart without calling that a change either', () => {
        const levelled = tool();
        addLevel(levelled);
        const changed = vi.fn();
        levelled.tool.onChange(changed);

        levelled.tool.clear();

        expect(levelled.tool.serialize()).toHaveLength(0);
        expect(changed).not.toHaveBeenCalled();
    });

    it('hides the label of a level whose price has scrolled off the scale', () => {
        const levelled = tool();
        addLevel(levelled);
        const label = levelled.stage.chart.chartElement().querySelector('.price-level-label') as HTMLElement;

        levelled.tool.deserialize([{ ...(levelled.tool.serialize()[0] as PriceLevelData), price: 1e9 }]);
        levelled.tool.updatePositions();

        const restored = levelled.stage.chart.chartElement().querySelector('.price-level-label') as HTMLElement;
        expect(label.isConnected).toBe(false);
        expect(restored.style.display).toBe('none');
    });
});

describe('the tool itself', () => {
    it('puts the crosshair cursor on the container only while it is up', () => {
        const levelled = tool();
        expect(levelled.stage.chart.chartElement().style.cursor).toBe('crosshair');

        levelled.tool.deactivate();

        expect(levelled.stage.chart.chartElement().style.cursor).toBe('default');
    });

    it('forgets every level on destroy', () => {
        const levelled = tool();
        addLevel(levelled);

        levelled.tool.destroy();

        expect(levelled.tool.serialize()).toHaveLength(0);
        expect(levelled.stage.chart.chartElement().querySelector('.price-level-label')).toBeNull();
    });
});
