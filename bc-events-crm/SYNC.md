# Blue Coast Events CRM — CoS sync

**Live:** https://vinchiu-dev.github.io/sams-chinese-quest/bc-events-crm/  
**FO Shared Sheet:** https://docs.google.com/spreadsheets/d/1YEjZCTYaIA6iv-q5u7RbHxRqug-t63RBsSy6h3ijGdw/edit  
**Repo folder:** `bc-events-crm/`

## Architecture (static GitHub Pages)

1. **`leads.json`** — seeded pipeline (Gmail EVENT INQUIRY, email RFQs, etc.). CoS republishes after inbox ingest.
2. **FO Shared Sheet** — source of truth for FO overlays: `stage`, `marketing_channel`, `revenue_php`, `fo_notes`, `lost_reason`, `last_updated` keyed by `lead_id`.
3. **`fo-overlay.csv`** — same-origin mirror of the Sheet (always fetchable from GH Pages). CoS overwrites this from the Sheet on sync.
4. **Browser `localStorage`** (`bc-events-crm-overlay-v1`) — FO drawer Save writes here and **recomputes the revenue chart immediately**. Local wins over remote until CoS republishes.

Merge order in `app.js`: `leads.json` ← FO Sheet / `fo-overlay.csv` ← localStorage.

### One-time Sheet share (for live CSV fetch)

In Google Sheets: **Share → Anyone with the link → Viewer**.  
Then the page can also hit `config.json` → `fo_sheet_csv_url` (export CSV). Until shared, Refresh FO data still loads `fo-overlay.csv`.

Optional: **File → Share → Publish to web** (CSV) and paste that URL into `config.json` `fo_sheet_csv_url`.

## How FO enters revenue

1. Open the CRM → click a lead → set **Stage = Won**.
2. Enter **Won revenue (₱)** = confirmed total event/group revenue (never invent; nightly rate alone is not enough).
3. Set **Marketing channel** (Google Ads, Messenger, etc.).
4. Click **Save** → chart updates on this device immediately.
5. For multi-device durability: also upsert the same row in the **FO Shared Sheet** (columns match `fo-overlay.csv`), **or** rely on weekday CoS sync if FO only uses the drawer (CoS should harvest local notes when Vin pastes / Sheet is edited).

Preferred durable path: FO edits the Shared Sheet (or Vin mirrors drawer edits into the Sheet). CoS morning sync publishes Sheet → `fo-overlay.csv` (+ optional field merge into `leads.json`) → push `main`.

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
> 2. Download **BC Events CRM — FO ledger** Sheet (Drive connector `read_file_content` or export CSV) → write `bc-events-crm/fo-overlay.csv` with headers: `lead_id,name,org,stage,marketing_channel,revenue_php,fo_notes,lost_reason,last_updated,editor`.  
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
- **Apps Script POST from drawer:** not deployed (static Pages); Sheet + CoS republish is the durable path.
