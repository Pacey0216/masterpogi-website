const INVENTORY_SPREADSHEET_ID = '1ljK2RqkdA8E3iEpEutrhMnTurxGqXwY6Kb8yF2hW3S8';
const PRODUCTS_SHEET_NAME = 'Products';
const TRANSACTIONS_SHEET_NAME = 'Transactions';

function doGet(e) {
  try {
    const products = getPublicProducts_();
    return jsonResponse_({
      success: true,
      products: products,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error(error);
    return jsonResponse_({
      success: false,
      products: [],
      error: String(error && error.message ? error.message : error)
    });
  }
}

function getPublicProducts_() {
  const ss = SpreadsheetApp.openById(INVENTORY_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(PRODUCTS_SHEET_NAME);
  if (!sheet) throw new Error('Products sheet not found.');

  const range = sheet.getDataRange();
  const values = range.getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(String);
  const col = headerMap_(headers);
  const soldCounts = getSoldCounts_(ss);
  const products = [];

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const name = text_(row[col['Product Name']]);
    if (!name) continue;

    const totalStock = number_(row[col['Total Stock']]);
    if (totalStock <= 0) continue;

    const visibility = text_(row[col['Website Visibility']]).toLowerCase();
    if (['no', 'hidden', 'hide', 'false', '0'].includes(visibility)) continue;

    const productId = text_(row[col['Product ID']]);
    const reference = text_(row[col['Primary Reference']]);
    const brand = text_(row[col['Brand']]) || 'Watch';
    const sizes = text_(row[col['Available Sizes']]);
    const japanQty = number_(row[col['Japan Qty']]);
    const swissQty = number_(row[col['Swiss Qty']]);
    const superCQty = number_(row[col['Super C Qty']]);
    const sku = productId || reference || slug_(name);

    const gradeParts = [];
    if (japanQty > 0) gradeParts.push(`Japan (${japanQty})`);
    if (swissQty > 0) gradeParts.push(`Swiss (${swissQty})`);
    if (superCQty > 0) gradeParts.push(`Super C (${superCQty})`);

    const sold = Math.max(
      soldCounts.bySku[normalizeKey_(sku)] || 0,
      soldCounts.bySku[normalizeKey_(reference)] || 0,
      soldCounts.byName[normalizeKey_(name)] || 0
    );

    const specs = {};
    if (reference) specs['Reference'] = reference;
    if (sizes) specs['Available Sizes'] = sizes;
    if (japanQty > 0) specs['Japan'] = `${japanQty} available`;
    if (swissQty > 0) specs['Swiss'] = `${swissQty} available`;
    if (superCQty > 0) specs['Super C'] = `${superCQty} available`;

    products.push({
      sku: sku,
      productId: productId,
      name: name,
      category: brand,
      brand: brand,
      reference: reference,
      grade: gradeParts.join(' · ') || 'Available',
      price: number_(row[col['Price From']]),
      stock: totalStock,
      stockStatus: text_(row[col['Stock Status']]) || 'Available',
      sold: sold,
      image: text_(row[col['Main Image Url']]) || text_(row[col['Onhand Image Url']]),
      onhandImage: text_(row[col['Onhand Image Url']]),
      description: text_(row[col['Description']]),
      featured: yes_(row[col['Featured']]),
      lastUpdated: dateText_(row[col['Last Updated']]),
      specs: specs,
      visible: true
    });
  }

  products.sort(function(a, b) {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    if (b.sold !== a.sold) return b.sold - a.sold;
    return a.name.localeCompare(b.name);
  });

  return products;
}

function getSoldCounts_(ss) {
  const result = { bySku: {}, byName: {} };
  const sheet = ss.getSheetByName(TRANSACTIONS_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return result;

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const col = headerMap_(headers);

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const action = text_(row[col['Action']]).toLowerCase();
    if (action !== 'sale' && action !== 'sold') continue;

    const resultText = text_(row[col['Result']]).toLowerCase();
    if (resultText && ['failed', 'error', 'rejected'].some(v => resultText.includes(v))) continue;

    const qty = Math.max(1, number_(row[col['Quantity']]) || 1);
    const sku = normalizeKey_(row[col['SKU']]);
    const name = normalizeKey_(row[col['Product Name']]);

    if (sku) result.bySku[sku] = (result.bySku[sku] || 0) + qty;
    if (name) result.byName[name] = (result.byName[name] || 0) + qty;
  }

  return result;
}

function headerMap_(headers) {
  const map = {};
  headers.forEach(function(header, index) {
    map[String(header).trim()] = index;
  });
  return map;
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function text_(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function number_(value) {
  if (typeof value === 'number') return isFinite(value) ? value : 0;
  const cleaned = String(value === null || value === undefined ? '' : value).replace(/[^0-9.-]/g, '');
  const parsed = Number(cleaned);
  return isFinite(parsed) ? parsed : 0;
}

function yes_(value) {
  return ['yes', 'true', '1', 'featured'].includes(text_(value).toLowerCase());
}

function normalizeKey_(value) {
  return text_(value).toLowerCase();
}

function slug_(value) {
  return text_(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'WATCH';
}

function dateText_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return Utilities.formatDate(value, 'Asia/Manila', "yyyy-MM-dd'T'HH:mm:ssXXX");
  }
  return text_(value);
}
