import React, { useState } from "react";
import {
  PiggyBank,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  PlusCircle,
  FolderPlus,
  Trash2
} from "lucide-react";
import { useFinance } from "../../context/FinanceContext.jsx";
import { formatCurrency } from "../../services/financialCalculations.js";
import { Modal } from "../common/Modal.jsx";
import { EmptyState } from "../common/EmptyState.jsx";
import { getTodayDateStr } from "../../types/schema.js";

export function SavingsView() {
  const {
    database,
    summary,
    addSavingsAccount,
    deleteSavingsAccount,
    addSavingsTransaction,
    showToast
  } = useFinance();

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false);

  // Transaction form state
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [txType, setTxType] = useState("Deposit"); // 'Deposit' | 'Withdrawal'
  const [amount, setAmount] = useState("");
  const [txDate, setTxDate] = useState(getTodayDateStr());
  const [sourceOrPurpose, setSourceOrPurpose] = useState("");
  const [notes, setNotes] = useState("");

  // New account form state
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountTarget, setNewAccountTarget] = useState("");
  const [newAccountNotes, setNewAccountNotes] = useState("");

  const currency = summary.currency || "LKR";
  const accounts = summary.accountBalances || [];
  const transactions = database?.sheets?.Savings_Transactions || [];

  const openDepositModal = (accId) => {
    setSelectedAccountId(accId || accounts[0]?.id || "");
    setTxType("Deposit");
    setAmount("");
    setTxDate(getTodayDateStr());
    setSourceOrPurpose("");
    setNotes("");
    setIsTxModalOpen(true);
  };

  const openWithdrawModal = (accId) => {
    setSelectedAccountId(accId || accounts[0]?.id || "");
    setTxType("Withdrawal");
    setAmount("");
    setTxDate(getTodayDateStr());
    setSourceOrPurpose("");
    setNotes("");
    setIsTxModalOpen(true);
  };

  const handleDeleteAccount = (accId, accName) => {
    if (window.confirm(`Are you sure you want to delete savings account '${accName}'?`)) {
      deleteSavingsAccount(accId);
    }
  };

  const handleTxSubmit = (e) => {
    e.preventDefault();
    const success = addSavingsTransaction({
      accountId: selectedAccountId,
      transactionType: txType,
      amount: Number(amount) || 0,
      transactionDate: txDate,
      sourceOrPurpose,
      notes
    });

    if (success) {
      setIsTxModalOpen(false);
    }
  };

  const handleCreateAccountSubmit = (e) => {
    e.preventDefault();
    if (!newAccountName.trim()) return;

    addSavingsAccount({
      accountName: newAccountName.trim(),
      targetAmount: Number(newAccountTarget) || 0,
      notes: newAccountNotes
    });

    setNewAccountName("");
    setNewAccountTarget("");
    setNewAccountNotes("");
    setIsNewAccountModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Savings Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Multi-account savings vaults, deposits, withdrawals, and balance verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsNewAccountModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all"
          >
            <FolderPlus className="w-4 h-4" />
            + New Account
          </button>
          <button
            onClick={() => openDepositModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Deposit
          </button>
          <button
            onClick={() => openWithdrawModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <ArrowUpRight className="w-4 h-4" />
            Withdraw
          </button>
        </div>
      </div>

      {/* Total Savings Hero Card */}
      <div className="bg-slate-900 dark:bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 text-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-emerald-400 text-xs uppercase tracking-wider font-semibold">
              Total Consolidated Savings
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1 tabular-nums">
              {formatCurrency(summary.totalSavings, currency)}
            </h3>
            <p className="text-slate-400 text-xs mt-1">
              Current Savings = Total Deposits ({formatCurrency(summary.totalSavingsDeposits, currency)}) - Total Withdrawals ({formatCurrency(summary.totalSavingsWithdrawals, currency)})
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => openDepositModal()}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-colors"
            >
              + Quick Deposit
            </button>
            <button
              onClick={() => openWithdrawModal()}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition-colors"
            >
              - Quick Withdraw
            </button>
          </div>
        </div>
      </div>

      {/* Account-wise Balances Cards */}
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">
          Savings Accounts ({accounts.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {accounts.map((acc) => {
            const percentOfTotal = summary.totalSavings > 0
              ? Math.round((acc.balance / summary.totalSavings) * 100)
              : 0;

            const targetProgress = acc.target > 0
              ? Math.min(100, Math.round((acc.balance / acc.target) * 100))
              : 0;

            return (
              <div
                key={acc.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-base text-slate-900 dark:text-white">
                        {acc.name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">{acc.notes || "Dedicated savings vault"}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                        <PiggyBank className="w-5 h-5" />
                      </div>
                      <button
                        onClick={() => handleDeleteAccount(acc.id, acc.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Delete Account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className="text-xs text-slate-400 uppercase font-medium">Available Balance</span>
                    <h5 className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                      {formatCurrency(acc.balance, currency)}
                    </h5>
                  </div>

                  {acc.target > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>Target: {formatCurrency(acc.target, currency)}</span>
                        <span className="font-semibold text-emerald-600">{targetProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all"
                          style={{ width: `${targetProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="text-slate-400 font-mono">
                    Dep: {formatCurrency(acc.deposits, currency)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openDepositModal(acc.id)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold"
                    >
                      + Deposit
                    </button>
                    <button
                      onClick={() => openWithdrawModal(acc.id)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold"
                    >
                      - Withdraw
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Savings Transactions History Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Savings Transactions History ({transactions.length})
            </h3>
            <p className="text-xs text-slate-500">
              Worksheet: <span className="font-mono text-emerald-600">Savings_Transactions</span>
            </p>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={PiggyBank}
              title="No savings transactions recorded"
              description="Make a deposit or auto-transfer from monthly salary deductions."
              actionText="Make First Deposit"
              onAction={() => openDepositModal()}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Account</th>
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5">Source / Purpose</th>
                  <th className="px-5 py-3.5 text-right">Amount</th>
                  <th className="px-5 py-3.5">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {transactions.map((tx) => {
                  const isDeposit = tx.Transaction_Type === "Deposit";

                  return (
                    <tr
                      key={tx.Transaction_ID || tx.Record_ID}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-4 font-mono text-slate-600 dark:text-slate-300">
                        {tx.Transaction_Date}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">
                        {tx.Account_Name}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isDeposit
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                          }`}
                        >
                          {tx.Transaction_Type}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                        {tx.Source_Or_Purpose || "-"}
                      </td>
                      <td
                        className={`px-5 py-4 text-right font-mono font-bold ${
                          isDeposit
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-indigo-600 dark:text-indigo-400"
                        }`}
                      >
                        {isDeposit ? "+" : "-"}
                        {formatCurrency(tx.Amount, currency)}
                      </td>
                      <td className="px-5 py-4 text-slate-500 max-w-xs truncate">
                        {tx.Notes || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Modal (Deposit or Withdraw) */}
      <Modal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        title={txType === "Deposit" ? "Add Savings Deposit" : "Withdraw from Savings"}
        subtitle={
          txType === "Withdrawal"
            ? "Withdrawals are strictly verified against the account balance"
            : "Deposits increment your savings vault"
        }
      >
        <form onSubmit={handleTxSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Transaction Type
              </label>
              <select
                value={txType}
                onChange={(e) => setTxType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Deposit">Deposit (+ Add Savings)</option>
                <option value="Withdrawal">Withdrawal (- Take Savings)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Savings Account
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
                required
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (Balance: {formatCurrency(acc.balance, currency)})
                  </option>
                ))}
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Date
              </label>
              <input
                type="date"
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              {txType === "Deposit" ? "Source of Funds" : "Purpose of Withdrawal"}
            </label>
            <input
              type="text"
              value={sourceOrPurpose}
              onChange={(e) => setSourceOrPurpose(e.target.value)}
              placeholder={txType === "Deposit" ? "e.g. Extra freelance bonus deposit" : "e.g. Urgent dental medical bill"}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
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
              placeholder="Additional remarks"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsTxModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-5 py-2 rounded-xl text-white font-semibold text-sm shadow-sm ${
                txType === "Deposit"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {txType === "Deposit" ? "Record Deposit" : "Record Withdrawal"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create New Account Modal */}
      <Modal
        isOpen={isNewAccountModalOpen}
        onClose={() => setIsNewAccountModalOpen(false)}
        title="Create New Savings Account"
        subtitle="Adds an account record to Savings_Accounts worksheet"
      >
        <form onSubmit={handleCreateAccountSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Account Name
            </label>
            <input
              type="text"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              placeholder="e.g. Vehicle Purchase Fund"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Target Amount ({currency})
            </label>
            <input
              type="number"
              step="any"
              value={newAccountTarget}
              onChange={(e) => setNewAccountTarget(e.target.value)}
              placeholder="0.00 (optional)"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Notes
            </label>
            <input
              type="text"
              value={newAccountNotes}
              onChange={(e) => setNewAccountNotes(e.target.value)}
              placeholder="Purpose of this account"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsNewAccountModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm"
            >
              Create Account
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
