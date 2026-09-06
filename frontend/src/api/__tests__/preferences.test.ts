import { describe, expect, it } from 'vitest';
import { mockApi } from '@/__tests__/support/msw';
import { getPreferences, hideSymbol, unhideSymbol, updatePreferences } from '@/api/preferences';

const mock = mockApi();

describe('preferences', () => {
    it('reads them', async () => {
        mock.on('GET /api/preferences', { language: 'en' });

        await expect(getPreferences()).resolves.toMatchObject({ data: { language: 'en' } });
    });

    it('sends only the keys being changed', async () => {
        mock.on('PATCH /api/preferences', { language: 'fr' });

        await updatePreferences({ language: 'fr' });

        expect(mock.last().body).toEqual({ language: 'fr' });
    });

    it('sends an explicit null to clear a nullable preference', async () => {
        mock.on('PATCH /api/preferences', { theme: null });

        await updatePreferences({ theme: null });

        expect(mock.last().body).toEqual({ theme: null });
    });
});

describe('hidden symbols', () => {
    it('hides one', async () => {
        mock.on('POST /api/preferences/hidden/AAPL', { hiddenSymbols: ['AAPL'] });

        await expect(hideSymbol('AAPL')).resolves.toMatchObject({ data: { hiddenSymbols: ['AAPL'] } });
    });

    it('un-hides one', async () => {
        mock.on('DELETE /api/preferences/hidden/AAPL', { hiddenSymbols: [] });

        await unhideSymbol('AAPL');

        expect(mock.last().method).toBe('DELETE');
    });

    it('encodes a symbol carrying a character a path segment cannot hold', async () => {
        mock.on('POST /api/preferences/hidden/:symbol', { hiddenSymbols: [] });

        await hideSymbol('BRK/B');

        expect(mock.last().path).toBe('/api/preferences/hidden/BRK%2FB');
    });
});
