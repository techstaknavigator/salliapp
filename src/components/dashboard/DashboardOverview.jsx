import React, { useState } from "react";
import {
  Wallet,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  HandCoins,
  Landmark,
  ShieldCheck,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  Scissors,
  CheckCircle2,
  Info,
  CreditCard,
  ReceiptText,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useFinance } from "../../context/FinanceContext.jsx";
import { StatCard } from "../common/StatCard.jsx";
import { formatCurrency, getMonthlyTrendData } from "../../services/financialCalculations.js";

// Chart.js registration
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function DashboardOverview({
  onOpenAddSalary,
  onOpenAddExpense,
  onOpenAddSavings,
  onOpenAddLending
}) {
  const { summary, database, darkMode, setActiveTab } = useFinance();
  const [chartMode, setChartMode] = useState("income-expense"); // 'income-expense' | 'savings-trend'
  const [showFormulaExplanation, setShowFormulaExplanation] = useState(false);

  if (!database) return null;

  const currency = summary.currency || "LKR";

  // Monthly trend data for charts
  const trendMonths = getMonthlyTrendData(database, 12);
  const labels = trendMonths.map((m) => m.label);

  // Income vs Expense Chart Configuration
  const incomeExpenseData = {
    labels,
    datasets: [
      {
        type: "bar",
        label: "Income (Net Salary & Other)",
        data: trendMonths.map((m) => m.income),
        backgroundColor: "#10b981",
        borderRadius: 6,
        maxBarThickness: 28
      },
      {
        type: "bar",
        label: "Expenses",
        data: trendMonths.map((m) => m.expense),
        backgroundColor: "#f43f5e",
        borderRadius: 6,
        maxBarThickness: 28
      }
    ]
  };

  // Savings Trend Chart Configuration
  const savingsTrendData = {
    labels,
    datasets: [
      {
        fill: true,
        label: "Savings Inflows",
        data: trendMonths.map((m) => m.savings),
        borderColor: "#6366f1",
        backgroundColor: "rgba(99, 102, 241, 0.12)",
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: "#6366f1"
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: darkMode ? "#cbd5e1" : "#475569",
          font: { family: "sans-serif", size: 12, weight: 500 }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.dataset.label}: Rs. ${(context.parsed.y || 0).toLocaleString()}`
        }
      }
    },
    scales: {
      x: {
        grid: { color: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" },
        ticks: { color: darkMode ? "#94a3b8" : "#64748b" }
      },
      y: {
        grid: { color: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" },
        ticks: {
          color: darkMode ? "#94a3b8" : "#64748b",
          callback: (value) => `Rs. ${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`
        }
      }
    }
  };

  // Category Doughnut Data
  const categoryNames = Object.keys(summary.expensesByCategory || {});
  const categoryValues = Object.values(summary.expensesByCategory || {});
  const categoryColors = [
    "#f59e0b",
    "#3b82f6",
    "#ef4444",
    "#ec4899",
    "#8b5cf6",
    "#10b981",
    "#6366f1",
    "#f43f5e",
    "#64748b"
  ];

  const doughnutData = {
    labels: categoryNames.length > 0 ? categoryNames : ["No Expenses Recorded"],
    datasets: [
      {
        data: categoryValues.length > 0 ? categoryValues : [1],
        backgroundColor: categoryValues.length > 0 ? categoryColors.slice(0, categoryNames.length) : ["#e2e8f0"],
        borderWidth: 2,
        borderColor: darkMode ? "#0f172a" : "#ffffff"
      }
    ]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: darkMode ? "#cbd5e1" : "#475569",
          boxWidth: 12,
          font: { size: 11 }
        }
      }
    },
    cutout: "70%"
  };

  // Recent Transactions (top 6)
  const recentTransactions = (database.sheets.Transactions || []).slice(0, 6);
  const monthlyBreakdown = summary.monthlyBreakdown || [];

  return (
    <div className="space-y-6 sm:space-y-8 max-w-full">
      {/* 1. TOP HEADER & QUICK ACTION BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200/70 dark:border-slate-800/80">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Financial Dashboard
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time accounting overview computed strictly from your local Excel database.
          </p>
        </div>

        {/* Action Buttons: Responsive 2-column grid on mobile, inline group on desktop */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5">
          <button
            onClick={onOpenAddSalary}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-semibold shadow-sm transition-all h-9"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Salary</span>
          </button>
          
          <button
            onClick={onOpenAddExpense}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-xs font-semibold shadow-sm transition-all h-9"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Expense</span>
          </button>

          <button
            onClick={onOpenAddSavings}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-semibold shadow-sm transition-all h-9"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Savings</span>
          </button>

          <button
            onClick={onOpenAddLending}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white text-xs font-semibold shadow-sm transition-all h-9"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Lend Money</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN UNIFIED METRIC CARDS (12 Core Financial Totals) */}
      <section aria-label="Core Financial Indicators">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {/* 1. Gross Salary */}
          <StatCard
            title="Gross Salary"
            amount={formatCurrency(summary.totalGrossSalary, currency)}
            subtitle="Earnings before withholdings"
            icon={TrendingUp}
            color="blue"
            badgeText="Gross Pay"
            badgeColor="blue"
          />

          {/* 2. Total Payroll Deductions */}
          <StatCard
            title="Payroll Deductions"
            amount={formatCurrency(summary.totalPayrollDeductions || summary.totalDeductions, currency)}
            subtitle="Subtracted at source on payslip"
            icon={Scissors}
            color="amber"
            badgeText="At Source"
            badgeColor="amber"
          />

          {/* 3. Net Salary Received */}
          <StatCard
            title="Net Salary Received"
            amount={formatCurrency(summary.totalNetSalaryReceived || summary.totalGrossSalary, currency)}
            subtitle="Actual cash deposited to bank"
            icon={CheckCircle2}
            color="emerald"
            badgeText="Cash Inflow"
            badgeColor="emerald"
          />

          {/* 4. Total Expenses */}
          <StatCard
            title="Total Expenses"
            amount={formatCurrency(summary.totalExpenses, currency)}
            subtitle="Daily and monthly living costs"
            icon={TrendingDown}
            color="rose"
            badgeText="Outflow"
            badgeColor="rose"
          />

          {/* 5. Savings Allocations */}
          <StatCard
            title="Savings Allocations"
            amount={formatCurrency(summary.totalSavingsAllocations || summary.savingsDeductions, currency)}
            subtitle="Transferred to savings accounts"
            icon={PiggyBank}
            color="indigo"
            badgeText="Savings Transfer"
            badgeColor="blue"
          />

          {/* 6. Total Loan Repayments */}
          <StatCard
            title="Loan Repayments"
            amount={formatCurrency(summary.effectiveBorrowingRepayments, currency)}
            subtitle="Borrowing debt payments made"
            icon={Landmark}
            color="purple"
            badgeText="Debt Reduction"
            badgeColor="rose"
          />

          {/* 7. Other Income */}
          <StatCard
            title="Other Income"
            amount={formatCurrency((summary.otherIncome || 0) + (summary.totalAdditionalIncome || 0), currency)}
            subtitle="Side income & external receipts"
            icon={Sparkles}
            color="teal"
            badgeText="Additional"
            badgeColor="emerald"
          />

          {/* 8. Remaining Available Cash */}
          <StatCard
            title="Available Cash"
            amount={formatCurrency(summary.availableCash, currency)}
            subtitle={`Opening Cash: ${formatCurrency(summary.openingCash, currency)}`}
            icon={Wallet}
            color={summary.availableCash >= 0 ? "emerald" : "rose"}
            badgeText={summary.availableCash >= 0 ? "Positive Cash" : "Negative Cash"}
            badgeColor={summary.availableCash >= 0 ? "emerald" : "rose"}
          />

          {/* 9. Total Savings Balance */}
          <StatCard
            title="Total Savings Balance"
            amount={formatCurrency(summary.totalSavings, currency)}
            subtitle={`${summary.accountBalances?.length || 0} active savings account(s)`}
            icon={PiggyBank}
            color="indigo"
            badgeText="Liquid Asset"
            badgeColor="blue"
          />

          {/* 10. Outstanding Receivables */}
          <StatCard
            title="Outstanding Receivables"
            amount={formatCurrency(summary.outstandingReceivables, currency)}
            subtitle={`Total Lent: ${formatCurrency(summary.totalMoneyLent, currency)}`}
            icon={ArrowUpRight}
            color="cyan"
            badgeText="To Collect"
            badgeColor="blue"
          />

          {/* 11. Outstanding Payables */}
          <StatCard
            title="Outstanding Payables"
            amount={formatCurrency(summary.outstandingPayables, currency)}
            subtitle={`Total Borrowed: ${formatCurrency(summary.totalMoneyBorrowed, currency)}`}
            icon={ArrowDownLeft}
            color="rose"
            badgeText="To Repay"
            badgeColor="rose"
          />

          {/* 12. Estimated Net Worth */}
          <StatCard
            title="Estimated Net Worth"
            amount={formatCurrency(summary.estimatedNetWorth, currency)}
            subtitle="Cash + Savings + Rec. - Pay."
            icon={ShieldCheck}
            color="emerald"
            badgeText="Net Worth"
            badgeColor="emerald"
          />
        </div>
      </section>

      {/* 3. ACCOUNTING TRANSPARENCY ACCORDION */}
      <section aria-label="Accounting Logic Transparency">
        <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl p-4 sm:p-5 transition-all">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                <Info className="w-4 h-4" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-emerald-950 dark:text-emerald-100">
                Zero Double-Counting Accounting Logic
              </h3>
            </div>
            <button
              onClick={() => setShowFormulaExplanation(!showFormulaExplanation)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 transition-colors"
            >
              <span>{showFormulaExplanation ? "Hide Details" : "View Formulas"}</span>
              {showFormulaExplanation ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showFormulaExplanation && (
            <div className="text-xs text-emerald-900/90 dark:text-emerald-200/90 space-y-2 pt-3 mt-3 border-t border-emerald-200/70 dark:border-emerald-800/60 animate-fadeIn leading-relaxed">
              <p>
                • <strong>Available Cash:</strong> Opening Cash + Net Salary Received + Other Income + Borrowed Money + Lending Repayments Received + Savings Withdrawals − (Expenses + Savings Allocations + Money Lent + Loan Repayments Paid).
              </p>
              <p>
                • <strong>Payroll Deductions:</strong> If entered under <em>Actual Net Salary Received</em> mode, deductions were already subtracted at source by your employer and are <strong>never deducted again</strong> from your cash.
              </p>
              <p>
                • <strong>Savings Allocations:</strong> Transfers cash to your savings accounts; it is strictly an internal asset reallocation and is <strong>not counted as an expense</strong>.
              </p>
              <p>
                • <strong>Borrowing & Lending:</strong> Borrowing is a liability, not income. Lending reduces cash but increases receivables, leaving net worth intact.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 4. VISUAL CHARTS SECTION */}
      <section aria-label="Financial Trends & Analytics">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Trend Chart (2 columns on large screens) */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {chartMode === "income-expense" ? "12-Month Income vs Expenses" : "Savings Growth Trend"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Monthly cash flows computed directly from Excel workbook records.
                </p>
              </div>
              
              <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
                <button
                  onClick={() => setChartMode("income-expense")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    chartMode === "income-expense"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-bold"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Income vs Expenses
                </button>
                <button
                  onClick={() => setChartMode("savings-trend")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    chartMode === "savings-trend"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-bold"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Savings Growth
                </button>
              </div>
            </div>

            <div className="h-72 w-full">
              {chartMode === "income-expense" ? (
                <Bar data={incomeExpenseData} options={chartOptions} />
              ) : (
                <Line data={savingsTrendData} options={chartOptions} />
              )}
            </div>
          </div>

          {/* Expenses by Category Donut Chart (1 column) */}
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col justify-between">
            <div className="mb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Expenses by Category
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Spending distribution across classified categories.
              </p>
            </div>

            <div className="h-64 w-full flex items-center justify-center my-auto">
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>

            <div className="text-center pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex items-center justify-between">
              <span>Total Expenses:</span>
              <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                {formatCurrency(summary.totalExpenses, currency)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. MONTHLY BREAKDOWN LEDGER */}
      {monthlyBreakdown.length > 0 && (
        <section aria-label="Monthly Cash Flow Breakdown">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Monthly Outflow Breakdown & Salary Balance
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Net salary received vs monthly expenses, savings allocations, and remaining unspent salary.
                </p>
              </div>
              <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {monthlyBreakdown.length} Cycle(s)
              </span>
            </div>

            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5">Month</th>
                    <th className="px-4 py-3.5 text-right">Gross Salary</th>
                    <th className="px-4 py-3.5 text-right">Payroll Ded.</th>
                    <th className="px-4 py-3.5 text-right">Net Received</th>
                    <th className="px-4 py-3.5 text-right">Expenses</th>
                    <th className="px-4 py-3.5 text-right">Savings Alloc.</th>
                    <th className="px-4 py-3.5 text-right">Loan Repay.</th>
                    <th className="px-4 py-3.5 text-right">Remaining Salary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {monthlyBreakdown.map((row) => (
                    <tr
                      key={row.month}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3.5 font-bold font-mono text-slate-900 dark:text-white">
                        {row.month}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-slate-600 dark:text-slate-300">
                        {formatCurrency(row.grossSalary, currency)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-amber-600 dark:text-amber-400">
                        {row.payrollDeductions > 0 ? `-${formatCurrency(row.payrollDeductions, currency)}` : "-"}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(row.netSalaryReceived, currency)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-rose-600 dark:text-rose-400">
                        {row.expenses > 0 ? `-${formatCurrency(row.expenses, currency)}` : "-"}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-indigo-600 dark:text-indigo-400">
                        {row.savingsAllocations > 0 ? formatCurrency(row.savingsAllocations, currency) : "-"}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-purple-600 dark:text-purple-400">
                        {row.loanRepayments > 0 ? `-${formatCurrency(row.loanRepayments, currency)}` : "-"}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold">
                        <span
                          className={
                            row.remainingSalaryBalance >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }
                        >
                          {formatCurrency(row.remainingSalaryBalance, currency)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* 6. RECENT LEDGER TRANSACTIONS */}
      <section aria-label="Recent Transactions">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Recent Transactions
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Latest entries synced directly with your Excel master ledger.
              </p>
            </div>
            <button
              onClick={() => setActiveTab("transactions")}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors inline-flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs min-w-[620px]">
              <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Category / Description</th>
                  <th className="px-4 py-3">Flow</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      No transactions recorded yet in the active Excel database.
                    </td>
                  </tr>
                ) : (
                  recentTransactions.map((tx) => {
                    const isInflow = tx.Cash_Flow_Type === "Inflow";
                    const isOutflow = tx.Cash_Flow_Type === "Outflow";

                    return (
                      <tr
                        key={tx.Transaction_ID || tx.Record_ID}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-4 py-3.5 font-mono text-slate-600 dark:text-slate-300">
                          {tx.Transaction_Date}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                            {tx.Transaction_Type?.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-semibold text-slate-900 dark:text-white block">
                            {tx.Category}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-xs block">
                            {tx.Description}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
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
                          className={`px-4 py-3.5 text-right font-bold font-mono text-xs sm:text-sm ${
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
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
