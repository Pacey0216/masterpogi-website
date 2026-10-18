/* Master Pogi storefront: availability, exact-variant photographs and Messenger inquiries. */
(() => {
  'use strict';
  const C=window.STORE_CONFIG||{}, M=window.CatalogModel, $=id=>document.getElementById(id);
  const languageKey='masterpogi:language';
  let productReturn=null;
  let savedLanguage='fil';
  try { if(localStorage.getItem(languageKey)==='en') savedLanguage='en'; } catch {}
  const state={language:savedLanguage,products:[],page:1,selections:[],active:null,variant:null,editKey:null,photo:0,
    comparisonOpen:false,comparisonReturnY:0,lastLoaded:0,loading:false,loadError:false,
    detailMessage:'',trayMessage:'',failedPhotos:new Set()};
  const COPY={
    fil:{
      title:'Mga Relo · Master Pogi',meta:'Mga available na relo ng Master Pogi. Pumili, ikumpara, at magtanong sa Messenger.',
      bestTitle:'Pinakamabentang Relo',topEmpty:'Wala pang naitalang benta para sa mga available na relo.',
      popupDisclaimer:'Replica ang mga relong ito at walang kaugnayan sa mga orihinal na brand.',
      availableTitle:'Mga Available na Relo',catalogNote:'Para sa presyo at ibang detalye, mag-message sa amin.',
      compare:'Ikumpara',compareHelp:'Buksan ang relo at piliin ang grade at sukat. Pumili ng hanggang dalawa.',
      collapse:'Isara ang paghahambing',retry:'Subukan muli',clearFilters:'Alisin ang filter',emptyState:'Walang tugma. Subukan ang ibang filter o pangalan.',
      search:'Hanapin ang relo',searchPlaceholder:'Hanapin ang relo…',brand:'Brand',grade:'Grade',size:'Sukat',model:'Modelo',
      allBrands:'Lahat ng brand',allGrades:'Lahat ng grade',available:'Available',loading:'Kinukuha ang mga relo…',
      loadFailed:'Hindi makuha ang mga relo. Subukan muli.',stale:'Hindi ma-refresh. Huling matagumpay na bilang ang ipinapakita.',
      updated:time=>'Na-update '+time+' · Awtomatikong nagre-refresh',
      count:(n,total)=>n+' relo'+(n!==total?' sa '+total:''),stock:n=>'May '+n+' piraso',
      view:name=>'Tingnan ang detalye ng '+name,zoom:name=>'Palakihin ang larawan ng '+name,
      photoDescription:(name,grade,size,index)=>name+' · '+grade+' · '+size+' · larawan '+(index+1),
      photoGroup:'Mga larawan ng napiling relo',noPhoto:'Wala pang larawan',notListed:'Hindi nakatala',
      productDialogLabel:'Detalye ng relo',closeDetails:'Isara ang detalye',previous:'Naunang mga relo',next:'Susunod na mga relo',language:'Wika',
      pagePrevious:'Naunang pahina',pageNext:'Susunod na pahina',pages:'Mga pahina ng catalog',pageIndicator:(page,total)=>'Pahina '+page+' sa '+total,
      inquiryButton:'Magtanong sa Messenger',saveCompare:'I-save sa pagkumpara',editSelection:name=>'Palitan ang '+name,removeSelection:name=>'Alisin ang '+name,
      duplicate:'Napili na ang SKU na ito. Pumili ng ibang relo, grade, o sukat.',limit:'Dalawa na ang napili. Alisin muna ang isa bago magdagdag.',
      ready:'Handa nang ikumpara.',pickAnother:'Pumili pa ng isang relo, grade, o sukat.',removed:'Inalis ang relo.',removedUnavailable:'Inalis ang relong hindi na available.',
      unavailableTitle:'Hindi na available',unavailableBody:'Hindi na available ang relong ito. Isara at pumili ng iba.',
      variantChanged:'Hindi na available ang dating pinili. Ipinapakita ang available na grade at sukat; suriin bago magpatuloy.',
      productDisclosure:'Replica ang lahat ng relong ibinebenta rito; hindi authentic na produkto ng mga tatak na binanggit. Ang Japan, Swiss, at Super C (1:1) ay mga kategorya ng grade ng nagbebenta, hindi sertipikasyon ng tatak o patunay ng bansang pinagmulan.',
      footerDisclaimer:'Ang mga pangalan, trademark, at logo ng ibang tatak ay pag-aari ng kani-kanilang may-ari. Independent na nagbebenta ang Master Pogi at walang kaugnayan, sponsorship, o endorsement mula sa mga tatak na ito. Ginagamit ang mga pangalan upang makatulong sa pagkilala at pagkumpara ng mga listing.',
      inquiry:'Hi! Magkano po ito at available pa?',
      requestTitle:'Hindi mo makita ang hinahanap mong relo?',
      requestMessage:'I-message sa amin ang larawan o model na gusto mo. Kung wala pa kaming stock, maaari naming itanong sa manufacturer kung puwedeng i-order.',
      requestButton:'Mag-request ng Relo',
      requestInquiry:'Hi! May hinahanap akong relo na wala sa catalog. Puwede po bang mag-request? Ipapadala ko ang larawan o model.',
      specs:{Reference:'Reference',Movement:'Mekanismo','Case Material':'Materyal ng kaha',Dial:'Dial',Strap:'Strap','Water Resistance':'Resistensya sa tubig',Case:'Kaha',Material:'Materyal',Color:'Kulay',Gender:'Para kanino'}
    },
    en:{
      title:'Watches · Master Pogi',meta:'Available watches from Master Pogi. Choose, compare, and ask on Messenger.',
      bestTitle:'Best Selling Watches',topEmpty:'No recorded sales yet for available watches.',
      popupDisclaimer:'These watches are replicas and are not affiliated with the original brands.',
      availableTitle:'Available Watches',catalogNote:'Message us for prices and more details.',
      compare:'Compare',compareHelp:'Open a watch and choose its grade and size. Select up to two.',
      collapse:'Close comparison',retry:'Try again',clearFilters:'Clear filters',emptyState:'No matches. Try a different filter or name.',
      search:'Find a watch',searchPlaceholder:'Find a watch…',brand:'Brand',grade:'Grade',size:'Size',model:'Model',
      allBrands:'All brands',allGrades:'All grades',available:'Available',loading:'Loading watches…',
      loadFailed:'Watches could not be loaded. Please try again.',stale:'Could not refresh. Showing the last successful stock update.',
      updated:time=>'Updated '+time+' · Refreshes automatically',
      count:(n,total)=>n+' watch'+(n===1?'':'es')+(n!==total?' of '+total:''),stock:n=>n+' available',
      view:name=>'View details for '+name,zoom:name=>'Enlarge photo of '+name,
      photoDescription:(name,grade,size,index)=>name+' · '+grade+' · '+size+' · photo '+(index+1),
      photoGroup:'Selected watch photos',noPhoto:'No photo available yet',notListed:'Not listed',
      productDialogLabel:'Watch details',closeDetails:'Close details',previous:'Previous watches',next:'Next watches',language:'Language',
      pagePrevious:'Previous page',pageNext:'Next page',pages:'Catalog pages',pageIndicator:(page,total)=>'Page '+page+' of '+total,
      inquiryButton:'Ask on Messenger',saveCompare:'Save to comparison',editSelection:name=>'Change '+name,removeSelection:name=>'Remove '+name,
      duplicate:'This SKU is already selected. Choose a different watch, grade, or size.',limit:'Two watches are selected. Remove one before adding another.',
      ready:'Ready to compare.',pickAnother:'Choose one more watch, grade, or size.',removed:'Watch removed.',removedUnavailable:'A watch that is no longer available was removed.',
      unavailableTitle:'No longer available',unavailableBody:'This watch is no longer available. Close this window and choose another.',
      variantChanged:'Your previous choice is no longer available. An available grade and size are shown; check them before continuing.',
      productDisclosure:'All watches sold here are replicas, not authentic products of the named brands. Japan, Swiss, and Super C (1:1) are seller grade categories, not brand certifications or proof of country of origin.',
      footerDisclaimer:'Third-party names, trademarks, and logos belong to their respective owners. Master Pogi is an independent seller and is not affiliated with, sponsored by, or endorsed by those brands. Product references are provided to help buyers identify and compare listings.',
      inquiry:'Hi! What is the price, and is this still available?',
      requestTitle:'Can’t find the watch you’re looking for?',
      requestMessage:'Send us a photo or model you want. If we don’t have it in stock, we can check with the manufacturer if it can be ordered.',
      requestButton:'Request a Watch',
      requestInquiry:'Hi! I’m looking for a watch that isn’t in the catalog. Can I request it? I’ll send the photo or model.',
      specs:{Reference:'Reference',Movement:'Movement','Case Material':'Case material',Dial:'Dial',Strap:'Strap','Water Resistance':'Water resistance',Case:'Case',Material:'Material',Color:'Color',Gender:'For'}
    }
  };
  const t=(key,...args)=>{const value=COPY[state.language][key];return typeof value==='function'?value(...args):value;};
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const unique=items=>[...new Set(items.filter(Boolean))];
  const sizeLabel=size=>size?(/mm/i.test(size)?size:size+' mm'):t('notListed');
  const gradeLabel=grade=>grade==='Super C'?'Super C (1:1)':grade||t('notListed');
  const variants=p=>M.availableVariants(p);
  const key=(p,v)=>M.selectionKey(p,v);
  const filters=()=>({query:$('catalogSearch').value,brand:$('brandFilter').value,grade:$('gradeFilter').value});
  const photos=(p,v)=>M.photosForVariant(p,v);
  const eligible=(a,b)=>M.comparisonEligibility(a,b).allowed;
  const scrollBehavior=()=>matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth';
  function imageURL(slot){const url=typeof slot==='string'?slot:slot?.url||'';return state.failedPhotos.has(url)?'':url;}
  function availablePositions(p,v){return photos(p,v).flatMap((slot,index)=>imageURL(slot)?[index]:[]);}
  function initialPhoto(p,v){return availablePositions(p,v)[0]??0;}
  function missing(){return '<div class="photo-missing"><span aria-hidden="true">▧</span><span>'+esc(t('noPhoto'))+'</span></div>';}
  function photo(p,v,position=0,eager=false){
    const url=imageURL(photos(p,v)[position]), source=window.PhotoFrame?.sources(url)[0]||url;
    return '<div class="photo-frame" data-position="'+position+'" data-variant="'+esc(v?.sku||'')+'">'+(url?
      '<img src="'+esc(source)+'" data-upload="'+esc(url)+'" alt="'+esc(t('photoDescription',p.name,gradeLabel(v?.grade),sizeLabel(v?.size),position))+'" loading="'+(eager?'eager':'lazy')+'" decoding="async" referrerpolicy="no-referrer">':missing())+'</div>';
  }
  function photoButton(p,v,position,eager=false){
    const url=imageURL(photos(p,v)[position]);
    if(!url)return photo(p,v,position,eager);
    return '<button type="button" class="photo-open" aria-label="'+esc(t('zoom',p.name))+'">'+photo(p,v,position,eager)+'</button>';
  }
  function openViewer(p,v,position){
    if(!$('productDialog').open||p!==state.active||v!==state.variant)return;
    const positions=availablePositions(p,v),index=positions.indexOf(position);
    if(index<0)return;
    window.ImageViewer?.open({
      images:positions.map(slot=>({url:imageURL(photos(p,v)[slot]),alt:t('photoDescription',p.name,gradeLabel(v.grade),sizeLabel(v.size),slot)})),
      index,language:state.language,
      onChange:next=>{if($('productDialog').open&&state.active&&key(p,v)===key(state.active,state.variant)){state.photo=positions[next];renderGallery();}},
      onClose:()=>{if($('productDialog').open)$('gallery')?.querySelector('.photo-open')?.focus({preventScroll:true});}
    });
  }
  function enhanceImages(root){
    root.querySelectorAll('img[data-upload]').forEach(img=>{
      const sources=window.PhotoFrame?.sources(img.dataset.upload)||[img.src];let attempt=0;
      img.addEventListener('error',()=>{
        if(!img.isConnected)return;
        if(++attempt<sources.length){img.src=sources[attempt];return;}
        state.failedPhotos.add(img.dataset.upload);
        const button=img.closest('.photo-open'),frame=img.closest('.photo-frame');
        if(frame)frame.innerHTML=missing();
        if(button){button.disabled=true;button.removeAttribute('aria-label');}
        if($('productDialog').open&&state.active)renderGallery();
        if(state.comparisonOpen)renderComparison();
      });
      window.PhotoFrame?.enhance(img);
    });
  }
  function representative(p){return variants(p).find(v=>!filters().grade||v.grade===filters().grade)||variants(p)[0];}
  function card(p,bestSeller=false,eager=false){
    const v=bestSeller?variants(p)[0]:representative(p),article=document.createElement('article');
    article.className='product-card';article.dataset.sku=p.sku;
    article.innerHTML='<button type="button" class="listing-image" aria-label="'+esc(t('view',p.name))+'">'+photo(p,v,initialPhoto(p,v),eager)+'</button><button type="button" class="card-open" aria-label="'+esc(t('view',p.name))+'"><span class="product-name">'+esc(p.name)+'</span></button>';
    article.querySelectorAll('.listing-image,.card-open').forEach(button=>button.onclick=event=>{event.stopPropagation();openProduct(p,v);});
    enhanceImages(article);return article;
  }
  function renderProducts(){
    const list=M.filterProducts(state.products,filters()),paged=M.paginateProducts(list,state.page,24);
    state.page=paged.page;
    $('productGrid').replaceChildren(...paged.items.map(p=>card(p)));
    $('emptyState').hidden=list.length>0||!state.lastLoaded;
    $('resultCount').textContent=state.lastLoaded?t('count',list.length,state.products.length):'';
    $('pagination').hidden=paged.total<=24;
    $('pagePrev').disabled=paged.page===1;$('pageNext').disabled=paged.page===paged.totalPages;
    $('pageIndicator').textContent=t('pageIndicator',paged.page,paged.totalPages);
  }
  function changePage(delta){
    state.page+=delta;renderProducts();$('catalogSection').scrollIntoView({behavior:scrollBehavior(),block:'start'});
  }
  function renderTop(){
    const list=M.bestSellers(state.products);
    const scroll=$('topSellers').scrollLeft;
    $('topTitle').textContent=t('bestTitle');
    $('topSellers').setAttribute('aria-label',$('topTitle').textContent);
    $('topSellers').replaceChildren(...list.map((p,i)=>card(p,true,i<4)));$('topSellers').scrollLeft=scroll;
    $('topStatus').hidden=Boolean(state.lastLoaded&&list.length);
    $('topStatus').textContent=!state.lastLoaded?t(state.loadError?'loadFailed':'loading'):t('topEmpty');
    requestAnimationFrame(updateCarousel);
  }
  function updateCarousel(){const el=$('topSellers');$('topPrev').disabled=el.scrollLeft<2;$('topNext').disabled=el.scrollLeft+el.clientWidth>=el.scrollWidth-2;}
  function moveCarousel(direction){const el=$('topSellers');el.scrollBy({left:direction*(el.clientWidth+parseFloat(getComputedStyle(el).gap||0)),behavior:scrollBehavior()});}
  function updateFilterOptions(){
    const current=filters(),brands=unique(state.products.map(p=>p.brand)).sort((a,b)=>a.localeCompare(b));
    const grades=unique(state.products.flatMap(p=>variants(p).map(v=>v.grade))).sort((a,b)=>a.localeCompare(b));
    for(const [id,list,all,previous] of [['brandFilter',brands,t('allBrands'),current.brand],['gradeFilter',grades,t('allGrades'),current.grade]]){
      $(id).replaceChildren(new Option(all,''),...list.map(v=>new Option(id==='gradeFilter'?gradeLabel(v):v,v)));
      $(id).value=list.includes(previous)?previous:'';
    }
  }
  function renderInventoryStatus(){
    const time=state.lastLoaded?new Intl.DateTimeFormat(state.language==='en'?'en-PH':'fil-PH',{hour:'numeric',minute:'2-digit',timeZone:'Asia/Manila'}).format(state.lastLoaded):'';
    $('inventoryStatus').textContent=state.loadError?t(state.lastLoaded?'stale':'loadFailed'):state.lastLoaded?t('updated',time):t('loading');
    $('retry').hidden=!state.loadError;
  }
  function renderMessages(){
    if($('detailMessage'))$('detailMessage').textContent=state.detailMessage?t(state.detailMessage):'';
    $('trayMessage').textContent=state.trayMessage?t(state.trayMessage):'';
  }
  function applyLanguage(){
    document.documentElement.lang=state.language;document.title=t('title');document.querySelector('meta[name="description"]').content=t('meta');
    document.querySelectorAll('[data-i18n]').forEach(el=>{const value=t(el.dataset.i18n);if(typeof value==='string')el.textContent=value;});
    $('searchLabel').textContent=t('search');$('catalogSearch').placeholder=t('searchPlaceholder');$('catalogSearch').setAttribute('aria-label',t('search'));
    for(const [id,label] of [['brandFilter','brand'],['gradeFilter','grade'],['topPrev','previous'],['topNext','next'],['pagePrev','pagePrevious'],['pageNext','pageNext'],['pagination','pages']])$(id).setAttribute('aria-label',t(label));
    document.querySelectorAll('.language-switch').forEach(el=>el.setAttribute('aria-label',t('language')));
    document.querySelectorAll('[data-language]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.language===state.language)));
    $('productDialog').querySelector('.close-dialog').setAttribute('aria-label',t('closeDetails'));
    $('requestLink').href=messengerURL(t('requestInquiry'));
    window.ImageViewer?.setLanguage(state.language);
    updateFilterOptions();renderInventoryStatus();renderTop();renderProducts();renderTray();
    if($('productDialog').open){if(state.active)renderProductDetail();else renderUnavailable();}
    if(state.comparisonOpen)renderComparison();renderMessages();
  }
  function setLanguage(language){
    if(!['fil','en'].includes(language))return;
    state.language=language;try{localStorage.setItem(languageKey,language);}catch{}applyLanguage();
  }
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
    }catch{state.loadError=true;if(!state.lastLoaded){renderTop();$('emptyState').hidden=true;}}
    finally{clearTimeout(timer);state.loading=false;$('retry').disabled=false;$('productGrid').setAttribute('aria-busy','false');renderInventoryStatus();}
  }
  function renderGallery(){
    const wrap=$('gallery');if(!wrap||!state.active)return;
    const valid=availablePositions(state.active,state.variant);
    if(!valid.includes(state.photo))state.photo=valid[0]??0;
    wrap.innerHTML=photoButton(state.active,state.variant,state.photo,true);
    const main=wrap.querySelector('.photo-open');
    if(main)main.onclick=event=>{event.stopPropagation();openViewer(state.active,state.variant,state.photo);};
    enhanceImages(wrap);
    if(valid.length>1){
      const thumbs=document.createElement('div');thumbs.className='photo-thumbnails';thumbs.setAttribute('role','group');thumbs.setAttribute('aria-label',t('photoGroup'));
      valid.forEach(position=>{
        const button=document.createElement('button');button.type='button';button.dataset.position=position;
        button.setAttribute('aria-pressed',String(position===state.photo));
        button.setAttribute('aria-label',t('photoDescription',state.active.name,gradeLabel(state.variant.grade),sizeLabel(state.variant.size),position));
        button.innerHTML=photo(state.active,state.variant,position,true);button.querySelector('img').alt='';
        button.onclick=event=>{event.stopPropagation();state.photo=position;renderGallery();$('gallery').querySelector('[data-position="'+position+'"][aria-pressed]')?.focus({preventScroll:true});};
        thumbs.append(button);
      });
      wrap.append(thumbs);enhanceImages(thumbs);
    }
  }
  function openProduct(p,v=variants(p)[0],editKey=null){
    window.ImageViewer?.close();
    const dialog=$('productDialog');
    if(!dialog.open){
      productReturn={x:scrollX,y:scrollY,focus:document.activeElement,overflow:document.documentElement.style.overflow};
      document.documentElement.style.overflow='hidden';
    }
    state.active=p;state.variant=v;state.editKey=editKey;state.photo=initialPhoto(p,v);state.detailMessage='';
    renderProductDetail();if(!dialog.open){dialog.showModal();dialog.scrollTop=0;}
  }
  function restoreProductPosition(){
    if(!productReturn)return;
    const saved=productReturn;productReturn=null;
    document.documentElement.style.overflow=saved.overflow;
    if(saved.focus?.isConnected)saved.focus.focus({preventScroll:true});
    window.scrollTo({left:saved.x,top:saved.y,behavior:'instant'});
  }
  function closeProduct(){
    window.ImageViewer?.close();
    $('productDialog').close();
    // Restore synchronously, before an intentional jump to inline comparison.
    restoreProductPosition();
  }
  function specRows(p,v){return [[t('grade'),gradeLabel(v?.grade)],[t('size'),sizeLabel(v?.size)],['SKU',v?.sku||p.sku]];}
  function extraRows(p){return Object.entries(p.specs||{}).filter(([k])=>Object.hasOwn(t('specs'),k)).map(([k,value])=>[t('specs')[k],value]);}
  function dl(rows){return '<dl class="specs">'+rows.filter(([,v])=>v).map(([k,v])=>'<div><dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd></div>').join('')+'</dl>';}
  function options(values,current,label=x=>x,disabled=()=>false){
    return values.map(value=>'<option value="'+esc(value)+'"'+(value===current?' selected':'')+(disabled(value)?' disabled':'')+'>'+esc(label(value))+'</option>').join('');
  }
  function renderProductDetail(){
    const p=state.active,v=state.variant,vs=variants(p),grades=unique(vs.map(x=>x.grade)),sizes=unique(vs.filter(x=>x.grade===v?.grade).map(x=>x.size));
    $('productBody').innerHTML='<div class="product-detail"><div id="gallery" class="gallery"></div><div class="detail-info"><h2 id="productTitle">'+esc(p.name)+'</h2><p id="stockStatus" class="stock-status">'+esc(v?t('stock',v.stock):t('unavailableTitle'))+'</p><div class="variant-fields"><label><span>'+esc(t('grade'))+'</span><select id="detailGrade">'+options(grades,v?.grade,gradeLabel)+'</select></label><label><span>'+esc(t('size'))+'</span><select id="detailSize">'+options(sizes,v?.size,sizeLabel)+'</select></label></div><div class="detail-actions"><button id="addComparison" type="button"'+(v?'':' disabled')+'>'+esc(t(state.editKey?'saveCompare':'compare'))+'</button>'+(v?'<a id="inquiryLink" class="primary" href="'+esc(productMessenger(p,v))+'" target="_blank" rel="noopener noreferrer">'+esc(t('inquiryButton'))+'</a>':'')+'</div><p id="detailMessage" class="detail-message" role="status"></p>'+dl([...specRows(p,v),...extraRows(p)])+'</div></div>';
    const disclaimer=document.createElement('p');disclaimer.className='popup-disclaimer';disclaimer.textContent=t('popupDisclaimer');$('productBody').append(disclaimer);
    renderGallery();renderMessages();
    $('detailGrade').onchange=e=>{window.ImageViewer?.close();state.variant=vs.find(x=>x.grade===e.target.value&&x.size===state.variant?.size)||vs.find(x=>x.grade===e.target.value);state.photo=initialPhoto(p,state.variant);state.detailMessage='';renderProductDetail();$('detailGrade').focus({preventScroll:true});};
    $('detailSize').onchange=e=>{window.ImageViewer?.close();state.variant=vs.find(x=>x.grade===state.variant?.grade&&x.size===e.target.value);state.photo=initialPhoto(p,state.variant);state.detailMessage='';renderProductDetail();$('detailSize').focus({preventScroll:true});};
    $('addComparison').onclick=addComparison;
  }
  function messengerURL(message){
    try{const url=new URL(C.messengerUrl);if(url.protocol!=='https:'||!['m.me','www.messenger.com','messenger.com'].includes(url.hostname))return '#';if(message)url.searchParams.set('text',message);return url.href;}catch{return '#';}
  }
  function productMessenger(p,v){return messengerURL(t('inquiry')+' '+[p.name,v.sku||p.sku,gradeLabel(v.grade),sizeLabel(v.size)].join(' | '));}
  function addComparison(){
    if(!state.active||!state.variant)return;
    const candidate={product:state.active,variant:state.variant};
    const editIndex=state.selections.findIndex(s=>key(s.product,s.variant)===state.editKey);
    const others=state.selections.filter((s,i)=>i!==editIndex);
    let error='';
    if(others.some(s=>!eligible(s,candidate)))error='duplicate';
    else if(editIndex<0&&state.selections.length>=2)error='limit';
    if(error){state.detailMessage=error;renderMessages();return;}
    if(editIndex>=0)state.selections[editIndex]=candidate;else state.selections.push(candidate);
    state.editKey=null;state.trayMessage=state.selections.length===2?'ready':'pickAnother';closeProduct();renderTray();
    if(state.selections.length===2)expandComparison();
  }
  function renderTray(){
    $('selectionCount').textContent=state.selections.length+' / 2';$('compareHelp').hidden=state.selections.length>0;
    $('compareSelections').hidden=state.comparisonOpen;
    $('compareSelections').replaceChildren(...state.selections.map(s=>{
      const item=document.createElement('div');item.className='tray-item';item.dataset.sku=s.variant.sku;
      item.innerHTML='<button class="tray-edit" type="button" aria-label="'+esc(t('editSelection',s.product.name))+'"><span class="tray-copy"><strong>'+esc(s.product.name)+'</strong><span>'+esc(gradeLabel(s.variant.grade))+' · '+esc(sizeLabel(s.variant.size))+'</span><span>'+esc(t('stock',s.variant.stock))+'</span></span></button><button class="tray-remove" type="button" aria-label="'+esc(t('removeSelection',s.product.name))+'">×</button>';
      item.querySelector('.tray-edit').onclick=()=>openProduct(s.product,s.variant,key(s.product,s.variant));
      item.querySelector('.tray-remove').onclick=()=>{state.selections=state.selections.filter(x=>x!==s);state.trayMessage='removed';state.comparisonOpen=false;renderTray();};return item;
    }));
    $('compareButton').disabled=state.selections.length!==2||!eligible(...state.selections);
    $('compareButton').hidden=state.comparisonOpen;$('compareButton').setAttribute('aria-expanded',String(state.comparisonOpen));
    $('collapseComparison').hidden=!state.comparisonOpen;$('comparisonPanel').hidden=!state.comparisonOpen;
    renderMessages();
  }
  function expandComparison(){
    if(state.selections.length!==2||!eligible(...state.selections))return;
    if(!state.comparisonOpen)state.comparisonReturnY=window.scrollY;
    state.comparisonOpen=true;renderTray();renderComparison();$('compareTray').scrollIntoView({behavior:scrollBehavior(),block:'start'});
  }
  function collapseComparison(){
    state.comparisonOpen=false;renderTray();$('compareButton').focus({preventScroll:true});
    window.scrollTo({top:state.comparisonReturnY,behavior:'instant'});
  }
  function reconcileSelections(){
    const before=state.selections.length;
    state.selections=state.selections.map(s=>{
      const p=state.products.find(p=>p.sku===s.product.sku);if(!p)return null;
      const v=variants(p).find(v=>key(p,v)===key(s.product,s.variant));return v?{product:p,variant:v}:null;
    }).filter(Boolean);
    if(before!==state.selections.length)state.trayMessage='removedUnavailable';
    if(state.selections.length!==2||!eligible(...state.selections))state.comparisonOpen=false;
    renderTray();if(state.comparisonOpen)renderComparison();
  }
  function renderUnavailable(){window.ImageViewer?.close();$('productBody').innerHTML='<div class="empty-state"><h2 id="productTitle">'+esc(t('unavailableTitle'))+'</h2><p id="stockStatus">'+esc(t('unavailableBody'))+'</p></div><p class="popup-disclaimer">'+esc(t('popupDisclaimer'))+'</p>';}
  function refreshOpenProduct(){
    const p=state.products.find(p=>p.sku===state.active?.sku);
    if(!p){state.active=null;state.variant=null;state.editKey=null;state.photo=0;state.detailMessage='';renderUnavailable();return;}
    const v=variants(p).find(v=>key(p,v)===key(state.active,state.variant));
    if(!v){window.ImageViewer?.close();state.active=p;state.variant=variants(p)[0];state.editKey=null;state.photo=initialPhoto(p,state.variant);state.detailMessage='variantChanged';renderProductDetail();return;}
    if(JSON.stringify(photos(p,v))!==JSON.stringify(photos(state.active,state.variant))){window.ImageViewer?.close();state.photo=initialPhoto(p,v);}
    state.active=p;state.variant=v;renderProductDetail();
  }
  function comparisonChoices(index,p){const other=state.selections[1-index];return variants(p).filter(v=>!other||eligible({product:p,variant:v},other));}
  function changeComparison(index,field,value){
    const old=state.selections[index];if(!old)return;
    let p=old.product,v;
    if(field==='product'){
      p=state.products.find(p=>p.sku===value);if(!p)return;
      const choices=comparisonChoices(index,p);v=choices.find(x=>x.grade===old.variant.grade&&x.size===old.variant.size)||choices.find(x=>x.grade===old.variant.grade)||choices[0];
    }else if(field==='grade'){
      const choices=comparisonChoices(index,p).filter(x=>x.grade===value);v=choices.find(x=>x.size===old.variant.size)||choices[0];
    }else v=variants(p).find(x=>x.grade===old.variant.grade&&x.size===value);
    if(!v||!eligible({product:p,variant:v},state.selections[1-index])){state.trayMessage='duplicate';renderComparison();renderMessages();return;}
    state.selections[index]={product:p,variant:v};state.trayMessage='';renderTray();renderComparison();
    const id='compare'+field[0].toUpperCase()+field.slice(1)+index;$(id)?.focus({preventScroll:true});
  }
  function renderComparison(){
    if(!state.comparisonOpen||state.selections.length!==2)return;
    const grid=$('comparisonGrid');grid.replaceChildren();
    state.selections.forEach((s,index)=>{
      const p=s.product,v=s.variant,vs=variants(p),choices=comparisonChoices(index,p);
      const control=document.createElement('div');control.className='comparison-controls';control.dataset.column=index;
      control.innerHTML='<label><span>'+esc(t('model'))+'</span><select id="compareProduct'+index+'">'+options(state.products.map(p=>p.sku),p.sku,sku=>state.products.find(p=>p.sku===sku).name,sku=>!comparisonChoices(index,state.products.find(p=>p.sku===sku)).length)+'</select></label><label><span>'+esc(t('grade'))+'</span><select id="compareGrade'+index+'">'+options(unique(vs.map(x=>x.grade)),v.grade,gradeLabel,grade=>!choices.some(x=>x.grade===grade))+'</select></label><label><span>'+esc(t('size'))+'</span><select id="compareSize'+index+'">'+options(unique(vs.filter(x=>x.grade===v.grade).map(x=>x.size)),v.size,sizeLabel,size=>!choices.some(x=>x.grade===v.grade&&x.size===size))+'</select></label><p class="stock-status" data-sku="'+esc(v.sku)+'">'+esc(t('stock',v.stock))+'</p>';
      grid.append(control);
      for(const field of ['product','grade','size'])$('compare'+field[0].toUpperCase()+field.slice(1)+index).onchange=e=>changeComparison(index,field,e.target.value);
    });
    // Pair the first available image with the first, then the second with the
    // second. Original source-slot positions remain on each actual image.
    const sequences=state.selections.map(s=>availablePositions(s.product,s.variant));
    const rows=Math.max(...sequences.map(list=>list.length));
    for(let row=0;row<rows;row++){
      state.selections.forEach((s,index)=>{
        const cell=document.createElement('div'),position=sequences[index][row];
        cell.className='comparison-photo'+(position===undefined?' empty':'');cell.dataset.column=index;cell.dataset.row=row;
        if(position===undefined)cell.setAttribute('aria-hidden','true');
        else cell.innerHTML=photo(s.product,s.variant,position,row===0);
        grid.append(cell);
      });
    }
    state.selections.forEach((s,index)=>{
      const details=document.createElement('div');details.className='comparison-details';details.dataset.column=index;details.dataset.sku=s.variant.sku;
      details.innerHTML='<h3>'+esc(s.product.name)+'</h3>'+dl([...specRows(s.product,s.variant),...extraRows(s.product)])+'<a class="primary comparison-messenger" href="'+esc(productMessenger(s.product,s.variant))+'" target="_blank" rel="noopener noreferrer">'+esc(t('inquiryButton'))+'</a>';
      grid.append(details);
    });
    enhanceImages(grid);
  }
  function filterChanged(){state.page=1;renderProducts();}
  $('filters').onsubmit=e=>e.preventDefault();$('catalogSearch').oninput=filterChanged;$('brandFilter').onchange=filterChanged;$('gradeFilter').onchange=filterChanged;
  $('clearFilters').onclick=()=>{$('filters').reset();filterChanged();};
  $('pagePrev').onclick=()=>changePage(-1);$('pageNext').onclick=()=>changePage(1);
  $('topPrev').onclick=()=>moveCarousel(-1);$('topNext').onclick=()=>moveCarousel(1);
  $('topSellers').addEventListener('scroll',updateCarousel,{passive:true});window.addEventListener('resize',updateCarousel);
  $('topSellers').addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();moveCarousel(e.key==='ArrowRight'?1:-1);}});
  $('retry').onclick=loadProducts;$('contactLink').href=messengerURL();$('headerMessenger').href=messengerURL();
  document.querySelectorAll('[data-language]').forEach(button=>button.onclick=()=>setLanguage(button.dataset.language));
  $('compareButton').onclick=expandComparison;$('collapseComparison').onclick=collapseComparison;
  const productDialog=$('productDialog');
  productDialog.querySelector('.close-dialog').onclick=closeProduct;
  productDialog.addEventListener('cancel',e=>{e.preventDefault();closeProduct();});
  productDialog.addEventListener('close',()=>{if(!productDialog.open){window.ImageViewer?.close();restoreProductPosition();}});
  productDialog.addEventListener('click',e=>{if(e.target===productDialog){const rect=productDialog.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)closeProduct();}});
  setInterval(()=>{if(!document.hidden)loadProducts();},Math.max(30000,Number(C.refreshIntervalMs)||60000));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-state.lastLoaded>15000)loadProducts();});
  applyLanguage();loadProducts();
})();
