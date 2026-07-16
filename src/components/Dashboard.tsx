/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Plus, CheckCircle2, Archive, Trash2, Edit2, Search,
  Landmark, DollarSign, Calendar, Flame, AlertCircle, ListPlus,
  CalendarDays, Clock, RefreshCw, ChevronRight, Eye
} from "lucide-react";
import { Task, TaskStatus, TaskType, StressLevel, ExpenseMode, RecurrenceType } from "../types";
import { handleTaskCompletion, updateParentTasks } from "../lib/db";
import { motion, AnimatePresence } from "framer-motion";

interface DashboardProps {
  tasks: Task[];
  onTasksUpdated: (newTasks: Task[]) => void;
  onEditTask: (task: Task) => void;
  onOpenNewTaskForm: () => void;
  onViewTaskDetail: (task: Task) => void;
  triggerAction: (title: string, successMessage: string, actionFn: () => Promise<void> | void) => Promise<void>;
}

export default function Dashboard({ 
  tasks, 
  onTasksUpdated, 
  onEditTask, 
  onOpenNewTaskForm,
  onViewTaskDetail,
  triggerAction
}: DashboardProps) {
  // Navigation & Display Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStress, setSelectedStress] = useState("All");

  // Quick Add State (reduces clicks to absolute minimum)
  const [quickTitle, setQuickTitle] = useState("");
  const [quickCategory, setQuickCategory] = useState("Academic");

  // Post Completion Expense Modal state
  const [pendingExpenseTask, setPendingExpenseTask] = useState<Task | null>(null);
  const [finalExpenseAmount, setFinalExpenseAmount] = useState<number | "">("");

  // Notification states
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");

  // Live Time state
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const requestNotificationPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }
  };

  // Quick Add Task implementation with Dialog Feedback
  const handleQuickAdd = () => {
    if (!quickTitle.trim()) return;
    const titleText = quickTitle.trim();
    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title: titleText,
      category: quickCategory,
      priority: "Medium",
      stressLevel: StressLevel.LOW,
      taskType: TaskType.CHECKLIST,
      status: TaskStatus.INCOMPLETE,
      startDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      progress: 0,
      steps: [],
      expenseMode: ExpenseMode.DIRECT,
      expenseEntered: false,
      createdAt: Date.now()
    };
    
    triggerAction(
      "Quick Create",
      `Your Tasks titled "${titleText}" has been created`,
      async () => {
        const updated = [...tasks, newTask];
        onTasksUpdated(updated);
        setQuickTitle("");
      }
    );
  };

  // One-click Toggle for checklist sub-steps directly on the dashboard (Silent/Instant)
  const handleToggleSubstep = (taskId: string, stepId: string) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const nextSteps = t.steps.map((s) => s.id === stepId ? { ...s, completed: !s.completed } : s);
        const completedCount = nextSteps.filter((s) => s.completed).length;
        const nextProgress = Math.round((completedCount / nextSteps.length) * 100);
        
        let nextStatus = t.status;
        let completedTime = t.completedAt;

        if (nextProgress === 100 && t.status === TaskStatus.INCOMPLETE) {
          if (t.expenseMode === ExpenseMode.AFTER_COMPLETION && !t.expenseEntered) {
            setPendingExpenseTask({ ...t, steps: nextSteps, progress: 100 });
            return t; 
          } else {
            nextStatus = TaskStatus.COMPLETED;
            completedTime = Date.now();
          }
        } else if (nextProgress < 100 && t.status === TaskStatus.COMPLETED) {
          nextStatus = TaskStatus.INCOMPLETE;
          completedTime = undefined;
        }

        return { ...t, steps: nextSteps, progress: nextProgress, status: nextStatus, completedAt: completedTime };
      }
      return t;
    });

    const matchedTask = updated.find(t => t.id === taskId);
    if (matchedTask && matchedTask.progress === 100 && matchedTask.status === TaskStatus.COMPLETED && matchedTask.recurrence && matchedTask.recurrence !== RecurrenceType.NONE) {
      const result = handleTaskCompletion(matchedTask, updated);
      onTasksUpdated(result.updatedTasks);
    } else {
      updateParentTasks(updated);
      onTasksUpdated(updated);
    }
  };

  // Task Completion Action with Dialog Feedback
  const handleCompleteTaskClick = (task: Task) => {
    if (task.expenseMode === ExpenseMode.AFTER_COMPLETION && !task.expenseEntered) {
      setPendingExpenseTask(task);
    } else {
      triggerAction(
        "Completing Task",
        `Your Tasks titled "${task.title}" has been completed`,
        async () => {
          const result = handleTaskCompletion(task, tasks);
          onTasksUpdated(result.updatedTasks);
        }
      );
    }
  };

  const handlePostExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingExpenseTask || finalExpenseAmount === "") return;

    const completedTask: Task = {
      ...pendingExpenseTask,
      status: TaskStatus.COMPLETED,
      progress: 100,
      expenseAmount: Number(finalExpenseAmount),
      expenseEntered: true,
      completedAt: Date.now()
    };

    triggerAction(
      "Completing Task",
      `Your Tasks titled "${completedTask.title}" has been completed`,
      async () => {
        const updatedList = tasks.map((t) => t.id === completedTask.id ? completedTask : t);
        if (completedTask.recurrence && completedTask.recurrence !== RecurrenceType.NONE) {
          const result = handleTaskCompletion(completedTask, updatedList);
          onTasksUpdated(result.updatedTasks);
        } else {
          updateParentTasks(updatedList);
          onTasksUpdated(updatedList);
        }
        setPendingExpenseTask(null);
        setFinalExpenseAmount("");
      }
    );
  };

  // Archive Task Action with Dialog Feedback
  const handleArchiveTask = (task: Task) => {
    triggerAction(
      "Archiving Task",
      `Your Tasks titled "${task.title}" has been Archived`,
      async () => {
        const updated = tasks.map((t) => t.id === task.id ? { ...t, status: TaskStatus.ARCHIVED } : t);
        updateParentTasks(updated);
        onTasksUpdated(updated);
      }
    );
  };

  // Delete Action with Dialog Feedback
  const handleDeleteTask = (task: Task) => {
    triggerAction(
      "Permanently Deleting",
      `Your Tasks titled "${task.title}" has been permanently deleted`,
      async () => {
        const updated = tasks.filter((t) => t.id !== task.id);
        updateParentTasks(updated);
        onTasksUpdated(updated);
      }
    );
  };

  // Expense Calculations for Today, This Week, and This Month
  const getExpensesStats = () => {
    let today = 0;
    let week = 0;
    let month = 0;

    const targetDateStr = currentTime.toISOString().split('T')[0];
    const targetDate = currentTime;
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();

    tasks.forEach((t) => {
      if (t.expenseEntered && t.expenseAmount && t.expenseAmount > 0) {
        const expenseDateStr = t.completedAt ? new Date(t.completedAt).toISOString().split("T")[0] : t.startDate;
        const expDate = new Date(expenseDateStr);

        // Daily
        if (expenseDateStr === targetDateStr) {
          today += t.expenseAmount;
        }

        // Weekly
        const timeDiff = targetDate.getTime() - expDate.getTime();
        const daysDiff = timeDiff / (1000 * 3600 * 24);
        if (daysDiff >= 0 && daysDiff <= 7) {
          week += t.expenseAmount;
        }

        // Monthly
        if (expDate.getMonth() === targetMonth && expDate.getFullYear() === targetYear) {
          month += t.expenseAmount;
        }
      }
    });

    return { today, week, month };
  };

  const expenseStats = getExpensesStats();

  // Task Filters and Sorting
  const filteredTasks = tasks.filter((t) => {
    if (t.status === TaskStatus.ARCHIVED) return false;

    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (t.objective && t.objective.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === "All" || t.category === selectedCategory;
    const matchesStress = selectedStress === "All" || t.stressLevel === selectedStress;

    return matchesSearch && matchesCategory && matchesStress;
  });

  // Sorting
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.status === TaskStatus.COMPLETED && b.status === TaskStatus.INCOMPLETE) return 1;
    if (a.status === TaskStatus.INCOMPLETE && b.status === TaskStatus.COMPLETED) return -1;

    const dateA = new Date(a.startDate).getTime();
    const dateB = new Date(b.startDate).getTime();
    if (dateA !== dateB) return dateA - dateB;

    if (a.startTime && b.startTime) {
      return a.startTime.localeCompare(b.startTime);
    }
    if (a.startTime && !b.startTime) return -1;
    if (!a.startTime && b.startTime) return 1;

    return b.createdAt - a.createdAt;
  });

  // Stress indicator style mapping
  const getStressIndicator = (lvl: StressLevel) => {
    switch (lvl) {
      case StressLevel.VERY_LOW:
        return { color: "bg-emerald-400", text: "text-emerald-600 border-emerald-100 bg-emerald-50" };
      case StressLevel.LOW:
        return { color: "bg-teal-400", text: "text-teal-600 border-teal-100 bg-teal-50" };
      case StressLevel.MEDIUM:
        return { color: "bg-amber-400", text: "text-amber-600 border-amber-100 bg-amber-50" };
      case StressLevel.HIGH:
        return { color: "bg-orange-500", text: "text-orange-600 border-orange-100 bg-orange-50" };
      case StressLevel.CRITICAL:
        return { color: "bg-red-500 animate-pulse", text: "text-red-600 border-red-100 bg-red-50 font-bold" };
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      
      {/* Notifications banner */}
      {notificationPermission === "default" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-200">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping shrink-0"></span>
            <span className="text-xs font-mono text-amber-800 font-bold">
              STAY ALERTED: SYSTEM REQUIRES BROWSER NOTIFICATION PERMISSION TO TRIGGER REMINDERS.
            </span>
          </div>
          <button
            onClick={requestNotificationPermission}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-mono font-bold px-4 py-2 rounded-xl cursor-pointer transition-colors duration-200"
          >
            Enable Notifications
          </button>
        </div>
      )}

      {/* Greeting Hub Block */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-neutral-200/80">
        <div>
          <h1 className="text-4xl font-light tracking-tight text-neutral-900">Hello, Tojo</h1>
          <p className="text-neutral-500 font-bold uppercase tracking-widest text-[10px] mt-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-neutral-400" />
            {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-mono text-neutral-800 font-medium">
              {currentTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-[9px] text-indigo-600 font-bold uppercase tracking-widest mt-0.5">System Active</div>
          </div>
          <button
            onClick={onOpenNewTaskForm}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-5 rounded-xl text-xs uppercase tracking-widest transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-[0_4px_14px_rgba(79,70,229,0.2)] hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Task</span>
          </button>
        </div>
      </header>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white border border-neutral-200/80 p-5 rounded-2xl flex justify-between items-center shadow-sm hover:shadow-md transition-shadow duration-200">
          <span className="text-xs text-neutral-500 uppercase tracking-widest font-bold flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-indigo-600/60" /> Today's Budget
          </span>
          <span className="text-2xl font-light font-mono text-neutral-800">₹{expenseStats.today}</span>
        </div>

        <div className="bg-white border border-neutral-200/80 p-5 rounded-2xl flex justify-between items-center shadow-sm hover:shadow-md transition-shadow duration-200">
          <span className="text-xs text-neutral-500 uppercase tracking-widest font-bold flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-indigo-600/60" /> This Week
          </span>
          <span className="text-2xl font-light font-mono text-neutral-800">₹{expenseStats.week}</span>
        </div>

        <div className="bg-white border border-indigo-100 p-5 rounded-2xl flex justify-between items-center shadow-sm hover:shadow-md transition-shadow duration-200">
          <span className="text-xs text-neutral-500 uppercase tracking-widest font-bold flex items-center gap-2">
            <Landmark className="w-4 h-4 text-indigo-600" /> This Month
          </span>
          <span className="text-2xl font-light font-mono text-indigo-700 font-semibold">₹{expenseStats.month}</span>
        </div>
      </div>

      {/* Quick Add Bar */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <ListPlus className="w-4 h-4 text-indigo-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Quick Task Entry</h2>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="What needs to be done today?"
            className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl py-3 px-4 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/10 transition-all duration-200"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleQuickAdd();
            }}
          />
          <select
            value={quickCategory}
            onChange={(e) => setQuickCategory(e.target.value)}
            className="bg-neutral-50 border border-neutral-200 rounded-xl py-3 px-3 text-sm text-neutral-700 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/10 transition-all duration-200 cursor-pointer font-medium"
          >
            {["Academic", "Personal", "Health", "Official", "Utility"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            onClick={handleQuickAdd}
            className="bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-bold py-3 px-6 rounded-xl transition-colors duration-200 cursor-pointer border border-neutral-700 shadow-sm font-mono uppercase tracking-wider text-xs"
          >
            Add
          </button>
        </div>
      </div>

      {/* Search and Filters Hub */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-1/3">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Instant text search..."
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-neutral-800 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/10 transition-all duration-200"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto items-center justify-end">
            <div className="flex items-center gap-1.5 bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-200 focus-within:border-indigo-600 transition-colors duration-200">
              <span className="text-[9px] font-mono font-bold text-neutral-400 uppercase">Category</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent border-none text-xs text-neutral-700 focus:ring-0 focus:outline-none cursor-pointer font-bold"
              >
                <option value="All">All Categories</option>
                {["Academic", "Personal", "Health", "Official", "Utility", "Finance", "Social", "Shopping"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-200 focus-within:border-indigo-600 transition-colors duration-200">
              <span className="text-[9px] font-mono font-bold text-neutral-400 uppercase">Stress</span>
              <select
                value={selectedStress}
                onChange={(e) => setSelectedStress(e.target.value)}
                className="bg-transparent border-none text-xs text-neutral-700 focus:ring-0 focus:outline-none cursor-pointer font-bold"
              >
                <option value="All">All Stress</option>
                {Object.values(StressLevel).map((lvl) => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Task List Arena */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400">Deployment Deck</h2>

        <AnimatePresence mode="popLayout">
          {sortedTasks.length > 0 ? (
            <div className="space-y-4">
              {sortedTasks.map((task) => {
                const isCompleted = task.status === TaskStatus.COMPLETED;
                const stressInd = getStressIndicator(task.stressLevel);
                
                return (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: isCompleted ? 0.6 : 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => onViewTaskDetail(task)}
                    className={`bg-white border rounded-2xl overflow-hidden transition-all duration-300 hover:bg-neutral-50/50 hover:shadow-md relative group cursor-pointer ${
                      task.priority === "High" && !isCompleted
                        ? "border-emerald-500/30 shadow-sm" 
                        : "border-neutral-200/80 shadow-sm"
                    }`}
                  >
                    {/* Priority Accent Line */}
                    {!isCompleted && task.priority === "High" && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.3)] z-10" />
                    )}

                    {/* Task Card Header Area */}
                    <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2.5 flex-1 min-w-0">
                        
                        {/* Priority, Category, Type Pill row */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-mono font-bold">
                          <span className={`px-2 py-0.5 rounded border uppercase ${
                            task.priority === "High" 
                              ? "border-red-200 bg-red-50 text-red-600" 
                              : task.priority === "Medium"
                                ? "border-amber-200 bg-amber-50 text-amber-600"
                                : "border-neutral-200 bg-neutral-50 text-neutral-500"
                          }`}>
                            {task.priority}
                          </span>
                          
                          <span className="px-2 py-0.5 rounded border border-neutral-200 bg-neutral-50 text-neutral-600 uppercase">
                            {task.category}
                          </span>

                          <span className="px-2 py-0.5 rounded border border-neutral-200 bg-neutral-50 text-neutral-600 uppercase">
                            {task.taskType}
                          </span>

                          <span className={`px-2 py-0.5 rounded border flex items-center gap-1 uppercase ${stressInd.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${stressInd.color}`}></span>
                            STRESS: {task.stressLevel}
                          </span>
                        </div>

                        {/* Title & Objective */}
                        <div className="space-y-1">
                          <h3 className={`text-lg font-medium tracking-tight text-neutral-900 flex items-center gap-2 transition-all duration-300 ${isCompleted ? "line-through text-neutral-400 decoration-neutral-400/60" : ""}`}>
                            {task.title}
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                              <Eye className="w-4 h-4 text-indigo-600 inline" />
                            </span>
                          </h3>
                        </div>

                        {task.objective && (
                          <p className={`text-xs font-sans max-w-xl leading-relaxed transition-all duration-300 ${isCompleted ? "text-neutral-400" : "text-neutral-500"}`}>
                            {task.objective}
                          </p>
                        )}

                        {/* Time Scheduling Indicators */}
                        <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-neutral-400 pt-1">
                          <span className="flex items-center gap-1.5 text-indigo-700 bg-indigo-50/50 px-2 py-0.5 rounded border border-indigo-100">
                            <Calendar className="w-3.5 h-3.5" /> {task.startDate} {task.startTime ? `at ${task.startTime}` : ""}
                          </span>
                          <span className="opacity-40 font-sans">➔</span>
                          <span className="flex items-center gap-1.5 text-neutral-600 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-200">
                            <Clock className="w-3.5 h-3.5 text-neutral-400" /> Due: {task.dueDate} {task.dueTime ? `at ${task.dueTime}` : ""}
                          </span>
                          
                          {task.recurrence && task.recurrence !== RecurrenceType.NONE && (
                            <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-bold uppercase">
                              <RefreshCw className="w-3 h-3" /> {task.recurrence}
                            </span>
                          )}

                          {task.expenseAmount !== undefined && task.expenseAmount > 0 && (
                            <span className="text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 border border-indigo-100 rounded">
                              ₹{task.expenseAmount}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Progress Indicator and Action Buttons */}
                      <div className="flex flex-col items-end gap-3 shrink-0 mt-2 md:mt-0" onClick={(e) => e.stopPropagation()}>
                        
                        {/* Visual Progress bar */}
                        {(task.taskType !== TaskType.SUPER && task.steps.length > 0) || task.taskType === TaskType.SUPER ? (
                          <div className="w-32 flex flex-col gap-1.5">
                            <div className="flex justify-between text-[9px] font-mono font-bold">
                              <span className={task.taskType === TaskType.SUPER ? "text-indigo-700" : "text-neutral-400"}>
                                {task.taskType === TaskType.SUPER ? "SUPER TASK" : "PROGRESS"}
                              </span>
                              <span className={isCompleted ? "text-indigo-600" : "text-neutral-700"}>{task.progress}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden border border-neutral-200/60">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ease-out ${isCompleted ? "bg-indigo-500/40" : "bg-indigo-600"}`}
                                style={{ width: `${task.progress}%` }}
                              />
                            </div>
                          </div>
                        ) : null}

                        {/* Action buttons */}
                        <div className="flex items-center gap-0.5 bg-neutral-50 border border-neutral-200/80 p-1 rounded-xl shadow-sm">
                          
                          {!isCompleted && (
                            <button
                              onClick={() => handleCompleteTaskClick(task)}
                              className="p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                              title="Instant Complete"
                            >
                              <CheckCircle2 className="w-4.5 h-4.5" />
                            </button>
                          )}

                          {!isCompleted && (
                            <button
                              onClick={() => onEditTask(task)}
                              className="p-1.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-150 rounded-lg cursor-pointer transition-colors"
                              title="Edit task parameters"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {isCompleted && (
                            <button
                              onClick={() => handleArchiveTask(task)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer transition-colors flex items-center gap-1 text-[9px] font-mono uppercase font-bold"
                              title="Send to Vault Archive"
                            >
                              <Archive className="w-4 h-4" />
                              <span className="hidden sm:inline">Archive</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteTask(task)}
                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                            title="Permanently Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                        </div>
                      </div>
                    </div>

                    {/* Step Sub-checklist */}
                    {task.taskType !== TaskType.SUPER && task.steps.length > 0 && (
                      <div className="bg-neutral-50/50 border-t border-neutral-100 px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {task.steps.map((step) => (
                            <div 
                              key={step.id} 
                              className={`flex items-start gap-2.5 p-2 rounded-xl transition-colors duration-200 cursor-pointer ${
                                step.completed ? "bg-indigo-50/30 border border-indigo-100" : "hover:bg-neutral-100 border border-transparent"
                              } ${isCompleted ? "opacity-60 pointer-events-none" : ""}`}
                              onClick={() => !isCompleted && handleToggleSubstep(task.id, step.id)}
                            >
                              <div className={`mt-0.5 flex shrink-0 items-center justify-center w-4 h-4 rounded border transition-colors ${
                                step.completed ? "bg-indigo-600 border-indigo-600 text-white" : "border-neutral-300 bg-white"
                              }`}>
                                {step.completed && <CheckCircle2 className="w-3 h-3" />}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className={`text-xs truncate font-medium transition-all duration-200 ${
                                  step.completed ? "text-neutral-400 line-through decoration-neutral-300" : "text-neutral-700"
                                }`}>
                                  {step.title}
                                </span>
                                {step.note && (
                                  <span className="text-[10px] text-neutral-400 font-mono truncate">
                                    <AlertCircle className="w-3 h-3 inline mr-1 opacity-50" />
                                    {step.note}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 bg-white border border-neutral-200/80 rounded-2xl shadow-sm"
            >
              <div className="w-16 h-16 bg-neutral-50 border border-neutral-200 rounded-2xl mx-auto flex items-center justify-center text-neutral-400 mb-4 shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest block font-bold">No active tasks</span>
              <p className="text-xs text-neutral-500 mt-2 max-w-sm mx-auto leading-relaxed">
                Your workspace is completely clear. Enjoy the peace, or construct new tasks above.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Post Completion Expense Modal overlay */}
      <AnimatePresence>
        {pendingExpenseTask && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white border border-neutral-200 rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-indigo-600 border-b border-slate-100 pb-3">
                <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-light tracking-tight text-neutral-900">Log Final Expense</h3>
                  <p className="text-[10px] font-mono text-neutral-400 uppercase font-bold tracking-widest">Post-Completion Ledger</p>
                </div>
              </div>
              
              <p className="text-xs text-neutral-500 leading-relaxed">
                You marked <span className="text-neutral-800 font-bold">"{pendingExpenseTask.title}"</span> as complete. This task requires a final expense to be recorded before sealing.
              </p>

              <form onSubmit={handlePostExpenseSubmit} className="space-y-4 pt-2">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">
                    Final Amount (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    required
                    autoFocus
                    value={finalExpenseAmount}
                    onChange={(e) => setFinalExpenseAmount(Number(e.target.value))}
                    placeholder="Enter final cost..."
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-3 px-4 text-neutral-800 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/10 transition-all font-mono text-sm font-bold"
                  />
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setPendingExpenseTask(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all cursor-pointer font-mono"
                  >
                    Log & Complete
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
