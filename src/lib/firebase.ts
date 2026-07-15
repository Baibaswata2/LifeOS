// src/lib/firebase.ts
// Firebase is configured via environment variables — never hardcode values here.
// Set these in Vercel Dashboard > Project Settings > Environment Variables,
// or locally in a .env.local file (never commit that file).

import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
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
export const db  = getFirestore(app);
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
