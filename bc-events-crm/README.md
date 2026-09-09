# Blue Coast Events CRM

Mobile-friendly kanban pipeline for Blue Coast Beach Hotel event / group leads.

**Live:** https://vinchiu-dev.github.io/sams-chinese-quest/bc-events-crm/

## North star

YoY event sales growth — track open pipeline, won revenue by marketing channel, and FO follow-up notes.

## Marketing channels

Every lead has a `marketing_channel` used on cards, filter chips, and the **Revenue by source** chart:

- Google Ads
- Google Organic
- FB Ads
- FB Organic
- TikTok
- Website form (unknown)
- Gov RFQ / email
- Messenger
- Walk-in / other

Seeded form leads are tagged **Website form (unknown)** until UTMs exist. Gov / agency RFQs are **Gov RFQ / email**.

### UTM attribution (important for Ads)

When Angelica (or anyone) runs paid social / search, **final URLs** on Google Ads / Meta / TikTok should include UTMs so EVENT INQUIRY form submissions can be attributed instead of landing as “Website form (unknown)”:

```
?utm_source=google&utm_medium=cpc&utm_campaign=bc-events
?utm_source=facebook&utm_medium=paid&utm_campaign=bc-events
?utm_source=tiktok&utm_medium=paid&utm_campaign=bc-events
```

Organic examples: `utm_source=google&utm_medium=organic`, `utm_source=facebook&utm_medium=social`.

Wire the form (or Gmail → Sheet ingest) to persist those query params into `marketing_channel`.

## FO notes

Open a card → drawer with FO notes, stage dropdown, lost reason, and **revenue (₱)** when Won. Notes / stage / revenue persist in **localStorage on this device** until CoS wires a shared Sheet for multi-device sync.

## Files

| File | Role |
|------|------|
| `index.html` | Board UI + styles |
| `app.js` | Filters, drawer, localStorage overlay |
| `leads.json` | Seeded pipeline (source of truth until Sheet) |
| `seed-leads.json` | Raw inbox seed (reference) |

## Pipeline stages

New inquiry → Contacted → Quoted → Site visit / Negotiation → Won | Lost
