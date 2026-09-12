/**
 * Default font family.
 * Must be used to generate font string when font is not specified.
 */
export const defaultFontFamily = `-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif`;

/**
 * Generates a font string, which can be used to set in canvas' font property.
 *
 * @param size - Font size in pixels.
 * @param family - Font family. The options carry {@link defaultFontFamily} when
 * the caller did not name one, so there is nothing to fall back to here.
 * @param style - Optional font style.
 * @returns The font string.
 */
export function makeFont(size: number, family: string, style?: string): string {
    const prefix = style === undefined ? '' : `${style} `;
    return `${prefix}${size}px ${family}`;
}
