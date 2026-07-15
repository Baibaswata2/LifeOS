/**
 * Firebase Cloud Messaging Service Worker
 *
 * This file MUST live at the root of your public/ directory so the browser
 * can register it at scope "/".
 *
 * The Firebase config is NOT hardcoded here — it is posted from the main
 * app via a 'FIREBASE_INIT' message to avoid leaking values into source control.
 * (VITE_ env vars are already public client-side values, but keeping them out
 * of the SW source makes the deployment pipeline cleaner.)
 */

importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

let messagingInitialized = false;

self.addEventListener("message", (event) => {
  if (event.data?.type === "FIREBASE_INIT" && !messagingInitialized) {
    messagingInitialized = true;

    if (!firebase.apps.length) {
      firebase.initializeApp(event.data.config);
    }

    const messaging = firebase.messaging();

    // Handle background / closed-tab push messages
    messaging.onBackgroundMessage((payload) => {
      const title = payload.notification?.title ?? "Tojo PMS";
      const body  = payload.notification?.body  ?? "";
      const icon  = payload.notification?.icon  ?? "/favicon.svg";

      self.registration.showNotification(title, {
        body,
        icon,
        badge: "/favicon.svg",
        tag:   payload.collapseKey ?? "tojo-pms-bg",
        data:  payload.data,
      });
    });
  }
});

// Allow the new SW to activate immediately without waiting for old tabs to close
self.addEventListener("install",  () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
