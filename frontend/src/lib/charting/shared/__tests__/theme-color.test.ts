import { afterEach, describe, expect, it } from 'vitest';

import { getThemeColor, hexToRgba } from '@/lib/charting/shared/theme-color';

afterEach(() => {
    document.documentElement.style.cssText = '';
});

describe('getThemeColor', () => {
    it('resolves a token off the document root', () => {
        document.documentElement.style.setProperty('--color-positive', '#26a69a');

        expect(getThemeColor('--color-positive')).toBe('#26a69a');
    });

    it('trims the whitespace a custom property keeps', () => {
        document.documentElement.style.setProperty('--color-bg', '  #101014  ');

        expect(getThemeColor('--color-bg')).toBe('#101014');
    });

    it('reads the value as it stands now, not as it stood at the first read', () => {
        document.documentElement.style.setProperty('--color-text', '#ffffff');
        expect(getThemeColor('--color-text')).toBe('#ffffff');

        // Switching theme repaints without rebuilding the drawing tools, so a
        // cached first read would leave every canvas on the old palette
        document.documentElement.style.setProperty('--color-text', '#000000');
        expect(getThemeColor('--color-text')).toBe('#000000');
    });
});

describe('hexToRgba', () => {
    it('splits a six-digit hex into its channels', () => {
        expect(hexToRgba('#26a69a', 0.15)).toBe('rgba(38, 166, 154, 0.15)');
    });

    it('reads a hex that arrives without its hash', () => {
        expect(hexToRgba('ef5350', 1)).toBe('rgba(239, 83, 80, 1)');
    });

    it('carries the alpha through untouched', () => {
        expect(hexToRgba('#000000', 0)).toBe('rgba(0, 0, 0, 0)');
        expect(hexToRgba('#ffffff', 1)).toBe('rgba(255, 255, 255, 1)');
    });
});
