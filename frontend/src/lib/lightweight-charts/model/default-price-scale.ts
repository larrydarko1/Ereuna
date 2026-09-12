export const DefaultPriceScaleId = {
    Left: 'left',
    Right: 'right',
} as const;
export type DefaultPriceScaleId = (typeof DefaultPriceScaleId)[keyof typeof DefaultPriceScaleId];

export function isDefaultPriceScale(priceScaleId: string): priceScaleId is DefaultPriceScaleId {
    return priceScaleId === DefaultPriceScaleId.Left || priceScaleId === DefaultPriceScaleId.Right;
}
