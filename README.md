# RareQC — Registre Admin (POC)

Application web d'administration pour un registre québécois de maladies rares. Permet la gestion des participants (patients), de leurs contacts, des consentements, du suivi de l'historique des modifications, des rapports et de la sélection en lot (panier).

## Stack technique

| Couche       | Technologies                                                       |
|--------------|--------------------------------------------------------------------|
| **Backend**  | Go 1.24, Gin, GORM, PostgreSQL 16, Swagger (swaggo)               |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui, i18next, recharts, ExcelJS |
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

### Après un changement de code backend

`docker compose up --build` utilise le cache Docker. Si vous modifiez le code Go, les changements ne seront **pas** pris en compte à moins de forcer un rebuild :

```bash
# Rebuild sans cache + redémarrer
docker compose build --no-cache api && docker compose up -d api

# Puis re-seed si le schéma a changé
docker compose --profile dev run --rm seed
```

> **Pourquoi ?** Docker met en cache chaque layer du Dockerfile. Si seul le code source change mais que les layers `COPY go.mod` et `go mod download` sont identiques, Docker réutilise le binaire compilé précédemment. Le flag `--no-cache` force la recompilation complète.

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
| Accueil | `/home` | Tableau de bord avec recherche globale, navigation et activités récentes |
| Participants | `/participants` | Liste paginée, triable, filtrable avec export Excel et panier |
| Détail participant | `/participants/:id` | Identité, coordonnées, contacts, consentements, IDs externes, historique, visite guidée |
| Communications | `/communications` | Gestion des communications en lot (en construction) |
| Rapports | `/reports` | Statistiques et graphiques (sommaire, croissance, âge, géographie) |
| Historique | `/activity` | Journal des actions avec filtres (type, période, recherche) |
| Panier | `/cart` | Participants sélectionnés pour des actions en lot |
| Administration | `/admin` | Formulaires de consentement, tables de codes, systèmes externes |

### Recherche globale

La barre de recherche (page d'accueil et liste participants) cherche dans :
- ID interne du participant
- Noms des participants (prénom, nom, nom complet)
- Numéro RAMQ (insensible à la casse et aux espaces)
- IDs externes (CQDG, CQGC, etc.)
- Noms, courriels et téléphones des contacts

Les suggestions s'affichent en temps réel avec le match en gras et une icône contextuelle (nom, RAMQ, courriel, téléphone, ID externe).

### Filtres avancés (liste participants)

- **Consentements** : dropdown groupé par type de clause (registre, recontact, liaison externe) × statut (valide, expiré, retiré, remplacé). ET entre les types, OU entre les statuts.
- **Système externe** : multi-select des systèmes (CQDG, CQGC). Filtre les participants ayant un ID dans au moins un des systèmes sélectionnés.
- **Filtre par liste d'IDs** : dialog avec choix de la source (Registre, CQDG, CQGC) + textarea. Validation en temps réel, couper les non-trouvés, appliquer le filtre.
- **Effacer** : bouton qui réinitialise tous les filtres actifs.

### Panier

- Colonne checkbox dans le tableau des participants (toggle individuel + header toggle page)
- Badge compteur dans la navbar (99+ si > 99)
- Page `/cart` avec tableau, recherche locale, export Excel, vider le panier
- Persistance côté serveur (user fictif "fake-user-1" pour le POC)

### Consentements

Chaque participant peut consentir à des clauses provenant de formulaires de consentement templates :
- **Formulaire de consentement – RareQc** : 2 clauses (registre, recontact)
- **Formulaire de consentement – RQDM** : 3 clauses (registre, recontact, liaison externe)

Chaque consentement enregistre : la clause, le statut, la date, le signataire et un document signé optionnel.

### Rapports

- Carte sommaire : total participants, répartition H/F, âge moyen, consentements valides, systèmes externes
- Graphique de croissance par trimestre (ligne)
- Distribution par âge (barres)
- Distribution géographique (barres horizontales)
- Chaque graphique : toggle tableau de données + export PNG
- Filtre par date

### Export Excel

- **Liste participants** : exporte tous les résultats filtrés avec en-têtes traduits (FR/EN)
- **Panier** : exporte les participants sélectionnés
- Librairie : ExcelJS (même que unic-portal)

### IDs externes et copie

- Badges colorés dans l'en-tête du détail participant (un par système externe)
- Clic sur un badge → copie l'ID dans le presse-papier avec feedback visuel (icône Check)
- Badge ID interne également copiable

### Visite guidée

- Bouton "Aide" sur la page détail participant
- Tour interactif (Joyride) qui met en surbrillance : identité, contacts, consentements, historique

---

## Architecture backend

```
backend/
├── cmd/api/main.go                    # Point d'entrée
├── internal/
│   ├── database/
│   │   ├── postgres.go                # Connexion PostgreSQL
│   │   └── migrate.go                 # AutoMigrate + seed des données de référence
│   ├── guid/                          # Calcul des GUIDs de déduplication
│   ├── repository/                    # Couche d'accès aux données (DAO)
│   │   ├── participant.go             # CRUD participants + filtres avancés
│   │   ├── contact.go                 # CRUD contacts
│   │   ├── activity.go                # Journal d'activité avec filtres
│   │   ├── consent.go                 # Consentements, clauses, templates, cascade
│   │   ├── document.go                # Documents (upload/download, database ou S3)
│   │   ├── search.go                  # Recherche multi-champs
│   │   ├── external_id.go             # IDs externes + résolution en lot
│   │   ├── external_system.go         # CRUD systèmes externes
│   │   ├── cart.go                    # Panier de participants
│   │   ├── code_table.go             # Tables de codes de référence
│   │   └── reports.go                 # Statistiques et agrégations
│   ├── server/                        # Handlers HTTP (Gin)
│   │   ├── handlers.go                # Routes et configuration
│   │   ├── handlers_participants.go   # CRUD participants + resolve IDs
│   │   ├── handlers_contacts.go       # Ajout/édition/suppression contacts
│   │   ├── handlers_consent.go        # Consentements + templates CRUD
│   │   ├── handlers_documents.go      # Upload/download documents
│   │   ├── handlers_activity.go       # Journal d'activité
│   │   ├── handlers_search.go         # Recherche globale
│   │   ├── handlers_external_id.go    # IDs externes par participant
│   │   ├── handlers_external_system.go # CRUD systèmes externes
│   │   ├── handlers_cart.go           # Panier (add/remove/clear/list/count)
│   │   ├── handlers_code_table.go     # CRUD tables de codes
│   │   ├── handlers_reports.go        # Statistiques agrégées
│   │   └── activity.go                # Helper getAuthor
│   └── types/                         # Modèles GORM + DTOs
├── scripts/
│   ├── openapi/generate.go            # Génère la spec Swagger + nettoie les préfixes
│   └── seed/                          # Données de test (200 participants)
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
| **Santé & config** | | |
| GET | `/api/health` | Vérification de santé |
| GET | `/api/enums` | Tables de référence (sexe, statut, relations, etc.) |
| **Participants** | | |
| GET | `/api/participants` | Liste paginée, triable, filtres (consentement, système externe, IDs) |
| GET | `/api/participants/:id` | Détail avec contacts et GUID |
| POST | `/api/participants` | Création avec contact self |
| PUT | `/api/participants/:id` | Mise à jour identité + coordonnées |
| POST | `/api/participants/resolve-ids` | Résolution en lot d'IDs (internes ou externes) |
| GET | `/api/participants/:id/external-ids` | IDs externes du participant |
| **Contacts** | | |
| POST | `/api/participants/:id/contacts` | Ajout d'un contact |
| PUT | `/api/contacts/:id` | Édition d'un contact |
| DELETE | `/api/contacts/:id` | Suppression (protégé si signataire) |
| **Consentements** | | |
| GET | `/api/participants/:id/consents` | Consentements du participant |
| POST | `/api/participants/:id/consents` | Ajout d'un consentement |
| PUT | `/api/consents/:id` | Édition (statut, date, signataire) + cascade |
| GET | `/api/consent-clauses` | Clauses (filtrable par template) |
| GET | `/api/consent-templates` | Formulaires de consentement templates |
| POST | `/api/consent-templates` | Création de template avec clauses + PDF |
| PUT | `/api/consent-templates/:id` | Édition de template |
| DELETE | `/api/consent-templates/:id` | Suppression (protégée si utilisé) |
| **Documents** | | |
| POST | `/api/documents` | Upload de document (multipart) |
| GET | `/api/documents/:id/file` | Téléchargement de document |
| **Recherche** | | |
| GET | `/api/search?q=...` | Recherche globale (nom, RAMQ, ID, contacts) |
| **Historique** | | |
| GET | `/api/activity-logs` | Journal d'activité paginé avec filtres (type, période, recherche) |
| GET | `/api/participants/:id/activity-logs` | Activité d'un participant |
| **Panier** | | |
| GET | `/api/cart/items` | Liste des items du panier (avec données participant) |
| GET | `/api/cart/count` | Nombre d'items |
| POST | `/api/cart/items` | Ajouter des participants au panier |
| DELETE | `/api/cart/items` | Retirer des participants |
| DELETE | `/api/cart` | Vider le panier |
| **Tables de codes** | | |
| GET | `/api/code-tables` | Liste de toutes les tables avec entrées |
| POST | `/api/code-tables/:table/entries` | Ajout d'un code |
| PUT | `/api/code-tables/:table/entries/:code` | Édition d'un code |
| DELETE | `/api/code-tables/:table/entries/:code` | Suppression (protégée si référencé) |
| **Systèmes externes** | | |
| GET | `/api/external-systems` | Liste des systèmes |
| POST | `/api/external-systems` | Création d'un système |
| PUT | `/api/external-systems/:id` | Édition |
| DELETE | `/api/external-systems/:id` | Suppression (protégée si référencé) |
| **Rapports** | | |
| GET | `/api/reports/stats` | Statistiques agrégées (sommaire, croissance, âge, géographie) |

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
     ├──1:n── activity_log
     │
     ├──1:n── external_id ──n:1── external_system
     │
     ├──1:1── guid
     │
     └──n:m── cart_item (par user)

document ──1:1── document_file (contenu binaire)
```

### Tables de référence

| Table | Codes |
|-------|-------|
| `sex_at_birth_code` | male, female, unknown |
| `vital_status_code` | alive, deceased, unknown |
| `relationship_code` | self, mother, father, guardian, other |
| `action_type_code` | participant_created, participant_edited, contact_created, contact_edited, contact_deleted, consent_added, consent_edited |
| `consent_status_code` | valid, expired, withdrawn, replaced_by_new_version |
| `clause_type_code` | registry, recontact, external_linkage |
| `document_type_code` | consent_template, consent_signed |

### Règles d'affaires

- Un participant a toujours un contact "self" (créé automatiquement)
- Un seul contact est primary à la fois (incluant le self)
- Un contact signataire d'un consentement ne peut pas être supprimé
- Un seul consentement par clause par participant (contrainte unique)
- Les téléphones sont stockés sans formatage (10 chiffres), formatés à l'affichage
- **Cascade de statut** : si le consentement « registre » est retiré ou expiré, les consentements « recontact » et « liaison externe » reçoivent automatiquement le même statut
- **Validation des dates** : la date de naissance ne peut pas être dans le futur, la date de décès ne peut pas être avant la date de naissance

---

## Données de test (seed)

Le seed génère 200 participants réalistes répartis sur 7 trimestres (Q3 2024 → Q1 2026) avec une croissance progressive :

| Trimestre | Participants |
|-----------|:---:|
| Q3 2024 | 10 |
| Q4 2024 | 15 |
| Q1 2025 | 20 |
| Q2 2025 | 25 |
| Q3 2025 | 35 |
| Q4 2025 | 45 |
| Q1 2026 | 50 |

- **170 enfants** (0-17 ans) avec contact mère (primaire) et optionnellement père
- **30 adultes** (18-65 ans) avec contact « soi-même » (primaire)
- Noms québécois et anglophones, numéros RAMQ, codes postaux et indicatifs régionaux réalistes
- **2 formulaires de consentement** (RareQc et RQDM) avec clauses et PDFs templates
- **200 documents signés** (un par participant)
- **~400 consentements** avec statuts variés (valide, expiré, retiré) et cascade appliquée
- **2 systèmes externes** (CQDG ~60%, CQGC ~40%) avec IDs aléatoires
- **300+ entrées d'activité** réparties sur les 7 trimestres
- **4 auteurs** : John Smith, Marie Tremblay, Pierre Gagnon, Sophie Lavoie

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

# Régénérer la spec Swagger + client TypeScript (tout-en-un)
make generate

# Ou séparément :
make doc                         # Swagger seulement (backend/docs/)
make generate-client-typescript  # Client TypeScript seulement (frontend/api/)
```

### Client API généré

Le frontend utilise un client TypeScript auto-généré depuis la spec Swagger (même pipeline que radiant-portal) :

```
Annotations Go (swag) → swagger.yaml → openapi-generator (typescript-axios) → frontend/api/
```

Après tout changement à l'API backend (nouveaux endpoints, types modifiés), exécuter `make generate` pour mettre à jour le client frontend. Les types manuels dans `src/types/` sont des barrels de ré-export depuis le client généré.

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
