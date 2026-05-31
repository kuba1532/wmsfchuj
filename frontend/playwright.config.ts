import { defineConfig, devices } from '@playwright/test';

/**
 * Konfiguracja testów E2E (Playwright).
 *
 * - `webServer` automatycznie startuje frontend (Vite) na czas testów.
 * - Scenariusz „happy path" logowania wymaga DZIAŁAJĄCEGO backendu (FastAPI + DB).
 *   Adres API ustawia frontend przez VITE_API_URL (patrz README frontendu).
 *
 * Zmienne środowiskowe:
 *   E2E_PORT            port dev-servera frontendu (domyślnie 5173)
 *   E2E_BASE_URL        pełny baseURL (nadpisuje port)
 *   E2E_ADMIN_LOGIN     kod logowania admina (domyślnie 00001)
 *   E2E_ADMIN_PASSWORD  hasło admina (domyślnie z backend/.env)
 */
// Dedykowany port (5173 bywa zajęty przez inne projekty Vite).
const PORT = Number(process.env.E2E_PORT ?? 5199);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: baseURL,
    // Zawsze startujemy własny dev-server WMS na dedykowanym porcie — bez tego
    // Playwright mógłby „zreużyć" obcy serwer Vite uruchomiony na innym projekcie.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
