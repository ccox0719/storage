/* ==================================================================
   SEASONAL OUTDOOR CARE
   ================================================================== */
const SEASONAL_SECTIONS = [
  {key:"pool", icon:"waves", name:"Pool",
   winter:["Check cover after heavy snow or wind","Keep standing water managed per cover type"],
   spring:["Document owner startup process before changing equipment","Remove & clean winter cover when appropriate","Inspect pump, filter, heater and plumbing before startup"],
   summer:["Check water chemistry and equipment","Empty baskets / skimmer as needed","Inspect cover and pool gear storage"],
   fall:["Owner walkthrough pending: document exact pool-closing process","Photograph valves, pump, filter and heater positions","Remove & store pool toys / loose accessories","Install winter cover per owner walkthrough"]},
  {key:"kitchen", icon:"utensils", name:"Outdoor kitchen",
   winter:["Keep water-connected components winterized","Check covers after storms"],
   spring:["Reconnect water only after freeze risk passes","Inspect sink, fridge and ice maker","Clean grill and test burners"],
   summer:["Clean grill and grease areas","Wipe fridge / ice maker and check drainage"],
   fall:["Deep clean grill & grates","Winterize sink and ice maker per manufacturer instructions","Empty & clean outdoor fridge if shutting down","Cover / protect appliances as needed"]},
  {key:"fountain", icon:"droplet", name:"Small fountain",
   winter:["Keep basin free of standing water that can freeze"],
   spring:["Inspect for freeze damage","Reinstall pump","Refill and test"],
   summer:["Top off water","Clean debris and check pump flow"],
   fall:["Drain completely before hard freeze","Clean basin and pump","Remove / protect pump","Do not leave standing water"]},
  {key:"deck", icon:"broom", name:"Deck & patio",
   winter:["Keep drains and walkways clear"],
   spring:["Sweep / wash surfaces","Inspect boards, railings and drainage"],
   summer:["Clear debris and check high-traffic areas"],
   fall:["Clear leaves and debris","Inspect for standing water","Clean before winter"]},
  {key:"furniture", icon:"chair", name:"Furniture & decor",
   winter:["Keep stored cushions dry","Check covers after storms"],
   spring:["Bring furniture back out","Inspect and wipe down pieces","Set up cushions and decor"],
   summer:["Clean as needed","Dry cushions after storms"],
   fall:["Clean and fully dry furniture","Store cushions indoors / dry storage","Move delicate decor and freeze-sensitive planters"]},
  {key:"turf", icon:"leaf", name:"Artificial turf & beds",
   winter:["Keep heavy debris from accumulating on turf"],
   spring:["Remove winter debris","Brush matted turf","Check drainage","Clean perennial beds"],
   summer:["Remove debris","Brush high-traffic areas as needed","Check drainage after heavy rain"],
   fall:["Remove leaves and debris from turf","Brush matted areas","Keep drainage openings clear","Clean garden tools","Drain and store hoses","Clean fallen rose leaves"]},
  {key:"hvac", icon:"gear", name:"HVAC / air conditioner",
   winter:["Keep outdoor unit clear of heavy debris while leaving manufacturer-required clearance"],
   spring:["Schedule AC inspection / service if due","Clear leaves and debris around outdoor unit"],
   summer:["Keep outdoor unit unobstructed"],
   fall:["Schedule furnace / HVAC service","Clear debris around outdoor unit"]}
]
function seasonalSeed(){
  const out = [];
  SEASONAL_SECTIONS.forEach(sec=>{
    ["winter","spring","summer","fall"].forEach(season=>{
      (sec[season]||[]).forEach((title,idx)=>out.push({id:`${sec.key}-${season}-${idx}`, section:sec.key, season, title, done_year:null}));
    });
  });
  return out;
}
let seasonalItems = Store.read("wil-seasonal", null) || seasonalSeed();
mergeNewSeedItems(seasonalItems, seasonalSeed(), saveSeasonal);
function saveSeasonal(){ Store.write("wil-seasonal", seasonalItems); cloudSyncSeasonalSoon(); }
const seasonalOpen = new Set();

function currentSeason(){
  const m = new Date().getMonth()+1;
  if([12,1,2].includes(m)) return "winter";
  if([3,4,5].includes(m)) return "spring";
  if([6,7,8].includes(m)) return "summer";
  return "fall";
}
function renderSeasonal(){
  const year = new Date().getFullYear();
  const active = currentSeason();
  const activeItems = seasonalItems.filter(i=>i.season===active);
  const activeDone = activeItems.filter(i=>i.done_year===year).length;
  $("#seasonalNow").innerHTML = `<div class="season-now">
    <div class="eyebrow">${active} · right now</div>
    <h3>${activeDone===activeItems.length && activeItems.length ? "This season is caught up" : `${activeItems.length-activeDone} seasonal tasks left`}</h3>
    <p>Start with the areas below that still have unchecked ${active} items.</p>
  </div>`;

  const seasonOrder = [active, ...["winter","spring","summer","fall"].filter(x=>x!==active)];
  $("#seasonalList").innerHTML = SEASONAL_SECTIONS.map(sec=>{
    const items = seasonalItems.filter(i=>i.section===sec.key);
    const done = items.filter(i=>i.done_year===year).length;
    const hasOpenActive = items.some(i=>i.season===active && i.done_year!==year);
    const open = seasonalOpen.has(sec.key) || hasOpenActive;
    const group = (season,label)=>{
      const list = items.filter(i=>i.season===season);
      if(!list.length) return "";
      return `<p class="ssn-sub">${label}</p><ul class="check-list">${list.map(i=>`
        <li><label class="check-row ${i.done_year===year?"checked":""}">
          <input type="checkbox" data-ssn-id="${i.id}" ${i.done_year===year?"checked":""}>
          <span data-ssn-edit="${i.id}">${esc(i.title)}</span>
        </label></li>`).join("")}</ul>
        <button type="button" class="add-row" style="margin-top:4px" data-ssn-add="${sec.key}|${season}">+ Add task</button>`;
    };
    return `<div class="ssn-card" data-expanded="${open}" data-sec="${sec.key}">
      <button type="button" class="ssn-head" data-ssn-toggle="${sec.key}">
        <span class="ti">${icon(sec.icon)}</span>
        <b>${sec.name}</b>
        <span class="ssn-progress">${done}/${items.length}</span>
        <span class="chev" aria-hidden="true">›</span>
      </button>
      <div class="ssn-body" ${open?"":"hidden"}>
        ${seasonOrder.map(season=>group(season,season[0].toUpperCase()+season.slice(1))).join("")}
      </div>
    </div>`;
  }).join("");
}
$("#view-seasonal").addEventListener("click", e=>{
  const toggle = e.target.closest("[data-ssn-toggle]");
  if(toggle){
    const key = toggle.dataset.ssnToggle;
    seasonalOpen.has(key) ? seasonalOpen.delete(key) : seasonalOpen.add(key);
    renderSeasonal();
    return;
  }
  const editSpan = e.target.closest("[data-ssn-edit]");
  if(editSpan){ openSeasonalItemForm(seasonalItems.find(i=>i.id===editSpan.dataset.ssnEdit)); return; }
  const add = e.target.closest("[data-ssn-add]");
  if(add){
    const [section,season] = add.dataset.ssnAdd.split("|");
    openSeasonalAddForm(section, season);
  }
});
$("#view-seasonal").addEventListener("change", e=>{
  const cb = e.target.closest("[data-ssn-id]");
  if(!cb) return;
  const item = seasonalItems.find(i=>i.id===cb.dataset.ssnId);
  const year = new Date().getFullYear();
  item.done_year = cb.checked ? year : null;
  saveSeasonal(); renderSeasonal();
});
function openSeasonalItemForm(item){
  openForm({
    title: "Edit task",
    fields: [{key:"title", label:"Task", type:"text", value:item.title}],
    onSave(v){
      if(!v.title.trim()) return;
      item.title = v.title.trim();
      saveSeasonal(); renderSeasonal();
      toast("Task updated");
    },
    onDelete(){
      seasonalItems = seasonalItems.filter(i=>i.id!==item.id);
      saveSeasonal(); renderSeasonal();
      toast("Task deleted");
    }
  });
}
function openSeasonalAddForm(section, season){
  openForm({
    title: `Add ${season} task`,
    fields: [{key:"title", label:"Task", type:"text", value:""}],
    onSave(v){
      if(!v.title.trim()) return;
      seasonalItems.push({id:Store.uid(), section, season, title:v.title.trim(), done_year:null});
      saveSeasonal();
      seasonalOpen.add(section);
      renderSeasonal();
      toast("Task added");
    },
    onDelete: null
  });
}
