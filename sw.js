/* Project W offline support.
   - The app's own files: network first (so updates show up straight away),
     falling back to the saved copy when there's no signal.
   - Firebase SDK, fonts and the receipt scanner: saved the first time they
     load, then served from the phone.
   - Firestore, Google sign-in and exchange rates are never touched here —
     Firestore has its own offline cache and the app caches rates itself. */
var VERSION = "pw-v1";
var APP_CACHE = VERSION + "-app";
var LIB_CACHE = "pw-libs-v1";
// Caches are shared with other apps on this github.io address, so only ever
// touch the ones that start with "pw-".

var APP_FILES = ["./", "index.html", "app.js", "firebase-config.js", "manifest.json",
                 "icon-192.png", "icon-180.png", "icon-512.png", "favicon.png"];
var LIB_FILES = [
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth-compat.js",
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore-compat.js"
];

self.addEventListener("install", function(e){
  e.waitUntil(Promise.all([
    caches.open(APP_CACHE).then(function(c){ return c.addAll(APP_FILES); }),
    caches.open(LIB_CACHE).then(function(c){
      return Promise.all(LIB_FILES.map(function(u){
        return fetch(u, { mode:"no-cors" }).then(function(r){ return c.put(u, r); }).catch(function(){});
      }));
    })
  ]).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k.indexOf("pw-") === 0 && k !== APP_CACHE && k !== LIB_CACHE; })
      .map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

function isLib(url){
  return (url.hostname === "www.gstatic.com" && url.pathname.indexOf("/firebasejs/") === 0) ||
         url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com" ||
         url.hostname === "tessdata.projectnaptha.com" ||
         (url.hostname === "cdn.jsdelivr.net" && /\/npm\/tesseract/.test(url.pathname)) ||
         (url.hostname === "unpkg.com" && /tesseract/.test(url.pathname));
}

/** Network first with a time limit; the saved copy when offline or slow. */
function networkFirst(req){
  return caches.open(APP_CACHE).then(function(cache){
    return new Promise(function(resolve){
      var done = false;
      function fromCache(){
        return cache.match(req, { ignoreSearch:true }).then(function(hit){
          if(hit) return hit;
          return req.mode === "navigate" ? cache.match("index.html") : null;
        });
      }
      var timer = setTimeout(function(){
        fromCache().then(function(hit){ if(hit && !done){ done = true; resolve(hit); } });
      }, 3500);
      var url = new URL(req.url), key = url.origin + url.pathname;   // one copy per file, whatever the ?query
      fetch(req, { cache:"no-cache" }).then(function(res){
        if(res && res.ok && res.type === "basic") cache.put(key, res.clone());
        if(!done){ done = true; clearTimeout(timer); resolve(res); }
      }).catch(function(){
        fromCache().then(function(hit){
          if(!done){ done = true; clearTimeout(timer); resolve(hit || Response.error()); }
        });
      });
    });
  });
}

function cacheFirst(req){
  return caches.open(LIB_CACHE).then(function(cache){
    return cache.match(req).then(function(hit){
      if(hit) return hit;
      return fetch(req).then(function(res){
        if(res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
        return res;
      });
    });
  });
}

self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;
  var url = new URL(req.url);
  if(url.origin === self.location.origin){
    if(url.pathname.indexOf("/__/") >= 0) return;   // Firebase auth helper pages
    e.respondWith(networkFirst(req));
  } else if(isLib(url)){
    e.respondWith(cacheFirst(req));
  }
});
