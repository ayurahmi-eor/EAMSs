/* ================= INDEXEDDB LAYER ================= */
const DB_NAME='eams_db', DB_VER=1;
const STORES=['users','employees','attendance','leaves','overtime','schedules','shifts','departments','logs','settings','facePhotos','notifications'];
let db;

function openDB(){
  return new Promise((res,rej)=>{
    const r=indexedDB.open(DB_NAME,DB_VER);
    r.onupgradeneeded=e=>{
      const d=e.target.result;
      STORES.forEach(s=>{
        if(!d.objectStoreNames.contains(s)){
          const autoInc=(s==='logs'||s==='facePhotos'||s==='notifications');
          d.createObjectStore(s,{keyPath:s==='settings'?'key':'id',autoIncrement:autoInc});
        }
      });
    };
    r.onsuccess=e=>{db=e.target.result;res(db)};
    r.onerror=e=>rej(e);
  });
}
const _tx=(st,m)=>db.transaction(st,m).objectStore(st);
const getAll=st=>new Promise((res,rej)=>{const r=_tx(st,'readonly').getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r)});
const getOne=(st,k)=>new Promise((res,rej)=>{const r=_tx(st,'readonly').get(k);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r)});
const put=(st,v)=>new Promise((res,rej)=>{const r=_tx(st,'readwrite').put(v);r.onsuccess=()=>res(v);r.onerror=()=>rej(r)});
const del=(st,k)=>new Promise((res,rej)=>{const r=_tx(st,'readwrite').delete(k);r.onsuccess=()=>res();r.onerror=()=>rej(r)});
const clearStore=st=>new Promise((res,rej)=>{const r=_tx(st,'readwrite').clear();r.onsuccess=()=>res();r.onerror=()=>rej(r)});
async function bulkPut(st,arr){for(const v of arr)await put(st,v);}

const DEFAULT_SETTINGS={
  company:'PT EAMS Nusantara', tolerance:10, autoLogout:15,
  workDays:[1,2,3,4,5], reminderBefore:15
};
async function getSettings(){const s=await getOne('settings','app');return {...DEFAULT_SETTINGS,...(s?s.value:{})}}
async function saveSettings(v){await put('settings',{key:'app',value:v})}

/* ---- Backup / Restore JSON ---- */
async function exportAll(){
  const out={};
  for(const s of STORES) out[s]=await getAll(s);
  return JSON.stringify({app:'EAMS',version:DB_VER,exportedAt:new Date().toISOString(),data:out},null,2);
}
async function importAll(json){
  const obj=JSON.parse(json);
  if(!obj.data) throw new Error('Format backup tidak valid');
  for(const s of STORES){ if(obj.data[s]) { await clearStore(s); await bulkPut(s,obj.data[s]); } }
  return true;
}
async function storageUsage(){
  let bytes=0;
  for(const s of STORES) (await getAll(s)).forEach(r=>bytes+=JSON.stringify(r).length);
  return {kb:(bytes/1024).toFixed(1), mb:(bytes/1048576).toFixed(2)};
}
async function addLog(user,action,detail){
  await put('logs',{ts:new Date().toISOString(),user,action,detail});
}