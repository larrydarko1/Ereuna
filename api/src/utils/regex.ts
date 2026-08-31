/** Regex helpers for values that come from request input. 
 *  Escape every regex metacharacter in `value`.
 * Anything built into a `RegExp` — or a Mongo `$regex` — from request input has
 * to go through this first. Unescaped input lets a caller inject their own
 * pattern, which at best scans the whole collection and at worst is a ReDoS:
 * a search box that turns `aaa` into `a.*a.*a` is catastrophic backtracking
 * with a query string as its payload.
*/

export function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
