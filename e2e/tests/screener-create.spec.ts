import { test, expect } from '../support/fixtures';
import { seedAsset } from '../support/seed';

test.describe('Screener', () => {
    test('an account with no screener is invited to create its first', async ({ authedPage: page }) => {
        await page.goto('/screener');

        await expect(page.getByRole('heading', { name: 'No screeners yet' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Create your first screener' })).toBeVisible();
    });

    test('a new screener with no filters lists the universe', async ({ authedPage: page }) => {
        const asset = await seedAsset({ Name: 'Screenable E2E Corp' });

        await page.goto('/screener');
        await page.getByRole('button', { name: 'Add', exact: true }).click();
        await page.getByLabel('Screener Name').fill(`e2e ${Date.now().toString(36)}`);
        await page.getByRole('button', { name: 'Save' }).click();

        await expect(page.getByRole('cell', { name: asset.symbol, exact: true })).toBeVisible();
        await expect(page.getByRole('cell', { name: asset.name, exact: true })).toBeVisible();
    });

    test('a symbol can be hidden from the results and read back off the hidden list', async ({ authedPage: page }) => {
        const asset = await seedAsset({ Name: 'Hideable E2E Corp' });

        await page.goto('/screener');
        await page.getByRole('button', { name: 'Add', exact: true }).click();
        await page.getByLabel('Screener Name').fill(`e2e ${Date.now().toString(36)}`);
        await page.getByRole('button', { name: 'Save' }).click();
        await expect(page.getByRole('cell', { name: asset.symbol, exact: true })).toBeVisible();

        // The toggle leads the row rather than trailing it: as the last column
        // it was off-screen the moment a screener chose more than a few figures.
        await page.getByRole('button', { name: `Hide Asset (${asset.symbol})` }).click();

        await page.getByRole('button', { name: 'Hidden List', exact: true }).click();
        await expect(page.getByRole('cell', { name: asset.symbol, exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: `Show Asset (${asset.symbol})` })).toBeVisible();
    });
});
