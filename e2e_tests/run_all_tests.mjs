#!/usr/bin/env node
import { spawn } from 'node:child_process';

const steps = [
  {
    name: 'API smoke',
    cmd: 'node',
    args: ['api_scenarios.mjs'],
    why: 'Weryfikuje zdrowie kontraktu API i kluczowe endpointy domenowe.',
  },
  {
    name: 'API UAT runda 2',
    cmd: 'node',
    args: ['round2_uat_api.mjs'],
    why: 'Sprawdza scenariusze biznesowe PZ/MM/RW oraz reguły magazynowe.',
  },
  {
    name: 'API role matrix',
    cmd: 'node',
    args: ['round3_roles_api.mjs'],
    why: 'Potwierdza uprawnienia i separację dostępu dla ADMIN/FOREMAN/WORKER.',
  },
  {
    name: 'Web tabs smoke',
    cmd: 'node',
    args: ['run_tabs_chrome.mjs'],
    why: 'Regresja UI: logowanie i przejście przez główne zakładki + screeny.',
  },
  {
    name: 'Web role routing',
    cmd: 'node',
    args: ['round3_roles_webshots.mjs'],
    why: 'Sprawdza zachowanie UI dla różnych ról i redirecty przy braku uprawnień.',
  },
];

function runStep(step) {
  return new Promise((resolve) => {
    const child = spawn(step.cmd, step.args, { stdio: 'inherit', shell: false });
    child.on('close', (code) => resolve({ ...step, code: code ?? 1 }));
  });
}

const startedAt = new Date().toISOString();
const results = [];
for (const step of steps) {
  console.log(`\n=== START: ${step.name} ===`);
  const r = await runStep(step);
  results.push(r);
  console.log(`=== END: ${step.name} -> exit ${r.code} ===`);
  if (r.code !== 0) break;
}

const failed = results.find((r) => r.code !== 0);
console.log('\n=== PODSUMOWANIE AUTOMATÓW ===');
for (const r of results) {
  console.log(`- ${r.name}: ${r.code === 0 ? 'OK' : 'FAIL'} | ${r.why}`);
}
if (failed) {
  console.log(`\nPierwszy błąd: ${failed.name}`);
  process.exit(1);
}
console.log('\nWszystkie testy automatyczne zakończone sukcesem.');
console.log(`Start: ${startedAt}`);
