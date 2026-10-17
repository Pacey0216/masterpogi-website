/* One storefront controller. No legacy monkey patches or sample-inventory fallback. */
(() => {
  'use strict';
  const C=window.STORE_CONFIG || {}, M=window.CatalogModel, $=id=>document.getElementById(id);
  const positions=['Harap','Sukat (mm)','Tagiliran','Ika-4 na larawan'];
  const state={products:[],selections:[],active:null,variant:null,editKey:null,photo:0,comparePhoto:0,lastLoaded:0,loading:false};
  const money=value=>new Intl.NumberFormat(C.locale||'en-PH',{style:'currency',currency:C.currency||'PHP',maximumFractionDigits:0}).format(value||0);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const unique=items=>[...new Set(items.filter(Boolean))];
  const sizeLabel=size=>size ? (/mm/i.test(size)?size:`${size} mm`) : 'Hindi nakatala';
  const variants=p=>M.availableVariants(p);
  const key=(p,v)=>M.selectionKey(p,v);
  const filters=()=>({query:$('catalogSearch').value,brand:$('brandFilter').value,grade:$('gradeFilter').value});
  const selection=()=>state.active&&state.variant?{product:state.active,variant:state.variant}:null;
  const photos=(p,v)=>M.photosForVariant(p,v);
  function imageURL(slot){return typeof slot==='string'?slot:slot?.url||''}
  function missing(position=0){return `<div class="photo-missing"><span class="photo-symbol" aria-hidden="true">▧</span><span>Walang larawan</span><span>${esc(positions[position])}</span></div>`}
  function photo(p,v,position=0,eager=false){
    const url=imageURL(photos(p,v)[position]);
    const source=window.PhotoFrame?.sources(url)[0]||url;
    return `<div class="photo-frame" data-position="${position}" data-variant="${esc(v?.sku||'')}">${url?`<img src="${esc(source)}" data-upload="${esc(url)}" alt="${esc(`${p.name} · ${v?.grade||''} · ${sizeLabel(v?.size)} · ${positions[position]}`)}" loading="${eager?'eager':'lazy'}" decoding="async" referrerpolicy="no-referrer">`:missing(position)}</div>`;
  }
  function enhanceImages(root){root.querySelectorAll('img').forEach(img=>{
    const sources=window.PhotoFrame?.sources(img.dataset.upload)||[img.src];let attempt=0;
    img.addEventListener('error',()=>{
      if(++attempt<sources.length){img.src=sources[attempt];return}
      const frame=img.closest('.photo-frame');if(frame)frame.innerHTML=missing(Number(frame.dataset.position||0));
    });
    window.PhotoFrame?.enhance(img);
  })}
  function representative(p){return variants(p).find(v=>!filters().grade||v.grade===filters().grade)||variants(p)[0]}
  function card(p,featured=false){
    const v=featured?variants(p)[0]:representative(p),prices=variants(p).filter(x=>featured||!filters().grade||x.grade===filters().grade).map(x=>x.price);
    const article=document.createElement('article');article.className='product-card';article.dataset.sku=p.sku;
    article.innerHTML=`<button type="button" class="card-open" aria-label="Tingnan ang ${esc(p.name)}">${photo(p,v,0,featured)}<span class="card-copy"><span class="product-name">${esc(p.name)}</span><span class="product-price">${new Set(prices).size>1?'<small>Mula </small>':''}${esc(money(prices.length?Math.min(...prices):p.price))}</span>${featured?`<span class="sale-label">${Number(p.sold)} naitalang benta</span>`:''}</span></button>`;
    article.querySelector('button').onclick=()=>openProduct(p,v);enhanceImages(article);return article;
  }
  function renderProducts(){
    const list=M.filterProducts(state.products,filters());
    $('productGrid').replaceChildren(...list.map(p=>card(p)));
    $('emptyState').hidden=list.length>0||!state.lastLoaded;
    $('resultCount').textContent=state.lastLoaded?`${list.length} relo${list.length!==state.products.length?` sa ${state.products.length}`:''}`:'';
  }
  function renderTop(){
    const list=M.bestSellers(state.products).slice(0,12);
    const scroll=$('topSellers').scrollLeft;
    $('topSellers').replaceChildren(...list.map(p=>card(p,true)));$('topSellers').scrollLeft=scroll;
    $('topStatus').textContent=list.length?'Batay sa naitalang benta.':'Wala pang naitalang benta para sa mga available na relo.';
    requestAnimationFrame(updateCarousel);
  }
  function updateCarousel(){const el=$('topSellers');$('topPrev').disabled=el.scrollLeft<2;$('topNext').disabled=el.scrollLeft+el.clientWidth>=el.scrollWidth-2}
  function moveCarousel(direction){const el=$('topSellers');el.scrollBy({left:direction*(el.clientWidth+parseFloat(getComputedStyle(el).gap||0)),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}
  function updateFilterOptions(){
    const current=filters();
    const brands=unique(state.products.map(p=>p.brand)).sort((a,b)=>a.localeCompare(b));
    const grades=unique(state.products.flatMap(p=>variants(p).map(v=>v.grade))).sort((a,b)=>a.localeCompare(b));
    for(const [id,list,all,previous] of [['brandFilter',brands,'Lahat ng brand',current.brand],['gradeFilter',grades,'Lahat ng grade',current.grade]]){
      $(id).replaceChildren(new Option(all,''),...list.map(v=>new Option(v,v)));$(id).value=list.includes(previous)?previous:'';
    }
  }
  async function loadProducts(){
    if(state.loading)return;state.loading=true;$('retry').disabled=true;
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),20000);
    try{
      const url=new URL(C.apiUrl);url.searchParams.set('store',C.storeFilter||'masterpogi');url.searchParams.set('_',Date.now());
      const response=await fetch(url,{cache:'no-store',signal:abort.signal});
      if(!response.ok)throw new Error('Inventory HTTP failure');
      const data=await response.json();if(data.success!==true||!Array.isArray(data.products))throw new Error('Invalid inventory response');
      state.products=M.normalizeInventory(data);state.lastLoaded=Date.now();
      updateFilterOptions();renderTop();renderProducts();reconcileSelections();
      $('inventoryStatus').textContent=`Na-update ${new Intl.DateTimeFormat('fil-PH',{hour:'numeric',minute:'2-digit',timeZone:'Asia/Manila'}).format(state.lastLoaded)} · Awtomatikong nagre-refresh`;
      $('retry').hidden=true;
      if($('productDialog').open)refreshOpenProduct();
    }catch{
      $('inventoryStatus').textContent=state.lastLoaded?'Hindi ma-refresh. Huling matagumpay na bilang ang ipinapakita.':'Hindi makuha ang mga relo. Subukan muli.';
      if(!state.lastLoaded){$('topStatus').textContent='Hindi pa makuha ang naitalang benta.';$('emptyState').hidden=true}
      $('retry').hidden=false;
    }finally{clearTimeout(timer);state.loading=false;$('retry').disabled=false;$('productGrid').setAttribute('aria-busy','false')}
  }
  function tabs(active,handler){
    const wrap=document.createElement('div');wrap.className='photo-tabs';wrap.setAttribute('role','group');wrap.setAttribute('aria-label','Posisyon ng larawan');
    positions.forEach((label,i)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-pressed',String(i===active));b.onclick=()=>handler(i);wrap.append(b)});return wrap;
  }
  function renderGallery(){
    const wrap=$('gallery');if(!wrap)return;
    wrap.innerHTML=photo(state.active,state.variant,state.photo,true);
    wrap.append(tabs(state.photo,i=>{state.photo=i;renderGallery()}));
    const caption=document.createElement('p');caption.className='photo-caption';caption.textContent=`${positions[state.photo]} · ${state.variant?.grade||'Walang grade'} · ${sizeLabel(state.variant?.size)}`;wrap.append(caption);enhanceImages(wrap);
  }
  function openProduct(p,v=variants(p)[0],editKey=null){
    state.active=p;state.variant=v;state.editKey=editKey;state.photo=0;renderProductDetail();
    if(!$('productDialog').open)$('productDialog').showModal();
  }
  function specRows(p,v){return [['Brand',p.brand],['Grade',v?.grade||'Hindi nakatala'],['Sukat',sizeLabel(v?.size)],['SKU',v?.sku||p.sku]]}
  function dl(rows){return `<dl class="specs">${rows.filter(([,v])=>v).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`}
  function renderProductDetail(){
    const p=state.active,v=state.variant,vs=variants(p);
    const grades=unique(vs.map(x=>x.grade));
    const sizes=unique(vs.filter(x=>x.grade===v?.grade).map(x=>x.size));
    const specAllow=['Reference','Movement','Case Material','Dial','Strap','Water Resistance','Case','Material','Color','Gender'];
    const specs=Object.entries(p.specs||{}).filter(([k])=>specAllow.includes(k));
    $('productBody').innerHTML=`<div class="product-detail"><div id="gallery" class="gallery"></div><div class="detail-info"><p class="detail-brand">${esc(p.brand)}</p><h2 id="productTitle">${esc(p.name)}</h2><p class="detail-price">${esc(money(v?.price??p.price))}</p><p id="stockStatus" class="stock-status">${v?`${v.stock} available`:'Wala nang available'}</p><div class="variant-fields"><label><span>Grade</span><select id="detailGrade" ${grades.length?'':'disabled'}>${grades.length?grades.map(g=>`<option ${g===v?.grade?'selected':''} value="${esc(g)}">${esc(g)}</option>`).join(''):'<option>Hindi nakatala</option>'}</select></label><label><span>Sukat</span><select id="detailSize" ${sizes.length?'':'disabled'}>${sizes.length?sizes.map(s=>`<option ${s===v?.size?'selected':''} value="${esc(s)}">${esc(sizeLabel(s))}</option>`).join(''):'<option>Hindi nakatala</option>'}</select></label></div><div class="detail-actions"><button id="addComparison" type="button" ${v?'':'disabled'}>${state.editKey?'I-save ang pinili':'Idagdag sa pagkumpara'}</button>${v?`<a id="inquiryLink" class="primary" href="${esc(messengerURL(p,v))}" target="_blank" rel="noopener noreferrer">Magtanong sa Messenger ↗</a><button id="copyInquiry" type="button">Kopyahin ang detalye</button>`:''}</div><p id="detailMessage" class="detail-message" role="status"></p><p class="inquiry-note">Kung hindi lumabas ang detalye sa Messenger, kopyahin at i-paste ang mensahe.</p>${p.description?`<p class="description">${esc(p.description)}</p>`:''}${dl([...specRows(p,v),...specs])}</div></div>`;
    renderGallery();
    $('detailGrade').onchange=e=>{state.variant=vs.find(x=>x.grade===e.target.value&&x.size===state.variant?.size)||vs.find(x=>x.grade===e.target.value);state.photo=0;renderProductDetail();$('detailGrade').focus()};
    $('detailSize').onchange=e=>{state.variant=vs.find(x=>x.grade===state.variant?.grade&&x.size===e.target.value);state.photo=0;renderProductDetail();$('detailSize').focus()};
    $('addComparison').onclick=addComparison;
    if($('copyInquiry'))$('copyInquiry').onclick=async()=>{
      try{await navigator.clipboard.writeText(inquiryText(p,v));$('detailMessage').textContent='Nakopya. I-paste sa Messenger.'}
      catch{$('detailMessage').textContent=inquiryText(p,v)}
    };
  }
  function inquiryText(p,v){return `Kumusta! Nagtatanong ako tungkol sa relo:\n${p.name}\nBrand: ${p.brand}\nGrade: ${v.grade||'Hindi nakatala'}\nSukat: ${sizeLabel(v.size)}\nPresyo: ${money(v.price)}\nSKU: ${v.sku||p.sku}`}
  function messengerURL(p,v){
    try{const url=new URL(C.messengerUrl);if(url.protocol!=='https:'||!['m.me','www.messenger.com','messenger.com'].includes(url.hostname))return '#';if(p&&v)url.searchParams.set('text',inquiryText(p,v));return url.href}catch{return '#'}
  }
  function eligible(a,b){const result=M.comparisonEligibility(a,b);return typeof result==='boolean'?result:result.allowed??result.valid??result.eligible??false}
  function addComparison(){
    const candidate=selection();if(!candidate)return;
    const candidateKey=key(candidate.product,candidate.variant);
    const editIndex=state.selections.findIndex(s=>key(s.product,s.variant)===state.editKey);
    const others=state.selections.filter((s,i)=>i!==editIndex);
    let error='';
    if(others.some(s=>key(s.product,s.variant)===candidateKey))error='Napili na ang grade at sukat na ito.';
    else if(editIndex<0&&state.selections.length>=2)error='Dalawa na ang napili. Alisin muna ang isa bago magdagdag.';
    else if(others.length&&!eligible(others[0],candidate))error='Pumili ng magkaibang brand o grade. Hindi sapat ang magkaibang sukat lang.';
    if(error){$('detailMessage').textContent=error;return}
    if(editIndex>=0)state.selections[editIndex]=candidate;else state.selections.push(candidate);
    state.editKey=null;renderTray();$('productDialog').close();
    $('trayMessage').textContent=state.selections.length===2?'Handa nang ikumpara.':'Pumili pa ng isang relo na iba ang brand o grade.';
  }
  function renderTray(){
    $('selectionCount').textContent=`${state.selections.length} / 2`;
    $('compareTray').classList.toggle('has-selection',state.selections.length>0);$('compareHelp').hidden=state.selections.length>0;
    $('compareSelections').replaceChildren(...state.selections.map(s=>{
      const item=document.createElement('div');item.className='tray-item';
      item.innerHTML=`<button class="tray-edit" type="button" aria-label="Palitan ang ${esc(s.product.name)}">${photo(s.product,s.variant)}<span class="tray-copy"><strong>${esc(s.product.name)}</strong><span>${esc(s.variant.grade||'Walang grade')} · ${esc(sizeLabel(s.variant.size))}</span><span>${esc(money(s.variant.price))}</span></span></button><button class="tray-remove" type="button" aria-label="Alisin ang ${esc(s.product.name)} ${esc(s.variant.grade)}">×</button>`;
      item.querySelector('.tray-edit').onclick=()=>openProduct(s.product,s.variant,key(s.product,s.variant));
      item.querySelector('.tray-remove').onclick=()=>{state.selections=state.selections.filter(x=>x!==s);$('trayMessage').textContent='Inalis ang relo.';renderTray()};
      enhanceImages(item);return item;
    }));
    $('compareButton').disabled=state.selections.length!==2||!eligible(...state.selections);
  }
  function reconcileSelections(){
    const before=state.selections.length;
    state.selections=state.selections.map(s=>{
      const p=state.products.find(p=>p.sku===s.product.sku);if(!p)return null;
      const v=variants(p).find(v=>key(p,v)===key(s.product,s.variant));return v?{product:p,variant:v}:null;
    }).filter(Boolean);renderTray();
    if(before!==state.selections.length)$('trayMessage').textContent='Inalis ang relong hindi na available.';
    if($('comparisonDialog').open){if(state.selections.length!==2||!eligible(...state.selections))$('comparisonDialog').close();else renderComparison()}
  }
  function refreshOpenProduct(){
    const p=state.products.find(p=>p.sku===state.active?.sku);
    if(!p){
      state.active=null;state.variant=null;state.editKey=null;state.photo=0;
      $('productBody').innerHTML='<div class="empty-state"><h2 id="productTitle">Hindi na available</h2><p id="stockStatus">Hindi na available ang relong ito. Isara at pumili ng iba.</p></div>';
      return;
    }
    const v=variants(p).find(v=>key(p,v)===key(state.active,state.variant));
    if(!v){state.active=p;state.variant=variants(p)[0];state.editKey=null;state.photo=0;renderProductDetail();$('detailMessage').textContent='Hindi na available ang dating pinili. Ipinapakita ang available na grade at sukat; suriin bago magpatuloy.';return}
    state.active=p;state.variant=v;renderProductDetail();
  }
  function renderComparison(){
    const root=$('comparisonBody');root.innerHTML='<div class="comparison-content"><div id="comparisonTabs"></div><div class="comparison-grid"></div></div>';
    $('comparisonTabs').replaceChildren(tabs(state.comparePhoto,i=>{state.comparePhoto=i;renderComparison()}));
    const grid=root.querySelector('.comparison-grid');
    state.selections.forEach(s=>{
      const col=document.createElement('article');col.className='comparison-column';
      col.innerHTML=`${photo(s.product,s.variant,state.comparePhoto,true)}<h3>${esc(s.product.name)}</h3>${dl([...specRows(s.product,s.variant).slice(0,3),['Presyo',money(s.variant.price)]])}<a class="primary" target="_blank" rel="noopener noreferrer" href="${esc(messengerURL(s.product,s.variant))}">Magtanong ↗</a>`;grid.append(col);
    });enhanceImages(root);
  }
  $('filters').onsubmit=e=>e.preventDefault();
  $('catalogSearch').oninput=renderProducts;$('brandFilter').onchange=renderProducts;$('gradeFilter').onchange=()=>{renderProducts();renderTop()};
  $('clearFilters').onclick=()=>{$('filters').reset();renderProducts();renderTop()};
  $('topPrev').onclick=()=>moveCarousel(-1);$('topNext').onclick=()=>moveCarousel(1);
  $('topSellers').addEventListener('scroll',updateCarousel,{passive:true});window.addEventListener('resize',updateCarousel);
  $('topSellers').addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();moveCarousel(e.key==='ArrowRight'?1:-1)}});
  $('retry').onclick=loadProducts;$('contactLink').href=messengerURL();
  $('compareButton').onclick=()=>{if(state.selections.length!==2||!eligible(...state.selections))return;state.comparePhoto=0;renderComparison();$('comparisonDialog').showModal()};
  document.querySelectorAll('dialog').forEach(dialog=>{dialog.querySelector('.close-dialog').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog){const rect=dialog.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)dialog.close()}})});
  setInterval(()=>{if(!document.hidden)loadProducts()},Math.max(30000,Number(C.refreshIntervalMs)||60000));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-state.lastLoaded>15000)loadProducts()});
  loadProducts();
})();
