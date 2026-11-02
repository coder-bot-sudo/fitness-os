/* Fitness OS training analytics MVP — actual completed historical sets only. */
let analyticsMode='training',analyticsRange='90',analyticsExercise='',analyticsMetric='weight',analyticsSearch='';
const analyticsOriginalShowTraining=showTraining;
function analyticsAllSets(){
 const result=[];
 for(const session of db.sessions||[]){
  const date=String(session.date||'').slice(0,10);
  const dateMs=Date.parse(date);
  if(!Number.isFinite(dateMs))continue;
  for(const exercise of session.ex||[]){
   for(const [index,row] of (exercise.rows||[]).entries()){
    if(!row.done||row.skipped)continue;
    const kg=Number(row.kg),reps=Number(row.reps);
    if(!Number.isFinite(kg)||kg<0||!Number.isFinite(reps)||reps<1)continue;
    result.push({name:String(exercise.name||'').trim(),date,at:dateMs,index,kg,reps,
      volume:kg*reps,e1rm:reps<=10&&kg>0?kg*(1+reps/30):null});
   }
  }
 }
 return result.sort((a,b)=>a.at-b.at||a.index-b.index);
}
function analyticsPeriod(rows){
 if(analyticsRange==='all')return rows;
 const days=Number(analyticsRange),cut=Date.now()-days*86400000;
 return rows.filter(row=>row.at>=cut);
}
function analyticsFormat(v,digits=1){return Number(v).toLocaleString('de-DE',{maximumFractionDigits:digits})}
function analyticsMetricValue(row){
 if(analyticsMetric==='weight')return row.kg;
 if(analyticsMetric==='reps')return row.reps;
 if(analyticsMetric==='e1rm')return row.e1rm;
 return row.volume;
}
function analyticsSeries(name){
 const byDate=new Map();
 for(const row of analyticsPeriod(analyticsAllSets()).filter(r=>r.name===name)){
  const list=byDate.get(row.date)||[];list.push(row);byDate.set(row.date,list);
 }
 return [...byDate].map(([date,rows])=>{
  const values=rows.map(analyticsMetricValue).filter(Number.isFinite);
  return {date,rows,value:values.length?(analyticsMetric==='volume'?values.reduce((a,b)=>a+b,0):Math.max(...values)):null};
 }).filter(x=>x.value!==null);
}
function analyticsSpark(series,large=false){
 if(!series.length)return '<div class="an-empty-chart">Noch keine Daten für den gewählten Zeitraum.</div>';
 const w=large?600:130,h=large?190:36,p=large?24:3,values=series.map(x=>x.value),
 min=Math.min(...values),max=Math.max(...values),spread=Math.max(1,max-min);
 const points=values.map((v,i)=>[(p+(w-2*p)*(values.length===1?.5:i/(values.length-1))),h-p-((v-min)/spread)*(h-2*p)]);
 const poly=points.map(p=>p.map(x=>x.toFixed(1)).join(',')).join(' ');
 const labels=large?'<text x="'+p+'" y="'+(h-3)+'" fill="#a2b5ce" font-size="11">'+series[0].date+'</text><text x="'+(w-p)+'" y="'+(h-3)+'" text-anchor="end" fill="#a2b5ce" font-size="11">'+series.at(-1).date+'</text>':'';
 return '<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Leistungsverlauf, '+series.length+' Trainingstage" class="an-chart"><polyline fill="none" stroke="#208cfc" stroke-width="'+(large?3:2)+'" stroke-linecap="round" stroke-linejoin="round" points="'+poly+'"/>'+points.map(([x,y])=>'<circle cx="'+x+'" cy="'+y+'" r="'+(large?3:1.8)+'" fill="#45a5ff"/>').join('')+labels+'</svg>';
}
function analyticsChoose(name){analyticsExercise=name;analyticsMode='detail';analyticsMetric='weight';render()}
function analyticsSetRange(value){analyticsRange=value;render()}
function analyticsSetMetric(value){analyticsMetric=value;render()}
function analyticsTab(value){analyticsMode=value;render()}
function analyticsSearchChange(value){analyticsSearch=value;const el=document.getElementById('analytics-exercises');if(el)el.innerHTML=analyticsExerciseList()}
function analyticsPeriodTabs(){return '<div class="an-tabs">'+[['28','4 Wochen'],['90','3 Monate'],['365','12 Monate'],['all','Gesamt']].map(([id,title])=>'<button type="button" class="'+(analyticsRange===id?'active':'')+'" onclick="analyticsSetRange(\''+id+'\')">'+title+'</button>').join('')+'</div>'}
function analyticsExerciseList(){
 const rows=analyticsPeriod(analyticsAllSets()),names=[...new Set(rows.map(r=>r.name))].filter(Boolean).filter(x=>x.toLowerCase().includes(analyticsSearch.toLowerCase()));
 return names.length?names.map(name=>{
 const set=rows.filter(r=>r.name===name),dates=new Set(set.map(x=>x.date)).size,top=Math.max(...set.map(x=>x.kg));
 const series=[...new Map(set.map(x=>[x.date,x])).values()].map(x=>({date:x.date,value:x.kg}));
 return '<button type="button" class="an-ex-item" onclick="analyticsChoose('+JSON.stringify(name).replace(/"/g,'&quot;')+')"><span class="an-ex-name"><b>'+esc(name)+'</b><small>'+dates+' Trainingstage · Top '+analyticsFormat(top)+' kg</small></span>'+analyticsSpark(series)+'<span>›</span></button>'
 }).join(''):'<p class="an-empty">Noch keine abgeschlossenen Übungen für diesen Zeitraum.</p>'
}
function analyticsOverview(){
 const sets=analyticsPeriod(analyticsAllSets()),dates=new Set(sets.map(r=>r.date)),count=sets.length;
 const exercises=new Set(sets.map(r=>r.name)).size;
 return '<section class="an-dashboard"><div class="an-header"><h2>Dein Fortschritt</h2><p>Entwicklung aus deinen abgeschlossenen Sätzen</p></div>'+analyticsPeriodTabs()+
 '<div class="an-stats"><div><strong>'+dates.size+'</strong><span>Trainingstage</span></div><div><strong>'+count+'</strong><span>Abgeschlossene Sätze</span></div><div><strong>'+exercises+'</strong><span>Übungen erfasst</span></div></div>'+
 '<div class="an-section-title"><h3>Meine Übungen</h3><span>Verlauf ansehen ›</span></div><input aria-label="Übung suchen" placeholder="Übung suchen …" value="'+esc(analyticsSearch)+'" oninput="analyticsSearchChange(this.value)"><div id="analytics-exercises">'+analyticsExerciseList()+'</div></section>';
}
function analyticsDetails(){
 const name=analyticsExercise,all=analyticsAllSets().filter(x=>x.name===name);
 const series=analyticsSeries(name),first=series[0],last=series.at(-1),delta=first&&last?last.value-first.value:null;
 const unit=analyticsMetric==='reps'?'Wdh.':'kg';
 const metricName={weight:'Höchstes Gewicht',e1rm:'Geschätztes 1RM',volume:'Trainingsvolumen',reps:'Max. Wiederholungen'}[analyticsMetric];
 const records=all.length?'<div class="an-records"><h3>Persönliche Bestwerte</h3><div>Höchstes Gewicht <b>'+analyticsFormat(Math.max(...all.map(r=>r.kg)))+' kg</b></div><div>Meiste Wiederholungen <b>'+Math.max(...all.map(r=>r.reps))+' Wdh.</b></div></div>':'';
 const dates=[...new Set(analyticsPeriod(all).map(x=>x.date))].reverse();
 return '<section class="an-dashboard"><button class="an-back" onclick="analyticsTab(\'progress\')">← Zur Übersicht</button><h2>'+esc(name)+'</h2><p class="an-muted">Leistungsverlauf und Trainingshistorie</p>'+analyticsPeriodTabs()+
 '<div class="an-metrics">'+[['weight','Top-Gewicht'],['e1rm','1RM (geschätzt)'],['volume','Volumen'],['reps','Wiederholungen']].map(([m,label])=>'<button class="'+(analyticsMetric===m?'active':'')+'" onclick="analyticsSetMetric(\''+m+'\')">'+label+'</button>').join('')+'</div>'+
 '<div class="an-panel"><h3>'+metricName+'</h3>'+analyticsSpark(series,true)+(last?'<div class="an-value">Aktuell: <b>'+analyticsFormat(last.value)+' '+unit+'</b> <span class="'+(delta>0?'positive':'')+'">'+(delta>0?'+':'')+analyticsFormat(delta)+' '+unit+' seit erstem Punkt im Zeitraum</span></div>':'')+'</div>'+
 (analyticsMetric==='e1rm'?'<p class="an-note">Schätzung nach Epley, nur Sätze mit 1–10 Wiederholungen. Kein gemessener Maximalwert.</p>':'')+
 records+'<h3>Trainingshistorie</h3>'+(dates.length?dates.map(date=>'<div class="an-history"><b>'+date+'</b>'+all.filter(x=>x.date===date).map(row=>'<div><span>Satz '+(row.index+1)+'</span><strong>'+analyticsFormat(row.kg)+' kg × '+row.reps+'</strong></div>').join('')+'</div>').join(''):'<p class="an-empty">Keine Sätze in diesem Zeitraum.</p>')+'</section>';
}
showTraining=function(){
 if(active||v3Catalog)return analyticsOriginalShowTraining();
 const tabs='<div class="an-mode"><button class="'+(analyticsMode==='training'?'active':'')+'" onclick="analyticsTab(\'training\')">Training</button><button class="'+(analyticsMode!=='training'?'active':'')+'" onclick="analyticsTab(\'progress\')">Fortschritt</button></div>';
 return tabs+(analyticsMode==='training'?analyticsOriginalShowTraining():analyticsMode==='detail'?analyticsDetails():analyticsOverview());
};
