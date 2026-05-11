#!/usr/bin/env node

const API = process.env.WMS_API || 'http://127.0.0.1:8000/api/v1';
const LOGIN = process.env.WMS_LOGIN || '00001';
const PASS = process.env.WMS_PASS || 'Admin1234';

let token = '';
const rows = [];

function row(name, status, detail = '', extra = {}) {
  rows.push({ name, status, detail, ...extra });
  console.log(`${status.padEnd(4)} ${name}${detail ? ` :: ${detail}` : ''}`);
}

async function http(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

function pickAvailable(stockItems) {
  return stockItems.find((s) => s.status === 'AVAILABLE' && Number(s.quantity) > 0.2);
}

(async () => {
  // Login
  const login = await http('POST', '/auth/login', { login: LOGIN, password: PASS });
  if (!login.ok) {
    row('login', 'FAIL', `HTTP ${login.status}`);
    process.exit(1);
  }
  token = login.data.access_token;
  row('login', 'OK', `user=${login.data.user.login_code}`);

  // Snapshot startowy
  const startTasks = await http('GET', '/tasks?page=1&page_size=100');
  const startStock = await http('GET', '/stock?page=1&page_size=100');
  row('snapshot', startTasks.ok && startStock.ok ? 'OK' : 'FAIL', `tasks=${startTasks.data.items?.length ?? 0}, stock=${startStock.data.items?.length ?? 0}`);

  // ---------- PZ ----------
  const suppliers = await http('GET', '/suppliers?page=1&page_size=20');
  const products = await http('GET', '/products?page=1&page_size=20');
  const locsPz = await http('GET', '/locations?page=1&page_size=50');
  if (!suppliers.ok || !products.ok || !suppliers.data.items?.length || !products.data.items?.length) {
    row('pz_setup', 'FAIL', 'brak suppliers/products');
  } else {
    const supplier = suppliers.data.items[0];
    // W tym środowisku dostawca DEMO-SUP obsługuje produkty 1 i 2.
    const product = products.data.items.find((p) => p.id === 1) || products.data.items.find((p) => p.id === 2) || products.data.items[0];
    const putawayLoc = (locsPz.data.items || []).find((l) => l.is_active && l.type !== 'BUFFER');
    if (!putawayLoc) {
      row('pz_setup', 'FAIL', 'brak lokalizacji nie-BUFFER pod PZ');
    } else {
      const pzCreate = await http('POST', '/documents/pz', {
        supplier_id: supplier.id,
        items: [{ product_id: product.id, quantity: 1, putaway_to_location_id: putawayLoc.id }],
      });
      row('pz_create', pzCreate.ok ? 'OK' : 'FAIL', `HTTP ${pzCreate.status} ${pzCreate.data?.number ?? ''}`);

      if (pzCreate.ok) {
        const pzId = pzCreate.data.id;
        const pzStart = await http('POST', `/documents/${pzId}/pz/start`);
        row('pz_start', pzStart.ok ? 'OK' : 'FAIL', `HTTP ${pzStart.status} status=${pzStart.data?.status ?? 'n/a'}`);
        if (pzStart.ok) {
          const pzComplete = await http('POST', `/documents/${pzId}/pz/complete`);
          row('pz_complete', pzComplete.ok ? 'OK' : 'FAIL', `HTTP ${pzComplete.status} status=${pzComplete.data?.status ?? 'n/a'}`);
        }
      }
    }
  }

  // ---------- MM ----------
  const stockForMm = await http('GET', '/stock?page=1&page_size=100');
  const locations = await http('GET', '/locations?page=1&page_size=50');
  if (!stockForMm.ok || !locations.ok) {
    row('mm_setup', 'FAIL', 'brak stock/locations');
  } else {
    const source = pickAvailable(stockForMm.data.items || []);
    const targetLoc = (locations.data.items || []).find((l) => l.is_active && l.id !== source?.location_id);
    if (!source || !targetLoc) {
      row('mm_setup', 'FAIL', 'brak source AVAILABLE lub target location');
    } else {
      const tasksBefore = await http('GET', '/tasks?page=1&page_size=100');
      const moveBefore = (tasksBefore.data.items || []).filter((t) => t.type === 'MOVE').length;
      const qty = Math.min(Number(source.quantity), 0.2);
      const mmCreate = await http('POST', '/documents/mm', {
        from_location_id: source.location_id,
        to_location_id: targetLoc.id,
        items: [{ product_id: source.product_id, quantity: qty }],
      });
      row('mm_create', mmCreate.ok ? 'OK' : 'FAIL', `HTTP ${mmCreate.status} ${mmCreate.data?.number ?? ''}`);

      if (mmCreate.ok) {
        const mmConfirm = await http('POST', `/documents/${mmCreate.data.id}/confirm`);
        row('mm_confirm', mmConfirm.ok ? 'OK' : 'FAIL', `HTTP ${mmConfirm.status} status=${mmConfirm.data?.status ?? 'n/a'}`);
        const tasksAfter = await http('GET', '/tasks?page=1&page_size=100');
        const moveAfter = (tasksAfter.data.items || []).filter((t) => t.type === 'MOVE').length;
        row('mm_task_autogen', moveAfter > moveBefore ? 'OK' : 'FAIL', `MOVE before=${moveBefore} after=${moveAfter}`);
      }
    }
  }

  // ---------- RW ----------
  const stockForRw = await http('GET', '/stock?page=1&page_size=100');
  const recipientsRw = await http('GET', '/recipients?page=1&page_size=50');
  if (!stockForRw.ok) {
    row('rw_setup', 'FAIL', 'brak stock');
  } else if (!recipientsRw.ok || !(recipientsRw.data.items || []).length) {
    row('rw_setup', 'FAIL', `brak odbiorców HTTP ${recipientsRw.status}`);
  } else {
    const source = pickAvailable(stockForRw.data.items || []);
    if (!source) {
      row('rw_setup', 'FAIL', 'brak AVAILABLE > 0.2');
    } else {
      const sumAvailableBefore = (stockForRw.data.items || [])
        .filter((s) => s.product_id === source.product_id && s.status === 'AVAILABLE')
        .reduce((a, b) => a + Number(b.quantity), 0);

      const recipient = recipientsRw.data.items[0];
      const qtyRw = Math.min(Number(source.quantity), 0.2);
      const rwCreate = await http('POST', '/documents/rw', {
        from_location_id: source.location_id,
        recipient_id: recipient.id,
        items: [{ product_id: source.product_id, quantity: qtyRw }],
      });
      row('rw_create', rwCreate.ok ? 'OK' : 'FAIL', `HTTP ${rwCreate.status} ${rwCreate.data?.number ?? ''}`);

      if (rwCreate.ok) {
        const rwConfirm = await http('POST', `/documents/${rwCreate.data.id}/confirm`);
        if (rwConfirm.ok) {
          row('rw_confirm', 'OK', `HTTP ${rwConfirm.status} status=${rwConfirm.data?.status ?? 'n/a'}`);
          const stockAfterRw = await http('GET', '/stock?page=1&page_size=100');
          if (stockAfterRw.ok) {
            const sumAvailableAfter = (stockAfterRw.data.items || [])
              .filter((s) => s.product_id === source.product_id && s.status === 'AVAILABLE')
              .reduce((a, b) => a + Number(b.quantity), 0);
            row(
              'rw_stock_impact',
              sumAvailableAfter < sumAvailableBefore ? 'OK' : 'FAIL',
              `available_before=${sumAvailableBefore.toFixed(3)} available_after=${sumAvailableAfter.toFixed(3)}`
            );
          }
        } else {
          const detail = String(rwConfirm.data?.detail || '');
          row('rw_confirm', 'FAIL', `HTTP ${rwConfirm.status} detail=${detail}`);
        }
      }
    }
  }

  // ---------- Podsumowanie ----------
  const ok = rows.filter((r) => r.status === 'OK').length;
  const fail = rows.filter((r) => r.status === 'FAIL').length;
  console.log(`\n=== ROUND2 UAT: OK=${ok} FAIL=${fail} ===`);

  const out = {
    startedAt: new Date().toISOString(),
    api: API,
    user: LOGIN,
    results: rows,
    summary: { ok, fail },
  };
  const fs = await import('node:fs');
  fs.writeFileSync('/Users/jakub/Downloads/WMS 2/e2e_tests/screens/round2_uat_api_report.json', JSON.stringify(out, null, 2));

  if (fail > 0) process.exit(1);
})();
