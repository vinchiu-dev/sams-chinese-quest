# Blue Coast Events CRM

**Live:** https://vinchiu-dev.github.io/sams-chinese-quest/bc-events-crm/  
**Shared Sheet (source of truth):** https://docs.google.com/spreadsheets/d/1jDADtI5y_HMxnBS4j-scUjF9NXePoK9ybOQM7Ud0f1Y/edit

## How data syncs

1. **Google Sheet** `BC Events CRM — synced ledger` is the multi-device source of truth (all leads + FO stage / channel / revenue_php / notes / lost_reason).
2. The CRM page loads Sheet CSV first (`config.json` → `fo_sheet_csv_url`), then falls back to `synced-ledger.csv` (repo mirror), then `leads.json`.
3. **Edit in the Sheet** for changes every device sees. Drawer Save is a **local draft only** (cleared by Refresh / Clear local drafts).
4. Revenue chart recomputes from merged won + `revenue_php` by channel whenever data loads or drafts change.

Share the Sheet as **Anyone with the link → Editor** (or keep writers: `vin.chiu@gmail.com`, `stay@bluecoastbeachhotel.com`) so FO can edit and Pages can fetch CSV.

See **[SYNC.md](./SYNC.md)** for CoS weekday ingest (Gmail / Messenger / Cloudbeds).
