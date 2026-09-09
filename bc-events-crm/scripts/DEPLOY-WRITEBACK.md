# Deploy Sheet write-back (Apps Script)

Drawer **Save** can POST FO edits to the Shared Sheet so every dashboard viewer sees them after Refresh. Until this is deployed, leave `config.json` → `fo_sheet_write_url` as `""` (local draft only).

## Steps

1. Open the Shared Sheet:  
   https://docs.google.com/spreadsheets/d/1jDADtI5y_HMxnBS4j-scUjF9NXePoK9ybOQM7Ud0f1Y/edit
2. **Extensions → Apps Script**
3. Delete any stub code. Paste the full contents of `scripts/SheetWriteback.gs`
4. Save the project (name e.g. `BC Events CRM writeback`)
5. **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Authorize when prompted (Google account that owns/edits the Sheet)
7. Copy the **Web app URL** (`…/exec`)
8. Paste it into `bc-events-crm/config.json` as `fo_sheet_write_url`
9. Commit + push `main` so GitHub Pages picks up the URL
10. Smoke test:
    - Browser GET the URL → `{ "ok": true, "service": "bc-events-crm-writeback" }`
    - On the live CRM, edit a lead → **Save** → toast “Synced to Shared Sheet” → row updates in Sheet → other devices **Refresh from Sheet**

## Browser CORS note

Apps Script often fails JSON `Content-Type` preflight. The CRM posts with `Content-Type: text/plain;charset=utf-8` and `mode: "cors"`, body still JSON. Redeploy after any `.gs` change (**Deploy → Manage deployments → Edit → New version**).

## Safety

- Write-back **merges**: only overwrites columns present in the POST (`stage`, `marketing_channel`, `fo_notes`, `revenue_php`, `lost_reason`, `last_updated`, `editor`, optional `name`/`org`). Omitted fields are left alone.
- No secrets in the repo; the Sheet ID is already public in `config.json`.
