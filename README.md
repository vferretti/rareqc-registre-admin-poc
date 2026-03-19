# RareQC — Registre Admin (POC)

Application web d'administration pour un registre québécois de maladies rares. Permet la gestion des participants (patients), de leurs contacts, des consentements et du suivi de l'historique des modifications.

## Stack technique

| Couche       | Technologies                                                       |
|--------------|--------------------------------------------------------------------|
| **Backend**  | Go 1.24, Gin, GORM, PostgreSQL 16, Swagger (swaggo)               |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui, i18next   |
| **Infra**    | Docker Compose (PostgreSQL, Go API, Nginx)                         |
| **Qualité**  | ESLint, Prettier, Husky + lint-staged                              |

## Prérequis

- [Docker](https://docs.docker.com/get-docker/) et Docker Compose
- [Go 1.24+](https://go.dev/dl/) (développement backend local)
- [Node.js 22+](https://nodejs.org/) via nvm (développement frontend local)

---

## Démarrage rapide

### Option 1 — Stack Docker complète

```bash
# Démarrer tous les services (API + PostgreSQL + Frontend)
docker compose up --build

# Charger les données de test (dans un autre terminal)
docker compose --profile dev run --rm seed
```

> **Note** : Si les changements récents ne sont pas visibles, Docker peut réutiliser un cache d'image. Forcer un rebuild complet avec :
> ```bash
> docker compose build --no-cache && docker compose up -d
> ```

| Service    | URL                          |
|------------|------------------------------|
| Frontend   | http://localhost:3001         |
| API        | http://localhost:8082/api     |
| Swagger    | http://localhost:8082/swagger/index.html |
| PostgreSQL | localhost:5440               |

### Option 2 — Développement local (frontend)

```bash
# 1. Démarrer l'API + PostgreSQL avec Docker
docker compose up --build api

# 2. Charger les données de test
docker compose --profile dev run --rm seed

# 3. Lancer le frontend en mode dev
cd frontend
npm install
npm run dev
```

| Service    | URL                          |
|------------|------------------------------|
| Frontend   | http://localhost:5173         |
| API        | http://localhost:8082/api     |
| Swagger    | http://localhost:8082/swagger/index.html |
| PostgreSQL | localhost:5440               |

Le serveur Vite proxy automatiquement `/api` vers le port 8082.

### Réinitialiser la base de données

```bash
# 1. Arrêter les services et supprimer le volume PostgreSQL
docker compose down -v

# 2. Relancer l'API (recrée la BD vide avec les migrations)
docker compose up --build api -d

# 3. Recharger les données de test
docker compose --profile dev run --rm seed
```

---

## Fonctionnalités

### Pages

| Page | Route | Description |
|------|-------|-------------|
| Landing | `/` | Page de connexion (simulée) |
| Accueil | `/home` | Tableau de bord avec recherche, navigation et activités récentes |
| Participants | `/participants` | Liste paginée, triable, avec recherche |
| Détail participant | `/participants/:id` | Identité, coordonnées, contacts, consentements, historique |
| Activités | `/activity` | Journal des actions avec filtres |
| Administration | `/admin` | Page d'administration (à venir) |

### Recherche globale

La barre de recherche sur la page d'accueil cherche dans :
- Noms des participants (prénom, nom, nom complet)
- Numéro RAMQ
- Noms, courriels et téléphones des contacts

Les suggestions s'affichent en temps réel avec le match en gras.

### Consentements

Chaque participant peut consentir à des clauses provenant de formulaires de consentement templates :
- **Formulaire de consentement – RareQc** : 2 clauses (registre, recontact)
- **Formulaire de consentement – RQDM** : 3 clauses (registre, recontact, liaison externe)

Chaque consentement enregistre : la clause, le statut, la date, le signataire et un document signé optionnel.

---

## Architecture backend

```
backend/
├── cmd/api/main.go                    # Point d'entrée
├── internal/
│   ├── database/
│   │   ├── postgres.go                # Connexion PostgreSQL
│   │   └── migrate.go                 # AutoMigrate + seed des données de référence
│   ├── repository/                    # Couche d'accès aux données (DAO)
│   │   ├── participant.go             # CRUD participants
│   │   ├── contact.go                 # CRUD contacts
│   │   ├── activity.go                # Journal d'activité
│   │   ├── consent.go                 # Consentements et clauses
│   │   ├── document.go                # Documents (upload/download)
│   │   └── search.go                  # Recherche multi-champs
│   ├── server/                        # Handlers HTTP (Gin)
│   │   ├── handlers.go                # Routes et configuration
│   │   ├── handlers_participants.go   # CRUD participants
│   │   ├── handlers_contacts.go       # Ajout/édition/suppression contacts
│   │   ├── handlers_consent.go        # Consentements
│   │   ├── handlers_documents.go      # Upload/download documents
│   │   ├── handlers_activity.go       # Journal d'activité
│   │   ├── handlers_search.go         # Recherche
│   │   └── activity.go                # Helper getAuthor
│   └── types/                         # Modèles GORM + DTOs
├── scripts/seed/                      # Données de test
└── Dockerfile                         # Multi-stage build (api + seed)
```

### Couches

```
Handler (HTTP) → Repository (DAO) → GORM → PostgreSQL
```

Les handlers ne contiennent aucun appel GORM direct. Toute la logique de base de données est dans les repositories.

---

## API

### Endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/health` | Vérification de santé |
| GET | `/api/enums` | Tables de référence (sexe, statut, relations, etc.) |
| GET | `/api/participants` | Liste paginée, triable, recherche |
| GET | `/api/participants/:id` | Détail avec contacts |
| POST | `/api/participants` | Création avec contact self |
| PUT | `/api/participants/:id` | Mise à jour identité + coordonnées |
| POST | `/api/participants/:id/contacts` | Ajout d'un contact |
| PUT | `/api/contacts/:id` | Édition d'un contact |
| DELETE | `/api/contacts/:id` | Suppression (protégé si signataire) |
| GET | `/api/participants/:id/consents` | Consentements du participant |
| POST | `/api/participants/:id/consents` | Ajout d'un consentement |
| PUT | `/api/consents/:id` | Édition (statut, date, signataire) |
| GET | `/api/consent-clauses` | Clauses (filtrable par template) |
| GET | `/api/consent-templates` | Formulaires de consentement templates |
| POST | `/api/documents` | Upload de document (multipart) |
| GET | `/api/documents/:id/file` | Téléchargement de document |
| GET | `/api/search?q=...` | Recherche globale |
| GET | `/api/activity-logs` | Journal d'activité paginé |
| GET | `/api/participants/:id/activity-logs` | Activité d'un participant |

---

## Base de données

### Modèle de données

```
participant ──1:n── contact
     │                  │
     │                  └── signed_by (FK depuis consent)
     │
     ├──1:n── consent ──n:1── consent_clause ──n:1── document (template)
     │            │
     │            └── document_id (FK vers document signé)
     │
     └──1:n── activity_log

document ──1:1── document_file (contenu binaire)
```

### Tables de référence

| Table | Codes |
|-------|-------|
| `sex_at_birth` | male, female, unknown |
| `vital_status` | alive, deceased, unknown |
| `relationship` | self, mother, father, guardian, other |
| `action_type` | participant_created, participant_edited, contact_created, contact_edited, contact_deleted, consent_added, consent_edited |
| `consent_status_code` | valid, expired, withdrawn, replaced_by_new_version |
| `clause_type_code` | registry, recontact, external_linkage |
| `document_type_code` | consent_template, consent_signed |

### Règles d'affaires

- Un participant a toujours un contact "self" (créé automatiquement)
- Un seul contact est primary à la fois (incluant le self)
- Un contact signataire d'un consentement ne peut pas être supprimé
- Un seul consentement par clause par participant (contrainte unique)
- Les téléphones sont stockés sans formatage (10 chiffres), formatés à l'affichage

---

## Données de test (seed)

Le seed génère 100 participants réalistes :
- **85 enfants** (0-17 ans) avec contact mère (primaire) et optionnellement père
- **15 adultes** (18-65 ans) avec contact « soi-même » (primaire)
- Noms québécois, numéros RAMQ, codes postaux et indicatifs régionaux réalistes
- **2 formulaires de consentement** (RareQc et RQDM) avec clauses et PDFs templates
- **100 documents signés** (un par participant)
- **~200 consentements** avec signataires (adultes signent eux-mêmes, mineurs signés par contact primaire)
- Entrées d'activité réparties sur 30 jours

```bash
docker compose --profile dev run --rm seed
```

Le seed est dans un profil Docker `dev` séparé et n'est jamais inclus dans l'image de production.

### Accès direct à la base de données

```bash
PGPASSWORD=rareqc psql -h localhost -p 5440 -U rareqc -d rareqc_registre
```

---

## Commandes utiles

```bash
# Lint frontend
cd frontend && npm run lint

# Formater le code frontend
cd frontend && npm run format

# Régénérer la documentation Swagger
cd backend && swag init -g cmd/api/main.go --parseDependency --parseInternal
```

## Variables d'environnement

| Variable            | Défaut            | Description |
|---------------------|-------------------|-------------|
| `POSTGRES_HOST`     | `localhost`       | Hôte PostgreSQL |
| `POSTGRES_PORT`     | `5432`            | Port PostgreSQL |
| `POSTGRES_USER`     | `rareqc`          | Utilisateur BD |
| `POSTGRES_PASSWORD` | `rareqc`          | Mot de passe BD |
| `POSTGRES_DB`       | `rareqc_registre` | Nom de la base |
| `STORAGE_TYPE`      | `database`        | Stockage des documents (`database` ou `s3`) |

## Stockage des documents

Les documents supportent deux backends de stockage :

| Mode | `STORAGE_TYPE` | Stockage | Téléchargement |
|------|----------------|----------|----------------|
| **Base de données** | `database` (défaut) | Table `document_file` (bytea) | Servi par l'API |
| **Object store** | `s3` | Bucket S3-compatible | Redirection 307 |

En développement, le mode `database` est utilisé par défaut. En production, configurer `STORAGE_TYPE=s3` avec les variables S3 appropriées.

> **Note** : L'upload vers S3 n'est pas encore implémenté. Seul le redirect au téléchargement est en place.

## Licence

Projet interne — usage restreint.
