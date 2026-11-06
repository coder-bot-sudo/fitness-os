/* Dedicated training template editor */
let planEditorPage=false;
const planEditorPreviousShow=showTraining;
function planEditorOpen(){if(active)return;v3Catalog=null;planEditorPage=true;v3Editing=false;route='training';render()}
function planEditorClose(){planEditorPage=false;v3Editing=false;v3Catalog=null;render()}
function planEditorSetName(value){const t=db.templates[selectedTemplate];if(!t)return;t.name=value;persist()}
function planEditorNumber(i,key,value){
 const ex=db.templates[selectedTemplate]?.ex?.[i];if(!ex)return;
 const num=Number(value);if(!Number.isFinite(num))return;
 ex[key]=key==='rest'?Math.max(0,Math.min(3600,Math.round(num))):Math.max(1,Math.min(20,Math.round(num)));
 persist();
}
function planEditorReps(i,value){const ex=db.templates[selectedTemplate]?.ex?.[i];if(!ex)return;ex.reps=String(value).slice(0,40);persist()}
function planEditorMove(i,delta){const a=db.templates[selectedTemplate]?.ex;if(!a||i+delta<0||i+delta>=a.length)return;[a[i],a[i+delta]]=[a[i+delta],a[i]];persist();render()}
function planEditorRemove(i){const a=db.templates[selectedTemplate]?.ex;if(!a)return;a.splice(i,1);persist();render()}
function planEditorAdd(){v3CatalogOpen('add-template')}
function planEditorCreateExercise(){v3CatalogOpen('add-template');catalogCreateOpen()}
function planEditorReplace(i){v3CatalogOpen('replace-template',i)}
function planEditorPageHtml(){
 const t=db.templates[selectedTemplate];if(!t)return '<section class="card">Kein Plan ausgewählt.</section>';
 return '<section class="pe-page"><header class="pe-header"><button class="btn secondary" onclick="planEditorClose()">← Zurück</button><div><h2>Trainingsplan bearbeiten</h2><p class="small">Änderungen werden automatisch gespeichert.</p></div><button class="btn" onclick="planEditorClose()">Fertig ✓</button></header>'+
 '<section class="card pe-details"><label>Trainingsname<input aria-label="Trainingsname" maxlength="80" value="'+v3Clean(t.name).replace(/"/g,'&quot;')+'" oninput="planEditorSetName(this.value)" placeholder="z. B. Oberkörper A"></label><div class="small">'+t.ex.length+' Übungen in deinem Plan</div></section>'+
 '<div class="pe-section"><h3>Übungen</h3><span class="small">Reihenfolge und Einstellungen</span></div>'+
 (t.ex.length?t.ex.map((e,i)=>'<section class="card pe-ex"><div class="pe-ex-head"><div class="pe-number">'+(i+1)+'</div><div class="pe-ex-title"><b>'+v3Clean(e.name)+'</b><span class="small">Übung '+(i+1)+'</span></div><button class="btn secondary" onclick="planEditorReplace('+i+')">Tauschen</button></div>'+
 '<div class="pe-fields"><label>Sätze<input aria-label="Sätze '+(i+1)+'" type="number" min="1" max="20" value="'+Number(e.sets||3)+'" onchange="planEditorNumber('+i+',\'sets\',this.value)"></label>'+
 '<label>Wiederholungen<input aria-label="Wiederholungen '+(i+1)+'" type="text" value="'+v3Clean(e.reps||'').replace(/"/g,'&quot;')+'" onchange="planEditorReps('+i+',this.value)" placeholder="z. B. 8–12"></label>'+
 '<label>Pause (Sek.)<input aria-label="Pausenzeit '+(i+1)+'" type="number" min="0" max="3600" value="'+Number(e.rest??90)+'" onchange="planEditorNumber('+i+',\'rest\',this.value)"></label></div>'+
 '<div class="pe-actions"><button class="btn secondary" '+(i===0?'disabled':'')+' onclick="planEditorMove('+i+',-1)">↑ Hoch</button><button class="btn secondary" '+(i===t.ex.length-1?'disabled':'')+' onclick="planEditorMove('+i+',1)">↓ Runter</button><button class="btn danger" onclick="planEditorRemove('+i+')">Entfernen</button></div></section>').join(''):'<div class="card pe-empty"><h3>Dein Plan ist noch leer</h3><p>Füge die erste Übung aus dem Katalog hinzu.</p></div>')+
 '<button class="btn pe-add" onclick="planEditorAdd()">＋ Übung aus Katalog hinzufügen</button><button class="btn secondary pe-add" onclick="planEditorCreateExercise()">＋ Eigene Übung erstellen</button></section>';
}
const planEditorOldCreate=createTemplate;
createTemplate=function(){if(active)return;db.templates.push({id:uid(),name:'Neuer Trainingsplan',ex:[]});selectedTemplate=db.templates.length-1;persist();planEditorOpen()};
const planEditorOldEditor=v3Editor;
v3Editor=function(value){if(value)planEditorOpen();else planEditorClose()};
showTraining=function(){
 if(!active&&v3Catalog)return v3CatalogUI();
 if(!active&&planEditorPage)return planEditorPageHtml();
 return planEditorPreviousShow();
};
