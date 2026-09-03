/**
 * Guards for URLs that came from outside the app.
 */

/**
 * The URL if it is safe to put in an href, otherwise null.
 * An href is executed by the browser, and these come from an ingested news
 * feed, so anything that is not http or https — `javascript:` above all — is
 * dropped rather than rendered as a click-to-run link.
 */
export function externalUrl(value: string): string | null {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
    } catch {
        return null;
    }
}
