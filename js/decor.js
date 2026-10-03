/* ==================================================================
   DECOR SHOPPING · temporary until the house is furnished
   ================================================================== */
const DECOR_RAW = [
["Living Room","6' faux olive tree",40,"Natural trunk, airy leaves, woven basket"],["Living Room","9×12 rug",175,"Cream/taupe vintage pattern with muted rust or sage"],["Living Room","Coffee table",150,"48–54 in. warm oak/walnut, simple lines"],["Living Room","End table #1",60,"Round wood top with black metal base"],["Living Room","End table #2",60,"Coordinate with first end table"],["Living Room","Lamp #1",35,"Cream ceramic base with linen shade"],["Living Room","Lamp #2",35,"Coordinate with first lamp"],["Living Room","Pillows + throw",75,"Olive, muted rust and cream textures"],
["Dining Room","Tall faux grass/tree #1",30,"Slim natural-looking faux olive-style plant"],["Dining Room","Tall faux grass/tree #2",30,"Matching or coordinating plant"],["Dining Room","8×10 rug",125,"Cream/taupe low-contrast vintage pattern"],["Dining Room","Buffet",200,"Warm wood, black hardware, about 48–60 in."],["Dining Room","Centerpiece / decor",50,"Tray, greenery and black candleholders"],
["Entry","Console",120,"Warm wood, 42–60 in. wide"],["Entry","Mirror",60,"Round or softly arched, black or aged brass"],["Entry","Lamp",35,"Cream ceramic or stone-look base"],["Entry","Plant + basket",50,"Olive/eucalyptus with woven basket"],["Entry","Runner",60,"Muted vintage cream/taupe/rust"],
["Primary Bedroom","8×10 or 9×12 rug",175,"Cream / blue-gray vintage pattern"],["Primary Bedroom","Lamp #1",35,"Stone or ceramic base, linen shade"],["Primary Bedroom","Lamp #2",35,"Coordinate with lamp #1"],["Primary Bedroom","Bench",100,"Wood + cream upholstered seat"],["Primary Bedroom","Tall plant",40,"Olive tree or soft green foliage"],["Primary Bedroom","Art",60,"Muted landscape or abstract"],
["Elsie’s Room","5×7 or 6×9 rug",80,"Cream with soft floral pink/blue accents"],["Elsie’s Room","Small lamp",25,"Cream base and warm linen shade"],
["Boys’ Room","Shared nightstand",60,"Warm wood with simple drawer"],["Boys’ Room","Under-bed storage #1",25,"Low-profile woven bin or drawer"],["Boys’ Room","Under-bed storage #2",25,"Matching bin or drawer"],["Boys’ Room","Twin bed #1",200,"Simple wood frame with storage"],["Boys’ Room","Twin bed #2",200,"Match bed #1"],
["Game Room","Shelf greenery #1",10,"Small pothos in cream stone pot"],["Game Room","Shelf greenery #2",10,"Eucalyptus in white ceramic pot"],["Game Room","Shelf greenery #3",10,"Small trailing plant"],["Game Room","Basket/bin #1",20,"Woven storage basket"],["Game Room","Basket/bin #2",20,"Coordinating woven storage bin"],["Game Room","Bar stool #1",60,"Brown faux leather + black metal"],["Game Room","Bar stool #2",60,"Match stool #1"],["Game Room","Bar stool #3",60,"Match stool #1"],["Game Room","Bar stool #4",60,"Match stool #1"],
["Basement TV Room","9×12 rug",175,"Warm vintage cream/rust/taupe pattern"],["Basement TV Room","Coffee table",150,"Warm wood top + black metal base"],["Basement TV Room","End table #1",60,"Round wood/black metal"],["Basement TV Room","End table #2",60,"Coordinate with first"],["Basement TV Room","Lamp #1",35,"Warm textured ceramic base"],["Basement TV Room","Lamp #2",35,"Coordinate with first"]
];
const DECOR_IMAGE_GROUPS=[["living",8],["dining",5],["entry",5],["primary",6],["elsie",2],["boys",5],["game",9],["basement",6]];
const DECOR_IMAGES=DECOR_IMAGE_GROUPS.flatMap(([name,count])=>Array.from({length:count},(_,i)=>`assets/decor/${name}-${i+1}.jpg`));
const DECOR_SEED=DECOR_RAW.map((r,i)=>({id:`d${i+1}`,room:r[0],name:r[1],target:r[2],style:r[3],image:DECOR_IMAGES[i],actual:null,store:"",link:"",status:"Looking",purchased_at:null}));
let decorItems=Store.read("wil-decor",null)||DECOR_SEED.map(x=>({...x}));
mergeNewSeedItems(decorItems,DECOR_SEED,saveDecor);
function saveDecor(){Store.write("wil-decor",decorItems);cloudSyncTasksSoon();}
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
  $("#decorList").innerHTML=filtered.length?rooms.map(roomName=>`<div class="decor-room-h">${esc(roomName)}</div><div class="decor-grid">${filtered.filter(i=>i.room===roomName).map(i=>`<article class="decor-card"><a href="${i.image}" target="_blank"><img src="${i.image}" alt="${esc(i.name)} style reference"></a><div><h3>${esc(i.name)}</h3><p>${esc(i.style)}</p><div class="decor-price">Target ${decorMoney(i.target)}</div><div class="decor-card-actions"><button data-decor-edit="${i.id}">Edit</button><button class="bought" data-decor-bought="${i.id}">Bought ✓</button></div></div></article>`).join("")}</div>`).join(""):`<div class="decor-empty">No active items match this view.</div>`;
  $("#decorHistoryTitle").textContent=`Purchased items (${bought.length})`;
  $("#decorPurchased").innerHTML=bought.map(i=>`<div class="decor-history-row"><img src="${i.image}" alt=""><span><b>${esc(i.name)}</b><br>${esc(i.room)}${i.actual?` · ${decorMoney(i.actual)}`:""}</span><button data-decor-restore="${i.id}">Restore</button></div>`).join("")+
    (removed.length?`<details class="removed-tasks"><summary>Removed decor (${removed.length})</summary><div class="removed-task-list">${removed.map(i=>`<div class="removed-task-row"><span>${esc(i.name)}</span><button data-decor-unremove="${i.id}">Restore</button></div>`).join("")}</div></details>`:"");
  const tab=$("#decorTab"); tab.hidden=active.length===0;
  if(!active.length && !$("#view-decor").hidden) switchTab("storage");
}
function openDecorForm(item){
  openForm({
    title:`Edit ${item.name}`,
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
      saveDecor();renderDecor();toast("Decor item updated");
    },
    onDelete(){
      item.disabled=true;
      saveDecor();renderDecor();toast("Decor item removed");
    }
  });
}
$("#view-decor").addEventListener("click",e=>{
  const edit=e.target.closest("[data-decor-edit]");if(edit){openDecorForm(decorItems.find(i=>i.id===edit.dataset.decorEdit));return;}
  const buy=e.target.closest("[data-decor-bought]");if(buy){const i=decorItems.find(x=>x.id===buy.dataset.decorBought);i.purchased_at=todayISO();i.status="Bought";saveDecor();renderDecor();toast(`${i.name} purchased`);return;}
  const restore=e.target.closest("[data-decor-restore]");if(restore){const i=decorItems.find(x=>x.id===restore.dataset.decorRestore);i.purchased_at=null;i.status="Looking";saveDecor();renderDecor();toast(`${i.name} restored`);return;}
  const unremove=e.target.closest("[data-decor-unremove]");if(unremove){const i=decorItems.find(x=>x.id===unremove.dataset.decorUnremove);i.disabled=false;saveDecor();renderDecor();toast(`${i.name} restored`);}
});
$("#decorSearch").addEventListener("input",renderDecor);$("#decorRoom").addEventListener("change",renderDecor);
const decorRooms=[...new Set(DECOR_SEED.map(i=>i.room))];decorRooms.forEach(r=>$("#decorRoom").add(new Option(r,r)));
