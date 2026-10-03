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
  const activeTasks = tasks.filter(t=>!t.disabled);
  const removedTasks = tasks.filter(t=>t.disabled);
  const rows = [...activeTasks].sort((a,b)=>taskStatus(a).sortKey-taskStatus(b).sortKey);
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
  $("#tasksList").innerHTML = section("Due now",now)+section("Coming up",soon)+section("All good",later)+
    `<button type="button" class="add-row" id="addTaskBtn2">+ Add task</button>`+
    (removedTasks.length ? `<details class="removed-tasks"><summary>Removed tasks (${removedTasks.length})</summary><div class="removed-task-list">${removedTasks.map(x=>`<div class="removed-task-row"><span>${esc(x.title)}</span><button type="button" data-restore-task="${x.id}">Restore</button></div>`).join("")}</div></details>` : "");
}
$("#view-tasks").addEventListener("click", e=>{
  const restore = e.target.closest("[data-restore-task]");
  if(restore){
    const t = tasks.find(x=>x.id===restore.dataset.restoreTask);
    if(t){
      t.disabled = false;
      saveTasks(); renderTasks(); renderSystems(); renderHomeDashboard();
      toast(`Restored “${t.title}”`);
    }
    return;
  }
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
      t.disabled = true;
      saveTasks(); renderTasks(); renderSystems(); renderHomeDashboard();
      toast("Task removed");
    } : null
  });
}
