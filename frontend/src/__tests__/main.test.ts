import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * The entry point, exercised for its boot ORDER.
 * Everything it touches is mocked: the point is that the theme and locale are
 * applied before anything renders and the session is restored before the mount,
 * not that Vue can create an app.
 */
const calls: string[] = [];

const mount = vi.fn(() => calls.push('mount'));

vi.mock('vue', async (importOriginal) => ({
    ...(await importOriginal<typeof import('vue')>()),
    createApp: () => ({ use: vi.fn(), mount }),
}));

vi.mock('@/composables/ui/useTheme', () => ({
    initTheme: () => calls.push('initTheme'),
    useTheme: () => ({ syncTheme: () => Promise.resolve(calls.push('syncTheme')) }),
}));

vi.mock('@/i18n', () => ({
    i18n: {},
    initLocale: () => calls.push('initLocale'),
}));

vi.mock('@/api/client', () => ({
    initAuth: () => Promise.resolve(signedIn),
}));

vi.mock('@/router/index', () => ({ default: {} }));
vi.mock('@/App.vue', () => ({ default: {} }));
vi.mock('@/styles/index.scss', () => ({}));

let signedIn = true;

const boot = async (): Promise<void> => {
    calls.length = 0;
    vi.resetModules();
    await import('@/main');
    // The mount is chained off `initAuth`, so it lands a microtask later.
    await new Promise((resolve) => setTimeout(resolve, 0));
};

afterEach(() => {
    signedIn = true;
});

describe('main', () => {
    it('paints the theme and the locale before anything renders', async () => {
        await boot();

        expect(calls.indexOf('initTheme')).toBeLessThan(calls.indexOf('mount'));
        expect(calls.indexOf('initLocale')).toBeLessThan(calls.indexOf('mount'));
    });

    it('restores the session before mounting, so the first guard knows the answer', async () => {
        await boot();

        expect(calls.indexOf('syncTheme')).toBeLessThan(calls.indexOf('mount'));
        expect(calls).toContain('mount');
    });

    it('spends no round trip reading a theme when there is no session to read it from', async () => {
        signedIn = false;

        await boot();

        expect(calls).not.toContain('syncTheme');
        expect(calls).toContain('mount');
    });
});
