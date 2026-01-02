import { TrendLineManager } from './trendline';
import { BoxManager } from './box';
import { TextAnnotationManager } from './text-annotation';
import { FreehandManager } from './freehand';
import { PriceLevelManager } from './price-level';

/**
 * Simple auto-save manager that persists drawings per symbol
 * Similar to TradingView's approach - transparent to the user
 */
export class DrawingPersistence {
    private symbol: string = '';
    private user: string = '';
    private apiKey: string = '';
    private trendlineManager: TrendLineManager | null = null;
    private boxManager: BoxManager | null = null;
    private textAnnotationManager: TextAnnotationManager | null = null;
    private freehandManager: FreehandManager | null = null;
    private priceLevelManager: PriceLevelManager | null = null;
    private saveTimeout: ReturnType<typeof setTimeout> | null = null;
    private isLoading: boolean = false;

    constructor(
        user: string,
        apiKey: string,
        trendlineManager?: TrendLineManager,
        boxManager?: BoxManager,
        textAnnotationManager?: TextAnnotationManager,
        freehandManager?: FreehandManager,
        priceLevelManager?: PriceLevelManager
    ) {
        this.user = user;
        this.apiKey = apiKey;
        this.trendlineManager = trendlineManager || null;
        this.boxManager = boxManager || null;
        this.textAnnotationManager = textAnnotationManager || null;
        this.freehandManager = freehandManager || null;
        this.priceLevelManager = priceLevelManager || null;
    }

    /**
     * Set the current symbol
     */
    public setSymbol(symbol: string): void {
        this.symbol = symbol;
    }

    /**
     * Update manager references
     */
    public setManagers(
        trendlineManager?: TrendLineManager,
        boxManager?: BoxManager,
        textAnnotationManager?: TextAnnotationManager,
        freehandManager?: FreehandManager,
        priceLevelManager?: PriceLevelManager
    ): void {
        if (trendlineManager) this.trendlineManager = trendlineManager;
        if (boxManager) this.boxManager = boxManager;
        if (textAnnotationManager) this.textAnnotationManager = textAnnotationManager;
        if (freehandManager) this.freehandManager = freehandManager;
        if (priceLevelManager) this.priceLevelManager = priceLevelManager;
    }

    /**
     * Load drawings for the current symbol
     */
    public async loadDrawings(): Promise<void> {
        if (!this.symbol || !this.user) {
            console.warn('Cannot load drawings: symbol or user not set');
            return;
        }

        this.isLoading = true;

        try {
            const response = await fetch(
                `/api/chartdrawings?user=${encodeURIComponent(this.user)}&symbol=${encodeURIComponent(this.symbol)}`,
                {
                    headers: {
                        'x-api-key': this.apiKey,
                    },
                }
            );

            if (!response.ok) {
                throw new Error('Failed to load drawings');
            }

            const data = await response.json();

            // Load into managers
            if (this.trendlineManager && data.trendLines) {
                this.trendlineManager.loadTrendLines(data.trendLines);
            }
            if (this.boxManager && data.boxes) {
                this.boxManager.loadBoxes(data.boxes);
            }
            if (this.textAnnotationManager && data.textAnnotations) {
                this.textAnnotationManager.loadAnnotations(data.textAnnotations);
            }
            if (this.freehandManager && data.freehandPaths) {
                this.freehandManager.loadPaths(data.freehandPaths);
            }
            if (this.priceLevelManager && data.priceLevels) {
                this.priceLevelManager.deserialize(data.priceLevels);
            }
        } catch (error) {
            console.error('Error loading drawings:', error);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Auto-save drawings (debounced)
     * Call this whenever drawings change
     */
    public autoSave(): void {
        if (this.isLoading) return; // Don't save while loading

        // Clear previous timeout
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        // Debounce: save 1 second after last change
        this.saveTimeout = setTimeout(() => {
            this.saveNow();
        }, 1000);
    }

    /**
     * Save drawings immediately
     */
    private async saveNow(): Promise<void> {
        if (!this.symbol || !this.user) {
            console.warn('Cannot save drawings: symbol or user not set');
            return;
        }

        try {
            const drawings = {
                user: this.user,
                symbol: this.symbol,
                trendLines: this.trendlineManager?.getTrendLines() || [],
                boxes: this.boxManager?.getBoxes() || [],
                textAnnotations: this.textAnnotationManager?.getAnnotations() || [],
                freehandPaths: this.freehandManager?.getPaths() || [],
                priceLevels: this.priceLevelManager?.serialize() || [],
            };

            const response = await fetch('/api/chartdrawings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                },
                body: JSON.stringify(drawings),
            });

            if (!response.ok) {
                throw new Error('Failed to save drawings');
            }
        } catch (error) {
            console.error('Error auto-saving drawings:', error);
        }
    }

    /**
     * Clear all drawings for current symbol
     */
    public async clearDrawings(): Promise<void> {
        if (!this.symbol || !this.user) {
            console.warn('Cannot clear drawings: symbol or user not set');
            return;
        }

        try {
            // Clear locally
            if (this.trendlineManager) {
                this.trendlineManager.loadTrendLines([]);
            }
            if (this.boxManager) {
                this.boxManager.loadBoxes([]);
            }
            if (this.textAnnotationManager) {
                this.textAnnotationManager.loadAnnotations([]);
            }
            if (this.freehandManager) {
                this.freehandManager.loadPaths([]);
            }
            if (this.priceLevelManager) {
                this.priceLevelManager.clear();
            }

            // Clear on server
            const response = await fetch(
                `/api/chartdrawings?user=${encodeURIComponent(this.user)}&symbol=${encodeURIComponent(this.symbol)}`,
                {
                    method: 'DELETE',
                    headers: {
                        'x-api-key': this.apiKey,
                    },
                }
            );

            if (!response.ok) {
                throw new Error('Failed to clear drawings');
            }

            console.log(`Cleared drawings for ${this.symbol}`);
        } catch (error) {
            console.error('Error clearing drawings:', error);
        }
    }

    /**
     * Check if there are any drawings
     */
    public hasDrawings(): boolean {
        const trendLines = this.trendlineManager?.getTrendLines() || [];
        const boxes = this.boxManager?.getBoxes() || [];
        const annotations = this.textAnnotationManager?.getAnnotations() || [];
        const paths = this.freehandManager?.getPaths() || [];
        const priceLevels = this.priceLevelManager?.serialize() || [];

        return trendLines.length > 0 ||
            boxes.length > 0 ||
            annotations.length > 0 ||
            paths.length > 0 ||
            priceLevels.length > 0;
    }

    /**
     * Cleanup
     */
    public destroy(): void {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
    }
}
