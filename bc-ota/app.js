/* Blue Coast OTA growth board — fetch LAST-RUN.json and render */
(function () {
  "use strict";

  var DATA_URL = "LAST-RUN.json";
  var $app = document.getElementById("app");

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function isNil(v) {
    return v === null || v === undefined || v === "";
  }

  function fmtInt(v) {
    if (isNil(v) || Number.isNaN(Number(v))) return null;
    return Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 });
  }

  function fmtPhp(v) {
    if (isNil(v) || Number.isNaN(Number(v))) return null;
    var n = Number(v);
    var opts = Math.abs(n) >= 10000
      ? { maximumFractionDigits: 0 }
      : { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 };
    return "₱" + n.toLocaleString("en-US", opts);
  }

  function fmtPct(v) {
    if (isNil(v) || Number.isNaN(Number(v))) return null;
    var n = Number(v);
    /* Accept ratio (-1.5..1.5) or already-percent */
    var pct = Math.abs(n) <= 1.5 ? n * 100 : n;
    var sign = pct > 0 ? "+" : "";
    return sign + pct.toFixed(Math.abs(pct) >= 10 ? 0 : 1) + "%";
  }

  function displayVal(s) {
    if (s == null) return '<span class="val unk">Unknown</span>';
    return '<span class="val">' + esc(s) + "</span>";
  }

  function normStatus(s) {
    if (!s) return "unknown";
    var x = String(s).toLowerCase();
    if (x === "green" || x === "steady") return "steady";
    if (x === "yellow") return "yellow";
    if (x === "red") return "red";
    return "unknown";
  }

  function pill(status, label) {
    var n = normStatus(status);
    var text = label || (
      n === "steady" ? "✓ Steady" :
      n === "yellow" ? "Yellow" :
      n === "red" ? "Red" : "Unknown"
    );
    return '<span class="pill ' + n + '">' + esc(text) + "</span>";
  }

  function deltaLine(m) {
    if (!m) return "WoW — · YoY —";
    var bits = [];
    bits.push("WoW " + (fmtPct(m.wow_pct) || "—"));
    bits.push("YoY " + (fmtPct(m.yoy_pct) || "—"));
    return bits.join(" · ");
  }

  function winLabel(w) {
    if (!w || !w.start_et || !w.end_et) return "not set";
    return w.start_et.replace(/^\d{4}-/, "") + " → " + w.end_et.replace(/^\d{4}-/, "");
  }

  function channelMetric(ch, key, kind) {
    var m = (ch && ch[key]) || null;
    var last = m ? m.last_7d : null;
    var prior = m ? m.prior_7d : null;
    var yoy = m ? m.yoy_7d : null;
    var fmt = kind === "php" ? fmtPhp : fmtInt;
    return {
      last: fmt(last),
      prior: fmt(prior),
      yoy: fmt(yoy),
      delta: deltaLine(m),
      status: m && m.status
    };
  }

  function kpiRow(label, ch, kind) {
    var b = channelMetric(ch, "bookings", "count");
    var r = channelMetric(ch, "gross_revenue_php", "php");
    var show = kind === "bookings" ? b : r;
    var title = kind === "bookings" ? "Bookings" : "Gross room ₱";
    return (
      '<div class="kpi">' +
        '<div class="kpi-head">' +
          '<span class="kpi-ch">' + esc(label) + "</span>" +
          '<span class="kpi-kind">' + esc(title) + "</span>" +
          pill(show.status) +
        "</div>" +
        '<div class="kpi-grid">' +
          '<div class="kpi-cell">' +
            '<div class="lab">Last 7d</div>' + displayVal(show.last) +
          "</div>" +
          '<div class="kpi-cell">' +
            '<div class="lab">Prior 7d</div>' + displayVal(show.prior) +
          "</div>" +
          '<div class="kpi-cell">' +
            '<div class="lab">YoY 7d</div>' + displayVal(show.yoy) +
          "</div>" +
        "</div>" +
        '<div class="delta">' + esc(show.delta) + "</div>" +
      "</div>"
    );
  }

  function weeklyChart(series) {
    var w = 560, h = 140, pL = 28, pR = 10, pT = 14, pB = 28;
    var innerW = w - pL - pR, innerH = h - pT - pB;
    var rows = series || [];
    var nums = [];
    rows.forEach(function (row) {
      ["total_bookings", "agoda_bookings", "booking_bookings"].forEach(function (k) {
        if (!isNil(row[k]) && !Number.isNaN(Number(row[k]))) nums.push(Number(row[k]));
      });
    });
    if (!rows.length || !nums.length) {
      return (
        '<div class="chart">' +
          '<div class="chart-title">Trailing ~12 weeks · booking count</div>' +
          '<p class="chart-cap">Unknown — fill weekly_series[] when data is present</p>' +
          '<svg class="spark" viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="xMidYMid meet">' +
            '<line x1="' + pL + '" y1="' + (pT + innerH / 2) + '" x2="' + (w - pR) + '" y2="' + (pT + innerH / 2) + '" stroke="#cbd5e1" stroke-dasharray="5 5" stroke-width="1.5"/>' +
          "</svg>" +
        "</div>"
      );
    }
    var min = 0;
    var max = Math.max.apply(null, nums.concat([1]));
    var span = max - min || 1;
    var n = Math.max(rows.length - 1, 1);

    function pathFor(key, color) {
      var d = "", drawing = false;
      rows.forEach(function (row, i) {
        var v = row[key];
        if (isNil(v) || Number.isNaN(Number(v))) { drawing = false; return; }
        var x = pL + (i / n) * innerW;
        var y = pT + innerH - ((Number(v) - min) / span) * innerH;
        d += (drawing ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1) + " ";
        drawing = true;
      });
      if (!d) return "";
      return '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>';
    }

    var first = rows[0] && rows[0].week_start_et ? rows[0].week_start_et : "";
    var last = rows[rows.length - 1] && rows[rows.length - 1].week_end_et
      ? rows[rows.length - 1].week_end_et
      : (rows[rows.length - 1] && rows[rows.length - 1].week_start_et) || "";

    return (
      '<div class="chart">' +
        '<div class="chart-title">Trailing ~12 weeks · booking count</div>' +
        '<p class="chart-cap">' + esc((first || "start") + " → " + (last || "end")) +
          ' · <span class="leg agoda">Agoda</span> · <span class="leg booking">Booking.com</span> · <span class="leg total">Total</span></p>' +
        '<svg class="spark" viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="xMidYMid meet">' +
          pathFor("agoda_bookings", "#0ea5e9") +
          pathFor("booking_bookings", "#1E71A7") +
          pathFor("total_bookings", "#0f3d5c") +
        "</svg>" +
      "</div>"
    );
  }

  function revenueChart(series) {
    var w = 560, h = 140, pL = 36, pR = 10, pT = 14, pB = 28;
    var innerW = w - pL - pR, innerH = h - pT - pB;
    var rows = series || [];
    var nums = [];
    rows.forEach(function (row) {
      ["total_revenue_php", "agoda_revenue_php", "booking_revenue_php"].forEach(function (k) {
        if (!isNil(row[k]) && !Number.isNaN(Number(row[k]))) nums.push(Number(row[k]));
      });
    });
    if (!rows.length || !nums.length) {
      return (
        '<div class="chart">' +
          '<div class="chart-title">Trailing ~12 weeks · gross room ₱</div>' +
          '<p class="chart-cap">Unknown — fill weekly_series[] revenue fields when present</p>' +
          '<svg class="spark" viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="xMidYMid meet">' +
            '<line x1="' + pL + '" y1="' + (pT + innerH / 2) + '" x2="' + (w - pR) + '" y2="' + (pT + innerH / 2) + '" stroke="#cbd5e1" stroke-dasharray="5 5" stroke-width="1.5"/>' +
          "</svg>" +
        "</div>"
      );
    }
    var min = 0;
    var max = Math.max.apply(null, nums.concat([1]));
    var span = max - min || 1;
    var n = Math.max(rows.length - 1, 1);
    var barW = Math.max(4, (innerW / rows.length) * 0.55);

    var bars = rows.map(function (row, i) {
      var v = row.total_revenue_php;
      if (isNil(v) || Number.isNaN(Number(v))) return "";
      var x = pL + (i / Math.max(rows.length - 1, 1)) * innerW - barW / 2;
      if (rows.length === 1) x = pL + innerW / 2 - barW / 2;
      var bh = (Number(v) / span) * innerH;
      var y = pT + innerH - bh;
      return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + barW.toFixed(1) +
        '" height="' + Math.max(bh, 1).toFixed(1) + '" rx="2" fill="#1E71A7" opacity="0.85"/>';
    }).join("");

    return (
      '<div class="chart">' +
        '<div class="chart-title">Trailing ~12 weeks · gross room ₱ (total)</div>' +
        '<p class="chart-cap">Bar height = weekly total Agoda + Booking.com</p>' +
        '<svg class="spark" viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="xMidYMid meet">' +
          bars +
        "</svg>" +
      "</div>"
    );
  }

  function statusBadge(st) {
    var s = (st || "unknown").toLowerCase();
    var cls = "st-" + (s === "confirmed" ? "ok" : s === "cancelled" ? "bad" : s === "modified" ? "warn" : "unk");
    return '<span class="st ' + cls + '">' + esc(st || "unknown") + "</span>";
  }

  function channelBadge(ch) {
    var c = String(ch || "").toLowerCase();
    var label = c === "agoda" ? "Agoda" : c === "booking" ? "Booking.com" : (ch || "—");
    var cls = c === "agoda" ? "ch-agoda" : c === "booking" ? "ch-booking" : "ch-unk";
    return '<span class="ch ' + cls + '">' + esc(label) + "</span>";
  }

  function bookingsTable(rows) {
    if (!rows || !rows.length) {
      return '<p class="empty">No recent bookings yet — awaiting Gmail seed.</p>';
    }
    var head =
      "<thead><tr>" +
      "<th>Date</th><th>Channel</th><th>Guest / ref</th><th>Nights</th><th>Amount ₱</th><th>Status</th>" +
      "</tr></thead>";
    var body = rows.map(function (b) {
      var guest = b.guest || "";
      var ref = b.ref || "";
      var who = guest && ref ? guest + " · " + ref : (guest || ref || "—");
      return (
        "<tr>" +
          "<td>" + esc(b.date_et || "—") + "</td>" +
          "<td>" + channelBadge(b.channel) + "</td>" +
          "<td>" + esc(who) + "</td>" +
          "<td>" + esc(isNil(b.nights) ? "—" : String(b.nights)) + "</td>" +
          "<td>" + esc(fmtPhp(b.amount_php) || "—") + "</td>" +
          "<td>" + statusBadge(b.status) + "</td>" +
        "</tr>"
      );
    }).join("");
    return '<div class="table-wrap"><table>' + head + "<tbody>" + body + "</tbody></table></div>";
  }

  function render(data) {
    var w = data.windows || {};
    var ch = data.channels || {};
    var refreshed = data.last_run_at_et
      ? data.last_run_at_et
      : "never (scaffold — awaiting first pull)";
    var blockers = data.blockers || [];
    var sources = data.sources_pulled || [];
    var statuses = data.statuses || {};

    var html = "";
    html +=
      '<header class="hero">' +
        '<div class="brand-row">' +
          '<img class="logo" src="blue-coast-logo.png" alt="Blue Coast Beach Hotel" width="48" height="48"/>' +
          "<div>" +
            "<h1>Blue Coast OTA growth</h1>" +
            '<p class="sub">Agoda + Booking.com · gross room revenue ₱ · static glance board</p>' +
          "</div>" +
        "</div>" +
        '<div class="meta">' +
          '<span class="chip">Last 7d <strong>' + esc(winLabel(w.last_7d)) + "</strong></span>" +
          '<span class="chip">Prior 7d <strong>' + esc(winLabel(w.prior_7d)) + "</strong></span>" +
          '<span class="chip">YoY 7d <strong>' + esc(winLabel(w.yoy_7d)) + "</strong></span>" +
          '<span class="chip">Overall ' + pill(statuses.overall) + "</span>" +
        "</div>" +
      "</header>";

    html +=
      '<div class="banner">' +
        "Data from <code>LAST-RUN.json</code> · last refreshed <strong>" + esc(refreshed) + "</strong>" +
        (sources.length ? " · sources: " + esc(sources.join(", ")) : " · sources: none yet") +
      "</div>";

    if (blockers.length) {
      html +=
        '<section class="card warn">' +
          '<div class="section-label">Blockers</div>' +
          "<ul class=\"blockers\">" +
          blockers.map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("") +
          "</ul>" +
        "</section>";
    }

    html += '<div class="section-label">Booking count</div>';
    html += '<div class="kpi-stack">';
    html += kpiRow((ch.total && ch.total.label) || "Total", ch.total, "bookings");
    html += kpiRow((ch.agoda && ch.agoda.label) || "Agoda", ch.agoda, "bookings");
    html += kpiRow((ch.booking && ch.booking.label) || "Booking.com", ch.booking, "bookings");
    html += "</div>";

    html += '<div class="section-label">Gross room revenue (₱)</div>';
    html += '<div class="kpi-stack">';
    html += kpiRow((ch.total && ch.total.label) || "Total", ch.total, "revenue");
    html += kpiRow((ch.agoda && ch.agoda.label) || "Agoda", ch.agoda, "revenue");
    html += kpiRow((ch.booking && ch.booking.label) || "Booking.com", ch.booking, "revenue");
    html += "</div>";

    html += '<div class="section-label">Weekly trend</div>';
    html += '<div class="charts">';
    html += weeklyChart(data.weekly_series);
    html += revenueChart(data.weekly_series);
    html += "</div>";

    html +=
      '<section class="card">' +
        '<div class="section-label in-card">Recent bookings</div>' +
        bookingsTable(data.bookings) +
      "</section>";

    html +=
      '<p class="footer">Blue Coast Beach Hotel · OTA Agoda + Booking.com · ' +
      '<a href="WEEKLY-PLAYBOOK.md">Weekly playbook</a> · no third-party analytics</p>';

    $app.innerHTML = html;
  }

  function fail(err) {
    $app.innerHTML =
      '<p class="boot">Could not load LAST-RUN.json. ' +
      esc(err && err.message ? err.message : String(err)) + "</p>";
  }

  fetch(DATA_URL + "?t=" + Date.now(), { cache: "no-store" })
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(render)
    .catch(fail);
})();
