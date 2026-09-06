import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { asUser, json, quietLogger, serve, type Harness } from '@/__tests__/support/http.js';

const service = {
    getPreferences: vi.fn(),
    updatePreferences: vi.fn(),
    hideSymbol: vi.fn(),
    unhideSymbol: vi.fn(),
};

vi.mock('@/services/user/index.js', () => service);

const { router } = await import('@/routes/identity/preferences.js');

const USER = '507f1f77bcf86cd799439011';
const USER_ID = new ObjectId(USER);

let harness: Harness;

beforeEach(async () => {
    service.getPreferences.mockResolvedValue({ language: 'en' });
    service.updatePreferences.mockResolvedValue({ language: 'fr' });
    service.hideSymbol.mockResolvedValue(['AAPL']);
    service.unhideSymbol.mockResolvedValue([]);
    harness = await serve((app) => app.use('/api/preferences', quietLogger, asUser(USER), router));
});

afterEach(async () => {
    await harness.close();
});

describe('GET /api/preferences', () => {
    it('answers with the stored preferences', async () => {
        const response = await harness.call('/api/preferences');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ language: 'en' });
        expect(service.getPreferences).toHaveBeenCalledWith(USER_ID);
    });
});

describe('PATCH /api/preferences', () => {
    it('accepts a single preference', async () => {
        const response = await harness.call('/api/preferences', json({ language: 'fr' }, 'PATCH'));

        expect(response.status).toBe(200);
        expect(service.updatePreferences).toHaveBeenCalledWith(USER_ID, { language: 'fr' });
    });

    it('accepts an explicit null for the nullable preferences', async () => {
        await harness.call('/api/preferences', json({ theme: null, chartSettings: null, panels: null }, 'PATCH'));

        expect(service.updatePreferences).toHaveBeenCalledWith(USER_ID, {
            theme: null,
            chartSettings: null,
            panels: null,
        });
    });

    it('refuses an empty patch — it would be a write with nothing to write', async () => {
        const response = await harness.call('/api/preferences', json({}, 'PATCH'));

        expect(response.status).toBe(422);
        expect(service.updatePreferences).not.toHaveBeenCalled();
    });

    it('refuses a screener column list beyond a hundred entries', async () => {
        const columns = Array.from({ length: 101 }, (_, index) => `col${index}`);
        const response = await harness.call('/api/preferences', json({ screenerColumns: columns }, 'PATCH'));

        expect(response.status).toBe(422);
    });

    it('refuses a chart settings object that is not the settings shape', async () => {
        const response = await harness.call('/api/preferences', json({ chartSettings: { style: 'wat' } }, 'PATCH'));

        expect(response.status).toBe(422);
    });
});

describe('hidden symbols', () => {
    it('hides a symbol, uppercased', async () => {
        const response = await harness.call('/api/preferences/hidden/aapl', { method: 'POST' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ hiddenSymbols: ['AAPL'] });
        expect(service.hideSymbol).toHaveBeenCalledWith(USER_ID, 'AAPL');
    });

    it('un-hides a symbol', async () => {
        const response = await harness.call('/api/preferences/hidden/AAPL', { method: 'DELETE' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ hiddenSymbols: [] });
        expect(service.unhideSymbol).toHaveBeenCalledWith(USER_ID, 'AAPL');
    });

    it('refuses a symbol carrying characters a Mongo query should never see', async () => {
        const response = await harness.call('/api/preferences/hidden/A%24B', { method: 'POST' });

        expect(response.status).toBe(422);
        expect(service.hideSymbol).not.toHaveBeenCalled();
    });
});
