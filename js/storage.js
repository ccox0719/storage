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
