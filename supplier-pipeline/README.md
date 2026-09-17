# Supplier Pipeline CRM

**Live:** https://vinchiu-dev.github.io/sams-chinese-quest/supplier-pipeline/

Kanban for Peace Den / Easy Home Wellness brand partners. Stages stack **top → bottom**; cards flow **left → right** within each row (leftmost = highest priority).

## How to use

1. Open the live URL (or this folder on GitHub Pages).
2. **+ Add** — new supplier starts in **Identified**.
3. Click a card → drawer (name, category, website, contact, notes, status) → **Save**.
4. Drag the **⋮⋮** handle:
   - **Within a row** — reorder priority (left = higher).
   - **To another row** — change status (drops at the highlighted slot, or appends rightmost).
5. Click a **status title** to rename it (persists in `suppliers.json` `stages`).

## Sync

`supplier-pipeline/suppliers.json` is the source of truth via the GitHub Contents API (same obfuscated `_GH_DEFAULTS` pattern as BC Events CRM / Sam progress). Save / move / reorder / rename / soft-delete all `PUT` the full JSON. Soft-delete sets `stage=deleted`. No sync status banner.

Each supplier has an `order` number within its stage (0 = leftmost / highest priority).
