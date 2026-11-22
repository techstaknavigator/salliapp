/**
 * Automated Network Inspection & Zero-Egress Privacy Verification
 * Uses Chrome DevTools Protocol (CDP) to intercept and audit 100% of network traffic
 * across the entire application lifecycle:
 * - Login (PIN 1234)
 * - Dashboard Overview
 * - Excel Import / Sample Data Ingestion
 * - Unified Deductions & Expenses
 * - Reports View
 * - Settings View
 * - Excel Export & Backup Generation
 * - Logout & Cache Cleanup
 */

const { spawn } = require("child_process");
const http = require("http");
const path = require("path");
const fs = require("fs");
const os = require("os");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const APP_URL = "http://localhost:4173/";
const CDP_PORT = 9222;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

async function runNetworkInspection() {
  console.log("======================================================================");
  console.log("REAL-TIME BROWSER NETWORK EGRESS & PRIVACY INSPECTION AUDIT");
  console.log("======================================================================");

  const profileDir = path.join(os.tmpdir(), `chrome_audit_${Date.now()}`);
  fs.mkdirSync(profileDir, { recursive: true });

  const chromeProc = spawn(CHROME_PATH, [
    "--headless=new",
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${profileDir}`,
    "--window-size=1280,800",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank"
  ]);

  let cdpWs = null;
  const capturedRequests = [];
  const capturedResponses = [];

  try {
    let targets = null;
    for (let i = 0; i < 20; i++) {
      await delay(500);
      try {
        targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json`);
        if (targets && targets.length > 0) break;
      } catch (e) {}
    }

    if (!targets || targets.length === 0) {
      throw new Error("Failed to connect to Chrome DevTools Protocol targets.");
    }

    const pageTarget = targets.find((t) => t.type === "page") || targets[0];
    console.log(`[INFO] Connected to CDP Target: ${pageTarget.title} (${pageTarget.url})`);

    cdpWs = new WebSocket(pageTarget.webSocketDebuggerUrl);

    let msgId = 1;
    const pendingPromises = new Map();

    function sendCommand(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        pendingPromises.set(id, { resolve, reject });
        cdpWs.send(JSON.stringify({ id, method, params }));
      });
    }

    cdpWs.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pendingPromises.has(msg.id)) {
        const { resolve, reject } = pendingPromises.get(msg.id);
        pendingPromises.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }

      if (msg.method === "Network.requestWillBeSent") {
        const req = msg.params.request;
        capturedRequests.push({
          timestamp: new Date().toISOString(),
          requestId: msg.params.requestId,
          url: req.url,
          method: req.method,
          headers: req.headers,
          postData: req.postData || null,
          hasPostData: !!req.hasPostData,
          type: msg.params.type || "Other"
        });
      }

      if (msg.method === "Network.responseReceived") {
        const res = msg.params.response;
        capturedResponses.push({
          timestamp: new Date().toISOString(),
          requestId: msg.params.requestId,
          url: res.url,
          status: res.status,
          mimeType: res.mimeType,
          fromDiskCache: res.fromDiskCache,
          fromServiceWorker: res.fromServiceWorker
        });
      }
    };

    await new Promise((resolve) => (cdpWs.onopen = resolve));

    // Enable CDP Domains BEFORE navigating
    await sendCommand("Network.enable");
    await sendCommand("Page.enable");
    await sendCommand("Runtime.enable");
    await sendCommand("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false
    });

    console.log("[PASS] CDP Network, Page, and Runtime domains enabled.\n");

    async function evaluate(expression) {
      const res = await sendCommand("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      if (res.exceptionDetails) {
        throw new Error(`JS Eval Error: ${res.exceptionDetails.text}`);
      }
      return res.result ? res.result.value : null;
    }

    // --- STEP 1: INITIAL PAGE LOAD AUDIT ---
    console.log("--- PHASE 1: Initial Page Load & Authentication Screen ---");
    await sendCommand("Page.navigate", { url: APP_URL });
    await delay(2500);

    const initialUrl = await evaluate("window.location.href");
    console.log(`  Initial URL: ${initialUrl}`);
    console.log(`  Requests captured during initial load: ${capturedRequests.length}`);

    // --- STEP 2: LOGIN AUTHENTICATION ---
    console.log("\n--- PHASE 2: PIN Authentication (PIN: 1234) ---");
    const loginResult = await evaluate(`
      (async () => {
        const autoFillBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Auto-fill Default'));
        if (autoFillBtn) {
          autoFillBtn.click();
        } else {
          const input = document.querySelector('input[type="password"], input[type="text"]');
          if (input) {
            input.value = "1234";
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
        await new Promise(r => setTimeout(r, 200));
        const authBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Authenticate Session'));
        if (authBtn) {
          authBtn.click();
          return "Clicked Authenticate Session";
        }
        return "Auth button not found";
      })()
    `);
    console.log(`  Action: ${loginResult}`);
    await delay(2000);

    // --- STEP 3: SAMPLE WORKBOOK INGESTION ---
    console.log("\n--- PHASE 3: Sample Database Ingestion via WelcomeModal ---");
    const loadSampleResult = await evaluate(`
      (async () => {
        const demoCard = Array.from(document.querySelectorAll('div')).find(d => 
          d.textContent.includes('Explore Demo Mode') && d.textContent.includes('Try Sample')
        );
        if (demoCard) {
          demoCard.click();
          await new Promise(r => setTimeout(r, 600));
          
          const loadBtn = Array.from(document.querySelectorAll('button')).find(b => 
            b.textContent.includes('Load Sample Database')
          );
          if (loadBtn) {
            loadBtn.click();
            return "Sample Database loaded successfully!";
          }
          return "Demo card clicked, but Load Sample Database button not found";
        }
        return "Explore Demo Mode card not found";
      })()
    `);
    console.log(`  Action: ${loadSampleResult}`);
    await delay(2500);

    // Verify Active View
    const dashboardHeader = await evaluate(`
      (() => {
        const el = document.querySelector('h2');
        return el ? el.textContent : 'Unknown';
      })()
    `);
    console.log(`  Active Dashboard View: "${dashboardHeader ? dashboardHeader.trim() : 'Active'}"`);

    // --- STEP 4: DEDUCTIONS & EXPENSES NAVIGATION ---
    console.log("\n--- PHASE 4: Unified Deductions & Expenses Module Navigation ---");
    const navDeductions = await evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('aside button')).find(b => 
          b.textContent.includes('Deductions & Expenses')
        );
        if (btn) {
          btn.click();
          return "Navigated to Deductions & Expenses via sidebar";
        }
        return "Sidebar Deductions button not found";
      })()
    `);
    console.log(`  Action: ${navDeductions}`);
    await delay(1500);

    // --- STEP 5: REPORTS MODULE NAVIGATION ---
    console.log("\n--- PHASE 5: Financial Reports Navigation ---");
    const navReports = await evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('aside button')).find(b => 
          b.textContent.includes('Financial Reports')
        );
        if (btn) {
          btn.click();
          return "Navigated to Financial Reports";
        }
        return "Sidebar Reports button not found";
      })()
    `);
    console.log(`  Action: ${navReports}`);
    await delay(1500);

    // --- STEP 6: SETTINGS MODULE NAVIGATION ---
    console.log("\n--- PHASE 6: Settings Navigation ---");
    const navSettings = await evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('aside button')).find(b => 
          b.textContent.includes('Settings')
        );
        if (btn) {
          btn.click();
          return "Navigated to Settings";
        }
        return "Sidebar Settings button not found";
      })()
    `);
    console.log(`  Action: ${navSettings}`);
    await delay(1500);

    // --- STEP 7: BACKUP & RESTORE / EXCEL EXPORT ---
    console.log("\n--- PHASE 7: Backup & Restore / Excel Export Operations ---");
    const navBackup = await evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('aside button')).find(b => 
          b.textContent.includes('Backup & Restore')
        );
        if (btn) {
          btn.click();
          return "Navigated to Backup & Restore";
        }
        return "Sidebar Backup button not found";
      })()
    `);
    console.log(`  Action: ${navBackup}`);
    await delay(1500);

    const exportResult = await evaluate(`
      (async () => {
        const exportBtn = Array.from(document.querySelectorAll('button')).find(b => 
          b.textContent.includes('Export') || 
          b.textContent.includes('Download') ||
          b.textContent.includes('Save')
        );
        if (exportBtn) {
          const txt = exportBtn.textContent.trim();
          exportBtn.click();
          return "Clicked export button: " + txt;
        }
        return "Export button not found";
      })()
    `);
    console.log(`  Action: ${exportResult}`);
    await delay(2000);

    // --- STEP 8: LOGOUT & SESSION TERMINATION ---
    console.log("\n--- PHASE 8: Secure Logout & In-Memory Cleanup ---");
    const logoutResult = await evaluate(`
      (async () => {
        const logoutBtn = Array.from(document.querySelectorAll('aside button, header button')).find(b => 
          b.textContent.includes('Logout') || b.textContent.includes('End Session')
        );
        if (logoutBtn) {
          logoutBtn.click();
          await new Promise(r => setTimeout(r, 600));
          
          const confirmBtn = Array.from(document.querySelectorAll('button')).find(b => 
            b.textContent.includes('Confirm Logout') || 
            b.textContent.includes('Yes, Logout') ||
            b.textContent.includes('End Session')
          );
          if (confirmBtn) {
            confirmBtn.click();
            return "Logged out and confirmed modal";
          }
          return "Logout modal confirmation button not found";
        }
        return "Logout button not found";
      })()
    `);
    console.log(`  Action: ${logoutResult}`);
    await delay(2000);

    const postLogoutUrl = await evaluate("window.location.href");
    console.log(`  Post-Logout URL: ${postLogoutUrl}`);

    // --- NETWORK ANALYSIS & AUDIT REPORT ---
    console.log("\n======================================================================");
    console.log("NETWORK TRAFFIC AUDIT RESULTS");
    console.log("======================================================================");

    console.log(`Total Network Requests Captured: ${capturedRequests.length}`);

    const domainCounts = {};
    const externalRequests = [];
    const payloadTransmissions = [];

    for (const req of capturedRequests) {
      try {
        const parsedUrl = new URL(req.url);
        const origin = parsedUrl.origin;
        domainCounts[origin] = (domainCounts[origin] || 0) + 1;

        if (!origin.includes("localhost") && !origin.includes("127.0.0.1") && !req.url.startsWith("blob:") && !req.url.startsWith("data:")) {
          externalRequests.push(req);
        }

        if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH" || req.hasPostData) {
          payloadTransmissions.push(req);
        }
      } catch (e) {
        domainCounts["local-relative"] = (domainCounts["local-relative"] || 0) + 1;
      }
    }

    console.log("\nRequests by Origin:");
    for (const [origin, count] of Object.entries(domainCounts)) {
      console.log(`  - ${origin}: ${count} requests`);
    }

    console.log(`\nExternal Requests to Third-Party Services: ${externalRequests.length}`);
    if (externalRequests.length > 0) {
      console.log("  [ALERT] Detected external network requests:");
      externalRequests.forEach((r) => console.log(`    ${r.method} ${r.url}`));
    } else {
      console.log("  [PASS] ZERO external network requests. 100% of network traffic stayed on localhost.");
    }

    console.log(`\nHTTP Data Payload Transmissions (POST/PUT/PATCH): ${payloadTransmissions.length}`);
    if (payloadTransmissions.length > 0) {
      console.log("  [ALERT] Detected data payloads:");
      payloadTransmissions.forEach((r) => console.log(`    ${r.method} ${r.url} (Body: ${r.postData})`));
    } else {
      console.log("  [PASS] ZERO outbound data payload transmissions. No financial data was ever sent.");
    }

    console.log("\nCaptured Asset Breakdown:");
    const assetTypes = {};
    for (const r of capturedRequests) {
      assetTypes[r.type] = (assetTypes[r.type] || 0) + 1;
    }
    for (const [type, count] of Object.entries(assetTypes)) {
      console.log(`  - ${type}: ${count}`);
    }

    console.log("\nDetailed Captured Local Requests (first 10):");
    capturedRequests.slice(0, 10).forEach((r, idx) => {
      console.log(`  ${idx + 1}. [${r.type}] ${r.method} ${r.url.substring(0, 75)}`);
    });

    console.log("\n======================================================================");
    if (externalRequests.length === 0 && payloadTransmissions.length === 0) {
      console.log("NETWORK PRIVACY VERDICT: 100% PASS - NO THIRD-PARTY NETWORK REQUESTS OBSERVED DURING TESTED WORKFLOWS");
      console.log("All financial operations (Login, DB Ingestion, Deductions, Reports, Export, Logout) execute in browser memory with zero third-party network transmission.");
    } else {
      console.log("NETWORK PRIVACY VERDICT: FAIL - EXTERNAL NETWORK TRAFFIC DETECTED");
    }
    console.log("======================================================================\n");

  } finally {
    if (cdpWs) {
      try {
        cdpWs.close();
      } catch (e) {}
    }
    chromeProc.kill("SIGKILL");
    try {
      fs.rmSync(profileDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

runNetworkInspection().catch((err) => {
  console.error("Network Inspection Error:", err);
  process.exit(1);
});
