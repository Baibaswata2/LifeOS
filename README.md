# Tojo's Personal Management System (LifeOS)

A personal task, calendar, expense, and archive manager. React + Vite frontend,
Firebase (Auth + Firestore + Cloud Messaging) for data and auth. No backend
server — this is a static SPA that talks to Firebase directly from the browser.

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS v4
- shadcn/ui (Radix primitives)
- Firebase Auth (email/password) + Firestore (real-time sync) + FCM (push notifications)
- Deploys as a static site on Vercel

## 1. Firebase setup

1. Create a project at https://console.firebase.google.com
2. Add a Web App to the project, copy the config values.
3. Enable **Authentication > Sign-in method > Email/Password**.
4. Enable **Firestore Database** (start in production mode) and add security
   rules restricting each user to their own data, e.g.:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /tasks/{taskId} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

   (Tighten further with an `ownerId` field per task if multiple users will
   ever share one project.)

5. (Optional, for push notifications) Enable **Cloud Messaging** and generate
   a **Web Push certificate** (VAPID key) under Project Settings > Cloud Messaging.

## 2. Local development

```bash
npm install
cp .env.example .env.local   # fill in your Firebase values
npm run dev
```

## 3. Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel: **New Project > Import** the GitHub repo. Vercel auto-detects
   Vite (via `vercel.json`) — build command `npm run build`, output `dist`.
3. In **Project Settings > Environment Variables**, add every variable from
   `.env.example` (all `VITE_FIREBASE_*` keys) with your real Firebase values.
   Set them for Production, Preview, and Development as needed.
4. Deploy. Every push to your main branch redeploys automatically.
5. Back in Firebase Console > Authentication > Settings > **Authorized
   domains**, add your Vercel domain (e.g. `your-app.vercel.app`, plus any
   custom domain) so sign-in works from production.

## Notes on push notifications (FCM service worker)

`public/firebase-messaging-sw.js` is **generated, not committed** — it's built
from `sw/firebase-messaging-sw.template.js` by `scripts/generate-sw.mjs`,
which runs automatically before `npm run dev` and `npm run build` (via the
`predev`/`prebuild` npm hooks) and substitutes your `VITE_FIREBASE_*` env vars
into it. This keeps the service worker self-initializing (required by modern
browsers — Firebase must be initialized synchronously when the worker script
first evaluates, not later via `postMessage`), while still sourcing config
from Vercel env vars instead of hardcoding it.

If you ever see a browser console warning like *"Event handler of 'push'
event must be added on the initial evaluation of worker script"*, it means
something is initializing Firebase Messaging lazily in the service worker
again — check `sw/firebase-messaging-sw.template.js`.

## Scripts

- `npm run dev` — local dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build locally
- `npm run typecheck` — TypeScript check, no emit

## Project structure

```
src/
  components/     # feature components (Dashboard, CalendarView, ExpenseTracker, ...)
  components/ui/  # shadcn/ui primitives
  hooks/          # useToast, useMobile
  lib/            # firebase.ts (init), db.ts (Firestore data layer), notifications.ts (FCM)
  pages/          # not-found.tsx
  types.ts        # shared types/enums
public/
  firebase-messaging-sw.js  # FCM background service worker
```
