import React, { useState } from "react";
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  Filter,
  Search,
  PieChart,
  Calendar,
  Receipt,
  PiggyBank,
  Scissors,
  Landmark,
  Tag,
  ArrowRight,
  Info,
  CheckCircle2,
  AlertCircle,
  FolderPlus
} from "lucide-react";
import { useFinance } from "../../context/FinanceContext.jsx";
import { formatCurrency } from "../../services/financialCalculations.js";
import { Modal } from "../common/Modal.jsx";
import { EmptyState } from "../common/EmptyState.jsx";
import { getTodayDateStr } from "../../types/schema.js";

const TRANSACTION_TYPES = [
  "Daily Expense",
  "Monthly Expense",
  "Payroll Deduction",
  "Loan Repayment",
  "Savings Allocation",
  "Other Deduction"
];

const DEFAULT_CATEGORIES = [
  "Food & Groceries",
  "Transport",
  "Electricity & Water",
  "Internet & Telephone",
  "Rent",
  "Shopping",
  "Medical",
  "Personal Expenses",
  "Loan Repayments",
  "Insurance",
  "Savings Allocation",
  "Other Deductions"
];

export function DeductionsExpensesView() {
  const {
    database,
    summary,
    addOutgoingTransaction,
    updateOutgoingTransaction,
    deleteOutgoingTransaction,
    addCustomCategory,
    deleteCustomCategory
  } = useFinance();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Filters
  const [selectedType, setSelectedType] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Form states
  const [transactionType, setTransactionType] = useState("Daily Expense");
  const [salaryMonth, setSalaryMonth] = useState(getTodayDateStr().slice(0, 7));
  const [expenseDate, setExpenseDate] = useState(getTodayDateStr());
  const [category, setCategory] = useState("Food & Groceries");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [description, setDescription] = useState("");
  const [receiptRef, setReceiptRef] = useState("");
  const [linkedSavingsAccountId, setLinkedSavingsAccountId] = useState("");
  const [linkedLoanId, setLinkedLoanId] = useState("");

  // Category modal states
  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState("Expense");
  const [newCatColor, setNewCatColor] = useState("#10B981");

  const currency = summary.currency || "LKR";

  // Combine Expenses and legacy Salary_Deductions seamlessly
  const rawExpenses = database?.sheets?.Expenses || [];
  const rawLegacyDeductions = database?.sheets?.Salary_Deductions || [];
  const savingsAccounts = database?.sheets?.Savings_Accounts || [];
  const borrowingList = database?.sheets?.Borrowing || [];
  const customCategories = database?.sheets?.Categories || [];

  // Combine for unified display
  const unifiedTransactions = [
    ...rawExpenses.map((e) => ({
      ...e,
      isLegacy: false
    })),
    ...rawLegacyDeductions.map((d) => ({
      Database_ID: d.Database_ID,
      Record_ID: d.Record_ID,
      Transaction_ID: d.Transaction_ID,
      Salary_Month: d.Salary_Month,
      Expense_Date: d.Deduction_Date,
      Category: d.Category,
      Transaction_Type: d.Category === "Savings" ? "Savings Allocation" : "Payroll Deduction",
      Amount: d.Amount,
      Payment_Method: "Payroll Deduction",
      Description: d.Description || "Salary Deduction",
      Receipt_Ref: "",
      Linked_Savings_Account_ID: d.Auto_Deposit_Savings_Account_ID || "",
      Linked_Loan_ID: "",
      isLegacy: true
    }))
  ];

  // All category names
  const allCategoryNames = Array.from(
    new Set([
      ...DEFAULT_CATEGORIES,
      ...customCategories.map((c) => c.Category_Name),
      ...unifiedTransactions.map((t) => t.Category).filter(Boolean)
    ])
  );

  const openAddModal = (presetType = "Daily Expense") => {
    setEditingTx(null);
    setTransactionType(presetType);
    setSalaryMonth(getTodayDateStr().slice(0, 7));
    setExpenseDate(getTodayDateStr());
    if (presetType === "Savings Allocation") {
      setCategory("Savings Allocation");
      setLinkedSavingsAccountId(savingsAccounts[0]?.Record_ID || "");
    } else if (presetType === "Loan Repayment") {
      setCategory("Loan Repayments");
      setLinkedLoanId(borrowingList[0]?.Record_ID || "");
    } else {
      setCategory("Food & Groceries");
      setLinkedSavingsAccountId("");
      setLinkedLoanId("");
    }
    setAmount("");
    setPaymentMethod("Cash");
    setDescription("");
    setReceiptRef("");
    setIsModalOpen(true);
  };

  const openEditModal = (rec) => {
    setEditingTx(rec);
    setTransactionType(rec.Transaction_Type || "Daily Expense");
    setSalaryMonth(rec.Salary_Month || getTodayDateStr().slice(0, 7));
    setExpenseDate(rec.Expense_Date || getTodayDateStr());
    setCategory(rec.Category || "Food & Groceries");
    setAmount(String(rec.Amount || ""));
    setPaymentMethod(rec.Payment_Method || "Cash");
    setDescription(rec.Description || "");
    setReceiptRef(rec.Receipt_Ref || "");
    setLinkedSavingsAccountId(rec.Linked_Savings_Account_ID || "");
    setLinkedLoanId(rec.Linked_Loan_ID || "");
    setIsModalOpen(true);
  };

  const handleTypeChange = (newType) => {
    setTransactionType(newType);
    if (newType === "Savings Allocation") {
      setCategory("Savings Allocation");
      setLinkedSavingsAccountId(savingsAccounts[0]?.Record_ID || "");
      setPaymentMethod("Bank Transfer");
    } else if (newType === "Loan Repayment") {
      setCategory("Loan Repayments");
      setLinkedLoanId(borrowingList[0]?.Record_ID || "");
    } else if (newType === "Payroll Deduction") {
      setPaymentMethod("Payroll Deduction");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      transactionType,
      salaryMonth,
      expenseDate,
      category,
      amount: Number(amount) || 0,
      paymentMethod,
      description,
      receiptRef,
      linkedSavingsAccountId: transactionType === "Savings Allocation" ? linkedSavingsAccountId : "",
      linkedLoanId: transactionType === "Loan Repayment" ? linkedLoanId : ""
    };

    if (editingTx) {
      updateOutgoingTransaction(editingTx.Record_ID, data);
    } else {
      addOutgoingTransaction(data);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (rec) => {
    if (window.confirm(`Delete ${rec.Transaction_Type || "transaction"} for ${formatCurrency(rec.Amount, currency)}? Linked savings or loan entries will be updated.`)) {
      deleteOutgoingTransaction(rec.Record_ID);
    }
  };

  const handleAddCustomCategory = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addCustomCategory({
      categoryName: newCatName.trim(),
      categoryType: newCatType,
      color: newCatColor
    });
    setNewCatName("");
    setIsCategoryModalOpen(false);
  };

  // Filter list
  const filteredList = unifiedTransactions.filter((tx) => {
    if (selectedType !== "All" && tx.Transaction_Type !== selectedType) return false;
    if (selectedCategory !== "All" && tx.Category !== selectedCategory) return false;
    if (selectedMonth && tx.Salary_Month !== selectedMonth && (!tx.Expense_Date || !tx.Expense_Date.startsWith(selectedMonth))) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = tx.Description?.toLowerCase().includes(q);
      const matchCat = tx.Category?.toLowerCase().includes(q);
      const matchRef = tx.Receipt_Ref?.toLowerCase().includes(q);
      const matchMethod = tx.Payment_Method?.toLowerCase().includes(q);
      if (!matchDesc && !matchCat && !matchRef && !matchMethod) return false;
    }
    return true;
  });

  // Calculate totals
  let totalExpensesSum = 0;
  let totalSavingsSum = 0;
  let totalLoanRepaymentsSum = 0;
  let totalPayrollDeductionsSum = 0;

  unifiedTransactions.forEach((t) => {
    const amt = Number(t.Amount) || 0;
    if (t.Transaction_Type === "Savings Allocation") totalSavingsSum += amt;
    else if (t.Transaction_Type === "Loan Repayment") totalLoanRepaymentsSum += amt;
    else if (t.Transaction_Type === "Payroll Deduction") totalPayrollDeductionsSum += amt;
    else totalExpensesSum += amt;
  });

  const getTypeBadgeClass = (type) => {
    switch (type) {
      case "Daily Expense":
        return "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "Monthly Expense":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
      case "Savings Allocation":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "Loan Repayment":
        return "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      case "Payroll Deduction":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span>Deductions & Expenses</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Unified Outflows
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Unified outgoing transactions, daily expenses, payroll deductions, and automatic savings allocations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-sm transition-all"
          >
            <FolderPlus className="w-3.5 h-3.5 text-emerald-500" />
            <span>Categories</span>
          </button>

          <button
            onClick={() => openAddModal("Daily Expense")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Expenses */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Expenses
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
              {formatCurrency(totalExpensesSum, currency)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Daily & monthly spending
            </p>
          </div>
        </div>

        {/* Savings Allocations */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Savings Allocations
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">
              {formatCurrency(totalSavingsSum, currency)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Transferred to savings (not an expense)
            </p>
          </div>
        </div>

        {/* Payroll Deductions */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Payroll Deductions
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <Scissors className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums tracking-tight">
              {formatCurrency(totalPayrollDeductionsSum, currency)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              EPF, taxes & salary deductions
            </p>
          </div>
        </div>

        {/* Loan Repayments */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              Loan Repayments
            </span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400 tabular-nums tracking-tight">
              {formatCurrency(totalLoanRepaymentsSum, currency)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Debt reduction outflows
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search description, notes, ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Filter Type */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value="All">All Outflow Types</option>
              {TRANSACTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Category */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value="All">All Categories</option>
              {allCategoryNames.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Month */}
          <div>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              title="Filter by salary month"
            />
          </div>
        </div>

        {(selectedType !== "All" || selectedCategory !== "All" || selectedMonth || searchQuery) && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>
              Showing {filteredList.length} of {unifiedTransactions.length} transaction(s)
            </span>
            <button
              onClick={() => {
                setSelectedType("All");
                setSelectedCategory("All");
                setSelectedMonth("");
                setSearchQuery("");
              }}
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Unified Transactions Table / Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            Transactions History ({filteredList.length})
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {selectedMonth || "All Months"}
          </span>
        </div>

        {filteredList.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={CreditCard}
              title="No outgoing transactions found"
              description="Add daily expenses, monthly bills, loan repayments, or automatic savings allocations."
              actionText="Add Outgoing Transaction"
              onAction={() => openAddModal("Daily Expense")}
            />
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Description & Purpose</th>
                  <th className="px-4 py-3.5">Method</th>
                  <th className="px-4 py-3.5 text-right">Amount</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredList.map((rec) => {
                  const targetAcc = savingsAccounts.find((a) => a.Record_ID === rec.Linked_Savings_Account_ID);
                  return (
                    <tr
                      key={rec.Record_ID}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3.5 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {rec.Expense_Date}
                        {rec.Salary_Month && (
                          <span className="block text-[10px] text-slate-400">
                            Cycle: {rec.Salary_Month}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getTypeBadgeClass(
                            rec.Transaction_Type
                          )}`}
                        >
                          {rec.Transaction_Type || "Daily Expense"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-900 dark:text-white">
                        {rec.Category}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 max-w-xs">
                        <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {rec.Description || "-"}
                        </div>
                        {rec.Transaction_Type === "Savings Allocation" && targetAcc && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                            <PiggyBank className="w-3 h-3" />
                            Deposited to: {targetAcc.Account_Name}
                          </span>
                        )}
                        {rec.Receipt_Ref && (
                          <span className="text-[10px] text-slate-400 block font-mono">
                            Ref: {rec.Receipt_Ref}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                        {rec.Payment_Method || "Cash"}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold whitespace-nowrap">
                        <span
                          className={
                            rec.Transaction_Type === "Savings Allocation"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : rec.Transaction_Type === "Payroll Deduction"
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-slate-900 dark:text-white"
                          }
                        >
                          {formatCurrency(rec.Amount, currency)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {!rec.isLegacy && (
                            <button
                              onClick={() => openEditModal(rec)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Edit Transaction"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(rec)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Delete Transaction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Transaction Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTx ? "Edit Outgoing Transaction" : "Record Deduction or Expense"}
        subtitle="Saved directly into your active Excel database with zero double-counting"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Transaction Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Transaction Outflow Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TRANSACTION_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-left ${
                    transactionType === t
                      ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Explanatory Info Box for Type */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
            <Info className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div>
              {transactionType === "Savings Allocation" && (
                <span>
                  <strong>Savings Allocation:</strong> Transfers money from Available Cash into your chosen Savings Account. Automatically creates 1 paired deposit. Not counted as an expense!
                </span>
              )}
              {transactionType === "Payroll Deduction" && (
                <span>
                  <strong>Payroll Deduction:</strong> Subtracted on the salary payslip at source (EPF, taxes, etc.). Will never be deducted twice from your cash balance!
                </span>
              )}
              {transactionType === "Loan Repayment" && (
                <span>
                  <strong>Loan Repayment:</strong> Cash paid towards clearing borrowed funds. Updates remaining borrowing debt balance.
                </span>
              )}
              {(transactionType === "Daily Expense" || transactionType === "Monthly Expense") && (
                <span>
                  <strong>Expense:</strong> Regular living expenditure. Deducted from available cash.
                </span>
              )}
              {transactionType === "Other Deduction" && (
                <span>
                  <strong>Other Deduction:</strong> Miscellaneous outgoing deduction or bank charge.
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Salary Month Cycle
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
                Transaction Date
              </label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
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
                {allCategoryNames.map((c) => (
                  <option key={c} value={c}>
                    {c}
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
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Cash">Cash</option>
                <option value="Bank Card">Bank Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Online">Online / Digital</option>
                <option value="Payroll Deduction">Payroll Deduction</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Receipt / Ref Number (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. REC-1029"
                value={receiptRef}
                onChange={(e) => setReceiptRef(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Conditional Target Savings Account */}
          {transactionType === "Savings Allocation" && (
            <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
              <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                Target Savings Account (Auto-Deposit)
              </label>
              <select
                value={linkedSavingsAccountId}
                onChange={(e) => setLinkedSavingsAccountId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
                required
              >
                <option value="">Select savings account...</option>
                {savingsAccounts.map((acc) => (
                  <option key={acc.Record_ID} value={acc.Record_ID}>
                    {acc.Account_Name} (Target: {formatCurrency(acc.Target_Amount, currency)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Conditional Target Borrowing Record */}
          {transactionType === "Loan Repayment" && (
            <div className="p-4 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 space-y-2">
              <label className="block text-xs font-bold text-purple-900 dark:text-purple-200 uppercase tracking-wider">
                Select Borrowed Loan to Repay
              </label>
              <select
                value={linkedLoanId}
                onChange={(e) => setLinkedLoanId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">Select loan...</option>
                {borrowingList.map((loan) => (
                  <option key={loan.Record_ID} value={loan.Record_ID}>
                    From {loan.Person_Name} - Rem: {formatCurrency(loan.Remaining_Balance, currency)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Description / Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Weekly grocery at Keells Supermarket"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition-all"
            >
              {editingTx ? "Update Transaction" : "Save Transaction"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Category Management Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Custom Category Taxonomy"
        subtitle="Create, edit, and organize categories for Deductions & Expenses"
      >
        <div className="space-y-5">
          <form onSubmit={handleAddCustomCategory} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Create New Custom Category
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  placeholder="Category Name (e.g. Pet Care, Tuition)"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <select
                  value={newCatType}
                  onChange={(e) => setNewCatType(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Expense">Expense</option>
                  <option value="Deduction">Deduction</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-all"
              >
                Add Category
              </button>
            </div>
          </form>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Existing Custom Categories ({customCategories.length})
            </h4>
            {customCategories.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">No custom categories yet. Add one above.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {customCategories.map((c) => (
                  <div
                    key={c.Record_ID}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between text-xs"
                  >
                    <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                      {c.Category_Name}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteCustomCategory(c.Record_ID)}
                      className="p-1 text-slate-400 hover:text-rose-500"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
