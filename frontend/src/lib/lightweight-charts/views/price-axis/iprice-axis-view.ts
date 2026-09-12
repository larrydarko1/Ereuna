import { type PriceScale } from '@/lib/lightweight-charts/model/price-scale';
import {
    type IPriceAxisViewRenderer,
    type PriceAxisViewRendererOptions,
} from '@/lib/lightweight-charts/renderers/iprice-axis-view-renderer';

export interface IPriceAxisView {
    coordinate(): number;
    getFixedCoordinate(): number;
    height(rendererOptions: PriceAxisViewRendererOptions, useSecondLine?: boolean): number;
    isVisible(): boolean;
    isAxisLabelVisible(): boolean;
    renderer(priceScale: PriceScale): IPriceAxisViewRenderer;
    paneRenderer(): IPriceAxisViewRenderer;
    setFixedCoordinate(value: number | null): void;
    text(): string;
    update(): void;
}
