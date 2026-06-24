# Yamuna Infra — Agent (Channel Partner) Management System

**Build blueprint + single source of truth** for the new **Agent Management
System (AMS)**. Same spirit as `contextadmin.md`: build **one module at a time,
end-to-end** (migration → backend → admin UI → agent UI → smoke test), then tick
it off here.

> Read this **before** starting or resuming any AMS module. Conversation context
> may be compressed; this file is the contract.

---

## 0. What this is (in one paragraph)

A real-estate developer (Shri Yamuna Infra) sells flats/villas. **Agents** — also
called **Channel Partners / Brokers / Sales Executives** — bring buyers, run them
through a sales funnel (lead → site visit → booking), and earn **commission**.
The AMS lets the **admin** onboard & verify agents, publish sellable inventory,
route & track leads, schedule site visits, convert leads into bookings (which
plug into the **existing resident/property/payment-plan system**), compute
commissions, and process payouts. Agents get their **own login surface** to do
all the field work and see their earnings.

This sits **inside the same one backend** (`infra/server`, shared MySQL) and the
**same admin portal** (`infra-website`), plus a **new agent-facing surface**
(see decision D1 below).

---

## 1. Ground rules (inherited from the existing build)

- **One backend** = existing Express `infra/server` + shared MySQL. Add new
  routes under `/api/admin/agents/*` (admin side) and `/api/agent/*` (agent
  self-service side). **Do NOT** start a second backend.
- **Admin UI** = existing `infra-website` (React + Vite + **JSX, no TS** +
  Tailwind). Reuse the component library: `DataTable`, `FormModal` (+`Field`,
  `inputClass`), `ConfirmDialog`, `StatusBadge`, `PageHeader`, `SearchBar`,
  `Pagination`, `StatCard`, `ImageUploader`, `Toast`.
- **Everything dynamic**: anything an agent or the app sees is admin-managed
  (CRUD + enable/disable + ordering + images).
- **Migrations**: continue the numbered, **idempotent** SQL pattern in
  `infra/server/migrations/`. Next free number is **`053_*`** (last existing =
  `052_site_overview.sql`). Use the MySQL-8 `information_schema` guard style
  already used in `045`/`046` for `ADD COLUMN`.
- **Backend layering** (unchanged): `migration → Model (pure DB) → Controller
  (thin, asyncHandler + success()) → Route (Joi validate + requireAdmin/auth)`,
  mount sub-router in `routes/adminRoutes.js` (admin) or `routes/index.js`
  (agent self-service).
- **DB→API casing**: models alias snake_case columns to **camelCase**
  (`image_url AS imageUrl`), exactly like `AdminServiceModel`.
- **Money**: `DECIMAL(15,2)`. **Images**: Cloudinary signed upload (existing
  `/api/admin/media/sign` + `lib/cloudinary.js`). **Audit**: every admin write
  is already auto-logged by `middleware/auditLog.js`.
- **Secrets** stay server-side (Cashfree, NVIDIA, SMTP). Reuse `emailService`,
  `smsService`, `cashfreeService`, `aiService`/`vectorStore`, `invoiceService`.

---

## 2. Personas & roles

| Persona | Surface | Notes |
|---|---|---|
| **Superadmin / Manager** | Admin portal | Full AMS control; approve agents, configure commission, approve payouts. Reuses existing admin roles. |
| **Sales Admin / CRM ops** | Admin portal | New optional admin role `sales` (or reuse `manager`) — manages leads & visits, cannot touch money. |
| **Agent (Channel Partner)** | **Agent portal** | Own login; submits leads, books visits, sees pipeline + earnings. |
| **Agent sub-user / team** | Agent portal | (Phase 5, optional) an agency with multiple executives under one partner. |

**RBAC plan**
- Admin side: reuse `requireAdmin(['superadmin','manager'])` for writes; reads
  `requireAdmin()`. Add `'sales'` to the allowed set for lead/visit modules.
  Money modules (commission/payout) stay `['superadmin','manager']`.
- Agent side: **new** `requireAgent` middleware + **new** `agentJwt` (separate
  secret, `type:'agent'` claim) — mirrors `requireAdmin`/`signAdminToken` so the
  three auth domains (resident / admin / agent) can never be confused.

---

## 3. Decisions to confirm before Phase 1 code

| # | Decision | Recommendation / status | Impact |
|---|---|---|---|
| **D1** | Agent-facing surface | ✅ **DECIDED: inside `infra-website`, role-gated.** Agents log in to the **same web app** via a separate `/agent/login`, get their own `agentJwt` auth domain (`type:'agent'`) and a separate `AgentAuthContext`. Agent routes live under `/agent/*` with their own layout; admin routes stay as-is. The two never share a screen. | Whole agent UI lives in `infra-website/src/pages/agent/*` + `layouts/AgentLayout.jsx`. |
| **D2** | Does AMS booking replace, or feed, the existing resident booking? | **Feed**: an AMS booking, once *approved*, **creates** a `user`(buyer) + `user_property` + (optionally) a `property_payment_plan`, linking the two systems. | Ties commission to a real property; avoids duplicate buyer records. |
| **D3** | Commission base | **Configurable per project + agent tier** (flat ₹, % of deal value, or slab). | Phase 4 rules engine. |
| **D4** | Inventory source | **New `projects`/`units` AMS tables** (developer's sellable stock), separate from `investment_projects` (marketing) and `user_properties` (owned). | Phase 2. |
| **D5** | Lead de-dup window | **90 days** ownership lock on a phone/email once an agent registers a lead. | Phase 2 Module 6. |

> Until D1 is confirmed, write Phase 1 backend (auth/onboarding) first — it is
> identical regardless of surface — and scaffold the agent UI under the chosen
> option.

---

## 4. Phase & module map (the whole plan)

Legend: ⬜ planned · 🟡 in progress · ✅ done

### PHASE 1 — Foundation & Agent Lifecycle
| # | Module | Status |
|---|---|---|
| 1.1 | Agent Auth & RBAC (`agentJwt`, `requireAgent`, login/register, password) | 🟡 code done, needs migrate + smoke test |
| 1.2 | Agent Onboarding & Registration (self-apply + admin-create) | 🟡 code done, needs migrate + smoke test |
| 1.3 | Agent KYC & Verification (docs upload + approve/reject workflow) | 🟡 code done, needs migrate + smoke test |
| 1.4 | Agent Directory & Profiles (admin list/search/filter/status) | 🟡 code done, needs migrate + smoke test |
| 1.5 | Agent Tiers, Types & Categories (channel-partner/broker/in-house; tier slabs) | 🟡 code done, needs migrate + smoke test |
| 1.6 | Admin AMS Dashboard (agents, leads, bookings, payout KPIs) | 🟡 code done, needs migrate + smoke test |
| 1.7 | Agent Self Dashboard (their leads/visits/earnings snapshot) | 🟡 code done, needs migrate + smoke test |
| 1.8 | Agent Bank/Payout details & GST/PAN (TDS profile) | 🟡 code done, needs migrate + smoke test |
| 1.9 | Agent Activity & Audit log | 🟡 code done, needs migrate + smoke test |

### PHASE 2 — Inventory & Lead Management (the sales engine)
| # | Module | Status |
|---|---|---|
| 2.1 | Projects & Inventory Catalog (projects → towers → units) | 🟡 code done, needs migrate + smoke test |
| 2.2 | Unit availability & hold/block management | 🟡 code done, needs migrate + smoke test |
| 2.3 | Lead Capture & Submission (agent registers a buyer/enquiry) | 🟡 code done, needs migrate + smoke test |
| 2.4 | Lead Assignment & Routing (manual + rules) | 🟡 code done, needs migrate + smoke test |
| 2.5 | Lead Pipeline / Funnel (stages + drag, status history) | 🟡 code done, needs migrate + smoke test |
| 2.6 | Lead De-duplication & Ownership lock (D5) | 🟡 code done, needs migrate + smoke test |
| 2.7 | Follow-ups, Tasks & Reminders | 🟡 code done, needs migrate + smoke test |
| 2.8 | Lead Notes, Activity timeline & Documents | 🟡 code done, needs migrate + smoke test |
| 2.9 | Lead Analytics & conversion reports | 🟡 code done, needs migrate + smoke test |

### PHASE 3 — Site Visits & Bookings
| # | Module | Status |
|---|---|---|
| 3.1 | Site Visit scheduling (agent books for a lead) | 🟡 code done, needs migrate + smoke test |
| 3.2 | Visit calendar, slots & admin confirmation | 🟡 code done, needs migrate + smoke test |
| 3.3 | Visit check-in / attendance / outcome | 🟡 code done, needs migrate + smoke test |
| 3.4 | Booking / Sale creation (convert lead → booking) | 🟡 code done, needs migrate + smoke test |
| 3.5 | Booking approval & documentation (agreement, docket) | 🟡 code done, needs migrate + smoke test |
| 3.6 | Link approved booking → resident + property + payment plan (D2) | 🟡 code done, needs migrate + smoke test |
| 3.7 | Cancellation, hold-release & re-booking | 🟡 code done, needs migrate + smoke test |
| 3.8 | Booking & sales reports | 🟡 code done, needs migrate + smoke test |

### PHASE 4 — Commission, Payouts & Performance
| # | Module | Status |
|---|---|---|
| 4.1 | Commission rules engine (per project/tier; flat/%/slab) | 🟡 code done, needs migrate + smoke test |
| 4.2 | Commission calculation & ledger (auto on booking approval) | 🟡 code done, needs migrate + smoke test |
| 4.3 | Payout requests & multi-step approval | 🟡 code done, needs migrate + smoke test |
| 4.4 | Payout processing, TDS, statements & invoices | 🟡 code done, needs migrate + smoke test |
| 4.5 | Targets & Incentive schemes | 🟡 code done, needs migrate + smoke test |
| 4.6 | Leaderboard & gamification | 🟡 code done, needs migrate + smoke test |
| 4.7 | Performance analytics & reports (CSV export) | 🟡 code done, needs migrate + smoke test |

### PHASE 5 — Communication, Marketing & Advanced
| # | Module | Status |
|---|---|---|
| 5.1 | Notifications & broadcast to agents (reuse A14 fan-out) | 🟡 code done, needs migrate + smoke test |
| 5.2 | Marketing collateral / brochure library (downloads) | 🟡 code done, needs migrate + smoke test |
| 5.3 | Training & resource center | 🟡 code done, needs migrate + smoke test |
| 5.4 | Announcements & news feed | 🟡 code done, needs migrate + smoke test |
| 5.5 | Agent support / ticketing | 🟡 code done, needs migrate + smoke test |
| 5.6 | WhatsApp / Email / SMS lead-nurture integration | 🟡 code done, needs migrate + smoke test |
| 5.7 | AI assistant for agents (reuse RAG: pricing, FAQs, scripts) | 🟡 code done, needs migrate + smoke test |
| 5.8 | BI dashboards & scheduled report exports | 🟡 code done, needs migrate + smoke test |
| 5.9 | Settings, feature flags & production hardening | 🟡 code done, needs migrate + smoke test |

---

## 5. Data model overview (tables introduced, by phase)

> All tables `ENGINE=InnoDB`, `id BIGINT UNSIGNED AUTO_INCREMENT`, `created_at`/
> `updated_at` timestamps, FK `ON DELETE` chosen per relationship. Names below
> are the proposed canonical names — finalize at migration time.

**Phase 1**
- `agents` — core profile (name, phone, email, type, tier_id, status
  `pending|active|suspended|rejected`, referral_code, password_hash, kyc_status,
  bank/PAN/GST, created_source).
- `agent_tiers` — tier/category config (name, code, default commission rule ref,
  perks, sort_order, is_active).
- `agent_documents` — KYC files (type: pan/aadhaar/gst/rera/cheque/agreement,
  url, status, reviewed_by, reject_reason).
- `agent_sessions`/OTP — reuse existing `otps` table (it already holds email),
  no new table needed.

**Phase 2**
- `projects` — sellable developments (name, location, status, rera_no, images,
  price_range, is_active, sort_order).
- `project_towers` — blocks/phases within a project.
- `units` — inventory rows (project_id, tower_id, unit_no, floor, type/BHK,
  area_sqft, base_price, facing, status `available|held|blocked|booked|sold`,
  hold_until, held_by_agent).
- `leads` — buyer/enquiry (agent_id owner, name, phone, email, source,
  project_id interest, budget, stage, status, dedupe_key, owner_lock_until).
- `lead_stage_history` — every stage change (from→to, by, at, note).
- `lead_activities` — notes/calls/tasks timeline (type, body, due_at, done).
- `lead_documents` — attachments per lead.

**Phase 3**
- `site_visits` — lead_id, agent_id, project_id, unit_id?, scheduled_at, slot,
  status `requested|confirmed|completed|no_show|cancelled`, outcome, feedback.
- `agent_bookings` — the AMS sale record (lead_id, agent_id, unit_id, buyer
  snapshot, deal_value, booking_amount, status `pending|approved|cancelled`,
  approved_by, linked_user_id, linked_property_id).
- `agent_booking_documents` — agreement/docket files.

**Phase 4**
- `commission_rules` — scope (project_id?/tier_id?), type `flat|percent|slab`,
  value/JSON slabs, effective dates, is_active.
- `commission_ledger` — one row per earning event (agent_id, booking_id,
  amount, status `accrued|approved|paid|reversed`, rule snapshot).
- `payout_requests` — agent_id, amount, ledger_ids JSON, status
  `requested|approved|processing|paid|rejected`, tds, net, txn_ref.
- `agent_targets` — period targets (agent_id/tier, metric, target, achieved).
- `incentive_schemes` — bonus rules + claims.

**Phase 5**
- `agent_notifications` (or reuse `notifications` with an `audience='agent'` tag
  + a batch table mirror), `agent_resources` (collateral/training),
  `agent_announcements`, `agent_tickets` + `agent_ticket_messages`,
  `agent_ai_*` (reuse `ai_knowledge_sources`/`ai_chunks` with an `audience`).

---

## 6. Per-module delivery checklist (repeat for every module)

Exactly the existing project rhythm:

1. **Migration** `0NN_agent_<module>.sql` — tables / columns + seed, idempotent.
2. **Backend Model** (`models/Agent<Thing>Model.js`) — pure DB, camelCase aliases.
3. **Backend Controller** (`controllers/admin*` and/or `agent*`) — thin,
   `asyncHandler` + `success()` + `AppError`.
4. **Backend Routes** — Joi `validate({ body })` + `requireAdmin(roles)` /
   `requireAgent`; mount in `routes/adminRoutes.js` (`/agents`) and/or
   `routes/index.js` (`/agent`).
5. **Backend smoke test** — REST client / curl: happy path + 401/403 + validation
   + edge (dedupe, hold conflict, etc.). Revert test mutations.
6. **Admin UI page(s)** under `infra-website/src/pages/agents/...`, routed in
   `App.jsx`, nav entry in `AdminLayout.jsx` `MODULES`.
7. **Agent UI page(s)** on the chosen surface (D1).
8. **Manual end-to-end**: agent action → admin sees it → status flows back.
9. **Update this file**: tick the module, note endpoints + tables.

---

## 7. Proposed API surface (high level)

**Admin side — `/api/admin/agents/*`** (mount one sub-router
`routes/admin/agentsRoutes.js`, or split per phase):
```
GET   /agents                       list (search/status/tier/pagination)
POST  /agents                       admin-create agent
GET   /agents/:id                   detail (+docs, +stats)
PUT   /agents/:id                   update
POST  /agents/:id/status            approve / suspend / reject
POST  /agents/:id/kyc/:action       approve / reject a document
GET|POST /agents/tiers ...          tier CRUD
GET   /agents/leads ...             all leads (admin view) + assign
GET   /agents/visits ...            visit calendar + confirm
GET   /agents/bookings ...          approve / link to resident
GET|POST /agents/commission/rules   rules engine
GET   /agents/commission/ledger     ledger + adjustments
GET|POST /agents/payouts ...        approve / mark paid / statements
GET   /agents/stats/overview        AMS dashboard KPIs
```

**Agent self-service — `/api/agent/*`** (mount `routes/agentRoutes.js`, gated by
`requireAgent`):
```
POST  /auth/register | /auth/send-otp | /auth/verify-otp | /auth/login
GET   /me  | PUT /me  | POST /me/kyc (upload)  | PUT /me/bank
GET   /projects | /projects/:id/units            (only active/available)
GET|POST /leads | PUT /leads/:id | POST /leads/:id/activity
GET|POST /visits
GET|POST /bookings
GET   /commission | /payouts | POST /payouts (request)
GET   /dashboard | /notifications | /resources | /leaderboard
POST  /support (ticket)
```

---

## 8. Frontend layout (admin portal)

New sidebar group in `AdminLayout.jsx` `MODULES` (suggest one collapsible
"Agents (CRM)" section or top-level entries):
```
{ path: '/agents',            label: 'Agents',          icon: '🤝' },
{ path: '/agents/leads',      label: 'Leads / CRM',     icon: '📇' },
{ path: '/agents/inventory',  label: 'Inventory',       icon: '🏢' },
{ path: '/agents/visits',     label: 'Site Visits',     icon: '📅' },
{ path: '/agents/bookings',   label: 'Agent Bookings',  icon: '🧾' },
{ path: '/agents/commission', label: 'Commission',      icon: '💰', roles: ['superadmin','manager'] },
{ path: '/agents/payouts',    label: 'Payouts',         icon: '🏦', roles: ['superadmin','manager'] },
```
Pages live under `infra-website/src/pages/agents/<area>/*.jsx`, mirroring how
`pages/services/`, `pages/food/` are organized (list → drill-down → detail).

---

## 9. Build order & dependencies

```
Phase 1  (1.1 → 1.9)   ← must be first; everything keys off `agents`
   └─ Phase 2          ← needs agents + inventory; CRM core
        └─ Phase 3     ← needs leads + units (visit & booking)
             └─ Phase 4 ← needs bookings (commission) + agent bank (1.8)
   └─ Phase 5          ← cross-cutting; build incrementally any time after P1
```
Hard prerequisites: 1.1 (auth) before any agent UI; 2.1 (inventory) before 2.3
(leads link to projects) and 3.4 (booking needs a unit); 3.4/3.5 before 4.2
(commission accrues on approved booking); 1.8 (bank) before 4.4 (payout).

---

## 10. Acceptance criteria per phase (definition of done)

- **P1 done** = an agent can be created/self-register, upload KYC, be
  approved, and log into the agent surface; admin sees them in a searchable
  directory with tier + status; both dashboards render real counts.
- **P2 done** = agent submits a lead (dedupe enforced), it appears in admin CRM,
  can be assigned, moves through pipeline stages with history, has follow-ups +
  notes; conversion report shows funnel counts.
- **P3 done** = a lead gets a confirmed site visit, then is converted to an
  agent_booking; on admin approval it creates a buyer + property (D2) and is
  visible in the existing resident system.
- **P4 done** = an approved booking auto-accrues commission per the configured
  rule; agent raises a payout; admin approves → marks paid with TDS; statement +
  invoice generated; leaderboard + targets reflect it.
- **P5 done** = agents receive broadcasts, download collateral, raise support
  tickets, query the AI assistant; admin exports BI reports.

---

## 11. How to run (unchanged from existing setup)

```
# backend
cd infra/server && node src/server.js          # :4000, shared MySQL

# admin portal
cd infra-website && npm run dev                 # :5173, proxy /api → :4000

# agent portal (after D1, if separate app)
cd infra-agent && npm run dev                   # :5174, proxy /api → :4000
```
Migrations run via the existing `infra/server/src/scripts/migrate.js`
(`schema_migrations` tracker — each file runs once).

---

## 12. Status log (update as we build)

- _2026-06-23_ — Documentation drafted. **D1 decided** = agent UI inside
  `infra-website`, role-gated, own `agentJwt` domain.
- _2026-06-23_ — **Module 1.1 — Agent Auth & RBAC coded** (see §13). Pending:
  apply migration `053` + `npm install` + end-to-end smoke test on a machine
  with deps / DB access.

---

## 13. Module 1.1 — Agent Auth & RBAC (build record)

**Backend (`infra/server`)**
- `migrations/053_agent_auth.sql` — `agent_tiers` (Silver/Gold/Platinum seeded) +
  `agents` (email/password login, status, kyc_status, tier FK). Seeds a default
  **active** test agent.
- `config/env.js` → `agentJwt` (secret `AGENT_JWT_SECRET` || `JWT_SECRET`, 7d).
- `middleware/requireAgent.js` — `signAgentToken()` + `requireAgent()`
  (verifies `type:'agent'` claim). Mirrors `requireAdmin`.
- `models/AgentModel.js`, `services/agentAuthService.js`,
  `controllers/agentAuthController.js`.
- `routes/agent/authRoutes.js` → mounted by `routes/agentRoutes.js` →
  `routes/index.js` `router.use('/agent', …)`. Auth rate-limiter added in
  `app.js` for `/api/agent/auth`.

**Endpoints (live after migrate)**
```
POST /api/agent/auth/register          public — creates a 'pending' agent
POST /api/agent/auth/login             public — only 'active' agents get a token
GET  /api/agent/auth/me                requireAgent — full profile
POST /api/agent/auth/change-password   requireAgent
```

**Frontend (`infra-website`)**
- `lib/agentApi.js` (own `agent_token` + `agent-unauthorized` event),
  `context/AgentAuthContext.jsx`, `components/AgentProtected.jsx`,
  `layouts/AgentLayout.jsx` (sidebar + change-password + logout).
- `pages/agent/auth/AgentLogin.jsx`, `pages/agent/auth/AgentRegister.jsx`,
  `pages/agent/AgentDashboard.jsx`.
- `App.jsx` — single `<Routes>` with two pathless **auth-shell** layout routes
  (`AdminShell`/`AgentShell`) so admin + agent contexts are isolated. Agent
  routes: `/agent/login`, `/agent/register`, `/agent` (protected dashboard).

**Seed login (test):** `agent@yamunainfra.com` / `Admin@123` (Gold tier, active).
Change after first login.

**To finish 1.1 (run on a deps/DB machine):**
```
cd infra/server && npm install && node src/scripts/migrate.js   # applies 053
node src/server.js                                              # :4000
cd ../../infra-website && npm install && npm run dev            # :5173
# Smoke: open /agent/login → sign in with the seed agent → dashboard.
#  - register a new agent → expect 'pending' → login blocked (403).
#  - GET /agent/auth/me with token → profile. change-password → revert.
```

---

## 14. Modules 1.2 / 1.4 / 1.5 — Admin Agent management (build record)

Built together (one cohesive admin screen-set): **admin-create onboarding (1.2)**,
**directory (1.4)**, **tiers (1.5)**. Self-registration was already shipped in 1.1.

**Backend (`infra/server`)** — no new migration (reuses `agents`/`agent_tiers`):
- `models/AdminAgentModel.js` — tiers CRUD (delete blocked if agents use it);
  agents list (search/status/tier + pagination), getById, admin-create (bcrypt +
  auto referral code, default status `active`), update, setStatus
  (approve/suspend/reject + reason), resetPassword, remove, stats().
- `controllers/adminAgentController.js`, `routes/admin/agentsRoutes.js` mounted
  `/api/admin/agents` in `routes/adminRoutes.js`. Writes = manager+super.

**Endpoints**
```
GET    /api/admin/agents/tiers              GET/POST/PUT/DELETE  tier CRUD
GET    /api/admin/agents/stats              KPI counts
GET    /api/admin/agents                    list (search/status/tierId/page)
POST   /api/admin/agents                    admin-create
GET    /api/admin/agents/:id                detail
PUT    /api/admin/agents/:id                update
POST   /api/admin/agents/:id/status         approve/suspend/reject {status,reason}
POST   /api/admin/agents/:id/reset-password {newPassword}
DELETE /api/admin/agents/:id
```

**Frontend (`infra-website`)**
- `pages/agents/AgentsList.jsx` (KPI cards, search, status filter chips, table,
  pagination), `AgentFormModal.jsx` (admin create/edit + tier dropdown +
  ImageUploader), `AgentDetail.jsx` (profile, approve/suspend/reject w/ reason,
  reset password, edit, delete), `AgentTiers.jsx` (tier CRUD).
- Nav: `AdminLayout.jsx` MODULES → "Agents (CRM)" (🤝). Routes in `App.jsx`:
  `/agents`, `/agents/tiers`, `/agents/:id` (added to `BUILT`).

**Next:** Module 1.3 — Agent KYC (document upload + review), then 1.6/1.7
dashboards + 1.8 bank details. Then Phase 2 (inventory + leads).

---

## 15. Module 1.3 — Agent KYC & Verification (build record)

**Backend (`infra/server`)**
- `migrations/054_agent_kyc.sql` — `agent_documents` (doc_type pan/aadhaar/gst/
  rera/cheque/agreement/photo/other, url, status pending/approved/rejected,
  reject_reason, reviewed_by/at) + `agents.kyc_reviewed_at` / `kyc_reject_reason`.
- `models/AgentDocumentModel.js` — shared by admin + agent sides: list, getById,
  create, review (per-doc), remove, `markPending(agentId)`,
  `setKyc(agentId, status, reason)`. `AgentModel.findById` now returns
  `kycRejectReason`.
- Admin: `adminAgentController` (+`listDocuments`, `addDocument`, `reviewDocument`,
  `deleteDocument`, `setKyc`) + routes in `routes/admin/agentsRoutes.js`.
- Agent: `controllers/agentKycController.js` + `routes/agent/kycRoutes.js` mounted
  `/api/agent/kyc` (ownership-checked: agent edits only own pending docs).

**Endpoints**
```
# admin
GET    /api/admin/agents/:id/documents
POST   /api/admin/agents/:id/documents              {docType,label,url}
POST   /api/admin/agents/:id/kyc                    {status,reason}  (overall)
POST   /api/admin/agents/documents/:docId/review    {status,reason}  (per-doc)
DELETE /api/admin/agents/documents/:docId
# agent self-service (requireAgent)
GET    /api/agent/kyc                                {kycStatus, documents}
POST   /api/agent/kyc                                {docType,label,url} → kyc pending
DELETE /api/agent/kyc/:docId                         (own, pending only)
```

**Frontend (`infra-website`)**
- Admin: `pages/agents/AgentKycPanel.jsx` (doc list, per-doc approve/reject w/
  reason, add-on-behalf, overall Approve/Reject KYC) embedded in `AgentDetail`.
- Agent: `pages/agent/AgentKyc.jsx` (upload docs via ImageUploader/link, see
  statuses, remove pending), nav "KYC" in `AgentLayout`, route `/agent/kyc`,
  + a KYC reminder banner on `AgentDashboard`.

---

## 16. Module 1.8 — Bank / Payout details (build record)

**Backend (`infra/server`)**
- `migrations/055_agent_bank.sql` — `agent_bank_details` (1:1, PK agent_id;
  account holder/number/IFSC/bank/branch/type/UPI + `verified`/by/at). PAN/GST
  stay on `agents`. Any edit resets `verified` (re-verify before paying).
- `models/AgentBankModel.js` — get, upsert (resets verified), setVerified,
  updateTaxIds (PAN/GST on agents).
- Agent: `controllers/agentBankController.js` + `routes/agent/bankRoutes.js`
  mounted `/api/agent/bank` (GET payout profile, PUT upsert + PAN/GST).
- Admin: `adminAgentController` (+`getBank`, `updateBank`, `verifyBank`) +
  routes in `routes/admin/agentsRoutes.js`.

**Endpoints**
```
# agent
GET /api/agent/bank        PUT /api/agent/bank   {bank fields + pan,gst}
# admin
GET  /api/admin/agents/:id/bank
PUT  /api/admin/agents/:id/bank
POST /api/admin/agents/:id/bank/verify   {verified}
```

**Frontend (`infra-website`)**
- Agent: `pages/agent/AgentBank.jsx` (bank form + TDS PAN/GST + verified badge),
  nav "Bank & Payout" 🏦, route `/agent/bank`.
- Admin: `pages/agents/AgentBankPanel.jsx` (masked account no., verify/un-verify)
  embedded in `AgentDetail`.

**Next:** Module 1.6 (admin AMS dashboard) + 1.7 (agent dashboard real KPIs) once
Phase 2/3/4 data exists, and 1.9 (agent audit). Or jump to **Phase 2** (inventory
+ leads) — the sales engine.

---

## 17. Module 2.1 — Projects & Inventory Catalog (build record)

**Backend (`infra/server`)**
- `migrations/056_agent_inventory.sql` — `projects`, `project_towers`, `units`
  (status available/held/blocked/booked/sold; `hold_until`/`held_by_agent_id`
  columns pre-added for Module 2.2). FK cascade project→towers→units; tower
  delete sets unit.tower_id NULL.
- `models/AdminProjectModel.js` — projects CRUD (+tower/unit/available counts),
  projectStats, towers CRUD, units CRUD (+ `bulkCreateUnits` floor-plan
  generator + `setUnitStatus`).
- `controllers/adminInventoryController.js` + `routes/admin/inventoryRoutes.js`
  mounted `/api/admin/inventory`. Writes = manager+super.
- Agent read-only: `models/AgentProjectModel.js` (active projects, available/held
  units only) + `controllers/agentProjectController.js` +
  `routes/agent/projectsRoutes.js` mounted `/api/agent/projects`.

**Endpoints**
```
# admin
GET/POST              /api/admin/inventory                 projects (+?search,status)
GET/PUT/DELETE        /api/admin/inventory/:id             project (+stats,towers on GET)
GET/POST              /api/admin/inventory/:id/towers
PUT/DELETE            /api/admin/inventory/towers/:towerId
GET/POST              /api/admin/inventory/:id/units       (+?towerId,status,search)
POST                  /api/admin/inventory/:id/units/bulk  floor-plan generator
PUT/DELETE            /api/admin/inventory/units/:unitId
POST                  /api/admin/inventory/units/:unitId/status
# agent
GET /api/agent/projects   GET /:id   GET /:id/units
```

**Frontend (`infra-website`)**
- Admin: `pages/agents/inventory/Projects.jsx` (list + CRUD + cover image),
  `ProjectInventory.jsx` (status stat-cards, towers manage, units table with
  inline status dropdown, add unit, **bulk add**, edit, delete). Nav "Inventory"
  🏢; routes `/agents/inventory`, `/agents/inventory/:projectId`.
- Agent: `pages/agent/AgentInventory.jsx` (project cards → available units),
  nav "Inventory", route `/agent/inventory`.

**Next:** Module 2.2 (unit hold/block) then 2.3 (lead capture) — leads reference
projects + units from here.

---

## 18. Module 2.2 — Unit availability & hold/block (build record)

No new migration (uses `units.status` + `hold_until` + `held_by_agent_id` from 056).

**Backend (`infra/server`)**
- `AdminProjectModel` — `releaseExpiredHolds()` (held + past `hold_until` → available;
  called before every unit list/stat read, so no cron needed), `holdUnit(id,
  {hours=48, agentId})` (conditional UPDATE on `status='available'` — race-safe),
  `releaseUnit(id)`, `blockUnit(id)`; `setUnitStatus` now clears hold fields when
  status ≠ held; `getUnit` returns `heldByAgentId`/`holdUntil`.
- Admin endpoints: `POST /api/admin/inventory/units/:unitId/hold|block|release`.
- Agent endpoints (own holds only): `POST /api/agent/projects/units/:unitId/hold`
  (48h, `held_by_agent_id` = caller), `.../release` (403 unless caller owns it).

**Frontend (`infra-website`)**
- Admin `ProjectInventory.jsx` — per-unit Hold / Block / Release quick actions +
  "Hold until" column.
- Agent `AgentInventory.jsx` — "Hold 48h" on available units, "Release" on units
  held by you; status shows "held by you".

**Next:** Module 2.3 — Lead Capture (agent registers a buyer; lead references a
project + optional unit; dedupe in 2.6).

---

## 19. Module 2.3 — Lead Capture & Submission (build record)

**Backend (`infra/server`)**
- `migrations/057_agent_leads.sql` — `leads` (agent_id, name/phone/email, source,
  project_id, unit_id, budget, requirement, **stage** new/contacted/site_visit/
  negotiation/booked/lost, lost_reason, notes). Pre-added for later modules:
  `dedupe_key` (2.6), `owner_lock_until` (2.6), `assigned_admin_id` (2.4),
  `last_activity_at` (2.7). FKs to agents/projects/units ON DELETE SET NULL.
- `utils/lead.js` — shared `STAGES` + `dedupeKey(phone)` (last-10-digits normalize).
- Agent: `models/AgentLeadModel.js` (own leads only), `agentLeadController`,
  `routes/agent/leadsRoutes.js` mounted `/api/agent/leads`.
- Admin: `models/AdminLeadModel.js` (all leads + agent/project joins + stats +
  pagination), `adminLeadController`, `routes/admin/leadsRoutes.js` mounted
  `/api/admin/leads`. Writes = superadmin/manager/sales.

**Endpoints**
```
# agent (own)
GET/POST /api/agent/leads   GET/PUT /api/agent/leads/:id   POST /:id/stage
# admin (all)
GET /api/admin/leads (+search,stage,agentId,projectId,page)  GET /stats
POST /api/admin/leads   GET/PUT/DELETE /:id   POST /:id/stage
```

**Frontend (`infra-website`)**
- Agent: `pages/agent/leads/AgentLeads.jsx` (list, stage filter, create/edit with
  project→unit dependent dropdowns, inline stage change). Nav "My Leads", route
  `/agent/leads`.
- Admin: `pages/agents/leads/Leads.jsx` (stage stat-cards, search + agent +
  stage filters, pagination, create/edit with agent+project+unit selects, inline
  stage, delete). Nav "Leads / CRM" 📇, route `/agents/leads`.

**Next:** 2.4 (assignment/routing) · 2.5 (pipeline board + stage history) ·
2.6 (dedupe + 90-day ownership lock — columns already in place).

---

## 20. Module 2.6 — Lead De-dup & Ownership lock (build record)

No migration (uses `dedupe_key` + `owner_lock_until` from 057).

**Backend (`infra/server`)**
- `models/LeadDedupeModel.js` — `LOCK_DAYS = 90`; `findLock(dedupeKey, exceptId)`
  returns the active locking lead (not lost, `owner_lock_until` in future).
- `AgentLeadModel`/`AdminLeadModel` `create` now stamp
  `owner_lock_until = NOW() + 90 days` when a phone is present.
- Agent create/update **reject** (409) if the phone is locked to another agent
  (or already the agent's own lead). Admin create/update reject unless `force:true`
  (override), and the message names the owning agent + lead #.
- Check endpoints: `GET /api/agent/leads/check?phone=&exceptId=`
  (`{available, ownedByYou, lockedUntil}`) and `GET /api/admin/leads/check`
  (adds `agentName`, `leadId`).

**Frontend (`infra-website`)**
- Agent `AgentLeads.jsx` — phone field on-blur check shows a ⚠ hint (already
  yours / another partner). Hard 409 still guards submit.
- Admin `Leads.jsx` — on-blur duplicate panel naming the owning agent + lead #,
  with an "Override and save anyway" checkbox → sends `force:true`.

**Next (per your order):** 2.5 (pipeline board + stage history) → 2.4 (assignment).

---

## 21. Module 2.5 — Lead Pipeline / Funnel (build record)

**Backend (`infra/server`)**
- `migrations/058_lead_stage_history.sql` — `lead_stage_history` (lead_id,
  from/to stage, changed_by_type agent|admin, changed_by_name, note).
- `models/LeadHistoryModel.js` — `record()` + `list(leadId)`.
- `setStage` (agent + admin) now reads the previous stage, applies the change,
  and records a history row with the actor (only when the stage actually moves).
- History endpoints: `GET /api/agent/leads/:id/history` (own) and
  `GET /api/admin/leads/:id/history`.

**Frontend (`infra-website`)**
- Shared `components/PipelineBoard.jsx` (6 stage columns, per-card move dropdown +
  history button) and `components/LeadHistoryModal.jsx` (timeline drawer).
- Admin `pages/agents/leads/Pipeline.jsx` (all leads, shows agent on cards) — nav
  "Pipeline" 📊, route `/agents/pipeline` + "List view" toggle.
- Agent `pages/agent/leads/AgentPipeline.jsx` (own leads) — nav "Pipeline", route
  `/agent/pipeline`.

**Next:** Module 2.4 — Lead Assignment & Routing (admin assigns/reassigns a lead
to an agent; `assigned_admin_id` / agent reassignment).

---

## 22. Module 2.4 — Lead Assignment & Routing (build record)

**Backend (`infra/server`)**
- `migrations/059_lead_assignment.sql` — `leads.assigned_at` (idempotent guard).
- `AdminLeadModel.assign(id, agentId, adminId)` (assign / reassign / unassign with
  `agentId=null`; stamps `assigned_admin_id` + `assigned_at`); list now supports an
  `unassigned=true` filter (`agent_id IS NULL`).
- `adminLeadController.assign` + `POST /api/admin/leads/:id/assign {agentId}`.
  (Who assigned is captured by the existing admin audit-log middleware.)

**Frontend (`infra-website`)**
- Admin `Leads.jsx` — per-row **Assign / Reassign** action (modal: pick agent or
  "— Unassign —") + an **"Unassigned"** filter toggle (disables the agent filter).

> Auto-routing rules (round-robin, by-project) noted as a future enhancement;
> manual assignment is the core and is complete.

**Phase 2 core complete (2.1–2.6).** Remaining Phase 2: 2.7 (follow-ups/tasks),
2.8 (notes/timeline/docs), 2.9 (analytics). Or move to **Phase 3** (site visits →
bookings), the conversion half of the funnel.

> **Sequencing decision:** no hard linkage from Phase 3 to 2.7/2.8/2.9. Doing
> 2.7 + 2.8 now to finish the CRM cleanly; **2.9 (analytics) is deferred until
> after Phase 3** because the conversion funnel needs site-visit + booking data
> to be meaningful.

---

## 23. Module 2.7 — Follow-ups, Tasks & Reminders (build record)

**Backend (`infra/server`)**
- `migrations/060_lead_tasks.sql` — `lead_tasks` (lead_id, agent_id, title, notes,
  due_at, is_done/done_at, created_by_type/name).
- `models/LeadTaskModel.js` — `listByLead`, `listByAgent(agentId, status)` (status
  pending|overdue|done|all), `create`, `setDone`, `remove`.
- Agent: `agentTaskController` + `routes/agent/tasksRoutes.js` (`/api/agent/tasks`)
  + per-lead create/list in `routes/agent/leadsRoutes.js`
  (`/api/agent/leads/:id/tasks`). Ownership-checked.
- Admin: task endpoints in `adminLeadController` + `routes/admin/leadsRoutes.js`
  (`/:id/tasks`, `/tasks/:taskId/done`, `DELETE /tasks/:taskId`). Admin-created
  tasks inherit the lead's `agent_id` so they show in that agent's list.

**Endpoints**
```
# agent
GET /api/agent/tasks?status=    POST /api/agent/tasks/:taskId/done   DELETE /:taskId
GET/POST /api/agent/leads/:id/tasks
# admin
GET/POST /api/admin/leads/:id/tasks   POST /api/admin/leads/tasks/:taskId/done   DELETE .../tasks/:taskId
```

**Frontend (`infra-website`)**
- Shared `components/LeadTasksModal.jsx` (add task + due datetime + done/delete,
  overdue highlight) used by both portals.
- Agent: `pages/agent/tasks/AgentTasks.jsx` (pending/overdue/done filters across
  all leads) — nav "Follow-ups" ✅, route `/agent/tasks`; plus a "Tasks" action
  per lead in `AgentLeads`.
- Admin: "Tasks" row action in `Leads.jsx` opens the modal.

**Next:** Module 2.8 — Lead Notes & Activity timeline (+ documents).

---

## 24. Module 2.8 — Lead Notes, Activity & Documents (build record)

**Backend (`infra/server`)**
- `migrations/061_lead_notes_docs.sql` — `lead_notes` (body, by_type/name) +
  `lead_documents` (label, url, by_type/name).
- `models/LeadNoteModel.js` + `models/LeadDocModel.js` (list/getById/create/remove).
- Agent (own leads): notes/docs CRUD in `agentLeadController` +
  `routes/agent/leadsRoutes.js` (`/:id/notes`, `/notes/:noteId`,
  `/:id/documents`, `/documents/:docId`).
- Admin: same in `adminLeadController` + `routes/admin/leadsRoutes.js`.

**Endpoints**
```
GET/POST  /api/{agent|admin}/leads/:id/notes      DELETE .../leads/notes/:noteId
GET/POST  /api/{agent|admin}/leads/:id/documents  DELETE .../leads/documents/:docId
```

**Frontend (`infra-website`)**
- Shared `components/LeadActivityModal.jsx` — tabs **Notes** (add/delete) +
  **Documents** (ImageUploader/link, view/delete).
- Wired as a "Notes" row action in admin `Leads.jsx` and agent `AgentLeads.jsx`.

**Full lead timeline now = stage history (2.5) + tasks (2.7) + notes/docs (2.8).**

**Phase 2 status:** 2.1–2.8 ✅. Only **2.9 (analytics) remains — deferred until
after Phase 3** (needs site-visit + booking data). → Proceeding to **Phase 3**.

---

## 25. Module 3.1 — Site Visit Scheduling (build record)

**Backend (`infra/server`)**
- `migrations/062_site_visits.sql` — `site_visits` (lead_id, agent_id, project_id,
  unit_id, scheduled_at, slot, status requested/confirmed/completed/no_show/
  cancelled; `checked_in_at`/`outcome`/`feedback` pre-added for 3.3).
- `models/AgentVisitModel.js` (own: list/getOwned/create/cancel) +
  `models/AdminVisitModel.js` (all: list+filters+pagination, getById, setStatus —
  sets `checked_in_at` on completed).
- Agent: `agentVisitController` + `routes/agent/visitsRoutes.js`
  (`/api/agent/visits`, create verifies lead ownership, inherits lead's
  project/unit). Admin: `adminVisitController` + `routes/admin/visitsRoutes.js`
  (`/api/admin/visits`, status update).

**Endpoints**
```
# agent
GET/POST /api/agent/visits   POST /api/agent/visits/:id/cancel
# admin
GET /api/admin/visits (+status,agentId,projectId,date,search,page)
GET /api/admin/visits/:id   POST /api/admin/visits/:id/status {status,outcome,feedback}
```

**Frontend (`infra-website`)**
- Agent: `pages/agent/visits/AgentVisits.jsx` (schedule modal w/ own-lead dropdown,
  status filters, cancel). Nav "Site Visits" 📅, route `/agent/visits`.
- Admin: `pages/agents/visits/Visits.jsx` (filters: status/agent/date/search,
  pagination, inline status dropdown). Nav "Site Visits", route `/agents/visits`.

**Next:** 3.2 (visit calendar + slots + admin confirm) · 3.3 (check-in/outcome) ·
3.4 (lead→booking conversion).

---

## 26. Module 3.2 — Visit Calendar, Slots & Confirmation (build record)

No migration (uses 062).

**Backend (`infra/server`)**
- `AdminVisitModel.stats()` (total / today / requested / confirmed / completed) +
  `GET /api/admin/visits/stats`.

**Frontend (`infra-website`)**
- `lib/visitSlots.js` — standard `VISIT_SLOTS`; agent schedule form now uses a
  slot dropdown.
- Admin `Visits.jsx` — stat cards, **List ⇄ Agenda** view toggle (agenda groups
  visits by day), one-click **Confirm** (requested→confirmed) and **Complete**
  (confirmed→completed) actions.

**Next:** 3.3 — Visit check-in / attendance / outcome.

---

## 27. Module 3.3 — Visit Check-in / Attendance / Outcome (build record)

No migration (uses `checked_in_at`/`outcome`/`feedback` from 062).

**Backend (`infra/server`)**
- `AgentVisitModel.checkIn` + `recordOutcome({status,outcome,feedback})` (own
  visits; completed stamps check-in). `AdminVisitModel.checkIn`.
- Agent: `POST /api/agent/visits/:id/checkin` + `/outcome` (status completed|no_show).
- Admin: `POST /api/admin/visits/:id/checkin` (+ existing `/status` carries
  outcome/feedback).

**Frontend (`infra-website`)**
- Shared `components/VisitOutcomeModal.jsx` (result completed/no_show + outcome +
  feedback).
- Admin `Visits.jsx` + agent `AgentVisits.jsx` — **Check-in** + **Outcome**
  actions on requested/confirmed visits; agenda shows a "✔ in" checked-in marker.

**Next:** 3.4 — Booking / Sale creation (convert a lead → booking, pick a unit).

---

## 28. Module 3.4 — Booking / Sale Creation (build record)

**Backend (`infra/server`)**
- `migrations/063_agent_bookings.sql` — `agent_bookings` (lead/agent/project/unit,
  buyer snapshot, deal_value, booking_amount, status pending/approved/cancelled;
  approved_by/at, cancel_reason; `linked_user_id`/`linked_property_id` for 3.6).
- `models/AgentBookingModel.js` — **transactional** `create`: locks the unit
  (`FOR UPDATE`), requires available or held-by-this-agent, flips it to `booked`,
  inserts the booking (pending), moves the lead to `booked` + stage-history row.
  Plus own list/getOwned.
- `models/AdminBookingModel.js` — list (+filters+pagination), getById, stats
  (counts + approved deal value).
- Agent: `agentBookingController` + `routes/agent/bookingsRoutes.js`
  (`/api/agent/bookings`, create from own lead). Admin: `adminBookingController` +
  `routes/admin/bookingsRoutes.js` (`/api/admin/bookings` + `/stats`).

**Endpoints**
```
# agent
GET/POST /api/agent/bookings   GET /api/agent/bookings/:id
# admin
GET /api/admin/bookings (+status,agentId,projectId,search,page)  GET /stats  GET /:id
```

**Frontend (`infra-website`)**
- Agent: `pages/agent/bookings/AgentBookings.jsx` (new booking: pick own lead →
  unit from lead's project (available/held only) → deal/booking amounts). Nav
  "My Bookings" 🧾, route `/agent/bookings`.
- Admin: `pages/agents/bookings/Bookings.jsx` (stat cards incl. approved value,
  filters, list). Nav "Agent Bookings", route `/agents/bookings`.

**Conversion now end-to-end:** lead → site visit → **booking** (unit auto-reserved,
lead auto-moved to booked). **Next:** 3.5 (booking approval + documents) → 3.6
(link approved booking into resident/property system) → 3.7 (cancellation).

---

## 29. Module 3.5 — Booking Approval & Documentation (build record)

**Backend (`infra/server`)**
- `migrations/064_booking_documents.sql` — `agent_booking_documents` (doc_type
  agreement/docket/cost_sheet/payment_receipt/kyc/other, label, url, by_type/name).
- `AdminBookingModel.approve(id, adminName)` — **transactional**: pending→approved
  (stamps approver) and the unit becomes **sold**.
- `models/BookingDocModel.js` (list/getById/create/remove).
- Admin: `POST /api/admin/bookings/:id/approve` + booking-docs endpoints. Agent:
  own booking-docs endpoints (`/api/agent/bookings/:id/documents`).

**Endpoints**
```
POST   /api/admin/bookings/:id/approve
GET/POST /api/{admin|agent}/bookings/:id/documents   DELETE .../bookings/documents/:docId
```

**Frontend (`infra-website`)**
- Shared `components/BookingDocsModal.jsx` (doc-type + ImageUploader + list).
- Admin `Bookings.jsx` — **Approve** (pending) + **Docs** row actions.
- Agent `AgentBookings.jsx` — **Docs** row action (upload agreement etc.).

**Next:** 3.6 — push an approved booking into the resident/property system (create
buyer `user` + `user_property`, link back via `linked_user_id`/`linked_property_id`).

---

## 30. ⚠️ Table-name collision fix (important)

The resident schema (migration 001) already defines **`projects`**, and module 5
(006) defines **`site_visits`**. The AMS inventory/visit tables would have silently
**collided** (`CREATE TABLE IF NOT EXISTS` skips, then queries hit the wrong
schema). Since AMS migrations (053+) were **not yet applied**, the AMS tables were
renamed in-place before any run:
- `projects` → **`agent_projects`**
- `site_visits` → **`agent_site_visits`**
- (`units`, `project_towers` are AMS-only — kept; their FKs now point at
  `agent_projects`.)
All AMS migrations + models updated. **Lesson:** prefix new AMS tables to avoid
clashing with the large existing resident schema.

---

## 31. Module 3.6 — Link Booking → Resident System (build record)

No migration (uses `agent_bookings.linked_user_id/linked_property_id` from 063 +
existing `users` / `user_properties`).

**Backend (`infra/server`)**
- `AdminBookingModel.linkToResident(id)` — **transactional**: requires an
  *approved*, not-yet-linked booking with a buyer phone; **find-or-creates** a
  buyer `users` row (by mobile, `created_source='admin'`), creates a
  `user_properties` row from the unit + project (project name, tower, flat no,
  floor, area, type, city/state), and writes `linked_user_id` /
  `linked_property_id` back on the booking.
- `POST /api/admin/bookings/:id/link`.

**Frontend (`infra-website`)**
- Admin `Bookings.jsx` — **"Push to resident"** action on approved, unlinked
  bookings + a "✔ linked" column. The buyer now appears in the existing **Users &
  Residents** module with their purchased property.

**This closes the loop:** agent lead → visit → booking → admin approve → **resident
+ property created in the core app**. **Next:** 3.7 (cancellation / hold-release /
re-booking) → 3.8 (sales reports) → then Phase 4 (commission/payouts).

---

## 32. Module 3.7 — Cancellation / Hold-release / Re-booking (build record)

No migration (uses existing `agent_bookings` + `units`).

**Backend (`infra/server`)**
- `AdminBookingModel.cancel(id, reason)` — **transactional**: blocks if linked to a
  resident; sets `cancelled` + reason; **frees the unit** back to `available`.
- `AgentBookingModel.cancel(agentId, id, reason)` — own **pending** booking only;
  same unit release. Re-booking just reuses 3.4 (the freed unit is bookable again).
- `POST /api/admin/bookings/:id/cancel` · `POST /api/agent/bookings/:id/cancel`.

**Frontend (`infra-website`)**
- Admin `Bookings.jsx` — **Cancel** action (any non-cancelled, unlinked booking)
  with a reason modal; releases the unit.
- Agent `AgentBookings.jsx` — **Cancel** on own pending bookings (reason modal).

**Next:** 3.8 — Booking & sales reports (CSV export), then **Phase 4** (commission
& payouts), which finally consumes approved bookings.

---

## 33. Module 3.8 — Booking & Sales Reports (build record)

No migration.

**Backend (`infra/server`)**
- `AdminBookingModel.listAll(filters)` — all matching rows (no pagination).
- `adminBookingController.exportCsv` — builds a CSV (id, created, buyer, phone,
  agent, project, unit, deal value, booking amount, status, resident-linked) with
  proper quoting; `text/csv` attachment. `GET /api/admin/bookings/export.csv`
  (declared before `/:id`).

**Frontend (`infra-website`)**
- Admin `Bookings.jsx` — **Export CSV** button (respects current
  status/agent/search filters; axios blob download). Stat cards already show
  totals + approved deal value.

**🎉 Phase 3 complete (3.1–3.8).** Full conversion engine: lead → site visit →
booking → approval → resident link → cancellation/re-booking → sales export.

**Next: Phase 4 — Commission, Payouts & Performance.** Now that approved bookings
with deal values exist, 2.9 (lead analytics) and 4.x (commission) have real data.
Suggested order: 4.1 (commission rules) → 4.2 (commission ledger, auto-accrue on
approval) → 4.3 (payout requests) → 4.4 (payout processing) → 4.5–4.7
(targets/leaderboard/analytics), then circle back to 2.9.

---

## 34. Module 4.1 — Commission Rules Engine (build record)

**Backend (`infra/server`)**
- `migrations/065_commission_rules.sql` — `commission_rules` (scope global/project/
  tier, calc flat/percent/slab, value, `slabs` JSON, priority, effective dates,
  is_active). FKs → `agent_projects` / `agent_tiers`.
- `models/CommissionRuleModel.js` — CRUD + pure `compute(rule, dealValue)`
  (flat/percent/slab) + `resolve({projectId,tierId,date})` (specificity
  project > tier > global, then priority, date-bounded). **`compute`/`resolve`
  are what 4.2's ledger will call on booking approval.**
- `controllers/adminCommissionController.js` (+ `preview`) +
  `routes/admin/commissionRoutes.js` mounted `/api/admin/commission`. Writes =
  manager+super.

**Endpoints**
```
GET/POST/PUT/DELETE  /api/admin/commission/rules[/:id]
GET                  /api/admin/commission/preview?dealValue&projectId&tierId
```

**Frontend (`infra-website`)**
- Admin `pages/agents/commission/CommissionRules.jsx` — rules table + CRUD
  (scope/type-aware form, slab JSON editor) + a live **Preview** tool
  (deal value × project/tier → resolved rule + commission). Nav "Commission" 💰
  (manager+super), route `/agents/commission`.

**Next:** 4.2 — Commission ledger: auto-accrue a commission row when a booking is
approved (using resolve/compute), with an admin ledger view + adjustments.

---

## 35. Module 4.2 — Commission Ledger (build record)

**Backend (`infra/server`)**
- `migrations/066_commission_ledger.sql` — `commission_ledger` (agent, booking,
  rule, deal_value, amount, status accrued/approved/paid/reversed, rule_snapshot,
  `payout_id` for 4.3).
- `models/CommissionLedgerModel.js` — create, reverseForBooking, adminList
  (+filters/pagination), listByAgent, setStatus, `adjust` (manual bonus/clawback),
  `totals(agentId)`, `adminStats()`.
- **Lifecycle hooks** in `AdminBookingModel`: on **approve** → resolve rule +
  compute + insert an `accrued` ledger row (inside the same transaction); on
  **cancel** → `reverseForBooking` (accrued/approved → reversed).
- Admin endpoints: `/api/admin/commission/ledger` (list/stats),
  `/ledger/:id/status`, `/ledger/adjust`. Agent: `GET /api/agent/commission`
  (own ledger + totals lifetime/accrued/approved/paid).

**Frontend (`infra-website`)**
- Admin `pages/agents/commission/CommissionLedger.jsx` — stat cards (accrued/
  approved/paid), agent + status filters, inline status change, manual adjustment;
  linked from the Rules page ("Ledger" button).
- Agent `pages/agent/earnings/AgentEarnings.jsx` — totals + ledger; nav
  "Earnings" 💰 (now live), route `/agent/earnings`.

**Now live:** approve a booking → commission auto-accrues per rules → agent sees it
in Earnings; admin approves the entry → ready for payout. **Next:** 4.3 — Payout
requests & approval (group approved ledger entries into a payout).

---

## 36. Module 4.3 — Payout Requests & Approval (build record)

**Backend (`infra/server`)**
- `migrations/067_payout_requests.sql` — `payout_requests` (amount, tds, net,
  status requested/approved/processing/paid/rejected, method, txn_ref, reason).
- `models/PayoutModel.js` — `createForAgent` (**txn**: gathers the agent's
  `approved` + unpaid ledger rows, sums them, creates a payout, tags rows with
  `payout_id`), listByAgent, adminList, `getById` (+ ledger items), `setStatus`
  (**txn**: paid → ledger rows `paid`; rejected → release `payout_id`), stats.
- Agent: `GET/POST /api/agent/payouts`. Admin: `GET /api/admin/payouts`
  (+stats, +`/:id` detail), `POST /:id/status`.

**Frontend (`infra-website`)**
- Admin `pages/agents/payouts/Payouts.jsx` — stat cards, filters, Approve/Reject/
  **Mark paid** (method+txn modal), detail drawer listing the commission entries.
  Nav "Payouts" 🏦 (manager+super).
- Agent `pages/agent/payouts/AgentPayouts.jsx` — **Request payout** (enabled when
  approved balance > 0) + history + totals. Nav "Payouts" 🏦.

**Payout loop done:** approved commission → agent requests → admin approves →
**mark paid** (ledger flips to paid). **Next:** 4.4 — payout processing: TDS,
statements & invoice PDF (reuse `invoiceService`/`pdfkit`).

---

## 37. Module 4.4 — Payout Processing, TDS & Statements (build record)

No migration (uses `payout_requests.tds/net` from 067).

**Backend (`infra/server`)**
- `PayoutModel.setStatus` now accepts `tdsPercent` → computes `tds` +
  `net = amount − tds` (persisted) on any transition (typically at mark-paid).
- `services/payoutStatement.js` — pdfkit A4 **payout statement / invoice** (agent +
  masked bank + PAN/GST, gross/TDS/net summary, commission line items).
- Statement endpoints: `GET /api/admin/payouts/:id/statement.pdf` and
  `GET /api/agent/payouts/:id/statement.pdf` (own only). `tdsPercent` added to the
  admin status Joi.

**Frontend (`infra-website`)**
- Admin `Payouts.jsx` — **TDS %** field on the mark-paid modal with a live
  gross/TDS/net preview; **PDF** download per row.
- Agent `AgentPayouts.jsx` — **Statement** download per payout.

**Next:** 4.5 (targets & incentives) → 4.6 (leaderboard) → 4.7 (performance
analytics), then 2.9 (lead analytics).

---

## 38. Module 4.5 — Targets & Incentive Schemes (build record)

**Backend (`infra/server`)**
- `migrations/068_agent_targets.sql` — `agent_targets` (agent, title, metric
  bookings|deal_value, target_value, period, incentive_amount, status active|awarded).
- `models/AgentTargetModel.js` — CRUD; **live achievement** via correlated
  subquery over approved bookings in each target's period; `award` →
  `CommissionLedgerModel.adjust` (incentive as an approved ledger entry) + mark
  awarded.
- Admin: `/api/admin/targets` CRUD + `POST /:id/award`. Agent: `GET /api/agent/targets`.

**Frontend (`infra-website`)**
- Admin `pages/agents/targets/Targets.jsx` — CRUD, **progress bars** (achieved/
  target %), **Award** action (enabled at 100% with an incentive). Nav "Targets" 🎯
  (manager+super).
- Agent `pages/agent/targets/AgentTargets.jsx` — progress cards. Nav "Targets" 🎯.

**Next:** 4.6 — Leaderboard & gamification (rank agents by bookings/deal value/
commission over a period).

---

## 39. Module 4.6 — Leaderboard & Gamification (build record)

No migration (computed from approved bookings + commission ledger).

**Backend (`infra/server`)**
- `models/AgentLeaderboardModel.js` — `ranking({metric,from,to})` ranks active
  agents by **bookings / dealValue / commission** over a date range (correlated
  commission subquery; top 100). Whitelisted ORDER BY column.
- Admin: `GET /api/admin/leaderboard`. Agent: `GET /api/agent/leaderboard`
  (same data; frontend highlights self).

**Frontend (`infra-website`)**
- Shared `components/Leaderboard.jsx` — metric toggle (Sales value/Bookings/
  Commission) + period (All/Month/Year), medal ranks, self-highlight.
- Admin `pages/agents/leaderboard/LeaderboardPage.jsx` (nav "Leaderboard" 🏆),
  Agent `pages/agent/leaderboard/AgentLeaderboard.jsx` (highlights "you").

**Next:** 4.7 — Performance analytics & reports (per-agent funnel + conversion +
CSV), then circle back to **2.9** (lead analytics) to finish Phase 2.

---

## 40. Module 4.7 — Performance Analytics & Reports (build record)

No migration (computed across leads / visits / bookings / commission).

**Backend (`infra/server`)**
- `models/AgentAnalyticsModel.js` — `perAgent({from,to})` (per-agent leads, visits,
  bookings, approved, deal value, commission, **conversion %**) + `funnel({from,to})`
  (overall AMS funnel totals). Date-bounded.
- `controllers/adminAnalyticsController.js` (funnel / perAgent / **exportCsv**) +
  `routes/admin/analyticsRoutes.js` mounted `/api/admin/analytics`.

**Endpoints**
```
GET /api/admin/analytics/funnel          GET /agents          GET /agents/export.csv
```

**Frontend (`infra-website`)**
- Admin `pages/agents/analytics/Analytics.jsx` — funnel stat cards (leads→visits→
  bookings→approved + conversion + sales value), period presets, per-agent table,
  **Export CSV**. Nav "Agent Analytics" 📈 (manager+super).

**🎉 Phase 4 complete (4.1–4.7).** Commission rules → ledger → payouts → TDS/
statements → targets/incentives → leaderboard → analytics.

**Remaining across the build:**
- Phase 1: 1.6 (admin AMS dashboard), 1.7 (agent dashboard real KPIs), 1.9 (agent audit)
- Phase 2: **2.9 (lead analytics)** — now has full data
- Phase 5: 5.1–5.9 (comms, collateral, training, support, AI assistant, BI, settings)
Suggested: do **2.9** next (closes Phase 2), then 1.6/1.7 dashboards (wire real
KPIs now that all data exists), then Phase 5.

---

## 41. Module 2.9 — Lead Analytics & Conversion Reports (build record)

No migration.

**Backend (`infra/server`)**
- `models/LeadAnalyticsModel.js` — `report({from,to})`: summary (total/booked/lost/
  conversion %), `byStage`, `bySource`, `byProject` (top 10). Date-bounded.
- `AdminLeadModel.listAll(filters)` for CSV.
- `adminAnalyticsController.leads` → `GET /api/admin/analytics/leads`.
- `adminLeadController.exportCsv` → `GET /api/admin/leads/export.csv`.

**Frontend (`infra-website`)**
- Admin `Analytics.jsx` — **Agents | Leads** tab toggle. Leads tab: summary cards
  (total/booked/lost/conversion) + bar breakdowns (by stage / source / top
  projects). Shares the period presets.
- Admin `Leads.jsx` — **Export CSV** button (respects current filters).

**🎉 Phase 2 complete (2.1–2.9).** Inventory + full CRM (leads, dedupe, pipeline,
assignment, tasks, notes, analytics).

**Build state now: Phases 2, 3, 4 complete; Phase 1 core done (1.1–1.5, 1.8).**
Remaining: P1 1.6/1.7 dashboards + 1.9 audit; **Phase 5** (5.1–5.9). Next suggested:
1.6 (admin AMS dashboard) + 1.7 (agent dashboard) — wire real KPIs from the now-
complete data, then Phase 5.

---

## 42. Modules 1.6 & 1.7 — Dashboards (build record)

No migration.

**Backend (`infra/server`)**
- `adminAgentController.dashboard` → `GET /api/admin/agents/dashboard` — aggregates
  agent stats + lead stats + booking stats + payout stats + commission ledger
  stats + top-5 agents (leaderboard).
- `controllers/agentDashboardController.js` → `GET /api/agent/dashboard` — own
  counts (leads/openLeads, visits/upcoming, bookings/approved) + earnings totals.

**Frontend (`infra-website`)**
- Admin `pages/agents/AmsDashboard.jsx` — sectioned overview (Agents, Leads,
  Bookings, Commission & Payouts, Top agents) with drill-in links. Nav "AMS
  Overview" 📊 (top of the agents group), route `/agents/dashboard`.
- Agent `AgentDashboard.jsx` — now shows **real** KPI tiles (leads/visits/bookings/
  earnings + accrued/paid) linking to each section.

**Phase 1 now: 1.1–1.8 done.** Only **1.9 (agent activity/audit)** remains in
Phase 1. Phases 2/3/4 complete. **Next:** 1.9, then **Phase 5** (comms, collateral,
training, support, AI assistant, BI, settings).

---

## 43. Module 1.9 — Agent Activity & Audit Log (build record)

**Backend (`infra/server`)**
- `migrations/069_agent_activity.sql` — `agent_activity_log` (agent, action,
  entity, entity_id, path, status_code).
- `models/AgentActivityModel.js` — `record()` (fire-and-forget, never breaks a
  request) + `listByAgent`.
- `middleware/agentActivity.js` — auto-logs every successful agent write on
  `/api/agent/*` (mirrors admin `auditLog`); mounted at top of `agentRoutes`.
- Login event recorded in `agentAuthService.login`.
- Admin view: `GET /api/admin/agents/:id/activity`.
- (Admin-side writes on agents were already in `audit_logs` via `auditLog`.)

**Frontend (`infra-website`)**
- Admin `pages/agents/AgentActivityPanel.jsx` (activity trail) embedded in
  `AgentDetail`.

**🎉 Phase 1 complete (1.1–1.9).**

---

## 🏁 PHASES 1–4 COMPLETE

| Phase | Scope | Status |
|---|---|---|
| 1 | Foundation & Agent Lifecycle (1.1–1.9) | ✅ |
| 2 | Inventory & Lead CRM (2.1–2.9) | ✅ |
| 3 | Site Visits & Bookings (3.1–3.8) | ✅ |
| 4 | Commission, Payouts & Performance (4.1–4.7) | ✅ |
| 5 | Communication & Advanced (5.1–5.9) | ⬜ planned |

All code is written + syntax-checked; **pending a `migrate` + `npm install` +
end-to-end smoke test** on a machine with deps/DB (migrations `053–069`).

**Next: Phase 5** — 5.1 broadcasts → 5.2 collateral → 5.3 training → 5.4
announcements → 5.5 support tickets → 5.6 WhatsApp/SMS/email → 5.7 AI assistant
→ 5.8 BI dashboards → 5.9 settings & hardening.

---

## 44. Module 5.1 — Notifications & Broadcast (build record)

**Backend (`infra/server`)**
- `migrations/070_agent_notifications.sql` — `agent_notification_batches` +
  `agent_notifications` (per-agent fan-out, read tracking).
- `models/AgentNotificationModel.js` — `send` (audience all/tier/agent → batch +
  bulk fan-out), `history` (+read counts), `list`/`unreadCount`/`markRead`/`markAll`.
- Admin: `GET/POST /api/admin/agent-notifications`. Agent:
  `GET /api/agent/notifications`, `/unread-count`, `POST /:id/read`, `/read-all`.

**Frontend (`infra-website`)**
- Admin `pages/agents/notify/AgentNotify.jsx` — compose (audience all/tier/agent)
  + history with read %. Nav "Agent Broadcasts" 📣.
- Agent `pages/agent/notifications/AgentNotifications.jsx` — feed + mark read/all.
  Nav "Notifications" 🔔.

**Next:** 5.2 — Marketing collateral / brochure library (admin uploads, agents
download).

---

## 45. Module 5.2 — Marketing Collateral / Brochure Library (build record)

**Backend (`infra/server`)**
- `migrations/071_agent_resources.sql` — `agent_resources` (**kind** collateral|
  training — shared with 5.3; category, title, url, file_type, thumbnail,
  is_active, sort).
- `models/AgentResourceModel.js` — adminList/listForAgent (by kind +
  category/search), categories, create/update/remove.
- Admin: `/api/admin/agent-resources` (kind via query/body). Agent:
  `GET /api/agent/resources?kind=`.

**Frontend (`infra-website`)** — reusable, kind-driven:
- `components/ResourceManager.jsx` (admin CRUD) + `components/ResourceBrowser.jsx`
  (agent card grid).
- Admin `pages/agents/resources/Collateral.jsx` (nav "Collateral" 📁), Agent
  `pages/agent/resources/AgentCollateral.jsx` (nav "Collateral" 📁).
  **5.3 (Training) will reuse both components with `kind="training"`.**

**Next:** 5.3 — Training & resource center (same components, `kind=training`).

---

## 46. Module 5.3 — Training & Resource Center (build record)

No migration, no new backend (reuses `agent_resources` + endpoints with
`kind=training`).

**Frontend (`infra-website`)**
- Admin `pages/agents/resources/Training.jsx` = `ResourceManager kind="training"`
  (nav "Training" 🎓). Agent `pages/agent/resources/AgentTraining.jsx` =
  `ResourceBrowser kind="training"` (nav "Training" 🎓).

**Next:** 5.4 — Announcements & news feed.

---

## 47. Module 5.4 — Announcements & News Feed (build record)

**Backend (`infra/server`)**
- `migrations/072_agent_announcements.sql` — `agent_announcements` (title, body,
  image, is_pinned, is_active). Persistent news board, distinct from 5.1 per-agent
  broadcasts.
- `models/AgentAnnouncementModel.js` + admin/agent controllers + routes:
  `/api/admin/agent-announcements` (CRUD), `GET /api/agent/announcements`
  (active, pinned-first).

**Frontend (`infra-website`)**
- Admin `pages/agents/news/Announcements.jsx` — CRUD + pin + image. Nav
  "Agent News" 📰.
- Agent `pages/agent/news/AgentNews.jsx` — news feed cards (pinned first). Nav
  "News" 📰.

**Next:** 5.5 — Agent support / ticketing.

---

## 48. Module 5.5 — Agent Support / Ticketing (build record)

**Backend (`infra/server`)**
- `migrations/073_agent_tickets.sql` — `agent_tickets` + `agent_ticket_messages`
  (threaded).
- `models/AgentTicketModel.js` — create (ticket + first message), listByAgent,
  adminList (+filters/pagination), getById, messages, addMessage (admin reply auto
  moves open→in_progress), setStatus, stats.
- Agent: `/api/agent/tickets` (create/list/thread/reply/close). Admin:
  `/api/admin/agent-tickets` (list/stats/thread/reply/status). Reply allowed for
  support role too.

**Frontend (`infra-website`)**
- Shared `components/TicketThread.jsx` — chat-style drawer (admin bubbles right,
  agent left) + reply box; admin passes a status button bar.
- Admin `pages/agents/support/Tickets.jsx` (stat cards, status filters, thread +
  status). Nav "Agent Support" 🎫.
- Agent `pages/agent/support/AgentTickets.jsx` (new ticket + thread). Nav
  "Support" 🎫.

**Next:** 5.6 — WhatsApp / SMS / Email lead-nurture integration.

---

## 49. Module 5.6 — WhatsApp / SMS / Email Lead Nurture (build record)

**Backend (`infra/server`)**
- `migrations/074_lead_templates.sql` — `lead_message_templates` (channel
  whatsapp/sms/email, title, subject, body with `{{name}}`/`{{project}}`).
- `models/LeadTemplateModel.js` + admin CRUD `/api/admin/lead-templates`.
- Agent: `GET /api/agent/leads/templates?channel=` +
  `POST /api/agent/leads/:id/outreach {channel,subject,body}` — sends via existing
  `emailService` / `smsService` (`sendEmail`/`sendSms`/`sendWhatsApp`) **and logs a
  note** on the lead timeline.

**Frontend (`infra-website`)**
- Admin `pages/agents/templates/Templates.jsx` — CRUD per channel. Nav "Msg
  Templates" 💬.
- Agent `pages/agent/leads/LeadReachOutModal.jsx` — channel tabs, template picker
  (placeholders auto-filled), send. **WhatsApp opens a `wa.me` deep link** (real
  send) while still logging the outreach; SMS/Email go through the server gateway.
  Wired as a "Reach" action per lead in `AgentLeads`.

**Next:** 5.7 — AI assistant for agents (reuse the RAG stack with an agent
audience).

---

## 50. Module 5.7 — AI Assistant for Agents (build record)

**Backend (`infra/server`)** — reuses the A15 RAG stack, no migration:
- `AdminAiModel.answer(question, history, persona)` — added an optional `persona`
  (resident default unchanged) so the same retrieve+LLM pipeline can speak as a
  sales assistant.
- `controllers/agentAiController.js` + `routes/agent/aiRoutes.js` →
  `POST /api/agent/ai/chat {message, history}` with a channel-partner sales persona.

**Frontend (`infra-website`)**
- Agent `pages/agent/ai/AgentAi.jsx` — chat UI (suggestions, history, RAG answers
  on pricing/inventory/process). Nav "Sales Assistant" 🤖.

**Next:** 5.8 — BI dashboards & scheduled report exports.

---

## 51. Module 5.8 — BI Dashboards & Report Exports (build record)

No migration (aggregates over bookings / commission / units).

**Backend (`infra/server`)**
- `models/AgentBiModel.js` — `trend(months)` (monthly bookings + sales value +
  commission, gap-filled) + `inventory()` (unit status health + per-project
  available/sold).
- `controllers/adminBiController.js` (overview + monthly CSV export) +
  `routes/admin/biRoutes.js` → `/api/admin/ams-bi` (+`/export.csv`).

**Frontend (`infra-website`)**
- Admin `pages/agents/bi/Bi.jsx` — sales-value bar chart (6 mo), monthly
  commission cards, inventory-health stacked bar + legend, per-project list,
  **Export 12-month CSV**. Nav "BI Dashboard" 📉 (manager+super).

> Scheduled exports: the report CSV endpoint can be wired to the existing
> cron/schedule infra later; on-demand export ships now.

**Next:** 5.9 — Settings, feature flags & production hardening (final module).

---

## 52. Module 5.9 — Settings, Feature Flags & Hardening (build record)

**Backend (`infra/server`)**
- `migrations/075_ams_settings.sql` — `ams_settings` key/value + seeds
  (`hold_hours=48`, `lock_days=90`, `tds_percent=5`, `self_registration=true`).
- `models/AmsSettingsModel.js` — cached (60s) `getAll`/`get`/`getNumber`/`getBool`/
  `setMany`.
- **Wired into behaviour:** `self_registration` enforced in
  `agentAuthService.register` (403 when off); `hold_hours` used by agent unit hold;
  `lock_days` used when stamping a lead's `owner_lock_until` (agent + admin create).
- Admin: `GET/PUT /api/admin/ams-settings`.

**Frontend (`infra-website`)**
- Admin `pages/agents/settings/AmsSettings.jsx` — edit hold hours, lock days,
  default TDS %, self-registration toggle. Nav "AMS Settings" ⚙️ (manager+super).

**🎉🎉 ALL 5 PHASES COMPLETE.**

---

## 🏁 BUILD COMPLETE — Phases 1–5

| Phase | Scope | Modules | Status |
|---|---|---|---|
| 1 | Foundation & Agent Lifecycle | 1.1–1.9 | ✅ |
| 2 | Inventory & Lead CRM | 2.1–2.9 | ✅ |
| 3 | Site Visits & Bookings | 3.1–3.8 | ✅ |
| 4 | Commission, Payouts & Performance | 4.1–4.7 | ✅ |
| 5 | Communication & Advanced | 5.1–5.9 | ✅ |

- **Migrations:** `053`–`075` (23 files), all idempotent.
- **Auth domains:** resident / admin / **agent** (`agentJwt`, `requireAgent`).
- **Surfaces:** admin portal (`/agents/*` pages) + agent portal (`/agent/*`,
  separate `AgentAuthContext`), both inside `infra-website`.
- Every backend file `node --check`-clean.

### ✅ To go live (run on a deps/DB machine)
```
cd infra/server && npm install && node src/scripts/migrate.js   # applies 053–075
node src/server.js                                              # :4000
cd ../../infra-website && npm install && npm run dev            # :5173
```
Seed agent: `agent@yamunainfra.com` / `Admin@123`. Then end-to-end smoke test per
the per-module build records above.

### Production hardening checklist (client-side)
- Set `AGENT_JWT_SECRET` in `server/.env` (distinct from admin/resident secrets).
- Confirm Cloudinary (`/api/admin/media/sign`) works for KYC/collateral uploads.
- Real SMS/WhatsApp gateway for 5.6 (currently console gateway in dev); email via
  existing Brevo/SMTP.
- Lock CORS to the portal origin; build `infra-website` (`npm run build`).
- Optionally schedule the BI report CSV (5.8) via the existing schedule infra.
- Decide `self_registration` (5.9) on/off for launch.
```

