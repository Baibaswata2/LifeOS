/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Archive, Search, Lock, Calendar, DollarSign, ListChecks, CheckCircle } from "lucide-react";
import { Task, TaskStatus } from "../types";
import { motion } from "framer-motion";

interface ArchiveBrowserProps {
  tasks: Task[];
}

const CATEGORIES = ["All", "Academic", "Personal", "Health", "Official", "Utility", "Finance", "Social", "Shopping"];
const TASK_TYPES = ["All", "Standard Step Task", "Checklist Task", "Super Task"];

export default function ArchiveBrowser({ tasks }: ArchiveBrowserProps) {
  // Navigation & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState("All");
  const [selectedMonth, setSelectedMonth] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedType, setSelectedType] = useState("All");

  const archivedTasks = tasks.filter((t) => t.status === TaskStatus.ARCHIVED);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Derive available years and months from archived tasks
  const availableYears = Array.from(
    new Set(
      archivedTasks.map((t) => {
        const date = t.completedAt ? new Date(t.completedAt) : new Date(t.startDate);
        return String(date.getFullYear());
      })
    )
  ).sort();

  // Filter implementation
  const filteredArchive = archivedTasks.filter((t) => {
    const taskDate = t.completedAt ? new Date(t.completedAt) : new Date(t.startDate);
    const taskYear = String(taskDate.getFullYear());
    const taskMonthName = monthNames[taskDate.getMonth()];

    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (t.objective && t.objective.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesYear = selectedYear === "All" || taskYear === selectedYear;
    const matchesMonth = selectedMonth === "All" || taskMonthName === selectedMonth;
    const matchesCategory = selectedCategory === "All" || t.category === selectedCategory;
    const matchesType = selectedType === "All" || t.taskType === selectedType;

    return matchesSearch && matchesYear && matchesMonth && matchesCategory && matchesType;
  });

  // Calculate high-level archive historical statistics
  const totalArchivedCount = filteredArchive.length;
  const totalArchivedExpense = filteredArchive.reduce((acc, t) => acc + (t.expenseAmount || 0), 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-12"
    >
      
      {/* Archive Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-5 shadow-sm relative overflow-hidden">
        {/* Subtle glow in background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mt-20 -mr-20 pointer-events-none" />
        
        <div className="w-14 h-14 bg-slate-50 border border-slate-150 rounded-2xl flex items-center justify-center text-slate-500 shrink-0 relative z-10 shadow-sm">
          <Archive className="w-7 h-7" />
        </div>
        <div className="space-y-1.5 relative z-10">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800">Vault Archive Browser</h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xl font-medium">
            Archived items are completely immutable and sealed as read-only. Editing, checklist toggles, and push-notifications are disabled.
          </p>
        </div>
      </div>

      {/* Historical Ledger Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl flex items-center justify-between group hover:border-slate-300 transition-colors shadow-sm">
          <div>
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-widest block">Total Archived</span>
            <span className="text-2xl font-light font-mono text-slate-800 mt-1 block uppercase tracking-wider font-semibold">{totalArchivedCount}</span>
          </div>
          <Lock className="w-5 h-5 text-slate-400 group-hover:text-slate-500 transition-colors" />
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl flex items-center justify-between group hover:border-slate-300 transition-colors shadow-sm">
          <div>
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-widest block">Archive Budget</span>
            <span className="text-2xl font-light font-mono text-slate-800 mt-1 block font-semibold">₹{totalArchivedExpense}</span>
          </div>
          <DollarSign className="w-5 h-5 text-slate-400 group-hover:text-slate-500 transition-colors" />
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-widest block">Core Integrity</span>
            <span className="text-2xl font-light font-mono text-indigo-600 mt-1 block uppercase tracking-wider font-bold">100% Sealed</span>
          </div>
          <CheckCircle className="w-5 h-5 text-indigo-500" />
        </div>
      </div>

      {/* Multi-Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="relative w-full lg:w-1/3">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search historical records..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/10 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto font-mono font-bold">
            
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 focus-within:border-indigo-600 transition-colors">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Year</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent border-none text-xs text-slate-700 focus:outline-none cursor-pointer uppercase tracking-wider w-full"
              >
                <option value="All" className="bg-white text-slate-700">All</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr} className="bg-white text-slate-700">{yr}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 focus-within:border-indigo-600 transition-colors">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Month</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent border-none text-xs text-slate-700 focus:outline-none cursor-pointer uppercase tracking-wider w-full"
              >
                <option value="All" className="bg-white text-slate-700">All</option>
                {monthNames.map((m) => (
                  <option key={m} value={m} className="bg-white text-slate-700">{m.slice(0,3)}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 focus-within:border-indigo-600 transition-colors">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Cat</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent border-none text-xs text-slate-700 focus:outline-none cursor-pointer uppercase tracking-wider w-full"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-white text-slate-700">{c === "All" ? "All" : c}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 focus-within:border-indigo-600 transition-colors">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Type</span>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-transparent border-none text-xs text-slate-700 focus:outline-none cursor-pointer uppercase tracking-wider w-full"
              >
                {TASK_TYPES.map((t) => (
                  <option key={t} value={t} className="bg-white text-slate-700">{t === "All" ? "All" : t.split(" ")[0]}</option>
                ))}
              </select>
            </div>

          </div>
        </div>
      </div>

      {/* Sealed Archive Table list */}
      <div className="space-y-4">
        {filteredArchive.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredArchive.map((task) => {
              const date = task.completedAt ? new Date(task.completedAt) : new Date(task.startDate);
              const formattedDate = `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
              return (
                <div
                  key={task.id}
                  className="bg-slate-50/50 border border-slate-200 p-6 rounded-2xl shadow-sm relative overflow-hidden flex flex-col justify-between transition-all hover:border-slate-300"
                >
                  <div className="space-y-3 relative z-10">
                    
                    {/* Top Row Indicators */}
                    <div className="flex items-center justify-between text-[9px] font-mono font-bold">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md border border-slate-200 bg-white text-slate-500 uppercase tracking-wider">
                          {task.category}
                        </span>
                        <span className="px-2 py-0.5 rounded-md border border-slate-200 bg-white text-slate-500 uppercase tracking-wider">
                          {task.taskType}
                        </span>
                      </div>
                      <span className="text-slate-400 flex items-center gap-1.5 uppercase tracking-widest font-bold">
                        <Lock className="w-3.5 h-3.5 text-slate-300" /> Sealed
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-semibold text-slate-800 tracking-tight">
                      {task.title}
                    </h3>

                    {task.objective && (
                      <p className="text-sm text-slate-500 leading-relaxed font-medium">
                        {task.objective}
                      </p>
                    )}

                    {/* Steps Completed indicator */}
                    {task.steps.length > 0 && (
                      <div className="space-y-2 py-2">
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest flex items-center gap-1.5 font-bold">
                          <ListChecks className="w-3.5 h-3.5" />
                          <span>Sealed steps ({task.steps.length}/{task.steps.length} complete)</span>
                        </span>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {task.steps.map(s => (
                            <span key={s.id} className="text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-400 line-through decoration-slate-200 font-medium">
                              ✓ {s.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Footer Row */}
                  <div className="flex items-center justify-between pt-5 mt-5 border-t border-slate-200/60 text-[10px] font-mono text-slate-400 uppercase tracking-wider relative z-10 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      Sealed: {formattedDate}
                    </span>

                    {task.expenseAmount !== undefined && task.expenseAmount > 0 && (
                      <span className="text-slate-600 font-bold bg-white px-2.5 py-1 border border-slate-200 rounded-lg">
                        ₹{task.expenseAmount}
                      </span>
                    )}
                  </div>

                  {/* Watermark Logo */}
                  <div className="absolute -bottom-6 -right-6 text-slate-200 opacity-20 pointer-events-none">
                    <Archive className="w-32 h-32" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center space-y-4 shadow-sm">
            <Archive className="w-12 h-12 text-slate-300 opacity-50" />
            <span className="text-xs font-mono text-slate-400 uppercase tracking-widest block font-bold">Archive vault is silent</span>
            <p className="text-xs text-slate-500 max-w-sm mx-auto px-4 leading-relaxed font-medium">
              Complete active tasks on your main dashboard to populate this read-only repository.
            </p>
          </div>
        )}
      </div>

    </motion.div>
  );
}
