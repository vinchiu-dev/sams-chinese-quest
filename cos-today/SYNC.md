# CoS Today — board sync

**Live:** https://vinchiu-dev.github.io/sams-chinese-quest/cos-today/  
**Repo folder:** `cos-today/`  
**Canonical board file:** `cos-today/board.json`

## What syncs vs what must never change

| Layer | Storage | Rule |
|-------|---------|------|
| **Vin card wording** (`[data-edit]` titles/bodies on Life / Work / Below) | `localStorage` (`cosTodayText:*`) + `board.json` → `work_cards[id].title/body` + shipped HTML | **Never overwrite.** Load order: localStorage → board vin fields → HTML. CoS updates details only. |
| **Work card order / Open·Done pills** | `localStorage` | Device-local; not in `board.json`. |
| **Work detail lists** (Status / Needs you / CoS next) | `board.json` → `work_cards[id].details` (+ local order cache) | Numbered lists in the drawer; Vin may drag-reorder; order syncs via Contents API. |
| **Needs you (committed blockers)** | `board.json` → `blockers[]` | Live via GitHub Contents API. Vin commits with **+ Add**. |
| **CoS suggests** | `board.json` → `suggestions[]` (+ `dismissed_ids[]`) | Staging only. **Not** auto-added to Needs you. |

## `board.json` shape

```json
{
  "title": "CoS Today",
  "updated_at": "ISO-8601",
  "blockers": [{ "id": "sug-callrail", "text": "…", "added_at": "…", "source": "suggestion" }],
  "suggestions": [{ "id": "sug-callrail", "text": "…" }],
  "dismissed_ids": ["sug-…"],
  "work_cards": {
    "emc": {
      "title": null,
      "body": null,
      "details": {
        "status": [{ "id": "emc-s1", "text": "Complete sentence…" }],
        "needs": [{ "id": "emc-n1", "text": "…" }],
        "next": [{ "id": "emc-x1", "text": "…" }]
      }
    }
  }
}
```

- **`work_cards[id].title` / `body`** — Vin’s wording when he has edited (else `null`). CoS must not replace non-null values with seed HTML.
- **`work_cards[id].details`** — CoS-authored numbered sentences. Array order is Vin-reorderable; merge by `id` (preserve order, update text carefully).
- **`suggestions`** — quiet bullets with **+ Add** / **×**.
- **`blockers`** — committed Needs-you list.
- **`dismissed_ids`** — suggestions Vin cleared with ×.

## UI behavior

1. **Work card face** — compact title + body only. Tap opens the detail drawer.
2. **Drawer** — Status / Needs you / CoS next as numbered lists; drag ⋮⋮ to reorder (mouse + touch). Close via ×, backdrop click, or Escape.
3. **+ Add** — append suggestion to `blockers`, remove from `suggestions`, `PUT` `board.json`.
4. **× on suggestion** — remove from `suggestions`, append `id` to `dismissed_ids`, sync.
5. **× on Needs you** — remove from `blockers` only, sync.
6. Suggestions are **never** auto-copied into Work cards or `[data-edit]` text.

## Architecture (same as supplier-pipeline / bc-events-crm)

1. **On load** — `GET …/contents/cos-today/board.json` → apply blockers / suggestions / work_cards; store `sha`.
2. **Fallback** — static `board.json` on Pages if the API fails; then try create/push.
3. **On + Add / dismiss / remove / detail reorder / Vin Work edit** — in-memory update → `PUT` with `sha`.
4. **409** — pull remote, merge by `id` (blockers prefer local Vin commits; suggestions = union minus blockers/dismissed; work_cards merge without wiping Vin title/body), retry once.
5. **Quiet refresh** — ~60s + `visibilitychange` (skipped while drawer is open).
6. Obfuscated `_GH_DEFAULTS` token pattern (same as other boards).

## CoS updating seeds

Prefer editing `work_cards[*].details` and `suggestions` in `board.json` (stable ids; do not rewrite existing `blockers[].text` or Vin `title`/`body`).  
Never replace Vin `[data-edit]` strings in HTML when shipping CoS detail updates. Bump `app.js?v=` / `cos-content-version` when shipping HTML/JS.
