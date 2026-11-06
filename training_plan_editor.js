/* Mobile-first training plan editor: one expanded exercise, accessible reordering. */
let planEditorPage=false,planEditorExpanded=null,planEditorDrag=null,planEditorSuppressClick=false;
const planEditorPreviousShow=showTraining;
const planEditorPreviousRender=render;
const planEditorOriginalChoose=v3Choose;
function planEditorOpen(){
 if(active)return;
 v3Catalog=null;planEditorPage=true;planEditorExpanded=null;v3Editing=false;route='training';render();
}
function planEditorClose(){
 planEditorPage=false;planEditorExpanded=null;v3Editing=false;v3Catalog=null;render();
}
function planEditorBack(){
 if(v3Catalog){
  if(typeof catalogCreating!=='undefined'&&catalogCreating){catalogCreateBack();return}
  if(typeof catalogSelected!=='undefined'&&catalogSelected){catalogDetailBack();return}
  v3CatalogClose();return;
 }
 planEditorClose();
}
function planEditorHeader(){
 const showing=planEditorPage&&!active;
 document.body.classList.toggle('pe-editing',showing);
 const top=document.querySelector('.top');
 if(!top)return;
 top.querySelector('#pe-back')?.remove();
 if(showing){
  const button=document.createElement('button');
  button.type='button';button.id='pe-back';button.className='pe-back';
  button.setAttribute('aria-label','Zurück');button.title='Zurück';
  button.textContent='←';button.onclick=planEditorBack;
  top.insertBefore(button,top.firstChild);
  const title=document.getElementById('title');
  if(title)title.textContent=v3Catalog?'Katalog':'Trainingsplan bearbeiten';
 }
}
render=function(){planEditorPreviousRender();planEditorHeader()};
function planEditorSetName(value){
 const t=db.templates[selectedTemplate];if(!t)return;t.name=value;persist();
}
function planEditorNumber(i,key,value){
 const ex=db.templates[selectedTemplate]?.ex?.[i];if(!ex)return;
 const num=Number(value);if(!Number.isFinite(num))return;
 ex[key]=key==='rest'?Math.max(0,Math.min(3600,Math.round(num))):Math.max(1,Math.min(20,Math.round(num)));
 persist();
 const summary=document.querySelector('[data-pe-index="'+i+'"] .pe-summary');
 if(summary)summary.textContent=planEditorSummary(ex);
}
function planEditorReps(i,value){
 const ex=db.templates[selectedTemplate]?.ex?.[i];if(!ex)return;
 ex.reps=String(value).slice(0,40);persist();
 const summary=document.querySelector('[data-pe-index="'+i+'"] .pe-summary');
 if(summary)summary.textContent=planEditorSummary(ex);
}
function planEditorToggle(i){
 if(planEditorSuppressClick)return;
 planEditorExpanded=planEditorExpanded===i?null:i;
 render();
 if(planEditorExpanded!==null)document.getElementById('pe-toggle-'+i)?.focus({preventScroll:true});
}
function planEditorMove(i,delta){
 const a=db.templates[selectedTemplate]?.ex,j=i+delta;
 if(!a||j<0||j>=a.length)return;
 [a[i],a[j]]=[a[j],a[i]];
 if(planEditorExpanded===i)planEditorExpanded=j;
 else if(planEditorExpanded===j)planEditorExpanded=i;
 persist();render();
 document.querySelector('.pe-ex[data-pe-index="'+j+'"] .pe-handle')?.focus({preventScroll:true});
}
function planEditorRemove(i){
 const a=db.templates[selectedTemplate]?.ex;if(!a)return;
 a.splice(i,1);
 if(planEditorExpanded===i)planEditorExpanded=null;
 else if(planEditorExpanded!==null&&planEditorExpanded>i)planEditorExpanded--;
 persist();render();
}
function planEditorDelete(){
 if(active)return;
 const index=selectedTemplate,plan=db.templates?.[index];
 if(!plan)return;
 const text='Trainingsplan „'+plan.name+'“ wirklich löschen?\\n\\nDer Plan und seine Übungseinstellungen werden entfernt. Bereits abgeschlossene Trainings und ihre Statistiken bleiben erhalten.';
 if(!confirm(text))return;
 db.templates.splice(index,1);
 selectedTemplate=Math.min(index,Math.max(0,db.templates.length-1));
 planEditorExpanded=null;
 planEditorPage=false;
 v3Catalog=null;
 persist();
 render();
}
function planEditorAdd(){v3CatalogOpen('add-template')}
function planEditorCreateExercise(){v3CatalogOpen('add-template');catalogCreateOpen()}
function planEditorReplace(i){v3CatalogOpen('replace-template',i)}
v3Choose=function(name){
 const mode=v3Catalog?.mode,index=v3Catalog?.index;
 planEditorOriginalChoose(name);
 if(planEditorPage&&(!active)&&(mode==='add-template'||mode==='replace-template')){
  planEditorExpanded=mode==='add-template'?db.templates[selectedTemplate].ex.length-1:index;
  render();
 }
};
function planEditorSummary(e){
 return (Number(e.sets)||3)+' Sätze · '+String(e.reps||'8–12')+' Wdh. · '+Number(e.rest??90)+' s Pause';
}
function planEditorCard(e,i,total){
 const open=planEditorExpanded===i;
 return '<section class="pe-ex'+(open?' pe-open':'')+'" data-pe-index="'+i+'">'+
 '<div class="pe-ex-head">'+
 '<button type="button" id="pe-toggle-'+i+'" class="pe-toggle" aria-expanded="'+open+'" aria-controls="pe-panel-'+i+'" onclick="planEditorToggle('+i+')">'+
 '<span class="pe-number">'+(i+1)+'</span><span class="pe-ex-title"><b>'+v3Clean(e.name)+'</b><span class="pe-summary">'+v3Clean(planEditorSummary(e))+'</span></span>'+
 '<span class="pe-chevron" aria-hidden="true">'+(open?'⌃':'⌄')+'</span></button>'+
 '<button type="button" class="pe-handle" aria-label="'+v3Clean(e.name)+': Reihenfolge ändern" title="Lange drücken und ziehen; Pfeiltasten zum Sortieren" aria-describedby="pe-drag-help" onpointerdown="planEditorDragStart(event,'+i+')" onpointermove="planEditorDragMove(event)" onpointerup="planEditorDragEnd(event)" onpointercancel="planEditorDragCancel()" onkeydown="planEditorHandleKey(event,'+i+')">⠿</button>'+
 '</div>'+
 '<div class="pe-panel" id="pe-panel-'+i+'" role="region" aria-label="'+v3Clean(e.name)+' Einstellungen" '+(open?'':'hidden')+'>'+
 '<div class="pe-fields"><label>Sätze<input aria-label="Sätze '+(i+1)+'" type="number" min="1" max="20" value="'+Number(e.sets||3)+'" onchange="planEditorNumber('+i+',\'sets\',this.value)"></label>'+
 '<label>Wiederholungen<input aria-label="Wiederholungen '+(i+1)+'" type="text" maxlength="40" value="'+v3Clean(e.reps||'').replace(/"/g,'&quot;')+'" onchange="planEditorReps('+i+',this.value)" placeholder="z. B. 8–12"></label>'+
 '<label>Pause (Sek.)<input aria-label="Pausenzeit '+(i+1)+'" type="number" min="0" max="3600" value="'+Number(e.rest??90)+'" onchange="planEditorNumber('+i+',\'rest\',this.value)"></label></div>'+
 '<div class="pe-actions"><button type="button" class="btn secondary" onclick="planEditorReplace('+i+')">Übung tauschen</button><button type="button" class="btn danger" onclick="planEditorRemove('+i+')">Entfernen</button></div>'+
 '<details class="pe-access-menu"><summary>Weitere Aktionen · Reihenfolge</summary><div class="pe-reorder-actions"><button type="button" class="btn secondary" '+(i===0?'disabled':'')+' onclick="planEditorMove('+i+',-1)">Nach oben verschieben</button><button type="button" class="btn secondary" '+(i===total-1?'disabled':'')+' onclick="planEditorMove('+i+',1)">Nach unten verschieben</button></div></details>'+
 '</div></section>';
}
function planEditorPageHtml(){
 const t=db.templates[selectedTemplate];if(!t)return '<section class="card">Kein Plan ausgewählt.</section>';
 const list=t.ex.length?t.ex.map((e,i)=>planEditorCard(e,i,t.ex.length)).join(''):'<div class="card pe-empty"><h3>Dein Plan ist noch leer</h3><p>Füge deine erste Übung hinzu oder erstelle eine eigene.</p></div>';
 return '<section class="pe-page"><div class="pe-intro"><h2>Dein Trainingsplan</h2><p class="small">Änderungen werden automatisch gespeichert.</p></div>'+
 '<section class="card pe-details"><label>Trainingsname<input aria-label="Trainingsname" maxlength="80" value="'+v3Clean(t.name).replace(/"/g,'&quot;')+'" oninput="planEditorSetName(this.value)" placeholder="z. B. Oberkörper A"></label><div class="small">'+t.ex.length+' Übungen in deinem Plan</div></section>'+
 '<div class="pe-section"><h3>Übungen</h3><span class="small">'+t.ex.length+' insgesamt</span></div>'+
 '<p id="pe-drag-help" class="pe-help small">Zum Bearbeiten antippen. Für die Reihenfolge den Griff rechts gedrückt halten und ziehen.</p>'+
 '<div class="pe-list" id="pe-list">'+list+'</div>'+
 '<div class="pe-add-actions"><button class="btn pe-add" onclick="planEditorAdd()">＋ Übung hinzufügen</button></div>'+
 '<section class="pe-danger-zone"><button type="button" class="pe-delete-plan" onclick="planEditorDelete()">Trainingsplan löschen</button></section>'+
 '<footer class="pe-footer"><button type="button" class="btn pe-finish" onclick="planEditorClose()">Fertig</button></footer></section>';
}
function planEditorHandleKey(event,i){
 if(event.key==='ArrowUp'||event.key==='ArrowDown'){
  event.preventDefault();planEditorMove(i,event.key==='ArrowUp'?-1:1);
 }
}
function planEditorDragStart(event,i){
 if(event.button!==0||planEditorDrag)return;
 const handle=event.currentTarget,row=handle.closest('.pe-ex');
 if(!row)return;
 const drag={pointerId:event.pointerId,handle,row,index:i,startingX:event.clientX,startingY:event.clientY,centers:[...document.querySelectorAll('#pe-list>.pe-ex')].map(e=>{const r=e.getBoundingClientRect();return r.top+r.height/2}),ready:false,cancelled:false};
 planEditorDrag=drag;
 handle.setPointerCapture?.(event.pointerId);
 drag.timer=setTimeout(()=>{
  if(planEditorDrag!==drag||drag.cancelled)return;
  drag.ready=true;row.classList.add('pe-dragging');
  handle.setAttribute('aria-grabbed','true');
  if(navigator.vibrate)navigator.vibrate(20);
 },320);
}
function planEditorDragMove(event){
 const drag=planEditorDrag;if(!drag||event.pointerId!==drag.pointerId)return;
 const dx=event.clientX-drag.startingX,dy=event.clientY-drag.startingY;
 if(!drag.ready){
  if(Math.hypot(dx,dy)>12){drag.cancelled=true;clearTimeout(drag.timer)}
  return;
 }
 event.preventDefault();
 const list=document.getElementById('pe-list');
 const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('.pe-ex');
 list.querySelectorAll('.pe-drop-before,.pe-drop-after').forEach(node=>node.classList.remove('pe-drop-before','pe-drop-after'));
 if(target&&target!==drag.row&&target.parentElement===list){
  const center=target.getBoundingClientRect().top+target.getBoundingClientRect().height/2;
  target.classList.add(event.clientY<center?'pe-drop-before':'pe-drop-after');
 }
 const edge=48,scroll=event.clientY;
 if(scroll<edge)window.scrollBy(0,-12);
 else if(scroll>window.innerHeight-edge)window.scrollBy(0,12);
}
function planEditorDragEnd(event){
 const drag=planEditorDrag;if(!drag||event.pointerId!==drag.pointerId)return;
 clearTimeout(drag.timer);
 drag.row.classList.remove('pe-dragging');
 document.querySelectorAll('.pe-drop-before,.pe-drop-after').forEach(node=>node.classList.remove('pe-drop-before','pe-drop-after'));
 drag.handle.removeAttribute('aria-grabbed');
 planEditorDrag=null;
 if(!drag.ready)return;
 planEditorSuppressClick=true;setTimeout(()=>{planEditorSuppressClick=false},120);
 const arr=db.templates[selectedTemplate]?.ex;
 if(!arr||drag.centers.length!==arr.length)return;
 const original=drag.index;
 const passed=drag.centers.filter(y=>event.clientY>y).length;
 const destination=Math.max(0,Math.min(arr.length-1,passed-(passed>original?1:0)));
 const selected=planEditorExpanded===null?null:arr[planEditorExpanded];
 if(original!==destination){
  const moved=arr.splice(original,1)[0];
  arr.splice(destination,0,moved);
 }
 planEditorExpanded=selected?arr.indexOf(selected):null;
 persist();render();
}
function planEditorDragCancel(){
 if(!planEditorDrag)return;
 clearTimeout(planEditorDrag.timer);
 planEditorDrag.row.classList.remove('pe-dragging');
 document.querySelectorAll('.pe-drop-before,.pe-drop-after').forEach(node=>node.classList.remove('pe-drop-before','pe-drop-after'));
 planEditorDrag.handle.removeAttribute('aria-grabbed');
 planEditorDrag=null;render();
}
const planEditorOldCreate=createTemplate;
createTemplate=function(){if(active)return;db.templates.push({id:uid(),name:'Neuer Trainingsplan',ex:[]});selectedTemplate=db.templates.length-1;persist();planEditorOpen()};
const planEditorOldEditor=v3Editor;
v3Editor=function(value){if(value)planEditorOpen();else planEditorClose()};
showTraining=function(){
 if(!active&&v3Catalog)return v3CatalogUI();
 if(!active&&planEditorPage)return planEditorPageHtml();
 if(!active&&!db.templates?.length&&analyticsMode==='training'){
  return '<section class="card pe-no-plans"><h2>Keine Trainingspläne vorhanden</h2><p class="small">Erstelle einen neuen Trainingsplan, um dein nächstes Training zu beginnen.</p><button type="button" class="btn" onclick="createTemplate()">＋ Trainingsplan erstellen</button></section>';
 }
 return planEditorPreviousShow();
};
