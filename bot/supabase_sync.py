"""
Synchronise les tontines du bot Flask vers Supabase (même base que l'app web).
Nécessite SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY dans .env / bot/.env
"""
import os
import re
import requests

SUPABASE_URL = (os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL") or "").rstrip("/")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

FREQ_TO_SUPABASE = {
    "daily": "Journalier",
    "weekly": "Hebdomadaire",
    "monthly": "Mensuelle",
}

COLORS = ["green", "blue", "amber", "purple", "red"]


def is_configured() -> bool:
    return bool(SUPABASE_URL and SUPABASE_SERVICE_KEY)


def _headers():
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def normalize_phone(phone: str) -> str:
    digits = re.sub(r"\D", "", phone)
    if digits.startswith("2290") and len(digits) >= 12:
        digits = "229" + digits[4:]
    if digits.startswith("229"):
        return f"+{digits}"
    if len(digits) == 10 and digits.startswith("0"):
        return f"+229{digits[1:]}"
    if len(digits) == 8:
        return f"+229{digits}"
    return phone.replace(" ", "")


def _get(path: str, params: dict | None = None):
    return requests.get(f"{SUPABASE_URL}/rest/v1/{path}", headers=_headers(), params=params, timeout=60)


def _post(path: str, payload: dict | list):
    return requests.post(f"{SUPABASE_URL}/rest/v1/{path}", headers=_headers(), json=payload, timeout=60)


def _patch(path: str, payload: dict, params: dict):
    return requests.patch(f"{SUPABASE_URL}/rest/v1/{path}", headers=_headers(), json=payload, params=params, timeout=60)


def _fetch_btc_fcfa() -> float:
    try:
        r = requests.get(
            "https://api.coingecko.com/api/v3/simple/price",
            params={"ids": "bitcoin", "vs_currencies": "eur"},
            timeout=8,
        )
        r.raise_for_status()
        eur = r.json()["bitcoin"]["eur"]
        return eur * 655.957
    except Exception:
        return 55_000_000.0


def sats_to_fcfa(amount_sats: int) -> float:
    btc_fcfa = _fetch_btc_fcfa()
    return round(amount_sats * (btc_fcfa / 100_000_000), 2)


def resolve_profile_id(whatsapp_number: str) -> str | None:
    if not is_configured():
        return None

    canonical = normalize_phone(whatsapp_number)
    digits = re.sub(r"\D", "", canonical)
    variants = list({
        canonical,
        digits,
        f"+{digits}",
        f"+2290{digits[3:]}" if digits.startswith("229") and len(digits) >= 11 else "",
        f"+229 {digits[3:5]} {digits[5:]}" if digits.startswith("229") and len(digits) >= 11 else "",
    })
    variants = [v for v in variants if v]

    for phone in variants:
        res = _get("profiles", {"select": "id", "phone": f"eq.{phone}", "limit": "1"})
        if res.ok and res.json():
            return res.json()[0]["id"]

    tail = digits[-8:]
    if len(tail) >= 8:
        res = _get("profiles", {"select": "id,phone", "phone": f"ilike.%{tail}", "limit": "20"})
        if res.ok:
            for row in res.json():
                row_digits = re.sub(r"\D", "", normalize_phone(row.get("phone") or ""))
                if row_digits.endswith(tail):
                    return row["id"]

    return ensure_profile_from_phone(whatsapp_number)


def ensure_profile_from_phone(whatsapp_number: str) -> str | None:
    digits = re.sub(r"\D", "", normalize_phone(whatsapp_number))
    if not digits:
        return None

    email = f"wa+{digits}@whatsapp.tontine.local"
    auth_res = requests.post(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        headers=_headers(),
        json={
            "email": email,
            "email_confirm": True,
            "user_metadata": {
                "phone": normalize_phone(whatsapp_number),
                "name": f"Membre {digits[-4:]}",
            },
        },
        timeout=15,
    )
    if auth_res.ok:
        return auth_res.json().get("id")

    res = _get("profiles", {"select": "id", "email": f"eq.{email}", "limit": "1"})
    if res.ok and res.json():
        return res.json()[0]["id"]
    return None


def sync_create_group(
    *,
    name: str,
    invite_code: str,
    amount_sats: int,
    max_members: int,
    frequency: str,
    creator_whatsapp: str,
) -> str | None:
    """Crée le groupe dans Supabase. Retourne l'UUID du groupe ou None."""
    if not is_configured():
        print("[SUPABASE] Sync ignorée — SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant")
        return None

    profile_id = resolve_profile_id(creator_whatsapp)
    if not profile_id:
        print(f"[SUPABASE] Profil introuvable pour {creator_whatsapp}")
        return None

    existing = _get("groups", {"select": "id", "invite_code": f"eq.{invite_code}", "limit": "1"})
    if existing.ok and existing.json():
        group_id = existing.json()[0]["id"]
        print(f"[SUPABASE] Groupe {invite_code} déjà présent ({group_id})")
        return group_id

    initials = "".join(w[0] for w in name.strip().split()[:2]).upper() or "GR"
    freq = FREQ_TO_SUPABASE.get(frequency, "Mensuelle")
    amount_fcfa = sats_to_fcfa(amount_sats)

    group_res = _post("groups", {
        "name": name.strip(),
        "initials": initials,
        "color": COLORS[hash(name) % len(COLORS)],
        "contribution_amount": amount_fcfa,
        "contribution_sats": amount_sats,
        "payment_rail": "lightning",
        "frequency": freq,
        "max_members": max_members,
        "total_rounds": max_members,
        "penalty_rate": 5,
        "guarantee_deposit": 0,
        "order_type": "random",
        "min_score": 0,
        "status": "pending",
        "created_by": profile_id,
        "invite_code": invite_code,
    })

    if not group_res.ok:
        print(f"[SUPABASE] Erreur création groupe: {group_res.status_code} {group_res.text}")
        return None

    group_id = group_res.json()[0]["id"]

    member_res = _post("group_members", {
        "group_id": group_id,
        "profile_id": profile_id,
        "role": "admin",
        "turn_order": 1,
        "status": "waiting",
        "guarantee_type": "life_insurance",
        "guarantee_status": "pending",
    })

    if not member_res.ok:
        print(f"[SUPABASE] Erreur membre créateur: {member_res.status_code} {member_res.text}")

    print(f"[SUPABASE] Groupe synchronisé: {name} ({invite_code}) → {group_id}")
    return group_id


def sync_join_group(*, invite_code: str, whatsapp_number: str, turn_order: int, force: bool = False) -> bool:
    if not is_configured():
        return False

    profile_id = resolve_profile_id(whatsapp_number)
    if not profile_id:
        print(f"[SUPABASE] Profil introuvable pour rejoindre {invite_code}")
        return False

    group_res = _get("groups", {"select": "id,max_members,members_count,status", "invite_code": f"eq.{invite_code}", "limit": "1"})
    if not group_res.ok or not group_res.json():
        print(f"[SUPABASE] Groupe {invite_code} introuvable dans Supabase")
        return False

    group = group_res.json()[0]
    if not force and group.get("status") != "pending":
        return False

    dup = _get("group_members", {
        "select": "id",
        "group_id": f"eq.{group['id']}",
        "profile_id": f"eq.{profile_id}",
        "limit": "1",
    })
    if dup.ok and dup.json():
        return True

    member_res = _post("group_members", {
        "group_id": group["id"],
        "profile_id": profile_id,
        "role": "member",
        "turn_order": turn_order,
        "status": "waiting",
        "guarantee_type": "life_insurance",
        "guarantee_status": "pending",
    })

    if not member_res.ok:
        print(f"[SUPABASE] Erreur rejoindre: {member_res.status_code} {member_res.text}")
        return False

    print(f"[SUPABASE] Membre ajouté à {invite_code} (tour {turn_order})")
    return True
