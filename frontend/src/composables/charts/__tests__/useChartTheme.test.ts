import { afterEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { useChartTheme, withAlpha } from '@/composables/charts/useChartTheme';
import { useTheme } from '@/composables/ui/useTheme';
import { DEFAULT_THEME } from '@/composables/ui/themes';

const paint = (tokens: Record<string, string>): void => {
    for (const [token, value] of Object.entries(tokens)) {
        document.documentElement.style.setProperty(token, value);
    }
};

afterEach(() => {
    document.documentElement.removeAttribute('style');
    useTheme().applyTheme(DEFAULT_THEME);
});

describe('palette', () => {
    it('reads the tokens off <html>, so the renderer never sees a var()', () => {
        paint({ '--color-bg': '#101010', '--color-accent-1': '#7aa2f7', '--color-positive': '#00ff00' });
        const { palette } = useChartTheme();

        expect(palette.value.background).toBe('#101010');
        expect(palette.value.accent).toBe('#7aa2f7');
        expect(palette.value.positive).toBe('#00ff00');
    });

    it('offers one overlay colour per average the legend can name', () => {
        paint({
            '--color-ma-1': '#111111',
            '--color-ma-2': '#222222',
            '--color-ma-3': '#333333',
            '--color-ma-4': '#444444',
        });
        const { palette } = useChartTheme();

        expect(palette.value.overlays).toEqual(['#111111', '#222222', '#333333', '#444444']);
    });

    it('re-reads when the theme changes', async () => {
        paint({ '--color-bg': '#101010' });
        const { palette } = useChartTheme();
        expect(palette.value.background).toBe('#101010');

        paint({ '--color-bg': '#fafafa' });
        useTheme().applyTheme('light-owl');
        await nextTick();

        expect(palette.value.background).toBe('#fafafa');
    });
});

describe('withAlpha', () => {
    it('turns a six-digit hex into rgba', () => {
        expect(withAlpha('#7aa2f7', 0.5)).toBe('rgba(122, 162, 247, 0.5)');
    });

    it('expands the short form rather than producing #abc80', () => {
        expect(withAlpha('#abc', 0.5)).toBe('rgba(170, 187, 204, 0.5)');
    });

    it('accepts a hex that already carries an alpha, and takes the one it was given', () => {
        expect(withAlpha('#7aa2f780', 1)).toBe('rgba(122, 162, 247, 1)');
    });

    it('trims what the computed style handed back', () => {
        expect(withAlpha('  #7aa2f7  ', 0.2)).toBe('rgba(122, 162, 247, 0.2)');
    });

    it('clamps the alpha', () => {
        expect(withAlpha('#000000', 5)).toBe('rgba(0, 0, 0, 1)');
        expect(withAlpha('#000000', -1)).toBe('rgba(0, 0, 0, 0)');
    });

    it('gives a colour written some other way back unchanged', () => {
        expect(withAlpha('rgb(1, 2, 3)', 0.5)).toBe('rgb(1, 2, 3)');
        expect(withAlpha('', 0.5)).toBe('');
    });
});
