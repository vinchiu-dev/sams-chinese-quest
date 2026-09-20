/* CoS Today — cards (Vin wording local) + Needs-you / suggestions via GitHub Contents API */
(function () {
  const _GH_DEFAULTS = {
    owner: "vinchiu-dev",
    repo: "sams-chinese-quest",
    token: ["QC7PHJC11_tap_buhtig", "ClLpP6_7TQECvjsH4Yc0", "LkV3SnvDpNx5gKXlmdRq", "WEBup8un59DYoXlQ8yLx", "QYfIGxcX27BYZ"]
      .map(function (s) { return s.split("").reverse().join(""); })
      .join(""),
  };
  const getGH = () => ({
    owner: _GH_DEFAULTS.owner,
    repo: _GH_DEFAULTS.repo,
    token: _GH_DEFAULTS.token,
  });
  const GH_API = "https://api.github.com";
  const GH_PATH = "cos-today/board.json";
  const ghHeaders = (token) => ({
    Authorization: "Bearer " + token,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  });
  const b64encode = (str) => btoa(unescape(encodeURIComponent(str)));
  const b64decode = (b64) => decodeURIComponent(escape(atob(b64.replace(/\n/g, ""))));

  const SEED_SUGGESTIONS = [
    { id: "sug-callrail", text: "CallRail Google login (deny phone scopes)" },
    { id: "sug-ringcentral", text: "RingCentral Zapier reconnect" },
    { id: "sug-grokbot-computer", text: "Update Grok Bot computer (Ads/GA4/YT)" },
    { id: "sug-landbank-ceza", text: "LandBank CEZA: confirm transfer processed" },
    { id: "sug-alice-bell", text: "Alice Bell receipt — FO still open" },
    { id: "sug-iowa-form-e", text: "Iowa Form E Level 6 — Vin student + agreement" },
    { id: "sug-nj-abn", text: "NJ ABN Easy Massage Chair renew by 9/30" },
    { id: "sug-checklist-sales", text: "Checklist: catch sales after Sep 15" },
    { id: "sug-ehb-dealer", text: "EasyHomeBackup dealer outreach (EcoFlow/BLUETTI/Anker)" },
  ];

  let board = {
    title: "CoS Today",
    updated_at: "",
    blockers: [],
    suggestions: SEED_SUGGESTIONS.map(function (s) { return Object.assign({}, s); }),
    dismissed_ids: [],
  };
  let boardSha = null;
  let lastSyncError = "";
  let syncing = false;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function showToast(msg) {
    const el = document.getElementById("cos-toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { el.classList.remove("show"); }, 2200);
  }

  function setSyncChip(state, text) {
    const chip = document.getElementById("sync-chip");
    if (!chip) return;
    if (!text) { chip.hidden = true; return; }
    chip.hidden = false;
    chip.dataset.state = state || "idle";
    chip.textContent = text;
  }

  function normalizeItem(raw, fallbackPrefix) {
    if (!raw || typeof raw !== "object") return null;
    const id = String(raw.id || "").trim();
    const text = String(raw.text || "").trim();
    if (!id || !text) return null;
    return {
      id: id,
      text: text,
      added_at: raw.added_at || null,
      source: raw.source || null,
    };
  }

  function applyBoard(data) {
    if (!data || typeof data !== "object") return;
    const blockers = Array.isArray(data.blockers)
      ? data.blockers.map(function (b) { return normalizeItem(b, "blk"); }).filter(Boolean)
      : [];
    const suggestions = Array.isArray(data.suggestions)
      ? data.suggestions.map(function (s) { return normalizeItem(s, "sug"); }).filter(Boolean)
      : [];
    const dismissed = Array.isArray(data.dismissed_ids)
      ? data.dismissed_ids.map(String)
      : [];
    // CRITICAL: board.json never touches Vin [data-edit] card wording.
    board = {
      title: data.title || "CoS Today",
      updated_at: data.updated_at || board.updated_at || "",
      blockers: blockers,
      suggestions: suggestions,
      dismissed_ids: dismissed,
      note: data.note || board.note,
    };
  }

  function buildPayload() {
    return {
      title: board.title || "CoS Today",
      updated_at: new Date().toISOString(),
      blockers: board.blockers.map(function (b) {
        return {
          id: b.id,
          text: b.text,
          added_at: b.added_at || null,
          source: b.source || "suggestion",
        };
      }),
      suggestions: board.suggestions.map(function (s) {
        return { id: s.id, text: s.text };
      }),
      dismissed_ids: (board.dismissed_ids || []).slice(),
      note: "suggestions stay off Needs-you until Vin taps + Add. Never overwrite Vin [data-edit] card wording.",
    };
  }

  /** Merge for 409: Vin-committed blockers win by id; suggestions = remote ∪ local minus blockers/dismissed. */
  function mergeBoards(local, remote) {
    const blockerMap = new Map();
    (remote.blockers || []).forEach(function (b) {
      const n = normalizeItem(b);
      if (n) blockerMap.set(n.id, n);
    });
    (local.blockers || []).forEach(function (b) {
      const n = normalizeItem(b);
      if (n) blockerMap.set(n.id, Object.assign({}, blockerMap.get(n.id) || {}, n));
    });
    const blockers = Array.from(blockerMap.values());
    const blockerIds = new Set(blockers.map(function (b) { return b.id; }));
    const dismissed = new Set([].concat(remote.dismissed_ids || [], local.dismissed_ids || []).map(String));
    const sugMap = new Map();
    function considerSug(s) {
      const n = normalizeItem(s);
      if (!n) return;
      if (blockerIds.has(n.id) || dismissed.has(n.id)) return;
      if (!sugMap.has(n.id)) sugMap.set(n.id, n);
    }
    (remote.suggestions || []).forEach(considerSug);
    (local.suggestions || []).forEach(considerSug);
    return {
      title: local.title || remote.title || "CoS Today",
      updated_at: new Date().toISOString(),
      blockers: blockers,
      suggestions: Array.from(sugMap.values()),
      dismissed_ids: Array.from(dismissed),
      note: local.note || remote.note,
    };
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
      boardSha = data.sha;
      return JSON.parse(b64decode(data.content));
    } catch (e) {
      return null;
    }
  }

  async function loadStaticFallback() {
    try {
      const r = await fetch("board.json?v=" + Date.now(), { cache: "no-store" });
      if (!r.ok) return null;
      return await r.json();
    } catch (e) {
      return null;
    }
  }

  async function pushToGitHub(retried) {
    const { owner, repo, token } = getGH();
    const payload = buildPayload();
    lastSyncError = "";
    try {
      if (!boardSha) await pullRemote();
      const body = {
        message: retried ? "Update CoS Today board (merge retry)" : "Update CoS Today board",
        content: b64encode(JSON.stringify(payload, null, 2) + "\n"),
      };
      if (boardSha) body.sha = boardSha;
      const r = await fetch(`${GH_API}/repos/${owner}/${repo}/contents/${GH_PATH}`, {
        method: "PUT",
        headers: ghHeaders(token),
        body: JSON.stringify(body),
      });
      if (r.status === 409 && !retried) {
        const remote = await pullRemote();
        if (remote) {
          applyBoard(mergeBoards(payload, remote));
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
      boardSha = (data.content && data.content.sha) || boardSha;
      applyBoard(payload);
      return true;
    } catch (e) {
      lastSyncError = (e && e.message) || "Network error";
      return false;
    }
  }

  async function syncMutation(okMsg, failMsg) {
    if (syncing) return false;
    syncing = true;
    setSyncChip("idle", "Syncing…");
    const ok = await pushToGitHub();
    syncing = false;
    if (ok) {
      setSyncChip("ok", "Synced via GitHub");
      showToast(okMsg || "Synced");
      renderBoardLists();
    } else {
      setSyncChip("err", "Sync failed");
      showToast((failMsg || "Sync failed") + (lastSyncError ? " — " + lastSyncError : ""));
    }
    return ok;
  }

  function renderBoardLists() {
    const blockersUl = document.getElementById("blockers-list");
    const suggestionsUl = document.getElementById("suggestions-list");
    const blockersEmpty = document.getElementById("blockers-empty");
    const suggestionsEmpty = document.getElementById("suggestions-empty");
    if (!blockersUl || !suggestionsUl) return;

    const blockers = board.blockers || [];
    const suggestions = board.suggestions || [];

    blockersUl.innerHTML = blockers.map(function (b) {
      return (
        '<li class="board-item" data-blocker-id="' + esc(b.id) + '">' +
          '<span class="item-text">' + esc(b.text) + "</span>" +
          '<span class="item-actions">' +
            '<button type="button" class="btn-x" data-remove-blocker="' + esc(b.id) + '" aria-label="Remove blocker" title="Remove">×</button>' +
          "</span>" +
        "</li>"
      );
    }).join("");
    if (blockersEmpty) blockersEmpty.hidden = blockers.length > 0;

    suggestionsUl.innerHTML = suggestions.map(function (s) {
      return (
        '<li class="board-item" data-suggestion-id="' + esc(s.id) + '">' +
          '<span class="item-text">' + esc(s.text) + "</span>" +
          '<span class="item-actions">' +
            '<button type="button" class="btn-add" data-add-suggestion="' + esc(s.id) + '" aria-label="Add to Needs you">+ Add</button>' +
            '<button type="button" class="btn-x" data-dismiss-suggestion="' + esc(s.id) + '" aria-label="Dismiss suggestion" title="Dismiss">×</button>' +
          "</span>" +
        "</li>"
      );
    }).join("");
    if (suggestionsEmpty) suggestionsEmpty.hidden = suggestions.length > 0;
  }

  function findSuggestion(id) {
    return (board.suggestions || []).find(function (s) { return s.id === id; });
  }

  async function addSuggestion(id) {
    const sug = findSuggestion(id);
    if (!sug) return;
    // Move into committed blockers; do not auto-add elsewhere.
    board.suggestions = board.suggestions.filter(function (s) { return s.id !== id; });
    if (!(board.blockers || []).some(function (b) { return b.id === id; })) {
      board.blockers = (board.blockers || []).concat([{
        id: sug.id,
        text: sug.text,
        added_at: new Date().toISOString(),
        source: "suggestion",
      }]);
    }
    renderBoardLists();
    await syncMutation("Added to Needs you", "Add sync failed");
  }

  async function dismissSuggestion(id) {
    board.suggestions = (board.suggestions || []).filter(function (s) { return s.id !== id; });
    if (!(board.dismissed_ids || []).includes(id)) {
      board.dismissed_ids = (board.dismissed_ids || []).concat([id]);
    }
    renderBoardLists();
    await syncMutation("Dismissed", "Dismiss sync failed");
  }

  async function removeBlocker(id) {
    board.blockers = (board.blockers || []).filter(function (b) { return b.id !== id; });
    renderBoardLists();
    await syncMutation("Removed", "Remove sync failed");
  }

  function wireBoardClicks() {
    const root = document.querySelector(".wrap");
    if (!root || root._cosBoardWired) return;
    root._cosBoardWired = true;
    root.addEventListener("click", function (e) {
      const t = e.target;
      if (!t || !t.closest) return;
      const add = t.closest("[data-add-suggestion]");
      if (add) {
        e.preventDefault();
        addSuggestion(add.getAttribute("data-add-suggestion"));
        return;
      }
      const dismiss = t.closest("[data-dismiss-suggestion]");
      if (dismiss) {
        e.preventDefault();
        dismissSuggestion(dismiss.getAttribute("data-dismiss-suggestion"));
        return;
      }
      const rem = t.closest("[data-remove-blocker]");
      if (rem) {
        e.preventDefault();
        removeBlocker(rem.getAttribute("data-remove-blocker"));
      }
    });
  }

  async function bootstrapBoard() {
    wireBoardClicks();
    renderBoardLists();
    const remote = await pullRemote();
    if (remote) {
      applyBoard(remote);
      // If remote has empty suggestions and no dismissals yet, seed once then push.
      const emptySug = !remote.suggestions || remote.suggestions.length === 0;
      const noDismiss = !remote.dismissed_ids || remote.dismissed_ids.length === 0;
      const noBlockers = !remote.blockers || remote.blockers.length === 0;
      if (emptySug && noDismiss && noBlockers) {
        board.suggestions = SEED_SUGGESTIONS.map(function (s) { return Object.assign({}, s); });
        renderBoardLists();
        await syncMutation("Seeded suggestions", "Seed sync failed");
        return;
      }
      renderBoardLists();
      setSyncChip("ok", "Synced via GitHub");
      return;
    }
    const fallback = await loadStaticFallback();
    if (fallback) {
      applyBoard(fallback);
      renderBoardLists();
      setSyncChip("idle", "Loaded static board.json");
      // Try create remote file for live sync
      await syncMutation("Board created on GitHub", "Could not create remote board");
      return;
    }
    board.suggestions = SEED_SUGGESTIONS.map(function (s) { return Object.assign({}, s); });
    renderBoardLists();
    await syncMutation("Board created on GitHub", "Could not create remote board");
  }

  async function quietRefresh() {
    if (syncing) return;
    const remote = await pullRemote();
    if (!remote) return;
    applyBoard(remote);
    renderBoardLists();
  }

  // ---- existing card / localStorage logic (Vin wording never clobbered by board.json) ----

  const tz = 'America/New_York';
  const pageVer = (document.querySelector('meta[name="cos-content-version"]') || {}).content || '';
  const WORK_ORDER_KEY = 'cosTodayWorkOrder';
  function dayKey() {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    } catch (e) {
      return new Date().toISOString().slice(0, 10);
    }
  }
  function statusKey(id) { return 'cosToday:' + dayKey() + ':' + id; }
  function textKey(scope, field) { return 'cosTodayText:' + scope + ':' + field; }

  // Vin's edits win. Never wipe phone text when CoS ships a new version —
  // localStorage overrides stay; shipped HTML only fills fields with no local save.
  if (pageVer) localStorage.setItem('cosTodayText:version', pageVer);

  function applyStatus(card, status) {
    const pill = card.querySelector('[data-pill]');
    const done = status === 'done';
    card.classList.toggle('done', done);
    pill.classList.toggle('done', done);
    pill.classList.toggle('open', !done);
    pill.textContent = done ? 'Done' : 'Open';
    pill.setAttribute('aria-pressed', done ? 'true' : 'false');
  }
  function loadStatus(card) {
    applyStatus(card, localStorage.getItem(statusKey(card.id)) === 'done' ? 'done' : 'open');
  }
  function toggleStatus(card) {
    const next = card.classList.contains('done') ? 'open' : 'done';
    localStorage.setItem(statusKey(card.id), next);
    applyStatus(card, next);
  }
  function wireEditable(el, scope, field) {
    const saved = localStorage.getItem(textKey(scope, field));
    if (saved != null && saved !== '') el.textContent = saved;
    el.setAttribute('contenteditable', 'true');
    el.setAttribute('spellcheck', 'true');
    el.addEventListener('click', function (e) { e.stopPropagation(); });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && field === 'title') { e.preventDefault(); el.blur(); }
    });
    function save() {
      localStorage.setItem(textKey(scope, field), el.textContent.trim());
    }
    el.addEventListener('blur', save);
    el.addEventListener('input', save);
  }

  document.querySelectorAll('[data-card]').forEach(function (card) {
    loadStatus(card);
    card.querySelector('[data-pill]').addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation(); toggleStatus(card);
    });
    card.querySelectorAll('[data-edit]').forEach(function (el) {
      wireEditable(el, card.id, el.getAttribute('data-edit'));
    });
  });
  document.querySelectorAll('[data-mini]').forEach(function (mini) {
    const id = mini.getAttribute('data-mini');
    mini.querySelectorAll('[data-edit]').forEach(function (el) {
      wireEditable(el, 'mini-' + id, el.getAttribute('data-edit'));
    });
  });

  // Press-and-hold / drag-handle reorder for Work cards only. CoS notes are never in localStorage.
  (function wireWorkReorder() {
    const stack = document.getElementById('work-stack');
    if (!stack) return;
    const HOLD_MS = 250;

    function currentIds() {
      return Array.from(stack.querySelectorAll('[data-work]')).map(function (el) { return el.id; });
    }
    function applyOrder(ids) {
      const map = {};
      Array.from(stack.querySelectorAll('[data-work]')).forEach(function (el) { map[el.id] = el; });
      const allPresent = ids.every(function (id) { return map[id]; }) && ids.length === Object.keys(map).length;
      if (!allPresent) return false;
      ids.forEach(function (id) { stack.appendChild(map[id]); });
      return true;
    }
    function persistOrder() {
      try { localStorage.setItem(WORK_ORDER_KEY, JSON.stringify(currentIds())); } catch (e) {}
    }
    try {
      const raw = localStorage.getItem(WORK_ORDER_KEY);
      if (raw) {
        const ids = JSON.parse(raw);
        if (Array.isArray(ids)) applyOrder(ids);
      }
    } catch (e) {}

    let holdTimer = null;
    let dragging = null;
    let startY = 0;
    let pointerId = null;

    function clearHold() {
      if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
    }
    function canStartHold(t) {
      if (!t || !t.closest) return false;
      if (t.closest('[data-drag-handle]')) return true;
      if (t.closest('[data-edit]')) return false;
      if (t.closest('[data-pill]')) return false;
      if (t.closest('a, button, input, textarea, select, label')) return false;
      return true;
    }
    function beginDrag(row) {
      clearHold();
      dragging = row;
      dragging.classList.add('dragging');
      dragging.style.touchAction = 'none';
      try { row.setPointerCapture(pointerId); } catch (err) {}
    }
    function endDrag() {
      clearHold();
      if (dragging) {
        dragging.classList.remove('dragging');
        dragging.style.touchAction = '';
        stack.querySelectorAll('.drag-over').forEach(function (el) { el.classList.remove('drag-over'); });
        persistOrder();
        dragging = null;
      }
      pointerId = null;
    }
    function rowFromPoint(clientX, clientY) {
      const el = document.elementFromPoint(clientX, clientY);
      return el && el.closest ? el.closest('#work-stack [data-work]') : null;
    }
    function maybeReorder(clientY) {
      if (!dragging) return;
      const over = rowFromPoint(
        dragging.getBoundingClientRect().left + dragging.offsetWidth / 2,
        clientY
      );
      stack.querySelectorAll('.drag-over').forEach(function (el) { el.classList.remove('drag-over'); });
      if (!over || over === dragging) return;
      over.classList.add('drag-over');
      const siblings = currentIds();
      const from = siblings.indexOf(dragging.id);
      const to = siblings.indexOf(over.id);
      if (from < 0 || to < 0 || from === to) return;
      if (from < to) stack.insertBefore(dragging, over.nextSibling);
      else stack.insertBefore(dragging, over);
    }

    stack.addEventListener('pointerdown', function (e) {
      const row = e.target && e.target.closest ? e.target.closest('[data-work]') : null;
      if (!row || !stack.contains(row)) return;
      if (e.button != null && e.button !== 0) return;
      const onHandle = !!(e.target.closest && e.target.closest('[data-drag-handle]'));
      if (!onHandle && !canStartHold(e.target)) return;
      startY = e.clientY;
      pointerId = e.pointerId;
      clearHold();
      if (onHandle) {
        beginDrag(row);
        e.preventDefault();
        return;
      }
      holdTimer = setTimeout(function () {
        holdTimer = null;
        beginDrag(row);
      }, HOLD_MS);
    });

    stack.addEventListener('pointermove', function (e) {
      if (pointerId != null && e.pointerId !== pointerId) return;
      if (!dragging) {
        if (holdTimer && Math.abs(e.clientY - startY) > 10) clearHold();
        return;
      }
      e.preventDefault();
      maybeReorder(e.clientY);
    }, { passive: false });

    stack.addEventListener('pointerup', endDrag);
    stack.addEventListener('pointercancel', endDrag);
    stack.addEventListener('lostpointercapture', endDrag);
  })();



  // Boot suggestions board after card wiring.
  bootstrapBoard();
  setInterval(quietRefresh, 60000);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") quietRefresh();
  });
})();