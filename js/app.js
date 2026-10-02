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
  renderTasks(); renderSeasonal(); renderPlants(); renderDecor();
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

const ZONES = {
  U:{name:"Upstairs"},
  M:{name:"Main floor"},
  G:{name:"Garage"},
  O:{name:"Outdoor", desc:"Yard, shed, pool & outdoor kitchen"},
  B:{name:"Basement"}
};
const ZONE_ORDER = ["U","M","G","O","B"];

/* ---------- line-icon set (replaces emoji) ---------- */
const ICONS = {
  box: '<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  "toilet-paper": '<rect x="5" y="8" width="14" height="12" rx="2"/><ellipse cx="12" cy="8" rx="7" ry="3"/><ellipse cx="12" cy="8" rx="3" ry="1.3"/>',
  pot: '<path d="M4 9h16l-1.5 10.5A2 2 0 0 1 16.5 21h-9a2 2 0 0 1-2-1.5L4 9z"/><path d="M2 6h20"/><path d="M8 6V4h8v2"/>',
  container: '<rect x="4" y="8" width="16" height="12" rx="2"/><path d="M4 8l2-4h12l2 4"/>',
  suitcase: '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15" r="1.4"/>',
  jar: '<path d="M8 3h8"/><path d="M9 3v3l-2 2v11a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V8l-2-2V3"/><path d="M7 12h10"/>',
  hanger: '<path d="M12 4a2 2 0 1 1 2 2c-.6.6-1 1-1 2"/><path d="M12 8l-9 6h18l-9-6z"/><path d="M3 18h18"/>',
  droplet: '<path d="M12 3s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12z"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="8.5" cy="8.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="15.5" cy="8.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="8.5" cy="15.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2.4-2.4z"/>',
  fish: '<path d="M3 12s3-5 9-5 9 5 9 5-3 5-9 5-9-5-9-5z"/><circle cx="16" cy="11" r="1" fill="currentColor" stroke="none"/><path d="M3 12l-2-3v6l2-3z"/>',
  glove: '<path d="M8 10V5a1.5 1.5 0 0 1 3 0v4M11 9V4a1.5 1.5 0 0 1 3 0v5M14 9.5V6a1.5 1.5 0 0 1 3 0v7"/><path d="M17 10a2 2 0 0 1 4 0v4a7 7 0 0 1-7 7h-2a7 7 0 0 1-7-7v-3a1.5 1.5 0 0 1 3 0"/>',
  snowflake: '<path d="M12 2v20M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"/>',
  truck: '<path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
  plug: '<path d="M9 2v6M15 2v6M7 8h10v4a5 5 0 0 1-5 5 5 5 0 0 1-5-5V8z"/><path d="M12 17v5"/>',
  bed: '<path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7"/><path d="M3 15h18"/><path d="M7 11V7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2"/><path d="M3 21v-3M21 21v-3"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>',
  toothbrush: '<path d="M4 20l5-5"/><path d="M9 15l8-8a2.8 2.8 0 0 1 4 4l-8 8z"/><path d="M14 6l4 4"/>',
  leaf: '<path d="M5 21c9 0 14-5 14-16C8 5 3 10 3 19"/><path d="M5 21c3-6 6-10 14-16"/>',
  flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M8 14h8"/>',
  waves: '<path d="M2 8c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M2 14c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M2 20c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>',
  utensils: '<path d="M6 2v8a2 2 0 0 0 4 0V2M8 10v12M17 2s-3 1-3 5 1 4 1 4v11"/>',
  flame: '<path d="M12 2s5 4 5 9a5 5 0 0 1-10 0c0-1 .3-2 1-3 .3 1 1 1.5 1.5 1 .5-2-1-3-1-5.5C8.5 2 12 2 12 2z"/>',
  cup: '<path d="M5 8h11v7a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V8z"/><path d="M16 9h2a2 2 0 0 1 0 4h-2"/><path d="M8 2v3M12 2v3"/>',
  "ice-cube": '<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M5 9h14M9 5v14"/>',
  sprout: '<path d="M12 22v-9"/><path d="M12 13c-4 0-7-3-7-7 4 0 7 3 7 7z"/><path d="M12 13c4 0 7-3 7-7-4 0-7 3-7 7z"/>',
  home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9"/>',
  "check-circle": '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>',
  broom: '<path d="M19 5l-8 8"/><path d="M11 13l-8 8"/><path d="M3 21l2-6 4 4-6 2z"/>',
  chair: '<path d="M6 4v9M18 4v9"/><path d="M6 13h12v3a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4v-3z"/><path d="M6 20l-1 2M18 20l1 2"/>',
  "help-circle": '<circle cx="12" cy="12" r="9"/><path d="M9.3 9.2a2.7 2.7 0 0 1 5.1 1.2c0 1.8-2.2 1.7-2.2 3.6"/><circle cx="12" cy="17.2" r=".6" fill="currentColor" stroke="none"/>'
};
function icon(key){
  return `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-0.15em" aria-hidden="true">${ICONS[key]||ICONS.box}</svg>`;
}

const RAW_LOCATIONS = [
  {code:"B1",icon:"box",name:"Basement Storage Room",job:"Long-term household storage",
   items:["Christmas décor","Memories","Photo albums","Kids' keepsakes","Office supplies","Craft supplies","Party supplies","Gift supplies","Long-term electronics","Spare household supplies","Paint overflow","Repair overflow"],
   maybe:["Halloween & Easter decor","Wrapping paper & gift bags","Wedding keepsakes","Old yearbooks","Baby items being saved","Extra light bulbs & batteries"],
   kw:"christmas halloween easter thanksgiving decorations ornaments wreath lights tinsel garland keepsake memento memorabilia scrapbook yearbook wedding baby book trophy award diploma craft scrapbooking wrapping paper gift bag ribbon greeting card stationery office supply printer paper binder file folder old phone old laptop router spare paint touch up caulk tube lightbulb spare battery spare"},
  {code:"B2",icon:"gear",name:"Mechanical Room",job:"House mechanical supplies only",
   items:["HVAC filters","Air filters","Humidifier filters","House-system replacement items"],
   maybe:["Appliance manuals","Sump pump parts","Water softener salt","Smoke detector batteries"],
   kw:"furnace filter air filter hvac filter humidifier filter water filter cartridge water heater sump pump well pump thermostat battery smoke detector battery carbon monoxide detector appliance manual warranty paperwork"},
  {code:"B3",icon:"toilet-paper",name:"Basement Bathroom",job:"Basement bathroom supplies",
   items:["Toilet paper","Soap","Cleaning backups","Toiletry backups"],maybe:["Plunger","Extra hand towels","Air freshener","Night light"],
   kw:"toilet paper soap plunger toilet brush air freshener night light hand towel"},
  {code:"B4",icon:"pot",name:"Basement Kitchen",job:"Specialty kitchen appliances & extra cookware",
   items:["Stock pot","Fondue pot","Wok","Electric griddle","Panini maker","Roasting pans","Food processor","Slow cookers","Keurig","Shaved-ice machine","Waffle maker","Electric skillet"],
   maybe:["Turkey fryer","Bread machine","Pasta maker","Ice cream maker","Pressure canner","Holiday baking pans"],
   kw:"stock pot fondue wok griddle panini press roasting pan food processor slow cooker crockpot instant pot keurig coffee maker waffle maker deep fryer turkey fryer bread machine pasta maker ice cream maker pressure canner mixer blender specialty appliance"},
  {code:"B5",icon:"container",name:"Basement Kitchen Peninsula",job:"Entertaining & food-storage overflow",
   items:["Tupperware","Bento boxes","Party trays","Plasticware","Paper bowls","Paper cups","Paper plates","Serving pieces"],
   maybe:["Coolers","Drink dispenser","Chafing dishes","Disposable cutlery","Punch bowl"],
   kw:"tupperware food container bento box party tray plasticware disposable plate disposable cup paper plate paper bowl serving dish platter cooler drink dispenser chafing dish punch bowl cocktail supply"},
  {code:"B6",icon:"suitcase",name:"Under-Stairs Storage",job:"Bulky travel & camping storage",
   items:["Suitcases","Sleeping bags","Cots","Packing cubes","Camping gear","Slackline","Inflatable pump","Travel cooking equipment"],
   maybe:["Tents","Camp chairs","Hiking backpacks","Sleeping pads","Road-trip games"],
   kw:"suitcase luggage duffel bag sleeping bag tent camp chair camping stove travel cooler packing cube travel pillow hiking backpack sleeping pad road trip"},
  {code:"B7",icon:"lock",name:"Safe",job:"Important documents & valuables",
   items:["Passports","Important documents","Checkbooks","Records"],
   maybe:["Jewelry","Backup hard drives","Spare house keys","Will & estate papers"],
   kw:"passport birth certificate social security card will deed title jewelry cash external hard drive backup spare key important document valuables"},

  {code:"M1",icon:"pot",name:"Main Kitchen",job:"Everyday kitchen & frequently used appliances",
   items:["KitchenAid (appliance lift)","Everyday cookware","Baking tools","Fridge filters","Everyday food storage","Rubberware / food containers"],
   maybe:["Blender","Toaster","Everyday dishware","Cutting boards","Spice rack"],
   kw:"blender toaster mixer cutting board dish plate pan pot spice measuring cup kitchenaid fridge filter everyday cookware rubberware rubbermaid tupperware food container lid leftovers bread baking dough yeast banneton proofing bench scraper lame loaf pan dutch oven kitchen scale dough whisk"},
  {code:"M2",icon:"jar",name:"Pantry",job:"Food & consumables",
   items:["Pantry staples","Bulk food","Snacks","Paper food products","Food backups"],
   maybe:["Cereal","Coffee & tea","Cooking oils","Kids' snacks","Canned goods"],
   kw:"cereal snack canned food pasta rice coffee tea cooking oil condiment flour sugar pantry staple bulk food"},
  {code:"M3",icon:"hanger",name:"Entry Coat Closet",job:"Things you grab when leaving",
   items:["Shoes","Gloves","Hats","Scarves","Umbrellas","Coats","Bags"],
   maybe:["Backpacks","Sunglasses","Reusable shopping bags","Sunscreen","Leashes"],
   kw:"coat jacket shoe boot glove hat scarf umbrella backpack sunglasses reusable bag mask sunscreen leash keys"},
  {code:"M4",icon:"toilet-paper",name:"Main-Floor Bathroom",job:"Guest & main-floor bathroom supplies",
   items:["Toilet paper","Hand soap","Toiletries","Cleaners"],maybe:["Guest towels","Hand lotion","Extra toilet paper","Air freshener"],
   kw:"toilet paper hand soap guest towel air freshener bathroom guest"},
  {code:"M5",icon:"droplet",name:"Laundry Room",job:"Cleaning, laundry & household refills",
   items:["Detergent","Dryer sheets","OxiClean","Febreze","Glass cleaner","Shout","Pledge","Upholstery supplies","Handheld vacuum","Rags","Towels","Pool & beach towels"],
   maybe:["Iron & board","Mop & broom","Lint roller","Stain stick","Trash bags"],
   kw:"detergent dryer sheet oxiclean febreze glass cleaner windex stain remover iron ironing board mop broom handheld vacuum trash bag dish soap sponge rag upholstery cleaner lint roller laundry cleaning supply"},
  {code:"M6",icon:"dice",name:"Game Room Built-Ins",job:"Games, recreation & family fun",
   items:["Pokémon cards","Puzzles","Costumes","Dress-up items","Laser tag","Indoor games","Books"],
   maybe:["Board games","Playing cards","Legos","Art supplies","Remote controls"],
   kw:"board game card game puzzle costume dress up laser tag lego remote control book toy indoor pokemon"},

  {code:"G1",icon:"wrench",name:"Workbench & Tool Cabinets",job:"Tools, hardware & repair supplies",
   items:["Reciprocating saw","Skill saw","Sander","Levels","Stud finder","Nuts","Bolts","Screws","Anchors","Tape","Caulk","Adhesives","Vacuum parts","Small repair pieces"],
   maybe:["Drill batteries","Extension cords","Work gloves","Safety glasses","WD-40"],
   kw:"drill saw sander level stud finder screw bolt nut anchor tape measure caulk adhesive glue wrench screwdriver hammer pliers extension cord work glove safety glasses wd40 hardware tool repair glue gun staple gun nail gun heat gun caulk gun"},
  {code:"G2",icon:"fish",name:"Tall Utility Cabinet 1",job:"Outdoor & recreation gear",
   items:["Fishing gear","Tackle","Nets","Waders","Outdoor equipment"],maybe:["Bike helmets","Life jackets","Sports balls","Fishing licenses","Airsoft & BB guns","Nerf blasters","Bow & arrows"],
   kw:"fishing rod tackle net waders bike helmet life jacket sports ball fishing license outdoor recreation gear airsoft bb gun nerf blaster pellet gun bow arrow ammo eye protection safety goggles hunting archery"},
  {code:"G3",icon:"glove",name:"Small Cabinet by Backyard Door",job:"Quick-grab garage supplies",
   items:["Small repair supplies","Tapes","Cords","Gloves","Everyday garage & backyard items"],
   maybe:["Bug spray","Sunscreen","Gardening gloves","Water bottles"],
   kw:"bug spray sunscreen gardening glove water bottle small extension cord quick grab backyard"},
  {code:"G4",icon:"snowflake",name:"Garage Fridge & Freezer",job:"Food & drink overflow",
   items:["Frozen foods","Drinks","Cookout supplies","Overflow fridge items"],maybe:["Bulk meat","Holiday leftovers","Extra milk","Party ice"],
   kw:"frozen food bulk meat extra drink party ice holiday leftovers extra milk freezer overflow"},
  {code:"G5",icon:"truck",name:"Tall Utility Cabinet 2",job:"Bulky garage gear",
   items:["Tarps","Covers","Shoulder dolly","Large outdoor items","Car items","Awkward equipment"],
   maybe:["Snow shovels","Small ladder","Holiday inflatables","Car ramps"],
   kw:"tarp cover shoulder dolly snow shovel small ladder car ramp holiday inflatable bulky"},

  {code:"U1",icon:"hanger",name:"West Bedroom Closet",job:"That bedroom's personal storage",
   items:["Clothing","Shoes","Personal items","Keepsakes (modest)"],maybe:["Off-season clothing","Extra pillows","Hobby supplies","Board games"],
   kw:"clothing shoes personal item hobby supply extra pillow off season clothing bedroom closet"},
  {code:"U2",icon:"toilet-paper",name:"Hall Bathroom Storage",job:"Family bathroom & linen storage",
   items:["Towels","Spare toiletries","Toilet paper","Bathroom backups"],maybe:["Bath toys","First-aid kit","Extra shampoo","Nail clippers"],
   kw:"towel shampoo bath toy first aid nail clipper hall bathroom linen"},
  {code:"U3",icon:"plug",name:"Master Bedroom Left Built-In",job:"Personal tech",
   items:["Charging blocks","USB cords","Headphones","Earbuds","Tablets","Kindle","Laptops","Charging station"],
   maybe:["Old phones","Camera gear","Game controllers","Spare batteries"],
   kw:"charger cable headphone earbud tablet kindle laptop old phone camera game controller spare battery personal tech"},
  {code:"U4",icon:"bed",name:"Master Bedroom Window Drawers",job:"Master linens & soft goods",
   items:["Bedding","Blankets","Comforters","Throws","Spare sheets"],maybe:["Mattress pad","Pillow protectors","Extra pillows"],
   kw:"bedding blanket comforter throw sheet mattress pad pillow protector linens"},
  {code:"U5",icon:"moon",name:"Master Bedroom Right Built-In",job:"Bedroom comfort & occasional-use items",
   items:["White-noise machines","Humidifiers","Diffusers","Headlamps"],maybe:["Extra blankets","Sleep mask","Diffuser refills","Night light"],
   kw:"white noise machine humidifier diffuser headlamp sleep mask night light bedroom comfort"},
  {code:"U6",icon:"toothbrush",name:"Master Bathroom Vanity",job:"Daily grooming & personal care",
   items:["Toothbrush items","Grooming tools","Deodorant","Cologne","Mouthwash","Lotion","Hair products","Skin care","Makeup","Q-tips","Nail supplies"],
   maybe:["First-aid supplies","Contact solution","Hair dryer","Electric razor"],
   kw:"toothbrush deodorant cologne perfume mouthwash lotion hair product makeup qtip nail supply razor first aid contact lens hair dryer grooming"},
  {code:"U7",icon:"hanger",name:"Master Closet",job:"Adult clothing & accessories",
   items:["Seasonal clothing","Ski gear","Chacos","Suits","Ties","Dresses","Army uniforms","Formalwear","Shoes"],
   maybe:["Handbags","Belts","Jewelry organizer","Out-of-season shoes"],
   kw:"suit tie dress formalwear uniform ski gear chacos handbag belt jewelry out of season shoe adult clothing"},
  {code:"U8",icon:"hanger",name:"East Bedroom Closet",job:"That bedroom's personal storage",
   items:["Clothing","Shoes","Personal belongings","Bedroom keepsakes"],maybe:["Off-season clothing","Extra pillows","Hobby supplies","Board games"],
   kw:"clothing shoes personal item hobby supply extra pillow off season clothing bedroom closet"},

  {code:"O1",icon:"leaf",name:"Shed",job:"Yard & outdoor equipment",
   items:["Lawn tools","Outdoor games","Tarps","Outdoor fishing items","Garden gear"],
   maybe:["Wheelbarrow","Hose","Bike pump","Extension cords"],
   kw:"lawn tool rake shovel mower wheelbarrow hose bike pump garden tool outdoor game extension cord yard"},
  {code:"O2",icon:"flask",name:"Shed Chemical Cabinet",job:"Lawn & garden chemicals",
   items:["Roundup","Insect killer","Plant food","Grass seed","Yard products"],maybe:["Ice melt","Mosquito spray","Wood stain","Motor oil"],
   kw:"roundup weed killer insect killer fertilizer grass seed ice melt mosquito spray wood stain motor oil chemical"},
  {code:"O3",icon:"waves",name:"Pool Storage Enclosure",job:"Pool gear",
   items:["Pool bags","Pool accessories","Pool nets","Covers","Hot-tub filters","Pool filters","Pool-use equipment"],
   maybe:["Pool toys","Floaties","Pool towels","Skimmer net"],
   kw:"pool toy floatie pool towel skimmer net pool vacuum hot tub cover pool bag"},
  {code:"O4",icon:"container",name:"Pool Equipment / Seasonal Cabinet",job:"Outdoor pool accessories and label-approved seasonal supplies",
   items:["Pool testing accessories","Maintenance accessories","Small pool equipment"],maybe:["Skimmer parts","Hose fittings","Seasonal pool accessories"],
   kw:"pool equipment skimmer hose fitting testing accessory maintenance accessory seasonal pool"},
  {code:"O5",icon:"utensils",name:"Outdoor Kitchen Cabinet",job:"Outdoor entertaining supplies",
   items:["Outdoor serving pieces","Cups","Plates","Paper goods","Towels","Grilling backup supplies"],maybe:["Tablecloths","Citronella candles","Chair cushions"],
   kw:"tablecloth citronella candle outdoor cup outdoor plate chair cushion entertaining"},
  {code:"O6",icon:"flame",name:"Outdoor Kitchen Drawers",job:"Grilling tools",
   items:["Tongs","Spatulas","Thermometers","Skewers","Foil","Grill utensils"],maybe:["Grill brush","Meat thermometer","Grill cover","Charcoal"],
   kw:"grill brush meat thermometer grill cover charcoal tongs spatula skewer grilling"},
  {code:"O7",icon:"cup",name:"Outdoor Kitchen Fridge",job:"Outdoor food & drinks",
   items:["Drinks","Condiments","Cookout food"],maybe:["Extra condiments","Popsicles","Bottled water"],
   kw:"condiment popsicle bottled water outdoor drink"},
  {code:"O8",icon:"ice-cube",name:"Outdoor Kitchen Ice Maker",job:"Ice only",items:["Ice"],maybe:[],
   kw:"ice"}
];


const SUBLOCATIONS = [
  {code:"B1-A",location:"B1",name:"Shelves A · 1–8",notes:"Seasonal décor and holiday bins"},
  {code:"B1-B",location:"B1",name:"Shelves B · 9–16",notes:"Keepsakes, photos, kids memories"},
  {code:"B1-C",location:"B1",name:"Shelves C · 17–24",notes:"Office, craft, party, gift and household backups"},
  {code:"B1-D",location:"B1",name:"Network / security overhead",notes:"Router, NVR and house-system equipment only"},
  {code:"B2-A",location:"B2",name:"Filter shelf",notes:"HVAC, humidifier and house-system filters"},
  {code:"B2-B",location:"B2",name:"System parts / manuals",notes:"House-system replacement parts, manuals and maintenance pieces"},
  {code:"B3-A",location:"B3",name:"Vanity",notes:"Basement bathroom supplies"},
  {code:"B4-A",location:"B4",name:"Upper cabinets",notes:"Lighter specialty kitchen items"},
  {code:"B4-B",location:"B4",name:"Base cabinets",notes:"Large specialty appliances and cookware"},
  {code:"B4-C",location:"B4",name:"Drawers",notes:"Smaller kitchen tools and accessories"},
  {code:"B4-D",location:"B4",name:"Pull-outs",notes:"Accessible specialty kitchen storage"},
  {code:"B5-A",location:"B5",name:"Peninsula cabinets",notes:"Entertaining and serving overflow"},
  {code:"B5-B",location:"B5",name:"Food-storage overflow",notes:"Extra Rubberware, bento boxes, lids and party food-storage pieces"},
  {code:"B6-A",location:"B6",name:"Luggage zone",notes:"Suitcases, travel bags and packing accessories"},
  {code:"B6-B",location:"B6",name:"Camping sleep gear",notes:"Sleeping bags, cots and soft camping gear"},
  {code:"B6-C",location:"B6",name:"Camping / adventure gear",notes:"Pumps, slackline, camp kitchen and outdoor travel gear"},
  {code:"B7-A",location:"B7",name:"Documents",notes:"Passports, checkbooks and important records"},
  {code:"B7-B",location:"B7",name:"Valuables / backups",notes:"Small valuables, spare keys and secure backups"},
  {code:"M1-A",location:"M1",name:"Appliance lift",notes:"KitchenAid"},
  {code:"M1-B",location:"M1",name:"Cooktop drawers",notes:"Cooking tools and utensils"},
  {code:"M1-C",location:"M1",name:"Cooktop base cabinets",notes:"Everyday pots and pans"},
  {code:"M1-D",location:"M1",name:"Sink base",notes:"Dish and sink supplies"},
  {code:"M1-E",location:"M1",name:"Island drawers",notes:"Everyday utensils and prep tools"},
  {code:"M1-F",location:"M1",name:"Food storage / Rubberware",notes:"Everyday Rubbermaid, Tupperware, food containers and matching lids"},
  {code:"M1-G",location:"M1",name:"Vertical dividers",notes:"Cutting boards and sheet pans"},
  {code:"M1-H",location:"M1",name:"Baking Corner · Left Cabinet",notes:"Bread-making bowls, proofing gear, baking pans and heavier baking equipment beside the sink"},
  {code:"M1-L",location:"M1",name:"Baking Corner · Pull-Out Drawers",notes:"Small bread and baking tools kept directly under the baking counter"},
  {code:"M1-I",location:"M1",name:"Upper cabinets",notes:"Dishware and lighter kitchen items"},
  {code:"M1-J",location:"M1",name:"High cabinets",notes:"Rarely used kitchen items"},
  {code:"M1-K",location:"M1",name:"Fridge-side storage",notes:"Fridge filters and food-related backups"},
  {code:"M2-A",location:"M2",name:"Shallow shelves",notes:"Everyday food and easy-to-see pantry staples"},
  {code:"M2-B",location:"M2",name:"Deep shelves",notes:"Bulk food and backstock in labeled bins"},
  {code:"M2-C",location:"M2",name:"Lower / floor area",notes:"Drinks and large pantry items"},
  {code:"M3-A",location:"M3",name:"Hanging rail",notes:"Coats and jackets"},
  {code:"M3-B",location:"M3",name:"Shelf stack",notes:"Hats, gloves, scarves and grab-and-go items"},
  {code:"M3-C",location:"M3",name:"Floor / shoe area",notes:"Shoes and boots"},
  {code:"M4-A",location:"M4",name:"Vanity",notes:"Guest and main-floor bathroom supplies"},
  {code:"M5-A",location:"M5",name:"Tall cabinet · shelves",notes:"Spa/pool supplies whose labels permit conditioned indoor storage"},
  {code:"M5-B",location:"M5",name:"Tall cabinet · drawers",notes:"Pool/spa testing gear and accessories"},
  {code:"M5-C",location:"M5",name:"Above washer / dryer",notes:"Rarely used lightweight backups only"},
  {code:"M5-D",location:"M5",name:"Upper left of sink",notes:"Cleaning supplies"},
  {code:"M5-E",location:"M5",name:"Upper right of sink",notes:"Household backups and utility supplies"},
  {code:"M5-F",location:"M5",name:"Left sink drawers",notes:"Cleaning tools and rags"},
  {code:"M5-G",location:"M5",name:"Right sink drawers",notes:"Laundry and garment care"},
  {code:"M5-H",location:"M5",name:"Under sink",notes:"Sink-related cleaning only; keep sparse"},
  {code:"M5-I",location:"M5",name:"Lower cabinets",notes:"Pool towels, cleaning towels and bulky cleaning gear"},
  {code:"M6-A",location:"M6",name:"Left built-in bank",notes:"Board games and family games"},
  {code:"M6-B",location:"M6",name:"Right built-in bank",notes:"Books and recreation"},
  {code:"M6-C",location:"M6",name:"Lower storage",notes:"Kids games, costumes and laser tag"},
  {code:"G1-A",location:"G1",name:"Pegboard / worktop",notes:"Frequently used hand tools and active projects"},
  {code:"G1-B",location:"G1",name:"Upper cabinets",notes:"Lightweight repair supplies and less-used tools"},
  {code:"G1-C",location:"G1",name:"Drawer 1",notes:"Small hand tools"},
  {code:"G1-D",location:"G1",name:"Drawer 2",notes:"Measuring, bits and blades"},
  {code:"G1-E",location:"G1",name:"Drawer 3",notes:"Hardware and repair pieces"},
  {code:"G1-F",location:"G1",name:"Drawer 4",notes:"Tool accessories and overflow"},
  {code:"G1-G",location:"G1",name:"Left lower cabinet",notes:"Power tools and larger cases"},
  {code:"G1-H",location:"G1",name:"Right lower cabinet",notes:"Larger repair and tool gear"},
  {code:"G2-A",location:"G2",name:"Upper shelf",notes:"Smaller outdoor/recreation gear"},
  {code:"G2-B",location:"G2",name:"Open center",notes:"Tall or awkward recreation gear"},
  {code:"G2-C",location:"G2",name:"Lower shelf",notes:"Heavier outdoor/recreation gear"},
  {code:"G3-A",location:"G3",name:"Upper shelf",notes:"Quick-grab garage supplies"},
  {code:"G3-B",location:"G3",name:"Lower shelf",notes:"Heavier quick-grab supplies"},
  {code:"G4-A",location:"G4",name:"Refrigerator",notes:"Drinks and refrigerated overflow"},
  {code:"G4-B",location:"G4",name:"Freezer",notes:"Frozen food and bulk meat"},
  {code:"G5-A",location:"G5",name:"Upper shelf",notes:"Lighter bulky-garage accessories"},
  {code:"G5-B",location:"G5",name:"Open center",notes:"Awkward or tall garage gear"},
  {code:"G5-C",location:"G5",name:"Lower shelf",notes:"Heavy bulky garage gear"},
  {code:"U1-A",location:"U1",name:"Shelves",notes:"Folded clothes and personal storage"},
  {code:"U1-B",location:"U1",name:"Hanging section",notes:"Hanging clothes"},
  {code:"U1-C",location:"U1",name:"Floor area",notes:"Shoes and bulky bedroom items"},
  {code:"U2-A",location:"U2",name:"Tall cabinet",notes:"Towels and bathroom backups"},
  {code:"U2-B",location:"U2",name:"Vanity drawers / cabinets",notes:"Daily family bathroom items"},
  {code:"U2-C",location:"U2",name:"Under sink",notes:"Bathroom cleaning supplies"},
  {code:"U3-A",location:"U3",name:"Shelves",notes:"Personal tech and charging station"},
  {code:"U3-B",location:"U3",name:"Drawers",notes:"Cords, chargers, headphones and small tech"},
  {code:"U4-A",location:"U4",name:"Left window drawer",notes:"Sheets"},
  {code:"U4-B",location:"U4",name:"Center window drawer",notes:"Blankets and throws"},
  {code:"U4-C",location:"U4",name:"Right window drawer",notes:"Comforters and bulky soft goods"},
  {code:"U5-A",location:"U5",name:"Shelves",notes:"Sleep and comfort devices"},
  {code:"U5-B",location:"U5",name:"Drawers",notes:"Bedroom comfort accessories and backups"},
  {code:"U6-A",location:"U6",name:"Left vanity",notes:"Daily grooming"},
  {code:"U6-B",location:"U6",name:"Center drawers",notes:"Hair and skincare"},
  {code:"U6-C",location:"U6",name:"Right vanity",notes:"Daily personal care"},
  {code:"U6-D",location:"U6",name:"Under-sink storage",notes:"Bathroom backups"},
  {code:"U7-A",location:"U7",name:"Hanging sections",notes:"Everyday clothes, formalwear and uniforms"},
  {code:"U7-B",location:"U7",name:"Left drawer bank",notes:"Folded clothes"},
  {code:"U7-C",location:"U7",name:"Right drawer bank",notes:"Folded clothes"},
  {code:"U7-D",location:"U7",name:"Corner shelf tower",notes:"Shoes and accessories"},
  {code:"U7-E",location:"U7",name:"Above washer / dryer",notes:"Lightweight laundry backups"},
  {code:"U7-F",location:"U7",name:"Sink cabinets",notes:"Clothing care and laundry supplies"},
  {code:"U8-A",location:"U8",name:"Shelves",notes:"Folded clothes and personal storage"},
  {code:"U8-B",location:"U8",name:"Hanging section",notes:"Hanging clothes"},
  {code:"U8-C",location:"U8",name:"Floor area",notes:"Shoes and bulky bedroom items"},
  {code:"O1-A",location:"O1",name:"Long FastTrack rail",notes:"Frequently used yard tools"},
  {code:"O1-B",location:"O1",name:"Short FastTrack rail",notes:"Smaller hanging outdoor gear"},
  {code:"O1-C",location:"O1",name:"Workbench",notes:"Outdoor projects and tool staging"},
  {code:"O1-D",location:"O1",name:"Wall cabinet",notes:"Small outdoor supplies"},
  {code:"O1-E",location:"O1",name:"Floor / bulk area",notes:"Large yard and outdoor equipment"},
  {code:"O2-A",location:"O2",name:"Lawn / weed control",notes:"Lawn and weed-control products in original containers"},
  {code:"O2-B",location:"O2",name:"Garden / plant care",notes:"Plant food, grass seed and garden-care products"},
  {code:"O4-A",location:"O4",name:"Testing & small equipment",notes:"Pool testing accessories and small maintenance equipment"},
  {code:"O4-B",location:"O4",name:"Seasonal fittings",notes:"Hose fittings, skimmer parts and seasonal pool accessories"},
  {code:"O3-A",location:"O3",name:"Open bulk area",notes:"Pool gear, covers, toys and bulky accessories"},
  {code:"O3-B",location:"O3",name:"Filter / equipment area",notes:"Pool and hot-tub filters and equipment"},
  {code:"O5-A",location:"O5",name:"Tall cabinet shelves",notes:"Outdoor serving and entertaining supplies"},
  {code:"O6-A",location:"O6",name:"Drawer 1",notes:"Grill tools"},
  {code:"O6-B",location:"O6",name:"Drawer 2",notes:"Thermometers, skewers and small accessories"},
  {code:"O6-C",location:"O6",name:"Drawer 3",notes:"Foil and grilling backups"}
];

const SUBLOCATION_ITEMS = {
  "B1-A":["Stocking hangers","Christmas lights","Ornaments","Christmas tree apron / tree skirt","Nativity","Stockings","Christmas toilet seat cover","Harry Potter village set boxes","Decorative lanterns"],
  "B1-B":["Norway memories","Journals","Annie childhood school memories","Encouraging notes","Decorated mug and plates","Frames","Pictures","Photo albums","Family notes","Kids memories","Childhood artwork","School projects","Baby photos","Milestone keepsakes","Kids crafts"],
  "B1-C":["Stapler","Hole punchers","Folders","Paper","Scotch tape","Craft paints","Paint brushes","Post-it notes","Postcards","Highlighters","Dry erase markers","Rubber bands","Trapper Keepers","Construction paper","Dry erase boards","Shredder","Musical instrument tuners","Paper slicer / cutter","Party bags","Tissue paper","Treat bags","Teacher delivery box","Gift bags","Power cords","Wireless USB adapter","Stereo wires","Older laptops / Chromebook","Headphones","iPad holder","Wireless controller","Apple TV","HDMI cords","Ziploc bags","Sandwich bags","Gallon bags","Vacuum seal bags","Lightbulbs","Nightlight bulbs","Switches","Space-saver bags","Space heater","Indoor grow light"],
  "B2-A":["Air filter","Humidifier filter","Miscellaneous house filter"],
  "B2-B":["House-system replacement parts","Appliance maintenance pieces"],
  "B4-A":["Spice grinder","Coffee grinder","Cookie cutter set","Tortilla maker","Onion chopper","Vegetable chopper"],
  "B4-B":["Stock pot","Steaming basket","Sous vide container","Fondue pot","Wok","Electric griddle","Griddle grill","Panini maker","Roasting pan","Waffle griddle","Roasting tins","Food processor","Extra pans","Blender","Ice cream maker","Pressure cooker","Slow cookers / crockpots","Keurig","Coffee maker","Roaster","Hawaiian shaved-ice machine","Waffle maker","Electric skillet"],
  "B4-C":["Kitchen tools","Specialty cooking utensils"],
  "B5-A":["Hosting bowls","Serving trays","Plasticware","Paper bowls","Plastic cups","Paper plates","Party trays","Charcuterie tray","Wine-making equipment","CO₂ tank"],
  "B5-B":["Extra Tupperware / Rubberware","Extra bento boxes","Container dividers","Extra food containers","Reusable lunch containers","Party-size food-storage pieces"],
  "B6-A":["Suitcases","Travel bags","Packing cubes","Camera bag used for travel"],
  "B6-B":["Sleep sack","Cots","Sleeping bags","Compression bag"],
  "B6-C":["Backpack","Slackline","Inflatable pump","Travel cooking gear","Camping gear","Hiking gear"],
  "B7-A":["Passports","Important documents","Checkbooks"],
  "M1-A":["KitchenAid"],
  "M1-F":["Tupperware / Rubberware","Bento boxes","Container dividers","Food containers","Reusable containers","Lunch containers"],
  "M1-G":["Sheet pans","Flat baking pieces"],
  "M1-H":["Baking tins","Roasting tins","Cookie cutter set","Large mixing bowls"],
  "M1-L":["Measuring cups","Measuring spoons","Small baking tools"],
  "M1-K":["Fridge filter"],
  "M3-B":["Gloves","Hats","Scarves","Umbrella"],
  "M3-C":["Shoes"],
  "M5-A":["Hot-tub chemicals (only if each product label permits conditioned indoor storage)"],
  "M5-B":["Pool accessories","Pool testing accessories"],
  "M5-D":["Simple Green","OxiClean","Febreze","Contact cleaner","Glass cleaner","Shout","Pledge","Wood cleaner","Carpet cleaner","Upholstery cleaner","Toilet bowl cleaner","Mrs. Meyer's cleaner","Multipurpose spray","Disinfectant spray","Vinyl cleaner"],
  "M5-E":["Paper towels","Household backup bags","Washer replacement / maintenance pieces"],
  "M5-F":["Rags","Norwex duster"],
  "M5-G":["Detergent","Dryer sheets","Iron","Sweater shaver","Fabric protection products"],
  "M5-I":["Beach towels","Pool towels","Bulky cleaning supplies"],
  "M6-A":["Pokémon cards","Puzzles"],
  "M6-B":["Escape-room items","Collectible / hobby items"],
  "M6-C":["Dress-up clothes","Costume shoes","Costumes","Masks","Boxing gloves","Toy sword","Laser tag equipment"],
  "G1-A":["Frequently used hand tools"],
  "G1-C":["Small screwdriver","Glasses repair screwdriver","Small hand tools"],
  "G1-D":["Level","Stud finder","Utility blades","Tire gauge"],
  "G1-E":["Nuts","Washers","Brackets","O-rings","Metric bolts","Metric screws","Small screws","Staples","Nails","Wall anchors","Large anchor screws","Micro screws","Watch screws","Glasses screws","Tire valve","Tire pump valve","Spark plug","Upholstery buttons"],
  "G1-F":["Bungee cords","Shelving accessories","Car paint pens","Electrical tape","Cable concealer","Gaffer tape","Adhesive","Silicone caulk","Magnet adhesive","Waterproof tape","Vacuum parts","Submersible pump accessories","Drum liner bags","Painter's tape","Spackling","Drywall-repair supplies"],
  "G1-G":["Reciprocating saw","Skill saw","Sander","Power-tool cases"],
  "G1-H":["Shoulder dolly","Larger repair gear"],
  "G2-A":["Tacklebox","Fishing accessories","Can Jam","Spikeball"],
  "G2-B":["Fishing net","Waders"],
  "G2-C":["Fishing gear","Heavier outdoor recreation gear"],
  "G5-A":["Tarp / waterproof cover"],
  "G5-B":["Awkward bulky garage gear"],
  "U3-A":["Tablets","Kindle","Laptops","Camera","Camera lenses","Gameboy","Portable speaker"],
  "U3-B":["USB-C cords","Micro-USB cords","HDMI cords","Charging blocks","Smart plugs","Charging station","Headphones","Earbuds","Headlamps","Waterproof phone case","Batteries","Nightlight","Camera charger","Mouse","Watch batteries"],
  "U4-A":["Fitted sheets","Sheets","Pillowcases","Mattress cover"],
  "U4-B":["Blankets","Egyptian blankets","Throws"],
  "U4-C":["Comforters","Bed covers","Quilts","Bulky bedding"],
  "U5-A":["Noisemakers / sound machines","White-noise devices","Humidifiers","Diffusers"],
  "U5-B":["Sleep accessories","Diffuser accessories"],
  "U6-A":["Toothbrush heads","Toothbrush chargers","Stone file","Combs","Scissors","Hair scissors","Deodorant","Cologne","Hair clippers","Scalp massager"],
  "U6-B":["Rubbing alcohol","Listerine","Lotion","Hair supplies","Hairspray","Gel","Elsie's hair supplies","Q-tips","Sunblock","Lotions","Scrubs","Annie's fragrance","Skin care","Makeup"],
  "U6-C":["Maxi pads","Tampons","Supplements","Vitamins","Capsules","Powders","Capsule maker"],
  "U6-D":["Blow dryer","Hair dye","Nail-polish remover","Nail supplies","Extra loofah","Floss sticks","Chapstick","Bobby pins","Nail clippers","Hair ties"],
  "U7-A":["Suits","Ties","Dresses","Army uniforms","Formalwear"],
  "U7-B":["Seasonal folded clothing","Ski socks","Down vest"],
  "U7-D":["Ski gloves","Ski mask","Chaco sandals","Seasonal accessories"],
  "O2-A":["Roundup / weed killer","Insect killer"],
  "O2-B":["All-purpose plant food","Grass seed"],
  "O3-A":["Pool bag","Beach bag","Pool accessories","Pool-use gear"],
  "O3-B":["Hot-tub filter"],
  "O4-A":["Pool testing accessories","Small pool maintenance accessories"],
  "O4-B":["Pool fittings / seasonal accessories"],
  "O5-A":["Outdoor serving pieces","Outdoor cups / plates when moved outside for the season"],
  "O6-A":["Grill tools"],
  "O6-B":["Thermometers","Skewers"],
  "O6-C":["Foil and grill backups"]
};

const SUBLOCATION_SUGGESTIONS = {
  "B1-A":["Halloween décor","Easter décor","Thanksgiving décor","Wreaths","Garlands","Seasonal table décor","Holiday extension cords"],
  "B1-B":["Old yearbooks","Wedding keepsakes","Baby books","Diplomas","Awards","Scrapbooks","Printed family photos"],
  "B1-C":["Wrapping paper","Ribbon","Greeting cards","Extra printer paper","Binders","Craft glue","Gift boxes","Spare batteries","Extra household bulbs"],
  "B1-D":["Router","Network switch","NVR","UPS battery backup","Ethernet patch cables","Smart-home hubs"],
  "B2-A":["Furnace filters","Air purifier filters","Water filters used by house systems"],
  "B2-B":["Sump-pump parts","Water-softener supplies","Thermostat accessories","Appliance manuals","Warranty paperwork"],
  "B3-A":["Toilet paper","Hand soap","Plunger","Toilet brush","Guest towels","Air freshener"],
  "B4-A":["Pasta maker","Mandoline","Immersion blender accessories","Specialty measuring tools"],
  "B4-B":["Bread machine","Large Dutch oven","Turkey roaster","Pressure canner","Large serving cookware"],
  "B4-C":["Measuring cups","Measuring spoons","Thermometers","Specialty whisks","Pastry tools"],
  "B4-D":["Frequently used specialty appliances","Heavy mixing bowls","Large prep containers"],
  "B5-A":["Punch bowl","Drink dispenser","Chafing dishes","Serving platters","Disposable cutlery"],
  "B5-B":["Spare lids","Meal-prep containers","Large party containers","Cooler inserts"],
  "B6-A":["Duffel bags","Travel pillows","Neck pillows","Luggage scales","Packing organizers"],
  "B6-B":["Sleeping pads","Camping blankets","Camp pillows"],
  "B6-C":["Tent","Camp chairs","Camping stove","Camp cookware","Hiking backpacks","Lanterns"],
  "B7-A":["Birth certificates","Social Security cards","Will / estate papers","Vehicle titles","Home deed copies","Insurance records"],
  "B7-B":["Jewelry","Backup hard drives","Spare house keys","Emergency cash"],
  "M1-A":["Mixer attachments","Dough hook","Whisk attachment","Paddle attachment"],
  "M1-B":["Spatulas","Wooden spoons","Tongs","Ladles","Peelers","Can opener"],
  "M1-C":["Saucepans","Frying pans","Dutch oven","Lids","Everyday stock pot"],
  "M1-D":["Dish soap","Dishwasher tabs","Sponges","Sink brush","Dish towels"],
  "M1-E":["Flatware","Measuring spoons","Kitchen scissors","Prep gadgets"],
  "M1-F":["Everyday leftovers containers","Matching lids","Snack containers","Lunch prep containers"],
  "M1-G":["Cutting boards","Sheet pans","Cooling racks","Pizza pans"],
  "M1-H":["Loaf pans","Dutch oven for bread","Proofing baskets / bannetons","Large mixing bowls","Cooling racks","Sheet pans","Baking mats","Bread storage container"],
  "M1-L":["Kitchen scale","Bench scraper","Dough whisk","Bread lame / scoring blades","Instant-read thermometer","Measuring cups","Measuring spoons","Pastry brush","Rolling pin","Parchment paper","Reusable bowl covers","Dough proofing cloths"],
  "M1-I":["Plates","Bowls","Glasses","Mugs","Everyday serving bowls"],
  "M1-J":["Holiday serving pieces","Specialty glassware","Rarely used dishes"],
  "M1-K":["Fridge filters","Water-filter backups","Food-storage accessories"],
  "M2-A":["Cereal","Snacks","Pasta","Rice","Canned goods","Coffee","Tea"],
  "M2-B":["Bulk flour","Sugar","Bulk snacks","Extra canned goods","Backstock condiments"],
  "M2-C":["Cases of drinks","Paper towels","Large pantry appliances","Bulk pet or household consumables"],
  "M3-A":["Coats","Light jackets","Rain jackets"],
  "M3-B":["Sunglasses","Reusable shopping bags","Sunscreen","Dog leashes","Backpacks"],
  "M3-C":["Boots","Everyday shoes","Slippers"],
  "M4-A":["Guest hand towels","Hand lotion","Extra soap","Bathroom cleaner","Air freshener"],
  "M5-A":["Label-approved spa chemicals","Sealed maintenance products approved for indoor conditioned storage"],
  "M5-B":["Test strips","Spa thermometer","Filter-cleaning accessories","Small pool brushes"],
  "M5-C":["Extra paper goods","Lightweight household refills","Seasonal laundry backups"],
  "M5-D":["Bathroom cleaner","Stainless cleaner","Stone cleaner","Disinfecting wipes"],
  "M5-E":["Trash bags","Dish soap refills","Hand-soap refills","Light bulbs","Batteries"],
  "M5-F":["Microfiber cloths","Scrub brushes","Dusting tools","Magic erasers"],
  "M5-G":["Stain remover","Lint rollers","Garment bags","Ironing accessories"],
  "M5-H":["Dish gloves","Small sink caddy","Pipe-safe drain tools"],
  "M5-I":["Pool towels","Cleaning towels","Mop heads","Bulky cleaning tools"],
  "M6-A":["Board games","Playing cards","Dice games","Family puzzles"],
  "M6-B":["Books","Remote controls","Game accessories","Family photo books"],
  "M6-C":["LEGO bins","Dress-up accessories","Nerf gear","Indoor active-play toys"],
  "G1-A":["Hammer","Screwdrivers","Pliers","Adjustable wrench","Tape measure"],
  "G1-B":["Safety glasses","Work gloves","Lubricants","Tool manuals"],
  "G1-C":["Hex keys","Precision screwdrivers","Small pliers"],
  "G1-D":["Drill bits","Saw blades","Measuring tape","Squares"],
  "G1-E":["Picture-hanging hardware","Hooks","Drywall anchors","Machine screws"],
  "G1-F":["Glue gun","Staple gun","Caulk gun","Heat gun accessories"],
  "G1-G":["Drill","Impact driver","Circular saw","Battery chargers"],
  "G1-H":["Shop vacuum accessories","Jacks","Large clamps"],
  "G2-A":["Fishing licenses","Reels","Lures","Bike helmets","Sports balls"],
  "G2-B":["Life jackets","Long-handled nets","Fishing rods"],
  "G2-C":["Heavy tackle bags","Portable sports gear","Outdoor game bases"],
  "G3-A":["Bug spray","Sunscreen","Gardening gloves","Flashlights"],
  "G3-B":["Small extension cords","Outdoor wipes","Work towels"],
  "G4-A":["Cookout drinks","Extra milk","Party beverages","Condiments"],
  "G4-B":["Bulk meat","Frozen meals","Holiday leftovers","Party ice"],
  "G5-A":["Car-care towels","Small covers","Tie-down straps"],
  "G5-B":["Car ramps","Tall automotive gear","Folding equipment"],
  "G5-C":["Snow shovel","Heavy automotive supplies","Large seasonal gear"],
  "U1-A":["Folded clothes","Off-season clothes","Small hobby bins"],
  "U1-B":["Shirts","Jackets","Dress clothes"],
  "U1-C":["Shoes","Extra pillows","Small luggage"],
  "U2-A":["Bath towels","Hand towels","Extra toilet paper","Spare toiletries"],
  "U2-B":["Daily shampoo","Soap","Toothpaste","Nail clippers"],
  "U2-C":["Bathroom cleaner","Toilet cleaner","Spare trash bags"],
  "U3-A":["Tablet stands","Camera gear","Game controllers","Tech cases"],
  "U3-B":["Charging cables","Spare adapters","SD cards","Battery packs"],
  "U4-A":["Sheet sets","Pillowcases","Mattress protectors"],
  "U4-B":["Throws","Light blankets","Electric blankets"],
  "U4-C":["Comforters","Duvets","Extra pillows"],
  "U5-A":["Air purifier","White-noise machines","Humidifiers","Diffusers"],
  "U5-B":["Sleep masks","Diffuser refills","Night lights","Extra humidifier parts"],
  "U6-A":["Electric razor","Trimmer guards","Daily cologne","Daily deodorant"],
  "U6-B":["Daily skincare","Hair products","Makeup","Contact solution"],
  "U6-C":["First-aid basics","Personal-care backups","Travel toiletries"],
  "U6-D":["Hair dryer","Curling iron","Nail kit","Extra grooming tools"],
  "U7-A":["Everyday hanging clothes","Formalwear","Military uniforms"],
  "U7-B":["T-shirts","Shorts","Workout clothes"],
  "U7-C":["Sweaters","Jeans","Pajamas"],
  "U7-D":["Belts","Handbags","Shoes","Hats"],
  "U7-E":["Laundry refills","Extra hangers","Garment bags"],
  "U7-F":["Delicates wash","Stain tools","Ironing supplies"],
  "U8-A":["Folded clothes","Off-season clothes","Personal storage bins"],
  "U8-B":["Hanging clothes","Dress clothes"],
  "U8-C":["Shoes","Extra pillows","Hobby gear"],
  "O1-A":["Rake","Shovel","Broom","Long-handled garden tools"],
  "O1-B":["Hand pruners","Small garden tools","Extension cords"],
  "O1-C":["Outdoor repair tools","Potting supplies","Project staging"],
  "O1-D":["Plant ties","Garden gloves","Hose nozzles","Small outdoor hardware"],
  "O1-E":["Wheelbarrow","Hose reel","Large yard equipment","Outdoor games"],
  "O2-A":["Pre-emergent","Weed killer","Insect control products"],
  "O2-B":["Fertilizer","Plant food","Grass seed","Soil amendments"],
  "O3-A":["Pool toys","Floaties","Vacuum hose","Skimmer net","Pool cover accessories"],
  "O3-B":["Replacement filters","Pump accessories","Pool vacuum parts"],
  "O4-A":["Test kit","Test-strip backups","Small skimmer parts","Brush heads"],
  "O4-B":["Hose adapters","Winter plugs","Fittings","Seasonal caps"],
  "O5-A":["Outdoor tablecloth","Citronella candles","Serving trays","Outdoor paper goods"],
  "O6-A":["Tongs","Spatulas","Grill brush"],
  "O6-B":["Meat thermometer","Skewers","Injector","Basting brush"],
  "O6-C":["Foil","Butcher paper","Grill gloves","Disposable drip pans"]
};
function suggestedItemsForSub(subCode){ return SUBLOCATION_SUGGESTIONS[subCode] || []; }

const SUBLOCATION_REVIEW = {
  "B1-C":["Fireworks are listed in the old inventory, but they are intentionally not assigned to a storage location here. Choose storage that follows the product label, local rules, and fire-safety guidance."]
};
function plannedItemsForSub(subCode){ return SUBLOCATION_ITEMS[subCode] || []; }

const sublocByCode = Object.fromEntries(SUBLOCATIONS.map(x=>[x.code,x]));
function sublocationsFor(locationCode){ return SUBLOCATIONS.filter(x=>x.location===locationCode); }


const MOVING_STEPS = [
  {id:"mv-kitchen",title:"Kitchen & pantry",why:"Start here. These are the highest-use spaces on day one.",codes:["M1","M2"]},
  {id:"mv-laundry",title:"Laundry room",why:"Set the cleaning and laundry homes before random supplies spread through the house.",codes:["M5"]},
  {id:"mv-baths",title:"Bathrooms",why:"Make every bathroom functional before unpacking decorative or long-term items.",codes:["M4","U2","U6","B3"]},
  {id:"mv-bedrooms",title:"Bedrooms & master closet",why:"Give clothes, linens, tech, and sleep items a home early.",codes:["U1","U3","U4","U5","U7","U8"]},
  {id:"mv-entry",title:"Entry coat closet",why:"Create one landing zone for shoes, coats, bags, hats, gloves, and umbrellas.",codes:["M3"]},
  {id:"mv-garage",title:"Garage",why:"Keep the workbench as staging until categories are visible, then place tools and bulky gear.",codes:["G1","G2","G3","G5"]},
  {id:"mv-basement-kitchen",title:"Basement kitchen & peninsula",why:"Move specialty appliances and entertaining overflow out of the main kitchen.",codes:["B4","B5"]},
  {id:"mv-bulk",title:"Under-stairs & basement storage",why:"Do bulky, seasonal, sentimental, and long-term storage after daily-use rooms are settled.",codes:["B6","B1","B2","B7"]},
  {id:"mv-game",title:"Game room",why:"Finish recreation storage once the practical rooms are working.",codes:["M6"]},
  {id:"mv-outdoor",title:"Shed, pool & outdoor kitchen",why:"Last pass: outdoor gear, pool equipment, grilling, and yard supplies.",codes:["O1","O2","O3","O4","O5","O6","O7","O8"]}
];
let movingProgress = (()=>{ try{return JSON.parse(localStorage.getItem("wil-moving-progress")||"{}");}catch{return {};} })();
let movingExpanded = false;

function saveMovingProgress(){
  saveJSON("wil-moving-progress", movingProgress);
  cloudSyncMovingSoon();
}

function movingStickyRows(step){
  const rows = [];
  step.codes.forEach(code=>{
    const loc = byCode[code] || RAW_LOCATIONS.find(l=>l.code===code);
    const subs = sublocationsFor(code);
    if(subs.length){
      subs.forEach(sub=>rows.push({code:sub.code,label:sub.name,what:sub.notes}));
    }else if(loc){
      rows.push({code,label:loc.name,what:loc.job});
    }
  });
  return rows;
}

function renderMoving(){
  const mode = $("#movingMode");
  const body = $("#movingBody");
  if(!mode || !body) return;

  const doneCount = MOVING_STEPS.filter(s=>movingProgress[s.id]).length;
  const next = MOVING_STEPS.find(s=>!movingProgress[s.id]);
  const pct = Math.round(doneCount / MOVING_STEPS.length * 100);

  if(doneCount === MOVING_STEPS.length){
    mode.hidden = true;
    return;
  }

  mode.hidden = false;
  body.hidden = !movingExpanded;
  $("#movingToggle").setAttribute("aria-expanded", movingExpanded ? "true" : "false");
  $("#movingModeSub").textContent = `${doneCount}/${MOVING_STEPS.length} areas complete · ${next ? "Next: " + next.title : ""}`;

  $("#movingNext").innerHTML = next ? `
    <div class="moving-next">
      <div class="eyebrow">Start here · Step ${MOVING_STEPS.indexOf(next)+1}</div>
      <h3>${esc(next.title)}</h3>
      <p>${esc(next.why)}</p>
      <div class="moving-progress" aria-label="${pct}% complete"><span style="width:${pct}%"></span></div>
    </div>` :
    `<div class="moving-next"><div class="eyebrow">Moving setup complete</div><h3>Every zone has a starting plan.</h3><p>Now use Search whenever you are holding something and want its exact home.</p><div class="moving-progress"><span style="width:100%"></span></div></div>`;

  $("#movingSteps").innerHTML = MOVING_STEPS.map((step,idx)=>{
    const done = !!movingProgress[step.id];
    const rows = movingStickyRows(step);
    return `
      <div class="move-step ${done?"done":""}">
        <div class="move-step-head">
          <input class="move-step-check" type="checkbox" data-moving-check="${step.id}" ${done?"checked":""} aria-label="Mark ${esc(step.title)} complete">
          <div class="move-step-title"><b>${esc(step.title)}</b><small>${esc(step.why)}</small></div>
          <span class="move-step-num">${idx+1}/${MOVING_STEPS.length}</span>
        </div>
        <div class="move-step-body">
          <ul class="sticky-list">${rows.map(r=>`<li><span class="sticky-code">${esc(r.code)}</span><span><b>${esc(r.label)}</b> → ${esc(r.what)}</span></li>`).join("")}</ul>
          <div class="move-actions">${step.codes.map(code=>`<button type="button" class="move-open" data-moving-open="${code}">Open ${code}</button>`).join("")}</div>
        </div>
      </div>`;
  }).join("") + (next ? "" : `<div class="moving-done">Nice. Moving Mode can stay here as your permanent setup history.</div>`);
}

document.getElementById("movingToggle").addEventListener("click", ()=>{
  movingExpanded = !movingExpanded;
  renderMoving();
});
document.getElementById("movingMode").addEventListener("change", e=>{
  const cb = e.target.closest("[data-moving-check]");
  if(!cb) return;
  movingProgress[cb.dataset.movingCheck] = cb.checked;
  saveMovingProgress();
  renderMoving();
});
document.getElementById("movingMode").addEventListener("click", e=>{
  const b = e.target.closest("[data-moving-open]");
  if(!b) return;
  openSheet(b.dataset.movingOpen);
});


/* ---------- item ids + relocation + custom filings ---------- */
RAW_LOCATIONS.forEach(loc=>{
  loc.items = loc.items.map((text,idx)=>({id:`${loc.code}__${idx}`, text, origin:loc.code}));
});
let itemsById = {};
function originOf(id){ return itemsById[id] ? itemsById[id].origin : null; }

function loadJSON(key, fallback){
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch(e){ return fallback; }
}
function saveJSON(key, val){
  try { localStorage.setItem(key, JSON.stringify(val)); } catch(e){ /* not persisted this session */ }
}
let moves = loadJSON("wil-moves", {});
let subMoves = loadJSON("wil-submoves", {});
let customItems = loadJSON("wil-custom", []); // [{id,text,origin}]
function saveMoves(){ saveJSON("wil-moves", moves); saveJSON("wil-submoves", subMoves); cloudSyncItemsSoon(); }
function saveCustom(){ saveJSON("wil-custom", customItems); cloudSyncItemsSoon(); }
function addCustomItem(text, code){
  const id = `custom__${Date.now()}${Math.random().toString(36).slice(2,6)}`;
  customItems.push({id, text, origin:code});
  saveCustom();
  rebuild();
  if(typeof renderHomeStats==="function") renderHomeStats();
}

let LOCATIONS = [];
let byCode = {};
function rebuild(){
  const map = {};
  RAW_LOCATIONS.forEach(loc=>{ map[loc.code] = {code:loc.code, icon:loc.icon, name:loc.name, job:loc.job, kw:loc.kw, maybe:loc.maybe, items:[]}; });
  itemsById = {};
  [...RAW_LOCATIONS.flatMap(loc=>loc.items), ...customItems].forEach(it=>{
    itemsById[it.id] = it;
    const dest = (moves[it.id] && map[moves[it.id]]) ? moves[it.id] : it.origin;
    (map[dest] || map[it.origin]).items.push(it);
  });
  byCode = map;
  LOCATIONS = RAW_LOCATIONS.map(loc=>map[loc.code]);
}
rebuild();

const QUICK = ["Passports","Christmas décor","Chargers","Toilet paper","Suitcases","Tools","Pool chemicals","Batteries"];
const RULES = [
  ["wrench","Tools & hardware",["G1"]],
  ["droplet","Cleaning & laundry",["M5"]],
  ["pot","Extra kitchen stuff",["B4","B5"]],
  ["suitcase","Camping & luggage",["B6"]],
  ["waves","Pool gear & chemicals",["O3","O4"]],
  ["leaf","Yard gear & chemicals",["O1","O2"]],
  ["hanger","Clothing",["U1","U7","U8"]],
  ["box","Seasonal & sentimental",["B1"]]
];

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const norm = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[’']/g,"").replace(/[^a-z0-9]+/g," ").trim();
const stem = w => w.length > 3 ? w.replace(/ies$/,"y").replace(/(es|s)$/,"") : w;
const toks = s => norm(s).split(" ").filter(Boolean).map(stem);
const z = code => code[0];
const zc = code => `--c:var(--z-${z(code)});--t:var(--t-${z(code)})`;
const hitWord = (w,q) => { const n = stem(norm(w)); return n && q.some(t => n.startsWith(t) || (t.startsWith(n) && n.length>2)); };
const matches = (text,q) => { const h = toks(text); return q.every(t => h.some(x => x.startsWith(t) || (t.startsWith(x) && x.length>2))); };
const highlight = (text,q) => q.length ? text.split(/(\s+|\/|-|\(|\))/).map(w => hitWord(w,q) ? `<mark>${esc(w)}</mark>` : esc(w)).join("") : esc(text);
function guessScore(loc, qTokens){
  const hay = toks(`${loc.name} ${loc.job} ${loc.kw}`);
  let score = 0;
  qTokens.forEach(t=>{ if(hay.some(h=>h.startsWith(t) || (t.startsWith(h) && h.length>2))) score++; });
  return score;
}
function guessScoreLoose(loc, qTokens){
  const hay = norm(`${loc.name} ${loc.job} ${loc.kw} ${loc.items.map(i=>i.text).join(" ")} ${(loc.maybe||[]).join(" ")}`);
  let score = 0;
  qTokens.forEach(t=>{ if(t.length>2 && hay.includes(t)) score++; });
  return score;
}

/* ---------- state ---------- */
let area = null;
let query = "";

/* ---------- quick chips ---------- */
$("#quick").innerHTML = QUICK.map(t=>`<button class="chip" type="button" data-q="${esc(t)}">${esc(t)}</button>`).join("");
$("#quick").addEventListener("click", e=>{
  const b = e.target.closest("[data-q]"); if(!b) return;
  setQuery(b.dataset.q);
});

/* ---------- directory (floor-plan bands) ---------- */
function renderDirectory(){
  const count = k => LOCATIONS.filter(l=>z(l.code)===k).length;
  const band = (k,wide) => `<button type="button" class="floor-btn" data-area="${k}" aria-pressed="${area===k}" style="--c:var(--z-${k});--t:var(--t-${k})">
      <span class="tab" aria-hidden="true"></span>
      <span class="txt"><b>${ZONES[k].name}</b><small>${ZONES[k].desc || count(k)+" spots"}</small></span>
      <span class="chev" aria-hidden="true">›</span></button>`;
  $("#directory").innerHTML = `
    <div class="level">${band("U")}</div>
    <div class="level split">${band("M")}${band("G")}</div>
    <div class="level">${band("O")}</div>
    <div class="ground-mark" aria-hidden="true"></div>
    <div class="level">${band("B")}</div>`;
  $("#showAll").hidden = !area;
}
$("#directory").addEventListener("click", e=>{
  const b = e.target.closest("[data-area]"); if(!b) return;
  area = area===b.dataset.area ? null : b.dataset.area;
  renderDirectory(); renderTiles();
  if(area){
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    $("#tiles").scrollIntoView({behavior:reduce?"auto":"smooth",block:"start"});
  }
});
$("#showAll").addEventListener("click", ()=>{ area=null; renderDirectory(); renderTiles(); });

/* ---------- tiles ---------- */
function tile(l){
  const preview = l.items.slice(0,3).map(i=>i.text).join(", ") + (l.items.length>3 ? "…" : "");
  const subs = sublocationsFor(l.code);
  const itemLabel = `${l.items.length} item${l.items.length===1?"":"s"}`;
  const mapLabel = subs.length ? `${subs.length} sublocation${subs.length===1?"":"s"}` : "Room-level";
  return `<button type="button" class="tile" data-open="${l.code}" style="${zc(l.code)}">
    <span class="tile-top"><span class="emo">${icon(l.icon)}</span><span class="code">${l.code}</span></span>
    <b>${esc(l.name)}</b>
    <small>${esc(preview)}</small>
    <span class="tile-meta"><span>${itemLabel}</span><span>${mapLabel}</span></span>
  </button>`;
}
function renderTiles(){
  const zones = area ? [area] : ZONE_ORDER;
  $("#tiles").style.scrollMarginTop = "140px";
  $("#tiles").innerHTML = zones.map(k=>{
    const locs = LOCATIONS.filter(l=>z(l.code)===k);
    return `<h3 class="group-h" style="--c:var(--z-${k})"><span class="tab" aria-hidden="true"></span>${ZONES[k].name}<span class="count">· ${locs.length}</span></h3>
    <div class="tiles">${locs.map(tile).join("")}</div>`;
  }).join("");
}

/* ---------- rules ---------- */
$("#rules").innerHTML = RULES.map(([ic,label,codes])=>`
  <div class="rule"><span class="lbl">${icon(ic)} ${label}</span><span class="codes">${codes.map(c=>
    `<button type="button" data-open="${c}" aria-label="Open ${c}, ${esc(byCode[c].name)}"><span class="code" style="${zc(c)}">${c}</span></button>`).join("")}</span></div>`).join("");

/* ---------- search ---------- */
function search(){
  const q = toks(query);
  const searching = q.length>0;
  $("#searchView").hidden = !searching;
  $("#browseView").hidden = searching;
  $("#clear").hidden = !query;
  if(!searching) return;

  const results = [];
  for(const l of LOCATIONS){
    const itemHits = l.items.filter(it=>matches(it.text,q));
    itemHits.forEach(it=>results.push({item:it,loc:l,score:norm(it.text).startsWith(norm(query))?0:1}));
    const maybeHits = (l.maybe||[]).filter(i=>matches(i,q));
    maybeHits.forEach(i=>results.push({item:{text:i},loc:l,score:norm(i).startsWith(norm(query))?1.5:2.5,maybe:true}));
    if(!itemHits.length && !maybeHits.length && matches(`${l.code} ${l.name} ${l.job} ${l.kw}`,q)) results.push({item:null,loc:l,score:3});
  }
  results.sort((a,b)=>a.score-b.score);

  if(!results.length){
    $("#countNote").textContent = "";
    let guesses = LOCATIONS.map(l=>({l,score:guessScore(l,q)})).filter(g=>g.score>0).sort((a,b)=>b.score-a.score).slice(0,3);
    let loose = false;
    if(!guesses.length){
      guesses = LOCATIONS.map(l=>({l,score:guessScoreLoose(l,q)})).filter(g=>g.score>0).sort((a,b)=>b.score-a.score).slice(0,3);
      loose = guesses.length>0;
    }
    if(guesses.length){
      const lead = loose ? `Nothing close by name — closest category matches for` : `No exact match — here's where`;
      $("#results").innerHTML = `<p class="hint" style="margin:0 2px 10px">${lead} “${esc(query)}” probably belongs. Tap one to file it there.</p>` +
        guesses.map(({l})=>`
        <button type="button" class="result guess" data-open="${l.code}" data-guess="${esc(query)}" style="${zc(l.code)}">
          <span class="emo" aria-hidden="true">${icon(l.icon)}</span>
          <span><b>${esc(l.name)}</b>
          <span class="where">${esc(l.job)} · ${ZONES[z(l.code)].name}</span></span>
          <span class="code">${l.code}</span></button>`).join("");
    } else {
      $("#results").innerHTML = `<div class="empty"><div class="emo" style="font-size:2.2rem">${icon("help-circle")}</div>
        <b>Nothing matches “${esc(query)}” yet.</b>
        <p>Pick the closest general category and we'll file it there.</p></div>
        <div class="rules" style="margin-top:10px">${RULES.map(([ic,label,codes])=>`
          <div class="rule"><span class="lbl">${icon(ic)} ${label}</span><span class="codes">${codes.map(c=>
            `<button type="button" data-open="${c}" data-guess="${esc(query)}" aria-label="File under ${esc(byCode[c].name)}"><span class="code" style="${zc(c)}">${c}</span></button>`).join("")}</span></div>`).join("")}</div>`;
    }
    return;
  }
  const spots = new Set(results.map(r=>r.loc.code)).size;
  $("#countNote").textContent = spots===1 ? "Found in 1 spot" : `Found in ${spots} spots`;
  $("#results").innerHTML = results.slice(0,30).map(r=>`
    <button type="button" class="result" data-open="${r.loc.code}" data-item-id="${r.item && r.item.id ? r.item.id : ""}" style="${zc(r.loc.code)}">
      <span class="emo">${icon(r.loc.icon)}</span>
      <span><b>${r.item ? highlight(r.item.text,q) : esc(r.loc.name)}</b>
      <span class="where">${r.maybe ? "Could go in " : ""}${r.item ? esc(r.loc.name) : esc(r.loc.job)}${r.item && r.item.id && subMoves[r.item.id] && sublocByCode[subMoves[r.item.id]] ? " · " + esc(sublocByCode[subMoves[r.item.id]].name) : ""} · ${ZONES[z(r.loc.code)].name}</span></span>
      <span class="code">${r.loc.code}</span></button>`).join("");
}
function setQuery(v){ query=v; $("#q").value=v; search(); }
$("#q").addEventListener("input", e=>{ query=e.target.value; search(); });
$("#clear").addEventListener("click", ()=>{ setQuery(""); $("#q").focus(); });

/* ---------- detail sheet ---------- */
const dlg = $("#sheet");
let pendingFile = null;
let currentSheetCode = null;
function openSheet(code, itemId){
  currentSheetCode = code;
  const l = byCode[code];
  const subs = sublocationsFor(code);
  $("#sheetBody").setAttribute("style", zc(code));
  $("#sheetBody").innerHTML = `
    <div class="grab" aria-hidden="true"></div>
    <button class="close" type="button" id="closeSheet" aria-label="Close">✕</button>
    <div class="sheet-head">
      <span class="emo">${icon(l.icon)}</span>
      <div><span class="code big">${l.code}</span>
      <h2 id="sheetTitle">${esc(l.name)}</h2>
      <p class="area">${ZONES[z(code)].name}</p></div>
    </div>
    ${pendingFile ? `<button type="button" class="file-cta" id="fileHereBtn">File “${esc(pendingFile)}” here</button>` : ""}
    <p class="job">${esc(l.job)}</p>
    ${subs.length ? `
      <div class="sub-h"><span>Inside this spot</span><small>${subs.length} sublocations</small></div>
      <div class="sub-grid">${subs.map(sub=>{
        const count = l.items.filter(it=>subMoves[it.id]===sub.code).length;
        const planned = plannedItemsForSub(sub.code).length;
        return `<button type="button" class="sub-card" data-sub-open="${sub.code}"><b>${esc(sub.name)}</b><small>${esc(sub.notes)}</small><span class="sub-count">${planned ? planned + " planned" : count + " assigned"} · Tap to open</span></button>`;
      }).join("")}</div>` : ""}
    <ul class="item-list">${l.items.map(it=>{
      const moved = originOf(it.id) !== code;
      return `<li>
        <button type="button" class="item-btn ${it.id===itemId?"hit":""}" data-move-id="${it.id}" data-move-text="${esc(it.text)}" data-move-from="${code}">
          ${moved ? `<span class="pin" title="Moved from ${esc(byCode[originOf(it.id)] ? byCode[originOf(it.id)].name : originOf(it.id))}" aria-hidden="true">↪</span>` : ""}${esc(it.text)}
          ${subMoves[it.id] && sublocByCode[subMoves[it.id]] ? `<span class="sub-badge">${esc(sublocByCode[subMoves[it.id]].name)}</span>` : ""}
        </button></li>`;
    }).join("")}</ul>
    <p class="hint">Tap an item to assign its exact shelf, cabinet, or drawer, or move it to another storage area.</p>
    ${l.maybe && l.maybe.length ? `
    <div class="also-h"><span>Could also go here</span><span class="rule" aria-hidden="true"></span></div>
    <ul class="also-list">${l.maybe.map(i=>`<li>${esc(i)}</li>`).join("")}</ul>` : ""}`;
  dlg.showModal();
  syncTabbarVisibility();
  $("#closeSheet").focus();
}
function openSubSheet(subCode){
  const sub = sublocByCode[subCode];
  if(!sub) return;
  const l = byCode[sub.location];
  const planned = plannedItemsForSub(subCode);
  const suggested = suggestedItemsForSub(subCode).filter(item=>!planned.some(p=>norm(p)===norm(item)));
  const assigned = l.items.filter(it=>subMoves[it.id]===subCode);
  const review = (SUBLOCATION_REVIEW && SUBLOCATION_REVIEW[subCode]) || [];
  $("#sheetBody").setAttribute("style", zc(sub.location));
  $("#sheetBody").innerHTML = `
    <div class="grab" aria-hidden="true"></div>
    <button class="close" type="button" id="closeSheet" aria-label="Close">✕</button>
    <button type="button" class="sub-back" data-back-location="${sub.location}">‹ ${esc(l.name)}</button>
    <div class="sheet-head">
      <span class="emo">${icon(l.icon)}</span>
      <div><span class="code big">${esc(sub.code)}</span>
      <h2 id="sheetTitle">${esc(sub.name)}</h2>
      <p class="area">${esc(l.name)} · ${ZONES[z(sub.location)].name}</p></div>
    </div>
    <p class="job">${esc(sub.notes)}</p>

    <div class="subdetail-h"><span>From your inventory</span><small>Items you already own</small></div>
    ${planned.length ? `<ul class="planned-list inventory-list">${planned.map(item=>`<li>${esc(item)}</li>`).join("")}</ul>`
      : `<p class="hint">Nothing from the PDF is specifically mapped here yet.</p>`}

    ${suggested.length ? `
      <div class="subdetail-h"><span>Also makes sense here</span><small>Suggested category matches</small></div>
      <ul class="planned-list suggestion-list">${suggested.map(item=>`<li>${esc(item)}</li>`).join("")}</ul>` : ""}

    ${assigned.length ? `
      <div class="subdetail-h"><span>Assigned in the app</span><small>${assigned.length}</small></div>
      <ul class="item-list">${assigned.map(it=>`
        <li><button type="button" class="item-btn" data-move-id="${it.id}" data-move-text="${esc(it.text)}" data-move-from="${sub.location}">${esc(it.text)}</button></li>`).join("")}</ul>` : ""}

    ${review.length ? `
      <div class="review-note"><b>Needs a separate decision</b>${review.map(x=>`<p>${esc(x)}</p>`).join("")}</div>` : ""}
  `;
  $("#closeSheet").focus();
}

dlg.addEventListener("click", e=>{
  const subOpen = e.target.closest("[data-sub-open]");
  if(subOpen){ openSubSheet(subOpen.dataset.subOpen); return; }
  const back = e.target.closest("[data-back-location]");
  if(back){ openSheet(back.dataset.backLocation); return; }

  if(e.target.id==="fileHereBtn"){
    const l = byCode[currentSheetCode];
    addCustomItem(pendingFile, l.code);
    toast(`Filed “${pendingFile}” under ${l.name} (${l.code})`);
    pendingFile = null;
    dlg.close();
    renderTiles();
    search();
    return;
  }
  if(e.target.id==="closeSheet" || !e.target.closest(".sheet")){ pendingFile=null; dlg.close(); }
});

/* ---------- move picker ---------- */
const picker = $("#picker");
let pending = null; // {id, text, from}
function openPicker(id, text, from){
  pending = {id, text, from};
  $("#pickerQ").value = "";
  renderPickerList("");
  $("#pickerTitle").textContent = `Move “${text}”`;
  $("#pickerFrom").textContent = `Currently in ${byCode[from].name} (${from})`;
  picker.showModal();
  syncTabbarVisibility();
  $("#pickerQ").focus();
}
function renderPickerList(q){
  const toksQ = toks(q);
  const sameLocSubs = sublocationsFor(pending.from).filter(sub=>!toksQ.length || matches(`${sub.code} ${sub.name} ${sub.notes}`,toksQ));
  const rows = LOCATIONS.filter(l=>l.code!==pending.from).filter(l=>!toksQ.length || matches(`${l.code} ${l.name} ${l.job}`,toksQ));
  let html = "";
  if(sameLocSubs.length){
    html += `<div class="pick-section">Inside ${esc(byCode[pending.from].name)}</div>` +
      sameLocSubs.map(sub=>`
        <button type="button" class="pick-row" data-dest="${pending.from}" data-subdest="${sub.code}" style="${zc(pending.from)}">
          <span class="emo">${icon("archive")}</span>
          <span><b>${esc(sub.name)}</b><small>${esc(sub.notes)}</small></span>
          <span class="code">${sub.code}</span></button>`).join("");
  }
  if(rows.length){
    html += `<div class="pick-section">Other storage locations</div>` + rows.map(l=>`
      <button type="button" class="pick-row" data-dest="${l.code}" style="${zc(l.code)}">
        <span class="emo">${icon(l.icon)}</span>
        <span><b>${esc(l.name)}</b><small>${ZONES[z(l.code)].name}</small></span>
        <span class="code">${l.code}</span></button>`).join("");
  }
  $("#pickerList").innerHTML = html || `<p class="hint" style="padding:14px 4px">No matching spots.</p>`;
}
$("#pickerQ").addEventListener("input", e=>renderPickerList(e.target.value));
$("#pickerClose").addEventListener("click", ()=>picker.close());
picker.addEventListener("click", e=>{
  if(!e.target.closest(".sheet") && !e.target.closest(".pick-row")) picker.close();
  const row = e.target.closest("[data-dest]");
  if(row) commitMove(pending.id, row.dataset.dest, row.dataset.subdest || null);
});

function commitMove(id, destCode, subCode=null){
  const orig = originOf(id);
  if(destCode === orig) delete moves[id]; else moves[id] = destCode;
  if(subCode) subMoves[id] = subCode;
  else delete subMoves[id];
  saveMoves();
  const destName = byCode[destCode].name;
  rebuild();
  picker.close();
  dlg.close();
  renderTiles();
  if(query) search();
  const subName = subCode && sublocByCode[subCode] ? ` · ${sublocByCode[subCode].name}` : "";
  toast(`Moved “${pending.text}” to ${destName}${subName}`);
  pending = null;
}

let toastTimer;
function toast(msg){
  const el = $("#toast");
  el.textContent = msg;
  el.hidden = false;
  requestAnimationFrame(()=>el.classList.add("show"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{ el.classList.remove("show"); setTimeout(()=>el.hidden=true,200); }, 2400);
}

/* ---------- keep the tab bar out of the way while any dialog is open ----------
   Dialog backdrops are semi-transparent and dialogs don't hide position:fixed
   siblings, so without this the tab bar stays visible behind the sheet and
   jumps up to sit above the on-screen keyboard when a form field is focused. */
function syncTabbarVisibility(){
  const anyOpen = document.querySelectorAll("dialog[open]").length > 0;
  $(".tabbar").style.display = anyOpen ? "none" : "";
}
document.querySelectorAll("dialog").forEach(d=>{
  d.addEventListener("close", syncTabbarVisibility);
});

document.addEventListener("click", e=>{
  const mv = e.target.closest("[data-move-id]");
  if(mv){ openPicker(mv.dataset.moveId, mv.dataset.moveText, mv.dataset.moveFrom); return; }
  const b = e.target.closest("[data-open]");
  if(b && !dlg.contains(b)){
    pendingFile = b.dataset.guess || null;
    openSheet(b.dataset.open, b.dataset.itemId || null);
  }
});

/* ==================================================================
   Tasks · Seasonal · Plants — shared local persistence layer
   Field names use snake_case to map directly onto future Supabase
   tables/columns (id, created_at, etc.) with no reshaping needed.
   ================================================================== */
const Store = {
  read(key, fallback){ try{ const v = localStorage.getItem(key); return v===null ? fallback : JSON.parse(v); } catch(e){ return fallback; } },
  write(key, val){ try{ localStorage.setItem(key, JSON.stringify(val)); } catch(e){ /* not persisted this session */ } },
  uid(){ return `${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`; }
};
/* When the app's built-in defaults gain new items (like a new seasonal
   section) after someone already has saved data, this appends anything
   with an id they don't already have — without touching their progress
   on existing items. */
function mergeNewSeedItems(existing, seed, save){
  const have = new Set(existing.map(i=>i.id));
  let added = false;
  seed.forEach(item=>{ if(!have.has(item.id)){ existing.push(item); added = true; } });
  if(added) save();
}

/* ---------- date helpers ---------- */
function todayISO(){ return new Date().toISOString().slice(0,10); }
function addMonthsISO(iso, months){
  const d = new Date(iso+"T00:00:00");
  d.setMonth(d.getMonth()+Number(months||0));
  return d.toISOString().slice(0,10);
}
function daysUntil(iso){
  const d = new Date(iso+"T00:00:00");
  const now = new Date(); now.setHours(0,0,0,0);
  return Math.round((d-now)/86400000);
}
function fmtDate(iso){
  if(!iso) return "";
  const d = new Date(iso+"T00:00:00");
  return d.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
}

/* ==================================================================
   TASKS
   ================================================================== */
const TASKS_SEED = [
  {id:"t1", title:"Change HVAC filter", frequency_months:2, last_done:null, notes:"Filters are stored in the Mechanical Room.", category:"HVAC", location_code:"B2", snoozed_until:null},
  {id:"t2", title:"Test smoke & CO detectors", frequency_months:6, last_done:null, notes:"", category:"Safety", location_code:null, snoozed_until:null},
  {id:"t3", title:"Flush water heater", frequency_months:12, last_done:null, notes:"Mechanical Room.", category:"Plumbing", location_code:"B2", snoozed_until:null},
  {id:"t4", title:"Clean dryer vent", frequency_months:12, last_done:null, notes:"Check both laundry areas.", category:"Laundry", location_code:"M5", snoozed_until:null},
  {id:"t5", title:"Clean gutters", frequency_months:6, last_done:null, notes:"Spring and fall.", category:"Exterior", location_code:null, snoozed_until:null},
  {id:"t6", title:"Replace fridge water filter", frequency_months:6, last_done:null, notes:"Backup filters belong in the main kitchen.", category:"Kitchen", location_code:"M1", snoozed_until:null},
  {id:"t7", title:"Check water softener salt", frequency_months:1, last_done:null, notes:"", category:"Plumbing", location_code:"B2", snoozed_until:null},
  {id:"t8", title:"Service furnace & AC (professional)", frequency_months:12, last_done:null, notes:"Schedule seasonal HVAC service.", category:"HVAC", location_code:"B2", snoozed_until:null},
  {id:"t9", title:"Test garage door auto-reverse safety", frequency_months:12, last_done:null, notes:"", category:"Garage", location_code:"G1", snoozed_until:null},
  {id:"t10", title:"Check fire extinguishers", frequency_months:12, last_done:null, notes:"", category:"Safety", location_code:null, snoozed_until:null},
  {id:"t11", title:"Deep clean garbage disposal", frequency_months:3, last_done:null, notes:"", category:"Kitchen", location_code:"M1", snoozed_until:null},
  {id:"t12", title:"Flip / rotate mattresses", frequency_months:6, last_done:null, notes:"", category:"Bedrooms", location_code:"U4", snoozed_until:null}
]
let tasks = Store.read("wil-tasks", null) || TASKS_SEED;
mergeNewSeedItems(tasks, TASKS_SEED, saveTasks);
function saveTasks(){ Store.write("wil-tasks", tasks); cloudSyncTasksSoon(); }

function taskStatus(t){
  const today = todayISO();
  if(t.snoozed_until && t.snoozed_until > today){
    return {label:`Snoozed until ${fmtDate(t.snoozed_until)}`, cls:"ok", sortKey:999998, bucket:"later"};
  }
  if(!t.last_done) return {label:"Never done", cls:"overdue", sortKey:-999999, bucket:"now"};
  const nextISO = addMonthsISO(t.last_done, t.frequency_months);
  const days = daysUntil(nextISO);
  let cls = "ok", bucket = "later";
  if(days<0){ cls="overdue"; bucket="now"; }
  else if(days<=7){ cls="soon"; bucket="now"; }
  else if(days<=30){ cls="soon"; bucket="soon"; }
  const label = days===0 ? "Due today" : days<0 ? `${Math.abs(days)}d overdue` : `Due in ${days}d`;
  return {label, cls, sortKey:days, bucket};
}
function taskRow(t){
  const st = taskStatus(t);
  const loc = t.location_code && byCode[t.location_code] ? byCode[t.location_code] : null;
  return `<div class="task-row">
    <button type="button" class="task-main" data-edit-task="${t.id}">
      <b>${esc(t.title)}</b>
      <span class="freq">Every ${t.frequency_months} month${t.frequency_months==1?"":"s"}${t.last_done?` · last done ${fmtDate(t.last_done)}`:""}</span><br>
      <span class="badge ${st.cls}">${st.label}</span>
      <span class="task-meta">
        <span class="meta-chip">${esc(t.category||"General")}</span>
        ${loc?`<span class="meta-chip">${esc(t.location_code)} · ${esc(loc.name)}</span>`:""}
      </span>
    </button>
    <span class="task-actions">
      <button type="button" class="mini-btn" data-done-task="${t.id}">Done</button>
      <button type="button" class="mini-btn secondary" data-snooze-task="${t.id}">+7d</button>
      ${loc?`<button type="button" class="mini-btn secondary" data-task-open="${t.location_code}">Open</button>`:""}
    </span>
  </div>`;
}
function renderTasks(){
  const rows = [...tasks].sort((a,b)=>taskStatus(a).sortKey-taskStatus(b).sortKey);
  const now = rows.filter(t=>taskStatus(t).bucket==="now");
  const soon = rows.filter(t=>taskStatus(t).bucket==="soon");
  const later = rows.filter(t=>!["now","soon"].includes(taskStatus(t).bucket));
  $("#tasksSummary").innerHTML = `
    <div class="summary-grid">
      <div class="summary-card hot"><b>${now.length}</b><span>Need attention</span></div>
      <div class="summary-card soon"><b>${soon.length}</b><span>Next 30 days</span></div>
      <div class="summary-card"><b>${later.length}</b><span>All good</span></div>
    </div>`;
  const section = (label,list)=> list.length ? `<div class="task-section-h">${label}</div>${list.map(taskRow).join("")}` : "";
  $("#tasksList").innerHTML = section("Due now",now)+section("Coming up",soon)+section("All good",later)+`<button type="button" class="add-row" id="addTaskBtn2">+ Add task</button>`;
}
$("#view-tasks").addEventListener("click", e=>{
  const done = e.target.closest("[data-done-task]");
  if(done){
    const t = tasks.find(x=>x.id===done.dataset.doneTask);
    t.last_done = todayISO(); t.snoozed_until = null;
    saveTasks(); renderTasks(); toast(`Marked “${t.title}” done today`); return;
  }
  const snooze = e.target.closest("[data-snooze-task]");
  if(snooze){
    const t = tasks.find(x=>x.id===snooze.dataset.snoozeTask);
    const d = new Date(); d.setDate(d.getDate()+7);
    t.snoozed_until = d.toISOString().slice(0,10);
    saveTasks(); renderTasks(); toast(`Snoozed “${t.title}” for 7 days`); return;
  }
  const open = e.target.closest("[data-task-open]");
  if(open){ openSheet(open.dataset.taskOpen); return; }
  const edit = e.target.closest("[data-edit-task]");
  if(edit){ openTaskForm(tasks.find(x=>x.id===edit.dataset.editTask)); return; }
  if(e.target.id==="addTaskBtn2"){ openTaskForm(null); }
});
$("#addTaskBtn").addEventListener("click", ()=>openTaskForm(null));

function openTaskForm(t){
  openForm({
    title: t ? "Edit task" : "Add task",
    fields: [
      {key:"title", label:"Task", type:"text", value:t?t.title:""},
      {key:"frequency_months", label:"Repeat every (months)", type:"number", value:t?t.frequency_months:3},
      {key:"category", label:"Category", type:"text", value:t?(t.category||"General"):"General"},
      {key:"location_code", label:"Storage / system code (optional)", type:"text", value:t?(t.location_code||""):""},
      {key:"notes", label:"Notes", type:"textarea", value:t?t.notes:""}
    ],
    onSave(v){
      if(!v.title.trim()) return;
      if(t){ t.title=v.title.trim(); t.frequency_months=Math.max(1,Number(v.frequency_months)||1); t.category=v.category.trim()||"General"; t.location_code=v.location_code.trim().toUpperCase()||null; t.notes=v.notes.trim(); }
      else { tasks.push({id:Store.uid(), title:v.title.trim(), frequency_months:Math.max(1,Number(v.frequency_months)||1), last_done:null, notes:v.notes.trim(), category:v.category.trim()||"General", location_code:v.location_code.trim().toUpperCase()||null, snoozed_until:null}); }
      saveTasks(); renderTasks();
      toast(t ? "Task updated" : "Task added");
    },
    onDelete: t ? ()=>{
      tasks = tasks.filter(x=>x.id!==t.id);
      saveTasks(); renderTasks();
      toast("Task deleted");
    } : null
  });
}

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
  const groups = {};
  plants.forEach(p=>{
    const loc = p.location || "Location not set";
    (groups[loc] ||= []).push(p);
  });
  const urgent = plants.filter(p=>currentSeason()==="fall" && /bring indoors|dig up|first frost/i.test(p.fall_task||"")).length;
  $("#plantsSummary").innerHTML = `<div class="plant-summary"><b>${urgent}</b> frost-sensitive plant ${urgent===1?"entry":"entries"} need attention this fall. Tap a plant to edit its exact location or care notes.</div>`;
  $("#plantsList").innerHTML = Object.entries(groups).map(([loc,list])=>`
    <div class="plant-group-h">${esc(loc)}</div>
    ${list.map(p=>`
      <button type="button" class="plant-card" data-edit-plant="${p.id}">
        <b>${esc(p.name)}</b>
        <div class="loc">${esc(p.location||"Location not set")}</div>
        <span class="plant-next">Next: ${esc(plantNextAction(p))}</span>
        ${plantCycleBadge(p)}
      </button>`).join("")}
  `).join("");
}
$("#view-plants").addEventListener("click", e=>{
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
      plants = plants.filter(x=>x.id!==p.id);
      savePlants(); renderPlants();
      toast("Plant deleted");
    } : null
  });
}

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
  const active=decorItems.filter(i=>!i.purchased_at), bought=decorItems.filter(i=>i.purchased_at);
  const planned=active.reduce((s,i)=>s+Number(i.target||0),0), spent=bought.reduce((s,i)=>s+Number(i.actual||0),0);
  const pct=Math.round(bought.length/decorItems.length*100);
  $("#decorSummary").innerHTML=`<div class="decor-summary"><div class="decor-stat"><b>${active.length}</b><span>Still needed</span></div><div class="decor-stat"><b>${decorMoney(planned)}</b><span>Targets left</span></div><div class="decor-stat"><b>${decorMoney(spent)}</b><span>Spent</span></div></div><div class="decor-progress"><span style="width:${pct}%"></span></div>`;
  const room=$("#decorRoom").value||"all", q=$("#decorSearch").value.toLowerCase().trim();
  const filtered=active.filter(i=>(room==="all"||i.room===room)&&(!q||(i.name+" "+i.style+" "+i.room).toLowerCase().includes(q)));
  const rooms=[...new Set(filtered.map(i=>i.room))];
  $("#decorList").innerHTML=filtered.length?rooms.map(roomName=>`<div class="decor-room-h">${esc(roomName)}</div><div class="decor-grid">${filtered.filter(i=>i.room===roomName).map(i=>`<article class="decor-card"><a href="${i.image}" target="_blank"><img src="${i.image}" alt="${esc(i.name)} style reference"></a><div><h3>${esc(i.name)}</h3><p>${esc(i.style)}</p><div class="decor-price">Target ${decorMoney(i.target)}</div><div class="decor-card-actions"><button data-decor-edit="${i.id}">Edit</button><button class="bought" data-decor-bought="${i.id}">Bought ✓</button></div></div></article>`).join("")}</div>`).join(""):`<div class="decor-empty">No active items match this view.</div>`;
  $("#decorHistoryTitle").textContent=`Purchased items (${bought.length})`;
  $("#decorPurchased").innerHTML=bought.map(i=>`<div class="decor-history-row"><img src="${i.image}" alt=""><span><b>${esc(i.name)}</b><br>${esc(i.room)}${i.actual?` · ${decorMoney(i.actual)}`:""}</span><button data-decor-restore="${i.id}">Restore</button></div>`).join("");
  const tab=$("#decorTab"); tab.hidden=active.length===0;
  if(!active.length && !$("#view-decor").hidden) switchTab("storage");
}
function openDecorForm(item){
  openForm({title:`Edit ${item.name}`,fields:[{key:"actual",label:"Actual price paid",type:"number",value:item.actual||""},{key:"store",label:"Store",type:"text",value:item.store||""},{key:"link",label:"Product link",type:"text",value:item.link||""},{key:"status",label:"Shopping status",type:"text",value:item.status||"Looking"}],onSave(v){item.actual=v.actual?Number(v.actual):null;item.store=v.store.trim();item.link=v.link.trim();item.status=v.status.trim()||"Looking";saveDecor();renderDecor();toast("Decor item updated");},onDelete:null});
}
$("#view-decor").addEventListener("click",e=>{
  const edit=e.target.closest("[data-decor-edit]");if(edit){openDecorForm(decorItems.find(i=>i.id===edit.dataset.decorEdit));return;}
  const buy=e.target.closest("[data-decor-bought]");if(buy){const i=decorItems.find(x=>x.id===buy.dataset.decorBought);i.purchased_at=todayISO();i.status="Bought";saveDecor();renderDecor();toast(`${i.name} purchased`);return;}
  const restore=e.target.closest("[data-decor-restore]");if(restore){const i=decorItems.find(x=>x.id===restore.dataset.decorRestore);i.purchased_at=null;i.status="Looking";saveDecor();renderDecor();toast(`${i.name} restored`);}
});
$("#decorSearch").addEventListener("input",renderDecor);$("#decorRoom").addEventListener("change",renderDecor);
const decorRooms=[...new Set(DECOR_SEED.map(i=>i.room))];decorRooms.forEach(r=>$("#decorRoom").add(new Option(r,r)));

/* ==================================================================
   Generic form sheet (used by Tasks, Seasonal, Plants, Decor)
   ================================================================== */
const formDlg = $("#formSheet");
let formCtx = null;
function openForm(cfg){
  formCtx = cfg;
  $("#formTitle").textContent = cfg.title;
  $("#formFields").innerHTML = cfg.fields.map(f=>`
    <div class="field">
      <label for="f-${f.key}">${esc(f.label)}</label>
      ${f.type==="textarea"
        ? `<textarea id="f-${f.key}" data-field="${f.key}">${esc(f.value||"")}</textarea>`
        : `<input id="f-${f.key}" data-field="${f.key}" type="${f.type}" value="${esc(String(f.value ?? ""))}">`}
    </div>`).join("");
  $("#formDelete").hidden = !cfg.onDelete;
  formDlg.showModal();
  syncTabbarVisibility();
  const first = $("#formFields [data-field]");
  if(first) first.focus();
}
$("#formSave").addEventListener("click", ()=>{
  if(!formCtx) return;
  const values = {};
  formCtx.fields.forEach(f=>{ values[f.key] = $(`#formFields [data-field="${f.key}"]`).value; });
  formCtx.onSave(values);
  formDlg.close();
  formCtx = null;
});
$("#formDelete").addEventListener("click", ()=>{
  if(!formCtx || !formCtx.onDelete) return;
  formCtx.onDelete();
  formDlg.close();
  formCtx = null;
});
$("#formClose").addEventListener("click", ()=>{ formDlg.close(); formCtx=null; });
formDlg.addEventListener("click", e=>{
  if(!e.target.closest(".sheet")){ formDlg.close(); formCtx=null; }
});

/* ==================================================================
   Tab navigation
   ================================================================== */
const TABS = ["storage","tasks","seasonal","plants","decor"];
function switchTab(name){
  TABS.forEach(t=>{
    $(`#view-${t}`).hidden = t!==name;
  });
  document.querySelectorAll(".tab-btn").forEach(b=>{
    b.setAttribute("aria-current", b.dataset.tab===name ? "true" : "false");
  });
}
document.querySelectorAll(".tab-btn").forEach(b=>{
  b.addEventListener("click", ()=>switchTab(b.dataset.tab));
});

/* ---------- init ---------- */
renderDirectory(); renderTiles(); search(); renderMoving();
renderTasks(); renderSeasonal(); renderPlants(); renderDecor();
initCloud();
