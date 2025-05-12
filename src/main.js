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
    const maintenanceStore = useMaintenanceStore();
    await maintenanceStore.checkMaintenanceStatus();

    // Give maintenance check absolute priority
    if (maintenanceStore.isUnderMaintenance === true) {
        // Allow only Upload page during maintenance
        if (to.name === 'Upload') {
            next();
        } else {
            next({ name: 'Upload' });
        }
        return; // Important: stop here and don't check authentication
    }

    // Only check authentication if NOT in maintenance mode
    const token = localStorage.getItem('token');

    if (!token && (to.name !== 'Login' && to.name !== 'SignUp' && to.name !== 'PaymentRenew' && to.name !== 'Recovery' && to.name !== 'Home')) {
        await caches.keys().then(cacheNames => {
            cacheNames.forEach(cacheName => caches.delete(cacheName));
        });
        next({ name: 'Login' });
    } else {
        next();
    }
});

app.mount('#app');