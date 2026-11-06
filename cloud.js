// Offline-first cloud sync. Changes always land locally first.
let cloud=null,cloudUser=null,cloudRevision=null,cloudDirty=false,cloudBusy=false,cloudTimer=null,cloudMessage='Nicht verbunden';
const cloudConfig=()=>{try{return JSON.parse(localStorage.getItem('fitness_os_cloud_config')||'null')}catch{return null}};
const cloudStatus=()=>`${cloudUser?'☁ '+cloudUser.email:'Offline'} · ${cloudMessage}`;
function cloudToast(message){cloudMessage=message;const el=document.getElementById('cloudStatus');if(el)el.textContent=cloudStatus()}
const cloudPendingKey='fitness_os_sync_pending';
const cloudBaseKey=user=>'fitness_os_sync_base_'+user;
const cloudCopy=value=>JSON.parse(JSON.stringify(value));
const cloudEqual=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const cloudHasRealData=value=>value&&Object.keys(value).some(k=>!cloudEqual(value[k],defaults[k])&&k!=='activeWorkout');
// Conflict is deliberately non-destructive: never silently overwrite both writers' changes.
function cloudMerge(base,local,remote,path='root'){
 if(cloudEqual(local,remote))return cloudCopy(local);
 if(cloudEqual(local,base))return cloudCopy(remote);
 if(cloudEqual(remote,base))return cloudCopy(local);
 if(Array.isArray(local)&&Array.isArray(remote)){
  const b=Array.isArray(base)?base:[];
  const byId=arr=>arr.every(x=>x&&typeof x==='object'&&(x.id!==undefined||x.date!==undefined));
  if(byId(local)&&byId(remote)&&byId(b)){
   const key=x=>String(x.id??'date:'+x.date);
   const a=new Map(b.map(x=>[key(x),x])),l=new Map(local.map(x=>[key(x),x])),r=new Map(remote.map(x=>[key(x),x]));
   const keys=[...new Set([...a.keys(),...r.keys(),...l.keys()])],out=[];
   for(const id of keys){
    const old=a.get(id),lv=l.get(id),rv=r.get(id);
    if(lv===undefined&&rv===undefined)continue;
    if(lv===undefined||rv===undefined){
     if(old!==undefined&&!cloudEqual(lv??null,old)&&!cloudEqual(rv??null,old))throw Error('SYNC_MERGE_CONFLICT '+path+'/'+id);
     if(old!==undefined)continue; // deleted on one side, unchanged on the other
     out.push(cloudCopy(lv??rv));continue;
    }
    out.push(cloudMerge(old,lv,rv,path+'/'+id));
   }
   return out;
  }
  const encode=x=>JSON.stringify(x),bk=new Set(b.map(encode));
  if(b.some(x=>!local.some(y=>cloudEqual(x,y))||!remote.some(y=>cloudEqual(x,y))))throw Error('SYNC_MERGE_CONFLICT '+path);
  const out=cloudCopy(remote),present=new Set(remote.map(encode));
  for(const x of local){const k=encode(x);if(!present.has(k)&&!bk.has(k)){out.push(cloudCopy(x));present.add(k)}}
  return out;
 }
 if(local&&remote&&typeof local==='object'&&typeof remote==='object'&&!Array.isArray(local)&&!Array.isArray(remote)){
  const out={};
  for(const k of new Set([...Object.keys(base||{}),...Object.keys(local),...Object.keys(remote)])){
   const lv=Object.prototype.hasOwnProperty.call(local,k)?local[k]:null,rv=Object.prototype.hasOwnProperty.call(remote,k)?remote[k]:null,bv=base?.[k]??null;
   const value=cloudMerge(bv,lv,rv,path+'/'+k);
   if(value!==null)out[k]=value;
  }
  return out;
 }
 throw Error('SYNC_MERGE_CONFLICT '+path);
}
function cloudStoreBase(snapshot,revision){
 localStorage.setItem(cloudBaseKey(cloudUser.id),JSON.stringify(snapshot));
 cloudRevision=revision;
}
function cloudSchedule(ms=800){clearTimeout(cloudTimer);if(!cloudUser)return;cloudTimer=setTimeout(()=>cloudSync(),ms)}
function cloudMarkDirty(){
 cloudDirty=true;localStorage.setItem(cloudPendingKey,'1');
 cloudToast(navigator.onLine?'Lokal gespeichert · synchronisiere':'Offline · lokal gespeichert');
 cloudSchedule();
}
async function cloudInit(){
 const cfg=cloudConfig();if(!cfg||!window.supabase)return;
 try{
  cloud=window.supabase.createClient(cfg.url,cfg.key);
  const {data,error}=await cloud.auth.getUser();if(error)throw error;
  if(data.user){cloudUser=data.user;cloudDirty=localStorage.getItem(cloudPendingKey)==='1';await cloudSync()}
  else cloudToast('Bitte anmelden');
  cloud.auth.onAuthStateChange((_,session)=>{
   const newUser=session?.user;
   if(!newUser){cloudUser=null;cloudRevision=null;cloudToast('Abgemeldet');return}
   if(cloudUser?.id!==newUser.id){cloudUser=newUser;cloudRevision=null;cloudSchedule(0)}
  });
 }catch(err){cloudToast('Offline · lokale Daten bleiben erhalten')}
}
async function cloudSync(){
 if(!cloud||!cloudUser||cloudBusy||!navigator.onLine)return;
 cloudBusy=true;
 try{
  // Always fetch fresh revision first, including changes made on the other device.
  const {data,error}=await cloud.from('fitness_states').select('payload,revision').eq('user_id',cloudUser.id).maybeSingle();
  if(error)throw error;
  const remote=data?.payload||cloudCopy(defaults),revision=data?.revision??0;
  const key=cloudBaseKey(cloudUser.id);
  let base;try{base=JSON.parse(localStorage.getItem(key)||'null')}catch{base=null}
  const pending=cloudDirty||localStorage.getItem(cloudPendingKey)==='1';
  const current=cloudCopy(db);
  if(!base){
   // Existing devices with data and an existing cloud record have no common
   // ancestor. Keep both unchanged rather than choosing a destructive overwrite.
   if(data&&cloudHasRealData(current)&&!cloudEqual(current,remote)){
    // Attempt a conservative merge for data created before this sync engine.
    // If concurrent edits to one field cannot be reconciled, keep the local copy.
    try{cloudMerge(defaults,current,remote)}catch{
     cloudToast('Abgleich erforderlich: lokale und Cloud-Änderungen geschützt');
     return;
    }
    cloudDirty=true;
   }
   base=cloudCopy(defaults);
  }
  const next=(pending||cloudDirty)?cloudMerge(base,current,remote):cloudCopy(remote);
  // If local data has no base but cloud is empty, upload the local data.
  if(!data&&cloudHasRealData(current))Object.assign(next,cloudMerge(base,current,remote));
  if(!cloudEqual(next,remote)){
   const snapshot=cloudCopy(next);
   const {data:rev,error:pushError}=await cloud.rpc('save_fitness_state',{expected_revision:revision,new_payload:snapshot});
   if(pushError)throw pushError;
   cloudStoreBase(snapshot,rev);
  }else cloudStoreBase(remote,revision);
  // A user action might have happened while the network request was pending.
  const changedDuringSync=!cloudEqual(db,current);
  if(!changedDuringSync){
   db=next;
   for(const k in defaults)if(!(k in db))db[k]=cloudCopy(defaults[k]);
   localStorage.setItem('fitness_os_v1',JSON.stringify(db));
   if(!active&&db.activeWorkout?.ex&&db.activeWorkout?.started){
    active=cloudCopy(db.activeWorkout);
    localStorage.setItem('fitness_os_active_v3',JSON.stringify(active));
   }
   render();
  }
  cloudDirty=changedDuringSync;
  if(cloudDirty){localStorage.setItem(cloudPendingKey,'1');cloudSchedule(1000)}
  else localStorage.removeItem(cloudPendingKey);
  cloudToast(cloudDirty?'Lokal gespeichert · weitere Änderungen ausstehend':'Synchronisiert');
 }catch(err){
  cloudDirty=true;localStorage.setItem(cloudPendingKey,'1');
  cloudToast(String(err.message||err).includes('SYNC_MERGE_CONFLICT')?'Synchronisierungskonflikt · lokale Änderungen sicher gespeichert':'Offline/Sync-Fehler · lokal gespeichert');
 }finally{cloudBusy=false}
}
async function cloudLoad(){await cloudSync()}
async function cloudPush(){await cloudSync()}
function cloudExportConfig(){
 const cfg=cloudConfig();
 if(!cfg)return alert('Hier ist noch keine Cloud konfiguriert.');
 const value=JSON.stringify({url:cfg.url,key:cfg.key});
 if(navigator.clipboard?.writeText)navigator.clipboard.writeText(value).then(()=>alert('Öffentliche Cloud-Konfiguration kopiert. Im Home-Bildschirm unter Backup & Daten einfügen.'),()=>prompt('Konfiguration kopieren:',value));
 else prompt('Konfiguration kopieren:',value);
}
function cloudImportConfig(e){
 e.preventDefault();
 let raw=String(new FormData(e.target).get('config')||'').trim();
 try{
  let cfg=JSON.parse(raw);
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(cfg.url)||typeof cfg.key!=='string'||!cfg.key.trim()||/service_role|sb_secret_/i.test(cfg.key))throw Error('Ungültige oder private Schlüssel');
  localStorage.setItem('fitness_os_cloud_config',JSON.stringify({url:cfg.url,key:cfg.key.trim()}));
  alert('Cloud-Konfiguration gespeichert. Bitte mit demselben Fitness-OS-Konto anmelden; keinen neuen Datenstand hochladen.');
  location.reload();
 }catch(err){alert('Konfiguration konnte nicht übernommen werden. Bitte kopierten Text vollständig einfügen. '+err.message)}
}
function cloudConfigure(e){e.preventDefault();const f=new FormData(e.target),url=String(f.get('url')||'').trim(),key=String(f.get('key')||'').trim();if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)||!key||/service_role|sb_secret_/i.test(key)){alert('Bitte gültige Supabase Project URL und Publishable/anon Key verwenden. Niemals einen service_role/secret Key!');return}localStorage.setItem('fitness_os_cloud_config',JSON.stringify({url,key}));location.reload()}
async function cloudLogin(e){e.preventDefault();if(!cloud)return alert('Cloud zuerst konfigurieren.');const f=new FormData(e.target),email=String(f.get('email')),password=String(f.get('password'));const signup=f.get('mode')==='signup';try{const {data,error}=await (signup?cloud.auth.signUp({email,password}):cloud.auth.signInWithPassword({email,password}));if(error)throw error;if(!data.session){alert('Registriert. Bitte ggf. E-Mail bestätigen und danach anmelden.');return}cloudUser=data.user;cloudRevision=null;cloudToast('Angemeldet');await cloudSync()}catch(err){alert('Anmeldung fehlgeschlagen: '+err.message)}}
async function cloudLogout(){if(!cloud)return;await cloud.auth.signOut();cloudUser=null;cloudRevision=null;cloudDirty=localStorage.getItem(cloudPendingKey)==='1';cloudToast('Abgemeldet');render()}
async function cloudFirstUpload(){await cloudSync()}
function cloudPanel(){const cfg=cloudConfig();return `<section class="card"><h2>☁ Cloud-Synchronisierung</h2><p class="small" id="cloudStatus">${esc(cloudStatus())}</p>${!cfg?`<p class="small">Supabase-Projekt erstellen, cloud.sql ausführen und hier die öffentlichen Zugangsdaten eintragen.</p><form class="stack" onsubmit="cloudImportConfig(event)"><label>Konfiguration aus Safari übernehmen<textarea name="config" rows="3" placeholder="Kopierten Konfigurationstext einfügen" required></textarea></label><button class="btn">Konfiguration übernehmen</button></form><p class="small">Einmalige Übertragung aus Safari → Home-Bildschirm-App. Danach wie gewohnt anmelden.</p><p class="small">Oder manuell konfigurieren:</p><form class="stack" onsubmit="cloudConfigure(event)"><label>Project URL<input name="url" placeholder="https://projekt.supabase.co" required></label><label>Publishable / anon Key<input name="key" required placeholder="sb_publishable_… oder eyJ…"></label><button class="btn">Cloud konfigurieren</button></form>`:cloudUser?`<button class="btn secondary" onclick="cloudExportConfig()">Öffentliche Cloud-Konfiguration kopieren</button><p class="small">Konto: ${esc(cloudUser.email)} · Cloud Revision: ${cloudRevision??'unbekannt'}</p><div class="stack"><button class="btn" onclick="cloudSync()">Jetzt abgleichen</button><button class="btn secondary" onclick="cloudSync()">Jetzt synchronisieren</button>${cloudRevision===0?'<button class="btn secondary" onclick="cloudFirstUpload()">Lokale Daten erstmalig hochladen</button>':''}<button class="btn secondary" onclick="cloudLogout()">Abmelden</button></div><p class="small">Offline wird zuerst lokal gespeichert und später automatisch abgeglichen. Konflikte werden nicht still überschrieben.</p>`:`<button class="btn secondary" onclick="cloudExportConfig()">Öffentliche Cloud-Konfiguration kopieren</button><form class="stack" onsubmit="cloudLogin(event)"><label>E-Mail<input type="email" name="email" autocomplete="email" required></label><label>Passwort<input type="password" name="password" minlength="8" autocomplete="current-password" required></label><label>Aktion<select name="mode"><option value="login">Anmelden</option><option value="signup">Konto erstellen</option></select></label><button class="btn">Weiter</button></form><p class="small">Mit demselben Konto auf iPhone und Mac anmelden. Projekt-URL und öffentlicher Schlüssel werden pro Browser eingerichtet.</p>`}</section>`}
window.addEventListener('online',()=>cloudSchedule(100));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)cloudSchedule(150)});
window.addEventListener('focus',()=>cloudSchedule(150));
setInterval(()=>{if(cloudUser&&!document.hidden)cloudSchedule(0)},30000);
