/* Blue Coast Events CRM — FO notes + stage persist in localStorage */
(function () {
  const LS_KEY = "bc-events-crm-overlay-v1";
  const ACCENT = "#1E71A7";

  const stageMeta = {
    new_inquiry: { label: "New inquiry", open: true },
    contacted: { label: "Contacted", open: true },
    quoted: { label: "Quoted", open: true },
    site_visit_negotiation: { label: "Site visit / Negotiation", open: true },
    won: { label: "Won", open: false },
    lost: { label: "Lost", open: false },
  };

  let baseLeads = [];
  let stages = [];
  let overlay = loadOverlay();
  let activeId = null;
  let sourceFilter = "all";
  let statusFilter = "open"; // open | won | lost | all

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
    return { title: lead.name || lead.org || "Unknown", sub: lead.org && lead.name === lead.org ? "" : lead.org || "" };
  }

  function uniqueSources(leads) {
    const set = new Map();
    leads.forEach((l) => {
      const key = l.source_badge || "Other";
      set.set(key, (set.get(key) || 0) + 1);
    });
    return [...set.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }

  function matchesFilters(lead) {
    if (sourceFilter !== "all" && (lead.source_badge || "Other") !== sourceFilter) return false;
    const open = stageMeta[lead.stage]?.open;
    if (statusFilter === "open" && !open) return false;
    if (statusFilter === "won" && lead.stage !== "won") return false;
    if (statusFilter === "lost" && lead.stage !== "lost") return false;
    return true;
  }

  function render() {
    const leads = allLeads();
    const filtered = leads.filter(matchesFilters);
    const board = document.getElementById("board");
    const countEl = document.getElementById("lead-count");
    countEl.textContent = `${filtered.length} of ${leads.length} leads`;

    // source filter options
    const srcSel = document.getElementById("filter-source");
    const prev = srcSel.value;
    const sources = uniqueSources(leads);
    srcSel.innerHTML =
      `<option value="all">All sources</option>` +
      sources.map(([s, n]) => `<option value="${escapeHtml(s)}">${escapeHtml(s)} (${n})</option>`).join("");
    if ([...srcSel.options].some((o) => o.value === prev)) srcSel.value = prev;
    else srcSel.value = "all";
    sourceFilter = srcSel.value;

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
    return `
      <article class="card" data-id="${escapeHtml(lead.id)}" tabindex="0" role="button">
        <div class="card-top">
          <span class="badge">${escapeHtml(lead.source_badge || "Other")}</span>
          <span class="stage-pill stage-${escapeHtml(lead.stage)}">${escapeHtml(stageMeta[lead.stage]?.label || lead.stage)}</span>
        </div>
        <h3 class="card-title">${escapeHtml(title)}</h3>
        ${sub ? `<p class="card-org">${escapeHtml(sub)}</p>` : ""}
        ${dates ? `<p class="card-meta">${escapeHtml(dates)}</p>` : ""}
        <p class="card-contact">${escapeHtml(formatContact(lead))}</p>
        <p class="card-updated">Updated ${escapeHtml(lead.last_updated || "—")}</p>
        ${notesPreview ? `<p class="card-fo-preview">FO: ${escapeHtml(notesPreview.slice(0, 80))}${notesPreview.length > 80 ? "…" : ""}</p>` : ""}
        ${lead.stage === "lost" && lead.lost_reason ? `<p class="card-lost">${escapeHtml(lead.lost_reason)}</p>` : ""}
      </article>`;
  }

  function openDrawer(id) {
    activeId = id;
    const lead = allLeads().find((l) => l.id === id);
    if (!lead) return;
    const drawer = document.getElementById("drawer");
    const backdrop = document.getElementById("backdrop");
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
    const stageSel = document.getElementById("stage-select");
    stageSel.innerHTML = stages
      .map((s) => `<option value="${s.id}" ${s.id === lead.stage ? "selected" : ""}>${escapeHtml(s.label)}</option>`)
      .join("");
    toggleLostReason(lead.stage);
    drawer.classList.add("open");
    backdrop.classList.add("open");
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

  function saveDrawer() {
    if (!activeId) return;
    const stage = document.getElementById("stage-select").value;
    const fo_notes = document.getElementById("fo-notes").value;
    const lost_reason = document.getElementById("lost-reason").value;
    const today = new Date().toISOString().slice(0, 10);
    overlay[activeId] = {
      ...(overlay[activeId] || {}),
      stage,
      fo_notes,
      lost_reason: stage === "lost" ? lost_reason : overlay[activeId]?.lost_reason || "",
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
    document.getElementById("north-star").textContent = data.north_star || "YoY event sales growth";

    document.getElementById("filter-source").addEventListener("change", (e) => {
      sourceFilter = e.target.value;
      render();
    });
    document.getElementById("filter-status").addEventListener("change", (e) => {
      statusFilter = e.target.value;
      render();
    });
    document.getElementById("btn-close").addEventListener("click", closeDrawer);
    document.getElementById("backdrop").addEventListener("click", closeDrawer);
    document.getElementById("btn-save").addEventListener("click", saveDrawer);
    document.getElementById("stage-select").addEventListener("change", (e) => toggleLostReason(e.target.value));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDrawer();
    });

    render();
  }

  init().catch((err) => {
    document.getElementById("board").innerHTML = `<p class="error">Failed to load leads.json: ${escapeHtml(err.message)}</p>`;
  });
})();
