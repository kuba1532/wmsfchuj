import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const FRONT = process.env.WMS_FRONT || 'http://127.0.0.1:5173';
const LOGIN = process.env.WMS_LOGIN || '00001';
const PASS = process.env.WMS_PASS || 'Admin1234';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENS = path.join(__dirname, 'screens');
mkdirSync(SCREENS, { recursive: true });

const report = { pages: [], startedAt: new Date().toISOString() };

function logEntry(name, extra = {}) {
  const entry = { name, ...extra };
  report.pages.push(entry);
  return entry;
}

async function shot(page, name) {
  const file = path.join(SCREENS, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

function attachConsoleTracking(page) {
  const state = { errors: [], warnings: [], failedRequests: [] };
  page.on('console', (msg) => {
    const t = msg.type();
    if (t === 'error') state.errors.push(msg.text());
    else if (t === 'warning') state.warnings.push(msg.text());
  });
  page.on('pageerror', (e) => state.errors.push('pageerror: ' + e.message));
  page.on('response', (res) => {
    const s = res.status();
    const u = res.url();
    if (s >= 400 && /\/api\/v1\//.test(u)) {
      state.failedRequests.push(`${s} ${res.request().method()} ${u}`);
    }
  });
  return state;
}

async function waitIdle(page, ms = 400) {
  try {
    await page.waitForLoadState('networkidle', { timeout: 2500 });
  } catch {}
  await page.waitForTimeout(ms);
}

async function visit(page, path, name, state) {
  const before = { e: state.errors.length, f: state.failedRequests.length };
  await page.goto(FRONT + path, { waitUntil: 'domcontentloaded' });
  await waitIdle(page);
  const file = await shot(page, name);
  const entry = logEntry(name, {
    path,
    url: page.url(),
    title: await page.title(),
    newErrors: state.errors.slice(before.e),
    newFailedRequests: state.failedRequests.slice(before.f),
    screenshot: file,
  });
  console.log(`[${name}] ${path} -> ${page.url()}  errs=${entry.newErrors.length} http4xx/5xx=${entry.newFailedRequests.length}`);
  if (entry.newErrors.length) console.log('   errors:', entry.newErrors.slice(0, 3));
  if (entry.newFailedRequests.length) console.log('   http:', entry.newFailedRequests.slice(0, 5));
  return entry;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  context.setDefaultTimeout(8000);
  context.setDefaultNavigationTimeout(15000);
  const page = await context.newPage();
  const state = attachConsoleTracking(page);

  // 1. Login page
  await page.goto(FRONT, { waitUntil: 'domcontentloaded' });
  await waitIdle(page);
  await shot(page, '01_login_empty');

  // dump login page HTML for diagnosis
  const loginHtml = await page.content();
  writeFileSync(path.join(SCREENS, 'login.html'), loginHtml);

  // fill login — try by CSS input order (first = login, second = password)
  const inputs = await page.locator('input:visible').all();
  console.log(`login page inputs visible: ${inputs.length}`);
  if (inputs[0]) await inputs[0].fill(LOGIN);
  if (inputs[1]) await inputs[1].fill(PASS);
  await shot(page, '02_login_filled');

  const loginBtn = page.getByRole('button', { name: /Zaloguj|Login/i }).first();
  try {
    await loginBtn.click();
  } catch {
    await page.locator('button[type="submit"]').first().click();
  }
  await waitIdle(page, 2500);
  await shot(page, '03_after_login');
  console.log('after login url:', page.url());
  const tokenInfo = await page.evaluate(() => ({
    accessToken: localStorage.getItem('accessToken') ? 'present' : 'none',
    refreshToken: localStorage.getItem('refreshToken') ? 'present' : 'none',
    user: localStorage.getItem('user') ? 'present' : 'none',
  }));
  console.log('localStorage:', tokenInfo);

  if (/\/login/.test(page.url()) || tokenInfo.accessToken === 'none') {
    logEntry('login_failed', { url: page.url(), tokenInfo, errors: state.errors.slice(), failed: state.failedRequests.slice() });
  }

  const pagesToVisit = [
    ['/dashboard', '10_dashboard'],
    ['/products', '11_products'],
    ['/locations', '12_locations'],
    ['/stock', '13_stock'],
    ['/documents/pz', '14_documents_pz'],
    ['/documents/mm', '15_documents_mm'],
    ['/documents/rw', '16_documents_rw'],
    ['/tasks', '17_tasks'],
    ['/putaway', '18_putaway'],
    ['/picking', '19_picking'],
    ['/inventory', '20_inventory'],
    ['/users', '21_users'],
    ['/reports', '22_reports'],
    ['/audit-log', '23_audit_log'],
    ['/suppliers', '24_suppliers'],
    ['/settings', '25_settings'],
  ];

  for (const [p, name] of pagesToVisit) {
    try {
      await visit(page, p, name, state);
    } catch (e) {
      logEntry(name, { path: p, error: e.message });
      console.log(`[${name}] ERROR:`, e.message);
    }
  }

  // =========================================================
  // SCENARIUSZ: Nowe MM + auto-generowanie zadań
  // =========================================================
  try {
    console.log('\n--- Scenariusz: Tworzenie MM ---');
    await page.goto(FRONT + '/documents/mm', { waitUntil: 'domcontentloaded' });
    await waitIdle(page);

    const beforeE = state.errors.length;
    const beforeF = state.failedRequests.length;

    await page.getByRole('button', { name: /Nowe przesunięcie/i }).first().click();
    await page.waitForTimeout(600);
    await shot(page, '30_mm_modal_open');

    // select locations (native selects)
    const selects = await page.locator('select').all();
    console.log(`  selects found: ${selects.length}`);
    if (selects.length >= 2) {
      // first = from, second = to  (pomijamy puste "--")
      const fromOpts = await selects[0].locator('option').allTextContents();
      const toOpts = await selects[1].locator('option').allTextContents();
      console.log('  from opts:', fromOpts);
      console.log('  to opts:', toOpts);
      // wybierz BUF-DEMO jako from, STO-DEMO jako to
      await selects[0].selectOption({ label: 'BUF-DEMO' });
      await selects[1].selectOption({ label: 'STO-DEMO' });
    }

    // item: product + quantity
    const prodSelect = (await page.locator('select').all())[2];
    if (prodSelect) {
      const opts = await prodSelect.locator('option').allTextContents();
      console.log('  prod opts:', opts);
      const demo001 = opts.find((o) => o.includes('DEMO-001'));
      if (demo001) await prodSelect.selectOption({ label: demo001 });
    }
    const qty = page.locator('input[type="number"]').first();
    await qty.fill('1');
    await shot(page, '31_mm_modal_filled');

    const submit = page.getByRole('button', { name: /Utwórz dokument/i }).first();
    await submit.click();
    await page.waitForTimeout(1500);
    await shot(page, '32_mm_after_create');

    // szukaj nowo-utworzonego dokumentu w tabeli (DRAFT)
    const firstRow = page.locator('[role="row"]').nth(1); // pierwszy po nagłówku
    await firstRow.locator('[aria-label="Podgląd"], button:has(svg)').first().click().catch(() => {});
    await page.waitForTimeout(700);
    await shot(page, '33_mm_detail');

    // Zatwierdź
    const confirmBtn = page.getByRole('button', { name: /Zatwierdź/i }).first();
    if (await confirmBtn.isVisible().catch(() => false)) {
      await confirmBtn.click();
      await page.waitForTimeout(1500);
      await shot(page, '34_mm_after_confirm');
    } else {
      console.log('  Zatwierdź nie znaleziony (dokument moze juz w IN_PROGRESS)');
    }

    logEntry('mm_scenario', {
      newErrors: state.errors.slice(beforeE),
      newFailedRequests: state.failedRequests.slice(beforeF),
    });
    console.log('  mm errors:', state.errors.slice(beforeE).length);
    console.log('  mm failedReq:', state.failedRequests.slice(beforeF));

    // sprawdź czy po confirm status = IN_PROGRESS w tabeli
    await page.goto(FRONT + '/documents/mm', { waitUntil: 'domcontentloaded' });
    await waitIdle(page);
    await shot(page, '35_mm_list_after');

    // sprawdź zadania
    await page.goto(FRONT + '/tasks', { waitUntil: 'domcontentloaded' });
    await waitIdle(page);
    await shot(page, '36_tasks_after_mm');
  } catch (e) {
    console.log('  MM scenario ERROR:', e.message);
    logEntry('mm_scenario_error', { error: e.message });
  }

  // =========================================================
  // SCENARIUSZ: Częściowe blokowanie stanu
  // =========================================================
  try {
    console.log('\n--- Scenariusz: Częściowe blokowanie stanu ---');
    await page.goto(FRONT + '/stock', { waitUntil: 'domcontentloaded' });
    await waitIdle(page);

    const beforeE = state.errors.length;
    const beforeF = state.failedRequests.length;

    // kliknij ikonę akcji (zmiana statusu) w pierwszym dostępnym (AVAILABLE) wierszu
    const actionBtn = page.locator('[role="row"] button').first();
    await actionBtn.click().catch(() => {});
    await page.waitForTimeout(700);
    await shot(page, '40_stock_dialog');

    // wpisz ilosc
    const qtyInput = page.locator('input[type="number"]').last();
    if (await qtyInput.isVisible().catch(() => false)) {
      await qtyInput.fill('0.5');
      await shot(page, '41_stock_dialog_qty');
      const confirm = page.getByRole('button', { name: /Zablokuj|Odblokuj|Zmień/i }).first();
      if (await confirm.isVisible().catch(() => false)) {
        await confirm.click();
        await page.waitForTimeout(1500);
        await shot(page, '42_stock_after_change');
      }
    }

    logEntry('stock_scenario', {
      newErrors: state.errors.slice(beforeE),
      newFailedRequests: state.failedRequests.slice(beforeF),
    });
    console.log('  stock errors:', state.errors.slice(beforeE).length);
    console.log('  stock failedReq:', state.failedRequests.slice(beforeF));
  } catch (e) {
    console.log('  stock scenario ERROR:', e.message);
  }

  // Zamykamy
  writeFileSync(
    path.join(SCREENS, 'report.json'),
    JSON.stringify({ ...report, allErrors: state.errors, allFailedRequests: state.failedRequests }, null, 2),
  );
  await browser.close();
  console.log('\n=== DONE ===');
  console.log('Screens:', SCREENS);
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
