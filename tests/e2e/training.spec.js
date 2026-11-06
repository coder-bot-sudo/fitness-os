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
 await expect(page.locator('.pe-ex-title')).toContainText('Mein Kabelzug');
 expect(await page.evaluate(()=>db.exercises.find(e=>e.name==='Mein Kabelzug'))).toMatchObject({muscle:'Rücken',equipment:'Kabel',custom:true});
 await page.reload();
 await page.locator('#sideNav button:visible, #bottomNav button:visible').filter({hasText:'Training'}).first().click();
 await page.getByRole('button',{name:/Plan bearbeiten/}).click();
 await expect(page.locator('.pe-ex-title')).toContainText('Mein Kabelzug');
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
