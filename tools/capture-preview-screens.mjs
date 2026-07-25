import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { get } from "node:http";
import { resolve } from "node:path";

const chromeCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
];

const chromePath = chromeCandidates.find(existsSync);
if (!chromePath) {
  throw new Error("Chrome or Edge was not found. Install one of them to capture preview screens.");
}

const port = 9537 + Math.floor(Math.random() * 200);
const userDataDir = resolve(".tmp", `screen-capture-${Date.now()}`);
const outputDir = resolve(".tmp", "preview-screens");
const appPath = `file:///${resolve("preview", "index.html").replace(/\\/g, "/")}?capture=1`;

mkdirSync(outputDir, { recursive: true });

const seedState = {
  appVersion: "en-v2",
  goals: [],
  goalMode: "daily",
  dailyTasks: [],
  shortTermGoals: [],
  whyPeople: [],
  selfTalkScripts: [
    {
      title: "Morning decision",
      text: "I act before I negotiate with doubt. I keep the promises I make to myself."
    }
  ],
  activeSelfTalkIndex: 0,
  lifeProfile: {
    complete: true,
    name: "Sam",
    age: 25,
    expectancy: 85,
    startedAt: new Date().toISOString(),
    lastAnimatedDate: "2099-01-01",
    lastQuoteDate: "2099-01-01",
    lastQuoteRitualVersion: "quote-ritual-v6",
    lastSnapshot: null,
    lifeUpdateAnimationVersion: "life-reveal-v8"
  },
  visionTitle: "The version you are building",
  visionCreated: false,
  antiTitle: "The life you do not want to choose",
  antiCreated: false,
  visionSlides: [],
  antiSlides: [],
  settings: {
    theme: "dark",
    dailyReminder: true,
    notificationsEnabled: false,
    slowAudio: true,
    repeatSelfTalk: false,
    selfTalkVoiceURI: "",
    selfTalkVoicePreset: "warm-female",
    language: "en"
  },
  account: { signedIn: false, name: "", email: "", provider: "apple", userId: "" },
  sync: { mode: "local", status: "pending-backend", lastSyncedAt: "", pendingChanges: 0 },
  dailyInsight: { lastShownDate: "2099-01-01", index: 59 },
  subscription: { plan: "free", premium: false, entitlementSource: "apple-iap" }
};

const chrome = spawn(chromePath, [
  "--headless=new",
  "--disable-gpu",
  "--no-sandbox",
  "--disable-dev-shm-usage",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDataDir}`,
  "about:blank"
], { stdio: "ignore" });

function wait(ms) {
  return new Promise((resolveWait) => setTimeout(resolveWait, ms));
}

function readJson(url) {
  return new Promise((resolveRead, rejectRead) => {
    get(url, (response) => {
      let body = "";
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => {
        try {
          resolveRead(JSON.parse(body));
        } catch (error) {
          rejectRead(error);
        }
      });
    }).on("error", rejectRead);
  });
}

async function getDebuggerUrl() {
  for (let index = 0; index < 40; index += 1) {
    try {
      const pages = await readJson(`http://127.0.0.1:${port}/json`);
      const page = pages.find((item) => item.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {}
    await wait(150);
  }
  throw new Error("Chrome remote debugging did not become ready.");
}

function createCdp(wsUrl) {
  const socket = new WebSocket(wsUrl);
  let id = 0;
  const callbacks = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && callbacks.has(message.id)) {
      const { resolveMessage, rejectMessage } = callbacks.get(message.id);
      callbacks.delete(message.id);
      if (message.error) rejectMessage(new Error(message.error.message));
      else resolveMessage(message.result);
    }
  });
  const ready = new Promise((resolveReady, rejectReady) => {
    socket.addEventListener("open", resolveReady, { once: true });
    socket.addEventListener("error", rejectReady, { once: true });
  });
  return {
    async send(method, params = {}) {
      await ready;
      id += 1;
      socket.send(JSON.stringify({ id, method, params }));
      return new Promise((resolveMessage, rejectMessage) => {
        callbacks.set(id, { resolveMessage, rejectMessage });
      });
    },
    close() {
      socket.close();
    }
  };
}

try {
  const cdp = createCdp(await getDebuggerUrl());
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 393,
    height: 852,
    deviceScaleFactor: 3,
    mobile: true
  });
  await cdp.send("Emulation.setUserAgentOverride", {
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
  });
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `localStorage.setItem("visualize-simple-v1", ${JSON.stringify(JSON.stringify(seedState))}); localStorage.setItem("visualizeAppVersion", "2026-07-25-v106");`
  });
  await cdp.send("Page.navigate", { url: appPath });
  await wait(1200);

  const views = ["today", "goals", "vision", "anti", "speech"];
  for (const view of views) {
    await cdp.send("Runtime.evaluate", {
      expression: `document.querySelector('.nav button[data-view="${view}"]')?.click()`,
      awaitPromise: true
    });
    await wait(420);
    const image = await cdp.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true
    });
    const file = resolve(outputDir, `${view}.png`);
    writeFileSync(file, Buffer.from(image.data, "base64"));
    console.log(file);
  }
  cdp.close();
} finally {
  chrome.kill();
}
