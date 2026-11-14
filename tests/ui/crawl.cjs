/* Build a Life — clicks every button in every tab, for characters at every life stage,
   on phone, tablet and computer screen sizes, and reports any errors or dead buttons.
   Needs Playwright:  node tests/ui/crawl.cjs [--quick] [--shots=DIR] */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../..');
const URL = 'file://' + path.join(ROOT, 'index.html');
const QUICK = process.argv.includes('--quick');
const SHOTS = (process.argv.find(a => a.startsWith('--shots=')) || '').slice(8);
const UI_SRC = fs.readFileSync(path.join(ROOT, 'js/ui.js'), 'utf8');
const HANDLED = new Set([...UI_SRC.matchAll(/case '([A-Za-z0-9]+)'/g)].map(m => m[1]));

const ONLY = (process.argv.find(a => a.startsWith('--vp=')) || '').slice(5);
const VIEWPORTS = (QUICK ? [{ name: 'computer', width: 1360, height: 900 }] : [
  { name: 'computer', width: 1360, height: 900 }, { name: 'tablet', width: 820, height: 1180 }, { name: 'phone', width: 390, height: 844 }])
  .filter(v => !ONLY || v.name === ONLY);

// Characters at every life stage, with jobs, family, pets, a home, money troubles, etc.
function makeCharacters() {
  const G = BAL.Game, S = BAL.Store;
  S.data = { profiles: [], activeId: null, sound: false };
  const pr = S.addProfile('Tester', '🦊', '#9775FA'); S.data.activeId = pr.id;
  G.rng = G.seeded('crawl');
  const ids = [];
  const add = (l) => { S.addChar(l); ids.push(l.id); return l; };
  add(G.newLife({ name: 'Baby', age: 0 }));
  add(G.newLife({ name: 'Toddler', age: 4, townId: 'pebble' }));
  const kid = add(G.newLife({ name: 'Kid', age: 9, townId: 'coral' })); kid.coins = 400; G.run(kid, 'makeFriend', true);
  kid.pets.push({ id: 'pet-kid', kind: 'rabbit', name: 'Flopsy', age: 1, love: 40 });
  const teen = add(G.newLife({ name: 'Teen', age: 16, townId: 'bubble' })); teen.coins = 300; G.run(teen, 'takeSideJob', 'paper');
  const ad = add(G.newLife({ name: 'Parent', age: 34, townId: 'maple' }));
  ad.coins = 60000; ad.edu.level = 4; ad.stats.smarts = 90; ad.skills.cooking = 60; ad.licence = true;
  G.rng = () => 0.01; G.run(ad, 'applyJob', 'chef'); G.rng = G.seeded('crawl2');
  G.run(ad, 'buyHome', 'family'); G.run(ad, 'buyItem', 'sofa'); G.run(ad, 'buyItem', 'plant'); G.run(ad, 'buyItem', 'fairylights'); G.run(ad, 'buyCar', 'familycar');
  ad.people.push(G.makePerson('spouse', 34, 'boy', { name: 'Sam', livesWith: true })); ad.flags.weddingAge = 30;
  G.run(ad, 'haveBaby', 'Ollie', 'boy'); const k = G.children(ad)[0]; k.age = 7; G.ensureKid(k); k.kid.bday = true; k.kid.sick = 'a cold';
  G.run(ad, 'startBusiness', 'bakery');
  ad.pets.push({ id: 'pet-ad', kind: 'dog', name: 'Biscuit', age: 3, love: 60 });
  const broke = add(G.newLife({ name: 'Broke', age: 24 })); broke.coins = 0; broke.owed = 1200; broke.home = { type: 'rent', id: 'apartment' };
  G.run(broke, 'findLove', 'any');
  const gran = add(G.newLife({ name: 'Gran', age: 74, townId: 'meadow' })); gran.retired = true; gran.pension = 8000;
  gran.people.push(G.makePerson('grandchild', 5, 'girl', { name: 'Poppy' }));
  for (const id of ids) { const l = S.data.profiles[0].chars.find(c => c.id === id); G.ensureBirthdays(l); G.ensurePets(l); G.ensureFamily(l); G.ensureDay(l); }
  G.rng = Math.random;
  S.save();
  return ids;
}

(async () => {
  const browser = await chromium.launch();
  const problems = [];
  let clicks = 0;
  const seenActs = new Map();
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    let where = '';
    page.on('pageerror', e => problems.push(`[${vp.name}] ${where}: PAGE ERROR ${e.message}`));
    page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|net::/.test(m.text())) problems.push(`[${vp.name}] ${where}: console ${m.text()}`); });
    await page.goto(URL);
    const ids = await page.evaluate(makeCharacters);
    await page.reload();
    const tabs = await page.evaluate(() => [...document.querySelectorAll('.tab')].map(t => t.getAttribute('data-id')));
    // profiles & characters screens
    for (const scr of ['profiles', 'chars']) {
      where = scr;
      await page.evaluate(s => { BAL.UI._state.screen = s; BAL.UI._reset && 0; }, scr);
      await page.evaluate(s => { const st = BAL.UI._state; st.screen = s; }, scr);
    }
    const chars = QUICK ? ids.slice(2, 5) : ids;
    console.log(`[${vp.name}] testing ${chars.length} characters × ${tabs.length} tabs…`);
    for (const cid of chars) {
      await page.evaluate(id => { const p = BAL.Store.active(); p.activeCharId = id; BAL.Store.save(); BAL.UI._reset(); }, cid);
      const name = await page.evaluate(() => BAL.Store.activeChar().name);
      const before = problems.length;
      for (const tab of tabs) {
        where = `${name}/${tab}`;
        await page.evaluate(t => { BAL.UI._reset(); BAL.UI._state.tab = t; BAL.UI._reset(); }, tab);
        if (SHOTS && vp.name !== 'tablet') { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: `${SHOTS}/${vp.name}-${name}-${tab}.png`, fullPage: false }); }
        // Click every button in this tab, entirely inside the page (fast).
        const res = await page.evaluate(async ({ tab, limit, skip }) => {
          const out = { clicked: 0, seen: [], errors: [] };
          const tick = () => new Promise(r => setTimeout(r, 0));
          const list = () => [...document.querySelectorAll('#app [data-act]')];
          const n = list().length;
          for (let i = 0; i < Math.min(n, limit); i++) {
            const b = list()[i];
            if (!b || b.disabled || !(b.offsetWidth || b.offsetHeight)) continue;
            const act = b.getAttribute('data-act'), fn = b.getAttribute('data-fn');
            const txt = (b.innerText || b.getAttribute('aria-label') || '').trim().slice(0, 40);
            out.seen.push([act, fn, txt]);
            if (skip.includes(act)) continue;
            try {
              b.click(); out.clicked++;
              await tick();
              const g = document.querySelector('#game-root:not([hidden]) [data-act="gAnswer"], #game-root:not([hidden]) [data-act="gTap"], #game-root:not([hidden]) [data-act="gFood"], #game-root:not([hidden]) [data-act="gCell"]');
              if (g) g.click();
              const m = document.querySelector('#modal-root:not([hidden]) [data-mx], #modal-root:not([hidden]) [data-mbtn-trip], #modal-root:not([hidden]) [data-unwrap], #modal-root:not([hidden]) [data-mbtn="0"]');
              if (m) m.click();
              await tick();
            } catch (e) { out.errors.push('clicking "' + txt + '" failed: ' + e.message); }
            BAL.UI._reset();
            if (BAL.UI._state.screen === 'game') { BAL.UI._state.tab = tab; BAL.UI._reset(); }
          }
          return out;
        }, { tab, limit: QUICK ? 25 : 80, skip: ['delProfile', 'delChar', 'goProfiles', 'goChars', 'pickProfile', 'newProfile', 'newChar', 'sound'] });
        clicks += res.clicked;
        res.errors.forEach(e => problems.push(`[${vp.name}] ${where}: ${e}`));
        for (const [act, fn, txt] of res.seen) {
          seenActs.set(act + (fn ? ':' + fn : ''), txt);
          if (!HANDLED.has(act)) problems.push(`[${vp.name}] ${where}: button "${txt}" has no handler (${act})`);
          if (act === 'do' && fn) {
            const okFn = await page.evaluate(fn => typeof BAL.Game.actions[fn] === 'function', fn);
            if (!okFn) problems.push(`[${vp.name}] ${where}: button "${txt}" calls unknown action ${fn}`);
          }
        }
        await page.evaluate(t => { BAL.UI._reset(); BAL.UI._state.tab = t; BAL.UI._reset(); }, tab);
        const sw = await page.evaluate(() => document.documentElement.scrollWidth);
        if (sw > vp.width + 1) problems.push(`[${vp.name}] ${where}: page is wider than the screen (${sw}px)`);
      }
      console.log(`[${vp.name}] ${name}: done (${clicks} clicks so far, ${problems.length - before} new problems)`);
      problems.slice(before).forEach(p => console.log('   ! ' + p));
      // Sub-screens: the party planner, a child's party planner, the adoption room and the pet shop.
      const subs = await page.evaluate(async () => {
        const G = BAL.Game, S = BAL.UI._state, l = BAL.Store.activeChar(), out = { clicked: 0, errors: [] };
        const views = [];
        if (l.age >= 1) views.push(['celebrate', () => { S.planner = G.newPartyPlan(l); }]);
        const kid = G.kidsAtHome(l).find(k => k.kid);
        if (kid) views.push(['celebrate', () => { kid.kid.bday = true; S.kidPlanner = { pid: kid.id, theme: 'family', flavour: 'chocolate', shape: 'round', level: 'cake', present: 'card' }; }]);
        const an = G.shelter(l)[0];
        if (an) views.push(['pets', () => { const a2 = G.shelter(l)[0]; if (a2) S.adopt = { animal: a2, look: JSON.parse(JSON.stringify(a2.look)), name: a2.name }; }]);
        if (l.pets[0]) views.push(['pets', () => { S.petShop = l.pets[0].id; }]);
        for (const [tab, setup] of views) {
          const open = () => { BAL.UI._reset(); S.tab = tab; setup(); BAL.UI._render(); };
          open();
          const n = document.querySelectorAll('#panel [data-act]').length;
          for (let i = 0; i < n; i++) {
            open();
            const b = document.querySelectorAll('#panel [data-act]')[i];
            if (!b || b.disabled) continue;
            try { b.click(); out.clicked++; await new Promise(r => setTimeout(r, 0)); const m = document.querySelector('#modal-root:not([hidden]) [data-mbtn="0"]'); if (m) m.click(); }
            catch (e) { out.errors.push(tab + ' sub-screen: "' + (b.innerText || '').trim().slice(0, 30) + '" failed: ' + e.message); }
          }
        }
        BAL.UI._reset();
        return out;
      });
      clicks += subs.clicked;
      subs.errors.forEach(e => problems.push(`[${vp.name}] ${name}: ${e}`));
      // Age Up with challenges forced complete, and the birthday pop-ups
      where = `${name}/ageUp`;
      await page.evaluate(() => { const l = BAL.Store.activeChar(); l.goals.forEach(g => g.done = true); BAL.UI._reset(); document.querySelector('[data-act="ageUp"]').click(); });
      for (let k = 0; k < 40; k++) { const more = await page.evaluate(() => { const b = document.querySelector('#modal-root:not([hidden]) [data-mbtn="0"]'); if (b) { b.click(); return true; } return false; }); if (!more) break; await page.waitForTimeout(40); }
    }
    // other screens: profiles, characters, the creator and Change Your Look, end of life
    for (const [label, fn] of [
      ['profiles', () => { BAL.UI._state.screen = 'profiles'; }],
      ['characters', () => { BAL.UI._state.screen = 'chars'; }]
    ]) {
      where = label;
      await page.evaluate(fn);
      await page.evaluate(() => { const s = BAL.UI._state; const keep = s.screen; BAL.UI._reset(); s.screen = keep; document.querySelector('[data-act]') && 0; });
    }
    where = 'creator';
    await page.evaluate(() => { BAL.UI._reset(); document.querySelector('[data-act="goChars"]').click(); });
    await page.evaluate(() => document.querySelector('[data-act="newChar"]').click());
    for (const step of ['me', 'face', 'clothes', 'extras', 'home']) {
      await page.evaluate(s => document.querySelector(`[data-act="edStep"][data-v="${s}"]`).click(), step);
      const n = await page.evaluate(() => document.querySelectorAll('.creator-options [data-act]').length);
      for (let i = 0; i < Math.min(n, 40); i += 3) { await page.evaluate(i => { const b = document.querySelectorAll('.creator-options [data-act]')[i]; if (b) b.click(); }, i); clicks++; }
    }
    if (SHOTS && vp.name !== 'tablet') await page.screenshot({ path: `${SHOTS}/${vp.name}-creator.png` });
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    if (sw > vp.width + 1) problems.push(`[${vp.name}] creator: page is wider than the screen (${sw}px)`);
    await page.evaluate(() => document.querySelector('.ed-preview [data-act="edSave"]').click());
    await page.waitForTimeout(100);
    where = 'end of life';
    await page.evaluate(() => { const l = BAL.Store.activeChar(); l.age = 120; l.lifeEnd = 1; BAL.Game.ensureGoals(l); l.goals.forEach(g => g.done = true); BAL.UI._reset(); document.querySelector('[data-act="ageUp"]').click(); });
    for (let k = 0; k < 40; k++) { const more = await page.evaluate(() => { const b = document.querySelector('#modal-root:not([hidden]) [data-mbtn="0"]'); if (b) { b.click(); return true; } return false; }); if (!more) break; await page.waitForTimeout(40); }
    const endOk = await page.evaluate(() => BAL.UI._state.screen === 'end' && !!document.querySelector('.end-card'));
    if (!endOk) problems.push(`[${vp.name}] end of life: the life story screen did not appear`);
    if (SHOTS && vp.name !== 'tablet') await page.screenshot({ path: `${SHOTS}/${vp.name}-end.png` });
    await ctx.close();
  }
  await browser.close();
  const uniq = [...new Set(problems)];
  console.log(`Clicked ${clicks} buttons (${seenActs.size} different kinds) on ${VIEWPORTS.map(v => v.name).join(', ')}.`);
  if (uniq.length) { console.log(`${uniq.length} problem(s):`); uniq.slice(0, 80).forEach(p => console.log(' - ' + p)); process.exit(1); }
  console.log('No problems found. ✅');
})();
