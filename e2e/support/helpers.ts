import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export type TestUser = {
    username: string;
    password: string;
};

export function uniqueUser(): TestUser {
    const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    return {
        username: `e2e_${stamp}`.slice(0, 30),
        password: 'E2e!Passw0rd',
    };
}

export async function registerViaUi(page: Page, user: TestUser): Promise<void> {
    await page.goto('/');
    await page.getByRole('link', { name: "Don't have an account?" }).click();
    await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();

    await page.getByLabel('Username').fill(user.username);
    await page.getByLabel('Password', { exact: true }).fill(user.password);
    await page.getByLabel('Confirm Password').fill(user.password);
    await page.getByLabel('I agree to the terms of service.').check();
    await page.getByRole('button', { name: 'Sign Up' }).click();

    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
}

export async function signOutViaUi(page: Page): Promise<void> {
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
}
