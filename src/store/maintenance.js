import { defineStore } from 'pinia';

export const useMaintenanceStore = defineStore('maintenance', {
    state: () => ({
        isUnderMaintenance: false
    }),
    actions: {
        async checkMaintenanceStatus() {
            try {
                const response = await fetch('/api/maintenance-status');

                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }

                const data = await response.json(); // Parse the response as JSON
                this.isUnderMaintenance = data.maintenance;
            } catch (error) {
                console.error('Error checking maintenance status:', error);
                this.isUnderMaintenance = false; // Set to false in case of an error
            }
        }
    }
});