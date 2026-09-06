import { test, expect } from '../support/fixtures';

test.describe('Auth guard (logged-out visitor)', () => {
    for (const path of ['/dashboard', '/portfolio', '/screener', '/account', '/charts/AAPL']) {
        test(`visiting ${path} while logged out redirects to /login`, async ({ page }) => {
            await page.goto(path);

            await expect(page).toHaveURL(/\/login/);
            await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
        });
    }

    test('the blocked path is carried on ?redirect so the user resumes where they were sent back from', async ({
        page,
    }) => {
        await page.goto('/screener');

        await expect(page).toHaveURL(/\/login\?redirect=\/screener/);
    });
});
