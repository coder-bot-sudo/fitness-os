/* Fitness OS - faster nutrition logging. Uses existing food catalog and cloud persistence. */
(function(){
  if(!Array.isArray(db.favoriteFoodIds)) db.favoriteFoodIds=[];
  const originalFood=showFood;
  const originalLog=logSelected;
  function foodIndex(id){return db.foodCatalog.findIndex(x=>x.id===id)}
  function summary(p){return Math.round(p.nutrition.kcal)+" kcal · P "+p.nutrition.p+" / KH "+p.nutrition.c+" / F "+p.nutrition.f+" je 100 g"}
  function oneProduct(p){
    const i=foodIndex(p.id), fav=db.favoriteFoodIds.includes(p.id);
    return '<div class="item row" style="align-items:center;gap:8px"><div style="flex:1;min-width:0"><b>'+esc(p.name)+'</b><div class="small">'+esc(summary(p))+'</div></div>'+
      '<button type="button" class="btn secondary" title="Favorit ändern" onclick="toggleFoodFavorite('+JSON.stringify(p.id).replace(/"/g,'&quot;')+')">'+(fav?'★':'☆')+'</button>'+
      '<button type="button" class="btn" onclick="chooseStoredFood('+i+')">Erfassen</button></div>';
  }
  function extraFood(){
    if(!Array.isArray(db.favoriteFoodIds))db.favoriteFoodIds=[];
    const favs=db.favoriteFoodIds.map(id=>db.foodCatalog.find(x=>x.id===id)).filter(Boolean);
    const recentIds=[...db.food].reverse().filter(x=>x.productCode).map(x=>x.productCode);
    const unique=[...new Set(recentIds)].slice(0,8);
    const recent=unique.map(id=>db.foodCatalog.find(x=>x.id===id)).filter(Boolean);
    return '<section class="card stack" style="margin-top:14px"><h2>⚡ Schneller erfassen</h2>'+
      '<h3>★ Favoriten</h3>'+(favs.length?favs.map(oneProduct).join(''):'<p class="small">Noch keine Favoriten. Suche ein Lebensmittel und markiere es mit ☆.</p>')+
      '<h3>Zuletzt gegessen</h3>'+(recent.length?recent.map(oneProduct).join(''):'<p class="small">Deine zuletzt erfassten Open-Food-Facts-Produkte erscheinen hier.</p>')+
      '<p class="small">Favoriten und Verlauf werden mit deinem Fitness-OS-Datenbestand synchronisiert.</p></section>';
  }
  window.toggleFoodFavorite=function(id){
    if(!Array.isArray(db.favoriteFoodIds))db.favoriteFoodIds=[];
    const ids=db.favoriteFoodIds;
    db.favoriteFoodIds=ids.includes(id)?ids.filter(x=>x!==id):[...ids,id];
    persist();render();
  };
  showFood=function(){
    let original=originalFood();
    return original+extraFood();
  };
  logSelected=function(e){
    const p=selectedFood;
    originalLog(e);
    if(p&&db.foodCatalog.some(x=>x.id===p.id)){
      // Existing food log already persisted; showFood will pick it up on the next render.
    }
  };
  // Existing product selection already saves into the shared catalog.
})();