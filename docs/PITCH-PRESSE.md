# TontineChain — Pitch presse · 1er juillet 2026

> **PDF à partager :** [docs/PITCH-PRESSE.pdf](./PITCH-PRESSE.pdf) · aussi dans `public/PITCH-PRESSE.pdf`  
> Régénérer : `npm run pitch:pdf`

**Durée totale :** 8–10 minutes (5 min discours + 3 min démo + questions)  
**Public :** presse généraliste, fintech, tech  
**Démo :** http://localhost:8080 · Supabase cloud opérationnel

---

## LA PHRASE À RETENIR (10 secondes)

> **« TontineChain digitalise la tontine africaine — l'épargne rotative de millions de personnes — avec le Mobile Money, WhatsApp, et une caisse commune validée par 3 gardiens sur 5, avec une réserve Bitcoin vérifiable. »**

---

# PARTIE A — SCRIPT ORAL (à lire demain)

*Ton : calme, concret, fier mais honnête. Pas de jargon technique sauf si on vous le demande.*

---

### [0:00 – 0:45] ACCROCHE

« Bonjour. Je m'appelle [VOTRE NOM]. Je vous présente **TontineChain**.

Au Bénin et dans toute l'Afrique de l'Ouest, la **tontine** reste l'une des plus grandes formes d'épargne. Chaque mois, chaque membre met de l'argent dans la cagnotte. Chaque mois, une personne reçoit la somme. C'est la ROSCA — la rotating savings — et presque tout le monde en a vu une : au bureau, dans le quartier, dans la famille.

Aujourd'hui, ça se passe souvent sur **WhatsApp**, en **cash**, sur la **confiance** en un seul trésorier. Quand ça casse — retard, litige, disparition de la caisse — c'est toute une communauté qui souffre.

**TontineChain ne remplace pas cette tradition. On la rend traçable, payée en Mobile Money, et protégée par une garde collective.** »

---

### [0:45 – 1:45] LE PROBLÈME

« Trois douleurs, que vous connaissez peut-être déjà :

**Un** — pas de registre fiable. Qui a payé ? Qui a reçu ? Les carnets se perdent, les messages WhatsApp s'effacent.

**Deux** — un seul point de défaillance. Le trésorier détient toute la caisse. S'il triche ou disparaît, le groupe est fini.

**Trois** — l'épargne en FCFA seule, face à l'inflation. Les gens cherchent des solutions, mais le Bitcoin en Afrique de l'Ouest reste souvent perçu comme du trading ou de l'arnaque — pas comme un outil d'épargne collective.

Nos utilisateurs cibles : salariés, commerçants, diaspora. Ils ont un smartphone, du **MTN MoMo**, du **Moov Money**, **WhatsApp** — pas forcément un compte bancaire classique. »

---

### [1:45 – 2:45] L'INSPIRATION BIT SACCO

« Nous nous inspirons de **Bitsacco**, au Kenya. Bitsacco a montré qu'une communauté peut détenir des bitcoins **ensemble**, avec des règles de consensus — comme une coopérative financière africaine, mais sur Bitcoin.

**TontineChain**, c'est la même philosophie, appliquée à la **tontine UEMOA** :

| Ce que fait Bitsacco | Ce que fait TontineChain |
|----------------------|--------------------------|
| Garde communautaire | **Garde collective 3 sur 5** |
| Lightning, micro-frais | **LNbits** pour les petites cotisations |
| Bitcoin vérifiable | Solde consultable sur **mempool.space** |
| Coopérative | **Tontine ROSCA** + FCFA + WhatsApp |

La différence : nous partons de ce que les gens utilisent **déjà** — pas du trading crypto. »

---

### [2:45 – 4:00] LA SOLUTION — 4 PILIERS

« TontineChain, c'est quatre briques :

**1. Tontine ROSCA digitale**  
Créer un groupe, fixer le montant et la fréquence, inviter par lien, activer le premier tour.

**2. Cotisations en FCFA / Mobile Money**  
MTN, Moov, Orange — via **Kkiapay**. Le membre cotise comme il le fait déjà au quotidien.

**3. Garde collective 3 sur 5**  
C'est notre réponse au vol de caisse. Cinq gardiens sont désignés parmi les membres. **Trois doivent valider** avant que la cagnotte du mois ne parte. Plus un seul trésorier tout-puissant.

**4. Trésor Bitcoin**  
Une partie du collectif peut être indexée en satoshis. Cours live, dépôts **Lightning** quasi gratuits, solde **vérifiable publiquement**. Les membres signent leurs engagements en **cryptographie secp256k1** — la même famille que Bitcoin.

**Et le cinquième canal : WhatsApp.**  
`/solde`, `/groupes`, `/cotiser`, `/bitcoin` — sans télécharger l'application. »

---

### [4:00 – 5:30] DÉMO LIVE *(en parlant pendant que vous montrez)*

« Je vous montre en direct.

**[Landing `/`]** — Les quatre piliers : tontine, MoMo, Bitcoin, WhatsApp.

**[Connexion / groupe]** — Un groupe actif : montant, tour de passage, membres.

**[Cotiser]** — Paiement FCFA via Kkiapay ou portefeuille interne.

**[Groupe — versement]** — C'est le tour de [nom du bénéficiaire]. Il **signe** son engagement. Puis les **gardiens valident** — regardez la barre : 1… 2… 3 sur 5. La cagnotte est autorisée.

**[`/crypto`]** — Trésor Bitcoin : prix live, garde collective, Lightning.

**[`/whatsapp`]** — Le bot : `/solde`, `/groupes`.

Voilà. En moins de trois minutes, une tontine complète — du paiement MoMo à la validation collective. »

---

### [5:30 – 6:30] HONNÊTETÉ & VISION

« Soyons clairs sur où nous en sommes — c'est un **MVP en pilote**, pas une banque licenciée.

**Aujourd'hui, c'est réel :**
- Auth, groupes, cotisations, score de confiance
- Garde collective **3/5 opérationnelle** dans l'application
- Trésor Bitcoin : registre, Lightning LNbits, vérification on-chain
- Bot WhatsApp en démo + edge functions déployées sur Supabase

**En cours de déploiement :**
- Kkiapay en production (aujourd'hui sandbox)
- WhatsApp Business Meta en production
- Multisig Bitcoin on-chain / Fedimint — la prochaine étape après la garde logique 3/5

Nous ne vendons pas du rêve crypto. Nous sécurisons une pratique sociale millénaire avec les outils du XXIe siècle. »

---

### [6:30 – 7:00] CLOSING

« La tontine a fait l'épargne de l'Afrique pendant des décennies.

**TontineChain** lui donne un **registre**, un **paiement MoMo**, une **garde collective**, et un **coffre vérifiable**.

C'est l'épargne de quartier — pour l'ère du mobile et de la transparence.

Je suis disponible pour vos questions — et pour une démo individuelle après l'interview. Merci. »

---

# PARTIE B — VERSION EXPRESS (3 minutes)

Si le journaliste dit « on a peu de temps » :

1. **30 s** — Accroche (phrase à retenir + problème trésorier)
2. **45 s** — 4 piliers (ROSCA, MoMo, garde 3/5, Bitcoin + WhatsApp)
3. **60 s** — Démo : landing → garde collective → `/crypto`
4. **30 s** — Closing + « MVP pilote, vision UEMOA »
5. **15 s** — « Questions ? »

---

# PARTIE C — SCÉNARIO DÉMO (préparer ce soir)

### Comptes à préparer

| Rôle | Action |
|------|--------|
| Admin | Crée le groupe ou utilise un groupe seed |
| Membres 2–5 | Rejoignent via lien d'invitation |
| Bénéficiaire du tour | Compte qui signera l'engagement |
| 3 gardiens | Comptes différents pour cliquer « Valider » |

### Ordre écran par écran

```
1. http://localhost:8080/          → Landing (4 cartes)
2. /rechercher                     → Rejoindre « Diaspora Cotonou » ou groupe démo
3. /home                           → Mes groupes
4. /cotiser                        → Cotisation FCFA (démo)
5. /groupe/:id                     → Barre garde collective 3/5
6. Bénéficiaire → Signer ECDSA
7. Gardien 1, 2, 3 → Valider
8. /crypto                         → Trésor + Lightning
9. /whatsapp                       → /solde
```

### Si quelque chose plante

| Problème | Plan B |
|----------|--------|
| Supabase lent | Montrer landing + `/crypto` + WhatsApp (publics) |
| Kkiapay échoue | Portefeuille interne + « mode sandbox » |
| Prix BTC ne charge pas | Dire « API CoinGecko » et montrer la page quand même |
| Garde 3/5 bloquée | Expliquer le flux sur la barre de progression statique |

---

# PARTIE D — CHECKLIST VEILLE & MATIN J

### Ce soir (30 juin)

- [ ] `npm run dev` → http://localhost:8080 répond
- [ ] Compte démo connecté, groupe avec membres prêt
- [ ] Tester : signature bénéficiaire + 3 validations gardiens
- [ ] Tester `/crypto` et `/whatsapp`
- [ ] Charger le laptop, partage d'écran testé
- [ ] Imprimer ou avoir sur téléphone ce document (Partie A)

### Demain matin (1er juillet)

- [ ] Redémarrer : `npm run dev` (recharge le `.env`)
- [ ] Ouvrir les onglets : `/`, groupe démo, `/crypto`, `/whatsapp`
- [ ] Connexion stable (partage 4G en backup)
- [ ] Tenue sobre, fond neutre si visio
- [ ] Eau, respirer, sourire

### Commande unique

```powershell
cd c:\Users\DELL\tontine-trust
npm run dev
```

---

# PARTIE E — TITRES PRESSE (pour le journaliste)

Choisissez selon l'angle de l'interview :

1. **« TontineChain : la tontine digitale qui protège la caisse avec 3 gardiens sur 5 »**
2. **« Au Bénin, une fintech réconcilie Mobile Money, WhatsApp et Bitcoin »**
3. **« Inspiré du Kenya (Bitsacco), une app sécurise l'épargne rotative en Afrique de l'Ouest »**
4. **« TontineChain : quand l'épargne de quartier rencontre la transparence blockchain »**

---

# PARTIE F — QUESTIONS DIFFICILES

| Question | Réponse (30 s max) |
|----------|-------------------|
| **C'est légal ?** | Nous passons par des agrégateurs de paiement licenciés (Kkiapay). La conformité UEMOA est un chantier prioritaire avant le scale. |
| **Le Bitcoin, c'est pas risqué ?** | C'est une **fraction** du trésor, pas toute l'épargne. L'objectif : transparence et protection long terme — pas le trading. |
| **Un admin peut tout voler ?** | **Non.** Trois gardiens sur cinq doivent valider chaque décaissement. C'est le cœur du produit. |
| **C'est comme Bitsacco ?** | Même philosophie de garde communautaire. Nous partons de la **tontine ROSCA** + **FCFA** + **WhatsApp** — le contexte UEMOA. |
| **C'est fini ou c'est une maquette ?** | MVP **fonctionnel** : base cloud Supabase, 27 tests automatisés, edge functions déployées. Pilote, pas encore en production nationale. |
| **Pourquoi pas une banque ?** | La tontine **existe déjà**. Nous ne la remplaçons pas — nous la sécurisons là où elle vit. |
| **WhatsApp, c'est réel ?** | Bot opérationnel en démo ; déploiement Meta Business en cours pour la production. |

---

# PARTIE G — ONE-PAGER JOURNALISTE (à copier-coller)

**TontineChain** · Tontine digitale · Bénin / UEMOA  
**Site démo :** http://localhost:8080

**Problème :** Tontines informelles, caisse opaque, un seul trésorier.  
**Solution :** ROSCA digitale + MoMo (Kkiapay) + garde collective 3/5 + trésor Bitcoin vérifiable + bot WhatsApp.  
**Inspiration :** Bitsacco (Kenya) — garde communautaire sur Bitcoin.  
**Statut :** MVP pilote, Supabase cloud, 27 tests OK.  
**Contact :** [VOTRE EMAIL] · [VOTRE TÉLÉPHONE]

---

# PARTIE H — ÉTAT TECHNIQUE (pour vous rassurer)

| Vérification | Statut |
|--------------|--------|
| Tests Vitest | 27/27 ✅ |
| Build production | ✅ |
| Supabase cloud | `slyizcavccnkvxqtmfmd.supabase.co` |
| Garde collective 3/5 | Déployée (RPC + UI) |
| `rpc_public_stats` | ✅ (stats landing) |
| Edge functions | whatsapp, kkiapay, lnbits, automation, btc-sync |

---

*Bonne chance pour demain. Vous portez un vrai problème africain et une vraie solution — restez simple, montrez la démo, assumez le MVP.*
