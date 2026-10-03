/* ==================================================================
   HOUSE SYSTEMS
   ================================================================== */
const HOUSE_SYSTEMS = [
  {
    id:"pool",
    name:"Pool",
    icon:"waves",
    summary:"18 × 33 outdoor pool · oxygen-assisted sanitation · Hayward heater",
    facts:[
      ["Size","Approx. 18 × 33 ft"],
      ["Sanitation","Oxygen generator + Formula O + liquid chlorine as needed"],
      ["Heater","Hayward pool heater; oversized / fast-heating"],
      ["Filter valve","Filter · Backwash · Rinse · Recirculate · Waste · Winterize · Closed"],
      ["Closing antifreeze","Approx. 10–12 gal pink RV/pool antifreeze total"],
      ["Storage","O3 / O4"]
    ],
    supplies:[
      {label:"Pool toys, vacuum hose, skimmer net, cover accessories",code:"O3-A"},
      {label:"Replacement filters, pump accessories, vacuum parts",code:"O3-B"},
      {label:"Test kit, test strips, skimmer parts, brush heads",code:"O4-A"},
      {label:"Winter plugs, hose adapters, fittings, seasonal caps",code:"O4-B"}
    ],
    next:[
      "SPRING OPEN: Remove mesh cover; reinstall two return jets; fill to skimmer operating line; reconnect PVC while filling; lubricate O-rings/gaskets with Magic Lube; start system and inspect for leaks.",
      "SPRING CHEMISTRY: Take oxygen-system information to the Grimes pool store. Historically buy four yellow liquid-chlorine jugs plus Formula O / oxygen-system chemicals; use store dosing guidance. Initial spring cleanup may use 1–2 jugs, then circulate several days.",
      "VACUUM: Fully prime the vacuum hose with water before connecting. With pump OFF, attach the skimmer vacuum plate/hose, then turn pump ON. For heavy spring debris, switch the multiport to WASTE only while the pump is OFF, vacuum, then refill lost water.",
      "CLOSE: Lower water as needed, remove return nozzles while holding couplers steady, blow/vacuum lines dry, install expandable winter plugs, and fill return lines with pink antifreeze until it appears at the paired opening before plugging.",
      "HEATER CLOSE: Fill the heater loop with antifreeze from one side until it appears at the other, then plug both sides. Turn off heater/gas for winter.",
      "PUMP CLOSE: Remove the two pump drain plugs and leave the pump dry. Store loose drain plugs and small winter parts together in the pump/filter basket.",
      "SKIMMER FREEZE PROTECTION: Brian places a capped plastic soda bottle about half-full of antifreeze in the skimmer after lines are protected; mesh cover allows precipitation back into the pool over winter.",
      "HOSES: Blow flexible hoses clear with an air compressor from one end, then reverse and blow from the other end before storage.",
      "Replace noted O-ring(s) in spring and keep winter plugs, adapters and fittings together in O4-B."
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
      "Keep maintenance products in their labeled storage locations.",
      "WINTER FILLING: The hose by the hot tub can still be used in winter as long as it is disconnected from the spigot after use. Do not leave the hose attached where trapped water can freeze."
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
      "IMPORTANT: Keep the upstairs and downstairs thermostats in the same operating mode. Do not run heat on one thermostat while the other is set to cool; Brian reported this once damaged a control board.",
      "The whole-house humidifier has a replaceable pad/filter; inspect and replace it on a routine schedule.",
      "Record professional furnace, air-conditioning and humidifier service dates."
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
      ["Network shelf","Basement storage / IT closet"],
      ["Cabling","Gray = Ethernet · purple = speaker wiring"],
      ["Yard conduit","Existing 3/4-inch conduit runs under yard for current cable route"],
      ["Fiber note","Metronet utility access is near neighbor-side utility box; goal is to route fiber to IT closet"],
      ["Home Assistant","Planned integration"],
      ["Storage","B1-D"]
    ],
    supplies:[
      {label:"Router, network switch, NVR, UPS and Ethernet accessories",code:"B1-D"},
      {label:"Spare electronics and household tech overflow",code:"B1-C"}
    ],
    next:[
      "Label the router, switch, NVR, Sonos amps, camera-system hardware and future Home Assistant connections.",
      "Gray low-voltage runs are Ethernet; purple runs are speaker wiring.",
      "Existing 3/4-inch conduit runs under the yard for the current cable path. Before trenching or boring, trace this route and the utility access points.",
      "For Metronet fiber, preferred end point is the basement IT closet; Brian noted the utility box is on the neighbor-side area behind the shed/fence.",
      "Basement ceiling tiles near the office/IT area can provide routing access for a new line.",
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
    id:"outdoor-water",
    name:"Outdoor Water & Ice Maker",
    icon:"droplet",
    summary:"Outdoor sink, ice maker, fridge and seasonal water shutoff",
    facts:[
      ["Winter","Shut off two basement valves and drain exterior water lines"],
      ["Ice maker","Bring into garage for winter"],
      ["Outdoor fridge","Stays outside"],
      ["Filter","Exterior water / ice-maker filter in basement"]
    ],
    supplies:[
      {label:"Outdoor kitchen and appliance area",code:"O5"},
      {label:"Outdoor kitchen fridge",code:"O7"},
      {label:"Outdoor ice maker",code:"O8"}
    ],
    next:[
      "FALL: Shut off the two basement valves serving the exterior water system and drain the outdoor sink/ice-maker line.",
      "Disconnect ice maker power, water-supply line and garden-hose drain. The garden hose drains under the deck.",
      "Cover/tape the exposed water-line opening so dirt cannot enter, then store the ice maker in the garage.",
      "Leave the outdoor refrigerator and grills in place for winter.",
      "SPRING: Reconnect the water line and drain hose, tighten the clamp, reopen basement shutoffs and check for leaks.",
      "Replace the exterior water / ice-maker filter when due; Brian noted a spring replacement."
    ]
  },
  {
    id:"fountain",
    name:"Fountain",
    icon:"droplet",
    summary:"Under-deck fountain, pump, filter and seasonal care",
    facts:[
      ["Winter","Drain / vacuum bowl and remove loose components"],
      ["Filter","Small pond-style filter"],
      ["Treatment","Small amount of algaecide in bowl as needed"]
    ],
    supplies:[
      {label:"Outdoor / pool accessories and seasonal parts",code:"O3-A"},
      {label:"Winter plugs, fittings and seasonal caps",code:"O4-B"}
    ],
    next:[
      "At closing, vacuum remaining water from the fountain bowl and drainage pocket.",
      "Remove fountain pump/filter components, rinse or wipe them down, and store loose pieces in the shed / pool storage.",
      "Bring the fountain bowl indoors for winter if applicable; prior attempts to leave it out resulted in freeze damage.",
      "Use only a small label-directed amount of algaecide in the fountain bowl during the season.",
      "Replace the noted fountain O-ring in spring."
    ]
  },
  {
    id:"lighting",
    name:"Lighting & Automation",
    icon:"plug",
    summary:"Whole-home lighting scenes, patio transformers and sunrise/sunset effects",
    facts:[
      ["Controls","Mix of hardwired and wireless switches / motion sensors"],
      ["Patio","Black low-voltage transformers on timers"],
      ["Basement window","LED faux window follows sunrise / sunset"]
    ],
    supplies:[
      {label:"Spare electronics and household tech overflow",code:"B1-C"},
      {label:"Router, network switch, NVR, UPS and Ethernet accessories",code:"B1-D"}
    ],
    next:[
      "Reconnect the main lighting system to the network and import the programming file from Brian if needed.",
      "Some rooms use wireless motion sensors; others have motion sensing built into the wall switch.",
      "Plug-in lamp modules can be scheduled, dimmed and included in scenes.",
      "Patio/deck lights are powered by black transformer boxes on timers.",
      "A separate outdoor decorative-light controller has a scannable QR/barcode for its own app and timer setup.",
      "The faux basement window uses LED tape behind frosted glass and automatically follows local sunrise/sunset."
    ]
  },
  {
    id:"electrical",
    name:"Electrical & Heated Floors",
    icon:"plug",
    summary:"Panels, surge protection, hot tub and radiant tile heat",
    facts:[
      ["Protection","Whole-house SPD / TVSS"],
      ["Panels","Basement → garage → pool"],
      ["Heated tile","Laundry, both upstairs baths, basement tile"]
    ],
    supplies:[
      {label:"House-system parts, manuals and maintenance supplies",code:"B2-B"}
    ],
    next:[
      "Document breaker labels and photograph each panel for the house map.",
      "Whole-house surge protective device is installed at the main electrical equipment.",
      "Basement panel includes the hot-tub breaker, garage-panel feeder and floor-heat circuits.",
      "Garage panel feeds downstream equipment including the pool-panel area.",
      "Reconnect/configure the heated-floor thermostat app for the laundry room, both upstairs bathrooms and basement tile."
    ]
  },
  {
    id:"entertainment",
    name:"TV & Entertainment",
    icon:"plug",
    summary:"Samsung art display, Roku streaming and distributed media",
    facts:[
      ["Streaming","Roku devices used across TVs"],
      ["Art TV","Samsung account supports photo / art display"],
      ["Audio","Sonos amps in IT area"]
    ],
    supplies:[
      {label:"Spare electronics and household tech overflow",code:"B1-C"},
      {label:"Router, network switch, NVR, UPS and Ethernet accessories",code:"B1-D"}
    ],
    next:[
      "Set up the Samsung account on the art-style TV for personal photos/art; optional paid art subscription is available.",
      "The thin Samsung display uses a separate external control / brain box behind or near the TV.",
      "Configure Roku devices and sign into preferred streaming services for a consistent interface across TVs.",
      "Document which Roku remote and external box belongs to each TV.",
      "Sonos amplifiers and network cabling are located in the IT area."
    ]
  },
  {
    id:"exterior",
    name:"Exterior & Fence",
    icon:"wrench",
    summary:"Modular wood fence, turf edge and exterior maintenance",
    facts:[
      ["Fence","Modular / individually repairable sections"],
      ["Posts","Mix of original cedar and newer treated replacements"],
      ["Stain cycle","Historically about every 3 years"],
      ["Turf edge","PVC edging/board with stone base beneath"]
    ],
    supplies:[
      {label:"Tools, hardware and repair supplies",code:"G1"},
      {label:"Quick-grab garage and backyard supplies",code:"G3"}
    ],
    next:[
      "Fence sections can be disassembled by removing the exterior face boards, allowing individual posts or damaged boards to be replaced instead of replacing the whole fence.",
      "Inspect post bases and lower boards each spring for rot, movement or storm damage.",
      "Brian historically had the fence cleaned/restained about every 3 years.",
      "Where lower fence boards deteriorate, a replacement/taller lower board can be added as a localized repair.",
      "Artificial turf perimeter uses a PVC-style board/edge with light-colored stone chips beneath; document this before any digging near the turf."
    ]
  },
  {
    id:"central-vac",
    name:"Central Vacuum (Inactive)",
    icon:"plug",
    summary:"Legacy central-vac piping/inlets remain; main unit removed",
    facts:[
      ["Status","Not currently operational"],
      ["Main unit","Removed"],
      ["Remaining parts","Some wall / kick-plate inlets may remain"]
    ],
    supplies:[
      {label:"House-system parts, manuals and maintenance supplies",code:"B2-B"}
    ],
    next:[
      "Do not assume remaining kick-plate or wall inlets are active; the central vacuum power unit was removed.",
      "If restoring the system later, first locate and inspect the remaining piping/inlets and determine where the original power unit connected.",
      "Until restored, treat the visible inlets as legacy house infrastructure."
    ]
  },
  {
    id:"garage",
    name:"Garage Systems",
    icon:"wrench",
    summary:"Doors, heated garage, drains and work area",
    facts:[
      ["Garage","3 stalls"],
      ["Floor","Epoxy; not radiant-heated"],
      ["Insulation","Extra insulation added when garage was built"],
      ["Heat","Overhead blower heater; sufficient for winter use"],
      ["Drains","Garage drains discharge to a low area in the yard below the tree"],
      ["Attic","Pull-down access on east side of garage; existing shelves + room for more"]
    ],
    supplies:[
      {label:"Tools, hardware and repair supplies",code:"G1"},
      {label:"Quick-grab garage and backyard supplies",code:"G3"},
      {label:"Bulky garage and automotive gear",code:"G5"}
    ],
    next:[
      "Test garage-door auto-reverse safety on the recurring maintenance schedule.",
      "Garage floor is not heated. The space relies on extra insulation plus the overhead blower heater and can be used comfortably in winter.",
      "Keep floor drains clear and note any slow drainage. Drain discharge runs to the low spot in the yard below the tree.",
      "Garage attic access is on the east side via pull-down stick/ladder. Existing shelves provide long-term storage; preserve a clear access path and avoid overloading attic framing.",
      "Log heater service, garage-door repairs and major floor or drain maintenance."
    ]
  }
]


const WINTERIZE_STEPS = [
  {section:"Pool",items:[
    "Finish final swim, skim/brush/vacuum, and balance water for closing.",
    "Lower pool water to the established winter closing level.",
    "Turn pump OFF before changing the multiport valve position.",
    "Remove the two return jet/nozzle fittings while holding the couplers steady.",
    "Use the shop vac to vacuum the pool return lines clear of water. The air compressor is for the irrigation/drip lines, not the pool PVC.",
    "Install the correct expandable winter plugs in the return/skimmer openings.",
    "Pour pink RV/pool antifreeze into the return-line openings until it appears at the paired opening, then plug both ends. Brian estimated roughly 7–8 gallons for the two return lines.",
    "Winterize heater: pour antifreeze into one heater-side opening until it appears at the opposite side, then plug both sides.",
    "Turn heater OFF and close the gas shutoff for winter.",
    "Drain pump completely by removing the two pump drain plugs; leave the pump dry.",
    "Place a capped plastic soda bottle about half-full of antifreeze in the skimmer for freeze protection.",
    "Set the sand-filter multiport dial to Winterize after the pool lines are drained and protected.",
    "Install the mesh winter cover."
  ]},
  {section:"Fountain",items:[
    "Vacuum/drain all remaining water from the fountain bowl and drainage pocket.",
    "Remove the fountain pump/filter components.",
    "Rinse/wipe fountain parts and store loose pieces in the shed/pool storage.",
    "Bring the freeze-sensitive fountain bowl/component indoors if applicable.",
    "Note fountain O-ring replacement for spring."
  ]},
  {section:"Outdoor kitchen & water",items:[
    "Shut off the two basement valves serving the outdoor sink/ice-maker water line.",
    "Open/drain the exterior water lines so trapped water is removed.",
    "Disconnect outdoor ice maker power.",
    "Disconnect the ice-maker water-supply line and garden-hose drain line.",
    "Cover/tape the exposed water-line opening so dirt cannot enter.",
    "Move the outdoor ice maker into the garage.",
    "Leave the outdoor refrigerator and grills in place.",
    "Note exterior water/ice-maker filter replacement for spring."
  ]},
  {section:"Hot tub",items:[
    "Top off the hot tub with the nearby hose when needed during winter.",
    "Always disconnect the hose from the spigot after winter use so trapped water cannot freeze."
  ]},
  {section:"Patio & outdoor items",items:[
    "Bring patio cushions into the garage/shed.",
    "Roll up and store outdoor rugs.",
    "Store loose pool/fountain accessories and seasonal parts.",
    "Let the annuals die back for winter and clear them when convenient."
  ]},
  {section:"Irrigation / drip lines",items:[
    "Shut off water to the outdoor drip/irrigation system.",
    "Connect the compressor adapter and blow the irrigation/drip lines clear."
  ]},
  {section:"Garage",items:[
    "Confirm garage floor drains are clear before freeze season.",
    "Remember garage floor is not radiant-heated; use the overhead blower heater as needed.",
    "Keep the attic pull-down access and winter storage path clear."
  ]}
];

const WINTERIZE_CHECKLIST_VERSION = 2;
let winterizeChecks = loadJSON("wil-winterize-checks", {});
if(Number(localStorage.getItem("wil-winterize-checklist-version")||0) < WINTERIZE_CHECKLIST_VERSION){
  winterizeChecks = {};
  saveJSON("wil-winterize-checks", winterizeChecks);
  localStorage.setItem("wil-winterize-checklist-version", String(WINTERIZE_CHECKLIST_VERSION));
}
function saveWinterizeChecks(){ saveJSON("wil-winterize-checks",winterizeChecks); cloudSyncTasksSoon(); }
function winterizeKey(section,index){ return section+"::"+index; }
function winterizeProgress(){
  const sections=winterizeSections();
  const total=sections.reduce((n,s)=>n+s.items.length,0);
  const done=sections.reduce((n,s)=>n+s.items.filter((_,i)=>winterizeChecks[winterizeKey(s.section,i)]).length,0);
  return {done,total};
}
function renderWinterizeChecklist(){
  const p=winterizeProgress();
  return `<section class="system-card winterize-card" id="system-winterize">
    <div class="system-head">
      <span class="system-icon">${icon("snowflake")}</span>
      <div><h3>Winterize House</h3><p>Step-by-step seasonal shutdown checklist · ${p.done}/${p.total} complete</p></div>
      <button type="button" class="system-edit-btn" data-reset-winterize>Reset</button>
    </div>
    ${WINTERIZE_STEPS.map(sec=>`<div class="system-block">
      <h4>${esc(sec.section)}</h4>
      <div class="system-task-list">
        ${sec.items.map((item,i)=>{
          const key=winterizeKey(sec.section,i);
          const checked=!!winterizeChecks[key];
          return `<label class="system-task-row winterize-row">
            <span><input type="checkbox" data-winterize-check="${esc(key)}" ${checked?"checked":""}> <b>${esc(item)}</b></span>
          </label>`;
        }).join("")}
      </div>
    </div>`).join("")}
  </section>`;
}

let systemLog = loadJSON("wil-system-log", []);
let systemProfiles = loadJSON("wil-system-profiles", {});
let systemPrefs = loadJSON("wil-system-prefs", {});

function winterizeSections(){
  const saved=systemPrefs["winterize-checklist"]?.sections;
  return Array.isArray(saved) && saved.length ? saved : WINTERIZE_STEPS.map(s=>({section:s.section,items:[...s.items]}));
}
function saveWinterizeSections(sections){
  systemPrefs["winterize-checklist"]={...(systemPrefs["winterize-checklist"]||{}),sections};
  saveSystemPrefs();
}
function resetWinterizeChecksForEdit(){
  winterizeChecks={};
  saveWinterizeChecks();
}

function saveSystemLog(){
  saveJSON("wil-system-log",systemLog);
  cloudSyncTasksSoon();
}
function saveSystemProfiles(){
  saveJSON("wil-system-profiles",systemProfiles);
  cloudSyncTasksSoon();
}
function systemProfile(id){
  return systemProfiles[id] || {};
}
function systemPref(id){
  return systemPrefs[id] || {};
}
function saveSystemPrefs(){
  saveJSON("wil-system-prefs",systemPrefs);
  cloudSyncTasksSoon();
}

function systemLogFor(id){
  return systemLog.filter(x=>x.system_id===id).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
}

const SYSTEM_TASK_IDS = {
  pool:[],
  "hot-tub":[],
  hvac:["t1","t8"],
  "water-heater":["t3"],
  network:[],
  appliances:["t4","t6","t11"],
  garage:["t9"],
  "outdoor-water":[],
  fountain:[],
  lighting:[],
  electrical:[],
  entertainment:[],
  exterior:[],
  "central-vac":[]
};
function systemTasks(id){
  const ids=SYSTEM_TASK_IDS[id]||[];
  return tasks.filter(t=>!t.disabled && ids.includes(t.id)).sort((a,b)=>taskStatus(a).sortKey-taskStatus(b).sortKey);
}
function systemForTask(t){
  const match=Object.entries(SYSTEM_TASK_IDS).find(([,ids])=>ids.includes(t.id));
  if(!match) return null;
  return systemPref(match[0]).disabled ? null : match[0];
}
const systemOpen = new Set();
function focusSystem(id){
  systemOpen.add(id);
  renderSystems();
  const el=document.getElementById(`system-${id}`);
  if(!el) return;
  el.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});
  el.classList.add("system-focus");
  setTimeout(()=>el.classList.remove("system-focus"),1200);
}

function renderSystems(){
  const host=$("#systemsList");
  if(!host) return;
  const activeSystems=HOUSE_SYSTEMS.filter(sys=>!systemPref(sys.id).disabled);
  const removedSystems=HOUSE_SYSTEMS.filter(sys=>systemPref(sys.id).disabled);
  host.innerHTML=activeSystems.map(sys=>{
    const pref=systemPref(sys.id);
    const displayName=pref.name||sys.name;
    const displaySummary=pref.summary||sys.summary;
    const logs=systemLogFor(sys.id);
    const linkedTasks=systemTasks(sys.id);
    const open=systemOpen.has(sys.id);
    return `<section class="system-card" id="system-${sys.id}" data-expanded="${open}">
      <div class="system-head">
        <button type="button" class="system-summary" data-toggle-system="${sys.id}" aria-expanded="${open}">
          <span class="system-icon">${icon(sys.icon)}</span>
          <span class="system-summary-copy"><h3>${esc(displayName)}</h3><p>${esc(displaySummary)}</p></span>
          ${linkedTasks.length?`<span class="system-mini">${linkedTasks.length} task${linkedTasks.length===1?"":"s"}</span>`:""}
          <span class="system-chev" aria-hidden="true">›</span>
        </button>
        <button type="button" class="system-edit-btn" data-edit-system="${sys.id}" aria-label="Edit ${esc(displayName)}">Edit</button>
      </div>
      <div class="system-body" ${open?"":"hidden"}>
        <div class="system-facts">${sys.facts.map(([k,v])=>`<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join("")}</div>

        <div class="system-block system-equipment">
          <div class="system-log-head"><h4>Equipment record</h4><button type="button" data-edit-system-profile="${sys.id}">Edit</button></div>
          ${(()=>{
            const p=systemProfile(sys.id);
            const rows=[
              ["Manufacturer",p.manufacturer],
              ["Model",p.model],
              ["Serial",p.serial],
              ["Installed",p.install_date ? fmtDate(p.install_date) : ""],
              ["Service",p.service_contact],
              ["Manual",p.manual_url]
            ].filter(([,v])=>v);
            return rows.length
              ? `<div class="system-profile-grid">${rows.map(([k,v])=>`<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join("")}</div>`
              : `<p class="system-empty">No equipment details recorded yet.</p>`;
          })()}
        </div>

        ${linkedTasks.length ? `<div class="system-block">
          <h4>Recurring maintenance</h4>
          <div class="system-task-list">${linkedTasks.map(t=>{
            const st=taskStatus(t);
            return `<div class="system-task-row">
              <span><b>${esc(t.title)}</b><small>Every ${t.frequency_months} month${t.frequency_months==1?"":"s"} · ${esc(st.label)}</small></span>
              <button type="button" data-system-task-done="${t.id}">Done</button>
            </div>`;
          }).join("")}</div>
        </div>` : ""}

        <details class="system-disclosure">
          <summary>Operating & reference notes <span>${sys.next.length}</span></summary>
          <div class="system-block system-detail-block"><ul>${sys.next.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>
        </details>

        <details class="system-disclosure">
          <summary>Supplies & locations <span>${sys.supplies.length}</span></summary>
          <div class="system-block system-detail-block"><div class="system-supplies">${sys.supplies.map(s=>`<button type="button" data-system-open="${s.code}"><span>${esc(s.label)}</span><b>${esc(s.code)}</b></button>`).join("")}</div></div>
        </details>

        <details class="system-disclosure">
          <summary>Maintenance history <span>${logs.length}</span></summary>
          <div class="system-block system-detail-block">
            <div class="system-log-head"><h4>History</h4><button type="button" data-add-system-log="${sys.id}">+ Add</button></div>
            ${logs.length ? `<div class="system-history">${logs.slice(0,6).map(l=>`<div><b>${esc(fmtDate(l.date))}</b><span>${esc(l.note)}</span></div>`).join("")}</div>` : `<p class="system-empty">No maintenance logged yet.</p>`}
          </div>
        </details>
      </div>
    </section>`;
  }).join("") + (removedSystems.length ? `<details class="removed-tasks system-removed"><summary>Removed systems (${removedSystems.length})</summary><div class="removed-task-list">${removedSystems.map(sys=>`<div class="removed-task-row"><span>${esc(systemPref(sys.id).name||sys.name)}</span><button type="button" data-restore-system="${sys.id}">Restore</button></div>`).join("")}</div></details>` : "");
}

$("#view-systems").addEventListener("click",e=>{
  const toggleSystem=e.target.closest("[data-toggle-system]");
  if(toggleSystem){
    const id=toggleSystem.dataset.toggleSystem;
    systemOpen.has(id) ? systemOpen.delete(id) : systemOpen.add(id);
    renderSystems();
    return;
  }
  const reset=e.target.closest("[data-reset-winterize]");
  if(reset){
    if(confirm("Reset all Winterize House checklist items?")){
      winterizeChecks={};
      saveWinterizeChecks();
      renderSystems();
      toast("Winterize checklist reset");
    }
    return;
  }
  const restoreSystem=e.target.closest("[data-restore-system]");
  if(restoreSystem){
    const id=restoreSystem.dataset.restoreSystem;
    systemPrefs[id]={...(systemPrefs[id]||{}),disabled:false};
    saveSystemPrefs();renderSystems();toast("System restored");
    return;
  }

  const editSystem=e.target.closest("[data-edit-system]");
  if(editSystem){
    const sys=HOUSE_SYSTEMS.find(x=>x.id===editSystem.dataset.editSystem);
    const pref=systemPref(sys.id);
    openForm({
      title:`Edit ${pref.name||sys.name}`,
      fields:[
        {key:"name",label:"System name",type:"text",value:pref.name||sys.name},
        {key:"summary",label:"Summary",type:"text",value:pref.summary||sys.summary}
      ],
      onSave(v){
        systemPrefs[sys.id]={...(systemPrefs[sys.id]||{}),name:v.name.trim()||sys.name,summary:v.summary.trim()||sys.summary,disabled:false};
        saveSystemPrefs();renderSystems();toast("System updated");
      },
      onDelete(){
        systemPrefs[sys.id]={...(systemPrefs[sys.id]||{}),disabled:true};
        saveSystemPrefs();renderSystems();toast("System removed");
      }
    });
    return;
  }

  const doneTask=e.target.closest("[data-system-task-done]");
  if(doneTask){
    const t=tasks.find(x=>x.id===doneTask.dataset.systemTaskDone);
    if(t){
      t.last_done=todayISO();
      t.snoozed_until=null;
      saveTasks();
      renderTasks();
      renderSystems();
      renderHomeDashboard();
      toast(`Marked “${t.title}” done today`);
    }
    return;
  }

  const open=e.target.closest("[data-system-open]");
  if(open){
    const code=open.dataset.systemOpen;
    const parent=code.includes("-") ? sublocByCode[code]?.location : code;
    if(parent) openSheet(parent);
    return;
  }
  const editProfile=e.target.closest("[data-edit-system-profile]");
  if(editProfile){
    const sys=HOUSE_SYSTEMS.find(x=>x.id===editProfile.dataset.editSystemProfile);
    const p=systemProfile(sys.id);
    openForm({
      title:`Edit ${sys.name} equipment`,
      fields:[
        {key:"manufacturer",label:"Manufacturer",type:"text",value:p.manufacturer||""},
        {key:"model",label:"Model",type:"text",value:p.model||""},
        {key:"serial",label:"Serial number",type:"text",value:p.serial||""},
        {key:"install_date",label:"Installed / purchased",type:"date",value:p.install_date||""},
        {key:"service_contact",label:"Service company / contact",type:"text",value:p.service_contact||""},
        {key:"manual_url",label:"Manual / reference link",type:"text",value:p.manual_url||""},
        {key:"notes",label:"Equipment notes",type:"textarea",value:p.notes||""}
      ],
      onSave(v){
        systemProfiles[sys.id]={
          manufacturer:v.manufacturer.trim(),
          model:v.model.trim(),
          serial:v.serial.trim(),
          install_date:v.install_date||"",
          service_contact:v.service_contact.trim(),
          manual_url:v.manual_url.trim(),
          notes:v.notes.trim()
        };
        saveSystemProfiles();renderSystems();toast("Equipment record saved");
      },
      onDelete:Object.keys(p).length ? ()=>{
        delete systemProfiles[sys.id];
        saveSystemProfiles();renderSystems();toast("Equipment record cleared");
      } : null
    });
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
