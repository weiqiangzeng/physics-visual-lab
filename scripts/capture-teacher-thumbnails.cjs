const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:4192";
const outputDir = path.resolve(__dirname, "../assets/teacher");
const executablePath = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
].filter(Boolean).find((candidate) => fs.existsSync(candidate));
const lessons = [
  ["projectile", "projectile.html"],
  ["circular-critical", "circular-critical.html"],
  ["mechanical-energy", "mechanical-energy.html"],
  ["electric-field", "electric-field.html"],
  ["charged-particle", "charged-particle.html"],
  ["electromagnetic-induction", "electromagnetic-induction.html"],
  ["resonance", "resonance.html"],
  ["double-slit", "double-slit.html"],
  ["refraction", "refraction.html"],
  ["ideal-gas", "ideal-gas.html"],
];

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const failures = [];

  for (const [slug, lesson] of lessons) {
    const errors = [];
    const onError = (error) => errors.push(error.message);
    page.on("pageerror", onError);
    await page.goto(`${baseUrl}/${lesson}?reset=1`, { waitUntil: "networkidle" });
    await page.waitForTimeout(350);
    const stage = page.locator(".instrument-stage").first();
    if (await stage.count()) {
      await stage.screenshot({ path: path.join(outputDir, `${slug}.jpg`), type: "jpeg", quality: 84 });
    } else {
      failures.push(`${lesson}: missing .instrument-stage`);
    }
    if (errors.length) failures.push(`${lesson}: ${errors.join(" | ")}`);
    page.off("pageerror", onError);
  }

  await browser.close();
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exitCode = 1;
  } else {
    console.log(`PASS: captured ${lessons.length} teacher thumbnails`);
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
