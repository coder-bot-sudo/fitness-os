/* Lean live workout: per-set recording and timestamp-based rest flow. */
const leanPreviousShowTraining=showTraining;
const leanPreviousRender=render;
const leanPreviousSelect=v3Select;
const leanInputNumber=value=>Number(String(value).replace(',','.'));
const leanFormatNumber=value=>Number(value).toLocaleString('de-DE',{maximumFractionDigits:2});
function leanIsResting(){return Boolean(active?.leanRestUntil&&active.leanRestUntil>Date.now())}
function leanRestRemaining(){return Math.max(0,Math.ceil(((active?.leanRestUntil||0)-Date.now())/1000))}
function leanTime(seconds){return String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0')}
function leanVisible(){return !!(active&&!v3Catalog&&!v4OverviewOpen&&!liveMenuOpen)}
function leanSetValue(key,value){
 const e=v3Focus(),index=v3Current();
 if(index<0||!e)return;
 // Keep the raw typed number until Save; don't disrupt keyboard entry.
 e.rows[index][key]=value;
 v3Save();
}
function leanStep(key,delta){
 const e=v3Focus(),index=v3Current();if(index<0||!e)return;
 const step=key==='kg'?2.5:1;
 const input=document.getElementById('lean-'+key);
 const parsed=leanInputNumber(input?.value??e.rows[index][key]);
 const current=Number.isFinite(parsed)?parsed:0;
 const next=Math.max(0,Math.round((current+step*delta)*100)/100);
 e.rows[index][key]=next;
 if(input)input.value=String(next);
 v3Save();
}
function leanClearRest(){
 if(!active)return;
 active.leanRestUntil=null;
 active.leanRestDuration=null;
 stopRest();
 v3Save();
 render();
}
function leanSaveSet(){
 if(!active||leanIsResting())return;
 const ex=v3Focus(),i=v3Current();if(!ex||i<0)return;
 const row=ex.rows[i],reps=leanInputNumber(row.reps),kg=leanInputNumber(row.kg);
 if(!Number.isInteger(reps)||reps<1||reps>1000||!Number.isFinite(kg)||kg<0||kg>10000){
  const invalid=(!Number.isInteger(reps)||reps<1||reps>1000)?document.getElementById('lean-reps'):document.getElementById('lean-kg');
  invalid?.focus();invalid?.setAttribute('aria-invalid','true');
  return;
 }
 row.kg=kg;row.reps=reps;row.done=true;
 // The new default logs one value per set; old session logs stay untouched.
 delete row.repetitionLog;
 const restSeconds=Math.max(0,Math.min(3600,Math.round(Number(ex.rest)||0)));
 const nextInExercise=v3Current();
 if(nextInExercise<0){
  const next=active.ex.findIndex((exercise,index)=>index>active.focus&&exercise.rows.some(r=>!r.done&&!r.skipped));
  if(next>=0)active.focus=next;
 }
 const nextExercise=v3Focus(),nextIndex=v3Current();
 const hasNext=nextExercise&&nextIndex>=0;
 stopRest();
 active.leanRestDuration=hasNext?restSeconds:null;
 active.leanRestUntil=hasNext&&restSeconds>0?Date.now()+restSeconds*1000:null;
 v3Save();render();
}
function leanResume(){
 if(!active)return;
 leanClearRest();
}
function leanOpenOverview(){if(!active)return;leanClearRestOnlyForNavigation();v4OpenOverview()}
function leanClearRestOnlyForNavigation(){/* Rest time persists while viewing the overview. */}
function leanOpenMore(){if(!active)return;liveGo('more')}
v3Select=function(i){
 if(active){active.leanRestUntil=null;active.leanRestDuration=null}
 leanPreviousSelect(i);
};
function leanScreen(){
 const ex=v3Focus(),current=v3Current();
 if(!ex)return '<section class="lean-live lean-complete"><h2>Keine Übungen</h2><button class="lean-primary" onclick="leanOpenMore()">Training verwalten</button></section>';
 const done=active.ex.reduce((count,e)=>count+e.rows.filter(r=>r.done).length,0);
 const total=active.ex.reduce((count,e)=>count+e.rows.length,0);
 const percent=Math.round(done/Math.max(1,total)*100);
 const progress='<div class="lean-progress" role="progressbar" aria-label="Trainingsfortschritt" aria-valuenow="'+done+'" aria-valuemin="0" aria-valuemax="'+total+'"><span style="width:'+percent+'%"></span></div>';
 const head='<header class="lean-header"><button type="button" class="lean-icon" aria-label="Trainingsübersicht" onclick="leanOpenOverview()">‹</button><strong class="lean-plan-name">'+esc(active.name)+'</strong><span class="lean-count">'+(active.focus+1)+'/'+active.ex.length+'</span><button type="button" class="lean-icon lean-more" aria-label="Training verwalten" onclick="leanOpenMore()">⋯</button></header>';
 const frame='<div class="lean-live">'+head+progress;
 if(current<0){
  return frame+'<main class="lean-main lean-completed"><div><h1>Training abgeschlossen</h1></div><div class="lean-fixed"><button type="button" class="lean-primary" onclick="endWorkout()">Training beenden</button></div></main></div>';
 }
 const nextLabel='<h2 class="lean-ex-title">'+esc(ex.name)+'</h2><p class="lean-set-label">Satz '+(current+1)+' von '+ex.rows.length+'</p>';
 if(leanIsResting()){
  const remaining=leanRestRemaining(),duration=Math.max(1,active.leanRestDuration||remaining);
  const fraction=100*(remaining/duration);
  return frame+'<main class="lean-main lean-rest"><h1>Pause</h1><div class="lean-ring" id="lean-ring" style="--rest-progress:'+fraction+'%"><span id="lean-countdown" role="timer" aria-label="Verbleibende Pause">'+leanTime(remaining)+'</span></div><div class="lean-next">'+nextLabel+'</div><div class="lean-fixed"><button type="button" class="lean-primary" onclick="leanResume()">Weiter</button><button type="button" class="lean-text-action" onclick="leanResume()">Pause überspringen</button></div></main></div>';
 }
 const row=ex.rows[current];
 // Imported partial per-repetition sessions are editable as full sets.
 const reps=Number.isFinite(leanInputNumber(row.reps))?row.reps:parseInt(ex.reps,10)||8;
 const kg=Number.isFinite(leanInputNumber(row.kg))?row.kg:0;
 const field=(key,label,value,step)=>{
  const decimal=key==='kg';
  return '<div class="lean-field"><label for="lean-'+key+'">'+label+'</label><div class="lean-stepper"><button type="button" onclick="leanStep(\''+key+'\',-1)" aria-label="'+label+' verringern">−</button><input type="number" id="lean-'+key+'" name="'+key+'" aria-label="'+label+'" inputmode="'+(decimal?'decimal':'numeric')+'" step="'+step+'" min="'+(decimal?0:1)+'" value="'+esc(value)+'" oninput="leanSetValue(\''+key+'\',this.value)" onkeydown="if(event.key===\'Enter\'){event.preventDefault();this.blur();}" /><span class="lean-unit">'+(decimal?'kg':'')+'</span><button type="button" onclick="leanStep(\''+key+'\',1)" aria-label="'+label+' erhöhen">+</button></div></div>';
 };
 return frame+'<main class="lean-main lean-set"><div class="lean-current">'+nextLabel+'</div><div class="lean-fields">'+field('reps','Wdh.',reps,1)+field('kg','Gewicht',kg,.5)+'</div><div class="lean-fixed"><button type="button" class="lean-primary" onclick="leanSaveSet()">Satz speichern</button></div></main></div>';
}
showTraining=function(){
 if(leanVisible())return leanScreen();
 return leanPreviousShowTraining();
};
render=function(){
 leanPreviousRender();
 const lean=Boolean(active);
 document.body.classList.toggle('lean-session',lean);
 // The content, not the full app nav, is the live session entry point.
};
function leanTick(){
 if(!active||!leanVisible())return;
 if(active.leanRestUntil){
  const seconds=leanRestRemaining();
  if(seconds<=0){
   active.leanRestUntil=null;
   active.leanRestDuration=null;
   v3Save();
   render();
   return;
  }
  const countdown=document.getElementById('lean-countdown');
  if(countdown)countdown.textContent=leanTime(seconds);
  const ring=document.getElementById('lean-ring');
  if(ring)ring.style.setProperty('--rest-progress',100*seconds/Math.max(1,active.leanRestDuration||seconds)+'%');
 }
}
setInterval(leanTick,500);
window.addEventListener('pageshow',leanTick);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)leanTick()});
