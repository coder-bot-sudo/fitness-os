/* Curated training catalog; wger images fetched only with verified redistributable license. */
const catalogExtra=[["Flachbankdrücken","Brust","Langhantel"],["Enges Bankdrücken","Brust","Langhantel"],["Negativbankdrücken","Brust","Langhantel"],["Kurzhantel-Schrägbankdrücken","Brust","Kurzhantel"],["Kurzhantel-Flys","Brust","Kurzhantel"],["Kurzhantel-Pullover","Brust","Kurzhantel"],["Kabel-Flys von oben","Brust","Kabel"],["Kabel-Flys von unten","Brust","Kabel"],["Butterfly","Brust","Maschine"],["Schrägbank-Brustpresse","Brust","Maschine"],["Breite Liegestütze","Brust","Körpergewicht"],["Kreuzheben","Rücken","Langhantel"],["Pendlay Rows","Rücken","Langhantel"],["T-Bar-Rudern","Rücken","Langhantel"],["Einarmiges Kurzhantelrudern","Rücken","Kurzhantel"],["Reverse Flys","Rücken","Kurzhantel"],["Enger Latzug","Rücken","Kabel"],["Latzug mit Untergriff","Rücken","Kabel"],["Sitzendes Kabelrudern","Rücken","Kabel"],["Gerader Armzug am Kabel","Rücken","Kabel"],["Rudergerät sitzend","Rücken","Maschine"],["Assisted Pull-ups","Rücken","Maschine"],["Chin-ups","Rücken","Körpergewicht"],["Inverted Rows","Rücken","Körpergewicht"],["Arnold Press","Schultern","Kurzhantel"],["Frontheben","Schultern","Kurzhantel"],["Vorgebeugtes Seitheben","Schultern","Kurzhantel"],["Military Press","Schultern","Langhantel"],["Aufrechtes Rudern","Schultern","Langhantel"],["Seitheben am Kabel","Schultern","Kabel"],["Face Pulls am Seil","Schultern","Kabel"],["Schulterpresse Maschine","Schultern","Maschine"],["Reverse Butterfly","Schultern","Maschine"],["Frontkniebeugen","Beine","Langhantel"],["Hip Thrusts","Beine","Langhantel"],["Good Mornings","Beine","Langhantel"],["Sumo-Kreuzheben","Beine","Langhantel"],["Bulgarian Split Squats","Beine","Kurzhantel"],["Goblet Squats","Beine","Kurzhantel"],["Step-ups mit Kurzhanteln","Beine","Kurzhantel"],["Hackenschmidt-Kniebeugen","Beine","Maschine"],["Sitzender Beinbeuger","Beine","Maschine"],["Liegender Beinbeuger","Beine","Maschine"],["Adduktorenmaschine","Beine","Maschine"],["Abduktorenmaschine","Beine","Maschine"],["Wadenheben an der Maschine","Beine","Maschine"],["Kniebeugen ohne Gewicht","Beine","Körpergewicht"],["Glute Bridge","Beine","Körpergewicht"],["Ausfallschritte ohne Gewicht","Beine","Körpergewicht"],["Langhantel-Bizepscurls","Arme","Langhantel"],["SZ-Curls","Arme","Langhantel"],["French Press","Arme","Langhantel"],["Hammercurls","Arme","Kurzhantel"],["Konzentrationscurls","Arme","Kurzhantel"],["Trizeps-Kickbacks","Arme","Kurzhantel"],["Overhead-Trizepsstrecken","Arme","Kurzhantel"],["Trizepsdrücken mit Seil","Arme","Kabel"],["Überkopf-Trizeps am Kabel","Arme","Kabel"],["Kabelcurls","Arme","Kabel"],["Enge Liegestütze","Arme","Körpergewicht"],["Bank-Dips","Arme","Körpergewicht"],["Side Plank","Core","Körpergewicht"],["Hanging Leg Raises","Core","Körpergewicht"],["Russian Twists","Core","Körpergewicht"],["Mountain Climbers","Core","Körpergewicht"],["Bicycle Crunches","Core","Körpergewicht"],["Reverse Crunches","Core","Körpergewicht"],["Dead Bug","Core","Körpergewicht"],["Cable Crunches","Core","Kabel"],["Pallof Press","Core","Kabel"],["Bauchpresse Maschine","Core","Maschine"]];
for(const item of catalogExtra){if(!v3Library.some(e=>e[0].toLowerCase()===item[0].toLowerCase()))v3Library.push(item)}
const catalogAlias={"Bankdrücken":"bench press","Kniebeugen":"squat","Kreuzheben":"deadlift","Beinpresse":"leg press","Latzug":"lat pulldown","Klimmzüge":"pull up","Schulterdrücken":"shoulder press","Bizepscurls":"bicep curl","Plank":"plank","Liegestütze":"push up","Trizepsdrücken":"triceps pushdown"};
let catalogImageMap={},catalogImagesLoading=false;
function catalogAllowedLicense(lic){
 const name=String(typeof lic==='object'?(lic?.name||lic?.short_name||lic?.title||''):lic||'').toLowerCase();
 return /(?:cc[ -]?by(?:[ -]?sa)?(?:[ -]?\d)?|creative commons attribution|public domain|cc0)/i.test(name) && !/\bnc\b|noncommercial|\bnd\b|no derivatives/i.test(name);
}
function catalogTrustedUrl(value){try{const url=new URL(value,location.origin);return url.protocol==='https:'&&/(^|\.)wger\.de$/.test(url.hostname)?url.href:null}catch{return null}}
function catalogSourceName(x){return (x?.translations||[]).find(t=>t.language===2)?.name||(x?.translations||[]).find(t=>t.language===1)?.name||x?.name||''}
async function catalogLoadImages(){
 if(catalogImagesLoading||Object.keys(catalogImageMap).length)return;
 catalogImagesLoading=true;
 try{
  const response=await fetch('https://wger.de/api/v2/exerciseinfo/?limit=250',{headers:{Accept:'application/json'}});
  if(!response.ok)throw Error('Bilderquelle nicht verfügbar');
  const json=await response.json();const list=json.results||[];
  for(const ex of list){
   const base=String(catalogSourceName(ex)).toLowerCase().trim();
   if(!base)continue;
   for(const img of ex.images||[]){
    const url=catalogTrustedUrl(img.image||img.url);
    const license=img.license||img.license_name||ex.license;
    if(!url||!catalogAllowedLicense(license))continue;
    const credit=String(img.license_author||img.author||ex.license_author||'wger').slice(0,100);
    catalogImageMap[base]={url,credit,license:String(typeof license==='object'?(license.name||''):license).slice(0,60)};
    break;
   }
  }
 }catch(error){console.info('Fitness OS: exercise images unavailable, showing placeholders.')}
 finally{catalogImagesLoading=false;if(v3Catalog){const el=document.getElementById('v3-cat-results');if(el)el.innerHTML=v3CatResults()}}
}
function catalogImageFor(name){
 const search=String(catalogAlias[name]||name).toLowerCase();
 const exact=catalogImageMap[search];return exact||null;
}
function catalogCard(x){
 const image=catalogImageFor(x[0]);
 const pic=image?'<img loading="lazy" alt="Übungsbild: '+v3Clean(x[0])+'" src="'+image.url+'" onerror="this.replaceWith(document.createTextNode(\'🏋️\'))">':'<span aria-hidden="true">🏋️</span>';
 return '<button type="button" class="v3-cat-item cat-picture" onclick="v3Choose('+JSON.stringify(x[0]).replace(/"/g,'&quot;')+')"><span class="cat-thumb">'+pic+'</span><span class="cat-text"><b>'+v3Clean(x[0])+'</b><small>'+v3Clean(x[1])+' · '+v3Clean(x[2])+'</small>'+(image?'<small class="cat-credit">Bild: '+v3Clean(image.credit)+' · '+v3Clean(image.license)+'</small>':'')+'</span><span aria-hidden="true">›</span></button>'
}
v3CatResults=function(){
 const q=v3Search.toLocaleLowerCase('de').trim();
 const selected=v3List().filter(x=>(v3Muscle==='Alle'||x[1]===v3Muscle)&&(v3Equipment==='Alle'||x[2]===v3Equipment)&&(!q||[x[0],catalogAlias[x[0]]||'',x[1],x[2]].some(t=>t.toLowerCase().includes(q))));
 return selected.length?selected.map(catalogCard).join(''):'<p class="small">Keine passenden Übungen gefunden.</p>';
};
const catalogOldOpen=v3CatalogOpen;
v3CatalogOpen=function(mode,index=-1){catalogOldOpen(mode,index);catalogLoadImages()};
const catalogOldUI=v3CatalogUI;
v3CatalogUI=function(){const markup=catalogOldUI();if(!Object.keys(catalogImageMap).length)catalogLoadImages();return markup};
