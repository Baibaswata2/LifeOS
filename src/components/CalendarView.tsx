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
      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        
        {/* Month Navigation Row */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-center text-indigo-600">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-light text-slate-900 tracking-tight">
              {monthNames[month]} {year}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setCurrentMonthDate(new Date());
                setSelectedDateStr(todayDateStr);
              }}
              className="px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-700 hover:bg-indigo-50 border border-indigo-200/50 rounded-xl cursor-pointer transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">
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

            const hasHighPriority = dayTasks.some((t) => t.priority === "High");

            return (
              <button
                key={`day-${day}`}
                onClick={() => setSelectedDateStr(dayStr)}
                className={`aspect-square rounded-xl p-2 flex flex-col justify-between items-center border transition-all duration-200 cursor-pointer relative hover:-translate-y-0.5 ${
                  isSelected
                    ? "bg-indigo-600 border-indigo-500 text-white font-bold shadow-md"
                    : isToday
                      ? "bg-transparent border-indigo-600 text-indigo-600 ring-1 ring-indigo-600/30 font-semibold"
                      : "bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-100/80"
                }`}
              >
                {/* Date Number */}
                <span className="text-sm font-mono font-medium mt-1">{day}</span>

                {/* Micro indicators */}
                <div className="flex gap-1 mb-1 h-1.5">
                  {hasTasks && (
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      isSelected 
                        ? "bg-white" 
                        : hasHighPriority 
                          ? "bg-red-500 animate-pulse" 
                          : "bg-indigo-600"
                    }`}></span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Info Legend */}
        <div className="flex items-center gap-6 text-[10px] font-mono text-slate-400 pt-6 mt-4 border-t border-slate-100 font-bold uppercase">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
            <span>Active Tasks</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span>High Priority</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 border border-indigo-600 rounded ring-1 ring-indigo-600/20"></span>
            <span>Current Day</span>
          </div>
        </div>

      </div>

      {/* Selected Day Task drawer */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between h-fit min-h-[500px] shadow-sm">
        
        <div className="space-y-4">
          <div className="border-b border-slate-100 pb-4 mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Schedule Log</span>
            <h3 className="text-lg font-light tracking-tight text-slate-900 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-indigo-600" />
              {selectedDateStr === todayDateStr ? "Today" : new Date(selectedDateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
          </div>

          {selectedDateTasks.length > 0 ? (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar animate-in fade-in duration-200">
              {selectedDateTasks.map((t) => {
                const isCompleted = t.status === TaskStatus.COMPLETED;
                return (
                  <div
                    key={t.id}
                    className="p-4 bg-slate-50/50 border border-slate-200 rounded-xl space-y-3 hover:border-slate-300 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 min-w-0">
                        <span className="inline-block px-2 py-0.5 rounded text-[9px] font-mono border uppercase border-slate-200 bg-white text-slate-500 font-bold">
                          {t.category}
                        </span>
                        <h4 className={`text-sm font-semibold transition-all duration-300 ${isCompleted ? "line-through text-slate-400 decoration-slate-350" : "text-slate-800"}`}>
                          {t.title}
                        </h4>
                      </div>

                      <button
                        onClick={() => handleDeleteTask(t.id)}
                        className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                        title="Delete task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-200/50 text-[10px] font-mono text-slate-400 uppercase font-bold">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {t.startTime || "Anytime"}
                      </span>

                      <button
                        onClick={() => handleToggleTask(t.id)}
                        className={`font-bold uppercase tracking-wider flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-[9px] border ${
                          isCompleted 
                            ? "bg-indigo-50 border-indigo-100 text-indigo-700" 
                            : "bg-white border-slate-200 text-slate-500 hover:border-indigo-200 hover:text-indigo-700"
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
            <div className="flex flex-col items-center justify-center text-center py-16 text-slate-400">
              <CalendarIcon className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-xs font-mono uppercase tracking-wider font-bold">No tasks scheduled.</p>
              <p className="text-xs mt-1 text-slate-500 leading-relaxed">Enjoy the breathing space.</p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 pt-5 text-center mt-6">
          <p className="text-[9px] font-mono text-slate-400 leading-relaxed uppercase tracking-widest font-bold">
            PMS System • Private Secure Space
          </p>
        </div>

      </div>

    </motion.div>
  );
}
