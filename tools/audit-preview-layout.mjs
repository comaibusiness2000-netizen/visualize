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
const viewportProfiles = [
  { name: "iphone-15", width: 393, height: 852, scale: 3 },
  { name: "iphone-x", width: 375, height: 812, scale: 3 },
  { name: "iphone-se", width: 375, height: 667, scale: 2 }
];
const auditScenarios = [
  { name: "en-dark", language: "en", theme: "dark", profileComplete: true, views: ["today", "goals", "vision", "anti", "speech", "profile"] },
  { name: "fr-dark", language: "fr", theme: "dark", profileComplete: true, views: ["today", "goals", "vision", "anti", "speech", "profile"] },
  { name: "pt-dark", language: "pt", theme: "dark", profileComplete: true, views: ["today", "goals", "vision", "anti", "speech", "profile"] },
  { name: "zh-dark", language: "zh", theme: "dark", profileComplete: true, views: ["today", "goals", "vision", "anti", "speech"] },
  { name: "en-light", language: "en", theme: "light", profileComplete: true, views: ["today", "goals", "vision", "anti", "speech", "profile"] },
  { name: "safe-bottom-light", language: "en", theme: "light", profileComplete: true, safeBottomStress: true, views: ["today", "goals", "vision", "anti", "speech", "profile"] },
  { name: "fr-onboarding", language: "fr", theme: "dark", profileComplete: false, views: ["today"] },
  { name: "pt-onboarding", language: "pt", theme: "dark", profileComplete: false, views: ["today"] }
];

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
  appVersion: "2026-07-27-v114",
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

function scenarioState(scenario) {
  return {
    ...seedState,
    lifeProfile: {
      ...seedState.lifeProfile,
      complete: scenario.profileComplete
    },
    settings: {
      ...seedState.settings,
      language: scenario.language,
      theme: scenario.theme
    }
  };
}

try {
  const cdp = createCdp(await getDebuggerUrl());
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setUserAgentOverride", {
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
  });
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      const auditSeeds = ${JSON.stringify(Object.fromEntries(auditScenarios.map((scenario) => [scenario.name, scenarioState(scenario)])))};
      const auditParams = new URL(location.href).searchParams;
      const auditScenario = auditParams.get("auditScenario") || "en-dark";
      localStorage.setItem("visualize-simple-v1", JSON.stringify(auditSeeds[auditScenario] || auditSeeds["en-dark"]));
      localStorage.setItem("visualizeAppVersion", "2026-07-27-v114");
    `
  });
  const failures = [];

  for (const viewport of viewportProfiles) {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: viewport.scale,
      mobile: true
    });

    for (const scenario of auditScenarios) {
      const scenarioUrl = `${appPath}&auditScenario=${encodeURIComponent(scenario.name)}&auditViewport=${encodeURIComponent(viewport.name)}&t=${Date.now()}`;
      await cdp.send("Page.navigate", { url: scenarioUrl });
      await wait(900);
      if (scenario.safeBottomStress) {
        await cdp.send("Runtime.evaluate", {
          expression: `document.documentElement.style.setProperty('--safe-bottom-raw', '96px')`,
          awaitPromise: true
        });
      }

      for (const view of scenario.views) {
        await cdp.send("Runtime.evaluate", {
          expression: view === "profile"
            ? `document.getElementById("profileTop")?.click()`
            : `document.getElementById("profileDrawer")?.classList.remove("open"); document.getElementById("profileScrim")?.classList.remove("open"); document.querySelector('.nav button[data-view="${view}"]')?.click()`,
          awaitPromise: true
        });
        await wait(260);
        const result = await cdp.send("Runtime.evaluate", {
          returnByValue: true,
          awaitPromise: true,
          expression: `(() => {
        const baseSelectors = [
          '.stage', '.phone', '.app', '.topbar', '.nav', '.screen.active',
          '.life-head', '.life-months-card', '.life-stats', '.daily-quote-card', '.life-map-card',
          '.why-workbench', '.why-workbench-head', '.why-motive-stack', '.why-motive-card', '.why-prompts', '.why-prompts span', '#uploadWhyPhoto', '.why-people-grid',
          '.vision-empty', '.anti-empty', '.deck-stage', '.deck-actions',
          '.speech-head', '.speech-studio', '.speech-current-card', '.speech-voice-summary',
          '.life-onboarding', '.setup-showcase', '.field-stack'
        ];
        const profileSelectors = [
          '.profile-drawer.open', '.profile-card', '.setting-row', '.status-list', '.status-pill', '.language-grid'
        ];
        const profileOpen = document.getElementById('profileDrawer')?.classList.contains('open');
        const selectors = profileOpen ? baseSelectors.concat(profileSelectors) : baseSelectors;
        const textFitSelectors = [
          '.nav-label',
          '.btn',
          '.life-head h1 strong',
          '.life-head h1 em',
          '.life-head .life-summary',
          '.life-stat strong',
          '.life-stat span',
          '.life-months-copy strong b',
          '.life-months-copy strong em',
          '.life-months-copy p',
          '.daily-quote-open',
          '#dailyQuoteText',
          '.why-prompts span',
          '#uploadWhyPhoto',
          '.why-workbench-head h2',
          '.why-workbench-head p',
          '.vision-empty h2',
          '.vision-empty p',
          '.anti-empty h2',
          '.anti-empty p',
          '.deck-actions .btn',
          '.speech-head h2',
          '.speech-head p',
          '.speech-play-main',
          '.speech-current-card strong',
          '.speech-current-card em',
          '.speech-voice-summary strong',
          '.profile-card h2',
          '.profile-card p',
          '.setting-row strong',
          '.setting-row span',
          '.status-pill strong',
          '.status-pill span',
          '.language-grid button',
          '#openPrivacy',
          '#saveProfile',
          '#resetData',
          '.life-onboarding h1',
          '.life-onboarding p',
          '#saveLifeProfile'
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
        const activeTheme = document.body.dataset.theme || document.documentElement.dataset.theme || 'dark';
        if (activeTheme === 'dark' && (isLight(htmlBg) || isLight(bodyBg) || isLight(fixedBg) || themeColor.toLowerCase() !== '#07090b')) {
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
        if (activeTheme === 'light' && (!isLight(htmlBg) || !isLight(bodyBg) || !isLight(fixedBg) || themeColor.toLowerCase() !== '#f3f3f1')) {
          items.push({
            selector: 'html/body light background',
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
            const viewportNotCovered = ['.stage', '.phone', '.app'].includes(selector) && rect.bottom < vh - 1;
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
            const style = getComputedStyle(element);
            const hiddenX = ['hidden', 'clip'].includes(style.overflowX) || ['hidden', 'clip'].includes(style.overflow);
            const hiddenY = ['hidden', 'clip'].includes(style.overflowY) || ['hidden', 'clip'].includes(style.overflow);
            const intentionalEllipsis = style.textOverflow === 'ellipsis';
            const lineClamp = style.webkitLineClamp && style.webkitLineClamp !== 'none';
            const textOverflowX = element.scrollWidth > Math.ceil(element.clientWidth) + 2 && hiddenX && !intentionalEllipsis;
            const textOverflowY = element.scrollHeight > Math.ceil(element.clientHeight) + 2 && hiddenY && !lineClamp;
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
        const containmentChecks = [
          { panel: '.why-workbench', children: '.why-prompts span, #uploadWhyPhoto, .why-motive-stack' },
          { panel: '.speech-head', children: '.deck-kicker, h2, p, .speech-playback-meta, .speech-meter, .speech-play-main' },
          { panel: '.speech-studio', children: '.speech-current-card, .speech-script-panel, .speech-voice-summary, .speech-actions .btn' },
          { panel: '.life-head', children: '.deck-kicker, h1, .life-summary, .life-progress' },
          { panel: '.life-months-card', children: '.life-months-copy, .life-months-orbit' },
          { panel: '.vision-empty', children: 'h2, p, #createVision' },
          { panel: '.anti-empty', children: 'h2, p, #createAnti' }
        ];
        for (const check of containmentChecks) {
          for (const panel of document.querySelectorAll(check.panel)) {
            if (!panel.offsetParent && getComputedStyle(panel).position !== 'fixed') continue;
            const panelRect = panel.getBoundingClientRect();
            for (const child of panel.querySelectorAll(check.children)) {
              if (!child.offsetParent && getComputedStyle(child).position !== 'fixed') continue;
              const childRect = child.getBoundingClientRect();
              const outsidePanel =
                childRect.left < panelRect.left - 1 ||
                childRect.right > panelRect.right + 1 ||
                childRect.top < panelRect.top - 1 ||
                childRect.bottom > panelRect.bottom + 1;
              if (outsidePanel) {
                items.push({
                  selector: 'child outside panel',
                  panel: check.panel,
                  child: child.id ? '#' + child.id : child.className || child.tagName.toLowerCase(),
                  text: (child.textContent || child.value || '').trim().slice(0, 90),
                  panelRect: { left: Math.round(panelRect.left), right: Math.round(panelRect.right), top: Math.round(panelRect.top), bottom: Math.round(panelRect.bottom), width: Math.round(panelRect.width), height: Math.round(panelRect.height) },
                  childRect: { left: Math.round(childRect.left), right: Math.round(childRect.right), top: Math.round(childRect.top), bottom: Math.round(childRect.bottom), width: Math.round(childRect.width), height: Math.round(childRect.height) },
                  clippedY: childRect.bottom > panelRect.bottom + 1 || childRect.top < panelRect.top - 1,
                  outX: childRect.left < panelRect.left - 1 || childRect.right > panelRect.right + 1,
                  navTooHigh: false,
                  viewportNotCovered: false
                });
              }
            }
          }
        }
        const nav = document.querySelector('.nav');
        const navRect = nav?.getBoundingClientRect();
        if (navRect) {
          const protectedSelectors = [
            '.life-head',
            '.life-months-card',
            '.life-stats',
            '.daily-quote-card',
            '.life-map-card',
            '.why-workbench',
            '.vision-empty',
            '.anti-empty',
            '.speech-head',
            '.speech-studio'
          ];
          for (const selector of protectedSelectors) {
            for (const element of document.querySelectorAll(selector)) {
              if (!element.offsetParent) continue;
              const rect = element.getBoundingClientRect();
              const overlapsNav = rect.bottom > navRect.top + 6 && rect.top < navRect.bottom - 6;
              const visibleHorizontally = rect.right > 0 && rect.left < vw;
              if (overlapsNav && visibleHorizontally) {
                items.push({
                  selector: 'main panel under nav',
                  target: selector,
                  rect: { left: Math.round(rect.left), right: Math.round(rect.right), top: Math.round(rect.top), bottom: Math.round(rect.bottom), width: Math.round(rect.width), height: Math.round(rect.height) },
                  nav: { top: Math.round(navRect.top), bottom: Math.round(navRect.bottom) },
                  clippedY: true,
                  outX: false,
                  navTooHigh: false,
                  viewportNotCovered: false,
                  overlapsNav: true
                });
              }
            }
          }
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
        return { viewport: '${viewport.name}', scenario: '${scenario.name}', view: '${view}', vw, vh, items };
      })()`
        });
        if (result.result.value.items.length) failures.push(result.result.value);
      }
    }
  }

  cdp.close();
  if (failures.length) {
    console.error(JSON.stringify(failures, null, 2));
    process.exitCode = 1;
  } else {
    console.log("Layout audit passed across iPhone viewport, theme, language, and onboarding scenarios.");
  }
} finally {
  chrome.kill();
}
