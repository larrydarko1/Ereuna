import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';

/** The page ground the stylesheet is actually painting with, not the id the app thinks it picked. */
function paintedBackground(page: Page): Promise<string> {
    return page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim());
}

test.describe('Theme switching', () => {
    test('picking a theme repaints the app and survives a reload', async ({ authedPage: page }) => {
        await page.goto('/account');
        await page.getByRole('tab', { name: 'Appearance' }).click();

        const nord = page.getByRole('button', { name: 'Nord' });
        await expect(nord).toHaveAttribute('aria-pressed', 'false');
        expect(await paintedBackground(page)).toBe('#1a1b26');

        await nord.click();

        await expect(nord).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'nord');
        expect(await paintedBackground(page)).toBe('#2e3440');

        await page.reload();

        await expect(page.locator('html')).toHaveAttribute('data-theme', 'nord');
        expect(await paintedBackground(page)).toBe('#2e3440');
    });
});
