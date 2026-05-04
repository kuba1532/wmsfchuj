# Raport benchmarku po tuningu (iteracja userow)

Data: 2026-04-27  
Srodowisko: lokalne (`127.0.0.1:8000`)  
Backend uruchomiony wieloprocesowo: `uvicorn ... --workers 4`

## Co zostalo poprawione

- zwiekszona i konfigurowalna pula polaczen DB:
  - `DB_POOL_SIZE=30`
  - `DB_MAX_OVERFLOW=60`
  - `DB_POOL_TIMEOUT_SECONDS=30`
  - `DB_POOL_RECYCLE_SECONDS=1800`
- uruchomienie backendu na 4 workerach Uvicorn.

## Kryterium akceptacji

- Error rate = 0%
- P95 <= 2000 ms

## Wyniki sweep (2 rundy na usera)

- 10 users: error 0%, p95 66.60 ms
- 15 users: error 0%, p95 199.17 ms
- 20 users: error 0%, p95 161.64 ms
- 25 users: error 0%, p95 321.24 ms
- 30 users: error 2.67%, p95 471.92 ms
- 35 users: error 6.29%, p95 455.73 ms
- 40 users: error 18.75%, p95 306.29 ms
- 45 users: error 24.44%, p95 307.08 ms
- 50 users: error 24.40%, p95 285.94 ms

## Wniosek

- Wymog „co najmniej 10 userow” jest spelniony z duzym zapasem.
- Maksymalny poziom spelniajacy kryterium (0% bledow i p95 <= 2s): **25 rownoleglych userow**.
- Powyzej 25 userow rosnie odsetek bledow mimo niskich czasow odpowiedzi dla requestow, ktore przeszly.

## Artefakty

- `e2e_tests/benchmark_users_10_tuned.json`
- `e2e_tests/benchmark_users_15_tuned.json`
- `e2e_tests/benchmark_users_20_tuned.json`
- `e2e_tests/benchmark_users_25_tuned.json`
- `e2e_tests/benchmark_users_30_tuned.json`
- `e2e_tests/benchmark_users_35_tuned.json`
- `e2e_tests/benchmark_users_40_tuned.json`
- `e2e_tests/benchmark_users_45_tuned.json`
- `e2e_tests/benchmark_users_50_tuned.json`
- `e2e_tests/benchmark_sweep_tuned_summary.json`
