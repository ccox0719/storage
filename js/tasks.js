/* ==================================================================
   TASKS
   ================================================================== */
const TASKS_SEED = [
  {id:"t1", notify_important:false, title:"Change HVAC filter", frequency_months:2, last_done:null, notes:"Filters are stored in the Mechanical Room.", category:"HVAC", location_code:"B2", snoozed_until:null},
  {id:"t2", notify_important:true, title:"Test smoke & CO detectors", frequency_months:6, last_done:null, notes:"", category:"Safety", location_code:null, snoozed_until:null},
  {id:"t3", notify_important:true, title:"Flush water heater", frequency_months:12, last_done:null, notes:"Mechanical Room.", category:"Plumbing", location_code:"B2", snoozed_until:null},
  {id:"t4", notify_important:true, title:"Clean dryer vent", frequency_months:12, last_done:null, notes:"Check both laundry areas.", category:"Laundry", location_code:"M5", snoozed_until:null},
  {id:"t5", notify_important:true, title:"Clean gutters", frequency_months:6, last_done:null, notes:"Spring and fall.", category:"Exterior", location_code:null, snoozed_until:null},
  {id:"t6", notify_important:false, title:"Replace fridge water filter", frequency_months:6, last_done:null, notes:"Backup filters belong in the main kitchen.", category:"Kitchen", location_code:"M1", snoozed_until:null},
  {id:"t7", notify_important:false, title:"Check water softener salt", frequency_months:1, last_done:null, notes:"", category:"Plumbing", location_code:"B2", snoozed_until:null},
  {id:"t8", notify_important:true, title:"Service furnace & AC (professional)", frequency_months:12, last_done:null, notes:"Schedule seasonal HVAC service.", category:"HVAC", location_code:"B2", snoozed_until:null},
  {id:"t9", notify_important:true, title:"Test garage door auto-reverse safety", frequency_months:12, last_done:null, notes:"", category:"Garage", location_code:"G1", snoozed_until:null},
  {id:"t10", notify_important:true, title:"Check fire extinguishers", frequency_months:12, last_done:null, notes:"", category:"Safety", location_code:null, snoozed_until:null},
  {id:"t11", notify_important:false, title:"Deep clean garbage disposal", frequency_months:3, last_done:null, notes:"", category:"Kitchen", location_code:"M1", snoozed_until:null},
  {id:"t12", notify_important:false, title:"Flip / rotate mattresses", frequency_months:6, last_done:null, notes:"", category:"Bedrooms", location_code:"U4", snoozed_until:null}
]
let tasks = Store.read("wil-tasks", null) || TASKS_SEED;
mergeNewSeedItems(tasks, TASKS_SEED, saveTasks);
tasks.forEach(t=>{ if(typeof t.notify_important!=="boolean"){ const seed=TASKS_SEED.find(x=>x.id===t.id); t.notify_important=!!seed?.notify_important; } });
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
  return `<div class="task-row" data-task-row="${t.id}">
    <button type="button" class="task-main" data-edit-task="${t.id}">
      <b>${esc(t.title)}</b>
      <span class="freq">Every ${t.frequency_months} month${t.frequency_months==1?"":"s"}${t.last_done?` · last done ${fmtDate(t.last_done)}`:""}</span><br>
      <span class="badge ${st.cls}">${st.label}</span>
      <span class="task-meta">
        <span class="meta-chip">${esc(t.category||"General")}</span>
        ${loc?`<span class="meta-chip">${esc(t.location_code)} · ${esc(loc.name)}</span>`:""}${t.notify_important?`<span class="meta-chip">Email reminder</span>`:""}
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
  const importantCount = activeTasks.filter(t=>t.notify_important).length;
  const notifBox=$("#taskNotifications");
  if(notifBox) notifBox.innerHTML=`<div class="home-empty" style="margin:10px 0 16px"><b>Important email reminders: ${importantCount} task${importantCount===1?"":"s"}</b><span>Swipe left on any task to edit or remove it. Important reminders are planned for about 7 days before due and again when due/overdue.</span></div>`;
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
let taskSwipe = null;
let suppressTaskTapUntil = 0;

$("#view-tasks").addEventListener("touchstart", e=>{
  if(e.target.closest(".task-actions")){ taskSwipe=null; return; }
  const row=e.target.closest("[data-task-row]");
  if(!row || e.touches.length!==1){ taskSwipe=null; return; }
  const t=e.touches[0];
  taskSwipe={id:row.dataset.taskRow,x:t.clientX,y:t.clientY,time:Date.now()};
},{passive:true});

$("#view-tasks").addEventListener("touchend", e=>{
  if(!taskSwipe || !e.changedTouches.length) return;
  const t=e.changedTouches[0];
  const dx=t.clientX-taskSwipe.x;
  const dy=t.clientY-taskSwipe.y;
  const isSwipeLeft=dx < -48 && Math.abs(dx) > Math.abs(dy)*1.25 && Date.now()-taskSwipe.time < 900;
  const id=taskSwipe.id;
  taskSwipe=null;
  if(!isSwipeLeft) return;
  suppressTaskTapUntil=Date.now()+500;
  e.preventDefault();
  const task=tasks.find(x=>x.id===id);
  if(task) openTaskForm(task);
},{passive:false});

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
  if(edit){
    if(Date.now() < suppressTaskTapUntil) return;
    openTaskForm(tasks.find(x=>x.id===edit.dataset.editTask)); return;
  }
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
      {key:"notify_important", label:"Important email reminder", type:"checkbox", value:t?!!t.notify_important:false},
      {key:"notes", label:"Notes", type:"textarea", value:t?t.notes:""}
    ],
    onSave(v){
      if(!v.title.trim()) return;
      if(t){ t.title=v.title.trim(); t.frequency_months=Math.max(1,Number(v.frequency_months)||1); t.category=v.category.trim()||"General"; t.location_code=v.location_code.trim().toUpperCase()||null; t.notify_important=!!v.notify_important; t.notes=v.notes.trim(); }
      else { tasks.push({id:Store.uid(), title:v.title.trim(), frequency_months:Math.max(1,Number(v.frequency_months)||1), last_done:null, notes:v.notes.trim(), category:v.category.trim()||"General", location_code:v.location_code.trim().toUpperCase()||null, snoozed_until:null, notify_important:!!v.notify_important}); }
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
