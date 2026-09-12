/**
 * The theme tokens the drawing tools paint with. Every one of the 50 themes
 * defines all of them, so a read never comes back empty.
 */
export type ChartColorToken =
    | '--color-bg'
    | '--color-surface'
    | '--color-elevated'
    | '--color-text'
    | '--color-text-muted'
    | '--color-text-inverted'
    | '--color-positive'
    | '--color-negative';

/**
 * Reads a theme token off the document root.
 *
 * The tools paint onto a canvas, where a CSS variable means nothing — the value
 * has to be resolved before it can reach `fillStyle`. It is read at paint time
 * rather than cached because switching theme repaints without rebuilding the
 * managers.
 */
export function getThemeColor(token: ChartColorToken): string {
    return getComputedStyle(document.documentElement).getPropertyValue(token).trim();
}

/**
 * Re-expresses a token's hex as rgba, because a canvas `fillStyle` takes no
 * separate alpha and the tools fill with the same colour they stroke with.
 */
export function hexToRgba(hex: string, alpha: number): string {
    const digits = hex.replace('#', '');
    const red = parseInt(digits.substring(0, 2), 16);
    const green = parseInt(digits.substring(2, 4), 16);
    const blue = parseInt(digits.substring(4, 6), 16);

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
