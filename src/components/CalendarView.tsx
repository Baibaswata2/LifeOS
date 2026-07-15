/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle2, Clock, Trash2 } from "lucide-react";
import { Task, TaskStatus } from "../types";
import { motion } from "framer-motion";

interface CalendarViewProps {
  tasks: Task[];
  onTasksUpdated: (newTasks: Task[]) => void;
}

export default function CalendarView({ tasks, onTasksUpdated }: CalendarViewProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // update every minute is fine for calendar
    return () => clearInterval(timer);
  }, []);

  const todayDateStr = currentTime.toISOString().split('T')[0];
  
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(todayDateStr);

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Calendar Grid Math
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);

  // Month navigation
  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 15));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 15));
  };

  // Helper to format date string from numbers
  const formatDateString = (y: number, m: number, d: number) => {
    const formattedM = String(m + 1).padStart(2, "0");
    const formattedD = String(d).padStart(2, "0");
    return `${y}-${formattedM}-${formattedD}`;
  };

  // Find tasks scheduled on a specific date
  const getTasksForDate = (dateStr: string) => {
    return tasks.filter((t) => t.startDate === dateStr && t.status !== TaskStatus.ARCHIVED);
  };

  // Selected date tasks
  const selectedDateTasks = getTasksForDate(selectedDateStr);

  const handleDeleteTask = (taskId: string) => {
    const updated = tasks.filter((t) => t.id !== taskId);
    onTasksUpdated(updated);
  };

  const handleToggleTask = (taskId: string) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const nextStatus = t.status === TaskStatus.COMPLETED ? TaskStatus.INCOMPLETE : TaskStatus.COMPLETED;
        return {
          ...t,
          status: nextStatus,
          progress: nextStatus === TaskStatus.COMPLETED ? 100 : 0,
          completedAt: nextStatus === TaskStatus.COMPLETED ? Date.now() : undefined
        };
      }
      return t;
    });
    onTasksUpdated(updated);
  };

  // Generate calendar days array
  const calendarDays = [];
  // Padding for previous month days
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }
  // Days of current month
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d);
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12"
    >
      
      {/* Calendar Grid Controller Card */}
      <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-sm">
        
        {/* Month Navigation Row */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-5 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-emerald-500" />
            </div>
            <h2 className="text-xl font-light text-white tracking-tight">
              {monthNames[month]} {year}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800 rounded-lg cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setCurrentMonthDate(new Date());
                setSelectedDateStr(todayDateStr);
              }}
              className="px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-500 hover:bg-emerald-500/10 border border-emerald-500/20 rounded-lg cursor-pointer transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800 rounded-lg cursor-pointer transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-semibold text-neutral-500 uppercase tracking-[0.2em] mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="py-2">{day}</div>
          ))}
        </div>

        {/* Grid Cells */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="aspect-square opacity-0"></div>;
            }

            const dayStr = formatDateString(year, month, day);
            const isToday = dayStr === todayDateStr;
            const isSelected = dayStr === selectedDateStr;
            const dayTasks = getTasksForDate(dayStr);
            const hasTasks = dayTasks.length > 0;

            // Separate high priority tasks
            const hasHighPriority = dayTasks.some((t) => t.priority === "High");

            return (
              <button
                key={`day-${day}`}
                onClick={() => setSelectedDateStr(dayStr)}
                className={`aspect-square rounded-xl p-2 flex flex-col justify-between items-center border transition-all duration-200 cursor-pointer relative hover:-translate-y-0.5 ${
                  isSelected
                    ? "bg-emerald-600 border-emerald-500 text-black font-bold shadow-[0_4px_15px_rgba(16,185,129,0.2)]"
                    : isToday
                      ? "bg-transparent border-emerald-500 text-emerald-500 ring-1 ring-emerald-500/50"
                      : "bg-neutral-950 border-neutral-800/80 hover:border-neutral-700 text-neutral-300 hover:bg-neutral-900"
                }`}
              >
                {/* Date Number */}
                <span className="text-sm font-mono font-medium mt-1">{day}</span>

                {/* Micro indicators */}
                <div className="flex gap-1 mb-1 h-1.5">
                  {hasTasks && (
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      isSelected 
                        ? "bg-black" 
                        : hasHighPriority 
                          ? "bg-red-500 animate-pulse" 
                          : "bg-emerald-500"
                    }`}></span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Info Legend */}
        <div className="flex items-center gap-6 text-[10px] font-mono text-neutral-500 pt-6 mt-4 border-t border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
            <span>Active Tasks</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
            <span>High Priority</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 border border-emerald-500 rounded ring-1 ring-emerald-500/20"></span>
            <span>Current Day</span>
          </div>
        </div>

      </div>

      {/* Selected Day Task drawer */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 flex flex-col justify-between h-fit min-h-[500px] shadow-sm">
        
        <div className="space-y-4">
          <div className="border-b border-neutral-800 pb-4 mb-2">
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-[0.2em] block mb-1">Schedule Log</span>
            <h3 className="text-lg font-medium tracking-tight text-white flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-emerald-500" />
              {selectedDateStr === todayDateStr ? "Today" : new Date(selectedDateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
          </div>

          {selectedDateTasks.length > 0 ? (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {selectedDateTasks.map((t) => {
                const isCompleted = t.status === TaskStatus.COMPLETED;
                return (
                  <div
                    key={t.id}
                    className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-3 hover:border-neutral-700 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 min-w-0">
                        <span className="inline-block px-2 py-0.5 rounded text-[9px] font-mono border uppercase border-neutral-800 bg-neutral-900 text-neutral-400">
                          {t.category}
                        </span>
                        <h4 className={`text-sm font-medium transition-all duration-300 ${isCompleted ? "line-through text-neutral-600 decoration-neutral-600/50" : "text-neutral-200"}`}>
                          {t.title}
                        </h4>
                      </div>

                      <button
                        onClick={() => handleDeleteTask(t.id)}
                        className="text-neutral-600 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-neutral-800/40 text-[10px] font-mono text-neutral-500">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {t.startTime || "Anytime"}
                      </span>

                      <button
                        onClick={() => handleToggleTask(t.id)}
                        className={`font-bold uppercase tracking-wider flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                          isCompleted ? "bg-emerald-500/10 text-emerald-500" : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-emerald-400"
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isCompleted ? "Done" : "Mark"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-16 text-neutral-500">
              <CalendarIcon className="w-12 h-12 text-neutral-800 mb-4" />
              <p className="text-xs font-mono">No tasks scheduled for this day.</p>
              <p className="text-xs font-mono mt-1 opacity-70">Enjoy the breathing space.</p>
            </div>
          )}
        </div>

        <div className="border-t border-neutral-800 pt-5 text-center mt-6">
          <p className="text-[9px] font-mono text-neutral-600 leading-relaxed uppercase tracking-[0.2em]">
            PMS System • Private Secure Space
          </p>
        </div>

      </div>

    </motion.div>
  );
}
