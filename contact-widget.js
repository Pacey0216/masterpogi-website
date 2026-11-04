/* Contact panel is independent of catalog state and follows the storefront language. */
(() => {
  'use strict';
  const widget = document.getElementById('contactWidget');
  if (!widget) return;
  const byId = id => document.getElementById(id);
  const config = window.STORE_CONFIG || {};
  const panel = byId('contactPanel');
  const toggle = byId('contactToggle');
  const close = byId('contactClose');
  const copy = {
    fil: {label:'Mag-message', region:'Makipag-ugnayan sa Master Pogi', title:'Makipag-ugnayan', close:'Isara ang mga contact', call:'Tumawag'},
    en: {label:'Message Us', region:'Contact Master Pogi', title:'Get in touch', close:'Close contact options', call:'Call us'}
  };
  function applyLanguage() {
    const text = copy[document.documentElement.lang === 'en' ? 'en' : 'fil'];
    widget.setAttribute('aria-label', text.region);
    byId('contactToggleLabel').textContent = text.label;
    byId('contactPanelTitle').textContent = text.title;
    byId('contactPhoneLabel').textContent = text.call;
    close.setAttribute('aria-label', text.close);
  }
  function setOpen(open, restoreFocus = false) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) byId('contactPhone').focus({preventScroll:true});
    else if (restoreFocus) toggle.focus({preventScroll:true});
  }
  byId('contactPhone').href = config.phoneUrl || 'tel:+639762555370';
  byId('contactPhoneText').textContent = config.phoneDisplay || '0976 255 5370';
  byId('contactEmail').href = `mailto:${config.email || 'support@masterpogiwatch.trade'}`;
  byId('contactEmailText').textContent = config.email || 'support@masterpogiwatch.trade';
  try {
    const url = new URL(config.messengerUrl);
    if (url.protocol === 'https:' && url.hostname === 'www.facebook.com' && /^\/messages\/t\/\d+\/?$/.test(url.pathname)) {
      byId('contactFacebook').href = url.origin + url.pathname;
    }
  } catch {}
  toggle.addEventListener('click', () => setOpen(panel.hidden));
  close.addEventListener('click', () => setOpen(false, true));
  document.addEventListener('pointerdown', event => {
    if (!panel.hidden && !widget.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) {
      event.preventDefault();
      setOpen(false, true);
    }
  });
  document.addEventListener('focusin', event => {
    // Check the settled focus destination. Safari may leave focus on BODY
    // during a pointer click; dismissing on focusout would cancel the link.
    if (!panel.hidden && !widget.contains(event.target)) setOpen(false);
  });
  // Product and image dialogs use the top layer; close this panel when they open.
  new MutationObserver(() => {
    if (document.querySelector('dialog[open]')) setOpen(false);
  }).observe(document.body, {subtree:true, attributes:true, attributeFilter:['open']});
  new MutationObserver(applyLanguage).observe(document.documentElement, {attributes:true, attributeFilter:['lang']});
  applyLanguage();
  widget.hidden = false;
})();
