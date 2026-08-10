// Storefront v4 enhancements: header search, tile filters, rotating featured carousel, live variant galleries.
(() => {
  const v4Brands = new Set();
  const v4Grades = new Set();
  const v4ImageCache = new Map();
  let v4TopPage = 0;
  let v4GalleryToken = 0;

  buildHeaderSearch();
  buildFilterTiles();

  const baseRenderProducts = renderProducts;
  renderProducts = function(list) {
    baseRenderProducts(list);
    syncFilterOptions();
    if (v4Brands.size || v4Grades.size) queueMicrotask(applyV4Filters);
  };

  renderTop = function() {
    const c = $('topSellers'); if (!c) return;
    const featured = state.products.filter(p => p.featured === true).sort(sortSales).slice(0, 6);
    c.innerHTML = '';
    featured.forEach(p => c.appendChild(card(p)));
    v4TopPage = 0;
    c.scrollLeft = 0;
    updateTopStatus(featured.length);
    $('topPrev')?.toggleAttribute('disabled', featured.length <= 3);
    $('topNext')?.toggleAttribute('disabled', featured.length <= 3);
  };

  scrollTop = function(direction) {
    const c = $('topSellers'); if (!c) return;
    const count = c.children.length;
    const pages = Math.ceil(count / 3);
    if (pages <= 1) return;
    v4TopPage = (v4TopPage + (direction > 0 ? 1 : -1) + pages) % pages;
    const target = c.children[v4TopPage * 3];
    c.scrollTo({ left: target ? target.offsetLeft - c.offsetLeft : 0, behavior: 'smooth' });
    updateTopStatus(count);
  };

  setInterval(() => { if (!document.hidden) scrollTop(1); }, 60000); // purely client-side; no new fetch/AWS transfer

  const baseSetLanguage = setLanguage;
  setLanguage = function(language) {
    baseSetLanguage(language);
    applyV4Language();
    syncFilterOptions();
  };

  const baseWireVariantButtons = wireVariantButtons;
  wireVariantButtons = function(p, vars, sizes, grades) {
    baseWireVariantButtons(p, vars, sizes, grades);
    const refreshGallery = () => setTimeout(() => updateGalleryForChoice(p, vars), 0);
    document.querySelectorAll('.size-tile,.grade-tile').forEach(button => button.addEventListener('click', refreshGallery));
    setTimeout(() => updateGalleryForChoice(p, vars), 0);
  };

  const baseOpenProfile = openProfile;
  openProfile = function(p, focus = false) {
    baseOpenProfile(p, focus);
    enhanceGallery(p);
  };

  $('catalogSearch')?.addEventListener('input', applyV4Filters);
  applyV4Language();

  function buildHeaderSearch() {
    const header = document.querySelector('.simple-header');
    const input = $('catalogSearch');
    const controls = header?.querySelector('.header-controls');
    if (!header || !input || !controls) return;
    document.querySelector('.hero-search')?.remove();
    const wrap = document.createElement('label');
    wrap.className = 'header-search';
    wrap.setAttribute('aria-label', 'Search watches');
    wrap.innerHTML = '<span class="header-search-icon">⌕</span>';
    wrap.appendChild(input);
    header.insertBefore(wrap, controls);
    document.querySelector('.sticky-search')?.remove();
  }

  function buildFilterTiles() {
    const grid = $('productGrid'); if (!grid || $('v4Filters')) return;
    const panel = document.createElement('div');
    panel.id = 'v4Filters'; panel.className = 'v4-filter-panel';
    panel.innerHTML = '<div class="v4-filter-head"><span id="v4FilterLabel" class="section-label">FILTERS</span><button id="v4ClearFilters" class="v4-clear hidden" type="button">Clear</button></div><div class="v4-filter-groups"><div class="v4-filter-group"><span id="v4BrandLabel" class="v4-filter-label">Brands</span><div id="v4BrandTiles" class="v4-filter-tiles"></div></div><div class="v4-filter-group"><span id="v4GradeLabel" class="v4-filter-label">Grades</span><div id="v4GradeTiles" class="v4-filter-tiles"></div></div></div>';
    grid.parentNode.insertBefore(panel, grid);
    $('v4ClearFilters')?.addEventListener('click', () => { v4Brands.clear(); v4Grades.clear(); syncFilterOptions(); applyV4Filters(); });
  }

  function syncFilterOptions() {
    const brands = [...new Set(state.products.map(p => String(p.category || p.brand || '').trim()).filter(Boolean))].sort();
    const grades = ['Japan', 'Swiss', 'Super C'].filter(g => state.products.some(p => productGrades(p).includes(g)));
    const validBrands = new Set(brands.map(x => x.toLowerCase()));
    const validGrades = new Set(grades);
    [...v4Brands].forEach(x => { if (!validBrands.has(x)) v4Brands.delete(x); });
    [...v4Grades].forEach(x => { if (!validGrades.has(x)) v4Grades.delete(x); });
    renderTiles('v4BrandTiles', brands, v4Brands, x => x.toLowerCase(), x => x);
    renderTiles('v4GradeTiles', grades, v4Grades, x => x, x => x === 'Super C' ? 'Super C (1:1)' : x);
    $('v4ClearFilters')?.classList.toggle('hidden', !v4Brands.size && !v4Grades.size);
    applyV4Language();
  }

  function renderTiles(id, values, selected, keyFn, labelFn) {
    const c = $(id); if (!c) return; c.innerHTML = '';
    values.forEach(value => {
      const key = keyFn(value); const b = document.createElement('button');
      b.type = 'button'; b.className = 'v4-filter-tile'; b.textContent = labelFn(value);
      b.classList.toggle('selected', selected.has(key));
      b.onclick = () => { selected.has(key) ? selected.delete(key) : selected.add(key); syncFilterOptions(); applyV4Filters(); };
      c.appendChild(b);
    });
  }

  function productGrades(p) {
    if (Array.isArray(p.variants) && p.variants.length) return uniq(p.variants.filter(v => Number(v.stock || 0) > 0 && v.active !== false).map(v => cleanGrade(v.grade)).filter(Boolean));
    const out = []; ['Japan', 'Swiss', 'Super C'].forEach(g => { if (String(p.specs?.[g] || '').trim()) out.push(g); }); return out;
  }

  function applyV4Filters() {
    const q = ($('catalogSearch')?.value || '').trim().toLowerCase();
    const list = state.products.filter(p => {
      const brand = String(p.category || p.brand || '').toLowerCase();
      const grades = productGrades(p);
      const haystack = [p.sku, p.name, p.category, p.brand, p.grade, p.reference, ...Object.values(p.specs || {})].join(' ').toLowerCase();
      return (!v4Brands.size || v4Brands.has(brand)) && (!v4Grades.size || grades.some(g => v4Grades.has(g))) && (!q || haystack.includes(q));
    }).sort(sortSales);
    state.filtered = list;
    baseRenderProducts(list);
    $('emptyState')?.classList.toggle('hidden', list.length > 0);
  }

  function updateTopStatus(count) {
    let status = $('v4TopStatus');
    if (!status) {
      const controls = document.querySelector('.carousel-controls');
      if (!controls) return;
      status = document.createElement('span'); status.id = 'v4TopStatus'; status.className = 'v4-top-status'; controls.parentNode.insertBefore(status, controls);
    }
    const start = count ? v4TopPage * 3 + 1 : 0;
    status.textContent = `${start}–${Math.min(start + 2, count)} / ${count}`;
  }

  function applyV4Language() {
    const fil = state.language !== 'en';
    const search = $('catalogSearch');
    if (search) search.placeholder = fil ? 'Hanapin ang relo, brand, o reference' : 'Search watch, brand, or reference';
    text('v4FilterLabel', 'FILTERS'); text('v4BrandLabel', 'Brands'); text('v4GradeLabel', 'Grades');
    text('v4ClearFilters', fil ? 'I-clear' : 'Clear');
  }

  function enhanceGallery(p) {
    const photo = document.querySelector('#dialogBody .profile-image');
    if (!photo || photo.classList.contains('v4-gallery')) return;
    photo.classList.add('v4-gallery');
    photo.innerHTML = `<div id="v4GalleryMain" class="v4-gallery-main">${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}">` : '⌚'}</div><div id="v4GalleryThumbs" class="v4-gallery-thumbs"></div>`;
    setGallery([p.image].filter(Boolean), p.name);
  }

  async function updateGalleryForChoice(p, vars) {
    enhanceGallery(p);
    const exact = vars.filter(v => (!state.choice.size || v.size === state.choice.size) && (!state.choice.grade || v.grade === state.choice.grade));
    const complete = !!state.choice.size && !!state.choice.grade && exact.length === 1 && exact[0].sku;
    if (!complete) { setGallery([p.image].filter(Boolean), p.name); return; }
    const token = ++v4GalleryToken;
    const live = await fetchVariantImages(exact[0].sku);
    if (token !== v4GalleryToken || state.activeProduct !== p) return;
    setGallery(uniq([p.image, ...live].filter(Boolean)), `${p.name} ${exact[0].size} ${exact[0].grade}`);
  }

  async function fetchVariantImages(sku) {
    if (!sku || !C.apiUrl) return [];
    if (v4ImageCache.has(sku)) return v4ImageCache.get(sku);
    try {
      const response = await fetch(C.apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'variantImages', sku }) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const images = data.success && Array.isArray(data.images) ? data.images.filter(Boolean).slice(0, 5) : [];
      v4ImageCache.set(sku, images); return images;
    } catch (error) {
      console.warn('Live images unavailable', error); v4ImageCache.set(sku, []); return [];
    }
  }

  function setGallery(images, alt) {
    const main = $('v4GalleryMain'), thumbs = $('v4GalleryThumbs'); if (!main || !thumbs) return;
    const list = uniq(images.filter(Boolean));
    if (!list.length) { main.textContent = '⌚'; thumbs.innerHTML = ''; return; }
    main.innerHTML = `<img src="${esc(list[0])}" alt="${esc(alt || '')}">`;
    thumbs.innerHTML = '';
    if (list.length <= 1) return;
    list.forEach((url, index) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = `v4-gallery-thumb${index === 0 ? ' selected' : ''}`;
      b.innerHTML = `<img src="${esc(url)}" alt="${esc(`${alt || ''} image ${index + 1}`)}" loading="lazy" decoding="async">`;
      b.onclick = () => { main.innerHTML = `<img src="${esc(url)}" alt="${esc(alt || '')}">`; [...thumbs.children].forEach(x => x.classList.remove('selected')); b.classList.add('selected'); };
      thumbs.appendChild(b);
    });
  }
})();
