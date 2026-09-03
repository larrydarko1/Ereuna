/**
 * Test defaults shared by every workspace's vitest config.
 * Each workspace owns its own vitest.config.ts so that its test files belong to
 * that workspace rather than to the repo root — tooling that reasons per
 * workspace (coverage, IDE test explorers) can only attribute them correctly if
 * the config declaring them lives beside them.
 */

export const sharedTest = {
    globals: false,
    clearMocks: true,
} as const;

/**
 * The Node workspaces target ES2025, which the bundled esbuild does not accept
 * as a target name and warns about on every transformed file. Overriding
 * `tsconfigRaw` keeps that out of the transform; the real target is still
 * checked by `npm run typecheck`.
 */
export const sharedEsbuild = {
    tsconfigRaw: { compilerOptions: { target: 'ES2022', useDefineForClassFields: false } },
} as const;
