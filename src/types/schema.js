/**
 * Schema and constants for the 15 Excel worksheets that form
 * the Excel-only database for Personal Salary & Finance Manager.
 */

export const WORKBOOK_NAME = "Personal_Finance_Database.xlsx";
export const SCHEMA_VERSION = "2.0";
export const BACKUP_VERSION = "2.0";
export const DEFAULT_CURRENCY = "LKR";

export const SHEET_NAMES = [
  "Backup_Metadata",
  "Salary",
  "Salary_Deductions",
  "Savings_Accounts",
  "Savings_Transactions",
  "Expenses",
  "Lending",
  "Borrowing",
  "Loan_Repayments",
  "Categories",
  "Transactions",
  "Budgets",
  "Savings_Goals",
  "Recurring_Transactions",
  "Financial_Settings"
];

export const SHEET_HEADERS = {
  Backup_Metadata: [
    "Database_ID",
    "Record_ID",
    "Backup_Version",
    "Schema_Version",
    "Created_Date",
    "Updated_Date",
    "Total_Records",
    "Currency",
    "Starting_Financial_Date",
    "Opening_Cash_Balance",
    "Notes"
  ],
  Salary: [
    "Database_ID",
    "Record_ID",
    "Transaction_ID",
    "Salary_Month",
    "Salary_Received_Date",
    "Salary_Mode", // "Gross" | "Net"
    "Basic_Salary",
    "Allowances",
    "Bonuses",
    "Payroll_Deductions",
    "Additional_Income",
    "Net_Salary",
    "Total_Salary",
    "Notes",
    "Created_Date",
    "Updated_Date"
  ],
  Salary_Deductions: [
    "Database_ID",
    "Record_ID",
    "Transaction_ID",
    "Salary_Record_ID",
    "Salary_Month",
    "Deduction_Date",
    "Category",
    "Amount",
    "Description",
    "Auto_Deposit_Savings_Account_ID",
    "Created_Date",
    "Updated_Date"
  ],
  Savings_Accounts: [
    "Database_ID",
    "Record_ID",
    "Account_Name",
    "Target_Amount",
    "Notes",
    "Created_Date",
    "Updated_Date"
  ],
  Savings_Transactions: [
    "Database_ID",
    "Record_ID",
    "Transaction_ID",
    "Account_ID",
    "Account_Name",
    "Transaction_Type", // Deposit or Withdrawal
    "Amount",
    "Transaction_Date",
    "Source_Or_Purpose",
    "Related_Record_ID",
    "Notes",
    "Created_Date",
    "Updated_Date"
  ],
  Expenses: [
    "Database_ID",
    "Record_ID",
    "Transaction_ID",
    "Salary_Month",
    "Expense_Date",
    "Category",
    "Transaction_Type", // "Daily Expense" | "Monthly Expense" | "Payroll Deduction" | "Loan Repayment" | "Savings Allocation" | "Other Deduction"
    "Amount",
    "Payment_Method",
    "Description",
    "Receipt_Ref",
    "Linked_Savings_Account_ID",
    "Linked_Loan_ID",
    "Created_Date",
    "Updated_Date"
  ],
  Lending: [
    "Database_ID",
    "Record_ID",
    "Transaction_ID",
    "Person_Name",
    "Amount",
    "Given_Date",
    "Expected_Return_Date",
    "Repaid_Amount",
    "Remaining_Balance",
    "Description",
    "Status", // Active, Partially Repaid, Fully Repaid
    "Created_Date",
    "Updated_Date"
  ],
  Borrowing: [
    "Database_ID",
    "Record_ID",
    "Transaction_ID",
    "Person_Name",
    "Amount",
    "Borrowed_Date",
    "Expected_Repayment_Date",
    "Repaid_Amount",
    "Remaining_Balance",
    "Description",
    "Status", // Active, Partially Repaid, Fully Repaid
    "Created_Date",
    "Updated_Date"
  ],
  Loan_Repayments: [
    "Database_ID",
    "Record_ID",
    "Transaction_ID",
    "Loan_Type", // Lending_Repayment_Received or Borrowing_Repayment_Paid
    "Related_Loan_ID",
    "Person_Name",
    "Repayment_Date",
    "Amount",
    "Notes",
    "Created_Date",
    "Updated_Date"
  ],
  Categories: [
    "Database_ID",
    "Record_ID",
    "Category_Type", // Expense, Income, Deduction
    "Category_Name",
    "Color",
    "Icon",
    "Created_Date",
    "Updated_Date"
  ],
  Transactions: [
    "Database_ID",
    "Record_ID",
    "Transaction_ID",
    "Transaction_Date",
    "Transaction_Type", // Salary, Deduction, Savings_Deposit, Savings_Withdrawal, Expense, Lending_Given, Borrowing_Received, Lending_Repayment_Received, Borrowing_Repayment_Paid
    "Category",
    "Description",
    "Cash_Flow_Type", // Inflow, Outflow, Neutral
    "Amount",
    "Related_Record_ID",
    "Created_Date",
    "Updated_Date"
  ],
  Budgets: [
    "Database_ID",
    "Record_ID",
    "Budget_Month",
    "Category",
    "Allocated_Amount",
    "Notes",
    "Created_Date",
    "Updated_Date"
  ],
  Savings_Goals: [
    "Database_ID",
    "Record_ID",
    "Goal_Name",
    "Target_Amount",
    "Target_Date",
    "Linked_Account_ID",
    "Notes",
    "Status", // In Progress, Achieved
    "Created_Date",
    "Updated_Date"
  ],
  Recurring_Transactions: [
    "Database_ID",
    "Record_ID",
    "Title",
    "Type", // Expense, Salary, Savings
    "Category",
    "Amount",
    "Frequency", // Daily, Weekly, Monthly, Yearly
    "Next_Due_Date",
    "Auto_Reminder",
    "Status", // Active, Paused
    "Created_Date",
    "Updated_Date"
  ],
  Financial_Settings: [
    "Database_ID",
    "Record_ID",
    "Setting_Key",
    "Setting_Value",
    "Description",
    "Updated_Date"
  ]
};

export const DEFAULT_CATEGORIES = [
  { Category_Type: "Expense", Category_Name: "Food & Groceries", Color: "#F59E0B", Icon: "Utensils" },
  { Category_Type: "Expense", Category_Name: "Transport", Color: "#3B82F6", Icon: "Car" },
  { Category_Type: "Expense", Category_Name: "Electricity & Water", Color: "#EF4444", Icon: "Zap" },
  { Category_Type: "Expense", Category_Name: "Internet & Telephone", Color: "#06B6D4", Icon: "Wifi" },
  { Category_Type: "Expense", Category_Name: "Rent", Color: "#8B5CF6", Icon: "Home" },
  { Category_Type: "Expense", Category_Name: "Shopping", Color: "#EC4899", Icon: "ShoppingBag" },
  { Category_Type: "Expense", Category_Name: "Medical", Color: "#10B981", Icon: "Activity" },
  { Category_Type: "Expense", Category_Name: "Personal Expenses", Color: "#6366F1", Icon: "User" },
  { Category_Type: "Expense", Category_Name: "Insurance", Color: "#4B5563", Icon: "Shield" },
  { Category_Type: "Expense", Category_Name: "Loan Repayments", Color: "#D97706", Icon: "CreditCard" },
  { Category_Type: "Deduction", Category_Name: "Savings Allocation", Color: "#059669", Icon: "PiggyBank" },
  { Category_Type: "Deduction", Category_Name: "Other Deductions", Color: "#6B7280", Icon: "Tag" }
];

export const DEFAULT_SAVINGS_ACCOUNTS = [
  { Account_Name: "Emergency Savings", Target_Amount: 500000, Notes: "3-6 months living expenses safety fund" },
  { Account_Name: "Personal Savings", Target_Amount: 300000, Notes: "General personal savings buffer" },
  { Account_Name: "Future Goals", Target_Amount: 1000000, Notes: "Long-term investment and home asset fund" }
];

/**
 * ID generator helpers
 */
export function generateDatabaseId() {
  const now = new Date();
  const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DB-${yyyymmdd}-${rand}`;
}

export function generateRecordId(prefix = "REC") {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  const time = Date.now().toString(36).slice(-4).toUpperCase();
  return `${prefix}-${time}${rand}`;
}

export function generateTransactionId() {
  return generateRecordId("TX");
}

export function getNowISO() {
  return new Date().toISOString();
}

export function getTodayDateStr() {
  return new Date().toISOString().slice(0, 10);
}
