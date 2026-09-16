# Blue Coast OTA growth — weekly CoS playbook

**Property:** Blue Coast Beach Hotel (NOT Bluehost)  
**Channels tracked:** Agoda + Booking.com (via Cloudbeds)  
**Owner:** Chief of Staff (CoS) or any agent following this file  
**Cadence:** Weekly · Monday ~10:00 AM ET (after last full Sunday)  
**Glance board:** `index.html` + `app.js?v=…`  
**Live:** https://vinchiu-dev.github.io/sams-chinese-quest/bc-ota/  
**Run file:** `LAST-RUN.json` (board fetches this; do not hard-code numbers in HTML)

**Do not invent numbers.** Honest **0** when the mailbox was scanned and no OTA confirmations fell in the window. Leave `amount_php: null` / **Unknown** for ₱ until Grand Total is parsed. Counts beat fake revenue.

---

## Why this board exists

Simple OTA sales-growth glance for Blue Coast:

1. Are **booking counts** holding WoW and YoY on Agoda and Booking.com?
2. Is **gross room revenue (₱)** holding when amounts are parseable?
3. Anything notable in the last ~12 weeks of weekly totals?

Prefer **count-based KPIs** until more Grand Totals are routinely parsed. Ping Vin only if WoW/YoY is notable.

---

## Windows (set these first)

Write into `LAST-RUN.json` → `windows` before pulling.

| Window | Definition | Purpose |
| --- | --- | --- |
| **Last 7d** | Seven full ET calendar days ending yesterday | Current pulse |
| **Prior 7d** | The seven days immediately before Last 7d | Week-over-week |
| **YoY 7d** | Same calendar dates last year | Seasonality (prefer YoY when it conflicts with WoW) |

Suggested Monday run: if you run Mon 2026-09-21, Last 7d = 2026-09-14 → 2026-09-20.

---

## Preferred pull (token-efficient)

### 1) Gmail Cloudbeds first (preferred)

OTA bookings arrive via **Cloudbeds** to:

- `vin.chiu@gmail.com`
- `bluecoastbeachhotel@gmail.com`

Filter / detect Source:

- **Booking.com** — often `guest.booking.com` in body/headers
- **Agoda** (sometimes labeled Priceline) — often `agoda-messaging.com`

Scan confirmations, modifications, cancellations covering Last 7d / Prior 7d / YoY 7d (and enough history to rebuild ~12 trailing weeks if empty).

**Rules:**

1. **Dedupe by confirmation #** (`ref` / Cloudbeds or OTA id).
2. Counts = **CONFIRMED only**. If a later cancel arrives, mark `status: "cancelled"` (+ `cancelled_et`) and **exclude from KPI counts**.
3. Extract when present: `date_et`, `channel` (`agoda` | `booking`), `guest`, `ref`, `nights`, `amount_php`, `check_in` / `check_out`, `status`.
4. **Grand Total parse:** Cloudbeds bodies use EU-style PHP — `PHP 16.083,00` means **16083.00 ₱** (dot = thousands, comma = decimals). Example: Maria Agnes Santos Booking.com Dec 2025 → 1 night, ₱16083. Heli Wilhelm Pascua Agoda Oct 2025 → 1 night, ₱14617.33. If snippet has no Grand Total, leave `amount_php: null`.

### 2) OTA extranet only if email gaps

Open Agoda / Booking.com extranet **only** when Gmail is missing a window or a clear confirmation gap. Prefer email so runs stay cheap.

---

## Write + publish

1. Set windows. Clear stale metric values so you cannot leave last week’s numbers.
2. Update `LAST-RUN.json`: channels, weekly_series (~12 weeks), bookings[], statuses, blockers, `sources_pulled`, `last_run_at_et`.
3. Roll up **confirmed** rows into `channels.{agoda|booking|total}.{bookings|gross_revenue_php}` for last_7d / prior_7d / yoy_7d.
4. WoW/YoY % only when both sides are non-null **and** meaningful (0 vs 0 → leave `wow_pct` / `yoy_pct` null).
5. Statuses: **Steady** / **Yellow** / **Red** / **Unknown**. Honest **0** after a scan is Steady (quiet), not Unknown.
6. Commit + push `main`. Bump `app.js?v=` only when chrome changes.
7. **Ping Vin only if WoW or YoY is notable** (material swing in count or ₱, or a blocker that blocks the pulse). Quiet zero weeks need no ping — note in `notices` if useful.

---

## Alert rules (keep light)

- Notable WoW or YoY on **Total** booking count or gross ₱ → short ping to Vin.
- New persistent blocker (mailbox auth, missing YoY mail) → `blockers[]`; ping only if it blocks the weekly pulse for 2+ weeks.
- Do not invent FX or room rates.

---

## Schema cheat-sheet

```text
channels.{agoda|booking|total}.{bookings|gross_revenue_php}.{last_7d|prior_7d|yoy_7d|wow_pct|yoy_pct|status}
weekly_series[]: week_start_et, week_end_et, agoda_bookings, booking_bookings, total_bookings,
                 agoda_revenue_php, booking_revenue_php, total_revenue_php
bookings[]: id, date_et, channel, guest, ref, nights, amount_php, status, cancelled_et?, check_in, check_out
```

Currency is always **₱ (PHP)**. No third-party analytics vendors — static HTML + JSON on GitHub Pages only.
