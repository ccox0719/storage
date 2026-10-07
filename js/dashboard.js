/* ==================================================================
   HOME DASHBOARD
   ================================================================== */

let neighbors = Store.read("wil-neighbors", null) || [
  {id:"n1", names:"Jose & Lindsay", relation:"Across the street to the north", notes:"Met after moving in."}
];
function saveNeighbors(){ Store.write("wil-neighbors", neighbors); cloudSyncTasksSoon(); }
function renderNeighbors(){
  const host=$("#homeNeighbors");
  if(!host) return;
  const active=neighbors.filter(n=>!n.disabled);
  host.innerHTML=active.length ? active.map(n=>`<button type="button" class="home-card" data-edit-neighbor="${n.id}">
    <span class="home-card-icon">${icon("home")}</span>
    <span><b>${esc(n.names)}</b><small>${esc(n.relation||"Neighbor")}${n.notes?" · "+esc(n.notes):""}</small></span>
    <span class="home-arrow">›</span>
  </button>`).join("") : `<div class="home-empty"><b>No neighbors saved yet.</b><span>Add names and where they live relative to you.</span></div>`;
}
function openNeighborForm(n){
  const isNew=!n;
  n=n||{id:Store.uid(),names:"",relation:"",notes:""};
  openForm({
    title:isNew?"Add neighbor":"Edit neighbor",
    fields:[
      {key:"names",label:"Name(s)",type:"text",value:n.names||""},
      {key:"relation",label:"Where they live",type:"text",value:n.relation||""},
      {key:"notes",label:"Notes",type:"textarea",value:n.notes||""}
    ],
    onSave(v){
      if(!v.names.trim()) return;
      n.names=v.names.trim();
      n.relation=v.relation.trim();
      n.notes=v.notes.trim();
      n.disabled=false;
      if(isNew) neighbors.push(n);
      saveNeighbors(); renderNeighbors(); toast(isNew?"Neighbor added":"Neighbor updated");
    },
    onDelete:isNew?null:()=>{
      n.disabled=true;
      saveNeighbors(); renderNeighbors(); toast("Neighbor removed");
    }
  });
}

function renderHomeDashboard(){
  const totalItems = Object.keys(itemsById || {}).length;
  const totalLocations = Array.isArray(LOCATIONS) ? LOCATIONS.length : 0;

  const taskRows = tasks.filter(t=>!t.disabled).sort((a,b)=>taskStatus(a).sortKey-taskStatus(b).sortKey);
  const urgentTasks = taskRows.filter(t=>taskStatus(t).bucket==="now");
  const soonTasks = taskRows.filter(t=>taskStatus(t).bucket==="soon");

  const season = currentSeason();
  const year = new Date().getFullYear();
  const activeSeasonal = seasonalItems.filter(i=>!i.disabled && i.season===season && i.done_year!==year);

  const stats = $("#homeStats");
  if(stats){
    stats.innerHTML = `
      <div class="home-stat"><b>${totalItems}</b><span>Items mapped</span></div>
      <div class="home-stat"><b>${totalLocations}</b><span>Storage spots</span></div>
      <div class="home-stat ${urgentTasks.length?"warn":""}"><b>${urgentTasks.length}</b><span>Need attention</span></div>`;
  }

  const attention = $("#homeAttention");
  if(attention){
    const list = urgentTasks.slice(0,4);
    attention.innerHTML = list.length ? list.map(t=>{
      const st = taskStatus(t);
      const loc = t.location_code && byCode[t.location_code] ? byCode[t.location_code] : null;
      const systemId = typeof systemForTask==="function" ? systemForTask(t) : null;
      return `<button type="button" class="home-card" ${systemId ? `data-home-system="${systemId}"` : 'data-home-tab="tasks"'}>
        <span class="home-card-icon">${icon("check-circle")}</span>
        <span><b>${esc(t.title)}</b><small>${esc(st.label)}${loc ? " · "+esc(loc.name) : ""}</small></span>
        <span class="home-arrow">›</span>
      </button>`;
    }).join("") : `<div class="home-empty"><b>Nothing urgent right now.</b><span>${soonTasks.length ? soonTasks.length+" task"+(soonTasks.length===1?" is":"s are")+" coming up this month." : "Your recurring maintenance is caught up."}</span></div>`;
  }

  renderNeighbors();

  const seasonal = $("#homeSeasonal");
  if(seasonal){
    const names = Object.fromEntries(SEASONAL_SECTIONS.map(s=>[s.key,s.name]));
    const list = activeSeasonal.slice(0,4);
    seasonal.innerHTML = list.length ? list.map(i=>`<button type="button" class="home-card seasonal" data-home-tab="seasonal">
      <span class="home-card-icon">${icon("leaf")}</span>
      <span><b>${esc(i.title)}</b><small>${esc(names[i.section] || i.section)} · ${season}</small></span>
      <span class="home-arrow">›</span>
    </button>`).join("") : `<div class="home-empty"><b>${season[0].toUpperCase()+season.slice(1)} is caught up.</b><span>No unchecked seasonal tasks remain for this year.</span></div>`;
  }
}

$("#view-home").addEventListener("click", e=>{
  const addNeighbor=e.target.closest("#addNeighborBtn");
  if(addNeighbor){ openNeighborForm(null); return; }
  const editNeighbor=e.target.closest("[data-edit-neighbor]");
  if(editNeighbor){ openNeighborForm(neighbors.find(n=>n.id===editNeighbor.dataset.editNeighbor)); return; }
  const systemJump=e.target.closest("[data-home-system]");
  if(systemJump){
    switchTab("systems");
    setTimeout(()=>focusSystem(systemJump.dataset.homeSystem),0);
    return;
  }
  const jump = e.target.closest("[data-home-tab]");
  if(jump){
    switchTab(jump.dataset.homeTab);
    return;
  }
  if(e.target.closest("#homeSearchBtn")){
    switchTab("storage");
    setTimeout(()=>$("#q")?.focus(),0);
  }
});
