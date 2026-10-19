/* Dealer reference only. No device commands, network discovery, or inventory/cloud writes. */
function renderLutronReference(){
  if(typeof LUTRON_DATA==='undefined') return '';
  const d=LUTRON_DATA;
  return `<details class="system-disclosure lutron-reference">
    <summary>Lutron dealer inventory <span>${d.equipment.length} records</span></summary>
    <div class="system-block system-detail-block">
      <p><b>Documented · physically unverified</b><br>Dealer reports dated ${esc(d.report_date)}. Locations and names retain the dealer’s wording. These records describe programming; they do not control equipment.</p>
      <p><b>Check before using:</b> Movie controller “Off” sets the living-room fan to High (keypad p. 2). Bedroom “ALL OFF” sets it to Off (pp. 5–6). Pool-pump controls are included. “SONOS ON” appears in the keypad drawing without an action list; garage music has no listed button actions.</p>
      <details><summary>Connection & setup checklist</summary><ul>
        <li>Locate Main Repeater RR-MAIN-REP-WH in Equipment Room (installation p. 74), Connect Bridge CONNECT-BDG2-1 in EQUIPTMENT ROOM (p. 75), and auxiliary repeaters at BEDROOM UPSTAIRS (p. 78) and Kitchen (p. 80). Verify each label, power and physical location.</li>
        <li>Record repeater/bridge IP addresses and network access privately. No IP addresses, credentials, integration IDs, serial numbers or pairing codes are supplied by these reports.</li>
        <li>Ask the dealer for the editable project backup, Integration Report and confirmation of an integration login. Verify software/firmware and ownership of Connect/HomeKit setup. The filename suggests 12.10.0; it does not verify installed firmware.</li>
        <li>Home Assistant uses the RadioRA 2 Main Repeater and a programmed integration login. With Home Assistant access, add the Lutron integration, reconcile discovered rooms/devices, then test agreed lights individually. Keep the Connect Bridge for separate Connect/HomeKit setup.</li>
        <li>Leave programming, transfers, resets and automations for a separate authorized setup session. Confirm the fan discrepancy, shade direction and pool-equipment behavior with the dealer.</li>
      </ul><p><a href="https://www.home-assistant.io/integrations/lutron/" target="_blank" rel="noopener">Home Assistant setup guide</a> · <a href="docs/LUTRON.md" target="_blank" rel="noopener">Full setup notes</a> · <a href="data/lutron-radiora2.json" download>Download structured records</a></p></details>
      <label class="search"><span class="sr">Search Lutron records</span><input type="search" data-lutron-search placeholder="Search rooms, zones, models or scenes…"></label>
      <p data-lutron-count role="status">${d.equipment.length} equipment records · ${d.keypads.length} controllers · ${d.keypads.reduce((n,k)=>n+k.buttons.length,0)} programmed button entries</p>
      <div class="lutron-records">
        ${[...new Set(d.equipment.map(e=>e.area))].map(area=>`<details class="lutron-area"><summary>${esc(area)}</summary>${d.equipment.filter(e=>e.area===area).map(e=>`<article class="lutron-entry" data-lutron-record="${esc([area,e.position,e.model,e.zone,e.notes,e.description].join(' ').toLowerCase())}"><b>${esc(e.zone&&e.zone!=='N/A'?e.zone:e.kind)}</b><p>${esc(e.position)} · ${esc(e.model)}<br>${esc(e.description)}</p><small>Installation p. ${e.page} · ${esc(e.kind)} · ${esc(e.wallplate)} · ${esc(e.color)} · Documented, unverified</small>${e.notes?`<p>${esc(e.notes)}</p>`:''}${e.zone.includes('…')?'<p>Printed label is truncated; confirm against the scene target and physical device.</p>':''}</article>`).join('')}</details>`).join('')}
      </div>
      <h4>Controllers & button programming</h4>
      <p>Button names are scoped to their controller. Missing action lists do not prove a button is unused. Raise/lower and audio behavior may require dealer confirmation.</p>
      <div class="lutron-keypads">${d.keypads.map(k=>`<details data-lutron-record="${esc(JSON.stringify(k).toLowerCase())}"><summary>${esc(k.path)}</summary><p>${esc(k.model)} · Keypad p. ${k.page} · Save changes on hold: ${esc(k.save_on_hold||'Not listed')} · Documented, unverified</p>${k.buttons.length?k.buttons.map(b=>`<details><summary>${esc(b.label)} · ${b.actions.length} targets</summary><p>${esc(b.behavior)} · Keypad p. ${b.page}</p><ul>${b.actions.map(a=>`<li>${esc(a.target)}: <b>${esc(a.command)}</b> <small>(p. ${a.page})</small></li>`).join('')}</ul></details>`).join(''):'<p>No button actions listed in this report.</p>'}</details>`).join('')}</div>
    </div>
  </details>`;
}
document.addEventListener('input',e=>{
  if(!e.target.matches('[data-lutron-search]')) return;
  const root=e.target.closest('.lutron-reference');
  const query=e.target.value.trim().toLowerCase();
  let count=0;
  root.querySelectorAll('[data-lutron-record]').forEach(row=>{
    row.hidden=!row.dataset.lutronRecord.includes(query);
    if(!row.hidden)count++;
  });
  root.querySelectorAll('.lutron-area').forEach(area=>{
    area.hidden=![...area.querySelectorAll('[data-lutron-record]')].some(row=>!row.hidden);
    if(query&&!area.hidden)area.open=true;
  });
  root.querySelector('[data-lutron-count]').textContent=query?`${count} matching equipment / controller records`:'110 equipment records · 12 controllers · 34 programmed button entries';
});
