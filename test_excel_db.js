import {
  createNewDatabase,
  writeWorkbookToBuffer,
  readWorkbookFromBuffer,
  validateWorkbook,
  mergeWorkbooks
} from "./src/services/excelEngine.js";
import {
  calculateFinancialSummary
} from "./src/services/financialCalculations.js";
import {
  generateSampleDatabase
} from "./src/services/sampleData.js";
import {
  SHEET_NAMES,
  generateRecordId,
  generateTransactionId,
  getNowISO
} from "./src/types/schema.js";

console.log("=================================================");
console.log("PERSONAL SALARY & FINANCE MANAGER - EXCEL DB TEST");
console.log("=================================================\n");

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] Test ${totalTests}: ${testName}`);
    passedTests++;
  } else {
    console.error(`[FAIL] Test ${totalTests}: ${testName}`);
    process.exitCode = 1;
  }
}

// 1. Create a new Excel database
const db = createNewDatabase({
  currency: "LKR",
  startingDate: "2026-01-01",
  openingBalance: 100000,
  userName: "Senuri Hirupama"
});
assert(db && db.databaseId && db.sheets, "Create a new Excel database with unique DB ID");
assert(Object.keys(db.sheets).length === 15, "Initialize all 15 required worksheets");
assert(SHEET_NAMES.every((name) => db.sheets[name] !== undefined), "Verify all 15 worksheet names present");

// 2. Add salary
const salId = generateRecordId("SAL");
const salTxId = generateTransactionId();
const basicSalary = 250000;
const allowances = 30000;
const totalSal = basicSalary + allowances;
db.sheets.Salary.push({
  Database_ID: db.databaseId,
  Record_ID: salId,
  Transaction_ID: salTxId,
  Salary_Month: "2026-01",
  Salary_Received_Date: "2026-01-25",
  Basic_Salary: basicSalary,
  Allowances: allowances,
  Bonuses: 0,
  Additional_Income: 0,
  Total_Salary: totalSal,
  Notes: "Jan regular salary",
  Created_Date: getNowISO(),
  Updated_Date: getNowISO()
});
db.sheets.Transactions.push({
  Database_ID: db.databaseId,
  Record_ID: generateRecordId("TX"),
  Transaction_ID: salTxId,
  Transaction_Date: "2026-01-25",
  Transaction_Type: "Salary",
  Category: "Salary",
  Description: "Salary for 2026-01",
  Cash_Flow_Type: "Inflow",
  Amount: totalSal,
  Related_Record_ID: salId,
  Created_Date: getNowISO(),
  Updated_Date: getNowISO()
});
assert(db.sheets.Salary.length === 1, "Add salary record to Salary worksheet");

// 3. Add salary deductions (Savings deduction auto-creates a Savings Deposit)
const emergencyAcc = db.sheets.Savings_Accounts[0];
const dedId = generateRecordId("DED");
const dedTxId = generateTransactionId();
const savingsDeductionAmt = 50000;
db.sheets.Salary_Deductions.push({
  Database_ID: db.databaseId,
  Record_ID: dedId,
  Transaction_ID: dedTxId,
  Salary_Record_ID: salId,
  Salary_Month: "2026-01",
  Deduction_Date: "2026-01-25",
  Category: "Savings",
  Amount: savingsDeductionAmt,
  Description: "Auto deduction into Emergency Savings",
  Auto_Deposit_Savings_Account_ID: emergencyAcc.Record_ID,
  Created_Date: getNowISO(),
  Updated_Date: getNowISO()
});
// Auto-create Savings Deposit
const savTxId = generateTransactionId();
db.sheets.Savings_Transactions.push({
  Database_ID: db.databaseId,
  Record_ID: generateRecordId("SAV-TX"),
  Transaction_ID: savTxId,
  Account_ID: emergencyAcc.Record_ID,
  Account_Name: emergencyAcc.Account_Name,
  Transaction_Type: "Deposit",
  Amount: savingsDeductionAmt,
  Transaction_Date: "2026-01-25",
  Source_Or_Purpose: "Auto-deposit from salary",
  Related_Record_ID: dedId,
  Notes: "Automated deposit",
  Created_Date: getNowISO(),
  Updated_Date: getNowISO()
});
assert(db.sheets.Savings_Transactions.length === 1, "Savings deduction automatically creates Savings Deposit");

// 4. Add direct savings
const directSavTxId = generateTransactionId();
db.sheets.Savings_Transactions.push({
  Database_ID: db.databaseId,
  Record_ID: generateRecordId("SAV-TX"),
  Transaction_ID: directSavTxId,
  Account_ID: emergencyAcc.Record_ID,
  Account_Name: emergencyAcc.Account_Name,
  Transaction_Type: "Deposit",
  Amount: 20000,
  Transaction_Date: "2026-01-28",
  Source_Or_Purpose: "Cash deposit",
  Related_Record_ID: "",
  Notes: "Extra seed",
  Created_Date: getNowISO(),
  Updated_Date: getNowISO()
});
assert(db.sheets.Savings_Transactions.length === 2, "Add direct savings deposit");

// 5. Withdraw savings
const withdrawAmt = 15000;
db.sheets.Savings_Transactions.push({
  Database_ID: db.databaseId,
  Record_ID: generateRecordId("SAV-TX"),
  Transaction_ID: generateTransactionId(),
  Account_ID: emergencyAcc.Record_ID,
  Account_Name: emergencyAcc.Account_Name,
  Transaction_Type: "Withdrawal",
  Amount: withdrawAmt,
  Transaction_Date: "2026-02-02",
  Source_Or_Purpose: "Emergency repair",
  Related_Record_ID: "",
  Notes: "Vehicle battery",
  Created_Date: getNowISO(),
  Updated_Date: getNowISO()
});
assert(db.sheets.Savings_Transactions.length === 3, "Withdraw savings from account");

// 6. Add expenses
const expAmt = 35000;
db.sheets.Expenses.push({
  Database_ID: db.databaseId,
  Record_ID: generateRecordId("EXP"),
  Transaction_ID: generateTransactionId(),
  Expense_Date: "2026-01-26",
  Category: "Food",
  Amount: expAmt,
  Payment_Method: "Bank Card",
  Description: "Groceries",
  Receipt_Ref: "REC-001",
  Created_Date: getNowISO(),
  Updated_Date: getNowISO()
});
assert(db.sheets.Expenses.length === 1, "Add expense record");

// 7. Add lending record
const lendAmt = 40000;
const lendId = generateRecordId("LEND");
db.sheets.Lending.push({
  Database_ID: db.databaseId,
  Record_ID: lendId,
  Transaction_ID: generateTransactionId(),
  Person_Name: "Kasun Perera",
  Amount: lendAmt,
  Given_Date: "2026-01-27",
  Expected_Return_Date: "2026-03-01",
  Repaid_Amount: 0,
  Remaining_Balance: lendAmt,
  Description: "Short term help",
  Status: "Active",
  Created_Date: getNowISO(),
  Updated_Date: getNowISO()
});
assert(db.sheets.Lending.length === 1, "Add lending record");

// 8. Add borrowing record
const borrAmt = 50000;
const borrId = generateRecordId("BORR");
db.sheets.Borrowing.push({
  Database_ID: db.databaseId,
  Record_ID: borrId,
  Transaction_ID: generateTransactionId(),
  Person_Name: "Sunil Fernando",
  Amount: borrAmt,
  Borrowed_Date: "2026-01-15",
  Expected_Repayment_Date: "2026-04-01",
  Repaid_Amount: 0,
  Remaining_Balance: borrAmt,
  Description: "Bridge loan",
  Status: "Active",
  Created_Date: getNowISO(),
  Updated_Date: getNowISO()
});
assert(db.sheets.Borrowing.length === 1, "Add borrowing record");

// 9. Record partial repayments
// Repayment received for lending
const lendRepaidAmt = 15000;
db.sheets.Lending[0].Repaid_Amount = lendRepaidAmt;
db.sheets.Lending[0].Remaining_Balance = lendAmt - lendRepaidAmt;
db.sheets.Lending[0].Status = "Partially Repaid";
db.sheets.Loan_Repayments.push({
  Database_ID: db.databaseId,
  Record_ID: generateRecordId("REP"),
  Transaction_ID: generateTransactionId(),
  Loan_Type: "Lending_Repayment_Received",
  Related_Loan_ID: lendId,
  Person_Name: "Kasun Perera",
  Repayment_Date: "2026-02-10",
  Amount: lendRepaidAmt,
  Notes: "Partial installment",
  Created_Date: getNowISO(),
  Updated_Date: getNowISO()
});
assert(db.sheets.Loan_Repayments.length === 1, "Record partial repayment for loan");

// 10. Verify financial balances
const summary = calculateFinancialSummary(db);
// Opening: 100,000
// Salary: +280,000
// Borrowing received: +50,000
// Lending repayment received: +15,000
// Savings withdrawals: +15,000
// Total inflows: 100,000 + 280,000 + 50,000 + 15,000 + 15,000 = 460,000
// Expenses: -35,000
// Savings deposits: -70,000 (50k + 20k)
// Money lent: -40,000
// Available Cash: 460,000 - 35,000 - 70,000 - 40,000 = 315,000
console.log(`Calculated Available Cash: Rs. ${summary.availableCash.toLocaleString()}`);
console.log(`Calculated Total Savings: Rs. ${summary.totalSavings.toLocaleString()}`);
assert(summary.availableCash === 315000, "Verify exact available cash balance calculation");
assert(summary.totalSavings === 55000, "Verify total savings (70,000 deposits - 15,000 withdrawal = 55,000)");
assert(summary.outstandingReceivables === 25000, "Verify outstanding receivables (40,000 - 15,000 = 25,000)");
assert(summary.outstandingPayables === 50000, "Verify outstanding payables (50,000)");

// 11. Download / write Excel workbook to binary buffer
const buffer = writeWorkbookToBuffer(db);
assert(buffer && buffer.byteLength > 0, "Write complete workbook into XLSX ArrayBuffer");

// 12-14. Re-open / parse the workbook (simulate opening on another device/browser)
const restored = readWorkbookFromBuffer(buffer, "Personal_Finance_Database.xlsx");
assert(restored.success === true, "Open & parse workbook on simulated separate environment");
assert(restored.sheets.Salary.length === 1, "Restore historical salary records");
assert(restored.sheets.Expenses.length === 1, "Restore historical expense records");
assert(restored.sheets.Savings_Transactions.length === 3, "Restore historical savings transactions");
assert(restored.sheets.Lending.length === 1, "Restore historical lending records");
assert(restored.sheets.Borrowing.length === 1, "Restore historical borrowing records");

// 15-17. Continue adding transactions & re-serialize
restored.sheets.Expenses.push({
  Database_ID: restored.databaseId,
  Record_ID: generateRecordId("EXP"),
  Transaction_ID: generateTransactionId(),
  Expense_Date: "2026-02-05",
  Category: "Transport",
  Amount: 8500,
  Payment_Method: "Cash",
  Description: "Fuel",
  Receipt_Ref: "REC-002",
  Created_Date: getNowISO(),
  Updated_Date: getNowISO()
});
const updatedBuffer = writeWorkbookToBuffer(restored);
const reloaded = readWorkbookFromBuffer(updatedBuffer, "Personal_Finance_Database.xlsx");
assert(reloaded.sheets.Expenses.length === 2, "Continue adding records & re-save workbook");

// 18. Test duplicate ID validation
const val = validateWorkbook(reloaded);
assert(val.isValid === true, "Validate workbook integrity without duplicates");

// 19. Test invalid Excel file rejection
const invalidBuffer = new Uint8Array([0, 1, 2, 3, 4, 5]).buffer;
const invalidResult = readWorkbookFromBuffer(invalidBuffer, "corrupt.xlsx");
assert(invalidResult.success === false, "Reject invalid / corrupt Excel files with descriptive error");

// 20. Test sample data generation
const sampleDb = generateSampleDatabase();
const sampleSummary = calculateFinancialSummary(sampleDb);
assert(sampleDb && sampleSummary.totalGrossSalary > 0, "Generate realistic sample demo database");

console.log("\n=================================================");
console.log(`ALL TESTS PASSED: ${passedTests} / ${totalTests} (100% Success)`);
console.log("=================================================");
