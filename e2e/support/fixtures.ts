import { createLeakRecorder, type LeakRecorder } from '@larrydarko/lint-config/response-leaks';
import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';
import type { Redis } from 'ioredis';
import { MongoClient } from 'mongodb';

import { FRONTEND_URL } from './constants';
import { registerViaUi, uniqueUser, type TestUser } from './helpers';
import { createRedis, clearRateLimitBuckets } from './rate-limit';
import { SENSITIVE_FIELDS } from './sensitive-fields';

type TestFixtures = {
    authedPage: Page;
    freshRateLimits: void;
    noResponseLeaks: void;
};

type WorkerFixtures = {
    authedContext: BrowserContext;
    authedUser: TestUser;
    redis: Redis;
    leaks: LeakRecorder;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
    redis: [
        // eslint-disable-next-line no-empty-pattern -- Playwright reads a fixture's dependencies from its destructured first argument, so a fixture with none must still destructure
        async ({}, use) => {
            const client = createRedis();
            await client.connect();
            await use(client);
            client.disconnect();
        },
        { scope: 'worker' },
    ],
    freshRateLimits: [
        async ({ redis }, use) => {
            await clearRateLimitBuckets(redis);
            await use();
        },
        { auto: true },
    ],
    // The second layer behind the response schemas: a schema cannot tell a secret
    // placed under a field it DOES list, so every API answer a test sees is also
    // scanned for the server-only fields, by name and by what they hold right now
    leaks: [
        // eslint-disable-next-line no-empty-pattern -- Playwright reads a fixture's dependencies from its destructured first argument, so a fixture with none must still destructure
        async ({}, use) => {
            const client = new MongoClient(process.env['MONGO_URI'] ?? 'mongodb://localhost:27017', {
                serverSelectionTimeoutMS: 5000,
            });
            await client.connect();
            const db = client.db(process.env['MONGO_DB'] ?? 'ereuna_e2e');
            await use(createLeakRecorder({ sensitive: SENSITIVE_FIELDS, db }));
            await client.close();
        },
        { scope: 'worker' },
    ],
    noResponseLeaks: [
        async ({ leaks }, use) => {
            await use();
            expect(await leaks.drain(), 'API responses carried server-only fields').toEqual([]);
        },
        { auto: true },
    ],
    context: async ({ context, leaks }, use) => {
        leaks.watch(context);
        await use(context);
    },
    authedUser: [
        // eslint-disable-next-line no-empty-pattern -- Playwright reads a fixture's dependencies from its destructured first argument, so a fixture with none must still destructure
        async ({}, use) => {
            await use(uniqueUser());
        },
        { scope: 'worker' },
    ],

    authedContext: [
        async ({ browser, authedUser, leaks }, use) => {
            const context = await browser.newContext({ baseURL: FRONTEND_URL });
            leaks.watch(context);

            const page = await context.newPage();
            await registerViaUi(page, authedUser);
            await page.close();

            await use(context);
            await context.close();
        },
        { scope: 'worker' },
    ],

    authedPage: async ({ authedContext }, use) => {
        const page = await authedContext.newPage();
        await use(page);
        await page.close();
    },
});

export { expect } from '@playwright/test';
