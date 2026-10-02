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
