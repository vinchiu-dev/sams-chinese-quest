/* Blue Coast Events CRM — Sheet is multi-device source of truth; page is live view */
(function () {
  const LS_DRAFT_KEY = "bc-events-crm-draft-v2";
  const LS_ADDS_KEY = "bc-events-crm-adds-v1";

  const stageMeta = {
    new_inquiry: { label: "New inquiry", open: true },
    preparing_quote: { label: "Preparing quote", open: true },
    quoted: { label: "Quoted, to follow up", open: true },
    won: { label: "Won", open: false },
    lost: { label: "Lost", open: false },
  };

  /** Map legacy Sheet stages + auto-advance when FO/stay already replied or quoted. */
  function normalizeLeadStage(lead) {
    let stage = String(lead.stage || "new_inquiry").trim() || "new_inquiry";
    if (stage === "contacted") stage = "preparing_quote";
    if (stage === "site_visit_negotiation" || stage === "site_visit" || stage === "negotiation") {
      stage = "preparing_quote";
    }
    // Don't touch terminal
    if (stage === "won" || stage === "lost") return stage;

    const blob = `${lead.seed_notes || ""} ${lead.fo_notes || ""} ${lead.subject || ""}`;
    const quoteSent =
      /sent[^.]{0,80}(package rates|quote images|quote\b)|package rates pdf|hotel acknowledged.{0,40}sent quote/i.test(
        blob
      );
    const responded =
      /already (sent|called|replied)|angge[^.]{0,60}called|fo[^.]{0,80}(called|sent|replied)|stay@ already|details ask|replied that she already|sent the details/i.test(
        blob
      );

    if (quoteSent && (stage === "new_inquiry" || stage === "preparing_quote")) {
      return "quoted";
    }
    if (responded && stage === "new_inquiry") {
      return "preparing_quote";
    }
    return stage;
  }

  function leadSortKey(lead) {
    // Newest first: prefer inquiry_date, then last_updated
    const a = String(lead.inquiry_date || "").trim();
    const b = String(lead.last_updated || "").trim();
    return b > a ? b : a || "0000-00-00";
  }

  function sortLeadsNewestFirst(arr) {
    return [...arr].sort((x, y) => {
      const dy = leadSortKey(y);
      const dx = leadSortKey(x);
      if (dy !== dx) return dy < dx ? -1 : 1;
      return String(y.id).localeCompare(String(x.id));
    });
  }

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
  /** Optional this-session drafts only — cleared on Refresh from Sheet */
  let draftOverlay = loadDraft();
  let localAdds = loadAdds();
  let applyDrafts = false; // off by default so other devices aren't overridden
  let dataSource = "none";
  let activeId = null;
  let channelFilter = "all";
  let statusFilter = "open";
  let config = {
    fo_sheet_edit_url: "https://docs.google.com/spreadsheets/d/1jDADtI5y_HMxnBS4j-scUjF9NXePoK9ybOQM7Ud0f1Y/edit",
    fo_sheet_csv_url: "https://docs.google.com/spreadsheets/d/1jDADtI5y_HMxnBS4j-scUjF9NXePoK9ybOQM7Ud0f1Y/export?format=csv",
    fo_sheet_write_url: "",
    synced_ledger_csv: "synced-ledger.csv",
  };

  function loadDraft() {
    try {
      return JSON.parse(localStorage.getItem(LS_DRAFT_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveDraft() {
    localStorage.setItem(LS_DRAFT_KEY, JSON.stringify(draftOverlay));
  }

  function loadAdds() {
    try {
      const a = JSON.parse(localStorage.getItem(LS_ADDS_KEY) || "[]");
      return Array.isArray(a) ? a : [];
    } catch {
      return [];
    }
  }

  function saveAdds() {
    localStorage.setItem(LS_ADDS_KEY, JSON.stringify(localAdds));
  }

  function newLeadId() {
    const hex = Array.from(crypto.getRandomValues(new Uint8Array(7)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return "1a" + hex.slice(0, 14);
  }

  function showToast(msg) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.classList.remove("show"), 3200);
  }

  function leadToSheetRow(lead) {
    const cells = [
      lead.id,
      lead.name || "",
      lead.org || "",
      lead.stage || "new_inquiry",
      lead.marketing_channel || "Walk-in / other",
      lead.inquiry_date || "",
      lead.event_dates || "",
      lead.pax || "",
      lead.email || "",
      lead.phone || "",
      lead.revenue_php != null && lead.revenue_php !== "" ? lead.revenue_php : "",
      lead.lost_reason || "",
      lead.fo_notes || "",
      lead.seed_notes || "",
      lead.source || "manual add",
      lead.source_badge || "Other",
      lead.event_type || "",
      lead.subject || "",
      lead.last_updated || "",
      lead.editor || "fo-add",
    ];
    return cells.map((c) => {
      const s = String(c == null ? "" : c);
      if (/[\t\n\r"]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    }).join("\t");
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  function clearDrafts() {
    draftOverlay = {};
    localStorage.removeItem(LS_DRAFT_KEY);
    // also clear legacy overlay so it cannot resurrect
    try {
      localStorage.removeItem("bc-events-crm-overlay-v1");
    } catch {}
    applyDrafts = false;
  }

  function mergedLead(base) {
    if (!applyDrafts) return { ...base };
    const o = draftOverlay[base.id] || {};
    return {
      ...base,
      stage: o.stage || base.stage,
      fo_notes: o.fo_notes != null ? o.fo_notes : base.fo_notes || "",
      lost_reason: o.lost_reason != null ? o.lost_reason : base.lost_reason || "",
      marketing_channel: o.marketing_channel || base.marketing_channel || "Walk-in / other",
      revenue_php: Object.prototype.hasOwnProperty.call(o, "revenue_php") ? o.revenue_php : base.revenue_php,
      last_updated: o.last_updated || base.last_updated,
    };
  }

  function allLeads() {
    const byId = new Map();
    for (const l of baseLeads) byId.set(l.id, l);
    for (const l of localAdds) byId.set(l.id, { ...(byId.get(l.id) || {}), ...l });
    return [...byId.values()].map((l) => {
      const m = mergedLead(l);
      return { ...m, stage: normalizeLeadStage(m) };
    });
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
    "#1E71A7", "#3d8fbf", "#5aa3cc", "#2f6f8f", "#7ab3d4",
    "#154a6e", "#4d9bbb", "#86c0dc", "#0f3d5c",
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

  const REV_OPEN_KEY = "bc-crm-rev-open";

  function applyRevOpen(open) {
    const panel = document.getElementById("insights-panel");
    const btn = document.getElementById("rev-toggle");
    if (!panel || !btn) return;
    panel.classList.toggle("is-open", !!open);
    panel.setAttribute("aria-hidden", open ? "false" : "true");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      renderRevenue();
      renderInsights();
      document.getElementById("insights-close")?.focus();
    }
  }

  function initRevCollapse() {
    const btn = document.getElementById("rev-toggle");
    const panel = document.getElementById("insights-panel");
    const closeBtn = document.getElementById("insights-close");
    if (!btn || !panel || btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";
    applyRevOpen(false);
    const openInsights = () => applyRevOpen(true);
    const closeInsights = () => applyRevOpen(false);
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const next = !panel.classList.contains("is-open");
      applyRevOpen(next);
    });
    closeBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      closeInsights();
    });
    panel.addEventListener("click", (e) => {
      if (e.target === panel) closeInsights();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && panel.classList.contains("is-open")) {
        closeInsights();
      }
    });
  }

  function normalizeLostReason(raw) {
    const t = String(raw || "").trim().replace(/\s+/g, " ");
    if (!t) return "Unspecified";
    const s = t.length > 48 ? t.slice(0, 45) + "…" : t;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function lostReasonSummary(leads) {
    const counts = {};
    leads.filter((l) => l.stage === "lost").forEach((l) => {
      const key = normalizeLostReason(l.lost_reason);
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([reason, n]) => ({ reason, n }));
  }

  function sourceInquirySummary(leads) {
    const counts = {};
    leads.forEach((l) => {
      const ch = l.marketing_channel || "Walk-in / other";
      counts[ch] = (counts[ch] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([channel, n]) => ({ channel, n }));
  }

  function renderInsights() {
    const leads = allLeads();
    const srcEl = document.getElementById("source-insight");
    const lostEl = document.getElementById("lost-insight");
    if (!srcEl || !lostEl) return;

    const sources = sourceInquirySummary(leads).slice(0, 8);
    if (!sources.length) {
      srcEl.textContent = "No leads yet.";
      srcEl.classList.add("lost-summary-empty");
    } else {
      srcEl.classList.remove("lost-summary-empty");
      srcEl.textContent = sources
        .map((s) => `${CHANNEL_SHORT[s.channel] || s.channel} ${s.n}`)
        .join(" · ");
    }

    const lost = lostReasonSummary(leads).slice(0, 8);
    const lostTotal = leads.filter((l) => l.stage === "lost").length;
    if (!lostTotal) {
      lostEl.innerHTML = '<li class="lost-summary-empty" style="display:block;border:0">None yet — fill Reason it was lost when you mark Lost.</li>';
    } else {
      lostEl.innerHTML = lost
        .map(
          (r) =>
            `<li><span>${escapeHtml(r.reason)}</span><span class="n">${r.n}</span></li>`
        )
        .join("");
    }
  }

  function renderRevenue() {
    const rows = revenueByChannel(allLeads());
    const totalRev = rows.reduce((s, r) => s + r.revenue_php, 0);
    const totalWon = rows.reduce((s, r) => s + r.won_count, 0);
    const hasData = totalRev > 0 || totalWon > 0;

    document.getElementById("rev-total").textContent = `${formatPhp(totalRev)} · ${totalWon} won`;
    document.getElementById("rev-donut-big").textContent = formatPhp(totalRev);
    document.getElementById("rev-donut-sub").textContent = `${totalWon} won`;

    // Compact legend: only channels with won revenue or won count
    const legend = document.getElementById("rev-legend");
    const legendRows = rows.filter((r) => r.revenue_php > 0 || r.won_count > 0);
    const showRows = legendRows.length ? legendRows : rows.slice(0, 4);
    legend.innerHTML = showRows
      .map((r) => {
        const i = rows.indexOf(r);
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
    const cx = 60, cy = 60, rOuter = 52, rInner = 34;
    let slices = "";
    if (totalRev > 0) {
      let angle = 0;
      rows.forEach((r, i) => {
        if (!r.revenue_php) return;
        const sweep = (r.revenue_php / totalRev) * 360;
        const end = angle + sweep;
        const d = donutSlice(cx, cy, rOuter, rInner, angle, end);
        slices += `<path d="${d}" fill="${CHART_COLORS[i % CHART_COLORS.length]}"></path>`;
        angle = end;
      });
    } else {
      slices = `<circle cx="${cx}" cy="${cy}" r="${(rOuter + rInner) / 2}" fill="none" stroke="#d5dee6" stroke-width="${rOuter - rInner}"></circle>`;
      for (let i = 0; i < 8; i++) {
        const a = i * 45;
        const p1 = polarToCartesian(cx, cy, rOuter + 1, a);
        const p2 = polarToCartesian(cx, cy, rOuter + 5, a);
        slices += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#c5d0da" stroke-width="1.5"/>`;
      }
    }
    svg.innerHTML = slices;

  }

  function renderChips() {
    const wrap = document.getElementById("channel-chips");
    if (!wrap) return;
    const leads = allLeads();
    const counts = {};
    leads.forEach((l) => {
      counts[l.marketing_channel] = (counts[l.marketing_channel] || 0) + 1;
    });
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


  function moveLeadToStage(id, stage) {
    const lead = allLeads().find((l) => l.id === id);
    if (stage === "contacted") stage = "preparing_quote";
    if (stage === "site_visit_negotiation" || stage === "site_visit" || stage === "negotiation") stage = "preparing_quote";
    if (!lead || !stage || lead.stage === stage) return false;
    const today = new Date().toISOString().slice(0, 10);
    draftOverlay[id] = {
      ...(draftOverlay[id] || {}),
      stage,
      last_updated: today,
    };
    saveDraft();
    applyDrafts = true;
    showToast("Local draft only — copy into Shared Sheet for all devices.");
    updateBanner();
    render();
    return true;
  }

  function bindBoardDnD(board) {
    let pointerDrag = null;

    function clearDragOver() {
      board.querySelectorAll(".column.drag-over").forEach((c) => c.classList.remove("drag-over"));
    }

    function columnAtPoint(x, y) {
      const el = document.elementFromPoint(x, y);
      return el ? el.closest(".column") : null;
    }

    function endPointerDrag(x, y) {
      if (!pointerDrag) return;
      const { id, card, handle } = pointerDrag;
      try {
        handle.releasePointerCapture(pointerDrag.pointerId);
      } catch {}
      card.classList.remove("dragging");
      const col = columnAtPoint(x, y);
      clearDragOver();
      pointerDrag = null;
      if (col && col.dataset.stage) moveLeadToStage(id, col.dataset.stage);
    }

    board.querySelectorAll(".card").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest(".card-drag-handle")) return;
        if (card.dataset.suppressClick === "1") {
          delete card.dataset.suppressClick;
          return;
        }
        openDrawer(card.dataset.id);
      });
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openDrawer(card.dataset.id);
        }
      });
    });

    board.querySelectorAll(".card-drag-handle").forEach((handle) => {
      handle.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });

      // HTML5 DnD (desktop)
      handle.addEventListener("dragstart", (e) => {
        const card = handle.closest(".card");
        if (!card) return;
        const id = card.dataset.id;
        e.dataTransfer.setData("text/plain", id);
        e.dataTransfer.setData("application/x-bc-lead-id", id);
        e.dataTransfer.effectAllowed = "move";
        card.classList.add("dragging");
      });
      handle.addEventListener("dragend", () => {
        board.querySelectorAll(".card.dragging").forEach((c) => c.classList.remove("dragging"));
        clearDragOver();
      });

      // Pointer fallback (touch / when HTML5 DnD is weak)
      handle.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        // Prefer native HTML5 DnD for mouse; use pointer path for touch/pen
        if (e.pointerType === "mouse") return;
        const card = handle.closest(".card");
        if (!card) return;
        e.preventDefault();
        e.stopPropagation();
        pointerDrag = {
          id: card.dataset.id,
          card,
          handle,
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          moved: false,
        };
        handle.setPointerCapture(e.pointerId);
        card.classList.add("dragging");
      });
      handle.addEventListener("pointermove", (e) => {
        if (!pointerDrag || pointerDrag.pointerId !== e.pointerId) return;
        const dx = e.clientX - pointerDrag.startX;
        const dy = e.clientY - pointerDrag.startY;
        if (!pointerDrag.moved && dx * dx + dy * dy > 36) {
          pointerDrag.moved = true;
          pointerDrag.card.dataset.suppressClick = "1";
        }
        clearDragOver();
        const col = columnAtPoint(e.clientX, e.clientY);
        if (col) col.classList.add("drag-over");
      });
      handle.addEventListener("pointerup", (e) => {
        if (!pointerDrag || pointerDrag.pointerId !== e.pointerId) return;
        endPointerDrag(e.clientX, e.clientY);
      });
      handle.addEventListener("pointercancel", (e) => {
        if (!pointerDrag || pointerDrag.pointerId !== e.pointerId) return;
        pointerDrag.card.classList.remove("dragging");
        clearDragOver();
        pointerDrag = null;
      });
    });

    board.querySelectorAll(".column").forEach((col) => {
      col.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        col.classList.add("drag-over");
      });
      col.addEventListener("dragleave", (e) => {
        if (!col.contains(e.relatedTarget)) col.classList.remove("drag-over");
      });
      col.addEventListener("drop", (e) => {
        e.preventDefault();
        col.classList.remove("drag-over");
        const id =
          e.dataTransfer.getData("application/x-bc-lead-id") || e.dataTransfer.getData("text/plain");
        const stage = col.dataset.stage;
        if (id && stage) moveLeadToStage(id, stage);
      });
    });
  }

  function render() {
    const leads = allLeads();
    const filtered = leads.filter(matchesFilters);
    const leadCountEl = document.getElementById("lead-count");
    if (leadCountEl) leadCountEl.textContent = `${filtered.length} of ${leads.length} leads`;
    renderRevenue();
    renderChips();

    const board = document.getElementById("board");
    board.innerHTML = stages
      .map((st) => {
        const colLeads = sortLeadsNewestFirst(filtered.filter((l) => l.stage === st.id));
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

    bindBoardDnD(board);
  }

  function normalizeWebLabel(s) {
    const t = String(s || "").trim().toLowerCase();
    if (!t) return "";
    if (/^(web\s*form|website|form|website form)/.test(t) || t.includes("website form")) return "Web form";
    return "";
  }

  /** One card tag only — channel for pie, unless channel is generic Other and source is specific. */
  function cardTag(lead) {
    const ch = lead.marketing_channel || "Walk-in / other";
    const chShort = CHANNEL_SHORT[ch] || ch;
    const src = String(lead.source_badge || "").trim();
    const webFromCh = normalizeWebLabel(ch) || normalizeWebLabel(chShort);
    const webFromSrc = normalizeWebLabel(src);
    if (webFromCh || webFromSrc) return "Web form";
    if ((ch === "Walk-in / other" || chShort === "Other") && src && !/^(other|unknown)$/i.test(src)) {
      return src;
    }
    if (src && src.toLowerCase() === chShort.toLowerCase()) return chShort;
    // Drop redundant Form/Website/Email-as-Other pairs — channel wins for attribution
    return chShort;
  }

  function cardHtml(lead) {
    const { title } = displayName(lead);
    const hasRev =
      lead.revenue_php != null && lead.revenue_php !== "" && Number(lead.revenue_php) > 0;
    const revLine = hasRev
      ? `<p class="card-rev">${formatPhp(lead.revenue_php)}</p>`
      : `<p class="card-rev is-empty">Amount TBD</p>`;
    return `
      <article class="card card-compact" data-id="${escapeHtml(lead.id)}" tabindex="0" role="button">
        <span class="card-drag-handle" draggable="true" role="button" tabindex="-1" aria-label="Drag to change status" title="Drag to move status">⋮⋮</span>
        <h3 class="card-title">${escapeHtml(title)}</h3>
        ${revLine}
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
    const wrap = document.getElementById("revenue-wrap");
    if (wrap) wrap.hidden = false;
    const hint = document.getElementById("revenue-hint");
    if (hint) hint.hidden = true;
  }

  async function saveDrawer() {
    if (!activeId) return;
    const stage = document.getElementById("stage-select").value;
    const fo_notes = document.getElementById("fo-notes").value;
    const lost_reason = document.getElementById("lost-reason").value;
    if (stage === "lost" && !String(lost_reason || "").trim()) {
      showToast("Add a reason it was lost — feeds the Why lost summary");
      document.getElementById("lost-reason")?.focus();
      return;
    }
    const marketing_channel = document.getElementById("channel-select").value;
    const revRaw = document.getElementById("revenue-php").value.trim();
    let revenue_php = null;
    if (revRaw !== "") {
      const n = Number(String(revRaw).replace(/,/g, ""));
      revenue_php = Number.isFinite(n) ? n : null;
    }
    const today = new Date().toISOString().slice(0, 10);
    const lostOut = stage === "lost" ? lost_reason : draftOverlay[activeId]?.lost_reason || "";
    // Keep amount at any stage so FO can enter early; pie only counts Won.
    const revOut = revenue_php;
    draftOverlay[activeId] = {
      ...(draftOverlay[activeId] || {}),
      stage,
      fo_notes,
      marketing_channel,
      lost_reason: lostOut,
      revenue_php: revOut,
      last_updated: today,
    };
    saveDraft();
    applyDrafts = true;
    const msg = document.getElementById("save-msg");
    render();

    const writeUrl = String(config.fo_sheet_write_url || "").trim();
    const sheetEdit = config.fo_sheet_edit_url || "#";

    function flashSaveMsg(text, ms) {
      msg.textContent = text;
      msg.hidden = false;
      setTimeout(() => {
        msg.hidden = true;
      }, ms || 3600);
    }

    if (!writeUrl) {
      flashSaveMsg("Local draft only — copy into Shared Sheet for all devices.");
      showToast("Local draft only — open Shared Sheet to sync for all devices.");
      return;
    }

    const lead = allLeads().find((l) => l.id === activeId);
    const payload = {
      lead_id: activeId,
      stage,
      marketing_channel,
      fo_notes,
      revenue_php: revOut,
      lost_reason: lostOut,
      last_updated: today,
      editor: "drawer",
    };
    if (lead) {
      if (lead.name) payload.name = lead.name;
      if (lead.org) payload.org = lead.org;
    }

    try {
      // text/plain avoids Apps Script CORS preflight; body is still JSON
      const res = await fetch(writeUrl, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      if (!data.ok) throw new Error(data.error || "writeback rejected");
      flashSaveMsg("Synced to Shared Sheet for all devices.");
      showToast("Synced to Shared Sheet — refreshing…");
      await refreshFromSheet();
    } catch (err) {
      flashSaveMsg("Local draft only (Sheet sync failed). Open Shared Sheet to copy.", 5000);
      showToast("Sheet sync failed — local draft only. Open Shared Sheet.");
      try {
        if (sheetEdit && sheetEdit !== "#") window.open(sheetEdit, "_blank", "noopener");
      } catch {}
    }
  }

  function parseCsv(text) {
    const rows = [];
    let i = 0;
    let field = "";
    let row = [];
    let inQuotes = false;
    const pushField = () => {
      row.push(field);
      field = "";
    };
    const pushRow = () => {
      if (row.length > 1 || (row.length === 1 && row[0] !== "")) rows.push(row);
      row = [];
    };
    while (i < text.length) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          }
          inQuotes = false;
          i++;
          continue;
        }
        field += c;
        i++;
        continue;
      }
      if (c === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (c === ",") {
        pushField();
        i++;
        continue;
      }
      if (c === "\n" || c === "\r") {
        pushField();
        pushRow();
        if (c === "\r" && text[i + 1] === "\n") i++;
        i++;
        continue;
      }
      field += c;
      i++;
    }
    if (field.length || row.length) {
      pushField();
      pushRow();
    }
    return rows;
  }

  function csvToLeads(rows) {
    if (!rows.length) return [];
    const headers = rows[0].map((h) => String(h || "").trim().toLowerCase());
    const idx = (name) => headers.indexOf(name);
    let idI = idx("lead_id") >= 0 ? idx("lead_id") : idx("id");
    // Sheet A1 sometimes overwritten with share URL — treat col0 as lead_id if needed
    if (idI < 0 && headers.length && headers[0].includes("docs.google.com")) {
      headers[0] = "lead_id";
      idI = 0;
    }
    if (idI < 0 && rows.length > 1 && /^[0-9a-f]{10,}$/i.test(String(rows[1][0] || "").trim())) {
      headers[0] = "lead_id";
      idI = 0;
    }
    if (idI < 0) return [];
    const get = (cells, name) => {
      const j = idx(name);
      return j >= 0 && cells[j] != null ? String(cells[j]) : "";
    };
    const out = [];
    for (let r = 1; r < rows.length; r++) {
      const cells = rows[r];
      const id = (cells[idI] || "").trim();
      if (!id) continue;
      const revRaw = get(cells, "revenue_php").trim();
      let revenue_php = null;
      if (revRaw !== "") {
        const n = Number(revRaw.replace(/,/g, ""));
        revenue_php = Number.isFinite(n) ? n : null;
      }
      out.push({
        id,
        name: get(cells, "name"),
        org: get(cells, "org"),
        email: get(cells, "email") || null,
        phone: get(cells, "phone") || null,
        source: get(cells, "source"),
        source_badge: get(cells, "source_badge") || "Other",
        inquiry_date: get(cells, "inquiry_date"),
        event_dates: get(cells, "event_dates"),
        pax: get(cells, "pax"),
        event_type: get(cells, "event_type"),
        stage: get(cells, "stage") || "new_inquiry", // normalized below
        marketing_channel: get(cells, "marketing_channel") || "Walk-in / other",
        revenue_php,
        fo_notes: get(cells, "fo_notes"),
        lost_reason: get(cells, "lost_reason"),
        seed_notes: get(cells, "seed_notes"),
        last_updated: get(cells, "last_updated"),
        subject: get(cells, "subject"),
      });
    }
    return out.map((lead) => ({ ...lead, stage: normalizeLeadStage(lead) }));
  }

  async function fetchText(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const text = await res.text();
    if (/^\s*<(!DOCTYPE|html)/i.test(text)) throw new Error("not-csv");
    return text;
  }

  async function loadLeadsFromRemote() {
    const tried = [];
    const candidates = [];
    if (config.fo_sheet_csv_url) candidates.push({ kind: "sheet", url: config.fo_sheet_csv_url });
    if (config.synced_ledger_csv) candidates.push({ kind: "mirror", url: config.synced_ledger_csv + "?t=" + Date.now() });

    for (const c of candidates) {
      try {
        const text = await fetchText(c.url);
        const leads = csvToLeads(parseCsv(text));
        if (!leads.length) throw new Error("empty");
        return { kind: c.kind, leads };
      } catch (e) {
        tried.push(c.kind + ":" + (e.message || e));
      }
    }
    return { kind: "json", leads: null, tried };
  }

  function updateBanner() {
    const el = document.getElementById("banner");
    if (!el) return;
    const sheetUrl = config.fo_sheet_edit_url || "#";
    const srcLabel =
      dataSource === "sheet"
        ? "live Shared Sheet"
        : dataSource === "mirror"
          ? "repo Sheet mirror (synced-ledger.csv)"
          : "leads.json fallback";
    const draftNote = applyDrafts
      ? ' <strong>Local drafts ON</strong> — click Refresh to prefer Sheet for all devices.'
      : "";
    el.innerHTML = `Source of truth: <a href="${escapeHtml(sheetUrl)}" target="_blank" rel="noopener">Shared Sheet</a> (edit there for every device). Page live view from <em>${escapeHtml(srcLabel)}</em>.${draftNote}
      <button type="button" class="banner-btn" id="btn-refresh-fo">Refresh from Sheet</button>
      <button type="button" class="banner-btn" id="btn-clear-draft">Clear local drafts</button>`;
    document.getElementById("btn-refresh-fo")?.addEventListener("click", () => refreshFromSheet());
    document.getElementById("btn-clear-draft")?.addEventListener("click", () => {
      clearDrafts();
      updateBanner();
      render();
    });
  }

  async function refreshFromSheet() {
    clearDrafts();
    const loaded = await loadLeadsFromRemote();
    if (loaded.leads) {
      baseLeads = loaded.leads.map((lead) => ({ ...lead, stage: normalizeLeadStage(lead) }));
      dataSource = loaded.kind;
      const sheetIds = new Set(baseLeads.map((l) => l.id));
      localAdds = localAdds.filter((l) => !sheetIds.has(l.id));
      saveAdds();
    } else {
      // keep current base; still cleared drafts
      dataSource = dataSource || "json";
    }
    updateBanner();
    render();
  }


  function openAddModal() {
    const modal = document.getElementById("add-modal");
    if (!modal) return;
    const chSel = document.getElementById("add-channel");
    const stSel = document.getElementById("add-stage");
    chSel.innerHTML = channels
      .map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
      .join("");
    chSel.value = "Walk-in / other";
    stSel.innerHTML = stages
      .map((s) => `<option value="${s.id}">${escapeHtml(s.label)}</option>`)
      .join("");
    stSel.value = "new_inquiry";
    document.getElementById("add-name").value = "";
    document.getElementById("add-org").value = "";
    document.getElementById("add-phone").value = "";
    document.getElementById("add-email").value = "";
    document.getElementById("add-dates").value = "";
    document.getElementById("add-pax").value = "";
    document.getElementById("add-notes").value = "";
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    setTimeout(() => document.getElementById("add-name")?.focus(), 50);
  }

  function closeAddModal() {
    const modal = document.getElementById("add-modal");
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }

  async function saveNewEvent() {
    const name = document.getElementById("add-name").value.trim();
    if (!name) {
      showToast("Name is required");
      document.getElementById("add-name")?.focus();
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const notes = document.getElementById("add-notes").value.trim();
    const lead = {
      id: newLeadId(),
      name,
      org: document.getElementById("add-org").value.trim(),
      email: document.getElementById("add-email").value.trim() || null,
      phone: document.getElementById("add-phone").value.trim() || null,
      source: "manual add (FO)",
      source_badge: "Other",
      inquiry_date: today,
      event_dates: document.getElementById("add-dates").value.trim(),
      pax: document.getElementById("add-pax").value.trim(),
      event_type: "event inquiry",
      stage: document.getElementById("add-stage").value || "new_inquiry",
      marketing_channel: document.getElementById("add-channel").value || "Walk-in / other",
      revenue_php: null,
      fo_notes: notes,
      lost_reason: "",
      seed_notes: notes ? `Manual add ${today}: ${notes}` : `Manual add ${today}`,
      last_updated: today,
      subject: `EVENT — ${name}`,
      editor: "fo-add",
    };

    localAdds = [lead, ...localAdds.filter((l) => l.id !== lead.id)];
    saveAdds();
    // Also put on base so card appears even before next Sheet pull
    baseLeads = [lead, ...baseLeads.filter((l) => l.id !== lead.id)];

    const row = leadToSheetRow(lead);
    const copied = await copyText(row);
    if (config.fo_sheet_write_url) {
      try {
        await fetch(config.fo_sheet_write_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "upsert", lead }),
        });
      } catch {}
    }

    closeAddModal();
    render();
    showToast(
      copied
        ? "Added to board — Sheet row copied. Paste into the Shared Sheet for all devices."
        : "Added to board — open Shared Sheet and add the row for all devices."
    );
    // Soft-open sheet for FO
    if (config.fo_sheet_edit_url && copied) {
      // don't auto-open new tab every time — toast is enough
    }
  }


  function initBoardScroll() {
    const wrap = document.getElementById("board-wrap");
    if (!wrap || wrap.dataset.scrollBound === "1") return;
    wrap.dataset.scrollBound = "1";

    let pan = null;

    wrap.addEventListener(
      "wheel",
      (e) => {
        if (wrap.scrollWidth <= wrap.clientWidth + 2) return;
        const absX = Math.abs(e.deltaX);
        const absY = Math.abs(e.deltaY);
        const overBody = e.target.closest && e.target.closest(".column-body");
        if (absX > absY || e.shiftKey) {
          e.preventDefault();
          wrap.scrollLeft += e.shiftKey ? e.deltaY : e.deltaX;
        } else if (overBody) {
          // native vertical on column-body via JS because touch-action none
          overBody.scrollTop += e.deltaY;
          e.preventDefault();
        } else {
          // default: vertical wheel pans board horizontally when not over a column body
          e.preventDefault();
          wrap.scrollLeft += e.deltaY;
        }
      },
      { passive: false }
    );

    wrap.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (e.target.closest(".card-drag-handle, button, a, input, textarea, select")) return;
      pan = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        left: wrap.scrollLeft,
        top: 0,
        moved: false,
        mode: null,
        card: e.target.closest(".card"),
        colBody: e.target.closest(".column-body"),
      };
      if (pan.colBody) pan.top = pan.colBody.scrollTop;
      wrap.classList.add("is-panning");
      try {
        wrap.setPointerCapture(e.pointerId);
      } catch (_) {}
    });

    wrap.addEventListener("pointermove", (e) => {
      if (!pan || pan.id !== e.pointerId) return;
      const dx = e.clientX - pan.x;
      const dy = e.clientY - pan.y;
      if (!pan.mode) {
        if (dx * dx + dy * dy < 25) return;
        if (pan.colBody && Math.abs(dy) > Math.abs(dx) * 1.2) pan.mode = "y";
        else pan.mode = "x";
        pan.moved = true;
        if (pan.card) pan.card.dataset.suppressClick = "1";
      }
      if (pan.mode === "x") {
        e.preventDefault();
        wrap.scrollLeft = pan.left - dx;
      } else if (pan.mode === "y" && pan.colBody) {
        e.preventDefault();
        pan.colBody.scrollTop = pan.top - dy;
      }
    });

    function endPan(e) {
      if (!pan || pan.id !== e.pointerId) return;
      const card = pan.card;
      const moved = pan.moved;
      pan = null;
      wrap.classList.remove("is-panning");
      if (card && moved) {
        // keep suppress through the click that follows pointerup
        setTimeout(() => {
          delete card.dataset.suppressClick;
        }, 50);
      }
    }
    wrap.addEventListener("pointerup", endPan);
    wrap.addEventListener("pointercancel", endPan);
  }

  async function init() {
    try {
      const cfgRes = await fetch("config.json?t=" + Date.now());
      if (cfgRes.ok) config = { ...config, ...(await cfgRes.json()) };
    } catch {}

    stages = Object.keys(stageMeta).map((id) => ({ id, label: stageMeta[id].label }));
    channels = Object.keys(CHANNEL_SHORT);

    const loaded = await loadLeadsFromRemote();
    if (loaded.leads) {
      baseLeads = loaded.leads.map((lead) => ({ ...lead, stage: normalizeLeadStage(lead) }));
      dataSource = loaded.kind;
    } else {
      const res = await fetch("leads.json?t=" + Date.now());
      const data = await res.json();
      baseLeads = (data.leads || []).map((lead) => ({ ...lead, stage: normalizeLeadStage(lead) }));
      stages = data.stages || stages;
      channels = data.marketing_channels || channels;
      document.getElementById("north-star").textContent = data.north_star || "YoY event sales growth";
      dataSource = "json";
    }

    // Prefer channels / north_star from leads.json; stages always from stageMeta (labels + preparing_quote)
    try {
      const meta = await fetch("leads.json?t=" + Date.now());
      if (meta.ok) {
        const data = await meta.json();
        if (data.marketing_channels) channels = data.marketing_channels;
        if (data.north_star) document.getElementById("north-star").textContent = data.north_star;
      }
    } catch {}
    stages = Object.keys(stageMeta).map((id) => ({ id, label: stageMeta[id].label }));
    baseLeads = baseLeads.map((lead) => ({ ...lead, stage: normalizeLeadStage(lead) }));

    // Do not auto-apply legacy localStorage overlays
    try {
      localStorage.removeItem("bc-events-crm-overlay-v1");
    } catch {}
    applyDrafts = false;

    updateBanner();

    document.getElementById("filter-status")?.addEventListener("change", (e) => {
      statusFilter = e.target.value;
      render();
    });
    document.getElementById("btn-close").addEventListener("click", closeDrawer);
    document.getElementById("backdrop").addEventListener("click", closeDrawer);
    document.getElementById("btn-save").addEventListener("click", saveDrawer);

    document.getElementById("btn-add-event")?.addEventListener("click", openAddModal);
    document.getElementById("btn-add-cancel")?.addEventListener("click", closeAddModal);
    document.getElementById("btn-add-save")?.addEventListener("click", () => saveNewEvent());
    document.getElementById("add-modal")?.addEventListener("click", (e) => {
      if (e.target && e.target.id === "add-modal") closeAddModal();
    });

    document.getElementById("stage-select").addEventListener("change", (e) => {
      toggleLostReason(e.target.value);
      toggleRevenue(e.target.value);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDrawer();
    });

    const sheetLink = document.getElementById("fo-sheet-link");
    if (sheetLink && config.fo_sheet_edit_url) {
      sheetLink.href = config.fo_sheet_edit_url;
    }


    // Auto-refresh from Sheet (no manual refresh UI)
    const AUTO_MS = 60 * 1000;
    setInterval(() => {
      if (document.visibilityState === "visible") refreshFromSheet();
    }, AUTO_MS);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") refreshFromSheet();
    });

    render();
  }

  init().catch((err) => {
    document.getElementById("board").innerHTML =
      `<p class="error">Failed to load CRM data: ${escapeHtml(err.message)}</p>`;
  });
})();
