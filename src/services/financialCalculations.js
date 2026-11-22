/**
 * Financial Calculation Engine
 * Strict implementation of financial rules and accounting balances
 * as specified in Section 15 and 16.
 */

/**
 * Calculates complete financial overview from active Excel workbook sheets
 */
export function calculateFinancialSummary(databaseData) {
  const sheets = databaseData?.sheets || {};
  const metadata = databaseData?.metadata || sheets.Backup_Metadata?.[0] || {};

  // 1. Opening Cash Balance
  const openingCash = Number(metadata.Opening_Cash_Balance) || 0;

  // 2. Salary totals & Modes
  const salaries = sheets.Salary || [];
  let totalGrossSalary = 0;
  let totalBasicSalary = 0;
  let totalAllowances = 0;
  let totalBonuses = 0;
  let totalAdditionalIncome = 0;
  let totalPayrollDeductions = 0;
  let totalNetSalaryReceived = 0;

  // Track per-month salary metrics
  const monthlySalaryData = {};

  salaries.forEach((s) => {
    const basic = Number(s.Basic_Salary) || 0;
    const allow = Number(s.Allowances) || 0;
    const bonus = Number(s.Bonuses) || 0;
    const addl = Number(s.Additional_Income) || 0;
    const mode = s.Salary_Mode || "Gross"; // "Gross" | "Net"
    const month = s.Salary_Month || "Unknown";

    let gross = 0;
    let net = 0;
    let payrollDed = Number(s.Payroll_Deductions) || 0;

    if (mode === "Net") {
      // User entered actual net salary received directly
      net = Number(s.Net_Salary || s.Basic_Salary || s.Total_Salary) || 0;
      gross = Number(s.Gross_Salary || s.Total_Salary) || (basic + allow + bonus + payrollDed) || (net + payrollDed);
    } else {
      // Gross mode: Net = Gross - Payroll Deductions
      gross = Number(s.Gross_Salary || s.Total_Salary) || (basic + allow + bonus + addl);
      net = Number(s.Net_Salary) || Math.max(0, gross - payrollDed);
      if (!s.Net_Salary && payrollDed === 0) {
        // Fallback for legacy records without explicit deductions field
        net = gross;
      }
    }

    totalBasicSalary += basic;
    totalAllowances += allow;
    totalBonuses += bonus;
    totalAdditionalIncome += addl;
    totalGrossSalary += gross;
    totalPayrollDeductions += payrollDed;
    totalNetSalaryReceived += net;

    monthlySalaryData[month] = {
      grossSalary: gross,
      basicSalary: basic,
      allowances: allow,
      bonuses: bonus,
      additionalIncome: addl,
      payrollDeductions: payrollDed,
      netSalaryReceived: net,
      salaryMode: mode
    };
  });

  // 3. Savings Accounts & Transactions
  const savingsAccounts = sheets.Savings_Accounts || [];
  const savingsTransactions = sheets.Savings_Transactions || [];
  let totalSavingsDeposits = 0;
  let totalSavingsWithdrawals = 0;

  const accountBalances = {};
  savingsAccounts.forEach((acc) => {
    const accKey = acc.Record_ID || acc.Account_ID;
    const hasTransactions = savingsTransactions.some(
      (tx) => (tx.Account_ID && (tx.Account_ID === acc.Record_ID || tx.Account_ID === acc.Account_ID)) ||
              (tx.Record_ID && (tx.Record_ID === acc.Record_ID || tx.Record_ID === acc.Account_ID))
    );
    // If account has explicit ledger transactions, starting balance is Initial_Balance.
    // If no transactions exist yet, use Current_Balance as the initial snapshot.
    const initialBal = hasTransactions
      ? (Number(acc.Initial_Balance) || 0)
      : (Number(acc.Current_Balance || acc.Initial_Balance) || 0);

    accountBalances[accKey] = {
      id: accKey,
      name: acc.Account_Name,
      target: Number(acc.Target_Amount) || 0,
      notes: acc.Notes || "",
      deposits: 0,
      withdrawals: 0,
      balance: initialBal
    };
  });

  // Set of deduction IDs that successfully deposited into Savings_Transactions
  const linkedSavingsDeductionRecordIds = new Set();

  savingsTransactions.forEach((tx) => {
    const amt = Number(tx.Amount) || 0;
    const accId = tx.Account_ID || tx.Record_ID;
    if (tx.Transaction_Type === "Deposit") {
      totalSavingsDeposits += amt;
      if (accountBalances[accId]) {
        accountBalances[accId].deposits += amt;
        accountBalances[accId].balance += amt;
      }
      if (tx.Related_Record_ID) {
        linkedSavingsDeductionRecordIds.add(tx.Related_Record_ID);
      }
    } else if (tx.Transaction_Type === "Withdrawal") {
      totalSavingsWithdrawals += amt;
      if (accountBalances[accId]) {
        accountBalances[accId].withdrawals += amt;
        accountBalances[accId].balance -= amt;
      }
    }
  });

  const totalSavings = Object.values(accountBalances).length > 0
    ? Object.values(accountBalances).reduce((sum, a) => sum + (a.balance || 0), 0)
    : Math.max(0, totalSavingsDeposits - totalSavingsWithdrawals);

  // 4. Legacy Salary Deductions (Reconciled with Savings Deposits to prevent double-counting)
  const legacyDeductions = sheets.Salary_Deductions || [];
  let totalLegacyDeductions = 0;
  let legacySavingsDeductions = 0;
  let legacyNonSavingsDeductions = 0;

  legacyDeductions.forEach((d) => {
    const amt = Number(d.Amount) || 0;
    totalLegacyDeductions += amt;

    if (d.Category === "Savings") {
      legacySavingsDeductions += amt;
      if (!linkedSavingsDeductionRecordIds.has(d.Record_ID)) {
        legacyNonSavingsDeductions += amt;
      }
    } else {
      legacyNonSavingsDeductions += amt;
    }
  });

  // 5. Unified Expenses & Deductions
  const expensesList = sheets.Expenses || [];
  let totalExpenses = 0;
  let totalSavingsAllocations = 0;
  let totalLoanRepaymentsOutflow = 0;
  let totalPayrollDeductionsOutflow = 0;
  let totalOtherDeductionsOutflow = 0;
  const expensesByCategory = {};
  const monthlyExpenseData = {};

  expensesList.forEach((e) => {
    const amt = Number(e.Amount) || 0;
    const type = e.Transaction_Type || "Daily Expense";
    const cat = e.Category || "Other";
    const month = e.Salary_Month || (e.Expense_Date ? e.Expense_Date.slice(0, 7) : "Unknown");

    if (!monthlyExpenseData[month]) {
      monthlyExpenseData[month] = {
        expenses: 0,
        savingsAllocations: 0,
        loanRepayments: 0,
        payrollDeductions: 0,
        otherDeductions: 0
      };
    }

    if (type === "Savings Allocation") {
      totalSavingsAllocations += amt;
      monthlyExpenseData[month].savingsAllocations += amt;
    } else if (type === "Loan Repayment") {
      totalLoanRepaymentsOutflow += amt;
      monthlyExpenseData[month].loanRepayments += amt;
    } else if (type === "Payroll Deduction") {
      totalPayrollDeductionsOutflow += amt;
      monthlyExpenseData[month].payrollDeductions += amt;
    } else if (type === "Other Deduction") {
      totalOtherDeductionsOutflow += amt;
      monthlyExpenseData[month].otherDeductions += amt;
    } else {
      // Daily Expense or Monthly Expense
      totalExpenses += amt;
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + amt;
      monthlyExpenseData[month].expenses += amt;
    }
  });

  // 6. Lending (Money given to others - Receivables)
  const lending = sheets.Lending || [];
  let totalMoneyLent = 0;
  let totalLendingRepaymentsReceived = 0;
  let outstandingReceivables = 0;

  lending.forEach((l) => {
    const amt = Number(l.Amount) || 0;
    const repaid = Number(l.Repaid_Amount) || 0;
    const remaining = Number(l.Remaining_Balance) !== undefined ? Number(l.Remaining_Balance) : Math.max(0, amt - repaid);
    totalMoneyLent += amt;
    totalLendingRepaymentsReceived += repaid;
    outstandingReceivables += remaining;
  });

  // Check Loan_Repayments table for sync
  const loanRepayments = sheets.Loan_Repayments || [];
  let totalLendingRepaymentsFromTable = 0;
  let totalBorrowingRepaymentsFromTable = 0;

  loanRepayments.forEach((r) => {
    const amt = Number(r.Amount) || 0;
    if (r.Loan_Type === "Lending_Repayment_Received") {
      totalLendingRepaymentsFromTable += amt;
    } else if (r.Loan_Type === "Borrowing_Repayment_Paid") {
      totalBorrowingRepaymentsFromTable += amt;
    }
  });

  const effectiveLendingRepayments = Math.max(totalLendingRepaymentsReceived, totalLendingRepaymentsFromTable);

  // 7. Borrowing (Money borrowed from others - Payables / Liabilities)
  const borrowing = sheets.Borrowing || [];
  let totalMoneyBorrowed = 0;
  let totalBorrowingRepaymentsPaid = 0;
  let outstandingPayables = 0;

  borrowing.forEach((b) => {
    const amt = Number(b.Amount) || 0;
    const repaid = Number(b.Repaid_Amount) || 0;
    const remaining = Number(b.Remaining_Balance) !== undefined ? Number(b.Remaining_Balance) : Math.max(0, amt - repaid);
    totalMoneyBorrowed += amt;
    totalBorrowingRepaymentsPaid += repaid;
    outstandingPayables += remaining;
  });

  const effectiveBorrowingRepayments = Math.max(totalBorrowingRepaymentsPaid, totalBorrowingRepaymentsFromTable);
  const effectiveLoanRepaymentsOutflow = Math.max(totalLoanRepaymentsOutflow, effectiveBorrowingRepayments);

  // 8. Other Income from Transactions
  const transactions = sheets.Transactions || [];
  let otherIncome = 0;
  transactions.forEach((tx) => {
    if (tx.Transaction_Type === "Other_Income" || tx.Transaction_Type === "Income") {
      otherIncome += Number(tx.Amount) || 0;
    }
  });

  // 9. Exact Available Cash Balance formula:
  // For each salary record:
  // - If Salary_Mode === "Net": Cash entering bank is directly Net_Salary + Additional_Income
  // - If Salary_Mode === "Gross" (or legacy): Cash is Total_Salary + Additional_Income - (Payroll_Deductions > 0 ? Payroll_Deductions : 0)
  let salaryCashInflow = 0;
  salaries.forEach((s) => {
    const addl = Number(s.Additional_Income) || 0;
    const mode = s.Salary_Mode || "Gross";
    const payrollDed = Number(s.Payroll_Deductions) || 0;
    const basic = Number(s.Basic_Salary) || 0;
    const allow = Number(s.Allowances) || 0;
    const bonus = Number(s.Bonuses) || 0;

    if (mode === "Net") {
      const net = Number(s.Net_Salary || s.Basic_Salary || s.Total_Salary) || 0;
      salaryCashInflow += net;
    } else {
      const gross = Number(s.Gross_Salary || s.Total_Salary) || (basic + allow + bonus + addl);
      if (payrollDed > 0) {
        salaryCashInflow += Math.max(0, gross - payrollDed);
      } else {
        salaryCashInflow += gross;
      }
    }
  });

  const deductionDeductions = legacyNonSavingsDeductions + totalOtherDeductionsOutflow;

  const availableCash = (
    openingCash +
    salaryCashInflow +
    otherIncome +
    totalMoneyBorrowed +
    effectiveLendingRepayments +
    totalSavingsWithdrawals -
    totalExpenses -
    totalSavingsDeposits -
    totalMoneyLent -
    effectiveLoanRepaymentsOutflow -
    deductionDeductions
  );

  // 10. Estimated Net Worth:
  // Available Cash + Total Savings + Receivables - Payables
  const estimatedNetWorth = availableCash + totalSavings + outstandingReceivables - outstandingPayables;

  // 11. Monthly Breakdown Engine
  const allMonths = Array.from(
    new Set([...Object.keys(monthlySalaryData), ...Object.keys(monthlyExpenseData)])
  ).filter((m) => m && m !== "Unknown").sort();

  const monthlyBreakdown = allMonths.map((month) => {
    const sal = monthlySalaryData[month] || {
      grossSalary: 0,
      basicSalary: 0,
      allowances: 0,
      bonuses: 0,
      additionalIncome: 0,
      payrollDeductions: 0,
      netSalaryReceived: 0,
      salaryMode: "Gross"
    };

    const exp = monthlyExpenseData[month] || {
      expenses: 0,
      savingsAllocations: 0,
      loanRepayments: 0,
      payrollDeductions: 0,
      otherDeductions: 0
    };

    // Calculate remaining salary balance for the month:
    // Net Salary Received + Additional Income - Expenses - Savings Allocations - Loan Repayments - Other Deductions
    const effectiveNetInflow = sal.netSalaryReceived > 0
      ? sal.netSalaryReceived + sal.additionalIncome
      : sal.grossSalary + sal.additionalIncome;

    const remainingSalaryBalance = (
      effectiveNetInflow -
      exp.expenses -
      exp.savingsAllocations -
      exp.loanRepayments -
      exp.otherDeductions
    );

    const explanation = `Net Salary (Rs. ${effectiveNetInflow.toLocaleString()}) - Expenses (Rs. ${exp.expenses.toLocaleString()}) - Savings (Rs. ${exp.savingsAllocations.toLocaleString()}) - Loan Repayments (Rs. ${exp.loanRepayments.toLocaleString()}) = Rs. ${remainingSalaryBalance.toLocaleString()}`;

    return {
      month,
      grossSalary: sal.grossSalary,
      payrollDeductions: sal.payrollDeductions || exp.payrollDeductions,
      netSalaryReceived: sal.netSalaryReceived || sal.grossSalary,
      additionalIncome: sal.additionalIncome,
      effectiveNetInflow,
      expenses: exp.expenses,
      actualExpenses: exp.expenses,
      savingsAllocations: exp.savingsAllocations,
      savingsAllocated: exp.savingsAllocations,
      loanRepayments: exp.loanRepayments,
      otherDeductions: exp.otherDeductions,
      remainingSalaryBalance,
      explanation
    };
  });

  const totalAssets = availableCash + totalSavings + outstandingReceivables;
  const totalLiabilities = outstandingPayables;
  const totalLoanRepayments = Math.max(totalLoanRepaymentsOutflow, effectiveBorrowingRepayments);

  return {
    currency: metadata.Currency || "LKR",
    openingCash,
    totalGrossSalary,
    totalBasicSalary,
    totalAllowances,
    totalBonuses,
    totalAdditionalIncome,
    totalPayrollDeductions,
    totalNetSalaryReceived,
    totalNetSalary: totalNetSalaryReceived,
    totalDeductions: totalLegacyDeductions + totalPayrollDeductionsOutflow + totalOtherDeductionsOutflow,
    savingsDeductions: legacySavingsDeductions + totalSavingsAllocations,
    nonSavingsDeductions: legacyNonSavingsDeductions + totalOtherDeductionsOutflow,
    totalSavings,
    totalSavingsDeposits,
    totalSavingsWithdrawals,
    totalSavingsAllocations,
    totalLoanRepayments,
    totalLoanRepaymentsOutflow,
    accountBalances: Object.values(accountBalances),
    totalExpenses,
    expensesByCategory,
    totalMoneyLent,
    effectiveLendingRepayments,
    outstandingReceivables,
    totalMoneyBorrowed,
    effectiveBorrowingRepayments,
    outstandingPayables,
    otherIncome,
    availableCash,
    cashBalance: availableCash,
    estimatedNetWorth,
    netWorth: estimatedNetWorth,
    totalAssets,
    totalLiabilities,
    monthlyBreakdown
  };
}

/**
 * Format currency with LKR symbol (Rs. ) and commas
 */
export function formatCurrency(amount, currency = "LKR") {
  const num = Number(amount) || 0;
  const formatted = num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  if (currency === "LKR") {
    return `Rs. ${formatted}`;
  }
  return `${currency} ${formatted}`;
}

/**
 * Aggregates monthly income and expense data for the last 12 months for charts
 */
export function getMonthlyTrendData(databaseData, monthsCount = 12) {
  const sheets = databaseData?.sheets || {};
  const salaries = sheets.Salary || [];
  const expenses = sheets.Expenses || [];
  const savingsTx = sheets.Savings_Transactions || [];

  const now = new Date();
  const months = [];

  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    months.push({ key, label, income: 0, expense: 0, savings: 0 });
  }

  const monthMap = new Map(months.map((m) => [m.key, m]));

  salaries.forEach((s) => {
    let key = s.Salary_Month;
    if (!key && s.Salary_Received_Date) {
      key = s.Salary_Received_Date.slice(0, 7);
    }
    if (monthMap.has(key)) {
      monthMap.get(key).income += Number(s.Total_Salary) || 0;
    }
  });

  expenses.forEach((e) => {
    if (e.Expense_Date) {
      const key = e.Expense_Date.slice(0, 7);
      if (monthMap.has(key)) {
        monthMap.get(key).expense += Number(e.Amount) || 0;
      }
    }
  });

  savingsTx.forEach((tx) => {
    if (tx.Transaction_Date && tx.Transaction_Type === "Deposit") {
      const key = tx.Transaction_Date.slice(0, 7);
      if (monthMap.has(key)) {
        monthMap.get(key).savings += Number(tx.Amount) || 0;
      }
    }
  });

  return months;
}

/**
 * Calculate Monthly Budget vs Actual Expenses for a given month (YYYY-MM)
 */
export function getBudgetProgress(databaseData, monthKey) {
  const currentMonth = monthKey || new Date().toISOString().slice(0, 7);
  const sheets = databaseData?.sheets || {};
  const budgets = sheets.Budgets || [];
  const expenses = sheets.Expenses || [];

  const categoryBudgets = {};
  budgets
    .filter((b) => !b.Budget_Month || b.Budget_Month === currentMonth)
    .forEach((b) => {
      categoryBudgets[b.Category] = {
        recordId: b.Record_ID,
        allocated: Number(b.Allocated_Amount) || 0,
        notes: b.Notes || ""
      };
    });

  const categorySpent = {};
  expenses
    .filter((e) => e.Expense_Date && e.Expense_Date.startsWith(currentMonth))
    .forEach((e) => {
      const cat = e.Category || "Other";
      categorySpent[cat] = (categorySpent[cat] || 0) + (Number(e.Amount) || 0);
    });

  const allCategories = Array.from(
    new Set([...Object.keys(categoryBudgets), ...Object.keys(categorySpent)])
  );

  return allCategories.map((cat) => {
    const allocated = categoryBudgets[cat]?.allocated || 0;
    const spent = categorySpent[cat] || 0;
    const remaining = allocated - spent;
    const percent = allocated > 0 ? Math.min(Math.round((spent / allocated) * 100), 200) : 0;
    const isOver = spent > allocated && allocated > 0;

    return {
      category: cat,
      allocated,
      spent,
      remaining,
      percent,
      isOver,
      budgetRecordId: categoryBudgets[cat]?.recordId
    };
  });
}
