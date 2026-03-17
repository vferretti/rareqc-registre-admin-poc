# RareQC — Registre Admin (POC)

Application web d'administration pour un registre québécois de maladies rares. Permet la gestion des participants (patients), de leurs contacts, et le suivi de l'historique des modifications.

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

| Service    | URL                          |
|------------|------------------------------|
| Frontend   | http://localhost:3001         |
| API        | http://localhost:8082/api     |
| Swagger    | http://localhost:8082/swagger |
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
| Swagger    | http://localhost:8082/swagger |
| PostgreSQL | localhost:5440               |

Le serveur Vite proxy automatiquement `/api` vers le port 8082.

### Réinitialiser la base de données

Si la base de données est dans un état incohérent ou si le schéma a changé, on peut tout supprimer et recréer :

```bash
# 1. Arrêter les services et supprimer le volume PostgreSQL (efface toutes les données)
docker compose down -v

# 2. Relancer l'API (recrée la BD vide avec les migrations)
docker compose up --build api -d

# 3. Recharger les données de test
docker compose --profile dev run --rm seed
```

---

--

## Données de test (seed)

Le seed génère 100 participants réalistes :
- **85 enfants** (0-17 ans) avec contact mère (primaire) et optionnellement père
- **15 adultes** (18-65 ans) avec contact « soi-même » (primaire)
- Noms québécois, numéros RAMQ, codes postaux et indicatifs régionaux réalistes
- Entrées d'activité réparties sur 30 jours

```bash
docker compose --profile dev run --rm seed
```

Le seed est dans un profil Docker `dev` séparé et n'est jamais inclus dans l'image de production.

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

| Variable            | Défaut            | Description     |
|---------------------|-------------------|-----------------|
| `POSTGRES_HOST`     | `localhost`       | Hôte PostgreSQL |
| `POSTGRES_PORT`     | `5432`            | Port PostgreSQL |
| `POSTGRES_USER`     | `rareqc`          | Utilisateur BD  |
| `POSTGRES_PASSWORD` | `rareqc`          | Mot de passe BD |
| `POSTGRES_DB`       | `rareqc_registre` | Nom de la base  |

## Licence

Projet interne — usage restreint.
