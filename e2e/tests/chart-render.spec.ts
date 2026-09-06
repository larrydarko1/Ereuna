import { test, expect } from '../support/fixtures';
import { seedAsset, seedDailyCandles } from '../support/seed';

test.describe('Price chart', () => {
    test('a seeded symbol draws its bars', async ({ authedPage: page }) => {
        const asset = await seedAsset({ Name: 'Chartable E2E Corp' });
        await seedDailyCandles(asset.symbol, 260);

        await page.goto(`/charts/${asset.symbol}`);

        await expect(page.getByText(asset.name).first()).toBeVisible();
        await expect(page.getByText('No data')).toHaveCount(0);

        // lightweight-charts reads the host's size once, at creation, and paints
        // into canvases it appends there. A host that has collapsed still gets
        // its canvases — they are simply pixels tall — so the size is the assertion, not the presence.
        const host = page.locator('.price-chart__canvas');
        await expect(host).toBeVisible();
        expect((await host.boundingBox())?.height ?? 0).toBeGreaterThan(200);

        const paneHeights = await host
            .locator('canvas')
            .evaluateAll((canvases) => canvases.map((canvas) => (canvas as HTMLCanvasElement).height));
        expect(Math.max(...paneHeights)).toBeGreaterThan(200);
    });

    test('a symbol with no bars says so instead of hanging on a spinner', async ({ authedPage: page }) => {
        const asset = await seedAsset({ Name: 'Barless E2E Corp' });

        await page.goto(`/charts/${asset.symbol}`);

        await expect(page.getByText('No data')).toBeVisible();
    });
});
