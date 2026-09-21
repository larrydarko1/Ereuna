/** The preferences contract — the slice of a user document `/api/preferences` reads and writes. */
import type { UserDoc } from '#db/collections.js';

export type Preferences = Pick<
    UserDoc,
    'language' | 'theme' | 'defaultSymbol' | 'hiddenSymbols' | 'chartSettings' | 'panels' | 'screenerColumns'
>;
