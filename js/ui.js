/* Build a Life — user interface. Renders screens with HTML strings and handles clicks
   through data-act attributes (event delegation). */
(function (BAL) {
  'use strict';
  var G = BAL.Game, Store = BAL.Store, fmt = G.fmt, byId = G.byId;
  var UI = BAL.UI = {};
  var S = { screen: 'profiles', tab: 'activities', shopCat: 'toys', ed: null, queue: [], modal: null };
  var $app, $modal, $toasts, $fx;

  var PROFILE_EMOJIS = ['🦄', '🐯', '🐸', '🐼', '🦊', '🐙', '🐵', '🐨', '🦁', '🐧', '🐲', '🦖', '🐬', '🦋', '🐝', '🌟'];
  var PROFILE_COLORS = ['#FF6B6B', '#FF9F1C', '#FFD43B', '#69DB7C', '#4DABF7', '#9775FA', '#F783AC', '#20C997'];

  function esc(s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function life() { var p = Store.active(); return p ? Store.activeChar(p) : null; }
  function save() { Store.save(); }
  function statInfo(id) { return byId(BAL.STATS, id); }
  function reduced() { return globalThis.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function btn(label, act, attrs, cls) {
    return '<button class="btn ' + (cls || '') + '" data-act="' + act + '"' + (attrs || '') + '>' + label + '</button>';
  }
  function a(k, v) { return ' data-' + k + '="' + esc(v) + '"'; }
  function fxChips(fx) {
    return Object.keys(fx || {}).map(function (k) {
      var s = statInfo(k); if (!s) return '';
      return '<span class="fxchip ' + (fx[k] < 0 ? 'neg' : '') + '">' + s.emoji + (fx[k] > 0 ? '+' : '') + fx[k] + '</span>';
    }).join('');
  }
  function coinTag(n, free) { return n ? '<span class="price">🪙 ' + fmt(n) + '</span>' : (free ? '<span class="price free">' + free + '</span>' : ''); }
  function bar(v, color, label) {
    return '<div class="bar" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(v) + '" aria-label="' + esc(label || '') + '"><div class="bar-fill" style="width:' + Math.round(v) + '%;background:' + color + '"></div></div>';
  }
  function hearts(v) { return '<div class="hearts" title="Closeness ' + v + '/100">' + bar(v, 'linear-gradient(90deg,#FF8FAB,#FF4D6D)', 'Closeness') + '</div>'; }

  /* ====================== Feedback: toasts, confetti, modals ====================== */
  function toast(msg, emoji, kind, diffs, coins) {
    var el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    var chips = (diffs || []).reduce(function (acc, d) {
      var found = acc.find(function (x) { return x.stat === d.stat; });
      if (found) found.d += d.d; else acc.push({ stat: d.stat, d: d.d });
      return acc;
    }, []).filter(function (d) { return d.d; }).map(function (d) {
      var s = statInfo(d.stat);
      return '<span class="fxchip ' + (d.d < 0 ? 'neg' : '') + '">' + s.emoji + ' ' + (d.d > 0 ? '+' : '') + d.d + '</span>';
    }).join('');
    if (coins) chips += '<span class="fxchip coin ' + (coins < 0 ? 'neg' : '') + '">🪙 ' + (coins > 0 ? '+' : '') + fmt(coins) + '</span>';
    el.innerHTML = '<span class="toast-emoji">' + esc(emoji || '✨') + '</span><div><div>' + esc(msg) + '</div>' + (chips ? '<div class="chips">' + chips + '</div>' : '') + '</div>';
    $toasts.appendChild(el);
    while ($toasts.children.length > 3) $toasts.removeChild($toasts.firstChild);
    setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 400); }, 3600);
  }

  function confetti(big) {
    if (reduced()) return;
    var colors = ['#FF6B6B', '#FFD43B', '#69DB7C', '#4DABF7', '#9775FA', '#F783AC', '#FF9F1C'];
    var shapes = ['', 'round', 'strip'];
    var n = big ? 140 : 70;
    for (var i = 0; i < n; i++) {
      var c = document.createElement('i');
      c.className = 'confetti ' + shapes[i % 3];
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = (2.2 + Math.random() * 1.8) + 's';
      c.style.animationDelay = (Math.random() * 0.5) + 's';
      c.style.setProperty('--drift', (Math.random() * 200 - 100) + 'px');
      c.style.setProperty('--spin', (Math.random() * 720 + 360) + 'deg');
      $fx.appendChild(c);
      (function (el) { setTimeout(function () { el.remove(); }, 4800); })(c);
    }
  }
  function floaty(emoji) {
    if (reduced()) return;
    for (var i = 0; i < 6; i++) {
      var f = document.createElement('span');
      f.className = 'floaty'; f.textContent = emoji;
      f.style.left = (30 + Math.random() * 40) + 'vw';
      f.style.animationDelay = (i * 0.12) + 's';
      $fx.appendChild(f);
      (function (el) { setTimeout(function () { el.remove(); }, 2600); })(f);
    }
  }

  function openModal(cfg) { S.queue.push(cfg); if (!S.modal) nextModal(); }
  function nextModal() {
    var cfg = S.queue.shift();
    S.modal = cfg || null;
    if (!cfg) { $modal.innerHTML = ''; $modal.hidden = true; document.body.classList.remove('modal-open'); return; }
    if (cfg.onOpen) cfg.onOpen();
    $modal.hidden = false;
    document.body.classList.add('modal-open');
    var buttons = (cfg.buttons || [{ label: 'OK' }]).map(function (b, i) {
      return '<button class="btn big ' + (b.cls || (i === 0 ? 'primary' : '')) + '" data-mbtn="' + i + '"' + (b.disabled ? ' disabled' : '') + '>' + b.label + '</button>';
    }).join('');
    $modal.innerHTML = '<div class="modal-back"></div><div class="modal ' + (cfg.cls || '') + '" role="dialog" aria-modal="true" aria-labelledby="mtitle">' +
      '<button class="speak" data-speak title="Read aloud" aria-label="Read aloud">🔊</button>' +
      (cfg.emoji ? '<div class="modal-emoji">' + cfg.emoji + '</div>' : '') +
      '<h2 id="mtitle">' + cfg.title + '</h2>' +
      '<div class="modal-body">' + (cfg.html || '') + '</div>' +
      '<div class="modal-btns' + ((cfg.buttons || []).length > 2 ? ' stack' : '') + '">' + buttons + '</div></div>';
    var first = $modal.querySelector('input,[data-mbtn]');
    if (first) setTimeout(function () { first.focus(); }, 60);
  }
  function modalClick(e) {
    var sp = e.target.closest('[data-speak]');
    if (sp) { speak($modal.querySelector('.modal').innerText.replace('🔊', '')); return; }
    var mb = e.target.closest('[data-mbtn]');
    if (mb && S.modal) {
      var b = S.modal.buttons[+mb.getAttribute('data-mbtn')];
      BAL.sound('click');
      var keep = b && b.fn ? b.fn($modal) === false : false;
      if (!keep) { stopSpeaking(); nextModal(); render(); }
      return;
    }
    // In-modal pick buttons (e.g. choosing gender / size) toggle a selection.
    var pk = e.target.closest('[data-pick]');
    if (pk) {
      var grp = pk.getAttribute('data-pick');
      $modal.querySelectorAll('[data-pick="' + grp + '"]').forEach(function (x) { x.classList.remove('on'); });
      pk.classList.add('on');
      return;
    }
    var mxb = e.target.closest('[data-mx]');
    if (mxb && S.modal && S.modal.x) { var fx2 = S.modal.x[+mxb.getAttribute('data-mx')]; stopSpeaking(); nextModal(); if (fx2) fx2(); render(); return; }
    var tb = e.target.closest('[data-mbtn-trip]');
    if (tb) { var tid = tb.getAttribute('data-mbtn-trip'); stopSpeaking(); nextModal(); var lt = life(); if (lt) { S.tab = 'explore'; act('dayTrip', tid); } return; }
    var rn = e.target.closest('[data-randname]');
    if (rn) { var inp = $modal.querySelector('input[name="n"]'); if (inp) inp.value = rn.getAttribute('data-randname') === 'pet' ? G.pick(BAL.NAMES.pets) : G.randomName(pickedVal('g') || 'any'); }
  }
  function pickedVal(grp) { var el = $modal.querySelector('[data-pick="' + grp + '"].on'); return el ? el.getAttribute('data-val') : null; }

  function speak(text) {
    try {
      if (!globalThis.speechSynthesis) return;
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, ''));
      u.rate = 0.95; u.pitch = 1.1; u.lang = 'en-GB';
      speechSynthesis.speak(u);
    } catch (e) { /* no speech */ }
  }
  function stopSpeaking() { try { if (globalThis.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* ignore */ } }

  function showAchievements(l) {
    while (l.newAch.length) {
      var ach = byId(BAL.ACHIEVEMENTS, l.newAch.shift());
      if (!ach) continue;
      (function (x) {
        openModal({ emoji: '<span class="sticker big">' + x.emoji + '</span>', title: 'New Sticker!', cls: 'sticker-modal',
          html: '<p class="lead"><b>' + esc(x.name) + '</b></p><p>' + esc(x.desc) + '</p><p class="muted">It\'s in your Sticker Book in "My Story" 📖</p>',
          buttons: [{ label: 'Awesome! 🌟' }], onOpen: function () { BAL.sound('sticker'); confetti(false); } });
      })(ach);
    }
    save();
  }

  function feedback(res) {
    var l = life();
    if (!res) return;
    BAL.sound(res.ok ? (res.coinsDelta > 0 ? 'coin' : (res.celebrate ? 'tada' : 'good')) : 'bad');
    toast(res.msg, res.emoji, res.ok ? 'good' : 'bad', res.diffs, res.coinsDelta);
    if (res.celebrate) { confetti(res.big); }
    if (res.offerGlasses) {
      openModal({ emoji: '👓', title: 'Would you like glasses?', html: '<p>Glasses help you see clearly — and they look super cool!</p>',
        buttons: [{ label: 'Yes please! 👓', fn: function () { G.run(l, 'setAccessory', 'glasses'); save(); } }, { label: 'No thanks', cls: 'ghost' }] });
    }
    if (l) showAchievements(l);
    save();
    render();
    goalFeedback(res.goalsDone);
    if (l && l.levelUps && l.levelUps.length) {
      l.levelUps.forEach(function (u, k) { var sk = byId(BAL.SKILLS, u.id); setTimeout(function () { toast(sk.name + ' skill is now level ' + u.level + '! ⬆️', sk.emoji, 'good'); BAL.sound('sticker'); }, 400 + k * 300); });
      l.levelUps = []; save();
    }
    if (l && l.ended) endOfLife();
  }

  function act(fn) {
    var l = life(); if (!l) return;
    var args = Array.prototype.slice.call(arguments, 1);
    var res = G.run.apply(null, [l, fn].concat(args));
    feedback(res);
    return res;
  }

  /* ====================== Screens ====================== */
  function render() {
    var p = Store.active(), l = life();
    if ((S.screen === 'game' || S.screen === 'end') && !l) S.screen = p ? 'chars' : 'profiles';
    if (S.screen === 'chars' && !p) S.screen = 'profiles';
    if ((S.screen === 'create' || S.screen === 'look') && !S.ed) S.screen = l ? 'game' : (p ? 'chars' : 'profiles');
    if (S.screen === 'look' && !l) S.screen = 'chars';
    var html;
    switch (S.screen) {
      case 'profiles': html = renderProfiles(); break;
      case 'chars': html = renderChars(); break;
      case 'create': case 'look': html = renderEditor(); break;
      case 'end': html = renderEnd(); break;
      default: html = renderGame();
    }
    $app.innerHTML = html;
    $app.setAttribute('data-screen', S.screen);
    var t = null;
    if (S.screen === 'create' && S.ed) t = byId(BAL.TOWNS, S.ed.townId);
    else if (l && ['game', 'end', 'look'].indexOf(S.screen) >= 0) t = G.town(l);
    document.documentElement.style.setProperty('--town1', t ? t.colors[0] : '#FFD6E8');
    document.documentElement.style.setProperty('--town2', t ? t.colors[1] : '#C9F2FF');
  }

  function topbar() {
    var p = Store.active();
    var inLife = ['game', 'end', 'look', 'create'].indexOf(S.screen) >= 0;
    return '<header class="topbar">' +
      '<button class="logo" data-act="goProfiles" aria-label="Build a Life — players"><span class="logo-house">🏡</span><span class="logo-text">Build <i>a</i> Life</span></button>' +
      '<div class="topbar-right">' +
      (p && S.screen !== 'profiles' ? '<button class="player-chip" data-act="goChars" style="--pc:' + esc(p.color) + '" title="My characters"><span>' + esc(p.emoji) + '</span>' + esc(p.name) + '</button>' : '') +
      '<button class="icon-btn" data-act="sound" aria-label="Sound on or off" title="Sound">' + (Store.data.sound ? '🔊' : '🔇') + '</button>' +
      '<button class="icon-btn" data-act="help" aria-label="How to play" title="How to play">❓</button>' +
      (p && inLife ? '<button class="icon-btn" data-act="goChars" aria-label="My characters" title="My characters">🧑‍🤝‍🧑</button>' : '') +
      (S.screen !== 'profiles' ? '<button class="icon-btn" data-act="goProfiles" aria-label="Switch player" title="Switch player">👥</button>' : '') +
      '</div></header>';
  }

  /* ---------- Player profiles ---------- */
  function renderProfiles() {
    var ps = Store.data.profiles;
    var cards = ps.map(function (p) {
      var live = p.chars.filter(function (c) { return !c.ended; });
      var sub = p.chars.length ? p.chars.length + ' character' + (p.chars.length === 1 ? '' : 's') + (live.length < p.chars.length ? ' · ' + (p.chars.length - live.length) + ' complete' : '') : 'Ready to make a character!';
      var faces = p.chars.slice(-3).map(function (c) { return '<span class="mini-face">' + BAL.avatar(c.look, c.age, c.stats.happy, { bg: '#fff' }) + '</span>'; }).join('');
      return '<div class="profile-card pop" style="--pc:' + esc(p.color) + '">' +
        '<button class="profile-main" data-act="pickProfile"' + a('id', p.id) + '>' +
        '<span class="profile-emoji">' + esc(p.emoji) + '</span>' +
        '<span class="profile-name">' + esc(p.name) + '</span>' +
        (faces ? '<span class="faces">' + faces + '</span>' : '') +
        '<span class="profile-sub">' + sub + '</span>' +
        (p.hall.length ? '<span class="profile-hall">🏆 ' + p.hall.length + ' ' + (p.hall.length === 1 ? 'life' : 'lives') + ' lived</span>' : '') +
        '<span class="btn primary small">▶ Play</span></button>' +
        '<button class="profile-del" data-act="delProfile"' + a('id', p.id) + ' aria-label="Delete player ' + esc(p.name) + '" title="Delete player">🗑️</button></div>';
    }).join('');
    return topbar() + '<main class="profiles-screen">' +
      '<div class="hero"><div class="hero-art" aria-hidden="true">' + heroArt() + '</div>' +
      '<h1>Build <span>a</span> Life</h1><p class="tagline">Grow up, make friends, find a job, adopt pets and build the life of your dreams!</p></div>' +
      '<h2 class="section-title">' + (ps.length ? '👋 Who\'s playing?' : '👋 Welcome! Make your player to begin') + '</h2>' +
      '<div class="profile-grid">' + cards +
      '<button class="profile-card add pop" data-act="newProfile"><span class="profile-emoji">➕</span><span class="profile-name">New Player</span><span class="profile-sub">Everyone gets their own characters and saves!</span></button></div>' +
      '<p class="parent-note">👪 <b>For grown-ups:</b> all coins in this game are pretend. There are no real-money purchases, no adverts and no chat. Games are saved only on this device.</p>' +
      '</main>';
  }
  function heroArt() {
    var C = BAL.CLOTH_COLORS;
    var looks = [
      { skin: '#F6C9A0', hair: 'pigtails', hairColor: '#E9C46A', eyes: '#1F6FEB', fav: '#FF6B6B', accessory: 'bow', outfits: { baby: { top: 'bodysuit', bottom: 'romper', shoes: 'booties', extra: 'none', topColor: C[8], bottomColor: C[8], shoesColor: '#fff' } } },
      { skin: '#8D5A36', hair: 'afro', hairColor: '#2B1B12', eyes: '#3B2314', fav: '#4DABF7', accessory: 'none', outfits: { child: { top: 'dino', bottom: 'shorts', shoes: 'lightup', extra: 'backpack', topColor: '#69DB7C', bottomColor: '#3B5BA5', shoesColor: '#FF6B6B', extraColor: '#FF9F1C' } } },
      { skin: '#E0A877', hair: 'long', hairColor: '#5A3825', eyes: '#2A9D8F', fav: '#9775FA', accessory: 'sunglasses', outfits: { adult: { top: 'denim', bottom: 'skirt', shoes: 'boots', extra: 'bag', topColor: '#4DABF7', bottomColor: '#F783AC', shoesColor: '#8D6E63', extraColor: '#9775FA' } } },
      { skin: '#FFE0C7', hair: 'short', hairColor: '#A0522D', eyes: '#3B2314', fav: '#9775FA', accessory: 'flatcap', outfits: { older: { top: 'knit', bottom: 'slacks', shoes: 'comfy', extra: 'stick', topColor: '#FF9F1C', bottomColor: '#8D6E63', shoesColor: '#8D6E63' } } }
    ];
    var ages = [0, 8, 30, 75];
    return ages.map(function (ag, i) { return '<div class="hero-av" style="--d:' + (i * 0.25) + 's">' + BAL.avatar(looks[i], ag, 90, { full: true }) + '</div>'; }).join('<span class="hero-arrow">➜</span>');
  }

  function newProfileModal() {
    var em = PROFILE_EMOJIS.map(function (e, i) { return '<button class="pick emoji-pick' + (i === 0 ? ' on' : '') + '" data-pick="e" data-val="' + e + '">' + e + '</button>'; }).join('');
    var co = PROFILE_COLORS.map(function (c, i) { return '<button class="pick swatch' + (i === 5 ? ' on' : '') + '" data-pick="c" data-val="' + c + '" style="background:' + c + '" aria-label="Colour ' + c + '"></button>'; }).join('');
    openModal({ emoji: '🙋', title: 'New Player', html:
      '<label class="field"><span>What\'s your name?</span><input name="pn" maxlength="16" placeholder="Type your name" autocomplete="off"></label>' +
      '<div class="field"><span>Pick your icon</span><div class="pick-row">' + em + '</div></div>' +
      '<div class="field"><span>Pick your colour</span><div class="pick-row">' + co + '</div></div>',
      buttons: [{ label: 'Create Player ✨', fn: function (m) {
        var name = m.querySelector('input[name="pn"]').value.trim();
        if (!name) { m.querySelector('input[name="pn"]').classList.add('shake'); m.querySelector('input[name="pn"]').placeholder = 'Please type a name 🙂'; return false; }
        var p = Store.addProfile(name, pickedVal('e'), pickedVal('c'));
        Store.data.activeId = p.id; save();
        startCreator();
      } }, { label: 'Cancel', cls: 'ghost' }] });
  }

  /* ---------- Characters (each with their own saved life) ---------- */
  var MAX_CHARS = 12;
  function charStatus(l) {
    if (l.ended) return '🌟 Life story complete';
    if (l.job) return G.job(l).emoji + ' ' + G.jobTitle(l) + (G.jobCount(l) > 1 ? ' +' + (G.jobCount(l) - 1) : '');
    if (l.business) return G.biz(l).emoji + ' Business owner';
    if (l.edu.course) return '🎓 Student';
    if (l.retired) return '🏖️ Retired';
    var sch = G.school(l);
    return sch ? sch.emoji + ' ' + sch.label.split(' —')[0] : BAL.STAGES[G.stage(l.age)].emoji + ' ' + BAL.STAGES[G.stage(l.age)].name;
  }
  function renderChars() {
    var p = Store.active();
    var cards = p.chars.map(function (l) {
      var t = G.town(l);
      var current = l.id === p.activeCharId;
      return '<div class="cs-card pop' + (l.ended ? ' ended' : '') + (current ? ' current' : '') + '" style="--t1:' + t.colors[0] + ';--t2:' + t.colors[1] + '">' +
        '<button class="cs-main" data-act="pickChar"' + a('id', l.id) + '>' +
        '<span class="cs-av">' + BAL.avatar(l.look, l.age, l.ended ? 90 : l.stats.happy, { full: true }) + '</span>' +
        '<span class="cs-name">' + esc(l.name) + (l.generation > 1 ? ' <small>Gen ' + l.generation + '</small>' : '') + '</span>' +
        '<span class="cs-line">' + (l.ended ? 'Lived to ' + l.age : 'Age ' + l.age) + ' · ' + t.emoji + ' ' + esc(t.name) + '</span>' +
        '<span class="cs-line">' + esc(charStatus(l)) + '</span>' +
        '<span class="cs-line small">🪙 ' + fmt(l.coins) + ' · 🌟 ' + l.achievements.length + ' stickers</span>' +
        '<span class="btn ' + (l.ended ? '' : 'primary ') + 'small">' + (l.ended ? '📖 See story' : '▶ Play') + '</span></button>' +
        '<button class="profile-del" data-act="delChar"' + a('id', l.id) + ' aria-label="Delete ' + esc(l.name) + '" title="Delete character">🗑️</button></div>';
    }).join('');
    var hall = p.hall.length ? '<h2 class="section-title">🏆 Hall of Fame</h2><div class="hall">' + p.hall.slice().reverse().map(hallCard).join('') + '</div>' : '';
    return topbar() + '<main class="chars-screen">' +
      '<div class="chars-head"><span class="player-big" style="--pc:' + esc(p.color) + '">' + esc(p.emoji) + '</span><div><h1>' + esc(p.name) + '\'s Characters</h1>' +
      '<p>Every character has their very own life saved. Pick one to play, or make someone new! (' + p.chars.length + ' / ' + MAX_CHARS + ')</p></div></div>' +
      '<div class="cs-grid">' + cards +
      (p.chars.length < MAX_CHARS ? '<button class="cs-card add pop" data-act="newChar"><span class="cs-plus">➕</span><span class="cs-name">New Character</span><span class="cs-line">Start a brand new life as a baby</span></button>' : '') +
      '</div>' + hall + '</main>';
  }

  /* ---------- Character editor: "Create your character" and "Change Your Look" ---------- */
  var STEPS = [
    { id: 'me', name: 'Me', emoji: '📛' },
    { id: 'face', name: 'Face & Hair', emoji: '💇' },
    { id: 'clothes', name: 'Clothes', emoji: '👕' },
    { id: 'extras', name: 'Accessories', emoji: '🎀' },
    { id: 'home', name: 'Family & Home', emoji: '🏡', newOnly: true }
  ];
  var LOOK_KEYS = ['skin', 'eyes', 'hair', 'hairColor', 'accessory', 'fav'];
  var OUTFIT_KEYS = ['top', 'bottom', 'shoes', 'extra', 'topColor', 'bottomColor', 'shoesColor', 'extraColor'];
  var ED_KEYS = ['gender', 'pronouns', 'townId', 'familyType'];

  function startCreator(prefill) {
    var g = G.pick(['girl', 'boy']);
    var look = G.randomLook();
    delete look.outfits;                       // start from the free default collection in the favourite colour
    if (look.accessory !== 'none' && G.pick([0, 1])) look.accessory = 'none';
    S.ed = Object.assign({ mode: 'new', step: 'me', group: 'baby', name: G.randomName(g), gender: g, pronouns: g === 'girl' ? 'she' : 'he',
      look: G.normalizeLook(look), townId: 'maple', familyType: 'mumdad' }, prefill || {});
    S.screen = 'create';
    render();
    window.scrollTo(0, 0);
  }
  function startLookEditor(step) {
    var l = life(); if (!l) return;
    S.ed = { mode: 'edit', step: step || 'clothes', group: G.ageGroup(l.age), name: l.name, gender: l.gender, pronouns: l.pronouns,
      look: G.normalizeLook(JSON.parse(JSON.stringify(l.look))) };
    S.screen = 'look';
    BAL.sound('click');
    render();
    window.scrollTo(0, 0);
  }
  function edLocked(slot, id) {
    var l = S.ed.mode === 'edit' ? life() : { unlocked: [] };
    return G.isLocked(l, slot, id);
  }
  function edAge() {
    var e = S.ed, l = life();
    if (e.mode === 'edit' && l && G.ageGroup(l.age) === e.group) return l.age;
    return G.groupInfo(e.group).preview;
  }

  function renderEditor() {
    var e = S.ed, look = e.look, isNew = e.mode === 'new', l = life();
    var steps = STEPS.filter(function (st) { return isNew || !st.newOnly; });
    var idx = Math.max(0, steps.findIndex(function (x) { return x.id === e.step; }));
    var grp = G.groupInfo(e.group);
    var nowGroup = !isNew && l ? G.ageGroup(l.age) : null;
    var town = byId(BAL.TOWNS, isNew ? e.townId : l.townId);
    var ident = byId(BAL.IDENTITIES, e.gender) || BAL.IDENTITIES[3], pro = byId(BAL.PRONOUNS, e.pronouns) || BAL.PRONOUNS[2];
    var saveLabel = isNew ? '👶 Start my life!' : '✅ Save my look';
    var groupsRow = BAL.AGE_GROUPS.map(function (g) {
      return '<button class="pick chip small' + (g.id === e.group ? ' on' : '') + '" data-act="edGroup"' + a('v', g.id) + '>' + g.emoji + ' ' + g.name + (g.id === nowGroup ? ' 📍' : '') + '</button>';
    }).join('');
    var previewNote = isNew ? 'Tap an age to see — and dress — your character as they grow up!'
      : (e.group === nowGroup ? '📍 This is how you look now.' : 'Planning ahead! You\'ll wear this when you\'re in the ' + grp.name + ' age group.');
    var preview = '<div class="ed-preview card" style="--t1:' + town.colors[0] + ';--t2:' + town.colors[1] + '">' +
      '<div class="ed-stage"><div class="ed-av bob">' + BAL.avatar(look, edAge(), 92, { full: true, label: 'Your character' }) + '</div><div class="ed-floor"></div></div>' +
      '<div class="preview-name" id="pvname">' + esc(e.name || '…') + '</div>' +
      '<div class="ed-ident">' + ident.emoji + ' ' + esc(ident.name) + ' · ' + esc(pro.name) + '</div>' +
      '<div class="pick-row center">' + groupsRow + '</div>' +
      '<p class="muted small center">' + previewNote + '</p>' +
      btn(saveLabel, 'edSave', '', 'primary huge') +
      (isNew ? btn('🎲 Surprise me!', 'edRandomAll', '', 'ghost') : btn('Cancel', 'edCancel', '', 'ghost')) + '</div>';
    var nav = '<nav class="steps" aria-label="Steps">' + steps.map(function (st, i) {
      return '<button class="step' + (st.id === e.step ? ' on' : '') + (i < idx ? ' done' : '') + '" data-act="edStep"' + a('v', st.id) + '><span class="step-num">' + (i < idx ? '✓' : i + 1) + '</span><span class="step-name">' + st.emoji + ' ' + st.name + '</span></button>';
    }).join('') + '</nav>';
    var body = { me: edMe, face: edFace, clothes: edClothes, extras: edExtras, home: edHome }[e.step] || edMe;
    var foot = '<div class="step-nav">' + (idx > 0 ? btn('⬅ Back', 'edStep', a('v', steps[idx - 1].id), 'big ghost') : '<span></span>') +
      (idx < steps.length - 1 ? btn('Next ➡', 'edStep', a('v', steps[idx + 1].id), 'big primary') : btn(saveLabel, 'edSave', '', 'big pink')) + '</div>';
    return topbar() + '<main class="creator">' + preview + '<div class="creator-options">' +
      '<h1 class="section-title">' + (isNew ? '✨ Create your character' : '🪞 Change Your Look') + '</h1>' +
      (isNew ? '' : '<div class="tip">💸 Changing your look is always <b>free</b> — change it as often as you like! Special items marked 🔒 can be unlocked in the Shop.</div>') +
      nav + '<div class="ed-body pop">' + body(e) + '</div>' + foot + '</div></main>' +
      '<div class="ed-float" aria-hidden="true">' + BAL.avatar(look, edAge(), 92, { full: true }) + '</div>';
  }

  function swatchRow(k, list, val, label) {
    return '<div class="pick-row" role="group" aria-label="' + esc(label || k) + '">' + list.map(function (col) {
      return '<button class="pick swatch' + (val === col ? ' on' : '') + '" data-act="edSet"' + a('k', k) + a('v', col) + ' style="background:' + col + '" aria-label="' + esc(label || k) + ' colour ' + col + '"' + (val === col ? ' aria-pressed="true"' : '') + '></button>';
    }).join('') + '</div>';
  }
  function tile(k, item, val, slot, art) {
    var locked = item.special && edLocked(slot || k, item.id);
    var on = val === item.id;
    return '<button class="tile' + (on ? ' on' : '') + (locked ? ' locked' : '') + '" data-act="edSet"' + a('k', k) + a('v', item.id) + (locked ? a('locked', 1) : '') + ' aria-pressed="' + on + '">' +
      (art ? '<span class="tile-art">' + art + '</span>' : '<span class="tile-emoji">' + item.emoji + '</span>') +
      '<span class="tile-name">' + esc(item.name) + '</span>' + (locked ? '<span class="tile-lock">🔒 Shop</span>' : (item.special ? '<span class="tile-lock got">✨ Special</span>' : '')) + '</button>';
  }
  function tiles(k, list, val, slot) { return '<div class="tile-grid">' + list.map(function (it) { return tile(k, it, val, slot); }).join('') + '</div>'; }
  function edCard(title, inner, note) { return '<section class="card opt"><h3>' + title + '</h3>' + (note ? '<p class="muted small">' + note + '</p>' : '') + inner + '</section>'; }

  function edMe(e) {
    return edCard('📛 Name', '<div class="name-row"><input id="cname" maxlength="20" value="' + esc(e.name) + '" aria-label="Character name" autocomplete="off"><button class="btn" data-act="edName" aria-label="Random name">🎲</button></div>') +
      edCard('🙂 Who is your character?', tiles('gender', BAL.IDENTITIES, e.gender), 'Pick whatever feels right. Every character can wear any clothes, hairstyle or accessory! 🌈') +
      edCard('💬 Pronouns', '<div class="pick-row">' + BAL.PRONOUNS.map(function (p) {
        return '<button class="pick chip' + (e.pronouns === p.id ? ' on' : '') + '" data-act="edSet"' + a('k', 'pronouns') + a('v', p.id) + ' aria-pressed="' + (e.pronouns === p.id) + '">' + esc(p.name) + '</button>';
      }).join('') + '</div>', 'How should the game talk about your character?');
  }

  function edFace(e) {
    var L = BAL.LOOKS, look = e.look, age = edAge();
    var hairTiles = '<div class="tile-grid hair">' + L.hairStyles.map(function (h) {
      var art = BAL.avatar(Object.assign({}, look, { hair: h.id, accessory: 'none' }), Math.max(age, 5), 90, { bg: '#fff' });
      return tile('hair', h, look.hair, 'hair', art);
    }).join('') + '</div>';
    return edCard('🎨 Skin tone', swatchRow('skin', L.skins, look.skin, 'Skin')) +
      edCard('👀 Eye colour', swatchRow('eyes', L.eyes, look.eyes, 'Eye')) +
      edCard('💇 Hairstyle', hairTiles, e.group === 'baby' ? 'Babies only have a little curl — try another age to see your full hairstyle!' : '') +
      edCard('🌈 Hair colour', swatchRow('hairColor', L.hairColors, look.hairColor, 'Hair'), 'Hair turns silver in the Older Adults years. ✨');
  }

  function edClothes(e) {
    var grp = G.groupInfo(e.group), of = e.look.outfits[e.group], C = BAL.CLOTH_COLORS;
    var bottoms = G.wardrobe('bottom', e.group);
    var b = G.piece('bottom', of.bottom);
    var covered = b.kind === 'dress' || b.kind === 'onesie';
    function kinds(list) { return bottoms.filter(function (x) { return list.indexOf(x.kind) >= 0; }); }
    var groups = [
      ['👖 Trousers & Shorts', kinds(['trousers', 'shorts', 'dungarees'])],
      ['🌼 Skirts', kinds(['skirt'])],
      ['👗 Dresses', kinds(['dress'])],
      ['🐣 All-in-ones', kinds(['onesie'])]
    ].filter(function (x) { return x[1].length; });
    var tabs = '<div class="collection-tabs">' + BAL.AGE_GROUPS.map(function (g) {
      return '<button class="ctab' + (g.id === e.group ? ' on' : '') + '" data-act="edGroup"' + a('v', g.id) + '><span>' + g.emoji + '</span>' + g.name + '<small>' + g.ages + '</small></button>';
    }).join('') + '</div>';
    return '<div class="collection-banner"><span class="cb-emoji">' + grp.emoji + '</span><div><b>The ' + grp.name + ' Collection</b><small>Clothes for ages ' + grp.ages + ' — every outfit is free!</small></div>' +
      '<div class="cb-btns">' + btn('🎲 Random outfit', 'edRandom', '', 'small') + btn('↺ Reset', 'edReset', '', 'small ghost') + '</div></div>' + tabs +
      edCard('👕 Tops', tiles('top', G.wardrobe('top', e.group), of.top) + '<h4>Top colour</h4>' + swatchRow('topColor', C, of.topColor, 'Top'),
        covered ? 'Your ' + b.name.toLowerCase() + ' covers your top — pick trousers, shorts or a skirt to show it off!' : '') +
      edCard('👖 Trousers, Skirts & Dresses', groups.map(function (gp) { return '<h4>' + gp[0] + '</h4>' + tiles('bottom', gp[1], of.bottom); }).join('') +
        '<h4>Colour</h4>' + swatchRow('bottomColor', C, of.bottomColor, 'Trousers, skirt or dress')) +
      edCard('👟 Shoes', tiles('shoes', G.wardrobe('shoes', e.group), of.shoes, 'shoes') + '<h4>Shoe colour</h4>' + swatchRow('shoesColor', C, of.shoesColor, 'Shoe'));
  }

  function edExtras(e) {
    var of = e.look.outfits[e.group], grp = G.groupInfo(e.group);
    return edCard('🎩 Hats, glasses & hair accessories', tiles('accessory', BAL.LOOKS.accessories, e.look.accessory, 'accessory'), 'These stay with you at every age.') +
      edCard('🧣 Extras for the ' + grp.name + ' Collection', tiles('extra', G.wardrobe('extra', e.group), of.extra, 'extra') + '<h4>Extra colour</h4>' + swatchRow('extraColor', BAL.CLOTH_COLORS, of.extraColor, 'Extra')) +
      edCard('💜 Favourite colour', swatchRow('fav', BAL.CLOTH_COLORS.slice(0, 9), e.look.fav, 'Favourite'), 'Used for caps, woolly hats and headbands.');
  }

  function edHome(e) {
    return edCard('👪 Your family', '<div class="pick-row">' + BAL.FAMILY_TYPES.map(function (f) {
      return '<button class="pick chip' + (e.familyType === f.id ? ' on' : '') + '" data-act="edSet"' + a('k', 'familyType') + a('v', f.id) + '>' + f.emoji + ' ' + esc(f.name) + '</button>';
    }).join('') + '</div>') +
      edCard('📍 Where will you live?', '<div class="pick-row type-filter">' + [{ id: 'all', name: 'Everywhere', emoji: '🌍' }].concat(BAL.TOWN_TYPES).map(function (ty) {
        var n = ty.id === 'all' ? BAL.TOWNS.length : BAL.TOWNS.filter(function (t) { return t.type === ty.id; }).length;
        return '<button class="pick chip small' + ((S.townType || 'all') === ty.id ? ' on' : '') + '" data-act="townType"' + a('v', ty.id) + '>' + ty.emoji + ' ' + ty.name + ' <small>' + n + '</small></button>';
      }).join('') + '</div><div class="town-grid">' + BAL.TOWNS.filter(function (t) { return !S.townType || S.townType === 'all' || t.type === S.townType; }).map(function (t) {
        var specials = G.townMap(t.id).places.filter(function (p) { return G.place(p.id).special || p.id === 'harbour'; }).map(function (p) { return G.place(p.id).emoji; }).join(' ');
        return '<button class="town-card' + (t.id === e.townId ? ' on' : '') + '" data-act="edSet"' + a('k', 'townId') + a('v', t.id) + ' style="--t1:' + t.colors[0] + ';--t2:' + t.colors[1] + '"><span class="town-emoji">' + t.emoji + '</span><b>' + esc(t.name) + '</b><small>' + esc(t.kind) + '</small><span class="town-desc">' + esc(t.desc) + '</span>' + (specials ? '<span class="town-specials">Special places: ' + specials + '</span>' : '') + '</button>';
      }).join('') + '</div>');
  }

  function edSet(k, v, locked) {
    var e = S.ed;
    if (locked) {
      BAL.sound('bad');
      toast(e.mode === 'edit' ? 'That\'s a special item! Buy it with coins in the Shop 🛍️ to unlock it.' : 'That\'s a special item! You can unlock it in the Shop once your life begins. 🛍️', '🔒', 'bad');
      return;
    }
    if (LOOK_KEYS.indexOf(k) >= 0) e.look[k] = v;
    else if (OUTFIT_KEYS.indexOf(k) >= 0) e.look.outfits[e.group][k] = v;
    else if (ED_KEYS.indexOf(k) >= 0) {
      e[k] = v;
      if (k === 'gender') { var id = byId(BAL.IDENTITIES, v); if (id && (v === 'girl' || v === 'boy' || e.pronouns !== 'they')) e.pronouns = id.pronouns; }
    }
    BAL.sound('click');
    render();
  }

  function edSave() {
    var e = S.ed;
    if (!e.name || !e.name.trim()) { e.step = 'me'; render(); var inp = document.getElementById('cname'); if (inp) { inp.classList.add('shake'); inp.focus(); } toast('Please give your character a name! 📛', '📛', 'bad'); return; }
    if (e.mode === 'edit') {
      S.ed = null; S.screen = 'game';
      act('setLook', e.look, e.name, e.gender, e.pronouns);
      return;
    }
    var nl = G.newLife({ name: e.name, gender: e.gender, pronouns: e.pronouns, look: e.look, townId: e.townId, familyType: e.familyType });
    Store.addChar(nl);
    S.ed = null; S.screen = 'game'; S.tab = 'activities';
    render(); window.scrollTo(0, 0);
    BAL.sound('tada'); confetti(true);
    var fam = nl.people.filter(function (x) { return G.PARENTS.indexOf(x.role) >= 0; }).map(function (x) { return x.name; });
    openModal({ html: '<div class="welcome-av">' + BAL.avatar(nl.look, 0, 95, { full: true }) + '</div><p class="lead">Welcome to the world, <b>' + esc(nl.name) + '</b>!</p><p>You were born in ' + G.town(nl).emoji + ' <b>' + esc(G.town(nl).name) + '</b>' + (fam.length ? ' to ' + esc(fam.join(' and ')) : '') + '.</p>' +
      '<ul class="year-lines"><li><span>🎈</span> Do <b>activities</b> using your ⚡ energy.</li><li><span>✅</span> Finish your <b>daily jobs</b>.</li><li><span>🪞</span> Tap <b>Change Your Look</b> any time — it\'s free!</li><li><span>🎂</span> Press <b>Age Up</b> to have a birthday and grow!</li></ul>',
      title: 'It\'s a new life! 👶', buttons: [{ label: 'Let\'s go! 🚀' }] });
  }

  /* ---------- Game screen ---------- */
  var TABS = [
    { id: 'activities', name: 'Activities', emoji: '🎈', color: '#FF6B6B' },
    { id: 'school', name: 'School', emoji: '🏫', color: '#FF9F1C' },
    { id: 'people', name: 'Family & Friends', emoji: '❤️', color: '#F783AC' },
    { id: 'home', name: 'Home & Cars', emoji: '🏠', color: '#4DABF7' },
    { id: 'pets', name: 'Pets', emoji: '🐾', color: '#69DB7C' },
    { id: 'money', name: 'Money', emoji: '🪙', color: '#F59F00' },
    { id: 'shop', name: 'Shop', emoji: '🛍️', color: '#9775FA' },
    { id: 'health', name: 'Health', emoji: '🏥', color: '#FF5D73' },
    { id: 'chores', name: 'Daily Jobs', emoji: '✅', color: '#20C997' },
    { id: 'explore', name: 'Explore', emoji: '🗺️', color: '#3A86FF' },
    { id: 'story', name: 'My Story', emoji: '📖', color: '#F59F00' }
  ];

  function renderGame() {
    var l = life();
    if (!l) return '';
    if (l.ended) { S.screen = 'end'; return renderEnd(); }
    if (!Array.isArray(l.goals) || l.goalsAge !== l.age) { G.ensureGoals(l); save(); }
    var goalsLeft = G.goalsLeft(l);
    var t = G.town(l), st = BAL.STAGES[G.stage(l.age)];
    var choresLeft = l.chores.filter(function (c) { return !c.done; }).length;
    var tabs = TABS.map(function (tb) {
      var name = tb.name, emoji = tb.emoji, badge = '';
      if (tb.id === 'school') { if (l.age >= 18 && !l.edu.course) { name = 'Work'; emoji = '💼'; } else if (l.age < 3) { name = 'Learning'; emoji = '🧸'; } }
      if (tb.id === 'chores' && choresLeft) badge = '<span class="badge">' + choresLeft + '</span>';
      if (tb.id === 'health' && l.sick) badge = '<span class="badge">!</span>';
      if (tb.id === 'money' && l.owed > 0) badge = '<span class="badge">!</span>';
      return '<button class="tab' + (S.tab === tb.id ? ' on' : '') + '" data-act="tab"' + a('id', tb.id) + ' style="--tc:' + tb.color + '"><span class="tab-emoji">' + emoji + '</span><span class="tab-name">' + name + '</span>' + badge + '</button>';
    }).join('');
    var pips = '';
    for (var i = 0; i < l.maxEnergy; i++) pips += '<span class="pip' + (i < l.energy ? ' on' : '') + '">⚡</span>';
    var stats = BAL.STATS.map(function (s) {
      return '<div class="stat"><span class="stat-label">' + s.emoji + ' ' + s.name + '</span><span class="stat-num">' + l.stats[s.id] + '</span>' + bar(l.stats[s.id], s.color, s.name) + '</div>';
    }).join('');
    var status = l.job ? G.job(l).emoji + ' ' + esc(G.jobTitle(l)) : l.edu.course ? '🎓 Student' : l.business ? G.biz(l).emoji + ' ' + esc(G.biz(l).name) + ' owner' : (l.sideJobs || []).length ? byId(BAL.SIDE_JOBS, l.sideJobs[0].id).emoji + ' ' + byId(BAL.SIDE_JOBS, l.sideJobs[0].id).name : l.retired ? '🏖️ Retired' : (G.school(l) ? G.school(l).emoji + ' ' + G.school(l).label.split(' —')[0] : st.emoji + ' ' + st.name);

    return topbar() + '<main class="game">' +
      '<aside class="char card" style="--t1:' + t.colors[0] + ';--t2:' + t.colors[1] + '">' +
      '<div class="char-top"><div class="char-av"><div class="bob">' + BAL.avatar(l.look, l.age, l.stats.happy, { full: true, label: l.name }) + '</div>' + (l.sick ? '<span class="sick-tag" title="Feeling poorly">' + byId(BAL.ILLNESSES, l.sick.id).emoji + '</span>' : '') + '</div>' +
      '<div class="char-id"><div class="char-name">' + esc(l.name) + (l.generation > 1 ? ' <small title="Generation">Gen ' + l.generation + '</small>' : '') + '</div>' +
      '<div class="char-age"><b>' + l.age + '</b> year' + (l.age === 1 ? '' : 's') + ' old</div>' +
      '<div class="chips-row"><span class="chip-s">' + st.emoji + ' ' + st.name + '</span><span class="chip-s">' + t.emoji + ' ' + esc(t.name) + '</span></div>' +
      (status.indexOf(st.name) < 0 ? '<div class="chips-row"><span class="chip-s">' + status + '</span></div>' : '') +
      '</div></div><button class="btn look-btn" data-act="changeLook"><span>🪞</span> Change Your Look <small>· free!</small></button>' +
      '<div class="coins-row"><span class="coins" title="Coins (pretend money)"><span class="coin-ico">🪙</span> ' + fmt(l.coins) + '</span><span class="stars-chip" title="Challenge stars">⭐ ' + fmt(l.totals.stars || 0) + '</span><span class="year">📅 ' + l.year + '</span></div>' +
      '<div class="energy" title="Energy: each activity uses one ⚡. Age up to get more!"><span class="energy-label">Energy</span>' + pips + '</div>' +
      '<div class="stats">' + stats + '</div>' +
      (goalsLeft ? '<button class="btn ageup locked" data-act="ageUp"><span class="cake">🔒</span> Age Up<small>Finish ' + goalsLeft + ' more challenge' + (goalsLeft === 1 ? '' : 's') + ' first</small></button>'
        : '<button class="btn ageup ready" data-act="ageUp"><span class="cake">🎂</span> Age Up!<small>Birthday ready — go to age ' + (l.age + 1) + '!</small></button>') +
      '</aside>' +
      '<section class="play">' + challengesCard(l) + '<nav class="tabs" aria-label="Game sections">' + tabs + '</nav>' +
      '<div class="panel card pop" id="panel">' + renderPanel(l) + '</div></section></main>';
  }

  function renderPanel(l) {
    switch (S.tab) {
      case 'school': return panelSchool(l);
      case 'people': return panelPeople(l);
      case 'home': return panelHome(l);
      case 'pets': return panelPets(l);
      case 'shop': return panelShop(l);
      case 'health': return panelHealth(l);
      case 'chores': return panelChores(l);
      case 'towns': return panelTowns(l);
      case 'story': return panelStory(l);
      case 'money': return panelMoney(l);
      case 'explore': return panelExplore(l);
      default: return panelActivities(l);
    }
  }
  function head(emoji, title, sub) { return '<div class="panel-head"><span class="panel-emoji">' + emoji + '</span><div><h2>' + title + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + '</div></div>'; }
  function energyNote(l) {
    if (l.energy) return '<span class="energy-note">⚡ ' + l.energy + ' energy left</span>';
    if (G.goalsLeft(l)) return '<div class="tip rest-tip">😴 Out of energy! Have a rest to recharge, then finish your challenges. ' + btn('😴 Rest & recharge', 'do', a('fn', 'rest'), 'small primary') + '</div>';
    return '<div class="tip">😴 Out of energy — and all your challenges are done! Press <b>🎂 Age Up</b> for your birthday.</div>';
  }

  function panelActivities(l) {
    var list = G.activities(l).map(function (x) {
      var cost = G.activityCost(l, x);
      return '<button class="act-card" data-act="do" data-fn="activity"' + a('a1', x.id) + (l.energy ? '' : ' disabled') + '>' +
        '<span class="act-emoji">' + x.emoji + '</span><span class="act-name">' + esc(x.name) + '</span>' +
        '<span class="act-fx">' + fxChips(x.fx) + (x.earn ? '<span class="fxchip coin">🪙+</span>' : '') + '</span>' +
        '<span class="act-cost">⚡1 ' + (cost ? ' · 🪙 ' + fmt(cost) : '') + '</span></button>';
    }).join('');
    return head('🎈', 'Things to do', 'Each activity uses 1 ⚡ energy.') + energyNote(l) + '<div class="act-grid">' + list + '</div>';
  }

  function panelSchool(l) {
    var out = '', sch = G.school(l);
    if (l.age < 3) {
      return head('🧸', 'Learning through play', 'Babies learn by playing, cuddling and exploring!') +
        '<div class="big-msg"><span>🍼</span><p>You\'re too little for school. Try <b>Say New Words</b> and <b>Crawl & Explore</b> in Activities! Nursery starts at age 3.</p></div>';
    }
    if (sch) {
      var stars = G.gradeStars(l);
      out += head(sch.emoji, esc(sch.name), esc(sch.label)) +
        '<div class="info-card"><div><b>School report</b><div class="stars" aria-label="' + stars + ' out of 5 stars">' + '⭐'.repeat(stars) + '<span class="dim">' + '⭐'.repeat(5 - stars) + '</span></div></div>' +
        (sch.kind !== 'nursery' ? btn('📚 Study hard <small>⚡1</small>', 'do', a('fn', 'study'), 'primary') : '<p>Painting, singing and story time! 🎨🎵</p>') + '</div>';
      if (sch.kind !== 'nursery') {
        out += '<h3 class="sub">🎯 After-school clubs <small>(pick up to 2 — they give a boost every year)</small></h3><div class="mini-grid">' + BAL.CLUBS.map(function (c) {
          var on = l.edu.clubs.indexOf(c.id) >= 0;
          return '<div class="mini-card' + (on ? ' on' : '') + '"><span class="mini-emoji">' + c.emoji + '</span><b>' + c.name + '</b><span>' + fxChips(c.fx) + '</span>' +
            (on ? btn('Leave', 'do', a('fn', 'leaveClub') + a('a1', c.id), 'small ghost') : btn('Join', 'do', a('fn', 'joinClub') + a('a1', c.id), 'small')) + '</div>';
        }).join('') + '</div>';
      }
      if (l.age >= 12 && l.age < 18) out += sideJobsSection(l);
      if (l.age < 18) out += skillsSection(l);
      if (l.age < 18) out += '<div class="tip">💡 When you\'re 18 you can go to college or university, or start a job!</div>';
      if (!l.edu.course) return out;
    }
    // Grown-ups
    if (!sch) out += head('💼', 'Work & Learning', 'Your education: <b>' + BAL.EDU_LEVELS[l.edu.level] + '</b>');
    if (l.job) {
      out += jobCard(l);
    } else if (!l.edu.course) {
      out += '<div class="info-card"><span class="big-emoji">' + (l.retired ? '🏖️' : '🔍') + '</span><div>' + (l.retired ? '<b>You are retired!</b> Enjoy your hobbies. You can still take a job if you want.' : l.business ? '<b>You run your own business!</b> You can also take a full-time job or side jobs.' : '<b>No full-time job right now.</b> Apply at the Job Centre below — and try odd jobs in the 🪙 Money tab meanwhile!') + '</div></div>';
    }
    if (l.edu.course) {
      out += '<div class="tip">📚 While you are studying you get a small student grant each year. Finish your course to unlock better jobs!</div>';
    }
    if (l.business) out += businessSection(l);
    if (!l.edu.course) {
      var t = G.town(l);
      out += '<h3 class="sub">🏢 Job Centre <small>(full-time jobs · applying uses ⚡1)</small></h3><div class="job-grid">' + BAL.JOBS.map(function (jb) {
        var chk = G.jobCheck(l, jb);
        var reqs = [];
        reqs.push('<span class="tag ' + (l.edu.level >= jb.edu ? 'ok' : 'no') + '">🎓 ' + BAL.EDU_LEVELS[jb.edu] + '</span>');
        if (jb.smarts) reqs.push('<span class="tag ' + (l.stats.smarts >= jb.smarts ? 'ok' : 'no') + '">🧠 ' + jb.smarts + '+</span>');
        if (jb.fitness) reqs.push('<span class="tag ' + (l.stats.fitness >= jb.fitness ? 'ok' : 'no') + '">💪 ' + jb.fitness + '+</span>');
        if (jb.lvl) reqs.push(skillTag(l, jb.skill, jb.lvl));
        if (jb.licence) reqs.push('<span class="tag ' + (l.licence ? 'ok' : 'no') + '">🪪 Licence</span>');
        var mine = l.job && l.job.id === jb.id;
        return '<div class="job-card' + (chk.ok ? ' can' : '') + (mine ? ' mine' : '') + '"><span class="job-emoji">' + jb.emoji + '</span><div class="grow"><b>' + jb.name + '</b><div class="pay">🪙 ' + fmt(jb.pay * t.pay) + ' / year</div><div class="reqs">' + reqs.join('') + '</div></div>' +
          (mine ? '<span class="tag ok">Your job</span>' : btn(chk.ok ? 'Apply' : '🔒', 'do', a('fn', 'applyJob') + a('a1', jb.id), 'small' + (chk.ok ? ' primary' : ' ghost'))) + '</div>';
      }).join('') + '</div>';
    }
    if (l.age >= 18) out += sideJobsSection(l) + skillsSection(l) + (l.business ? '' : businessSection(l));
    // Courses
    if (!l.edu.course && l.age >= 18) {
      var courses = ['college', 'uni'].map(function (id) {
        var c = BAL.COURSES[id];
        var done = l.edu.level >= c.level;
        return '<div class="mini-card' + (done ? ' on' : '') + '"><span class="mini-emoji">' + c.emoji + '</span><b>' + c.name + '</b><small>' + c.years + ' years · free</small><small>' + c.desc + '</small>' +
          (done ? '<span class="tag ok">✓ Done</span>' : btn('Enrol', 'do', a('fn', 'enrol') + a('a1', id), 'small')) + '</div>';
      }).join('');
      out += '<h3 class="sub">🎓 Go back to learning</h3><div class="mini-grid two">' + courses + '</div>';
    }
    return out;
  }

  function personCard(l, p) {
    var role = BAL.ROLES[p.role] || { label: p.role, emoji: '🙂' };
    var label = G.relLabel(p);
    if (p.role === 'child' && p.age < 18) return childCard(l, p);
    var love = ['partner', 'fiance', 'spouse'].indexOf(p.role) >= 0;
    var btns = btn('💬 Talk', 'convo', a('id', p.id), 'small primary') + btn('💞 Spend time <small>⚡</small>', 'do', a('fn', 'spendTime') + a('a1', p.id), 'small') + btn('🎁 Gift', 'do', a('fn', 'giveGift') + a('a1', p.id), 'small');
    if (love) btns += btn('🌹 Date <small>⚡</small>', 'do', a('fn', 'date') + a('a1', p.id), 'small');
    var extra = p.role === 'child' && p.grownJob && G.byId(BAL.JOBS, p.grownJob) ? ' · ' + G.byId(BAL.JOBS, p.grownJob).emoji + ' ' + G.byId(BAL.JOBS, p.grownJob).name : '';
    return '<div class="person' + (love ? ' love' : '') + '"><div class="person-av">' + BAL.avatar(p.look, p.age, p.close, { bg: '#fff' }) + '</div>' +
      '<div class="grow"><div class="person-name"><b>' + esc(p.name) + '</b> <span class="role">' + role.emoji + ' ' + label + '</span></div>' +
      '<div class="muted small">Age ' + p.age + extra + (p.parentName ? ' · ' + esc(p.parentName) + '\'s baby' : '') + (p.livesWith ? ' · 🏡 lives with you' : '') + '</div>' + hearts(p.close) +
      '<div class="btn-row">' + btns + '</div></div></div>';
  }

  function loveCard(l, p) {
    var step = G.loveStep(p);
    var steps = [['💘', 'Dating'], ['💕', p.gender === 'girl' ? 'Girlfriend' : 'Boyfriend'], ['🏡', 'Living together'], ['💍', 'Engaged'], ['💒', 'Married']];
    var next = '';
    if (step === 0) next = btn('💕 Ask to be your ' + (p.gender === 'girl' ? 'girlfriend' : 'boyfriend'), 'do', a('fn', 'askOut') + a('a1', p.id), 'small pink');
    if (step >= 1 && !p.livesWith) next += btn('📦 Move in together', 'do', a('fn', 'moveIn') + a('a1', p.id), 'small');
    if (p.role === 'partner' && step >= 1) next += btn('💍 Propose <small>ring</small>', 'do', a('fn', 'propose') + a('a1', p.id), 'small pink');
    if (p.role === 'fiance') next += btn('💒 Plan the wedding', 'wedding', a('id', p.id), 'small pink');
    if (p.livesWith && l.home.type !== 'own') next += btn('🔑 Buy a home together', 'tab', a('id', 'home'), 'small');
    return '<div class="love-card">' + personCard(l, p) +
      '<div class="love-steps">' + steps.map(function (s, i) { return '<span class="ls' + (i < step ? ' done' : i === step ? ' on' : '') + '"><b>' + (i < step ? '✓' : s[0]) + '</b>' + s[1] + '</span>'; }).join('<i></i>') + '</div>' +
      (next ? '<div class="btn-row">' + next + '</div>' : '') +
      '<div class="btn-row"><button class="btn small ghost" data-act="confirm" data-fn="separate" data-a1="' + esc(p.id) + '">🍂 Go separate ways</button></div></div>';
  }

  function childCard(l, p) {
    var k = p.kid || G.ensureKid(p);
    var needs = [];
    needs.push('<span class="need' + (k.meals ? ' ok' : '') + '">🥣 ' + (k.meals ? 'Fed ' + k.meals + '/3' : 'Needs a meal') + '</span>');
    if (p.age >= 5) needs.push('<span class="need' + (k.hw ? ' ok' : '') + '">📚 ' + (k.hw ? 'Homework ' + k.hw + '/3' : 'Homework to do') + '</span>');
    if (k.outgrown) needs.push('<span class="need warn">👕 Grown out of clothes!</span>');
    if (k.bday) needs.push('<span class="need party">🎂 Birthday to celebrate!</span>');
    if (k.sick) needs.push('<span class="need warn">🤒 Has ' + esc(k.sick) + '</span>');
    var b = btn('🥣 Feed', 'kidFeed', a('id', p.id), 'small') +
      (p.age >= 5 ? btn('📚 Homework <small>⚡</small>', 'kidHw', a('id', p.id), 'small') : '') +
      btn('👕 Clothes', 'kidClothes', a('id', p.id), 'small' + (k.outgrown ? ' primary' : '')) +
      (k.bday ? btn('🎂 Birthday', 'kidBday', a('id', p.id), 'small pink') : '') +
      btn('🩺 Doctor <small>⚡</small>', 'do', a('fn', 'childDoctor') + a('a1', p.id), 'small' + (k.sick ? ' primary' : '')) +
      btn('🎈 Play <small>⚡</small>', 'kidPlay', a('id', p.id), 'small') +
      btn('💬 Talk', 'convo', a('id', p.id), 'small primary') +
      (p.age >= 5 ? btn('🐷 Pocket money', 'do', a('fn', 'pocketMoney') + a('a1', p.id), 'small ghost') : '');
    return '<div class="person child-card"><div class="child-av">' + BAL.avatar(p.look, p.age, k.happy, { full: true }) + '</div>' +
      '<div class="grow"><div class="person-name"><b>' + esc(p.name) + '</b> <span class="role">' + (p.gender === 'girl' ? '👧' : '👦') + ' ' + G.relLabel(p) + '</span></div>' +
      '<div class="muted small">Age ' + p.age + ' · ' + BAL.STAGES[G.stage(p.age)].emoji + ' ' + BAL.STAGES[G.stage(p.age)].name + '</div>' +
      '<div class="kid-stats"><span>😊</span>' + bar(k.happy, '#FFB703', 'Happiness') + '<span>❤️</span>' + bar(k.health, '#FF5D73', 'Health') + '<span>🧠</span>' + bar(k.smarts, '#7B61FF', 'Smarts') + '<span>💞</span>' + bar(p.close, 'linear-gradient(90deg,#FF8FAB,#FF4D6D)', 'Closeness') + '</div>' +
      '<div class="needs">' + needs.join('') + '</div><div class="btn-row">' + b + '</div></div></div>';
  }

  function occasionsCard(l) {
    var occ = G.occasions(l);
    if (!occ.length) return '';
    return '<div class="occasions"><h3 class="sub">🎉 Family occasions this year</h3><div class="occ-grid">' + occ.map(function (o) {
      var choices = o.child ? btn('🎂 Plan the party', 'kidBday', a('id', o.child), 'small pink')
        : o.done ? '<span class="tag ok">✓ Celebrated!</span>'
          : o.levels.map(function (v) { var x = BAL.OCCASION_LEVELS[v], c = G.occasionCost(l, v); return btn(x.emoji + ' ' + x.name + ' <small>' + (c ? '🪙' + fmt(c) : 'free') + '</small>', 'do', a('fn', 'celebrate') + a('a1', o.id) + a('a2', v), 'small'); }).join('');
      return '<div class="occ' + (o.done ? ' done' : '') + '"><span class="occ-emoji">' + o.emoji + '</span><div class="grow"><b>' + esc(o.name) + '</b><div class="small muted">' + esc(o.desc) + '</div><div class="btn-row">' + choices + '</div></div></div>';
    }).join('') + '</div></div>';
  }

  function panelPeople(l) {
    var partner = G.partner(l);
    var kids = G.kidsAtHome(l);
    var top = '<div class="btn-row">';
    if (l.age >= 3) top += btn('🤝 Make a friend <small>⚡1</small>', 'do', a('fn', 'makeFriend'), 'primary');
    if (l.age >= 18 && !partner) top += btn('💘 Meet someone special <small>⚡1</small>', 'findLove', '', 'pink');
    if (partner && (partner.livesWith || partner.role === 'spouse') && l.age >= 20 && l.age <= 50) top += btn('👶 Have a baby', 'baby', a('kind', 'haveBaby'), 'pink');
    if (l.age >= 25 && l.age <= 60) top += btn('🏡 Adopt a child', 'baby', a('kind', 'adoptChild'));
    top += '</div>';
    var sec = function (title, ps, fn) { return ps.length ? '<h3 class="sub">' + title + '</h3><div class="people-grid' + (fn === childCard ? ' kids' : '') + '">' + ps.map(function (p) { return (fn || personCard)(l, p); }).join('') + '</div>' : ''; };
    var body = '';
    if (partner) body += '<h3 class="sub">💕 Your love story</h3>' + loveCard(l, partner);
    body += sec('🧸 Your children', kids, childCard);
    body += sec('👪 Family', l.people.filter(function (p) { return ['mum', 'dad', 'parent', 'grandma', 'grandpa', 'sibling'].indexOf(p.role) >= 0; }));
    body += sec('🎓 Grown-up children & grandchildren', l.people.filter(function (p) { return (p.role === 'child' && p.age >= 18) || p.role === 'grandchild'; }));
    body += sec('🤝 Friends', l.people.filter(function (p) { return p.role === 'friend'; }));
    if (!l.people.length) body = '<div class="big-msg"><span>🌱</span><p>Go and meet some people!</p></div>';
    var rem = l.remembered.filter(function (x) { return x.role !== 'pet'; });
    if (rem.length) body += '<h3 class="sub">🌅 Always in your heart</h3><div class="remember">' + rem.map(function (x) { return '<span>💛 ' + esc(x.name) + ' <small>(' + x.age + ')</small></span>'; }).join('') + '</div>';
    var tip = l.age < 18 ? '<div class="tip">💡 Talk to your family and friends, and spend time together to fill their heart bars. Dating and weddings are for grown-ups (18+).</div>'
      : (kids.length ? '<div class="tip">💡 Children need meals, help with homework, new clothes as they grow, a check-up when they\'re poorly — and lots of time with you!</div>' : '<div class="tip">💡 Love story: go on dates → become boyfriend/girlfriend → move in → get engaged → get married. Buy a home together and start a family!</div>');
    return head('❤️', 'Family & Friends', 'The people who make life special.') + energyNote(l) + top + tip + occasionsCard(l) + body;
  }

  /* ---------- family pop-ups ---------- */
  function convoModal(l, pid) {
    var cv = G.conversation(l, pid), p = G.person(l, pid);
    if (!cv) return;
    var mx = cv.r.map(function (r, i) { return function () { var res = act('reply', pid, i); if (res && res.ok && res.go) { S.tab = res.go; render(); } }; });
    openModal({ cls: 'chat', title: esc(p.name), emoji: '<span class="chat-av">' + BAL.avatar(p.look, p.age, 85, { bg: '#fff' }) + '</span>',
      html: '<p class="muted">' + esc(G.relLabel(p)) + '</p><div class="bubble">' + esc(cv.q) + '</div><p class="small muted">What will you say?</p>',
      buttons: cv.r.map(function (r, i) { return { label: esc(r.t), cls: 'primary', fn: mx[i] }; }).concat([{ label: 'Bye! 👋', cls: 'ghost' }]) });
  }
  function kidPicker(l, pid, title, emoji, items, fn) {
    openModal({ emoji: emoji, title: title, buttons: items.map(function (x) { return { label: x.label, cls: x.cls || 'primary', fn: function () { fn(x.v); } }; }).concat([{ label: 'Not now', cls: 'ghost' }]) });
  }
  function kidFeed(l, pid) {
    var p = G.person(l, pid);
    kidPicker(l, pid, 'What\'s for dinner, ' + esc(p.name) + '?', '🥣', BAL.MEALS.map(function (m) { var c = G.price(l, m.cost); return { v: m.id, label: m.emoji + ' ' + m.name + ' <small>' + (c ? '🪙' + c : 'free') + '</small>' }; }), function (v) { act('feedChild', pid, v); });
  }
  function kidBday(l, pid) {
    var p = G.person(l, pid);
    kidPicker(l, pid, 'Happy ' + p.age + 'th birthday, ' + esc(p.name) + '!', '🎂', BAL.CHILD_PARTIES.map(function (x) { var c = G.price(l, x.cost); return { v: x.id, label: x.emoji + ' ' + x.name + ' <small>' + (c ? '🪙' + fmt(c) : 'free') + '</small>', cls: 'pink' }; }), function (v) { act('celebrateChild', pid, v); });
  }
  function kidPlay(l, pid) {
    var p = G.person(l, pid);
    kidPicker(l, pid, 'What shall we do, ' + esc(p.name) + '?', '🎈', G.kidPlay(p).map(function (x) { return { v: x.id, label: x.emoji + ' ' + x.name }; }), function (v) { act('playWithChild', pid, v); });
  }
  function kidClothes(l, pid) {
    var p = G.person(l, pid), grp = G.ageGroup(p.age);
    var outfits = G.childOutfits(l, pid);
    var html = '<p>Pick a new outfit for ' + esc(p.name) + ' (🪙 ' + fmt(G.childClothesCost(l)) + ')</p><div class="outfit-pick">' + outfits.map(function (o, i) {
      var look = JSON.parse(JSON.stringify(G.normalizeLook(p.look))); look.outfits[grp] = o;
      return '<button class="outfit" data-mx="' + i + '">' + BAL.avatar(look, p.age, 90, { full: true }) + '</button>';
    }).join('') + '</div>';
    openModal({ emoji: '👕', title: 'Shopping for ' + esc(p.name), html: html, buttons: [{ label: 'Not now', cls: 'ghost' }],
      x: outfits.map(function (o, i) { return function () { act('buyChildClothes', pid, i); }; }) });
  }
  function playHomework(l, pid) {
    var p = G.person(l, pid);
    var kind = p.age < 8 ? 'maths' : G.pick(['maths', 'spelling', 'facts']);
    S.game = { hw: pid, c: { emoji: '📝', name: 'Homework with ' + p.name }, type: 'quiz', kind: kind, qi: 0, score: 0, results: [], picked: null, quiz: G.makeQuiz(kind, p.age) };
    BAL.sound('click');
    renderMini();
  }

  function panelHome(l) {
    var hi = G.homeInfo(l), out = head('🏠', 'Home & Cars', esc(G.town(l).name) + ' ' + G.town(l).emoji);
    out += '<div class="home-hero"><span class="home-emoji">' + hi.emoji + '</span><div><b class="lg">' + esc(hi.name) + '</b><div>' + esc(hi.kind) + '</div>' +
      (hi.yearly ? '<div>Rent: 🪙 ' + fmt(hi.yearly) + ' a year</div>' : '') +
      (l.home.type === 'own' ? '<div>Worth: 🪙 ' + fmt(l.home.value) + (l.home.owed > 0 ? ' · Still to pay: 🪙 ' + fmt(l.home.owed) + ' (🪙 ' + fmt(l.home.yearly) + '/year)' : ' · <b>Fully paid! 🎉</b>') + '</div>' : '') +
      '<div class="btn-row">' + (l.home.type === 'own' && l.home.owed > 0 ? btn('💰 Pay it all off', 'do', a('fn', 'payOffHome'), 'small') : '') +
      (l.home.type === 'own' ? btn('🪧 Sell home', 'confirm', a('fn', 'sellHome'), 'small ghost') : '') +
      (l.age >= 18 && l.home.type === 'rent' && l.people.some(function (p) { return ['mum', 'dad', 'grandma', 'grandpa'].indexOf(p.role) >= 0; }) ? btn('🏡 Move back with family', 'do', a('fn', 'moveHome'), 'small ghost') : '') +
      '</div></div></div>';
    var helper = G.homeHelper(l);
    if (helper && l.home.type !== 'own') out += '<div class="tip">💑 You live with ' + esc(helper.name) + ', so you can buy a home together — ' + esc(helper.name) + ' will pay up to half the first payment (deposit)!</div>';
    if (l.home.together) { var tg = G.person(l, l.home.together); if (tg) out += '<div class="tip">🏡 You bought this home together with ' + esc(tg.name) + '. 💕</div>'; }
    if (l.age < 18) {
      out += '<div class="tip">🏡 You live with your family. When you\'re 18 you can rent or buy your own home!</div>';
    } else {
      out += '<h3 class="sub">🔑 Homes to rent <small>(pay every year)</small></h3><div class="mini-grid">' + BAL.RENTALS.map(function (h) {
        var on = l.home.type === 'rent' && l.home.id === h.id;
        return '<div class="mini-card' + (on ? ' on' : '') + '"><span class="mini-emoji">' + h.emoji + '</span><b>' + h.name + '</b><span>🪙 ' + fmt(G.price(l, h.rent)) + '/year</span>' + (on ? '<span class="tag ok">You live here</span>' : btn('Rent', 'do', a('fn', 'rentHome') + a('a1', h.id), 'small')) + '</div>';
      }).join('') + '</div>';
      out += '<h3 class="sub">🏡 Homes for sale <small>(pay 20% now, the rest over 20 years)</small></h3><div class="mini-grid">' + BAL.HOMES.map(function (h) {
        var price = G.price(l, h.price), dep = Math.round(price * BAL.HOME_DEPOSIT);
        var on = l.home.type === 'own' && l.home.id === h.id;
        return '<div class="mini-card' + (on ? ' on' : '') + '"><span class="mini-emoji">' + h.emoji + '</span><b>' + h.name + '</b><span>🪙 ' + fmt(price) + '</span><small>First payment: 🪙 ' + fmt(dep) + '</small>' +
          (on ? '<span class="tag ok">Your home</span>' : btn('Buy', 'confirm', a('fn', 'buyHome') + a('a1', h.id), 'small' + (l.coins >= dep ? ' primary' : ''))) + '</div>';
      }).join('') + '</div>';
    }
    out += '<h3 class="sub">🚗 Cars</h3>';
    if (l.age < 17) out += '<div class="tip">🚦 You can learn to drive at 17. Until then — bikes and scooters! 🚲</div>';
    else if (!l.licence) out += '<div class="info-card"><span class="big-emoji">🪪</span><div class="grow"><b>No driving licence yet</b><div>Pass the test to buy a car.</div></div>' + btn('🚦 Take driving test <small>⚡1</small>', 'do', a('fn', 'drivingTest'), 'primary') + '</div>';
    else {
      if (l.cars.length) out += '<div class="mini-grid">' + l.cars.map(function (c) { var cc = byId(BAL.CARS, c.id); return '<div class="mini-card on"><span class="mini-emoji drive">' + cc.emoji + '</span><b>' + cc.name + '</b><span class="tag ok">Yours!</span>' + btn('Sell', 'do', a('fn', 'sellCar') + a('a1', c.uid), 'small ghost') + '</div>'; }).join('') + '</div>';
      out += '<h3 class="sub">🏬 Car showroom</h3><div class="mini-grid">' + BAL.CARS.map(function (c) {
        return '<div class="mini-card"><span class="mini-emoji">' + c.emoji + '</span><b>' + c.name + '</b><span>🪙 ' + fmt(c.price) + '</span>' + btn('Buy', 'do', a('fn', 'buyCar') + a('a1', c.id), 'small' + (l.coins >= c.price ? ' primary' : '')) + '</div>';
      }).join('') + '</div>';
    }
    return out;
  }

  function panelPets(l) {
    var out = head('🐾', 'Pets', 'Love them, play with them and they\'ll make you happy!') + energyNote(l);
    if (l.pets.length) {
      out += '<h3 class="sub">💛 Your pets</h3><div class="people-grid">' + l.pets.map(function (p) {
        var k = byId(BAL.PETS, p.kind);
        return '<div class="person pet"><div class="pet-av wiggle">' + k.emoji + '</div><div class="grow"><div class="person-name"><b>' + esc(p.name) + '</b> <span class="role">' + k.name + '</span></div><div class="muted small">Age ' + p.age + '</div>' +
          hearts(p.love) + '<div class="btn-row">' + btn('🎾 Play <small>⚡</small>', 'do', a('fn', 'playPet') + a('a1', p.id), 'small primary') + btn('🦴 Treat <small>🪙10</small>', 'do', a('fn', 'petTreat') + a('a1', p.id), 'small') +
          btn('🌾', 'confirm', a('fn', 'rehomePet') + a('a1', p.id) + ' title="Find a new home" aria-label="Find ' + esc(p.name) + ' a new home"', 'small ghost') + '</div></div></div>';
      }).join('') + '</div>';
    } else out += '<div class="big-msg"><span>🏠</span><p>No pets yet. Visit the animal shelter below!</p></div>';
    var kid = l.age < 18;
    out += '<h3 class="sub">🏡 Animal Shelter ' + (kid ? '<small>(ask your family — once a year!)</small>' : '<small>(adoption fee + yearly food & vet costs)</small>') + '</h3>';
    if (l.age < 5) out += '<div class="tip">🍼 You can ask for a pet when you\'re 5!</div>';
    out += '<div class="mini-grid">' + BAL.PETS.map(function (k) {
      return '<div class="mini-card"><span class="mini-emoji wiggle-h">' + k.emoji + '</span><b>' + k.name + '</b>' +
        (kid ? '' : '<span>🪙 ' + fmt(G.price(l, k.fee)) + '</span><small>Food: 🪙 ' + fmt(G.price(l, k.cost)) + '/yr</small>') +
        btn(kid ? 'Ask family 🙏' : 'Adopt', 'adoptPet', a('kind', k.id), 'small' + (kid && l.flags.askedPet ? ' ghost' : ' primary')) + '</div>';
    }).join('') + '</div>';
    var rem = l.remembered.filter(function (x) { return x.role === 'pet'; });
    if (rem.length) out += '<h3 class="sub">🌈 Rainbow Bridge friends</h3><div class="remember">' + rem.map(function (x) { var k = byId(BAL.PETS, x.kind); return '<span>' + (k ? k.emoji : '🐾') + ' ' + esc(x.name) + '</span>'; }).join('') + '</div>';
    return out;
  }

  function shopIntro(l) {
    switch (S.shopCat) {
      case 'groceries': return groceriesBlock(l);
      case 'party': {
        var got = (l.partyItems || []).map(function (id) { var it = byId(BAL.ITEMS, id); return it ? it.emoji : ''; }).join(' ');
        return '<div class="tip">🎂 Plan your next birthday party! Everything you buy here is used at your birthday — the more party things, the happier you and your friends will be. ' + (got ? '<br><b>Party so far:</b> ' + got : '') + '</div>';
      }
      case 'home': case 'decor': return '<div class="tip">🏡 Furniture and decorations make your home cosy: every 2 you own give you extra happiness on each birthday (cosiness now: +' + G.cosiness(l) + ' 😊). They move with you!</div>';
      case 'everyday': return '<div class="tip">🧴 Everyday shopping — the little things that keep you clean, healthy and ready for the day.</div>';
      default: return '';
    }
  }

  function panelShop(l) {
    var cats = BAL.SHOP_CATS.map(function (c) { return '<button class="pick chip' + (S.shopCat === c.id ? ' on' : '') + '" data-act="shopCat"' + a('id', c.id) + '>' + c.emoji + ' ' + c.name + '</button>'; }).join('');
    var items = BAL.ITEMS.filter(function (it) { return it.cat === S.shopCat; }).map(function (it) {
      var owned = it.party ? G.partyBought(l, it.id) : (!it.consumable && l.inventory.indexOf(it.id) >= 0);
      var price = G.itemPrice(l, it);
      return '<div class="shop-card' + (owned ? ' owned' : '') + '"><span class="shop-emoji">' + it.emoji + '</span><b>' + it.name + '</b><span class="shop-fx">' + fxChips(it.fx) + '</span>' +
        (owned ? '<span class="tag ok">' + (it.party ? '🎉 Ready!' : '✓ Owned') + '</span>' : btn('🪙 ' + fmt(price), 'do', a('fn', 'buyItem') + a('a1', it.id), 'small' + (l.coins >= price ? ' primary' : ' ghost'))) + '</div>';
    }).join('');
    var stuff = l.inventory.map(function (id) { var it = byId(BAL.ITEMS, id); return it ? '<span title="' + esc(it.name) + '">' + it.emoji + '</span>' : ''; }).join('');
    return head('🛍️', 'The Shops', 'Spend your coins on fun things! You have 🪙 ' + fmt(l.coins) + '.') +
      (l.age < 18 ? '<div class="tip">🐷 Earn coins from chores, birthdays, pocket money, odd jobs and part-time jobs.</div>' : '') +
      '<div class="pick-row">' + cats + '</div>' + shopIntro(l) + '<div class="shop-grid">' + items + '</div>' +
      '<h3 class="sub">🎒 My Stuff</h3><div class="shelf">' + (stuff || '<span class="muted small">Nothing yet — go shopping!</span>') + '</div>' +
      '<h3 class="sub">🪞 Your look</h3><div class="info-card look-card"><div class="mini-full">' + BAL.avatar(l.look, l.age, l.stats.happy, { full: true }) + '</div><div class="grow"><b>Changing your clothes, hair and accessories is always free!</b>' +
      '<div class="small muted">Special items (✨ Sparkly Crown, Superhero Cape, Golden Trainers) are unlocked by buying them in the Clothes department.</div></div>' +
      btn('🪞 Change Your Look', 'changeLook', '', 'primary') + '</div>';
  }

  /* ---------- Economy panels ---------- */
  function skillTag(l, skill, lvl) {
    var s = byId(BAL.SKILLS, skill); if (!s || !lvl) return '';
    return '<span class="tag ' + (G.skillLevel(l, skill) >= lvl ? 'ok' : 'no') + '">' + s.emoji + ' ' + s.name + ' ' + lvl + '+</span>';
  }

  function skillsSection(l) {
    if (l.age < 6) return '';
    var paidCost = l.age < 18 ? 20 : G.classCost(l);
    return '<h3 class="sub">🛠️ Your skills <small>(jobs need skills — higher skills mean more pay and fewer mistakes)</small></h3><div class="skills-grid">' +
      BAL.SKILLS.map(function (s) {
        var v = l.skills[s.id] || 0, lv = G.skillLevel(l, s.id);
        return '<div class="skill"><div class="skill-top"><span class="skill-emoji">' + s.emoji + '</span><b>' + s.name + '</b><span class="skill-lvl">Lv ' + lv + '</span></div>' +
          bar(v, 'linear-gradient(90deg,#74C0FC,#7B61FF)', s.name + ' skill') +
          '<div class="btn-row">' + btn('📖 Library <small>free ⚡1</small>', 'do', a('fn', 'learnSkill') + a('a1', s.id), 'small') +
          btn('🎓 Class <small>🪙' + fmt(paidCost) + ' ⚡1</small>', 'do', a('fn', 'learnSkill') + a('a1', s.id) + a('a2', '1'), 'small ghost') + '</div></div>';
      }).join('') + '</div>';
  }

  function sideJobsSection(l) {
    var mine = l.sideJobs || [];
    var max = l.age < 18 ? 2 : BAL.MAX_JOBS;
    var out = '<h3 class="sub">🧺 ' + (l.age < 18 ? 'Part-time jobs' : 'Side jobs') + ' <small>(you can have more than one job! ' + G.jobCount(l) + ' / ' + max + ' jobs · each job uses 1 ⚡ of your yearly energy)</small></h3>';
    if (mine.length) out += '<div class="mini-grid">' + mine.map(function (x) {
      var sj = byId(BAL.SIDE_JOBS, x.id);
      return '<div class="mini-card on"><span class="mini-emoji">' + sj.emoji + '</span><b>' + sj.name + '</b><small>🪙 ' + fmt(G.shiftPay(l, sj)) + ' per shift · ' + x.shifts + ' shifts done</small>' +
        btn('🕒 Work a shift <small>⚡1</small>', 'do', a('fn', 'workShift') + a('a1', x.id), 'small primary') + btn('Leave', 'do', a('fn', 'quitSideJob') + a('a1', x.id), 'small ghost') + '</div>';
    }).join('') + '</div>';
    var avail = BAL.SIDE_JOBS.filter(function (sj) { return l.age >= sj.minAge - 1 && l.age <= sj.maxAge && !mine.some(function (x) { return x.id === sj.id; }); });
    if (avail.length) out += '<div class="mini-grid">' + avail.map(function (sj) {
      var why = l.age < sj.minAge ? 'From age ' + sj.minAge : (sj.edu && l.edu.level < sj.edu ? 'Needs ' + BAL.EDU_LEVELS[sj.edu] : (sj.fitness && l.stats.fitness < sj.fitness ? 'Needs ' + sj.fitness + ' 💪' : ''));
      return '<div class="mini-card"><span class="mini-emoji">' + sj.emoji + '</span><b>' + sj.name + '</b><small>🪙 ' + fmt(G.shiftPay(l, sj)) + ' per shift</small>' +
        (why ? '<small class="muted">' + why + '</small>' : btn('Start', 'do', a('fn', 'takeSideJob') + a('a1', sj.id), 'small')) + '</div>';
    }).join('') + '</div>';
    return out;
  }

  function businessSection(l) {
    if (l.age < 18) return '';
    if (l.business) {
      var b = G.biz(l), bz = l.business;
      var top = bz.level >= BAL.BIZ_LEVELS.length - 1;
      return '<h3 class="sub">🏪 Your business</h3><div class="info-card biz"><span class="big-emoji">' + b.emoji + '</span><div class="grow"><b class="lg">' + esc(G.bizName(l)) + '</b>' +
        '<div>Expected profit this year: 🪙 ' + fmt(G.bizProfitEstimate(l)) + (bz.years ? ' · last year: 🪙 ' + fmt(bz.lastProfit) : '') + '</div>' +
        '<div class="perf"><span>Effort bar</span>' + bar(bz.effort, 'linear-gradient(90deg,#69DB7C,#20C997)', 'Business effort') + '</div></div></div>' +
        '<div class="btn-row">' + btn('💪 Work on the business <small>⚡1</small>', 'do', a('fn', 'workBusiness'), 'primary') +
        (top ? '' : btn('📈 Grow it <small>🪙' + fmt(G.bizGrowCost(l)) + '</small>', 'do', a('fn', 'growBusiness'))) +
        btn('🤝 Sell <small>🪙' + fmt(G.bizValue(l)) + '</small>', 'confirm', a('fn', 'sellBusiness'), 'ghost') + '</div>';
    }
    return '<h3 class="sub">🏪 Start your own business <small>(be a Business Owner! profit depends on your effort and skills)</small></h3><div class="mini-grid">' + BAL.BUSINESSES.map(function (b) {
      var cost = G.bizStartCost(l, b);
      return '<div class="mini-card"><span class="mini-emoji">' + b.emoji + '</span><b>' + b.name + '</b><small>Start-up: 🪙 ' + fmt(cost) + '</small><small>Profit from about 🪙 ' + fmt(G.price(l, b.profit) * 0.6) + '/yr</small>' +
        btn('Open', 'confirm', a('fn', 'startBusiness') + a('a1', b.id), 'small' + (l.coins >= cost ? ' primary' : ' ghost')) + '</div>';
    }).join('') + '</div>';
  }

  function jobCard(l) {
    var j = G.job(l), base = G.salary(l);
    var warn = l.job.warnings ? '<div class="warn">⚠️ Your boss has given you a warning. Keep your work bar above 15 or you could lose this job!</div>' : '';
    return '<div class="info-card job"><span class="big-emoji">' + j.emoji + '</span><div class="grow"><b class="lg">' + esc(G.jobTitle(l)) + '</b>' +
      '<div>Salary: 🪙 ' + fmt(base) + ' a year' + (G.jobSkillBonus(l) ? ' <span class="tag ok">+' + Math.round(G.jobSkillBonus(l) * 100) + '% skill bonus</span>' : '') + ' · ' + l.job.years + ' year' + (l.job.years === 1 ? '' : 's') + ' here</div>' +
      '<div class="perf"><span>Work bar ' + (l.job.perf >= 80 ? '🎁 bonus on payday!' : '') + '</span>' + bar(l.job.perf, 'linear-gradient(90deg,#FFD43B,#FF9F1C)', 'Work performance') + '</div>' +
      (l.job.deductions ? '<div class="small neg">🙈 ' + fmt(l.job.deductions) + ' coins will come off your pay for mistakes this year.</div>' : '') + warn + '</div></div>' +
      '<div class="btn-row">' + btn('💪 Work hard <small>⚡1</small>', 'do', a('fn', 'workHard'), 'primary') + btn('⬆️ Ask for promotion <small>⚡1</small>', 'do', a('fn', 'askPromotion')) +
      (l.age >= 60 ? btn('🏖️ Retire', 'confirm', a('fn', 'retire')) : '') + btn('👋 Quit job', 'confirm', a('fn', 'quitJob'), 'ghost') + '</div>' +
      '<p class="small muted">💡 Work hard to fill your work bar: above 80 earns a bonus on payday, and promotions need 70+. Mistakes cost a little pay — higher skills mean fewer mistakes.</p>';
  }

  function panelMoney(l) {
    var lines = G.yearlyMoney(l);
    var inc = lines.filter(function (m) { return m.v > 0; }), out = lines.filter(function (m) { return m.v < 0; });
    var net = lines.reduce(function (s, m) { return s + m.v; }, 0);
    var row = function (m) { return '<li><span>' + m.e + ' ' + esc(m.t) + '</span><b class="' + (m.v < 0 ? 'neg' : 'pos') + '">' + (m.v > 0 ? '+' : '') + fmt(m.v) + '</b></li>'; };
    var trouble = l.owed > 0 || (l.age >= 18 && l.coins + net < 0);
    var html = head('🪙', 'Money', 'Coins are pretend — but managing them is a real skill!') +
      '<div class="wallet"><div class="wallet-coins"><small>Your coins</small><b>🪙 ' + fmt(l.coins) + '</b></div>' +
      (l.owed ? '<div class="wallet-owed"><small>Money owed</small><b>💸 ' + fmt(l.owed) + '</b><small>no interest</small></div>' : '') +
      '<div class="wallet-net"><small>On your next birthday</small><b class="' + (net < 0 ? 'neg' : 'pos') + '">' + (net >= 0 ? '+' : '') + fmt(net) + '</b></div></div>';
    if (trouble) {
      html += '<div class="rescue"><h3>🛟 Money Rescue Plan</h3><p>' + (l.owed ? 'You owe <b>' + fmt(l.owed) + ' coins</b>. ' : 'Your bills are bigger than your income this year. ') + 'Don\'t worry — here\'s how to get back on track:</p><ol class="rescue-steps">' +
        '<li>🧹 <b>Do odd jobs</b> below for quick coins.</li>' +
        '<li>💼 <b>Find a job or add a side job</b> in the Work tab.</li>' +
        '<li>🪧 <b>Sell things</b> you don\'t need at the car boot sale below — or sell a car or a business.</li>' +
        '<li>🏠 <b>Move somewhere cheaper</b> — a tiny flat, or back with family (Home tab).</li>' +
        '<li>🛒 <b>Choose the Budget Basket</b> for groceries.</li>' +
        '<li>🤝 <b>Ask family or friends for help</b> (once a year).</li></ol>' +
        '<div class="btn-row">' + (l.owed ? (l.coins ? btn('💸 Pay back ' + fmt(Math.min(l.owed, l.coins)) + ' coins', 'do', a('fn', 'payBack'), 'primary') : '<span class="tag">💸 Earn some coins first, then pay back here</span>') : '') +
        (G.canAskFamily(l) ? btn('🤝 Ask family for help', 'do', a('fn', 'askFamily'), 'pink') : '') +
        btn('💼 Go to Work tab', 'tab', a('id', 'school')) + '</div></div>';
    } else if (l.age >= 18 && G.canAskFamily(l)) {
      html += '<div class="tip">💡 Running low? You can ' + btn('🤝 Ask family for help', 'do', a('fn', 'askFamily'), 'small') + ' once a year.</div>';
    }
    html += '<h3 class="sub">📊 Where your money goes <small>(this is what will happen on your next birthday)</small></h3><div class="money-cols">' +
      '<div class="money-col"><h4>💰 Coming in</h4><ul class="money-list">' + (inc.map(row).join('') || '<li class="muted">Nothing yet</li>') + '</ul></div>' +
      '<div class="money-col"><h4>🧾 Going out</h4><ul class="money-list">' + (out.map(row).join('') || '<li class="muted">No bills — your family looks after you! 💛</li>') + '</ul></div></div>';
    var odd = G.oddJobs(l);
    html += '<h3 class="sub">🧹 Odd jobs <small>(always available · ⚡1 each · paid straight away)</small></h3>';
    html += odd.length ? '<div class="mini-grid">' + odd.map(function (o) {
      var m = G.oddJobMult(l);
      return '<div class="mini-card"><span class="mini-emoji">' + o.emoji + '</span><b>' + o.name + '</b><small>🪙 ' + fmt(o.pay[0] * m) + '–' + fmt(o.pay[1] * m) + '</small>' + btn('Do it', 'do', a('fn', 'oddJob') + a('a1', o.id), 'small primary') + '</div>';
    }).join('') + '</div>' : '<div class="tip">🧸 Odd jobs start at age 8. Until then, help with chores for pocket money!</div>';
    var sellable = l.inventory.filter(function (id, i, arr) { return arr.indexOf(id) === i && byId(BAL.ITEMS, id); });
    if (sellable.length) html += '<h3 class="sub">🪧 Car boot sale <small>(sell things for half price)</small></h3><div class="mini-grid">' + sellable.map(function (id) {
      var it = byId(BAL.ITEMS, id), v = Math.max(1, Math.round(G.itemPrice(l, it) * 0.5));
      return '<div class="mini-card"><span class="mini-emoji">' + it.emoji + '</span><b>' + esc(it.name) + '</b>' + btn('Sell 🪙' + fmt(v), 'do', a('fn', 'sellItem') + a('a1', id), 'small ghost') + '</div>';
    }).join('') + '</div>';
    html += '<div class="tip">🐷 <b>Money tips:</b> save a little every year, compare prices, buy what you need before what you want, and learn skills to earn more.</div>';
    return html;
  }

  function groceriesBlock(l) {
    if (!G.needsGroceries(l)) return '<div class="tip">🛒 ' + (l.age < 18 ? 'Your family does the big food shop — but you can buy snacks and treats!' : 'You live with your family and chip in for food. Move out to choose your own groceries!') + '</div>';
    var picked = l.groceries;
    return '<h3 class="sub">🧺 This year\'s food shop <small>(for ' + (G.householdSize(l) > 1 ? 'your whole household' : 'you') + ' · includes everyday essentials · if you don\'t choose, a Budget Basket is paid on your birthday)</small></h3><div class="mini-grid">' +
      BAL.GROCERY_BASKETS.map(function (bk) {
        var cost = G.groceryCost(l, bk), on = picked === bk.id;
        return '<div class="mini-card' + (on ? ' on' : '') + '"><span class="mini-emoji">' + bk.emoji + '</span><b>' + bk.name + '</b><small>' + bk.desc + '</small><span>' + fxChips(bk.fx) + '</span>' +
          (on ? '<span class="tag ok">✓ Bought</span>' : picked ? '' : btn('🪙 ' + fmt(cost), 'do', a('fn', 'buyGroceries') + a('a1', bk.id), 'small' + (l.coins >= cost ? ' primary' : ' ghost'))) + '</div>';
      }).join('') + '</div><h3 class="sub">🥪 Snacks & treats</h3>';
  }

  function panelHealth(l) {
    var ill = l.sick ? byId(BAL.ILLNESSES, l.sick.id) : null;
    var out = head('🏥', 'Health Centre', l.age < 18 ? 'Free for children! 🎉' : 'Look after yourself.') +
      '<div class="info-card health"><span class="big-emoji heartbeat">' + (ill ? ill.emoji : '❤️') + '</span><div class="grow"><b class="lg">' + (ill ? 'You have ' + ill.name + '!' : (l.stats.health > 70 ? 'You feel great!' : l.stats.health > 40 ? 'You feel OK.' : 'You feel a bit poorly.')) + '</b>' +
      '<div>' + (ill ? 'Visit the ' + (ill.cure === 'gp' ? 'Doctor 🩺' : ill.cure === 'dentist' ? 'Dentist 🦷' : 'Hospital 🏥') + ' to get better.' : 'Health: ' + l.stats.health + ' / 100') + '</div>' + bar(l.stats.health, '#FF5D73', 'Health') + '</div></div>' +
      '<div class="mini-grid">' + BAL.CLINIC.filter(function (c) { return !c.adultOnly || l.age >= 18; }).map(function (c) {
        var cost = G.clinicCost(l, c);
        var cures = ill && (ill.cure === c.id || c.id === 'hospital');
        return '<div class="mini-card' + (cures ? ' glow' : '') + '"><span class="mini-emoji">' + c.emoji + '</span><b>' + c.name + '</b><small>' + c.desc + '</small><span>' + fxChips(c.fx) + '</span>' +
          btn(cost ? '🪙 ' + fmt(cost) : 'Free!', 'do', a('fn', 'clinic') + a('a1', c.id), 'small' + (cures ? ' primary' : '')) + '</div>';
      }).join('') + '</div>' +
      '<h3 class="sub">🌟 Healthy habits</h3><ul class="habits"><li>🍎 Eat fruit and vegetables</li><li>🏃 Move your body every day</li><li>😴 Get plenty of sleep</li><li>🪥 Brush your teeth twice a day</li><li>💧 Drink lots of water</li><li>🤗 Talk about your feelings</li></ul>';
    return out;
  }

  function panelChores(l) {
    var done = l.chores.filter(function (c) { return c.done; }).length;
    return head('✅', 'Daily Jobs', 'Everyday responsibilities. Tick them all off for a bonus!') +
      '<div class="progress-label">' + done + ' of ' + l.chores.length + ' done</div>' + bar(l.chores.length ? done / l.chores.length * 100 : 0, 'linear-gradient(90deg,#69DB7C,#20C997)', 'Daily jobs done') +
      '<div class="chore-list">' + l.chores.map(function (c, i) {
        return '<button class="chore' + (c.done ? ' done' : '') + '" data-act="do" data-fn="chore"' + a('a1', i) + (c.done ? ' disabled' : '') + '><span class="chore-box">' + (c.done ? '✔' : '') + '</span><span class="chore-emoji">' + c.e + '</span><span>' + esc(c.t) + '</span></button>';
      }).join('') + '</div>' +
      '<div class="tip">⭐ Finishing all your daily jobs makes you happier and healthier' + (l.age < 18 ? ', earns 10 coins, and makes your family more likely to say yes to a pet!' : '!') + ' Jobs you forget make you a little grumpy. New jobs arrive every year. Done so far: <b>' + l.totals.helper + '</b> years.</div>';
  }

  function panelTowns(l) {
    var lvl = function (v) { return v >= 1.3 ? 'High' : v >= 1 ? 'Medium' : 'Low'; };
    var stat = function (id) { return statInfo(id).emoji + ' ' + statInfo(id).name; };
    return head('🏘️', 'Towns, Cities, Villages & Islands', 'Every place is different! Grown-ups can move. ' + btn('🗺️ Back to the map', 'tab', a('id', 'explore'), 'small')) +
      '<div class="town-grid big">' + BAL.TOWNS.map(function (t) {
        var here = t.id === l.townId;
        return '<div class="town-card' + (here ? ' on' : '') + '" style="--t1:' + t.colors[0] + ';--t2:' + t.colors[1] + '"><span class="town-emoji">' + t.emoji + '</span><b>' + esc(t.name) + '</b><small>' + esc(t.kind) + '</small><span class="town-desc">' + esc(t.desc) + '</span>' +
          '<div class="town-facts"><span>💼 Pay: ' + lvl(t.pay) + '</span><span>🏷️ Prices: ' + lvl(t.price) + '</span><span>✨ Bonus: ' + stat(t.bonus) + '</span></div>' +
          (here ? '<span class="tag ok">📍 You live here</span>' : (l.age >= 18 ? btn('Move here (🪙 ' + fmt(500 * t.price) + ')', 'confirm', a('fn', 'moveTown') + a('a1', t.id), 'small') : '')) + '</div>';
      }).join('') + '</div>' + (l.age < 18 ? '<div class="tip">🧳 You can move to a new place when you\'re 18.</div>' : '');
  }

  function panelStory(l) {
    var stickers = BAL.ACHIEVEMENTS.map(function (x) {
      var got = l.achievements.indexOf(x.id) >= 0;
      return '<div class="sticker-slot' + (got ? ' got' : '') + '" title="' + esc(x.desc) + '"><span class="sticker">' + (got ? x.emoji : '❔') + '</span><b>' + (got ? esc(x.name) : '???') + '</b><small>' + esc(x.desc) + '</small></div>';
    }).join('');
    var log = l.log.slice().reverse().slice(0, 80).map(function (e) { return '<li><span class="tl-age">' + e.age + '</span><span class="tl-e">' + e.e + '</span><span>' + esc(e.t) + '</span></li>'; }).join('');
    var p = Store.active();
    var hall = p && p.hall.length ? '<h3 class="sub">🏆 Hall of Fame <small>(your past lives)</small></h3><div class="hall">' + p.hall.slice().reverse().map(hallCard).join('') + '</div>' : '';
    return head('📖', 'My Story', 'Your stickers and life memories.') +
      '<h3 class="sub">🌟 Sticker Book <small>' + l.achievements.length + ' / ' + BAL.ACHIEVEMENTS.length + '</small></h3><div class="sticker-grid">' + stickers + '</div>' +
      '<h3 class="sub">🕰️ Timeline</h3><ul class="timeline">' + log + '</ul>' + hall;
  }
  function hallCard(h) {
    return '<div class="hall-card"><div class="hall-av">' + BAL.avatar(h.look, h.age, 90, { bg: '#FFF8E1' }) + '</div><div><b>' + esc(h.name) + '</b> <span class="muted small">lived to ' + h.age + '</span><div class="small">' + esc(h.job) + ' · ' + h.townEmoji + ' ' + esc(h.town) + '</div><div>' + '⭐'.repeat(h.stars) + '</div></div></div>';
  }

  /* ---------- End of life ---------- */
  function endOfLife() {
    var p = Store.active(), l = life();
    if (!p || !l || !l.ended) return;
    if (!l.savedToHall) { p.hall.push(G.summary(l)); l.savedToHall = true; save(); }
    S.screen = 'end';
    // Wait for any open modals to finish first; render() will show the end screen.
    if (!S.modal) render();
  }

  function renderEnd() {
    var p = Store.active(), l = life();
    if (!l) return '';
    if (!l.savedToHall && p) { p.hall.push(G.summary(l)); l.savedToHall = true; save(); }
    var s = G.summary(l);
    var kids = G.children(l);
    var facts = [
      ['🎂', 'Lived to', s.age], ['💼', 'Best job', s.job], ['🎓', 'Education', s.edu], ['📍', 'Home town', s.townEmoji + ' ' + s.town],
      ['👶', 'Children', s.children], ['🍼', 'Grandchildren', s.grandchildren], ['🤝', 'Friends made', s.friends], ['🐾', 'Pets adopted', s.pets],
      ['🪙', 'Coins earned', fmt(s.earned)], ['😊', 'Average happiness', s.avgHappy], ['🌟', 'Stickers', s.stickers + ' / ' + BAL.ACHIEVEMENTS.length], ['💍', 'Married', s.married ? 'Yes 💕' : 'No'], ['🎯', 'Challenges done', fmt(l.totals.challenges || 0)], ['⭐', 'Challenge stars', fmt(l.totals.stars || 0)]
    ].map(function (f) { return '<div class="fact"><span>' + f[0] + '</span><small>' + f[1] + '</small><b>' + esc(f[2]) + '</b></div>'; }).join('');
    var highlights = l.log.filter(function (e) { return !/^Sticker unlocked/.test(e.t); }).filter(function (e) { return ['👶', '🎒', '🎓', '💼', '⬆️', '💍', '💒', '🏠', '🏡', '🐶', '🐱', '🏖️', '🪪', '🗺️', '👵', '🤝'].indexOf(e.e) >= 0 || /Bought|Adopted|Married|Promoted|Graduated|Got a job/.test(e.t); }).slice(0, 14)
      .map(function (e) { return '<li><span class="tl-age">' + e.age + '</span><span class="tl-e">' + e.e + '</span><span>' + esc(e.t) + '</span></li>'; }).join('');
    var stickers = l.achievements.map(function (id) { var x = byId(BAL.ACHIEVEMENTS, id); return x ? '<span class="sticker" title="' + esc(x.name) + '">' + x.emoji + '</span>' : ''; }).join('');
    return topbar() + '<main class="end-screen"><div class="end-card card pop">' +
      '<div class="sparkles" aria-hidden="true">✨🌟✨</div>' +
      '<div class="end-av">' + BAL.avatar(l.look, l.age, 95, { full: true, label: l.name }) + '</div>' +
      '<h1>' + esc(l.name) + '\'s Life Story</h1>' +
      '<p class="lead">What a wonderful life! ' + esc(l.name) + ' lived to <b>' + l.age + '</b> and made so many happy memories. 💛</p>' +
      '<div class="life-stars" aria-label="' + s.stars + ' out of 5 life stars">' + '⭐'.repeat(s.stars) + '<span class="dim">' + '⭐'.repeat(5 - s.stars) + '</span></div>' +
      '<div class="facts">' + facts + '</div>' +
      (stickers ? '<h3 class="sub">🌟 Stickers collected</h3><div class="shelf stickers">' + stickers + '</div>' : '') +
      (highlights ? '<h3 class="sub">📸 Life highlights</h3><ul class="timeline">' + highlights + '</ul>' : '') +
      '<h2 class="section-title">What next?</h2><div class="end-actions">' +
      (kids.length ? '<div class="card next-card"><b>👶 Play as your child</b><p class="small">Carry on the family story! They get half your coins.</p><div class="btn-row">' + kids.map(function (k) { return btn(esc(k.name) + ' (' + k.age + ')', 'asChild', a('id', k.id), 'primary'); }).join('') + '</div></div>' : '') +
      '<div class="card next-card"><b>✨ Start a brand new life</b><p class="small">Make a new character and begin again as a baby. ' + esc(l.name) + ' stays in your characters list.</p>' + btn('🍼 New life', 'newLife', '', 'primary big') + '</div>' +
      '<div class="card next-card"><b>🧑‍🤝‍🧑 My characters</b><p class="small">Play one of your other saved characters.</p>' + btn('🧑‍🤝‍🧑 Characters', 'goChars', '', 'big') + '</div>' +
      '<div class="card next-card"><b>👥 Switch player</b><p class="small">Let someone else have a turn.</p>' + btn('👥 Players', 'goProfiles', '', 'big') + '</div>' +
      '</div></div></main>';
  }

  /* ====================== Explore: the interactive world ====================== */
  var ROLE_ACT = {
    gp: { label: '🩺 Ask for a check-up', fn: 'clinic', arg: 'gp' }, dentist: { label: '🦷 Check my teeth', fn: 'clinic', arg: 'dentist' },
    nurse: { label: '🏥 Get treatment', fn: 'clinic', arg: 'hospital' }, surgeon: { label: '🏥 Get treatment', fn: 'clinic', arg: 'hospital' },
    reception: { label: '💉 Book a flu jab', fn: 'clinic', arg: 'jab' }, shopkeeper: { label: '🛍️ Browse the shop', shop: 'toys' },
    cashier: { label: '🧺 Do the food shop', shop: 'groceries' }, barista: { label: '☕ Order a hot chocolate', obj: 'cocoa' },
    stylist: { label: '✂️ Get a haircut', fn: 'haircut' }, shelter: { label: '🐾 Meet the animals', tab: 'pets' },
    adviser: { label: '🏢 Look for a job', tab: 'school' }, boss: { label: '💪 Work hard', fn: 'workHard', needs: 'job' },
    teacher: { label: '📚 Study hard', fn: 'study' }, librarian: { label: '🛠️ Learn a skill', tab: 'school' },
    guard: { label: '🎫 Buy a ticket', trips: true }, captain: { label: '🎫 Buy a ferry ticket', trips: true },
    waiter: { label: '🍝 Order a meal', fn: 'mealOut' }, lifeguard: { label: '🏊 Go swimming', activity: ['swim'] }
  };

  function placeAct(l, x) {
    // turns an action description into a button
    if (x.needs === 'job' && !l.job) return '';
    if (x.needs === 'business' && !l.business) return '';
    if (x.partner && !G.partner(l)) return '';
    var attrs = '';
    if (x.fn) attrs = a('fn', x.fn) + (x.arg ? a('a1', x.arg) : '');
    if (x.tab) attrs = a('tab', x.tab);
    if (x.shop) attrs = a('shop', x.shop);
    if (x.look) attrs = a('look', x.look === true ? 'clothes' : x.look);
    if (x.trips) attrs = a('trips', 1);
    if (x.activity) {
      var act2 = G.activities(l).find(function (q) { return x.activity.indexOf(q.id) >= 0; });
      if (!act2) return '';
      attrs = a('fn', 'activity') + a('a1', act2.id);
    }
    if (x.obj) attrs = a('obj', x.obj);
    return btn(x.label + (x.fn && ['workHard', 'study', 'activity', 'makeFriend', 'workBusiness', 'mealOut', 'date'].indexOf(x.fn) >= 0 ? ' <small>⚡1</small>' : ''), 'placeAct', attrs, 'small');
  }

  function travelBar(l) {
    var w = G.ensureWorld(l);
    if (l.age < 1) return '<div class="travel-bar"><span class="muted small">👶 Mum or Dad pushes you in the pram!</span></div>';
    return '<div class="travel-bar"><span class="tb-label">Travel by:</span>' + G.travelModes(l).map(function (m) {
      var fare = G.fare(l, m.id);
      return '<button class="pick chip small' + (w.mode === m.id ? ' on' : '') + '" data-act="mode"' + a('id', m.id) + '>' + m.emoji + ' ' + m.name + (fare ? ' <small>🪙' + fare + '</small>' : '') + '</button>';
    }).join('') + '</div>';
  }

  function mapHtml(l, map) {
    var w = G.ensureWorld(l);
    var cells = map.places.map(function (p) {
      var pl = G.place(p.id), here = w.loc === p.id;
      var seen = (w.visited[map.town.id] || []).indexOf(p.id) >= 0;
      return '<button class="tile-place' + (here ? ' here' : '') + (pl.special ? ' special' : '') + '" data-act="go"' + a('id', p.id) + ' style="grid-column:' + (p.x + 1) + ';grid-row:' + (p.y + 1) + ';--pc:' + pl.color + '" aria-label="Go to ' + esc(G.locLabel(l, map, p.id)) + '">' +
        '<span class="tp-emoji">' + G.locEmoji(l, p.id) + '</span><span class="tp-name">' + esc(p.id === 'home' ? (G.isVisiting(l) ? 'Visitor Centre' : 'Home') : (p.name || pl.name)) + '</span>' + (seen ? '' : '<span class="tp-new">NEW</span>') + '</button>';
    }).join('') + map.decor.map(function (d) { return '<span class="tile-decor" style="grid-column:' + (d.x + 1) + ';grid-row:' + (d.y + 1) + '" aria-hidden="true">' + d.decor + '</span>'; }).join('');
    var at = G.mapPlace(map, w.loc) || G.mapPlace(map, 'home');
    var pos = S.travelAnim ? S.travelAnim.from : at;
    var marker = '<div class="map-me' + (S.travelAnim ? ' walking' : '') + '" id="mapme" style="left:' + ((pos.x + 0.5) / map.cols * 100) + '%;top:' + ((pos.y + 0.5) / map.rows * 100) + '%">' +
      '<span class="me-mode">' + (S.travelAnim ? S.travelAnim.emoji : '') + '</span>' + BAL.avatar(l.look, l.age, l.stats.happy, { full: true }) + '</div>';
    return '<div class="map-wrap type-' + map.type + '"><div class="map" style="grid-template-columns:repeat(' + map.cols + ',1fr);grid-template-rows:repeat(' + map.rows + ',1fr)">' + cells + marker + '</div></div>';
  }

  function sceneHtml(l, map) {
    var w = G.ensureWorld(l), id = w.loc, pl = G.place(id), town = G.currentTown(l);
    var ppl = G.placePeople(l, town, id);
    var objs = G.placeObjects(l, id);
    var acts = (pl.acts || []).map(function (x) { return placeAct(l, x); }).join('');
    if (id === 'home' && G.isVisiting(l)) acts = btn('🏡 Go home', 'goHome', '', 'small primary') + btn('🚆 Another day trip', 'placeAct', a('trips', 1), 'small');
    return '<div class="scene card pop" style="--pc:' + pl.color + '"><div class="scene-head"><span class="scene-emoji">' + G.locEmoji(l, id) + '</span><div><h3>' + esc(G.locLabel(l, map, id)) + '</h3><p>' + esc(id === 'home' && G.isVisiting(l) ? 'Maps, leaflets and a friendly welcome to ' + map.town.name + '.' : pl.desc) + '</p></div></div>' +
      (ppl.length ? '<h4>👋 People here <small>(tap to chat)</small></h4><div class="scene-people">' + ppl.map(function (n) {
        return '<button class="npc" data-act="talk"' + a('id', n.id) + '><span class="npc-av">' + BAL.avatar(n.look, n.age, 80, { bg: '#fff' }) + '</span><b>' + esc(n.name) + '</b><small>' + n.emoji + ' ' + esc(n.title) + '</small></button>';
      }).join('') + '</div>' : '') +
      (objs.length ? '<h4>✨ Things to try <small>(tap them!)</small></h4><div class="scene-objs">' + objs.map(function (o) {
        var cost = o.coins && o.coins < 0 ? Math.round(-o.coins * (l.age >= 16 ? G.town(l).price : 1)) : 0;
        return '<button class="obj" data-act="obj"' + a('id', o.id) + '><span class="obj-emoji">' + o.emoji + '</span><span>' + esc(o.name) + '</span>' + (cost ? '<small>🪙' + cost + '</small>' : '') + '</button>';
      }).join('') + '</div>' : '') +
      (acts ? '<h4>🎯 Things to do</h4><div class="btn-row">' + acts + '</div>' : '') + '</div>';
  }

  function panelExplore(l) {
    var map = G.townMap(G.currentTown(l));
    var t = map.town, type = byId(BAL.TOWN_TYPES, t.type);
    var visiting = G.isVisiting(l);
    var w = G.ensureWorld(l);
    var seen = (w.visited[t.id] || []).length;
    return head(t.emoji, esc(t.name), esc(t.kind) + ' · ' + seen + ' of ' + map.places.length + ' places explored' + (visiting ? ' · <b>on a day trip!</b>' : '')) +
      (visiting ? '<div class="tip trip-tip">🎒 You\'re on a day trip to ' + esc(t.name) + '! ' + btn('🏡 Go home to ' + esc(G.town(l).name), 'goHome', '', 'small primary') + '</div>' : '') +
      travelBar(l) + '<div class="explore">' + mapHtml(l, map) + sceneHtml(l, map) + '</div>' +
      '<div class="btn-row">' + btn('🚆 Day trip to another town', 'placeAct', a('trips', 1)) + btn('🏘️ Compare towns' + (l.age >= 18 ? ' & move' : ''), 'tab', a('id', 'towns'), 'ghost') + '</div>' +
      '<p class="small muted">' + type.emoji + ' Tip: tap a place on the map to travel there. Tap people to chat and things to try them out!</p>';
  }

  function goTo(l, placeId) {
    var w = G.ensureWorld(l), map = G.townMap(G.currentTown(l));
    var from = G.mapPlace(map, w.loc) || G.mapPlace(map, 'home');
    var res = G.run(l, 'travel', placeId, w.mode);
    if (!res.ok) { feedback(res); return; }
    var to = G.mapPlace(map, placeId);
    var ms = reduced() ? 0 : Math.min(2200, Math.max(500, res.dist * 380 / res.speed));
    var mode = byId(BAL.TRAVEL, w.mode);
    S.travelAnim = { from: from, to: to, ms: ms, emoji: l.age < 1 ? '👶' : (mode ? mode.emoji : '🚶') };
    save(); render();
    var me = document.getElementById('mapme');
    if (!me || !ms) { S.travelAnim = null; feedback(res); return; }
    me.style.transition = 'left ' + ms + 'ms ease-in-out, top ' + ms + 'ms ease-in-out';
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      me.style.left = ((to.x + 0.5) / map.cols * 100) + '%';
      me.style.top = ((to.y + 0.5) / map.rows * 100) + '%';
    }); });
    BAL.sound('click');
    setTimeout(function () { S.travelAnim = null; feedback(res); }, ms + 60);
  }

  function talkTo(l, npcId) {
    var w = G.ensureWorld(l);
    var res = G.run(l, 'talk', w.loc, npcId);
    if (!res.ok) { feedback(res); return; }
    var n = res.npc;
    save(); render();
    BAL.sound('good');
    goalFeedback(res.goalsDone);
    var buttons = [];
    var ra = ROLE_ACT[n.role];
    if (n.mine && n.personId) { buttons.push({ label: '💬 Have a chat', cls: 'primary', fn: function () { setTimeout(function () { convoModal(l, n.personId); }, 30); } }); buttons.push({ label: '💞 Spend time together <small>⚡1</small>', fn: function () { act('spendTime', n.personId); } }); }
    if (n.befriend && !l.people.some(function (p) { return p.townsId === n.id; }) && l.age >= 3) buttons.push({ label: '🤝 Be friends! <small>⚡1</small>', cls: 'pink', fn: function () { act('befriend', w.loc, n.id); } });
    if (ra && !(ra.needs === 'job' && !l.job) && !(ra.fn === 'study' && !(G.school(l) && G.school(l).kind !== 'nursery'))) {
      buttons.push({ label: ra.label, fn: function () { setTimeout(function () { runPlaceAct(l, ra); }, 30); } });
    }
    buttons.push({ label: 'Bye! 👋', cls: 'ghost' });
    openModal({ cls: 'chat', title: esc(n.name), emoji: '<span class="chat-av">' + BAL.avatar(n.look, n.age, 85, { bg: '#fff' }) + '</span>',
      html: '<p class="muted">' + n.emoji + ' ' + esc(n.title) + '</p><div class="bubble">' + esc(res.line) + '</div>', buttons: buttons });
  }

  function tripsModal(l) {
    var here = G.currentTown(l);
    var towns = BAL.TOWNS.filter(function (t) { return t.id !== here; });
    openModal({ emoji: '🎫', title: 'Where shall we go?', cls: 'trips',
      html: '<p>Take a day trip! You\'ll be back home by your birthday.' + (l.age < 16 ? ' (Children travel cheaper.)' : '') + '</p><div class="trip-grid">' + towns.map(function (t) {
        var tc = G.tripCost(l, t.id), mine = t.id === l.townId;
        return '<button class="trip" data-mbtn-trip="' + t.id + '" style="--t1:' + t.colors[0] + ';--t2:' + t.colors[1] + '"><span class="trip-emoji">' + t.emoji + '</span><b>' + esc(t.name) + (mine ? ' 🏡' : '') + '</b><small>' + esc(t.kind) + '</small><span class="trip-cost">' + tc.emoji + ' 🪙 ' + fmt(tc.cost) + '</span></button>';
      }).join('') + '</div>',
      buttons: [{ label: 'Not today', cls: 'ghost' }] });
  }

  function runPlaceAct(l, x) {
    if (x.tab) { S.tab = x.tab; BAL.sound('click'); render(); var pnl = document.getElementById('panel'); if (pnl) pnl.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }); return; }
    if (x.shop) { S.tab = 'shop'; S.shopCat = x.shop; BAL.sound('click'); render(); return; }
    if (x.look) { startLookEditor(x.look === true ? 'clothes' : x.look); return; }
    if (x.trips) { tripsModal(l); return; }
    if (x.obj) { act('useObject', G.ensureWorld(l).loc, x.obj); return; }
    if (x.activity) { var q = G.activities(l).find(function (z) { return x.activity.indexOf(z.id) >= 0; }); if (q) act('activity', q.id); return; }
    if (x.fn === 'date') { var p = G.partner(l); if (p) act('date', p.id); return; }
    if (x.fn) act(x.fn, x.arg);
  }

  /* ====================== Challenges ====================== */
  function ordinal(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function isFixed(l, c) { return c.fixed && c.fixed.indexOf(l.age) >= 0; }

  function goalStatus(l, g, c) {
    if (g.done) return '';
    var t = c.track;
    if (t.act && g.n > 1) return '<div class="goal-prog">' + bar(g.p / g.n * 100, 'linear-gradient(90deg,#FFD43B,#FF9F1C)', c.name + ' progress') + '<span>' + g.p + ' / ' + g.n + '</span></div>';
    if (t.chores) { var d = l.chores.filter(function (x) { return x.done; }).length; return '<div class="goal-prog">' + bar(d / Math.max(1, l.chores.length) * 100, 'linear-gradient(90deg,#69DB7C,#20C997)', 'Daily jobs') + '<span>' + d + ' / ' + l.chores.length + '</span></div>'; }
    return '';
  }

  function challengesCard(l) {
    var st = G.stageInfo(l.age), left = G.goalsLeft(l);
    var journey = BAL.LIFE_STAGES.map(function (s) {
      var cls = s.id === st.id ? ' on' : (s.max < l.age ? ' past' : '');
      return '<span class="jstep' + cls + '" style="--sc:' + s.color + '" title="' + esc(s.name) + ' (' + s.min + (s.max > 200 ? '+' : '–' + s.max) + ')"><span class="j-emoji">' + (s.max < l.age ? '✅' : s.emoji) + '</span><span class="j-name">' + esc(s.name) + '</span></span>';
    }).join('');
    var cards = l.goals.map(function (g, i) {
      var c = G.challenge(g.id); if (!c) return '';
      var rw = G.goalReward(l, c);
      var go = g.done ? '<span class="goal-done">✓</span>' : (c.track.game ? btn('▶ Play', 'playGame', a('i', i), 'small primary') : btn('Go ➜', 'goGoal', a('i', i), 'small primary'));
      var swap = !g.done && !l.flags.swapped && !isFixed(l, c) ? '<button class="swap" data-act="swapGoal"' + a('i', i) + ' title="Swap for a different challenge (once a year)" aria-label="Swap ' + esc(c.name) + ' for a different challenge">🔄</button>' : '';
      return '<div class="goal' + (g.done ? ' done' : '') + (isFixed(l, c) ? ' milestone' : '') + '"><span class="goal-emoji">' + c.emoji + '</span>' +
        '<div class="grow"><div class="goal-name"><b>' + esc(c.name) + '</b>' + (isFixed(l, c) ? '<span class="tag milestone-tag">⭐ Big moment</span>' : '') + '</div>' +
        '<div class="goal-desc">' + esc(c.desc) + '</div>' + (c.hint && !g.done ? '<div class="goal-hint">💡 ' + esc(c.hint) + '</div>' : '') +
        goalStatus(l, g, c) + '<div class="goal-reward">Reward: 🪙 ' + fmt(rw.coins) + ' · ' + '⭐'.repeat(rw.stars) + '</div></div>' +
        '<div class="goal-btns">' + go + swap + '</div></div>';
    }).join('');
    return '<div class="goals card pop" id="goals" style="--sc:' + st.color + '">' +
      '<div class="goals-head"><span class="stage-badge">' + st.emoji + '</span><div class="grow"><h2>Age ' + l.age + ' Challenges</h2>' +
      '<p>' + (left ? 'Finish <b>' + left + '</b> more to unlock your ' + ordinal(l.age + 1) + ' birthday! 🎂' : '🎉 All done! Your ' + ordinal(l.age + 1) + ' birthday is ready — press <b>Age Up</b>!') + '</p></div>' +
      '<div class="stars-total" title="Challenge stars">⭐ ' + fmt(l.totals.stars || 0) + '</div></div>' +
      '<div class="journey" aria-label="Life stages">' + journey + '</div>' +
      '<div class="goal-list">' + cards + '</div></div>';
  }

  function goalFeedback(done) {
    var l = life();
    if (!done || !done.length || !l) return;
    done.forEach(function (r, k) {
      setTimeout(function () { toast('Challenge complete: ' + r.name + '! +' + fmt(r.coins) + ' coins ' + '⭐'.repeat(r.stars), r.emoji, 'good'); BAL.sound('sticker'); confetti(false); }, 250 + k * 350);
    });
    if (done.some(function (r) { return r.all; }) && !l.ended) {
      openModal({ emoji: '🏆', title: 'All challenges complete!', cls: 'sticker-modal',
        html: '<p class="lead">Amazing work, <b>' + esc(l.name) + '</b>! You finished every challenge for age ' + l.age + ' and earned a bonus ⭐.</p><p>Your <b>' + ordinal(l.age + 1) + ' birthday</b> is ready whenever you are!</p>',
        buttons: [{ label: '🎂 Age up now!', cls: 'pink', fn: function () { setTimeout(ageUp, 50); } }, { label: 'Keep playing', cls: 'ghost' }],
        onOpen: function () { BAL.sound('tada'); confetti(true); } });
    }
  }

  function stageModal(st) {
    var s = BAL.STAGES[st];
    var sample = BAL.CHALLENGES.filter(function (c) { return c.stage === st; }).slice(0, 6).map(function (c) { return '<li><span>' + c.emoji + '</span> ' + esc(c.name) + '</li>'; }).join('');
    openModal({ emoji: '<span class="stage-big" style="--sc:' + s.color + '">' + s.emoji + '</span>', title: 'You\'re a ' + esc(s.name) + ' now!',
      html: '<p class="muted">Ages ' + s.min + (s.max > 200 ? '+' : '–' + s.max) + '</p><p class="lead">' + esc(s.intro) + '</p><p><b>New challenges include:</b></p><ul class="year-lines two-col">' + sample + '</ul>',
      buttons: [{ label: 'Let\'s do this! 💪' }], onOpen: function () { BAL.sound('tada'); confetti(false); } });
  }

  /* ---------- Mini-games ---------- */
  var $game;
  function playGame(i) {
    var l = life(), g = l.goals[i], c = G.challenge(g.id);
    if (!g || g.done || !c.track.game) return;
    S.game = { i: i, c: c, type: c.track.game, kind: c.track.kind, qi: 0, score: 0, results: [], picked: null, busy: false };
    if (S.game.type === 'quiz') S.game.quiz = G.makeQuiz(c.track.kind, l.age);
    else { S.game.find = G.makeFind(c.track.kind); S.game.found = []; }
    BAL.sound('click');
    renderMini();
  }
  function closeMini() { S.game = null; stopSpeaking(); $game.innerHTML = ''; $game.hidden = true; document.body.classList.remove('modal-open'); }
  function renderMini() {
    var m = S.game; if (!m) return closeMini();
    $game.hidden = false; document.body.classList.add('modal-open');
    var body = '';
    if (m.result) {
      var passed = m.result.ok;
      body = '<div class="mg-result">' + (passed ? '<div class="mg-big">🌟</div><h3>' + (m.score === m.total ? 'Perfect!' : 'You did it!') + '</h3>' : '<div class="mg-big">💪</div><h3>So close!</h3>') +
        (m.type === 'quiz' ? '<p class="lead">You got <b>' + m.score + ' out of ' + m.total + '</b> right.</p>' : '') +
        '<p>' + esc(m.result.msg) + '</p></div>' +
        '<div class="modal-btns">' + (passed ? btn('Hooray! 🎉', 'gClose', '', 'primary big') : (m.hw ? '' : btn('🔄 Try again', 'gRetry', '', 'primary big')) + btn(m.hw ? 'OK' : 'Later', 'gClose', '', 'ghost big')) + '</div>';
    } else if (m.type === 'quiz') {
      var q = m.quiz[m.qi];
      var dots = m.quiz.map(function (x, k) { var r = m.results[k]; return '<span class="mg-dot' + (r === true ? ' right' : r === false ? ' wrong' : k === m.qi ? ' now' : '') + '"></span>'; }).join('');
      body = '<div class="mg-dots">' + dots + '</div><p class="mg-count">Question ' + (m.qi + 1) + ' of ' + m.quiz.length + (m.kind === 'exam' ? ' · get 3 right to pass' : ' · get ' + G.quizPass(m.kind, m.quiz.length) + ' right to win') + '</p>' +
        '<div class="mg-q">' + esc(q.q) + '</div>' + (q.art ? '<div class="mg-art">' + q.art + '</div>' : '') +
        '<div class="mg-opts">' + q.options.map(function (o) {
          var cls = '';
          if (m.picked !== null) { if (o === q.answer) cls = ' right'; else if (o === m.picked) cls = ' wrong'; }
          return '<button class="mg-opt' + cls + '" data-act="gAnswer"' + a('v', o) + (m.picked !== null ? ' disabled' : '') + '>' + esc(o) + '</button>';
        }).join('') + '</div>' +
        (m.picked !== null ? '<p class="mg-feedback">' + (m.picked === q.answer ? '✅ Correct! Brilliant!' : '❌ Not quite — the answer is <b>' + esc(q.answer) + '</b>.') + '</p>' : '') +
        '<div class="modal-btns">' + btn('Close', 'gClose', '', 'ghost') + '</div>';
    } else {
      var f = m.find;
      body = '<p class="mg-q small-q">' + esc(f.title) + '</p><div class="mg-want">' + f.targets.map(function (t) { return '<span class="' + (m.found.indexOf(t) >= 0 ? 'got' : '') + '">' + t + '</span>'; }).join('') + '</div>' +
        '<div class="mg-grid">' + f.cells.map(function (e, k) {
          var got = m.found.indexOf(e) >= 0 && f.targets.indexOf(e) >= 0;
          return '<button class="mg-cell' + (got ? ' found' : '') + (m.wrong === k ? ' nope' : '') + '" data-act="gCell"' + a('i', k) + (got ? ' disabled' : '') + ' aria-label="' + e + '">' + e + '</button>';
        }).join('') + '</div><p class="mg-count">Found ' + m.found.length + ' of ' + f.targets.length + '</p>' +
        '<div class="modal-btns">' + btn('Close', 'gClose', '', 'ghost') + '</div>';
    }
    $game.innerHTML = '<div class="modal-back"></div><div class="modal mg" role="dialog" aria-modal="true" aria-labelledby="mgtitle">' +
      '<button class="speak" data-act="gSpeak" title="Read aloud" aria-label="Read aloud">🔊</button>' +
      '<div class="mg-head"><span class="mg-emoji">' + m.c.emoji + '</span><h2 id="mgtitle">' + esc(m.c.name) + '</h2></div>' + body + '</div>';
  }
  function finishMini() {
    var m = S.game, l = life();
    m.total = m.type === 'quiz' ? m.quiz.length : m.find.targets.length;
    var res = m.hw ? G.run(l, 'helpHomework', m.hw, m.score, m.total) : G.run(l, 'completeGame', m.i, m.score, m.total);
    m.result = res;
    save();
    renderMini();
    if (res.ok) { BAL.sound('tada'); confetti(true); toast(res.msg, res.emoji, 'good', res.diffs, res.coinsDelta); render(); goalFeedback(res.goalsDone); showAchievements(l); }
    else BAL.sound('bad');
  }
  function miniClick(actName, el) {
    var m = S.game; if (!m) return;
    if (actName === 'gClose') { closeMini(); render(); return; }
    if (actName === 'gRetry') { var i = m.i, hw = m.hw; closeMini(); if (hw) playHomework(life(), hw); else playGame(i); return; }
    if (actName === 'gSpeak') { var q = m.type === 'quiz' && !m.result ? m.quiz[m.qi] : null; speak(q ? q.q + '. ' + q.options.join(', or ') : (m.find && !m.result ? m.find.title : $game.innerText)); return; }
    if (actName === 'gAnswer' && m.picked === null) {
      var q2 = m.quiz[m.qi], v = el.getAttribute('data-v');
      m.picked = v;
      var right = v === q2.answer;
      m.results[m.qi] = right;
      if (right) m.score += 1;
      BAL.sound(right ? 'good' : 'bad');
      renderMini();
      setTimeout(function () {
        if (!S.game || S.game !== m) return;
        m.picked = null; m.qi += 1;
        if (m.qi >= m.quiz.length) finishMini(); else renderMini();
      }, right ? 900 : 1700);
      return;
    }
    if (actName === 'gCell') {
      var k = +el.getAttribute('data-i'), e = m.find.cells[k];
      if (m.find.targets.indexOf(e) >= 0) {
        if (m.found.indexOf(e) < 0) { m.found.push(e); m.score += 1; BAL.sound('good'); }
        m.wrong = null;
        renderMini();
        if (m.found.length === m.find.targets.length) setTimeout(finishMini, 500);
      } else { m.wrong = k; BAL.sound('bad'); renderMini(); setTimeout(function () { if (S.game === m) { m.wrong = null; renderMini(); } }, 500); }
    }
  }

  /* ====================== Age up flow ====================== */
  function ageUp() {
    var l = life(); if (!l) return;
    var rep = G.ageUp(l);
    if (rep && rep.blocked) {
      BAL.sound('bad');
      toast('Finish your ' + rep.left + ' challenge' + (rep.left === 1 ? '' : 's') + ' first to unlock your birthday! 🎯', '🔒', 'bad');
      var gc = document.getElementById('goals');
      if (gc) { gc.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }); gc.classList.remove('nudge'); void gc.offsetWidth; gc.classList.add('nudge'); }
      return;
    }
    save();
    if (!rep) return;
    S.tab = S.tab || 'activities';
    render();
    var plus = rep.money.filter(function (m) { return m.v > 0; }), minus = rep.money.filter(function (m) { return m.v < 0; });
    var moneyHtml = rep.money.length ? '<details class="money"' + (l.age === 18 || l.age === 19 ? ' open' : '') + '><summary>🪙 This year\'s coins: <b class="' + (rep.net < 0 ? 'neg' : 'pos') + '">' + (rep.net >= 0 ? '+' : '') + fmt(rep.net) + '</b></summary><ul>' +
      plus.concat(minus).map(function (m) { return '<li><span>' + m.e + ' ' + esc(m.t) + '</span><b class="' + (m.v < 0 ? 'neg' : 'pos') + '">' + (m.v > 0 ? '+' : '') + fmt(m.v) + '</b></li>'; }).join('') + '</ul></details>' : '';
    var lines = rep.lines.concat(rep.notes).map(function (x) { return '<li><span>' + x.e + '</span> ' + esc(x.t) + '</li>'; }).join('');
    var candles = Math.min(l.age, 10);
    var cake = '<div class="cake-art" aria-hidden="true"><div class="candles">' + new Array(candles + 1).join('<i></i>') + '</div><div class="cake-top"></div><div class="cake-body"><span>' + l.age + '</span></div></div>';
    openModal({ cls: 'birthday', title: rep.ended ? 'Happy ' + l.age + 'th Birthday!' : '🎉 Happy Birthday, ' + esc(l.name) + '! 🎉',
      html: cake + '<p class="lead">You are now <b>' + l.age + '</b> year' + (l.age === 1 ? '' : 's') + ' old!</p>' +
        '<p class="gift">🎁 You got ' + esc(rep.gift.item) + (rep.gift.coins ? ' and <b>' + rep.gift.coins + ' coins</b> from your family!' : '!') + '</p>' +
        (rep.party ? '<p class="gift">🥳 Your party had ' + esc(rep.party.join(', ')) + '!</p>' : '') +
        (lines ? '<ul class="year-lines">' + lines + '</ul>' : '') + moneyHtml,
      buttons: rep.moneyTrouble && !rep.ended ? [{ label: 'OK' }, { label: '🛟 See my money rescue plan', cls: 'pink', fn: function () { S.queue.length = 0; S.tab = 'money'; } }] : rep.newGroup && !rep.ended ? [{ label: 'Yay! 🎈' }, { label: '🪞 Style my new look', cls: 'pink', fn: function () { S.queue.length = 0; startLookEditor('clothes'); } }] : [{ label: 'Yay! 🎈' }],
      onOpen: function () { BAL.sound('birthday'); confetti(true); floaty('🎈'); } });
    rep.celebrations.forEach(function (c) {
      openModal({ emoji: c.e, title: esc(c.t), html: '<p class="lead">' + esc(c.d) + '</p>', buttons: [{ label: 'Hooray! 🎉' }], onOpen: function () { BAL.sound('tada'); confetti(false); } });
    });
    if (rep.newStage && !rep.ended) stageModal(rep.newStage);
    if (rep.choice === 'future') futureModal();
    if (rep.event) eventModal(rep.event);
    showAchievements(l);
    if (rep.ended) {
      openModal({ emoji: '🌟', title: 'A Wonderful Life', cls: 'ending',
        html: '<p class="lead">After ' + l.age + ' amazing years, ' + esc(l.name) + '\'s life story is complete.</p><p>' + G.pronoun(l) + ' made so many memories, and the people who love ' + G.pronoun(l, 'obj') + ' will remember ' + G.pronoun(l, 'obj') + ' forever. 💛</p>',
        buttons: [{ label: 'See my life story 📖', fn: function () { endOfLife(); } }], onOpen: function () { BAL.sound('tada'); } });
      endOfLife();
    }
  }

  function futureModal() {
    openModal({ emoji: '🧭', title: 'What will you do next?', html: '<p>You\'re 18 and have finished school. Choose your path! (You can change your mind later.)</p>',
      buttons: [
        { label: '🎓 Go to University <small>(3 years)</small>', cls: 'primary', fn: function () { feedback(G.run(life(), 'chooseFuture', 'uni')); } },
        { label: '🏫 Go to College <small>(2 years)</small>', cls: 'primary', fn: function () { feedback(G.run(life(), 'chooseFuture', 'college')); } },
        { label: '💼 Start working', fn: function () { S.tab = 'school'; feedback(G.run(life(), 'chooseFuture', 'work')); } },
        { label: '🎒 Take a gap year', fn: function () { feedback(G.run(life(), 'chooseFuture', 'gap')); } }
      ] });
  }

  function eventModal(id) {
    var e = byId(BAL.EVENTS, id);
    if (!e) return;
    openModal({ emoji: e.emoji, title: esc(e.title), html: '<p class="lead">' + esc(e.text) + '</p>', cls: 'event',
      buttons: e.choices.map(function (c, i) { return { label: esc(c.t), cls: 'primary', fn: function () { feedback(G.run(life(), 'resolveEvent', id, i)); } }; }) });
  }

  /* ====================== Click handling ====================== */
  function nameModal(cfg) {
    var genderPick = cfg.gender ? '<div class="field"><span>Boy or girl?</span><div class="pick-row center">' +
      '<button class="pick chip on" data-pick="g" data-val="girl">👧 Girl</button><button class="pick chip" data-pick="g" data-val="boy">👦 Boy</button></div></div>' : '';
    openModal({ emoji: cfg.emoji, title: cfg.title, html: (cfg.text ? '<p>' + cfg.text + '</p>' : '') + genderPick +
      '<label class="field"><span>' + cfg.label + '</span><div class="name-row"><input name="n" maxlength="20" value="' + esc(cfg.value || '') + '" autocomplete="off"><button class="btn" type="button" data-randname="' + (cfg.pet ? 'pet' : 'person') + '" aria-label="Random name">🎲</button></div></label>',
      buttons: [{ label: cfg.ok, fn: function (m) { var v = m.querySelector('input[name="n"]').value.trim(); cfg.fn(v, pickedVal('g')); } }, { label: 'Cancel', cls: 'ghost' }] });
  }

  var CONFIRMS = {
    quitJob: ['👋', 'Quit your job?', 'You won\'t get paid until you find a new job.'],
    retire: ['🏖️', 'Retire from work?', 'You\'ll get a pension every year and lots of free time!'],
    sellHome: ['🪧', 'Sell your home?', 'You\'ll get the coins back (minus anything still owed) and move into a tiny flat.'],
    separate: ['🍂', 'Go separate ways?', 'Sometimes people are happier apart. You\'ll stay friends.'],
    rehomePet: ['🌾', 'Find your pet a new home?', 'They will go to live on a lovely farm with a kind family.'],
    buyHome: ['🔑', 'Buy this home?', ''],
    startBusiness: ['🏪', 'Open your own business?', ''],
    sellBusiness: ['🤝', 'Sell your business?', 'You\'ll get coins for it, and have more time and energy for other things.'],
    moveTown: ['🧳', 'Move to a new town?', '']
  };

  function onClick(e) {
    var el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    var actName = el.getAttribute('data-act');
    var d = function (k) { return el.getAttribute('data-' + k); };
    var l = life();
    switch (actName) {
      case 'goProfiles': S.screen = 'profiles'; BAL.sound('click'); render(); break;
      case 'sound': Store.data.sound = !Store.data.sound; save(); BAL.sound('click'); render(); break;
      case 'help': helpModal(); break;
      case 'newProfile': newProfileModal(); break;
      case 'pickProfile': {
        Store.data.activeId = d('id'); save(); BAL.sound('click');
        var p = Store.active();
        if (!p.chars.length) startCreator();
        else { S.screen = 'chars'; render(); window.scrollTo(0, 0); }
        break;
      }
      case 'delProfile': {
        var pp = Store.profile(d('id'));
        openModal({ emoji: '🗑️', title: 'Delete ' + esc(pp.name) + '?', html: '<p>This will delete this player and all ' + pp.chars.length + ' of their characters. This can\'t be undone!</p>',
          buttons: [{ label: 'Yes, delete', cls: 'danger', fn: function () { Store.removeProfile(pp.id); } }, { label: 'No, keep it', cls: 'primary' }] });
        break;
      }
      case 'goChars': S.screen = Store.active() ? 'chars' : 'profiles'; S.ed = null; BAL.sound('click'); render(); window.scrollTo(0, 0); break;
      case 'pickChar': {
        var pc = Store.active();
        pc.activeCharId = d('id'); save(); BAL.sound('click');
        var cl = life();
        S.tab = 'activities';
        S.screen = cl && cl.ended ? 'end' : 'game'; render(); window.scrollTo(0, 0);
        break;
      }
      case 'delChar': {
        var pd = Store.active(), dc = pd.chars.find(function (c) { return c.id === d('id'); });
        openModal({ emoji: '🗑️', title: 'Delete ' + esc(dc.name) + '?', html: '<div class="welcome-av">' + BAL.avatar(dc.look, dc.age, 40, { full: true }) + '</div><p>' + esc(dc.name) + '\'s whole saved life will be deleted. This can\'t be undone!</p>',
          buttons: [{ label: 'Yes, delete', cls: 'danger', fn: function () { Store.removeChar(dc.id); } }, { label: 'No, keep them', cls: 'primary' }] });
        break;
      }
      case 'newChar': {
        var pn2 = Store.active();
        if (pn2.chars.length >= MAX_CHARS) { toast('You have lots of characters! Delete one to make room.', '🙈', 'bad'); break; }
        startCreator();
        break;
      }
      case 'changeLook': startLookEditor(d('step')); break;
      case 'edSet': edSet(d('k'), d('v'), d('locked')); break;
      case 'edStep': S.ed.step = d('v'); BAL.sound('click'); render(); window.scrollTo({ top: window.innerWidth < 900 ? document.querySelector('.creator-options').offsetTop - 70 : 0 }); break;
      case 'edGroup': S.ed.group = d('v'); BAL.sound('click'); render(); break;
      case 'edName': S.ed.name = G.randomName(S.ed.gender); BAL.sound('click'); render(); break;
      case 'edRandom': S.ed.look.outfits[S.ed.group] = G.randomOutfit(S.ed.group); BAL.sound('good'); render(); break;
      case 'edReset': S.ed.look.outfits[S.ed.group] = G.defaultOutfit(S.ed.group, S.ed.look.fav); BAL.sound('click'); render(); break;
      case 'edRandomAll': {
        var rg = G.pick(BAL.IDENTITIES);
        Object.assign(S.ed, { name: G.randomName(rg.id), gender: rg.id, pronouns: rg.pronouns, look: G.normalizeLook(G.randomLook()), townId: G.pick(BAL.TOWNS).id, familyType: G.pick(BAL.FAMILY_TYPES).id });
        BAL.sound('good'); render(); break;
      }
      case 'edSave': edSave(); break;
      case 'townType': S.townType = d('v'); BAL.sound('click'); render(); break;
      case 'edCancel': S.ed = null; S.screen = 'game'; BAL.sound('click'); render(); break;
      case 'tab': S.tab = d('id'); BAL.sound('click'); render(); var pn = document.getElementById('panel'); if (pn && window.innerWidth < 900) pn.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }); break;
      case 'shopCat': S.shopCat = d('id'); BAL.sound('click'); render(); break;
      case 'ageUp': ageUp(); break;
      case 'go': if (!S.travelAnim) goTo(l, d('id')); break;
      case 'mode': G.ensureWorld(l).mode = d('id'); save(); BAL.sound('click'); render(); break;
      case 'talk': talkTo(l, d('id')); break;
      case 'convo': convoModal(l, d('id')); break;
      case 'kidFeed': kidFeed(l, d('id')); break;
      case 'kidBday': kidBday(l, d('id')); break;
      case 'kidPlay': kidPlay(l, d('id')); break;
      case 'kidClothes': kidClothes(l, d('id')); break;
      case 'kidHw': if (l.energy < 1) { feedback({ ok: false, msg: 'You are out of energy ⚡! Have a rest first.', emoji: '😴' }); } else playHomework(l, d('id')); break;
      case 'obj': act('useObject', G.ensureWorld(l).loc, d('id')); break;
      case 'goHome': act('goHome'); break;
      case 'placeAct': {
        var px = {};
        if (d('fn')) { px.fn = d('fn'); px.arg = d('a1'); if (px.fn === 'activity') { act('activity', px.arg); break; } }
        if (d('tab')) px.tab = d('tab');
        if (d('shop')) px.shop = d('shop');
        if (d('look')) px.look = d('look');
        if (d('trips')) px.trips = true;
        if (d('obj')) px.obj = d('obj');
        runPlaceAct(l, px);
        break;
      }
      case 'playGame': playGame(+d('i')); break;
      case 'swapGoal': act('swapGoal', +d('i')); break;
      case 'goGoal': {
        var gl = l.goals[+d('i')], gc2 = G.challenge(gl.id);
        S.tab = gc2.tab || 'activities'; BAL.sound('click'); render();
        var pnl = document.getElementById('panel'); if (pnl) pnl.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
        toast(gc2.desc + (gc2.hint ? ' ' + gc2.hint : ''), gc2.emoji, 'good');
        break;
      }
      case 'gClose': case 'gRetry': case 'gSpeak': case 'gAnswer': case 'gCell': miniClick(actName, el); break;
      case 'do': {
        var a1 = d('a1'), fn = d('fn');
        if (fn === 'chore') a1 = +a1;
        act(fn, a1, d('a2'));
        break;
      }
      case 'confirm': {
        var cf = CONFIRMS[d('fn')] || ['❓', 'Are you sure?', ''];
        var text = cf[2], fn2 = d('fn'), arg = d('a1');
        if (fn2 === 'buyHome') { var hm = byId(BAL.HOMES, arg), pr = G.price(l, hm.price); text = hm.emoji + ' <b>' + hm.name + '</b> costs 🪙 ' + fmt(pr) + '. You pay 🪙 ' + fmt(pr * BAL.HOME_DEPOSIT) + ' now, then 🪙 ' + fmt(Math.ceil(pr * (1 - BAL.HOME_DEPOSIT) / BAL.HOME_LOAN_YEARS)) + ' a year for 20 years.'; }
        if (fn2 === 'startBusiness') { var bz = byId(BAL.BUSINESSES, arg); text = bz.emoji + ' <b>' + bz.name + '</b> costs 🪙 ' + fmt(G.bizStartCost(l, bz)) + ' to start. You\'ll begin with a market stall, earn profit every birthday, and can grow it into a chain of shops!'; }
        if (fn2 === 'moveTown') { var tw = byId(BAL.TOWNS, arg); text = 'Move to ' + tw.emoji + ' <b>' + esc(tw.name) + '</b>? It costs 🪙 ' + fmt(500 * tw.price) + ' to move.'; }
        openModal({ emoji: cf[0], title: cf[1], html: '<p>' + text + '</p>', buttons: [{ label: 'Yes!', fn: function () { act(fn2, arg); } }, { label: 'No', cls: 'ghost' }] });
        break;
      }
      case 'wedding': {
        var pid = d('id');
        openModal({ emoji: '💒', title: 'Plan your wedding', html: '<p>What kind of wedding would you like?</p>',
          buttons: [
            { label: '🌸 Small & cosy <small>🪙 ' + fmt(G.weddingCost(l, 'small')) + '</small>', fn: function () { act('wedding', pid, 'small'); } },
            { label: '🏰 Big & fancy <small>🪙 ' + fmt(G.weddingCost(l, 'big')) + '</small>', fn: function () { act('wedding', pid, 'big'); } },
            { label: 'Not yet', cls: 'ghost' }] });
        break;
      }
      case 'findLove': {
        openModal({ emoji: '💘', title: 'Find a sweetheart', html: '<p>Who would you like to meet?</p>',
          buttons: [{ label: '👩 A woman', fn: function () { act('findLove', 'girl'); } }, { label: '👨 A man', fn: function () { act('findLove', 'boy'); } }, { label: '🌈 Anyone!', fn: function () { act('findLove', 'any'); } }, { label: 'Cancel', cls: 'ghost' }] });
        break;
      }
      case 'baby': {
        var kind = d('kind');
        var fee = G.price(l, 1000);
        nameModal({ emoji: kind === 'haveBaby' ? '👶' : '🏡', title: kind === 'haveBaby' ? 'A new baby!' : 'Adopt a child', gender: true,
          text: kind === 'adoptChild' ? 'Give a child a loving forever home. Adoption costs 🪙 ' + fmt(fee) + '.' : 'Your family is growing! What will you call your baby?',
          label: 'Name', value: G.randomName('girl'), ok: kind === 'haveBaby' ? 'Welcome, baby! 💕' : 'Adopt 💛', fn: function (name, gen) { act(kind, name, gen); } });
        break;
      }
      case 'adoptPet': {
        var k = byId(BAL.PETS, d('kind'));
        if (l.age < 18 && (l.age < 5 || l.flags.askedPet)) { act('adoptPet', k.id); break; }
        nameModal({ emoji: k.emoji, title: (l.age < 18 ? 'Ask for a ' : 'Adopt a ') + k.name, label: 'What will you name your ' + k.name.toLowerCase() + '?', value: G.pick(BAL.NAMES.pets), pet: true,
          text: l.age < 18 ? 'Your family might say yes… fingers crossed! 🤞' : 'Adoption fee: 🪙 ' + fmt(G.price(l, k.fee)),
          ok: l.age < 18 ? 'Ask nicely 🙏' : 'Adopt 💕', fn: function (name) { act('adoptPet', k.id, name); } });
        break;
      }
      case 'asChild': {
        var nl = G.continueAsChild(l, d('id'));
        if (nl) { Store.replaceChar(l.id, nl); S.screen = 'game'; S.tab = 'activities'; render(); window.scrollTo(0, 0); confetti(true); BAL.sound('tada'); toast('You are now playing as ' + nl.name + '!', '🌟', 'good'); }
        break;
      }
      case 'newLife': {
        var old = l;
        startCreator(old ? { townId: old.townId } : null);
        break;
      }
    }
  }

  function helpModal() {
    openModal({ emoji: '❓', title: 'How to play', cls: 'help', html:
      '<ul class="year-lines">' +
      '<li><span>👶</span> You start as a baby and live a whole life, year by year.</li>' +
      '<li><span>⚡</span> Each year you have some <b>energy</b>. Use it on activities, studying, work, friends and pets.</li>' +
      '<li><span>🎯</span> Every year you get <b>3 challenges</b>. Finish them all to unlock your next birthday! Tap <b>Go</b> or <b>Play</b> on a challenge to start it, and 🔄 to swap one you don\'t like (once a year).</li>' +
      '<li><span>🗺️</span> Grow through 8 life stages: Baby, Toddler, Child, Teenager, Young Adult, Adult, Older Adult and Grandparent.</li>' +
      '<li><span>🎂</span> Press <b>Age Up</b> to have a birthday. Coins come in and bills go out.</li>' +
      '<li><span>😊</span> Keep your <b>Happiness, Health, Smarts and Fitness</b> high!</li>' +
      '<li><span>✅</span> Finish your <b>Daily Jobs</b> each year for a bonus.</li>' +
      '<li><span>🏫</span> Go to school, then college or university, then get a job you love.</li>' +
      '<li><span>🪙</span> Earn coins from jobs (you can have up to 3!), side jobs, odd jobs or your own business. Spend them on food, homes, cars, furniture, pets, toys and parties. Coins are pretend — no real money!</li>' +
      '<li><span>🛟</span> Run out of coins? Don\'t panic — the 🪙 Money tab has a rescue plan, and there are always odd jobs to do.</li>' +
      '<li><span>🐾</span> Adopt pets and make friends. Grown-ups can date, become a couple, move in, get married, buy a home together and raise children — feed them, help with homework, buy clothes, celebrate their birthdays and take them to the doctor.</li>' +
      '<li><span>💬</span> Tap <b>Talk</b> on anyone in your family to have a chat and choose what to say.</li>' +
      '<li><span>🗺️</span> Open <b>Explore</b> to travel around your town on the map, chat to people, try things out and take day trips to other towns and islands.</li>' +
      '<li><span>🪞</span> Tap <b>Change Your Look</b> to change clothes, hair and accessories any time — it\'s free!</li>' +
      '<li><span>🧑‍🤝‍🧑</span> Each player can save lots of <b>characters</b>, and every character has their own life.</li>' +
      '<li><span>📖</span> Collect stickers in your Sticker Book.</li>' +
      '<li><span>🔊</span> Tap the speaker on any pop-up to hear it read aloud.</li>' +
      '</ul>', buttons: [{ label: 'Got it! 👍' }] });
  }

  function onInput(e) {
    if (e.target.id === 'cname' && S.ed) {
      S.ed.name = e.target.value;
      var pv = document.getElementById('pvname'); if (pv) pv.textContent = e.target.value || '…';
    }
  }
  function onKey(e) {
    if (!S.modal) return;
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') { var b = $modal.querySelector('[data-mbtn="0"]'); if (b) b.click(); }
    if (e.key === 'Escape') {
      var btns = S.modal.buttons || [{ label: 'OK' }];
      var cancel = btns.length > 1 && /Cancel|No|Not yet/.test(btns[btns.length - 1].label);
      if (cancel || btns.length <= 1 && !btns[0].fn) { stopSpeaking(); nextModal(); render(); }
    }
  }

  UI.init = function () {
    $app = document.getElementById('app');
    $modal = document.getElementById('modal-root');
    $toasts = document.getElementById('toasts');
    $fx = document.getElementById('fx');
    $game = document.getElementById('game-root');
    Store.load();
    var p = Store.active();
    var cur = life();
    if (cur) S.screen = cur.ended ? 'end' : 'game';
    else if (p) S.screen = 'chars';
    document.addEventListener('click', function (e) { if ($modal.contains(e.target)) modalClick(e); else onClick(e); });
    document.addEventListener('input', onInput);
    document.addEventListener('keydown', onKey);
    render();
  };
  UI._state = S; // for debugging/tests
})(globalThis.BAL = globalThis.BAL || {});
