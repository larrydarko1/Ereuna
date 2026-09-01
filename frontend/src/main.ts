/**
 * Application entry point.
 * Boot order is load-bearing:
 *   1. Theme and locale are applied to <html> synchronously, before anything
 *      renders — both read localStorage, so the first paint is already in the
 *      right colours and the right language rather than flashing the defaults.
 *   2. The session is restored (a silent refresh against the httpOnly cookie)
 *      BEFORE mounting, so the first route guard knows whether the user is
 *      signed in and no one sees the sign-in page on their way to the app.
 *   3. Only then is the app mounted.
 * `initAuth` never rejects: a failed refresh means "not signed in", which is an
 * answer, not an error.
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from '@/App.vue';
import router from '@/router/index';
import { i18n, initLocale } from '@/i18n';
import { initTheme, useTheme } from '@/composables/ui/useTheme';
import { initAuth, isAuthenticated } from '@/api/client';
import { useMaintenanceStore } from '@/store/maintenance';
import '@/styles/index.scss';

initTheme();
initLocale();

const app = createApp(App);
app.use(createPinia());
app.use(i18n);
app.use(router);

/** Routes a signed-out visitor may reach. Everything else needs a session. */
const PUBLIC_ROUTES = new Set([
    'Home',
    'About',
    'Blog',
    'Careers',
    'Communications',
    'Documentation',
    'Login',
    'Maintenance',
    'Quiz',
    'Recovery',
    'SignUp',
]);

/** Signing in again from inside a session just returns you to the app. */
const AUTH_ROUTES = new Set(['Login', 'Recovery', 'SignUp']);

/** Held back during maintenance; the rest of the app stays reachable. */
const MAINTAINED_ROUTES = new Set(['Account', 'Charts', 'Dashboard', 'Portfolio', 'Screener']);

router.beforeEach(async (to) => {
    const name = String(to.name);

    if (isAuthenticated() && AUTH_ROUTES.has(name)) return { name: 'Dashboard' };
    if (!isAuthenticated() && !PUBLIC_ROUTES.has(name)) return { name: 'Login' };
    if (!MAINTAINED_ROUTES.has(name)) return true;

    const maintenance = useMaintenanceStore();
    await maintenance.checkMaintenanceStatus();
    return maintenance.isUnderMaintenance ? { name: 'Maintenance' } : true;
});

void initAuth()
    .then(() => useTheme().syncTheme())
    .finally(() => app.mount('#app'));
