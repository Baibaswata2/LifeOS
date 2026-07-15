/**
 * Push Notification helpers using Firebase Cloud Messaging (FCM).
 *
 * How it works:
 *  1. The browser registers the service worker at /firebase-messaging-sw.js
 *  2. We request Notification permission from the user
 *  3. We post the Firebase config to the SW so it can init FCM
 *  4. We retrieve the FCM registration token (stored / sent to your backend if needed)
 *  5. Foreground messages are shown as native Notifications
 *
 * Prerequisites (Vercel env vars):
 *   VITE_FIREBASE_VAPID_KEY — from Firebase Console > Project Settings >
 *                              Cloud Messaging > Web Push certificates
 */

import { getToken, onMessage, type MessagePayload } from "firebase/messaging";
import { getFirebaseMessaging } from "./firebase";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

/** Sends the Firebase config to the service worker so it can handle background messages. */
const sendConfigToSW = async (reg: ServiceWorkerRegistration) => {
  const config = {
    apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  };
  reg.active?.postMessage({ type: "FIREBASE_INIT", config });
};

/**
 * Registers the FCM service worker, requests Notification permission,
 * and returns the FCM token (or null if unavailable / denied).
 *
 * Call this once after the user logs in.
 */
export const initPushNotifications = async (): Promise<string | null> => {
  try {
    if (!("serviceWorker" in navigator) || !("Notification" in window)) {
      console.info("[FCM] Push notifications not supported in this browser.");
      return null;
    }

    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      console.info("[FCM] Firebase Messaging not supported.");
      return null;
    }

    // Register / reuse the FCM service worker
    const reg = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
      { scope: "/" },
    );
    await sendConfigToSW(reg);

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.info("[FCM] Notification permission denied.");
      return null;
    }

    if (!VAPID_KEY) {
      console.warn("[FCM] VITE_FIREBASE_VAPID_KEY is not set — token retrieval skipped.");
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: reg,
    });

    console.info("[FCM] Token obtained:", token.slice(0, 20) + "…");
    return token;
  } catch (err) {
    console.error("[FCM] initPushNotifications error:", err);
    return null;
  }
};

/**
 * Listen for foreground FCM messages and show a native Notification.
 * Returns a cleanup function — call it on unmount.
 */
export const listenForForegroundMessages = async (
  onReceived?: (payload: MessagePayload) => void,
): Promise<() => void> => {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return () => {};

  const unsub = onMessage(messaging, (payload) => {
    // Show a native notification when the app is in the foreground
    if (Notification.permission === "granted") {
      const title = payload.notification?.title ?? "Tojo PMS";
      const body  = payload.notification?.body  ?? "";
      new Notification(title, {
        body,
        icon:             "/favicon.svg",
        badge:            "/favicon.svg",
        tag:              payload.collapseKey ?? "tojo-pms-fg",
        requireInteraction: true,
      });
    }
    onReceived?.(payload);
  });

  return unsub;
};

/**
 * Schedules a local (non-FCM) browser notification for a task reminder.
 * Used by the in-app reminder loop in App.tsx.
 */
export const showTaskReminder = (title: string, body: string, tag: string) => {
  if (Notification.permission !== "granted") return;
  new Notification(`Tojo's Schedule: ${title}`, {
    body,
    icon:             "/favicon.svg",
    tag:              `task-reminder-${tag}`,
    requireInteraction: true,
  });
};
