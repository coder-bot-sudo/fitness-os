/* Resume a saved workout without duplicating or destroying its history record. */
function resumeFinishedWorkout(index){
 if(active||!Number.isInteger(index)||index<0)return;
 const saved=db.sessions?.[index];
 if(!saved||!Array.isArray(saved.ex)||!saved.ex.length)return;
 const restored=structuredClone(saved);
 // Preserve original in history until the resumed workout is explicitly saved.
 restored.resumedFromHistory=true;
 delete restored.ended;
 delete restored.leanRestUntil;
 delete restored.leanRestDuration;
 let focus=restored.ex.findIndex(e=>Array.isArray(e.rows)&&e.rows.some(r=>!r.done&&!r.skipped));
 if(focus<0){
  // Every existing set was finished/skipped. Offer one more set instead of
  // sending the user straight back to a completion screen.
  focus=restored.ex.findLastIndex(e=>e.rows?.some(r=>r.done));
  if(focus<0)focus=restored.ex.findIndex(e=>Array.isArray(e.rows));
  if(focus<0)return;
  const exercise=restored.ex[focus];
  const previous=[...exercise.rows].reverse().find(r=>r.done);
  exercise.rows.push({
   kg:previous?.kg??0,
   reps:previous?.reps??(parseInt(exercise.reps,10)||8),
   done:false
  });
 }
 restored.focus=focus;
 stopRest();
 active=restored;
 v4OverviewOpen=false;
 liveMenuOpen=false;
 v3Catalog=null;
 analyticsMode='training';
 route='training';
 v3Save();
 render();
}
