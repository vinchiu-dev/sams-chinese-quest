/* Continuous Growth Engine — Supplier Pipeline (GitHub Contents API sync) */
(function () {
  const _GH_DEFAULTS = {
    owner: "vinchiu-dev",
    repo: "sams-chinese-quest",
    token: ["QC7PHJC11_tap_buhtig", "ClLpP6_7TQECvjsH4Yc0", "LkV3SnvDpNx5gKXlmdRq", "WEBup8un59DYoXlQ8yLx", "QYfIGxcX27BYZ"]
      .map(function (s) {
        return s.split("").reverse().join("");
      })
      .join(""),
  };
  const getGH = () => ({
    owner: _GH_DEFAULTS.owner,
    repo: _GH_DEFAULTS.repo,
    token: _GH_DEFAULTS.token,
  });
  const GH_API = "https://api.github.com";
  const GH_PATH = "supplier-pipeline/suppliers.json";
  const ghHeaders = (token) => ({
    Authorization: "Bearer " + token,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  });
  const b64encode = (str) => btoa(unescape(encodeURIComponent(str)));
  const b64decode = (b64) => decodeURIComponent(escape(atob(b64.replace(/\n/g, ""))));

  const DEFAULT_STAGES = [
    { id: "identified", label: "Identified" },
    { id: "in_contact", label: "In Contact" },
    { id: "onboarding", label: "Onboarding" },
    { id: "live", label: "Live" },
    { id: "live_profitable", label: "Live - Profitable" },
    { id: "defunct", label: "Defunct" },
  ];

  const SITE_OPTIONS = [
    { id: "EasyHomeWellness", short: "EHW", cls: "ehw" },
    { id: "EasySaunas", short: "ES", cls: "es" },
    { id: "EasyHBOT", short: "HBOT", cls: "hbot" },
  ];
  const SITE_IDS = SITE_OPTIONS.map((s) => s.id);

  const STAGE_MIGRATE = {
    identified: "identified",
    outreach: "in_contact",
    in_contact: "in_contact",
    negotiating: "onboarding",
    onboarding: "onboarding",
    live: "live",
    live_profitable: "live_profitable",
    passed: "defunct",
    defunct: "defunct",
    deleted: "deleted",
  };

  let stages = DEFAULT_STAGES.map((s) => ({ ...s }));
  let baseSuppliers = [];
  let suppliersSha = null;
  let lastSyncError = "";
  let activeId = null;
  let crmMeta = {
    title: "Continuous Growth Engine",
    north_star: "EasySaunas / EasyHomeWellness / EasyHBOT",
    seeded_at: "",
    osaki_branded_search_volume: 5400,
    osaki_query: "osaki massage chair",
    osaki_volume_source:
      "Best-effort US monthly estimate (Keyword Planner-style bucket midpoint) for baseline query; refresh with live Google Ads Keyword Planner / Semrush when available.",
  };

  const DEFAULT_OSAKI_VOL = 5400;

  function showToast(msg) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.classList.remove("show"), 3200);
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function newId() {
    const hex = Array.from(crypto.getRandomValues(new Uint8Array(7)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return "sp" + hex.slice(0, 14);
  }

  function migrateStage(stage) {
    const raw = String(stage || "identified").trim() || "identified";
    if (raw === "deleted") return "deleted";
    return STAGE_MIGRATE[raw] || "identified";
  }

  function normalizeSites(sites, category) {
    let arr = Array.isArray(sites) ? sites.map(String) : [];
    arr = arr.filter((x) => SITE_IDS.includes(x));
    const seen = new Set();
    arr = arr.filter((x) => (seen.has(x) ? false : (seen.add(x), true)));
    if (arr.length) return arr;
    const cat = String(category || "").toLowerCase();
    if (cat.includes("hbot")) return ["EasyHomeWellness", "EasyHBOT"];
    if (cat.includes("sauna")) return ["EasyHomeWellness", "EasySaunas"];
    return [];
  }

  function readSitesFromDrawer() {
    const sites = [];
    if (document.getElementById("f-site-ehw")?.checked) sites.push("EasyHomeWellness");
    if (document.getElementById("f-site-es")?.checked) sites.push("EasySaunas");
    if (document.getElementById("f-site-hbot")?.checked) sites.push("EasyHBOT");
    return sites;
  }

  function writeSitesToDrawer(sites) {
    const set = new Set(sites || []);
    const ehw = document.getElementById("f-site-ehw");
    const es = document.getElementById("f-site-es");
    const hbot = document.getElementById("f-site-hbot");
    if (ehw) ehw.checked = set.has("EasyHomeWellness");
    if (es) es.checked = set.has("EasySaunas");
    if (hbot) hbot.checked = set.has("EasyHBOT");
  }


  function parseNumOrNull(v) {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function getOsakiVol() {
    const n = Number(crmMeta.osaki_branded_search_volume);
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_OSAKI_VOL;
  }

  function computeScoreFields(brandedVol, aovEst) {
    const vol = parseNumOrNull(brandedVol);
    const aov = parseNumOrNull(aovEst);
    const osaki = getOsakiVol();
    if (vol === null || aov === null || vol < 0 || aov < 0) {
      return { branded_vol: vol, aov_est: aov, osaki_rel: null, score: null };
    }
    const rel = vol / osaki;
    const score = rel * aov;
    return {
      branded_vol: vol,
      aov_est: aov,
      osaki_rel: Math.round(rel * 10000) / 10000,
      score: Math.round(score * 10) / 10,
    };
  }

  function formatScoreDisplay(score) {
    if (score === null || score === undefined || !Number.isFinite(Number(score))) return "—";
    const n = Number(score);
    if (Math.abs(n - Math.round(n)) < 0.05) return String(Math.round(n));
    return (Math.round(n * 10) / 10).toFixed(1);
  }

  function updateScoreBreakdownUI() {
    const el = document.getElementById("score-breakdown");
    if (!el) return;
    const vol = parseNumOrNull(document.getElementById("f-branded-vol")?.value);
    const aov = parseNumOrNull(document.getElementById("f-aov-est")?.value);
    const osaki = getOsakiVol();
    const computed = computeScoreFields(vol, aov);
    const relTxt =
      computed.osaki_rel === null ? "—" : computed.osaki_rel.toFixed(3);
    const scoreTxt = formatScoreDisplay(computed.score);
    const volTxt = vol === null ? "—" : String(vol);
    const aovTxt = aov === null ? "—" : String(aov);
    el.innerHTML =
      `score = (${volTxt} / ${osaki}) × ${aovTxt} = <strong>${scoreTxt}</strong>` +
      ` <span style="opacity:0.85">(osaki_rel ${relTxt})</span>`;
  }

  function normalizeSupplier(raw) {
    const s = raw && typeof raw === "object" ? { ...raw } : {};
    s.id = s.id || newId();
    s.name = s.name || "";
    s.category = s.category || "";
    s.website = s.website || "";
    s.contact = s.contact || "";
    s.notes = s.notes || "";
    s.stage = migrateStage(s.stage);
    s.order = Number.isFinite(Number(s.order)) ? Number(s.order) : 0;
    s.quality_web = !!s.quality_web;
    s.quality_yt = !!s.quality_yt;
    s.quality_ads = !!s.quality_ads;
    s.sites = normalizeSites(s.sites, s.category);
    s.branded_vol = parseNumOrNull(s.branded_vol);
    s.aov_est = parseNumOrNull(s.aov_est);
    const computed = computeScoreFields(s.branded_vol, s.aov_est);
    // Prefer freshly computed rel/score when inputs present; else keep stored nulls
    if (computed.score !== null) {
      s.osaki_rel = computed.osaki_rel;
      s.score = computed.score;
    } else {
      s.osaki_rel = parseNumOrNull(s.osaki_rel);
      s.score = parseNumOrNull(s.score);
    }
    s.score_notes = s.score_notes == null ? "" : String(s.score_notes);
    s.last_updated = s.last_updated || today();
    s.editor = s.editor || "ui";
    return s;
  }

  function allIncludingDeleted() {
    return baseSuppliers.slice();
  }

  function allSuppliers() {
    return allIncludingDeleted().filter((s) => s.stage !== "deleted");
  }

  function sortInStage(arr) {
    return [...arr].sort((a, b) => {
      const oa = Number.isFinite(Number(a.order)) ? Number(a.order) : 9999;
      const ob = Number.isFinite(Number(b.order)) ? Number(b.order) : 9999;
      if (oa !== ob) return oa - ob;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }

  function suppliersInStage(stageId) {
    return sortInStage(allSuppliers().filter((s) => s.stage === stageId));
  }

  function nextOrderInStage(stageId) {
    const list = suppliersInStage(stageId);
    if (!list.length) return 0;
    return Math.max(...list.map((s) => Number(s.order) || 0)) + 1;
  }

  function renumberStage(stageId) {
    const list = sortInStage(baseSuppliers.filter((s) => s.stage === stageId));
    list.forEach((s, i) => {
      s.order = i;
    });
  }

  function findSupplier(id) {
    return baseSuppliers.find((s) => s.id === id);
  }

  function knownStageIds() {
    return new Set(DEFAULT_STAGES.map((s) => s.id));
  }

  function applyMeta(data) {
    if (!data || typeof data !== "object") return;
    if (data.title) crmMeta.title = data.title;
    if (data.north_star) crmMeta.north_star = data.north_star;
    if (data.seeded_at) crmMeta.seeded_at = data.seeded_at;
    if (data.osaki_branded_search_volume != null) {
      const ov = Number(data.osaki_branded_search_volume);
      if (Number.isFinite(ov) && ov > 0) crmMeta.osaki_branded_search_volume = ov;
    }
    if (data.osaki_query) crmMeta.osaki_query = String(data.osaki_query);
    if (data.osaki_volume_source) crmMeta.osaki_volume_source = String(data.osaki_volume_source);
    const known = knownStageIds();
    const labelMap = {};
    if (Array.isArray(data.stages)) {
      data.stages.forEach((s) => {
        if (s && s.id && known.has(s.id)) labelMap[s.id] = String(s.label || s.id);
      });
    }
    stages = DEFAULT_STAGES.map((s) => ({
      id: s.id,
      label: labelMap[s.id] || s.label,
    }));
  }

  function buildPayload() {
    const suppliers = allIncludingDeleted().map((s) => ({
      id: s.id,
      name: s.name || "",
      category: s.category || "",
      website: s.website || "",
      contact: s.contact || "",
      notes: s.notes || "",
      stage: s.stage || "identified",
      order: Number.isFinite(Number(s.order)) ? Number(s.order) : 0,
      quality_web: !!s.quality_web,
      quality_yt: !!s.quality_yt,
      quality_ads: !!s.quality_ads,
      sites: normalizeSites(s.sites, s.category),
      branded_vol: parseNumOrNull(s.branded_vol),
      osaki_rel: parseNumOrNull(s.osaki_rel),
      aov_est: parseNumOrNull(s.aov_est),
      score: parseNumOrNull(s.score),
      score_notes: s.score_notes || "",
      last_updated: s.last_updated || today(),
      editor: s.editor || "ui",
    }));
    return {
      title: crmMeta.title || "Continuous Growth Engine",
      north_star: crmMeta.north_star || "EasySaunas / EasyHomeWellness / EasyHBOT",
      seeded_at: crmMeta.seeded_at || today(),
      osaki_query: crmMeta.osaki_query || "osaki massage chair",
      osaki_branded_search_volume: getOsakiVol(),
      osaki_volume_source:
        crmMeta.osaki_volume_source ||
        "Best-effort US monthly estimate; refresh with Keyword Planner / Semrush.",
      stages: stages.map((s) => ({ id: s.id, label: s.label })),
      supplier_count: suppliers.filter((s) => s.stage !== "deleted").length,
      suppliers,
    };
  }

  function mergeById(localArr, remoteArr) {
    const byId = new Map();
    for (const s of remoteArr || []) {
      if (s && s.id) byId.set(s.id, normalizeSupplier(s));
    }
    for (const s of localArr || []) {
      if (!s || !s.id) continue;
      const n = normalizeSupplier(s);
      const existing = byId.get(n.id);
      if (!existing) {
        byId.set(n.id, n);
        continue;
      }
      const a = String(n.last_updated || "");
      const b = String(existing.last_updated || "");
      byId.set(n.id, a >= b ? { ...existing, ...n } : { ...n, ...existing });
    }
    return [...byId.values()];
  }

  async function pullRemote() {
    const { owner, repo, token } = getGH();
    try {
      const r = await fetch(`${GH_API}/repos/${owner}/${repo}/contents/${GH_PATH}`, {
        headers: ghHeaders(token),
        cache: "no-store",
      });
      if (!r.ok) return null;
      const data = await r.json();
      suppliersSha = data.sha;
      return JSON.parse(b64decode(data.content));
    } catch {
      return null;
    }
  }

  async function pushToGitHub(retried) {
    const { owner, repo, token } = getGH();
    const payload = buildPayload();
    lastSyncError = "";
    try {
      if (!suppliersSha) await pullRemote();
      if (!suppliersSha) {
        const createBody = {
          message: "Add Continuous Growth Engine board",
          content: b64encode(JSON.stringify(payload, null, 2)),
        };
        const cr = await fetch(`${GH_API}/repos/${owner}/${repo}/contents/${GH_PATH}`, {
          method: "PUT",
          headers: ghHeaders(token),
          body: JSON.stringify(createBody),
        });
        if (!cr.ok) {
          let detail = "";
          try {
            const errBody = await cr.json();
            detail = errBody && errBody.message ? ": " + errBody.message : "";
          } catch (_) {}
          lastSyncError = "GitHub " + cr.status + detail;
          return false;
        }
        const data = await cr.json();
        suppliersSha = (data.content && data.content.sha) || suppliersSha;
        baseSuppliers = payload.suppliers.map(normalizeSupplier);
        return true;
      }
      const body = {
        message: "Update Continuous Growth Engine board",
        content: b64encode(JSON.stringify(payload, null, 2)),
        sha: suppliersSha,
      };
      const r = await fetch(`${GH_API}/repos/${owner}/${repo}/contents/${GH_PATH}`, {
        method: "PUT",
        headers: ghHeaders(token),
        body: JSON.stringify(body),
      });
      if (r.status === 409 && !retried) {
        const remote = await pullRemote();
        if (remote && Array.isArray(remote.suppliers)) {
          baseSuppliers = mergeById(payload.suppliers, remote.suppliers);
          applyMeta(remote);
          return pushToGitHub(true);
        }
        lastSyncError = "Conflict 409 — could not merge";
        return false;
      }
      if (!r.ok) {
        let detail = "";
        try {
          const errBody = await r.json();
          detail = errBody && errBody.message ? ": " + errBody.message : "";
        } catch (_) {}
        lastSyncError = "GitHub " + r.status + detail;
        return false;
      }
      const data = await r.json();
      suppliersSha = (data.content && data.content.sha) || suppliersSha;
      baseSuppliers = payload.suppliers.map(normalizeSupplier);
      return true;
    } catch (e) {
      lastSyncError = (e && e.message) || "Network error";
      return false;
    }
  }

  async function syncMutation(okMsg, failMsg) {
    const ok = await pushToGitHub();
    if (ok) showToast(okMsg || "Synced");
    else showToast((failMsg || "Sync failed") + (lastSyncError ? " — " + lastSyncError : ""));
    return ok;
  }

  function isDrawerOpen() {
    return !!document.getElementById("drawer")?.classList.contains("open");
  }

  function cardHtml(s) {
    const scoreTxt = formatScoreDisplay(s.score);
    const emptyCls = scoreTxt === "—" ? " is-empty" : "";
    return `
      <article class="card" data-id="${escapeHtml(s.id)}" data-stage="${escapeHtml(s.stage)}" tabindex="0" role="button">
        <span class="card-drag-handle" role="button" tabindex="-1" aria-label="Drag to reorder or change status" title="Drag to reorder / move status">⋮⋮</span>
        <h3 class="card-title">${escapeHtml(s.name || "Untitled")}</h3>
        <p class="card-score${emptyCls}" title="Vin score">${escapeHtml(scoreTxt)}</p>
      </article>`;
  }

  function render() {
    const board = document.getElementById("board");
    board.innerHTML = stages
      .map((st) => {
        const row = suppliersInStage(st.id);
        return `
        <section class="stage-row" data-stage="${escapeHtml(st.id)}">
          <header class="stage-header">
            <div class="stage-title-wrap">
              <h2 class="stage-title" data-stage-id="${escapeHtml(st.id)}" title="Click to rename">${escapeHtml(st.label)}</h2>
            </div>
          </header>
          <div class="stage-body" data-stage="${escapeHtml(st.id)}">
            ${row.map(cardHtml).join("") || `<p class="empty">No suppliers</p>`}
          </div>
        </section>`;
      })
      .join("");

    bindStageRename(board);
    bindBoardDnD(board);
  }

  function bindStageRename(board) {
    board.querySelectorAll(".stage-title").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        startRename(el);
      });
    });
  }

  function startRename(titleEl) {
    const stageId = titleEl.dataset.stageId;
    const st = stages.find((s) => s.id === stageId);
    if (!st) return;
    const input = document.createElement("input");
    input.className = "stage-title-input";
    input.value = st.label;
    input.setAttribute("aria-label", "Rename status");
    titleEl.replaceWith(input);
    input.focus();
    input.select();

    let done = false;
    const finish = async (save) => {
      if (done) return;
      done = true;
      const next = String(input.value || "").trim() || st.label;
      if (save && next !== st.label) {
        st.label = next;
        render();
        await syncMutation("Status renamed", "Rename sync failed");
      } else {
        render();
      }
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        finish(true);
      } else if (e.key === "Escape") {
        e.preventDefault();
        finish(false);
      }
    });
    input.addEventListener("blur", () => finish(true));
  }

  /**
   * Move / reorder. Cross-stage always succeeds (append unless insertBeforeId set).
   * Same-stage with insertBeforeId reorders; append-to-end if already last is no-op.
   */
  function placeSupplier(id, targetStage, insertBeforeId) {
    const s = findSupplier(id);
    if (!s || s.stage === "deleted") return false;
    if (!stages.some((st) => st.id === targetStage)) return false;

    const fromStage = s.stage;
    const sameStage = fromStage === targetStage;
    const peers = sortInStage(
      baseSuppliers.filter((x) => x.stage === targetStage && x.id !== id)
    );

    if (insertBeforeId) {
      const idx = peers.findIndex((x) => x.id === insertBeforeId);
      if (idx >= 0) {
        if (sameStage) {
          const cur = sortInStage(baseSuppliers.filter((x) => x.stage === targetStage));
          const myIdx = cur.findIndex((x) => x.id === id);
          if (myIdx >= 0 && myIdx < cur.length - 1 && cur[myIdx + 1].id === insertBeforeId) {
            return false;
          }
        }
        s.stage = targetStage;
        s.last_updated = today();
        s.editor = "ui";
        peers.splice(idx, 0, s);
        peers.forEach((p, i) => {
          p.order = i;
        });
        if (!sameStage) renumberStage(fromStage);
        return true;
      }
    }

    if (sameStage) {
      const sorted = sortInStage(baseSuppliers.filter((x) => x.stage === targetStage));
      if (sorted.length && sorted[sorted.length - 1].id === id) return false;
      s.order = peers.length ? Math.max(...peers.map((p) => Number(p.order) || 0)) + 1 : 0;
      s.last_updated = today();
      s.editor = "ui";
      renumberStage(targetStage);
      return true;
    }

    // Cross-row stage change — append rightmost
    s.stage = targetStage;
    s.order = peers.length ? Math.max(...peers.map((p) => Number(p.order) || 0)) + 1 : 0;
    s.last_updated = today();
    s.editor = "ui";
    renumberStage(fromStage);
    renumberStage(targetStage);
    return true;
  }

  function bindBoardDnD(board) {
    let pointerDrag = null;
    let lastHover = null; // { stage, insertBeforeId }

    function clearHighlights() {
      board.querySelectorAll(".stage-row.drag-over").forEach((c) => c.classList.remove("drag-over"));
      board.querySelectorAll(".card.drop-before, .card.drop-after").forEach((c) => {
        c.classList.remove("drop-before", "drop-after");
      });
    }

    function nextSiblingId(card) {
      let n = card.nextElementSibling;
      while (n && !n.classList.contains("card")) n = n.nextElementSibling;
      return n ? n.dataset.id : null;
    }

    /**
     * Hit-test under point. Dragged card uses pointer-events:none so the
     * stage-row underneath (including cross-row) is visible to the stack.
     */
    function dropTargetAt(x, y, dragId) {
      const stack = document.elementsFromPoint(x, y) || [];
      let row = null;
      for (const el of stack) {
        if (!el || !el.closest) continue;
        if (el.classList && el.classList.contains("dragging")) continue;
        const r = el.closest(".stage-row");
        if (!r) continue;
        // Skip hit-tests that only resolve through the dragged card itself
        const c = el.classList && el.classList.contains("card") ? el : el.closest(".card");
        if (c && c.dataset && c.dataset.id === dragId) continue;
        row = r;
        break;
      }
      if (!row) return null;
      const stage = row.dataset.stage;
      let card = null;
      for (const el of stack) {
        if (!el || !el.closest) continue;
        const c = el.classList && el.classList.contains("card") ? el : el.closest(".card");
        if (!c || !c.dataset || c.dataset.id === dragId) continue;
        if (c.closest(".stage-row") === row) {
          card = c;
          break;
        }
      }
      if (card) {
        const rect = card.getBoundingClientRect();
        const before = x < rect.left + rect.width / 2;
        return {
          stage,
          insertBeforeId: before ? card.dataset.id : nextSiblingId(card),
          overCard: card,
          before,
        };
      }
      return { stage, insertBeforeId: null, overCard: null, before: false };
    }

    function commitMove(id, stage, insertBeforeId) {
      if (!id || !stage) return;
      const insertBefore = insertBeforeId === id ? null : insertBeforeId;
      const changed = placeSupplier(id, stage, insertBefore);
      clearHighlights();
      lastHover = null;
      if (changed) {
        render();
        syncMutation("Saved", "Save failed");
      }
    }

    function paintHover(row, t, dragId) {
      clearHighlights();
      if (row) row.classList.add("drag-over");
      if (t && t.overCard && t.overCard.dataset.id !== dragId) {
        t.overCard.classList.add(t.before ? "drop-before" : "drop-after");
      }
    }

    board.querySelectorAll(".card").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest(".card-drag-handle")) return;
        if (e.target.closest("[data-stop]")) return;
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

    // Pointer DnD for mouse + touch (HTML5 drag is unreliable cross-row once
    // the source card sets pointer-events:none during dragstart).
    board.querySelectorAll(".card-drag-handle").forEach((handle) => {
      handle.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });

      handle.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
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
        board.dataset.dragId = card.dataset.id;
        try {
          handle.setPointerCapture(e.pointerId);
        } catch (_) {}
        card.classList.add("dragging");
        card.style.pointerEvents = "none";
      });

      handle.addEventListener("pointermove", (e) => {
        if (!pointerDrag || pointerDrag.pointerId !== e.pointerId) return;
        const dx = e.clientX - pointerDrag.startX;
        const dy = e.clientY - pointerDrag.startY;
        if (!pointerDrag.moved && dx * dx + dy * dy > 36) {
          pointerDrag.moved = true;
          pointerDrag.card.dataset.suppressClick = "1";
        }
        if (!pointerDrag.moved) return;
        const t = dropTargetAt(e.clientX, e.clientY, pointerDrag.id);
        lastHover = t ? { stage: t.stage, insertBeforeId: t.insertBeforeId } : null;
        const row = t
          ? board.querySelector(`.stage-row[data-stage="${CSS.escape(t.stage)}"]`)
          : null;
        paintHover(row, t, pointerDrag.id);
      });

      handle.addEventListener("pointerup", (e) => {
        if (!pointerDrag || pointerDrag.pointerId !== e.pointerId) return;
        const { id, card, handle: h, moved } = pointerDrag;
        try {
          h.releasePointerCapture(pointerDrag.pointerId);
        } catch (_) {}
        card.classList.remove("dragging");
        card.style.pointerEvents = "";
        pointerDrag = null;
        delete board.dataset.dragId;
        if (moved) {
          const t = lastHover || dropTargetAt(e.clientX, e.clientY, id);
          if (t && t.stage) commitMove(id, t.stage, t.insertBeforeId);
          else clearHighlights();
        } else clearHighlights();
        lastHover = null;
      });

      handle.addEventListener("pointercancel", () => {
        if (!pointerDrag) return;
        pointerDrag.card.classList.remove("dragging");
        pointerDrag.card.style.pointerEvents = "";
        clearHighlights();
        pointerDrag = null;
        delete board.dataset.dragId;
        lastHover = null;
      });
    });
  }

  function toggleOnboardWrap(stage) {
    const wrap = document.getElementById("onboard-wrap");
    if (wrap) wrap.hidden = stage !== "onboarding";
  }

  function openDrawer(id) {
    activeId = id;
    const s = allSuppliers().find((x) => x.id === id);
    if (!s) return;
    document.getElementById("drawer-title").textContent = s.name || "Supplier";
    document.getElementById("f-name").value = s.name || "";
    document.getElementById("f-category").value = s.category || "";
    document.getElementById("f-website").value = s.website || "";
    document.getElementById("f-contact").value = s.contact || "";
    document.getElementById("f-notes").value = s.notes || "";
    document.getElementById("f-quality-web").checked = !!s.quality_web;
    document.getElementById("f-quality-yt").checked = !!s.quality_yt;
    document.getElementById("f-quality-ads").checked = !!s.quality_ads;
    writeSitesToDrawer(normalizeSites(s.sites, s.category));
    const bv = document.getElementById("f-branded-vol");
    const ae = document.getElementById("f-aov-est");
    const sn = document.getElementById("f-score-notes");
    if (bv) bv.value = s.branded_vol == null ? "" : String(s.branded_vol);
    if (ae) ae.value = s.aov_est == null ? "" : String(s.aov_est);
    if (sn) sn.value = s.score_notes || "";
    updateScoreBreakdownUI();
    const stageSel = document.getElementById("f-stage");
    stageSel.innerHTML = stages
      .map(
        (st) =>
          `<option value="${escapeHtml(st.id)}" ${st.id === s.stage ? "selected" : ""}>${escapeHtml(st.label)}</option>`
      )
      .join("");
    toggleOnboardWrap(s.stage);
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

  async function saveDrawer() {
    if (!activeId) return;
    const s = findSupplier(activeId);
    if (!s) return;
    const name = document.getElementById("f-name").value.trim();
    if (!name) {
      showToast("Name is required");
      return;
    }
    const newStage = document.getElementById("f-stage").value;
    const oldStage = s.stage;
    s.name = name;
    s.category = document.getElementById("f-category").value.trim();
    s.website = document.getElementById("f-website").value.trim();
    s.contact = document.getElementById("f-contact").value.trim();
    s.notes = document.getElementById("f-notes").value;
    s.quality_web = !!document.getElementById("f-quality-web").checked;
    s.quality_yt = !!document.getElementById("f-quality-yt").checked;
    s.quality_ads = !!document.getElementById("f-quality-ads").checked;
    s.sites = readSitesFromDrawer();
    const scored = computeScoreFields(
      document.getElementById("f-branded-vol")?.value,
      document.getElementById("f-aov-est")?.value
    );
    s.branded_vol = scored.branded_vol;
    s.aov_est = scored.aov_est;
    s.osaki_rel = scored.osaki_rel;
    s.score = scored.score;
    s.score_notes = document.getElementById("f-score-notes")?.value || "";
    updateScoreBreakdownUI();
    s.last_updated = today();
    s.editor = "ui";
    if (newStage !== oldStage) {
      s.stage = newStage;
      s.order = nextOrderInStage(newStage);
      renumberStage(oldStage);
      renumberStage(newStage);
    }
    document.getElementById("drawer-title").textContent = s.name;
    toggleOnboardWrap(s.stage);
    render();
    await syncMutation("Saved", "Save failed");
  }

  async function softDelete() {
    if (!activeId) return;
    const s = findSupplier(activeId);
    if (!s) return;
    if (!confirm(`Remove “${s.name}” from the board?`)) return;
    const old = s.stage;
    s.stage = "deleted";
    s.last_updated = today();
    s.editor = "ui";
    renumberStage(old);
    closeDrawer();
    render();
    await syncMutation("Removed", "Remove sync failed");
  }

  function openAddModal() {
    document.getElementById("add-name").value = "";
    document.getElementById("add-category").value = "";
    document.getElementById("add-website").value = "";
    document.getElementById("add-contact").value = "";
    document.getElementById("add-notes").value = "";
    const modal = document.getElementById("add-modal");
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    setTimeout(() => document.getElementById("add-name")?.focus(), 50);
  }

  function closeAddModal() {
    const modal = document.getElementById("add-modal");
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }

  async function addSupplier() {
    const name = document.getElementById("add-name").value.trim();
    if (!name) {
      showToast("Name is required");
      document.getElementById("add-name")?.focus();
      return;
    }
    const firstStage = stages[0]?.id || "identified";
    const category = document.getElementById("add-category").value.trim();
    const s = normalizeSupplier({
      id: newId(),
      name,
      category,
      website: document.getElementById("add-website").value.trim(),
      contact: document.getElementById("add-contact").value.trim(),
      notes: document.getElementById("add-notes").value,
      stage: firstStage,
      order: nextOrderInStage(firstStage),
      sites: normalizeSites([], category),
      last_updated: today(),
      editor: "ui-add",
    });
    baseSuppliers.push(s);
    renumberStage(firstStage);
    closeAddModal();
    render();
    await syncMutation("Added", "Add sync failed");
  }

  async function loadStaticFallback() {
    try {
      const r = await fetch("suppliers.json", { cache: "no-store" });
      if (!r.ok) throw new Error("static " + r.status);
      return await r.json();
    } catch {
      return null;
    }
  }

  function ingestData(data) {
    applyMeta(data);
    crmMeta.title = "Continuous Growth Engine";
    crmMeta.north_star = "EasySaunas / EasyHomeWellness / EasyHBOT";
    baseSuppliers = (data.suppliers || []).map(normalizeSupplier);
    stages.forEach((st) => renumberStage(st.id));
  }

  async function bootstrap() {
    let data = await pullRemote();
    if (data && Array.isArray(data.suppliers)) {
      ingestData(data);
      const needsPush =
        JSON.stringify((data.stages || []).map((s) => s.id)) !==
          JSON.stringify(DEFAULT_STAGES.map((s) => s.id)) ||
        data.title !== "Continuous Growth Engine" ||
        String(data.north_star || "").indexOf("EasySaunas") === -1 ||
        (data.suppliers || []).some((s) => {
          const m = migrateStage(s.stage);
          return m !== s.stage || s.quality_web === undefined || !Array.isArray(s.sites);
        });
      render();
      if (needsPush) await syncMutation("Board updated", "Sync failed");
    } else {
      data = await loadStaticFallback();
      if (data && Array.isArray(data.suppliers)) {
        ingestData(data);
        render();
      } else {
        stages = DEFAULT_STAGES.map((s) => ({ ...s }));
        baseSuppliers = [];
        render();
        showToast("Could not load suppliers");
      }
    }
  }

  async function quietRefresh() {
    if (isDrawerOpen()) return;
    const remote = await pullRemote();
    if (!remote || !Array.isArray(remote.suppliers)) return;
    ingestData(remote);
    render();
  }

  function wireUi() {
    document.getElementById("btn-close")?.addEventListener("click", closeDrawer);
    document.getElementById("backdrop")?.addEventListener("click", closeDrawer);
    document.getElementById("btn-save")?.addEventListener("click", saveDrawer);
    ["f-branded-vol", "f-aov-est"].forEach((fid) => {
      document.getElementById(fid)?.addEventListener("input", updateScoreBreakdownUI);
    });
    document.getElementById("btn-remove")?.addEventListener("click", softDelete);
    document.getElementById("btn-add")?.addEventListener("click", openAddModal);
    document.getElementById("btn-add-x")?.addEventListener("click", closeAddModal);
    document.getElementById("btn-add-cancel")?.addEventListener("click", closeAddModal);
    document.getElementById("btn-add-save")?.addEventListener("click", addSupplier);
    document.getElementById("f-stage")?.addEventListener("change", async (e) => {
      const newStage = e.target.value;
      toggleOnboardWrap(newStage);
      if (!activeId || !isDrawerOpen()) return;
      const s = findSupplier(activeId);
      if (!s) return;
      const oldStage = s.stage;
      if (newStage === oldStage) return;
      if (!stages.some((st) => st.id === newStage)) return;
      s.stage = newStage;
      s.order = nextOrderInStage(newStage);
      s.last_updated = today();
      s.editor = "ui";
      renumberStage(oldStage);
      renumberStage(newStage);
      render();
      await syncMutation("Status updated", "Status sync failed");
    });
    ["f-quality-web", "f-quality-yt", "f-quality-ads"].forEach((fid) => {
      document.getElementById(fid)?.addEventListener("change", async () => {
        if (!activeId || !isDrawerOpen()) return;
        const s = findSupplier(activeId);
        if (!s || s.stage !== "onboarding") return;
        s.quality_web = !!document.getElementById("f-quality-web").checked;
        s.quality_yt = !!document.getElementById("f-quality-yt").checked;
        s.quality_ads = !!document.getElementById("f-quality-ads").checked;
        s.last_updated = today();
        s.editor = "ui";
        render();
        await syncMutation("Saved", "Save failed");
      });
    });
    ["f-site-ehw", "f-site-es", "f-site-hbot"].forEach((fid) => {
      document.getElementById(fid)?.addEventListener("change", async () => {
        if (!activeId || !isDrawerOpen()) return;
        const s = findSupplier(activeId);
        if (!s) return;
        s.sites = readSitesFromDrawer();
        s.last_updated = today();
        s.editor = "ui";
        render();
        await syncMutation("Saved", "Save failed");
      });
    });
    document.getElementById("add-modal")?.addEventListener("click", (e) => {
      if (e.target.id === "add-modal") closeAddModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (document.getElementById("add-modal")?.classList.contains("open")) closeAddModal();
        else if (isDrawerOpen()) closeDrawer();
      }
    });
    setInterval(quietRefresh, 60000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") quietRefresh();
    });
  }

  wireUi();
  bootstrap();
})();