# RareQC Registre Admin — Development Guide

## Project overview
Web application for administrators of a Quebec rare disease patient registry. Manages patient records, diagnoses, and registry metadata.

## Architecture
- **Backend**: Go 1.24 + Gin + GORM + PostgreSQL + Swagger (swaggo)
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui + i18next
- **Infrastructure**: Docker Compose (PostgreSQL 16, Go API, Nginx frontend)

## Backend conventions
- Module name: `registre-admin`
- Entry point: `backend/cmd/api/main.go`
- Layers: `database` → `repository` (DAO interfaces) → `server` (Gin handlers) → `types`
- Handler files: `handlers_<domain>.go` (e.g., `handlers_patients.go`)
- GORM models go in `internal/types/`
- Migrations: GORM AutoMigrate in `internal/database/migrate.go`
- Swagger annotations on handler functions, generated via `swag init`

## Frontend conventions
- Node 22 (via nvm)
- Path alias: `@/` → `src/`
- Components: shadcn/ui in `src/components/base/ui/`, feature components in `src/components/feature/`
- i18n: French (default) and English, files in `src/locales/{fr,en}/common.json`
- API client: Axios instance in `src/lib/api.ts`, base URL `/api` (proxied by Vite dev server)
- Routing: React Router v7 with `createBrowserRouter` in `src/main.tsx`

## Styling & theming (STRICT — replicate unic-portal / radiant-portal architecture exactly)
- **No hardcoded colors in components.** All colors must come from semantic CSS tokens via Tailwind classes (`bg-navbar`, `text-hero-foreground`, `bg-cta`, etc.). Never use brand palette classes directly (e.g., `bg-rareqc-600`, `text-slate-500`) in component code.
- **CSS architecture** (3 files):
  1. `src/index.css` — imports `tailwind.base.css` then `themes/rareqc/theme.css`
  2. `src/styles/tailwind.base.css` — Tailwind v4 import, `@custom-variant dark`, global `--radiant-*` color aliases (light/dark), `@theme inline` block exposing all semantic tokens to Tailwind, `@layer base` resets
  3. `src/styles/themes/rareqc/theme.css` — RareQC brand palette (`--color-rareqc-*` in oklch), semantic token mappings (`:root` + `.dark`)
- **Semantic token categories**: background, foreground, primary, secondary, accent, muted, neutral, destructive, card, popover, border, input, ring, sidebar-*, table-*, navbar-*, hero-*, cta-*, highlight-*, chart-*
- **When adding a new color need**: add a semantic token in `theme.css` (both `:root` and `.dark`), expose it in `tailwind.base.css` `@theme inline`, then use the Tailwind class in the component

## Commands
- **Frontend dev**: `cd frontend && npm install && npm run dev`
- **Backend dev**: `cd backend && go run ./cmd/api/`
- **Docker full stack**: `docker compose up --build`
- **Lint**: `cd frontend && npm run lint`
- **Format**: `cd frontend && npm run format`
- **Swagger**: `cd backend && swag init -g cmd/api/main.go --parseDependency --parseInternal`

## Ports
| Service    | Port |
|------------|------|
| Frontend   | 5173 (dev) / 3000 (docker) |
| API        | 8080 (dev) / 8081 (docker) |
| PostgreSQL | 5440 |
