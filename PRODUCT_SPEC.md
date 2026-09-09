# Sombhabona Foundation — Sponsorship Management Dashboard
## Product Specification (Reverse-Engineered from Current Codebase)

> This document describes the application **as it exists in the code today** (branch `main`, commit `f41f80d5`), not an aspirational design. It was produced by reading the frontend components, backend/microservice route files, SQL schemas, and infrastructure config directly. Where the repo's own `README.md` was stale relative to the code, this spec follows the code.

---

## 1. Product Overview

The Sponsorship Management Dashboard is an internal operations platform for **Sombhabona Foundation**, a Bangladesh-based nonprofit ("বঞ্চিত শিশুও আগামীর সম্ভাবনা" — "Deprived children are the possibility of tomorrow"). It serves two audiences:

- **Public visitors/donors** — a public marketing/donation site (`/`, `/student/:id`, `/ict-admission`) that showcases sponsorable students, lets a visitor "share" a student profile or express interest in sponsoring, and exposes a public ICT-training admission form.
- **Foundation staff** (admins, accountants, HR, school coordinators, ICT coordinators, project managers, lead-management/admissions staff) — an authenticated dashboard (`/dashboard/*`) covering child sponsorship administration, full double-entry accounting, HR/payroll, a Puspokoli School operations module, an ICT training program module, general project/task management, an ICT-course lead pipeline, and system administration (users/roles/audit).

Architecturally it is a **microservices monorepo**: a React/Vite SPA frontend served by Nginx, a core "backend" Express service (auth, students, donors, sponsorships, ledger, accounting, exports, letters, receipts, notifications), and five satellite Express microservices (ICT, Projects, HR, School, Lead Management), all backed by a **single shared PostgreSQL database** (tables are namespaced by prefix per module, e.g. `hr_*`, `sc_*`, `ict_*`, `pm_*`, `lead_*`, `acc_*`).

---

## 2. Modules

### 2.1 Public Site (Home / Student Profile / ICT Admission)
- **Purpose**: Public-facing donor acquisition and lead capture.
- **Components**: `src/app/components/Home.tsx`, `StudentProfile.tsx`, `PublicICTAdmission.tsx`.
- **Key features**:
  - `Home.tsx` — landing page with animated stat counters, a student gallery (sponsored/unsponsored filter), org mission content, contact info.
  - `StudentProfile.tsx` (`/student/:id`) — public detail page per student; "sponsor this student" flow opens `AddDonorModal`; share via copy-link or `ShareEmailModal` (sends an email with the student's profile).
  - `PublicICTAdmission.tsx` (`/ict-admission`) — public, unauthenticated ICT training admission form (personal, contact, socio-economic, training-interest sections) that writes into the ICT/Lead pipeline.
- **Backend**: core `backend` (`students.js`, `donors.js`) for the gallery/profile; `ict-backend` (`admissions.js`) and/or `lead-backend` for the admission form submission.

### 2.2 Dashboard (Landing)
- **Purpose**: Authenticated home screen after login.
- **Component**: `Dashboard.tsx`, routed via `DashboardLanding` in `routes.tsx`.
- **Key features**: Only `admin` role sees the full analytics dashboard (KPI cards for total students/donors/monthly revenue, donation trend line chart, sponsorship-rate pie chart, top donors bar list, growth %). All other roles see a minimal welcome screen plus their personal `AttendancePanel` (clock in/out).
- **Backend**: core `backend` `dashboard.js` (`/api/v1/dashboard/summary`, donation-trend, analytics endpoints).

### 2.3 Students
- **Purpose**: Core beneficiary (child) registry for the sponsorship program.
- **Component**: `Students.tsx`, with `AddStudentModal.tsx`, `BulkStudentUploadModal.tsx`.
- **Key features**: student card grid, sponsored/unsponsored/all filter, add single student, bulk CSV/Excel upload, featured-student flag, profile photo, family/socio-economic fields (father/mother name, family income, phone — phone marked private per recent commit history).
- **Backend**: core `backend` `students.js` → `students` table.

### 2.4 Donors
- **Purpose**: Donor CRM for the sponsorship program.
- **Component**: `Donors.tsx`, `AddDonorModal.tsx`.
- **Key features**: donor list/search, add donor (name, email, phone, country), running `total_contributed` per donor.
- **Backend**: core `backend` `donors.js` → `donors` table.

### 2.5 Sponsorships
- **Purpose**: Links a donor to a sponsored student with a recurring/one-off pledge.
- **Component**: `Sponsorships.tsx`, `AddSponsorshipModal.tsx`.
- **Key features**: create/list sponsorships (student ↔ donor, amount, period, payment media, unique reference number), Active/Ended status, start/end dates.
- **Backend**: core `backend` `sponsorships.js` → `sponsorships` table (FKs to `students`, `donors`).

### 2.6 Acknowledgment Letters ("Ac_Letter")
- **Purpose**: Generate, save, print/PDF, and email donor acknowledgment/thank-you letters and donor statements.
- **Component**: `AcknowledgmentLetter.tsx` (uses `html2canvas`/`jsPDF` for PDF export, `ShareEmailModal` for emailing), plus `StatementGenerator.tsx` for CSV/PDF donor statements by month/year.
- **Key features**: donation entry list, letter templates, save/reuse letters, print, download PDF, share by email, history of generated letters.
- **Backend**: core `backend` `acknowledgments.js` (→ `acknowledgment_letters` table) and `exports.js` (donor statement CSV/PDF export).

### 2.7 Leave Management
- **Purpose**: Staff leave request/approval workflow, shared across all internal roles.
- **Component**: `LeaveManagement.tsx`.
- **Key features**: view personal leave balance (Casual/Special), submit leave request (with backdating support), manager/HR approve or reject, view request history/status (Pending/Approved/Rejected).
- **Backend**: core `backend` `leaves.js` → `leave_balances`, `leave_requests` tables (in the shared/auth database, `users` FK).

### 2.8 ICT Program
- **Purpose**: Manage the foundation's ICT/digital-literacy training program — student profiles, admission forms, and lab inventory.
- **Component**: `ICT.tsx` — three tabs: **Student Profiles**, **Admission Forms**, **Inventory**.
- **Key features**: detailed ICT student profile (education, socio-economic survey, course/batch, certification/competency tracking, dropout tracking, earnings log), admission form intake/approval (pending/approved/rejected/processed), lab equipment inventory by category/lab with printable item labels and a full inventory report, printable admission slips and earning statements.
- **Backend**: `ict-backend` — `students.js`, `admissions.js`, `inventory.js` → `ict_students`, `ict_admissions`, `ict_student_earnings`, `ict_courses`, `ict_enrollments` tables.

### 2.9 Accounting & Finance
- **Purpose**: Full nonprofit fund accounting — chart of accounts, vouchers, general ledger, budgets, and a simplified monthly-accounts workflow, plus money-receipt generation.
- **Component**: `Accounting.tsx` — tabs: **Overview**, **Monthly Accounts**, **Chart of Accounts**, **Vouchers**, **General Ledger**, **Reports**, **Money Receipt**.
- **Key features**:
  - Chart of accounts (Asset/Liability/Equity/Income/Expense, hierarchical via `parent_id`), seeded with a nonprofit-specific COA.
  - Vouchers (Payment/Receipt/Journal/Contra) with a Draft → Submitted → Approved → Posted (or Cancelled) workflow and double-entry lines.
  - General ledger with running balances per account; Trial Balance, Income & Expense, and Cash Book reports.
  - "Monthly Accounts" — a simpler flat donation/expense entry log (`acc_donations`, `acc_expenses`) with category→GL-account and payment-method→GL-account mapping, processed into the formal ledger/vouchers.
  - Budgets per account/project/fiscal-year/month.
  - Money Receipt generator — printable/PDF receipts tied to a sponsorship/donor, with receipt history.
  - Projects list for cost-center tagging (`acc_projects`, separate from the Project Management module).
- **Backend**: core `backend` `accounting.js` (`acc_*` tables) and `receipts.js` (`money_receipts` table); legacy simple ledger also exists (`ledger.js` → `accounting_ledger` table, credit/debit with auto closing balance) — this looks like the original MVP ledger, now largely superseded by the `acc_*` module (see Gaps).

### 2.10 Projects (Project Management)
- **Purpose**: General organizational project/task tracking (distinct from `acc_projects` cost centers).
- **Component**: `Projects.tsx` — tabs: **Dashboard**, **Projects**, **Tasks**.
- **Key features**: project CRUD (category, manager, budget, date range, status Planning/Active/On Hold/Completed/Archived, progress %), project members, tasks (priority, due date, estimated hours, status To Do/In Progress/Review/Completed, subtasks via `parent_task_id`), task comments and attachments, project documents, activity log.
- **Backend**: `project-backend` — `projects.js`, `tasks.js`, `dashboard.js` → `pm_projects`, `pm_project_members`, `pm_tasks`, `pm_task_comments`, `pm_task_attachments`, `pm_project_documents`, `pm_activity_logs`.

### 2.11 HR
- **Purpose**: Employee master data, payroll, departments, and attendance/time tracking for staff.
- **Component**: `HR.tsx` — tabs: **Dashboard**, **Employees**, **Payroll**, **Departments**, **Attendance**, **Reports**.
- **Key features**: employee profiles (personal/contact/employment/financial sections, documents upload, printable ID-style profile card), department & designation management (seeded with common nonprofit departments/grades), payroll runs per employee/month with earning/deduction components, printable salary slips, payroll approve/mark-paid workflow, daily attendance (login/logout sessions, working minutes, IP capture) feeding a personal `AttendancePanel` widget used dashboard-wide for clock-in/out.
- **Backend**: `hr-backend` — `employees.js`, `payroll.js`, `departments.js`, `attendance.js`, `dashboard.js` → `hr_employees`, `hr_departments`, `hr_designations`, `hr_payrolls`, `hr_payroll_items`, `hr_salary_components`, `hr_attendance`, `hr_employee_documents`.

### 2.12 School (Puspokoli School Operations)
- **Purpose**: Day-to-day operations of the foundation's Puspokoli School — classes, attendance, and classroom-quality monitoring.
- **Component**: `School.tsx` — tabs: **Dashboard**, **Attendance**, **Evaluation** (monitoring), **Reports**.
- **Key features**: class list (branch, class teacher, student count), per-student daily attendance (Present/Absent/Late) and a faster class-level aggregate attendance entry, classroom monitoring forms (14-item yes/no checklist, score %, good points/improvement areas/next steps, Draft/Submitted).
- **Backend**: `school-backend` — `students.js`, `attendance.js`, `classAttendance.js`, `classes.js`, `monitoring.js`, `dashboard.js` → `sc_classes`, `sc_students`, `sc_attendance`, `sc_class_attendance_summary`, `sc_monitoring_forms`, `sc_monitoring_items`.

### 2.13 Lead Management
- **Purpose**: Sales/admissions pipeline for the ICT training program — captures leads (e.g., from Google Forms/Sheets, referrals), tracks follow-ups, and converts leads into ICT admissions.
- **Component**: `LeadManagement.tsx` — tabs: **Dashboard**, **Leads**, **Courses**, **Follow-ups**, **Admissions**, **Reports**.
- **Key features**: lead intake (name/phone/email/source/course interest/assigned staff), lead status pipeline (New → …), follow-up logging (call/attempt number, outcome, next-follow-up date), one-click deep link from a lead into the ICT admission form (`/dashboard/ict?tab=admission-form&new=1`), course catalog for lead targeting, Google Sheets sync (pulls leads from a configured spreadsheet via a Google service account), dashboard analytics (leads by month/status/course, admitted-by-follow-up-calls).
- **Backend**: `lead-backend` — `leads.js`, `followups.js`, `courses.js`, `sheetSync.js`, `dashboard.js`, `reports.js` → `lead_leads`, `lead_followups`, `lead_courses`, `lead_sheet_config`.

### 2.14 Admin ("Settings" nav item)
- **Purpose**: System administration — user, role/permission, and audit management.
- **Component**: `Admin.tsx` (note: the sidebar labels this route "Settings" but it renders `Admin.tsx`, not the separate `Settings.tsx` component — see Gaps). Tabs: **Users**, **Roles & Perms**, **Audit Logs**, **Activity**, **Notifications**.
- **Key features**: create/edit/deactivate users, assign roles, per-user module-access overrides (view/create/edit/delete, can override role defaults), edit role→module permission matrix, view audit log (who did what, when, from which IP), view login/session activity (time tracking), manage in-app notifications.
- **Backend**: core `backend` `admin.js` (`users`, `roles`, `modules`, `permissions`, `user_roles`, `user_module_access`, `audit_logs`, `user_sessions`) and `notifications.js`.
- **Access**: route-gated by `requiredRole="admin"` in `routes.tsx` (in addition to the "Admin" module RBAC check used for the sidebar link).

### 2.15 Shared/Utility Components
- `NotificationBell.tsx` — in-app notification dropdown (core `backend` `notifications.js`).
- `AttendancePanel.tsx` — personal clock-in/out widget shown to every logged-in user (talks to `hr-backend` attendance endpoints).
- `AddLedgerEntryPanel.tsx` — entry form for the legacy simple ledger (`ledger.js`).
- `ShareEmailModal.tsx` — reusable "share via email" dialog used by Home/StudentProfile/AcknowledgmentLetter.
- `EmptyState.tsx`, `ImageWithFallback.tsx` — generic UI helpers.
- `ProtectedRoute.tsx` — route guard checking `requiredModule` / `requiredRole` against the authenticated user's permissions.

---

## 3. User Roles & Permissions (RBAC)

The RBAC model lives entirely in the core `backend` database (`backend/sql/auth_schema.sql`) and is enforced both server-side (`moduleAccessMiddleware`, `roleMiddleware` in `backend/src/middleware/auth.js`, and each microservice's own copy of an equivalent access check) and client-side (`ProtectedRoute`, `canAccess()` in `AuthContext`, gating sidebar links in `RootLayout.tsx`).

**Model**: `users` ⟷ `user_roles` ⟷ `roles`; `roles` ⟷ `permissions` ⟷ `modules` (per-module `can_view/can_create/can_edit/can_delete`); plus a `user_module_access` table for **per-user overrides** that can supersede role permissions when `override_role_permissions = true`.

**Modules registered** (each is a discrete RBAC unit, not necessarily 1:1 with a frontend nav item): Dashboard, Donors, Students, Sponsorships, Leave Management, ICT, School Operations, Accounting, Projects, HR, School, Lead Management, Export, Admin.

**Seeded roles** and their defaults:

| Role | Full access to | Partial/view-only access to |
|---|---|---|
| `admin` | All modules (view/create/edit/delete) | — |
| `accountant` | Accounting, Export (full); Leave Management (view/create/edit) | Dashboard, Students, Donors (view only) |
| `operator` | — | Dashboard (view); Students, Donors, Sponsorships (view/create); Leave Management (view/create) |
| `ict` | ICT (full) | Dashboard (full, per seed); Leave Management (view/create/edit) |
| `school` | School, School Operations (full) | Dashboard (full); Leave Management (view/create/edit) |
| `hr` | HR (full) | Dashboard (full); Leave Management (view/create/edit) |
| `project_manager` | Projects (full) | Dashboard (full); Leave Management (view/create/edit) |
| `lead_management` | Lead Management (full) | Dashboard (full); Leave Management (view/create/edit) |
| `leave` | Leave Management (view/create/edit) only | — |

Notes:
- A user can hold multiple roles (`user_roles` is a junction table), and permissions are unioned.
- Auth token is a JWT (`{ userId, username }`, 24h expiry) signed with a shared `JWT_SECRET` across the core backend and all five microservices, so a single login token is valid everywhere.
- Each microservice re-implements its own `authMiddleware`/role-check against the **same** shared `users`/`roles`/`permissions` tables (they all connect to the one Postgres instance), rather than calling the core backend over the network — i.e., authorization data is duplicated-by-shared-DB, not by an internal auth API (`INTERNAL_SECRET` env var exists but appears reserved for service-to-service calls, e.g. project-backend health/webhook use).
- Session/idle tracking: `AuthContext` shows an "idle warning" and can force logout; `user_sessions` records login/heartbeat/logout for time-tracking and the Admin "Activity" tab.

---

## 4. Core Data Model

Single shared PostgreSQL database, tables namespaced by module prefix.

**Identity/Auth (no prefix)**: `users` → `user_roles` → `roles` → `permissions` → `modules`; `user_module_access` (per-user overrides); `audit_logs`, `user_sessions`.

**Sponsorship core (no prefix, core backend)**:
- `students` (child beneficiaries) ←→ `sponsorships` (join, with `amount`, `status`, `reference_number`) ←→ `donors`.
- `acknowledgment_letters` references `students`/`donors`/`users` (creator).
- `money_receipts` references `sponsorships`/`donors`/`users`.
- `accounting_ledger` — legacy flat Credit/Debit ledger (independent of `acc_*`).
- `leave_balances`/`leave_requests` reference `users`.

**Accounting (`acc_*`, core backend, same DB)**:
- `acc_accounts` (self-referencing chart of accounts) ← `acc_voucher_lines` ← `acc_vouchers` (references `acc_projects`, `users` for created/submitted/approved/posted/cancelled by) → `acc_ledger` (posted GL entries with running balance).
- `acc_budgets` references `acc_accounts` + `acc_projects`.
- `acc_donations` / `acc_expenses` (flat monthly-accounts entries) → optionally linked to `acc_vouchers` once processed; `acc_category_mappings` and `acc_payment_method_mappings` map free-text categories/payment methods to GL accounts.

**HR (`hr_*`)**: `hr_departments` → `hr_designations` → `hr_employees` (self-referencing `reporting_manager_id`, optional `linked_user_id` tying an employee to a login `users.id`) → `hr_employee_documents`, `hr_payrolls` (+ `hr_payroll_items`, driven by `hr_salary_components`), `hr_attendance` (one row/employee/day).

**School (`sc_*`)**: `sc_classes` → `sc_students`; `sc_attendance` (per-student/day) and `sc_class_attendance_summary` (aggregate/day); `sc_monitoring_forms` → `sc_monitoring_items`.

**ICT (`ict_*`)**: `ict_students` → `ict_admissions` (1:many, admission applications per student), `ict_student_earnings`, `ict_courses` ←→ `ict_enrollments` (many-to-many student/course).

**Projects (`pm_*`)**: `pm_projects` → `pm_project_members`, `pm_tasks` (self-referencing `parent_task_id` for subtasks) → `pm_task_comments`, `pm_task_attachments`; `pm_project_documents`, `pm_activity_logs`. User references (`user_id`, `assigned_user_id`, etc.) are plain integers, not FK-enforced against `users` (this service doesn't own the users table).

**Lead Management (`lead_*`)**: `lead_courses` ← `lead_leads` → `lead_followups`; `lead_sheet_config` (Google Sheet sync settings) is standalone.

**Cross-module conceptual links** (not enforced by FK across services, since each microservice owns its own tables in the same DB but doesn't necessarily reference other prefixes):
- `Lead → (conversion) → ICT Admission → ICT Student`: a lead can be pushed to the ICT admission form via a deep link, but there is no DB-level `lead_leads.ict_student_id` FK — conversion is a manual UI action, not a modeled relationship.
- `HR Employee ←→ users`: connected loosely via `hr_employees.linked_user_id` (not a real FK constraint, since it's an unenforced integer reference to the core `users` table which lives outside `hr-backend`'s own schema ownership).
- `Sponsorship → Money Receipt`: `money_receipts.sponsorship_id` is a real FK.
- `Accounting acc_projects` vs. `Projects module pm_projects`: two independent "project" concepts — cost-center tagging in Accounting vs. work/task tracking in Project Management — not linked to each other.

---

## 5. System Architecture

**Services** (`docker-compose.yml`):

| Service | Container | Internal Port | Tech |
|---|---|---|---|
| `db` | sombhabona-db | 5432 (internal only) | PostgreSQL 16 |
| `backend` | sombhabona-backend | 8000 | Node/Express — auth, students, donors, sponsorships, ledger, accounting, exports, letters, receipts, notifications, admin |
| `ict-backend` | sombhabona-ict | 5002 | Node/Express — ICT students/admissions/inventory |
| `project-backend` | sombhabona-projects | 5003 | Node/Express — projects/tasks |
| `hr-backend` | sombhabona-hr | 5004 | Node/Express — employees/payroll/departments/attendance |
| `school-backend` | sombhabona-school | 5005 | Node/Express — classes/attendance/monitoring |
| `lead-backend` | sombhabona-leads | 5006 | Node/Express — leads/followups/courses/sheet sync (uses `GOOGLE_SERVICE_ACCOUNT_JSON`) |
| `frontend` | sombhabona-frontend | 80 → host 6080 | Nginx serving the built React SPA + reverse proxy |

All backend containers connect to the **same** `db` instance/database (`${POSTGRES_DB}`); none use `ports:` bindings to the host except `frontend` (`6080:80`) — everything else is internal-network-only, so the Nginx container is the sole public entry point.

**Routing (`nginx/default.conf`)**:
- `/` → serves the SPA (`try_files $uri /index.html`), i.e. client-side routing via `react-router`.
- `/api/` → core `backend:8000`.
- `/api/ict/` → `ict-backend:5002`.
- `/api/projects/` → `project-backend:5003`.
- `/api/school/` → `school-backend:5005`.
- `/api/hr/` → `hr-backend:5004`.
- `/api/leads/` → `lead-backend:5006`.

The frontend's `api` service (`src/app/services/api.ts`, not fully inspected here) issues requests to these prefixes; each microservice call carries the same JWT bearer token obtained from the core backend's `/api/v1/auth/login`.

**Auth/JWT model**:
- Login happens only against the core `backend` (`POST /api/v1/auth/login`), which issues a JWT `{ userId, username }` valid 24h, signed with `JWT_SECRET` (shared across all services via docker-compose env, default fallback differs slightly between the core backend, `your-secret-key-change-in-production`, and the microservices, `your_jwt_secret_key_here` — see Gaps).
- Every service independently verifies the JWT and re-queries the shared `users`/`roles`/`permissions` tables for authorization — there is no internal service-to-service auth API call for permission checks; the trust boundary is "same DB, same secret."
- Frontend-side idle/session handling and heartbeat are managed by `AuthContext`, hitting `/api/v1/auth/heartbeat` and `/logout`, which update `user_sessions`.

---

## 6. Known Gaps / Dead-Ends / Inconsistencies

- **`Settings.tsx` is unreachable dead code.** The sidebar "Settings" nav item (gated by the `Admin` module) routes to `/dashboard/settings`, which is wired in `routes.tsx` to render `Admin.tsx`. The separate `Settings.tsx` component (organization profile, notifications, etc.) is never imported by any route — its "Save Changes" button also has no `onClick`/API wiring, confirming it's an unfinished/orphaned screen.
- **Two parallel accounting systems exist in the same service.** The original MVP ledger (`ledger.js` → `accounting_ledger`, simple Credit/Debit + closing balance, matches the stale README) coexists with the full double-entry GL (`accounting.js` → `acc_*` tables) that now powers the `Accounting.tsx` UI. The legacy ledger endpoints/table appear to still exist and be reachable (`AddLedgerEntryPanel.tsx`) but are not featured as a tab in the current `Accounting.tsx` UI — likely superseded but not removed.
- **README.md is stale.** It documents only the original single-backend MVP (dashboard/students/donors/sponsorships/ledger) and predates the HR, School, ICT, Projects, Lead Management, and full Accounting microservices entirely. No `RBAC_DOCUMENTATION.md` or equivalent exists in the repo despite being referenced as a possibility in the task brief.
- **No enforced FK between `lead_leads` and `ict_students`/`ict_admissions`.** Lead-to-admission "conversion" is only a UI deep link (`/dashboard/ict?tab=admission-form&new=1`), so there's no queryable lead-to-admission conversion rate at the database level.
- **`hr_employees.linked_user_id` and `pm_*` user references are not real foreign keys** to the core `users` table (each microservice owns only its own schema), so referential integrity between an HR employee/Project member and a login account is not DB-enforced.
- **JWT secret fallback defaults are inconsistent** between the core backend (`your-secret-key-change-in-production`) and the microservices (`your_jwt_secret_key_here`) in `docker-compose.yml`; in practice this is masked by the shared `${JWT_SECRET}` env var, but any deployment that fails to set it would silently split auth between services.
- **Two distinct "Projects" concepts** — `acc_projects` (accounting cost centers, e.g. "Puspokoli School", "ICT Training") and `pm_projects` (work/task-tracking projects in the Projects module) — are not connected, which could confuse anyone expecting project-level financials to roll up from Project Management.
- **Seed default permissions grant `ict`/`school`/`hr`/`project_manager`/`lead_management` roles full "Dashboard" module access**, which combined with `DashboardLanding`'s `hasRole('admin')` check means only `admin` actually sees the analytics `Dashboard.tsx` view in the UI regardless of the "Dashboard" module permission — the permission is checked for route access, but the richer admin analytics view is separately gated by role, not by the `Dashboard` module's `can_view` flag.

---

## Appendix: Files Referenced

- Frontend components: `src/app/components/*.tsx`, routing: `src/app/routes.tsx`, `src/app/App.tsx`
- Core backend: `backend/src/routes/*.js`, `backend/src/middleware/auth.js`, `backend/src/server.js`
- Microservices: `ict-backend/src/routes/*.js`, `project-backend/src/routes/*.js`, `hr-backend/src/routes/*.js`, `school-backend/src/routes/*.js`, `lead-backend/src/routes/*.js`
- Schemas: `backend/sql/schema.sql`, `backend/sql/auth_schema.sql`, `hr-backend/sql/schema.sql`, `school-backend/sql/schema.sql`, `ict-backend/sql/schema.sql`, `project-backend/sql/schema.sql`, `lead-backend/sql/schema.sql`
- Infra: `docker-compose.yml`, `nginx/default.conf`
