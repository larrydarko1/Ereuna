/** The repository root, resolved by MARKER rather than by depth. */
import fs from 'node:fs';
import path from 'node:path';

export const REPO_ROOT = findRepoRoot(import.meta.dirname);

function findRepoRoot(startDir) {
    let dir = startDir;
    for (;;) {
        const candidate = path.join(dir, 'package.json');
        if (fs.existsSync(candidate)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(candidate, 'utf8'));
                if (Array.isArray(pkg.workspaces)) return dir;
            } catch {
                // Unparseable package.json — keep walking rather than guessing.
            }
        }
        const parent = path.dirname(dir);
        if (parent === dir) {
            throw new Error(
                `Could not locate the repository root above ${startDir} — no ancestor package.json declares "workspaces".`,
            );
        }
        dir = parent;
    }
}
