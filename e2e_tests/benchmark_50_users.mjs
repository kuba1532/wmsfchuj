import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

const API_BASE = process.env.BENCH_API_BASE ?? 'http://127.0.0.1:8000/api/v1';
const USERS = Number(process.env.BENCH_USERS ?? 50);
const ROUNDS_PER_USER = Number(process.env.BENCH_ROUNDS ?? 5);
const REQUEST_TIMEOUT_MS = Number(process.env.BENCH_TIMEOUT_MS ?? 10000);

const ENDPOINTS = [
  { name: 'tasks', path: '/tasks?page=1&page_size=20' },
  { name: 'stock', path: '/stock?page=1&page_size=20' },
  { name: 'documents', path: '/documents?page=1&page_size=20' },
  { name: 'products', path: '/products?page=1&page_size=20' },
  { name: 'locations', path: '/locations?page=1&page_size=20' },
];

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function parseEnvValue(content, key) {
  const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim() : '';
}

async function loginAdmin() {
  const envRaw = await readFile(new URL('../backend/.env', import.meta.url), 'utf8');
  const adminPassword = parseEnvValue(envRaw, 'ADMIN_PASSWORD');
  if (!adminPassword) {
    throw new Error('Brak ADMIN_PASSWORD w backend/.env');
  }

  const start = performance.now();
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: '00001', password: adminPassword }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const elapsed = performance.now() - start;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login benchmark failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return { token: data.access_token, loginMs: elapsed };
}

async function hitEndpoint(token, ep, metrics) {
  const started = performance.now();
  try {
    const res = await fetch(`${API_BASE}${ep.path}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const elapsed = performance.now() - started;
    metrics[ep.name].latencies.push(elapsed);
    metrics.overall.latencies.push(elapsed);
    metrics.overall.requests += 1;
    metrics[ep.name].requests += 1;
    if (!res.ok) {
      metrics.overall.errors += 1;
      metrics[ep.name].errors += 1;
    }
  } catch {
    const elapsed = performance.now() - started;
    metrics[ep.name].latencies.push(elapsed);
    metrics.overall.latencies.push(elapsed);
    metrics.overall.requests += 1;
    metrics[ep.name].requests += 1;
    metrics.overall.errors += 1;
    metrics[ep.name].errors += 1;
  }
}

async function virtualUser(token, metrics) {
  for (let i = 0; i < ROUNDS_PER_USER; i += 1) {
    await Promise.all(ENDPOINTS.map((ep) => hitEndpoint(token, ep, metrics)));
  }
}

function summarize(scope) {
  const lat = scope.latencies;
  const total = lat.reduce((a, b) => a + b, 0);
  return {
    requests: scope.requests,
    errors: scope.errors,
    errorRate: scope.requests ? (scope.errors / scope.requests) * 100 : 0,
    avg: lat.length ? total / lat.length : 0,
    p50: percentile(lat, 50),
    p95: percentile(lat, 95),
    p99: percentile(lat, 99),
    max: lat.length ? Math.max(...lat) : 0,
  };
}

function ms(v) {
  return Number(v.toFixed(2));
}

async function main() {
  const t0 = performance.now();
  const { token, loginMs } = await loginAdmin();

  const metrics = {
    overall: { requests: 0, errors: 0, latencies: [] },
  };
  for (const ep of ENDPOINTS) {
    metrics[ep.name] = { requests: 0, errors: 0, latencies: [] };
  }

  await Promise.all(Array.from({ length: USERS }, () => virtualUser(token, metrics)));

  const totalSec = (performance.now() - t0) / 1000;
  const summary = {
    config: {
      users: USERS,
      roundsPerUser: ROUNDS_PER_USER,
      totalRequestsPlanned: USERS * ROUNDS_PER_USER * ENDPOINTS.length,
      apiBase: API_BASE,
    },
    loginMs: ms(loginMs),
    wallTimeSec: ms(totalSec),
    overall: Object.fromEntries(
      Object.entries(summarize(metrics.overall)).map(([k, v]) => [k, typeof v === 'number' ? ms(v) : v]),
    ),
    endpoints: {},
  };

  for (const ep of ENDPOINTS) {
    const s = summarize(metrics[ep.name]);
    summary.endpoints[ep.name] = Object.fromEntries(
      Object.entries(s).map(([k, v]) => [k, typeof v === 'number' ? ms(v) : v]),
    );
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

