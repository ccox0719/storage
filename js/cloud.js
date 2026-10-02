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
  return [...RAW_LOCATIONS.flatMap(l=>l.items), ...customItems].map(it=>({
    household_id:homeHouseholdId, item_key:it.id, name:it.text, origin_code:it.origin,
    location_code:moves[it.id] || it.origin, sublocation_code:subMoves[it.id] || null, status:"placed", notes:""
  }));
}
function cloudRowsTasks(){
  return [...tasks.map(t=>({
    household_id:homeHouseholdId, external_id:t.id, title:t.title,
    frequency_months:Number(t.frequency_months)||1, last_done:t.last_done || null, notes:t.notes || "",
    category:t.category || "General", location_code:t.location_code || null, snoozed_until:t.snoozed_until || null
  })), ...decorItems.map(i=>({
    household_id:homeHouseholdId, external_id:`decor:${i.id}`, title:i.name,
    frequency_months:999, last_done:i.purchased_at || null,
    notes:`__DECOR__${JSON.stringify(i)}`, category:"Decor Shopping", location_code:null, snoozed_until:null
  }))];
}
function cloudRowsSeasonal(){
  return seasonalItems.map(i=>({
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
    notes:p.notes || "", treatment_cycle_years:p.treatment_cycle_years || null,
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
    const seedIds = new Set(RAW_LOCATIONS.flatMap(l=>l.items).map(i=>i.id));
    moves = {};
    subMoves = {};
    customItems = [];
    ir.data.forEach(r=>{
      if(seedIds.has(r.item_key)){
        if(r.location_code && r.location_code!==r.origin_code) moves[r.item_key]=r.location_code;
        if(r.sublocation_code) subMoves[r.item_key]=r.sublocation_code;
      }else{
        customItems.push({id:r.item_key,text:r.name,origin:r.origin_code});
        if(r.location_code && r.location_code!==r.origin_code) moves[r.item_key]=r.location_code;
        if(r.sublocation_code) subMoves[r.item_key]=r.sublocation_code;
      }
    });
    saveJSON("wil-moves",moves);
    saveJSON("wil-submoves",subMoves);
    saveJSON("wil-custom",customItems);
    rebuild();
  }

  if(tr.data.length){
    const decorRows = tr.data.filter(r=>String(r.external_id).startsWith("decor:") || String(r.notes||"").startsWith("__DECOR__"));
    if(decorRows.length){
      const parsed = decorRows.map(r=>{try{return JSON.parse(String(r.notes).replace(/^__DECOR__/,""));}catch{return null}}).filter(Boolean);
      if(parsed.length){decorItems=parsed;Store.write("wil-decor",decorItems);}
    }
    tasks = tr.data.filter(r=>!String(r.external_id).startsWith("decor:") && !String(r.notes||"").startsWith("__DECOR__")).map(r=>({id:r.external_id,title:r.title,frequency_months:r.frequency_months,last_done:r.last_done,notes:r.notes||"",category:r.category||"General",location_code:r.location_code||null,snoozed_until:r.snoozed_until||null}));
    tasks.forEach(t=>{
      const seed = TASKS_SEED.find(x=>x.id===t.id);
      if(!seed) return;
      if(!t.category || t.category==="General") t.category = seed.category;
      if(!t.location_code) t.location_code = seed.location_code;
      if(!t.notes && seed.notes) t.notes = seed.notes;
    });
    mergeNewSeedItems(tasks,TASKS_SEED,()=>{});
    Store.write("wil-tasks",tasks);
  }
  if(sr.data.length){
    const seedNow = seasonalSeed();
    const cloudById = Object.fromEntries(sr.data.map(r=>[r.external_id,r]));
    const builtInPattern = /^(pool|kitchen|fountain|deck|furniture|landscaping|turf|hvac)-(winter|spring|summer|fall)-\d+$/;
    seasonalItems = seedNow.map(seed=>{
      const old = cloudById[seed.id];
      return {...seed, done_year:old ? old.done_year : null};
    });
    sr.data.filter(r=>!builtInPattern.test(r.external_id)).forEach(r=>{
      seasonalItems.push({id:r.external_id,section:r.section,season:r.season,title:r.title,done_year:r.done_year});
    });
    Store.write("wil-seasonal",seasonalItems);
  }
  if(mr.data.length){
    movingProgress = {};
    mr.data.forEach(r=>{ movingProgress[r.step_id] = !!r.completed; });
    saveJSON("wil-moving-progress", movingProgress);
  }

  if(pr.data.length){
    plants = pr.data.map(r=>({
      id:r.external_id,name:r.name,location:r.location||"",fall_task:r.fall_task||"",
      spring_task:r.spring_task||"",notes:r.notes||"",treatment_cycle_years:r.treatment_cycle_years,
      last_treated_year:r.last_treated_year
    }));
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
  renderTasks(); renderSeasonal(); renderPlants(); renderDecor(); renderHomeDashboard();
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
