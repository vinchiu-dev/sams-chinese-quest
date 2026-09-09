# Blue Coast Events CRM

**Live:** https://vinchiu-dev.github.io/sams-chinese-quest/bc-events-crm/  
**Shared Sheet (source of truth):** https://docs.google.com/spreadsheets/d/1jDADtI5y_HMxnBS4j-scUjF9NXePoK9ybOQM7Ud0f1Y/edit

## How data syncs

1. **Google Sheet** `BC Events CRM — synced ledger` is the multi-device source of truth (all leads + FO stage / channel / revenue_php / notes / lost_reason).
2. The CRM page loads Sheet CSV first (`config.json` → `fo_sheet_csv_url`), then falls back to `synced-ledger.csv` (repo mirror), then `leads.json`.
3. **Drawer Save** updates a local draft for instant UI, then — if `config.fo_sheet_write_url` is set — POSTs FO fields to the Apps Script web app, which upserts the Sheet by `lead_id`. On success the page refreshes from Sheet CSV so the canonical Sheet wins for all viewers. If the write URL is empty or POST fails, Save stays **local draft only** (clear with Refresh / Clear local drafts) and you should edit the Shared Sheet directly.
4. Revenue chart recomputes from merged won + `revenue_php` by channel whenever data loads or drafts change.

Share the Sheet as **Anyone with the link → Editor** (or keep writers: `vin.chiu@gmail.com`, `stay@bluecoastbeachhotel.com`) so FO can edit and Pages can fetch CSV.

Deploy write-back: **[scripts/DEPLOY-WRITEBACK.md](./scripts/DEPLOY-WRITEBACK.md)**. CoS weekday ingest: **[SYNC.md](./SYNC.md)**.
