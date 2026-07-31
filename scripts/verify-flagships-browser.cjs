const fs = require("node:fs");
const path = require("node:path");

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("Playwright is required through the project or NODE_PATH.");
  process.exit(2);
}

const baseUrl = (process.argv[2] || "http://127.0.0.1:4192").replace(/\/$/, "");
const screenshotDir = process.env.QA_SCREENSHOT_DIR;
const browserCandidates = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium"
].filter(Boolean);
const executablePath = browserCandidates.find((candidate) => fs.existsSync(candidate));
const labs = [
  { id: "motion-graphs", path: "motion-graphs.html", perturb: ["#initialSpeedInput", "3.4"] },
  { id: "pursuit", path: "pursuit.html", perturb: ["#gapInput", "55"] },
  { id: "elevator", path: "elevator.html", perturb: ["#massInput", "72"] },
  { id: "conveyor", path: "conveyor.html", perturb: ["#beltSpeedInput", "5"] },
  { id: "vertical-motion", path: "vertical-motion.html", perturb: ["#heightInput", "36"] },
  { id: "free-fall-measurement", path: "free-fall-measurement.html", perturb: ["#heightInput", "3.2"] },
  { id: "friction", path: "friction.html", perturb: ["#massInput", "3.2"] },
  { id: "newton-laws", path: "newton-laws.html", perturb: ["#massInput", "3.2"] },
  { id: "interaction", path: "interaction.html", perturb: ["#force1Input", "9.5"] },
  { id: "hooke-measurement", path: "hooke-measurement.html", perturb: ["#springInput", "55"] },
  { id: "force-composition", path: "force-composition.html", perturb: ["#force1Input", "9"] },
  { id: "motion-composition", path: "motion-composition.html", perturb: ["#currentInput", "2.5"] },
  { id: "projectile-drop-comparison", path: "projectile-drop-comparison.html", perturb: ["#speedInput", "18"] },
  { id: "projectile", path: "projectile.html", perturb: ["#speedInput", "24"] },
  { id: "circular", path: "circular.html", perturb: ["#radiusInput", "1.8"] },
  { id: "circular-critical", path: "circular-critical.html", perturb: ["#radiusInput", "55"] },
  { id: "orbital", path: "orbital.html", perturb: ["#altitudeInput", "1200"] },
  { id: "work-energy-process", path: "work-energy-process.html", perturb: ["#forceInput", "16"] },
  { id: "work-propulsion", path: "work-propulsion.html", perturb: ["#forceInput", "30"] },
  { id: "mechanical-energy", path: "mechanical-energy.html", perturb: ["#massInput", "3.2"] },
  { id: "locomotive", path: "locomotive.html", perturb: ["#powerInput", "150000"] },
  { id: "oscilloscope", path: "oscilloscope.html", perturb: ["#verticalInput", "65"] },
  { id: "electric-gravity", path: "electric-gravity.html", perturb: ["#fieldInput", "24"] },
  { id: "measurement-tools", path: "measurement-tools.html", perturb: ["#lengthInput", "17.42"] },
  { id: "resistivity", path: "resistivity.html", perturb: ["#diameterInput", "0.55"] },
  { id: "rc-circuit", path: "rc-circuit.html", perturb: ["#capacitanceInput", "150"] },
  { id: "ampere-force", path: "ampere-force.html", perturb: ["#angleInput", "60"] },
  { id: "refraction", path: "refraction.html", perturb: ["#angleInput", "42"] },
  { id: "electric-field", path: "electric-field.html", perturb: ["#testChargeInput", "-2"] },
  { id: "electrostatic-conductor", path: "electrostatic-conductor.html", perturb: ["#fieldInput", "1800"] },
  { id: "capacitor", path: "capacitor.html", perturb: ["#areaInput", "320"] },
  { id: "ohm-law", path: "ohm-law.html", perturb: ["#resistanceInput", "8"] },
  { id: "circuit-applications", path: "circuit-applications.html", perturb: ["#resistance1Input", "7"] },
  { id: "power-source", path: "power-source.html", perturb: ["#internalInput", "3"] },
  { id: "magnetic-field", path: "magnetic-field.html", perturb: ["#currentInput", "12"] },
  { id: "charged-particle", path: "charged-particle.html", perturb: ["#massInput", "3.2"] },
  { id: "mass-spectrometer", path: "mass-spectrometer.html", perturb: ["#electricInput", "140"] },
  { id: "cyclotron", path: "cyclotron.html", perturb: ["#voltageInput", "60"] },
  { id: "three-field", path: "three-field.html", perturb: ["#electricInput", "24"] },
  { id: "electromagnetic-induction", path: "electromagnetic-induction.html", perturb: ["#turnsInput", "160"] },
  { id: "rail-rod", path: "rail-rod.html", perturb: ["#fieldInput", "1.1"] },
  { id: "double-rail", path: "double-rail.html", perturb: ["#mass2Input", "1.2"] },
  { id: "alternating-current", path: "alternating-current.html", perturb: ["#generatorTurnsInput", "360"] },
  { id: "electromagnetic-oscillation", path: "electromagnetic-oscillation.html", perturb: ["#inductanceInput", "35"] },
  { id: "collision", path: "collision.html", perturb: ["#mass1Input", "3.2"] },
  { id: "collision-2d", path: "collision-2d.html", perturb: ["#normalInput", "30"] },
  { id: "oscillation", path: "oscillation.html", perturb: ["#springInput", "25"] },
  { id: "pendulum", path: "pendulum.html", perturb: ["#amplitudeInput", "35"] },
  { id: "resonance", path: "resonance.html", perturb: ["#dampingInput", "0.2"] },
  { id: "waves", path: "waves.html", perturb: ["#wavelengthInput", "3"] },
  { id: "wave-interference", path: "wave-interference.html", perturb: ["#phaseInput", "90"] },
  { id: "lens", path: "lens.html", perturb: ["#focalInput", "12"] },
  { id: "ideal-gas", path: "ideal-gas.html", perturb: ["#amountInput", "0.16"] },
  { id: "matter-phase", path: "matter-phase.html", perturb: ["#radiusInput", "1.2"] },
  { id: "thermodynamics", path: "thermodynamics.html", perturb: ["#temperatureInput", "450"] },
  { id: "photoelectric", path: "photoelectric.html", perturb: ["#wavelengthInput", "450"] },
  { id: "rutherford", path: "rutherford.html", perturb: ["#energyInput", "6"] },
  { id: "bohr", path: "bohr.html", perturb: ["#initialSelect", "4"] },
  { id: "matter-wave", path: "matter-wave.html", perturb: ["#speedInput", "6.8"] },
  { id: "radioactive-decay", path: "radioactive-decay.html", perturb: ["#halfLifeInput", "8"] },
  { id: "binding-energy", path: "binding-energy.html", perturb: ["#assemblyInput", "0.6"] },
  { id: "nuclear-reaction", path: "nuclear-reaction.html", perturb: ["#progressInput", "0.4"] },
  { id: "double-slit", path: "double-slit.html", perturb: ["#wavelengthInput", "650"] },
  { id: "single-slit", path: "single-slit.html", perturb: ["#widthInput", "0.08"] },
  { id: "thin-film", path: "thin-film.html", perturb: ["#thicknessInput", "240"] }
];
const runLabs = process.env.LAB ? labs.filter((lab) => lab.id === process.env.LAB) : labs;
const viewports = [
  { name: "desktop", width: 1280, height: 720 },
  { name: "mobile", width: 390, height: 844 }
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function closeTo(actual, expected, tolerance) {
  return Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance;
}

async function canvasEvidence(page) {
  return page.locator("canvas").evaluateAll((canvases) => canvases.map((canvas) => {
    const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    let nonblank = 0;
    for (let index = 0; index < data.length; index += 64) {
      if (data[index] || data[index + 1] || data[index + 2] || data[index + 3]) nonblank += 1;
    }
    return { id: canvas.id, nonblank };
  }));
}

async function verifyLab(browser, lab, viewport) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  const badResponses = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  page.on("requestfailed", (request) => errors.push(`request: ${request.url()}`));
  page.on("response", (response) => {
    if (response.status() >= 400 && !response.url().endsWith("/favicon.ico")) {
      badResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  try {
    const response = await page.goto(`${baseUrl}/${lab.path}`, { waitUntil: "networkidle" });
    assert(response && response.ok(), `${lab.id}/${viewport.name}: page failed to load`);
    await page.evaluate(() => window.physicsLabState?.clear());
    await page.reload({ waitUntil: "networkidle" });

    const catalogTrigger = page.locator(".lab-catalog-toggle");
    assert(await catalogTrigger.isVisible(), `${lab.id}/${viewport.name}: catalog trigger hidden`);
    await catalogTrigger.click();
    const catalog = page.locator(".lab-catalog-dialog");
    assert(await catalog.isVisible(), `${lab.id}/${viewport.name}: catalog did not open`);
    assert(await catalog.locator(".lab-catalog-module").count() === 12, `${lab.id}/${viewport.name}: catalog module count mismatch`);
    assert(await catalog.locator("[data-catalog-lesson]").count() === labs.length, `${lab.id}/${viewport.name}: catalog lesson count mismatch`);
    assert(await catalog.locator('[aria-current="page"]').count() === 1, `${lab.id}/${viewport.name}: current catalog item mismatch`);
    await catalog.locator('.lab-catalog-head button[aria-label="关闭实验目录"]').click();

    const navSelector = viewport.width <= 1120 ? ".mobile-scene-tabs" : ".lesson-rail";
    const nav = page.locator(navSelector);
    assert(await nav.isVisible(), `${lab.id}/${viewport.name}: scene navigation hidden`);
    const modes = await nav.locator(".scene-tab[data-mode]").evaluateAll((buttons) => buttons.map((button) => button.dataset.mode));
    assert(modes.length >= 3, `${lab.id}/${viewport.name}: fewer than three scenes`);

    for (const mode of modes) {
      await nav.locator(`.scene-tab[data-mode="${mode}"]`).click();
      const activeModes = await page.locator(".scene-tab.is-active").evaluateAll((buttons) => buttons.map((button) => button.dataset.mode));
      assert(activeModes.length >= 2 && activeModes.every((value) => value === mode), `${lab.id}/${viewport.name}: active scene diverged at ${mode}`);
    }
    await nav.locator(`.scene-tab[data-mode="${modes[0]}"]`).click();

    const perturbControl = page.locator(lab.perturb[0]);
    if (await perturbControl.evaluate((element) => element.tagName === "SELECT")) await perturbControl.selectOption(lab.perturb[1]);
    else await perturbControl.fill(lab.perturb[1]);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(overflow <= 1, `${lab.id}/${viewport.name}: horizontal overflow ${overflow}px`);

    const canvases = await canvasEvidence(page);
    assert(canvases.length >= 3, `${lab.id}/${viewport.name}: insufficient canvases`);
    canvases.forEach((canvas) => assert(canvas.nonblank > 20, `${lab.id}/${viewport.name}: blank canvas ${canvas.id}`));

    if (lab.id === "refraction") {
      const reference = await page.evaluate(() => ({
        airGlass: window.refractionLab.calculate({ medium1: "air", medium2: "glass", angle: 30 }),
        glassAir: window.refractionLab.calculate({ medium1: "glass", medium2: "air", angle: 50 })
      }));
      assert(closeTo(reference.airGlass.theta2, 19.471, 0.01), `${lab.id}/${viewport.name}: Snell reference mismatch`);
      assert(closeTo(reference.glassAir.critical, 41.81, 0.02) && reference.glassAir.total, `${lab.id}/${viewport.name}: critical reference mismatch`);
      await page.locator('[data-direction="glass-air"]').first().click();
      await page.locator("#angleInput").fill("50");
      assert(await page.locator("#modeTitle").textContent() === "全反射", `${lab.id}/${viewport.name}: cannot enter total reflection`);
      await page.locator("#angleInput").fill("30");
      assert(await page.locator("#modeTitle").textContent() === "折射定律", `${lab.id}/${viewport.name}: cannot return to refraction`);
    }

    if (lab.id === "motion-graphs") {
      const reference = await page.evaluate(() => window.motionLab.at(3, { mode: "uniform", duration: 6, x0: -2, v0: 2, a: 0 }));
      assert(closeTo(reference.x, 4, 1e-9) && closeTo(reference.v, 2, 1e-9), `${lab.id}/${viewport.name}: uniform-motion reference mismatch`);
    }

    if (lab.id === "pursuit") {
      const reference = await page.evaluate(() => ({
        chase: window.pursuitLab.encounter({ mode: "chase", gap: 40, vA: 6, vB: 10, aB: 0, delayB: 0 }),
        delay: window.pursuitLab.encounter({ mode: "delay", gap: 20, vA: 4, vB: 12, aB: 0, delayB: 2 }),
        opposite: window.pursuitLab.encounter({ mode: "opposite", gap: 80, vA: 6, vB: -10, aB: 0, delayB: 0 })
      }));
      assert(closeTo(reference.chase.time, 10, 1e-9) && closeTo(reference.chase.position, 100, 1e-9), `${lab.id}/${viewport.name}: chase reference mismatch`);
      assert(closeTo(reference.delay.time, 5.5, 1e-9) && closeTo(reference.delay.position, 42, 1e-9), `${lab.id}/${viewport.name}: delayed-start reference mismatch`);
      assert(closeTo(reference.opposite.time, 5, 1e-9) && closeTo(reference.opposite.position, 30, 1e-9), `${lab.id}/${viewport.name}: opposite-motion reference mismatch`);
      const canvas = page.locator("#pursuitCanvas");
      await page.evaluate(() => document.querySelector("#pursuitCanvas").scrollIntoView({ block: "center", inline: "center" }));
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * 0.18, box.y + box.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.5);
      await page.mouse.up();
      assert((await page.evaluate(() => window.pursuitLab.getState().time)) > 5, `${lab.id}/${viewport.name}: direct time drag did not update state`);
    }

    if (lab.id === "elevator") {
      const reference = await page.evaluate(() => ({
        rest: window.elevatorLab.reading({ mass: 60, gravity: 9.8, acceleration: 0 }),
        up: window.elevatorLab.reading({ mass: 60, gravity: 9.8, acceleration: 2 }),
        weightless: window.elevatorLab.reading({ mass: 60, gravity: 9.8, acceleration: -9.8 }),
        detached: window.elevatorLab.reading({ mass: 60, gravity: 9.8, acceleration: -12 })
      }));
      assert(closeTo(reference.rest.normal, 588, 1e-9), `${lab.id}/${viewport.name}: rest apparent-weight mismatch`);
      assert(closeTo(reference.up.normal, 708, 1e-9) && closeTo(reference.up.normal / reference.up.weight, 1.20408163265, 1e-9), `${lab.id}/${viewport.name}: upward apparent-weight mismatch`);
      assert(closeTo(reference.weightless.normal, 0, 1e-9) && closeTo(reference.weightless.weight, 588, 1e-9), `${lab.id}/${viewport.name}: weightless boundary mismatch`);
      assert(!reference.detached.contact && closeTo(reference.detached.normal, 0, 1e-9) && closeTo(reference.detached.acceleration, -9.8, 1e-9), `${lab.id}/${viewport.name}: contact-loss boundary mismatch`);
      const canvas = page.locator("#elevatorCanvas");
      await page.evaluate(() => document.querySelector("#elevatorCanvas").scrollIntoView({ block: "center", inline: "center" }));
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.5);
      await page.mouse.up();
      assert((await page.evaluate(() => window.elevatorLab.getState().time)) > 4, `${lab.id}/${viewport.name}: direct time drag did not update state`);
    }

    if (lab.id === "conveyor") {
      const reference = await page.evaluate(() => ({
        start: window.conveyorLab.solve(4 / 2.94, { mass: 2, muS: .5, muK: .3, angleDeg: 0, beltSpeed: 4, objectSpeed: 0 }),
        reverse: window.conveyorLab.solve(6 / 2.94, { mass: 2, muS: .5, muK: .3, angleDeg: 0, beltSpeed: 4, objectSpeed: -2 }),
        fastBefore: window.conveyorLab.solve(1, { mass: 2, muS: .5, muK: .3, angleDeg: 0, beltSpeed: 3, objectSpeed: 8 }),
        fast: window.conveyorLab.solve(5 / 2.94, { mass: 2, muS: .5, muK: .3, angleDeg: 0, beltSpeed: 3, objectSpeed: 8 }),
        steep: window.conveyorLab.solve(3, { mass: 2, muS: .2, muK: .15, angleDeg: 30, beltSpeed: 3, objectSpeed: 3 })
      }));
      assert(closeTo(reference.start.syncTime, 4 / 2.94, 1e-9) && closeTo(reference.start.heat, 16, 1e-9) && closeTo(reference.start.energyResidual, 0, 1e-12), `${lab.id}/${viewport.name}: horizontal-start reference mismatch`);
      assert(closeTo(reference.reverse.syncTime, 6 / 2.94, 1e-9) && closeTo(reference.reverse.heat, 36, 1e-9), `${lab.id}/${viewport.name}: reverse-start reference mismatch`);
      assert(reference.fastBefore.friction < 0 && reference.fastBefore.relativeVelocity > 0 && closeTo(reference.fast.syncTime, 5 / 2.94, 1e-9) && closeTo(reference.fast.heat, 25, 1e-9), `${lab.id}/${viewport.name}: faster-object reference mismatch`);
      assert(!reference.steep.canStick && reference.steep.regime === "sliding", `${lab.id}/${viewport.name}: incline static-limit boundary mismatch`);
      const canvas = page.locator("#conveyorCanvas");
      await page.evaluate(() => document.querySelector("#conveyorCanvas").scrollIntoView({ block: "center", inline: "center" }));
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * .18, box.y + box.height * .5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * .74, box.y + box.height * .5);
      await page.mouse.up();
      assert((await page.evaluate(() => window.conveyorLab.getState().time)) > 4, `${lab.id}/${viewport.name}: direct time drag did not update state`);
    }

    if (lab.id === "vertical-motion") {
      const reference = await page.evaluate(() => ({
        dropTime: window.VerticalMotionModel.landingTime({ initialHeightM: 20, initialVelocityMs: 0, gravityMs2: 9.8 }),
        apex: window.verticalMotionLab.solve({ heightM: 20, speedMs: 20, gravity: 9.8, timeS: 20 / 9.8 })
      }));
      assert(closeTo(reference.dropTime, 2.020305, 1e-5), `${lab.id}/${viewport.name}: drop-time reference mismatch`);
      assert(closeTo(reference.apex.velocityMs, 0, 1e-9) && closeTo(reference.apex.accelerationMs2, -9.8, 1e-9), `${lab.id}/${viewport.name}: apex reference mismatch`);
    }

    if (lab.id === "free-fall-measurement") {
      const reference = await page.evaluate(() => {
        const ideal = { gravityMs2: 9.8, heightM: 2.4, sampleCount: 7, strobeIntervalS: .08, timeResolutionMs: .001, positionNoiseMm: 0, repeats: 30, seed: 23 };
        const gate = window.freeFallMeasurementLab.gateMeasurement(ideal);
        const strobe = window.freeFallMeasurementLab.strobeMeasurement(ideal);
        const uncertainty = window.freeFallMeasurementLab.uncertaintySummary({ ...ideal, timeResolutionMs: .1, positionNoiseMm: .5 });
        return { gate, strobe, uncertainty };
      });
      assert(closeTo(reference.gate.impactTimeS, .6998542122237651, 1e-12) && Math.abs(reference.gate.estimatedGravityMs2 - 9.8) < 1e-4, `${lab.id}/${viewport.name}: gate timing or fit reference mismatch`);
      assert(closeTo(reference.strobe.estimatedGravityMs2, 9.8, 1e-10) && closeTo(reference.strobe.idealSecondDifferenceM, .06272, 1e-12), `${lab.id}/${viewport.name}: equal-time second-difference mismatch`);
      assert(reference.uncertainty.standardDeviation > 0 && closeTo(reference.uncertainty.standardError, reference.uncertainty.standardDeviation / Math.sqrt(30), 1e-12) && Math.abs(reference.uncertainty.mean - 9.8) < .01, `${lab.id}/${viewport.name}: repeated-measurement uncertainty mismatch`);
      const canvas = page.locator("#fallCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const before = await page.evaluate(() => window.freeFallMeasurementLab.getState().heightM);
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * .3, box.y + box.height * .15);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * .3, box.y + box.height * .95);
      await page.mouse.up();
      const after = await page.evaluate(() => window.freeFallMeasurementLab.getState().heightM);
      assert(Math.abs(after - before) > 1.5, `${lab.id}/${viewport.name}: direct release-height drag did not update state`);
    }

    if (lab.id === "friction") {
      const reference = await page.evaluate(() => ({
        staticState: window.frictionLab.calculate({ mass: 2, muS: 0.5, muK: 0.3, appliedForce: 5, sliding: false, velocity: 0 }),
        slidingState: window.frictionLab.calculate({ mass: 2, muS: 0.5, muK: 0.3, appliedForce: 12, sliding: false, velocity: 0 })
      }));
      assert(closeTo(reference.staticState.maxStatic, 9.8, 1e-9) && closeTo(reference.staticState.friction, 5, 1e-9) && closeTo(reference.staticState.acceleration, 0, 1e-9), `${lab.id}/${viewport.name}: static-friction reference mismatch`);
      assert(closeTo(reference.slidingState.friction, 5.88, 1e-9) && reference.slidingState.sliding, `${lab.id}/${viewport.name}: sliding-friction reference mismatch`);
      const canvas = page.locator("#frictionCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.5);
      await page.mouse.up();
      assert((await page.evaluate(() => window.frictionLab.getState().targetForce)) > 24, `${lab.id}/${viewport.name}: direct force drag did not update state`);
    }

    if (lab.id === "newton-laws") {
      const reference = await page.evaluate(() => window.newtonLab.calculate({ mass: 2, rightForce: 6, leftForce: 2 }));
      assert(closeTo(reference.netForce, 4, 1e-9) && closeTo(reference.acceleration, 2, 1e-9), `${lab.id}/${viewport.name}: F=ma reference mismatch`);
    }

    if (lab.id === "interaction") {
      const reference = await page.evaluate(() => ({
        vector: window.InteractionModel.vectorResultant({ force1N: 6, force2N: 8, angle2Rad: Math.PI / 2 }),
        spring: window.InteractionModel.spring({ springConstantNm: 40, deformationM: 0.15 })
      }));
      assert(closeTo(reference.vector.resultantN, 10, 1e-9), `${lab.id}/${viewport.name}: vector reference mismatch`);
      assert(closeTo(reference.spring.hookeForceN, -6, 1e-9) && closeTo(reference.spring.elasticEnergyJ, 0.45, 1e-9), `${lab.id}/${viewport.name}: spring reference mismatch`);
      const canvas = page.locator("#interactionCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const beforeDrag = await page.evaluate(() => window.interactionLab.getState().force2);
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * 0.42, box.y + box.height * 0.58);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.4);
      await page.mouse.up();
      const afterDrag = await page.evaluate(() => window.interactionLab.getState().force2);
      assert(Math.abs(afterDrag - beforeDrag) > 0.2, `${lab.id}/${viewport.name}: direct vector drag did not update state`);
    }

    if (lab.id === "hooke-measurement") {
      const reference = await page.evaluate(() => {
        const ideal = { springConstantNm: 40, naturalLengthCm: 12, massStepG: 50, gravityMs2: 9.8, pointCount: 8, loadIndex: 6, elasticLimitN: 3.2, postYieldRatio: .3, rulerResolutionMm: .1, readingNoiseMm: 0, zeroErrorMm: .6, seed: 31 };
        return { experiment: window.hookeMeasurementLab.experiment(ideal), hysteresis: window.hookeMeasurementLab.hysteresis(ideal) };
      });
      assert(closeTo(reference.experiment.data[1].forceN, .49, 1e-12) && closeTo(reference.experiment.data[1].trueExtensionM, .01225, 1e-12), `${lab.id}/${viewport.name}: one-weight Hooke reference mismatch`);
      assert(Math.abs(reference.experiment.estimatedSpringConstantNm - 40) < .001 && reference.experiment.allFit.slope < reference.experiment.estimatedSpringConstantNm, `${lab.id}/${viewport.name}: elastic-only fit or overloaded-fit bias mismatch`);
      assert(closeTo(reference.experiment.maximum.maximumExtensionM, .09916666666666667, 1e-12) && closeTo(reference.experiment.maximum.permanentSetM, .01341666666666666, 1e-12), `${lab.id}/${viewport.name}: overload or permanent-set reference mismatch`);
      assert(reference.hysteresis.loopAreaJ > 0 && closeTo(reference.experiment.zeroErrorCancellationResidualMm, 0, 1e-12), `${lab.id}/${viewport.name}: hysteresis or common zero-error cancellation mismatch`);
      const canvas = page.locator("#springCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const before = await page.evaluate(() => window.hookeMeasurementLab.getState().loadIndex);
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * .3, box.y + box.height * .5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * .3, box.y + box.height * .08);
      await page.mouse.up();
      const after = await page.evaluate(() => window.hookeMeasurementLab.getState().loadIndex);
      assert(Math.abs(after - before) >= 4, `${lab.id}/${viewport.name}: direct weight-stack drag did not update load`);
    }

    if (lab.id === "force-composition") {
      const reference = await page.evaluate(() => {
        const base = { force1N: 6, force2N: 8, direction1Deg: 0, direction2Deg: 90, targetForceN: 10, targetDirectionDeg: Math.atan2(8, 6) / window.ForceCompositionModel.DEG, forceResolutionN: .1, angleResolutionDeg: .5, readingNoise: .25, seed: 41 };
        return {
          compose: window.forceCompositionLab.compose(base),
          decompose: window.forceCompositionLab.decompose(base),
          apparatus: window.forceCompositionLab.apparatus(base),
          near: window.forceCompositionLab.sensitivity({ ...base, direction1Deg: 30, direction2Deg: 31, targetDirectionDeg: 30.5 }),
          invalid: window.forceCompositionLab.decompose({ ...base, direction1Deg: 0, direction2Deg: 60, targetDirectionDeg: 90 }),
          work: window.forceCompositionLab.workEquivalence(base),
        };
      });
      assert(closeTo(reference.compose.resultantN, 10, 1e-12) && closeTo(reference.compose.resultantDirectionDeg, 53.13010235415598, 1e-12), `${lab.id}/${viewport.name}: forward composition mismatch`);
      assert(closeTo(reference.decompose.force1N, 6, 1e-12) && closeTo(reference.decompose.force2N, 8, 1e-12) && closeTo(reference.decompose.closureResidualN, 0, 1e-12), `${lab.id}/${viewport.name}: inverse decomposition mismatch`);
      assert(closeTo(reference.apparatus.closureResidualN, .02270713956778767, 1e-12), `${lab.id}/${viewport.name}: apparatus closure mismatch`);
      assert(reference.near.center.conditionNumber > 100 && closeTo(reference.near.spreadN, 10, 1e-9), `${lab.id}/${viewport.name}: near-collinear sensitivity mismatch`);
      assert(!reference.invalid.validTensions && reference.invalid.force1N < 0 && closeTo(reference.work.residualJ, 0, 1e-12), `${lab.id}/${viewport.name}: tension boundary or work equivalence mismatch`);
      const canvas = page.locator("#forceCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const before = await page.evaluate(() => window.forceCompositionLab.getState());
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * .75, box.y + box.height * .25);
      await page.mouse.up();
      const after = await page.evaluate(() => window.forceCompositionLab.getState());
      assert(Math.abs(after.force2N - before.force2N) > 1 || Math.abs(after.direction2Deg - before.direction2Deg) > 10, `${lab.id}/${viewport.name}: direct vector drag did not update state`);
    }

    if (lab.id === "motion-composition") {
      const reference = await page.evaluate(() => {
        const wax = window.motionCompositionLab.wax({ carrierSpeedMs: 1.2, relativeSpeedMs: .8, tubeHeightM: 1.2 }, 1);
        const base = { riverCurrentMs: 2, boatSpeedMs: 3, headingDeg: 0, riverWidthM: 120 };
        return {
          wax,
          river: window.motionCompositionLab.river(base, 1),
          strategy: window.motionCompositionLab.strategies(base),
          strong: window.motionCompositionLab.strategies({ ...base, riverCurrentMs: 4 }),
          frame: window.motionCompositionLab.frameComparison(base, 20),
        };
      });
      assert(closeTo(reference.wax.topTimeS, 1.5, 1e-12) && closeTo(reference.wax.horizontalAtTopM, 1.8, 1e-12) && closeTo(reference.wax.frameResidualM, 0, 1e-12), `${lab.id}/${viewport.name}: wax frame composition mismatch`);
      assert(closeTo(reference.river.crossingTimeS, 40, 1e-12) && closeTo(reference.river.driftM, 80, 1e-12) && closeTo(reference.river.pathLengthM, 144.22205101855957, 1e-12), `${lab.id}/${viewport.name}: straight-across river reference mismatch`);
      assert(reference.strategy.canCancelDrift && closeTo(reference.strategy.shortestHeadingDeg, 41.810314895778596, 1e-12) && closeTo(reference.strategy.shortest.driftM, 0, 1e-10) && closeTo(reference.strategy.shortest.pathLengthM, 120, 1e-10), `${lab.id}/${viewport.name}: zero-drift strategy mismatch`);
      assert(!reference.strong.canCancelDrift && closeTo(reference.strong.shortest.driftM, 105.83005244258362, 1e-10), `${lab.id}/${viewport.name}: strong-current boundary mismatch`);
      assert(closeTo(reference.frame.positionResidualM, 0, 1e-12) && closeTo(reference.frame.crossingEventTimeGroundS, reference.frame.crossingEventTimeWaterS, 1e-12), `${lab.id}/${viewport.name}: Galilean frame event mismatch`);
      await page.evaluate(() => window.motionCompositionLab.setMode("river"));
      const canvas = page.locator("#motionCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const before = await page.evaluate(() => window.motionCompositionLab.getState().headingDeg);
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * .5, box.y + box.height * .78);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * .25, box.y + box.height * .25);
      await page.mouse.up();
      const after = await page.evaluate(() => window.motionCompositionLab.getState().headingDeg);
      assert(Math.abs(after - before) > 15, `${lab.id}/${viewport.name}: direct boat-heading drag did not update state`);
    }

    if (lab.id === "projectile-drop-comparison") {
      const reference = await page.evaluate(() => {
        const base = { heightM: 20, launchSpeedMs: 12, gravityMs2: 9.8, releaseDelayMs: 0, dragPerM: .03, strobeIntervalS: .2, timerResolutionMs: 1 };
        return {
          ideal: window.projectileDropComparisonLab.idealComparison(base),
          strobe: window.projectileDropComparisonLab.strobe(base),
          delay: window.projectileDropComparisonLab.idealComparison({ ...base, releaseDelayMs: 80 }),
          drag: window.projectileDropComparisonLab.dragComparison(base),
          sweep: window.projectileDropComparisonLab.speedSweep(base),
        };
      });
      assert(closeTo(reference.ideal.landingTimeS, 2.0203050891044216, 1e-12) && closeTo(reference.ideal.horizontalRangeM, 24.243661069253058, 1e-12), `${lab.id}/${viewport.name}: ideal landing or range mismatch`);
      assert(closeTo(reference.strobe.maximumVerticalResidualM, 0, 1e-12) && closeTo(reference.sweep.timeVariationS, 0, 1e-12), `${lab.id}/${viewport.name}: vertical strobe or speed independence mismatch`);
      assert(closeTo(reference.delay.impactTimeDifferenceS, .08, 1e-12), `${lab.id}/${viewport.name}: release-delay timing mismatch`);
      assert(closeTo(reference.drag.projectile.landingTimeS, 2.312047531048469, 1e-9) && closeTo(reference.drag.dropped.landingTimeS, 2.227075806264813, 1e-9) && closeTo(reference.drag.impactTimeDifferenceS, .08497172478365611, 1e-9), `${lab.id}/${viewport.name}: quadratic-drag boundary mismatch`);
      const canvas = page.locator("#comparisonCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const before = await page.evaluate(() => window.projectileDropComparisonLab.getState().progress);
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * .45, box.y + box.height * .75);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * .45, box.y + box.height * .15);
      await page.mouse.up();
      const after = await page.evaluate(() => window.projectileDropComparisonLab.getState().progress);
      assert(Math.abs(after - before) > .3, `${lab.id}/${viewport.name}: direct experiment-progress drag did not update state`);
    }

    if (lab.id === "projectile") {
      const reference = await page.evaluate(() => window.projectileLab.calculate({ speed: 20, angle: 45, gravity: 10 }));
      assert(closeTo(reference.range, 40, 1e-9), `${lab.id}/${viewport.name}: projectile-range reference mismatch`);
    }

    if (lab.id === "circular") {
      const reference = await page.evaluate(() => window.circularLab.calculate({ mass: 2, radius: 2, speed: 4 }));
      assert(closeTo(reference.acceleration, 8, 1e-9) && closeTo(reference.force, 16, 1e-9), `${lab.id}/${viewport.name}: centripetal reference mismatch`);
    }

    if (lab.id === "circular-critical") {
      const reference = await page.evaluate(() => ({
        flat: window.CircularCriticalModel.flatTurn({ massKg: 1200, radiusM: 40, speedMps: 14, frictionCoefficient: 0.5 }),
        hill: window.CircularCriticalModel.hillCrest({ massKg: 1000, radiusM: 40, speedMps: Math.sqrt(9.8 * 40) })
      }));
      assert(closeTo(reference.flat.maxSpeedMps, 14, 1e-9), `${lab.id}/${viewport.name}: flat-turn critical reference mismatch`);
      assert(closeTo(reference.hill.normalForceN, 0, 1e-7), `${lab.id}/${viewport.name}: hill-contact reference mismatch`);
      const canvas = page.locator("#criticalCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.5);
      await page.mouse.up();
      assert((await page.evaluate(() => window.circularCriticalLab.getState().progress)) > 0.7, `${lab.id}/${viewport.name}: direct process drag did not update state`);
    }

    if (lab.id === "orbital") {
      const reference = await page.evaluate(() => window.OrbitalModel.circularState(400));
      assert(closeTo(reference.speedKms, 7.673, 0.002) && closeTo(reference.periodMinutes, 92.41, 0.03), `${lab.id}/${viewport.name}: circular-orbit reference mismatch`);
      const canvas = page.locator("#orbitalCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.5);
      await page.mouse.up();
      assert((await page.evaluate(() => window.orbitalLab.getState().progress)) > 0.7, `${lab.id}/${viewport.name}: direct orbit drag did not update state`);
    }

    if (lab.id === "work-energy-process") {
      const reference = await page.evaluate(() => ({
        constant: window.workEnergyProcessLab.constantProcess({ massKg: 2, initialSpeedMs: 3, distanceM: 6, appliedForceN: 10, forceAngleDeg: 0, frictionForceN: 3 }),
        variable: window.workEnergyProcessLab.variableProcess({ massKg: 2, initialSpeedMs: 3, distanceM: 6, variableStartN: 4, variableSlopeNpm: 1.5, frictionForceN: 3 }),
        incline: window.workEnergyProcessLab.inclineProcess({ massKg: 2, initialSpeedMs: 3, distanceM: 4, appliedForceN: 20, inclineAngleDeg: 30, frictionCoefficient: .2, gravityMs2: 9.8 }),
        braking: window.workEnergyProcessLab.brakingProcess({ massKg: 2, initialSpeedMs: 8, distanceM: 20, brakeForceN: 5 }),
      }));
      assert(closeTo(reference.constant.netWorkJ, 42, 1e-12) && closeTo(reference.constant.finalKineticJ, 51, 1e-12) && closeTo(reference.constant.finalSpeedMs, 7.14142842854285, 1e-12), `${lab.id}/${viewport.name}: constant-force work-energy mismatch`);
      assert(closeTo(reference.variable.netWorkJ, 33, 1e-12) && closeTo(reference.variable.finalKineticJ, 42, 1e-12) && closeTo(reference.variable.integrationResidualJ, 0, 1e-10), `${lab.id}/${viewport.name}: variable-force area mismatch`);
      assert(closeTo(reference.incline.netWorkJ, 27.220721668660005, 1e-12) && closeTo(reference.incline.theoremResidualJ, 0, 1e-12), `${lab.id}/${viewport.name}: incline work ledger mismatch`);
      assert(!reference.braking.reachedTarget && closeTo(reference.braking.stopDistanceM, 12.8, 1e-12) && closeTo(reference.braking.finalKineticJ, 0, 1e-12), `${lab.id}/${viewport.name}: braking stop boundary mismatch`);
      const canvas = page.locator("#workCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const before = await page.evaluate(() => window.workEnergyProcessLab.getState().progress);
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * .25, box.y + box.height * .6);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * .94, box.y + box.height * .6);
      await page.mouse.up();
      const after = await page.evaluate(() => window.workEnergyProcessLab.getState().progress);
      assert(Math.abs(after - before) > .25, `${lab.id}/${viewport.name}: direct displacement drag did not update state`);
    }

    if (lab.id === "work-propulsion") {
      const reference = await page.evaluate(() => ({
        work: window.WorkPropulsionModel.constantForceWork({ forceN: 20, displacementM: 5, angleDeg: 60, massKg: 2, initialSpeedMs: 3 }),
        recoil: window.WorkPropulsionModel.recoil({ projectileMassKg: 0.02, projectileSpeedMs: 300, launcherMassKg: 3 }),
        rocket: window.WorkPropulsionModel.rocket({ initialMassKg: 6000, finalMassKg: 3000, exhaustSpeedMs: 3000 })
      }));
      assert(closeTo(reference.work.workJ, 50, 1e-9) && closeTo(reference.work.kineticTheoremResidualJ, 0, 1e-9), `${lab.id}/${viewport.name}: work-energy reference mismatch`);
      assert(closeTo(reference.recoil.momentumResidual, 0, 1e-9), `${lab.id}/${viewport.name}: recoil momentum residual mismatch`);
      assert(closeTo(reference.rocket.idealDeltaVMs, 3000 * Math.log(2), 1e-9), `${lab.id}/${viewport.name}: rocket equation reference mismatch`);
      const canvas = page.locator("#workCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const beforeDrag = await page.evaluate(() => window.workPropulsionLab.getState().angle);
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.6);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.48, box.y + box.height * 0.25);
      await page.mouse.up();
      const afterDrag = await page.evaluate(() => window.workPropulsionLab.getState().angle);
      assert(Math.abs(afterDrag - beforeDrag) > 5, `${lab.id}/${viewport.name}: direct force-angle drag did not update state`);
    }

    if (lab.id === "mechanical-energy") {
      const reference = await page.evaluate(() => {
        const gravity = window.mechanicalEnergyLab.solve({ mode: "gravity", m: 2, position: 4, v0: 0 });
        const rough = window.mechanicalEnergyLab.solve({ mode: "rough", m: 2, position: 4, v0: 0, mu: 0.15 });
        const roughEnd = window.mechanicalEnergyLab.sampleAt(rough.duration, { mode: "rough", m: 2, position: 4, v0: 0, mu: 0.15 });
        const spring = window.mechanicalEnergyLab.solve({ mode: "spring", m: 2, position: 1, v0: 0, k: 40 });
        const springEnd = window.mechanicalEnergyLab.sampleAt(spring.duration, { mode: "spring", m: 2, position: 1, v0: 0, k: 40 });
        return { gravity, roughEnd, spring, springEnd };
      });
      assert(closeTo(reference.gravity.initialEnergy, 78.4, 1e-9), `${lab.id}/${viewport.name}: gravity-energy reference mismatch`);
      assert(closeTo(reference.roughEnd.residual, 0, 1e-8), `${lab.id}/${viewport.name}: rough total-energy residual mismatch`);
      assert(closeTo(reference.springEnd.total, reference.spring.initialEnergy, 1e-8), `${lab.id}/${viewport.name}: spring-energy reference mismatch`);
    }

    if (lab.id === "electric-field") {
      const reference = await page.evaluate(() => window.electricFieldLab.solve({
        mode: "single", q1: 6, q2: 0, separation: 3, x: 2, y: 0,
        testCharge: 2, uniformField: 12, path: "direct"
      }));
      assert(closeTo(reference.magnitude, 13.482, 0.002), `${lab.id}/${viewport.name}: field reference mismatch`);
      assert(closeTo(reference.potential, 26.964, 0.002), `${lab.id}/${viewport.name}: potential reference mismatch`);
    }

    if (lab.id === "electrostatic-conductor") {
      const reference = await page.evaluate(() => ({
        equilibrium: window.ElectrostaticConductorModel.redistribution({ externalFieldVm: 1000, progress: 1 }),
        surface: window.ElectrostaticConductorModel.uniformFieldSphere({ radiusM: 1, externalFieldVm: 1000, probeRadiusM: 1, probeAngleRad: Math.PI / 3 }),
        cavity: window.ElectrostaticConductorModel.concentricCavity({ cavityRadiusM: 0.5, outerRadiusM: 1, internalChargeC: 2e-9, conductorNetChargeC: 1e-9, probeRadiusM: 0.75 })
      }));
      assert(closeTo(reference.equilibrium.interiorFieldVm, 0, 1e-12), `${lab.id}/${viewport.name}: conductor-equilibrium reference mismatch`);
      assert(closeTo(reference.surface.surfaceTangentialResidualVm, 0, 1e-12), `${lab.id}/${viewport.name}: surface-tangential reference mismatch`);
      assert(closeTo(reference.cavity.innerSurfaceChargeC, -2e-9, 1e-18) && closeTo(reference.cavity.outerSurfaceChargeC, 3e-9, 1e-18) && closeTo(reference.cavity.chargeLedgerResidualC, 0, 1e-18), `${lab.id}/${viewport.name}: cavity charge-ledger mismatch`);
      const canvas = page.locator("#conductorCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.82, box.y + box.height * 0.5);
      await page.mouse.up();
      assert((await page.evaluate(() => window.electrostaticConductorLab.getState().progress)) > 0.75, `${lab.id}/${viewport.name}: direct redistribution drag did not update state`);
    }

    if (lab.id === "capacitor") {
      const reference = await page.evaluate(() => {
        const base = window.CapacitorModel.geometry({ areaM2: 0.02, separationM: 0.002, relativePermittivity: 1, dielectricFraction: 0 });
        const battery = window.CapacitorModel.transition({ constraint: "battery", initialAreaM2: 0.02, initialSeparationM: 0.002, initialVoltageV: 120, finalAreaM2: 0.02, finalSeparationM: 0.004 });
        const isolated = window.CapacitorModel.transition({ constraint: "isolated", initialAreaM2: 0.02, initialSeparationM: 0.002, initialVoltageV: 120, finalAreaM2: 0.02, finalSeparationM: 0.004 });
        return { base, battery, isolated };
      });
      assert(closeTo(reference.base.capacitanceF, 88.541878128e-12, 1e-20), `${lab.id}/${viewport.name}: capacitance reference mismatch`);
      assert(closeTo(reference.battery.final.capacitanceF / reference.battery.initial.capacitanceF, 0.5, 1e-12) && closeTo(reference.battery.final.chargeC / reference.battery.initial.chargeC, 0.5, 1e-12) && closeTo(reference.battery.final.voltageV, 120, 1e-12), `${lab.id}/${viewport.name}: fixed-voltage response mismatch`);
      assert(closeTo(reference.isolated.final.chargeC / reference.isolated.initial.chargeC, 1, 1e-12) && closeTo(reference.isolated.final.voltageV / reference.isolated.initial.voltageV, 2, 1e-12), `${lab.id}/${viewport.name}: fixed-charge response mismatch`);
      assert(closeTo(reference.battery.energyResidualJ, 0, 1e-18) && closeTo(reference.isolated.energyResidualJ, 0, 1e-18), `${lab.id}/${viewport.name}: capacitor energy-ledger mismatch`);
      const canvas = page.locator("#capacitorCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const beforeDrag = await page.evaluate(() => window.capacitorLab.getState().distanceMm);
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * 0.48, box.y + box.height * 0.35);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.48, box.y + box.height * 0.75);
      await page.mouse.up();
      const afterDrag = await page.evaluate(() => window.capacitorLab.getState().distanceMm);
      assert(Math.abs(afterDrag - beforeDrag) > 1, `${lab.id}/${viewport.name}: direct plate-distance drag did not update state`);
    }

    if (lab.id === "ohm-law") {
      const reference = await page.evaluate(() => ({ resistor: window.ohmLab.derived(6, 3, "resistor"), lamp: window.ohmLab.derived(6, 3, "lamp") }));
      assert(closeTo(reference.resistor.I, 2, 1e-12) && closeTo(reference.resistor.conductance, 1 / 3, 1e-12), `${lab.id}/${viewport.name}: Ohm reference mismatch`);
      assert(reference.lamp.I < reference.resistor.I, `${lab.id}/${viewport.name}: lamp boundary mismatch`);
      const canvas = page.locator("#ohmCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const beforeDrag = await page.evaluate(() => window.ohmLab.getState().voltage);
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.5);
      await page.mouse.up();
      const afterDrag = await page.evaluate(() => window.ohmLab.getState().voltage);
      assert(Math.abs(afterDrag - beforeDrag) > 1, `${lab.id}/${viewport.name}: direct voltage drag did not update state`);
    }

    if (lab.id === "circuit-applications") {
      const reference = await page.evaluate(() => ({
        series: window.CircuitApplicationsModel.series({ voltageV: 12, resistance1Ohm: 4, resistance2Ohm: 8 }),
        parallel: window.CircuitApplicationsModel.parallel({ voltageV: 12, resistance1Ohm: 6, resistance2Ohm: 3 })
      }));
      assert(closeTo(reference.series.currentA, 1, 1e-12) && closeTo(reference.series.voltage1V, 4, 1e-12) && closeTo(reference.series.voltage2V, 8, 1e-12) && closeTo(reference.series.kvlResidualV, 0, 1e-12), `${lab.id}/${viewport.name}: series reference mismatch`);
      assert(closeTo(reference.parallel.current1A, 2, 1e-12) && closeTo(reference.parallel.current2A, 4, 1e-12) && closeTo(reference.parallel.totalResistanceOhm, 2, 1e-12) && closeTo(reference.parallel.kclResidualA, 0, 1e-12), `${lab.id}/${viewport.name}: parallel reference mismatch`);
      const canvas = page.locator("#circuitCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const beforeDrag = await page.evaluate(() => window.circuitApplicationsLab.getState().voltage);
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.5);
      await page.mouse.up();
      const afterDrag = await page.evaluate(() => window.circuitApplicationsLab.getState().voltage);
      assert(Math.abs(afterDrag - beforeDrag) > 1, `${lab.id}/${viewport.name}: direct supply-voltage drag did not update state`);
    }

    if (lab.id === "power-source") {
      const reference = await page.evaluate(() => ({
        op: window.PowerSourceModel.operatingPoint({ emfV: 12, internalResistanceOhm: 2, loadResistanceOhm: 4 }),
        max: window.PowerSourceModel.maximumPower({ emfV: 12, internalResistanceOhm: 2 })
      }));
      assert(closeTo(reference.op.currentA, 2, 1e-12) && closeTo(reference.op.terminalVoltageV, 8, 1e-12), `${lab.id}/${viewport.name}: source operating-point mismatch`);
      assert(closeTo(reference.op.voltageResidualV, 0, 1e-12) && closeTo(reference.op.powerResidualW, 0, 1e-12), `${lab.id}/${viewport.name}: source ledger mismatch`);
      assert(closeTo(reference.max.matchedLoadOhm, 2, 1e-12) && closeTo(reference.max.maximumLoadPowerW, 18, 1e-12) && closeTo(reference.max.matchedEfficiency, 0.5, 1e-12), `${lab.id}/${viewport.name}: maximum-power reference mismatch`);
      const canvas = page.locator("#sourceCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const beforeDrag = await page.evaluate(() => window.powerSourceLab.getState().load);
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.5);
      await page.mouse.up();
      const afterDrag = await page.evaluate(() => window.powerSourceLab.getState().load);
      assert(Math.abs(afterDrag - beforeDrag) > 2, `${lab.id}/${viewport.name}: direct load drag did not update state`);
    }

    if (lab.id === "magnetic-field") {
      const reference = await page.evaluate(() => ({
        wire: window.MagneticFieldModel.wireFieldAt({ currentA: 10, probeX: .1, probeY: 0 }),
        midpoint: window.MagneticFieldModel.twoWireField({ spacingM: .12, current1A: 10, current2A: 10, probeX: 0, probeY: 0 })
      }));
      assert(closeTo(reference.wire.magnitudeT, 2e-5, 1e-12) && closeTo(reference.wire.radialDotT, 0, 1e-15), `${lab.id}/${viewport.name}: straight-wire field mismatch`);
      assert(closeTo(reference.midpoint.magnitudeT, 0, 1e-15) && closeTo(reference.midpoint.componentResidualT, 0, 1e-15), `${lab.id}/${viewport.name}: two-wire superposition mismatch`);
    }

    if (lab.id === "charged-particle") {
      const reference = await page.evaluate(() => {
        window.particleLab.setMode("magnetic");
        window.particleLab.setState({ mass: 2, charge: 1, magnetic: 1, speed: 4, angle: 0, time: 0 });
        const params = window.particleLab.params();
        const sample = window.particleLab.at(0);
        return { params, sample, radius: params.m * params.v0 / Math.abs(params.q * params.B) };
      });
      assert(closeTo(reference.sample.speed, 4e6, 1e-6), `${lab.id}/${viewport.name}: magnetic field changed speed`);
      assert(closeTo(reference.sample.fbx * reference.sample.vx + reference.sample.fby * reference.sample.vy, 0, 1e-12), `${lab.id}/${viewport.name}: magnetic force is not perpendicular to velocity`);
      assert(reference.radius > 0 && Number.isFinite(reference.radius), `${lab.id}/${viewport.name}: magnetic radius invalid`);
    }

    if (lab.id === "mass-spectrometer") {
      const reference = await page.evaluate(() => ({
        selector: window.MassSpectrometerModel.selector({ electricFieldVm: 1e5, magneticFieldT: .5, speedMs: 2e5, massU: 20, chargeNumber: 1 }),
        pair: window.MassSpectrometerModel.isotopePair({ lightMassU: 20, heavyMassU: 22, speedMs: 2e5, magneticFieldT: .5, chargeNumber: 1 })
      }));
      assert(reference.selector.transmitted && closeTo(reference.selector.targetVelocityMs, 2e5, 1e-9) && closeTo(reference.selector.netForceY, 0, 1e-20), `${lab.id}/${viewport.name}: selector balance mismatch`);
      assert(closeTo(reference.pair.radiusRatio, 1.1, 1e-12) && closeTo(reference.pair.ratioResidual, 0, 1e-12), `${lab.id}/${viewport.name}: isotope radius ratio mismatch`);
      const canvas = page.locator("#spectrometerCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * .2, box.y + box.height * .5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * .8, box.y + box.height * .5);
      await page.mouse.up();
      assert((await page.evaluate(() => window.massSpectrometerLab.getState().speed1e5)) > 3.5, `${lab.id}/${viewport.name}: direct speed drag did not update state`);
    }

    if (lab.id === "cyclotron") {
      const reference = await page.evaluate(() => ({
        proton: window.cyclotronLab.solve({ fieldT: 1.2, gapVoltageKv: 30, deeRadiusM: .5, massU: 1.007276, chargeE: 1, initialEnergyKev: 1, crossing: 100 }),
        highVoltage: window.cyclotronLab.solve({ fieldT: 1.2, gapVoltageKv: 60, deeRadiusM: .5, massU: 1.007276, chargeE: 1, initialEnergyKev: 1, crossing: 0 }),
        slip: window.cyclotronLab.sequence({ fieldT: 2.5, gapVoltageKv: 100, deeRadiusM: 1, massU: 1.007276, chargeE: 1, initialEnergyKev: 1, rfRatio: 1 }, 100).at(-1)
      }));
      assert(closeTo(reference.proton.cyclotronFrequencyHz, 18294232.22464719, 1e-6) && closeTo(reference.proton.maxEnergyMev, 17.24190766800518, 1e-9), `${lab.id}/${viewport.name}: proton frequency or edge energy mismatch`);
      assert(reference.proton.crossingsToEdge === 575 && reference.highVoltage.crossingsToEdge === 288, `${lab.id}/${viewport.name}: crossing count should scale inversely with gap voltage`);
      assert(closeTo(reference.proton.radiusResidualM, 0, 1e-15) && reference.slip.phaseErrorRad > 1.4 && reference.slip.gainFactor < .1, `${lab.id}/${viewport.name}: radius ledger or relativistic phase-slip boundary mismatch`);
      const canvas = page.locator("#cyclotronCanvas"); await canvas.scrollIntoViewIfNeeded(); const before = await page.evaluate(() => window.cyclotronLab.getState().crossing); const box = await canvas.boundingBox(); await page.mouse.move(box.x + box.width * .2, box.y + box.height * .2); await page.mouse.down(); await page.mouse.move(box.x + box.width * .8, box.y + box.height * .2); await page.mouse.up(); const after = await page.evaluate(() => window.cyclotronLab.getState().crossing); assert(after > before + 100, `${lab.id}/${viewport.name}: direct crossing drag did not update state`);
    }

    if (lab.id === "electromagnetic-induction") {
      const reference = await page.evaluate(() => ({
        closed: window.inductionLab.sampleAt(1, { mode: "rate", field: .08, motion: 1, turns: 100, area: 100, resistance: 10, circuit: "closed" }),
        open: window.inductionLab.sampleAt(1, { mode: "rate", field: .08, motion: 1, turns: 100, area: 100, resistance: 10, circuit: "open" })
      }));
      assert(closeTo(reference.closed.emf, -.08, 1e-12) && closeTo(reference.closed.current, -.008, 1e-12), `${lab.id}/${viewport.name}: Faraday reference mismatch`);
      assert(closeTo(reference.open.emf, -.08, 1e-12) && closeTo(reference.open.current, 0, 1e-15), `${lab.id}/${viewport.name}: open-circuit boundary mismatch`);
    }

    if (lab.id === "rail-rod") {
      const reference = await page.evaluate(() => ({
        force: window.railRodLab.solve({ mode: "force", massKg: .5, lengthM: .5, fieldT: .8, resistanceOhm: .8, forceN: 1.2, timeS: 2.5 }),
        coast: window.railRodLab.solve({ mode: "coast", massKg: .5, lengthM: .5, fieldT: .8, resistanceOhm: .8, initialSpeedMs: 6, timeS: 2.5 }),
        capacitor: window.railRodLab.solve({ mode: "circuit", circuitKind: "capacitor", massKg: .5, lengthM: .5, fieldT: .8, forceN: 1.2, capacitanceF: 2, timeS: 2.5 }),
        source: window.railRodLab.solve({ mode: "circuit", circuitKind: "source", massKg: .5, lengthM: .5, fieldT: .8, resistanceOhm: .8, sourceVoltageV: 3, timeS: 2.5 })
      }));
      assert(closeTo(reference.force.tauS, 2.5, 1e-12) && closeTo(reference.force.terminalSpeedMs, 6, 1e-12), `${lab.id}/${viewport.name}: force-start response mismatch`);
      assert(closeTo(reference.coast.speedMs, 6 / Math.E, 1e-12) && closeTo(reference.capacitor.electromagneticMassKg, .32, 1e-12), `${lab.id}/${viewport.name}: coast or capacitor reference mismatch`);
      assert(closeTo(reference.source.terminalSpeedMs, 7.5, 1e-12), `${lab.id}/${viewport.name}: source back-emf terminal speed mismatch`);
      for (const value of Object.values(reference)) assert(closeTo(value.energyResidualJ, 0, 1e-12) && closeTo(value.forceResidualN, 0, 1e-12), `${lab.id}/${viewport.name}: rail force or energy ledger mismatch`);
      const canvas = page.locator("#railCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const before = await page.evaluate(() => window.railRodLab.getState().timeS);
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * .2, box.y + box.height * .25); await page.mouse.down(); await page.mouse.move(box.x + box.width * .8, box.y + box.height * .25); await page.mouse.up();
      const after = await page.evaluate(() => window.railRodLab.getState().timeS);
      assert(after > before + 4, `${lab.id}/${viewport.name}: direct time drag did not update state`);
    }

    if (lab.id === "double-rail") {
      const reference = await page.evaluate(() => ({
        equal: window.doubleRailLab.solve({ mode: "equal", mass1Kg: .5, mass2Kg: .5, lengthM: .5, fieldT: .8, resistanceOhm: .8, initialV1Ms: 4, initialV2Ms: 0, initialGapM: 8, timeS: 1.25 }),
        unequal: window.doubleRailLab.solve({ mode: "unequal", mass1Kg: .5, mass2Kg: 1.5, lengthM: .5, fieldT: .8, resistanceOhm: .8, initialV1Ms: 4, initialV2Ms: 0, initialGapM: 8, timeS: 3.75 }),
        fixed: window.doubleRailLab.solve({ mode: "fixed", mass1Kg: .5, mass2Kg: .5, lengthM: .5, fieldT: .8, resistanceOhm: .8, initialV1Ms: 4, initialV2Ms: 0, initialGapM: 8, timeS: 2.5 })
      }));
      assert(closeTo(reference.equal.tauS, 1.25, 1e-12) && closeTo(reference.equal.commonVelocityMs, 2, 1e-12), `${lab.id}/${viewport.name}: equal-mass coupling mismatch`);
      assert(closeTo(reference.equal.velocity1Ms, 2 + 2 / Math.E, 1e-12) && closeTo(reference.equal.velocity2Ms, 2 - 2 / Math.E, 1e-12), `${lab.id}/${viewport.name}: equal-mass velocity response mismatch`);
      assert(closeTo(reference.unequal.commonVelocityMs, 1, 1e-12) && closeTo(reference.fixed.tauS, 2.5, 1e-12), `${lab.id}/${viewport.name}: unequal or fixed boundary mismatch`);
      for (const value of Object.values(reference)) assert(closeTo(value.energyResidualJ, 0, 1e-12) && closeTo(value.momentumResidualKgmS, 0, 1e-12), `${lab.id}/${viewport.name}: double-rail ledger mismatch`);
      const canvas = page.locator("#doubleRailCanvas"); await canvas.scrollIntoViewIfNeeded(); const before = await page.evaluate(() => window.doubleRailLab.getState().timeS); const box = await canvas.boundingBox(); await page.mouse.move(box.x + box.width * .2, box.y + box.height * .25); await page.mouse.down(); await page.mouse.move(box.x + box.width * .8, box.y + box.height * .25); await page.mouse.up(); const after = await page.evaluate(() => window.doubleRailLab.getState().timeS); assert(after > before + 3, `${lab.id}/${viewport.name}: direct time drag did not update state`);
    }

    if (lab.id === "three-field") {
      const reference = await page.evaluate(() => ({
        straight: window.threeFieldLab.stateAt(5, { massPg: 1, chargeFc: 1, electricVm: 19.6, magneticT: 1, initialVxMs: 9.8, initialVyMs: 0 }),
        circle: window.threeFieldLab.stateAt(Math.PI / 2, { massPg: 1, chargeFc: 1, electricVm: 9.8, magneticT: 1, initialVxMs: 2, initialVyMs: 0 }),
        projectile: window.threeFieldLab.stateAt(.5, { massPg: 1, chargeFc: 1, electricVm: 0, magneticT: 0, initialVxMs: 3, initialVyMs: 0, initialYM: 2 }),
        cycloid: window.threeFieldLab.stateAt(Math.PI, { massPg: 1, chargeFc: 1, electricVm: 19.6, magneticT: 1, initialVxMs: 0, initialVyMs: 0 })
      }));
      assert(closeTo(reference.straight.xM, 49, 1e-12) && closeTo(reference.straight.yM, 0, 1e-12) && closeTo(reference.straight.netForceYN, 0, 1e-27), `${lab.id}/${viewport.name}: straight three-force balance mismatch`);
      assert(closeTo(reference.circle.xM, 2, 1e-12) && closeTo(reference.circle.yM, -2, 1e-12) && closeTo(reference.circle.speedMs, 2, 1e-12), `${lab.id}/${viewport.name}: gravity-electric balanced circle mismatch`);
      assert(closeTo(reference.projectile.xM, 1.5, 1e-12) && closeTo(reference.projectile.yM, .775, 1e-12) && closeTo(reference.projectile.vyMs, -4.9, 1e-12), `${lab.id}/${viewport.name}: B=0 projectile boundary mismatch`);
      assert(closeTo(reference.cycloid.xM, 9.8 * Math.PI, 1e-12) && closeTo(reference.cycloid.yM, 19.6, 1e-12), `${lab.id}/${viewport.name}: cycloid drift mismatch`);
      for (const value of Object.values(reference)) assert(closeTo(value.energyResidualJ, 0, 1e-26) && closeTo(value.magneticPowerW, 0, 1e-26), `${lab.id}/${viewport.name}: three-field work-energy ledger mismatch`);
      const canvas = page.locator("#trajectoryCanvas"); await canvas.scrollIntoViewIfNeeded(); const before = await page.evaluate(() => window.threeFieldLab.getState().timeS); const box = await canvas.boundingBox(); await page.mouse.move(box.x + box.width * .2, box.y + box.height * .2); await page.mouse.down(); await page.mouse.move(box.x + box.width * .8, box.y + box.height * .2); await page.mouse.up(); const after = await page.evaluate(() => window.threeFieldLab.getState().timeS); assert(after > before + 4, `${lab.id}/${viewport.name}: direct time drag did not update state`);
    }

    if (lab.id === "alternating-current") {
      const reference = await page.evaluate(() => ({
        rms: window.AlternatingCurrentModel.sineRms({ peakVoltageV: 311.127, resistanceOhm: 100 }),
        transformer: window.AlternatingCurrentModel.idealTransformer({ primaryRmsV: 220, primaryTurns: 200, secondaryTurns: 1000, loadResistanceOhm: 440, frequencyHz: 50 }),
        transmission: window.AlternatingCurrentModel.transmission({ sentPowerW: 1e6, transmissionVoltageV: 1e5, lineResistanceOhm: 20 })
      }));
      assert(closeTo(reference.rms.rmsVoltageV, 220, .01) && closeTo(reference.rms.powerResidualW, 0, 1e-9), `${lab.id}/${viewport.name}: RMS reference mismatch`);
      assert(closeTo(reference.transformer.secondaryRmsV, 1100, 1e-12) && closeTo(reference.transformer.powerResidualW, 0, 1e-9), `${lab.id}/${viewport.name}: transformer reference mismatch`);
      assert(closeTo(reference.transmission.lineCurrentA, 10, 1e-12) && closeTo(reference.transmission.lineLossW, 2000, 1e-9) && closeTo(reference.transmission.powerLedgerResidualW, 0, 1e-9), `${lab.id}/${viewport.name}: transmission ledger mismatch`);
    }

    if (lab.id === "electromagnetic-oscillation") {
      const reference = await page.evaluate(() => ({
        lc: window.ElectromagneticOscillationModel.lcOscillation({ inductanceH: .02, capacitanceF: 5e-6, initialVoltageV: 12, phaseRad: Math.PI / 3 }),
        wave: window.ElectromagneticOscillationModel.electromagneticWave({ frequencyHz: 1e8, electricAmplitudeVm: 30 })
      }));
      assert(closeTo(reference.lc.energyResidualJ, 0, 1e-15), `${lab.id}/${viewport.name}: LC energy ledger mismatch`);
      assert(closeTo(reference.wave.wavelengthM, 2.99792458, 1e-8) && closeTo(reference.wave.speedResidualMs, 0, 1e-8) && closeTo(reference.wave.fieldRatioResidualVm, 0, 1e-12), `${lab.id}/${viewport.name}: electromagnetic-wave reference mismatch`);
    }

    if (lab.id === "collision") {
      const reference = await page.evaluate(() => ({
        elastic: window.collisionLab.solve({ m1: 1, m2: 1, u1: 4, u2: 0, e: 1, mode: "elastic" }),
        inelastic: window.collisionLab.solve({ m1: 2, m2: 3, u1: 5, u2: -1, e: .4, mode: "restitution" }),
        noCollision: window.collisionLab.solve({ m1: 1, m2: 2, u1: 0, u2: 2, e: 1, mode: "elastic" })
      }));
      assert(closeTo(reference.elastic.v1, 0, 1e-12) && closeTo(reference.elastic.v2, 4, 1e-12), `${lab.id}/${viewport.name}: equal-mass velocity exchange mismatch`);
      assert(closeTo(reference.elastic.momentumResidual, 0, 1e-12) && closeTo(reference.inelastic.momentumResidual, 0, 1e-12) && closeTo(reference.inelastic.restitutionResidual, 0, 1e-12), `${lab.id}/${viewport.name}: collision ledger mismatch`);
      assert(closeTo(reference.inelastic.energyLoss, reference.inelastic.expectedLoss, 1e-12), `${lab.id}/${viewport.name}: collision energy-loss mismatch`);
      assert(!reference.noCollision.approaching && closeTo(reference.noCollision.v1, 0, 1e-12) && closeTo(reference.noCollision.v2, 2, 1e-12), `${lab.id}/${viewport.name}: no-collision boundary mismatch`);
      const canvas = page.locator("#collisionCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const beforeDrag = await page.evaluate(() => window.collisionLab.getState().u1);
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * .25, box.y + box.height * .55);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * .45, box.y + box.height * .55);
      await page.mouse.up();
      const afterDrag = await page.evaluate(() => window.collisionLab.getState().u1);
      assert(Math.abs(afterDrag - beforeDrag) > .5, `${lab.id}/${viewport.name}: direct cart-velocity drag did not update state`);
    }

    if (lab.id === "locomotive") {
      const reference = await page.evaluate(() => ({
        force: window.locomotiveLab.solveForce(5, { mass: 1000, resistance: 2000, maxTraction: 6000, power: 120000, initialSpeed: 0 }),
        switchPoint: window.locomotiveLab.solvePower(5, { mass: 1000, resistance: 2000, maxTraction: 6000, power: 120000, initialSpeed: 0 }),
        power: window.locomotiveLab.solvePower(10, { mass: 1000, resistance: 2000, maxTraction: 6000, power: 120000, initialSpeed: 0 })
      }));
      assert(closeTo(reference.force.acceleration, 4, 1e-12) && closeTo(reference.force.velocity, 20, 1e-12), `${lab.id}/${viewport.name}: constant-force reference mismatch`);
      assert(closeTo(reference.switchPoint.switchSpeed, 20, 1e-12) && closeTo(reference.switchPoint.switchTime, 5, 1e-12) && closeTo(reference.switchPoint.position, 50, 1e-12), `${lab.id}/${viewport.name}: power transition mismatch`);
      assert(closeTo(reference.power.velocity, 32.515555, 1e-5) && closeTo(reference.power.terminalSpeed, 60, 1e-12) && closeTo(reference.power.energyResidual, 0, 1e-8), `${lab.id}/${viewport.name}: constant-power reference mismatch`);
      const canvas = page.locator("#locomotiveCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const beforeDrag = await page.evaluate(() => window.locomotiveLab.getState().time);
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * .18, box.y + box.height * .5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * .74, box.y + box.height * .5);
      await page.mouse.up();
      const afterDrag = await page.evaluate(() => window.locomotiveLab.getState().time);
      assert(afterDrag > beforeDrag + 10, `${lab.id}/${viewport.name}: direct timeline drag did not update state`);
    }

    if (lab.id === "oscilloscope") {
      const reference = await page.evaluate(() => ({
        beam: window.oscilloscopeLab.solve(0, { acceleratingVoltage: 500, verticalVoltage: 40 }),
        trace: window.oscilloscopeLab.solve(.125, { mode: "xy", horizontalVoltage: 60, verticalVoltage: 60, frequency: 2, phaseDeg: 90 })
      }));
      assert(closeTo(reference.beam.kineticEnergyEv, 500, 1e-12) && closeTo(reference.beam.screenY, .008, 1e-12), `${lab.id}/${viewport.name}: electron-beam reference mismatch`);
      assert(closeTo(reference.trace.signalX, 60, 1e-9) && closeTo(reference.trace.signalY, 0, 1e-8) && closeTo(reference.trace.voltageResidual, 0, 1e-12), `${lab.id}/${viewport.name}: XY signal reference mismatch`);
      const canvas = page.locator("#oscilloscopeCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const beforeDrag = await page.evaluate(() => window.oscilloscopeLab.getState().time);
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * .15, box.y + box.height * .2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * .72, box.y + box.height * .2);
      await page.mouse.up();
      const afterDrag = await page.evaluate(() => window.oscilloscopeLab.getState().time);
      assert(afterDrag > beforeDrag + .5, `${lab.id}/${viewport.name}: direct timeline drag did not update state`);
    }

    if (lab.id === "electric-gravity") {
      const reference = await page.evaluate(() => ({
        balance: window.electricGravityLab.solve(2, { massNg: 1, chargeFc: .5, fieldKvM: 19.6, startHeight: 1.5, initialVx: 0, initialVy: 0 }),
        fall: window.electricGravityLab.solve(.5, { massNg: 1, chargeFc: 0, fieldKvM: 0, startHeight: 2, initialVx: 3, initialVy: 0 }),
        negative: window.electricGravityLab.solve(1, { massNg: 1, chargeFc: -.5, fieldKvM: -19.6, startHeight: 1.5, initialVx: 0, initialVy: 0 }),
        inferred: window.electricGravityLab.infer({ massNg: 1, fieldKvM: 19.6 })
      }));
      assert(closeTo(reference.balance.accelerationY, 0, 1e-12) && closeTo(reference.balance.y, 1.5, 1e-12), `${lab.id}/${viewport.name}: suspension reference mismatch`);
      assert(closeTo(reference.fall.x, 1.5, 1e-12) && closeTo(reference.fall.y, .775, 1e-12) && closeTo(reference.fall.velocityY, -4.9, 1e-12), `${lab.id}/${viewport.name}: field-off trajectory mismatch`);
      assert(closeTo(reference.negative.accelerationY, 0, 1e-12) && closeTo(reference.inferred.chargeFc, .5, 1e-12), `${lab.id}/${viewport.name}: sign or inverse-charge reference mismatch`);
      assert(closeTo(reference.balance.forceResidualN, 0, 1e-24) && closeTo(reference.fall.energyResidualJ, 0, 1e-24) && closeTo(reference.inferred.residualN, 0, 1e-24), `${lab.id}/${viewport.name}: force or energy ledger mismatch`);
      const canvas = page.locator("#motionCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const beforeDrag = await page.evaluate(() => window.electricGravityLab.getState().time);
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * .18, box.y + box.height * .2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * .72, box.y + box.height * .2);
      await page.mouse.up();
      const afterDrag = await page.evaluate(() => window.electricGravityLab.getState().time);
      assert(afterDrag > beforeDrag + 1, `${lab.id}/${viewport.name}: direct timeline drag did not update state`);
    }

    if (lab.id === "measurement-tools") {
      const reference = await page.evaluate(() => ({
        v10: window.measurementToolsLab.solveVernier({ jawMm: 12.36, divisions: 10 }),
        v20: window.measurementToolsLab.solveVernier({ jawMm: 12.36, divisions: 20 }),
        v50: window.measurementToolsLab.solveVernier({ jawMm: 12.36, divisions: 50 }),
        micro: window.measurementToolsLab.solveMicrometer({ openingMm: 5.678 }),
        zero: window.measurementToolsLab.solveVernier({ jawMm: 12.3, divisions: 10, zeroErrorMm: .2 })
      }));
      assert(closeTo(reference.v10.indicatedMm, 12.4, 1e-12) && reference.v10.coincidence === 4, `${lab.id}/${viewport.name}: 10-division vernier mismatch`);
      assert(closeTo(reference.v20.indicatedMm, 12.35, 1e-12) && reference.v20.coincidence === 7, `${lab.id}/${viewport.name}: 20-division vernier mismatch`);
      assert(closeTo(reference.v50.indicatedMm, 12.36, 1e-12) && reference.v50.coincidence === 18, `${lab.id}/${viewport.name}: 50-division vernier mismatch`);
      assert(closeTo(reference.micro.indicatedMm, 5.68, 1e-12) && closeTo(reference.micro.sleeveMm, 5.5, 1e-12) && reference.micro.thimbleDivision === 18, `${lab.id}/${viewport.name}: micrometer reference mismatch`);
      assert(closeTo(reference.zero.correctedMm, 12.3, 1e-12) && closeTo(reference.zero.reconstructionResidualMm, 0, 1e-12), `${lab.id}/${viewport.name}: zero-error correction mismatch`);
      const canvas = page.locator("#toolCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const beforeDrag = await page.evaluate(() => window.measurementToolsLab.getState().lengthMm);
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * .2, box.y + box.height * .2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * .95, box.y + box.height * .2);
      await page.mouse.up();
      const afterDrag = await page.evaluate(() => window.measurementToolsLab.getState().lengthMm);
      assert(Math.abs(afterDrag - beforeDrag) > 5, `${lab.id}/${viewport.name}: direct measuring-jaw drag did not update state`);
    }

    if (lab.id === "resistivity") {
      const reference = await page.evaluate(() => ({
        wire: window.resistivityLab.wire({ resistivity: 1.72e-8, lengthM: .8, diameterMm: .4 }),
        external: window.resistivityLab.experiment({ resistivity: 1.72e-8, lengthM: .8, diameterMm: .4, connection: "external", voltmeterResistance: 1000 }),
        internal: window.resistivityLab.measure({ resistivity: 1.72e-8, lengthM: .8, diameterMm: .4, connection: "internal", ammeterResistance: .2 })
      }));
      assert(closeTo(reference.wire.resistanceOhm, .109498600847224, 1e-12), `${lab.id}/${viewport.name}: wire resistance reference mismatch`);
      assert(closeTo(reference.external.measuredOhm, .109486612216375, 1e-12) && closeTo(reference.external.rSquared, 1, 1e-12), `${lab.id}/${viewport.name}: external-connection or fit mismatch`);
      assert(closeTo(reference.external.estimatedResistivity, 1.7198116830269884e-8, 1e-20), `${lab.id}/${viewport.name}: resistivity inverse mismatch`);
      assert(closeTo(reference.internal.measuredOhm, .309498600847224, 1e-12) && reference.internal.relativeConnectionError > 1.8, `${lab.id}/${viewport.name}: internal-connection error mismatch`);
      const canvas = page.locator("#apparatusCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const beforeDrag = await page.evaluate(() => window.resistivityLab.getState().currentA);
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * .15, box.y + box.height * .2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * .85, box.y + box.height * .2);
      await page.mouse.up();
      const afterDrag = await page.evaluate(() => window.resistivityLab.getState().currentA);
      assert(Math.abs(afterDrag - beforeDrag) > .25, `${lab.id}/${viewport.name}: direct current drag did not update state`);
    }

    if (lab.id === "rc-circuit") {
      const reference = await page.evaluate(() => ({
        charge: window.rcCircuitLab.atTau({ mode: "charge", resistanceKOhm: 10, capacitanceUf: 100, emfV: 12, initialVoltageV: 0 }),
        discharge: window.rcCircuitLab.atTau({ mode: "discharge", resistanceKOhm: 10, capacitanceUf: 100, initialVoltageV: 12 })
      }));
      assert(closeTo(reference.charge.tau, 1, 1e-12) && closeTo(reference.charge.voltageV, 7.585446705942694, 1e-12), `${lab.id}/${viewport.name}: charge-at-tau reference mismatch`);
      assert(closeTo(reference.discharge.voltageV, 4.414553294057306, 1e-12) && closeTo(reference.discharge.currentMa, -.4414553294057306, 1e-12), `${lab.id}/${viewport.name}: discharge-at-tau reference mismatch`);
      assert(closeTo(reference.charge.energyResidualJ, 0, 1e-15) && closeTo(reference.discharge.energyResidualJ, 0, 1e-15), `${lab.id}/${viewport.name}: RC energy ledger mismatch`);
      assert(closeTo(reference.charge.areaChargeResidualC, 0, 1e-15) && closeTo(reference.discharge.areaChargeResidualC, 0, 1e-15), `${lab.id}/${viewport.name}: current-area charge ledger mismatch`);
      const canvas = page.locator("#circuitCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const beforeDrag = await page.evaluate(() => window.rcCircuitLab.getState().timeS);
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * .15, box.y + box.height * .2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * .82, box.y + box.height * .2);
      await page.mouse.up();
      const afterDrag = await page.evaluate(() => window.rcCircuitLab.getState().timeS);
      assert(afterDrag > beforeDrag + 2, `${lab.id}/${viewport.name}: direct transient-time drag did not update state`);
    }

    if (lab.id === "ampere-force") {
      const reference = await page.evaluate(() => ({
        maximum: window.ampereForceLab.solve({ currentA: 5, lengthM: .4, fieldT: .5, angleDeg: 90, massG: 20 }),
        parallel: window.ampereForceLab.solve({ currentA: 5, lengthM: .4, fieldT: .5, angleDeg: 0 }),
        reverse: window.ampereForceLab.solve({ currentA: 5, lengthM: .4, fieldT: .5, angleDeg: 90, currentSign: -1 }),
        balance: window.ampereForceLab.solve({ currentA: .98, lengthM: .4, fieldT: .5, angleDeg: 90, massG: 20, currentSign: -1 })
      }));
      assert(closeTo(reference.maximum.forceN, 1, 1e-12) && closeTo(reference.maximum.signedForceN, -1, 1e-12), `${lab.id}/${viewport.name}: perpendicular-force reference mismatch`);
      assert(closeTo(reference.parallel.forceN, 0, 1e-15) && !Number.isFinite(reference.parallel.balanceCurrentA), `${lab.id}/${viewport.name}: parallel zero-force boundary mismatch`);
      assert(closeTo(reference.reverse.signedForceN, 1, 1e-12) && closeTo(reference.balance.netVerticalN, 0, 1e-12), `${lab.id}/${viewport.name}: reversal or balance reference mismatch`);
      assert(closeTo(reference.maximum.crossResidualN, 0, 1e-15) && closeTo(reference.balance.balanceCurrentA, .98, 1e-12), `${lab.id}/${viewport.name}: Ampere vector ledger mismatch`);
      const canvas = page.locator("#forceCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const beforeDrag = await page.evaluate(() => window.ampereForceLab.getState().angleDeg);
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * .2, box.y + box.height * .2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * .8, box.y + box.height * .2);
      await page.mouse.up();
      const afterDrag = await page.evaluate(() => window.ampereForceLab.getState().angleDeg);
      assert(Math.abs(afterDrag - beforeDrag) > 40, `${lab.id}/${viewport.name}: direct angle drag did not update state`);
    }

    if (lab.id === "collision-2d") {
      const reference = await page.evaluate(() => ({
        head: window.collision2dLab.solve({ mass1Kg: 1, mass2Kg: 1, speed1Ms: 4, angle1Deg: 0, speed2Ms: 0, normalDeg: 0, restitution: 1 }),
        oblique: window.collision2dLab.solve({ mass1Kg: 1, mass2Kg: 1, speed1Ms: 4, angle1Deg: 0, speed2Ms: 0, normalDeg: 45, restitution: 1 }),
        inelastic: window.collision2dLab.solve({ mass1Kg: 2, mass2Kg: 3, speed1Ms: 5, angle1Deg: 20, speed2Ms: 2, angle2Deg: -30, normalDeg: 35, restitution: .4 }),
        away: window.collision2dLab.solve({ mass1Kg: 1, mass2Kg: 1, speed1Ms: 1, angle1Deg: 180, speed2Ms: 0, normalDeg: 0, restitution: 1 })
      }));
      assert(closeTo(reference.head.v1.x, 0, 1e-12) && closeTo(reference.head.v2.x, 4, 1e-12), `${lab.id}/${viewport.name}: equal-mass head-on velocity exchange mismatch`);
      assert(closeTo(reference.oblique.v1.x, 2, 1e-12) && closeTo(reference.oblique.v1.y, -2, 1e-12) && closeTo(reference.oblique.v2.x, 2, 1e-12) && closeTo(reference.oblique.v2.y, 2, 1e-12), `${lab.id}/${viewport.name}: elastic oblique collision mismatch`);
      assert(!reference.away.collided && closeTo(reference.away.impulseNs, 0, 1e-15), `${lab.id}/${viewport.name}: separating boundary should have no impulse`);
      for (const value of Object.values(reference)) assert(closeTo(value.momentumResidual.x, 0, 1e-12) && closeTo(value.momentumResidual.y, 0, 1e-12) && closeTo(value.energyLossResidualJ, 0, 1e-12) && closeTo(value.restitutionResidual, 0, 1e-12), `${lab.id}/${viewport.name}: 2D collision ledger mismatch`);
      const canvas = page.locator("#collision2dCanvas"); await canvas.scrollIntoViewIfNeeded(); const before = await page.evaluate(() => window.collision2dLab.getState().normalDeg); const box = await canvas.boundingBox(); await page.mouse.move(box.x + box.width * .25, box.y + box.height * .25); await page.mouse.down(); await page.mouse.move(box.x + box.width * .8, box.y + box.height * .8); await page.mouse.up(); const after = await page.evaluate(() => window.collision2dLab.getState().normalDeg); assert(Math.abs(after - before) > 15, `${lab.id}/${viewport.name}: direct contact-normal drag did not update state`);
    }

    if (lab.id === "oscillation") {
      const reference = await page.evaluate(() => ({
        endpoint: window.oscillationLab.calculate({ mass: 1, spring: 4, amplitude: 2, phase: 0, time: 0 }),
        center: window.oscillationLab.calculate({ mass: 1, spring: 4, amplitude: 2, phase: 0, time: Math.PI / 4 })
      }));
      assert(closeTo(reference.endpoint.omega, 2, 1e-12) && closeTo(reference.endpoint.period, Math.PI, 1e-12), `${lab.id}/${viewport.name}: period reference mismatch`);
      assert(closeTo(reference.endpoint.x, 2, 1e-12) && closeTo(reference.endpoint.velocity, 0, 1e-12) && closeTo(reference.endpoint.acceleration, -8, 1e-12) && closeTo(reference.endpoint.force, -8, 1e-12), `${lab.id}/${viewport.name}: endpoint state mismatch`);
      assert(closeTo(reference.endpoint.total, 8, 1e-12) && closeTo(reference.center.kinetic + reference.center.potential, 8, 1e-12), `${lab.id}/${viewport.name}: oscillator energy ledger mismatch`);
      const canvas = page.locator("#motionCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const beforeDrag = await page.evaluate(() => window.oscillationLab.getState().time);
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * .35, box.y + box.height * .55);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * .68, box.y + box.height * .55);
      await page.mouse.up();
      const afterDrag = await page.evaluate(() => window.oscillationLab.getState().time);
      assert(Math.abs(afterDrag - beforeDrag) > .02, `${lab.id}/${viewport.name}: direct phase drag did not update state`);
    }

    if (lab.id === "pendulum") {
      const reference = await page.evaluate(() => {
        const base = { lengthM: 1, gravity: 9.8, massKg: 1, dampingS: 0 };
        const small = window.pendulumLab.periods({ ...base, amplitudeDeg: 5 });
        const large = window.pendulumLab.periods({ ...base, amplitudeDeg: 60 });
        const quarter = window.pendulumLab.stateAt(small.exactPeriodS / 4, { ...base, amplitudeDeg: 5 });
        const damped = window.pendulumLab.stateAt(8, { ...base, amplitudeDeg: 30, dampingS: .12 });
        return { small, large, quarter, damped };
      });
      assert(closeTo(reference.small.smallAnglePeriodS, 2.007089923154493, 1e-12) && closeTo(reference.small.exactPeriodS, 2.008045644, 1e-9), `${lab.id}/${viewport.name}: small-angle period reference mismatch`);
      assert(closeTo(reference.large.exactPeriodS, 2.1539727922602023, 1e-12) && closeTo(reference.large.periodErrorPercent, 7.3182, 1e-4), `${lab.id}/${viewport.name}: large-angle correction mismatch`);
      assert(Math.abs(reference.quarter.thetaRad) < 2e-6 && Math.abs(reference.quarter.energyResidualJ) < 1e-10, `${lab.id}/${viewport.name}: undamped quarter-period or energy mismatch`);
      assert(reference.damped.dissipatedJ > 0 && Math.abs(reference.damped.energyResidualJ) < 2e-8, `${lab.id}/${viewport.name}: damped energy ledger mismatch`);
      const canvas = page.locator("#pendulumCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const before = await page.evaluate(() => window.pendulumLab.getState().amplitudeDeg);
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * .5, box.y + box.height * .45);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * .65, box.y + box.height * .1);
      await page.mouse.up();
      const after = await page.evaluate(() => window.pendulumLab.getState().amplitudeDeg);
      assert(Math.abs(after - before) > 20, `${lab.id}/${viewport.name}: direct bob drag did not update amplitude`);
    }

    if (lab.id === "resonance") {
      const reference = await page.evaluate(() => {
        const input = { massKg: 1, springNm: (2 * Math.PI) ** 2, dampingRatio: .1, forceAmplitudeN: 1, driveFrequencyHz: 1 };
        return { steady: window.ResonanceModel.steadyState(input), resonance: window.ResonanceModel.resonance(input) };
      });
      assert(closeTo(reference.steady.naturalFrequencyHz, 1, 1e-12) && closeTo(reference.steady.phaseLagDeg, 90, 1e-12), `${lab.id}/${viewport.name}: resonance phase reference mismatch`);
      assert(closeTo(reference.steady.averageInputPowerW, .3978873577, 1e-9) && closeTo(reference.steady.powerResidualW, 0, 1e-12), `${lab.id}/${viewport.name}: resonance power reference mismatch`);
      assert(closeTo(reference.resonance.displacementPeakFrequencyHz, Math.sqrt(.98), 1e-12) && closeTo(reference.resonance.powerPeakFrequencyHz, 1, 1e-12), `${lab.id}/${viewport.name}: resonance peak separation mismatch`);
      assert(closeTo(reference.resonance.qualityFactor, 5, 1e-12) && closeTo(reference.resonance.halfPowerBandwidthHz, .2, 1e-12), `${lab.id}/${viewport.name}: resonance bandwidth mismatch`);
      const canvas = page.locator("#resonanceCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * .2, box.y + box.height * .5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * .82, box.y + box.height * .5);
      await page.mouse.up();
      assert((await page.evaluate(() => window.resonanceLab.getState().frequency)) > 2.2, `${lab.id}/${viewport.name}: direct frequency drag did not update state`);
    }

    if (lab.id === "waves") {
      const reference = await page.evaluate(() => {
        const input = { amplitude: .6, wavelength: 2, frequency: 3, phase: 0, mode: "standing" };
        const x = .37, t = .21;
        const nodes = window.wavesLab.nodePositions(input);
        return { derived: window.wavesLab.derived(input), y1: window.wavesLab.y1(x, t, input), y2: window.wavesLab.y2(x, t, input), sum: window.wavesLab.sum(x, t, input), nodes };
      });
      assert(closeTo(reference.derived.speed, 6, 1e-12), `${lab.id}/${viewport.name}: wave-speed reference mismatch`);
      assert(closeTo(reference.sum, reference.y1 + reference.y2, 1e-12), `${lab.id}/${viewport.name}: superposition mismatch`);
      assert(reference.nodes.length > 2 && closeTo(reference.nodes[1] - reference.nodes[0], 1, 1e-12), `${lab.id}/${viewport.name}: standing-wave node spacing mismatch`);
      const canvas = page.locator("#waveCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const beforeDrag = await page.evaluate(() => window.wavesLab.getState().probe);
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * .2, box.y + box.height * .5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * .75, box.y + box.height * .5);
      await page.mouse.up();
      const afterDrag = await page.evaluate(() => window.wavesLab.getState().probe);
      assert(Math.abs(afterDrag - beforeDrag) > 2, `${lab.id}/${viewport.name}: direct probe drag did not update state`);
    }

    if (lab.id === "wave-interference") {
      const reference = await page.evaluate(() => {
        const base = { amplitude: 1, wavelengthM: 2, frequency1Hz: 1, frequency2Hz: 1, separationM: 4, sourcePhaseDeg: 0, probeXM: 0, probeYM: 4, timeS: .37, averagingTimeS: 1, attenuation: false };
        return { inphase: window.waveInterferenceLab.probe(base), antiphase: window.waveInterferenceLab.probe({ ...base, sourcePhaseDeg: 180 }), incoherent: window.waveInterferenceLab.probe({ ...base, frequency2Hz: 2, averagingTimeS: 1 }) };
      });
      assert(closeTo(reference.inphase.pathDifferenceM, 0, 1e-12) && closeTo(reference.inphase.coherentIntensity, 4, 1e-12), `${lab.id}/${viewport.name}: in-phase bisector reference mismatch`);
      assert(closeTo(reference.antiphase.coherentIntensity, 0, 1e-12) && Math.abs(reference.antiphase.displacement) < 1e-12, `${lab.id}/${viewport.name}: anti-phase cancellation mismatch`);
      assert(Math.abs(reference.incoherent.coherence) < 1e-12 && closeTo(reference.incoherent.averagedIntensity, 2, 1e-12), `${lab.id}/${viewport.name}: finite-time coherence mismatch`);
      const canvas = page.locator("#waveFieldCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const before = await page.evaluate(() => window.waveInterferenceLab.getState());
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * .75, box.y + box.height * .1);
      await page.mouse.up();
      const after = await page.evaluate(() => window.waveInterferenceLab.getState());
      assert(Math.abs(after.probeXM - before.probeXM) > 2 && Math.abs(after.probeYM - before.probeYM) > 2, `${lab.id}/${viewport.name}: direct 2D probe drag did not update coordinates`);
    }

    if (lab.id === "lens") {
      const reference = await page.evaluate(() => ({
        real: window.lensLab.calculate({ focal: 10, objectDistance: 30, objectHeight: 4, screenDistance: 15 }),
        virtual: window.lensLab.calculate({ focal: 10, objectDistance: 5, objectHeight: 4, screenDistance: 15 }),
        focus: window.lensLab.calculate({ focal: 10, objectDistance: 10, objectHeight: 4, screenDistance: 15 }),
        defocused: window.lensLab.calculate({ focal: 10, objectDistance: 30, objectHeight: 4, screenDistance: 30 })
      }));
      assert(closeTo(reference.real.imageDistance, 15, 1e-9) && closeTo(reference.real.magnification, -.5, 1e-9) && closeTo(reference.real.imageHeight, -2, 1e-9), `${lab.id}/${viewport.name}: real-image reference mismatch`);
      assert(closeTo(reference.virtual.imageDistance, -10, 1e-9) && closeTo(reference.virtual.magnification, 2, 1e-9) && reference.virtual.virtual, `${lab.id}/${viewport.name}: virtual-image reference mismatch`);
      assert(reference.focus.atFocus && reference.focus.imageDistance === Infinity, `${lab.id}/${viewport.name}: focal singularity mismatch`);
      assert(reference.real.focusQuality > .999 && reference.defocused.focusQuality < reference.real.focusQuality, `${lab.id}/${viewport.name}: screen-focus model mismatch`);
      const canvas = page.locator("#lensCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const beforeDrag = await page.evaluate(() => window.lensLab.getState().objectDistance);
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * .2, box.y + box.height * .55);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * .4, box.y + box.height * .55);
      await page.mouse.up();
      const afterDrag = await page.evaluate(() => window.lensLab.getState().objectDistance);
      assert(Math.abs(afterDrag - beforeDrag) > 2, `${lab.id}/${viewport.name}: direct object drag did not update state`);
    }

    if (lab.id === "ideal-gas") {
      const reference = await page.evaluate(() => {
        const base = window.idealGasLab.solve({ mode: "microscopic", amount: .1, baseVolume: 10, baseTemperature: 300, species: "nitrogen", progress: 0 });
        const compressed = window.idealGasLab.solve({ mode: "isothermal", amount: .1, baseVolume: 10, baseTemperature: 300, species: "nitrogen", progress: 1 });
        const helium = window.idealGasLab.solve({ mode: "microscopic", amount: .1, baseVolume: 10, baseTemperature: 300, species: "helium", progress: 0 });
        return { base, compressed, helium };
      });
      assert(closeTo(reference.base.pressureKPa, 24.9434, .001), `${lab.id}/${viewport.name}: ideal-gas reference mismatch`);
      assert(closeTo(reference.compressed.volumeLiters, 5, 1e-12) && closeTo(reference.compressed.pressureKPa, 2 * reference.base.pressureKPa, 1e-9) && closeTo(reference.compressed.pVJ, reference.base.pVJ, 1e-9), `${lab.id}/${viewport.name}: isothermal invariant mismatch`);
      assert(closeTo(reference.helium.pressureKPa, reference.base.pressureKPa, 1e-9) && reference.helium.rmsSpeed > reference.base.rmsSpeed, `${lab.id}/${viewport.name}: molecular-mass comparison mismatch`);
      const canvas = page.locator("#gasCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const beforeDrag = await page.evaluate(() => window.idealGasLab.getState().baseVolume);
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * .2, box.y + box.height * .5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * .8, box.y + box.height * .5);
      await page.mouse.up();
      const afterDrag = await page.evaluate(() => window.idealGasLab.getState().baseVolume);
      assert(Math.abs(afterDrag - beforeDrag) > 2, `${lab.id}/${viewport.name}: piston drag did not update volume`);
    }

    if (lab.id === "matter-phase") {
      const reference = await page.evaluate(() => {
        const base = window.matterPhaseLab.brownian({ temperatureK: 300, viscosityPas: .001, particleRadiusM: .5e-6, elapsedS: 10 });
        const hotter = window.matterPhaseLab.brownian({ temperatureK: 600, viscosityPas: .001, particleRadiusM: .5e-6, elapsedS: 10 });
        const larger = window.matterPhaseLab.brownian({ temperatureK: 300, viscosityPas: .001, particleRadiusM: 1e-6, elapsedS: 10 });
        const start = window.matterPhaseLab.heatingWater({ massKg: .2, initialTemperatureC: -20, energyJ: 0 });
        const halfway = window.matterPhaseLab.heatingWater({ massKg: .2, initialTemperatureC: -20, energyJ: start.thresholdsJ.warmIce + .5 * (start.thresholdsJ.meltEnd - start.thresholdsJ.warmIce) });
        const powered = window.matterPhaseLab.poweredHeating({ massKg: .2, initialTemperatureC: -20, powerW: 500, elapsedS: 100, efficiency: .8 });
        return { base, hotter, larger, halfway, powered };
      });
      assert(closeTo(reference.base.meanSquared2dM2, 4 * reference.base.diffusionM2S * 10, 1e-30), `${lab.id}/${viewport.name}: Brownian MSD mismatch`);
      assert(closeTo(reference.hotter.diffusionM2S, 2 * reference.base.diffusionM2S, 1e-24) && closeTo(reference.larger.diffusionM2S, .5 * reference.base.diffusionM2S, 1e-24), `${lab.id}/${viewport.name}: Brownian scaling mismatch`);
      assert(reference.halfway.phase === "melting" && closeTo(reference.halfway.temperatureC, 0, 1e-12) && closeTo(reference.halfway.meltFraction, .5, 1e-12), `${lab.id}/${viewport.name}: latent-heat plateau mismatch`);
      assert(closeTo(reference.powered.inputEnergyJ, reference.powered.usefulEnergyJ + reference.powered.lossEnergyJ, 1e-9) && closeTo(reference.powered.energyResidualJ, 0, 1e-9), `${lab.id}/${viewport.name}: heater ledger mismatch`);
      const canvas = page.locator("#matterCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * .2, box.y + box.height * .5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * .82, box.y + box.height * .5);
      await page.mouse.up();
      assert((await page.evaluate(() => window.matterPhaseLab.getState().temperatureC)) > 75, `${lab.id}/${viewport.name}: direct temperature drag did not update state`);
    }

    if (lab.id === "thermodynamics") {
      const reference = await page.evaluate(() => ({
        isothermal: window.thermodynamicsLab.idealGasProcess({ process: "isothermal", amountMol: 1, initialTemperatureK: 300, initialPressurePa: 1e5, volumeRatio: 2, gamma: 5 / 3 }),
        cycle: window.thermodynamicsLab.rectangularCycle({ pressureLowPa: 1e5, pressureHighPa: 3e5, volumeLowM3: .01, volumeHighM3: .03, gamma: 5 / 3 }),
        carnot: window.thermodynamicsLab.carnotEngine({ hotTemperatureK: 600, coldTemperatureK: 300, heatInputJ: 1000 }),
        impossible: window.thermodynamicsLab.actualEngine({ hotTemperatureK: 600, coldTemperatureK: 300, heatInputJ: 1000, efficiency: .8 })
      }));
      assert(closeTo(reference.isothermal.internalEnergyChangeJ, 0, 1e-9) && closeTo(reference.isothermal.heatIntoGasJ, reference.isothermal.workByGasJ, 1e-9), `${lab.id}/${viewport.name}: isothermal first-law mismatch`);
      assert(closeTo(reference.cycle.netWorkJ, reference.cycle.geometricAreaJ, 1e-9) && closeTo(reference.cycle.cycleInternalEnergyChangeJ, 0, 1e-9), `${lab.id}/${viewport.name}: cycle ledger mismatch`);
      assert(closeTo(reference.carnot.efficiency, .5, 1e-12) && !reference.impossible.physicallyAllowed && closeTo(reference.impossible.efficiency, .5, 1e-12), `${lab.id}/${viewport.name}: Carnot limit mismatch`);
      const canvas = page.locator("#thermalCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * .15, box.y + box.height * .5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * .82, box.y + box.height * .5);
      await page.mouse.up();
      assert((await page.evaluate(() => window.thermodynamicsLab.getState().progress)) > .75, `${lab.id}/${viewport.name}: direct process drag did not update state`);
    }

    if (lab.id === "photoelectric") {
      const reference = await page.evaluate(() => ({ emitting: window.photoelectricLab.solve({ wavelengthNm: 400, intensity: 60, voltage: 0, material: "sodium" }), blocked: window.photoelectricLab.solve({ wavelengthNm: 650, intensity: 100, voltage: 0, material: "sodium" }) }));
      assert(closeTo(reference.emitting.maxKineticEnergyEv, .8196, .002) && closeTo(reference.emitting.stoppingVoltage, .8196, .002), `${lab.id}/${viewport.name}: Einstein photoelectric reference mismatch`);
      assert(!reference.blocked.emits && reference.blocked.photocurrentNa === 0, `${lab.id}/${viewport.name}: below-threshold emission mismatch`);
      const canvas = page.locator("#photoCanvas"); await canvas.scrollIntoViewIfNeeded(); const box = await canvas.boundingBox(); await page.mouse.move(box.x + box.width * .8, box.y + box.height * .5); await page.mouse.down(); await page.mouse.up(); assert((await page.evaluate(() => window.photoelectricLab.getState().wavelengthNm)) > 600, `${lab.id}/${viewport.name}: wavelength drag did not update state`);
    }

    if (lab.id === "rutherford") {
      const reference = await page.evaluate(() => {
        const input = { projectileCharge: 2, targetZ: 79, energyMeV: 5, impactFm: 50, maxImpactFm: 200, atomRadiusFm: 50000, seed: 17 };
        const scattering = window.rutherfordLab.scatter(input);
        const cross90 = window.rutherfordLab.differentialCrossSection(90, input);
        const thomson = window.rutherfordLab.thomsonAngle(input);
        const expected = window.rutherfordLab.expectedFractionAbove(90, input);
        const events = window.rutherfordLab.eventAngles(input, 20000);
        const measured = events.filter((event) => event.angleDeg > 90).length / events.length;
        const trajectory = window.rutherfordLab.trajectory(input);
        const closest = trajectory.reduce((best, point) => point.radiusFm < best.radiusFm ? point : best);
        const last = trajectory.at(-1);
        const previous = trajectory.at(-2);
        const outgoingDeg = Math.abs(Math.atan2(last.yFm - previous.yFm, last.xFm - previous.xFm)) * 180 / Math.PI;
        return { scattering, cross90, thomson, expected, measured, closest, outgoingDeg };
      });
      assert(closeTo(reference.scattering.angleDeg, 48.93380207382619, 1e-10), `${lab.id}/${viewport.name}: Coulomb scattering angle mismatch`);
      assert(closeTo(reference.scattering.closestFm, 77.68437941839622, 1e-10) && closeTo(reference.scattering.headOnClosestFm, 45.502877568, 1e-10) && closeTo(reference.scattering.b90Fm, 22.751438784, 1e-10), `${lab.id}/${viewport.name}: closest-approach reference mismatch`);
      assert(closeTo(reference.cross90.fm2PerSr, 517.6279667420997, 1e-9), `${lab.id}/${viewport.name}: Rutherford cross-section mismatch`);
      assert(closeTo(reference.expected, .012940699168552491, 1e-12) && Math.abs(reference.measured - reference.expected) < .002, `${lab.id}/${viewport.name}: angular statistics mismatch`);
      assert(reference.thomson.angleDeg < .001, `${lab.id}/${viewport.name}: Thomson comparison should not produce large-angle scattering`);
      assert(Math.abs(reference.closest.radiusFm - reference.scattering.closestFm) < .001 && Math.abs(reference.outgoingDeg - reference.scattering.angleDeg) < .1, `${lab.id}/${viewport.name}: analytic hyperbola trajectory mismatch`);
      const canvas = page.locator("#scatterCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const before = await page.evaluate(() => window.rutherfordLab.getState().impactFm);
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * .3, box.y + box.height * .5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * .3, box.y + box.height * .1);
      await page.mouse.up();
      const after = await page.evaluate(() => window.rutherfordLab.getState().impactFm);
      assert(Math.abs(after - before) > 100, `${lab.id}/${viewport.name}: direct impact-parameter drag did not update state`);
    }

    if (lab.id === "bohr") {
      const reference = await page.evaluate(() => ({ halpha: window.bohrLab.solve({ mode: "emission", initial: 3, final: 2 }), absorption: window.bohrLab.solve({ mode: "absorption", initial: 2, probeNm: 656.112 }) }));
      assert(closeTo(reference.halpha.wavelengthNm, 656.1, .5) && reference.halpha.type === "emission" && closeTo(reference.halpha.energyResidualEv, 0, 1e-12), `${lab.id}/${viewport.name}: H-alpha reference mismatch`);
      assert(reference.absorption.resonant && reference.absorption.targetLevel === 3, `${lab.id}/${viewport.name}: resonant absorption mismatch`);
      await page.evaluate(() => window.bohrLab.setMode("emission"));
      const canvas = page.locator("#atomCanvas"); await canvas.scrollIntoViewIfNeeded(); const box = await canvas.boundingBox(); await page.mouse.move(box.x + box.width * .8, box.y + box.height * .5); await page.mouse.down(); await page.mouse.up(); assert((await page.evaluate(() => window.bohrLab.getState().progress)) > .7, `${lab.id}/${viewport.name}: transition drag did not update progress`);
    }

    if (lab.id === "matter-wave") {
      const reference = await page.evaluate(() => ({ deBroglie: window.matterWaveLab.solve({ mode: "scale", particle: "electron", speedExponent: Math.log10(2e6) }), fast: window.matterWaveLab.solve({ mode: "acceleration", voltage: 4000 }), slow: window.matterWaveLab.solve({ mode: "acceleration", voltage: 1000 }), ring: window.matterWaveLab.solve({ mode: "diffraction", voltage: 4000, latticeSpacingNm: .213, screenDistanceM: .135 }) }));
      assert(closeTo(reference.deBroglie.wavelengthNm, .363, .002), `${lab.id}/${viewport.name}: de Broglie reference mismatch`);
      assert(reference.fast.wavelengthNm < reference.slow.wavelengthNm && closeTo(reference.fast.energyResidualJ, 0, 1e-28) && reference.ring.valid, `${lab.id}/${viewport.name}: accelerating electron/Bragg reference mismatch`);
      await page.evaluate(() => window.matterWaveLab.setMode("acceleration"));
      const canvas = page.locator("#matterCanvas"); await canvas.scrollIntoViewIfNeeded(); const box = await canvas.boundingBox(); await page.mouse.move(box.x + box.width * .8, box.y + box.height * .5); await page.mouse.down(); await page.mouse.up(); assert((await page.evaluate(() => window.matterWaveLab.getState().voltage)) > 4000, `${lab.id}/${viewport.name}: matter-wave drag did not update voltage`);
    }

    if (lab.id === "radioactive-decay") {
      const reference = await page.evaluate(() => window.radioactiveDecayLab.solve({ initialCount: 160, halfLife: 6, time: 6, decayTimes: [] }));
      assert(closeTo(reference.expectedRemaining, 80, 1e-9) && closeTo(reference.survival, .5, 1e-12), `${lab.id}/${viewport.name}: half-life reference mismatch`);
      const canvas = page.locator("#decayCanvas"); await canvas.scrollIntoViewIfNeeded(); const box = await canvas.boundingBox(); await page.mouse.move(box.x + box.width * .8, box.y + box.height * .5); await page.mouse.down(); await page.mouse.up(); assert((await page.evaluate(() => window.radioactiveDecayLab.getState().tau)) > 2.5, `${lab.id}/${viewport.name}: decay-time drag did not update state`);
    }

    if (lab.id === "binding-energy") {
      const reference = await page.evaluate(() => ({ helium: window.bindingEnergyLab.solveIsotope("helium4"), fusion: window.bindingEnergyLab.solveReaction("fusion") }));
      assert(closeTo(reference.helium.bindingEnergyMeV, 28.296, .01) && closeTo(reference.helium.identityResidualU, 0, 1e-12), `${lab.id}/${viewport.name}: helium binding reference mismatch`);
      assert(reference.fusion.nucleonConserved && reference.fusion.chargeConserved && closeTo(reference.fusion.qValueMeV, 17.59, .02), `${lab.id}/${viewport.name}: fusion Q-value reference mismatch`);
      await page.evaluate(() => window.bindingEnergyLab.setMode("assembly"));
      const canvas = page.locator("#bindingCanvas"); await canvas.scrollIntoViewIfNeeded(); const box = await canvas.boundingBox(); await page.mouse.move(box.x + box.width * .8, box.y + box.height * .5); await page.mouse.down(); await page.mouse.up(); assert((await page.evaluate(() => window.bindingEnergyLab.getState().progress)) > .7, `${lab.id}/${viewport.name}: binding progress drag did not update state`);
    }

    if (lab.id === "nuclear-reaction") {
      const reference = await page.evaluate(() => ({ chain: window.nuclearReactionLab.solveChain({ neutronYield: 2.5, fissionProbability: .65, escapeFraction: .15, controlAbsorption: .276 }), fusion: window.nuclearReactionLab.solveFusion({ temperatureKeV: 15, densityRatio: 1, confinementS: 1 }) }));
      assert(closeTo(reference.chain.kEffective, 1, .002) && closeTo(reference.chain.balanceResidual, 0, 1e-12), `${lab.id}/${viewport.name}: critical chain reference mismatch`);
      assert(closeTo(reference.fusion.opportunityIndex, 1, 1e-9) && reference.fusion.closestApproachFm > reference.fusion.nuclearContactFm, `${lab.id}/${viewport.name}: fusion-condition reference mismatch`);
      const canvas = page.locator("#reactionCanvas"); await canvas.scrollIntoViewIfNeeded(); const box = await canvas.boundingBox(); await page.mouse.move(box.x + box.width * .8, box.y + box.height * .5); await page.mouse.down(); await page.mouse.up(); assert((await page.evaluate(() => window.nuclearReactionLab.getState().progress)) > .7, `${lab.id}/${viewport.name}: reaction progress drag did not update state`);
    }

    if (lab.id === "double-slit") {
      const reference = await page.evaluate(() => window.doubleSlitLab.calculate({
        wavelength: 600, slit: 0.3, slitWidth: 0.06, screen: 1.2, cursorRatio: 0
      }));
      assert(closeTo(reference.betaMm, 2.4, 0.001), `${lab.id}/${viewport.name}: fringe spacing reference mismatch`);
    }

    if (lab.id === "single-slit") {
      const reference = await page.evaluate(() => {
        const input = { wavelengthNm: 600, slitWidthMm: .06, screenDistanceM: 1.2, probeMm: 0 };
        const base = window.singleSlitLab.derived(input);
        const first = window.singleSlitLab.intensityAt(base.firstMinimumMm, input);
        const narrow = window.singleSlitLab.derived({ ...input, slitWidthMm: .03 });
        const phasor = window.singleSlitLab.phasors({ ...input, probeMm: base.firstMinimumMm });
        return { base, first, narrow, phasor };
      });
      assert(closeTo(reference.base.firstMinimumMm, 12.00060004500375, 1e-10) && closeTo(reference.base.centralWidthMm, 24.0012000900075, 1e-10), `${lab.id}/${viewport.name}: central-width reference mismatch`);
      assert(Math.abs(reference.first.intensity) < 1e-28 && closeTo(reference.first.pathEdgeWaves, 1, 1e-12), `${lab.id}/${viewport.name}: first-minimum condition mismatch`);
      assert(closeTo(reference.narrow.approximateCentralWidthMm, 2 * reference.base.approximateCentralWidthMm, 1e-12), `${lab.id}/${viewport.name}: aperture-width inverse relation mismatch`);
      assert(reference.phasor.resultant.magnitude < 1e-12, `${lab.id}/${viewport.name}: Huygens phasor closure mismatch`);
      const canvas = page.locator("#singleSlitCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const before = await page.evaluate(() => window.singleSlitLab.getState().probeMm);
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * .55, box.y + box.height * .5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * .55, box.y + box.height * .25);
      await page.mouse.up();
      const after = await page.evaluate(() => window.singleSlitLab.getState().probeMm);
      assert(Math.abs(after - before) > 5, `${lab.id}/${viewport.name}: direct screen-probe drag did not update position`);
    }

    if (lab.id === "thin-film") {
      const reference = await page.evaluate(() => {
        const soap = { wavelengthNm: 600, thicknessNm: 600 / (4 * 1.33), incidentIndex: 1, filmIndex: 1.33, substrateIndex: 1, incidenceDeg: 0 };
        const q = window.thinFilmLab.idealQuarterWave(550, 1.5);
        const coating = { wavelengthNm: 550, thicknessNm: q.thicknessNm, incidentIndex: 1, filmIndex: q.filmIndex, substrateIndex: 1.5, incidenceDeg: 0 };
        const wedge = { wavelengthNm: 550, thicknessNm: 0, incidentIndex: 1.5, filmIndex: 1, substrateIndex: 1.5, incidenceDeg: 0, wedgeSlopeUrad: 100, positionMm: 0 };
        return { soap: window.thinFilmLab.derived(soap), zero: window.thinFilmLab.derived({ ...soap, thicknessNm: 0 }), coating: window.thinFilmLab.derived(coating), q, wedge: window.thinFilmLab.derived(wedge) };
      });
      assert(closeTo(reference.soap.reflectance, .07711257030552099, 1e-14) && reference.soap.topPhaseFlip && !reference.soap.bottomPhaseFlip, `${lab.id}/${viewport.name}: soap-film quarter-wave reference mismatch`);
      assert(reference.zero.reflectance < 1e-28, `${lab.id}/${viewport.name}: zero-thickness equivalent-interface mismatch`);
      assert(closeTo(reference.q.filmIndex, Math.sqrt(1.5), 1e-14) && closeTo(reference.q.thicknessNm, 112.26827987756234, 1e-12) && reference.coating.reflectance < 1e-28, `${lab.id}/${viewport.name}: anti-reflection coating mismatch`);
      assert(reference.wedge.localReflectance < 1e-28 && closeTo(reference.wedge.wedgeSpacingMm, 2.75, 1e-12) && !reference.wedge.topPhaseFlip && reference.wedge.bottomPhaseFlip, `${lab.id}/${viewport.name}: air-wedge contact or spacing mismatch`);
      const canvas = page.locator("#filmCanvas");
      await canvas.scrollIntoViewIfNeeded();
      const before = await page.evaluate(() => window.thinFilmLab.getState().thicknessNm);
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * .5, box.y + box.height * .25);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * .5, box.y + box.height * .75);
      await page.mouse.up();
      const after = await page.evaluate(() => window.thinFilmLab.getState().thicknessNm);
      assert(Math.abs(after - before) > 300, `${lab.id}/${viewport.name}: direct film-thickness drag did not update state`);
    }

    const savedValue = await page.locator(lab.perturb[0]).evaluate((element) => element.value);
    await page.evaluate(() => window.physicsLabState.save());
    await page.reload({ waitUntil: "networkidle" });
    const restoredValue = await page.locator(lab.perturb[0]).evaluate((element) => element.value);
    assert(restoredValue === savedValue, `${lab.id}/${viewport.name}: state was not restored after reload`);

    if (screenshotDir) {
      fs.mkdirSync(screenshotDir, { recursive: true });
      await page.screenshot({ path: path.join(screenshotDir, `${lab.id}-${viewport.name}.png`), fullPage: true });
    }

    const relevantErrors = errors.filter((error) => !(
      error.includes("Failed to load resource")
      && badResponses.length === 0
    ));
    assert(badResponses.length === 0, `${lab.id}/${viewport.name}: ${badResponses.join("; ")}`);
    assert(relevantErrors.length === 0, `${lab.id}/${viewport.name}: ${relevantErrors.join("; ")}`);
    return { lab: lab.id, viewport: viewport.name, modes: modes.length, canvases };
  } finally {
    await page.close();
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  let failed = false;
  try {
    for (const viewport of viewports) {
      for (const lab of runLabs) {
        try {
          const result = await verifyLab(browser, lab, viewport);
          console.log(`PASS ${result.lab}/${result.viewport}: ${result.modes} scenes, ${result.canvases.length} canvases`);
        } catch (error) {
          failed = true;
          console.error(`FAIL ${lab.id}/${viewport.name}: ${error.message}`);
        }
      }
    }
  } finally {
    await browser.close();
  }
  if (failed) process.exitCode = 1;
})();
