import React, { useState } from "react";
import {
  Briefcase,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  Scissors,
  Info,
  ShieldCheck,
  ArrowRight
} from "lucide-react";
import { useFinance } from "../../context/FinanceContext.jsx";
import { formatCurrency } from "../../services/financialCalculations.js";
import { Modal } from "../common/Modal.jsx";
import { EmptyState } from "../common/EmptyState.jsx";
import { getTodayDateStr } from "../../types/schema.js";

export function SalaryView() {
  const { database, summary, addSalary, updateSalary, deleteSalary } = useFinance();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  // Form states
  const [salaryMonth, setSalaryMonth] = useState(getTodayDateStr().slice(0, 7));
  const [salaryReceivedDate, setSalaryReceivedDate] = useState(getTodayDateStr());
  const [salaryMode, setSalaryMode] = useState("Gross"); // "Gross" | "Net"
  const [basicSalary, setBasicSalary] = useState("");
  const [allowances, setAllowances] = useState("");
  const [bonuses, setBonuses] = useState("");
  const [payrollDeductions, setPayrollDeductions] = useState("");
  const [additionalIncome, setAdditionalIncome] = useState("");
  const [notes, setNotes] = useState("");

  const currency = summary.currency || "LKR";
  const salaryList = database?.sheets?.Salary || [];

  // Live calculations for form
  const numBasic = Number(basicSalary) || 0;
  const numAllow = Number(allowances) || 0;
  const numBonus = Number(bonuses) || 0;
  const numDed = Number(payrollDeductions) || 0;
  const numAddl = Number(additionalIncome) || 0;

  let liveGross = 0;
  let liveNet = 0;

  if (salaryMode === "Net") {
    liveNet = numBasic; // In Net mode, basic is the net cash received
    liveGross = liveNet + numDed;
  } else {
    liveGross = numBasic + numAllow + numBonus;
    liveNet = Math.max(0, liveGross - numDed);
  }
  const liveTotalCash = liveNet + numAddl;

  const openAddModal = () => {
    setEditingRecord(null);
    setSalaryMonth(getTodayDateStr().slice(0, 7));
    setSalaryReceivedDate(getTodayDateStr());
    setSalaryMode("Gross");
    setBasicSalary("");
    setAllowances("");
    setBonuses("");
    setPayrollDeductions("");
    setAdditionalIncome("");
    setNotes("");
    setIsModalOpen(true);
  };

  const openEditModal = (rec) => {
    setEditingRecord(rec);
    setSalaryMonth(rec.Salary_Month || getTodayDateStr().slice(0, 7));
    setSalaryReceivedDate(rec.Salary_Received_Date || getTodayDateStr());
    setSalaryMode(rec.Salary_Mode || "Gross");
    setBasicSalary(String(rec.Basic_Salary || ""));
    setAllowances(String(rec.Allowances || ""));
    setBonuses(String(rec.Bonuses || ""));
    setPayrollDeductions(String(rec.Payroll_Deductions || ""));
    setAdditionalIncome(String(rec.Additional_Income || ""));
    setNotes(rec.Notes || "");
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      salaryMonth,
      salaryReceivedDate,
      salaryMode,
      basicSalary: numBasic,
      allowances: numAllow,
      bonuses: numBonus,
      payrollDeductions: numDed,
      additionalIncome: numAddl,
      netSalary: liveNet,
      notes
    };

    if (editingRecord) {
      updateSalary(editingRecord.Record_ID, data);
    } else {
      addSalary(data);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (recId) => {
    if (window.confirm("Are you sure you want to delete this salary record? This will update the active Excel workbook.")) {
      deleteSalary(recId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Salary Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Log monthly compensation, choose Gross or Actual Net salary mode, and track payroll deductions.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Salary Record
        </button>
      </div>

      {/* Salary Overview Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Gross Salary */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Gross Earnings
          </span>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
              {formatCurrency(summary.totalGrossSalary, currency)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Before payroll deductions
            </p>
          </div>
        </div>

        {/* Total Payroll Deductions */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Scissors className="w-3.5 h-3.5" />
            Total Payroll Deductions
          </span>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums tracking-tight">
              {formatCurrency(summary.totalPayrollDeductions || summary.totalDeductions, currency)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Subtracted at source on payslip
            </p>
          </div>
        </div>

        {/* Actual Net Cash Received */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Net Cash Received
          </span>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">
              {formatCurrency(summary.totalNetSalaryReceived || summary.totalGrossSalary, currency)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Deposited into Available Cash
            </p>
          </div>
        </div>
      </div>

      {/* Salary Records Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Salary History ({salaryList.length})
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            Worksheet: Salary
          </span>
        </div>

        {salaryList.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Briefcase}
              title="No salary records found"
              description="Record your monthly salary, received dates, bonuses, and choose between Gross or Net mode."
              actionText="Add First Salary"
              onAction={openAddModal}
            />
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs min-w-[760px]">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Month</th>
                  <th className="px-5 py-3.5">Received Date</th>
                  <th className="px-5 py-3.5">Mode</th>
                  <th className="px-5 py-3.5 text-right">Gross Salary</th>
                  <th className="px-5 py-3.5 text-right">Payroll Deductions</th>
                  <th className="px-5 py-3.5 text-right">Net Received</th>
                  <th className="px-5 py-3.5 text-right">Additional</th>
                  <th className="px-5 py-3.5 text-right">Cash Inflow</th>
                  <th className="px-5 py-3.5">Notes</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {salaryList.map((rec) => {
                  const mode = rec.Salary_Mode || "Gross";
                  const gross = Number(rec.Basic_Salary || 0) + Number(rec.Allowances || 0) + Number(rec.Bonuses || 0) || Number(rec.Total_Salary || 0);
                  const ded = Number(rec.Payroll_Deductions) || 0;
                  const net = Number(rec.Net_Salary) || (mode === "Net" ? Number(rec.Basic_Salary) : Math.max(0, gross - ded));
                  const addl = Number(rec.Additional_Income) || 0;
                  const inflow = net + addl;

                  return (
                    <tr
                      key={rec.Record_ID}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {rec.Salary_Month}
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {rec.Salary_Received_Date}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                            mode === "Net"
                              ? "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
                              : "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                          }`}
                        >
                          {mode === "Net" ? "Actual Net" : "Gross"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {formatCurrency(gross, currency)}
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-amber-600 dark:text-amber-400 whitespace-nowrap">
                        {ded > 0 ? `-${formatCurrency(ded, currency)}` : "-"}
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {formatCurrency(net, currency)}
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {addl > 0 ? `+${formatCurrency(addl, currency)}` : "-"}
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(inflow, currency)}
                      </td>
                      <td className="px-5 py-4 text-slate-500 max-w-xs truncate">
                        {rec.Notes || "-"}
                      </td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(rec)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Edit Salary"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(rec.Record_ID)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Delete Salary"
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

      {/* Salary Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRecord ? "Edit Salary Record" : "Add Monthly Salary Record"}
        subtitle="Saved directly into your active Excel database with accurate net cash calculation"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Salary Entry Mode Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Salary Entry Mode (Very Important)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSalaryMode("Gross")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  salaryMode === "Gross"
                    ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                }`}
              >
                <div className="font-bold text-xs">A. Gross Salary Mode</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Deductions still need to be applied. Net = Gross - Deductions.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSalaryMode("Net")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  salaryMode === "Net"
                    ? "bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-900 dark:text-teal-200 ring-2 ring-teal-500/20"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                }`}
              >
                <div className="font-bold text-xs">B. Actual Net Salary Received</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Payroll deductions already subtracted. Never deducted again from cash.
                </div>
              </button>
            </div>
          </div>

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
                Actual Salary Received Date
              </label>
              <input
                type="date"
                value={salaryReceivedDate}
                onChange={(e) => setSalaryReceivedDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                {salaryMode === "Net" ? `Actual Net Salary Received (${currency})` : `Basic / Gross Salary (${currency})`}
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={basicSalary}
                onChange={(e) => setBasicSalary(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Payroll Deductions on Payslip ({currency})
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={payrollDeductions}
                onChange={(e) => setPayrollDeductions(e.target.value)}
                placeholder="EPF, Tax, Medical (0.00)"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            {salaryMode === "Gross" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Allowances ({currency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={allowances}
                    onChange={(e) => setAllowances(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Bonuses ({currency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={bonuses}
                    onChange={(e) => setBonuses(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </>
            )}

            <div className={salaryMode === "Net" ? "sm:col-span-2" : ""}>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Additional Side Income ({currency})
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={additionalIncome}
                onChange={(e) => setAdditionalIncome(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* Live Calculation Preview Banner */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Gross Earnings:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {formatCurrency(liveGross, currency)}
              </span>
            </div>
            <div className="flex justify-between text-amber-600 dark:text-amber-400">
              <span>Payroll Deductions:</span>
              <span className="font-mono font-bold">
                -{formatCurrency(numDed, currency)}
              </span>
            </div>
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400 pt-1 border-t border-slate-200 dark:border-slate-700 font-bold">
              <span>Net Cash Inflow:</span>
              <span className="font-mono text-sm">
                {formatCurrency(liveTotalCash, currency)}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 pt-1">
              {salaryMode === "Net"
                ? "✓ Actual Net Received Mode: Payroll deductions were deducted by employer and will NOT be subtracted again from your cash."
                : "✓ Gross Mode: Net = Gross - Deductions. Only Net cash will be added to your Available Cash balance."}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Salary Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Regular monthly payroll after tax"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition-all flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{editingRecord ? "Update Salary" : "Save Salary Record"}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
