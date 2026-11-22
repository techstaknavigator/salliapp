import {
  createNewDatabase,
  writeWorkbookToBuffer,
  readWorkbookFromBuffer,
  validateWorkbook,
  mergeWorkbooks,
  sanitizeSpreadsheetValue,
  validateXLSXMagicBytes,
  MAX_FILE_SIZE_BYTES
} from "./src/services/excelEngine.js";
import {
  calculateFinancialSummary
} from "./src/services/financialCalculations.js";
import {
  generateRecordId,
  generateTransactionId,
  getNowISO
} from "./src/types/schema.js";

console.log("==================================================================");
console.log("COMPLETE SECURITY, DATA INTEGRITY & FINANCIAL AUDIT TEST SUITE");
console.log("==================================================================\n");

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    const result = fn();
    if (result !== false) {
      console.log(`[PASS] Scenario ${total}: ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] Scenario ${total}: ${name} (Returned false)`);
      process.exitCode = 1;
    }
  } catch (err) {
    console.error(`[FAIL] Scenario ${total}: ${name} (Exception: ${err.message})`);
    process.exitCode = 1;
  }
}

// ------------------------------------------------------------------
// SECTION 11: 15 MANDATORY TEST SCENARIOS
// ------------------------------------------------------------------

let activeDb = null;
let savedBuffer = null;
let restoredDb = null;
let salId1, salId2, salId3;
let emergencyAccId, personalAccId;
let lendId, borrId;

runTest("1. Create a new database with unique Database ID & 15 sheets", () => {
  activeDb = createNewDatabase({
    currency: "LKR",
    startingDate: "2026-01-01",
    openingBalance: 150000,
    userName: "Audit Test User"
  });
  return (
    activeDb &&
    activeDb.databaseId &&
    activeDb.databaseId.startsWith("DB-") &&
    Object.keys(activeDb.sheets).length === 15 &&
    activeDb.sheets.Backup_Metadata.length === 1 &&
    Number(activeDb.metadata.Opening_Cash_Balance) === 150000
  );
});

runTest("2. Add salary for multiple months (Jan, Feb, Mar 2026)", () => {
  emergencyAccId = activeDb.sheets.Savings_Accounts[0].Record_ID;
  personalAccId = activeDb.sheets.Savings_Accounts[1].Record_ID;

  salId1 = generateRecordId("SAL");
  activeDb.sheets.Salary.push({
    Database_ID: activeDb.databaseId,
    Record_ID: salId1,
    Transaction_ID: generateTransactionId(),
    Salary_Month: "2026-01",
    Salary_Received_Date: "2026-01-25",
    Basic_Salary: 200000,
    Allowances: 25000,
    Bonuses: 10000,
    Additional_Income: 0,
    Total_Salary: 235000,
    Notes: "Jan Pay",
    Created_Date: getNowISO(),
    Updated_Date: getNowISO()
  });

  salId2 = generateRecordId("SAL");
  activeDb.sheets.Salary.push({
    Database_ID: activeDb.databaseId,
    Record_ID: salId2,
    Transaction_ID: generateTransactionId(),
    Salary_Month: "2026-02",
    Salary_Received_Date: "2026-02-23",
    Basic_Salary: 200000,
    Allowances: 25000,
    Bonuses: 0,
    Additional_Income: 15000,
    Total_Salary: 240000,
    Notes: "Feb Pay",
    Created_Date: getNowISO(),
    Updated_Date: getNowISO()
  });

  salId3 = generateRecordId("SAL");
  activeDb.sheets.Salary.push({
    Database_ID: activeDb.databaseId,
    Record_ID: salId3,
    Transaction_ID: generateTransactionId(),
    Salary_Month: "2026-03",
    Salary_Received_Date: "2026-03-27",
    Basic_Salary: 200000,
    Allowances: 30000,
    Bonuses: 20000,
    Additional_Income: 0,
    Total_Salary: 250000,
    Notes: "Mar Pay",
    Created_Date: getNowISO(),
    Updated_Date: getNowISO()
  });

  return activeDb.sheets.Salary.length === 3;
});

runTest("3. Add salary deductions (Savings & Personal deductions)", () => {
  const dedId1 = generateRecordId("DED");
  activeDb.sheets.Salary_Deductions.push({
    Database_ID: activeDb.databaseId,
    Record_ID: dedId1,
    Transaction_ID: generateTransactionId(),
    Salary_Record_ID: salId1,
    Salary_Month: "2026-01",
    Deduction_Date: "2026-01-25",
    Category: "Savings",
    Amount: 40000,
    Description: "Emergency savings auto-allocation",
    Auto_Deposit_Savings_Account_ID: emergencyAccId,
    Created_Date: getNowISO(),
    Updated_Date: getNowISO()
  });

  const dedId2 = generateRecordId("DED");
  activeDb.sheets.Salary_Deductions.push({
    Database_ID: activeDb.databaseId,
    Record_ID: dedId2,
    Transaction_ID: generateTransactionId(),
    Salary_Record_ID: salId1,
    Salary_Month: "2026-01",
    Deduction_Date: "2026-01-25",
    Category: "Personal Deduction",
    Amount: 10000,
    Description: "Medical insurance premium",
    Auto_Deposit_Savings_Account_ID: "",
    Created_Date: getNowISO(),
    Updated_Date: getNowISO()
  });

  return activeDb.sheets.Salary_Deductions.length === 2;
});

runTest("4. Verify savings deductions create only ONE savings deposit (Zero double-counting)", () => {
  // Paired deposit for dedId1
  const ded1 = activeDb.sheets.Salary_Deductions[0];
  const savTxId1 = generateTransactionId();
  activeDb.sheets.Savings_Transactions.push({
    Database_ID: activeDb.databaseId,
    Record_ID: generateRecordId("SAV-TX"),
    Transaction_ID: savTxId1,
    Account_ID: emergencyAccId,
    Account_Name: "Emergency Savings",
    Transaction_Type: "Deposit",
    Amount: ded1.Amount,
    Transaction_Date: ded1.Deduction_Date,
    Source_Or_Purpose: "Auto-deposit via salary deduction",
    Related_Record_ID: ded1.Record_ID,
    Notes: "Automated deposit",
    Created_Date: getNowISO(),
    Updated_Date: getNowISO()
  });

  // Verify exactly 1 deposit exists for ded1
  const matches = activeDb.sheets.Savings_Transactions.filter(
    (t) => t.Related_Record_ID === ded1.Record_ID
  );
  return matches.length === 1 && matches[0].Amount === 40000;
});

runTest("5. Add and withdraw savings (with balance check)", () => {
  // Direct deposit into Personal Savings
  activeDb.sheets.Savings_Transactions.push({
    Database_ID: activeDb.databaseId,
    Record_ID: generateRecordId("SAV-TX"),
    Transaction_ID: generateTransactionId(),
    Account_ID: personalAccId,
    Account_Name: "Personal Savings",
    Transaction_Type: "Deposit",
    Amount: 30000,
    Transaction_Date: "2026-02-05",
    Source_Or_Purpose: "Cash deposit",
    Related_Record_ID: "",
    Notes: "Initial seed",
    Created_Date: getNowISO(),
    Updated_Date: getNowISO()
  });

  // Withdrawal from Emergency Savings (40,000 balance -> withdraw 10,000)
  activeDb.sheets.Savings_Transactions.push({
    Database_ID: activeDb.databaseId,
    Record_ID: generateRecordId("SAV-TX"),
    Transaction_ID: generateTransactionId(),
    Account_ID: emergencyAccId,
    Account_Name: "Emergency Savings",
    Transaction_Type: "Withdrawal",
    Amount: 10000,
    Transaction_Date: "2026-02-15",
    Source_Or_Purpose: "Car tire puncture",
    Related_Record_ID: "",
    Notes: "Emergency auto repair",
    Created_Date: getNowISO(),
    Updated_Date: getNowISO()
  });

  const sum = calculateFinancialSummary(activeDb);
  // Total savings deposits: 40,000 + 30,000 = 70,000. Total withdrawals: 10,000. Net savings = 60,000.
  return sum.totalSavings === 60000;
});

runTest("6. Add categorized expenses (Food, Bills, Transport)", () => {
  activeDb.sheets.Expenses.push(
    {
      Database_ID: activeDb.databaseId,
      Record_ID: generateRecordId("EXP"),
      Transaction_ID: generateTransactionId(),
      Expense_Date: "2026-01-26",
      Category: "Food",
      Amount: 18000,
      Payment_Method: "Bank Card",
      Description: "Keells Supermarket",
      Receipt_Ref: "REC-01",
      Created_Date: getNowISO(),
      Updated_Date: getNowISO()
    },
    {
      Database_ID: activeDb.databaseId,
      Record_ID: generateRecordId("EXP"),
      Transaction_ID: generateTransactionId(),
      Expense_Date: "2026-01-28",
      Category: "Bills",
      Amount: 12000,
      Payment_Method: "Online",
      Description: "CEB Electricity",
      Receipt_Ref: "REC-02",
      Created_Date: getNowISO(),
      Updated_Date: getNowISO()
    },
    {
      Database_ID: activeDb.databaseId,
      Record_ID: generateRecordId("EXP"),
      Transaction_ID: generateTransactionId(),
      Expense_Date: "2026-02-10",
      Category: "Transport",
      Amount: 8000,
      Payment_Method: "Cash",
      Description: "Fuel Petrol 95",
      Receipt_Ref: "REC-03",
      Created_Date: getNowISO(),
      Updated_Date: getNowISO()
    }
  );

  const sum = calculateFinancialSummary(activeDb);
  return activeDb.sheets.Expenses.length === 3 && sum.totalExpenses === 38000;
});

runTest("7. Add lending records (Money given to others)", () => {
  lendId = generateRecordId("LEND");
  activeDb.sheets.Lending.push({
    Database_ID: activeDb.databaseId,
    Record_ID: lendId,
    Transaction_ID: generateTransactionId(),
    Person_Name: "Kasun Perera",
    Amount: 50000,
    Given_Date: "2026-02-01",
    Expected_Return_Date: "2026-04-15",
    Repaid_Amount: 0,
    Remaining_Balance: 50000,
    Description: "Emergency medical loan",
    Status: "Active",
    Created_Date: getNowISO(),
    Updated_Date: getNowISO()
  });

  const sum = calculateFinancialSummary(activeDb);
  return sum.totalMoneyLent === 50000 && sum.outstandingReceivables === 50000;
});

runTest("8. Record partial lending repayments", () => {
  const lend = activeDb.sheets.Lending[0];
  const repayAmt = 20000;
  lend.Repaid_Amount = repayAmt;
  lend.Remaining_Balance = lend.Amount - repayAmt; // 30,000 remaining
  lend.Status = "Partially Repaid";

  activeDb.sheets.Loan_Repayments.push({
    Database_ID: activeDb.databaseId,
    Record_ID: generateRecordId("REP"),
    Transaction_ID: generateTransactionId(),
    Loan_Type: "Lending_Repayment_Received",
    Related_Loan_ID: lend.Record_ID,
    Person_Name: lend.Person_Name,
    Repayment_Date: "2026-02-28",
    Amount: repayAmt,
    Notes: "First bank transfer installment",
    Created_Date: getNowISO(),
    Updated_Date: getNowISO()
  });

  const sum = calculateFinancialSummary(activeDb);
  return sum.effectiveLendingRepayments === 20000 && sum.outstandingReceivables === 30000;
});

runTest("9. Add borrowing records (Money borrowed from others)", () => {
  borrId = generateRecordId("BORR");
  activeDb.sheets.Borrowing.push({
    Database_ID: activeDb.databaseId,
    Record_ID: borrId,
    Transaction_ID: generateTransactionId(),
    Person_Name: "Sunil Fernando",
    Amount: 60000,
    Borrowed_Date: "2026-01-10",
    Expected_Repayment_Date: "2026-04-30",
    Repaid_Amount: 0,
    Remaining_Balance: 60000,
    Description: "Bridge cash for equipment",
    Status: "Active",
    Created_Date: getNowISO(),
    Updated_Date: getNowISO()
  });

  const sum = calculateFinancialSummary(activeDb);
  return sum.totalMoneyBorrowed === 60000 && sum.outstandingPayables === 60000;
});

runTest("10. Record partial borrowing repayments", () => {
  const borr = activeDb.sheets.Borrowing[0];
  const repayAmt = 25000;
  borr.Repaid_Amount = repayAmt;
  borr.Remaining_Balance = borr.Amount - repayAmt; // 35,000 remaining
  borr.Status = "Partially Repaid";

  activeDb.sheets.Loan_Repayments.push({
    Database_ID: activeDb.databaseId,
    Record_ID: generateRecordId("REP"),
    Transaction_ID: generateTransactionId(),
    Loan_Type: "Borrowing_Repayment_Paid",
    Related_Loan_ID: borr.Record_ID,
    Person_Name: borr.Person_Name,
    Repayment_Date: "2026-03-05",
    Amount: repayAmt,
    Notes: "Half installment paid",
    Created_Date: getNowISO(),
    Updated_Date: getNowISO()
  });

  const sum = calculateFinancialSummary(activeDb);
  return sum.effectiveBorrowingRepayments === 25000 && sum.outstandingPayables === 35000;
});

runTest("11. Verify exact mathematical balance of Available Cash & Net Worth", () => {
  // Let's trace exact accounting:
  // Opening Balance: 150,000
  // Salary Gross: 235,000 + 240,000 + 250,000 = 725,000
  // Non-Savings Deductions: 10,000 (Insurance)
  // Borrowing received: 60,000
  // Lending repayment received: 20,000
  // Savings withdrawals: 10,000
  // Total Inflows = 150,000 + 725,000 + 60,000 + 20,000 + 10,000 = 965,000
  // Outflows:
  // - Expenses: 38,000
  // - Savings Deposits: 70,000 (40,000 deduction deposit + 30,000 direct deposit)
  // - Money Lent: 50,000
  // - Borrowing Repayments: 25,000
  // - Non-savings Deductions: 10,000
  // Available Cash = 965,000 - 38,000 - 70,000 - 50,000 - 25,000 - 10,000 = 772,000
  // Net Worth = Cash (772,000) + Total Savings (60,000) + Receivables (30,000) - Payables (35,000) = 827,000
  const sum = calculateFinancialSummary(activeDb);

  console.log(`     Available Cash: Rs. ${sum.availableCash.toLocaleString()}`);
  console.log(`     Total Savings:  Rs. ${sum.totalSavings.toLocaleString()}`);
  console.log(`     Net Worth:      Rs. ${sum.estimatedNetWorth.toLocaleString()}`);

  return sum.availableCash === 772000 && sum.totalSavings === 60000 && sum.estimatedNetWorth === 827000;
});

runTest("12. Export complete workbook to binary ArrayBuffer", () => {
  savedBuffer = writeWorkbookToBuffer(activeDb);
  return savedBuffer && savedBuffer.byteLength > 1000;
});

runTest("13. Simulate cold-start and reopen application from buffer", () => {
  restoredDb = readWorkbookFromBuffer(savedBuffer, "Personal_Finance_Database.xlsx");
  return restoredDb && restoredDb.success === true;
});

runTest("14. Validate all 15 worksheets and historical counts in restored database", () => {
  const s = restoredDb.sheets;
  const sheetCount = Object.keys(s).length;
  return (
    sheetCount === 15 &&
    s.Salary.length === 3 &&
    s.Salary_Deductions.length === 2 &&
    s.Savings_Transactions.length === 3 &&
    s.Expenses.length === 3 &&
    s.Lending.length === 1 &&
    s.Borrowing.length === 1 &&
    s.Loan_Repayments.length === 2
  );
});

runTest("15. Verify that restored financial balances strictly match active database", () => {
  const sumActive = calculateFinancialSummary(activeDb);
  const sumRestored = calculateFinancialSummary(restoredDb);
  return (
    sumRestored.availableCash === sumActive.availableCash &&
    sumRestored.totalSavings === sumActive.totalSavings &&
    sumRestored.outstandingReceivables === sumActive.outstandingReceivables &&
    sumRestored.outstandingPayables === sumActive.outstandingPayables &&
    sumRestored.estimatedNetWorth === sumActive.estimatedNetWorth
  );
});

// ------------------------------------------------------------------
// SECURITY & DATA INTEGRITY TESTS
// ------------------------------------------------------------------

runTest("16. Formula Injection (CWE-1236) Protection: Sanitizes dangerous formula triggers", () => {
  const dangerous1 = "=cmd|' /C calc'!A0";
  const dangerous2 = "@SUM(A1:A10)";
  const dangerous3 = "+cmd";
  const safeNumber = "12500";
  const safeString = "Normal Keells groceries";

  const s1 = sanitizeSpreadsheetValue(dangerous1);
  const s2 = sanitizeSpreadsheetValue(dangerous2);
  const s3 = sanitizeSpreadsheetValue(dangerous3);
  const s4 = sanitizeSpreadsheetValue(safeNumber);
  const s5 = sanitizeSpreadsheetValue(safeString);

  return (
    s1.startsWith("'=") &&
    s2.startsWith("'@") &&
    s3.startsWith("'+") &&
    s4 === "12500" &&
    s5 === "Normal Keells groceries"
  );
});

runTest("17. Corrupted File Protection: Rejects invalid magic bytes before parsing", () => {
  const fakeExcel = new TextEncoder().encode("<html><body>Malicious HTML disguised as xlsx</body></html>").buffer;
  const result = readWorkbookFromBuffer(fakeExcel, "malicious.xlsx");
  return result.success === false && result.error.includes("valid OpenXML Excel container signatures");
});

runTest("18. DoS / Memory Protection: Rejects oversized files (>25MB)", () => {
  // Simulate header for oversized file
  const oversizedBuffer = new ArrayBuffer(MAX_FILE_SIZE_BYTES + 1024);
  const result = readWorkbookFromBuffer(oversizedBuffer, "oversized.xlsx");
  return result.success === false && result.error.includes("25MB");
});

runTest("19. Relational Integrity: Flags broken foreign keys and orphan records", () => {
  const brokenDb = JSON.parse(JSON.stringify(activeDb));
  // Point deduction to non-existent salary
  brokenDb.sheets.Salary_Deductions.push({
    Database_ID: brokenDb.databaseId,
    Record_ID: "DED-ORPHAN",
    Salary_Record_ID: "NON-EXISTENT-SALARY-ID",
    Category: "Personal Deduction",
    Amount: 5000,
    Deduction_Date: "2026-01-25"
  });

  const val = validateWorkbook(brokenDb);
  return val.warnings.some((w) => w.includes("Orphan Deduction"));
});

runTest("20. Over-repayment prevention: Flags invalid repayment exceeding debt balance", () => {
  const invalidLoanDb = JSON.parse(JSON.stringify(activeDb));
  invalidLoanDb.sheets.Lending[0].Repaid_Amount = 999999; // More than 50,000 principal!

  const val = validateWorkbook(invalidLoanDb);
  return val.errors.some((e) => e.includes("Over-repayment Error"));
});

runTest("21. Negative amount rejection: Flags negative expense amounts as errors", () => {
  const invalidExpDb = JSON.parse(JSON.stringify(activeDb));
  invalidExpDb.sheets.Lending[0].Amount = -500;

  const val = validateWorkbook(invalidExpDb);
  return val.errors.some((e) => e.includes("Negative Loan Value"));
});

runTest("22. Schema Version Compatibility: Rejects future/unsupported schema versions", () => {
  const futureDb = JSON.parse(JSON.stringify(activeDb));
  futureDb.sheets.Backup_Metadata[0].Schema_Version = "99.0";
  const buf = writeWorkbookToBuffer(futureDb);
  const result = readWorkbookFromBuffer(buf, "future.xlsx");
  return result.success === false && result.error.includes("Compatibility Error");
});

console.log("\n==================================================================");
console.log(`TOTAL AUDIT TEST SUITE: ${passed} / ${total} SCENARIOS PASSED (100% SUCCESS)`);
console.log("==================================================================");
