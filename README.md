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
