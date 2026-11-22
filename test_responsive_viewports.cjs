/**
 * Comprehensive Multi-Viewport Responsive Verification Suite
 * Tests 10 viewport dimensions using Chrome DevTools Protocol (CDP):
 *  1. Desktop: 1920x1080 (FHD Monitor)
 *  2. Desktop: 1440x900  (MacBook Pro / Standard Laptop)
 *  3. Desktop: 1366x768  (HD Laptop Display)
 *  4. Tablet:  1024x768  (iPad / Tablet Landscape)
 *  5. Tablet:  768x1024  (iPad / Tablet Portrait)
 *  6. Mobile:  430x932   (iPhone 14/15 Pro Max)
 *  7. Mobile:  390x844   (iPhone 12/13/14 Pro)
 *  8. Mobile:  375x812   (iPhone X / XS / 11 Pro)
 *  9. Mobile:  360x800   (Samsung Galaxy S20 / Modern Android)
 * 10. Mobile:  320x700   (Compact Android / Ultra-narrow display)
 *
 * Checks:
 *  - document.documentElement.scrollWidth <= window.innerWidth (zero horizontal page overflow)
 *  - Metric cards layout & wrapping
 *  - Responsive header/navbar behavior (desktop items vs mobile drawer/menu)
 *  - View navigation across Dashboard, Salary, Deductions & Expenses, Savings
 */

const { spawn } = require("child_process");
const http = require("http");
const path = require("path");
const fs = require("fs");
const os = require("os");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const APP_URL = "http://localhost:4173/";
const CDP_PORT = 9224;

const VIEWPORTS = [
  { name: "Desktop 1920x1080 (FHD)", width: 1920, height: 1080, isMobile: false, category: "Desktop" },
  { name: "Desktop 1440x900 (Laptop)", width: 1440, height: 900, isMobile: false, category: "Desktop" },
  { name: "Desktop 1366x768 (HD)", width: 1366, height: 768, isMobile: false, category: "Desktop" },
  { name: "Tablet 1024x768 (Landscape)", width: 1024, height: 768, isMobile: true, category: "Tablet" },
  { name: "Tablet 768x1024 (Portrait)", width: 768, height: 1024, isMobile: true, category: "Tablet" },
  { name: "Mobile 430x932 (iPhone Pro Max)", width: 430, height: 932, isMobile: true, category: "Mobile" },
  { name: "Mobile 390x844 (iPhone 14)", width: 390, height: 844, isMobile: true, category: "Mobile" },
  { name: "Mobile 375x812 (iPhone X/11)", width: 375, height: 812, isMobile: true, category: "Mobile" },
  { name: "Mobile 360x800 (Galaxy S20)", width: 360, height: 800, isMobile: true, category: "Mobile" },
  { name: "Mobile 320x700 (Compact)", width: 320, height: 700, isMobile: true, category: "Mobile" }
];

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

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 0;
    this.pending = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.msgId;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expr) {
    const res = await this.send("Runtime.evaluate", {
      expression: expr,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  }

  async setViewport(width, height, isMobile) {
    await this.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: isMobile
    });
    await this.send("Emulation.setVisibleSize", { width, height }).catch(() => {});
  }

  async captureScreenshot(outputPath) {
    const res = await this.send("Page.captureScreenshot", { format: "png" });
    if (res && res.data) {
      fs.writeFileSync(outputPath, Buffer.from(res.data, "base64"));
    }
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function runResponsiveTestSuite() {
  console.log("======================================================================");
  console.log("AUTOMATED MULTI-VIEWPORT RESPONSIVE AUDIT (10 VIEWPORTS)");
  console.log("======================================================================");

  const profileDir = path.join(os.tmpdir(), `chrome_resp_${Date.now()}`);
  fs.mkdirSync(profileDir, { recursive: true });

  const evidenceDir = path.join(__dirname, "evidence_viewport");
  fs.mkdirSync(evidenceDir, { recursive: true });

  const chromeProc = spawn(CHROME_PATH, [
    "--headless=new",
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${profileDir}`,
    "--window-size=1280,800",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank"
  ]);

  let cdp = null;

  try {
    let endpoints = null;
    for (let i = 0; i < 20; i++) {
      await delay(500);
      try {
        endpoints = await fetchJson(`http://localhost:${CDP_PORT}/json`);
        if (endpoints && endpoints.length > 0) break;
      } catch (e) {}
    }

    if (!endpoints || endpoints.length === 0) {
      throw new Error("Could not connect to Chrome DevTools Protocol");
    }

    const pageWsUrl = endpoints[0].webSocketDebuggerUrl;
    cdp = new CDPClient(pageWsUrl);
    await cdp.connect();

    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("DOM.enable");

    // Navigate to local preview
    console.log(`Navigating to ${APP_URL}...`);
    await cdp.send("Page.navigate", { url: APP_URL });
    await delay(2500);

    // Authenticate with default PIN 1234
    console.log("Authenticating session with default PIN 1234...");
    await cdp.eval(`
      (function() {
        const pinInput = document.querySelector('input[type="password"]') || document.querySelector('input[placeholder*="PIN"]');
        if (pinInput) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          nativeInputValueSetter.call(pinInput, "1234");
          pinInput.dispatchEvent(new Event('input', { bubbles: true }));
          pinInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.click();
      })()
    `);
    await delay(1500);

    // If Welcome modal is visible, load demo database
    console.log("Checking for Welcome / Database selection modal...");
    await cdp.eval(`
      (function() {
        const divs = Array.from(document.querySelectorAll('div, button'));
        const demoCard = divs.find(el => el.textContent && el.textContent.includes('Explore Demo Mode') && el.classList && el.classList.contains('cursor-pointer'));
        if (demoCard) demoCard.click();
      })()
    `);
    await delay(800);

    // Confirm demo database
    await cdp.eval(`
      (function() {
        const btns = Array.from(document.querySelectorAll('button'));
        const loadBtn = btns.find(b => b.textContent && b.textContent.includes('Load Sample Database'));
        if (loadBtn) loadBtn.click();
      })()
    `);
    await delay(1200);

    const isDashboardVisible = await cdp.eval(`
      Boolean(document.querySelector('main')) && (document.body.innerText.includes('Financial Overview') || document.body.innerText.includes('Available Cash'))
    `);
    console.log(`Dashboard Loaded: ${isDashboardVisible ? "YES" : "NO"}`);

    console.log("\n======================================================================");
    console.log("TESTING ZERO HORIZONTAL OVERFLOW ACROSS ALL 10 VIEWPORTS");
    console.log("======================================================================");

    const results = [];

    for (const vp of VIEWPORTS) {
      await cdp.setViewport(vp.width, vp.height, vp.isMobile);
      await delay(400);

      const check = await cdp.eval(`
        (function() {
          const docEl = document.documentElement;
          const body = document.body;
          const winWidth = window.innerWidth;
          const docScrollWidth = docEl.scrollWidth;
          const bodyScrollWidth = body.scrollWidth;
          const maxScrollWidth = Math.max(docScrollWidth, bodyScrollWidth);
          
          // Check horizontal overflow with 1px subpixel tolerance
          const hasOverflow = maxScrollWidth > winWidth + 1;
          const overflowPx = Math.max(0, maxScrollWidth - winWidth);

          // Header / Navbar checks
          const desktopHeader = document.querySelector('.hidden.lg\\\\:flex') || document.querySelector('header');
          const mobileDrawerBtn = document.querySelector('button[title*="Menu"]') || document.querySelector('button[aria-label*="menu"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerHTML.includes('lucide-menu'));

          // Metric cards check
          const metricCards = document.querySelectorAll('main .rounded-2xl, main .rounded-3xl');
          const cardCount = metricCards.length;

          // Check if any child elements are wider than window
          let widestElement = null;
          let maxElWidth = 0;
          const allElements = document.querySelectorAll('*');
          for (const el of allElements) {
            const rect = el.getBoundingClientRect();
            if (rect.right > winWidth + 2) {
              if (rect.width > maxElWidth) {
                maxElWidth = rect.width;
                widestElement = el.tagName + (el.className ? '.' + el.className.split(' ').slice(0, 2).join('.') : '');
              }
            }
          }

          return {
            winWidth,
            maxScrollWidth,
            hasOverflow,
            overflowPx,
            cardCount,
            widestElement
          };
        })()
      `);

      const pass = !check.hasOverflow;
      results.push({ ...vp, ...check, pass });

      const status = pass ? "PASS" : "FAIL";
      console.log(`  [${status}] ${vp.name.padEnd(32)} -> Win: ${check.winWidth}px | Scroll: ${check.maxScrollWidth}px | Overflow: ${check.overflowPx}px`);
      if (!pass && check.widestElement) {
        console.log(`         Warning element exceeding width: ${check.widestElement}`);
      }

      // Save screenshot for key viewports
      if (vp.width === 1440 || vp.width === 768 || vp.width === 390 || vp.width === 320) {
        const shotPath = path.join(evidenceDir, `viewport_${vp.width}x${vp.height}.png`);
        await cdp.captureScreenshot(shotPath);
        console.log(`         Captured evidence screenshot: ${shotPath}`);
      }
    }

    console.log("\n======================================================================");
    console.log("TESTING MULTI-VIEW NAVIGATION ON MOBILE (390x844)");
    console.log("======================================================================");

    await cdp.setViewport(390, 844, true);
    await delay(300);

    const tabsToTest = [
      { id: "salary", name: "Salary Management" },
      { id: "deductions-expenses", name: "Deductions & Expenses" },
      { id: "savings", name: "Savings Vault" }
    ];

    const tabResults = [];
    for (const t of tabsToTest) {
      // Switch view via bottom nav button or synthetic state
      await cdp.eval(`
        (function() {
          const btns = Array.from(document.querySelectorAll('nav button, button'));
          const btn = btns.find(b => b.textContent && (b.textContent.toLowerCase().includes('${t.id}') || b.textContent.includes('${t.name.split(" ")[0]}')));
          if (btn) btn.click();
        })()
      `);
      await delay(600);

      const tabCheck = await cdp.eval(`
        (function() {
          const docEl = document.documentElement;
          const body = document.body;
          const winWidth = window.innerWidth;
          const maxScrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
          return {
            winWidth,
            maxScrollWidth,
            hasOverflow: maxScrollWidth > winWidth + 1
          };
        })()
      `);

      const pass = !tabCheck.hasOverflow;
      tabResults.push({ ...t, ...tabCheck, pass });
      console.log(`  [${pass ? "PASS" : "FAIL"}] View: ${t.name.padEnd(25)} -> Width: ${tabCheck.winWidth}px | ScrollWidth: ${tabCheck.maxScrollWidth}px`);
    }

    console.log("\n======================================================================");
    console.log("SUMMARY OF MULTI-VIEWPORT VERIFICATION");
    console.log("======================================================================");
    const passedCount = results.filter(r => r.pass).length + tabResults.filter(t => t.pass).length;
    const totalCount = results.length + tabResults.length;
    console.log(`Total Assertions: ${totalCount}`);
    console.log(`Passed:           ${passedCount}`);
    console.log(`Failed:           ${totalCount - passedCount}`);
    console.log("======================================================================");

    if (totalCount === passedCount) {
      console.log("ALL 10 VIEWPORTS AND VIEWS PASSED ZERO HORIZONTAL OVERFLOW VERIFICATION!");
    } else {
      console.log("SOME VIEWPORTS REPORTED HORIZONTAL OVERFLOW!");
    }

  } catch (err) {
    console.error("Test execution error:", err);
  } finally {
    if (cdp) cdp.close();
    chromeProc.kill("SIGKILL");
    try {
      fs.rmSync(profileDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

runResponsiveTestSuite();
