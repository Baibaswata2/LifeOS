// src/lib/firebase.ts
// Firebase is configured via environment variables — never hardcode values here.
// Set these in Vercel Dashboard > Project Settings > Environment Variables,
// or locally in a .env.local file (never commit that file).

import { initializeApp, getApps } from "firebase/app";
import { initializeFirestore, getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Prevent duplicate initialization during hot-reload
export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// ignoreUndefinedProperties: optional task fields (expenseAmount, reminderTimeBefore, etc.)
// are frequently `undefined` rather than omitted — Firestore rejects `undefined` by default,
// so without this every setDoc() on a task missing an optional field throws.
export const db = (() => {
  try {
    return initializeFirestore(app, { ignoreUndefinedProperties: true });
  } catch {
    // initializeFirestore throws if Firestore was already initialized for this app
    // (e.g. hot-reload) — fall back to the existing instance.
    return getFirestore(app);
  }
})();

export const auth = getAuth(app);

/** Returns the Messaging instance only in browsers that support FCM, null otherwise. */
export const getFirebaseMessaging = async () => {
  try {
    const supported = await isSupported();
    if (!supported) return null;
    return getMessaging(app);
  } catch {
    return null;
  }
};
