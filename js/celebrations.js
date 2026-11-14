/* Build a Life — birthdays & celebrations.
   Everyone has a birthday date. Players plan their own parties (theme, cake, decorations & balloons,
   invitations with RSVPs, venue), get presents to unwrap, plan their children's parties, celebrate
   family birthdays, and can join in optional seasonal celebrations (Christmas, Halloween, Easter and more)
   that line up with the seasons in My Day. Every celebration has a free way to join in. */
(function (BAL) {
  'use strict';
  var G = BAL.Game, A = G.actions;
  var byId = G.byId, fmt = G.fmt, clamp = G.clamp, pick = G.pick, randInt = G.randInt;
  function ok(msg, emoji, extra) { return Object.assign({ ok: true, msg: msg, emoji: emoji || '🎉' }, extra || {}); }
  function no(msg, emoji) { return { ok: false, msg: msg, emoji: emoji || '🙈' }; }
  function ordinal(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  G.ordinal = ordinal;
  function seeded(key, fn) { var saved = G.rng; G.rng = G.seeded(key); try { return fn(); } finally { G.rng = saved; } }

  /* ===================== Birthday dates ===================== */
  BAL.MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DAYS_IN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  G.newBirthday = function (key) { return seeded('bday:' + key, function () { var m = randInt(0, 11); return { m: m, d: randInt(1, DAYS_IN[m]) }; }); };
  G.bdayText = function (b) { return b ? b.d + ' ' + BAL.MONTHS[b.m] : ''; };
  // My Day seasons: 0 spring (Mar–May), 1 summer (Jun–Aug), 2 autumn (Sep–Nov), 3 winter (Dec–Feb)
  G.bdaySeason = function (b) { return b.m === 11 || b.m <= 1 ? 3 : Math.floor((b.m - 2) / 3); };
  G.season = function (l) { var d = G.ensureDay ? G.ensureDay(l) : { n: 0 }; return Math.min(d.n, 3); };
  G.ensureBirthdays = function (l) {
    if (!l.bday) l.bday = G.newBirthday(l.id);
    l.people.forEach(function (p) { if (!p.bday) p.bday = G.newBirthday(p.id); });
    if (!Array.isArray(l.festivals)) l.festivals = ['easter', 'summer', 'halloween', 'christmas'];
    if (!l.flags.fest) l.flags.fest = {};
    if (!l.flags.famBdays) l.flags.famBdays = {};
  };

  /* ===================== Party planning ===================== */
  BAL.PARTY_THEMES = [
    { id: 'family', name: 'Family party', emoji: '🎈', colors: ['#FFD6E8', '#C9F2FF'], min: 0, max: 999 },
    { id: 'unicorn', name: 'Unicorns', emoji: '🦄', colors: ['#FFDEEB', '#E5DBFF'], min: 3, max: 15 },
    { id: 'dino', name: 'Dinosaurs', emoji: '🦖', colors: ['#D3F9D8', '#FFF3BF'], min: 3, max: 15 },
    { id: 'space', name: 'Outer Space', emoji: '🚀', colors: ['#D0EBFF', '#E5DBFF'], min: 3, max: 99 },
    { id: 'pirate', name: 'Pirates', emoji: '🏴‍☠️', colors: ['#FFE8CC', '#D0EBFF'], min: 3, max: 15 },
    { id: 'hero', name: 'Superheroes', emoji: '🦸', colors: ['#FFE3E3', '#D0EBFF'], min: 3, max: 99 },
    { id: 'mermaid', name: 'Under the Sea', emoji: '🧜', colors: ['#C5F6FA', '#E5DBFF'], min: 3, max: 99 },
    { id: 'football', name: 'Football', emoji: '⚽', colors: ['#D3F9D8', '#F8F9FA'], min: 4, max: 99 },
    { id: 'disco', name: 'Disco', emoji: '🪩', colors: ['#F3D9FA', '#FFF3BF'], min: 7, max: 99 },
    { id: 'sleepover', name: 'Sleepover', emoji: '🛏️', colors: ['#E5DBFF', '#FFDEEB'], min: 7, max: 17 },
    { id: 'gaming', name: 'Gaming', emoji: '🎮', colors: ['#D0EBFF', '#D3F9D8'], min: 8, max: 99 },
    { id: 'karaoke', name: 'Karaoke', emoji: '🎤', colors: ['#FFDEEB', '#FFF3BF'], min: 12, max: 999 },
    { id: 'bbq', name: 'Garden BBQ', emoji: '🍔', colors: ['#FFF3BF', '#D3F9D8'], min: 18, max: 999 },
    { id: 'tea', name: 'Afternoon Tea', emoji: '🫖', colors: ['#FFF0F6', '#FFF9DB'], min: 40, max: 999 }
  ];
  BAL.CAKE_FLAVOURS = [
    { id: 'chocolate', name: 'Chocolate', emoji: '🍫', sponge: '#8B5A3C', icing: '#5A3825' },
    { id: 'vanilla', name: 'Vanilla', emoji: '🍦', sponge: '#F7E7B4', icing: '#FFFFFF' },
    { id: 'strawberry', name: 'Strawberry', emoji: '🍓', sponge: '#FFB3C7', icing: '#FF8FAB' },
    { id: 'lemon', name: 'Lemon', emoji: '🍋', sponge: '#FFF3BF', icing: '#FFE066' },
    { id: 'rainbow', name: 'Rainbow', emoji: '🌈', sponge: 'rainbow', icing: '#FFFFFF' },
    { id: 'carrot', name: 'Carrot', emoji: '🥕', sponge: '#E8A95B', icing: '#FFF8E7' }
  ];
  BAL.CAKE_SHAPES = [
    { id: 'round', name: 'Homemade round', emoji: '🎂', cost: 0 },
    { id: 'number', name: 'Number cake', emoji: '🔢', cost: 25 },
    { id: 'tiers', name: 'Two tiers', emoji: '🍰', cost: 40 },
    { id: 'castle', name: 'Castle cake', emoji: '🏰', cost: 60 }
  ];
  BAL.CAKE_TOPPERS = [
    { id: 'sprinkles', name: 'Sprinkles', emoji: '✨' }, { id: 'stars', name: 'Stars', emoji: '⭐' }, { id: 'fruit', name: 'Strawberries', emoji: '🍓' },
    { id: 'flowers', name: 'Flowers', emoji: '🌸' }, { id: 'theme', name: 'Party theme', emoji: '🎈' }
  ];
  BAL.DECORATIONS = [
    { id: 'banner', name: 'Homemade banner', emoji: '🖍️', cost: 0, fun: 1 },
    { id: 'balloons', name: 'Balloons', emoji: '🎈', cost: 5, fun: 2 },
    { id: 'bunting', name: 'Bunting', emoji: '🎏', cost: 8, fun: 1 },
    { id: 'streamers', name: 'Streamers', emoji: '🎊', cost: 5, fun: 1 },
    { id: 'lights', name: 'Fairy lights', emoji: '✨', cost: 12, fun: 2 },
    { id: 'arch', name: 'Balloon arch', emoji: '🌈', cost: 35, fun: 3 },
    { id: 'photo', name: 'Photo booth', emoji: '📸', cost: 30, fun: 3 }
  ];
  BAL.BALLOON_COLORS = ['#FF6B6B', '#FF9F1C', '#FFD43B', '#69DB7C', '#4DABF7', '#9775FA', '#F783AC', '#FFFFFF'];
  BAL.VENUES = [
    { id: 'home', name: 'At home', emoji: '🏠', cost: 0, fun: 1, min: 0, max: 999 },
    { id: 'park', name: 'Picnic in the park', emoji: '🌳', cost: 0, fun: 2, min: 3, max: 999 },
    { id: 'playcentre', name: 'Soft play centre', emoji: '🛝', cost: 80, fun: 5, min: 2, max: 10 },
    { id: 'bowling', name: 'Bowling alley', emoji: '🎳', cost: 60, fun: 4, min: 6, max: 999 },
    { id: 'swim', name: 'Swimming party', emoji: '🏊', cost: 70, fun: 5, min: 5, max: 16 },
    { id: 'hall', name: 'Village hall disco', emoji: '🪩', cost: 50, fun: 4, min: 5, max: 999 },
    { id: 'restaurant', name: 'Restaurant meal', emoji: '🍽️', cost: 90, fun: 4, min: 13, max: 999 }
  ];
  BAL.INVITE_STYLES = [{ id: 'confetti', emoji: '🎊', color: '#FFDEEB' }, { id: 'stars', emoji: '⭐', color: '#FFF3BF' }, { id: 'balloon', emoji: '🎈', color: '#D0EBFF' }, { id: 'cake', emoji: '🎂', color: '#E5DBFF' }, { id: 'rainbow', emoji: '🌈', color: '#D3F9D8' }];

  G.themesFor = function (age) { return BAL.PARTY_THEMES.filter(function (t) { return age >= t.min && age <= t.max; }); };
  G.venuesFor = function (age) { return BAL.VENUES.filter(function (v) { return age >= v.min && age <= v.max; }); };
  G.partyGuestsPool = function (l) { return l.people.filter(function (p) { return ['friend', 'mum', 'dad', 'parent', 'grandma', 'grandpa', 'sibling', 'partner', 'fiance', 'spouse', 'child', 'grandchild'].indexOf(p.role) >= 0; }); };
  G.newPartyPlan = function (l) {
    var age = l.age + 1;
    return { theme: G.themesFor(age)[0].id, cake: { flavour: 'chocolate', shape: 'round', topper: 'sprinkles' }, decor: ['banner'], balloons: '#FF6B6B',
      venue: 'home', guests: G.partyGuestsPool(l).filter(function (p) { return p.role !== 'friend'; }).slice(0, 6).map(function (p) { return p.id; }), invite: 'confetti' };
  };
  G.partyCost = function (plan, l) {
    var c = 0;
    var shape = byId(BAL.CAKE_SHAPES, plan.cake.shape); c += shape ? shape.cost : 0;
    (plan.decor || []).forEach(function (id) { var d = byId(BAL.DECORATIONS, id); if (d) c += d.cost; });
    var v = byId(BAL.VENUES, plan.venue); c += v ? v.cost : 0;
    c = l.age >= 16 ? G.price(l, c) : c;
    return c;
  };
  // Children's parties are partly paid for by their family.
  G.familyPartyBudget = function (l) { return l.age < 18 ? 100 : 0; };
  G.cleanPlan = function (l, plan) {
    plan = plan || {};
    var age = l.age + 1, d = G.newPartyPlan(l);
    var p = {
      theme: byId(G.themesFor(age), plan.theme) ? plan.theme : d.theme,
      cake: {
        flavour: byId(BAL.CAKE_FLAVOURS, plan.cake && plan.cake.flavour) ? plan.cake.flavour : d.cake.flavour,
        shape: byId(BAL.CAKE_SHAPES, plan.cake && plan.cake.shape) ? plan.cake.shape : d.cake.shape,
        topper: byId(BAL.CAKE_TOPPERS, plan.cake && plan.cake.topper) ? plan.cake.topper : d.cake.topper
      },
      decor: (Array.isArray(plan.decor) ? plan.decor : d.decor).filter(function (id, i, arr) { return byId(BAL.DECORATIONS, id) && arr.indexOf(id) === i; }),
      balloons: BAL.BALLOON_COLORS.indexOf(plan.balloons) >= 0 ? plan.balloons : d.balloons,
      venue: byId(G.venuesFor(age), plan.venue) ? plan.venue : d.venue,
      guests: (Array.isArray(plan.guests) ? plan.guests : d.guests).filter(function (id, i, arr) { return G.person(l, id) && arr.indexOf(id) === i; }).slice(0, 12),
      invite: byId(BAL.INVITE_STYLES, plan.invite) ? plan.invite : d.invite
    };
    return p;
  };

  A.bookParty = function (l, plan) {
    if (l.age < 2) return no('Your family will plan your first birthdays! 🍼');
    if (l.party && l.party.booked) return no('Your party is already booked! 🎉');
    var p = G.cleanPlan(l, plan);
    var cost = G.partyCost(p, l);
    var family = Math.min(cost, G.familyPartyBudget(l));
    var mine = cost - family;
    if (l.coins < mine) return no('This party costs ' + fmt(cost) + ' coins' + (family ? ' (your family pays ' + fmt(family) + ')' : '') + '. Try a homemade cake or a party at home or in the park — they\'re free!', '🪙');
    G._addCoins(l, -mine);
    p.booked = true; p.paid = mine; p.rsvp = null;
    l.party = p;
    G.applyFx(l, { happy: 3 });
    return ok('Party booked! ' + byId(BAL.PARTY_THEMES, p.theme).emoji + ' Now send your invitations!' + (family ? ' (Your family paid ' + fmt(family) + ' coins.)' : ''), '📅');
  };
  A.cancelParty = function (l) {
    if (!l.party) return no('There\'s no party to cancel.');
    G._addCoins(l, l.party.paid || 0);
    l.party = null;
    return ok('Party plans cancelled — your coins are back.', '↩️');
  };
  A.sendInvites = function (l) {
    var p = l.party;
    if (!p || !p.booked) return no('Book your party first!');
    if (p.rsvp) return no('Your invitations are already sent! 💌');
    if (!p.guests.length) return no('Pick some guests to invite first!');
    p.rsvp = {};
    seeded('rsvp:' + l.id + ':' + l.age, function () {
      p.guests.forEach(function (id) {
        var g = G.person(l, id);
        var yes = ['mum', 'dad', 'parent', 'spouse', 'partner', 'fiance'].indexOf(g.role) >= 0 || (g.role === 'child' && g.age < 18) || G.rng() < g.close / 100 + 0.35;
        p.rsvp[id] = yes ? 'yes' : pick(['holiday', 'poorly', 'busy']);
      });
    });
    var yes = Object.keys(p.rsvp).filter(function (k) { return p.rsvp[k] === 'yes'; }).length;
    G.applyFx(l, { happy: 2 });
    return ok('Invitations sent! 💌 ' + yes + ' of ' + p.guests.length + ' can come.', '💌');
  };

  /* ===================== Presents ===================== */
  G.presentFor = function (l, key, owned) {
    var max = l.age < 13 ? 120 : l.age < 18 ? 250 : 600;
    var cats = l.age < 13 ? ['toys', 'books', 'clothes'] : l.age < 18 ? ['gadgets', 'clothes', 'books', 'toys'] : ['home', 'decor', 'books', 'gadgets', 'clothes'];
    var pool = BAL.ITEMS.filter(function (it) { return cats.indexOf(it.cat) >= 0 && !it.consumable && !it.party && !it.unlock && it.price <= max && l.inventory.indexOf(it.id) < 0 && owned.indexOf(it.id) < 0; });
    return seeded('present:' + l.id + ':' + l.age + ':' + key, function () { return pool.length ? pick(pool) : null; });
  };
  function givePresents(l, givers) {
    var out = [], owned = [];
    givers.slice(0, 7).forEach(function (g, i) {
      var coinsCard = (g.role === 'grandma' || g.role === 'grandpa') || (l.age >= 18 && i % 3 === 2);
      var it = coinsCard ? null : G.presentFor(l, g.id + i, owned);
      if (it) {
        owned.push(it.id); l.inventory.push(it.id); G.applyFx(l, it.fx);
        out.push({ from: g.name, look: g.look, age: g.age, emoji: it.emoji, name: it.name });
      } else {
        var c = l.age < 18 ? 10 + l.age * 2 : G.price(l, 50);
        G._addCoins(l, c);
        out.push({ from: g.name, look: g.look, age: g.age, emoji: '💌', name: 'a card with ' + fmt(c) + ' coins', coins: c });
      }
    });
    l.totals.presents = (l.totals.presents || 0) + out.length;
    if (l.totals.presents >= 15) G.unlock(l, 'present_pile');
    return out;
  }

  /* ===================== The birthday itself (at Age Up) ===================== */
  var ageUp = G.ageUp;
  G.ageUp = function (l, o) {
    G.ensureBirthdays(l);
    var plan = l.party;
    var r = ageUp(l, o);
    if (!r || r.blocked) return r;
    var home = l.people.filter(function (p) {
      return (['mum', 'dad', 'parent', 'grandma', 'grandpa'].indexOf(p.role) >= 0 && l.age <= 18) || ['spouse', 'partner', 'fiance'].indexOf(p.role) >= 0 || (p.role === 'child' && p.age < 18) || (p.role === 'sibling' && l.age < 18 && p.age < 18);
    });
    var guests = [];
    if (plan && plan.booked) {
      var rs = plan.rsvp || {};
      guests = plan.guests.map(function (id) { return G.person(l, id); }).filter(function (g) { return g && (!plan.rsvp || rs[g.id] === 'yes'); });
      if (!plan.rsvp) guests = guests.filter(function (g) { return home.indexOf(g) >= 0; }); // no invites sent: only the people you live with
    } else guests = home.slice();
    var everyone = guests.concat(home.filter(function (h) { return guests.indexOf(h) < 0; }));
    var theme = byId(BAL.PARTY_THEMES, plan ? plan.theme : 'family');
    var cake = plan ? plan.cake : { flavour: seeded('cakef:' + l.id + l.age, function () { return pick(BAL.CAKE_FLAVOURS).id; }), shape: l.age === 1 || l.age % 10 === 0 ? 'number' : 'round', topper: 'sprinkles' };
    var decor = plan ? plan.decor : ['balloons', 'banner'];
    var venue = byId(BAL.VENUES, plan ? plan.venue : 'home');
    var fun = 3 + (venue ? venue.fun : 0) + decor.reduce(function (s, id) { var d = byId(BAL.DECORATIONS, id); return s + (d ? d.fun : 0); }, 0) + Math.min(10, guests.length * 2) + (plan ? 2 : 0);
    G.applyFx(l, { happy: Math.min(20, fun) });
    guests.forEach(function (g) { g.close = clamp(g.close + 5); });
    var presents = l.ended ? [] : givePresents(l, everyone);
    r.celebration = {
      planned: !!(plan && plan.booked), theme: theme, cake: cake, decor: decor, balloons: plan ? plan.balloons : '#FF6B6B', venue: venue,
      guests: guests.map(function (g) { return { name: g.name, look: g.look, age: g.age, role: g.role }; }), presents: presents,
      declined: plan && plan.rsvp ? plan.guests.filter(function (id) { return plan.rsvp[id] !== 'yes'; }).map(function (id) { var g = G.person(l, id); return g ? { name: g.name, why: plan.rsvp[id] } : null; }).filter(Boolean) : []
    };
    if (plan && plan.booked) {
      l.totals.parties = (l.totals.parties || 0) + 1;
      if (guests.length >= 5) G.unlock(l, 'party_host');
      G.addLog(l, 'Had a ' + theme.name.toLowerCase() + ' party for my ' + ordinal(l.age) + ' birthday', theme.emoji);
    }
    l.party = null;
    l.flags.famBdays = {};
    return r;
  };

  /* ===================== Children's birthday parties ===================== */
  BAL.CHILD_PRESENTS = [
    { id: 'card', name: 'Homemade card & a big hug', emoji: '💌', cost: 0, happy: 4 },
    { id: 'book', name: 'A storybook', emoji: '📚', cost: 10, happy: 5, smarts: 4 },
    { id: 'toy', name: 'A toy they\'ve wanted', emoji: '🧸', cost: 25, happy: 8 },
    { id: 'art', name: 'An art set', emoji: '🎨', cost: 20, happy: 6, smarts: 2 },
    { id: 'football', name: 'A football', emoji: '⚽', cost: 15, happy: 6, health: 3 },
    { id: 'bike', name: 'A shiny bike', emoji: '🚲', cost: 150, happy: 14, health: 5 },
    { id: 'console', name: 'A games console', emoji: '🎮', cost: 300, happy: 16, minAge: 6 }
  ];
  A.childParty = function (l, pid, plan) {
    var p = G.person(l, pid);
    if (!p || p.role !== 'child' || !p.kid) return no('Who?');
    if (!p.kid.bday) return no(p.name + '\'s birthday has already been celebrated this year. 🎉');
    plan = plan || {};
    var present = byId(BAL.CHILD_PRESENTS, plan.present) || BAL.CHILD_PRESENTS[0];
    if (present.minAge && p.age < present.minAge) present = BAL.CHILD_PRESENTS[0];
    var level = byId(BAL.CHILD_PARTIES, plan.level) ? plan.level : 'cake';
    var shape = byId(BAL.CAKE_SHAPES, plan.cake && plan.cake.shape) || BAL.CAKE_SHAPES[0];
    var extra = G.price(l, present.cost) + G.price(l, shape.cost);
    var partyCost = G.price(l, byId(BAL.CHILD_PARTIES, level).cost);
    if (l.coins < extra + partyCost) return no('That all costs ' + fmt(extra + partyCost) + ' coins — a homemade cake and card are free!', '🪙');
    G._addCoins(l, -extra);
    var r = A.celebrateChild(l, pid, level);
    if (!r.ok) { G._addCoins(l, extra); return r; }
    p.kid.happy = clamp(p.kid.happy + present.happy);
    if (present.smarts) p.kid.smarts = clamp(p.kid.smarts + present.smarts);
    if (present.health) p.kid.health = clamp(p.kid.health + present.health);
    p.close = clamp(p.close + 4);
    var theme = byId(G.themesFor(p.age), plan.theme) || byId(BAL.PARTY_THEMES, 'family');
    var cake = { flavour: byId(BAL.CAKE_FLAVOURS, plan.cake && plan.cake.flavour) ? plan.cake.flavour : 'chocolate', shape: shape.id, topper: byId(BAL.CAKE_TOPPERS, plan.cake && plan.cake.topper) ? plan.cake.topper : 'sprinkles' };
    l.totals.kidParties = (l.totals.kidParties || 0) + 1;
    r.childParty = { name: p.name, age: p.age, look: p.look, theme: theme, cake: cake, present: present, level: level };
    r.msg = 'Happy ' + ordinal(p.age) + ' birthday, ' + p.name + '! ' + theme.emoji + ' They loved ' + present.name.toLowerCase() + '!';
    return r;
  };

  /* ===================== Family & friends' birthdays ===================== */
  G.familyBirthdays = function (l) {
    G.ensureBirthdays(l);
    var season = G.season(l);
    return G.partyGuestsPool(l).filter(function (p) { return !(p.role === 'child' && p.age < 18); }).map(function (p) {
      return { p: p, now: G.bdaySeason(p.bday) === season, done: l.flags.famBdays[p.id] === l.age };
    }).sort(function (a, b) { return (b.now - a.now) || (a.p.bday.m - b.p.bday.m) || (a.p.bday.d - b.p.bday.d); });
  };
  BAL.FAMILY_BDAY_WAYS = [
    { id: 'card', name: 'Make a card', emoji: '💌', cost: 0, close: 6 },
    { id: 'call', name: 'Sing Happy Birthday', emoji: '🎶', cost: 0, close: 5 },
    { id: 'present', name: 'Give a present', emoji: '🎁', cost: 20, close: 10 },
    { id: 'surprise', name: 'Surprise party', emoji: '🥳', cost: 80, close: 15, adult: true }
  ];
  A.familyBirthday = function (l, pid, way) {
    var p = G.person(l, pid); if (!p) return no('Who?');
    G.ensureBirthdays(l);
    if (G.bdaySeason(p.bday) !== G.season(l)) return no(p.name + '\'s birthday is on ' + G.bdayText(p.bday) + ' — not this season!', '📅');
    if (l.flags.famBdays[pid] === l.age) return no('You already celebrated ' + p.name + '\'s birthday this year! 🎉');
    var w = byId(BAL.FAMILY_BDAY_WAYS, way) || BAL.FAMILY_BDAY_WAYS[0];
    if (w.adult && l.age < 16) return no('Surprise parties are for grown-ups to organise — make a card instead!');
    var cost = l.age < 16 ? Math.min(w.cost, 10) : G.price(l, w.cost);
    if (l.coins < cost) return no('That costs ' + fmt(cost) + ' coins — a card is free!', '🪙');
    G._addCoins(l, -cost);
    l.flags.famBdays[pid] = l.age;
    p.close = clamp(p.close + w.close);
    G.applyFx(l, { happy: 3 });
    l.totals.famBdays = (l.totals.famBdays || 0) + 1;
    if (l.totals.famBdays >= 10) G.unlock(l, 'birthday_buddy');
    return ok(w.emoji + ' Happy birthday, ' + p.name + '! ' + pick(['They gave you the biggest hug!', 'They said it made their day!', 'They had a huge smile all day!']), w.emoji);
  };

  /* ===================== Seasonal celebrations (optional) ===================== */
  // Activity kinds: tap (tap targets among other things), choose (pick one), gift (unwrap a present), simple.
  BAL.FESTIVALS = [
    { id: 'easter', name: 'Easter', emoji: '🐣', season: 0, desc: 'Spring is here! Egg hunts, chocolate and fluffy chicks.', acts: [
      { id: 'hunt', name: 'Egg hunt', emoji: '🥚', kind: 'tap', title: 'Find all the eggs in the garden!', target: ['🥚', '🪺'], other: ['🌷', '🌼', '🌳', '🐝', '🍃'], n: 6, msg: 'You found every egg!', happy: 5 },
      { id: 'paint', name: 'Decorate eggs', emoji: '🎨', kind: 'choose', q: 'How will you decorate your egg?', options: [['🌈', 'Rainbow stripes'], ['⭐', 'Gold stars'], ['🌸', 'Flowers'], ['🐣', 'A little chick']], msg: 'What a beautiful egg!', happy: 4 },
      { id: 'choc', name: 'Chocolate egg', emoji: '🍫', kind: 'gift', gift: '🍫 A giant chocolate egg', happy: 5 }] },
    { id: 'eid', name: 'Eid al-Fitr', emoji: '🌙', season: 0, desc: 'A happy festival with new clothes, special food, family visits and gifts.', acts: [
      { id: 'clothes', name: 'New clothes', emoji: '👗', kind: 'choose', q: 'Which colour will your new outfit be?', options: [['💚', 'Green'], ['💙', 'Blue'], ['💛', 'Gold'], ['💜', 'Purple']], msg: 'You look wonderful!', happy: 4 },
      { id: 'feast', name: 'Family feast', emoji: '🍲', kind: 'simple', msg: 'A delicious feast with the whole family — and sweet treats!', happy: 5, family: 5 },
      { id: 'eidi', name: 'Eidi gifts', emoji: '💌', kind: 'gift', gift: '💌 Eidi money from your family', coins: 20, happy: 4 }] },
    { id: 'summer', name: 'Summer Fair', emoji: '🎡', season: 1, desc: 'Rides, games, candyfloss and sunshine!', acts: [
      { id: 'coconut', name: 'Coconut shy', emoji: '🥥', kind: 'tap', title: 'Knock down all the coconuts!', target: ['🥥'], other: ['🎪', '🎈', '🌭'], n: 5, msg: 'You won a prize!', happy: 5 },
      { id: 'ride', name: 'Big wheel', emoji: '🎡', kind: 'simple', msg: 'You could see the whole town from the top!', happy: 5 },
      { id: 'tombola', name: 'Tombola', emoji: '🎟️', kind: 'gift', gift: '🧸 A teddy from the tombola', happy: 4 }] },
    { id: 'halloween', name: 'Halloween', emoji: '🎃', season: 2, desc: 'Fun costumes, pumpkins and trick-or-treating.', acts: [
      { id: 'costume', name: 'Choose a costume', emoji: '🧙', kind: 'choose', q: 'What will you dress up as?', options: [['🧙', 'Wizard'], ['👻', 'Friendly ghost'], ['🦸', 'Superhero'], ['🐱', 'Black cat'], ['🦖', 'Dinosaur'], ['🤖', 'Robot'], ['🎃', 'Pumpkin']], msg: 'Brilliant costume!', happy: 5, saveAs: 'costume' },
      { id: 'pumpkin', name: 'Carve a pumpkin', emoji: '🎃', kind: 'choose', q: 'What face will your pumpkin have?', options: [['😊', 'Happy'], ['😜', 'Silly'], ['😮', 'Surprised'], ['😺', 'Cat face']], msg: 'Your pumpkin is glowing on the doorstep!', happy: 4 },
      { id: 'treat', name: 'Trick or treat', emoji: '🍬', kind: 'tap', title: 'Knock on the doors with pumpkins outside!', target: ['🎃'], other: ['🏠', '🌲', '🦉', '🌙'], n: 5, msg: 'Your bag is full of sweets! (Remember to share and brush your teeth!)', happy: 6, needsAge: 4 }] },
    { id: 'bonfire', name: 'Bonfire Night', emoji: '🎆', season: 2, desc: 'Fireworks displays, sparklers and toffee apples.', acts: [
      { id: 'fireworks', name: 'Watch fireworks', emoji: '🎆', kind: 'tap', title: 'Tap the rockets to launch the fireworks!', target: ['🚀'], other: ['⭐', '☁️', '🌙'], n: 5, msg: 'Ooooh! Aaaah! What a display!', happy: 5 },
      { id: 'toffee', name: 'Toffee apple', emoji: '🍎', kind: 'simple', msg: 'Crunchy, sticky and delicious!', happy: 4 }] },
    { id: 'diwali', name: 'Diwali', emoji: '🪔', season: 2, desc: 'The festival of lights: lamps, rangoli patterns, sweets and gifts.', acts: [
      { id: 'diyas', name: 'Light the diyas', emoji: '🪔', kind: 'tap', title: 'Tap every lamp to light it!', target: ['🪔'], other: ['🌸', '🏠', '⭐'], n: 6, msg: 'The whole house is glowing!', happy: 5 },
      { id: 'rangoli', name: 'Make a rangoli', emoji: '🌺', kind: 'choose', q: 'Which colours for your rangoli pattern?', options: [['🔴', 'Red & gold'], ['🟣', 'Purple & pink'], ['🟢', 'Green & yellow'], ['🔵', 'Blue & white']], msg: 'A beautiful pattern by the door!', happy: 4 },
      { id: 'sweets', name: 'Sweets & gifts', emoji: '🍬', kind: 'gift', gift: '🍬 A box of sweets', happy: 5, family: 4 }] },
    { id: 'christmas', name: 'Christmas', emoji: '🎄', season: 3, desc: 'Decorate the tree, open presents and enjoy a big dinner.', acts: [
      { id: 'tree', name: 'Decorate the tree', emoji: '🎄', kind: 'tap', title: 'Tap the baubles to hang them on the tree!', target: ['🔴', '🟡', '🔵', '⭐'], other: ['🎄', '🌲'], n: 6, msg: 'The tree looks magical!', happy: 5 },
      { id: 'presents', name: 'Open presents', emoji: '🎁', kind: 'gift', gift: 'present', happy: 6, family: 4 },
      { id: 'dinner', name: 'Christmas dinner', emoji: '🍗', kind: 'simple', msg: 'Crackers, paper hats and a giant dinner!', happy: 5, family: 5 },
      { id: 'snowman', name: 'Build a snowman', emoji: '⛄', kind: 'simple', msg: 'He has a carrot nose and a stripy scarf!', happy: 4 }] },
    { id: 'hanukkah', name: 'Hanukkah', emoji: '🕎', season: 3, desc: 'Eight nights of lights, dreidels and latkes.', acts: [
      { id: 'candles', name: 'Light the menorah', emoji: '🕯️', kind: 'tap', title: 'Light all eight candles!', target: ['🕯️'], other: ['⭐', '🍩'], n: 8, msg: 'All eight candles are shining!', happy: 5 },
      { id: 'dreidel', name: 'Spin the dreidel', emoji: '🪀', kind: 'gift', gift: '🪙 Chocolate coins', coins: 10, happy: 4 },
      { id: 'latkes', name: 'Eat latkes', emoji: '🥔', kind: 'simple', msg: 'Crispy potato latkes — yum!', happy: 4, family: 4 }] },
    { id: 'lunar', name: 'Lunar New Year', emoji: '🧧', season: 3, desc: 'Red lanterns, dragon dances, dumplings and lucky red envelopes.', acts: [
      { id: 'envelope', name: 'Red envelopes', emoji: '🧧', kind: 'gift', gift: '🧧 A lucky red envelope', coins: 20, happy: 4 },
      { id: 'dragon', name: 'Dragon dance', emoji: '🐉', kind: 'simple', msg: 'The dragon danced right past you!', happy: 5 },
      { id: 'lanterns', name: 'Hang lanterns', emoji: '🏮', kind: 'tap', title: 'Hang all the red lanterns!', target: ['🏮'], other: ['🌸', '🧧', '⭐'], n: 5, msg: 'The street glows red and gold!', happy: 4 }] }
  ];
  G.festival = function (id) { return byId(BAL.FESTIVALS, id); };
  G.festivalActive = function (l, f) { return f.season === G.season(l) && (G.daysLeft ? G.daysLeft(l) > 0 : true); };
  A.toggleFestival = function (l, id) {
    G.ensureBirthdays(l);
    if (!G.festival(id)) return no('?');
    var i = l.festivals.indexOf(id);
    if (i >= 0) l.festivals.splice(i, 1); else l.festivals.push(id);
    return ok(i >= 0 ? G.festival(id).name + ' removed from your calendar.' : G.festival(id).name + ' added to your calendar! ' + G.festival(id).emoji, G.festival(id).emoji);
  };
  A.festivalActivity = function (l, fid, aid, data) {
    G.ensureBirthdays(l);
    var f = G.festival(fid);
    if (!f || l.festivals.indexOf(fid) < 0) return no('Add this celebration to your calendar first!');
    if (!G.festivalActive(l, f)) return no(f.name + ' is in ' + BAL.DAYS[f.season].name.replace(' day', '').toLowerCase() + ' — come back then! (Seasons change each time you sleep in My Day.)', '📅');
    var x = byId(f.acts, aid); if (!x) return no('?');
    if (x.needsAge && l.age < x.needsAge) return no('You\'re a bit little for this one — maybe next year!', '🍼');
    var key = fid + ':' + aid;
    if (l.flags.fest[key] === l.age) return no('You already did this this year! 🎉');
    data = data || {};
    if (x.kind === 'tap' && (data.score || 0) < (data.total || 1)) return no('Nearly! Finish the game to complete it.', '🤏');
    var msg = x.msg || '';
    if (x.kind === 'choose') {
      var opt = x.options[data.choice || 0] || x.options[0];
      msg = opt[0] + ' ' + opt[1] + '! ' + x.msg;
      if (x.saveAs) l.flags[x.saveAs] = opt[0];
    }
    var gift = null;
    if (x.kind === 'gift') {
      if (x.gift === 'present') {
        var it = G.presentFor(l, key, []);
        if (it) { l.inventory.push(it.id); G.applyFx(l, it.fx); gift = it.emoji + ' ' + it.name; } else { G._addCoins(l, 20); gift = '💌 A card with 20 coins'; }
      } else gift = x.gift;
      if (x.coins) G._addCoins(l, l.age < 18 ? x.coins : G.price(l, x.coins * 2));
      msg = 'You got ' + gift + '!';
    }
    l.flags.fest[key] = l.age;
    G.applyFx(l, { happy: x.happy || 3 });
    if (x.family) l.people.forEach(function (p) { if (['mum', 'dad', 'parent', 'grandma', 'grandpa', 'sibling', 'spouse', 'partner', 'child', 'grandchild'].indexOf(p.role) >= 0) p.close = clamp(p.close + x.family); });
    l.totals.festActs = (l.totals.festActs || 0) + 1;
    if (l.totals.festActs >= 5) G.unlock(l, 'festive_fun');
    l.flags.festsSeen = l.flags.festsSeen || [];
    if (l.flags.festsSeen.indexOf(fid) < 0) l.flags.festsSeen.push(fid);
    if (l.flags.festsSeen.length >= 3) G.unlock(l, 'celebrations_galore');
    return ok(f.emoji + ' ' + msg, x.emoji, { gift: gift, celebrate: true });
  };

  BAL.ACHIEVEMENTS.push(
    { id: 'party_host', name: 'Party Host', emoji: '🥳', desc: 'Have a birthday party with 5 or more guests.' },
    { id: 'present_pile', name: 'Present Pile', emoji: '🎁', desc: 'Unwrap 15 birthday presents.' },
    { id: 'birthday_buddy', name: 'Birthday Buddy', emoji: '💌', desc: 'Celebrate 10 family or friends\' birthdays.' },
    { id: 'festive_fun', name: 'Festive Fun', emoji: '🎄', desc: 'Join in 5 seasonal celebration activities.' },
    { id: 'celebrations_galore', name: 'Celebrations Galore', emoji: '🎆', desc: 'Celebrate 3 different seasonal festivals.' }
  );
  ['child', 'teen', 'young', 'adult', 'older', 'grand'].forEach(function (st) {
    BAL.CHALLENGES.push({ id: 'party_' + st, stage: st, emoji: '💌', name: 'Party Planner', desc: 'Plan your next birthday party and send the invitations.', track: { act: 'sendInvites', n: 1 }, tab: 'celebrate', stars: 2 });
  });

  /* ===================== The cake picture ===================== */
  BAL.cakeArt = function (cake, candles, lit, opts) {
    cake = cake || {}; opts = opts || {};
    var fl = byId(BAL.CAKE_FLAVOURS, cake.flavour) || BAL.CAKE_FLAVOURS[0], shape = cake.shape || 'round';
    var top = byId(BAL.CAKE_TOPPERS, cake.topper) || BAL.CAKE_TOPPERS[0];
    var s = [];
    function sponge(x, y, w, h) {
      if (fl.sponge !== 'rainbow') return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="6" fill="' + fl.sponge + '"/>';
      var cols = ['#FF6B6B', '#FFD43B', '#69DB7C', '#4DABF7', '#9775FA'], hh = h / cols.length, out = '';
      cols.forEach(function (c, i) { out += '<rect x="' + x + '" y="' + (y + i * hh) + '" width="' + w + '" height="' + (hh + 0.5) + '" fill="' + c + '"' + (i === cols.length - 1 ? ' rx="4"' : '') + '/>'; });
      return out;
    }
    function icing(x, y, w) { var d = 'M' + x + ' ' + y + ' h' + w + ' v6'; for (var i = 0; i < 6; i++) d += ' q-' + (w / 12) + ' 7 -' + (w / 6) + ' 0'; return '<path d="' + d + ' Z" fill="' + fl.icing + '"/>'; }
    s.push('<ellipse cx="60" cy="108" rx="52" ry="7" fill="#E9ECEF"/>');
    var topY;
    if (shape === 'tiers') {
      s.push(sponge(14, 74, 92, 32) + icing(14, 74, 92) + sponge(30, 50, 60, 26) + icing(30, 50, 60));
      topY = 50;
    } else if (shape === 'castle') {
      s.push(sponge(16, 58, 88, 48) + icing(16, 58, 88));
      [16, 46, 76].forEach(function (x) { s.push(sponge(x, 40, 28, 20) + '<path d="M' + x + ' 40 l7 -12 l7 12 l7 -12 l7 12 Z" fill="' + fl.icing + '"/>'); });
      topY = 40;
    } else if (shape === 'number') {
      var n = String(opts.age || candles || 1);
      s.push('<text x="60" y="104" text-anchor="middle" font-family="Baloo 2, Arial Black, sans-serif" font-weight="900" font-size="' + (n.length > 1 ? 70 : 86) + '" fill="' + (fl.sponge === 'rainbow' ? '#FF8FAB' : fl.sponge) + '" stroke="' + fl.icing + '" stroke-width="5" paint-order="stroke">' + n + '</text>');
      topY = 40;
    } else {
      s.push(sponge(18, 58, 84, 48) + icing(18, 58, 84));
      topY = 58;
    }
    // topper
    var tx = [34, 60, 86];
    if (top.id === 'sprinkles') for (var i = 0; i < 14; i++) s.push('<rect x="' + (24 + (i * 37) % 72) + '" y="' + (topY + 10 + (i * 13) % 26) + '" width="5" height="2" rx="1" fill="' + ['#FF6B6B', '#FFD43B', '#69DB7C', '#4DABF7', '#F783AC'][i % 5] + '" transform="rotate(' + (i * 40) + ' ' + (26 + (i * 37) % 72) + ' ' + (topY + 11 + (i * 13) % 26) + ')"/>');
    else if (shape !== 'number') tx.forEach(function (x) { s.push('<text x="' + x + '" y="' + (topY + 22) + '" font-size="12" text-anchor="middle">' + (top.id === 'theme' && opts.theme ? opts.theme : top.emoji) + '</text>'); });
    // candles
    var nC = Math.max(1, Math.min(10, candles || 1)), span = Math.min(80, nC * 10), cx0 = 60 - span / 2 + 5;
    for (var k = 0; k < nC; k++) {
      var x = nC === 1 ? 60 : cx0 + k * (span - 10) / Math.max(1, nC - 1), cy = topY - 16;
      s.push('<rect x="' + (x - 2.5) + '" y="' + cy + '" width="5" height="16" rx="1.5" fill="' + ['#74C0FC', '#FF8FAB', '#FFD43B', '#69DB7C', '#B197FC'][k % 5] + '"/><rect x="' + (x - 2.5) + '" y="' + (cy + 4) + '" width="5" height="2" fill="#fff" opacity=".7"/><rect x="' + (x - 2.5) + '" y="' + (cy + 10) + '" width="5" height="2" fill="#fff" opacity=".7"/>');
      s.push('<g class="flame"' + (lit ? '' : ' style="display:none"') + '><ellipse cx="' + x + '" cy="' + (cy - 6) + '" rx="3.6" ry="6" fill="#FFD43B"><animate attributeName="ry" values="6;7;5.6;6" dur="' + (0.4 + k * 0.03) + 's" repeatCount="indefinite"/></ellipse><ellipse cx="' + x + '" cy="' + (cy - 4.5) + '" rx="1.8" ry="3" fill="#FFF3BF"/></g>');
      if (!lit) s.push('<path d="M' + x + ' ' + (cy - 2) + ' q-3 -5 0 -9 q3 -4 0 -8" stroke="#ADB5BD" stroke-width="1.4" fill="none" opacity=".7" class="smoke"/>');
    }
    return '<svg viewBox="0 0 120 120" class="cake-svg" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' + s.join('') + '</svg>';
  };

  // Babies and others get birthdays when created; old saves too.
  var newLife = G.newLife;
  G.newLife = function (o) { var l = newLife(o); G.ensureBirthdays(l); return l; };
  ['haveBaby', 'adoptChild', 'makeFriend', 'findLove', 'befriend'].forEach(function (fn) {
    var f = A[fn]; if (!f) return;
    A[fn] = function (l) { var r = f.apply(null, arguments); if (r && r.ok) G.ensureBirthdays(l); return r; };
  });
})(globalThis.BAL = globalThis.BAL || {});
