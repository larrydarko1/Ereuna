/**
 * system — API wrappers for /api/system.
 * `getMaintenanceStatus` is the one unauthenticated call in the app: a client
 * that cannot sign in during maintenance still has to be able to find out why,
 * so it cannot sit behind the token it is explaining the absence of.
 */
import type { AnnouncementDoc, DocFeatureDoc } from '@ereuna/shared';
import { api, type ApiResult } from '@/api/client';

export type MaintenanceStatus = {
    maintenanceMode: boolean;
    message: string | null;
    updatedAt: string | null;
};

export function getMaintenanceStatus(): ApiResult<MaintenanceStatus> {
    return api.get<MaintenanceStatus>('/system/maintenance');
}

/** Admin only. Everyone else gets FORBIDDEN. */
export function setMaintenance(maintenanceMode: boolean, message: string | null): ApiResult<MaintenanceStatus> {
    return api.put<MaintenanceStatus>('/system/maintenance', { maintenanceMode, message });
}

export function getAnnouncements(): ApiResult<{ items: AnnouncementDoc[] }> {
    return api.get<{ items: AnnouncementDoc[] }>('/system/announcements');
}

export function getDocFeatures(): ApiResult<{ items: DocFeatureDoc[] }> {
    return api.get<{ items: DocFeatureDoc[] }>('/system/docs');
}
