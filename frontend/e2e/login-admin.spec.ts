import { test, expect } from '@playwright/test';

/**
 * Scenariusz 2: pełne logowanie administratora (happy path).
 * WYMAGA działającego backendu (FastAPI + baza) oraz konta admina.
 *
 * Uruchom backend, a następnie:
 *   E2E_ADMIN_LOGIN=00001 E2E_ADMIN_PASSWORD=Twoje_Haslo npm run test:e2e
 */
const LOGIN = process.env.E2E_ADMIN_LOGIN ?? '00001';
const PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'DevWmsAdmin2026';

const loginInput = (page: import('@playwright/test').Page) =>
  page.getByPlaceholder('np. 00001');
const passwordInput = (page: import('@playwright/test').Page) =>
  page.locator('input[type="password"]');
const submit = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: 'Zaloguj się' });

test.describe('Logowanie administratora (E2E z backendem)', () => {
  test('admin loguje się i trafia na pulpit', async ({ page }) => {
    await page.goto('/login');

    await loginInput(page).fill(LOGIN);
    await passwordInput(page).fill(PASSWORD);
    await submit(page).click();

    // Po poprawnym logowaniu następuje przekierowanie na /dashboard.
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  test('błędne hasło pokazuje komunikat', async ({ page }) => {
    await page.goto('/login');

    await loginInput(page).fill(LOGIN);
    await passwordInput(page).fill('bledne_haslo_999');
    await submit(page).click();

    // Backend zwraca generyczny 401 → komunikat w Alert.
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
