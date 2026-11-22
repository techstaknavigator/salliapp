import React, { useState } from "react";
import {
  ReceiptText,
  Search,
  Filter,
  Download,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  FileSpreadsheet
} from "lucide-react";
import { useFinance } from "../../context/FinanceContext.jsx";
import { formatCurrency } from "../../services/financialCalculations.js";
import { sanitizeSpreadsheetValue } from "../../services/excelEngine.js";
import { EmptyState } from "../common/EmptyState.jsx";

const TRANSACTION_TYPES = [
  "All",
  "Salary",
  "Deduction",
  "Savings_Deposit",
  "Savings_Withdrawal",
  "Expense",
  "Lending_Given",
  "Borrowing_Received",
  "Lending_Repayment_Received",
  "Borrowing_Repayment_Paid",
  "Opening_Balance"
];

export function TransactionsView() {
  const { database, summary } = useFinance();

  const [selectedType, setSelectedType] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const currency = summary.currency || "LKR";
  const transactions = database?.sheets?.Transactions || [];

  const filteredTransactions = transactions.filter((tx) => {
    const matchesType = selectedType === "All" || tx.Transaction_Type === selectedType;
    const matchesSearch =
      !searchQuery ||
      tx.Description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.Category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.Transaction_ID?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStart = !startDate || (tx.Transaction_Date && tx.Transaction_Date >= startDate);
    const matchesEnd = !endDate || (tx.Transaction_Date && tx.Transaction_Date <= endDate);

    return matchesType && matchesSearch && matchesStart && matchesEnd;
  });

  // Export filtered transactions to CSV
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) return;

    const headers = ["Transaction_ID", "Date", "Type", "Category", "Description", "Flow", "Amount"];
    const rows = filteredTransactions.map((t) => [
      sanitizeSpreadsheetValue(t.Transaction_ID),
      sanitizeSpreadsheetValue(t.Transaction_Date),
      sanitizeSpreadsheetValue(t.Transaction_Type),
      `"${String(sanitizeSpreadsheetValue(t.Category || "")).replace(/"/g, '""')}"`,
      `"${String(sanitizeSpreadsheetValue(t.Description || "")).replace(/"/g, '""')}"`,
      sanitizeSpreadsheetValue(t.Cash_Flow_Type),
      t.Amount
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Filtered_Transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Master Transaction History
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Unified chronological audit ledger aggregating all financial activities.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm border border-slate-200 dark:border-slate-700 transition-all"
        >
          <Download className="w-4 h-4" />
          Export Filtered CSV
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search description, ID..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500"
            >
              {TRANSACTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Start */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 whitespace-nowrap">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Date Range End */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 whitespace-nowrap">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Transactions Records ({filteredTransactions.length})
          </h3>
          <span className="text-xs text-slate-500">
            Worksheet: <span className="font-mono text-emerald-600">Transactions</span>
          </span>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={ReceiptText}
              title="No transactions match your search"
              description="Adjust date range or search terms to inspect transaction records."
            />
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs min-w-[720px]">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Tx ID</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Description</th>
                  <th className="px-5 py-3.5">Cash Flow</th>
                  <th className="px-5 py-3.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTransactions.map((tx) => {
                  const isInflow = tx.Cash_Flow_Type === "Inflow";
                  const isOutflow = tx.Cash_Flow_Type === "Outflow";

                  return (
                    <tr
                      key={tx.Transaction_ID || tx.Record_ID}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-4 font-mono text-[11px] text-slate-400">
                        {tx.Transaction_ID || tx.Record_ID}
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-600 dark:text-slate-300">
                        {tx.Transaction_Date}
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                          {tx.Transaction_Type?.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">
                        {tx.Category}
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300 max-w-sm truncate">
                        {tx.Description}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`font-semibold text-[11px] ${
                            isInflow
                              ? "text-emerald-600 dark:text-emerald-400"
                              : isOutflow
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-slate-500"
                          }`}
                        >
                          {tx.Cash_Flow_Type}
                        </span>
                      </td>
                      <td
                        className={`px-5 py-4 text-right font-mono font-bold ${
                          isInflow
                            ? "text-emerald-600 dark:text-emerald-400"
                            : isOutflow
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {isInflow ? "+" : isOutflow ? "-" : ""}
                        {formatCurrency(tx.Amount, currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
