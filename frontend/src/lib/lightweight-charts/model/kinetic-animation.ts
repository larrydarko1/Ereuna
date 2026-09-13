/**
 * Carries a flick past the point the finger left the screen, and decays it.
 *
 * It records the recent positions rather than a single velocity so that a pause
 * before release stops the chart instead of throwing it, which is what a user
 * expects when they mean to stop somewhere exact.
 */
import { getNotNull } from '@/lib/lightweight-charts/helpers/assertions';
import { type Coordinate } from '@/lib/lightweight-charts/model/coordinate';

type TimeAndPosition = {
    time: number;
    position: Coordinate;
};

type Constants = (typeof Constants)[keyof typeof Constants];

const Constants = {
    MaxStartDelay: 50,
    EpsilonDistance: 1, // distance to the end position where we stop animation
} as const;

export class KineticAnimation {
    private _position1: TimeAndPosition | null = null;
    private _position2: TimeAndPosition | null = null;
    private _position3: TimeAndPosition | null = null;
    private _position4: TimeAndPosition | null = null;

    private _animationStartPosition: TimeAndPosition | null = null;
    private _durationMsecs = 0;
    private _speedPxPerMsec = 0;

    private readonly _minMove: number;
    private readonly _minSpeed: number;
    private readonly _maxSpeed: number;
    private readonly _dumpingCoeff: number;

    public constructor(minSpeed: number, maxSpeed: number, dumpingCoeff: number, minMove: number) {
        this._minSpeed = minSpeed;
        this._maxSpeed = maxSpeed;
        this._dumpingCoeff = dumpingCoeff;
        this._minMove = minMove;
    }

    public addPosition(position: Coordinate, time: number): void {
        if (this._position1 !== null) {
            if (this._position1.time === time) {
                this._position1.position = position;
                return;
            }

            if (Math.abs(this._position1.position - position) < this._minMove) {
                return;
            }
        }

        this._position4 = this._position3;
        this._position3 = this._position2;
        this._position2 = this._position1;
        this._position1 = { time, position };
    }

    public start(position: Coordinate, time: number): void {
        if (this._position1 === null || this._position2 === null) {
            return;
        }

        if (time - this._position1.time > Constants.MaxStartDelay) {
            return;
        }

        // To calculate all the rest parameters we should calculate the speed af first
        let totalDistance = 0;

        const speed1 = speedPxPerMSec(this._position1, this._position2, this._maxSpeed);
        const distance1 = distanceBetweenPoints(this._position1, this._position2);

        // We're calculating weighted average speed
        // Than more distance for a segment, than more its weight
        const speedItems = [speed1];
        const distanceItems = [distance1];
        totalDistance += distance1;

        // Each older segment counts only while the gesture has not doubled back:
        // the first one that reverses ends the run, and everything behind it too
        const olderSegments: [TimeAndPosition | null, TimeAndPosition | null][] = [
            [this._position2, this._position3],
            [this._position3, this._position4],
        ];

        for (const [from, to] of olderSegments) {
            if (from === null || to === null) break;

            const speed = speedPxPerMSec(from, to, this._maxSpeed);
            if (Math.sign(speed) !== Math.sign(speed1)) break;

            const distance = distanceBetweenPoints(from, to);
            speedItems.push(speed);
            distanceItems.push(distance);
            totalDistance += distance;
        }

        let resultSpeed = 0;
        for (const [i, speed] of speedItems.entries()) {
            resultSpeed += ((distanceItems[i] ?? 0) / totalDistance) * speed;
        }

        if (Math.abs(resultSpeed) < this._minSpeed) {
            return;
        }

        this._animationStartPosition = { position, time };
        this._speedPxPerMsec = resultSpeed;
        this._durationMsecs = durationMSec(Math.abs(resultSpeed), this._dumpingCoeff);
    }

    public getPosition(time: number): Coordinate {
        const startPosition = getNotNull(this._animationStartPosition);
        const durationMsecs = time - startPosition.time;
        return (startPosition.position +
            (this._speedPxPerMsec * (Math.pow(this._dumpingCoeff, durationMsecs) - 1)) /
                Math.log(this._dumpingCoeff)) as Coordinate;
    }

    public finished(time: number): boolean {
        return this._animationStartPosition === null || this._progressDuration(time) === this._durationMsecs;
    }

    private _progressDuration(time: number): number {
        const startPosition = getNotNull(this._animationStartPosition);
        const progress = time - startPosition.time;
        return Math.min(progress, this._durationMsecs);
    }
}

function distanceBetweenPoints(pos1: TimeAndPosition, pos2: TimeAndPosition): number {
    return pos1.position - pos2.position;
}

function speedPxPerMSec(pos1: TimeAndPosition, pos2: TimeAndPosition, maxSpeed: number): number {
    const speed = (pos1.position - pos2.position) / (pos1.time - pos2.time);
    return Math.sign(speed) * Math.min(Math.abs(speed), maxSpeed);
}

function durationMSec(speed: number, dumpingCoeff: number): number {
    const lnDumpingCoeff = Math.log(dumpingCoeff);
    return Math.log((Constants.EpsilonDistance * lnDumpingCoeff) / -speed) / lnDumpingCoeff;
}
