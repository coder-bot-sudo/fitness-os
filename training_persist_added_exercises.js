/* Keep exercises added during a live session in the originating training template. */
const persistentExerciseNewSession=newSession;
newSession=function(){
 const template=db.templates[selectedTemplate];
 persistentExerciseNewSession();
 if(active&&template){
  active.templateId=template.id;
  v3Save();
 }
};
function persistentExerciseTemplate(){
 if(!active)return null;
 if(active.templateId!=null)return db.templates.find(t=>String(t.id)===String(active.templateId))||null;
 // For sessions started before this change, only migrate when name uniquely matches.
 const matches=db.templates.filter(t=>t.name===active.name);
 if(matches.length===1){active.templateId=matches[0].id;v3Save();return matches[0]}
 return null;
}
const persistentExerciseOldChoose=v3Choose;
v3Choose=function(name){
 const addToLive=!!active&&v3Catalog?.mode==='add-live';
 const target=addToLive?persistentExerciseTemplate():null;
 const before=active?.ex?.length||0;
 persistentExerciseOldChoose(name);
 if(!addToLive||!target||!active||active.ex.length<=before)return;
 const exercise=active.ex[active.ex.length-1];
 if(!target.ex.some(e=>e.name.trim().toLocaleLowerCase('de')===name.trim().toLocaleLowerCase('de'))){
  target.ex.push({name:exercise.name,sets:exercise.sets||exercise.rows?.length||3,reps:exercise.reps||'8–12',rest:exercise.rest??120});
  persist();
 }
};
