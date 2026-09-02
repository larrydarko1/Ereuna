/** useChartTheme — the chart's colours, in the form the renderer wants. */
import { computed, type ComputedRef } from 'vue';
import { useTheme } from '@/composables/ui/useTheme';

export type ChartPalette = {
    background: string;
    surface: string;
    border: string;
    text: string;
    textMuted: string;
    textInverted: string;
    accent: string;
    positive: string;
    negative: string;
    volume: string;
    dividend: string;
    split: string;
    overlays: readonly string[];
};

/** Token name → palette key. The renderer never sees a `var(...)`. */
const TOKENS = {
    background: '--color-bg',
    surface: '--color-surface',
    border: '--color-elevated',
    text: '--color-text',
    textMuted: '--color-text-muted',
    textInverted: '--color-text-inverted',
    accent: '--color-accent-1',
    positive: '--color-positive',
    negative: '--color-negative',
    volume: '--color-volume',
    dividend: '--color-accent-3',
    split: '--color-ma-3',
} as const satisfies Record<Exclude<keyof ChartPalette, 'overlays'>, string>;

const OVERLAY_TOKENS = ['--color-ma-1', '--color-ma-2', '--color-ma-3', '--color-ma-4'] as const;

export function useChartTheme(): { palette: ComputedRef<ChartPalette> } {
    const { currentTheme } = useTheme();

    // Depends on `currentTheme` for one reason: to be recomputed when it
    // changes. The value is never read — the colours come from the computed
    // style of <html>, which the attribute has already updated by then.
    const palette = computed<ChartPalette>(() => {
        void currentTheme.value;
        return readPalette();
    });

    return { palette };
}

function readPalette(): ChartPalette {
    const styles = getComputedStyle(document.documentElement);
    const read = (token: string): string => styles.getPropertyValue(token).trim();

    return {
        background: read(TOKENS.background),
        surface: read(TOKENS.surface),
        border: read(TOKENS.border),
        text: read(TOKENS.text),
        textMuted: read(TOKENS.textMuted),
        textInverted: read(TOKENS.textInverted),
        accent: read(TOKENS.accent),
        positive: read(TOKENS.positive),
        negative: read(TOKENS.negative),
        volume: read(TOKENS.volume),
        dividend: read(TOKENS.dividend),
        split: read(TOKENS.split),
        overlays: OVERLAY_TOKENS.map(read),
    };
}

/**
 * `color` at `alpha`, as `rgba(...)`.
 * Area and baseline series want a translucent fill of their line colour. The
 * chart this replaces built one by concatenating `'80'` onto the token string,
 * which is a valid colour only when the value is a 6-digit hex and silently
 * produces garbage — `#abc80` — when a theme writes the short form.
 * `color-mix` would express this in one line but lands in Safari 16.2, and the
 * browsers this app targets go back to 14, so the parse is done here.
 */
export function withAlpha(color: string, alpha: number): string {
    const rgb = toRgb(color);
    if (rgb === null) return color;
    const clamped = Math.min(1, Math.max(0, alpha));
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${clamped})`;
}

/** The red, green and blue of a hex colour, or null if it is written some other way. */
function toRgb(color: string): [number, number, number] | null {
    const hex = color.trim().replace('#', '');
    const expanded = hex.length === 3 || hex.length === 4 ? [...hex].map((c) => c + c).join('') : hex;
    if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(expanded)) return null;

    return [
        Number.parseInt(expanded.slice(0, 2), 16),
        Number.parseInt(expanded.slice(2, 4), 16),
        Number.parseInt(expanded.slice(4, 6), 16),
    ];
}
