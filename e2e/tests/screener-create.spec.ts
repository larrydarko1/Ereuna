import { test, expect } from '../support/fixtures';
import { seedAsset } from '../support/seed';

test.describe('Screener', () => {
    test('a new screener with no filters lists the universe', async ({ authedPage: page }) => {
        const asset = await seedAsset({ Name: 'Screenable E2E Corp' });

        await page.goto('/screener');
        await expect(page.getByText('No results found')).toBeVisible();

        await page.getByRole('button', { name: 'Add' }).click();
        await page.getByLabel('Screener Name').fill(`e2e ${Date.now().toString(36)}`);
        await page.getByRole('button', { name: 'Save' }).click();

        await expect(page.getByRole('cell', { name: asset.symbol, exact: true })).toBeVisible();
        await expect(page.getByRole('cell', { name: asset.name, exact: true })).toBeVisible();
    });
});
