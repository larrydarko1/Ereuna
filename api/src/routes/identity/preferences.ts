/**
 * Preference routes — mounted at /api/preferences (all require authentication)
 * GET    /api/preferences                  — every stored interface preference
 * PATCH  /api/preferences                  — partial update of one or more preferences
 * POST   /api/preferences/hidden/:symbol   — hide a symbol from screener results
 * DELETE /api/preferences/hidden/:symbol   — un-hide a symbol
 */
import { Router } from 'express';
import { z } from 'zod';

import { hiddenSymbolsSchema, preferencesSchema } from '@ereuna/shared';

import { chartSettingsSchema, panelLayoutSchema, symbolSchema } from '@/lib/schemas.js';
import { send } from '@/lib/send.js';
import { authedUserId } from '@/middleware/auth.js';
import { validated } from '@/middleware/validate.js';
import * as userService from '@/services/user/index.js';

const updatePreferencesBody = z
    .object({
        language: z.string().trim().min(2).max(10),
        theme: z.string().trim().max(40).nullable(),
        defaultSymbol: symbolSchema,
        chartSettings: chartSettingsSchema.nullable(),
        panels: panelLayoutSchema.nullable(),
        screenerColumns: z.array(z.string().trim().min(1).max(60)).max(100),
    })
    .partial()
    .refine((body) => Object.keys(body).length > 0, { message: 'At least one preference is required' });

const symbolParam = z.object({ symbol: symbolSchema });

export const router = Router();

router.get(
    '/',
    ...validated({}, async (req, res): Promise<void> => {
        send(res, preferencesSchema, await userService.getPreferences(authedUserId(req)));
    }),
);

router.patch(
    '/',
    ...validated({ body: updatePreferencesBody }, async (req, res): Promise<void> => {
        send(res, preferencesSchema, await userService.updatePreferences(authedUserId(req), req.body));
    }),
);

router.post(
    '/hidden/:symbol',
    ...validated({ params: symbolParam }, async (req, res): Promise<void> => {
        const hiddenSymbols = await userService.hideSymbol(authedUserId(req), req.params.symbol);
        send(res, hiddenSymbolsSchema, { hiddenSymbols });
    }),
);

router.delete(
    '/hidden/:symbol',
    ...validated({ params: symbolParam }, async (req, res): Promise<void> => {
        const hiddenSymbols = await userService.unhideSymbol(authedUserId(req), req.params.symbol);
        send(res, hiddenSymbolsSchema, { hiddenSymbols });
    }),
);
