#!/usr/bin/env python3
"""Exporte les bundles edge functions en JSON UTF-8 pour deploiement MCP."""
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

names = sys.argv[1:] if len(sys.argv) > 1 else list(mod.BUNDLES.keys())

for name in names:
    data = mod.bundle(name)
    path = OUT / f"{name}.json"
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    print(f"{name}: {len(data['files'])} files -> {path}")
