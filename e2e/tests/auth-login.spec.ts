import { test, expect } from '../support/fixtures';
import { registerViaUi, signOutViaUi, uniqueUser } from '../support/helpers';

test.describe('Login', () => {
    test('an existing user can sign in again and lands on the dashboard', async ({ page }) => {
        const user = uniqueUser();

        await registerViaUi(page, user);
        await signOutViaUi(page);

        await page.getByLabel('Username').fill(user.username);
        await page.getByLabel('Password', { exact: true }).fill(user.password);
        await page.getByRole('button', { name: 'Sign In' }).click();

        await expect(page).toHaveURL(/\/dashboard/);
        await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
    });

    test('a wrong password is refused without saying which half was wrong', async ({ page }) => {
        const user = uniqueUser();

        await registerViaUi(page, user);
        await signOutViaUi(page);

        await page.getByLabel('Username').fill(user.username);
        await page.getByLabel('Password', { exact: true }).fill('E2e!Wr0ngPass');
        await page.getByRole('button', { name: 'Sign In' }).click();

        await expect(page.getByRole('alert')).toContainText('Incorrect username or password.');
        await expect(page).toHaveURL(/\/login/);
    });
});
