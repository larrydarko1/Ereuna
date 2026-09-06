import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAuth, setSessionUser, type SessionUser } from '@/api/client';
import router from '@/router';

// The views are code-split and each pulls in a chart or a table; the guard is
// what this suite is about, so they are answered with an empty component.
vi.mock('@/views/Login.vue', () => ({ default: { template: '<div />' } }));
vi.mock('@/views/SignUp.vue', () => ({ default: { template: '<div />' } }));
vi.mock('@/views/Recovery.vue', () => ({ default: { template: '<div />' } }));
vi.mock('@/views/SetPassword.vue', () => ({ default: { template: '<div />' } }));
vi.mock('@/views/Dashboard.vue', () => ({ default: { template: '<div />' } }));
vi.mock('@/views/Charts.vue', () => ({ default: { template: '<div />' } }));
vi.mock('@/views/Screener.vue', () => ({ default: { template: '<div />' } }));
vi.mock('@/views/Portfolio.vue', () => ({ default: { template: '<div />' } }));
vi.mock('@/views/User.vue', () => ({ default: { template: '<div />' } }));

const user = (over: Partial<SessionUser> = {}): SessionUser => ({
    id: '507f1f77bcf86cd799439011',
    username: 'larry',
    language: 'en',
    twoFactorEnabled: false,
    passwordResetRequired: false,
    ...over,
});

/** Navigate, then report where the guard actually left the router. */
const go = async (path: string): Promise<string> => {
    await router.push(path).catch(() => undefined);
    await router.isReady();
    return router.currentRoute.value.fullPath;
};

beforeEach(() => {
    clearAuth();
    localStorage.clear();
});

describe('signed out', () => {
    it.each(['/login', '/signup', '/recovery'])('lets a guest reach %s', async (path) => {
        expect(await go(path)).toBe(path);
    });

    it.each(['/charts/AAPL', '/screener', '/portfolio', '/account'])(
        'sends a guest asking for %s to sign in, remembering where they were going',
        async (path) => {
            expect(await go(path)).toBe(`/login?redirect=${path}`);
        },
    );

    it('carries no redirect for the landing route', async () => {
        expect(await go('/')).toBe('/login');
        expect(await go('/dashboard')).toBe('/login');
    });
});

describe('signed in', () => {
    beforeEach(() => {
        setSessionUser(user());
    });

    it.each(['/dashboard', '/charts/AAPL', '/screener', '/portfolio', '/account'])(
        'lets a signed-in user reach %s',
        async (path) => {
            expect(await go(path)).toBe(path);
        },
    );

    it.each(['/login', '/signup', '/recovery'])('sends a signed-in user away from %s', async (path) => {
        expect(await go(path)).toBe('/dashboard');
    });

    it('sends the root to the dashboard', async () => {
        expect(await go('/')).toBe('/dashboard');
    });

    it('sends an unknown path to the dashboard rather than a blank page', async () => {
        expect(await go('/nothing-here')).toBe('/dashboard');
    });

    it('opens the chart with no symbol, which resolves to the account default', async () => {
        expect(await go('/charts')).toBe('/charts');
    });
});

describe('a session opened with a recovery code', () => {
    beforeEach(() => {
        setSessionUser(user({ passwordResetRequired: true }));
    });

    it.each(['/dashboard', '/charts/AAPL', '/account'])('holds %s until a password exists again', async (path) => {
        expect(await go(path)).toBe('/set-password');
    });

    it('lets the password page itself through', async () => {
        expect(await go('/set-password')).toBe('/set-password');
    });
});
