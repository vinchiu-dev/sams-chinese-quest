#!/usr/bin/env python3
"""Merge FO ledger CSV into fo-overlay.csv and optionally leads.json FO fields."""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HEADERS = [
    "lead_id",
    "name",
    "org",
    "stage",
    "marketing_channel",
    "revenue_php",
    "fo_notes",
    "lost_reason",
    "last_updated",
    "editor",
]


def read_csv(path: Path) -> list[dict]:
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def write_overlay(rows: list[dict], dest: Path) -> None:
    with dest.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=HEADERS, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            out = {h: (r.get(h) or "") for h in HEADERS}
            w.writerow(out)


def merge_leads(rows: list[dict], leads_path: Path) -> int:
    data = json.loads(leads_path.read_text(encoding="utf-8"))
    by_id = {r["lead_id"].strip(): r for r in rows if r.get("lead_id")}
    n = 0
    for lead in data.get("leads", []):
        row = by_id.get(lead.get("id"))
        if not row:
            continue
        if row.get("stage"):
            lead["stage"] = row["stage"].strip()
        if row.get("marketing_channel"):
            lead["marketing_channel"] = row["marketing_channel"].strip()
        if row.get("fo_notes") is not None and str(row.get("fo_notes")) != "":
            lead["fo_notes"] = row["fo_notes"]
        if row.get("lost_reason") is not None and str(row.get("lost_reason")) != "":
            lead["lost_reason"] = row["lost_reason"]
        rev = (row.get("revenue_php") or "").strip()
        if rev != "":
            try:
                lead["revenue_php"] = float(rev.replace(",", ""))
            except ValueError:
                pass
        # never invent: leave revenue alone if Sheet blank
        if row.get("last_updated"):
            lead["last_updated"] = row["last_updated"].strip()
        n += 1
    leads_path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return n


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "fo-overlay.csv"
    rows = read_csv(src)
    dest = ROOT / "fo-overlay.csv"
    write_overlay(rows, dest)
    patched = merge_leads(rows, ROOT / "leads.json")
    print(f"Wrote {dest} ({len(rows)} rows); patched {patched} leads.json rows")


if __name__ == "__main__":
    main()
