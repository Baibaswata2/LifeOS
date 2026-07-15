/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ShieldCheck, LayoutDashboard, Calendar as CalendarIcon, DollarSign,
  Archive, LogOut, Settings, Copy, Check, Upload, ShieldAlert, X,
} from "lucide-react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "./lib/firebase";
import {
  subscribeToTasks, seedIfEmpty, syncTasksToFirestore,
  saveTaskToFirestore, deleteTaskFromFirestore,
} from "./lib/db";
import { initPushNotifications, listenForForegroundMessages, showTaskReminder } from "./lib/notifications";
import { Task, TaskStatus } from "./types";

// Components
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import CalendarView from "./components/CalendarView";
import ExpenseTracker from "./components/ExpenseTracker";
import ArchiveBrowser from "./components/ArchiveBrowser";
import TaskForm from "./components/TaskForm";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "calendar" | "expenses" | "archive">("dashboard");
  const [tasks, setTasks] = useState<Task[]>([]);
  const tasksRef = useRef<Task[]>([]);

  // Modals
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Backup/Restore
  const [backupString, setBackupString] = useState("");
  const [importString, setImportString] = useState("");
  const [copied, setCopied] = useState(false);
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  // Keep ref in sync with state (avoids stale closures in callbacks)
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  // ── Firebase Auth state listener ──────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // ── Firestore real-time subscription (runs when user is authenticated) ────
  useEffect(() => {
    if (!user) return;

    let unsubFirestore: (() => void) | undefined;

    // Seed on first login, then subscribe
    seedIfEmpty().then(() => {
      unsubFirestore = subscribeToTasks((firestoreTasks) => {
        setTasks(firestoreTasks);
      });
    });

    // Push notification setup (best-effort)
    initPushNotifications().catch(() => {});
    let cleanupFCM: (() => void) | undefined;
    listenForForegroundMessages().then((fn) => { cleanupFCM = fn; });

    return () => {
      unsubFirestore?.();
      cleanupFCM?.();
    };
  }, [user]);

  // ── In-app reminder loop ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      if (Notification.permission !== "granted") return;

      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];

      const updated: Task[] = [];
      let changed = false;

      tasksRef.current.forEach((task) => {
        if (
          task.status === TaskStatus.INCOMPLETE &&
          task.startDate === todayStr &&
          task.startTime &&
          task.reminderTimeBefore !== undefined &&
          !task.reminderSent
        ) {
          const [h, m] = task.startTime.split(":").map(Number);
          const taskMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m).getTime();
          const remindMs = taskMs - task.reminderTimeBefore * 60_000;

          if (Date.now() >= remindMs) {
            const body =
              task.reminderTimeBefore > 0
                ? `Starts in ${task.reminderTimeBefore} minutes at ${task.startTime}!`
                : `Started at ${task.startTime}. Prioritize high stress items.`;

            showTaskReminder(task.title, body, task.id);
            updated.push({ ...task, reminderSent: true });
            changed = true;
            return;
          }
        }
        updated.push(task);
      });

      if (changed) {
        setTasks(updated);
        // Persist only the changed tasks
        const changedTasks = updated.filter(
          (t, i) => t.reminderSent && !tasksRef.current[i]?.reminderSent,
        );
        changedTasks.forEach((t) => saveTaskToFirestore(t).catch(console.error));
      }
    }, 15_000);

    return () => clearInterval(interval);
  }, [user]);

  // ── Auth handlers ─────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await signOut(auth);
    setTasks([]);
    setActiveTab("dashboard");
    setIsSettingsOpen(false);
  };

  // ── Task persistence helpers ──────────────────────────────────────────────

  /**
   * Called when TaskForm saves a single task.
   * Optimistic update → Firestore write in background.
   */
  const handleSaveTask = useCallback((savedTask: Task) => {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === savedTask.id);
      if (idx >= 0) {
        // Preserve immutable stress level
        const next = [...prev];
        next[idx] = { ...savedTask, stressLevel: prev[idx].stressLevel };
        return next;
      }
      return [...prev, savedTask];
    });
    saveTaskToFirestore(savedTask).catch(console.error);
    setIsTaskFormOpen(false);
    setTaskToEdit(null);
  }, []);

  /**
   * Called when Dashboard / CalendarView produces a new full task list.
   * Diffs against current state → batch-writes only what changed.
   */
  const handleTasksUpdated = useCallback((newTasks: Task[]) => {
    const prev = tasksRef.current;
    setTasks(newTasks);

    // Diff: find added / modified tasks
    const prevMap = new Map(prev.map((t) => [t.id, t]));
    const newMap  = new Map(newTasks.map((t) => [t.id, t]));

    const toWrite: Task[]    = [];
    const toDelete: string[] = [];

    newTasks.forEach((t) => {
      const p = prevMap.get(t.id);
      if (!p || JSON.stringify(p) !== JSON.stringify(t)) toWrite.push(t);
    });

    prev.forEach((t) => {
      if (!newMap.has(t.id)) toDelete.push(t.id);
    });

    if (toWrite.length || toDelete.length) {
      syncTasksToFirestore(toWrite, toDelete).catch(console.error);
    }
  }, []);

  const handleEditTaskTrigger = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskFormOpen(true);
  };

  // ── Backup / Restore ──────────────────────────────────────────────────────
  const generateBackup = () => {
    setBackupString(JSON.stringify({ tasks: tasksRef.current, timestamp: Date.now() }, null, 2));
    setImportString("");
    setImportSuccess(false);
    setImportError("");
  };

  const copyBackupToClipboard = () => {
    if (!backupString) return;
    navigator.clipboard.writeText(backupString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImportBackup = async () => {
    if (!importString.trim()) return;
    setImportError("");
    setImportSuccess(false);
    setImportLoading(true);

    try {
      const parsed = JSON.parse(importString);
      if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
        throw new Error("Invalid format. Missing task collection.");
      }

      const incoming: Task[] = parsed.tasks;

      // Delete tasks that are no longer in the backup
      const existingIds = new Set(tasksRef.current.map((t) => t.id));
      const incomingIds = new Set(incoming.map((t: Task) => t.id));
      const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));

      await syncTasksToFirestore(incoming, toDelete);
      // onSnapshot will update local state automatically
      setImportSuccess(true);
      setImportString("");
    } catch (e: unknown) {
      setImportError(
        e instanceof Error ? e.message : "Failed to parse backup JSON.",
      );
    } finally {
      setImportLoading(false);
    }
  };

  const archiveCount = tasks.filter((t) => t.status === TaskStatus.ARCHIVED).length;

  // ── Render guards ─────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#0A0A0A]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest">
            Connecting…
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#0A0A0A] text-white font-sans antialiased overflow-x-hidden">

      {/* Top accent line */}
      <div className="h-[2px] w-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0A0A0A]/80 border-b border-neutral-900 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Branding */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-white block tracking-widest leading-none uppercase">
                  Tojo.PMS
                </span>
                <span className="text-[9px] font-mono text-emerald-500/80 uppercase tracking-widest">
                  Secure Space
                </span>
              </div>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1.5 bg-neutral-900/50 p-1.5 border border-neutral-800 rounded-xl shadow-sm">
              {(["dashboard", "calendar", "expenses", "archive"] as const).map((tab) => {
                const labels: Record<string, string> = {
                  dashboard: "Deck",
                  calendar:  "Calendar",
                  expenses:  "Ledger",
                  archive:   "Vault",
                };
                const Icons: Record<string, React.ElementType> = {
                  dashboard: LayoutDashboard,
                  calendar:  CalendarIcon,
                  expenses:  DollarSign,
                  archive:   Archive,
                };
                const Icon = Icons[tab];
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all duration-200 cursor-pointer ${
                      activeTab === tab
                        ? "bg-neutral-800 text-emerald-400 border border-neutral-700 shadow-sm"
                        : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 border border-transparent"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{labels[tab]}</span>
                    {tab === "archive" && archiveCount > 0 && (
                      <span className="ml-1 bg-neutral-950 text-neutral-400 text-[9px] px-1.5 py-0.5 rounded border border-neutral-800">
                        {archiveCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => { generateBackup(); setIsSettingsOpen(true); }}
                className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer border border-transparent"
                title="System settings & backups"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer border border-transparent"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        <nav className="md:hidden flex items-center overflow-x-auto gap-2 px-4 py-3 bg-[#0A0A0A] border-b border-neutral-900 custom-scrollbar">
          {(["dashboard", "calendar", "expenses", "archive"] as const).map((tab) => {
            const labels: Record<string, string> = {
              dashboard: "Deck",
              calendar:  "Calendar",
              expenses:  "Ledger",
              archive:   "Vault",
            };
            const Icons: Record<string, React.ElementType> = {
              dashboard: LayoutDashboard,
              calendar:  CalendarIcon,
              expenses:  DollarSign,
              archive:   Archive,
            };
            const Icon = Icons[tab];
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-2 whitespace-nowrap transition-all duration-200 ${
                  activeTab === tab
                    ? "bg-neutral-800 text-emerald-400 border border-neutral-700"
                    : "bg-neutral-900 text-neutral-400 border border-neutral-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                {labels[tab]}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {activeTab === "dashboard" && (
          <Dashboard
            tasks={tasks}
            onTasksUpdated={handleTasksUpdated}
            onEditTask={handleEditTaskTrigger}
            onOpenNewTaskForm={() => { setTaskToEdit(null); setIsTaskFormOpen(true); }}
          />
        )}
        {activeTab === "calendar"  && <CalendarView tasks={tasks} onTasksUpdated={handleTasksUpdated} />}
        {activeTab === "expenses"  && <ExpenseTracker tasks={tasks} />}
        {activeTab === "archive"   && <ArchiveBrowser tasks={tasks} />}
      </main>

      {/* Task Form Modal */}
      {isTaskFormOpen && (
        <TaskForm
          taskToEdit={taskToEdit}
          allTasks={tasks}
          onSave={handleSaveTask}
          onClose={() => { setIsTaskFormOpen(false); setTaskToEdit(null); }}
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-6">

            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-bold font-mono uppercase tracking-widest text-white">
                  System Settings
                </h3>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-neutral-500 hover:text-white transition-colors p-2 hover:bg-neutral-800 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">

              {/* Export */}
              <div className="space-y-3">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300 block">
                  Export Workspace Ledger
                </span>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Download a full JSON snapshot of your tasks and ledger history.
                </p>
                <div className="relative group">
                  <textarea
                    readOnly
                    value={backupString}
                    rows={4}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-[10px] font-mono text-neutral-500 focus:outline-none resize-none transition-colors group-hover:border-neutral-700"
                  />
                  <button
                    onClick={copyBackupToClipboard}
                    className="absolute bottom-3 right-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copied" : "Copy JSON"}</span>
                  </button>
                </div>
              </div>

              {/* Import */}
              <div className="space-y-3 pt-5 border-t border-neutral-800">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300 block">
                  Import / Restore Backup
                </span>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Paste a previously exported JSON. This will overwrite your current Firestore data.
                </p>
                <textarea
                  value={importString}
                  onChange={(e) => setImportString(e.target.value)}
                  placeholder="Paste backup JSON block here..."
                  rows={3}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-[10px] font-mono text-neutral-300 focus:outline-none focus:border-emerald-500/50 resize-none transition-colors"
                />
                {importError && (
                  <div className="text-red-400 text-[11px] font-mono p-3 bg-red-500/5 border border-red-500/20 rounded-lg flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{importError}</span>
                  </div>
                )}
                {importSuccess && (
                  <div className="text-emerald-400 text-[11px] font-mono p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg flex items-center gap-2">
                    <Check className="w-4 h-4" /> Backup restored — Firestore updated.
                  </div>
                )}
                <button
                  onClick={handleImportBackup}
                  disabled={!importString.trim() || importLoading}
                  className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-mono font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-colors shadow-sm"
                >
                  {importLoading ? (
                    <div className="w-4 h-4 border-2 border-neutral-400/30 border-t-neutral-200 rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span>{importLoading ? "Restoring…" : "Restore Data Block"}</span>
                </button>
              </div>

              {/* Info */}
              <div className="pt-5 border-t border-neutral-800 text-[10px] font-mono text-neutral-600 uppercase leading-relaxed space-y-1.5">
                <div>Client: {user.email}</div>
                <div>Auth: Firebase Auth (email/password)</div>
                <div>Storage: Firestore (real-time sync)</div>
                <div className="text-emerald-500/80">Node: Active</div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
