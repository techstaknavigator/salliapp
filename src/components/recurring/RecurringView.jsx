import React, { useState } from "react";
import {
  CalendarClock,
  Plus,
  Bell,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  DollarSign
} from "lucide-react";
import { useFinance } from "../../context/FinanceContext.jsx";
import { formatCurrency } from "../../services/financialCalculations.js";
import { Modal } from "../common/Modal.jsx";
import { EmptyState } from "../common/EmptyState.jsx";
import { getTodayDateStr } from "../../types/schema.js";

export function RecurringView() {
  const { database, summary, addRecurring } = useFinance();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("Expense");
  const [category, setCategory] = useState("Bills");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("Monthly");
  const [nextDueDate, setNextDueDate] = useState(getTodayDateStr());

  const currency = summary.currency || "LKR";
  const recurringList = database?.sheets?.Recurring_Transactions || [];

  const openAddModal = () => {
    setTitle("");
    setType("Expense");
    setCategory("Bills");
    setAmount("");
    setFrequency("Monthly");
    setNextDueDate(getTodayDateStr());
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    addRecurring({
      title,
      type,
      category,
      amount: Number(amount) || 0,
      frequency,
      nextDueDate
    });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Recurring Bills & Commitments
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Automate awareness of monthly utilities, subscriptions, and recurring obligations.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Recurring Reminder
        </button>
      </div>

      {/* Recurring Cards Grid */}
      {recurringList.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No recurring bills registered"
          description="Track recurring subscriptions like broadband, electricity, mobile reloads, and gym memberships."
          actionText="Add Recurring Bill"
          onAction={openAddModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recurringList.map((rec) => (
            <div
              key={rec.Record_ID}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {rec.Category} • {rec.Frequency}
                    </span>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                      {rec.Title}
                    </h4>
                  </div>
                  <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                    <Bell className="w-4 h-4" />
                  </span>
                </div>

                <div className="mt-4">
                  <span className="text-xs text-slate-400 uppercase font-medium">Payment Amount</span>
                  <h5 className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                    {formatCurrency(rec.Amount, currency)}
                  </h5>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Next Due: <strong className="font-mono text-slate-800 dark:text-slate-200">{rec.Next_Due_Date}</strong>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {rec.Status || "Active"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recurring Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Recurring Bill / Subscription"
        subtitle="Saved to Recurring_Transactions worksheet"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Bill / Subscription Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Dialog Fiber Broadband"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Amount ({currency})
              </label>
              <input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Yearly">Yearly</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Bills, Entertainment"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Next Due Date
              </label>
              <input
                type="date"
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
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
              Save Reminder
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
