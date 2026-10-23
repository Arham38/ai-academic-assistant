# ==============================================================================
# AI Academic Assistant - Developer Environment Bootstrapping Script (PowerShell)
# ==============================================================================

Write-Host "==> [1/6] Verifying Node.js Runtime..." -ForegroundColor Cyan
try {
    $nodeVersion = node -v
    Write-Host "[+] Detected Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Error "[-] Node.js is not found on PATH. Please install Node.js v20 LTS."
    exit 1
}

Write-Host "==> [2/6] Verifying Python Runtime..." -ForegroundColor Cyan
try {
    $pyVersion = python --version
    Write-Host "[+] Detected Python: $pyVersion" -ForegroundColor Green
} catch {
    Write-Error "[-] Python is not found on PATH. Please install Python 3.11+."
    exit 1
}

Write-Host "==> [3/6] Setting up Node.js Dependencies & Husky..." -ForegroundColor Cyan
npm install

Write-Host "==> [4/6] Setting up Python Tooling & Linters..." -ForegroundColor Cyan
if (Get-Command poetry -ErrorAction SilentlyContinue) {
    Write-Host "[+] Configuring Poetry virtual environment in-project..." -ForegroundColor Green
    poetry config virtualenvs.in-project true
    poetry install
} else {
    Write-Host "[!] Poetry command not on PATH. Installing Ruff, Black, and Mypy directly..." -ForegroundColor Yellow
    python -m pip install ruff black mypy pytest httpx
}

Write-Host "==> [5/6] Initializing Git Hooks..." -ForegroundColor Cyan
npx husky install

Write-Host "==> [6/6] Verifying Environment Configuration..." -ForegroundColor Cyan
if (-not (Test-Path ".env")) {
    Write-Host "[*] Creating .env from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
}

Write-Host "==> Environment bootstrapping complete! Ready for development." -ForegroundColor Green
