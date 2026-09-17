/* Supplier Pipeline CRM — GitHub Contents API sync (same pattern as BC Events CRM / Sam progress) */
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
    { id: "outreach", label: "Outreach" },
    { id: "negotiating", label: "Negotiating" },
    { id: "onboarding", label: "Onboarding" },
    { id: "live", label: "Live" },
    { id: "passed", label: "Passed" },
  ];

  let stages = DEFAULT_STAGES.map((s) => ({ ...s }));
  let baseSuppliers = [];
  let suppliersSha = null;
  let lastSyncError = "";
  let activeId = null;
  let crmMeta = {
    title: "Supplier Pipeline",
    north_star: "Peace Den / Easy Home Wellness brand partners",
    seeded_at: "",
  };

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

  /** Re-number order 0..n-1 within a stage (left = highest priority). */
  function renumberStage(stageId) {
    const list = sortInStage(baseSuppliers.filter((s) => s.stage === stageId && s.stage !== "deleted"));
    list.forEach((s, i) => {
      s.order = i;
    });
  }

  function findSupplier(id) {
    return baseSuppliers.find((s) => s.id === id);
  }

  function applyMeta(data) {
    if (!data || typeof data !== "object") return;
    if (data.title) crmMeta.title = data.title;
    if (data.north_star) crmMeta.north_star = data.north_star;
    if (data.seeded_at) crmMeta.seeded_at = data.seeded_at;
    if (Array.isArray(data.stages) && data.stages.length) {
      stages = data.stages
        .filter((s) => s && s.id && s.id !== "deleted")
        .map((s) => ({ id: String(s.id), label: String(s.label || s.id) }));
    }
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
      last_updated: s.last_updated || today(),
      editor: s.editor || "ui",
    }));
    return {
      title: crmMeta.title || "Supplier Pipeline",
      north_star: crmMeta.north_star || "Peace Den / Easy Home Wellness brand partners",
      seeded_at: crmMeta.seeded_at || today(),
      stages: stages.map((s) => ({ id: s.id, label: s.label })),
      supplier_count: suppliers.filter((s) => s.stage !== "deleted").length,
      suppliers,
    };
  }

  function mergeById(localArr, remoteArr) {
    const byId = new Map();
    for (const s of remoteArr || []) {
      if (s && s.id) byId.set(s.id, s);
    }
    for (const s of localArr || []) {
      if (!s || !s.id) continue;
      const existing = byId.get(s.id);
      if (!existing) {
        byId.set(s.id, s);
        continue;
      }
      const a = String(s.last_updated || "");
      const b = String(existing.last_updated || "");
      byId.set(s.id, a >= b ? { ...existing, ...s } : { ...s, ...existing });
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
        // File may not exist yet — try create without sha
        const createBody = {
          message: "Add Supplier Pipeline board",
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
        baseSuppliers = payload.suppliers.slice();
        return true;
      }
      const body = {
        message: "Update Supplier Pipeline board",
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
      baseSuppliers = payload.suppliers.slice();
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
    const cat = s.category
      ? `<p class="card-cat">${escapeHtml(s.category)}</p>`
      : "";
    return `
      <article class="card" data-id="${escapeHtml(s.id)}" data-stage="${escapeHtml(s.stage)}" tabindex="0" role="button">
        <span class="card-drag-handle" draggable="true" role="button" tabindex="-1" aria-label="Drag to reorder or change status" title="Drag to reorder / move status">⋮⋮</span>
        <h3 class="card-title">${escapeHtml(s.name || "Untitled")}</h3>
        ${cat}
      </article>`;
  }

  function render() {
    const list = allSuppliers();
    const countEl = document.getElementById("supplier-count");
    if (countEl) countEl.textContent = `${list.length} supplier${list.length === 1 ? "" : "s"}`;

    const board = document.getElementById("board");
    board.innerHTML = stages
      .map((st) => {
        const row = suppliersInStage(st.id);
        return `
        <section class="stage-row" data-stage="${escapeHtml(st.id)}">
          <header class="stage-header">
            <div class="stage-title-wrap">
              <h2 class="stage-title" data-stage-id="${escapeHtml(st.id)}" title="Click to rename">${escapeHtml(st.label)}</h2>
              <span class="stage-hint">← higher priority</span>
            </div>
            <span class="col-count">${row.length}</span>
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
   * Move supplier to a stage. If insertBeforeId is set, place before that card;
   * otherwise append as rightmost (lowest priority) when changing stage.
   * Same-stage with insertBeforeId = reorder.
   */
  function placeSupplier(id, targetStage, insertBeforeId) {
    const s = findSupplier(id);
    if (!s || s.stage === "deleted") return false;
    if (!stages.some((st) => st.id === targetStage)) return false;

    const fromStage = s.stage;
    const sameStage = fromStage === targetStage;

    // Pull out of current list conceptually by assigning new order among target stage peers
    const peers = sortInStage(
      baseSuppliers.filter((x) => x.stage === targetStage && x.id !== id && x.stage !== "deleted")
    );

    let newOrder;
    if (insertBeforeId) {
      const idx = peers.findIndex((x) => x.id === insertBeforeId);
      if (idx >= 0) {
        // Insert at idx: assign orders around it
        peers.splice(idx, 0, s);
        peers.forEach((p, i) => {
          p.order = i;
          if (p.id === id) {
            p.stage = targetStage;
            p.last_updated = today();
            p.editor = "ui";
          }
        });
        s.stage = targetStage;
        s.order = idx;
        s.last_updated = today();
        s.editor = "ui";
        if (!sameStage) renumberStage(fromStage);
        return true;
      }
    }

    // Append rightmost (lowest priority). Same-stage with null insertBefore = move to end.
    if (sameStage && !insertBeforeId) {
      const sorted = sortInStage(
        baseSuppliers.filter((x) => x.stage === targetStage && x.stage !== "deleted")
      );
      if (sorted.length && sorted[sorted.length - 1].id === id) return false; // already last
    }
    s.stage = targetStage;
    s.order = peers.length ? Math.max(...peers.map((p) => Number(p.order) || 0)) + 1 : 0;
    s.last_updated = today();
    s.editor = "ui";
    if (!sameStage) renumberStage(fromStage);
    renumberStage(targetStage);
    return true;
  }

  function bindBoardDnD(board) {
    let pointerDrag = null;

    function clearHighlights() {
      board.querySelectorAll(".stage-row.drag-over").forEach((c) => c.classList.remove("drag-over"));
      board.querySelectorAll(".card.drop-before, .card.drop-after").forEach((c) => {
        c.classList.remove("drop-before", "drop-after");
      });
    }

    function dropTargetAt(x, y) {
      const el = document.elementFromPoint(x, y);
      if (!el) return null;
      const card = el.closest(".card");
      const row = el.closest(".stage-row");
      if (!row) return null;
      const stage = row.dataset.stage;
      if (card && card.dataset.id) {
        const rect = card.getBoundingClientRect();
        const before = x < rect.left + rect.width / 2;
        return { stage, insertBeforeId: before ? card.dataset.id : nextSiblingId(card), overCard: card, before };
      }
      return { stage, insertBeforeId: null, overCard: null, before: false };
    }

    function nextSiblingId(card) {
      let n = card.nextElementSibling;
      while (n && !n.classList.contains("card")) n = n.nextElementSibling;
      return n ? n.dataset.id : null; // null = append after last
    }

    function applyDrop(id, x, y) {
      const t = dropTargetAt(x, y);
      clearHighlights();
      if (!t || !t.stage) return;
      // Don't insert before self
      let insertBefore = t.insertBeforeId;
      if (insertBefore === id) {
        // Dropping on self — if in left half stay, treat as no-op; use after-self as append relative
        insertBefore = nextSiblingId(document.querySelector(`.card[data-id="${CSS.escape(id)}"]`));
      }
      const changed = placeSupplier(id, t.stage, insertBefore);
      if (changed) {
        render();
        syncMutation("Saved", "Save failed");
      }
    }

    function highlightAt(x, y, dragId) {
      clearHighlights();
      const t = dropTargetAt(x, y);
      if (!t) return;
      const row = board.querySelector(`.stage-row[data-stage="${CSS.escape(t.stage)}"]`);
      if (row) row.classList.add("drag-over");
      if (t.overCard && t.overCard.dataset.id !== dragId) {
        t.overCard.classList.add(t.before ? "drop-before" : "drop-after");
      }
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

      handle.addEventListener("dragstart", (e) => {
        const card = handle.closest(".card");
        if (!card) return;
        const id = card.dataset.id;
        e.dataTransfer.setData("text/plain", id);
        e.dataTransfer.setData("application/x-sp-id", id);
        e.dataTransfer.effectAllowed = "move";
        card.classList.add("dragging");
      });
      handle.addEventListener("dragend", () => {
        board.querySelectorAll(".card.dragging").forEach((c) => c.classList.remove("dragging"));
        clearHighlights();
      });

      handle.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        if (e.pointerType === "mouse") return; // prefer HTML5 DnD for mouse
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
        highlightAt(e.clientX, e.clientY, pointerDrag.id);
      });
      handle.addEventListener("pointerup", (e) => {
        if (!pointerDrag || pointerDrag.pointerId !== e.pointerId) return;
        const { id, card, handle: h } = pointerDrag;
        try {
          h.releasePointerCapture(pointerDrag.pointerId);
        } catch (_) {}
        card.classList.remove("dragging");
        const moved = pointerDrag.moved;
        pointerDrag = null;
        if (moved) applyDrop(id, e.clientX, e.clientY);
        else clearHighlights();
      });
      handle.addEventListener("pointercancel", () => {
        if (!pointerDrag) return;
        pointerDrag.card.classList.remove("dragging");
        clearHighlights();
        pointerDrag = null;
      });
    });

    board.querySelectorAll(".stage-row").forEach((row) => {
      row.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const id =
          e.dataTransfer.types.includes("application/x-sp-id") || e.dataTransfer.types.includes("text/plain")
            ? "dragging"
            : "";
        highlightAt(e.clientX, e.clientY, id);
      });
      row.addEventListener("dragleave", (e) => {
        if (!row.contains(e.relatedTarget)) {
          row.classList.remove("drag-over");
        }
      });
      row.addEventListener("drop", (e) => {
        e.preventDefault();
        const id =
          e.dataTransfer.getData("application/x-sp-id") || e.dataTransfer.getData("text/plain");
        if (id) applyDrop(id, e.clientX, e.clientY);
        else clearHighlights();
      });
    });
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
    const stageSel = document.getElementById("f-stage");
    stageSel.innerHTML = stages
      .map(
        (st) =>
          `<option value="${escapeHtml(st.id)}" ${st.id === s.stage ? "selected" : ""}>${escapeHtml(st.label)}</option>`
      )
      .join("");
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
    s.last_updated = today();
    s.editor = "ui";
    if (newStage !== oldStage) {
      s.stage = newStage;
      s.order = nextOrderInStage(newStage);
      renumberStage(oldStage);
      renumberStage(newStage);
    }
    document.getElementById("drawer-title").textContent = s.name;
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
    const s = {
      id: newId(),
      name,
      category: document.getElementById("add-category").value.trim(),
      website: document.getElementById("add-website").value.trim(),
      contact: document.getElementById("add-contact").value.trim(),
      notes: document.getElementById("add-notes").value,
      stage: firstStage,
      order: nextOrderInStage(firstStage),
      last_updated: today(),
      editor: "ui-add",
    };
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

  async function bootstrap() {
    let data = await pullRemote();
    if (data && Array.isArray(data.suppliers)) {
      applyMeta(data);
      baseSuppliers = data.suppliers.slice();
    } else {
      data = await loadStaticFallback();
      if (data && Array.isArray(data.suppliers)) {
        applyMeta(data);
        baseSuppliers = data.suppliers.slice();
      } else {
        stages = DEFAULT_STAGES.map((s) => ({ ...s }));
        baseSuppliers = [];
        showToast("Could not load suppliers");
      }
    }
    // Ensure order fields exist
    stages.forEach((st) => renumberStage(st.id));
    render();
  }

  async function quietRefresh() {
    if (isDrawerOpen()) return;
    const remote = await pullRemote();
    if (!remote || !Array.isArray(remote.suppliers)) return;
    applyMeta(remote);
    baseSuppliers = remote.suppliers.slice();
    stages.forEach((st) => renumberStage(st.id));
    render();
  }

  function wireUi() {
    document.getElementById("btn-close")?.addEventListener("click", closeDrawer);
    document.getElementById("backdrop")?.addEventListener("click", closeDrawer);
    document.getElementById("btn-save")?.addEventListener("click", saveDrawer);
    document.getElementById("btn-remove")?.addEventListener("click", softDelete);
    document.getElementById("btn-add")?.addEventListener("click", openAddModal);
    document.getElementById("btn-add-x")?.addEventListener("click", closeAddModal);
    document.getElementById("btn-add-cancel")?.addEventListener("click", closeAddModal);
    document.getElementById("btn-add-save")?.addEventListener("click", addSupplier);
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
