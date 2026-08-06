const C=window.MASTER_POGI_CONFIG;
const $=id=>document.getElementById(id);
const sample=[
{sku:"MP-0001",name:"Sample Product",category:"Watch",brand:"Sample",model:"01",grade:"Grade B",conditionNotes:"Replace this sample from Google Sheets.",sellingPrice:2500,stock:1,mainImageUrl:"",description:"Sample listing until the API is connected."},
{sku:"MP-0002",name:"Sample Accessory",category:"Accessory",brand:"Master Pogi",model:"",grade:"N/A",conditionNotes:"Sample only.",sellingPrice:650,stock:0,mainImageUrl:"",description:"Sample out-of-stock item."}
];
let products=[];
$("year").textContent=new Date().getFullYear();
$("topMessage").href=C.messengerUrl;
$("search").oninput=filter;
$("category").onchange=filter;
$("availability").onchange=filter;
$("close").onclick=()=>$("modal").close();

load();

async function load(){
  try{
    if(!C.apiUrl){
      products=C.showSamplesWhenDisconnected?sample:[];
      $("status").textContent=C.showSamplesWhenDisconnected?"Sample mode — connect Apps Script API.":"API not connected.";
    }else{
      const r=await fetch(C.apiUrl,{cache:"no-store"});
      const d=await r.json();
      if(!d.success||!Array.isArray(d.products))throw new Error(d.error||"Invalid response");
      products=d.products;
      $("status").textContent=`${products.length} live product(s)`;
    }
    categories();filter();
  }catch(e){
    console.error(e);products=[];$("status").textContent="Inventory unavailable. Please message us.";render([]);
  }
}
function categories(){
  [...new Set(products.map(p=>p.category).filter(Boolean))].sort().forEach(x=>{
    const o=document.createElement("option");o.value=x.toLowerCase();o.textContent=x;$("category").appendChild(o);
  });
}
function filter(){
  const q=$("search").value.toLowerCase(),cat=$("category").value,a=$("availability").value;
  render(products.filter(p=>{
    const text=[p.sku,p.name,p.brand,p.model,p.category].join(" ").toLowerCase(),s=Number(p.stock||0);
    return(!q||text.includes(q))&&(!cat||String(p.category||"").toLowerCase()===cat)&&(a==="all"||(a==="available"&&s>0)||(a==="out"&&s<=0));
  }));
}
function render(list){
  $("products").innerHTML="";$("empty").classList.toggle("hidden",list.length>0);
  list.forEach(p=>{
    const s=Number(p.stock||0),available=s>0,card=document.createElement("article");card.className="card";
    card.innerHTML=`<div class="photo">${p.mainImageUrl?`<img src="${esc(p.mainImageUrl)}" alt="${esc(p.name)}">`:"⌚"}</div>
    <div class="body"><div class="meta"><span>${esc(p.category||"Product")}</span><span>${esc(p.sku||"")}</span></div>
    <h3>${esc(p.name||"Unnamed Product")}</h3><div class="price">${money(p.sellingPrice)}</div>
    <span class="stock ${available?"available":"out"}">${available?`Available · ${s} left`:"Out of Stock"}</span>
    <div class="actions"><button class="btn view">View</button><a class="btn gold" target="_blank" href="${C.messengerUrl}">${available?"Message":"Ask"}</a></div></div>`;
    card.querySelector(".view").onclick=()=>openProduct(p);$("products").appendChild(card);
  });
}
function openProduct(p){
  const s=Number(p.stock||0);
  $("modalBody").innerHTML=`<div class="modal-grid"><div class="modal-photo">${p.mainImageUrl?`<img src="${esc(p.mainImageUrl)}" alt="${esc(p.name)}">`:"⌚"}</div>
  <div class="modal-info"><small>${esc(p.sku||"")}</small><h2>${esc(p.name||"")}</h2><div class="price">${money(p.sellingPrice)}</div>
  <span class="stock ${s>0?"available":"out"}">${s>0?`Available · ${s} left`:"Out of Stock"}</span>
  <p><b>Brand:</b> ${esc(p.brand||"—")}</p><p><b>Model:</b> ${esc(p.model||"—")}</p><p><b>Grade:</b> ${esc(p.grade||"—")}</p>
  <p>${esc(p.description||"")}</p><p><b>Condition:</b> ${esc(p.conditionNotes||"Contact us for details.")}</p>
  <a class="btn gold" target="_blank" href="${C.messengerUrl}">Message About This Product</a></div></div>`;
  $("modal").showModal();
}
function money(v){return new Intl.NumberFormat(C.locale,{style:"currency",currency:C.currency,maximumFractionDigits:0}).format(Number(v||0))}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}