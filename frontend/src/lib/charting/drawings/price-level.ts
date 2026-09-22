/**
 * The horizontal price line tool, and the dialog that edits one.
 *
 * A level is stored as a price alone rather than a point, so it spans the whole
 * plot and survives a horizontal pan without being re-derived.
 */
import { openPriceLevelDialog, openPriceLevelMenu } from '@/lib/charting/drawings/price-level-dialog';
import { type IChartApi } from '@/lib/charting/engine/api/create-chart';
import { type MouseEventParams } from '@/lib/charting/engine/api/ichart-api';
import { type IPriceLine } from '@/lib/charting/engine/api/iprice-line';
import { type ISeriesApi } from '@/lib/charting/engine/api/iseries-api';
import { type SeriesType } from '@/lib/charting/engine/model/series/series-options';
import { LineStyle } from '@/lib/charting/engine/renderers/draw-line';
import { type LineWidth } from '@/lib/charting/engine/renderers/draw-line';

export type PriceLevelData = {
    id: string;
    price: number;
    color: string;
    text: string;
    lineWidth: LineWidth;
    lineStyle: LineStyle;
};

type PriceLevelLine = {
    data: PriceLevelData;
    priceLine: IPriceLine;
    labelDiv: HTMLDivElement;
};

// The only three styles the dialog offers — the library knows two more, but a
// level is a single reference price and does not need them
const OFFERED_LINE_STYLES = [LineStyle.Solid, LineStyle.Dotted, LineStyle.Dashed] as const;

// English, because this dialog is built in the DOM and cannot reach i18n. It
// belongs in the locale files, which means the dialog belongs in a component.
const LINE_STYLE_LABELS: Record<(typeof OFFERED_LINE_STYLES)[number], string> = {
    [LineStyle.Solid]: 'Solid',
    [LineStyle.Dotted]: 'Dotted',
    [LineStyle.Dashed]: 'Dashed',
};

const DEFAULT_LINE_WIDTH: LineWidth = 2;

const DEFAULT_LEVEL_COLOR = '#2962FF';

export class PriceLevelManager {
    private chart: IChartApi;
    private series: ISeriesApi<SeriesType>;
    private container: HTMLElement;
    private isActive = false;
    private levels = new Map<string, PriceLevelLine>();
    private clickHandler: ((param: MouseEventParams) => void) | null = null;
    private contextMenuDiv: HTMLDivElement | null = null;
    private closeDialog: (() => void) | null = null;
    private onChangeCallback: (() => void) | null = null;
    private selectedLevelId: string | null = null;
    private isDeserializing = false;
    private isClearing = false;

    constructor(chart: IChartApi, series: ISeriesApi<SeriesType>, container: HTMLElement) {
        this.chart = chart;
        this.series = series;
        this.container = container;

        // Deleting a level is a keyboard shortcut whether or not the tool is the
        // active one, so this listener outlives activate/deactivate
        document.addEventListener('keydown', this.handleKeyDown);
    }

    public onChange(callback: () => void): void {
        this.onChangeCallback = callback;
    }

    public activate(): void {
        if (this.isActive) return;
        this.isActive = true;

        this.clickHandler = this.handleClick;
        this.chart.subscribeClick(this.clickHandler);

        this.container.style.cursor = 'crosshair';

        document.addEventListener('click', this.handleDocumentClick);
    }

    public deactivate(): void {
        if (!this.isActive) return;
        this.isActive = false;

        if (this.clickHandler !== null) {
            this.chart.unsubscribeClick(this.clickHandler);
            this.clickHandler = null;
        }

        this.container.style.cursor = 'default';

        document.removeEventListener('click', this.handleDocumentClick);

        this.closeInputDialog();
        this.closeContextMenu();
    }

    public isActivated(): boolean {
        return this.isActive;
    }

    private notifyChange(): void {
        if (this.onChangeCallback !== null && !this.isDeserializing && !this.isClearing) {
            this.onChangeCallback();
        }
    }

    // The three DOM handlers are arrow properties so that `this` survives being
    // handed to addEventListener and to the chart's own subscription
    private handleClick = (param: MouseEventParams): void => {
        if (param.point === undefined || !this.isActive) return;

        const price = this.series.coordinateToPrice(param.point.y);
        if (price === null) return;

        this.createPriceLevel(price);
    };

    private handleDocumentClick = (event: MouseEvent): void => {
        // A click anywhere but inside the menu dismisses it
        if (this.contextMenuDiv !== null && !this.contextMenuDiv.contains(event.target as Node)) {
            this.closeContextMenu();
        }
    };

    private handleKeyDown = (event: KeyboardEvent): void => {
        if (event.key !== 'Backspace' && event.key !== 'Delete') return;

        // Not while the caret is in a field — there the key means "erase a
        // character", including inside this tool's own dialog
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }

        if (this.selectedLevelId !== null) {
            event.preventDefault(); // Backspace would otherwise navigate back
            this.removePriceLevel(this.selectedLevelId);
        }
    };

    private createPriceLevel(price: number): void {
        const id = `level-${Date.now()}-${Math.random()}`;

        const levelData: PriceLevelData = {
            id,
            price,
            color: DEFAULT_LEVEL_COLOR,
            text: '',
            lineWidth: DEFAULT_LINE_WIDTH,
            lineStyle: LineStyle.Solid,
        };

        // Show dialog first, only add to chart after confirmation
        this.showInputDialog(id, levelData);
    }

    private addPriceLevelToChart(levelData: PriceLevelData): void {
        const priceLine = this.series.createPriceLine({
            price: levelData.price,
            color: levelData.color,
            lineWidth: levelData.lineWidth,
            lineStyle: levelData.lineStyle,
            axisLabelVisible: true,
            title: levelData.text,
        });

        this.levels.set(levelData.id, {
            data: levelData,
            priceLine,
            labelDiv: this.createLabelDiv(levelData),
        });

        this.updateLabelPosition(levelData.id);
        this.notifyChange();
    }

    private createLabelDiv(levelData: PriceLevelData): HTMLDivElement {
        const labelDiv = document.createElement('div');
        labelDiv.className = 'price-level-label';
        labelDiv.style.position = 'absolute';
        labelDiv.style.pointerEvents = 'auto';
        labelDiv.style.backgroundColor = levelData.color;
        labelDiv.style.color = '#ffffff';
        labelDiv.style.padding = '2px 6px';
        labelDiv.style.borderRadius = '3px';
        labelDiv.style.fontSize = '11px';
        labelDiv.style.fontWeight = 'bold';
        labelDiv.style.zIndex = '1000';
        labelDiv.style.cursor = 'pointer';
        labelDiv.style.whiteSpace = 'nowrap';
        labelDiv.style.userSelect = 'none';
        labelDiv.textContent = levelData.text === '' ? levelData.price.toFixed(2) : levelData.text;

        // Click to select
        labelDiv.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.selectLevel(levelData.id);
        });

        // Right-click context menu
        labelDiv.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.selectLevel(levelData.id);
            this.showContextMenu(levelData.id, event.clientX, event.clientY);
        });

        // Double-click to edit
        labelDiv.addEventListener('dblclick', (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.selectLevel(levelData.id);
            this.showInputDialog(levelData.id);
        });

        this.container.appendChild(labelDiv);
        return labelDiv;
    }

    private selectLevel(id: string): void {
        if (this.selectedLevelId !== null && this.selectedLevelId !== id) {
            const previousLevel = this.levels.get(this.selectedLevelId);
            if (previousLevel !== undefined) {
                previousLevel.labelDiv.style.border = 'none';
                previousLevel.labelDiv.style.boxShadow = 'none';
            }
        }

        this.selectedLevelId = id;
        const level = this.levels.get(id);
        if (level !== undefined) {
            level.labelDiv.style.border = '2px solid #ffffff';
            level.labelDiv.style.boxShadow = '0 0 8px rgba(255, 255, 255, 0.5)';
        }
    }

    private updateLabelPosition(id: string): void {
        const level = this.levels.get(id);
        if (level === undefined) return;

        const coordinate = this.series.priceToCoordinate(level.data.price);
        const chartHeight = this.container.getBoundingClientRect().height;

        // A level whose price has scrolled off the visible scale has no
        // coordinate to pin the label to
        if (coordinate === null || isNaN(coordinate) || coordinate < 0 || coordinate > chartHeight) {
            level.labelDiv.style.display = 'none';
            return;
        }

        level.labelDiv.style.display = 'block';
        level.labelDiv.style.left = '10px';
        level.labelDiv.style.top = `${coordinate - 10}px`;
    }

    private showInputDialog(levelId: string, newLevelData?: PriceLevelData): void {
        this.closeInputDialog();

        // An existing level edits what is on the chart; a new one is still only
        // the caller's draft and has nothing in the map yet
        const existing = this.levels.get(levelId);
        const levelData = existing?.data ?? newLevelData;
        if (levelData === undefined) return;

        this.closeDialog = openPriceLevelDialog(
            levelData,
            { offered: OFFERED_LINE_STYLES, labels: LINE_STYLE_LABELS },
            {
                onSave: (edited): void => {
                    if (existing === undefined) {
                        this.addPriceLevelToChart({ id: levelId, lineWidth: DEFAULT_LINE_WIDTH, ...edited });
                    } else {
                        this.updatePriceLevel(levelId, edited);
                    }
                },
                onDelete: existing === undefined ? null : (): void => this.removePriceLevel(levelId),
            },
        );
    }

    private closeInputDialog(): void {
        this.closeDialog?.();
        this.closeDialog = null;
    }

    private updatePriceLevel(id: string, edited: Omit<PriceLevelData, 'id' | 'lineWidth'>): void {
        const level = this.levels.get(id);
        if (level === undefined) return;

        // A price line's options are fixed at creation, so a style change means
        // a new line rather than a mutation
        this.series.removePriceLine(level.priceLine);

        level.data = { ...level.data, ...edited };

        level.priceLine = this.series.createPriceLine({
            price: level.data.price,
            color: level.data.color,
            lineWidth: level.data.lineWidth,
            lineStyle: level.data.lineStyle,
            axisLabelVisible: true,
            title: level.data.text,
        });

        level.labelDiv.style.backgroundColor = level.data.color;
        level.labelDiv.textContent = level.data.text === '' ? level.data.price.toFixed(2) : level.data.text;

        this.updateLabelPosition(id);
        this.notifyChange();
    }

    private showContextMenu(levelId: string, x: number, y: number): void {
        this.closeContextMenu();

        this.contextMenuDiv = openPriceLevelMenu(
            { x, y },
            {
                onEdit: (): void => {
                    this.showInputDialog(levelId);
                    this.closeContextMenu();
                },
                onDelete: (): void => {
                    this.removePriceLevel(levelId);
                    this.closeContextMenu();
                },
            },
        );
    }

    private closeContextMenu(): void {
        this.contextMenuDiv?.remove();
        this.contextMenuDiv = null;
    }

    private removePriceLevel(id: string): void {
        const level = this.levels.get(id);
        if (level === undefined) return;

        this.series.removePriceLine(level.priceLine);
        level.labelDiv.remove();
        this.levels.delete(id);

        if (this.selectedLevelId === id) {
            this.selectedLevelId = null;
        }

        this.notifyChange();
    }

    public removeSelectedLevel(): void {
        if (this.selectedLevelId !== null) {
            this.removePriceLevel(this.selectedLevelId);
        }
    }

    public clear(): void {
        // The chart is being emptied on purpose, so the per-level change
        // notifications must not each trigger a save of a half-cleared chart
        this.isClearing = true;
        this.levels.forEach((_level, id) => {
            this.removePriceLevel(id);
        });
        this.levels.clear();
        this.isClearing = false;
    }

    public destroy(): void {
        this.deactivate();
        this.clear();

        document.removeEventListener('keydown', this.handleKeyDown);
    }

    public serialize(): PriceLevelData[] {
        return Array.from(this.levels.values(), (level) => ({ ...level.data }));
    }

    public deserialize(data: PriceLevelData[]): void {
        // Loading what the server already holds is not a change to save back
        this.isDeserializing = true;
        this.clear();
        data.forEach((levelData) => {
            this.addPriceLevelToChart(levelData);
        });
        this.isDeserializing = false;
    }

    /** Called when the chart is resized or scrolled and the labels have drifted */
    public updatePositions(): void {
        this.levels.forEach((_level, id) => {
            this.updateLabelPosition(id);
        });
    }
}
