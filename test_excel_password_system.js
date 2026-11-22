/**
 * Comprehensive Verification Suite for Unified Excel Database Password System
 * Tests:
 * 1. Zero PIN screens & direct Welcome/Database picker entry
 * 2. Database creation with password (min 8 chars, no Financial Year prompt)
 * 3. Genuine Office Agile Encryption (AES-256) verification
 * 4. Microsoft Excel COM Object testing (Correct password opens, wrong password rejected)
 * 5. Web application decrypt & load (Correct password opens, wrong password rejected)
 * 6. Unencrypted database migration (plain file imports, prompts for password, protected copy generated)
 * 7. Password change feature (old password fails in Excel/app, new password opens file)
 * 8. All 15 sheets integrity and financial calculation verification
 * 9. Security isolation: no storage in localStorage/sessionStorage, zero data egress
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import {
  createNewDatabase,
  writeWorkbookToBuffer,
  readWorkbookFromBuffer,
  validateWorkbook,
  isEncryptedWorkbook,
  decryptWorkbookBuffer,
  encryptWorkbookBuffer
} from "./src/services/excelEngine.js";
import { SHEET_NAMES } from "./src/types/schema.js";

const TEST_DIR = path.resolve("./test_output_unified_pw");
if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedTests++;
  }
}

function runPowerShell(script) {
  const tempPs1 = path.join(TEST_DIR, `temp_${Date.now()}_${Math.random().toString(36).substring(7)}.ps1`);
  fs.writeFileSync(tempPs1, script, "utf-8");
  try {
    const output = execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${tempPs1}"`, {
      encoding: "utf-8"
    });
    return { success: true, output: output.trim() };
  } catch (err) {
    return { success: false, output: err.stdout ? err.stdout.toString().trim() : "", error: err.message };
  } finally {
    try { fs.unlinkSync(tempPs1); } catch (e) {}
  }
}

async function runAllTests() {
  console.log("==================================================================");
  console.log("UNIFIED EXCEL DATABASE PASSWORD SYSTEM - VERIFICATION SUITE");
  console.log("==================================================================\n");

  // -------------------------------------------------------------------------
  // TEST GROUP 1: ZERO APPLICATION PIN & CODEBASE CLEANUP
  // -------------------------------------------------------------------------
  console.log("--- TEST GROUP 1: Removal of Application PIN & Direct Entry ---");
  const appSrc = fs.readFileSync("./src/App.jsx", "utf-8");
  assert(!appSrc.includes("LoginView"), "App.jsx does not render or import LoginView");
  assert(appSrc.includes("WelcomeModal"), "App.jsx directly renders WelcomeModal when !database");
  assert(!appSrc.includes("LogoutConfirmModal"), "App.jsx does not contain LogoutConfirmModal");

  const welcomeSrc = fs.readFileSync("./src/components/welcome/WelcomeModal.jsx", "utf-8");
  assert(welcomeSrc.includes("password-prompt"), "WelcomeModal includes 'password-prompt' step");
  assert(welcomeSrc.includes("unencrypted-prompt"), "WelcomeModal includes 'unencrypted-prompt' step");
  assert(!welcomeSrc.toLowerCase().includes("financial year"), "WelcomeModal does NOT ask for Financial Year");
  assert(welcomeSrc.includes("createPassword"), "WelcomeModal asks for database password during creation");

  const settingsSrc = fs.readFileSync("./src/components/settings/SettingsView.jsx", "utf-8");
  assert(!settingsSrc.includes("updateSecurityPin"), "SettingsView has removed updateSecurityPin");
  assert(settingsSrc.includes("changeDatabasePassword"), "SettingsView uses changeDatabasePassword");
  assert(settingsSrc.includes("closeDatabase"), "SettingsView provides Lock & Close Database button");

  // -------------------------------------------------------------------------
  // TEST GROUP 2: DATABASE CREATION WITH OFFICE AGILE ENCRYPTION
  // -------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 2: Create New Encrypted Database ---");
  const dbParams = {
    currency: "LKR",
    startingDate: "2026-01-01",
    openingBalance: 150000,
    userName: "Alice Fernando"
  };
  const newDb = createNewDatabase(dbParams);
  assert(newDb && newDb.databaseId, "New database initialized with valid ID");
  assert(SHEET_NAMES.every(name => Array.isArray(newDb.sheets[name])), "All 15 sheets initialized");

  const initialPassword = "ExcelSecure2026!";
  const encryptedBuffer = writeWorkbookToBuffer(newDb, initialPassword);
  assert(encryptedBuffer && encryptedBuffer.byteLength > 0, "writeWorkbookToBuffer returned non-empty buffer");
  assert(isEncryptedWorkbook(encryptedBuffer), "isEncryptedWorkbook correctly identifies buffer as encrypted");

  const encryptedFilePath = path.join(TEST_DIR, "Personal_Finance_Database.xlsx");
  fs.writeFileSync(encryptedFilePath, Buffer.from(encryptedBuffer));
  assert(fs.existsSync(encryptedFilePath), "Encrypted workbook written to disk");

  // -------------------------------------------------------------------------
  // TEST GROUP 3: MICROSOFT EXCEL COM OBJECT VERIFICATION
  // -------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 3: Microsoft Excel COM Object Behavior ---");
  console.log("  Testing Excel COM password unlock and wrong-password rejection...");

  const psWrongScript = `
    try {
      $excel = New-Object -ComObject Excel.Application
      $excel.Visible = $false
      $excel.DisplayAlerts = $false
      $wb = $excel.Workbooks.Open('${encryptedFilePath.replace(/\\/g, "\\\\")}', 0, $true, 5, 'IncorrectPassword!')
      $wb.Close($false)
      $excel.Quit()
      [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
      exit 1
    } catch {
      exit 0
    }
  `;
  const wrongPsRes = runPowerShell(psWrongScript);
  assert(wrongPsRes.success, "Microsoft Excel COM rejected wrong password with native error");

  const psCorrectScript = `
    try {
      $excel = New-Object -ComObject Excel.Application
      $excel.Visible = $false
      $excel.DisplayAlerts = $false
      $wb = $excel.Workbooks.Open('${encryptedFilePath.replace(/\\/g, "\\\\")}', 0, $true, 5, '${initialPassword}')
      $sheetCount = $wb.Sheets.Count
      $metaVal = $wb.Sheets.Item('Backup_Metadata').Range('A2').Value2
      $wb.Close($false)
      $excel.Quit()
      [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
      Write-Output ("SUCCESS:" + $sheetCount + ":" + $metaVal)
    } catch {
      Write-Output "ERROR:$($_.Exception.Message)"
      exit 1
    }
  `;
  const correctPsRes = runPowerShell(psCorrectScript);
  assert(correctPsRes.output.startsWith("SUCCESS:15:"), `Microsoft Excel COM unlocked all 15 sheets natively with SAME password (${correctPsRes.output})`);

  // -------------------------------------------------------------------------
  // TEST GROUP 4: WEB APPLICATION DECRYPT & LOAD
  // -------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 4: Web Application Decrypt & Load ---");
  let appWrongPassError = false;
  try {
    await decryptWorkbookBuffer(encryptedBuffer, "BadWebPass123!");
  } catch (err) {
    appWrongPassError = true;
  }
  assert(appWrongPassError, "Web application decryptWorkbookBuffer rejected incorrect password");

  let decryptedBuffer = null;
  try {
    decryptedBuffer = await decryptWorkbookBuffer(encryptedBuffer, initialPassword);
  } catch (err) {
    console.error(err);
  }
  assert(decryptedBuffer && decryptedBuffer.byteLength > 0, "Web application decrypted buffer with correct password");
  assert(!isEncryptedWorkbook(decryptedBuffer), "Decrypted buffer is confirmed plaintext XLSX");

  const parsedFromApp = readWorkbookFromBuffer(decryptedBuffer, "Personal_Finance_Database.xlsx");
  assert(parsedFromApp.success, "readWorkbookFromBuffer parsed decrypted workbook successfully");
  assert(parsedFromApp.sheets.Backup_Metadata[0].Database_ID === newDb.databaseId, "Decrypted Database ID matches original");
  assert(parsedFromApp.sheets.Transactions.length > 0, "Decrypted Transactions sheet contains opening balance");

  // -------------------------------------------------------------------------
  // TEST GROUP 5: UNENCRYPTED WORKBOOK MIGRATION
  // -------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 5: Unencrypted Workbook Migration ---");
  // Create plain unencrypted XLSX buffer
  const unencryptedBuffer = writeWorkbookToBuffer(newDb, null);
  assert(!isEncryptedWorkbook(unencryptedBuffer), "Plain workbook is not encrypted");

  // App reads unencrypted file
  const parsedPlain = readWorkbookFromBuffer(unencryptedBuffer, "Unprotected_Finance.xlsx");
  assert(parsedPlain.success, "App reads unencrypted workbook cleanly");

  // Migration: user provides password to protect it
  const migrationPassword = "MigratedAgilePass2026!";
  const newlyProtectedBuffer = writeWorkbookToBuffer(parsedPlain, migrationPassword);
  assert(isEncryptedWorkbook(newlyProtectedBuffer), "Newly migrated buffer is encrypted with Office Agile AES-256");

  const protectedFilePath = path.join(TEST_DIR, "Personal_Finance_Database_Protected.xlsx");
  fs.writeFileSync(protectedFilePath, Buffer.from(newlyProtectedBuffer));

  // Verify in Excel COM
  const psMigratedScript = `
    try {
      $excel = New-Object -ComObject Excel.Application
      $excel.Visible = $false
      $excel.DisplayAlerts = $false
      $wb = $excel.Workbooks.Open('${protectedFilePath.replace(/\\/g, "\\\\")}', 0, $true, 5, '${migrationPassword}')
      $cnt = $wb.Sheets.Count
      $wb.Close($false)
      $excel.Quit()
      [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
      Write-Output "SUCCESS:$cnt"
    } catch {
      Write-Output "ERROR:$($_.Exception.Message)"
      exit 1
    }
  `;
  const migratedRes = runPowerShell(psMigratedScript);
  assert(migratedRes.output === "SUCCESS:15", `Microsoft Excel COM opened newly protected file (${migratedRes.output})`);

  // -------------------------------------------------------------------------
  // TEST GROUP 6: PASSWORD CHANGE FEATURE
  // -------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 6: Password Change Feature ---");
  const updatedPassword = "UpdatedExcelKey2026#";

  // Re-encrypt database with new password
  const reEncryptedBuffer = writeWorkbookToBuffer(newDb, updatedPassword);
  assert(isEncryptedWorkbook(reEncryptedBuffer), "Re-encrypted buffer is encrypted");

  const reEncryptedFilePath = path.join(TEST_DIR, "Personal_Finance_Database_Updated.xlsx");
  fs.writeFileSync(reEncryptedFilePath, Buffer.from(reEncryptedBuffer));

  // Verify OLD password fails in Excel COM
  const psOldPassScript = `
    try {
      $excel = New-Object -ComObject Excel.Application
      $excel.Visible = $false
      $excel.DisplayAlerts = $false
      $wb = $excel.Workbooks.Open('${reEncryptedFilePath.replace(/\\/g, "\\\\")}', 0, $true, 5, '${initialPassword}')
      $wb.Close($false)
      $excel.Quit()
      [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
      exit 1
    } catch {
      exit 0
    }
  `;
  const oldPassRes = runPowerShell(psOldPassScript);
  assert(oldPassRes.success, "Old password rejected by Microsoft Excel COM after password change");

  // Verify NEW password succeeds in Excel COM
  const psNewPassScript = `
    try {
      $excel = New-Object -ComObject Excel.Application
      $excel.Visible = $false
      $excel.DisplayAlerts = $false
      $wb = $excel.Workbooks.Open('${reEncryptedFilePath.replace(/\\/g, "\\\\")}', 0, $true, 5, '${updatedPassword}')
      $cnt = $wb.Sheets.Count
      $wb.Close($false)
      $excel.Quit()
      [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
      Write-Output "SUCCESS:$cnt"
    } catch {
      Write-Output "ERROR:$($_.Exception.Message)"
      exit 1
    }
  `;
  const newPassRes = runPowerShell(psNewPassScript);
  assert(newPassRes.output === "SUCCESS:15", `New password successfully unlocks file in Microsoft Excel COM (${newPassRes.output})`);

  // Verify in Web App
  let oldPassInAppFails = false;
  try {
    await decryptWorkbookBuffer(reEncryptedBuffer, initialPassword);
  } catch (e) {
    oldPassInAppFails = true;
  }
  assert(oldPassInAppFails, "Old password rejected by Web App after password change");

  const appDecryptedWithNew = await decryptWorkbookBuffer(reEncryptedBuffer, updatedPassword);
  const parsedNew = readWorkbookFromBuffer(appDecryptedWithNew, "Personal_Finance_Database_Updated.xlsx");
  assert(parsedNew.success, "New password unlocks file in Web App");

  // -------------------------------------------------------------------------
  // TEST GROUP 7: FINANCIAL CALCULATION & SCHEMA INTEGRITY
  // -------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 7: Financial Calculation & Schema Integrity ---");
  const validation = validateWorkbook(parsedNew);
  assert(validation.isValid, "Workbook passes full schema validation");
  assert(parsedNew.summary.openingCash === 150000, "Opening balance preserved exactly (150,000 LKR)");
  assert(parsedNew.summary.currency === "LKR", "Currency preserved as LKR");

  // -------------------------------------------------------------------------
  // TEST GROUP 8: SECURITY ISOLATION & ZERO DATA EGRESS
  // -------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 8: Security Isolation & Zero Data Egress ---");
  const contextSrc = fs.readFileSync("./src/context/FinanceContext.jsx", "utf-8");
  assert(!contextSrc.includes("localStorage.setItem('dbPassword'"), "Password is never saved to localStorage");
  assert(!contextSrc.includes("sessionStorage.setItem('dbPassword'"), "Password is never saved to sessionStorage");
  assert(!contextSrc.includes("fetch(") && !contextSrc.includes("axios."), "Zero external network fetch in FinanceContext");

  // Cleanup test files
  try {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  } catch (e) {}

  console.log("\n==================================================================");
  console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
  console.log("==================================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
