import { test, expect } from '../support/fixtures';

test.describe('Auth page links (logged-out visitor)', () => {
    test('the sign-in page offers the way to registration', async ({ page }) => {
        await page.goto('/login');
        await page.getByRole('link', { name: "Don't have an account?" }).click();

        await expect(page).toHaveURL(/\/signup/);
        await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();
    });

    test('the sign-up page offers the way back to sign-in', async ({ page }) => {
        await page.goto('/signup');
        await page.getByRole('link', { name: 'Sign In' }).click();

        await expect(page).toHaveURL(/\/login/);
        await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    });

    test('the sign-in page offers the recovery-code route in', async ({ page }) => {
        await page.goto('/login');
        await page.getByRole('link', { name: 'Use a recovery code' }).click();

        await expect(page).toHaveURL(/\/recovery/);
        await expect(page.getByRole('heading', { name: 'Use a recovery code' })).toBeVisible();
    });
});
