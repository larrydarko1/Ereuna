import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { findSessionUser, isAuthenticated } from '@/api/client';

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        redirect: { name: 'Dashboard' },
    },
    {
        path: '/login',
        name: 'Login',
        component: async () => import('@/views/Login.vue'),
        meta: { public: true, guestOnly: true },
    },
    {
        path: '/signup',
        name: 'SignUp',
        component: async () => import('@/views/SignUp.vue'),
        meta: { public: true, guestOnly: true },
    },
    {
        path: '/recovery',
        name: 'Recovery',
        component: async () => import('@/views/Recovery.vue'),
        meta: { public: true, guestOnly: true },
    },
    {
        // Signed in, but on a session a recovery code opened. The guard below
        // holds every other route until a password exists again
        path: '/set-password',
        name: 'SetPassword',
        component: async () => import('@/views/SetPassword.vue'),
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
    scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
});

declare module 'vue-router' {
    interface RouteMeta {
        public?: boolean;
        guestOnly?: boolean;
    }
}

router.beforeEach((to) => {
    const signedIn = isAuthenticated();

    if (signedIn && to.meta.guestOnly === true) return { name: 'Dashboard' };
    if (!signedIn && to.meta.public !== true) {
        return { name: 'Login', query: to.fullPath === '/' ? {} : { redirect: to.fullPath } };
    }

    // A recovery code is a way back in, not a password. Until one is set the
    // account has no first factor, so nothing else is reachable
    if (signedIn && to.name !== 'SetPassword' && findSessionUser()?.passwordResetRequired === true) {
        return { name: 'SetPassword' };
    }

    return true;
});

export default router;
