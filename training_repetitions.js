/* Per-repetition log: old completed sets remain unchanged and readable. */
function repCurrentRow(){const ex=v3Focus(),i=v3Current();return i<0?null:ex.rows[i]}
function repLog(){
 const r=repCurrentRow();if(!r)return;
 const weight=Number(r.kg);
 if(!Number.isFinite(weight)||weight<0){alert('Bitte gültiges Gewicht eingeben.');return}
 if(!Array.isArray(r.repetitionLog))r.repetitionLog=[];
 r.repetitionLog.push({weightKg:weight});
 v3Save();render();
}
function repUndo(){const r=repCurrentRow();if(!r?.repetitionLog?.length)return;r.repetitionLog.pop();v3Save();render()}
function repEdit(index){
 const r=repCurrentRow();if(!r?.repetitionLog?.[index])return;
 const next=prompt('Gewicht für Wiederholung '+(index+1)+' (kg)',String(r.repetitionLog[index].weightKg));
 if(next===null)return;
 const weight=Number(String(next).replace(',','.'));
 if(!Number.isFinite(weight)||weight<0){alert('Ungültiges Gewicht');return}
 r.repetitionLog[index].weightKg=weight;v3Save();render();
}
function repSummary(row){
 if(!Array.isArray(row.repetitionLog)||!row.repetitionLog.length)return v3Clean(row.kg)+' kg × '+v3Clean(row.reps);
 const groups=[];
 for(const x of row.repetitionLog){const w=Number(x.weightKg);if(groups.length&&groups.at(-1).kg===w)groups.at(-1).count++;else groups.push({kg:w,count:1})}
 return groups.map(x=>v3Clean(x.kg)+' kg × '+x.count).join(' → ');
}
const repLegacySetDone=v3SetDone;
v3SetDone=function(){
 const r=repCurrentRow();
 if(!r)return;
 if(!Array.isArray(r.repetitionLog)||!r.repetitionLog.length){
  alert('Bitte zuerst mindestens eine Wiederholung bestätigen.');
  return;
 }
 r.reps=r.repetitionLog.length;
 r.kg=Math.max(...r.repetitionLog.map(x=>Number(x.weightKg)));
 repLegacySetDone();
};
const repBaseShowTraining=showTraining;
showTraining=function(){
 let markup=repBaseShowTraining();
 if(!active||v3Catalog||v4OverviewOpen||liveMenuOpen)return markup;
 const r=repCurrentRow();
 if(!r)return markup;
 const count=r.repetitionLog?.length||0;
 const log=(r.repetitionLog||[]).map((v,i)=>'<button type="button" class="rep-chip" onclick="repEdit('+i+')" aria-label="Wiederholung '+(i+1)+' korrigieren">'+(i+1)+': '+v3Clean(v.weightKg)+' kg</button>').join('');
 const controls='<div class="rep-panel"><div class="rep-head"><b>'+count+' Wiederholungen bestätigt</b><span class="small">Tippen zum Korrigieren</span></div><div class="rep-history">'+(log||'<span class="small">Noch keine Wiederholung bestätigt.</span>')+'</div><button type="button" class="btn rep-confirm" onclick="repLog()">✓ Wiederholung bestätigen</button><button type="button" class="btn secondary rep-undo" onclick="repUndo()" '+(!count?'disabled':'')+'>↶ Letzte Wiederholung zurücknehmen</button></div>';
 return markup.replace('<button class="btn v3-done" onclick="v3SetDone()">✓ Satz abschließen</button>',controls+'<button class="btn v3-done" onclick="v3SetDone()" '+(!count?'disabled':'')+'>✓ Satz abschließen ('+count+' Wdh.)</button>');
};
