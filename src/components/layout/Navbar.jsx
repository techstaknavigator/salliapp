import React, { useState, useRef, useEffect } from "react";
import {
  FileSpreadsheet,
  Save,
  Download,
  FolderOpen,
  Sun,
  Moon,
  Menu,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Copy,
  Check,
  LogOut,
  MoreVertical,
  X
} from "lucide-react";
import { useFinance } from "../../context/FinanceContext.jsx";

export function Navbar({ onOpenWelcome, onToggleSidebar }) {
  const {
    database,
    fileHandle,
    saveStatus,
    saveChanges,
    downloadDatabase,
    darkMode,
    setDarkMode,
    closeDatabase
  } = useFinance();

  const [copied, setCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);

  const handleCopyDbId = () => {
    if (database?.databaseId) {
      navigator.clipboard.writeText(database.databaseId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Close mobile menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          
          {/* LEFT: Mobile Menu Button + Brand + Compact DB ID */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Hamburger Button (Mobile Only) */}
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Application Logo & Title */}
            <div
              className="flex items-center gap-2.5 cursor-pointer group flex-shrink-0"
              onClick={onOpenWelcome}
              title="Open Database Overview"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                  Personal Finance
                </h1>
                <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Excel-Only Database
                </p>
              </div>
            </div>

            {/* Active Database ID Badge (Desktop) */}
            {database && (
              <div
                onClick={handleCopyDbId}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 font-mono cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-600 transition-all flex-shrink-0"
                title="Click to copy Database ID"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                <span className="truncate max-w-[110px] lg:max-w-[140px]">{database.databaseId}</span>
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 flex-shrink-0" />
                )}
              </div>
            )}
          </div>

          {/* RIGHT: Actions, Save Status, Sync & Tools */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
            
            {/* Direct File Sync Indicator (Desktop) */}
            {fileHandle ? (
              <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
                <span className="truncate max-w-[120px]">{fileHandle.name}</span>
                <span className="text-[9px] bg-emerald-200/60 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 px-1 py-0.5 rounded font-mono font-bold">SYNC</span>
              </div>
            ) : (
              <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Memory Mode</span>
              </div>
            )}

            {/* Save Changes Button (Primary Action - visible on all viewports) */}
            {database && (
              <button
                onClick={saveChanges}
                disabled={saveStatus === "saving"}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all h-9 ${
                  saveStatus === "unsaved"
                    ? "bg-amber-500 hover:bg-amber-600 text-white animate-pulse"
                    : saveStatus === "saving"
                    ? "bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-wait"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
                title={saveStatus === "unsaved" ? "Unsaved changes in memory. Click to save!" : "Database saved."}
              >
                <Save className="w-4 h-4 flex-shrink-0" />
                <span className="hidden xs:inline sm:inline">
                  {saveStatus === "saving" ? "Saving..." : saveStatus === "unsaved" ? "Save Changes" : "Saved"}
                </span>
              </button>
            )}

            {/* Download Excel Button (Desktop >= 1024px) */}
            {database && (
              <button
                onClick={() => downloadDatabase()}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors h-9"
                title="Download complete Personal_Finance_Database.xlsx"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Excel</span>
              </button>
            )}

            {/* Switch / Open Database (Desktop >= 1024px) */}
            <button
              onClick={onOpenWelcome}
              className="hidden lg:flex items-center justify-center w-9 h-9 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors"
              title="Open or Create Database"
              aria-label="Open or Create Database"
            >
              <FolderOpen className="w-4 h-4" />
            </button>

            {/* Dark Mode Toggle (Desktop >= 1024px) */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="hidden lg:flex items-center justify-center w-9 h-9 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle Theme"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Close / Lock Database (Desktop >= 1024px) */}
            <button
              onClick={closeDatabase}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 transition-colors shadow-sm h-9"
              title="Close Database and Clear Session Memory"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Close Database</span>
            </button>

            {/* Mobile / Tablet Actions Dropdown Menu Button (< 1024px) */}
            <div className="relative lg:hidden" ref={mobileMenuRef}>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors"
                aria-label="More Options"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <MoreVertical className="w-4 h-4" />}
              </button>

              {/* Mobile Popover Menu */}
              {mobileMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-fadeIn">
                  {database && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        downloadDatabase();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-left"
                    >
                      <Download className="w-4 h-4 text-emerald-600" />
                      <span>Download Excel</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenWelcome();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-left"
                  >
                    <FolderOpen className="w-4 h-4 text-blue-600" />
                    <span>Open / Create Database</span>
                  </button>

                  <button
                    onClick={() => {
                      setDarkMode(!darkMode);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-left"
                  >
                    {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-500" />}
                    <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
                  </button>

                  <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      closeDatabase();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold text-left"
                  >
                    <LogOut className="w-4 h-4 text-rose-600" />
                    <span>Close Database</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </header>
  );
}
