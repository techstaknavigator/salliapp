# Personal Salary & Finance Manager

> **A 100% Client-Side Personal Salary and Finance Management Web Application with an Excel-Only Database Architecture.**  
> Zero Backend • Zero Cloud Databases • Deployable directly to **Vercel** or **Netlify**.

---

## 🌟 Key Architecture: Excel Is The Only Permanent Database

This application deliberately avoids MySQL, MariaDB, PHP, Firebase, Supabase, MongoDB, or any server-side database. 

All financial records are stored and permanently persisted exclusively in a standardized multi-sheet Excel workbook:  
📂 **`Personal_Finance_Database.xlsx`**

Every transaction is read from and written directly to this workbook inside the client's web browser using **SheetJS (xlsx)** and the modern **File System Access API** (with a universal fallback download/import mechanism).

---

## 📑 Excel Database Structure (15 Standardized Worksheets)

The workbook maintains complete relational and chronological financial data across 15 worksheets with permanent unique IDs:

| # | Worksheet Name | Description & Unique Identifiers |
|---|---|---|
| 1 | **Backup_Metadata** | Database ID (`DB-YYYYMMDD-XXXX`), Schema Version 2.0, Backup Version 2.0, Created/Updated Date, Currency (`LKR`), Opening Balance, Total Records. |
| 2 | **Salary** | Monthly gross income (`SAL-XXXXXX`), manual arrival dates, Basic, Allowances, Bonuses, Additional Income, Total, Notes. |
| 3 | **Salary_Deductions** | Deductions (`DED-XXXXXX`) categorized as *Savings*, *Loan Repayment*, *Personal Deduction*, or *Other*. Deductions marked *Savings* auto-generate deposits in `Savings_Transactions`. |
| 4 | **Savings_Accounts** | Multi-account vaults (`SAV-ACC-XXXXXX`): Emergency Savings, Personal Savings, Future Goals, or custom vaults with target amounts. |
| 5 | **Savings_Transactions** | Account deposits and withdrawals (`SAV-TX-XXXXXX`) with balance protection (preventing withdrawals above balance). |
| 6 | **Expenses** | Categorized expenses (`EXP-XXXXXX`): Food, Transport, Bills, Shopping, Family, Health, Education, Entertainment, Other. |
| 7 | **Lending** | Money given to others (`LEND-XXXXXX`): Person name, principal, given date, expected return, repaid amount, remaining balance, status. |
| 8 | **Borrowing** | Money borrowed from others (`BORR-XXXXXX`): Lender name, principal, borrowed date, expected repayment, repaid amount, remaining balance, status. |
| 9 | **Loan_Repayments** | Installment logs (`REP-XXXXXX`) for lending and borrowing with automatic parent balance decrementing. |
| 10 | **Categories** | Customizable taxonomy (`CAT-XXXXXX`) with color tags and icons for expenses, income, and deductions. |
| 11 | **Transactions** | Master chronological double-entry ledger (`TX-XXXXXX`) aggregating every single transaction. |
| 12 | **Budgets** | Monthly category caps (`BUD-XXXXXX`) with real-time percentage progress bars and over-budget warnings. |
| 13 | **Savings_Goals** | Target milestones (`GOAL-XXXXXX`) linked to savings vaults with progress meters and target dates. |
| 14 | **Recurring_Transactions** | Subscriptions and utility commitments (`REC-XXXXXX`) with frequencies and due dates. |
| 15 | **Financial_Settings** | Key-value settings (`SET-XXXXXX`) including currency symbol, owner profile, and date formats. |

---

## 🚀 Live Demo & Technology Stack

- **Framework**: React 18 (Vite SPA)
- **Styling**: Tailwind CSS (with Dark Mode & Light Mode support)
- **Icons**: Lucide Icons
- **Charts**: Chart.js & React-Chartjs-2 (Income vs Expense bar chart, Savings growth trend line, Category doughnut)
- **Database Engine**: SheetJS (`xlsx`)
- **Direct File Sync**: Native Web File System Access API (`showOpenFilePicker`, `showSaveFilePicker`)

---

## 💻 Local Development Setup

### 1. Prerequisites
- **Node.js**: v18+ or v20+ LTS
- **npm**: v9+ or v10+

### 2. Install & Start Development Server
```bash
# Clone or navigate to the project directory
cd c:\xampp\htdocs\SalaryApp

# Install dependencies
npm install

# Start local Vite development server
npm run dev
```
Open your browser at `http://localhost:3000`.

### 3. Build for Production
```bash
npm run build
```
This generates the optimized static assets in the `dist/` directory.

---

## 🌐 Deployment to Vercel & Netlify

Because this is a 100% static React application with zero server endpoints, it deploys seamlessly to static hosting platforms:

### Option A: Deploy to Vercel
1. Install Vercel CLI (or connect via GitHub repository in the Vercel Dashboard):
   ```bash
   npm i -g vercel
   vercel
   ```
2. Configuration is already defined in `vercel.json`:
   - Framework: `vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`

### Option B: Deploy to Netlify
1. Install Netlify CLI (or push to GitHub and link in the Netlify Dashboard):
   ```bash
   npm i -g netlify-cli
   netlify deploy --prod
   ```
2. Configuration is already defined in `netlify.toml`:
   - Command: `npm run build`
   - Publish directory: `dist`

---

## 🧮 Financial Balances & Accounting Formula

The application strictly implements personal finance accounting formulas:

$$\text{Available Cash} = \text{Opening Balance} + \text{Salary Received} + \text{Other Income} + \text{Borrowed Money} + \text{Lending Repayments Received} + \text{Savings Withdrawals} - \text{Expenses} - \text{Savings Deposits} - \text{Money Lent} - \text{Borrowing Repayments} - \text{Non-Savings Salary Deductions}$$

- **Savings Transfers**: Transferring cash to a savings account reduces liquid cash and increases savings assets (not an expense).
- **Money Lent**: Counted as an Asset / Receivable (`Outstanding Receivables = Sum(Remaining_Balance)`).
- **Money Borrowed**: Counted as a Debt / Liability (`Outstanding Payables = Sum(Remaining_Balance)`).
- **Net Worth**: $\text{Liquid Cash} + \text{Total Savings} + \text{Outstanding Receivables} - \text{Outstanding Payables}$.

---

## 🔒 Complete Data Privacy Guarantee

- **Zero Cloud Storage**: All Excel parsing and compilation occurs inside the browser thread using WebAssembly / JavaScript.
- **No API telemetry**: No financial data is ever transmitted to remote web servers.
- **Interoperability**: You can take your `Personal_Finance_Database.xlsx` file and open it on another device, computer, or spreadsheet editor (Microsoft Excel, LibreOffice, Apple Numbers, Google Sheets) at any time.
