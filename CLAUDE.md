# RareQC Registre Admin — Development Guide

## Project overview
Web application for administrators of a Quebec rare disease patient registry. Manages patient records, diagnoses, and registry metadata.

## Architecture
- **Backend**: Go 1.25 + Gin + GORM + PostgreSQL + Swagger (swaggo)
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui + i18next
- **Infrastructure**: Docker Compose (PostgreSQL 16, Go API, Nginx frontend)

## Backend conventions
- Module name: `registre-admin`
- Entry point: `backend/cmd/api/main.go`
- Layers: `database` → `repository` (DAO interfaces) → `server` (Gin handlers) → `types`
- Handler files: `handlers_<domain>.go` (e.g., `handlers_patients.go`)
- GORM models go in `internal/types/`
- Migrations: `golang-migrate` with versioned SQL files in `backend/migrations/`
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
- **Always use shadcn/ui components** before creating custom ones. If a shadcn component exists for the need (date picker, select, dialog, etc.), use it. Never use native HTML inputs (`type="date"`, `type="file"`, etc.) directly — wrap them in shadcn components for cross-browser consistency.
- Reusable base components in `src/components/base/` (e.g., `file-upload.tsx`, `multi-select-filter.tsx`)
- i18n: French (default) and English, files in `src/locales/{fr,en}/common.json`
- API client: Axios instance in `src/lib/api.ts`, base URL `/api` (proxied by Vite dev server)
- Routing: React Router v7 with `createBrowserRouter` in `src/main.tsx`
- Badge variant mappings centralized in `src/lib/badge-variants.ts` (SEX_BADGE, VITAL_STATUS_BADGE, CONSENT_STATUS_BADGE, CONSENT_STATUS_ICON, CONSENT_STATUS_COLOR, ACTION_BADGE)
- Hooks follow `use<Entity>.ts` pattern in `src/hooks/`
- Search in participants page also searches contacts (name, email, phone) via backend subquery

### Code conventions (aligned with radiant-portal — apply to ALL new code)
- **Forms**: react-hook-form + `zodResolver` + shared `Form`/`FormField` primitives (`src/components/base/ui/form.tsx`). Zod schemas live in `src/lib/validations/` as `(t) => z.object(...)` factories using `validation.*` translation keys. Never build forms with manual per-field `useState`/`canSubmit` gates. Required-field asterisks come automatically from the schema via `isFieldRequired` (pass `schema` to `FormField`; for array-item fields pass the item schema).
- **Bilingual API fields** (`name_en`/`name_fr`, `clause_en`/`clause_fr`...): use `localizedField(obj, base, lang)` from `src/lib/enum-label.ts`. Never write `i18n.language === "en" ? x.name_en : x.name_fr` ternaries (only the navbar/landing language toggles may test `i18n.language`).
- **Dates**: display format patterns live in translation keys (`common.date.year_month_day`, `common.date.year_month_day_hour`) — keep them identical in fr/en unless asked otherwise. Use `formatDate(date, pattern?)` and `todayISO()` from `src/lib/format.ts`. Never inline `format(new Date(), "yyyy-MM-dd")` or `new Date().toISOString().slice(0, 10)`.
- **Debounce/fetch**: reuse `useDebouncedValue` + SWR with a conditional key (see `useSearch.ts`, `address-autocomplete.tsx`). Never hand-roll setTimeout debounces or raw `fetch` in effects.
- **Table columns**: pure factories `getXColumns(opts)` (no hooks inside), memoized at the consumption site with complete dependency arrays. Column cells must not close over data arrays — read rows via `table.getRowModel()`.
- **Naming**: JSX event handlers are `handle*` (`handleDelete`, `handleOpenChange`); plain verbs are reserved for pure helpers (`parseIds`, `resetForm`, `refresh`).
- **Readability**: no nested ternaries — extract a named helper function; no `while ((m = regex.exec(...)))` loops — use `splitOnHighlight` (`src/lib/highlight.ts`) or `matchAll`/`split`.
- **`src/lib/`**: dedicated single-purpose helper files (radiant style). Validation helpers go in `src/lib/validations/` (there is no `lib/validation.ts`).

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
- **Shared platform (REQUIRED first — postgres + keycloak)**: `docker compose up -d` in `~/src/rareqc-infra` (creates the external `rareqc-net` network; see that repo's README)
- **Frontend dev**: `cd frontend && npm install && npm run dev`
- **Backend dev**: `cd backend && go run ./cmd/api/`
- **Docker full stack**: `docker compose up --build` (joins `rareqc-net`)
- **Seed data**: `docker compose --profile dev run --rm seed`
- **Lint**: `cd frontend && npm run lint`
- **Format**: `cd frontend && npm run format`
- **Swagger**: `cd backend && PATH="/usr/local/go/bin:$PATH" ~/go/bin/swag init -g cmd/api/main.go --parseDependency --parseInternal`
- **PostgreSQL client**: `docker compose exec postgres psql -U rareqc -d rareqc_registre`

## Ports
| Service    | Port |
|------------|------|
| Frontend   | 5173 (dev) / 3001 (docker) |
| API        | 8080 (dev) / 8082 (docker) |
| PostgreSQL | 5440 (rareqc-infra) |
| Keycloak   | 8081 (rareqc-infra) |

## Docker notes
- Frontend Dockerfile copies `.npmrc` (with `legacy-peer-deps=true`) before `npm ci` to handle `react-joyride` peer dependency conflict with React 19
- Seed Dockerfile copies consent PDFs from `backend/scripts/seed/` to `/data/`
- When rebuilding after code changes: `docker compose --profile dev build --no-cache seed` then run seed

## External systems
- `CQDG` — Centre québécois de données génomiques
- `CQGC` — Centre québécois de génomique clinique
- External IDs displayed as colored badges in participant detail header, sorted alphabetically by system name

## Authentication (BFF Keycloak — mirrors radiant-portal's design)
- **Pattern**: the Go backend is the confidential OIDC client (BFF). Tokens live in three signed httpOnly cookies (`session.user`, `session.token`, `session.r.token` — SameSite=Lax) and never reach browser JavaScript. Package `backend/internal/auth/`.
- **Keycloak**: realm `rareqc` hosted by the rareqc-infra platform (port 8081 dev). Roles are enforced per route group: `authService.Middleware(auth.RoleAdmin)` on admin routes (403 otherwise); future `/me/...` routes will use `auth.RoleParticipant` (constants in `internal/auth/config.go`). Test users: `vincent-test`, `marie-test` (with role), `sansrole-test` (without) — password `test1234`.
- **Endpoints**: `/api/auth/login` (code flow + PKCE S256, state cookie), `/api/auth/callback`, `/api/auth/logout` (back-channel), `/api/auth/me`. Everything else under `/api` requires auth except `/health`.
- **Dual mode**: browser = session cookies (transparent refresh on expiry); scripts/services = `Authorization: Bearer` verified against the Keycloak JWKS (client `rareqc-scripts`, flux `client_credentials` — see `rareqc-infra/scripts/api-token.sh`).
- **Identity in handlers**: `auth.UserSub(c)` (cart ownership), `auth.UserName(c)` (activity-log author via `getAuthor`).
- **Env vars** (radiant naming, dev defaults built in): `KEYCLOAK_HOST`, `KEYCLOAK_INTERNAL_HOST` (containers), `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT`, `KEYCLOAK_CLIENT_SECRET`, `SESSION_SECRET`, `PORTAL_HOST`, `COOKIE_SECURE`. See `backend/.env.example`.
- **Two portals, one API (A6)**: the OIDC client is selected per request origin — origins listed in `PARTICIPANT_PORTAL_HOSTS` (default `http://localhost:5174,http://localhost:3002`) use `KEYCLOAK_PARTICIPANT_CLIENT`/`KEYCLOAK_PARTICIPANT_CLIENT_SECRET` (`portail-participant-bff`); every other origin uses the admin client. Test user: `participant-test` (role `participant`).
- **Frontend**: `AuthProvider` (`src/contexts/auth-context.tsx`) loads `/api/auth/me` at startup; `RequireAuth` guards app routes; axios 401 interceptor returns to the landing page; no OIDC library needed.
- **Gotchas**: nginx needs enlarged proxy buffers for the session cookies (see `frontend/nginx.conf`); Keycloak runs with `KC_HOSTNAME` + `KC_HOSTNAME_BACKCHANNEL_DYNAMIC` for the dev split-horizon.

## TODO — Production readiness

### Backend
- [x] **B1** ~~Auth JWT (Keycloak) — remplacer `fakeUserID` et `X-Author`~~ (BFF, voir section Authentication)
- [x] **B2** ~~CORS — env var au lieu de `*`~~ (`CORS_ALLOWED_ORIGINS`, `*` refusé en release)
- [x] **B3** ~~Connection pool PostgreSQL (`MaxOpenConns`, `MaxIdleConns`)~~
- [x] **B4** ~~Graceful shutdown~~ (`signal.NotifyContext` + `srv.Shutdown`, budget 10 s)
- [x] **B5** ~~Config par env vars — refuser de démarrer si manquant~~ (`internal/config`, `GIN_MODE=release` = mode strict ; `PORT`, `POSTGRES_SSLMODE`, secrets)
- [x] **B7** ~~Remplacer AutoMigrate par `golang-migrate` (migrations SQL versionnées)~~
- [x] **B13** ~~Health check qui ping la DB~~
- [ ] **B14** Tests unitaires (DAO interfaces déjà en place)
- [x] **B15** ~~Validation d'entrée (binding tags required, formats, upload 10 MB)~~
- [x] **B16** ~~Corriger les N+1 queries (templates, code tables, external systems)~~
- [x] **B17** ~~Logging structuré~~ (`slog` — JSON en release, texte en dev ; requêtes HTTP via middleware `requestLogger`, health en debug)
- [ ] **B18** Chiffrement au repos : disque chiffré sur la VM (LUKS/hébergeur) + sauvegardes chiffrées avant sortie de la VM ; évaluer `pgcrypto` pour la RAMQ si exigence de conformité (⚠️ casserait la recherche RAMQ actuelle). En transit DB : `sslmode` configurable (couvert par B5). TLS navigateur↔portail : couvert par A3.

### Frontend
- [x] **F12** ~~Migrer `cva` → `tv` (tailwind-variants) pour matcher radiant-portal~~
- [ ] **F13** Migrer `exceljs@3.10.0` (non maintenu) → `exceljs@4.4.0` ou alternative (`xlsx` / `write-excel-file`). Touche 4 fichiers : `cart.tsx`, `activity-logs.tsx`, `lib/participants-excel-export.ts`, `lib/cart-excel-report.ts`. En attendant, les vulns transitives (`brace-expansion`, `uuid`) sont neutralisées via `overrides` dans `package.json`.
- [ ] **F14** Page « accès refusé » propre pour les utilisateurs sans le rôle `registre_admin` (actuellement : écrans vides avec erreurs 403)

### Auth (suite)
- [x] **A1** ~~Client `portail-participant-bff` dans le realm~~ (créé, avec `participant-test` — voir `rareqc-infra/docs/integration-portail.md`)
- [ ] **A2** Thème de login Keycloak aux couleurs RareQC (`rareqc-infra/keycloak/themes/`)
- [ ] **A3** Composition staging/prod dans rareqc-infra (proxy TLS, `KC_HOSTNAME` public, secrets régénérés, images GHCR)

### Auth — API partagée avec le portail participant (décision 2026-08-03 : un seul serveur API, une seule BD, voir `rareqc-infra/docs/integration-portail.md`)
- [x] **A4** ~~Rôle par groupe de routes — remplacer le `RequiredRole` global codé en dur~~ (`Middleware(role)` + constantes `auth.RoleAdmin`/`auth.RoleParticipant`)
- [ ] **A5** Routes participant `/me/...` (`/me/profile`, `/me/consents`, …) filtrées par `auth.UserSub(c)` — jamais d'accès aux listes admin ; contrat à publier dans le Swagger
- [x] **A6** ~~Sélection du client OIDC selon l'origine de la requête~~ (origines participant dans `PARTICIPANT_PORTAL_HOSTS` → client `portail-participant-bff` ; tout le reste → `registre-admin-bff`)
- [ ] **A7** Liaison compte Keycloak ↔ participant en BD (prérequis A5) : colonne `keycloak_sub` (unique, nullable) sur `participant` + décision de processus pour la remplir (association par un admin ? correspondance courriel à la première connexion ? enrôlement ?)
- [ ] **A8** Défense en profondeur côté portail participant (repo `rareqc-portal-participant`) : son nginx ne doit proxifier que `/api/auth/*` et `/api/me/*` — jamais tout `/api` ; à documenter comme exigence dans `rareqc-infra/docs/integration-portail.md`
