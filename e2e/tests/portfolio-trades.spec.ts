/**
 * The portfolio write paths, end to end: record a trade, correct it, delete it,
 * and round-trip the slot through export and import.
 * Every number on screen is replayed server-side from the trade log after each
 * write, so these assert on what the page reports rather than on the request —
 * a replay that came out wrong looks identical at the wire and wrong here.
 * The specs share the worker's signed-in context but not a slot: each takes a
 * portfolio of its own, so they can run in any order.
 */
import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { seedAsset } from '../support/seed';

/**
 * Open one of the ten slots.
 * Exact matching, because the ten tabs are labelled 1–10 and a loose "1" also
 * names the tenth.
 */
async function openSlot(page: Page, slot: number): Promise<void> {
    await page.goto('/portfolio');
    await page.getByRole('tab', { name: String(slot), exact: true }).click();
}

async function deposit(page: Page, amount: string, date = '2026-01-02'): Promise<void> {
    await page.getByRole('button', { name: 'Cash Deposit', exact: true }).first().click();
    await page.getByLabel('Amount').fill(amount);
    await page.getByLabel('Date').fill(date);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
}

/** A buy is refused unless the symbol is in the reference data, so specs seed one. */
async function buy(page: Page, symbol: string, shares: string, price: string, date = '2026-01-05'): Promise<void> {
    await page.getByRole('button', { name: 'New Trade' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Symbol').fill(symbol);
    await dialog.getByLabel('Shares').fill(shares);
    await dialog.getByLabel('Price', { exact: true }).fill(price);
    await dialog.getByLabel('Date').fill(date);
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toHaveCount(0);
}

/** One row of the transaction log, found by the symbol it names. */
function logRow(page: Page, symbol: string): Locator {
    return page.getByRole('row').filter({ hasText: symbol });
}

test.describe('Recording trades', () => {
    test('a buy reduces cash, opens a position and lands in the log', async ({ authedPage: page }) => {
        const asset = await seedAsset();
        await openSlot(page, 2);
        await deposit(page, '50000');
        await buy(page, asset.symbol, '100', '25');

        await expect(page.getByRole('cell', { name: asset.symbol, exact: true }).first()).toBeVisible();
        // 50,000 less 100 × 25 — the API replays this; the browser never computes it.
        await expect(page.getByText('$47,500.00').first()).toBeVisible();
    });

    test('a trade can be corrected, and every figure is replayed from the correction', async ({ authedPage: page }) => {
        const asset = await seedAsset();
        await openSlot(page, 3);
        await deposit(page, '50000');
        await buy(page, asset.symbol, '100', '25');
        await expect(page.getByText('$47,500.00').first()).toBeVisible();

        await logRow(page, asset.symbol).getByRole('button', { name: 'Edit' }).click();
        const dialog = page.getByRole('dialog');
        await dialog.getByLabel('Shares').fill('200');
        await dialog.getByRole('button', { name: 'Save' }).click();
        await expect(dialog).toHaveCount(0);

        // Nothing is incremented in place: the log changed, so the whole
        // portfolio is rebuilt from it and cash reflects 200 × 25, not 100 × 25.
        await expect(page.getByText('$45,000.00').first()).toBeVisible();
    });

    test('a deleted trade is replayed out of the portfolio entirely', async ({ authedPage: page }) => {
        const asset = await seedAsset();
        await openSlot(page, 4);
        await deposit(page, '50000');
        await buy(page, asset.symbol, '100', '25');
        await expect(page.getByText('$47,500.00').first()).toBeVisible();

        await logRow(page, asset.symbol).getByRole('button', { name: 'Delete' }).click();
        await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();

        await expect(page.getByRole('cell', { name: asset.symbol, exact: true })).toHaveCount(0);
        await expect(page.getByText('$50,000.00').first()).toBeVisible();
    });

    test('a withdrawal takes cash back out', async ({ authedPage: page }) => {
        await openSlot(page, 5);
        await deposit(page, '50000');

        await page.getByRole('button', { name: 'Cash', exact: true }).click();
        const dialog = page.getByRole('dialog');
        await dialog.getByRole('radio', { name: 'Cash Withdrawal' }).check();
        await dialog.getByLabel('Amount').fill('10000');
        await dialog.getByLabel('Date').fill('2026-01-10');
        await dialog.getByRole('button', { name: 'Save' }).click();
        await expect(dialog).toHaveCount(0);

        await expect(page.getByText('$40,000.00').first()).toBeVisible();
    });
});

test.describe('Export and import', () => {
    test('a slot exported as JSON imports back into another slot unchanged', async ({ authedPage: page }) => {
        const asset = await seedAsset();
        await openSlot(page, 6);
        await deposit(page, '50000');
        await buy(page, asset.symbol, '100', '25');
        await expect(page.getByText('$47,500.00').first()).toBeVisible();

        // The export envelope has to be exactly what the import accepts. It was
        // not: a cash movement went out carrying `shares: 0` and `price: 0`, and
        // the import schema rejects a deposit that names either — so every
        // export of a portfolio holding a deposit came back 422.
        await page.getByRole('button', { name: 'Export' }).click();
        const [download] = await Promise.all([
            page.waitForEvent('download'),
            page.getByRole('dialog').getByRole('button', { name: 'Download' }).click(),
        ]);
        const file = await download.path();

        await openSlot(page, 7);
        await page.getByRole('button', { name: 'Import' }).first().click();
        await page.getByLabel('JSON file').setInputFiles(file);
        await expect(page.getByText('2 trades ready to import')).toBeVisible();
        await page.getByRole('dialog').getByRole('button', { name: 'Import' }).click();
        await expect(page.getByRole('dialog')).toHaveCount(0);

        // The same log replays to the same numbers in the new slot.
        await expect(page.getByRole('cell', { name: asset.symbol, exact: true }).first()).toBeVisible();
        await expect(page.getByText('$47,500.00').first()).toBeVisible();
    });

    test('a file that is not an export is refused before anything is sent', async ({ authedPage: page }) => {
        await openSlot(page, 8);
        await page.getByRole('button', { name: 'Import' }).first().click();

        await page.getByLabel('JSON file').setInputFiles({
            name: 'not-an-export.json',
            mimeType: 'application/json',
            buffer: Buffer.from('{"hello":"world"}'),
        });

        await expect(page.getByRole('alert')).toContainText('not an Ereuna portfolio export');
        await expect(page.getByRole('dialog').getByRole('button', { name: 'Import' })).toBeDisabled();
    });
});
