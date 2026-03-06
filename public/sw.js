self.addEventListener("push", (event) => {
    console.log("[SW] push event received", event);

    let data = { title: "Hotaru 蛍", body: "近くに蛍がいます", url: "/map" };
    try {
        data = Object.assign(data, event.data?.json());
    } catch (e) {
        console.error("[SW] push data parse error", e);
    }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: "/icons/hotaru.png",
            badge: "/icons/hotaru.png",
            data: { url: data.url || "/map" },
        })
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const url = event.notification.data?.url || "/map";
    event.waitUntil(
        clients.matchAll({ type: "window" }).then((windowClients) => {
            for (const client of windowClients) {
                if (client.url.includes(url) && "focus" in client) return client.focus();
            }
            return clients.openWindow(url);
        })
    );
});
