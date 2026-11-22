import React from "react";
import {
  AlertTriangle,
  Download,
  LogOut,
  X,
  ShieldAlert,
  FileSpreadsheet
} from "lucide-react";
import { useFinance } from "../../context/FinanceContext.jsx";

export function LogoutConfirmModal() {
  const {
    database,
    isLogoutModalOpen,
    setIsLogoutModalOpen,
    performLogout
  } = useFinance();

  if (!isLogoutModalOpen) return null;

  const hasUnsavedChanges = Boolean(database?.isDirty);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden animate-scaleUp">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-2xl ${
                hasUnsavedChanges
                  ? "bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              {hasUnsavedChanges ? (
                <ShieldAlert className="w-6 h-6" />
              ) : (
                <LogOut className="w-6 h-6" />
              )}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {hasUnsavedChanges
                  ? "Unsaved Changes Detected"
                  : "Confirm Secure Logout"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Session termination & memory cleanup
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsLogoutModalOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {hasUnsavedChanges ? (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Important Data Safety Warning</span>
                </div>
                <p className="text-xs leading-normal">
                  Your Excel workbook has <strong>unsaved additions or modifications</strong>. Because Excel is your <strong>only database</strong> and there is no server-side backup, unsaved edits exist solely in temporary browser memory.
                </p>
                <p className="text-xs font-semibold">
                  Logging out without saving will permanently discard these changes!
                </p>
              </div>

              <p className="text-xs text-slate-500">
                You can download the updated <strong>Personal_Finance_Database.xlsx</strong> file now to save your work before logging out.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p>
                Are you sure you want to log out of your financial manager?
              </p>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs space-y-1 text-slate-500">
                <p>• In-memory financial records and ledger data will be wiped.</p>
                <p>• The active session token will be immediately revoked.</p>
                <p>• Your permanent Excel file on disk remains completely untouched.</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => setIsLogoutModalOpen(false)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors"
          >
            Cancel
          </button>

          {hasUnsavedChanges ? (
            <>
              <button
                type="button"
                onClick={() => performLogout({ saveFirst: false })}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 font-semibold text-xs transition-colors"
              >
                Discard Changes & Logout
              </button>
              <button
                type="button"
                onClick={() => performLogout({ saveFirst: true })}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save to Excel & Logout</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => performLogout({ saveFirst: false })}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Confirm Logout</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
