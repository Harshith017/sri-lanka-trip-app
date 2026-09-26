/* Project W service worker — only shows push notifications and opens the
   app when one is tapped. It deliberately has no fetch handler, so it never
   caches pages and can't serve a stale app. */

self.addEventListener("install", function(){ self.skipWaiting(); });
self.addEventListener("activate", function(e){ e.waitUntil(self.clients.claim()); });

self.addEventListener("push", function(e){
  var d = {};
  try{ d = e.data ? e.data.json() : {}; }catch(err){ d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Project W", {
    body: d.body || "",
    icon: "icon-192.png",
    badge: "icon-192.png",
    tag: d.tag || undefined,
    renotify: !!d.tag,
    data: { tab: d.tab || "" }
  }));
});

self.addEventListener("notificationclick", function(e){
  e.notification.close();
  var tab = (e.notification.data && e.notification.data.tab) || "";
  var url = new URL(tab ? "./#" + tab : "./", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type:"window", includeUncontrolled:true }).then(function(list){
    for(var i=0;i<list.length;i++){
      if("focus" in list[i]){
        list[i].postMessage({ type:"open-tab", tab: tab });
        return list[i].focus();
      }
    }
    return self.clients.openWindow(url);
  }));
});
