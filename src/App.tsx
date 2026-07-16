/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ShieldCheck, LayoutDashboard, Calendar as CalendarIcon, DollarSign,
  Archive, LogOut, Settings, Copy, Check, Upload, ShieldAlert, X,
  Info
} from "lucide-react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "./lib/firebase";
import {
  subscribeToTasks, seedIfEmpty, syncTasksToFirestore,
  saveTaskToFirestore, deleteTaskFromFirestore, autoTransferOverdueTasks,
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
import TaskDetailPage from "./components/TaskDetailPage";

// Interface for action dialog
interface ActionDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  status: "loading" | "success";
  progress: number;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "calendar" | "expenses" | "archive">("dashboard");
  const [tasks, setTasks] = useState<Task[]>([]);
  const tasksRef = useRef<Task[]>([]);

  // Dedicated Detailed Task Page State
  const [activeTaskDetail, setActiveTaskDetail] = useState<Task | null>(null);

  // Global Action Notification Dialog State
  const [actionState, setActionState] = useState<ActionDialogState>({
    isOpen: false,
    title: "",
    message: "",
    status: "loading",
    progress: 0,
  });

  // Global In-app Notifications State (Fallback for iframe block)
  const [inAppNotification, setInAppNotification] = useState<{
    isOpen: boolean;
    title: string;
    body: string;
  }>({
    isOpen: false,
    title: "",
    body: "",
  });

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

  // Keep active task detail in sync with tasks list so it updates in real time!
  useEffect(() => {
    if (activeTaskDetail) {
      const updated = tasks.find((t) => t.id === activeTaskDetail.id);
      if (updated) {
        setActiveTaskDetail(updated);
      } else {
        setActiveTaskDetail(null);
      }
    }
  }, [tasks]);

  // Unified Action triggering wrapper with Loading & Progress Bar (Requirement 2)
  const triggerAction = useCallback(async (
    title: string,
    successMessage: string,
    actionFn: () => Promise<void> | void
  ) => {
    setActionState({
      isOpen: true,
      title: title,
      message: "Synchronizing with secure database...",
      status: "loading",
      progress: 0,
    });

    // Simulate progress loop for high quality visual loading
    const interval = setInterval(() => {
      setActionState((prev) => {
        if (prev.progress >= 90) {
          clearInterval(interval);
          return prev;
        }
        return { ...prev, progress: prev.progress + 15 };
      });
    }, 100);

    try {
      await actionFn();
      clearInterval(interval);
      setActionState({
        isOpen: true,
        title: "Database Updated",
        message: successMessage,
        status: "success",
        progress: 100,
      });

      // Auto close after 2.5 seconds
      setTimeout(() => {
        setActionState((prev) => {
          if (prev.message === successMessage) {
            return { ...prev, isOpen: false };
          }
          return prev;
        });
      }, 2500);
    } catch (err) {
      clearInterval(interval);
      setActionState({
        isOpen: true,
        title: "System Error",
        message: err instanceof Error ? err.message : "Database synchronization failed.",
        status: "success", // Show error feedback
        progress: 100,
      });
    }
  }, []);

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
        // Requirement 1: Auto-transfer overdue incomplete tasks to today's date
        const { updatedTasks, didChange } = autoTransferOverdueTasks(firestoreTasks);
        if (didChange) {
          setTasks(updatedTasks);
          // Sync changes back to firestore
          const toWrite = updatedTasks.filter(
            (t, idx) => JSON.stringify(t) !== JSON.stringify(firestoreTasks[idx])
          );
          syncTasksToFirestore(toWrite).catch(console.error);
        } else {
          setTasks(firestoreTasks);
        }
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

  // ── In-app reminder loop (Requirement 3: Fix notification timezone issue) ──────────────────
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      const now = new Date();
      // FIX: Use timezone-safe local date string instead of UTC-based toISOString
      const getLocalDateStr = (d: Date) => {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      };
      const todayStr = getLocalDateStr(now);

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

            // Trigger both browser native notification and our fallback in-app alert!
            showTaskReminder(task.title, body, task.id);
            
            // Trigger beautiful in-app slide-in banner
            setInAppNotification({
              isOpen: true,
              title: task.title,
              body: body,
            });

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
    setActiveTaskDetail(null);
  };

  // ── Task persistence helpers ──────────────────────────────────────────────

  /**
   * Called when TaskForm saves a single task.
   */
  const handleSaveTask = useCallback((savedTask: Task) => {
    const isNew = !tasksRef.current.some(t => t.id === savedTask.id);
    const actionName = isNew ? "Creating Task" : "Saving Task";
    const successMsg = isNew 
      ? `Your Task titled "${savedTask.title}" has been created`
      : `Your Task titled "${savedTask.title}" has been saved`;

    triggerAction(actionName, successMsg, async () => {
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
      await saveTaskToFirestore(savedTask);
    });
    setIsTaskFormOpen(false);
    setTaskToEdit(null);
  }, [triggerAction]);

  /**
   * Called when Dashboard / CalendarView produces a new full task list.
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

  if (authLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#F9FAF8]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest">
            Connecting Security Node…
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#F9FAF8] text-neutral-800 font-sans antialiased overflow-x-hidden">

      {/* Top beautiful light sage accent line */}
      <div className="h-[2.5px] w-full bg-emerald-600/80 shadow-[0_1px_4px_rgba(16,185,129,0.2)]" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#F9FAF8]/90 border-b border-neutral-200/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Branding */}
            <div 
              onClick={() => { setActiveTaskDetail(null); setActiveTab("dashboard"); }}
              className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
            >
              <div className="w-9 h-9 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-neutral-800 block tracking-widest leading-none uppercase">
                  Tojo.PMS
                </span>
                <span className="text-[9px] font-mono text-emerald-600 font-bold uppercase tracking-widest mt-0.5 block">
                  Secure Space
                </span>
              </div>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1.5 bg-neutral-100 p-1 border border-neutral-200/70 rounded-xl shadow-inner">
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
                    onClick={() => { setActiveTaskDetail(null); setActiveTab(tab); }}
                    className={`px-4 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all duration-200 cursor-pointer ${
                      activeTab === tab && !activeTaskDetail
                        ? "bg-white text-emerald-700 border border-neutral-200 shadow-sm font-semibold"
                        : "text-neutral-500 hover:text-neutral-800 hover:bg-white/40 border border-transparent"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{labels[tab]}</span>
                    {tab === "archive" && archiveCount > 0 && (
                      <span className="ml-1 bg-neutral-200 text-neutral-600 text-[9px] px-1.5 py-0.5 rounded border border-neutral-300 font-bold font-mono">
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
                className="p-2 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer border border-transparent"
                title="System settings & backups"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer border border-transparent"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        <nav className="md:hidden flex items-center overflow-x-auto gap-2 px-4 py-3 bg-[#F9FAF8] border-b border-neutral-200 custom-scrollbar">
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
                onClick={() => { setActiveTaskDetail(null); setActiveTab(tab); }}
                className={`px-4 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-2 whitespace-nowrap transition-all duration-200 ${
                  activeTab === tab && !activeTaskDetail
                    ? "bg-white text-emerald-700 border border-neutral-250 shadow-sm font-semibold"
                    : "bg-neutral-100 text-neutral-500 border border-neutral-200"
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
        {/* Requirement 4: Dedicated Task Details Page View */}
        {activeTaskDetail ? (
          <TaskDetailPage
            task={activeTaskDetail}
            onClose={() => setActiveTaskDetail(null)}
            onTasksUpdated={handleTasksUpdated}
            allTasks={tasks}
            triggerAction={triggerAction}
          />
        ) : (
          <>
            {activeTab === "dashboard" && (
              <Dashboard
                tasks={tasks}
                onTasksUpdated={handleTasksUpdated}
                onEditTask={handleEditTaskTrigger}
                onOpenNewTaskForm={() => { setTaskToEdit(null); setIsTaskFormOpen(true); }}
                onViewTaskDetail={(t) => setActiveTaskDetail(t)}
                triggerAction={triggerAction}
              />
            )}
            {activeTab === "calendar"  && <CalendarView tasks={tasks} onTasksUpdated={handleTasksUpdated} />}
            {activeTab === "expenses"  && <ExpenseTracker tasks={tasks} />}
            {activeTab === "archive"   && <ArchiveBrowser tasks={tasks} />}
          </>
        )}
      </main>

      {/* Requirement 2: Unified Success/Progress Notification Action Dialog */}
      {actionState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-neutral-200 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="flex flex-col items-center justify-center space-y-3">
              {actionState.status === "loading" ? (
                <div className="relative flex items-center justify-center">
                  <div className="w-12 h-12 border-2 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
                  <span className="absolute text-[10px] font-mono font-bold text-neutral-600">{actionState.progress}%</span>
                </div>
              ) : (
                <div className="w-12 h-12 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center text-emerald-600 animate-bounce">
                  <Check className="w-6 h-6" />
                </div>
              )}
              <h3 className="text-lg font-light tracking-tight text-neutral-900">{actionState.title}</h3>
              <p className="text-sm text-neutral-500 leading-normal">{actionState.message}</p>
            </div>
            
            {actionState.status === "loading" && (
              <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden border border-neutral-200/50">
                <div 
                  className="bg-emerald-600 h-full transition-all duration-300"
                  style={{ width: `${actionState.progress}%` }}
                />
              </div>
            )}

            {actionState.status === "success" && (
              <button
                onClick={() => setActionState(prev => ({ ...prev, isOpen: false }))}
                className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs py-2.5 rounded-xl cursor-pointer transition-colors border border-neutral-700 font-bold tracking-wider"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}

      {/* Requirement 3: In-App Top-Right Slide-in Fallback Notifications */}
      {inAppNotification.isOpen && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-white border border-emerald-200/80 p-4 rounded-xl shadow-2xl flex items-start gap-3 animate-in slide-in-from-bottom duration-300">
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-2 rounded-lg">
            <ShieldCheck className="w-5 h-5 animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-600">
              Active Task Reminder
            </h4>
            <p className="text-sm font-semibold mt-1 text-neutral-800">{inAppNotification.title}</p>
            <p className="text-xs mt-0.5 text-neutral-500 leading-normal">{inAppNotification.body}</p>
          </div>
          <button
            onClick={() => setInAppNotification(prev => ({ ...prev, isOpen: false }))}
            className="text-neutral-400 hover:text-neutral-600 transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-neutral-200 rounded-2xl p-6 shadow-2xl space-y-6">

            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-neutral-50 rounded-lg border border-neutral-200 flex items-center justify-center text-neutral-500">
                  <Settings className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold font-mono uppercase tracking-widest text-neutral-800">
                  System Settings
                </h3>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 transition-colors p-2 hover:bg-neutral-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">

              {/* Export */}
              <div className="space-y-3">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-800 block">
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
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-[10px] font-mono text-neutral-500 focus:outline-none resize-none transition-colors group-hover:border-neutral-300"
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
              <div className="space-y-3 pt-5 border-t border-neutral-100">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-800 block">
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
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-[10px] font-mono text-neutral-800 focus:outline-none focus:border-emerald-500/50 resize-none transition-colors"
                />
                {importError && (
                  <div className="text-red-600 text-[11px] font-mono p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{importError}</span>
                  </div>
                )}
                {importSuccess && (
                  <div className="text-emerald-600 text-[11px] font-mono p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center gap-2">
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
              <div className="pt-5 border-t border-neutral-150 text-[10px] font-mono text-neutral-500 uppercase leading-relaxed space-y-1.5 bg-neutral-50/50 p-4 rounded-xl border border-neutral-200/50">
                <div className="flex items-center gap-2"><Info className="w-3.5 h-3.5 text-neutral-400" /> <span>Identity: {user.email}</span></div>
                <div>Engine: Firebase Auth (active)</div>
                <div>Storage: Firestore (real-time sync)</div>
                <div className="text-emerald-600 font-bold">Node Status: Online & Sealed</div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
