# Revamp / Modernization Plan
## Sombhabona Foundation — Sponsorship Management Dashboard

> Planning document only. No application code is changed by this document. All findings below were verified directly against the code on branch `main` (commit `a00cf00d`), not assumed from `PRODUCT_SPEC.md` alone.

---

## 1. Current-State Assessment

### 1.1 What's actually strong here (keep it)

- **The shared-DB, shared-JWT microservices pattern works and is well understood.** Every service (`backend`, `hr-backend`, `ict-backend`, `school-backend`, `project-backend`, `lead-backend`) connects to one Postgres instance and trusts the same JWT. This is documented, consistently applied, and the team (per `AGENT_SQUAD.md`) already has working cross-service patterns (`hrFetch()` for HR employee lookups) instead of inventing a new one per feature. This is not accidental complexity in the *data-access* sense — it's a deliberate, if unusual, trust model.
- **Idempotent `schema.sql` re-apply on boot** (`CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`) has been a workable substitute for real migrations at this team size and has not visibly caused data loss. It's a real limitation (section 2.4) but it is not "broken."
- **RBAC model** (`modules` × `roles` × `permissions` + per-user `user_module_access` overrides) is a legitimate, reasonably sophisticated design for a multi-department nonprofit tool, and it's enforced both server- and client-side.
- **Nginx as the single public ingress**, with every backend service internal-network-only, is a sound, minimal security boundary — worth preserving as-is.
- Docker deployment, while it has a sharp edge (section 2.6), is otherwise simple and reproducible: `docker compose up -d --build`.

### 1.2 Verified weaknesses (with evidence)

| # | Finding | Evidence |
|---|---|---|
| A | **Frontend ships one 2.43MB JS chunk.** No route-level code-splitting exists anywhere. | `dist/assets/index-CQjyB0rW.js` = 2,434,300 bytes after `npm run build`; `src/app/routes.tsx` statically imports all 14+ top-level route components (`Accounting.tsx` 2452 LOC, `ICT.tsx` 2592 LOC, `HR.tsx` 2121 LOC, `School.tsx` 1655 LOC, `LeadManagement.tsx` 1409 LOC, `Projects.tsx` 1363 LOC, `Admin.tsx` 1581 LOC, `AcknowledgmentLetter.tsx` 1270 LOC — none behind `React.lazy`/dynamic `import()`). A public visitor loading `/` or `/student/:id` downloads the entire authenticated dashboard's code (Accounting, HR, payroll, ICT inventory, etc.) for no reason. |
| B | **Two parallel accounting systems live in the same service and same DB.** | `backend/sql/schema.sql`: `accounting_ledger` (line 89, legacy flat credit/debit) coexists with the full double-entry system `acc_accounts`/`acc_vouchers`/`acc_voucher_lines`/`acc_ledger` (line 235+) and the simplified `acc_donations`/`acc_expenses` (line 320+). Frontend still ships `AddLedgerEntryPanel.tsx` (200 LOC) wired to the legacy `ledger.js` route, even though `Accounting.tsx`'s tabs no longer surface it as a primary flow. Three "systems of record" for money movement in one app is a real reconciliation/audit risk for a nonprofit that answers to donors and possibly auditors. |
| C | **6 microservices, ~5 of which duplicate the same ~150 lines of infrastructure code verbatim.** | `hr-backend/src/middleware/auth.js`, `school-backend/src/middleware/auth.js`, `project-backend/src/middleware/auth.js`, `lead-backend/src/middleware/auth.js` are **byte-identical** (43 lines, confirmed via `diff`). `ict-backend`'s is a 66-line variant of the same logic. Each service also has its own near-identical `db.js` pool-connection file and its own `package.json` with its own pinned `pg` version (`8.11.2` in four services, `8.13.1` in `backend`/`project-backend` — an unnecessary version-drift surface). This is duplicated-by-copy-paste, not duplicated-by-necessity: there is no evidence of independent scaling, independent deploy cadence, or independent team ownership that would justify the operational cost of 6 separately built/deployed/healthchecked Node processes for what is, per `hr_employees`/`sc_students`/`ict_students` row-count expectations, a single nonprofit's internal tool. |
| D | **No CI/CD pipeline exists.** | `find .github` returns nothing; no other CI config (`.gitlab-ci.yml`, `azure-pipelines.yml`, etc.) found in the repo root. `npm run build`, `node --check`, and container rebuilds are run manually per `AGENT_SQUAD.md`'s documented QA loop — meaning every regression-catching step depends on a human remembering to run it before/after a deploy. |
| E | **No real migrations system.** | Per `AGENT_SQUAD.md` (confirmed, not just asserted): "There is no separate migrations runner — schema changes go directly into `backend/sql/schema.sql`," re-applied idempotently via `ensureSchema()` on every boot. This means: no down-migrations, no per-change history, no way to know what schema version is running in production versus what's in git without a diff, and any destructive change (column rename/drop, type change) has no supported path — it would have to be hand-run against production Postgres out-of-band. |
| F | **Deployment has a known, sharp reliability footgun.** | Confirmed via `AGENT_SQUAD.md` and `docker-compose.yml` build context: every service's Dockerfile bakes source into the image at build time, so `docker compose restart <service>` silently serves stale code while looking like a successful deploy. Additionally nginx must be recreated (not just restarted) alongside backend changes or it holds stale upstream container IPs at the Docker DNS/connection level. This is exactly the kind of failure mode that produces "it works on my machine but prod is still broken" incidents with no automated signal. |
| G | **JWT_SECRET fallback values are inconsistent across services.** | `docker-compose.yml`: `backend`, `hr-backend`, `school-backend`, `lead-backend` default to `your-secret-key-change-in-production`; `ict-backend` and `project-backend` default to `your_jwt_secret_key_here`. In normal operation this is masked because `${JWT_SECRET}` is set in `.env`, but any environment (a fresh staging box, a contributor's local setup, a future CI job) that omits `JWT_SECRET` will split auth silently — tokens minted by one service become unverifiable by another, with no startup-time error, only confusing runtime 401s. |
| H | **Two unrelated "Project" concepts and no lead→admission FK** (carried over from `PRODUCT_SPEC.md`, verified against schema) — `acc_projects` (cost centers) vs `pm_projects` (task tracking), and `lead_leads` has no FK to `ict_students`/`ict_admissions`. Not urgent, but adds to the general "same word, different meaning across services" confusion this monorepo already has to manage carefully. |

### 1.3 What this adds up to

The app is **not badly designed for its era** — it's a working, actively-used MVP-turned-multi-module system that grew module-by-module (Accounting → HR → School → ICT → Projects → Leads) via literal copy-paste of the previous service as a template. The debt is almost entirely **operational/infrastructure debt** (bundle size, CI, migrations, deploy reliability, service-boilerplate duplication) rather than **domain-model debt** (the RBAC design, the double-entry accounting model, and the per-module table namespacing are all sound). The plan below is scoped accordingly: fix the operational debt with low-risk, incremental changes; touch the domain model only where two systems are already known to conflict (accounting).

---

## 2. Prioritized Revamp Roadmap

Phases are ordered by (pain observed today) ÷ (risk of the fix), not by "textbook maturity model" order. Each phase is independently shippable and independently revertible.

### Phase 0 — Safety net (do this before touching anything else)
**Why:** Every later phase (bundle splitting, service consolidation, migrations) becomes higher-risk without automated verification. Currently the only verification is the manual loop in `AGENT_SQUAD.md` (build, rebuild, `docker logs`, manual `psql` checks) — fine for a single careful operator, not fine as a foundation for structural changes.
**What:**
- Add a minimal CI workflow (GitHub Actions, since the repo is presumably hosted there) that on every PR: runs `npm run build` for the frontend, runs `node --check` across each backend service's route files (already the documented manual QA step — just automate it), and optionally spins up the `docker-compose` stack against a throwaway Postgres to smoke-test each service's `/api/health` endpoint (already implemented on 4 of 6 services — see gap below).
- Add `/api/health` to `backend` and `ict-backend` (currently only `project-backend`, `hr-backend`, `school-backend`, `lead-backend` have a healthcheck defined in `docker-compose.yml`) so CI and Docker healthchecks are uniform across all six services.
- Fix the `JWT_SECRET`/`INTERNAL_SECRET` fallback inconsistency (finding G) by removing the differing hardcoded defaults from `docker-compose.yml` and instead **failing fast at service boot** if `JWT_SECRET` is unset in a non-development `NODE_ENV`, rather than silently falling back to a guessable string. Cheap, high-value, security-adjacent.
**Effort:** Small (2-4 days). **Risk:** Very low — additive only, doesn't touch running behavior except the fail-fast check (which is the point).

### Phase 1 — Frontend bundle splitting
**Why:** Finding A is measured, not theoretical: a 2.43MB single chunk means a first-time visitor to the **public** donation-facing site (`/`, `/student/:id`) downloads the entire HR/Payroll/Accounting/ICT-inventory admin surface before seeing a student photo. This directly hurts the org's actual donor-acquisition funnel — the one part of the app that matters for revenue and that unauthenticated, possibly-slow-connection visitors touch.
**What:**
- Convert the 14 top-level route components in `src/app/routes.tsx` to `React.lazy()` + `<Suspense>`, keyed by route, exactly matching the existing route boundaries (no architectural redesign needed — the route table already cleanly maps to module boundaries).
- Split the **public** routes (`Home`, `StudentProfile`, `PublicICTAdmission`) into their own chunk group that never pulls in anything under `/dashboard/*`, since they're reachable without auth and should be optimized independently.
- Vendor-split large third-party deps already in `package.json` that are only used by 1-2 modules — `xlsx` (bulk upload only), `jspdf`/`html2canvas` (letters/receipts/PDF only), `@mui/material`+`@mui/icons-material` (check actual usage footprint; if it's only used in one or two components, evaluate replacing with the already-present Radix primitives instead of carrying two component libraries), `recharts` (dashboard only), `react-slick`/`embla-carousel-react` (confirm both are needed — carrying two carousel libraries is itself a smell worth flagging to frontend-developer as a follow-up, not fixing here).
- Set a Vite `build.chunkSizeWarningLimit` appropriate to the *new* expected chunk sizes once split, so the warning stays meaningful instead of being permanently ignored.
**Effort:** Small-medium (3-6 days) for the lazy-loading pass; the MUI/carousel dependency question is a separate, smaller follow-up ticket for frontend-developer. **Risk:** Low — `React.lazy` is additive and each route already renders independently behind `ProtectedRoute`; the main regression risk is Suspense fallback UX (needs a loading skeleton, not a blank screen) and needs to be checked against the html2canvas print-capture pattern (`AcknowledgmentLetter.tsx`) to confirm lazy-loaded components still mount their off-screen print nodes correctly before capture.

### Phase 2 — Deployment reliability
**Why:** Finding F is an active production incident risk with a known, named failure mode (`restart` instead of `--build`, stale nginx upstream IPs) that has apparently already bitten this project once (it's called out as "just-discovered" in the task brief). This is cheap to fix and prevents recurring 2am debugging sessions.
**What:**
- Add a single deploy script (`deploy.sh` or a `Makefile` target) that always runs `docker compose up -d --build` for changed services **and** always recreates `frontend`/`nginx` alongside any backend change, removing the human-memory dependency documented in `AGENT_SQUAD.md`.
- Wire this script into the Phase-0 CI pipeline as the actual deploy step (even if deploy itself stays manual-trigger for now — a documented, scripted, single command is the goal, not full auto-deploy).
- Add container restart-policy/health-check gating so `docker compose up -d --build` doesn't report "done" until each service's `/api/health` is actually green (this also closes the Phase-0 health-endpoint gap).
**Effort:** Small (1-2 days). **Risk:** Very low — purely tooling, no application code changes.

### Phase 3 — Migrations system
**Why:** Finding E means every schema change today is a live edit to a single growing `schema.sql` with no history, no rollback, and no supported path for destructive changes. This is the item most likely to eventually cause real data loss or an unrecoverable bad deploy, even though it hasn't yet.
**What:**
- Introduce a proper migrations tool (`node-pg-migrate` is a light, dependency-minimal fit given the existing `pg`-based stack — avoids pulling in a full ORM the team doesn't otherwise want) **per service**, since each service already owns its own schema namespace (`hr_*`, `sc_*`, etc.) and its own `sql/schema.sql` file.
- Migration strategy: **additive-only by default** (new tables/columns nullable or with defaults, per the existing `IF NOT EXISTS` convention) — codify this as a written rule, not just a convention. Destructive changes (drop column, rename, type change) require a two-step migration (add new → backfill → deploy code using new → later migration drops old), never a same-deploy destructive change, given this is live production data for an operating nonprofit.
- Convert the existing `schema.sql` files into an initial "baseline" migration per service (one-time, mechanical — diff against current production schema, not a redesign) so history starts now without requiring a database rebuild.
- Keep `ensureSchema()`'s idempotent boot-time check as a **safety net/assertion** (fail loudly if the migration-run schema doesn't match expectations) rather than removing it outright — cheap insurance during the transition.
**Effort:** Medium (1-2 weeks, mostly because it touches all 6 services' boot sequences and needs careful production-schema reconciliation before the baseline migration is written). **Risk:** Medium — this is the riskiest phase because it touches how every service starts up against live data. Mitigate by doing one service first (suggest `lead-backend` — smallest schema, lowest stakes) as a pilot, verifying the pattern in production for a week, then rolling to the rest.

### Phase 4 — Consolidate the two accounting systems
**Why:** Finding B is the one piece of genuine domain-model debt, and it's the highest-stakes module to get wrong (it's literally the money). Two/three parallel representations of financial transactions is a real audit and data-integrity risk for an org accountable to donors.
**What:**
- Confirm with the finance/accountant role (the actual users of `Accounting.tsx`) whether `accounting_ledger` (legacy) has any current-day usage or outstanding data that the `acc_*` system doesn't cover. `PRODUCT_SPEC.md` already suggests it's superseded-but-not-removed; verify against actual row counts/recent `updated_at` timestamps before assuming it's dead.
- If confirmed dead: migrate any historical `accounting_ledger` rows into `acc_ledger`/`acc_donations` as a one-time backfill (via the new Phase-3 migrations tooling), then remove the `ledger.js` route and `AddLedgerEntryPanel.tsx` component in a follow-up (implementation) ticket — **not part of this planning doc's scope to execute**, just to schedule.
- Separately, formalize the `acc_donations`/`acc_expenses` "Monthly Accounts" flow's relationship to the formal voucher/GL system in documentation (it already flows into vouchers per `PRODUCT_SPEC.md` — this needs to be written down as an explicit process diagram so it's not tribal knowledge), rather than treated as a third system.
**Effort:** Medium (investigation + backfill: 1 week; removal work is a separate ticket for backend-developer/frontend-developer once confirmed safe). **Risk:** Medium-high — this is real financial data; requires accountant sign-off before any deletion, and should ship well after Phase 3 so there's a proper migration/rollback path.

### Phase 5 — Right-size the microservice split (evaluate, don't rush)
**Why:** Finding C shows real duplication cost (5 copies of the same auth middleware, 6 copies of db-pool boilerplate, 6 separate Dockerfiles/healthchecks/CI matrix entries) without evidence of a corresponding benefit (no independent scaling need, no independent team ownership, no independent deploy cadence observed — everything deploys from one repo by one operator per `AGENT_SQUAD.md`).
**What (evaluate, in this order):**
1. **Extract shared boilerplate into a published/linked internal package first**, regardless of the consolidation question — a `@sombhabona/service-common` package (or even just a `shared/` directory copied at build time) providing the auth middleware, db pool setup, and health-check route. This alone eliminates most of finding C's actual pain (drift risk, copy-paste bugs) with zero deployment-topology risk and no service consolidation needed.
2. **After that**, separately evaluate whether `school-backend`, `hr-backend`, and `project-backend` — the three smallest, lowest-traffic services with the most identical boilerplate — should be merged into a single "ops-backend" process (keeping their table namespaces and route prefixes unchanged, just one fewer container/health check/deploy unit to manage), versus leaving them split. This is explicitly a judgment call to make **with the person operating the infrastructure**, not a default recommendation — the current split is not broken, only non-optimal, and merging has its own cost (bigger blast radius per deploy, one process to restart takes down three modules instead of one).
3. Do **not** touch `backend` (core: auth/students/donors/sponsorships/accounting) or `ict-backend`/`lead-backend` (tightly coupled to each other via the lead→admission flow, and `ict-backend` already has custom auth logic) as part of this evaluation — they're the most load-bearing and the most differentiated, so the cost/benefit of merging is worse than for the three boilerplate-identical services.
**Effort:** Step 1 (shared package): small-medium (3-5 days). Step 2 (merge evaluation + possible execution): medium, and explicitly gated on a decision, not scheduled work. **Risk:** Step 1 is low risk (pure refactor, same runtime topology). Step 2 is medium-high if executed (changes deployment topology, health-check/monitoring setup, and blast radius) — recommend treating as optional/deferred pending real evidence of duplication cost outweighing operational-independence value.

### Suggested sequencing summary

| Phase | Focus | Effort | Risk | Depends on |
|---|---|---|---|---|
| 0 | CI safety net + secret fail-fast | Small | Very low | — |
| 1 | Frontend bundle splitting | Small-medium | Low | Phase 0 (CI to catch regressions) |
| 2 | Deploy script / reliability | Small | Very low | Phase 0 |
| 3 | Migrations system (pilot on lead-backend, then roll out) | Medium | Medium | Phase 0, 2 |
| 4 | Accounting consolidation | Medium | Medium-high | Phase 3 |
| 5a | Extract shared service boilerplate | Small-medium | Low | Phase 0 |
| 5b | Evaluate/execute service merge (optional) | Medium | Medium-high | Phase 5a, explicit decision |

---

## 3. Non-Goals

Explicitly out of scope for this revamp, and should be actively resisted if proposed later:

- **No full rewrite, no framework change.** React + Vite + Express + Postgres is not the problem; the problems found are all operational (build config, CI, migrations, deploy scripting) or narrowly domain-specific (dual accounting systems), not architectural. This is a live tool with real donor/financial/HR/student data in active daily use — a big-bang rewrite is the highest-risk, lowest-value option available and is explicitly rejected.
- **No mandatory microservice-to-monolith collapse.** Phase 5 is an *evaluation*, not a directive. The current split has real (if partial) justification — module ownership boundaries map cleanly to table namespaces and RBAC modules — and should not be collapsed just because "6 services is a lot" without concrete evidence the duplication cost exceeds the isolation benefit.
- **No introduction of a heavy ORM or GraphQL layer.** The existing pattern (parameterized `pool.query`, per `AGENT_SQUAD.md`'s documented backend-developer conventions) works and is well understood by whoever maintains this; the migrations recommendation (Phase 3) deliberately picks a lightweight SQL-migration tool, not an ORM, to avoid forcing a rewrite of every route file.
- **No changes to the RBAC data model** (`modules`/`roles`/`permissions`/`user_module_access`). It's sound; the only flagged issue (dashboard module-permission vs. role-based analytics gating, from `PRODUCT_SPEC.md` §6) is a minor UX inconsistency, not a security or architecture problem, and is left for a normal feature ticket, not this revamp.
- **No removal of `accounting_ledger`/legacy data without accountant sign-off and a verified backfill.** Financial data is not something to clean up "because it looks dead" — Phase 4 is explicitly gated on confirmation before any deletion.
- **No auto-deploy / continuous deployment to production** as part of Phase 0-2. CI should build confidence and provide a single scripted deploy command; whether that command is triggered by a human or a pipeline is a separate decision for the org, not assumed here.
- **Not touching `Settings.tsx`** (the orphaned dead-code screen noted in `PRODUCT_SPEC.md`) — that's a small, independent frontend cleanup ticket, unrelated to this infrastructure-focused revamp, and shouldn't be bundled in to avoid scope creep.

---

## 4. Risks and Mitigations for the Migration Itself

| Risk | Mitigation |
|---|---|
| **Lazy-loading breaks the html2canvas/oklch print-capture pattern** (`AcknowledgmentLetter.tsx`, money receipts) if a component isn't fully mounted before `html2canvas()` fires. | QA-engineer verifies each PDF/print flow explicitly after Phase 1, using the existing `waitForImages()` guard pattern as the model — add an equivalent "wait for lazy chunk mounted" check if needed. Treat this as a required regression check, not optional. |
| **CI gives false confidence** if it only checks `npm run build`/`node --check` without exercising real request flows. | Scope Phase 0 CI honestly: it catches syntax/build breaks and container boot failures, not business-logic regressions. Don't market it as more than that; keep the manual `qa-engineer` psql-verification loop from `AGENT_SQUAD.md` as a required step for any feature touching money, RBAC, or auth, even after CI exists. |
| **Migrations pilot (Phase 3) on `lead-backend` diverges from production schema** if the initial baseline migration is generated against a stale local schema rather than actual production state. | Generate the baseline migration by introspecting the **production** database schema directly (`pg_dump --schema-only` against the live `sombhabona-db`), not by trusting the repo's `schema.sql` file, since the two may have already drifted (that drift is itself worth checking before Phase 3 starts). |
| **Accounting consolidation (Phase 4) silently drops real historical transactions** if `accounting_ledger` has any un-migrated rows not reflected in `acc_*`. | Require an explicit row-count and date-range comparison between `accounting_ledger` and `acc_ledger`/`acc_donations` before any deletion; require accountant-role user sign-off; keep the legacy table (renamed/archived, not dropped) for at least one full fiscal year after cutover as a rollback path. |
| **Shared-boilerplate extraction (Phase 5a) introduces a single point of failure** — a bug in the shared auth middleware now breaks all consuming services at once instead of one. | Version the shared package explicitly (even if distributed as a local workspace package rather than published), require each service to pin and bump deliberately, and roll out to one service first (same pilot approach as Phase 3) before applying to all five. |
| **Deploy script (Phase 2) masks a real failure as success** if it doesn't correctly propagate non-zero exit codes from `docker compose up -d --build` or the health-check poll. | Explicit exit-code checks and a hard timeout on the health-check poll, with the script failing loudly (non-zero exit, clear message naming which service didn't come up) rather than silently continuing — this is exactly the class of bug the script exists to prevent, so it must not reintroduce it at one level up. |
| **General: any of the above phases are executed by an agent/session that doesn't have the full production context** (row counts, actual traffic patterns, who the accountant/HR/school users are). | Every phase above that touches live data (Phase 3, 4) or changes deploy topology (Phase 2, 5b) should go through the existing `AGENT_SQUAD.md` flow — product-manager/system-architect scoping, explicit user confirmation via `AskUserQuestion`, then backend/devops implementation, then qa-engineer's documented psql-verification loop — exactly as this project already does for feature work. This revamp is infrastructure work, not exempt from that discipline. |

---

## Appendix: Evidence Trail

- Bundle size: `dist/assets/index-CQjyB0rW.js` = 2,434,300 bytes (measured via `npm run build`, Sep 10 2026).
- No code-splitting: `src/app/routes.tsx` — all route components statically imported; no `React.lazy`/`import()` found.
- Component sizes (LOC via `wc -l src/app/components/*.tsx`): `ICT.tsx` 2592, `Accounting.tsx` 2452, `HR.tsx` 2121, `School.tsx` 1655, `Admin.tsx` 1581, `LeadManagement.tsx` 1409, `Projects.tsx` 1363, `AcknowledgmentLetter.tsx` 1270.
- No CI: `.github` directory does not exist in the repo.
- Duplicated auth middleware: `hr-backend/src/middleware/auth.js`, `school-backend/src/middleware/auth.js`, `project-backend/src/middleware/auth.js`, `lead-backend/src/middleware/auth.js` are byte-identical (verified via `diff`), 43 lines each; `ict-backend/src/middleware/auth.js` is a 66-line variant.
- Duplicated db connection setup: `backend/src/db.js`, `hr-backend/src/db.js`, `ict-backend/src/db.js`, `lead-backend/src/db.js`, `project-backend/src/db.js`, `school-backend/src/db.js` all exist as separate, service-owned files; `pg` driver version drift confirmed between services (`8.11.2` vs `8.13.1`).
- Dual accounting systems: `backend/sql/schema.sql` — `accounting_ledger` (line 89) vs `acc_accounts`/`acc_vouchers`/`acc_ledger` (line 235+) vs `acc_donations`/`acc_expenses` (line 320+); legacy route/component (`ledger.js`, `AddLedgerEntryPanel.tsx`) confirmed still present and reachable.
- JWT_SECRET fallback inconsistency: `docker-compose.yml` — `backend`/`hr-backend`/`school-backend`/`lead-backend` default `your-secret-key-change-in-production`; `ict-backend`/`project-backend` default `your_jwt_secret_key_here`.
- Health checks: `docker-compose.yml` — `project-backend`, `hr-backend`, `school-backend`, `lead-backend` have `healthcheck:` blocks hitting `/api/health`; `backend` and `ict-backend` and `frontend` do not.
- Deploy footgun: documented and confirmed in `AGENT_SQUAD.md` §"Orchestration" and §devops-engineer — source/SQL baked into images at build time, requires `--build` not `restart`; nginx must be recreated alongside backend to avoid stale upstream IPs.
- No migrations runner: confirmed in `AGENT_SQUAD.md` §"Schema" — schema changes go directly into `backend/sql/schema.sql`, applied idempotently via `ensureSchema()` on boot.
