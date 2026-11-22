import React, { useState } from "react";
import {
  PieChart,
  Plus,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Calendar
} from "lucide-react";
import { useFinance } from "../../context/FinanceContext.jsx";
import { formatCurrency, getBudgetProgress } from "../../services/financialCalculations.js";
import { Modal } from "../common/Modal.jsx";
import { EmptyState } from "../common/EmptyState.jsx";
import { getTodayDateStr } from "../../types/schema.js";

const DEFAULT_CATEGORIES = [
  "Food",
  "Transport",
  "Bills",
  "Shopping",
  "Family",
  "Health",
  "Education",
  "Entertainment",
  "Other"
];

export function BudgetsView() {
  const { database, summary, addBudget } = useFinance();

  const [selectedMonth, setSelectedMonth] = useState(getTodayDateStr().slice(0, 7));
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [category, setCategory] = useState("Food");
  const [allocatedAmount, setAllocatedAmount] = useState("");
  const [notes, setNotes] = useState("");

  const currency = summary.currency || "LKR";
  const budgetProgress = getBudgetProgress(database, selectedMonth);

  const totalBudgeted = budgetProgress.reduce((sum, b) => sum + b.allocated, 0);
  const totalSpent = budgetProgress.reduce((sum, b) => sum + b.spent, 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    addBudget({
      budgetMonth: selectedMonth,
      category,
      allocatedAmount: Number(allocatedAmount) || 0,
      notes
    });
    setIsModalOpen(false);
    setAllocatedAmount("");
    setNotes("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Monthly Budgets
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Set spending allocations per expense category and track live progress.
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Set Category Budget
          </button>
        </div>
      </div>

      {/* Summary Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Allocated Budget
          </span>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
              {formatCurrency(totalBudgeted, currency)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              For {selectedMonth}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Actual Spent
          </span>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums tracking-tight">
              {formatCurrency(totalSpent, currency)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {totalBudgeted > 0 ? `${Math.round((totalSpent / totalBudgeted) * 100)}% of total budget spent` : "No budget set"}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Remaining Budget
          </span>
          <div className="mt-3">
            <h3
              className={`text-xl sm:text-2xl font-bold tabular-nums tracking-tight ${
                totalBudgeted >= totalSpent ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"
              }`}
            >
              {formatCurrency(totalBudgeted - totalSpent, currency)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {totalBudgeted >= totalSpent ? "Within budget limits" : "Over overall budget!"}
            </p>
          </div>
        </div>
      </div>

      {/* Budgets Progress Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
          Category Spending Progress for {selectedMonth}
        </h3>

        {budgetProgress.length === 0 ? (
          <EmptyState
            icon={PieChart}
            title="No budgets set for this month"
            description="Create category budgets to monitor and restrict discretionary expenses."
            actionText="Set First Budget"
            onAction={() => setIsModalOpen(true)}
          />
        ) : (
          <div className="space-y-4">
            {budgetProgress.map((item) => {
              const isOver = item.isOver;
              const hasBudget = item.allocated > 0;

              return (
                <div
                  key={item.category}
                  className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {item.category}
                      </span>
                      {isOver && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3" />
                          OVER BUDGET
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-semibold text-rose-600 dark:text-rose-400">
                        {formatCurrency(item.spent, currency)}
                      </span>{" "}
                      spent of{" "}
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {hasBudget ? formatCurrency(item.allocated, currency) : "No budget"}
                      </span>
                      {hasBudget && (
                        <span className="ml-2 font-mono text-[11px] text-slate-400">
                          ({item.percent}%)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {hasBudget ? (
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOver ? "bg-rose-600" : item.percent > 80 ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(item.percent, 100)}%` }}
                      />
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">
                      Spending without allocation. Click "Set Category Budget" to cap this category.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Budget Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Set Category Monthly Budget"
        subtitle={`Appends allocation to Budgets worksheet for ${selectedMonth}`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
            >
              {DEFAULT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Allocated Limit ({currency})
            </label>
            <input
              type="number"
              step="any"
              value={allocatedAmount}
              onChange={(e) => setAllocatedAmount(e.target.value)}
              placeholder="e.g. 35000"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cap on dining and groceries"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm"
            >
              Save Budget
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
