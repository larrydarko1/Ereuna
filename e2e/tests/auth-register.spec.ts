import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../support/fixtures';
import { uniqueUser } from '../support/helpers';

test.describe('Registration', () => {
    test('a new user can register and lands on the dashboard signed in', async ({ page }) => {
        const user = uniqueUser();
        await page.goto('/');
        await page.getByRole('link', { name: "Don't have an account?" }).click();

        await expect(page).toHaveURL(/\/signup/);
        await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();

        await page.getByLabel('Username').fill(user.username);
        await page.getByLabel('Password', { exact: true }).fill(user.password);
        await page.getByLabel('Confirm Password').fill(user.password);
        await page.getByLabel('I agree to the terms of service.').check();

        await page.getByRole('button', { name: 'Sign Up' }).click();

        await expect(page).toHaveURL(/\/dashboard/);
        await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
    });

    test('the sign-up page has no automatically-detectable accessibility violations', async ({ page }) => {
        await page.goto('/signup');
        await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();

        expect(results.violations).toEqual([]);
    });
});
