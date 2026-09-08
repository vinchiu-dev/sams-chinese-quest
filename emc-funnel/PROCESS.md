# EMC Funnel — 10-day audit playbook

**Owner:** Chief of Staff (CoS)  
**Cadence:** Every ~10 days (compare last 10d vs prior 10d; add YoY same window when easy)  
**Version:** 2026-09-08-v1  
**Sources of truth:**  
- Live log: [EMC Planner](https://docs.google.com/document/d/1rYekaYPpaQG6u83GS2DtrXguzEG2BXEvil_9eXlUc4Q/edit) (id `1rYekaYPpaQG6u83GS2DtrXguzEG2BXEvil_9eXlUc4Q`)  
- Archive patterns: EMC Notebook Archived (2023)  
- Vin brief: TOF = Ads + GA4 + YT Studio → Mid = leads/calls/chats + Answer Connect answer rates/leaks → BOF = conversion to sales → Margin = discount discipline + payment mix (prefer check/ACH/Zelle over Affirm/financing)  
- Glance board: `dashboard.html` (publish under `vinchiu-dev/sams-chinese-quest/emc-funnel/`)  
- Run template: `LAST-RUN.json`

Do **not** invent numbers. Leave Unknown / null until pulled from the systems below. Log concurrent changes so you do not blame the wrong stage.

---

## Windows

Define three windows at the start of every run (ET dates):

| Window | Definition | Purpose |
| --- | --- | --- |
| **Last 10d** | Ending yesterday (or ending the last full day with complete data) | Current pulse |
| **Prior 10d** | The 10 days immediately before Last 10d | Sequential delta |
| **YoY 10d** | Same calendar dates last year (if Ads / GA4 / CallRail / YT make it easy) | Seasonality check |

Rules:
1. Prefer full calendar days; note partial days explicitly.
2. If a source lags (Ads conversion delay, CallRail tagging backlog, YT Studio lag), shrink all windows equally or mark that metric Unknown — never mix lagged and live without a note.
3. Write the three window date ranges into `LAST-RUN.json` and the dashboard “last run” strip before filling metrics.

---

## TOF checklist (Top of Funnel)

**Question:** Is demand / traffic / paid reach healthy?

Pull and compare Last 10d vs Prior 10d (and YoY if easy):

1. **Google Ads**
   - Spend, clicks, impressions, CTR, CPC
   - Conversions (cart / call goals as configured) and cost per conversion
   - Mix: Search vs Shopping vs Demand Gen / retargeting / other
   - Guardrail from Planner / Ad Scaling Plan: no unexplained spend jump >25% week-over-week; blended MER is a guardrail, incremental CallRail cost-per-closed-sale is the real light
2. **GA4**
   - Sessions / users (sitewide and key channels: Paid Search, Organic, Referral, Direct)
   - Landing-page / product-page engagement for high-intent paths
   - Note any tracking/UTM breaks (especially Meta / retargeting UTMs called out in Planner)
3. **YouTube Studio**
   - Watch hours / views pace vs YoY target framing in Planner (“2x yoy watch hours pace”)
   - CTR / thumbnail+title tests if a test was live in the concurrent-change log
   - YT Shopping clicks if enabled

**TOF status pills (guidance, not formulas with invented thresholds):**
- **Green:** Traffic / spend / watch hours roughly in line with prior 10d and plan; no broken tracking.
- **Yellow:** Soft dip or one channel soft while others hold; or spend up without matching clicks.
- **Red:** Clear traffic down across Ads and/or YT, or tracking outage.
- **Unknown:** Could not pull Ads / GA4 / YT.

---

## Mid checklist (Leads / answer / leaks)

**Question:** Are we capturing and answering the demand we create?

1. **Leads / calls / chats**
   - CallRail: inbound calls by source (Google Ads, YouTube, Organic, Direct, Retargeting, etc.), qualified leads, 60s+ calls if that conversion is live
   - RingCentral Sales EMC queue: answered / abandoned / overflow (RC is system of record for answer behavior; do not treat CallRail as the AC leak detector)
   - Chats / form fills / buyer’s-guide leads (volume + response time if available)
2. **Answer Connect (AC) answer rates & leaks**
   - AC messages / handled volume vs expected overflow from RC
   - Answer rate / miss pattern (Planner pattern: Ruth random test calls to measure AC misses; abandoned ≠ spam without checking)
   - Routing: confirm Sales EMC still rings team first, then AC, then VM — and that AC is not eating calls while closers are free (historical RC-routing failure mode in Planner)
3. **Tagging completeness**
   - CallRail outcome tagging % (thumbs-up = unique lead; Sale Closed + revenue in Notes) — Ad Scaling Plan gate
   - Untagged calls → treat Mid conversion quality as Unknown, not “fine”

**Mid status:**
- **Green:** Answer / abandon healthy; AC not leaking; tagging complete enough to trust source splits.
- **Yellow:** Soft lead dip with TOF steady, or partial tagging, or AC volume rising without RC explanation.
- **Red:** High abandon, confirmed AC miss/leak, or sharp drop in qualified calls/chats with TOF steady.
- **Unknown:** RC / CallRail / AC not opened this run.

---

## BOF checklist (Bottom of Funnel — conversion to sales)

**Question:** Are qualified conversations becoming closed sales?

1. Closed sales count and revenue for the window (Business Checklist / sales log — not Ads “conversions” alone)
2. Close rate proxies: closed sales ÷ qualified leads (CallRail) and/or ÷ answered sales calls (RC)
3. Closer capacity note: if close rate drops while lead volume rises, treat as capacity (Planner / Ad Scaling Plan), not an Ads failure
4. Refund / return pressure only if it clearly hit the same window (Planner Phase 1 “fix the bucket” — do not mix with Mid answer leaks)

**BOF status:**
- **Green:** Sales tracking with Mid volume; no unexplained close-rate collapse.
- **Yellow:** Sales soft with Mid soft, or close rate soft with rising capacity strain.
- **Red:** Mid leads/calls hold but sales fall hard; or tagging shows leads but no closes.
- **Unknown:** Sales sheet / CallRail closed tags not pulled.

---

## Margin / payment checklist

**Question:** Are we keeping margin after the sale?

From EMC Planner Phase 1 (payment fees / NMAP framing) and Vin brief:

1. **Discount discipline**
   - Flag stacks / exception discounts beyond the soft education-first offers in Planner
   - Note any promo live in the concurrent-change log
2. **Payment mix** (prefer check / ACH / Zelle)
   - Count or % by method for closed sales in the window: check, ACH/bank, Zelle, card, PayPal, Affirm / Splitit / other financing
   - Prefer check / bank / Zelle (Planner: check/bank/Zelle earns back fee drag; Affirm/financing is the expensive path)
   - Note whether closers offered the EMC add’l parts-warranty incentive for check/ACH/Zelle (Daryl/Symon PO note pattern in Planner)
3. **Fee drag**
   - Payment fees ÷ gross (directional). Planner aim: cut fee drag sharply; do not invent a period % — pull from books / checklist when available

**Margin status:**
- **Green:** Mix skewed to check/ACH/Zelle; discounts controlled.
- **Yellow:** Financing share rising or discount exceptions up.
- **Red:** Affirm/financing dominant on the window’s closes, or uncontrolled discounting.
- **Unknown:** Payment method not logged for the window.

---

## Concurrent-change log

Before blaming any stage, list what changed *during* Last 10d and Prior 10d:

| Date (ET) | Change | Owner | Stage it could contaminate |
| --- | --- | --- | --- |
| | Ads bid / budget / campaign pause-resume / Search Partners | | TOF, Mid |
| | New/paused YT upload or Shopping | | TOF |
| | RC hours, ring counts, queue, AC routing | | Mid |
| | Closer headcount / schedule | | Mid, BOF |
| | Promo / price / warranty offer | | BOF, Margin |
| | Tracking / CallRail numbers / UTMs | | All |

Copy the filled table into the EMC Planner run note (or link this run’s `LAST-RUN.json`).

---

## Decision rules

Run top-down; stop when the leak stage is clear. Update the dashboard “Where’s the leak?” callout with one sentence.

1. **If TOF and Mid are steady (Green/Yellow) but BOF/sales soft → dig process**  
   Closer capacity, talk tracks, discounting, follow-up speed, fit-check / remorse handling — not Ads spend.
2. **If traffic / TOF is down → dig Ads / YouTube**  
   Campaign health, Search Partners, bid/budget, creative, YT publishing pace, tracking. Do not scale spend to “fix” Mid if TOF itself is broken.
3. **If TOF steady but Mid leads/calls/chats down → dig Mid capture**  
   CallRail source split, landing pages, click-to-call, chat widget, form paths.
4. **If Mid volume OK but answer/abandon bad → AC / RC leak tests**  
   - Pull RC Sales EMC answered / abandoned / overflow for the windows  
   - Confirm routing order and ring counts  
   - Ruth: small batch of random test calls through the public sales number; score AC miss rate  
   - Compare AC portal / AC email volume vs RC overflow answered  
   - Do not use CallRail alone as the AC leak meter
5. **If sales OK but margin soft → dig payment mix + discount discipline**  
   Push check/ACH/Zelle incentive; review Affirm/financing share; stop stacked discounts.
6. **If everything Unknown → do not decide**  
   Fill `LAST-RUN.json` with nulls, mark pills Unknown, list blockers (auth, export lag), schedule the next pull.

Scale reminder (Planner): constraint is qualified leads; scale Ads/YT only when Mid tagging and closer capacity can absorb it.

---

## Where to pull each metric

| Metric | System | Where / how | Notes |
| --- | --- | --- | --- |
| Ads spend, clicks, CPC, conv. | **Google Ads** | Campaigns / Insights for EMC account(s); date compare Last 10d vs Prior 10d; YoY via custom date | Export or screenshot into run folder if needed |
| Sessions / channel / landing | **GA4** | Acquisition → traffic acquisition; Landing page; date compare | Watch UTM integrity for retargeting |
| Watch hours, views, CTR, YT Shopping | **YouTube Studio** | Analytics → Overview / Content / Reach; Shopping if enabled | Align to Planner “2x yoy watch hours” framing |
| Calls by source, qualified, closed tags | **CallRail** | Calls + reporting by source; outcome tags | 60s+ call conversion if wired to Ads |
| Queue answered / abandoned / overflow | **RingCentral** (Sales EMC) | Analytics performance / queues / call details | System of record for answer behavior |
| AC handled / miss tests | **Answer Connect** + **Ruth** | AC portal / `noreply@answerconnect.com` digests; Ruth test-call log | Compare to RC overflow |
| Closed sales, revenue, weekly pace | **Business Checklist** sheet | Spreadsheet id `19cWkmcUCmANzLIa1RsAPxATVQ_T0sgCTrKh9CRdKcSk` | Use the live sales / SNAC tabs CoS already knows; do not invent cells |
| Payment method / fee drag | Business Checklist + PO / processor exports | Check / ACH / Zelle / card / Affirm flags on closes | Prefer method mix over guessed fee % |
| Discount exceptions | Closer notes / PO notes / promo calendar | Concurrent-change log | Tie to Margin pill |
| Plan context / open experiments | **EMC Planner** Doc | id `1rYekaYPpaQG6u83GS2DtrXguzEG2BXEvil_9eXlUc4Q` | Paste a short run note after each audit |

### Suggested CoS run order (~60–90 min once logins work)

1. Set windows → open `LAST-RUN.json` / dashboard  
2. Concurrent-change log (5 min)  
3. TOF: Ads → GA4 → YT Studio  
4. Mid: CallRail → RC Sales EMC → AC / Ruth leak check if Mid soft or abandon high  
5. BOF: Business Checklist sales vs qualified leads  
6. Margin: payment mix + discount notes on closes  
7. Apply decision rules → write “Where’s the leak?” → set pills → paste summary into EMC Planner

---

## After each run

1. Update `/workspace/emc-funnel/LAST-RUN.json` (or the published copy’s companion if used)  
2. Refresh `dashboard.html` pills, key metric placeholders, last-run date, leak callout, and `data-cos-note` fields  
3. Publish dashboard if changed (`vinchiu-dev/sams-chinese-quest/emc-funnel/`)  
4. Append a dated note to EMC Planner (windows, pills, leak sentence, blockers) — no fabricated metrics
