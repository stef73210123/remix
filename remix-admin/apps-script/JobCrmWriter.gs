/**
 * Job-Search CRM sheet writer — Google Apps Script web app.
 *
 * Lets the Vercel Cron job scan append new firms to the sheet from the cloud,
 * with no Google Cloud service account. The script runs AS YOU (the sheet
 * owner), so it can write natively (and later create Gmail drafts).
 *
 * SETUP (one time):
 *   1. Open the sheet -> Extensions -> Apps Script.
 *   2. Paste this file's contents over the default Code.gs.
 *   3. Set SECRET below to a long random string (keep a copy).
 *   4. Deploy -> New deployment -> type "Web app":
 *        - Execute as: Me
 *        - Who has access: Anyone
 *      Deploy, authorize, and copy the Web app URL (ends in /exec).
 *   5. In the remix-admin Vercel project add env vars:
 *        SHEET_WRITE_URL    = <the /exec URL>
 *        SHEET_WRITE_SECRET = <the same SECRET string>
 *
 * The sheet's first tab must have header row:
 *   Category | Firm | Tier | Status | Email | City | Contact | Web
 */

var SECRET = 'CHANGE_ME_to_a_long_random_string';
var SHEET_ID = '1J6xTfgjgrngbA_xGv_V3ddbIHo_IA7X8p5wCG8iQyF8';
var HEADER = ['Category', 'Firm', 'Tier', 'Status', 'Email', 'City', 'Contact', 'Web'];

function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    if (body.secret !== SECRET) {
      return _json({ error: 'unauthorized' });
    }
    var rows = body.rows || [];
    if (!rows.length) return _json({ appended: 0 });

    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheets()[0];

    // Build a set of existing "category|firm" keys to avoid duplicates.
    var existing = {};
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var cat = String(data[i][0] || '').trim().toLowerCase();
      var firm = String(data[i][1] || '').trim().toLowerCase();
      if (firm) existing[cat + '|' + firm] = true;
    }

    var toAppend = [];
    for (var j = 0; j < rows.length; j++) {
      var r = rows[j];
      var cat = String(r.category || '').trim();
      var firm = String(r.firm || '').trim();
      if (!firm || !cat) continue;
      var key = cat.toLowerCase() + '|' + firm.toLowerCase();
      if (existing[key]) continue;
      existing[key] = true;
      toAppend.push([
        cat,
        firm,
        String(r.tier || ''),
        String(r.status || 'Backlog'),
        String(r.email || ''),
        String(r.city || ''),
        String(r.contact || ''),
        String(r.web || ''),
      ]);
    }

    if (toAppend.length) {
      var start = sheet.getLastRow() + 1;
      sheet
        .getRange(start, 1, toAppend.length, HEADER.length)
        .setValues(toAppend);
    }
    return _json({ appended: toAppend.length });
  } catch (err) {
    return _json({ error: String(err) });
  }
}

// Optional: quick manual check that the deployment works.
function doGet() {
  return _json({ ok: true, service: 'JobCrmWriter' });
}
