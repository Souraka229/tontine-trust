# Scénario de Démo Finale TontineChain

Objectif : montrer un MVP mobile-first où les règles sont automatiques, les cas limites sont gérés, et chaque action critique est vérifiable par preuve blockchain.

## Préparation

- Ouvrir l'application sur téléphone ou navigateur mobile.
- Se connecter avec deux ou trois comptes de démonstration.
- Vérifier que `VITE_CONVEX_URL` pointe vers le déploiement Convex de démo.
- Activer le mode sandbox Kkiapay/Convex pour éviter les vrais paiements pendant le pitch.

## Parcours 1 — Création de tontine

1. Créer une tontine `Femmes Dantokpa`.
2. Définir le montant, la fréquence, le nombre de membres, l'ordre de passage et la pénalité.
3. Saisir une couverture obligatoire : banque partenaire, assurance, dépôt ou garant.
4. Signer la reconnaissance d'engagement tontinier.
5. Montrer que les règles et l'engagement génèrent des preuves blockchain.

Message à dire : les règles sont figées avant activation. Même l'organisateur ne peut pas changer l'ordre, le montant ou les pénalités après coup.

## Parcours 2 — Adhésion sécurisée

1. Un membre rejoint le groupe.
2. Il valide sa couverture obligatoire.
3. Il accepte l'engagement : cotiser jusqu'à la fin du cycle, même après avoir reçu la cagnotte.
4. Son engagement est hashé et ajouté au registre de preuves.

Message à dire : l'app ne repose plus seulement sur la confiance sociale. Chaque membre prend un engagement vérifiable.

## Parcours 3 — Cotisation et distribution

1. Activer le groupe quand tous les membres sont couverts.
2. Faire cotiser les membres via Mobile Money/Kkiapay ou portefeuille.
3. Montrer le suivi temps réel : payé, en attente, retard.
4. Quand tout le monde a payé, le cron Convex déclenche la distribution.
5. Le bénéficiaire reçoit la cagnotte et une preuve `payout` est créée.

Message à dire : l'organisateur ne garde jamais la caisse. La règle automatique déclenche la distribution.

## Parcours 4 — Retard et blocage

1. Simuler un membre qui ne paie pas avant la deadline.
2. Le système le marque `late`.
3. Le portefeuille du membre est bloqué pour les retraits.
4. Une notification de retard est créée.
5. La pénalité et la régularisation sont enregistrées.

Message à dire : les retards ne sont pas négociés au cas par cas. La règle s'applique à tous.

## Parcours 5 — Décès ou défaillance grave

1. Déclarer un incident de type décès ou défaillance.
2. Le système ouvre un dossier de sinistre/garantie.
3. Les pénalités du membre concerné sont suspendues.
4. L'assurance, la banque ou le garant prend le relais selon les clauses.
5. L'incident est hashé et ajouté aux preuves.

Message à dire : le décès ne doit pas faire exploser toute la tontine. Le groupe a une procédure claire avant même le premier paiement.

## Parcours 6 — Dissolution anticipée

1. Simuler une dissolution avant activation ou après incident validé.
2. Le groupe passe en `cancelled`.
3. Les remboursements ou résolutions sont traçables.
4. Une preuve de dissolution est ajoutée au registre.

Message à dire : même la fermeture du groupe suit des règles visibles et vérifiables.

## Pitch en une phrase

TontineChain combine Mobile Money, règles automatiques, couverture obligatoire et preuves blockchain pour transformer une tontine basée sur la confiance orale en un système d'épargne collectif vérifiable.
