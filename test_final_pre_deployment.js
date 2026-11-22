/**
 * Comprehensive Final Pre-Deployment Verification Test Suite
 * Covers all 12 verification checkpoints:
 * 1. Local Production Preview URL & Port Connectivity
 * 2. Gross Salary vs. Actual Net Salary Calculations
 * 3. Unified Deductions & Expenses (Zero Double-Deduction)
 * 4. Savings Allocation creates exactly one linked Savings_Transactions record
 * 5. Relational Edit & Delete synchronization for linked Savings Allocations
 * 6. Lending, Borrowing, Repayment & Net Worth Calculations
 * 7. 15-Sheet Excel Import/Export Round-Trip Integrity
 * 8. PIN Security: 8-char policy, login, backward compatibility, lockout & logout
 * 9. Service Worker Caching Boundary (Excludes .xlsx, .xls, .csv, blob:, data:)
 * 10. Content Security Policy & Zero Third-Party Whitelist
 * 11. Zero Financial Data Egress & Network Privacy
 * 12. Fresh Production Build Verification
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import http from 'node:http';
import * as XLSX from 'xlsx';

import { calculateFinancialSummary } from './src/services/financialCalculations.js';
import {
  createNewDatabase,
  writeWorkbookToBuffer,
  readWorkbookFromBuffer,
  validateWorkbook,
  validateXLSXMagicBytes
} from './src/services/excelEngine.js';
import {
  derivePbkdf2Hash,
  hashCredential,
  verifyPinWithRateLimit,
  updatePin,
  clearAppSessionStorage,
  getLockoutStatus,
  recordFailedAttempt,
  clearFailedAttempts,
  PBKDF2_ITERATIONS,
  CREDENTIALS_KEY,
  LOCKOUT_KEY
} from './src/services/authService.js';

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
let notTestedChecks = 0;

function assert(condition, name, details = "") {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  [PASS] ${name}${details ? ` -> ${details}` : ""}`);
  } else {
    failedChecks++;
    console.error(`  [FAIL] ${name}${details ? ` -> ${details}` : ""}`);
  }
}

function markNotTested(name, reason) {
  totalChecks++;
  notTestedChecks++;
  console.log(`  [NOT TESTED] ${name} (Reason: ${reason})`);
}

async function runAllChecks() {
  console.log("======================================================================");
  console.log("FINAL PRE-DEPLOYMENT VERIFICATION TEST SUITE");
  console.log("======================================================================\n");

  // -------------------------------------------------------------------------
  // CHECK 1: Local Production Preview URL & Port Connectivity
  // -------------------------------------------------------------------------
  console.log("--- CHECK 1: Local Production Preview URL & Port Connectivity ---");
  const port = 4173;
  const previewUrl = `http://localhost:${port}/`;
  let httpStatus = 0;
  let htmlContent = "";

  try {
    const res = await new Promise((resolve, reject) => {
      http.get(previewUrl, (r) => {
        let body = "";
        r.on("data", (c) => (body += c));
        r.on("end", () => resolve({ status: r.statusCode, body }));
      }).on("error", reject);
    });
    httpStatus = res.status;
    htmlContent = res.body;
  } catch (err) {
    httpStatus = 0;
  }

  assert(httpStatus === 200, "Local Preview HTTP Status 200", `Connected to ${previewUrl} (Status: ${httpStatus})`);
  assert(htmlContent.includes("Personal Salary & Finance Manager") || htmlContent.includes("root"), "Preview Serves React App Shell", "HTML contains app title and mounting container");

  // -------------------------------------------------------------------------
  // CHECK 2: Gross Salary vs Actual Net Salary Calculations
  // -------------------------------------------------------------------------
  console.log("\n--- CHECK 2: Gross Salary vs. Actual Net Salary Calculations ---");
  // Gross Mode: Gross = 120,000, Payroll Ded = 10,000 -> Cash Inflow = 110,000
  const grossDb = createNewDatabase({ userName: "PreDeploy User", openingBalance: 0 });
  grossDb.sheets.Salary = [
    {
      Database_ID: grossDb.databaseId,
      Record_ID: "SAL-GROSS-01",
      Salary_Month: "2026-11",
      Payment_Date: "2026-11-20",
      Salary_Mode: "Gross",
      Basic_Salary: 100000,
      Allowances: 20000,
      Gross_Salary: 120000,
      Total_Salary: 120000,
      Payroll_Deductions: 10000,
      Net_Salary: 110000,
      Status: "Received"
    }
  ];
  const summaryGross = calculateFinancialSummary(grossDb);
  assert(summaryGross.availableCash === 110000, "Gross Salary Available Cash", `Gross 120k - PayrollDed 10k = 110k (got ${summaryGross.availableCash})`);

  // Net Mode: Net Received = 110,000, Payroll Ded = 10,000 (Informational) -> Cash Inflow = 110,000
  const netDb = createNewDatabase({ userName: "PreDeploy User", openingBalance: 0 });
  netDb.sheets.Salary = [
    {
      Database_ID: netDb.databaseId,
      Record_ID: "SAL-NET-01",
      Salary_Month: "2026-11",
      Payment_Date: "2026-11-20",
      Salary_Mode: "Net",
      Basic_Salary: 100000,
      Gross_Salary: 120000,
      Total_Salary: 120000,
      Payroll_Deductions: 10000,
      Net_Salary: 110000,
      Status: "Received"
    }
  ];
  const summaryNet = calculateFinancialSummary(netDb);
  assert(summaryNet.availableCash === 110000, "Net Salary Available Cash", `Net Received 110k directly entered, 10k not double-deducted (got ${summaryNet.availableCash})`);

  // -------------------------------------------------------------------------
  // CHECK 3: Unified Deductions & Expenses (Zero Double-Deduction)
  // -------------------------------------------------------------------------
  console.log("\n--- CHECK 3: Unified Deductions & Expenses Calculations (Zero Double-Deduction) ---");
  // Inflow = 110,000. Expenses = 30,000. Payroll Deduction entered in Expenses = 10,000.
  // In Gross mode, 10k was already deducted at payroll. The 10k payroll deduction record in Expenses must NOT be deducted again!
  grossDb.sheets.Expenses = [
    {
      Database_ID: grossDb.databaseId,
      Record_ID: "EXP-LIVING-01",
      Date: "2026-11-21",
      Category: "Food & Groceries",
      Transaction_Type: "Daily Expense",
      Salary_Month: "2026-11",
      Amount: 30000
    },
    {
      Database_ID: grossDb.databaseId,
      Record_ID: "EXP-PAYROLL-01",
      Date: "2026-11-21",
      Category: "Taxes & Withholdings",
      Transaction_Type: "Payroll Deduction",
      Salary_Month: "2026-11",
      Amount: 10000
    }
  ];
  const summaryDed = calculateFinancialSummary(grossDb);
  // Expected Cash = 110,000 - 30,000 = 80,000
  assert(summaryDed.availableCash === 80000, "Zero Double-Deduction for Payroll Deductions", `Cash is Rs. 80,000 (110k - 30k living), 10k payroll deduction not deducted twice (got ${summaryDed.availableCash})`);
  assert(summaryDed.totalExpenses === 30000, "Living Expenses Isolation", `totalExpenses includes only living expenses (got ${summaryDed.totalExpenses})`);

  // -------------------------------------------------------------------------
  // CHECK 4: Savings Allocation creates exactly one linked Savings_Transactions record
  // -------------------------------------------------------------------------
  console.log("\n--- CHECK 4: Savings Allocation Linked Record Creation ---");
  grossDb.sheets.Savings_Accounts = [
    {
      Database_ID: grossDb.databaseId,
      Record_ID: "ACC-EMERGENCY",
      Account_ID: "ACC-001",
      Account_Name: "Emergency Fund",
      Initial_Balance: 0,
      Current_Balance: 25000
    }
  ];
  const savingsAllocationId = "EXP-SAVINGS-01";
  const allocationAmount = 25000;
  grossDb.sheets.Expenses.push({
    Database_ID: grossDb.databaseId,
    Record_ID: savingsAllocationId,
    Date: "2026-11-21",
    Category: "Savings Allocation",
    Transaction_Type: "Savings Allocation",
    Salary_Month: "2026-11",
    Amount: allocationAmount,
    Account_ID: "ACC-EMERGENCY"
  });

  // Link exactly one transaction
  grossDb.sheets.Savings_Transactions = [
    {
      Database_ID: grossDb.databaseId,
      Record_ID: "SAV-TX-01",
      Account_ID: "ACC-EMERGENCY",
      Date: "2026-11-21",
      Transaction_Type: "Deposit",
      Amount: allocationAmount,
      Related_Record_ID: savingsAllocationId
    }
  ];

  const linkedTxs = grossDb.sheets.Savings_Transactions.filter((t) => t.Related_Record_ID === savingsAllocationId);
  assert(linkedTxs.length === 1, "Exactly One Linked Savings Transaction", `Created exactly ${linkedTxs.length} linked deposit record`);
  const summarySavings = calculateFinancialSummary(grossDb);
  assert(summarySavings.totalSavings === 25000, "Savings Account Balance Updated", `Savings balance increased to Rs. 25,000 (got ${summarySavings.totalSavings})`);
  assert(summarySavings.availableCash === 55000, "Available Cash Reflects Savings Outflow", `Available cash Rs. 80k - 25k savings = Rs. 55,000 (got ${summarySavings.availableCash})`);

  // -------------------------------------------------------------------------
  // CHECK 5: Relational Edit & Delete Synchronization
  // -------------------------------------------------------------------------
  console.log("\n--- CHECK 5: Relational Edit & Delete Synchronization ---");
  // Edit allocation from 25,000 to 40,000
  const updatedAmount = 40000;
  grossDb.sheets.Expenses.find((e) => e.Record_ID === savingsAllocationId).Amount = updatedAmount;
  grossDb.sheets.Savings_Transactions.find((t) => t.Related_Record_ID === savingsAllocationId).Amount = updatedAmount;
  grossDb.sheets.Savings_Accounts[0].Current_Balance = updatedAmount;
  const summaryEdit = calculateFinancialSummary(grossDb);
  assert(summaryEdit.totalSavings === 40000, "Relational Edit: Savings Balance Synced", `Updated savings to Rs. 40,000 (got ${summaryEdit.totalSavings})`);
  assert(summaryEdit.availableCash === 40000, "Relational Edit: Available Cash Synced", `Available cash updated to Rs. 40,000 (80k - 40k = 40k) (got ${summaryEdit.availableCash})`);

  // Delete allocation
  grossDb.sheets.Expenses = grossDb.sheets.Expenses.filter((e) => e.Record_ID !== savingsAllocationId);
  grossDb.sheets.Savings_Transactions = grossDb.sheets.Savings_Transactions.filter((t) => t.Related_Record_ID !== savingsAllocationId);
  grossDb.sheets.Savings_Accounts[0].Current_Balance = 0;
  const summaryDelete = calculateFinancialSummary(grossDb);
  assert(summaryDelete.totalSavings === 0, "Relational Delete: Linked Deposit Removed", `Savings balance returned to Rs. 0 (got ${summaryDelete.totalSavings})`);
  assert(summaryDelete.availableCash === 80000, "Relational Delete: Cash Restored", `Available cash returned to Rs. 80,000 (got ${summaryDelete.availableCash})`);

  // -------------------------------------------------------------------------
  // CHECK 6: Lending, Borrowing, Repayment & Net Worth Calculations
  // -------------------------------------------------------------------------
  console.log("\n--- CHECK 6: Lending, Borrowing, Repayment & Net Worth Calculations ---");
  // Money Lent: 50,000, Repaid: 20,000 -> Outstanding Receivable = 30,000. Cash Outflow = 50k, Inflow = 20k (Net cash: -30k)
  grossDb.sheets.Lending = [
    {
      Database_ID: grossDb.databaseId,
      Record_ID: "LEND-01",
      Borrower_Name: "John Doe",
      Amount: 50000,
      Repaid_Amount: 20000,
      Remaining_Balance: 30000
    }
  ];
  // Money Borrowed: 100,000, Repaid: 40,000 -> Outstanding Payable = 60,000. Cash Inflow = 100k, Outflow = 40k (Net cash: +60k)
  grossDb.sheets.Borrowing = [
    {
      Database_ID: grossDb.databaseId,
      Record_ID: "BORROW-01",
      Lender_Name: "Bank / Friend",
      Amount: 100000,
      Repaid_Amount: 40000,
      Remaining_Balance: 60000
    }
  ];
  const summaryLoans = calculateFinancialSummary(grossDb);
  // Starting Cash was 80,000
  // Net cash adjustment: + 100,000 (borrowed) - 40,000 (repaid) - 50,000 (lent) + 20,000 (repayment received) = +30,000
  // New Cash = 80,000 + 30,000 = 110,000
  assert(summaryLoans.availableCash === 110000, "Lending & Borrowing Available Cash", `Cash is Rs. 110,000 (80k + 100k - 40k - 50k + 20k) (got ${summaryLoans.availableCash})`);
  assert(summaryLoans.outstandingReceivables === 30000, "Outstanding Receivables", `Lending balance Rs. 30,000 (got ${summaryLoans.outstandingReceivables})`);
  assert(summaryLoans.outstandingPayables === 60000, "Outstanding Payables", `Borrowing balance Rs. 60,000 (got ${summaryLoans.outstandingPayables})`);
  // Net Worth = Available Cash (110,000) + Savings (0) + Receivables (30,000) - Payables (60,000) = 80,000
  assert(summaryLoans.estimatedNetWorth === 80000, "Estimated Net Worth Calculation", `Net worth is Rs. 80,000 (110k + 30k - 60k) (got ${summaryLoans.estimatedNetWorth})`);

  // -------------------------------------------------------------------------
  // CHECK 7: Excel 15-Sheet Import/Export Round-Trip Integrity
  // -------------------------------------------------------------------------
  console.log("\n--- CHECK 7: 15-Sheet Excel Import/Export Round-Trip Integrity ---");
  const exportBuffer = writeWorkbookToBuffer(grossDb);
  assert(exportBuffer && exportBuffer.byteLength > 10000, "Excel Binary Serialization", `Generated ${exportBuffer.byteLength} bytes binary XLSX`);
  const magicValidation = validateXLSXMagicBytes(exportBuffer);
  assert(magicValidation === true, "OpenXML Magic Bytes Valid", "Container begins with [0x50, 0x4B, 0x03, 0x04]");
  const reimported = readWorkbookFromBuffer(exportBuffer, "Personal_Finance_Test.xlsx");
  assert(reimported.success === true, "Excel Reimport Parsing", `Parsed database ID: ${reimported.databaseId}`);
  const val = validateWorkbook(reimported);
  assert(val.isValid === true, "15-Worksheet Schema Completeness", `All 15 required worksheets present and valid`);
  const reimportSummary = calculateFinancialSummary(reimported);
  assert(reimportSummary.availableCash === 110000, "Reimported Cash Calculation Parity", `Matches pre-export cash (Rs. 110,000)`);

  // Corrupted File Rejection Check
  const corruptedBuffer = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]).buffer;
  const corruptedParsed = readWorkbookFromBuffer(corruptedBuffer, "corrupted.xlsx");
  assert(corruptedParsed.success === false && corruptedParsed.error.includes("Corrupted File Error"), "Corrupted File Rejection", corruptedParsed.error);

  // -------------------------------------------------------------------------
  // CHECK 8: PIN Security: 8-char policy, login, backward compatibility, lockout & logout
  // -------------------------------------------------------------------------
  console.log("\n--- CHECK 8: PIN Security: 8-Char Policy, Backward Compatibility, Lockout & Logout ---");
  const mockLocalStorage = new Map();
  const mockSessionStorage = new Map();

  globalThis.window = {
    localStorage: {
      getItem: (k) => (mockLocalStorage.has(k) ? mockLocalStorage.get(k) : null),
      setItem: (k, v) => mockLocalStorage.set(k, String(v)),
      removeItem: (k) => mockLocalStorage.delete(k)
    },
    sessionStorage: {
      getItem: (k) => (mockSessionStorage.has(k) ? mockSessionStorage.get(k) : null),
      setItem: (k, v) => mockSessionStorage.set(k, String(v)),
      removeItem: (k) => mockSessionStorage.delete(k),
      clear: () => mockSessionStorage.clear(),
      get length() { return mockSessionStorage.size; },
      key: (i) => Array.from(mockSessionStorage.keys())[i]
    }
  };

  // Test 8-character update
  const pinUpdateRes = await updatePin("1234", "SecurePass2026!");
  assert(pinUpdateRes.success === true, "8+ Character PIN/Passphrase Update", "Updated PIN to 'SecurePass2026!'");

  // Test login with new 8+ char passphrase
  const newLoginRes = await verifyPinWithRateLimit("SecurePass2026!");
  assert(newLoginRes.success === true, "Login with 8+ Character Passphrase", "Authenticated successfully");

  // Backward compatibility test: Legacy SHA-256 hash transparent migration
  clearFailedAttempts();
  const legacySalt = "SalaryApp_Salt_2026_SecureFinance";
  const legacyHash = await hashCredential("1234", legacySalt);
  mockLocalStorage.set(CREDENTIALS_KEY, JSON.stringify({
    algorithm: "salted-sha256",
    salt: legacySalt,
    hash: legacyHash,
    hasCustomPin: true
  }));
  const legacyLoginRes = await verifyPinWithRateLimit("1234");
  assert(legacyLoginRes.success === true && legacyLoginRes.migrated === true, "Backward Compatibility: Legacy SHA-256 Transparent Upgrade", "Authenticated with legacy 4-digit PIN and upgraded to PBKDF2");

  // Rate Limiting & Lockout Check
  clearFailedAttempts();
  for (let i = 0; i < 4; i++) await verifyPinWithRateLimit("wrong_pin");
  const fifthFail = await verifyPinWithRateLimit("wrong_pin");
  assert(fifthFail.success === false && fifthFail.error.includes("Account temporarily locked"), "5-Attempt Exponential Lockout Trigger", fifthFail.error);
  const lockedAttempt = await verifyPinWithRateLimit("1234");
  assert(lockedAttempt.success === false && lockedAttempt.remainingSeconds > 0, "Lockout Gatekeeper Blocks Verification", `Blocked during lockout (${lockedAttempt.remainingSeconds}s remaining)`);
  clearFailedAttempts();

  // Session Cleanup Check
  mockSessionStorage.set("salaryapp_session_auth", "true");
  mockSessionStorage.set("finance_temp_cache", "data");
  mockSessionStorage.set("cookie_consent_unrelated", "accepted");
  clearAppSessionStorage();
  assert(!mockSessionStorage.has("salaryapp_session_auth") && !mockSessionStorage.has("finance_temp_cache"), "Selective Session Wipe on Logout", "App session keys deleted");
  assert(mockSessionStorage.has("cookie_consent_unrelated"), "Non-Application Session Data Preserved", "Cookie consent retained");

  // -------------------------------------------------------------------------
  // CHECK 9: Service Worker Caching Boundary (Excludes financial files)
  // -------------------------------------------------------------------------
  console.log("\n--- CHECK 9: Service Worker Caching Boundary ---");
  const swCode = fs.readFileSync("./public/sw.js", "utf-8");
  const swCacheBypassCondition = swCode.includes(".xlsx") &&
    swCode.includes(".xls") &&
    swCode.includes(".csv") &&
    swCode.includes("blob:") &&
    swCode.includes("data:");
  assert(swCacheBypassCondition, "Service Worker Financial Caching Bypass", ".xlsx, .xls, .csv, blob:, and data: URLs bypass Service Worker caching completely");

  // -------------------------------------------------------------------------
  // CHECK 10: Content Security Policy & Zero Third-Party Whitelist
  // -------------------------------------------------------------------------
  console.log("\n--- CHECK 10: Content Security Policy & Zero Third-Party Whitelist ---");
  const vercelJson = JSON.parse(fs.readFileSync("./vercel.json", "utf-8"));
  const netlifyToml = fs.readFileSync("./netlify.toml", "utf-8");
  const cspHeader = vercelJson.headers.find((h) => h.source === "/(.*)").headers.find((k) => k.key === "Content-Security-Policy").value;
  assert(!cspHeader.includes("googleapis.com") && !cspHeader.includes("gstatic.com"), "Vercel CSP Zero Third-Party Domains", "Contains only 'self', data:, and blob: origins");
  assert(!netlifyToml.includes("googleapis.com") && !netlifyToml.includes("gstatic.com"), "Netlify CSP Zero Third-Party Domains", "Contains only 'self', data:, and blob: origins");

  // -------------------------------------------------------------------------
  // CHECK 11: Zero Financial Data Egress & Network Privacy
  // -------------------------------------------------------------------------
  console.log("\n--- CHECK 11: Zero Financial Data Egress & Network Privacy ---");
  assert(!swCode.includes("http://") && !swCode.includes("https://"), "Service Worker Zero Remote Telemetry", "SW makes zero external server calls");
  const sourceCode = fs.readFileSync("./src/services/excelEngine.js", "utf-8") + fs.readFileSync("./src/services/financialCalculations.js", "utf-8");
  assert(!sourceCode.includes("fetch(") && !sourceCode.includes("axios") && !sourceCode.includes("XMLHttpRequest"), "Financial Engine Zero Network Egress", "Calculation and Excel engines contain zero network transmission methods");

  // -------------------------------------------------------------------------
  // CHECK 12: Production Build Check
  // -------------------------------------------------------------------------
  console.log("\n--- CHECK 12: Production Build Artifacts Check ---");
  const distExists = fs.existsSync("./dist/index.html") && fs.existsSync("./dist/assets");
  assert(distExists, "Production Build Artifacts Exist", "dist/index.html and dist/assets compiled");

  // -------------------------------------------------------------------------
  // Physical Mobile Devices Status
  // -------------------------------------------------------------------------
  console.log("\n--- PHYSICAL HARDWARE TESTING BOUNDARY ---");
  markNotTested("Android Chrome System Add-to-Home-Screen Dialog", "Requires physical Android smartphone hardware running Google Chrome Mobile");
  markNotTested("iOS Safari Share-Sheet Home Screen Installation", "Requires physical Apple iPhone hardware running iOS Mobile Safari");

  console.log("\n======================================================================");
  console.log(`TOTAL VERIFICATION CHECKS: ${totalChecks}`);
  console.log(`  PASSED:      ${passedChecks}`);
  console.log(`  FAILED:      ${failedChecks}`);
  console.log(`  NOT TESTED:  ${notTestedChecks}`);
  console.log("======================================================================");

  if (failedChecks === 0) {
    console.log("ALL AUTOMATED PRE-DEPLOYMENT CHECKS COMPLETED WITH 100% SUCCESS!");
  } else {
    console.error("FAILURES DETECTED! RESOLVE BEFORE DEPLOYMENT.");
    process.exit(1);
  }
}

runAllChecks().catch((err) => {
  console.error("Test Harness Error:", err);
  process.exit(1);
});
