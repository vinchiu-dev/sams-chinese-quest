# Blue Coast Events CRM

Mobile-friendly kanban pipeline for Blue Coast Beach Hotel event / group leads.

**Live:** https://vinchiu-dev.github.io/sams-chinese-quest/bc-events-crm/  
**FO Shared Sheet:** https://docs.google.com/spreadsheets/d/1YEjZCTYaIA6iv-q5u7RbHxRqug-t63RBsSy6h3ijGdw/edit

## North star

YoY event sales growth — track open pipeline, won revenue by marketing channel, and FO follow-up notes.

## Revenue chart (dynamic)

The **Revenue by source** chart recomputes from merged lead data (won + `revenue_php` by `marketing_channel`) whenever:

1. FO clicks **Save** in the drawer (localStorage overlay — immediate), or
2. Remote FO data loads (`fo-overlay.csv` and/or published Sheet CSV) / **Refresh FO data**.

Merge order: `leads.json` ← FO Shared Sheet / `fo-overlay.csv` ← this-device localStorage.

## How FO enters revenue

1. Open a card → set **Stage = Won**.
2. Enter **Won revenue (₱)** = confirmed **total** (do not invent from nightly rates alone).
3. Set marketing channel → **Save** (chart updates immediately on this device).
4. For other devices / durability: edit the same `lead_id` row in the **FO Shared Sheet**, or wait for CoS weekday sync that publishes Sheet → `fo-overlay.csv`.

See **[SYNC.md](./SYNC.md)** for CoS Gmail / Messenger / Cloudbeds ingest and the weekday morning prompt.

## Marketing channels

Google Ads · Google Organic · FB Ads · FB Organic · TikTok · Website form (unknown) · Gov RFQ / email · Messenger · Walk-in / other

### UTM attribution

```
?utm_source=google&utm_medium=cpc&utm_campaign=bc-events
?utm_source=facebook&utm_medium=paid&utm_campaign=bc-events
?utm_source=tiktok&utm_medium=paid&utm_campaign=bc-events
```

## Files

| File | Role |
|------|------|
| `index.html` | Board UI + revenue chart |
| `app.js` | Filters, drawer, merge, chart recompute |
| `leads.json` | Seeded pipeline |
| `fo-overlay.csv` | Published FO overlay mirror |
| `config.json` | Sheet IDs / CSV URLs |
| `SYNC.md` | CoS ingest + weekday sync prompt |
| `scripts/merge_fo_overlay.py` | Sheet CSV → overlay + leads merge |

## Pipeline stages

New inquiry → Contacted → Quoted → Site visit / Negotiation → Won | Lost
