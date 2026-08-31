/**
 * System routes — mounted at /api/system
 * GET /api/system/maintenance     — the instance's maintenance state (public)
 * PUT /api/system/maintenance     — put the instance in or out of maintenance (admin)
 * GET /api/system/announcements   — operator announcements (authenticated)
 * GET /api/system/docs            — the documented feature list (authenticated)
 * The maintenance status is the one unauthenticated route: a client that cannot
 * sign in during maintenance still has to be able to find out why, so this
 * cannot sit behind the token it is explaining the absence of.
 */
import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin, requireAuth } from '@/middleware/auth.js';
import { clearMaintenanceCache } from '@/middleware/maintenance.js';
import { validated } from '@/middleware/validate.js';
import * as systemService from '@/services/system/index.js';

const maintenanceBody = z.object({
    maintenanceMode: z.boolean(),
    message: z.string().trim().max(500).nullable().default(null),
});

export const router = Router();

router.get(
    '/maintenance',
    ...validated({}, async (_req, res): Promise<void> => {
        res.json(await systemService.maintenanceStatus());
    }),
);

router.put(
    '/maintenance',
    requireAuth,
    requireAdmin,
    ...validated({ body: maintenanceBody }, async (req, res): Promise<void> => {
        const status = await systemService.setMaintenance(req.body.maintenanceMode, req.body.message);
        clearMaintenanceCache();
        res.json(status);
    }),
);

router.get(
    '/announcements',
    requireAuth,
    ...validated({}, async (_req, res): Promise<void> => {
        res.json({ items: await systemService.announcements() });
    }),
);

router.get(
    '/docs',
    requireAuth,
    ...validated({}, async (_req, res): Promise<void> => {
        res.json({ items: await systemService.docFeatures() });
    }),
);
