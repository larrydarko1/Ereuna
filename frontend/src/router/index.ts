
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { isAuthenticated } from '@/api/client';

declare module 'vue-router' {
    interface RouteMeta {
        public?: boolean;
        guestOnly?: boolean;
    }
}

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

router.beforeEach((to) => {
    const signedIn = isAuthenticated();

    if (signedIn && to.meta.guestOnly === true) return { name: 'Dashboard' };
    if (!signedIn && to.meta.public !== true) {
        return { name: 'Login', query: to.fullPath === '/' ? {} : { redirect: to.fullPath } };
    }
    return true;
});

export default router;
