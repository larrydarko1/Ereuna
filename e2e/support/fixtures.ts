import { test as base, type BrowserContext, type Page } from '@playwright/test';
import type { Redis } from 'ioredis';
import { FRONTEND_URL } from './constants';
import { registerViaUi, uniqueUser, type TestUser } from './helpers';
import { createRedis, clearRateLimitBuckets } from './rate-limit';

type TestFixtures = {
    authedPage: Page;
    freshRateLimits: void;
};

type WorkerFixtures = {
    authedContext: BrowserContext;
    authedUser: TestUser;
    redis: Redis;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
    redis: [
        // eslint-disable-next-line no-empty-pattern
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
    authedUser: [
        // eslint-disable-next-line no-empty-pattern
        async ({}, use) => {
            await use(uniqueUser());
        },
        { scope: 'worker' },
    ],

    authedContext: [
        async ({ browser, authedUser }, use) => {
            const context = await browser.newContext({ baseURL: FRONTEND_URL });

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
