(function () {
  "use strict";

  const MEDIA = [
    { id: "air", name: "空气", n: 1.0, tint: "#6e7b76" },
    { id: "water", name: "水", n: 1.333, tint: "#4da6b8" },
    { id: "acrylic", name: "亚克力", n: 1.49, tint: "#bd8bd8" },
    { id: "glass", name: "玻璃", n: 1.5, tint: "#70b9c7" },
    { id: "flint", name: "火石玻璃", n: 1.65, tint: "#c58fdf" },
    { id: "diamond", name: "金刚石", n: 2.42, tint: "#79d8c2" }
  ];

  const LIGHTS = {
    650: { color: "#ff5d4b", glow: "rgba(255, 93, 75, 0.34)" },
    589: { color: "#ffd34d", glow: "rgba(255, 211, 77, 0.32)" },
    532: { color: "#72df79", glow: "rgba(114, 223, 121, 0.32)" },
    450: { color: "#5da9ff", glow: "rgba(93, 169, 255, 0.34)" }
  };

  const MODES = {
    refraction: { title: "折射定律", goal: "改变入射角，观察光线如何偏折" },
    critical: { title: "临界状态", goal: "找到折射光恰好沿界面传播的位置" },
    total: { title: "全反射", goal: "判断折射光消失需要同时满足哪些条件" }
  };

  const GUIDE_STEPS = [
    { index: "01", title: "先预测", prompt: "光从空气进入玻璃时，折射光会偏向法线还是远离法线？" },
    { index: "02", title: "再操作", prompt: "拖动光源改变入射角，观察光路、读数和曲线是否同步变化。" },
    { index: "03", title: "用数据验证", prompt: "记录多组角度，检查正弦关系图中的数据是否落在理论直线上。" }
  ];

  const state = {
    angle: 35,
    medium1: "air",
    medium2: "glass",
    wavelength: 650,
    mode: "refraction",
    guideStep: 0,
    showNormal: true,
    showAngles: true,
    showReflection: true,
    showCritical: true,
    samples: []
  };

  const refs = {
    canvas: document.getElementById("refractionCanvas"),
    angleChart: document.getElementById("angleChart"),
    sineChart: document.getElementById("sineChart"),
    angleInput: document.getElementById("angleInput"),
    angleNumber: document.getElementById("angleNumber"),
    angleValue: document.getElementById("angleValue"),
    medium1Select: document.getElementById("medium1Select"),
    medium2Select: document.getElementById("medium2Select"),
    n1Value: document.getElementById("n1Value"),
    n2Value: document.getElementById("n2Value"),
    wavelengthValue: document.getElementById("wavelengthValue"),
    incidentMetric: document.getElementById("incidentMetric"),
    refractedMetric: document.getElementById("refractedMetric"),
    criticalMetric: document.getElementById("criticalMetric"),
    relativeMetric: document.getElementById("relativeMetric"),
    lawDelta: document.getElementById("lawDelta"),
    lawCheckText: document.getElementById("lawCheckText"),
    stateBadge: document.getElementById("stateBadge"),
    modeTitle: document.getElementById("modeTitle"),
    modeGoal: document.getElementById("modeGoal"),
    curveStatus: document.getElementById("curveStatus"),
    stepIndex: document.getElementById("stepIndex"),
    stepTitle: document.getElementById("stepTitle"),
    stepPrompt: document.getElementById("stepPrompt"),
    formulaLabel: document.getElementById("formulaLabel"),
    formulaReadout: document.getElementById("formulaReadout"),
    resetButton: document.getElementById("resetButton"),
    criticalButton: document.getElementById("criticalButton"),
    recordButton: document.getElementById("recordButton"),
    clearDataButton: document.getElementById("clearDataButton"),
    swapMediaButton: document.getElementById("swapMediaButton"),
    guideButton: document.getElementById("guideButton"),
    stepButton: document.getElementById("stepButton"),
    focusButton: document.getElementById("focusButton"),
    fullscreenButton: document.getElementById("fullscreenButton"),
    guideDialog: document.getElementById("guideDialog"),
    normalToggle: document.getElementById("showNormalToggle"),
    anglesToggle: document.getElementById("showAnglesToggle"),
    reflectionToggle: document.getElementById("showReflectionToggle"),
    criticalToggle: document.getElementById("showCriticalToggle"),
    modeButtons: Array.from(document.querySelectorAll("[data-mode]")),
    directionButtons: Array.from(document.querySelectorAll("[data-direction]")),
    guideButtons: Array.from(document.querySelectorAll("[data-guide-step]")),
    colorButtons: Array.from(document.querySelectorAll("[data-wavelength]")),
    nudgeButtons: Array.from(document.querySelectorAll("[data-nudge]"))
  };

  const apparatus = { ctx: refs.canvas.getContext("2d"), width: 0, height: 0, dpr: 1, source: null, origin: null };
  const anglePlot = { ctx: refs.angleChart.getContext("2d"), width: 0, height: 0, dpr: 1 };
  const sinePlot = { ctx: refs.sineChart.getContext("2d"), width: 0, height: 0, dpr: 1 };
  let draggingSource = false;

  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function toRad(value) { return (value * Math.PI) / 180; }
  function toDeg(value) { return (value * 180) / Math.PI; }
  function medium(id) { return MEDIA.find((item) => item.id === id) || MEDIA[0]; }

  function calculate(sourceState = state) {
    const n1 = medium(sourceState.medium1).n;
    const n2 = medium(sourceState.medium2).n;
    const theta1 = clamp(Number(sourceState.angle), 0, 89);
    const theta1Rad = toRad(theta1);
    const sin2 = (n1 / n2) * Math.sin(theta1Rad);
    const total = sin2 > 1 + 1e-10;
    const theta2 = total ? null : toDeg(Math.asin(clamp(sin2, -1, 1)));
    const critical = n1 > n2 ? toDeg(Math.asin(n2 / n1)) : null;
    const atCritical = critical != null && Math.abs(theta1 - critical) <= 0.15;
    const lhs = n1 * Math.sin(theta1Rad);
    const rhs = theta2 == null ? null : n2 * Math.sin(toRad(theta2));
    const delta = rhs == null ? null : Math.abs(lhs - rhs);
    return { n1, n2, theta1, theta1Rad, theta2, critical, total, atCritical, lhs, rhs, delta, relative: n2 / n1 };
  }

  function getPhysicalMode(derived) {
    if (derived.total) return "total";
    if (derived.atCritical) return "critical";
    return "refraction";
  }

  function setupCanvas(canvas, surface) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    if (surface.width === width && surface.height === height && surface.dpr === dpr) return;
    surface.width = width;
    surface.height = height;
    surface.dpr = dpr;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    surface.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function drawLine(ctx, from, to, color, width, dash) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash || []);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
  }

  function drawBeam(ctx, from, to, light, intensity) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.globalCompositeOperation = "screen";
    [16, 8, 3].forEach((width, index) => {
      ctx.strokeStyle = index === 2 ? light.color : light.glow;
      ctx.globalAlpha = index === 0 ? 0.18 * intensity : index === 1 ? 0.4 * intensity : 0.95 * intensity;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawArrowHead(ctx, from, to, color) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const point = { x: from.x + (to.x - from.x) * 0.58, y: from.y + (to.y - from.y) * 0.58 };
    ctx.save();
    ctx.fillStyle = color;
    ctx.translate(point.x, point.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(-5, -4);
    ctx.lineTo(-5, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawLabel(ctx, text, x, y, color, align) {
    ctx.save();
    ctx.fillStyle = color || "#f0f1e8";
    ctx.font = "600 10px Avenir Next, PingFang SC, sans-serif";
    ctx.textAlign = align || "left";
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawArcLabel(ctx, origin, angle, radius, side, text, color) {
    const start = side === "left" ? -Math.PI / 2 : Math.PI / 2;
    const end = side === "left" ? start - angle : start - angle;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (side === "left") ctx.arc(origin.x, origin.y, radius, -Math.PI / 2, -Math.PI / 2 - angle, true);
    else ctx.arc(origin.x, origin.y, radius, Math.PI / 2, Math.PI / 2 - angle, true);
    ctx.stroke();
    const mid = side === "left" ? -Math.PI / 2 - angle / 2 : Math.PI / 2 - angle / 2;
    drawLabel(ctx, text, origin.x + Math.cos(mid) * (radius + 14), origin.y + Math.sin(mid) * (radius + 14), color, "center");
    ctx.restore();
  }

  function drawApparatus() {
    setupCanvas(refs.canvas, apparatus);
    const ctx = apparatus.ctx;
    const w = apparatus.width;
    const h = apparatus.height;
    const d = calculate();
    const m1 = medium(state.medium1);
    const m2 = medium(state.medium2);
    const light = LIGHTS[state.wavelength];
    const origin = { x: w * 0.56, y: h * 0.52 };
    const radius = Math.min(w * 0.31, h * 0.39);
    const rayLength = Math.min(radius * 1.22, w * 0.39);
    apparatus.origin = origin;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0d100f";
    ctx.fillRect(0, 0, w, h);

    const upperGradient = ctx.createLinearGradient(0, 0, 0, origin.y);
    upperGradient.addColorStop(0, "rgba(22, 27, 24, 0.98)");
    upperGradient.addColorStop(1, `${m1.tint}18`);
    ctx.fillStyle = upperGradient;
    ctx.fillRect(0, 0, w, origin.y);

    const lowerGradient = ctx.createLinearGradient(0, origin.y, 0, h);
    lowerGradient.addColorStop(0, `${m2.tint}2b`);
    lowerGradient.addColorStop(1, "rgba(13, 16, 15, 0.98)");
    ctx.fillStyle = lowerGradient;
    ctx.fillRect(0, origin.y, w, h - origin.y);

    ctx.save();
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, radius, 0, Math.PI, false);
    ctx.closePath();
    const glassGradient = ctx.createRadialGradient(origin.x - radius * 0.25, origin.y + radius * 0.12, radius * 0.08, origin.x, origin.y, radius);
    glassGradient.addColorStop(0, `${m2.tint}50`);
    glassGradient.addColorStop(0.7, `${m2.tint}26`);
    glassGradient.addColorStop(1, `${m2.tint}0c`);
    ctx.fillStyle = glassGradient;
    ctx.fill();
    ctx.strokeStyle = `${m2.tint}aa`;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(240, 241, 232, 0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, radius * 1.04, 0, Math.PI * 2);
    ctx.stroke();
    for (let degree = 0; degree < 360; degree += 5) {
      const angle = toRad(degree - 90);
      const major = degree % 10 === 0;
      const inner = radius * (major ? 0.94 : 0.975);
      ctx.strokeStyle = major ? "rgba(240, 241, 232, 0.38)" : "rgba(240, 241, 232, 0.17)";
      ctx.beginPath();
      ctx.moveTo(origin.x + Math.cos(angle) * inner, origin.y + Math.sin(angle) * inner);
      ctx.lineTo(origin.x + Math.cos(angle) * radius * 1.04, origin.y + Math.sin(angle) * radius * 1.04);
      ctx.stroke();
    }
    ctx.restore();

    for (let degree = 0; degree <= 90; degree += 15) {
      const angle = toRad(degree - 90);
      drawLabel(ctx, String(degree), origin.x + Math.cos(angle) * radius * 0.86, origin.y + Math.sin(angle) * radius * 0.86 + 3, "rgba(240,241,232,.5)", "center");
      if (degree !== 0 && degree !== 90) drawLabel(ctx, String(degree), origin.x - Math.cos(angle) * radius * 0.86, origin.y + Math.sin(angle) * radius * 0.86 + 3, "rgba(240,241,232,.5)", "center");
    }

    drawLine(ctx, { x: origin.x - radius * 1.18, y: origin.y }, { x: origin.x + radius * 1.18, y: origin.y }, "rgba(240,241,232,.42)", 1.2);
    if (state.showNormal) drawLine(ctx, { x: origin.x, y: origin.y - radius * 1.16 }, { x: origin.x, y: origin.y + radius * 1.16 }, "rgba(181,140,229,.72)", 1.2, [5, 5]);

    if (state.showCritical && d.critical != null) {
      const criticalRad = toRad(d.critical);
      const criticalSource = { x: origin.x - Math.sin(criticalRad) * rayLength, y: origin.y - Math.cos(criticalRad) * rayLength };
      drawLine(ctx, criticalSource, origin, "rgba(242,184,75,.45)", 1, [4, 5]);
      drawLabel(ctx, `临界 ${d.critical.toFixed(1)}°`, criticalSource.x - 4, criticalSource.y - 8, "rgba(242,184,75,.78)", "center");
    }

    const source = { x: origin.x - Math.sin(d.theta1Rad) * rayLength, y: origin.y - Math.cos(d.theta1Rad) * rayLength };
    apparatus.source = source;
    drawBeam(ctx, source, origin, light, 1);
    drawArrowHead(ctx, source, origin, light.color);

    if (state.showReflection) {
      const reflected = { x: origin.x + Math.sin(d.theta1Rad) * rayLength * 0.82, y: origin.y - Math.cos(d.theta1Rad) * rayLength * 0.82 };
      drawBeam(ctx, origin, reflected, light, d.total ? 1 : 0.42);
      drawArrowHead(ctx, origin, reflected, light.color);
      drawLabel(ctx, "反射", reflected.x - 4, reflected.y - 8, d.total ? light.color : "rgba(240,241,232,.52)", "center");
    }

    if (!d.total) {
      const theta2Rad = toRad(d.theta2 || 0);
      const transmittedLength = Math.min(rayLength * 1.02, h - origin.y - 14);
      const transmitted = { x: origin.x + Math.sin(theta2Rad) * transmittedLength, y: origin.y + Math.cos(theta2Rad) * transmittedLength };
      drawBeam(ctx, origin, transmitted, light, 0.92);
      drawArrowHead(ctx, origin, transmitted, light.color);
      drawLabel(ctx, d.atCritical ? "沿界面传播" : "折射", transmitted.x - 2, transmitted.y + (d.atCritical ? -9 : 14), light.color, "center");
    } else {
      ctx.save();
      ctx.fillStyle = "rgba(255,93,75,.1)";
      ctx.beginPath();
      ctx.arc(origin.x, origin.y, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      drawLabel(ctx, "折射光消失", origin.x + 50, origin.y + 28, "#ff5d4b");
    }

    ctx.save();
    ctx.translate(source.x, source.y);
    ctx.rotate(d.theta1Rad);
    ctx.fillStyle = "#303731";
    roundedRect(ctx, -12, -27, 24, 42, 4);
    ctx.fill();
    ctx.strokeStyle = "rgba(240,241,232,.48)";
    ctx.stroke();
    ctx.fillStyle = light.color;
    ctx.fillRect(-7, 11, 14, 4);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(source.x, source.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = light.color;
    ctx.fill();
    ctx.strokeStyle = "#f0f1e8";
    ctx.lineWidth = 2;
    ctx.stroke();

    if (state.showAngles) {
      drawArcLabel(ctx, origin, d.theta1Rad, 42, "left", `θ₁ ${d.theta1.toFixed(1)}°`, light.color);
      if (!d.total && d.theta2 != null) drawArcLabel(ctx, origin, toRad(d.theta2), 62, "right", `θ₂ ${d.theta2.toFixed(1)}°`, "#64c7d9");
    }

    drawLabel(ctx, `${m1.name}  n₁=${d.n1.toFixed(3)}`, 16, 23, "rgba(240,241,232,.72)");
    drawLabel(ctx, `${m2.name}  n₂=${d.n2.toFixed(3)}`, 16, h - 16, "rgba(240,241,232,.72)");
    if (state.showNormal) drawLabel(ctx, "法线", origin.x + 8, origin.y - radius * 1.05, "#b58ce5");
  }

  function chartFrame(surface, xLabel, yLabel) {
    const ctx = surface.ctx;
    const w = surface.width;
    const h = surface.height;
    const pad = { left: 34, right: 12, top: 12, bottom: 25 };
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(12,15,13,.72)";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(240,241,232,.1)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i += 1) {
      const x = pad.left + ((w - pad.left - pad.right) * i) / 5;
      const y = pad.top + ((h - pad.top - pad.bottom) * i) / 5;
      ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, h - pad.bottom); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
    }
    ctx.fillStyle = "rgba(240,241,232,.55)";
    ctx.font = "8px Avenir Next, PingFang SC, sans-serif";
    ctx.fillText(yLabel, 5, 11);
    ctx.textAlign = "right";
    ctx.fillText(xLabel, w - 7, h - 6);
    ctx.textAlign = "left";
    return { pad, width: w - pad.left - pad.right, height: h - pad.top - pad.bottom };
  }

  function drawAngleChart() {
    setupCanvas(refs.angleChart, anglePlot);
    const ctx = anglePlot.ctx;
    const frame = chartFrame(anglePlot, "θ₁ / °", "θ₂ / °");
    const d = calculate();
    const px = (value) => frame.pad.left + (value / 90) * frame.width;
    const py = (value) => frame.pad.top + frame.height - (value / 90) * frame.height;

    ctx.save();
    ctx.strokeStyle = "#64c7d9";
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    for (let angle = 0; angle <= 89; angle += 0.5) {
      const point = calculate({ ...state, angle });
      if (point.total || point.theta2 == null) continue;
      const x = px(angle);
      const y = py(point.theta2);
      if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
    }
    ctx.stroke();
    if (d.critical != null && state.showCritical) {
      ctx.strokeStyle = "rgba(255,93,75,.72)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(px(d.critical), frame.pad.top); ctx.lineTo(px(d.critical), frame.pad.top + frame.height); ctx.stroke();
      ctx.setLineDash([]);
    }
    if (!d.total && d.theta2 != null) {
      ctx.fillStyle = "#f2b84b";
      ctx.beginPath(); ctx.arc(px(d.theta1), py(d.theta2), 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(242,184,75,.3)";
      ctx.beginPath(); ctx.arc(px(d.theta1), py(d.theta2), 8, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = "rgba(240,241,232,.45)";
    ctx.font = "8px Avenir Next, sans-serif";
    [0, 30, 60, 90].forEach((value) => { ctx.fillText(String(value), px(value) - 4, frame.pad.top + frame.height + 13); ctx.fillText(String(value), 12, py(value) + 3); });
    ctx.restore();
  }

  function drawSineChart() {
    setupCanvas(refs.sineChart, sinePlot);
    const ctx = sinePlot.ctx;
    const frame = chartFrame(sinePlot, "sin θ₂", "sin θ₁");
    const d = calculate();
    const px = (value) => frame.pad.left + value * frame.width;
    const py = (value) => frame.pad.top + frame.height - value * frame.height;
    const slope = d.n2 / d.n1;

    ctx.save();
    const maxX = Math.min(1, 1 / slope);
    ctx.strokeStyle = "#69d18e";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px(0), py(0)); ctx.lineTo(px(maxX), py(slope * maxX)); ctx.stroke();

    const relevantSamples = state.samples.filter((sample) => sample.medium1 === state.medium1 && sample.medium2 === state.medium2);
    relevantSamples.forEach((sample) => {
      ctx.fillStyle = "rgba(240,241,232,.78)";
      ctx.beginPath(); ctx.arc(px(sample.sin2), py(sample.sin1), 3.2, 0, Math.PI * 2); ctx.fill();
    });
    if (!d.total && d.theta2 != null) {
      ctx.fillStyle = "#f2b84b";
      ctx.beginPath(); ctx.arc(px(Math.sin(toRad(d.theta2))), py(Math.sin(d.theta1Rad)), 4.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "rgba(240,241,232,.45)";
    ctx.font = "8px Avenir Next, sans-serif";
    [0, 0.5, 1].forEach((value) => { ctx.fillText(value.toFixed(1), px(value) - 5, frame.pad.top + frame.height + 13); ctx.fillText(value.toFixed(1), 10, py(value) + 3); });
    ctx.fillStyle = "#69d18e";
    ctx.font = "700 8px ui-monospace, monospace";
    ctx.fillText(`斜率 n₂/n₁ = ${slope.toFixed(3)}`, frame.pad.left + 8, frame.pad.top + 13);
    ctx.restore();
  }

  function updateRangeProgress() {
    const min = Number(refs.angleInput.min);
    const max = Number(refs.angleInput.max);
    const progress = ((state.angle - min) / (max - min)) * 100;
    refs.angleInput.style.setProperty("--range-progress", `${progress}%`);
  }

  function updateDirectionButtons() {
    refs.directionButtons.forEach((button) => {
      const active = (button.dataset.direction === "air-glass" && state.medium1 === "air" && state.medium2 === "glass") ||
        (button.dataset.direction === "glass-air" && state.medium1 === "glass" && state.medium2 === "air");
      button.classList.toggle("is-active", active);
    });
  }

  function sync() {
    const d = calculate();
    const m1 = medium(state.medium1);
    const m2 = medium(state.medium2);
    const physicalMode = getPhysicalMode(d);
    const mode = MODES[physicalMode];
    const guide = GUIDE_STEPS[state.guideStep];
    const status = d.total ? "发生全反射" : d.atCritical ? "达到临界状态" : "发生折射";

    refs.angleInput.value = state.angle;
    refs.angleNumber.value = state.angle;
    refs.angleValue.textContent = `${state.angle.toFixed(1)}°`;
    refs.medium1Select.value = state.medium1;
    refs.medium2Select.value = state.medium2;
    refs.n1Value.textContent = d.n1.toFixed(3);
    refs.n2Value.textContent = d.n2.toFixed(3);
    refs.wavelengthValue.textContent = `${state.wavelength} nm`;
    refs.incidentMetric.textContent = `${d.theta1.toFixed(1)}°`;
    refs.refractedMetric.textContent = d.theta2 == null ? "—" : `${d.theta2.toFixed(1)}°`;
    refs.criticalMetric.textContent = d.critical == null ? "—" : `${d.critical.toFixed(1)}°`;
    refs.relativeMetric.textContent = d.relative.toFixed(3);
    refs.lawDelta.textContent = d.delta == null ? "无折射解" : `Δ = ${d.delta.toFixed(4)}`;
    refs.lawCheckText.textContent = d.total ? "超过临界条件" : "两侧计算值一致";
    refs.stateBadge.textContent = status;
    refs.stateBadge.classList.toggle("is-critical", d.atCritical);
    refs.stateBadge.classList.toggle("is-total", d.total);
    refs.modeTitle.textContent = mode.title;
    refs.modeGoal.textContent = mode.goal;
    refs.curveStatus.textContent = d.critical == null ? "连续折射" : `θc ${d.critical.toFixed(1)}°`;
    refs.stepIndex.textContent = guide.index;
    refs.stepTitle.textContent = guide.title;
    refs.stepPrompt.textContent = guide.prompt;
    refs.formulaLabel.textContent = d.total ? "全反射条件" : "当前关系";
    refs.formulaReadout.innerHTML = d.total
      ? `n<sub>1</sub> &gt; n<sub>2</sub>, ${d.theta1.toFixed(1)}° &gt; ${d.critical.toFixed(1)}°`
      : `${d.n1.toFixed(3)} sin ${d.theta1.toFixed(1)}° = ${d.n2.toFixed(3)} sin ${d.theta2.toFixed(1)}°`;
    refs.criticalButton.disabled = false;
    refs.recordButton.disabled = d.total;
    refs.recordButton.textContent = d.total ? "当前无折射数据" : `记录数据${state.samples.length ? ` (${state.samples.length})` : ""}`;
    refs.normalToggle.checked = state.showNormal;
    refs.anglesToggle.checked = state.showAngles;
    refs.reflectionToggle.checked = state.showReflection;
    refs.criticalToggle.checked = state.showCritical;

    refs.modeButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.mode === physicalMode));
    refs.guideButtons.forEach((button) => button.classList.toggle("is-active", Number(button.dataset.guideStep) === state.guideStep));
    refs.colorButtons.forEach((button) => {
      const active = Number(button.dataset.wavelength) === state.wavelength;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-checked", String(active));
    });
    updateDirectionButtons();
    updateRangeProgress();
    drawApparatus();
    drawAngleChart();
    drawSineChart();
  }

  function setAngle(value) {
    const next = Number(value);
    if (!Number.isFinite(next)) return;
    state.angle = Math.round(clamp(next, 0, 89) * 2) / 2;
    state.mode = getPhysicalMode(calculate());
    sync();
  }

  function clearSamples() { state.samples = []; sync(); }

  function setMedia(first, second) {
    state.medium1 = first;
    state.medium2 = second;
    state.samples = [];
    const d = calculate();
    if (d.total) state.angle = Math.max(0, (d.critical || 40) - 6);
    state.mode = "refraction";
    sync();
  }

  function jumpToCritical() {
    if (calculate().critical == null) {
      const first = state.medium2 === "air" ? state.medium1 : state.medium2;
      const second = state.medium1 === "air" ? state.medium1 : "air";
      state.medium1 = medium(first).n > medium(second).n ? first : "glass";
      state.medium2 = medium(first).n > medium(second).n ? second : "air";
      state.samples = [];
    }
    state.angle = calculate().critical;
    state.mode = "critical";
    sync();
  }

  function setMode(mode) {
    state.mode = mode;
    if (mode === "critical") return jumpToCritical();
    if (mode === "total") {
      if (calculate().critical == null) setMedia("glass", "air");
      state.mode = "total";
      state.angle = Math.min(89, Math.ceil((calculate().critical || 41.8) + 8));
    } else if (calculate().total) {
      state.angle = Math.max(0, Math.floor((calculate().critical || 40) - 5));
    }
    sync();
  }

  function recordSample() {
    const d = calculate();
    if (d.total || d.theta2 == null) return;
    const sample = {
      medium1: state.medium1,
      medium2: state.medium2,
      theta1: d.theta1,
      theta2: d.theta2,
      sin1: Math.sin(d.theta1Rad),
      sin2: Math.sin(toRad(d.theta2))
    };
    const duplicate = state.samples.some((item) => item.medium1 === sample.medium1 && item.medium2 === sample.medium2 && Math.abs(item.theta1 - sample.theta1) < 0.1);
    if (!duplicate) state.samples.push(sample);
    state.guideStep = 2;
    sync();
  }

  function pointerPosition(event) {
    const rect = refs.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function updateAngleFromPointer(event) {
    if (!apparatus.origin) return;
    const point = pointerPosition(event);
    const dx = Math.max(0.001, apparatus.origin.x - point.x);
    const dy = Math.max(0.001, apparatus.origin.y - point.y);
    setAngle(toDeg(Math.atan2(dx, dy)));
  }

  function populateMedia() {
    const options = MEDIA.map((item) => `<option value="${item.id}">${item.name}  ${item.n.toFixed(3)}</option>`).join("");
    refs.medium1Select.innerHTML = options;
    refs.medium2Select.innerHTML = options;
  }

  refs.angleInput.addEventListener("input", (event) => setAngle(event.target.value));
  refs.angleNumber.addEventListener("input", (event) => setAngle(event.target.value));
  refs.nudgeButtons.forEach((button) => button.addEventListener("click", () => setAngle(state.angle + Number(button.dataset.nudge))));
  refs.medium1Select.addEventListener("change", () => setMedia(refs.medium1Select.value, state.medium2));
  refs.medium2Select.addEventListener("change", () => setMedia(state.medium1, refs.medium2Select.value));
  refs.swapMediaButton.addEventListener("click", () => setMedia(state.medium2, state.medium1));
  refs.directionButtons.forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.direction === "glass-air") setMedia("glass", "air");
    else setMedia("air", "glass");
  }));
  refs.modeButtons.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
  refs.guideButtons.forEach((button) => button.addEventListener("click", () => { state.guideStep = Number(button.dataset.guideStep); sync(); }));
  refs.colorButtons.forEach((button) => button.addEventListener("click", () => { state.wavelength = Number(button.dataset.wavelength); sync(); }));
  [
    [refs.normalToggle, "showNormal"],
    [refs.anglesToggle, "showAngles"],
    [refs.reflectionToggle, "showReflection"],
    [refs.criticalToggle, "showCritical"]
  ].forEach(([control, key]) => control.addEventListener("change", () => { state[key] = control.checked; sync(); }));

  refs.criticalButton.addEventListener("click", jumpToCritical);
  refs.recordButton.addEventListener("click", recordSample);
  refs.clearDataButton.addEventListener("click", clearSamples);
  refs.resetButton.addEventListener("click", () => {
    Object.assign(state, { angle: 35, medium1: "air", medium2: "glass", wavelength: 650, mode: "refraction", guideStep: 0, showNormal: true, showAngles: true, showReflection: true, showCritical: true, samples: [] });
    sync();
  });

  refs.guideButton.addEventListener("click", () => refs.guideDialog.showModal());
  refs.stepButton.addEventListener("click", () => { state.guideStep = (state.guideStep + 1) % GUIDE_STEPS.length; sync(); });
  refs.focusButton.addEventListener("click", () => {
    const active = document.body.classList.toggle("focus-mode");
    refs.focusButton.setAttribute("aria-pressed", String(active));
    requestAnimationFrame(sync);
  });
  refs.fullscreenButton.addEventListener("click", () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  });

  refs.canvas.tabIndex = 0;
  refs.canvas.addEventListener("pointerdown", (event) => {
    if (!apparatus.source) return;
    const point = pointerPosition(event);
    const distance = Math.hypot(point.x - apparatus.source.x, point.y - apparatus.source.y);
    if (distance > 34) return;
    draggingSource = true;
    try { refs.canvas.setPointerCapture?.(event.pointerId); } catch (error) { /* Synthetic test events may not have a capture target. */ }
    updateAngleFromPointer(event);
  });
  refs.canvas.addEventListener("pointermove", (event) => { if (draggingSource) updateAngleFromPointer(event); });
  refs.canvas.addEventListener("pointerup", () => { draggingSource = false; });
  refs.canvas.addEventListener("pointercancel", () => { draggingSource = false; });
  refs.canvas.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") { event.preventDefault(); setAngle(state.angle - 0.5); }
    if (event.key === "ArrowRight" || event.key === "ArrowUp") { event.preventDefault(); setAngle(state.angle + 0.5); }
  });

  const resizeObserver = new ResizeObserver(() => requestAnimationFrame(sync));
  [refs.canvas, refs.angleChart, refs.sineChart].forEach((canvas) => resizeObserver.observe(canvas));

  window.refractionLab = {
    calculate: (input) => calculate({ ...state, ...(input || {}) }),
    getState: () => JSON.parse(JSON.stringify(state)),
    setState: (patch) => { Object.assign(state, patch || {}); sync(); },
    recordSample
  };

  populateMedia();
  sync();
})();
