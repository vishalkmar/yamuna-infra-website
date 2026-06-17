# Yamuna Infra — Admin Portal Build Context

Single source of truth for the **admin portal** (`infra-website`). Read this before
resuming any admin module — conversation context may have been compressed.

The full blueprint is **`ADMIN_PORTAL_DOCUMENTATION.pdf`** (this folder). It
defines the modules and their phases. Build **one module at a time, end-to-end**,
then update this file.

---

## Ground rules (from the client)
- Web app **outside** the mobile app, folder `infra-website` (sibling of `infra/`).
- **React + Vite + JSX** (NO TypeScript). **Tailwind CSS**. Stylish + clean.
- **One backend** = existing Express `infra/server` (shared MySQL DB). Add
  `/api/admin/*` routes there; do not start a second backend.
- **Everything dynamic**: whatever the app shows, the admin manages (CRUD +
  enable/disable + ordering + images).
- **Images** via **Cloudinary** with **drag-drop + paste-a-link** uploader.
- Track every module + the current one here so work resumes after close.

---

## Module status

| #  | Module                         | Status        |
|----|--------------------------------|---------------|
| A0 | Foundation & Shell             | ✅ Done        |
| A1 | Admin Auth & RBAC              | ✅ Done        |
| A2 | Dashboard & Analytics          | ✅ Done        |
| A3 | Users & Residents              | ✅ Done        |
| A4 | Services & Providers           | ✅ Done        |
| A5 | Food Ordering                  | ✅ Done        |
| A6 | Doctors & Healthcare           | ✅ Done        |
| A7 | Mobility Aids                  | ✅ Done        |
| A8 | Wellness & Spiritual           | ✅ Done        |
| A9 | Temple Directory               | ✅ Done        |
| A10| Transport (Cabs/Auto/Bus)      | ✅ Done        |
| A11| Amenities & Clubhouse          | ✅ Done        |
| A12| Community & Visitors           | ✅ Done        |
| A13| Rewards & Projects             | ✅ Done        |
| A14| Notifications & Broadcast      | ✅ Done        |
| A15| AI Concierge (RAG)             | ✅ Done        |
| A16| Payments & Reports             | ✅ Done        |
| A17| Media Library                  | ✅ Done        |
| A18| App Settings & Content         | ✅ Done        |
| A19| Audit Logs & Role Admin        | ✅ Done        |

Legend: ✅ done · 🟡 in progress/partial · ⬜ planned

---

## 🟢 ALL 20 MODULES COMPLETE (A0–A19) — verified vs live DB
Every admin endpoint returns 200 (health-checked). The portal is fully functional and
dynamic: whatever the app shows, the admin manages here. Remaining work is polish &
production hardening (see below), not module gaps.

## 🔧 Post-launch client tasks (batch 1)
Done + verified vs live DB (migrations 039–042 applied):
- **Task 3 — Cloudinary FIXED:** signed upload via backend (`GET /api/admin/media/sign`,
  uses server-side `CLOUDINARY_*` in server/.env). No unsigned preset needed. Frontend
  `lib/cloudinary.js` rewritten. Created `infra-website/.env`.
- **Task 1 — Mobility categories:** admin-managed `mobility_categories` (CRUD) replaces the
  fixed enum; equipment now has `categoryId`. Pages: `mobility/Categories.jsx` + reworked
  `Equipment.jsx` (category dropdown + filter).
- **Task 6 — Tiffin plans:** `tiffin_plans` table + admin CRUD (`/api/admin/food/tiffin-plans`)
  + resident `GET /api/meal/tiffin/plans` + `food/TiffinPlans.jsx` (subs moved to
  `/food/tiffin/subscriptions`).
- **Task 2 — Wellness restructure:** `wellness_categories` + `category_id` on therapies →
  food-style **categories → activities**. Pages: `wellness/Categories.jsx` +
  `wellness/Activities.jsx`. Resident `GET /api/wellness/categories`.
- **Task 4 — Email-OTP login:** backend `POST /api/auth/email/send-otp` + `/verify-otp`
  (otps.mobile widened to hold email; users.mobile nullable). App switched to email:
  `authApi` (+email methods), `authSlice`, `LoginScreen`, `OTPScreen`. Verified: send→OTP→
  token+user. (Real email delivery depends on server `SMTP_*`.)
- **Task 7 — Logo (portal):** favicon + sidebar + login reference `/logo.png` → drop the
  file at `infra-website/public/logo.png`. RN app icons = manual (see public/README.txt).

### Task 5 — Full RAG ✅ DONE + verified live (NVIDIA)
- ✅ Server deps: `multer`, `pdf-parse`, `mammoth`, `xlsx`. Migration `043` extends
  `ai_knowledge_sources.type` (+pdf/docx/excel/csv) + `filename`/`char_count`.
- ✅ `services/extractText.js` — PDF/DOCX/Excel/CSV/TXT buffer → text, + URL fetch→text.
- ✅ `AdminAiModel`: `createFromFile`, URL ingestion in create/update, `getInstructions()`
  (type='instruction' sources **always injected** into the system prompt). Upload route
  `POST /api/admin/ai/sources/upload` (multer memory).
- ✅ Frontend `pages/ai/Ai.jsx` rebuilt: tabs **Knowledge / Instructions / Test console**,
  add text/FAQ, **add from URL**, **import file** (PDF/DOCX/Excel/CSV), reindex, per-source
  edit/delete, char/chunk counts, readiness badges.
- ✅ Smoke-tested live: CSV import → indexed; chat answered from CSV **and** obeyed an
  instruction ("Radhe Radhe. The pool is open 7 AM–8 PM"), mode=rag.
- ✅ **Pinecone vector DB** — wired (`services/vectorStore.js`): `PINECONE_API_KEY` +
  `PINECONE_INDEX=yamunainfra` in server/.env; auto-creates the index (dim 1024 cosine,
  serverless aws/us-east-1) on first reindex; upserts chunk vectors, queries top-k, deletes
  on source change. Falls back to in-DB cosine if Pinecone is unreachable. Verified live:
  reindex created the index + upserted; chat retrieved via Pinecone. Readiness shown in UI.
- ✅ **Live-API tools (real-time data, no storage)** — `services/aiTools.js`: a registry of
  read-only GET endpoints (temples, doctors, food, tiffin, transport, amenities, wellness,
  spiritual, mobility, rewards, announcements, events). `answer()` keyword-matches the
  question, calls the matching tool(s) (directly via the model = same data the GET API
  returns), and injects a LIVE DATA block into the prompt — so the bot answers from current
  listings/prices/timings. mode = `rag+live`. Verified: "which doctors + fees?" →
  real-time doctor list with fees. (DB/server **access** intentionally NOT given — only
  curated read APIs.) To add a new live source: add a tool row (keywords + model fn).
- **Task 8 — App ↔ backend wiring ✅ (audited + gaps fixed + verified):** App `env.js`
  already had `API_BASE_URL=https://backend.iccict.org/api` + `USE_MOCK_API=false`, DB is the
  SAME shared MySQL the portal writes to. **Audited every app `src/api/*` module vs server
  routes** — only 3 mismatches, all fixed:
  - **Food path:** app calls `/food/*`, server had `/meal/food/*` → added resident
    `routes/foodRoutes.js` mounted `/food` (categories, items?category=CODE, order, orders).
  - **Profile (was mock-only):** built `routes/profileRoutes.js` + `ProfileModel` +
    migration `044` (`user_profiles`, `user_preferences`, `family_members`). `/profile`,
    `/profile/personal`, `/preferences`, `/family` CRUD, `/kyc`. **KYC submitted in the app
    now lands in the portal A3 review** (users.kyc_status='pending').
  - **Settings (was mock-only):** `routes/settingsRoutes.js` + `user_settings` table.
    `/settings` GET/PUT (notifications/privacy/language).
  - All other modules (auth/services/food-meal/healthcare/temples/transport/wellness/
    mobility/amenities/community/rewards/sos/companion/booking/payment) already MATCH.
  - Verified live: food alias, profile get/update/family/kyc, settings — all pass.
  - **Still client-side:** deploy latest `infra/server` to backend.iccict.org (+`npm install`
    incl. multer/pdf-parse/mammoth/xlsx/@pinecone-database/pinecone); then on-device screen
    smoke-test. DB schema is already migrated (local migrations ran on the shared DB).

### Follow-ups / nice-to-haves (not blocking)
- A15: PDF/URL ingestion is text-paste for now (admin pastes extracted text). Add real
  server-side PDF parsing + URL fetch + a vector DB if scale demands (currently cosine in JS
  over `ai_chunks`, which is fine for hundreds of chunks).
- A16: refund is DB-side marking; wire live Cashfree refund via `cashfreeService` if needed.
- App wiring: flip `USE_MOCK_API=false` in the RN app and point its APIs at the server so
  residents see admin-managed data (the read/write endpoints are all live).
- Deploy: build `infra-website` (`npm run build` → `dist/`), host static; lock CORS to the
  portal origin; set `ADMIN_JWT_SECRET` + `VITE_CLOUDINARY_*` in prod.

---

## What's done so far

### A0 — Foundation & Shell ✅
- ✅ Scaffold: Vite + React (JSX) + Tailwind, `/api` proxy → :4000.
- ✅ `src/lib/api.js` (axios + admin-JWT request interceptor; 401 → clears token
  + fires `admin-unauthorized` event; `apiError()` helper).
- ✅ `src/lib/cloudinary.js` (`uploadImage` unsigned, `importImageByUrl`).
- ✅ **Reusable component library** in `src/components/`:
  `Toast` (+`ToastProvider`/`useToast`), `DataTable`, `FormModal` (+`Field`,
  `inputClass`), `ConfirmDialog`, `StatusBadge`, `PageHeader`, `SearchBar`
  (debounced), `Pagination`, `StatCard`, `ImageUploader` (drag-drop + paste-URL).
- ✅ `index.css` keyframes (`fadeIn`, `slideIn`). Build passes (`npm run build`).

### A1 — Admin Auth & RBAC ✅ (verified vs live DB)
Backend (`infra/server`):
- ✅ Migration `022_admin_auth.sql` — `admins` table + seeded superadmin. **Applied.**
- ✅ `config/env.js` → `adminJwt` (secret = `ADMIN_JWT_SECRET` || `JWT_SECRET`, 12h).
- ✅ `middleware/requireAdmin.js` — `signAdminToken()` + `requireAdmin(roles?)`
  (verifies `type:'admin'` claim + role membership; 401/403).
- ✅ `models/AdminModel.js`, `services/adminAuthService.js`,
  `controllers/adminAuthController.js`.
- ✅ `routes/admin/authRoutes.js` (login, me, change-password) mounted via
  `routes/adminRoutes.js` → `routes/index.js` `router.use('/admin', …)`.
- ✅ Rate limiter on `/api/admin/auth` (app.js).
- ✅ Smoke-tested live: login✓, /me✓, wrong-pw 401✓, no-token 401✓, change-pw + revert✓.

Frontend:
- ✅ `context/AuthContext.jsx` (admin state, login/logout, `/me` on refresh,
  listens for `admin-unauthorized`).
- ✅ `pages/auth/Login.jsx`, `components/Protected.jsx`,
  `layouts/AdminLayout.jsx` (role-aware sidebar, topbar profile menu, logout,
  change-password modal). `App.jsx` rewired: `/login` + protected nested routes.

### 🔑 Default admin login (change after first use)
`admin@yamunainfra.com` / `Admin@123` · role `superadmin`.

### A3 — Users & Residents ✅ (verified vs live DB)
Real DB has **no `family_members`/`kyc` tables** (those were mock-only in the app);
unit/tower come from `bookings` via `booking_owners`. So A3 was built against the real
schema:
- ✅ Migration `023_admin_users.sql` — added to `users`: `is_active`, `kyc_status`
  (none/pending/approved/rejected), `kyc_id_type/number`, `kyc_reviewed_at`,
  `kyc_reject_reason`, `admin_notes` (+ indexes). **Applied.**
- ✅ `models/AdminUserModel.js` — list (search name/mobile/email + kyc/active filter +
  pagination; unit/tower via correlated subquery on booking_owners→bookings), getById
  (+ emergency_contacts + medical_profiles), setStatus, setNotes, reviewKyc, **activity**
  (UNION across service_bookings, meal_orders, healthcare_appointments, mobility_bookings,
  wellness_bookings, amenity_bookings, darshan_bookings, visitor_passes, sos_requests).
- ✅ `controllers/adminUserController.js` + `routes/admin/usersRoutes.js`
  (mounted `/api/admin/users`). KYC review = any admin; block/notes = superadmin+manager.
- ✅ Frontend `pages/users/UsersList.jsx` (search + KYC filter chips + paginated table)
  and `pages/users/UserDetail.jsx` (profile, unit, emergency contacts, medical, KYC
  approve/reject-with-reason, block/unblock, internal notes, activity feed). Routed in App.jsx.
- ✅ Smoke-tested live: list/paginate, detail, activity, KYC approve, block/unblock+notes,
  kyc filter — all pass. Test mutations reverted.

### A4 — Services & Providers ✅ (verified vs live DB)
First full catalog-CRUD module → the reusable template for A5–A13.
- ✅ Migration `024_admin_services.sql` — added `image_url/is_active/sort_order` to
  `service_categories`; `image_url/featured/sort_order` to `service_providers`
  (existing `active` reused); **created `provider_offerings`** (was mock-only in app;
  FK → providers ON DELETE CASCADE). **Applied.**
- ✅ `models/AdminServiceModel.js` — categories CRUD (delete blocked if providers exist),
  providers CRUD (+offeringCount, featured/sort ordering), offerings CRUD (per provider),
  bookings list (filters + pagination). `controllers/adminServiceController.js`,
  `routes/admin/servicesRoutes.js` mounted `/api/admin/services`. Writes = manager+super.
- ✅ **App dynamic-ready:** resident `ServiceModel.listCategories` now filters `is_active`
  + returns `imageUrl`; `listProviders` returns `imageUrl/featured` + featured/sort order;
  new `GET /api/services/providers/:id/offerings` (active offerings). To make the app use
  them: flip `USE_MOCK_API=false` and point `servicesApi` offerings at this endpoint.
- ✅ Frontend `pages/services/` — `Categories.jsx`, `Providers.jsx`, `Offerings.jsx`,
  `Bookings.jsx`. Drill-down: categories → providers → offerings. Routed in App.jsx.
- ✅ Smoke-tested live: list w/ counts, provider create/update, offerings add/list,
  cascade delete, bookings — all pass. Test data cleaned up.

### A5 — Food Ordering ✅ (verified vs live DB incl. resident→admin flow)
App's food module (Module 35) was mock-only → built the real catalog + orders.
- ✅ Migration `025_admin_food.sql` — created `food_categories`, `food_items`
  (image, price, is_veg, rating, is_active, sold_out, sort), `food_orders`,
  `food_order_items` (FK cascade). Seeded 7 categories + **migrated the 9 legacy
  `meal_menu_items` into `food_items`**. **Applied.**
- ✅ `models/AdminFoodModel.js` (categories/items CRUD, orders list + status update,
  order items, tiffin subscriptions read), controller, `routes/admin/foodRoutes.js`
  mounted `/api/admin/food`. Order status update allowed for support too.
- ✅ **App dynamic-ready:** resident `MealModel` + `mealController` + `mealRoutes`:
  `GET /api/meal/food/categories`, `GET /api/meal/food/categories/:id/items`,
  `POST /api/meal/food/order` (total computed server-side from DB prices; rejects
  sold-out/inactive; transactional order + items). Verified: resident placed ₹200
  order → admin saw it → status update → cascade cleanup.
- ✅ Frontend `pages/food/` — `Categories.jsx`, `Items.jsx` (veg dot, rating, quick
  sold-out toggle), `Orders.jsx` (status dropdown + items modal), `Tiffin.jsx`
  (subscriptions read). Routed in App.jsx.

### A9 — Temple Directory ✅ (verified vs live DB)
`temples` already had image/aarti/maps/donation/vip/crowd/description (+5 seeded).
- ✅ Migration `026_admin_temples.sql` — added only `featured` + `sort_order`. **Applied.**
- ✅ `models/AdminTempleModel.js` (temples CRUD + festivalCount; per-temple
  `temple_festivals` CRUD; darshan bookings read w/ GROUP_CONCAT temple names),
  controller, `routes/admin/templesRoutes.js` (`/api/admin/temples`) +
  `routes/admin/darshanRoutes.js` (`/api/admin/darshan/bookings`). Mounted.
- ✅ App: resident `TempleModel.listTemples` now orders by `featured`/`sort_order`.
- ✅ Frontend `pages/temples/` — `Temples.jsx` (full CRUD: image, crowd, distance,
  aarti, maps/donation URL, VIP, featured, description), `Festivals.jsx` (per temple),
  `DarshanBookings.jsx` (read). Routed.
- ✅ Smoke-tested live: temple create/update/delete, festival add/list, darshan list,
  cascade cleanup — all pass.

### A10 — Transport (Cabs/Auto/Bus) ✅ (verified vs live DB incl. resident→admin)
App's transport (Module 34) was fully mock-only → built the whole stack.
- ✅ Migration `027_admin_transport.sql` — created `vehicle_types`, `transport_places`
  (lat/lng), `fare_rules` (single config row), `rides`. Seeded 4 vehicles
  (Auto/Mini/Sedan/Bus), 8 Vrindavan/Mathura places, fare-rules row. **Applied.**
- ✅ `utils/geo.js` (haversine + `computeFare` w/ surge/min/free-km/night-charge).
- ✅ `models/AdminTransportModel.js` (vehicles/places CRUD, fare-rules get/update,
  rides list + status), controller, `routes/admin/transportRoutes.js` mounted
  `/api/admin/transport`.
- ✅ **App dynamic-ready:** new resident route `/api/transport` (`models/TransportModel`,
  controller, routes mounted in routes/index.js): `GET /vehicles`, `GET /places?search`,
  `POST /estimate` (fares per vehicle from haversine+rules), `POST /book` (creates ride,
  fare computed server-side), `GET /rides`.
- ✅ Frontend `pages/transport/` — `Vehicles.jsx`, `Places.jsx` (lat/lng), `FareRules.jsx`
  (global config), `Rides.jsx` (status dropdown). Routed.
- ✅ Smoke-tested live: estimate 8.2km → fares (Sedan ₹228 incl. night charge), resident
  booked → admin saw → confirmed → cleanup. All pass.

### A11 — Amenities & Clubhouse ✅ (verified vs live DB)
`amenities` was flat → enriched + added categories.
- ✅ Migration `028_admin_amenities.sql` — created `amenity_categories` (seeded 5);
  added to `amenities`: `category_id`, `image_url`, `hourly_rate`, `location`, `features`,
  `description`, `open_time`, `close_time`, `slot_minutes`, `sort_order`. **Applied.**
- ✅ `models/AdminAmenityModel.js` (categories CRUD; facilities CRUD w/ category +
  blackoutCount; blackouts per facility add/list/delete; bookings list + status),
  controller, `routes/admin/amenitiesRoutes.js` mounted `/api/admin/amenities`
  (bookings at `/bookings/all`).
- ✅ App dynamic-ready: resident `CommunityModel.listAmenities`/`getAmenity` now return
  image/hourly/location/features/description/slot config (additive).
- ✅ Frontend `pages/amenities/` — `Facilities.jsx` (category filter, full form incl slot
  config), `Categories.jsx`, `Blackouts.jsx` (per facility), `Bookings.jsx` (status). Routed.
- ✅ Smoke-tested live: categories, facility update w/ category, blackout add/list,
  bookings, category create/delete, cleanup — all pass.

### A6 — Doctors & Healthcare ✅ (verified vs live DB)
`doctors.specialty` was a free string → added specialties table + link + richer fields.
- ✅ Migration `029_admin_healthcare.sql` — created `specialties` (seeded 6, linked all 6
  existing doctors by name); added to `doctors`: `specialty_id`, `image_url`,
  `qualifications`, `description`, `available_days`, `slots`, `sort_order`. **Applied.**
- ✅ `models/AdminHealthcareModel.js` (specialties CRUD + doctorCount; doctors CRUD —
  keeps legacy `specialty` string synced from `specialty_id`; appointments list+status;
  medicine orders list+status), controller, `routes/admin/healthcareRoutes.js` mounted
  `/api/admin/healthcare`.
- ✅ App dynamic-ready: resident `HealthcareModel.listDoctors` returns image/qualifications/
  description/availableDays/slots (additive), ordered by sort_order.
- ✅ Frontend `pages/healthcare/` — `Doctors.jsx` (specialty filter, photo, fee, slots/days
  template), `Specialties.jsx`, `Appointments.jsx` (status), `MedicineOrders.jsx` (status).
- ✅ Smoke-tested live: specialties seeded+linked (1 doctor each), doctor create w/ slots +
  specialty-name sync, appointments/medicine lists, cleanup — all pass.

### A8 — Wellness & Spiritual ✅ (verified vs live DB)
- ✅ Migration `030_admin_wellness.sql` — added `image_url`/`duration_min`/`category`/
  `sort_order` to `wellness_therapies`; **created `spiritual_services`** (puja/seva
  catalog, was mock-only; seeded 5). **Applied.**
- ✅ `models/AdminWellnessModel.js` (therapies CRUD; spiritual services CRUD; wellness
  bookings list+status), controller, `routes/admin/wellnessRoutes.js` mounted
  `/api/admin/wellness` (`/therapies`, `/spiritual`, `/bookings`).
- ✅ App dynamic-ready: resident `WellnessModel.listTherapies` returns image/duration/
  category; new `GET /api/spiritual/services` (active puja/seva) wired via
  `wellnessController.spiritualServices` in rewardsRoutes spiritual router.
- ✅ Frontend `pages/wellness/` — `Therapies.jsx` (package support), `Spiritual.jsx`,
  `Bookings.jsx` (status). Routed.
- ✅ Smoke-tested live: therapies, spiritual CRUD, resident /spiritual/services read,
  bookings, cleanup — all pass.

### A7 — Mobility Aids ✅ (verified vs live DB)
- ✅ Migration `031_admin_mobility.sql` — added `image_url`, `deposit`, `sort_order` to
  `mobility_aids` (7 seeded items; category enum wheelchair/walker/scooter/support/bed).
  **Applied.**
- ✅ `models/AdminMobilityModel.js` (equipment CRUD + category/search filter; requests
  list+status), controller, `routes/admin/mobilityRoutes.js` mounted `/api/admin/mobility`
  (`/equipment`, `/requests`).
- ✅ App dynamic-ready: resident `MobilityModel.listAids` returns image/deposit, ordered.
- ✅ Frontend `pages/mobility/` — `Equipment.jsx` (category filter, rent/buy/deposit,
  attendant), `Requests.jsx` (status requested→confirmed→active→returned). Routed.
- ✅ Smoke-tested live: 7 equipment, create/update/delete, category filter, requests,
  cleanup — all pass.

### A12 — Community & Visitors ✅ (verified vs live DB)
- ✅ Migration `032_admin_community.sql` — `community_announcements` +image_url/is_active/
  expires_at; `community_events` +image_url/sort_order. **Applied.**
- ✅ `models/AdminCommunityModel.js` (announcements CRUD w/ pin; events CRUD; visitor
  passes list+status), controller, `routes/admin/communityRoutes.js` (`/api/admin/community`
  announcements+events) + `routes/admin/visitorsRoutes.js` (`/api/admin/visitors`).
- ✅ App dynamic-ready: resident `CommunityModel` announcements filter is_active+expiry &
  return imageUrl; events return imageUrl, sort order.
- ✅ Frontend `pages/community/` — `Announcements.jsx` (pin/category/image/expiry),
  `Events.jsx`, `Visitors.jsx` (revoke/restore passes). Routed.
- ✅ Smoke-tested live: announcements (pin order) + events CRUD, visitors, cleanup — pass.
- ⏳ 12.4 Broadcast-as-notification deferred to A14 (notifications module).

### A13 — Rewards & Projects ✅ (verified vs live DB)
- ✅ Migration `033_admin_rewards.sql` — `reward_offers` +image_url/sort_order;
  `investment_projects` +sort_order; **created `reward_redemptions`** (offer redemptions
  with status). **Applied.**
- ✅ Resident `RewardModel.redeem` now also writes a `reward_redemptions` row
  (status 'requested') so admin can fulfil. Offers read returns imageUrl.
- ✅ `models/AdminRewardModel.js` (offers CRUD; redemptions list+status; projects CRUD;
  referrals list+status), controller, `routes/admin/rewardsRoutes.js` mounted
  `/api/admin/rewards` (offers, redemptions, projects, referrals).
- ✅ Frontend `pages/rewards/` — `Offers.jsx`, `Redemptions.jsx` (fulfil), `Projects.jsx`
  (investment listings, stage), `Referrals.jsx` (lead status). Routed.
- ✅ Smoke-tested live: offers + projects CRUD, redemptions/referrals lists, cleanup — pass.

### A14 — Notifications & Broadcast ✅ (verified vs live DB incl. resident feed)
`notifications` was per-user with **no resident route** (app was mock) → built both sides.
- ✅ Migration `034_admin_notifications.sql` — `notifications` +batch_id/icon/link +indexes;
  **created `notification_batches`** (one row per send + read stats). **Applied.**
- ✅ `models/AdminNotificationModel.js` — `send()` resolves targets (all / kyc / tower /
  user), creates batch, **bulk fan-out inserts** notification rows; `listHistory()` with
  read counts. controller + `routes/admin/notificationsRoutes.js` mounted
  `/api/admin/notifications` (POST send, GET history).
- ✅ **App dynamic-ready:** new resident route `/api/notifications` (`NotificationModel`,
  controller): `GET /` feed, `GET /unread-count`, `POST /:id/read`, `POST /read-all`.
- ✅ Frontend `pages/notifications/Notifications.jsx` (compose modal w/ targeting + history
  table w/ read %). **A12.4 done**: Announcements page has a 📢 Broadcast button →
  pushes the announcement to all residents' feeds.
- ✅ Smoke-tested live: send to all → fanned out to 4 users, resident read + unread count,
  history read-stats updated, cleanup — all pass.

### A2 — Dashboard & Analytics ✅ (verified vs live DB)
- ✅ No migration — read-only aggregates. `models/AdminStatsModel.js` (`overview(range)`:
  residents/active/kycPending/providers/doctors/openSos + newResidents/orders/rides/
  appointments/serviceBookings/revenue in range; `timeseries(range)` food orders/day;
  `recentActivity()` UNION across signups/food/rides/services/appointments/sos).
- ✅ `controllers/adminStatsController.js`, `routes/admin/statsRoutes.js` mounted
  `/api/admin/stats` (`/overview`, `/timeseries`, `/activity`).
- ✅ Frontend `pages/dashboard/Dashboard.jsx` replaces the placeholder — range filter
  (today/7d/30d), 9 KPI cards (clickable → module), SVG order-trend chart, recent activity.
- ✅ Smoke-tested live: overview (4 residents, 12 providers, 7 doctors), timeseries,
  activity feed — all pass.

### A16 — Payments & Reports ✅ (verified vs live DB)
- ✅ No migration — `payments` already complete. `models/AdminPaymentModel.js` (list w/
  filters status/method/date/search + resident name via booking_owners subquery; summary
  totals by status; CSV export rows; refund marks status='refunded'),
  `controllers/adminPaymentController.js` (incl. `exportCsv` → text/csv),
  `routes/admin/paymentsRoutes.js` mounted `/api/admin/payments`.
- ✅ Frontend `pages/payments/Payments.jsx` — summary cards, filters (status/method/date/
  search), table, **CSV export** (axios blob download), **refund** (manager+super).
- ✅ Smoke-tested live: list (₹40L success), summary, filter, CSV export, refund+revert — pass.
- Note: refund is DB-side marking; live Cashfree refund API can be wired into `refund()`
  via existing `cashfreeService` when needed.

### A17 — Media Library ✅ (verified vs live DB)
- ✅ Migration `035_admin_media.sql` — `media_assets` (url, public_id, folder, label,
  format, bytes, width, height). **Applied.**
- ✅ `models/AdminMediaModel.js` (list w/ search + folder, record w/ dedupe by public_id,
  delete, folders), controller, `routes/admin/mediaRoutes.js` mounted `/api/admin/media`.
- ✅ Frontend: `lib/cloudinary.uploadImage` now returns the full asset object;
  `lib/media.js` (recordMedia/listMedia/deleteMedia); **ImageUploader auto-records every
  upload + has a "Library" picker** (reuse existing images, doc 17.4); `pages/media/Media.jsx`
  (grid, search, upload, copy-URL, delete).
- ✅ Smoke-tested live: record, dedupe (same public_id), list, delete — all pass.

### A18 — App Settings & Content ✅ (verified vs live DB)
- ✅ Migration `036_admin_settings.sql` — `app_settings` (key/value), `daily_content`,
  `reminder_categories`. Seeded feature_flags JSON + content pages + daily content + 5
  reminder categories. **Applied.**
- ✅ `models/AdminSettingsModel.js` (settings get/setMany; daily CRUD; reminder cats CRUD;
  `publicBundle`), controller, `routes/admin/settingsRoutes.js` mounted
  `/api/admin/settings` (`/`, `/daily-content`, `/reminder-categories`).
- ✅ **App dynamic-ready:** public `GET /api/content` (flags + pages + daily + reminder
  cats, no auth); `companionController.dailyContent` now reads a random active row from
  `daily_content` (fallback to static).
- ✅ Frontend `pages/settings/` — `Settings.jsx` (feature-flag toggles + Terms/Privacy/About
  editors), `DailyContent.jsx`, `ReminderCategories.jsx`. Routed.
- ✅ Smoke-tested live: settings get/update, daily + reminder lists, public bundle — pass.

### A19 — Audit Logs & Role Admin ✅ (verified vs live DB)
- ✅ Migration `037_admin_audit.sql` — `audit_logs`. **Applied.**
- ✅ `middleware/auditLog.js` — **auto-records every successful admin write**
  (POST/PUT/PATCH/DELETE) on res.finish; derives entity + id from the URL. Mounted at the
  top of `adminRoutes` (before sub-routers).
- ✅ `models/AdminAuditModel.js` (audit list w/ filters; admins list/create/update incl.
  bcrypt), `controllers/adminAuditController.js` (self-deactivate guard),
  `routes/admin/auditRoutes.js` mounted `/api/admin/audit` + `/api/admin/admins`
  (**superadmin-only**).
- ✅ Frontend `pages/audit/` — `AuditLog.jsx` (action/entity/date filters),
  `Admins.jsx` (team CRUD: name/email/role/password/active). Sidebar "Audit & Admins"
  already gated to superadmin.
- ✅ Smoke-tested live: a write auto-logged (POST settings/daily-content → 201), audit list,
  admins create+update, cleanup — all pass.

### A15 — AI Concierge (RAG) ✅ (verified LIVE with NVIDIA)
- ✅ Migration `038_admin_ai.sql` — `ai_knowledge_sources` + `ai_chunks` (text + embedding
  JSON). Seeded a starter FAQ. **Applied.**
- ✅ `config/env.js` → `llm` + `embeddings` (NVIDIA NIM, keys from `.env`, server-side only).
- ✅ `services/aiService.js` — OpenAI-compatible `embed()` (nv-embedqa-e5-v5, input_type
  passage/query) + `chatComplete()` (llama-3.3-70b) + cosine + chunker. **Graceful
  fallback** everywhere (keyword retrieval + rule-based reply if provider down).
- ✅ `models/AdminAiModel.js` — sources CRUD (auto-reindex on save), `reindexAll`,
  `retrieve` (vector→keyword), `answer` (RAG: retrieve → LLM → cite sources).
  controller + `routes/admin/aiRoutes.js` mounted `/api/admin/ai` (sources, reindex, chat
  test console).
- ✅ Resident `/api/ai/chat` upgraded to RAG (retrieve context → NVIDIA LLM → store in
  ai_messages; falls back to `aiReply()`).
- ✅ Frontend `pages/ai/Ai.jsx` — sources CRUD, reindex, readiness badges, **test console**
  (answer + mode + retrieved chunks).
- ✅ Smoke-tested LIVE: reindex (NVIDIA embeddings), test chat returned **mode "rag"** —
  real LLM answer from the knowledge base citing the source. Works end-to-end.

### Endpoints live now
- Auth: `POST /api/admin/auth/login` · `GET /me` · `POST /change-password`
- Users: `GET /api/admin/users` · `GET /:id` · `GET /:id/bookings` ·
  `POST /:id/kyc/:action` · `POST /:id/status` · `POST /:id/notes`
- Services: `GET|POST /api/admin/services/categories` · `PUT|DELETE /categories/:id` ·
  `GET|POST /providers` (+`?categoryId`) · `PUT|DELETE /providers/:id` ·
  `GET|POST /providers/:id/offerings` · `PUT|DELETE /offerings/:id` · `GET /bookings`
- Food: `GET|POST /api/admin/food/categories` · `PUT|DELETE /categories/:id` ·
  `GET|POST /categories/:id/items` · `PUT|DELETE /items/:id` · `GET /orders` ·
  `GET /orders/:id/items` · `PUT /orders/:id/status` · `GET /subscriptions`
- Temples: `GET|POST /api/admin/temples` · `PUT|DELETE /:id` ·
  `GET|POST /:id/festivals` · `PUT|DELETE /festivals/:id` · `GET /api/admin/darshan/bookings`
- Transport: `GET|POST /api/admin/transport/vehicles` · `PUT|DELETE /vehicles/:id` ·
  `GET|POST /places` · `PUT|DELETE /places/:id` · `GET|PUT /fare-rules` ·
  `GET /rides` · `PUT /rides/:id/status`
- Amenities: `GET|POST /api/admin/amenities/categories` · `PUT|DELETE /categories/:id` ·
  `GET|POST /api/admin/amenities` · `PUT|DELETE /:id` · `GET|POST /:id/blackouts` ·
  `DELETE /blackouts/:id` · `GET /bookings/all` · `PUT /bookings/:id/status`
- Healthcare: `GET|POST /api/admin/healthcare/specialties` · `PUT|DELETE /specialties/:id` ·
  `GET|POST /doctors` · `PUT|DELETE /doctors/:id` · `GET /appointments` ·
  `PUT /appointments/:id/status` · `GET /medicine-orders` · `PUT /medicine-orders/:id/status`
- Wellness: `GET|POST /api/admin/wellness/therapies` · `PUT|DELETE /therapies/:id` ·
  `GET|POST /spiritual` · `PUT|DELETE /spiritual/:id` · `GET /bookings` · `PUT /bookings/:id/status`
- Mobility: `GET|POST /api/admin/mobility/equipment` · `PUT|DELETE /equipment/:id` ·
  `GET /requests` · `PUT /requests/:id/status`
- Community: `GET|POST /api/admin/community/announcements` · `PUT|DELETE /announcements/:id` ·
  `GET|POST /community/events` · `PUT|DELETE /events/:id` · `GET /api/admin/visitors` ·
  `PUT /visitors/:id/status`
- Rewards: `GET|POST /api/admin/rewards/offers` · `PUT|DELETE /offers/:id` ·
  `GET /redemptions` · `PUT /redemptions/:id/status` · `GET|POST /projects` ·
  `PUT|DELETE /projects/:id` · `GET /referrals` · `PUT /referrals/:id/status`
- Notifications: `POST|GET /api/admin/notifications` (send / history). Resident feed:
  `GET /api/notifications` · `GET /unread-count` · `POST /:id/read` · `POST /read-all`
- Stats: `GET /api/admin/stats/overview` · `GET /timeseries` · `GET /activity`
- Payments: `GET /api/admin/payments` (+filters) · `GET /payments/export.csv` ·
  `POST /payments/:id/refund`
- Media: `GET|POST /api/admin/media` · `DELETE /media/:id`
- Settings: `GET|PUT /api/admin/settings` · `GET|POST /settings/daily-content` ·
  `PUT|DELETE /daily-content/:id` · `GET|POST /settings/reminder-categories` ·
  `PUT|DELETE /reminder-categories/:id`. Public: `GET /api/content`
- Audit/Admins (superadmin): `GET /api/admin/audit` · `GET|POST /api/admin/admins` ·
  `PUT /admins/:id`
- AI (RAG): `GET|POST /api/admin/ai/sources` · `PUT|DELETE /sources/:id` ·
  `POST /ai/reindex` · `POST /ai/chat` (test). Resident: `POST /api/ai/chat` (RAG)

### Docs
- ✅ `ADMIN_PORTAL_DOCUMENTATION.pdf` (the blueprint, ~32 pages).

## Per-module delivery checklist (repeat for each)
1. Backend migration (tables / `image_url`, `is_active`, `sort_order` columns).
2. Backend model + controller + routes under `/api/admin/*` (+ Joi validation, `requireAdmin`).
3. Backend smoke test (curl / REST client).
4. Frontend pages using reusable components (`DataTable` + `FormModal` + `ImageUploader`).
5. Manual test: admin writes → app shows.
6. Update this file (mark module/phase done, move 🔵 Current focus).

---

## Backend integration notes
- Add `server/src/middleware/requireAdmin.js` and `server/src/routes/adminRoutes.js`
  (mount sub-routers). Reuse existing models where possible.
- Most app tables already exist (Modules 1–36); admin work = add **write**
  endpoints + image/active/order columns + admin UIs.
- Keep service keys (Cashfree, NVIDIA, SMTP) server-side. Only the Cloudinary
  **unsigned preset** is public to the browser.

## How to run
```
cd infra-website
npm install
npm run dev        # http://localhost:5173 (proxy /api → http://localhost:4000)
# run the backend separately: cd ../infra/server && node src/server.js
```
