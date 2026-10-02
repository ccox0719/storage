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
const TABS = ["home","storage","tasks","seasonal","plants","decor"];
function switchTab(name){
  if(name==="home" && typeof renderHomeDashboard==="function") renderHomeDashboard();
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
renderTasks(); renderSeasonal(); renderPlants(); renderDecor(); renderHomeDashboard();
initCloud();
