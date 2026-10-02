/* ==================================================================
   HOUSE SYSTEMS
   ================================================================== */
const HOUSE_SYSTEMS = [
  {
    id:"pool",
    name:"Pool",
    icon:"waves",
    summary:"14,000 gal outdoor pool",
    facts:[
      ["Volume","14,000 gallons"],
      ["Season","Fall closing prep"],
      ["Storage","O3 / O4"]
    ],
    supplies:[
      {label:"Pool toys, vacuum hose, skimmer net, cover accessories",code:"O3-A"},
      {label:"Replacement filters, pump accessories, vacuum parts",code:"O3-B"},
      {label:"Test kit, test strips, skimmer parts, brush heads",code:"O4-A"},
      {label:"Winter plugs, hose adapters, fittings, seasonal caps",code:"O4-B"}
    ],
    next:[
      "Document the owner's exact winterization process before changing valve or equipment positions.",
      "Photograph pump, filter, heater and valve positions before closing.",
      "Remove and store loose pool accessories before winter cover installation."
    ]
  },
  {
    id:"hot-tub",
    name:"Hot Tub",
    icon:"droplet",
    summary:"Spa care, testing and seasonal maintenance",
    facts:[
      ["Chemicals","Conditioned indoor storage"],
      ["Testing","Keep strips and small accessories together"],
      ["Storage","M5"]
    ],
    supplies:[
      {label:"Label-approved spa chemicals",code:"M5-A"},
      {label:"Test strips, thermometer and filter-cleaning accessories",code:"M5-B"},
      {label:"Pool / spa towels",code:"M5-I"}
    ],
    next:[
      "Test water before making chemical adjustments.",
      "Record water changes, filter cleaning and major chemical corrections.",
      "Keep maintenance products in their labeled storage locations."
    ]
  }
];

let systemLog = loadJSON("wil-system-log", []);

function saveSystemLog(){
  saveJSON("wil-system-log",systemLog);
}

function systemLogFor(id){
  return systemLog.filter(x=>x.system_id===id).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
}

function renderSystems(){
  const host=$("#systemsList");
  if(!host) return;
  host.innerHTML=HOUSE_SYSTEMS.map(sys=>{
    const logs=systemLogFor(sys.id);
    return `<section class="system-card">
      <div class="system-head">
        <span class="system-icon">${icon(sys.icon)}</span>
        <div><h3>${esc(sys.name)}</h3><p>${esc(sys.summary)}</p></div>
      </div>
      <div class="system-facts">${sys.facts.map(([k,v])=>`<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join("")}</div>

      <div class="system-block">
        <h4>What to do next</h4>
        <ul>${sys.next.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
      </div>

      <div class="system-block">
        <h4>Supplies & locations</h4>
        <div class="system-supplies">${sys.supplies.map(s=>`<button type="button" data-system-open="${s.code}"><span>${esc(s.label)}</span><b>${esc(s.code)}</b></button>`).join("")}</div>
      </div>

      <div class="system-block">
        <div class="system-log-head"><h4>Maintenance history</h4><button type="button" data-add-system-log="${sys.id}">+ Add</button></div>
        ${logs.length ? `<div class="system-history">${logs.slice(0,6).map(l=>`<div><b>${esc(fmtDate(l.date))}</b><span>${esc(l.note)}</span></div>`).join("")}</div>` : `<p class="system-empty">No maintenance logged yet.</p>`}
      </div>
    </section>`;
  }).join("");
}

$("#view-systems").addEventListener("click",e=>{
  const open=e.target.closest("[data-system-open]");
  if(open){
    const code=open.dataset.systemOpen;
    const parent=code.includes("-") ? sublocByCode[code]?.location : code;
    if(parent) openSheet(parent);
    return;
  }
  const add=e.target.closest("[data-add-system-log]");
  if(add){
    const sys=HOUSE_SYSTEMS.find(x=>x.id===add.dataset.addSystemLog);
    openForm({
      title:`Log ${sys.name} maintenance`,
      fields:[
        {key:"date",label:"Date",type:"date",value:todayISO()},
        {key:"note",label:"What was done?",type:"textarea",value:""}
      ],
      onSave(v){
        if(!v.note.trim()) return;
        systemLog.push({id:Store.uid(),system_id:sys.id,date:v.date||todayISO(),note:v.note.trim()});
        saveSystemLog();renderSystems();toast("Maintenance logged");
      },
      onDelete:null
    });
  }
});
