import React, { useState } from "react";
import { FinanceProvider, useFinance } from "./context/FinanceContext.jsx";
import { Navbar } from "./components/layout/Navbar.jsx";
import { Sidebar } from "./components/layout/Sidebar.jsx";
import { BottomNav } from "./components/layout/BottomNav.jsx";
import { Toast } from "./components/common/Toast.jsx";
import { WelcomeModal } from "./components/welcome/WelcomeModal.jsx";
import PWAInstallPrompt from "./components/common/PWAInstallPrompt.jsx";

// Views
import { DashboardOverview } from "./components/dashboard/DashboardOverview.jsx";
import { SalaryView } from "./components/salary/SalaryView.jsx";
import { DeductionsExpensesView } from "./components/deductionsExpenses/DeductionsExpensesView.jsx";
import { DeductionsView } from "./components/deductions/DeductionsView.jsx";
import { SavingsView } from "./components/savings/SavingsView.jsx";
import { ExpensesView } from "./components/expenses/ExpensesView.jsx";
import { LendingView } from "./components/lending/LendingView.jsx";
import { BorrowingView } from "./components/borrowing/BorrowingView.jsx";
import { TransactionsView } from "./components/transactions/TransactionsView.jsx";
import { BudgetsView } from "./components/budgets/BudgetsView.jsx";
import { SavingsGoalsView } from "./components/goals/SavingsGoalsView.jsx";
import { RecurringView } from "./components/recurring/RecurringView.jsx";
import { CalendarView } from "./components/calendar/CalendarView.jsx";
import { ReportsView } from "./components/reports/ReportsView.jsx";
import { BackupRestoreView } from "./components/backup/BackupRestoreView.jsx";
import { SettingsView } from "./components/settings/SettingsView.jsx";

function AppContent() {
  const {
    database,
    activeTab,
    setActiveTab,
    notification,
    showToast
  } = useFinance();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);

  // If no database loaded, show Welcome & Excel Database Selection screen
  if (!database) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-3 sm:p-4">
        <WelcomeModal
          isOpen={true}
          onClose={null}
        />
        <Toast
          notification={notification}
          onClose={() => showToast(null)}
        />
        <PWAInstallPrompt />
      </div>
    );
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <DashboardOverview
            onOpenAddSalary={() => setActiveTab("salary")}
            onOpenAddExpense={() => setActiveTab("deductions-expenses")}
            onOpenAddSavings={() => setActiveTab("savings")}
            onOpenAddLending={() => setActiveTab("lending")}
          />
        );
      case "salary":
        return <SalaryView />;
      case "deductions-expenses":
      case "deductions":
      case "expenses":
        return <DeductionsExpensesView />;
      case "savings":
        return <SavingsView />;
      case "lending":
        return <LendingView />;
      case "borrowing":
        return <BorrowingView />;
      case "transactions":
        return <TransactionsView />;
      case "budgets":
        return <BudgetsView />;
      case "goals":
        return <SavingsGoalsView />;
      case "recurring":
        return <RecurringView />;
      case "calendar":
        return <CalendarView />;
      case "reports":
        return <ReportsView />;
      case "backup":
        return <BackupRestoreView />;
      case "settings":
        return <SettingsView />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-200">
      {/* Top Navigation */}
      <Navbar
        onOpenWelcome={() => setIsWelcomeOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto min-w-0">
        {/* Desktop Sidebar & Mobile Off-canvas Drawer */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Workspace Area */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 pb-24 lg:pb-12 max-w-full overflow-hidden min-w-0">
          {renderActiveView()}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav onOpenMenu={() => setIsSidebarOpen(true)} />

      {/* PWA Install Prompt for Mobile and Desktop */}
      <PWAInstallPrompt />

      {/* Global Toast Notifications */}
      <Toast
        notification={notification}
        onClose={() => showToast(null)}
      />

      {/* Welcome / Database Setup Modal */}
      <WelcomeModal
        isOpen={isWelcomeOpen}
        onClose={() => setIsWelcomeOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <FinanceProvider>
      <AppContent />
    </FinanceProvider>
  );
}
