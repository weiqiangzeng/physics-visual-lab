(function () {
  "use strict";

  const MODES = {
    force: { title: "改变合力", goal: "保持质量不变，比较合力与加速度" },
    mass: { title: "改变质量", goal: "保持合力不变，比较质量与加速度" },
    motion: { title: "运动演化", goal: "观察恒定加速度如何持续改变速度和位置" },
    balance: { title: "合力为零", goal: "用非零初速度检验惯性定律" }
  };

  const GUIDE_STEPS = [
    { index: "01", title: "先画受力图", prompt: "比较两个反向外力，先判断合力和加速度方向。" },
    { index: "02", title: "再控制变量", prompt: "固定质量改变合力，再固定合力改变质量，只比较一个因素。" },
    { index: "03", title: "最后观察运动", prompt: "比较 a、v 和 x：合力直接决定哪一个量？" }
  ];

  const state = {
    mass: 2,
    rightForce: 6,
    leftForce: 1,
    initialVelocity: 0,
    time: 0,
    velocity: 0,
    position: 0,
    running: false,
    speed: 1,
    mode: "force",
    guideStep: 0,
    showForces: true,
    showNet: true,
    showVelocity: true,
    showTrail: true,
    samples: [],
    history: []
  };

  const refs = {
    canvas: document.getElementById("newtonCanvas"),
    relationChart: document.getElementById("relationChart"),
    timeChart: document.getElementById("timeChart"),
    massInput: document.getElementById("massInput"),
    rightForceInput: document.getElementById("rightForceInput"),
    leftForceInput: document.getElementById("leftForceInput"),
    initialVelocityInput: document.getElementById("initialVelocityInput"),
    speedInput: document.getElementById("speedInput"),
    massValue: document.getElementById("massValue"),
    rightForceValue: document.getElementById("rightForceValue"),
    leftForceValue: document.getElementById("leftForceValue"),
    initialVelocityValue: document.getElementById("initialVelocityValue"),
    speedValue: document.getElementById("speedValue"),
    netForceStrip: document.getElementById("netForceStrip"),
    timeValue: document.getElementById("timeValue"),
    netForceMetric: document.getElementById("netForceMetric"),
    accelerationMetric: document.getElementById("accelerationMetric"),
    velocityMetric: document.getElementById("velocityMetric"),
    positionMetric: document.getElementById("positionMetric"),
    lawDelta: document.getElementById("lawDelta"),
    lawCheckText: document.getElementById("lawCheckText"),
    stateBadge: document.getElementById("stateBadge"),
    modeTitle: document.getElementById("modeTitle"),
    modeGoal: document.getElementById("modeGoal"),
    stageHint: document.getElementById("stageHint"),
    relationKicker: document.getElementById("relationKicker"),
    relationTitle: document.getElementById("relationTitle"),
    relationStatus: document.getElementById("relationStatus"),
    stepIndex: document.getElementById("stepIndex"),
    stepTitle: document.getElementById("stepTitle"),
    stepPrompt: document.getElementById("stepPrompt"),
    formulaLabel: document.getElementById("formulaLabel"),
    formulaReadout: document.getElementById("formulaReadout"),
    resetButton: document.getElementById("resetButton"),
    playButton: document.getElementById("playButton"),
    pauseButton: document.getElementById("pauseButton"),
    restartButton: document.getElementById("restartButton"),
    balanceButton: document.getElementById("balanceButton"),
    recordButton: document.getElementById("recordButton"),
    clearDataButton: document.getElementById("clearDataButton"),
    guideButton: document.getElementById("guideButton"),
    stepButton: document.getElementById("stepButton"),
    focusButton: document.getElementById("focusButton"),
    fullscreenButton: document.getElementById("fullscreenButton"),
    guideDialog: document.getElementById("guideDialog"),
    forcesToggle: document.getElementById("showForcesToggle"),
    netToggle: document.getElementById("showNetToggle"),
    velocityToggle: document.getElementById("showVelocityToggle"),
    trailToggle: document.getElementById("showTrailToggle"),
    modeButtons: Array.from(document.querySelectorAll("[data-mode]")),
    guideButtons: Array.from(document.querySelectorAll("[data-guide-step]"))
  };

  const apparatus = { ctx: refs.canvas.getContext("2d"), width: 0, height: 0, dpr: 1, cartX: 0, trackLeft: 0, trackRight: 0 };
  const relationPlot = { ctx: refs.relationChart.getContext("2d"), width: 0, height: 0, dpr: 1 };
  const timePlot = { ctx: refs.timeChart.getContext("2d"), width: 0, height: 0, dpr: 1 };
  let dragForce = null;
  let animationFrame = 0;
  let lastAnimationTime = 0;

  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function near(value, target, tolerance = 1e-8) { return Math.abs(value - target) <= tolerance; }
  function signed(value, digits, unit) {
    const normalized = Math.abs(value) < Math.pow(10, -digits) / 2 ? 0 : value;
    const sign = normalized > 0 ? "+" : normalized < 0 ? "−" : "";
    return `${sign}${Math.abs(normalized).toFixed(digits)}${unit ? ` ${unit}` : ""}`;
  }

  function calculate(sourceState = state) {
    const mass = clamp(Number(sourceState.mass), .5, 5);
    const rightForce = clamp(Number(sourceState.rightForce), 0, 10);
    const leftForce = clamp(Number(sourceState.leftForce), 0, 10);
    const netForce = rightForce - leftForce;
    const acceleration = netForce / mass;
    const residual = Math.abs(netForce - mass * acceleration);
    return { mass, rightForce, leftForce, netForce, acceleration, residual };
  }

  function setupCanvas(canvas, surface) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width)); const height = Math.max(1, Math.round(rect.height));
    if (surface.width === width && surface.height === height && surface.dpr === dpr) return;
    surface.width = width; surface.height = height; surface.dpr = dpr;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    surface.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawLine(ctx, from, to, color, width = 1, dash = [], alpha = 1) {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash); ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke(); ctx.restore();
  }

  function drawArrow(ctx, from, to, color, label, value, align = "above") {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2.4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - 9 * Math.cos(angle - Math.PI / 6), to.y - 9 * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(to.x - 9 * Math.cos(angle + Math.PI / 6), to.y - 9 * Math.sin(angle + Math.PI / 6)); ctx.closePath(); ctx.fill();
    ctx.font = "9px Avenir Next, sans-serif"; ctx.textAlign = to.x >= from.x ? "left" : "right";
    const textX = to.x + (to.x >= from.x ? 6 : -6); const textY = align === "above" ? to.y - 7 : to.y + 13;
    ctx.fillText(`${label} ${value}`, textX, textY); ctx.restore();
  }

  function visualTrackX(position, left, right) {
    const span = right - left;
    const wrapped = ((position + 10) % 20 + 20) % 20;
    return left + (wrapped / 20) * span;
  }

  function drawApparatus() {
    setupCanvas(refs.canvas, apparatus);
    const ctx = apparatus.ctx; const width = apparatus.width; const height = apparatus.height; const d = calculate();
    ctx.clearRect(0, 0, width, height); ctx.fillStyle = "#0c0f0e"; ctx.fillRect(0, 0, width, height);
    const trackLeft = 38; const trackRight = width - 38; const trackY = height * .67;
    const cartX = visualTrackX(state.position, trackLeft + 46, trackRight - 46);
    apparatus.cartX = cartX; apparatus.trackLeft = trackLeft; apparatus.trackRight = trackRight;

    ctx.save(); ctx.strokeStyle = "rgba(240,241,232,.055)"; ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
    for (let y = 18; y < height; y += 28) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
    ctx.restore();

    drawLine(ctx, { x: trackLeft, y: trackY }, { x: trackRight, y: trackY }, "rgba(240,241,232,.52)", 2);
    drawLine(ctx, { x: trackLeft, y: trackY + 13 }, { x: trackRight, y: trackY + 13 }, "rgba(240,241,232,.14)", 1);
    ctx.fillStyle = "rgba(240,241,232,.42)"; ctx.font = "8px Avenir Next, sans-serif"; ctx.textAlign = "center";
    for (let meter = -10; meter <= 10; meter += 2) {
      const x = visualTrackX(meter, trackLeft + 46, trackRight - 46);
      ctx.fillRect(x, trackY + 10, 1, 7); ctx.fillText(String(meter), x, trackY + 29);
    }

    if (state.showTrail && state.history.length > 1) {
      const start = Math.max(0, state.history.length - 80);
      state.history.slice(start).forEach((sample, index, values) => {
        const x = visualTrackX(sample.position, trackLeft + 46, trackRight - 46);
        ctx.fillStyle = `rgba(100,199,217,${.04 + .32 * (index / values.length)})`;
        ctx.beginPath(); ctx.arc(x, trackY - 5, 2.2, 0, Math.PI * 2); ctx.fill();
      });
    }

    const cartWidth = 84; const cartHeight = 48; const cartTop = trackY - cartHeight - 8;
    ctx.fillStyle = "rgba(100,199,217,.12)"; ctx.strokeStyle = "#64c7d9"; ctx.lineWidth = 1.5;
    ctx.fillRect(cartX - cartWidth / 2, cartTop, cartWidth, cartHeight); ctx.strokeRect(cartX - cartWidth / 2, cartTop, cartWidth, cartHeight);
    ctx.fillStyle = "#f0f1e8"; ctx.font = "12px Georgia, serif"; ctx.textAlign = "center"; ctx.fillText(`m = ${d.mass.toFixed(1)} kg`, cartX, cartTop + 28);
    [cartX - 27, cartX + 27].forEach((x) => { ctx.fillStyle = "#111412"; ctx.strokeStyle = "rgba(240,241,232,.55)"; ctx.beginPath(); ctx.arc(x, trackY - 2, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); });

    if (state.showForces) {
      const forceY = cartTop + cartHeight * .42;
      const rightLength = 18 + d.rightForce * 7; const leftLength = 18 + d.leftForce * 7;
      drawArrow(ctx, { x: cartX + cartWidth / 2, y: forceY }, { x: cartX + cartWidth / 2 + rightLength, y: forceY }, "#64c7d9", "F右", `${d.rightForce.toFixed(1)} N`);
      drawArrow(ctx, { x: cartX - cartWidth / 2, y: forceY }, { x: cartX - cartWidth / 2 - leftLength, y: forceY }, "#ff7a68", "F左", `${d.leftForce.toFixed(1)} N`);
      const verticalLength = 28 + d.mass * 5;
      drawArrow(ctx, { x: cartX - 14, y: cartTop }, { x: cartX - 14, y: cartTop - verticalLength }, "rgba(105,209,142,.8)", "N", "", "above");
      drawArrow(ctx, { x: cartX + 14, y: cartTop + cartHeight }, { x: cartX + 14, y: cartTop + cartHeight + verticalLength }, "rgba(240,241,232,.62)", "G", "", "below");
    }

    if (state.showNet && Math.abs(d.netForce) > .005) {
      const direction = Math.sign(d.netForce); const length = 32 + Math.abs(d.netForce) * 8;
      drawArrow(ctx, { x: cartX, y: cartTop - 25 }, { x: cartX + direction * length, y: cartTop - 25 }, "#f2b84b", "F合", signed(d.netForce, 1, "N"));
      drawArrow(ctx, { x: cartX, y: cartTop - 48 }, { x: cartX + direction * (27 + Math.abs(d.acceleration) * 8), y: cartTop - 48 }, "#69d18e", "a", signed(d.acceleration, 2, "m/s²"));
    } else if (state.showNet) {
      ctx.fillStyle = "#64c7d9"; ctx.font = "10px Avenir Next, sans-serif"; ctx.textAlign = "center"; ctx.fillText("F合 = 0 · a = 0", cartX, cartTop - 30);
    }

    if (state.showVelocity && Math.abs(state.velocity) > .005) {
      const direction = Math.sign(state.velocity); const length = Math.min(110, 30 + Math.abs(state.velocity) * 9);
      drawArrow(ctx, { x: cartX, y: trackY + 50 }, { x: cartX + direction * length, y: trackY + 50 }, "#b58ce5", "v", signed(state.velocity, 2, "m/s"), "below");
    }

    ctx.fillStyle = "rgba(240,241,232,.5)"; ctx.font = "9px Avenir Next, sans-serif"; ctx.textAlign = "left";
    ctx.fillText("水平无摩擦轨道 · 箭头长度按教学需要放大", 18, 22);
    ctx.fillText(`t=${state.time.toFixed(2)} s`, 18, height - 17);
    ctx.textAlign = "right"; ctx.fillText(`x=${state.position.toFixed(2)} m`, width - 18, height - 17);
  }

  function drawChartFrame(surface, xLabel, yLabel) {
    setupCanvas(surface.canvas, surface);
    const ctx = surface.ctx; const width = surface.width; const height = surface.height;
    ctx.clearRect(0, 0, width, height); ctx.fillStyle = "#111512"; ctx.fillRect(0, 0, width, height);
    const pad = { left: 36, right: 12, top: 12, bottom: 25 };
    const frame = { pad, width: width - pad.left - pad.right, height: height - pad.top - pad.bottom };
    ctx.strokeStyle = "rgba(240,241,232,.09)"; ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i += 1) {
      const x = pad.left + (frame.width * i) / 5; const y = pad.top + (frame.height * i) / 5;
      ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top + frame.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + frame.width, y); ctx.stroke();
    }
    ctx.fillStyle = "rgba(240,241,232,.46)"; ctx.font = "8px Avenir Next, sans-serif";
    ctx.textAlign = "right"; ctx.fillText(yLabel, pad.left - 5, pad.top + 7); ctx.fillText(xLabel, pad.left + frame.width, height - 5);
    return frame;
  }

  function drawRelationChart() {
    relationPlot.canvas = refs.relationChart;
    const massMode = state.mode === "mass";
    const frame = drawChartFrame(relationPlot, massMode ? "1/m" : "F合 / N", "a / m·s⁻²");
    const ctx = relationPlot.ctx; const d = calculate(); const { pad } = frame;
    const xMin = massMode ? .2 : -10; const xMax = massMode ? 2 : 10;
    const maxA = massMode ? Math.max(4, Math.abs(d.netForce) * 2.2) : Math.max(4, 11 / d.mass);
    const xOf = (value) => pad.left + ((value - xMin) / (xMax - xMin)) * frame.width;
    const yOf = (value) => pad.top + ((maxA - value) / (2 * maxA)) * frame.height;
    drawLine(ctx, { x: pad.left, y: yOf(0) }, { x: pad.left + frame.width, y: yOf(0) }, "rgba(240,241,232,.3)", 1);
    if (!massMode) drawLine(ctx, { x: xOf(0), y: pad.top }, { x: xOf(0), y: pad.top + frame.height }, "rgba(240,241,232,.3)", 1);
    const first = massMode ? { x: xMin, y: d.netForce * xMin } : { x: xMin, y: xMin / d.mass };
    const last = massMode ? { x: xMax, y: d.netForce * xMax } : { x: xMax, y: xMax / d.mass };
    drawLine(ctx, { x: xOf(first.x), y: yOf(first.y) }, { x: xOf(last.x), y: yOf(last.y) }, "#64c7d9", 1.8);
    state.samples.filter((sample) => (massMode ? sample.kind === "mass" : sample.kind === "force")).forEach((sample) => {
      const x = massMode ? sample.inverseMass : sample.netForce;
      ctx.fillStyle = "#f2b84b"; ctx.beginPath(); ctx.arc(xOf(x), yOf(sample.acceleration), 3, 0, Math.PI * 2); ctx.fill();
    });
    const currentX = massMode ? 1 / d.mass : d.netForce;
    ctx.fillStyle = "#69d18e"; ctx.beginPath(); ctx.arc(xOf(currentX), yOf(d.acceleration), 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(240,241,232,.45)"; ctx.font = "8px Avenir Next, sans-serif"; ctx.textAlign = "center";
    const xTicks = massMode ? [.2, .6, 1, 1.4, 1.8] : [-10, -5, 0, 5, 10];
    xTicks.forEach((value) => ctx.fillText(String(value), xOf(value), pad.top + frame.height + 14));
    ctx.textAlign = "right"; [-maxA, 0, maxA].forEach((value) => ctx.fillText(value.toFixed(1), pad.left - 5, yOf(value) + 3));
  }

  function drawTimeChart() {
    timePlot.canvas = refs.timeChart;
    const frame = drawChartFrame(timePlot, "t / s", "v / m·s⁻¹");
    const ctx = timePlot.ctx; const d = calculate(); const { pad } = frame;
    const horizon = Math.max(6, state.time, state.history.length ? state.history[state.history.length - 1].time : 0);
    const prospectiveEnd = state.velocity + d.acceleration * Math.max(0, horizon - state.time);
    const velocities = state.history.map((sample) => sample.velocity).concat([state.velocity, prospectiveEnd, state.initialVelocity]);
    const maxV = Math.max(3, ...velocities.map((value) => Math.abs(value))) * 1.18;
    const xOf = (value) => pad.left + (value / horizon) * frame.width;
    const yOf = (value) => pad.top + ((maxV - value) / (2 * maxV)) * frame.height;
    drawLine(ctx, { x: pad.left, y: yOf(0) }, { x: pad.left + frame.width, y: yOf(0) }, "rgba(240,241,232,.3)", 1);
    if (state.history.length > 1) {
      ctx.save(); ctx.strokeStyle = "#b58ce5"; ctx.lineWidth = 1.8; ctx.beginPath();
      state.history.forEach((sample, index) => { const x = xOf(sample.time); const y = yOf(sample.velocity); if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
      ctx.stroke(); ctx.restore();
    } else {
      drawLine(ctx, { x: xOf(0), y: yOf(state.initialVelocity) }, { x: xOf(horizon), y: yOf(state.initialVelocity + d.acceleration * horizon) }, "#b58ce5", 1.4, [5, 4], .7);
    }
    ctx.fillStyle = "#f2b84b"; ctx.beginPath(); ctx.arc(xOf(state.time), yOf(state.velocity), 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(240,241,232,.45)"; ctx.font = "8px Avenir Next, sans-serif"; ctx.textAlign = "center";
    [0, .25, .5, .75, 1].forEach((ratio) => ctx.fillText((horizon * ratio).toFixed(1), xOf(horizon * ratio), pad.top + frame.height + 14));
    ctx.textAlign = "right"; [-maxV, 0, maxV].forEach((value) => ctx.fillText(value.toFixed(1), pad.left - 5, yOf(value) + 3));
  }

  function physicalState(d) {
    if (Math.abs(d.netForce) < .005) return state.velocity === 0 ? { badge: "合力为零 · 静止", className: "is-balanced" } : { badge: "合力为零 · 匀速", className: "is-balanced" };
    return d.netForce > 0 ? { badge: "向右加速", className: "" } : { badge: "向左加速", className: "is-left" };
  }

  function setRangeProgress(input, value) {
    const min = Number(input.min); const max = Number(input.max);
    input.style.setProperty("--range-progress", `${((value - min) / (max - min)) * 100}%`);
  }

  function sync() {
    const d = calculate(); const mode = MODES[state.mode]; const guide = GUIDE_STEPS[state.guideStep]; const physical = physicalState(d);
    refs.massInput.value = state.mass; refs.rightForceInput.value = state.rightForce; refs.leftForceInput.value = state.leftForce; refs.initialVelocityInput.value = state.initialVelocity; refs.speedInput.value = state.speed;
    refs.massValue.textContent = `${d.mass.toFixed(2)} kg`; refs.rightForceValue.textContent = `${d.rightForce.toFixed(1)} N`; refs.leftForceValue.textContent = `${d.leftForce.toFixed(1)} N`;
    refs.initialVelocityValue.textContent = signed(state.initialVelocity, 1, "m/s"); refs.speedValue.textContent = `${state.speed.toFixed(2)}×`; refs.timeValue.textContent = `t = ${state.time.toFixed(2)} s`;
    refs.netForceStrip.textContent = `${signed(d.netForce, 1, "N")} ${d.netForce > .005 ? "→" : d.netForce < -.005 ? "←" : "· 平衡"}`;
    refs.netForceMetric.textContent = signed(d.netForce, 2, "N"); refs.accelerationMetric.textContent = signed(d.acceleration, 2, "m/s²");
    refs.velocityMetric.textContent = signed(state.velocity, 2, "m/s"); refs.positionMetric.textContent = signed(state.position, 2, "m");
    refs.lawDelta.textContent = `Δ = ${d.residual.toFixed(3)} N`; refs.lawCheckText.textContent = d.residual < 1e-9 ? "F合 与 ma 一致" : "模型状态不一致";
    refs.stateBadge.textContent = physical.badge; refs.stateBadge.classList.toggle("is-left", physical.className === "is-left"); refs.stateBadge.classList.toggle("is-balanced", physical.className === "is-balanced");
    refs.modeTitle.textContent = mode.title; refs.modeGoal.textContent = mode.goal;
    refs.stageHint.textContent = state.mode === "balance" ? "播放后观察非零速度是否保持" : state.mode === "motion" ? "播放运动并观察 v-t 斜率" : "拖动合力箭头改变外力";
    const massMode = state.mode === "mass";
    refs.relationKicker.textContent = massMode ? "INVERSE MASS RESPONSE" : "FORCE RESPONSE";
    refs.relationTitle.textContent = massMode ? "a – 1/m 关系" : "a – F合 关系";
    refs.relationStatus.textContent = massMode ? `F合 = ${d.netForce.toFixed(1)} N` : `m = ${d.mass.toFixed(2)} kg`;
    refs.stepIndex.textContent = guide.index; refs.stepTitle.textContent = guide.title; refs.stepPrompt.textContent = guide.prompt;
    refs.formulaLabel.textContent = Math.abs(d.netForce) < .005 ? "平衡状态" : "当前关系";
    refs.formulaReadout.textContent = `${signed(d.netForce, 2, "N")} = ${d.mass.toFixed(2)} kg × ${signed(d.acceleration, 2, "m/s²")}`;
    refs.playButton.textContent = state.running ? "运行中" : "▶ 播放"; refs.playButton.setAttribute("aria-pressed", String(state.running));
    refs.recordButton.textContent = `记录参数${state.samples.length ? ` (${state.samples.length})` : ""}`;
    refs.forcesToggle.checked = state.showForces; refs.netToggle.checked = state.showNet; refs.velocityToggle.checked = state.showVelocity; refs.trailToggle.checked = state.showTrail;
    refs.modeButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.mode === state.mode));
    refs.guideButtons.forEach((button) => button.classList.toggle("is-active", Number(button.dataset.guideStep) === state.guideStep));
    setRangeProgress(refs.massInput, d.mass); setRangeProgress(refs.rightForceInput, d.rightForce); setRangeProgress(refs.leftForceInput, d.leftForce); setRangeProgress(refs.initialVelocityInput, state.initialVelocity); setRangeProgress(refs.speedInput, state.speed);
    drawApparatus(); drawRelationChart(); drawTimeChart();
  }

  function resetMotion(keepRunning = false) {
    state.time = 0; state.position = 0; state.velocity = state.initialVelocity; state.history = [{ time: 0, velocity: state.velocity, position: 0, acceleration: calculate().acceleration }];
    state.running = keepRunning; lastAnimationTime = 0; sync(); if (keepRunning) startAnimation();
  }

  function setMode(mode) {
    state.mode = mode;
    if (mode === "force") Object.assign(state, { mass: 2, rightForce: 6, leftForce: 1, initialVelocity: 0 });
    if (mode === "mass") Object.assign(state, { mass: 3, rightForce: 7, leftForce: 1, initialVelocity: 0 });
    if (mode === "motion") Object.assign(state, { mass: 2, rightForce: 5, leftForce: 1, initialVelocity: 0 });
    if (mode === "balance") Object.assign(state, { mass: 2, rightForce: 3, leftForce: 3, initialVelocity: 2 });
    state.running = false; resetMotion();
  }

  function setParameter(key, input, value) {
    const next = Number(value); if (!Number.isFinite(next)) return;
    state[key] = clamp(next, Number(input.min), Number(input.max));
    if (key === "initialVelocity") resetMotion(); else sync();
  }

  function recordSample() {
    const d = calculate(); const kind = state.mode === "mass" ? "mass" : "force";
    const duplicate = state.samples.some((sample) => sample.kind === kind && near(sample.mass, d.mass, 1e-6) && near(sample.netForce, d.netForce, 1e-6));
    if (!duplicate) state.samples.push({ kind, mass: d.mass, inverseMass: 1 / d.mass, netForce: d.netForce, acceleration: d.acceleration });
    sync();
  }

  function startAnimation() {
    if (animationFrame) return;
    animationFrame = requestAnimationFrame(animate);
  }

  function animate(timestamp) {
    animationFrame = 0;
    if (!state.running) return;
    if (!lastAnimationTime) lastAnimationTime = timestamp;
    const dt = Math.min(.05, Math.max(0, (timestamp - lastAnimationTime) / 1000)) * state.speed;
    lastAnimationTime = timestamp;
    const d = calculate();
    state.position += state.velocity * dt + .5 * d.acceleration * dt * dt;
    state.velocity += d.acceleration * dt; state.time += dt;
    const lastHistory = state.history[state.history.length - 1];
    if (!lastHistory || state.time - lastHistory.time >= .045) state.history.push({ time: state.time, velocity: state.velocity, position: state.position, acceleration: d.acceleration });
    if (state.history.length > 500) state.history.splice(0, state.history.length - 500);
    if (state.time >= 20) state.running = false;
    sync();
    if (state.running) animationFrame = requestAnimationFrame(animate);
  }

  function setForceFromPointer(event) {
    const rect = refs.canvas.getBoundingClientRect(); const x = event.clientX - rect.left;
    const distance = Math.max(0, Math.abs(x - apparatus.cartX) - 42);
    const force = clamp((distance - 18) / 7, 0, 10);
    if (dragForce === "right") state.rightForce = force; else state.leftForce = force;
    sync();
  }

  [[refs.massInput, "mass"], [refs.rightForceInput, "rightForce"], [refs.leftForceInput, "leftForce"], [refs.initialVelocityInput, "initialVelocity"], [refs.speedInput, "speed"]].forEach(([input, key]) => input.addEventListener("input", (event) => setParameter(key, input, event.target.value)));
  refs.modeButtons.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
  refs.guideButtons.forEach((button) => button.addEventListener("click", () => { state.guideStep = Number(button.dataset.guideStep); sync(); }));
  [[refs.forcesToggle, "showForces"], [refs.netToggle, "showNet"], [refs.velocityToggle, "showVelocity"], [refs.trailToggle, "showTrail"]].forEach(([control, key]) => control.addEventListener("change", () => { state[key] = control.checked; sync(); }));
  refs.playButton.addEventListener("click", () => { state.running = true; lastAnimationTime = 0; sync(); startAnimation(); });
  refs.pauseButton.addEventListener("click", () => { state.running = false; lastAnimationTime = 0; sync(); });
  refs.restartButton.addEventListener("click", () => resetMotion(state.running));
  refs.balanceButton.addEventListener("click", () => setMode("balance"));
  refs.recordButton.addEventListener("click", recordSample);
  refs.clearDataButton.addEventListener("click", () => { state.samples = []; resetMotion(); });
  refs.resetButton.addEventListener("click", () => { Object.assign(state, { mass: 2, rightForce: 6, leftForce: 1, initialVelocity: 0, speed: 1, mode: "force", guideStep: 0, showForces: true, showNet: true, showVelocity: true, showTrail: true, samples: [] }); resetMotion(); });
  refs.guideButton.addEventListener("click", () => refs.guideDialog.showModal());
  refs.stepButton.addEventListener("click", () => { state.guideStep = (state.guideStep + 1) % GUIDE_STEPS.length; sync(); });
  refs.focusButton.addEventListener("click", () => { const active = document.body.classList.toggle("focus-mode"); refs.focusButton.setAttribute("aria-pressed", String(active)); requestAnimationFrame(sync); });
  refs.fullscreenButton.addEventListener("click", () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.(); });

  refs.canvas.tabIndex = 0;
  refs.canvas.addEventListener("pointerdown", (event) => {
    const rect = refs.canvas.getBoundingClientRect(); const x = event.clientX - rect.left;
    dragForce = x >= apparatus.cartX ? "right" : "left"; event.preventDefault();
    try { refs.canvas.setPointerCapture?.(event.pointerId); } catch (error) { /* Synthetic events may not own pointer capture. */ }
    setForceFromPointer(event);
  });
  refs.canvas.addEventListener("pointermove", (event) => { if (!dragForce) return; event.preventDefault(); setForceFromPointer(event); });
  refs.canvas.addEventListener("pointerup", () => { dragForce = null; }); refs.canvas.addEventListener("pointercancel", () => { dragForce = null; });
  refs.canvas.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault(); const delta = event.key === "ArrowRight" ? .1 : -.1;
    if (event.shiftKey) state.leftForce = clamp(state.leftForce - delta, 0, 10); else state.rightForce = clamp(state.rightForce + delta, 0, 10);
    sync();
  });

  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(() => requestAnimationFrame(sync));
    [refs.canvas, refs.relationChart, refs.timeChart].forEach((canvas) => observer.observe(canvas));
  } else window.addEventListener("resize", () => requestAnimationFrame(sync));

  window.newtonLab = {
    calculate: (patch) => calculate({ ...state, ...(patch || {}) }),
    getState: () => JSON.parse(JSON.stringify(state)),
    setState: (patch) => { Object.assign(state, patch || {}); sync(); },
    setMode,
    resetMotion,
    recordSample
  };
  resetMotion();
})();
