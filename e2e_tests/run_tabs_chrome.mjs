import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONT = process.env.WMS_FRONT || 'http://127.0.0.1:5173';
const LOGIN = process.env.WMS_LOGIN || '00001';
const PASS = process.env.WMS_PASS || 'Admin1234';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'screens', `run_${Date.now()}`);
mkdirSync(OUT, { recursive: true });

const pages = [
  ['/dashboard', 'dashboard'],
  ['/products', 'products'],
  ['/locations', 'locations'],
  ['/stock', 'stock'],
  ['/documents/pz', 'documents_pz'],
  ['/documents/mm', 'documents_mm'],
  ['/documents/rw', 'documents_rw'],
  ['/tasks', 'tasks'],
  ['/putaway', 'putaway'],
  ['/picking', 'picking'],
  ['/inventory', 'inventory'],
  ['/users', 'users'],
  ['/reports', 'reports'],
  ['/audit-log', 'audit_log'],
  ['/suppliers', 'suppliers'],
  ['/settings', 'settings'],
];

const report = { outDir: OUT, startedAt: new Date().toISOString(), checks: [] };

function rec(name, status, detail = '') {
  const row = { name, status, detail };
  report.checks.push(row);
  console.log(`${status.padEnd(4)} ${name}${detail ? ` :: ${detail}` : ''}`);
}

async function screenshot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const jsErrors = [];
const failedApi = [];

page.on('console', (msg) => {
  if (msg.type() === 'error') jsErrors.push(msg.text());
});
page.on('pageerror', (err) => jsErrors.push(err.message));
page.on('response', (res) => {
  if (res.status() >= 400 && /\/api\/v1\//.test(res.url())) {
    failedApi.push(`${res.status()} ${res.request().method()} ${res.url()}`);
  }
});

try {
  await page.goto(FRONT, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await screenshot(page, '01_login');

  const inputs = await page.locator('input:visible').all();
  if (inputs[0]) await inputs[0].fill(LOGIN);
  if (inputs[1]) await inputs[1].fill(PASS);
  await screenshot(page, '02_login_filled');

  await page.getByRole('button', { name: /zaloguj|login/i }).first().click();
  await page.waitForTimeout(1800);
  await screenshot(page, '03_after_login');

  const tokenPresent = await page.evaluate(() => !!localStorage.getItem('accessToken'));
  rec('login', tokenPresent ? 'OK' : 'FAIL', page.url());

  for (const [route, name] of pages) {
    const e0 = jsErrors.length;
    const f0 = failedApi.length;
    try {
      await page.goto(FRONT + route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1100);
      const file = await screenshot(page, name);
      const newErr = jsErrors.slice(e0);
      const newFail = failedApi.slice(f0);
      const status = newErr.length || newFail.length ? 'WARN' : 'OK';
      rec(name, status, `${route} | ${path.basename(file)} | js=${newErr.length} api=${newFail.length}`);
    } catch (err) {
      rec(name, 'FAIL', err.message);
    }
  }
} finally {
  report.jsErrors = jsErrors;
  report.failedApi = failedApi;
  writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
