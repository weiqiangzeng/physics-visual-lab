(function () {
  const model = window.MatterWaveModel;
  if (!model) throw new Error("MatterWaveModel is required");

  const refs = {
    canvas: document.getElementById("matterCanvas"),
    relationChart: document.getElementById("relationChart"),
    detectorChart: document.getElementById("detectorChart"),
    particleSelect: document.getElementById("particleSelect"),
    particleNote: document.getElementById("particleNote"),
    speedSection: document.getElementById("speedSection"),
    speedInput: document.getElementById("speedInput"),
    speedValue: document.getElementById("speedValue"),
    voltageSection: document.getElementById("voltageSection"),
    voltageInput: document.getElementById("voltageInput"),
    voltageValue: document.getElementById("voltageValue"),
    crystalSection: document.getElementById("crystalSection"),
    planeSelect: document.getElementById("planeSelect"),
    distanceInput: document.getElementById("distanceInput"),
    distanceValue: document.getElementById("distanceValue"),
    countSection: document.getElementById("countSection"),
    countInput: document.getElementById("countInput"),
    countValue: document.getElementById("countValue"),
    countNote: document.getElementById("countNote"),
    progressInput: document.getElementById("progressInput"),
    progressValue: document.getElementById("progressValue"),
    particleMetric: document.getElementById("particleMetric"),
    speedMetric: document.getElementById("speedMetric"),
    momentumMetric: document.getElementById("momentumMetric"),
    wavelengthMetric: document.getElementById("wavelengthMetric"),
    kineticMetric: document.getElementById("kineticMetric"),
    ringMetric: document.getElementById("ringMetric"),
    waveNature: document.getElementById("waveNature"),
    waveExplanation: document.getElementById("waveExplanation"),
    modeTitle: document.getElementById("modeTitle"),
    modeGoal: document.getElementById("modeGoal"),
    stateBadge: document.getElementById("stateBadge"),
    stageHint: document.getElementById("stageHint"),
    relationChartTitle: document.getElementById("relationChartTitle"),
    relationChartStatus: document.getElementById("relationChartStatus"),
    detectorChartTitle: document.getElementById("detectorChartTitle"),
    detectorChartStatus: document.getElementById("detectorChartStatus"),
    stepIndex: document.getElementById("stepIndex"),
    stepTitle: document.getElementById("stepTitle"),
    stepPrompt: document.getElementById("stepPrompt"),
    formulaReadout: document.getElementById("formulaReadout"),
    playButton: document.getElementById("playButton"),
    pauseButton: document.getElementById("pauseButton"),
    keyButton: document.getElementById("keyButton"),
    resetButton: document.getElementById("resetButton"),
    guideButton: document.getElementById("guideButton"),
    stepButton: document.getElementById("stepButton"),
    focusButton: document.getElementById("focusButton"),
    fullscreenButton: document.getElementById("fullscreenButton"),
    guideDialog: document.getElementById("guideDialog"),
    showWaveToggle: document.getElementById("showWaveToggle"),
    showParticleToggle: document.getElementById("showParticleToggle"),
    showCrystalToggle: document.getElementById("showCrystalToggle"),
    showBraggToggle: document.getElementById("showBraggToggle"),
    showTheoryToggle: document.getElementById("showTheoryToggle"),
    sceneTabs: Array.from(document.querySelectorAll(".scene-tab[data-mode]")),
    routeSteps: Array.from(document.querySelectorAll(".route-step")),
    presetButtons: Array.from(document.querySelectorAll("[data-preset]")),
    rateButtons: Array.from(document.querySelectorAll("[data-rate]"))
  };

  const context = refs.canvas.getContext("2d");
  const relationContext = refs.relationChart.getContext("2d");
  const detectorContext = refs.detectorChart.getContext("2d");
  const COLORS = {
    cyan: "#64c7d9",
    green: "#79d992",
    amber: "#f2b84b",
    violet: "#b58ce5",
    red: "#ff7468",
    text: "#a6b0a9",
    muted: "#717b75",
    cream: "#eef1e6"
  };
  const MODES = {
    scale: {
      title: "德布罗意尺度",
      goal: "所有运动粒子都可以关联一个由动量决定的波长",
      hint: "拖动画布或速度滑杆，观察 p 增大时 λ 缩短",
      key: "◎ 同速对照"
    },
    acceleration: {
      title: "电子加速",
      goal: "电子获得的动能由加速电压决定，电压越高物质波波长越短",
      hint: "把电压提高到 4 倍，核对波长是否变为一半",
      key: "◎ 4 kV 电子"
    },
    diffraction: {
      title: "晶体衍射",
      goal: "电子波长与晶格间距同量级时，在特定角度形成衍射环",
      hint: "切换两组石墨晶面，比较散射角和环半径",
      key: "◎ 切换晶面"
    },
    accumulation: {
      title: "单粒子累积",
      goal: "每个电子留下局域落点，大量事件形成稳定衍射环",
      hint: "先观察少量随机点，再连续累积到完整衍射环",
      key: "◎ +100"
    }
  };
  const GUIDE = [
    { title: "先比较波长尺度", prompt: "为什么棒球满足 λ=h/p，却几乎不可能观察到衍射？" },
    { title: "再连接晶格间距", prompt: "电子波长接近晶格间距时，哪些方向的散射振幅会相长？" },
    { title: "最后累积单粒子", prompt: "单个落点局域而随机，为什么大量落点仍能形成稳定的环？" }
  ];
  const state = {
    mode: "scale",
    particle: "electron",
    speedExponent: Math.log10(2e6),
    voltage: 4000,
    latticeSpacingNm: 0.213,
    screenDistanceM: 0.135,
    totalEvents: 1200,
    seed: 314159,
    progress: 0,
    running: false,
    playbackRate: 0.5,
    guideStep: 0,
    dragging: false,
    showWave: true,
    showParticle: true,
    showCrystal: true,
    showBragg: true,
    showTheory: true
  };
  let hitCache = { key: "", hits: [] };
  let frameCounter = 0;

  function clamp(value, min, max) { return Math.min(max, Math.max(min, Number(value))); }
  function fixed(value, digits = 3) { return Number(value).toFixed(digits).replace("-", "−"); }
  function superscript(value) {
    const map = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
    return String(value).split("").map((character) => map[character] || character).join("");
  }
  function scientific(value, digits = 2, unit = "") {
    if (!Number.isFinite(value)) return "—";
    if (value === 0) return `0${unit ? ` ${unit}` : ""}`;
    const exponent = Math.floor(Math.log10(Math.abs(value)));
    const mantissa = value / (10 ** exponent);
    return `${fixed(mantissa, digits)}×10${superscript(exponent)}${unit ? ` ${unit}` : ""}`;
  }
  function wavelengthText(wavelengthM) {
    if (!Number.isFinite(wavelengthM)) return "—";
    if (wavelengthM >= 1e-6) return `${fixed(wavelengthM * 1e6, 3)} μm`;
    if (wavelengthM >= 1e-9) return `${fixed(wavelengthM * 1e9, 3)} nm`;
    if (wavelengthM >= 1e-12) return `${fixed(wavelengthM * 1e12, 3)} pm`;
    return scientific(wavelengthM, 2, "m");
  }
  function energyText(kineticEnergyJ) {
    const energyEv = kineticEnergyJ / model.E_CHARGE;
    if (energyEv < 1e6) return `${fixed(energyEv, energyEv >= 100 ? 0 : 2)} eV`;
    return scientific(kineticEnergyJ, 2, "J");
  }
  function speedText(speedMs) { return scientific(speedMs, 2, "m/s"); }
  function currentSpeed() { return 10 ** state.speedExponent; }
  function scaleState() { return model.deBroglieState({ particle: state.particle, speedMs: currentSpeed() }); }
  function beamState() { return model.electronState(state.voltage); }
  function selectedRing() {
    return model.braggRing({ voltage: state.voltage, latticeSpacingNm: state.latticeSpacingNm, screenDistanceM: state.screenDistanceM });
  }
  function allRings() { return model.graphiteRings({ voltage: state.voltage, screenDistanceM: state.screenDistanceM }); }
  function hitKey() { return [state.voltage, state.screenDistanceM, state.totalEvents, state.seed].join(":"); }
  function allHits() {
    const key = hitKey();
    if (hitCache.key !== key) hitCache = { key, hits: model.generateHits(state.totalEvents, { voltage: state.voltage, screenDistanceM: state.screenDistanceM }, state.seed) };
    return hitCache.hits;
  }
  function visibleHitCount() { return Math.min(state.totalEvents, Math.floor(state.totalEvents * state.progress + 1e-9)); }

  function canvasSize(canvas, canvasContext, minimumHeight = 180) {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(280, Math.round(rect.width));
    const height = Math.max(minimumHeight, Math.round(rect.height));
    if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
      canvas.width = width * ratio;
      canvas.height = height * ratio;
    }
    canvasContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { width, height };
  }
  function line(canvasContext, x1, y1, x2, y2, color, width = 1, dash = []) {
    canvasContext.save();
    canvasContext.strokeStyle = color;
    canvasContext.lineWidth = width;
    canvasContext.setLineDash(dash);
    canvasContext.beginPath();
    canvasContext.moveTo(x1, y1);
    canvasContext.lineTo(x2, y2);
    canvasContext.stroke();
    canvasContext.restore();
  }
  function label(canvasContext, value, x, y, color = COLORS.text, size = 10, align = "left", weight = 500) {
    canvasContext.fillStyle = color;
    canvasContext.font = `${weight} ${size}px ui-sans-serif, system-ui`;
    canvasContext.textAlign = align;
    canvasContext.fillText(value, x, y);
  }
  function arrow(canvasContext, x1, y1, x2, y2, color, width = 1.7) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    line(canvasContext, x1, y1, x2, y2, color, width);
    canvasContext.fillStyle = color;
    canvasContext.beginPath();
    canvasContext.moveTo(x2, y2);
    canvasContext.lineTo(x2 - 7 * Math.cos(angle - 0.48), y2 - 7 * Math.sin(angle - 0.48));
    canvasContext.lineTo(x2 - 7 * Math.cos(angle + 0.48), y2 - 7 * Math.sin(angle + 0.48));
    canvasContext.fill();
  }
  function drawBackground(width, height) {
    context.fillStyle = "#090d0f";
    context.fillRect(0, 0, width, height);
    for (let x = 0; x < width; x += 36) line(context, x, 0, x, height, "rgba(238,241,230,.035)");
    for (let y = 0; y < height; y += 36) line(context, 0, y, width, y, "rgba(238,241,230,.035)");
  }
  function wave(canvasContext, x1, y, x2, amplitude, cycles, color, phase = 0, alpha = 1) {
    canvasContext.save();
    canvasContext.globalAlpha = alpha;
    canvasContext.strokeStyle = color;
    canvasContext.lineWidth = 1.8;
    canvasContext.beginPath();
    const steps = 100;
    for (let index = 0; index <= steps; index += 1) {
      const ratio = index / steps;
      const x = x1 + (x2 - x1) * ratio;
      const yPosition = y + amplitude * Math.sin(ratio * cycles * Math.PI * 2 + phase);
      if (index) canvasContext.lineTo(x, yPosition); else canvasContext.moveTo(x, yPosition);
    }
    canvasContext.stroke();
    canvasContext.restore();
  }
  function particleDot(canvasContext, x, y, color = COLORS.green, radius = 4) {
    canvasContext.fillStyle = color;
    canvasContext.beginPath();
    canvasContext.arc(x, y, radius, 0, Math.PI * 2);
    canvasContext.fill();
  }

  function drawScaleScene(width, height) {
    const keys = ["electron", "proton", "neutron", "baseball"];
    const top = 42;
    const laneHeight = (height - 84) / keys.length;
    keys.forEach((key, index) => {
      const selected = key === state.particle;
      const particleDefinition = model.particle(key);
      const speedMs = selected ? currentSpeed() : particleDefinition.defaultSpeed;
      const waveState = model.deBroglieState({ particle: key, speedMs });
      const y = top + laneHeight * (index + 0.5);
      const x1 = width * 0.19;
      const x2 = width * 0.92;
      const logarithmicDensity = clamp((-Math.log10(waveState.wavelengthM) - 7) / 2.4, 2, 19);
      line(context, 18, y + laneHeight * 0.43, width - 18, y + laneHeight * 0.43, "rgba(238,241,230,.06)");
      label(context, particleDefinition.symbol, 30, y + 4, selected ? COLORS.green : COLORS.text, 12, "left", 800);
      label(context, speedText(speedMs), 58, y + 4, COLORS.muted, 8);
      if (state.showWave) wave(context, x1, y, x2, 6, logarithmicDensity, selected ? COLORS.violet : "rgba(181,140,229,.42)", performance.now() / 900, selected ? 1 : 0.6);
      if (state.showParticle) particleDot(context, x1 + (x2 - x1) * (0.12 + 0.7 * state.progress), y, selected ? COLORS.green : COLORS.cyan, selected ? 5 : 3.5);
      label(context, wavelengthText(waveState.wavelengthM), width - 20, y + 4, selected ? COLORS.amber : COLORS.muted, 9, "right", selected ? 700 : 500);
    });
    label(context, "波纹密度按对数映射，仅用于跨尺度比较", width - 16, height - 14, COLORS.muted, 9, "right");
  }

  function drawAccelerationScene(width, height) {
    const beam = beamState();
    const y = height * 0.5;
    const gunX = width * 0.12;
    const anodeX = width * 0.72;
    const screenX = width * 0.88;
    context.fillStyle = "rgba(100,199,217,.08)";
    context.fillRect(gunX, y - 58, anodeX - gunX, 116);
    line(context, gunX, y - 66, gunX, y + 66, COLORS.muted, 5);
    line(context, anodeX, y - 66, anodeX, y + 66, COLORS.cyan, 5);
    line(context, screenX, y - 86, screenX, y + 86, COLORS.green, 4);
    label(context, "阴极 −", gunX, y - 78, COLORS.text, 9, "center");
    label(context, "阳极 +", anodeX, y - 78, COLORS.cyan, 9, "center");
    label(context, "探测屏", screenX, y - 98, COLORS.green, 9, "center");
    if (state.showBragg) arrow(context, gunX + 22, y + 86, anodeX - 22, y + 86, COLORS.cyan, 1.5);
    label(context, `电势差 ${fixed(state.voltage, 0)} V`, (gunX + anodeX) / 2, y + 105, COLORS.cyan, 9, "center", 700);
    if (state.showWave) {
      const cycles = 4 + Math.sqrt(state.voltage / 150) * 2.3;
      wave(context, gunX + 10, y, screenX - 12, 8, cycles, COLORS.violet, performance.now() / 700);
    }
    const particleX = gunX + (screenX - gunX) * state.progress;
    if (state.showParticle) particleDot(context, particleX, y, COLORS.green, 5);
    label(context, `eU = ${fixed(beam.kineticEnergyEv, 0)} eV`, width * 0.5, 26, COLORS.amber, 10, "center", 700);
    label(context, `λ = ${wavelengthText(beam.wavelengthM)}`, width * 0.5, 43, COLORS.violet, 10, "center", 700);
    label(context, "波纹间距按可见性缩放，数值由 λ=h/√(2meU) 计算", width - 16, height - 14, COLORS.muted, 9, "right");
  }

  function drawCrystal(context2d, x, centerY, height) {
    context2d.save();
    context2d.strokeStyle = "rgba(242,184,75,.62)";
    context2d.lineWidth = 1;
    for (let row = -4; row <= 4; row += 1) {
      const y = centerY + row * height / 10;
      line(context2d, x - 16, y, x + 16, y, "rgba(242,184,75,.5)");
      for (let column = -2; column <= 2; column += 1) particleDot(context2d, x + column * 8, y, COLORS.amber, 1.8);
    }
    context2d.restore();
  }

  function drawDiffractionScene(width, height) {
    const rings = allRings();
    const selected = selectedRing();
    const centerY = height * 0.5;
    const gunX = width * 0.08;
    const crystalX = width * 0.42;
    const screenX = width * 0.78;
    const insetX = width * 0.9;
    const maxRing = rings[1].radiusM * 1.24;
    const radialScale = Math.min(height * 0.33, width * 0.16) / maxRing;
    line(context, gunX, centerY, crystalX, centerY, COLORS.cyan, 2);
    context.fillStyle = "rgba(100,199,217,.16)";
    context.fillRect(gunX - 10, centerY - 23, 20, 46);
    label(context, "电子枪", gunX, centerY - 34, COLORS.cyan, 9, "center");
    if (state.showWave) wave(context, gunX, centerY, crystalX, 5, 9 + Math.sqrt(state.voltage / 1000), COLORS.violet, performance.now() / 800);
    if (state.showCrystal) drawCrystal(context, crystalX, centerY, height * 0.5);
    label(context, "多晶石墨", crystalX, centerY - height * 0.31, COLORS.amber, 9, "center");
    line(context, screenX, centerY - height * 0.36, screenX, centerY + height * 0.36, COLORS.green, 3);
    label(context, "荧光屏", screenX, centerY - height * 0.41, COLORS.green, 9, "center");
    if (state.showBragg) {
      rings.forEach((ring, index) => {
        const radiusPx = ring.radiusM * radialScale;
        const color = Math.abs(ring.latticeSpacingNm - state.latticeSpacingNm) < 0.001 ? COLORS.amber : "rgba(100,199,217,.58)";
        line(context, crystalX, centerY, screenX, centerY - radiusPx, color, index ? 1.2 : 1.8);
        line(context, crystalX, centerY, screenX, centerY + radiusPx, color, index ? 1.2 : 1.8);
        particleDot(context, screenX, centerY - radiusPx, color, 2.8);
        particleDot(context, screenX, centerY + radiusPx, color, 2.8);
      });
      label(context, `2θ = ${fixed(selected.scatteringAngleDeg, 2)}°`, (crystalX + screenX) / 2, centerY - selected.radiusM * radialScale - 10, COLORS.amber, 9, "center");
    }
    context.fillStyle = "rgba(25,29,26,.88)";
    context.beginPath();
    context.arc(insetX, centerY, Math.min(55, height * 0.2), 0, Math.PI * 2);
    context.fill();
    if (state.showTheory) {
      const frontScale = Math.min(48, height * 0.18) / maxRing;
      rings.forEach((ring, index) => {
        context.strokeStyle = index ? COLORS.cyan : COLORS.amber;
        context.lineWidth = Math.abs(ring.latticeSpacingNm - state.latticeSpacingNm) < 0.001 ? 2.4 : 1.2;
        context.beginPath();
        context.arc(insetX, centerY, ring.radiusM * frontScale, 0, Math.PI * 2);
        context.stroke();
      });
    }
    label(context, `d=${fixed(state.latticeSpacingNm, 3)} nm`, width - 14, height - 30, COLORS.amber, 9, "right");
    label(context, `R=${fixed(selected.radiusCm, 2)} cm`, width - 14, height - 14, COLORS.text, 9, "right");
  }

  function drawAccumulationScene(width, height) {
    const rings = allRings();
    const hits = allHits();
    const visibleCount = visibleHitCount();
    const centerX = width * 0.5;
    const centerY = height * 0.5;
    const screenRadius = Math.min(width * 0.37, height * 0.42);
    const physicalRadius = rings[1].radiusM * 1.32;
    const scale = screenRadius / physicalRadius;
    context.fillStyle = "rgba(25,29,26,.9)";
    context.beginPath();
    context.arc(centerX, centerY, screenRadius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(238,241,230,.18)";
    context.lineWidth = 1;
    context.stroke();
    if (state.showTheory) {
      rings.forEach((ring, index) => {
        context.strokeStyle = index ? "rgba(100,199,217,.45)" : "rgba(242,184,75,.55)";
        context.lineWidth = 1;
        context.setLineDash([4, 5]);
        context.beginPath();
        context.arc(centerX, centerY, ring.radiusM * scale, 0, Math.PI * 2);
        context.stroke();
      });
      context.setLineDash([]);
    }
    if (state.showParticle) {
      for (let index = 0; index < visibleCount; index += 1) {
        const hit = hits[index];
        const alpha = index > visibleCount - 12 ? 1 : 0.48;
        context.fillStyle = hit.family === "outer" ? `rgba(100,199,217,${alpha})` : hit.family === "inner" ? `rgba(242,184,75,${alpha})` : `rgba(121,217,146,${alpha})`;
        context.fillRect(centerX + hit.xM * scale - 1, centerY + hit.yM * scale - 1, 2, 2);
      }
      if (visibleCount) {
        const lastHit = hits[visibleCount - 1];
        context.strokeStyle = COLORS.green;
        context.lineWidth = 1;
        context.beginPath();
        context.arc(centerX + lastHit.xM * scale, centerY + lastHit.yM * scale, 5, 0, Math.PI * 2);
        context.stroke();
      }
    }
    label(context, `${visibleCount} / ${state.totalEvents} 个电子落点`, centerX, 22, COLORS.green, 10, "center", 700);
    label(context, "单次位置随机 · 大量事件呈现稳定概率分布", centerX, height - 14, COLORS.muted, 9, "center");
  }

  function drawScene() {
    const { width, height } = canvasSize(refs.canvas, context, 260);
    drawBackground(width, height);
    if (state.mode === "scale") drawScaleScene(width, height);
    if (state.mode === "acceleration") drawAccelerationScene(width, height);
    if (state.mode === "diffraction") drawDiffractionScene(width, height);
    if (state.mode === "accumulation") drawAccumulationScene(width, height);
  }

  function plotFrame(canvasContext, canvas, xMin, xMax, yMin, yMax, xLabel, yLabel, xDigits = 0, yDigits = 0, showXTickLabels = true) {
    const { width, height } = canvasSize(canvas, canvasContext);
    canvasContext.fillStyle = "#111512";
    canvasContext.fillRect(0, 0, width, height);
    const padding = { left: 48, right: 18, top: 20, bottom: 34 };
    const x = (value) => padding.left + (value - xMin) / (xMax - xMin) * (width - padding.left - padding.right);
    const y = (value) => height - padding.bottom - (value - yMin) / (yMax - yMin) * (height - padding.top - padding.bottom);
    line(canvasContext, padding.left, padding.top, padding.left, height - padding.bottom, "rgba(238,241,230,.28)");
    line(canvasContext, padding.left, height - padding.bottom, width - padding.right, height - padding.bottom, "rgba(238,241,230,.28)");
    for (let index = 0; index <= 4; index += 1) {
      const xValue = xMin + (xMax - xMin) * index / 4;
      const yValue = yMin + (yMax - yMin) * index / 4;
      line(canvasContext, x(xValue), padding.top, x(xValue), height - padding.bottom, "rgba(238,241,230,.05)");
      line(canvasContext, padding.left, y(yValue), width - padding.right, y(yValue), "rgba(238,241,230,.05)");
      if (showXTickLabels) label(canvasContext, fixed(xValue, xDigits), x(xValue), height - 15, COLORS.muted, 8, "center");
      label(canvasContext, fixed(yValue, yDigits), padding.left - 7, y(yValue) + 3, COLORS.muted, 8, "right");
    }
    label(canvasContext, xLabel, width - padding.right, height - 4, COLORS.muted, 8, "right");
    label(canvasContext, yLabel, 5, 12, COLORS.muted, 8);
    return { width, height, x, y, padding };
  }
  function strokeSeries(canvasContext, points, xMap, yMap, color, width = 1.8, dash = []) {
    canvasContext.save();
    canvasContext.strokeStyle = color;
    canvasContext.lineWidth = width;
    canvasContext.setLineDash(dash);
    canvasContext.beginPath();
    points.forEach((point, index) => {
      if (index) canvasContext.lineTo(xMap(point.x), yMap(point.y)); else canvasContext.moveTo(xMap(point.x), yMap(point.y));
    });
    canvasContext.stroke();
    canvasContext.restore();
  }

  function drawScaleRelation() {
    const current = scaleState();
    const frame = plotFrame(relationContext, refs.relationChart, -25, 1, -35, -8, "log₁₀ p", "log₁₀ λ", 0, 0);
    const points = Array.from({ length: 120 }, (_, index) => {
      const logP = -25 + 26 * index / 119;
      return { x: logP, y: Math.log10(model.H) - logP };
    });
    strokeSeries(relationContext, points, frame.x, frame.y, COLORS.violet, 2);
    particleDot(relationContext, frame.x(Math.log10(current.momentum)), frame.y(Math.log10(current.wavelengthM)), COLORS.green, 4);
  }
  function drawAccelerationRelation() {
    const current = beamState();
    const maximumPm = model.electronState(50).wavelengthM * 1e12;
    const frame = plotFrame(relationContext, refs.relationChart, 0, 6000, 0, maximumPm * 1.06, "U / V", "λ / pm", 0, 0);
    const points = Array.from({ length: 120 }, (_, index) => {
      const voltage = 50 + 5950 * index / 119;
      return { x: voltage, y: model.electronState(voltage).wavelengthM * 1e12 };
    });
    strokeSeries(relationContext, points, frame.x, frame.y, COLORS.cyan, 2);
    particleDot(relationContext, frame.x(state.voltage), frame.y(current.wavelengthM * 1e12), COLORS.green, 4);
  }
  function drawRingVoltageRelation() {
    const rings = allRings();
    const frame = plotFrame(relationContext, refs.relationChart, 500, 6000, 0, 6.5, "U / V", "R / cm", 0, 1);
    model.GRAPHITE_SPACINGS_NM.forEach((spacing, seriesIndex) => {
      const points = Array.from({ length: 100 }, (_, index) => {
        const voltage = 500 + 5500 * index / 99;
        const ring = model.braggRing({ voltage, latticeSpacingNm: spacing, screenDistanceM: state.screenDistanceM });
        return { x: voltage, y: ring.radiusCm };
      });
      strokeSeries(relationContext, points, frame.x, frame.y, seriesIndex ? COLORS.cyan : COLORS.amber, 1.8);
      particleDot(relationContext, frame.x(state.voltage), frame.y(rings[seriesIndex].radiusCm), seriesIndex ? COLORS.cyan : COLORS.amber, 3.5);
    });
  }
  function drawRelationChart() {
    if (state.mode === "scale") drawScaleRelation();
    else if (state.mode === "acceleration") drawAccelerationRelation();
    else drawRingVoltageRelation();
  }

  function drawScaleComparison() {
    const selectedSpeed = currentSpeed();
    const keys = ["electron", "proton", "neutron", "baseball"];
    const values = keys.map((key) => {
      const definition = model.particle(key);
      const speedMs = key === state.particle ? selectedSpeed : definition.defaultSpeed;
      const result = model.deBroglieState({ particle: key, speedMs });
      return { key, label: definition.symbol, logLambda: Math.log10(result.wavelengthM) };
    });
    const frame = plotFrame(detectorContext, refs.detectorChart, -0.5, 3.5, -36, -8, "对象", "log₁₀ λ/m", 0, 0, false);
    values.forEach((value, index) => {
      const x = frame.x(index);
      const y = frame.y(value.logLambda);
      detectorContext.fillStyle = value.key === state.particle ? COLORS.green : "rgba(100,199,217,.45)";
      detectorContext.fillRect(x - 16, y, 32, frame.y(-36) - y);
      label(detectorContext, value.label, x, frame.height - 15, value.key === state.particle ? COLORS.green : COLORS.muted, 8, "center", 700);
    });
  }
  function drawMomentumVoltage() {
    const current = beamState();
    const frame = plotFrame(detectorContext, refs.detectorChart, 0, Math.sqrt(6000), 0, 4.3, "√U / √V", "p / 10⁻²³", 0, 1);
    const points = Array.from({ length: 100 }, (_, index) => {
      const voltage = 6000 * index / 99;
      return { x: Math.sqrt(voltage), y: model.electronState(voltage).momentum / 1e-23 };
    });
    strokeSeries(detectorContext, points, frame.x, frame.y, COLORS.amber, 2);
    particleDot(detectorContext, frame.x(Math.sqrt(state.voltage)), frame.y(current.momentum / 1e-23), COLORS.green, 4);
  }
  function drawDetectorProfile() {
    const rings = allRings();
    const maxRadiusCm = rings[1].radiusCm * 1.28;
    const frame = plotFrame(detectorContext, refs.detectorChart, 0, maxRadiusCm, 0, 1, "r / cm", "相对频数", 1, 1);
    const profile = model.intensityProfile({ voltage: state.voltage, screenDistanceM: state.screenDistanceM }, 180).map((point) => ({ x: point.radiusCm, y: point.intensity }));
    if (state.showTheory) strokeSeries(detectorContext, profile, frame.x, frame.y, COLORS.green, 2);
    if (state.mode === "accumulation") {
      const visible = allHits().slice(0, visibleHitCount());
      const binCount = 42;
      const bins = Array(binCount).fill(0);
      visible.forEach((hit) => {
        const index = Math.min(binCount - 1, Math.floor(hit.radiusM * 100 / maxRadiusCm * binCount));
        bins[index] += 1;
      });
      const maximum = Math.max(1, ...bins);
      const barWidth = (frame.x(maxRadiusCm) - frame.x(0)) / binCount;
      bins.forEach((count, index) => {
        detectorContext.fillStyle = "rgba(100,199,217,.38)";
        detectorContext.fillRect(frame.x(maxRadiusCm * index / binCount), frame.y(count / maximum), Math.max(1, barWidth - 1), frame.y(0) - frame.y(count / maximum));
      });
      if (state.showTheory) strokeSeries(detectorContext, profile, frame.x, frame.y, COLORS.green, 2);
    }
    rings.forEach((ring, index) => line(detectorContext, frame.x(ring.radiusCm), frame.y(0), frame.x(ring.radiusCm), frame.y(0.92), index ? COLORS.cyan : COLORS.amber, 1, [4, 3]));
  }
  function drawDetectorChart() {
    if (state.mode === "scale") drawScaleComparison();
    else if (state.mode === "acceleration") drawMomentumVoltage();
    else drawDetectorProfile();
  }
  function drawCharts() { drawRelationChart(); drawDetectorChart(); }

  function status() {
    if (state.mode === "scale") {
      const result = scaleState();
      return {
        badge: `${result.particle.label} · ${wavelengthText(result.wavelengthM)}`,
        className: "scale",
        nature: "p 越大，λ 越短",
        explanation: "物质波波长描述量子态的空间尺度，不是粒子外部的经典机械波"
      };
    }
    if (state.mode === "acceleration") {
      const beam = beamState();
      return {
        badge: `${fixed(state.voltage, 0)} V · ${wavelengthText(beam.wavelengthM)}`,
        className: "beam",
        nature: "λ ∝ 1/√U",
        explanation: `电子获得 ${fixed(beam.kineticEnergyEv, 0)} eV 动能，动量增大使波长缩短`
      };
    }
    if (state.mode === "diffraction") {
      const ring = selectedRing();
      return {
        badge: `d=${fixed(ring.latticeSpacingNm, 3)} nm · R=${fixed(ring.radiusCm, 2)} cm`,
        className: "diffraction",
        nature: "满足一阶 Bragg 相长条件",
        explanation: `θ=${fixed(ring.braggAngleDeg, 2)}°，屏上散射角为 2θ=${fixed(ring.scatteringAngleDeg, 2)}°`
      };
    }
    return {
      badge: `${visibleHitCount()} 个离散落点`,
      className: "statistical",
      nature: "单次局域 · 整体呈波动分布",
      explanation: "模型只给出落点概率；环宽和相对强度为教学采样，环位置由 Bragg 几何决定"
    };
  }

  function rangeProgress(input) {
    const minimum = Number(input.min);
    const maximum = Number(input.max);
    input.style.setProperty("--range-progress", `${(Number(input.value) - minimum) / (maximum - minimum) * 100}%`);
  }
  function render() {
    const mode = MODES[state.mode];
    const scale = scaleState();
    const beam = beamState();
    const ring = selectedRing();
    const current = state.mode === "scale" ? scale : beam;
    const currentStatus = status();
    const diffractionMode = state.mode === "diffraction" || state.mode === "accumulation";

    refs.particleSelect.value = state.particle;
    refs.particleSelect.disabled = state.mode !== "scale";
    refs.particleNote.textContent = state.mode === "scale" ? "改变速度，直接核对 λ=h/p" : "电子衍射场景固定使用电子束";
    refs.speedSection.hidden = state.mode !== "scale";
    refs.voltageSection.hidden = state.mode === "scale";
    refs.crystalSection.hidden = !diffractionMode;
    refs.countSection.hidden = state.mode !== "accumulation";
    refs.speedInput.value = state.speedExponent;
    refs.speedValue.textContent = speedText(currentSpeed());
    refs.voltageInput.value = state.voltage;
    refs.voltageValue.textContent = `${fixed(state.voltage, 0)} V`;
    refs.planeSelect.value = String(state.latticeSpacingNm);
    refs.distanceInput.value = state.screenDistanceM;
    refs.distanceValue.textContent = `${fixed(state.screenDistanceM * 100, 1)} cm`;
    refs.countInput.value = state.totalEvents;
    refs.countValue.textContent = String(state.totalEvents);
    refs.countNote.textContent = `当前已记录 ${visibleHitCount()} 个离散落点`;
    refs.progressInput.disabled = state.mode === "scale";
    refs.progressInput.value = state.progress;
    refs.progressValue.textContent = `${state.running ? "运行中" : "已暂停"} · ${fixed(state.progress * 100, 0)}%`;

    refs.particleMetric.textContent = state.mode === "scale" ? `${current.particle.label} ${current.particle.symbol}` : "电子 e−";
    refs.speedMetric.textContent = speedText(current.speedMs);
    refs.momentumMetric.textContent = scientific(current.momentum, 2, "kg·m/s");
    refs.wavelengthMetric.textContent = wavelengthText(current.wavelengthM);
    refs.kineticMetric.textContent = energyText(current.kineticEnergyJ);
    refs.ringMetric.textContent = diffractionMode ? `${fixed(ring.radiusCm, 2)} cm` : "—";
    refs.waveNature.textContent = currentStatus.nature;
    refs.waveExplanation.textContent = currentStatus.explanation;
    refs.modeTitle.textContent = mode.title;
    refs.modeGoal.textContent = mode.goal;
    refs.stateBadge.textContent = currentStatus.badge;
    refs.stateBadge.className = `state-badge is-${currentStatus.className}`;
    refs.stageHint.textContent = mode.hint;

    if (state.mode === "scale") {
      refs.relationChartTitle.textContent = "λ-p 对数关系";
      refs.relationChartStatus.textContent = "斜率 −1";
      refs.detectorChartTitle.textContent = "粒子尺度对照";
      refs.detectorChartStatus.textContent = "跨越约 24 个数量级";
      refs.formulaReadout.textContent = `λ = h/p = ${wavelengthText(scale.wavelengthM)}`;
    } else if (state.mode === "acceleration") {
      refs.relationChartTitle.textContent = "电子波长-加速电压";
      refs.relationChartStatus.textContent = "λ ∝ U⁻¹ᐟ²";
      refs.detectorChartTitle.textContent = "动量-√U 关系";
      refs.detectorChartStatus.textContent = "p ∝ √U";
      refs.formulaReadout.textContent = `λ = h/√(2meU) = ${wavelengthText(beam.wavelengthM)}`;
    } else {
      refs.relationChartTitle.textContent = "衍射环半径-电压";
      refs.relationChartStatus.textContent = "电压升高，环半径减小";
      refs.detectorChartTitle.textContent = state.mode === "accumulation" ? "落点径向直方图" : "理论径向强度";
      refs.detectorChartStatus.textContent = state.mode === "accumulation" ? `${visibleHitCount()} 个事件` : "两组石墨晶面";
      refs.formulaReadout.textContent = `2d sinθ = λ · R = ${fixed(ring.radiusCm, 2)} cm`;
    }

    refs.stepIndex.textContent = String(state.guideStep + 1).padStart(2, "0");
    refs.stepTitle.textContent = GUIDE[state.guideStep].title;
    refs.stepPrompt.textContent = GUIDE[state.guideStep].prompt;
    refs.sceneTabs.forEach((button) => button.classList.toggle("is-active", button.dataset.mode === state.mode));
    refs.routeSteps.forEach((button, index) => button.classList.toggle("is-active", index === state.guideStep));
    refs.rateButtons.forEach((button) => button.classList.toggle("is-active", Number(button.dataset.rate) === state.playbackRate));
    refs.keyButton.textContent = mode.key;
    refs.playButton.textContent = state.running ? "▶ 运行中" : "▶ 运行";
    refs.playButton.setAttribute("aria-pressed", String(state.running));
    [refs.speedInput, refs.voltageInput, refs.distanceInput, refs.countInput, refs.progressInput].forEach(rangeProgress);
    drawScene();
    drawCharts();
  }

  function setMode(modeName) {
    if (!MODES[modeName]) return;
    state.mode = modeName;
    state.progress = modeName === "scale" ? 0.18 : 0;
    state.running = false;
    if (modeName !== "scale") state.particle = "electron";
    render();
  }
  function reset() {
    Object.assign(state, {
      mode: "scale",
      particle: "electron",
      speedExponent: Math.log10(2e6),
      voltage: 4000,
      latticeSpacingNm: 0.213,
      screenDistanceM: 0.135,
      totalEvents: 1200,
      seed: 314159,
      progress: 0,
      running: false,
      playbackRate: 0.5,
      guideStep: 0,
      dragging: false,
      showWave: true,
      showParticle: true,
      showCrystal: true,
      showBragg: true,
      showTheory: true
    });
    [refs.showWaveToggle, refs.showParticleToggle, refs.showCrystalToggle, refs.showBraggToggle, refs.showTheoryToggle].forEach((input) => { input.checked = true; });
    hitCache.key = "";
    render();
  }
  function resetProgress() {
    state.progress = 0;
    state.running = false;
  }

  function setState(next = {}) {
    if (!next || typeof next !== "object") return;
    if (typeof next.mode === "string" && MODES[next.mode]) state.mode = next.mode;
    if (typeof next.particle === "string" && model.PARTICLES[next.particle]) state.particle = next.particle;
    const ranges = { speedExponent: [0, 8], voltage: [50, 6000], latticeSpacingNm: [.04, .5], screenDistanceM: [.06, .3], totalEvents: [100, 3000], progress: [0, 1] };
    Object.entries(ranges).forEach(([key, [min, max]]) => { if (Number.isFinite(Number(next[key]))) state[key] = clamp(next[key], min, max); });
    if (Number.isFinite(Number(next.seed))) state.seed = Math.round(Number(next.seed));
    if ([.5, 1].includes(Number(next.playbackRate))) state.playbackRate = Number(next.playbackRate);
    if (Number.isFinite(Number(next.guideStep))) state.guideStep = clamp(Math.round(Number(next.guideStep)), 0, GUIDE.length - 1);
    ["showWave", "showParticle", "showCrystal", "showBragg", "showTheory"].forEach((key) => { if (typeof next[key] === "boolean") state[key] = next[key]; });
    state.running = false; state.dragging = false; hitCache.key = "";
    [[refs.showWaveToggle, "showWave"], [refs.showParticleToggle, "showParticle"], [refs.showCrystalToggle, "showCrystal"], [refs.showBraggToggle, "showBragg"], [refs.showTheoryToggle, "showTheory"]].forEach(([input, key]) => { input.checked = state[key]; });
    render();
  }

  refs.particleSelect.addEventListener("change", () => {
    state.particle = refs.particleSelect.value;
    state.speedExponent = Math.log10(model.particle(state.particle).defaultSpeed);
    resetProgress();
    render();
  });
  refs.speedInput.addEventListener("input", () => {
    state.speedExponent = Number(refs.speedInput.value);
    resetProgress();
    render();
  });
  refs.voltageInput.addEventListener("input", () => {
    state.voltage = Number(refs.voltageInput.value);
    resetProgress();
    hitCache.key = "";
    render();
  });
  refs.planeSelect.addEventListener("change", () => {
    state.latticeSpacingNm = Number(refs.planeSelect.value);
    render();
  });
  refs.distanceInput.addEventListener("input", () => {
    state.screenDistanceM = Number(refs.distanceInput.value);
    resetProgress();
    hitCache.key = "";
    render();
  });
  refs.countInput.addEventListener("input", () => {
    state.totalEvents = Number(refs.countInput.value);
    resetProgress();
    hitCache.key = "";
    render();
  });
  refs.progressInput.addEventListener("input", () => {
    state.progress = Number(refs.progressInput.value);
    state.running = false;
    render();
  });
  refs.sceneTabs.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
  refs.routeSteps.forEach((button, index) => button.addEventListener("click", () => { state.guideStep = index; render(); }));
  refs.rateButtons.forEach((button) => button.addEventListener("click", () => { state.playbackRate = Number(button.dataset.rate); render(); }));
  refs.presetButtons.forEach((button) => button.addEventListener("click", () => {
    const preset = button.dataset.preset;
    if (preset === "electron150") Object.assign(state, { mode: "acceleration", particle: "electron", voltage: 150, progress: 1 });
    if (preset === "tube4000") Object.assign(state, { mode: "diffraction", particle: "electron", voltage: 4000, latticeSpacingNm: 0.213, screenDistanceM: 0.135, progress: 1 });
    if (preset === "quarterVoltage") Object.assign(state, { mode: "acceleration", particle: "electron", voltage: 1000, progress: 1 });
    if (preset === "baseball") Object.assign(state, { mode: "scale", particle: "baseball", speedExponent: Math.log10(30), progress: 0.55 });
    state.running = false;
    hitCache.key = "";
    render();
  }));
  refs.playButton.addEventListener("click", () => {
    if (state.mode === "scale") return;
    if (state.progress >= 1) state.progress = 0;
    state.running = true;
    render();
  });
  refs.pauseButton.addEventListener("click", () => { state.running = false; render(); });
  refs.keyButton.addEventListener("click", () => {
    if (state.mode === "scale") {
      state.particle = state.particle === "electron" ? "proton" : "electron";
    } else if (state.mode === "acceleration") {
      state.voltage = 4000;
      state.progress = 1;
    } else if (state.mode === "diffraction") {
      state.latticeSpacingNm = state.latticeSpacingNm === 0.213 ? 0.123 : 0.213;
      state.progress = 1;
    } else {
      const currentCount = visibleHitCount();
      state.progress = Math.min(1, (currentCount + 100) / state.totalEvents);
    }
    state.running = false;
    render();
  });
  refs.resetButton.addEventListener("click", reset);
  [
    [refs.showWaveToggle, "showWave"],
    [refs.showParticleToggle, "showParticle"],
    [refs.showCrystalToggle, "showCrystal"],
    [refs.showBraggToggle, "showBragg"],
    [refs.showTheoryToggle, "showTheory"]
  ].forEach(([input, key]) => input.addEventListener("change", () => { state[key] = input.checked; render(); }));
  refs.guideButton.addEventListener("click", () => refs.guideDialog.showModal());
  refs.stepButton.addEventListener("click", () => { state.guideStep = (state.guideStep + 1) % GUIDE.length; render(); });
  refs.focusButton.addEventListener("click", () => {
    const active = document.body.classList.toggle("focus-mode");
    refs.focusButton.setAttribute("aria-pressed", String(active));
  });
  refs.fullscreenButton.addEventListener("click", () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());

  function pointerUpdate(event) {
    const rect = refs.canvas.getBoundingClientRect();
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    if (state.mode === "scale") state.speedExponent = ratio * 8;
    else if (state.mode === "acceleration" || state.mode === "diffraction") {
      state.voltage = Math.round((50 + ratio * 5950) / 10) * 10;
      hitCache.key = "";
      state.progress = 1;
    } else state.progress = ratio;
    state.running = false;
    render();
  }
  refs.canvas.addEventListener("pointerdown", (event) => {
    state.dragging = true;
    refs.canvas.setPointerCapture(event.pointerId);
    pointerUpdate(event);
  });
  refs.canvas.addEventListener("pointermove", (event) => { if (state.dragging) pointerUpdate(event); });
  refs.canvas.addEventListener("pointerup", (event) => {
    state.dragging = false;
    if (refs.canvas.hasPointerCapture(event.pointerId)) refs.canvas.releasePointerCapture(event.pointerId);
  });
  refs.canvas.addEventListener("pointercancel", () => { state.dragging = false; });
  window.addEventListener("resize", render);

  let lastTime = performance.now();
  function animationFrame(now) {
    const deltaTime = Math.min(0.04, (now - lastTime) / 1000);
    lastTime = now;
    if (state.running) {
      const speed = state.mode === "accumulation" ? 0.22 : 0.34;
      state.progress += deltaTime * state.playbackRate * speed;
      if (state.progress >= 1) {
        state.progress = 1;
        state.running = false;
      }
      frameCounter += 1;
      drawScene();
      if (frameCounter % 3 === 0) render();
    } else if (state.mode === "scale" && state.showWave) {
      drawScene();
    }
    requestAnimationFrame(animationFrame);
  }

  window.matterWaveLab = {
    getState: () => ({ ...state }),
    setState,
    solve: (next = {}) => {
      const merged = { ...state, ...next };
      if (merged.mode === "scale") return model.deBroglieState({ particle: merged.particle, speedMs: 10 ** merged.speedExponent });
      if (merged.mode === "diffraction" || merged.mode === "accumulation") return model.braggRing({ voltage: merged.voltage, latticeSpacingNm: merged.latticeSpacingNm, screenDistanceM: merged.screenDistanceM });
      return model.electronState(merged.voltage);
    },
    setMode,
    reset
  };

  render();
  requestAnimationFrame(animationFrame);
})();
