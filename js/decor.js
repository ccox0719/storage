/* ==================================================================
   HOME SHOPPING · furnishings, storage, systems and other house purchases
   ================================================================== */
const DECOR_RAW = [
["Living Room","6' faux olive tree",40,"Natural trunk, airy leaves, woven basket"],["Living Room","9×12 rug",175,"Cream/taupe vintage pattern with muted rust or sage"],["Living Room","Coffee table",150,"48–54 in. warm oak/walnut, simple lines"],["Living Room","End table #1",60,"Round wood top with black metal base"],["Living Room","End table #2",60,"Coordinate with first end table"],["Living Room","Lamp #1",35,"Cream ceramic base with linen shade"],["Living Room","Lamp #2",35,"Coordinate with first lamp"],["Living Room","Pillows + throw",75,"Olive, muted rust and cream textures"],
["Dining Room","Tall faux grass/tree #1",30,"Slim natural-looking faux olive-style plant"],["Dining Room","Tall faux grass/tree #2",30,"Matching or coordinating plant"],["Dining Room","8×10 rug",125,"Cream/taupe low-contrast vintage pattern"],["Dining Room","Buffet",200,"Warm wood, black hardware, about 48–60 in."],["Dining Room","Centerpiece / decor",50,"Tray, greenery and black candleholders"],
["Entry","Console",120,"Warm wood, 42–60 in. wide"],["Entry","Mirror",60,"Round or softly arched, black or aged brass"],["Entry","Lamp",35,"Cream ceramic or stone-look base"],["Entry","Plant + basket",50,"Olive/eucalyptus with woven basket"],["Entry","Runner",60,"Muted vintage cream/taupe/rust"],
["Primary Bedroom","8×10 or 9×12 rug",175,"Cream / blue-gray vintage pattern"],["Primary Bedroom","Lamp #1",35,"Stone or ceramic base, linen shade"],["Primary Bedroom","Lamp #2",35,"Coordinate with lamp #1"],["Primary Bedroom","Bench",100,"Wood + cream upholstered seat"],["Primary Bedroom","Tall plant",40,"Olive tree or soft green foliage"],["Primary Bedroom","Art",60,"Muted landscape or abstract"],
["Elsie’s Room","5×7 or 6×9 rug",80,"Cream with soft floral pink/blue accents"],["Elsie’s Room","Small lamp",25,"Cream base and warm linen shade"],
["Boys’ Room","Shared nightstand",60,"Warm wood with simple drawer"],["Boys’ Room","Under-bed storage #1",25,"Low-profile woven bin or drawer"],["Boys’ Room","Under-bed storage #2",25,"Matching bin or drawer"],["Boys’ Room","Twin bed #1",200,"Simple wood frame with storage"],["Boys’ Room","Twin bed #2",200,"Match bed #1"],
["Game Room","Shelf greenery #1",10,"Small pothos in cream stone pot"],["Game Room","Shelf greenery #2",10,"Eucalyptus in white ceramic pot"],["Game Room","Shelf greenery #3",10,"Small trailing plant"],["Game Room","Basket/bin #1",20,"Woven storage basket"],["Game Room","Basket/bin #2",20,"Coordinating woven storage bin"],["Game Room","Bar stool #1",60,"Brown faux leather + black metal"],["Game Room","Bar stool #2",60,"Match stool #1"],["Game Room","Bar stool #3",60,"Match stool #1"],["Game Room","Bar stool #4",60,"Match stool #1"],
["Basement TV Room","9×12 rug",175,"Vintage Persian-style rug · warm cream/tan base with rust, muted blue and faded brown"],["Basement TV Room","Coffee table",150,"Medium-to-dark walnut top · simple black metal base · substantial rectangular shape"],["Basement TV Room","End table #1",60,"Dark walnut or espresso wood · black metal accents · simple profile"],["Basement TV Room","End table #2",60,"Coordinate with walnut/espresso end table #1"],["Basement TV Room","Lamp #1",35,"Warm cream, taupe or dark textured ceramic base · linen shade · soft amber light"],["Basement TV Room","Lamp #2",35,"Coordinate with lamp #1 · warm neutral ceramic/stone look"]
];
const DECOR_IMAGE_GROUPS=[["living",8],["dining",5],["entry",5],["primary",6],["elsie",2],["boys",5],["game",9],["basement",6]];
const DECOR_IMAGES=DECOR_IMAGE_GROUPS.flatMap(([name,count])=>Array.from({length:count},(_,i)=>`assets/decor/${name}-${i+1}.jpg`));
const DECOR_SEED=DECOR_RAW.map((r,i)=>({id:`d${i+1}`,room:r[0],name:r[1],target:r[2],style:r[3],image:DECOR_IMAGES[i],actual:null,store:"",link:"",status:"Looking",purchased_at:null}));
DECOR_SEED.push(
  {id:"d-home-1",room:"Storage",name:"Basement storage totes",target:0,style:"Climate-controlled basement shelving: 16 shallow shelves approx. 47 in wide × 18.5 in deep × 17 in high, plus 4 deep back-corner shelves approx. 57 in wide × 36 in deep × 17 in high and a continuous top shelf. Existing common 27-gal black/yellow totes are about 30.6 × 20.6 × 14.3 in. Shallow shelves can hold one tote with about 2.1 in of overhang; deep shelves can hold two totes side by side when rotated.",image:"",actual:null,store:"",link:"",status:"Use existing totes first",purchased_at:null},
  {id:"d-home-2",room:"Home systems",name:"House-system supplies / parts",target:0,style:"Use this shopping list for practical home needs too, not only decor.",image:"",actual:null,store:"",link:"",status:"As needed",purchased_at:null},
  {id:"d-home-3",room:"Smart home",name:"Smart plugs",target:0,style:"Add only where they solve a specific automation need. Prefer models that integrate cleanly with Home Assistant rather than adding more cloud-only apps.",image:"",actual:null,store:"",link:"",status:"Plan locations first",purchased_at:null},
  {id:"d-home-4",room:"Home protection",name:"Water leak protection",target:0,style:"Leak sensors / water protection for high-risk locations such as water heater, washers, kitchen sink, basement kitchenette and other plumbing points. Coordinate with the Home Assistant plan.",image:"",actual:null,store:"",link:"",status:"Choose system",purchased_at:null},
  {id:"d-home-5",room:"Lighting",name:"Govee / accent lamps",target:0,style:"Accent lighting for rooms that need warmth or indirect light. Consider Govee floor lamps or other compact accent lamps after furniture placement so each light has a clear purpose.",image:"",actual:null,store:"",link:"",status:"Choose rooms after move-in",purchased_at:null}
);
let decorItems=Store.read("wil-decor",null)||DECOR_SEED.map(x=>({...x}));
mergeNewSeedItems(decorItems,DECOR_SEED,saveDecor);
const BASEMENT_STYLE_UPDATE={
  "9×12 rug":"Vintage Persian-style rug · warm cream/tan base with rust, muted blue and faded brown",
  "Coffee table":"Medium-to-dark walnut top · simple black metal base · substantial rectangular shape",
  "End table #1":"Dark walnut or espresso wood · black metal accents · simple profile",
  "End table #2":"Coordinate with walnut/espresso end table #1",
  "Lamp #1":"Warm cream, taupe or dark textured ceramic base · linen shade · soft amber light",
  "Lamp #2":"Coordinate with lamp #1 · warm neutral ceramic/stone look"
};
function applyBasementStyleUpdate(sync=true){
  let changed=false;
  decorItems.forEach(i=>{if(i.room==="Basement TV Room"&&BASEMENT_STYLE_UPDATE[i.name]&&i.style!==BASEMENT_STYLE_UPDATE[i.name]){i.style=BASEMENT_STYLE_UPDATE[i.name];changed=true;}});
  if(changed){
    Store.write("wil-decor",decorItems);
    if(sync) cloudSyncTasksSoon();
  }
  return changed;
}
applyBasementStyleUpdate();
function saveDecor(){Store.write("wil-decor",decorItems);cloudSyncTasksSoon();if(typeof refreshDecorRooms==="function")refreshDecorRooms();}
function decorMoney(n){return "$"+Number(n||0).toLocaleString(undefined,{maximumFractionDigits:2})}
function renderDecor(){
  const active=decorItems.filter(i=>!i.disabled && !i.purchased_at), bought=decorItems.filter(i=>!i.disabled && i.purchased_at), removed=decorItems.filter(i=>i.disabled);
  const planned=active.reduce((s,i)=>s+Number(i.target||0),0), spent=bought.reduce((s,i)=>s+Number(i.actual||0),0);
  const visibleTotal=active.length+bought.length;
  const pct=visibleTotal?Math.round(bought.length/visibleTotal*100):0;
  $("#decorSummary").innerHTML=`<div class="decor-summary"><div class="decor-stat"><b>${active.length}</b><span>Still needed</span></div><div class="decor-stat"><b>${decorMoney(planned)}</b><span>Targets left</span></div><div class="decor-stat"><b>${decorMoney(spent)}</b><span>Spent</span></div></div><div class="decor-progress"><span style="width:${pct}%"></span></div>`;
  const room=$("#decorRoom").value||"all", q=$("#decorSearch").value.toLowerCase().trim();
  const filtered=active.filter(i=>(room==="all"||i.room===room)&&(!q||(i.name+" "+i.style+" "+i.room).toLowerCase().includes(q)));
  const rooms=[...new Set(filtered.map(i=>i.room))];
  const autoOpen=!!q || room!=="all";
  $("#decorList").innerHTML=filtered.length?rooms.map(roomName=>`<details class="sleek-disclosure shopping-room" ${autoOpen?"open":""}>
    <summary><span>${esc(roomName)}</span><span class="summary-meta">${filtered.filter(i=>i.room===roomName).length} item${filtered.filter(i=>i.room===roomName).length===1?"":"s"}</span></summary>
    <div class="disclosure-body decor-grid">${filtered.filter(i=>i.room===roomName).map(i=>`<article class="decor-card compact-shop">
      ${i.room==="Basement TV Room"?`<div class="basement-shop-visual"><div class="basement-swatches"><i></i><i></i><i></i><i></i><i></i><i></i></div><span>Basement palette</span></div>`:(i.image?`<a href="${i.image}" target="_blank"><img src="${i.image}" alt="${esc(i.name)} reference"></a>`:"")}
      <div><h3>${esc(i.name)}</h3><p>${esc(i.style)}</p><div class="decor-price">${Number(i.target||0)>0?`Target ${decorMoney(i.target)}`:"Budget TBD"}</div><div class="decor-card-actions"><button data-decor-edit="${i.id}">Edit</button><button class="bought" data-decor-bought="${i.id}">Bought ✓</button></div></div>
    </article>`).join("")}</div>
  </details>`).join(""):`<div class="decor-empty">No active items match this view.</div>`;
  $("#decorHistoryTitle").textContent=`Purchased items (${bought.length})`;
  $("#decorPurchased").innerHTML=bought.map(i=>`<div class="decor-history-row">${i.image?`<img src="${i.image}" alt="">`:""}<span><b>${esc(i.name)}</b><br>${esc(i.room)}${i.actual?` · ${decorMoney(i.actual)}`:""}</span><button data-decor-restore="${i.id}">Restore</button></div>`).join("")+
    (removed.length?`<details class="removed-tasks"><summary>Removed items (${removed.length})</summary><div class="removed-task-list">${removed.map(i=>`<div class="removed-task-row"><span>${esc(i.name)}</span><button data-decor-unremove="${i.id}">Restore</button></div>`).join("")}</div></details>`:"");
  const tab=$("#decorTab"); tab.hidden=false;
}
function openDecorForm(item){
  const isNew=!item;
  item=item||{id:Store.uid(),room:"General",name:"",target:0,style:"",image:"",actual:null,store:"",link:"",status:"Looking",purchased_at:null};
  openForm({
    title:isNew?"Add home purchase":`Edit ${item.name}`,
    fields:[
      {key:"name",label:"Item",type:"text",value:item.name||""},
      {key:"room",label:"Room",type:"text",value:item.room||""},
      {key:"target",label:"Target budget",type:"number",value:item.target||""},
      {key:"style",label:"Style / notes",type:"textarea",value:item.style||""},
      {key:"actual",label:"Actual price paid",type:"number",value:item.actual||""},
      {key:"store",label:"Store",type:"text",value:item.store||""},
      {key:"link",label:"Product link",type:"text",value:item.link||""},
      {key:"status",label:"Shopping status",type:"text",value:item.status||"Looking"}
    ],
    onSave(v){
      if(!v.name.trim()) return;
      item.name=v.name.trim();
      item.room=v.room.trim()||item.room;
      item.target=v.target?Number(v.target):0;
      item.style=v.style.trim();
      item.actual=v.actual?Number(v.actual):null;
      item.store=v.store.trim();
      item.link=v.link.trim();
      item.status=v.status.trim()||"Looking";
      item.disabled=false;
      if(isNew) decorItems.push(item);
      saveDecor();renderDecor();toast(isNew?"Home purchase added":"Home purchase updated");
    },
    onDelete:isNew?null:()=>{
      item.disabled=true;
      saveDecor();renderDecor();toast("Home purchase removed");
    }
  });
}
$("#view-decor").addEventListener("click",e=>{
  if(e.target.id==="addDecorBtn"){openDecorForm(null);return;}
  const edit=e.target.closest("[data-decor-edit]");if(edit){openDecorForm(decorItems.find(i=>i.id===edit.dataset.decorEdit));return;}
  const buy=e.target.closest("[data-decor-bought]");if(buy){const i=decorItems.find(x=>x.id===buy.dataset.decorBought);i.purchased_at=todayISO();i.status="Bought";saveDecor();renderDecor();toast(`${i.name} purchased`);return;}
  const restore=e.target.closest("[data-decor-restore]");if(restore){const i=decorItems.find(x=>x.id===restore.dataset.decorRestore);i.purchased_at=null;i.status="Looking";saveDecor();renderDecor();toast(`${i.name} restored`);return;}
  const unremove=e.target.closest("[data-decor-unremove]");if(unremove){const i=decorItems.find(x=>x.id===unremove.dataset.decorUnremove);i.disabled=false;saveDecor();renderDecor();toast(`${i.name} restored`);}
});
$("#decorSearch").addEventListener("input",renderDecor);$("#decorRoom").addEventListener("change",renderDecor);
function refreshDecorRooms(){
  const select=$("#decorRoom");
  const current=select.value||"all";
  [...select.options].slice(1).forEach(o=>o.remove());
  [...new Set(decorItems.filter(i=>!i.disabled).map(i=>i.room).filter(Boolean))].sort().forEach(r=>select.add(new Option(r,r)));
  select.value=[...select.options].some(o=>o.value===current)?current:"all";
}
refreshDecorRooms();
