# Blue Coast Command Center — how updates work

Live: https://vinchiu-dev.github.io/sams-chinese-quest/bc-command/

- `index.html`: the page. It rarely changes. It loads `data.json` fresh on every open, plus two live feeds from this repo:
  `../bc-events-crm/leads.json` (pipeline) and `../bc-ota/LAST-RUN.json` (bookings, last 7 days).
- `data.json` is the only file routines should edit:
  - `financials`: update this when the accountant's monthly BC statement lands (usually the 15th–20th). Use the statement's own figures, and set `latest_month`, `latest_month_label`, `as_of`, `source_url`, and the *_ly comparables.
  - `renovation`: update twice a week (Mon/Thu). Run `python3 scripts/pull-reno.py` (headless Chrome, read-only, no clicks) and copy `o.total/o.done/o.checked`, `counts`, and `areaStates` into the file. Set `status` to `on_track` or `behind` using the tracker's rule (behind if plan − done > 5 pts).
  - `events_mtd`, `reviews`: update these whenever fresh numbers exist. Leave a value `null` instead of guessing.
- Always bump `updated_at_et`. Never invent numbers.
