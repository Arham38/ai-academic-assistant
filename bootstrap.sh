#!/usr/bin/env bash
# ==============================================================================
# AI Academic Assistant - Developer Environment Bootstrapping Script (POSIX)
# Ensures runtime locks, installs dependencies, sets up git hooks.
# ==============================================================================

set -euo pipefail

echo "==> [1/6] Verifying Node.js Runtime..."
REQUIRED_NODE="20"
CURRENT_NODE=$(node -v 2>/dev/null || echo "none")

if [[ "$CURRENT_NODE" == "none" ]]; then
  echo "[-] Node.js is not installed. Please install Node v20 LTS using nvm or fnm:"
  echo "    nvm install"
  echo "    nvm use"
  exit 1
fi

echo "[+] Detected Node.js: $CURRENT_NODE"

echo "==> [2/6] Verifying Python Runtime..."
REQUIRED_PYTHON="3.11"
CURRENT_PYTHON=$(python3 --version 2>/dev/null || echo "none")

if [[ "$CURRENT_PYTHON" == "none" ]]; then
  echo "[-] Python is not installed. Please install Python 3.11 using pyenv:"
  echo "    pyenv install 3.11.8"
  echo "    pyenv local 3.11.8"
  exit 1
fi

echo "[+] Detected Python: $CURRENT_PYTHON"

echo "==> [3/6] Setting up Node.js Dependencies & Husky..."
npm install

echo "==> [4/6] Setting up Python Tooling (Poetry & Linters)..."
if command -v poetry &>/dev/null; then
  echo "[+] Using Poetry for virtual environment setup..."
  poetry config virtualenvs.in-project true
  poetry install
else
  echo "[!] Poetry not detected on PATH. Installing development linters via pip..."
  python3 -m pip install --upgrade pip
  python3 -m pip install ruff black mypy pytest httpx
fi

echo "==> [5/6] Initializing Git Hooks..."
npx husky install
chmod +x .husky/pre-commit 2>/dev/null || true

echo "==> [6/6] Verifying Environment Configuration..."
if [ ! -f ".env" ]; then
  echo "[*] Creating .env from .env.example..."
  cp .env.example .env
fi

echo "==> Environment bootstrapping complete! Ready for development."
