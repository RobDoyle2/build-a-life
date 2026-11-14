/* Build a Life — the economy: skills, several jobs at once, side jobs, odd jobs, businesses,
   bonuses & mistakes, getting fired, groceries & everyday spending, and a friendly safety net
   for when money runs out. Coins are pretend. The game can never become impossible:
   coins never go below zero, money owed is capped, and there are always ways to earn more. */
(function (BAL) {
  'use strict';
  var G = BAL.Game, A = G.actions;
  var byId = G.byId, pick = G.pick, randInt = G.randInt, clamp = G.clamp, fmt = G.fmt;
  function ok(msg, emoji, extra) { return Object.assign({ ok: true, msg: msg, emoji: emoji || '✨' }, extra || {}); }
  function no(msg, emoji) { return { ok: false, msg: msg, emoji: emoji || '🙈' }; }
  var TIRED = 'You are out of energy ⚡! Rest, or tap "Age Up" when your challenges are done.';

  /* ===================== Skills ===================== */
  BAL.SKILLS = [
    { id: 'cooking', name: 'Cooking', emoji: '🍳' },
    { id: 'caring', name: 'Caring', emoji: '🤲' },
    { id: 'people', name: 'People Skills', emoji: '💬' },
    { id: 'numbers', name: 'Numbers', emoji: '🔢' },
    { id: 'science', name: 'Science', emoji: '🔬' },
    { id: 'building', name: 'Building & Fixing', emoji: '🔨' },
    { id: 'creativity', name: 'Creativity', emoji: '🎨' },
    { id: 'tech', name: 'Technology', emoji: '💻' },
    { id: 'business', name: 'Business', emoji: '📈' }
  ];
  G.skillLevel = function (l, id) { return Math.min(5, Math.floor(((l.skills && l.skills[id]) || 0) / 20)); };
  G.addSkill = function (l, id, n) {
    if (!id || !l.skills) return 0;
    var before = G.skillLevel(l, id);
    l.skills[id] = clamp((l.skills[id] || 0) + n);
    var after = G.skillLevel(l, id);
    if (after > before) {
      var s = byId(BAL.SKILLS, id);
      G.addLog(l, s.name + ' skill reached level ' + after + '!', s.emoji);
      if (after >= 5) G.unlock(l, 'skilled');
      l.levelUps = (l.levelUps || []).concat([{ id: id, level: after }]);
    }
    return after - before;
  };
  // Activities quietly teach skills too.
  var ACTIVITY_SKILLS = {
    baking: ['cooking', 4], cook: ['cooking', 4], draw: ['creativity', 3], instrument: ['creativity', 3], code: ['tech', 5],
    read: ['science', 2], museum: ['science', 3], volunteer: ['people', 3], friends: ['people', 2], party: ['people', 2],
    garden: ['caring', 2], lemonade: ['business', 3], chores: ['building', 1], knit: ['creativity', 2], yoga: ['caring', 1]
  };
  G.activitySkill = function (l, actId) { var m = ACTIVITY_SKILLS[actId]; if (m) G.addSkill(l, m[0], m[1]); };

  /* ===================== Jobs ===================== */
  // Key skill (and level needed) for every full-time job, plus friendly "oops" moments.
  var JOB_SKILLS = {
    shop: ['people', 0], cafe: ['cooking', 0], farmer: ['caring', 0], artist: ['creativity', 1], musician: ['creativity', 1],
    hair: ['creativity', 1], builder: ['building', 2], chef: ['cooking', 2], mechanic: ['building', 2], zoo: ['caring', 1],
    fire: ['caring', 1], police: ['people', 2], teacher: ['people', 2], nurse: ['caring', 2], gamedev: ['tech', 3],
    vet: ['caring', 3], pilot: ['tech', 2], scientist: ['science', 3], doctor: ['science', 3], football: ['people', 0],
    astronaut: ['science', 4]
  };
  BAL.JOBS.push(
    { id: 'postal', name: 'Postal Worker', emoji: '📮', edu: 1, smarts: 0, fitness: 30, pay: 10000, skill: 'people', lvl: 0 },
    { id: 'cleaner', name: 'Cleaner', emoji: '🧽', edu: 1, smarts: 0, fitness: 20, pay: 9000, skill: 'building', lvl: 0 },
    { id: 'gardener', name: 'Gardener', emoji: '🌻', edu: 1, smarts: 0, fitness: 30, pay: 10500, skill: 'caring', lvl: 0 },
    { id: 'baker', name: 'Baker', emoji: '🥖', edu: 2, smarts: 10, fitness: 0, pay: 11500, skill: 'cooking', lvl: 1 },
    { id: 'librarian', name: 'Librarian', emoji: '📚', edu: 2, smarts: 40, fitness: 0, pay: 13000, skill: 'people', lvl: 1 },
    { id: 'bus', name: 'Bus Driver', emoji: '🚌', edu: 2, smarts: 20, fitness: 0, pay: 14000, skill: 'people', lvl: 1, licence: true },
    { id: 'accountant', name: 'Accountant', emoji: '🧮', edu: 3, smarts: 50, fitness: 0, pay: 20000, skill: 'numbers', lvl: 2 },
    { id: 'fashion', name: 'Fashion Designer', emoji: '👗', edu: 3, smarts: 30, fitness: 0, pay: 18000, skill: 'creativity', lvl: 2, happy: 3 },
    { id: 'engineer', name: 'Engineer', emoji: '⚙️', edu: 4, smarts: 65, fitness: 0, pay: 29000, skill: 'building', lvl: 3 },
    { id: 'dentist', name: 'Dentist', emoji: '🦷', edu: 4, smarts: 75, fitness: 0, pay: 33000, skill: 'science', lvl: 3 }
  );
  BAL.JOBS.forEach(function (j) { if (!j.skill && JOB_SKILLS[j.id]) { j.skill = JOB_SKILLS[j.id][0]; j.lvl = JOB_SKILLS[j.id][1]; } });

  var MISTAKES = {
    chef: 'burnt a whole tray of pancakes', cafe: 'spilt a frothy coffee everywhere', baker: 'forgot the sugar in the cakes',
    doctor: 'muddled up two patients\' plasters', nurse: 'lost the thermometer (it was in your pocket!)', dentist: 'dropped the tiny mirror',
    teacher: 'lost the class register', police: 'locked the keys inside the police car', fire: 'turned on the hose a bit too early',
    hair: 'cut someone\'s fringe a bit too short', vet: 'let a hamster escape (you caught it!)', builder: 'built a wall a little bit wonky',
    shop: 'gave a customer the wrong change', mechanic: 'put a wheel on backwards', farmer: 'left the gate open — the sheep went exploring',
    zoo: 'fed the penguins the monkeys\' bananas', pilot: 'made a very bumpy landing', scientist: 'made a smelly experiment',
    gamedev: 'made a bug that turned every character purple', postal: 'delivered letters to the wrong street',
    librarian: 'put the dinosaur books in the cookery section', bus: 'missed a bus stop', accountant: 'added up a column wrong',
    engineer: 'dropped a bolt into a machine', astronaut: 'let a sandwich float away in space', artist: 'knocked over a pot of paint',
    musician: 'played the wrong song at a wedding', football: 'scored an own goal', fashion: 'sewed a sleeve on upside down',
    cleaner: 'knocked over a full bucket of water', gardener: 'pulled up some flowers instead of weeds'
  };
  G.mistakeText = function (id) { return MISTAKES[id] || 'made a little mistake'; };

  G.jobSkillBonus = function (l) {
    var j = G.job(l); if (!j || !j.skill) return 0;
    return Math.max(0, Math.min(0.2, (G.skillLevel(l, j.skill) - (j.lvl || 0)) * 0.05));
  };

  /* ===================== Side jobs (more than one job!) ===================== */
  // pay = coins per shift; regular hours also pay 2 shifts a year automatically.
  BAL.SIDE_JOBS = [
    { id: 'paper', name: 'Paper Round', emoji: '📰', pay: 60, minAge: 13, maxAge: 19, skill: 'people' },
    { id: 'babysit', name: 'Babysitter', emoji: '🍼', pay: 80, minAge: 14, maxAge: 99, skill: 'caring' },
    { id: 'dogwalk', name: 'Dog Walker', emoji: '🐕', pay: 60, minAge: 13, maxAge: 99, skill: 'caring' },
    { id: 'cafe_pt', name: 'Weekend Café Helper', emoji: '🧁', pay: 90, minAge: 15, maxAge: 99, skill: 'cooking' },
    { id: 'tutor', name: 'Tutor', emoji: '✏️', pay: 160, minAge: 18, maxAge: 99, skill: 'numbers', edu: 3 },
    { id: 'delivery', name: 'Delivery Rider', emoji: '🚴', pay: 130, minAge: 17, maxAge: 70, skill: 'people' },
    { id: 'market', name: 'Market Stall', emoji: '🧺', pay: 140, minAge: 16, maxAge: 99, skill: 'business' },
    { id: 'crafts', name: 'Online Craft Shop', emoji: '🧶', pay: 150, minAge: 16, maxAge: 99, skill: 'creativity' },
    { id: 'lifeguard', name: 'Lifeguard', emoji: '🛟', pay: 150, minAge: 17, maxAge: 60, skill: 'caring', fitness: 50 },
    { id: 'repair', name: 'Repair Shop Helper', emoji: '🔧', pay: 170, minAge: 18, maxAge: 99, skill: 'building' }
  ];
  BAL.PART_TIME = BAL.SIDE_JOBS; // older name
  BAL.MAX_JOBS = 3;               // full-time job + business + side jobs, added together

  G.jobCount = function (l) { return (l.job ? 1 : 0) + (l.business ? 1 : 0) + (l.sideJobs || []).length; };
  G.shiftPay = function (l, sj) { return Math.round(sj.pay * (l.age >= 18 ? G.town(l).pay : 1) * (1 + G.skillLevel(l, sj.skill) * 0.05)); };

  A.takeSideJob = function (l, id) {
    var sj = byId(BAL.SIDE_JOBS, id);
    if (!sj) return no('No such job');
    if (l.age < sj.minAge) return no('You can do this from age ' + sj.minAge + '.');
    if (l.age > sj.maxAge) return no('This job is for younger people — try another one!');
    if ((l.sideJobs || []).some(function (x) { return x.id === id; })) return no('You already do this job!');
    var max = l.age < 18 ? 2 : BAL.MAX_JOBS;
    if (G.jobCount(l) >= max) return no(l.age < 18 ? 'Two part-time jobs is plenty alongside school!' : 'You already have ' + BAL.MAX_JOBS + ' jobs — that\'s a lot! Leave one first.', '😅');
    if (sj.edu && l.edu.level < sj.edu) return no('You need a ' + BAL.EDU_LEVELS[sj.edu] + ' for this.');
    if (sj.fitness && l.stats.fitness < sj.fitness) return no('You need ' + sj.fitness + ' 💪 fitness for this.');
    l.sideJobs.push({ id: id, shifts: 0, years: 0 });
    G.applyFx(l, { happy: 3 });
    G.addLog(l, 'Started a side job: ' + sj.name, sj.emoji);
    if (G.jobCount(l) >= 3) G.unlock(l, 'multitasker');
    G.resetEnergyMax(l);
    return ok('You\'re now a ' + sj.name + '! Tap "Work a shift" to earn ' + fmt(G.shiftPay(l, sj)) + ' coins each time.', sj.emoji);
  };
  A.partTime = A.takeSideJob; // older name
  A.quitSideJob = function (l, id) {
    var before = l.sideJobs.length;
    l.sideJobs = l.sideJobs.filter(function (x) { return x.id !== id; });
    if (l.sideJobs.length === before) return no('?');
    G.resetEnergyMax(l);
    return ok('You left that side job.', '👋');
  };
  A.quitPartTime = function (l) { if (l.sideJobs[0]) return A.quitSideJob(l, l.sideJobs[0].id); return no('?'); };
  A.workShift = function (l, id) {
    var mine = (l.sideJobs || []).find(function (x) { return x.id === id; });
    var sj = byId(BAL.SIDE_JOBS, id);
    if (!mine || !sj) return no('You don\'t do that job.');
    if (l.energy < 1) return no(TIRED, '😴');
    l.energy -= 1; mine.shifts += 1;
    var pay = G.shiftPay(l, sj);
    G._addCoins(l, pay);
    G.addSkill(l, sj.skill, 2);
    var r = G.rng();
    if (r < 0.12) { var tip = Math.round(pay * 0.5); G._addCoins(l, tip); return ok('Great shift! Someone gave you a ' + fmt(tip) + ' coin tip! 🌟', sj.emoji); }
    if (r > 0.92) { var oops = Math.round(pay * 0.25); G._addCoins(l, -oops); return ok('You earned ' + fmt(pay) + ' coins, but had a little oops and paid ' + fmt(oops) + ' to fix it. Next time! 🙈', sj.emoji); }
    G.applyFx(l, { happy: 1 });
    return ok('Shift done! You earned ' + fmt(pay) + ' coins.', sj.emoji);
  };

  /* ===================== Odd jobs (always available) ===================== */
  BAL.ODD_JOBS = [
    { id: 'carwash', name: 'Wash Cars', emoji: '🚗', min: 8, pay: [15, 30], skill: 'building' },
    { id: 'leaves', name: 'Rake Leaves', emoji: '🍂', min: 8, pay: [10, 25], skill: 'building' },
    { id: 'leaflets', name: 'Deliver Leaflets', emoji: '📬', min: 10, pay: [15, 35], skill: 'people' },
    { id: 'petsit', name: 'Pet Sitting', emoji: '🐈', min: 10, pay: [20, 40], skill: 'caring' },
    { id: 'gardening', name: 'Neighbour\'s Garden', emoji: '🌷', min: 12, pay: [25, 50], skill: 'caring' },
    { id: 'homework', name: 'Homework Helper', emoji: '✏️', min: 14, pay: [30, 60], skill: 'numbers' },
    { id: 'crafts', name: 'Sell Crafts', emoji: '🧶', min: 14, pay: [30, 80], skill: 'creativity' },
    { id: 'fixing', name: 'Fix Things', emoji: '🔧', min: 16, pay: [40, 90], skill: 'building' }
  ];
  G.oddJobs = function (l) { return BAL.ODD_JOBS.filter(function (o) { return l.age >= o.min; }); };
  G.oddJobMult = function (l) { return l.age >= 18 ? 2 * G.town(l).pay : 1; };
  A.oddJob = function (l, id) {
    var o = byId(BAL.ODD_JOBS, id);
    if (!o || l.age < o.min) return no('You can do odd jobs from age 8.');
    if (l.energy < 1) return no(TIRED, '😴');
    l.energy -= 1;
    var pay = Math.round(randInt(o.pay[0], o.pay[1]) * G.oddJobMult(l));
    G._addCoins(l, pay);
    G.addSkill(l, o.skill, 1);
    G.applyFx(l, { happy: 1 });
    l.totals.oddJobs = (l.totals.oddJobs || 0) + 1;
    return ok(o.name + ': done! You earned ' + fmt(pay) + ' coins.', o.emoji);
  };

  /* ===================== Learning skills ===================== */
  G.classCost = function (l) { return G.price(l, 120); };
  A.learnSkill = function (l, id, paid) {
    var s = byId(BAL.SKILLS, id);
    if (!s) return no('?');
    if (l.age < 6) return no('Skills classes start at age 6. Keep playing and learning!');
    if (l.energy < 1) return no(TIRED, '😴');
    var cost = paid ? (l.age < 18 ? 20 : G.classCost(l)) : 0;
    if (cost > l.coins) return no('This class costs ' + fmt(cost) + ' coins. Try the free library course instead!', '🪙');
    l.energy -= 1;
    if (cost) G._addCoins(l, -cost);
    var gain = paid ? randInt(15, 20) : randInt(7, 10);
    var up = G.addSkill(l, id, gain);
    G.applyFx(l, { smarts: 1 });
    return ok((paid ? 'Great class! ' : 'You studied at the library. ') + s.name + ' +' + gain + (up ? ' — LEVEL UP! ⬆️' : '') + '', s.emoji);
  };

  /* ===================== Businesses ===================== */
  BAL.BUSINESSES = [
    { id: 'petgroom', name: 'Pet Grooming Salon', emoji: '🐩', cost: 2000, profit: 4500, skill: 'caring' },
    { id: 'florist', name: 'Flower Shop', emoji: '💐', cost: 2500, profit: 5000, skill: 'creativity' },
    { id: 'bakery', name: 'Bakery', emoji: '🧁', cost: 3000, profit: 6000, skill: 'cooking' },
    { id: 'salon', name: 'Hair Salon', emoji: '💇', cost: 3500, profit: 6500, skill: 'creativity' },
    { id: 'cafe', name: 'Café', emoji: '☕', cost: 4000, profit: 7000, skill: 'cooking' },
    { id: 'toyshop', name: 'Toy Shop', emoji: '🧸', cost: 5000, profit: 8000, skill: 'business' },
    { id: 'tech', name: 'App Company', emoji: '📱', cost: 8000, profit: 14000, skill: 'tech' }
  ];
  BAL.BIZ_LEVELS = [{ name: 'Market Stall', mult: 1 }, { name: 'Small Shop', mult: 1.8 }, { name: 'Big Shop', mult: 3 }, { name: 'Chain of Shops', mult: 5 }];
  G.biz = function (l) { return l.business ? byId(BAL.BUSINESSES, l.business.id) : null; };
  G.bizName = function (l) { var b = G.biz(l); return b ? b.name + ' (' + BAL.BIZ_LEVELS[l.business.level].name + ')' : ''; };
  G.bizStartCost = function (l, b) { return G.price(l, b.cost); };
  G.bizGrowCost = function (l) { var b = G.biz(l); return G.price(l, Math.round(b.cost * (l.business.level + 1) * 1.6)); };
  G.bizValue = function (l) { var b = G.biz(l); var v = 0; for (var i = 0; i <= l.business.level; i++) v += b.cost * (i ? i * 1.6 : 1); return Math.round(G.price(l, v) * 0.8); };
  G.bizProfitEstimate = function (l) {
    var b = G.biz(l); if (!b) return 0;
    var bz = l.business;
    var skill = G.skillLevel(l, b.skill) * 0.06 + G.skillLevel(l, 'business') * 0.06;
    return Math.round(b.profit * BAL.BIZ_LEVELS[bz.level].mult * G.town(l).pay * (0.5 + bz.effort / 100 * 0.6 + skill));
  };
  A.startBusiness = function (l, id) {
    var b = byId(BAL.BUSINESSES, id);
    if (!b) return no('?');
    if (l.age < 18) return no('You can start a business when you are 18. Try a lemonade stand for now! 🍋');
    if (l.business) return no('You already run a business!');
    if (G.jobCount(l) >= BAL.MAX_JOBS) return no('You have ' + BAL.MAX_JOBS + ' jobs already. Leave one to make time for a business.');
    var cost = G.bizStartCost(l, b);
    if (l.coins < cost) return no('You need ' + fmt(cost) + ' coins to start a ' + b.name + '. Save up with jobs and odd jobs! 🐷', '🪙');
    G._addCoins(l, -cost);
    l.business = { id: id, level: 0, effort: 50, years: 0, lastProfit: 0 };
    G.applyFx(l, { happy: 10 });
    G.unlock(l, 'entrepreneur');
    if (G.jobCount(l) >= 3) G.unlock(l, 'multitasker');
    G.addLog(l, 'Opened a ' + b.name + '!', b.emoji);
    G.resetEnergyMax(l);
    return ok('Grand opening! 🎉 Your ' + b.name + ' market stall is open. Work on it to make it grow!', b.emoji, { celebrate: true });
  };
  A.workBusiness = function (l) {
    var b = G.biz(l); if (!b) return no('You don\'t have a business.');
    if (l.energy < 1) return no(TIRED, '😴');
    l.energy -= 1;
    l.business.effort = clamp(l.business.effort + randInt(12, 20));
    G.addSkill(l, 'business', 3); G.addSkill(l, b.skill, 2);
    var r = G.rng();
    var est = G.bizProfitEstimate(l);
    if (r < 0.15) { var bonus = Math.round(est * 0.08); G._addCoins(l, bonus); return ok('A big order came in! +' + fmt(bonus) + ' coins! 📦', b.emoji); }
    if (r > 0.9) { var c = Math.round(est * 0.03); G._addCoins(l, -c); return ok('Oops — a delivery got lost and cost ' + fmt(c) + ' coins. Everything else went well!', b.emoji); }
    return ok(pick(['You served lots of happy customers!', 'You came up with a brilliant new idea!', 'You tidied the shop and it looks great!', 'You made a fun poster to attract customers!']), b.emoji);
  };
  A.growBusiness = function (l) {
    var b = G.biz(l); if (!b) return no('You don\'t have a business.');
    if (l.business.level >= BAL.BIZ_LEVELS.length - 1) return no('Your business is already a chain of shops! 👑');
    var cost = G.bizGrowCost(l);
    if (l.coins < cost) return no('Growing your business costs ' + fmt(cost) + ' coins.', '🪙');
    G._addCoins(l, -cost);
    l.business.level += 1;
    G.applyFx(l, { happy: 8 });
    if (l.business.level === BAL.BIZ_LEVELS.length - 1) G.unlock(l, 'tycoon');
    G.addLog(l, b.name + ' grew into a ' + BAL.BIZ_LEVELS[l.business.level].name + '!', '📈');
    return ok('Your ' + b.name + ' is now a ' + BAL.BIZ_LEVELS[l.business.level].name + '! Bigger profits ahead!', '📈', { celebrate: true });
  };
  A.sellBusiness = function (l) {
    var b = G.biz(l); if (!b) return no('You don\'t have a business.');
    var v = G.bizValue(l);
    G._addCoins(l, v);
    l.business = null;
    G.addLog(l, 'Sold the ' + b.name, '🤝');
    G.resetEnergyMax(l);
    return ok('You sold your ' + b.name + ' for ' + fmt(v) + ' coins!', '🤝');
  };

  /* ===================== Shopping: groceries, furniture, decorations, birthdays, everyday ===================== */
  BAL.GROCERY_BASKETS = [
    { id: 'budget', name: 'Budget Basket', emoji: '🥫', cost: 900, fx: {}, desc: 'Simple, filling food and the essentials.' },
    { id: 'healthy', name: 'Healthy Basket', emoji: '🥦', cost: 1400, fx: { health: 8, fitness: 2 }, desc: 'Lots of fruit, veg and wholesome meals.' },
    { id: 'family', name: 'Family Favourites', emoji: '🍝', cost: 1300, fx: { happy: 4, health: 3 }, desc: 'Pasta nights, roast dinners and family treats.' },
    { id: 'treat', name: 'Treat Basket', emoji: '🍕', cost: 1700, fx: { happy: 8, health: -3 }, desc: 'Pizza, ice cream and party food all year!' }
  ];
  G.householdSize = function (l) {
    var n = 1;
    if (l.people.some(function (p) { return ['partner', 'fiance', 'spouse'].indexOf(p.role) >= 0; })) n += 0.6;
    n += l.people.filter(function (p) { return p.role === 'child' && p.age < 18; }).length * 0.4;
    return n;
  };
  G.groceryCost = function (l, bk) { return Math.round(G.price(l, bk.cost) * G.householdSize(l)); };
  G.needsGroceries = function (l) { return l.age >= 18 && l.home.type !== 'family'; };
  A.buyGroceries = function (l, id) {
    var bk = byId(BAL.GROCERY_BASKETS, id);
    if (!bk) return no('?');
    if (!G.needsGroceries(l)) return no(l.age < 18 ? 'Your family does the big food shop! You can buy snacks.' : 'You live with your family, so you share their food shop. 🏡', '🛒');
    if (l.groceries) return no('You already did this year\'s food shop! 🛒');
    var cost = G.groceryCost(l, bk);
    if (l.coins < cost) return no('This basket costs ' + fmt(cost) + ' coins. Try a cheaper basket — or if you don\'t shop, a Budget Basket is paid on your birthday.', '🪙');
    G._addCoins(l, -cost);
    l.groceries = id;
    G.applyFx(l, bk.fx);
    return ok('Food shop done for the year! ' + bk.desc, bk.emoji);
  };

  BAL.SHOP_CATS = [
    { id: 'groceries', name: 'Groceries', emoji: '🛒' }, { id: 'everyday', name: 'Everyday', emoji: '🧴' },
    { id: 'toys', name: 'Toys', emoji: '🧸' }, { id: 'books', name: 'Books', emoji: '📚' },
    { id: 'clothes', name: 'Clothes', emoji: '👕' }, { id: 'gadgets', name: 'Gadgets', emoji: '📱' },
    { id: 'home', name: 'Furniture', emoji: '🛋️' }, { id: 'decor', name: 'Decorations', emoji: '🎀' },
    { id: 'party', name: 'Birthdays', emoji: '🎂' }
  ];
  BAL.ITEMS.forEach(function (it) { if (it.cat === 'treats') it.cat = 'groceries'; if (it.cat === 'home') it.furniture = true; });
  BAL.ITEMS.push(
    // furniture
    { id: 'desk', cat: 'home', name: 'Desk & Chair', emoji: '🪑', price: 250, fx: { smarts: 3 }, furniture: true },
    { id: 'bookcase', cat: 'home', name: 'Bookcase', emoji: '📚', price: 200, fx: { smarts: 2, happy: 2 }, furniture: true },
    { id: 'table', cat: 'home', name: 'Dining Table', emoji: '🍽️', price: 450, fx: { happy: 4 }, furniture: true },
    { id: 'lamp', cat: 'home', name: 'Cosy Lamp', emoji: '🛋️', price: 60, fx: { happy: 2 }, furniture: true },
    { id: 'rug', cat: 'home', name: 'Fluffy Rug', emoji: '🟫', price: 120, fx: { happy: 3 }, furniture: true },
    { id: 'bunkbed', cat: 'home', name: 'Bunk Beds', emoji: '🛏️', price: 500, fx: { happy: 5 }, furniture: true },
    // decorations
    { id: 'fairylights', cat: 'decor', name: 'Fairy Lights', emoji: '✨', price: 40, fx: { happy: 3 }, decor: true },
    { id: 'bunting', cat: 'decor', name: 'Bunting', emoji: '🎏', price: 25, fx: { happy: 2 }, decor: true },
    { id: 'poster', cat: 'decor', name: 'Cool Poster', emoji: '🖼️', price: 20, fx: { happy: 2 }, decor: true },
    { id: 'stickers', cat: 'decor', name: 'Wall Stickers', emoji: '⭐', price: 30, fx: { happy: 2 }, decor: true },
    { id: 'cushions', cat: 'decor', name: 'Rainbow Cushions', emoji: '🌈', price: 50, fx: { happy: 3 }, decor: true },
    { id: 'mirror', cat: 'decor', name: 'Sparkly Mirror', emoji: '🪞', price: 90, fx: { happy: 3 }, decor: true },
    { id: 'vase', cat: 'decor', name: 'Flower Vase', emoji: '💐', price: 45, fx: { happy: 3, health: 1 }, decor: true },
    { id: 'lavalamp', cat: 'decor', name: 'Lava Lamp', emoji: '🫧', price: 70, fx: { happy: 4 }, decor: true },
    // everyday shopping
    { id: 'toothpaste', cat: 'everyday', name: 'Toothpaste & Brush', emoji: '🪥', price: 6, fx: { health: 3 }, consumable: true },
    { id: 'soap', cat: 'everyday', name: 'Soap & Shampoo', emoji: '🧼', price: 8, fx: { health: 2, happy: 1 }, consumable: true },
    { id: 'washing', cat: 'everyday', name: 'Washing Powder', emoji: '🧺', price: 10, fx: { happy: 2 }, consumable: true },
    { id: 'schoolkit', cat: 'everyday', name: 'School Supplies', emoji: '✏️', price: 15, fx: { smarts: 3 }, consumable: true },
    { id: 'plasters', cat: 'everyday', name: 'Plasters', emoji: '🩹', price: 5, fx: { health: 2 }, consumable: true },
    { id: 'suncream', cat: 'everyday', name: 'Sun Cream', emoji: '🧴', price: 9, fx: { health: 3 }, consumable: true },
    { id: 'umbrella', cat: 'everyday', name: 'Umbrella', emoji: '☂️', price: 20, fx: { health: 2, happy: 1 } },
    { id: 'bulbs', cat: 'everyday', name: 'Light Bulbs', emoji: '💡', price: 12, fx: { happy: 1 }, consumable: true },
    // groceries (snacks)
    { id: 'sandwich', cat: 'groceries', name: 'Picnic Lunch', emoji: '🥪', price: 12, fx: { happy: 3, health: 1 }, consumable: true },
    { id: 'veg', cat: 'groceries', name: 'Veggie Box', emoji: '🥕', price: 18, fx: { health: 5 }, consumable: true },
    // birthdays & parties (for your next birthday)
    { id: 'p_cake', cat: 'party', name: 'Birthday Cake', emoji: '🎂', price: 30, fx: { happy: 2 }, party: 1 },
    { id: 'p_balloons', cat: 'party', name: 'Balloons', emoji: '🎈', price: 15, fx: { happy: 1 }, party: 1 },
    { id: 'p_bags', cat: 'party', name: 'Party Bags', emoji: '🛍️', price: 25, fx: { happy: 1 }, party: 1 },
    { id: 'p_games', cat: 'party', name: 'Party Games', emoji: '🎲', price: 20, fx: { happy: 1 }, party: 1 },
    { id: 'p_castle', cat: 'party', name: 'Bouncy Castle', emoji: '🏰', price: 120, fx: { happy: 2 }, party: 2 },
    { id: 'p_magic', cat: 'party', name: 'Magician', emoji: '🎩', price: 150, fx: { happy: 2 }, party: 2 },
    { id: 'p_disco', cat: 'party', name: 'Disco Lights', emoji: '🪩', price: 80, fx: { happy: 2 }, party: 2 }
  );
  // Party items are used up at your next birthday; you can buy each one once per year.
  G.partyBought = function (l, id) { return (l.partyItems || []).indexOf(id) >= 0; };
  G.cosiness = function (l) {
    var n = l.inventory.filter(function (id) { var it = byId(BAL.ITEMS, id); return it && (it.furniture || it.decor); }).length;
    return Math.min(6, Math.floor(n / 2));
  };

  A.sellItem = function (l, id) {
    var i = l.inventory.indexOf(id);
    var it = byId(BAL.ITEMS, id);
    if (i < 0 || !it) return no('You don\'t have that.');
    var v = Math.max(1, Math.round(G.itemPrice(l, it) * 0.5));
    l.inventory.splice(i, 1);
    G._addCoins(l, v);
    G.applyFx(l, { happy: -1 });
    return ok('You sold your ' + it.name + ' at the car boot sale for ' + fmt(v) + ' coins.', '🪧');
  };

  /* ===================== When money runs out ===================== */
  G.owedCap = function (l) { return G.price(l, 3000); };
  A.payBack = function (l) {
    if (!l.owed) return no('You don\'t owe any coins. 🎉', '🎉');
    var amt = Math.min(l.owed, l.coins);
    if (amt <= 0) return no('You need some coins first — try odd jobs or a shift at work!', '🪙');
    G._addCoins(l, -amt);
    l.owed -= amt;
    if (!l.owed) { G.applyFx(l, { happy: 10 }); G.unlock(l, 'debt_free'); G.addLog(l, 'Paid back everything owed!', '🎉'); return ok('You paid back everything you owed! What a relief! 🎉', '🎉', { celebrate: true }); }
    G.applyFx(l, { happy: 2 });
    return ok('You paid back ' + fmt(amt) + ' coins. Only ' + fmt(l.owed) + ' left to go!', '💪');
  };
  G.canAskFamily = function (l) {
    if (l.age < 18 || l.flags.askedFamily) return false;
    if (!(l.owed > 0 || l.coins < G.price(l, 300))) return false;
    return l.people.some(function (p) { return ['mum', 'dad', 'parent', 'grandma', 'grandpa', 'sibling', 'spouse', 'friend'].indexOf(p.role) >= 0 && p.close >= 30; });
  };
  A.askFamily = function (l) {
    if (l.age < 18) return no('Your family looks after you while you\'re young! Do chores for pocket money. 🧹');
    if (l.flags.askedFamily) return no('You already asked for help this year.', '🙂');
    if (!G.canAskFamily(l)) return no('You\'re doing OK at the moment — keep it up!', '👍');
    l.flags.askedFamily = true;
    var helpers = l.people.filter(function (p) { return ['mum', 'dad', 'parent', 'grandma', 'grandpa', 'sibling', 'spouse', 'friend'].indexOf(p.role) >= 0 && p.close >= 30; })
      .sort(function (a, b) { return b.close - a.close; });
    var h = helpers[0];
    var gift = G.price(l, randInt(3, 8) * 100);
    G._addCoins(l, gift);
    G.applyFx(l, { happy: 4 });
    return ok(h.name + ' gave you ' + fmt(gift) + ' coins and a big hug. "We all need a little help sometimes!" 🤗', '🤝');
  };

  /* ===================== Payday: the yearly payslip ===================== */
  G.payslip = function (l) {
    var lines = [];
    var j = G.job(l);
    if (j) {
      var base = G.salary(l);
      lines.push({ e: j.emoji, t: 'Salary: ' + G.jobTitle(l), v: base });
      var sk = Math.round(base * G.jobSkillBonus(l));
      if (sk) lines.push({ e: '🧠', t: 'Skill bonus', v: sk });
      if (l.job.perf >= 80) lines.push({ e: '🎁', t: 'Performance bonus — great work!', v: Math.round(base * 0.1), bonus: true });
      var ded = Math.min(Math.round(base * 0.3), l.job.deductions || 0);
      if (ded) lines.push({ e: '🙈', t: 'Taken off for mistakes', v: -ded });
    }
    if (l.business) {
      var b = G.biz(l);
      lines.push({ e: b.emoji, t: G.bizName(l) + ' profit', v: Math.round(G.bizProfitEstimate(l)), biz: true });
    }
    (l.sideJobs || []).forEach(function (x) { var sj = byId(BAL.SIDE_JOBS, x.id); if (sj) lines.push({ e: sj.emoji, t: sj.name + ' (regular hours)', v: G.shiftPay(l, sj) * 2 }); });
    return lines;
  };

  /* ===================== Upgrading older saves ===================== */
  G.ensureEconomy = function (l) {
    if (!l.skills) { l.skills = {}; BAL.SKILLS.forEach(function (s) { l.skills[s.id] = 0; }); if (l.age > 5) BAL.SKILLS.forEach(function (s) { l.skills[s.id] = Math.min(30, l.age); }); }
    if (!Array.isArray(l.sideJobs)) { l.sideJobs = []; if (l.partTime) l.sideJobs.push({ id: l.partTime, shifts: 0, years: 0 }); }
    delete l.partTime;
    if (l.owed === undefined) l.owed = 0;
    if (l.business === undefined) l.business = null;
    if (!Array.isArray(l.partyItems)) l.partyItems = [];
    if (l.job && l.job.deductions === undefined) { l.job.deductions = 0; l.job.warnings = 0; }
  };

  BAL.ACHIEVEMENTS.push(
    { id: 'multitasker', name: 'Busy Bee', emoji: '🐝', desc: 'Have 3 jobs at the same time.' },
    { id: 'entrepreneur', name: 'Boss of Your Own', emoji: '🏪', desc: 'Start your own business.' },
    { id: 'tycoon', name: 'Business Tycoon', emoji: '🏙️', desc: 'Grow a business into a chain of shops.' },
    { id: 'skilled', name: 'Master of Skills', emoji: '🛠️', desc: 'Reach level 5 in a skill.' },
    { id: 'debt_free', name: 'Back on Track', emoji: '🌈', desc: 'Pay back all the money you owed.' },
    { id: 'party', name: 'Party Planner', emoji: '🥳', desc: 'Throw a birthday party with 5 party items.' }
  );

  /* ===================== Money rescue challenges ===================== */
  BAL.CHALLENGES.push(
    { id: 'mr_odd', stage: 'money', emoji: '🧹', name: 'Money Rescue: Odd Jobs', desc: 'Do 2 odd jobs to earn some extra coins.', track: { act: ['oddJob', 'workShift'], n: 2 }, tab: 'money', stars: 1, money: true },
    { id: 'mr_payback', stage: 'money', emoji: '💸', name: 'Money Rescue: Pay It Back', desc: 'Pay back some of the coins you owe (Money tab).', track: { act: 'payBack', n: 1 }, tab: 'money', stars: 2, money: true, when: function (l) { return l.owed > 0; } },
    { id: 'mr_budget', stage: 'money', emoji: '📊', name: 'Money Rescue: Make a Budget', desc: 'Play the budget game to plan your money.', track: { game: 'quiz', kind: 'money' }, stars: 2, money: true }
  );
})(globalThis.BAL = globalThis.BAL || {});
