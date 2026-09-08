/**
 * The icon set, as path data.
 * One registry rather than an inline `<svg>` per call site: the same arrows and
 * close cross were repeated verbatim in the watchlist and the reorderable list,
 * and everything else was a unicode glyph — at the mercy of whichever font the
 * viewer happens to have, and unstyleable when it resolved to a colour emoji.
 * Each icon is a 24×24 stroked outline drawn in `currentColor`. Stroke rather
 * than fill, because a filled glyph at 14px closes up into a blob against the
 * dark themes, and all but three of the themes here are dark.
 */
export type IconName = keyof typeof ICON_PATHS;

export const ICON_PATHS = {
    'arrow-up': 'M12 19V5M5 12l7-7 7 7',
    'arrow-down': 'M12 5v14M19 12l-7 7-7-7',
    'chevron-down': 'M6 9l6 6 6-6',
    'chevron-right': 'M9 18l6-6-6-6',
    'close': 'M18 6L6 18M6 6l12 12',
    'check': 'M20 6L9 17l-5-5',
    'copy': 'M9 9h10v10H9zM5 15H4V4h11v1',
    'pencil': 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z',
    'star': 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    'eye': 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z',
    'eye-off':
        'M17.9 17.9A10.4 10.4 0 0112 20C5 20 1 12 1 12a19 19 0 015.1-6M9.9 4.2A10.6 10.6 0 0112 4c7 0 11 8 11 8a19 19 0 01-2.2 3.2M1 1l22 22',
} as const;

/** The eye needs a pupil, which no single path can carry alongside the lid. */
export const ICON_CIRCLES: Partial<Record<IconName, { cx: number; cy: number; r: number }>> = {
    eye: { cx: 12, cy: 12, r: 3 },
};
