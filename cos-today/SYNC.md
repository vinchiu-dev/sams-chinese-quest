# CoS Today — board sync

**Live:** https://vinchiu-dev.github.io/sams-chinese-quest/cos-today/  
**Repo folder:** `cos-today/`  
**Canonical board file:** `cos-today/board.json`

## What syncs vs what must never change

| Layer | Storage | Rule |
|-------|---------|------|
| **Vin card wording** (`[data-edit]` titles/bodies on Life / Work / Below) | `localStorage` (`cosTodayText:*`) + shipped HTML | **Never overwrite.** CoS updates notes via `.cos-note` in `index.html` only. Board JSON must not touch these fields. |
| **Work card order / Open·Done pills** | `localStorage` | Device-local; not in `board.json`. |
| **Needs you (committed blockers)** | `board.json` → `blockers[]` | Live via GitHub Contents API. Vin commits with **+ Add**. |
| **CoS suggests** | `board.json` → `suggestions[]` (+ `dismissed_ids[]`) | Staging only. **Not** auto-added to Needs you. |

## `board.json` shape

```json
{
  "title": "CoS Today",
  "updated_at": "ISO-8601",
  "blockers": [{ "id": "sug-callrail", "text": "…", "added_at": "…", "source": "suggestion" }],
  "suggestions": [{ "id": "sug-callrail", "text": "…" }],
  "dismissed_ids": ["sug-…"]
}
```

- **`suggestions`** — quiet bullets with **+ Add** / **×**. CoS may add new `{id,text}` seeds here.
- **`blockers`** — committed Needs-you list. Only grows when Vin taps **+ Add** (or CoS carefully appends with a new stable `id` — prefer letting Vin add).
- **`dismissed_ids`** — suggestions Vin cleared with × (so CoS re-seeds do not revive them on merge).

## UI behavior

1. **+ Add** — append suggestion to `blockers` (same `id`), remove from `suggestions`, `PUT` `board.json`.
2. **× on suggestion** — remove from `suggestions`, append `id` to `dismissed_ids`, sync.
3. **× on Needs you** — remove from `blockers` only, sync.
4. Suggestions are **never** auto-copied into Work cards or `[data-edit]` text.

## Architecture (same as supplier-pipeline / bc-events-crm)

1. **On load** — `GET …/contents/cos-today/board.json` → apply `blockers` / `suggestions`; store `sha`.
2. **Fallback** — static `board.json` on Pages if the API fails; then try create/push.
3. **On + Add / dismiss / remove** — in-memory update → `PUT` with `sha`.
4. **409** — pull remote, merge by `id` (blockers prefer local Vin commits; suggestions = union minus blockers/dismissed), retry once.
5. **Quiet refresh** — ~60s + `visibilitychange`.
6. Obfuscated `_GH_DEFAULTS` token pattern (same as other boards).

## CoS updating seeds

Prefer editing `suggestions` in `board.json` (add new ids, do not rewrite existing `blockers[].text`).  
Never edit Vin `[data-edit]` strings in HTML when shipping CoS note updates — only refresh `.cos-note` / `data-cos-note` blocks. Bump `app.js?v=` / `cos-content-version` when shipping HTML/JS.