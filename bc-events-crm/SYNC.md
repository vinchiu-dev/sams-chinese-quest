# Blue Coast Events CRM — CoS sync

**Live:** https://vinchiu-dev.github.io/sams-chinese-quest/bc-events-crm/  
**FO Shared Sheet:** https://docs.google.com/spreadsheets/d/1jDADtI5y_HMxnBS4j-scUjF9NXePoK9ybOQM7Ud0f1Y/edit  
**Repo folder:** `bc-events-crm/`

**Canonical Sheet (2026-09-09):** https://docs.google.com/spreadsheets/d/1jDADtI5y_HMxnBS4j-scUjF9NXePoK9ybOQM7Ud0f1Y/edit — full 16 leads. Sheet is source of truth; drawer Save POSTs to Apps Script when `fo_sheet_write_url` is set; Refresh loads Sheet CSV; localStorage drafts are fallback only.
## Architecture (static GitHub Pages)

1. **FO Shared Sheet** — **source of truth** for the ledger + FO overlays: `stage`, `marketing_channel`, `revenue_php`, `fo_notes`, `lost_reason`, `last_updated`, `editor` keyed by `lead_id`.
2. **Drawer Save → Apps Script write-back** — when `config.json` → `fo_sheet_write_url` is set, Save POSTs FO fields to `scripts/SheetWriteback.gs` (deployed web app). Script upserts by `lead_id` and **only overwrites fields present in the POST** (never blanks omitted columns). On success the page toasts sync + **Refresh from Sheet** so Sheet CSV wins for all viewers.
3. **Refresh / CSV load** — page prefers `fo_sheet_csv_url` (Sheet export), then `synced-ledger.csv` / `fo-overlay.csv` mirrors, then `leads.json`.
4. **Local drafts** (`localStorage` `bc-events-crm-draft-v2`) — fallback for instant UI when write URL is empty or POST fails. Cleared by **Refresh from Sheet** / Clear local drafts. Not multi-device.
5. **`leads.json`** — seeded pipeline (Gmail EVENT INQUIRY, email RFQs, etc.). CoS republishes after inbox ingest.

Merge order in `app.js`: Sheet CSV / mirror / `leads.json` base ← optional this-session drafts (only when Save applied them).

### Deploy write-back (CoS / Vin)

Paste the Apps Script web app URL into `config.json` → `fo_sheet_write_url` after deploy. Leave `""` until then. Steps: **[scripts/DEPLOY-WRITEBACK.md](./scripts/DEPLOY-WRITEBACK.md)**.

### One-time Sheet share (for live CSV fetch)

In Google Sheets: **Share → Anyone with the link → Viewer** (or Editor for FO).  
Then the page can hit `config.json` → `fo_sheet_csv_url` (export CSV). Until shared, Refresh still loads `synced-ledger.csv` / `fo-overlay.csv`.

Optional: **File → Share → Publish to web** (CSV) and paste that URL into `config.json` `fo_sheet_csv_url`.

## How FO enters revenue

1. Open the CRM → click a lead → set **Stage = Won**.
2. Enter **Won revenue (₱)** = confirmed total event/group revenue (never invent; nightly rate alone is not enough).
3. Set **Marketing channel** (Google Ads, Messenger, etc.).
4. Click **Save** → local draft updates the chart immediately; if write-back is deployed, POST upserts the Shared Sheet and Refresh reloads Sheet CSV for all devices.
5. If write URL is empty or sync fails: toast says **local draft only** and opens the Shared Sheet link — copy the row there (or edit in Sheet) so other devices see it.

Preferred durable path: Drawer Save → Apps Script → Shared Sheet (or edit Sheet directly). CoS morning sync still republishes Sheet → `fo-overlay.csv` / `synced-ledger.csv` (+ optional `leads.json` merge) → push `main` as a CDN fallback.

## CoS ingest sources

| Source | How to pull | Map into CRM |
|--------|-------------|--------------|
| **Gmail EVENT INQUIRY** | Gmail connector: subject/body contains `EVENT INQUIRY` / contact form; Blue Coast label / stay@ | New lead or update by email; `source_badge=Form` or Email; channel from UTMs else `Website form (unknown)` |
| **Gov / agency RFQ email** | Gmail search RFQ / BAC / DepEd / IOM / DSWD / DOJ | `marketing_channel=Gov RFQ / email`; stage new/quoted |
| **Messenger** | No Meta API in CoS today — FO pastes thread summary into drawer **FO notes** or Sheet `fo_notes`; set channel **Messenger** | Until Page inbox API: manual FO / Vin paste |
| **Cloudbeds** | Inbox rarely has *group/event* booking mail (mostly individual reservations + invoices). Check Cloudbeds dashboard **Groups / Blocks** if FO has login; do not invent revenue from marketing mail | If group booking confirmed: lead `stage=won`, channel as known, `revenue_php` only when FO/ops confirm total ₱ |

**Rule:** Never invent `revenue_php`. Prefer FO-entered values. Fixerink Sep stay is **Won** with revenue blank until FO confirms total (nightly ₱8,500 is a rate hint only).

## Weekday morning sync routine (ready prompt for CoS)

> **BC Events CRM — weekday morning sync (Mon–Fri ~08:30 America/New_York)**  
> 1. Gmail (`vin.chiu@gmail.com`): search last 24–48h for EVENT INQUIRY, contact form, RFQ/BAC event bids, Fixerink/group stay threads. Upsert into `bc-events-crm/leads.json` (stable `id` when possible).  
> 2. Download **BC Events CRM — synced ledger** Sheet (Drive connector `read_file_content` or export CSV) → write `bc-events-crm/fo-overlay.csv` with headers: `lead_id,name,org,stage,marketing_channel,revenue_php,fo_notes,lost_reason,last_updated,editor`.  
> 3. Optionally merge FO Sheet fields into matching `leads.json` rows (do not overwrite FO blanks over known seed notes; never invent revenue).  
> 4. Scan for Cloudbeds **group** confirmations only; note gaps in SEED-SUMMARY if none.  
> 5. Messenger: if Vin/FO left notes in Sheet or chat, apply channel=Messenger + notes.  
> 6. Commit + push `main` so GitHub Pages updates. Report: new leads, revenue chart totals, Sheet URL, remaining Cloudbeds/Messenger gaps.  
> 7. Run `python3 bc-events-crm/scripts/merge_fo_overlay.py` if present.

Cadence: **weekday mornings**. Skip inventing revenue. Prefer FO Sheet values for stage/channel/revenue.

## Local merge helper

```bash
# After saving Sheet export as /tmp/fo-ledger.csv:
python3 bc-events-crm/scripts/merge_fo_overlay.py /tmp/fo-ledger.csv
```

Writes `fo-overlay.csv` and optionally patches `leads.json` FO fields.

## Remaining gaps

- **Cloudbeds:** no reliable event-booking email feed; needs dashboard access or webhook.
- **Messenger:** no automated Page inbox connector; FO/Vin paste required.
- **Apps Script POST from drawer:** source ready at `scripts/SheetWriteback.gs` — deploy web app + set `fo_sheet_write_url` (see `scripts/DEPLOY-WRITEBACK.md`). Until then Sheet edit + CoS republish remains the durable path.
