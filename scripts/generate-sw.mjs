// Generates public/firebase-messaging-sw.js from sw/firebase-messaging-sw.template.js,
// substituting Firebase config values from the environment (Vercel dashboard vars,
// or .env.local for local dev). Runs automatically before "dev" and "build"
// (see package.json "predev" / "prebuild" scripts).
import { loadEnv } from 'vite';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// loadEnv merges .env* files with process.env (process.env wins — this is how
// Vercel-provided values reach the script during a Vercel build).
const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const env = loadEnv(mode, root, '');

const KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

const missing = KEYS.filter((k) => !env[k]);
if (missing.length) {
  console.warn(
    `[generate-sw] Missing env vars, service worker will use empty values: ${missing.join(', ')}`,
  );
}

const templatePath = path.join(root, 'sw', 'firebase-messaging-sw.template.js');
let output = readFileSync(templatePath, 'utf-8');

for (const key of KEYS) {
  output = output.replaceAll(`__${key}__`, env[key] ?? '');
}

const publicDir = path.join(root, 'public');
if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true });

writeFileSync(path.join(publicDir, 'firebase-messaging-sw.js'), output);
console.log('[generate-sw] public/firebase-messaging-sw.js generated.');
