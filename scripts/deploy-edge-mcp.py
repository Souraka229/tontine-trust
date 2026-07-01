#!/usr/bin/env python3
"""Affiche les bundles edge functions pour deploiement (utilitaire)."""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NAMES = [
    "lnbits-create-invoice",
    "lnbits-check-payment",
    "lnbits-webhook",
    "btc-treasury-sync",
    "kkiapay-webhook",
    "tontine-automation",
    "whatsapp-webhook",
]

def main() -> None:
    name = sys.argv[1] if len(sys.argv) > 1 else "lnbits-create-invoice"
    out = subprocess.check_output(
        [sys.executable, str(ROOT / "scripts" / "bundle-edge-functions.py"), name],
        text=True,
        encoding="utf-8",
    )
    data = json.loads(out)
    print(f"name={data['name']} files={len(data['files'])} jwt={data['verify_jwt']}")

if __name__ == "__main__":
    main()
