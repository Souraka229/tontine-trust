#!/usr/bin/env python3
"""Génère le cahier des charges PDF TontineChain."""

from pathlib import Path
from fpdf import FPDF

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "TontineChain_Cahier_des_Charges.pdf"
FONT = Path(r"C:\Windows\Fonts\arial.ttf")
FONT_BOLD = Path(r"C:\Windows\Fonts\arialbd.ttf")


class Doc(FPDF):
    def __init__(self):
        super().__init__()
        self.set_margins(18, 18, 18)

    def footer(self):
        self.set_y(-15)
        self.set_font("Arial", "", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 10, f"TontineChain - Cahier des charges - Page {self.page_no()}/{{nb}}", align="C")

    def h1(self, text: str):
        self.set_x(self.l_margin)
        self.ln(4)
        self.set_font("Arial", "B", 16)
        self.set_text_color(6, 27, 49)
        self.multi_cell(0, 9, text)
        self.ln(2)

    def h2(self, text: str):
        self.set_x(self.l_margin)
        self.ln(3)
        self.set_font("Arial", "B", 12)
        self.set_text_color(83, 58, 253)
        self.multi_cell(0, 7, text)
        self.ln(1)

    def h3(self, text: str):
        self.set_x(self.l_margin)
        self.ln(2)
        self.set_font("Arial", "B", 10)
        self.set_text_color(48, 49, 61)
        self.multi_cell(0, 6, text)

    def p(self, text: str):
        self.set_x(self.l_margin)
        self.set_font("Arial", "", 10)
        self.set_text_color(48, 49, 61)
        self.multi_cell(0, 5.5, text)
        self.ln(1)

    def bullet(self, text: str):
        self.set_x(self.l_margin)
        self.set_font("Arial", "", 10)
        self.set_text_color(48, 49, 61)
        self.multi_cell(0, 5.5, f"- {text}")

    def table_row(self, cols: list[str], widths: list[int], header=False):
        self.set_x(self.l_margin)
        if header:
            self.set_font("Arial", "B", 9)
            self.set_fill_color(248, 250, 253)
        else:
            self.set_font("Arial", "", 9)
            self.set_fill_color(255, 255, 255)
        h = 7
        for i, (col, w) in enumerate(zip(cols, widths)):
            # Tronquer si trop long pour la cellule
            safe = col[:80] + ("..." if len(col) > 80 else "")
            self.cell(w, h, safe, border=1, fill=True)
        self.ln(h)


def build():
    pdf = Doc()
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_font("Arial", "", str(FONT))
    pdf.add_font("Arial", "B", str(FONT_BOLD))
    W = pdf.w - pdf.l_margin - pdf.r_margin
    w2 = [int(W * 0.32), int(W * 0.68)]
    w3 = [int(W * 0.08), int(W * 0.28), int(W * 0.64)]
    w3b = [int(W * 0.35), int(W * 0.30), int(W * 0.35)]
    pdf.add_page()

    # Couverture
    pdf.set_font("Arial", "B", 22)
    pdf.set_text_color(6, 27, 49)
    pdf.ln(25)
    pdf.cell(0, 12, "TontineChain", ln=True, align="C")
    pdf.set_font("Arial", "", 14)
    pdf.set_text_color(83, 58, 253)
    pdf.cell(0, 10, "Cahier des charges & pitch de soutenance", ln=True, align="C")
    pdf.ln(8)
    pdf.set_font("Arial", "", 11)
    pdf.set_text_color(115, 115, 115)
    pdf.multi_cell(
        0,
        6,
        "Tontine digitale pour l'Afrique de l'Ouest\n"
        "FCFA (Mobile Money) · Trésor Bitcoin · WhatsApp · Preuves cryptographiques\n"
        "Version document : juin 2026 — État du dépôt tontine-trust",
        align="C",
    )

    pdf.add_page()
    pdf.h1("1. Résumé exécutif")
    pdf.p(
        "TontineChain modernise la tontine informelle (ROSCA) en Afrique de l'Ouest : "
        "cotisations en FCFA via Mobile Money (Kkiapay), règles automatisées, trésor collectif "
        "indexé sur Bitcoin, bot WhatsApp pour l'inclusion, et registre de preuves cryptographiques. "
        "Le projet vise une soutenance académique crédible : honnêteté sur ce qui est réel on-chain "
        "versus comptable en base de données."
    )

    pdf.h2("Pitch (30 secondes)")
    pdf.p(
        "\"Nous digitalisons les tontines communautaires sans exclure ceux qui n'ont qu'un téléphone "
        "et Mobile Money. Les cotisations passent par Kkiapay, les règles sont figées avant activation, "
        "et un trésor Bitcoin mainnet vérifiable sur mempool.space renforce la confiance. "
        "Un bot WhatsApp permet de créer un groupe ou consulter son solde sans installer l'app. "
        "Chaque engagement peut être signé en secp256k1 et stocké en registre.\""
    )

    pdf.h2("Proposition de valeur")
    pdf.bullet("Inclusion : WhatsApp + MoMo, pas besoin de compte bancaire classique")
    pdf.bullet("Transparence : tours, pénalités et statuts visibles en temps réel")
    pdf.bullet("Sécurité collective : assurance vie obligatoire (référence NSIA démo)")
    pdf.bullet("Réserve Bitcoin : dépôts réels on-chain + registre interne PostgreSQL")
    pdf.bullet("Accessibilité : exploration publique (/rechercher, /crypto) sans compte")

    pdf.h1("2. Périmètre fonctionnel livré")
    pdf.h2("2.1 Module Tontine (ROSCA)")
    pdf.bullet("Création de groupe : montant, fréquence, ordre (aléatoire / VRF / manuel), pénalités")
    pdf.bullet("Invitation par lien / code (REJOINDRE TONT-XXXX via WhatsApp)")
    pdf.bullet("Catalogue public : 4 groupes démo + politique RLS groupes ouverts")
    pdf.bullet("Activation du premier tour (rpc_activate_group)")
    pdf.bullet("Suivi membres : payé / en attente / retard")
    pdf.bullet("Assurance vie obligatoire : numéro police NSIA pré-rempli (NSIA-VIE-2026-0042817)")
    pdf.bullet("Déclaration décès membre → procédure assurance (UI + messaging)")

    pdf.h2("2.2 Paiements FCFA (Kkiapay)")
    pdf.bullet("Portefeuille interne FCFA (profiles.wallet_balance)")
    pdf.bullet("Cotisations via Kkiapay sandbox (widget React)")
    pdf.bullet("Webhook Kkiapay (edge function) + triggers PostgreSQL")
    pdf.bullet("Mise à jour automatique du pool groupe et statut membre")
    pdf.bullet("Crédit trésor : 2 % de chaque cotisation réussie → registre btc_ledger")

    pdf.h2("2.3 Trésor Bitcoin (modèle honnête)")
    pdf.p("Deux volets distincts, clairement séparés dans l'UI et le code :")
    pdf.bullet("On-chain : dépôts BTC réels sur adresse trésor bc1q… (mainnet), sync mempool.space")
    pdf.bullet("Registre interne : conversions FCFA→sats, stake, crédits 2 % cotisations (btc_ledger)")
    pdf.bullet("Achat sats : rpc_btc_buy_fcfa refuse si liquidité on-chain insuffisante")
    pdf.bullet("Tables : btc_treasury_pool, btc_on_chain_txs, btc_ledger, btc_user_wallets")
    pdf.bullet("Edge function : btc-treasury-sync (déployée sur Supabase cloud)")
    pdf.bullet("Cours live : CoinGecko (XOF/BTC)")
    pdf.bullet("Page /crypto : sync dépôts, réconciliation mempool / base / registre")

    pdf.h2("2.4 Preuves & engagements")
    pdf.bullet("Signatures ECDSA secp256k1 (viem) — même courbe que Bitcoin, hors chaîne")
    pdf.bullet("Table bitcoin_commitments (hash, signature, pubkey_hint)")
    pdf.bullet("Engagement tontinier signable depuis GroupeDetail et /crypto")
    pdf.bullet("Formulation honnête : preuve d'engagement, pas transaction Bitcoin")

    pdf.h2("2.5 Bot WhatsApp")
    pdf.bullet("Numéro démo : +229 01 43 26 71 02")
    pdf.bullet("Commandes : CREER, REJOINDRE, TONTINE, MEMBRES, /solde, /cotiser, /bitcoin, /liquidity, /score")
    pdf.bullet("Module unifié : supabase/functions/_shared/whatsapp/")
    pdf.bullet("Dev local : vite-plugin-whatsapp + scripts PowerShell de test")
    pdf.bullet("Prod : edge function whatsapp-webhook + tontine-automation (cron tours)")

    pdf.h2("2.6 Application web (PWA)")
    pdf.bullet("React 18 + Vite 8 + TypeScript + Tailwind + shadcn/ui")
    pdf.bullet("Design system DESIGN.md (Stripe + Linear + accent Bitcoin)")
    pdf.bullet("Layout desktop (max-w-7xl), landing marketing, mockups iPhone")
    pdf.bullet("Auth Supabase, score confiance, notifications, admin garanties")
    pdf.bullet("22 tests Vitest, build production OK")

    pdf.h1("3. Architecture technique")
    pdf.table_row(["Couche", "Technologie"], w2, header=True)
    for row in [
        ["Frontend", "React, Vite, Tailwind, PWA"],
        ["Backend", "Supabase PostgreSQL + Auth + RLS"],
        ["Edge Functions", "whatsapp-webhook, btc-treasury-sync, tontine-automation"],
        ["Paiements", "Kkiapay (sandbox MoMo UEMOA)"],
        ["Bitcoin", "mempool.space, CoinGecko, registre SQL"],
        ["Crypto preuves", "viem secp256k1 (off-chain)"],
        ["Hébergement", "Supabase cloud (slyizcavccnkvxqtmfmd)"],
    ]:
        pdf.table_row(row, w2)
    pdf.ln(4)

    pdf.h2("3.1 Schéma Bitcoin (invariants)")
    pdf.p(
        "sats_liquid = BTC réellement disponible pour convertir FCFA en sats. "
        "internal_sats = allocations comptables (achats + 2 % cotisations). "
        "on_chain_sats = total ingéré depuis mempool. "
        "Les cotisations MoMo ne créent pas de BTC on-chain automatiquement."
    )

    pdf.h2("3.2 Routes principales")
    pdf.bullet("Publiques : /, /crypto, /whatsapp, /rechercher, /rejoindre/:id, /connexion")
    pdf.bullet("Authentifiées : /home, /creer, /groupe/:id, /cotiser, /portefeuille, /score, /admin")

    pdf.add_page()
    pdf.h1("4. Scénario de démo soutenance (~10 min)")
    steps = [
        ("1", "Landing /", "Valeur : tontine + Bitcoin + MoMo + WhatsApp"),
        ("2", "/crypto", "Cours BTC, trésor 3 colonnes, sync dépôts (si adresse configurée)"),
        ("3", "/whatsapp", "AIDE, CREER, /bitcoin, /solde"),
        ("4", "Inscription → /home", "Tableau de bord desktop, portefeuille FCFA"),
        ("5", "/rechercher", "Catalogue groupes publics sans compte"),
        ("6", "Créer groupe → Activer", "Assurance NSIA, règles figées, preuves"),
        ("7", "/cotiser", "Flux Kkiapay sandbox"),
        ("8", "/groupe/:id", "Membres, registre, 2 % trésor après cotisation"),
    ]
    pdf.table_row(["#", "Action", "Point jury"], w3, header=True)
    for s in steps:
        pdf.table_row(list(s), w3)
    pdf.ln(4)

    pdf.h1("5. Discours jury — ce qu'il faut assumer")
    pdf.h3("Ce qui est réel")
    pdf.bullet("Paiements MoMo via Kkiapay (sandbox en démo)")
    pdf.bullet("Dépôts BTC sur adresse trésor vérifiables sur mempool.space")
    pdf.bullet("Journal immuable btc_ledger + triggers PostgreSQL")
    pdf.bullet("Signatures cryptographiques secp256k1 stockées en base")

    pdf.h3("Ce qui est simulé / comptable")
    pdf.bullet("2 % cotisation → sats internes sans achat BTC automatique")
    pdf.bullet("Assurance NSIA : référence enregistrée, pas d'API partenaire")
    pdf.bullet("Preuves : pas d'ancrage OP_RETURN Bitcoin")
    pdf.bullet("APY trésor : chiffre statique, non calculé dynamiquement")
    pdf.bullet("Portefeuille membre : identifiant registre:…, pas adresse BTC personnelle")

    pdf.h1("6. Reste à faire (backlog)")
    pdf.h2("6.1 Bloquant pour démo Bitcoin complète")
    pdf.bullet("Configurer VITE_BTC_TREASURY_ADDRESS (bc1q mainnet) dans .env")
    pdf.bullet("Secrets Supabase : BTC_TREASURY_ADDRESS, BTC_NETWORK=mainnet")
    pdf.bullet("Envoyer un petit dépôt BTC réel → /crypto → Sync dépôts")
    pdf.bullet("Script : .\\scripts\\setup-btc-treasury.ps1 -Address \"bc1q...\"")

    pdf.h2("6.2 Production & sécurité")
    pdf.bullet("Restreindre RLS btc_treasury_pool (UPDATE réservé service_role)")
    pdf.bullet("Kkiapay production (clés live, webhook signé)")
    pdf.bullet("WhatsApp Meta : tokens prod, webhook vérifié")
    pdf.bullet("Cron tontine-automation planifié (CRON_SECRET)")
    pdf.bullet("Audit secrets (.env jamais commité)")

    pdf.h2("6.3 Fonctionnel")
    pdf.bullet("RPC + UI unstake (schéma prévu, non exposé)")
    pdf.bullet("Réconciliation stricte btc_user_wallets ↔ btc_ledger")
    pdf.bullet("API assurance partenaire (vérification police NSIA)")
    pdf.bullet("Retrait BTC on-chain vers membre (hors scope MVP)")
    pdf.bullet("Corriger wording « preuve Bitcoin » → « signature secp256k1 » partout")
    pdf.bullet("Recalculer ou retirer APY / TVL marketing si jury pointilleux")

    pdf.h2("6.4 Qualité & déploiement")
    pdf.bullet("supabase db push aligné migrations locales / cloud")
    pdf.bullet("CI GitHub (test + build automatiques)")
    pdf.bullet("Déploiement frontend (Vercel / Netlify) + domaine")
    pdf.bullet("Documentation utilisateur FR (guide WhatsApp)")

    pdf.h1("7. Indicateurs de maturité (estimation)")
    pdf.table_row(["Domaine", "État", "Note indicative"], w3b, header=True)
    for row in [
        ["Tontine ROSCA", "MVP fonctionnel", "16/20"],
        ["Paiements MoMo", "Sandbox OK", "14/20"],
        ["Bitcoin honnêteté", "Architecture solide", "15/20"],
        ["Bitcoin on-chain", "En attente adresse user", "12/20"],
        ["WhatsApp bot", "Dev + edge déployable", "14/20"],
        ["UI / Design", "Landing + app desktop", "16/20"],
        ["Sécurité prod", "RLS à durcir", "11/20"],
    ]:
        pdf.table_row(row, w3b)
    pdf.ln(6)

    pdf.h1("8. Livrables du dépôt")
    pdf.bullet("Code source : github.com (tontine-trust)")
    pdf.bullet("Migrations SQL : supabase/migrations/ (12 fichiers)")
    pdf.bullet("Edge functions : whatsapp-webhook, btc-treasury-sync, tontine-automation")
    pdf.bullet("Tests : src/test/ (22 tests)")
    pdf.bullet("Design : DESIGN.md")
    pdf.bullet("Scripts : deploy-cloud.ps1, setup-btc-treasury.ps1, test WhatsApp")

    pdf.ln(8)
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Arial", "", 9)
    pdf.set_text_color(115, 115, 115)
    pdf.multi_cell(
        0,
        5,
        "Document genere automatiquement a partir de l'etat du projet TontineChain (juin 2026). "
        "Projet academique / demonstration - usage selon les conditions du depot.",
    )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(OUT))
    print(f"PDF généré : {OUT}")


if __name__ == "__main__":
    build()
