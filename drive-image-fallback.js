// Adds resilient fallbacks for Google Drive live images and prevents broken-image alt text from expanding the gallery.
(() => {
  const isImage = node => node instanceof HTMLImageElement;

  function extractDriveId(src) {
    if (!src) return '';
    try {
      const u = new URL(src, window.location.href);
      if (u.hostname.includes('drive.google.com')) {
        return u.searchParams.get('id') || (u.pathname.match(/\/d\/([^/]+)/) || [])[1] || '';
      }
      if (u.hostname.includes('googleusercontent.com')) {
        return (u.pathname.match(/\/d\/([^/=]+)/) || [])[1] || '';
      }
    } catch (e) {}
    return '';
  }

  function fallbackUrls(id) {
    const safe = encodeURIComponent(id);
    return [
      `https://drive.google.com/thumbnail?id=${safe}&sz=w1600`,
      `https://lh3.googleusercontent.com/d/${safe}=w1600`
    ];
  }

  function bind(img) {
    if (!isImage(img) || img.dataset.driveFallbackBound === '1') return;
    const id = extractDriveId(img.currentSrc || img.src);
    if (!id) return;

    img.dataset.driveFallbackBound = '1';
    const sources = [img.currentSrc || img.src, ...fallbackUrls(id)];
    let attempt = 0;

    img.addEventListener('error', () => {
      attempt += 1;
      if (attempt < sources.length) {
        img.src = sources[attempt];
        return;
      }

      img.removeAttribute('alt');
      img.style.display = 'none';
      const holder = img.parentElement;
      if (holder && !holder.querySelector('.drive-image-missing')) {
        const missing = document.createElement('span');
        missing.className = 'drive-image-missing';
        missing.textContent = 'Image unavailable';
        holder.appendChild(missing);
      }
    });
  }

  function scan(root) {
    if (isImage(root)) bind(root);
    root?.querySelectorAll?.('img').forEach(bind);
  }

  const style = document.createElement('style');
  style.textContent = `
    .v4-gallery-main,.v4-gallery-thumb{position:relative;overflow:hidden}
    .drive-image-missing{display:grid;place-items:center;width:100%;height:100%;min-height:72px;background:#101012;color:#85858b;font-size:.76rem;font-weight:700;text-align:center;padding:12px}
    .v4-gallery-main>.drive-image-missing{min-height:340px}
  `;
  document.head.appendChild(style);

  scan(document);
  new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node.nodeType === 1) scan(node);
    }));
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
