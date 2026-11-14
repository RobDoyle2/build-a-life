// Unit tests for the Build a Life game engine (js/game.js).
import test from 'node:test';
import assert from 'node:assert/strict';

await import('../js/data.js');
await import('../js/wardrobe.js');
await import('../js/game.js');
await import('../js/challenges.js');
await import('../js/economy.js');
await import('../js/world.js');
await import('../js/family.js');
await import('../js/avatar.js');
await import('../js/storage.js');
const BAL = globalThis.BAL;
const G = BAL.Game;

function lucky() { G.rng = () => 0.01; }      // every chance succeeds
function unlucky() { G.rng = () => 0.99; }    // every chance fails
function grow(life, years, onYear) {
  for (let i = 0; i < years && !life.ended; i++) {
    const rep = G.ageUp(life, { force: true });
    if (onYear) onYear(rep);
  }
}

test('a new life starts as a baby with family, energy and daily jobs', () => {
  lucky();
  const l = G.newLife({ name: 'Mia', gender: 'girl', townId: 'bubble', familyType: 'mums' });
  assert.equal(l.age, 0);
  assert.equal(l.name, 'Mia');
  assert.equal(l.townId, 'bubble');
  assert.equal(l.people.filter(p => p.role === 'mum').length, 2);
  assert.ok(l.energy > 0 && l.energy === l.maxEnergy);
  assert.ok(l.chores.length >= 3);
  assert.equal(l.coins, 0);
});

test('activities use energy and change stats; out of energy is refused', () => {
  lucky();
  const l = G.newLife({ name: 'Leo' });
  grow(l, 1);
  const before = l.stats.smarts;
  const res = G.run(l, 'activity', 'words');
  assert.ok(res.ok);
  assert.ok(l.stats.smarts > before);
  assert.ok(l.achievements.includes('first_words'));
  while (l.energy > 0) G.run(l, 'activity', 'giggle');
  const tired = G.run(l, 'activity', 'giggle');
  assert.equal(tired.ok, false);
});

test('ageing up gives birthdays, school and a choice at 18', () => {
  lucky();
  const l = G.newLife({ name: 'Ava' });
  let sawFuture = false;
  grow(l, 18, rep => { if (rep.choice === 'future') sawFuture = true; });
  assert.equal(l.age, 18);
  assert.ok(sawFuture);
  assert.equal(l.edu.level, 2);
  assert.ok(l.coins > 0, 'birthday gifts and pocket money add up');
  assert.ok(l.achievements.includes('graduate'));
});

test('university leads to a degree and better jobs; promotions work', () => {
  lucky();
  const l = G.newLife({ name: 'Theo' });
  grow(l, 18);
  l.stats.smarts = 90; l.stats.fitness = 80;
  assert.ok(G.run(l, 'chooseFuture', 'uni').ok);
  assert.equal(G.jobCheck(l, G.byId(BAL.JOBS, 'doctor')).ok, false, 'must finish studying first');
  grow(l, 3);
  assert.equal(l.edu.level, 4);
  l.stats.smarts = 90;
  assert.equal(G.jobCheck(l, G.byId(BAL.JOBS, 'doctor')).ok, false, 'doctors need science skills');
  l.skills.science = 60;
  const r = G.run(l, 'applyJob', 'doctor');
  assert.ok(r.ok, r.msg);
  assert.equal(G.salary(l), Math.round(36000 * G.town(l).pay));
  for (let lvl = 1; lvl <= 3; lvl++) {
    grow(l, 1);
    l.job.perf = 95;
    assert.ok(G.run(l, 'askPromotion').ok);
    assert.equal(l.job.level, lvl);
  }
  assert.equal(G.jobTitle(l), 'Head Doctor');
  assert.ok(l.achievements.includes('boss'));
});

test('job applications respect requirements and can fail kindly', () => {
  unlucky();
  const l = G.newLife({ name: 'Kai', age: 18 });
  assert.equal(G.run(l, 'applyJob', 'astronaut').ok, false);
  const r = G.run(l, 'applyJob', 'shop');
  assert.equal(r.ok, false);
  assert.match(r.msg, /Keep trying/);
});

test('love, wedding and children', () => {
  lucky();
  const l = G.newLife({ name: 'Sam', age: 25 });
  l.coins = 10000;
  assert.equal(G.run(l, 'findLove', 'any').ok, true);
  const p = G.partner(l);
  p.close = 90;
  assert.equal(G.run(l, 'propose', p.id).ok, false, 'become a couple first');
  assert.ok(G.run(l, 'askOut', p.id).ok);
  assert.equal(G.run(l, 'haveBaby', 'Too Soon').ok, false, 'babies come once you live together');
  assert.ok(G.run(l, 'propose', p.id).ok);
  assert.equal(p.role, 'fiance');
  assert.ok(G.run(l, 'wedding', p.id, 'small').ok);
  assert.equal(p.role, 'spouse');
  assert.ok(l.achievements.includes('married'));
  assert.ok(G.run(l, 'haveBaby', 'Poppy', 'girl').ok);
  assert.equal(G.run(l, 'haveBaby', 'Twin').ok, false, 'one baby per year');
  assert.equal(G.children(l)[0].name, 'Poppy');
});

test('children under 18 cannot date', () => {
  lucky();
  const l = G.newLife({ name: 'Zara', age: 12 });
  assert.equal(G.run(l, 'findLove').ok, false);
});

test('pets: kids ask family, adults pay; pets age', () => {
  lucky();
  const kid = G.newLife({ name: 'Finn', age: 8 });
  assert.ok(G.run(kid, 'adoptPet', 'hamster', 'Nibbles').ok);
  assert.equal(G.run(kid, 'adoptPet', 'dog', 'Rex').ok, false, 'only one ask per year');
  grow(kid, 6);
  assert.equal(kid.pets.length, 0, 'hamsters have short lives');
  assert.ok(kid.remembered.some(r => r.name === 'Nibbles'));

  const adult = G.newLife({ name: 'Ivy', age: 30 });
  adult.coins = 50;
  assert.equal(G.run(adult, 'adoptPet', 'dog', 'Rex').ok, false, 'not enough coins');
  adult.coins = 5000;
  const r = G.run(adult, 'adoptPet', 'dog', 'Rex');
  assert.ok(r.ok);
  assert.ok(r.coinsDelta < 0);
});

test('buying a home takes a deposit and yearly payments', () => {
  lucky();
  const l = G.newLife({ name: 'Ruby', age: 20, townId: 'maple' });
  l.coins = 100000;
  assert.ok(G.run(l, 'buyHome', 'flat').ok);
  assert.equal(l.home.type, 'own');
  assert.equal(l.coins, 100000 - 8000);
  assert.equal(l.home.owed, 32000);
  grow(l, 1);
  assert.equal(l.home.owed, 32000 - 1600);
  assert.ok(G.run(l, 'payOffHome').ok);
  assert.equal(l.home.owed, 0);
});

test('shopping, health and daily jobs', () => {
  lucky();
  const l = G.newLife({ name: 'Alfie', age: 10 });
  l.coins = 100;
  assert.ok(G.run(l, 'buyItem', 'capitem').ok);
  assert.equal(l.look.accessory, 'cap');
  assert.equal(G.run(l, 'buyItem', 'capitem').ok, false, 'already owned');
  l.sick = { id: 'cold' };
  const doc = G.run(l, 'clinic', 'gp');
  assert.ok(doc.ok);
  assert.equal(l.sick, null);
  assert.equal(doc.coinsDelta, 0, 'free for children');
  l.chores.forEach((c, i) => G.run(l, 'chore', i));
  assert.equal(l.totals.helper, 1);
});

test('a life always ends gently in old age and can continue as a child', () => {
  lucky();
  const l = G.newLife({ name: 'Grace', age: 30 });
  l.coins = 5000;
  l.people.push(G.makePerson('child', 5, 'boy', { name: 'Oscar' }));
  grow(l, 200);
  assert.ok(l.ended);
  assert.ok(l.age >= 80 && l.age <= 115);
  assert.equal(G.run(l, 'activity', 'read').ok, false);
  const s = G.summary(l);
  assert.ok(s.stars >= 1 && s.stars <= 5);
  const kid = G.children(l)[0];
  const next = G.continueAsChild(l, kid.id);
  assert.equal(next.name, 'Oscar');
  assert.equal(next.generation, 2);
  assert.equal(next.age, kid.age);
  assert.ok(next.coins >= 0);
  assert.equal(next.ended, false);
});

test('the save survives JSON round-trips and avatars render for every stage', () => {
  lucky();
  const l = G.newLife({ name: 'Nia' });
  grow(l, 40);
  const copy = JSON.parse(JSON.stringify(l));
  assert.deepEqual(copy.stats, l.stats);
  for (const age of [0, 6, 15, 30, 80]) {
    const svg = BAL.avatar(l.look, age, 70, { bg: '#fff' });
    assert.match(svg, /^<svg[\s\S]*<\/svg>$/);
    assert.doesNotMatch(svg, /NaN|undefined/);
  }
});

/* ---------------- Character creation & wardrobe ---------------- */

test('every age group has its own collection with tops, trousers, skirts, dresses, shoes and extras', () => {
  assert.deepEqual(BAL.AGE_GROUPS.map(g => g.id), ['baby', 'toddler', 'child', 'teen', 'adult', 'older']);
  for (const g of BAL.AGE_GROUPS) {
    const bottoms = G.wardrobe('bottom', g.id);
    assert.ok(G.wardrobe('top', g.id).length >= 2, g.id + ' tops');
    assert.ok(bottoms.some(b => b.kind === 'trousers'), g.id + ' trousers');
    assert.ok(bottoms.some(b => b.kind === 'skirt'), g.id + ' skirts');
    assert.ok(bottoms.some(b => b.kind === 'dress'), g.id + ' dresses');
    assert.ok(G.wardrobe('shoes', g.id).filter(x => !x.special).length >= 2, g.id + ' shoes');
    assert.ok(G.wardrobe('extra', g.id).length >= 2, g.id + ' extras');
    const d = G.defaultOutfit(g.id, '#FF6B6B');
    for (const slot of G.SLOTS) assert.ok(G.fits(slot, d[slot], g.id), `default ${slot} fits ${g.id}`);
  }
  for (const slot of G.SLOTS) {
    const ids = BAL.WARDROBE[slot].map(x => x.id);
    assert.equal(new Set(ids).size, ids.length, 'unique ids in ' + slot);
  }
});

test('the age group follows the character as they grow', () => {
  assert.equal(G.ageGroup(0), 'baby');
  assert.equal(G.ageGroup(2), 'baby');
  assert.equal(G.ageGroup(3), 'toddler');
  assert.equal(G.ageGroup(9), 'child');
  assert.equal(G.ageGroup(16), 'teen');
  assert.equal(G.ageGroup(40), 'adult');
  assert.equal(G.ageGroup(90), 'older');
  lucky();
  const l = G.newLife({ name: 'Ella' });
  let notes = 0;
  grow(l, 6, rep => { if (rep.newGroup) notes++; });
  assert.equal(notes, 2, 'outgrew baby and toddler clothes');
});

test('identity and pronouns are saved, and any clothes can be worn', () => {
  lucky();
  const l = G.newLife({ name: 'Rowan', gender: 'nonbinary' });
  assert.equal(l.pronouns, 'they');
  assert.equal(G.pronoun(l), 'They');
  const look = JSON.parse(JSON.stringify(l.look));
  look.outfits.adult = Object.assign(look.outfits.adult, { top: 'blazer', bottom: 'party', shoes: 'boots' });
  assert.ok(G.run(l, 'setLook', look, 'Ro', 'girl', 'she').ok);
  assert.equal(l.name, 'Ro');
  assert.equal(l.gender, 'girl');
  assert.equal(l.pronouns, 'she');
  assert.equal(l.look.outfits.adult.bottom, 'party');
});

test('Change Your Look is free; special items must be bought in the shop first', () => {
  lucky();
  const l = G.newLife({ name: 'Max', age: 10 });
  l.coins = 1000;
  const look = JSON.parse(JSON.stringify(l.look));
  look.hair = 'afro'; look.skin = BAL.LOOKS.skins[4]; look.eyes = BAL.LOOKS.eyes[2]; look.hairColor = '#9B5DE5';
  look.accessory = 'sunhat';
  look.outfits.child = { top: 'hoodie', bottom: 'tutu', shoes: 'wellies', extra: 'scarf', topColor: '#69DB7C', bottomColor: '#F783AC', shoesColor: '#FFD43B', extraColor: '#FF6B6B' };
  const r = G.run(l, 'setLook', look);
  assert.ok(r.ok);
  assert.equal(r.coinsDelta, 0, 'free');
  assert.equal(l.coins, 1000);
  assert.equal(l.look.outfits.child.bottom, 'tutu');

  const cape = JSON.parse(JSON.stringify(l.look));
  cape.outfits.child.extra = 'cape';
  assert.equal(G.run(l, 'setLook', cape).ok, false, 'cape is locked');
  const crown = JSON.parse(JSON.stringify(l.look));
  crown.accessory = 'crown';
  assert.equal(G.run(l, 'setLook', crown).ok, false, 'crown is locked');

  assert.ok(G.run(l, 'buyItem', 'capeitem').ok);
  assert.equal(l.look.outfits.child.extra, 'cape', 'bought cape is worn straight away');
  assert.ok(G.run(l, 'setLook', cape).ok);
});

test('outfits that do not fit an age group fall back to that group\'s free defaults', () => {
  const look = { skin: '#FFE0C7', hair: 'bun', fav: '#FF6B6B', outfits: { baby: { top: 'blazer', bottom: 'jeans', shoes: 'heels', extra: 'stick' } } };
  const o = G.outfitFor(look, 'baby');
  assert.deepEqual([o.top, o.bottom, o.shoes, o.extra], ['bodysuit', 'babygrow', 'booties', 'none']);
});

test('old saves are upgraded: one life per player becomes a list of characters', () => {
  lucky();
  const old = G.newLife({ name: 'Old' });
  old.look = { skin: '#F6C9A0', hair: 'short', hairColor: '#5A3825', eyes: '#3B2314', outfit: '#FF6B6B', accessory: 'cap' };
  old.gender = 'any'; delete old.pronouns;
  const data = BAL.Store.migrate({ profiles: [{ id: 'p1', name: 'Kid', emoji: '🦄', color: '#000', life: old, hall: [] }], activeId: 'p1', sound: true });
  const p = data.profiles[0];
  assert.equal(p.life, undefined);
  assert.equal(p.chars.length, 1);
  assert.equal(p.activeCharId, old.id);
  const l = p.chars[0];
  assert.equal(l.gender, 'me');
  assert.equal(l.pronouns, 'they');
  assert.equal(l.look.fav, '#FF6B6B');
  assert.equal(l.look.outfits.child.topColor, '#FF6B6B');
  assert.equal(l.look.accessory, 'cap');
});

test('each player can keep several characters, each with their own saved life', () => {
  lucky();
  BAL.Store.data = { profiles: [], activeId: null, sound: false };
  const p = BAL.Store.addProfile('Sam', '🐸', '#69DB7C');
  BAL.Store.data.activeId = p.id;
  const a = BAL.Store.addChar(G.newLife({ name: 'Alpha' }));
  const b = BAL.Store.addChar(G.newLife({ name: 'Beta', age: 30 }));
  assert.equal(p.chars.length, 2);
  assert.equal(BAL.Store.activeChar().name, 'Beta');
  grow(b, 5);
  p.activeCharId = a.id;
  assert.equal(BAL.Store.activeChar().age, 0, 'Alpha\'s life is separate');
  assert.equal(b.age, 35);
  BAL.Store.removeChar(a.id);
  assert.equal(p.chars.length, 1);
  assert.equal(BAL.Store.activeChar(), null);
  const kid = G.makePerson('child', 4, 'girl', { name: 'Kiddo' });
  b.people.push(kid);
  BAL.Store.replaceChar(b.id, G.continueAsChild(b, kid.id));
  assert.equal(p.chars.length, 1);
  assert.equal(BAL.Store.activeChar().name, 'Kiddo');
});

test('every clothing item and accessory draws for every age group', () => {
  for (const g of BAL.AGE_GROUPS) {
    for (const slot of G.SLOTS) {
      for (const it of G.wardrobe(slot, g.id)) {
        const look = G.normalizeLook(G.randomLook());
        look.outfits[g.id][slot] = it.id;
        for (const full of [true, false]) {
          const svg = BAL.avatar(look, g.preview, 80, { full });
          assert.doesNotMatch(svg, /NaN|undefined|null/, `${g.id} ${slot} ${it.id}`);
        }
      }
    }
  }
  for (const acc of BAL.LOOKS.accessories) {
    const look = G.normalizeLook(G.randomLook());
    look.accessory = acc.id;
    assert.doesNotMatch(BAL.avatar(look, 30, 50, { full: true }), /NaN|undefined/);
  }
});

/* ---------------- Age progression & challenges ---------------- */

// Plays one year's challenges the way a child would, using only normal game actions.
function solveYear(l) {
  for (let guard = 0; guard < 400 && !G.canAgeUp(l); guard++) {
    const idx = l.goals.findIndex(g => !g.done);
    const g = l.goals[idx];
    const c = G.challenge(g.id);
    const t = c.track;
    if (l.energy <= 0) { assert.ok(G.run(l, 'rest').ok, 'can always rest when challenges remain'); continue; }
    const freeActs = G.activities(l).filter(a => !G.activityCost(l, a) || G.activityCost(l, a) <= l.coins);
    if (t.game === 'quiz') { const q = G.makeQuiz(t.kind, l.age); assert.ok(q.length >= 3); G.run(l, 'completeGame', idx, q.length, q.length); continue; }
    if (t.game === 'find') { const f = G.makeFind(t.kind); assert.ok(f.cells.length === 12 && f.targets.every(x => f.cells.includes(x))); G.run(l, 'completeGame', idx, f.targets.length, f.targets.length); continue; }
    if (t.chores) { l.chores.forEach((ch, i) => { if (!ch.done) G.run(l, 'chore', i); }); continue; }
    const acts = t.act ? (Array.isArray(t.act) ? t.act : [t.act]) : [];
    if (acts.includes('activity')) {
      const a = freeActs.find(x => t.ids.includes(x.id));
      assert.ok(a, `${c.id}: an affordable activity exists at age ${l.age}`);
      G.run(l, 'activity', a.id); continue;
    }
    if (acts.includes('makeFriend') && G.run(l, 'makeFriend').ok) continue;
    if (acts.includes('spendTime')) {
      const roles = t.roles || ['friend'];
      const p = l.people.find(x => roles.includes(x.role));
      assert.ok(p, `${c.id}: someone to spend time with`);
      G.run(l, 'spendTime', p.id); continue;
    }
    if (acts.includes('study')) { G.run(l, 'study'); continue; }
    if (acts.includes('joinClub')) { G.run(l, 'joinClub', BAL.CLUBS.find(x => !l.edu.clubs.includes(x.id)).id); continue; }
    if (acts.includes('partTime')) { G.run(l, 'partTime', 'paper'); continue; }
    if (acts.includes('travel')) { const m = G.townMap(G.currentTown(l)); const dest = m.places.find(p => p.id !== l.world.loc); G.run(l, 'travel', dest.id); continue; }
    if (acts.includes('talk')) {
      const m = G.townMap(G.currentTown(l));
      for (const p of m.places) { const ppl = G.placePeople(l, G.currentTown(l), p.id).filter(n => l.world.talked[n.id] !== l.age); if (ppl.length) { if (l.world.loc !== p.id) G.run(l, 'travel', p.id); G.run(l, 'talk', p.id, ppl[0].id); break; } }
      continue;
    }
    if (acts.includes('reply')) { const fam = l.people.find(p => G.convKind(l, p) !== 'friend' || p.role === 'friend'); assert.ok(fam, 'someone to chat to'); G.run(l, 'reply', fam.id, 0); continue; }
    if (acts.includes('feedChild')) { const k = G.kidsAtHome(l).find(p => p.kid.meals < 3); assert.ok(G.run(l, 'feedChild', k.id, 'toast').ok); continue; }
    if (acts.includes('helpHomework')) { const k = G.kidsAtHome(l).find(p => p.age >= 5 && p.kid.hw < 3); G.run(l, 'helpHomework', k.id, 3, 3); continue; }
    if (acts.includes('celebrateChild')) { const k = G.kidsAtHome(l).find(p => p.kid.bday); assert.ok(G.run(l, 'celebrateChild', k.id, 'cake').ok); continue; }
    if (acts.includes('celebrate')) { const o = G.occasions(l).find(x => !x.done && !x.child); const free = o.levels.find(v => G.occasionCost(l, v) <= l.coins); assert.ok(free, 'an affordable way to celebrate ' + o.id); G.run(l, 'celebrate', o.id, free); continue; }
    if (acts.includes('oddJob')) { G.run(l, 'oddJob', G.oddJobs(l)[0].id); continue; }
    if (acts.includes('payBack')) { if (!l.coins) G.run(l, 'oddJob', G.oddJobs(l)[0].id); else G.run(l, 'payBack'); continue; }
    if (acts.includes('workHard')) { G.run(l, 'workHard'); continue; }
    if (acts.includes('playPet')) { G.run(l, 'playPet', l.pets[0].id); continue; }
    // state challenges
    if (['ya_job', 'ad_findwork'].includes(c.id)) { G.run(l, 'applyJob', 'shop'); continue; }
    if (c.id === 'ya_moveout') { G.run(l, 'rentHome', 'tinyflat'); continue; }
    if (c.id === 'ya_licence') { G.run(l, 'drivingTest'); continue; }
    if (c.id === 'tn_graduate') { G.run(l, 'study'); continue; }
    // happiness / health: pick the free activity that helps most
    const best = freeActs.slice().sort((a, b) => ((b.fx.happy || 0) + (b.fx.health || 0)) - ((a.fx.happy || 0) + (a.fx.health || 0)))[0];
    G.run(l, 'activity', best.id);
  }
  assert.ok(G.canAgeUp(l), `stuck at age ${l.age}: ${JSON.stringify(l.goals)}`);
}

test('there are eight life stages', () => {
  assert.deepEqual(BAL.LIFE_STAGES.map(s => [s.id, s.min]), [['baby', 0], ['toddler', 3], ['child', 6], ['teen', 13], ['young', 18], ['adult', 30], ['older', 50], ['grand', 70]]);
  const ages = { 0: 'baby', 2: 'baby', 3: 'toddler', 5: 'toddler', 6: 'child', 12: 'child', 13: 'teen', 17: 'teen', 18: 'young', 29: 'young', 30: 'adult', 49: 'adult', 50: 'older', 69: 'older', 70: 'grand', 99: 'grand' };
  for (const [age, st] of Object.entries(ages)) assert.equal(G.stage(+age), st, 'age ' + age);
  for (const st of BAL.LIFE_STAGES) assert.ok(BAL.CHALLENGES.filter(c => c.stage === st.id).length >= 7, st.id + ' has plenty of challenges');
});

test('every year has 3 challenges and the birthday is locked until they are done', () => {
  lucky();
  const l = G.newLife({ name: 'Pip' });
  assert.equal(l.goals.length, 3);
  assert.ok(l.goals.every(g => G.challenge(g.id).stage === 'baby'));
  const rep = G.ageUp(l);
  assert.equal(rep.blocked, true);
  assert.equal(l.age, 0, 'no birthday yet');
  const coins = l.coins;
  solveYear(l);
  assert.ok(l.coins > coins, 'challenges give coins');
  assert.ok(l.totals.stars >= 4, 'and stars');
  assert.equal(G.ageUp(l).blocked, undefined);
  assert.equal(l.age, 1);
});

test('teens must pass exams and get ready to graduate at 17', () => {
  lucky();
  const l = G.newLife({ name: 'Tess', age: 16 });
  G.makeGoals(l);
  assert.ok(l.goals.some(g => g.id === 'tn_exam'));
  G.ageUp(l, { force: true });
  assert.equal(l.age, 17);
  assert.deepEqual(l.goals.slice(0, 2).map(g => g.id).sort(), ['tn_exam', 'tn_graduate']);
  const idx = l.goals.findIndex(g => g.id === 'tn_exam');
  assert.equal(G.run(l, 'completeGame', idx, 2, 4).ok, false, 'need 3 of 4 to pass');
  assert.ok(G.run(l, 'completeGame', idx, 3, 4).ok);
  assert.equal(G.run(l, 'swapGoal', l.goals.findIndex(g => g.id === 'tn_graduate')).ok, false, 'milestones cannot be swapped');
});

test('a challenge that becomes impossible is swapped for a new one', () => {
  lucky();
  const l = G.newLife({ name: 'Uma', age: 18 });
  l.goals = [{ id: 'ya_job', p: 0, n: 1, done: false }, { id: 'ya_skill', p: 0, n: 2, done: false }, { id: 'ya_money', p: 0, n: 1, done: false }];
  assert.ok(G.run(l, 'enrol', 'uni').ok);
  assert.ok(!l.goals.some(g => g.id === 'ya_job'), 'cannot look for a job while at university');
  assert.equal(l.goals.length, 3);
});

test('quizzes are kind and correct', () => {
  for (const kind of ['shapes', 'colours', 'counting', 'maths', 'spelling', 'facts', 'exam', 'money', 'bills', 'words']) {
    for (const age of [1, 4, 8, 11, 15, 25, 60]) {
      G.rng = Math.random;
      const q = G.makeQuiz(kind, age);
      assert.ok(q.length >= 3, kind);
      for (const x of q) {
        assert.ok(x.options.includes(x.answer), kind + ' answer is an option');
        assert.equal(new Set(x.options).size, x.options.length, kind + ' options are different: ' + x.options);
        assert.ok(x.options.length === 3, kind + ' has 3 options');
      }
    }
  }
  const m = G.makeQuiz('maths', 7)[0];
  assert.match(m.q, /What is \d+ [+−] \d+\?/);
});

test('whole lives can be played through every stage by completing challenges', () => {
  G.rng = Math.random;
  for (let n = 0; n < 4; n++) {
    const l = G.newLife({ name: 'Life' + n, townId: G.pick(BAL.TOWNS).id });
    const seen = new Set();
    while (!l.ended) {
      seen.add(G.stage(l.age));
      solveYear(l);
      if (l.age === 25 && !l.pets.length) { l.coins += 500; G.run(l, 'adoptPet', 'cat', 'Tom'); }
      if (l.age === 28) { l.coins += 5000; G.run(l, 'findLove', 'any'); const p = G.partner(l); if (p) G.run(l, 'haveBaby', 'Bo'); }
      const rep = G.ageUp(l);
      assert.ok(!rep.blocked);
      if (rep.choice === 'future') G.run(l, 'chooseFuture', G.pick(['uni', 'college', 'work', 'gap']));
      if (rep.event) G.run(l, 'resolveEvent', rep.event, 0);
    }
    assert.ok(l.age >= 80);
    assert.deepEqual([...seen].sort(), BAL.LIFE_STAGES.map(s => s.id).sort(), 'visited every stage');
    assert.ok(l.totals.challenges >= l.age * 3 - 3);
    assert.ok(l.achievements.includes('champion'));
  }
});

/* ---------------- Economy ---------------- */

function adult(age, extra) {
  lucky();
  const l = G.newLife(Object.assign({ name: 'Worker', age: age || 25 }, extra || {}));
  l.edu.level = 4; l.stats.smarts = 95; l.stats.fitness = 90;
  return l;
}

test('the jobs include the classic careers and every job has a key skill', () => {
  for (const id of ['doctor', 'teacher', 'police', 'chef', 'shop', 'hair', 'vet', 'builder']) assert.ok(G.byId(BAL.JOBS, id), id);
  assert.ok(BAL.JOBS.length >= 30);
  for (const j of BAL.JOBS) assert.ok(G.byId(BAL.SKILLS, j.skill), j.id + ' has a skill');
  assert.ok(BAL.BUSINESSES.length >= 5, 'business owner options');
});

test('players can have up to 3 jobs: a job, a business and side jobs', () => {
  const l = adult(25);
  const e0 = l.maxEnergy;
  l.skills.cooking = 60; l.coins = 10000;
  assert.ok(G.run(l, 'applyJob', 'chef').ok);
  assert.ok(G.run(l, 'startBusiness', 'bakery').ok);
  assert.ok(G.run(l, 'takeSideJob', 'tutor').ok);
  assert.equal(G.jobCount(l), 3);
  assert.equal(l.maxEnergy, Math.max(3, e0 - 3), 'each job uses some energy');
  assert.equal(G.run(l, 'takeSideJob', 'market').ok, false, 'a 4th job is too many');
  assert.ok(l.achievements.includes('multitasker'));
  const lines = G.payslip(l).map(x => x.t).join(' | ');
  assert.match(lines, /Salary/); assert.match(lines, /profit/); assert.match(lines, /Tutor/);
});

test('salaries, bonuses, mistakes and promotions', () => {
  const l = adult(30);
  l.skills.people = 0;
  assert.ok(G.run(l, 'applyJob', 'shop').ok);
  const base = G.salary(l);
  // a lucky roll gives an on-the-spot bonus
  lucky(); l.energy = 5;
  const before = l.coins;
  const r1 = G.run(l, 'workHard');
  assert.ok(l.coins > before, r1.msg);
  // an unlucky roll is a mistake that comes off the next pay
  unlucky(); l.energy = 5;
  const r2 = G.run(l, 'workHard');
  assert.ok(r2.mistake, r2.msg);
  assert.ok(l.job.deductions > 0);
  l.job.perf = 90;
  const slip = G.payslip(l);
  assert.ok(slip.some(x => x.bonus), 'performance bonus on payday');
  assert.ok(slip.some(x => x.v < 0), 'mistakes deducted');
  assert.ok(slip.find(x => x.v < 0).v >= -Math.round(base * 0.3), 'deductions are capped');
  lucky();
  grow(l, 1); l.job.perf = 95;
  assert.ok(G.run(l, 'askPromotion').ok);
  assert.ok(G.salary(l) > base);
});

test('you can be fired for a low work bar, and get jobseeker support', () => {
  const l = adult(30);
  assert.ok(G.run(l, 'applyJob', 'shop').ok);
  l.job.perf = 0;
  let rep = G.ageUp(l, { force: true });
  assert.ok(l.job, 'first a warning');
  assert.ok(rep.notes.some(n => /Warning/.test(n.t)));
  l.job.perf = 0;
  rep = G.ageUp(l, { force: true });
  assert.equal(l.job, null);
  assert.equal(rep.fired, 'Shop Assistant');
  assert.ok(G.yearlyMoney(l).some(m => /Jobseeker support/.test(m.t)));
});

test('learning skills unlocks jobs', () => {
  const l = adult(25);
  l.skills.science = 0;
  assert.equal(G.jobCheck(l, G.byId(BAL.JOBS, 'doctor')).ok, false);
  for (let i = 0; i < 9; i++) { l.energy = 5; const r = G.run(l, 'learnSkill', 'science'); assert.ok(r.ok, r.msg); }
  assert.ok(G.skillLevel(l, 'science') >= 3);
  assert.ok(G.jobCheck(l, G.byId(BAL.JOBS, 'doctor')).ok);
  l.coins = 0; l.energy = 5;
  assert.equal(G.run(l, 'learnSkill', 'tech', '1').ok, false, 'paid classes need coins');
  assert.ok(G.run(l, 'learnSkill', 'tech').ok, 'the library course is free');
});

test('a business earns profit, can grow and can be sold', () => {
  const l = adult(30);
  l.coins = 2000;
  assert.equal(G.run(l, 'startBusiness', 'toyshop').ok, false, 'need enough coins');
  l.coins = 50000;
  assert.ok(G.run(l, 'startBusiness', 'florist').ok);
  const p1 = G.bizProfitEstimate(l);
  assert.ok(p1 > 0);
  for (let i = 0; i < 3; i++) { l.energy = 5; G.run(l, 'workBusiness'); }
  assert.ok(G.bizProfitEstimate(l) > p1, 'effort helps');
  assert.ok(G.run(l, 'growBusiness').ok);
  assert.equal(l.business.level, 1);
  const coins = l.coins;
  grow(l, 1);
  assert.ok(l.business.lastProfit > 0);
  assert.ok(G.run(l, 'sellBusiness').ok);
  assert.equal(l.business, null);
  assert.ok(l.coins > coins);
});

test('groceries, furniture, decorations and birthday parties', () => {
  const l = adult(25);
  l.coins = 5000;
  assert.ok(G.run(l, 'buyGroceries', 'healthy').ok);
  assert.equal(G.run(l, 'buyGroceries', 'treat').ok, false, 'one food shop a year');
  assert.ok(!G.yearlyMoney(l).some(m => /Groceries/.test(m.t)), 'already paid');
  for (const id of ['sofa', 'rug', 'fairylights', 'bunting']) assert.ok(G.run(l, 'buyItem', id).ok, id);
  assert.equal(G.cosiness(l), 2);
  for (const id of ['p_cake', 'p_balloons', 'p_bags', 'p_games', 'p_castle']) assert.ok(G.run(l, 'buyItem', id).ok);
  assert.equal(G.run(l, 'buyItem', 'p_cake').ok, false, 'one cake per party');
  const rep = G.ageUp(l, { force: true });
  assert.equal(rep.party.length, 5);
  assert.ok(l.achievements.includes('party'));
  assert.equal(l.partyItems.length, 0);
  assert.ok(G.yearlyMoney(l).some(m => /Groceries: Budget Basket/.test(m.t)), 'a budget basket is paid if you do not shop');
  const kid = G.newLife({ name: 'Kid', age: 9 });
  assert.equal(G.run(kid, 'buyGroceries', 'budget').ok, false, 'families buy the food for children');
});

test('running out of coins is manageable and never a dead end', () => {
  const l = adult(25);
  l.coins = 0;
  l.home = { type: 'rent', id: 'rentcottage' };
  l.cars.push({ uid: 'c1', id: 'sports' });
  const rep = G.ageUp(l, { force: true });
  assert.ok(rep.moneyTrouble);
  assert.equal(l.coins, 0, 'coins never go below zero');
  assert.ok(l.owed > 0 && l.owed <= G.owedCap(l), 'money owed is capped');
  assert.ok(l.goals.some(g => G.challenge(g.id).money), 'a money rescue challenge appears');
  assert.ok(G.oddJobs(l).length > 0, 'there are always odd jobs');
  l.energy = 5;
  assert.ok(G.run(l, 'oddJob', 'fixing').ok);
  assert.ok(l.coins > 0);
  assert.ok(G.run(l, 'askFamily').ok || !G.canAskFamily(l));
  const owed = l.owed;
  assert.ok(G.run(l, 'payBack').ok);
  assert.ok(l.owed < owed);
  l.coins = l.owed;
  assert.ok(G.run(l, 'payBack').ok);
  assert.equal(l.owed, 0);
  assert.ok(l.achievements.includes('debt_free'));
  // many terrible years in a row still cannot break the game
  l.home = { type: 'rent', id: 'rentcottage' };
  for (let i = 0; i < 10; i++) { l.coins = 0; G.ageUp(l, { force: true }); assert.ok(l.coins >= 0 && l.owed <= G.owedCap(l)); }
});

test('children earn through chores, odd jobs and part-time jobs, and have no bills', () => {
  lucky();
  const kid = G.newLife({ name: 'Kit', age: 9 });
  assert.ok(G.yearlyMoney(kid).every(m => m.v >= 0), 'no bills for children');
  assert.ok(G.run(kid, 'oddJob', 'carwash').ok);
  assert.equal(G.run(kid, 'startBusiness', 'bakery').ok, false);
  const teen = G.newLife({ name: 'Tia', age: 15 });
  assert.ok(G.run(teen, 'takeSideJob', 'paper').ok);
  assert.ok(G.run(teen, 'takeSideJob', 'dogwalk').ok);
  assert.equal(G.run(teen, 'takeSideJob', 'babysit').ok, false, 'two part-time jobs alongside school');
  const c = teen.coins;
  assert.ok(G.run(teen, 'workShift', 'paper').ok);
  assert.ok(teen.coins > c);
});

test('older saves get the economy added', () => {
  lucky();
  const l = G.newLife({ name: 'Old', age: 15 });
  delete l.skills; delete l.sideJobs; delete l.owed; l.partTime = 'paper';
  G.ensureEconomy(l);
  assert.deepEqual(l.sideJobs.map(x => x.id), ['paper']);
  assert.equal(l.partTime, undefined);
  assert.equal(Object.keys(l.skills).length, BAL.SKILLS.length);
  assert.equal(l.owed, 0);
});

/* ---------------- The interactive world ---------------- */

test('there are towns, cities, villages, seaside towns and islands to live in', () => {
  const types = new Set(BAL.TOWNS.map(t => t.type));
  for (const ty of ['town', 'city', 'village', 'seaside', 'island']) assert.ok(types.has(ty), ty);
  lucky();
  const l = G.newLife({ name: 'Isla', townId: 'coral' });
  assert.equal(G.town(l).type, 'island');
});

test('every town has all the essential places, laid out on a map', () => {
  const needed = ['home', 'school', 'hospital', 'surgery', 'shops', 'supermarket', 'park', 'cafe', 'restaurant', 'shelter', 'work', 'salon'];
  for (const t of BAL.TOWNS) {
    const m = G.townMap(t.id);
    const ids = m.places.map(p => p.id);
    for (const id of needed) assert.ok(ids.includes(id), `${t.id} has ${id}`);
    assert.ok(ids.includes('station') || ids.includes('harbour'), t.id + ' can be travelled to');
    const cells = m.places.map(p => p.x + ',' + p.y).concat(m.decor.map(d => d.x + ',' + d.y));
    assert.equal(new Set(cells).size, cells.length, t.id + ' no two places share a spot');
    assert.deepEqual(G.townMap(t.id), m, 'the map stays the same every time');
    if (t.type === 'island') assert.ok(ids.includes('beach') && ids.includes('lighthouse'));
  }
});

test('characters travel between places, and transport costs make sense', () => {
  lucky();
  const l = G.newLife({ name: 'Wren', age: 25, townId: 'bubble' });
  l.coins = 100;
  assert.equal(l.world.loc, 'home');
  const r = G.run(l, 'travel', 'park', 'walk');
  assert.ok(r.ok);
  assert.equal(l.world.loc, 'park');
  assert.equal(G.run(l, 'travel', 'park').ok, false, 'already there');
  const c = l.coins;
  assert.ok(G.run(l, 'travel', 'cafe', 'bus').ok);
  assert.ok(l.coins < c, 'grown-ups pay the bus fare');
  assert.ok(!G.travelModes(l).some(m => m.id === 'car'), 'no car yet');
  const kid = G.newLife({ name: 'Kit', age: 8 });
  const kc = kid.coins;
  assert.ok(G.run(kid, 'travel', 'school', 'bus').ok);
  assert.equal(kid.coins, kc, 'buses are free for children');
});

test('objects and people are interactive', () => {
  lucky();
  const l = G.newLife({ name: 'Pip', age: 9, townId: 'pebble' });
  G.run(l, 'travel', 'park');
  const h = l.stats.happy;
  assert.ok(G.run(l, 'useObject', 'park', 'ducks').ok);
  assert.ok(l.stats.happy > h || h === 100);
  const h2 = l.stats.happy;
  const again = G.run(l, 'useObject', 'park', 'ducks');
  assert.ok(again.ok && /already/.test(again.msg) && l.stats.happy === h2, 'the boost works once a year');
  assert.equal(G.run(l, 'useObject', 'beach', 'shells').ok, false, 'you must be there');
  const ppl = G.placePeople(l, 'pebble', 'park');
  assert.ok(ppl.length >= 2);
  const t = G.run(l, 'talk', 'park', ppl[0].id);
  assert.ok(t.ok && t.line);
  const local = ppl.find(n => n.befriend);
  assert.ok(G.run(l, 'befriend', 'park', local.id).ok);
  const f = l.people.find(p => p.townsId === local.id);
  assert.equal(f.name, local.firstName, 'the same person becomes your friend');
  assert.equal(G.run(l, 'befriend', 'park', local.id).ok, false);
  assert.ok(G.placePeople(l, 'pebble', 'park').some(n => n.personId === f.id), 'friends hang out at the park');
  G.run(l, 'travel', 'surgery');
  assert.ok(G.placePeople(l, 'pebble', 'surgery').some(n => /^Dr /.test(n.name)), 'there is a doctor at the surgery');
});

test('day trips to other towns and islands, home again for the birthday', () => {
  lucky();
  const l = G.newLife({ name: 'Rio', age: 12, townId: 'maple' });
  l.coins = 200;
  G.run(l, 'travel', 'station');
  assert.ok(G.run(l, 'dayTrip', 'puffin').ok);
  assert.equal(G.currentTown(l), 'puffin');
  assert.equal(l.world.loc, 'harbour');
  assert.ok(l.achievements.includes('island'));
  assert.ok(G.run(l, 'travel', 'lighthouse').ok);
  assert.ok(G.run(l, 'useObject', 'lighthouse', 'telescope').ok);
  assert.ok(G.isVisiting(l));
  G.ageUp(l, { force: true });
  assert.equal(G.isVisiting(l), false);
  assert.equal(l.world.loc, 'home');
});

test('visiting every place earns the explorer sticker', () => {
  lucky();
  const l = G.newLife({ name: 'Ola', age: 10, townId: 'sunny' });
  for (const p of G.townMap('sunny').places) if (p.id !== l.world.loc) G.run(l, 'travel', p.id);
  G.run(l, 'travel', 'home');
  assert.ok(l.achievements.includes('explorer'));
});

/* ---------------- Family & relationships ---------------- */

test('a love story: dating, boyfriend or girlfriend, moving in, engaged, married', () => {
  lucky();
  const l = G.newLife({ name: 'Remy', age: 24 });
  l.coins = 5000;
  assert.ok(G.run(l, 'findLove', 'girl').ok);
  const p = G.partner(l);
  assert.equal(G.relLabel(p), 'Going on dates');
  assert.equal(G.loveStep(p), 0);
  p.close = 40;
  assert.equal(G.run(l, 'askOut', p.id).ok, false, 'get to know each other first');
  p.close = 80;
  assert.ok(G.run(l, 'askOut', p.id).ok);
  assert.equal(G.relLabel(p), 'Girlfriend');
  assert.ok(G.run(l, 'moveIn', p.id).ok);
  assert.equal(G.loveStep(p), 2);
  assert.ok(G.yearlyMoney(l).some(m => /chips in/.test(m.t)), 'a partner you live with helps with bills');
  assert.ok(G.run(l, 'propose', p.id).ok);
  assert.ok(G.run(l, 'wedding', p.id, 'small').ok);
  assert.equal(G.loveStep(p), 4);
  assert.equal(G.relLabel(p), 'Wife');
  const kid = G.newLife({ name: 'Kid', age: 15 });
  assert.equal(G.run(kid, 'findLove').ok, false, 'romance is for grown-ups');
});

test('buying a home together', () => {
  lucky();
  const l = G.newLife({ name: 'Jo', age: 30 });
  l.people.push(G.makePerson('spouse', 30, 'boy', { name: 'Sam', livesWith: true, savings: 100000 }));
  const price = G.price(l, G.byId(BAL.HOMES, 'family').price), deposit = Math.round(price * BAL.HOME_DEPOSIT);
  l.coins = Math.ceil(deposit / 2);
  const r = G.run(l, 'buyHome', 'family');
  assert.ok(r.ok, r.msg);
  assert.match(r.msg, /together/);
  assert.equal(l.coins, 0);
  assert.ok(l.achievements.includes('home_together'));
});

test('raising children: meals, homework, clothes, birthdays, doctor and time together', () => {
  lucky();
  const l = G.newLife({ name: 'Mo', age: 30 });
  l.coins = 2000;
  l.people.push(G.makePerson('spouse', 30, 'girl', { name: 'Ana', livesWith: true }));
  assert.ok(G.run(l, 'haveBaby', 'Ollie', 'boy').ok);
  const o = G.children(l)[0];
  assert.ok(o.kid, 'the baby has a care record');
  assert.equal(G.run(l, 'helpHomework', o.id, 3, 3).ok, false, 'babies have no homework');
  for (let i = 0; i < 6; i++) G.ageUp(l, { force: true });
  assert.equal(o.age, 6, 'children grow older');
  assert.ok(o.kid.bday, 'a birthday to celebrate');
  assert.ok(G.occasions(l).some(x => x.child === o.id));
  const smart = o.kid.smarts;
  l.coins = 5000;
  assert.ok(G.run(l, 'feedChild', o.id, 'healthy').ok);
  l.energy = 5;
  assert.ok(G.run(l, 'helpHomework', o.id, 3, 3).ok);
  assert.ok(o.kid.smarts > smart);
  assert.ok(G.run(l, 'buyChildClothes', o.id, 1).ok);
  assert.equal(o.kid.outgrown, false);
  assert.equal(o.look.outfits[G.ageGroup(6)].top, G.childOutfits(l, o.id).length && o.look.outfits.child.top);
  const close = o.close;
  assert.ok(G.run(l, 'celebrateChild', o.id, 'party').ok);
  assert.ok(o.close > close);
  assert.equal(G.run(l, 'celebrateChild', o.id, 'party').ok, false, 'one party a year');
  o.kid.sick = 'a sniffly cold';
  l.energy = 5;
  const doc = G.run(l, 'childDoctor', o.id);
  assert.ok(doc.ok && o.kid.sick === null && doc.coinsDelta === 0, 'free doctor for children');
  assert.ok(G.kidPlay(o).length >= 3);
  assert.ok(G.run(l, 'playWithChild', o.id, G.kidPlay(o)[0].id).ok);
  // never fed? nobody is harmed — just a gentle note
  const rep = G.ageUp(l, { force: true });
  assert.ok(rep.notes.some(n => /birthday this year/.test(n.t)));
  const r2 = G.ageUp(l, { force: true });
  assert.ok(r2.notes.some(n => /sandwiches/.test(n.t)));
  // grow up
  for (let i = 0; i < 12; i++) G.ageUp(l, { force: true });
  assert.ok(o.age >= 18 && !o.kid && o.grownJob);
  assert.ok(l.achievements.includes('raised'));
});

test('family occasions always have a free way to celebrate', () => {
  lucky();
  const l = G.newLife({ name: 'Bea', age: 40 });
  l.coins = 0;
  l.people.push(G.makePerson('spouse', 40, 'boy', { name: 'Bo' }));
  l.flags.weddingAge = 35;
  const occ = G.occasions(l);
  assert.ok(occ.some(o => o.id === 'anniv') && occ.some(o => o.id === 'dayout') && occ.some(o => o.id === 'winter'));
  for (const o of occ.filter(x => !x.child)) {
    const free = o.levels.find(v => G.occasionCost(l, v) === 0);
    assert.ok(free, o.id);
    assert.ok(G.run(l, 'celebrate', o.id, free).ok);
  }
  assert.ok(G.occasions(l).filter(x => !x.child).every(o => o.done));
  const kid = G.newLife({ name: 'Ty', age: 8 });
  assert.ok(G.occasions(kid).some(o => o.kid), 'children can make cards for family birthdays');
});

test('family conversations are two-way and suitable for children', () => {
  lucky();
  const kid = G.newLife({ name: 'Lu', age: 8 });
  const mum = kid.people.find(p => ['mum', 'dad', 'parent'].includes(p.role));
  const cv = G.conversation(kid, mum.id);
  assert.ok(cv.q && cv.r.length >= 2);
  const c = mum.close;
  assert.ok(G.run(kid, 'reply', mum.id, 0).ok);
  assert.ok(mum.close >= c);
  const banned = /\b(kiss\w*|sexy|beer|wine|drunk|alcohol|gambl\w*|bet|hate|stupid|shut up)\b/i;
  for (const [kind, list] of Object.entries(BAL.CONVERSATIONS)) {
    assert.ok(list.length >= 2, kind);
    for (const c2 of list) {
      assert.doesNotMatch(c2.q, banned, kind);
      for (const r of c2.r) { assert.doesNotMatch(r.t + ' ' + r.m, banned, kind); }
    }
  }
});
