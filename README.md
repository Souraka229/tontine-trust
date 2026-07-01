# HACKBIT

**Tontine Bitcoin Lightning + WhatsApp Bot + Mobile Money**

HACKBIT combine un bot WhatsApp de tontine (FlashBot) avec une interface web moderne pour creer la premiere solution de tontine 100% Bitcoin en Afrique de l'Ouest.

## Architecture

```
[Membres] --> WhatsApp --> [FlashBot Python/Flask] --> [LNbits / Lightning Network]
                                    |
                              API REST /api/*
                                    |
                          [Interface React/Vite]
                           (Dashboard + Tresor BTC)
                                    |
                          [KKiapay] (on-ramp fiat MoMo)
```

## Bitcoin = Colonne Vertebrale

- Toutes les cotisations sont en **satoshis** via le Lightning Network
- Paiements reels via **LNbits** (invoices, webhooks, wallet)
- Cours BTC/FCFA en temps reel via CoinGecko (taux fixe EUR->XOF zone UEMOA)
- Tresor on-chain avec sync mempool.space
- Preuves cryptographiques secp256k1 (courbe Bitcoin)

## Modules

| Module | Tech | Role |
|--------|------|------|
| **Bot WhatsApp** | Python/Flask | Canal principal : CREER, REJOINDRE, PAYER |
| **Lightning** | LNbits | Paiements sats, invoices, wallet |
| **Interface web** | React/Vite/Tailwind | Dashboard metrics, tresor BTC, groupes |
| **Fiat on-ramp** | KKiapay | MoMo (MTN, Moov, Celtiis) -> conversion sats |
| **Auth** | Supabase | Authentification web |

## Demarrage rapide

### Frontend (interface web)

```bash
npm install
cp .env.example .env  # configurer les cles
npm run dev            # http://localhost:8080
```

### Bot WhatsApp (backend)

```bash
cd bot/
pip install -r requirements.txt
cp ../.env.example .env  # configurer WhatsApp + LNbits
python app.py            # http://localhost:5000
```

### Variables d'environnement

Voir `.env.example` pour toutes les variables necessaires.

## API Bot (Flask)

| Route | Description |
|-------|-------------|
| `GET /api/stats` | Stats globales (tontines, membres, sats) |
| `GET /api/btc-rate` | Cours BTC/FCFA en temps reel |
| `GET /api/tontine/<code>` | Detail d'une tontine + rounds + paiements |
| `GET /api/tontines/recent` | 10 dernieres tontines |
| `GET /api/activity` | Flux activite Lightning recente |
| `GET /health` | Health check |

## Stack

- **Frontend** : React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, Recharts
- **Backend** : Python, Flask, SQLite, APScheduler
- **Bitcoin** : LNbits (Lightning), mempool.space (on-chain), secp256k1
- **Fiat** : KKiapay (Mobile Money Benin)
- **Auth** : Supabase
- **WhatsApp** : Meta WhatsApp Business API
