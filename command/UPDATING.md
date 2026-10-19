# Command Center: how updates work

Live: https://vinchiu-dev.github.io/sams-chinese-quest/command/ (tabs: `#bc`, `#emc`). `/bc-command/` redirects to `#bc`.

## Files
- `index.html`: one page with generic block renderers. It rarely changes.
- `tabs.json`: the list of tabs, `{"tabs":[{"id":"bc","label":"Blue Coast","file":"bc.json"}, ...]}`. The first tab is the default.
- `bc.json`, `emc.json`: one data file per company. **A routine edits only its own company's file.**
- `scripts/pull-reno.py`: read-only headless pull of the Blue Coast renovation tracker. It makes no clicks and prints overall, counts, and areaStates.

## Add a new tab (e.g. Growth/EasySaunas, Peace Den)
1. Create `command/<id>.json` using the shape below, with `layout` listing the block keys in display order.
2. Add `{"id":"<id>","label":"...","file":"<id>.json"}` to `tabs.json`.
That's it. No HTML change is needed unless you want a new block type.

## Tab file shape
```json
{ "tab":"emc", "name":"Easy Massage Chair", "updated_at_et":"2026-10-19T15:10:00-04:00",
  "layout":["financials","checklist","ads","youtube","links"],
  "<key>": { "type":"<block type>", ... } }
```
Always bump `updated_at_et`, which is the header's "Data as of". Unknown or missing values must be `null`, which renders as "—". Never invent numbers.

## Block types

### `financials` (both tabs, from Randolph's monthly statement)
```json
{ "type":"financials", "currency":"USD|PHP", "period_label":"August 2026", "ytd_label":"Jan–Aug 2026",
  "as_of":"YYYY-MM-DD", "source":"...", "source_url":"https://drive.google.com/...", "note":"...",
  "ni_label":"Net income*",
  "month":{"sales":0,"sales_ly":0,"ni":0,"ni_ly":0,"gp":0,"gp_ly":0},
  "ytd":  {"sales":0,"sales_ly":0,"ni":0,"ni_ly":0,"gp":0,"gp_ly":0},
  "rows":[{"label":"...","value":0,"value_ly":0,"fmt":"money|pct_points","note":"...","lower_is_better":false}] }
```
- The page computes YoY %, net margin (ni/sales), and gross margin (gp/sales). Set `gp`/`gp_ly` to null when the statement has no COGS (BC). The page then shows "— not in statement".
- `pct_points` rows take fractions (0.063 = 6.3%). Set `lower_is_better:true` to flip the arrow colours (ads %, refund rate).
- EMC: use the pack's gross Sales and its Net income* (before payroll/income tax), because that's its only YoY basis.

### `youtube`
```json
{ "type":"youtube", "as_of":"YYYY-MM-DD", "channel_title":"...", "handle":"@...", "channel_id":"UC...", "url":"...",
  "subscribers":8260, "subscribers_display":"8.26K", "total_views":1904091, "videos":1270,
  "views_28d":null, "views_28d_label":"Aug 31–Sep 27, 2026", "views_prior_28d":null, "subs_change_28d":null,
  "views_28d_source":"...", "source":"...", "note":"...",
  "history":[{"date":"YYYY-MM-DD","subscribers":0,"total_views":0}] }
```
On each check, append a public snapshot to `history` (and update the top-level fields). The page shows the growth between the first and last snapshots. `views_28d` and `views_prior_28d` come only from YouTube Studio. If there's no channel, set `subscribers:null` and `url:null`.

### `kpis` (generic cards)
```json
{ "type":"kpis", "title":"...", "items":[
  {"label":"...","value":0,"value_ly":0,"fmt":"money|num|score10","currency":"USD","as_of":"YYYY-MM-DD","sub":"...","note":"...","source":"...","link":"...",
   "compare_value":null,"compare_label":"vs prior 10 days"},
  {"type":"live_crm_pipeline","label":"...","url":"../bc-events-crm/leads.json","link":"..."},
  {"type":"live_ota_week","label":"...","url":"../bc-ota/LAST-RUN.json","link":"..."} ] }
```
Live items are read from those repo files on every page load.

### `renovation` (BC)
Fields: `as_of`, `as_of_et_label`, `start`, `finish_target`, `owner_deadline`, `items_total`, `items_done`, `items_checked`, `plan_pct_at_check`, `status` (`on_track|behind|pending`), `areas_total/ready/in_work/need_fix/not_started`, `status_counts`, `note`, `tracker_url`.
Rule (same as the tracker): `behind` if plan − done > 0.05, where plan = (today − start)/(finish_target − start) and done = OK + Fixed.

### `ads_weekly` (EMC): path `command/emc.json` → `ads`
The weekly Google Ads routine (Tuesdays) writes this block:
```json
"ads": {
  "type": "ads_weekly",
  "status": "pending | ready",
  "first_review": "2026-10-20",
  "week_of": "2026-10-20",
  "updated_at_et": "2026-10-20T10:00:00-04:00",
  "account": "Easy Massage Chair · Google Ads 233-345-8216",
  "osaki": {
    "campaign": "Brands → Osaki",
    "verdict": "keep | scale | trim | pause | fix",
    "verdict_label": "Keep, trim waste",
    "reason": "one sentence with the numbers behind it"
  },
  "recommendations": [
    {"title": "Short imperative", "detail": "what exactly to change", "impact": "expected effect", "status": "proposed | approved | done"}
  ],
  "ads_pct_of_sales": {
    "window_label": "Last 30 days · Sep 19–Oct 18", "start": "YYYY-MM-DD", "end": "YYYY-MM-DD",
    "ads_cost": 8782.40, "sales": 227244.93, "pct": 0.0386, "as_of": "YYYY-MM-DD",
    "source": "where cost and sales came from"
  },
  "target": {"low": 0.03, "high": 0.04, "ceiling": 0.05},
  "source": "optional note on the review itself"
}
```
- While `status` is `pending` and `recommendations` is empty, the card shows "First review Tue Oct 20". Set `status:"ready"` and fill `week_of`, `osaki`, and up to 3 `recommendations` (only the first 3 show).
- `pct` is a fraction, so 0.0386 = 3.86%. Colours: at or under `high` is green, over `high` is grey, over `ceiling` is red. `pct` = Google Ads cost ÷ Business Checklist Sale (non-cancelled) for the same dates.
- Proposed changes are recommendations only. Changing the live Ads account still needs Vin's approval.

### `links`
`{"type":"links","items":[{"label":"...","sub":"...","url":"..."}]}`

## Publishing
Run `git pull --rebase`, edit the one JSON file, commit, then `git push origin main`. GitHub Pages redeploys in about 1–2 minutes.
