#!/usr/bin/env python3
"""Génère docs/PITCH-PRESSE.pdf depuis docs/PITCH-PRESSE.md"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path

from fpdf import FPDF

ROOT = Path(__file__).resolve().parents[1]
MD_PATH = ROOT / "docs" / "PITCH-PRESSE.md"
OUT_PATH = ROOT / "docs" / "PITCH-PRESSE.pdf"
WIN_FONTS = Path(os.environ.get("WINDIR", r"C:\Windows")) / "Fonts"
ARIAL = WIN_FONTS / "arial.ttf"
ARIAL_BOLD = WIN_FONTS / "arialbd.ttf"
ARIAL_ITALIC = WIN_FONTS / "ariali.ttf"
FONT_FAMILY = "Arial"

MARGIN = 18
PAGE_W = 210
CONTENT_W = PAGE_W - 2 * MARGIN


def strip_md(text: str) -> str:
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"^>\s*", "", text)
    text = text.replace("✅", "OK")
    text = text.replace("☐", "[ ]")
    return text.strip()


class PitchPDF(FPDF):
    def footer(self) -> None:
        self.set_y(-12)
        self.set_font(FONT_FAMILY, "", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 8, f"TontineChain — Page {self.page_no()}", align="C")


def add_wrapped(pdf: PitchPDF, text: str, size: int = 10, bold: bool = False, color=(30, 30, 30)) -> None:
    style = "B" if bold else ""
    pdf.set_font(FONT_FAMILY, style, size)
    pdf.set_text_color(*color)
    pdf.multi_cell(CONTENT_W, size * 0.45 + 2, text)


def main() -> int:
    if not MD_PATH.exists():
        print(f"Fichier introuvable : {MD_PATH}", file=sys.stderr)
        return 1

    raw = MD_PATH.read_text(encoding="utf-8")
    lines = raw.splitlines()

    pdf = PitchPDF()
    pdf.set_auto_page_break(auto=True, margin=16)
    pdf.add_font(FONT_FAMILY, "", str(ARIAL))
    pdf.add_font(FONT_FAMILY, "B", str(ARIAL_BOLD))
    pdf.add_font(FONT_FAMILY, "I", str(ARIAL_ITALIC))
    pdf.add_page()

    # Couverture
    pdf.set_fill_color(6, 78, 59)
    pdf.rect(0, 0, 210, 297, style="F")
    pdf.set_y(90)
    pdf.set_font(FONT_FAMILY, "B", 28)
    pdf.set_text_color(255, 255, 255)
    pdf.multi_cell(0, 14, "TontineChain", align="C")
    pdf.ln(4)
    pdf.set_font(FONT_FAMILY, "", 16)
    pdf.multi_cell(0, 10, "Pitch presse · 1er juillet 2026", align="C")
    pdf.ln(8)
    pdf.set_font(FONT_FAMILY, "I", 11)
    pdf.multi_cell(
        0,
        6,
        "Tontine digitale · Mobile Money · Garde collective 3/5 · Bitcoin · WhatsApp",
        align="C",
    )
    pdf.ln(20)
    pdf.set_font(FONT_FAMILY, "", 10)
    pdf.multi_cell(
        0,
        5,
        "Document de distribution — presse, jury, partenaires",
        align="C",
    )

    pdf.add_page()
    in_code = False

    for line in lines:
        if line.strip().startswith("```"):
            in_code = not in_code
            continue
        if in_code:
            pdf.set_font(FONT_FAMILY, "", 8)
            pdf.set_text_color(40, 40, 40)
            pdf.set_fill_color(245, 245, 245)
            pdf.multi_cell(CONTENT_W, 4, line, fill=True)
            continue

        if line.strip() == "---":
            pdf.ln(2)
            pdf.set_draw_color(200, 200, 200)
            pdf.line(MARGIN, pdf.get_y(), PAGE_W - MARGIN, pdf.get_y())
            pdf.ln(4)
            continue

        if not line.strip():
            pdf.ln(3)
            continue

        if line.startswith("# "):
            pdf.ln(4)
            add_wrapped(pdf, strip_md(line[2:]), size=16, bold=True, color=(6, 78, 59))
            pdf.ln(2)
            continue

        if line.startswith("## "):
            pdf.ln(3)
            add_wrapped(pdf, strip_md(line[3:]), size=13, bold=True, color=(15, 60, 100))
            pdf.ln(1)
            continue

        if line.startswith("### "):
            pdf.ln(2)
            add_wrapped(pdf, strip_md(line[4:]), size=11, bold=True, color=(50, 50, 50))
            pdf.ln(1)
            continue

        if line.startswith("|") and "---" in line:
            continue

        if line.startswith("|"):
            cells = [strip_md(c) for c in line.split("|")[1:-1]]
            row = "  ·  ".join(c for c in cells if c)
            add_wrapped(pdf, row, size=9)
            continue

        if line.startswith("- [ ]"):
            add_wrapped(pdf, "[ ] " + strip_md(line[5:]), size=10)
            continue

        if line.startswith("- "):
            add_wrapped(pdf, "• " + strip_md(line[2:]), size=10)
            continue

        if re.match(r"^\d+\.\s", line):
            add_wrapped(pdf, strip_md(line), size=10)
            continue

        if line.startswith("*") and line.endswith("*"):
            pdf.set_font(FONT_FAMILY, "I", 9)
            pdf.set_text_color(80, 80, 80)
            pdf.multi_cell(CONTENT_W, 5, strip_md(line.strip("*")))
            continue

        add_wrapped(pdf, strip_md(line), size=10)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(OUT_PATH))
    print(f"PDF généré : {OUT_PATH}")
    print(f"Taille : {OUT_PATH.stat().st_size // 1024} Ko")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
