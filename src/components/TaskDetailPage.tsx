import React, { useState } from "react";
import { ArrowLeft, Plus, Trash2, Calendar, Clock, RefreshCw, IndianRupee, Star, ShieldAlert, ArrowUpDown, CheckSquare, Square, ChevronRight } from "lucide-react";
import { Task, TaskStep, TaskType, StressLevel, RecurrenceType, ExpenseMode, TaskStatus } from "../types";
import { motion, AnimatePresence } from "framer-motion";

interface TaskDetailPageProps {
  task: Task;
  onClose: () => void;
  onTasksUpdated: (updatedTasks: Task[]) => void;
  allTasks: Task[];
  triggerAction: (title: string, successMessage: string, actionFn: () => Promise<void> | void) => Promise<void>;
}

export default function TaskDetailPage({
  task,
  onClose,
  onTasksUpdated,
  allTasks,
  triggerAction
}: TaskDetailPageProps) {
  const [newStepTitle, setNewStepTitle] = useState("");
  const [newStepNote, setNewStepNote] = useState("");
  const [stepSortOrder, setStepSortOrder] = useState<"old-to-new" | "new-to-old">("old-to-new");

  // Local helper to calculate progress when steps change
  const recalculateProgress = (updatedSteps: TaskStep[]) => {
    if (updatedSteps.length === 0) return 0;
    const completed = updatedSteps.filter((s) => s.completed).length;
    return Math.round((completed / updatedSteps.length) * 100);
  };

  const handleStepToggle = (stepId: string) => {
    triggerAction(
      "Updating Step",
      "Step progress updated successfully",
      async () => {
        const updatedSteps = task.steps.map((s) =>
          s.id === stepId ? { ...s, completed: !s.completed } : s
        );
        const progress = recalculateProgress(updatedSteps);
        
        // If all steps completed, does it complete the task?
        // Let's keep it as is - the user can mark the task as fully completed on the main card.
        const updatedTask: Task = {
          ...task,
          steps: updatedSteps,
          progress
        };

        const nextTasks = allTasks.map((t) => (t.id === task.id ? updatedTask : t));
        onTasksUpdated(nextTasks);
      }
    );
  };

  const handleAddStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStepTitle.trim()) return;

    triggerAction(
      "Adding Step",
      `Step "${newStepTitle.trim()}" added`,
      async () => {
        const newStep: TaskStep = {
          id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          title: newStepTitle.trim(),
          note: newStepNote.trim() || undefined,
          completed: false,
        };

        const updatedSteps = [...task.steps, newStep];
        const progress = recalculateProgress(updatedSteps);

        const updatedTask: Task = {
          ...task,
          steps: updatedSteps,
          progress
        };

        const nextTasks = allTasks.map((t) => (t.id === task.id ? updatedTask : t));
        onTasksUpdated(nextTasks);
        setNewStepTitle("");
        setNewStepNote("");
      }
    );
  };

  const handleRemoveStep = (stepId: string, stepTitle: string) => {
    triggerAction(
      "Removing Step",
      `Step "${stepTitle}" removed`,
      async () => {
        const updatedSteps = task.steps.filter((s) => s.id !== stepId);
        const progress = recalculateProgress(updatedSteps);

        const updatedTask: Task = {
          ...task,
          steps: updatedSteps,
          progress
        };

        const nextTasks = allTasks.map((t) => (t.id === task.id ? updatedTask : t));
        onTasksUpdated(nextTasks);
      }
    );
  };

  // Steps sorting logic
  const sortedSteps = [...task.steps];
  if (stepSortOrder === "new-to-old") {
    sortedSteps.reverse();
  }

  const isCompleted = task.status === TaskStatus.COMPLETED;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-4xl mx-auto space-y-6 pb-12"
    >
      {/* Back Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-neutral-600 hover:text-emerald-700 bg-white border border-neutral-200 hover:border-emerald-200 px-4 py-2 rounded-xl text-sm transition-all cursor-pointer shadow-sm hover:shadow"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium">Back to Dashboard</span>
        </button>

        <div className="flex items-center gap-2 font-mono text-[10px] text-neutral-400 uppercase tracking-widest bg-neutral-100/50 px-3 py-1.5 rounded-lg border border-neutral-200">
          <span>Core Module</span>
          <span>•</span>
          <span className="text-emerald-600 font-bold">Active Detail</span>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Side: Task Meta Information */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-5">
            <div>
              <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block mb-1">
                Category
              </span>
              <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-xs font-semibold uppercase tracking-wider">
                {task.category}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block mb-1">
                Priority
              </span>
              <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-lg border ${
                task.priority === "High" 
                  ? "bg-red-50 text-red-700 border-red-100" 
                  : task.priority === "Medium"
                    ? "bg-amber-50 text-amber-700 border-amber-100"
                    : "bg-neutral-50 text-neutral-600 border-neutral-200"
              }`}>
                {task.priority} Priority
              </span>
            </div>

            <div>
              <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block mb-1">
                Stress Load Rating
              </span>
              <div className="flex items-center gap-1.5 text-sm text-neutral-700 font-mono mt-1">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="font-semibold">{task.stressLevel}</span>
              </div>
            </div>

            <div className="border-t border-neutral-100 pt-4 space-y-3">
              <div className="flex items-center gap-2.5 text-neutral-600 text-xs font-mono">
                <Calendar className="w-4 h-4 text-neutral-400" />
                <span>Starts: {task.startDate}</span>
              </div>
              <div className="flex items-center gap-2.5 text-neutral-600 text-xs font-mono">
                <Clock className="w-4 h-4 text-neutral-400" />
                <span>Time: {task.startTime || "Anytime"}</span>
              </div>
              <div className="flex items-center gap-2.5 text-neutral-600 text-xs font-mono">
                <Calendar className="w-4 h-4 text-neutral-400" />
                <span>Due Date: {task.dueDate}</span>
              </div>
              {task.recurrence && task.recurrence !== RecurrenceType.NONE && (
                <div className="flex items-center gap-2.5 text-emerald-700 text-xs font-mono bg-emerald-50/55 p-2 rounded-lg border border-emerald-100/50">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Repeats {task.recurrence}</span>
                </div>
              )}
            </div>

            {task.expenseAmount !== undefined && (
              <div className="border-t border-neutral-100 pt-4">
                <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block mb-1">
                  Budget Ledger
                </span>
                <div className="flex items-center gap-1.5 text-lg font-mono font-bold text-emerald-600">
                  <IndianRupee className="w-4.5 h-4.5" />
                  <span>{task.expenseAmount}</span>
                  <span className="text-[10px] text-neutral-400 font-normal ml-1">
                    ({task.expenseMode === ExpenseMode.DIRECT ? "Upfront" : "Variable"})
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Title, Objectives, and Checklist */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-6">
            
            {/* Title & Stats */}
            <div className="space-y-3">
              <h1 className={`text-2xl font-light tracking-tight text-neutral-900 ${isCompleted ? "line-through text-neutral-400" : ""}`}>
                {task.title}
              </h1>
              {task.objective && (
                <p className="text-sm text-neutral-500 leading-relaxed bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                  {task.objective}
                </p>
              )}
            </div>

            {/* Progress Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-neutral-500 font-medium uppercase tracking-wider">Completion progress</span>
                <span className="text-emerald-600 font-bold">{task.progress}%</span>
              </div>
              <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden border border-neutral-200/50">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            </div>

            {/* Checklist Section */}
            {task.taskType !== TaskType.SUPER && (
              <div className="border-t border-neutral-100 pt-6 space-y-4">
                
                {/* Header with Sorting */}
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-[0.2em]">
                    Task Steps Checklist
                  </h3>

                  <button
                    onClick={() => setStepSortOrder(prev => prev === "old-to-new" ? "new-to-old" : "old-to-new")}
                    className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-500 hover:text-emerald-700 bg-neutral-50 border border-neutral-200 hover:border-emerald-200 px-2 py-1 rounded-md transition-colors cursor-pointer"
                  >
                    <ArrowUpDown className="w-3 h-3" />
                    <span>Sorting: {stepSortOrder === "old-to-new" ? "Old to New" : "New to Old"}</span>
                  </button>
                </div>

                {/* Steps List */}
                <div className="space-y-2.5">
                  {sortedSteps.length > 0 ? (
                    sortedSteps.map((step, index) => {
                      const displayIndex = stepSortOrder === "old-to-new" ? index + 1 : task.steps.length - index;
                      return (
                        <div
                          key={step.id}
                          className="flex items-start justify-between gap-4 p-3.5 bg-neutral-50/50 hover:bg-neutral-50 border border-neutral-200/60 rounded-xl transition-all group"
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            {/* Checkbox */}
                            <button
                              onClick={() => handleStepToggle(step.id)}
                              className="text-neutral-400 hover:text-emerald-600 mt-0.5 cursor-pointer flex-shrink-0 transition-colors"
                            >
                              {step.completed ? (
                                <CheckSquare className="w-4.5 h-4.5 text-emerald-500 fill-emerald-50" />
                              ) : (
                                <Square className="w-4.5 h-4.5" />
                              )}
                            </button>

                            {/* Info */}
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              {task.taskType === TaskType.STANDARD && (
                                <span className="font-mono text-[9px] font-semibold text-neutral-400 bg-neutral-100 border border-neutral-200/50 px-1.5 py-0.5 rounded mt-0.5">
                                  {displayIndex}
                                </span>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm text-neutral-800 font-medium ${step.completed ? "line-through text-neutral-400 decoration-neutral-300" : ""}`}>
                                  {step.title}
                                </p>
                                {step.note && (
                                  <p className="text-xs text-neutral-500 mt-1 pl-1 border-l-2 border-neutral-200">
                                    {step.note}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleRemoveStep(step.id, step.title)}
                            className="text-neutral-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                            title="Remove Step"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 border border-dashed border-neutral-200 rounded-xl text-neutral-400 text-xs font-mono">
                      No steps defined for this task yet.
                    </div>
                  )}
                </div>

                {/* Add Step Inline Form */}
                <form onSubmit={handleAddStep} className="bg-neutral-50 p-4 border border-neutral-200 rounded-xl space-y-3">
                  <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest block">
                    Add Custom Step
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={newStepTitle}
                      onChange={(e) => setNewStepTitle(e.target.value)}
                      placeholder="Step title (e.g. Gather document)"
                      className="w-full bg-white border border-neutral-200 rounded-lg py-2 px-3 text-xs text-neutral-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                    />
                    <input
                      type="text"
                      value={newStepNote}
                      onChange={(e) => setNewStepNote(e.target.value)}
                      placeholder="Optional notes or details"
                      className="w-full bg-white border border-neutral-200 rounded-lg py-2 px-3 text-xs text-neutral-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                    />
                  </div>
                  
                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={!newStepTitle.trim()}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Step</span>
                    </button>
                  </div>
                </form>

              </div>
            )}

            {/* Linked Children Tasks for Super Tasks */}
            {task.taskType === TaskType.SUPER && (
              <div className="border-t border-neutral-100 pt-6 space-y-4">
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-[0.2em]">
                  Linked child tasks
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {allTasks.filter(t => task.childTaskIds?.includes(t.id)).map(ct => (
                    <div 
                      key={ct.id}
                      className="p-4 border border-neutral-200 rounded-xl bg-neutral-50 flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-neutral-800 truncate">{ct.title}</p>
                        <p className="text-[10px] font-mono text-neutral-400 uppercase mt-0.5">{ct.category}</p>
                      </div>
                      <div className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-1 border border-emerald-100 rounded-md">
                        {ct.status === TaskStatus.COMPLETED ? "100%" : `${ct.progress}%`}
                      </div>
                    </div>
                  ))}
                  {(!task.childTaskIds || task.childTaskIds.length === 0) && (
                    <div className="text-center py-6 border border-dashed border-neutral-200 rounded-xl text-neutral-400 text-xs font-mono col-span-2">
                      No child tasks linked.
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </motion.div>
  );
}
