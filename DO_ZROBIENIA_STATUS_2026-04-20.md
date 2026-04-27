# Status listy „DO ZROBIENIA” (2026-04-20)

## Zrobione teraz

- [x] Skaner na mobilce (wejście kodu + kamera)  
- [x] Łączenie pracy picking + move (filtr łączony w zadaniach mobilnych)  
- [x] Odświeżanie automatyczne (web: hook polling, mobilka: timery 2-3 min)  
- [x] Trzymanie sesji mobilnej po restarcie aplikacji  
- [x] Aktualizacja po odpowiedzi API (odświeżanie list po akcjach)  
- [x] Zapisywanie odbiorcy i podpowiedzi (historia odbiorców w RW)  
- [x] Standaryzacja kodów lokalizacji (normalizacja + walidacja)  
- [x] Kody lokalizacji i walidacja formatu po stronie mobilki  
- [x] Ilości do zablokowania / rezerwacja (operacja BLOCKED z ilością na mobilce)

## Częściowo / do dalszego wdrożenia

- [~] Tłumaczenie i18n (wymaga pełnej warstwy słowników web+mobile)
- [~] Wymiana czcionki (web ma Inter; mobilka wymaga decyzji brandingowej i spójnej implementacji)
- [~] Dystrybucja iOS przez TestFlight (instrukcja gotowa, wymagany pipeline release)
- [~] Wysyłka maili must-have (wymaga finalnego przepływu backend + SMTP/provider)

## Następne kroki (priorytet)

1. i18n (PL/EN) + przełącznik języka.
2. Pipeline TestFlight i checklista release.
3. Moduł powiadomień e-mail (eventy: nowe konto, krytyczne błędy, ważne statusy dokumentów).
4. Testy UAT z użytkownikiem końcowym na realnych przypadkach magazynowych.
