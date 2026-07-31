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
  { id: "vertical-motion", path: "vertical-motion.html", perturb: ["#heightInput", "36"] },
  { id: "friction", path: "friction.html", perturb: ["#massInput", "3.2"] },
  { id: "newton-laws", path: "newton-laws.html", perturb: ["#massInput", "3.2"] },
  { id: "interaction", path: "interaction.html", perturb: ["#force1Input", "9.5"] },
  { id: "projectile", path: "projectile.html", perturb: ["#speedInput", "24"] },
  { id: "circular", path: "circular.html", perturb: ["#radiusInput", "1.8"] },
  { id: "circular-critical", path: "circular-critical.html", perturb: ["#radiusInput", "55"] },
  { id: "orbital", path: "orbital.html", perturb: ["#altitudeInput", "1200"] },
  { id: "work-propulsion", path: "work-propulsion.html", perturb: ["#forceInput", "30"] },
  { id: "mechanical-energy", path: "mechanical-energy.html", perturb: ["#massInput", "3.2"] },
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
  { id: "electromagnetic-induction", path: "electromagnetic-induction.html", perturb: ["#turnsInput", "160"] },
  { id: "alternating-current", path: "alternating-current.html", perturb: ["#generatorTurnsInput", "360"] },
  { id: "electromagnetic-oscillation", path: "electromagnetic-oscillation.html", perturb: ["#inductanceInput", "35"] },
  { id: "collision", path: "collision.html", perturb: ["#mass1Input", "3.2"] },
  { id: "oscillation", path: "oscillation.html", perturb: ["#springInput", "25"] },
  { id: "resonance", path: "resonance.html", perturb: ["#dampingInput", "0.2"] },
  { id: "waves", path: "waves.html", perturb: ["#wavelengthInput", "3"] },
  { id: "lens", path: "lens.html", perturb: ["#focalInput", "12"] },
  { id: "ideal-gas", path: "ideal-gas.html", perturb: ["#amountInput", "0.16"] },
  { id: "matter-phase", path: "matter-phase.html", perturb: ["#radiusInput", "1.2"] },
  { id: "thermodynamics", path: "thermodynamics.html", perturb: ["#temperatureInput", "450"] },
  { id: "photoelectric", path: "photoelectric.html", perturb: ["#wavelengthInput", "450"] },
  { id: "bohr", path: "bohr.html", perturb: ["#initialSelect", "4"] },
  { id: "matter-wave", path: "matter-wave.html", perturb: ["#speedInput", "6.8"] },
  { id: "radioactive-decay", path: "radioactive-decay.html", perturb: ["#halfLifeInput", "8"] },
  { id: "binding-energy", path: "binding-energy.html", perturb: ["#assemblyInput", "0.6"] },
  { id: "nuclear-reaction", path: "nuclear-reaction.html", perturb: ["#progressInput", "0.4"] },
  { id: "double-slit", path: "double-slit.html", perturb: ["#wavelengthInput", "650"] }
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

    if (lab.id === "vertical-motion") {
      const reference = await page.evaluate(() => ({
        dropTime: window.VerticalMotionModel.landingTime({ initialHeightM: 20, initialVelocityMs: 0, gravityMs2: 9.8 }),
        apex: window.verticalMotionLab.solve({ heightM: 20, speedMs: 20, gravity: 9.8, timeS: 20 / 9.8 })
      }));
      assert(closeTo(reference.dropTime, 2.020305, 1e-5), `${lab.id}/${viewport.name}: drop-time reference mismatch`);
      assert(closeTo(reference.apex.velocityMs, 0, 1e-9) && closeTo(reference.apex.accelerationMs2, -9.8, 1e-9), `${lab.id}/${viewport.name}: apex reference mismatch`);
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

    if (lab.id === "electromagnetic-induction") {
      const reference = await page.evaluate(() => ({
        closed: window.inductionLab.sampleAt(1, { mode: "rate", field: .08, motion: 1, turns: 100, area: 100, resistance: 10, circuit: "closed" }),
        open: window.inductionLab.sampleAt(1, { mode: "rate", field: .08, motion: 1, turns: 100, area: 100, resistance: 10, circuit: "open" })
      }));
      assert(closeTo(reference.closed.emf, -.08, 1e-12) && closeTo(reference.closed.current, -.008, 1e-12), `${lab.id}/${viewport.name}: Faraday reference mismatch`);
      assert(closeTo(reference.open.emf, -.08, 1e-12) && closeTo(reference.open.current, 0, 1e-15), `${lab.id}/${viewport.name}: open-circuit boundary mismatch`);
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
