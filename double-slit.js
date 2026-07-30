(function () {
  "use strict";

  const MODES = {
    spacing: { title: "条纹间距", goal: "测量相邻亮纹之间的距离" },
    path: { title: "路程差", goal: "拖动探针，用路程差判断屏上明暗" },
    compare: { title: "参数规律", goal: "每次改变一个参数，建立条纹间距关系" }
  };

  const GUIDE_STEPS = [
    { index: "01", title: "先预测", prompt: "波长变长时，相邻亮纹会变密还是变疏？" },
    { index: "02", title: "再测量", prompt: "拖动屏上探针，比较亮纹、暗纹位置对应的 Δr/λ。" },
    { index: "03", title: "用图像验证", prompt: "记录不同波长下的 β，检查测量点是否落在理论直线上。" }
  ];

  const state = {
    wavelength: 600,
    slit: 0.3,
    slitWidth: 0.06,
    screen: 1.2,
    cursorRatio: 0,
    mode: "spacing",
    guideStep: 0,
    showRays: true,
    showWaves: true,
    showEnvelope: true,
    showLabels: true,
    samples: []
  };

  const refs = {
    canvas: document.getElementById("doubleSlitCanvas"),
    intensityChart: document.getElementById("intensityChart"),
    spacingChart: document.getElementById("spacingChart"),
    wavelengthInput: document.getElementById("wavelengthInput"),
    wavelengthNumber: document.getElementById("wavelengthNumber"),
    slitInput: document.getElementById("slitInput"),
    widthInput: document.getElementById("widthInput"),
    screenInput: document.getElementById("screenInput"),
    wavelengthValue: document.getElementById("wavelengthValue"),
    slitValue: document.getElementById("slitValue"),
    widthValue: document.getElementById("widthValue"),
    screenValue: document.getElementById("screenValue"),
    spacingMetric: document.getElementById("spacingMetric"),
    positionMetric: document.getElementById("positionMetric"),
    pathMetric: document.getElementById("pathMetric"),
    intensityMetric: document.getElementById("intensityMetric"),
    fringeOrder: document.getElementById("fringeOrder"),
    fringeState: document.getElementById("fringeState"),
    stateBadge: document.getElementById("stateBadge"),
    profileStatus: document.getElementById("profileStatus"),
    modeTitle: document.getElementById("modeTitle"),
    modeGoal: document.getElementById("modeGoal"),
    stepIndex: document.getElementById("stepIndex"),
    stepTitle: document.getElementById("stepTitle"),
    stepPrompt: document.getElementById("stepPrompt"),
    formulaLabel: document.getElementById("formulaLabel"),
    formulaReadout: document.getElementById("formulaReadout"),
    resetButton: document.getElementById("resetButton"),
    darkButton: document.getElementById("darkButton"),
    recordButton: document.getElementById("recordButton"),
    clearDataButton: document.getElementById("clearDataButton"),
    guideButton: document.getElementById("guideButton"),
    stepButton: document.getElementById("stepButton"),
    focusButton: document.getElementById("focusButton"),
    fullscreenButton: document.getElementById("fullscreenButton"),
    guideDialog: document.getElementById("guideDialog"),
    raysToggle: document.getElementById("showRaysToggle"),
    wavesToggle: document.getElementById("showWavesToggle"),
    envelopeToggle: document.getElementById("showEnvelopeToggle"),
    labelsToggle: document.getElementById("showLabelsToggle"),
    modeButtons: Array.from(document.querySelectorAll("[data-mode]")),
    guideButtons: Array.from(document.querySelectorAll("[data-guide-step]")),
    colorButtons: Array.from(document.querySelectorAll("[data-wavelength]")),
    nudgeButtons: Array.from(document.querySelectorAll("[data-nudge-target]"))
  };

  const apparatus = { ctx: refs.canvas.getContext("2d"), width: 0, height: 0, dpr: 1, screen: null };
  const intensityPlot = { ctx: refs.intensityChart.getContext("2d"), width: 0, height: 0, dpr: 1 };
  const spacingPlot = { ctx: refs.spacingChart.getContext("2d"), width: 0, height: 0, dpr: 1 };
  let draggingProbe = false;

  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function sinc(value) { return Math.abs(value) < 1e-9 ? 1 : Math.sin(value) / value; }

  function wavelengthColor(wavelength) {
    const stops = [
      [400, [118, 80, 220]], [450, [73, 117, 255]], [500, [66, 207, 210]],
      [540, [100, 221, 117]], [590, [255, 211, 77]], [650, [255, 93, 75]], [700, [205, 54, 54]]
    ];
    for (let index = 0; index < stops.length - 1; index += 1) {
      const current = stops[index];
      const next = stops[index + 1];
      if (wavelength <= next[0]) {
        const t = clamp((wavelength - current[0]) / (next[0] - current[0]), 0, 1);
        const rgb = current[1].map((value, channel) => Math.round(value + (next[1][channel] - value) * t));
        return { rgb, solid: `rgb(${rgb.join(",")})`, glow: `rgba(${rgb.join(",")},.34)` };
      }
    }
    return { rgb: stops.at(-1)[1], solid: "rgb(205,54,54)", glow: "rgba(205,54,54,.34)" };
  }

  function calculate(sourceState = state) {
    const lambda = sourceState.wavelength * 1e-9;
    const d = sourceState.slit * 1e-3;
    const a = sourceState.slitWidth * 1e-3;
    const L = sourceState.screen;
    const beta = (lambda * L) / d;
    const rangeMm = Math.max(8, beta * 1000 * 5);
    const yMm = clamp(sourceState.cursorRatio, -1, 1) * rangeMm;
    const y = yMm * 1e-3;
    const sinTheta = y / Math.sqrt(L * L + y * y);
    const delta = d * sinTheta;
    const pathWaves = delta / lambda;
    const interference = Math.cos(Math.PI * pathWaves) ** 2;
    const alpha = (Math.PI * a * sinTheta) / lambda;
    const envelope = sinc(alpha) ** 2;
    const intensity = interference * envelope;
    const nearestBright = Math.round(pathWaves);
    const brightDistance = Math.abs(pathWaves - nearestBright);
    const nearestDark = Math.round(pathWaves - 0.5) + 0.5;
    const darkDistance = Math.abs(pathWaves - nearestDark);
    const fringe = brightDistance <= 0.07 ? "bright" : darkDistance <= 0.07 ? "dark" : "transition";
    return { lambda, d, a, L, beta, betaMm: beta * 1000, rangeMm, yMm, y, sinTheta, delta, pathWaves, interference, envelope, intensity, nearestBright, nearestDark, fringe };
  }

  function intensityAt(yMm, sourceState = state) {
    const probe = calculate({ ...sourceState, cursorRatio: yMm / calculate(sourceState).rangeMm });
    return probe.intensity;
  }

  function setupCanvas(canvas, surface) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    if (surface.width === width && surface.height === height && surface.dpr === dpr) return;
    surface.width = width; surface.height = height; surface.dpr = dpr;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    surface.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawLine(ctx, from, to, color, width, dash) {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash || []);
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke(); ctx.restore();
  }

  function drawText(ctx, text, x, y, color, align, size, weight) {
    ctx.save(); ctx.fillStyle = color || "#f0f1e8"; ctx.textAlign = align || "left";
    ctx.font = `${weight || 600} ${size || 10}px Avenir Next, PingFang SC, sans-serif`; ctx.fillText(text, x, y); ctx.restore();
  }

  function drawBeam(ctx, from, to, light, strength) {
    ctx.save(); ctx.lineCap = "round"; ctx.globalCompositeOperation = "screen";
    [15, 7, 2].forEach((width, index) => {
      ctx.strokeStyle = index === 2 ? light.solid : light.glow;
      ctx.globalAlpha = index === 0 ? 0.14 * strength : index === 1 ? 0.34 * strength : 0.9 * strength;
      ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
    });
    ctx.restore();
  }

  function drawApparatus() {
    setupCanvas(refs.canvas, apparatus);
    const ctx = apparatus.ctx;
    const w = apparatus.width;
    const h = apparatus.height;
    const d = calculate();
    const light = wavelengthColor(state.wavelength);
    const centerY = h * 0.5;
    const source = { x: 50, y: centerY };
    const barrierX = w * 0.42;
    const screenX = w - 46;
    const slitVisual = Math.min(54, h * 0.19);
    const slitPoints = [{ x: barrierX, y: centerY - slitVisual / 2 }, { x: barrierX, y: centerY + slitVisual / 2 }];
    const screenTop = 22;
    const screenBottom = h - 22;
    const probeY = centerY + state.cursorRatio * (screenBottom - screenTop) * 0.5;
    apparatus.screen = { x: screenX, top: screenTop, bottom: screenBottom, probeY };

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0c0f0e"; ctx.fillRect(0, 0, w, h);
    const background = ctx.createLinearGradient(0, 0, w, 0);
    background.addColorStop(0, "rgba(33,42,38,.9)"); background.addColorStop(.48, "rgba(16,21,19,.95)"); background.addColorStop(1, "rgba(24,31,28,.9)");
    ctx.fillStyle = background; ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(240,241,232,.045)"; ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 26) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 26) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    drawLine(ctx, { x: 20, y: centerY }, { x: screenX, y: centerY }, "rgba(240,241,232,.18)", 1, [5, 5]);
    drawBeam(ctx, source, { x: barrierX - 8, y: centerY }, light, .7);

    ctx.save(); ctx.translate(source.x, source.y);
    ctx.fillStyle = "#303731"; ctx.fillRect(-23, -13, 35, 26); ctx.strokeStyle = "rgba(240,241,232,.45)"; ctx.strokeRect(-23, -13, 35, 26);
    ctx.fillStyle = light.solid; ctx.beginPath(); ctx.arc(13, 0, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();

    ctx.fillStyle = "#343b36"; ctx.fillRect(barrierX - 6, 14, 12, h - 28);
    slitPoints.forEach((point) => { ctx.clearRect(barrierX - 7, point.y - 7, 14, 14); ctx.fillStyle = light.glow; ctx.fillRect(barrierX - 2, point.y - 6, 4, 12); });

    if (state.showWaves) {
      slitPoints.forEach((point) => {
        for (let radius = 28; radius < screenX - barrierX; radius += 34) {
          ctx.save(); ctx.strokeStyle = light.glow; ctx.globalAlpha = .28; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(point.x, point.y, radius, -Math.PI / 2, Math.PI / 2); ctx.stroke(); ctx.restore();
        }
      });
    }

    const probe = { x: screenX, y: probeY };
    if (state.showRays) {
      slitPoints.forEach((point) => drawBeam(ctx, point, probe, light, .46));
      drawLine(ctx, slitPoints[0], probe, "rgba(240,241,232,.5)", 1, [5, 5]);
      drawLine(ctx, slitPoints[1], probe, "rgba(240,241,232,.5)", 1, [5, 5]);
    }

    ctx.fillStyle = "#111512"; ctx.fillRect(screenX - 12, screenTop - 4, 24, screenBottom - screenTop + 8);
    for (let pixel = Math.ceil(screenTop); pixel <= screenBottom; pixel += 1) {
      const ratio = (pixel - centerY) / ((screenBottom - screenTop) * .5);
      const yMm = ratio * d.rangeMm;
      const value = intensityAt(yMm);
      const alpha = .04 + value * .96;
      ctx.fillStyle = `rgba(${light.rgb.join(",")},${alpha})`;
      ctx.fillRect(screenX - 9, pixel, 18, 1.2);
    }
    ctx.strokeStyle = "rgba(240,241,232,.36)"; ctx.strokeRect(screenX - 12, screenTop - 4, 24, screenBottom - screenTop + 8);

    ctx.fillStyle = d.fringe === "dark" ? "#b58ce5" : d.fringe === "bright" ? "#64c7d9" : "#f4c44e";
    ctx.beginPath(); ctx.moveTo(screenX - 18, probeY); ctx.lineTo(screenX - 29, probeY - 7); ctx.lineTo(screenX - 29, probeY + 7); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(screenX, probeY, 5, 0, Math.PI * 2); ctx.fill();
    drawLine(ctx, { x: barrierX + 8, y: probeY }, { x: screenX - 16, y: probeY }, "rgba(181,140,229,.42)", 1, [4, 5]);

    if (state.showLabels) {
      drawText(ctx, "单色光源", 22, 24, "rgba(240,241,232,.65)");
      drawText(ctx, `双缝 d=${state.slit.toFixed(2)} mm`, barrierX, 24, "rgba(240,241,232,.65)", "center");
      drawText(ctx, "观察屏", screenX, 16, "rgba(240,241,232,.65)", "center");
      drawText(ctx, `y=${d.yMm.toFixed(2)} mm`, screenX - 20, clamp(probeY - 10, 16, h - 10), "#f0f1e8", "right");
      drawText(ctx, `λ=${state.wavelength} nm`, 22, h - 16, light.solid);
      drawText(ctx, `L=${state.screen.toFixed(2)} m`, (barrierX + screenX) / 2, h - 16, "rgba(240,241,232,.52)", "center");
    }
  }

  function chartFrame(surface, xLabel, yLabel) {
    const ctx = surface.ctx; const w = surface.width; const h = surface.height;
    const pad = { left: 36, right: 12, top: 12, bottom: 25 };
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = "rgba(12,15,13,.72)"; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(240,241,232,.1)"; ctx.lineWidth = 1;
    for (let index = 0; index <= 5; index += 1) {
      const x = pad.left + ((w - pad.left - pad.right) * index) / 5;
      const y = pad.top + ((h - pad.top - pad.bottom) * index) / 5;
      ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, h - pad.bottom); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
    }
    ctx.fillStyle = "rgba(240,241,232,.52)"; ctx.font = "8px Avenir Next, sans-serif";
    ctx.fillText(yLabel, 5, 11); ctx.textAlign = "right"; ctx.fillText(xLabel, w - 6, h - 6); ctx.textAlign = "left";
    return { pad, width: w - pad.left - pad.right, height: h - pad.top - pad.bottom };
  }

  function drawIntensityChart() {
    setupCanvas(refs.intensityChart, intensityPlot);
    const ctx = intensityPlot.ctx; const d = calculate(); const frame = chartFrame(intensityPlot, "y / mm", "I/I₀");
    const px = (yMm) => frame.pad.left + ((yMm + d.rangeMm) / (2 * d.rangeMm)) * frame.width;
    const py = (value) => frame.pad.top + frame.height - value * frame.height;
    const light = wavelengthColor(state.wavelength);
    ctx.save();
    if (state.showEnvelope) {
      ctx.strokeStyle = "rgba(181,140,229,.72)"; ctx.lineWidth = 1.4; ctx.setLineDash([4, 4]); ctx.beginPath();
      for (let index = 0; index <= 260; index += 1) {
        const yMm = -d.rangeMm + (2 * d.rangeMm * index) / 260;
        const probe = calculate({ ...state, cursorRatio: yMm / d.rangeMm });
        const x = px(yMm); const y = py(probe.envelope); if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.strokeStyle = light.solid; ctx.lineWidth = 2; ctx.beginPath();
    for (let index = 0; index <= 320; index += 1) {
      const yMm = -d.rangeMm + (2 * d.rangeMm * index) / 320;
      const x = px(yMm); const y = py(intensityAt(yMm)); if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = "rgba(244,196,78,.62)"; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(px(d.yMm), frame.pad.top); ctx.lineTo(px(d.yMm), frame.pad.top + frame.height); ctx.stroke();
    ctx.fillStyle = "#f4c44e"; ctx.beginPath(); ctx.arc(px(d.yMm), py(d.intensity), 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(240,241,232,.44)"; ctx.font = "8px Avenir Next, sans-serif";
    [-1, 0, 1].forEach((ratio) => ctx.fillText((ratio * d.rangeMm).toFixed(0), px(ratio * d.rangeMm) - 5, frame.pad.top + frame.height + 13));
    ctx.restore();
  }

  function drawSpacingChart() {
    setupCanvas(refs.spacingChart, spacingPlot);
    const ctx = spacingPlot.ctx; const d = calculate(); const frame = chartFrame(spacingPlot, "λ / nm", "β / mm");
    const maxBeta = (700e-9 * state.screen / (state.slit * 1e-3)) * 1000 * 1.12;
    const px = (lambda) => frame.pad.left + ((lambda - 400) / 300) * frame.width;
    const py = (beta) => frame.pad.top + frame.height - (beta / maxBeta) * frame.height;
    ctx.save(); ctx.strokeStyle = "#64c7d9"; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(px(400), py((400e-9 * state.screen / (state.slit * 1e-3)) * 1000));
    ctx.lineTo(px(700), py((700e-9 * state.screen / (state.slit * 1e-3)) * 1000)); ctx.stroke();
    state.samples.filter((sample) => Math.abs(sample.slit - state.slit) < 1e-6 && Math.abs(sample.screen - state.screen) < 1e-6).forEach((sample) => {
      ctx.fillStyle = "rgba(240,241,232,.78)"; ctx.beginPath(); ctx.arc(px(sample.wavelength), py(sample.betaMm), 3.2, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = "#f4c44e"; ctx.beginPath(); ctx.arc(px(state.wavelength), py(d.betaMm), 4.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(240,241,232,.44)"; ctx.font = "8px Avenir Next, sans-serif";
    [400, 550, 700].forEach((value) => ctx.fillText(String(value), px(value) - 9, frame.pad.top + frame.height + 13));
    ctx.fillStyle = "#64c7d9"; ctx.font = "700 8px ui-monospace, monospace"; ctx.fillText(`斜率 L/d = ${(state.screen / (state.slit * 1e-3)).toFixed(0)}`, frame.pad.left + 8, frame.pad.top + 13);
    ctx.restore();
  }

  function setRangeProgress(input, value) {
    const min = Number(input.min); const max = Number(input.max);
    input.style.setProperty("--range-progress", `${((value - min) / (max - min)) * 100}%`);
  }

  function sync() {
    const d = calculate(); const mode = MODES[state.mode]; const guide = GUIDE_STEPS[state.guideStep];
    const classification = d.fringe === "bright" ? "亮纹" : d.fringe === "dark" ? "暗纹" : "过渡区";
    const order = d.fringe === "dark" ? d.nearestDark : d.nearestBright;
    refs.wavelengthInput.value = state.wavelength; refs.wavelengthNumber.value = state.wavelength;
    refs.slitInput.value = state.slit; refs.widthInput.value = state.slitWidth; refs.screenInput.value = state.screen;
    refs.wavelengthValue.textContent = `${state.wavelength} nm`; refs.slitValue.textContent = `${state.slit.toFixed(2)} mm`; refs.widthValue.textContent = `${state.slitWidth.toFixed(3)} mm`; refs.screenValue.textContent = `${state.screen.toFixed(2)} m`;
    refs.spacingMetric.textContent = `${d.betaMm.toFixed(2)} mm`; refs.positionMetric.textContent = `${d.yMm.toFixed(2)} mm`; refs.pathMetric.textContent = d.pathWaves.toFixed(3); refs.intensityMetric.textContent = d.intensity.toFixed(3);
    refs.fringeOrder.textContent = d.fringe === "transition" ? `Δr/λ = ${d.pathWaves.toFixed(2)}` : `${d.fringe === "dark" ? "k + 1/2" : "m"} = ${order.toFixed(d.fringe === "dark" ? 1 : 0)}`;
    refs.fringeState.textContent = d.fringe === "bright" ? "相长干涉 · 亮纹" : d.fringe === "dark" ? "相消干涉 · 暗纹" : "相位正在过渡";
    refs.stateBadge.textContent = classification; refs.stateBadge.classList.toggle("is-dark", d.fringe === "dark"); refs.stateBadge.classList.toggle("is-transition", d.fringe === "transition");
    refs.profileStatus.textContent = state.showEnvelope ? "含衍射包络" : "仅显示干涉项";
    refs.modeTitle.textContent = mode.title; refs.modeGoal.textContent = mode.goal;
    refs.stepIndex.textContent = guide.index; refs.stepTitle.textContent = guide.title; refs.stepPrompt.textContent = guide.prompt;
    refs.formulaLabel.textContent = state.mode === "path" ? "当前位置" : "当前关系";
    refs.formulaReadout.textContent = state.mode === "path" ? `Δr/λ = ${d.pathWaves.toFixed(3)}, I/I₀ = ${d.intensity.toFixed(3)}` : `β ≈ ${state.wavelength} nm × ${state.screen.toFixed(2)} m / ${state.slit.toFixed(2)} mm = ${d.betaMm.toFixed(2)} mm`;
    refs.recordButton.textContent = `记录参数${state.samples.length ? ` (${state.samples.length})` : ""}`;
    refs.raysToggle.checked = state.showRays; refs.wavesToggle.checked = state.showWaves; refs.envelopeToggle.checked = state.showEnvelope; refs.labelsToggle.checked = state.showLabels;
    refs.modeButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.mode === state.mode));
    refs.guideButtons.forEach((button) => button.classList.toggle("is-active", Number(button.dataset.guideStep) === state.guideStep));
    refs.colorButtons.forEach((button) => { const active = Number(button.dataset.wavelength) === state.wavelength; button.classList.toggle("is-active", active); button.setAttribute("aria-checked", String(active)); });
    setRangeProgress(refs.wavelengthInput, state.wavelength); setRangeProgress(refs.slitInput, state.slit); setRangeProgress(refs.widthInput, state.slitWidth); setRangeProgress(refs.screenInput, state.screen);
    drawApparatus(); drawIntensityChart(); drawSpacingChart();
  }

  function setParameter(key, input, value) {
    const next = Number(value); if (!Number.isFinite(next)) return;
    state[key] = clamp(next, Number(input.min), Number(input.max));
    if (key === "slit" || key === "screen") state.samples = [];
    sync();
  }

  function setMode(mode) {
    state.mode = mode;
    if (mode === "spacing") state.cursorRatio = 0;
    if (mode === "path") { const d = calculate(); state.cursorRatio = clamp((d.betaMm / 2) / d.rangeMm, -1, 1); }
    sync();
  }

  function setProbeFromPointer(event) {
    if (!apparatus.screen) return;
    const rect = refs.canvas.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const center = (apparatus.screen.top + apparatus.screen.bottom) / 2;
    const half = (apparatus.screen.bottom - apparatus.screen.top) / 2;
    state.cursorRatio = clamp((y - center) / half, -1, 1);
    state.mode = "path"; state.guideStep = 1; sync();
  }

  function recordSample() {
    const d = calculate();
    const duplicate = state.samples.some((sample) => sample.wavelength === state.wavelength && Math.abs(sample.slit - state.slit) < 1e-6 && Math.abs(sample.screen - state.screen) < 1e-6);
    if (!duplicate) state.samples.push({ wavelength: state.wavelength, slit: state.slit, screen: state.screen, betaMm: d.betaMm });
    state.mode = "compare"; state.guideStep = 2; sync();
  }

  [[refs.wavelengthInput, "wavelength"], [refs.slitInput, "slit"], [refs.widthInput, "slitWidth"], [refs.screenInput, "screen"]].forEach(([input, key]) => input.addEventListener("input", (event) => setParameter(key, input, event.target.value)));
  refs.wavelengthNumber.addEventListener("input", (event) => setParameter("wavelength", refs.wavelengthInput, event.target.value));
  refs.nudgeButtons.forEach((button) => button.addEventListener("click", () => setParameter("wavelength", refs.wavelengthInput, state.wavelength + Number(button.dataset.nudge))));
  refs.modeButtons.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
  refs.guideButtons.forEach((button) => button.addEventListener("click", () => { state.guideStep = Number(button.dataset.guideStep); sync(); }));
  refs.colorButtons.forEach((button) => button.addEventListener("click", () => { state.wavelength = Number(button.dataset.wavelength); sync(); }));
  [[refs.raysToggle, "showRays"], [refs.wavesToggle, "showWaves"], [refs.envelopeToggle, "showEnvelope"], [refs.labelsToggle, "showLabels"]].forEach(([control, key]) => control.addEventListener("change", () => { state[key] = control.checked; sync(); }));
  refs.darkButton.addEventListener("click", () => setMode("path")); refs.recordButton.addEventListener("click", recordSample); refs.clearDataButton.addEventListener("click", () => { state.samples = []; sync(); });
  refs.resetButton.addEventListener("click", () => { Object.assign(state, { wavelength: 600, slit: .3, slitWidth: .06, screen: 1.2, cursorRatio: 0, mode: "spacing", guideStep: 0, showRays: true, showWaves: true, showEnvelope: true, showLabels: true, samples: [] }); sync(); });
  refs.guideButton.addEventListener("click", () => refs.guideDialog.showModal()); refs.stepButton.addEventListener("click", () => { state.guideStep = (state.guideStep + 1) % GUIDE_STEPS.length; sync(); });
  refs.focusButton.addEventListener("click", () => { const active = document.body.classList.toggle("focus-mode"); refs.focusButton.setAttribute("aria-pressed", String(active)); requestAnimationFrame(sync); });
  refs.fullscreenButton.addEventListener("click", () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.(); });

  refs.canvas.tabIndex = 0;
  refs.canvas.addEventListener("pointerdown", (event) => {
    if (!apparatus.screen) return;
    const rect = refs.canvas.getBoundingClientRect(); const x = event.clientX - rect.left;
    if (Math.abs(x - apparatus.screen.x) > 42) return;
    draggingProbe = true; try { refs.canvas.setPointerCapture?.(event.pointerId); } catch (error) { /* Synthetic events may not own pointer capture. */ }
    setProbeFromPointer(event);
  });
  refs.canvas.addEventListener("pointermove", (event) => { if (draggingProbe) setProbeFromPointer(event); });
  refs.canvas.addEventListener("pointerup", () => { draggingProbe = false; }); refs.canvas.addEventListener("pointercancel", () => { draggingProbe = false; });
  refs.canvas.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp") { event.preventDefault(); state.cursorRatio = clamp(state.cursorRatio - .01, -1, 1); state.mode = "path"; sync(); }
    if (event.key === "ArrowDown") { event.preventDefault(); state.cursorRatio = clamp(state.cursorRatio + .01, -1, 1); state.mode = "path"; sync(); }
  });

  const resizeObserver = new ResizeObserver(() => requestAnimationFrame(sync));
  [refs.canvas, refs.intensityChart, refs.spacingChart].forEach((canvas) => resizeObserver.observe(canvas));
  window.doubleSlitLab = { calculate: (patch) => calculate({ ...state, ...(patch || {}) }), getState: () => JSON.parse(JSON.stringify(state)), setState: (patch) => { Object.assign(state, patch || {}); sync(); }, recordSample };
  sync();
})();
