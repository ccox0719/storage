/* ==================================================================
   HOME DASHBOARD
   ================================================================== */
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
