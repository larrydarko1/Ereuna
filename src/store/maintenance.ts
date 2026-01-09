import { defineStore } from 'pinia';

const apiKey = import.meta.env.VITE_EREUNA_KEY; // Add apiKey

export const useMaintenanceStore = defineStore('maintenance', {
    state: () => ({
        isUnderMaintenance: false,
        maintenanceType: 'regular' as 'regular' | 'extraordinary',
        errorMessage: ''
    }),
    actions: {
        async checkMaintenanceStatus() {
            try {
                const response = await fetch('/api/maintenance-status', {
                    headers: {
                        'X-API-KEY': apiKey,
                    }
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }

                const data = await response.json(); // Parse the response as JSON
                this.isUnderMaintenance = data.maintenance;
                this.maintenanceType = data.type || 'regular';
                this.errorMessage = '';
            } catch (error) {
                if (error instanceof Error) {
                    this.errorMessage = error.message;
                } else {
                    this.errorMessage = String(error);
                }
                this.isUnderMaintenance = false; // Set to false in case of an error
            }
        }
    }
});
