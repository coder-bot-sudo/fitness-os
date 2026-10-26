/* Fitness OS v4 — complete live workout overview (Hevy/Strong-inspired, mobile-first). */
let v4OverviewOpen=false;
const v4OriginalTraining=showTraining;
const v4Esc=value=>esc(value);
function v4Totals(){
  if(!active)return {total:0,done:0,skipped:0,complete:0,exerciseTotal:0,early:0};
  const exercises=active.ex||[];
  const flat=exercises.flatMap(e=>e.rows||[]);
  return {
    total:flat.length,
    done:flat.filter(r=>r.done).length,
    skipped:flat.filter(r=>r.skipped&&!r.done).length,
    complete:exercises.filter(e=>e.rows?.length&&e.rows.every(r=>r.done)).length,
    exerciseTotal:exercises.length,
    early:exercises.filter(e=>e.rows?.some(r=>r.skipped&&!r.done)).length
  };
}
function v4ExerciseStatus(e,index){
  const r=e.rows||[],done=r.filter(x=>x.done).length, skipped=r.filter(x=>x.skipped&&!x.done).length;
  if(r.length&&done===r.length)return {label:'Abgeschlossen',css:'complete',symbol:'✓'};
  if(skipped&&skipped===r.length)return {label:'Übersprungen',css:'skipped',symbol:'↷'};
  if(skipped)return {label:'Vorzeitig beendet',css:'early',symbol:'!'};
  if(index===active.focus)return {label:'Aktuell',css:'current',symbol:'●'};
  if(done)return {label:'Teilweise erledigt',css:'partial',symbol:'◐'};
  return {label:'Offen',css:'pending',symbol:String(index+1)};
}
function v4Strip(e,interactive=false,index=-1){
  const rows=e.rows||[];
  return '<div class="v4-set-strip" role="group" aria-label="Satzfortschritt">'+rows.map((r,j)=>{
    const state=r.done?'done':r.skipped?'skipped':'pending',label='Satz '+(j+1)+': '+(r.done?'erledigt':r.skipped?'übersprungen':'offen');
    const text=r.done?'✓':r.skipped?'↶':String(j+1);
    return interactive&&r.skipped&&!r.done
      ?'<button type="button" class="v4-segment '+state+'" title="Satz '+(j+1)+' reaktivieren" aria-label="'+label+' – reaktivieren" onclick="v4RestoreSet('+index+','+j+')">'+text+'</button>'
      :'<span class="v4-segment '+state+'" title="'+label+'" aria-label="'+label+'">'+text+'</span>';
  }).join('')+'</div>';
}
function v4OpenOverview(){if(!active)return;v4OverviewOpen=true;render();window.scrollTo({top:0,behavior:'instant'})}
function v4CloseOverview(){v4OverviewOpen=false;render();window.scrollTo({top:0,behavior:'instant'})}
function v4JumpTo(index){v4OverviewOpen=false;v3Select(index);window.scrollTo({top:0,behavior:'instant'})}
function v4RestoreExercise(index){
  const e=active?.ex?.[index];if(!e)return;
  e.rows.forEach(r=>{if(r.skipped&&!r.done)delete r.skipped});
  if(active.v4LastSkipped===index)delete active.v4LastSkipped;
  active.focus=index;v4OverviewOpen=false;stopRest();v3Save();render();window.scrollTo({top:0,behavior:'instant'});
}
function v4RestoreSet(index,setIndex){
  const r=active?.ex?.[index]?.rows?.[setIndex];
  if(!r||r.done||!r.skipped)return;
  delete r.skipped;
  if(active.v4LastSkipped===index&&!active.ex[index].rows.some(x=>x.skipped))delete active.v4LastSkipped;
  active.focus=index;v4OverviewOpen=false;stopRest();v3Save();render();window.scrollTo({top:0,behavior:'instant'});
}
function v4EndFromOverview(){
  if(!confirm('Training wirklich beenden und speichern?'))return;
  v4OverviewOpen=false;
  endWorkout();
}
const v4OriginalSkip=v3SkipExercise;
v3SkipExercise=function(){
  if(!active)return;
  const index=active.focus, before=active.ex[index].rows.map(r=>!!r.skipped);
  v4OriginalSkip();
  if(active&&active.ex[index]?.rows.some((r,i)=>r.skipped&&!before[i])){
    active.v4LastSkipped=index;
    v3Save();
    render();
  }
};
function v4UndoBanner(){
  const i=active?.v4LastSkipped;
  if(!Number.isInteger(i)||!active.ex[i]?.rows.some(r=>r.skipped&&!r.done))return '';
  return '<div class="v4-undo" role="status"><span><b>'+v4Esc(active.ex[i].name)+'</b> vorzeitig beendet</span><button type="button" onclick="v4RestoreExercise('+i+')">Rückgängig</button></div>';
}
function v4OverviewCard(e,i){
  const s=v4ExerciseStatus(e,i),done=e.rows.filter(r=>r.done).length,skipped=e.rows.filter(r=>r.skipped&&!r.done).length;
  return '<article class="v4-ex-card v4-'+s.css+(active.focus===i?' v4-focused':'')+'"><div class="v4-ex-head"><div class="v4-ex-index">'+s.symbol+'</div><div class="v4-ex-text"><h3>'+v4Esc(e.name)+'</h3><div class="v4-ex-meta">'+done+' / '+e.rows.length+' Sätze erledigt'+(skipped?' · '+skipped+' übersprungen':'')+'</div></div><span class="v4-status '+s.css+'">'+s.label+'</span></div>'
    +v4Strip(e,true,i)
    +'<div class="v4-card-actions"><button type="button" class="btn secondary" onclick="v4JumpTo('+i+')">'+(active.focus===i?'Zum aktuellen Satz':'Übung öffnen')+'</button>'
    +(skipped?'<button type="button" class="btn v4-restore" onclick="v4RestoreExercise('+i+')">↶ Übung fortsetzen</button>':'')
    +'</div></article>';
}
function v4OverviewScreen(){
  const t=v4Totals(),percent=t.total?Math.round(t.done*100/t.total):0,skippedPercent=t.total?Math.round(t.skipped*100/t.total):0;
  return '<div class="v4-overview"><div class="v4-sticky"><div class="v4-overview-top"><button type="button" class="v4-back" onclick="v4CloseOverview()" aria-label="Zurück zum aktuellen Satz">← <span>Zum Satz</span></button><span class="v4-overview-clock">◷ <span id="v3-duration">'+v3Duration()+'</span></span></div><div class="v4-heading"><div class="v4-eyebrow">TRAININGSÜBERSICHT</div><h2>'+v4Esc(active.name)+'</h2></div></div>'
    +v4UndoBanner()
    +'<section class="v4-summary" aria-label="Gesamtfortschritt"><div class="v4-stats"><div><strong>'+t.complete+'<small> / '+t.exerciseTotal+'</small></strong><span>Übungen fertig</span></div><div><strong>'+t.done+'<small> / '+t.total+'</small></strong><span>Sätze erledigt</span></div><div><strong>'+t.skipped+'</strong><span>Sätze übersprungen</span></div></div>'
    +'<div class="v4-bar-label"><span>Satzfortschritt</span><b>'+percent+' % erledigt</b></div><div class="v4-overall-bar" role="img" aria-label="'+t.done+' von '+t.total+' Sätzen erledigt, '+t.skipped+' übersprungen"><span class="v4-bar-done" style="width:'+percent+'%"></span><span class="v4-bar-skipped" style="width:'+skippedPercent+'%"></span></div><div class="v4-legend"><span><i class="v4-dot done"></i> Erledigt</span><span><i class="v4-dot skipped"></i> Übersprungen</span><span><i class="v4-dot pending"></i> Offen</span></div></section>'
    +'<div class="v4-list-head"><h3>Alle Übungen</h3><span>'+t.exerciseTotal+' Übungen</span></div>'
    +'<div class="v4-ex-list">'+active.ex.map(v4OverviewCard).join('')+'</div>'
    +'<div class="v4-footer"><button type="button" class="btn v4-add" onclick="v3CatalogOpen(\'add-live\')">+ Übung hinzufügen</button><button type="button" class="btn secondary" onclick="v4CloseOverview()">Zurück zum Training</button><button type="button" class="v4-end" onclick="v4EndFromOverview()">Training beenden</button></div></div>';
}
showTraining=function(){
  if(!active){v4OverviewOpen=false;return v4OriginalTraining()}
  if(v3Catalog)return v4OriginalTraining();
  if(v4OverviewOpen)return v4OverviewScreen();
  let html=v4OriginalTraining();
  // The small session timer stays visible, but ending is a deliberate action from the overview.
  html=html.replace('<button class="btn secondary" onclick="endWorkout()">Beenden</button>','<button type="button" class="btn v4-overview-entry" onclick="v4OpenOverview()">☷ Übersicht</button>');
  html=html.replace('<div class="v3-progress">',v4UndoBanner()+'<div class="v3-progress">');
  const e=active.ex[active.focus];
  if(e){
    const heading='<h2>'+v4Esc(e.name)+'</h2>';
    const complete=e.rows.filter(r=>r.done).length;
    const activeSet=e.rows.findIndex(r=>!r.done&&!r.skipped);
    const pills='<div class="v4-live-progress"><span>'+complete+' von '+e.rows.length+' Sätzen erledigt'+(activeSet>=0?' · Satz '+(activeSet+1)+' aktiv':'')+'</span>'+v4Strip(e)+'</div>';
    html=html.replace(heading,heading+pills);
    if(e.rows.some(r=>r.skipped&&!r.done)){
      const message='<div class="v4-inline-reopen"><span>Diese Übung wurde vorzeitig beendet.</span><button type="button" class="btn secondary" onclick="v4RestoreExercise('+active.focus+')">↶ Übersprungene Sätze reaktivieren</button></div>';
      html=html.replace('<label class="v3-note">',message+'<label class="v3-note">');
    }
  }
  return html;
};
