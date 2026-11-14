/* Build a Life — the interactive world.
   Every town has a map of places (homes, schools, hospitals, surgeries, shops, supermarkets, parks,
   cafés, restaurants, pet shelters, workplaces, hair salons and more). Characters travel between
   places, meet townspeople, use objects and take day trips to other towns and islands.
   Pure logic — the map and scenes are drawn by ui.js. */
(function (BAL) {
  'use strict';
  var G = BAL.Game, A = G.actions;
  var byId = G.byId, fmt = G.fmt, clamp = G.clamp;
  function ok(msg, emoji, extra) { return Object.assign({ ok: true, msg: msg, emoji: emoji || '✨' }, extra || {}); }
  function no(msg, emoji) { return { ok: false, msg: msg, emoji: emoji || '🙈' }; }

  /* ===================== Towns, cities, villages, seaside towns & islands ===================== */
  var TYPES = { maple: 'town', sunny: 'village', pebble: 'seaside', snow: 'village', bubble: 'city', star: 'city', meadow: 'village' };
  BAL.TOWNS.forEach(function (t) { t.type = TYPES[t.id] || 'town'; });
  BAL.TOWNS.push(
    { id: 'coral', name: 'Coral Island', kind: 'Island', type: 'island', emoji: '🏝️', colors: ['#9BF6FF', '#CAFFBF'], pay: 0.9, price: 1.15,
      desc: 'A sunny island with palm trees, sea turtles and a ferry to the mainland.', school: 'Coral Island', bonus: 'happy' },
    { id: 'puffin', name: 'Puffin Isle', kind: 'Island', type: 'island', emoji: '⛵', colors: ['#D0EBFF', '#E5DBFF'], pay: 0.85, price: 0.85,
      desc: 'A windy little island with puffins, a lighthouse and very friendly neighbours.', school: 'Puffin Isle', bonus: 'health' }
  );
  BAL.TOWN_TYPES = [
    { id: 'town', name: 'Towns', emoji: '🏘️' }, { id: 'city', name: 'Cities', emoji: '🏙️' }, { id: 'village', name: 'Villages', emoji: '🌻' },
    { id: 'seaside', name: 'Seaside', emoji: '🏖️' }, { id: 'island', name: 'Islands', emoji: '🏝️' }
  ];

  /* ===================== Seeded randomness (so maps & people stay the same) ===================== */
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function seeded(seed) {
    var a = hash(seed);
    var f = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    for (var i = 0; i < 6; i++) f(); // stir, so similar seeds give different results
    return f;
  }
  function withSeed(seed, fn) { var saved = G.rng; G.rng = seeded(seed); try { return fn(); } finally { G.rng = saved; } }
  G.seeded = seeded;

  /* ===================== Places ===================== */
  // obj: interactive objects { id, emoji, name, msg, fx, coins (cost if negative / gift if positive), kids (max age) }
  // npc: people who work there { role, title, emoji, lines[], befriend? }
  // acts: buttons that use the normal game actions
  BAL.PLACES = [
    { id: 'home', name: 'Home', emoji: '🏠', color: '#FFE3E3', desc: 'Your cosy home.',
      obj: [{ id: 'bed', emoji: '🛏️', name: 'Bed', msg: 'You bounced on the bed. Boing!', fx: { happy: 2 } }, { id: 'tv', emoji: '📺', name: 'TV', msg: 'You watched a funny cartoon.', fx: { happy: 2 } },
        { id: 'toybox', emoji: '🧸', name: 'Toy Box', msg: 'You found your favourite toy!', fx: { happy: 2 }, kids: 12 }, { id: 'fridge', emoji: '🧊', name: 'Fridge', msg: 'You made a yummy sandwich.', fx: { health: 1, happy: 1 } },
        { id: 'plant', emoji: '🪴', name: 'Pot Plant', msg: 'You watered the plant. It looks happier already!', fx: { happy: 1 } }, { id: 'window', emoji: '🪟', name: 'Window', msg: 'You looked out at the lovely view.', fx: { happy: 1 } }],
      acts: [{ label: '✅ Daily jobs', tab: 'chores' }, { label: '🪞 Change Your Look', look: true }, { label: '😴 Nap time', activity: 'nap' }] },
    { id: 'school', name: 'School', emoji: '🏫', color: '#FFF3BF', desc: 'Classrooms, a playground and a very busy lunch hall.',
      obj: [{ id: 'books', emoji: '📚', name: 'Bookshelf', msg: 'You read a page about volcanoes. Wow!', fx: { smarts: 1 } }, { id: 'art', emoji: '🖍️', name: 'Art Table', msg: 'You painted a rainbow.', fx: { happy: 1 } },
        { id: 'slide', emoji: '🛝', name: 'Playground', msg: 'Wheee! Down the slide!', fx: { happy: 2, fitness: 1 }, kids: 13 }, { id: 'lab', emoji: '🧪', name: 'Science Lab', msg: 'The experiment fizzed and bubbled!', fx: { smarts: 2 } },
        { id: 'bell', emoji: '🔔', name: 'School Bell', msg: 'Ding-a-ling! Home time!', fx: { happy: 1 } }],
      npc: [{ role: 'teacher', title: 'Teacher', emoji: '🍎', lines: ['Remember to do your homework!', 'You\'re doing brilliantly this year.', 'Who knows the answer? Hands up!'] },
        { role: 'head', title: 'Head Teacher', emoji: '🎓', lines: ['Welcome to our school!', 'Walk, don\'t run, in the corridors please!', 'Well done on your school report.'] },
        { role: 'classmate', title: 'Classmate', emoji: '🎒', lines: ['Do you want to play at break time?', 'I like your trainers!', 'Did you finish the spelling homework?'], befriend: true, kid: true }],
      acts: [{ label: '📚 Study hard', fn: 'study' }, { label: '🎯 Clubs & school', tab: 'school' }] },
    { id: 'hospital', name: 'Hospital', emoji: '🏥', color: '#E7F5FF', desc: 'Doctors and nurses who fix big ouchies.',
      obj: [{ id: 'balloons', emoji: '🎈', name: 'Get-Well Balloons', msg: 'You read all the get-well cards. So kind!', fx: { happy: 1 } }, { id: 'vending', emoji: '🥤', name: 'Vending Machine', msg: 'You bought a juice from the machine.', fx: { happy: 1 }, coins: -2 },
        { id: 'lift', emoji: '🛗', name: 'Lift', msg: 'You went up and down in the lift!', fx: { happy: 1 } }],
      npc: [{ role: 'nurse', title: 'Nurse', emoji: '🩺', lines: ['Drink plenty of water!', 'Let\'s check your temperature.', 'You\'re being very brave.'] },
        { role: 'surgeon', title: 'Doctor', emoji: '🥼', lines: ['Broken bones heal in a few weeks.', 'Wear a helmet when you ride your bike!', 'Healthy food keeps you strong.'] }],
      acts: [{ label: '🏥 Get treatment', fn: 'clinic', arg: 'hospital' }] },
    { id: 'surgery', name: 'Doctors\' Surgery', emoji: '🩺', color: '#E6FCF5', desc: 'Check-ups, jabs, eye tests and the dentist.',
      obj: [{ id: 'fishtank', emoji: '🐠', name: 'Fish Tank', msg: 'You watched the fish swim round and round.', fx: { happy: 1 } }, { id: 'waitingtoys', emoji: '🧩', name: 'Waiting Room Toys', msg: 'You did a puzzle while you waited.', fx: { smarts: 1 }, kids: 10 },
        { id: 'chart', emoji: '🔠', name: 'Eye Chart', msg: 'E… F… P… T… O… Z! You read them all.', fx: { smarts: 1 } }],
      npc: [{ role: 'gp', title: 'Doctor', emoji: '🩺', lines: ['Say "aaah"!', 'Fruit and vegetables every day, please.', 'Coughs and sneezes spread diseases — catch them in a tissue!'] },
        { role: 'dentist', title: 'Dentist', emoji: '🦷', lines: ['Brush for two whole minutes!', 'What lovely teeth!', 'Not too many sweets, OK?'] },
        { role: 'reception', title: 'Receptionist', emoji: '📋', lines: ['The doctor will see you soon.', 'Please take a seat.', 'Have you got an appointment?'] }],
      acts: [{ label: '🩺 Check-up', fn: 'clinic', arg: 'gp' }, { label: '🦷 Dentist', fn: 'clinic', arg: 'dentist' }, { label: '💉 Flu jab', fn: 'clinic', arg: 'jab' }, { label: '👓 Eye test', fn: 'clinic', arg: 'optician' }] },
    { id: 'shops', name: 'High Street Shops', emoji: '🛍️', color: '#F3F0FF', desc: 'Toys, clothes, gadgets, books, furniture and party things.',
      obj: [{ id: 'window', emoji: '🪟', name: 'Shop Window', msg: 'You spotted something amazing in the window!', fx: { happy: 1 } }, { id: 'carousel', emoji: '🎠', name: 'Carousel', msg: 'Round and round on the carousel!', fx: { happy: 3 }, coins: -2, kids: 12 },
        { id: 'busker', emoji: '🎸', name: 'Street Musician', msg: 'You dropped a coin in the hat and danced along.', fx: { happy: 2 }, coins: -1 }],
      npc: [{ role: 'shopkeeper', title: 'Shopkeeper', emoji: '🛍️', lines: ['Everything in the window is new today!', 'Have a lovely day!', 'We\'ve got a sale on teddies!'] }],
      acts: [{ label: '🧸 Toys', shop: 'toys' }, { label: '👕 Clothes', shop: 'clothes' }, { label: '📱 Gadgets', shop: 'gadgets' }, { label: '📚 Books', shop: 'books' }, { label: '🛋️ Furniture', shop: 'home' }, { label: '🎀 Decorations', shop: 'decor' }, { label: '🎂 Party shop', shop: 'party' }] },
    { id: 'supermarket', name: 'Supermarket', emoji: '🛒', color: '#EBFBEE', desc: 'Food, drinks and everyday things.',
      obj: [{ id: 'trolley', emoji: '🛒', name: 'Trolley', msg: 'You rode in the trolley! Zoom!', fx: { happy: 2 }, kids: 6 }, { id: 'fruit', emoji: '🍎', name: 'Fruit Stand', msg: 'Free sample of juicy strawberries!', fx: { health: 1 } },
        { id: 'offers', emoji: '🏷️', name: 'Special Offers', msg: 'You compared prices and found a bargain. Smart shopping!', fx: { smarts: 1 }, skill: 'numbers' }, { id: 'freezer', emoji: '🧊', name: 'Freezer Aisle', msg: 'Brrr! Chilly!', fx: { happy: 1 } }],
      npc: [{ role: 'cashier', title: 'Cashier', emoji: '🧾', lines: ['Do you need a bag?', 'Bananas are on offer today!', 'Have a nice day!'] }],
      acts: [{ label: '🧺 Groceries', shop: 'groceries' }, { label: '🧴 Everyday things', shop: 'everyday' }] },
    { id: 'park', name: 'Park', emoji: '🌳', color: '#D3F9D8', desc: 'Swings, a duck pond and lots of space to run.',
      obj: [{ id: 'swings', emoji: '🎠', name: 'Swings', msg: 'Higher! Higher!', fx: { happy: 2 }, kids: 12 }, { id: 'ducks', emoji: '🦆', name: 'Duck Pond', msg: 'The ducks quacked hello!', fx: { happy: 2 } },
        { id: 'fountain', emoji: '⛲', name: 'Wishing Fountain', msg: 'You threw in a coin and made a wish. ✨', fx: { happy: 2 }, coins: -1 }, { id: 'flowers', emoji: '🌸', name: 'Flower Beds', msg: 'You smelled the flowers. Lovely!', fx: { happy: 1, health: 1 } },
        { id: 'hoop', emoji: '🏀', name: 'Basketball Hoop', msg: 'Swish! Nothing but net!', fx: { fitness: 2 } }, { id: 'bench', emoji: '🪑', name: 'Bench', msg: 'You sat and watched the clouds go by.', fx: { health: 1 } }],
      npc: [{ role: 'keeper', title: 'Park Keeper', emoji: '🧑‍🌾', lines: ['Please put litter in the bin!', 'The tulips are out this week.', 'Mind the ducks crossing!'] },
        { role: 'local', title: 'Friendly Local', emoji: '🙂', lines: ['Lovely day for it!', 'I come here every morning.', 'Have you tried the café? Delicious!'], befriend: true },
        { role: 'dogwalker', title: 'Dog Walker', emoji: '🐕', lines: ['Want to say hello to Biscuit? He\'s very friendly!', 'He loves chasing sticks.', 'Woof! (That was the dog.)'] }],
      acts: [{ label: '🌳 Play / walk', activity: ['playout', 'walk', 'crawl', 'bike'] }, { label: '🤝 Make a friend', fn: 'makeFriend' }] },
    { id: 'cafe', name: 'Café', emoji: '☕', color: '#FFF4E6', desc: 'Hot chocolate, cakes and comfy chairs.',
      obj: [{ id: 'cakes', emoji: '🧁', name: 'Cake Counter', msg: 'You bought a cupcake with sprinkles!', fx: { happy: 3 }, coins: -3 }, { id: 'menu', emoji: '📋', name: 'Menu Board', msg: 'You read the menu. Everything sounds yummy!', fx: { smarts: 1 } },
        { id: 'cocoa', emoji: '☕', name: 'Hot Chocolate', msg: 'A hot chocolate with marshmallows. Mmm!', fx: { happy: 3 }, coins: -4 }],
      npc: [{ role: 'barista', title: 'Barista', emoji: '☕', lines: ['What can I get you?', 'Try the rainbow cake!', 'Want marshmallows on top?'] },
        { role: 'regular', title: 'Café Regular', emoji: '📖', lines: ['I\'m reading a brilliant book.', 'This is my favourite seat!', 'The scones here are the best.'], befriend: true }],
      acts: [{ label: '🧁 Ask about a weekend job', fn: 'takeSideJob', arg: 'cafe_pt' }] },
    { id: 'restaurant', name: 'Restaurant', emoji: '🍝', color: '#FFF0F6', desc: 'A special meal out.',
      obj: [{ id: 'pizza', emoji: '🍕', name: 'Pizza Oven', msg: 'You watched the chef spin the pizza dough!', fx: { happy: 2 } }, { id: 'piano', emoji: '🎹', name: 'Piano', msg: 'The pianist played your favourite song.', fx: { happy: 2 } },
        { id: 'candles', emoji: '🕯️', name: 'Candles', msg: 'So cosy and twinkly.', fx: { happy: 1 } }],
      npc: [{ role: 'waiter', title: 'Waiter', emoji: '🍽️', lines: ['Table for how many?', 'Today\'s special is spaghetti!', 'Save room for pudding!'] },
        { role: 'chef', title: 'Head Chef', emoji: '🧑‍🍳', lines: ['The secret ingredient is love!', 'Fresh tomatoes make the best sauce.', 'Do you like it spicy?'] }],
      acts: [{ label: '🍝 Meal out', fn: 'mealOut' }, { label: '🌹 Date night', fn: 'date', partner: true }] },
    { id: 'shelter', name: 'Pet Shelter', emoji: '🐾', color: '#FFF9DB', desc: 'Lovely animals looking for a forever home.',
      obj: [{ id: 'kennel', emoji: '🐶', name: 'Dog Kennels', msg: 'A puppy licked your hand! So cute!', fx: { happy: 3 } }, { id: 'catroom', emoji: '🐱', name: 'Cat Room', msg: 'A kitten purred on your lap.', fx: { happy: 3 } },
        { id: 'donate', emoji: '🦴', name: 'Donation Box', msg: 'You donated some coins for pet food. Thank you!', fx: { happy: 3 }, coins: -10, kind: true }],
      npc: [{ role: 'shelter', title: 'Shelter Worker', emoji: '🐾', lines: ['Every animal here needs a loving home.', 'Pets need food, walks and cuddles every day!', 'Would you like to meet the rabbits?'] }],
      acts: [{ label: '🏡 Adopt a pet', tab: 'pets' }, { label: '🤝 Volunteer', activity: ['volunteer'] }] },
    { id: 'work', name: 'Workplace', emoji: '🏢', color: '#E5DBFF', desc: 'Offices, workshops and the Job Centre.',
      obj: [{ id: 'coffee', emoji: '☕', name: 'Coffee Machine', msg: 'Whirr… bzzz… coffee break!', fx: { happy: 1 } }, { id: 'noticeboard', emoji: '📌', name: 'Notice Board', msg: 'Lots of jobs advertised today!', fx: { smarts: 1 } },
        { id: 'printer', emoji: '🖨️', name: 'Printer', msg: 'It printed 100 pages of cat pictures. Oops!', fx: { happy: 2 } }],
      npc: [{ role: 'boss', title: 'Boss', emoji: '👔', lines: ['Keep up the good work!', 'Teamwork makes the dream work.', 'Have you thought about learning new skills?'] },
        { role: 'adviser', title: 'Job Centre Adviser', emoji: '📋', lines: ['There are lots of jobs out there!', 'Skills and qualifications open doors.', 'Side jobs are a great way to earn extra coins.'] },
        { role: 'coworker', title: 'Co-worker', emoji: '💼', lines: ['Fancy a cuppa?', 'Busy day today!', 'Did you see the new project?'], befriend: true, adult: true }],
      acts: [{ label: '💪 Work hard', fn: 'workHard', needs: 'job' }, { label: '🏪 Work on my business', fn: 'workBusiness', needs: 'business' }, { label: '🏢 Job Centre', tab: 'school' }, { label: '🧹 Odd jobs', tab: 'money' }] },
    { id: 'salon', name: 'Hair Salon', emoji: '💇', color: '#FFDEEB', desc: 'Haircuts, colours and the spinny chairs.',
      obj: [{ id: 'chair', emoji: '💺', name: 'Spinny Chair', msg: 'Wheeee! You spun round three times.', fx: { happy: 2 } }, { id: 'mirror', emoji: '🪞', name: 'Big Mirror', msg: 'Looking good!', fx: { happy: 1 } },
        { id: 'dryer', emoji: '💨', name: 'Hairdryer', msg: 'Whoosh! Big fluffy hair!', fx: { happy: 1 } }],
      npc: [{ role: 'stylist', title: 'Hairdresser', emoji: '✂️', lines: ['Fancy a new style?', 'How about some bright colours?', 'Your hair would look great in a bun!'] }],
      acts: [{ label: '✂️ Haircut', fn: 'haircut' }, { label: '💇 Change my hairstyle', look: 'face' }] },
    { id: 'library', name: 'Library', emoji: '📚', color: '#F8F0FC', desc: 'Free books, quiet corners and skills courses.',
      obj: [{ id: 'storycorner', emoji: '🧸', name: 'Story Corner', msg: 'Story time! Everyone gasped at the dragon.', fx: { happy: 2 }, kids: 10 }, { id: 'globe', emoji: '🌍', name: 'Globe', msg: 'You spun the globe and found a new country!', fx: { smarts: 2 } },
        { id: 'computers', emoji: '💻', name: 'Computers', msg: 'You looked up how rockets work.', fx: { smarts: 1 }, skill: 'tech' }],
      npc: [{ role: 'librarian', title: 'Librarian', emoji: '📚', lines: ['Shhh! …only joking. Welcome!', 'Our new books arrived today.', 'You can learn new skills here for free.'] }],
      acts: [{ label: '📖 Read a book', activity: ['read'] }, { label: '🛠️ Learn a skill', tab: 'school' }] },
    { id: 'station', name: 'Train Station', emoji: '🚉', color: '#E9ECEF', desc: 'Trains to other towns and cities.',
      obj: [{ id: 'board', emoji: '🕒', name: 'Departures Board', msg: 'The 10:15 to Bubbleton is on time!', fx: { smarts: 1 } }, { id: 'wave', emoji: '🚆', name: 'Platform', msg: 'You waved at the train driver. They tooted back!', fx: { happy: 2 } }],
      npc: [{ role: 'guard', title: 'Ticket Officer', emoji: '🎫', lines: ['Where would you like to go today?', 'Mind the gap!', 'Children travel cheaper with a grown-up.'] }],
      acts: [{ label: '🚆 Day trip', trips: true }] },
    { id: 'harbour', name: 'Ferry Port', emoji: '⛴️', color: '#D0EBFF', desc: 'Boats, seagulls and ferries to the islands.',
      obj: [{ id: 'boats', emoji: '⛵', name: 'Sailing Boats', msg: 'The sailing boats bobbed in the water.', fx: { happy: 1 } }, { id: 'seagull', emoji: '🐦', name: 'Seagull', msg: 'A cheeky seagull tried to steal your chips!', fx: { happy: 2 } },
        { id: 'fishing', emoji: '🎣', name: 'Fishing Spot', msg: 'You caught a fish… and let it go. Splash!', fx: { happy: 2, health: 1 } }],
      npc: [{ role: 'captain', title: 'Ferry Captain', emoji: '⚓', lines: ['All aboard!', 'The sea is calm today.', 'I\'ve sailed these waters for 30 years!'] }],
      acts: [{ label: '⛴️ Day trip', trips: true }] },
    { id: 'beach', name: 'Beach', emoji: '🏖️', color: '#FFF3BF', desc: 'Sand, sea and ice cream.', special: true,
      obj: [{ id: 'sandcastle', emoji: '🏰', name: 'Sandcastle', msg: 'You built a giant sandcastle with a moat!', fx: { happy: 3 } }, { id: 'shells', emoji: '🐚', name: 'Shells', msg: 'You found a beautiful shell.', fx: { happy: 2 } },
        { id: 'waves', emoji: '🌊', name: 'Paddle in the Sea', msg: 'Splash! Cold but fun!', fx: { happy: 2, fitness: 1 } }, { id: 'crab', emoji: '🦀', name: 'Rock Pool', msg: 'A tiny crab waved its claw at you!', fx: { smarts: 1, happy: 1 } },
        { id: 'icecream', emoji: '🍦', name: 'Ice-Cream Van', msg: 'A double scoop with a flake!', fx: { happy: 4 }, coins: -3 }],
      npc: [{ role: 'lifeguard', title: 'Lifeguard', emoji: '🛟', lines: ['Swim between the red and yellow flags!', 'Don\'t forget your sun cream.', 'The water\'s lovely today.'] }],
      acts: [{ label: '🏊 Go swimming', activity: ['swim'] }] },
    { id: 'lighthouse', name: 'Lighthouse', emoji: '🗼', color: '#FFE8CC', desc: 'Climb to the top for the best view on the island.', special: true,
      obj: [{ id: 'stairs', emoji: '🪜', name: 'Spiral Stairs', msg: '127 steps to the top! Phew!', fx: { fitness: 2 } }, { id: 'telescope', emoji: '🔭', name: 'Telescope', msg: 'You spotted dolphins far out at sea!', fx: { happy: 3, smarts: 1 } }],
      npc: [{ role: 'keeper', title: 'Lighthouse Keeper', emoji: '🔦', lines: ['The light keeps ships safe at night.', 'Puffins nest on the cliffs!', 'On a clear day you can see the mainland.'] }] },
    { id: 'museum', name: 'Museum', emoji: '🦖', color: '#EDF2FF', desc: 'Dinosaurs, rockets and treasures.', special: true,
      obj: [{ id: 'dino', emoji: '🦕', name: 'Dinosaur Skeleton', msg: 'It\'s as big as a bus!', fx: { smarts: 2 } }, { id: 'rocket', emoji: '🚀', name: 'Space Rocket', msg: 'You sat in a real space capsule!', fx: { smarts: 2, happy: 1 } }],
      npc: [{ role: 'guide', title: 'Museum Guide', emoji: '🗺️', lines: ['This fossil is 65 million years old!', 'Please don\'t touch the mummy. 😉', 'Have you seen the gem room?'] }],
      acts: [{ label: '🦖 Explore the museum', activity: ['museum'] }] },
    { id: 'cinema', name: 'Cinema', emoji: '🎬', color: '#FFE3E3', desc: 'Big screens and buckets of popcorn.', special: true,
      obj: [{ id: 'popcorn', emoji: '🍿', name: 'Popcorn Stand', msg: 'Sweet AND salty popcorn!', fx: { happy: 2 }, coins: -3 }, { id: 'posters', emoji: '🎞️', name: 'Film Posters', msg: 'That new animal film looks brilliant!', fx: { happy: 1 } }],
      npc: [{ role: 'usher', title: 'Usher', emoji: '🎟️', lines: ['Enjoy the film!', 'Phones on silent, please.', 'The 3D glasses are over there.'] }],
      acts: [{ label: '🎬 Watch a film', activity: ['cinema'] }] },
    { id: 'farm', name: 'Farm', emoji: '🚜', color: '#FFF9DB', desc: 'Cows, chickens and fresh eggs.', special: true,
      obj: [{ id: 'chickens', emoji: '🐔', name: 'Chickens', msg: 'You fed the chickens and collected 3 eggs!', fx: { happy: 2 } }, { id: 'cows', emoji: '🐄', name: 'Cows', msg: 'Moooo! The cow said hello.', fx: { happy: 2 } },
        { id: 'tractor', emoji: '🚜', name: 'Tractor', msg: 'You sat in the big tractor!', fx: { happy: 2 } }],
      npc: [{ role: 'farmer', title: 'Farmer', emoji: '🧑‍🌾', lines: ['Up at 5 every morning to milk the cows!', 'Want to help collect eggs?', 'The bees make our honey.'] }],
      acts: [{ label: '🌷 Help in the garden', activity: ['garden'] }] },
    { id: 'slopes', name: 'Snowy Slopes', emoji: '🎿', color: '#E7F5FF', desc: 'Sledging, skiing and snowmen.', special: true,
      obj: [{ id: 'sledge', emoji: '🛷', name: 'Sledge', msg: 'WHEEEEE! All the way to the bottom!', fx: { happy: 3, fitness: 1 } }, { id: 'snowman', emoji: '⛄', name: 'Snowman', msg: 'You gave the snowman a carrot nose.', fx: { happy: 2 } },
        { id: 'cocoahut', emoji: '☕', name: 'Cocoa Hut', msg: 'Warm hot chocolate after the snow!', fx: { happy: 2 }, coins: -3 }],
      npc: [{ role: 'instructor', title: 'Ski Instructor', emoji: '⛷️', lines: ['Bend your knees!', 'Pizza shape to slow down!', 'The snow is perfect today.'] }],
      acts: [{ label: '🏅 Ski & sledge', activity: ['sport', 'playout'] }] }
  ];
  G.place = function (id) { return byId(BAL.PLACES, id); };

  // Which places each kind of town has. Every town has all the essentials.
  var ESSENTIALS = ['home', 'school', 'surgery', 'hospital', 'shops', 'supermarket', 'park', 'cafe', 'restaurant', 'shelter', 'work', 'salon', 'library'];
  var EXTRAS = {
    town: ['station'], village: ['station'], city: ['station', 'museum', 'cinema'],
    seaside: ['station', 'harbour', 'beach'], island: ['harbour', 'beach', 'lighthouse']
  };
  var TOWN_EXTRAS = { snow: ['slopes'], meadow: ['farm'] };
  var NAMES = {
    village: { school: 'Village School', surgery: 'Village Surgery', hospital: 'Cottage Hospital', shops: 'Village Shops', supermarket: 'Village Store', cafe: 'Tea Room', restaurant: 'Village Pub & Kitchen' },
    city: { shops: 'Shopping Centre', supermarket: 'Megastore', hospital: 'City Hospital', work: 'Office Tower', park: 'City Park' },
    island: { supermarket: 'Island Store', hospital: 'Island Hospital', shops: 'Harbour Shops', cafe: 'Beach Café', restaurant: 'Seafood Shack' },
    seaside: { cafe: 'Seafront Café', restaurant: 'Fish & Chip Restaurant', park: 'Seafront Gardens' }
  };
  var DECOR = { town: ['🌳', '🏘️', '🌲', '🚏'], village: ['🌳', '🏡', '🐑', '🌻'], city: ['🏢', '🏬', '🌳', '🚕'], seaside: ['🌴', '🏘️', '🦀', '🌳'], island: ['🌴', '🌺', '🐢', '🏡'] };

  G.townMap = function (townId) {
    var t = byId(BAL.TOWNS, townId) || BAL.TOWNS[0];
    var type = t.type || 'town';
    var ids = ESSENTIALS.concat(EXTRAS[type] || [], TOWN_EXTRAS[t.id] || []);
    var cols = type === 'city' ? 6 : 5;
    var rows = Math.ceil((ids.length + 2) / cols);
    return withSeed('map:' + t.id, function () {
      var cells = [];
      for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) cells.push({ x: x, y: y });
      var waterSide = type === 'seaside' || type === 'island';
      // coast places go on the bottom row; home is near the top
      var coast = ids.filter(function (id) { return waterSide && ['beach', 'harbour', 'lighthouse'].indexOf(id) >= 0; });
      var rest = ids.filter(function (id) { return coast.indexOf(id) < 0 && id !== 'home'; });
      var bottom = cells.filter(function (c) { return c.y === rows - 1; });
      var others = cells.filter(function (c) { return c.y !== rows - 1 || !waterSide; });
      function take(list) { return list.splice(Math.floor(G.rng() * list.length), 1)[0]; }
      var places = [];
      var homeCell = others.splice(G.pick([0, 1, cols - 2]), 1)[0];
      places.push({ id: 'home', x: homeCell.x, y: homeCell.y });
      coast.forEach(function (id) { var c = take(bottom); others = others.filter(function (o) { return o !== c; }); places.push({ id: id, x: c.x, y: c.y }); });
      var free = others.concat(bottom.filter(function (b) { return others.indexOf(b) < 0; }));
      rest.forEach(function (id) { var c = take(free); places.push({ id: id, x: c.x, y: c.y }); });
      var decor = free.map(function (c) { return { decor: G.pick(DECOR[type]), x: c.x, y: c.y }; });
      places.forEach(function (p) { var nm = NAMES[type] && NAMES[type][p.id]; p.name = (p.id === 'home' ? null : (nm || G.place(p.id).name)); });
      return { town: t, type: type, cols: cols, rows: rows, places: places, decor: decor };
    });
  };
  G.mapPlace = function (map, id) { return map.places.find(function (p) { return p.id === id; }) || null; };

  /* ===================== Townspeople ===================== */
  var SURNAMES = ['Patel', 'Okafor', 'Smith', 'Jones', 'Nguyen', 'Kowalski', 'Garcia', 'Murphy', 'Ahmed', 'Brown', 'Chen', 'Evans', 'Singh', 'Taylor', 'Wilson', 'Ali', 'Hughes', 'Rossi', 'Kaur', 'Campbell'];
  G.placePeople = function (l, townId, placeId) {
    var pl = G.place(placeId);
    var list = (pl.npc || []).filter(function (n) { return !(n.kid && (l.age < 4 || l.age > 17)) && !(n.adult && l.age < 16); }).map(function (n, i) {
      return withSeed('npc:' + townId + ':' + placeId + ':' + n.role, function () {
        var g = G.pick(['girl', 'boy']);
        var first = G.randomName(g);
        var sur = G.pick(SURNAMES);
        var formal = !n.befriend && n.role !== 'classmate';
        var title = n.role === 'gp' || n.role === 'surgeon' || n.role === 'dentist' ? 'Dr ' : (formal && G.rng() < 0.5 ? (g === 'girl' ? 'Ms ' : 'Mr ') : '');
        var look = G.randomLook();
        var age = n.kid ? Math.max(4, l.age + G.randInt(-1, 1)) : G.randInt(24, 62);
        return { id: townId + ':' + placeId + ':' + n.role, role: n.role, title: n.title, emoji: n.emoji, gender: g,
          name: title ? title + sur : first, firstName: first, age: age, look: look, lines: n.lines, befriend: !!n.befriend };
      });
    });
    // nobody at the same place shares a name
    list.forEach(function (n, i) {
      for (var k = 0; k < 8 && list.slice(0, i).some(function (m) { return m.name === n.name; }); k++) {
        var nn = withSeed(n.id + ':' + k, function () { return G.randomName(n.gender); });
        if (n.name === n.firstName) n.name = nn;
        n.firstName = nn;
      }
    });
    // Your own family and friends turn up where you'd expect them.
    var mine = [];
    var visiting = (l.world && l.world.town && l.world.town !== l.townId);
    if (!visiting) {
      if (placeId === 'home') mine = l.people.filter(function (p) { return (G.PARENTS.indexOf(p.role) >= 0 && l.home.type === 'family') || ['spouse', 'partner', 'fiance'].indexOf(p.role) >= 0 || (p.role === 'child' && p.age < 18) || (p.role === 'sibling' && l.home.type === 'family' && p.age < 18); });
      if (placeId === 'park' || placeId === 'cafe') mine = l.people.filter(function (p) { return p.role === 'friend'; }).slice(0, 2);
      if (placeId === 'school' && l.age >= 4 && l.age < 18) mine = l.people.filter(function (p) { return p.role === 'friend' && Math.abs(p.age - l.age) <= 2; }).slice(0, 2);
      if (placeId === 'work' && l.job) list = list.filter(function (n) { return n.role !== 'adviser'; });
    }
    return list.concat(mine.map(function (p) { return { id: 'p:' + p.id, personId: p.id, role: p.role, title: (BAL.ROLES[p.role] || {}).label || 'Friend', emoji: (BAL.ROLES[p.role] || {}).emoji || '🙂', name: p.name, age: p.age, look: p.look, mine: true }; }));
  };

  /* ===================== Being somewhere ===================== */
  G.ensureWorld = function (l) {
    if (!l.world) l.world = { loc: 'home', town: null, mode: 'walk', visited: {}, used: {}, talked: {}, towns: [l.townId] };
    if (!l.world.visited) l.world.visited = {};
    if (!l.world.towns) l.world.towns = [l.townId];
    return l.world;
  };
  G.currentTown = function (l) { G.ensureWorld(l); return l.world.town && l.world.town !== l.townId ? l.world.town : l.townId; };
  G.isVisiting = function (l) { return G.currentTown(l) !== l.townId; };
  G.locLabel = function (l, map, id) {
    var mp = G.mapPlace(map, id);
    if (id === 'home') { if (G.isVisiting(l)) return 'Visitor Centre'; var hi = G.homeInfo(l); return 'Your ' + hi.name; }
    if (id === 'work' && !G.isVisiting(l)) { if (l.job) return G.job(l).name + ' — your workplace'; if (l.business) return 'Your ' + G.biz(l).name; return 'Job Centre'; }
    return (mp && mp.name) || G.place(id).name;
  };
  G.locEmoji = function (l, id) {
    if (id === 'home' && !G.isVisiting(l)) return G.homeInfo(l).emoji;
    if (id === 'home') return 'ℹ️';
    if (id === 'work' && !G.isVisiting(l)) { if (l.job) return G.job(l).emoji; if (l.business) return G.biz(l).emoji; }
    return G.place(id).emoji;
  };

  /* ---------- travelling inside a town ---------- */
  BAL.TRAVEL = [
    { id: 'walk', name: 'Walk', emoji: '🚶', speed: 1 },
    { id: 'scooter', name: 'Scooter', emoji: '🛴', speed: 1.6, minAge: 4 },
    { id: 'bike', name: 'Bike', emoji: '🚲', speed: 2, needs: 'bike' },
    { id: 'bus', name: 'Bus', emoji: '🚌', speed: 2.5, fare: 2 },
    { id: 'car', name: 'Car', emoji: '🚗', speed: 3.5, needs: 'car' },
    { id: 'taxi', name: 'Taxi', emoji: '🚕', speed: 3.5, fare: 8, minAge: 12 }
  ];
  G.travelModes = function (l) {
    return BAL.TRAVEL.filter(function (m) {
      if (m.minAge && l.age < m.minAge) return false;
      if (m.id === 'walk' && l.age < 1) return false;
      if (m.needs === 'bike' && l.inventory.indexOf('bike') < 0) return false;
      if (m.needs === 'car' && !(l.licence && l.cars.length)) return false;
      return true;
    });
  };
  G.fare = function (l, mode) { var m = byId(BAL.TRAVEL, mode); return m && m.fare && l.age >= 16 ? G.price(l, m.fare) : 0; };

  A.travel = function (l, placeId, mode) {
    var w = G.ensureWorld(l);
    var map = G.townMap(G.currentTown(l));
    var dest = G.mapPlace(map, placeId);
    if (!dest) return no('That place isn\'t in this town.');
    if (w.loc === placeId) return no('You\'re already here!', '📍');
    var from = G.mapPlace(map, w.loc) || G.mapPlace(map, 'home');
    var modes = G.travelModes(l);
    var m = byId(modes, mode || w.mode) || (l.age < 1 ? { id: 'pram', name: 'Pram', emoji: '👶', speed: 1.4 } : modes[0]);
    var fare = G.fare(l, m.id);
    if (fare > l.coins) return no('The ' + m.name.toLowerCase() + ' costs ' + fmt(fare) + ' coins. You could walk instead! 🚶', '🪙');
    if (fare) G._addCoins(l, -fare);
    var dist = Math.abs(dest.x - from.x) + Math.abs(dest.y - from.y);
    w.loc = placeId; w.mode = m.id === 'pram' ? w.mode : m.id;
    var key = G.currentTown(l);
    var seen = w.visited[key] = w.visited[key] || [];
    var firstVisit = seen.indexOf(placeId) < 0;
    if (firstVisit) seen.push(placeId);
    if ((m.id === 'walk' || m.id === 'bike' || m.id === 'scooter') && dist >= 3) G.applyFx(l, { fitness: 1 });
    if (seen.length >= map.places.length && key === l.townId) G.unlock(l, 'explorer');
    l.totals.placesVisited = (l.totals.placesVisited || 0) + (firstVisit ? 1 : 0);
    var name = G.locLabel(l, map, placeId);
    var how = l.age < 1 ? 'Mum or Dad pushed you in the pram' : (m.id === 'walk' ? 'You walked' : m.id === 'car' ? 'You drove' : 'You went by ' + m.name.toLowerCase());
    return ok(how + ' to ' + name + '.' + (firstVisit ? ' First visit! 🗺️' : ''), G.locEmoji(l, placeId), { dist: dist, speed: m.speed, from: from.id || w.loc });
  };

  /* ---------- objects ---------- */
  G.placeObjects = function (l, placeId) { return (G.place(placeId).obj || []).filter(function (o) { return !(o.kids && l.age > o.kids); }); };
  A.useObject = function (l, placeId, objId) {
    var w = G.ensureWorld(l);
    if (w.loc !== placeId) return no('You need to be there first!');
    var o = byId(G.placeObjects(l, placeId), objId);
    if (!o) return no('?');
    var cost = o.coins && o.coins < 0 ? Math.round(-o.coins * (l.age >= 16 ? G.town(l).price : 1)) : 0;
    if (cost > l.coins) return no('That costs ' + cost + ' coin' + (cost === 1 ? '' : 's') + '.', '🪙');
    if (cost) G._addCoins(l, -cost);
    var key = G.currentTown(l) + ':' + placeId + ':' + objId;
    var fresh = w.used[key] !== l.age;   // the stat boost only works once a year per object
    w.used[key] = l.age;
    if (fresh) { G.applyFx(l, o.fx); if (o.skill) G.addSkill(l, o.skill, 1); if (o.kind) l.totals.kind += 1; }
    return ok(o.msg + (fresh ? '' : ' (You\'ve done this already this year — still fun!)'), o.emoji);
  };

  /* ---------- people ---------- */
  A.talk = function (l, placeId, npcId) {
    var w = G.ensureWorld(l);
    if (w.loc !== placeId) return no('You need to be there first!');
    var npc = G.placePeople(l, G.currentTown(l), placeId).find(function (n) { return n.id === npcId; });
    if (!npc) return no('They\'re not here right now.');
    if (l.age < 1) return ok(npc.name + ' smiled and tickled your toes! You giggled.', '👶', { npc: npc, line: 'Coochie-coo!' });
    var line = G.pick(npc.lines || ['Hello! Lovely to see you.', 'How are you today?', 'Have a wonderful day!']);
    var fresh = w.talked[npcId] !== l.age;
    w.talked[npcId] = l.age;
    if (npc.mine) {
      var p = G.person(l, npc.personId);
      if (p && fresh) p.close = clamp(p.close + 3);
      line = G.pick(['It\'s so nice to see you!', 'What shall we do today?', 'I was just thinking about you!', 'Fancy a chat?']);
    }
    if (fresh) { G.applyFx(l, { happy: 1 }); G.addSkill(l, 'people', 1); l.totals.chats = (l.totals.chats || 0) + 1; if (l.totals.chats >= 20) G.unlock(l, 'chatty'); }
    return ok(npc.name + ': "' + line + '"', npc.emoji, { npc: npc, line: line });
  };
  A.befriend = function (l, placeId, npcId) {
    var npc = G.placePeople(l, G.currentTown(l), placeId).find(function (n) { return n.id === npcId; });
    if (!npc || !npc.befriend) return no('Maybe just say hello for now!');
    if (l.age < 3) return no('You\'re a bit little to make friends on your own!');
    if (l.people.some(function (p) { return p.townsId === npcId; })) return no(npc.name + ' is already your friend! 💛');
    if (l.people.filter(function (p) { return p.role === 'friend'; }).length >= 10) return no('You have lots of friends already!');
    if (l.energy < 1) return no('You are out of energy ⚡!', '😴');
    l.energy -= 1;
    var f = G.makePerson('friend', npc.age, npc.gender, { name: npc.firstName, look: npc.look, close: 55, townsId: npcId });
    l.people.push(f);
    l.totals.friendsMade += 1;
    G.applyFx(l, { happy: 6 });
    G.unlock(l, 'first_friend');
    G.addLog(l, 'Made friends with ' + f.name + ' at the ' + G.place(placeId).name.toLowerCase(), '🤝');
    return ok('You and ' + f.name + ' are friends now! 🤝', '🤝', { celebrate: true });
  };

  /* ---------- a few place-only actions ---------- */
  A.mealOut = function (l) {
    var n = 1 + l.people.filter(function (p) { return ['spouse', 'partner', 'fiance'].indexOf(p.role) >= 0 || (p.role === 'child' && p.age < 18); }).length;
    var cost = l.age < 18 ? 0 : G.price(l, 30) * n;
    if (cost > l.coins) return no('A meal out costs ' + fmt(cost) + ' coins for ' + n + '.', '🪙');
    if (l.energy < 1) return no('You are out of energy ⚡!', '😴');
    l.energy -= 1;
    if (cost) G._addCoins(l, -cost);
    G.applyFx(l, { happy: 6 });
    l.people.forEach(function (p) { if (['mum', 'dad', 'parent', 'spouse', 'partner', 'fiance', 'child', 'sibling'].indexOf(p.role) >= 0) p.close = clamp(p.close + 4); });
    return ok(G.pick(['Spaghetti and meatballs — delicious!', 'Everyone loved the pizza!', 'Pudding was the best bit!']) + (l.age < 18 ? ' (Your family paid.)' : ''), '🍝');
  };
  A.haircut = function (l) {
    var cost = l.age < 18 ? 5 : G.price(l, 15);
    if (cost > l.coins) return no('A haircut costs ' + cost + ' coins.', '🪙');
    G._addCoins(l, -cost);
    G.applyFx(l, { happy: 4 });
    return ok('Snip snip! Your hair looks fantastic!', '✂️');
  };

  /* ---------- day trips to other towns and islands ---------- */
  G.tripCost = function (l, townId) {
    var here = byId(BAL.TOWNS, G.currentTown(l)), there = byId(BAL.TOWNS, townId);
    var ferry = here.type === 'island' || there.type === 'island';
    var base = ferry ? 45 : 30;
    return { mode: ferry ? 'ferry' : 'train', emoji: ferry ? '⛴️' : '🚆', cost: l.age < 16 ? Math.round(base / 3) : G.price(l, base) };
  };
  A.dayTrip = function (l, townId) {
    var w = G.ensureWorld(l);
    var t = byId(BAL.TOWNS, townId);
    if (!t) return no('?');
    if (townId === G.currentTown(l)) return no('You\'re already here!');
    if (l.age < 1) return no('You\'re a bit too tiny for day trips!');
    var tc = G.tripCost(l, townId);
    if (tc.cost > l.coins) return no('The ' + tc.mode + ' costs ' + fmt(tc.cost) + ' coins.', '🪙');
    G._addCoins(l, -tc.cost);
    w.town = townId === l.townId ? null : townId;
    var map = G.townMap(townId);
    w.loc = G.mapPlace(map, 'station') ? 'station' : 'harbour';
    if (w.towns.indexOf(townId) < 0) w.towns.push(townId);
    if (w.towns.length >= 3) G.unlock(l, 'daytripper');
    if (t.type === 'island') G.unlock(l, 'island');
    G.applyFx(l, { happy: 5 });
    if (townId !== l.townId) G.addLog(l, 'Day trip to ' + t.name + '!', t.emoji);
    return ok(townId === l.townId ? 'Home sweet home! Back in ' + t.name + '.' : 'You took the ' + tc.mode + ' to ' + t.name + '! ' + t.desc, townId === l.townId ? '🏡' : tc.emoji, { celebrate: townId !== l.townId });
  };
  A.goHome = function (l) {
    var w = G.ensureWorld(l);
    if (!G.isVisiting(l)) { if (w.loc === 'home') return no('You\'re already home!'); }
    w.town = null; w.loc = 'home';
    return ok('You headed home. Home sweet home! 🏡', '🏡');
  };
  // Moving town (or a new year) puts you back at home.
  var moveTown = A.moveTown;
  A.moveTown = function (l, id) { var r = moveTown(l, id); if (r.ok) { var w = G.ensureWorld(l); w.town = null; w.loc = 'home'; if (w.towns.indexOf(id) < 0) w.towns.push(id); } return r; };

  BAL.ACHIEVEMENTS.push(
    { id: 'explorer', name: 'Town Explorer', emoji: '🧭', desc: 'Visit every place in your home town.' },
    { id: 'daytripper', name: 'Day Tripper', emoji: '🎒', desc: 'Visit 3 different towns.' },
    { id: 'island', name: 'Island Hopper', emoji: '🏝️', desc: 'Take a ferry to an island.' },
    { id: 'chatty', name: 'Chatterbox', emoji: '💬', desc: 'Chat with 20 different townspeople.' }
  );

  // "Out and about" challenges for every stage from toddler upwards.
  ['toddler', 'child', 'teen', 'young', 'adult', 'older', 'grand'].forEach(function (st) {
    BAL.CHALLENGES.push(
      { id: 'ex_go_' + st, stage: st, emoji: '🗺️', name: 'Out and About', desc: 'Explore your town: travel to 3 places on the map.', track: { act: 'travel', n: 3 }, tab: 'explore', stars: 1 },
      { id: 'ex_talk_' + st, stage: st, emoji: '💬', name: 'Say Hello', desc: 'Chat with 2 people around town.', track: { act: 'talk', n: 2 }, tab: 'explore', stars: 1 }
    );
  });
})(globalThis.BAL = globalThis.BAL || {});
(function (BAL) {
  'use strict';
  var G = BAL.Game;
  // A new year starts at home (and ends any day trip).
  var ageUp = G.ageUp;
  G.ageUp = function (l, o) {
    var r = ageUp(l, o);
    if (r && !r.blocked && l.world) {
      if (l.world.town && r.notes) r.notes.push({ e: '🏡', t: 'Your day trip is over — you\'re back home for your birthday!' });
      l.world.town = null; l.world.loc = 'home';
    }
    return r;
  };
})(globalThis.BAL = globalThis.BAL || {});
