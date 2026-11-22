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
  Receipt
} from "lucide-react";
import { useFinance } from "../../context/FinanceContext.jsx";
import { formatCurrency } from "../../services/financialCalculations.js";
import { Modal } from "../common/Modal.jsx";
import { EmptyState } from "../common/EmptyState.jsx";
import { getTodayDateStr } from "../../types/schema.js";

const DEFAULT_EXPENSE_CATEGORIES = [
  "All",
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

export function ExpensesView() {
  const { database, summary, addExpense, updateExpense, deleteExpense } = useFinance();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");

  // Form states
  const [expenseDate, setExpenseDate] = useState(getTodayDateStr());
  const [category, setCategory] = useState("Food");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [description, setDescription] = useState("");
  const [receiptRef, setReceiptRef] = useState("");

  const currency = summary.currency || "LKR";
  const expensesList = database?.sheets?.Expenses || [];

  const openAddModal = () => {
    setEditingExpense(null);
    setExpenseDate(getTodayDateStr());
    setCategory("Food");
    setAmount("");
    setPaymentMethod("Cash");
    setDescription("");
    setReceiptRef("");
    setIsModalOpen(true);
  };

  const openEditModal = (rec) => {
    setEditingExpense(rec);
    setExpenseDate(rec.Expense_Date || getTodayDateStr());
    setCategory(rec.Category || "Food");
    setAmount(String(rec.Amount || ""));
    setPaymentMethod(rec.Payment_Method || "Cash");
    setDescription(rec.Description || "");
    setReceiptRef(rec.Receipt_Ref || "");
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingExpense) {
      updateExpense(editingExpense.Record_ID, {
        expenseDate,
        category,
        amount: Number(amount) || 0,
        paymentMethod,
        description,
        receiptRef
      });
    } else {
      addExpense({
        expenseDate,
        category,
        amount: Number(amount) || 0,
        paymentMethod,
        description,
        receiptRef
      });
    }
    setIsModalOpen(false);
  };

  const handleDelete = (recId) => {
    if (window.confirm("Are you sure you want to delete this expense? This will update the active Excel database.")) {
      deleteExpense(recId);
    }
  };

  // Filtered expense records
  const filteredExpenses = expensesList.filter((item) => {
    const matchesCategory = selectedCategory === "All" || item.Category === selectedCategory;
    const matchesMonth = !selectedMonth || (item.Expense_Date && item.Expense_Date.startsWith(selectedMonth));
    const matchesSearch =
      !searchQuery ||
      item.Description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.Category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.Receipt_Ref?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesMonth && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Expense Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Categorized daily expenses, bills, and spending breakdowns.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Expense
        </button>
      </div>

      {/* Category Breakdown Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(summary.expensesByCategory || {}).slice(0, 4).map(([cat, amt]) => (
          <div
            key={cat}
            className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm"
          >
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
              {cat}
            </span>
            <span className="text-lg font-bold text-slate-900 dark:text-white mt-1 block">
              {formatCurrency(amt, currency)}
            </span>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {DEFAULT_EXPENSE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedCategory === cat
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Month Filter */}
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-rose-500"
          />

          {/* Search Box */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search expenses..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Expenses History ({filteredExpenses.length})
          </h3>
          <span className="text-xs text-slate-500">
            Filtered Total: <span className="font-bold text-rose-600">{formatCurrency(filteredExpenses.reduce((acc, curr) => acc + (Number(curr.Amount) || 0), 0), currency)}</span>
          </span>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={CreditCard}
              title="No expenses match your filters"
              description="Add a new expense or adjust category/search filters."
              actionText="Add Expense"
              onAction={openAddModal}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Description</th>
                  <th className="px-5 py-3.5">Payment Method</th>
                  <th className="px-5 py-3.5">Receipt Ref</th>
                  <th className="px-5 py-3.5 text-right">Amount</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredExpenses.map((rec) => (
                  <tr
                    key={rec.Record_ID}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-5 py-4 font-mono text-slate-600 dark:text-slate-300">
                      {rec.Expense_Date}
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                        {rec.Category}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-900 dark:text-white max-w-xs truncate">
                      {rec.Description || "-"}
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      {rec.Payment_Method}
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-400 text-[11px]">
                      {rec.Receipt_Ref || "-"}
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                      {formatCurrency(rec.Amount, currency)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(rec)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Edit Expense"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(rec.Record_ID)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expense Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingExpense ? "Edit Expense" : "Add New Expense"}
        subtitle="Appends record directly into Expenses worksheet"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-rose-500"
              >
                {DEFAULT_EXPENSE_CATEGORIES.filter((c) => c !== "All").map((c) => (
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
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Expense Date
              </label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-rose-500"
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
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-rose-500"
              >
                <option value="Cash">Cash</option>
                <option value="Bank Card">Bank Card / Debit</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Online">Online / Frimi / Genie</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Monthly supermarket groceries at Keells"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-rose-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Receipt Reference / Bill #
            </label>
            <input
              type="text"
              value={receiptRef}
              onChange={(e) => setReceiptRef(e.target.value)}
              placeholder="e.g. INV-2026-998"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-rose-500"
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
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm shadow-sm"
            >
              {editingExpense ? "Save Changes" : "Save Expense"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
