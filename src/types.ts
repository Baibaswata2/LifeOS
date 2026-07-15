/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum StressLevel {
  VERY_LOW = "Very Low",
  LOW = "Low",
  MEDIUM = "Medium",
  HIGH = "High",
  CRITICAL = "Critical"
}

export enum TaskType {
  STANDARD = "Standard Step Task",
  CHECKLIST = "Checklist Task",
  SUPER = "Super Task"
}

export enum RecurrenceType {
  NONE = "None",
  DAILY = "Daily",
  WEEKLY = "Weekly",
  MONTHLY = "Monthly",
  YEARLY = "Yearly",
  CUSTOM = "Custom"
}

export enum ExpenseMode {
  DIRECT = "Direct Expense",
  AFTER_COMPLETION = "Expense After Completion"
}

export enum TaskStatus {
  INCOMPLETE = "Incomplete",
  COMPLETED = "Completed",
  ARCHIVED = "Archived"
}

export interface TaskStep {
  id: string;
  title: string;
  note?: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  objective?: string;
  category: string;
  priority: "Low" | "Medium" | "High";
  stressLevel: StressLevel; // Cannot be edited once created!
  taskType: TaskType;
  status: TaskStatus;
  
  // Scheduling
  startDate: string; // YYYY-MM-DD
  dueDate: string;   // YYYY-MM-DD
  startTime?: string; // HH:MM
  dueTime?: string;   // HH:MM
  
  // Progress
  progress: number; // Percentage: 0 to 100
  steps: TaskStep[];
  
  // Super Task Relationships
  childTaskIds?: string[]; // IDs of independent child tasks
  parentTaskId?: string;
  
  // Recurrence
  recurrence?: RecurrenceType;
  customRecurrenceDays?: number; // e.g., "Every 15 days"
  recurrenceDayOfMonth?: number; // e.g., "Day 1"
  
  // Expense
  expenseMode?: ExpenseMode;
  expenseAmount?: number; // In ₹ (Rupees)
  expenseEntered?: boolean; // True if expense has been logged (important for AFTER_COMPLETION)
  
  // Notes
  notes?: string;
  
  // Reminders
  reminderTimeBefore?: number; // in minutes (0 = exact time, 10, 20, 30, 60)
  reminderSent?: boolean;
  
  createdAt: number;
  completedAt?: number;
}

export interface ExpenseRecord {
  id: string;
  taskId: string;
  taskTitle: string;
  category: string;
  amount: number;
  date: string; // YYYY-MM-DD
}

export interface UserSession {
  isAuthenticated: boolean;
  userEmail: string;
}
