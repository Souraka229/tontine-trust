# Plan d'intégration LNbits — TontineChain

> **Objectif** : ajouter Lightning Network (via [LNbits](https://lnbits.com)) comme couche de paiement Bitcoin **réelle et instantanée**, en complément du trésor on-chain actuel (mempool.space) et du registre interne (`btc_ledger`).

**Contexte actuel** : dépôts on-chain lents/coûteux, liquidité `sats_liquid` alimentée uniquement par sync mempool. LNbits permet factures Lightning (BOLT11), webhooks de paiement, et wallets séparés par usage.

---

## 1. Pourquoi LNbits ici ?

| Besoin tontine | Aujourd'hui | Avec LNbits |
|----------------|-------------|-------------|
| Alimenter le trésor | Dépôt on-chain + sync (minutes/heures) | Facture LN → crédit en secondes |
| Preuve de paiement | `txid` on-chain | `payment_hash` + preimage |
| Démo soutenance | 1 tx mainnet petite | QR Lightning scannable (wallet demo) |
| Payout bénéficiaire | FCFA MoMo uniquement | Option : paiement LN au gagnant du tour |
| WhatsApp | `/bitcoin`, `/liquidity` | `/invoice`, `/payer` |

**Ce que LNbits n'est pas** : ce n'est pas un remplacement de Kkiapay (FCFA/MoMo). C'est la **jambe Bitcoin** du système dual FCFA + BTC.

---

## 2. Architecture cible

```
┌─────────────────────────────────────────────────────────────────┐
│                        TontineChain App                          │
│  /crypto  →  onglet Lightning (QR facture, historique LN)       │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────────┐ ┌───────────────┐ ┌─────────────────────┐
│  Supabase Edge  │ │  LNbits API   │ │  mempool.space      │
│  lnbits-webhook │ │  (wallet API) │ │  (on-chain existant)│
│  lnbits-invoice │ │               │ │                     │
└────────┬────────┘ └───────┬───────┘ └──────────┬──────────┘
         │                  │                     │
         └──────────────────┼─────────────────────┘
                            ▼
                 ┌──────────────────────┐
                 │  PostgreSQL           │
                 │  btc_ledger           │
                 │  btc_ln_payments  NEW │
                 │  btc_treasury_pool    │
                 └──────────────────────┘
```

### Rôles des composants

| Composant | Rôle |
|-----------|------|
| **Wallet LNbits « Trésor »** | Reçoit les dépôts Lightning du trésor collectif |
| **Wallet LNbits « Payouts »** (phase 2) | Envoie les paiements aux bénéficiaires |
| **Edge `lnbits-create-invoice`** | Crée facture BOLT11 (montant sats, mémo) |
| **Edge `lnbits-webhook`** | Reçoit callback LNbits → `rpc_btc_ingest_ln_payment` |
| **Registre `btc_ledger`** | Entrée `ln_deposit` (comme `on_chain_deposit`) |

---

## 3. Modèle de données (migration SQL)

### Table `btc_ln_payments`

```sql
CREATE TABLE public.btc_ln_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_hash    TEXT UNIQUE NOT NULL,
  bolt11          TEXT NOT NULL,
  amount_msat     BIGINT NOT NULL,
  sats            BIGINT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'paid', 'expired', 'failed')),
  purpose         TEXT NOT NULL DEFAULT 'treasury_deposit'
                  CHECK (purpose IN ('treasury_deposit', 'member_payout', 'contribution')),
  profile_id      UUID REFERENCES public.profiles(id),
  group_id        UUID REFERENCES public.groups(id),
  memo            TEXT,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
```

### Extension `btc_ledger`

- Nouveau `entry_type` : `ln_deposit`
- `idempotency_key` : `ln-{payment_hash}`

### RPC `rpc_btc_ingest_ln_payment`

Même logique que `rpc_btc_ingest_on_chain_tx` :

1. Vérifier `payment_hash` pas déjà ingéré
2. `sats_liquid += sats`, `on_chain_sats` inchangé (ou colonne `ln_sats` dédiée — recommandé)
3. Écriture `btc_ledger` type `ln_deposit`
4. Mettre à jour `btc_ln_payments.status = 'paid'`

### Colonne optionnelle trésor

```sql
ALTER TABLE btc_treasury_pool ADD COLUMN IF NOT EXISTS ln_sats BIGINT NOT NULL DEFAULT 0;
```

Séparer **on-chain** vs **Lightning** pour le jury :

- `on_chain_sats` = UTXO confirmés (mempool)
- `ln_sats` = solde wallet LNbits (API `/wallet`)
- `sats_liquid` = disponible pour `rpc_btc_buy_fcfa` (on-chain + LN)

---

## 4. Variables d'environnement

### Secrets Supabase (jamais `VITE_`)

| Secret | Description |
|--------|-------------|
| `LNBITS_URL` | Ex. `https://demo.lnbits.com` ou instance self-hosted |
| `LNBITS_TREASURY_ADMIN_KEY` | Admin key wallet trésor |
| `LNBITS_TREASURY_INVOICE_KEY` | Invoice/read key (création factures) |
| `LNBITS_WEBHOOK_SECRET` | HMAC ou token pour valider les webhooks |
| `LNBITS_PAYOUT_ADMIN_KEY` | (Phase 2) Wallet payouts |

### Frontend (public, optionnel)

| Variable | Description |
|----------|-------------|
| `VITE_LNBITS_ENABLED` | `true` pour afficher l'onglet Lightning |
| `VITE_LNBITS_URL` | URL publique LNbits (affichage seulement) |

---

## 5. Phases d'implémentation

### Phase 0 — Préparation (½ journée)

- [ ] Créer compte / instance LNbits (testnet d'abord : [legend.lnbits.com](https://legend.lnbits.com) ou demo)
- [ ] Créer wallet **TontineChain-Treasury**
- [ ] Noter Admin Key + Invoice Key
- [ ] Tester manuellement : `POST /api/v1/payments` → payer avec wallet Phoenix/Muun testnet
- [ ] Documenter dans `.env.example`

### Phase 1 — Dépôts Lightning trésor (MVP soutenance) — 2–3 jours

**Backend**

- [ ] Migration `btc_ln_payments` + `rpc_btc_ingest_ln_payment` + `ln_sats`
- [ ] Edge function `lnbits-create-invoice` :
  - Input : `{ amount_sats, memo, profile_id?, purpose }`
  - Appel LNbits `POST /api/v1/payments` avec header `X-Api-Key: INVOICE_KEY`
  - Insert `btc_ln_payments` status `pending`
  - Return : `{ bolt11, payment_hash, qr_uri }`
- [ ] Edge function `lnbits-webhook` :
  - LNbits extension Webhook ou polling `GET /api/v1/payments/{hash}`
  - Sur `paid` → `rpc_btc_ingest_ln_payment`
- [ ] Cron optionnel `lnbits-poll-pending` (backup si webhook rate)

**Frontend (`/crypto`)**

- [ ] Onglet **Lightning** à côté du trésor on-chain
- [ ] Formulaire : montant sats → bouton « Générer facture »
- [ ] QR code BOLT11 (`qrcode.react` ou image LNbits)
- [ ] Statut : en attente / payé (polling ou realtime Supabase)
- [ ] Historique `btc_ln_payments`

**Tests**

- [ ] Test unitaire mock LNbits response
- [ ] Test E2E testnet : facture 100 sats → webhook → `sats_liquid` +1

**Pitch jury**

> « Le trésor accepte aussi Lightning : facture BOLT11, paiement instantané, crédit automatique dans le registre. »

### Phase 2 — Payout Lightning au bénéficiaire (3–4 jours)

- [ ] Wallet LNbits **Payouts** séparé du trésor
- [ ] Lors de `rpc_activate_group` / distribution tour : option « payout LN »
- [ ] Membre enregistre `lnurl` ou facture BOLT11 dans profil
- [ ] Edge `lnbits-pay-invoice` : `POST /api/v1/payments` (outgoing) ou LNURL-pay
- [ ] Entrée ledger `ln_payout` (sats négatif trésor)
- [ ] UI GroupeDetail : « Recevoir ma cagnotte en Lightning »

**Limite honnête** : nécessite liquidité LN + canaux ; en démo testnet uniquement.

### Phase 3 — WhatsApp + automation (1–2 jours)

- [ ] Commande `/invoice 500` → lien ou QR via message
- [ ] Commande `/ln_solde` → balance wallet LNbits treasury
- [ ] Intégration `readCommands.ts` + flows existants
- [ ] Notification WhatsApp quand facture payée

### Phase 4 — Production mainnet (hors soutenance)

- [ ] Instance LNbits self-hosted (VPS + LND/Core Lightning)
- [ ] Canaux Lightning ouverts (LSP : Voltage, Alby Hub, etc.)
- [ ] Limites montants, rate limiting, audit logs
- [ ] RLS : aucune clé LNbits côté client

---

## 6. Fichiers à créer / modifier

```
supabase/
  migrations/20260701100000_lnbits_lightning.sql
  functions/
    lnbits-create-invoice/index.ts
    lnbits-webhook/index.ts
    lnbits-poll-pending/index.ts          # optionnel
    _shared/lnbits/
      client.ts                           # fetch LNbits API
      types.ts
src/
  lib/lnbits.ts                           # appels via edge (pas de clé directe)
  lib/lnbitsRepository.ts
  components/crypto/LightningDepositCard.tsx
  pages/CryptoLiquidity.tsx               # onglet Lightning
  test/lnbits.test.ts
scripts/
  setup-lnbits.ps1
.env.example                              # LNBITS_* secrets commentés
```

---

## 7. Client LNbits (référence API)

```typescript
// supabase/functions/_shared/lnbits/client.ts
const base = Deno.env.get("LNBITS_URL")!;
const key = Deno.env.get("LNBITS_TREASURY_INVOICE_KEY")!;

export async function createInvoice(amountSats: number, memo: string) {
  const res = await fetch(`${base}/api/v1/payments`, {
    method: "POST",
    headers: { "X-Api-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      out: false,
      amount: amountSats,
      memo,
      unit: "sat",
    }),
  });
  if (!res.ok) throw new Error(`LNbits ${res.status}`);
  return await res.json(); // { payment_hash, payment_request, ... }
}
```

Webhook LNbits (extension) → votre URL :

`https://<ref>.supabase.co/functions/v1/lnbits-webhook`

---

## 8. Cohérence avec le modèle « honnête »

| Affirmation jury | Vrai si… |
|------------------|----------|
| « Paiement Lightning réel » | Facture LNbits testnet/mainnet payée et webhook reçu |
| « Trésor instantané » | `ln_sats` / `sats_liquid` mis à jour après preimage |
| « Tontine en FCFA » | Kkiapay reste le flux principal ; LN = option BTC |
| « 2 % cotisation → BTC » | Toujours comptable (`internal_sats`) sauf si politique explicite de swap LN |

**Ne pas dire** : « toute cotisation MoMo devient du Lightning automatiquement ».

---

## 9. Choix techniques à trancher

| Question | Recommandation soutenance | Prod |
|----------|---------------------------|------|
| Instance LNbits | legend.lnbits.com (testnet) | Self-hosted + LND |
| Webhook vs polling | Webhook + poll backup 60s | Webhook only |
| 1 wallet vs N wallets | 1 wallet trésor global | 1 wallet par groupe (isolation) |
| `sats_liquid` | on-chain + LN cumulés | Colonnes séparées + vue |
| QR dans l'app | Oui, onglet /crypto | + lien WhatsApp |

---

## 10. Estimation effort

| Phase | Durée | Priorité |
|-------|-------|----------|
| 0 Préparation | 4 h | P0 |
| 1 Dépôts LN trésor | 2–3 j | **P0 soutenance** |
| 2 Payout bénéficiaire | 3–4 j | P1 |
| 3 WhatsApp | 1–2 j | P1 |
| 4 Mainnet prod | 1–2 sem | P2 |

---

## 11. Checklist démo soutenance (Lightning)

1. Ouvrir `/crypto` → onglet Lightning
2. Générer facture 500 sats (testnet)
3. Scanner avec Phoenix / Wallet of Satoshi (testnet)
4. Webhook reçu → toast « Dépôt Lightning ingéré »
5. Montrer `sats_liquid` augmenté + ligne `ln_deposit` dans ledger
6. Expliquer : on-chain (lent, gros montants) vs Lightning (instantané, micro-dépôts)

---

## 12. Risques

| Risque | Mitigation |
|--------|------------|
| Clé LNbits exposée | Uniquement secrets edge ; jamais `VITE_` |
| Webhook forgé | Secret HMAC, vérifier `payment_hash` via API LNbits |
| Double crédit | `payment_hash` UNIQUE + idempotency `ln-{hash}` |
| Canaux vides (mainnet) | Rester testnet pour démo ; documenter LSP pour prod |
| Confusion jury on-chain/LN | UI 3 colonnes : On-chain \| Lightning \| Registre |

---

## 13. Prochaine action immédiate

```powershell
# 1. Créer wallet sur https://legend.lnbits.com
# 2. Ajouter secrets Supabase
# 3. Lancer l'implémentation Phase 1

.\scripts\setup-lnbits.ps1 -Url "https://legend.lnbits.com" -InvoiceKey "..." -AdminKey "..."
```

Ensuite : migration SQL → edge `lnbits-create-invoice` → composant QR → test 100 sats testnet.

---

*Document vivant — à mettre à jour après chaque phase.*
