const IMAGE_REGISTRY_SHEET_NAME = 'Product Images';

/**
 * ONE-TIME setup after adding this file to the same bound Apps Script project
 * as Code.gs. This adds a second Form submit trigger dedicated to image + box
 * processing. It does NOT change the storefront or public API.
 */
function setupImageAutomation() {
  const ss = SpreadsheetApp.openById(INVENTORY_SPREADSHEET_ID);
  const formId = imgReadSetting_(ss, 'FORM_ID');
  if (!formId) throw new Error('FORM_ID is missing in Settings.');
  const form = FormApp.openById(formId);

  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'onInventoryImageSubmit') ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('onInventoryImageSubmit').forForm(form).onFormSubmit().create();

  imgEnsureRegistrySheet_(ss);
  imgSeedVariantFolders_(ss);
  Logger.log('Image automation installed.');
}

/**
 * Handles File Upload answers without depending on the exact upload-question
 * title. Upload questions with "main" in the title are treated as Main Image;
 * all other file-upload questions are treated as Live Images.
 *
 * Live images are capped by MAX_LIVE_IMAGES_PER_VARIANT (currently 5), moved
 * into a folder named after the exact Variant SKU, shared read-only by link,
 * and registered in the hidden Product Images sheet.
 *
 * Box ID is written only to Variants column N and is never added to the public
 * storefront payload.
 */
function onInventoryImageSubmit(e) {
  if (!e || !e.response) return;

  const fields = {};
  const liveFileIds = [];
  const mainFileIds = [];

  e.response.getItemResponses().forEach(ir => {
    const item = ir.getItem();
    const title = String(item.getTitle() || '').trim();
    const response = ir.getResponse();
    fields[title] = response;

    if (item.getType() === FormApp.ItemType.FILE_UPLOAD) {
      const ids = Array.isArray(response) ? response : [response];
      const target = /main\s*image/i.test(title) ? mainFileIds : liveFileIds;
      ids.forEach(id => { if (id) target.push(String(id)); });
    }
  });

  const ss = SpreadsheetApp.openById(INVENTORY_SPREADSHEET_ID);
  const ctx = imgResolveContext_(ss, fields);
  if (!ctx.sku && !ctx.productName) return;

  // The normal inventory Form trigger may be creating a brand-new variant at
  // the same time. Give it a few seconds, then resolve the row again.
  if (!ctx.variantRow && ctx.productName && ctx.size && ctx.grade) {
    for (let i = 0; i < 8 && !ctx.variantRow; i++) {
      Utilities.sleep(600);
      imgRefreshVariantContext_(ss, ctx);
    }
  }

  const boxId = imgBoxIdFromFields_(fields);
  if (boxId && ctx.variantRow) {
    ss.getSheetByName(VARIANTS_SHEET_NAME).getRange(ctx.variantRow, 14).setValue(boxId); // N = Box ID
  }

  if (liveFileIds.length) {
    imgProcessLiveImages_(ss, ctx, liveFileIds);
  }

  if (mainFileIds.length) {
    imgProcessMainImage_(ss, ctx, mainFileIds[0]);
  } else if (ctx.reference) {
    // Reuse an approved main image from the Main Image folder when its file
    // name matches the reference code. No web scraping is used.
    imgApplyReferenceMainImage_(ss, ctx);
  }
}

/** Create any missing Variant SKU folders and write their IDs to Variants!O. */
function imgSeedVariantFolders_(ss) {
  const variants = ss.getSheetByName(VARIANTS_SHEET_NAME);
  if (!variants || variants.getLastRow() < 2) return;
  const rows = variants.getRange(2, 1, variants.getLastRow() - 1, 15).getDisplayValues();
  rows.forEach((row, i) => {
    const sku = imgText_(row[0]);
    const active = imgText_(row[11]).toLowerCase();
    if (!sku || ['no', 'false', '0', 'inactive'].includes(active)) return;
    const rowNumber = i + 2;
    imgGetOrCreateVariantFolder_(ss, variants, rowNumber, sku);
  });
}

function imgProcessLiveImages_(ss, ctx, fileIds) {
  const max = Math.max(1, Number(imgReadSetting_(ss, 'MAX_LIVE_IMAGES_PER_VARIANT') || 5));
  const ids = fileIds.slice(0, max);
  const variants = ss.getSheetByName(VARIANTS_SHEET_NAME);
  const sku = ctx.sku || imgVariantSku_(ctx.productName, ctx.size, ctx.grade);
  if (!sku) return;

  const folder = imgGetOrCreateVariantFolder_(ss, variants, ctx.variantRow, sku);
  const registry = imgEnsureRegistrySheet_(ss);
  imgDeactivateLiveImages_(registry, sku);

  ids.forEach((fileId, index) => {
    let file;
    try { file = DriveApp.getFileById(fileId); } catch (err) { console.warn(err); return; }

    const originalName = file.getName();
    const ext = imgExtension_(originalName);
    const order = index + 1;
    const finalName = `${sku}-LIVE-${String(order).padStart(2, '0')}${ext}`;

    try { file.setName(finalName); } catch (err) { console.warn(err); }
    try { file.moveTo(folder); } catch (err) { console.warn(err); }
    imgMakePublic_(file);

    const publicUrl = imgPublicUrl_(file.getId());
    const imageId = `IMG-${Utilities.formatDate(new Date(), 'Asia/Manila', 'yyyyMMddHHmmss')}-${sku}-${String(order).padStart(2, '0')}`;
    registry.appendRow([
      imageId,
      sku,
      ctx.productName || '',
      ctx.reference || '',
      ctx.size || '',
      ctx.grade || '',
      'Live',
      order,
      file.getId(),
      publicUrl,
      folder.getId(),
      'Yes',
      new Date(),
      originalName,
      'Google Form'
    ]);
  });

  if (ctx.variantRow) {
    variants.getRange(ctx.variantRow, 15).setValue(folder.getId()); // O = Live Image Folder ID
    variants.getRange(ctx.variantRow, 13).setValue(new Date());
  }
}

function imgProcessMainImage_(ss, ctx, fileId) {
  let file;
  try { file = DriveApp.getFileById(fileId); } catch (err) { console.warn(err); return; }

  const mainFolderId = imgReadSetting_(ss, 'MAIN_IMAGE_FOLDER_ID');
  if (!mainFolderId) return;
  const folder = DriveApp.getFolderById(mainFolderId);
  const ext = imgExtension_(file.getName());
  const base = ctx.reference || ctx.productName || file.getName();
  const safeBase = String(base).replace(/[\\/:*?"<>|]+/g, '-').trim();

  try { file.setName(`${safeBase}-MAIN${ext}`); } catch (err) { console.warn(err); }
  try { file.moveTo(folder); } catch (err) { console.warn(err); }
  imgMakePublic_(file);

  const productRow = imgFindProductRow_(ss.getSheetByName(PRODUCTS_SHEET_NAME), ctx.productName, ctx.reference);
  if (!productRow) return;
  const products = ss.getSheetByName(PRODUCTS_SHEET_NAME);
  products.getRange(productRow, 16).setValue(imgPublicUrl_(file.getId())); // P Main Image Url
  products.getRange(productRow, 23).setValue(file.getId());              // W Main Image File ID
  products.getRange(productRow, 24).setValue('Form upload');             // X Image Source
  products.getRange(productRow, 20).setValue(new Date());
}

/** Match approved Main Image folder files by reference code. */
function syncMainImagesByReference() {
  const ss = SpreadsheetApp.openById(INVENTORY_SPREADSHEET_ID);
  const products = ss.getSheetByName(PRODUCTS_SHEET_NAME);
  if (!products || products.getLastRow() < 2) return;
  const rows = products.getRange(2, 1, products.getLastRow() - 1, 24).getDisplayValues();

  rows.forEach((row, i) => {
    const ctx = { productName: imgText_(row[1]), reference: imgText_(row[3]) };
    if (!ctx.productName || !ctx.reference) return;
    imgApplyReferenceMainImage_(ss, ctx, i + 2);
  });
}

function imgApplyReferenceMainImage_(ss, ctx, knownProductRow) {
  const mainFolderId = imgReadSetting_(ss, 'MAIN_IMAGE_FOLDER_ID');
  if (!mainFolderId || !ctx.reference) return false;

  const folder = DriveApp.getFolderById(mainFolderId);
  const wanted = imgKey_(ctx.reference);
  const files = folder.getFiles();
  let match = null;

  while (files.hasNext()) {
    const f = files.next();
    const base = f.getName().replace(/\.[^.]+$/, '');
    const key = imgKey_(base.replace(/-MAIN$/i, ''));
    if (key === wanted || key.indexOf(wanted) === 0) { match = f; break; }
  }
  if (!match) return false;

  imgMakePublic_(match);
  const products = ss.getSheetByName(PRODUCTS_SHEET_NAME);
  const row = knownProductRow || imgFindProductRow_(products, ctx.productName, ctx.reference);
  if (!row) return false;

  products.getRange(row, 16).setValue(imgPublicUrl_(match.getId()));
  products.getRange(row, 23).setValue(match.getId());
  products.getRange(row, 24).setValue('Drive reference match');
  products.getRange(row, 20).setValue(new Date());
  return true;
}

function imgResolveContext_(ss, fields) {
  const ctx = {
    sku: '', productName: '', reference: '', size: '', grade: '', variantRow: 0
  };

  const choice = imgFirstField_(fields, ['Sale Variant', 'Restock Variant', 'Correction Variant']);
  if (choice && String(choice).indexOf(' | ') >= 0) {
    ctx.sku = imgText_(String(choice).split(' | ')[0]);
  }

  ctx.productName = imgFieldLike_(fields, ['product name']);
  ctx.reference = imgFieldLike_(fields, ['reference code', 'reference']);
  ctx.size = imgFieldLike_(fields, ['size']);
  ctx.grade = imgNormalizeGrade_(imgFieldLike_(fields, ['grade']));

  imgRefreshVariantContext_(ss, ctx);
  if (!ctx.sku && ctx.productName && ctx.size && ctx.grade) ctx.sku = imgVariantSku_(ctx.productName, ctx.size, ctx.grade);
  return ctx;
}

function imgRefreshVariantContext_(ss, ctx) {
  const variants = ss.getSheetByName(VARIANTS_SHEET_NAME);
  if (!variants || variants.getLastRow() < 2) return ctx;
  const values = variants.getRange(2, 1, variants.getLastRow() - 1, 15).getDisplayValues();

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const sku = imgText_(row[0]);
    const product = imgText_(row[2]);
    const reference = imgText_(row[3]);
    const size = imgText_(row[4]);
    const grade = imgNormalizeGrade_(row[5]);

    const skuMatch = ctx.sku && imgKey_(sku) === imgKey_(ctx.sku);
    const comboMatch = ctx.productName && ctx.size && ctx.grade &&
      imgKey_(product) === imgKey_(ctx.productName) &&
      imgKey_(size) === imgKey_(ctx.size) &&
      imgKey_(grade) === imgKey_(ctx.grade);

    if (skuMatch || comboMatch) {
      ctx.variantRow = i + 2;
      ctx.sku = sku || ctx.sku;
      ctx.productName = product || ctx.productName;
      ctx.reference = reference || ctx.reference;
      ctx.size = size || ctx.size;
      ctx.grade = grade || ctx.grade;
      return ctx;
    }
  }
  return ctx;
}

function imgGetOrCreateVariantFolder_(ss, variants, variantRow, sku) {
  if (variantRow) {
    const existingId = imgText_(variants.getRange(variantRow, 15).getDisplayValue());
    if (existingId) {
      try { return DriveApp.getFolderById(existingId); } catch (err) { console.warn(err); }
    }
  }

  const parentId = imgReadSetting_(ss, 'LIVE_IMAGE_INBOX_FOLDER_ID');
  if (!parentId) throw new Error('LIVE_IMAGE_INBOX_FOLDER_ID is missing in Settings.');
  const parent = DriveApp.getFolderById(parentId);
  const matches = parent.getFoldersByName(sku);
  const folder = matches.hasNext() ? matches.next() : parent.createFolder(sku);

  if (variantRow) variants.getRange(variantRow, 15).setValue(folder.getId());
  return folder;
}

function imgDeactivateLiveImages_(registry, sku) {
  if (!registry || registry.getLastRow() < 2) return;
  const rows = registry.getRange(2, 1, registry.getLastRow() - 1, 15).getDisplayValues();
  rows.forEach((row, i) => {
    if (imgKey_(row[1]) === imgKey_(sku) && imgKey_(row[6]) === 'live' && imgKey_(row[11]) !== 'no') {
      registry.getRange(i + 2, 12).setValue('No');
    }
  });
}

function imgEnsureRegistrySheet_(ss) {
  let sheet = ss.getSheetByName(IMAGE_REGISTRY_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(IMAGE_REGISTRY_SHEET_NAME);
    sheet.getRange(1, 1, 1, 15).setValues([[
      'Image ID','Variant SKU','Product Name','Reference Code','Size','Grade','Image Type','Image Order',
      'Drive File ID','Public Image URL','Variant Folder ID','Active','Uploaded At','Original File Name','Source'
    ]]);
    sheet.hideSheet();
  }
  return sheet;
}

function imgFindProductRow_(sheet, productName, reference) {
  if (!sheet || sheet.getLastRow() < 2) return 0;
  const values = sheet.getRange(2, 2, sheet.getLastRow() - 1, 3).getDisplayValues(); // B:D
  const p = imgKey_(productName), r = imgKey_(reference);
  for (let i = 0; i < values.length; i++) {
    if (r && imgKey_(values[i][2]) === r) return i + 2;
    if (p && imgKey_(values[i][0]) === p) return i + 2;
  }
  return 0;
}

function imgBoxIdFromFields_(fields) {
  for (const key in fields) {
    const normalized = imgKey_(key);
    if (normalized === 'boxid' || normalized === 'box' || normalized.indexOf('boxid') >= 0) {
      return String(fields[key] || '').trim().toUpperCase().replace(/\s+/g, '');
    }
  }
  return '';
}

function imgFirstField_(fields, titles) {
  for (const title of titles) if (fields[title]) return fields[title];
  return '';
}

function imgFieldLike_(fields, needles) {
  for (const key in fields) {
    const k = String(key).trim().toLowerCase();
    if (needles.some(n => k === n || k.indexOf(n) >= 0)) {
      const v = fields[key];
      if (Array.isArray(v)) continue;
      if (String(v || '').trim()) return String(v).trim();
    }
  }
  return '';
}

function imgReadSetting_(ss, key) {
  const sheet = ss.getSheetByName(SETTINGS_SHEET_NAME || 'Settings');
  if (!sheet) return '';
  const values = sheet.getRange(1, 1, Math.max(1, sheet.getLastRow()), 2).getDisplayValues();
  for (let i = 0; i < values.length; i++) if (imgText_(values[i][0]) === key) return imgText_(values[i][1]);
  return '';
}

function imgMakePublic_(file) {
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }
  catch (err) { console.warn('Could not set public sharing for ' + file.getId() + ': ' + err); }
}

function imgPublicUrl_(fileId) {
  return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(fileId)}`;
}

function imgVariantSku_(productName, size, grade) {
  const product = String(productName || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const sizeCode = String(size || '').replace(/[^0-9]/g, '');
  const g = imgNormalizeGrade_(grade);
  const gradeCode = g === 'Japan' ? 'JP' : g === 'Swiss' ? 'SW' : g === 'Super C' ? 'SC' : '';
  return product && sizeCode && gradeCode ? `${product}-${sizeCode}-${gradeCode}` : '';
}

function imgNormalizeGrade_(value) {
  const g = String(value || '').replace(/\s*\([^)]*\)\s*/g, '').trim();
  if (/^super\s*c/i.test(g)) return 'Super C';
  if (/^swiss/i.test(g)) return 'Swiss';
  if (/^japan/i.test(g)) return 'Japan';
  return g;
}

function imgExtension_(name) {
  const match = String(name || '').match(/(\.[A-Za-z0-9]{2,6})$/);
  return match ? match[1].toLowerCase() : '.jpg';
}

function imgKey_(value) {
  return String(value == null ? '' : value).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function imgText_(value) {
  return value == null ? '' : String(value).trim();
}
