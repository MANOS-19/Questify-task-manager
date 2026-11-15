self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Receive push notifications
self.addEventListener("push", (event) => {
  let payload = {
    title: "Questify",
    body: "You have a task reminder!",
    url: "/"
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch (error) {
      console.error("Invalid notification payload:", error);
    }
  }

  const options = {
    body: payload.body,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: {
      url: payload.url || "/"
    }
  };

  event.waitUntil(
    self.registration.showNotification(
      payload.title || "Questify",
      options
    )
  );
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      let targetUrl = new URL(
        event.notification.data?.url || "/",
        self.location.origin
      );

      if (targetUrl.origin !== self.location.origin) {
        targetUrl = new URL("/", self.location.origin);
      }

      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true
      });

      const existingWindow = windows.find(
        (client) => new URL(client.url).origin === self.location.origin
      );

      if (existingWindow) {
        await existingWindow.navigate(targetUrl.href);
        return existingWindow.focus();
      }

      return self.clients.openWindow(targetUrl.href);
    })()
  );
});