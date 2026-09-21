/**
 * Reading numbers out of stored market data that is not reliably numeric.
 * The vendor's documents carry figures as numbers, as numeric strings, as the
 * empty string and as the literal string "NaN" — the ingestor wrote whatever the
 * feed gave it — so every reader has to agree on what each of those means.
 */

/** A finite number, or null. Numeric strings are accepted; "NaN" and "" are not. */
export function numeric(value: unknown): number | null {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value !== 'string' || value.trim() === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}
