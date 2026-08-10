// Keeps the featured 1-3 / 4-6 carousel position stable across live inventory refreshes.
(() => {
  let page = 0;

  renderTop = function() {
    const c = $('topSellers'); if (!c) return;
    const featured = state.products.filter(p => p.featured === true).sort(sortSales).slice(0, 6);
    const pages = Math.max(1, Math.ceil(featured.length / 3));
    page = Math.min(page, pages - 1);
    c.innerHTML = '';
    featured.forEach(p => c.appendChild(card(p)));
    requestAnimationFrame(() => move(false));
    $('topPrev')?.toggleAttribute('disabled', featured.length <= 3);
    $('topNext')?.toggleAttribute('disabled', featured.length <= 3);
  };

  scrollTop = function(direction) {
    const c = $('topSellers'); if (!c) return;
    const pages = Math.ceil(c.children.length / 3);
    if (pages <= 1) return;
    page = (page + (direction > 0 ? 1 : -1) + pages) % pages;
    move(true);
  };

  function move(smooth) {
    const c = $('topSellers'); if (!c) return;
    const count = c.children.length;
    const target = c.children[page * 3];
    c.scrollTo({ left: target ? target.offsetLeft - c.offsetLeft : 0, behavior: smooth ? 'smooth' : 'auto' });
    let status = $('v4TopStatus');
    const controls = document.querySelector('.carousel-controls');
    if (!status && controls) {
      status = document.createElement('span'); status.id = 'v4TopStatus'; status.className = 'v4-top-status';
      controls.insertBefore(status, controls.firstChild);
    }
    if (status) {
      const start = count ? page * 3 + 1 : 0;
      status.textContent = `${start}–${Math.min(start + 2, count)} / ${count}`;
    }
  }
})();
