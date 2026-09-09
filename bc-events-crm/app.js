/* Blue Coast Events CRM — Sheet is multi-device source of truth; page is live view */
(function () {
  const LS_DRAFT_KEY = "bc-events-crm-draft-v2";

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
  /** Optional this-session drafts only — cleared on Refresh from Sheet */
  let draftOverlay = loadDraft();
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
    if (!hasData || totalRev === 0) {
      hint.textContent =
        totalWon > 0
          ? "Won leads present — enter ₱ revenue in the Shared Sheet to fill the chart."
          : "Add revenue on Won leads in the Shared Sheet to populate.";
      hint.hidden = false;
    } else {
      hint.hidden = true;
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

  function showToast(message) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.classList.remove("show"), 3400);
  }

  function moveLeadToStage(id, stage) {
    const lead = allLeads().find((l) => l.id === id);
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

    bindBoardDnD(board);
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
        <span class="card-drag-handle" draggable="true" role="button" tabindex="-1" aria-label="Drag to change stage" title="Drag to move stage">⋮⋮</span>
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

  async function saveDrawer() {
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
    const lostOut = stage === "lost" ? lost_reason : draftOverlay[activeId]?.lost_reason || "";
    const revOut = stage === "won" ? revenue_php : draftOverlay[activeId]?.revenue_php ?? null;
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
        stage: get(cells, "stage") || "new_inquiry",
        marketing_channel: get(cells, "marketing_channel") || "Walk-in / other",
        revenue_php,
        fo_notes: get(cells, "fo_notes"),
        lost_reason: get(cells, "lost_reason"),
        seed_notes: get(cells, "seed_notes"),
        last_updated: get(cells, "last_updated"),
        subject: get(cells, "subject"),
      });
    }
    return out;
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
      baseLeads = loaded.leads;
      dataSource = loaded.kind;
    } else {
      // keep current base; still cleared drafts
      dataSource = dataSource || "json";
    }
    updateBanner();
    render();
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
      baseLeads = loaded.leads;
      dataSource = loaded.kind;
    } else {
      const res = await fetch("leads.json?t=" + Date.now());
      const data = await res.json();
      baseLeads = data.leads || [];
      stages = data.stages || stages;
      channels = data.marketing_channels || channels;
      document.getElementById("north-star").textContent = data.north_star || "YoY event sales growth";
      dataSource = "json";
    }

    // Prefer Sheet stages/channels lists when present in JSON meta
    try {
      const meta = await fetch("leads.json?t=" + Date.now());
      if (meta.ok) {
        const data = await meta.json();
        if (data.stages) stages = data.stages;
        if (data.marketing_channels) channels = data.marketing_channels;
        if (data.north_star) document.getElementById("north-star").textContent = data.north_star;
      }
    } catch {}

    // Do not auto-apply legacy localStorage overlays
    try {
      localStorage.removeItem("bc-events-crm-overlay-v1");
    } catch {}
    applyDrafts = false;

    updateBanner();

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

    const sheetLink = document.getElementById("fo-sheet-link");
    if (sheetLink && config.fo_sheet_edit_url) {
      sheetLink.href = config.fo_sheet_edit_url;
    }

    render();
  }

  init().catch((err) => {
    document.getElementById("board").innerHTML =
      `<p class="error">Failed to load CRM data: ${escapeHtml(err.message)}</p>`;
  });
})();
