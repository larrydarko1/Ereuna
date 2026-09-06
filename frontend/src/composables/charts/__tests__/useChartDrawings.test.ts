import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import type { ChartDrawings } from '@ereuna/shared';
import { mockApi } from '@/__tests__/support/msw';
import { useChartDrawings, type UseChartDrawingsReturn } from '@/composables/charts/useChartDrawings';

const mock = mockApi();

const EMPTY: ChartDrawings = {
    trendLines: [],
    boxes: [],
    textAnnotations: [],
    freehandPaths: [],
    priceLevels: [],
};

/** The five renderer managers, each of which owns one kind of annotation. */
function fakeManagers(): {
    managers: Parameters<UseChartDrawingsReturn['attach']>[0];
    held: () => ChartDrawings;
    set: (drawings: Partial<ChartDrawings>) => void;
} {
    let held: ChartDrawings = { ...EMPTY };
    const kind = <TKey extends keyof ChartDrawings>(key: TKey) => ({
        get: () => held[key],
        load: (items: ChartDrawings[TKey]) => {
            held = { ...held, [key]: items };
        },
    });

    const trend = kind('trendLines');
    const box = kind('boxes');
    const text = kind('textAnnotations');
    const free = kind('freehandPaths');
    const level = kind('priceLevels');

    return {
        managers: {
            trendLines: { getTrendLines: trend.get, loadTrendLines: trend.load },
            boxes: { getBoxes: box.get, loadBoxes: box.load },
            textAnnotations: { getAnnotations: text.get, loadAnnotations: text.load },
            freehandPaths: { getPaths: free.get, loadPaths: free.load },
            priceLevels: { serialize: level.get, deserialize: level.load },
        } as unknown as Parameters<UseChartDrawingsReturn['attach']>[0],
        held: () => held,
        set: (drawings) => {
            held = { ...held, ...drawings };
        },
    };
}

const key = { symbol: 'AAPL', timeframe: 'daily' as const };
const withLine: ChartDrawings = { ...EMPTY, trendLines: [{ id: '1' } as never] };

function inScope(): { drawings: UseChartDrawingsReturn; stop: () => void } {
    const scope = effectScope();
    const drawings = scope.run(() => useChartDrawings()) as UseChartDrawingsReturn;
    return { drawings, stop: () => scope.stop() };
}

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('attach', () => {
    it('reports an empty canvas as having no annotations', () => {
        const { drawings } = inScope();

        drawings.attach(fakeManagers().managers);

        expect(drawings.hasDrawings.value).toBe(false);
    });

    it('reports a canvas that already holds one', () => {
        const { drawings } = inScope();
        const managers = fakeManagers();
        managers.set({ boxes: [{ id: 'b' } as never] });

        drawings.attach(managers.managers);

        expect(drawings.hasDrawings.value).toBe(true);
    });
});

describe('load', () => {
    it('puts the stored annotations on the canvas', async () => {
        mock.on('GET /api/charts/AAPL/drawings', withLine);
        const { drawings } = inScope();
        const managers = fakeManagers();
        drawings.attach(managers.managers);

        await drawings.load(key);

        expect(managers.held().trendLines).toHaveLength(1);
        expect(drawings.hasDrawings.value).toBe(true);
    });

    it("leaves the canvas clean when the read fails, rather than the previous symbol's lines", async () => {
        mock.on('GET /api/charts/AAPL/drawings', { error: 'INTERNAL' }, { status: 500 });
        const { drawings } = inScope();
        const managers = fakeManagers();
        managers.set({ trendLines: [{ id: 'stale' } as never] });
        drawings.attach(managers.managers);

        await drawings.load(key);

        expect(managers.held().trendLines).toEqual([]);
        expect(drawings.hasDrawings.value).toBe(false);
    });

    it('reads nothing before a chart exists, or without a symbol', async () => {
        const { drawings } = inScope();

        await drawings.load(key);
        drawings.attach(fakeManagers().managers);
        await drawings.load({ symbol: '', timeframe: 'daily' });

        expect(mock.calls).toHaveLength(0);
    });

    it('does not echo the read straight back as a write', async () => {
        mock.on('GET /api/charts/AAPL/drawings', withLine);
        mock.on('PUT /api/charts/AAPL/drawings', withLine);
        const { drawings } = inScope();
        drawings.attach(fakeManagers().managers);

        await drawings.load(key);
        drawings.touch(key);
        await vi.advanceTimersByTimeAsync(2000);

        expect(mock.calls.filter((call) => call.method === 'PUT')).toHaveLength(1);
    });
});

describe('save', () => {
    it('writes what is on screen', async () => {
        mock.on('PUT /api/charts/AAPL/drawings', withLine);
        const { drawings } = inScope();
        const managers = fakeManagers();
        managers.set({ trendLines: [{ id: '1' } as never] });
        drawings.attach(managers.managers);

        await drawings.save(key);

        expect(mock.last().body).toMatchObject({ trendLines: [{ id: '1' }] });
        expect(drawings.hasDrawings.value).toBe(true);
    });

    it('writes nothing before a chart exists, or without a symbol', async () => {
        const { drawings } = inScope();

        await drawings.save(key);
        drawings.attach(fakeManagers().managers);
        await drawings.save({ symbol: '', timeframe: 'daily' });

        expect(mock.calls).toHaveLength(0);
    });

    it('does not interrupt the user when the write fails', async () => {
        mock.on('PUT /api/charts/AAPL/drawings', { error: 'INTERNAL' }, { status: 500 });
        const { drawings } = inScope();
        drawings.attach(fakeManagers().managers);

        await expect(drawings.save(key)).resolves.toBeUndefined();
    });
});

describe('touch', () => {
    it('collapses a burst of edits into one write', async () => {
        mock.on('PUT /api/charts/AAPL/drawings', EMPTY);
        const { drawings } = inScope();
        drawings.attach(fakeManagers().managers);

        for (let edit = 0; edit < 20; edit += 1) {
            drawings.touch(key);
            await vi.advanceTimersByTimeAsync(100);
        }
        await vi.advanceTimersByTimeAsync(1500);

        expect(mock.calls).toHaveLength(1);
    });

    it('does not write a drawing that was navigated away from within the settle window', async () => {
        mock.on('PUT /api/charts/AAPL/drawings', EMPTY);
        const { drawings, stop } = inScope();
        drawings.attach(fakeManagers().managers);

        drawings.touch(key);
        stop();
        await vi.advanceTimersByTimeAsync(5000);

        expect(mock.calls).toHaveLength(0);
    });

    it('is cancelled by an explicit save, so the write does not go twice', async () => {
        mock.on('PUT /api/charts/AAPL/drawings', EMPTY);
        const { drawings } = inScope();
        drawings.attach(fakeManagers().managers);

        drawings.touch(key);
        await drawings.save(key);
        await vi.advanceTimersByTimeAsync(5000);

        expect(mock.calls).toHaveLength(1);
    });
});

describe('snapshot and restore', () => {
    it('carries the canvas across a series rebuild without a read or a write', () => {
        const { drawings } = inScope();
        const managers = fakeManagers();
        managers.set({ boxes: [{ id: 'b' } as never] });
        drawings.attach(managers.managers);

        const taken = drawings.snapshot();
        drawings.reset();
        expect(drawings.hasDrawings.value).toBe(false);

        drawings.restore(taken as ChartDrawings);

        expect(managers.held().boxes).toHaveLength(1);
        expect(drawings.hasDrawings.value).toBe(true);
        expect(mock.calls).toHaveLength(0);
    });

    it('has nothing to snapshot before a chart exists', () => {
        const { drawings } = inScope();

        expect(drawings.snapshot()).toBeNull();
    });

    it('restoring does not count as an edit', async () => {
        const { drawings } = inScope();
        drawings.attach(fakeManagers().managers);

        drawings.restore(withLine);
        await vi.advanceTimersByTimeAsync(5000);

        expect(mock.calls).toHaveLength(0);
    });
});

describe('clear', () => {
    it('wipes the canvas and the stored document together', async () => {
        mock.on('DELETE /api/charts/AAPL/drawings', null, { status: 204 });
        const { drawings } = inScope();
        const managers = fakeManagers();
        managers.set({ trendLines: [{ id: '1' } as never] });
        drawings.attach(managers.managers);

        await drawings.clear(key);

        expect(managers.held().trendLines).toEqual([]);
        expect(drawings.hasDrawings.value).toBe(false);
        expect(mock.last().method).toBe('DELETE');
    });

    it('cancels a queued save, so the wipe is not undone by it', async () => {
        mock.on('DELETE /api/charts/AAPL/drawings', null, { status: 204 });
        const { drawings } = inScope();
        drawings.attach(fakeManagers().managers);

        drawings.touch(key);
        await drawings.clear(key);
        await vi.advanceTimersByTimeAsync(5000);

        expect(mock.calls.filter((call) => call.method === 'PUT')).toHaveLength(0);
    });

    it('clears the canvas without a call when there is no symbol', async () => {
        const { drawings } = inScope();
        drawings.attach(fakeManagers().managers);

        await drawings.clear({ symbol: '', timeframe: 'daily' });

        expect(mock.calls).toHaveLength(0);
    });

    it('does not interrupt the user when the delete fails', async () => {
        mock.on('DELETE /api/charts/AAPL/drawings', { error: 'INTERNAL' }, { status: 500 });
        const { drawings } = inScope();
        drawings.attach(fakeManagers().managers);

        await expect(drawings.clear(key)).resolves.toBeUndefined();
    });
});

describe('reset', () => {
    it('does nothing before a chart exists', () => {
        const { drawings } = inScope();

        expect(() => drawings.reset()).not.toThrow();
    });
});
