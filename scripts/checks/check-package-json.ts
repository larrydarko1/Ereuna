#!/usr/bin/env node
/**
 * package.json gate. A manifest is the one file every tool reads and nobody
 * rereads, so it drifts quietly: a field goes missing, a range gets pinned during
 * a bad afternoon and stays pinned, the key order wanders until diffs stop being
 * readable. The rules live in @larrydarko/lint-config/gates/package-json.
 *
 * What stays here is this repo's answers.
 *
 * `rootRequired` vs `workspaceRequired` — the standard's "Required package.json
 * Metadata" table, split by role. The root manifest is the project's identity and
 * carries the full set. Workspace manifests are private and never published, and
 * they inherit the toolchain facts — `engines`, `packageManager` — from the root,
 * so re-stating those per workspace is duplication that can silently drift.
 *
 * `tildeAllowed` — TypeScript only. Its minor releases introduce new type errors,
 * which makes a minor bump a code change rather than a dependency bump. Every
 * other package takes `^`: an exact pin opts out of security patches while adding
 * nothing, because package-lock.json is what actually pins the installed tree.
 *
 * The Electron rules in the shared gate — entry point, `build.files`, `os` parity
 * — need no switch here. They fire on a `build` block and an electron-vite config,
 * and this repo has neither, so they stay silent on their own.
 */
import { checkPackageJson } from '@larrydarko/lint-config/gates/package-json';

checkPackageJson({
    rootRequired: [
        'name',
        'version',
        'description',
        'homepage',
        'license',
        'author',
        'repository',
        'engines',
        'private',
        'packageManager',
        'type',
    ],
    workspaceRequired: ['name', 'version', 'description', 'license', 'private', 'type'],
    tildeAllowed: {
        typescript:
            'Its minor releases introduce new type errors, so a minor bump is a code change, not a dependency bump.',
    },
});
