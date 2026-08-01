const fs = require("node:fs");

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("Playwright is required through the project or NODE_PATH.");
  process.exit(2);
}

const baseUrl = (process.argv[2] || "http://127.0.0.1:4192").replace(/\/$/, "");
const executablePath = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
].filter(Boolean).find((candidate) => fs.existsSync(candidate));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function verifyKnowledgeBase(page, viewport) {
  const errors = [];
  const badResponses = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400 && !response.url().endsWith("/favicon.ico")) {
      badResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  const response = await page.goto(`${baseUrl}/knowledge-base.html`, { waitUntil: "networkidle" });
  assert(response && response.ok(), "knowledge base failed to load");
  assert(await page.locator(".kb-article").count() === 30, "expected 30 articles");
  assert(await page.locator("#categoryNav button").count() === 6, "category count mismatch");
  assert(await page.locator("#kbSearch").getAttribute("aria-label") === "搜索知识库", "search label missing");

  const cases = [
    ["双缝没反应", "双缝干涉看不到条纹或光子动画"],
    ["全反射", "为什么折射状态不能总是过渡到全反射？"],
    ["cita1 cita2", "坐标图应该怎样读？"],
    ["手机参数区", "手机上参数区在哪里？"],
  ];
  for (const [query, expectedTitle] of cases) {
    await page.locator("#kbSearch").fill(query);
    const titles = await page.locator(".kb-article .article-title strong").allTextContents();
    assert(titles.includes(expectedTitle), `query did not find expected article: ${query}`);
  }

  await page.goto(`${baseUrl}/knowledge-base.html?lesson=refraction.html`, { waitUntil: "networkidle" });
  assert(await page.locator("#contextPanel").isVisible(), "lesson context is hidden");
  assert(await page.locator("#contextLesson").textContent() === "折射与全反射", "lesson context label mismatch");
  assert(await page.locator(".kb-article .article-title strong").first().textContent() === "为什么折射状态不能总是过渡到全反射？", "context article was not prioritized");

  await page.goto(`${baseUrl}/knowledge-base.html#photon-dots`, { waitUntil: "networkidle" });
  assert(await page.locator("#photon-dots").getAttribute("open") !== null, "deep-linked article did not open");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert(overflow <= 1, `${viewport.name} horizontal overflow ${overflow}px`);

  await page.goto(`${baseUrl}/index.html`, { waitUntil: "networkidle" });
  assert(await page.locator('a[href="./knowledge-base.html"]').count() === 1, "homepage knowledge link missing");
  assert((await page.locator(".platform-hero p").textContent()).includes("65 个交互实验"), "homepage lab count is stale");

  await page.goto(`${baseUrl}/refraction.html?reset=1`, { waitUntil: "networkidle" });
  assert(await page.locator('a.support-link[href="./knowledge-base.html?lesson=refraction.html"]').count() === 1, "experiment support link missing");
  const relevantErrors = errors.filter((error) => !(
    error.includes("Failed to load resource") && badResponses.length === 0
  ));
  assert(badResponses.length === 0, badResponses.join("; "));
  assert(relevantErrors.length === 0, relevantErrors.join("; "));
}

(async () => {
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  let failed = false;
  try {
    for (const viewport of [
      { name: "desktop", width: 1280, height: 720 },
      { name: "mobile", width: 390, height: 844 },
    ]) {
      const page = await browser.newPage({ viewport });
      try {
        await verifyKnowledgeBase(page, viewport);
        console.log(`PASS ${viewport.name}`);
      } catch (error) {
        failed = true;
        console.error(`FAIL ${viewport.name}: ${error.message}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  if (failed) process.exitCode = 1;
})();
