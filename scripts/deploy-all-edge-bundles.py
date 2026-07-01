#!/usr/bin/env python3
"""Deploie toutes les edge functions via bundles JSON (stdin MCP ou manuel)."""
from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location(
    "bundle_edge_functions",
    ROOT / "scripts" / "bundle-edge-functions.py",
)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)  # type: ignore

OUT = ROOT / ".edge-bundles"
OUT.mkdir(exist_ok=True)

for name in mod.BUNDLES:
    data = mod.bundle(name)
    (OUT / f"{name}.json").write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")

print(json.dumps({"deployed": list(mod.BUNDLES.keys()), "dir": str(OUT)}))
