/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Calendar, Clock, ListChecks } from "lucide-react";
import { Task, TaskStep, TaskType, StressLevel, RecurrenceType, ExpenseMode, TaskStatus } from "../types";
import { motion } from "framer-motion";

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
      stressLevel,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full max-w-2xl bg-white border border-neutral-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-100 bg-white sticky top-0 z-10 shrink-0">
          <div>
            <h2 className="text-xl font-light tracking-tight text-neutral-900">
              {isEditing ? "Edit Task" : "Create New Task"}
            </h2>
            <p className="text-[10px] text-neutral-400 font-bold mt-1.5 uppercase tracking-[0.2em] font-mono">Workspace Database</p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 transition-colors p-2 hover:bg-neutral-50 rounded-xl cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - scrollable */}
        <form id="task-form" onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          
          {/* Core Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">
                Task Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Renew passport, buy medicines, exam preparation..."
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-3 px-4 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/15 transition-all"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">
                Objective & Description
              </label>
              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="What is the final outcome of this task?"
                rows={2}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-3 px-4 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/15 transition-all resize-none"
              />
            </div>
          </div>

          {/* Grid Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-3 px-3 text-sm text-neutral-800 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/15 transition-all"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-3 px-3 text-sm text-neutral-800 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/15 transition-all"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            {/* Stress Level Box */}
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">
                Stress Level {isEditing && <span className="text-red-500 font-bold ml-1">(LOCKED)</span>}
              </label>
              {isEditing ? (
                <div className="w-full bg-neutral-50 border border-neutral-200 text-neutral-400 rounded-xl py-3 px-4 text-sm flex items-center gap-2 cursor-not-allowed">
                  <span className="w-2.5 h-2.5 rounded-full bg-neutral-300"></span>
                  <span className="font-mono font-bold text-xs">{stressLevel}</span>
                </div>
              ) : (
                <select
                  value={stressLevel}
                  onChange={(e) => setStressLevel(e.target.value as StressLevel)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-3 px-3 text-sm text-neutral-800 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/15 transition-all"
                >
                  {Object.values(StressLevel).map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              )}
              {!isEditing && (
                <span className="text-[9px] font-mono font-bold text-neutral-400 mt-2 block uppercase tracking-wider">
                  Permanent after creation.
                </span>
              )}
            </div>
          </div>

          {/* Task Format selection */}
          <div className="space-y-2.5">
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
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
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm"
                      : "border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50 hover:border-neutral-300"
                  }`}
                >
                  <span className="text-xs font-bold uppercase tracking-wider">{type.split(" ")[0]}</span>
                  <span className="text-[10px] font-mono opacity-80 text-center leading-tight">
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
            <div className="border border-neutral-200 rounded-2xl p-5 bg-neutral-50/50 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-emerald-600" />
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
                  className="flex-1 bg-white border border-neutral-200 rounded-lg py-2.5 px-3 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-indigo-600 transition-colors"
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
                  className="sm:w-1/3 bg-white border border-neutral-200 rounded-lg py-2.5 px-3 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-indigo-600 transition-colors"
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
                  className="bg-neutral-850 hover:bg-neutral-700 text-white text-xs uppercase font-bold px-4 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
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
                      className="flex items-center justify-between gap-3 p-3 bg-white border border-neutral-200 rounded-xl group"
                    >
                      <div className="flex items-center gap-3">
                        {taskType === TaskType.STANDARD && (
                          <span className="font-mono text-[9px] font-bold text-neutral-400 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded">
                            {index + 1}
                          </span>
                        )}
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-neutral-700">{step.title}</span>
                          {step.note && (
                            <span className="text-xs text-neutral-400 font-medium">
                              {step.note}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeStep(step.id)}
                        className="text-neutral-400 hover:text-red-500 p-1.5 rounded hover:bg-neutral-50 transition-colors opacity-0 group-hover:opacity-100"
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
            <div className="border border-neutral-200 rounded-2xl p-5 bg-neutral-50/50 space-y-4">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest block">
                Link independent child tasks
              </span>
              <p className="text-xs text-neutral-500 leading-relaxed font-medium">
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
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                            : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300 hover:bg-neutral-50"
                        }`}
                      >
                        <span className="font-semibold text-neutral-800 truncate w-full">{ct.title}</span>
                        <div className="flex items-center gap-2 text-[9px] text-neutral-400 font-bold font-mono uppercase">
                          <span>{ct.category}</span>
                          <span>•</span>
                          <span className={isSelected ? "text-indigo-700" : ""}>{ct.progress}%</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-neutral-400 text-xs font-mono font-bold border border-dashed border-neutral-200 rounded-xl">
                  No independent active tasks available to link.
                </div>
              )}
            </div>
          )}

          {/* Scheduling Dates & Times */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="border border-neutral-200 rounded-2xl p-5 bg-neutral-50/50 space-y-4">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>Scheduling</span>
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5 font-mono">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5 font-mono">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>
            </div>

            <div className="border border-neutral-200 rounded-2xl p-5 bg-neutral-50/50 space-y-4">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Times</span>
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5 font-mono">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5 font-mono">Due Time</label>
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Recurrence and Expenses Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="border border-neutral-200 rounded-2xl p-5 bg-neutral-50/50 space-y-4">
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest">
                Recurrence
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
                className="w-full bg-white border border-neutral-200 rounded-lg py-3 px-3 text-sm text-neutral-850 focus:outline-none focus:border-indigo-600 transition-colors"
              >
                {Object.values(RecurrenceType).map((rec) => (
                  <option key={rec} value={rec}>{rec}</option>
                ))}
              </select>

              {recurrence === RecurrenceType.CUSTOM && (
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 font-mono">
                    Repeat Interval (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={customDays}
                    onChange={(e) => setCustomDays(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-white border border-neutral-200 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              )}
            </div>

            <div className="border border-neutral-200 rounded-2xl p-5 bg-neutral-50/50 space-y-4">
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest">
                Expense Log
              </label>
              <select
                value={expenseMode}
                onChange={(e) => setExpenseMode(e.target.value as ExpenseMode)}
                className="w-full bg-white border border-neutral-200 rounded-lg py-3 px-3 text-sm text-neutral-850 focus:outline-none focus:border-indigo-600 transition-colors"
              >
                <option value={ExpenseMode.DIRECT}>Fixed Expense (Upfront)</option>
                <option value={ExpenseMode.AFTER_COMPLETION}>Variable (Enter after completion)</option>
              </select>

              {expenseMode === ExpenseMode.DIRECT && (
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 font-mono">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="e.g. 1500"
                    className="w-full bg-white border border-neutral-200 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Browser Notifications Reminder */}
          <div className="border border-neutral-200 rounded-2xl p-5 bg-neutral-50/50">
            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4">
              Push Notification Reminder
            </label>
            <select
              value={reminderTime}
              onChange={(e) => setReminderTime(Number(e.target.value))}
              className="w-full bg-white border border-neutral-200 rounded-lg py-3 px-3 text-sm text-neutral-850 focus:outline-none focus:border-indigo-600 transition-colors"
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
        <div className="p-6 border-t border-neutral-100 bg-neutral-50/50 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="task-form"
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-wider text-xs rounded-xl transition-all shadow-md cursor-pointer font-mono"
          >
            {isEditing ? "Save Changes" : "Create Task"}
          </button>
        </div>

      </motion.div>
    </div>
  );
}
