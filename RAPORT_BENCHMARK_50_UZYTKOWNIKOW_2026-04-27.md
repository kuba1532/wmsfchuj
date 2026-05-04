# Raport benchmarku wydajnosci WMS (50 uzytkownikow)

Data: 2026-04-27  
Srodowisko: lokalne (backend `http://127.0.0.1:8000`, MySQL lokalny)  
Narzędzie: `e2e_tests/benchmark_50_users.mjs`

## Zakres testu

- 50 rownoleglych uzytkownikow (virtual users)
- 3 rundy na uzytkownika
- 5 endpointow na runde:
  - `/tasks`
  - `/stock`
  - `/documents`
  - `/products`
  - `/locations`
- Planowana liczba requestow: 750
- Timeout pojedynczego requestu: 30 s

## Wynik ogolny

- Czas trwania testu: **68.05 s**
- Requests wykonane: **750**
- Bledy: **750**
- Error rate: **100%**
- Sredni czas odpowiedzi: **15993.60 ms**
- P50: **7782.25 ms**
- P95: **30033.74 ms**
- P99: **30039.34 ms**

## Wyniki per endpoint

- `tasks`: avg 16082.57 ms, p95 30033.71 ms, errors 100%
- `stock`: avg 16082.49 ms, p95 30033.72 ms, errors 100%
- `documents`: avg 16082.45 ms, p95 30033.74 ms, errors 100%
- `products`: avg 15934.31 ms, p95 30033.76 ms, errors 100%
- `locations`: avg 15786.17 ms, p95 30033.80 ms, errors 100%

## Ocena wzgledem wymagania N-05 (95% <= 2s przy 10 userach)

**NIE SPELNIONE**.

- Przy 50 userach backend lokalny wszedl w stan przeciazenia i requesty dobijaly do timeoutu.
- Po tescie serwer nadal nasluchiwal na porcie, ale odpowiadal niestabilnie (objaw przeciazenia zasobow / puli DB / pojedynczego workera).

## Wnioski techniczne

1. Aktualna konfiguracja lokalna nie jest gotowa na 50 rownoleglych uzytkownikow.
2. Zachowanie wskazuje na problem z wydajnoscia backend+DB pod duza konkurencja.
3. Do wiarygodnego testu akceptacyjnego N-05 trzeba uruchomic:
   - produkcyjny serwer ASGI (wiele workerow),
   - jawna konfiguracja puli polaczen SQLAlchemy/MySQL,
   - monitoring czasu zapytan DB i kolejek requestow.

## Rekomendacje nastepnego kroku

1. Dodac tuning DB pool (`pool_size`, `max_overflow`, `pool_timeout`, `pool_recycle`).
2. Przelaczyc uruchomienie backendu na wieloprocesowe (np. `gunicorn + uvicorn workers`).
3. Powtorzyc benchmarki progresywnie: 10 -> 20 -> 30 -> 50 userow.
4. Zbierac metryki osobno:
   - czasy endpointow API,
   - czasy zapytan SQL,
   - CPU/RAM backendu i MySQL.

## Artefakty

- Skrypt: `e2e_tests/benchmark_50_users.mjs`
- Surowy wynik JSON: `e2e_tests/benchmark_50_users_result.json`
