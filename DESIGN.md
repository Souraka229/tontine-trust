# TontineChain Design System

> Fintech tontine ouest-africaine indexée Bitcoin. Fusion inspirée de **Stripe** (marketing, confiance paiements), **Linear** (précision app), **Supabase** (infrastructure, émeraude) et accent **Bitcoin** (ambre).

**Règle agent** : utilise ce fichier comme source de vérité pour toute UI. Respecte couleurs, typo, espacement et composants définis ici.

---

## 1. Thème & atmosphère

- **Positionnement** : infrastructure financière communautaire — sérieux, moderne, vérifiable.
- **Landing** : claire, gradients Stripe (violet + brume), cartes flottantes, motion subtile.
- **App connectée** : densité Linear — bordures fines, hiérarchie nette, actions en pill.
- **Trésor BTC** : surfaces ambre/orange, monospace pour adresses et sats.
- **Confiance backend** : touches émeraude Supabase (succès, preuves, registre).

---

## 2. Palette

### Fondations (Stripe)

| Token | Valeur | Rôle |
|-------|--------|------|
| `--tc-ink` | `#061B31` | Titres, sections sombres |
| `--tc-text` | `#30313D` | Corps de texte |
| `--tc-muted` | `#737373` | Métadonnées |
| `--tc-mist` | `#F8FAFD` | Fond page marketing |
| `--tc-white` | `#FFFFFF` | Cartes, surfaces |
| `--tc-border` | `#E3ECF7` | Bordures légères |

### Marque & accents

| Token | Valeur | Rôle |
|-------|--------|------|
| `--tc-violet` | `#635BFF` | CTA primaire, liens marque |
| `--tc-violet-bright` | `#533AFD` | Hover hero |
| `--tc-emerald` | `#3ECF8E` | Succès, Supabase/trust |
| `--tc-bitcoin` | `#F59E0B` | Trésor, sats, badges BTC |
| `--tc-orange` | `#FF6118` | Accent chaud secondaire |
| `--tc-danger` | `#DF1B41` | Erreurs, retards |

### App (Linear-inspired dark optionnel)

| Token | Valeur | Rôle |
|-------|--------|------|
| `--tc-bg-app` | `#0F1011` | Fond app dark |
| `--tc-panel` | `#1C1C1F` | Cartes app dark |
| `--tc-indigo` | `#5E6AD2` | Focus app dark |

---

## 3. Typographie

```css
--font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-mono: "JetBrains Mono", "Source Code Pro", ui-monospace, monospace;
```

| Élément | Taille | Poids | Tracking |
|---------|--------|-------|----------|
| Hero | 56–64px | 600–700 | -0.04em |
| H2 section | 32–40px | 600 | -0.02em |
| H3 carte | 18–24px | 600 | -0.01em |
| Corps | 15–16px | 400 | 0 |
| Label | 12–13px | 500 | 0.02em |
| Mono (BTC) | 13px | 500 | 0 |

---

## 4. Composants

### Bouton primaire
- Fond `#533AFD`, texte blanc, `border-radius: 9999px`, hauteur 44px
- Ombre `0 8px 20px rgba(83, 58, 253, 0.24)`
- Hover : `#635BFF`, `translateY(-1px)`

### Bouton secondaire
- Fond blanc, bordure `#D4DEE9`, texte `#061B31`, pill

### Bouton Bitcoin
- Fond ambre clair, bordure `#F59E0B`, texte `#92400E`

### Carte
- Fond blanc, bordure `rgba(212, 222, 233, 0.75)`, radius 18–24px
- Ombre `0 18px 40px rgba(13, 23, 56, 0.12)`

### Badge
- Pill, fond `rgba(99, 91, 255, 0.1)`, texte violet
- Badge BTC : fond `rgba(245, 158, 11, 0.12)`, texte ambre

### Input
- Bordure `#D4DEE9`, focus ring `#0570DE` ou `#635BFF`, radius 12px

---

## 5. Layout

- Max-width contenu : `72rem` (1152px)
- Espacement : 4, 8, 12, 16, 24, 32, 48, 64, 96px
- Sections marketing : padding vertical 80–96px desktop, 48px mobile
- Touch target minimum : 44px

---

## 6. Profondeur

```css
--shadow-sm: 0 8px 20px rgba(13, 23, 56, 0.12);
--shadow-md: 0 18px 40px rgba(13, 23, 56, 0.15);
--shadow-glow-violet: 0 0 80px rgba(99, 91, 255, 0.15);
--shadow-glow-amber: 0 0 60px rgba(245, 158, 11, 0.12);
```

Hero : mesh gradient violet + spot ambre en radial.

---

## 7. Do / Don't

**Do**
- Gradients et élévation sur landing uniquement
- Monospace pour adresses BTC, hashes, commandes WhatsApp
- Émeraude pour états « vérifié / synchronisé »
- Explorer sans compte visible (groupes, trésor, WhatsApp)

**Don't**
- Mélanger trop de violets différents (rester sur `#635BFF` / `#533AFD`)
- Surcharger l'app mobile de gradients marketing
- Données fictives en prod
- Coins trop arrondis type consumer playful (>24px sauf pills)

---

## 8. Responsive

- `< 640px` : hero empilé, stats 2 colonnes, nav hamburger
- `640–1023px` : grilles 2 colonnes
- `1024px+` : hero split optionnel, mockups côte à côte

---

## 9. Prompt agent

```text
UI TontineChain : landing style Stripe (brume #F8FAFD, violet #635BFF, cartes flottantes),
app style Linear (précision, bordures fines), accents Supabase emerald #3ECF8E pour confiance,
accent Bitcoin #F59E0B pour trésor. Inter + JetBrains Mono. Pills CTA, pas de SaaS générique bleu.
```
