/**
 * Draws one label on a price axis: the tag, its tick, and the text.
 *
 * The tag may point either way, because the same renderer draws the labels on the
 * left axis and on the right.
 */
import {
    type BitmapCoordinatesRenderingScope,
    type CanvasRenderingTarget2D,
    type MediaCoordinatesRenderingScope,
} from 'fancy-canvas';

import { drawRoundRectWithBorder } from '@/lib/charting/engine/helpers/canvas-helpers';

import { type TextWidthCache } from '@/lib/charting/engine/model/text-width-cache';

import {
    type IPriceAxisViewRenderer,
    type PriceAxisViewRendererCommonData,
    type PriceAxisViewRendererData,
    type PriceAxisViewRendererOptions,
} from '@/lib/charting/engine/renderers/iprice-axis-view-renderer';

type Geometry = {
    alignRight: boolean;

    // bitmap coordinate space geometry
    bitmap: {
        yTop: number;
        yMid: number;
        yBottom: number;
        totalWidth: number;
        totalHeight: number;
        radius: number;
        horzBorder: number;
        xOutside: number;
        xInside: number;
        xTick: number;
        tickHeight: number;
        right: number;
    };

    // media coordinate space geometry
    media: {
        yTop: number;
        yBottom: number;
        xText: number;
        textMidCorrection: number;
    };
};

export class PriceAxisViewRenderer implements IPriceAxisViewRenderer {
    private _data!: PriceAxisViewRendererData;
    private _commonData!: PriceAxisViewRendererCommonData;

    public constructor(data: PriceAxisViewRendererData, commonData: PriceAxisViewRendererCommonData) {
        this.setData(data, commonData);
    }

    public setData(data: PriceAxisViewRendererData, commonData: PriceAxisViewRendererCommonData): void {
        this._data = data;
        this._commonData = commonData;
    }

    public height(rendererOptions: PriceAxisViewRendererOptions): number {
        if (!this._data.visible) {
            return 0;
        }

        return rendererOptions.fontSize + rendererOptions.paddingTop + rendererOptions.paddingBottom;
    }

    public draw(
        target: CanvasRenderingTarget2D,
        rendererOptions: PriceAxisViewRendererOptions,
        textWidthCache: TextWidthCache,
        align: 'left' | 'right',
    ): void {
        if (!this._data.visible || this._data.text.length === 0) {
            return;
        }

        const textColor = this._data.color;
        const backgroundColor = this._commonData.background;

        const geometry = target.useBitmapCoordinateSpace((scope: BitmapCoordinatesRenderingScope) => {
            const ctx = scope.context;
            ctx.font = rendererOptions.font;
            const geom = this._calculateGeometry(scope, rendererOptions, textWidthCache, align);
            const gb = geom.bitmap;

            const drawLabelBody = (labelBackgroundColor: string, labelBorderColor?: string): void => {
                /*
				 labelBackgroundColor (and labelBorderColor) will always be a solid color (no alpha) [see generateContrastColors in color.ts].
				 Therefore we can draw the rounded label using simplified code (drawRoundRectWithBorder) that doesn't need to ensure the background and the border don't overlap.
				*/
                if (geom.alignRight) {
                    drawRoundRectWithBorder(
                        ctx,
                        {
                            left: gb.xOutside,
                            top: gb.yTop,
                            width: gb.totalWidth,
                            height: gb.totalHeight,
                            outerRadius: [gb.radius, 0, 0, gb.radius],
                        },
                        {
                            backgroundColor: labelBackgroundColor,
                            borderColor: labelBorderColor ?? '',
                            borderWidth: gb.horzBorder,
                        },
                    );
                } else {
                    drawRoundRectWithBorder(
                        ctx,
                        {
                            left: gb.xInside,
                            top: gb.yTop,
                            width: gb.totalWidth,
                            height: gb.totalHeight,
                            outerRadius: [0, gb.radius, gb.radius, 0],
                        },
                        {
                            backgroundColor: labelBackgroundColor,
                            borderColor: labelBorderColor ?? '',
                            borderWidth: gb.horzBorder,
                        },
                    );
                }
            };

            // draw border
            // draw label background
            drawLabelBody(backgroundColor, 'transparent');
            // draw tick
            if (this._data.tickVisible) {
                ctx.fillStyle = textColor;
                ctx.fillRect(gb.xInside, gb.yMid, gb.xTick - gb.xInside, gb.tickHeight);
            }
            // draw label border above the tick
            drawLabelBody('transparent', backgroundColor);

            // draw separator
            if (this._data.borderVisible) {
                ctx.fillStyle = rendererOptions.paneBackgroundColor;
                ctx.fillRect(
                    geom.alignRight ? gb.right - gb.horzBorder : 0,
                    gb.yTop,
                    gb.horzBorder,
                    gb.yBottom - gb.yTop,
                );
            }

            return geom;
        });

        target.useMediaCoordinateSpace(({ context: ctx }: MediaCoordinatesRenderingScope) => {
            const gm = geometry.media;
            ctx.font = rendererOptions.font;
            ctx.textAlign = geometry.alignRight ? 'right' : 'left';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = textColor;
            ctx.fillText(this._data.text, gm.xText, (gm.yTop + gm.yBottom) / 2 + gm.textMidCorrection);
        });
    }

    private _calculateGeometry(
        scope: BitmapCoordinatesRenderingScope,
        rendererOptions: PriceAxisViewRendererOptions,
        textWidthCache: TextWidthCache,
        align: 'left' | 'right',
    ): Geometry {
        const { context: ctx, bitmapSize, mediaSize, horizontalPixelRatio, verticalPixelRatio } = scope;
        const tickSize = this._data.tickVisible || !this._data.moveTextToInvisibleTick ? rendererOptions.tickLength : 0;
        const horzBorder = this._data.separatorVisible ? rendererOptions.borderSize : 0;
        const paddingTop = rendererOptions.paddingTop + this._commonData.additionalPaddingTop;
        const paddingBottom = rendererOptions.paddingBottom + this._commonData.additionalPaddingBottom;
        const paddingInner = rendererOptions.paddingInner;
        const paddingOuter = rendererOptions.paddingOuter;
        const text = this._data.text;
        const actualTextHeight = rendererOptions.fontSize;
        const textMidCorrection = textWidthCache.yMidCorrection(ctx, text);

        const textWidth = Math.ceil(textWidthCache.measureText(ctx, text));

        const totalHeight = actualTextHeight + paddingTop + paddingBottom;

        const totalWidth = rendererOptions.borderSize + paddingInner + paddingOuter + textWidth + tickSize;

        const tickHeightBitmap = Math.max(1, Math.floor(verticalPixelRatio));
        let totalHeightBitmap = Math.round(totalHeight * verticalPixelRatio);
        if (totalHeightBitmap % 2 !== tickHeightBitmap % 2) {
            totalHeightBitmap += 1;
        }
        const horzBorderBitmap = horzBorder > 0 ? Math.max(1, Math.floor(horzBorder * horizontalPixelRatio)) : 0;
        const totalWidthBitmap = Math.round(totalWidth * horizontalPixelRatio);
        // tick overlaps scale border
        const tickSizeBitmap = Math.round(tickSize * horizontalPixelRatio);

        const yMid = this._commonData.fixedCoordinate ?? this._commonData.coordinate;
        const yMidBitmap = Math.round(yMid * verticalPixelRatio) - Math.floor(verticalPixelRatio * 0.5);
        const yTopBitmap = Math.floor(yMidBitmap + tickHeightBitmap / 2 - totalHeightBitmap / 2);
        const yBottomBitmap = yTopBitmap + totalHeightBitmap;

        const alignRight = align === 'right';

        const xInside = alignRight ? mediaSize.width - horzBorder : horzBorder;
        const xInsideBitmap = alignRight ? bitmapSize.width - horzBorderBitmap : horzBorderBitmap;

        let xOutsideBitmap: number;
        let xTickBitmap: number;
        let xText: number;

        if (alignRight) {
            // 2               1
            //
            //              6  5
            //
            // 3               4
            xOutsideBitmap = xInsideBitmap - totalWidthBitmap;
            xTickBitmap = xInsideBitmap - tickSizeBitmap;
            xText = xInside - tickSize - paddingInner - horzBorder;
        } else {
            // 1               2
            //
            // 6  5
            //
            // 4               3
            xOutsideBitmap = xInsideBitmap + totalWidthBitmap;
            xTickBitmap = xInsideBitmap + tickSizeBitmap;
            xText = xInside + tickSize + paddingInner;
        }

        return {
            alignRight,
            bitmap: {
                yTop: yTopBitmap,
                yMid: yMidBitmap,
                yBottom: yBottomBitmap,
                totalWidth: totalWidthBitmap,
                totalHeight: totalHeightBitmap,
                // Upstream note: horizontal and vertical radii would be better kept apart
                radius: 2 * horizontalPixelRatio,
                horzBorder: horzBorderBitmap,
                xOutside: xOutsideBitmap,
                xInside: xInsideBitmap,
                xTick: xTickBitmap,
                tickHeight: tickHeightBitmap,
                right: bitmapSize.width,
            },
            media: {
                yTop: yTopBitmap / verticalPixelRatio,
                yBottom: yBottomBitmap / verticalPixelRatio,
                xText,
                textMidCorrection,
            },
        };
    }
}
