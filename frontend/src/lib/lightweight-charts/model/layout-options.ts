/**
 * Represents a type of color.
 */
export const ColorType = {
    /** Solid color */
    Solid: 'solid',
    /** Vertical gradient color */
    VerticalGradient: 'gradient',
} as const;
export type ColorType = (typeof ColorType)[keyof typeof ColorType];

/**
 * Represents a solid color.
 */
export type SolidColor = {
    /**
     * Type of color.
     */
    type: typeof ColorType.Solid;

    /**
     * Color.
     */
    color: string;
};

/**
 * Represents a vertical gradient of two colors.
 */
export type VerticalGradientColor = {
    /**
     * Type of color.
     */
    type: typeof ColorType.VerticalGradient;

    /**
     * Top color
     */
    topColor: string;

    /**
     * Bottom color
     */
    bottomColor: string;
};

/**
 * Represents the background color of the chart.
 */
export type Background = SolidColor | VerticalGradientColor;

/** Represents layout options */
export type LayoutOptions = {
    /**
     * Chart and scales background color.
     *
     * @defaultValue `{ type: ColorType.Solid, color: '#FFFFFF' }`
     */
    background: Background;

    /**
     * Color of text on the scales.
     *
     * @defaultValue `'#191919'`
     */
    textColor: string;

    /**
     * Font size of text on scales in pixels.
     *
     * @defaultValue `12`
     */
    fontSize: number;

    /**
     * Font family of text on the scales.
     *
     * @defaultValue `-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif`
     */
    fontFamily: string;
};
