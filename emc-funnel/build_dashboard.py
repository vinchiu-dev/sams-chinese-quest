#!/usr/bin/env python3
"""Build the clear EMC funnel glance board from LAST-RUN.json.

All numbers come from LAST-RUN.json. The plain-English sentences and actions live in
COPY below and are rewritten each run from the TLDR / leak callout (no invented numbers).
Writes dashboard.html and index.html (identical).
"""
import json, html, datetime, pathlib

HERE = pathlib.Path(__file__).parent
VERSION = "2026-10-08-clear-v1"
R = json.loads((HERE / "LAST-RUN.json").read_text())
tof, mid, bof, mar = R["tof"], R["mid"], R["bof"], R["margin"]
tp, bp, mp = tof["prior_10d"], bof["prior_10d"], mar["prior_10d"]

def d(s):  # 2026-09-28 -> Sep 28
    return datetime.date.fromisoformat(s).strftime("%b %-d")
def money(x, dp=0):
    return "—" if x is None else f"${x:,.{dp}f}"
def num(x):
    return "—" if x is None else f"{x:,.0f}"
def pct_change(a, b):
    if a is None or b in (None, 0):
        return None
    return (a - b) / b * 100
def chg(a, b):
    p = pct_change(a, b)
    if p is None:
        return ""
    arrow = "▲" if p > 0.05 else ("▼" if p < -0.05 else "■")
    return f"{arrow} {abs(p):.0f}%"
def pts(a, b):
    if a is None or b is None:
        return ""
    diff = a - b
    arrow = "▲" if diff > 0 else ("▼" if diff < 0 else "■")
    return f"{arrow} {abs(diff):.2f} pts" if abs(diff) < 1 else f"{arrow} {abs(diff):.1f} pts"

W = R["windows"]
last_w = f"{d(W['last_10d']['start_et'])} – {d(W['last_10d']['end_et'])}"
prior_w = f"{d(W['prior_10d']['start_et'])} – {d(W['prior_10d']['end_et'])}"
yoy_w = f"{d(W['yoy_10d']['start_et'])} – {d(W['yoy_10d']['end_et'])}, 2025"
run_on = datetime.datetime.fromisoformat(R["last_run_at_et"]).strftime("%b %-d, %Y")

pm = mar["payment_mix"]
preferred = pm.get("check", 0) + pm.get("ach_bank", 0) + pm.get("zelle", 0)
preferred_p = sum(mp["payment_mix"].get(k, 0) for k in ("check", "ach_bank", "zelle"))
card_pp = pm.get("card", 0) + pm.get("paypal", 0)
yoy_ex = bof["yoy_10d"]["ex_outlier"]

# ---- Plain-English copy for this run (from TLDR-20261008 / leak_callout) ----
COPY = {
    "headline": "No clear leak.",
    "story": (f"Sales nearly doubled to <b>{money(bof['revenue'])}</b> on <b>{bof['closed_sales']}</b> closes "
              f"(prior {money(bp['revenue'])} on {bp['closed_sales']}). Ads cost just "
              f"<b>{bof['ads_pct_of_sales']:.2f}%</b> of sales, down from {bp['ads_pct_of_sales']:.2f}%."),
    "actions": [
        ("Push check / ACH / Zelle on every close.",
         f"Only {preferred} of {bof['closed_sales']} paid that way. Daryl and Symon should lead with it plus the extra parts warranty."),
        ("Ask Asim to fix Ads conversion tracking.",
         "Ads counts about 1 conversion per 10 days because calls and carts aren't counted. Also clear the disapproved ads in Brands and Brands CA."),
        ("Sign in to CallRail; reconnect or drop RingCentral.",
         "Until then we can't see how many calls come in or get answered."),
    ],
    "tof": "Search demand is steady and cheaper per click. The extra clicks are low-cost Display, not new buyers.",
    "mid": "Partly blind: CallRail is signed out and RingCentral is stale. AnswerConnect messages doubled, and 3 were buyers.",
    "bof": "Strong. Sales nearly doubled while ads fell to under 3% of sales (target 3–4%, ceiling 5%).",
    "margin": f"The soft spot. {card_pp} of {bof['closed_sales']} paid by card or PayPal, so fees ran {mar['fee_drag_pct']:.2f}% of sales (aim ~2%).",
}

def row(label, last, prior, change):
    return (f'<tr><th scope="row">{label}</th><td class="v">{last}</td>'
            f'<td class="p">{prior}</td><td class="c">{change}</td></tr>')

STAGES = [
    dict(key="tof", name="Traffic", tag="TOF", q="Are enough people finding us?", status=R["statuses"]["tof"],
         rows=[
             row("Search clicks", num(tof["ads_search"]["clicks"]), num(tp["ads_search"]["clicks"]),
                 chg(tof["ads_search"]["clicks"], tp["ads_search"]["clicks"])),
             row("Cost per search click", money(tof["ads_search"]["cpc"], 2), money(tp["ads_search"]["cpc"], 2),
                 chg(tof["ads_search"]["cpc"], tp["ads_search"]["cpc"])),
             row("Ads spend", money(tof["ads_spend"]), money(tp["ads_spend"]), chg(tof["ads_spend"], tp["ads_spend"])),
             row("Paid search visits (GA4)", num(tof["ga4_paid_search"]), num(tp["ga4_channels"]["Paid Search"]),
                 chg(tof["ga4_paid_search"], tp["ga4_channels"]["Paid Search"])),
         ],
         details=[
             f"Total Ads clicks {num(tof['ads_clicks'])} vs {num(tp['ads_clicks'])}: the jump is Display at "
             f"{num(tof['ads_display']['clicks'])} clicks for {money(tof['ads_display']['cost'], 2)} (mostly Remarketing Static), vs {num(tp['ads_display']['clicks'])} prior.",
             f"Ads conversions recorded: {tof['ads_conversions']:.0f} in 10 days (calls and carts not counted).",
             f"Organic search visits (GA4): {num(tof['ga4_organic_search'])} vs {num(tp['ga4_channels']['Organic Search'])} "
             f"({chg(tof['ga4_organic_search'], tp['ga4_channels']['Organic Search'])}).",
             "GA4 Direct / Unassigned / Display are flagged as junk traffic (Singapore). Ignore them; use Paid and Organic Search.",
             f"Brands campaign: {money(tof['ads_brands']['cost'])} / {num(tof['ads_brands']['clicks'])} clicks, close to 'limited by budget'; some ads disapproved in Brands and Brands CA.",
             f"Last year, same dates: spend {money(tof['yoy_10d']['ads_spend'])}, search clicks {num(tof['yoy_10d']['ads_search']['clicks'])} "
             f"at {money(tof['yoy_10d']['ads_search']['cpc'], 2)}.",
             "YouTube Studio didn't load this run, so watch hours are unknown.",
         ]),
    dict(key="mid", name="Calls & leads", tag="Mid", q="Are we catching and answering them?", status=R["statuses"]["mid"],
         rows=[
             row("AnswerConnect messages", num(mid["ac_digest_threads_last_10d"]), num(mid["ac_digest_threads_prior_10d"]),
                 chg(mid["ac_digest_threads_last_10d"], mid["ac_digest_threads_prior_10d"])),
             row("Sales calls (Sep vs Aug)", num(mid["calls_report_monthly"]["Sep 2026 EMC Sales"]),
                 num(mid["calls_report_monthly"]["Aug 2026"]),
                 chg(mid["calls_report_monthly"]["Sep 2026 EMC Sales"], mid["calls_report_monthly"]["Aug 2026"])),
             row("CallRail calls", "—", "—", '<span class="na">signed out</span>'),
         ],
         details=[
             "3 of the 8 AnswerConnect messages were buyers, including a price question on an Osaka Duo Max and a Yoga Flex customer who said they were ready to purchase. Are closers free when calls roll to AnswerConnect?",
             f"Calls Report is monthly only: Sep {mid['calls_report_monthly']['Sep 2026 EMC Sales']}, Aug {mid['calls_report_monthly']['Aug 2026']}, Oct 2025 {mid['calls_report_monthly']['Oct 2025']}.",
             "RingCentral answered / abandoned: unknown (Zapier connection stale since Sep 15).",
         ]),
    dict(key="bof", name="Sales", tag="BOF", q="Are conversations turning into sales?", status=R["statuses"]["bof"],
         rows=[
             row("Revenue", money(bof["revenue"]), money(bp["revenue"]), chg(bof["revenue"], bp["revenue"])),
             row("Closed sales", num(bof["closed_sales"]), num(bp["closed_sales"]), chg(bof["closed_sales"], bp["closed_sales"])),
             row("Ads as % of sales", f"{bof['ads_pct_of_sales']:.2f}%", f"{bp['ads_pct_of_sales']:.2f}%",
                 pts(bof["ads_pct_of_sales"], bp["ads_pct_of_sales"])),
             row("Margin (NMAP)", f"{bof['nmap_pct']:.1f}%", f"{bp['nmap_pct']:.1f}%", pts(bof["nmap_pct"], bp["nmap_pct"])),
         ],
         details=[
             f"Gross profit {money(bof['gross'])} vs {money(bp['gross'])} ({chg(bof['gross'], bp['gross'])}).",
             f"Last year, same dates: {money(bof['yoy_10d']['revenue'])} on {bof['yoy_10d']['closed_sales']}, but one $159,980 Flagship Duo order was most of it. "
             f"Without it: {money(yoy_ex['revenue'])} on {yoy_ex['closed_sales']}.",
             f"Credited source: YouTube {bof['platform_split']['Youtube']}, Google {bof['platform_split']['Google']}.",
             "Close rate vs qualified leads: unknown until CallRail is back.",
         ]),
    dict(key="margin", name="Margin", tag="Margin", q="Are we keeping the money after the sale?", status=R["statuses"]["margin"],
         rows=[
             row("Paid by check / ACH / Zelle", f"{preferred} of {bof['closed_sales']}", f"{preferred_p} of {bp['closed_sales']}",
                 f"{mar['preferred_pay_share']*100:.0f}% vs {mp['preferred_pay_share']*100:.0f}%"),
             row("Payment fees, % of sales", f"{mar['fee_drag_pct']:.2f}%", f"{mp['fee_drag_pct']:.2f}%",
                 pts(mar["fee_drag_pct"], mp["fee_drag_pct"])),
             row("Payment fees, $", money(mar["fees"]), "—", ""),
         ],
         details=[
             f"Payment mix: card {pm['card']}, PayPal {pm['paypal']}, check {pm['check']} (one $11,000 Apex Duo), ACH {pm['ach_bank']}, Zelle {pm['zelle']}, Affirm/financing {pm['affirm_financing']}.",
             f"Prior 10 days: card {mp['payment_mix'].get('card',0)}, PayPal {mp['payment_mix'].get('paypal',0)}, ACH {mp['payment_mix'].get('ach_bank',0)}.",
             f"Last year, same dates: fees {R['margin']['yoy_10d']['fee_drag_pct']:.2f}% of sales.",
             "No financing this window, which is good. Discount exceptions weren't logged.",
         ]),
]

PILL = {"Green": "green", "Yellow": "yellow", "Red": "red", "Unknown": "unknown"}

def stage_html(s):
    det = "".join(f"<li>{x}</li>" for x in s["details"])
    return f"""
    <article class="card">
      <header>
        <div>
          <p class="tag">{s['tag']}</p>
          <h3>{s['name']}</h3>
        </div>
        <span class="pill {PILL[s['status']]}">{s['status']}</span>
      </header>
      <p class="q">{s['q']}</p>
      <p class="ans">{COPY[s['key']]}</p>
      <table>
        <colgroup><col class="c1"/><col class="c2"/><col class="c3"/><col class="c4"/></colgroup>
        <thead><tr><th></th><th>Last 10d</th><th>Prior</th><th>Change</th></tr></thead>
        <tbody>{''.join(s['rows'])}</tbody>
      </table>
      <details><summary>Details</summary><ul>{det}</ul></details>
    </article>"""

actions = "".join(
    f'<li><span class="n">{i}</span><div><b>{t}</b><span>{why}</span></div></li>'
    for i, (t, why) in enumerate(COPY["actions"], 1))

# Plain-English versions of LAST-RUN concurrent_changes / blockers (no customer names)
CHANGES = [
    ("Oct 7", "Stripe decline and Affirm-fail alerts went live."),
    ("Oct 6", "YouTube editing ramp started (Ashutosh + two backup editors). Too early to show in traffic."),
    ("Ongoing", "Google Ads: Brands is close to 'limited by budget', some ads disapproved, and Display remarketing clicks jumped."),
]
GAPS = [
    "CallRail is signed out, so call counts by source are missing.",
    "RingCentral's Zapier link is stale, so answer and abandon rates are missing.",
    "YouTube Studio didn't load, so watch hours are missing.",
    "Google Ads only records about 1 conversion per 10 days.",
    "GA4 Direct, Unassigned and Display traffic is junk-flagged. Only Paid and Organic Search are used.",
]
changes = "".join(f"<li><b>{a}</b> · {b}</li>" for a, b in CHANGES)
gaps = "".join(f"<li>{g}</li>" for g in GAPS)

PAGE = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="emc-funnel-version" content="{VERSION}"/>
<title>EMC Funnel · {last_w}</title>
<style>
  :root {{
    --bg:#f7f7f5; --card:#fff; --ink:#111; --muted:#6b6b6b; --line:#e7e7e4;
    --accent:#2a5bd7;
  }}
  * {{ box-sizing:border-box; }}
  html {{ -webkit-text-size-adjust:100%; }}
  body {{ margin:0; background:var(--bg); color:var(--ink);
    font-family:Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size:16px; line-height:1.5; }}
  .wrap {{ max-width:1080px; margin:0 auto; padding:40px 24px 72px; }}
  .top {{ display:flex; justify-content:space-between; align-items:baseline; gap:16px; flex-wrap:wrap;
    color:var(--muted); font-size:14px; }}
  .top b {{ color:var(--ink); font-weight:600; }}
  .hero {{ margin:28px 0 36px; }}
  .eyebrow {{ margin:0 0 8px; font-size:13px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); }}
  h1 {{ margin:0; font-size:52px; line-height:1.05; letter-spacing:-.03em; font-weight:700; }}
  .story {{ margin:16px 0 0; font-size:22px; line-height:1.45; max-width:760px; color:#2b2b2b; }}
  .story b {{ color:var(--ink); }}
  h2 {{ margin:0 0 14px; font-size:13px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); }}
  ol.actions {{ list-style:none; margin:0 0 44px; padding:0; display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }}
  ol.actions li {{ display:flex; gap:14px; background:var(--card); border:1px solid var(--line); border-radius:14px; padding:18px; }}
  ol.actions .n {{ flex:none; width:28px; height:28px; border-radius:50%; background:var(--accent); color:#fff;
    font-size:14px; font-weight:700; display:grid; place-items:center; }}
  ol.actions b {{ display:block; font-size:16px; line-height:1.35; margin-bottom:4px; }}
  ol.actions span {{ color:var(--muted); font-size:14px; line-height:1.45; }}
  .grid {{ display:grid; grid-template-columns:1fr 1fr; gap:16px; }}
  .card {{ background:var(--card); border:1px solid var(--line); border-radius:14px; padding:22px 22px 14px; }}
  .card header {{ display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }}
  .tag {{ margin:0; font-size:12px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); }}
  h3 {{ margin:2px 0 0; font-size:22px; letter-spacing:-.02em; }}
  .q {{ margin:4px 0 0; color:var(--muted); font-size:14px; }}
  .ans {{ margin:12px 0 16px; font-size:16px; line-height:1.45; }}
  .pill {{ font-size:13px; font-weight:600; padding:4px 12px; border-radius:999px; white-space:nowrap; }}
  .pill::before {{ content:""; display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:6px; vertical-align:1px; background:currentColor; }}
  .pill.green {{ background:#e8f5ec; color:#1d7a3e; }}
  .pill.yellow {{ background:#fdf3d8; color:#8a6100; }}
  .pill.red {{ background:#fde8e8; color:#b42318; }}
  .pill.unknown {{ background:#efefed; color:#5c5c5c; }}
  table {{ width:100%; table-layout:fixed; border-collapse:collapse; font-variant-numeric:tabular-nums; font-size:15px; }}
  col.c1 {{ width:44%; }} col.c2 {{ width:20%; }} col.c3 {{ width:16%; }} col.c4 {{ width:20%; }}
  thead th {{ font-size:12px; font-weight:500; color:var(--muted); text-align:right; padding:0 0 6px; }}
  tbody th {{ text-align:left; font-weight:400; color:#333; padding:9px 8px 9px 0; border-top:1px solid var(--line); }}
  td {{ text-align:right; padding:9px 0 9px 10px; border-top:1px solid var(--line); white-space:nowrap; }}
  td.v {{ font-weight:600; }}
  td.p, td.c {{ color:var(--muted); }}
  .na {{ font-style:italic; }}
  details {{ margin-top:10px; border-top:1px solid var(--line); }}
  summary {{ cursor:pointer; padding:10px 0 4px; font-size:14px; font-weight:600; color:var(--accent); list-style:none; }}
  summary::-webkit-details-marker {{ display:none; }}
  summary::after {{ content:" +"; }}
  details[open] summary::after {{ content:" –"; }}
  details ul {{ margin:6px 0 8px; padding-left:18px; color:#3a3a3a; font-size:14px; line-height:1.5; }}
  details li {{ margin-bottom:6px; }}
  .more {{ margin-top:44px; display:grid; grid-template-columns:1fr 1fr; gap:16px; }}
  .more section {{ background:transparent; border-top:1px solid var(--line); padding-top:16px; }}
  .more ul {{ margin:0; padding-left:18px; color:#3a3a3a; font-size:14px; line-height:1.55; }}
  .more li {{ margin-bottom:6px; }}
  footer {{ margin-top:40px; color:var(--muted); font-size:13px; line-height:1.6; }}
  footer a {{ color:var(--accent); }}
  @media (max-width:860px) {{
    ol.actions, .grid, .more {{ grid-template-columns:1fr; }}
  }}
  @media (max-width:520px) {{
    .wrap {{ padding:24px 16px 56px; }}
    h1 {{ font-size:38px; }}
    .story {{ font-size:18px; }}
    .hero {{ margin:20px 0 28px; }}
    .card {{ padding:18px 16px 10px; }}
    table {{ font-size:14px; }}
    col.c1 {{ width:52%; }} col.c2 {{ width:26%; }} col.c3 {{ width:22%; }} col.c4 {{ width:0; }}
    thead th:nth-child(4), td.c {{ display:none; }}
    ol.actions {{ margin-bottom:36px; }}
  }}
</style>
</head>
<body>
<main class="wrap">
  <div class="top">
    <span><b>EMC Funnel</b> · 10-day check</span>
    <span>Last 10 days <b>{last_w}</b> vs prior {prior_w}</span>
  </div>

  <section class="hero">
    <p class="eyebrow">Is there a leak?</p>
    <h1>{COPY['headline']}</h1>
    <p class="story">{COPY['story']}</p>
  </section>

  <h2>Do these 3 things</h2>
  <ol class="actions">{actions}</ol>

  <h2>By stage</h2>
  <div class="grid">{''.join(stage_html(s) for s in STAGES)}</div>

  <div class="more">
    <section>
      <h2>What changed this window</h2>
      <ul>{changes}</ul>
    </section>
    <section>
      <h2>Data gaps</h2>
      <ul>{gaps}</ul>
    </section>
  </div>

  <footer>
    Updated {run_on} · Last 10d {last_w} · Prior {prior_w} · Last year {yoy_w} (Ads and sales only).
    Sales and payments come from the Business Checklist, traffic from Google Ads and GA4. Ads "conversions" are not the source of truth.
    Pills: Green = healthy · Yellow = watch · Red = leak · Unknown = couldn't measure.
    · <a href="https://docs.google.com/document/d/1rYekaYPpaQG6u83GS2DtrXguzEG2BXEvil_9eXlUc4Q/edit" target="_blank" rel="noopener">EMC Planner</a>
    · version {VERSION}
  </footer>
</main>
</body>
</html>
"""

for name in ("dashboard.html", "index.html"):
    (HERE / name).write_text(PAGE)
print("wrote dashboard.html + index.html", VERSION)
