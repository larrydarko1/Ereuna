import { Time } from './index';

export interface OHLCData {
    time: Time;
    open: number;
    high: number;
    low: number;
    close: number;
}

export interface ReplayState {
    isActive: boolean;
    isPlaying: boolean;
    currentIndex: number;
    speed: number; // bars per second
    startIndex: number;
    endIndex: number;
}

export type ReplayCallback = (index: number, date: string) => void;

export class ReplayManager {
    private state: ReplayState;
    private fullData: OHLCData[];
    private intervalId: number | null = null;
    private callbacks: Set<ReplayCallback> = new Set();

    constructor(data: OHLCData[]) {
        this.fullData = data;
        this.state = {
            isActive: false,
            isPlaying: false,
            currentIndex: 0,
            speed: 1,
            startIndex: 0,
            endIndex: data.length - 1
        };
    }

    /**
     * Get current replay state
     */
    getState(): Readonly<ReplayState> {
        return { ...this.state };
    }

    /**
     * Get full dataset
     */
    getFullData(): OHLCData[] {
        return this.fullData;
    }

    /**
     * Update full data (when switching symbols or timeframes)
     */
    setFullData(data: OHLCData[]): void {
        this.fullData = data;
        this.state.endIndex = data.length - 1;

        // If replay is active, adjust current index if needed
        if (this.state.isActive) {
            if (this.state.currentIndex >= data.length) {
                this.state.currentIndex = Math.max(0, data.length - 1);
            }
            this.notifyCallbacks();
        }
    }

    /**
     * Start replay from a specific index
     */
    startReplay(fromIndex: number = 0): void {
        if (this.fullData.length === 0) return;

        // Ensure valid index
        const validIndex = Math.max(0, Math.min(fromIndex, this.fullData.length - 1));

        this.state.isActive = true;
        this.state.isPlaying = false;
        this.state.currentIndex = validIndex;
        this.state.startIndex = validIndex;

        this.notifyCallbacks();
    }

    /**
     * Start replay from a specific date
     */
    startReplayFromDate(date: Date): void {
        const timestamp = Math.floor(date.getTime() / 1000);

        // Find closest index to the date
        let closestIndex = 0;
        let minDiff = Infinity;

        for (let i = 0; i < this.fullData.length; i++) {
            const barTime = this.getBarTimestamp(this.fullData[i].time);
            const diff = Math.abs(barTime - timestamp);

            if (diff < minDiff) {
                minDiff = diff;
                closestIndex = i;
            }
        }

        this.startReplay(closestIndex);
    }

    /**
     * Play replay (auto-advance bars)
     */
    play(): void {
        if (!this.state.isActive || this.state.isPlaying) return;
        if (this.state.currentIndex >= this.state.endIndex) return;

        this.state.isPlaying = true;
        this.startInterval();
    }

    /**
     * Pause replay
     */
    pause(): void {
        if (!this.state.isPlaying) return;

        this.state.isPlaying = false;
        this.stopInterval();
    }

    /**
     * Toggle play/pause
     */
    togglePlayPause(): void {
        if (this.state.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    /**
     * Step forward one bar
     */
    stepForward(): void {
        if (!this.state.isActive) return;
        if (this.state.currentIndex >= this.state.endIndex) return;

        this.state.currentIndex++;
        this.notifyCallbacks();
    }

    /**
     * Step backward one bar
     */
    stepBackward(): void {
        if (!this.state.isActive) return;
        if (this.state.currentIndex <= this.state.startIndex) return;

        this.state.currentIndex--;
        this.notifyCallbacks();
    }

    /**
     * Set replay speed (bars per second)
     */
    setSpeed(barsPerSecond: number): void {
        this.state.speed = Math.max(0.1, barsPerSecond);

        // Restart interval if playing
        if (this.state.isPlaying) {
            this.stopInterval();
            this.startInterval();
        }
    }

    /**
     * Seek to specific index
     */
    seekToIndex(index: number): void {
        if (!this.state.isActive) return;

        const validIndex = Math.max(
            this.state.startIndex,
            Math.min(index, this.state.endIndex)
        );

        this.state.currentIndex = validIndex;
        this.notifyCallbacks();
    }

    /**
     * Seek to specific date
     */
    seekToDate(date: Date): void {
        if (!this.state.isActive) return;

        const timestamp = Math.floor(date.getTime() / 1000);

        // Find closest index to the date within replay range
        let closestIndex = this.state.startIndex;
        let minDiff = Infinity;

        for (let i = this.state.startIndex; i <= this.state.endIndex; i++) {
            const barTime = this.getBarTimestamp(this.fullData[i].time);
            const diff = Math.abs(barTime - timestamp);

            if (diff < minDiff) {
                minDiff = diff;
                closestIndex = i;
            }
        }

        this.seekToIndex(closestIndex);
    }

    /**
     * Seek by progress percentage (0-100)
     */
    seekByProgress(progressPercent: number): void {
        if (!this.state.isActive) return;

        const range = this.state.endIndex - this.state.startIndex;
        const targetIndex = this.state.startIndex + Math.floor((progressPercent / 100) * range);

        this.seekToIndex(targetIndex);
    }

    /**
     * Get current progress as percentage (0-100)
     */
    getProgress(): number {
        if (!this.state.isActive || this.state.endIndex === this.state.startIndex) {
            return 0;
        }

        const range = this.state.endIndex - this.state.startIndex;
        const current = this.state.currentIndex - this.state.startIndex;

        return (current / range) * 100;
    }

    /**
     * Get current date/time as formatted string
     */
    getCurrentDateString(): string {
        if (!this.state.isActive || this.state.currentIndex >= this.fullData.length) {
            return '';
        }

        const currentBar = this.fullData[this.state.currentIndex];
        const timestamp = this.getBarTimestamp(currentBar.time);

        const date = new Date(timestamp * 1000);

        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }

        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }

    /**
     * Exit replay mode
     */
    exitReplay(): void {
        this.pause();
        this.state.isActive = false;
        this.state.currentIndex = this.state.endIndex;
        this.notifyCallbacks();
    }

    /**
     * Subscribe to replay updates
     */
    onChange(callback: ReplayCallback): () => void {
        this.callbacks.add(callback);

        // Return unsubscribe function
        return () => {
            this.callbacks.delete(callback);
        };
    }

    /**
     * Clean up (call before destroying)
     */
    destroy(): void {
        this.pause();
        this.callbacks.clear();
    }

    /**
     * Start the interval for auto-play
     */
    private startInterval(): void {
        const intervalMs = 1000 / this.state.speed;

        this.intervalId = window.setInterval(() => {
            if (this.state.currentIndex >= this.state.endIndex) {
                this.pause();
                return;
            }

            this.state.currentIndex++;
            this.notifyCallbacks();
        }, intervalMs);
    }

    /**
     * Stop the interval
     */
    private stopInterval(): void {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * Helper to extract timestamp from Time type
     */
    private getBarTimestamp(time: Time): number {
        if (typeof time === 'number') {
            return time;
        }
        if (typeof time === 'string') {
            // Handle string dates like "2024-01-01"
            return Math.floor(new Date(time).getTime() / 1000);
        }
        // Handle object with timestamp or year/month/day properties
        if (typeof time === 'object' && time !== null) {
            if ('timestamp' in time) {
                return (time as any).timestamp;
            }
            if ('year' in time && 'month' in time && 'day' in time) {
                const t = time as any;
                return Math.floor(new Date(t.year, t.month - 1, t.day).getTime() / 1000);
            }
        }
        return 0;
    }

    /**
     * Notify all subscribed callbacks
     */
    private notifyCallbacks(): void {
        const dateString = this.getCurrentDateString();
        this.callbacks.forEach(callback => {
            callback(this.state.currentIndex, dateString);
        });
    }
}
