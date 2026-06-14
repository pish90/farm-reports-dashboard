# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Vite dev server on port 5173
npm run build      # TypeScript check + production build → dist/
npm run preview    # Preview the production build locally
```

## Architecture Overview

Vite 5 + React 18 + TypeScript single-page app. Read-only admin dashboard — it consumes the backend API but never writes report data (that comes from the mobile app). All routes are protected except `/login`.

**API base URL** comes from the `VITE_API_BASE_URL` env var (`.env` default: `/api`). In dev, Vite proxies `/api` → `http://localhost:8080` via `vite.config.ts`, so the mobile backend must be running locally.

**Styling:** Tailwind CSS 3 with a custom `farm-*` green palette defined in `tailwind.config.js`.

## Key Patterns

### API client
`src/api/client.ts` — Axios instance. Request interceptor attaches `Authorization: Bearer <token>` from `localStorage.dashboard_token`. Response interceptor on 401 clears the token and redirects to `/login`. Import only from `src/api/client.ts`; never call Axios directly.

API functions are split by domain: `api/auth.ts`, `api/reports.ts`, `api/audit.ts`.

### Authentication
JWT stored in `localStorage` (key: `dashboard_token`). `AuthContext` (`src/auth/AuthContext.tsx`) decodes the payload client-side (no signature verification) to populate `AuthUser`. On mount it checks token expiry via `isTokenValid()` before setting the user. Exposes `useAuth()` hook.

JWT payload shape (from backend):
```typescript
{ userId, farmId, farmName, userName, role, mustChangePassword }
```

### Routing
React Router v6 (`BrowserRouter`). All protected routes are wrapped in `<ProtectedRoute>` which shows a spinner while validating the token then redirects to `/login` if invalid.

```
/login          → LoginPage (public)
/               → DashboardPage
/reports        → ReportsPage
/reports/:id    → ReportDetailPage
/audit-logs     → AuditLogPage (role-restricted nav)
* (catch-all)   → redirect to /
```

### State management
No Redux/Zustand. All state is local (`useState`) per page, loaded in `useEffect`. Auth state lives in `AuthContext`. Pages own their own loading/error states.

### Role-based UI
- Audit Log nav link only visible to `ADMIN`, `MANAGER`, `OPERATIONS_MANAGER`.
- Audit Log farm filter only visible to `ADMIN` and `OPERATIONS_MANAGER`; other roles see only their own farm's logs.
- Role badges render colour-coded (red for ADMIN, blue for MANAGER, gray otherwise).

## Directory Structure

```
src/
├── api/               # Axios client + domain API functions
├── auth/              # AuthContext + useAuth hook
├── components/        # Layout, ProtectedRoute, StatusBadge
├── pages/
│   ├── report-tabs/   # AttendanceTab, MilkTab, LivestockTab, ExpensesTab
│   ├── LoginPage
│   ├── DashboardPage
│   ├── ReportsPage
│   ├── ReportDetailPage
│   └── AuditLogPage
└── types/index.ts     # All DTOs and interfaces (single source of truth)
```

## Page Notes

**ReportDetailPage** — tabbed viewer with four tabs (Attendance, Livestock, Milk, Expenses) and an Excel export button that hits `/reports/{id}/export` and triggers a browser download.

**AttendanceTab** — builds a `Map<workerId, Map<dayOfMonth, boolean>>` from the flat records array to render a worker × day grid. Sticky left column for worker names. Calculates daily column totals and grand total footer.

**MilkTab** — Recharts `LineChart` (day vs. litres) above a table with a running-total column. Footer shows total litres and value at ×40 per litre.

**LivestockTab** — groups records by category, renders a subtotal row per category, then a grand total.

**AuditLogPage** — paginated (50 per page, 0-based index). Action badges are colour-coded (green = LOGIN, red = LOGIN_FAILED, purple = EXCEL_EXPORTED, etc.).

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | API base path | `/api` |
