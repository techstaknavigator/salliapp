import React from "react";
import {
  LayoutDashboard,
  Briefcase,
  CreditCard,
  PiggyBank,
  Menu
} from "lucide-react";
import { useFinance } from "../../context/FinanceContext.jsx";

export function BottomNav({ onOpenMenu }) {
  const { activeTab, setActiveTab } = useFinance();

  const PRIMARY_MOBILE_TABS = [
    { id: "dashboard", label: "Overview", icon: LayoutDashboard },
    { id: "salary", label: "Salary", icon: Briefcase },
    { id: "deductions-expenses", label: "Outflows", icon: CreditCard },
    { id: "savings", label: "Savings", icon: PiggyBank }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 lg:hidden px-2 py-1 safe-area-pb">
      <div className="flex items-center justify-around">
        {PRIMARY_MOBILE_TABS.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeTab === item.id ||
            (item.id === "deductions-expenses" && (activeTab === "deductions" || activeTab === "expenses"));
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all ${
                isActive
                  ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          );
        })}

        {/* More Menu Trigger */}
        <button
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center py-1.5 px-3 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-all"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">More</span>
        </button>
      </div>
    </nav>
  );
}
