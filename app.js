const C=window.STORE_CONFIG;
const samples=window.SAMPLE_PRODUCTS||[];
const $=id=>document.getElementById(id);
const state={products:[],filtered:[]};

document.querySelectorAll("[data-message-link]").forEach(a=>a.href=C.messengerUrl);
$("closeDialog").onclick=()=>$("productDialog").close();
$("heroSearchButton").onclick=()=>{ $("catalogSearch").value=$("heroSearch").value; runSearch(); document.querySelector(".catalog-shell").scrollIntoView({behavior:"smooth"}); };
$("heroSearch").addEventListener("keydown",e=>{if(e.key==="Enter")$("heroSearchButton").click()});
$("catalogSearch").oninput=runSearch;
$("categoryFilter").onchange=runSearch;

loadProducts();

async function loadProducts(){
  try{
    if(!C.apiUrl){
      state.products=samples;
      $("inventoryStatus").textContent="Sample mode — sheet connection comes next";
    }else{
      const separator=C.apiUrl.includes("?")?"&":"?";
      const url=`${C.apiUrl}${separator}store=${encodeURIComponent(C.storeFilter)}`;
      const response=await fetch(url,{cache:"no-store"});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const data=await response.json();
      if(!data.success||!Array.isArray(data.products))throw new Error(data.error||"Invalid inventory response");
      state.products=data.products;
      $("inventoryStatus").textContent=`${state.products.length} product(s) loaded`;
    }
    fillCategories();
    renderTopSellers();
    runSearch();
  }catch(error){
    console.error(error);
    state.products=[];
    $("inventoryStatus").textContent="Inventory unavailable — please message us";
    renderProducts([]);
  }
}

function fillCategories(){
  const select=$("categoryFilter");
  [...new Set(state.products.map(p=>String(p.category||"").trim()).filter(Boolean))].sort().forEach(category=>{
    const option=document.createElement("option");
    option.value=category.toLowerCase();
    option.textContent=category;
    select.appendChild(option);
  });
}

function runSearch(){
  const q=$("catalogSearch").value.trim().toLowerCase();
  const cat=$("categoryFilter").value;
  state.filtered=state.products.filter(p=>{
    const searchable=[p.sku,p.name,p.category,p.grade,...Object.values(p.specs||{})].join(" ").toLowerCase();
    return(!q||searchable.includes(q))&&(!cat||String(p.category||"").toLowerCase()===cat);
  });
  renderProducts(state.filtered);
}

function renderTopSellers(){
  const top=[...state.products].sort((a,b)=>Number(b.sold||0)-Number(a.sold||0)).slice(0,4);
  const container=$("topSellers");
  container.innerHTML="";
  top.forEach(p=>container.appendChild(productCard(p,true)));
}

function renderProducts(list){
  const grid=$("productGrid");
  grid.innerHTML="";
  $("emptyState").classList.toggle("hidden",list.length>0);
  list.forEach(p=>grid.appendChild(productCard(p,false)));
}

function productCard(p,compact){
  const stock=Number(p.stock||0);
  const available=stock>0;
  const article=document.createElement("article");
  article.className="product-card";
  const image=p.image?`<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy">`:"⌚";
  article.innerHTML=`
    <div class="product-photo">${image}</div>
    <div class="product-body">
      <div class="product-meta"><span>${escapeHtml(p.category||"Watch")}</span><span>${escapeHtml(p.sku||"")}</span></div>
      <h3 class="product-name">${escapeHtml(p.name||"Unnamed Watch")}</h3>
      <div class="product-price">${formatMoney(p.price??p.sellingPrice)}</div>
      <span class="stock-badge ${available?"available":"out"}">${available?`Available · ${stock} left`:"Out of Stock"}</span>
      <div class="sold-count">${Number(p.sold||0)} recorded sale(s)</div>
      <div class="card-actions">
        <button type="button">Details</button>
        <a href="${buildMessageUrl(p)}" target="_blank" rel="noopener">${available?"Message Us":"Ask Us"}</a>
      </div>
    </div>`;
  article.querySelector("button").onclick=()=>openProfile(p);
  return article;
}

function openProfile(p){
  const stock=Number(p.stock||0),available=stock>0;
  const specs=Object.entries(p.specs||{}).map(([key,value])=>`<div class="spec-row"><span>${escapeHtml(key)}</span><span>${escapeHtml(value)}</span></div>`).join("");
  $("dialogBody").innerHTML=`
    <div class="product-profile">
      <div class="profile-image">${p.image?`<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}">`:"⌚"}</div>
      <div class="profile-info">
        <div class="profile-sku">${escapeHtml(p.sku||"")}</div>
        <h2>${escapeHtml(p.name||"Unnamed Watch")}</h2>
        <div class="profile-price">${formatMoney(p.price??p.sellingPrice)}</div>
        <span class="stock-badge ${available?"available":"out"}">${available?`Available · ${stock} left`:"Out of Stock"}</span>
        <p class="profile-description">${escapeHtml(p.description||"Message us for complete product details.")}</p>
        <div class="specs">
          <div class="spec-row"><span>Grade</span><span>${escapeHtml(p.grade||"—")}</span></div>
          <div class="spec-row"><span>Category</span><span>${escapeHtml(p.category||"Watch")}</span></div>
          ${specs}
        </div>
        <a class="primary-action" href="${buildMessageUrl(p)}" target="_blank" rel="noopener">Message About ${escapeHtml(p.sku||"This Watch")}</a>
      </div>
    </div>`;
  $("productDialog").showModal();
}

function buildMessageUrl(p){
  const url=C.messengerUrl||"#";
  if(url.includes("m.me/")){
    const separator=url.includes("?")?"&":"?";
    return `${url}${separator}ref=${encodeURIComponent(p.sku||"product")}`;
  }
  return url;
}

function formatMoney(value){
  return new Intl.NumberFormat(C.locale||"en-PH",{style:"currency",currency:C.currency||"PHP",maximumFractionDigits:0}).format(Number(value||0));
}
function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}
