import { test, expect } from '@playwright/test';

/**
 * Scenariusz 1: walidacja formularza logowania po stronie klienta.
 * NIE wymaga backendu — sprawdza UI i walidację wejścia.
 *
 * Selektory: pole kodu po placeholderze ("np. 00001"), hasło po type=password
 * (MUI TextField bez `id` nie wiąże <label> z inputem dla getByLabel).
 */
const loginInput = (page: import('@playwright/test').Page) =>
  page.getByPlaceholder('np. 00001');
const passwordInput = (page: import('@playwright/test').Page) =>
  page.locator('input[type="password"]');
const submit = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: 'Zaloguj się' });

test.describe('Logowanie — walidacja formularza', () => {
  test('wyświetla pola i przycisk logowania', async ({ page }) => {
    await page.goto('/login');

    await expect(submit(page)).toBeVisible();
    await expect(loginInput(page)).toBeVisible();
    await expect(passwordInput(page)).toBeVisible();
  });

  test('odrzuca kod logowania, który nie ma 5 cyfr', async ({ page }) => {
    await page.goto('/login');

    await loginInput(page).fill('12');
    await passwordInput(page).fill('jakieshaslo');
    await submit(page).click();

    await expect(
      page.getByText('Kod logowania musi składać się z 5 cyfr.'),
    ).toBeVisible();
  });

  test('wymaga podania hasła', async ({ page }) => {
    await page.goto('/login');

    await loginInput(page).fill('00001');
    await submit(page).click();

    await expect(page.getByText('Podaj hasło.')).toBeVisible();
  });
});
