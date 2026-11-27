const CACHE_NAME = 'ngwesaryin-live-v12';
// [v7.6.34] ATOMIC GENERATIONS — bump CACHE_NAME on EVERY release.
// A new worker activates only after it has precached the COMPLETE
// build (index.html + every hashed JS/CSS asset it references). The
// previous generation keeps serving until then, so a new deploy
// plus a slow/offline load can never leave a newer index.html
// cached with its chunks missing. The old worker did exactly
// that: network-first with a 1.5s timeout cached whatever
// index.html arrived, then answered HTTP 408 for the new chunk
// whose fetch timed out — the app never booted, and the poisoned
// pairing persisted in the cache (loading screen forever, even
// fully offline).

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  // [v7.6.61] Records balance card type — Noto Sans Myanmar
  // Variable, self-hosted subsets, precached like the icons so
  // the card keeps its type fully offline.
  '/fonts/noto-sans-myanmar-myanmar-wght-normal.woff2',
  '/fonts/noto-sans-myanmar-latin-wght-normal.woff2',
  // [v7.6.47/v7.6.48] Pictorial category icons — precached with the build
  // (atomic generation) so a category row never 404s offline on
  // first sight. Filenames are unhashed; the CACHE_NAME bump above
  // clears stale copies on every release.
  '/icons/salary.webp',
  '/icons/business.webp',
  '/icons/freelance.webp',
  '/icons/bonus.webp',
  '/icons/investment.webp',
  '/icons/income-other.webp',
  '/icons/transfer.webp',
  '/icons/reconcile.webp',
  '/icons/food.webp',
  '/icons/transport.webp',
  '/icons/vehicle.webp',
  '/icons/utilities.webp',
  '/icons/shopping.webp',
  '/icons/health.webp',
  '/icons/charity.webp',
  '/icons/entertainment.webp',
  '/icons/expense-other.webp',
  '/icons/sofa.webp',
  '/icons/bed.webp',
  '/icons/cafe-table.webp',
  '/icons/wardrobe.webp',
  '/icons/desk.webp',
  '/icons/bookshelf.webp',
  '/icons/plant.webp',
  '/icons/curtains.webp',
  '/icons/rug.webp',
  '/icons/floor-lamp.webp',
  '/icons/pendant-lights.webp',
  '/icons/ceiling-lamp.webp',
  '/icons/wall-clock.webp',
  '/icons/dresser.webp',
  '/icons/armchair.webp',
  '/icons/rocking-chair.webp',
  '/icons/pool-table.webp',
  '/icons/bathtub.webp',
  '/icons/toilet.webp',
  '/icons/sink.webp',
  '/icons/washing-machine.webp',
  '/icons/fridge.webp',
  '/icons/microwave.webp',
  '/icons/vacuum.webp',
  '/icons/aircon.webp',
  '/icons/fan.webp',
  '/icons/water-dispenser.webp',
  '/icons/water-heater.webp',
  '/icons/stove-heater.webp',
  '/icons/coffee-machine.webp',
  '/icons/sewing-machine.webp',
  '/icons/tv.webp',
  '/icons/speaker.webp',
  '/icons/computer.webp',
  '/icons/camera.webp',
  '/icons/printer.webp',
  '/icons/hair-dryer.webp',
  '/icons/cctv.webp',
  '/icons/trash-bin.webp',
  '/icons/power-strip.webp',
  '/icons/dustpan.webp',
  '/icons/mop-bucket.webp',
  '/icons/scale.webp',
  '/icons/iron.webp',
  '/icons/hammer.webp',
  '/icons/saw.webp',
  '/icons/screwdriver.webp',
  '/icons/wrench.webp',
  '/icons/drill.webp',
  '/icons/pliers.webp',
  '/icons/tape-measure.webp',
  '/icons/paintbrush.webp',
  '/icons/axe.webp',
  '/icons/clamp.webp',
  '/icons/trowel.webp',
  '/icons/screw.webp',
  '/icons/tape-roll.webp',
  '/icons/paint-scraper.webp',
  '/icons/bolt.webp',
  '/icons/caliper.webp',
  '/icons/plumb-bob.webp',
  '/icons/saw-blade.webp',
  '/icons/pitchfork.webp',
  '/icons/tools-crossed.webp',
  '/icons/rice-bowl.webp',
  '/icons/noodle-bowl.webp',
  '/icons/bread-loaf.webp',
  '/icons/eggs.webp',
  '/icons/fish.webp',
  '/icons/chicken-leg.webp',
  '/icons/steak.webp',
  '/icons/roast-chicken.webp',
  '/icons/pumpkin.webp',
  '/icons/corn.webp',
  '/icons/cabbage.webp',
  '/icons/broccoli.webp',
  '/icons/onion.webp',
  '/icons/mushroom.webp',
  '/icons/eggplant.webp',
  '/icons/beetroot.webp',
  '/icons/peas.webp',
  '/icons/chili.webp',
  '/icons/cherries.webp',
  '/icons/apple.webp',
  '/icons/orange.webp',
  '/icons/banana.webp',
  '/icons/watermelon.webp',
  '/icons/croissant.webp',
  '/icons/donut.webp',
  '/icons/bread-roll.webp',
  '/icons/noodles-packet.webp',
  '/icons/spaghetti.webp',
  '/icons/hotpot.webp',
  '/icons/dumplings.webp',
  '/icons/pizza.webp',
  '/icons/burger.webp',
  '/icons/sandwich.webp',
  '/icons/hot-dog.webp',
  '/icons/taco.webp',
  '/icons/fries.webp',
  '/icons/cake-slice.webp',
  '/icons/muffin.webp',
  '/icons/cheese.webp',
  '/icons/candy.webp',
  '/icons/cookie-jar.webp',
  '/icons/jam.webp',
  '/icons/tin-can.webp',
  '/icons/ketchup.webp',
  '/icons/fish-sauce.webp',
  '/icons/oil-vinegar.webp',
  '/icons/juice.webp',
  '/icons/milk-bottle.webp',
  '/icons/water-bottle.webp',
  '/icons/soft-drink.webp',
  '/icons/coffee-cup.webp',
  '/icons/frappuccino.webp',
  '/icons/soup-bowl.webp',
  '/icons/rice-cake.webp',
  '/icons/snack-packet.webp',
  '/icons/sundae.webp',
  '/icons/fried-egg.webp',
  '/icons/sliced-bread.webp',
  '/icons/kettle.webp',
  '/icons/chef-hat.webp',
  '/icons/cooking-pot.webp',
  '/icons/frying-pan.webp',
  '/icons/knives.webp',
  '/icons/bowls.webp',
  '/icons/plate-set.webp',
  '/icons/oven.webp',
  '/icons/blender.webp',
  '/icons/toaster.webp',
  '/icons/bbq-grill.webp',
  '/icons/mortar-pestle.webp',
  '/icons/raw-meat.webp',
  '/icons/cookbook.webp',
  '/icons/hand-mixer.webp',
  '/icons/grill-pan.webp',
  '/icons/kitchen-scale.webp',
  '/icons/grater.webp',
  '/icons/oven-mitt.webp',
  '/icons/salt-pepper.webp',
  '/icons/rice-cooker.webp',
  '/icons/fork-spoon.webp',
  '/icons/tissue-box.webp',
  '/icons/eye-drops.webp',
  '/icons/diaper.webp',
  '/icons/baby-bottle.webp',
  '/icons/toilet-paper.webp',
  '/icons/soap-dispenser.webp',
  '/icons/toothbrush.webp',
  '/icons/toothpaste.webp',
  '/icons/towel.webp',
  '/icons/detergent.webp',
  '/icons/razor-blade.webp',
  '/icons/tea-mug.webp',
  '/icons/hairband.webp',
  '/icons/cleaning-bucket.webp',
  '/icons/balm-jar.webp',
  '/icons/photo-stamp.webp',
  '/icons/scissors.webp',
  '/icons/first-aid-kit.webp',
  '/icons/tape-dispenser.webp',
  '/icons/electricity-bill.webp',
  '/icons/water-bill.webp',
  '/icons/internet-bill.webp',
  '/icons/phone-bill.webp',
  '/icons/receipt.webp',
  '/icons/watch.webp',
  '/icons/paint-roller.webp',
  '/icons/cigarettes.webp',
  '/icons/soap-bar.webp',
  '/icons/perfume.webp',
  '/icons/shoe.webp',
  '/icons/suit.webp',
  '/icons/first-aid-bottle.webp',
  '/icons/ear-swab.webp',
  '/icons/skincare-set.webp',
  '/icons/deodorant.webp',
  '/icons/face-wash.webp',
  '/icons/makeup-palette.webp',
  '/icons/cream-jar.webp',
  '/icons/lips.webp',
  '/icons/lipstick.webp',
  '/icons/nail-polish.webp',
  '/icons/face-mask.webp',
  '/icons/mirror.webp',
  '/icons/dress.webp',
  '/icons/necklace.webp',
  '/icons/high-heel.webp',
  '/icons/eye-mascara.webp',
  '/icons/tooth-pouch.webp',
  '/icons/face-mask-tube.webp',
  '/icons/hand-nail.webp',
  '/icons/waxing-strips.webp',
  '/icons/serum.webp',
  '/icons/haircut.webp',
  '/icons/mouthwash.webp',
  '/icons/sanitary-pad.webp',
  '/icons/cat.webp',
  '/icons/dog.webp',
  '/icons/pet-bowl.webp',
  '/icons/pet-food-bag.webp',
  '/icons/bone.webp',
  '/icons/collar.webp',
  '/icons/dog-house.webp',
  '/icons/litter-box.webp',
  '/icons/aquarium.webp',
  '/icons/yarn-ball.webp',
  '/icons/pet-shampoo.webp',
  '/icons/lint-roller.webp',
  '/icons/kibble.webp',
  '/icons/nail-clippers.webp',
  '/icons/milk.webp',
  '/icons/pet-food-can.webp',
  '/icons/scratching-post.webp',
  '/icons/pet-carrier.webp',
  '/icons/pet-comb.webp',
  '/icons/stethoscope.webp',
  '/icons/thermometer.webp',
  '/icons/capsule.webp',
  '/icons/syringe.webp',
  '/icons/bandage.webp',
  '/icons/tooth.webp',
  '/icons/ambulance.webp',
  '/icons/hospital-bed.webp',
  '/icons/kidneys.webp',
  '/icons/iv-drip.webp',
  '/icons/pipette.webp',
  '/icons/lungs.webp',
  '/icons/wheelchair.webp',
  '/icons/eye-chart.webp',
  '/icons/clipboard.webp',
  '/icons/crutches.webp',
  '/icons/cane.webp',
  '/icons/love-letter.webp',
  '/icons/wedding-rings.webp',
  '/icons/rose.webp',
  '/icons/chocolate.webp',
  '/icons/candle.webp',
  '/icons/wine-glass.webp',
  '/icons/broken-heart.webp',
  '/icons/heart-gift.webp',
  '/icons/cupcake.webp',
  '/icons/love-chat.webp',
  '/icons/valentine-calendar.webp',
  '/icons/couple-shirts.webp',
  '/icons/wedding-bell.webp',
  '/icons/church.webp',
  '/icons/wedding-cake.webp',
  '/icons/roses-bouquet.webp',
  '/icons/ring-box.webp',
  '/icons/photo-frame.webp',
  '/icons/champagne.webp',
  '/icons/wedding-car.webp',
  '/icons/airplane.webp',
  '/icons/bicycle.webp',
  '/icons/scooter.webp',
  '/icons/taxi.webp',
  '/icons/ticket.webp',
  '/icons/suitcase.webp',
  '/icons/beach.webp',
  '/icons/sailboat.webp',
  '/icons/lifebuoy.webp',
  '/icons/island.webp',
  '/icons/music-player.webp',
  '/icons/bikini.webp',
  '/icons/sun.webp',
  '/icons/flip-flops.webp',
  '/icons/kite.webp',
  '/icons/butterfly.webp',
  '/icons/camper.webp',
  '/icons/starfish.webp',
  '/icons/sunscreen.webp',
  '/icons/sunglasses.webp',
  '/icons/windsurf.webp',
  '/icons/sandcastle.webp',
  '/icons/golf.webp',
  '/icons/popsicle.webp',
  '/icons/compass.webp',
  '/icons/ice-cream.webp',
  '/icons/snorkel.webp',
  '/icons/anchor.webp',
  '/icons/beach-ball.webp',
  '/icons/dolphin.webp',
  '/icons/deck-chair.webp',
  '/icons/beach-umbrella.webp',
  '/icons/dragon-dance.webp',
  '/icons/cable-car.webp',
  '/icons/parking-meter.webp',
  '/icons/petrol-pump.webp',
  '/icons/tow-truck.webp',
  '/icons/delivery-truck.webp',
  '/icons/forklift.webp',
  '/icons/tram.webp',
  '/icons/train.webp',
  '/icons/tuk-tuk.webp',
  '/icons/police-car.webp',
  '/icons/helicopter.webp',
  '/icons/hot-air-balloon.webp',
  '/icons/submarine.webp',
  '/icons/cargo-ship.webp',
  '/icons/ufo.webp',
  '/icons/motorcycle.webp',
  '/icons/fuel-can.webp',
  '/icons/helmet.webp',
  '/icons/car-wash.webp',
  '/icons/piggy-bank.webp',
  '/icons/credit-card.webp',
  '/icons/dollar-bills.webp',
  '/icons/money-sack.webp',
  '/icons/gold-bars.webp',
  '/icons/cash-register.webp',
  '/icons/line-chart.webp',
  '/icons/hand-cash.webp',
  '/icons/coins.webp',
  '/icons/gold-ingot.webp',
  '/icons/red-envelope.webp',
  '/icons/music-note.webp',
  '/icons/microphone.webp',
  '/icons/disco-ball.webp',
  '/icons/party-hat.webp',
  '/icons/balloons.webp',
  '/icons/fireworks.webp',
  '/icons/trophy.webp',
  '/icons/soccer-ball.webp',
  '/icons/party-blower.webp',
  '/icons/masquerade-mask.webp',
  '/icons/bunting.webp',
  '/icons/vinyl-record.webp',
  '/icons/beer-mug.webp',
  '/icons/foam-finger.webp',
  '/icons/soccer-goal.webp',
  '/icons/viking-helmet.webp',
  '/icons/drum.webp',
  '/icons/referee-cards.webp',
  '/icons/jersey.webp',
  '/icons/cleats.webp',
  '/icons/megaphone.webp',
  '/icons/stopwatch.webp',
  '/icons/soccer-field.webp',
  '/icons/air-horn.webp',
  '/icons/cd-disc.webp',
  '/icons/radio.webp',
  '/icons/cocktail.webp',
  '/icons/beer-bottle.webp',
  '/icons/cola-bottle.webp',
  '/icons/christmas-tree.webp',
  '/icons/santa.webp',
  '/icons/snowman.webp',
  '/icons/candy-cane.webp',
  '/icons/gingerbread.webp',
  '/icons/stocking.webp',
  '/icons/bells.webp',
  '/icons/wreath.webp',
  '/icons/sleigh.webp',
  '/icons/snowflake.webp',
  '/icons/santa-belt.webp',
  '/icons/snow-globe.webp',
  '/icons/christmas-calendar.webp',
  '/icons/lollipop.webp',
  '/icons/christmas-card.webp',
  '/icons/bauble.webp',
  '/icons/reindeer.webp',
  '/icons/santa-hat.webp',
  '/icons/fireplace.webp',
  '/icons/star.webp',
  '/icons/mittens.webp',
  '/icons/skis.webp',
  '/icons/ice-skate.webp',
  '/icons/snowy-mountains.webp',
  '/icons/sweater.webp',
  '/icons/winter-hat.webp',
  '/icons/ski-goggles.webp',
  '/icons/radiator.webp',
  '/icons/thermometers.webp',
  '/icons/earmuffs.webp',
  '/icons/winter-boot.webp',
  '/icons/gloves.webp',
  '/icons/gift-boxes.webp',
  '/icons/scarf.webp',
  '/icons/skull.webp',
  '/icons/eyeball.webp',
  '/icons/witch-hat.webp',
  '/icons/cauldron.webp',
  '/icons/ghost.webp',
  '/icons/tombstone.webp',
  '/icons/broom.webp',
  '/icons/mummy.webp',
  '/icons/jack-o-lantern.webp',
  '/icons/black-cat.webp',
  '/icons/potion-flask.webp',
  '/icons/bats.webp',
  '/icons/moose.webp',
  '/icons/roast-turkey.webp',
  '/icons/holly.webp',
  '/icons/firecracker.webp',
  '/icons/lantern.webp',
  '/icons/cherry-blossom.webp',
  '/icons/oil-lamp.webp',
  '/icons/spinning-top.webp',
  '/icons/magnifier.webp',
  '/icons/school-bag.webp',
  '/icons/book.webp',
  '/icons/pencil.webp',
  '/icons/pen.webp',
  '/icons/notebook.webp',
  '/icons/calculator.webp',
  '/icons/globe.webp',
  '/icons/alarm-clock.webp',
  '/icons/graduation-cap.webp',
  '/icons/ink-pen.webp',
  '/icons/telescope.webp',
  '/icons/microscope.webp',
  '/icons/chemistry-flask.webp',
  '/icons/set-square.webp',
  '/icons/eraser.webp',
  '/icons/books-stack.webp',
  '/icons/presentation-board.webp',
  '/icons/palette.webp',
  '/icons/penknife.webp',
  '/icons/windmill.webp',
  '/icons/keyboard.webp',
  '/icons/stapler.webp',
  '/icons/glasses.webp',
  '/icons/building.webp',
  '/icons/certificate.webp',
  '/icons/pencil-ruler.webp',
  '/icons/envelope.webp',
  '/icons/smartphone.webp',
  '/icons/old-phone.webp',
  '/icons/price-tags.webp',
  '/icons/calendar.webp',
  '/icons/browser-window.webp',
  '/icons/server-rack.webp',
  '/icons/floppy-disk.webp',
  '/icons/rabbit.webp',
  '/icons/ox.webp',
  '/icons/tiger.webp',
  '/icons/mouse.webp',
  '/icons/snake.webp',
  '/icons/horse.webp',
  '/icons/goat.webp',
  '/icons/monkey.webp',
  '/icons/chick.webp',
  '/icons/pig.webp',
];

self.addEventListener('install', (event) => {
  // Do NOT skipWaiting() up front: this generation must be
  // complete before it can take over. Any failure rejects the
  // install, and the previous worker (with its complete cache)
  // keeps serving the previous build.
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const res = await fetch('/index.html', { cache: 'no-store' });
      if (!res || !res.ok) {
        throw new Error('Precache: index.html fetch failed');
      }
      const html = await res.text();
      const urls = new Set(PRECACHE_ASSETS);
      // Every hashed asset this build's index.html references.
      const re = /(?:src|href)="([^"]+)"/g;
      let m;
      while ((m = re.exec(html)) !== null) {
        const raw = m[1];
        if (!raw.startsWith('/')) continue;
        const p = raw.split('?')[0].split('#')[0];
        if (p.startsWith('/assets/') && (p.endsWith('.js') || p.endsWith('.css'))) {
          urls.add(p);
        }
      }
      urls.add('/index.html');
      // [v7.6.34] The build-time asset manifest covers EVERY chunk,
      // including lazy views: the app mounts all tab views (hidden)
      // on boot, so every lazy chunk is imported on every boot.
      // index.html alone only references the entry chunks — without
      // the manifest, a lazy chunk never visited online would 408
      // offline and trip the ErrorBoundary on boot.
      const manifestRes = await fetch('/asset-manifest.json', { cache: 'no-store' });
      if (!manifestRes || !manifestRes.ok) {
        throw new Error('Precache: asset-manifest.json fetch failed');
      }
      const manifest = await manifestRes.json();
      if (!Array.isArray(manifest)) {
        throw new Error('Precache: asset-manifest.json is not an array');
      }
      manifest.forEach((name) => {
        if (typeof name === 'string' && (name.endsWith('.js') || name.endsWith('.css'))) {
          urls.add('/' + name.replace(/^\//, ''));
        }
      });
      // addAll is all-or-nothing: one failed asset fails the whole
      // install, so a half-cached generation can never activate.
      await cache.addAll([...urls]);
      await self.skipWaiting();
    })().catch(async (err) => {
      console.warn('Precache failed — keeping the previous build:', err);
      // Drop any partial cache this failed install created, so no
      // half-cached generation lingers under this cache name.
      try { await caches.delete(CACHE_NAME); } catch {}
      throw err;
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('Clearing old service worker cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // [v7.6.51] Skip non-http(s) requests (e.g. chrome-extension://
  // requests from browser extensions): the Cache API rejects them
  // and cache.put throws an uncaught TypeError. Let them pass
  // through to the network untouched (no respondWith).
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // Skip Firebase Auth, Firestore and GCP Cloud live sync calls
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('google')
  ) {
    return;
  }

  // [v7.5.69] Never intercept the version check - /version.json must
  // always reach the network. The Cache-First branch below turns ANY
  // fetch failure into a synthetic 404, and iOS can hang the SW
  // fetch past the app's 5s timeout, so the check reported
  // "HTTP 404" (Android) / "Network timeout (5s)" (iOS) even with a
  // good connection. Returning here (no respondWith) lets the
  // browser fetch it directly from the server.
  if (url.pathname === '/version.json') {
    return;
  }

  // [v7.6.34] Cache-first for the app shell. The active generation
  // is complete by construction (see install), so the cached
  // index.html and its chunks always match. The fetch handler
  // NEVER overwrites the cached index.html: a new build arrives
  // only through a new worker generation, never through a stray
  // network response. A cache miss fetches from the network and
  // caches the result for hashed assets only (immutable by
  // content hash); HTML is never re-cached here.
  const isCodeOrHtml =
    request.mode === 'navigate' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.ts') ||
    url.pathname.endsWith('.tsx') ||
    url.pathname.endsWith('.css') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/assets/');
  const isHtml =
    request.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname.endsWith('.html');

  if (isCodeOrHtml) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request)
          .then((networkResponse) => {
            if (
              networkResponse &&
              networkResponse.status === 200 &&
              !isHtml &&
              url.origin === self.location.origin
            ) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              }).catch(() => {});
            }
            return networkResponse;
          })
          .catch(() => {
            // Fallback to index.html for SPA routing
            if (request.mode === 'navigate') {
              return caches.match('/index.html').then((indexResponse) => {
                if (indexResponse) return indexResponse;
                return new Response('Network error and no cache available', {
                  status: 408,
                  headers: { 'Content-Type': 'text/plain' },
                });
              });
            }
            return new Response('Network error and no cache available', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' },
            });
          });
      })
    );
    return;
  }

  // Cache-First for static assets (images, fonts, icons)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        return new Response('Offline resource not available', {
          status: 404,
          headers: { 'Content-Type': 'text/plain' },
        });
      });
    })
  );
});
