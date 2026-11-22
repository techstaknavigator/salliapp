import {
  createNewDatabase
} from "./excelEngine.js";
import {
  generateRecordId,
  generateTransactionId,
  getNowISO
} from "../types/schema.js";

/**
 * Generates a realistic, complete sample personal finance database
 * for demonstration, testing, and initial exploration.
 */
export function generateSampleDatabase() {
  const db = createNewDatabase({
    currency: "LKR",
    startingDate: "2026-01-01",
    openingBalance: 125000,
    userName: "Senuri Hirupama"
  });

  const dbId = db.databaseId;
  const now = getNowISO();

  // 1. Savings Accounts
  const emergencyAcc = db.sheets.Savings_Accounts[0]; // Emergency Savings
  const personalAcc = db.sheets.Savings_Accounts[1];  // Personal Savings
  const futureAcc = db.sheets.Savings_Accounts[2];    // Future Goals

  // 2. Add realistic Salary records (Manual dates: 25th Jan, 23rd Feb, 27th March)
  const salaries = [
    {
      month: "2026-01",
      receivedDate: "2026-01-25",
      basic: 220000,
      allowances: 35000,
      bonuses: 20000,
      additional: 0,
      notes: "January compensation with New Year performance bonus"
    },
    {
      month: "2026-02",
      receivedDate: "2026-02-23",
      basic: 220000,
      allowances: 35000,
      bonuses: 0,
      additional: 15000,
      notes: "February salary plus freelance technical writing"
    },
    {
      month: "2026-03",
      receivedDate: "2026-03-27",
      basic: 220000,
      allowances: 40000,
      bonuses: 50000,
      additional: 0,
      notes: "March salary with Q1 incentive payout"
    }
  ];

  const salaryRecords = [];
  salaries.forEach((s) => {
    const total = s.basic + s.allowances + s.bonuses + s.additional;
    const salRecId = generateRecordId("SAL");
    const salTxId = generateTransactionId();

    const salRec = {
      Database_ID: dbId,
      Record_ID: salRecId,
      Transaction_ID: salTxId,
      Salary_Month: s.month,
      Salary_Received_Date: s.receivedDate,
      Basic_Salary: s.basic,
      Allowances: s.allowances,
      Bonuses: s.bonuses,
      Additional_Income: s.additional,
      Total_Salary: total,
      Notes: s.notes,
      Created_Date: now,
      Updated_Date: now
    };
    salaryRecords.push(salRec);
    db.sheets.Salary.push(salRec);

    // Ledger entry
    db.sheets.Transactions.push({
      Database_ID: dbId,
      Record_ID: generateRecordId("TX"),
      Transaction_ID: salTxId,
      Transaction_Date: s.receivedDate,
      Transaction_Type: "Salary",
      Category: "Salary",
      Description: `Salary for ${s.month} (${s.notes})`,
      Cash_Flow_Type: "Inflow",
      Amount: total,
      Related_Record_ID: salRecId,
      Created_Date: now,
      Updated_Date: now
    });
  });

  // 3. Salary Deductions (including Savings deduction which creates a Savings Deposit)
  const deductions = [
    {
      salaryIdx: 0,
      date: "2026-01-25",
      category: "Savings",
      amount: 40000,
      desc: "Monthly automatic allocation to Emergency Fund",
      accId: emergencyAcc.Record_ID,
      accName: emergencyAcc.Account_Name
    },
    {
      salaryIdx: 0,
      date: "2026-01-25",
      category: "Personal Deduction",
      amount: 12000,
      desc: "Medical insurance policy contribution",
      accId: "",
      accName: ""
    },
    {
      salaryIdx: 1,
      date: "2026-02-23",
      category: "Savings",
      amount: 45000,
      desc: "Savings allocation to Emergency Fund",
      accId: emergencyAcc.Record_ID,
      accName: emergencyAcc.Account_Name
    },
    {
      salaryIdx: 2,
      date: "2026-03-27",
      category: "Savings",
      amount: 60000,
      desc: "Savings allocation to Future Goals",
      accId: futureAcc.Record_ID,
      accName: futureAcc.Account_Name
    }
  ];

  deductions.forEach((d) => {
    const parentSalary = salaryRecords[d.salaryIdx];
    const dedRecId = generateRecordId("DED");
    const dedTxId = generateTransactionId();

    db.sheets.Salary_Deductions.push({
      Database_ID: dbId,
      Record_ID: dedRecId,
      Transaction_ID: dedTxId,
      Salary_Record_ID: parentSalary.Record_ID,
      Salary_Month: parentSalary.Salary_Month,
      Deduction_Date: d.date,
      Category: d.category,
      Amount: d.amount,
      Description: d.desc,
      Auto_Deposit_Savings_Account_ID: d.accId,
      Created_Date: now,
      Updated_Date: now
    });

    // If Savings deduction, auto-create Savings Deposit!
    if (d.category === "Savings" && d.accId) {
      const savTxId = generateTransactionId();
      db.sheets.Savings_Transactions.push({
        Database_ID: dbId,
        Record_ID: generateRecordId("SAV-TX"),
        Transaction_ID: savTxId,
        Account_ID: d.accId,
        Account_Name: d.accName,
        Transaction_Type: "Deposit",
        Amount: d.amount,
        Transaction_Date: d.date,
        Source_Or_Purpose: `Auto-deposit via Salary Deduction (${parentSalary.Salary_Month})`,
        Related_Record_ID: dedRecId,
        Notes: d.desc,
        Created_Date: now,
        Updated_Date: now
      });

      db.sheets.Transactions.push({
        Database_ID: dbId,
        Record_ID: generateRecordId("TX"),
        Transaction_ID: savTxId,
        Transaction_Date: d.date,
        Transaction_Type: "Savings_Deposit",
        Category: "Savings Deposit",
        Description: `Savings auto-deposit into ${d.accName}`,
        Cash_Flow_Type: "Outflow",
        Amount: d.amount,
        Related_Record_ID: dedRecId,
        Created_Date: now,
        Updated_Date: now
      });
    } else {
      // Non-savings deduction ledger entry
      db.sheets.Transactions.push({
        Database_ID: dbId,
        Record_ID: generateRecordId("TX"),
        Transaction_ID: dedTxId,
        Transaction_Date: d.date,
        Transaction_Type: "Deduction",
        Category: d.category,
        Description: d.desc,
        Cash_Flow_Type: "Outflow",
        Amount: d.amount,
        Related_Record_ID: dedRecId,
        Created_Date: now,
        Updated_Date: now
      });
    }
  });

  // 4. Manual Savings Deposit & Withdrawal (test withdrawal < balance)
  const manSavTxId1 = generateTransactionId();
  db.sheets.Savings_Transactions.push({
    Database_ID: dbId,
    Record_ID: generateRecordId("SAV-TX"),
    Transaction_ID: manSavTxId1,
    Account_ID: personalAcc.Record_ID,
    Account_Name: personalAcc.Account_Name,
    Transaction_Type: "Deposit",
    Amount: 50000,
    Transaction_Date: "2026-02-05",
    Source_Or_Purpose: "Cash deposit from opening balance",
    Related_Record_ID: "",
    Notes: "Personal savings initial seed",
    Created_Date: now,
    Updated_Date: now
  });
  db.sheets.Transactions.push({
    Database_ID: dbId,
    Record_ID: generateRecordId("TX"),
    Transaction_ID: manSavTxId1,
    Transaction_Date: "2026-02-05",
    Transaction_Type: "Savings_Deposit",
    Category: "Savings Deposit",
    Description: `Direct deposit to ${personalAcc.Account_Name}`,
    Cash_Flow_Type: "Outflow",
    Amount: 50000,
    Related_Record_ID: "",
    Created_Date: now,
    Updated_Date: now
  });

  // Withdrawal
  const manSavTxId2 = generateTransactionId();
  db.sheets.Savings_Transactions.push({
    Database_ID: dbId,
    Record_ID: generateRecordId("SAV-TX"),
    Transaction_ID: manSavTxId2,
    Account_ID: emergencyAcc.Record_ID,
    Account_Name: emergencyAcc.Account_Name,
    Transaction_Type: "Withdrawal",
    Amount: 15000,
    Transaction_Date: "2026-02-18",
    Source_Or_Purpose: "Urgent dental root canal treatment",
    Related_Record_ID: "",
    Notes: "Emergency medical cost withdrawn",
    Created_Date: now,
    Updated_Date: now
  });
  db.sheets.Transactions.push({
    Database_ID: dbId,
    Record_ID: generateRecordId("TX"),
    Transaction_ID: manSavTxId2,
    Transaction_Date: "2026-02-18",
    Transaction_Type: "Savings_Withdrawal",
    Category: "Savings Withdrawal",
    Description: `Emergency withdrawal from ${emergencyAcc.Account_Name}`,
    Cash_Flow_Type: "Inflow",
    Amount: 15000,
    Related_Record_ID: "",
    Created_Date: now,
    Updated_Date: now
  });

  // 5. Realistic Expenses
  const sampleExpenses = [
    { date: "2026-01-26", cat: "Food", amt: 18500, method: "Bank Card", desc: "Supermarket monthly groceries (Keells)" },
    { date: "2026-01-28", cat: "Bills", amt: 22000, method: "Online", desc: "Electricity (CEB) and Water bills" },
    { date: "2026-02-02", cat: "Transport", amt: 14000, method: "Cash", desc: "Fuel petrol reload and highway tolls" },
    { date: "2026-02-10", cat: "Shopping", amt: 12500, method: "Bank Card", desc: "Work footwear and clothing" },
    { date: "2026-02-15", cat: "Health", amt: 8500, method: "Cash", desc: "Pharmacy vitamins and prescriptions" },
    { date: "2026-02-25", cat: "Food", amt: 24000, method: "Bank Card", desc: "Monthly groceries and fresh produce" },
    { date: "2026-03-05", cat: "Bills", amt: 9500, method: "Online", desc: "Dialog Fiber broadband and phone bills" },
    { date: "2026-03-12", cat: "Entertainment", amt: 11000, method: "Bank Card", desc: "Family weekend dining and cinema" },
    { date: "2026-03-20", cat: "Education", amt: 25000, method: "Online", desc: "Professional AWS certification exam fee" },
    { date: "2026-03-28", cat: "Food", amt: 21000, method: "Bank Card", desc: "March groceries and provisions" }
  ];

  sampleExpenses.forEach((exp) => {
    const expRecId = generateRecordId("EXP");
    const expTxId = generateTransactionId();

    db.sheets.Expenses.push({
      Database_ID: dbId,
      Record_ID: expRecId,
      Transaction_ID: expTxId,
      Expense_Date: exp.date,
      Category: exp.cat,
      Amount: exp.amt,
      Payment_Method: exp.method,
      Description: exp.desc,
      Receipt_Ref: `REC-${exp.date.replace(/-/g, "")}`,
      Created_Date: now,
      Updated_Date: now
    });

    db.sheets.Transactions.push({
      Database_ID: dbId,
      Record_ID: generateRecordId("TX"),
      Transaction_ID: expTxId,
      Transaction_Date: exp.date,
      Transaction_Type: "Expense",
      Category: exp.cat,
      Description: exp.desc,
      Cash_Flow_Type: "Outflow",
      Amount: exp.amt,
      Related_Record_ID: expRecId,
      Created_Date: now,
      Updated_Date: now
    });
  });

  // 6. Lending (Money given to others)
  const lendRecId = generateRecordId("LEND");
  const lendTxId = generateTransactionId();
  db.sheets.Lending.push({
    Database_ID: dbId,
    Record_ID: lendRecId,
    Transaction_ID: lendTxId,
    Person_Name: "Kasun Perera",
    Amount: 50000,
    Given_Date: "2026-02-01",
    Expected_Return_Date: "2026-04-15",
    Repaid_Amount: 20000,
    Remaining_Balance: 30000,
    Description: "Emergency medical loan assistance",
    Status: "Partially Repaid",
    Created_Date: now,
    Updated_Date: now
  });
  db.sheets.Transactions.push({
    Database_ID: dbId,
    Record_ID: generateRecordId("TX"),
    Transaction_ID: lendTxId,
    Transaction_Date: "2026-02-01",
    Transaction_Type: "Lending_Given",
    Category: "Lending",
    Description: "Money lent to Kasun Perera",
    Cash_Flow_Type: "Outflow",
    Amount: 50000,
    Related_Record_ID: lendRecId,
    Created_Date: now,
    Updated_Date: now
  });

  // Partial repayment for Lending
  const lendRepayTxId = generateTransactionId();
  db.sheets.Loan_Repayments.push({
    Database_ID: dbId,
    Record_ID: generateRecordId("REP"),
    Transaction_ID: lendRepayTxId,
    Loan_Type: "Lending_Repayment_Received",
    Related_Loan_ID: lendRecId,
    Person_Name: "Kasun Perera",
    Repayment_Date: "2026-03-01",
    Amount: 20000,
    Notes: "First installment bank transfer",
    Created_Date: now,
    Updated_Date: now
  });
  db.sheets.Transactions.push({
    Database_ID: dbId,
    Record_ID: generateRecordId("TX"),
    Transaction_ID: lendRepayTxId,
    Transaction_Date: "2026-03-01",
    Transaction_Type: "Lending_Repayment_Received",
    Category: "Repayments",
    Description: "Partial loan repayment received from Kasun Perera",
    Cash_Flow_Type: "Inflow",
    Amount: 20000,
    Related_Record_ID: lendRecId,
    Created_Date: now,
    Updated_Date: now
  });

  // 7. Borrowing (Money borrowed from others)
  const borrRecId = generateRecordId("BORR");
  const borrTxId = generateTransactionId();
  db.sheets.Borrowing.push({
    Database_ID: dbId,
    Record_ID: borrRecId,
    Transaction_ID: borrTxId,
    Person_Name: "Sunil Fernando",
    Amount: 60000,
    Borrowed_Date: "2026-01-10",
    Expected_Repayment_Date: "2026-04-30",
    Repaid_Amount: 30000,
    Remaining_Balance: 30000,
    Description: "Short-term bridge cash for home laptop upgrade",
    Status: "Partially Repaid",
    Created_Date: now,
    Updated_Date: now
  });
  db.sheets.Transactions.push({
    Database_ID: dbId,
    Record_ID: generateRecordId("TX"),
    Transaction_ID: borrTxId,
    Transaction_Date: "2026-01-10",
    Transaction_Type: "Borrowing_Received",
    Category: "Borrowing",
    Description: "Borrowed short-term cash from Sunil Fernando",
    Cash_Flow_Type: "Inflow",
    Amount: 60000,
    Related_Record_ID: borrRecId,
    Created_Date: now,
    Updated_Date: now
  });

  // Partial repayment for Borrowing
  const borrRepayTxId = generateTransactionId();
  db.sheets.Loan_Repayments.push({
    Database_ID: dbId,
    Record_ID: generateRecordId("REP"),
    Transaction_ID: borrRepayTxId,
    Loan_Type: "Borrowing_Repayment_Paid",
    Related_Loan_ID: borrRecId,
    Person_Name: "Sunil Fernando",
    Repayment_Date: "2026-02-28",
    Amount: 30000,
    Notes: "Repaid half loan via online transfer",
    Created_Date: now,
    Updated_Date: now
  });
  db.sheets.Transactions.push({
    Database_ID: dbId,
    Record_ID: generateRecordId("TX"),
    Transaction_ID: borrRepayTxId,
    Transaction_Date: "2026-02-28",
    Transaction_Type: "Borrowing_Repayment_Paid",
    Category: "Repayments",
    Description: "Partial loan repayment paid to Sunil Fernando",
    Cash_Flow_Type: "Outflow",
    Amount: 30000,
    Related_Record_ID: borrRecId,
    Created_Date: now,
    Updated_Date: now
  });

  // 8. Monthly Budgets
  const currentMonth = "2026-03";
  const budgets = [
    { cat: "Food", amt: 35000, notes: "Monthly groceries and daily food limit" },
    { cat: "Bills", amt: 25000, notes: "Utility bills budget" },
    { cat: "Transport", amt: 20000, notes: "Fuel and transit" },
    { cat: "Shopping", amt: 15000, notes: "Discretionary retail shopping" },
    { cat: "Entertainment", amt: 15000, notes: "Outings, dining, movies" },
    { cat: "Education", amt: 30000, notes: "Courses, books and certification" }
  ];

  budgets.forEach((b) => {
    db.sheets.Budgets.push({
      Database_ID: dbId,
      Record_ID: generateRecordId("BUD"),
      Budget_Month: currentMonth,
      Category: b.cat,
      Allocated_Amount: b.amt,
      Notes: b.notes,
      Created_Date: now,
      Updated_Date: now
    });
  });

  // 9. Savings Goals
  db.sheets.Savings_Goals.push(
    {
      Database_ID: dbId,
      Record_ID: generateRecordId("GOAL"),
      Goal_Name: "Emergency 6-Month Safety Cushion",
      Target_Amount: 500000,
      Target_Date: "2026-12-31",
      Linked_Account_ID: emergencyAcc.Record_ID,
      Notes: "Fully funded emergency buffer in high yield savings",
      Status: "In Progress",
      Created_Date: now,
      Updated_Date: now
    },
    {
      Database_ID: dbId,
      Record_ID: generateRecordId("GOAL"),
      Goal_Name: "New MacBook Pro Workstation",
      Target_Amount: 650000,
      Target_Date: "2026-08-31",
      Linked_Account_ID: futureAcc.Record_ID,
      Notes: "Professional tech hardware upgrade fund",
      Status: "In Progress",
      Created_Date: now,
      Updated_Date: now
    }
  );

  // 10. Recurring Transactions
  db.sheets.Recurring_Transactions.push(
    {
      Database_ID: dbId,
      Record_ID: generateRecordId("REC"),
      Title: "Dialog Fiber Broadband",
      Type: "Expense",
      Category: "Bills",
      Amount: 6200,
      Frequency: "Monthly",
      Next_Due_Date: "2026-04-05",
      Auto_Reminder: "Yes",
      Status: "Active",
      Created_Date: now,
      Updated_Date: now
    },
    {
      Database_ID: dbId,
      Record_ID: generateRecordId("REC"),
      Title: "CEB Electricity Bill",
      Type: "Expense",
      Category: "Bills",
      Amount: 14000,
      Frequency: "Monthly",
      Next_Due_Date: "2026-04-10",
      Auto_Reminder: "Yes",
      Status: "Active",
      Created_Date: now,
      Updated_Date: now
    },
    {
      Database_ID: dbId,
      Record_ID: generateRecordId("REC"),
      Title: "Spotify Family Subscription",
      Type: "Expense",
      Category: "Entertainment",
      Amount: 1800,
      Frequency: "Monthly",
      Next_Due_Date: "2026-04-14",
      Auto_Reminder: "Yes",
      Status: "Active",
      Created_Date: now,
      Updated_Date: now
    }
  );

  // Recalculate total records in metadata
  let totalRecords = 0;
  Object.keys(db.sheets).forEach((k) => {
    totalRecords += db.sheets[k].length;
  });
  db.sheets.Backup_Metadata[0].Total_Records = totalRecords;
  db.metadata.Total_Records = totalRecords;

  return db;
}
