/* Build a Life — family & relationships.
   Friendships, dating (grown-ups only), boyfriends & girlfriends, moving in, marriage, buying a home
   together, raising children (meals, homework, clothes, birthdays, the doctor, time together),
   family occasions and two-way family conversations. All content is gentle and suitable for
   children aged 5–15: dates are picnics and bowling, and nobody is ever harmed by a missed chore. */
(function (BAL) {
  'use strict';
  var G = BAL.Game, A = G.actions;
  var byId = G.byId, fmt = G.fmt, clamp = G.clamp, pick = G.pick, randInt = G.randInt;
  function ok(msg, emoji, extra) { return Object.assign({ ok: true, msg: msg, emoji: emoji || '✨' }, extra || {}); }
  function no(msg, emoji) { return { ok: false, msg: msg, emoji: emoji || '🙈' }; }
  function ordinal(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  var LOVE = ['partner', 'fiance', 'spouse'];
  var FAMILY = ['mum', 'dad', 'parent', 'grandma', 'grandpa', 'sibling', 'spouse', 'partner', 'fiance', 'child', 'grandchild'];
  function tired(l) { return l.energy < 1; }
  var TIRED = 'You are out of energy ⚡! Have a rest first.';

  /* ===================== Labels ===================== */
  G.relLabel = function (p) {
    switch (p.role) {
      case 'partner': return p.official ? (p.gender === 'girl' ? 'Girlfriend' : 'Boyfriend') : 'Going on dates';
      case 'fiance': return 'Engaged';
      case 'spouse': return p.gender === 'girl' ? 'Wife' : 'Husband';
      case 'sibling': return p.gender === 'girl' ? 'Sister' : 'Brother';
      case 'child': return (p.gender === 'girl' ? 'Daughter' : 'Son') + (p.age >= 18 ? ' (grown up)' : '');
      default: return (BAL.ROLES[p.role] || { label: p.role }).label;
    }
  };
  // The love story so far: 0 dating, 1 boyfriend/girlfriend, 2 living together, 3 engaged, 4 married
  G.loveStep = function (p) {
    if (!p) return -1;
    if (p.role === 'spouse') return 4;
    if (p.role === 'fiance') return 3;
    if (p.livesWith) return 2;
    return p.official ? 1 : 0;
  };

  /* ===================== Children ===================== */
  function newKid(p) {
    return { meals: 0, hw: 0, doctor: false, bday: false, outgrown: false, health: 90, happy: 85, smarts: Math.min(100, 10 + p.age * 5), sick: null, treats: 0 };
  }
  G.ensureKid = function (p) { if (p.role === 'child' && !p.kid) p.kid = newKid(p); return p.kid; };
  G.kidsAtHome = function (l) { return l.people.filter(function (p) { return p.role === 'child' && p.age < 18; }); };
  function child(l, pid) { var p = G.person(l, pid); if (!p || p.role !== 'child') return null; G.ensureKid(p); return p; }

  BAL.MEALS = [
    { id: 'toast', name: 'Cheese on toast', emoji: '🧀', cost: 0, kfx: { happy: 3, health: 2 }, msg: 'Cheesy, crunchy and cut into soldiers. {name} loved it!' },
    { id: 'healthy', name: 'Healthy dinner', emoji: '🥗', cost: 15, kfx: { health: 8, happy: 2 }, msg: '{name} ate all the vegetables — even the broccoli!' },
    { id: 'favourite', name: 'Their favourite', emoji: '🍝', cost: 15, kfx: { happy: 8, health: 2 }, msg: '{name}\'s favourite dinner! Clean plate!' },
    { id: 'pancakes', name: 'Pancakes together', emoji: '🥞', cost: 10, kfx: { happy: 6, health: 1 }, close: 6, msg: 'You flipped pancakes together — one landed on the ceiling!' },
    { id: 'treat', name: 'Pizza night', emoji: '🍕', cost: 25, kfx: { happy: 10, health: -2 }, msg: 'Pizza night! {name} did a happy dance.' }
  ];
  A.feedChild = function (l, pid, mealId) {
    var p = child(l, pid); if (!p || p.age >= 18) return no('Who?');
    var m = byId(BAL.MEALS, mealId) || BAL.MEALS[0];
    if (p.kid.meals >= 3) return no(p.name + ' is full up! You\'ve made lots of meals this year. 😊', '😋');
    var cost = G.price(l, m.cost);
    if (l.coins < cost) return no('That meal costs ' + cost + ' coins.', '🪙');
    G._addCoins(l, -cost);
    p.kid.meals += 1;
    applyKid(p, m.kfx);
    p.close = clamp(p.close + (m.close || 3));
    G.applyFx(l, { happy: 2 });
    l.totals.mealsCooked = (l.totals.mealsCooked || 0) + 1;
    return ok(m.msg.replace('{name}', p.name), m.emoji);
  };
  function applyKid(p, fx) { Object.keys(fx || {}).forEach(function (k) { if (k in p.kid) p.kid[k] = clamp(p.kid[k] + fx[k]); }); }

  A.helpHomework = function (l, pid, score, total) {
    var p = child(l, pid); if (!p || p.age < 5 || p.age >= 18) return no('Only school children have homework!');
    if (tired(l)) return no(TIRED, '😴');
    if (p.kid.hw >= 3) return no(p.name + ' has finished all their homework this year! 🌟', '📚');
    l.energy -= 1;
    score = Math.max(0, score || 0); total = Math.max(1, total || 3);
    p.kid.hw += 1;
    applyKid(p, { smarts: 4 + score * 2, happy: 2 });
    p.close = clamp(p.close + 6);
    G.addSkill(l, 'people', 1);
    l.totals.homework = (l.totals.homework || 0) + 1;
    if (l.totals.homework >= 10) G.unlock(l, 'homework_hero');
    return ok(score >= total ? 'Homework done — every answer right! ' + p.name + ' got a gold star! ⭐' : 'Homework done! You and ' + p.name + ' worked it out together. 📚', '📚');
  };

  G.childClothesCost = function (l) { return G.price(l, 40); };
  G.childOutfits = function (l, pid) {
    var p = child(l, pid); if (!p) return [];
    var grp = G.ageGroup(p.age);
    var key = 'clothes:' + p.id + ':' + p.age + ':' + (p.kid.clothesBought || 0);
    var saved = G.rng; G.rng = G.seeded(key);
    try { return [G.randomOutfit(grp), G.randomOutfit(grp), G.randomOutfit(grp)]; } finally { G.rng = saved; }
  };
  A.buyChildClothes = function (l, pid, idx) {
    var p = child(l, pid); if (!p || p.age >= 18) return no('Who?');
    var outfit = G.childOutfits(l, pid)[idx || 0];
    var cost = G.childClothesCost(l);
    if (l.coins < cost) return no('New clothes cost ' + fmt(cost) + ' coins.', '🪙');
    G._addCoins(l, -cost);
    p.look = G.normalizeLook(p.look);
    p.look.outfits[G.ageGroup(p.age)] = outfit;
    p.kid.outgrown = false;
    p.kid.clothesBought = (p.kid.clothesBought || 0) + 1;
    applyKid(p, { happy: 6 });
    p.close = clamp(p.close + 4);
    return ok(p.name + ' loves the new outfit and wants to wear it every day! 👕', '👕');
  };

  BAL.CHILD_PARTIES = [
    { id: 'cake', name: 'Homemade cake & candles', emoji: '🎂', cost: 0, happy: 6, close: 6 },
    { id: 'party', name: 'Party with friends', emoji: '🎈', cost: 100, happy: 12, close: 10 },
    { id: 'big', name: 'Big party with a bouncy castle', emoji: '🏰', cost: 250, happy: 18, close: 14 }
  ];
  A.celebrateChild = function (l, pid, level) {
    var p = child(l, pid); if (!p) return no('Who?');
    if (!p.kid.bday) return no(p.name + '\'s birthday has already been celebrated this year. 🎉');
    var pt = byId(BAL.CHILD_PARTIES, level) || BAL.CHILD_PARTIES[0];
    var cost = G.price(l, pt.cost);
    if (l.coins < cost) return no('This costs ' + fmt(cost) + ' coins — the cake & candles option is cheaper!', '🪙');
    G._addCoins(l, -cost);
    p.kid.bday = false;
    applyKid(p, { happy: pt.happy });
    p.close = clamp(p.close + pt.close);
    G.applyFx(l, { happy: 6 });
    markOccasion(l, 'bday:' + p.id);
    G.addLog(l, 'Celebrated ' + p.name + '\'s ' + ordinal(p.age) + ' birthday', '🎂');
    return ok('Happy ' + ordinal(p.age) + ' birthday, ' + p.name + '! 🎉 ' + pick(['They blew out every candle in one go!', 'They said it was the best birthday ever!', 'Everyone sang SO loudly!']), pt.emoji, { celebrate: true });
  };

  A.childDoctor = function (l, pid) {
    var p = child(l, pid); if (!p || p.age >= 18) return no('Who?');
    if (tired(l)) return no(TIRED, '😴');
    if (p.kid.doctor && !p.kid.sick) return no(p.name + ' already had a check-up this year — they\'re fit and well! 💪', '🩺');
    l.energy -= 1;
    var was = p.kid.sick;
    p.kid.sick = null; p.kid.doctor = true;
    applyKid(p, { health: 15, happy: 2 });
    p.close = clamp(p.close + 4);
    return ok(was ? 'The doctor helped ' + p.name + ' get over ' + was + '. All better! (Free for children.)' : p.name + ' had a check-up. The doctor said they\'re growing beautifully! (Free for children.)', '🩺');
  };

  BAL.KID_PLAY = [
    { id: 'cuddle', name: 'Cuddles & songs', emoji: '🤗', min: 0, max: 3, msg: 'You sang nursery rhymes and {name} giggled.' },
    { id: 'story', name: 'Bedtime story', emoji: '📖', min: 1, max: 10, kfx: { smarts: 3 }, msg: 'You read a story about a dragon who loved cupcakes.' },
    { id: 'park', name: 'Trip to the park', emoji: '🛝', min: 2, max: 12, kfx: { health: 3 }, msg: '{name} went down the big slide five times!' },
    { id: 'boardgame', name: 'Board games', emoji: '🎲', min: 5, max: 17, kfx: { smarts: 2 }, msg: '{name} won and did a victory dance!' },
    { id: 'baking', name: 'Bake together', emoji: '🧁', min: 4, max: 17, msg: 'You made cupcakes — and covered the kitchen in flour!' },
    { id: 'football', name: 'Kick a ball about', emoji: '⚽', min: 4, max: 17, kfx: { health: 4 }, msg: '{name} scored a brilliant goal!' },
    { id: 'crafts', name: 'Arts & crafts', emoji: '✂️', min: 3, max: 12, kfx: { smarts: 2 }, msg: 'You made a rocket out of a cardboard box!' },
    { id: 'film', name: 'Film night', emoji: '🍿', min: 6, max: 17, msg: 'Popcorn, blankets and a funny film.' },
    { id: 'cooklesson', name: 'Teach them to cook', emoji: '🍳', min: 11, max: 17, kfx: { smarts: 3 }, msg: '{name} made their first omelette!' }
  ];
  G.kidPlay = function (p) { return BAL.KID_PLAY.filter(function (x) { return p.age >= x.min && p.age <= x.max; }); };
  A.playWithChild = function (l, pid, playId) {
    var p = child(l, pid); if (!p || p.age >= 18) return no('Who?');
    var x = byId(G.kidPlay(p), playId); if (!x) return no('That isn\'t right for their age.');
    if (tired(l)) return no(TIRED, '😴');
    l.energy -= 1;
    applyKid(p, Object.assign({ happy: 6 }, x.kfx || {}));
    p.close = clamp(p.close + randInt(10, 14));
    G.applyFx(l, { happy: 5 });
    return ok(x.msg.replace('{name}', p.name), x.emoji);
  };

  A.pocketMoney = function (l, pid) {
    var p = child(l, pid); if (!p || p.age < 5 || p.age >= 18) return no('Pocket money is for school-age children.');
    if (p.kid.pocket) return no('You already gave ' + p.name + ' pocket money this year.');
    var amt = G.price(l, 10 + p.age * 3);
    if (l.coins < amt) return no('That\'s ' + amt + ' coins.', '🪙');
    G._addCoins(l, -amt);
    p.kid.pocket = true;
    applyKid(p, { happy: 4 });
    p.close = clamp(p.close + 3);
    return ok(p.name + ' is saving up for ' + pick(['a new bike 🚲', 'a giant teddy 🧸', 'a science kit 🔬', 'trainers 👟', 'a book 📚']) + '!', '🐷');
  };

  /* ===================== Love (grown-ups only) ===================== */
  A.askOut = function (l, pid) {
    var p = G.person(l, pid);
    if (!p || p.role !== 'partner') return no('Who?');
    if (p.official) return no('You\'re already a couple! 💕');
    if (p.close < 50) return no('Go on a few more dates first (love bar above 50).', '💭');
    if (G.rng() > p.close / 100 + 0.25) { p.close = clamp(p.close - 3); return no(p.name + ' says they\'d like to get to know you a little better first. Another date?', '💭'); }
    p.official = true;
    G.applyFx(l, { happy: 8 });
    G.addLog(l, p.name + ' became your ' + G.relLabel(p).toLowerCase() + '!', '💕');
    return ok('"Yes!" ' + p.name + ' is your ' + G.relLabel(p).toLowerCase() + ' now! 💕', '💕', { celebrate: true });
  };
  A.moveIn = function (l, pid) {
    var p = G.person(l, pid);
    if (!p || LOVE.indexOf(p.role) < 0) return no('Who?');
    if (p.livesWith) return no('You already live together! 🏡');
    if (p.role === 'partner' && !p.official) return no('Ask ' + p.name + ' to be your ' + (p.gender === 'girl' ? 'girlfriend' : 'boyfriend') + ' first!', '💭');
    if (p.close < 60) return no('Spend a bit more time together first (love bar above 60).', '💭');
    p.livesWith = true;
    var moved = '';
    if (l.home.type === 'family') { l.home = { type: 'rent', id: 'apartment' }; moved = ' You found a cosy apartment together.'; }
    G.applyFx(l, { happy: 8 });
    G.addLog(l, 'Moved in with ' + p.name, '📦');
    return ok('You and ' + p.name + ' moved in together! 📦' + moved + ' ' + p.name + ' will help with the bills.', '🏡', { celebrate: true });
  };
  // Proposing needs an official couple.
  var propose = A.propose;
  A.propose = function (l, pid) {
    var p = G.person(l, pid);
    if (p && p.role === 'partner' && !p.official) return no('Ask ' + p.name + ' to be your ' + (p.gender === 'girl' ? 'girlfriend' : 'boyfriend') + ' first! 💕', '💭');
    return propose(l, pid);
  };
  var wedding = A.wedding;
  A.wedding = function (l, pid, size) {
    var r = wedding(l, pid, size);
    if (r.ok) { var p = G.person(l, pid); p.livesWith = true; l.flags.weddingAge = l.age; if (l.home.type === 'family') l.home = { type: 'rent', id: 'apartment' }; }
    return r;
  };
  // Buying a home together: a partner you live with chips in for the deposit.
  G.homeHelper = function (l) { return l.people.find(function (p) { return LOVE.indexOf(p.role) >= 0 && p.livesWith; }) || null; };
  G.partnerSavings = function (l, p) { if (p.savings === undefined) p.savings = G.price(l, randInt(4, 12) * 1000); return p.savings; };
  var buyHome = A.buyHome;
  A.buyHome = function (l, id) {
    var p = G.homeHelper(l);
    if (!p || l.age < 18 || l.home.type === 'own') return buyHome(l, id);
    var h = byId(BAL.HOMES, id);
    var deposit = Math.round(G.price(l, h.price) * BAL.HOME_DEPOSIT);
    var share = Math.min(G.partnerSavings(l, p), Math.round(deposit / 2));
    l.coins += share;
    var r = buyHome(l, id);
    if (!r.ok) { l.coins -= share; return r; }
    p.savings -= share;
    l.home.together = p.id;
    p.close = clamp(p.close + 8);
    G.unlock(l, 'home_together');
    r.msg = 'You and ' + p.name + ' bought a ' + h.name + ' together! ' + p.name + ' paid ' + fmt(share) + ' coins towards the deposit. 🔑';
    return r;
  };
  var separate = A.separate;
  A.separate = function (l, pid) { var p = G.person(l, pid); var r = separate(l, pid); if (r.ok && p) { p.livesWith = false; p.official = false; } return r; };

  /* ===================== Family occasions ===================== */
  function markOccasion(l, id) { l.flags.occasions = l.flags.occasions || {}; l.flags.occasions[id] = l.age; }
  function done(l, id) { return l.flags.occasions && l.flags.occasions[id] === l.age; }
  G.occasions = function (l) {
    var list = [];
    G.kidsAtHome(l).forEach(function (p) {
      G.ensureKid(p);
      if (p.kid.bday) list.push({ id: 'bday:' + p.id, emoji: '🎂', name: p.name + '\'s ' + ordinal(p.age) + ' birthday', desc: 'Plan a celebration for ' + p.name + '!', child: p.id });
    });
    var spouse = l.people.find(function (p) { return p.role === 'spouse'; });
    if (spouse && l.flags.weddingAge !== undefined && l.age > l.flags.weddingAge) {
      var yrs = l.age - l.flags.weddingAge;
      list.push({ id: 'anniv', emoji: '💐', name: ordinal(yrs) + ' wedding anniversary', desc: yrs + ' year' + (yrs === 1 ? '' : 's') + ' married to ' + spouse.name + '!', who: [spouse.id], levels: ['card', 'dinner', 'trip'] });
    }
    var fam = l.people.filter(function (p) { return FAMILY.indexOf(p.role) >= 0 && p.role !== 'grandchild'; });
    if (fam.length) {
      list.push({ id: 'dayout', emoji: '🎡', name: 'Family day out', desc: 'A day of fun together — the zoo, the seaside or a theme park!', who: fam.map(function (p) { return p.id; }), levels: ['picnic', 'zoo', 'themepark'] });
      list.push({ id: 'winter', emoji: '❄️', name: 'Winter celebration', desc: 'Decorations, a big family dinner and little presents for everyone.', who: fam.map(function (p) { return p.id; }), levels: ['home', 'feast', 'presents'] });
    }
    if (l.age < 18) {
      l.people.filter(function (p) { return ['mum', 'dad', 'parent', 'grandma', 'grandpa', 'sibling'].indexOf(p.role) >= 0; }).slice(0, 2).forEach(function (p) {
        list.push({ id: 'card:' + p.id, emoji: '💌', name: G.relLabel(p) + ' ' + p.name + '\'s birthday', desc: 'Make something special for ' + p.name + '!', who: [p.id], levels: ['card', 'breakfast', 'present'], kid: true });
      });
    }
    var gk = l.people.filter(function (p) { return p.role === 'grandchild'; });
    if (gk.length) list.push({ id: 'grandvisit', emoji: '👵', name: 'Grandchildren\'s visit', desc: 'The grandchildren are coming to stay!', who: gk.map(function (p) { return p.id; }), levels: ['games', 'baking', 'trip'] });
    return list.map(function (o) { o.done = done(l, o.id); return o; });
  };
  BAL.OCCASION_LEVELS = {
    card: { name: 'Make a card', emoji: '💌', cost: 0, happy: 4, close: 6 }, dinner: { name: 'Fancy dinner', emoji: '🍽️', cost: 80, happy: 8, close: 10 }, trip: { name: 'Weekend away', emoji: '🧳', cost: 400, happy: 14, close: 15 },
    picnic: { name: 'Picnic in the park', emoji: '🧺', cost: 0, happy: 6, close: 6 }, zoo: { name: 'Trip to the zoo', emoji: '🦒', cost: 120, happy: 10, close: 9 }, themepark: { name: 'Theme park', emoji: '🎢', cost: 300, happy: 15, close: 12 },
    home: { name: 'Decorate the house', emoji: '✨', cost: 0, happy: 5, close: 5 }, feast: { name: 'Big family feast', emoji: '🍗', cost: 90, happy: 9, close: 9 }, presents: { name: 'Feast & presents', emoji: '🎁', cost: 200, happy: 13, close: 12 },
    breakfast: { name: 'Breakfast in bed', emoji: '🥞', cost: 0, happy: 5, close: 8 }, present: { name: 'Buy a little present', emoji: '🎁', cost: 15, happy: 5, close: 10 },
    games: { name: 'Games at home', emoji: '🎲', cost: 0, happy: 6, close: 8 }, baking: { name: 'Baking together', emoji: '🧁', cost: 10, happy: 7, close: 9 }
  };
  G.occasionCost = function (l, lv) { var x = BAL.OCCASION_LEVELS[lv]; return l.age < 18 ? Math.min(x.cost, 15) : G.price(l, x.cost); };
  A.celebrate = function (l, id, lv) {
    var o = G.occasions(l).find(function (x) { return x.id === id; });
    if (!o) return no('That isn\'t happening this year.');
    if (o.child) return A.celebrateChild(l, o.child, lv);
    if (o.done) return no('You already celebrated this year! 🎉');
    var x = BAL.OCCASION_LEVELS[lv] || BAL.OCCASION_LEVELS[o.levels[0]];
    var cost = G.occasionCost(l, lv);
    if (l.coins < cost) return no('That costs ' + fmt(cost) + ' coins — try a cheaper way to celebrate!', '🪙');
    G._addCoins(l, -cost);
    G.applyFx(l, { happy: x.happy });
    (o.who || []).forEach(function (pid) { var p = G.person(l, pid); if (p) { p.close = clamp(p.close + x.close); if (p.kid) applyKid(p, { happy: x.happy }); } });
    markOccasion(l, id);
    l.totals.occasions = (l.totals.occasions || 0) + 1;
    if (l.totals.occasions >= 10) G.unlock(l, 'family_fun');
    G.addLog(l, o.name + ': ' + x.name.toLowerCase(), o.emoji);
    return ok(o.name + ' — ' + x.name.toLowerCase() + '! ' + pick(['Everyone had a wonderful time. 💛', 'What a lovely day!', 'Lots of laughs and happy faces!']), x.emoji, { celebrate: true });
  };

  /* ===================== Family conversations ===================== */
  // q = what they say; r = your replies: t text, c closeness, fx your stats, k child stats, m their reaction, go (tab)
  BAL.CONVERSATIONS = {
    parent: [
      { q: 'Did you brush your teeth this morning?', r: [{ t: 'Yes! Sparkly clean! 🪥', c: 4, m: '"That\'s my star!"' }, { t: 'Oops… I\'ll do it now!', c: 2, fx: { health: 1 }, m: '"Thank you for being honest!"' }] },
      { q: 'What was the best bit of your day?', r: [{ t: 'Playing with my friends! 🤸', c: 5, fx: { happy: 2 }, m: '"That sounds brilliant!"' }, { t: 'Learning about space! 🚀', c: 5, fx: { smarts: 1 }, m: '"Wow, tell me everything!"' }, { t: 'This hug! 🤗', c: 8, m: 'You got the biggest hug ever.' }] },
      { q: 'Shall we bake something this weekend?', r: [{ t: 'Cookies please! 🍪', c: 6, fx: { happy: 3 }, m: '"Cookies it is!"' }, { t: 'A giant cake! 🎂', c: 6, fx: { happy: 3 }, m: '"A giant cake? Let\'s try!"' }] },
      { q: 'Can you help me tidy up?', r: [{ t: 'Sure, I\'ll help! 🧹', c: 7, fx: { happy: 1 }, m: '"You\'re such a good helper!"' }, { t: 'After this game?', c: 1, m: '"OK — just one more go!"' }] },
      { q: 'I love you to the moon and back!', r: [{ t: 'I love you to the stars and back! ✨', c: 8, fx: { happy: 3 }, m: 'You both giggled.' }, { t: 'Big hug! 🤗', c: 8, fx: { happy: 3 }, m: 'Squeeeeze!' }] },
      { q: 'How are you feeling today?', r: [{ t: 'Happy! 😄', c: 4, m: '"I love seeing you smile!"' }, { t: 'A bit worried about school 😟', c: 8, fx: { happy: 4 }, m: '"Thank you for telling me. Let\'s talk about it together." You feel much better.' }] }
    ],
    parentAdult: [
      { q: 'We\'re so proud of you, you know!', r: [{ t: 'Thanks — I learned from the best! 💛', c: 7, fx: { happy: 3 }, m: 'They beamed with pride.' }, { t: 'Aww, stop it! 😊', c: 4, m: '"Never!"' }] },
      { q: 'Are you eating properly?', r: [{ t: 'Lots of vegetables! 🥦', c: 4, m: '"Good!"' }, { t: 'Mostly pizza… 🍕', c: 2, m: '"Come round for a proper dinner!"' }] },
      { q: 'Come for Sunday lunch soon?', r: [{ t: 'I\'d love to! 🍗', c: 7, fx: { happy: 2 }, m: '"We\'ll make your favourite."' }, { t: 'Next week, I promise!', c: 2, m: '"We\'ll hold you to that!"' }] }
    ],
    sibling: [
      { q: 'Wanna build a den?', r: [{ t: 'Yes! With cushions! 🛋️', c: 7, fx: { happy: 3 }, m: 'Best den ever!' }, { t: 'Only if I\'m the captain!', c: 3, fx: { happy: 2 }, m: '"OK, you can be captain this time."' }] },
      { q: 'You took my favourite pen! 😠', r: [{ t: 'Sorry! Here you go 🖊️', c: 6, m: '"Thanks. You can borrow it later."' }, { t: 'Let\'s share it!', c: 6, fx: { happy: 1 }, m: '"Fair enough!"' }] },
      { q: 'Race you to the end of the garden!', r: [{ t: 'Ready, steady, GO! 🏃', c: 5, fx: { fitness: 1, happy: 2 }, m: 'It was a draw!' }, { t: 'You\'re too fast for me!', c: 3, m: '"I\'ll give you a head start!"' }] },
      { q: 'Can you keep a secret? I\'m planning a surprise for Mum!', r: [{ t: 'I\'ll help! 🎁', c: 8, fx: { happy: 2 }, m: 'You made a card together.' }, { t: 'My lips are sealed 🤐', c: 5, m: '"Thanks!"' }] }
    ],
    friend: [
      { q: 'Do you want to come over at the weekend?', r: [{ t: 'Yes please! 🎉', c: 6, fx: { happy: 2 }, m: '"Brilliant!"' }, { t: 'Can we go to the park instead?', c: 5, fx: { fitness: 1 }, m: '"Great idea!"' }] },
      { q: 'I\'m feeling a bit sad today.', r: [{ t: 'Want to talk about it? 💛', c: 10, fx: { happy: 1 }, m: '"Thanks for listening. I feel better already."' }, { t: 'Here\'s a joke to cheer you up! 😂', c: 7, fx: { happy: 2 }, m: 'They laughed so much!' }] },
      { q: 'Guess what? I learned a new trick!', r: [{ t: 'Show me! 🤩', c: 6, m: 'It was amazing!' }, { t: 'Teach me too!', c: 7, fx: { smarts: 1 }, m: 'Now you can both do it!' }] }
    ],
    partner: [
      { q: 'How was your day? 😊', r: [{ t: 'Brilliant! I got so much done!', c: 4, fx: { happy: 2 }, m: '"Yay! Tell me all about it!"' }, { t: 'A bit tiring — sofa and a film?', c: 6, fx: { health: 1, happy: 2 }, m: 'You snuggled up under a blanket and watched a funny film.' }] },
      { q: 'Shall we go for a picnic this weekend? 🧺', r: [{ t: 'Perfect! I\'ll make sandwiches', c: 7, fx: { happy: 3 }, m: 'The sun shone all day.' }, { t: 'Let\'s go bowling instead! 🎳', c: 6, fx: { happy: 3 }, m: 'You got a strike!' }] },
      { q: 'I made you a cup of tea ☕', r: [{ t: 'You\'re the best! Thank you! 💕', c: 6, fx: { happy: 2 }, m: 'Just how you like it.' }, { t: 'I\'ll make dinner then! 🍝', c: 7, m: 'Teamwork!' }] },
      { q: 'What should we dream about doing together one day?', r: [{ t: 'Travel the world! 🌍', c: 6, fx: { happy: 2 }, m: '"Let\'s start saving!"' }, { t: 'Have a cosy home with a big garden 🏡', c: 6, fx: { happy: 2 }, m: '"With a vegetable patch!"' }, { t: 'Get a dog! 🐶', c: 5, fx: { happy: 2 }, m: '"Yes! A fluffy one!"', go: 'pets' }] }
    ],
    toddler: [
      { q: '(Points at the sky) Bird! Bird!', r: [{ t: 'Yes! A big bird! 🐦', k: { smarts: 2 }, c: 5, m: 'They flapped their arms like wings.' }, { t: 'Shall we feed the ducks? 🦆', k: { happy: 3 }, c: 6, m: 'Quack quack!' }] },
      { q: 'Up! Up! (Wants a cuddle)', r: [{ t: 'Big cuddle! 🤗', k: { happy: 4 }, c: 8, m: 'They snuggled right in.' }, { t: 'Aeroplane ride! ✈️', k: { happy: 5 }, c: 7, m: 'Wheeeee!' }] },
      { q: 'Why is the sky blue?', r: [{ t: 'Because sunlight bounces around the air! ☀️', k: { smarts: 3 }, c: 5, m: '"Ohhh!" (Then: "Why?")' }, { t: 'Let\'s find out in a book! 📚', k: { smarts: 3 }, c: 6, m: 'You read a book about the sky together.' }] }
    ],
    kid: [
      { q: 'Can we get a puppy? Pleeeease? 🐶', r: [{ t: 'Let\'s visit the pet shelter! 🐾', k: { happy: 6 }, c: 6, m: '"YAY!"', go: 'pets' }, { t: 'Pets are a big job. Maybe when you\'re older!', k: { happy: -1 }, c: 2, m: '"OK… but I\'ll be really good!"' }] },
      { q: 'I got a gold star at school today! ⭐', r: [{ t: 'Amazing! I\'m so proud of you! 🎉', k: { happy: 6 }, c: 7, m: 'They did a little dance.' }, { t: 'What did you get it for?', k: { happy: 4, smarts: 1 }, c: 6, m: '"For helping a friend with their reading!"' }] },
      { q: 'I don\'t like broccoli! 🥦', r: [{ t: 'Let\'s make broccoli trees with cheese snow! 🌲', k: { health: 4, happy: 2 }, c: 5, m: 'They ate the whole "forest"!' }, { t: 'Just try one bite?', k: { health: 2 }, c: 3, m: '"…It\'s actually OK."' }] },
      { q: 'Someone at school was mean to me 😢', r: [{ t: 'Come here. Tell me what happened 💛', k: { happy: 6 }, c: 10, m: 'You talked it through and made a plan to tell the teacher. They felt much better.' }, { t: 'Let\'s talk to your teacher together 🏫', k: { happy: 4 }, c: 8, m: 'The teacher helped sort it out kindly.' }] },
      { q: 'Can we build a rocket out of boxes? 🚀', r: [{ t: 'Let\'s do it! 3… 2… 1… blast off!', k: { happy: 6, smarts: 2 }, c: 7, m: 'It reached the moon (the sofa).' }, { t: 'After tea, I promise!', k: { happy: 1 }, c: 2, m: '"Promise promise?"' }] },
      { q: 'What did you want to be when you were little?', r: [{ t: 'An astronaut! 🚀', c: 5, k: { smarts: 1 }, m: '"Me too!!"' }, { t: 'Exactly what I am now! 😊', c: 5, m: '"Cool!"' }] }
    ],
    teen: [
      { q: 'Can I go to my friend\'s house after school?', r: [{ t: 'Sure — be home for dinner! 🍝', k: { happy: 5 }, c: 5, m: '"Thanks! Love you!"' }, { t: 'Homework first, then yes!', k: { smarts: 2, happy: 1 }, c: 3, m: '"Fair enough…"' }] },
      { q: 'I\'m nervous about my exams 😬', r: [{ t: 'Let\'s make a revision plan together 📅', k: { smarts: 3, happy: 3 }, c: 8, m: 'They feel much more confident.' }, { t: 'Just do your best — I\'m proud of you no matter what 💛', k: { happy: 6 }, c: 9, m: '"Thanks. That really helps."' }] },
      { q: 'Can you teach me how to cook something? 🍳', r: [{ t: 'Let\'s make spaghetti! 🍝', k: { happy: 4, smarts: 2 }, c: 8, m: 'Dinner was delicious!' }, { t: 'Pancakes are a good start! 🥞', k: { happy: 4 }, c: 7, m: 'Only one stuck to the ceiling.' }] },
      { q: 'What do you think I should be when I grow up?', r: [{ t: 'Whatever makes you happy! 🌈', k: { happy: 5 }, c: 7, m: '"Maybe a vet… or a scientist!"' }, { t: 'Let\'s look at jobs together 🔍', k: { smarts: 3 }, c: 6, m: 'You found loads of cool careers.' }] }
    ],
    grownChild: [
      { q: 'Thanks for everything you did for me growing up 💛', r: [{ t: 'I\'d do it all again! 🤗', c: 8, fx: { happy: 4 }, m: 'A big family hug.' }, { t: 'You made it easy! 😊', c: 6, fx: { happy: 3 }, m: '"Ha! Not always!"' }] },
      { q: 'Can I come round for dinner this weekend?', r: [{ t: 'Always! I\'ll cook your favourite 🍝', c: 7, fx: { happy: 3 }, m: '"Yes! Just like old times."' }, { t: 'Let\'s go to a restaurant! 🍕', c: 6, fx: { happy: 3 }, m: 'A lovely evening out.' }] }
    ],
    grandchild: [
      { q: 'Tell me a story about when you were little!', r: [{ t: 'Once upon a time… 📜', c: 8, fx: { happy: 4 }, m: 'They listened with big wide eyes.' }, { t: 'Shall we look at old photos? 📸', c: 7, fx: { happy: 4 }, m: '"You had funny hair!"' }] },
      { q: 'Can we bake cookies, please? 🍪', r: [{ t: 'Of course! Chocolate chip? 🍫', c: 8, fx: { happy: 4 }, m: 'Delicious!' }, { t: 'Let\'s make gingerbread people!', c: 7, fx: { happy: 4 }, m: 'One looked just like you!' }] }
    ]
  };
  G.convKind = function (l, p) {
    if (['mum', 'dad', 'parent', 'grandma', 'grandpa'].indexOf(p.role) >= 0) return l.age < 18 ? 'parent' : 'parentAdult';
    if (p.role === 'sibling') return 'sibling';
    if (p.role === 'friend') return 'friend';
    if (LOVE.indexOf(p.role) >= 0) return 'partner';
    if (p.role === 'grandchild') return p.age < 4 ? 'toddler' : 'grandchild';
    if (p.role === 'child') return p.age < 5 ? 'toddler' : p.age < 13 ? 'kid' : p.age < 18 ? 'teen' : 'grownChild';
    return 'friend';
  };
  G.conversation = function (l, pid) {
    var p = G.person(l, pid); if (!p) return null;
    if (p.age < 1) return { pid: pid, kind: 'baby', idx: 0, q: '(Baby ' + p.name + ' gurgles and grabs your finger.)', r: [{ t: 'Coochie-coo! 👶', c: 6, m: 'A big gummy smile!' }, { t: 'Sing a lullaby 🎵', c: 6, m: 'They drifted off to sleep.' }] };
    var kind = G.convKind(l, p), list = BAL.CONVERSATIONS[kind];
    var n = (l.totals.convos || 0) + p.id.length + l.age;
    var c = list[n % list.length];
    return { pid: pid, kind: kind, idx: n % list.length, q: c.q, r: c.r };
  };
  A.reply = function (l, pid, choice) {
    var cv = G.conversation(l, pid); if (!cv) return no('Who?');
    var r = cv.r[choice || 0]; if (!r) return no('?');
    var p = G.person(l, pid);
    var fresh = (l.flags.convos || {})[pid] !== l.age;
    l.flags.convos = l.flags.convos || {}; l.flags.convos[pid] = l.age;
    l.totals.convos = (l.totals.convos || 0) + 1;
    p.close = clamp(p.close + (fresh ? (r.c || 3) : 1));
    if (fresh) { G.applyFx(l, r.fx || { happy: 1 }); if (r.k && p.kid) applyKid(p, r.k); }
    return ok(r.m, '💬', { go: r.go });
  };

  /* ===================== A year goes by ===================== */
  var ILL = ['a sniffly cold', 'a tummy bug', 'chickenpox', 'an ear ache'];
  var ageUp = G.ageUp;
  G.ageUp = function (l, o) {
    var kidsBefore = G.kidsAtHome(l).map(function (p) { G.ensureKid(p); return { p: p, grp: G.ageGroup(p.age), meals: p.kid.meals, hw: p.kid.hw, bday: p.kid.bday }; });
    var r = ageUp(l, o);
    if (!r || r.blocked) return r;
    r.family = [];
    kidsBefore.forEach(function (b) {
      var p = b.p, k = p.kid;
      if (!l.people.includes(p)) return;
      // last year's care
      if (b.meals) applyKid(p, { health: 3 });
      else r.family.push({ e: '🥪', t: p.name + ' had lots of sandwiches this year. Try cooking some meals together!' });
      applyKid(p, { smarts: 3 + b.hw * 2, happy: b.bday ? -4 : 0 });
      if (b.bday) { p.close = clamp(p.close - 3); r.family.push({ e: '🎂', t: 'You didn\'t get to celebrate ' + p.name + '\'s birthday last year, but their friends sang to them at school.' }); }
      if (k.sick) { applyKid(p, { health: -6 }); }
      k.meals = 0; k.hw = 0; k.doctor = false; k.pocket = false;
      // the new year
      if (p.age < 18) {
        k.bday = true;
        r.family.push({ e: '🎂', t: 'It\'s ' + p.name + '\'s ' + ordinal(p.age) + ' birthday this year! Plan a celebration in Family & Friends.' });
        if (G.ageGroup(p.age) !== b.grp) { k.outgrown = true; r.family.push({ e: '👕', t: p.name + ' has grown out of their clothes — time for something new!' }); }
        if (!k.sick && G.rng() < 0.12) { k.sick = pick(ILL); r.family.push({ e: '🤒', t: p.name + ' has ' + k.sick + '. A trip to the doctor will help.' }); }
        else if (k.sick && G.rng() < 0.5) k.sick = null;
      } else {
        // all grown up!
        var jobs = BAL.JOBS.filter(function (j) { return j.smarts <= k.smarts; });
        p.grownJob = (pick(jobs.length ? jobs : BAL.JOBS) || {}).id;
        var jb = byId(BAL.JOBS, p.grownJob);
        r.family.push({ e: '🎓', t: p.name + ' is all grown up and is going to be a ' + (jb ? jb.name.toLowerCase() : 'superstar') + '! You did an amazing job raising them. 💛' });
        delete p.kid;
        G.unlock(l, 'raised');
      }
    });
    if (r.notes) r.notes = r.notes.concat(r.family);
    return r;
  };

  // A baby comes along once you live together (or are married).
  var haveBaby = A.haveBaby;
  A.haveBaby = function (l, name, gender) {
    var p = G.partner(l);
    if (p && !p.livesWith && p.role !== 'spouse') return no('Babies come along once you and ' + p.name + ' live together. Try moving in first! 🏡', '💭');
    return haveBaby(l, name, gender);
  };
  // New babies & adopted children get their care record.
  ['haveBaby', 'adoptChild'].forEach(function (fn) {
    var orig = A[fn];
    A[fn] = function (l, name, gender) { var r = orig(l, name, gender); if (r.ok) G.kidsAtHome(l).forEach(G.ensureKid); return r; };
  });

  // A partner you live with chips in for the household bills.
  var yearlyMoney = G.yearlyMoney;
  G.yearlyMoney = function (l) {
    var lines = yearlyMoney(l);
    var p = G.homeHelper(l);
    if (p && l.age >= 18 && l.home.type !== 'family') lines.push({ e: '💑', t: p.name + ' chips in for the bills', v: G.price(l, 1500) });
    return lines;
  };

  G.ensureFamily = function (l) { l.people.forEach(function (p) { if (p.role === 'child' && p.age < 18) G.ensureKid(p); if (p.role === 'spouse') p.livesWith = true; }); };

  BAL.ROLES.partner.label = 'Sweetheart';
  BAL.ACHIEVEMENTS.push(
    { id: 'home_together', name: 'Our First Home', emoji: '🏡', desc: 'Buy a home together with your partner.' },
    { id: 'homework_hero', name: 'Homework Hero', emoji: '📝', desc: 'Help your children with homework 10 times.' },
    { id: 'family_fun', name: 'Family Fun', emoji: '🎡', desc: 'Celebrate 10 family occasions.' },
    { id: 'raised', name: 'All Grown Up', emoji: '🎓', desc: 'Raise a child until they are grown up.' }
  );

  /* ===================== Parenting challenges ===================== */
  var kidsHome = function (l) { return G.kidsAtHome(l).length > 0; };
  var schoolKids = function (l) { return G.kidsAtHome(l).some(function (p) { return p.age >= 5; }); };
  var bdays = function (l) { return G.kidsAtHome(l).some(function (p) { G.ensureKid(p); return p.kid.bday; }); };
  ['young', 'adult', 'older'].forEach(function (st) {
    BAL.CHALLENGES.push(
      { id: 'fam_feed_' + st, stage: st, emoji: '🥣', name: 'Family Dinners', desc: 'Cook 2 meals for your children.', track: { act: 'feedChild', n: 2 }, tab: 'people', stars: 1, when: kidsHome },
      { id: 'fam_hw_' + st, stage: st, emoji: '📝', name: 'Homework Helper', desc: 'Help your children with their homework.', track: { act: 'helpHomework', n: 1 }, tab: 'people', stars: 2, when: schoolKids },
      { id: 'fam_bday_' + st, stage: st, emoji: '🎂', name: 'Birthday Fun', desc: 'Celebrate your child\'s birthday.', track: { act: 'celebrateChild', n: 1 }, tab: 'people', stars: 2, when: bdays },
      { id: 'fam_occ_' + st, stage: st, emoji: '🎡', name: 'Family Occasion', desc: 'Celebrate a family occasion together.', track: { act: 'celebrate', n: 1 }, tab: 'people', stars: 1, when: function (l) { return l.people.some(function (p) { return FAMILY.indexOf(p.role) >= 0; }); } }
    );
  });
  ['child', 'teen'].forEach(function (st) {
    BAL.CHALLENGES.push({ id: 'fam_chat_' + st, stage: st, emoji: '💬', name: 'Family Chat', desc: 'Have a chat with someone in your family.', track: { act: 'reply', n: 1 }, tab: 'people', stars: 1 });
  });
})(globalThis.BAL = globalThis.BAL || {});
