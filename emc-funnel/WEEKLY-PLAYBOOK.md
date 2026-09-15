# EMC Weekly Marketing Funnel Check

**Channel (this copy):** Easy Massage Chair (`easymassagechair.com`)  
**Owner:** Chief of Staff (CoS) or any agent following this file  
**Cadence:** Weekly (prefer Monday ET, after the last full Sunday)  
**Version:** 2026-09-15-weekly-v1  
**Glance board:** `index.html` (same file copied to `dashboard.html`)  
**Live:** https://vinchiu-dev.github.io/sams-chinese-quest/emc-funnel/  
**Run file:** `LAST-RUN.json` (the board fetches this; do not hard-code numbers in HTML)

This playbook is the **weekly** walk: Traffic → Leads/Conversion → Money/Answer → Context → Notable changes → Notice this.

The 10-day deep audit in [`PROCESS.md`](PROCESS.md) is **complementary**, not a substitute. Do not mix 7-day and 10-day windows in the same cells.

**Do not invent numbers.** Leave `null` in JSON and **Unknown** / **—** on the board until the system is actually opened. A blank honest board beats a fake-green one.

---

## Why this board exists

Vin’s weekly check is a **funnel health glance**, not a full attribution study:

1. Is **traffic** (especially YouTube views + watch hours, plus Google Ads / Organic) steady vs the same season last year?
2. Are **unique sales calls** keeping up with visitors and YT views (and YT-number calls with watch hours)?
3. Is **money** per conversation holding — especially **average gross profit per sales call (KEY)** — and is the team actually **answering** during business hours?
4. If something dipped, is it **us** (site/UX/ads/copy/DNI) or the **category** (Google Trends + Tuan / other online-only stores)?

Walk top → bottom. Stop when the leak stage is clear. Log concurrent changes **before** you blame a stage.

---

## Windows (set these first)

Define four ranges in ET **before** pulling. Write them into `LAST-RUN.json` → `windows`.

| Window | Definition | Purpose |
| --- | --- | --- |
| **Last 7d** | Seven **full** calendar days ending yesterday (or the last day every source has complete data) | Current pulse |
| **Prior 7d** | The seven days immediately before Last 7d | Week-over-week (WoW) |
| **YoY 7d** | The **same calendar dates last year** (not “same ISO week” if they disagree — prefer same dates) | Seasonality. **Prefer YoY over WoW** when they conflict. |
| **Chart 30–50d** | Trailing 30–50 full days (default **42**) of **daily** points for line charts | Visual “steady vs baseline.” Do not eyeball a single week. |

Rules:

1. Prefer full calendar days. If today is Tuesday, Last 7d is last Mon–Sun, not “the last 168 hours.”
2. If a source lags (Ads conversion delay, YT Studio 24–48h, CallRail tagging backlog, checklist not posted), **shrink every window equally** or mark that metric Unknown. Never mix a live 7d with a lagged 5d in the same comparison.
3. Business-hours answer % uses the **same Last 7d**, but only hours the Sales EMC queue is staffed. Confirm hours in RingCentral; do not guess.
4. Chart series is daily; weekly KPI cards are **totals or averages for Last 7d**, with Prior 7d and YoY 7d beside them.

Suggested Monday run (example, not a pull): if you run Mon 2026-09-21, Last 7d = 2026-09-14 → 2026-09-20.

---

## Suggested run order (~45–75 min once logins work)

1. Open this playbook + `LAST-RUN.json` + the live board.
2. Set the four windows. Clear last week’s metric values to `null` so you cannot accidentally leave stale numbers.
3. Fill **Notable changes** for Last 7d + Prior 7d (5 min). Include DNI, PDP copy, bid/budget, YT uploads, RC/AC routing, promo, hours.
4. **TRAFFIC:** GA4 → YouTube Studio → Google Ads (in that order so organic/YT aren’t framed by spend).
5. **LEADS:** CallRail unique sales calls (all + YT number) → optional Zoho chat.
6. **MONEY / ANSWER:** Business Checklist sales + GP → RingCentral Sales EMC answer mix during business hours.
7. **CONTEXT:** Google Trends “massage chair” → Tuan Google Messages (industry vs EMC).
8. Compute ratios (only when **both** inputs are non-null). Apply status + Notice this.
9. Alert rules: significant WoW/YoY moves → ping CoS 1:1 (see below).
10. Commit `LAST-RUN.json` (HTML only if the board chrome changed). Push `main`. Paste a short note into the [EMC Planner](https://docs.google.com/document/d/1rYekaYPpaQG6u83GS2DtrXguzEG2BXEvil_9eXlUc4Q/edit).

---

## 1. TRAFFIC

**Question:** Is demand landing — overall and by major source — and is YouTube (views + watch hours) holding vs last year?

### Pull

| Metric | System | Where |
| --- | --- | --- |
| Users, sessions, channel grouping | **GA4** (EMC property) | Acquisition → Traffic acquisition. Last 7d vs Prior 7d vs custom YoY dates. Also: Explorations or a saved report with date + Session default channel group. |
| YouTube views, watch hours | **YouTube Studio** | Analytics → Overview (Content / Reach). Use **Watch time (hours)** and **Views**. Prefer the EMC channel that actually drives easymassagechair.com / the YT phone #. |
| Ads spend, clicks, impr., CPC, conv. | **Google Ads** | Campaigns, date compare. Mix: Search / Brands / Shopping / PMax / Demand Gen / Remarketing Static. Ads “conversions” are **weak** — do not steer the board on them. |
| Daily series (30–50d) | Same three | Export daily users/sessions, YT views, YT watch hours (and Ads clicks if easy) into `traffic.series.days`. |

Major sources to always show (even if Unknown):

- **YouTube** (highlight)
- **Google Ads** (paid search / shopping / PMax as noted)
- **Google Organic**
- Direct
- Referral / other (collapse small ones)

### Highlight

YouTube **views** and **watch hours** get the large KPI cards + their own 30–50d line charts. Planner framing still applies: watch-hours pace vs YoY (historically “2× yoy watch hours” as a growth target — that is a goal, not a fabricated current number).

### Charts

Each line chart should make **steady vs not** obvious:

- Plot Last 30–50 daily points.
- Draw a faint **baseline** = median of the first half of the series (or YoY daily if you actually pulled it).
- If the recent week sits on the baseline → card shows **✓ Steady** (lime).
- If the line broke (level shift, not one noisy day) → Yellow/Red and a Notice this card.
- Empty series → chart reads **Unknown**, never a flat zero line that looks like “no traffic.”

### Status (guidance, not fake precision)

- **✓ Steady / Green:** Overall + YT watch hours roughly in line with YoY same dates; WoW wiggle only; tracking intact.
- **Yellow:** One major source soft or spend up without matching sessions/views; or YoY down but WoW flat (season vs us — go to Context before blaming Ads).
- **Red:** YT views/watch hours or site traffic clearly down across Ads **and** Organic **and** YT, or a tracking outage.
- **Unknown:** GA4 / YT Studio / Ads not opened this run.

**PMax / retargeting note:** Static remarketing and thin PMax often dump low-quality sessions. When you quote “site traffic,” add `traffic.pmax_retargeting_filtered` = true and say what you excluded. Do not silently mix junk clicks into the conversion denominators in section 2.

---

## 2. LEADS / CONVERSION

**Question:** Are visitors and viewers becoming **unique sales calls**? Is the site still worth lingering on?

### Pull

| Metric | System | Where / how |
| --- | --- | --- |
| Unique sales calls | **CallRail** | Calls in Last 7d. **Unique** = distinct customer-intent inbound sales calls (thumbs-up / unique lead tag if that’s how EMC tags). Exclude obvious spam, existing-customer service if tagged, and duplicates. If tagging % is too low to trust uniqueness, set unique = null and put total inbound in `leads.callrail_calls_raw` with a note. |
| Calls by source | CallRail | Google Ads, YouTube / YT phone #, Google Organic, Direct, etc. |
| Calls to **YT phone #** | CallRail | The tracking number shown on YouTube (and YT-attributed DNI if on). This is the numerator for “calls per YT watch hour.” |
| Site engagement | **GA4** | Average engagement time (or avg session duration if that’s what’s available — name which). Bounce / engagement-rate inverse. **Filter PMax + remarketing** when those streams are known junk; set `leads.pmax_retargeting_filtered`. |
| Chat | **Zoho** (if available) | Chat starts / missed. If Zoho isn’t in the weekly login set, leave null and note “Zoho not pulled.” Do not skip CallRail because chat is missing. |

### Ratios (compute only if both sides exist)

| KPI | Formula |
| --- | --- |
| Unique sales calls per website visitor | `unique_sales_calls / ga4_users` (prefer users over sessions) |
| Unique sales calls per YT view | `unique_sales_calls / yt_views` |
| YT-number calls per YT watch hour | `yt_phone_calls / yt_watch_hours` |

If a denominator is null, the ratio is **Unknown** — do not use a 10-day leftover, a guessed visitor count, or Ads clicks as a stand-in.

### UX review prompts (qualitative, every run)

If calls/visitor or engagement **moved down** while traffic held, do not stop at the ratio. Prompt a 10-minute UX pass and log the outcome in `leads.ux_review_prompts` (even if “not needed this week”):

1. Mobile PDP: price, CTA, click-to-call, hours — still obvious?
2. YT description / pinned comment: phone # and link still the live CallRail numbers?
3. DNI: is the number on key templates still injecting (view-source / CallRail numbers report)?
4. Promo / PDP copy this week — does the hero still match the offer?
5. Chat widget / hours overlay covering the call button?
6. Landing pages for the Ads campaign that **spent** — message match?

If nothing moved, write `ux_review_prompts: ["Not triggered — leads/engagement ✓ Steady"]` rather than deleting the field.

### Status

- **✓ Steady:** Calls per visitor and per YT view in line with YoY/WoW; engagement not collapsing; tagging trustworthy enough.
- **Yellow:** Traffic steady but calls soft, or engagement soft on unfiltered junk traffic, or tagging incomplete.
- **Red:** Traffic held, unique sales calls clearly down; or YT watch hours held while YT-number calls fell off.
- **Unknown:** CallRail not opened, or unique-vs-raw cannot be distinguished.

---

## 3. MONEY / ANSWER

**Question:** What is a sales call **worth**, and are **humans** picking up during business hours?

### Money pull (Business Checklist)

Sheet id (CoS already uses): `19cWkmcUCmANzLIa1RsAPxATVQ_T0sgCTrKh9CRdKcSk`

| Metric | How |
| --- | --- |
| Closed sales, **revenue** | Non-cancelled Sale>0 rows whose **sale date** falls in Last 7d (same rule for Prior / YoY). Do **not** use Google Ads conversions as sales. |
| **Gross profit (GP)** | Same rows, from the checklist GP / profit column CoS already trusts. If GP is not on the row, leave GP metrics **Unknown** — do not apply a guessed margin %. |
| Avg **revenue per sales call** | `revenue / unique_sales_calls` |
| **Avg GP per sales call (KEY)** | `gross_profit / unique_sales_calls` |
| Revenue per website visitor | `revenue / ga4_users` |
| Revenue per YT view | `revenue / yt_views` |

**KEY light:** Avg GP per sales call. A week can look “fine” on revenue per call while financing mix, discounts, or chair mix quietly cut GP. If revenue/call is steady and GP/call is not, that is a Money notice, not a Traffic miss.

If unique sales calls are Unknown, money-per-call is Unknown (you may still show raw revenue / GP / close count).

Optional if easy (from PROCESS.md, not required to invent): ads as % of sales (ceiling 5%, target 3–4%) — store under `money.ads_pct_of_sales`, still not a substitute for GP/call.

### Answer pull (RingCentral + CallRail, not CallRail alone)

| Metric | System | How |
| --- | --- | --- |
| % sales calls **answered by team** during business hours | **RingCentral Sales EMC** queue | Of inbound sales-queue calls **during staffed hours**, % answered by a **team extension** — **not** Answer Connect, **not** voicemail. Store hours used in `answer.business_hours_note`. |
| Split | RC | `team_answered` / `answer_connect` / `voicemail` / `abandoned` (business hours only). |
| Overflow sanity | RC vs AC | If AC handled volume is high while closers were free, that is a routing leak (historical failure mode). Ruth test-call batch is the 10-day audit tool (`PROCESS.md`); weekly board just needs the RC mix. |

CallRail is **not** the answer-rate meter. Use it for unique calls and source; use RC for who picked up.

### Status

- **✓ Steady:** GP/call and revenue/call in line with YoY; team-answer % during BH not slipping to AC/VM.
- **Yellow:** Revenue/call OK but GP/call soft (mix/discount/financing); or team-answer % drifting down.
- **Red:** GP/call clearly down, or team-answer % during BH collapsed toward AC/VM.
- **Unknown:** Checklist and/or RC not opened.

---

## 4. CONTEXT

**Question:** Is the category soft, or is it us?

### Google Trends

- Query: **massage chair** (US). Optional compare: `massage chairs`, brand terms only if you are diagnosing brand vs category.
- Open: [Google Trends — massage chair, US](https://trends.google.com/trends/explore?geo=US&q=massage%20chair)
- Look at the **same 7d vs prior 7d vs last year** on the 90-day (and 12-month) sparkline. Trends is an index, not sessions — capture **direction** (`up` / `down` / `flat` / `unknown`) + a one-line note, not a fake “search volume.”
- Store URL + note in `context.google_trends`.

### Tuan — Google Messages

Tuan is the industry- pal check: are **other online-only stores** also down, or is EMC uniquely off?

1. Open the Google Messages thread with Tuan (same thread CoS already uses).
2. If there is a fresh note this week, quote the gist (not gossip): industry slowdown vs EMC-specific.
3. If you did not ping Tuan this week, `checked: false` and note “not checked.” Do not recycle a month-old vibe as this week’s context.
4. Store in `context.tuan_messages`.

Use Context to **stop false Ads alarms**: if YT + Organic + Ads + Trends + Tuan all down, it is category. If Trends/Tuan hold and we are down, keep walking the funnel (UX, DNI, bids, answer).

---

## 5. NOTABLE CHANGES LOG

Must be **visible on the board**, not buried in Planner. Fill **before** diagnosis.

Log dated events in Last 7d, Prior 7d, and anything still hanging over the chart window (e.g. a bid cut last Monday that is still in Last 7d).

Typical rows (examples of *types*, not dates to invent):

| Date (ET) | Event | Owner | Could affect |
| --- | --- | --- | --- |
| | CallRail **DNI** on/off / number swap | | Leads, Traffic (session quality) |
| | **PDP copy** / price / hero / warranty | | Leads, Money |
| | Ads **bid / budget** cuts or raises, campaign pause | | Traffic, Leads, Money |
| | New or paused **YouTube** upload / YT phone in description | | Traffic, Leads |
| | RC hours, ring counts, **AC routing** | | Answer |
| | Promo / financing push | | Money (GP/call) |
| | Tracking / UTM / GA4 / CallRail script | | All |

Seeded known event (do not delete until it ages off the chart window): **2026-09-08 — Vin lowered many Google Ads bids.** Recheck Brands pace in the weeks after.

If nothing changed, leave one row: `No material changes logged this week` with today’s date so the panel does not look “forgot to fill.”

---

## 6. NOTICE THIS

Glance diagnosis. **Do not hide a healthy week.**

- When something **moved** (Yellow/Red, or a ratio broke): write **at most 3** diagnosis cards. One sentence each + where to dig. Rank by money impact (GP/call and unique calls beat vanity CPC).
- When a section is healthy: show **✓ Steady** on that section — lime check, still visible.
- When unpulled: **Unknown**, plus `blockers` (auth, export lag). **Do not decide. Do not ping.**

Decision order (same spirit as `PROCESS.md`, weekly resolution):

1. Context category-down (Trends + Tuan) **and** all sources down → Notice = market; do not slash the healthy channel.
2. Traffic down, leads/visitor steady → dig Ads / YT / Organic source that broke.
3. Traffic steady, calls/visitor or YT-calls/watch-hour down → dig Mid capture + **UX prompts** (DNI, PDP, YT description, landing match).
4. Calls OK, GP/call down → dig mix, discount, financing; not spend.
5. Calls OK, team-answer % during BH down → RC / AC leak, not Ads.
6. Everything Unknown → empty Notice, list blockers.

Ads conversions, PMax trickle, and Static cheap clicks are supporting color. **CallRail unique calls + checklist GP** are the truth.

---

## Alert rules — ping CoS 1:1

Ping **CoS 1:1** (Vin / CoS channel you already use — not a public dump) when **any** of these are true **and** the metric was actually pulled (not Unknown):

| Trigger | Why |
| --- | --- |
| YoY Last 7d **YT watch hours or YT views** significantly down (use judgment: a break vs baseline / ~15%+ not explained by posting cadence) | Top-of-funnel engine |
| YoY or WoW **unique sales calls** significantly down while traffic held | Capture / UX / DNI / number |
| **Avg GP per sales call** significantly down WoW or YoY | KEY money light |
| **Team-answer % during BH** drop toward AC/VM | Leak; closers or routing |
| Ads spend jump **>~25% WoW** without unique calls / GP following (Planner guardrail) | Scale without payback |
| Tracking outage (GA4, CallRail DNI, YT number missing on videos) | All numbers lie |

Do **not** ping for:

- Unknown / not pulled
- One noisy day inside a steady 30–50d line
- Ads conversion count moving while CallRail + checklist do not
- A category dip already confirmed by Trends + Tuan (mention in the weekly note; 1:1 only if **we** are worse than the category)

Message shape: windows, 1–2 sentences, link to the live board, “need a decision?” vs “FYI.”

---

## LAST-RUN.json (weekly schema)

The board **fetches** this file. After a run:

1. Set `version` to `YYYY-MM-DD-weekly-v1` (run date).
2. Set `last_run_at_et` to the finish timestamp with offset (`2026-09-21T11:00:00-04:00`).
3. Fill `windows.*` dates.
4. Put weekly metrics under `traffic`, `leads`, `money`, `answer`, `context`.
5. Put daily points in `traffic.series.days` (and optional `leads.series`, `money.series`).
6. Rewrite `notices[]` (moved) and `steady_checks[]` (healthy sections).
7. Keep `legacy_10d_audit` as history. **Never copy 10-day totals into 7-day slots.**

Metric objects use:

```json
{
  "last_7d": null,
  "prior_7d": null,
  "yoy_7d": null,
  "wow_pct": null,
  "yoy_pct": null,
  "status": "Unknown",
  "note": null
}
```

`status`: `Unknown` | `Steady` | `Yellow` | `Red` (Green and Steady both render as ✓ Steady).

Ratios: compute in the JSON so the HTML does not guess. If you cannot compute, leave null.

---

## After each run (publish)

1. Save `LAST-RUN.json`.
2. Reload `index.html` locally or on Pages — confirm Unknown vs numbers look right (no 0 where you meant null).
3. `dashboard.html` must stay a byte-identical copy of `index.html` (copy after any chrome change).
4. Commit only `emc-funnel/` files. Push `vinchiu-dev/sams-chinese-quest` `main`.
5. Pages URL: https://vinchiu-dev.github.io/sams-chinese-quest/emc-funnel/
6. Paste into EMC Planner: windows, pills, Notice this sentences, blockers, whether you pinged 1:1.

Git identity for this repo (do **not** `git config --global`):

```bash
git -c user.name="Vin Chiu" -c user.email="vin.chiu@gmail.com" commit ...
# and matching GIT_AUTHOR_NAME / GIT_AUTHOR_EMAIL / GIT_COMMITTER_* env
```

---

## Source map (EMC)

| Need | System |
| --- | --- |
| Site users/sessions, channels, engagement | GA4 |
| Views, watch hours | YouTube Studio |
| Spend / clicks / campaign mix | Google Ads |
| Unique sales calls, YT phone #, source | CallRail |
| Who answered during BH | RingCentral **Sales EMC** |
| AC overflow volume (if mix looks wrong) | Answer Connect portal / `noreply@answerconnect.com` |
| Sales, revenue, **GP** | Business Checklist `19cWkmcUCmANzLIa1RsAPxATVQ_T0sgCTrKh9CRdKcSk` |
| Chat (optional) | Zoho |
| Category demand | [Google Trends — massage chair](https://trends.google.com/trends/explore?geo=US&q=massage%20chair) |
| Industry vs other online-only | Tuan, Google Messages |
| Plan / experiments | [EMC Planner](https://docs.google.com/document/d/1rYekaYPpaQG6u83GS2DtrXguzEG2BXEvil_9eXlUc4Q/edit) |

---

## Generalizing later (Peace Den / ESS)

This folder is EMC-specific. To run the same weekly check for another channel, **copy the folder** (or add `LAST-RUN-<channel>.json` + a `channel` switch) and change **only** the bindings below. Keep the six-section layout.

| Binding | Easy Massage Chair (this copy) | **Peace Den** (later) | **ESS / EasySpaSauna** (later) |
| --- | --- | --- | --- |
| `channel` id | `easy-massage-chair` | `peace-den` | `easy-spa-sauna` |
| Site | easymassagechair.com | peaceden.com | easyspasauna.com |
| GA4 property | EMC | PD property (create/bind) | ESS property (create/bind) |
| YouTube | EMC chair channel | PD channel **if it exists**; else mark YT Unknown and do not fake watch hours | ESS / sauna channel **if it exists**; else Unknown |
| Google Ads account | EMC / Furniture Fancy | PD campaigns only — do not blend EMC Brands spend | ESS / GDI sauna campaigns only |
| CallRail company / numbers | EMC + YT phone # | PD number (do not use EMC 888 on PD reports) | ESS number |
| RC queue | Sales EMC | PD/ESS queue if split; else note shared-queue contamination | same |
| Checklist / GP | EMC Business Checklist | PD sales+GP tab or separate sheet | ESS sales+GP |
| Trends query | `massage chair` | `massage chair` **and** `infrared sauna` / `cold plunge` / `massage bed` as relevant to **this week’s mix** | `infrared sauna` (plus brand terms if diagnosing) |
| Industry check | Tuan Messages (online-only chairs) | Tuan **only if he speaks to that category**; else a dealer/group chat that actually sells PD’s mix | Sauna/plunge peer, not chair-only Tuan |
| PMax/retargeting filter | Yes — Static + thin PMax known junk | Only if those campaigns exist on PD | Only if they exist on ESS |
| KEY money light | Avg **GP per sales call** | Same definition — **that channel’s** GP, never EMC blended | Same |
| Guardrails | Ads ≤5% of sales (target 3–4%) is EMC Planner | Do not import EMC % ceilings unless that channel’s plan says so | Same — set explicitly or leave Unknown |

### How to clone in practice

1. Duplicate `emc-funnel/` → `pd-funnel/` or `ess-funnel/` (or one board with `channel` in the JSON and a dropdown — only if you will actually maintain it).
2. Replace source IDs, phone numbers, sheet ids, Trends URLs in the playbook header + source map.
3. Empty `LAST-RUN.json` metrics to null; keep the schema.
4. Do not copy EMC weekly numbers into PD/ESS. Legacy EMC `legacy_10d_audit` stays in the EMC file only.
5. Shared closers / shared RC: say so on the board (`answer.shared_queue: true`). Otherwise PD will look like it “answered” EMC’s calls.
6. YT-heavy vs catalog-heavy: if a channel has no YouTube engine, **keep the YT cards** as Unknown (so the layout stays comparable) and put Organic + Ads in the highlight slots instead. Do not hide the YT row or future weeks cannot be compared.

When PD/ESS weekly is actually stood up, link those live URLs from this file’s header so agents do not overwrite EMC JSON by mistake.

---

## Complementary 10-day audit

Use [`PROCESS.md`](PROCESS.md) when you need TOF/Mid/BOF/Margin **stage pills**, Ruth AC miss tests, payment-mix / fee-drag, or a longer window. Weekly does not replace that. If the weekly board shows a Red on Answer or Money, schedule a 10-day pass the same week.
