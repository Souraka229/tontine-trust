#!/usr/bin/env python3
"""Bundle supabase/functions pour deploiement MCP ou inspection."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FUNCTIONS = ROOT / "supabase" / "functions"

BUNDLES: dict[str, dict] = {
    "btc-treasury-sync": {
        "entrypoint": "supabase/functions/btc-treasury-sync/index.ts",
        "files": ["supabase/functions/btc-treasury-sync/index.ts"],
        "verify_jwt": False,
    },
    "kkiapay-webhook": {
        "entrypoint": "supabase/functions/kkiapay-webhook/index.ts",
        "files": ["supabase/functions/kkiapay-webhook/index.ts"],
        "verify_jwt": False,
    },
    "tontine-automation": {
        "entrypoint": "supabase/functions/tontine-automation/index.ts",
        "files": ["supabase/functions/tontine-automation/index.ts"],
        "verify_jwt": True,
    },
    "lnbits-create-invoice": {
        "entrypoint": "supabase/functions/lnbits-create-invoice/index.ts",
        "files": [
            "supabase/functions/lnbits-create-invoice/index.ts",
            "supabase/functions/_shared/lnbits/client.ts",
        ],
        "verify_jwt": False,
    },
    "lnbits-check-payment": {
        "entrypoint": "supabase/functions/lnbits-check-payment/index.ts",
        "files": [
            "supabase/functions/lnbits-check-payment/index.ts",
            "supabase/functions/_shared/lnbits/client.ts",
            "supabase/functions/_shared/lnbits/ingest.ts",
        ],
        "verify_jwt": False,
    },
    "lnbits-webhook": {
        "entrypoint": "supabase/functions/lnbits-webhook/index.ts",
        "files": [
            "supabase/functions/lnbits-webhook/index.ts",
            "supabase/functions/_shared/lnbits/client.ts",
            "supabase/functions/_shared/lnbits/ingest.ts",
        ],
        "verify_jwt": False,
    },
    "whatsapp-webhook": {
        "entrypoint": "supabase/functions/whatsapp-webhook/index.ts",
        "files": [
            "supabase/functions/whatsapp-webhook/index.ts",
            *sorted(str(p.relative_to(ROOT)).replace("\\", "/") for p in (FUNCTIONS / "_shared" / "whatsapp").rglob("*.ts")),
        ],
        "verify_jwt": False,
    },
}


def bundle(name: str) -> dict:
    spec = BUNDLES[name]
    files = []
    for rel in spec["files"]:
        path = ROOT / rel
        if not path.exists():
            raise FileNotFoundError(rel)
        files.append({"name": rel, "content": path.read_text(encoding="utf-8")})
    return {
        "name": name,
        "entrypoint_path": spec["entrypoint"],
        "verify_jwt": spec["verify_jwt"],
        "files": files,
    }


def main() -> None:
    name = sys.argv[1] if len(sys.argv) > 1 else "all"
    if name == "all":
        out = {n: bundle(n) for n in BUNDLES}
    else:
        out = bundle(name)
    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()
