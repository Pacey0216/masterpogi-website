const INVENTORY_SPREADSHEET_ID = '1ljK2RqkdA8E3iEpEutrhMnTurxGqXwY6Kb8yF2hW3S8';
const PRODUCTS_SHEET_NAME = 'Products';
const VARIANTS_SHEET_NAME = 'Variants';
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

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(String);
  const col = headerMap_(headers);
  const soldCounts = getSoldCounts_(ss);
  const variantMap = getVariantMap_(ss);
  const products = [];

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const name = text_(row[col['Product Name']]);
    if (!name) continue;

    const visibility = text_(row[col['Website Visibility']]).toLowerCase();
    if (['no', 'hidden', 'hide', 'false', '0'].includes(visibility)) continue;

    const productId = text_(row[col['Product ID']]);
    const reference = text_(row[col['Primary Reference']]);
    const brand = text_(row[col['Brand']]) || 'Watch';
    const productKey = normalizeKey_(productId);
    const nameKey = normalizeKey_(name);
    const refKey = normalizeKey_(reference);

    let variants = [];
    if (productKey && variantMap.byProductId[productKey]) variants = variantMap.byProductId[productKey];
    else if (refKey && variantMap.byReference[refKey]) variants = variantMap.byReference[refKey];
    else if (nameKey && variantMap.byName[nameKey]) variants = variantMap.byName[nameKey];

    variants = variants.filter(v => v.stock > 0 && v.active !== false);

    const fallbackStock = number_(row[col['Total Stock']]);
    const totalStock = variants.length
      ? variants.reduce((sum, v) => sum + number_(v.stock), 0)
      : fallbackStock;
    if (totalStock <= 0) continue;

    const sizes = variants.length
      ? unique_(variants.map(v => text_(v.size)).filter(Boolean)).join(', ')
      : text_(row[col['Available Sizes']]);

    const gradeQty = { Japan: 0, Swiss: 0, 'Super C': 0 };
    if (variants.length) {
      variants.forEach(v => {
        const g = normalizeGrade_(v.grade);
        if (gradeQty[g] !== undefined) gradeQty[g] += number_(v.stock);
      });
    } else {
      gradeQty.Japan = number_(row[col['Japan Qty']]);
      gradeQty.Swiss = number_(row[col['Swiss Qty']]);
      gradeQty['Super C'] = number_(row[col['Super C Qty']]);
    }

    const gradePrices = {};
    variants.forEach(v => {
      const g = normalizeGrade_(v.grade);
      const p = number_(v.price);
      if (!g || p <= 0) return;
      if (!gradePrices[g] || p < gradePrices[g]) gradePrices[g] = p;
    });

    const variantPrices = variants.map(v => number_(v.price)).filter(p => p > 0);
    const priceFrom = variantPrices.length
      ? Math.min.apply(null, variantPrices)
      : number_(row[col['Price From']]);

    const sku = productId || reference || slug_(name);
    const sold = Math.max(
      soldCounts.bySku[normalizeKey_(sku)] || 0,
      soldCounts.bySku[normalizeKey_(reference)] || 0,
      soldCounts.byName[normalizeKey_(name)] || 0
    );

    const gradeParts = [];
    if (gradeQty.Japan > 0) gradeParts.push(`Japan (${gradeQty.Japan})`);
    if (gradeQty.Swiss > 0) gradeParts.push(`Swiss (${gradeQty.Swiss})`);
    if (gradeQty['Super C'] > 0) gradeParts.push(`Super C (${gradeQty['Super C']})`);

    const specs = {};
    if (reference) specs['Reference'] = reference;
    if (sizes) specs['Available Sizes'] = sizes;
    if (gradeQty.Japan > 0) specs['Japan'] = `${gradeQty.Japan} available`;
    if (gradeQty.Swiss > 0) specs['Swiss'] = `${gradeQty.Swiss} available`;
    if (gradeQty['Super C'] > 0) specs['Super C'] = `${gradeQty['Super C']} available`;

    products.push({
      sku: sku,
      productId: productId,
      name: name,
      category: brand,
      brand: brand,
      reference: reference,
      grade: gradeParts.join(' · ') || 'Available',
      gradePrices: gradePrices,
      price: priceFrom,
      stock: totalStock,
      stockStatus: text_(row[col['Stock Status']]) || 'Available',
      sold: sold,
      image: text_(row[col['Main Image Url']]) || text_(row[col['Onhand Image Url']]),
      onhandImage: text_(row[col['Onhand Image Url']]),
      description: text_(row[col['Description']]),
      featured: yes_(row[col['Featured']]),
      lastUpdated: dateText_(row[col['Last Updated']]),
      specs: specs,
      variants: variants,
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

function getVariantMap_(ss) {
  const result = { byProductId: {}, byReference: {}, byName: {} };
  const sheet = ss.getSheetByName(VARIANTS_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return result;

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const col = headerMap_(headers);

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const sku = text_(row[col['Variant SKU']]);
    const productId = text_(row[col['Product ID']]);
    const name = text_(row[col['Product Name']]);
    const reference = text_(row[col['Reference Code']]);
    const size = text_(row[col['Size']]);
    const grade = normalizeGrade_(row[col['Grade']]);
    const stock = number_(row[col['Stock Qty']]);
    const price = number_(row[col['Default Selling Price']]);
    const activeRaw = text_(row[col['Active']]).toLowerCase();
    const active = activeRaw === '' ? true : !['no', 'false', '0', 'inactive'].includes(activeRaw);

    if (!name && !productId && !reference) continue;
    if (!active || stock <= 0) continue;

    const variant = {
      sku: sku,
      variantSku: sku,
      productId: productId,
      name: name,
      reference: reference,
      size: size,
      grade: grade,
      stock: stock,
      price: price,
      active: true
    };

    pushMap_(result.byProductId, normalizeKey_(productId), variant);
    pushMap_(result.byReference, normalizeKey_(reference), variant);
    pushMap_(result.byName, normalizeKey_(name), variant);
  }

  return result;
}

function pushMap_(map, key, value) {
  if (!key) return;
  if (!map[key]) map[key] = [];
  map[key].push(value);
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

function normalizeGrade_(value) {
  const g = text_(value).replace(/\s*\([^)]*\)\s*/g, '').trim();
  if (/^super\s*c/i.test(g)) return 'Super C';
  if (/^swiss/i.test(g)) return 'Swiss';
  if (/^japan/i.test(g)) return 'Japan';
  return g;
}

function unique_(values) {
  return [...new Set(values)];
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
