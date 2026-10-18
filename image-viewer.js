/* Full-image viewer. Uses the selected upload only, never another variant's photo. */
(() => {
  'use strict';
  const WORDS = {
    fil: {title:'Larawan ng relo',close:'Isara',zoomIn:'Palakihin',zoomOut:'Paliitin',reset:'Ibalik',previous:'Nakaraang larawan',next:'Susunod na larawan',zoom:'Laki ng larawan',hint:'I-pinch para palakihin at i-drag para igalaw. I-double-tap para ibalik.',loading:'Binubuksan ang larawan…',error:'Hindi mabuksan ang larawan. Pakisubukang muli.'},
    en: {title:'Watch photo',close:'Close',zoomIn:'Zoom in',zoomOut:'Zoom out',reset:'Reset',previous:'Previous photo',next:'Next photo',zoom:'Image zoom',hint:'Pinch to zoom and drag to move. Double-tap to reset.',loading:'Opening photo…',error:'This photo could not be opened. Please try again.'}
  };
  const MAX_ZOOM = 6;
  let dialog, stage, photo, status, title, hint, closeButton, plusButton, minusButton, resetButton, zoomLevel, previousButton, nextButton;
  let language = 'fil', scale = 1, x = 0, y = 0, fittedWidth = 0, fittedHeight = 0;
  let loaded = false, failed = false, request = 0, gesture = null, lastTap = null, restore = null;
  let gallery = [], imageIndex = 0, onChange = null, onClose = null;
  const pointers = new Map();
  const words = () => WORDS[language];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function sources(source) {
    if (!source || typeof source !== 'string') return [];
    try {
      const url = new URL(source, document.baseURI);
      if (!['http:','https:','blob:','data:'].includes(url.protocol)) return [];
      if (url.protocol === 'data:' && !source.startsWith('data:image/')) return [];
      let id = '';
      if (url.hostname === 'drive.google.com') id = url.searchParams.get('id') || (url.pathname.match(/^\/file\/d\/([^/]+)/) || [])[1] || '';
      if (url.hostname === 'lh3.googleusercontent.com') id = (url.pathname.match(/^\/d\/([^/=]+)/) || [])[1] || '';
      if (/^[a-zA-Z0-9_-]+$/.test(id)) {
        const encoded = encodeURIComponent(id);
        return [...new Set([
          `https://lh3.googleusercontent.com/d/${encoded}=s0`,
          `https://lh3.googleusercontent.com/d/${encoded}=w2400`,
          `https://drive.google.com/thumbnail?id=${encoded}&sz=w2400`,
          source
        ])];
      }
      return [source];
    } catch { return []; }
  }

  function paint() {
    if (!dialog) return;
    const boundX = Math.max(0, (fittedWidth * scale - stage.clientWidth) / 2);
    const boundY = Math.max(0, (fittedHeight * scale - stage.clientHeight) / 2);
    x = clamp(x, -boundX, boundX); y = clamp(y, -boundY, boundY);
    photo.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`;
    stage.classList.toggle('is-zoomed', scale > 1);
    stage.classList.toggle('is-dragging', pointers.size > 0 && scale > 1);
    zoomLevel.textContent = `${Math.round(scale * 100)}%`;
    zoomLevel.setAttribute('aria-label', `${words().zoom}: ${Math.round(scale * 100)}%`);
    plusButton.disabled = !loaded || scale >= MAX_ZOOM;
    minusButton.disabled = !loaded || scale <= 1;
    resetButton.disabled = !loaded || (scale <= 1 && x === 0 && y === 0);
  }

  function fit() {
    if (!loaded || !dialog.open || !photo.naturalWidth) return;
    const ratio = Math.min(stage.clientWidth / photo.naturalWidth, stage.clientHeight / photo.naturalHeight);
    fittedWidth = photo.naturalWidth * ratio; fittedHeight = photo.naturalHeight * ratio;
    photo.style.width = `${fittedWidth}px`; photo.style.height = `${fittedHeight}px`;
    paint();
  }

  function clearPointers() {
    const captured = [...pointers.keys()];
    pointers.clear(); gesture = null; lastTap = null;
    captured.forEach(id => { if (stage.hasPointerCapture(id)) stage.releasePointerCapture(id); });
  }

  function reset() {
    clearPointers(); scale = 1; x = 0; y = 0; paint();
  }

  function zoomTo(next, anchor = {x:0, y:0}) {
    if (!loaded) return;
    next = clamp(next, 1, MAX_ZOOM);
    x = anchor.x - (anchor.x - x) * next / scale;
    y = anchor.y - (anchor.y - y) * next / scale;
    scale = next;
    paint();
  }

  function localPoint(point) {
    const rect = stage.getBoundingClientRect();
    return {x:point.x - rect.left - rect.width / 2, y:point.y - rect.top - rect.height / 2};
  }

  function beginGesture() {
    const points = [...pointers.values()];
    if (points.length >= 2) {
      pointers.forEach(point => { point.multi = true; });
      const a = points[0], b = points[1];
      const middle = localPoint({x:(a.x+b.x)/2, y:(a.y+b.y)/2});
      gesture = {kind:'pinch',distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),scale,anchorX:(middle.x-x)/scale,anchorY:(middle.y-y)/scale};
      lastTap = null;
    } else if (points.length === 1) {
      gesture = {kind:'pan',startX:points[0].x,startY:points[0].y,x,y};
    } else gesture = null;
    paint();
  }

  function pointerDown(event) {
    if (!dialog.open || !loaded || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,startTime:performance.now(),moved:false,multi:false,type:event.pointerType});
    stage.setPointerCapture(event.pointerId);
    beginGesture();
  }

  function pointerMove(event) {
    const point = pointers.get(event.pointerId);
    if (!point || !gesture) return;
    event.preventDefault();
    point.x = event.clientX; point.y = event.clientY;
    if (Math.hypot(point.x-point.startX,point.y-point.startY) > 8) point.moved = true;
    const points = [...pointers.values()];
    if (gesture.kind === 'pinch' && points.length >= 2) {
      const a = points[0], b = points[1];
      const middle = localPoint({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
      scale = clamp(gesture.scale * Math.hypot(a.x-b.x,a.y-b.y) / gesture.distance,1,MAX_ZOOM);
      x = middle.x - gesture.anchorX * scale;
      y = middle.y - gesture.anchorY * scale;
    } else if (gesture.kind === 'pan') {
      x = gesture.x + point.x - gesture.startX;
      y = gesture.y + point.y - gesture.startY;
    }
    paint();
  }

  function pointerEnd(event) {
    const point = pointers.get(event.pointerId);
    if (!point) return;
    const now = performance.now();
    if (event.type === 'pointerup' && point.type === 'touch' && !point.multi && !point.moved && now-point.startTime < 350) {
      if (lastTap && now-lastTap.time < 350 && Math.hypot(point.x-lastTap.x,point.y-lastTap.y) < 30) reset();
      else lastTap = {time:now,x:point.x,y:point.y};
    }
    pointers.delete(event.pointerId);
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    beginGesture();
  }

  function translate() {
    if (!dialog) return;
    const copy = words();
    dialog.lang = language;
    title.textContent = copy.title;
    hint.textContent = copy.hint;
    closeButton.textContent = `${copy.close} ×`;
    plusButton.setAttribute('aria-label',copy.zoomIn); plusButton.title = copy.zoomIn;
    minusButton.setAttribute('aria-label',copy.zoomOut); minusButton.title = copy.zoomOut;
    resetButton.textContent = copy.reset;
    previousButton.setAttribute('aria-label',copy.previous); previousButton.title = copy.previous;
    nextButton.setAttribute('aria-label',copy.next); nextButton.title = copy.next;
    previousButton.hidden = imageIndex <= 0;
    nextButton.hidden = imageIndex >= gallery.length - 1;
    stage.setAttribute('aria-label',copy.title);
    status.textContent = failed ? copy.error : copy.loading;
    paint();
  }

  function restorePosition() {
    if (!restore) return;
    const previous = restore; restore = null;
    document.documentElement.style.removeProperty('overflow');
    previous.overflow.forEach(([property,value,priority]) => {
      if (value) document.documentElement.style.setProperty(property,value,priority);
    });
    if (previous.focus && previous.focus.isConnected) previous.focus.focus({preventScroll:true});
    previous.scrollers.forEach(({element,top,left}) => { if (element.isConnected) { element.scrollTop = top; element.scrollLeft = left; } });
    window.scrollTo({left:previous.left,top:previous.top,behavior:'instant'});
  }

  function finishClose() {
    if (!restore && !gallery.length) return;
    const callback = onClose;
    onChange = null; onClose = null; gallery = []; imageIndex = 0;
    request++; loaded = false; failed = false;
    reset();
    fittedWidth = 0; fittedHeight = 0;
    photo.hidden = true; photo.removeAttribute('src');
    previousButton.hidden = true; nextButton.hidden = true;
    restorePosition();
    if (callback) callback();
  }

  function close() {
    if (!dialog) return;
    if (dialog.open) dialog.close();
    finishClose();
  }

  function navigate(index) {
    if (!dialog.open || index < 0 || index >= gallery.length || index === imageIndex) return;
    imageIndex = index;
    showImage();
    if (document.activeElement === previousButton && previousButton.hidden) nextButton.focus({preventScroll:true});
    if (document.activeElement === nextButton && nextButton.hidden) previousButton.focus({preventScroll:true});
    if (onChange) onChange(imageIndex);
  }

  function showImage() {
    const selected = gallery[imageIndex];
    const candidates = sources(selected.url);
    const currentRequest = ++request;
    loaded = false; failed = false;
    reset(); fittedWidth = 0; fittedHeight = 0;
    photo.hidden = true; photo.removeAttribute('src'); photo.alt = selected.alt || words().title;
    status.hidden = false;
    translate();
    function attempt(index) {
      if (currentRequest !== request || !dialog.open) return;
      if (index >= candidates.length) { failed = true; translate(); return; }
      const next = new Image();
      next.id = 'viewerImage'; next.className = 'viewer-image'; next.alt = selected.alt || words().title; next.draggable = false;
      next.onload = () => {
        if (currentRequest !== request || !dialog.open) return;
        photo.replaceWith(next); photo = next; loaded = true; status.hidden = true; fit();
      };
      next.onerror = () => attempt(index+1);
      next.src = candidates[index];
    }
    attempt(0);
  }

  function create() {
    if (dialog) return;
    dialog = document.createElement('dialog');
    dialog.id = 'imageViewer'; dialog.className = 'image-viewer';
    dialog.setAttribute('aria-labelledby','viewerTitle');
    dialog.setAttribute('aria-describedby','viewerHint');
    dialog.innerHTML = '<div class="viewer-header"><h2 id="viewerTitle"></h2><button id="viewerClose" type="button" autofocus></button></div><div class="viewer-toolbar"><button id="viewerPrev" class="viewer-navigation" type="button" hidden>‹</button><button id="viewerZoomOut" type="button">−</button><span id="viewerZoomLevel"></span><button id="viewerZoomIn" type="button">+</button><button id="viewerReset" type="button"></button><button id="viewerNext" class="viewer-navigation" type="button" hidden>›</button></div><p id="viewerHint" class="viewer-hint"></p><div id="viewerStage" class="viewer-stage" tabindex="0"><p id="viewerStatus" role="status"></p><img id="viewerImage" class="viewer-image" alt="" hidden></div>';
    document.body.append(dialog);
    const find = id => dialog.querySelector(`#${id}`);
    stage=find('viewerStage');photo=find('viewerImage');status=find('viewerStatus');title=find('viewerTitle');hint=find('viewerHint');
    closeButton=find('viewerClose');plusButton=find('viewerZoomIn');minusButton=find('viewerZoomOut');resetButton=find('viewerReset');zoomLevel=find('viewerZoomLevel');
    previousButton=find('viewerPrev');nextButton=find('viewerNext');
    closeButton.addEventListener('click',close);
    plusButton.addEventListener('click',() => zoomTo(scale*1.5));
    minusButton.addEventListener('click',() => zoomTo(scale/1.5));
    resetButton.addEventListener('click',reset);
    previousButton.addEventListener('click',() => navigate(imageIndex-1));
    nextButton.addEventListener('click',() => navigate(imageIndex+1));
    dialog.addEventListener('cancel',event => { event.preventDefault(); close(); });
    // Native close events are queued. An old event must not clear a reopened viewer.
    dialog.addEventListener('close',() => { if (!dialog.open) finishClose(); });
    stage.addEventListener('pointerdown',pointerDown);
    stage.addEventListener('pointermove',pointerMove);
    stage.addEventListener('pointerup',pointerEnd);
    stage.addEventListener('pointercancel',pointerEnd);
    stage.addEventListener('lostpointercapture',pointerEnd);
    stage.addEventListener('dblclick',event => { event.preventDefault(); reset(); });
    stage.addEventListener('keydown',event => {
      if (event.key === '+' || event.key === '=') { event.preventDefault(); zoomTo(scale*1.5); }
      if (event.key === '-') { event.preventDefault(); zoomTo(scale/1.5); }
      if (event.key === '0') { event.preventDefault(); reset(); }
      if (loaded && scale > 1 && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) {
        event.preventDefault();
        x += event.key === 'ArrowLeft' ? 40 : event.key === 'ArrowRight' ? -40 : 0;
        y += event.key === 'ArrowUp' ? 40 : event.key === 'ArrowDown' ? -40 : 0;
        paint();
      }
    });
    new ResizeObserver(fit).observe(stage);
  }

  function open(options = {}) {
    create();
    language = options.language === 'en' ? 'en' : 'fil';
    gallery = (Array.isArray(options.images) && options.images.length ? options.images : [{url:options.url,alt:options.alt}])
      .map(item => ({url:item && item.url,alt:item && item.alt}));
    imageIndex = clamp(Number.isInteger(options.index) ? options.index : 0,0,gallery.length-1);
    onChange = typeof options.onChange === 'function' ? options.onChange : null;
    onClose = typeof options.onClose === 'function' ? options.onClose : null;
    if (!dialog.open) {
      const focus = document.activeElement;
      const scrollers = [];
      for (let element=focus; element && element !== document.documentElement; element=element.parentElement) {
        if (element.scrollTop || element.scrollLeft) scrollers.push({element,top:element.scrollTop,left:element.scrollLeft});
      }
      // Touch browsers may leave focus outside the tapped button; retain the
      // underlying product dialog's scroll position independently of focus.
      document.querySelectorAll('dialog[open]').forEach(element => {
        if (!scrollers.some(saved => saved.element === element)) scrollers.push({element,top:element.scrollTop,left:element.scrollLeft});
      });
      const style = document.documentElement.style;
      const overflow = ['overflow','overflow-x','overflow-y'].map(property => [property,style.getPropertyValue(property),style.getPropertyPriority(property)]);
      restore = {focus,scrollers,top:window.scrollY,left:window.scrollX,overflow};
      document.documentElement.style.overflow = 'hidden';
      dialog.showModal();
      closeButton.focus({preventScroll:true});
    }
    showImage();
  }

  window.ImageViewer = Object.freeze({open,close,setLanguage(value) { language = value === 'en' ? 'en' : 'fil'; translate(); }});
})();
