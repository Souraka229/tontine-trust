export const MSG_AIDE = `🟢 *TontineChain Bot*

*Gestion tontine (WhatsApp)*
• CREER — créer une tontine
• REJOINDRE CODE — rejoindre (ex: REJOINDRE TONT-4X7K)
• TONTINE — statut de votre tontine
• MEMBRES — liste et ordre des tours
• HISTORIQUE — tours passés

*Portefeuille & app*
• /solde — solde FCFA
• /groupes — toutes vos tontines
• /cotiser — cotisations en attente
• /score — score de confiance
• /notifs — notifications

*Bitcoin & Lightning*
• /bitcoin — cours live
• /liquidity — trésor collectif
• INVOICE 500 — facture Lightning (sats)

Tapez *ANNULER* pour quitter un assistant en cours.`;

export const MSG_UNKNOWN = `❓ Commande non reconnue.

Tapez *AIDE* ou */aide* pour le menu complet.`;

export const MSG_CREATE_NAME = `⚡ *Création d'une tontine*

Quel est le *nom* de votre tontine ?
(2 à 30 caractères — ex: MaFamille)`;

export const MSG_CREATE_AMOUNT = `✅ Nom enregistré !

*Montant par tour* en FCFA pour chaque membre ?
(minimum 1 000 — ex: 50000)`;

export const MSG_CREATE_MEMBERS = `✅ Montant enregistré !

*Combien de membres* au total (vous inclus) ?
(2 à 50)`;

export const MSG_CREATE_FREQ = `✅ Membres enregistrés !

*Fréquence des tours :*
• JOURNALIER
• HEBDOMADAIRE
• BIMENSUELLE
• MENSUELLE
• TRIMESTRIELLE`;

export function msgCreateConfirm(
  name: string,
  amount: number,
  maxMembers: number,
  freqLabel: string,
): string {
  return `📋 *Récapitulatif*

📛 Nom : *${name}*
💰 Cotisation : *${amount.toLocaleString("fr-FR")} FCFA*/tour
👥 Membres : *${maxMembers}*
🔁 Fréquence : *${freqLabel}*

Tapez *OUI* pour confirmer ou *ANNULER*.`;
}

export function msgGroupCreated(
  name: string,
  code: string,
  amount: number,
  maxMembers: number,
  freqLabel: string,
): string {
  return `🎉 *Tontine créée !*

📛 *${name}*
🔑 Code : *${code}*
💰 *${amount.toLocaleString("fr-FR")} FCFA*/tour
👥 1/${maxMembers} membre(s)
🔁 ${freqLabel}

Partagez le code à vos proches :
👉 *REJOINDRE ${code}*

La tontine démarre quand tous les membres ont rejoint.`;
}

export function msgMemberJoined(name: string, current: number, max: number): string {
  if (current < max) {
    return `✅ *Vous avez rejoint ${name} !*

👥 Membres : *${current}/${max}*
En attente des autres membres…`;
  }
  return `✅ *Vous avez rejoint ${name} !*

👥 *${current}/${max}* — complet !
La tontine va démarrer sous peu ⚡`;
}

export const MSG_JOIN_USAGE = `⚠️ Indiquez le code de la tontine.
Ex: *REJOINDRE TONT-4X7K*`;

export const MSG_NOT_LINKED = `❌ Compte non lié.

Inscrivez-vous sur l'app puis associez votre numéro WhatsApp dans *Profil → Paramètres*.`;

export const MSG_SESSION_CANCELLED = `↩️ Assistant annulé. Tapez *AIDE* pour le menu.`;
