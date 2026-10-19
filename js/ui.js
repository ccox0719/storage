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
        : f.type==="checkbox"
        ? `<input id="f-${f.key}" data-field="${f.key}" type="checkbox" ${f.value?"checked":""}>`
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
  formCtx.fields.forEach(f=>{ const el=$(`#formFields [data-field="${f.key}"]`); values[f.key] = f.type==="checkbox" ? el.checked : el.value; });
  if(formCtx.asyncSave){
    const context=formCtx;
    const button=$("#formSave");
    button.disabled=true;
    Promise.resolve().then(()=>context.onSave(values)).then(()=>{
      if(formCtx===context){ formDlg.close(); formCtx=null; }
    }).catch(error=>{
      if(formCtx===context){
        let message=$("#formError");
        if(!message){message=document.createElement("p");message.id="formError";message.setAttribute("role","alert");$("#formFields").appendChild(message);}
        message.textContent=error.message||"Save failed. Please retry.";
      }
      toast(error.message||"Save failed. Please retry.");
    }).finally(()=>{button.disabled=false;});
    return;
  }
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
const TABS = ["home","systems","storage","tasks","seasonal","plants","decor","contacts"];
function closeTransientUI(){
  document.querySelectorAll("dialog[open]").forEach(d=>{
    try{ d.close(); }catch{}
  });
  if(typeof syncTabbarVisibility==="function") syncTabbarVisibility();
}
function switchTab(name){
  if(!TABS.includes(name)) return;
  closeTransientUI();
  const primaryTab = ["tasks","seasonal","contacts"].includes(name) ? "home" : name;
  TABS.forEach(t=>{
    const view=$(`#view-${t}`);
    if(view) view.hidden = t!==name;
  });
  document.querySelectorAll(".tab-btn").forEach(b=>{
    b.setAttribute("aria-current", b.dataset.tab===primaryTab ? "true" : "false");
  });
  if(name==="contacts") renderContacts();
  if(name==="home" && typeof renderHomeDashboard==="function") renderHomeDashboard();
  requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:"auto"}));
}
document.querySelectorAll(".tab-btn").forEach(b=>{
  b.addEventListener("click", e=>{
    e.preventDefault();
    if(b.getAttribute("aria-current")==="true") return;
    switchTab(b.dataset.tab);
  });
});

/* ---------- init ---------- */
// Start cloud independently of individual tab rendering errors.
try { initCloud(); } catch (err) { console.error("Cloud startup",err); setCloudState("startup: "+err.message,true); }
for (const [name,render] of [
  ["directory",()=>renderDirectory()],["tiles",()=>renderTiles()],
  ["search",()=>search()],["moving",()=>renderMoving()],
  ["tasks",()=>renderTasks()],["seasonal",()=>renderSeasonal()],
  ["plants",()=>renderPlants()],["decor",()=>renderDecor()],
  ["systems",()=>renderSystems()],["dashboard",()=>renderHomeDashboard()]
]) {
  try { render(); } catch(err) { console.error("Render "+name,err); }
}
