// Featured showcase: show 1-3 first, advance to 4-6 once, then stay there.
(() => {
  let page = 0;

  renderTop = function() {
    const c = $('topSellers'); if (!c) return;
    const featured = state.products.filter(p => p.featured === true).sort(sortSales).slice(0, 6);
    const maxPage = Math.max(0, Math.ceil(featured.length / 3) - 1);
    page = Math.min(page, maxPage);
    c.innerHTML = '';
    featured.forEach(p => c.appendChild(card(p)));
    requestAnimationFrame(() => move(false));
  };

  scrollTop = function(direction) {
    const c = $('topSellers'); if (!c) return;
    const maxPage = Math.max(0, Math.ceil(c.children.length / 3) - 1);
    if (maxPage <= 0) { updateControls(); return; }

    const nextPage = Math.max(0, Math.min(maxPage, page + (direction > 0 ? 1 : -1)));
    if (nextPage === page) { updateControls(); return; }

    page = nextPage;
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
      status = document.createElement('span');
      status.id = 'v4TopStatus';
      status.className = 'v4-top-status';
      controls.insertBefore(status, controls.firstChild);
    }
    if (status) {
      const start = count ? page * 3 + 1 : 0;
      status.textContent = `${start}–${Math.min(start + 2, count)} / ${count}`;
    }
    updateControls();
  }

  function updateControls() {
    const c = $('topSellers'); if (!c) return;
    const maxPage = Math.max(0, Math.ceil(c.children.length / 3) - 1);
    $('topPrev')?.toggleAttribute('disabled', page <= 0);
    $('topNext')?.toggleAttribute('disabled', page >= maxPage);
  }
})();
