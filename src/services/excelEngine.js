import * as XLSX from "xlsx";
import officeCrypto from "officecrypto-tool";
import {
  WORKBOOK_NAME,
  SCHEMA_VERSION,
  BACKUP_VERSION,
  DEFAULT_CURRENCY,
  SHEET_NAMES,
  SHEET_HEADERS,
  DEFAULT_CATEGORIES,
  DEFAULT_SAVINGS_ACCOUNTS,
  generateDatabaseId,
  generateRecordId,
  generateTransactionId,
  getNowISO,
  getTodayDateStr
} from "../types/schema.js";

/**
 * Maximum permitted workbook file size (25MB) to protect browser memory
 */
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

/**
 * Sanitizes a string value against Formula / CSV / DDE Injection (CWE-1236)
 * If a cell string starts with '=', '+', '-', '@', '\t', or '\r',
 * it can be evaluated as executable code in spreadsheet applications.
 */
export function sanitizeSpreadsheetValue(value) {
  if (typeof value !== "string" || value.length === 0) {
    return value;
  }

  const firstChar = value[0];

  // If starts with formula or command triggers
  if (firstChar === "=" || firstChar === "@" || firstChar === "\t" || firstChar === "\r") {
    return `'${value}`;
  }

  // If starts with '+' or '-' but is not purely a numeric value (e.g. "+cmd|...")
  if ((firstChar === "+" || firstChar === "-") && isNaN(Number(value))) {
    return `'${value}`;
  }

  return value;
}

/**
 * Validates XLSX ZIP container magic bytes [0x50, 0x4B, 0x03, 0x04]
 */
export function validateXLSXMagicBytes(arrayBuffer) {
  if (!arrayBuffer || arrayBuffer.byteLength < 4) return false;
  const bytes = new Uint8Array(arrayBuffer.slice(0, 4));
  // Valid ZIP container headers
  return (
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07) &&
    (bytes[3] === 0x04 || bytes[3] === 0x06 || bytes[3] === 0x08)
  );
}

/**
 * Detects whether an XLSX file buffer is password-encrypted using Microsoft Office encryption
 */
export function isEncryptedWorkbook(arrayBuffer) {
  if (!arrayBuffer || arrayBuffer.byteLength < 8) return false;
  try {
    const buf = Buffer.isBuffer(arrayBuffer) ? arrayBuffer : Buffer.from(arrayBuffer);
    return officeCrypto.isEncrypted(buf);
  } catch (err) {
    return false;
  }
}

/**
 * Decrypts a password-protected Excel file buffer using Microsoft Office Agile Encryption
 * @param {ArrayBuffer|Buffer} arrayBuffer - The encrypted Excel file bytes
 * @param {string} password - The Excel database password
 * @returns {Promise<Buffer>} The decrypted XLSX zip buffer
 */
export async function decryptWorkbookBuffer(arrayBuffer, password) {
  if (!password) {
    throw new Error("Password is required to decrypt this Excel database.");
  }
  const buf = Buffer.isBuffer(arrayBuffer) ? arrayBuffer : Buffer.from(arrayBuffer);
  try {
    const decrypted = await officeCrypto.decrypt(buf, { password });
    return decrypted;
  } catch (err) {
    throw new Error("Incorrect password. The entered password could not decrypt this Excel workbook.");
  }
}

/**
 * Encrypts an unencrypted Excel file buffer using Microsoft Office Agile Encryption (AES-256)
 * @param {ArrayBuffer|Buffer} arrayBuffer - The plaintext XLSX bytes
 * @param {string} password - The Excel database password (minimum 8 characters)
 * @returns {Buffer} The Microsoft Office Agile Encrypted XLSX buffer
 */
export function encryptWorkbookBuffer(arrayBuffer, password) {
  if (!password || password.length < 8) {
    throw new Error("Excel database password must be at least 8 characters.");
  }
  const buf = Buffer.isBuffer(arrayBuffer) ? arrayBuffer : Buffer.from(arrayBuffer);
  return officeCrypto.encrypt(buf, { password });
}

/**
 * Defensive key sanitizer to prevent prototype pollution
 */
export function sanitizeRowObject(rawRow) {
  const safeObj = {};
  for (const [key, val] of Object.entries(rawRow)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      continue;
    }
    safeObj[key] = val;
  }
  return safeObj;
}

/**
 * Initialize a fresh database with 15 standardized worksheets
 */
export function createNewDatabase({
  currency = DEFAULT_CURRENCY,
  startingDate = getTodayDateStr(),
  openingBalance = 0,
  userName = "Personal User"
} = {}) {
  const databaseId = generateDatabaseId();
  const now = getNowISO();
  const numOpening = Number(openingBalance) || 0;

  const sheets = {};

  // Initialize empty sheets
  SHEET_NAMES.forEach((name) => {
    sheets[name] = [];
  });

  // 1. Backup_Metadata
  sheets.Backup_Metadata = [
    {
      Database_ID: databaseId,
      Record_ID: generateRecordId("META"),
      Backup_Version: BACKUP_VERSION,
      Schema_Version: SCHEMA_VERSION,
      Created_Date: now,
      Updated_Date: now,
      Total_Records: 0,
      Currency: currency,
      Starting_Financial_Date: startingDate,
      Opening_Cash_Balance: numOpening,
      Notes: `Personal Finance Database created with Excel-only DB engine for ${userName}`
    }
  ];

  // 15. Financial_Settings
  sheets.Financial_Settings = [
    {
      Database_ID: databaseId,
      Record_ID: generateRecordId("SET"),
      Setting_Key: "Currency",
      Setting_Value: currency,
      Description: "Primary currency symbol and code",
      Updated_Date: now
    },
    {
      Database_ID: databaseId,
      Record_ID: generateRecordId("SET"),
      Setting_Key: "Starting_Financial_Date",
      Setting_Value: startingDate,
      Description: "Date of financial tracking initiation",
      Updated_Date: now
    },
    {
      Database_ID: databaseId,
      Record_ID: generateRecordId("SET"),
      Setting_Key: "Opening_Cash_Balance",
      Setting_Value: String(numOpening),
      Description: "Initial opening cash on hand / bank",
      Updated_Date: now
    },
    {
      Database_ID: databaseId,
      Record_ID: generateRecordId("SET"),
      Setting_Key: "User_Name",
      Setting_Value: userName,
      Description: "Account holder name",
      Updated_Date: now
    },
    {
      Database_ID: databaseId,
      Record_ID: generateRecordId("SET"),
      Setting_Key: "Theme",
      Setting_Value: "light",
      Description: "UI color mode",
      Updated_Date: now
    }
  ];

  // 10. Categories
  sheets.Categories = DEFAULT_CATEGORIES.map((cat) => ({
    Database_ID: databaseId,
    Record_ID: generateRecordId("CAT"),
    Category_Type: cat.Category_Type,
    Category_Name: cat.Category_Name,
    Color: cat.Color,
    Icon: cat.Icon,
    Created_Date: now,
    Updated_Date: now
  }));

  // 4. Savings_Accounts
  sheets.Savings_Accounts = DEFAULT_SAVINGS_ACCOUNTS.map((acc) => ({
    Database_ID: databaseId,
    Record_ID: generateRecordId("SAV-ACC"),
    Account_Name: acc.Account_Name,
    Target_Amount: acc.Target_Amount,
    Notes: acc.Notes,
    Created_Date: now,
    Updated_Date: now
  }));

  // 11. Transactions (Opening balance if any)
  if (numOpening > 0) {
    const txId = generateTransactionId();
    sheets.Transactions.push({
      Database_ID: databaseId,
      Record_ID: generateRecordId("TX"),
      Transaction_ID: txId,
      Transaction_Date: startingDate,
      Transaction_Type: "Opening_Balance",
      Category: "Opening Balance",
      Description: "Initial Cash Opening Balance",
      Cash_Flow_Type: "Inflow",
      Amount: numOpening,
      Related_Record_ID: "INITIAL",
      Created_Date: now,
      Updated_Date: now
    });
  }

  // Recalculate total records
  let totalRecords = 0;
  SHEET_NAMES.forEach((name) => {
    totalRecords += sheets[name].length;
  });
  sheets.Backup_Metadata[0].Total_Records = totalRecords;

  return {
    databaseId,
    sheets,
    metadata: sheets.Backup_Metadata[0],
    filename: WORKBOOK_NAME,
    lastSaved: now,
    isDirty: false
  };
}

/**
 * Write active database state into XLSX ArrayBuffer with Formula Injection protection
 */
export function writeWorkbookToBuffer(databaseData, password = null) {
  const wb = XLSX.utils.book_new();
  const sheets = databaseData.sheets || {};
  const now = getNowISO();

  // Calculate accurate total records across all worksheets
  let totalRecords = 0;
  SHEET_NAMES.forEach((name) => {
    if (sheets[name]) {
      totalRecords += sheets[name].length;
    }
  });

  // Update metadata record count and updated timestamp
  if (sheets.Backup_Metadata && sheets.Backup_Metadata[0]) {
    sheets.Backup_Metadata[0].Total_Records = totalRecords;
    sheets.Backup_Metadata[0].Updated_Date = now;
  }

  // Append each worksheet with guaranteed column order and sanitized cell text
  SHEET_NAMES.forEach((sheetName) => {
    const records = sheets[sheetName] || [];
    const headers = SHEET_HEADERS[sheetName] || [];

    // Sanitize records to prevent Formula Injection (CWE-1236)
    const sanitizedRecords = records.map((row) => {
      const sanitizedRow = {};
      headers.forEach((header) => {
        const rawVal = row[header];
        sanitizedRow[header] = sanitizeSpreadsheetValue(rawVal);
      });
      return sanitizedRow;
    });

    const ws = XLSX.utils.json_to_sheet(sanitizedRecords, {
      header: headers
    });

    // Set column width autofit styling
    ws["!cols"] = headers.map((h) => ({
      wch: Math.max(h.length + 4, 14)
    }));

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  // Output as standard ArrayBuffer
  const buffer = XLSX.write(wb, {
    bookType: "xlsx",
    type: "array"
  });

  if (password) {
    return encryptWorkbookBuffer(buffer, password);
  }

  return buffer;
}

/**
 * Trigger browser file download of the workbook
 */
export function downloadWorkbookFile(databaseData, customFilename, password = null) {
  const filename = customFilename || databaseData.filename || WORKBOOK_NAME;
  const buffer = writeWorkbookToBuffer(databaseData, password);
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return true;
}

/**
 * Parse and validate an Excel file ArrayBuffer with strict security protections
 */
export function readWorkbookFromBuffer(arrayBuffer, filename = WORKBOOK_NAME) {
  // 1. File Size Validation
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    return {
      success: false,
      error: "Import Error: The selected file is completely empty."
    };
  }

  if (arrayBuffer.byteLength > MAX_FILE_SIZE_BYTES) {
    return {
      success: false,
      error: `Security Error: File size (${(arrayBuffer.byteLength / (1024 * 1024)).toFixed(1)}MB) exceeds the maximum allowed security limit of 25MB.`
    };
  }

  // 2. Extension check
  if (filename && !filename.toLowerCase().endsWith(".xlsx")) {
    return {
      success: false,
      error: "Format Error: Only OpenXML Excel (.xlsx) workbooks are supported."
    };
  }

  // 3. Encrypted check & Magic Bytes Validation (ZIP / OOXML container)
  if (isEncryptedWorkbook(arrayBuffer)) {
    return {
      success: false,
      isEncrypted: true,
      error: "Encrypted Excel File: This workbook is password-protected. Please enter the password to decrypt it."
    };
  }

  if (!validateXLSXMagicBytes(arrayBuffer)) {
    return {
      success: false,
      error: "Corrupted File Error: The file does not have valid OpenXML Excel container signatures."
    };
  }

  try {
    // 4. Safe XLSX parsing flags (Disables formula execution, HTML parsing, macro execution)
    const wb = XLSX.read(arrayBuffer, {
      type: "array",
      cellFormula: false, // Never evaluate or extract formulas
      cellHTML: false,    // Never decode cell HTML into strings (prevents stored XSS)
      cellNF: false,      // Disables number format eval
      WTF: false,
      raw: true           // Raw cell values only
    });

    // 5. Worksheet presence validation
    const missingSheets = SHEET_NAMES.filter((name) => !wb.SheetNames.includes(name));

    if (missingSheets.length > 0) {
      return {
        success: false,
        error: `Invalid Financial Database: Missing ${missingSheets.length} required worksheet(s): ${missingSheets.join(", ")}`
      };
    }

    const sheets = {};
    let totalRecords = 0;

    SHEET_NAMES.forEach((sheetName) => {
      const ws = wb.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json(ws, { defval: "" });
      // Apply prototype pollution guard
      const safeRows = rawRows.map(sanitizeRowObject);
      sheets[sheetName] = safeRows;
      totalRecords += safeRows.length;
    });

    // Extract metadata
    const metadata = sheets.Backup_Metadata?.[0] || {};
    const databaseId = metadata.Database_ID || `DB-RESTORED-${Date.now().toString(36).toUpperCase()}`;

    // 6. Schema Compatibility Verification
    const schemaVer = String(metadata.Schema_Version || "1.0");
    const majorVer = parseFloat(schemaVer);
    if (!isNaN(majorVer) && majorVer > 2.0) {
      return {
        success: false,
        error: `Compatibility Error: The workbook requires database schema v${schemaVer}, but this application version only supports schemas up to v2.x.`
      };
    }

    // 7. Normalize numeric fields safely across critical sheets
    const normalizeAmount = (val) => {
      const num = Number(val);
      return isNaN(num) ? 0 : Math.max(0, num);
    };

    if (sheets.Salary) {
      sheets.Salary.forEach((r) => {
        r.Basic_Salary = normalizeAmount(r.Basic_Salary);
        r.Allowances = normalizeAmount(r.Allowances);
        r.Bonuses = normalizeAmount(r.Bonuses);
        r.Additional_Income = normalizeAmount(r.Additional_Income);
        r.Total_Salary = r.Basic_Salary + r.Allowances + r.Bonuses + r.Additional_Income;
      });
    }

    if (sheets.Salary_Deductions) {
      sheets.Salary_Deductions.forEach((r) => {
        r.Amount = normalizeAmount(r.Amount);
      });
    }

    if (sheets.Expenses) {
      sheets.Expenses.forEach((r) => {
        r.Amount = normalizeAmount(r.Amount);
      });
    }

    if (sheets.Savings_Transactions) {
      sheets.Savings_Transactions.forEach((r) => {
        r.Amount = normalizeAmount(r.Amount);
      });
    }

    if (sheets.Lending) {
      sheets.Lending.forEach((r) => {
        r.Amount = normalizeAmount(r.Amount);
        r.Repaid_Amount = normalizeAmount(r.Repaid_Amount);
        r.Remaining_Balance = Math.max(0, r.Amount - r.Repaid_Amount);
      });
    }

    if (sheets.Borrowing) {
      sheets.Borrowing.forEach((r) => {
        r.Amount = normalizeAmount(r.Amount);
        r.Repaid_Amount = normalizeAmount(r.Repaid_Amount);
        r.Remaining_Balance = Math.max(0, r.Amount - r.Repaid_Amount);
      });
    }

    if (sheets.Loan_Repayments) {
      sheets.Loan_Repayments.forEach((r) => {
        r.Amount = normalizeAmount(r.Amount);
      });
    }

    if (sheets.Transactions) {
      sheets.Transactions.forEach((r) => {
        r.Amount = normalizeAmount(r.Amount);
      });
    }

    if (sheets.Budgets) {
      sheets.Budgets.forEach((r) => {
        r.Allocated_Amount = normalizeAmount(r.Allocated_Amount);
      });
    }

    if (sheets.Savings_Goals) {
      sheets.Savings_Goals.forEach((r) => {
        r.Target_Amount = normalizeAmount(r.Target_Amount);
      });
    }

    const summary = {
      databaseId,
      schemaVersion: metadata.Schema_Version || "2.0",
      backupVersion: metadata.Backup_Version || "2.0",
      totalRecords,
      currency: metadata.Currency || DEFAULT_CURRENCY,
      createdDate: metadata.Created_Date || "",
      lastUpdated: metadata.Updated_Date || "",
      openingCash: Number(metadata.Opening_Cash_Balance) || 0,
      sheetCounts: Object.fromEntries(SHEET_NAMES.map((name) => [name, sheets[name]?.length || 0]))
    };

    return {
      success: true,
      databaseId,
      sheets,
      metadata,
      summary,
      filename,
      lastSaved: metadata.Updated_Date || getNowISO(),
      isDirty: false
    };
  } catch (err) {
    return {
      success: false,
      error: `Failed to read Excel workbook: ${err.message}`
    };
  }
}

/**
 * Validate workbook data integrity, broken relationships, and consistency
 */
export function validateWorkbook(databaseData) {
  const sheets = databaseData?.sheets || {};
  const warnings = [];
  const errors = [];

  if (!sheets.Backup_Metadata || sheets.Backup_Metadata.length === 0) {
    errors.push("Critical Error: Missing Backup_Metadata worksheet records.");
  }

  // 1. ID uniqueness checks across records and transactions
  const seenRecordIds = new Set();
  const seenTransactionIds = new Set();
  let duplicateRecordsCount = 0;
  let duplicateTxCount = 0;

  SHEET_NAMES.forEach((sheetName) => {
    const records = sheets[sheetName] || [];
    records.forEach((rec) => {
      if (rec.Record_ID) {
        if (seenRecordIds.has(rec.Record_ID)) {
          duplicateRecordsCount++;
        } else {
          seenRecordIds.add(rec.Record_ID);
        }
      }

      if (rec.Transaction_ID) {
        if (seenTransactionIds.has(rec.Transaction_ID)) {
          duplicateTxCount++;
        } else {
          seenTransactionIds.add(rec.Transaction_ID);
        }
      }
    });
  });

  if (duplicateRecordsCount > 0) {
    warnings.push(`Detected ${duplicateRecordsCount} duplicate Record ID(s) across sheets.`);
  }
  if (duplicateTxCount > 0) {
    warnings.push(`Detected ${duplicateTxCount} duplicate Transaction ID(s) across sheets.`);
  }

  // 2. Relational Integrity Checks
  const salaryRecordIds = new Set((sheets.Salary || []).map((s) => s.Record_ID));
  const savingsAccountIds = new Set((sheets.Savings_Accounts || []).map((a) => a.Record_ID));
  const lendingRecordIds = new Set((sheets.Lending || []).map((l) => l.Record_ID));
  const borrowingRecordIds = new Set((sheets.Borrowing || []).map((b) => b.Record_ID));

  // Verify Salary Deductions relationships
  (sheets.Salary_Deductions || []).forEach((d) => {
    if (d.Salary_Record_ID && !salaryRecordIds.has(d.Salary_Record_ID)) {
      warnings.push(`Orphan Deduction: Deduction ${d.Record_ID} references non-existent Salary ${d.Salary_Record_ID}.`);
    }
    if (d.Category === "Savings" && d.Auto_Deposit_Savings_Account_ID && !savingsAccountIds.has(d.Auto_Deposit_Savings_Account_ID)) {
      warnings.push(`Orphan Savings Deposit: Deduction ${d.Record_ID} targets non-existent Savings Account ${d.Auto_Deposit_Savings_Account_ID}.`);
    }
    if (Number(d.Amount) < 0) {
      errors.push(`Invalid Amount: Deduction ${d.Record_ID} has negative amount.`);
    }
  });

  // Verify Savings Transactions relationships
  (sheets.Savings_Transactions || []).forEach((tx) => {
    if (tx.Account_ID && !savingsAccountIds.has(tx.Account_ID)) {
      warnings.push(`Orphan Savings Transaction: ${tx.Record_ID} references unknown Account ID ${tx.Account_ID}.`);
    }
    if (Number(tx.Amount) < 0) {
      errors.push(`Invalid Amount: Savings transaction ${tx.Record_ID} has negative amount.`);
    }
  });

  // Verify Loan Repayments relationships
  (sheets.Loan_Repayments || []).forEach((rep) => {
    const isLending = lendingRecordIds.has(rep.Related_Loan_ID);
    const isBorrowing = borrowingRecordIds.has(rep.Related_Loan_ID);
    if (!isLending && !isBorrowing) {
      warnings.push(`Orphan Loan Repayment: Repayment ${rep.Record_ID} references unknown Loan ID ${rep.Related_Loan_ID}.`);
    }
    if (Number(rep.Amount) <= 0) {
      errors.push(`Invalid Repayment Amount: Repayment ${rep.Record_ID} amount must be greater than zero.`);
    }
  });

  // 3. Balance Integrity Check: Savings Accounts balance >= 0
  const accountBalances = {};
  (sheets.Savings_Accounts || []).forEach((acc) => {
    accountBalances[acc.Record_ID] = { name: acc.Account_Name, balance: 0 };
  });

  (sheets.Savings_Transactions || []).forEach((tx) => {
    const acc = accountBalances[tx.Account_ID];
    const amt = Number(tx.Amount) || 0;
    if (acc) {
      if (tx.Transaction_Type === "Deposit") {
        acc.balance += amt;
      } else if (tx.Transaction_Type === "Withdrawal") {
        acc.balance -= amt;
      }
    }
  });

  Object.values(accountBalances).forEach((acc) => {
    if (acc.balance < 0) {
      errors.push(`Negative Savings Balance: Account '${acc.name}' has negative balance (${acc.balance.toLocaleString()}). Withdrawals exceeded deposits.`);
    }
  });

  // 4. Balance Integrity Check: Lending
  (sheets.Lending || []).forEach((item) => {
    const total = Number(item.Amount) || 0;
    const repaid = Number(item.Repaid_Amount) || 0;
    const remaining = Number(item.Remaining_Balance) || 0;

    if (total < 0 || repaid < 0 || remaining < 0) {
      errors.push(`Negative Loan Value: Lending record for '${item.Person_Name}' contains negative amounts.`);
    }
    if (repaid > total) {
      errors.push(`Over-repayment Error: Lending record for '${item.Person_Name}' has repaid amount (${repaid}) greater than principal (${total}).`);
    }
    if (Math.abs(total - repaid - remaining) > 0.01) {
      warnings.push(`Lending Balance Mismatch: '${item.Person_Name}' Principal (${total}) != Repaid (${repaid}) + Remaining (${remaining}).`);
    }
  });

  // 5. Balance Integrity Check: Borrowing
  (sheets.Borrowing || []).forEach((item) => {
    const total = Number(item.Amount) || 0;
    const repaid = Number(item.Repaid_Amount) || 0;
    const remaining = Number(item.Remaining_Balance) || 0;

    if (total < 0 || repaid < 0 || remaining < 0) {
      errors.push(`Negative Debt Value: Borrowing record for '${item.Person_Name}' contains negative amounts.`);
    }
    if (repaid > total) {
      errors.push(`Over-repayment Error: Borrowing record for '${item.Person_Name}' has repaid debt (${repaid}) greater than principal (${total}).`);
    }
    if (Math.abs(total - repaid - remaining) > 0.01) {
      warnings.push(`Borrowing Balance Mismatch: '${item.Person_Name}' Principal (${total}) != Repaid (${repaid}) + Remaining (${remaining}).`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalUniqueRecords: seenRecordIds.size,
      totalTransactions: seenTransactionIds.size,
      sheetsChecked: SHEET_NAMES.length
    }
  };
}

/**
 * Merge an imported workbook into the current active workbook
 */
export function mergeWorkbooks(currentDb, importedDb) {
  const mergedSheets = {};
  const currentSheets = currentDb.sheets || {};
  const importedSheets = importedDb.sheets || {};

  let addedCount = 0;
  let updatedCount = 0;
  let skippedDuplicates = 0;

  SHEET_NAMES.forEach((sheetName) => {
    if (sheetName === "Backup_Metadata") {
      // Keep primary database ID, bump updated date
      mergedSheets.Backup_Metadata = [
        {
          ...currentSheets.Backup_Metadata[0],
          Updated_Date: getNowISO(),
          Notes: `Merged with external DB ${importedDb.databaseId} at ${getNowISO()}`
        }
      ];
      return;
    }

    const currentRecords = [...(currentSheets[sheetName] || [])];
    const importedRecords = importedSheets[sheetName] || [];

    const recordMap = new Map();
    currentRecords.forEach((r) => {
      if (r.Record_ID) {
        recordMap.set(r.Record_ID, r);
      }
    });

    importedRecords.forEach((impRec) => {
      if (!impRec.Record_ID) {
        // Missing Record ID, generate one and add
        const newRec = { ...impRec, Record_ID: generateRecordId() };
        currentRecords.push(newRec);
        addedCount++;
        return;
      }

      if (recordMap.has(impRec.Record_ID)) {
        const existing = recordMap.get(impRec.Record_ID);
        const existingUpdated = new Date(existing.Updated_Date || 0).getTime();
        const importedUpdated = new Date(impRec.Updated_Date || 0).getTime();

        if (importedUpdated > existingUpdated) {
          // Replace with newer record
          const idx = currentRecords.findIndex((r) => r.Record_ID === impRec.Record_ID);
          if (idx !== -1) {
            currentRecords[idx] = impRec;
            updatedCount++;
          }
        } else {
          skippedDuplicates++;
        }
      } else {
        currentRecords.push(impRec);
        recordMap.set(impRec.Record_ID, impRec);
        addedCount++;
      }
    });

    mergedSheets[sheetName] = currentRecords;
  });

  const now = getNowISO();
  let totalRecords = 0;
  SHEET_NAMES.forEach((name) => {
    totalRecords += mergedSheets[name].length;
  });
  mergedSheets.Backup_Metadata[0].Total_Records = totalRecords;

  return {
    databaseId: currentDb.databaseId,
    sheets: mergedSheets,
    metadata: mergedSheets.Backup_Metadata[0],
    filename: currentDb.filename || WORKBOOK_NAME,
    lastSaved: now,
    isDirty: true,
    stats: {
      addedCount,
      updatedCount,
      skippedDuplicates,
      totalRecords
    }
  };
}
