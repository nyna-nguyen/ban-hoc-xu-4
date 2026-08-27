/* Bàn học của Nyna — offline service worker (v2).
   HTML documents: NETWORK-FIRST — when online you always get the newest build
   on the very first load; the cached copy is used only when offline.
   Icons/manifest/fonts: cache-first with background refresh. */
var CACHE = 'ban-hoc-v2';
var FILES = [
  './Ban_hoc.html',
  './Math_Xu_4.html',
  './Science_4.html',
  './ESL_Xu_4.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(FILES); }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE && k !== CACHE + '-fonts'; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);

  if(url.origin === location.origin){
    var isDoc = req.mode === 'navigate' || /\.html$/.test(url.pathname) || url.pathname.slice(-1) === '/';
    if(isDoc){
      /* network-first with cache fallback */
      e.respondWith(
        fetch(url.href, { cache: 'no-cache', credentials: 'same-origin' }).then(function(res){
          if(res && res.ok){
            var copy = res.clone();
            caches.open(CACHE).then(function(c){ c.put(req, copy); });
          }
          return res;
        }).catch(function(){
          return caches.open(CACHE).then(function(c){
            return c.match(req, {ignoreSearch: true}).then(function(hit){
              return hit || c.match('./Ban_hoc.html');
            });
          });
        })
      );
      return;
    }
    /* other same-origin assets: cache-first + background refresh */
    e.respondWith(
      caches.open(CACHE).then(function(c){
        return c.match(req, {ignoreSearch: true}).then(function(cached){
          var fetching = fetch(req).then(function(res){
            if(res && res.ok) c.put(req, res.clone());
            return res;
          }).catch(function(){ return cached; });
          return cached || fetching;
        });
      })
    );
  } else if(/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)){
    e.respondWith(
      caches.open(CACHE + '-fonts').then(function(c){
        return c.match(req).then(function(cached){
          var fetching = fetch(req).then(function(res){
            if(res && res.ok) c.put(req, res.clone());
            return res;
          }).catch(function(){ return cached; });
          return cached || fetching;
        });
      })
    );
  }
});
