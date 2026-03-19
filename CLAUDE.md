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
- Table names are **singular** in PostgreSQL (e.g., `participant`, `contact`, `consent`)
- Business constants (sex_at_birth, vital_status, relationship, etc.) come from PostgreSQL reference tables, not hardcoded in frontend. Exception: provinces can stay in the frontend.

## Backend API endpoints

### Participants
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/participants` | List (paginated, sortable, searchable, consent status filter) |
| GET | `/participants/:id` | Get single participant with contacts and GUID |
| POST | `/participants` | Create participant |
| PUT | `/participants/:id` | Update participant |

### Contacts
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/participants/:id/contacts` | Add contact |
| PUT | `/contacts/:contactId` | Update contact |
| DELETE | `/contacts/:contactId` | Delete contact |

### Consents
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/participants/:id/consents` | List consents for a participant |
| POST | `/participants/:id/consents` | Create consent (blocked if same clause type exists) |
| PUT | `/consents/:consentId` | Update consent |
| GET | `/consent-clauses` | List clauses (optional `template_document_id` filter) |
| GET | `/consent-templates` | List templates (includes `has_consents` flag) |
| POST | `/consent-templates` | Create template with PDF + clauses |
| PUT | `/consent-templates/:id` | Update template (blocked if signed by participants) |
| DELETE | `/consent-templates/:id` | Delete template (blocked if signed by participants) |

### External IDs
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/participants/:id/external-ids` | List external system IDs for a participant |

### Documents
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/documents` | Upload document |
| GET | `/documents/:id/file` | Download document file |

### Other
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/health` | Health check |
| GET | `/enums` | All reference data |
| GET | `/search` | Search suggestions (participants + contacts) |
| GET | `/activity-logs` | Activity log (paginated) |
| GET | `/participants/:id/activity-logs` | Activity log for a participant |

## Data model key rules
- **One consent per clause type per participant** — enforced both at API level and via PostgreSQL trigger (`trg_unique_consent_clause_type`)
- **RAMQ is unique** — unique index on `participant.ramq`
- **External system IDs** — unique constraint on `(external_system_id, participant_id)`
- **Consent templates cannot be edited/deleted if signed** — API returns 409, frontend disables buttons with tooltip explanation

## Frontend conventions
- Node 22 (via nvm)
- Path alias: `@/` → `src/`
- Components: shadcn/ui in `src/components/base/ui/`, feature components in `src/components/feature/`
- Reusable base components in `src/components/base/` (e.g., `file-upload.tsx`, `multi-select-filter.tsx`)
- i18n: French (default) and English, files in `src/locales/{fr,en}/common.json`
- API client: Axios instance in `src/lib/api.ts`, base URL `/api` (proxied by Vite dev server)
- Routing: React Router v7 with `createBrowserRouter` in `src/main.tsx`
- Badge variant mappings centralized in `src/lib/badge-variants.ts` (SEX_BADGE, VITAL_STATUS_BADGE, CONSENT_STATUS_BADGE, CONSENT_STATUS_ICON, CONSENT_STATUS_COLOR, ACTION_BADGE)
- Hooks follow `use<Entity>.ts` pattern in `src/hooks/`
- Search in participants page also searches contacts (name, email, phone) via backend subquery

## Frontend pages
- `/` — Landing page (login)
- `/home` — Dashboard with search box and navigation cards
- `/participants` — Participant list with table (consent status columns, column visibility, fullscreen, consent status filter)
- `/participants/:id` — Participant detail (identity, coordinates, contacts, consents, activity, external IDs in header badges)
- `/activity` — Activity log
- `/admin` — Administration with accordion sections (Users: coming soon, Consent forms: template management with table)

## Styling & theming (STRICT — replicate unic-portal / radiant-portal architecture exactly)
- **No hardcoded colors in components.** All colors must come from semantic CSS tokens via Tailwind classes (`bg-navbar`, `text-hero-foreground`, `bg-cta`, etc.). Never use brand palette classes directly (e.g., `bg-rareqc-600`, `text-slate-500`) in component code.
- **CSS architecture** (3 files):
  1. `src/index.css` — imports `tailwind.base.css` then `themes/rareqc/theme.css`
  2. `src/styles/tailwind.base.css` — Tailwind v4 import, `@custom-variant dark`, global `--radiant-*` color aliases (light/dark), `@theme inline` block exposing all semantic tokens to Tailwind, `@layer base` resets
  3. `src/styles/themes/rareqc/theme.css` — RareQC brand palette (`--color-rareqc-*` in oklch), semantic token mappings (`:root` + `.dark`)
- **Semantic token categories**: background, foreground, primary, secondary, accent, muted, neutral, destructive, card, popover, border, input, ring, sidebar-*, table-*, navbar-*, hero-*, cta-*, highlight-*, chart-*
- **When adding a new color need**: add a semantic token in `theme.css` (both `:root` and `.dark`), expose it in `tailwind.base.css` `@theme inline`, then use the Tailwind class in the component

## Database indexes
- **GIN trigram indexes** (pg_trgm) on participant and contact name/email/phone fields for `LIKE '%...%'` search performance
- **B-tree index** on `external_id.external_id` for exact lookups
- Consent status columns in participant list use a single LEFT JOIN with conditional aggregation (not correlated subqueries)

## Commands
- **Frontend dev**: `cd frontend && npm install && npm run dev`
- **Backend dev**: `cd backend && go run ./cmd/api/`
- **Docker full stack**: `docker compose up --build`
- **Seed data**: `docker compose --profile dev run --rm seed`
- **Lint**: `cd frontend && npm run lint`
- **Format**: `cd frontend && npm run format`
- **Swagger**: `cd backend && PATH="/usr/local/go/bin:$PATH" ~/go/bin/swag init -g cmd/api/main.go --parseDependency --parseInternal`
- **PostgreSQL client**: `docker compose exec postgres psql -U rareqc -d rareqc_registre`

## Ports
| Service    | Port |
|------------|------|
| Frontend   | 5173 (dev) / 3000 (docker) |
| API        | 8080 (dev) / 8081 (docker) |
| PostgreSQL | 5440 |

## Docker notes
- Frontend Dockerfile copies `.npmrc` (with `legacy-peer-deps=true`) before `npm ci` to handle `react-joyride` peer dependency conflict with React 19
- Seed Dockerfile copies consent PDFs from `backend/scripts/seed/` to `/data/`
- When rebuilding after code changes: `docker compose --profile dev build --no-cache seed` then run seed

## External systems
- `CQDG` — Centre québécois de données génomiques
- `CQGC` — Centre québécois de génomique clinique
- External IDs displayed as colored badges in participant detail header, sorted alphabetically by system name
