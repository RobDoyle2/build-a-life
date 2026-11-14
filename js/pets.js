/* Build a Life — pets & the animal shelter.
   A shelter full of individual animals (dogs, cats, hamsters, rabbits, guinea pigs, mice, chinchillas
   and more), adoption with coins (or by asking your family), naming and choosing a pet's look,
   feeding, washing, playing, toys, beds, the vet, and happiness & health levels.
   A pet's happiness is stored in `love` (as it always has been) and it also has health, fullness
   and cleanliness. Pets are never harmed by a missed meal — they just get a bit grumpy. */
(function (BAL) {
  'use strict';
  var G = BAL.Game, A = G.actions;
  var byId = G.byId, fmt = G.fmt, clamp = G.clamp, pick = G.pick, randInt = G.randInt;
  function ok(msg, emoji, extra) { return Object.assign({ ok: true, msg: msg, emoji: emoji || '🐾' }, extra || {}); }
  function no(msg, emoji) { return { ok: false, msg: msg, emoji: emoji || '🙈' }; }

  /* ===================== Species ===================== */
  BAL.PETS.push(
    { id: 'mouse', name: 'Mouse', emoji: '🐭', fee: 30, cost: 40, life: 3 },
    { id: 'chinchilla', name: 'Chinchilla', emoji: '🐿️', fee: 120, cost: 90, life: 15 }
  );
  var INFO = {
    dog: { draw: true, group: 'dog', sound: 'Woof woof!', breeds: ['Labrador', 'Spaniel', 'Sausage Dog', 'Poodle', 'Terrier', 'Collie', 'Mixed breed'], colors: ['#C8915A', '#F1D3A1', '#3B2F2F', '#FFFFFF', '#7B4B2A', '#BDBDBD'], food: ['Doggy dinner', '🍖'], wash: 'You gave {name} a bubbly bath. Then they shook water EVERYWHERE!', baby: 'Puppy' },
    cat: { draw: true, group: 'cat', sound: 'Purrrr… meow!', breeds: ['Tabby', 'Ginger', 'Black cat', 'Tortoiseshell', 'Fluffy Persian', 'Mixed breed'], colors: ['#F4A259', '#2D2A32', '#FFFFFF', '#9E9E9E', '#F1E0C5', '#8D6E63'], food: ['Fishy feast', '🐟'], wash: 'You brushed {name}\'s fur until it was super soft. (Cats wash themselves — no bath needed!)', baby: 'Kitten' },
    hamster: { draw: true, group: 'small', sound: 'Squeak squeak!', breeds: ['Syrian', 'Dwarf', 'Teddy bear'], colors: ['#E9B872', '#FFFFFF', '#BDBDBD', '#F1E0C5', '#8D6E63'], food: ['Seeds & veggies', '🥕'], wash: 'You gave {name} a little sand bath. They rolled around happily!', baby: 'Baby' },
    rabbit: { draw: true, group: 'small', sound: '*happy binky jump*', breeds: ['Lop-eared', 'Lionhead', 'Dutch', 'Rex'], colors: ['#FFFFFF', '#A1887F', '#9E9E9E', '#2D2A32', '#F1E0C5', '#F4A259'], food: ['Fresh greens', '🥬'], wash: 'You gently brushed {name}\'s fluffy fur.', baby: 'Baby bunny' },
    guinea: { draw: true, group: 'small', sound: 'Wheek wheek!', breeds: ['Smooth-haired', 'Fluffy Abyssinian', 'Long-haired'], colors: ['#F4A259', '#FFFFFF', '#2D2A32', '#8D6E63', '#F1E0C5'], food: ['Crunchy veggies', '🥒'], wash: 'You brushed {name} and cleaned their hutch. Sparkling!', baby: 'Baby' },
    mouse: { draw: true, group: 'small', sound: 'Eek! (that means hello)', breeds: ['Fancy mouse', 'Satin mouse'], colors: ['#FFFFFF', '#BDBDBD', '#8D6E63', '#F1E0C5'], food: ['Seeds & oats', '🌾'], wash: 'You cleaned {name}\'s cage with fresh bedding.', baby: 'Baby' },
    chinchilla: { draw: true, group: 'small', sound: '*soft chirp*', breeds: ['Grey', 'Beige', 'White'], colors: ['#9E9E9E', '#D7C4A3', '#F5F5F5', '#5F5F5F'], food: ['Hay & pellets', '🌾'], wash: 'You gave {name} a dust bath — chinchillas roll in special dust to stay clean!', baby: 'Baby' },
    fish: { group: 'fish', sound: '*blub blub*', breeds: ['Goldfish', 'Shubunkin', 'Comet'], food: ['Fish flakes', '🍤'], wash: 'You cleaned {name}\'s tank. The water is crystal clear!', baby: 'Little' },
    parrot: { group: 'bird', sound: 'Hello! Pretty bird!', breeds: ['Budgie', 'Cockatiel', 'Parrot'], food: ['Seeds & fruit', '🍓'], wash: '{name} splashed about in a little bird bath!', baby: 'Chick' },
    lizard: { group: 'reptile', sound: '*blinks slowly*', breeds: ['Leopard gecko', 'Bearded dragon'], food: ['Crunchy bugs', '🦗'], wash: 'You gave {name} a warm misty spray. Ahh!', baby: 'Baby' },
    tortoise: { group: 'reptile', sound: '*munch munch*', breeds: ['Garden tortoise', 'Hermann\'s tortoise'], food: ['Dandelion salad', '🌼'], wash: 'You gently polished {name}\'s shell. Shiny!', baby: 'Baby' },
    pony: { group: 'pony', sound: 'Neeeigh!', breeds: ['Shetland pony', 'Welsh pony'], food: ['Hay & apples', '🍎'], wash: 'You brushed {name}\'s mane and plaited their tail. Beautiful!', baby: 'Foal' }
  };
  G.petInfo = function (kind) { return INFO[kind] || INFO.dog; };
  BAL.PET_PATTERNS = [{ id: 'plain', name: 'Plain' }, { id: 'spots', name: 'Spots' }, { id: 'patches', name: 'Patches' }, { id: 'stripes', name: 'Stripes' }, { id: 'belly', name: 'Light tummy' }];
  BAL.PET_EYES = ['#2B2B2B', '#3A86FF', '#2A9D8F', '#E09F3E'];
  BAL.PET_HUES = [0, 40, 90, 150, 200, 280, 320];
  BAL.PET_ACCS = [{ id: 'none', name: 'None', emoji: '🚫' }, { id: 'collar', name: 'Collar', emoji: '⭕' }, { id: 'bow', name: 'Bow', emoji: '🎀' }, { id: 'bandana', name: 'Bandana', emoji: '🔺' }, { id: 'bowtie', name: 'Bow Tie', emoji: '👔' }, { id: 'flowers', name: 'Flower Crown', emoji: '🌸' }];
  BAL.PET_ACC_COLORS = ['#FF6B6B', '#4DABF7', '#69DB7C', '#FFD43B', '#9775FA', '#F783AC'];
  var PERSONALITIES = ['Playful', 'Cuddly', 'Shy', 'Cheeky', 'Sleepy', 'Brave', 'Curious', 'Chatty', 'Gentle'];

  G.randomPetLook = function (kind) {
    var inf = G.petInfo(kind);
    if (!inf.draw) return { hue: pick(BAL.PET_HUES), acc: 'none', accColor: pick(BAL.PET_ACC_COLORS) };
    var c = pick(inf.colors);
    var c2 = pick(inf.colors.filter(function (x) { return x !== c; }).concat(['#FFFFFF']));
    return { color: c, color2: c2, pattern: pick(BAL.PET_PATTERNS).id, eyes: pick(BAL.PET_EYES), acc: 'none', accColor: pick(BAL.PET_ACC_COLORS) };
  };
  // Keep only allowed values (looks come from the player's choices).
  G.cleanPetLook = function (kind, look) {
    var inf = G.petInfo(kind), base = G.randomPetLook(kind), lk = Object.assign({}, base, look || {});
    if (!byId(BAL.PET_ACCS, lk.acc)) lk.acc = 'none';
    if (BAL.PET_ACC_COLORS.indexOf(lk.accColor) < 0) lk.accColor = BAL.PET_ACC_COLORS[0];
    if (!inf.draw) { if (BAL.PET_HUES.indexOf(+lk.hue) < 0) lk.hue = 0; lk.hue = +lk.hue; return { hue: lk.hue, acc: lk.acc, accColor: lk.accColor }; }
    var okc = inf.colors.concat(['#FFFFFF']);
    if (okc.indexOf(lk.color) < 0) lk.color = inf.colors[0];
    if (okc.indexOf(lk.color2) < 0) lk.color2 = '#FFFFFF';
    if (!byId(BAL.PET_PATTERNS, lk.pattern)) lk.pattern = 'plain';
    if (BAL.PET_EYES.indexOf(lk.eyes) < 0) lk.eyes = BAL.PET_EYES[0];
    return { color: lk.color, color2: lk.color2, pattern: lk.pattern, eyes: lk.eyes, acc: lk.acc, accColor: lk.accColor };
  };

  /* ===================== Drawing pets (SVG) ===================== */
  function shade(hex, amt) {
    var n = parseInt(String(hex).slice(1), 16); if (isNaN(n)) n = 0x888888;
    var r = Math.max(0, Math.min(255, (n >> 16) + amt)), g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt)), b = Math.max(0, Math.min(255, (n & 255) + amt));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  function lum(hex) { var n = parseInt(String(hex).slice(1), 16); return ((n >> 16) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11); }
  var SHAPE = {
    dog: { hy: 42, hr: 21, brx: 24, bry: 19 }, cat: { hy: 42, hr: 20, brx: 21, bry: 19 }, hamster: { hy: 47, hr: 22, brx: 28, bry: 22 },
    rabbit: { hy: 47, hr: 19, brx: 23, bry: 19 }, guinea: { hy: 50, hr: 20, brx: 32, bry: 18 }, mouse: { hy: 50, hr: 16, brx: 18, bry: 15 }, chinchilla: { hy: 45, hr: 20, brx: 23, bry: 20 }
  };
  var filterN = 0;
  BAL.petAvatar = function (kind, look, mood, opts) {
    opts = opts || {}; look = look || {};
    if (mood === undefined) mood = 70;
    var inf = G.petInfo(kind), s = [];
    var label = opts.label ? ' role="img" aria-label="' + String(opts.label).replace(/"/g, '&quot;') + '"' : ' aria-hidden="true"';
    if (!inf.draw) {
      filterN += 1;
      var fid = 'pf' + filterN, emo = (byId(BAL.PETS, kind) || {}).emoji || '🐾';
      s.push('<filter id="' + fid + '"><feColorMatrix type="hueRotate" values="' + (+look.hue || 0) + '"/></filter>');
      s.push('<ellipse cx="50" cy="90" rx="26" ry="5" fill="rgba(0,0,0,.12)"/>');
      s.push('<text x="50" y="76" font-size="62" text-anchor="middle" filter="url(#' + fid + ')">' + emo + '</text>');
      if (look.acc && look.acc !== 'none') s.push('<text x="74" y="30" font-size="22" text-anchor="middle">' + (byId(BAL.PET_ACCS, look.acc) || {}).emoji + '</text>');
      return '<svg viewBox="0 0 100 100"' + label + ' xmlns="http://www.w3.org/2000/svg">' + s.join('') + '</svg>';
    }
    var sh = SHAPE[kind] || SHAPE.dog;
    var c = look.color || '#C8915A', c2 = look.color2 || '#FFFFFF', dark = shade(c, -35), eye = look.eyes || '#2B2B2B';
    var hy = sh.hy, hr = sh.hr, by = 72, pat = look.pattern || 'plain';
    var light = lum(c) > 200;
    var ol = ' stroke="' + shade(c, light ? -60 : -40) + '" stroke-width="1.3"';
    var inner = '#FFB3C7';
    s.push('<ellipse cx="50" cy="93" rx="30" ry="5" fill="rgba(0,0,0,.12)"/>');
    // tails (behind)
    if (kind === 'dog') s.push('<path d="M70 76 Q88 70 84 50" stroke="' + c + '" stroke-width="7" fill="none" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" values="-8 72 76;10 72 76;-8 72 76" dur="' + (mood > 60 ? '0.5' : '1.6') + 's" repeatCount="indefinite"/></path>');
    if (kind === 'cat') s.push('<path d="M68 82 Q94 78 88 60 Q84 48 92 40" stroke="' + c + '" stroke-width="6" fill="none" stroke-linecap="round"/>');
    if (kind === 'mouse') s.push('<path d="M64 84 Q86 92 92 76" stroke="#F7A6B8" stroke-width="3" fill="none" stroke-linecap="round"/>');
    if (kind === 'chinchilla') s.push('<ellipse cx="78" cy="66" rx="10" ry="17" fill="' + shade(c, -10) + '" transform="rotate(25 78 66)"/>');
    // long ears behind head
    if (kind === 'rabbit') {
      var lop = (look.pattern === 'patches'); // patchy bunnies are lop-eared for variety
      if (lop) s.push('<ellipse cx="30" cy="' + (hy + 6) + '" rx="7" ry="17" fill="' + dark + '" transform="rotate(18 30 ' + (hy + 6) + ')"/><ellipse cx="70" cy="' + (hy + 6) + '" rx="7" ry="17" fill="' + dark + '" transform="rotate(-18 70 ' + (hy + 6) + ')"/>');
      else s.push('<ellipse cx="40" cy="' + (hy - 24) + '" rx="7" ry="19" fill="' + c + '"' + ol + ' transform="rotate(-10 40 ' + (hy - 24) + ')"/><ellipse cx="60" cy="' + (hy - 24) + '" rx="7" ry="19" fill="' + c + '"' + ol + ' transform="rotate(10 60 ' + (hy - 24) + ')"/>' +
        '<ellipse cx="40" cy="' + (hy - 22) + '" rx="3.5" ry="13" fill="' + inner + '" transform="rotate(-10 40 ' + (hy - 22) + ')"/><ellipse cx="60" cy="' + (hy - 22) + '" rx="3.5" ry="13" fill="' + inner + '" transform="rotate(10 60 ' + (hy - 22) + ')"/>');
    }
    if (kind === 'mouse' || kind === 'chinchilla') {
      var er = kind === 'mouse' ? 11 : 10, ey0 = hy - hr + 2;
      s.push('<circle cx="' + (50 - hr + 2) + '" cy="' + ey0 + '" r="' + er + '" fill="' + c + '"' + ol + '/><circle cx="' + (50 + hr - 2) + '" cy="' + ey0 + '" r="' + er + '" fill="' + c + '"' + ol + '/>' +
        '<circle cx="' + (50 - hr + 2) + '" cy="' + ey0 + '" r="' + (er - 4) + '" fill="' + inner + '"/><circle cx="' + (50 + hr - 2) + '" cy="' + ey0 + '" r="' + (er - 4) + '" fill="' + inner + '"/>');
    }
    // body
    s.push('<ellipse cx="50" cy="' + by + '" rx="' + sh.brx + '" ry="' + sh.bry + '" fill="' + c + '"' + ol + '/>');
    if (pat === 'belly' || kind === 'hamster') s.push('<ellipse cx="50" cy="' + (by + 4) + '" rx="' + (sh.brx * 0.55) + '" ry="' + (sh.bry * 0.6) + '" fill="' + (pat === 'belly' ? c2 : shade(c, 30)) + '"/>');
    if (pat === 'spots') s.push('<circle cx="38" cy="' + (by - 4) + '" r="4" fill="' + c2 + '"/><circle cx="62" cy="' + (by + 2) + '" r="5" fill="' + c2 + '"/><circle cx="52" cy="' + (by + 10) + '" r="3" fill="' + c2 + '"/>');
    if (pat === 'patches') s.push('<ellipse cx="62" cy="' + (by - 2) + '" rx="10" ry="8" fill="' + c2 + '"/>');
    if (pat === 'stripes') for (var i = -1; i <= 1; i++) s.push('<path d="M' + (38 + i * 12) + ' ' + (by - sh.bry + 4) + ' q4 8 0 16" stroke="' + (light ? '#C9A27E' : dark) + '" stroke-width="3" fill="none" stroke-linecap="round"/>');
    // paws
    s.push('<ellipse cx="40" cy="' + (by + sh.bry - 2) + '" rx="6" ry="4" fill="' + shade(c, -15) + '"/><ellipse cx="60" cy="' + (by + sh.bry - 2) + '" rx="6" ry="4" fill="' + shade(c, -15) + '"/>');
    if (kind === 'rabbit') s.push('<circle cx="74" cy="' + (by + 6) + '" r="7" fill="#FFFFFF" stroke="#D9D9D9" stroke-width="1.2"/>');
    // ears on top of head
    if (kind === 'cat') s.push('<path d="M33 ' + (hy - 8) + ' L31 ' + (hy - 28) + ' L47 ' + (hy - 18) + ' Z M67 ' + (hy - 8) + ' L69 ' + (hy - 28) + ' L53 ' + (hy - 18) + ' Z" fill="' + c + '"' + ol + '/><path d="M35 ' + (hy - 12) + ' L34 ' + (hy - 23) + ' L43 ' + (hy - 17) + ' Z M65 ' + (hy - 12) + ' L66 ' + (hy - 23) + ' L57 ' + (hy - 17) + ' Z" fill="' + inner + '"/>');
    if (kind === 'hamster' || kind === 'guinea') { var hr2 = kind === 'hamster' ? 6 : 4.5; s.push('<circle cx="' + (50 - hr * 0.62) + '" cy="' + (hy - hr * 0.78) + '" r="' + hr2 + '" fill="' + dark + '"/><circle cx="' + (50 + hr * 0.62) + '" cy="' + (hy - hr * 0.78) + '" r="' + hr2 + '" fill="' + dark + '"/><circle cx="' + (50 - hr * 0.62) + '" cy="' + (hy - hr * 0.78) + '" r="' + (hr2 - 2.5) + '" fill="' + inner + '"/><circle cx="' + (50 + hr * 0.62) + '" cy="' + (hy - hr * 0.78) + '" r="' + (hr2 - 2.5) + '" fill="' + inner + '"/>'); }
    // head
    s.push('<circle cx="50" cy="' + hy + '" r="' + hr + '" fill="' + c + '"' + ol + '/>');
    if (pat === 'patches') s.push('<ellipse cx="41" cy="' + (hy - 2) + '" rx="9" ry="8" fill="' + c2 + '"/>');
    if (pat === 'stripes') s.push('<path d="M44 ' + (hy - hr + 3) + ' v7 M50 ' + (hy - hr + 2) + ' v8 M56 ' + (hy - hr + 3) + ' v7" stroke="' + (light ? '#C9A27E' : dark) + '" stroke-width="2.6" stroke-linecap="round"/>');
    if (pat === 'spots') s.push('<circle cx="60" cy="' + (hy - 8) + '" r="3.2" fill="' + c2 + '"/>');
    if (kind === 'hamster') s.push('<circle cx="34" cy="' + (hy + 7) + '" r="8" fill="' + shade(c, 25) + '"/><circle cx="66" cy="' + (hy + 7) + '" r="8" fill="' + shade(c, 25) + '"/>');
    // floppy ears in front
    if (kind === 'dog') s.push('<ellipse cx="31" cy="' + (hy + 2) + '" rx="7" ry="14" fill="' + (pat === 'plain' ? dark : c2 === '#FFFFFF' ? dark : c2) + '" transform="rotate(20 31 ' + (hy + 2) + ')"/><ellipse cx="69" cy="' + (hy + 2) + '" rx="7" ry="14" fill="' + (pat === 'plain' ? dark : c2 === '#FFFFFF' ? dark : c2) + '" transform="rotate(-20 69 ' + (hy + 2) + ')"/>');
    // face
    var ey = hy - 2;
    [42, 58].forEach(function (x) { s.push('<circle cx="' + x + '" cy="' + ey + '" r="3.6" fill="' + eye + '"/><circle cx="' + x + '" cy="' + ey + '" r="2" fill="#1d1d1d"/><circle cx="' + (x + 1.2) + '" cy="' + (ey - 1.3) + '" r="1.1" fill="#fff"/>'); });
    if (kind === 'dog') s.push('<ellipse cx="50" cy="' + (hy + 8) + '" rx="9" ry="6.5" fill="' + shade(c, 40) + '"/><ellipse cx="50" cy="' + (hy + 5) + '" rx="3.6" ry="2.6" fill="#222"/>');
    else s.push('<path d="M47.5 ' + (hy + 4) + ' h5 l-2.5 3 z" fill="#F48FB1"/>');
    s.push('<circle cx="37" cy="' + (hy + 6) + '" r="3" fill="#FF8FAB" opacity=".45"/><circle cx="63" cy="' + (hy + 6) + '" r="3" fill="#FF8FAB" opacity=".45"/>');
    var my = hy + (kind === 'dog' ? 10 : 8);
    if (mood >= 50) s.push('<path d="M45 ' + my + ' q2.5 3 5 0 q2.5 3 5 0" stroke="#5a3a3a" stroke-width="1.4" fill="none" stroke-linecap="round"/>');
    else s.push('<path d="M45.5 ' + (my + 2) + ' q4.5 -2.5 9 0" stroke="#5a3a3a" stroke-width="1.4" fill="none" stroke-linecap="round"/>');
    if (kind === 'dog' && mood >= 75) s.push('<path d="M48 ' + (my + 1.5) + ' q2 6 4 0 z" fill="#FF6B8B"/>');
    if (kind === 'rabbit') s.push('<rect x="48.4" y="' + (my + 1) + '" width="3.2" height="3.4" rx=".6" fill="#fff" stroke="#ddd" stroke-width=".4"/>');
    if (kind !== 'dog') s.push('<path d="M38 ' + (hy + 5) + ' l-9 -1 M38 ' + (hy + 7) + ' l-9 2 M62 ' + (hy + 5) + ' l9 -1 M62 ' + (hy + 7) + ' l9 2" stroke="' + (light ? '#B0A090' : 'rgba(255,255,255,.7)') + '" stroke-width=".8" stroke-linecap="round"/>');
    // accessories
    var ac = look.accColor || '#FF6B6B', ny = hy + hr - 2;
    if (look.acc === 'collar') s.push('<rect x="36" y="' + (ny - 1) + '" width="28" height="5" rx="2.5" fill="' + ac + '"/><circle cx="50" cy="' + (ny + 6) + '" r="3" fill="#FFD43B" stroke="#F59F00" stroke-width=".8"/>');
    if (look.acc === 'bandana') s.push('<path d="M35 ' + (ny - 1) + ' L65 ' + (ny - 1) + ' L50 ' + (ny + 13) + ' Z" fill="' + ac + '"/><circle cx="46" cy="' + (ny + 3) + '" r="1.2" fill="#fff"/><circle cx="54" cy="' + (ny + 4) + '" r="1.2" fill="#fff"/>');
    if (look.acc === 'bowtie') s.push('<path d="M50 ' + (ny + 2) + ' l-8 -5 v10 z M50 ' + (ny + 2) + ' l8 -5 v10 z" fill="' + ac + '"/><circle cx="50" cy="' + (ny + 2) + '" r="2" fill="' + shade(ac, -40) + '"/>');
    if (look.acc === 'bow') { var bx = 62, byy = hy - hr + 4; s.push('<path d="M' + bx + ' ' + byy + ' l-8 -5 v10 z M' + bx + ' ' + byy + ' l8 -5 v10 z" fill="' + ac + '"/><circle cx="' + bx + '" cy="' + byy + '" r="2.2" fill="' + shade(ac, -40) + '"/>'); }
    if (look.acc === 'flowers') [-12, -4, 4, 12].forEach(function (dx, k) { s.push('<circle cx="' + (50 + dx) + '" cy="' + (hy - hr + 3 + Math.abs(dx) * 0.25) + '" r="3.4" fill="' + ['#FF8FAB', '#FFD43B', '#B197FC', '#69DB7C'][k] + '"/><circle cx="' + (50 + dx) + '" cy="' + (hy - hr + 3 + Math.abs(dx) * 0.25) + '" r="1.2" fill="#fff"/>'); });
    return '<svg viewBox="0 0 100 100"' + label + ' xmlns="http://www.w3.org/2000/svg">' + s.join('') + '</svg>';
  };

  /* ===================== The shelter ===================== */
  G.petAgeLabel = function (kind, age) { return age < 1 ? G.petInfo(kind).baby : age + ' year' + (age === 1 ? '' : 's') + ' old'; };
  G.shelter = function (l) {
    var town = G.currentTown ? G.currentTown(l) : l.townId;
    var saved = G.rng; G.rng = G.seeded('shelter:' + town + ':' + l.age);
    try {
      var kinds = ['dog', 'cat', 'hamster', 'rabbit', 'guinea'].concat([pick(['mouse', 'chinchilla']), pick(['dog', 'cat', 'rabbit']), pick(['fish', 'parrot', 'lizard', 'tortoise', 'pony', 'guinea'])]);
      var adopted = (l.flags.shelterAdopted || []);
      return kinds.map(function (kind, i) {
        var sp = byId(BAL.PETS, kind), inf = G.petInfo(kind);
        return { id: 'sh:' + town + ':' + l.age + ':' + i, kind: kind, name: pick(BAL.NAMES.pets), breed: pick(inf.breeds), age: randInt(0, Math.max(1, Math.min(8, Math.floor(sp.life / 2)))),
          personality: pick(PERSONALITIES), look: G.randomPetLook(kind) };
      }).filter(function (a) { return adopted.indexOf(a.id) < 0; });
    } finally { G.rng = saved; }
  };
  G.adoptionFee = function (l, kind) { var sp = byId(BAL.PETS, kind); return l.age < 18 ? sp.fee : G.price(l, sp.fee); };

  function newPet(l, kind, name, look, extra) {
    return Object.assign({ id: G.uid(), kind: kind, name: String(name || pick(BAL.NAMES.pets)).trim().slice(0, 20) || pick(BAL.NAMES.pets), age: 0, love: 75,
      health: 90, full: 70, clean: 80, toys: [], bed: null, sick: null, look: G.cleanPetLook(kind, look), personality: pick(PERSONALITIES), breed: pick(G.petInfo(kind).breeds) }, extra || {});
  }
  // how: 'coins' (pay the fee) or 'ask' (children ask their family — once a year)
  A.adoptFromShelter = function (l, animalId, name, look, how) {
    var an = G.shelter(l).find(function (a) { return a.id === animalId; });
    if (!an) return no('That animal has already found a home! 🏡');
    if (l.pets.length >= BAL.MAX_PETS) return no('You have lots of pets already! 🐾 (' + BAL.MAX_PETS + ' is the most.)');
    if (l.age < 5) return no('You\'re a bit too little for a pet. Ask again when you\'re 5!', '🍼');
    var sp = byId(BAL.PETS, an.kind);
    if (how === 'ask' && l.age < 18) {
      if (l.flags.askedPet) return no('You already asked this year. You could pay with your own coins!', '🙂');
      l.flags.askedPet = true;
      var parents = l.people.filter(function (p) { return G.PARENTS.indexOf(p.role) >= 0; });
      var love = parents.length ? parents.reduce(function (s, p) { return s + p.close; }, 0) / parents.length : 60;
      if (an.kind === 'pony' || G.rng() > love / 100 - 0.1 + l.totals.helper * 0.03) return no((parents[0] ? parents[0].name : 'Your family') + ' said "Maybe next year!" Helping with chores might help — or save up your own coins. 😉', '🤔');
    } else {
      var fee = G.adoptionFee(l, an.kind);
      if (l.coins < fee) return no('Adopting ' + an.name + ' costs ' + fmt(fee) + ' coins. ' + (l.age < 18 ? 'Save up, or ask your family!' : 'Keep saving! 🐷'), '🪙');
      G._addCoins(l, -fee);
    }
    var pet = newPet(l, an.kind, name || an.name, look || an.look, { age: an.age, personality: an.personality, breed: an.breed });
    l.pets.push(pet);
    l.flags.shelterAdopted = (l.flags.shelterAdopted || []).concat([an.id]);
    l.totals.petsAdopted += 1;
    G.applyFx(l, { happy: 12 });
    G.unlock(l, 'pet_owner');
    G.addLog(l, 'Adopted ' + pet.name + ' the ' + sp.name.toLowerCase() + ' from the shelter', sp.emoji);
    return ok('Welcome home, ' + pet.name + '! ' + sp.emoji + ' ' + G.petInfo(an.kind).sound, sp.emoji, { celebrate: true, petId: pet.id });
  };

  /* ===================== Caring for pets ===================== */
  function pet(l, id) { var p = byId(l.pets, id); if (p) G.ensurePet(p); return p; }
  function pals(l) { if ((l.pets || []).some(function (p) { return p.love >= 100 && p.health >= 100; })) G.unlock(l, 'pet_pals'); }
  G.petFoods = function (kind) {
    var inf = G.petInfo(kind);
    return [
      { id: 'basic', name: 'Everyday food', emoji: '🥣', cost: 0, full: 40, love: 2, health: 1 },
      { id: 'tasty', name: inf.food[0], emoji: inf.food[1], cost: 5, full: 50, love: 6, health: 3 },
      { id: 'treat', name: 'Special treat', emoji: '🦴', cost: 3, full: 15, love: 8, health: -1 }
    ];
  };
  A.feedPet = function (l, id, food) {
    var p = pet(l, id); if (!p) return no('Which pet?');
    var f = byId(G.petFoods(p.kind), food) || G.petFoods(p.kind)[0];
    if (p.full >= 100 && f.id !== 'treat') return no(p.name + ' is completely full! 😋');
    var cost = f.cost && l.age >= 16 ? G.price(l, f.cost) : f.cost;
    if (cost > l.coins) return no('That costs ' + cost + ' coins. Everyday food is free!', '🪙');
    if (cost) G._addCoins(l, -cost);
    p.full = clamp(p.full + f.full); p.love = clamp(p.love + f.love); p.health = clamp(p.health + f.health);
    G.applyFx(l, { happy: 1 });
    return ok(p.name + ' gobbled up the ' + f.name.toLowerCase() + '! ' + f.emoji, f.emoji);
  };
  A.washPet = function (l, id) {
    var p = pet(l, id); if (!p) return no('Which pet?');
    if (p.clean >= 95) return no(p.name + ' is already squeaky clean! ✨');
    p.clean = 100; p.health = clamp(p.health + 3);
    p.love = clamp(p.love + (p.kind === 'cat' ? 1 : 3));
    G.applyFx(l, { happy: 1 });
    return ok(G.petInfo(p.kind).wash.replace('{name}', p.name), '🛁');
  };
  var playPet = A.playPet;
  A.playPet = function (l, id) {
    var p = pet(l, id); if (!p) return no('Which pet?');
    var r = playPet(l, id);
    if (r.ok) {
      var bonus = Math.min(10, (p.toys || []).length * 2);
      p.love = clamp(p.love + bonus); p.health = clamp(p.health + 2); p.full = clamp(p.full - 10); p.clean = clamp(p.clean - 10);
      if ((p.toys || []).length) { var t = byId(BAL.PET_TOYS, pick(p.toys)); if (t) r.msg = 'You played with ' + p.name + ' and the ' + t.name.toLowerCase() + '! ' + t.emoji; }
    }
    return r;
  };
  A.patPet = function (l, id) {
    var p = pet(l, id); if (!p) return no('Which pet?');
    var fresh = p.patted !== l.age; p.patted = l.age;
    if (fresh) { p.love = clamp(p.love + 3); G.applyFx(l, { happy: 1 }); }
    return ok(p.name + ': ' + G.petInfo(p.kind).sound, (byId(BAL.PETS, p.kind) || {}).emoji);
  };
  A.stylePet = function (l, id, acc, accColor) {
    var p = pet(l, id); if (!p) return no('Which pet?');
    p.look = G.cleanPetLook(p.kind, Object.assign({}, p.look, { acc: acc, accColor: accColor || p.look.accColor }));
    return ok(p.name + ' looks fabulous! ✨', '🎀');
  };

  /* ---------- pet shop: toys & beds ---------- */
  var DOGCAT = ['dog', 'cat'], SMALL = ['hamster', 'rabbit', 'guinea', 'mouse', 'chinchilla'], REPT = ['lizard', 'tortoise'];
  BAL.PET_TOYS = [
    { id: 'ball', name: 'Bouncy Ball', emoji: '🎾', cost: 8, kinds: ['dog', 'pony'] },
    { id: 'bone', name: 'Squeaky Bone', emoji: '🦴', cost: 6, kinds: ['dog'] },
    { id: 'frisbee', name: 'Frisbee', emoji: '🥏', cost: 10, kinds: ['dog'] },
    { id: 'rope', name: 'Tug Rope', emoji: '🪢', cost: 7, kinds: ['dog'] },
    { id: 'wand', name: 'Feather Wand', emoji: '🪶', cost: 6, kinds: ['cat'] },
    { id: 'toymouse', name: 'Toy Mouse', emoji: '🐭', cost: 4, kinds: ['cat'] },
    { id: 'post', name: 'Scratching Post', emoji: '🪵', cost: 25, kinds: ['cat'] },
    { id: 'box', name: 'Cardboard Box', emoji: '📦', cost: 1, kinds: ['cat', 'hamster', 'rabbit', 'guinea'] },
    { id: 'wheel', name: 'Exercise Wheel', emoji: '🎡', cost: 15, kinds: ['hamster', 'mouse', 'chinchilla'] },
    { id: 'tunnel', name: 'Play Tunnel', emoji: '🌀', cost: 10, kinds: SMALL.concat(['cat']) },
    { id: 'chew', name: 'Chew Stick', emoji: '🥢', cost: 3, kinds: SMALL },
    { id: 'carrot', name: 'Carrot Toy', emoji: '🥕', cost: 4, kinds: ['rabbit', 'guinea'] },
    { id: 'mirror', name: 'Bird Mirror', emoji: '🪞', cost: 6, kinds: ['parrot'] },
    { id: 'bell', name: 'Jingly Bell', emoji: '🔔', cost: 5, kinds: ['parrot', 'cat'] },
    { id: 'castle', name: 'Tank Castle', emoji: '🏰', cost: 12, kinds: ['fish'] },
    { id: 'plants', name: 'Water Plants', emoji: '🌿', cost: 8, kinds: ['fish', 'lizard'] },
    { id: 'rock', name: 'Basking Rock', emoji: '🪨', cost: 10, kinds: REPT },
    { id: 'rosette', name: 'Show Rosette', emoji: '🏅', cost: 15, kinds: ['pony'] }
  ];
  BAL.PET_BEDS = [
    { id: 'cushion', name: 'Comfy Cushion', emoji: '🛏️', cost: 15, kinds: DOGCAT, health: 2, love: 2 },
    { id: 'donut', name: 'Fluffy Donut Bed', emoji: '🍩', cost: 35, kinds: DOGCAT, health: 3, love: 4 },
    { id: 'igloo', name: 'Cosy Igloo', emoji: '🛖', cost: 40, kinds: ['cat', 'hamster', 'guinea', 'chinchilla'], health: 3, love: 5 },
    { id: 'royal', name: 'Royal Four-Poster', emoji: '👑', cost: 120, kinds: DOGCAT, health: 4, love: 7 },
    { id: 'hutch', name: 'Deluxe Hutch', emoji: '🏡', cost: 60, kinds: ['rabbit', 'guinea'], health: 4, love: 5 },
    { id: 'palace', name: 'Cage Palace', emoji: '🏯', cost: 50, kinds: ['hamster', 'mouse', 'chinchilla', 'parrot'], health: 4, love: 5 },
    { id: 'hammock', name: 'Snuggly Hammock', emoji: '🪢', cost: 20, kinds: ['mouse', 'chinchilla', 'guinea'], health: 2, love: 3 },
    { id: 'tank', name: 'Big Bright Tank', emoji: '🐠', cost: 80, kinds: ['fish'], health: 5, love: 4 },
    { id: 'vivarium', name: 'Warm Vivarium', emoji: '🌵', cost: 90, kinds: REPT, health: 5, love: 4 },
    { id: 'stable', name: 'Snug Stable', emoji: '🐴', cost: 300, kinds: ['pony'], health: 5, love: 6 }
  ];
  G.petToys = function (kind) { return BAL.PET_TOYS.filter(function (t) { return t.kinds.indexOf(kind) >= 0; }); };
  G.petBeds = function (kind) { return BAL.PET_BEDS.filter(function (t) { return t.kinds.indexOf(kind) >= 0; }); };
  G.petPrice = function (l, base) { return l.age < 16 ? base : G.price(l, base); };
  A.buyPetToy = function (l, id, toyId) {
    var p = pet(l, id), t = byId(BAL.PET_TOYS, toyId);
    if (!p || !t || t.kinds.indexOf(p.kind) < 0) return no('That toy isn\'t right for this pet.');
    if (p.toys.indexOf(toyId) >= 0) return no(p.name + ' already has one!');
    var cost = G.petPrice(l, t.cost);
    if (cost > l.coins) return no('The ' + t.name.toLowerCase() + ' costs ' + cost + ' coins.', '🪙');
    G._addCoins(l, -cost);
    p.toys.push(toyId); p.love = clamp(p.love + 6);
    G.applyFx(l, { happy: 2 });
    if (p.toys.length >= 3) G.unlock(l, 'spoilt_pet');
    return ok(p.name + ' LOVES the new ' + t.name.toLowerCase() + '! ' + t.emoji, t.emoji);
  };
  A.buyPetBed = function (l, id, bedId) {
    var p = pet(l, id), b = byId(BAL.PET_BEDS, bedId);
    if (!p || !b || b.kinds.indexOf(p.kind) < 0) return no('That bed isn\'t right for this pet.');
    if (p.bed === bedId) return no(p.name + ' already sleeps in this one!');
    var cost = G.petPrice(l, b.cost);
    if (cost > l.coins) return no('The ' + b.name.toLowerCase() + ' costs ' + cost + ' coins.', '🪙');
    G._addCoins(l, -cost);
    p.bed = bedId; p.love = clamp(p.love + 5); p.health = clamp(p.health + 3);
    return ok(p.name + ' curled up in the new ' + b.name.toLowerCase() + ' and fell fast asleep. 💤', b.emoji);
  };

  /* ---------- the vet ---------- */
  G.vetCost = function (l) { return l.age < 18 ? 0 : G.price(l, 40); };
  A.vet = function (l, id) {
    var p = pet(l, id); if (!p) return no('Which pet?');
    if (l.energy < 1) return no('You are out of energy ⚡! Have a rest first.', '😴');
    if (!p.sick && p.vetYear === l.age && p.health >= 80) return no(p.name + ' already had a check-up this year and is in tip-top shape! 💪', '🩺');
    var cost = G.vetCost(l);
    if (cost > l.coins) return no('The vet costs ' + fmt(cost) + ' coins.', '🪙');
    l.energy -= 1;
    if (cost) G._addCoins(l, -cost);
    var was = p.sick;
    p.sick = null; p.vetYear = l.age; p.health = clamp(p.health + 20); p.love = clamp(p.love + 2);
    return ok(was ? 'The vet helped ' + p.name + ' get over ' + was + '. All better! 🩺' : 'Check-up done! The vet gave ' + p.name + ' a vaccination and a gold star. ⭐' + (cost ? '' : ' (Your family paid.)'), '🩺');
  };

  /* ===================== A year goes by ===================== */
  var PET_ILL = ['a sniffly cold', 'a sore paw', 'an upset tummy', 'itchy ears'];
  G.ensurePet = function (p) {
    if (p.health === undefined) p.health = 90;
    if (p.full === undefined) p.full = 70;
    if (p.clean === undefined) p.clean = 80;
    if (!Array.isArray(p.toys)) p.toys = [];
    if (p.bed === undefined) p.bed = null;
    if (p.sick === undefined) p.sick = null;
    if (!p.look) { var saved = G.rng; G.rng = G.seeded('pet:' + p.id); try { p.look = G.randomPetLook(p.kind); } finally { G.rng = saved; } }
    if (!p.personality) p.personality = PERSONALITIES[p.id.length % PERSONALITIES.length];
    if (!p.breed) p.breed = G.petInfo(p.kind).breeds[p.id.length % G.petInfo(p.kind).breeds.length];
    return p;
  };
  G.ensurePets = function (l) { (l.pets || []).forEach(G.ensurePet); };
  var ageUp = G.ageUp;
  G.ageUp = function (l, o) {
    (l.pets || []).forEach(G.ensurePet);
    var r = ageUp(l, o);
    if (!r || r.blocked) return r;
    (l.pets || []).forEach(function (p) {
      var bed = byId(BAL.PET_BEDS, p.bed);
      if (p.full < 25) { p.love = clamp(p.love - 6); p.health = clamp(p.health - 4); r.notes.push({ e: '🥣', t: p.name + ' was a bit hungry last year — remember to feed your pets!' }); }
      if (p.clean < 25) { p.health = clamp(p.health - 4); r.notes.push({ e: '🛁', t: p.name + ' needs a wash — try the Wash button.' }); }
      p.full = clamp(p.full - 45); p.clean = clamp(p.clean - 40);
      p.love = clamp(p.love + Math.min(6, p.toys.length * 2) + (bed ? bed.love : 0));
      p.health = clamp(p.health + (bed ? bed.health : 0) - (p.age > G.byId(BAL.PETS, p.kind).life * 0.7 ? 3 : 0));
      if (p.sick) { p.health = clamp(p.health - 8); if (G.rng() < 0.3) p.sick = null; }
      else if (G.rng() < 0.08 + (p.health < 50 ? 0.12 : 0)) { p.sick = pick(PET_ILL); r.notes.push({ e: '🤒', t: p.name + ' has ' + p.sick + '. A trip to the vet will help!' }); }
      p.health = Math.max(5, p.health); // pets never get seriously ill in this game
    });
    return r;
  };
  // Pets from events (like the kitten at the door) get the full care record.
  var resolveEvent = A.resolveEvent;
  A.resolveEvent = function (l, e, i) { var r = resolveEvent(l, e, i); G.ensurePets(l); return r; };
  var adoptPet = A.adoptPet;
  A.adoptPet = function (l, k, n) { var r = adoptPet(l, k, n); G.ensurePets(l); return r; };

  ['feedPet', 'washPet', 'playPet', 'vet', 'buyPetToy', 'buyPetBed', 'patPet'].forEach(function (fn) {
    var f = A[fn]; A[fn] = function (l) { var r = f.apply(null, arguments); if (r.ok) pals(l); return r; };
  });
  BAL.ACHIEVEMENTS.push(
    { id: 'spoilt_pet', name: 'Spoilt Rotten', emoji: '🧸', desc: 'Give a pet 3 toys.' },
    { id: 'pet_pals', name: 'Best Pet Pals', emoji: '💞', desc: 'Have a pet with full happiness and health.' }
  );

  ['child', 'teen', 'young', 'adult', 'older', 'grand'].forEach(function (st) {
    BAL.CHALLENGES.push({ id: 'pet_care_' + st, stage: st, emoji: '🐾', name: 'Pet Pampering', desc: 'Feed or wash your pet twice.', track: { act: ['feedPet', 'washPet'], n: 2 }, tab: 'pets', stars: 1, when: function (l) { return l.pets.length > 0; } });
  });
})(globalThis.BAL = globalThis.BAL || {});
