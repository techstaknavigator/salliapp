import React, { useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  CreditCard,
  HandCoins,
  Landmark,
  Bell
} from "lucide-react";
import { useFinance } from "../../context/FinanceContext.jsx";
import { formatCurrency } from "../../services/financialCalculations.js";

export function CalendarView() {
  const { database, summary } = useFinance();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState(null);

  const currency = summary.currency || "LKR";

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDayEvents(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDayEvents(null);
  };

  const monthName = currentDate.toLocaleString("default", { month: "long" });
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Aggregate events for this month from the active Excel sheets
  const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;

  const eventMap = {};

  const addEvent = (dateStr, type, title, amount, color) => {
    if (!dateStr || !dateStr.startsWith(currentMonthPrefix)) return;
    const day = parseInt(dateStr.slice(8, 10), 10);
    if (!eventMap[day]) eventMap[day] = [];
    eventMap[day].push({ type, title, amount, color, date: dateStr });
  };

  // Salary
  (database?.sheets?.Salary || []).forEach((s) => {
    addEvent(s.Salary_Received_Date, "Salary", `Salary: ${s.Salary_Month}`, s.Total_Salary, "emerald");
  });

  // Expenses
  (database?.sheets?.Expenses || []).forEach((e) => {
    addEvent(e.Expense_Date, "Expense", `${e.Category}: ${e.Description || "Expense"}`, e.Amount, "rose");
  });

  // Lending return dates
  (database?.sheets?.Lending || []).forEach((l) => {
    if (l.Expected_Return_Date) {
      addEvent(l.Expected_Return_Date, "Lending", `Expected Return: ${l.Person_Name}`, l.Remaining_Balance, "amber");
    }
  });

  // Borrowing repayment dates
  (database?.sheets?.Borrowing || []).forEach((b) => {
    if (b.Expected_Repayment_Date) {
      addEvent(b.Expected_Repayment_Date, "Borrowing", `Repayment Due: ${b.Person_Name}`, b.Remaining_Balance, "purple");
    }
  });

  // Recurring
  (database?.sheets?.Recurring_Transactions || []).forEach((r) => {
    addEvent(r.Next_Due_Date, "Recurring", `Bill Due: ${r.Title}`, r.Amount, "blue");
  });

  const calendarDays = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Financial Calendar
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Monthly timeline showing manual salary dates, expense clusters, and loan repayment deadlines.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <button
            onClick={prevMonth}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-sm text-slate-900 dark:text-white min-w-[130px] text-center">
            {monthName} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-4 sm:p-5">
        <div className="overflow-x-auto scrollbar-thin">
          <div className="min-w-[540px]">
            {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, idx) => {
            if (!day) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="min-h-[90px] rounded-xl bg-slate-50/40 dark:bg-slate-800/20 border border-transparent"
                />
              );
            }

            const events = eventMap[day] || [];
            const isToday =
              new Date().getFullYear() === year &&
              new Date().getMonth() === month &&
              new Date().getDate() === day;

            return (
              <div
                key={`day-${day}`}
                onClick={() => setSelectedDayEvents({ day, events })}
                className={`min-h-[90px] p-2 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                  isToday
                    ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 font-bold"
                    : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`w-5 h-5 flex items-center justify-center rounded-full text-[11px] ${
                      isToday
                        ? "bg-emerald-600 text-white font-bold"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {day}
                  </span>
                  {events.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                </div>

                <div className="space-y-1 mt-1 overflow-hidden">
                  {events.slice(0, 2).map((ev, eIdx) => (
                    <div
                      key={eIdx}
                      className={`truncate px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                        ev.type === "Salary"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : ev.type === "Expense"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          : ev.type === "Lending"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                      }`}
                    >
                      {ev.title}
                    </div>
                  ))}
                  {events.length > 2 && (
                    <span className="text-[9px] text-slate-400 font-medium block">
                      +{events.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
          </div>
        </div>
      </div>

      {/* Selected Day Event Drawer / Detail Box */}
      {selectedDayEvents && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm animate-fade-in">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Events for {monthName} {selectedDayEvents.day}, {year}
            </h3>
            <button
              onClick={() => setSelectedDayEvents(null)}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold"
            >
              Close
            </button>
          </div>

          {selectedDayEvents.events.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No financial events on this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedDayEvents.events.map((ev, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900 dark:text-white block">
                      {ev.title}
                    </span>
                    <span className="text-slate-500 text-[11px] uppercase tracking-wider">
                      {ev.type}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatCurrency(ev.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
