#!/usr/bin/env node

const API = 'http://127.0.0.1:8000/api/v1';

const roles = [
  { label: 'ADMIN', login: '00001', password: 'Admin1234' },
  { label: 'FOREMAN', login: '40476', password: 'Demo1234' },
  { label: 'WORKER', login: '00002', password: 'Demo1234' },
];

const checks = [
  { name: 'dashboard_data_products', method: 'GET', path: '/products?page=1&page_size=5' },
  { name: 'dashboard_data_locations', method: 'GET', path: '/locations?page=1&page_size=5' },
  { name: 'tasks_list', method: 'GET', path: '/tasks?page=1&page_size=5' },
  { name: 'documents_list', method: 'GET', path: '/documents?page=1&page_size=5' },
  { name: 'stock_list', method: 'GET', path: '/stock?page=1&page_size=5' },
  { name: 'inventory_list', method: 'GET', path: '/inventory?page=1&page_size=5' },
  { name: 'suppliers_list', method: 'GET', path: '/suppliers?page=1&page_size=5' },
  { name: 'users_list', method: 'GET', path: '/users?page=1&page_size=5' },
  { name: 'audit_log_list', method: 'GET', path: '/audit-log?page=1&page_size=5' },
];

async function loginUser(login, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

async function call(token, method, path) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data };
}

const report = {
  startedAt: new Date().toISOString(),
  api: API,
  roles: [],
};

let globalFail = 0;

for (const role of roles) {
  const auth = await loginUser(role.login, role.password);
  if (!auth.ok) {
    report.roles.push({
      role: role.label,
      login: role.login,
      loginStatus: auth.status,
      error: auth.data?.detail || 'login failed',
      checks: [],
    });
    globalFail += 1;
    continue;
  }

  const token = auth.data.access_token;
  const roleResult = {
    role: role.label,
    login: role.login,
    loginStatus: auth.status,
    apiRole: auth.data.user?.role,
    checks: [],
  };

  for (const c of checks) {
    const r = await call(token, c.method, c.path);
    roleResult.checks.push({
      check: c.name,
      method: c.method,
      path: c.path,
      status: r.status,
      ok: r.ok,
      detail: r.ok ? 'allowed' : (r.data?.detail || 'denied'),
    });
  }

  report.roles.push(roleResult);
}

for (const r of report.roles) {
  if (r.loginStatus !== 200) continue;
  const bad5xx = r.checks.filter((c) => c.status >= 500).length;
  globalFail += bad5xx;
}

report.summary = {
  goNoGo: globalFail === 0 ? 'GO' : 'NO-GO',
  criticalFailures: globalFail,
};

const fs = await import('node:fs');
fs.writeFileSync('/Users/jakub/Downloads/WMS 2/e2e_tests/screens/round3_roles_api_report.json', JSON.stringify(report, null, 2));
console.log(`GO_NO_GO=${report.summary.goNoGo} CRITICAL=${report.summary.criticalFailures}`);
