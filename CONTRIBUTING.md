# Contributing & Developer Environment Setup Guide

Welcome to the **AI Academic Assistant** enterprise repository. This guide establishes the standardized procedures, runtime requirements, and automated quality gates required to contribute to the codebase.

---

## 1. Prerequisites & Runtime Locks

To avoid the _"works on my machine"_ problem, runtime versions are pinned at the root of the repository:

| Runtime / Tool             | Required Version         | Configuration File                     | Management Tool                                                                                    |
| :------------------------- | :----------------------- | :------------------------------------- | :------------------------------------------------------------------------------------------------- |
| **Node.js**                | `v20.x LTS` (>= 20.11.0) | [`.nvmrc`](./.nvmrc)                   | [`nvm`](https://github.com/nvm-sh/nvm) or [`fnm`](https://github.com/Schniz/fnm)                   |
| **Python**                 | `3.11.x` (>= 3.11.8)     | [`.python-version`](./.python-version) | [`pyenv`](https://github.com/pyenv/pyenv) or [`pyenv-win`](https://github.com/pyenv-win/pyenv-win) |
| **Node Package Manager**   | `npm` (>= 10.0.0)        | [`package.json`](./package.json)       | Bundled with Node LTS                                                                              |
| **Python Package Manager** | `Poetry` (>= 1.8.0)      | [`pyproject.toml`](./pyproject.toml)   | [`poetry`](https://python-poetry.org/)                                                             |
| **Container Engine**       | Docker Compose v2.24+    | -                                      | Docker Desktop / Colima                                                                            |

---

## 2. Recommended: One-Command Docker Bootstrapping

The fastest way to launch the complete enterprise ecosystem is using Docker Compose:

```bash
# 1. Copy the environment configuration
cp .env.example .env

# 2. Start the full stack with live hot-reloading
make up
# or: docker compose up -d

# 3. View running services
make ps
```

- **Frontend Dashboard**: `http://localhost:5173`
- **Express API Gateway**: `http://localhost:5000` (Health: `http://localhost:5000/api/v1/health`)
- **FastAPI AI Microservice**: `http://localhost:8000` (Docs: `http://localhost:8000/docs`)
- **MongoDB**: `localhost:27017`

---

## 3. Alternative: Local Native Bootstrapping

We provide automated bootstrapping scripts that verify runtimes, install dependencies, configure Git hooks, and prepare your `.env` file:

### On macOS / Linux / WSL2:

```bash
git clone https://github.com/Arham38/ai-academic-assistant.git
cd ai-academic-assistant
chmod +x bootstrap.sh
./bootstrap.sh
```

### On Windows (PowerShell):

```powershell
git clone https://github.com/Arham38/ai-academic-assistant.git
cd ai-academic-assistant
.\bootstrap.ps1
```

---

## 3. Manual Step-by-Step Environment Setup

If you prefer to configure your environment manually:

### Step 1: Enforce Node.js Runtime & Install JS/TS Dependencies

```bash
# If using NVM:
nvm use || nvm install $(cat .nvmrc)

# Install root developer dependencies and Git hooks
npm install
```

### Step 2: Enforce Python Runtime & Install AI Tooling

```bash
# If using pyenv:
pyenv install -s $(cat .python-version)
pyenv local $(cat .python-version)

# Configure Poetry to store virtual environments locally inside .venv
poetry config virtualenvs.in-project true
poetry install
```

### Step 3: Configure Environment Variables

```bash
cp .env.example .env
# Edit .env with your local credentials and secrets
```

---

## 4. Code Quality & Quality Gates

The repository strictly enforces a **Zero-Warning Policy**. Warnings are treated as blocking errors during pre-commit checks and CI/CD pipelines.

### Available Quality Scripts

| Command                | Description                                          | Tool           |
| :--------------------- | :--------------------------------------------------- | :------------- |
| `npm run lint:ts`      | Lints TypeScript and JavaScript files                | ESLint         |
| `npm run lint:ts:fix`  | Automatically fixes ESLint infractions               | ESLint         |
| `npm run lint:py`      | Ultra-fast Python linting (Flake8/isort replacement) | Ruff           |
| `npm run lint:py:fix`  | Automatically fixes Python imports and lint issues   | Ruff           |
| `npm run lint`         | Runs both TypeScript and Python linters              | ESLint + Ruff  |
| `npm run format:check` | Verifies formatting across JS, TS, JSON, and MD      | Prettier       |
| `npm run format`       | Formats all supported files in-place                 | Prettier       |
| `npm run format:py`    | Formats Python files                                 | Ruff Formatter |
| `npm run typecheck:ts` | Type-checks TypeScript without emitting JavaScript   | `tsc --noEmit` |
| `npm run typecheck:py` | Strict static type analysis for Python/LangGraph     | Mypy           |
| `npm run check:all`    | Runs linters, format checks, and static type checks  | Full Pipeline  |

---

## 5. Git Pre-Commit Hooks (Husky + lint-staged)

Git hooks are managed automatically via [Husky](./.husky) and [lint-staged](./.lintstagedrc.json).

When executing `git commit`:

1. Staged JavaScript/TypeScript files are validated with `eslint --max-warnings 0` and formatted with `prettier`.
2. Staged Python files are checked and formatted with `ruff check --fix` and `ruff format`.
3. Staged markdown, JSON, and YAML files are formatted with `prettier`.
4. If any rule is violated or an unused variable is detected, the commit is aborted.

To manually re-initialize hooks if needed:

```bash
npx husky install
```

---

## 6. IDE Setup & Recommended VS Code Settings

For the best developer experience, use **Visual Studio Code** with our pre-configured workspace settings:

1. Open the repository root in VS Code:
   ```bash
   code .
   ```
2. When prompted, click **"Install All"** to install recommended extensions ([`.vscode/extensions.json`](./.vscode/extensions.json)):
   - **ESLint** (`dbaeumer.vscode-eslint`)
   - **Prettier** (`esbenp.prettier-vscode`)
   - **Ruff** (`charliermarsh.ruff`)
   - **Mypy Type Checker** (`matangover.mypy`)
   - **EditorConfig** (`editorconfig.editorconfig`)
   - **Docker** (`ms-azuretools.vscode-docker`)
   - **PlantUML** (`jebbs.plantuml`)

3. **Python Interpreter Selection**:
   Press `Ctrl+Shift+P` (or `Cmd+Shift+P`), select **Python: Select Interpreter**, and point to the virtual environment created by Poetry:
   - Windows: `./.venv/Scripts/python.exe`
   - Linux/macOS: `./.venv/bin/python`

---

## 7. Common Pitfalls & How to Avoid Them

### 1. Global Tool Installation Anti-pattern

- **Mistake**: Installing tools like `tsc`, `eslint`, or `ruff` globally (`npm install -g ...` or `pip install ...` without a virtualenv).
- **Avoidance**: Always install tools as local devDependencies in `package.json` or development packages in `pyproject.toml`. Run them via `npx` or `poetry run`.

### 2. CRLF vs. LF Line Endings on Windows

- **Mistake**: Windows Git default settings converting LF to CRLF, breaking Linux Docker containers and shell scripts.
- **Avoidance**: Our universal [`.editorconfig`](./.editorconfig) mandates `end_of_line = lf`. Configure Git globally to avoid auto-conversion:
  ```bash
  git config --global core.autocrlf false
  ```

### 3. Committing Sensitive Secrets

- **Mistake**: Committing `.env` containing production JWT keys or database passwords.
- **Avoidance**: `.env` is explicitly ignored in [`.gitignore`](./.gitignore). Pre-commit hooks will block commits containing secret signatures.

---

## 8. Branching & Commit Conventions

Follow the **Conventional Commits** specification:

- `feat:` A new feature or capability.
- `fix:` A bug fix.
- `docs:` Documentation-only changes.
- `style:` Formatting changes that do not affect code logic.
- `refactor:` Code restructuring without functional alterations.
- `test:` Adding or updating unit/integration tests.
- `chore:` Tooling, dependency, or configuration updates.
