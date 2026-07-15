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
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center gap-5 shadow-sm relative overflow-hidden">
        {/* Subtle sepia glow in background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#78716c]/5 rounded-full blur-3xl -mt-20 -mr-20 pointer-events-none" />
        
        <div className="w-14 h-14 bg-neutral-800 border border-neutral-700 rounded-2xl flex items-center justify-center text-neutral-400 shrink-0 relative z-10 shadow-inner">
          <Archive className="w-7 h-7" />
        </div>
        <div className="space-y-1.5 relative z-10">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">Vault Archive Browser</h2>
          <p className="text-xs text-neutral-500 leading-relaxed max-w-xl">
            Archived items are completely immutable and sealed as read-only. Editing, checklist toggles, and push-notifications are disabled.
          </p>
        </div>
      </div>

      {/* Historical Ledger Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl flex items-center justify-between group hover:border-neutral-700 transition-colors">
          <div>
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block">Total Archived</span>
            <span className="text-2xl font-light font-mono text-white mt-1 block uppercase tracking-wider">{totalArchivedCount}</span>
          </div>
          <Lock className="w-5 h-5 text-neutral-600 group-hover:text-neutral-500 transition-colors" />
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl flex items-center justify-between group hover:border-neutral-700 transition-colors">
          <div>
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block">Archive Budget</span>
            <span className="text-2xl font-light font-mono text-white mt-1 block">₹{totalArchivedExpense}</span>
          </div>
          <DollarSign className="w-5 h-5 text-neutral-600 group-hover:text-neutral-500 transition-colors" />
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block">Core Integrity</span>
            <span className="text-2xl font-light font-mono text-emerald-500 mt-1 block uppercase tracking-wider">100% Sealed</span>
          </div>
          <CheckCircle className="w-5 h-5 text-emerald-600/50" />
        </div>
      </div>

      {/* Multi-Filter Bar */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="relative w-full lg:w-1/3">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search historical records..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-neutral-200 focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-700 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto font-mono">
            
            <div className="flex items-center gap-2 bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-800/80 focus-within:border-neutral-600 transition-colors">
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Year</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent border-none text-xs text-neutral-300 focus:outline-none cursor-pointer uppercase tracking-wider w-full"
              >
                <option value="All" className="bg-neutral-900 text-neutral-300">All</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr} className="bg-neutral-900 text-neutral-300">{yr}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-800/80 focus-within:border-neutral-600 transition-colors">
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Month</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent border-none text-xs text-neutral-300 focus:outline-none cursor-pointer uppercase tracking-wider w-full"
              >
                <option value="All" className="bg-neutral-900 text-neutral-300">All</option>
                {monthNames.map((m) => (
                  <option key={m} value={m} className="bg-neutral-900 text-neutral-300">{m.slice(0,3)}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-800/80 focus-within:border-neutral-600 transition-colors">
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Cat</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent border-none text-xs text-neutral-300 focus:outline-none cursor-pointer uppercase tracking-wider w-full"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-neutral-900 text-neutral-300">{c === "All" ? "All" : c}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-800/80 focus-within:border-neutral-600 transition-colors">
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Type</span>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-transparent border-none text-xs text-neutral-300 focus:outline-none cursor-pointer uppercase tracking-wider w-full"
              >
                {TASK_TYPES.map((t) => (
                  <option key={t} value={t} className="bg-neutral-900 text-neutral-300">{t === "All" ? "All" : t.split(" ")[0]}</option>
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
                  className="bg-[#141311] border border-[#292524] p-6 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between sepia-tint"
                >
                  <div className="space-y-3 relative z-10">
                    
                    {/* Top Row Indicators */}
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded-md border border-[#44403c] bg-[#1c1917] text-[#a8a29e] uppercase tracking-wider">
                          {task.category}
                        </span>
                        <span className="px-2 py-1 rounded-md border border-[#44403c] bg-[#1c1917] text-[#a8a29e] uppercase tracking-wider">
                          {task.taskType}
                        </span>
                      </div>
                      <span className="text-[#a8a29e] flex items-center gap-1.5 uppercase tracking-wider font-bold">
                        <Lock className="w-3.5 h-3.5 text-[#78716c]" /> Sealed
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-medium text-[#e7e5e4] tracking-tight transition-colors">
                      {task.title}
                    </h3>

                    {task.objective && (
                      <p className="text-sm text-[#a8a29e] leading-relaxed">
                        {task.objective}
                      </p>
                    )}

                    {/* Steps Completed indicator */}
                    {task.steps.length > 0 && (
                      <div className="space-y-2 py-2">
                        <span className="text-[10px] font-mono text-[#78716c] uppercase tracking-widest flex items-center gap-1.5">
                          <ListChecks className="w-3.5 h-3.5" />
                          <span>Sealed steps ({task.steps.length}/{task.steps.length} complete)</span>
                        </span>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {task.steps.map(s => (
                            <span key={s.id} className="text-xs px-2.5 py-1.5 bg-[#1c1917] border border-[#292524] rounded-md text-[#78716c] line-through decoration-[#78716c]/50">
                              ✓ {s.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Footer Row */}
                  <div className="flex items-center justify-between pt-5 mt-5 border-t border-[#292524] text-[10px] font-mono text-[#a8a29e] uppercase tracking-wider relative z-10">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[#78716c]" />
                      Sealed: {formattedDate}
                    </span>

                    {task.expenseAmount !== undefined && task.expenseAmount > 0 && (
                      <span className="text-[#d6d3d1] font-bold bg-[#1c1917] px-2.5 py-1 border border-[#44403c] rounded-md">
                        ₹{task.expenseAmount}
                      </span>
                    )}
                  </div>

                  {/* Watermark Logo */}
                  <div className="absolute -bottom-6 -right-6 text-[#292524] opacity-30 pointer-events-none">
                    <Archive className="w-32 h-32" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col items-center justify-center space-y-4">
            <Archive className="w-12 h-12 text-neutral-700 opacity-50" />
            <span className="text-xs font-mono text-neutral-500 uppercase tracking-[0.2em] block">Archive vault is silent</span>
            <p className="text-sm text-neutral-500 max-w-sm mx-auto px-4 leading-normal">
              Complete active tasks on your main dashboard to populate this read-only repository.
            </p>
          </div>
        )}
      </div>

    </motion.div>
  );
}
