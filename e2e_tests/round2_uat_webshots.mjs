import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONT = process.env.WMS_FRONT || 'http://127.0.0.1:5173';
const LOGIN = process.env.WMS_LOGIN || '00001';
const PASS = process.env.WMS_PASS || 'Admin1234';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'screens', `round2_web_${Date.now()}`);
mkdirSync(OUT, { recursive: true });

const pages = [
  ['/dashboard', '01_dashboard'],
  ['/documents/pz', '02_documents_pz'],
  ['/documents/mm', '03_documents_mm'],
  ['/documents/rw', '04_documents_rw'],
  ['/tasks', '05_tasks'],
  ['/stock', '06_stock'],
  ['/inventory', '07_inventory'],
  ['/audit-log', '08_audit_log'],
];

const report = { outDir: OUT, startedAt: new Date().toISOString(), pages: [] };

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

async function shot(name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

try {
  await page.goto(FRONT, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  const inputs = await page.locator('input:visible').all();
  if (inputs[0]) await inputs[0].fill(LOGIN);
  if (inputs[1]) await inputs[1].fill(PASS);
  await shot('00_login_filled');
  await page.getByRole('button', { name: /zaloguj|login/i }).first().click();
  await page.waitForTimeout(1800);
  await shot('00_after_login');

  for (const [route, name] of pages) {
    await page.goto(FRONT + route, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const file = await shot(name);
    report.pages.push({ route, file: path.basename(file), url: page.url() });
  }
} finally {
  writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}

console.log(OUT);
