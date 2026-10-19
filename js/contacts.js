/* Important Contacts use household-protected home_tasks reference records.
   No private details are bundled or cached in localStorage. */
let contacts = [];
let contactsLoaded = false;
function isContactRow(row){ return String(row.external_id).startsWith("contact:"); }
function contactFromRow(row){
  const meta=JSON.parse(row.notes);
  if(!meta.contact) throw new Error("Contact record is incomplete. Please retry or contact support.");
  return {...meta.contact,id:row.external_id,name:row.title,last_service_date:row.last_done||""};
}
function contactRow(contact){
  return {household_id:homeHouseholdId,external_id:contact.id,title:contact.name,
    frequency_months:999,last_done:contact.last_service_date||null,category:"Important Contacts",
    // Older app versions understand disabled and won't display contacts as tasks.
    notes:"__TASKSTATE__"+JSON.stringify({disabled:true,contact})};
}
function loadContactRows(rows){
  contacts=rows.filter(isContactRow).map(row=>contactFromRow({...row,notes:String(row.notes).replace(/^__TASKSTATE__/,"")}));
  contactsLoaded=true;
  renderContacts();
}
function clearContacts(){
  contacts=[]; contactsLoaded=false;
  if(typeof formCtx!=="undefined" && formCtx?.contactForm){
    formDlg.close(); formCtx=null; $("#formFields").textContent="";
  }
  renderContacts();
}
function renderContacts(){
  const host=$("#contactsList");
  if(!host) return;
  $("#addContactBtn").disabled=!cloudReady || !contactsLoaded;
  if(!contactsLoaded){host.innerHTML='<p class="home-empty">Connect to load your household contacts.</p>';return;}
  const query=$("#contactSearch").value.trim().toLowerCase();
  const list=contacts.filter(c=>!c.disabled && [c.name,c.category,c.phone,c.email,c.notes].join(" ").toLowerCase().includes(query)).sort((a,b)=>(a.category=== "Neighbor")-(b.category=== "Neighbor") || a.name.localeCompare(b.name));
  let lastGroup="";
  host.innerHTML=list.length ? list.map(c=>{
    const group=c.category==="Neighbor"?"Neighbors":"Contractors, vendors, utilities & support";
    const heading=group!==lastGroup?`<h3>${esc(group)}</h3>`:"";
    lastGroup=group;
    const missing=[["phone",c.phone],["email",c.email],...(c.category==="Neighbor"?[]:[["last service date",c.last_service_date]])].filter(([,v])=>!v).map(([label])=>label);
    const phone=String(c.phone||"").replace(/[^+\d]/g,"");
    const email=String(c.email||"").trim();
    return `${heading}<article class="contact-card home-empty"><b>${esc(c.name)}</b><span>${esc(c.category||"Category not recorded")}</span>
      <div class="contact-actions">${phone?`<a href="tel:${esc(phone)}">${esc(c.phone)}</a>`:""}${/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?`<a href="mailto:${encodeURIComponent(email)}">${esc(email)}</a>`:""}</div>
      <span>Last service: ${c.last_service_date?esc(fmtDate(c.last_service_date)):(c.category==="Neighbor"?"Not applicable":"Not recorded")}</span>
      ${c.notes?`<p class="contact-notes">${esc(c.notes)}</p>`:""}
      ${missing.length?`<small>Incomplete: ${esc(missing.join(", "))}.</small>`:""}
      <button type="button" class="link" data-edit-contact="${esc(c.id)}">Edit contact</button></article>`;
  }).join("") : `<div class="home-empty">${query?"No matching contacts.":"No contacts saved yet. Add a neighbor, contractor, vendor, utility, or support contact."}</div>`;
}
async function saveContact(contact){
  if(!cloudReady || !contactsLoaded || !homeHouseholdId) throw new Error("Connect to your household before saving contacts.");
  const savingHousehold=homeHouseholdId;
  const {error}=await withCloudTimeout(db.from("home_tasks").upsert(contactRow(contact),{onConflict:"household_id,external_id"}),20000,"Save contact");
  if(error) throw error;
  if(!cloudReady || homeHouseholdId!==savingHousehold) return;
  const index=contacts.findIndex(c=>c.id===contact.id);
  if(index<0) contacts.push(contact); else contacts[index]=contact;
  renderContacts();
}
async function migrateLocalNeighbors(){
  // Keep the old cache intact; cloud rows win on repeat visits.
  const legacy=Store.read("wil-neighbors",[]);
  if(!Array.isArray(legacy) || !legacy.length) return;
  const rows=legacy.filter(n=>n.id && n.names).map(n=>contactRow({
    id:"contact:neighbor:"+n.id,name:n.names,category:"Neighbor",phone:"",email:"",
    notes:[n.relation,n.notes].filter(Boolean).join(" · "),last_service_date:"",disabled:!!n.disabled
  }));
  if(!rows.length) return;
  const {error}=await withCloudTimeout(db.from("home_tasks").upsert(rows,{onConflict:"household_id,external_id",ignoreDuplicates:true}),20000,"Move neighbors");
  if(error) throw error;
  await loadContacts();
}
function openContactForm(contact){
  if(!cloudReady || !contactsLoaded){toast("Connect to load your household contacts first.");return;}
  const original=contact||{id:"contact:"+Store.uid()};
  openForm({title:contact?"Edit contact":"Add important contact",asyncSave:true,contactForm:true,
    fields:[
      {key:"name",label:"Name / company",type:"text",value:original.name},
      {key:"category",label:"Role / category (Neighbor, contractor, vendor, utility, support)",type:"text",value:original.category},
      {key:"phone",label:"Phone",type:"tel",value:original.phone},
      {key:"email",label:"Email",type:"email",value:original.email},
      {key:"notes",label:"Notes",type:"textarea",value:original.notes},
      {key:"last_service_date",label:"Last service date (leave blank if unknown)",type:"date",value:original.last_service_date}
    ],
    async onSave(values){
      const clean=Object.fromEntries(Object.entries(values).map(([key,value])=>[key,value.trim()]));
      if(/^neighbors?$/i.test(clean.category)) clean.category="Neighbor";
      if(!clean.name) throw new Error("Enter a name or company.");
      if(clean.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email)) throw new Error("Enter a valid email or leave it blank.");
      if(clean.last_service_date && (!/^\d{4}-\d{2}-\d{2}$/.test(clean.last_service_date) || !Number.isFinite(Date.parse(clean.last_service_date)))) throw new Error("Enter a valid service date or leave it blank.");
      await saveContact({...original,...clean,disabled:false});
      toast("Contact saved");
    }
  });
}
$("#addContactBtn").addEventListener("click",()=>openContactForm(null));
$("#contactSearch").addEventListener("input",renderContacts);
$("#contactsList").addEventListener("click",event=>{
  const edit=event.target.closest("[data-edit-contact]");
  if(edit) openContactForm(contacts.find(c=>c.id===edit.dataset.editContact));
});
