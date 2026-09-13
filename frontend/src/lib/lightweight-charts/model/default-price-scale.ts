/**
 * The two price scale ids that are not overlays, and the test for them.
 */
export type DefaultPriceScaleId = (typeof DefaultPriceScaleId)[keyof typeof DefaultPriceScaleId];

export const DefaultPriceScaleId = {
    Left: 'left',
    Right: 'right',
} as const;

export function isDefaultPriceScale(priceScaleId: string): priceScaleId is DefaultPriceScaleId {
    return priceScaleId === DefaultPriceScaleId.Left || priceScaleId === DefaultPriceScaleId.Right;
}
