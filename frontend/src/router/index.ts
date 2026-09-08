import { createRouter, createWebHistory, type RouteRecordRaw, type RouterScrollBehavior } from 'vue-router';
import { findSessionUser, isAuthenticated } from '@/api/client';

/** vue-router keeps `ScrollPosition` internal, so it is named through the behaviour it belongs to. */
type ScrollTarget = Awaited<ReturnType<RouterScrollBehavior>>;

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        redirect: { name: 'Dashboard' },
    },
    {
        path: '/login',
        name: 'Login',
        component: async () => import('@/views/Login.vue'),
        meta: { public: true, guestOnly: true, bare: true },
    },
    {
        path: '/signup',
        name: 'SignUp',
        component: async () => import('@/views/SignUp.vue'),
        meta: { public: true, guestOnly: true, bare: true },
    },
    {
        path: '/recovery',
        name: 'Recovery',
        component: async () => import('@/views/Recovery.vue'),
        meta: { public: true, guestOnly: true, bare: true },
    },
    {
        // Signed in, but on a session a recovery code opened. The guard below
        // holds every other route until a password exists again, and `bare`
        // keeps the app header off it — a nav bar around a page whose whole
        // point is that the account has no password yet invites a click that
        // the guard then bounces straight back.
        path: '/set-password',
        name: 'SetPassword',
        component: async () => import('@/views/SetPassword.vue'),
        meta: { bare: true },
    },
    {
        path: '/dashboard',
        name: 'Dashboard',
        component: async () => import('@/views/Dashboard.vue'),
    },
    {
        path: '/charts/:symbol?',
        name: 'Charts',
        component: async () => import('@/views/Charts.vue'),
    },
    {
        path: '/screener',
        name: 'Screener',
        component: async () => import('@/views/Screener.vue'),
    },
    {
        path: '/portfolio',
        name: 'Portfolio',
        component: async () => import('@/views/Portfolio.vue'),
    },
    {
        path: '/account',
        name: 'Account',
        component: async () => import('@/views/User.vue'),
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        redirect: { name: 'Dashboard' },
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
    // Every navigation is to a different view, so the top is always the right
    // place to be — except when the browser is restoring a back/forward entry.
    scrollBehavior: (_to, _from, saved): ScrollTarget => saved ?? { top: 0 },
});

declare module 'vue-router' {
    interface RouteMeta {
        public?: boolean; // Reachable signed out
        guestOnly?: boolean; // Redirects to the dashboard when a session already exists
        bare?: boolean; // Rendered without the app header
    }
}

router.beforeEach((to) => {
    const signedIn = isAuthenticated();

    if (signedIn && to.meta.guestOnly === true) return { name: 'Dashboard' };
    if (!signedIn && to.meta.public !== true) {
        // No redirect for the landing route: `/` resolves to Dashboard before
        // any guard runs, so a bare visit would otherwise be sent to
        // `/login?redirect=/dashboard` — where sign-in lands anyway.
        return { name: 'Login', query: to.name === 'Dashboard' ? {} : { redirect: to.fullPath } };
    }

    // A recovery code is a way back in, not a password. Until one is set the
    // account has no first factor, so nothing else is reachable
    if (signedIn && to.name !== 'SetPassword' && findSessionUser()?.passwordResetRequired === true) {
        return { name: 'SetPassword' };
    }

    return true;
});

export default router;
