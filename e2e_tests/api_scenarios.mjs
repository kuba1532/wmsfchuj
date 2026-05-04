#!/usr/bin/env node
// Scenariusze biznesowe przez API + sprawdzenie nowej logiki MM auto-generowania
// zadan i czesciowego blokowania stanu.

const API = process.env.WMS_API || 'http://127.0.0.1:8000/api/v1';
const LOGIN = process.env.WMS_LOGIN || '00001';
const PASS = process.env.WMS_PASS || 'Admin1234';

let token = '';
const results = [];

function rec(name, status, info = {}) {
  results.push({ name, status, ...info });
  const tag = status === 'OK' ? 'OK ' : status === 'FAIL' ? 'XX ' : '-- ';
  console.log(`${tag}${name}${info.detail ? ' :: ' + info.detail : ''}`);
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
  let data = null;
  const txt = await res.text();
  try { data = JSON.parse(txt); } catch { data = txt; }
  return { status: res.status, ok: res.ok, data };
}

(async () => {
  // 1. Login
  {
    const r = await http('POST', '/auth/login', { login: LOGIN, password: PASS });
    if (!r.ok) { rec('login', 'FAIL', { detail: `HTTP ${r.status}`, data: r.data }); return; }
    token = r.data.access_token;
    rec('login', 'OK', { detail: r.data.user.login_code });
  }

  // 2. Core listings
  for (const [n, p] of [
    ['products', '/products?page=1&page_size=5'],
    ['locations', '/locations?page=1&page_size=5'],
    ['stock', '/stock?page=1&page_size=20'],
    ['documents_pz', '/documents?page=1&page_size=5&doc_type=PZ'],
    ['documents_mm', '/documents?page=1&page_size=5&doc_type=MM'],
    ['documents_rw', '/documents?page=1&page_size=5&doc_type=RW'],
    ['tasks', '/tasks?page=1&page_size=5'],
    ['inventory', '/inventory?page=1&page_size=5'],
    ['users', '/users?page=1&page_size=5'],
    ['audit-log', '/audit-log?page=1&page_size=5'],
    ['suppliers', '/suppliers?page=1&page_size=5'],
  ]) {
    const r = await http('GET', p);
    rec(`GET ${n}`, r.ok ? 'OK' : 'FAIL', { detail: `HTTP ${r.status}, items=${r.data?.items?.length ?? 'n/a'}`, total: r.data?.total });
  }

  // 3. Scenariusz: Tworzenie MM + auto-generowanie zadan po confirm
  {
    // znajdz istniejacy AVAILABLE stock i wybierz jego lokalizacje zrodlowa + produkt
    const allStock = (await http('GET', '/stock?page=1&page_size=50')).data.items;
    const source = allStock.find((s) => s.status === 'AVAILABLE' && Number(s.quantity) > 0);
    const locs = (await http('GET', '/locations?page=1&page_size=20')).data.items;
    const to = locs.find((l) => l.is_active && l.id !== source?.location_id);
    if (!source || !to) { rec('mm_setup', 'FAIL', { detail: 'brak stanu AVAILABLE lub lokacji docelowej' }); }
    else {
      const moveQty = Math.min(Number(source.quantity), 0.1);
      const create = await http('POST', '/documents/mm', {
        from_location_id: source.location_id,
        to_location_id: to.id,
        items: [{ product_id: source.product_id, quantity: moveQty }],
      });
      rec('MM create', create.ok ? 'OK' : 'FAIL', { detail: `HTTP ${create.status} ${create.data?.number ?? ''}` });
      if (create.ok) {
        const id = create.data.id;
        // pobierz liczbę zadań MOVE przed confirm
        const tasksBefore = (await http('GET', '/tasks?page=1&page_size=100')).data.items.filter(t => t.type === 'MOVE').length;
        const conf = await http('POST', `/documents/${id}/confirm`);
        rec('MM confirm', conf.ok ? 'OK' : 'FAIL', { detail: `HTTP ${conf.status} status=${conf.data?.status} err=${JSON.stringify(conf.data?.detail || conf.data)}` });
        if (conf.ok) {
          if (conf.data.status === 'IN_PROGRESS') rec('MM auto-IN_PROGRESS', 'OK');
          else rec('MM auto-IN_PROGRESS', 'FAIL', { detail: `status=${conf.data.status}` });
          const tasksAfter = (await http('GET', '/tasks?page=1&page_size=100')).data.items.filter(t => t.type === 'MOVE').length;
          if (tasksAfter > tasksBefore) rec('MM auto-tasks', 'OK', { detail: `before=${tasksBefore} after=${tasksAfter}` });
          else rec('MM auto-tasks', 'FAIL', { detail: `before=${tasksBefore} after=${tasksAfter}` });
        }
      }
    }
  }

  // 4. Scenariusz: czesciowe blokowanie stanu
  {
    const stock = (await http('GET', '/stock?page=1&page_size=50')).data.items;
    const target = stock.find((s) => s.status === 'AVAILABLE' && Number(s.quantity) > 0.1);
    if (!target) { rec('stock_partial_setup', 'SKIP', { detail: 'brak AVAILABLE z qty>0.1' }); }
    else {
      const qtyBefore = Number(target.quantity);
      const blockQty = Math.min(qtyBefore / 2, 0.1);
      const r = await http('PATCH', `/stock/${target.id}/status`, {
        status: 'BLOCKED',
        version: target.version,
        quantity: blockQty,
      });
      rec('stock partial block', r.ok ? 'OK' : 'FAIL', { detail: `HTTP ${r.status} body=${JSON.stringify(r.data).slice(0,400)}` });
      if (r.ok) {
        // sprawdź że istnieją dwa rekordy dla tego product+location
        const after = (await http('GET', '/stock?page=1&page_size=100')).data.items;
        const rows = after.filter((s) => s.product_id === target.product_id && s.location_id === target.location_id);
        const avail = rows.find((s) => s.status === 'AVAILABLE');
        const blocked = rows.find((s) => s.status === 'BLOCKED');
        if (rows.length >= 2 && avail && blocked) {
          rec('stock split', 'OK', { detail: `AVAILABLE=${avail.quantity}, BLOCKED=${blocked.quantity}` });
        } else {
          rec('stock split', 'FAIL', { detail: `rows=${rows.length}` });
        }
        // rollback
        if (blocked) {
          await http('PATCH', `/stock/${blocked.id}/status`, {
            status: 'AVAILABLE',
            version: blocked.version,
          });
        }
      }
    }
  }

  // Podsumowanie
  const ok = results.filter((r) => r.status === 'OK').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  const skip = results.filter((r) => r.status === 'SKIP').length;
  console.log(`\n=== OK: ${ok}   FAIL: ${fail}   SKIP: ${skip} ===`);
  if (fail > 0) process.exit(1);
})();
