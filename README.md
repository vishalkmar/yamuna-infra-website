# Yamuna Infra — Admin Portal (`infra-website`)

React + **Vite** + **JSX** (no TypeScript) + **Tailwind CSS**. The control panel
for the Yamuna Infra resident app — every dynamic thing the app shows (services,
food menu, doctors, transport, temples, amenities, community, rewards,
notifications, users…) is managed from here.

- **Backend:** the existing Express server at `../infra/server` (shared DB). No
  separate backend — add `/api/admin/*` routes there.
- **Images:** Cloudinary (drag-drop upload + paste-a-link). See `src/lib/cloudinary.js`.
- **Single source of truth:** `ADMIN_PORTAL_DOCUMENTATION.pdf` (modules → phases),
  progress tracked in `contextadmin.md`. Build **one module at a time**.

## Run
```bash
npm install
npm run dev      # http://localhost:5173  (proxies /api → http://localhost:4000)
```
Copy `.env.example` → `.env` and fill Cloudinary keys.

## Status
Scaffold only — sidebar + dashboard + routes. Modules are built per the PDF.
