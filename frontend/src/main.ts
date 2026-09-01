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
import { initAuth } from '@/api/client';
import '@/styles/index.scss';

initTheme();
initLocale();

const app = createApp(App);
app.use(createPinia());
app.use(i18n);
app.use(router);

void initAuth()
    .then(async (signedIn) => {
        // Only worth a round trip once there is a session to read a theme from.
        if (signedIn) await useTheme().syncTheme();
    })
    .finally(() => app.mount('#app'));
