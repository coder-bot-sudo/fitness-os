/* One timestamp-based elapsed workout clock across all active workout surfaces. */
function sessionElapsedSeconds(){
 return active&&Number.isFinite(Number(active.started))?
  Math.max(0,Math.floor((Date.now()-Number(active.started))/1000)):0;
}
function sessionElapsedFormat(seconds=sessionElapsedSeconds()){
 const h=Math.floor(seconds/3600),m=Math.floor((seconds%3600)/60),s=seconds%60;
 return h?String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'):
 String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}
function sessionDurationAttach(){
 if(!active)return;
 const header=document.querySelector('.lean-live .lean-header');
 if(header&&!header.querySelector('#session-elapsed')){
  const label=document.createElement('span');
  label.id='session-elapsed';
  label.className='session-elapsed';
  label.setAttribute('aria-label','Trainingsdauer');
  label.title='Trainingsdauer';
  const more=header.querySelector('.lean-more');
  header.insertBefore(label,more);
 }else if(!header&&!document.getElementById('v3-duration')&&!document.getElementById('session-elapsed')){
  const main=document.getElementById('view');
  if(main){
   const label=document.createElement('span');
   label.id='session-elapsed';
   label.className='session-elapsed session-elapsed-aux';
   label.setAttribute('aria-label','Trainingsdauer');
   label.title='Trainingsdauer';
   main.insertBefore(label,main.firstChild);
  }
 }
 sessionDurationUpdate();
}
function sessionDurationUpdate(){
 if(!active)return;
 const current=sessionElapsedFormat();
 const elapsed=document.getElementById('session-elapsed');
 if(elapsed)elapsed.textContent='◷ '+current;
 const overview=document.getElementById('v3-duration');
 if(overview)overview.textContent=current;
}
const sessionDurationPreviousRender=render;
render=function(){
 sessionDurationPreviousRender();
 sessionDurationAttach();
};
setInterval(()=>{if(active)sessionDurationUpdate()},1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)sessionDurationUpdate()});
window.addEventListener('pageshow',sessionDurationUpdate);
