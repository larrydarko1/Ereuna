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
export type SeriesMarker<TTimeType> = {
    /**
     * The time of the marker.
     */
    time: TTimeType;
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
};

export type InternalSeriesMarker<TTimeType> = {
    internalId: number;
} & SeriesMarker<TTimeType>;

export function convertSeriesMarker<TInTimeType, TOutTimeType>(
    sm: SeriesMarker<TInTimeType>,
    newTime: TOutTimeType,
    originalTime?: unknown,
): SeriesMarker<TOutTimeType> {
    // Both times are dropped: the caller supplies the replacements
    const { time: _time, originalTime: _originalTime, ...values } = sm;

    const res = {
        time: newTime,
        ...values,
    } as SeriesMarker<TOutTimeType>;

    if (originalTime !== undefined) {
        res.originalTime = originalTime;
    }
    return res;
}
