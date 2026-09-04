/** Blank out comments while preserving every byte offset and line number. */
export function stripComments(src) {
    let out = '';
    let i = 0;
    while (i < src.length) {
        const ch = src[i];
        const next = src[i + 1];
        if (ch === '/' && next === '*') {
            const end = src.indexOf('*/', i + 2);
            const stop = end === -1 ? src.length : end + 2;
            out += src.slice(i, stop).replace(/[^\n]/g, ' ');
            i = stop;
        } else if (ch === '/' && next === '/') {
            const end = src.indexOf('\n', i);
            const stop = end === -1 ? src.length : end;
            out += ' '.repeat(stop - i);
            i = stop;
        } else if (ch === "'" || ch === '"' || ch === '`') {
            const start = i++;
            while (i < src.length && src[i] !== ch) i += src[i] === '\\' ? 2 : 1;
            out += src.slice(start, ++i);
        } else {
            out += ch;
            i++;
        }
    }
    return out;
}
