import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadFile } from '@/utils/download';

const created: string[] = [];
const revoked: string[] = [];

beforeEach(() => {
    created.length = 0;
    revoked.length = 0;
    // jsdom implements neither: an object URL has no meaning without a real
    // browser to resolve it against.
    URL.createObjectURL = vi.fn(() => {
        const url = `blob:${created.length}`;
        created.push(url);
        return url;
    });
    URL.revokeObjectURL = vi.fn((url: string) => void revoked.push(url));
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('downloadFile', () => {
    it('clicks an anchor carrying the filename', () => {
        const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

        downloadFile('trades.csv', 'a,b', 'text/csv');

        expect(click).toHaveBeenCalledTimes(1);
        const link = click.mock.instances[0] as HTMLAnchorElement;
        expect(link.download).toBe('trades.csv');
        expect(link.href).toContain('blob:');
    });

    it('revokes the object URL it created, rather than leaking it for the life of the tab', () => {
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

        downloadFile('trades.csv', 'a,b', 'text/csv');

        expect(revoked).toEqual(created);
    });

    it('revokes only after the click has been dispatched', () => {
        let revokedAtClick = 0;
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
            revokedAtClick = revoked.length;
        });

        downloadFile('trades.csv', 'a,b', 'text/csv');

        expect(revokedAtClick).toBe(0);
        expect(revoked).toHaveLength(1);
    });
});
