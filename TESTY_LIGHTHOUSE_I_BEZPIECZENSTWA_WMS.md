# Testy Google DevTools (Lighthouse) i darmowe testy bezpieczeństwa

Instrukcja audytu wydajności (Lighthouse) oraz skanerów bezpieczeństwa online.

---

## CZĘŚĆ 1. Testy w Google DevTools (Lighthouse)

**Co to jest:** Lighthouse to wbudowane w przeglądarkę Chrome (zakładka DevTools → *Lighthouse*) narzędzie Google, które ocenia stronę w 4 kategoriach:
- **Performance** (wydajność ładowania),
- **Accessibility** (dostępność dla osób z niepełnosprawnościami),
- **Best Practices** (dobre praktyki, m.in. bezpieczeństwo front-endu),
- **SEO**.

### Wariant A — ręcznie w przeglądarce
1. Uruchom frontend: `cd frontend && npm run dev` (działa na `http://localhost:5173`).
2. Otwórz stronę w **Chrome** → klawisz **F12** (DevTools).
3. Zakładka **Lighthouse** → zaznacz wszystkie kategorie → **Analyze page load**.
4. Po chwili dostajesz wynik 0–100 w każdej kategorii + listę rekomendacji.
5. Zrób zrzut ekranu wyników do dokumentacji/prezentacji.

> Wskazówka: testuj też widok mobilny (Lighthouse ma przełącznik *Device: Mobile*) — to dobrze wygląda przy temacie aplikacji magazynowej używanej na telefonie.

### Wariant B — automatycznie z linii poleceń (powtarzalny dowód)
Skrypt w repo generuje raport HTML:
```bash
# najpierw uruchom frontend (npm run dev), potem:
./scripts/lighthouse_audit.sh http://localhost:5173
# wynik: wyniki_lighthouse/raport_<data>.html
```

### Co odpowiedzieć, gdy wynik nie jest 100/100
> „Lighthouse pokazuje obszary do poprawy — część dotyczy dev-buildu (np. brak minifikacji w trybie deweloperskim). W buildzie produkcyjnym (`npm run build`, serwowanym przez nginx z cache i gzip) wyniki są wyraźnie wyższe. Rekomendacje dot. dostępności wdrożyliśmy tam, gdzie miało to sens dla aplikacji wewnętrznej.”

> **Ważne:** audyt rób na **buildzie produkcyjnym** (`npm run build && npm run preview`), nie tylko na dev-serwerze — dev-build jest celowo niezoptymalizowany.

---

## CZĘŚĆ 2. Darmowe internetowe testy bezpieczeństwa

Poniższe narzędzia są **darmowe** i pokażą konkretny wynik/ocenę, którą można wstawić do dokumentacji. Część działa tylko na **publicznym adresie (HTTPS)** — czyli po wdrożeniu z `WDROZENIE_CHMURA_WMS.md`. Część zadziała też lokalnie.

### Działają na publicznej domenie (po wdrożeniu)
| Narzędzie | Adres | Co sprawdza | Oczekiwany efekt po naszych zmianach |
|---|---|---|---|
| **securityheaders.com** | https://securityheaders.com | nagłówki bezpieczeństwa HTTP | wysoka ocena (A/A+) dzięki dodanym nagłówkom (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) |
| **Mozilla Observatory** | https://developer.mozilla.org/en-US/observatory | kompleksowy audyt konfiguracji HTTP/TLS | ocena podnosi się po włączeniu HTTPS + nagłówków |
| **SSL Labs (Qualys)** | https://www.ssllabs.com/ssltest/ | jakość konfiguracji TLS/HTTPS | ocena A przy certyfikacie z Caddy/Let's Encrypt |
| **Hardenize** | https://www.hardenize.com | DNS, TLS, nagłówki, e-mail | przegląd całościowy |

### Działają lokalnie (bez publicznego adresu) — narzędzia do uruchomienia u siebie
| Narzędzie | Jak uruchomić | Co sprawdza |
|---|---|---|
| **OWASP ZAP** (darmowy skaner podatności) | pobierz z zaproxy.org → *Automated Scan* na `http://localhost:5173` / `http://localhost:8000` | XSS, nagłówki, ujawnianie informacji, typowe podatności web |
| **Nikto** | `docker run --rm sullo/nikto -h http://host.docker.internal:8000` | konfiguracja serwera, znane problemy |
| **testssl.sh** | `docker run --rm drwetter/testssl.sh https://twoja-domena` | analiza TLS z linii poleceń |
| **npm audit** | `cd frontend && npm audit` | podatności w zależnościach frontu |
| **pip-audit** | `pip install pip-audit && pip-audit -r backend/requirements.txt` | podatności w zależnościach backendu |

### Zalecana ścieżka weryfikacji
1. Wdróż na VPS wg `WDROZENIE_CHMURA_WMS.md` (lub poproś o jednorazowy test).
2. Wklej adres do **securityheaders.com** i **SSL Labs** → zrób zrzuty z ocenami.
3. Lokalnie odpal **OWASP ZAP** *Automated Scan* i **npm audit / pip-audit** → zrzut podsumowania.
4. Wyniki + opis wdrożonych zabezpieczeń wstaw do dokumentacji.

---

## CZĘŚĆ 3. Co konkretnie wdrożyliśmy w kodzie (do pokazania jako dowód)

Po stronie **API (FastAPI)** — plik `backend/app/middleware/security.py` + `backend/app/main.py`:
- nagłówki: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`, opcjonalnie `Strict-Transport-Security`;
- `TrustedHostMiddleware` (kontrola nagłówka Host) w produkcji;
- opcjonalny **rate-limit** na IP (`RATE_LIMIT_PER_MINUTE`);
- ukrywanie szczegółów błędów 500 przy `DEBUG=false`.

Po stronie **frontendu (nginx)** — `frontend/nginx.conf`:
- pełny zestaw nagłówków bezpieczeństwa + CSP dopasowane do MUI/Vite;
- limit rozmiaru żądania, proxy `/api` (ten sam origin → brak CORS).

Wcześniej już w projekcie:
- hasła hashowane **bcrypt**, polityka haseł;
- **blokada konta** po N nieudanych próbach (anty-brute-force);
- **generyczne komunikaty** logowania (anty-enumeracja kont);
- **JWT** (krótki access + refresh) i **RBAC**;
- **audit log** operacji;
- ochrona przed **SQL Injection** dzięki ORM (parametryzacja).

### Szybki dowód działania nagłówków (lokalnie)
```bash
curl -I http://localhost:8000/api/health
# w odpowiedzi zobaczysz: x-content-type-options, x-frame-options,
# content-security-policy, referrer-policy, permissions-policy
```
