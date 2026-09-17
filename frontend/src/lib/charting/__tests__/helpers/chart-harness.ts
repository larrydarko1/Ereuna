/**
 * A real chart, in jsdom, torn down after every test.
 *
 * The engine is one machine: a price scale cannot be exercised without a series,
 * and a series cannot be exercised without the widget that lays it out. So the
 * engine suites drive the public API against a genuine instance rather than
 * mocking the collaborators, and this is what builds it.
 *
 * jsdom runs no layout, so `clientWidth` is 0 for every element and a chart left
 * to size itself would come out zero-by-zero and skip every renderer. `mountChart`
 * therefore both passes explicit dimensions and pins the box the widget measures.
 */
import { afterEach } from 'vitest';

import { type DeepPartial } from '@/lib/charting/engine/helpers/strict-type-checks';
import { type ChartOptions, type IChartApi, createChart } from '@/lib/charting/engine/api/create-chart';

export type MountedChart = {
    chart: IChartApi;
    container: HTMLDivElement;
};

/** The parts of the widget tree a pointer can land on. */
export type ChartSurfaces = {
    pane: HTMLElement;
    priceAxis: HTMLElement;
    timeAxis: HTMLElement;
};

export const DEFAULT_WIDTH = 600;
export const DEFAULT_HEIGHT = 400;

const mounted: MountedChart[] = [];

/**
 * Builds a chart on a container attached to the document, and registers both for
 * teardown. Nothing here needs an explicit `remove()`.
 */
export function mountChart(options?: DeepPartial<ChartOptions>): MountedChart {
    const container = document.createElement('div');
    pinSize(container, options?.width ?? DEFAULT_WIDTH, options?.height ?? DEFAULT_HEIGHT);
    document.body.appendChild(container);

    const chart = createChart(container, {
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
        ...options,
    });

    const entry = { chart, container };
    mounted.push(entry);
    return entry;
}

/**
 * Removes a chart now and takes it off the teardown list. A test about removal
 * has to call this rather than `chart.remove()`, because the second call throws
 * on a canvas binding that is already disposed.
 */
export function removeChart(entry: MountedChart): void {
    const index = mounted.indexOf(entry);
    if (index !== -1) mounted.splice(index, 1);
    entry.chart.remove();
    entry.container.remove();
}

/**
 * The three elements the mouse handlers are bound to: the topmost canvas of the
 * pane, of the price axis and of the time axis. The widget lays itself out as a
 * table — one row of panes over one row for the time axis — and each cell that
 * draws holds a div of two canvases, the second of which takes the pointer.
 * Positions rather than classes, because the fork gives the cells none.
 */
export function surfacesOf(chart: IChartApi): ChartSurfaces {
    const rows = chart.chartElement().querySelectorAll('tr');
    const paneRow = rows[0];
    const timeRow = rows[1];
    if (paneRow === undefined || timeRow === undefined) throw new Error('chart has no widget table');

    return {
        pane: cellContent(paneRow, 1),
        priceAxis: cellContent(paneRow, 2),
        timeAxis: cellContent(timeRow, 1),
    };
}

/**
 * Forces a synchronous repaint. Drawing is otherwise scheduled on an animation
 * frame that a synchronous test never reaches, and an assertion about what a
 * renderer did would pass against a chart that never drew.
 */
export function paint(chart: IChartApi): HTMLCanvasElement {
    return chart.takeScreenshot();
}

/**
 * Gives an element a size jsdom will report. Every measurement the widget makes
 * goes through `getBoundingClientRect` or the `client*` pair, and jsdom answers
 * both with zero until they are defined away.
 */
export function pinSize(element: HTMLElement, width: number, height: number): void {
    Object.defineProperty(element, 'clientWidth', { configurable: true, value: width });
    Object.defineProperty(element, 'clientHeight', { configurable: true, value: height });
    element.getBoundingClientRect = (): DOMRect =>
        ({
            x: 0,
            y: 0,
            top: 0,
            left: 0,
            right: width,
            bottom: height,
            width,
            height,
            toJSON: () => ({}),
        }) as DOMRect;
}

function cellContent(row: HTMLTableRowElement, index: number): HTMLElement {
    const cell = row.cells[index];
    if (cell === undefined) throw new Error(`widget row has no cell ${index}`);
    const content = cell.firstElementChild;
    if (!(content instanceof HTMLElement)) throw new Error(`widget cell ${index} draws nothing`);
    pinSize(content, cell.offsetWidth || DEFAULT_WIDTH, cell.offsetHeight || DEFAULT_HEIGHT);

    const canvases = content.querySelectorAll('canvas');
    const top = canvases[canvases.length - 1];
    if (top === undefined) throw new Error(`widget cell ${index} has no canvas`);
    pinSize(top, content.clientWidth, content.clientHeight);
    return top;
}

afterEach(() => {
    while (mounted.length > 0) {
        const entry = mounted.pop();
        if (entry !== undefined) removeChart(entry);
    }
});
