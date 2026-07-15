/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Calendar, Clock, ListChecks } from "lucide-react";
import { Task, TaskStep, TaskType, StressLevel, RecurrenceType, ExpenseMode, TaskStatus } from "../types";
import { motion, AnimatePresence } from "framer-motion";

interface TaskFormProps {
  taskToEdit?: Task | null;
  allTasks: Task[];
  onSave: (task: Task) => void;
  onClose: () => void;
}

const CATEGORIES = ["Academic", "Personal", "Health", "Official", "Utility", "Finance", "Social", "Shopping"];

export default function TaskForm({ taskToEdit, allTasks, onSave, onClose }: TaskFormProps) {
  const isEditing = !!taskToEdit;

  // Form States
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [category, setCategory] = useState("Academic");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [stressLevel, setStressLevel] = useState<StressLevel>(StressLevel.MEDIUM);
  const [taskType, setTaskType] = useState<TaskType>(TaskType.STANDARD);
  
  // Scheduling States (Defaulting to today)
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [dueDate, setDueDate] = useState(todayStr);
  const [startTime, setStartTime] = useState("");
  const [dueTime, setDueTime] = useState("");
  
  // Steps State
  const [steps, setSteps] = useState<TaskStep[]>([]);
  const [newStepTitle, setNewStepTitle] = useState("");
  const [newStepNote, setNewStepNote] = useState("");

  // Super Task State: Child task selections
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);

  // Recurrence State
  const [recurrence, setRecurrence] = useState<RecurrenceType>(RecurrenceType.NONE);
  const [customDays, setCustomDays] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(1);

  // Expense State
  const [expenseMode, setExpenseMode] = useState<ExpenseMode>(ExpenseMode.DIRECT);
  const [expenseAmount, setExpenseAmount] = useState<number | "">("");

  // Reminder State
  const [reminderTime, setReminderTime] = useState<number>(-1); // -1 means none

  // Load existing task if editing
  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setObjective(taskToEdit.objective || "");
      setCategory(taskToEdit.category);
      setPriority(taskToEdit.priority);
      setStressLevel(taskToEdit.stressLevel); // Immutable, but load current state
      setTaskType(taskToEdit.taskType);
      setStartDate(taskToEdit.startDate);
      setDueDate(taskToEdit.dueDate);
      setStartTime(taskToEdit.startTime || "");
      setDueTime(taskToEdit.dueTime || "");
      setSteps(taskToEdit.steps);
      setSelectedChildIds(taskToEdit.childTaskIds || []);
      setRecurrence(taskToEdit.recurrence || RecurrenceType.NONE);
      setCustomDays(taskToEdit.customRecurrenceDays || 1);
      setDayOfMonth(taskToEdit.recurrenceDayOfMonth || 1);
      setExpenseMode(taskToEdit.expenseMode || ExpenseMode.DIRECT);
      setExpenseAmount(taskToEdit.expenseAmount !== undefined ? taskToEdit.expenseAmount : "");
      setReminderTime(taskToEdit.reminderTimeBefore !== undefined ? taskToEdit.reminderTimeBefore : -1);
    }
  }, [taskToEdit]);

  // Step Handlers
  const addStep = () => {
    if (!newStepTitle.trim()) return;
    const newStep: TaskStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title: newStepTitle.trim(),
      note: newStepNote.trim() || undefined,
      completed: false,
    };
    setSteps([...steps, newStep]);
    setNewStepTitle("");
    setNewStepNote("");
  };

  const removeStep = (id: string) => {
    setSteps(steps.filter((s) => s.id !== id));
  };

  const handleStepToggle = (id: string) => {
    setSteps(steps.map((s) => s.id === id ? { ...s, completed: !s.completed } : s));
  };

  // Selection of potential child tasks for Super Task
  const eligibleChildTasks = allTasks.filter(
    (t) => t.taskType !== TaskType.SUPER && t.status !== TaskStatus.ARCHIVED && t.id !== (taskToEdit?.id || "")
  );

  const toggleChildTaskSelection = (childId: string) => {
    if (selectedChildIds.includes(childId)) {
      setSelectedChildIds(selectedChildIds.filter((id) => id !== childId));
    } else {
      setSelectedChildIds([...selectedChildIds, childId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Calculate completion percentage
    let calculatedProgress = 0;
    if (taskType === TaskType.SUPER) {
      // Handled automatically via database manager based on children
      const children = allTasks.filter((t) => selectedChildIds.includes(t.id));
      if (children.length > 0) {
        const total = children.reduce((acc, c) => acc + (c.status === TaskStatus.COMPLETED ? 100 : c.progress), 0);
        calculatedProgress = Math.round(total / children.length);
      }
    } else if (steps.length > 0) {
      const completed = steps.filter((s) => s.completed).length;
      calculatedProgress = Math.round((completed / steps.length) * 100);
    }

    const newTask: Task = {
      id: taskToEdit?.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: title.trim(),
      objective: objective.trim() || undefined,
      category,
      priority,
      stressLevel, // Locked if editing!
      taskType,
      status: taskToEdit?.status || TaskStatus.INCOMPLETE,
      startDate,
      dueDate,
      startTime: startTime || undefined,
      dueTime: dueTime || undefined,
      progress: calculatedProgress,
      steps: taskType === TaskType.SUPER ? [] : steps,
      childTaskIds: taskType === TaskType.SUPER ? selectedChildIds : undefined,
      parentTaskId: taskToEdit?.parentTaskId,
      recurrence,
      customRecurrenceDays: recurrence === RecurrenceType.CUSTOM ? customDays : undefined,
      recurrenceDayOfMonth: recurrence === RecurrenceType.MONTHLY ? dayOfMonth : undefined,
      expenseMode,
      expenseAmount: expenseAmount !== "" ? Number(expenseAmount) : undefined,
      expenseEntered: expenseMode === ExpenseMode.DIRECT ? (expenseAmount !== "" && Number(expenseAmount) >= 0) : (taskToEdit?.expenseEntered || false),
      reminderTimeBefore: reminderTime !== -1 ? reminderTime : undefined,
      createdAt: taskToEdit?.createdAt || Date.now(),
      completedAt: taskToEdit?.completedAt,
    };

    onSave(newTask);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800 bg-neutral-900/80 sticky top-0 z-10 shrink-0">
          <div>
            <h2 className="text-xl font-light tracking-tight text-white">
              {isEditing ? "Edit Task" : "Create New Task"}
            </h2>
            <p className="text-[10px] text-neutral-500 font-mono mt-1 uppercase tracking-[0.2em]">Workspace Database</p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-white transition-colors p-2 hover:bg-neutral-800 rounded-xl cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - scrollable */}
        <form id="task-form" onSubmit={handleSubmit} className="p-6 space-y-8 overflow-y-auto custom-scrollbar flex-1">
          
          {/* Core Fields */}
          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-[0.2em] mb-2.5">
                Task Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Renew passport, buy medicines, exam preparation..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-[0.2em] mb-2.5">
                Objective & Description
              </label>
              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="What is the final outcome of this task?"
                rows={2}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all resize-none"
              />
            </div>
          </div>

          {/* Grid Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-[0.2em] mb-2.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-3 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-[0.2em] mb-2.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-3 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            {/* Stress Level Box */}
            <div>
              <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-[0.2em] mb-2.5">
                Stress Level {isEditing && <span className="text-red-500 font-bold ml-1">(LOCKED)</span>}
              </label>
              {isEditing ? (
                <div className="w-full bg-neutral-950 border border-neutral-800 text-neutral-500 rounded-xl py-3 px-4 text-sm flex items-center gap-2 cursor-not-allowed">
                  <span className="w-2.5 h-2.5 rounded-full bg-neutral-600"></span>
                  <span className="font-mono">{stressLevel}</span>
                </div>
              ) : (
                <select
                  value={stressLevel}
                  onChange={(e) => setStressLevel(e.target.value as StressLevel)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-3 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                >
                  {Object.values(StressLevel).map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              )}
              {!isEditing && (
                <span className="text-[10px] font-mono text-neutral-500 mt-2 block opacity-70">
                  Permanent after creation.
                </span>
              )}
            </div>
          </div>

          {/* Task Format selection */}
          <div className="space-y-2.5">
            <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-[0.2em]">
              Task Format Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Object.values(TaskType).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTaskType(type)}
                  className={`border p-4 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    taskType === type
                      ? "border-emerald-500/50 bg-emerald-500/5 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.05)]"
                      : "border-neutral-800 bg-neutral-950/50 text-neutral-400 hover:border-neutral-700 hover:bg-neutral-900"
                  }`}
                >
                  <span className="text-xs font-semibold uppercase tracking-wider">{type.split(" ")[0]}</span>
                  <span className="text-[10px] font-mono opacity-60 text-center leading-tight">
                    {type === TaskType.STANDARD && "Ordered sub-steps"}
                    {type === TaskType.CHECKLIST && "Simple list"}
                    {type === TaskType.SUPER && "Groups tasks"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Sub-steps Checklist */}
          {taskType !== TaskType.SUPER && (
            <div className="border border-neutral-800 rounded-xl p-5 bg-neutral-950/30 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-emerald-500/70" />
                  <span>Sub-steps ({steps.length})</span>
                </span>
              </div>

              {/* Add checklist item */}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newStepTitle}
                  onChange={(e) => setNewStepTitle(e.target.value)}
                  placeholder="Enter step title..."
                  className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg py-2.5 px-3 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addStep();
                    }
                  }}
                />
                <input
                  type="text"
                  value={newStepNote}
                  onChange={(e) => setNewStepNote(e.target.value)}
                  placeholder="Note (optional)"
                  className="sm:w-1/3 bg-neutral-900 border border-neutral-800 rounded-lg py-2.5 px-3 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addStep();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addStep}
                  className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </div>

              {/* Steps List */}
              {steps.length > 0 && (
                <div className="space-y-2 mt-4">
                  {steps.map((step, index) => (
                    <div
                      key={step.id}
                      className="flex items-center justify-between gap-3 p-3 bg-neutral-900/50 border border-neutral-800 rounded-lg group"
                    >
                      <div className="flex items-center gap-3">
                        {taskType === TaskType.STANDARD && (
                          <span className="font-mono text-[10px] text-neutral-500 bg-neutral-950 px-2 py-1 rounded">
                            {index + 1}
                          </span>
                        )}
                        <div className="flex flex-col">
                          <span className="text-sm text-neutral-200">{step.title}</span>
                          {step.note && (
                            <span className="text-xs text-neutral-500 mt-0.5">
                              {step.note}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeStep(step.id)}
                        className="text-neutral-600 hover:text-red-400 p-1.5 rounded hover:bg-neutral-800 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Super Task Child Selections */}
          {taskType === TaskType.SUPER && (
            <div className="border border-neutral-800 rounded-xl p-5 bg-neutral-950/30 space-y-4">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-[0.2em] block">
                Link independent child tasks
              </span>
              <p className="text-xs text-neutral-500 leading-relaxed">
                A Super Task is automatically compiled from independent child tasks. Its progress updates dynamically based on children.
              </p>

              {eligibleChildTasks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                  {eligibleChildTasks.map((ct) => {
                    const isSelected = selectedChildIds.includes(ct.id);
                    return (
                      <button
                        key={ct.id}
                        type="button"
                        onClick={() => toggleChildTaskSelection(ct.id)}
                        className={`text-left p-3.5 rounded-xl border text-sm transition-all cursor-pointer flex flex-col gap-2 ${
                          isSelected
                            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                            : "border-neutral-800 bg-neutral-900/50 text-neutral-400 hover:border-neutral-700 hover:bg-neutral-900"
                        }`}
                      >
                        <span className="font-medium text-neutral-200 truncate w-full">{ct.title}</span>
                        <div className="flex items-center gap-2 text-[10px] text-neutral-500 font-mono uppercase">
                          <span>{ct.category}</span>
                          <span>•</span>
                          <span className={isSelected ? "text-emerald-500/70" : ""}>{ct.progress}%</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-neutral-600 text-xs font-mono border border-dashed border-neutral-800 rounded-xl">
                  No independent active tasks available to link.
                </div>
              )}
            </div>
          )}

          {/* Scheduling Dates & Times */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="border border-neutral-800 rounded-xl p-5 bg-neutral-950/30 space-y-4">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-500/70" />
                <span>Scheduling</span>
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block mb-1.5">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>
            </div>

            <div className="border border-neutral-800 rounded-xl p-5 bg-neutral-950/30 space-y-4">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-500/70" />
                <span>Times</span>
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block mb-1.5">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block mb-1.5">Due Time</label>
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Recurrence and Expenses Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="border border-neutral-800 rounded-xl p-5 bg-neutral-950/30 space-y-4">
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-[0.2em]">
                Recurrence
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-3 px-3 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
              >
                {Object.values(RecurrenceType).map((rec) => (
                  <option key={rec} value={rec}>{rec}</option>
                ))}
              </select>

              {recurrence === RecurrenceType.CUSTOM && (
                <div>
                  <label className="block text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1.5">
                    Repeat Interval (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={customDays}
                    onChange={(e) => setCustomDays(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              )}
            </div>

            <div className="border border-neutral-800 rounded-xl p-5 bg-neutral-950/30 space-y-4">
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-[0.2em]">
                Expense Log
              </label>
              <select
                value={expenseMode}
                onChange={(e) => setExpenseMode(e.target.value as ExpenseMode)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-3 px-3 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
              >
                <option value={ExpenseMode.DIRECT}>Fixed Expense (Upfront)</option>
                <option value={ExpenseMode.AFTER_COMPLETION}>Variable (Enter after completion)</option>
              </select>

              {expenseMode === ExpenseMode.DIRECT && (
                <div>
                  <label className="block text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1.5">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="e.g. 1500"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Browser Notifications Reminder */}
          <div className="border border-neutral-800 rounded-xl p-5 bg-neutral-950/30">
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-[0.2em] mb-4">
              Push Notification Reminder
            </label>
            <select
              value={reminderTime}
              onChange={(e) => setReminderTime(Number(e.target.value))}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-3 px-3 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
            >
              <option value={-1}>No Reminder</option>
              <option value={0}>At time of event (Start Time)</option>
              <option value={10}>10 minutes before</option>
              <option value={30}>30 minutes before</option>
              <option value={60}>1 hour before</option>
            </select>
          </div>

        </form>

        {/* Footer Actions */}
        <div className="p-6 border-t border-neutral-800 bg-neutral-900/80 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="task-form"
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-black font-bold uppercase tracking-wider text-sm rounded-xl transition-all shadow-[0_4px_14px_rgba(16,185,129,0.15)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.25)] hover:-translate-y-0.5 cursor-pointer"
          >
            {isEditing ? "Save Changes" : "Create Task"}
          </button>
        </div>

      </motion.div>
    </div>
  );
}
