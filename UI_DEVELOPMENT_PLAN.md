# UI Development Plan
## Sombhabona Foundation — Sponsorship Management Dashboard

> Planning document only. No application code is changed by this document. Findings were verified directly against the code on branch `main` (commit `f6e581c7`) — grep/wc evidence is cited inline, not assumed from `PRODUCT_SPEC.md` alone. This plan complements `REVAMP_PLAN.md` Phase 1 (bundle splitting) rather than duplicating it: bundle splitting is referenced here as one input to componentization, but the substance below is UI/UX and componentization, not build config.

---

## 1. Current UI Audit

### 1.1 Design system / component consistency

**Finding 1 — A full shadcn/Radix component library exists and is 100% unused by every feature module.**
`src/app/components/ui/` contains 46 shadcn-style primitives (`button.tsx`, `input.tsx`, `dialog.tsx`, `table.tsx`, `card.tsx`, `select.tsx`, `tabs.tsx`, `alert-dialog.tsx`, etc.) plus `@radix-ui/react-*` packages are installed in `package.json`. A repo-wide search (`grep -rl "components/ui" src/app/components/*.tsx`) returns **zero** matches — no top-level module, no modal, nothing imports from `ui/`. Every single button in the app (`Accounting.tsx` 57, `HR.tsx` 56, `ICT.tsx` 42, `LeadManagement.tsx` 35, `Admin.tsx` 27, `School.tsx` 24, `Projects.tsx` 24, `AcknowledgmentLetter.tsx` 22, plus all the smaller modals) is a raw `<button className="...">` with hand-rolled Tailwind classes, not the `<Button>` component that already exists. This means:
- The component library ships in the bundle (Radix packages, `class-variance-authority`, `cmdk`, etc.) for zero functional benefit — pure dead weight on top of the Phase-1 bundle-splitting problem in `REVAMP_PLAN.md`.
- Every module reinvents button/input/modal/table markup independently, which is *why* the small style drift in Finding 2 exists — there's no single source of truth to drift from.
- This is not necessarily a mistake to "fix" wholesale (see Non-Goals) — it may simply be scaffolding left over from an initial Figma-to-code import (`src/app/components/figma/` exists, suggesting the ui/ folder was auto-generated, not hand-built for this app) that the team correctly bypassed once real requirements diverged from generic shadcn patterns. But it needs a decision, not silent accumulation.

**Finding 2 — Real but modest drift in hand-rolled patterns across modules, not wholesale inconsistency.**
- Primary action color is genuinely consistent: `#14856E` (brand green) appears 788 times across every module, `#0f6b5a` (hover state) 105 times — this is *not* a case of color chaos, it's disciplined manual consistency despite no shared `Button` component.
- Tab-bar pattern (the convention `AGENT_SQUAD.md` calls out in `Accounting.tsx`/`AcknowledgmentLetter.tsx`) is used consistently in `Accounting.tsx`, `ICT.tsx`, `LeadManagement.tsx`, `Admin.tsx` (`border-b-2 px-4 py-2.5/3 rounded-t-lg` family), but `HR.tsx`'s tab bar (line ~290) uses a visibly different, simpler variant (`px-4 py-2 border-b-2`, no `rounded-t-lg`, class built via a helper function instead of inline ternary like the others). Cosmetically minor, but it's evidence the pattern is copy-pasted per module (as `REVAMP_PLAN.md` §1.3 already noted for backend services) rather than shared, so drift compounds over time.
- Modal wrapper markup (`fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4`) is near-identical across `AddDonorModal.tsx`, `AddStudentModal.tsx`, `AddSponsorshipModal.tsx`, `ShareEmailModal.tsx` — good consistency, but each is a hand-copied `<div>`, not a shared `Modal` wrapper, so any future fix (e.g., focus trap, see 1.2) has to be applied N times by hand.

**Finding 3 — Two dead/orphaned UI files beyond the already-known `Settings.tsx`.**
- `Settings.tsx` (204 LOC): confirmed still fully orphaned — no import anywhere in `src/app/`; `routes.tsx` line 121 wires `/dashboard/settings` to render `Admin.tsx` directly. Matches `PRODUCT_SPEC.md`'s prior finding; status unchanged since.
- `EmptyState.tsx` (31 LOC): a generic "no data" component that is **never referenced anywhere** (`grep -rn "EmptyState" src/app/` outside its own file returns nothing) — despite the fact that most modules need exactly this (see Finding 5 below, empty states are handled ad hoc or omitted). This is a case of infrastructure being built once, then bypassed everywhere it was needed.

### 1.2 Accessibility

**Finding 4 — Near-total absence of ARIA semantics and modal accessibility, systemic, not isolated.**
- `aria-*` attributes appear only **10 times in the entire codebase**, all inside `ICT.tsx`. Every other module (`Accounting.tsx`, `HR.tsx`, `School.tsx`, `Admin.tsx`, `Projects.tsx`, `LeadManagement.tsx`, all the Add*Modal components) has zero `aria-` usage.
- No modal in the app uses `role="dialog"` or `aria-modal="true"` (`grep -rc 'role="dialog"'` = 0 everywhere). None trap focus (no `focus-trap` library, no manual trap logic found). Only one file (`Projects.tsx`) handles the Escape key at all — `AddDonorModal.tsx`, `AddStudentModal.tsx`, `AddSponsorshipModal.tsx`, `ShareEmailModal.tsx`, and every in-module modal in the four large files have no keyboard-dismiss path and no focus return to the triggering element on close.
- Two `<img>` tags (`ICT.tsx:2371`, `PublicICTAdmission.tsx:405`) render without an `alt` attribute at all (verified via `grep -n "<img" ... | grep -v "alt="`); `ImageWithFallback.tsx`'s own definition line is a false positive (it defines the prop, not a violation).
- Status indicators (e.g., Lead status badges, sponsorship Active/Ended) do pair color with a text label in the markup itself (`bg-green-100 text-green-800` alongside the literal status word), so this is **not** a color-only accessibility violation — worth confirming as an existing strength, not flagging as a gap.
- Net effect: keyboard-only and screen-reader users can technically operate most flows (since buttons are real `<button>` elements, not `<div onClick>`), but modal dismissal, focus management, and screen-reader announcement of dynamic state changes (tab switches, form errors) are essentially unimplemented anywhere in the app.

### 1.3 Responsive / mobile behavior

**Finding 5 — Responsive table/card degradation is applied fairly systematically, contrary to what "ad hoc" might suggest.**
`overflow-x-auto` and `md:hidden`/`lg:hidden`/`sm:hidden` patterns appear across nearly every data-heavy module: `Accounting.tsx` (13 + 1), `HR.tsx` (6 + 1), `School.tsx` (7 + 1), `Admin.tsx` (9 + 1), `LeadManagement.tsx` (5 + 1), `ICT.tsx` (3 + 1), `Projects.tsx` (2 + 1), `Donors.tsx`/`Sponsorships.tsx`/`LeaveManagement.tsx` each have at least one instance. This is a genuinely systematic pattern (desktop table + a `md:hidden` card-list fallback), not a per-module reinvention — this is a strength worth explicitly preserving rather than replacing with a "proper" responsive table library. The gap is coverage breadth/testing, not the pattern itself (see roadmap Phase 2).

### 1.4 Loading / error / empty states

**Finding 6 — Loading state UI is real but inconsistent in polish, and empty states are essentially unhandled.**
- Every module does track a `loading` boolean and gate rendering on it (loading-related references found in 15 of the largest files), but the actual loading UI varies from module to module: some show a spinner/skeleton (`animate-spin`/`animate-pulse` found in `Accounting.tsx`, `ICT.tsx`, `Admin.tsx`, `AttendancePanel.tsx`, `LeadManagement.tsx`, `LeaveManagement.tsx`, `Sponsorships.tsx`, `Login.tsx`, `BulkStudentUploadModal.tsx`), while others (`HR.tsx`, `Students.tsx`, `Donors.tsx`, `School.tsx`, `Home.tsx`, `Dashboard.tsx`, `Projects.tsx`) show only a plain `"Loading…"` text string (e.g. `HR.tsx:872`: `<div className="text-center py-12 text-gray-400">Loading…</div>`). Not broken, but visibly inconsistent polish between modules a staff member switches between daily.
- Error handling exists in most modules (`catch (err` found in 14 files) but with no shared error-display component — each module renders its caught error differently (inline red text, alert banner, or in some cases only a `console.error`/silent toast).
- Empty states (no students yet, no vouchers yet, no leads yet) are handled per-module ad hoc with inline conditionals — since `EmptyState.tsx` is unused (Finding 3), there is no consistent "nothing here yet" visual anywhere, which matters for a dashboard where several modules (e.g., a brand-new HR department with no employees yet, School with no classes yet) will legitimately be empty on first use.

### 1.5 Dead / broken UI surfaces (summary)

| Surface | Status | Evidence |
|---|---|---|
| `Settings.tsx` | Fully orphaned, unreachable | No import anywhere; `/dashboard/settings` route renders `Admin.tsx` (`routes.tsx:121-123`) |
| `EmptyState.tsx` | Fully orphaned, unreachable | Zero references outside its own file |
| `components/ui/*` (46 files) | Present, fully unused by feature code | Zero import matches in any module component |
| `AddLedgerEntryPanel.tsx` | Reachable but superseded (per `REVAMP_PLAN.md` Finding B) | Tied to legacy `ledger.js`; not a UI-owned decision, flagged here only for cross-reference — resolution belongs to `REVAMP_PLAN.md` Phase 4, not this plan |

---

## 2. Prioritized UI Development Roadmap

Each phase is scoped to be independently shippable, and ordered by (concrete user-facing pain) ÷ (risk of touching live daily-use screens). None of these phases require a design overhaul — all are additive or targeted fixes to what's already there.

### Phase 0 — Decide the fate of dead UI surfaces (prerequisite, not a build phase)
**Why:** Three items (`Settings.tsx`, `EmptyState.tsx`, `components/ui/`) require an explicit decision before any other phase touches nearby code, so subsequent phases don't build on top of ambiguous scaffolding.
**What:** Get explicit answers to the Open Questions in §4 below (delete vs. repurpose `Settings.tsx`; delete vs. adopt `components/ui/`). No code changes in this phase — it's a decision gate.
**Effort:** None (decision only). **Risk:** None.

### Phase 1 — Modal accessibility pass (keyboard + focus + screen reader)
**Why:** Finding 4 is the most concrete, broadly-applicable gap found: zero modals trap focus, only one handles Escape, and there's no `role="dialog"`/`aria-modal` anywhere. This affects every single data-entry flow (Add Student, Add Donor, Add Sponsorship, Share Email, and every in-module modal in Accounting/HR/School/ICT/Admin/Projects/LeadManagement) and is the single highest-leverage accessibility fix available, since fixing the shared wrapper pattern fixes it everywhere at once.
**What:**
- Build one small shared `Modal`/`ModalShell` wrapper (plain component, not necessarily the unused `ui/dialog.tsx` — see Phase 0 decision) that provides: `role="dialog"` + `aria-modal="true"` + `aria-labelledby`, Escape-to-close, focus trap, and focus-return to the trigger element on close.
- Migrate the standalone modals first (`AddDonorModal.tsx`, `AddStudentModal.tsx`, `AddSponsorshipModal.tsx`, `ShareEmailModal.tsx`, `BulkStudentUploadModal.tsx`) since they're small, isolated, and low-risk.
- Migrate in-module modals inside the four large files (`Accounting.tsx`, `HR.tsx`, `School.tsx`, `ICT.tsx`, `Admin.tsx`, `LeadManagement.tsx`, `Projects.tsx`) as a second wave, one module at a time — these are higher-risk only because the files are large, not because the change itself is complex.
- **Must preserve:** the html2canvas/oklch print-root pattern (`AGENT_SQUAD.md`) — any modal that contains or triggers a PDF/print off-screen node (`AcknowledgmentLetter.tsx`, Money Receipt in `Accounting.tsx`) must keep that node's plain-inline-hex-style, `position:absolute; left:-9999px` structure untouched; the accessibility wrapper only affects the *visible* modal chrome, never the off-screen capture node.
**Effort:** Small for the shared wrapper (2-3 days); small-medium per wave of modal migrations (1-2 days per large module, since each requires manually verifying its specific save/cancel/validation flow still works — this is data-entry code, treat every migration as a regression-risk change, not a copy-paste). **Risk:** Low-medium — additive UI behavior, but touches the most-used forms in the app (student/donor/sponsorship intake), so needs a full manual click-through per module, not just a visual check.

### Phase 2 — Consistent loading / error / empty states
**Why:** Finding 6 — loading UI polish varies module to module (spinner vs. plain text), error display has no shared pattern, and the one component built for empty states (`EmptyState.tsx`) is unused everywhere it would help. This is the most visible day-to-day polish gap for staff who move between HR, School, ICT, Accounting in the same session.
**What:**
- Decide (Phase 0) whether to revive and standardize `EmptyState.tsx` as the one "no data yet" surface across modules, or replace it with a purpose-built equivalent — either way, wire it into at least the highest-traffic list/table views (Students, Donors, Sponsorships, HR Employees, School Classes, Accounting Vouchers, Lead list).
- Introduce one shared loading skeleton/spinner treatment and apply it to the modules currently using only a plain "Loading…" string (`HR.tsx`, `Students.tsx`, `Donors.tsx`, `School.tsx`, `Home.tsx`, `Dashboard.tsx`, `Projects.tsx`) so all modules match the more polished ones (`Accounting.tsx`, `ICT.tsx`, `Admin.tsx`).
- Introduce one shared inline error-banner pattern for form/save errors, applied consistently instead of each module's ad hoc red-text/alert variant.
- Do this module-by-module, starting with the modules with the flattest "Loading…" treatment first (`HR.tsx`, `School.tsx` — largest daily-use surfaces after Accounting), since they have the most visible gap versus the already-polished modules.
**Effort:** Small for the shared components (2-3 days); small per-module wiring (0.5-1 day each × ~7 modules). **Risk:** Low — purely additive visual/UX change, no data-flow changes.

### Phase 3 — Tab-bar and modal-wrapper componentization
**Why:** Finding 2 — the tab-bar and modal-wrapper markup is copy-pasted per module with small, compounding drift (e.g., `HR.tsx`'s tab bar already looks visibly different from `Accounting.tsx`/`ICT.tsx`/`Admin.tsx`/`LeadManagement.tsx`). Left alone, this drift will keep growing every time a module is touched independently — consolidating now, while the drift is still small, is cheaper than doing it after another year of copy-paste.
**What:**
- Extract one shared `TabBar`/`TabButton` component matching the majority pattern already used in `Accounting.tsx`/`ICT.tsx`/`Admin.tsx`/`LeadManagement.tsx` (`border-b-2 px-4 py-2.5-3 rounded-t-lg`), and migrate `HR.tsx` (the outlier) plus `School.tsx`/`Projects.tsx` onto it.
- Extract the modal-wrapper `<div className="fixed inset-0 ...">` shell (already near-identical across `AddDonorModal.tsx`/`AddStudentModal.tsx`/`AddSponsorshipModal.tsx`/`ShareEmailModal.tsx`) into the shared `Modal` component from Phase 1, so this becomes one artifact, not two overlapping efforts.
- **Explicitly do not** touch each module's internal tab *content* or data logic in this phase — this is purely extracting the repeated chrome/wrapper markup, not refactoring module internals.
**Effort:** Medium (this phase touches every large module file, even if each individual change is small) — roughly 1 day per module × 7 modules, plus 1-2 days for the shared components themselves. **Risk:** Low-medium — visually near-identical output expected, but because it touches every large file, needs a visual diff/click-through pass per module before merging, not just a code review.

### Phase 4 — Design-system consolidation decision execution (conditional on Phase 0 answer)
**Why:** Finding 1 — depends entirely on the Phase 0 decision. If the decision is "adopt `components/ui/`," this phase migrates net-new components (buttons, inputs, tables) built from Phase 1-3 onto the existing shadcn primitives instead of continuing to hand-roll Tailwind, and schedules a slow, module-by-module migration of *existing* buttons/inputs where touched anyway (not a big-bang rewrite). If the decision is "remove `components/ui/`," this phase is simply deleting the unused folder and the now-unneeded Radix/`cmdk`/`class-variance-authority` dependencies, shrinking the bundle with zero behavior change.
**What (adopt path):** New shared components introduced in Phases 1-3 (`Modal`, `TabBar`, loading/error/empty states) should be built on top of `ui/dialog.tsx`, `ui/tabs.tsx`, `ui/skeleton.tsx`, `ui/alert.tsx` rather than from scratch, since Phase 1's accessibility requirements (focus trap, `role="dialog"`) are things Radix's `Dialog` primitive already solves correctly out of the box — this could actually reduce Phase 1's effort if sequenced after this decision.
**What (remove path):** Delete `src/app/components/ui/`, `src/app/components/figma/` (if confirmed unused), and prune the now-orphaned dependencies (`@radix-ui/react-*`, `cmdk`, `class-variance-authority`, `input-otp`, `vaul`/`sheet` if present) from `package.json`, verified via a full build + bundle-size check.
**Effort:** Adopt path: large, ongoing (this is a slow migration, not a sprint — sequence it opportunistically inside Phases 1-3 rather than as a standalone big-bang effort). Remove path: small (1 day, mostly verification that nothing silently depended on the folder). **Risk:** Adopt path is low-risk if done incrementally (new code only, ratchet forward); remove path is low-risk but must verify zero transitive imports before deleting (a `grep` pass, already done for this plan, showed zero — re-verify at execution time in case new code landed since).

### Suggested sequencing summary

| Phase | Focus | Effort | Risk | Depends on |
|---|---|---|---|---|
| 0 | Decide fate of dead UI surfaces | None (decision) | None | User answers §4 |
| 1 | Modal accessibility (focus trap, Escape, ARIA) | Small–medium | Low–medium | Phase 0 |
| 2 | Consistent loading/error/empty states | Small | Low | Phase 0 (EmptyState decision) |
| 3 | Tab-bar/modal-wrapper componentization | Medium | Low–medium | Phase 1 (shares the Modal component) |
| 4 | Design-system consolidation (adopt or remove `ui/`) | Small (remove) / Large-ongoing (adopt) | Low | Phase 0 |

This roadmap is intentionally independent of, but compatible with, `REVAMP_PLAN.md` Phase 1 (React.lazy code-splitting of the 14 route components) — that phase changes *how* these components are loaded, not their internal markup, so it can proceed on its own schedule without blocking or being blocked by this plan. If both are executed, sequence Phase 1 of this plan (modal accessibility) before or alongside `REVAMP_PLAN.md` Phase 1, since that phase's own risk section already flags the need to verify the html2canvas print-capture pattern survives lazy-loading — the same components this plan's Phase 1 touches.

---

## 3. Non-Goals

Explicitly out of scope, and should be resisted if proposed later:

- **No full visual redesign.** The `#14856E` brand green and overall layout language are already consistently applied (Finding 2) and recognized by daily staff users — this plan fixes structural/accessibility gaps, not visual identity.
- **No swap of the underlying component strategy without an explicit decision (Phase 0/4).** Do not unilaterally rip out `components/ui/` or unilaterally force-adopt it across all 14+ modules in one pass — either direction is a real engineering decision with real migration cost, not a default.
- **No routing or framework change.** React Router's existing route structure (`routes.tsx`) is untouched by this plan.
- **No breaking changes to any module's data-entry workflow.** Every modal/form migration in Phases 1 and 3 must preserve exact field order, validation behavior, and submit/cancel semantics — this is a live tool with staff entering real financial, HR, and student data daily; a UI polish pass must not risk data loss or workflow confusion.
- **No changes to the html2canvas/oklch print-capture pattern.** The off-screen `position:absolute; left:-9999px` print-root nodes in `AcknowledgmentLetter.tsx` and Money Receipt (`Accounting.tsx`) must be left exactly as-is — plain inline hex styles, not Tailwind classes, per the documented `AGENT_SQUAD.md` trap. Any shared `Modal`/loading component introduced here must not be applied to those capture nodes.
- **No mandatory full-app responsive/mobile redesign.** Finding 5 shows the existing responsive pattern (`overflow-x-auto` + `md:hidden` card fallback) is already fairly systematic — this plan proposes closing coverage gaps where they exist, not introducing a new responsive framework or mobile-first rewrite (see Open Question on mobile priority below).
- **No new third-party UI/component library.** Any consolidation work (Phase 4) works within what's already installed (`components/ui/`, Radix, Tailwind) or removes it — it does not introduce a third option (e.g., Chakra, Mantine, Ant Design).
- **No touching `AddLedgerEntryPanel.tsx`/legacy ledger UI.** That component's fate is explicitly owned by `REVAMP_PLAN.md` Phase 4 (accounting-system consolidation, gated on accountant sign-off) — this UI plan does not schedule any change to it to avoid overlapping ownership of a financial-data decision.

---

## 4. Open Questions for the User

1. **`Settings.tsx` (orphaned, 204 LOC, unwired "Save Changes" button):** delete it outright, or is there a real org-profile/notification-settings feature that was meant to live there and should be finished and wired up instead of deleted?
2. **`EmptyState.tsx` (orphaned, 31 LOC):** revive and standardize it as the app-wide empty-state component (Phase 2), or was it abandoned because the intended design didn't fit — in which case should a new one be built instead?
3. **`components/ui/` (46 unused shadcn/Radix files):** was this folder auto-generated by an initial Figma/Make import and simply never adopted, or is there a plan to eventually build on it? This materially changes Phase 4's shape — "delete it, shrink the bundle" vs. "start building new shared components on top of it."
4. **Is mobile/phone use a real requirement, or nice-to-have?** The codebase already has real (if partial) responsive coverage (Finding 5), but no evidence of it being tested on actual phones by staff. Should Phase 2/3's shared-component work explicitly budget time for phone-width QA, or is desktop/tablet (staff at a desk) the only environment that matters in practice?
5. **Any brand/design guidelines beyond the current `#14856E` green?** No style guide or Figma source-of-truth was found in the repo beyond the unused `components/figma/` folder — confirming there's no hidden brand doc this plan should be checking against before making any visual decisions (e.g., exact shade of green in dark-mode-adjacent contexts, typography scale, spacing scale) would avoid surprises later.
6. **Priority/sequencing preference:** does the user want Phase 1 (accessibility) prioritized because of a specific compliance/audit need (e.g., a donor or grant requirement), or should Phase 2 (day-to-day polish for staff) come first since that's the most immediately visible improvement to daily users? The roadmap above defaults to accessibility-first on the reasoning that it's the single highest-leverage, most systemic gap found, but this is a judgment call the user may weigh differently.
7. **Scope boundary with `REVAMP_PLAN.md` Phase 1:** should this plan's execution be sequenced strictly before/after/alongside the bundle-splitting work, or should whichever agent executes first flag the other plan's owner before starting, given both eventually touch the same large module files (`Accounting.tsx`, `HR.tsx`, `School.tsx`, `ICT.tsx`)?

---

## Appendix: Evidence Trail

- Unused `components/ui/`: `grep -rl "from ['\"].*components/ui" src/app/components/*.tsx` → 0 matches; folder contains 46 files (`accordion.tsx` … `utils.ts`).
- Raw button counts vs. shared `<Button>` usage: `grep -c "<button"` / `grep -c "<Button "` across `Accounting.tsx` (57/0), `ICT.tsx` (42/0), `HR.tsx` (56/0), `School.tsx` (24/0), `Projects.tsx` (24/0), `LeadManagement.tsx` (35/0), `Admin.tsx` (27/0), `AcknowledgmentLetter.tsx` (22/0), `Students.tsx` (9/0), `Donors.tsx` (7/0), `Sponsorships.tsx` (10/0), `Home.tsx` (5/0).
- Brand color consistency: `#14856E` appears 788 times, `#0f6b5a` 105 times across `src/app/components/*.tsx` (`grep -rohE "#[0-9A-Fa-f]{6}"` frequency count).
- Tab-bar drift: `HR.tsx` line ~290 (`px-4 py-2 text-sm font-medium border-b-2` helper function) vs. `Accounting.tsx`/`ICT.tsx`/`LeadManagement.tsx` (`flex items-center gap-2 px-3-4 py-2.5-3 ... rounded-t-lg ... border-b-2 -mb-px` inline ternary pattern).
- `aria-*` usage: 10 total occurrences codebase-wide, all in `ICT.tsx` (`grep -rc "aria-" src/app/components/*.tsx`).
- `role="dialog"`: 0 occurrences anywhere (`grep -rc 'role="dialog"'`).
- Escape-key handling: only `Projects.tsx` references `Escape`/`onKeyDown` among all components (`grep -rln "Escape\|keydown\|onKeyDown"`).
- Missing `alt`: `ICT.tsx:2371`, `PublicICTAdmission.tsx:405` (`grep -n "<img" ... | grep -v "alt="`).
- `Settings.tsx` orphaned: no import in `src/app/` outside its own file; `routes.tsx:121-123` renders `Admin.tsx` for `/dashboard/settings`.
- `EmptyState.tsx` orphaned: `grep -rn "EmptyState" src/app/` returns only its own definition file.
- Responsive coverage: `overflow-x-auto` / `md:hidden`(etc.) counts per file — `Accounting.tsx` (13+1), `HR.tsx` (6+1), `School.tsx` (7+1), `Admin.tsx` (9+1), `LeadManagement.tsx` (5+1), `ICT.tsx` (3+1), `Projects.tsx` (2+1), plus single instances in `Donors.tsx`, `Sponsorships.tsx`, `LeaveManagement.tsx`, `Dashboard.tsx`, `Home.tsx`.
- Loading-state polish gap: spinner/skeleton (`animate-spin`/`animate-pulse`) present in `Accounting.tsx`, `ICT.tsx`, `Admin.tsx`, `AttendancePanel.tsx`, `LeadManagement.tsx`, `LeaveManagement.tsx`, `Sponsorships.tsx`, `Login.tsx`, `BulkStudentUploadModal.tsx`; absent (plain "Loading…" text, e.g. `HR.tsx:872`) in `HR.tsx`, `Students.tsx`, `Donors.tsx`, `School.tsx`, `Home.tsx`, `Dashboard.tsx`, `Projects.tsx`.
