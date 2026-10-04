/* ==================================================================
   PLANTS
   ================================================================== */
const PLANTS_SEED = [
  {id:"ash-tree", name:"Ash tree", location:"Yard · established ash tree", fall_task:"Apply emerald ash borer treatment if due (2-year cycle)", spring_task:"Inspect for borer damage; water deeply if dry", notes:"Treated 2025 — retreat every 2 years.", treatment_cycle_years:2, last_treated_year:2025},
  {id:"rose-shrub", name:"Rose shrub", location:"By shed", fall_task:"Remove dead/diseased/rubbing growth and fallen leaves; avoid heavy fall pruning", spring_task:"Prune dead/damaged canes; fertilize as new growth starts", notes:"Watch for black spot and aphids in summer.", treatment_cycle_years:null, last_treated_year:null},
  {id:"hostas", name:"Hostas", location:"Pool / patio beds", fall_task:"Cut back foliage after first frost", spring_task:"Remove winter mulch as shoots emerge; divide if crowded", notes:"Shade-loving; watch for slug damage.", treatment_cycle_years:null, last_treated_year:null},
  {id:"daylilies", name:"Daylilies", location:"Fountain / patio bed", fall_task:"Cut back foliage after it yellows", spring_task:"Remove old foliage; divide crowded clumps", notes:"Low-maintenance perennial.", treatment_cycle_years:null, last_treated_year:null},
  {id:"cannas", name:"Cannas", location:"Raised fence bed", fall_task:"After first frost, cut back & dig up rhizomes for winter storage", spring_task:"Replant rhizomes after last frost", notes:"Not reliably hardy in Iowa winters — store rhizomes cool & dry.", treatment_cycle_years:null, last_treated_year:null},
  {id:"hanging-fern", name:"Hanging fern", location:"Covered patio", fall_task:"Bring indoors before first frost, or treat as annual", spring_task:"Set back outside after last frost; keep soil consistently moist", notes:"Not cold-hardy.", treatment_cycle_years:null, last_treated_year:null},
  {id:"mandevilla", name:"Mandevilla", location:"Large blue deck planter", fall_task:"Bring indoors before first frost or take cuttings; cut back if overwintering", spring_task:"Move back outside after last frost; provide a trellis", notes:"Tropical vine — not cold hardy.", treatment_cycle_years:null, last_treated_year:null},
  {id:"cordyline", name:"Cordyline / Ti plant", location:"Large blue deck planter", fall_task:"Bring indoors before first frost", spring_task:"Move back outside after last frost", notes:"Not cold hardy in Iowa; overwinter indoors.", treatment_cycle_years:null, last_treated_year:null},
  {id:"asparagus-fern", name:"Asparagus fern", location:"Large blue deck planter", fall_task:"Bring indoors before first frost, or treat as annual", spring_task:"Move back outside after last frost", notes:"Not cold hardy.", treatment_cycle_years:null, last_treated_year:null},
  {id:"variegated-trailing", name:"Variegated trailing plant", location:"Large blue deck planter", fall_task:"Bring indoors before first frost if tender", spring_task:"Move back outside after last frost", notes:"Confirm exact variety to fine-tune care.", treatment_cycle_years:null, last_treated_year:null},
  {id:"coral-bells", name:"Coral bells", location:"Perennial beds", fall_task:"Cut back damaged foliage after frost; mulch lightly", spring_task:"Remove winter mulch; divide if crowded", notes:"Semi-evergreen; generally hardy in Iowa.", treatment_cycle_years:null, last_treated_year:null},
  {id:"flowering-annuals", name:"Flowering annuals", location:"Planters / beds", fall_task:"Pull and compost after first frost", spring_task:"Plant new annuals after last frost date", notes:"Replace each year.", treatment_cycle_years:null, last_treated_year:null},
  {id:"unidentified", name:"Other unidentified plants", location:"", fall_task:"Identify before first frost to determine winter care", spring_task:"Monitor as it emerges and update this entry", notes:"Take a photo to help identify.", treatment_cycle_years:null, last_treated_year:null}
];
let plants = Store.read("wil-plants", null) || PLANTS_SEED;
mergeNewSeedItems(plants, PLANTS_SEED, savePlants);
function savePlants(){ Store.write("wil-plants", plants); cloudSyncPlantsSoon(); }

function plantCycleBadge(p){
  if(!p.treatment_cycle_years || !p.last_treated_year) return "";
  const year = new Date().getFullYear();
  const due = p.last_treated_year + p.treatment_cycle_years;
  let cls = "ok", label = `Next: ${due}`;
  if(year > due){ cls="overdue"; label=`Overdue (was ${due})`; }
  else if(year === due){ cls="soon"; label=`Due this year (${due})`; }
  return `<span class="badge ${cls}" style="margin-top:6px;display:inline-block">${label}</span>`;
}
function plantNextAction(p){
  const season = currentSeason();
  if(season==="fall" && p.fall_task) return p.fall_task;
  if(season==="spring" && p.spring_task) return p.spring_task;
  if(p.treatment_cycle_years && p.last_treated_year){
    const due = p.last_treated_year + p.treatment_cycle_years;
    return `Next scheduled treatment: ${due}`;
  }
  return season==="winter" ? "Monitor through winter" : "Monitor and water as needed";
}
function renderPlants(){
  const activePlants=plants.filter(p=>!p.disabled);
  const removedPlants=plants.filter(p=>p.disabled);
  const groups = {};
  activePlants.forEach(p=>{
    const loc = p.location || "Location not set";
    (groups[loc] ||= []).push(p);
  });
  const urgent = activePlants.filter(p=>currentSeason()==="fall" && /bring indoors|dig up|first frost/i.test(p.fall_task||"")).length;
  $("#plantsSummary").innerHTML = `<div class="quiet-note"><span>♧</span><b>${urgent} frost-sensitive</b><small>${urgent ? "Open the affected area when you are ready." : "No urgent plant care right now."}</small></div>`;
  $("#plantsList").innerHTML = Object.entries(groups).map(([loc,list])=>{
    const urgentHere=list.filter(p=>currentSeason()==="fall" && /bring indoors|dig up|first frost/i.test(p.fall_task||"")).length;
    return `<details class="sleek-disclosure plant-group">
      <summary><span>${esc(loc)}</span><span class="summary-meta">${list.length} plant${list.length===1?"":"s"}${urgentHere?` · ${urgentHere} needs attention`:""}</span></summary>
      <div class="disclosure-body">
        ${list.map(p=>`
          <button type="button" class="plant-card compact-plant" data-edit-plant="${p.id}">
            <span><b>${esc(p.name)}</b><small>${esc(plantNextAction(p))}</small></span>
            ${plantCycleBadge(p)}
            <span class="home-arrow">›</span>
          </button>`).join("")}
      </div>
    </details>`;
  }).join("") + (removedPlants.length ? `<details class="removed-tasks"><summary>Removed plants (${removedPlants.length})</summary><div class="removed-task-list">${removedPlants.map(x=>`<div class="removed-task-row"><span>${esc(x.name)}</span><button type="button" data-restore-plant="${x.id}">Restore</button></div>`).join("")}</div></details>` : "");
}
$("#view-plants").addEventListener("click", e=>{
  const restore=e.target.closest("[data-restore-plant]");
  if(restore){
    const p=plants.find(x=>x.id===restore.dataset.restorePlant);
    if(p){p.disabled=false;savePlants();renderPlants();toast(`Restored “${p.name}”`);}
    return;
  }
  const card = e.target.closest("[data-edit-plant]");
  if(card) openPlantForm(plants.find(p=>p.id===card.dataset.editPlant));
});
$("#addPlantBtn").addEventListener("click", ()=>openPlantForm(null));

function openPlantForm(p){
  openForm({
    title: p ? "Edit plant" : "Add plant",
    fields: [
      {key:"name", label:"Name", type:"text", value:p?p.name:""},
      {key:"location", label:"Location", type:"text", value:p?p.location:""},
      {key:"fall_task", label:"Fall task", type:"textarea", value:p?p.fall_task:""},
      {key:"spring_task", label:"Spring task", type:"textarea", value:p?p.spring_task:""},
      {key:"notes", label:"Notes", type:"textarea", value:p?p.notes:""},
      {key:"treatment_cycle_years", label:"Treatment cycle (years, optional)", type:"number", value:p&&p.treatment_cycle_years?p.treatment_cycle_years:""},
      {key:"last_treated_year", label:"Last treated (year, optional)", type:"number", value:p&&p.last_treated_year?p.last_treated_year:""}
    ],
    onSave(v){
      if(!v.name.trim()) return;
      const rec = {
        name:v.name.trim(), location:v.location.trim(), fall_task:v.fall_task.trim(),
        spring_task:v.spring_task.trim(), notes:v.notes.trim(),
        treatment_cycle_years: v.treatment_cycle_years ? Number(v.treatment_cycle_years) : null,
        last_treated_year: v.last_treated_year ? Number(v.last_treated_year) : null
      };
      if(p) Object.assign(p, rec);
      else plants.push({id:Store.uid(), ...rec});
      savePlants(); renderPlants();
      toast(p ? "Plant updated" : "Plant added");
    },
    onDelete: p ? ()=>{
      p.disabled=true;
      savePlants(); renderPlants();
      toast("Plant removed");
    } : null
  });
}
