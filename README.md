# RareQC — Registre Admin (POC)

Application web d'administration pour un registre québécois de maladies rares. Permet la gestion des dossiers patients, de leurs contacts et des métadonnées du registre.

## Stack technique

| Couche       | Technologies                                                       |
|--------------|--------------------------------------------------------------------|
| **Backend**  | Go 1.24, Gin, GORM, PostgreSQL 16, Swagger (swaggo)               |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui, i18next   |
| **Infra**    | Docker Compose (PostgreSQL, Go API, Nginx)                         |
| **Qualité**  | ESLint, Prettier, Husky + lint-staged, Conventional Commits        |

## Prérequis

- [Docker](https://docs.docker.com/get-docker/) et Docker Compose
- [Go 1.24+](https://go.dev/dl/) (développement local backend)
- [Node.js 22+](https://nodejs.org/) via nvm (développement local frontend)

## Démarrage rapide

### Docker (stack complète)

```bash
docker compose up --build
```

| Service    | URL                          |
|------------|------------------------------|
| Frontend   | http://localhost:3001         |
| API        | http://localhost:8082/api     |
| Swagger    | http://localhost:8082/swagger |
| PostgreSQL | localhost:5440               |

### Développement local (recommandé)

```bash
# Terminal 1 — Base de données + API
docker compose up --build api

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

Le frontend sera disponible sur http://localhost:5173 avec proxy automatique vers l'API sur le port 8082.

### Données de test (seed)

Génère 100 participants réalistes (noms québécois, RAMQ, contacts). Le seed est dans un profil Docker `dev` séparé et n'est **jamais inclus dans l'image de production**.

```bash
# Première fois ou après un reset de la BD
docker compose --profile dev run --rm seed
```

Pour repartir de zéro (supprime le volume PostgreSQL et re-seed) :

```bash
docker compose down -v
docker compose up --build -d api
docker compose --profile dev run --rm seed
```

## Architecture

```
├── backend/
│   ├── cmd/api/main.go                 # Point d'entrée
│   ├── internal/
│   │   ├── database/
│   │   │   ├── postgres.go             # Connexion PostgreSQL
│   │   │   └── migrate.go             # AutoMigrate + tables de référence
│   │   ├── server/
│   │   │   ├── handlers.go            # Routes Gin
│   │   │   ├── handlers_health.go     # GET /api/health
│   │   │   └── handlers_participants.go # CRUD participants
│   │   ├── types/                     # Modèles GORM + DTOs
│   │   └── repository/               # Interfaces DAO (à venir)
│   ├── scripts/seed/                  # Seed réaliste
│   └── Dockerfile                     # Multi-stage build
├── frontend/
│   ├── src/
│   │   ├── main.tsx                   # Router React Router v7
│   │   ├── components/
│   │   │   ├── base/ui/              # shadcn/ui (Button, Dialog, Form…)
│   │   │   ├── base/table/           # Table, Pagination, SortableHeader
│   │   │   ├── feature/              # CreateParticipantDialog, LandingPage
│   │   │   └── layout/               # Navbar
│   │   ├── routes/                    # Pages (participants, root)
│   │   ├── hooks/                     # useParticipants, useDebouncedValue
│   │   ├── lib/                       # API client, i18n, validation, Zod
│   │   ├── locales/{fr,en}/           # Traductions
│   │   └── styles/                    # Tailwind v4 + thème RareQC
│   ├── nginx.conf                     # Reverse proxy (prod)
│   └── Dockerfile                     # Multi-stage build
└── docker-compose.yml
```

## API

### Endpoints

| Méthode | Route               | Description                              |
|---------|----------------------|------------------------------------------|
| GET     | `/api/health`        | Vérification de santé                    |
| GET     | `/api/participants`  | Liste paginée, triable, recherche        |
| POST    | `/api/participants`  | Création d'un participant avec contacts  |

### GET /api/participants — Paramètres

| Paramètre    | Type   | Défaut      | Description                                  |
|--------------|--------|-------------|----------------------------------------------|
| `page_index` | int    | `0`         | Index de la page (0-based)                   |
| `page_size`  | int    | `25`        | Nombre d'éléments par page (max 200)         |
| `sort_field`  | string | `last_name` | Champ de tri (`first_name`, `last_name`, `date_of_birth`, `sex_at_birth_code`, `vital_status_code`, `ramq`, `created_at`) |
| `sort_order` | string | `asc`       | Ordre de tri (`asc` ou `desc`)               |
| `search`     | string | —           | Recherche insensible aux accents (nom, prénom, RAMQ) |

### POST /api/participants — Body

```json
{
  "first_name": "Jean",
  "last_name": "Tremblay",
  "date_of_birth": "2015-03-14",
  "sex_at_birth_code": "male",
  "ramq": "TREB 1503 1412",
  "vital_status_code": "alive",
  "email": "jean@exemple.com",
  "phone": "(514) 555-1234",
  "street_address": "123 Rue Principale",
  "city": "Montréal",
  "province": "QC",
  "code_postal": "H1A 1A1",
  "contacts": [
    {
      "first_name": "Marie",
      "last_name": "Tremblay",
      "relationship_code": "mother",
      "is_primary": true,
      "same_coordinates": true,
      "preferred_language": "fr"
    }
  ]
}
```

Un contact « soi-même » est automatiquement créé avec les coordonnées du participant. Les contacts additionnels avec `same_coordinates: true` héritent des mêmes coordonnées.

## Base de données

### Modèle de données

```
┌─────────────┐       ┌─────────────┐
│ participants │──1:n──│  contacts   │
└─────────────┘       └─────────────┘
       │                     │
       FK                    FK
       ▼                     ▼
┌──────────────┐     ┌──────────────┐
│ sex_at_birth │     │ relationship │
├──────────────┤     ├──────────────┤
│ vital_status │     └──────────────┘
└──────────────┘
```

### Tables de référence

| Table          | Codes                                      |
|----------------|--------------------------------------------|
| `sex_at_birth` | `male`, `female`, `unknown`                |
| `vital_status` | `alive`, `deceased`, `unknown`             |
| `relationship` | `self`, `mother`, `father`, `guardian`, `other` |

Les migrations et le seed des tables de référence sont exécutés automatiquement via GORM AutoMigrate au démarrage.

## Frontend

### Fonctionnalités

- **Tableau des participants** — Tri par colonnes, pagination, recherche avec debounce, colonnes redimensionnables
- **Création de participant** — Formulaire en modale avec validation Zod + React Hook Form
  - Sections : identité, coordonnées, contacts additionnels
  - Auto-formatage RAMQ (`AAAA 0000 0000`)
  - Indicateurs de champs obligatoires (astérisque rouge) détectés automatiquement depuis le schéma Zod
- **Internationalisation** — Français (défaut) et anglais, avec bascule dans la navbar
- **Thème** — Mode clair/sombre via `next-themes`

### Conventions de style

Les couleurs sont définies comme tokens sémantiques dans `src/styles/themes/rareqc/theme.css` et consommées via les classes Tailwind (`bg-primary`, `text-muted-foreground`, etc.). Aucune couleur hardcodée dans les composants.

## Commandes utiles

```bash
# Lint
cd frontend && npm run lint

# Format
cd frontend && npm run format

# Régénérer la doc Swagger
cd backend && swag init -g cmd/api/main.go --parseDependency --parseInternal
```

## Variables d'environnement

| Variable          | Défaut             | Description              |
|-------------------|--------------------|--------------------------|
| `POSTGRES_HOST`   | `localhost`        | Hôte PostgreSQL          |
| `POSTGRES_PORT`   | `5432`             | Port PostgreSQL          |
| `POSTGRES_USER`   | `rareqc`           | Utilisateur BD           |
| `POSTGRES_PASSWORD`| `rareqc`          | Mot de passe BD          |
| `POSTGRES_DB`     | `rareqc_registre`  | Nom de la base           |

## Licence

Projet interne — usage restreint.
