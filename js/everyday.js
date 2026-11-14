/* Build a Life — everyday life.
   Each year has four days (one per season). Every day runs Morning → Daytime → Evening → Night with
   tasks: brushing teeth, washing / showers, meals, school or work, shopping, the doctor, cleaning the
   house, paying bills, taxes (grown-ups with an income), looking after the family and pets — and sleep.
   New needs: hygiene and tummy (food), alongside health, happiness and energy.
   Looking after yourself and your family earns small rewards, Super Day stars and stickers.
   Nothing here can make the game impossible: needs only ever cause gentle reminders. */
(function (BAL) {
  'use strict';
  var G = BAL.Game, A = G.actions;
  var byId = G.byId, fmt = G.fmt, clamp = G.clamp, pick = G.pick, randInt = G.randInt;
  function ok(msg, emoji, extra) { return Object.assign({ ok: true, msg: msg, emoji: emoji || '✨' }, extra || {}); }
  function no(msg, emoji) { return { ok: false, msg: msg, emoji: emoji || '🙈' }; }

  BAL.DAYS = [{ name: 'Spring day', emoji: '🌷' }, { name: 'Summer day', emoji: '☀️' }, { name: 'Autumn day', emoji: '🍂' }, { name: 'Winter day', emoji: '❄️' }];
  BAL.PHASES = [{ id: 'morning', name: 'Morning', emoji: '🌅' }, { id: 'day', name: 'Daytime', emoji: '🏙️' }, { id: 'evening', name: 'Evening', emoji: '🌆' }, { id: 'night', name: 'Night', emoji: '🌙' }];
  BAL.NEEDS = [{ id: 'energy', name: 'Energy', emoji: '⚡', color: '#FFD43B' }, { id: 'hygiene', name: 'Hygiene', emoji: '🧼', color: '#4DABF7' }, { id: 'food', name: 'Tummy', emoji: '🥣', color: '#69DB7C' }];

  G.ensureDay = function (l) {
    if (!l.needs) l.needs = { hygiene: 80, food: 70 };
    if (!l.day || l.day.age !== l.age) l.day = { age: l.age, n: 0, done: {}, super: 0, paid: {}, filed: false };
    if (!l.day.paid) l.day.paid = {};
    return l.day;
  };
  G.needValue = function (l, id) { if (id === 'energy') return l.maxEnergy ? Math.round(l.energy / l.maxEnergy * 100) : 0; return (l.needs || {})[id] || 0; };
  function need(l, id, d) { G.ensureDay(l); l.needs[id] = clamp(l.needs[id] + d); }
  G.daysLeft = function (l) { return BAL.DAYS.length - G.ensureDay(l).n; };

  /* ===================== Meals ===================== */
  BAL.FOOD_GROUPS = [
    { id: 'veg', name: 'Fruit & veg', emoji: '🥦', items: [['🥦', 'Broccoli'], ['🥕', 'Carrots'], ['🍎', 'Apple'], ['🍌', 'Banana'], ['🍅', 'Tomatoes'], ['🫐', 'Berries']] },
    { id: 'protein', name: 'Protein', emoji: '🍗', items: [['🍗', 'Chicken'], ['🥚', 'Eggs'], ['🐟', 'Fish'], ['🫘', 'Beans'], ['🧀', 'Cheese'], ['🥜', 'Nuts']] },
    { id: 'carbs', name: 'Energy food', emoji: '🍞', items: [['🍞', 'Bread'], ['🍝', 'Pasta'], ['🍚', 'Rice'], ['🥔', 'Potatoes'], ['🥣', 'Cereal'], ['🫓', 'Wrap']] },
    { id: 'drink', name: 'Drink', emoji: '💧', items: [['💧', 'Water'], ['🥛', 'Milk'], ['🧃', 'Juice']] },
    { id: 'treat', name: 'Treat (optional)', emoji: '🍰', items: [['🍰', 'Cake'], ['🍪', 'Cookie'], ['🍦', 'Ice cream'], ['🍫', 'Chocolate']], optional: true }
  ];
  // items: { veg, protein, carbs, drink, treat } (emoji strings). A balanced plate has the first four.
  G.mealScore = function (items) {
    items = items || {};
    var groups = ['veg', 'protein', 'carbs', 'drink'].filter(function (g) { return items[g]; }).length;
    return { groups: groups, balanced: groups === 4, treat: !!items.treat };
  };
  function eat(l, items) {
    var sc = G.mealScore(items);
    need(l, 'food', 25 + sc.groups * 12);
    var fx = { health: sc.groups >= 3 ? 2 : 0, happy: 1 + (sc.treat ? 3 : 0) };
    if (sc.balanced) { fx.health += 2; l.totals.balancedMeals = (l.totals.balancedMeals || 0) + 1; if (l.totals.balancedMeals >= 5) G.unlock(l, 'healthy_eater'); }
    if (sc.treat && !sc.balanced) fx.health -= 1;
    G.applyFx(l, fx);
    if (l.age >= 3) G.addSkill(l, 'cooking', 1);
    return sc.balanced ? 'A perfectly balanced plate! Your body says thank you. 🌟' : sc.groups >= 2 ? 'Yum! Next time try a bit of every food group for a balanced plate.' : 'That filled a gap! A balanced plate has fruit & veg, protein, energy food and a drink.';
  }

  /* ===================== School & work moments ===================== */
  var SCHOOL_MOMENTS = [
    { q: 'Your teacher asks a tricky question.', r: [['✋ Put your hand up!', { smarts: 3 }, 6, 'You got it right! Gold star ⭐'], ['🤔 Have a think first', { smarts: 2 }, 4, 'Good thinking — you worked it out!']] },
    { q: 'It\'s break time!', r: [['⚽ Play football', { fitness: 3, happy: 2 }, 2, 'You scored a goal!'], ['🧑‍🤝‍🧑 Chat with friends', { happy: 3 }, 2, 'So many giggles!'], ['📚 Read in the library', { smarts: 2 }, 3, 'A great book about space.']] },
    { q: 'A classmate is struggling with their work.', r: [['🤝 Offer to help', { happy: 3, smarts: 1 }, 4, 'They said thank you — that felt good!'], ['🙋 Ask the teacher to help them', { happy: 2 }, 3, 'The teacher said that was kind of you.']] },
    { q: 'It\'s art class!', r: [['🎨 Paint a rainbow', { happy: 3 }, 3, 'It went on the classroom wall!'], ['🧩 Make a model', { smarts: 2, happy: 1 }, 3, 'A wobbly but wonderful rocket!']] },
    { q: 'Science lesson: experiment time!', r: [['🧪 Mix the potions carefully', { smarts: 3 }, 5, 'It fizzed perfectly!'], ['🔍 Take careful notes', { smarts: 2 }, 5, 'Your teacher loved your notes.']] }
  ];
  var WORK_MOMENTS = [
    { q: 'A busy day at work!', r: [['💪 Get stuck in', { happy: 1 }, 15, 'You got loads done!'], ['🤝 Help a teammate', { happy: 3 }, 10, 'Teamwork makes the dream work!']] },
    { q: 'There\'s a team meeting.', r: [['💡 Share an idea', { smarts: 2 }, 14, 'Your boss loved it!'], ['📝 Take notes', { smarts: 1 }, 10, 'Very organised!']] },
    { q: 'A customer has a question.', r: [['😊 Help them kindly', { happy: 2 }, 12, 'They left a 5-star review!'], ['📚 Look up the answer', { smarts: 2 }, 10, 'You found exactly the right answer.']] },
    { q: 'Lunch break!', r: [['🥗 Healthy lunch & a walk', { health: 2, fitness: 1 }, 8, 'You feel refreshed for the afternoon.'], ['☕ Coffee with colleagues', { happy: 3 }, 8, 'A good laugh with the team.']] }
  ];
  G.moment = function (l, kind) { var list = kind === 'work' ? WORK_MOMENTS : SCHOOL_MOMENTS; return list[(G.ensureDay(l).n + l.age) % list.length]; };

  /* ===================== The tasks ===================== */
  function kidsUnder(l, age) { return l.people.filter(function (p) { return p.role === 'child' && p.age < age; }); }
  function inSchool(l) { var s = G.school(l); return s && s.kind !== 'course' ? s : null; }
  function independent(l) { return l.age >= 18 && l.home.type !== 'family'; }
  G.unpaidBills = function (l) {
    G.ensureDay(l);
    return G.yearlyMoney(l).filter(function (m) { return m.v < 0 && !m.paidEarly; });
  };
  // kind: game (tap mini-game), meal, moment, tab (opens a part of the game), auto (just tap), bills, taxes, sleep
  G.TASKS = [
    { id: 'milk', phase: 'morning', name: 'Morning milk', emoji: '🍼', kind: 'auto', core: true, when: function (l) { return l.age < 3; }, food: 50, fx: { happy: 2 }, msg: 'Glug glug glug… burp! 🍼' },
    { id: 'brushAM', phase: 'morning', name: 'Brush your teeth', emoji: '🪥', kind: 'game', game: 'teeth', core: true, when: function (l) { return l.age >= 3; } },
    { id: 'bath', phase: 'morning', name: 'Bath time', emoji: '🛁', kind: 'game', game: 'bubbles', core: true, when: function (l) { return l.age < 3; } },
    { id: 'wash', phase: 'morning', name: 'Wash face & hands', emoji: '🧼', kind: 'game', game: 'bubbles', core: true, when: function (l) { return l.age >= 3 && l.age < 11; } },
    { id: 'shower', phase: 'morning', name: 'Take a shower', emoji: '🚿', kind: 'game', game: 'shower', core: true, when: function (l) { return l.age >= 11; } },
    { id: 'breakfast', phase: 'morning', name: 'Eat breakfast', emoji: '🥣', kind: 'meal', core: true, when: function (l) { return l.age >= 3; } },
    { id: 'kidsReady', phase: 'morning', name: 'Get the children ready', emoji: '🎒', kind: 'auto', when: function (l) { return l.age >= 18 && kidsUnder(l, 12).length > 0; }, msg: 'Teeth brushed, bags packed, shoes on the right feet. Off we go! 🎒' },
    { id: 'feedPets', phase: 'morning', name: 'Feed the pets', emoji: '🐾', kind: 'auto', when: function (l) { return l.age >= 5 && l.pets.length > 0; }, msg: 'Breakfast for everyone with fur, feathers or fins! 🐾' },
    { id: 'play', phase: 'day', name: 'Playtime', emoji: '🧸', kind: 'auto', core: true, when: function (l) { return l.age < 3; }, fx: { happy: 4, smarts: 1 }, msg: 'Peekaboo! Building blocks! What a fun morning.' },
    { id: 'school', phase: 'day', name: 'Go to school', emoji: '🏫', kind: 'moment', moment: 'school', core: true, when: function (l) { return !!inSchool(l); } },
    { id: 'study', phase: 'day', name: 'Go to classes', emoji: '🎓', kind: 'moment', moment: 'school', core: true, when: function (l) { return !!l.edu.course; } },
    { id: 'work', phase: 'day', name: 'Go to work', emoji: '💼', kind: 'moment', moment: 'work', core: true, when: function (l) { return !!(l.job || l.business) && !l.edu.course; } },
    { id: 'jobhunt', phase: 'day', name: 'Look for work', emoji: '🔍', kind: 'tab', tab: 'school', core: true, when: function (l) { return l.age >= 18 && !l.job && !l.business && !l.edu.course && !l.retired && l.age < 67; }, by: ['applyJob', 'takeSideJob', 'oddJob', 'startBusiness'] },
    { id: 'hobby', phase: 'day', name: 'Hobby time', emoji: '🌷', kind: 'auto', core: true, when: function (l) { return (l.retired || l.age >= 67) && !l.job && !l.business; }, fx: { happy: 3, health: 1 }, msg: 'A lovely day of gardening, puzzles and a cup of tea. 🌷' },
    { id: 'shopping', phase: 'day', name: 'Go shopping', emoji: '🛒', kind: 'tab', tab: 'shop', when: function (l) { return l.age >= 6; }, by: ['buyItem', 'buyGroceries', 'buyPetToy', 'buyPetBed'] },
    { id: 'doctor', phase: 'day', name: 'See the doctor', emoji: '🩺', kind: 'tab', tab: 'health', when: function (l) { return !!l.sick || l.stats.health < 50; }, by: ['clinic'] },
    { id: 'dinner', phase: 'evening', name: 'Have dinner', emoji: '🍝', kind: 'meal', core: true, when: function (l) { return l.age >= 3; } },
    { id: 'bottle', phase: 'evening', name: 'Evening milk', emoji: '🍼', kind: 'auto', core: true, when: function (l) { return l.age < 3; }, food: 50, fx: { happy: 2 }, msg: 'A warm bottle of milk and a big cuddle.' },
    { id: 'tidy', phase: 'evening', name: 'Tidy your room', emoji: '🧸', kind: 'game', game: 'tidy', when: function (l) { return l.age >= 3 && !independent(l); } },
    { id: 'clean', phase: 'evening', name: 'Clean the house', emoji: '🧽', kind: 'game', game: 'clean', core: true, when: independent },
    { id: 'homework', phase: 'evening', name: 'Do your homework', emoji: '✏️', kind: 'auto', when: function (l) { var s = inSchool(l); return s && s.kind !== 'nursery'; }, fx: { smarts: 3 }, msg: 'Homework done and packed in your bag! ✏️' },
    { id: 'bills', phase: 'evening', name: 'Pay the bills', emoji: '🧾', kind: 'bills', when: function (l) { return independent(l) && G.unpaidBills(l).length > 0; } },
    { id: 'taxes', phase: 'evening', name: 'Do your tax return', emoji: '📊', kind: 'taxes', when: function (l) { return G.taxableIncome(l) > G.taxAllowance(l) && !G.ensureDay(l).filed; } },
    { id: 'familyTime', phase: 'evening', name: 'Family time', emoji: '👨‍👩‍👧', kind: 'auto', when: function (l) { return l.people.some(function (p) { return ['mum', 'dad', 'parent', 'spouse', 'partner', 'child', 'sibling'].indexOf(p.role) >= 0 && (p.role !== 'child' || p.age < 18); }); }, msg: 'Board games, chatting and lots of laughing together. 💛' },
    { id: 'brushPM', phase: 'night', name: 'Brush your teeth', emoji: '🪥', kind: 'game', game: 'teeth', core: true, when: function (l) { return l.age >= 3; } },
    { id: 'stories', phase: 'night', name: 'Bedtime stories', emoji: '📖', kind: 'auto', when: function (l) { return l.age >= 18 && kidsUnder(l, 10).length > 0; }, msg: 'Once upon a time… everyone was asleep by the end! 📖' },
    { id: 'lullaby', phase: 'night', name: 'Lullaby', emoji: '🎵', kind: 'auto', when: function (l) { return l.age < 3; }, fx: { happy: 2 }, msg: 'Twinkle twinkle little star… 🌟' }
  ];
  G.task = function (id) { return byId(G.TASKS, id); };
  G.routine = function (l) {
    var d = G.ensureDay(l);
    return G.TASKS.filter(function (t) { return t.when(l) || d.done[t.id]; }).map(function (t) { return { task: t, done: !!d.done[t.id] }; });
  };
  G.coreLeft = function (l) { return G.routine(l).filter(function (x) { return x.task.core && !x.done; }).length; };

  function finish(l, t) {
    var d = G.ensureDay(l);
    d.done[t.id] = true;
    l.totals.tasks = (l.totals.tasks || 0) + 1;
  }
  // data: game → { score, total }, meal → { items }, moment → { choice }
  A.doTask = function (l, id, data) {
    var t = G.task(id), d = G.ensureDay(l);
    if (!t || !t.when(l)) return no('That isn\'t on today\'s list.');
    if (d.done[id]) return no('Already done today! ✅', '✅');
    if (G.daysLeft(l) <= 0) return no('You\'ve had all your days this year — it\'s nearly your birthday! 🎂', '🎂');
    data = data || {};
    var msg = t.msg || '', emoji = t.emoji;
    if (t.kind === 'game') {
      if ((data.score || 0) < (data.total || 1)) return no('Nearly! Finish the game to complete it.', '🤏');
      if (t.game === 'teeth') { need(l, 'hygiene', 10); G.applyFx(l, { health: 2 }); msg = 'Sparkling teeth! Two minutes, top and bottom. 🦷✨'; l.totals.brushes = (l.totals.brushes || 0) + 1; if (l.totals.brushes >= 20) G.unlock(l, 'sparkly'); }
      if (t.game === 'bubbles' || t.game === 'shower') { l.needs.hygiene = 100; G.applyFx(l, { happy: 1, health: 1 }); msg = t.game === 'shower' ? 'Squeaky clean and smelling lovely! 🚿' : 'All the mucky bits are gone! 🫧'; l.totals.washes = (l.totals.washes || 0) + 1; if (l.totals.washes >= 10) G.unlock(l, 'squeaky'); }
      if (t.game === 'tidy' || t.game === 'clean') {
        G.applyFx(l, { happy: 2 });
        l.people.forEach(function (p) { if (['mum', 'dad', 'parent', 'spouse', 'partner'].indexOf(p.role) >= 0) p.close = clamp(p.close + 2); });
        l.home.tidyYear = l.age;
        G.addSkill(l, 'building', 1);
        msg = t.game === 'clean' ? 'The house is spotless! Everything is in its place. 🧽✨' : 'Your room looks brilliant — and you found a lost sock! 🧦';
        l.totals.cleans = (l.totals.cleans || 0) + 1; if (l.totals.cleans >= 10) G.unlock(l, 'tidy_star');
        if (t.id === 'tidy') { var undone = l.chores.find(function (c) { return !c.done && /tidy|bedroom|room|toys/i.test(c.t); }); if (undone) undone.done = true; }
      }
    } else if (t.kind === 'meal') {
      msg = eat(l, data.items);
      if (id === 'dinner') {
        var kids = l.people.filter(function (p) { return p.role === 'child' && p.age < 18 && p.kid; });
        if (l.age >= 18 && kids.length) { kids.forEach(function (k) { if (k.kid.meals < 3) { k.kid.meals += 1; k.kid.health = clamp(k.kid.health + (G.mealScore(data.items).balanced ? 4 : 2)); } k.close = clamp(k.close + 2); }); msg += ' The whole family ate together. 💛'; }
      }
    } else if (t.kind === 'moment') {
      var mo = G.moment(l, t.moment), r = mo.r[data.choice || 0] || mo.r[0];
      G.applyFx(l, r[1]);
      if (t.moment === 'work') { if (l.job) l.job.perf = clamp(l.job.perf + r[2]); if (l.business) l.business.effort = clamp(l.business.effort + r[2]); }
      else l.edu.grade = clamp(l.edu.grade + r[2]);
      msg = r[3];
    } else if (t.kind === 'auto') {
      if (t.food) need(l, 'food', t.food);
      if (t.fx) G.applyFx(l, t.fx);
      if (id === 'kidsReady') kidsUnder(l, 12).forEach(function (k) { k.close = clamp(k.close + 3); if (k.kid) k.kid.happy = clamp(k.kid.happy + 3); });
      if (id === 'stories') kidsUnder(l, 10).forEach(function (k) { k.close = clamp(k.close + 4); if (k.kid) k.kid.smarts = clamp(k.kid.smarts + 2); });
      if (id === 'feedPets') l.pets.forEach(function (p) { if (p.full !== undefined) p.full = clamp(p.full + 40); p.love = clamp(p.love + 2); });
      if (id === 'familyTime') { l.people.forEach(function (p) { if (['mum', 'dad', 'parent', 'spouse', 'partner', 'child', 'sibling'].indexOf(p.role) >= 0) p.close = clamp(p.close + 2); }); G.applyFx(l, { happy: 3 }); }
      if (id === 'homework') { l.edu.grade = clamp(l.edu.grade + 4); var hw = l.chores.find(function (c) { return !c.done && /homework/i.test(c.t); }); if (hw) hw.done = true; }
      if (['kidsReady', 'stories', 'feedPets', 'familyTime'].indexOf(id) >= 0) { l.totals.familyCare = (l.totals.familyCare || 0) + 1; if (l.totals.familyCare >= 15) G.unlock(l, 'family_carer'); }
    } else if (t.kind === 'bills') {
      if (G.unpaidBills(l).length) return no('There are still bills to pay — tap Pay on each one!', '🧾');
    } else if (t.kind === 'taxes') {
      return no('Fill in your tax return first!', '📊');
    } else if (t.kind === 'tab') {
      return no('Do this in the ' + t.tab + ' tab!', t.emoji);
    }
    finish(l, t);
    return ok(msg, emoji, { task: id });
  };

  // Tasks that are completed by doing the real thing elsewhere (shopping, the doctor, job hunting…)
  var run = G.run;
  G.run = function (l, name) {
    var e0 = l.energy;
    // which "go and do it" tasks are due right now (checked before, as doing them can change that — e.g. the doctor cures you)
    var due = l.ended ? [] : G.TASKS.filter(function (t) { return t.by && t.by.indexOf(name) >= 0 && t.when(l); });
    var res = run.apply(null, arguments);
    if (!res || !res.ok || l.ended) return res;
    var d = G.ensureDay(l);
    due.forEach(function (t) {
      if (!d.done[t.id] && G.daysLeft(l) > 0) { finish(l, t); res.taskDone = (res.taskDone || []).concat([t.id]); }
    });
    // Busy days use up hygiene and tummy (gently). Babies are looked after by their family.
    var used = Math.max(0, e0 - l.energy);
    if (used && l.age >= 3) {
      need(l, 'hygiene', -4 * used); need(l, 'food', -7 * used);
      var nag = [];
      if (l.needs.food < 20) nag.push('your tummy is rumbling — time to eat! 🥣');
      if (l.needs.hygiene < 20) nag.push('you\'re a bit pongy — time for a wash! 🚿');
      if (nag.length) { G.applyFx(l, { happy: -1 }); res.msg += ' (Psst: ' + nag.join(' And ') + ')'; }
    }
    return res;
  };

  /* ===================== Sleep: the end of a day ===================== */
  A.sleep = function (l) {
    var d = G.ensureDay(l);
    if (G.daysLeft(l) <= 0) return no('You\'ve had all four days this year. Press Age Up for your birthday! 🎂', '🎂');
    var tasks = G.routine(l);
    var core = tasks.filter(function (x) { return x.task.core; });
    var coreDone = core.filter(function (x) { return x.done; }).length;
    var extra = tasks.filter(function (x) { return !x.task.core && x.done; }).length;
    var superDay = coreDone === core.length;
    var summary = { day: BAL.DAYS[d.n], coreDone: coreDone, core: core.length, extra: extra, superDay: superDay };
    if (superDay) {
      d.super += 1;
      l.totals.superDays = (l.totals.superDays || 0) + 1;
      l.totals.stars = (l.totals.stars || 0) + 1;
      G.applyFx(l, { happy: 3, health: 2 });
      if (l.totals.superDays >= 10) G.unlock(l, 'routine_star');
    }
    if (extra >= 3) G.applyFx(l, { happy: 2 });
    // overnight
    G.applyFx(l, { health: 1 });
    l.needs.food = clamp(l.needs.food - 30); l.needs.hygiene = clamp(l.needs.hygiene - 25);
    l.energy = l.maxEnergy;
    d.n += 1; d.done = {};
    summary.last = d.n >= BAL.DAYS.length;
    return ok(superDay ? 'SUPER DAY! You looked after yourself brilliantly. ⭐ Zzz…' : 'Night night! Zzz… You did ' + coreDone + ' of ' + core.length + ' important things today.', '😴', { summary: summary, celebrate: superDay });
  };

  /* ===================== Bills & taxes ===================== */
  G.taxAllowance = function (l) { return Math.round(12000 * G.town(l).pay); };
  G.taxableIncome = function (l) {
    if (l.age < 18) return 0;
    var lines = (G.payslip ? G.payslip(l) : []);
    return lines.reduce(function (s, m) { return s + (m.v > 0 ? m.v : 0); }, 0);
  };
  G.incomeTax = function (l) { return Math.round(Math.max(0, G.taxableIncome(l) - G.taxAllowance(l)) * 0.2); };
  function billKey(m) { return m.t.replace(/ \(paid early ✓\)$/, ''); }
  var yearlyMoney = G.yearlyMoney;
  G.yearlyMoney = function (l) {
    var lines = yearlyMoney(l);
    G.ensureDay(l);
    var tax = G.incomeTax(l);
    if (tax > 0) lines.push({ e: '🏛️', t: 'Income tax (pays for schools, hospitals & roads)', v: -tax, tax: true });
    if (l.age >= 18 && l.home.type !== 'family') lines.push({ e: '🏘️', t: 'Council tax (bins, parks & libraries)', v: -G.price(l, 250), tax: true });
    return lines.map(function (m) {
      var k = billKey(m);
      if (m.v < 0 && l.day.paid[k] !== undefined) return Object.assign({}, m, { t: k + ' (paid early ✓)', v: 0, paidEarly: true });
      return m;
    });
  };
  A.payBill = function (l, key) {
    var m = G.unpaidBills(l).find(function (x) { return billKey(x) === key; });
    if (!m) return no('That bill is already paid! ✅', '✅');
    var amt = -m.v;
    if (l.coins < amt) return no('You need ' + fmt(amt) + ' coins to pay this now. (Don\'t worry — anything unpaid is taken on your birthday.)', '🪙');
    G._addCoins(l, -amt);
    l.day.paid[key] = amt;
    if (m.loan && l.home.type === 'own') l.home.owed = Math.max(0, l.home.owed - amt);
    G.applyFx(l, { happy: 1 });
    G.addSkill(l, 'numbers', 1);
    var left = G.unpaidBills(l).length;
    var res = ok('Paid: ' + key + ' (' + fmt(amt) + ' coins). ' + (left ? left + ' to go!' : 'All bills paid early — you\'re a Bill Boss! 🏆'), '🧾');
    if (!left) {
      G.applyFx(l, { happy: 4 });
      l.totals.stars = (l.totals.stars || 0) + 1;
      G.unlock(l, 'bill_boss');
      var d = G.ensureDay(l);
      if (!d.done.bills && G.daysLeft(l) > 0) { d.done.bills = true; res.taskDone = ['bills']; }
      res.celebrate = true;
    }
    return res;
  };
  // A simple, friendly tax return using the player's own numbers.
  G.taxQuiz = function (l) {
    var inc = G.taxableIncome(l), allow = G.taxAllowance(l), taxable = Math.max(0, inc - allow);
    function opts(ans, a, b) { var o = [String(ans), String(a), String(b)]; for (var i = o.length - 1; i > 0; i--) { var j = Math.floor(G.rng() * (i + 1)); var t = o[i]; o[i] = o[j]; o[j] = t; } return o; }
    var r = function (n) { return Math.round(n / 10) * 10; };
    return [
      { q: 'You earned ' + fmt(inc) + ' coins this year. Is that more or less than the tax-free amount of ' + fmt(allow) + '?', answer: inc > allow ? 'More' : 'Less', options: opts(inc > allow ? 'More' : 'Less', inc > allow ? 'Less' : 'More', 'The same') },
      { q: 'Only coins above ' + fmt(allow) + ' are taxed. How many of your coins are taxed?', answer: fmt(taxable), options: opts(fmt(taxable), fmt(r(inc)), fmt(r(taxable / 2))) },
      { q: 'What do taxes help to pay for?', answer: 'Schools, hospitals & parks', options: opts('Schools, hospitals & parks', 'Only sweets', 'Nothing at all') }
    ];
  };
  A.fileTaxes = function (l, score, total) {
    var d = G.ensureDay(l);
    if (d.filed) return no('You\'ve already done your tax return this year! ✅');
    if (G.taxableIncome(l) <= G.taxAllowance(l)) return no('Your income is under the tax-free amount — no tax return needed! 🎉');
    if ((score || 0) < 2) return no('Not quite — have another go at your tax return!', '📊');
    d.filed = true;
    G.applyFx(l, { happy: 2, smarts: 2 });
    G.addSkill(l, 'numbers', 2);
    var msg = 'Tax return done! Your taxes help pay for schools, hospitals and parks. 🏛️';
    if (score >= total) { var refund = Math.round(G.incomeTax(l) * 0.05); if (refund) { G._addCoins(l, refund); msg += ' Every answer right — you spotted a small overpayment and got a refund of ' + fmt(refund) + ' coins! 🎉'; } G.unlock(l, 'tax_star'); }
    var res = ok(msg, '📊', { celebrate: score >= total });
    if (G.daysLeft(l) > 0) { d.done.taxes = true; res.taskDone = ['taxes']; }
    return res;
  };

  /* ===================== A new year ===================== */
  var ageUp = G.ageUp;
  G.ageUp = function (l, o) {
    var d = G.ensureDay(l), needs = Object.assign({}, l.needs), supers = d.super;
    var r = ageUp(l, o);
    if (!r || r.blocked) return r;
    if (l.age > 3 && needs.hygiene >= 50 && needs.food >= 40) { G.applyFx(l, { health: 3 }); r.notes.push({ e: '💪', t: 'You looked after yourself well this year — clean, well-fed and healthy!' }); }
    if (supers) { G.applyFx(l, { happy: supers }); r.notes.push({ e: '⭐', t: 'You had ' + supers + ' Super Day' + (supers > 1 ? 's' : '') + ' last year. Brilliant routine!' }); }
    if (l.age > 3 && needs.hygiene < 25) r.notes.push({ e: '🚿', t: 'Remember to wash and brush your teeth every day in My Day!' });
    l.day = null; G.ensureDay(l);
    return r;
  };

  BAL.ACHIEVEMENTS.push(
    { id: 'sparkly', name: 'Sparkly Smile', emoji: '🦷', desc: 'Brush your teeth 20 times.' },
    { id: 'squeaky', name: 'Squeaky Clean', emoji: '🫧', desc: 'Wash or shower 10 times.' },
    { id: 'healthy_eater', name: 'Balanced Plate', emoji: '🥗', desc: 'Eat 5 balanced meals.' },
    { id: 'tidy_star', name: 'Tidy Star', emoji: '🧽', desc: 'Tidy or clean 10 times.' },
    { id: 'routine_star', name: 'Routine Superstar', emoji: '🌟', desc: 'Have 10 Super Days.' },
    { id: 'bill_boss', name: 'Bill Boss', emoji: '🧾', desc: 'Pay all your bills early.' },
    { id: 'tax_star', name: 'Tax Return Star', emoji: '🏛️', desc: 'Get every answer right on your tax return.' },
    { id: 'family_carer', name: 'Family Carer', emoji: '🤲', desc: 'Look after your family or pets 15 times in My Day.' }
  );

  ['toddler', 'child', 'teen', 'young', 'adult', 'older', 'grand'].forEach(function (st) {
    BAL.CHALLENGES.push({ id: 'super_day_' + st, stage: st, emoji: '⭐', name: 'Super Day', desc: 'In My Day, do all the important tasks, then go to sleep.', tab: 'chores', stars: 2,
      track: { state: function (l) { return !!(l.day && l.day.age === l.age && l.day.super > 0); } } });
  });
})(globalThis.BAL = globalThis.BAL || {});
