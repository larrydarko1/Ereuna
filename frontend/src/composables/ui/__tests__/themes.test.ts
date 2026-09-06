import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME, isThemeId, THEMES } from '@/composables/ui/themes';

const SWATCH = /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i;

describe('THEMES', () => {
    it('names each theme exactly once', () => {
        const ids = THEMES.map((theme) => theme.id);

        expect(new Set(ids).size).toBe(ids.length);
    });

    it('gives every theme a label, a mode and four preview swatches', () => {
        const unlabelled = THEMES.filter((theme) => theme.label.trim() === '').map((theme) => theme.id);
        const oddMode = THEMES.filter((theme) => !['dark', 'light'].includes(theme.mode)).map((theme) => theme.id);
        const oddSwatch = THEMES.filter((theme) =>
            Object.values(theme.preview).some((swatch) => !SWATCH.test(swatch)),
        ).map((theme) => theme.id);

        expect({ unlabelled, oddMode, oddSwatch }).toEqual({ unlabelled: [], oddMode: [], oddSwatch: [] });
    });

    it('has a default that is one of them', () => {
        expect(isThemeId(DEFAULT_THEME)).toBe(true);
    });
});

describe('isThemeId', () => {
    it('accepts a theme the stylesheet defines', () => {
        expect(isThemeId('nord')).toBe(true);
    });

    it('refuses one it does not — a picker entry with no stylesheet behind it', () => {
        expect(isThemeId('tokyo-night')).toBe(false);
    });

    it('refuses anything that is not a string', () => {
        expect(isThemeId(null)).toBe(false);
        expect(isThemeId(undefined)).toBe(false);
        expect(isThemeId(1)).toBe(false);
    });
});
