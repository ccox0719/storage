/* ==================================================================
   SEASONAL OUTDOOR CARE
   ================================================================== */
const SEASONAL_SECTIONS = [
  {key:"pool", icon:"waves", name:"Pool",
   winter:[
     "Check the mesh cover after heavy snow, wind, or debris buildup.",
     "Keep standing water managed as appropriate for the mesh cover."
   ],
   spring:[
     "Remove and clean the mesh winter cover.",
     "Remove winter plugs and the skimmer freeze-protection bottle.",
     "Reinstall the two return jets / nozzles.",
     "Fill pool to the normal skimmer operating line.",
     "Reconnect PVC and lubricate O-rings / gaskets with Magic Lube.",
     "Start the pump and inspect the system for leaks.",
     "Take the Oxygen Pools system information to the Grimes pool store for current startup dosing.",
     "Circulate startup chemistry, then vacuum settled debris to WASTE if needed and refill lost water."
   ],
   summer:[
     "Check water chemistry and equipment operation.",
     "Empty baskets / skimmer as needed.",
     "Keep pool gear and accessories organized in O3 / O4."
   ],
   fall:[
     "Finish final swim, skim / brush / vacuum, and balance water for closing.",
     "Lower pool water to the established winter closing level.",
     "Turn pump OFF before changing the sand-filter multiport dial.",
     "Remove the two return jet / nozzle fittings while holding the couplers steady.",
     "Use the shop vac to vacuum the pool return PVC lines clear of water. Do not use the irrigation air-compressor step here.",
     "Install the correct expandable winter plugs in the return / skimmer openings.",
     "Pour pink RV / pool antifreeze into the return-line openings until it appears at the paired opening, then plug both ends. Brian estimated roughly 7–8 gallons for the two return lines.",
     "Winterize the heater loop by pouring pink RV / pool antifreeze into one heater-side opening until it appears at the other, then plug both sides.",
     "Turn the heater OFF and close the gas shutoff for winter.",
     "Drain the pump completely by removing the two pump drain plugs; leave the pump dry.",
     "Place a capped plastic soda bottle about half-full of antifreeze in the skimmer for freeze protection.",
     "Set the sand-filter multiport dial to Winterize after the pool lines are drained and protected.",
     "Install the mesh winter cover."
   ]},
  {key:"kitchen", icon:"utensils", name:"Outdoor kitchen & water",
   winter:[
     "Keep the exterior water system shut down through freezing weather.",
     "Check appliance covers and the outdoor kitchen area after storms."
   ],
   spring:[
     "Reconnect the outdoor ice-maker water-supply line and garden-hose drain line after freeze risk passes.",
     "Tighten the drain-hose clamp.",
     "Reopen the two basement shutoff valves serving the outdoor water system.",
     "Check the sink, ice maker, and connections for leaks.",
     "Replace the exterior water / ice-maker filter when due."
   ],
   summer:[
     "Clean grill and grease areas.",
     "Wipe the outdoor fridge / ice maker and check drainage."
   ],
   fall:[
     "Shut off the two basement valves serving the outdoor sink / ice-maker water line.",
     "Open and drain the exterior water lines so trapped water is removed.",
     "Disconnect outdoor ice-maker power.",
     "Disconnect the ice-maker water-supply line and garden-hose drain line.",
     "Cover / tape the exposed water-line opening so dirt cannot enter.",
     "Move the outdoor ice maker into the garage.",
     "Leave the outdoor refrigerator and grills in place.",
     "Note the exterior water / ice-maker filter for spring replacement if due."
   ]},
  {key:"fountain", icon:"droplet", name:"Small fountain",
   winter:["Keep the fountain dry and protected from freeze damage."],
   spring:[
     "Inspect the fountain bowl / components for freeze damage.",
     "Replace the noted fountain O-ring if needed.",
     "Reinstall the pump / filter components.",
     "Refill and test the fountain."
   ],
   summer:[
     "Top off water as needed.",
     "Clean debris and check pump flow.",
     "Use only a small label-directed amount of algaecide when needed."
   ],
   fall:[
     "Vacuum / drain all remaining water from the fountain bowl and drainage pocket.",
     "Remove the fountain pump / filter components.",
     "Rinse or wipe fountain parts and store loose pieces in the shed / pool storage.",
     "Bring the freeze-sensitive fountain bowl / component indoors if applicable."
   ]},
  {key:"hot-tub", icon:"droplet", name:"Hot tub",
   winter:[
     "Top off the hot tub with the nearby hose when needed.",
     "Always disconnect the hose from the spigot after winter use so trapped water cannot freeze."
   ],
   spring:[],
   summer:[],
   fall:[]},
  {key:"irrigation", icon:"droplet", name:"Irrigation / drip lines",
   winter:["Leave the irrigation / drip water supply shut off through freezing weather."],
   spring:["Reconnect / reopen the irrigation and drip system after freeze risk passes and inspect for leaks."],
   summer:["Check drip lines and emitters for clogs, leaks, or disconnected lines."],
   fall:[
     "Shut off water to the outdoor drip / irrigation system.",
     "Connect the compressor adapter and blow the irrigation / drip lines clear."
   ]},
  {key:"deck", icon:"broom", name:"Deck & patio",
   winter:["Keep drains and walkways clear."],
   spring:["Sweep / wash surfaces.","Inspect boards, railings, and drainage."],
   summer:["Clear debris and check high-traffic areas."],
   fall:["Clear leaves and debris.","Inspect for standing water.","Clean before winter."]},
  {key:"furniture", icon:"chair", name:"Furniture & decor",
   winter:["Keep stored cushions dry.","Check covers after storms."],
   spring:["Bring furniture back out.","Inspect and wipe down pieces.","Set up cushions and decor."],
   summer:["Clean as needed.","Dry cushions after storms."],
   fall:[
     "Bring patio cushions into the garage / shed.",
     "Roll up and store outdoor rugs.",
     "Store loose pool / fountain accessories and seasonal parts.",
     "Let the annuals die back for winter and clear them when convenient."
   ]},
  {key:"garage", icon:"wrench", name:"Garage",
   winter:["Keep the garage floor drains clear through freeze season."],
   spring:["Inspect garage drains and clean out winter debris."],
   summer:[],
   fall:[
     "Confirm the garage floor drains are clear before freeze season.",
     "Keep the attic pull-down access and winter storage path clear."
   ]},
  {key:"turf", icon:"leaf", name:"Artificial turf & beds",
   winter:["Keep heavy debris from accumulating on turf."],
   spring:["Remove winter debris.","Brush matted turf.","Check drainage.","Clean perennial beds."],
   summer:["Remove debris.","Brush high-traffic areas as needed.","Check drainage after heavy rain."],
   fall:["Remove leaves and debris from turf.","Brush matted areas.","Keep drainage openings clear.","Clean garden tools.","Drain and store hoses."]},
  {key:"hvac", icon:"gear", name:"HVAC / air conditioner",
   winter:["Keep the outdoor unit clear of heavy debris while maintaining required clearance."],
   spring:["Clear leaves and debris around the outdoor unit."],
   summer:["Keep the outdoor unit unobstructed."],
   fall:["Clear debris around the outdoor unit."]}
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
function saveSeasonal(){ Store.write("wil-seasonal", seasonalItems); cloudSyncSeasonalSoon(); cloudSyncTasksSoon(); }
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
  const activeItems = seasonalItems.filter(i=>!i.disabled && i.season===active);
  const activeDone = activeItems.filter(i=>i.done_year===year).length;
  $("#seasonalNow").innerHTML = `<div class="season-now compact-overview">
    <div class="eyebrow">${active} · right now</div>
    <h3>${activeDone===activeItems.length && activeItems.length ? "This season is caught up" : `${activeItems.length-activeDone} seasonal tasks left`}</h3>
    <p>Open an area when you are ready to work on it. Everything else stays tucked away.</p>
  </div>`;

  const otherSeasons=["winter","spring","summer","fall"].filter(x=>x!==active);
  const removedItems=seasonalItems.filter(i=>i.disabled);
  $("#seasonalList").innerHTML = SEASONAL_SECTIONS.map(sec=>{
    const items = seasonalItems.filter(i=>!i.disabled && i.section===sec.key);
    const current = items.filter(i=>i.season===active);
    const currentDone = current.filter(i=>i.done_year===year).length;
    const open = seasonalOpen.has(sec.key);
    const group = (season,label)=>{
      const list = items.filter(i=>i.season===season);
      if(!list.length) return "";
      return `<p class="ssn-sub">${label}</p><ul class="check-list">${list.map(i=>`
        <li><label class="check-row ${i.done_year===year?"checked":""}">
          <input type="checkbox" data-ssn-id="${i.id}" ${i.done_year===year?"checked":""}>
          <span data-ssn-edit="${i.id}">${esc(i.title)}</span>
        </label></li>`).join("")}</ul>
        <button type="button" class="add-row subtle-add" data-ssn-add="${sec.key}|${season}">+ Add task</button>`;
    };
    const future = otherSeasons.map(season=>{
      const list=items.filter(i=>i.season===season);
      if(!list.length) return "";
      const label=season[0].toUpperCase()+season.slice(1);
      return `<details class="season-disclosure"><summary>${label}<span>${list.length}</span></summary><div class="season-disclosure-body">${group(season,label)}</div></details>`;
    }).join("");
    return `<div class="ssn-card" data-expanded="${open}" data-sec="${sec.key}">
      <button type="button" class="ssn-head" data-ssn-toggle="${sec.key}">
        <span class="ti">${icon(sec.icon)}</span>
        <span class="ssn-title"><b>${sec.name}</b><small>${current.length ? `${current.length-currentDone} left this ${active}` : `No ${active} tasks`}</small></span>
        <span class="ssn-progress">${currentDone}/${current.length}</span>
        <span class="chev" aria-hidden="true">›</span>
      </button>
      <div class="ssn-body" ${open?"":"hidden"}>
        ${current.length ? group(active,"This "+active) : `<p class="hint">Nothing scheduled here for ${active}.</p>`}
        ${future ? `<div class="future-seasons"><div class="future-label">Other seasons</div>${future}</div>` : ""}
      </div>
    </div>`;
  }).join("") + (removedItems.length ? `<details class="removed-tasks"><summary>Removed seasonal tasks (${removedItems.length})</summary><div class="removed-task-list">${removedItems.map(x=>`<div class="removed-task-row"><span>${esc(x.title)}</span><button type="button" data-restore-seasonal="${x.id}">Restore</button></div>`).join("")}</div></details>` : "");
}
$("#view-seasonal").addEventListener("click", e=>{
  const restore=e.target.closest("[data-restore-seasonal]");
  if(restore){
    const item=seasonalItems.find(i=>i.id===restore.dataset.restoreSeasonal);
    if(item){item.disabled=false;saveSeasonal();renderSeasonal();toast("Seasonal task restored");}
    return;
  }
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
  if(!item){ cb.checked=!cb.checked; toast("Could not update that task. Refresh and try again."); return; }
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
      item.disabled=true;
      item.done_year=null;
      saveSeasonal(); renderSeasonal();
      toast("Seasonal task removed");
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
