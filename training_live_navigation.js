/* Fitness OS live session navigation and safe discard */
let liveMenuOpen=false;
const liveBaseRender=render;
const liveBaseNavigate=navigate;
function liveDiscard(){
 if(!active)return;
 if(!confirm('Training wirklich verwerfen?\n\nAlle Einträge dieser laufenden Einheit werden gelöscht. Frühere Trainings und Trainingspläne bleiben erhalten.'))return;
 stopRest();
 active=null;
 v4OverviewOpen=false;
 v3Catalog=null;
 liveMenuOpen=false;
 localStorage.removeItem('fitness_os_active_v3');
 document.title='Fitness OS · MVP';
 route='training';
 render();
}
function liveGo(view){
 if(!active)return;
 liveMenuOpen=false;
 if(view==='set'){v3Catalog=null;v4OverviewOpen=false}
 else if(view==='overview'){v3Catalog=null;v4OverviewOpen=true}
 else if(view==='exercises'){v4OverviewOpen=false;v3Catalog={mode:'add-live',index:-1};v3Search='';v3Muscle='Alle';v3Equipment='Alle'}
 else if(view==='more'){v3Catalog=null;v4OverviewOpen=false;liveMenuOpen=true}
 route='training';render();
}
function liveMenu(){
 return '<div class="live-actions card"><h2>Training verwalten</h2><p class="small">Deine laufende Einheit bleibt erhalten, bis du sie speicherst oder bewusst verwirfst.</p><button class="btn" onclick="endWorkout()">Training speichern & beenden</button><button class="btn danger" onclick="liveDiscard()">Training verwerfen</button><button class="btn secondary" onclick="liveGo(\'set\')">Zurück zum Satz</button></div>';
}
function liveBar(){
 const tab=liveMenuOpen?'more':v3Catalog?'exercises':v4OverviewOpen?'overview':'set';
 return [['set','✓','Satz'],['overview','☷','Übersicht'],['exercises','＋','Übungen'],['more','•••','Mehr']].map(([k,i,label])=>'<button type="button" class="'+(tab===k?'active':'')+'" onclick="liveGo(\''+k+'\')"><span>'+i+'</span>'+label+'</button>').join('');
}
render=function(){
 if(active)route='training';
 liveBaseRender();
 if(active){
  const nav=document.getElementById('bottomNav');
  if(nav){nav.innerHTML=liveBar();nav.setAttribute('aria-label','Trainingsnavigation');nav.classList.add('live-bottom')}
  const side=document.getElementById('sideNav');
  if(side){side.innerHTML='<button class="active" onclick="liveGo(\'set\')">◉ Aktueller Satz</button><button onclick="liveGo(\'overview\')">☷ Trainingsübersicht</button><button onclick="liveGo(\'exercises\')">＋ Übungen</button><button onclick="liveGo(\'more\')">••• Mehr</button>'}
  const view=document.getElementById('view');
  if(liveMenuOpen&&view)view.innerHTML=liveMenu();
 }else{
  liveMenuOpen=false;
  const nav=document.getElementById('bottomNav');
  if(nav){nav.classList.remove('live-bottom');nav.setAttribute('aria-label','App-Navigation')}
 }
};
navigate=function(x){if(active&&x!=='training'){route='training';render();return}liveBaseNavigate(x)};
const liveOldEnd=endWorkout;
endWorkout=function(){liveOldEnd();if(!active){liveMenuOpen=false;v4OverviewOpen=false;v3Catalog=null;render()}};
