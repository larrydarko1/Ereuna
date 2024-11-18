import { defineStore } from 'pinia';
import axios from 'axios';

export const useMaintenanceStore = defineStore('maintenance', {
    state: () => ({
        isUnderMaintenance: false
    }),
    actions: {
        async checkMaintenanceStatus() {
            try {
                const response = await axios.get('/api/maintenance-status');
                this.isUnderMaintenance = response.data.maintenance;
            } catch (error) {
                this.isUnderMaintenance = false;
            }
        }
    }
});