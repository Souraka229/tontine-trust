# TontineChain

**Tontine digitale pour l'Afrique de l'Ouest** — cotisations en FCFA (Mobile Money via Kkiapay), trésor collectif en Bitcoin, preuves cryptographiques secp256k1 et gestion par bot WhatsApp.

Projet de soutenance : moderniser la tontine informelle (ROSCA) sans exclure les utilisateurs qui n'ont qu'un téléphone et Mobile Money.

---

## Fonctionnalités

| Module | Description |
|--------|-------------|
| **Tontine ROSCA** | Créer un groupe, inviter par lien, définir montant/fréquence/ordre de passage, activer le premier tour |
| **Cotisations FCFA** | Portefeuille interne + paiement Kkiapay (sandbox) ; prélèvement et suivi par tour |
| **Trésor Bitcoin** | Conversion FCFA → sats, pool collectif, cours live CoinGecko, engagements signés |
| **Garde collective** | Validation 3/5 des gardiens avant chaque décaissement (inspirée Bitsacco) |
| **Bot WhatsApp** | Commandes `/solde`, `/groupes`, `/cotiser`, `/bitcoin`, `/liquidity`, `/score`, `/notifs` |
| **PWA** | Installable sur mobile (manifest + service worker) |

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18, TypeScript, Vite 8, Tailwind CSS, shadcn/ui |
| Base de données & auth | Supabase (PostgreSQL + Auth + RLS) |
| Paiements | Kkiapay (`kkiapay-react`) |
| Bitcoin | CoinGecko, mempool.space, signatures secp256k1 (viem) |
| WhatsApp | Simulateur web + webhook dev (Vite) + Edge Function Supabase |
| Optionnel | Convex — uniquement si `VITE_CONVEX_URL` est renseigné ; sinon tout passe par Supabase |

> **Mode par défaut : Supabase seul.** Convex n'est pas requis pour la démo ni la soutenance.

---

## Prérequis

- **Node.js** 18 ou plus
- **npm**
- **Docker Desktop** — pour Supabase en local (auth, groupes, cotisations)
- **CLI Supabase** — sur Windows, préférer l'installation native ([documentation](https://supabase.com/docs/guides/cli)) plutôt que `npx supabase` si le binaire `win32-x64` n'est pas trouvé

Sans Docker, l'application démarre quand même : landing, trésor Bitcoin et simulateur WhatsApp restent accessibles. L'inscription et les groupes nécessitent une instance Supabase (locale ou cloud).

---

## Installation

```bash
git clone <repo-url>
cd tontine-trust
npm install
cp .env.example .env
```

### Supabase local (recommandé pour les tests complets)

```bash
supabase start          # ou : npm run supabase:start
supabase db reset       # migrations + seed
```

Copier dans `.env` l'URL et la clé `anon` affichées par `supabase status`.

### Lancer l'application

```bash
npm run dev
```

→ [http://localhost:8080](http://localhost:8080)

Setup en une commande (Linux/macOS) :

```bash
npm run local:setup && npm run dev
```

---

## Variables d'environnement

Fichier `.env` à la racine (voir `.env.example`) :

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `VITE_SUPABASE_URL` | Oui* | URL API Supabase |
| `VITE_SUPABASE_ANON_KEY` | Oui* | Clé publique anon |
| `VITE_KKIAPAY_PUBLIC_KEY` | Non | Clé sandbox Kkiapay pour les cotisations MoMo |
| `VITE_CONVEX_URL` | Non | Laisser vide pour le mode Supabase seul |

\* Requis pour inscription, groupes et persistance du trésor Bitcoin.

**Secrets Edge Function** `whatsapp-webhook` (dashboard Supabase ou CLI, pas dans `.env` frontend) :

| Secret | Description |
|--------|-------------|
| `WHATSAPP_VERIFY_TOKEN` | Token de vérification Meta (ex. `tontinechain`) |
| `WHATSAPP_TOKEN` | Token d'accès Graph API |
| `WHATSAPP_PHONE_NUMBER_ID` | ID du numéro WhatsApp Business |

---

## Routes

### Publiques (sans connexion)

| Route | Page |
|-------|------|
| `/` | Landing |
| `/crypto` | Trésor Bitcoin, cours live, signature d'engagement |
| `/whatsapp` | Simulateur du bot |
| `/connexion` | Connexion |
| `/inscription` | Création de compte |

### Authentifiées

| Route | Page |
|-------|------|
| `/home` | Tableau de bord |
| `/creer` | Créer une tontine |
| `/rechercher` | Rechercher / rejoindre |
| `/rejoindre/:id` | Rejoindre via invitation |
| `/groupe/:id` | Détail groupe, activation, preuves Bitcoin |
| `/cotiser` | Payer sa part (Kkiapay) |
| `/portefeuille` | Solde FCFA |
| `/score` | Score de confiance |
| `/notifications` | Alertes |
| `/profil`, `/parametres` | Compte et téléphone WhatsApp |
| `/admin` | Administration |

---

## Base de données

Migrations dans `supabase/migrations/` :

| Fichier | Contenu |
|---------|---------|
| `20260629160000_init_tontine_schema.sql` | Schéma complet (profiles, groups, cotisations, RLS, triggers) |
| `20260629160001_migrate_kkiapay.sql` | Intégration paiements Kkiapay |
| `20260629170000_bitcoin_treasury.sql` | Trésor BTC + RPC `rpc_activate_group` |

Tables Bitcoin :

- `btc_treasury_pool` — trésor global (singleton)
- `btc_user_wallets` — sats par utilisateur
- `bitcoin_commitments` — engagements signés secp256k1

Seed : `supabase/seed.sql` (données de démo dont le pool BTC).

---

## Bot WhatsApp

Module unique : `supabase/functions/_shared/whatsapp/` (fusion TontineChain + FlashBot). Réexport : `src/lib/whatsappCommands.ts`.

### Commandes

**Gestion tontine** — `CREER` · `REJOINDRE TONT-XXXX` · `TONTINE` · `MEMBRES` · `HISTORIQUE` · `AIDE` · `ANNULER`

**App & portefeuille** — `/aide` · `/solde` · `/groupes` · `/cotiser` · `/score` · `/notifs`

**Bitcoin** — `/bitcoin` · `/liquidity`

Le numéro WhatsApp doit correspondre au `phone` du profil (création auto en prod via `service_role`).

### Développement (Vite)

```
POST http://localhost:8080/api/whatsapp/webhook
{ "from": "+22990000000", "body": "/aide" }
```

Local : `SUPABASE_SERVICE_ROLE_KEY` dans `.env` + `npx supabase db reset` pour `CREER`/`REJOINDRE`.

```powershell
.\scripts\test-whatsapp-webhook.ps1
.\scripts\test-whatsapp-bot.ps1
npm run test
```

### Production (Meta + Supabase)

```bash
supabase functions deploy whatsapp-webhook
supabase functions deploy tontine-automation
supabase secrets set WHATSAPP_VERIFY_TOKEN=... WHATSAPP_TOKEN=... WHATSAPP_PHONE_NUMBER_ID=... APP_ORIGIN=... CRON_SECRET=...
```

- Webhook Meta : `https://<ref>.supabase.co/functions/v1/whatsapp-webhook`
- Cron tours : `POST .../tontine-automation` + `Authorization: Bearer <CRON_SECRET>`

Code : `supabase/functions/whatsapp-webhook/` · `_shared/whatsapp/`

---

## Script démo soutenance (~10 min)

| # | Action | Point à montrer au jury |
|---|--------|-------------------------|
| 1 | Ouvrir `/` | Proposition de valeur : tontine + Bitcoin + MoMo + WhatsApp |
| 2 | `/crypto` | Prix BTC live, trésor en sats, signature d'engagement |
| 3 | `/whatsapp` | Tester `AIDE`, `CREER`, `/bitcoin`, `/solde` |
| 4 | `/inscription` → `/home` | Compte, portefeuille FCFA |
| 5 | Créer groupe → inviter → **Activer** | `rpc_activate_group` (sans Convex) |
| 6 | `/groupe/:id` | Registre des membres, preuves Bitcoin |
| 7 | `/cotiser` | Flux paiement Kkiapay (sandbox) |

**Pitch en une phrase :** digitaliser les tontines informelles avec traçabilité, Mobile Money local, réserve Bitcoin et accès WhatsApp — inclusion financière pour ceux qui n'installent pas d'app bancaire.

---

## Scripts npm

```bash
npm run dev              # Serveur de développement (port 8080)
npm run build            # Build production → dist/
npm run preview          # Prévisualiser le build
npm run lint             # ESLint
npm run test             # Vitest (18 tests)
npm run test:all         # test + build
npm run verify:local     # test + build + WhatsApp (PowerShell)

npm run supabase:start   # Démarrer Supabase local (Docker)
npm run supabase:stop    # Arrêter Supabase local
npm run supabase:reset   # Réappliquer migrations + seed
npm run local:setup      # start + reset
```

---

## Structure du projet

```
tontine-trust/
├── src/
│   ├── pages/              # Écrans (Landing, Home, GroupeDetail, …)
│   ├── components/         # UI + landing + crypto
│   ├── lib/                # bitcoin*, whatsappCommands, supabase
│   └── hooks/              # auth, prix BTC, …
├── public/
│   ├── images/hero-3d.png
│   └── logos/              # kkiapay, bitcoin, whatsapp
├── supabase/
│   ├── migrations/         # Schéma PostgreSQL
│   ├── functions/whatsapp-webhook/
│   └── seed.sql
├── scripts/test-whatsapp-webhook.ps1
├── scripts/test-whatsapp-bot.ps1
├── scripts/verify-local.ps1
├── scripts/deploy-cloud.ps1
└── vite-plugin-whatsapp.ts # Webhook dev uniquement
```

---

## MCP Cursor (Supabase + GitHub)

Pour que l’agent Cursor puisse appliquer les migrations, déployer les edge functions et gérer le repo :

1. **Token Supabase** : [Dashboard → Account → Access Tokens](https://supabase.com/dashboard/account/tokens) (scope complet sur le projet `slyizcavccnkvxqtmfmd`)
2. **Token GitHub** : [Settings → Developer settings → PAT](https://github.com/settings/tokens) (scope `repo`)
3. Copier le modèle et remplacer les placeholders :

```powershell
copy .cursor\mcp.json.example $env:USERPROFILE\.cursor\mcp.json
# Éditer %USERPROFILE%\.cursor\mcp.json avec vos tokens
```

4. **Cursor** → Settings → MCP → vérifier le point vert sur `supabase` et `github`
5. Recharger la fenêtre (`Ctrl+Shift+P` → *Reload Window*)

Ensuite, demandez à l’agent : *« Applique les migrations Supabase et déploie les edge functions »*.

Déploiement manuel (sans MCP) :

```powershell
supabase login
.\scripts\deploy-cloud.ps1
```

---

## Licence

Projet académique / démonstration — usage selon les conditions du dépôt.
