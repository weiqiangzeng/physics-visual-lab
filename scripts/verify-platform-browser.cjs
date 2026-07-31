const fs = require("node:fs");

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("Playwright is required through the project or NODE_PATH.");
  process.exit(2);
}

const baseUrl = (process.argv[2] || "http://127.0.0.1:4192").replace(/\/$/, "");
const platformSource = fs.readFileSync("platform.js", "utf8");
const lessonBlock = platformSource.match(/const lessons = \[([\s\S]*?)\n  \];/);
if (!lessonBlock) throw new Error("Cannot read lesson order from platform.js");
const lessons = [...lessonBlock[1].matchAll(/"([^"]+\.html)"/g)].map((match) => match[1]);
const runLessons = process.env.LESSON ? lessons.filter((lesson) => lesson === process.env.LESSON) : lessons;
const executablePath = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium"
].filter(Boolean).find((candidate) => fs.existsSync(candidate));
const viewports = [
  { name: "desktop", width: 1280, height: 720 },
  { name: "mobile", width: 390, height: 844 }
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function verifyPage(page, lesson, viewport) {
  const errors = [];
  const badResponses = [];
  const onConsole = (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  };
  const onPageError = (error) => errors.push(`page: ${error.message}`);
  const onRequestFailed = (request) => errors.push(`request: ${request.url()}`);
  const onResponse = (response) => {
    if (response.status() >= 400 && !response.url().endsWith("/favicon.ico")) {
      badResponses.push(`${response.status()} ${response.url()}`);
    }
  };
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("requestfailed", onRequestFailed);
  page.on("response", onResponse);

  try {
    const response = await page.goto(`${baseUrl}/${lesson}`, { waitUntil: "networkidle" });
    assert(response && response.ok(), "page failed to load");
    assert(await page.locator(".completion-toggle").count() === 1, "completion toggle missing");
    assert(await page.locator(".task-panel").count() === 1, "task panel missing");

    const catalogTrigger = page.locator(".lab-catalog-toggle");
    assert(await catalogTrigger.isVisible(), "catalog trigger hidden");
    await catalogTrigger.click();
    const catalog = page.locator(".lab-catalog-dialog");
    assert(await catalog.isVisible(), "catalog did not open");
    assert(await catalog.locator(".lab-catalog-module").count() === 12, "catalog module count mismatch");
    assert(await catalog.locator("[data-catalog-lesson]").count() === lessons.length, "catalog lesson count mismatch");
    assert(await catalog.locator('[aria-current="page"]').count() === 1, "current catalog item mismatch");
    await catalog.locator('[aria-label="关闭实验目录"]').click();

    const navSelector = viewport.width <= 1120 ? ".mobile-scene-tabs" : ".lesson-rail";
    const sceneNav = page.locator(navSelector);
    const sceneButtons = sceneNav.locator(".scene-tab[data-mode]");
    if (await sceneButtons.count()) {
      assert(await sceneNav.isVisible(), "scene navigation hidden");
      const modes = await sceneButtons.evaluateAll((buttons) => buttons.map((button) => button.dataset.mode));
      for (const mode of modes) {
        await sceneNav.locator(`.scene-tab[data-mode="${mode}"]`).click();
        const active = await page.locator(".scene-tab.is-active").evaluateAll((buttons) => buttons.map((button) => button.dataset.mode));
        assert(active.length >= 2 && active.every((value) => value === mode), `scene state diverged at ${mode}`);
      }
    }

    const supportsStateRestore = await page.evaluate(() => window.physicsLabState.save() !== null);
    if (supportsStateRestore) {
      const range = page.locator('input[type="range"]:visible').first();
      if (await range.count()) {
        await range.evaluate((input) => {
          const min = Number(input.min || 0);
          const max = Number(input.max || 100);
          const current = Number(input.value);
          const first = min + (max - min) * 0.37;
          const second = min + (max - min) * 0.63;
          input.value = String(Math.abs(current - first) > Math.abs(current - second) ? first : second);
          input.dispatchEvent(new Event("input", { bubbles: true }));
        });
      }
      const beforeReload = await page.evaluate(() => window.physicsLabState.save());
      assert(beforeReload && Object.keys(beforeReload).length > 0, "empty state snapshot");
      assert(!("running" in beforeReload), "runtime running flag persisted");
      assert(!("dragging" in beforeReload), "runtime dragging flag persisted");
      await page.reload({ waitUntil: "networkidle" });
      assert(await page.locator("body").getAttribute("data-lab-state-restored") === "true", "state was not restored");
      const afterReload = await page.evaluate(() => window.physicsLabState.save());
      const changedFields = Object.keys(beforeReload).filter((field) => {
        const before = beforeReload[field];
        const after = afterReload[field];
        if (typeof before === "number" && typeof after === "number") {
          return Math.abs(before - after) > 1e-9;
        }
        return before !== after;
      }).map((field) => `${field}:${JSON.stringify(beforeReload[field])}->${JSON.stringify(afterReload[field])}`);
      assert(changedFields.length === 0, `state changed after reload (${changedFields.join(", ")})`);
    }

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(overflow <= 1, `horizontal overflow ${overflow}px`);
    const canvasEvidence = await page.locator("canvas").evaluateAll((canvases) => canvases.map((canvas) => {
      const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
      let nonblank = 0;
      for (let index = 0; index < pixels.length; index += 64) {
        if (pixels[index] || pixels[index + 1] || pixels[index + 2] || pixels[index + 3]) nonblank += 1;
      }
      return { id: canvas.id, nonblank };
    }));
    assert(canvasEvidence.length >= 3, `only ${canvasEvidence.length} canvases`);
    canvasEvidence.forEach((canvas) => assert(canvas.nonblank > 20, `blank canvas ${canvas.id}`));

    const relevantErrors = errors.filter((error) => !(
      error.includes("Failed to load resource") && badResponses.length === 0
    ));
    assert(badResponses.length === 0, badResponses.join("; "));
    assert(relevantErrors.length === 0, relevantErrors.join("; "));
    return supportsStateRestore;
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
    page.off("requestfailed", onRequestFailed);
    page.off("response", onResponse);
  }
}

(async () => {
  assert(lessons.length === 65, `expected 65 lessons, found ${lessons.length}`);
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  let failed = false;
  const adaptedLessons = new Set();
  try {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport });
      for (const lesson of runLessons) {
        try {
          if (await verifyPage(page, lesson, viewport)) adaptedLessons.add(lesson);
          console.log(`PASS ${viewport.name}/${lesson}`);
        } catch (error) {
          failed = true;
          console.error(`FAIL ${viewport.name}/${lesson}: ${error.message}`);
        }
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
  if (runLessons.length === lessons.length) {
    assert(adaptedLessons.size === lessons.length, `expected ${lessons.length} state adapters, found ${adaptedLessons.size}`);
  }
  if (failed) process.exitCode = 1;
})();
