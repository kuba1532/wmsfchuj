$ErrorActionPreference = "Stop"

Write-Host "[WMS] Sprawdzam Docker..." -ForegroundColor Cyan
try {
    docker version --format "{{.Server.Version}}" | Out-Null
} catch {
    Write-Host "Docker Desktop nie jest uruchomiony. Uruchom Docker Desktop i poczekaj az ikona stanie sie zielona." -ForegroundColor Red
    exit 1
}

Write-Host "[WMS] Zatrzymuje stare kontenery (jesli istnieja)..." -ForegroundColor Cyan
docker compose down 2>$null | Out-Null

Write-Host "[WMS] Buduje obrazy i startuje serwisy..." -ForegroundColor Cyan
docker compose up --build -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "Blad podczas docker compose up. Pokazuje logi:" -ForegroundColor Red
    docker compose logs --tail=80
    exit 1
}

Write-Host "[WMS] Czekam az backend bedzie zdrowy (max 90 sekund)..." -ForegroundColor Cyan
$deadline = (Get-Date).AddSeconds(90)
$ok = $false
while ((Get-Date) -lt $deadline) {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8000/api/health" -TimeoutSec 3
        if ($response.status -eq "ok" -and $response.database -eq "ok") {
            $ok = $true
            break
        }
    } catch {}
    Start-Sleep -Seconds 3
}

if ($ok) {
    Write-Host ""
    Write-Host "Sukces. Backend dziala na http://localhost:8000" -ForegroundColor Green
    Write-Host "Swagger: http://localhost:8000/api/docs" -ForegroundColor Green
    Write-Host ""
    Write-Host "Login admina:" -ForegroundColor Yellow
    Write-Host "  - login: 00001 (kod 5-cyfrowy z tabeli users)" -ForegroundColor Yellow
    Write-Host "  - haslo: ADMIN_PASSWORD z backend/.env (domyslnie DevWmsAdmin2026)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Aby zatrzymac: docker compose down" -ForegroundColor Cyan
    Write-Host "Aby skasowac dane bazy: docker compose down -v" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "Backend nie odpowiedzial w 90 sekundach. Logi:" -ForegroundColor Red
    docker compose logs backend --tail=120
    Write-Host ""
    Write-Host "Logi bazy:" -ForegroundColor Red
    docker compose logs db --tail=40
    exit 1
}
