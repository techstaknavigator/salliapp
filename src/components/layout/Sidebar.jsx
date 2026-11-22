import React, { useEffect } from "react";
import {
  LayoutDashboard,
  Briefcase,
  Scissors,
  PiggyBank,
  CreditCard,
  HandCoins,
  Landmark,
  ReceiptText,
  PieChart,
  Target,
  CalendarClock,
  Calendar,
  FileText,
  ShieldCheck,
  Settings,
  LogOut,
  X,
  FileSpreadsheet
} from "lucide-react";
import { useFinance } from "../../context/FinanceContext.jsx";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "salary", label: "Salary", icon: Briefcase },
  { id: "deductions-expenses", label: "Deductions & Expenses", icon: CreditCard },
  { id: "savings", label: "Savings Accounts", icon: PiggyBank },
  { id: "lending", label: "Lending (Given)", icon: HandCoins },
  { id: "borrowing", label: "Borrowing (Taken)", icon: Landmark },
  { id: "transactions", label: "Master Ledger", icon: ReceiptText },
  { id: "budgets", label: "Monthly Budgets", icon: PieChart },
  { id: "goals", label: "Savings Goals", icon: Target },
  { id: "recurring", label: "Recurring Bills", icon: CalendarClock },
  { id: "calendar", label: "Financial Calendar", icon: Calendar },
  { id: "reports", label: "Financial Reports", icon: FileText },
  { id: "backup", label: "Backup & Restore", icon: ShieldCheck },
  { id: "settings", label: "Settings", icon: Settings }
];

export function Sidebar({ isOpen, onClose }) {
  const { activeTab, setActiveTab, requestLogout, database } = useFinance();

  const handleSelectTab = (id) => {
    setActiveTab(id);
    if (onClose) onClose();
  };

  // Prevent background scrolling while mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle Escape key to close mobile sidebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden animate-fadeIn"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 lg:w-64 bg-white dark:bg-slate-900 border-r border-slate-200/90 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto shadow-2xl lg:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Mobile Header in Drawer */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 lg:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm text-slate-900 dark:text-white block leading-tight">
                Personal Finance
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                Excel Database
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close Navigation Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Link List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Navigation
          </div>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeTab === item.id ||
              (item.id === "deductions-expenses" && (activeTab === "deductions" || activeTab === "expenses"));

            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all group relative ${
                  isActive
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-600 dark:bg-emerald-400 rounded-r-full" />
                )}

                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition-colors ${
                    isActive
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300"
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer with Logout & Schema Details */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <button
            onClick={() => {
              if (onClose) onClose();
              requestLogout();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span>End Session / Logout</span>
          </button>

          <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Database Engine</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">15 Worksheets</span>
          </div>
        </div>
      </aside>
    </>
  );
}
