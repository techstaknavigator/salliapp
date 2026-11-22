import React, { useRef } from "react";
import {
  FileText,
  Printer,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import * as XLSX from "xlsx";
import { useFinance } from "../../context/FinanceContext.jsx";
import { formatCurrency } from "../../services/financialCalculations.js";
import { sanitizeSpreadsheetValue } from "../../services/excelEngine.js";
import { WORKBOOK_NAME } from "../../types/schema.js";

export function ReportsView() {
  const { database, summary, downloadDatabase } = useFinance();
  const printAreaRef = useRef(null);

  const currency = summary.currency || "LKR";
  const metadata = database?.metadata || database?.sheets?.Backup_Metadata?.[0] || {};

  const handlePrint = () => {
    window.print();
  };

  const handleExportSummaryExcel = () => {
    const wb = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      ["PERSONAL FINANCIAL STATEMENT REPORT"],
      ["Generated Date:", sanitizeSpreadsheetValue(new Date().toLocaleString())],
      ["Database ID:", sanitizeSpreadsheetValue(database?.databaseId || "N/A")],
      ["Account Holder:", sanitizeSpreadsheetValue(metadata.Notes || "Personal User")],
      ["Currency:", sanitizeSpreadsheetValue(currency)],
      [],
      ["FINANCIAL BALANCE SUMMARY", "AMOUNT (LKR)"],
      ["Opening Cash Balance", summary.openingCash],
      ["Total Gross Salary Received", summary.totalGrossSalary],
      ["Total Salary Deductions", summary.totalDeductions],
      ["Total Expenses Incurred", summary.totalExpenses],
      ["Total Savings Accumulated", summary.totalSavings],
      ["Total Money Lent (Given)", summary.totalMoneyLent],
      ["Outstanding Receivables", summary.outstandingReceivables],
      ["Total Money Borrowed (Taken)", summary.totalMoneyBorrowed],
      ["Outstanding Payables", summary.outstandingPayables],
      ["AVAILABLE CASH BALANCE", summary.availableCash],
      ["ESTIMATED NET WORTH", summary.estimatedNetWorth],
      [],
      ["EXPENSE BREAKDOWN BY CATEGORY", "AMOUNT (LKR)"],
      ...Object.entries(summary.expensesByCategory || {}).map(([cat, amt]) => [sanitizeSpreadsheetValue(cat), amt]),
      [],
      ["SAVINGS ACCOUNT BALANCES", "CURRENT BALANCE (LKR)", "TARGET AMOUNT (LKR)"],
      ...(summary.accountBalances || []).map((acc) => [sanitizeSpreadsheetValue(acc.name), acc.balance, acc.target])
    ];

    const ws = XLSX.utils.aoa_to_sheet(summaryData);
    ws["!cols"] = [{ wch: 35 }, { wch: 25 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, ws, "Financial_Statement");

    XLSX.writeFile(wb, `Financial_Statement_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header (hidden in print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Financial Statements & Reports
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Generate formal printable statements, save as PDF, or export Excel reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportSummaryExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 transition-all"
          >
            <Download className="w-4 h-4" />
            Export Statement XLSX
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            Print / PDF Statement
          </button>
        </div>
      </div>

      {/* Printable Statement Canvas */}
      <div
        ref={printAreaRef}
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 sm:p-12 max-w-4xl mx-auto space-y-8"
      >
        {/* Statement Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Personal Wealth & Cash Flow Statement
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              Personal Finance Manager
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Active Database: <strong className="font-mono text-slate-800 dark:text-slate-200">{database?.databaseId}</strong> • Currency: <strong>{currency}</strong>
            </p>
          </div>
          <div className="sm:text-right text-xs text-slate-400 space-y-0.5">
            <p>Generated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
            <p>Schema: Version 2.0 (Excel-Only)</p>
            <p>Audit Records: {database?.sheets?.Transactions?.length || 0} Transactions</p>
          </div>
        </div>

        {/* Section 1: Executive Balance Sheet */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
            1. Executive Wealth & Liquidity Summary
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <span className="text-xs text-slate-500 block">Available Cash Balance (Liquid)</span>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono mt-1 block">
                {formatCurrency(summary.availableCash, currency)}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Opening Cash ({formatCurrency(summary.openingCash, currency)}) + Inflows - Outflows
              </span>
            </div>

            <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20">
              <span className="text-xs text-emerald-800 dark:text-emerald-300 block">Estimated Net Worth</span>
              <span className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 font-mono mt-1 block">
                {formatCurrency(summary.estimatedNetWorth, currency)}
              </span>
              <span className="text-[11px] text-emerald-600/80 mt-1 block">
                Cash + Total Savings + Receivables - Payables
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Cash Flow Table */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
            2. Cash Flow & Obligations Accounting
          </h3>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs text-left min-w-[550px]">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Financial Category</th>
                  <th className="px-4 py-3">Accounting Classification</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                <tr>
                  <td className="px-4 py-3 text-slate-900 dark:text-white">Opening Cash Balance</td>
                  <td className="px-4 py-3 text-slate-500">Initial Asset</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(summary.openingCash, currency)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-slate-900 dark:text-white">Total Gross Salary Received</td>
                  <td className="px-4 py-3 text-emerald-600">Operating Inflow</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-600">+{formatCurrency(summary.totalGrossSalary, currency)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-slate-900 dark:text-white">Non-Savings Salary Deductions (Tax/Personal)</td>
                  <td className="px-4 py-3 text-rose-500">Payroll Outflow</td>
                  <td className="px-4 py-3 text-right font-mono text-rose-500">-{formatCurrency(summary.nonSavingsDeductions, currency)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-slate-900 dark:text-white">Total Expenses Incurred</td>
                  <td className="px-4 py-3 text-rose-600">Operating Outflow</td>
                  <td className="px-4 py-3 text-right font-mono text-rose-600">-{formatCurrency(summary.totalExpenses, currency)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-slate-900 dark:text-white">Total Savings Accumulated (Current)</td>
                  <td className="px-4 py-3 text-indigo-600">Dedicated Asset Vault</td>
                  <td className="px-4 py-3 text-right font-mono text-indigo-600">{formatCurrency(summary.totalSavings, currency)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-slate-900 dark:text-white">Money Lent to Others (Receivables Remaining)</td>
                  <td className="px-4 py-3 text-amber-600">Asset to Collect</td>
                  <td className="px-4 py-3 text-right font-mono text-amber-600">{formatCurrency(summary.outstandingReceivables, currency)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-slate-900 dark:text-white">Money Borrowed from Others (Payables Remaining)</td>
                  <td className="px-4 py-3 text-rose-600">Liability to Settle</td>
                  <td className="px-4 py-3 text-right font-mono text-rose-600">{formatCurrency(summary.outstandingPayables, currency)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Savings Accounts Details */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
            3. Savings Accounts Breakdown
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(summary.accountBalances || []).map((acc) => (
              <div
                key={acc.id}
                className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs"
              >
                <span className="font-bold text-slate-900 dark:text-white block">{acc.name}</span>
                <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-1 block">
                  {formatCurrency(acc.balance, currency)}
                </span>
                <span className="text-slate-400 text-[10px] block mt-0.5">
                  Target: {formatCurrency(acc.target, currency)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Statement Footer */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <span>Personal Salary & Finance Manager • Static Web Application</span>
          <span>Verified Excel Database Engine • Zero Backend Servers</span>
        </div>
      </div>
    </div>
  );
}
