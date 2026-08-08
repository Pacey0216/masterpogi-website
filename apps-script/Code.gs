const INVENTORY_SPREADSHEET_ID = '1ljK2RqkdA8E3iEpEutrhMnTurxGqXwY6Kb8yF2hW3S8';
const PRODUCTS_SHEET_NAME = 'Products';
const VARIANTS_SHEET_NAME = 'Variants';
const TRANSACTIONS_SHEET_NAME = 'Transactions';
const SETTINGS_SHEET_NAME = 'Settings';
const INVENTORY_FORM_TITLE = 'Master Pogi + Top Watch 102 Inventory Log';

/**
 * Public storefront endpoint.
 * Reads the spreadsheet live on every request. Inventory edits never need a
 * GitHub commit, Amplify build, or scheduled sync job.
 */
function doGet(e) {
  try {
    return jsonResponse_({
      success: true,
      products: getPublicProducts_(),
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

/** Simple bound-sheet automation. No installable trigger is needed for this. */
function onEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  const sheetName = sheet.getName();
  const firstRow = Math.max(2, e.range.getRow());
  const lastRow = e.range.getLastRow();
  if (lastRow < 2) return;

  if (sheetName === VARIANTS_SHEET_NAME) {
    for (let row = firstRow; row <= lastRow; row++) {
      const productName = text_(sheet.getRange(row, 3).getValue());
      const grade = text_(sheet.getRange(row, 6).getValue());
      const stock = number_(sheet.getRange(row, 9).getValue());
      const activeCell = sheet.getRange(row, 12);
      if (productName && grade && stock > 0 && !text_(activeCell.getValue())) activeCell.setValue('Yes');
      if (productName) sheet.getRange(row, 13).setValue(new Date());
    }
  }

  if (sheetName === PRODUCTS_SHEET_NAME) {
    for (let row = firstRow; row <= lastRow; row++) {
      if (text_(sheet.getRange(row, 2).getValue())) sheet.getRange(row, 20).setValue(new Date());
    }
  }
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Inventory Admin')
    .addItem('Setup / Refresh Inventory Form', 'setupInventoryForm')
    .addItem('Sync Form Variant Choices', 'syncInventoryFormChoices')
    .addItem('Show Variants Tab', 'showVariantsTab')
    .addToUi();
}

function showVariantsTab() {
  const sheet = SpreadsheetApp.openById(INVENTORY_SPREADSHEET_ID).getSheetByName(VARIANTS_SHEET_NAME);
  if (sheet) sheet.showSheet();
}

/**
 * ONE-TIME SETUP after pasting this Code.gs.
 * Rebuilds the existing inventory form, installs the form-submit trigger and a
 * lightweight edit trigger used only to refresh form dropdown choices.
 */
function setupInventoryForm() {
  const ss = SpreadsheetApp.openById(INVENTORY_SPREADSHEET_ID);
  const form = getOrCreateInventoryForm_(ss);

  form.setTitle(INVENTORY_FORM_TITLE)
    .setDescription('Simple stock logging for Master Pogi + Top Watch 102. Choose one action, complete only that section, and submit.')
    .setConfirmationMessage('Inventory update received. The shared stock and websites will reflect the change automatically.')
    .setProgressBar(true)
    .setShuffleQuestions(false)
    .setCollectEmail(false)
    .setAcceptingResponses(true);

  let destinationId = '';
  try { destinationId = form.getDestinationId() || ''; } catch (err) {}
  if (destinationId !== ss.getId()) {
    form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  }

  while (form.getItems().length) form.deleteItem(0);

  const action = form.addMultipleChoiceItem()
    .setTitle('What do you want to log?')
    .setRequired(true);

  const salePage = form.addPageBreakItem().setTitle('Sale');
  form.addListItem().setTitle('Sale Variant').setRequired(true);
  form.addTextItem().setTitle('Quantity Sold').setRequired(true).setHelpText('Enter a whole number, e.g. 1');
  form.addListItem().setTitle('Store').setChoiceValues(['Master Pogi', 'Top Watch 102']).setRequired(true);
  form.addTextItem().setTitle('Sale Notes (optional)');
  salePage.setGoToPage(FormApp.PageNavigationType.SUBMIT);

  const restockPage = form.addPageBreakItem().setTitle('Restock Existing Variant');
  form.addListItem().setTitle('Restock Variant').setRequired(true);
  form.addTextItem().setTitle('Quantity Added').setRequired(true).setHelpText('Enter a whole number, e.g. 1');
  form.addTextItem().setTitle('Grade Selling Price (optional)').setHelpText('Only enter this if the grade price changed. Example: 39000');
  form.addTextItem().setTitle('Restock Notes (optional)');
  restockPage.setGoToPage(FormApp.PageNavigationType.SUBMIT);

  const correctionPage = form.addPageBreakItem().setTitle('Stock Correction');
  form.addListItem().setTitle('Correction Variant').setRequired(true);
  form.addTextItem().setTitle('New Stock Qty').setRequired(true).setHelpText('Sets this exact size + grade combination to the entered quantity.');
  form.addParagraphTextItem().setTitle('Correction Reason').setRequired(true);
  correctionPage.setGoToPage(FormApp.PageNavigationType.SUBMIT);

  const newPage = form.addPageBreakItem().setTitle('Add New Product / Variant');
  form.addTextItem().setTitle('Product Name').setRequired(true).setHelpText('For a new size/grade of an existing model, type the existing Product Name exactly.');
  form.addTextItem().setTitle('Brand (new products only)').setHelpText('Example: Rolex');
  form.addTextItem().setTitle('Reference Code (optional)');
  form.addTextItem().setTitle('Size').setRequired(true).setHelpText('Example: 38 mm or 40 mm');
  form.addListItem().setTitle('Grade').setChoiceValues(['Japan', 'Swiss', 'Super C']).setRequired(true);
  form.addTextItem().setTitle('Opening Stock Qty').setRequired(true);
  form.addTextItem().setTitle('Grade Selling Price').setRequired(true).setHelpText('Price is grade-based and applies to every size of this product in the same grade.');
  form.addTextItem().setTitle('Main Image URL (optional)');
  form.addParagraphTextItem().setTitle('Description (optional)');
  newPage.setGoToPage(FormApp.PageNavigationType.SUBMIT);

  action.setChoices([
    action.createChoice('Sale', salePage),
    action.createChoice('Restock', restockPage),
    action.createChoice('Stock Correction', correctionPage),
    action.createChoice('Add New Product / Variant', newPage)
  ]);

  installInventoryFormTriggers_(form, ss);
  syncInventoryFormChoices_(form, ss);

  writeSetting_(ss, 'FORM_ID', form.getId(), 'Inventory form ID managed by setupInventoryForm.');
  writeSetting_(ss, 'FORM_EDIT_URL', form.getEditUrl(), 'Owner/edit link; do not share with staff.');
  writeSetting_(ss, 'FORM_PUBLIC_URL', form.getPublishedUrl(), 'Share this link with family for sales and inventory updates.');

  const variants = ss.getSheetByName(VARIANTS_SHEET_NAME);
  if (variants) variants.hideSheet();

  try {
    SpreadsheetApp.getUi().alert('Inventory form ready.\n\nShare this link:\n' + form.getPublishedUrl());
  } catch (err) {}

  Logger.log('Inventory form: ' + form.getPublishedUrl());
  return form.getPublishedUrl();
}

function getOrCreateInventoryForm_(ss) {
  let formId = readSetting_(ss, 'FORM_ID');
  if (!formId) formId = PropertiesService.getScriptProperties().getProperty('INVENTORY_FORM_ID') || '';

  let form = null;
  if (formId) {
    try { form = FormApp.openById(formId); } catch (err) { console.warn(err); }
  }
  if (!form) form = FormApp.create(INVENTORY_FORM_TITLE);

  PropertiesService.getScriptProperties().setProperty('INVENTORY_FORM_ID', form.getId());
  return form;
}

function installInventoryFormTriggers_(form, ss) {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    const handler = trigger.getHandlerFunction();
    if (handler === 'onInventoryFormSubmit' || handler === 'onInventorySheetEdit') ScriptApp.deleteTrigger(trigger);
  });

  ScriptApp.newTrigger('onInventoryFormSubmit').forForm(form).onFormSubmit().create();
  ScriptApp.newTrigger('onInventorySheetEdit').forSpreadsheet(ss).onEdit().create();
}

/** Installable edit trigger: only refreshes form dropdowns after direct sheet edits. */
function onInventorySheetEdit(e) {
  if (!e || !e.range || e.range.getRow() < 2) return;
  const name = e.range.getSheet().getName();
  if (name !== PRODUCTS_SHEET_NAME && name !== VARIANTS_SHEET_NAME) return;
  syncInventoryFormChoices();
}

function syncInventoryFormChoices() {
  const ss = SpreadsheetApp.openById(INVENTORY_SPREADSHEET_ID);
  const formId = readSetting_(ss, 'FORM_ID') || PropertiesService.getScriptProperties().getProperty('INVENTORY_FORM_ID');
  if (!formId) throw new Error('Inventory form is not configured. Run setupInventoryForm first.');
  const form = FormApp.openById(formId);
  syncInventoryFormChoices_(form, ss);
}

function syncInventoryFormChoices_(form, ss) {
  SpreadsheetApp.flush();
  const sheet = ss.getSheetByName(VARIANTS_SHEET_NAME);
  const saleChoices = [];
  const allChoices = [];

  if (sheet) {
    const last = Math.max(2, sheet.getMaxRows());
    const values = sheet.getRange(2, 1, last - 1, 13).getDisplayValues();
    values.forEach(row => {
      const sku = text_(row[0]);
      const product = text_(row[2]);
      const size = text_(row[4]);
      const grade = normalizeGrade_(row[5]);
      const stock = number_(row[8]);
      const active = text_(row[11]).toLowerCase();
      if (!sku || !product || !size || !grade || ['no', 'false', '0', 'inactive'].includes(active)) return;
      const label = `${sku} | ${product} | ${size} | ${grade} | Stock ${stock}`;
      allChoices.push(label);
      if (stock > 0) saleChoices.push(label);
    });
  }

  const saleList = saleChoices.length ? saleChoices.sort() : ['No in-stock variants available'];
  const allList = allChoices.length ? allChoices.sort() : ['No variants available'];

  form.getItems(FormApp.ItemType.LIST).forEach(item => {
    const list = item.asListItem();
    if (list.getTitle() === 'Sale Variant') list.setChoiceValues(saleList);
    if (list.getTitle() === 'Restock Variant') list.setChoiceValues(allList);
    if (list.getTitle() === 'Correction Variant') list.setChoiceValues(allList);
  });
}

function onInventoryFormSubmit(e) {
  if (!e || !e.response) return;
  const answers = {};
  e.response.getItemResponses().forEach(itemResponse => {
    answers[itemResponse.getItem().getTitle()] = itemResponse.getResponse();
  });

  const action = text_(answers['What do you want to log?']);
  if (action === 'Sale') processSale_(answers);
  else if (action === 'Restock') processRestock_(answers);
  else if (action === 'Stock Correction') processCorrection_(answers);
  else if (action === 'Add New Product / Variant') processNewProductOrVariant_(answers);

  syncInventoryFormChoices();
}

function processSale_(a) {
  const ss = SpreadsheetApp.openById(INVENTORY_SPREADSHEET_ID);
  const variants = ss.getSheetByName(VARIANTS_SHEET_NAME);
  const sku = choiceSku_(a['Sale Variant']);
  const qty = Math.floor(number_(a['Quantity Sold']));
  if (!sku || qty <= 0) return;

  const row = findVariantRowBySku_(variants, sku);
  if (!row) return;
  const v = readVariantRow_(variants, row);
  const previous = v.stock;

  if (previous < qty) {
    logTransaction_(ss, 'Sale', v.sku, v.productName, text_(a['Store']), qty, previous, previous, 'Rejected', 'Insufficient stock', text_(a['Sale Notes (optional)']));
    return;
  }

  const next = previous - qty;
  updateVariantStock_(variants, row, next);
  logTransaction_(ss, 'Sale', v.sku, v.productName, text_(a['Store']), qty, previous, next, 'Processed', `${v.size} · ${v.grade}`, text_(a['Sale Notes (optional)']));
}

function processRestock_(a) {
  const ss = SpreadsheetApp.openById(INVENTORY_SPREADSHEET_ID);
  const variants = ss.getSheetByName(VARIANTS_SHEET_NAME);
  const products = ss.getSheetByName(PRODUCTS_SHEET_NAME);
  const sku = choiceSku_(a['Restock Variant']);
  const qty = Math.floor(number_(a['Quantity Added']));
  if (!sku || qty <= 0) return;

  const row = findVariantRowBySku_(variants, sku);
  if (!row) return;
  const v = readVariantRow_(variants, row);
  const previous = v.stock;
  const next = previous + qty;
  const newPrice = number_(a['Grade Selling Price (optional)']);

  if (newPrice > 0) {
    const productRow = findProductRowByName_(products, v.productName);
    if (productRow) setGradePrice_(products, productRow, v.grade, newPrice);
  }

  updateVariantStock_(variants, row, next);
  logTransaction_(ss, 'Restock', v.sku, v.productName, '', qty, previous, next, 'Processed', `${v.size} · ${v.grade}`, text_(a['Restock Notes (optional)']));
}

function processCorrection_(a) {
  const ss = SpreadsheetApp.openById(INVENTORY_SPREADSHEET_ID);
  const variants = ss.getSheetByName(VARIANTS_SHEET_NAME);
  const sku = choiceSku_(a['Correction Variant']);
  const newStock = Math.max(0, Math.floor(number_(a['New Stock Qty'])));
  if (!sku) return;

  const row = findVariantRowBySku_(variants, sku);
  if (!row) return;
  const v = readVariantRow_(variants, row);
  const previous = v.stock;
  updateVariantStock_(variants, row, newStock);
  logTransaction_(ss, 'Stock Correction', v.sku, v.productName, '', newStock - previous, previous, newStock, 'Processed', `${v.size} · ${v.grade}`, text_(a['Correction Reason']));
}

function processNewProductOrVariant_(a) {
  const ss = SpreadsheetApp.openById(INVENTORY_SPREADSHEET_ID);
  const products = ss.getSheetByName(PRODUCTS_SHEET_NAME);
  const variants = ss.getSheetByName(VARIANTS_SHEET_NAME);
  const productName = text_(a['Product Name']);
  const brand = text_(a['Brand (new products only)']) || 'Watch';
  const reference = text_(a['Reference Code (optional)']);
  const size = text_(a['Size']);
  const grade = normalizeGrade_(a['Grade']);
  const openingStock = Math.max(0, Math.floor(number_(a['Opening Stock Qty'])));
  const price = number_(a['Grade Selling Price']);
  const image = text_(a['Main Image URL (optional)']);
  const description = text_(a['Description (optional)']);
  if (!productName || !size || !grade || price <= 0) return;

  let productRow = findProductRowByName_(products, productName);
  if (!productRow) {
    productRow = firstEmptyRowByColumn_(products, 2);
    products.getRange(productRow, 2).setValue(productName);
    products.getRange(productRow, 3).setValue(brand);
    if (reference) products.getRange(productRow, 4).setValue(reference);
    if (image) products.getRange(productRow, 16).setValue(image);
    if (description) products.getRange(productRow, 18).setValue(description);
    products.getRange(productRow, 20).setValue(new Date());
  }
  setGradePrice_(products, productRow, grade, price);

  let variantRow = findVariantRowByProductSizeGrade_(variants, productName, size, grade);
  let previous = 0;
  if (!variantRow) {
    variantRow = firstEmptyRowByColumn_(variants, 3);
    variants.getRange(variantRow, 3).setValue(productName);
    variants.getRange(variantRow, 5).setValue(size);
    variants.getRange(variantRow, 6).setValue(grade);
    variants.getRange(variantRow, 9).setValue(openingStock);
    variants.getRange(variantRow, 12).setValue('Yes');
    variants.getRange(variantRow, 13).setValue(new Date());
  } else {
    previous = number_(variants.getRange(variantRow, 9).getValue());
    updateVariantStock_(variants, variantRow, previous + openingStock);
  }

  SpreadsheetApp.flush();
  const sku = text_(variants.getRange(variantRow, 1).getDisplayValue()) || slug_(`${productName}-${size}-${grade}`);
  logTransaction_(ss, 'Restock', sku, productName, '', openingStock, previous, previous + openingStock, 'Processed', `${size} · ${grade}`, 'Added through inventory form');
}

function updateVariantStock_(sheet, row, stock) {
  sheet.getRange(row, 9).setValue(Math.max(0, stock));
  sheet.getRange(row, 12).setValue('Yes');
  sheet.getRange(row, 13).setValue(new Date());
}

function setGradePrice_(products, row, grade, price) {
  const g = normalizeGrade_(grade);
  const col = g === 'Japan' ? 7 : g === 'Swiss' ? 9 : g === 'Super C' ? 11 : 0;
  if (col && price > 0) products.getRange(row, col).setValue(price);
  products.getRange(row, 20).setValue(new Date());
}

function findProductRowByName_(sheet, productName) {
  const target = normalizeKey_(productName);
  if (!target) return 0;
  const values = sheet.getRange(2, 2, sheet.getMaxRows() - 1, 1).getDisplayValues();
  for (let i = 0; i < values.length; i++) if (normalizeKey_(values[i][0]) === target) return i + 2;
  return 0;
}

function findVariantRowBySku_(sheet, sku) {
  const target = normalizeKey_(sku);
  const values = sheet.getRange(2, 1, sheet.getMaxRows() - 1, 1).getDisplayValues();
  for (let i = 0; i < values.length; i++) if (normalizeKey_(values[i][0]) === target) return i + 2;
  return 0;
}

function findVariantRowByProductSizeGrade_(sheet, productName, size, grade) {
  const p = normalizeKey_(productName), s = normalizeKey_(size), g = normalizeKey_(normalizeGrade_(grade));
  const values = sheet.getRange(2, 3, sheet.getMaxRows() - 1, 4).getDisplayValues();
  for (let i = 0; i < values.length; i++) {
    if (normalizeKey_(values[i][0]) === p && normalizeKey_(values[i][2]) === s && normalizeKey_(normalizeGrade_(values[i][3])) === g) return i + 2;
  }
  return 0;
}

function firstEmptyRowByColumn_(sheet, column) {
  const values = sheet.getRange(2, column, sheet.getMaxRows() - 1, 1).getDisplayValues();
  for (let i = 0; i < values.length; i++) if (!text_(values[i][0])) return i + 2;
  sheet.insertRowsAfter(sheet.getMaxRows(), 100);
  return sheet.getMaxRows() - 99;
}

function readVariantRow_(sheet, row) {
  const v = sheet.getRange(row, 1, 1, 13).getDisplayValues()[0];
  return {
    sku: text_(v[0]),
    productName: text_(v[2]),
    size: text_(v[4]),
    grade: normalizeGrade_(v[5]),
    stock: number_(v[8])
  };
}

function choiceSku_(label) {
  const value = text_(label);
  if (!value || value.indexOf(' | ') < 0) return '';
  return text_(value.split(' | ')[0]);
}

function logTransaction_(ss, action, sku, productName, store, quantity, previous, next, result, details, notes) {
  const sheet = ss.getSheetByName(TRANSACTIONS_SHEET_NAME);
  if (!sheet) return;
  const now = new Date();
  const id = 'TXN-' + Utilities.formatDate(now, 'Asia/Manila', 'yyyyMMdd-HHmmss') + '-' + Math.floor(1000 + Math.random() * 9000);
  sheet.appendRow([id, now, action, sku, productName, store, quantity, previous, next, result, details, notes]);
}

function readSetting_(ss, key) {
  const sheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
  if (!sheet) return '';
  const values = sheet.getRange(1, 1, Math.max(1, sheet.getLastRow()), 2).getDisplayValues();
  for (let i = 0; i < values.length; i++) if (text_(values[i][0]) === key) return text_(values[i][1]);
  return '';
}

function writeSetting_(ss, key, value, purpose) {
  const sheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
  if (!sheet) return;
  const values = sheet.getRange(1, 1, Math.max(1, sheet.getLastRow()), 1).getDisplayValues();
  let row = 0;
  for (let i = 0; i < values.length; i++) if (text_(values[i][0]) === key) { row = i + 1; break; }
  if (!row) row = sheet.getLastRow() + 1;
  sheet.getRange(row, 1, 1, 3).setValues([[key, value, purpose || '']]);
}

function getPublicProducts_() {
  const ss = SpreadsheetApp.openById(INVENTORY_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(PRODUCTS_SHEET_NAME);
  if (!sheet) throw new Error('Products sheet not found.');

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const col = headerMap_(values[0].map(String));
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
    const totalStock = variants.length ? variants.reduce((sum, v) => sum + number_(v.stock), 0) : fallbackStock;
    if (totalStock <= 0) continue;

    const variantSizes = unique_(variants.map(v => text_(v.size)).filter(Boolean));
    const sizes = variantSizes.length ? variantSizes.join(', ') : text_(row[col['Available Sizes']]);

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
    const productGradePrices = {
      Japan: number_(row[col['Japan Price']]),
      Swiss: number_(row[col['Swiss Price']]),
      'Super C': number_(row[col['Super C Price']])
    };
    Object.keys(productGradePrices).forEach(g => {
      if (gradeQty[g] > 0 && productGradePrices[g] > 0) gradePrices[g] = productGradePrices[g];
    });
    variants.forEach(v => {
      const g = normalizeGrade_(v.grade), p = number_(v.price);
      if (g && p > 0 && !gradePrices[g]) gradePrices[g] = p;
    });

    const availableGradePrices = Object.keys(gradeQty).filter(g => gradeQty[g] > 0).map(g => number_(gradePrices[g])).filter(p => p > 0);
    const priceFrom = availableGradePrices.length ? Math.min.apply(null, availableGradePrices) : number_(row[col['Price From']]);
    variants = variants.map(v => {
      const g = normalizeGrade_(v.grade);
      return Object.assign({}, v, { grade: g, price: number_(gradePrices[g]) || number_(v.price) || priceFrom });
    });

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
    if (reference) specs.Reference = reference;
    if (sizes) specs['Available Sizes'] = sizes;
    if (gradeQty.Japan > 0) specs.Japan = `${gradeQty.Japan} available`;
    if (gradeQty.Swiss > 0) specs.Swiss = `${gradeQty.Swiss} available`;
    if (gradeQty['Super C'] > 0) specs['Super C'] = `${gradeQty['Super C']} available`;

    products.push({
      sku, productId, name, category: brand, brand, reference,
      grade: gradeParts.join(' · ') || 'Available',
      gradePrices,
      price: priceFrom,
      stock: totalStock,
      stockStatus: text_(row[col['Stock Status']]) || 'Available',
      sold,
      image: text_(row[col['Main Image Url']]) || text_(row[col['Onhand Image Url']]),
      onhandImage: text_(row[col['Onhand Image Url']]),
      description: text_(row[col['Description']]),
      featured: yes_(row[col['Featured']]),
      lastUpdated: dateText_(row[col['Last Updated']]),
      specs,
      variants,
      visible: true
    });
  }

  products.sort((a, b) => (a.featured !== b.featured ? (a.featured ? -1 : 1) : (b.sold - a.sold || a.name.localeCompare(b.name))));
  return products;
}

function getVariantMap_(ss) {
  const result = { byProductId: {}, byReference: {}, byName: {} };
  const sheet = ss.getSheetByName(VARIANTS_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return result;
  const values = sheet.getDataRange().getValues();
  const col = headerMap_(values[0].map(String));

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
    if ((!name && !productId && !reference) || !active || stock <= 0) continue;

    const variant = { sku, variantSku: sku, productId, name, reference, size, grade, stock, price, active: true };
    pushMap_(result.byProductId, normalizeKey_(productId), variant);
    pushMap_(result.byReference, normalizeKey_(reference), variant);
    pushMap_(result.byName, normalizeKey_(name), variant);
  }
  return result;
}

function getSoldCounts_(ss) {
  const result = { bySku: {}, byName: {} };
  const sheet = ss.getSheetByName(TRANSACTIONS_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return result;
  const values = sheet.getDataRange().getValues();
  const col = headerMap_(values[0].map(String));

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const action = text_(row[col.Action]).toLowerCase();
    if (action !== 'sale' && action !== 'sold') continue;
    const resultText = text_(row[col.Result]).toLowerCase();
    if (resultText && ['failed', 'error', 'rejected'].some(v => resultText.includes(v))) continue;
    const qty = Math.max(1, number_(row[col.Quantity]) || 1);
    const sku = normalizeKey_(row[col.SKU]);
    const name = normalizeKey_(row[col['Product Name']]);
    if (sku) result.bySku[sku] = (result.bySku[sku] || 0) + qty;
    if (name) result.byName[name] = (result.byName[name] || 0) + qty;
  }
  return result;
}

function pushMap_(map, key, value) { if (key) (map[key] || (map[key] = [])).push(value); }
function headerMap_(headers) { const map = {}; headers.forEach((h, i) => map[String(h).trim()] = i); return map; }
function jsonResponse_(payload) { return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON); }
function text_(value) { return value === null || value === undefined ? '' : String(value).trim(); }
function number_(value) { if (typeof value === 'number') return isFinite(value) ? value : 0; const n = Number(String(value === null || value === undefined ? '' : value).replace(/[^0-9.-]/g, '')); return isFinite(n) ? n : 0; }
function yes_(value) { return ['yes', 'true', '1', 'featured'].includes(text_(value).toLowerCase()); }
function normalizeKey_(value) { return text_(value).toLowerCase(); }
function normalizeGrade_(value) { const g = text_(value).replace(/\s*\([^)]*\)\s*/g, '').trim(); if (/^super\s*c/i.test(g)) return 'Super C'; if (/^swiss/i.test(g)) return 'Swiss'; if (/^japan/i.test(g)) return 'Japan'; return g; }
function unique_(values) { return [...new Set(values)]; }
function slug_(value) { return text_(value).toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'WATCH'; }
function dateText_(value) { if (!value) return ''; if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) return Utilities.formatDate(value, 'Asia/Manila', "yyyy-MM-dd'T'HH:mm:ssXXX"); return text_(value); }
