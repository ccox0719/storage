/* ---------- date helpers ---------- */
function todayISO(){ return new Date().toISOString().slice(0,10); }
function addMonthsISO(iso, months){
  const d = new Date(iso+"T00:00:00");
  d.setMonth(d.getMonth()+Number(months||0));
  return d.toISOString().slice(0,10);
}
function daysUntil(iso){
  const d = new Date(iso+"T00:00:00");
  const now = new Date(); now.setHours(0,0,0,0);
  return Math.round((d-now)/86400000);
}
function fmtDate(iso){
  if(!iso) return "";
  const d = new Date(iso+"T00:00:00");
  return d.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
}
