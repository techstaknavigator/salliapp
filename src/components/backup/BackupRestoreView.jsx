import React, { useState, useRef } from "react";
import {
  ShieldCheck,
  Download,
  FolderOpen,
  RefreshCw,
  GitMerge,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  Calendar,
  AlertCircle
} from "lucide-react";
import { useFinance } from "../../context/FinanceContext.jsx";
import {
  readWorkbookFromBuffer,
  validateWorkbook,
  mergeWorkbooks,
  isEncryptedWorkbook,
  decryptWorkbookBuffer
} from "../../services/excelEngine.js";
import { Modal } from "../common/Modal.jsx";
import { SHEET_NAMES } from "../../types/schema.js";

export function BackupRestoreView() {
  const {
    database,
    downloadDatabase,
    restoreDatabase,
    mergeDatabase,
    showToast
  } = useFinance();

  const fileInputRef = useRef(null);
  const [selectedBackupFile, setSelectedBackupFile] = useState(null);
  const [backupPreview, setBackupPreview] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [showConfirmReplaceModal, setShowConfirmReplaceModal] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [pendingEncryptedBackup, setPendingEncryptedBackup] = useState(null);
  const [backupPassword, setBackupPassword] = useState("");
  const [isDecrypting, setIsDecrypting] = useState(false);

  const metadata = database?.metadata || database?.sheets?.Backup_Metadata?.[0] || {};

  // Trigger file selection for restore / merge
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setActionError(null);

    // Security validation: file size limit (25MB)
    if (file.size > 25 * 1024 * 1024) {
      setActionError("Security Error: File exceeds the maximum allowed security limit of 25MB.");
      setBackupPreview(null);
      setValidationResult(null);
      return;
    }

    // Security validation: extension check
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setActionError("Format Error: Only OpenXML Excel (.xlsx) workbooks are supported.");
      setBackupPreview(null);
      setValidationResult(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target.result;
      if (isEncryptedWorkbook(buffer)) {
        setPendingEncryptedBackup({ buffer, file });
        setBackupPassword("");
        setBackupPreview(null);
        setValidationResult(null);
        return;
      }

      const parsed = readWorkbookFromBuffer(buffer, file.name);

      if (parsed.success) {
        const val = validateWorkbook(parsed);
        setBackupPreview(parsed);
        setValidationResult(val);
        setSelectedBackupFile(file);
      } else {
        setActionError(parsed.error);
        setBackupPreview(null);
        setValidationResult(null);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUnlockEncryptedBackup = async (e) => {
    e.preventDefault();
    if (!pendingEncryptedBackup || !backupPassword) return;

    setIsDecrypting(true);
    setActionError(null);

    try {
      const decrypted = await decryptWorkbookBuffer(pendingEncryptedBackup.buffer, backupPassword);
      const parsed = readWorkbookFromBuffer(decrypted, pendingEncryptedBackup.file.name);

      if (parsed.success) {
        const val = validateWorkbook(parsed);
        setBackupPreview(parsed);
        setValidationResult(val);
        setSelectedBackupFile(pendingEncryptedBackup.file);
        setPendingEncryptedBackup(null);
        setBackupPassword("");
      } else {
        setActionError(parsed.error);
      }
    } catch (err) {
      setActionError("Incorrect password. The entered password could not decrypt this Excel backup.");
    } finally {
      setIsDecrypting(false);
    }
  };

  // Run integrity validation on active database
  const handleValidateActiveDatabase = () => {
    if (!database) return;
    const val = validateWorkbook(database);
    setValidationResult(val);
    showToast(
      val.isValid ? "success" : "warning",
      val.isValid
        ? "Active Excel workbook passed all integrity validation checks!"
        : "Validation warnings found. Inspect report below."
    );
  };

  const handleConfirmReplace = () => {
    if (backupPreview) {
      restoreDatabase(backupPreview);
      setShowConfirmReplaceModal(false);
      setBackupPreview(null);
    }
  };

  const handleMerge = () => {
    if (backupPreview) {
      mergeDatabase(backupPreview);
      setBackupPreview(null);
    }
  };

  // Calculate live records count per sheet
  const sheetCounts = {};
  let totalCount = 0;
  SHEET_NAMES.forEach((name) => {
    const count = database?.sheets?.[name]?.length || 0;
    sheetCounts[name] = count;
    totalCount += count;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Backup, Restore & Data Migration
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Export standalone XLSX database, validate data integrity, merge records, or restore backups.
          </p>
        </div>

        <button
          onClick={() => downloadDatabase()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all"
        >
          <Download className="w-4 h-4" />
          Download Complete Excel Backup
        </button>
      </div>

      {/* Backup Information Card as required in Section 7 */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Active Excel Database Metadata
              </h3>
              <p className="text-xs text-slate-500">
                Worksheet: <span className="font-mono text-emerald-600">Backup_Metadata</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleValidateActiveDatabase}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Validate Workbook
          </button>
        </div>

        {/* 6 Required Metadata Fields */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 block">Database ID</span>
            <span className="text-xs font-bold font-mono text-slate-900 dark:text-white truncate block mt-1">
              {database?.databaseId || "N/A"}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 block">Backup Version</span>
            <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 block mt-1">
              v{metadata.Backup_Version || "2.0"}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 block">Schema Version</span>
            <span className="text-xs font-bold font-mono text-slate-900 dark:text-white block mt-1">
              v{metadata.Schema_Version || "2.0"}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 block">Created Date</span>
            <span className="text-xs font-medium font-mono text-slate-700 dark:text-slate-300 block mt-1 truncate">
              {metadata.Created_Date?.slice(0, 10) || "N/A"}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 block">Last Updated Date</span>
            <span className="text-xs font-medium font-mono text-slate-700 dark:text-slate-300 block mt-1 truncate">
              {metadata.Updated_Date?.slice(0, 10) || "N/A"}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 block">Total Records</span>
            <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 block mt-1">
              {totalCount} rows
            </span>
          </div>
        </div>

        {/* 15 Worksheets Record Counts */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Sheet-by-Sheet Data Inventory (All 15 Worksheets)
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {SHEET_NAMES.map((name) => (
              <div
                key={name}
                className="px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs"
              >
                <span className="text-slate-600 dark:text-slate-400 truncate mr-1 font-mono text-[11px]">
                  {name}
                </span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {sheetCounts[name]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Validation Report Alert */}
      {validationResult && (
        <div
          className={`p-6 rounded-2xl border shadow-sm ${
            validationResult.isValid && validationResult.warnings.length === 0
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
              : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200"
          }`}
        >
          <div className="flex items-center gap-2 mb-2 font-bold text-sm">
            {validationResult.isValid && validationResult.warnings.length === 0 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            )}
            <span>
              {validationResult.isValid && validationResult.warnings.length === 0
                ? "Excel Database Integrity Verified: 100% Consistent"
                : "Validation Check Notice"}
            </span>
          </div>

          <div className="text-xs space-y-1">
            <p>
              Checked all 15 required worksheets across {validationResult.summary?.totalUniqueRecords} unique record IDs and {validationResult.summary?.totalTransactions} transactions.
            </p>
            {validationResult.warnings.map((w, idx) => (
              <p key={idx} className="font-medium text-amber-800 dark:text-amber-300">
                • {w}
              </p>
            ))}
            {validationResult.errors.map((e, idx) => (
              <p key={idx} className="font-bold text-rose-600">
                • ERROR: {e}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Restore & Merge Options Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Restore or Merge External Excel Backup
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Select another XLSX workbook to replace your current database or merge new entries.
          </p>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          accept=".xlsx"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 transition-all"
          >
            <FolderOpen className="w-4 h-4" />
            Choose Excel File (.xlsx)
          </button>
        </div>

        {/* Encrypted Backup Password Prompt */}
        {pendingEncryptedBackup && (
          <form
            onSubmit={handleUnlockEncryptedBackup}
            className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-3"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-100">
                Encrypted Backup: {pendingEncryptedBackup.file.name}
              </h4>
            </div>
            <p className="text-xs text-emerald-800 dark:text-emerald-200">
              This Excel workbook is protected with Microsoft Office Agile Encryption. Enter its password to inspect and restore:
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                placeholder="Enter Excel backup password"
                value={backupPassword}
                onChange={(e) => setBackupPassword(e.target.value)}
                className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 font-mono"
                required
                autoFocus
              />
              <button
                type="submit"
                disabled={isDecrypting || !backupPassword}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs shadow-sm transition-all"
              >
                {isDecrypting ? "Decrypting..." : "Unlock Backup"}
              </button>
            </div>
          </form>
        )}

        {actionError && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500 mt-0.5" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Selected Backup File Preview */}
        {backupPreview && (
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  Backup Candidate Loaded
                </span>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  {selectedBackupFile?.name}
                </h4>
              </div>
              <span className="text-xs font-mono text-slate-500">
                DB ID: {backupPreview.summary.databaseId}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block">Total Records</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {backupPreview.summary.totalRecords}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Schema</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  v{backupPreview.summary.schemaVersion}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Currency</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {backupPreview.summary.currency}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Last Modified</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {backupPreview.summary.lastUpdated?.slice(0, 10) || "N/A"}
                </span>
              </div>
            </div>

            {/* Action Buttons: Replace or Merge */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowConfirmReplaceModal(true)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-sm transition-all"
              >
                Replace Active Database
              </button>
              <button
                onClick={handleMerge}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all"
              >
                <GitMerge className="w-3.5 h-3.5" />
                Merge Workbooks
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal Before Replacing Data (Section 7: Never silently overwrite!) */}
      <Modal
        isOpen={showConfirmReplaceModal}
        onClose={() => setShowConfirmReplaceModal(false)}
        title="Confirm Database Replacement"
        subtitle="This action will replace the current active workbook in memory"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
            <div>
              <p className="font-bold">Are you sure you want to replace your current database?</p>
              <p className="mt-1">
                Active Database ID: <strong className="font-mono">{database?.databaseId}</strong> will be replaced by imported Database ID: <strong className="font-mono">{backupPreview?.summary?.databaseId}</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setShowConfirmReplaceModal(false)}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmReplace}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-sm"
            >
              Yes, Replace Database
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
