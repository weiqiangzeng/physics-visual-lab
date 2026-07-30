(function () {
  const refs = {
    canvas: document.getElementById("energyCanvas"), ledgerChart: document.getElementById("ledgerChart"), historyChart: document.getElementById("historyChart"),
    massInput: document.getElementById("massInput"), positionInput: document.getElementById("positionInput"), speedInput: document.getElementById("speedInput"), frictionInput: document.getElementById("frictionInput"), springInput: document.getElementById("springInput"), timeInput: document.getElementById("timeInput"),
    massValue: document.getElementById("massValue"), positionLabel: document.getElementById("positionLabel"), positionValue: document.getElementById("positionValue"), speedValue: document.getElementById("speedValue"), frictionValue: document.getElementById("frictionValue"), springValue: document.getElementById("springValue"), timeValue: document.getElementById("timeValue"),
    frictionSection: document.getElementById("frictionSection"), springSection: document.getElementById("springSection"), boundarySection: document.getElementById("boundarySection"), frictionNote: document.getElementById("frictionNote"), springNote: document.getElementById("springNote"), boundaryNote: document.getElementById("boundaryNote"),
    kineticMetric: document.getElementById("kineticMetric"), gravityMetric: document.getElementById("gravityMetric"), elasticMetric: document.getElementById("elasticMetric"), internalMetric: document.getElementById("internalMetric"), mechanicalMetric: document.getElementById("mechanicalMetric"), totalMetric: document.getElementById("totalMetric"),
    ledgerStatus: document.getElementById("ledgerStatus"), historyStatus: document.getElementById("historyStatus"), modeTitle: document.getElementById("modeTitle"), modeGoal: document.getElementById("modeGoal"), stateBadge: document.getElementById("stateBadge"), stageHint: document.getElementById("stageHint"),
    stepIndex: document.getElementById("stepIndex"), stepTitle: document.getElementById("stepTitle"), stepPrompt: document.getElementById("stepPrompt"), formulaReadout: document.getElementById("formulaReadout"),
    playButton: document.getElementById("playButton"), pauseButton: document.getElementById("pauseButton"), keyButton: document.getElementById("keyButton"), resetButton: document.getElementById("resetButton"), guideButton: document.getElementById("guideButton"), stepButton: document.getElementById("stepButton"), focusButton: document.getElementById("focusButton"), fullscreenButton: document.getElementById("fullscreenButton"), guideDialog: document.getElementById("guideDialog"),
    showVelocityToggle: document.getElementById("showVelocityToggle"), showForceToggle: document.getElementById("showForceToggle"), showFlowToggle: document.getElementById("showFlowToggle"), showReferenceToggle: document.getElementById("showReferenceToggle"),
    sceneTabs: Array.from(document.querySelectorAll(".scene-tab[data-mode]")), routeSteps: Array.from(document.querySelectorAll(".route-step")), presetButtons: Array.from(document.querySelectorAll("[data-preset]")), boundaryButtons: Array.from(document.querySelectorAll("[data-boundary]")), rateButtons: Array.from(document.querySelectorAll("[data-rate]"))
  };

  const context = refs.canvas.getContext("2d");
  const ledgerContext = refs.ledgerChart.getContext("2d");
  const historyContext = refs.historyChart.getContext("2d");
  const G = 9.8;
  const RAMP_LENGTH = 8;
  const COLORS = { kinetic: "#64c7d9", gravity: "#f2b84b", spring: "#b58ce5", internal: "#ff7a68", total: "#69d18e", muted: "#7b867f" };
  const modes = {
    gravity: { title: "重力交换", goal: "下降过程中，重力势能转化为动能", hint: "拖动物体或时间轴，逐时刻核对能量" },
    rough: { title: "粗糙斜面", goal: "机械能减少量等于系统增加的内能", hint: "比较机械能曲线与红色内能曲线" },
    spring: { title: "弹簧蓄能", goal: "弹性势能释放为动能，机械能保持不变", hint: "观察平衡位置前的第一次释放过程" },
    boundary: { title: "系统边界", goal: "同一过程因系统选择不同而有不同能量方程", hint: "切换系统边界，区分内部转化与外界做功" }
  };
  const guide = [
    { title: "先预测转化", prompt: "物体速度变化时，哪一类能量减少、哪一类增加？" },
    { title: "核对能量账本", prompt: "把动能、势能与内能逐项相加，检查能量是否真的消失。" },
    { title: "选择系统边界", prompt: "重力和摩擦是外力做功，还是系统内部能量转化，取决于系统包含什么。" }
  ];
  const defaults = {
    gravity: { m: 2, position: 4, v0: 0, mu: 0.18, k: 32 },
    rough: { m: 2, position: 4, v0: 0, mu: 0.18, k: 32 },
    spring: { m: 2, position: 0.8, v0: 0, mu: 0.18, k: 32 },
    boundary: { m: 2, position: 4, v0: 0, mu: 0.18, k: 32 }
  };
  const state = {
    ...defaults.gravity, mode: "gravity", boundary: "full", time: 0, running: false, rate: 0.5, guideStep: 0,
    showVelocity: true, showForce: true, showFlow: true, showReference: true, dragging: false
  };

  function clamp(value, min, max) { return Math.min(max, Math.max(min, Number(value))); }
  function fmt(value, digits = 2) { const safe = Math.abs(value) < 5e-10 ? 0 : value; return safe.toFixed(digits).replace("-", "−"); }
  function positiveRoot(distance, speed, acceleration) {
    if (distance <= 0) return 0;
    if (Math.abs(acceleration) < 1e-10) return speed > 0 ? distance / speed : 0;
    const discriminant = speed ** 2 + 2 * acceleration * distance;
    if (discriminant < 0) return 0;
    const roots = [(-speed + Math.sqrt(discriminant)) / acceleration, (-speed - Math.sqrt(discriminant)) / acceleration].filter((value) => value >= 0);
    return roots.length ? Math.min(...roots) : 0;
  }

  function solveGravity(input) {
    const m = Number(input.m); const h0 = Number(input.position); const v0 = Number(input.v0);
    const duration = (Math.sqrt(v0 ** 2 + 2 * G * h0) - v0) / G;
    return { kind: "gravity", m, h0, v0, duration, initialEnergy: 0.5 * m * v0 ** 2 + m * G * h0, blocked: false };
  }

  function solveRough(input) {
    const m = Number(input.m); const h0 = Number(input.position); const v0 = Number(input.v0); const mu = Number(input.mu);
    const sinTheta = clamp(h0 / RAMP_LENGTH, 0.001, 0.95); const cosTheta = Math.sqrt(1 - sinTheta ** 2);
    const acceleration = G * (sinTheta - mu * cosTheta);
    const blocked = v0 <= 1e-9 && acceleration <= 1e-9;
    let endDistance = RAMP_LENGTH; let stopped = false; let duration = 0;
    if (!blocked) {
      if (acceleration < 0 && v0 ** 2 / (-2 * acceleration) < RAMP_LENGTH) {
        endDistance = v0 ** 2 / (-2 * acceleration); duration = v0 / (-acceleration); stopped = true;
      } else duration = positiveRoot(RAMP_LENGTH, v0, acceleration);
    }
    return {
      kind: "rough", m, h0, v0, mu, sinTheta, cosTheta, acceleration, duration, endDistance, stopped, blocked,
      initialEnergy: 0.5 * m * v0 ** 2 + m * G * h0
    };
  }

  function solveSpring(input) {
    const m = Number(input.m); const x0 = Number(input.position); const v0 = Number(input.v0); const k = Number(input.k);
    const omega = Math.sqrt(k / m);
    const duration = Math.atan2(x0 * omega, Math.max(0, v0)) / omega;
    return { kind: "spring", m, x0, v0, k, omega, duration, initialEnergy: 0.5 * m * v0 ** 2 + 0.5 * k * x0 ** 2, blocked: false };
  }

  function solve(input = state) {
    if (input.mode === "gravity") return solveGravity(input);
    if (input.mode === "spring") return solveSpring(input);
    return solveRough(input);
  }

  function sampleAt(time = state.time, input = state) {
    const model = solve(input); const t = clamp(time, 0, model.duration || 0);
    if (model.kind === "gravity") {
      const y = Math.max(0, model.h0 - model.v0 * t - 0.5 * G * t ** 2); const v = model.v0 + G * t;
      const kinetic = 0.5 * model.m * v ** 2; const gravity = model.m * G * y; const total = kinetic + gravity;
      return { ...model, time: t, progress: model.duration ? t / model.duration : 0, y, v, kinetic, gravity, elastic: 0, internal: 0, mechanical: total, total, residual: total - model.initialEnergy, force: model.m * G, phase: t <= 1e-6 ? "start" : t >= model.duration - 1e-6 ? "end" : "moving" };
    }
    if (model.kind === "spring") {
      const angle = model.omega * t; const x = Math.max(0, model.x0 * Math.cos(angle) - model.v0 / model.omega * Math.sin(angle)); const v = model.x0 * model.omega * Math.sin(angle) + model.v0 * Math.cos(angle);
      const kinetic = 0.5 * model.m * v ** 2; const elastic = 0.5 * model.k * x ** 2; const total = kinetic + elastic;
      return { ...model, time: t, progress: model.duration ? t / model.duration : 0, x, v, kinetic, gravity: 0, elastic, internal: 0, mechanical: total, total, residual: total - model.initialEnergy, force: model.k * x, phase: t <= 1e-6 ? "start" : t >= model.duration - 1e-6 ? "end" : "moving" };
    }
    if (model.blocked) {
      return { ...model, time: 0, progress: 0, s: 0, y: model.h0, v: 0, kinetic: 0, gravity: model.initialEnergy, elastic: 0, internal: 0, mechanical: model.initialEnergy, total: model.initialEnergy, residual: 0, force: 0, phase: "blocked" };
    }
    const s = clamp(model.v0 * t + 0.5 * model.acceleration * t ** 2, 0, model.endDistance); const v = Math.max(0, model.v0 + model.acceleration * t); const y = Math.max(0, model.h0 - s * model.sinTheta);
    const kinetic = 0.5 * model.m * v ** 2; const gravity = model.m * G * y; const internal = model.mu * model.m * G * model.cosTheta * s; const mechanical = kinetic + gravity; const total = mechanical + internal;
    return { ...model, time: t, progress: model.duration ? t / model.duration : 0, s, y, v, kinetic, gravity, elastic: 0, internal, mechanical, total, residual: total - model.initialEnergy, force: model.mu * model.m * G * model.cosTheta, phase: t <= 1e-6 ? "start" : t >= model.duration - 1e-6 ? "end" : "moving" };
  }

  function setCanvasSize(canvas, canvasContext) {
    const rect = canvas.getBoundingClientRect(); const ratio = Math.min(window.devicePixelRatio || 1, 2); const width = Math.max(320, Math.round(rect.width)); const height = Math.max(180, Math.round(rect.height));
    if (canvas.width !== width * ratio || canvas.height !== height * ratio) { canvas.width = width * ratio; canvas.height = height * ratio; }
    canvasContext.setTransform(ratio, 0, 0, ratio, 0, 0); return { width, height };
  }

  function drawGrid(canvasContext, width, height) {
    canvasContext.fillStyle = "#0c0f0e"; canvasContext.fillRect(0, 0, width, height); canvasContext.strokeStyle = "rgba(238,241,230,.055)"; canvasContext.lineWidth = 1;
    for (let x = 0; x <= width; x += 38) { canvasContext.beginPath(); canvasContext.moveTo(x, 0); canvasContext.lineTo(x, height); canvasContext.stroke(); }
    for (let y = 0; y <= height; y += 38) { canvasContext.beginPath(); canvasContext.moveTo(0, y); canvasContext.lineTo(width, y); canvasContext.stroke(); }
  }

  function arrow(canvasContext, x1, y1, x2, y2, color, label) {
    const angle = Math.atan2(y2 - y1, x2 - x1); const head = 8; canvasContext.strokeStyle = color; canvasContext.fillStyle = color; canvasContext.lineWidth = 2;
    canvasContext.beginPath(); canvasContext.moveTo(x1, y1); canvasContext.lineTo(x2, y2); canvasContext.stroke(); canvasContext.beginPath(); canvasContext.moveTo(x2, y2); canvasContext.lineTo(x2 - head * Math.cos(angle - 0.55), y2 - head * Math.sin(angle - 0.55)); canvasContext.lineTo(x2 - head * Math.cos(angle + 0.55), y2 - head * Math.sin(angle + 0.55)); canvasContext.closePath(); canvasContext.fill();
    if (label) { canvasContext.font = "10px ui-monospace, monospace"; canvasContext.textAlign = "center"; canvasContext.fillText(label, (x1 + x2) / 2, (y1 + y2) / 2 - 8); }
  }

  function drawEnergyFlow(canvasContext, width, labels, progress) {
    if (!state.showFlow) return; const y = 30; const gap = Math.min(128, width / Math.max(3, labels.length + 1)); const start = width / 2 - gap * (labels.length - 1) / 2;
    canvasContext.font = "10px ui-monospace, monospace"; canvasContext.textAlign = "center";
    labels.forEach((label, index) => { const x = start + index * gap; canvasContext.fillStyle = label.color; canvasContext.fillText(label.text, x, y); if (index < labels.length - 1) { const pulse = (progress * 3 + index * 0.27) % 1; arrow(canvasContext, x + 26, y - 4, x + gap - 26, y - 4, "rgba(238,241,230,.28)"); canvasContext.fillStyle = COLORS.total; canvasContext.beginPath(); canvasContext.arc(x + 30 + pulse * (gap - 60), y - 4, 3, 0, Math.PI * 2); canvasContext.fill(); } });
  }

  function drawGravityScene(sample, width, height) {
    const ground = height - 48; const top = 62; const x = width * 0.42; const span = ground - top; const ratio = sample.h0 ? sample.y / sample.h0 : 0; const ballY = ground - ratio * span;
    if (state.showReference) { context.strokeStyle = "rgba(242,184,75,.24)"; context.setLineDash([5, 5]); [top, ground, (top + ground) / 2].forEach((y) => { context.beginPath(); context.moveTo(46, y); context.lineTo(width - 36, y); context.stroke(); }); context.setLineDash([]); context.fillStyle = COLORS.gravity; context.font = "10px ui-monospace, monospace"; context.textAlign = "left"; context.fillText("Uᵍ = 0 参考面", 52, ground - 8); }
    context.strokeStyle = "rgba(238,241,230,.35)"; context.lineWidth = 3; context.beginPath(); context.moveTo(x, top - 16); context.lineTo(x, ground); context.stroke();
    context.fillStyle = "rgba(242,184,75,.15)"; context.beginPath(); context.arc(x, top, 18, 0, Math.PI * 2); context.fill();
    context.fillStyle = COLORS.kinetic; context.beginPath(); context.arc(x, ballY, 18, 0, Math.PI * 2); context.fill(); context.fillStyle = "#102017"; context.font = "bold 11px sans-serif"; context.textAlign = "center"; context.fillText("m", x, ballY + 4);
    if (state.showVelocity && sample.v > 0.02) arrow(context, x + 28, ballY, x + 28, ballY + Math.min(72, 18 + sample.v * 8), COLORS.kinetic, `v=${fmt(sample.v, 2)} m/s`);
    if (state.showForce) arrow(context, x - 28, ballY - 4, x - 28, ballY + 48, COLORS.gravity, "mg");
    context.fillStyle = "#9ca69f"; context.font = "10px ui-monospace, monospace"; context.textAlign = "left"; context.fillText(`h = ${fmt(sample.y, 2)} m`, x + 48, ballY + 4);
    drawEnergyFlow(context, width, [{ text: "重力势能 Uᵍ", color: COLORS.gravity }, { text: "动能 K", color: COLORS.kinetic }], sample.progress);
  }

  function drawRoughScene(sample, width, height) {
    const x0 = 60; const y0 = 72; const x1 = width - 52; const y1 = height - 54; const rampRatio = sample.s / RAMP_LENGTH; const cartX = x0 + (x1 - x0) * rampRatio; const cartY = y0 + (y1 - y0) * rampRatio;
    context.fillStyle = "#202521"; context.beginPath(); context.moveTo(x0, y0); context.lineTo(x1, y1); context.lineTo(x0, y1); context.closePath(); context.fill(); context.strokeStyle = "rgba(238,241,230,.5)"; context.lineWidth = 3; context.beginPath(); context.moveTo(x0, y0); context.lineTo(x1, y1); context.stroke();
    if (state.showReference) { context.strokeStyle = "rgba(242,184,75,.24)"; context.setLineDash([5, 5]); context.beginPath(); context.moveTo(36, y0); context.lineTo(x0 + 50, y0); context.stroke(); context.beginPath(); context.moveTo(36, y1); context.lineTo(x1, y1); context.stroke(); context.setLineDash([]); context.fillStyle = COLORS.gravity; context.font = "10px ui-monospace, monospace"; context.textAlign = "left"; context.fillText(`h₀=${fmt(sample.h0, 1)} m`, 38, y0 - 9); }
    if (sample.s > 0 && sample.mu > 0) { const marks = Math.max(1, Math.floor(12 * rampRatio)); for (let index = 0; index < marks; index += 1) { const r = (index + 0.5) / 12; const px = x0 + (x1 - x0) * r; const py = y0 + (y1 - y0) * r; context.fillStyle = `rgba(255,122,104,${0.28 + 0.5 * ((index % 3) / 2)})`; context.beginPath(); context.arc(px, py + 9, 2.5, 0, Math.PI * 2); context.fill(); } }
    context.save(); const angle = Math.atan2(y1 - y0, x1 - x0); context.translate(cartX, cartY - 13); context.rotate(angle); context.fillStyle = COLORS.kinetic; context.fillRect(-22, -15, 44, 27); context.fillStyle = "#102017"; context.font = "bold 10px sans-serif"; context.textAlign = "center"; context.fillText("m", 0, 3); context.restore();
    if (state.showVelocity && sample.v > 0.02) arrow(context, cartX + 20 * Math.cos(angle), cartY - 13 + 20 * Math.sin(angle), cartX + (52 + sample.v * 5) * Math.cos(angle), cartY - 13 + (52 + sample.v * 5) * Math.sin(angle), COLORS.kinetic, `v=${fmt(sample.v, 2)}`);
    if (state.showForce) { arrow(context, cartX, cartY - 36, cartX, cartY + 12, COLORS.gravity, "mg"); if (sample.mu > 0 && sample.phase !== "blocked") arrow(context, cartX - 5, cartY - 28, cartX - 46 * Math.cos(angle), cartY - 28 - 46 * Math.sin(angle), COLORS.internal, "f"); }
    if (sample.phase === "blocked") { context.fillStyle = COLORS.internal; context.font = "bold 12px sans-serif"; context.textAlign = "center"; context.fillText("沿斜面重力分力不足以启动物体", width / 2, height - 18); }
    drawEnergyFlow(context, width, [{ text: "重力势能 Uᵍ", color: COLORS.gravity }, { text: "动能 K", color: COLORS.kinetic }, { text: "内能 Eᵢ", color: COLORS.internal }], sample.progress);
  }

  function drawSpringScene(sample, width, height) {
    const trackY = height * 0.66; const wallX = 58; const equilibriumX = width - 105; const travel = Math.min(width * 0.46, 290); const cartX = equilibriumX - travel * (sample.x / sample.x0);
    context.fillStyle = "#202521"; context.fillRect(0, trackY + 24, width, height - trackY - 24); context.strokeStyle = "rgba(238,241,230,.45)"; context.lineWidth = 2; context.beginPath(); context.moveTo(0, trackY + 24); context.lineTo(width, trackY + 24); context.stroke(); context.fillStyle = "#303630"; context.fillRect(wallX - 12, trackY - 78, 12, 102);
    context.strokeStyle = COLORS.spring; context.lineWidth = 3; context.beginPath(); context.moveTo(wallX, trackY); const coils = 12; for (let i = 1; i <= coils; i += 1) { const px = wallX + (cartX - wallX - 25) * i / coils; const py = trackY + (i === coils ? 0 : (i % 2 ? -10 : 10)); context.lineTo(px, py); } context.lineTo(cartX - 25, trackY); context.stroke();
    if (state.showReference) { context.strokeStyle = "rgba(181,140,229,.4)"; context.setLineDash([5, 5]); context.beginPath(); context.moveTo(equilibriumX, 60); context.lineTo(equilibriumX, trackY + 36); context.stroke(); context.setLineDash([]); context.fillStyle = COLORS.spring; context.font = "10px ui-monospace, monospace"; context.textAlign = "center"; context.fillText("x = 0 平衡位置", equilibriumX, trackY + 48); }
    context.fillStyle = COLORS.kinetic; context.fillRect(cartX - 25, trackY - 24, 50, 48); context.fillStyle = "#102017"; context.font = "bold 11px sans-serif"; context.textAlign = "center"; context.fillText("m", cartX, trackY + 4); context.fillStyle = "#9ca69f"; context.font = "10px ui-monospace, monospace"; context.fillText(`x=${fmt(sample.x, 2)} m`, cartX, trackY - 34);
    if (state.showVelocity && sample.v > 0.02) arrow(context, cartX + 30, trackY - 4, cartX + 72 + sample.v * 5, trackY - 4, COLORS.kinetic, `v=${fmt(sample.v, 2)}`);
    if (state.showForce && sample.force > 0.02) arrow(context, cartX - 30, trackY + 10, cartX - 30 - Math.min(78, 22 + sample.force * 1.4), trackY + 10, COLORS.spring, "F弹");
    drawEnergyFlow(context, width, [{ text: "弹性势能 Uˢ", color: COLORS.spring }, { text: "动能 K", color: COLORS.kinetic }], sample.progress);
  }

  function drawScene(sample) {
    const { width, height } = setCanvasSize(refs.canvas, context); drawGrid(context, width, height);
    context.fillStyle = "#9ca69f"; context.font = "10px ui-monospace, monospace"; context.textAlign = "left"; context.fillText("参考系：地面 · 物理量按 SI 单位计算", 18, 18);
    if (sample.kind === "gravity") drawGravityScene(sample, width, height); else if (sample.kind === "spring") drawSpringScene(sample, width, height); else drawRoughScene(sample, width, height);
    context.fillStyle = COLORS.total; context.font = "10px ui-monospace, monospace"; context.textAlign = "left"; context.fillText(`能量守恒时刻  t = ${fmt(sample.time, 3)} s`, 18, height - 17);
  }

  function drawLedger(sample) {
    const { width, height } = setCanvasSize(refs.ledgerChart, ledgerContext); ledgerContext.clearRect(0, 0, width, height); const initial = sampleAt(0); const bars = [{ label: "初态", sample: initial }, { label: "当前", sample }]; const values = ["kinetic", "gravity", "elastic", "internal"]; const maxEnergy = Math.max(1, initial.initialEnergy); const chartTop = 25; const chartBottom = height - 34; const barWidth = Math.min(62, width * 0.16); const gap = Math.min(120, width * 0.3); const center = width / 2;
    ledgerContext.strokeStyle = "rgba(238,241,230,.16)"; ledgerContext.beginPath(); ledgerContext.moveTo(28, chartBottom); ledgerContext.lineTo(width - 18, chartBottom); ledgerContext.stroke();
    bars.forEach((bar, index) => { const x = center + (index - 0.5) * gap - barWidth / 2; let y = chartBottom; values.forEach((key) => { const segment = (bar.sample[key] / maxEnergy) * (chartBottom - chartTop); if (segment <= 0.2) return; y -= segment; ledgerContext.fillStyle = COLORS[key === "elastic" ? "spring" : key]; ledgerContext.fillRect(x, y, barWidth, segment); }); ledgerContext.strokeStyle = "rgba(238,241,230,.38)"; ledgerContext.strokeRect(x, chartTop, barWidth, chartBottom - chartTop); ledgerContext.fillStyle = "#dfe4dc"; ledgerContext.font = "10px sans-serif"; ledgerContext.textAlign = "center"; ledgerContext.fillText(bar.label, x + barWidth / 2, height - 15); });
    const legend = [{ key: "kinetic", text: "K" }, { key: "gravity", text: "Uᵍ" }, { key: "spring", text: "Uˢ" }, { key: "internal", text: "Eᵢ" }]; ledgerContext.font = "9px ui-monospace, monospace"; ledgerContext.textAlign = "left"; legend.forEach((item, index) => { const x = 14 + index * Math.max(52, width / 5); ledgerContext.fillStyle = COLORS[item.key]; ledgerContext.fillRect(x, 7, 8, 8); ledgerContext.fillStyle = "#9ca69f"; ledgerContext.fillText(item.text, x + 12, 15); });
  }

  function drawHistory(sample) {
    const { width, height } = setCanvasSize(refs.historyChart, historyContext); historyContext.clearRect(0, 0, width, height); const left = 34; const right = width - 12; const top = 20; const bottom = height - 30; const duration = Math.max(sample.duration, 0.001); const maxEnergy = Math.max(1, sample.initialEnergy); historyContext.strokeStyle = "rgba(238,241,230,.16)"; historyContext.beginPath(); historyContext.moveTo(left, top); historyContext.lineTo(left, bottom); historyContext.lineTo(right, bottom); historyContext.stroke();
    [0, 0.5, 1].forEach((fraction) => { const y = bottom - fraction * (bottom - top); historyContext.strokeStyle = "rgba(238,241,230,.07)"; historyContext.beginPath(); historyContext.moveTo(left, y); historyContext.lineTo(right, y); historyContext.stroke(); historyContext.fillStyle = "#7b867f"; historyContext.font = "8px ui-monospace, monospace"; historyContext.textAlign = "right"; historyContext.fillText(`${Math.round(fraction * 100)}%`, left - 4, y + 3); });
    const series = [{ key: "kinetic", color: COLORS.kinetic }, { key: "gravity", color: COLORS.gravity }, { key: "elastic", color: COLORS.spring }, { key: "internal", color: COLORS.internal }];
    series.forEach((item) => { historyContext.strokeStyle = item.color; historyContext.lineWidth = 2; historyContext.beginPath(); for (let i = 0; i <= 90; i += 1) { const t = duration * i / 90; const point = sampleAt(t); const x = left + (right - left) * i / 90; const y = bottom - (point[item.key] / maxEnergy) * (bottom - top); if (i === 0) historyContext.moveTo(x, y); else historyContext.lineTo(x, y); } historyContext.stroke(); });
    const cursorX = left + (right - left) * (sample.duration ? sample.time / sample.duration : 0); historyContext.strokeStyle = COLORS.total; historyContext.setLineDash([4, 4]); historyContext.beginPath(); historyContext.moveTo(cursorX, top); historyContext.lineTo(cursorX, bottom); historyContext.stroke(); historyContext.setLineDash([]); historyContext.fillStyle = "#9ca69f"; historyContext.font = "9px ui-monospace, monospace"; historyContext.textAlign = "left"; historyContext.fillText("0", left, height - 10); historyContext.textAlign = "right"; historyContext.fillText(`${fmt(duration, 2)} s`, right, height - 10);
  }

  function boundaryEquation(sample) {
    const deltaK = sample.kinetic - 0.5 * sample.m * sample.v0 ** 2; const gravityWork = sample.m * G * (sample.h0 - sample.y); const frictionWork = -sample.internal;
    if (state.boundary === "object") return { formula: `ΔK = Wᵍ + Wᶠ = ${fmt(deltaK)} J`, note: `重力做功 ${fmt(gravityWork)} J，摩擦做功 ${fmt(frictionWork)} J`, ledger: "物体系统：外力做功改变动能" };
    if (state.boundary === "earth") return { formula: `Δ(K+Uᵍ) = Wᶠ = ${fmt(frictionWork)} J`, note: "重力势能属于物体—地球系统，摩擦仍跨越边界", ledger: "物体+地球：摩擦力是外界能量传递" };
    return { formula: `K + Uᵍ + Eᵢ = ${fmt(sample.total)} J`, note: "摩擦把机械能转化为系统内能，总能量不变", ledger: "物体+地球+斜面：总能量守恒" };
  }

  function rangeProgress(input) { const min = Number(input.min); const max = Number(input.max); const value = Number(input.value); input.style.setProperty("--range-progress", `${max === min ? 0 : (value - min) / (max - min) * 100}%`); }

  function render() {
    const sample = sampleAt(); const mode = modes[state.mode]; const isSpring = state.mode === "spring"; const usesFriction = state.mode === "rough" || state.mode === "boundary";
    refs.positionInput.min = isSpring ? "0.2" : "1"; refs.positionInput.max = isSpring ? "1.5" : "6"; refs.positionInput.step = "0.1"; refs.positionInput.value = String(state.position); refs.positionLabel.innerHTML = isSpring ? "初始形变量 <i>x₀</i>" : "初始高度 <i>h₀</i>"; refs.positionValue.textContent = `${fmt(state.position)} ${isSpring ? "m" : "m"}`;
    refs.massInput.value = state.m; refs.speedInput.value = state.v0; refs.frictionInput.value = state.mu; refs.springInput.value = state.k; refs.timeInput.min = "0"; refs.timeInput.max = String(Math.max(sample.duration, 0.001)); refs.timeInput.value = String(sample.time); refs.timeInput.disabled = sample.blocked;
    refs.massValue.textContent = `${fmt(state.m)} kg`; refs.speedValue.textContent = `${fmt(state.v0)} m/s`; refs.frictionValue.textContent = fmt(state.mu); refs.springValue.textContent = `${fmt(state.k, 1)} N/m`; refs.timeValue.textContent = `t = ${fmt(sample.time, 3)} s`;
    refs.frictionInput.disabled = !usesFriction; refs.springInput.disabled = !isSpring; refs.frictionSection.classList.toggle("is-locked", !usesFriction); refs.springSection.classList.toggle("is-locked", !isSpring); refs.boundarySection.hidden = state.mode !== "boundary"; refs.frictionNote.textContent = usesFriction ? "简化取 μs = μk = μ；内能计入总量" : "当前场景不计阻力"; refs.springNote.textContent = isSpring ? "弹簧质量忽略，满足胡克定律" : "切换到弹簧场景后参与计算";
    refs.modeTitle.textContent = mode.title; refs.modeGoal.textContent = mode.goal; refs.stageHint.textContent = mode.hint; refs.sceneTabs.forEach((button) => button.classList.toggle("is-active", button.dataset.mode === state.mode)); refs.boundaryButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.boundary === state.boundary)); refs.rateButtons.forEach((button) => button.classList.toggle("is-active", Number(button.dataset.rate) === state.rate));
    const stateText = sample.phase === "blocked" ? "静止未启动" : sample.phase === "start" ? "初始状态" : sample.phase === "end" ? (sample.kind === "gravity" ? "触地前" : sample.kind === "spring" ? "到达平衡位置" : sample.stopped ? "中途停下" : "到达斜面底端") : "能量转化中";
    refs.stateBadge.textContent = stateText; refs.stateBadge.className = `state-badge is-${sample.phase}`; refs.playButton.setAttribute("aria-pressed", String(state.running)); refs.kineticMetric.textContent = `${fmt(sample.kinetic)} J`; refs.gravityMetric.textContent = `${fmt(sample.gravity)} J`; refs.elasticMetric.textContent = `${fmt(sample.elastic)} J`; refs.internalMetric.textContent = `${fmt(sample.internal)} J`; refs.mechanicalMetric.textContent = `E机 = ${fmt(sample.mechanical)} J`; refs.totalMetric.textContent = `E总 = ${fmt(sample.total)} J，残差 ${fmt(sample.residual, 3)} J`;
    let equation; if (state.mode === "boundary") equation = boundaryEquation(sample); else if (state.mode === "rough") equation = { formula: `K + Uᵍ + Eᵢ = ${fmt(sample.total)} J`, note: `机械能减少 ${fmt(sample.internal)} J，转化为内能`, ledger: "总能量守恒，机械能单调减少" }; else if (state.mode === "spring") equation = { formula: `K + Uˢ = ${fmt(sample.total)} J`, note: "弹力为保守力，机械能保持不变", ledger: "弹性势能与动能相互转化" }; else equation = { formula: `K + Uᵍ = ${fmt(sample.total)} J`, note: "重力为保守力，机械能保持不变", ledger: "重力势能与动能相互转化" };
    refs.formulaReadout.textContent = equation.formula; refs.ledgerStatus.textContent = equation.ledger; refs.historyStatus.textContent = state.mode === "rough" || state.mode === "boundary" ? `机械能保留 ${sample.initialEnergy ? (sample.mechanical / sample.initialEnergy * 100).toFixed(1) : "100.0"}%` : `机械能保持 ${sample.initialEnergy ? (sample.mechanical / sample.initialEnergy * 100).toFixed(1) : "100.0"}%`; refs.totalMetric.textContent = `${equation.note}；残差 ${fmt(sample.residual, 3)} J`;
    refs.boundaryNote.textContent = state.boundary === "object" ? "系统只含物体，重力和摩擦都对系统做功" : state.boundary === "earth" ? "重力势能在系统内，摩擦仍来自系统外" : "物体、地球和斜面都在系统内";
    const initialKinetic = 0.5 * sample.m * sample.v0 ** 2; const initialPotential = state.mode === "spring" ? 0.5 * sample.k * sample.x0 ** 2 : sample.m * G * (sample.h0 || 0); const passedEqualPoint = (state.mode === "gravity" || state.mode === "spring") && initialKinetic >= initialPotential - 1e-9;
    refs.stepIndex.textContent = String(state.guideStep + 1).padStart(2, "0"); refs.stepTitle.textContent = guide[state.guideStep].title; refs.stepPrompt.textContent = guide[state.guideStep].prompt; refs.routeSteps.forEach((button, index) => button.classList.toggle("is-active", index === state.guideStep)); refs.keyButton.textContent = sample.blocked ? (state.mode === "boundary" ? "◎ 未启动" : "◎ 无可达中点") : passedEqualPoint ? "◎ 初态已越过" : state.mode === "rough" ? "◎ 斜面中点" : state.mode === "boundary" ? "◎ 过程终点" : "◎ 能量平分"; refs.keyButton.disabled = sample.blocked || passedEqualPoint; refs.playButton.disabled = sample.blocked || sample.duration <= 0;
    [refs.massInput, refs.positionInput, refs.speedInput, refs.frictionInput, refs.springInput, refs.timeInput].forEach(rangeProgress);
    drawScene(sample); drawLedger(sample); drawHistory(sample);
  }

  function setState(next) {
    if ("m" in next) state.m = clamp(next.m, 0.5, 5); if ("position" in next) state.position = clamp(next.position, state.mode === "spring" ? 0.2 : 1, state.mode === "spring" ? 1.5 : 6); if ("v0" in next) state.v0 = clamp(next.v0, 0, 6); if ("mu" in next) state.mu = clamp(next.mu, 0, 0.5); if ("k" in next) state.k = clamp(next.k, 10, 80); if ("running" in next) state.running = Boolean(next.running); if ("time" in next) state.time = clamp(next.time, 0, solve().duration || 0); render();
  }

  function setMode(modeName) {
    if (!modes[modeName]) return; Object.assign(state, defaults[modeName], { mode: modeName, time: 0, running: false }); render();
  }

  function keyTime() {
    const model = solve(); if (!model.duration) return 0; if (state.mode === "boundary") return model.duration;
    if (state.mode === "rough") { const target = model.endDistance / 2; return positiveRoot(target, model.v0, model.acceleration); }
    if (state.mode === "gravity") {
      const equalHeight = model.h0 / 2 + model.v0 ** 2 / (4 * G);
      return equalHeight >= model.h0 ? 0 : positiveRoot(model.h0 - equalHeight, model.v0, G);
    }
    const initialGap = sampleAt(0).kinetic - sampleAt(0).elastic;
    if (initialGap >= 0) return 0;
    let low = 0; let high = model.duration;
    for (let index = 0; index < 60; index += 1) {
      const middle = (low + high) / 2; const sample = sampleAt(middle);
      if (sample.kinetic - sample.elastic < 0) low = middle; else high = middle;
    }
    return (low + high) / 2;
  }

  [[refs.massInput, "m"], [refs.positionInput, "position"], [refs.speedInput, "v0"], [refs.frictionInput, "mu"], [refs.springInput, "k"]].forEach(([input, key]) => input.addEventListener("input", () => setState({ [key]: input.value, time: 0, running: false })));
  refs.timeInput.addEventListener("input", () => setState({ time: refs.timeInput.value, running: false })); refs.sceneTabs.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode))); refs.routeSteps.forEach((button, index) => button.addEventListener("click", () => { state.guideStep = index; render(); }));
  refs.presetButtons.forEach((button) => button.addEventListener("click", () => { if (button.dataset.preset === "drop") setMode("gravity"); if (button.dataset.preset === "rough") setMode("rough"); if (button.dataset.preset === "spring") setMode("spring"); })); refs.boundaryButtons.forEach((button) => button.addEventListener("click", () => { state.boundary = button.dataset.boundary; render(); })); refs.rateButtons.forEach((button) => button.addEventListener("click", () => { state.rate = Number(button.dataset.rate); render(); }));
  refs.playButton.addEventListener("click", () => { if (state.time >= solve().duration - 1e-6) state.time = 0; setState({ running: solve().duration > 0 }); }); refs.pauseButton.addEventListener("click", () => setState({ running: false })); refs.keyButton.addEventListener("click", () => setState({ time: keyTime(), running: false }));
  refs.resetButton.addEventListener("click", () => { Object.assign(state, defaults.gravity, { mode: "gravity", boundary: "full", time: 0, running: false, rate: 0.5, guideStep: 0, showVelocity: true, showForce: true, showFlow: true, showReference: true }); [refs.showVelocityToggle, refs.showForceToggle, refs.showFlowToggle, refs.showReferenceToggle].forEach((input) => { input.checked = true; }); render(); });
  [[refs.showVelocityToggle, "showVelocity"], [refs.showForceToggle, "showForce"], [refs.showFlowToggle, "showFlow"], [refs.showReferenceToggle, "showReference"]].forEach(([input, key]) => input.addEventListener("change", () => { state[key] = input.checked; render(); }));
  refs.guideButton.addEventListener("click", () => refs.guideDialog.showModal()); refs.stepButton.addEventListener("click", () => { state.guideStep = (state.guideStep + 1) % guide.length; render(); }); refs.focusButton.addEventListener("click", () => { const active = document.body.classList.toggle("focus-mode"); refs.focusButton.setAttribute("aria-pressed", String(active)); }); refs.fullscreenButton.addEventListener("click", () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());
  function timeFromPointer(event) {
    const rect = refs.canvas.getBoundingClientRect(); const model = solve();
    if (!model.duration) { setState({ time: 0, running: false }); return; }
    const localX = event.clientX - rect.left; const localY = event.clientY - rect.top; let targetTime = 0;
    if (model.kind === "gravity") {
      const top = 62; const ground = rect.height - 48; const dropRatio = clamp((localY - top) / Math.max(1, ground - top), 0, 1);
      targetTime = positiveRoot(model.h0 * dropRatio, model.v0, G);
    } else if (model.kind === "rough") {
      const x0 = 60; const y0 = 72; const x1 = rect.width - 52; const y1 = rect.height - 54; const dx = x1 - x0; const dy = y1 - y0;
      const pathRatio = clamp(((localX - x0) * dx + (localY - y0) * dy) / (dx ** 2 + dy ** 2), 0, model.endDistance / RAMP_LENGTH);
      targetTime = positiveRoot(RAMP_LENGTH * pathRatio, model.v0, model.acceleration);
    } else {
      const equilibriumX = rect.width - 105; const travel = Math.min(rect.width * 0.46, 290); const progress = clamp((localX - (equilibriumX - travel)) / travel, 0, 1); const targetCompression = model.x0 * (1 - progress);
      let low = 0; let high = model.duration;
      for (let index = 0; index < 50; index += 1) { const middle = (low + high) / 2; if (sampleAt(middle).x > targetCompression) low = middle; else high = middle; }
      targetTime = (low + high) / 2;
    }
    setState({ time: targetTime, running: false });
  }
  refs.canvas.addEventListener("pointerdown", (event) => { state.dragging = true; refs.canvas.setPointerCapture(event.pointerId); timeFromPointer(event); }); refs.canvas.addEventListener("pointermove", (event) => { if (state.dragging) timeFromPointer(event); }); refs.canvas.addEventListener("pointerup", (event) => { state.dragging = false; refs.canvas.releasePointerCapture(event.pointerId); }); refs.canvas.addEventListener("pointercancel", () => { state.dragging = false; }); window.addEventListener("resize", render);
  let lastFrame = performance.now(); function frame(now) { const delta = Math.min(0.05, (now - lastFrame) / 1000); lastFrame = now; if (state.running) { state.time += delta * state.rate; const duration = solve().duration; if (state.time >= duration) { state.time = duration; state.running = false; } render(); } requestAnimationFrame(frame); }
  window.mechanicalEnergyLab = { solve: (input = {}) => solve({ ...state, ...input }), sampleAt: (time, input = {}) => sampleAt(time, { ...state, ...input }), getState: () => ({ ...state }), setState, setMode };
  render(); requestAnimationFrame(frame);
})();
