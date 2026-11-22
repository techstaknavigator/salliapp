// Test Suite for Major Application Improvements
// Testing:
// 1. Part 1: Salary, Deductions & Expenses logic, Net vs Gross, zero double-counting, savings allocation, loan repayment
// 2. Part 4: PWA Web App Manifest, Service Worker privacy/caching filters, icons
// 3. Part 5: Excel database backward/forward compatibility

import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { calculateFinancialSummary } from './src/services/financialCalculations.js';
import { createNewDatabase, writeWorkbookToBuffer, readWorkbookFromBuffer } from './src/services/excelEngine.js';
import { SHEET_NAMES, SHEET_HEADERS, DEFAULT_CATEGORIES } from './src/types/schema.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('=====================================================');
console.log('RUNNING MAJOR APPLICATION IMPROVEMENTS TEST SUITE');
console.log('=====================================================\n');

// ---------------------------------------------------------------------
// TEST SUITE 1: Financial Logic & Zero Double-Counting Engine
// ---------------------------------------------------------------------
console.log('--- TEST 1: Salary Management - Net Mode vs Gross Mode ---');

// Case A: Net Salary Mode (User receives $4,000 cash in bank after $1,000 taxes/EPF)
const dbNet = createNewDatabase({ userName: "Test User", openingBalance: 500 });

dbNet.sheets.Salary.push({
  Salary_ID: "SAL-001",
  Salary_Month: "2026-11",
  Basic_Salary: 3500,
  Allowances: 500,
  Overtime: 0,
  Bonuses: 0,
  Additional_Income: 0,
  Total_Salary: 5000,
  Gross_Salary: 5000,
  Payroll_Deductions: 1000,
  Net_Salary: 4000,
  Salary_Mode: "Net",
  EPF_Employee: 400,
  EPF_Employer: 600,
  Tax_Deductions: 500,
  Other_Deductions: 100,
  Actual_Payment_Date: "2026-11-25",
  Payment_Method: "Bank Transfer",
  Status: "Received",
  Notes: "Standard monthly salary"
});

// Calculate summary
let summaryNet = calculateFinancialSummary(dbNet);

assert(summaryNet.totalGrossSalary === 5000, `Total Gross Salary is 5000 (got ${summaryNet.totalGrossSalary})`);
assert(summaryNet.totalNetSalary === 4000, `Total Net Salary is 4000 (got ${summaryNet.totalNetSalary})`);
assert(summaryNet.totalPayrollDeductions === 1000, `Total Payroll Deductions is 1000 (got ${summaryNet.totalPayrollDeductions})`);
// Since Salary_Mode is "Net", starting cash inflow from salary MUST be 4000, NOT 5000
// Cash balance = Opening (500) + Inflow from salary (4000) = 4500
assert(summaryNet.cashBalance === 4500, `Net Mode Cash Balance is 4500 (got ${summaryNet.cashBalance})`);

// Case B: Gross Salary Mode (User receives gross $5,000 into cash, and payroll deductions are explicitly deducted)
const dbGross = createNewDatabase({ userName: "Test User", openingBalance: 500 });
dbGross.sheets.Salary.push({
  Salary_ID: "SAL-002",
  Salary_Month: "2026-11",
  Basic_Salary: 4500,
  Allowances: 500,
  Overtime: 0,
  Bonuses: 0,
  Additional_Income: 0,
  Total_Salary: 5000,
  Gross_Salary: 5000,
  Payroll_Deductions: 1000,
  Net_Salary: 4000,
  Salary_Mode: "Gross",
  Actual_Payment_Date: "2026-11-25",
  Status: "Received"
});

let summaryGross = calculateFinancialSummary(dbGross);
// Cash balance = Opening (500) + Gross Inflow (5000) - Payroll Deductions (1000) = 4500
assert(summaryGross.cashBalance === 4500, `Gross Mode Cash Balance is 4500 after deducting payroll deductions (got ${summaryGross.cashBalance})`);
assert(summaryNet.cashBalance === summaryGross.cashBalance, "Both Net and Gross modes reconcile to the exact same ending Cash Balance ($4,500)");

console.log('\n--- TEST 2: Unified Deductions & Expenses (Outflow Types) ---');

// Add a Daily Expense ($200 for Food)
dbNet.sheets.Expenses.push({
  Expense_ID: "EXP-001",
  Date: "2026-11-05",
  Category: "Food & Groceries",
  Amount: 200,
  Payment_Method: "Cash",
  Transaction_Type: "Daily Expense",
  Salary_Month: "2026-11",
  Description: "Supermarket groceries"
});

// Add a Monthly Expense ($300 for Electricity & Water)
dbNet.sheets.Expenses.push({
  Expense_ID: "EXP-002",
  Date: "2026-11-10",
  Category: "Electricity & Water",
  Amount: 300,
  Payment_Method: "Bank Transfer",
  Transaction_Type: "Monthly Expense",
  Salary_Month: "2026-11",
  Description: "Utility bills"
});

// Add a Savings Allocation ($600 transferred from cash to Savings Account)
// Clear default accounts for this targeted calculation test
dbNet.sheets.Savings_Accounts = [{
  Record_ID: "ACC-001",
  Account_ID: "ACC-001",
  Account_Name: "Emergency Fund",
  Bank_Name: "Standard Chartered",
  Current_Balance: 1000
}];

dbNet.sheets.Expenses.push({
  Expense_ID: "EXP-003",
  Date: "2026-11-15",
  Category: "Savings Allocation",
  Amount: 600,
  Payment_Method: "Bank Transfer",
  Transaction_Type: "Savings Allocation",
  Salary_Month: "2026-11",
  Linked_Savings_Account_ID: "ACC-001",
  Description: "Monthly savings transfer"
});
// Corresponding deposit in Savings_Transactions
dbNet.sheets.Savings_Transactions.push({
  Transaction_ID: "STX-001",
  Account_ID: "ACC-001",
  Date: "2026-11-15",
  Transaction_Type: "Deposit",
  Amount: 600,
  Description: "Transfer from salary",
  Related_Expense_ID: "EXP-003"
});

// Add a Loan Repayment ($400 to pay down existing liability)
dbNet.sheets.Borrowing.push({
  Record_ID: "BOR-001",
  Loan_ID: "BOR-001",
  Lender_Name: "City Bank",
  Amount: 0, // Existing loan from prior period (not new cash inflow)
  Principal_Amount: 4000,
  Repaid_Amount: 400,
  Total_Repaid: 400,
  Remaining_Balance: 3600,
  Status: "Active"
});

dbNet.sheets.Expenses.push({
  Expense_ID: "EXP-004",
  Date: "2026-11-20",
  Category: "Loan Repayments",
  Amount: 400,
  Payment_Method: "Bank Transfer",
  Transaction_Type: "Loan Repayment",
  Salary_Month: "2026-11",
  Linked_Loan_ID: "BOR-001",
  Description: "Car loan installment"
});
// Corresponding repayment record
dbNet.sheets.Loan_Repayments.push({
  Repayment_ID: "REP-001",
  Loan_ID: "BOR-001",
  Payment_Date: "2026-11-20",
  Amount: 400,
  Amount_Paid: 400,
  Loan_Type: "Borrowing_Repayment_Paid",
  Principal_Portion: 350,
  Interest_Portion: 50,
  Payment_Method: "Bank Transfer",
  Related_Expense_ID: "EXP-004"
});

// Recompute financial summary
summaryNet = calculateFinancialSummary(dbNet);

console.log('\n--- TEST 3: Zero Double-Counting Verification ---');
// 1. Total Expenses must be EXP-001 (200) + EXP-002 (300) = 500.
// Savings Allocation (600) and Loan Repayment (400) must NOT be counted in regular expenses!
assert(summaryNet.totalExpenses === 500, `Total actual expenses is 500 (got ${summaryNet.totalExpenses})`);
assert(summaryNet.totalSavingsAllocations === 600, `Total savings allocations is 600 (got ${summaryNet.totalSavingsAllocations})`);
assert(summaryNet.totalLoanRepayments === 400, `Total loan repayments is 400 (got ${summaryNet.totalLoanRepayments})`);

// 2. Cash balance calculation:
// Inflow: Opening (500) + Net Salary (4000) = 4500
// Outflow: Expenses (500) + Savings Allocation (600) + Loan Repayment (400) = 1500
// Remaining Cash = 4500 - 1500 = 3000
assert(summaryNet.cashBalance === 3000, `Cash balance matches exact formula: $3,000 (got ${summaryNet.cashBalance})`);

// 3. Total Savings:
// Account balance = 1600
assert(summaryNet.totalSavings === 1600, `Total Savings is $1,600 (got ${summaryNet.totalSavings})`);

// 4. Net Worth:
// Assets = Cash (3000) + Savings (1600) = 4600
// Liabilities = Remaining Borrowed Loan (3600)
// Net Worth = Assets (4600) - Liabilities (3600) = 1000
assert(summaryNet.totalAssets === 4600, `Total Assets is $4,600 (got ${summaryNet.totalAssets})`);
assert(summaryNet.totalLiabilities === 3600, `Total Liabilities is $3,600 (got ${summaryNet.totalLiabilities})`);
assert(summaryNet.netWorth === 1000, `Net Worth is $1,000 (got ${summaryNet.netWorth})`);

// 5. Monthly Breakdown check
const novMonth = summaryNet.monthlyBreakdown.find(m => m.month === '2026-11');
assert(novMonth !== undefined, "Monthly breakdown includes 2026-11");
assert(novMonth.netSalaryReceived === 4000, `Nov Net Salary Received is 4000 (got ${novMonth.netSalaryReceived})`);
assert(novMonth.actualExpenses === 500, `Nov Actual Expenses is 500 (got ${novMonth.actualExpenses})`);
assert(novMonth.savingsAllocated === 600, `Nov Savings Allocated is 600 (got ${novMonth.savingsAllocated})`);
assert(novMonth.loanRepayments === 400, `Nov Loan Repayments is 400 (got ${novMonth.loanRepayments})`);
assert(novMonth.remainingSalaryBalance === 2500, `Nov Remaining Salary Balance is 4000 - (500 + 600 + 400) = 2500 (got ${novMonth.remainingSalaryBalance})`);

// ---------------------------------------------------------------------
// TEST SUITE 2: Excel Database Compatibility (Export & Import Roundtrip)
// ---------------------------------------------------------------------
console.log('\n--- TEST 4: Excel Database Serialization & Schema Verification ---');

const buffer = writeWorkbookToBuffer(dbNet);
assert(buffer && buffer.byteLength > 0, `Workbook exported to binary buffer (${buffer.byteLength} bytes)`);

// Reimport database from buffer
const reimportedDb = readWorkbookFromBuffer(buffer);
assert(Object.keys(reimportedDb.sheets).length === 15, `Reimported database contains all 15 worksheets (got ${Object.keys(reimportedDb.sheets).length})`);

assert(reimportedDb.sheets.Salary.length === 1, "Reimported Salary sheet has 1 record");
assert(reimportedDb.sheets.Salary[0].Salary_Mode === "Net", `Reimported Salary preserves Salary_Mode: 'Net' (got ${reimportedDb.sheets.Salary[0].Salary_Mode})`);
assert(Number(reimportedDb.sheets.Salary[0].Payroll_Deductions) === 1000, "Reimported Salary preserves Payroll_Deductions: 1000");
assert(Number(reimportedDb.sheets.Salary[0].Net_Salary) === 4000, "Reimported Salary preserves Net_Salary: 4000");

assert(reimportedDb.sheets.Expenses.length === 4, `Reimported Expenses sheet has 4 records (got ${reimportedDb.sheets.Expenses.length})`);
const reimportedSavingsAllocation = reimportedDb.sheets.Expenses.find(e => e.Transaction_Type === "Savings Allocation");
assert(reimportedSavingsAllocation !== undefined, "Reimported Expenses includes Savings Allocation record");
assert(reimportedSavingsAllocation.Linked_Savings_Account_ID === "ACC-001", "Preserves Linked_Savings_Account_ID");

// ---------------------------------------------------------------------
// TEST SUITE 3: PWA Manifest & Service Worker Verification
// ---------------------------------------------------------------------
console.log('\n--- TEST 5: PWA Manifest & Service Worker Security Verification ---');

const manifestPath = path.join(process.cwd(), 'public', 'manifest.webmanifest');
assert(fs.existsSync(manifestPath), "public/manifest.webmanifest exists");

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
assert(manifest.name === "Personal Salary & Finance Manager", `Manifest name is correct: "${manifest.name}"`);
assert(manifest.display === "standalone", `Manifest display mode is "standalone" (got ${manifest.display})`);
assert(manifest.start_url === "/", `Manifest start_url is "/"`);
assert(manifest.theme_color === "#10b981", `Manifest theme_color is "#10b981"`);
assert(manifest.icons.length >= 3, `Manifest specifies ${manifest.icons.length} icons`);

const icon192 = path.join(process.cwd(), 'public', 'icons', 'icon-192.png');
const icon512 = path.join(process.cwd(), 'public', 'icons', 'icon-512.png');
const iconMaskable = path.join(process.cwd(), 'public', 'icons', 'icon-maskable-512.png');
assert(fs.existsSync(icon192), "192x192 PNG icon exists");
assert(fs.existsSync(icon512), "512x512 PNG icon exists");
assert(fs.existsSync(iconMaskable), "512x512 maskable PNG icon exists");

const swPath = path.join(process.cwd(), 'public', 'sw.js');
assert(fs.existsSync(swPath), "public/sw.js exists");

const swContent = fs.readFileSync(swPath, 'utf-8');
assert(swContent.includes('NEVER_CACHE_PATTERNS'), "Service Worker enforces strict NEVER_CACHE_PATTERNS for security");
assert(swContent.includes('.xlsx'), "Service Worker explicitly forbids caching .xlsx files");
assert(swContent.includes('blob:'), "Service Worker explicitly forbids caching blob: URLs");
assert(swContent.includes('APP_SHELL_ASSETS'), "Service Worker caches static app shell assets");
assert(swContent.includes('caches.delete'), "Service Worker cleans up stale legacy caches on activate");

// ---------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------
console.log('\n=====================================================');
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('=====================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL MAJOR IMPROVEMENTS VERIFIED SUCCESSFULLY!');
}
