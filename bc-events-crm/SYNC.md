# Blue Coast Events CRM — multi-device sync

**Live:** https://vinchiu-dev.github.io/sams-chinese-quest/bc-events-crm/  
**Repo folder:** `bc-events-crm/`  
**Canonical board file:** `bc-events-crm/leads.json`

## Architecture (GitHub Contents API — same as Sam’s Chinese Quest)

No Apps Script. No per-device setup. The CRM page uses the **GitHub Contents API** to read/write `bc-events-crm/leads.json`, reusing the same obfuscated `_GH_DEFAULTS` token pattern as `/index.html` (Sam progress.json sync).

1. **On load** — `GET /repos/{owner}/{repo}/contents/bc-events-crm/leads.json` with the token → use that JSON as `baseLeads`, store `sha`.
2. **Fallback chain** if the API fails — static `leads.json` (Pages CDN) → `synced-ledger.csv` → Sheet CSV (only if `config.fo_sheet_csv_url` is set). Prefer GitHub live data over Sheet; Sheet is optional backup only.
3. **On Save / Remove / Add event / drag stage change** — update in-memory leads, rebuild full `leads.json` payload (`title`, `stages`, `leads`, `marketing_channels`, etc.), `PUT` with `sha` and message `Update BC Events CRM board`.
4. **409 conflict** — pull remote, merge by lead `id` (prefer newer `last_updated`), retry once.
5. **Soft-delete** — `stage=deleted` is written into `leads.json` so every device hides the card after refresh.
6. **Auto-refresh** — every ~60s and on `visibilitychange`; **skipped while the drawer is open** so in-progress edits are not wiped.
7. **Toasts** — `Synced` / `Sync failed`. Never `window.open` the Sheet.
8. **Banner** — optional chip **Synced via GitHub** when the last pull/push succeeded.

`config.json`:
- `fo_sheet_write_url` = `""` (Apps Script path abandoned)
- `fo_sheet_csv_url` = `""` (Sheet not used for the live board)

## How FO works the board

1. Open the CRM → click a lead (or **+ Add event**).
2. Edit stage / channel / FO notes / revenue / lost reason → **Save**.
3. Or drag the ⋮⋮ handle to change stage.
4. Toast **Synced** means `leads.json` was written on GitHub; other devices pick it up on refresh / ~60s poll.
5. **Remove from board** (password) soft-deletes (`stage=deleted`) and syncs so all devices hide the card.

## CoS ingest (still useful)

Gmail EVENT INQUIRY / RFQ ingest can still upsert into `bc-events-crm/leads.json` via CoS commit, or FO can add from the UI (GitHub sync). Prefer not inventing `revenue_php`.

| Source | How |
|--------|-----|
| **Gmail EVENT INQUIRY** | Upsert into `leads.json` (stable `id`) or FO Add event |
| **Gov / agency RFQ** | `marketing_channel=Gov RFQ / email` |
| **Messenger** | FO pastes notes; channel **Messenger** |
| **Cloudbeds** | Only confirmed group totals; never invent revenue |

## Google Ads attribution

1. Ads final URL / suffix: `utm_source=google&utm_medium=cpc&utm_campaign=bc-events`
2. Formidable EVENT INQUIRY mail must include UTM fields (and gclid if present).
3. Map `utm_source=google` + `utm_medium=cpc|paid` (or gclid) → `marketing_channel=Google Ads`.
4. Cards with Google Ads show a yellow ★ badge. Shared Sheet is backend-only if used — CRM UI must **not** open or link to the Sheet.

## Password-gated remove (Vin only)

Drawer **Remove from board** asks for a password (SHA-256 in `config.json` → `delete_password_sha256`). Soft-delete persists via GitHub so all devices hide the card.

## Abandoned path

Apps Script write-back (`scripts/SheetWriteback.gs`, `fo_sheet_write_url`) is **not** required and should stay empty. Optional Sheet CSV is last-resort fallback only.
