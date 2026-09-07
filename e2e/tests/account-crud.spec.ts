/**
 * The whole life of an account, through the UI that owns it: create, sign in,
 * rename, change the password, delete.
 * Every test here registers its own throwaway user rather than taking the
 * worker-scoped `authedPage`. Three of the five destroy or invalidate the
 * session they run under — a rename rewrites the session hint, a password
 * change revokes every refresh token, and a deletion removes the row — so a
 * shared context would leave whichever spec ran next signed in as nobody.
 */
import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { registerViaUi, signOutViaUi, uniqueUser } from '../support/helpers';

/**
 * One setting card, found by its own heading.
 * Three cards on this page carry a "Current password" field, so every field
 * here is reached through the card that owns it rather than by index.
 */
function card(page: Page, title: string): Locator {
    return page.locator('section').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
}

/** Reach the account page the way a user does, not by typing the URL. */
async function openAccount(page: Page): Promise<void> {
    await page.getByRole('link', { name: 'Account' }).click();
    await expect(page.getByRole('heading', { name: 'Account', level: 1 })).toBeVisible();
}

test.describe('Account lifecycle', () => {
    test('a new account can be created and signed back into', async ({ page }) => {
        const user = uniqueUser();

        await registerViaUi(page, user);
        await signOutViaUi(page);

        await page.getByLabel('Username').fill(user.username);
        await page.getByLabel('Password', { exact: true }).fill(user.password);
        await page.getByRole('button', { name: 'Sign In' }).click();

        await expect(page).toHaveURL(/\/dashboard/);
    });

    test('a username can be changed, and the new one is what signs in afterwards', async ({ page }) => {
        const user = uniqueUser();
        const renamed = `${user.username.slice(0, 24)}_r`;
        await registerViaUi(page, user);
        await openAccount(page);

        const username = card(page, 'Username');
        await expect(username.getByText(`Signed in as ${user.username}.`)).toBeVisible();

        await username.getByLabel('New username').fill(renamed);
        await username.getByLabel('Current password').fill(user.password);
        await username.getByRole('button', { name: 'Change username' }).click();

        // The card reflects the rename without a reload, because the session
        // hint the app boots from is rewritten alongside it.
        await expect(username.getByText(`Signed in as ${renamed}.`)).toBeVisible();

        await signOutViaUi(page);
        await page.getByLabel('Username').fill(renamed);
        await page.getByLabel('Password', { exact: true }).fill(user.password);
        await page.getByRole('button', { name: 'Sign In' }).click();

        await expect(page).toHaveURL(/\/dashboard/);
    });

    test('changing the password signs the session out and only the new one works', async ({ page }) => {
        const user = uniqueUser();
        const next = 'E2e!N3wPassw0rd';
        await registerViaUi(page, user);
        await openAccount(page);

        const password = card(page, 'Password');
        await password.getByLabel('Current password').fill(user.password);
        await password.getByLabel('New password', { exact: true }).fill(next);
        await password.getByLabel('Confirm new password').fill(next);
        await password.getByRole('button', { name: 'Change password' }).click();

        // The API revokes every refresh token, so the app ends the session here
        // rather than letting the next request bounce the user mid-click.
        await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

        await page.getByLabel('Username').fill(user.username);
        await page.getByLabel('Password', { exact: true }).fill(user.password);
        await page.getByRole('button', { name: 'Sign In' }).click();
        await expect(page.getByRole('alert')).toContainText('Incorrect username or password.');

        await page.getByLabel('Password', { exact: true }).fill(next);
        await page.getByRole('button', { name: 'Sign In' }).click();
        await expect(page).toHaveURL(/\/dashboard/);
    });

    test('an account can be deleted, and the credentials stop working with it', async ({ page }) => {
        const user = uniqueUser();
        await registerViaUi(page, user);
        await openAccount(page);

        await expect(page.getByRole('heading', { name: 'Danger zone' })).toBeVisible();

        const remove = card(page, 'Delete account');
        await remove.getByLabel('Current password').fill(user.password);
        await remove.getByRole('button', { name: 'Delete account' }).click();

        // Two steps on purpose: the button above only opens the confirmation.
        const dialog = page.getByRole('dialog');
        await expect(dialog).toContainText('deleted immediately and permanently');
        await dialog.getByRole('button', { name: 'Delete account' }).click();

        await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

        await page.getByLabel('Username').fill(user.username);
        await page.getByLabel('Password', { exact: true }).fill(user.password);
        await page.getByRole('button', { name: 'Sign In' }).click();

        await expect(page.getByRole('alert')).toContainText('Incorrect username or password.');
    });

    test('a deletion can be backed out of at the confirmation', async ({ page }) => {
        const user = uniqueUser();
        await registerViaUi(page, user);
        await openAccount(page);

        const remove = card(page, 'Delete account');
        await remove.getByLabel('Current password').fill(user.password);
        await remove.getByRole('button', { name: 'Delete account' }).click();
        await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();

        await expect(page.getByRole('dialog')).toHaveCount(0);
        await expect(page.getByRole('heading', { name: 'Account', level: 1 })).toBeVisible();
    });
});
