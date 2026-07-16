/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Data layer — all persistence goes through Firestore.
 * Pure logic functions (updateParentTasks, handleTaskCompletion, getExpenses)
 * operate only on in-memory arrays so they stay synchronous and testable.
 * Firestore helpers are async and used by App.tsx.
 */

import {
  collection, doc, setDoc, deleteDoc, getDocs,
  writeBatch, onSnapshot, query, orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  Task, TaskStatus, TaskType, StressLevel,
  RecurrenceType, ExpenseMode, ExpenseRecord,
} from "../types";

// ─── Firestore collection name ────────────────────────────────────────────────
const TASKS_COL = "tasks";

// ─── Seed data (runs once on first login if Firestore is empty) ───────────────
export const SEED_TASKS: Task[] = [
  {
    id: "seed-1",
    title: "Complete Semester Project Assignment",
    objective: "Submit the comprehensive documentation and live URL of the server-side app.",
    category: "Academic",
    priority: "High",
    stressLevel: StressLevel.HIGH,
    taskType: TaskType.STANDARD,
    status: TaskStatus.INCOMPLETE,
    startDate: new Date().toISOString().split("T")[0],
    dueDate: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    dueTime: "12:00",
    progress: 40,
    steps: [
      { id: "step-1-1", title: "Write technical documentation", completed: true },
      { id: "step-1-2", title: "Deploy backend server", completed: true },
      { id: "step-1-3", title: "Configure SSL certificate", completed: false },
      { id: "step-1-4", title: "Submit project portal link", completed: false },
      { id: "step-1-5", title: "Receive graded confirmation", completed: false },
    ],
    expenseMode: ExpenseMode.DIRECT,
    expenseAmount: 450,
    expenseEntered: true,
    reminderTimeBefore: 10,
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: "seed-2",
    title: "Weekly Grocery Shopping List",
    objective: "Stock up on healthy essentials for the week.",
    category: "Personal",
    priority: "Medium",
    stressLevel: StressLevel.LOW,
    taskType: TaskType.CHECKLIST,
    status: TaskStatus.INCOMPLETE,
    startDate: new Date().toISOString().split("T")[0],
    dueDate: new Date().toISOString().split("T")[0],
    startTime: "13:30",
    dueTime: "14:30",
    progress: 75,
    steps: [
      { id: "step-2-1", title: "Fresh Spinach & Tomatoes", completed: true },
      { id: "step-2-2", title: "Whole Wheat Bread & Eggs", completed: true },
      { id: "step-2-3", title: "Almond Milk", completed: true },
      { id: "step-2-4", title: "Organic Apples & Avocados", completed: false },
    ],
    expenseMode: ExpenseMode.AFTER_COMPLETION,
    expenseEntered: false,
    createdAt: Date.now() - 86400000,
  },
  {
    id: "seed-3",
    title: "Monthly Broadband Internet Bill",
    objective: "Renew the 300 Mbps fiber subscription to keep the home lab online.",
    category: "Utility",
    priority: "High",
    stressLevel: StressLevel.LOW,
    taskType: TaskType.STANDARD,
    status: TaskStatus.INCOMPLETE,
    startDate: new Date().toISOString().split("T")[0],
    dueDate: new Date().toISOString().split("T")[0],
    startTime: "10:30",
    dueTime: "11:00",
    progress: 0,
    steps: [{ id: "step-3-1", title: "Pay Internet Bill on ISP Portal", completed: false }],
    recurrence: RecurrenceType.MONTHLY,
    recurrenceDayOfMonth: 15,
    expenseMode: ExpenseMode.DIRECT,
    expenseAmount: 1199,
    expenseEntered: true,
    reminderTimeBefore: 30,
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: "seed-4",
    title: "Visit Dr. Sharma for Health Checkup",
    objective: "Regular blood pressure checkup and collect prescriptions.",
    category: "Health",
    priority: "High",
    stressLevel: StressLevel.MEDIUM,
    taskType: TaskType.STANDARD,
    status: TaskStatus.INCOMPLETE,
    startDate: new Date().toISOString().split("T")[0],
    dueDate: new Date().toISOString().split("T")[0],
    startTime: "16:00",
    dueTime: "17:00",
    progress: 0,
    steps: [
      { id: "step-4-1", title: "Book prescription slot", completed: true },
      { id: "step-4-2", title: "Visit clinic and take readings", completed: false },
      { id: "step-4-3", title: "Buy prescribed medicines", completed: false },
    ],
    expenseMode: ExpenseMode.AFTER_COMPLETION,
    expenseAmount: 0,
    expenseEntered: false,
    reminderTimeBefore: 60,
    createdAt: Date.now(),
  },
  {
    id: "child-1",
    title: "Purchase Academic Reference Textbooks",
    objective: "Get recommended books for algorithms and compiler design courses.",
    category: "Academic",
    priority: "High",
    stressLevel: StressLevel.MEDIUM,
    taskType: TaskType.CHECKLIST,
    status: TaskStatus.INCOMPLETE,
    startDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
    progress: 50,
    steps: [
      { id: "c1s1", title: "CLRS Algorithms Textbook", completed: true },
      { id: "c1s2", title: "Dragon Book (Compilers)", completed: false },
    ],
    expenseMode: ExpenseMode.DIRECT,
    expenseAmount: 2400,
    expenseEntered: true,
    createdAt: Date.now(),
  },
  {
    id: "child-2",
    title: "Remit Semester Tuition Fees",
    objective: "Transfer fees online through SBI NetBanking.",
    category: "Academic",
    priority: "High",
    stressLevel: StressLevel.HIGH,
    taskType: TaskType.STANDARD,
    status: TaskStatus.INCOMPLETE,
    startDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0],
    progress: 0,
    steps: [
      { id: "c2s1", title: "Initiate NetBanking transaction", completed: false },
      { id: "c2s2", title: "Download official fee receipt", completed: false },
    ],
    expenseMode: ExpenseMode.DIRECT,
    expenseAmount: 48000,
    expenseEntered: true,
    createdAt: Date.now(),
  },
  {
    id: "super-1",
    title: "Semester 5 Academic Preparation",
    objective: "Coordinate enrollment, textbooks, and fees.",
    category: "Academic",
    priority: "High",
    stressLevel: StressLevel.MEDIUM,
    taskType: TaskType.SUPER,
    status: TaskStatus.INCOMPLETE,
    startDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 86400000 * 7).toISOString().split("T")[0],
    progress: 25,
    steps: [],
    childTaskIds: ["child-1", "child-2"],
    createdAt: Date.now(),
  },
  {
    id: "archive-1",
    title: "Renew Passport Application",
    objective: "Apply online and attend the appointment at Passport Seva Kendra.",
    category: "Official",
    priority: "High",
    stressLevel: StressLevel.CRITICAL,
    taskType: TaskType.STANDARD,
    status: TaskStatus.ARCHIVED,
    startDate: new Date(Date.now() - 86400000 * 35).toISOString().split("T")[0],
    dueDate: new Date(Date.now() - 86400000 * 30).toISOString().split("T")[0],
    progress: 100,
    steps: [
      { id: "s-arch-1", title: "Fill online form", completed: true },
      { id: "s-arch-2", title: "Pay fee of ₹1,500", completed: true },
      { id: "s-arch-3", title: "Book slot and visit PSK Office", completed: true },
      { id: "s-arch-4", title: "Police verification", completed: true },
      { id: "s-arch-5", title: "Receive passport via speed post", completed: true },
    ],
    expenseMode: ExpenseMode.DIRECT,
    expenseAmount: 1500,
    expenseEntered: true,
    createdAt: Date.now() - 86400000 * 35,
    completedAt: Date.now() - 86400000 * 30,
  },
];

// ─── Firestore helpers ────────────────────────────────────────────────────────

/** Write a single task document to Firestore. */
export const saveTaskToFirestore = (task: Task): Promise<void> =>
  setDoc(doc(db, TASKS_COL, task.id), task);

/** Delete a single task document from Firestore. */
export const deleteTaskFromFirestore = (id: string): Promise<void> =>
  deleteDoc(doc(db, TASKS_COL, id));

/**
 * Batch-write an array of tasks.
 * Also accepts an optional list of ids to delete in the same batch.
 */
export const syncTasksToFirestore = async (
  toWrite: Task[],
  toDelete: string[] = [],
): Promise<void> => {
  const batch = writeBatch(db);
  toWrite.forEach((t) => batch.set(doc(db, TASKS_COL, t.id), t));
  toDelete.forEach((id) => batch.delete(doc(db, TASKS_COL, id)));
  await batch.commit();
};

/**
 * Subscribe to real-time task updates from Firestore.
 * Returns the unsubscribe function.
 */
export const subscribeToTasks = (
  callback: (tasks: Task[]) => void,
): (() => void) => {
  const q = query(collection(db, TASKS_COL), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const tasks: Task[] = [];
    snapshot.forEach((d) => tasks.push(d.data() as Task));
    callback(tasks);
  });
};

/**
 * Seed Firestore with default tasks the very first time a user logs in
 * (i.e. when their tasks collection is empty).
 */
export const seedIfEmpty = async (): Promise<void> => {
  const snapshot = await getDocs(collection(db, TASKS_COL));
  if (!snapshot.empty) return;
  const batch = writeBatch(db);
  SEED_TASKS.forEach((t) => batch.set(doc(db, TASKS_COL, t.id), t));
  await batch.commit();
};

// ─── Pure in-memory logic (no storage side-effects) ──────────────────────────

/** Recalculates Super Tasks' progress from their children in-place. */
export const updateParentTasks = (tasks: Task[]): void => {
  const superTasks = tasks.filter((t) => t.taskType === TaskType.SUPER);
  superTasks.forEach((parent) => {
    if (!parent.childTaskIds?.length) return;
    const children = tasks.filter((t) => parent.childTaskIds!.includes(t.id));
    if (!children.length) return;

    const totalProgress = children.reduce((acc, child) => {
      const p =
        child.status === TaskStatus.COMPLETED ||
        child.status === TaskStatus.ARCHIVED
          ? 100
          : child.progress;
      return acc + p;
    }, 0);

    parent.progress = Math.round(totalProgress / children.length);

    const allDone = children.every(
      (c) =>
        c.status === TaskStatus.COMPLETED ||
        c.status === TaskStatus.ARCHIVED ||
        c.progress === 100,
    );

    if (allDone && parent.status === TaskStatus.INCOMPLETE) {
      parent.status = TaskStatus.COMPLETED;
      parent.progress = 100;
      parent.completedAt = Date.now();
    } else if (!allDone && parent.status === TaskStatus.COMPLETED) {
      parent.status = TaskStatus.INCOMPLETE;
    }
  });
};

/**
 * Handles task completion logic (recurrence spawning, archiving).
 * Pure function — takes current task list, returns updated list + metadata.
 * Callers are responsible for persisting to Firestore.
 */
export const handleTaskCompletion = (
  task: Task,
  currentTasks: Task[],
): { updatedTasks: Task[]; archivedTask: Task | null; newOccurrence: Task | null } => {
  const tasks = currentTasks.map((t) => ({ ...t })); // shallow clone each
  const index = tasks.findIndex((t) => t.id === task.id);
  if (index === -1)
    return { updatedTasks: tasks, archivedTask: null, newOccurrence: null };

  const original = tasks[index];
  original.status = TaskStatus.COMPLETED;
  original.progress = 100;
  original.completedAt = Date.now();

  let archivedTask: Task | null = null;
  let newOccurrence: Task | null = null;

  if (original.recurrence && original.recurrence !== RecurrenceType.NONE) {
    original.status = TaskStatus.ARCHIVED;
    archivedTask = { ...original };

    const nextDates = getNextOccurrenceDates(
      original.startDate,
      original.dueDate,
      original.recurrence,
      original.customRecurrenceDays,
      original.recurrenceDayOfMonth,
    );

    newOccurrence = {
      ...original,
      id: "task-" + Math.random().toString(36).substr(2, 9),
      status: TaskStatus.INCOMPLETE,
      progress: 0,
      startDate: nextDates.startDate,
      dueDate: nextDates.dueDate,
      steps: original.steps.map((s) => ({ ...s, completed: false })),
      expenseEntered: original.expenseMode === ExpenseMode.DIRECT,
      expenseAmount:
        original.expenseMode === ExpenseMode.DIRECT
          ? original.expenseAmount
          : undefined,
      reminderSent: false,
      createdAt: Date.now(),
      completedAt: undefined,
    };

    tasks[index] = original;
    tasks.push(newOccurrence);
  } else {
    tasks[index] = original;
  }

  updateParentTasks(tasks);
  return { updatedTasks: tasks, archivedTask, newOccurrence };
};

const getNextOccurrenceDates = (
  startDateStr: string,
  dueDateStr: string,
  recurrence: RecurrenceType,
  customDays?: number,
  dayOfMonth?: number,
): { startDate: string; dueDate: string } => {
  const start = new Date(startDateStr);
  const due = new Date(dueDateStr);
  const duration = due.getTime() - start.getTime();
  const next = new Date(start);

  switch (recurrence) {
    case RecurrenceType.DAILY:
      next.setDate(start.getDate() + 1);
      break;
    case RecurrenceType.WEEKLY:
      next.setDate(start.getDate() + 7);
      break;
    case RecurrenceType.MONTHLY:
      next.setMonth(start.getMonth() + 1);
      if (dayOfMonth) next.setDate(dayOfMonth);
      break;
    case RecurrenceType.YEARLY:
      next.setFullYear(start.getFullYear() + 1);
      break;
    case RecurrenceType.CUSTOM:
      next.setDate(start.getDate() + (customDays ?? 1));
      break;
    default:
      next.setDate(start.getDate() + 1);
  }

  const nextDue = new Date(next.getTime() + duration);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  return { startDate: fmt(next), dueDate: fmt(nextDue) };
};

/** Derives expense records from the task list. */
export const getExpenses = (tasks: Task[]): ExpenseRecord[] =>
  tasks
    .filter((t) => t.expenseEntered && t.expenseAmount && t.expenseAmount > 0)
    .map((t) => ({
      id: `exp-${t.id}`,
      taskId: t.id,
      taskTitle: t.title,
      category: t.category,
      amount: t.expenseAmount!,
      date: t.completedAt
        ? new Date(t.completedAt).toISOString().split("T")[0]
        : t.startDate,
    }));

/**
 * Auto-transfers incomplete tasks from previous days to today's date.
 * Keeps the task duration (difference in days between startDate and dueDate) exactly the same.
 */
export const autoTransferOverdueTasks = (tasks: Task[]): { updatedTasks: Task[]; didChange: boolean } => {
  const now = new Date();
  const getLocalDateStr = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const todayStr = getLocalDateStr(now);

  const parseLocalJSDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const today = parseLocalJSDate(todayStr);
  let didChange = false;

  const updatedTasks = tasks.map((task) => {
    if (task.status === TaskStatus.INCOMPLETE) {
      const start = parseLocalJSDate(task.startDate);
      const diffTime = today.getTime() - start.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        // Shift task startDate and dueDate forward by diffDays
        const newStart = new Date(start);
        newStart.setDate(start.getDate() + diffDays);

        const due = parseLocalJSDate(task.dueDate);
        const newDue = new Date(due);
        newDue.setDate(due.getDate() + diffDays);

        const fmt = (d: Date) =>
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

        didChange = true;
        return {
          ...task,
          startDate: fmt(newStart),
          dueDate: fmt(newDue),
          reminderSent: false, // reset reminder check so it fires today!
        };
      }
    }
    return task;
  });

  return { updatedTasks, didChange };
};

