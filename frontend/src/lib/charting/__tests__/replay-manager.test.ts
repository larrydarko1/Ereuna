import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type OHLCData, ReplayManager } from '@/lib/charting/replay-manager';
import { type UTCTimestamp } from '@/lib/charting/engine/model/time/types';

/** 2023-11-14T22:13:20Z, then one bar a day. */
const FIRST = 1700000000;
const DAY = 86400;

function bars(count = 10): OHLCData[] {
    return Array.from({ length: count }, (_, i) => ({
        time: (FIRST + i * DAY) as UTCTimestamp,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
    }));
}

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('entering replay', () => {
    it('starts inactive, at the first bar, with the last one as its end', () => {
        const replay = new ReplayManager(bars());

        expect(replay.getState()).toEqual({
            isActive: false,
            isPlaying: false,
            currentIndex: 0,
            speed: 1,
            startIndex: 0,
            endIndex: 9,
        });
    });

    it('starts from the index it is given, paused', () => {
        const replay = new ReplayManager(bars());

        replay.startReplay(4);

        expect(replay.getState()).toMatchObject({ isActive: true, isPlaying: false, currentIndex: 4, startIndex: 4 });
    });

    it('pins an index outside the data to the nearest end of it', () => {
        const replay = new ReplayManager(bars());

        replay.startReplay(999);
        expect(replay.getState().currentIndex).toBe(9);

        replay.startReplay(-5);
        expect(replay.getState().currentIndex).toBe(0);
    });

    it('refuses to start on an empty series', () => {
        const replay = new ReplayManager([]);

        replay.startReplay(0);

        expect(replay.getState().isActive).toBe(false);
    });

    it('starts from the bar closest to a date', () => {
        const replay = new ReplayManager(bars());

        // Six hours past the fourth bar, which is still its closest neighbour
        replay.startReplayFromDate(new Date((FIRST + 3 * DAY + 6 * 3600) * 1000));

        expect(replay.getState().currentIndex).toBe(3);
    });

    it('hands back a copy of its state rather than the state itself', () => {
        const replay = new ReplayManager(bars());
        const state = replay.getState() as { currentIndex: number };

        state.currentIndex = 99;

        expect(replay.getState().currentIndex).toBe(0);
    });
});

describe('stepping through', () => {
    it('moves one bar forward and one back', () => {
        const replay = new ReplayManager(bars());
        replay.startReplay(4);

        replay.stepForward();
        expect(replay.getState().currentIndex).toBe(5);

        replay.stepBackward();
        expect(replay.getState().currentIndex).toBe(4);
    });

    it('stops at either end of the replay range', () => {
        const replay = new ReplayManager(bars());
        replay.startReplay(8);

        replay.stepForward();
        replay.stepForward();
        expect(replay.getState().currentIndex).toBe(9);

        replay.seekToIndex(8);
        replay.stepBackward();
        replay.stepBackward();
        expect(replay.getState().currentIndex).toBe(8);
    });

    it('does nothing at all until replay has been entered', () => {
        const replay = new ReplayManager(bars());

        replay.stepForward();
        replay.stepBackward();
        replay.seekToIndex(5);
        replay.seekByProgress(50);
        replay.seekToDate(new Date(FIRST * 1000));

        expect(replay.getState().currentIndex).toBe(0);
    });

    it('tells its subscribers where it is and what that bar is dated', () => {
        const replay = new ReplayManager(bars());
        const seen: { index: number; date: string }[] = [];
        replay.onChange((index, date) => seen.push({ index, date }));

        replay.startReplay(2);
        replay.stepForward();

        expect(seen.map((each) => each.index)).toEqual([2, 3]);
        expect(seen[1]?.date).toMatch(/2023/);
    });

    it('stops telling a subscriber that has unsubscribed', () => {
        const replay = new ReplayManager(bars());
        const handler = vi.fn();
        const unsubscribe = replay.onChange(handler);
        replay.startReplay(0);

        unsubscribe();
        replay.stepForward();

        expect(handler).toHaveBeenCalledTimes(1);
    });
});

describe('seeking', () => {
    it('goes to the index it is given, pinned to the replay range', () => {
        const replay = new ReplayManager(bars());
        replay.startReplay(3);

        replay.seekToIndex(7);
        expect(replay.getState().currentIndex).toBe(7);

        replay.seekToIndex(1);
        expect(replay.getState().currentIndex).toBe(3);

        replay.seekToIndex(99);
        expect(replay.getState().currentIndex).toBe(9);
    });

    it('goes to the bar closest to a date inside the range', () => {
        const replay = new ReplayManager(bars());
        replay.startReplay(2);

        replay.seekToDate(new Date((FIRST + 6 * DAY) * 1000));

        expect(replay.getState().currentIndex).toBe(6);
    });

    it('never seeks before the start of the range, however early the date', () => {
        const replay = new ReplayManager(bars());
        replay.startReplay(5);

        replay.seekToDate(new Date(0));

        expect(replay.getState().currentIndex).toBe(5);
    });

    it('goes to a share of the way through', () => {
        const replay = new ReplayManager(bars(11));
        replay.startReplay(0);

        replay.seekByProgress(50);

        expect(replay.getState().currentIndex).toBe(5);
    });

    it('reports how far through it is', () => {
        const replay = new ReplayManager(bars(11));
        replay.startReplay(0);

        replay.seekToIndex(5);

        expect(replay.getProgress()).toBeCloseTo(50, 5);
    });

    it('reports no progress at all before replay starts, or over a single bar', () => {
        expect(new ReplayManager(bars()).getProgress()).toBe(0);

        const single = new ReplayManager(bars(1));
        single.startReplay(0);
        expect(single.getProgress()).toBe(0);
    });
});

describe('playing', () => {
    it('advances a bar per tick at the speed it is set to', () => {
        const replay = new ReplayManager(bars());
        replay.startReplay(0);

        replay.play();
        vi.advanceTimersByTime(3000);

        expect(replay.getState().isPlaying).toBe(true);
        expect(replay.getState().currentIndex).toBe(3);
    });

    it('runs twice as fast when it is told to', () => {
        const replay = new ReplayManager(bars());
        replay.startReplay(0);
        replay.play();

        replay.setSpeed(2);
        vi.advanceTimersByTime(2000);

        expect(replay.getState().currentIndex).toBe(4);
    });

    it('never runs slower than the floor it is given', () => {
        const replay = new ReplayManager(bars());

        replay.setSpeed(-10);

        expect(replay.getState().speed).toBe(0.1);
    });

    it('stops itself at the last bar', () => {
        const replay = new ReplayManager(bars(4));
        replay.startReplay(0);

        replay.play();
        vi.advanceTimersByTime(10_000);

        expect(replay.getState().currentIndex).toBe(3);
        expect(replay.getState().isPlaying).toBe(false);
    });

    it('pauses where it is, and carries on from there', () => {
        const replay = new ReplayManager(bars());
        replay.startReplay(0);
        replay.play();
        vi.advanceTimersByTime(2000);

        replay.pause();
        vi.advanceTimersByTime(5000);

        expect(replay.getState().currentIndex).toBe(2);
        expect(replay.getState().isPlaying).toBe(false);
    });

    it('toggles between playing and paused', () => {
        const replay = new ReplayManager(bars());
        replay.startReplay(0);

        replay.togglePlayPause();
        expect(replay.getState().isPlaying).toBe(true);

        replay.togglePlayPause();
        expect(replay.getState().isPlaying).toBe(false);
    });

    it('refuses to play before replay is entered, or once it is at the end', () => {
        const notStarted = new ReplayManager(bars());
        notStarted.play();
        expect(notStarted.getState().isPlaying).toBe(false);

        const atEnd = new ReplayManager(bars());
        atEnd.startReplay(9);
        atEnd.play();
        expect(atEnd.getState().isPlaying).toBe(false);
    });

    it('ignores a pause when it is not playing', () => {
        const replay = new ReplayManager(bars());
        replay.startReplay(0);

        replay.pause();

        expect(replay.getState().isPlaying).toBe(false);
    });
});

describe('the date a bar carries', () => {
    it('prints the current bar in a readable form', () => {
        const replay = new ReplayManager(bars());
        replay.startReplay(0);

        expect(replay.getCurrentDateString()).toMatch(/Nov.*2023/);
    });

    it('prints nothing before replay is entered', () => {
        expect(new ReplayManager(bars()).getCurrentDateString()).toBe('');
    });

    it('says so when a bar carries a business day no calendar has', () => {
        // Out past the range a Date can hold, which is where the conversion
        // stops answering with a timestamp at all
        const replay = new ReplayManager([{ ...(bars(1)[0] as OHLCData), time: { year: 1e10, month: 1, day: 1 } }]);
        replay.startReplay(0);

        expect(replay.getCurrentDateString()).toBe('Invalid Date');
    });
});

describe('changing the series under it', () => {
    it('takes a new series and moves its end to match', () => {
        const replay = new ReplayManager(bars());

        replay.setFullData(bars(4));

        expect(replay.getFullData()).toHaveLength(4);
        expect(replay.getState().endIndex).toBe(3);
    });

    it('pulls the current bar back inside a series that got shorter', () => {
        const replay = new ReplayManager(bars());
        replay.startReplay(8);
        const handler = vi.fn();
        replay.onChange(handler);

        replay.setFullData(bars(4));

        expect(replay.getState().currentIndex).toBe(3);
        expect(handler).toHaveBeenCalled();
    });

    it('leaves the current bar alone while replay has not been entered', () => {
        const replay = new ReplayManager(bars());
        const handler = vi.fn();
        replay.onChange(handler);

        replay.setFullData(bars(4));

        expect(handler).not.toHaveBeenCalled();
    });
});

describe('leaving replay', () => {
    it('stops playing and jumps to the last bar', () => {
        const replay = new ReplayManager(bars());
        replay.startReplay(2);
        replay.play();

        replay.exitReplay();

        expect(replay.getState()).toMatchObject({ isActive: false, isPlaying: false, currentIndex: 9 });
    });

    it('stops the clock and forgets its subscribers on destroy', () => {
        const replay = new ReplayManager(bars());
        replay.startReplay(0);
        replay.play();
        const handler = vi.fn();
        replay.onChange(handler);

        replay.destroy();
        vi.advanceTimersByTime(5000);

        expect(replay.getState().currentIndex).toBe(0);
        expect(handler).not.toHaveBeenCalled();
    });
});
