/**
 * user-preferences — the interface state stored on the user document.
 * Owns: language, theme, default symbol, hidden symbols, chart settings, saved
 * panel layouts, and the screener column selection.
 * Does NOT own: credentials or two-factor state (user-account.ts).
 */
import { ObjectId } from 'mongodb';
import type { UserDoc } from '@ereuna/shared';
import { AppError } from '@/lib/app-error.js';
import { getDb } from '@/lib/db.js';

export type Preferences = Pick<
    UserDoc,
    'language' | 'theme' | 'defaultSymbol' | 'hiddenSymbols' | 'chartSettings' | 'panels' | 'screenerColumns'
>;

const PREFERENCE_FIELDS = [
    'language',
    'theme',
    'defaultSymbol',
    'hiddenSymbols',
    'chartSettings',
    'panels',
    'screenerColumns',
] as const satisfies readonly (keyof Preferences)[];

const PROJECTION = Object.fromEntries(PREFERENCE_FIELDS.map((field) => [field, 1]));

export async function getPreferences(userId: ObjectId): Promise<Preferences> {
    const user = await getDb().collection<UserDoc>('Users').findOne({ _id: userId }, { projection: PROJECTION });
    if (user === null) throw new AppError(404, 'USER_NOT_FOUND', `user ${userId.toHexString()} not found`);

    return {
        language: user.language,
        theme: user.theme,
        defaultSymbol: user.defaultSymbol,
        hiddenSymbols: user.hiddenSymbols,
        chartSettings: user.chartSettings,
        panels: user.panels,
        screenerColumns: user.screenerColumns,
    };
}

export async function updatePreferences(userId: ObjectId, patch: Partial<Preferences>): Promise<Preferences> {
    const update: Record<string, unknown> = { updatedAt: new Date() };
    for (const field of PREFERENCE_FIELDS) {
        if (patch[field] !== undefined) update[field] = patch[field];
    }

    const result = await getDb().collection<UserDoc>('Users').updateOne({ _id: userId }, { $set: update });
    if (result.matchedCount === 0) {
        throw new AppError(404, 'USER_NOT_FOUND', `user ${userId.toHexString()} not found`);
    }

    return getPreferences(userId);
}

/** Hide a symbol from screener results. Idempotent — `$addToSet` never duplicates. */
export async function hideSymbol(userId: ObjectId, symbol: string): Promise<string[]> {
    await getDb()
        .collection<UserDoc>('Users')
        .updateOne({ _id: userId }, { $addToSet: { hiddenSymbols: symbol }, $set: { updatedAt: new Date() } });
    return (await getPreferences(userId)).hiddenSymbols;
}

/** Un-hide a symbol. Idempotent — pulling a symbol that is not there is a no-op. */
export async function unhideSymbol(userId: ObjectId, symbol: string): Promise<string[]> {
    await getDb()
        .collection<UserDoc>('Users')
        .updateOne({ _id: userId }, { $pull: { hiddenSymbols: symbol }, $set: { updatedAt: new Date() } });
    return (await getPreferences(userId)).hiddenSymbols;
}
