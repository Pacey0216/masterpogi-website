/* Public catalog data only. Shared by the browser and the local verification suite. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CatalogModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const text = value => String(value == null ? '' : value).trim();
  const folded = value => text(value).toLocaleLowerCase('en');
  const number = value => {
    const n = typeof value === 'number' ? value : Number(text(value).replace(/,/g, ''));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  const numeric = value => value !== null && value !== undefined && text(value) !== '' && Number.isFinite(Number(text(value).replace(/,/g, '')));
  const enabled = value => !['false', 'no', '0', 'hidden', 'hide', 'inactive', 'disabled'].includes(folded(value));
  const isFeatured = value => ['string', 'number', 'boolean'].includes(typeof value) && ['yes', 'true', '1', 'featured'].includes(folded(value));
  const visible = item => enabled(item.visible) && enabled(item.websiteVisibility) && enabled(item['Website Visibility']) && enabled(item.active);
  const alpha = (a, b) => text(a).localeCompare(text(b), 'en', {sensitivity: 'base', numeric: true}) || text(a).localeCompare(text(b), 'en');
  const emptyPhotos = () => [null, null, null, null];
  const gradeName = value => {
    const raw = text(value), key = folded(raw).replace(/\s+/g, ' ');
    return ({japan: 'Japan', swiss: 'Swiss', 'super c': 'Super C', superc: 'Super C'})[key] || raw;
  };
  const sizeName = value => text(value).replace(/\s*mm$/i, ' mm');
  const publicSpecNames = new Set(['Reference', 'Available Sizes', 'Movement', 'Case Material', 'Dial', 'Strap', 'Water Resistance', 'Case', 'Material', 'Color', 'Gender']);
  function publicSpecs(specs) {
    if (!specs || typeof specs !== 'object' || Array.isArray(specs)) return {};
    return Object.fromEntries(Object.entries(specs).filter(([key, value]) => publicSpecNames.has(key) && ['string', 'number'].includes(typeof value)).map(([key, value]) => [key, text(value)]));
  }
  function uploadedPhotos(variant) {
    if (!variant || variant.photoSource !== 'form-upload-order' || !Array.isArray(variant.photos)) return emptyPhotos();
    const seen = new Set();
    return Array.from({length: 4}, (_, index) => {
      const candidate = text(typeof variant.photos[index] === 'string' ? variant.photos[index] : variant.photos[index]?.url);
      if (!candidate || seen.has(candidate)) return null;
      try {
        const url = new URL(candidate);
        if (!['https:', 'http:'].includes(url.protocol)) return null;
      } catch { return null; }
      seen.add(candidate);
      return candidate;
    });
  }
  function legacyVariants(product) {
    // Old APIs have aggregate grade stock but no grade-to-size relationship. A
    // list of sizes must never be expanded into invented purchasable variants.
    const stock = number(product.stock);
    if (!stock) return [];
    const sizeValues = text(product.size || product.specs?.['Available Sizes']).split(/[,;|]/).map(sizeName).filter(Boolean);
    const size = sizeValues.length === 1 ? sizeValues[0] : '';
    const gradeText = text(product.grade);
    const matches = [...gradeText.matchAll(/([^·,;|()]+)\s*\((\d+(?:\.\d+)?)\)/g)];
    const grades = matches.length ? matches.map(match => ({grade: gradeName(match[1]), stock: number(match[2])})) : [{grade: /^available$/i.test(gradeText) ? '' : gradeName(gradeText), stock}];
    return grades.filter(item => item.stock > 0).map(item => ({
      sku: text(product.sku || product.productId || product.reference),
      grade: item.grade, size, stock: item.stock,
      photos: emptyPhotos(), photoSource: '', legacy: true
    }));
  }
  function availableVariants(product) {
    if (!product || !visible(product)) return [];
    const records = Array.isArray(product.variants) ? product.variants : [];
    if (!records.length) return legacyVariants(product);
    return records.filter(v => v && typeof v === 'object' && visible(v) && number(v.stock) > 0).map(v => {
      const grade = gradeName(v.grade);
      return {
        sku: text(v.sku || v.variantSku || product.sku || product.productId || product.reference),
        grade, size: sizeName(v.size), stock: number(v.stock),
        photos: uploadedPhotos(v), photoSource: v.photoSource === 'form-upload-order' ? v.photoSource : '',
        ...(v.legacy ? {legacy: true} : {})
      };
    });
  }
  function brandTotals(products) {
    const totals = new Map();
    for (const product of products) {
      const brand = folded(product.brand || product.category || 'Watch');
      const current = totals.get(brand) || {sum: 0, explicit: null};
      current.sum += number(product.sold);
      if (numeric(product.brandSold)) current.explicit = Math.max(current.explicit ?? 0, number(product.brandSold));
      totals.set(brand, current);
    }
    return new Map([...totals].map(([brand, values]) => [brand, values.explicit ?? values.sum]));
  }
  function normalizeInventory(payload) {
    const source = Array.isArray(payload) ? payload : payload?.products;
    if (!Array.isArray(source)) return [];
    const raw = source.filter(p => p && typeof p === 'object');
    const totals = brandTotals(raw), products = [];
    for (const product of raw) {
      if (!visible(product) || (numeric(product.stock) && number(product.stock) <= 0)) continue;
      const variants = availableVariants(product);
      if (!variants.length) continue;
      const name = text(product.name), sku = text(product.sku || product.productId || product.reference || name);
      if (!name || !sku) continue;
      const brand = text(product.brand || product.category) || 'Watch';
      products.push({
        sku, name, brand,
        stock: variants.reduce((sum, v) => sum + v.stock, 0),
        sold: number(product.sold), brandSold: totals.get(folded(brand)) || 0, featured: isFeatured(product.featured),
        variants, specs: publicSpecs(product.specs), visible: true
      });
    }
    return sortCatalog(products);
  }
  function sortCatalog(products) {
    const list = Array.isArray(products) ? products.slice() : [], totals = brandTotals(list);
    return list.sort((a, b) => {
      const brandA = folded(a.brand), brandB = folded(b.brand);
      if (brandA !== brandB) return (totals.get(brandB) || 0) - (totals.get(brandA) || 0) || alpha(a.brand, b.brand);
      return number(b.sold) - number(a.sold) || alpha(a.name, b.name) || alpha(a.sku, b.sku);
    });
  }
  function filterProducts(products, filters = {}) {
    const query = folded(filters.query).split(/\s+/).filter(Boolean), brand = folded(filters.brand), grade = folded(filters.grade);
    return sortCatalog((Array.isArray(products) ? products : []).filter(product => {
      const variants = availableVariants(product);
      if (!visible(product) || !variants.length || number(product.stock) <= 0) return false;
      if (brand && folded(product.brand) !== brand) return false;
      if (grade && !variants.some(variant => folded(variant.grade) === grade)) return false;
      const haystack = folded([product.name, product.brand, product.sku, product.specs?.Reference, ...variants.flatMap(v => [v.sku, v.grade, v.size])].join(' '));
      return query.every(token => haystack.includes(token));
    }));
  }
  function bestSellers(products) {
    return (Array.isArray(products) ? products : []).filter(p => visible(p) && number(p.stock) > 0 && number(p.sold) > 0 && availableVariants(p).length).slice().sort((a, b) => number(b.sold) - number(a.sold) || alpha(a.name, b.name) || alpha(a.brand, b.brand) || alpha(a.sku, b.sku));
  }
  function paginateProducts(products, page = 1, pageSize = 24) {
    const list = Array.isArray(products) ? products : [];
    const requestedSize = Math.floor(Number(pageSize));
    const size = Number.isFinite(requestedSize) && requestedSize > 0 ? requestedSize : 24;
    const total = list.length, totalPages = Math.max(1, Math.ceil(total / size));
    const requestedPage = Math.floor(Number(page));
    const currentPage = Math.min(totalPages, Math.max(1, Number.isFinite(requestedPage) ? requestedPage : 1));
    return {items: list.slice((currentPage - 1) * size, currentPage * size), page: currentPage, totalPages, total};
  }
  function featuredProducts(products) {
    // The Products sheet controls inclusion; recorded sales only control order.
    // A zero-sale featured watch remains eligible without a bestseller claim.
    return (Array.isArray(products) ? products : []).filter(p => p && typeof p === 'object' && isFeatured(p.featured) && visible(p) && number(p.stock) > 0 && availableVariants(p).length).slice().sort((a, b) => number(b.sold) - number(a.sold) || alpha(a.name, b.name) || alpha(a.brand, b.brand) || alpha(a.sku, b.sku));
  }
  function selectionKey(product, variant) {
    return JSON.stringify([text(product?.sku), text(variant?.sku || variant?.variantSku), gradeName(variant?.grade), sizeName(variant?.size)]);
  }
  function photosForVariant(product, variant) {
    if (!product || !variant) return emptyPhotos();
    const exact = availableVariants(product).find(record => selectionKey(product, record) === selectionKey(product, variant));
    return exact ? exact.photos.slice(0, 4) : emptyPhotos();
  }
  function comparisonEligibility(a, b) {
    if (!a?.product || !a?.variant || !b?.product || !b?.variant) return {allowed: false, reason: 'select-two'};
    const sku = selection => folded(selection.variant.sku || selection.variant.variantSku || selection.product.sku).replace(/\s+/g, ' ');
    if (sku(a) === sku(b)) return {allowed: false, reason: 'duplicate'};
    return {allowed: true, reason: ''};
  }
  return Object.freeze({normalizeInventory, availableVariants, sortCatalog, filterProducts, bestSellers, featuredProducts, paginateProducts, selectionKey, photosForVariant, comparisonEligibility});
});
