/**
 * Firebase Cloud Messaging Service Worker
 *
 * IMPORTANT: this is a TEMPLATE. The real file served at "/firebase-messaging-sw.js"
 * is generated into public/ at build/dev time by scripts/generate-sw.mjs, which
 * substitutes the __VITE_FIREBASE_*__ placeholders below with the values from your
 * environment variables (set in Vercel Dashboard > Project Settings > Environment
 * Variables, or in .env.local for local dev).
 *
 * Firebase must be initialized synchronously during the SW's initial script
 * evaluation — not later, in response to a "message" event — or the browser
 * will warn that the push / pushsubscriptionchange / notificationclick handlers
 * were registered too late and background pushes may not be delivered reliably.
 *
 * These config values are not secrets: they identify your Firebase project and
 * are already visible in your client bundle. Access is controlled by Firestore
 * Security Rules and API key restrictions, not by hiding this config.
 */

importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "__VITE_FIREBASE_API_KEY__",
  authDomain: "__VITE_FIREBASE_AUTH_DOMAIN__",
  projectId: "__VITE_FIREBASE_PROJECT_ID__",
  storageBucket: "__VITE_FIREBASE_STORAGE_BUCKET__",
  messagingSenderId: "__VITE_FIREBASE_MESSAGING_SENDER_ID__",
  appId: "__VITE_FIREBASE_APP_ID__",
});

const messaging = firebase.messaging();

// Handle background / closed-tab push messages
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? "Tojo PMS";
  const body = payload.notification?.body ?? "";
  const icon = payload.notification?.icon ?? "/favicon.svg";

  self.registration.showNotification(title, {
    body,
    icon,
    badge: "/favicon.svg",
    tag: payload.collapseKey ?? "tojo-pms-bg",
    data: payload.data,
  });
});

// Allow the new SW to activate immediately without waiting for old tabs to close
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
