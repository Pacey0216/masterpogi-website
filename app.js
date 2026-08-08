const C=window.STORE_CONFIG;
const $=id=>document.getElementById(id);
const isTop=document.body.classList.contains("top-theme");
const savedLanguage=localStorage.getItem("watchStoreLanguage");
const state={
  products:[],
  filtered:[],
  selectedBrands:new Set(),
  language:isTop?(savedLanguage==="en"?"en":"fil"):"en",
  lastLoadedAt:0,
  activeProduct:null
};

const I18N={
  fil:{
    heroTitle:"Relo para sa modernong lalaki.",
    heroDescription:"Hanapin ayon sa model, brand, o reference. Tingnan ang detalye at umorder direkta sa amin.",
    heroPlaceholder:"Hanapin ang relo, brand, o reference",
    search:"Hanapin",
    fast:"MABILISANG PILI",
    topTitle:"Pinakamabentang Relo",
    topDescription:"Top 6 na relo batay sa naitalang benta.",
    catalog:"CATALOG",
    available:"Mga Available na Relo",
    catalogPlaceholder:"I-type ang brand, model, style, o reference",
    allBrands:"Lahat ng Brand",
    brandsSelected:n=>`${n} brand ang napili`,
    empty:"Walang nakitang relo. Subukan ang ibang brand o search term.",
    special:"SPECIAL REQUEST",
    requestTitle:"Hindi mo makita ang gusto mong relo?",
    requestDescription:"Sabihin sa amin ang desired watch mo at tutulungan ka naming hanapin ito.",
    requestButton:"Request a Watch",
    details:"Tingnan",
    loaded:n=>`${n} available na relo · live inventory`,
    unavailable:"Hindi ma-load ang live inventory",
    newArrival:"New arrival",
    sales:n=>`${n} recorded sale${n===1?"":"s"}`,
    footer:"Quality watches. Tapat na presyo. Simpleng order."
  },
  en:{
    heroTitle:"Built for the modern man.",
    heroDescription:"Search by model, brand, or reference. Review the details and order directly.",
    heroPlaceholder:"Search watch, brand, or reference",
    search:"Search",
    fast:"FAST PICKS",
    topTitle:"Top-Selling Watches",
    topDescription:"Top 6 watches based on recorded sales.",
    catalog:"LIVE CATALOG",
    available:"Available Watches",
    catalogPlaceholder:"Type brand, model, style, or reference",
    allBrands:"All brands",
    brandsSelected:n=>`${n} brands selected`,
    empty:"No watch found. Try another brand or search term.",
    special:"SPECIAL REQUEST",
    requestTitle:"Don't see the watch you like?",
    requestDescription:"Tell us your desired watch and we’ll help you look for it.",
    requestButton:"Request a Watch",
    details:"Details",
    loaded:n=>`${n} available watch${n===1?"":"es"} · live inventory`,
    unavailable:"Live inventory unavailable",
    newArrival:"New arrival",
    sales:n=>`${n} recorded sale${n===1?"":"s"}`,
    footer:"Quality watches. Honest pricing. Simple ordering."
  }
};

function t(key){return I18N[state.language][key]}

if($("closeDialog")) $("closeDialog").onclick=()=>$("productDialog").close();
if($("heroSearchButton")) $("heroSearchButton").onclick=()=>{
  $("catalogSearch").value=$("heroSearch").value;
  runSearch();
  document.querySelector(".catalog-shell").scrollIntoView({behavior:"smooth"});
};
if($("heroSearch")) $("heroSearch").addEventListener("keydown",e=>{if(e.key==="Enter")$("heroSearchButton").click()});
if($("catalogSearch")) $("catalogSearch").oninput=runSearch;
if($("brandFilterButton")) $("brandFilterButton").onclick=e=>{e.stopPropagation();$("brandFilterMenu").classList.toggle("hidden")};
if($("brandFilterMenu")) $("brandFilterMenu").onclick=e=>e.stopPropagation();
if($("topPrev")) $("topPrev").onclick=()=>scrollTopCarousel(-1);
if($("topNext")) $("topNext").onclick=()=>scrollTopCarousel(1);
if($("filButton")) $("filButton").onclick=()=>setLanguage("fil");
if($("engButton")) $("engButton").onclick=()=>setLanguage("en");
document.addEventListener("click",()=>$("brandFilterMenu")?.classList.add("hidden"));

setupContacts();
applyLanguage();
loadProducts();

const refreshMs=Math.max(30000,Number(C.refreshIntervalMs||60000));
setInterval(()=>{if(!document.hidden)loadProducts({silent:true})},refreshMs);
document.addEventListener("visibilitychange",()=>{
  if(!document.hidden&&Date.now()-state.lastLoadedAt>15000)loadProducts({silent:true});
});

function setLanguage(language){
  if(!isTop)return;
  state.language=language;
  localStorage.setItem("watchStoreLanguage",language);
  applyLanguage();
  updateBrandFilterButton();
  renderTopSellers();
  renderProducts(state.filtered);
  if(state.activeProduct&&$("productDialog")?.open)openProfile(state.activeProduct);
}

function applyLanguage(){
  if(!isTop)return;
  document.documentElement.lang=state.language==="fil"?"fil":"en";
  $("filButton")?.classList.toggle("active",state.language==="fil");
  $("engButton")?.classList.toggle("active",state.language==="en");
  setText("heroTitle",t("heroTitle"));
  setText("heroDescription",t("heroDescription"));
  setPlaceholder("heroSearch",t("heroPlaceholder"));
  setText("heroSearchButton",t("search"));
  setText("fastPicksLabel",t("fast"));
  setText("topSellingTitle",t("topTitle"));
  setText("topSellingDescription",t("topDescription"));
  setText("catalogLabel",t("catalog"));
  setText("availableTitle",t("available"));
  setPlaceholder("catalogSearch",t("catalogPlaceholder"));
  setText("emptyMessage",t("empty"));
  setText("checkoutLabel",t("special"));
  setText("quickOrderTitle",t("requestTitle"));
  setText("quickOrderDescription",t("requestDescription"));
  setText("requestWatchLink",t("requestButton"));
  setText("footerTagline",t("footer"));
  updateInventoryStatus();
}

async function loadProducts({silent=false}={}){
  try{
    if(!C.apiUrl)throw new Error("Inventory endpoint not configured");
    const separator=C.apiUrl.includes("?")?"&":"?";
    const url=`${C.apiUrl}${separator}store=${encodeURIComponent(C.storeFilter||"all")}&_=${Date.now()}`;
    const response=await fetch(url,{cache:"no-store"});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const data=await response.json();
    if(!data.success||!Array.isArray(data.products))throw new Error(data.error||"Invalid inventory response");
    state.products=data.products
      .filter(p=>Number(p.stock||0)>0&&p.visible!==false)
      .sort(sortBySales);
    state.lastLoadedAt=Date.now();
    fillBrands();
    renderTopSellers();
    runSearch();
    updateInventoryStatus();
  }catch(error){
    console.error(error);
    if(!silent){
      state.products=[];
      state.filtered=[];
      updateInventoryStatus(true);
      renderTopSellers();
      renderProducts([]);
    }
  }
}

function sortBySales(a,b){
  const soldDiff=Number(b.sold||0)-Number(a.sold||0);
  if(soldDiff)return soldDiff;
  return String(a.name||"").localeCompare(String(b.name||""));
}

function updateInventoryStatus(error=false){
  if(!$("inventoryStatus"))return;
  if(error){$("inventoryStatus").textContent=isTop?t("unavailable"):"Live inventory unavailable";return}
  const n=state.products.length;
  $("inventoryStatus").textContent=isTop?t("loaded")(n):`${n} available watch${n===1?"":"es"} · live inventory`;
}

function fillBrands(){
  const menu=$("brandFilterMenu");
  if(!menu)return;
  const brands=[...new Set(state.products.map(p=>String(p.category||p.brand||"").trim()).filter(Boolean))].sort();
  const valid=new Set(brands.map(b=>b.toLowerCase()));
  state.selectedBrands=new Set([...state.selectedBrands].filter(b=>valid.has(b)));
  menu.innerHTML="";
  brands.forEach(brand=>{
    const key=brand.toLowerCase();
    const label=document.createElement("label");
    label.className="brand-option";
    const input=document.createElement("input");
    input.type="checkbox";
    input.checked=state.selectedBrands.has(key);
    input.value=key;
    input.onchange=()=>{
      if(input.checked)state.selectedBrands.add(key);else state.selectedBrands.delete(key);
      updateBrandFilterButton();
      runSearch();
    };
    const span=document.createElement("span");
    span.textContent=brand;
    label.append(input,span);
    menu.appendChild(label);
  });
  updateBrandFilterButton();
}

function updateBrandFilterButton(){
  const button=$("brandFilterButton");
  if(!button)return;
  const count=state.selectedBrands.size;
  if(count===0){button.textContent=`${isTop?t("allBrands"):"All brands"} ▾`;return}
  if(count===1){
    const key=[...state.selectedBrands][0];
    const product=state.products.find(p=>String(p.category||p.brand||"").toLowerCase()===key);
    button.textContent=`${product?.category||product?.brand||key} ▾`;
    return;
  }
  button.textContent=`${isTop?t("brandsSelected")(count):`${count} brands selected`} ▾`;
}

function runSearch(){
  const q=($("catalogSearch")?.value||"").trim().toLowerCase();
  state.filtered=state.products.filter(p=>{
    const brand=String(p.category||p.brand||"").toLowerCase();
    const searchable=[p.sku,p.name,p.category,p.brand,p.grade,p.reference,...Object.values(p.specs||{})].join(" ").toLowerCase();
    const brandMatch=state.selectedBrands.size===0||state.selectedBrands.has(brand);
    return brandMatch&&(!q||searchable.includes(q));
  }).sort(sortBySales);
  renderProducts(state.filtered);
}

function renderTopSellers(){
  const container=$("topSellers");
  if(!container)return;
  container.innerHTML="";
  state.products.slice(0,6).forEach(p=>container.appendChild(productCard(p)));
}

function scrollTopCarousel(direction){
  const track=$("topSellers");
  if(!track)return;
  track.scrollBy({left:direction*track.clientWidth,behavior:"smooth"});
}

function renderProducts(list){
  const grid=$("productGrid");
  if(!grid)return;
  grid.innerHTML="";
  $("emptyState")?.classList.toggle("hidden",list.length>0);
  list.forEach(p=>grid.appendChild(productCard(p)));
}

function productCard(p){
  const stock=Number(p.stock||0);
  const article=document.createElement("article");
  article.className="product-card";
  const image=p.image?`<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy">`:"⌚";
  const saleText=Number(p.sold||0)>0?(isTop?t("sales")(Number(p.sold||0)):`${Number(p.sold||0)} recorded sale${Number(p.sold||0)===1?"":"s"}`):(isTop?t("newArrival"):"New arrival");
  article.innerHTML=`
    <div class="product-photo">${image}</div>
    <div class="product-body">
      <div class="product-meta"><span>${escapeHtml(p.category||p.brand||"Watch")}</span><span>${escapeHtml(p.sku||"")}</span></div>
      <h3 class="product-name">${escapeHtml(p.name||"Unnamed Watch")}</h3>
      <div class="product-price">${formatMoney(p.price??p.sellingPrice)}</div>
      <span class="stock-badge available">Available · ${stock} left</span>
      <div class="sold-count">${escapeHtml(saleText)}</div>
      <div class="card-actions">
        <button type="button">${isTop?t("details"):"Details"}</button>
        <a class="order-now" target="_blank" rel="noopener">Order Now</a>
      </div>
    </div>`;
  article.querySelector("button").onclick=()=>openProfile(p);
  wireMessageLink(article.querySelector(".order-now"),buildOrderMessage(p));
  return article;
}

function openProfile(p){
  state.activeProduct=p;
  const stock=Number(p.stock||0);
  const specs=Object.entries(p.specs||{}).map(([key,value])=>`<div class="spec-row"><span>${escapeHtml(key)}</span><span>${escapeHtml(value)}</span></div>`).join("");
  $("dialogBody").innerHTML=`
    <div class="product-profile">
      <div class="profile-image">${p.image?`<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}">`:"⌚"}</div>
      <div class="profile-info">
        <div class="profile-sku">${escapeHtml(p.sku||"")}</div>
        <h2>${escapeHtml(p.name||"Unnamed Watch")}</h2>
        <div class="profile-price">${formatMoney(p.price??p.sellingPrice)}</div>
        <span class="stock-badge available">Available · ${stock} left</span>
        <p class="profile-description">${escapeHtml(p.description||"Contact us for complete product details.")}</p>
        <div class="specs">
          <div class="spec-row"><span>Grade</span><span>${escapeHtml(p.grade||"—")}</span></div>
          <div class="spec-row"><span>Brand</span><span>${escapeHtml(p.category||p.brand||"Watch")}</span></div>
          ${specs}
        </div>
        <a id="profileOrderNow" class="primary-action" target="_blank" rel="noopener">Order Now</a>
      </div>
    </div>`;
  wireMessageLink($("profileOrderNow"),buildOrderMessage(p));
  if(!$("productDialog").open)$("productDialog").showModal();
}

function buildOrderMessage(p){
  const specs=p.specs||{};
  const lines=[
    "Order Now",
    `Product: ${p.name||""}`,
    `Brand: ${p.category||p.brand||""}`,
    `Reference: ${p.reference||specs.Reference||""}`,
    `Size(s): ${specs["Available Sizes"]||""}`,
    `Grade: ${p.grade||""}`,
    `Price: ${formatMoney(p.price??p.sellingPrice)}`,
    `SKU: ${p.sku||""}`
  ];
  return lines.filter(line=>!line.endsWith(": ")).join("\n");
}

function buildMessengerUrl(message){
  const base=C.messengerUrl||C.facebookUrl||"#";
  if(base==="#")return base;
  const separator=base.includes("?")?"&":"?";
  return `${base}${separator}text=${encodeURIComponent(message)}`;
}

function wireMessageLink(anchor,message){
  if(!anchor)return;
  anchor.href=buildMessengerUrl(message);
  anchor.addEventListener("click",()=>{
    if(navigator.clipboard?.writeText)navigator.clipboard.writeText(message).catch(()=>{});
  });
}

function setupContacts(){
  if($("contactPhone")){ $("contactPhone").href=C.phoneUrl||"#"; $("contactPhoneText").textContent=C.phoneDisplay||""; }
  if($("contactEmail")){ $("contactEmail").href=C.email?`mailto:${C.email}`:"#"; $("contactEmailText").textContent=C.email||""; }
  if($("contactWhatsapp")){ $("contactWhatsapp").href=C.whatsappUrl||"#"; $("contactWhatsappText").textContent=C.whatsappDisplay||""; }
  if($("contactFacebook"))$("contactFacebook").href=C.facebookUrl||C.messengerUrl||"#";
  if($("requestWatchLink"))wireMessageLink($("requestWatchLink"),"Looking for: ");
  if($("contactToggle"))$("contactToggle").onclick=e=>{e.stopPropagation();$("contactPanel").classList.toggle("hidden")};
  if($("contactPanel"))$("contactPanel").onclick=e=>e.stopPropagation();
  document.addEventListener("click",()=>$("contactPanel")?.classList.add("hidden"));
}

function setText(id,value){const el=$(id);if(el)el.textContent=value}
function setPlaceholder(id,value){const el=$(id);if(el)el.placeholder=value}
function formatMoney(value){return new Intl.NumberFormat(C.locale||"en-PH",{style:"currency",currency:C.currency||"PHP",maximumFractionDigits:0}).format(Number(value||0))}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
