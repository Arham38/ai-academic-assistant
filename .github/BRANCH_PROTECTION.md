# Repository Governance & Branch Protection Policy

This document details the branching model, commit conventions, and branch protection policies enforcing the Software Development Lifecycle (SDLC) for the **AI Academic Assistant** platform.

---

## 1. Branching Strategy: Trunk-Based Development

The repository strictly adheres to **Trunk-Based Development**:

```
[ main ] ───────────────────────────────────────────► (Production Trunk)
   │                           ▲
   │ 1. Create short-lived     │ 3. Automated PR checks + Review
   │    branch (< 48 hrs)      │    Squash & Merge
   ▼                           │
[ feat/ai-chunking ] ──────────┘
```

- **Primary Branch (`main`)**: The production-ready trunk. Direct pushes to `main` are strictly forbidden.
- **Short-Lived Feature Branches**: All work is executed on branches branched from `main` and merged back within **24 to 48 hours**.
- **Branch Naming Standard**:
  - `feat/<scope>-<short-description>` (e.g. `feat/ai-service-chunking-pipeline`)
  - `fix/<scope>-<short-description>` (e.g. `fix/backend-jwt-expiration`)
  - `refactor/<scope>-<short-description>`
  - `chore/<scope>-<short-description>`

---

## 2. Commit Message Standards (Conventional Commits)

Commit messages are validated locally via **Husky** and **Commitlint**. Invalid commits are automatically rejected.

### Format

```
<type>(<scope>): <short description in present tense>

[optional body explaining THE WHY]

[optional footer referencing issue #123]
```

### Approved Scopes (Monorepo Workspaces)

| Scope        | Description                             | Directory          |
| :----------- | :-------------------------------------- | :----------------- |
| `frontend`   | React Single Page Application           | `apps/frontend`    |
| `backend`    | Node.js Express Gateway & BFF           | `apps/backend`     |
| `ai-service` | Python FastAPI & LangGraph Microservice | `apps/ai-service`  |
| `shared`     | Shared TypeScript contracts & configs   | `packages/*`       |
| `infra`      | Docker, Nginx, deployment templates     | `infra/*`          |
| `repo`       | Tooling, root configs, git hooks        | Root configuration |
| `docs`       | Documentation & ADRs                    | `docs/*`           |

### Approved Types

- `feat`: A new feature (Minor version bump)
- `fix`: A bug fix (Patch version bump)
- `refactor`: Code restructuring without behavioral alterations
- `style`: Formatting changes
- `test`: Adding or updating test suites
- `chore`: Maintenance and configuration tasks
- `docs`: Documentation-only updates

---

## 3. Remote Branch Protection Configuration (GitHub Settings)

Repository administrators must verify that GitHub branch protection rules are configured under **Settings > Branches > Add branch protection rule**:

### Rule Target: `main`

1. **Require a pull request before merging**:
   - Check **Require approvals** (Minimum: `1`).
   - Check **Dismiss stale pull request approvals when new commits are pushed**.
   - Check **Require review from Code Owners** (if `CODEOWNERS` is configured).
2. **Require status checks to pass before merging**:
   - Check **Require branches to be up to date before merging**.
   - Required status checks: `lint`, `typecheck`, `test`.
3. **Require linear history**:
   - Enforce **Squash and merge** or **Rebase and merge** on the Pull Request merge button. Block traditional merge commits.
4. **Include administrators**:
   - Enforce these protections strictly on repository owners and admins.
5. **Do not allow bypassing the above settings**: Enabled.
