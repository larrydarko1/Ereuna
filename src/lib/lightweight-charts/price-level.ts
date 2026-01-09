import { IChartApi, MouseEventParams, Time } from './index';

export interface PriceLevelData {
    id: string;
    price: number;
    color: string;
    text: string;
    lineWidth: number;
    lineStyle: number; // 0 = solid, 1 = dotted, 2 = dashed
}

interface PriceLevelLine {
    data: PriceLevelData;
    priceLine: any;
    labelDiv: HTMLDivElement;
}

export class PriceLevelManager {
    private chart: IChartApi;
    private series: any;
    private container: HTMLElement;
    private isActive: boolean = false;
    private levels: Map<string, PriceLevelLine> = new Map();
    private clickHandler: ((param: MouseEventParams) => void) | null = null;
    private editingLevelId: string | null = null;
    private contextMenuDiv: HTMLDivElement | null = null;
    private inputDialog: HTMLDivElement | null = null;
    private onChangeCallback: (() => void) | null = null;
    private selectedLevelId: string | null = null;
    private keyDownHandler: ((event: KeyboardEvent) => void) | null = null;
    private isDeserializing: boolean = false;
    private isClearing: boolean = false;

    constructor(
        chart: IChartApi,
        series: any,
        container: HTMLElement
    ) {
        this.chart = chart;
        this.series = series;
        this.container = container;

        // Bind methods
        this.handleClick = this.handleClick.bind(this);
        this.handleDocumentClick = this.handleDocumentClick.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);

        // Always listen for keyboard events (for deletion)
        this.keyDownHandler = this.handleKeyDown;
        document.addEventListener('keydown', this.keyDownHandler);
    }

    public onChange(callback: () => void): void {
        this.onChangeCallback = callback;
    }

    private notifyChange(): void {
        if (this.onChangeCallback && !this.isDeserializing && !this.isClearing) {
            this.onChangeCallback();
        }
    }

    public activate(): void {
        if (this.isActive) return;
        this.isActive = true;

        // Subscribe to chart clicks
        this.clickHandler = this.handleClick;
        this.chart.subscribeClick(this.clickHandler);

        // Change cursor
        this.container.style.cursor = 'crosshair';

        // Add document click handler to close context menus
        document.addEventListener('click', this.handleDocumentClick);
    }

    public deactivate(): void {
        if (!this.isActive) return;
        this.isActive = false;

        // Unsubscribe from chart clicks
        if (this.clickHandler) {
            this.chart.unsubscribeClick(this.clickHandler);
            this.clickHandler = null;
        }

        // Reset cursor
        this.container.style.cursor = 'default';

        // Remove document click handler
        document.removeEventListener('click', this.handleDocumentClick);

        // Close any open dialogs
        this.closeInputDialog();
        this.closeContextMenu();
    }

    public isActivated(): boolean {
        return this.isActive;
    }

    public setMainSeries(series: any): void {
        this.series = series;
        // Recreate all price lines with the new series
        const levelsArray = Array.from(this.levels.entries());
        this.levels.clear();

        levelsArray.forEach(([id, level]) => {
            this.addPriceLevelToChart(level.data);
        });
    }

    private handleClick(param: MouseEventParams): void {
        if (!param.point || !param.seriesData || !this.isActive) return;

        // Get the price at the clicked point
        const price = this.series.coordinateToPrice(param.point.y);
        if (price === null) return;

        // Create a new price level
        this.createPriceLevel(price);
    }

    private handleDocumentClick(event: MouseEvent): void {
        // Close context menu if clicking outside of it
        if (this.contextMenuDiv && !this.contextMenuDiv.contains(event.target as Node)) {
            this.closeContextMenu();
        }
    }

    private handleKeyDown(event: KeyboardEvent): void {
        // Check if Backspace or Delete key was pressed
        if (event.key === 'Backspace' || event.key === 'Delete') {
            // Don't delete if user is typing in an input field
            const target = event.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            // Delete the selected level if there is one
            if (this.selectedLevelId) {
                event.preventDefault(); // Prevent browser back navigation on Backspace
                this.removePriceLevel(this.selectedLevelId);
            }
        }
    }

    private createPriceLevel(price: number): void {
        const id = `level-${Date.now()}-${Math.random()}`;

        const levelData: PriceLevelData = {
            id,
            price,
            color: '#2962FF',
            text: '',
            lineWidth: 2,
            lineStyle: 0, // solid
        };

        // Show dialog first, only add to chart after confirmation
        this.showInputDialog(id, levelData);
    }

    private addPriceLevelToChart(levelData: PriceLevelData): void {
        // Create price line
        const priceLine = this.series.createPriceLine({
            price: levelData.price,
            color: levelData.color,
            lineWidth: levelData.lineWidth,
            lineStyle: levelData.lineStyle,
            axisLabelVisible: true,
            title: levelData.text || '',
        });

        // Create label div for text display on chart
        const labelDiv = this.createLabelDiv(levelData);

        // Store the level
        this.levels.set(levelData.id, {
            data: levelData,
            priceLine,
            labelDiv,
        });

        // Update label position
        this.updateLabelPosition(levelData.id);

        // Notify change for auto-save
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
        labelDiv.textContent = levelData.text || levelData.price.toFixed(2);

        // Click to select
        labelDiv.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.selectLevel(levelData.id);
        });

        // Right-click context menu
        labelDiv.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.selectLevel(levelData.id);
            this.showContextMenu(levelData.id, e.clientX, e.clientY);
        });

        // Double-click to edit
        labelDiv.addEventListener('dblclick', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.selectLevel(levelData.id);
            this.showInputDialog(levelData.id);
        });

        this.container.appendChild(labelDiv);
        return labelDiv;
    }

    private selectLevel(id: string): void {
        // Deselect previous level
        if (this.selectedLevelId && this.selectedLevelId !== id) {
            const prevLevel = this.levels.get(this.selectedLevelId);
            if (prevLevel) {
                prevLevel.labelDiv.style.border = 'none';
                prevLevel.labelDiv.style.boxShadow = 'none';
            }
        }

        // Select new level
        this.selectedLevelId = id;
        const level = this.levels.get(id);
        if (level) {
            level.labelDiv.style.border = '2px solid #ffffff';
            level.labelDiv.style.boxShadow = '0 0 8px rgba(255, 255, 255, 0.5)';
        }
    }

    private updateLabelPosition(id: string): void {
        const level = this.levels.get(id);
        if (!level) return;

        const y = this.series.priceToCoordinate(level.data.price);

        // Hide label if price is not visible or coordinate is invalid
        if (y === null || isNaN(y) || y < 0) {
            level.labelDiv.style.display = 'none';
            return;
        }

        // Get chart container dimensions to check bounds
        const containerRect = this.container.getBoundingClientRect();
        const chartHeight = containerRect.height;

        // Hide label if it's outside the visible chart bounds (with some padding)
        if (y < 0 || y > chartHeight) {
            level.labelDiv.style.display = 'none';
            return;
        }

        // Show and position label
        level.labelDiv.style.display = 'block';
        level.labelDiv.style.left = '10px';
        level.labelDiv.style.top = `${y - 10}px`;
    }

    private updateAllLabelPositions(): void {
        this.levels.forEach((_, id) => {
            this.updateLabelPosition(id);
        });
    }

    private showInputDialog(levelId: string, newLevelData?: PriceLevelData): void {
        this.closeInputDialog();
        this.editingLevelId = levelId;

        // For existing levels, get from map; for new levels, use provided data
        let level = this.levels.get(levelId);
        let levelData: PriceLevelData;

        if (level) {
            levelData = level.data;
        } else if (newLevelData) {
            levelData = newLevelData;
        } else {
            return; // No data available
        }

        // Create dialog
        const dialog = document.createElement('div');
        dialog.className = 'price-level-input-dialog';
        dialog.style.position = 'fixed';
        dialog.style.top = '50%';
        dialog.style.left = '50%';
        dialog.style.transform = 'translate(-50%, -50%)';
        dialog.style.backgroundColor = 'var(--base2)';
        dialog.style.border = 'none';
        dialog.style.borderRadius = '12px';
        dialog.style.padding = '20px';
        dialog.style.zIndex = '10000';
        dialog.style.width = '300px';
        dialog.style.boxShadow = '0 8px 32px 0 rgba(0,0,0,0.18), 0 1.5px 8px 0 var(--accent4)';
        dialog.style.animation = 'popup-in 0.18s cubic-bezier(.4,1.4,.6,1) backwards';

        // Title
        const title = document.createElement('h3');
        title.textContent = 'Price Level';
        title.style.margin = '0 0 14px 0';
        title.style.color = 'var(--accent1)';
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
        priceLabel.style.color = 'var(--text2)';
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
        priceInput.style.backgroundColor = 'var(--base1)';
        priceInput.style.border = '1.5px solid var(--base3)';
        priceInput.style.borderRadius = '6px';
        priceInput.style.color = 'var(--text1)';
        priceInput.style.fontSize = '0.9rem';
        priceInput.style.outline = 'none';
        priceInput.style.transition = 'border-color 0.18s, background 0.18s';
        priceInput.addEventListener('focus', () => {
            priceInput.style.borderColor = 'var(--accent1)';
            priceInput.style.backgroundColor = 'var(--base4)';
        });
        priceInput.addEventListener('blur', () => {
            priceInput.style.borderColor = 'var(--base3)';
            priceInput.style.backgroundColor = 'var(--base1)';
        });
        priceContainer.appendChild(priceInput);
        inputsGrid.appendChild(priceContainer);

        // Line style container
        const lineStyleContainer = document.createElement('div');
        const lineStyleLabel = document.createElement('label');
        lineStyleLabel.textContent = 'Style';
        lineStyleLabel.style.display = 'block';
        lineStyleLabel.style.color = 'var(--text2)';
        lineStyleLabel.style.fontSize = '0.8rem';
        lineStyleLabel.style.fontWeight = '500';
        lineStyleLabel.style.marginBottom = '4px';
        lineStyleContainer.appendChild(lineStyleLabel);

        const lineStyleSelect = document.createElement('select');
        lineStyleSelect.style.width = '100%';
        lineStyleSelect.style.boxSizing = 'border-box';
        lineStyleSelect.style.padding = '7px 8px';
        lineStyleSelect.style.backgroundColor = 'var(--base1)';
        lineStyleSelect.style.border = '1.5px solid var(--base3)';
        lineStyleSelect.style.borderRadius = '6px';
        lineStyleSelect.style.color = 'var(--text1)';
        lineStyleSelect.style.fontSize = '0.9rem';
        lineStyleSelect.style.outline = 'none';
        lineStyleSelect.style.cursor = 'pointer';
        lineStyleSelect.style.transition = 'border-color 0.18s, background 0.18s';
        lineStyleSelect.addEventListener('focus', () => {
            lineStyleSelect.style.borderColor = 'var(--accent1)';
            lineStyleSelect.style.backgroundColor = 'var(--base4)';
        });
        lineStyleSelect.addEventListener('blur', () => {
            lineStyleSelect.style.borderColor = 'var(--base3)';
            lineStyleSelect.style.backgroundColor = 'var(--base1)';
        });

        const solidOption = document.createElement('option');
        solidOption.value = '0';
        solidOption.textContent = 'Solid';
        lineStyleSelect.appendChild(solidOption);

        const dottedOption = document.createElement('option');
        dottedOption.value = '1';
        dottedOption.textContent = 'Dotted';
        lineStyleSelect.appendChild(dottedOption);

        const dashedOption = document.createElement('option');
        dashedOption.value = '2';
        dashedOption.textContent = 'Dashed';
        lineStyleSelect.appendChild(dashedOption);

        lineStyleSelect.value = levelData.lineStyle.toString();
        lineStyleContainer.appendChild(lineStyleSelect);
        inputsGrid.appendChild(lineStyleContainer);

        // Label input (full width)
        const textContainer = document.createElement('div');
        textContainer.style.gridColumn = '1 / -1'; // Span both columns
        const textLabel = document.createElement('label');
        textLabel.textContent = 'Label';
        textLabel.style.display = 'block';
        textLabel.style.color = 'var(--text2)';
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
        textInput.style.backgroundColor = 'var(--base1)';
        textInput.style.border = '1.5px solid var(--base3)';
        textInput.style.borderRadius = '6px';
        textInput.style.color = 'var(--text1)';
        textInput.style.fontSize = '0.9rem';
        textInput.style.outline = 'none';
        textInput.style.transition = 'border-color 0.18s, background 0.18s';
        textInput.addEventListener('focus', () => {
            textInput.style.borderColor = 'var(--accent1)';
            textInput.style.backgroundColor = 'var(--base4)';
        });
        textInput.addEventListener('blur', () => {
            textInput.style.borderColor = 'var(--base3)';
            textInput.style.backgroundColor = 'var(--base1)';
        });
        textContainer.appendChild(textInput);
        inputsGrid.appendChild(textContainer);

        // Color input (full width)
        const colorContainer = document.createElement('div');
        colorContainer.style.gridColumn = '1 / -1'; // Span both columns
        const colorLabel = document.createElement('label');
        colorLabel.textContent = 'Color';
        colorLabel.style.display = 'block';
        colorLabel.style.color = 'var(--text2)';
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
        colorInput.style.backgroundColor = 'var(--base1)';
        colorInput.style.border = '1.5px solid var(--base3)';
        colorInput.style.borderRadius = '6px';
        colorInput.style.cursor = 'pointer';
        colorInput.style.height = '36px';
        colorInput.style.outline = 'none';
        colorInput.style.transition = 'border-color 0.18s';
        colorInput.addEventListener('focus', () => {
            colorInput.style.borderColor = 'var(--accent1)';
        });
        colorInput.addEventListener('blur', () => {
            colorInput.style.borderColor = 'var(--base3)';
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
        cancelButton.style.color = 'var(--text2)';
        cancelButton.style.border = '1.5px solid var(--base3)';
        cancelButton.style.borderRadius = '6px';
        cancelButton.style.cursor = 'pointer';
        cancelButton.style.fontSize = '0.85rem';
        cancelButton.style.fontWeight = '600';
        cancelButton.style.transition = 'border-color 0.18s, color 0.18s';
        cancelButton.addEventListener('mouseenter', () => {
            cancelButton.style.borderColor = 'var(--accent1)';
            cancelButton.style.color = 'var(--accent1)';
        });
        cancelButton.addEventListener('mouseleave', () => {
            cancelButton.style.borderColor = 'var(--base3)';
            cancelButton.style.color = 'var(--text2)';
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
        saveButton.style.backgroundColor = 'var(--accent1)';
        saveButton.style.color = 'var(--text3)';
        saveButton.style.border = 'none';
        saveButton.style.borderRadius = '6px';
        saveButton.style.cursor = 'pointer';
        saveButton.style.fontSize = '0.85rem';
        saveButton.style.fontWeight = '600';
        saveButton.style.transition = 'background 0.18s';
        saveButton.addEventListener('mouseenter', () => {
            saveButton.style.backgroundColor = 'var(--accent2)';
        });
        saveButton.addEventListener('mouseleave', () => {
            saveButton.style.backgroundColor = 'var(--accent1)';
        });
        saveButton.addEventListener('click', () => {
            const isNewLevel = !this.levels.has(levelId);

            if (isNewLevel) {
                // Create new level
                const newLevelData: PriceLevelData = {
                    id: levelId,
                    price: parseFloat(priceInput.value),
                    text: textInput.value,
                    color: colorInput.value,
                    lineWidth: 2,
                    lineStyle: parseInt(lineStyleSelect.value)
                };
                this.addPriceLevelToChart(newLevelData);
            } else {
                // Update existing level
                this.updatePriceLevel(
                    levelId,
                    parseFloat(priceInput.value),
                    textInput.value,
                    colorInput.value,
                    parseInt(lineStyleSelect.value)
                );
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
        if (this.inputDialog) {
            this.inputDialog.remove();
            this.inputDialog = null;
        }
        // Remove overlay
        const overlay = document.querySelector('.price-level-overlay');
        if (overlay) {
            overlay.remove();
        }
        this.editingLevelId = null;
    }

    private updatePriceLevel(id: string, newPrice: number, newText: string, newColor: string, newLineStyle: number): void {
        const level = this.levels.get(id);
        if (!level) return;

        // Remove old price line
        this.series.removePriceLine(level.priceLine);

        // Update data
        level.data.price = newPrice;
        level.data.text = newText;
        level.data.color = newColor;
        level.data.lineStyle = newLineStyle;

        // Create new price line with updated settings
        level.priceLine = this.series.createPriceLine({
            price: level.data.price,
            color: level.data.color,
            lineWidth: level.data.lineWidth,
            lineStyle: level.data.lineStyle,
            axisLabelVisible: true,
            title: level.data.text || '',
        });

        // Update label
        level.labelDiv.style.backgroundColor = newColor;
        level.labelDiv.textContent = newText || newPrice.toFixed(2);

        // Update position
        this.updateLabelPosition(id);

        // Notify change for auto-save
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
        if (this.contextMenuDiv) {
            this.contextMenuDiv.remove();
            this.contextMenuDiv = null;
        }
    }

    private removePriceLevel(id: string): void {
        const level = this.levels.get(id);
        if (!level) return;

        // Remove price line
        this.series.removePriceLine(level.priceLine);

        // Remove label
        level.labelDiv.remove();

        // Remove from map
        this.levels.delete(id);

        // Clear selection if this was the selected level
        if (this.selectedLevelId === id) {
            this.selectedLevelId = null;
        }

        // Notify change for auto-save
        this.notifyChange();
    }

    public removeSelectedLevel(): void {
        if (this.selectedLevelId) {
            this.removePriceLevel(this.selectedLevelId);
        }
    }

    public clear(): void {
        // Remove all price levels without triggering auto-save
        this.isClearing = true;
        this.levels.forEach((level, id) => {
            this.removePriceLevel(id);
        });
        this.levels.clear();
        this.isClearing = false;
    }

    public destroy(): void {
        this.deactivate();
        this.clear();

        // Remove keyboard handler on destroy
        if (this.keyDownHandler) {
            document.removeEventListener('keydown', this.keyDownHandler);
            this.keyDownHandler = null;
        }
    }

    public serialize(): PriceLevelData[] {
        const data: PriceLevelData[] = [];
        this.levels.forEach((level) => {
            data.push({ ...level.data });
        });
        return data;
    }

    public deserialize(data: PriceLevelData[]): void {
        this.isDeserializing = true;
        this.clear();
        data.forEach((levelData) => {
            this.addPriceLevelToChart(levelData);
        });
        this.isDeserializing = false;
    }

    // Update label positions when chart is resized or scrolled
    public updatePositions(): void {
        this.updateAllLabelPositions();
    }
}
