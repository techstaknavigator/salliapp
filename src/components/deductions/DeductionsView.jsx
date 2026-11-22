import React, { useState } from "react";
import {
  Scissors,
  Plus,
  Trash2,
  PiggyBank,
  AlertCircle,
  CheckCircle2,
  Link,
  Info
} from "lucide-react";
import { useFinance } from "../../context/FinanceContext.jsx";
import { formatCurrency } from "../../services/financialCalculations.js";
import { Modal } from "../common/Modal.jsx";
import { EmptyState } from "../common/EmptyState.jsx";
import { getTodayDateStr } from "../../types/schema.js";

export function DeductionsView() {
  const { database, summary, addDeduction, deleteDeduction } = useFinance();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [salaryMonth, setSalaryMonth] = useState(getTodayDateStr().slice(0, 7));
  const [deductionDate, setDeductionDate] = useState(getTodayDateStr());
  const [category, setCategory] = useState("Savings");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [autoSavingsAccountId, setAutoSavingsAccountId] = useState("");

  const currency = summary.currency || "LKR";
  const deductionsList = database?.sheets?.Salary_Deductions || [];
  const savingsAccounts = database?.sheets?.Savings_Accounts || [];
  const salaryList = database?.sheets?.Salary || [];

  const openAddModal = () => {
    setSalaryMonth(getTodayDateStr().slice(0, 7));
    setDeductionDate(getTodayDateStr());
    setCategory("Savings");
    setAmount("");
    setDescription("");
    setAutoSavingsAccountId(savingsAccounts[0]?.Record_ID || "");
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    addDeduction({
      salaryMonth,
      deductionDate,
      category,
      amount,
      description,
      autoSavingsAccountId: category === "Savings" ? autoSavingsAccountId : ""
    });
    setIsModalOpen(false);
  };

  const handleDelete = (recId) => {
    if (window.confirm("Delete this deduction? Linked savings transactions or ledger entries will also be updated.")) {
      deleteDeduction(recId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Salary Deductions
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Payroll deductions, taxes, and automatic savings deposits.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Deduction
        </button>
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Deductions
          </span>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {formatCurrency(summary.totalDeductions, currency)}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Across {deductionsList.length} recorded deduction(s)
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Savings Deductions (Transfers)
          </span>
          <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(summary.savingsDeductions, currency)}
          </h3>
          <p className="text-xs text-emerald-600/80 mt-1">
            Auto-transferred directly to Savings Accounts
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-rose-500 uppercase tracking-wider">
            Non-Savings Deductions
          </span>
          <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {formatCurrency(summary.nonSavingsDeductions, currency)}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Taxes, insurance & personal deductions
          </p>
        </div>
      </div>

      {/* Deductions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Deductions History ({deductionsList.length})
          </h3>
          <span className="text-xs text-slate-500">
            Worksheet: <span className="font-mono text-emerald-600">Salary_Deductions</span>
          </span>
        </div>

        {deductionsList.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Scissors}
              title="No salary deductions found"
              description="Record savings allocations or personal deductions deducted from your monthly salary."
              actionText="Add Deduction"
              onAction={openAddModal}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Month</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Description</th>
                  <th className="px-5 py-3.5 text-right">Amount</th>
                  <th className="px-5 py-3.5 text-center">Auto Deposit Linked</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {deductionsList.map((rec) => {
                  const isSavings = rec.Category === "Savings";
                  const linkedAccount = savingsAccounts.find(
                    (a) => a.Record_ID === rec.Auto_Deposit_Savings_Account_ID
                  );

                  return (
                    <tr
                      key={rec.Record_ID}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-4 font-mono text-slate-600 dark:text-slate-300">
                        {rec.Deduction_Date}
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                        {rec.Salary_Month}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                            isSavings
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {rec.Category}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                        {rec.Description || "-"}
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                        {formatCurrency(rec.Amount, currency)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {isSavings && rec.Auto_Deposit_Savings_Account_ID ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg">
                            <PiggyBank className="w-3.5 h-3.5" />
                            {linkedAccount?.Account_Name || "Savings Account"}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleDelete(rec.Record_ID)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Delete Deduction"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deduction Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Salary Deduction"
        subtitle="Deductions marked as 'Savings' automatically create a deposit in Savings_Transactions"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Salary Month
              </label>
              <input
                type="month"
                value={salaryMonth}
                onChange={(e) => setSalaryMonth(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Deduction Date
              </label>
              <input
                type="date"
                value={deductionDate}
                onChange={(e) => setDeductionDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Savings">Savings (Auto-Deposit into Savings)</option>
                <option value="Loan Repayment">Loan Repayment</option>
                <option value="Personal Deduction">Personal Deduction</option>
                <option value="Other">Other</option>
              </select>
            </div>

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
          </div>

          {/* Conditional Auto-Deposit Target Account */}
          {category === "Savings" && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-2">
              <label className="block text-xs font-semibold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                Deposit Destination Account
              </label>
              <select
                value={autoSavingsAccountId}
                onChange={(e) => setAutoSavingsAccountId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
                required
              >
                {savingsAccounts.map((acc) => (
                  <option key={acc.Record_ID} value={acc.Record_ID}>
                    {acc.Account_Name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                A matching deposit record will be written to the Savings_Transactions worksheet automatically.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Description / Notes
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Monthly emergency buffer allocation"
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
              Save Deduction
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
