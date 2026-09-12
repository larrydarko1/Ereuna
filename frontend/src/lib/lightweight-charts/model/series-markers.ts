/**
 * Represents the position of a series marker relative to a bar.
 */
export type SeriesMarkerPosition = 'aboveBar' | 'belowBar' | 'inBar';

/**
 * Represents the shape of a series marker.
 */
export type SeriesMarkerShape = 'circle' | 'square' | 'arrowUp' | 'arrowDown' | 'roundedSquare';

/**
 * Represents a series marker.
 */
export type SeriesMarker<TimeType> = {
    /**
     * The time of the marker.
     */
    time: TimeType;
    /**
     * The position of the marker.
     */
    position: SeriesMarkerPosition;
    /**
     * The shape of the marker.
     */
    shape: SeriesMarkerShape;
    /**
     * The color of the marker.
     */
    color: string;
    /**
     * The ID of the marker.
     */
    id?: string | undefined;
    /**
     * The optional text of the marker.
     */
    text?: string | undefined;
    /**
     * The optional text color of the marker.
     */
    textColor?: string | undefined;
    /**
     * The optional size of the marker.
     *
     * @defaultValue `1`
     */
    size?: number | undefined;

    /**
     * @internal
     */
    originalTime: unknown;
}

export type InternalSeriesMarker<TimeType> = {
    internalId: number;
} & SeriesMarker<TimeType>

export function convertSeriesMarker<InTimeType, OutTimeType>(
    sm: SeriesMarker<InTimeType>,
    newTime: OutTimeType,
    originalTime?: unknown,
): SeriesMarker<OutTimeType> {
    const { time: inTime, originalTime: inOriginalTime, ...values } = sm;

    const res = {
        time: newTime,
        ...values,
    } as SeriesMarker<OutTimeType>;

    if (originalTime !== undefined) {
        res.originalTime = originalTime;
    }
    return res;
}
