/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Lock, ShieldCheck, KeyRound, Loader2 } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase";

/**
 * Login screen — authenticates via Firebase Auth email/password.
 * The account must be created in Firebase Console > Authentication > Users.
 * No props needed: onAuthStateChanged in App.tsx handles the transition.
 */
export default function Login() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError("Invalid credentials. Access denied.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Try again later.");
      } else if (code === "auth/network-request-failed") {
        setError("Network error. Check your connection.");
      } else {
        setError("Authentication failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[#F9FAFB] px-4 relative overflow-hidden">
      {/* Subtle grid accent */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#E2E8F0_1px,transparent_1px),linear-gradient(to_bottom,#E2E8F0_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-[0.4] pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-2xl relative z-10 transition-all duration-300">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center mb-4 text-indigo-600 shadow-sm animate-bounce">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-light tracking-tight text-slate-900">Tojo's Workspace</h1>
          <p className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase tracking-[0.2em]">
            Personal Management System
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              autoComplete="email"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/10 transition-all duration-200"
              required
              autoFocus
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Password
            </label>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors duration-200">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/10 transition-all duration-200"
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-red-600 text-xs font-mono flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 shadow-md font-mono"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Verify &amp; Enter</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 border-t border-slate-100 pt-6 text-center">
          <p className="text-[9px] font-mono text-slate-400 leading-relaxed uppercase tracking-wider font-bold">
            Private Access • {formattedDate}
          </p>
        </div>
      </div>
    </div>
  );
}
