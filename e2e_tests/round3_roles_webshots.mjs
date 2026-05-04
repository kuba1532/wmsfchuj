import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONT = 'http://127.0.0.1:5173';

const roles = [
  { label: 'admin', login: '00001', password: 'Admin1234' },
  { label: 'foreman', login: '40476', password: 'Demo1234' },
  { label: 'worker', login: '00002', password: 'Demo1234' },
];

const pathsToCheck = ['/dashboard', '/tasks', '/documents/mm', '/users', '/audit-log'];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'screens', `round3_roles_web_${Date.now()}`);
mkdirSync(OUT, { recursive: true });

const report = { startedAt: new Date().toISOString(), outDir: OUT, runs: [] };

const browser = await chromium.launch({ channel: 'chrome', headless: true });

for (const role of roles) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const run = { role: role.label, login: role.login, pages: [] };
  try {
    await page.goto(FRONT, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    const inputs = await page.locator('input:visible').all();
    if (inputs[0]) await inputs[0].fill(role.login);
    if (inputs[1]) await inputs[1].fill(role.password);
    await page.getByRole('button', { name: /zaloguj|login/i }).first().click();
    await page.waitForTimeout(1600);
    const token = await page.evaluate(() => !!localStorage.getItem('accessToken'));
    run.loginOk = token;
    const loginFile = `${role.label}_00_after_login.png`;
    await page.screenshot({ path: path.join(OUT, loginFile), fullPage: true });
    run.loginScreenshot = loginFile;

    for (const p of pathsToCheck) {
      await page.goto(FRONT + p, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      const file = `${role.label}_${p.replaceAll('/', '_').replace(/^_/, '')}.png`;
      await page.screenshot({ path: path.join(OUT, file), fullPage: true });
      run.pages.push({ path: p, url: page.url(), screenshot: file });
    }
  } catch (e) {
    run.error = e.message;
  } finally {
    report.runs.push(run);
    await context.close();
  }
}

await browser.close();
writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
console.log(OUT);
