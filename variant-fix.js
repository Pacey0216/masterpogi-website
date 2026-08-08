// Variant selection hardening: size first, exact size-grade compatibility, grade-level pricing.
function gradePriceFromProduct(p, grade) {
  const k = cleanGrade(grade);
  const gp = p && p.gradePrices ? p.gradePrices : {};
  const direct = gp[k] ?? gp[String(k).toLowerCase()];
  if (Number(direct) > 0) return Number(direct);
  const legacyKey = `${k.replace(/\s+/g, '')}Price`;
  return Number(p?.[legacyKey] || 0) || null;
}

function normalVariants(p) {
  if (Array.isArray(p?.variants) && p.variants.length) {
    return p.variants
      .filter(v => Number(v.stock || 0) > 0 && v.active !== false)
      .map(v => {
        const grade = cleanGrade(v.grade);
        const gradePrice = Number(gradePriceFromProduct(p, grade) || 0);
        return {
          sku: v.sku || v.variantSku || '',
          size: String(v.size || '').trim(),
          grade,
          price: gradePrice > 0 ? gradePrice : Number(v.price ?? v.sellingPrice ?? p.price ?? 0),
          stock: Number(v.stock || 0)
        };
      });
  }

  const sizes = parseSizes(p);
  const grades = parseGrades(p);
  const ss = sizes.length ? sizes : [''];
  const gg = grades.length ? grades : [''];
  const out = [];
  ss.forEach(size => gg.forEach(grade => out.push({
    sku: '',
    size,
    grade,
    price: Number(gradePriceFromProduct(p, grade) ?? p.price ?? 0),
    stock: Number(p.stock || 0)
  })));
  return out;
}

function openProfile(p, focus = false) {
  state.activeProduct = p;
  state.choice = { size: '', grade: '' };

  const vars = normalVariants(p);
  const sizes = uniq(vars.map(v => v.size).filter(Boolean)).sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0));
  const gradeOrder = { Japan: 1, Swiss: 2, 'Super C': 3 };
  const grades = uniq(vars.map(v => v.grade).filter(Boolean)).sort((a, b) => (gradeOrder[a] || 99) - (gradeOrder[b] || 99));

  if (sizes.length === 1) state.choice.size = sizes[0];
  if (grades.length === 1 && sizes.length <= 1) state.choice.grade = grades[0];

  const sizeUI = sizes.length ? `<div class="variant-section"><div class="variant-label">${esc(t('selectSize'))}</div><div id="sizeTiles" class="size-tiles">${sizes.map(s => `<button type="button" class="size-tile${state.choice.size === s ? ' selected' : ''}" data-size="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>` : '';
  const gradeUI = grades.length ? `<div class="variant-section"><div class="variant-label">${esc(t('selectGrade'))}</div><div id="gradeTiles" class="grade-tiles">${grades.map(g => gradeTile(g, p, vars)).join('')}</div></div>` : '';
  const specs = Object.entries(p.specs || {}).filter(([k]) => !['Available Sizes', 'Japan', 'Swiss', 'Super C'].includes(k)).map(([k, v]) => `<div class="spec-row"><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join('');

  $('dialogBody').innerHTML = `<div class="product-profile"><div class="profile-image">${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}">` : '⌚'}</div><div class="profile-info"><div class="profile-sku">${esc(p.sku || '')}</div><h2>${esc(p.name || 'Unnamed Watch')}</h2><div id="profilePrice" class="profile-price">${esc(priceLabel(p))}</div><span class="stock-badge available">Available · ${Number(p.stock || 0)} left</span><p class="profile-description">${esc(p.description || '')}</p><div class="variant-picker">${sizeUI}${gradeUI}</div><div class="specs"><div class="spec-row"><span>${esc(t('brand'))}</span><span>${esc(p.category || p.brand || 'Watch')}</span></div>${specs}</div><button id="profileOrderNow" class="primary-action profile-order-button" type="button">${esc(t('orderNow'))}</button><div id="variantWarning" class="variant-warning hidden">${esc(t('choose'))}</div></div></div>`;

  wireVariantButtons(p, vars, sizes, grades);
  if (!$('productDialog').open) $('productDialog').showModal();
  if (focus) setTimeout(() => document.querySelector('.variant-picker')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 80);
}

function gradeTile(g, p, vars) {
  const m = gradeMeta(g);
  const gradePrice = Number(gradePriceFromProduct(p, g) || 0);
  const variantPrices = uniq(vars.filter(v => v.grade === g).map(v => Number(v.price || 0)).filter(Boolean));
  const price = gradePrice > 0 ? gradePrice : (variantPrices.length ? Math.min(...variantPrices) : Number(p.price || 0));
  return `<button type="button" class="grade-tile ${m.className}${state.choice.grade === g ? ' selected' : ''}" data-grade="${esc(g)}"><span class="grade-symbol">${m.symbol}</span><span class="grade-copy"><strong>${esc(g === 'Super C' ? 'Super C (1:1)' : g)}</strong><small>${esc(m.label)}</small></span><span class="grade-price">${money(price)}</span></button>`;
}

function wireVariantButtons(p, vars, sizes, grades) {
  const sizeBtns = [...document.querySelectorAll('.size-tile')];
  const gradeBtns = [...document.querySelectorAll('.grade-tile')];
  const order = $('profileOrderNow');

  const compatible = () => vars.filter(v =>
    (!state.choice.size || v.size === state.choice.size) &&
    (!state.choice.grade || v.grade === state.choice.grade)
  );

  function refresh() {
    sizeBtns.forEach(b => {
      const size = b.dataset.size;
      b.disabled = !vars.some(v => v.size === size);
      b.classList.toggle('selected', state.choice.size === size);
    });

    if (state.choice.size && state.choice.grade && !vars.some(v => v.size === state.choice.size && v.grade === state.choice.grade)) {
      state.choice.grade = '';
    }

    const mustPickSizeFirst = sizes.length > 1 && !state.choice.size;
    const gradesForSize = uniq(vars.filter(v => !state.choice.size || v.size === state.choice.size).map(v => v.grade).filter(Boolean));

    if (!mustPickSizeFirst && !state.choice.grade && gradesForSize.length === 1) {
      state.choice.grade = gradesForSize[0];
    }

    gradeBtns.forEach(b => {
      const grade = b.dataset.grade;
      const ok = !mustPickSizeFirst && vars.some(v => v.grade === grade && (!state.choice.size || v.size === state.choice.size));
      b.disabled = !ok;
      b.classList.toggle('selected', state.choice.grade === grade && ok);
    });

    const needSize = sizes.length > 1;
    const needGrade = grades.length > 1 || gradesForSize.length > 0;
    const exact = compatible();
    const ready = (!needSize || !!state.choice.size) && (!needGrade || !!state.choice.grade) && exact.length > 0;
    order.disabled = !ready;
    $('variantWarning')?.classList.toggle('hidden', ready);

    let priceOptions = exact;
    if (!state.choice.grade && state.choice.size) priceOptions = vars.filter(v => v.size === state.choice.size);
    if (!state.choice.size) priceOptions = vars;
    const prices = uniq(priceOptions.map(v => Number(v.price || 0)).filter(x => x > 0));
    if ($('profilePrice')) {
      $('profilePrice').textContent = prices.length === 1 ? money(prices[0]) : prices.length > 1 ? `${t('from')} ${money(Math.min(...prices))}` : priceLabel(p);
    }
  }

  sizeBtns.forEach(b => b.onclick = () => {
    state.choice.size = b.dataset.size;
    if (state.choice.grade && !vars.some(v => v.size === state.choice.size && v.grade === state.choice.grade)) state.choice.grade = '';
    refresh();
  });

  gradeBtns.forEach(b => b.onclick = () => {
    if (b.disabled) return;
    state.choice.grade = b.dataset.grade;
    refresh();
  });

  refresh();
  order.onclick = () => {
    const exact = compatible();
    if (order.disabled || !exact.length) return;
    sendOrder(p, exact[0]);
  };
}
