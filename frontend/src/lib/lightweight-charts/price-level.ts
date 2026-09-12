import {
    type IChartApi,
    type IPriceLine,
    type ISeriesApi,
    LineStyle,
    type MouseEventParams,
    type SeriesType,
} from '@/lib/lightweight-charts/index';
import { type LineWidth } from '@/lib/lightweight-charts/renderers/draw-line';

export type PriceLevelData = {
    id: string;
    price: number;
    color: string;
    text: string;
    lineWidth: LineWidth;
    lineStyle: LineStyle;
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

type PriceLevelLine = {
    data: PriceLevelData;
    priceLine: IPriceLine;
    labelDiv: HTMLDivElement;
};

export class PriceLevelManager {
    private chart: IChartApi;
    private series: ISeriesApi<SeriesType>;
    private container: HTMLElement;
    private isActive = false;
    private levels = new Map<string, PriceLevelLine>();
    private clickHandler: ((param: MouseEventParams) => void) | null = null;
    private contextMenuDiv: HTMLDivElement | null = null;
    private inputDialog: HTMLDivElement | null = null;
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
        const levelData = this.levels.get(levelId)?.data ?? newLevelData;
        if (levelData === undefined) return;

        // Create dialog
        const dialog = document.createElement('div');
        dialog.className = 'price-level-input-dialog';
        dialog.style.position = 'fixed';
        dialog.style.top = '50%';
        dialog.style.left = '50%';
        dialog.style.transform = 'translate(-50%, -50%)';
        dialog.style.backgroundColor = 'var(--color-surface)';
        dialog.style.border = 'none';
        dialog.style.borderRadius = '12px';
        dialog.style.padding = '20px';
        dialog.style.zIndex = '10000';
        dialog.style.width = '300px';
        dialog.style.boxShadow = '0 8px 32px 0 rgba(0,0,0,0.18), 0 1.5px 8px 0 var(--color-accent-4)';
        dialog.style.animation = 'popup-in 0.18s cubic-bezier(.4,1.4,.6,1) backwards';

        // Title
        const title = document.createElement('h3');
        title.textContent = 'Price Level';
        title.style.margin = '0 0 14px 0';
        title.style.color = 'var(--color-accent-1)';
        title.style.fontSize = '1.1rem';
        title.style.fontWeight = '700';
        title.style.letterSpacing = '0.01em';
        dialog.appendChild(title);

        // Create a grid container for inputs
        const inputsGrid = document.createElement('div');
        inputsGrid.style.display = 'grid';
        inputsGrid.style.gridTemplateColumns = '1fr 1fr';
        inputsGrid.style.gap = '10px';
        inputsGrid.style.marginBottom = '14px';

        // Price input container
        const priceContainer = document.createElement('div');
        const priceLabel = document.createElement('label');
        priceLabel.textContent = 'Price';
        priceLabel.style.display = 'block';
        priceLabel.style.color = 'var(--color-text-muted)';
        priceLabel.style.fontSize = '0.8rem';
        priceLabel.style.fontWeight = '500';
        priceLabel.style.marginBottom = '4px';
        priceContainer.appendChild(priceLabel);

        const priceInput = document.createElement('input');
        priceInput.type = 'number';
        priceInput.step = '0.01';
        priceInput.value = levelData.price.toString();
        priceInput.style.width = '100%';
        priceInput.style.boxSizing = 'border-box';
        priceInput.style.padding = '7px 8px';
        priceInput.style.backgroundColor = 'var(--color-bg)';
        priceInput.style.border = '1.5px solid var(--color-elevated)';
        priceInput.style.borderRadius = '6px';
        priceInput.style.color = 'var(--color-text)';
        priceInput.style.fontSize = '0.9rem';
        priceInput.style.outline = 'none';
        priceInput.style.transition = 'border-color 0.18s, background 0.18s';
        priceInput.addEventListener('focus', () => {
            priceInput.style.borderColor = 'var(--color-accent-1)';
            priceInput.style.backgroundColor = 'var(--color-sunken)';
        });
        priceInput.addEventListener('blur', () => {
            priceInput.style.borderColor = 'var(--color-elevated)';
            priceInput.style.backgroundColor = 'var(--color-bg)';
        });
        priceContainer.appendChild(priceInput);
        inputsGrid.appendChild(priceContainer);

        // Line style container
        const lineStyleContainer = document.createElement('div');
        const lineStyleLabel = document.createElement('label');
        lineStyleLabel.textContent = 'Style';
        lineStyleLabel.style.display = 'block';
        lineStyleLabel.style.color = 'var(--color-text-muted)';
        lineStyleLabel.style.fontSize = '0.8rem';
        lineStyleLabel.style.fontWeight = '500';
        lineStyleLabel.style.marginBottom = '4px';
        lineStyleContainer.appendChild(lineStyleLabel);

        const lineStyleSelect = document.createElement('select');
        lineStyleSelect.style.width = '100%';
        lineStyleSelect.style.boxSizing = 'border-box';
        lineStyleSelect.style.padding = '7px 8px';
        lineStyleSelect.style.backgroundColor = 'var(--color-bg)';
        lineStyleSelect.style.border = '1.5px solid var(--color-elevated)';
        lineStyleSelect.style.borderRadius = '6px';
        lineStyleSelect.style.color = 'var(--color-text)';
        lineStyleSelect.style.fontSize = '0.9rem';
        lineStyleSelect.style.outline = 'none';
        lineStyleSelect.style.cursor = 'pointer';
        lineStyleSelect.style.transition = 'border-color 0.18s, background 0.18s';
        lineStyleSelect.addEventListener('focus', () => {
            lineStyleSelect.style.borderColor = 'var(--color-accent-1)';
            lineStyleSelect.style.backgroundColor = 'var(--color-sunken)';
        });
        lineStyleSelect.addEventListener('blur', () => {
            lineStyleSelect.style.borderColor = 'var(--color-elevated)';
            lineStyleSelect.style.backgroundColor = 'var(--color-bg)';
        });

        OFFERED_LINE_STYLES.forEach((style) => {
            const option = document.createElement('option');
            option.value = style.toString();
            option.textContent = LINE_STYLE_LABELS[style];
            lineStyleSelect.appendChild(option);
        });

        lineStyleSelect.value = levelData.lineStyle.toString();
        lineStyleContainer.appendChild(lineStyleSelect);
        inputsGrid.appendChild(lineStyleContainer);

        // Label input (full width)
        const textContainer = document.createElement('div');
        textContainer.style.gridColumn = '1 / -1'; // Span both columns
        const textLabel = document.createElement('label');
        textLabel.textContent = 'Label';
        textLabel.style.display = 'block';
        textLabel.style.color = 'var(--color-text-muted)';
        textLabel.style.fontSize = '0.8rem';
        textLabel.style.fontWeight = '500';
        textLabel.style.marginBottom = '4px';
        textContainer.appendChild(textLabel);

        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.value = levelData.text;
        textInput.placeholder = 'Stop Loss, Target, etc.';
        textInput.style.width = '100%';
        textInput.style.boxSizing = 'border-box';
        textInput.style.padding = '7px 8px';
        textInput.style.backgroundColor = 'var(--color-bg)';
        textInput.style.border = '1.5px solid var(--color-elevated)';
        textInput.style.borderRadius = '6px';
        textInput.style.color = 'var(--color-text)';
        textInput.style.fontSize = '0.9rem';
        textInput.style.outline = 'none';
        textInput.style.transition = 'border-color 0.18s, background 0.18s';
        textInput.addEventListener('focus', () => {
            textInput.style.borderColor = 'var(--color-accent-1)';
            textInput.style.backgroundColor = 'var(--color-sunken)';
        });
        textInput.addEventListener('blur', () => {
            textInput.style.borderColor = 'var(--color-elevated)';
            textInput.style.backgroundColor = 'var(--color-bg)';
        });
        textContainer.appendChild(textInput);
        inputsGrid.appendChild(textContainer);

        // Color input (full width)
        const colorContainer = document.createElement('div');
        colorContainer.style.gridColumn = '1 / -1'; // Span both columns
        const colorLabel = document.createElement('label');
        colorLabel.textContent = 'Color';
        colorLabel.style.display = 'block';
        colorLabel.style.color = 'var(--color-text-muted)';
        colorLabel.style.fontSize = '0.8rem';
        colorLabel.style.fontWeight = '500';
        colorLabel.style.marginBottom = '4px';
        colorContainer.appendChild(colorLabel);

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = levelData.color;
        colorInput.style.width = '100%';
        colorInput.style.boxSizing = 'border-box';
        colorInput.style.padding = '6px';
        colorInput.style.backgroundColor = 'var(--color-bg)';
        colorInput.style.border = '1.5px solid var(--color-elevated)';
        colorInput.style.borderRadius = '6px';
        colorInput.style.cursor = 'pointer';
        colorInput.style.height = '36px';
        colorInput.style.outline = 'none';
        colorInput.style.transition = 'border-color 0.18s';
        colorInput.addEventListener('focus', () => {
            colorInput.style.borderColor = 'var(--color-accent-1)';
        });
        colorInput.addEventListener('blur', () => {
            colorInput.style.borderColor = 'var(--color-elevated)';
        });
        colorContainer.appendChild(colorInput);
        inputsGrid.appendChild(colorContainer);

        dialog.appendChild(inputsGrid);

        // Buttons container
        const buttonsDiv = document.createElement('div');
        buttonsDiv.style.display = 'flex';
        buttonsDiv.style.gap = '8px';
        buttonsDiv.style.marginTop = '4px';
        buttonsDiv.style.justifyContent = 'flex-end';

        // Cancel button
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.style.flex = '1';
        cancelButton.style.padding = '7px 14px';
        cancelButton.style.backgroundColor = 'transparent';
        cancelButton.style.color = 'var(--color-text-muted)';
        cancelButton.style.border = '1.5px solid var(--color-elevated)';
        cancelButton.style.borderRadius = '6px';
        cancelButton.style.cursor = 'pointer';
        cancelButton.style.fontSize = '0.85rem';
        cancelButton.style.fontWeight = '600';
        cancelButton.style.transition = 'border-color 0.18s, color 0.18s';
        cancelButton.addEventListener('mouseenter', () => {
            cancelButton.style.borderColor = 'var(--color-accent-1)';
            cancelButton.style.color = 'var(--color-accent-1)';
        });
        cancelButton.addEventListener('mouseleave', () => {
            cancelButton.style.borderColor = 'var(--color-elevated)';
            cancelButton.style.color = 'var(--color-text-muted)';
        });
        cancelButton.addEventListener('click', () => {
            this.closeInputDialog();
        });
        buttonsDiv.appendChild(cancelButton);

        // Delete button (only show for existing levels)
        if (this.levels.has(levelId)) {
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.style.flex = '1';
            deleteButton.style.padding = '7px 14px';
            deleteButton.style.backgroundColor = '#f23645';
            deleteButton.style.color = '#ffffff';
            deleteButton.style.border = 'none';
            deleteButton.style.borderRadius = '6px';
            deleteButton.style.cursor = 'pointer';
            deleteButton.style.fontSize = '0.85rem';
            deleteButton.style.fontWeight = '600';
            deleteButton.style.transition = 'background 0.18s';
            deleteButton.addEventListener('mouseenter', () => {
                deleteButton.style.backgroundColor = '#d32f3f';
            });
            deleteButton.addEventListener('mouseleave', () => {
                deleteButton.style.backgroundColor = '#f23645';
            });
            deleteButton.addEventListener('click', () => {
                this.removePriceLevel(levelId);
                this.closeInputDialog();
            });
            buttonsDiv.appendChild(deleteButton);
        }

        // Save button
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save';
        saveButton.style.flex = '1';
        saveButton.style.padding = '7px 14px';
        saveButton.style.backgroundColor = 'var(--color-accent-1)';
        saveButton.style.color = 'var(--color-text-inverted)';
        saveButton.style.border = 'none';
        saveButton.style.borderRadius = '6px';
        saveButton.style.cursor = 'pointer';
        saveButton.style.fontSize = '0.85rem';
        saveButton.style.fontWeight = '600';
        saveButton.style.transition = 'background 0.18s';
        saveButton.addEventListener('mouseenter', () => {
            saveButton.style.backgroundColor = 'var(--color-accent-2)';
        });
        saveButton.addEventListener('mouseleave', () => {
            saveButton.style.backgroundColor = 'var(--color-accent-1)';
        });
        saveButton.addEventListener('click', () => {
            // The options were appended from OFFERED_LINE_STYLES in order, so
            // the selected index is the style
            const lineStyle = OFFERED_LINE_STYLES[lineStyleSelect.selectedIndex];
            if (lineStyle === undefined) return;

            const edited = {
                price: parseFloat(priceInput.value),
                text: textInput.value,
                color: colorInput.value,
                lineStyle,
            };

            if (this.levels.has(levelId)) {
                this.updatePriceLevel(levelId, edited);
            } else {
                this.addPriceLevelToChart({ id: levelId, lineWidth: DEFAULT_LINE_WIDTH, ...edited });
            }

            this.closeInputDialog();
        });
        buttonsDiv.appendChild(saveButton);

        dialog.appendChild(buttonsDiv);

        // Add overlay
        const overlay = document.createElement('div');
        overlay.className = 'price-level-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(24, 25, 38, 0.55)';
        overlay.style.backdropFilter = 'blur(2px)';
        overlay.style.zIndex = '9999';
        overlay.addEventListener('click', () => {
            this.closeInputDialog();
        });

        document.body.appendChild(overlay);
        document.body.appendChild(dialog);

        this.inputDialog = dialog;

        // Focus text input
        textInput.focus();
        textInput.select();
    }

    private closeInputDialog(): void {
        this.inputDialog?.remove();
        this.inputDialog = null;

        document.querySelector('.price-level-overlay')?.remove();
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

        const menu = document.createElement('div');
        menu.className = 'price-level-context-menu';
        menu.style.position = 'fixed';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.style.backgroundColor = '#1e222d';
        menu.style.border = '1px solid #434651';
        menu.style.borderRadius = '4px';
        menu.style.padding = '4px';
        menu.style.zIndex = '10001';
        menu.style.minWidth = '120px';
        menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';

        // Edit option
        const editOption = document.createElement('div');
        editOption.textContent = 'Edit';
        editOption.className = 'context-menu-item';
        editOption.style.padding = '8px 12px';
        editOption.style.color = '#d1d4dc';
        editOption.style.cursor = 'pointer';
        editOption.style.fontSize = '12px';
        editOption.addEventListener('mouseenter', () => {
            editOption.style.backgroundColor = '#2962FF';
        });
        editOption.addEventListener('mouseleave', () => {
            editOption.style.backgroundColor = 'transparent';
        });
        editOption.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showInputDialog(levelId);
            this.closeContextMenu();
        });
        menu.appendChild(editOption);

        // Delete option
        const deleteOption = document.createElement('div');
        deleteOption.textContent = 'Delete';
        deleteOption.className = 'context-menu-item';
        deleteOption.style.padding = '8px 12px';
        deleteOption.style.color = '#f23645';
        deleteOption.style.cursor = 'pointer';
        deleteOption.style.fontSize = '12px';
        deleteOption.addEventListener('mouseenter', () => {
            deleteOption.style.backgroundColor = '#f23645';
            deleteOption.style.color = '#ffffff';
        });
        deleteOption.addEventListener('mouseleave', () => {
            deleteOption.style.backgroundColor = 'transparent';
            deleteOption.style.color = '#f23645';
        });
        deleteOption.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removePriceLevel(levelId);
            this.closeContextMenu();
        });
        menu.appendChild(deleteOption);

        document.body.appendChild(menu);
        this.contextMenuDiv = menu;
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
