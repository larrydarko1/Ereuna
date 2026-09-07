import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';

/** The page ground the stylesheet is actually painting with, not the id the app thinks it picked. */
function paintedBackground(page: Page): Promise<string> {
    return page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim());
}

test.describe('Theme switching', () => {
    test('picking a theme repaints the app and survives a reload', async ({ authedPage: page }) => {
        await page.goto('/account');

        const picker = page.getByLabel('Theme');
        await expect(picker).toHaveValue('default');
        expect(await paintedBackground(page)).toBe('#1a1b26');

        await picker.selectOption('gruvbox');

        await expect(page.locator('html')).toHaveAttribute('data-theme', 'gruvbox');
        expect(await paintedBackground(page)).toBe('#282828');

        await page.reload();

        await expect(page.locator('html')).toHaveAttribute('data-theme', 'gruvbox');
        expect(await paintedBackground(page)).toBe('#282828');
        await expect(page.getByLabel('Theme')).toHaveValue('gruvbox');
    });

    test('the six palettes are offered in two groups, dark and light', async ({ authedPage: page }) => {
        await page.goto('/account');

        await expect(page.getByLabel('Theme').locator('option')).toHaveCount(6);
        await expect(page.getByLabel('Theme').locator('optgroup')).toHaveCount(2);
    });
});
