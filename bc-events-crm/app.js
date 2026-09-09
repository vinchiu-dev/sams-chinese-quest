/* Blue Coast Events CRM — channels, revenue by source, FO notes (localStorage) */
(function () {
  const LS_KEY = "bc-events-crm-overlay-v1";

  const stageMeta = {
    new_inquiry: { label: "New inquiry", open: true },
    contacted: { label: "Contacted", open: true },
    quoted: { label: "Quoted", open: true },
    site_visit_negotiation: { label: "Site visit / Negotiation", open: true },
    won: { label: "Won", open: false },
    lost: { label: "Lost", open: false },
  };

  const CHANNEL_SHORT = {
    "Google Ads": "Google Ads",
    "Google Organic": "Google Org",
    "FB Ads": "FB Ads",
    "FB Organic": "FB Org",
    TikTok: "TikTok",
    "Website form (unknown)": "Web form",
    "Gov RFQ / email": "Gov/email",
    Messenger: "Messenger",
    "Walk-in / other": "Other",
  };

  let baseLeads = [];
  let stages = [];
  let channels = [];
  let overlay = loadOverlay();
  let activeId = null;
  let channelFilter = "all";
  let statusFilter = "open";

  function loadOverlay() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveOverlay() {
    localStorage.setItem(LS_KEY, JSON.stringify(overlay));
  }

  function mergedLead(base) {
    const o = overlay[base.id] || {};
    return {
      ...base,
      stage: o.stage || base.stage,
      fo_notes: o.fo_notes != null ? o.fo_notes : base.fo_notes || "",
      lost_reason: o.lost_reason != null ? o.lost_reason : base.lost_reason || "",
      marketing_channel: o.marketing_channel || base.marketing_channel || "Walk-in / other",
      revenue_php: o.revenue_php != null ? o.revenue_php : base.revenue_php,
      last_updated: o.last_updated || base.last_updated,
    };
  }

  function allLeads() {
    return baseLeads.map(mergedLead);
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatContact(lead) {
    const parts = [];
    if (lead.email) parts.push(lead.email);
    if (lead.phone) parts.push(lead.phone);
    return parts.join(" · ") || "—";
  }

  function displayName(lead) {
    if (lead.org && lead.name && lead.name !== lead.org) {
      return { title: lead.name, sub: lead.org };
    }
    return {
      title: lead.name || lead.org || "Unknown",
      sub: lead.org && lead.name === lead.org ? "" : lead.org || "",
    };
  }

  function formatPhp(n) {
    if (n == null || n === "" || Number.isNaN(Number(n))) return "₱0";
    return "₱" + Number(n).toLocaleString("en-PH", { maximumFractionDigits: 0 });
  }

  function matchesFilters(lead) {
    if (channelFilter !== "all" && lead.marketing_channel !== channelFilter) return false;
    const open = stageMeta[lead.stage]?.open;
    if (statusFilter === "open" && !open) return false;
    if (statusFilter === "won" && lead.stage !== "won") return false;
    if (statusFilter === "lost" && lead.stage !== "lost") return false;
    return true;
  }

  function revenueByChannel(leads) {
    const map = {};
    channels.forEach((ch) => {
      map[ch] = { channel: ch, won_count: 0, revenue_php: 0 };
    });
    leads.forEach((l) => {
      if (l.stage !== "won") return;
      const ch = l.marketing_channel || "Walk-in / other";
      if (!map[ch]) map[ch] = { channel: ch, won_count: 0, revenue_php: 0 };
      map[ch].won_count += 1;
      map[ch].revenue_php += Number(l.revenue_php) || 0;
    });
    return channels.map((ch) => map[ch]).filter(Boolean);
  }

  const CHART_COLORS = [
    "#1E71A7",
    "#3d8fbf",
    "#5aa3cc",
    "#2f6f8f",
    "#7ab3d4",
    "#154a6e",
    "#4d9bbb",
    "#86c0dc",
    "#0f3d5c",
  ];

  function polarToCartesian(cx, cy, r, angleDeg) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function donutSlice(cx, cy, rOuter, rInner, startAngle, endAngle) {
    if (endAngle - startAngle <= 0.001) return "";
    const large = endAngle - startAngle > 180 ? 1 : 0;
    const so = polarToCartesian(cx, cy, rOuter, endAngle);
    const eo = polarToCartesian(cx, cy, rOuter, startAngle);
    const si = polarToCartesian(cx, cy, rInner, endAngle);
    const ei = polarToCartesian(cx, cy, rInner, startAngle);
    return `M ${so.x} ${so.y} A ${rOuter} ${rOuter} 0 ${large} 0 ${eo.x} ${eo.y} L ${ei.x} ${ei.y} A ${rInner} ${rInner} 0 ${large} 1 ${si.x} ${si.y} Z`;
  }

  function renderRevenue() {
    const rows = revenueByChannel(allLeads());
    const totalRev = rows.reduce((s, r) => s + r.revenue_php, 0);
    const totalWon = rows.reduce((s, r) => s + r.won_count, 0);
    const hasData = totalRev > 0 || totalWon > 0;
    const maxRev = Math.max(1, ...rows.map((r) => r.revenue_php));

    document.getElementById("rev-total").textContent = `${formatPhp(totalRev)} · ${totalWon} won`;
    document.getElementById("rev-donut-big").textContent = formatPhp(totalRev);
    document.getElementById("rev-donut-sub").textContent = `${totalWon} won`;

    const hint = document.getElementById("rev-hint");
    hint.hidden = hasData && totalRev > 0;
    if (!hasData || totalRev === 0) {
      hint.textContent = "Add revenue on Won leads to populate.";
      hint.hidden = false;
    }

    const legend = document.getElementById("rev-legend");
    legend.innerHTML = rows
      .map((r, i) => {
        const short = CHANNEL_SHORT[r.channel] || r.channel;
        const color = CHART_COLORS[i % CHART_COLORS.length];
        return `<div class="rev-leg-item" title="${escapeHtml(r.channel)}">
          <span class="rev-swatch" style="background:${color}"></span>
          <span class="rev-leg-name">${escapeHtml(short)}</span>
          <span class="rev-leg-meta">${formatPhp(r.revenue_php)} · ${r.won_count}</span>
        </div>`;
      })
      .join("");

    const svg = document.getElementById("rev-donut");
    const cx = 60;
    const cy = 60;
    const rOuter = 52;
    const rInner = 34;
    let slices = "";
    if (totalRev > 0) {
      let angle = 0;
      rows.forEach((r, i) => {
        if (!r.revenue_php) return;
        const sweep = (r.revenue_php / totalRev) * 360;
        const end = angle + sweep;
        const d = donutSlice(cx, cy, rOuter, rInner, angle, end);
        const color = CHART_COLORS[i % CHART_COLORS.length];
        slices += `<path d="${d}" fill="${color}"></path>`;
        angle = end;
      });
    } else {
      // Empty-state ring at zero — honest ₱0 / no wins visual
      slices = `<circle cx="${cx}" cy="${cy}" r="${(rOuter + rInner) / 2}" fill="none" stroke="#d5dee6" stroke-width="${rOuter - rInner}"></circle>`;
      // Tiny tick marks for axes feel
      for (let i = 0; i < 8; i++) {
        const a = i * 45;
        const p1 = polarToCartesian(cx, cy, rOuter + 1, a);
        const p2 = polarToCartesian(cx, cy, rOuter + 5, a);
        slices += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#c5d0da" stroke-width="1.5"/>`;
      }
    }
    svg.innerHTML = slices;

    const bars = document.getElementById("rev-bars");
    bars.innerHTML = rows
      .map((r, i) => {
        const short = CHANNEL_SHORT[r.channel] || r.channel;
        const pct = totalRev > 0 ? Math.round((r.revenue_php / maxRev) * 100) : 0;
        const color = CHART_COLORS[i % CHART_COLORS.length];
        const w = r.revenue_php > 0 ? Math.max(pct, 3) : 0;
        return `<div class="rev-bar-row" title="${escapeHtml(r.channel)}">
          <span class="rev-bar-label">${escapeHtml(short)}</span>
          <div class="rev-bar-track"><div class="rev-bar-fill" style="width:${w}%;background:${color}"></div></div>
          <span class="rev-bar-meta"><strong>${formatPhp(r.revenue_php)}</strong> · ${r.won_count}</span>
        </div>`;
      })
      .join("");
  }

  function renderChips() {
    const leads = allLeads();
    const counts = {};
    leads.forEach((l) => {
      counts[l.marketing_channel] = (counts[l.marketing_channel] || 0) + 1;
    });
    const wrap = document.getElementById("channel-chips");
    const chips = [
      { id: "all", label: "All", n: leads.length },
      ...channels.map((ch) => ({ id: ch, label: CHANNEL_SHORT[ch] || ch, n: counts[ch] || 0 })),
    ];
    wrap.innerHTML = chips
      .map(
        (c) =>
          `<button type="button" class="chip${channelFilter === c.id ? " active" : ""}" data-channel="${escapeHtml(c.id)}">${escapeHtml(c.label)} <span>${c.n}</span></button>`
      )
      .join("");
    wrap.querySelectorAll(".chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        channelFilter = btn.dataset.channel;
        render();
      });
    });
  }

  function render() {
    const leads = allLeads();
    const filtered = leads.filter(matchesFilters);
    document.getElementById("lead-count").textContent = `${filtered.length} of ${leads.length} leads`;
    renderRevenue();
    renderChips();

    const board = document.getElementById("board");
    board.innerHTML = stages
      .map((st) => {
        const colLeads = filtered.filter((l) => l.stage === st.id);
        return `
        <section class="column" data-stage="${st.id}">
          <header class="column-header">
            <h2>${escapeHtml(st.label)}</h2>
            <span class="col-count">${colLeads.length}</span>
          </header>
          <div class="column-body">
            ${colLeads.map(cardHtml).join("") || `<p class="empty">No leads</p>`}
          </div>
        </section>`;
      })
      .join("");

    board.querySelectorAll(".card").forEach((el) => {
      el.addEventListener("click", () => openDrawer(el.dataset.id));
    });
  }

  function cardHtml(lead) {
    const { title, sub } = displayName(lead);
    const dates = [lead.event_dates, lead.pax ? `${lead.pax} pax` : null].filter(Boolean).join(" · ");
    const notesPreview = (lead.fo_notes || "").trim();
    const ch = lead.marketing_channel || "Walk-in / other";
    const chShort = CHANNEL_SHORT[ch] || ch;
    const rev =
      lead.stage === "won" && lead.revenue_php != null && lead.revenue_php !== ""
        ? `<p class="card-rev">${formatPhp(lead.revenue_php)}</p>`
        : "";
    return `
      <article class="card" data-id="${escapeHtml(lead.id)}" tabindex="0" role="button">
        <div class="card-top">
          <span class="badge channel-badge" title="${escapeHtml(ch)}">${escapeHtml(chShort)}</span>
          <span class="badge source-badge">${escapeHtml(lead.source_badge || "Other")}</span>
        </div>
        <h3 class="card-title">${escapeHtml(title)}</h3>
        ${sub ? `<p class="card-org">${escapeHtml(sub)}</p>` : ""}
        ${dates ? `<p class="card-meta">${escapeHtml(dates)}</p>` : ""}
        <p class="card-contact">${escapeHtml(formatContact(lead))}</p>
        <p class="card-updated">Updated ${escapeHtml(lead.last_updated || "—")}</p>
        ${rev}
        ${notesPreview ? `<p class="card-fo-preview">FO: ${escapeHtml(notesPreview.slice(0, 80))}${notesPreview.length > 80 ? "…" : ""}</p>` : ""}
        ${lead.stage === "lost" && lead.lost_reason ? `<p class="card-lost">${escapeHtml(lead.lost_reason)}</p>` : ""}
      </article>`;
  }

  function openDrawer(id) {
    activeId = id;
    const lead = allLeads().find((l) => l.id === id);
    if (!lead) return;
    const { title, sub } = displayName(lead);

    document.getElementById("drawer-title").textContent = title;
    document.getElementById("drawer-sub").textContent = sub || lead.event_type || "";
    document.getElementById("drawer-contact").textContent = formatContact(lead);
    document.getElementById("drawer-dates").textContent =
      [lead.event_dates, lead.pax ? `${lead.pax} pax` : null, lead.inquiry_date ? `Inquiry ${lead.inquiry_date}` : null]
        .filter(Boolean)
        .join(" · ") || "—";
    document.getElementById("drawer-seed").textContent = lead.seed_notes || "—";
    document.getElementById("fo-notes").value = lead.fo_notes || "";
    document.getElementById("lost-reason").value = lead.lost_reason || "";
    document.getElementById("revenue-php").value =
      lead.revenue_php != null && lead.revenue_php !== "" ? lead.revenue_php : "";

    const stageSel = document.getElementById("stage-select");
    stageSel.innerHTML = stages
      .map((s) => `<option value="${s.id}" ${s.id === lead.stage ? "selected" : ""}>${escapeHtml(s.label)}</option>`)
      .join("");

    const chSel = document.getElementById("channel-select");
    chSel.innerHTML = channels
      .map(
        (c) =>
          `<option value="${escapeHtml(c)}" ${c === lead.marketing_channel ? "selected" : ""}>${escapeHtml(c)}</option>`
      )
      .join("");

    toggleLostReason(lead.stage);
    toggleRevenue(lead.stage);
    document.getElementById("drawer").classList.add("open");
    document.getElementById("backdrop").classList.add("open");
    document.body.classList.add("drawer-open");
  }

  function closeDrawer() {
    document.getElementById("drawer").classList.remove("open");
    document.getElementById("backdrop").classList.remove("open");
    document.body.classList.remove("drawer-open");
    activeId = null;
  }

  function toggleLostReason(stage) {
    document.getElementById("lost-reason-wrap").hidden = stage !== "lost";
  }

  function toggleRevenue(stage) {
    document.getElementById("revenue-wrap").hidden = stage !== "won";
  }

  function saveDrawer() {
    if (!activeId) return;
    const stage = document.getElementById("stage-select").value;
    const fo_notes = document.getElementById("fo-notes").value;
    const lost_reason = document.getElementById("lost-reason").value;
    const marketing_channel = document.getElementById("channel-select").value;
    const revRaw = document.getElementById("revenue-php").value.trim();
    let revenue_php = null;
    if (revRaw !== "") {
      const n = Number(String(revRaw).replace(/,/g, ""));
      revenue_php = Number.isFinite(n) ? n : null;
    }
    const today = new Date().toISOString().slice(0, 10);
    overlay[activeId] = {
      ...(overlay[activeId] || {}),
      stage,
      fo_notes,
      marketing_channel,
      lost_reason: stage === "lost" ? lost_reason : overlay[activeId]?.lost_reason || "",
      revenue_php: stage === "won" ? revenue_php : overlay[activeId]?.revenue_php ?? null,
      last_updated: today,
    };
    saveOverlay();
    const msg = document.getElementById("save-msg");
    msg.textContent = "Saved on this device";
    msg.hidden = false;
    setTimeout(() => {
      msg.hidden = true;
    }, 1800);
    render();
  }

  async function init() {
    const res = await fetch("leads.json?t=" + Date.now());
    const data = await res.json();
    baseLeads = data.leads || [];
    stages = data.stages || Object.keys(stageMeta).map((id) => ({ id, label: stageMeta[id].label }));
    channels = data.marketing_channels || Object.keys(CHANNEL_SHORT);
    document.getElementById("north-star").textContent = data.north_star || "YoY event sales growth";

    document.getElementById("filter-status").addEventListener("change", (e) => {
      statusFilter = e.target.value;
      render();
    });
    document.getElementById("btn-close").addEventListener("click", closeDrawer);
    document.getElementById("backdrop").addEventListener("click", closeDrawer);
    document.getElementById("btn-save").addEventListener("click", saveDrawer);
    document.getElementById("stage-select").addEventListener("change", (e) => {
      toggleLostReason(e.target.value);
      toggleRevenue(e.target.value);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDrawer();
    });

    render();
  }

  init().catch((err) => {
    document.getElementById("board").innerHTML =
      `<p class="error">Failed to load leads.json: ${escapeHtml(err.message)}</p>`;
  });
})();
