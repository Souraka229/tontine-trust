#!/usr/bin/env python3
"""
Importe toutes les tontines de flashbot.db (SQLite) vers Supabase.
Usage (depuis bot/) :
  copy flashbot.db dans ce dossier
  set SUPABASE_SERVICE_ROLE_KEY dans ../.env
  python migrate_to_supabase.py
"""
import os
import sqlite3
import sys

# Charger .env parent
from pathlib import Path

env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())

from config import DATABASE_PATH  # noqa: E402
from supabase_sync import (  # noqa: E402
    is_configured,
    resolve_profile_id,
    sync_create_group,
    sync_join_group,
)


STATUS_MAP = {"waiting": "pending", "active": "active", "completed": "completed"}


def get_sqlite_path() -> str:
    candidates = [
        DATABASE_PATH,
        os.path.join(os.path.dirname(__file__), "flashbot.db"),
        os.path.join(os.path.dirname(__file__), "tontinebot.db"),
    ]
    for p in candidates:
        if p and os.path.isfile(p):
            return p
    return DATABASE_PATH


def migrate():
    if not is_configured():
        print("ERREUR: ajoutez SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env")
        sys.exit(1)

    db_path = get_sqlite_path()
    if not os.path.isfile(db_path):
        print(f"ERREUR: base SQLite introuvable ({db_path})")
        print("Copiez flashbot.db dans le dossier bot/ puis relancez.")
        sys.exit(1)

    print(f"Migration depuis {db_path} → Supabase...")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("SELECT * FROM tontines ORDER BY id")
    tontines = cur.fetchall()
    print(f"  {len(tontines)} tontine(s) trouvée(s)")

    ok_groups = 0
    ok_members = 0

    for t in tontines:
        code = t["code"]
        name = t["name"]
        print(f"\n→ {code} ({name})")

        group_id = sync_create_group(
            name=name,
            invite_code=code,
            amount_sats=int(t["amount_sats"]),
            max_members=int(t["max_members"]),
            frequency=t["frequency"] or "weekly",
            creator_whatsapp=t["created_by"],
        )
        if group_id:
            ok_groups += 1

        cur.execute(
            "SELECT whatsapp_number, turn_order FROM tontine_members WHERE tontine_id = ? ORDER BY turn_order",
            (t["id"],),
        )
        for m in cur.fetchall():
            phone = m["whatsapp_number"]
            if sync_join_group(
                invite_code=code,
                whatsapp_number=phone,
                turn_order=int(m["turn_order"]),
                force=True,
            ):
                ok_members += 1
                pid = resolve_profile_id(phone)
                print(f"    membre {phone[-4:]} → profil {pid[:8] if pid else '?'}...")

        if group_id:
            sb_status = STATUS_MAP.get(t["status"], "pending")
            if sb_status != "pending":
                import requests
                from supabase_sync import SUPABASE_URL, _headers
                requests.patch(
                    f"{SUPABASE_URL}/rest/v1/groups",
                    headers=_headers(),
                    params={"invite_code": f"eq.{code}"},
                    json={"status": sb_status, "current_round": int(t["current_round"] or 0)},
                    timeout=15,
                )

    conn.close()
    print(f"\nTerminé: {ok_groups} groupe(s), {ok_members} membre(s) synchronisés.")
    print("Rafraîchissez l'app web (Groupes / Accueil).")


if __name__ == "__main__":
    migrate()
