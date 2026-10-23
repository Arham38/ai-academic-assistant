## Description

<!-- Provide a concise summary of the change and explain "THE WHY" behind it. -->

Closes #<!-- Link to issue ticket here -->

### Type of Change

- [ ] `feat`: New feature or capability (Minor version bump)
- [ ] `fix`: Bug fix (Patch version bump)
- [ ] `refactor`: Code refactoring without behavioral alterations
- [ ] `perf`: Performance optimization
- [ ] `chore`: Tooling, dependency, or configuration updates
- [ ] `docs`: Documentation updates only

### Affected Monorepo Scope

- [ ] `frontend` (`apps/frontend`)
- [ ] `backend` (`apps/backend`)
- [ ] `ai-service` (`apps/ai-service`)
- [ ] `shared` (`packages/shared-types`, `packages/eslint-config`)
- [ ] `infra` (`infra/docker`, `infra/nginx`)
- [ ] `repo` / `docs`

---

## Architectural & Design Invariants Checklist

### Frontend (Feature-Sliced Design)

- [ ] Code is organized within `src/features/*` or generic `src/components/*` (no flat monolithic folders).
- [ ] Feature modules do not create circular dependency loops.
- [ ] New types are imported from `@academic-assistant/shared-types` if shared with backend.

### Backend (Clean Architecture)

- [ ] Domain Entities do not import from Infrastructure, Express, or Database layers.
- [ ] Application Use Cases communicate exclusively through repository interfaces.
- [ ] Express HTTP `req`/`res` objects are restricted entirely to `src/presentation/*`.
- [ ] Tenant boundaries are strictly enforced (`tenantId` checked in queries).

### AI & LangGraph Microservice

- [ ] `AcademicAgentState` dictionary transitions are typed and validated.
- [ ] Multi-agent loops respect the `max_iterations = 3` termination guard.
- [ ] Prompts and embeddings adhere to context-window budgets (500 tokens / chunk).
- [ ] PII data is sanitized before dispatching to external LLMs.

---

## Testing & Verification Plan

### Automated Checks

- [ ] `npm run lint` passes with 0 warnings.
- [ ] `npm run format:check` passes.
- [ ] `npm run typecheck:ts` and `npm run typecheck:py` pass.
- [ ] Unit / Integration tests pass.

### Manual Verification Steps

1. <!-- Step 1 -->
2. <!-- Step 2 -->
3. <!-- Step 3 -->

---

## Security & Quality Affirmation

- [ ] No secrets, private keys, or credentials (`.env`) are included in this PR.
- [ ] PR contains fewer than 400 lines of code (excluding generated lockfiles).
