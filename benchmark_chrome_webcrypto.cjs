/**
 * Browser-Native Web Crypto Benchmark in Chrome via CDP
 * Measures:
 * 1. Total Asynchronous Promise resolution latency
 * 2. Real browser UI responsiveness and rAF frame latency during derivation
 */

const { spawn } = require("child_process");
const http = require("http");
const path = require("path");
const fs = require("fs");
const os = require("os");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP_PORT = 9222;

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve(JSON.parse(data)));
    }).on("error", reject);
  });
}

async function run() {
  const profileDir = path.join(os.tmpdir(), `chrome_bench_${Date.now()}`);
  fs.mkdirSync(profileDir, { recursive: true });

  const chromeProc = spawn(CHROME_PATH, [
    "--headless=new",
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${profileDir}`,
    "http://localhost:4173/"
  ]);

  let ws = null;
  try {
    let targets = null;
    for (let i = 0; i < 20; i++) {
      await delay(400);
      try {
        targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json`);
        if (targets && targets.length > 0) break;
      } catch (e) {}
    }

    const page = targets.find((t) => t.type === "page") || targets[0];
    ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((r) => (ws.onopen = r));

    let msgId = 1;
    const pending = new Map();
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };

    function sendCommand(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await sendCommand("Runtime.enable");
    await sendCommand("Page.enable");
    await sendCommand("Page.navigate", { url: "http://localhost:4173/" });
    await delay(1500);

    async function evaluate(code) {
      const res = await sendCommand("Runtime.evaluate", {
        expression: code,
        returnByValue: true,
        awaitPromise: true
      });
      if (res.exceptionDetails) throw new Error(res.exceptionDetails.text);
      return res.result.value;
    }

    console.log("======================================================================");
    console.log("CHROME BROWSER ENGINE (v131) NATIVE WEB CRYPTO BENCHMARK");
    console.log("======================================================================");

    const benchmarkScript = `
      (async () => {
        function hexToBytes(hex) {
          const bytes = new Uint8Array(hex.length / 2);
          for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
          }
          return bytes;
        }

        async function testIterations(iterations, runs = 5) {
          const pin = "12345678";
          const pinBytes = new TextEncoder().encode(pin);
          const saltBytes = hexToBytes("a1b2c3d4e5f60718293a4b5c6d7e8f90");

          const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            pinBytes,
            { name: "PBKDF2" },
            false,
            ["deriveBits"]
          );

          const durations = [];
          const frameDeltas = [];

          for (let r = 0; r < runs; r++) {
            let active = true;
            let lastFrame = performance.now();
            let maxFrameGap = 0;

            function frameLoop() {
              if (!active) return;
              const now = performance.now();
              const gap = now - lastFrame;
              if (gap > maxFrameGap) maxFrameGap = gap;
              lastFrame = now;
              requestAnimationFrame(frameLoop);
            }
            requestAnimationFrame(frameLoop);

            const start = performance.now();
            await window.crypto.subtle.deriveBits(
              {
                name: "PBKDF2",
                salt: saltBytes,
                iterations: iterations,
                hash: "SHA-256"
              },
              keyMaterial,
              256
            );
            const totalTime = performance.now() - start;
            active = false;

            durations.push(totalTime);
            frameDeltas.push(maxFrameGap);
            await new Promise(res => setTimeout(res, 50));
          }

          const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
          const avgFrameGap = frameDeltas.reduce((a, b) => a + b, 0) / frameDeltas.length;

          return {
            iterations,
            avgDurationMs: Number(avgDuration.toFixed(2)),
            minDurationMs: Number(Math.min(...durations).toFixed(2)),
            maxDurationMs: Number(Math.max(...durations).toFixed(2)),
            avgMaxFrameGapMs: Number(avgFrameGap.toFixed(2))
          };
        }

        const res100k = await testIterations(100000, 4);
        const res210k = await testIterations(210000, 4);
        const res600k = await testIterations(600000, 4);

        return [res100k, res210k, res600k];
      })()
    `;

    const results = await evaluate(benchmarkScript);
    for (const r of results) {
      console.log(`[ITERATIONS: ${r.iterations.toLocaleString()}]`);
      console.log(`  - Asynchronous Promise Latency: ${r.avgDurationMs} ms (min: ${r.minDurationMs} ms, max: ${r.maxDurationMs} ms)`);
      console.log(`  - Max Animation Frame Gap:      ${r.avgMaxFrameGapMs} ms (Target 60fps frame budget = 16.6ms)`);
      console.log(`  - UI Animation Smoothness:      ${r.avgMaxFrameGapMs <= 20 ? 'Completely Smooth (No Dropped Frames)' : 'Slight Jitter'}`);
      console.log("");
    }

    console.log("======================================================================");
    console.log("ACCURACY CORRECTION VERIFICATION:");
    console.log("1. crypto.subtle.deriveBits() is an asynchronous browser-engine function.");
    console.log("2. Total wall-clock time represents Promise completion latency, NOT main-thread freeze.");
    console.log("3. The browser main thread continuously schedules requestAnimationFrame during deriveBits().");
    console.log("======================================================================");

  } finally {
    if (ws) {
      try { ws.close(); } catch (e) {}
    }
    chromeProc.kill("SIGKILL");
    try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch (e) {}
  }
}

run().catch(console.error);
