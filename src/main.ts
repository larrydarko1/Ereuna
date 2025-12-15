import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import authPlugin from './auth-plugin';
import i18n from './i18n';
import './style.scss';
import { useMaintenanceStore } from './store/maintenance';
import { useUserStore } from './store/store';

// If your store is Vuex, you need to migrate it to Pinia for full TS support. If already Pinia, you don't need to use 'store' as a plugin.
// import store from './store/store'; // Remove if using Pinia only



// --- THEME PERSISTENCE LOGIC (run before app creation) ---
const themes = [
    'default', 'ihatemyeyes', 'colorblind', 'catpuccin', 'black',
    'nord', 'dracula', 'gruvbox', 'tokyo-night', 'solarized',
    'synthwave', 'github-dark', 'everforest', 'ayu-dark', 'rose-pine',
    'material', 'one-dark', 'night-owl', 'panda', 'monokai-pro',
    'tomorrow-night', 'oceanic-next', 'palenight', 'cobalt', 'poimandres',
    'github-light', 'neon', 'moonlight', 'nightfox', 'spacemacs',
    'borland', 'amber', 'cyberpunk', 'matrix', 'sunset',
    'deep-ocean', 'gotham', 'retro', 'spotify', 'autumn',
    'noctis', 'iceberg', 'tango', 'horizon', 'railscasts',
    'vscode-dark', 'slack-dark', 'mintty', 'atom-one', 'light-owl'
];
const root = document.documentElement;
root.classList.remove(...themes);
const theme = localStorage.getItem('user-theme') || 'default';
root.classList.add(theme);

// Now create the app and Pinia
const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
// Persist user session from token
const userStore = useUserStore();
userStore.loadUserFromToken();

// Setup i18n with user's preferred language
app.use(i18n);

app.use(router);
app.use(authPlugin);


import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router';

router.beforeEach(async (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: NavigationGuardNext
) => {
    const token = localStorage.getItem('token');
    const userStore = useUserStore();
    // List of public routes that do not require authentication
    const publicPages = ['Login', 'SignUp', 'PaymentRenew', 'Recovery', 'Home', 'Documentation', 'Careers', 'Communications', 'About', 'Maintenance', 'Quiz', 'Blog'];
    // Auth pages that authenticated users shouldn't access
    const authPages = ['Login', 'SignUp', 'Recovery'];

    // If authenticated user tries to access auth pages, redirect to Dashboard
    if (token && authPages.includes(String(to.name))) {
        next({ name: 'Dashboard' });
        return;
    }

    // If no token and trying to access protected page, redirect to Login and clear caches
    if (!token && !publicPages.includes(String(to.name))) {
        await caches.keys().then(cacheNames => {
            cacheNames.forEach(cacheName => caches.delete(cacheName));
        });
        next({ name: 'Login' });
        return;
    }

    // If token exists, check subscription status
    if (token && userStore.user && userStore.user.Expires) {
        const expiresDate = new Date(userStore.user.Expires);
        const now = new Date();
        if (now > expiresDate && String(to.name) !== 'PaymentRenew') {
            next({ name: 'PaymentRenew' });
            return;
        }
        // Allow navigation to PaymentRenew if subscription is expired
        if (now > expiresDate && String(to.name) === 'PaymentRenew') {
            next();
            return;
        }
    }

    // At this point, user is authenticated or accessing public pages
    const maintenanceStore = useMaintenanceStore();
    await maintenanceStore.checkMaintenanceStatus();
    if (token && maintenanceStore.isUnderMaintenance === true) {
        // If trying to access restricted pages during maintenance, redirect to Upload
        if ([
            'Charts',
            'Screener',
            'Dashboard',
            'Portfolio',
            'Account'
        ].includes(String(to.name))) {
            next({ name: 'Maintenance' });
            return;
        }
    }
    // Otherwise allow navigation
    next();
});

app.mount('#app');