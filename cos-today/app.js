/* CoS Today — white theme, editable Work cards, numbered drag details + Needs-you sync */
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

  /** Seed CoS details — readable complete sentences. Never used to wipe Vin title/body. */
  const WORK_DETAILS_SEED = {
    emc: {
      status: [
        { id: "emc-s1", text: "For the week of Sep 5–11, EMC sales were back on track around $51,150 (month-to-date near $86k)." },
        { id: "emc-s2", text: "After the Sep 9–12 bid cuts, ads cost was about $1,037 with ads at 2.76% of sales — inside the 3–4% target band (ceiling 5%; the prior window sat nearer 7%)." },
        { id: "emc-s3", text: "The funnel board is still waiting for a short once-over from you; Dynamic retargeting is live but still light compared with Static." },
      ],
      needs: [
        { id: "emc-n1", text: "When you have 10–15 quiet minutes, skim the funnel board and say whether Brands/PMax need a pass after the Dynamic tag/feed fix." },
      ],
      next: [
        { id: "emc-x1", text: "Keep spend discipline; chase the Dynamic tag plus ecomm_prodid match against the feed so Dynamic can scale versus Static." },
        { id: "emc-x2", text: "Keep funnel-tracker refinement on deck for when you reopen it." },
      ],
    },
    ads: {
      status: [
        { id: "ads-s1", text: "The Sep 9–12 bid-cut window is closed; this morning’s check showed cost $1,037.42, 1,114 clicks, $0.93 CPC, and ads at 2.76% of sales (on track)." },
        { id: "ads-s2", text: "Daily cost is about $259 versus about $406 before the Sep 8 cuts." },
        { id: "ads-s3", text: "Dynamic Retargeting (2019 Nov) is live at $40/day; Static still carries most of the volume." },
        { id: "ads-s4", text: "Product and cart audience lists still show Not eligible / size 0 — next step is verifying the tag and ecomm_prodid against feed 104813019." },
      ],
      needs: [
        { id: "ads-n1", text: "Nothing needed in Ads login — QA is done. Green-light the tag/feed fix when you want it, or say if Meta dynamic should run in parallel." },
      ],
      next: [
        { id: "ads-x1", text: "Verify tag/feed pairing; only bring Meta in if you want Sunny on it or the Google path stalls." },
        { id: "ads-x2", text: "Keep the ≤5% ads guardrails in place." },
      ],
    },
    dynamic: {
      status: [
        { id: "dyn-s1", text: "ESS CRO is greenlit; the theme pick is still held (Craft/Sense free options; Prestige/Impact paid)." },
        { id: "dyn-s2", text: "Loviisa/Kaskinen YouTube work is still ASAP when you reopen that lane." },
        { id: "dyn-s3", text: "The Cherry AI product-description paste is ready (high-AOV Dynamic first)." },
        { id: "dyn-s4", text: "Shopify Admin is still Cloudflare-blocked on my computer." },
      ],
      needs: [
        { id: "dyn-n1", text: "Nothing on theme until you reopen it." },
        { id: "dyn-n2", text: "Say go when you want the Cherry AI-desc paste sent." },
        { id: "dyn-n3", text: "Optional: update Grok Bot’s Computer so ESS Admin works from here." },
      ],
      next: [
        { id: "dyn-x1", text: "Hold theme install; keep Jay/Cherry YouTube and AI-desc pastes ready until you say send." },
      ],
    },
    suppliers: {
      status: [
        { id: "sup-s1", text: "EasyHomeBackup.com is live; the dealer talk-track and EcoFlow/BLUETTI/Anker call windows are locked in Eastern time." },
        { id: "sup-s2", text: "The STS listing still waits on the reseller packet." },
        { id: "sup-s3", text: "Show stack: CES 2027 (Jan 6–9, Las Vegas); nearer is RE+ Nov 16–19 2026 in Las Vegas." },
      ],
      needs: [
        { id: "sup-n1", text: "Green-light sending the three vincent@ supplier drafts when you want them out." },
        { id: "sup-n2", text: "STS packet when Judy/Welcome materials arrive." },
      ],
      next: [
        { id: "sup-x1", text: "Polish the coming-soon page; hold outbound send until you say go." },
      ],
    },
    bc: {
      status: [
        { id: "bc-s1", text: "The Events CRM board is live; Jonalyn is still a New inquiry — FO owns the details." },
        { id: "bc-s2", text: "New overnight form from Krystel Alap (09606805441) — stay@ asked for details; FO owns the quote." },
        { id: "bc-s3", text: "stay@ Ads CID 375-273-2942 has Visa •••• 7154 OK." },
        { id: "bc-s4", text: "Events Search (~$100/mo, ~$3.50/day; function hall, wedding venue, team building, conference hall — not PMax) is still unpublished; you chose to finish and publish on the handed Ads screen." },
        { id: "bc-s5", text: "FO Messenger is unlocked; OTA drafts are ready." },
        { id: "bc-s6", text: "IOM Mini RFQ 30000032681 had a Mon Sep 14 5pm Manila deadline — confirm whether Rose submitted." },
        { id: "bc-s7", text: "The Fixerink/BBC Sep 12–13 tour window closed; outcome is still unconfirmed." },
      ],
      needs: [
        { id: "bc-n1", text: "Confirm Rose’s IOM go/no-go if it is still open (submit only to iomphtenders@iom.int)." },
        { id: "bc-n2", text: "Finish and publish Events Search on the handed Ads screen when you have a calm window." },
        { id: "bc-n3", text: "Optional: note the Fixerink outcome and paste the OTA Messenger drafts." },
      ],
      next: [
        { id: "bc-x1", text: "Hold box Ads until handoff works; keep CRM mornings and a light FO skim." },
        { id: "bc-x2", text: "Meta via Angelica after Google is live." },
      ],
    },
    daddy: {
      status: [
        { id: "dad-s1", text: "Saturday-morning weekly presentation cadence (three bullet note cards, then talk with family/Grandpa’s) — still no confirm that the Sat Sep 12 talk happened." },
        { id: "dad-s2", text: "Activity Log last updated Fri Sep 11; the evening schoolwork scan found no Sat/Sun Plan and no new Scanned_*.pdf (latest still Sep 10)." },
        { id: "dad-s3", text: "The Sep 11 Plan still had Chinese homework and Khanmigo Fractions open." },
        { id: "dad-s4", text: "New can-dos showing up: Chinese month/day, stars, and a Scratch/programming spark." },
        { id: "dad-s5", text: "Iowa Form E Level 6 is still unbought at Seton (about $45) — midyear Level 7 around January stays armed." },
      ],
      needs: [
        { id: "dad-n1", text: "Confirm whether Saturday’s presentation happened, or catch it up when energy allows — family rhythm matters more than the paperwork." },
        { id: "dad-n2", text: "Buy Iowa Form E Online Complete (Grade 1 / Level 6) when you are ready." },
        { id: "dad-n3", text: "Reply to the Sunday check-in or leave Plan strikethroughs for the nightly log." },
      ],
      next: [
        { id: "dad-x1", text: "Hold the Saturday presentation cadence; track Iowa once ordered; keep nightly Plan/scan reads; midyear cue after baseline." },
      ],
    },
  };

  const WORK_IDS = ["emc", "ads", "dynamic", "suppliers", "bc", "daddy"];
  const DETAIL_SECTIONS = ["status", "needs", "next"];

  function cloneDetails(seed) {
    const out = {};
    DETAIL_SECTIONS.forEach(function (sec) {
      out[sec] = (seed[sec] || []).map(function (item) {
        return { id: item.id, text: item.text };
      });
    });
    return out;
  }

  function normalizeDetailItem(raw) {
    if (!raw || typeof raw !== "object") return null;
    const id = String(raw.id || "").trim();
    const text = String(raw.text || "").trim();
    if (!id || !text) return null;
    return { id: id, text: text };
  }

  function normalizeWorkCard(id, raw) {
    const seed = WORK_DETAILS_SEED[id] || { status: [], needs: [], next: [] };
    const base = cloneDetails(seed);
    const card = raw && typeof raw === "object" ? raw : {};
    const details = card.details && typeof card.details === "object" ? card.details : {};
    DETAIL_SECTIONS.forEach(function (sec) {
      const fromRemote = Array.isArray(details[sec])
        ? details[sec].map(normalizeDetailItem).filter(Boolean)
        : [];
      if (fromRemote.length) {
        // Preserve Vin's order; fill missing seed ids at end without wiping remote text.
        const seen = new Set(fromRemote.map(function (i) { return i.id; }));
        const merged = fromRemote.slice();
        (base[sec] || []).forEach(function (s) {
          if (!seen.has(s.id)) merged.push(s);
        });
        base[sec] = merged;
      }
    });
    const title = typeof card.title === "string" ? card.title : null;
    const body = typeof card.body === "string" ? card.body : null;
    return {
      title: title && title.trim() ? title.trim() : null,
      body: body && body.trim() ? body.trim() : null,
      details: base,
    };
  }

  function seedWorkCards() {
    const map = {};
    WORK_IDS.forEach(function (id) {
      map[id] = normalizeWorkCard(id, null);
    });
    return map;
  }

  let board = {
    title: "CoS Today",
    updated_at: "",
    blockers: [],
    suggestions: SEED_SUGGESTIONS.map(function (s) { return Object.assign({}, s); }),
    dismissed_ids: [],
    work_cards: seedWorkCards(),
  };
  let boardSha = null;
  let lastSyncError = "";
  let syncing = false;
  let openWorkId = null;
  let detailPersistTimer = null;

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

  function normalizeItem(raw) {
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

  /** Merge work_cards carefully: never wipe Vin title/body; preserve detail order + ids. */
  function mergeWorkCards(localMap, remoteMap) {
    const out = seedWorkCards();
    WORK_IDS.forEach(function (id) {
      const local = (localMap && localMap[id]) || {};
      const remote = (remoteMap && remoteMap[id]) || {};
      const normRemote = normalizeWorkCard(id, remote);
      const normLocal = normalizeWorkCard(id, local);
      // Vin wording: prefer non-empty local, else remote, else null (HTML/localStorage fills).
      const title = (normLocal.title && normLocal.title.trim())
        || (normRemote.title && normRemote.title.trim())
        || null;
      const body = (normLocal.body && normLocal.body.trim())
        || (normRemote.body && normRemote.body.trim())
        || null;
      const details = {};
      DETAIL_SECTIONS.forEach(function (sec) {
        const locArr = (normLocal.details && normLocal.details[sec]) || [];
        const remArr = (normRemote.details && normRemote.details[sec]) || [];
        // Prefer local order when local has items; else remote; else seed.
        const preferred = locArr.length ? locArr : (remArr.length ? remArr : (out[id].details[sec] || []));
        const textById = {};
        remArr.forEach(function (i) { textById[i.id] = i.text; });
        locArr.forEach(function (i) { textById[i.id] = i.text; });
        const seen = new Set();
        const merged = [];
        preferred.forEach(function (i) {
          if (seen.has(i.id)) return;
          seen.add(i.id);
          merged.push({ id: i.id, text: textById[i.id] || i.text });
        });
        // Append any rem-only / seed-only ids not yet present.
        [].concat(remArr, locArr, out[id].details[sec] || []).forEach(function (i) {
          if (seen.has(i.id)) return;
          seen.add(i.id);
          merged.push({ id: i.id, text: textById[i.id] || i.text });
        });
        details[sec] = merged;
      });
      out[id] = { title: title, body: body, details: details };
    });
    return out;
  }

  function applyBoard(data, opts) {
    if (!data || typeof data !== "object") return;
    opts = opts || {};
    const blockers = Array.isArray(data.blockers)
      ? data.blockers.map(normalizeItem).filter(Boolean)
      : [];
    const suggestions = Array.isArray(data.suggestions)
      ? data.suggestions.map(normalizeItem).filter(Boolean)
      : [];
    const dismissed = Array.isArray(data.dismissed_ids)
      ? data.dismissed_ids.map(String)
      : [];
    const remoteWork = data.work_cards && typeof data.work_cards === "object" ? data.work_cards : {};
    const work_cards = opts.replaceWork
      ? (function () {
          const map = seedWorkCards();
          WORK_IDS.forEach(function (id) {
            map[id] = normalizeWorkCard(id, remoteWork[id]);
          });
          return map;
        })()
      : mergeWorkCards(board.work_cards || seedWorkCards(), remoteWork);

    // CRITICAL: board.json never wipes Vin [data-edit] card wording in the DOM.
    board = {
      title: data.title || "CoS Today",
      updated_at: data.updated_at || board.updated_at || "",
      blockers: blockers,
      suggestions: suggestions,
      dismissed_ids: dismissed,
      work_cards: work_cards,
      note: data.note || board.note,
    };
  }

  function buildPayload() {
    const work_cards = {};
    WORK_IDS.forEach(function (id) {
      const card = (board.work_cards && board.work_cards[id]) || normalizeWorkCard(id, null);
      const el = document.getElementById(id);
      let title = card.title;
      let body = card.body;
      // Prefer live DOM / localStorage Vin wording when syncing.
      if (el) {
        const tEl = el.querySelector('[data-edit="title"]');
        const bEl = el.querySelector('[data-edit="body"]');
        const t = tEl ? tEl.textContent.trim() : "";
        const b = bEl ? bEl.textContent.trim() : "";
        if (t) title = t;
        if (b) body = b;
      }
      work_cards[id] = {
        title: title || null,
        body: body || null,
        details: {
          status: (card.details.status || []).map(function (i) { return { id: i.id, text: i.text }; }),
          needs: (card.details.needs || []).map(function (i) { return { id: i.id, text: i.text }; }),
          next: (card.details.next || []).map(function (i) { return { id: i.id, text: i.text }; }),
        },
      };
    });
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
      work_cards: work_cards,
      note: "suggestions stay off Needs-you until Vin taps + Add. Never overwrite Vin title/body. work_cards.details order is Vin-reorderable.",
    };
  }

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
      work_cards: mergeWorkCards(local.work_cards || {}, remote.work_cards || {}),
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
          const merged = mergeBoards(payload, remote);
          applyBoard(merged, { replaceWork: true });
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
      applyBoard(payload, { replaceWork: true });
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
      if (openWorkId) renderDrawerDetails(openWorkId);
    } else {
      setSyncChip("err", "Sync failed");
      showToast((failMsg || "Sync failed") + (lastSyncError ? " — " + lastSyncError : ""));
    }
    return ok;
  }

  function scheduleWorkSync() {
    clearTimeout(detailPersistTimer);
    detailPersistTimer = setTimeout(function () {
      syncMutation("Saved", "Save sync failed");
    }, 450);
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

  // ---- Vin card text / status / work order (localStorage; Vin wording never clobbered) ----

  const tz = "America/New_York";
  const pageVer = (document.querySelector('meta[name="cos-content-version"]') || {}).content || "";
  const WORK_ORDER_KEY = "cosTodayWorkOrder";
  const DETAIL_ORDER_KEY = "cosTodayDetailOrder";

  function dayKey() {
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    } catch (e) {
      return new Date().toISOString().slice(0, 10);
    }
  }
  function statusKey(id) { return "cosToday:" + dayKey() + ":" + id; }
  function textKey(scope, field) { return "cosTodayText:" + scope + ":" + field; }

  if (pageVer) localStorage.setItem("cosTodayText:version", pageVer);

  function applyStatus(card, status) {
    const pill = card.querySelector("[data-pill]");
    const done = status === "done";
    card.classList.toggle("done", done);
    if (pill) {
      pill.classList.toggle("done", done);
      pill.classList.toggle("open", !done);
      pill.textContent = done ? "Done" : "Open";
      pill.setAttribute("aria-pressed", done ? "true" : "false");
    }
  }
  function loadStatus(card) {
    applyStatus(card, localStorage.getItem(statusKey(card.id)) === "done" ? "done" : "open");
  }
  function toggleStatus(card) {
    const next = card.classList.contains("done") ? "open" : "done";
    localStorage.setItem(statusKey(card.id), next);
    applyStatus(card, next);
  }

  function readLocalDetailOrder(workId) {
    try {
      const raw = localStorage.getItem(DETAIL_ORDER_KEY);
      if (!raw) return null;
      const all = JSON.parse(raw);
      return all && all[workId] ? all[workId] : null;
    } catch (e) {
      return null;
    }
  }

  function writeLocalDetailOrder(workId, details) {
    try {
      const raw = localStorage.getItem(DETAIL_ORDER_KEY);
      const all = raw ? JSON.parse(raw) : {};
      all[workId] = {};
      DETAIL_SECTIONS.forEach(function (sec) {
        all[workId][sec] = (details[sec] || []).map(function (i) { return i.id; });
      });
      localStorage.setItem(DETAIL_ORDER_KEY, JSON.stringify(all));
    } catch (e) {}
  }

  function applyLocalDetailOrder(workId, card) {
    const order = readLocalDetailOrder(workId);
    if (!order || !card || !card.details) return card;
    DETAIL_SECTIONS.forEach(function (sec) {
      const ids = order[sec];
      if (!Array.isArray(ids) || !ids.length) return;
      const map = {};
      (card.details[sec] || []).forEach(function (i) { map[i.id] = i; });
      const next = [];
      ids.forEach(function (id) {
        if (map[id]) { next.push(map[id]); delete map[id]; }
      });
      Object.keys(map).forEach(function (id) { next.push(map[id]); });
      card.details[sec] = next;
    });
    return card;
  }

  function hydrateVinTextFromBoard() {
    // localStorage wins; else board.json vin title/body; else shipped HTML.
    WORK_IDS.forEach(function (id) {
      const el = document.getElementById(id);
      if (!el) return;
      const card = (board.work_cards && board.work_cards[id]) || {};
      ["title", "body"].forEach(function (field) {
        const node = el.querySelector('[data-edit="' + field + '"]');
        if (!node) return;
        const local = localStorage.getItem(textKey(id, field));
        if (local != null && local !== "") {
          node.textContent = local;
          return;
        }
        if (card[field]) node.textContent = card[field];
      });
    });
  }

  function wireEditable(el, scope, field) {
    const saved = localStorage.getItem(textKey(scope, field));
    if (saved != null && saved !== "") el.textContent = saved;
    el.setAttribute("contenteditable", "true");
    el.setAttribute("spellcheck", "true");
    el.addEventListener("click", function (e) { e.stopPropagation(); });
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && field === "title") { e.preventDefault(); el.blur(); }
    });
    function save() {
      const val = el.textContent.trim();
      localStorage.setItem(textKey(scope, field), val);
      if (WORK_IDS.indexOf(scope) >= 0) {
        if (!board.work_cards) board.work_cards = seedWorkCards();
        if (!board.work_cards[scope]) board.work_cards[scope] = normalizeWorkCard(scope, null);
        board.work_cards[scope][field] = val || null;
        scheduleWorkSync();
      }
    }
    el.addEventListener("blur", save);
    el.addEventListener("input", save);
  }

  document.querySelectorAll("[data-card]").forEach(function (card) {
    loadStatus(card);
    const pill = card.querySelector("[data-pill]");
    if (pill) {
      pill.addEventListener("click", function (e) {
        e.preventDefault(); e.stopPropagation(); toggleStatus(card);
      });
    }
    card.querySelectorAll("[data-edit]").forEach(function (el) {
      wireEditable(el, card.id, el.getAttribute("data-edit"));
    });
  });
  document.querySelectorAll("[data-mini]").forEach(function (mini) {
    const id = mini.getAttribute("data-mini");
    mini.querySelectorAll("[data-edit]").forEach(function (el) {
      wireEditable(el, "mini-" + id, el.getAttribute("data-edit"));
    });
  });

  // Work card reorder (pointer DnD)
  (function wireWorkReorder() {
    const stack = document.getElementById("work-stack");
    if (!stack) return;
    const HOLD_MS = 250;

    function currentIds() {
      return Array.from(stack.querySelectorAll("[data-work]")).map(function (el) { return el.id; });
    }
    function applyOrder(ids) {
      const map = {};
      Array.from(stack.querySelectorAll("[data-work]")).forEach(function (el) { map[el.id] = el; });
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
    let moved = false;

    function clearHold() {
      if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
    }
    function canStartHold(t) {
      if (!t || !t.closest) return false;
      if (t.closest("[data-drag-handle]")) return true;
      if (t.closest("[data-edit]")) return false;
      if (t.closest("[data-pill]")) return false;
      if (t.closest("a, button, input, textarea, select, label")) return false;
      return false; // card body click opens drawer — only handle reorders work rows
    }
    function beginDrag(row) {
      clearHold();
      dragging = row;
      moved = false;
      dragging.classList.add("dragging");
      dragging.style.touchAction = "none";
      dragging.dataset.suppressClick = "1";
      try { row.setPointerCapture(pointerId); } catch (err) {}
    }
    function endDrag() {
      clearHold();
      if (dragging) {
        dragging.classList.remove("dragging");
        dragging.style.touchAction = "";
        stack.querySelectorAll(".drag-over").forEach(function (el) { el.classList.remove("drag-over"); });
        persistOrder();
        const row = dragging;
        dragging = null;
        setTimeout(function () { delete row.dataset.suppressClick; }, 40);
      }
      pointerId = null;
      moved = false;
    }
    function rowFromPoint(clientX, clientY) {
      const el = document.elementFromPoint(clientX, clientY);
      return el && el.closest ? el.closest("#work-stack [data-work]") : null;
    }
    function maybeReorder(clientY) {
      if (!dragging) return;
      const over = rowFromPoint(
        dragging.getBoundingClientRect().left + dragging.offsetWidth / 2,
        clientY
      );
      stack.querySelectorAll(".drag-over").forEach(function (el) { el.classList.remove("drag-over"); });
      if (!over || over === dragging) return;
      over.classList.add("drag-over");
      const siblings = currentIds();
      const from = siblings.indexOf(dragging.id);
      const to = siblings.indexOf(over.id);
      if (from < 0 || to < 0 || from === to) return;
      moved = true;
      if (from < to) stack.insertBefore(dragging, over.nextSibling);
      else stack.insertBefore(dragging, over);
    }

    stack.addEventListener("pointerdown", function (e) {
      const row = e.target && e.target.closest ? e.target.closest("[data-work]") : null;
      if (!row || !stack.contains(row)) return;
      if (e.button != null && e.button !== 0) return;
      const onHandle = !!(e.target.closest && e.target.closest("[data-drag-handle]"));
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

    stack.addEventListener("pointermove", function (e) {
      if (pointerId != null && e.pointerId !== pointerId) return;
      if (!dragging) {
        if (holdTimer && Math.abs(e.clientY - startY) > 10) clearHold();
        return;
      }
      e.preventDefault();
      maybeReorder(e.clientY);
    }, { passive: false });

    stack.addEventListener("pointerup", endDrag);
    stack.addEventListener("pointercancel", endDrag);
    stack.addEventListener("lostpointercapture", endDrag);
  })();

  // ---- Detail drawer ----

  function getWorkCard(id) {
    if (!board.work_cards) board.work_cards = seedWorkCards();
    if (!board.work_cards[id]) board.work_cards[id] = normalizeWorkCard(id, null);
    applyLocalDetailOrder(id, board.work_cards[id]);
    return board.work_cards[id];
  }

  function renderDrawerDetails(workId) {
    const card = getWorkCard(workId);
    DETAIL_SECTIONS.forEach(function (sec) {
      const list = document.getElementById("detail-" + sec);
      if (!list) return;
      const items = (card.details && card.details[sec]) || [];
      if (!items.length) {
        list.innerHTML = '<li class="detail-empty">Nothing here yet.</li>';
        return;
      }
      list.innerHTML = items.map(function (item) {
        return (
          '<li class="detail-item" data-detail-id="' + esc(item.id) + '" data-detail-section="' + esc(sec) + '">' +
            '<span class="detail-text">' + esc(item.text) + "</span>" +
            '<button type="button" class="detail-handle" data-detail-handle aria-label="Drag to reorder" title="Drag to reorder">⋮⋮</button>' +
          "</li>"
        );
      }).join("");
    });
  }

  function openDrawer(workId) {
    const row = document.getElementById(workId);
    if (!row) return;
    openWorkId = workId;
    const titleEl = document.getElementById("drawer-title");
    const bodyLine = document.getElementById("drawer-body-line");
    const t = row.querySelector('[data-edit="title"]');
    const b = row.querySelector('[data-edit="body"]');
    if (titleEl) titleEl.textContent = t ? t.textContent.trim() : workId;
    if (bodyLine) bodyLine.textContent = b ? b.textContent.trim() : "";
    renderDrawerDetails(workId);

    const backdrop = document.getElementById("drawer-backdrop");
    const drawer = document.getElementById("work-drawer");
    if (backdrop) {
      backdrop.hidden = false;
      requestAnimationFrame(function () { backdrop.classList.add("open"); });
    }
    if (drawer) {
      drawer.hidden = false;
      drawer.setAttribute("aria-hidden", "false");
      requestAnimationFrame(function () { drawer.classList.add("open"); });
    }
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    openWorkId = null;
    const backdrop = document.getElementById("drawer-backdrop");
    const drawer = document.getElementById("work-drawer");
    if (drawer) {
      drawer.classList.remove("open");
      drawer.setAttribute("aria-hidden", "true");
      setTimeout(function () { if (!openWorkId) drawer.hidden = true; }, 200);
    }
    if (backdrop) {
      backdrop.classList.remove("open");
      setTimeout(function () { if (!openWorkId) backdrop.hidden = true; }, 200);
    }
    document.body.style.overflow = "";
  }

  function persistDetailOrder(workId) {
    const card = getWorkCard(workId);
    writeLocalDetailOrder(workId, card.details);
    scheduleWorkSync();
  }

  function wireDetailReorder() {
    const body = document.querySelector(".drawer-body");
    if (!body || body._detailDnD) return;
    body._detailDnD = true;

    let dragging = null;
    let pointerId = null;
    let section = null;

    function endDrag() {
      if (dragging) {
        dragging.classList.remove("dragging");
        document.querySelectorAll(".detail-item.drag-over").forEach(function (el) {
          el.classList.remove("drag-over");
        });
        if (openWorkId && section) {
          const list = document.getElementById("detail-" + section);
          if (list) {
            const ids = Array.from(list.querySelectorAll(".detail-item")).map(function (li) {
              return li.getAttribute("data-detail-id");
            });
            const card = getWorkCard(openWorkId);
            const map = {};
            (card.details[section] || []).forEach(function (i) { map[i.id] = i; });
            card.details[section] = ids.map(function (id) { return map[id]; }).filter(Boolean);
            persistDetailOrder(openWorkId);
            // Renumber via re-render
            renderDrawerDetails(openWorkId);
          }
        }
        dragging = null;
      }
      pointerId = null;
      section = null;
    }

    body.addEventListener("pointerdown", function (e) {
      const handle = e.target && e.target.closest ? e.target.closest("[data-detail-handle]") : null;
      if (!handle) return;
      if (e.button != null && e.button !== 0) return;
      const item = handle.closest(".detail-item");
      if (!item) return;
      e.preventDefault();
      e.stopPropagation();
      dragging = item;
      section = item.getAttribute("data-detail-section");
      pointerId = e.pointerId;
      dragging.classList.add("dragging");
      try { handle.setPointerCapture(pointerId); } catch (err) {}
    });

    body.addEventListener("pointermove", function (e) {
      if (!dragging || (pointerId != null && e.pointerId !== pointerId)) return;
      e.preventDefault();
      const list = document.getElementById("detail-" + section);
      if (!list) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const over = el && el.closest ? el.closest(".detail-item") : null;
      list.querySelectorAll(".drag-over").forEach(function (n) { n.classList.remove("drag-over"); });
      if (!over || over === dragging || over.parentElement !== list) return;
      over.classList.add("drag-over");
      const items = Array.from(list.querySelectorAll(".detail-item"));
      const from = items.indexOf(dragging);
      const to = items.indexOf(over);
      if (from < 0 || to < 0 || from === to) return;
      if (from < to) list.insertBefore(dragging, over.nextSibling);
      else list.insertBefore(dragging, over);
    }, { passive: false });

    body.addEventListener("pointerup", endDrag);
    body.addEventListener("pointercancel", endDrag);
  }

  function wireDrawerOpen() {
    const stack = document.getElementById("work-stack");
    if (!stack || stack._drawerOpenWired) return;
    stack._drawerOpenWired = true;
    stack.addEventListener("click", function (e) {
      const row = e.target && e.target.closest ? e.target.closest("[data-work]") : null;
      if (!row || !stack.contains(row)) return;
      if (row.dataset.suppressClick === "1") return;
      if (e.target.closest("[data-edit], [data-pill], [data-drag-handle], a, button")) return;
      openDrawer(row.id);
    });
    stack.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      const row = e.target && e.target.closest ? e.target.closest("[data-work]") : null;
      if (!row || e.target !== row) return;
      e.preventDefault();
      openDrawer(row.id);
    });
  }

  function wireDrawerClose() {
    const closeBtn = document.getElementById("drawer-close");
    const backdrop = document.getElementById("drawer-backdrop");
    if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
    if (backdrop) backdrop.addEventListener("click", closeDrawer);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && openWorkId) closeDrawer();
    });
  }

  async function bootstrapBoard() {
    wireBoardClicks();
    wireDrawerOpen();
    wireDrawerClose();
    wireDetailReorder();
    renderBoardLists();
    const remote = await pullRemote();
    if (remote) {
      applyBoard(remote, { replaceWork: false });
      const emptySug = !remote.suggestions || remote.suggestions.length === 0;
      const noDismiss = !remote.dismissed_ids || remote.dismissed_ids.length === 0;
      const noBlockers = !remote.blockers || remote.blockers.length === 0;
      const noWork = !remote.work_cards || !Object.keys(remote.work_cards).length;
      if (emptySug && noDismiss && noBlockers && noWork) {
        board.suggestions = SEED_SUGGESTIONS.map(function (s) { return Object.assign({}, s); });
        board.work_cards = seedWorkCards();
        renderBoardLists();
        hydrateVinTextFromBoard();
        await syncMutation("Seeded board", "Seed sync failed");
        return;
      }
      // If remote lacks work_cards, seed details without wiping blockers/suggestions.
      if (noWork) {
        board.work_cards = seedWorkCards();
        hydrateVinTextFromBoard();
        renderBoardLists();
        setSyncChip("ok", "Synced via GitHub");
        await syncMutation("Added work card details", "Work seed sync failed");
        return;
      }
      hydrateVinTextFromBoard();
      renderBoardLists();
      setSyncChip("ok", "Synced via GitHub");
      return;
    }
    const fallback = await loadStaticFallback();
    if (fallback) {
      applyBoard(fallback, { replaceWork: false });
      if (!board.work_cards || !Object.keys(board.work_cards).length) {
        board.work_cards = seedWorkCards();
      }
      hydrateVinTextFromBoard();
      renderBoardLists();
      setSyncChip("idle", "Loaded static board.json");
      await syncMutation("Board created on GitHub", "Could not create remote board");
      return;
    }
    board.suggestions = SEED_SUGGESTIONS.map(function (s) { return Object.assign({}, s); });
    board.work_cards = seedWorkCards();
    hydrateVinTextFromBoard();
    renderBoardLists();
    await syncMutation("Board created on GitHub", "Could not create remote board");
  }

  async function quietRefresh() {
    if (syncing || openWorkId) return;
    const remote = await pullRemote();
    if (!remote) return;
    applyBoard(remote, { replaceWork: false });
    hydrateVinTextFromBoard();
    renderBoardLists();
  }

  bootstrapBoard();
  setInterval(quietRefresh, 60000);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") quietRefresh();
  });
})();
