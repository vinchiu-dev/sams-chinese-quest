# Blue Coast Events CRM

**Live:** https://vinchiu-dev.github.io/sams-chinese-quest/bc-events-crm/

## How data syncs

1. **`bc-events-crm/leads.json` on GitHub** is the multi-device source of truth (GitHub Contents API — same pattern as Sam’s Chinese Quest `progress.json`).
2. On load the page pulls live `leads.json` via the API; fallback is static `leads.json` → `synced-ledger.csv` → optional Sheet CSV (only if configured).
3. **Save / Remove / Add / drag stage** rebuilds the full CRM JSON and `PUT`s it to GitHub (with `sha`; 409 → merge by lead id + retry). Soft-deletes (`stage=deleted`) persist so all devices hide the card.
4. Auto-refresh ~60s + on visibility (skipped while the drawer is open). Toast **Synced** / **Sync failed**. No Apps Script; no `window.open` to Sheet.

Details: **[SYNC.md](./SYNC.md)**.
