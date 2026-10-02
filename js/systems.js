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
  },
  {
    id:"hvac",
    name:"HVAC",
    icon:"gear",
    summary:"Heating, cooling, filters and seasonal service",
    facts:[
      ["Supplies","Mechanical Room"],
      ["Filter task","Recurring"],
      ["Storage","B2"]
    ],
    supplies:[
      {label:"HVAC and air filters",code:"B2-A"},
      {label:"House-system parts, manuals and maintenance supplies",code:"B2-B"}
    ],
    next:[
      "Confirm filter size and record it in a maintenance entry.",
      "Keep the outdoor unit clear of leaves and debris.",
      "Record professional furnace and air-conditioning service dates."
    ]
  },
  {
    id:"water-heater",
    name:"Water Heater",
    icon:"flame",
    summary:"Hot-water equipment and service history",
    facts:[
      ["Area","Mechanical Room"],
      ["Maintenance","Annual check / flush task"],
      ["Storage","B2"]
    ],
    supplies:[
      {label:"House-system replacement parts and manuals",code:"B2-B"}
    ],
    next:[
      "Record the manufacturer, model, serial number and installation date when convenient.",
      "Log any flush, inspection, leak or service event here.",
      "Keep the area around the unit accessible and watch for moisture or corrosion."
    ]
  },
  {
    id:"network",
    name:"Network & Home Assistant",
    icon:"plug",
    summary:"Internet, NVR, router and smart-home core",
    facts:[
      ["Network shelf","Basement storage"],
      ["Home Assistant","Planned integration"],
      ["Storage","B1-D"]
    ],
    supplies:[
      {label:"Router, network switch, NVR, UPS and Ethernet accessories",code:"B1-D"},
      {label:"Spare electronics and household tech overflow",code:"B1-C"}
    ],
    next:[
      "Label the router, switch, NVR and future Home Assistant connections.",
      "Record ISP equipment, Wi-Fi details and network changes in maintenance history without storing passwords.",
      "Keep a simple device map so cameras, sensors and automations can be traced later."
    ]
  },
  {
    id:"appliances",
    name:"Major Appliances",
    icon:"plug",
    summary:"Kitchen, laundry, garage and outdoor appliances",
    facts:[
      ["Kitchen","M1"],
      ["Garage fridge","G4"],
      ["Outdoor kitchen","O5-O8"]
    ],
    supplies:[
      {label:"Fridge filters and everyday appliance accessories",code:"M1-K"},
      {label:"Garage fridge / freezer overflow",code:"G4"},
      {label:"Outdoor kitchen serving and appliance area",code:"O5"},
      {label:"Outdoor kitchen fridge",code:"O7"},
      {label:"Outdoor ice maker",code:"O8"}
    ],
    next:[
      "Add model and serial numbers when an appliance needs service or a filter.",
      "Log filter replacements, repairs and warranty work.",
      "Keep manuals and hard-to-replace appliance parts with the appropriate house-system supplies."
    ]
  },
  {
    id:"garage",
    name:"Garage Systems",
    icon:"wrench",
    summary:"Doors, heated garage, drains and work area",
    facts:[
      ["Garage","3 stalls"],
      ["Floor","Epoxy"],
      ["Features","Heat + drains"]
    ],
    supplies:[
      {label:"Tools, hardware and repair supplies",code:"G1"},
      {label:"Quick-grab garage and backyard supplies",code:"G3"},
      {label:"Bulky garage and automotive gear",code:"G5"}
    ],
    next:[
      "Test garage-door auto-reverse safety on the recurring maintenance schedule.",
      "Keep floor drains clear and note any slow drainage.",
      "Log heater service, garage-door repairs and major floor or drain maintenance."
    ]
  }
]

let systemLog = loadJSON("wil-system-log", []);

function saveSystemLog(){
  saveJSON("wil-system-log",systemLog);
  cloudSyncTasksSoon();
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
