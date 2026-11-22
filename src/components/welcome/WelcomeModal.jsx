import React, { useState, useRef } from "react";
import {
  FileSpreadsheet,
  PlusCircle,
  FolderOpen,
  Sparkles,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  HardDrive,
  Download,
  Info,
  ArrowLeft,
  X,
  ChevronRight,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  ShieldAlert,
  FileKey
} from "lucide-react";
import { useFinance } from "../../context/FinanceContext.jsx";
import {
  openFileWithFileSystem,
  isFileSystemAccessSupported
} from "../../services/fileSystemAccess.js";
import {
  readWorkbookFromBuffer,
  validateWorkbook,
  isEncryptedWorkbook
} from "../../services/excelEngine.js";
import { getTodayDateStr } from "../../types/schema.js";
import { formatCurrency } from "../../services/financialCalculations.js";

export function WelcomeModal({ isOpen, onClose }) {
  const {
    createNewDatabase,
    loadDatabaseFromBuffer,
    loadDemoDatabase,
    downloadDatabase,
    database
  } = useFinance();

  // Navigation steps: 'choice' | 'create' | 'open' | 'password-prompt' | 'unencrypted-prompt' | 'preview' | 'demo'
  const [step, setStep] = useState("choice");

  // Create form states
  const [openingBalance, setOpeningBalance] = useState("50000");
  const [startingDate, setStartingDate] = useState(getTodayDateStr());
  const [userName, setUserName] = useState("Personal Finance Account");
  const [currency, setCurrency] = useState("LKR");
  const [createPassword, setCreatePassword] = useState("");
  const [createPasswordConfirm, setCreatePasswordConfirm] = useState("");
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [createError, setCreateError] = useState(null);

  // File import & Pending file states
  const [pendingFile, setPendingFile] = useState(null); // { buffer, filename, fileHandle, parsed? }
  const [unlockPassword, setUnlockPassword] = useState("");
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);
  const [unlockError, setUnlockError] = useState(null);

  // Unencrypted migration states
  const [unencryptedPassword, setUnencryptedPassword] = useState("");
  const [unencryptedConfirm, setUnencryptedConfirm] = useState("");
  const [showUnencryptedPassword, setShowUnencryptedPassword] = useState(false);
  const [unencryptedError, setUnencryptedError] = useState(null);

  // Preview & Error states
  const [importPreview, setImportPreview] = useState(null);
  const [importError, setImportError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen && database) return null;

  const handleClose = () => {
    // If a database is already active in memory, safely close modal
    if (database && onClose) {
      setStep("choice");
      setPendingFile(null);
      setImportPreview(null);
      setImportError(null);
      setUnlockError(null);
      setCreateError(null);
      onClose();
    }
  };

  // STEP 2: CREATE NEW DATABASE SUBMISSION
  const handleCreateConfirm = async (e) => {
    e.preventDefault();
    setCreateError(null);

    if (!createPassword || createPassword.length < 8) {
      setCreateError("Database password must be at least 8 characters long.");
      return;
    }

    if (createPassword !== createPasswordConfirm) {
      setCreateError("Database passwords do not match. Please verify.");
      return;
    }

    setIsLoading(true);
    try {
      await createNewDatabase({
        currency,
        startingDate,
        openingBalance: Number(openingBalance) || 0,
        userName,
        password: createPassword
      });
      setIsLoading(false);
      setStep("choice");
      if (onClose) onClose();
    } catch (err) {
      setIsLoading(false);
      setCreateError(err.message || "Failed to create encrypted database.");
    }
  };

  // PROCESS SELECTED FILE BUFFER
  const processFileBuffer = (buffer, filename, fileHandle = null) => {
    setIsLoading(true);
    setImportError(null);
    setUnlockError(null);
    setUnencryptedError(null);

    try {
      const encrypted = isEncryptedWorkbook(buffer);

      if (encrypted) {
        // Encrypted workbook detected: ask for Excel password
        setPendingFile({ buffer, filename, fileHandle });
        setUnlockPassword("");
        setIsLoading(false);
        setStep("password-prompt");
        return;
      }

      // File is not encrypted: test read & parse
      const parsed = readWorkbookFromBuffer(buffer, filename);
      if (!parsed.success) {
        setImportError(parsed.error);
        setIsLoading(false);
        setStep("preview");
        return;
      }

      const val = validateWorkbook(parsed);
      if (!val.isValid) {
        setImportError(`Workbook validation failed: ${val.errors.join("; ")}`);
        setIsLoading(false);
        setStep("preview");
        return;
      }

      // Valid unencrypted workbook: offer user to protect it
      setPendingFile({ buffer, filename, fileHandle, parsed });
      setUnencryptedPassword("");
      setUnencryptedConfirm("");
      setIsLoading(false);
      setStep("unencrypted-prompt");
    } catch (err) {
      setIsLoading(false);
      setImportError(`Unexpected file read error: ${err.message}`);
      setStep("preview");
    }
  };

  // Standard HTML file input change
  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = "";

    // Security check: file size limit (25MB)
    if (file.size > 25 * 1024 * 1024) {
      setImportError("Security Error: File exceeds the maximum allowed security limit of 25MB.");
      setStep("preview");
      return;
    }

    // Security check: extension check
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setImportError("Format Error: Only OpenXML Excel (.xlsx) workbooks are supported.");
      setStep("preview");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      processFileBuffer(event.target.result, file.name, null);
    };
    reader.readAsArrayBuffer(file);
  };

  // File System Access API picker
  const handleDirectFileSystemOpen = async () => {
    try {
      setImportError(null);
      const { fileHandle, filename, arrayBuffer } = await openFileWithFileSystem();
      processFileBuffer(arrayBuffer, filename, fileHandle);
    } catch (err) {
      if (err.name !== "AbortError") {
        setImportError(err.message);
        setStep("preview");
      }
    }
  };

  // STEP: UNLOCK ENCRYPTED DATABASE
  const handleUnlockDatabase = async (e) => {
    e.preventDefault();
    if (!pendingFile || !unlockPassword) return;

    setUnlockError(null);
    setIsLoading(true);

    try {
      const result = await loadDatabaseFromBuffer(
        pendingFile.buffer,
        pendingFile.filename,
        pendingFile.fileHandle,
        unlockPassword
      );

      setIsLoading(false);
      if (result.success) {
        setStep("choice");
        setPendingFile(null);
        if (onClose) onClose();
      } else {
        setUnlockError("Incorrect password. The entered password does not match this Excel file.");
      }
    } catch (err) {
      setIsLoading(false);
      setUnlockError(err.message || "Incorrect password. The entered password does not match this Excel file.");
    }
  };

  // STEP: SET PASSWORD ON UNENCRYPTED DATABASE & DOWNLOAD PROTECTED COPY
  const handleProtectUnencryptedDatabase = async (e) => {
    e.preventDefault();
    if (!pendingFile) return;

    if (!unencryptedPassword || unencryptedPassword.length < 8) {
      setUnencryptedError("Password must be at least 8 characters long.");
      return;
    }

    if (unencryptedPassword !== unencryptedConfirm) {
      setUnencryptedError("Passwords do not match. Please verify.");
      return;
    }

    setIsLoading(true);
    setUnencryptedError(null);

    try {
      const result = await loadDatabaseFromBuffer(
        pendingFile.buffer,
        pendingFile.filename,
        pendingFile.fileHandle,
        unencryptedPassword
      );

      setIsLoading(false);
      if (result.success) {
        setStep("choice");
        setPendingFile(null);
        if (onClose) onClose();
      } else {
        setUnencryptedError(result.error || "Failed to encrypt and load workbook.");
      }
    } catch (err) {
      setIsLoading(false);
      setUnencryptedError(err.message || "Failed to encrypt database.");
    }
  };

  // STEP: CONTINUE UNENCRYPTED WITHOUT PASSWORD
  const handleContinueUnencrypted = async () => {
    if (!pendingFile) return;

    setIsLoading(true);
    try {
      const result = await loadDatabaseFromBuffer(
        pendingFile.buffer,
        pendingFile.filename,
        pendingFile.fileHandle,
        null
      );

      setIsLoading(false);
      if (result.success) {
        setStep("choice");
        setPendingFile(null);
        if (onClose) onClose();
      } else {
        setImportError(result.error || "Failed to load database.");
        setStep("preview");
      }
    } catch (err) {
      setIsLoading(false);
      setImportError(err.message || "Failed to load database.");
      setStep("preview");
    }
  };

  // STEP: DEMO MODE
  const handleDemoConfirm = () => {
    loadDemoDatabase();
    setStep("choice");
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header Banner with Navigation Controls */}
        <div className="bg-slate-900 border-b border-slate-800 p-5 sm:p-6 text-white relative">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {step !== "choice" && (
                <button
                  type="button"
                  onClick={() => {
                    setImportError(null);
                    setCreateError(null);
                    setUnlockError(null);
                    setUnencryptedError(null);
                    if (step === "password-prompt" || step === "unencrypted-prompt" || step === "preview") {
                      setStep("open");
                    } else {
                      setStep("choice");
                    }
                  }}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                  title="Go Back to Previous Screen"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  {step === "choice" && "Personal Salary & Finance"}
                  {step === "create" && "Create New Encrypted Database"}
                  {step === "open" && "Open Existing Database"}
                  {step === "password-prompt" && "Unlock Excel Database"}
                  {step === "unencrypted-prompt" && "Protect Excel Database"}
                  {step === "preview" && "Database Error & Diagnostic"}
                  {step === "demo" && "Explore Demo Mode"}
                </h2>
                <p className="text-slate-400 text-[11px] sm:text-xs font-medium">
                  One Unified Excel Password System • Genuine Office Agile AES-256
                </p>
              </div>
            </div>

            {/* Close Button (X) - Only when a database is already active */}
            {database && (
              <button
                type="button"
                onClick={handleClose}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
                title="Close Window"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-8 overflow-y-auto flex-1 space-y-6">
          
          {/* ==================================================== */}
          {/* STEP 1: WELCOME CHOICE SCREEN                       */}
          {/* ==================================================== */}
          {step === "choice" && (
            <div className="space-y-4">
              <div className="text-center max-w-lg mx-auto space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Select Your Financial Database
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Your Excel workbook is protected with genuine Microsoft Excel password encryption.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {/* 1. Create New Database */}
                <div
                  onClick={() => {
                    setCreateError(null);
                    setStep("create");
                  }}
                  className="group cursor-pointer p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <PlusCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        Create New Database
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Generate a 15-sheet workbook protected by genuine Microsoft Excel AES-256 encryption.
                      </p>
                    </div>
                  </div>
                  <div className="pt-3 flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <span>Set Password & Create</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>

                {/* 2. Open Existing Database */}
                <div
                  onClick={() => {
                    setImportError(null);
                    setStep("open");
                  }}
                  className="group cursor-pointer p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-teal-500 dark:hover:border-teal-500 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-teal-50/20 dark:hover:bg-teal-950/20 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <FolderOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        Open Existing Database
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Select your encrypted Personal_Finance_Database.xlsx and unlock with your Excel password.
                      </p>
                    </div>
                  </div>
                  <div className="pt-3 flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400">
                    <span>Select XLSX</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>

                {/* 3. Explore Demo */}
                <div
                  onClick={() => {
                    setImportError(null);
                    setStep("demo");
                  }}
                  className="group cursor-pointer p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        Explore Demo Mode
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Test the app with realistic sample salary, expenses, savings, and loan records.
                      </p>
                    </div>
                  </div>
                  <div className="pt-3 flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    <span>Try Sample</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* STEP 2: CREATE NEW DATABASE                         */}
          {/* ==================================================== */}
          {step === "create" && (
            <form onSubmit={handleCreateConfirm} className="space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => setStep("choice")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Options</span>
                </button>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Office Agile Encryption (AES-256)
                </span>
              </div>

              {/* Encryption Banner */}
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 text-xs text-emerald-900 dark:text-emerald-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-emerald-950 dark:text-emerald-100">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  <span>One Unified Excel Database Password</span>
                </div>
                <p className="leading-relaxed">
                  The password you set below encrypts your complete 15-sheet Excel workbook with standard Microsoft Office Agile Encryption (AES-256-CBC, 100,000 spin count). The <strong>exact same password</strong> will unlock your database both in this web application and directly in Microsoft Excel.
                </p>
              </div>

              {createError && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Database / Account Holder Name
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="e.g. Personal Finance Account"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="LKR">LKR (Sri Lankan Rupee - Rs.)</option>
                    <option value="USD">USD (US Dollar - $)</option>
                    <option value="EUR">EUR (Euro - €)</option>
                    <option value="GBP">GBP (British Pound - £)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Starting Financial Date
                  </label>
                  <input
                    type="date"
                    value={startingDate}
                    onChange={(e) => setStartingDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Opening Cash Balance ({currency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Password Setup */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Create Excel Database Password
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
                  >
                    {showCreatePassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showCreatePassword ? "Hide" : "Show"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Excel Password (min 8 characters) *
                    </label>
                    <input
                      type={showCreatePassword ? "text" : "password"}
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 font-mono"
                      required
                      minLength={8}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Confirm Password *
                    </label>
                    <input
                      type={showCreatePassword ? "text" : "password"}
                      value={createPasswordConfirm}
                      onChange={(e) => setCreatePasswordConfirm(e.target.value)}
                      placeholder="Re-enter same password"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 font-mono"
                      required
                      minLength={8}
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  ⚠️ <strong>Important:</strong> Because this uses true cryptographic encryption with no backdoor or server storage, there is no password reset if forgotten. Please store your password safely.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep("choice")}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isLoading ? "Encrypting & Initializing..." : "Create Encrypted Database & Download"}</span>
                </button>
              </div>
            </form>
          )}

          {/* ==================================================== */}
          {/* STEP 3: OPEN EXISTING DATABASE                      */}
          {/* ==================================================== */}
          {step === "open" && (
            <div className="space-y-5 animate-fadeIn">
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx"
                onChange={handleFileInputChange}
                className="hidden"
              />

              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => setStep("choice")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Options</span>
                </button>
                <span className="text-xs text-slate-400">Select File</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Standard File Upload */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-6 text-center transition-all bg-slate-50/50 dark:bg-slate-800/40 hover:bg-emerald-50/20"
                >
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
                    <FolderOpen className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                    Select XLSX File
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Choose Personal_Finance_Database.xlsx from your computer or phone
                  </p>
                </div>

                {/* Direct File System Sync */}
                <div
                  onClick={handleDirectFileSystemOpen}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                    isFileSystemAccessSupported()
                      ? "cursor-pointer border-indigo-300 dark:border-indigo-800 hover:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/30 hover:bg-indigo-50/50"
                      : "opacity-60 border-slate-200 dark:border-slate-800 bg-slate-100/40 dark:bg-slate-900/40 cursor-not-allowed"
                  }`}
                >
                  <div className="w-12 h-12 mx-auto rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3">
                    <HardDrive className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                    Direct File Sync
                    {isFileSystemAccessSupported() && (
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300 px-1.5 py-0.5 rounded font-mono">
                        Native API
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {isFileSystemAccessSupported()
                      ? "Directly write changes back to your local file (Chrome / Edge)"
                      : "Requires Chrome, Edge, or Opera"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* STEP 4: PASSWORD PROMPT FOR ENCRYPTED WORKBOOK      */}
          {/* ==================================================== */}
          {step === "password-prompt" && (
            <form onSubmit={handleUnlockDatabase} className="space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => setStep("open")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Choose Another File</span>
                </button>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" />
                  Password Protected
                </span>
              </div>

              {/* Detected File Details */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                    <FileKey className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {pendingFile?.filename || "Personal_Finance_Database.xlsx"}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Standard Microsoft Office Agile Encryption (AES-256)
                    </p>
                  </div>
                </div>
                {pendingFile?.buffer && (
                  <span className="text-[11px] font-mono text-slate-400">
                    {(pendingFile.buffer.byteLength / 1024).toFixed(1)} KB
                  </span>
                )}
              </div>

              {/* Error Notice */}
              {unlockError && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span className="font-medium">{unlockError}</span>
                </div>
              )}

              {/* Password Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Enter Excel Database Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowUnlockPassword(!showUnlockPassword)}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
                  >
                    {showUnlockPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showUnlockPassword ? "Hide" : "Show"}</span>
                  </button>
                </div>
                <input
                  type={showUnlockPassword ? "text" : "password"}
                  value={unlockPassword}
                  onChange={(e) => setUnlockPassword(e.target.value)}
                  placeholder="Enter the Excel file password..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 font-mono"
                  autoFocus
                  required
                />
                <p className="text-[11px] text-slate-500">
                  Enter the same password you use when opening this file in Microsoft Excel.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep("open")}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !unlockPassword}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isLoading ? "Decrypting in Memory..." : "Unlock & Open Database"}</span>
                </button>
              </div>
            </form>
          )}

          {/* ==================================================== */}
          {/* STEP 5: PROMPT TO PROTECT UNENCRYPTED WORKBOOK      */}
          {/* ==================================================== */}
          {step === "unencrypted-prompt" && (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => setStep("open")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Choose Another File</span>
                </button>
                <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Unencrypted File
                </span>
              </div>

              {/* Alert notice */}
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-950 dark:text-amber-100">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>This Database is Not Password-Protected</span>
                </div>
                <p className="leading-relaxed">
                  Your Excel workbook was imported successfully, but it does not have password protection. Would you like to protect it now?
                </p>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                  Setting a password will encrypt your financial records with genuine Microsoft Office Agile Encryption (AES-256) and download a newly protected copy (<strong>Personal_Finance_Database_Protected.xlsx</strong>) without modifying your original file.
                </p>
              </div>

              {unencryptedError && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{unencryptedError}</span>
                </div>
              )}

              {/* Password Setup Form */}
              <form onSubmit={handleProtectUnencryptedDatabase} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Option A: Set Excel Password & Download Protected Copy
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowUnencryptedPassword(!showUnencryptedPassword)}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
                  >
                    {showUnencryptedPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showUnencryptedPassword ? "Hide" : "Show"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      New Password (min 8 characters)
                    </label>
                    <input
                      type={showUnencryptedPassword ? "text" : "password"}
                      value={unencryptedPassword}
                      onChange={(e) => setUnencryptedPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 font-mono"
                      minLength={8}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Confirm Password
                    </label>
                    <input
                      type={showUnencryptedPassword ? "text" : "password"}
                      value={unencryptedConfirm}
                      onChange={(e) => setUnencryptedConfirm(e.target.value)}
                      placeholder="Re-enter same password"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 font-mono"
                      minLength={8}
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoading || !unencryptedPassword}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-2"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{isLoading ? "Encrypting..." : "Protect & Download Encrypted Copy"}</span>
                  </button>
                </div>
              </form>

              {/* Option B: Continue Unencrypted */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Or open without encryption:
                </span>
                <button
                  type="button"
                  onClick={handleContinueUnencrypted}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Continue Unencrypted (Session Only)
                </button>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* STEP 6: PREVIEW / ERROR DIAGNOSTIC                  */}
          {/* ==================================================== */}
          {step === "preview" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => {
                    setImportError(null);
                    setStep("open");
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to File Selection</span>
                </button>
                <span className="text-xs text-slate-400">Diagnostics</span>
              </div>

              {importError && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 space-y-3">
                  <div className="flex items-start gap-2.5 text-rose-800 dark:text-rose-200">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-sm">Workbook Rejection Notice</h4>
                      <p className="text-xs mt-1 leading-relaxed">{importError}</p>
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setImportError(null);
                        setStep("open");
                      }}
                      className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 text-slate-700 dark:text-slate-300"
                    >
                      ← Choose Another File
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* STEP 7: EXPLORE DEMO                                */}
          {/* ==================================================== */}
          {step === "demo" && (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => setStep("choice")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Options</span>
                </button>
                <span className="text-xs text-slate-400">Demo Setup</span>
              </div>

              <div className="text-center py-3 space-y-3">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-100 dark:bg-indigo-950/70 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Load Realistic Sample Financial Data
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  Populates realistic monthly salary records (Gross & Net), categorized expenses, savings allocations into emergency & personal funds, lending receivables, and borrowing debts in LKR.
                </p>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs text-left">
                  <strong>Demo Mode Note:</strong> This loads in-memory sample data only and will never overwrite any real Excel file on your disk. You can download or exit at any time.
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep("choice")}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleDemoConfirm}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Load Sample Database</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info & Download current if loaded */}
        <div className="bg-slate-50 dark:bg-slate-950/50 px-5 sm:px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Browser-processed only • Zero external server telemetry</span>
          </div>
          {database && (
            <button
              onClick={() => downloadDatabase()}
              className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
            >
              <Download className="w-3.5 h-3.5" />
              Download Current Database
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
