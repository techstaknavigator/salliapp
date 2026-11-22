import React, { createContext, useContext, useState, useEffect } from "react";
import {
  createNewDatabase as initNewDatabase,
  writeWorkbookToBuffer,
  downloadWorkbookFile,
  readWorkbookFromBuffer,
  validateWorkbook,
  mergeWorkbooks,
  isEncryptedWorkbook,
  decryptWorkbookBuffer,
  encryptWorkbookBuffer
} from "../services/excelEngine.js";
import {
  calculateFinancialSummary
} from "../services/financialCalculations.js";
import {
  saveToFileHandle,
  saveAsWithFileSystem,
  isFileSystemAccessSupported
} from "../services/fileSystemAccess.js";
import { generateSampleDatabase } from "../services/sampleData.js";
import {
  generateRecordId,
  generateTransactionId,
  getNowISO,
  WORKBOOK_NAME
} from "../types/schema.js";

const FinanceContext = createContext(null);

export function FinanceProvider({ children }) {
  // Database in runtime state (Excel is the permanent database)
  const [database, setDatabase] = useState(null);
  const [dbPassword, setDbPassword] = useState(null);
  const [fileHandle, setFileHandle] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [darkMode, setDarkMode] = useState(false);
  const [notification, setNotification] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle"); // 'idle' | 'saving' | 'saved' | 'unsaved' | 'error'

  // Apply dark mode class to html element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Data Loss Prevention: warn user before closing or refreshing if unsaved changes exist
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (database?.isDirty) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes in your Excel financial database. Are you sure you want to leave?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [database?.isDirty]);

  // Show temporary toast notification
  const showToast = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  // 1. CREATE NEW FINANCIAL DATABASE (Protected with Agile Encryption)
  const handleCreateNewDatabase = (params) => {
    try {
      const { password, ...dbParams } = params;
      if (!password || password.length < 8) {
        throw new Error("Password must be at least 8 characters long.");
      }
      const newDb = initNewDatabase(dbParams);
      setDatabase(newDb);
      setDbPassword(password);
      setFileHandle(null);
      setSaveStatus("unsaved");

      // Automatically download genuinely encrypted XLSX file
      downloadWorkbookFile(newDb, WORKBOOK_NAME, password);

      showToast("success", `New Encrypted Database '${newDb.databaseId}' created! Downloaded Personal_Finance_Database.xlsx.`);
      return newDb;
    } catch (err) {
      showToast("error", `Failed to create database: ${err.message}`);
      throw err;
    }
  };

  // 2. LOAD EXISTING EXCEL DATABASE (Decrypts if encrypted; migrates if unencrypted)
  const handleLoadWorkbookBuffer = async (arrayBuffer, filename = WORKBOOK_NAME, handle = null, password = null) => {
    let bufferToParse = arrayBuffer;
    let activePassword = password;

    const isEncrypted = isEncryptedWorkbook(arrayBuffer);

    if (isEncrypted) {
      if (!password) {
        return { success: false, isEncrypted: true, error: "Password required for encrypted Excel file." };
      }
      try {
        bufferToParse = await decryptWorkbookBuffer(arrayBuffer, password);
        activePassword = password;
      } catch (err) {
        showToast("error", err.message || "Incorrect password.");
        return { success: false, error: err.message };
      }
    } else {
      if (password) {
        activePassword = password;
      }
    }

    const result = readWorkbookFromBuffer(bufferToParse, filename);
    if (!result.success) {
      showToast("error", result.error);
      return { success: false, error: result.error };
    }

    // Validate the imported model
    const validation = validateWorkbook(result);
    if (!validation.isValid) {
      showToast("error", `Database validation failed: ${validation.errors.join("; ")}`);
      return { success: false, error: validation.errors.join("; ") };
    }

    setDatabase(result);
    setDbPassword(activePassword);
    setFileHandle(handle);
    setSaveStatus(handle ? "saved" : "idle");

    if (!isEncrypted && activePassword) {
      // Requirement 5: unencrypted database migration - download newly encrypted copy
      downloadWorkbookFile(result, "Personal_Finance_Database_Protected.xlsx", activePassword);
      showToast("success", "Unencrypted database imported & encrypted! Downloaded protected copy.");
    } else {
      showToast("success", `Database '${result.databaseId}' loaded successfully with ${result.summary.totalRecords} records!`);
    }

    return { success: true, database: result };
  };

  // 3. LOAD DEMO DATABASE
  const handleLoadDemoDatabase = () => {
    const demoDb = generateSampleDatabase();
    setDatabase(demoDb);
    setDbPassword("demo12345");
    setFileHandle(null);
    setSaveStatus("unsaved");
    showToast("success", "Sample financial database loaded! You can now test and explore all features.");
  };

  // 4. SAVE CHANGES DIRECTLY OR PROMPT FILE PICKER
  const handleSaveChanges = async () => {
    if (!database) return;

    setSaveStatus("saving");
    try {
      const buffer = writeWorkbookToBuffer(database, dbPassword);

      if (fileHandle) {
        await saveToFileHandle(fileHandle, buffer);
        setSaveStatus("saved");
        setDatabase((prev) => ({
          ...prev,
          lastSaved: getNowISO(),
          isDirty: false
        }));
        showToast("success", `Encrypted changes directly saved to '${fileHandle.name}'!`);
      } else if (isFileSystemAccessSupported()) {
        const saved = await saveAsWithFileSystem(buffer, database.filename || WORKBOOK_NAME);
        setFileHandle(saved.fileHandle);
        setSaveStatus("saved");
        setDatabase((prev) => ({
          ...prev,
          filename: saved.filename,
          lastSaved: getNowISO(),
          isDirty: false
        }));
        showToast("success", `Encrypted database saved to '${saved.filename}' and connected for direct sync!`);
      } else {
        downloadWorkbookFile(database, null, dbPassword);
        setSaveStatus("saved");
        setDatabase((prev) => ({
          ...prev,
          lastSaved: getNowISO(),
          isDirty: false
        }));
        showToast("info", "Encrypted Excel workbook downloaded with updated financial records.");
      }
    } catch (err) {
      setSaveStatus("error");
      showToast("error", `Save failed: ${err.message}`);
    }
  };

  // 5. DOWNLOAD DATABASE
  const handleDownloadDatabase = (customFilename) => {
    if (!database) {
      showToast("warning", "No active database to download.");
      return;
    }
    try {
      downloadWorkbookFile(database, customFilename, dbPassword);
      showToast("success", "Password-protected Excel database downloaded!");
    } catch (err) {
      showToast("error", `Download failed: ${err.message}`);
    }
  };

  // 6. CHANGE DATABASE PASSWORD
  const handleChangeDatabasePassword = async (currentPassword, newPassword) => {
    if (dbPassword && currentPassword !== dbPassword) {
      showToast("error", "Current password does not match.");
      return false;
    }
    if (!newPassword || newPassword.length < 8) {
      showToast("error", "New password must be at least 8 characters long.");
      return false;
    }

    try {
      setDbPassword(newPassword);
      downloadWorkbookFile(database, "Personal_Finance_Database.xlsx", newPassword);
      setDatabase((prev) => ({
        ...prev,
        lastSaved: getNowISO(),
        isDirty: false
      }));
      showToast("success", "Password changed! Downloaded newly encrypted Excel file. Use your new password in Microsoft Excel.");
      return true;
    } catch (err) {
      showToast("error", `Failed to change password: ${err.message}`);
      return false;
    }
  };

  // 7. CLOSE / UNLOAD DATABASE
  const closeDatabase = () => {
    setDatabase(null);
    setDbPassword(null);
    setFileHandle(null);
    setSaveStatus("idle");
    setActiveTab("dashboard");
    showToast("info", "Database closed. Session memory cleared.");
  };

  /**
   * Safe Transaction-like Processing:
   * 1. Creates a temporary deep copy of the workbook model.
   * 2. Applies changes to the temporary copy.
   * 3. Validates the temporary copy with validateWorkbook.
   * 4. Commits to state ONLY if validation succeeds.
   * 5. Otherwise discards the temporary copy, leaving active memory completely unmodified.
   */
  const mutateDatabase = (updater) => {
    if (!database) return false;

    try {
      // 1. Deep clone the entire database model
      const tempDb = JSON.parse(JSON.stringify(database));

      // 2. Apply updater on temporary copy
      updater(tempDb.sheets, tempDb);

      // Recompute metadata record count and updated date
      let totalRecords = 0;
      Object.keys(tempDb.sheets).forEach((sheetName) => {
        totalRecords += tempDb.sheets[sheetName]?.length || 0;
      });

      if (tempDb.sheets.Backup_Metadata && tempDb.sheets.Backup_Metadata[0]) {
        tempDb.sheets.Backup_Metadata[0].Total_Records = totalRecords;
        tempDb.sheets.Backup_Metadata[0].Updated_Date = getNowISO();
      }

      tempDb.isDirty = true;

      // 3. Validate changes in temporary model
      const val = validateWorkbook(tempDb);
      if (!val.isValid) {
        showToast("error", `Transaction Aborted: ${val.errors.join("; ")}`);
        return false;
      }

      // 4. Commit validated temporary model atomically to state
      setDatabase(tempDb);
      setSaveStatus("unsaved");
      return true;
    } catch (err) {
      showToast("error", `Transaction Error: ${err.message}`);
      return false;
    }
  };

  // ----------------------------------------------------
  // SALARY MANAGEMENT (Supports Gross & Net Modes)
  // ----------------------------------------------------
  const addSalary = (salaryInput) => {
    const basic = Number(salaryInput.basicSalary);
    const allowances = Number(salaryInput.allowances) || 0;
    const bonuses = Number(salaryInput.bonuses) || 0;
    const additional = Number(salaryInput.additionalIncome) || 0;
    const payrollDed = Number(salaryInput.payrollDeductions) || 0;
    const mode = salaryInput.salaryMode || "Gross"; // "Gross" | "Net"

    if (isNaN(basic) || basic < 0) {
      showToast("error", "Salary amount must be a positive number.");
      return false;
    }

    let gross = 0;
    let net = 0;

    if (mode === "Net") {
      // User entered actual net salary received directly
      net = Number(salaryInput.netSalary || salaryInput.basicSalary) || 0;
      gross = (basic + allowances + bonuses) || (net + payrollDed);
    } else {
      // Gross mode: Net = Gross - Payroll Deductions
      gross = basic + allowances + bonuses;
      net = Math.max(0, gross - payrollDed);
    }

    const total = gross + additional;
    const now = getNowISO();
    const dbId = database.databaseId;
    const recId = generateRecordId("SAL");
    const txId = generateTransactionId();

    const salaryRec = {
      Database_ID: dbId,
      Record_ID: recId,
      Transaction_ID: txId,
      Salary_Month: salaryInput.salaryMonth,
      Salary_Received_Date: salaryInput.salaryReceivedDate,
      Salary_Mode: mode,
      Basic_Salary: basic,
      Allowances: allowances,
      Bonuses: bonuses,
      Payroll_Deductions: payrollDed,
      Additional_Income: additional,
      Net_Salary: net,
      Total_Salary: total,
      Notes: salaryInput.notes || "",
      Created_Date: now,
      Updated_Date: now
    };

    const success = mutateDatabase((sheets) => {
      sheets.Salary = [salaryRec, ...(sheets.Salary || [])];

      // Add to Master Transactions
      const txRec = {
        Database_ID: dbId,
        Record_ID: generateRecordId("TX"),
        Transaction_ID: txId,
        Transaction_Date: salaryInput.salaryReceivedDate,
        Transaction_Type: "Salary",
        Category: "Salary",
        Description: `${mode === "Net" ? "Actual Net" : "Gross"} Salary for ${salaryInput.salaryMonth} ${salaryInput.notes ? `(${salaryInput.notes})` : ""}`,
        Cash_Flow_Type: "Inflow",
        Amount: mode === "Net" ? net + additional : total,
        Related_Record_ID: recId,
        Created_Date: now,
        Updated_Date: now
      };
      sheets.Transactions = [txRec, ...(sheets.Transactions || [])];
    });

    if (success) {
      showToast("success", `Salary for ${salaryInput.salaryMonth} (${mode} mode) added successfully!`);
    }
    return success;
  };

  const updateSalary = (salaryId, salaryInput) => {
    const now = getNowISO();
    const basic = Number(salaryInput.basicSalary);
    const allowances = Number(salaryInput.allowances) || 0;
    const bonuses = Number(salaryInput.bonuses) || 0;
    const additional = Number(salaryInput.additionalIncome) || 0;
    const payrollDed = Number(salaryInput.payrollDeductions) || 0;
    const mode = salaryInput.salaryMode || "Gross";

    if (isNaN(basic) || basic < 0) {
      showToast("error", "Salary must be a non-negative number.");
      return false;
    }

    let gross = 0;
    let net = 0;

    if (mode === "Net") {
      net = Number(salaryInput.netSalary || salaryInput.basicSalary) || 0;
      gross = (basic + allowances + bonuses) || (net + payrollDed);
    } else {
      gross = basic + allowances + bonuses;
      net = Math.max(0, gross - payrollDed);
    }

    const total = gross + additional;

    const success = mutateDatabase((sheets) => {
      const idx = (sheets.Salary || []).findIndex((s) => s.Record_ID === salaryId);
      if (idx !== -1) {
        const oldRec = sheets.Salary[idx];
        const updatedRec = {
          ...oldRec,
          Salary_Month: salaryInput.salaryMonth,
          Salary_Received_Date: salaryInput.salaryReceivedDate,
          Salary_Mode: mode,
          Basic_Salary: basic,
          Allowances: allowances,
          Bonuses: bonuses,
          Payroll_Deductions: payrollDed,
          Additional_Income: additional,
          Net_Salary: net,
          Total_Salary: total,
          Notes: salaryInput.notes || "",
          Updated_Date: now
        };
        sheets.Salary[idx] = updatedRec;

        const txIdx = (sheets.Transactions || []).findIndex((t) => t.Transaction_ID === oldRec.Transaction_ID);
        if (txIdx !== -1) {
          sheets.Transactions[txIdx] = {
            ...sheets.Transactions[txIdx],
            Transaction_Date: salaryInput.salaryReceivedDate,
            Description: `${mode === "Net" ? "Actual Net" : "Gross"} Salary for ${salaryInput.salaryMonth} ${salaryInput.notes ? `(${salaryInput.notes})` : ""}`,
            Amount: mode === "Net" ? net + additional : total,
            Updated_Date: now
          };
        }
      }
    });

    if (success) {
      showToast("success", "Salary record updated!");
    }
    return success;
  };

  const deleteSalary = (salaryId) => {
    const success = mutateDatabase((sheets) => {
      const oldRec = (sheets.Salary || []).find((s) => s.Record_ID === salaryId);

      // Find all deductions linked to this salary
      const linkedDeductions = (sheets.Salary_Deductions || []).filter(
        (d) => d.Salary_Record_ID === salaryId
      );
      const linkedDeductionIds = new Set(linkedDeductions.map((d) => d.Record_ID));

      // Remove linked deductions
      sheets.Salary_Deductions = (sheets.Salary_Deductions || []).filter(
        (d) => d.Salary_Record_ID !== salaryId
      );

      // Remove auto-created savings transactions linked to those deductions
      sheets.Savings_Transactions = (sheets.Savings_Transactions || []).filter(
        (s) => !linkedDeductionIds.has(s.Related_Record_ID)
      );

      // Remove master transactions
      sheets.Transactions = (sheets.Transactions || []).filter(
        (t) =>
          t.Transaction_ID !== oldRec?.Transaction_ID &&
          t.Related_Record_ID !== salaryId &&
          !linkedDeductionIds.has(t.Related_Record_ID)
      );

      // Remove the salary record
      sheets.Salary = (sheets.Salary || []).filter((s) => s.Record_ID !== salaryId);
    });

    if (success) {
      showToast("info", "Salary record and linked deductions removed cleanly.");
    }
    return success;
  };

  // ----------------------------------------------------
  // SALARY DEDUCTIONS (Auto creates Savings Deposit if Savings)
  // ----------------------------------------------------
  const addDeduction = (deductionInput) => {
    const amount = Number(deductionInput.amount);
    if (isNaN(amount) || amount <= 0) {
      showToast("error", "Deduction amount must be greater than zero.");
      return false;
    }

    const now = getNowISO();
    const dbId = database.databaseId;
    const recId = generateRecordId("DED");
    const txId = generateTransactionId();

    const deductionRec = {
      Database_ID: dbId,
      Record_ID: recId,
      Transaction_ID: txId,
      Salary_Record_ID: deductionInput.salaryRecordId || "",
      Salary_Month: deductionInput.salaryMonth || "",
      Deduction_Date: deductionInput.deductionDate,
      Category: deductionInput.category,
      Amount: amount,
      Description: deductionInput.description || "",
      Auto_Deposit_Savings_Account_ID: deductionInput.autoSavingsAccountId || "",
      Created_Date: now,
      Updated_Date: now
    };

    const success = mutateDatabase((sheets) => {
      sheets.Salary_Deductions = [deductionRec, ...(sheets.Salary_Deductions || [])];

      if (deductionInput.category === "Savings" && deductionInput.autoSavingsAccountId) {
        const targetAcc = (sheets.Savings_Accounts || []).find(
          (a) => a.Record_ID === deductionInput.autoSavingsAccountId
        );
        const savTxId = generateTransactionId();

        const savDeposit = {
          Database_ID: dbId,
          Record_ID: generateRecordId("SAV-TX"),
          Transaction_ID: savTxId,
          Account_ID: deductionInput.autoSavingsAccountId,
          Account_Name: targetAcc ? targetAcc.Account_Name : "Savings Account",
          Transaction_Type: "Deposit",
          Amount: amount,
          Transaction_Date: deductionInput.deductionDate,
          Source_Or_Purpose: `Auto-deposit from Salary Deduction (${deductionInput.salaryMonth || "Monthly"})`,
          Related_Record_ID: recId,
          Notes: deductionInput.description || "Salary deduction auto-transferred to savings",
          Created_Date: now,
          Updated_Date: now
        };
        sheets.Savings_Transactions = [savDeposit, ...(sheets.Savings_Transactions || [])];

        sheets.Transactions = [
          {
            Database_ID: dbId,
            Record_ID: generateRecordId("TX"),
            Transaction_ID: savTxId,
            Transaction_Date: deductionInput.deductionDate,
            Transaction_Type: "Savings_Deposit",
            Category: "Savings Deposit",
            Description: `Auto-deposit to ${savDeposit.Account_Name} via salary deduction`,
            Cash_Flow_Type: "Outflow",
            Amount: amount,
            Related_Record_ID: recId,
            Created_Date: now,
            Updated_Date: now
          },
          ...(sheets.Transactions || [])
        ];
      } else {
        sheets.Transactions = [
          {
            Database_ID: dbId,
            Record_ID: generateRecordId("TX"),
            Transaction_ID: txId,
            Transaction_Date: deductionInput.deductionDate,
            Transaction_Type: "Deduction",
            Category: deductionInput.category,
            Description: deductionInput.description || `${deductionInput.category} deduction`,
            Cash_Flow_Type: "Outflow",
            Amount: amount,
            Related_Record_ID: recId,
            Created_Date: now,
            Updated_Date: now
          },
          ...(sheets.Transactions || [])
        ];
      }
    });

    if (success) {
      showToast("success", `Salary deduction of Rs. ${amount.toLocaleString()} recorded.`);
    }
    return success;
  };

  const deleteDeduction = (deductionId) => {
    const success = mutateDatabase((sheets) => {
      const oldDed = (sheets.Salary_Deductions || []).find((d) => d.Record_ID === deductionId);
      sheets.Salary_Deductions = (sheets.Salary_Deductions || []).filter((d) => d.Record_ID !== deductionId);

      if (oldDed) {
        sheets.Transactions = (sheets.Transactions || []).filter(
          (t) => t.Transaction_ID !== oldDed.Transaction_ID && t.Related_Record_ID !== deductionId
        );
        sheets.Savings_Transactions = (sheets.Savings_Transactions || []).filter(
          (s) => s.Related_Record_ID !== deductionId
        );
      }
    });

    if (success) {
      showToast("info", "Deduction removed.");
    }
    return success;
  };

  // ----------------------------------------------------
  // SAVINGS MANAGEMENT
  // ----------------------------------------------------
  const addSavingsAccount = (accountInput) => {
    const now = getNowISO();
    const dbId = database.databaseId;
    const recId = generateRecordId("SAV-ACC");

    const newAcc = {
      Database_ID: dbId,
      Record_ID: recId,
      Account_Name: accountInput.accountName,
      Target_Amount: Number(accountInput.targetAmount) || 0,
      Notes: accountInput.notes || "",
      Created_Date: now,
      Updated_Date: now
    };

    const success = mutateDatabase((sheets) => {
      sheets.Savings_Accounts = [...(sheets.Savings_Accounts || []), newAcc];
    });

    if (success) {
      showToast("success", `Savings account '${accountInput.accountName}' created!`);
    }
    return success;
  };

  const deleteSavingsAccount = (accountId) => {
    // Check if account has existing transactions
    const hasTransactions = (database.sheets.Savings_Transactions || []).some(
      (tx) => tx.Account_ID === accountId
    );

    if (hasTransactions) {
      showToast("error", "Security Guard: Cannot delete savings account because it contains recorded transactions. Withdraw or clear funds first.");
      return false;
    }

    const success = mutateDatabase((sheets) => {
      sheets.Savings_Accounts = (sheets.Savings_Accounts || []).filter(
        (a) => a.Record_ID !== accountId
      );
    });

    if (success) {
      showToast("info", "Savings account deleted.");
    }
    return success;
  };

  const addSavingsTransaction = (txInput) => {
    const amount = Number(txInput.amount);
    if (isNaN(amount) || amount <= 0) {
      showToast("error", "Amount must be greater than zero.");
      return false;
    }

    // Validate withdrawal balance
    if (txInput.transactionType === "Withdrawal") {
      let currentBalance = 0;
      (database.sheets.Savings_Transactions || []).forEach((t) => {
        if (t.Account_ID === txInput.accountId) {
          if (t.Transaction_Type === "Deposit") currentBalance += Number(t.Amount) || 0;
          if (t.Transaction_Type === "Withdrawal") currentBalance -= Number(t.Amount) || 0;
        }
      });

      if (amount > currentBalance) {
        showToast("error", `Cannot withdraw: requested ${amount.toLocaleString()} exceeds available account balance of ${currentBalance.toLocaleString()}!`);
        return false;
      }
    }

    const now = getNowISO();
    const dbId = database.databaseId;
    const recId = generateRecordId("SAV-TX");
    const txId = generateTransactionId();

    const targetAcc = (database.sheets.Savings_Accounts || []).find((a) => a.Record_ID === txInput.accountId);
    const accName = targetAcc ? targetAcc.Account_Name : "Savings Account";

    const savTx = {
      Database_ID: dbId,
      Record_ID: recId,
      Transaction_ID: txId,
      Account_ID: txInput.accountId,
      Account_Name: accName,
      Transaction_Type: txInput.transactionType,
      Amount: amount,
      Transaction_Date: txInput.transactionDate,
      Source_Or_Purpose: txInput.sourceOrPurpose || "",
      Related_Record_ID: "",
      Notes: txInput.notes || "",
      Created_Date: now,
      Updated_Date: now
    };

    const success = mutateDatabase((sheets) => {
      sheets.Savings_Transactions = [savTx, ...(sheets.Savings_Transactions || [])];

      sheets.Transactions = [
        {
          Database_ID: dbId,
          Record_ID: generateRecordId("TX"),
          Transaction_ID: txId,
          Transaction_Date: txInput.transactionDate,
          Transaction_Type: txInput.transactionType === "Deposit" ? "Savings_Deposit" : "Savings_Withdrawal",
          Category: `Savings ${txInput.transactionType}`,
          Description: `${txInput.transactionType} ${txInput.transactionType === 'Deposit' ? 'into' : 'from'} ${accName} (${txInput.sourceOrPurpose || ''})`,
          Cash_Flow_Type: txInput.transactionType === "Deposit" ? "Outflow" : "Inflow",
          Amount: amount,
          Related_Record_ID: recId,
          Created_Date: now,
          Updated_Date: now
        },
        ...(sheets.Transactions || [])
      ];
    });

    if (success) {
      showToast("success", `Savings ${txInput.transactionType.toLowerCase()} of Rs. ${amount.toLocaleString()} recorded.`);
    }
    return success;
  };

  // ----------------------------------------------------
  // UNIFIED DEDUCTIONS & EXPENSES MANAGEMENT
  // ----------------------------------------------------
  const addOutgoingTransaction = (txInput) => {
    const amount = Number(txInput.amount);
    if (isNaN(amount) || amount <= 0) {
      showToast("error", "Transaction amount must be greater than zero.");
      return false;
    }

    const type = txInput.transactionType || "Daily Expense";
    const now = getNowISO();
    const dbId = database.databaseId;
    const recId = generateRecordId("EXP");
    const txId = generateTransactionId();

    const expRec = {
      Database_ID: dbId,
      Record_ID: recId,
      Transaction_ID: txId,
      Salary_Month: txInput.salaryMonth || (txInput.expenseDate ? txInput.expenseDate.slice(0, 7) : getTodayDateStr().slice(0, 7)),
      Expense_Date: txInput.expenseDate || getTodayDateStr(),
      Category: txInput.category || "Other",
      Transaction_Type: type,
      Amount: amount,
      Payment_Method: txInput.paymentMethod || "Cash",
      Description: txInput.description || "",
      Receipt_Ref: txInput.receiptRef || "",
      Linked_Savings_Account_ID: type === "Savings Allocation" ? (txInput.linkedSavingsAccountId || "") : "",
      Linked_Loan_ID: type === "Loan Repayment" ? (txInput.linkedLoanId || "") : "",
      Created_Date: now,
      Updated_Date: now
    };

    const success = mutateDatabase((sheets) => {
      sheets.Expenses = [expRec, ...(sheets.Expenses || [])];

      // If Savings Allocation: automatically create 1 paired savings deposit in Savings_Transactions
      if (type === "Savings Allocation" && txInput.linkedSavingsAccountId) {
        const targetAcc = (sheets.Savings_Accounts || []).find((a) => a.Record_ID === txInput.linkedSavingsAccountId);
        const savTxId = generateTransactionId();
        const savDeposit = {
          Database_ID: dbId,
          Record_ID: generateRecordId("SAV-TX"),
          Transaction_ID: savTxId,
          Account_ID: txInput.linkedSavingsAccountId,
          Account_Name: targetAcc ? targetAcc.Account_Name : "Savings Account",
          Transaction_Type: "Deposit",
          Amount: amount,
          Transaction_Date: expRec.Expense_Date,
          Source_Or_Purpose: `Savings Allocation (${expRec.Salary_Month})`,
          Related_Record_ID: recId,
          Notes: txInput.description || "Transferred via Deductions & Expenses",
          Created_Date: now,
          Updated_Date: now
        };
        sheets.Savings_Transactions = [savDeposit, ...(sheets.Savings_Transactions || [])];
      }

      // If Loan Repayment: record in Loan_Repayments & update Borrowing record
      if (type === "Loan Repayment" && txInput.linkedLoanId) {
        const loan = (sheets.Borrowing || []).find((b) => b.Record_ID === txInput.linkedLoanId);
        if (loan) {
          const repTxId = generateTransactionId();
          const repayRec = {
            Database_ID: dbId,
            Record_ID: generateRecordId("REP"),
            Transaction_ID: repTxId,
            Loan_Type: "Borrowing_Repayment_Paid",
            Related_Loan_ID: loan.Record_ID,
            Person_Name: loan.Person_Name,
            Repayment_Date: expRec.Expense_Date,
            Amount: amount,
            Notes: txInput.description || "Repayment via Deductions & Expenses",
            Related_Record_ID: recId,
            Created_Date: now,
            Updated_Date: now
          };
          sheets.Loan_Repayments = [repayRec, ...(sheets.Loan_Repayments || [])];

          const newRepaid = (Number(loan.Repaid_Amount) || 0) + amount;
          loan.Repaid_Amount = newRepaid;
          loan.Remaining_Balance = Math.max(0, (Number(loan.Amount) || 0) - newRepaid);
          loan.Status = loan.Remaining_Balance === 0 ? "Fully Repaid" : "Partially Repaid";
          loan.Updated_Date = now;
        }
      }

      // Master ledger entry
      sheets.Transactions = [
        {
          Database_ID: dbId,
          Record_ID: generateRecordId("TX"),
          Transaction_ID: txId,
          Transaction_Date: expRec.Expense_Date,
          Transaction_Type: type,
          Category: expRec.Category,
          Description: expRec.Description || `${type} - ${expRec.Category}`,
          Cash_Flow_Type: "Outflow",
          Amount: amount,
          Related_Record_ID: recId,
          Created_Date: now,
          Updated_Date: now
        },
        ...(sheets.Transactions || [])
      ];
    });

    if (success) {
      showToast("success", `${type} of Rs. ${amount.toLocaleString()} recorded.`);
    }
    return success;
  };

  const updateOutgoingTransaction = (recId, txInput) => {
    const amount = Number(txInput.amount);
    if (isNaN(amount) || amount <= 0) {
      showToast("error", "Amount must be greater than zero.");
      return false;
    }

    const type = txInput.transactionType || "Daily Expense";
    const now = getNowISO();

    const success = mutateDatabase((sheets) => {
      const idx = (sheets.Expenses || []).findIndex((e) => e.Record_ID === recId);
      if (idx !== -1) {
        const oldRec = sheets.Expenses[idx];
        const updatedRec = {
          ...oldRec,
          Salary_Month: txInput.salaryMonth || oldRec.Salary_Month,
          Expense_Date: txInput.expenseDate || oldRec.Expense_Date,
          Category: txInput.category || oldRec.Category,
          Transaction_Type: type,
          Amount: amount,
          Payment_Method: txInput.paymentMethod || oldRec.Payment_Method,
          Description: txInput.description || "",
          Receipt_Ref: txInput.receiptRef || "",
          Linked_Savings_Account_ID: type === "Savings Allocation" ? (txInput.linkedSavingsAccountId || "") : "",
          Linked_Loan_ID: type === "Loan Repayment" ? (txInput.linkedLoanId || "") : "",
          Updated_Date: now
        };
        sheets.Expenses[idx] = updatedRec;

        // Synchronize paired Savings_Transactions
        if (type === "Savings Allocation") {
          const savIdx = (sheets.Savings_Transactions || []).findIndex((s) => s.Related_Record_ID === recId);
          const targetAcc = (sheets.Savings_Accounts || []).find((a) => a.Record_ID === txInput.linkedSavingsAccountId);
          if (savIdx !== -1) {
            sheets.Savings_Transactions[savIdx] = {
              ...sheets.Savings_Transactions[savIdx],
              Amount: amount,
              Account_ID: txInput.linkedSavingsAccountId || sheets.Savings_Transactions[savIdx].Account_ID,
              Account_Name: targetAcc ? targetAcc.Account_Name : sheets.Savings_Transactions[savIdx].Account_Name,
              Transaction_Date: updatedRec.Expense_Date,
              Updated_Date: now
            };
          } else if (txInput.linkedSavingsAccountId) {
            sheets.Savings_Transactions = [
              {
                Database_ID: database.databaseId,
                Record_ID: generateRecordId("SAV-TX"),
                Transaction_ID: generateTransactionId(),
                Account_ID: txInput.linkedSavingsAccountId,
                Account_Name: targetAcc ? targetAcc.Account_Name : "Savings Account",
                Transaction_Type: "Deposit",
                Amount: amount,
                Transaction_Date: updatedRec.Expense_Date,
                Source_Or_Purpose: `Savings Allocation (${updatedRec.Salary_Month})`,
                Related_Record_ID: recId,
                Notes: txInput.description || "Transferred via Deductions & Expenses",
                Created_Date: now,
                Updated_Date: now
              },
              ...(sheets.Savings_Transactions || [])
            ];
          }
        } else {
          // If transaction type changed away from Savings Allocation, remove old linked savings
          sheets.Savings_Transactions = (sheets.Savings_Transactions || []).filter(
            (s) => s.Related_Record_ID !== recId
          );
        }

        // Synchronize Master Transactions
        const txIdx = (sheets.Transactions || []).findIndex((t) => t.Transaction_ID === oldRec.Transaction_ID || t.Related_Record_ID === recId);
        if (txIdx !== -1) {
          sheets.Transactions[txIdx] = {
            ...sheets.Transactions[txIdx],
            Transaction_Date: updatedRec.Expense_Date,
            Transaction_Type: type,
            Category: updatedRec.Category,
            Description: updatedRec.Description || `${type} - ${updatedRec.Category}`,
            Amount: amount,
            Updated_Date: now
          };
        }
      }
    });

    if (success) {
      showToast("success", "Transaction updated successfully.");
    }
    return success;
  };

  const deleteOutgoingTransaction = (recId) => {
    const success = mutateDatabase((sheets) => {
      const oldRec = (sheets.Expenses || []).find((e) => e.Record_ID === recId);
      sheets.Expenses = (sheets.Expenses || []).filter((e) => e.Record_ID !== recId);

      // Remove linked Savings Transactions
      sheets.Savings_Transactions = (sheets.Savings_Transactions || []).filter(
        (s) => s.Related_Record_ID !== recId
      );

      // Remove linked Loan Repayments and restore loan balance
      const linkedRepayments = (sheets.Loan_Repayments || []).filter(
        (r) => r.Related_Record_ID === recId
      );
      linkedRepayments.forEach((rep) => {
        const loan = (sheets.Borrowing || []).find((b) => b.Record_ID === rep.Related_Loan_ID);
        if (loan) {
          const restoredRepaid = Math.max(0, (Number(loan.Repaid_Amount) || 0) - (Number(rep.Amount) || 0));
          loan.Repaid_Amount = restoredRepaid;
          loan.Remaining_Balance = Math.max(0, (Number(loan.Amount) || 0) - restoredRepaid);
          loan.Status = loan.Remaining_Balance === Number(loan.Amount) ? "Active" : "Partially Repaid";
        }
      });
      sheets.Loan_Repayments = (sheets.Loan_Repayments || []).filter(
        (r) => r.Related_Record_ID !== recId
      );

      // Remove from Master Transactions
      if (oldRec) {
        sheets.Transactions = (sheets.Transactions || []).filter(
          (t) => t.Transaction_ID !== oldRec.Transaction_ID && t.Related_Record_ID !== recId
        );
      }
    });

    if (success) {
      showToast("info", "Transaction deleted.");
    }
    return success;
  };

  // Aliases for backward compatibility
  const addExpense = (expenseInput) => addOutgoingTransaction(expenseInput);
  const updateExpense = (expenseId, expenseInput) => updateOutgoingTransaction(expenseId, expenseInput);
  const deleteExpense = (expenseId) => deleteOutgoingTransaction(expenseId);

  // Category management
  const addCustomCategory = (catInput) => {
    const now = getNowISO();
    const dbId = database.databaseId;
    const newCat = {
      Database_ID: dbId,
      Record_ID: generateRecordId("CAT"),
      Category_Type: catInput.categoryType || "Expense",
      Category_Name: catInput.categoryName.trim(),
      Color: catInput.color || "#10B981",
      Icon: catInput.icon || "Tag",
      Created_Date: now,
      Updated_Date: now
    };

    const success = mutateDatabase((sheets) => {
      sheets.Categories = [...(sheets.Categories || []), newCat];
    });

    if (success) {
      showToast("success", `Category '${catInput.categoryName}' created!`);
    }
    return success;
  };

  const deleteCustomCategory = (catId) => {
    const success = mutateDatabase((sheets) => {
      sheets.Categories = (sheets.Categories || []).filter((c) => c.Record_ID !== catId);
    });

    if (success) {
      showToast("info", "Category deleted.");
    }
    return success;
  };

  // ----------------------------------------------------
  // LENDING MANAGEMENT
  // ----------------------------------------------------
  const addLending = (lendingInput) => {
    const amount = Number(lendingInput.amount);
    if (isNaN(amount) || amount <= 0) {
      showToast("error", "Lending amount must be greater than zero.");
      return false;
    }

    const now = getNowISO();
    const dbId = database.databaseId;
    const recId = generateRecordId("LEND");
    const txId = generateTransactionId();

    const lendRec = {
      Database_ID: dbId,
      Record_ID: recId,
      Transaction_ID: txId,
      Person_Name: lendingInput.personName,
      Amount: amount,
      Given_Date: lendingInput.givenDate,
      Expected_Return_Date: lendingInput.expectedReturnDate || "",
      Repaid_Amount: 0,
      Remaining_Balance: amount,
      Description: lendingInput.description || "",
      Status: "Active",
      Created_Date: now,
      Updated_Date: now
    };

    const success = mutateDatabase((sheets) => {
      sheets.Lending = [lendRec, ...(sheets.Lending || [])];

      sheets.Transactions = [
        {
          Database_ID: dbId,
          Record_ID: generateRecordId("TX"),
          Transaction_ID: txId,
          Transaction_Date: lendingInput.givenDate,
          Transaction_Type: "Lending_Given",
          Category: "Lending",
          Description: `Money lent to ${lendingInput.personName} (${lendingInput.description || ''})`,
          Cash_Flow_Type: "Outflow",
          Amount: amount,
          Related_Record_ID: recId,
          Created_Date: now,
          Updated_Date: now
        },
        ...(sheets.Transactions || [])
      ];
    });

    if (success) {
      showToast("success", `Recorded loan of Rs. ${amount.toLocaleString()} given to ${lendingInput.personName}.`);
    }
    return success;
  };

  const recordLendingRepayment = (repayInput) => {
    const amount = Number(repayInput.amount);
    if (isNaN(amount) || amount <= 0) {
      showToast("error", "Repayment amount must be greater than zero.");
      return false;
    }

    const loan = (database.sheets.Lending || []).find((l) => l.Record_ID === repayInput.loanId);
    if (!loan) {
      showToast("error", "Lending record not found.");
      return false;
    }

    const currentRemaining = Number(loan.Remaining_Balance) || 0;
    if (amount > currentRemaining) {
      showToast("error", `Over-repayment Error: Repayment amount (Rs. ${amount.toLocaleString()}) cannot exceed the remaining balance (Rs. ${currentRemaining.toLocaleString()}).`);
      return false;
    }

    const now = getNowISO();
    const dbId = database.databaseId;
    const recId = generateRecordId("REP");
    const txId = generateTransactionId();

    const success = mutateDatabase((sheets) => {
      const idx = (sheets.Lending || []).findIndex((l) => l.Record_ID === repayInput.loanId);
      if (idx !== -1) {
        const prevRepaid = Number(loan.Repaid_Amount) || 0;
        const total = Number(loan.Amount) || 0;
        const newRepaid = Math.min(total, prevRepaid + amount);
        const newRemaining = Math.max(0, total - newRepaid);
        const newStatus = newRemaining <= 0 ? "Fully Repaid" : "Partially Repaid";

        sheets.Lending[idx] = {
          ...loan,
          Repaid_Amount: newRepaid,
          Remaining_Balance: newRemaining,
          Status: newStatus,
          Updated_Date: now
        };

        const repRec = {
          Database_ID: dbId,
          Record_ID: recId,
          Transaction_ID: txId,
          Loan_Type: "Lending_Repayment_Received",
          Related_Loan_ID: loan.Record_ID,
          Person_Name: loan.Person_Name,
          Repayment_Date: repayInput.repaymentDate,
          Amount: amount,
          Notes: repayInput.notes || "Repayment received",
          Created_Date: now,
          Updated_Date: now
        };
        sheets.Loan_Repayments = [repRec, ...(sheets.Loan_Repayments || [])];

        sheets.Transactions = [
          {
            Database_ID: dbId,
            Record_ID: generateRecordId("TX"),
            Transaction_ID: txId,
            Transaction_Date: repayInput.repaymentDate,
            Transaction_Type: "Lending_Repayment_Received",
            Category: "Loan Repayment",
            Description: `Repayment received from ${loan.Person_Name}`,
            Cash_Flow_Type: "Inflow",
            Amount: amount,
            Related_Record_ID: loan.Record_ID,
            Created_Date: now,
            Updated_Date: now
          },
          ...(sheets.Transactions || [])
        ];
      }
    });

    if (success) {
      showToast("success", `Repayment of Rs. ${amount.toLocaleString()} received.`);
    }
    return success;
  };

  // ----------------------------------------------------
  // BORROWING MANAGEMENT
  // ----------------------------------------------------
  const addBorrowing = (borrowInput) => {
    const amount = Number(borrowInput.amount);
    if (isNaN(amount) || amount <= 0) {
      showToast("error", "Borrowing amount must be greater than zero.");
      return false;
    }

    const now = getNowISO();
    const dbId = database.databaseId;
    const recId = generateRecordId("BORR");
    const txId = generateTransactionId();

    const borrRec = {
      Database_ID: dbId,
      Record_ID: recId,
      Transaction_ID: txId,
      Person_Name: borrowInput.personName,
      Amount: amount,
      Borrowed_Date: borrowInput.borrowedDate,
      Expected_Repayment_Date: borrowInput.expectedRepaymentDate || "",
      Repaid_Amount: 0,
      Remaining_Balance: amount,
      Description: borrowInput.description || "",
      Status: "Active",
      Created_Date: now,
      Updated_Date: now
    };

    const success = mutateDatabase((sheets) => {
      sheets.Borrowing = [borrRec, ...(sheets.Borrowing || [])];

      sheets.Transactions = [
        {
          Database_ID: dbId,
          Record_ID: generateRecordId("TX"),
          Transaction_ID: txId,
          Transaction_Date: borrowInput.borrowedDate,
          Transaction_Type: "Borrowing_Received",
          Category: "Borrowing",
          Description: `Borrowed money from ${borrowInput.personName} (${borrowInput.description || ''})`,
          Cash_Flow_Type: "Inflow",
          Amount: amount,
          Related_Record_ID: recId,
          Created_Date: now,
          Updated_Date: now
        },
        ...(sheets.Transactions || [])
      ];
    });

    if (success) {
      showToast("success", `Recorded debt of Rs. ${amount.toLocaleString()} borrowed from ${borrowInput.personName}.`);
    }
    return success;
  };

  const recordBorrowingRepayment = (repayInput) => {
    const amount = Number(repayInput.amount);
    if (isNaN(amount) || amount <= 0) {
      showToast("error", "Repayment installment must be greater than zero.");
      return false;
    }

    const loan = (database.sheets.Borrowing || []).find((b) => b.Record_ID === repayInput.loanId);
    if (!loan) {
      showToast("error", "Borrowing record not found.");
      return false;
    }

    const currentRemaining = Number(loan.Remaining_Balance) || 0;
    if (amount > currentRemaining) {
      showToast("error", `Over-repayment Error: Repayment amount (Rs. ${amount.toLocaleString()}) cannot exceed remaining debt balance (Rs. ${currentRemaining.toLocaleString()}).`);
      return false;
    }

    const now = getNowISO();
    const dbId = database.databaseId;
    const recId = generateRecordId("REP");
    const txId = generateTransactionId();

    const success = mutateDatabase((sheets) => {
      const idx = (sheets.Borrowing || []).findIndex((b) => b.Record_ID === repayInput.loanId);
      if (idx !== -1) {
        const prevRepaid = Number(loan.Repaid_Amount) || 0;
        const total = Number(loan.Amount) || 0;
        const newRepaid = Math.min(total, prevRepaid + amount);
        const newRemaining = Math.max(0, total - newRepaid);
        const newStatus = newRemaining <= 0 ? "Fully Repaid" : "Partially Repaid";

        sheets.Borrowing[idx] = {
          ...loan,
          Repaid_Amount: newRepaid,
          Remaining_Balance: newRemaining,
          Status: newStatus,
          Updated_Date: now
        };

        const repRec = {
          Database_ID: dbId,
          Record_ID: recId,
          Transaction_ID: txId,
          Loan_Type: "Borrowing_Repayment_Paid",
          Related_Loan_ID: loan.Record_ID,
          Person_Name: loan.Person_Name,
          Repayment_Date: repayInput.repaymentDate,
          Amount: amount,
          Notes: repayInput.notes || "Repayment paid",
          Created_Date: now,
          Updated_Date: now
        };
        sheets.Loan_Repayments = [repRec, ...(sheets.Loan_Repayments || [])];

        sheets.Transactions = [
          {
            Database_ID: dbId,
            Record_ID: generateRecordId("TX"),
            Transaction_ID: txId,
            Transaction_Date: repayInput.repaymentDate,
            Transaction_Type: "Borrowing_Repayment_Paid",
            Category: "Loan Repayment",
            Description: `Repayment paid to ${loan.Person_Name}`,
            Cash_Flow_Type: "Outflow",
            Amount: amount,
            Related_Record_ID: loan.Record_ID,
            Created_Date: now,
            Updated_Date: now
          },
          ...(sheets.Transactions || [])
        ];
      }
    });

    if (success) {
      showToast("success", `Repayment of Rs. ${amount.toLocaleString()} recorded.`);
    }
    return success;
  };

  // ----------------------------------------------------
  // BUDGETS, SAVINGS GOALS & RECURRING
  // ----------------------------------------------------
  const addBudget = (budgetInput) => {
    const now = getNowISO();
    const dbId = database.databaseId;
    const recId = generateRecordId("BUD");

    const success = mutateDatabase((sheets) => {
      sheets.Budgets = [
        {
          Database_ID: dbId,
          Record_ID: recId,
          Budget_Month: budgetInput.budgetMonth,
          Category: budgetInput.category,
          Allocated_Amount: Number(budgetInput.allocatedAmount) || 0,
          Notes: budgetInput.notes || "",
          Created_Date: now,
          Updated_Date: now
        },
        ...(sheets.Budgets || [])
      ];
    });

    if (success) {
      showToast("success", `Budget for ${budgetInput.category} set.`);
    }
    return success;
  };

  const addSavingsGoal = (goalInput) => {
    const now = getNowISO();
    const dbId = database.databaseId;
    const recId = generateRecordId("GOAL");

    const success = mutateDatabase((sheets) => {
      sheets.Savings_Goals = [
        {
          Database_ID: dbId,
          Record_ID: recId,
          Goal_Name: goalInput.goalName,
          Target_Amount: Number(goalInput.targetAmount) || 0,
          Target_Date: goalInput.targetDate || "",
          Linked_Account_ID: goalInput.linkedAccountId || "",
          Notes: goalInput.notes || "",
          Status: "In Progress",
          Created_Date: now,
          Updated_Date: now
        },
        ...(sheets.Savings_Goals || [])
      ];
    });

    if (success) {
      showToast("success", `Savings goal '${goalInput.goalName}' created.`);
    }
    return success;
  };

  const addRecurring = (recInput) => {
    const now = getNowISO();
    const dbId = database.databaseId;
    const recId = generateRecordId("REC");

    const success = mutateDatabase((sheets) => {
      sheets.Recurring_Transactions = [
        {
          Database_ID: dbId,
          Record_ID: recId,
          Title: recInput.title,
          Type: recInput.type || "Expense",
          Category: recInput.category,
          Amount: Number(recInput.amount) || 0,
          Frequency: recInput.frequency || "Monthly",
          Next_Due_Date: recInput.nextDueDate,
          Auto_Reminder: "Yes",
          Status: "Active",
          Created_Date: now,
          Updated_Date: now
        },
        ...(sheets.Recurring_Transactions || [])
      ];
    });

    if (success) {
      showToast("success", `Recurring reminder for '${recInput.title}' set.`);
    }
    return success;
  };

  // ----------------------------------------------------
  // BACKUP & RESTORE ACTIONS
  // ----------------------------------------------------
  const handleRestoreDatabase = (importedDb) => {
    const val = validateWorkbook(importedDb);
    if (!val.isValid) {
      showToast("error", `Cannot restore invalid backup: ${val.errors.join("; ")}`);
      return false;
    }

    setDatabase(importedDb);
    setFileHandle(null);
    setSaveStatus("unsaved");
    showToast("success", "Active financial database replaced with restored backup.");
    return true;
  };

  const handleMergeDatabase = (importedDb) => {
    if (!database) return;
    const merged = mergeWorkbooks(database, importedDb);
    const val = validateWorkbook(merged);
    if (!val.isValid) {
      showToast("error", `Merge rejected due to integrity errors: ${val.errors.join("; ")}`);
      return false;
    }

    setDatabase(merged);
    setSaveStatus("unsaved");
    showToast(
      "success",
      `Merged successfully: added ${merged.stats.addedCount} records, updated ${merged.stats.updatedCount}, skipped ${merged.stats.skippedDuplicates} duplicates.`
    );
    return true;
  };

  // Compute live summary from database
  const summary = calculateFinancialSummary(database);

  return (
    <FinanceContext.Provider
      value={{
        database,
        dbPassword,
        fileHandle,
        summary,
        activeTab,
        setActiveTab,
        darkMode,
        setDarkMode,
        notification,
        showToast,
        saveStatus,
        createNewDatabase: handleCreateNewDatabase,
        loadDatabaseFromBuffer: handleLoadWorkbookBuffer,
        loadDemoDatabase: handleLoadDemoDatabase,
        saveChanges: handleSaveChanges,
        downloadDatabase: handleDownloadDatabase,
        changeDatabasePassword: handleChangeDatabasePassword,
        closeDatabase,
        addSalary,
        updateSalary,
        deleteSalary,
        addDeduction,
        deleteDeduction,
        addSavingsAccount,
        deleteSavingsAccount,
        addSavingsTransaction,
        addExpense,
        updateExpense,
        deleteExpense,
        addOutgoingTransaction,
        updateOutgoingTransaction,
        deleteOutgoingTransaction,
        addCustomCategory,
        deleteCustomCategory,
        addLending,
        recordLendingRepayment,
        addBorrowing,
        recordBorrowingRepayment,
        addBudget,
        addSavingsGoal,
        addRecurring,
        restoreDatabase: handleRestoreDatabase,
        mergeDatabase: handleMergeDatabase
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error("useFinance must be used within a FinanceProvider");
  }
  return context;
}
