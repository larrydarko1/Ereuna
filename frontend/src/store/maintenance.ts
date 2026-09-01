/**
 * MIGRATION SCAFFOLDING — delete with the maintenance view's batch.
 * Now reads GET /api/system/maintenance, the real endpoint, instead of the
 * flat /api/maintenance-status route with an X-API-KEY header that no longer
 * exists. Replacement: getMaintenanceStatus() from @/api/system.
 */
import { defineStore } from 'pinia';
import { getMaintenanceStatus } from '@/api/system';

export const useMaintenanceStore = defineStore('maintenance', {
    state: () => ({
        isUnderMaintenance: false,
        message: null as string | null,
    }),
    actions: {
        async checkMaintenanceStatus(): Promise<void> {
            try {
                const { data } = await getMaintenanceStatus();
                this.isUnderMaintenance = data.maintenanceMode;
                this.message = data.message;
            } catch {
                // Fail open. A status check that cannot reach the server must not
                // lock a working app behind a maintenance screen.
                this.isUnderMaintenance = false;
                this.message = null;
            }
        },
    },
});
