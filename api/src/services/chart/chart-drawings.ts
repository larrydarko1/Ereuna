/** chart-drawings — the annotations saved against one (symbol, timeframe) chart. */
import type { Collection, ObjectId } from 'mongodb';
import type { ChartDrawingDoc, ChartDrawings, ChartTimeframe } from '@ereuna/shared';
import { DRAWING_KINDS } from '@ereuna/shared';
import { getDb } from '@/lib/db.js';

const EMPTY_DRAWINGS: ChartDrawings = {
    trendLines: [],
    boxes: [],
    textAnnotations: [],
    freehandPaths: [],
    priceLevels: [],
};

export async function getDrawings(userId: ObjectId, symbol: string, timeframe: ChartTimeframe): Promise<ChartDrawings> {
    const doc = await collection().findOne({ userId, symbol, timeframe });
    return doc?.drawings ?? EMPTY_DRAWINGS;
}

export async function saveDrawings(
    userId: ObjectId,
    symbol: string,
    timeframe: ChartTimeframe,
    drawings: ChartDrawings,
): Promise<ChartDrawings> {
    if (DRAWING_KINDS.every((kind) => drawings[kind].length === 0)) {
        await clearDrawings(userId, symbol, timeframe);
        return EMPTY_DRAWINGS;
    }

    const now = new Date();
    await collection().updateOne(
        { userId, symbol, timeframe },
        { $set: { drawings, updatedAt: now }, $setOnInsert: { userId, symbol, timeframe, createdAt: now } },
        { upsert: true },
    );

    return drawings;
}

/** Idempotent: clearing a chart that has nothing saved is a no-op, not a 404. */
export async function clearDrawings(userId: ObjectId, symbol: string, timeframe: ChartTimeframe): Promise<void> {
    await collection().deleteOne({ userId, symbol, timeframe });
}

function collection(): Collection<ChartDrawingDoc> {
    return getDb().collection<ChartDrawingDoc>('ChartDrawings');
}
