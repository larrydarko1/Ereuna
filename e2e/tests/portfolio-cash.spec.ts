import { test, expect } from '../support/fixtures';

test.describe('Opening a portfolio with a cash deposit', () => {
    test('a signed-in user can deposit cash and the slot starts reporting', async ({ authedPage: page }) => {
        await page.goto('/portfolio');

        await expect(page.getByRole('heading', { name: 'This portfolio is empty' })).toBeVisible();

        await page.getByRole('button', { name: 'Cash Deposit' }).click();
        await page.getByLabel('Amount').fill('25000');
        await page.getByLabel('Date').fill('2026-01-02');
        await page.getByRole('button', { name: 'Save' }).click();

        await expect(page.getByRole('heading', { name: 'This portfolio is empty' })).toHaveCount(0);
        await expect(page.getByRole('heading', { name: 'Cash' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Total Value' })).toBeVisible();

        // The trade log is the only thing stored, so the deposit must be in it
        await expect(page.getByText('Cash Deposit').first()).toBeVisible();
    });
});
