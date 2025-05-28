import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import store from './store/store';
import authPlugin from './auth-plugin';
import './style.scss'
import { useMaintenanceStore } from './store/maintenance';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(store);
app.use(authPlugin);

// Maintain the navigation guard here
router.beforeEach(async (to, from, next) => {
    const token = localStorage.getItem('token');
    // List of public routes that do not require authentication
    const publicPages = ['Login', 'SignUp', 'PaymentRenew', 'Recovery', 'Home', 'Documentation'];
    // If no token and trying to access protected page, redirect to Login and clear caches
    if (!token && !publicPages.includes(to.name)) {
        await caches.keys().then(cacheNames => {
            cacheNames.forEach(cacheName => caches.delete(cacheName));
        });
        next({ name: 'Login' });
        return;
    }

    // At this point, user is authenticated or accessing public pages
    const maintenanceStore = useMaintenanceStore();
    await maintenanceStore.checkMaintenanceStatus();
    if (token && maintenanceStore.isUnderMaintenance === true) {
        // If trying to access restricted pages during maintenance, redirect to Upload
        if (['Charts', 'Screener', 'Dashboard'].includes(to.name)) {
            next({ name: 'Upload' });
            return;
        }
    }
    // Otherwise allow navigation
    next();
});

app.mount('#app');