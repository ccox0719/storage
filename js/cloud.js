/* ==================================================================
   SUPABASE FAMILY SYNC
   ================================================================== */
const SUPABASE_URL = "https://svaozzitkajgqzacldur.supabase.co";
const SUPABASE_KEY = "sb_publishable_scbeO9M_PR8Zvkh-1nbheA_lZLwl31b";
let homeHouseholdId = null;
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let cloudReady = false;
let cloudLoading = false;
const cloudTimers = {};

function setCloudState(message, isError=false){
  const box = $("#cloudBottomBar");
  if(!box) return;
  box.hidden = false;
  $("#cloudStateText").innerHTML = `<b>Cloud</b> · ${esc(message)}`;
  box.style.borderColor = isError ? "#B4394C" : "";
}

function showAuth(){
  $("#authGate").hidden = false;
  $(".wrap").style.display = "none";
  $(".tabbar").style.display = "none";
}

function showSignedInApp(){
  $("#authGate").hidden = true;
  $(".wrap").style.display = "";
  $(".tabbar").style.display = "";
}

async function initCloud(){
  const {data:{session}} = await db.auth.getSession();
  if(session) await startCloud(session);
  else showAuth();

  db.auth.onAuthStateChange(async (_event, session)=>{
    if(session && !cloudReady && !cloudLoading) await startCloud(session);
    if(!session){ cloudReady=false; showAuth(); }
  });
}

async function startCloud(session){
  cloudLoading = true;
  showSignedInApp();
  setCloudState("connecting…");
  try{
    const {data:memberships,error:membershipError} = await db.from("household_members")
      .select("household_id")
      .eq("user_id",session.user.id)
      .limit(1);
    if(membershipError) throw membershipError;
    const membership = memberships && memberships[0];
    if(!membership?.household_id) throw new Error("No family household is linked to this login.");
    homeHouseholdId = membership.household_id;

    const {count,error} = await db.from("home_locations")
      .select("id",{count:"exact",head:true})
      .eq("household_id",homeHouseholdId);
    if(error) throw error;

    if(!count){
      cloudReady = true;
      setCloudState("setting up house data…");
      await cloudSyncAll(true);
    }else{
      await cloudPull();
      cloudReady = true;
      await cloudSyncAll(true); // also adds any new built-in defaults
    }
    setCloudState("synced");
  }catch(err){
    console.error(err);
    setCloudState(err.message || "sync error", true);
  }finally{
    cloudLoading = false;
  }
}

async function cloudReplace(table, rows){
  const del = await db.from(table).delete().eq("household_id",homeHouseholdId);
  if(del.error) throw del.error;
  if(rows.length){
    const ins = await db.from(table).insert(rows);
    if(ins.error) throw ins.error;
  }
}

function cloudRowsLocations(){
  return RAW_LOCATIONS.map(l=>({
    household_id:homeHouseholdId, code:l.code, zone:z(l.code), name:l.name,
    job:l.job || "", icon:l.icon || "box", keywords:l.kw || "", maybe:l.maybe || []
  }));
}
function cloudRowsSubLocations(){
  return SUBLOCATIONS.map((sub,idx)=>({
    household_id:homeHouseholdId, location_code:sub.location, sub_code:sub.code,
    name:sub.name, sort_order:idx, notes:sub.notes || ""
  }));
}
function cloudRowsItems(){
  return [...RAW_LOCATIONS.flatMap(l=>l.items), ...customItems].map(it=>{
    const override = typeof itemOverrides!=="undefined" ? itemOverrides[it.id] : null;
    return {
      household_id:homeHouseholdId, item_key:it.id, name:override?.text || it.text, origin_code:it.origin,
      location_code:moves[it.id] || it.origin, sublocation_code:subMoves[it.id] || null,
      status:override?.deleted ? "removed" : "placed", notes:""
    };
  });
}
function cloudRowsTasks(){
  return [...tasks.map(t=>({
    household_id:homeHouseholdId, external_id:t.id, title:t.title,
    frequency_months:Number(t.frequency_months)||1, last_done:t.last_done || null,
    notes:`__TASKSTATE__${JSON.stringify({disabled:!!t.disabled,notes:t.notes||"",notify_important:!!t.notify_important})}`,
    category:t.category || "General", location_code:t.location_code || null, snoozed_until:t.snoozed_until || null
  })), ...decorItems.map(i=>({
    household_id:homeHouseholdId, external_id:`decor:${i.id}`, title:i.name,
    frequency_months:999, last_done:i.purchased_at || null,
    notes:`__DECOR__${JSON.stringify(i)}`, category:"Decor Shopping", location_code:null, snoozed_until:null
  })), ...systemLog.map(i=>({
    household_id:homeHouseholdId, external_id:`systemlog:${i.id}`, title:i.note,
    frequency_months:999, last_done:i.date || null,
    notes:`__SYSTEMLOG__${JSON.stringify(i)}`, category:"System History", location_code:null, snoozed_until:null
  })), ...Object.entries(systemProfiles).map(([systemId,p])=>({
    household_id:homeHouseholdId, external_id:`systemprofile:${systemId}`, title:`System profile: ${systemId}`,
    frequency_months:999, last_done:p.install_date || null,
    notes:`__SYSTEMPROFILE__${JSON.stringify({system_id:systemId,...p})}`, category:"System Profile", location_code:null, snoozed_until:null
  })), ...Object.entries(systemPrefs).map(([systemId,p])=>({
    household_id:homeHouseholdId, external_id:`systempref:${systemId}`, title:`System preference: ${systemId}`,
    frequency_months:999, last_done:null,
    notes:`__SYSTEMPREF__${JSON.stringify({system_id:systemId,...p})}`, category:"System Preference", location_code:null, snoozed_until:null
  })), ...seasonalItems.filter(i=>i.disabled).map(i=>({
    household_id:homeHouseholdId, external_id:`seasonalstate:${i.id}`, title:`Removed seasonal: ${i.title}`,
    frequency_months:999, last_done:null,
    notes:`__SEASONALSTATE__${JSON.stringify(i)}`, category:"Seasonal State", location_code:null, snoozed_until:null
  }))];
}
function cloudRowsSeasonal(){
  return seasonalItems.filter(i=>!i.disabled).map(i=>({
    household_id:homeHouseholdId, external_id:i.id, section:i.section,
    season:i.season, title:i.title, done_year:i.done_year || null
  }));
}
function cloudRowsMoving(){
  return MOVING_STEPS.map(step=>({
    household_id:homeHouseholdId, step_id:step.id, completed:!!movingProgress[step.id]
  }));
}
function cloudRowsPlants(){
  return plants.map(p=>({
    household_id:homeHouseholdId, external_id:p.id, name:p.name,
    location:p.location || "", fall_task:p.fall_task || "", spring_task:p.spring_task || "",
    notes:p.disabled ? `__PLANTSTATE__${JSON.stringify({disabled:true,notes:p.notes||""})}` : (p.notes || ""), treatment_cycle_years:p.treatment_cycle_years || null,
    last_treated_year:p.last_treated_year || null
  }));
}

async function cloudSyncAll(force=false){
  if(!cloudReady && !force) return;
  try{
    setCloudState("saving…");
    await cloudReplace("home_locations", cloudRowsLocations());
    await cloudReplace("home_sub_locations", cloudRowsSubLocations());
    await cloudReplace("home_items", cloudRowsItems());
    await cloudReplace("home_tasks", cloudRowsTasks());
    await cloudReplace("home_seasonal_tasks", cloudRowsSeasonal());
    await cloudReplace("home_plants", cloudRowsPlants());
    await cloudReplace("home_moving_progress", cloudRowsMoving());
    setCloudState("synced");
  }catch(err){
    console.error(err);
    setCloudState(err.message || "save failed", true);
  }
}

function cloudSyncSoon(kind){
  if(!cloudReady || cloudLoading) return;
  clearTimeout(cloudTimers[kind]);
  cloudTimers[kind] = setTimeout(async ()=>{
    try{
      setCloudState("saving…");
      if(kind==="items") await cloudReplace("home_items", cloudRowsItems());
      if(kind==="tasks") await cloudReplace("home_tasks", cloudRowsTasks());
      if(kind==="seasonal") await cloudReplace("home_seasonal_tasks", cloudRowsSeasonal());
      if(kind==="plants") await cloudReplace("home_plants", cloudRowsPlants());
      if(kind==="moving") await cloudReplace("home_moving_progress", cloudRowsMoving());
      setCloudState("synced");
    }catch(err){
      console.error(err);
      setCloudState(err.message || "save failed", true);
    }
  }, 350);
}
function cloudSyncItemsSoon(){ cloudSyncSoon("items"); }
function cloudSyncTasksSoon(){ cloudSyncSoon("tasks"); }
function cloudSyncSeasonalSoon(){ cloudSyncSoon("seasonal"); }
function cloudSyncPlantsSoon(){ cloudSyncSoon("plants"); }
function cloudSyncMovingSoon(){ cloudSyncSoon("moving"); }

async function cloudPull(){
  const [ir,tr,sr,pr,mr] = await Promise.all([
    db.from("home_items").select("*").eq("household_id",homeHouseholdId),
    db.from("home_tasks").select("*").eq("household_id",homeHouseholdId),
    db.from("home_seasonal_tasks").select("*").eq("household_id",homeHouseholdId),
    db.from("home_plants").select("*").eq("household_id",homeHouseholdId),
    db.from("home_moving_progress").select("*").eq("household_id",homeHouseholdId)
  ]);
  for(const r of [ir,tr,sr,pr,mr]) if(r.error) throw r.error;

  if(ir.data.length){
    const seedItems = RAW_LOCATIONS.flatMap(l=>l.items);
    const seedById = Object.fromEntries(seedItems.map(i=>[i.id,i]));
    const seedIds = new Set(seedItems.map(i=>i.id));
    moves = {};
    subMoves = {};
    customItems = [];
    itemOverrides = {};
    ir.data.forEach(r=>{
      if(seedIds.has(r.item_key)){
        const seed=seedById[r.item_key];
        if(r.status==="removed") itemOverrides[r.item_key]={deleted:true};
        else if(r.name && r.name!==seed.text) itemOverrides[r.item_key]={text:r.name,deleted:false};
        if(r.location_code && r.location_code!==r.origin_code) moves[r.item_key]=r.location_code;
        if(r.sublocation_code) subMoves[r.item_key]=r.sublocation_code;
      }else if(r.status!=="removed"){
        customItems.push({id:r.item_key,text:r.name,origin:r.origin_code});
        if(r.location_code && r.location_code!==r.origin_code) moves[r.item_key]=r.location_code;
        if(r.sublocation_code) subMoves[r.item_key]=r.sublocation_code;
      }
    });
    saveJSON("wil-moves",moves);
    saveJSON("wil-submoves",subMoves);
    saveJSON("wil-custom",customItems);
    saveJSON("wil-item-overrides",itemOverrides);
    rebuild();
  }

  let removedSeasonal = [];
  if(tr.data.length){
    const decorRows = tr.data.filter(r=>String(r.external_id).startsWith("decor:") || String(r.notes||"").startsWith("__DECOR__"));
    if(decorRows.length){
      const parsed = decorRows.map(r=>{try{return JSON.parse(String(r.notes).replace(/^__DECOR__/,""));}catch{return null}}).filter(Boolean);
      if(parsed.length){decorItems=parsed;if(typeof applyBasementStyleUpdate==="function") applyBasementStyleUpdate(false);Store.write("wil-decor",decorItems);}
    }

    const systemRows = tr.data.filter(r=>String(r.external_id).startsWith("systemlog:") || String(r.notes||"").startsWith("__SYSTEMLOG__"));
    if(systemRows.length){
      const parsed = systemRows.map(r=>{try{return JSON.parse(String(r.notes).replace(/^__SYSTEMLOG__/,""));}catch{return null}}).filter(Boolean);
      if(parsed.length){systemLog=parsed;saveJSON("wil-system-log",systemLog);}
    }

    const profileRows = tr.data.filter(r=>String(r.external_id).startsWith("systemprofile:") || String(r.notes||"").startsWith("__SYSTEMPROFILE__"));
    if(profileRows.length){
      const parsed = profileRows.map(r=>{try{return JSON.parse(String(r.notes).replace(/^__SYSTEMPROFILE__/,""));}catch{return null}}).filter(Boolean);
      if(parsed.length){
        systemProfiles={};
        parsed.forEach(p=>{if(p.system_id){const {system_id,...rest}=p;systemProfiles[system_id]=rest;}});
        saveJSON("wil-system-profiles",systemProfiles);
      }
    }

    const prefRows = tr.data.filter(r=>String(r.external_id).startsWith("systempref:") || String(r.notes||"").startsWith("__SYSTEMPREF__"));
    if(prefRows.length){
      const parsed = prefRows.map(r=>{try{return JSON.parse(String(r.notes).replace(/^__SYSTEMPREF__/,""));}catch{return null}}).filter(Boolean);
      if(parsed.length){
        systemPrefs={};
        parsed.forEach(p=>{if(p.system_id){const {system_id,...rest}=p;systemPrefs[system_id]=rest;}});
        saveJSON("wil-system-prefs",systemPrefs);
      }
    }

    const seasonalStateRows = tr.data.filter(r=>String(r.external_id).startsWith("seasonalstate:") || String(r.notes||"").startsWith("__SEASONALSTATE__"));
    removedSeasonal = seasonalStateRows.map(r=>{try{return JSON.parse(String(r.notes).replace(/^__SEASONALSTATE__/,""));}catch{return null}}).filter(Boolean);

    tasks = tr.data.filter(r=>
      !String(r.external_id).startsWith("decor:") &&
      !String(r.notes||"").startsWith("__DECOR__") &&
      !String(r.external_id).startsWith("systemlog:") &&
      !String(r.notes||"").startsWith("__SYSTEMLOG__") &&
      !String(r.external_id).startsWith("systemprofile:") &&
      !String(r.notes||"").startsWith("__SYSTEMPROFILE__") &&
      !String(r.external_id).startsWith("systempref:") &&
      !String(r.notes||"").startsWith("__SYSTEMPREF__") &&
      !String(r.external_id).startsWith("seasonalstate:") &&
      !String(r.notes||"").startsWith("__SEASONALSTATE__")
    ).map(r=>{
      let notes=r.notes||"", disabled=false;
      if(String(notes).startsWith("__TASKSTATE__")){
        try{
          const meta=JSON.parse(String(notes).replace(/^__TASKSTATE__/,""));
          disabled=!!meta.disabled;
          notes=meta.notes||"";
          var notify_important=!!meta.notify_important;
        }catch{}
      }
      return {id:r.external_id,title:r.title,frequency_months:r.frequency_months,last_done:r.last_done,notes,category:r.category||"General",location_code:r.location_code||null,snoozed_until:r.snoozed_until||null,disabled,notify_important:typeof notify_important==="boolean"?notify_important:false};
    });
    tasks.forEach(t=>{
      const seed = TASKS_SEED.find(x=>x.id===t.id);
      if(!seed) return;
      if(!t.category || t.category==="General") t.category = seed.category;
      if(!t.location_code) t.location_code = seed.location_code;
      if(!t.notes && seed.notes) t.notes = seed.notes;
      if(typeof t.notify_important!=="boolean") t.notify_important=!!seed.notify_important;
    });
    mergeNewSeedItems(tasks,TASKS_SEED,()=>{});
    Store.write("wil-tasks",tasks);
  }
  {
    const seedNow = seasonalSeed();
    const cloudById = Object.fromEntries(sr.data.map(r=>[r.external_id,r]));
    const removedById = Object.fromEntries((removedSeasonal||[]).map(i=>[i.id,i]));
    const builtInPattern = /^(pool|kitchen|fountain|hot-tub|irrigation|deck|furniture|garage|landscaping|turf|hvac)-(winter|spring|summer|fall)-\d+$/;
    seasonalItems = seedNow.map(seed=>{
      const old = cloudById[seed.id];
      const removed = removedById[seed.id];
      return {...seed, ...(removed||{}), disabled:!!removed, done_year:removed ? null : (old ? old.done_year : null)};
    });
    sr.data.filter(r=>!builtInPattern.test(r.external_id)).forEach(r=>{
      if(!removedById[r.external_id]) seasonalItems.push({id:r.external_id,section:r.section,season:r.season,title:r.title,done_year:r.done_year,disabled:false});
    });
    (removedSeasonal||[]).filter(i=>!builtInPattern.test(i.id)).forEach(i=>seasonalItems.push({...i,disabled:true,done_year:null}));
    Store.write("wil-seasonal",seasonalItems);
  }
  if(mr.data.length){
    movingProgress = {};
    mr.data.forEach(r=>{ movingProgress[r.step_id] = !!r.completed; });
    saveJSON("wil-moving-progress", movingProgress);
  }

  if(pr.data.length){
    plants = pr.data.map(r=>{
      let notes=r.notes||"", disabled=false;
      if(String(notes).startsWith("__PLANTSTATE__")){
        try{
          const meta=JSON.parse(String(notes).replace(/^__PLANTSTATE__/,""));
          disabled=!!meta.disabled;
          notes=meta.notes||"";
        }catch{}
      }
      return {
        id:r.external_id,name:r.name,location:r.location||"",fall_task:r.fall_task||"",
        spring_task:r.spring_task||"",notes,treatment_cycle_years:r.treatment_cycle_years,
        last_treated_year:r.last_treated_year,disabled
      };
    });
    plants.forEach(p=>{
      const seed = PLANTS_SEED.find(x=>x.id===p.id);
      if(!seed) return;
      if(!p.location && seed.location) p.location = seed.location;
      if(p.id==="rose-shrub" && /Cut back after first frost/i.test(p.fall_task||"")) p.fall_task = seed.fall_task;
    });
    mergeNewSeedItems(plants,PLANTS_SEED,()=>{});
    Store.write("wil-plants",plants);
  }

  renderDirectory(); renderTiles(); search(); renderMoving();
  renderTasks(); renderSeasonal(); renderPlants(); renderDecor(); renderSystems(); renderHomeDashboard();
}

document.getElementById("authForm").addEventListener("submit", async e=>{
  e.preventDefault();
  const email=$("#authEmail").value.trim();
  const password=$("#authPassword").value;
  $("#authMsg").textContent="Signing in…";
  const {error}=await db.auth.signInWithPassword({email,password});
  $("#authMsg").textContent=error ? error.message : "Signed in.";
});

document.getElementById("magicLinkBtn").addEventListener("click", async ()=>{
  const email=$("#authEmail").value.trim();
  if(!email){ $("#authMsg").textContent="Enter your email first."; return; }
  $("#authMsg").textContent="Sending sign-in link…";
  const {error}=await db.auth.signInWithOtp({
    email,
    options:{shouldCreateUser:false,emailRedirectTo:location.origin+location.pathname}
  });
  $("#authMsg").textContent=error ? error.message : "Check your email for the sign-in link.";
});

document.getElementById("cloudSignOut").addEventListener("click", async ()=>{
  await db.auth.signOut();
  cloudReady=false;
  homeHouseholdId=null;
  showAuth();
});
