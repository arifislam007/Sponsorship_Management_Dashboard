# Agent Squad — Sponsorship Management Dashboard

This project (Sombhabona Foundation Sponsorship Management Dashboard) uses a fixed squad of
10 global Claude Code agents (installed in `~/.claude/agents/`). This doc maps each agent to
**when to invoke it** and **how it should behave in this specific codebase**, so work stays
consistent across sessions.

## App shape (context every agent should know)

- Frontend: React + TypeScript + Vite + Tailwind v4 (`src/app/`), talks to services via nginx at `/api/*`.
- Backend: main `backend/` (Express, port 8000, `/api/v1`) + per-module microservices:
  `hr-backend` (5004), `school-backend` (5005), `ict-backend` (5002), `project-backend` (5003),
  `lead-backend` (5006).
- Orchestration: root `docker-compose.yml`; images bake in source/SQL at build time — code or
  `sql/` changes require `docker compose up -d --build <service>`, not just a restart.
- Schema: main backend's `ensureSchema()` re-applies `schema.sql` on every boot idempotently
  (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`). There is no
  separate migrations runner — schema changes go directly into `backend/sql/schema.sql`.
- Auth/RBAC: JWT `{userId, username}` (`req.user.userId`); `modules` + `roles` + `permissions`
  (role_id+module_id) + `user_roles` + `user_module_access`. A new functional area needs a
  `modules` row **and** a matching `roles` row with permission grants, or it won't be
  selectable in the admin panel.
- `.env` is intentionally untracked — never re-add it to git.

---

## 1. master-orchestrator

**Use for:** kicking off a brand-new feature or module end-to-end (e.g. "build a Volunteer
Management module") when the work should flow through product → architecture → frontend/backend →
QA → security → devops without you manually sequencing each agent.

**In this repo:** treat each functional module (HR, School, Lead Management, Accounting, ICT,
Project) as the unit of work. The orchestrator should enforce the same phase gate this project
has used organically so far: confirm scope/plan with the user first (this codebase's owner
consistently wants a plan before execution), then implement, then verify with docker
rebuild + psql checks before declaring done.

## 2. product-manager

**Use for:** turning a vague ask ("we need a receipts feature", "add a lead pipeline") into a
scoped requirement — what data model, what UI surface, what's explicitly out of scope.

**In this repo:** this project's owner scopes tightly and iteratively (e.g. Money Receipt was
explicitly redirected from "standalone feature" to "Accounting tab linked to Sponsorships,
document-only — no ledger side effects"). Use `AskUserQuestion` for exactly these kinds of
scope forks before backend/frontend work starts, mirroring that pattern.

## 3. system-architect

**Use for:** schema design and cross-service data flow decisions — e.g. new tables, new
microservice routes, or reusing an existing cross-service lookup pattern.

**In this repo, prefer existing patterns over inventing new ones:**
- Cross-service HR employee lookup (`hrFetch<T>()` hitting `/api/hr<path>` with the stored
  `authToken`) — already used for School's Class Teacher, Lead Management's Assigned To, and
  Accounting's Money Receipt Received By. Reuse it for any new "pick an HR employee" field.
- New tables go in `backend/sql/schema.sql` as idempotent `CREATE TABLE IF NOT EXISTS` +
  `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for any later column additions.
- New routes are mounted with `authMiddleware`, `moduleAccessMiddleware('<Module>')`, and
  `auditMiddleware('<Module>')` in `backend/src/server.js`, matching the module they belong to.

## 4. frontend-developer

**Use for:** building UI — new tabs/pages, forms, PDF-generating documents.

**Known gotcha in this codebase:** `html2canvas@1.4.1` cannot parse `oklch()`, which Tailwind v4
emits for most utility classes. Any DOM node captured for PDF/print must use **plain inline hex
styles**, not Tailwind classes — see the `#money-receipt-print-root` / `AcknowledgmentLetter.tsx`
pattern (a separate off-screen `position:absolute; left:-9999px` node, not `display:none`, so it
stays capturable). Always add a `waitForImages()` guard before `html2canvas()` when the target
contains `<img>` elements (signatures, logos).

## 5. backend-developer

**Use for:** implementing Express routes/services.

**In this repo:** follow the existing router shape (see `backend/src/routes/receipts.js` /
`acknowledgments.js`) — sequential human-readable ID generator (e.g. `MR-YYYYMM-NNNN`), simple
parameterized `pool.query` inserts, `req.user?.userId` (not `.id` — that's a known latent bug
elsewhere, don't propagate it) for `created_by`. New tables that store PDFs use a `BYTEA
pdf_data` column with a `GET /:id/pdf` streaming endpoint.

## 6. code-simplifier

**Use for:** cleanup passes after a feature lands — trimming dead state, redundant conditionals,
duplicate helpers (e.g. if `hrFetch`/`fetchFinanceEmployees`-style helpers get copy-pasted into a
4th component, this is the agent to consolidate them into a shared module instead).

## 7. code-reviewer

**Use for:** reviewing diffs before considering a feature "done" — especially anything touching
auth (`req.user.userId` correctness), RBAC (`permissions` upsert vs. plain `UPDATE` — this
project has hit that exact bug twice), and SQL parameterization.

## 8. qa-engineer

**Use for:** verifying a feature actually works, not just that it builds. This project's
established verification loop:
1. `node --check <file>.js` for quick backend syntax checks.
2. `npm run build` for the frontend.
3. `docker compose up -d --build <service>` (rebuild, not just restart — images bake in source).
4. `docker logs <container> --tail N` for a clean boot.
5. `MSYS_NO_PATHCONV=1 docker exec sombhabona-db psql -U sombhabona_user -d sombhabona -c "..."`
   to confirm schema/data state directly (the `MSYS_NO_PATHCONV=1` prefix is required in Git
   Bash or `/app/...`-style paths get mangled).

## 9. security-engineer

**Use for:** anything touching credentials, RBAC, or public-facing data exposure — e.g. the
student-phone-privacy fix, and the `GOOGLE_SERVICE_ACCOUNT_JSON` git-secret-leak remediation
(`git rm --cached .env` + amend, since `.env` must never be tracked again). Also the right agent
to double check new `moduleAccessMiddleware`/`permissions` wiring doesn't silently no-op the way
the old plain-`UPDATE` permissions bug did.

## 10. devops-engineer

**Use for:** docker-compose/nginx changes, and the rebuild-and-verify cycle itself. Remember:
this stack has no separate migration runner, so "deploy a schema change" always means
`schema.sql` edit → `docker compose up -d --build backend` (or the relevant microservice) →
`docker logs` sanity check.

---

## Suggested flow for a new feature in this app

1. **product-manager** — scope it, confirm with the user via `AskUserQuestion` if there's a fork.
2. **system-architect** — table(s) in `schema.sql`, route shape, reuse existing cross-service
   lookup patterns where applicable.
3. **backend-developer** → **frontend-developer** — implement, watching for the html2canvas/oklch
   trap on anything PDF/print-related.
4. **code-reviewer** — check auth property usage, permissions upsert vs update, SQL params.
5. **qa-engineer** — build, rebuild containers, verify via logs + psql.
6. **security-engineer** — spot-check RBAC/module-access wiring and any credential handling.
7. **devops-engineer** — confirm the deploy cycle is clean end-to-end.
8. **code-simplifier** — optional cleanup pass once the feature has stabilized.

`master-orchestrator` can run this whole sequence for a big module; for a small, single-file fix,
invoke the relevant agent(s) directly instead of the full chain.

## Not part of this squad

`changelog-generator` doesn't fit the per-feature loop above — use it separately, after a batch
of merged changes, to generate release notes / a changelog entry from `git log`.
