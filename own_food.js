/* Fitness OS: own foods when Open Food Facts has no usable record. */
(function(){
const previousFood=showFood;
showFood=function(){
  return previousFood()+`<section class="card stack" style="margin-top:16px"><h2>Eigenes Lebensmittel anlegen</h2>
  <p class="small">Nährwerte pro 100 g von der Verpackung übernehmen. Eigene Lebensmittel stehen danach in der Produktliste, Rezeptplanung und auf beiden synchronisierten Geräten zur Verfügung.</p>
  <form class="stack" onsubmit="createOwnFood(event)">
    <label>Name<input required maxlength="120" name="name" placeholder="z. B. Haferflocken meiner Marke"></label>
    <div class="formrow">
      <label>Protein (g)<input required type="number" step="0.1" min="0" max="100" name="p"></label>
      <label>KH (g)<input required type="number" step="0.1" min="0" max="100" name="c"></label>
      <label>Fett (g)<input required type="number" step="0.1" min="0" max="100" name="f"></label>
    </div>
    <label>Kalorien (kcal je 100 g)<input required type="number" step="0.1" min="0" max="950" name="kcal"></label>
    <button class="btn">Lebensmittel speichern und auswählen</button>
  </form></section>`;
};
window.createOwnFood=function(e){
 e.preventDefault();
 const f=new FormData(e.target);
 const name=String(f.get('name')||'').trim();
 const nutrition=Object.fromEntries(['p','c','f','kcal'].map(k=>[k,Number(f.get(k))]));
 if(!name||Object.values(nutrition).some(x=>!Number.isFinite(x)||x<0)||['p','c','f'].some(k=>nutrition[k]>100)||nutrition.kcal>950){alert('Bitte gültige Werte je 100 g eintragen.');return;}
 if(nutrition.p+nutrition.c+nutrition.f>105){alert('Die Makronährstoffe ergeben zusammen mehr als 100 g. Bitte Angaben prüfen.');return;}
 const estimate=nutrition.p*4+nutrition.c*4+nutrition.f*9;
 if(Math.abs(estimate-nutrition.kcal)>Math.max(80,nutrition.kcal*0.4)&&!confirm('Die Kalorien weichen deutlich von den Makroangaben ab. Trotzdem speichern?'))return;
 const p={id:'own-'+String(uid()),name,brand:'Eigenes Lebensmittel',nutrition,source:'Eigene Eingabe',unit:'g'};
 saveProduct(p);
 selectedFood=p;
 render();
 const target=document.getElementById('offSelected');
 if(target){target.innerHTML=selectedEditor();target.scrollIntoView({behavior:'smooth',block:'center'});}
};
})();