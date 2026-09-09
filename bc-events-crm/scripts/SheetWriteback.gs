/**
 * BC Events CRM — Shared Sheet write-back (Apps Script)
 *
 * Deploy: see scripts/DEPLOY-WRITEBACK.md
 * Spreadsheet: BC Events CRM — synced ledger
 *
 * Browser fetch tip: use Content-Type text/plain (JSON body) + mode:"cors"
 * so Google does not require an OPTIONS preflight. Deploy web app as Anyone.
 */

var SHEET_ID = "1jDADtI5y_HMxnBS4j-scUjF9NXePoK9ybOQM7Ud0f1Y";

/** Columns we may write when present in the POST body (merge — never blank omitted fields). */
var WRITABLE = [
  "name",
  "org",
  "stage",
  "marketing_channel",
  "revenue_php",
  "fo_notes",
  "lost_reason",
  "last_updated",
  "editor",
];

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function doGet(e) {
  return jsonOut_({ ok: true, service: "bc-events-crm-writeback" });
}

/**
 * Apps Script web apps do not expose a real OPTIONS handler for CORS preflight.
 * Prefer browser POST with Content-Type: text/plain;charset=utf-8 (simple request).
 * Deploy as Execute as: Me, Who has access: Anyone.
 */
function doOptions(e) {
  return jsonOut_({ ok: true });
}

function doPost(e) {
  try {
    var raw =
      e && e.postData && e.postData.contents != null ? e.postData.contents : "";
    if (!raw) {
      return jsonOut_({ ok: false, error: "empty body" });
    }
    var body = JSON.parse(raw);
    var leadId = body && body.lead_id != null ? String(body.lead_id).trim() : "";
    if (!leadId) {
      return jsonOut_({ ok: false, error: "lead_id required" });
    }

    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheets()[0];
    var values = sheet.getDataRange().getValues();
    if (!values.length) {
      return jsonOut_({ ok: false, error: "sheet empty" });
    }

    var headers = values[0].map(function (h) {
      return String(h == null ? "" : h).trim();
    });
    var leadCol = headers.indexOf("lead_id");
    if (leadCol < 0) {
      return jsonOut_({ ok: false, error: "lead_id column missing" });
    }

    var rowIndex = -1; // 0-based in values[]; sheet row = rowIndex + 1
    for (var r = 1; r < values.length; r++) {
      var cell = values[r][leadCol];
      if (String(cell == null ? "" : cell).trim() === leadId) {
        rowIndex = r;
        break;
      }
    }

    if (rowIndex < 0) {
      // Append: only set lead_id + fields present in POST
      var newRow = headers.map(function () {
        return "";
      });
      newRow[leadCol] = leadId;
      for (var i = 0; i < WRITABLE.length; i++) {
        var key = WRITABLE[i];
        if (!Object.prototype.hasOwnProperty.call(body, key)) continue;
        var col = headers.indexOf(key);
        if (col < 0) continue;
        newRow[col] = normalizeCell_(key, body[key]);
      }
      sheet.appendRow(newRow);
    } else {
      // Update: only overwrite columns present in POST (never wipe omitted fields)
      var sheetRow = rowIndex + 1;
      for (var j = 0; j < WRITABLE.length; j++) {
        var k = WRITABLE[j];
        if (!Object.prototype.hasOwnProperty.call(body, k)) continue;
        var c = headers.indexOf(k);
        if (c < 0) continue;
        sheet.getRange(sheetRow, c + 1).setValue(normalizeCell_(k, body[k]));
      }
    }

    return jsonOut_({ ok: true });
  } catch (err) {
    return jsonOut_({
      ok: false,
      error: String(err && err.message ? err.message : err),
    });
  }
}

function normalizeCell_(key, value) {
  if (value == null) return "";
  if (key === "revenue_php") {
    if (value === "" || value === null) return "";
    var n = Number(value);
    return isFinite(n) ? n : String(value);
  }
  return value;
}
