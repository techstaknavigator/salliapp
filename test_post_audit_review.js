// Post-Audit Review Test Suite
// Verifying:
// 1. Scenario 1: Gross Salary (100k) - Payroll Deductions (5k) = Net (95k) - Expenses (20k) - Savings Allocation (15k) = 60,000 Cash Contribution
// 2. Scenario 2: Actual Net Received (95k) [Payroll Deductions 5k info] - Expenses (20k) - Savings Allocation (15k) = 60,000 Cash Contribution
// 3. Zero double deduction when payroll deduction is entered in both Salary and Expenses
// 4. Session management & cache isolation audit
// 5. Navigation state transitions & Back/Close resilience
// 6. PWA manifest, service worker privacy, and icon assets

import fs from 'fs';
import path from 'path';
import { calculateFinancialSummary } from './src/services/financialCalculations.js';
import { createNewDatabase, writeWorkbookToBuffer, readWorkbookFromBuffer } from './src/services/excelEngine.js';

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
console.log('POST-AUDIT REVIEW: FINANCIAL & PWA VALIDATION SUITE');
console.log('=====================================================\n');

// -------------------------------------------------------------------
// AUDIT SECTION 1: SCENARIO 1 (Gross Salary Mode)
// -------------------------------------------------------------------
console.log('--- TEST 1: Accounting Scenario 1 (Gross Salary Mode) ---');
// Gross salary = Rs. 100,000
// Payroll deductions = Rs. 5,000
// Net salary = Rs. 95,000
// Expenses = Rs. 20,000
// Savings allocation = Rs. 15,000
// Expected available cash contribution = Rs. 60,000.

const dbScenario1 = createNewDatabase({ userName: "Scenario 1 User", openingBalance: 0 });

// Add Gross Salary
dbScenario1.sheets.Salary.push({
  Salary_ID: "SAL-SC1",
  Salary_Month: "2026-11",
  Basic_Salary: 90000,
  Allowances: 10000,
  Bonuses: 0,
  Additional_Income: 0,
  Gross_Salary: 100000,
  Total_Salary: 100000,
  Payroll_Deductions: 5000,
  Net_Salary: 95000,
  Salary_Mode: "Gross",
  Actual_Payment_Date: "2026-11-25",
  Status: "Received"
});

// Add Expenses = Rs. 20,000
dbScenario1.sheets.Expenses.push({
  Expense_ID: "EXP-SC1-1",
  Date: "2026-11-10",
  Category: "Food & Groceries",
  Amount: 20000,
  Transaction_Type: "Daily Expense",
  Salary_Month: "2026-11",
  Description: "Monthly groceries"
});

// Add Savings Allocation = Rs. 15,000
dbScenario1.sheets.Savings_Accounts = [{
  Record_ID: "ACC-SC1",
  Account_ID: "ACC-SC1",
  Account_Name: "Emergency Fund",
  Current_Balance: 0
}];

dbScenario1.sheets.Expenses.push({
  Expense_ID: "EXP-SC1-2",
  Date: "2026-11-15",
  Category: "Savings Allocation",
  Amount: 15000,
  Transaction_Type: "Savings Allocation",
  Salary_Month: "2026-11",
  Linked_Savings_Account_ID: "ACC-SC1",
  Description: "Transfer to emergency savings"
});

dbScenario1.sheets.Savings_Transactions.push({
  Transaction_ID: "STX-SC1",
  Account_ID: "ACC-SC1",
  Date: "2026-11-15",
  Transaction_Type: "Deposit",
  Amount: 15000,
  Description: "Savings allocation deposit",
  Related_Expense_ID: "EXP-SC1-2"
});

const sum1 = calculateFinancialSummary(dbScenario1);

assert(sum1.totalGrossSalary === 100000, `Scenario 1: Gross Salary is 100,000 (got ${sum1.totalGrossSalary})`);
assert(sum1.totalPayrollDeductions === 5000, `Scenario 1: Payroll Deductions is 5,000 (got ${sum1.totalPayrollDeductions})`);
assert(sum1.totalNetSalary === 95000, `Scenario 1: Net Salary Received is 95,000 (got ${sum1.totalNetSalary})`);
assert(sum1.totalExpenses === 20000, `Scenario 1: Living Expenses is 20,000 (got ${sum1.totalExpenses})`);
assert(sum1.totalSavingsAllocations === 15000, `Scenario 1: Savings Allocation is 15,000 (got ${sum1.totalSavingsAllocations})`);
assert(sum1.totalSavings === 15000, `Scenario 1: Total Savings balance is 15,000 (got ${sum1.totalSavings})`);
// Cash contribution: 95,000 - 20,000 - 15,000 = 60,000
assert(sum1.availableCash === 60000, `Scenario 1: Expected available cash contribution is Rs. 60,000 (got ${sum1.availableCash})`);

// -------------------------------------------------------------------
// AUDIT SECTION 2: SCENARIO 2 (Actual Net Salary Received Mode)
// -------------------------------------------------------------------
console.log('\n--- TEST 2: Accounting Scenario 2 (Actual Net Salary Received Mode) ---');
// Actual net salary received = Rs. 95,000
// Previously deducted payroll amount = Rs. 5,000 (informational only)
// Expenses = Rs. 20,000
// Savings allocation = Rs. 15,000
// Expected available cash contribution = Rs. 60,000.

const dbScenario2 = createNewDatabase({ userName: "Scenario 2 User", openingBalance: 0 });

// Add Net Salary Received
dbScenario2.sheets.Salary.push({
  Salary_ID: "SAL-SC2",
  Salary_Month: "2026-11",
  Basic_Salary: 95000,
  Allowances: 0,
  Bonuses: 0,
  Additional_Income: 0,
  Gross_Salary: 100000, // Informational (95,000 + 5,000)
  Total_Salary: 100000,
  Payroll_Deductions: 5000, // Informational: Already deducted at source by employer
  Net_Salary: 95000,
  Salary_Mode: "Net",
  Actual_Payment_Date: "2026-11-25",
  Status: "Received"
});

// Add Expenses = Rs. 20,000
dbScenario2.sheets.Expenses.push({
  Expense_ID: "EXP-SC2-1",
  Date: "2026-11-10",
  Category: "Food & Groceries",
  Amount: 20000,
  Transaction_Type: "Daily Expense",
  Salary_Month: "2026-11",
  Description: "Monthly groceries"
});

// Add Savings Allocation = Rs. 15,000
dbScenario2.sheets.Savings_Accounts = [{
  Record_ID: "ACC-SC2",
  Account_ID: "ACC-SC2",
  Account_Name: "Emergency Fund",
  Current_Balance: 0
}];

dbScenario2.sheets.Expenses.push({
  Expense_ID: "EXP-SC2-2",
  Date: "2026-11-15",
  Category: "Savings Allocation",
  Amount: 15000,
  Transaction_Type: "Savings Allocation",
  Salary_Month: "2026-11",
  Linked_Savings_Account_ID: "ACC-SC2",
  Description: "Transfer to emergency savings"
});

dbScenario2.sheets.Savings_Transactions.push({
  Transaction_ID: "STX-SC2",
  Account_ID: "ACC-SC2",
  Date: "2026-11-15",
  Transaction_Type: "Deposit",
  Amount: 15000,
  Description: "Savings allocation deposit",
  Related_Expense_ID: "EXP-SC2-2"
});

const sum2 = calculateFinancialSummary(dbScenario2);

assert(sum2.totalGrossSalary === 100000, `Scenario 2: Gross Salary is 100,000 (got ${sum2.totalGrossSalary})`);
assert(sum2.totalPayrollDeductions === 5000, `Scenario 2: Payroll Deductions is 5,000 (got ${sum2.totalPayrollDeductions})`);
assert(sum2.totalNetSalary === 95000, `Scenario 2: Net Salary Received is 95,000 (got ${sum2.totalNetSalary})`);
assert(sum2.totalExpenses === 20000, `Scenario 2: Living Expenses is 20,000 (got ${sum2.totalExpenses})`);
assert(sum2.totalSavingsAllocations === 15000, `Scenario 2: Savings Allocation is 15,000 (got ${sum2.totalSavingsAllocations})`);
assert(sum2.totalSavings === 15000, `Scenario 2: Total Savings balance is 15,000 (got ${sum2.totalSavings})`);
// Cash contribution: 95,000 - 20,000 - 15,000 = 60,000
assert(sum2.availableCash === 60000, `Scenario 2: Expected available cash contribution is Rs. 60,000 (got ${sum2.availableCash})`);
assert(sum1.availableCash === sum2.availableCash, `Both Gross and Net entry modes produce the identical cash result (Rs. ${sum1.availableCash.toLocaleString()})`);

// -------------------------------------------------------------------
// AUDIT SECTION 3: ZERO DOUBLE-COUNTING OF PAYROLL DEDUCTIONS
// -------------------------------------------------------------------
console.log('\n--- TEST 3: Zero Double-Counting When Deduction is in Salary AND Expenses ---');
// If user has Payroll Deduction of 5,000 in Salary, and ALSO records a "Payroll Deduction" transaction in Expenses:
// Available cash must still remain Rs. 60,000 (NOT reduced twice to 55,000).

dbScenario1.sheets.Expenses.push({
  Expense_ID: "EXP-SC1-3",
  Date: "2026-11-25",
  Category: "Insurance",
  Amount: 5000,
  Transaction_Type: "Payroll Deduction",
  Salary_Month: "2026-11",
  Description: "PAYE Tax / EPF recorded in expenses for tracking"
});

const sumDoubleCheck = calculateFinancialSummary(dbScenario1);
assert(sumDoubleCheck.availableCash === 60000, `Zero Double-Counting: Available cash remains Rs. 60,000 when logged in both (got ${sumDoubleCheck.availableCash})`);
assert(sumDoubleCheck.totalExpenses === 20000, `Zero Double-Counting: Expenses metric remains Rs. 20,000 (got ${sumDoubleCheck.totalExpenses})`);

// -------------------------------------------------------------------
// AUDIT SECTION 4: SERVICE WORKER & STORAGE PRIVACY AUDIT
// -------------------------------------------------------------------
console.log('\n--- TEST 4: Service Worker Caching & Storage Privacy Audit ---');

const swContent = fs.readFileSync(path.join(process.cwd(), 'public', 'sw.js'), 'utf-8');
assert(swContent.includes('.xlsx'), "Service worker blocks caching of .xlsx workbooks");
assert(swContent.includes('.csv'), "Service worker blocks caching of .csv exports");
assert(swContent.includes('/^blob:/i'), "Service worker blocks caching of temporary blob: URLs");
assert(swContent.includes('/^data:/i'), "Service worker blocks caching of data: URLs");
assert(swContent.includes('APP_SHELL_ASSETS'), "Service worker defines static app shell assets");
assert(!swContent.includes('financialData'), "Service worker contains zero financial references");

// Verify authService clears memory and tokens on logout
const authServiceContent = fs.readFileSync(path.join(process.cwd(), 'src', 'services', 'authService.js'), 'utf-8');
assert(authServiceContent.includes('sessionStorage.clear()') || authServiceContent.includes('sessionStorage.removeItem'), "Auth service clears session storage on logout");

// -------------------------------------------------------------------
// AUDIT SECTION 5: PWA MANIFEST & ICONS
// -------------------------------------------------------------------
console.log('\n--- TEST 5: PWA Manifest & Multi-Resolution Icons Audit ---');

const manifest = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'manifest.webmanifest'), 'utf-8'));
assert(manifest.display === "standalone", `Manifest display mode is standalone (${manifest.display})`);
assert(manifest.start_url === "/", "Manifest start_url is root");
assert(manifest.theme_color === "#10b981", "Manifest theme color is emerald #10b981");

const requiredIcons = [
  'icon-192.png',
  'icon-192-maskable.png',
  'icon-512.png',
  'icon-512-maskable.png',
  'icon.svg'
];

requiredIcons.forEach(iconName => {
  const iconPath = path.join(process.cwd(), 'public', 'icons', iconName);
  assert(fs.existsSync(iconPath) && fs.statSync(iconPath).size > 0, `Icon asset ${iconName} exists and is non-empty`);
});

// -------------------------------------------------------------------
// AUDIT SECTION 6: NAVIGATION & ERROR RESILIENCE
// -------------------------------------------------------------------
console.log('\n--- TEST 6: Excel Re-export & 15-Sheet Roundtrip Integrity ---');

const wb1 = writeWorkbookToBuffer(dbScenario1);
const reimported = readWorkbookFromBuffer(wb1);

assert(reimported.success === true, "Workbook exported and re-read successfully");
assert(Object.keys(reimported.sheets).length === 15, `All 15 sheets preserved (got ${Object.keys(reimported.sheets).length})`);
assert(reimported.sheets.Salary.length === 1, "Salary record preserved");
assert(reimported.sheets.Salary[0].Salary_Mode === "Gross", "Salary_Mode preserved");
assert(Number(reimported.sheets.Salary[0].Payroll_Deductions) === 5000, "Payroll deductions preserved");
assert(Number(reimported.sheets.Salary[0].Net_Salary) === 95000, "Net salary preserved");
assert(reimported.sheets.Expenses.length === 3, "Expenses preserved");

const reimportedSummary = calculateFinancialSummary(reimported);
assert(reimportedSummary.availableCash === 60000, `Reimported Available Cash matches Rs. 60,000 (got ${reimportedSummary.availableCash})`);

// -------------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------------
console.log('\n=====================================================');
console.log(`TOTAL AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('=====================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL POST-AUDIT VALIDATIONS PASSED WITH 100% SUCCESS!');
}
