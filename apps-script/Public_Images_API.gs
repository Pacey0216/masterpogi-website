/**
 * Public read-only image endpoint for storefront variant galleries.
 * POST body: {"action":"variantImages","sku":"BATGIRL-40-JP"}
 *
 * Returns only public image URLs from Product Images.
 * Internal fields such as Box ID and folder IDs are never returned.
 */
function doPost(e) {
  try {
    const payload = imgApiPayload_(e);
    if (String(payload.action || '') !== 'variantImages') {
      return imgApiJson_({ success: false, images: [], error: 'Unsupported action' });
    }

    const sku = String(payload.sku || '').trim();
    if (!sku) return imgApiJson_({ success: false, images: [], error: 'Variant SKU is required' });

    const ss = SpreadsheetApp.openById(INVENTORY_SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Product Images');
    if (!sheet || sheet.getLastRow() < 2) return imgApiJson_({ success: true, sku: sku, images: [] });

    const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 15).getDisplayValues();
    const key = imgApiKey_(sku);
    const rows = [];

    values.forEach(row => {
      const variantSku = imgApiKey_(row[1]);
      const imageType = imgApiKey_(row[6]);
      const active = imgApiKey_(row[11]);
      const url = String(row[9] || '').trim();
      if (variantSku !== key || imageType !== 'live' || ['no', 'false', '0', 'inactive'].includes(active) || !url) return;
      rows.push({ order: Number(row[7] || 0), url: url });
    });

    rows.sort((a, b) => a.order - b.order);
    return imgApiJson_({ success: true, sku: sku, images: rows.slice(0, 5).map(x => x.url) });
  } catch (error) {
    console.error(error);
    return imgApiJson_({ success: false, images: [], error: String(error && error.message ? error.message : error) });
  }
}

function imgApiPayload_(e) {
  if (!e) return {};
  if (e.postData && e.postData.contents) {
    try { return JSON.parse(e.postData.contents); } catch (err) {}
  }
  return e.parameter || {};
}

function imgApiJson_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function imgApiKey_(value) {
  return String(value === null || value === undefined ? '' : value).trim().toLowerCase();
}
