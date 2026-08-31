/**
 * Maintenance gate — refuse ordinary traffic while the instance is down.
 * Without this the maintenance flag is only a suggestion the frontend may
 * choose to honour; here it is the API's own answer, so a direct call gets the
 * same 503 the UI does.
 * Authentication and the system routes stay open: a client has to be able to
 * ask *why* it is being refused, and an admin has to be able to sign in and
 * turn maintenance back off.
 * The flag is cached in-process for a few seconds rather than read per request.
 * A request or two slipping through in the seconds after the switch is flipped
 * is the cost of not adding a database round trip to every call.
 */
import type { NextFunction, Response } from 'express';
import { AppError } from '@/lib/app-error.js';
import { maintenanceStatus } from '@/services/system/index.js';
import type { AuthRequest } from '@/middleware/auth.js';
import { isAdmin } from '@/middleware/auth.js';

/** How long a read of the flag is trusted for. */
const CACHE_MS = 5_000;

let cached: { value: boolean; readAt: number } | null = null;

export function maintenanceGate(req: AuthRequest, _res: Response, next: NextFunction): void {
    void gate(req)
        .then(() => next())
        .catch(next);
}

async function gate(req: AuthRequest): Promise<void> {
    if (!(await inMaintenance())) return;
    if (req.userId !== undefined && (await isAdmin(req.userId))) return;

    throw new AppError(503, 'MAINTENANCE_MODE', 'instance is in maintenance');
}

async function inMaintenance(): Promise<boolean> {
    const now = Date.now();
    if (cached !== null && now - cached.readAt < CACHE_MS) return cached.value;

    try {
        const { maintenanceMode } = await maintenanceStatus();
        cached = { value: maintenanceMode, readAt: now };
        return maintenanceMode;
    } catch {
        // A settings read that fails must not take the whole API down with it:
        // fail open, and try again on the next request.
        return false;
    }
}

/** Drop the cached flag, so a change through the admin route takes effect at once. */
export function clearMaintenanceCache(): void {
    cached = null;
}
