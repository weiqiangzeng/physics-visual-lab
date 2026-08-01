const fs = require("node:fs");
const vm = require("node:vm");
const { chromium } = require("playwright");

const baseUrl = (process.argv[2] || "http://127.0.0.1:4192").replace(/\/$/, "");
const executablePath = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
].filter(Boolean).find((candidate) => fs.existsSync(candidate));
const context = { window: {} };
vm.runInNewContext(fs.readFileSync("teacher-packs.js", "utf8"), context);
const packs = context.window.physicsTeacherPacks.packs;
const stateFields = {
  "projectile.html": ["speed", "angle", "gravity", "target", "timeScale", "mode", "guideStep", "showComponents", "showAcceleration", "showStrobe", "showCompare"],
  "circular-critical.html": ["mode", "mass", "radius", "speed", "mu", "bank", "progress", "rate", "guideStep", "showForces", "showRadial", "showLimit", "showTrail", "showTheory"],
  "mechanical-energy.html": ["m", "position", "v0", "mu", "k", "mode", "boundary", "rate", "guideStep", "showVelocity", "showForce", "showFlow", "showReference"],
  "electric-field.html": ["mode", "q1", "q2", "separation", "uniformField", "testCharge", "probeX", "probeY", "path", "progress", "playbackRate", "guideStep", "showFieldLines", "showVectors", "showEquipotential", "showForce", "showPotentialMap"],
  "charged-particle.html": ["mode", "charge", "mass", "electric", "magnetic", "speed", "angle", "guideStep", "showTrail", "showVectors", "showField", "showDecomposition"],
  "electromagnetic-induction.html": ["field", "motion", "turns", "area", "resistance", "pole", "direction", "circuit", "mode", "playbackRate", "guideStep", "showField", "showFlux", "showInduced", "showCarriers"],
  "resonance.html": ["mode", "mass", "spring", "damping", "force", "frequency", "guideStep", "showForce", "showPhase", "showEnvelope", "showPower"],
  "double-slit.html": ["wavelength", "slit", "slitWidth", "screen", "cursorRatio", "mode", "guideStep", "showRays", "showWaves", "showEnvelope", "showLabels", "whichPath", "photonRate"],
  "refraction.html": ["angle", "medium1", "medium2", "wavelength", "mode", "guideStep", "showNormal", "showAngles", "showReflection", "showCritical"],
  "ideal-gas.html": ["mode", "amount", "baseVolume", "baseTemperature", "species", "progress", "playbackRate", "guideStep", "showVelocity", "showTrails", "showCollisions", "showPressure", "showSample"],
};

function assert(value, message) { if (!value) throw new Error(message); }

(async () => {
  assert(packs.length === 10, "teacher pack count must be 10");
  assert(packs.every((pack) => pack.sequence.length === 5 && pack.presets.length === 3), "pack structure mismatch");
  packs.forEach((pack) => pack.presets.forEach((preset) => {
    const unknown = Object.keys(preset.state).filter((key) => !stateFields[pack.lesson].includes(key));
    assert(!unknown.length, `${pack.lesson}/${preset.id}: unknown fields ${unknown.join(", ")}`);
  }));

  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const browserContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await browserContext.newPage();

  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    const failures = [];
    page.on("pageerror", (error) => failures.push(error.message));
    await page.goto(`${baseUrl}/teacher-resources.html?lesson=refraction.html`, { waitUntil: "networkidle" });
    assert(await page.locator(".teacher-pack").count() === 10, `catalog count at ${viewport.width}`);
    assert(await page.locator(".teacher-detail").isVisible(), `detail hidden at ${viewport.width}`);
    assert(await page.locator(".teacher-preset").count() === 3, `preset count at ${viewport.width}`);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), `horizontal overflow at ${viewport.width}`);
    assert(!failures.length, `resource page errors: ${failures.join(" | ")}`);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/index.html`, { waitUntil: "networkidle" });
  assert(await page.locator(".home-utility-links a").count() === 2, "mobile home utility links missing");
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), "mobile home overflow");
  await page.goto(`${baseUrl}/refraction.html?reset=1`, { waitUntil: "networkidle" });
  await page.locator(".teacher-pack-toggle").click();
  assert(await page.locator(".teacher-pack-dialog").isVisible(), "mobile pack dialog hidden");
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), "mobile pack dialog overflow");
  await page.locator('.teacher-pack-dialog [data-close]').click();
  await page.locator(".teacher-share-toggle").click();
  await page.locator(".teacher-share-qr svg").waitFor({ state: "visible", timeout: 5000 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), "mobile share dialog overflow");
  await page.locator('.teacher-share-dialog [data-close]').click();

  await page.setViewportSize({ width: 1280, height: 800 });
  for (const pack of packs) {
    await page.goto(`${baseUrl}/${pack.lesson}?reset=1`, { waitUntil: "networkidle" });
    assert(await page.locator(".teacher-pack-toggle").isVisible(), `${pack.lesson}: pack trigger missing`);
    assert(await page.locator(".teacher-share-toggle").isVisible(), `${pack.lesson}: share trigger missing`);
    await page.locator(".teacher-pack-toggle").click();
    assert(await page.locator(".teacher-pack-dialog").isVisible(), `${pack.lesson}: pack dialog hidden`);
    assert(await page.locator(".teacher-tool-presets button").count() === 3, `${pack.lesson}: dialog preset count`);
    for (let index = 0; index < pack.presets.length; index += 1) {
      if (index) await page.locator(".teacher-pack-toggle").click();
      await page.locator(".teacher-tool-presets button").nth(index).click();
      const result = await page.evaluate((expected) => {
        const scene = window.physicsSceneShare.createUrl();
        const decoded = window.physicsTeacherTools.readScene(new URL(scene).hash);
        return { decoded, restored: document.body.dataset.sharedSceneRestored || "" };
      }, pack.presets[index].state);
      assert(result.decoded?.lesson === pack.lesson, `${pack.lesson}/${pack.presets[index].id}: scene encoding failed`);
      Object.entries(pack.presets[index].state).forEach(([key, value]) => {
        const actual = result.decoded.state[key];
        const equal = typeof value === "number" ? Math.abs(actual - value) < 0.011 : actual === value;
        assert(equal, `${pack.lesson}/${pack.presets[index].id}: ${key} expected ${value}, got ${actual}`);
      });
    }
    await page.locator(".teacher-share-toggle").click();
    await page.locator(".teacher-share-qr svg").waitFor({ state: "visible", timeout: 5000 });
    const sharedUrl = await page.locator(".teacher-share-url input").inputValue();
    assert(sharedUrl.includes("#scene="), `${pack.lesson}: scene hash missing`);
    await page.locator('.teacher-share-dialog [data-close]').click();
    await page.goto(sharedUrl, { waitUntil: "networkidle" });
    assert(await page.evaluate(() => document.body.dataset.sharedSceneRestored === "true"), `${pack.lesson}: shared scene not restored`);
    console.log(`PASS ${pack.lesson}`);
  }

  await page.goto(`${baseUrl}/teacher-resources.html?lesson=double-slit.html`, { waitUntil: "networkidle" });
  await page.emulateMedia({ media: "print" });
  await page.evaluate(() => { document.body.dataset.printMode = "student"; });
  assert(await page.locator(".student-sheet").isVisible(), "student print sheet hidden");
  assert(await page.locator(".teacher-only").first().isHidden(), "teacher answer visible in student print");
  await browser.close();
  console.log("PASS teacher resources, presets, scene links, QR and print modes");
})().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
