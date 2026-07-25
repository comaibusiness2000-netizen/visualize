import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
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
  throw new Error("Chrome or Edge was not found. Install one of them to run the layout audit.");
}

const port = 9337 + Math.floor(Math.random() * 200);
const userDataDir = resolve(".tmp", `layout-audit-${Date.now()}`);
const appPath = `file:///${resolve("preview", "index.html").replace(/\\/g, "/")}?audit=1`;

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

const seedState = {
  appVersion: "en-v2",
  goals: [],
  goalMode: "daily",
  dailyTasks: [],
  shortTermGoals: [],
  whyPeople: [],
  selfTalkScripts: [{ title: "Morning decision", text: "I act before I negotiate with doubt. I keep the promises I make to myself." }],
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
  const failures = [];

  for (const view of views) {
    await cdp.send("Runtime.evaluate", {
      expression: `document.querySelector('.nav button[data-view="${view}"]')?.click()`,
      awaitPromise: true
    });
    await wait(350);
    const result = await cdp.send("Runtime.evaluate", {
      returnByValue: true,
      awaitPromise: true,
      expression: `(() => {
        const selectors = [
          '.stage', '.phone', '.topbar', '.nav', '.screen.active',
          '.life-head', '.life-pressure-card', '.life-stats', '.daily-quote-card', '.life-map-card',
          '.why-workbench', '.why-workbench-head', '.why-motive-stack', '.why-motive-card', '.why-prompts', '.why-prompts span', '#uploadWhyPhoto', '.why-people-grid',
          '.vision-empty', '.anti-empty', '.deck-stage', '.deck-actions',
          '.speech-head', '.speech-studio', '.speech-current-card', '.speech-voice-summary'
        ];
        const textFitSelectors = [
          '.why-prompts span',
          '#uploadWhyPhoto',
          '.why-workbench-head h2',
          '.why-workbench-head p'
        ];
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const items = [];
        const rgb = (value) => (String(value).match(/\\d+/g) || []).slice(0, 3).map(Number);
        const isLight = (value) => {
          const [r = 0, g = 0, b = 0] = rgb(value);
          return ((r * 299 + g * 587 + b * 114) / 1000) > 170;
        };
        const htmlBg = getComputedStyle(document.documentElement).backgroundColor;
        const bodyBg = getComputedStyle(document.body).backgroundColor;
        const fixedBg = getComputedStyle(document.body, '::before').backgroundColor;
        const themeColor = document.querySelector('meta[name="theme-color"]')?.content || '';
        if (isLight(htmlBg) || isLight(bodyBg) || isLight(fixedBg) || themeColor.toLowerCase() !== '#07090b') {
          items.push({
            selector: 'html/body dark background',
            htmlBg,
            bodyBg,
            fixedBg,
            themeColor,
            clippedY: false,
            outX: false,
            navTooHigh: false,
            viewportNotCovered: false
          });
        }
        for (const selector of selectors) {
          for (const element of document.querySelectorAll(selector)) {
            if (!element.offsetParent && getComputedStyle(element).position !== 'fixed') continue;
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            const hiddenY = ['hidden', 'clip'].includes(style.overflowY) || ['hidden', 'clip'].includes(style.overflow);
            const clippedY = hiddenY && element.scrollHeight > element.clientHeight + 3;
            const outX = rect.left < -1 || rect.right > vw + 1;
            const navTooHigh = selector === '.nav' && vh - rect.bottom > 18;
            const viewportNotCovered = ['.stage', '.phone'].includes(selector) && rect.bottom < vh - 1;
            if (clippedY || outX || navTooHigh || viewportNotCovered) {
              items.push({
                selector,
                rect: { left: Math.round(rect.left), right: Math.round(rect.right), top: Math.round(rect.top), bottom: Math.round(rect.bottom), width: Math.round(rect.width), height: Math.round(rect.height) },
                clientHeight: element.clientHeight,
                scrollHeight: element.scrollHeight,
                overflow: style.overflow,
                overflowY: style.overflowY,
                clippedY,
                outX,
                navTooHigh,
                viewportNotCovered
              });
            }
          }
        }
        for (const selector of textFitSelectors) {
          for (const element of document.querySelectorAll(selector)) {
            if (!element.offsetParent && getComputedStyle(element).position !== 'fixed') continue;
            const rect = element.getBoundingClientRect();
            const textOverflowX = element.scrollWidth > Math.ceil(element.clientWidth) + 2;
            const textOverflowY = element.scrollHeight > Math.ceil(element.clientHeight) + 2;
            if (textOverflowX || textOverflowY) {
              items.push({
                selector: 'text does not fit',
                target: selector,
                text: (element.textContent || element.value || '').trim().slice(0, 90),
                rect: { left: Math.round(rect.left), right: Math.round(rect.right), top: Math.round(rect.top), bottom: Math.round(rect.bottom), width: Math.round(rect.width), height: Math.round(rect.height) },
                clientWidth: element.clientWidth,
                scrollWidth: element.scrollWidth,
                clientHeight: element.clientHeight,
                scrollHeight: element.scrollHeight,
                clippedY: textOverflowY,
                outX: textOverflowX,
                navTooHigh: false,
                viewportNotCovered: false
              });
            }
          }
        }
        const nav = document.querySelector('.nav');
        const navRect = nav?.getBoundingClientRect();
        if (navRect) {
          const interactiveSelectors = '.screen.active button, .screen.active input, .screen.active textarea, .screen.active select, .screen.active [role="button"]';
          for (const element of document.querySelectorAll(interactiveSelectors)) {
            if (!element.offsetParent || element.closest('.nav')) continue;
            const rect = element.getBoundingClientRect();
            const overlapsNav = rect.bottom > navRect.top + 4 && rect.top < navRect.bottom - 4;
            const visibleHorizontally = rect.right > 0 && rect.left < vw;
            if (overlapsNav && visibleHorizontally) {
              items.push({
                selector: 'interactive element under nav',
                tag: element.tagName.toLowerCase(),
                id: element.id || '',
                text: (element.textContent || element.value || '').trim().slice(0, 60),
                rect: { left: Math.round(rect.left), right: Math.round(rect.right), top: Math.round(rect.top), bottom: Math.round(rect.bottom), width: Math.round(rect.width), height: Math.round(rect.height) },
                nav: { top: Math.round(navRect.top), bottom: Math.round(navRect.bottom) },
                clippedY: false,
                outX: false,
                navTooHigh: false,
                viewportNotCovered: false,
                overlapsNav: true
              });
            }
          }
        }
        return { view: '${view}', vw, vh, items };
      })()`
    });
    if (result.result.value.items.length) failures.push(result.result.value);
  }

  cdp.close();
  if (failures.length) {
    console.error(JSON.stringify(failures, null, 2));
    process.exitCode = 1;
  } else {
    console.log("Layout audit passed for iPhone viewport: today, goals, vision, anti, speech.");
  }
} finally {
  chrome.kill();
}
