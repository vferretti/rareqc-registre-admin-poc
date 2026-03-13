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
- Styling: CSS variables defined in `src/styles/themes/rareqc/theme.css`, consumed via Tailwind
- Components: shadcn/ui in `src/components/base/ui/`, feature components in `src/components/feature/`
- i18n: French (default) and English, files in `src/locales/{fr,en}/common.json`
- API client: Axios instance in `src/lib/api.ts`, base URL `/api` (proxied by Vite dev server)
- Routing: React Router v7 with `createBrowserRouter` in `src/main.tsx`

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
| PostgreSQL | 5437 |
