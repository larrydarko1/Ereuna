/**
 * Hand the browser a file the app generated in memory.
 * Lifted out of `csv.ts` once the portfolio wanted to export JSON as well: the
 * blob, the anchor and the revoke are the same three lines whatever the type is,
 * and the only thing CSV about them was the mime string.
 */
export function downloadFile(filename: string, body: string, type: string): void {
    const url = URL.createObjectURL(new Blob([body], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    // Revoking immediately is safe once the click has been dispatched, and not
    // revoking is a leak that lasts as long as the tab does.
    URL.revokeObjectURL(url);
}
