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
const viewportProfiles = [
  { name: "iphone-15", width: 393, height: 852, scale: 3 },
  { name: "iphone-se", width: 375, height: 667, scale: 2 }
];

mkdirSync(outputDir, { recursive: true });

const seedState = {
  appVersion: "2026-07-27-v125",
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

const playerState = {
  ...seedState,
  visionCreated: true,
  antiCreated: true,
  visionSlides: [
    {
      title: "Own the room",
      caption: "Stand inside the future long enough that action feels familiar."
    },
    {
      title: "Build the body",
      caption: "Make the next rep, meal, and hour vote for this version."
    },
    {
      title: "Choose your people",
      caption: "Keep the faces you are doing this for close."
    }
  ],
  antiSlides: [
    {
      title: "The cost of delay",
      caption: "See the drift clearly enough that today becomes non-negotiable."
    },
    {
      title: "The room you refuse",
      caption: "Let the warning scene sharpen the next decision."
    }
  ]
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
  await cdp.send("Emulation.setUserAgentOverride", {
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
  });
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      const defaultCaptureState = ${JSON.stringify(JSON.stringify(seedState))};
      const playerCaptureState = ${JSON.stringify(JSON.stringify(playerState))};
      const captureParams = new URL(location.href).searchParams;
      const usePlayerState = captureParams.has("player");
      const selectedState = JSON.parse(usePlayerState ? playerCaptureState : defaultCaptureState);
      if (captureParams.get("theme") === "light") {
        selectedState.settings.theme = "light";
        selectedState.settings.language = "en";
      }
      localStorage.setItem("visualize-simple-v1", JSON.stringify(selectedState));
      localStorage.setItem("visualizeAppVersion", "2026-07-27-v125");
    `
  });
  const views = ["today", "goals", "vision", "anti", "speech", "profile"];
  for (const viewport of viewportProfiles) {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: viewport.scale,
      mobile: true
    });
    await cdp.send("Page.navigate", { url: `${appPath}&viewport=${viewport.name}&t=${Date.now()}` });
    await wait(1200);

    for (const view of views) {
      await cdp.send("Runtime.evaluate", {
        expression: `(() => {
          document.getElementById("dailyQuoteReveal")?.classList.remove("open");
          document.getElementById("dailyQuoteReveal")?.setAttribute("aria-hidden", "true");
          document.getElementById("dailyInsight")?.classList.remove("open");
          document.getElementById("dailyInsight")?.setAttribute("aria-hidden", "true");
          document.getElementById("lifeUpdateOverlay")?.classList.remove("open");
          document.getElementById("lifeUpdateOverlay")?.setAttribute("aria-hidden", "true");
          document.getElementById("lifeRunwayReveal")?.classList.remove("open");
          document.getElementById("lifeRunwayReveal")?.setAttribute("aria-hidden", "true");
        })()`,
        awaitPromise: true
      });
      await cdp.send("Runtime.evaluate", {
        expression: view === "profile"
          ? `document.getElementById("profileTop")?.click()`
          : `document.getElementById("profileDrawer")?.classList.remove("open"); document.getElementById("profileScrim")?.classList.remove("open"); document.querySelector('.nav button[data-view="${view}"]')?.click()`,
        awaitPromise: true
      });
      await wait(420);
      await cdp.send("Runtime.evaluate", {
        expression: `(() => {
          document.getElementById("dailyQuoteReveal")?.classList.remove("open");
          document.getElementById("dailyQuoteReveal")?.setAttribute("aria-hidden", "true");
          document.getElementById("dailyInsight")?.classList.remove("open");
          document.getElementById("dailyInsight")?.setAttribute("aria-hidden", "true");
          document.getElementById("lifeUpdateOverlay")?.classList.remove("open");
          document.getElementById("lifeUpdateOverlay")?.setAttribute("aria-hidden", "true");
          document.getElementById("lifeRunwayReveal")?.classList.remove("open");
          document.getElementById("lifeRunwayReveal")?.setAttribute("aria-hidden", "true");
        })()`,
        awaitPromise: true
      });
      await wait(120);
      const image = await cdp.send("Page.captureScreenshot", {
        format: "png",
        fromSurface: true
      });
      const prefixedFile = resolve(outputDir, `${viewport.name}-${view}.png`);
      writeFileSync(prefixedFile, Buffer.from(image.data, "base64"));
      console.log(prefixedFile);
      if (viewport.name === "iphone-15") {
        const file = resolve(outputDir, `${view}.png`);
        writeFileSync(file, Buffer.from(image.data, "base64"));
        console.log(file);
      }
      if (view === "today") {
        await cdp.send("Runtime.evaluate", {
          expression: `document.getElementById("lifeMonthsCard")?.click()`,
          awaitPromise: true
        });
        await wait(520);
        const runwayImage = await cdp.send("Page.captureScreenshot", {
          format: "png",
          fromSurface: true
        });
        const runwayPrefixedFile = resolve(outputDir, `${viewport.name}-runway.png`);
        writeFileSync(runwayPrefixedFile, Buffer.from(runwayImage.data, "base64"));
        console.log(runwayPrefixedFile);
        if (viewport.name === "iphone-15") {
          const runwayFile = resolve(outputDir, "runway.png");
          writeFileSync(runwayFile, Buffer.from(runwayImage.data, "base64"));
          console.log(runwayFile);
        }
        await cdp.send("Runtime.evaluate", {
          expression: `document.getElementById("closeLifeRunway")?.click()`,
          awaitPromise: true
        });
        await wait(180);
      }
      if (view === "speech") {
        await cdp.send("Runtime.evaluate", {
          expression: `document.getElementById("openSpeechEditor")?.click()`,
          awaitPromise: true
        });
        await wait(360);
        const editorImage = await cdp.send("Page.captureScreenshot", {
          format: "png",
          fromSurface: true
        });
        const editorPrefixedFile = resolve(outputDir, `${viewport.name}-speech-editor.png`);
        writeFileSync(editorPrefixedFile, Buffer.from(editorImage.data, "base64"));
        console.log(editorPrefixedFile);
        if (viewport.name === "iphone-15") {
          const editorFile = resolve(outputDir, "speech-editor.png");
          writeFileSync(editorFile, Buffer.from(editorImage.data, "base64"));
          console.log(editorFile);
        }
        await cdp.send("Runtime.evaluate", {
          expression: `document.getElementById("closeSpeechScript")?.click()`,
          awaitPromise: true
        });
        await wait(180);
      }
    }

    await cdp.send("Page.navigate", { url: `${appPath}&viewport=${viewport.name}&theme=light&t=${Date.now()}` });
    await wait(1200);
    for (const view of views) {
      await cdp.send("Runtime.evaluate", {
        expression: `(() => {
          document.getElementById("dailyQuoteReveal")?.classList.remove("open");
          document.getElementById("dailyQuoteReveal")?.setAttribute("aria-hidden", "true");
          document.getElementById("dailyInsight")?.classList.remove("open");
          document.getElementById("dailyInsight")?.setAttribute("aria-hidden", "true");
          document.getElementById("lifeUpdateOverlay")?.classList.remove("open");
          document.getElementById("lifeUpdateOverlay")?.setAttribute("aria-hidden", "true");
          document.getElementById("lifeRunwayReveal")?.classList.remove("open");
          document.getElementById("lifeRunwayReveal")?.setAttribute("aria-hidden", "true");
        })()`,
        awaitPromise: true
      });
      await cdp.send("Runtime.evaluate", {
        expression: view === "profile"
          ? `document.getElementById("profileTop")?.click()`
          : `document.getElementById("profileDrawer")?.classList.remove("open"); document.getElementById("profileScrim")?.classList.remove("open"); document.querySelector('.nav button[data-view="${view}"]')?.click()`,
        awaitPromise: true
      });
      await wait(420);
      await cdp.send("Runtime.evaluate", {
        expression: `(() => {
          document.getElementById("dailyQuoteReveal")?.classList.remove("open");
          document.getElementById("dailyQuoteReveal")?.setAttribute("aria-hidden", "true");
          document.getElementById("dailyInsight")?.classList.remove("open");
          document.getElementById("dailyInsight")?.setAttribute("aria-hidden", "true");
          document.getElementById("lifeUpdateOverlay")?.classList.remove("open");
          document.getElementById("lifeUpdateOverlay")?.setAttribute("aria-hidden", "true");
          document.getElementById("lifeRunwayReveal")?.classList.remove("open");
          document.getElementById("lifeRunwayReveal")?.setAttribute("aria-hidden", "true");
        })()`,
        awaitPromise: true
      });
      await wait(120);
      const image = await cdp.send("Page.captureScreenshot", {
        format: "png",
        fromSurface: true
      });
      const prefixedFile = resolve(outputDir, `${viewport.name}-light-${view}.png`);
      writeFileSync(prefixedFile, Buffer.from(image.data, "base64"));
      console.log(prefixedFile);
      if (viewport.name === "iphone-15") {
        const file = resolve(outputDir, `light-${view}.png`);
        writeFileSync(file, Buffer.from(image.data, "base64"));
        console.log(file);
      }
      if (view === "today") {
        await cdp.send("Runtime.evaluate", {
          expression: `document.getElementById("lifeMonthsCard")?.click()`,
          awaitPromise: true
        });
        await wait(520);
        const runwayImage = await cdp.send("Page.captureScreenshot", {
          format: "png",
          fromSurface: true
        });
        const runwayPrefixedFile = resolve(outputDir, `${viewport.name}-light-runway.png`);
        writeFileSync(runwayPrefixedFile, Buffer.from(runwayImage.data, "base64"));
        console.log(runwayPrefixedFile);
        if (viewport.name === "iphone-15") {
          const runwayFile = resolve(outputDir, "light-runway.png");
          writeFileSync(runwayFile, Buffer.from(runwayImage.data, "base64"));
          console.log(runwayFile);
        }
        await cdp.send("Runtime.evaluate", {
          expression: `document.getElementById("closeLifeRunway")?.click()`,
          awaitPromise: true
        });
        await wait(180);
      }
      if (view === "speech") {
        await cdp.send("Runtime.evaluate", {
          expression: `document.getElementById("openSpeechEditor")?.click()`,
          awaitPromise: true
        });
        await wait(360);
        const editorImage = await cdp.send("Page.captureScreenshot", {
          format: "png",
          fromSurface: true
        });
        const editorPrefixedFile = resolve(outputDir, `${viewport.name}-light-speech-editor.png`);
        writeFileSync(editorPrefixedFile, Buffer.from(editorImage.data, "base64"));
        console.log(editorPrefixedFile);
        if (viewport.name === "iphone-15") {
          const editorFile = resolve(outputDir, "light-speech-editor.png");
          writeFileSync(editorFile, Buffer.from(editorImage.data, "base64"));
          console.log(editorFile);
        }
        await cdp.send("Runtime.evaluate", {
          expression: `document.getElementById("closeSpeechScript")?.click()`,
          awaitPromise: true
        });
        await wait(180);
      }
    }

    await cdp.send("Page.navigate", { url: `${appPath}&viewport=${viewport.name}&player=vision&t=${Date.now()}` });
    await wait(1000);
    await cdp.send("Runtime.evaluate", {
      expression: `document.querySelector('.nav button[data-view="vision"]')?.click()`,
      awaitPromise: true
    });
    await wait(420);
    await cdp.send("Runtime.evaluate", {
      expression: `document.getElementById("playVisionDeck")?.click()`,
      awaitPromise: true
    });
    await wait(780);
    const playerImage = await cdp.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true
    });
    const playerFile = resolve(outputDir, `${viewport.name}-player-vision.png`);
    writeFileSync(playerFile, Buffer.from(playerImage.data, "base64"));
    console.log(playerFile);
    if (viewport.name === "iphone-15") {
      const file = resolve(outputDir, "player-vision.png");
      writeFileSync(file, Buffer.from(playerImage.data, "base64"));
      console.log(file);
    }
  }
  cdp.close();
} finally {
  chrome.kill();
}
