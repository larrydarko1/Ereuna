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
