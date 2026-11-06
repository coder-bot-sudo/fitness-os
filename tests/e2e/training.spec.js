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
  await expect(page.locator('#bottomNav')).toHaveClass(/live-bottom/);
  await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Übersicht'}).first().click();
  await expect(page.locator('#view')).toContainText('Training');
  await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Mehr'}).first().click();
  await expect(page.getByRole('button',{name:'Training verwerfen'})).toBeVisible();
  page.once('dialog',d=>d.dismiss());
  await page.getByRole('button',{name:'Training verwerfen'}).click();
  await expect(page.locator('#bottomNav')).toHaveClass(/live-bottom/);
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
 await page.getByRole('textbox',{name:'Trainingsname'}).fill('QA Oberkörper');
 await page.getByRole('spinbutton',{name:'Sätze 1'}).fill('4');
 await page.getByRole('spinbutton',{name:'Sätze 1'}).blur();
 await page.getByRole('button',{name:/Fertig/}).click();
 await page.reload();
 await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first().click();
 await page.getByRole('button',{name:/Plan bearbeiten/}).click();
 await expect(page.getByRole('textbox',{name:'Trainingsname'})).toHaveValue('QA Oberkörper');
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
 await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Übungen'}).first().click();
 await page.getByRole('button',{name:/Eigene Übung erstellen/}).click();
 await page.getByRole('textbox',{name:'Name der eigenen Übung'}).fill('Mein Zug im Training');
 await page.getByRole('button',{name:'Übung speichern und auswählen'}).click();
 expect(await page.evaluate(()=>active.ex.some(e=>e.name==='Mein Zug im Training'))).toBe(true);
 expect(await page.evaluate(()=>db.exercises.some(e=>e.name==='Mein Zug im Training'))).toBe(true);
});

test('custom exercise creation is directly available while editing a plan',async ({page})=>{
 await page.goto('/');
 await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first().click();
 await page.getByRole('button',{name:/Plan bearbeiten/}).click();
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
 await expect(page.getByText('Fitness OS · v2026.11.06.3')).toBeVisible();
 expect(await page.evaluate(()=>Array.from(document.scripts).some(s=>s.src.includes('training_plan_editor.js?v=2026.11.06.3')))).toBe(true);
 await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first().click();
 await page.getByRole('button',{name:/Plan bearbeiten/}).click();
 await expect(page.getByRole('button',{name:/Eigene Übung erstellen/})).toBeVisible();
});

test('per repetition weight changes, undo, correction, reload and volume',async ({page})=>{
 await page.addInitScript(({running})=>{if(sessionStorage.getItem('qa-running-set'))return;sessionStorage.setItem('qa-running-set','1');localStorage.setItem('fitness_os_active_v3',JSON.stringify(running))},{running});
 await page.goto('/');
 await expect(page.getByRole('button',{name:/Wiederholung bestätigen/})).toBeVisible();
 await page.getByRole('button',{name:/Wiederholung bestätigen/}).click();
 await page.getByRole('button',{name:/Wiederholung bestätigen/}).click();
 await page.locator('#v3-kg').fill('50');
 await page.getByRole('button',{name:/Wiederholung bestätigen/}).click();
 expect(await page.evaluate(()=>active.ex[0].rows[0].repetitionLog.map(r=>r.weightKg))).toEqual([65,65,50]);
 await page.getByRole('button',{name:/Letzte Wiederholung zurücknehmen/}).click();
 expect(await page.evaluate(()=>active.ex[0].rows[0].repetitionLog.map(r=>r.weightKg))).toEqual([65,65]);
 page.once('dialog',d=>d.accept('55'));
 await page.getByRole('button',{name:/Wiederholung 1 korrigieren/}).click();
 await page.getByRole('button',{name:/Wiederholung bestätigen/}).click();
 expect(await page.evaluate(()=>active.ex[0].rows[0].repetitionLog.map(r=>r.weightKg))).toEqual([55,65,50]);
 await page.reload();
 expect(await page.evaluate(()=>active.ex[0].rows[0].repetitionLog.map(r=>r.weightKg))).toEqual([55,65,50]);
 await page.getByRole('button',{name:/Satz abschließen/}).click();
 expect(await page.evaluate(()=>active.ex[0].rows[0].done)).toBe(true);
 await page.evaluate(()=>endWorkout());
 const sets=await page.evaluate(()=>analyticsAllSets().filter(r=>r.name==='Bankdrücken'));
 expect(sets.some(r=>r.reps===3&&r.volume===170&&r.kg===65&&r.e1rm===null)).toBe(true);
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
