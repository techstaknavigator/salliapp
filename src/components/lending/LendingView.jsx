import React, { useState } from "react";
import {
  HandCoins,
  Plus,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  User,
  DollarSign,
  AlertCircle
} from "lucide-react";
import { useFinance } from "../../context/FinanceContext.jsx";
import { formatCurrency } from "../../services/financialCalculations.js";
import { Modal } from "../common/Modal.jsx";
import { EmptyState } from "../common/EmptyState.jsx";
import { getTodayDateStr } from "../../types/schema.js";

export function LendingView() {
  const { database, summary, addLending, recordLendingRepayment } = useFinance();

  const [isLendModalOpen, setIsLendModalOpen] = useState(false);
  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);

  // Form states
  const [personName, setPersonName] = useState("");
  const [amount, setAmount] = useState("");
  const [givenDate, setGivenDate] = useState(getTodayDateStr());
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [description, setDescription] = useState("");

  // Repayment form states
  const [repaymentAmount, setRepaymentAmount] = useState("");
  const [repaymentDate, setRepaymentDate] = useState(getTodayDateStr());
  const [repaymentNotes, setRepaymentNotes] = useState("");

  const currency = summary.currency || "LKR";
  const lendingList = database?.sheets?.Lending || [];

  const openAddModal = () => {
    setPersonName("");
    setAmount("");
    setGivenDate(getTodayDateStr());
    setExpectedReturnDate("");
    setDescription("");
    setIsLendModalOpen(true);
  };

  const openRepayModal = (loan) => {
    setSelectedLoan(loan);
    setRepaymentAmount(String(loan.Remaining_Balance || ""));
    setRepaymentDate(getTodayDateStr());
    setRepaymentNotes("");
    setIsRepayModalOpen(true);
  };

  const handleLendSubmit = (e) => {
    e.preventDefault();
    addLending({
      personName,
      amount: Number(amount) || 0,
      givenDate,
      expectedReturnDate,
      description
    });
    setIsLendModalOpen(false);
  };

  const handleRepaySubmit = (e) => {
    e.preventDefault();
    if (!selectedLoan) return;

    const parsedAmt = Number(repaymentAmount);
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      return;
    }
    if (parsedAmt > (Number(selectedLoan.Remaining_Balance) || 0)) {
      return;
    }

    const success = recordLendingRepayment({
      loanId: selectedLoan.Record_ID,
      amount: parsedAmt,
      repaymentDate,
      notes: repaymentNotes
    });
    if (success !== false) {
      setIsRepayModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Lending Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Track money lent to friends, relatives, and colleagues (Receivables / Assets).
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Lend Money
        </button>
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Money Lent
          </span>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
              {formatCurrency(summary.totalMoneyLent, currency)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Gross principal given across {lendingList.length} loan(s)
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Total Repaid Back
          </span>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">
              {formatCurrency(summary.effectiveLendingRepayments, currency)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Cash returned back to your pocket
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Outstanding Receivables
          </span>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums tracking-tight">
              {formatCurrency(summary.outstandingReceivables, currency)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Money yet to be collected (Asset)
            </p>
          </div>
        </div>
      </div>

      {/* Lending Records Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Lending History ({lendingList.length})
          </h3>
        </div>

        {lendingList.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={HandCoins}
              title="No lending records found"
              description="Keep clean records of money given to others, repayment milestones, and outstanding balances."
              actionText="Record Money Lent"
              onAction={openAddModal}
            />
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Person Name</th>
                  <th className="px-5 py-3.5">Given Date</th>
                  <th className="px-5 py-3.5">Expected Return</th>
                  <th className="px-5 py-3.5 text-right">Principal</th>
                  <th className="px-5 py-3.5 text-right">Repaid</th>
                  <th className="px-5 py-3.5 text-right">Remaining Balance</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {lendingList.map((rec) => {
                  const isFullyRepaid = rec.Status === "Fully Repaid" || (Number(rec.Remaining_Balance) || 0) <= 0;

                  return (
                    <tr
                      key={rec.Record_ID}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {rec.Person_Name}
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          {rec.Description || "Personal Loan"}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-600 dark:text-slate-300">
                        {rec.Given_Date}
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-500">
                        {rec.Expected_Return_Date || "Open-ended"}
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(rec.Amount, currency)}
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(rec.Repaid_Amount, currency)}
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                        {formatCurrency(rec.Remaining_Balance, currency)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isFullyRepaid
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : rec.Status === "Partially Repaid"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          }`}
                        >
                          {rec.Status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {!isFullyRepaid && (
                          <button
                            onClick={() => openRepayModal(rec)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold"
                          >
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            Record Repayment
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lending Modal */}
      <Modal
        isOpen={isLendModalOpen}
        onClose={() => setIsLendModalOpen(false)}
        title="Record Money Lent to Someone"
        subtitle="Saved into Lending worksheet as a receivable asset"
      >
        <form onSubmit={handleLendSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Recipient Person Name
              </label>
              <input
                type="text"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="e.g. Kasun Perera"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500"
                required
              />
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
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Given Date
              </label>
              <input
                type="date"
                value={givenDate}
                onChange={(e) => setGivenDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Expected Return Date
              </label>
              <input
                type="date"
                value={expectedReturnDate}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Description / Reason
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Emergency medical loan assistance"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsLendModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm shadow-sm"
            >
              Save Lending Record
            </button>
          </div>
        </form>
      </Modal>

      {/* Repayment Modal */}
      <Modal
        isOpen={isRepayModalOpen}
        onClose={() => setIsRepayModalOpen(false)}
        title={`Record Repayment from ${selectedLoan?.Person_Name}`}
        subtitle={`Outstanding Balance: ${formatCurrency(selectedLoan?.Remaining_Balance, currency)}`}
      >
        <form onSubmit={handleRepaySubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Repayment Amount ({currency})
              </label>
              <input
                type="number"
                step="any"
                max={selectedLoan?.Remaining_Balance}
                value={repaymentAmount}
                onChange={(e) => setRepaymentAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Repayment Received Date
              </label>
              <input
                type="date"
                value={repaymentDate}
                onChange={(e) => setRepaymentDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Payment Remarks
            </label>
            <input
              type="text"
              value={repaymentNotes}
              onChange={(e) => setRepaymentNotes(e.target.value)}
              placeholder="e.g. Bank transfer reference #12345"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsRepayModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm"
            >
              Confirm Repayment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
