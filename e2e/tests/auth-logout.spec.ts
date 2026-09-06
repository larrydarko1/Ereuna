import { test, expect } from '../support/fixtures';
import { registerViaUi, uniqueUser } from '../support/helpers';

test.describe('Logout', () => {
    test('a signed-in user can sign out and the session is cleared', async ({ page }) => {
        const user = uniqueUser();
        await registerViaUi(page, user);

        await page.getByRole('button', { name: 'Logout' }).click();
        await expect(page).toHaveURL(/\/login/);
        await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Logout' })).toHaveCount(0);

        // The hint the app boots from is gone too, so a reload cannot walk back in
        await page.goto('/portfolio');
        await expect(page).toHaveURL(/\/login/);
    });
});
