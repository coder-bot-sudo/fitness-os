const { test, expect } = require('@playwright/test');

const completed = {
  id: 'qa-completed', date: new Date().toLocaleDateString('sv-SE'), name: 'Historisches Training',
  started: Date.now() - 7200000, ended: Date.now() - 3600000,
  ex: [{name:'Bankdrücken', sets:1, reps:'8', rest:90, rows:[{kg:60,reps:8,done:true}]}]
};
const running = {
  id: 'qa-running', date: new Date().toLocaleDateString('sv-SE'), name:'QA Einheit',
  started: Date.now() - 60000, focus:0,
  ex:[{name:'Bankdrücken',sets:1,reps:'8',rest:90,rows:[{kg:65,reps:8,done:false}]}]
};
test.beforeEach(async ({page}) => {
  // Deterministic offline state; no production credentials or Supabase writes.
  await page.route('https://cdn.jsdelivr.net/**', route => route.abort());
  await page.addInitScript(({completed}) => {
    if (sessionStorage.getItem('qa-base-seeded')) return;
    localStorage.clear();
    sessionStorage.setItem('qa-base-seeded','1');
    localStorage.setItem('fitness_os_v1', JSON.stringify({
      goals:{mode:'recomp',kcal:2400,p:170,c:250,f:80}, weight:[],food:[],
      exercises:['Bankdrücken'], templates:[{id:1,name:'QA Plan',ex:[{name:'Bankdrücken',sets:1,reps:'8',rest:90}]}],
      sessions:[completed],plan:{},shopping:[],activity:[],savedMeals:[]
    }));
  }, {completed});
});

test('global navigation remains available without active workout', async ({page}) => {
  await page.goto('/');
  await expect(page.locator('#bottomNav')).not.toHaveClass(/live-bottom/);
  await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first().click();
  await expect(page.getByRole('heading',{name:'Training starten'})).toBeVisible();
});

test('live navigation, discard cancellation and confirmed discard preserve history', async ({page}) => {
  await page.addInitScript(({running}) => localStorage.setItem('fitness_os_active_v3',JSON.stringify(running)), {running});
  await page.goto('/');
  test.skip(!(await page.evaluate(() => typeof liveDiscard === 'function')), 'Live navigation is not yet merged into main');
  await expect(page.locator('#bottomNav')).toBeHidden();
  await page.getByRole('button',{name:'Trainingsübersicht'}).click();
  await expect(page.locator('#view')).toContainText('Training');
  await page.evaluate(()=>liveGo('more'));
  await expect(page.getByRole('button',{name:'Training verwerfen'})).toBeVisible();
  page.once('dialog',d=>d.dismiss());
  await page.getByRole('button',{name:'Training verwerfen'}).click();
  expect(await page.evaluate(()=>Boolean(active))).toBe(true);
  page.once('dialog',d=>d.accept());
  await page.getByRole('button',{name:'Training verwerfen'}).click();
  await expect(page.locator('#bottomNav')).not.toHaveClass(/live-bottom/);
  const data=await page.evaluate(()=>({
    sessionCount: JSON.parse(localStorage.getItem('fitness_os_v1')).sessions.length,
    running:localStorage.getItem('fitness_os_active_v3')
  }));
  expect(data).toEqual({sessionCount:1,running:null});
});

test('active workout survives reload and can be resumed',async ({page})=>{
  await page.addInitScript(({running}) => {if(!sessionStorage.getItem('qa-seeded')) {localStorage.setItem('fitness_os_active_v3',JSON.stringify(running));sessionStorage.setItem('qa-seeded','1');}}, {running});
  await page.goto('/');
  await expect.poll(()=>page.evaluate(()=>Boolean(typeof active !== 'undefined' && active && active.id==='qa-running'))).toBe(true);
  await page.reload();
  await expect.poll(()=>page.evaluate(()=>Boolean(typeof active !== 'undefined' && active && active.id==='qa-running'))).toBe(true);
});

test('progress dashboard can show completed training',async ({page})=>{
  await page.goto('/');
  test.skip(!(await page.evaluate(() => typeof analyticsOverview === 'function')), 'Analytics feature is not yet merged into main');
  await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first().click();
  await page.locator('.an-mode').getByRole('button',{name:'Fortschritt'}).click();
  await expect(page.getByText('Dein Fortschritt')).toBeVisible();
  await expect(page.locator('#analytics-exercises')).toContainText('Bankdrücken');
  await page.locator('#analytics-exercises').getByRole('button').first().click();
  await expect(page.locator('.an-history')).toContainText('60 kg');
});

test('no horizontal page overflow in default views',async ({page})=>{
  await page.goto('/');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
});

test('visual QA: desktop and mobile screenshots, tap target and overflow audit', async ({page},testInfo)=>{
  await page.goto('/');
  const visibleNav=page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first();
  await page.screenshot({path:testInfo.outputPath('home.png'),fullPage:true});
  await visibleNav.click();
  await page.screenshot({path:testInfo.outputPath('training.png'),fullPage:true});
  const audit=await page.evaluate(()=>{
    const viewport=document.documentElement.clientWidth;
    const overflow=document.documentElement.scrollWidth-viewport;
    const controls=[...document.querySelectorAll('#bottomNav button')].filter(e=>getComputedStyle(e).display!=='none' && e.getBoundingClientRect().width>0).map(e=>({label:e.textContent.trim(),width:Math.round(e.getBoundingClientRect().width),height:Math.round(e.getBoundingClientRect().height)}));
    return {viewport,overflow,controls,heading:document.querySelector('h1')?.textContent};
  });
  await testInfo.attach('ux-audit.json',{body:JSON.stringify(audit,null,2),contentType:'application/json'});
  expect(audit.overflow).toBeLessThanOrEqual(2);
  if(testInfo.project.name==='iphone-13')expect(audit.controls.every(x=>x.width>=40 && x.height>=40)).toBe(true);
});

test('plan editor saves details and order across reload',async ({page})=>{
 await page.goto('/');
 await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first().click();
 await page.getByRole('button',{name:/Plan bearbeiten/}).click();
 await expect(page.getByRole('heading',{name:'Trainingsplan bearbeiten'})).toBeVisible();
 await expect(page.locator('#pe-plan-name')).toHaveText('QA Plan');
 await expect(page.locator('.pe-details')).toHaveCount(0);
 await page.getByRole('button',{name:'Trainingsname bearbeiten'}).click();
 await page.getByRole('textbox',{name:'Trainingsname'}).fill('QA Oberkörper');
 await page.getByRole('textbox',{name:'Trainingsname'}).press('Enter');
 await page.locator('.pe-toggle').first().click();
 await page.getByRole('spinbutton',{name:'Sätze 1'}).fill('4');
 await page.getByRole('spinbutton',{name:'Sätze 1'}).blur();
 await page.getByRole('button',{name:/Fertig/}).click();
 await page.reload();
 await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first().click();
 await page.getByRole('button',{name:/Plan bearbeiten/}).click();
 await expect(page.locator('#pe-plan-name')).toHaveText('QA Oberkörper');
 await page.locator('.pe-toggle').first().click();
 await expect(page.getByRole('spinbutton',{name:'Sätze 1'})).toHaveValue('4');
});
test('new plan uses full-page editor and adds exercise from catalog',async ({page})=>{
 await page.goto('/');
 await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first().click();
 await page.getByRole('button',{name:/Vorlage|Plan erstellen|Neuer Plan/}).first().click();
 await expect(page.getByRole('heading',{name:'Trainingsplan bearbeiten'})).toBeVisible();
 await page.getByRole('button',{name:/Übung hinzufügen/}).click();
 await expect(page.getByRole('heading',{name:'Übung auswählen'})).toBeVisible();
});

test('extended catalog has 96 image-free exercises and is usable in plan editor', async ({page})=>{
 await page.goto('/');
 const count=await page.evaluate(()=>v3Library.length);
 expect(count).toBe(96);
 await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first().click();
 await page.getByRole('button',{name:/Plan bearbeiten/}).click();
 await page.getByRole('button',{name:/Übung hinzufügen/}).click();
 await expect(page.getByRole('heading',{name:'Übung auswählen'})).toBeVisible();
 const input=page.getByRole('textbox',{name:'Übung suchen'});
 await input.fill('Arnold Press');
 await expect(page.getByRole('button',{name:/Arnold Press/})).toBeVisible();
 await page.getByRole('button',{name:/Arnold Press/}).click();
 await expect(page.getByRole('heading',{name:'Arnold Press'})).toBeVisible();
 await expect(page.locator('.cat-detail img')).toHaveCount(0);
 await page.getByRole('button',{name:'Übung hinzufügen'}).click();
 await expect(page.getByText('Arnold Press')).toBeVisible();
 expect(await page.evaluate(()=>performance.getEntriesByType('resource').some(x=>x.name.includes('wger.de')))).toBe(false);
});

test('custom exercise is created in plan editor and survives reload with category', async ({page}) => {
 await page.goto('/');
 await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first().click();
 await page.getByRole('button',{name:/Plan bearbeiten/}).click();
 await page.getByRole('button',{name:/Übung hinzufügen/}).click();
 await page.getByRole('button',{name:/Eigene Übung erstellen/}).click();
 await page.getByRole('textbox',{name:'Name der eigenen Übung'}).fill('Mein Kabelzug');
 await page.getByRole('combobox',{name:'Muskelgruppe der eigenen Übung'}).selectOption('Rücken');
 await page.getByRole('combobox',{name:'Equipment der eigenen Übung'}).selectOption('Kabel');
 await page.getByRole('button',{name:'Übung speichern und auswählen'}).click();
 await expect(page.locator('.pe-ex-title').filter({hasText:'Mein Kabelzug'})).toHaveCount(1);
 expect(await page.evaluate(()=>db.exercises.find(e=>e.name==='Mein Kabelzug'))).toMatchObject({muscle:'Rücken',equipment:'Kabel',custom:true});
 await page.reload();
 await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first().click();
 await page.getByRole('button',{name:/Plan bearbeiten/}).click();
 await expect(page.locator('.pe-ex-title').filter({hasText:'Mein Kabelzug'})).toHaveCount(1);
 await page.getByRole('button',{name:/Übung hinzufügen/}).click();
 await page.getByRole('textbox',{name:'Übung suchen'}).fill('Mein Kabelzug');
 await expect(page.getByRole('button',{name:/Mein Kabelzug/})).toContainText('Rücken · Kabel');
});

test('duplicate custom exercise cannot be saved', async ({page}) => {
 await page.goto('/');
 await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first().click();
 await page.getByRole('button',{name:/Plan bearbeiten/}).click();
 await page.getByRole('button',{name:/Übung hinzufügen/}).click();
 await page.getByRole('button',{name:/Eigene Übung erstellen/}).click();
 await page.getByRole('textbox',{name:'Name der eigenen Übung'}).fill('  bankdrücken  ');
 await page.getByRole('button',{name:'Übung speichern und auswählen'}).click();
 await expect(page.getByRole('alert')).toContainText('bereits');
 await expect(page.getByRole('heading',{name:'Eigene Übung erstellen'})).toBeVisible();
});

test('custom exercise can be added during an active workout', async ({page}) => {
 await page.addInitScript(({running})=>{
   localStorage.setItem('fitness_os_active_v3',JSON.stringify(running));
 },{running});
 await page.goto('/');
 await page.getByRole('button',{name:'Trainingsübersicht'}).click();
 await page.getByRole('button',{name:/Übung hinzufügen/}).click();
 await page.getByRole('button',{name:/Eigene Übung erstellen/}).click();
 await page.getByRole('textbox',{name:'Name der eigenen Übung'}).fill('Mein Zug im Training');
 await page.getByRole('button',{name:'Übung speichern und auswählen'}).click();
 expect(await page.evaluate(()=>active.ex.some(e=>e.name==='Mein Zug im Training'))).toBe(true);
 expect(await page.evaluate(()=>db.exercises.some(e=>e.name==='Mein Zug im Training'))).toBe(true);
});

test('custom exercise creation is available only in plan editor catalog',async ({page})=>{
 await page.goto('/');
 await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first().click();
 await page.getByRole('button',{name:/Plan bearbeiten/}).click();
 await expect(page.getByRole('button',{name:/Eigene Übung erstellen/})).toHaveCount(0);
 await page.getByRole('button',{name:/Übung hinzufügen/}).click();
 await expect(page.getByRole('button',{name:/Eigene Übung erstellen/})).toBeVisible();
 await page.getByRole('button',{name:/Eigene Übung erstellen/}).click();
 await expect(page.getByRole('heading',{name:'Eigene Übung erstellen'})).toBeVisible();
 await page.getByRole('textbox',{name:'Name der eigenen Übung'}).fill('Seltene Spezialübung');
 await page.getByRole('button',{name:'Übung speichern und auswählen'}).click();
 await expect(page.locator('.pe-ex-title').filter({hasText:'Seltene Spezialübung'})).toHaveCount(1);
});
test('catalog shows custom exercise option before search and filters',async ({page})=>{
 await page.goto('/');
 await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first().click();
 await page.getByRole('button',{name:/Plan bearbeiten/}).click();
 await page.getByRole('button',{name:/Übung hinzufügen/}).click();
 const cta=page.locator('.cat-new-hint');
 await expect(cta).toContainText('Übung nicht gefunden?');
 await expect(cta.getByRole('button',{name:/Eigene Übung erstellen/})).toBeVisible();
 await cta.getByRole('button',{name:/Eigene Übung erstellen/}).click();
 await expect(page.getByRole('heading',{name:'Eigene Übung erstellen'})).toBeVisible();
});

test('release marker and versioned assets appear on iPhone',async ({page})=>{
 await page.goto('/');
 await expect(page.getByText('Fitness OS · v2026.11.07.2')).toBeVisible();
 expect(await page.evaluate(()=>Array.from(document.scripts).some(s=>s.src.includes('training_plan_editor.js?v=2026.11.07.2')))).toBe(true);
 await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first().click();
 await page.getByRole('button',{name:/Plan bearbeiten/}).click();
 await expect(page.getByRole('button',{name:/Eigene Übung erstellen/})).toHaveCount(0);
 await page.getByRole('button',{name:/Übung hinzufügen/}).click();
 await expect(page.getByRole('button',{name:/Eigene Übung erstellen/})).toBeVisible();
});

test('new live training stores reps and weight per set while retaining historical sets',async ({page})=>{
 await page.addInitScript(({running})=>{if(sessionStorage.getItem('qa-running-set'))return;sessionStorage.setItem('qa-running-set','1');localStorage.setItem('fitness_os_active_v3',JSON.stringify(running))},{running});
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'Bankdrücken'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Wiederholung bestätigen'})).toHaveCount(0);
 await page.getByRole('spinbutton',{name:'Wdh.'}).fill('7');
 await page.getByRole('spinbutton',{name:'Gewicht'}).fill('52.5');
 await page.getByRole('button',{name:'Satz speichern'}).click();
 expect(await page.evaluate(()=>active.ex[0].rows[0])).toMatchObject({done:true,reps:7,kg:52.5});
 await expect(page.getByRole('heading',{name:'Training abgeschlossen'})).toBeVisible();
 await page.getByRole('button',{name:'Training beenden'}).click();
 const sets=await page.evaluate(()=>analyticsAllSets().filter(r=>r.name==='Bankdrücken'));
 expect(sets.some(r=>r.reps===7&&r.volume===367.5&&r.kg===52.5)).toBe(true);
 expect(sets.some(r=>r.reps===8&&r.volume===480&&r.kg===60)).toBe(true);
});
test('offline changes persist and safe cloud merge combines independent completed workouts',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const one={id:'local-1',date:'2026-11-06',name:'iPhone',ex:[]};
  const two={id:'remote-1',date:'2026-11-06',name:'Mac',ex:[]};
  const base=structuredClone(defaults);
  db=structuredClone(base);db.sessions.push(one);persist();
  const remote=structuredClone(base);remote.sessions.push(two);
  localStorage.setItem(cloudBaseKey('qa-user'),JSON.stringify(base));
  cloudUser={id:'qa-user',email:'qa@example.invalid'};
  let saved=null;cloud={
    from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{payload:remote,revision:4},error:null})})})}),
    rpc:async(_,args)=>{saved=args.new_payload;return {data:5,error:null}}
  };
  await cloudSync();
  return {sessions:db.sessions.map(x=>x.id),pushed:saved?.sessions.map(x=>x.id),pending:localStorage.getItem(cloudPendingKey),revision:cloudRevision};
 });
 expect(result.sessions).toEqual(expect.arrayContaining(['local-1','remote-1']));
 expect(result.pushed).toEqual(expect.arrayContaining(['local-1','remote-1']));
 expect(result.pending).toBeNull();
 expect(result.revision).toBe(5);
});
test('simultaneous edits to the same record are not silently overwritten',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(()=>{
  const base={templates:[{id:1,name:'Original',ex:[]}]};
  const local={templates:[{id:1,name:'iPhone edit',ex:[]}]};
  const remote={templates:[{id:1,name:'Mac edit',ex:[]}]};
  try{cloudMerge(base,local,remote);return 'overwritten'}catch(e){return e.message}
 });
 expect(result).toContain('SYNC_MERGE_CONFLICT');
});

test('supabase jsonb key order changes do not trigger false merge conflicts', async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(()=>{
  const a={id:'entry',name:'Workout',meta:{weight:50,reps:2}};
  const b={meta:{reps:2,weight:50},name:'Workout',id:'entry'};
  return {
   equals:cloudEqual(a,b),
   canonical:cloudCanonical(a)===cloudCanonical(b),
   merge:cloudMerge({rows:[a]},{rows:[a]},{rows:[b]}).rows.length
  };
 });
 expect(result).toEqual({equals:true,canonical:true,merge:1});
});
test('offline save remains local until connection is restored', async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  db=structuredClone(defaults);
  const session={id:'offline-1',date:'2026-11-06',name:'Offline',ex:[]};
  let pushed=null;
  cloudUser={id:'qa-offline-user',email:'test@example.invalid'};
  cloud={
   from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})}),
   rpc:async(_,args)=>{pushed=args.new_payload;return {data:1,error:null}}
  };
  Object.defineProperty(navigator,'onLine',{value:false,configurable:true});
  db.sessions.push(session);persist();
  await cloudSync();
  const localSaved=JSON.parse(localStorage.getItem('fitness_os_v1')).sessions.some(x=>x.id==='offline-1');
  const queued=localStorage.getItem(cloudPendingKey)==='1';
  Object.defineProperty(navigator,'onLine',{value:true,configurable:true});
  await cloudSync();
  return {localSaved,queued,pushed:Boolean(pushed?.sessions.some(x=>x.id==='offline-1')),remaining:localStorage.getItem(cloudPendingKey)};
 });
 expect(result).toEqual({localSaved:true,queued:true,pushed:true,remaining:null});
});
test('cloud updates arrive automatically without a confirmation dialog',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  db=structuredClone(defaults);
  localStorage.removeItem(cloudPendingKey);
  const remote=structuredClone(defaults);
  remote.sessions.push({id:'other-device',name:'Mac Session',date:'2026-11-06',ex:[]});
  cloudUser={id:'qa-remote-user',email:'test@example.invalid'};
  cloud={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{payload:remote,revision:8},error:null})})})}),rpc:async()=>{throw Error('No upload expected')}};
  await cloudSync();
  return {ids:db.sessions.map(x=>x.id),revision:cloudRevision,pending:localStorage.getItem(cloudPendingKey)};
 });
 expect(result).toEqual({ids:['other-device'],revision:8,pending:null});
});
test('different account cannot receive unsent local records',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  let calls=0;
  cloudUser={id:'new-account',email:'new@example.invalid'};
  localStorage.setItem(cloudOwnerKey,'original-account');
  cloud={from:()=>{calls++;throw Error('Should not read')}};
  await cloudSync();
  return {calls,status:cloudMessage};
 });
 expect(result.calls).toBe(0);
 expect(result.status).toContain('Anderes Konto');
});

test('plan editor starts collapsed and only one exercise can expand',async ({page})=>{
 await page.goto('/');
 await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first().click();
 await page.getByRole('button',{name:/Plan bearbeiten/}).click();
 await expect(page.locator('.pe-panel:visible')).toHaveCount(0);
 await expect(page.locator('.pe-toggle').first()).toHaveAttribute('aria-expanded','false');
 await page.evaluate(()=>{
  db.templates[selectedTemplate].ex.push({name:'Rudern am Kabel',sets:4,reps:'10',rest:75});
  persist();render();
 });
 await page.locator('.pe-toggle').first().click();
 await expect(page.locator('.pe-panel:visible')).toHaveCount(1);
 await expect(page.locator('.pe-toggle').first()).toHaveAttribute('aria-expanded','true');
 await page.locator('.pe-toggle').nth(1).click();
 await expect(page.locator('.pe-panel:visible')).toHaveCount(1);
 await expect(page.locator('.pe-toggle').first()).toHaveAttribute('aria-expanded','false');
 await expect(page.locator('.pe-toggle').nth(1)).toHaveAttribute('aria-expanded','true');
 await expect(page.getByRole('spinbutton',{name:'Sätze 2'})).toBeVisible();
 await expect(page.getByRole('spinbutton',{name:'Sätze 1'})).toBeHidden();
});
test('plan editor uses header back and bottom finish without app nav overlay',async ({page})=>{
 await page.goto('/');
 await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first().click();
 await page.getByRole('button',{name:/Plan bearbeiten/}).click();
 const back=page.locator('.top').getByRole('button',{name:'Zurück'});
 const finish=page.locator('.pe-footer').getByRole('button',{name:'Fertig'});
 await expect(back).toBeVisible();
 await expect(finish).toBeVisible();
 await expect(page.locator('#bottomNav')).toBeHidden();
 const snapshot=await page.evaluate(()=>({
  overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
  buttonHeight:document.querySelector('.pe-finish').getBoundingClientRect().height,
  backHeight:document.querySelector('#pe-back').getBoundingClientRect().height
 }));
 expect(snapshot.overflow).toBeLessThanOrEqual(2);
 expect(snapshot.buttonHeight).toBeGreaterThanOrEqual(44);
 expect(snapshot.backHeight).toBeGreaterThanOrEqual(44);
 await back.click();
 await expect(page.getByRole('button',{name:/Plan bearbeiten/})).toBeVisible();
 await expect(page.locator('#bottomNav')).not.toHaveClass(/live-bottom/);
});
test('keyboard handle reorders plan and preserves selection after reload',async ({page})=>{
 await page.goto('/');
 await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first().click();
 await page.getByRole('button',{name:/Plan bearbeiten/}).click();
 await page.evaluate(()=>{
  db.templates[selectedTemplate].ex.push({name:'Rudern am Kabel',sets:3,reps:'12',rest:80});
  persist();render();
 });
 await page.locator('.pe-toggle').first().click();
 const handle=page.locator('.pe-handle').first();
 await handle.focus();
 await handle.press('ArrowDown');
 await expect(page.locator('.pe-ex-title b').first()).toHaveText('Rudern am Kabel');
 await expect(page.locator('.pe-ex-title b').nth(1)).toHaveText('Bankdrücken');
 await expect(page.locator('.pe-toggle').nth(1)).toHaveAttribute('aria-expanded','true');
 await page.reload();
 await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first().click();
 await page.getByRole('button',{name:/Plan bearbeiten/}).click();
 await expect(page.locator('.pe-ex-title b').first()).toHaveText('Rudern am Kabel');
});
test('press and hold drag handle reorders exercises and persists after reload',async ({page})=>{
 await page.goto('/');
 await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first().click();
 await page.getByRole('button',{name:/Plan bearbeiten/}).click();
 await page.evaluate(()=>{
  db.templates[selectedTemplate].ex.push({name:'Rudern am Kabel',sets:3,reps:'10',rest:90});
  persist();render();
 });
 const handle=page.locator('.pe-handle').first();
 const second=page.locator('.pe-ex').nth(1);
 const a=await handle.boundingBox(),b=await second.boundingBox();
 if(!a||!b)throw Error('Drag targets missing');
 await page.mouse.move(a.x+a.width/2,a.y+a.height/2);
 await page.mouse.down();
 await page.waitForTimeout(390);
 await page.mouse.move(b.x+b.width/2,b.y+b.height*0.75,{steps:6});
 await page.mouse.up();
 await expect(page.locator('.pe-ex-title b').first()).toHaveText('Rudern am Kabel');
 await page.reload();
 await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first().click();
 await page.getByRole('button',{name:/Plan bearbeiten/}).click();
 await expect(page.locator('.pe-ex-title b').first()).toHaveText('Rudern am Kabel');
});

test('sticky finish footer has no safe-area gap or gradient',async ({page})=>{
 await page.goto('/');
 await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first().click();
 await page.getByRole('button',{name:/Plan bearbeiten/}).click();
 const style=await page.locator('.pe-footer').evaluate(el=>{
  const c=getComputedStyle(el);
  return {bottom:c.bottom,bg:c.backgroundColor,image:c.backgroundImage,radius:c.borderRadius,height:el.getBoundingClientRect().height};
 });
 expect(style.bottom).toBe('0px');
 expect(style.bg).toBe('rgb(11, 18, 32)');
 expect(style.image).toBe('none');
 expect(style.radius).toBe('0px');
 expect(style.height).toBeGreaterThanOrEqual(64);
 await expect(page.locator('.pe-add-actions').getByRole('button',{name:/Eigene Übung erstellen/})).toHaveCount(0);
 await expect(page.locator('.pe-footer').getByRole('button',{name:'Fertig'})).toBeVisible();
});

test('delete plan cancellation leaves templates and history unchanged',async ({page})=>{
 await page.goto('/');
 await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first().click();
 await page.getByRole('button',{name:/Plan bearbeiten/}).click();
 await expect(page.getByRole('button',{name:'Trainingsplan löschen'})).toBeVisible();
 const before=await page.evaluate(()=>({templates:JSON.stringify(db.templates),sessions:JSON.stringify(db.sessions)}));
 page.once('dialog',d=>d.dismiss());
 await page.getByRole('button',{name:'Trainingsplan löschen'}).click();
 await expect(page.getByRole('heading',{name:'QA Plan'})).toBeVisible();
 const after=await page.evaluate(()=>({templates:JSON.stringify(db.templates),sessions:JSON.stringify(db.sessions)}));
 expect(after).toEqual(before);
});
test('delete plan preserves workout history and allows recovery from empty templates',async ({page})=>{
 await page.goto('/');
 await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first().click();
 const oldHistory=await page.evaluate(()=>JSON.stringify(db.sessions));
 await page.getByRole('button',{name:/Plan bearbeiten/}).click();
 page.once('dialog',async d=>{
  expect(d.message()).toContain('QA Plan');
  expect(d.message()).toContain('Bereits abgeschlossene Trainings');
  await d.accept();
 });
 await page.getByRole('button',{name:'Trainingsplan löschen'}).click();
 await expect(page.getByRole('heading',{name:'Keine Trainingspläne'})).toBeVisible();
 expect(await page.evaluate(()=>db.templates.length)).toBe(0);
 expect(await page.evaluate(()=>JSON.stringify(db.sessions))).toBe(oldHistory);
 await page.reload();
 await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first().click();
 await expect(page.getByRole('heading',{name:'Keine Trainingspläne'})).toBeVisible();
 await page.getByRole('button',{name:/Trainingsplan erstellen/}).click();
 await expect(page.getByRole('heading',{name:'Trainingsplan bearbeiten'})).toBeVisible();
 expect(await page.evaluate(()=>db.templates.length)).toBe(1);
});
test('deleting one of multiple plans selects a valid remaining template',async ({page})=>{
 await page.goto('/');
 await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first().click();
 await page.evaluate(()=>{
  db.templates.push({id:'second-plan',name:'Zweiter Plan',ex:[]});
  selectedTemplate=1;persist();render();
 });
 await page.getByRole('button',{name:/Plan bearbeiten/}).click();
 page.once('dialog',d=>d.accept());
 await page.getByRole('button',{name:'Trainingsplan löschen'}).click();
 const result=await page.evaluate(()=>({names:db.templates.map(x=>x.name),selectedTemplate,history:db.sessions.length}));
 expect(result.names).toEqual(['QA Plan']);
 expect(result.selectedTemplate).toBe(0);
 await expect(page.getByRole('button',{name:/Plan bearbeiten/})).toBeVisible();
});

test('inline plan title edit is compact and handles Escape, empty names, blur and reload',async ({page})=>{
 await page.goto('/');
 await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first().click();
 await page.getByRole('button',{name:/Plan bearbeiten/}).click();
 const name=page.locator('#pe-plan-name'),pencil=page.getByRole('button',{name:'Trainingsname bearbeiten'});
 await expect(name).toHaveText('QA Plan');
 await expect(pencil).toBeVisible();
 await expect(page.getByRole('textbox',{name:'Trainingsname'})).toBeHidden();
 await expect(page.locator('.pe-details')).toHaveCount(0);
 const touch=await pencil.evaluate(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}));
 expect(touch.width).toBeGreaterThanOrEqual(44);
 expect(touch.height).toBeGreaterThanOrEqual(44);
 await pencil.click();
 const field=page.getByRole('textbox',{name:'Trainingsname'});
 await expect(field).toBeVisible();
 await field.fill('Verworfen');
 await field.press('Escape');
 await expect(name).toHaveText('QA Plan');
 await pencil.click();
 await field.fill('     ');
 await field.press('Enter');
 await expect(name).toHaveText('QA Plan');
 await pencil.click();
 await field.fill('  Neuer   Titel  ');
 await field.blur();
 await expect(name).toHaveText('Neuer Titel');
 await page.reload();
 await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first().click();
 await page.getByRole('button',{name:/Plan bearbeiten/}).click();
 await expect(page.locator('#pe-plan-name')).toHaveText('Neuer Titel');
});

test('editor has one filled primary action and outlined add exercise button',async ({page})=>{
 await page.goto('/');
 await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first().click();
 await page.getByRole('button',{name:/Plan bearbeiten/}).click();
 const add=page.locator('.pe-add-actions').getByRole('button',{name:/Übung hinzufügen/});
 const finish=page.locator('.pe-footer').getByRole('button',{name:'Fertig'});
 await expect(add).toBeVisible();
 await expect(finish).toBeVisible();
 const state=await page.evaluate(()=>{
  const add=document.querySelector('.pe-add-outline'),finish=document.querySelector('.pe-finish');
  const a=getComputedStyle(add),f=getComputedStyle(finish);
  return {addBg:a.backgroundColor,addBorder:a.borderTopStyle,addHeight:add.getBoundingClientRect().height,finishBg:f.backgroundColor,primaryCount:document.querySelectorAll('.pe-page .pe-add-actions .btn, .pe-page .pe-footer .btn').length};
 });
 expect(state.addBg).toBe('rgba(0, 0, 0, 0)');
 expect(state.addBorder).toBe('solid');
 expect(state.addHeight).toBeGreaterThanOrEqual(44);
 expect(state.finishBg).not.toBe(state.addBg);
 expect(state.primaryCount).toBe(1);
 await add.click();
 await expect(page.getByRole('heading',{name:'Übung auswählen'})).toBeVisible();
});

test('clean editor hides redundant hints while retaining useful exercise summaries',async ({page})=>{
 await page.goto('/');
 await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first().click();
 await page.getByRole('button',{name:/Plan bearbeiten/}).click();
 await expect(page.locator('#pe-plan-name')).toBeVisible();
 await expect(page.getByText('Änderungen werden automatisch gespeichert.')).toHaveCount(0);
 await expect(page.getByText('Zum Bearbeiten antippen.')).toHaveCount(0);
 await expect(page.getByText(/insgesamt/)).toHaveCount(0);
 await expect(page.locator('.pe-summary').first()).toContainText('Sätze');
 await expect(page.getByRole('button',{name:'Trainingsname bearbeiten'})).toBeVisible();
 await expect(page.locator('.pe-handle').first()).toBeVisible();
 await page.getByRole('button',{name:/Übung hinzufügen/}).click();
 await expect(page.getByRole('heading',{name:'Übung auswählen'})).toBeVisible();
});

test('lean mockup two-screen flow, timer, next exercise and reload persistence',async ({page})=>{
 await page.goto('/');
 await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first().click();
 await page.evaluate(()=>{
  db.templates[selectedTemplate].name='Oberkörper A';
  db.templates[selectedTemplate].ex=[
   {name:'Bankdrücken',sets:2,reps:'8–10',rest:90},
   {name:'Rudern am Kabel',sets:1,reps:'10',rest:60}
  ];
  persist();newSession();
 });
 await expect(page.locator('.lean-live')).toBeVisible();
 await expect(page.getByRole('heading',{name:'Bankdrücken'})).toBeVisible();
 await expect(page.getByText('Satz 1 von 2')).toBeVisible();
 await expect(page.locator('#bottomNav')).toBeHidden();
 await expect(page.getByText('Zum Bearbeiten antippen.')).toHaveCount(0);
 await page.getByRole('spinbutton',{name:'Wdh.'}).fill('10');
 await page.getByRole('spinbutton',{name:'Gewicht'}).fill('60');
 await page.getByRole('button',{name:'Satz speichern'}).click();
 await expect(page.getByRole('heading',{name:'Pause'})).toBeVisible();
 await expect(page.locator('#lean-countdown')).toContainText('01:');
 await expect(page.getByText('Satz 2 von 2')).toBeVisible();
 const saved=await page.evaluate(()=>({
  set:active.ex[0].rows[0],restUntil:active.leanRestUntil,
  cloudSnapshot:JSON.parse(localStorage.getItem('fitness_os_v1')).activeWorkout
 }));
 expect(saved.set).toMatchObject({kg:60,reps:10,done:true});
 expect(saved.restUntil).toBeGreaterThan(Date.now());
 expect(saved.cloudSnapshot.ex[0].rows[0].done).toBe(true);
 await page.reload();
 await expect(page.getByRole('heading',{name:'Pause'})).toBeVisible();
 await page.getByRole('button',{name:'Pause überspringen'}).click();
 await expect(page.getByText('Satz 2 von 2')).toBeVisible();
 await expect(page.getByRole('spinbutton',{name:'Wdh.'})).toHaveValue('10');
 await expect(page.getByRole('spinbutton',{name:'Gewicht'})).toHaveValue('60');
 await page.getByRole('spinbutton',{name:'Wdh.'}).fill('8');
 await page.getByRole('spinbutton',{name:'Gewicht'}).fill('62.5');
 await page.getByRole('button',{name:'Satz speichern'}).click();
 await expect(page.getByRole('heading',{name:'Pause'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Rudern am Kabel'})).toBeVisible();
 await expect(page.getByText('Satz 1 von 1')).toBeVisible();
 await page.getByRole('button',{name:'Weiter'}).click();
 await expect(page.getByRole('heading',{name:'Rudern am Kabel'})).toBeVisible();
 await page.getByRole('button',{name:'Satz speichern'}).click();
 await expect(page.getByRole('heading',{name:'Training abgeschlossen'})).toBeVisible();
 await page.getByRole('button',{name:'Training beenden'}).click();
 await expect(page.locator('.lean-live')).toHaveCount(0);
 const summary=await page.evaluate(()=>db.sessions.at(-1).ex.map(e=>e.rows.map(r=>r.done)));
 expect(summary).toEqual([[true,true],[true]]);
});
test('rest timer expiry automatically shows next set and rejects invalid inputs',async ({page})=>{
 await page.goto('/');
 await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first().click();
 await page.evaluate(()=>{
  db.templates[selectedTemplate].ex=[{name:'Bankdrücken',sets:2,reps:'10',rest:90}];
  newSession();
 });
 const repetitions=page.getByRole('spinbutton',{name:'Wdh.'});
 await repetitions.fill('0');
 await page.getByRole('button',{name:'Satz speichern'}).click();
 expect(await page.evaluate(()=>active.ex[0].rows[0].done)).toBe(false);
 await expect(repetitions).toHaveAttribute('aria-invalid','true');
 await repetitions.fill('10');
 await page.getByRole('spinbutton',{name:'Gewicht'}).fill('40');
 await page.getByRole('button',{name:'Satz speichern'}).click();
 await expect(page.getByRole('heading',{name:'Pause'})).toBeVisible();
 await page.evaluate(()=>{active.leanRestUntil=Date.now()-100;leanTick()});
 await expect(page.getByText('Satz 2 von 2')).toBeVisible();
 await expect(page.getByRole('spinbutton',{name:'Wdh.'})).toBeVisible();
 expect(await page.evaluate(()=>active.leanRestUntil)).toBeNull();
});
test('lean screen is accessible on simulated iPhone and overview remains reachable',async ({page})=>{
 await page.goto('/');
 await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first().click();
 await page.getByRole('button',{name:'Training starten'}).click();
 await expect(page.locator('.lean-live')).toBeVisible();
 const metrics=await page.evaluate(()=>({
  overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
  controls:[...document.querySelectorAll('.lean-live button')].map(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height}))
 }));
 expect(metrics.overflow).toBeLessThanOrEqual(2);
 expect(metrics.controls.every(x=>x.w>=39&&x.h>=44)).toBe(true);
 await page.getByRole('button',{name:'Trainingsübersicht'}).click();
 await expect(page.locator('.v4-eyebrow').getByText('TRAININGSÜBERSICHT',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:/Zurück zum aktuellen Satz/}).click();
 await expect(page.locator('.lean-live')).toBeVisible();
});

test('next set inherits last entered values, including decimal weight, but next exercise remains independent',async ({page})=>{
 await page.goto('/');
 await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first().click();
 await page.evaluate(()=>{
  db.templates[selectedTemplate].ex=[
   {name:'Bankdrücken',sets:3,reps:'8–10',rest:90},
   {name:'Rudern am Kabel',sets:1,reps:'12',rest:30}
  ];persist();newSession();
 });
 await page.getByRole('spinbutton',{name:'Wdh.'}).fill('11');
 await page.getByRole('spinbutton',{name:'Gewicht'}).fill('57.5');
 await page.getByRole('button',{name:'Satz speichern'}).click();
 await expect(page.getByRole('heading',{name:'Pause'})).toBeVisible();
 expect(await page.evaluate(()=>active.ex[0].rows[1])).toMatchObject({reps:11,kg:57.5,done:false});
 await page.reload();
 await page.getByRole('button',{name:'Weiter'}).click();
 await expect(page.getByRole('spinbutton',{name:'Wdh.'})).toHaveValue('11');
 await expect(page.getByRole('spinbutton',{name:'Gewicht'})).toHaveValue('57.5');
 await page.getByRole('spinbutton',{name:'Wdh.'}).fill('9');
 await page.getByRole('spinbutton',{name:'Gewicht'}).fill('60');
 await page.getByRole('button',{name:'Satz speichern'}).click();
 await page.getByRole('button',{name:'Pause überspringen'}).click();
 await expect(page.getByRole('spinbutton',{name:'Wdh.'})).toHaveValue('9');
 await expect(page.getByRole('spinbutton',{name:'Gewicht'})).toHaveValue('60');
 await page.getByRole('button',{name:'Satz speichern'}).click();
 await expect(page.getByRole('heading',{name:'Pause'})).toBeVisible();
 await page.getByRole('button',{name:'Weiter'}).click();
 await expect(page.getByRole('heading',{name:'Rudern am Kabel'})).toBeVisible();
 await expect(page.getByRole('spinbutton',{name:'Wdh.'})).toHaveValue('12');
 await expect(page.getByRole('spinbutton',{name:'Gewicht'})).toHaveValue('0');
});
