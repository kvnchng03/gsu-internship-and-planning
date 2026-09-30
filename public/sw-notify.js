// Opens (or focuses) the app when a deadline notification is tapped
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = self.registration.scope;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) if (c.url.startsWith(url) && "focus" in c) return c.focus();
    return self.clients.openWindow(url);
  }));
});
