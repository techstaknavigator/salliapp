import React, { useState } from "react";
import {
  Settings,
  Tag,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Globe,
  User,
  Sliders,
  Plus,
  KeyRound,
  LogOut,
  AlertCircle,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Download
} from "lucide-react";
import { useFinance } from "../../context/FinanceContext.jsx";
import { formatCurrency } from "../../services/financialCalculations.js";
import { Modal } from "../common/Modal.jsx";
import { generateRecordId, getNowISO } from "../../types/schema.js";

export function SettingsView() {
  const {
    database,
    summary,
    showToast,
    changeDatabasePassword,
    closeDatabase
  } = useFinance();

  const [isAddCatModalOpen, setIsAddCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState("Expense");
  const [newCatColor, setNewCatColor] = useState("#10B981");

  // Change Password states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passChangeMsg, setPassChangeMsg] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currency = summary.currency || "LKR";
  const categories = database?.sheets?.Categories || [];
  const settingsRecords = database?.sheets?.Financial_Settings || [];

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassChangeMsg(null);

    if (newPassword.length < 8) {
      setPassChangeMsg({
        type: "error",
        text: "New Excel password must be at least 8 characters long."
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassChangeMsg({
        type: "error",
        text: "New password and confirmation do not match."
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await changeDatabasePassword(currentPassword, newPassword);
      setIsSubmitting(false);

      if (success) {
        setPassChangeMsg({
          type: "success",
          text: "Excel database password changed! Downloaded newly protected Personal_Finance_Database.xlsx. Use your new password in Microsoft Excel."
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPassChangeMsg({
          type: "error",
          text: "Incorrect current password. Could not change database password."
        });
      }
    } catch (err) {
      setIsSubmitting(false);
      setPassChangeMsg({
        type: "error",
        text: err.message || "Failed to change database password."
      });
    }
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const dbId = database.databaseId;
    const now = getNowISO();

    database.sheets.Categories = [
      ...(database.sheets.Categories || []),
      {
        Database_ID: dbId,
        Record_ID: generateRecordId("CAT"),
        Category_Type: newCatType,
        Category_Name: newCatName.trim(),
        Color: newCatColor,
        Icon: "Tag",
        Created_Date: now,
        Updated_Date: now
      }
    ];

    showToast("success", `Category '${newCatName}' added.`);
    setNewCatName("");
    setIsAddCatModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Financial Settings & System Parameters
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Workbook configurations, custom category taxonomy, and Excel encryption parameters.
        </p>
      </div>

      {/* Section 1: Data Privacy Card */}
      <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-3xl p-6 sm:p-8 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-emerald-950 dark:text-emerald-100">
              100% Client-Side Privacy Guarantee
            </h3>
            <p className="text-xs text-emerald-800 dark:text-emerald-300">
              Zero Server Uploads • Zero External Database Storage
            </p>
          </div>
        </div>

        <p className="text-xs text-emerald-900/90 dark:text-emerald-200/90 leading-relaxed max-w-3xl">
          All financial calculations, Excel workbook operations, and data manipulations execute strictly inside your local web browser session. Your financial records are <strong>never</strong> transmitted to Vercel, Netlify, or any third-party analytics API. Your <strong>Personal_Finance_Database.xlsx</strong> file is the exclusive permanent repository of your financial life; store and back it up safely on your trusted drives.
        </p>
      </div>

      {/* Section 2: Excel Database Password & Security */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Excel Database Password & Encryption
              </h3>
              <p className="text-xs text-slate-500">
                Microsoft Office Agile Encryption (AES-256-CBC, SHA-512, 100k Spin Count)
              </p>
            </div>
          </div>

          <button
            onClick={closeDatabase}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 font-semibold text-xs shadow-sm transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Lock & Close Database</span>
          </button>
        </div>

        {/* Active Security Info Box */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Encryption Standard</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Office Agile AES-256
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Microsoft Excel Integration</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block mt-0.5">
              Native Excel Password Prompt
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Active Database State</span>
            <span className="text-xs font-bold block mt-0.5">
              {database?.isDirty ? (
                <span className="text-amber-500 font-semibold">Unsaved Changes In Memory</span>
              ) : (
                <span className="text-emerald-500 font-semibold">Clean / Saved</span>
              )}
            </span>
          </div>
        </div>

        {/* Change Database Password Form */}
        <form onSubmit={handleChangePassword} className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Change Excel Database Password
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showPassword ? "Hide" : "Show"}</span>
            </button>
          </div>

          {passChangeMsg && (
            <div
              className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 ${
                passChangeMsg.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                  : "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800"
              }`}
            >
              {passChangeMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              )}
              <span>{passChangeMsg.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Current Password *
              </label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter current Excel password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                New Password (min 8 chars) *
              </label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 font-mono"
                required
                minLength={8}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Confirm New Password *
              </label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 font-mono"
                required
                minLength={8}
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 space-y-1">
            <p>
              ℹ️ <strong>How it works:</strong> Updating your password will immediately re-encrypt your 15-sheet Excel database in memory and automatically download an updated, protected copy of <strong>Personal_Finance_Database.xlsx</strong>.
            </p>
            <p>
              The <strong>old password will no longer open</strong> the file. You must use this new password when opening the file in Microsoft Excel and in this web application.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-2"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Re-encrypting..." : "Update Password & Download Protected XLSX"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Categories Management */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Category Taxonomy ({categories.length})
            </h3>
            <p className="text-xs text-slate-500">
              Worksheet: <span className="font-mono text-emerald-600">Categories</span>
            </p>
          </div>

          <button
            onClick={() => setIsAddCatModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Custom Category
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {categories.map((cat) => (
            <div
              key={cat.Record_ID}
              className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-2 text-xs"
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: cat.Color || "#10B981" }}
              />
              <div className="truncate">
                <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                  {cat.Category_Name}
                </span>
                <span className="text-[10px] text-slate-400 block uppercase">
                  {cat.Category_Type}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Financial Settings Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            System Parameters ({settingsRecords.length})
          </h3>
          <p className="text-xs text-slate-500">
            Worksheet: <span className="font-mono text-emerald-600">Financial_Settings</span>
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Setting Key</th>
                <th className="px-6 py-3.5">Setting Value</th>
                <th className="px-6 py-3.5">Description</th>
                <th className="px-6 py-3.5">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {settingsRecords.map((set) => (
                <tr
                  key={set.Record_ID}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">
                    {set.Setting_Key}
                  </td>
                  <td className="px-6 py-4 font-semibold text-emerald-600 dark:text-emerald-400">
                    {set.Setting_Value}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {set.Description}
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-400 text-[11px]">
                    {set.Updated_Date?.slice(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Category Modal */}
      <Modal
        isOpen={isAddCatModalOpen}
        onClose={() => setIsAddCatModalOpen(false)}
        title="Add Custom Category"
        subtitle="Appends new category definition to Categories worksheet"
      >
        <form onSubmit={handleAddCategory} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Category Name
            </label>
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g. Pet Care, Freelancing"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Category Type
              </label>
              <select
                value={newCatType}
                onChange={(e) => setNewCatType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Expense">Expense</option>
                <option value="Income">Income</option>
                <option value="Deduction">Deduction</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Color Tag
              </label>
              <input
                type="color"
                value={newCatColor}
                onChange={(e) => setNewCatColor(e.target.value)}
                className="w-full h-10 p-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAddCatModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm"
            >
              Save Category
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
