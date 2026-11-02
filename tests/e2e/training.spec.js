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
  await page.locator('#bottomNav').getByRole('button',{name:/Übersicht/}).click();
  await expect(page.locator('#view')).toContainText('Training');
  await page.locator('#bottomNav').getByRole('button',{name:/Mehr/}).click();
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
  await expect.poll(()=>page.evaluate(()=>Boolean(window.active && window.active.id==='qa-running'))).toBe(true);
  await page.reload();
  await expect.poll(()=>page.evaluate(()=>Boolean(window.active && window.active.id==='qa-running'))).toBe(true);
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
