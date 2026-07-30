(function () {
  const model = window.IdealGasModel;
  if (!model) throw new Error("IdealGasModel is required");

  const refs = {
    canvas: document.getElementById("gasCanvas"), stateChart: document.getElementById("stateChart"), statisticChart: document.getElementById("statisticChart"),
    amountInput: document.getElementById("amountInput"), volumeInput: document.getElementById("volumeInput"), temperatureInput: document.getElementById("temperatureInput"), processInput: document.getElementById("processInput"),
    amountValue: document.getElementById("amountValue"), volumeValue: document.getElementById("volumeValue"), temperatureValue: document.getElementById("temperatureValue"), processLabel: document.getElementById("processLabel"), processValue: document.getElementById("processValue"),
    pressureMetric: document.getElementById("pressureMetric"), volumeMetric: document.getElementById("volumeMetric"), temperatureMetric: document.getElementById("temperatureMetric"), amountMetric: document.getElementById("amountMetric"), speedMetric: document.getElementById("speedMetric"), kineticMetric: document.getElementById("kineticMetric"),
    gasNature: document.getElementById("gasNature"), gasExplanation: document.getElementById("gasExplanation"), modeTitle: document.getElementById("modeTitle"), modeGoal: document.getElementById("modeGoal"), stateBadge: document.getElementById("stateBadge"), stageHint: document.getElementById("stageHint"),
    stateChartTitle: document.getElementById("stateChartTitle"), stateChartStatus: document.getElementById("stateChartStatus"), statisticKicker: document.getElementById("statisticKicker"), statisticTitle: document.getElementById("statisticTitle"), statisticStatus: document.getElementById("statisticStatus"),
    stepIndex: document.getElementById("stepIndex"), stepTitle: document.getElementById("stepTitle"), stepPrompt: document.getElementById("stepPrompt"), formulaReadout: document.getElementById("formulaReadout"),
    playButton: document.getElementById("playButton"), pauseButton: document.getElementById("pauseButton"), keyButton: document.getElementById("keyButton"), resetButton: document.getElementById("resetButton"), guideButton: document.getElementById("guideButton"), stepButton: document.getElementById("stepButton"), focusButton: document.getElementById("focusButton"), fullscreenButton: document.getElementById("fullscreenButton"), guideDialog: document.getElementById("guideDialog"),
    showVelocityToggle: document.getElementById("showVelocityToggle"), showTrailsToggle: document.getElementById("showTrailsToggle"), showCollisionsToggle: document.getElementById("showCollisionsToggle"), showPressureToggle: document.getElementById("showPressureToggle"), showSampleToggle: document.getElementById("showSampleToggle"),
    sceneTabs: Array.from(document.querySelectorAll(".scene-tab[data-mode]")), routeSteps: Array.from(document.querySelectorAll(".route-step")), speciesButtons: Array.from(document.querySelectorAll("[data-species]")), presetButtons: Array.from(document.querySelectorAll("[data-preset]")), rateButtons: Array.from(document.querySelectorAll("[data-rate]"))
  };
  const context = refs.canvas.getContext("2d");
  const stateContext = refs.stateChart.getContext("2d");
  const statisticContext = refs.statisticChart.getContext("2d");
  const COLORS = { pressure: "#64c7d9", volume: "#b58ce5", temperature: "#ff7468", particle: "#79d992", energy: "#f2b84b", text: "#a6b0a9", muted: "#717b75" };
  const modes = {
    microscopic: { title: "微观压强", goal: "大量分子撞击器壁形成稳定的宏观压强", hint: "拖动活塞改变体积，观察碰撞频率和压强", badge: "热平衡", badgeClass: "balanced", key: "◎ 300 K 基准" },
    isothermal: { title: "等温压缩", goal: "温度不变时，体积减半使压强加倍", hint: "拖动过程进度，检查整条等温线上的 pV", badge: "T 保持不变", badgeClass: "compressing", key: "◎ 压缩一半" },
    isochoric: { title: "等容加热", goal: "体积不变时，开尔文温度与压强成正比", hint: "拖动过程进度，比较 T 与 p 的同步变化", badge: "V 保持不变", badgeClass: "heating", key: "◎ 温度加倍" },
    isobaric: { title: "等压膨胀", goal: "压强不变时，开尔文温度与体积成正比", hint: "拖动过程进度，观察活塞随温度移动", badge: "p 保持不变", badgeClass: "balanced", key: "◎ 温度与体积加倍" }
  };
  const guide = [
    { title: "先看微观碰撞", prompt: "分子没有持续推着器壁，为什么宏观压强仍能保持稳定？" },
    { title: "再锁定不变量", prompt: "改变一个状态量时，过程约束决定另外两个量怎样联动。" },
    { title: "最后比较统计量", prompt: "同温下氦气更快，为什么它与氮气仍能产生相同压强？" }
  ];
  const state = { mode: "microscopic", amount: 0.1, baseVolume: 10, baseTemperature: 300, species: "nitrogen", progress: 0, running: true, playbackRate: 0.5, elapsed: 0, guideStep: 0, dragging: false, showVelocity: true, showTrails: true, showCollisions: true, showPressure: true, showSample: true };
  let particles = [];
  let collisionFlashes = [];
  let frameCount = 0;

  function clamp(value, min, max) { return Math.min(max, Math.max(min, Number(value))); }
  function fmt(value, digits = 3) { return Number(value).toFixed(digits).replace("-", "−"); }
  function sample() { return model.processState(state, state.progress); }
  function seededRandom(seed = 48371) { let value = seed >>> 0; return () => { value = (1664525 * value + 1013904223) >>> 0; return value / 4294967296; }; }
  function gaussian(random) { const u = Math.max(1e-9, random()); const v = random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function desiredParticleCount() { return Math.round(18 + state.amount / 0.3 * 54); }
  function rebuildParticles() {
    const random = seededRandom(941 + desiredParticleCount() * 17);
    particles = Array.from({ length: desiredParticleCount() }, () => ({ x: 0.04 + random() * 0.92, y: 0.05 + random() * 0.9, previousX: 0, previousY: 0, gx: gaussian(random), gy: gaussian(random), gz: gaussian(random) }));
    particles.forEach((particle) => { particle.previousX = particle.x; particle.previousY = particle.y; });
    collisionFlashes = [];
  }
  function updateParticles(delta, current) {
    const massScale = Math.sqrt(model.SPECIES.nitrogen.molarMass / current.species.molarMass);
    const temperatureScale = Math.sqrt(current.temperature / 300);
    const volumeScale = Math.max(0.45, current.volumeLiters / 10);
    const visualScale = 0.115 * massScale * temperatureScale * state.playbackRate;
    particles.forEach((particle) => {
      particle.previousX = particle.x; particle.previousY = particle.y;
      particle.x += particle.gx * visualScale * delta / volumeScale;
      particle.y += particle.gy * visualScale * delta;
      if (particle.x <= 0 || particle.x >= 1) {
        const wall = particle.x <= 0 ? "left" : "right";
        particle.x = clamp(particle.x, 0, 1); particle.gx *= -1;
        if (state.showCollisions) collisionFlashes.push({ wall, y: particle.y, life: 1 });
      }
      if (particle.y <= 0 || particle.y >= 1) {
        const wall = particle.y <= 0 ? "top" : "bottom";
        particle.y = clamp(particle.y, 0, 1); particle.gy *= -1;
        if (state.showCollisions) collisionFlashes.push({ wall, x: particle.x, life: 1 });
      }
    });
    collisionFlashes.forEach((flash) => { flash.life -= delta * 3.8; });
    collisionFlashes = collisionFlashes.filter((flash) => flash.life > 0).slice(-36);
  }

  function setCanvasSize(canvas, canvasContext, minimumHeight = 180) {
    const rect = canvas.getBoundingClientRect(); const ratio = Math.min(window.devicePixelRatio || 1, 2); const width = Math.max(280, Math.round(rect.width)); const height = Math.max(minimumHeight, Math.round(rect.height));
    if (canvas.width !== width * ratio || canvas.height !== height * ratio) { canvas.width = width * ratio; canvas.height = height * ratio; }
    canvasContext.setTransform(ratio, 0, 0, ratio, 0, 0); return { width, height };
  }
  function line(canvasContext, x1, y1, x2, y2, color, width = 1, dash = []) { canvasContext.save(); canvasContext.strokeStyle = color; canvasContext.lineWidth = width; canvasContext.setLineDash(dash); canvasContext.beginPath(); canvasContext.moveTo(x1, y1); canvasContext.lineTo(x2, y2); canvasContext.stroke(); canvasContext.restore(); }
  function text(canvasContext, value, x, y, color = COLORS.text, size = 10, align = "left", weight = 500) { canvasContext.fillStyle = color; canvasContext.font = `${weight} ${size}px ui-sans-serif, system-ui`; canvasContext.textAlign = align; canvasContext.fillText(value, x, y); }
  function arrow(canvasContext, x1, y1, x2, y2, color, width = 1.6) { const angle = Math.atan2(y2 - y1, x2 - x1); line(canvasContext, x1, y1, x2, y2, color, width); canvasContext.fillStyle = color; canvasContext.beginPath(); canvasContext.moveTo(x2, y2); canvasContext.lineTo(x2 - 6 * Math.cos(angle - 0.48), y2 - 6 * Math.sin(angle - 0.48)); canvasContext.lineTo(x2 - 6 * Math.cos(angle + 0.48), y2 - 6 * Math.sin(angle + 0.48)); canvasContext.fill(); }
  function containerGeometry(width, height, current) {
    const left = Math.max(38, width * 0.07); const top = Math.max(46, height * 0.14); const bottom = height - Math.max(62, height * 0.17); const maximumRight = width - Math.max(70, width * 0.1);
    const minimumRight = left + Math.max(120, width * 0.26); const fraction = clamp((current.volumeLiters - 4) / 26, 0, 1); const right = minimumRight + (maximumRight - minimumRight) * fraction;
    return { left, top, bottom, right, maximumRight, width: right - left, height: bottom - top };
  }
  function particleColor(speedRatio) { if (speedRatio < 0.65) return COLORS.pressure; if (speedRatio < 1.05) return COLORS.particle; if (speedRatio < 1.45) return COLORS.energy; return COLORS.temperature; }
  function drawGasScene() {
    const current = sample(); const { width, height } = setCanvasSize(refs.canvas, context, 260); const box = containerGeometry(width, height, current);
    context.fillStyle = "#0b0f0e"; context.fillRect(0, 0, width, height);
    for (let x = 0; x <= width; x += 36) line(context, x, 0, x, height, "rgba(238,241,230,.035)");
    for (let y = 0; y <= height; y += 36) line(context, 0, y, width, y, "rgba(238,241,230,.035)");
    context.fillStyle = "rgba(100,199,217,.035)"; context.fillRect(box.left, box.top, box.width, box.height);
    line(context, box.left, box.top, box.right, box.top, "rgba(238,241,230,.52)", 3); line(context, box.left, box.bottom, box.right, box.bottom, "rgba(238,241,230,.52)", 3); line(context, box.left, box.top, box.left, box.bottom, "rgba(238,241,230,.52)", 3);
    context.fillStyle = "#a9b1aa"; context.fillRect(box.right - 5, box.top - 10, 10, box.height + 20); context.fillStyle = "#59625c"; context.fillRect(box.right + 5, (box.top + box.bottom) / 2 - 8, box.maximumRight - box.right + 28, 16);
    text(context, "可拖动活塞", box.right, box.top - 18, COLORS.volume, 10, "center", 700);
    const thermalVelocity = Math.sqrt(model.R * current.temperature / current.species.molarMass);
    particles.forEach((particle) => {
      const x = box.left + particle.x * box.width; const y = box.top + particle.y * box.height; const speed = Math.hypot(particle.gx, particle.gy, particle.gz) * thermalVelocity; const color = particleColor(speed / current.rmsSpeed);
      if (state.showTrails) line(context, box.left + particle.previousX * box.width, box.top + particle.previousY * box.height, x, y, `${color}88`, 1.2);
      context.fillStyle = color; context.beginPath(); context.arc(x, y, 2.7, 0, Math.PI * 2); context.fill();
      if (state.showVelocity && particles.indexOf(particle) % 4 === 0) { const length = Math.min(17, 5 + speed / current.rmsSpeed * 8); const norm = Math.hypot(particle.gx, particle.gy) || 1; arrow(context, x, y, x + particle.gx / norm * length, y + particle.gy / norm * length, `${color}bb`, 1); }
    });
    if (state.showCollisions) collisionFlashes.forEach((flash) => { const alpha = Math.round(clamp(flash.life, 0, 1) * 210).toString(16).padStart(2, "0"); const x = flash.wall === "left" ? box.left : flash.wall === "right" ? box.right : box.left + flash.x * box.width; const y = flash.wall === "top" ? box.top : flash.wall === "bottom" ? box.bottom : box.top + flash.y * box.height; context.strokeStyle = `${COLORS.energy}${alpha}`; context.lineWidth = 2; context.beginPath(); context.arc(x, y, 4 + (1 - flash.life) * 10, 0, Math.PI * 2); context.stroke(); });
    if (state.showPressure) { const count = Math.max(3, Math.min(7, Math.round(current.pressureRatio * 4))); for (let index = 0; index < count; index += 1) { const y = box.top + box.height * (index + 1) / (count + 1); arrow(context, box.right - 9, y, box.right + 22 + Math.min(24, current.pressureRatio * 8), y, `${COLORS.pressure}cc`, 1.5); } text(context, `p = ${fmt(current.pressureKPa, 2)} kPa`, box.right + 12, box.bottom + 28, COLORS.pressure, 10, "center", 700); }
    text(context, `${current.species.label} · ${fmt(current.temperature, 0)} K`, box.left, box.top - 18, COLORS.temperature, 10, "left", 700); text(context, `V = ${fmt(current.volumeLiters, 2)} L`, box.left, box.bottom + 28, COLORS.volume, 10, "left", 700);
    if (state.showSample) text(context, `代表性样本 N=${particles.length} · 尺寸、时间均已放大`, width - 16, height - 15, COLORS.muted, 9, "right");
    if (state.mode !== "microscopic") { const y = height - 38; line(context, box.left, y, box.maximumRight, y, "rgba(238,241,230,.16)", 4); line(context, box.left, y, box.left + (box.maximumRight - box.left) * state.progress, y, COLORS.particle, 4); context.fillStyle = COLORS.particle; context.beginPath(); context.arc(box.left + (box.maximumRight - box.left) * state.progress, y, 7, 0, Math.PI * 2); context.fill(); text(context, `过程 ${(state.progress * 100).toFixed(0)}%`, box.maximumRight, y - 12, COLORS.particle, 9, "right", 700); }
  }

  function chartAxes(canvasContext, width, height, xMin, xMax, yMin, yMax, xLabel, yLabel) {
    const pad = { l: 46, r: 18, t: 20, b: 34 }; const x = (value) => pad.l + (value - xMin) / Math.max(1e-12, xMax - xMin) * (width - pad.l - pad.r); const y = (value) => height - pad.b - (value - yMin) / Math.max(1e-12, yMax - yMin) * (height - pad.t - pad.b);
    line(canvasContext, pad.l, pad.t, pad.l, height - pad.b, "rgba(238,241,230,.28)"); line(canvasContext, pad.l, height - pad.b, width - pad.r, height - pad.b, "rgba(238,241,230,.28)");
    for (let index = 0; index <= 4; index += 1) { const xv = xMin + (xMax - xMin) * index / 4; const yv = yMin + (yMax - yMin) * index / 4; line(canvasContext, x(xv), pad.t, x(xv), height - pad.b, "rgba(238,241,230,.05)"); line(canvasContext, pad.l, y(yv), width - pad.r, y(yv), "rgba(238,241,230,.05)"); text(canvasContext, fmt(xv, xMax > 100 ? 0 : 1), x(xv), height - 15, COLORS.muted, 8, "center"); text(canvasContext, fmt(yv, yMax > 100 ? 0 : 2), pad.l - 7, y(yv) + 3, COLORS.muted, 8, "right"); }
    text(canvasContext, xLabel, width - pad.r, height - 4, COLORS.muted, 8, "right"); text(canvasContext, yLabel, 5, 12, COLORS.muted, 8); return { x, y, pad };
  }
  function plot(canvasContext, points, map, xKey, yKey, color, width = 2) { canvasContext.strokeStyle = color; canvasContext.lineWidth = width; canvasContext.beginPath(); points.forEach((point, index) => { const x = map.x(point[xKey]); const y = map.y(point[yKey]); if (index) canvasContext.lineTo(x, y); else canvasContext.moveTo(x, y); }); canvasContext.stroke(); }
  function drawStateChart(current) {
    const { width, height } = setCanvasSize(refs.stateChart, stateContext); stateContext.fillStyle = "#111512"; stateContext.fillRect(0, 0, width, height);
    const points = state.mode === "microscopic"
      ? Array.from({ length: 101 }, (_, index) => model.processState({ ...state, mode: "microscopic", baseVolume: 4 + index * 0.21 }, 0))
      : model.processSeries(state, 100);
    const volumes = points.map((point) => point.volumeLiters); const pressures = points.map((point) => point.pressureKPa); const xMin = Math.min(...volumes) * 0.9; const xMax = Math.max(...volumes) * 1.1; const yMax = Math.max(...pressures) * 1.15; const map = chartAxes(stateContext, width, height, xMin, xMax, 0, yMax, "V / L", "p / kPa");
    plot(stateContext, points, map, "volumeLiters", "pressureKPa", COLORS.volume, 2.3); line(stateContext, map.x(current.volumeLiters), map.pad.t, map.x(current.volumeLiters), height - map.pad.b, `${COLORS.particle}88`, 1, [4, 4]); stateContext.fillStyle = COLORS.particle; stateContext.beginPath(); stateContext.arc(map.x(current.volumeLiters), map.y(current.pressureKPa), 5, 0, Math.PI * 2); stateContext.fill();
  }
  function drawDistribution(current) {
    const { width, height } = setCanvasSize(refs.statisticChart, statisticContext); statisticContext.fillStyle = "#111512"; statisticContext.fillRect(0, 0, width, height);
    const thermalVelocity = Math.sqrt(model.R * current.temperature / current.species.molarMass); const speeds = particles.map((particle) => Math.hypot(particle.gx, particle.gy, particle.gz) * thermalVelocity); const maxSpeed = Math.max(current.rmsSpeed * 2.35, ...speeds) * 1.04; const bins = 16; const counts = Array(bins).fill(0); speeds.forEach((speed) => { counts[Math.min(bins - 1, Math.floor(speed / maxSpeed * bins))] += 1; }); const binWidth = maxSpeed / bins; const histogram = counts.map((count, index) => ({ speed: (index + 0.5) * binWidth, density: count / Math.max(1, speeds.length * binWidth) })); const curve = Array.from({ length: 121 }, (_, index) => ({ speed: maxSpeed * index / 120, density: model.maxwellPdf(maxSpeed * index / 120, current.temperature, state.species) })); const yMax = Math.max(...histogram.map((point) => point.density), ...curve.map((point) => point.density)) * 1.2; const map = chartAxes(statisticContext, width, height, 0, maxSpeed, 0, yMax, "v / (m·s⁻¹)", "概率密度");
    const barWidth = Math.max(2, (width - map.pad.l - map.pad.r) / bins - 2); histogram.forEach((point) => { const x = map.x(point.speed) - barWidth / 2; const y = map.y(point.density); statisticContext.fillStyle = "rgba(100,199,217,.28)"; statisticContext.fillRect(x, y, barWidth, height - map.pad.b - y); }); plot(statisticContext, curve, map, "speed", "density", COLORS.energy, 2.2);
    [[current.mostProbableSpeed, "vₘₚ", COLORS.particle], [current.meanSpeed, "v̄", COLORS.pressure], [current.rmsSpeed, "vᵣₘₛ", COLORS.temperature]].forEach(([speed, label, color], index) => { const x = map.x(speed); line(statisticContext, x, map.pad.t + index * 10, x, height - map.pad.b, `${color}99`, 1, [3, 3]); text(statisticContext, label, x + 3, map.pad.t + 8 + index * 10, color, 8); });
  }
  function drawInvariant(current) {
    const { width, height } = setCanvasSize(refs.statisticChart, statisticContext); statisticContext.fillStyle = "#111512"; statisticContext.fillRect(0, 0, width, height); const points = model.processSeries(state, 100).map((point) => ({ progress: point.progress * 100, value: state.mode === "isothermal" ? point.pVJ : state.mode === "isochoric" ? point.pressurePa / point.temperature : point.volumeLiters / point.temperature })); const value = points[0].value; const spread = Math.max(Math.abs(value) * 0.08, 1e-9); const map = chartAxes(statisticContext, width, height, 0, 100, value - spread, value + spread, "过程 / %", state.mode === "isothermal" ? "pV / J" : state.mode === "isochoric" ? "p/T / (Pa·K⁻¹)" : "V/T / (L·K⁻¹)"); plot(statisticContext, points, map, "progress", "value", COLORS.particle, 2.4); const x = map.x(current.progress * 100); line(statisticContext, x, map.pad.t, x, height - map.pad.b, `${COLORS.temperature}99`, 1.2, [4, 4]); statisticContext.fillStyle = COLORS.temperature; statisticContext.beginPath(); statisticContext.arc(x, map.y(points[Math.round(current.progress * 100)].value), 4.5, 0, Math.PI * 2); statisticContext.fill();
  }
  function drawCharts(current = sample()) { drawStateChart(current); if (state.mode === "microscopic") drawDistribution(current); else drawInvariant(current); }

  function rangeProgress(input) { const min = Number(input.min); const max = Number(input.max); input.style.setProperty("--range-progress", `${(Number(input.value) - min) / (max - min) * 100}%`); }
  function invariantStatus(current) {
    if (state.mode === "isothermal") return { nature: "pV = 常量", explanation: `pV = ${fmt(current.pVJ, 3)} J，残差 ${current.invariantResidual.toExponential(1)}`, formula: `p₁V₁ = p₂V₂ = ${fmt(current.pVJ, 3)} J`, chart: `pV = ${fmt(current.pVJ, 3)} J`, title: "等温过程不变量", kicker: "PROCESS INVARIANT" };
    if (state.mode === "isochoric") return { nature: "p / T = 常量", explanation: `V = ${fmt(current.volumeLiters, 2)} L，压强随开尔文温度同比变化`, formula: `p/T = ${fmt(current.pressurePa / current.temperature, 3)} Pa/K`, chart: `p/T = ${fmt(current.pressurePa / current.temperature, 3)} Pa/K`, title: "等容过程不变量", kicker: "PROCESS INVARIANT" };
    if (state.mode === "isobaric") return { nature: "V / T = 常量", explanation: `p = ${fmt(current.pressureKPa, 3)} kPa，活塞移动维持恒压`, formula: `V/T = ${fmt(current.volumeLiters / current.temperature, 5)} L/K`, chart: `V/T = ${fmt(current.volumeLiters / current.temperature, 5)} L/K`, title: "等压过程不变量", kicker: "PROCESS INVARIANT" };
    return { nature: "pV / nT = R", explanation: "宏观压强由状态方程计算，屏幕粒子用于展示碰撞与速率统计", formula: `pV = nRT = ${fmt(current.pVJ, 3)} J`, chart: `${current.species.label} · vᵣₘₛ=${fmt(current.rmsSpeed, 1)} m/s`, title: "分子速率分布", kicker: "MOLECULAR STATISTICS" };
  }
  function renderUi() {
    const current = sample(); const mode = modes[state.mode]; const status = invariantStatus(current);
    refs.amountInput.value = state.amount; refs.volumeInput.value = state.baseVolume; refs.temperatureInput.value = state.baseTemperature; refs.processInput.value = state.progress; refs.processInput.disabled = state.mode === "microscopic";
    refs.amountValue.textContent = `${fmt(state.amount, 2)} mol`; refs.volumeValue.textContent = `${fmt(state.baseVolume, 1)} L`; refs.temperatureValue.textContent = `${fmt(state.baseTemperature, 0)} K`; refs.processLabel.textContent = state.mode === "microscopic" ? "分子运动" : "过程进度"; refs.processValue.textContent = state.mode === "microscopic" ? `${state.running ? "运行中" : "已暂停"} · ${fmt(state.elapsed, 1)} s` : `${state.running ? "自动演示" : "手动定位"} · ${fmt(state.progress * 100, 0)}%`;
    refs.pressureMetric.textContent = `${fmt(current.pressureKPa, 3)} kPa`; refs.volumeMetric.textContent = `${fmt(current.volumeLiters, 3)} L`; refs.temperatureMetric.textContent = `${fmt(current.temperature, 0)} K`; refs.amountMetric.textContent = `${fmt(current.amount, 3)} mol`; refs.speedMetric.textContent = `${fmt(current.rmsSpeed, 1)} m/s`; refs.kineticMetric.textContent = `${fmt(current.meanKineticEnergyZJ, 3)} zJ`;
    refs.gasNature.textContent = status.nature; refs.gasExplanation.textContent = status.explanation; refs.modeTitle.textContent = mode.title; refs.modeGoal.textContent = mode.goal; refs.stageHint.textContent = mode.hint; refs.stateBadge.textContent = mode.badge; refs.stateBadge.className = `state-badge is-${mode.badgeClass}`;
    refs.stateChartTitle.textContent = "p-V 状态图"; refs.stateChartStatus.textContent = state.mode === "microscopic" ? `当前等温线 T=${fmt(current.temperature, 0)} K` : `${mode.title} · ${(state.progress * 100).toFixed(0)}%`; refs.statisticKicker.textContent = status.kicker; refs.statisticTitle.textContent = status.title; refs.statisticStatus.textContent = status.chart; refs.formulaReadout.textContent = status.formula;
    refs.stepIndex.textContent = String(state.guideStep + 1).padStart(2, "0"); refs.stepTitle.textContent = guide[state.guideStep].title; refs.stepPrompt.textContent = guide[state.guideStep].prompt; refs.routeSteps.forEach((button, index) => button.classList.toggle("is-active", index === state.guideStep)); refs.sceneTabs.forEach((button) => button.classList.toggle("is-active", button.dataset.mode === state.mode)); refs.speciesButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.species === state.species)); refs.rateButtons.forEach((button) => button.classList.toggle("is-active", Number(button.dataset.rate) === state.playbackRate));
    refs.playButton.textContent = state.running ? "▶ 运行中" : "▶ 运行"; refs.playButton.setAttribute("aria-pressed", String(state.running)); refs.keyButton.textContent = mode.key;
    [refs.amountInput, refs.volumeInput, refs.temperatureInput, refs.processInput].forEach(rangeProgress); drawGasScene(); drawCharts(current);
  }
  function setMode(modeName) { if (!modes[modeName]) return; state.mode = modeName; state.progress = 0; state.running = modeName === "microscopic"; collisionFlashes = []; renderUi(); }
  function reset() { Object.assign(state, { mode: "microscopic", amount: 0.1, baseVolume: 10, baseTemperature: 300, species: "nitrogen", progress: 0, running: true, playbackRate: 0.5, elapsed: 0, guideStep: 0, showVelocity: true, showTrails: true, showCollisions: true, showPressure: true, showSample: true }); [refs.showVelocityToggle, refs.showTrailsToggle, refs.showCollisionsToggle, refs.showPressureToggle, refs.showSampleToggle].forEach((input) => { input.checked = true; }); rebuildParticles(); renderUi(); }
  function setProgressFromPointer(event) { const rect = refs.canvas.getBoundingClientRect(); const current = sample(); const box = containerGeometry(rect.width, rect.height, current); if (state.mode === "microscopic") { const fraction = clamp((event.clientX - rect.left - box.left) / Math.max(1, box.maximumRight - box.left), 0, 1); state.baseVolume = Math.round((4 + fraction * 11) * 2) / 2; refs.volumeInput.value = state.baseVolume; } else state.progress = clamp((event.clientX - rect.left - box.left) / Math.max(1, box.maximumRight - box.left), 0, 1); state.running = false; renderUi(); }

  [[refs.amountInput, "amount"], [refs.volumeInput, "baseVolume"], [refs.temperatureInput, "baseTemperature"]].forEach(([input, key]) => input.addEventListener("input", () => { state[key] = Number(input.value); state.progress = 0; if (key === "amount") rebuildParticles(); renderUi(); }));
  refs.processInput.addEventListener("input", () => { state.progress = Number(refs.processInput.value); state.running = false; renderUi(); }); refs.sceneTabs.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode))); refs.routeSteps.forEach((button, index) => button.addEventListener("click", () => { state.guideStep = index; renderUi(); })); refs.speciesButtons.forEach((button) => button.addEventListener("click", () => { state.species = button.dataset.species; renderUi(); })); refs.rateButtons.forEach((button) => button.addEventListener("click", () => { state.playbackRate = Number(button.dataset.rate); renderUi(); }));
  refs.presetButtons.forEach((button) => button.addEventListener("click", () => { const preset = button.dataset.preset; if (preset === "room") reset(); if (preset === "heat") { Object.assign(state, { mode: "isochoric", amount: 0.1, baseVolume: 10, baseTemperature: 300, species: "nitrogen", progress: 1, running: false }); } if (preset === "compress") { Object.assign(state, { mode: "isothermal", amount: 0.1, baseVolume: 10, baseTemperature: 300, species: "nitrogen", progress: 1, running: false }); } if (preset === "helium") { Object.assign(state, { mode: "microscopic", amount: 0.1, baseVolume: 10, baseTemperature: 300, species: "helium", progress: 0, running: true }); } rebuildParticles(); renderUi(); }));
  refs.playButton.addEventListener("click", () => { if (state.mode !== "microscopic" && state.progress >= 1) state.progress = 0; state.running = true; renderUi(); }); refs.pauseButton.addEventListener("click", () => { state.running = false; renderUi(); }); refs.keyButton.addEventListener("click", () => { if (state.mode === "microscopic") { Object.assign(state, { amount: 0.1, baseVolume: 10, baseTemperature: 300, species: "nitrogen", progress: 0, running: false }); rebuildParticles(); } else { state.progress = 1; state.running = false; } renderUi(); }); refs.resetButton.addEventListener("click", reset);
  [[refs.showVelocityToggle, "showVelocity"], [refs.showTrailsToggle, "showTrails"], [refs.showCollisionsToggle, "showCollisions"], [refs.showPressureToggle, "showPressure"], [refs.showSampleToggle, "showSample"]].forEach(([input, key]) => input.addEventListener("change", () => { state[key] = input.checked; renderUi(); }));
  refs.guideButton.addEventListener("click", () => refs.guideDialog.showModal()); refs.stepButton.addEventListener("click", () => { state.guideStep = (state.guideStep + 1) % guide.length; renderUi(); }); refs.focusButton.addEventListener("click", () => { const active = document.body.classList.toggle("focus-mode"); refs.focusButton.setAttribute("aria-pressed", String(active)); }); refs.fullscreenButton.addEventListener("click", () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());
  refs.canvas.addEventListener("pointerdown", (event) => { state.dragging = true; refs.canvas.setPointerCapture(event.pointerId); setProgressFromPointer(event); }); refs.canvas.addEventListener("pointermove", (event) => { if (state.dragging) setProgressFromPointer(event); }); refs.canvas.addEventListener("pointerup", (event) => { state.dragging = false; if (refs.canvas.hasPointerCapture(event.pointerId)) refs.canvas.releasePointerCapture(event.pointerId); }); refs.canvas.addEventListener("pointercancel", () => { state.dragging = false; }); window.addEventListener("resize", renderUi);
  let lastFrame = performance.now(); function frame(now) { const delta = Math.min(0.04, (now - lastFrame) / 1000); lastFrame = now; const current = sample(); if (state.running) { state.elapsed += delta * state.playbackRate; if (state.mode !== "microscopic") { state.progress += delta * state.playbackRate / 3.8; if (state.progress >= 1) { state.progress = 1; state.running = false; } } updateParticles(delta, current); frameCount += 1; drawGasScene(); if (frameCount % 3 === 0) renderUi(); } requestAnimationFrame(frame); }
  window.idealGasLab = { solve: (input = {}) => model.processState({ ...state, ...input }, input.progress ?? state.progress), getState: () => ({ ...state }), setMode, setState: (next = {}) => { Object.assign(state, next); if ("amount" in next) rebuildParticles(); renderUi(); }, reset };
  rebuildParticles(); renderUi(); requestAnimationFrame(frame);
})();
