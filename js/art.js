/* Build a Life — illustrations: scenic backgrounds, houses, room interiors and town buildings.
   Everything is hand-made SVG (no image files), so it is crisp on every screen size. */
(function (BAL) {
  'use strict';
  function shade(hex, amt) {
    var n = parseInt(String(hex).slice(1), 16); if (isNaN(n)) n = 0x888888;
    var r = Math.max(0, Math.min(255, (n >> 16) + amt)), g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt)), b = Math.max(0, Math.min(255, (n & 255) + amt));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  BAL.shade = shade;
  var uid = 0;
  function id(p) { uid += 1; return p + uid; }
  function rect(x, y, w, h, f, rx, ex) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"' + (rx ? ' rx="' + rx + '"' : '') + ' fill="' + f + '"' + (ex || '') + '/>'; }
  function circ(x, y, r, f, ex) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + f + '"' + (ex || '') + '/>'; }
  function path(d, f, ex) { return '<path d="' + d + '" fill="' + f + '"' + (ex || '') + '/>'; }
  function emoji(x, y, size, e, ex) { return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" text-anchor="middle" dominant-baseline="central"' + (ex || '') + '>' + e + '</text>'; }
  function windows(x, y, cols, rows, w, h, gx, gy, lit) {
    var s = '';
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) s += rect(x + c * (w + gx), y + r * (h + gy), w, h, (lit && (r + c) % 3 === 0) ? '#FFE8A3' : '#BDE3FF', 1.5, ' stroke="#fff" stroke-width="1.2"');
    return s;
  }

  /* ===================== Background scenery ===================== */
  BAL.sceneArt = function (type, c1, c2, opts) {
    opts = opts || {};
    var g = id('sky'), s = [];
    var night = opts.night;
    s.push('<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + (night ? '#2B2D6E' : shade(c2 || '#C9F2FF', 10)) + '"/><stop offset="1" stop-color="' + (night ? '#7B5EA7' : (c1 || '#FFD6E8')) + '"/></linearGradient></defs>');
    s.push(rect(0, 0, 1440, 900, 'url(#' + g + ')'));
    s.push(night ? circ(1180, 150, 46, '#FFF8DC') + circ(1198, 138, 40, '#2B2D6E') : '<g class="sun">' + circ(1180, 150, 90, '#FFF3BF', ' opacity=".55"') + circ(1180, 150, 56, '#FFE066') + '</g>');
    [[160, 140, 1], [520, 90, 0.8], [880, 190, 1.1], [1320, 300, 0.7]].forEach(function (c, i) {
      s.push('<g class="cloud-g c' + i + '" opacity=".92" transform="translate(' + c[0] + ' ' + c[1] + ') scale(' + c[2] + ')">' + circ(0, 0, 38, '#fff') + circ(40, -18, 46, '#fff') + circ(88, 0, 36, '#fff') + rect(-30, 0, 150, 34, '#fff', 17) + '</g>');
    });
    var far = shade(c1 || '#FFD6E8', -18), near = '#9BE0A0', near2 = '#7DCF86';
    if (type === 'island' || type === 'seaside') {
      s.push(rect(0, 640, 1440, 260, '#74C0FC') + path('M0 650 Q180 630 360 650 T720 650 T1080 650 T1440 650 V700 H0Z', '#A5D8FF', ' class="waves"'));
    }
    if (type === 'island') {
      s.push(path('M260 700 Q720 480 1180 700 Z', '#FFE8A3') + path('M330 690 Q720 520 1110 690 Z', near));
      [[520, 560], [880, 548], [700, 520]].forEach(function (p) { s.push(path('M' + p[0] + ' ' + (p[1] + 120) + ' Q' + (p[0] - 6) + ' ' + (p[1] + 50) + ' ' + p[0] + ' ' + p[1], 'none', ' stroke="#8D5A36" stroke-width="10" stroke-linecap="round"') + emoji(p[0], p[1] - 10, 90, '🌴', ' opacity=".9"')); });
      s.push(emoji(1220, 690, 56, '⛵') + emoji(200, 700, 44, '🐬'));
    } else if (type === 'seaside') {
      s.push(path('M0 560 Q360 480 720 560 T1440 560 V660 H0Z', far, ' opacity=".55"') + path('M0 620 Q300 580 640 620 T1440 610 V670 H0Z', '#FFE8A3'));
      for (var i = 0; i < 8; i++) s.push(house(120 + i * 165, 600, ['#FF8FAB', '#74C0FC', '#FFD43B', '#B197FC', '#69DB7C'][i % 5], 0.75));
      s.push(lighthouse(1340, 610) + emoji(260, 710, 54, '⛵') + emoji(900, 730, 46, '🚤'));
    } else if (type === 'city') {
      for (var j = 0; j < 14; j++) { var h = 160 + ((j * 97) % 260), x = j * 108 - 20; s.push(rect(x, 700 - h, 96, h + 200, shade(far, -10 - (j % 3) * 8), 6, ' opacity=".8"') + windows(x + 12, 720 - h, 4, Math.floor(h / 40), 12, 18, 10, 22, true)); }
      s.push(path('M0 720 Q360 690 720 720 T1440 720 V900 H0Z', near));
    } else {
      if (opts.snowy) { s.push(path('M0 620 L220 330 L440 620 Z M300 620 L560 260 L820 620 Z M700 620 L980 300 L1260 620 Z M1100 620 L1300 380 L1500 620Z', '#B8C2E8') + path('M188 372 L220 330 L252 372 Q220 385 188 372Z M524 310 L560 260 L596 310 Q560 325 524 310Z M944 350 L980 300 L1016 350 Q980 365 944 350Z', '#fff')); }
      s.push(path('M0 600 Q360 500 720 590 T1440 560 V900 H0Z', far, ' opacity=".55"'));
      s.push(path('M0 680 Q300 600 640 660 T1440 640 V900 H0Z', opts.snowy ? '#F1F3F5' : near));
      var nh = type === 'village' ? 5 : 9;
      for (var k = 0; k < nh; k++) s.push(house(110 + k * (1300 / nh), 660 - (k % 2) * 14, ['#FF8FAB', '#74C0FC', '#FFD43B', '#B197FC', '#FFA94D'][k % 5], type === 'village' ? 0.95 : 0.8));
      for (var t = 0; t < 7; t++) s.push(tree(60 + t * 230, 700 + (t % 2) * 20, opts.snowy));
      if (type === 'village') s.push(windmill(1240, 600));
    }
    s.push(path('M0 800 Q360 760 720 800 T1440 790 V900 H0Z', opts.snowy ? '#E9ECEF' : near2));
    return '<svg class="scene-svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + s.join('') + '</svg>';
  };
  function house(x, y, col, sc) {
    sc = sc || 1;
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + sc + ')">' + rect(-40, -60, 80, 60, '#FFF8F0') + path('M-50 -58 L0 -100 L50 -58 Z', col) + rect(-10, -30, 20, 30, shade(col, -30), 3) + rect(-32, -48, 16, 14, '#BDE3FF', 2) + rect(16, -48, 16, 14, '#BDE3FF', 2) + '</g>';
  }
  function tree(x, y, snowy) { return '<g transform="translate(' + x + ' ' + y + ')">' + rect(-6, -30, 12, 34, '#8D5A36', 3) + circ(0, -52, 34, snowy ? '#DDE7E2' : '#5CB85C') + circ(-20, -36, 24, snowy ? '#E9ECEF' : '#69C26B') + circ(22, -38, 22, snowy ? '#F8F9FA' : '#4CAF50') + '</g>'; }
  function windmill(x, y) { return '<g transform="translate(' + x + ' ' + y + ')">' + path('M-22 80 L-14 -40 L14 -40 L22 80 Z', '#FFF8F0') + '<g class="spin" style="transform-origin:0px -40px">' + path('M0 -40 L-6 -110 L6 -110 Z M0 -40 L70 -46 L70 -34 Z M0 -40 L6 30 L-6 30 Z M0 -40 L-70 -34 L-70 -46 Z', '#C0A080') + '</g>' + circ(0, -40, 7, '#8D5A36') + '</g>'; }
  function lighthouse(x, y) { return '<g transform="translate(' + x + ' ' + y + ')">' + path('M-20 0 L-12 -150 L12 -150 L20 0 Z', '#fff') + path('M-17 -40 L17 -40 L15 -70 L-15 -70 Z M-14 -100 L14 -100 L13 -125 L-13 -125 Z', '#FF6B6B') + rect(-14, -170, 28, 20, '#FFE066', 3) + path('M-18 -170 L0 -188 L18 -170 Z', '#FF6B6B') + '</g>'; }

  /* ===================== Houses (outside) ===================== */
  var HOUSE_STYLE = {
    parents: { kind: 'house', wall: '#FFF4E6', roof: '#E8590C', door: '#5C7CFA' },
    tinyflat: { kind: 'flats', wall: '#E9ECEF', roof: '#868E96', door: '#495057', floors: 4 },
    apartment: { kind: 'flats', wall: '#FFE8CC', roof: '#D9480F', door: '#7048E8', floors: 3, balcony: true },
    rentcottage: { kind: 'cottage', wall: '#FFF9DB', roof: '#C9A227', door: '#2F9E44' },
    flat: { kind: 'flats', wall: '#E7F5FF', roof: '#1C7ED6', door: '#1864AB', floors: 3, balcony: true },
    cottage: { kind: 'cottage', wall: '#FFF5F5', roof: '#B08968', door: '#E64980' },
    treehouse: { kind: 'tree', wall: '#D9A066', roof: '#2F9E44', door: '#8D5A36' },
    family: { kind: 'house', wall: '#F3F0FF', roof: '#5F3DC4', door: '#E8590C', big: true },
    beach: { kind: 'beach', wall: '#E3FAFC', roof: '#15AABF', door: '#FAB005' },
    villa: { kind: 'villa', wall: '#FFFFFF', roof: '#E8590C', door: '#1971C2' },
    castle: { kind: 'castle', wall: '#DEE2E6', roof: '#5F3DC4', door: '#8D5A36' }
  };
  BAL.houseArt = function (homeId) {
    var st = HOUSE_STYLE[homeId] || HOUSE_STYLE.parents, s = [];
    s.push(rect(0, 0, 220, 170, 'transparent'));
    s.push(path('M0 150 Q110 136 220 150 V170 H0Z', st.kind === 'beach' ? '#FFE8A3' : '#8CE99A'));
    if (st.kind === 'beach') s.push(rect(0, 158, 220, 12, '#74C0FC'));
    var k = st.kind;
    if (k === 'house' || k === 'cottage') {
      var w = st.big ? 150 : 120, x = 110 - w / 2, top = st.big ? 62 : 72;
      s.push(rect(x + w - 34, top - 26, 16, 30, shade(st.roof, -20)));
      s.push(rect(x, top, w, 150 - top, st.wall, 4, ' stroke="' + shade(st.wall, -30) + '" stroke-width="2"'));
      s.push(k === 'cottage' ? path('M' + (x - 14) + ' ' + (top + 6) + ' Q110 ' + (top - 66) + ' ' + (x + w + 14) + ' ' + (top + 6) + ' Z', st.roof) : path('M' + (x - 14) + ' ' + (top + 4) + ' L110 ' + (top - 48) + ' L' + (x + w + 14) + ' ' + (top + 4) + ' Z', st.roof, ' stroke="' + shade(st.roof, -25) + '" stroke-width="2" stroke-linejoin="round"'));
      s.push(rect(98, 112, 24, 38, st.door, 4) + circ(117, 132, 2, '#FFE066'));
      var wy = top + 14;
      [x + 14, x + w - 42].forEach(function (wx) { s.push(rect(wx, wy, 28, 24, '#BDE3FF', 3, ' stroke="#fff" stroke-width="3"') + rect(wx + 13, wy, 2, 24, '#fff')); });
      if (st.big) [x + 14, x + w - 42].forEach(function (wx) { s.push(rect(wx, wy + 40, 28, 22, '#BDE3FF', 3, ' stroke="#fff" stroke-width="3"')); });
      if (k === 'cottage') s.push(emoji(x + 6, 144, 18, '🌷') + emoji(x + w - 6, 144, 18, '🌼') + emoji(x + 30, 146, 16, '🌸'));
      s.push(path('M8 150 V128 M20 150 V128 M32 150 V128 M188 150 V128 M200 150 V128 M212 150 V128 M4 134 H36 M184 134 H216', 'none', ' stroke="#fff" stroke-width="4" stroke-linecap="round"'));
      s.push(tree(26, 140) .replace('translate(26 140)', 'translate(24 120) scale(.55)'));
    } else if (k === 'flats') {
      var fl = st.floors, fh = 26, bw = 120, bx = 50, by = 150 - fl * fh - 10;
      s.push(rect(bx, by, bw, 150 - by, st.wall, 4, ' stroke="' + shade(st.wall, -30) + '" stroke-width="2"') + rect(bx - 4, by - 8, bw + 8, 10, st.roof, 3));
      for (var f = 0; f < fl; f++) for (var c = 0; c < 3; c++) {
        var wx2 = bx + 12 + c * 38, wy2 = by + 8 + f * fh;
        if (f === fl - 1 && c === 1) continue;
        s.push(rect(wx2, wy2, 24, 16, (f + c) % 2 ? '#FFE8A3' : '#BDE3FF', 2, ' stroke="#fff" stroke-width="2"'));
        if (st.balcony) s.push(rect(wx2 - 3, wy2 + 14, 30, 4, shade(st.wall, -40), 1) + emoji(wx2 + 22, wy2 + 10, 9, '🪴'));
      }
      s.push(rect(98, 126, 24, 24, st.door, 3));
    } else if (k === 'tree') {
      s.push(rect(98, 70, 24, 80, '#8D5A36', 6) + circ(110, 52, 60, '#40C057') + circ(64, 70, 34, '#51CF66') + circ(156, 70, 34, '#37B24D'));
      s.push(rect(72, 66, 76, 46, st.wall, 4, ' stroke="#8D5A36" stroke-width="3"') + path('M64 68 L110 36 L156 68 Z', '#E8590C') + rect(102, 84, 16, 28, st.door, 3) + rect(80, 76, 16, 14, '#BDE3FF', 2));
      s.push(path('M140 112 L150 150 M152 112 L162 150 M142 120 H154 M145 132 H157 M148 144 H160', 'none', ' stroke="#8D5A36" stroke-width="3"'));
    } else if (k === 'beach') {
      s.push(path('M60 150 V118 M160 150 V118 M110 150 V118', 'none', ' stroke="#8D5A36" stroke-width="6"'));
      s.push(rect(50, 70, 120, 50, st.wall, 4, ' stroke="#99E9F2" stroke-width="2"') + path('M40 72 L110 30 L180 72 Z', st.roof) + rect(100, 88, 20, 32, st.door, 3) + rect(62, 82, 26, 20, '#BDE3FF', 3) + rect(132, 82, 26, 20, '#BDE3FF', 3));
      s.push(emoji(196, 104, 40, '🌴') + emoji(24, 138, 20, '🐚') + emoji(190, 150, 16, '🦀'));
    } else if (k === 'villa') {
      s.push(rect(20, 74, 180, 76, st.wall, 4, ' stroke="#DEE2E6" stroke-width="2"') + path('M12 76 L110 40 L208 76 Z', st.roof));
      [36, 66, 140, 170].forEach(function (cx) { s.push(rect(cx - 5, 80, 10, 70, '#F1F3F5')); });
      s.push(rect(96, 104, 28, 46, st.door, 4) + rect(30, 88, 24, 22, '#BDE3FF', 3) + rect(166, 88, 24, 22, '#BDE3FF', 3));
      s.push('<ellipse cx="110" cy="160" rx="70" ry="8" fill="#74C0FC"/>' + emoji(18, 130, 28, '🌴') + emoji(204, 130, 28, '🌴'));
    } else if (k === 'castle') {
      s.push(rect(40, 70, 140, 80, st.wall, 2, ' stroke="#ADB5BD" stroke-width="2"'));
      [20, 160].forEach(function (tx) { s.push(rect(tx, 40, 40, 110, shade(st.wall, -10), 2) + path('M' + (tx - 4) + ' 42 L' + (tx + 20) + ' 6 L' + (tx + 44) + ' 42 Z', st.roof) + path('M' + (tx + 20) + ' 6 V-6 L' + (tx + 34) + ' 0 L' + (tx + 20) + ' 4', '#FF6B6B', ' stroke="#495057" stroke-width="1.5"') + rect(tx + 12, 70, 16, 22, '#495057', 8)); });
      for (var b = 0; b < 7; b++) s.push(rect(44 + b * 20, 60, 12, 12, st.wall));
      s.push(path('M90 150 V112 Q110 92 130 112 V150 Z', st.door) + rect(70, 86, 14, 20, '#495057', 7) + rect(136, 86, 14, 20, '#495057', 7));
    }
    return '<svg viewBox="0 0 220 170" class="house-svg" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + s.join('') + '</svg>';
  };
  BAL.homeKey = function (l) { return l.home.type === 'family' ? 'parents' : l.home.id; };

  /* ===================== Room interiors ===================== */
  var WALLS = { parents: ['#FFF4E6', '#FFD8A8'], tinyflat: ['#F1F3F5', '#DEE2E6'], apartment: ['#FFF0F6', '#FCC2D7'], rentcottage: ['#FFF9DB', '#FFE066'], flat: ['#E7F5FF', '#A5D8FF'],
    cottage: ['#FFF5F5', '#FFC9C9'], treehouse: ['#F4E3C3', '#D9A066'], family: ['#F3F0FF', '#D0BFFF'], beach: ['#E3FAFC', '#99E9F2'], villa: ['#FFFFFF', '#E9ECEF'], castle: ['#E9ECEF', '#ADB5BD'] };
  // where each furniture / decoration item goes: [x, y, size] (or a special drawing)
  var SPOTS = {
    sofa: [92, 162, 54], bed: [262, 160, 54], bunkbed: [268, 150, 58], piano: [178, 156, 46], hottub: [270, 170, 46], table: [176, 172, 40], desk: [36, 160, 42], bookcase: [300, 140, 46],
    plant: [18, 164, 30], lamp: [134, 160, 28], vase: [176, 148, 20], lavalamp: [222, 162, 22], mirror: [236, 84, 26], painting: [150, 74, 30], poster: [204, 76, 26], stickers: [270, 64, 18],
    cushions: [92, 152, 20], toothpaste: null, rug: 'rug', fairylights: 'lights', bunting: 'bunting', bulbs: null, umbrella: [10, 120, 18], console: [220, 182, 18], tablet: [176, 146, 14],
    laptop: [36, 146, 16], telescope: [300, 92, 28], camera: [150, 182, 14], headphones: [70, 182, 14], teddy: [118, 178, 20], robot: [242, 180, 18], blocks: [40, 186, 16], kite: [40, 80, 24], bike: [302, 178, 26], skate: [262, 190, 18], ball: [214, 190, 14]
  };
  BAL.roomArt = function (l, opts) {
    opts = opts || {};
    var key = BAL.homeKey(l), wc = WALLS[key] || WALLS.parents, s = [];
    var town = BAL.Game.town(l), type = town.type || 'town';
    // wall & floor
    s.push(rect(0, 0, 320, 200, wc[0]));
    for (var i = 0; i < 16; i++) s.push(rect(i * 20 + 8, 0, 4, 128, wc[1], 2, ' opacity=".35"'));
    s.push(rect(0, 128, 320, 72, '#E0B582') + rect(0, 126, 320, 6, '#FFFFFF'));
    for (var j = 0; j < 8; j++) s.push(rect(0, 132 + j * 9, 320, 1, '#C9975F', 0, ' opacity=".6"'));
    // window with a view
    s.push(rect(40, 26, 76, 62, '#fff', 6) + rect(44, 30, 68, 54, type === 'city' ? '#A5D8FF' : '#C5F6FA', 3));
    if (type === 'city') s.push(rect(50, 54, 12, 30, '#748FFC') + rect(66, 46, 14, 38, '#91A7FF') + rect(84, 58, 12, 26, '#748FFC'));
    else if (type === 'seaside' || type === 'island') s.push(rect(44, 66, 68, 18, '#74C0FC') + emoji(92, 60, 12, '⛵'));
    else s.push(path('M44 84 Q78 60 112 84 Z', '#8CE99A') + emoji(60, 70, 12, '🌳'));
    s.push(circ(100, 42, 6, '#FFE066') + rect(77, 30, 2, 54, '#fff') + rect(44, 56, 68, 2, '#fff') + rect(32, 22, 92, 8, '#F783AC', 3) + path('M34 30 Q40 60 36 90 L44 90 Q46 60 44 30Z M122 30 Q116 60 120 90 L112 90 Q110 60 112 30Z', '#FF8FAB', ' opacity=".9"'));
    var inv = (l.inventory || []);
    var has = function (idd) { return inv.indexOf(idd) >= 0; };
    var anything = false;
    if (has('rug')) { s.push('<ellipse cx="170" cy="180" rx="74" ry="14" fill="#B197FC" opacity=".8"/><ellipse cx="170" cy="180" rx="58" ry="9" fill="#D0BFFF" opacity=".8"/>'); anything = true; }
    if (has('bunting')) { var b = 'M0 8'; for (var k = 0; k < 16; k++) b += ' L' + (k * 20 + 10) + ' 22 L' + (k * 20 + 20) + ' 8'; s.push(path(b, 'none', ' stroke="#868E96" stroke-width="1"')); for (var q = 0; q < 16; q++) s.push(path('M' + (q * 20 + 2) + ' 9 L' + (q * 20 + 18) + ' 9 L' + (q * 20 + 10) + ' 22 Z', ['#FF6B6B', '#FFD43B', '#69DB7C', '#4DABF7', '#B197FC'][q % 5])); anything = true; }
    if (has('fairylights')) { s.push(path('M130 14 Q180 34 230 14 Q270 34 316 14', 'none', ' stroke="#495057" stroke-width="1"')); for (var f = 0; f < 10; f++) s.push(circ(136 + f * 18, 20 + (f % 2) * 6, 3, ['#FFE066', '#FF8FAB', '#74C0FC'][f % 3], ' class="twinkle"')); anything = true; }
    Object.keys(SPOTS).forEach(function (idd) {
      var sp = SPOTS[idd];
      if (!sp || typeof sp === 'string' || !has(idd)) return;
      var it = BAL.Game.byId(BAL.ITEMS, idd); if (!it) return;
      s.push(emoji(sp[0], sp[1], sp[2], it.emoji)); anything = true;
    });
    if (!anything) s.push(emoji(176, 168, 38, '🪑') + emoji(214, 168, 30, '🪴') + emoji(150, 80, 22, '🖼️'));
    // pets and the people you live with
    var pets = (l.pets || []).slice(0, 3);
    pets.forEach(function (p, n) { if (BAL.petAvatar) s.push('<svg x="' + (196 + n * 40) + '" y="146" width="44" height="44" viewBox="0 0 100 100">' + BAL.petAvatar(p.kind, p.look, p.love).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '') + '</svg>'); });
    if (opts.people !== false) {
      var fam = (l.people || []).filter(function (p) { return (['spouse', 'partner', 'fiance'].indexOf(p.role) >= 0 && (p.livesWith || p.role === 'spouse')) || (p.role === 'child' && p.age < 18) || (l.home.type === 'family' && ['mum', 'dad', 'parent'].indexOf(p.role) >= 0); }).slice(0, 3);
      var crowd = [{ look: l.look, age: l.age }].concat(fam);
      crowd.forEach(function (p, n) {
        var sv = BAL.avatar(p.look, p.age, 85, { full: true });
        s.push('<svg x="' + (128 + n * 30) + '" y="104" width="42" height="84" viewBox="0 0 100 150" overflow="visible">' + sv.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '') + '</svg>');
      });
    }
    return '<svg viewBox="0 0 320 200" class="room-svg" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + s.join('') + '</svg>';
  };

  /* ===================== Town buildings ===================== */
  function shop(col, sign, awning) {
    return rect(14, 34, 72, 54, '#FFF8F0', 4, ' stroke="' + shade(col, -20) + '" stroke-width="2"') + rect(10, 26, 80, 10, shade(col, -20), 3) +
      (function () { var a = ''; for (var i = 0; i < 8; i++) a += path('M' + (12 + i * 9.5) + ' 36 h9.5 v8 q-4.75 5 -9.5 0 Z', i % 2 ? '#fff' : (awning || col)); return a; })() +
      rect(20, 54, 26, 20, '#BDE3FF', 2, ' stroke="#fff" stroke-width="2"') + rect(56, 52, 22, 36, shade(col, -30), 3) + signBadge(50, 18, sign, col);
  }
  function signBadge(x, y, e, col) { return circ(x, y, 13, '#fff', ' stroke="' + (col || '#FFD43B') + '" stroke-width="3"') + emoji(x, y + 1, 15, e); }
  function tower(col, sign, floors) {
    var s = rect(24, 88 - floors * 16 - 6, 52, floors * 16 + 6, col, 3, ' stroke="' + shade(col, -25) + '" stroke-width="2"');
    for (var f = 0; f < floors; f++) for (var c = 0; c < 3; c++) s += rect(30 + c * 15, 88 - floors * 16 + f * 16, 10, 10, (f + c) % 3 ? '#BDE3FF' : '#FFE8A3', 1.5);
    return s + rect(44, 74, 12, 14, shade(col, -40), 2) + signBadge(50, 88 - floors * 16 - 14, sign, shade(col, -20));
  }
  BAL.buildingArt = function (placeId, color, sign) {
    var c = color || '#E7F5FF', d = shade(c, -45), s = '';
    switch (placeId) {
      case 'home': s = rect(18, 44, 64, 46, '#FFF8F0', 3, ' stroke="' + d + '" stroke-width="2"') + path('M10 46 L50 14 L90 46 Z', '#FF8787', ' stroke="#E03131" stroke-width="2" stroke-linejoin="round"') + rect(42, 64, 16, 26, '#5C7CFA', 3) + rect(24, 54, 14, 12, '#BDE3FF', 2) + rect(62, 54, 14, 12, '#BDE3FF', 2) + rect(66, 18, 8, 16, '#C92A2A'); break;
      case 'school': s = rect(10, 40, 80, 50, '#FFE8CC', 3, ' stroke="#E8590C" stroke-width="2"') + path('M30 40 L50 16 L70 40 Z', '#E8590C') + circ(50, 30, 6, '#fff') + path('M50 30 V26 M50 30 H53', 'none', ' stroke="#495057" stroke-width="1.5"') + windows(16, 50, 4, 1, 12, 12, 7, 0) + rect(42, 70, 16, 20, '#C92A2A', 2) + emoji(84, 22, 14, '🔔'); break;
      case 'hospital': s = rect(16, 22, 68, 68, '#FFFFFF', 3, ' stroke="#ADB5BD" stroke-width="2"') + rect(42, 6, 16, 24, '#FA5252', 2) + rect(36, 12, 28, 12, '#FA5252', 2) + windows(22, 38, 4, 2, 10, 10, 6, 8) + rect(38, 72, 24, 18, '#74C0FC', 2); break;
      case 'surgery': case 'vet': s = rect(18, 40, 64, 50, '#F8F9FA', 3, ' stroke="#38D9A9" stroke-width="2"') + path('M12 42 L50 22 L88 42 Z', '#20C997') + rect(42, 66, 16, 24, '#0CA678', 2) + rect(24, 52, 14, 12, '#BDE3FF', 2) + rect(62, 52, 14, 12, '#BDE3FF', 2) + signBadge(50, 14, placeId === 'vet' ? '🐾' : '➕', '#20C997'); break;
      case 'shops': s = shop('#9775FA', '🛍️'); break;
      case 'supermarket': s = rect(6, 38, 88, 52, '#EBFBEE', 4, ' stroke="#40C057" stroke-width="2"') + rect(6, 30, 88, 12, '#40C057', 3) + emoji(50, 36, 9, 'SUPERMARKET', ' fill="#fff" font-weight="700" font-family="Arial"') + rect(12, 50, 76, 20, '#BDE3FF', 2) + rect(40, 70, 20, 20, '#2B8A3E', 2) + emoji(20, 82, 14, '🛒'); break;
      case 'park': s = '<ellipse cx="50" cy="78" rx="44" ry="14" fill="#8CE99A"/>' + '<ellipse cx="66" cy="78" rx="14" ry="5" fill="#74C0FC"/>' + emoji(28, 46, 34, '🌳') + emoji(72, 52, 26, '🌳') + emoji(48, 76, 14, '🦆') + emoji(24, 80, 14, '🌷'); break;
      case 'cafe': s = shop('#FF922B', '☕', '#FFD8A8'); break;
      case 'restaurant': s = shop('#F06595', '🍝', '#FFDEEB'); break;
      case 'shelter': s = rect(18, 44, 64, 46, '#FFF3BF', 3, ' stroke="#FAB005" stroke-width="2"') + path('M10 46 Q50 6 90 46 Z', '#E67700') + rect(40, 62, 20, 28, '#E67700', 3) + emoji(26, 80, 14, '🐶') + emoji(74, 80, 14, '🐱') + signBadge(50, 32, '🐾', '#FAB005'); break;
      case 'work': s = tower('#91A7FF', '💼', 4); break;
      case 'salon': s = shop('#F783AC', '✂️', '#FFF0F6'); break;
      case 'library': s = rect(12, 44, 76, 46, '#F8F0FC', 2, ' stroke="#9C36B5" stroke-width="2"') + path('M6 46 L50 18 L94 46 Z', '#9C36B5') + [22, 38, 62, 78].map(function (x) { return rect(x - 3, 48, 6, 42, '#fff'); }).join('') + rect(44, 66, 12, 24, '#862E9C', 2) + emoji(50, 34, 12, '📚'); break;
      case 'station': s = rect(8, 46, 84, 6, '#868E96', 2) + path('M4 46 L50 24 L96 46 Z', '#495057') + rect(14, 52, 4, 26, '#495057') + rect(82, 52, 4, 26, '#495057') + rect(6, 78, 88, 6, '#ADB5BD') + emoji(50, 66, 26, '🚆') + signBadge(50, 16, '🚉', '#495057'); break;
      case 'harbour': s = rect(0, 64, 100, 26, '#74C0FC') + rect(6, 58, 52, 8, '#8D5A36', 2) + path('M10 66 V84 M30 66 V84 M50 66 V84', 'none', ' stroke="#5C3D2E" stroke-width="3"') + emoji(74, 56, 30, '⛴️') + emoji(22, 44, 16, '⚓'); break;
      case 'beach': s = rect(0, 66, 100, 24, '#74C0FC') + path('M0 70 Q50 50 100 70 V90 H0Z', '#FFE8A3') + path('M30 70 V34', 'none', ' stroke="#868E96" stroke-width="2"') + path('M10 40 Q30 14 50 40 Z', '#FF6B6B') + emoji(70, 62, 20, '🏰') + emoji(86, 40, 22, '☀️'); break;
      case 'lighthouse': s = path('M40 90 L44 22 L56 22 L60 90 Z', '#fff', ' stroke="#ADB5BD" stroke-width="1.5"') + path('M42 50 H58 L59 62 H41 Z M43 30 H57 L57.5 40 H42.5Z', '#FA5252') + rect(42, 10, 16, 12, '#FFE066', 2) + path('M40 10 L50 0 L60 10Z', '#FA5252') + path('M58 14 L96 4 L96 24 Z', '#FFF3BF', ' opacity=".7"') + rect(0, 82, 100, 8, '#74C0FC'); break;
      case 'museum': s = rect(10, 46, 80, 44, '#F1F3F5', 2, ' stroke="#868E96" stroke-width="2"') + path('M4 48 L50 20 L96 48 Z', '#ADB5BD') + [20, 35, 65, 80].map(function (x) { return rect(x - 3, 50, 6, 40, '#fff'); }).join('') + emoji(50, 72, 22, '🦕'); break;
      case 'cinema': s = rect(14, 34, 72, 56, '#3B3B98', 3) + rect(10, 26, 80, 14, '#FFD43B', 3) + emoji(50, 33, 9, 'CINEMA', ' fill="#3B3B98" font-weight="800" font-family="Arial"') + [18, 30, 42, 54, 66, 78].map(function (x) { return circ(x, 44, 2, '#FFE066', ' class="twinkle"'); }).join('') + emoji(50, 66, 22, '🎬'); break;
      case 'farm': s = rect(20, 44, 52, 46, '#E03131', 2) + path('M14 46 L46 20 L78 46 Z', '#C92A2A') + path('M34 90 V64 H58 V90 M34 64 L58 90 M58 64 L34 90', 'none', ' stroke="#fff" stroke-width="2"') + rect(74, 30, 16, 60, '#ADB5BD', 8) + emoji(88, 80, 14, '🐄'); break;
      case 'slopes': s = path('M0 90 L40 20 L80 90 Z', '#E7F5FF', ' stroke="#A5D8FF" stroke-width="2"') + path('M28 42 L40 20 L52 42 Q40 48 28 42Z', '#fff') + path('M50 90 L76 44 L100 90Z', '#D0EBFF') + emoji(62, 70, 18, '⛷️'); break;
      default: s = shop(c, '⭐');
    }
    return '<svg viewBox="0 0 100 92" class="bld-svg" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><ellipse cx="50" cy="90" rx="42" ry="4" fill="rgba(0,0,0,.12)"/>' + s + '</svg>';
  };
})(globalThis.BAL = globalThis.BAL || {});
