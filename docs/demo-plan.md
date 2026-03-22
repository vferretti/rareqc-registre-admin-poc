# Plan de démo — RareQC Registre Admin POC

## 1. Accueil et navigation (2 min)

**Page d'arrivée (`/`)**
- Montrer le branding RareQC
- Basculer FR/EN en haut à droite
- Cliquer "Accéder au portail"

**Tableau de bord (`/home`)**
- Recherche globale : taper un nom, un RAMQ, un ID → montrer les suggestions en temps réel
- Cartes de navigation : Participants, Rapports, Activités, Administration
- Activités récentes en bas à droite

---

## 2. Liste des participants (5 min)

**Tableau avancé**
- 200 participants simulés avec noms québécois, RAMQ, codes postaux réalistes
- Trier par nom, date de naissance, date de création
- Redimensionner les colonnes (drag sur les bordures)
- Masquer/afficher des colonnes (bouton Colonnes)
- Plein écran (Escape pour quitter)

**Filtres**
- Recherche texte : nom, prénom, RAMQ, ID interne, ID externe, courriel, téléphone
- Filtre consentement : dropdown groupé par type de clause (Registre/Recontact/Liaison) × statut
- Filtre système externe : CQDG, CQGC
- Filtre par liste d'IDs : coller une liste → validation en temps réel → couper les non-trouvés
- Bouton "Effacer" qui réinitialise tous les filtres

**Actions**
- Export Excel : exporte tous les résultats filtrés avec en-têtes traduits
- Panier : cocher des participants individuellement ou toute la page via le header

**Création de participant**
- Bouton "Ajouter un participant" → formulaire avec :
  - Identité (nom, prénom, DDN, sexe, RAMQ)
  - Coordonnées (courriel, téléphone, adresse)
  - Contact responsable (lien de parenté, coordonnées, case "mêmes coordonnées")
- Validation côté client et serveur

---

## 3. Détail d'un participant (5 min)

**En-tête**
- Badges ID cliquables (copier dans le presse-papier avec feedback visuel)
- Badges systèmes externes colorés avec tooltip

**Identité et coordonnées**
- Carte éditable avec tous les champs
- GUIDs (empreintes de déduplication) : 3 variantes, copiables
- Statut vital avec date de décès conditionnelle

**Contacts**
- Liste des contacts non-self (mère, père, tuteur)
- Ajout, édition, suppression (protégée si signataire d'un consentement)
- Badge "Primaire" sur le contact principal

**Consentements**
- Ajout par template (RareQc ou RQDM) avec clauses
- Choix du signataire, date, upload du document signé
- Édition du statut → **cascade automatique** : si Registre = retiré/expiré, Recontact et Liaison suivent
- Téléchargement du document signé

**Historique d'activité**
- 10 dernières actions sur ce participant
- Chaque action tracée : création, édition, consentement ajouté/modifié, contact ajouté/supprimé

**Visite guidée**
- Bouton "Aide" → tour interactif qui met en surbrillance chaque section

---

## 4. Panier (2 min)

- Badge compteur dans la navbar (99+ si > 99)
- Page `/cart` : tableau des participants sélectionnés
- Recherche dans le panier
- Supprimer un item ou vider le panier
- Export Excel du panier
- Cas d'usage : préparer une liste pour communication en lot

---

## 5. Rapports (3 min)

- Sélecteur de date ("à la date du...")
- **Carte sommaire** : total participants, répartition H/F, âge moyen, décédés, consentements valides, systèmes externes
- **Croissance par trimestre** : graphique linéaire Q3 2024 → Q1 2026
- **Distribution par âge** : barres verticales par tranche d'âge
- **Distribution géographique** : barres horizontales par ville
- Chaque graphique : toggle tableau de données + export PNG

---

## 6. Historique (`/activity`) (2 min)

- Journal global de toutes les actions sur le registre
- Filtres : recherche texte, type d'action (multi-select), période (date début/fin dans un dropdown)
- Bouton "Effacer" pour reset
- Mise en surbrillance des termes recherchés
- Lien vers le participant concerné

---

## 7. Administration (3 min)

**Formulaires de consentement**
- Liste des templates avec statut des clauses
- Création : nom + upload PDF + textes de clauses FR/EN
- Édition/suppression (protégée si des participants ont signé)

**Tables de codes**
- 7 tables de référence (sexe, statut vital, relation, type d'action, statut consentement, type clause, type document)
- Ajout/édition/suppression de codes avec labels bilingues
- Protection contre la suppression de codes utilisés

**Systèmes externes**
- CQDG, CQGC configurés
- Ajout de nouveaux systèmes (nom, titre FR/EN)
- Protection contre la suppression de systèmes référencés

---

## 8. Points techniques à mentionner (2 min)

| Aspect | Détail |
|--------|--------|
| **Stack** | Go + Gin + GORM / React 19 + TypeScript + Vite + Tailwind v4 + shadcn/ui |
| **BD** | PostgreSQL 16 avec AutoMigrate (GORM) |
| **Infra** | Docker Compose (API + PostgreSQL) |
| **i18n** | Français (défaut) + Anglais, bascule instantanée |
| **Données** | 200 participants réalistes sur 7 trimestres |
| **Audit** | Traçabilité complète de chaque action |
| **Règles métier** | Cascade consentement, protection signataire, unicité RAMQ |
| **Panier** | Sélection persistante côté serveur |

---

## Durée totale estimée : ~25 minutes
