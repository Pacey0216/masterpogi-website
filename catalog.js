/* Shared-inventory catalog: one controller, complete bilingual UI, no sample fallback. */
(() => {
  'use strict';
  const C=window.STORE_CONFIG||{}, M=window.CatalogModel, $=id=>document.getElementById(id);
  const languageKey='masterpogi:language';
  let savedLanguage='fil';try{if(localStorage.getItem(languageKey)==='en')savedLanguage='en'}catch{}
  const state={language:savedLanguage,products:[],selections:[],active:null,variant:null,editKey:null,photo:0,comparePhoto:0,lastLoaded:0,loading:false,loadError:false,detailMessage:'',trayMessage:'',failedPhotos:new Set()};
  const COPY={
    fil:{
      title:'Mga Relo · Master Pogi',meta:'Mga graded na replica na relo ng Master Pogi. Pumili, ikumpara, at magtanong sa Messenger.',
      featuredTitle:'Tampok na Relo',featuredHint:'Mga tampok na relo, nakaayos ayon sa naitalang benta.',featuredEmpty:'Walang available na tampok na relo ngayon.',featuredLoading:'Kinukuha ang mga tampok na relo…',featuredFailed:'Hindi pa makuha ang mga tampok na relo.',
      availableTitle:'Mga Available na Relo',compareTitle:'Ikumpara ang Relo',comparisonTitle:'Ikumpara ang Relo',compareHelp:'Buksan ang relo at piliin ang grade at sukat. Hanggang dalawa.',compare:'Ikumpara',retry:'Subukan muli',clearFilters:'I-clear',emptyState:'Walang tugma. Subukan ang ibang filter o pangalan.',
      search:'Hanapin ang relo',searchPlaceholder:'Hanapin ang relo…',brand:'Brand',grade:'Grade',size:'Sukat',price:'Presyo',allBrands:'Lahat ng brand',allGrades:'Lahat ng grade',from:'Mula ',
      loading:'Kinukuha ang mga relo…',loadFailed:'Hindi makuha ang mga relo. Subukan muli.',stale:'Hindi ma-refresh. Huling matagumpay na bilang ang ipinapakita.',updated:time=>`Na-update ${time} · Awtomatikong nagre-refresh`,count:(n,total)=>`${n} relo${n!==total?` sa ${total}`:''}`,sales:n=>`${n} naitalang benta`,stock:n=>`May ${n} piraso`,
      view:name=>`Tingnan ang ${name}`,positions:['Harap','Sukat (mm)','Tagiliran','Ika-4 na larawan'],photoGroup:'Mga larawan ng napiling relo',comparisonPhotos:'Sabay na posisyon ng mga larawan',noPhoto:'Walang larawan',notListed:'Hindi nakatala',
      productDialogLabel:'Detalye ng relo',closeDetails:'Isara ang detalye',closeComparison:'Isara ang paghahambing',previous:'Naunang mga relo',next:'Susunod na mga relo',featuredAria:'Mga tampok na relo',language:'Wika',
      messenger:'Messenger ↗',contactLink:'Messenger ↗',saveCompare:'I-save sa pagkumpara',editSelection:name=>`Palitan ang ${name}`,removeSelection:name=>`Alisin ang ${name}`,
      duplicate:'Napili na ang grade at sukat na ito.',limit:'Dalawa na ang napili. Alisin muna ang isa bago magdagdag.',sameGrade:'Pumili ng magkaibang brand o grade. Hindi sapat ang magkaibang sukat lang.',ready:'Handa nang ikumpara.',pickAnother:'Pumili pa ng isang relo na iba ang brand o grade.',removed:'Inalis ang relo.',removedUnavailable:'Inalis ang relong hindi na available.',
      unavailableTitle:'Hindi na available',unavailableBody:'Hindi na available ang relong ito. Isara at pumili ng iba.',variantChanged:'Hindi na available ang dating pinili. Ipinapakita ang available na grade at sukat; suriin bago magpatuloy.',
      productType:'Uri',replica:'Replica — hindi authentic',productDisclosure:'Replica ang lahat ng relong ibinebenta rito; hindi authentic na produkto ng mga tatak na binanggit. Ang Japan, Swiss, at Super C (1:1) ay mga kategorya ng grade ng nagbebenta, hindi sertipikasyon ng tatak o patunay ng bansang pinagmulan.',
      footerDisclaimer:'Ang mga pangalan, trademark, at logo ng ibang tatak ay pag-aari ng kani-kanilang may-ari. Independent na nagbebenta ang Master Pogi at walang kaugnayan, sponsorship, o endorsement mula sa mga tatak na ito. Ginagamit ang mga pangalan upang makatulong sa pagkilala at pagkumpara ng mga listing.',
      inquiry:'Kumusta! Nagtatanong ako tungkol sa replica na relo:',
      specs:{Reference:'Reference',Movement:'Mekanismo','Case Material':'Materyal ng kaha',Dial:'Dial',Strap:'Strap','Water Resistance':'Water resistance',Case:'Kaha',Material:'Materyal',Color:'Kulay',Gender:'Para kanino'}
    },
    en:{
      title:'Watches · Master Pogi',meta:'Master Pogi graded replica watches. Choose, compare, and ask on Messenger.',
      featuredTitle:'Featured Watches',featuredHint:'Featured watches, ordered by recorded sales.',featuredEmpty:'No featured watches are available right now.',featuredLoading:'Loading featured watches…',featuredFailed:'Featured watches could not be loaded.',
      availableTitle:'Available Watches',compareTitle:'Compare Watches',comparisonTitle:'Compare Watches',compareHelp:'Open a watch and choose its grade and size. Select up to two.',compare:'Compare',retry:'Try again',clearFilters:'Clear',emptyState:'No matches. Try a different filter or name.',
      search:'Find a watch',searchPlaceholder:'Find a watch…',brand:'Brand',grade:'Grade',size:'Size',price:'Price',allBrands:'All brands',allGrades:'All grades',from:'From ',
      loading:'Loading watches…',loadFailed:'Watches could not be loaded. Please try again.',stale:'Could not refresh. Showing the last successful stock update.',updated:time=>`Updated ${time} · Refreshes automatically`,count:(n,total)=>`${n} watch${n===1?'':'es'}${n!==total?` of ${total}`:''}`,sales:n=>`${n} recorded sale${n===1?'':'s'}`,stock:n=>`${n} available`,
      view:name=>`View ${name}`,positions:['Front','Size (mm)','Side','Fourth photo'],photoGroup:'Selected watch photos',comparisonPhotos:'Matching photo positions',noPhoto:'No photo available',notListed:'Not listed',
      productDialogLabel:'Watch details',closeDetails:'Close details',closeComparison:'Close comparison',previous:'Previous watches',next:'Next watches',featuredAria:'Featured watches',language:'Language',
      messenger:'Messenger ↗',contactLink:'Messenger ↗',saveCompare:'Save to comparison',editSelection:name=>`Change ${name}`,removeSelection:name=>`Remove ${name}`,
      duplicate:'This grade and size are already selected.',limit:'Two watches are already selected. Remove one before adding another.',sameGrade:'Choose a different brand or grade. A different size alone is not enough.',ready:'Ready to compare.',pickAnother:'Choose one more watch with a different brand or grade.',removed:'Watch removed.',removedUnavailable:'A watch that is no longer available was removed.',
      unavailableTitle:'No longer available',unavailableBody:'This watch is no longer available. Close this window and choose another.',variantChanged:'Your previous choice is no longer available. An available grade and size are shown; check them before continuing.',
      productType:'Type',replica:'Replica — not authentic',productDisclosure:'All watches sold here are replicas, not authentic products of the named brands. Japan, Swiss, and Super C (1:1) are seller grade categories, not brand certifications or proof of country of origin.',
      footerDisclaimer:'Third-party names, trademarks, and logos belong to their respective owners. Master Pogi is an independent seller and is not affiliated with, sponsored by, or endorsed by those brands. Product references are provided to help buyers identify and compare listings.',
      inquiry:'Hello! I would like to ask about this replica watch:',
      specs:{Reference:'Reference',Movement:'Movement','Case Material':'Case material',Dial:'Dial',Strap:'Strap','Water Resistance':'Water resistance',Case:'Case',Material:'Material',Color:'Color',Gender:'For'}
    }
  };
  const t=(key,...args)=>{const value=COPY[state.language][key];return typeof value==='function'?value(...args):value};
  const positions=()=>t('positions');
  const money=value=>new Intl.NumberFormat(C.locale||'en-PH',{style:'currency',currency:C.currency||'PHP',maximumFractionDigits:0}).format(value||0);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const unique=items=>[...new Set(items.filter(Boolean))];
  const sizeLabel=size=>size?(/mm/i.test(size)?size:`${size} mm`):t('notListed');
  const gradeLabel=grade=>grade==='Super C'?'Super C (1:1)':grade||t('notListed');
  const variants=p=>M.availableVariants(p);
  const key=(p,v)=>M.selectionKey(p,v);
  const filters=()=>({query:$('catalogSearch').value,brand:$('brandFilter').value,grade:$('gradeFilter').value});
  const selection=()=>state.active&&state.variant?{product:state.active,variant:state.variant}:null;
  const photos=(p,v)=>M.photosForVariant(p,v);
  function imageURL(slot){const url=typeof slot==='string'?slot:slot?.url||'';return state.failedPhotos.has(url)?'':url}
  function availablePositions(p,v){return photos(p,v).flatMap((slot,index)=>imageURL(slot)?[index]:[])}
  function initialPhoto(p,v){return availablePositions(p,v)[0]??0}
  function missing(position=0){return `<div class="photo-missing"><span class="photo-symbol" aria-hidden="true">▧</span><span>${esc(t('noPhoto'))}</span><span>${esc(positions()[position])}</span></div>`}
  function photo(p,v,position=0,eager=false){
    const url=imageURL(photos(p,v)[position]);
    const source=window.PhotoFrame?.sources(url)[0]||url;
    return `<div class="photo-frame" data-position="${position}" data-variant="${esc(v?.sku||'')}">${url?`<img src="${esc(source)}" data-upload="${esc(url)}" alt="${esc(`${p.name} · ${gradeLabel(v?.grade)} · ${sizeLabel(v?.size)} · ${positions()[position]}`)}" loading="${eager?'eager':'lazy'}" decoding="async" referrerpolicy="no-referrer">`:missing(position)}</div>`;
  }
  function enhanceImages(root){root.querySelectorAll('img[data-upload]').forEach(img=>{
    const sources=window.PhotoFrame?.sources(img.dataset.upload)||[img.src];let attempt=0;
    img.addEventListener('error',()=>{
      if(!img.isConnected)return;
      if(++attempt<sources.length){img.src=sources[attempt];return}
      state.failedPhotos.add(img.dataset.upload);
      const frame=img.closest('.photo-frame');if(frame)frame.innerHTML=missing(Number(frame.dataset.position||0));
      // Failed images are not offered as empty thumbnail choices.
      if($('productDialog').open&&state.active)renderGallery();
      if($('comparisonDialog').open)renderComparison();
    });
    window.PhotoFrame?.enhance(img);
  })}
  function representative(p){return variants(p).find(v=>!filters().grade||v.grade===filters().grade)||variants(p)[0]}
  function card(p,featured=false,eager=false){
    const v=featured?variants(p)[0]:representative(p),prices=variants(p).filter(x=>featured||!filters().grade||x.grade===filters().grade).map(x=>x.price);
    const article=document.createElement('article');article.className='product-card';article.dataset.sku=p.sku;
    article.innerHTML=`<button type="button" class="card-open" aria-label="${esc(t('view',p.name))}">${photo(p,v,0,eager)}<span class="card-copy"><span class="product-name">${esc(p.name)}</span><span class="product-price">${new Set(prices).size>1?`<small>${esc(t('from'))}</small>`:''}${esc(money(prices.length?Math.min(...prices):p.price))}</span>${featured&&p.sold>0?`<span class="sale-label">${esc(t('sales',Number(p.sold)))}</span>`:''}</span></button>`;
    article.querySelector('button').onclick=()=>openProduct(p,v);enhanceImages(article);return article;
  }
  function renderProducts(){
    const list=M.filterProducts(state.products,filters());$('productGrid').replaceChildren(...list.map(p=>card(p)));
    $('emptyState').hidden=list.length>0||!state.lastLoaded;
    $('resultCount').textContent=state.lastLoaded?t('count',list.length,state.products.length):'';
  }
  function renderTop(){
    const list=M.featuredProducts(state.products),scroll=$('topSellers').scrollLeft;
    $('topTitle').textContent=t('featuredTitle');
    $('topSellers').replaceChildren(...list.map((p,i)=>card(p,true,i<4)));$('topSellers').scrollLeft=scroll;
    $('topStatus').textContent=!state.lastLoaded?t(state.loadError?'featuredFailed':'featuredLoading'):t(list.length?'featuredHint':'featuredEmpty');
    requestAnimationFrame(updateCarousel);
  }
  function updateCarousel(){const el=$('topSellers');$('topPrev').disabled=el.scrollLeft<2;$('topNext').disabled=el.scrollLeft+el.clientWidth>=el.scrollWidth-2}
  function moveCarousel(direction){const el=$('topSellers');el.scrollBy({left:direction*(el.clientWidth+parseFloat(getComputedStyle(el).gap||0)),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}
  function updateFilterOptions(){
    const current=filters(),brands=unique(state.products.map(p=>p.brand)).sort((a,b)=>a.localeCompare(b)),grades=unique(state.products.flatMap(p=>variants(p).map(v=>v.grade))).sort((a,b)=>a.localeCompare(b));
    for(const [id,list,all,previous] of [['brandFilter',brands,t('allBrands'),current.brand],['gradeFilter',grades,t('allGrades'),current.grade]]){
      $(id).replaceChildren(new Option(all,''),...list.map(v=>new Option(id==='gradeFilter'?gradeLabel(v):v,v)));$(id).value=list.includes(previous)?previous:'';
    }
  }
  function renderInventoryStatus(){
    const time=state.lastLoaded?new Intl.DateTimeFormat(state.language==='en'?'en-PH':'fil-PH',{hour:'numeric',minute:'2-digit',timeZone:'Asia/Manila'}).format(state.lastLoaded):'';
    $('inventoryStatus').textContent=state.loadError?t(state.lastLoaded?'stale':'loadFailed'):state.lastLoaded?t('updated',time):t('loading');
    $('retry').hidden=!state.loadError;
  }
  function renderMessages(){if($('detailMessage'))$('detailMessage').textContent=state.detailMessage?t(state.detailMessage):'';$('trayMessage').textContent=state.trayMessage?t(state.trayMessage):''}
  function setDetailMessage(code){state.detailMessage=code;renderMessages()}
  function setTrayMessage(code){state.trayMessage=code;renderMessages()}
  function applyLanguage(){
    document.documentElement.lang=state.language;document.title=t('title');document.querySelector('meta[name="description"]').content=t('meta');
    document.querySelectorAll('[data-i18n]').forEach(el=>{const value=t(el.dataset.i18n);if(typeof value==='string')el.textContent=value});
    const labels={availableTitle:'availableTitle',compareTitle:'compareTitle',comparisonTitle:'comparisonTitle',compareHelp:'compareHelp',compareButton:'compare',retry:'retry',clearFilters:'clearFilters',emptyState:'emptyState',contactLink:'contactLink',headerMessenger:'messenger',footerDisclaimer:'footerDisclaimer',productDisclosure:'productDisclosure',productDialogLabel:'productDialogLabel',searchLabel:'search'};
    Object.entries(labels).forEach(([id,label])=>{if($(id))$(id).textContent=t(label)});
    $('catalogSearch').placeholder=t('searchPlaceholder');$('catalogSearch').setAttribute('aria-label',t('search'));
    $('brandFilter').setAttribute('aria-label',t('brand'));$('gradeFilter').setAttribute('aria-label',t('grade'));
    $('topPrev').setAttribute('aria-label',t('previous'));$('topNext').setAttribute('aria-label',t('next'));$('topSellers').setAttribute('aria-label',t('featuredAria'));
    document.querySelectorAll('.language-switch,.dialog-language').forEach(el=>el.setAttribute('aria-label',t('language')));
    document.querySelectorAll('[data-language]').forEach(el=>{const active=el.dataset.language===state.language;el.setAttribute('aria-pressed',String(active));el.classList.toggle('active',active)});
    $('productDialog').querySelector('.close-dialog').setAttribute('aria-label',t('closeDetails'));$('comparisonDialog').querySelector('.close-dialog').setAttribute('aria-label',t('closeComparison'));
    updateFilterOptions();renderInventoryStatus();renderTop();renderProducts();renderTray();
    if($('productDialog').open){if(state.active)renderProductDetail();else renderUnavailable()}
    if($('comparisonDialog').open)renderComparison();renderMessages();
  }
  function setLanguage(language){if(!['fil','en'].includes(language))return;state.language=language;try{localStorage.setItem(languageKey,language)}catch{}applyLanguage()}
  async function loadProducts(){
    if(state.loading)return;state.loading=true;$('retry').disabled=true;
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),20000);
    try{
      const url=new URL(C.apiUrl);url.searchParams.set('store',C.storeFilter||'masterpogi');url.searchParams.set('_',Date.now());
      const response=await fetch(url,{cache:'no-store',signal:abort.signal});if(!response.ok)throw new Error('Inventory HTTP failure');
      const data=await response.json();if(data.success!==true||!Array.isArray(data.products))throw new Error('Invalid inventory response');
      state.products=M.normalizeInventory(data);state.lastLoaded=Date.now();state.loadError=false;state.failedPhotos.clear();
      updateFilterOptions();renderTop();renderProducts();reconcileSelections();
      if($('productDialog').open)refreshOpenProduct();
    }catch{state.loadError=true;if(!state.lastLoaded){renderTop();$('emptyState').hidden=true}}
    finally{clearTimeout(timer);state.loading=false;$('retry').disabled=false;$('productGrid').setAttribute('aria-busy','false');renderInventoryStatus()}
  }
  function tabs(indices,active,handler){
    const wrap=document.createElement('div');wrap.className='photo-tabs';wrap.setAttribute('role','group');wrap.setAttribute('aria-label',t('comparisonPhotos'));
    indices.forEach(i=>{const b=document.createElement('button');b.type='button';b.dataset.position=i;b.textContent=positions()[i];b.setAttribute('aria-pressed',String(i===active));b.onclick=()=>handler(i);wrap.append(b)});return wrap;
  }
  function renderGallery(){
    const wrap=$('gallery');if(!wrap||!state.active)return;
    const valid=availablePositions(state.active,state.variant);
    if(!valid.includes(state.photo))state.photo=valid[0]??0;
    wrap.innerHTML=photo(state.active,state.variant,state.photo,true);
    if(valid.length>1){
      const thumbs=document.createElement('div');thumbs.className='photo-thumbnails';thumbs.setAttribute('role','group');thumbs.setAttribute('aria-label',t('photoGroup'));
      valid.forEach(position=>{
        const button=document.createElement('button');button.type='button';button.dataset.position=position;button.setAttribute('aria-pressed',String(position===state.photo));button.setAttribute('aria-label',positions()[position]);
        button.innerHTML=photo(state.active,state.variant,position,true);button.querySelector('img').alt='';
        button.onclick=()=>{state.photo=position;renderGallery();$('gallery').querySelector(`[data-position="${position}"][aria-pressed]`)?.focus()};thumbs.append(button);
      });wrap.append(thumbs);
    }
    enhanceImages(wrap);
  }
  function openProduct(p,v=variants(p)[0],editKey=null){state.active=p;state.variant=v;state.editKey=editKey;state.photo=initialPhoto(p,v);state.detailMessage='';renderProductDetail();if(!$('productDialog').open)$('productDialog').showModal()}
  function specRows(p,v){return [[t('productType'),t('replica')],[t('grade'),gradeLabel(v?.grade)],[t('size'),sizeLabel(v?.size)],['SKU',v?.sku||p.sku]]}
  function dl(rows){return `<dl class="specs">${rows.filter(([,v])=>v).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`}
  function renderProductDetail(){
    const p=state.active,v=state.variant,vs=variants(p),grades=unique(vs.map(x=>x.grade)),sizes=unique(vs.filter(x=>x.grade===v?.grade).map(x=>x.size));
    const specs=Object.entries(p.specs||{}).filter(([k])=>Object.hasOwn(t('specs'),k)).map(([k,value])=>[t('specs')[k],value]);
    $('productBody').innerHTML=`<div class="product-detail"><div id="gallery" class="gallery"></div><div class="detail-info"><h2 id="productTitle">${esc(p.name)}</h2><p class="detail-price">${esc(money(v?.price??p.price))}</p><p id="stockStatus" class="stock-status">${esc(v?t('stock',v.stock):t('unavailableTitle'))}</p><div class="variant-fields"><label><span>${esc(t('grade'))}</span><select id="detailGrade" ${grades.length?'':'disabled'}>${grades.length?grades.map(g=>`<option ${g===v?.grade?'selected':''} value="${esc(g)}">${esc(gradeLabel(g))}</option>`).join(''):`<option>${esc(t('notListed'))}</option>`}</select></label><label><span>${esc(t('size'))}</span><select id="detailSize" ${sizes.length?'':'disabled'}>${sizes.length?sizes.map(s=>`<option ${s===v?.size?'selected':''} value="${esc(s)}">${esc(sizeLabel(s))}</option>`).join(''):`<option>${esc(t('notListed'))}</option>`}</select></label></div><div class="detail-actions"><button id="addComparison" type="button" ${v?'':'disabled'}>${esc(t(state.editKey?'saveCompare':'compare'))}</button>${v?`<a id="inquiryLink" class="primary" href="${esc(messengerURL(p,v))}" target="_blank" rel="noopener noreferrer">${esc(t('messenger'))}</a>`:''}</div><p id="detailMessage" class="detail-message" role="status"></p>${dl([...specRows(p,v),...specs])}</div></div>`;
    renderGallery();renderMessages();
    $('detailGrade').onchange=e=>{state.variant=vs.find(x=>x.grade===e.target.value&&x.size===state.variant?.size)||vs.find(x=>x.grade===e.target.value);state.photo=initialPhoto(p,state.variant);state.detailMessage='';renderProductDetail();$('detailGrade').focus()};
    $('detailSize').onchange=e=>{state.variant=vs.find(x=>x.grade===state.variant?.grade&&x.size===e.target.value);state.photo=initialPhoto(p,state.variant);state.detailMessage='';renderProductDetail();$('detailSize').focus()};
    $('addComparison').onclick=addComparison;
  }
  function inquiryText(p,v){return `${t('inquiry')}\n${p.name}\n${t('productType')}: ${t('replica')}\n${t('grade')}: ${gradeLabel(v.grade)}\n${t('size')}: ${sizeLabel(v.size)}\n${t('price')}: ${money(v.price)}\nSKU: ${v.sku||p.sku}`}
  function messengerURL(p,v){try{const url=new URL(C.messengerUrl);if(url.protocol!=='https:'||!['m.me','www.messenger.com','messenger.com'].includes(url.hostname))return '#';if(p&&v)url.searchParams.set('text',inquiryText(p,v));return url.href}catch{return '#'}}
  function eligible(a,b){return M.comparisonEligibility(a,b).allowed}
  function addComparison(){
    const candidate=selection();if(!candidate)return;
    const candidateKey=key(candidate.product,candidate.variant),editIndex=state.selections.findIndex(s=>key(s.product,s.variant)===state.editKey),others=state.selections.filter((s,i)=>i!==editIndex);
    let error='';
    if(others.some(s=>key(s.product,s.variant)===candidateKey))error='duplicate';
    else if(editIndex<0&&state.selections.length>=2)error='limit';
    else if(others.length&&!eligible(others[0],candidate))error='sameGrade';
    if(error){setDetailMessage(error);return}
    if(editIndex>=0)state.selections[editIndex]=candidate;else state.selections.push(candidate);
    state.editKey=null;renderTray();$('productDialog').close();setTrayMessage(state.selections.length===2?'ready':'pickAnother');
  }
  function renderTray(){
    $('selectionCount').textContent=`${state.selections.length} / 2`;$('compareTray').classList.toggle('has-selection',state.selections.length>0);$('compareHelp').hidden=state.selections.length>0;
    $('compareSelections').replaceChildren(...state.selections.map(s=>{
      const item=document.createElement('div');item.className='tray-item';
      item.innerHTML=`<button class="tray-edit" type="button" aria-label="${esc(t('editSelection',s.product.name))}">${photo(s.product,s.variant)}<span class="tray-copy"><strong>${esc(s.product.name)}</strong><span>${esc(gradeLabel(s.variant.grade))} · ${esc(sizeLabel(s.variant.size))}</span><span>${esc(money(s.variant.price))}</span></span></button><button class="tray-remove" type="button" aria-label="${esc(t('removeSelection',`${s.product.name} ${gradeLabel(s.variant.grade)}`))}">×</button>`;
      item.querySelector('.tray-edit').onclick=()=>openProduct(s.product,s.variant,key(s.product,s.variant));
      item.querySelector('.tray-remove').onclick=()=>{state.selections=state.selections.filter(x=>x!==s);setTrayMessage('removed');renderTray()};enhanceImages(item);return item;
    }));$('compareButton').disabled=state.selections.length!==2||!eligible(...state.selections);renderMessages();
  }
  function reconcileSelections(){
    const before=state.selections.length;
    state.selections=state.selections.map(s=>{const p=state.products.find(p=>p.sku===s.product.sku);if(!p)return null;const v=variants(p).find(v=>key(p,v)===key(s.product,s.variant));return v?{product:p,variant:v}:null}).filter(Boolean);
    if(before!==state.selections.length)state.trayMessage='removedUnavailable';renderTray();
    if($('comparisonDialog').open){if(state.selections.length!==2||!eligible(...state.selections))$('comparisonDialog').close();else renderComparison()}
  }
  function renderUnavailable(){$('productBody').innerHTML=`<div class="empty-state"><h2 id="productTitle">${esc(t('unavailableTitle'))}</h2><p id="stockStatus">${esc(t('unavailableBody'))}</p></div>`}
  function refreshOpenProduct(){
    const p=state.products.find(p=>p.sku===state.active?.sku);
    if(!p){state.active=null;state.variant=null;state.editKey=null;state.photo=0;state.detailMessage='';renderUnavailable();return}
    const v=variants(p).find(v=>key(p,v)===key(state.active,state.variant));
    if(!v){state.active=p;state.variant=variants(p)[0];state.editKey=null;state.photo=initialPhoto(p,state.variant);state.detailMessage='variantChanged';renderProductDetail();return}
    state.active=p;state.variant=v;renderProductDetail();
  }
  function renderComparison(){
    const indices=[...new Set(state.selections.flatMap(s=>availablePositions(s.product,s.variant)))].sort((a,b)=>a-b);
    if(!indices.includes(state.comparePhoto))state.comparePhoto=indices[0]??0;
    const root=$('comparisonBody');root.innerHTML='<div class="comparison-content"><div id="comparisonTabs"></div><div class="comparison-grid"></div></div>';
    if(indices.length>1)$('comparisonTabs').replaceChildren(tabs(indices,state.comparePhoto,i=>{state.comparePhoto=i;renderComparison();$('comparisonTabs').querySelector(`[data-position="${i}"]`)?.focus()}));
    const grid=root.querySelector('.comparison-grid');
    state.selections.forEach(s=>{const col=document.createElement('article');col.className='comparison-column';col.innerHTML=`${photo(s.product,s.variant,state.comparePhoto,true)}<h3>${esc(s.product.name)}</h3>${dl([...specRows(s.product,s.variant).slice(0,3),[t('price'),money(s.variant.price)]])}<a class="primary" target="_blank" rel="noopener noreferrer" href="${esc(messengerURL(s.product,s.variant))}">${esc(t('messenger'))}</a>`;grid.append(col)});enhanceImages(root);
  }
  $('filters').onsubmit=e=>e.preventDefault();$('catalogSearch').oninput=renderProducts;$('brandFilter').onchange=renderProducts;$('gradeFilter').onchange=renderProducts;
  $('clearFilters').onclick=()=>{$('filters').reset();renderProducts()};
  $('topPrev').onclick=()=>moveCarousel(-1);$('topNext').onclick=()=>moveCarousel(1);$('topSellers').addEventListener('scroll',updateCarousel,{passive:true});window.addEventListener('resize',updateCarousel);
  $('topSellers').addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();moveCarousel(e.key==='ArrowRight'?1:-1)}});
  $('retry').onclick=loadProducts;$('contactLink').href=messengerURL();if($('headerMessenger'))$('headerMessenger').href=messengerURL();
  document.querySelectorAll('[data-language]').forEach(button=>button.onclick=()=>setLanguage(button.dataset.language));
  $('compareButton').onclick=()=>{if(state.selections.length!==2||!eligible(...state.selections))return;state.comparePhoto=0;renderComparison();$('comparisonDialog').showModal()};
  document.querySelectorAll('dialog').forEach(dialog=>{dialog.querySelector('.close-dialog').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog){const rect=dialog.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)dialog.close()}})});
  setInterval(()=>{if(!document.hidden)loadProducts()},Math.max(30000,Number(C.refreshIntervalMs)||60000));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-state.lastLoaded>15000)loadProducts()});
  applyLanguage();loadProducts();
})();
