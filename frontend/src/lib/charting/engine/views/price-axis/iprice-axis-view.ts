/**
 * What a price axis label provides: its renderers, and how much room it
 * needs.
 */
import { type PriceScale } from '@/lib/charting/engine/model/price/price-scale';
import {
    type IPriceAxisViewRenderer,
    type PriceAxisViewRendererOptions,
} from '@/lib/charting/engine/renderers/iprice-axis-view-renderer';

export type IPriceAxisView = {
    coordinate(): number;
    getFixedCoordinate(): number;
    height(rendererOptions: PriceAxisViewRendererOptions): number;
    isVisible(): boolean;
    isAxisLabelVisible(): boolean;
    renderer(priceScale: PriceScale): IPriceAxisViewRenderer;
    paneRenderer(): IPriceAxisViewRenderer;
    setFixedCoordinate(value: number | null): void;
    text(): string;
    update(): void;
};
