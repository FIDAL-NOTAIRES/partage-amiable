# PARTAGE AMIABLE — FIDAL Notaires

*D'authentiques bons choix.* La cave partagée du cabinet : on photographie l'étiquette,
l'appli identifie le vin, on choisit ses sensations, on note, on partage.
Chaque rapport est archivé (fiche + photo) dans le dossier Drive **PARTAGE AMIABLE**.

## Architecture

- **Frontend** : React + Vite (style FIDAL Apps : bleu nuit, turquoise, Gelasio/Open Sans)
- **API** (fonctions serverless Vercel, dossier `api/`) :
  - `GET /api/items` — liste des rapports (Postgres)
  - `POST /api/items` — `{action: "create"|"like"|"avis", ...}` ; `create` archive aussi sur le Drive
  - `POST /api/identify` — lecture de l'étiquette par Claude (vision + recherche web)
  - `GET /api/associes` — liste des associés lue depuis le fichier Drive (cache 5 min)
- **Base** : Vercel Postgres (Neon), table `rapports` créée automatiquement
- **Drive** : compte de service Google (lecture du xlsx des associés + écriture dans le dossier)

## Mise en route (une seule fois)

### 1. Compte de service Google

1. https://console.cloud.google.com → créer (ou réutiliser) un projet
2. **API et services → Bibliothèque** → activer **Google Drive API**
3. **API et services → Identifiants → Créer des identifiants → Compte de service**
4. Sur le compte créé : **Clés → Ajouter une clé → JSON** → télécharger le fichier
5. Noter l'adresse du compte (`xxxx@xxxx.iam.gserviceaccount.com`)

### 2. Partager le Drive avec le compte de service

Dans Google Drive, partager **avec l'adresse du compte de service** :
- le dossier **PARTAGE AMIABLE** → rôle **Éditeur**
- le fichier **Liste des associéés.xlsx** → rôle **Lecteur**

(Les ID du dossier et du fichier sont déjà renseignés dans `api/_drive.js`.)

### 3. GitHub

```bash
# dans le dossier du projet
git init
git add .
git commit -m "Partage Amiable v1"
git branch -M main
git remote add origin https://github.com/FIDAL-NOTAIRES/partage-amiable.git
git push -u origin main
```

(Créer d'abord le dépôt vide `partage-amiable` sur github.com/FIDAL-NOTAIRES.)

### 4. Vercel

1. https://vercel.com → **Add New → Project** → importer `FIDAL-NOTAIRES/partage-amiable`
   (framework détecté : Vite — ne rien changer)
2. **Storage → Create Database → Postgres (Neon)** → la connecter au projet
   (la variable `POSTGRES_URL` est ajoutée automatiquement)
3. **Settings → Environment Variables**, ajouter :
   - `ANTHROPIC_API_KEY` = clé créée sur https://console.anthropic.com
   - `GOOGLE_SERVICE_ACCOUNT` = **tout le contenu du fichier JSON** du compte de service,
     collé tel quel sur une seule ligne
4. **Deploy** (ou redéployer après l'ajout des variables)

## Développement local

```bash
npm install
npm install -g vercel   # si besoin
vercel env pull .env    # récupère les variables du projet
vercel dev              # lance frontend + API ensemble
```

(`npm run dev` seul lance le frontend sans les fonctions `/api`.)

## Notes

- Les photos sont compressées côté client (~900 px, JPEG) avant envoi.
- Un « like » par navigateur (mémorisé en localStorage), le nom choisi est retenu.
- La liste des associés suit le fichier Drive : modifier le xlsx suffit (cache de 5 minutes).
- L'archivage Drive n'est jamais bloquant : si le Drive échoue, le rapport est quand même publié.
