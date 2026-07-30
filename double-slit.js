(function () {
  "use strict";

  const MODES = {
    spacing: { title: "条纹间距", goal: "测量相邻亮纹之间的距离" },
    path: { title: "路程差", goal: "拖动探针，用路程差判断屏上明暗" },
    compare: { title: "参数规律", goal: "每次改变一个参数，建立条纹间距关系" },
    photon: { title: "单光子", goal: "观察离散探测事件如何累积成干涉条纹" }
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
    samples: [],
    whichPath: false,
    photonsRunning: false,
    photonRate: 20,
    photonHits: [],
    activePhotons: [],
    lastPhotonRatio: null
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
    spacingMetricLabel: document.getElementById("spacingMetricLabel"),
    positionMetricLabel: document.getElementById("positionMetricLabel"),
    pathMetricLabel: document.getElementById("pathMetricLabel"),
    intensityMetricLabel: document.getElementById("intensityMetricLabel"),
    spacingMetric: document.getElementById("spacingMetric"),
    positionMetric: document.getElementById("positionMetric"),
    pathMetric: document.getElementById("pathMetric"),
    intensityMetric: document.getElementById("intensityMetric"),
    fringeOrder: document.getElementById("fringeOrder"),
    fringeState: document.getElementById("fringeState"),
    stateBadge: document.getElementById("stateBadge"),
    stageHint: document.getElementById("stageHint"),
    profileStatus: document.getElementById("profileStatus"),
    secondaryChartKicker: document.getElementById("secondaryChartKicker"),
    secondaryChartTitle: document.getElementById("secondaryChartTitle"),
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
    macroActions: document.getElementById("macroActions"),
    photonControls: document.getElementById("photonControls"),
    photonCount: document.getElementById("photonCount"),
    photonPlayButton: document.getElementById("photonPlayButton"),
    photonStepButton: document.getElementById("photonStepButton"),
    photonBurstButton: document.getElementById("photonBurstButton"),
    clearPhotonsButton: document.getElementById("clearPhotonsButton"),
    photonSpeedInput: document.getElementById("photonSpeedInput"),
    photonSpeedValue: document.getElementById("photonSpeedValue"),
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
    nudgeButtons: Array.from(document.querySelectorAll("[data-nudge-target]")),
    pathMeasurementButtons: Array.from(document.querySelectorAll("[data-path-measurement]"))
  };

  const apparatus = { ctx: refs.canvas.getContext("2d"), width: 0, height: 0, dpr: 1, screen: null };
  const intensityPlot = { ctx: refs.intensityChart.getContext("2d"), width: 0, height: 0, dpr: 1 };
  const spacingPlot = { ctx: refs.spacingChart.getContext("2d"), width: 0, height: 0, dpr: 1 };
  let draggingProbe = false;
  let animationFrame = 0;
  let nextPhotonEmissionAt = 0;

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
    return { rgb: stops[stops.length - 1][1], solid: "rgb(205,54,54)", glow: "rgba(205,54,54,.34)" };
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

  function probabilityAt(yMm, whichPath = state.whichPath) {
    const base = calculate();
    const probe = calculate({ ...state, cursorRatio: yMm / base.rangeMm });
    return whichPath ? probe.envelope : probe.intensity;
  }

  function samplePhotonRatio(whichPath = state.whichPath) {
    const d = calculate();
    for (let attempt = 0; attempt < 500; attempt += 1) {
      const ratio = Math.random() * 2 - 1;
      if (Math.random() <= probabilityAt(ratio * d.rangeMm, whichPath)) return ratio;
    }
    return 0;
  }

  function addPhotonHit(ratio) {
    state.photonHits.push(ratio);
    if (state.photonHits.length > 12000) state.photonHits.splice(0, state.photonHits.length - 12000);
    state.lastPhotonRatio = ratio;
  }

  function queuePhoton(count = 1, shouldStart = true) {
    const queuedAt = Date.now();
    for (let index = 0; index < count; index += 1) {
      state.activePhotons.push({
        progress: -index * 0.055,
        startedAt: queuedAt + index * 45,
        targetRatio: samplePhotonRatio(),
        phase: Math.random() * Math.PI * 2,
        slitIndex: Math.random() < 0.5 ? 0 : 1
      });
    }
    if (shouldStart) startAnimation();
  }

  function addPhotonBurst(count) {
    for (let index = 0; index < count; index += 1) addPhotonHit(samplePhotonRatio());
    sync();
  }

  function clearPhotonData() {
    state.photonHits = [];
    state.activePhotons = [];
    state.lastPhotonRatio = null;
    nextPhotonEmissionAt = 0;
  }

  function updatePhotonReadout() {
    const count = state.photonHits.length;
    const d = calculate();
    const lastPhotonMm = state.lastPhotonRatio === null ? null : state.lastPhotonRatio * d.rangeMm;
    refs.photonCount.textContent = `${count} 次探测`;
    refs.stateBadge.textContent = state.whichPath ? `路径已测 · n=${count}` : `振幅叠加 · n=${count}`;
    refs.pathMetric.textContent = String(count);
    refs.positionMetric.textContent = lastPhotonMm === null ? "--" : `${lastPhotonMm.toFixed(2)} mm`;
    refs.intensityMetric.textContent = lastPhotonMm === null ? "--" : probabilityAt(lastPhotonMm).toFixed(3);
  }

  function startAnimation() {
    if (animationFrame) return;
    animationFrame = requestAnimationFrame(animatePhotons);
  }

  function animatePhotons() {
    animationFrame = 0;
    const now = Date.now();

    if (state.mode === "photon" && state.photonsRunning) {
      const emissionInterval = 1000 / state.photonRate;
      if (!nextPhotonEmissionAt) nextPhotonEmissionAt = now;
      let additions = 0;
      while (now >= nextPhotonEmissionAt && additions < 5) {
        additions += 1;
        nextPhotonEmissionAt += emissionInterval;
      }
      if (additions) queuePhoton(additions, false);
      if (now - nextPhotonEmissionAt > emissionInterval * 5) nextPhotonEmissionAt = now + emissionInterval;
    } else {
      nextPhotonEmissionAt = 0;
    }

    state.activePhotons.forEach((photon) => { photon.progress = (now - photon.startedAt) / 820; });
    const arrived = state.activePhotons.filter((photon) => photon.progress >= 1);
    arrived.forEach((photon) => addPhotonHit(photon.targetRatio));
    state.activePhotons = state.activePhotons.filter((photon) => photon.progress < 1);

    if (state.mode === "photon") {
      drawApparatus();
      drawSecondaryChart();
      updatePhotonReadout();
    }

    if ((state.mode === "photon" && state.photonsRunning) || state.activePhotons.length) {
      animationFrame = requestAnimationFrame(animatePhotons);
    }
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

  function drawPhotonEvents(ctx, geometry, light) {
    const { source, barrierX, slitPoints, screenX, screenTop, screenBottom, centerY } = geometry;
    const screenHalf = (screenBottom - screenTop) * 0.5;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    state.photonHits.slice(-4000).forEach((ratio, index) => {
      const y = centerY + ratio * screenHalf;
      const jitter = ((index * 17) % 13) - 6;
      ctx.fillStyle = `rgba(${light.rgb.join(",")},${0.3 + ((index * 7) % 10) / 20})`;
      ctx.fillRect(screenX + jitter - 0.7, y - 0.7, 1.5, 1.5);
    });

    state.activePhotons.forEach((photon) => {
      if (photon.progress < 0) return;
      const target = { x: screenX, y: centerY + photon.targetRatio * screenHalf };
      if (photon.progress < 0.36) {
        const t = photon.progress / 0.36;
        const x = source.x + (barrierX - source.x) * t;
        const pulse = 4 + Math.sin(photon.phase + t * Math.PI * 4) * 1.5;
        ctx.fillStyle = light.solid;
        ctx.beginPath(); ctx.arc(x, centerY, 2.4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = light.glow; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, centerY, pulse, 0, Math.PI * 2); ctx.stroke();
        return;
      }

      const t = clamp((photon.progress - 0.36) / 0.64, 0, 1);
      const branches = state.whichPath ? [slitPoints[photon.slitIndex]] : slitPoints;
      branches.forEach((slit, branchIndex) => {
        const x = slit.x + (target.x - slit.x) * t;
        const y = slit.y + (target.y - slit.y) * t;
        ctx.fillStyle = state.whichPath ? light.solid : branchIndex === 0 ? "#64c7d9" : "#b58ce5";
        ctx.globalAlpha = state.whichPath ? 0.92 : 0.66;
        ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = state.whichPath ? light.glow : branchIndex === 0 ? "rgba(100,199,217,.24)" : "rgba(181,140,229,.24)";
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(x, y, 7 + 3 * Math.sin(photon.phase + t * Math.PI * 5), 0, Math.PI * 2); ctx.stroke();
      });
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

    const photonMode = state.mode === "photon";
    const probe = { x: screenX, y: probeY };
    if (state.showRays && !photonMode) {
      slitPoints.forEach((point) => drawBeam(ctx, point, probe, light, .46));
      drawLine(ctx, slitPoints[0], probe, "rgba(240,241,232,.5)", 1, [5, 5]);
      drawLine(ctx, slitPoints[1], probe, "rgba(240,241,232,.5)", 1, [5, 5]);
    }

    ctx.fillStyle = "#111512"; ctx.fillRect(screenX - 12, screenTop - 4, 24, screenBottom - screenTop + 8);
    for (let pixel = Math.ceil(screenTop); pixel <= screenBottom; pixel += 1) {
      const ratio = (pixel - centerY) / ((screenBottom - screenTop) * .5);
      const yMm = ratio * d.rangeMm;
      const value = photonMode ? probabilityAt(yMm) : intensityAt(yMm);
      const alpha = photonMode ? .025 + value * .12 : .04 + value * .96;
      ctx.fillStyle = `rgba(${light.rgb.join(",")},${alpha})`;
      ctx.fillRect(screenX - 9, pixel, 18, 1.2);
    }
    ctx.strokeStyle = "rgba(240,241,232,.36)"; ctx.strokeRect(screenX - 12, screenTop - 4, 24, screenBottom - screenTop + 8);

    if (photonMode) {
      drawPhotonEvents(ctx, { source, barrierX, slitPoints, screenX, screenTop, screenBottom, centerY }, light);
    } else {
      ctx.fillStyle = d.fringe === "dark" ? "#b58ce5" : d.fringe === "bright" ? "#64c7d9" : "#f4c44e";
      ctx.beginPath(); ctx.moveTo(screenX - 18, probeY); ctx.lineTo(screenX - 29, probeY - 7); ctx.lineTo(screenX - 29, probeY + 7); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(screenX, probeY, 5, 0, Math.PI * 2); ctx.fill();
      drawLine(ctx, { x: barrierX + 8, y: probeY }, { x: screenX - 16, y: probeY }, "rgba(181,140,229,.42)", 1, [4, 5]);
    }

    if (state.showLabels) {
      drawText(ctx, photonMode ? "单光子源" : "单色光源", 22, 24, "rgba(240,241,232,.65)");
      drawText(ctx, `双缝 d=${state.slit.toFixed(2)} mm`, barrierX, 24, "rgba(240,241,232,.65)", "center");
      drawText(ctx, photonMode ? "探测屏" : "观察屏", screenX, 16, "rgba(240,241,232,.65)", "center");
      if (!photonMode) drawText(ctx, `y=${d.yMm.toFixed(2)} mm`, screenX - 20, clamp(probeY - 10, 16, h - 10), "#f0f1e8", "right");
      if (photonMode) drawText(ctx, state.whichPath ? "单路概率" : "双路概率振幅", (barrierX + screenX) / 2, 38, state.whichPath ? "rgba(244,196,78,.72)" : "rgba(100,199,217,.72)", "center");
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
      const value = state.mode === "photon" ? probabilityAt(yMm) : intensityAt(yMm);
      const x = px(yMm); const y = py(value); if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    if (state.mode !== "photon") {
      ctx.strokeStyle = "rgba(244,196,78,.62)"; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(px(d.yMm), frame.pad.top); ctx.lineTo(px(d.yMm), frame.pad.top + frame.height); ctx.stroke();
      ctx.fillStyle = "#f4c44e"; ctx.beginPath(); ctx.arc(px(d.yMm), py(d.intensity), 4, 0, Math.PI * 2); ctx.fill();
    }
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

  function drawPhotonHistogram() {
    setupCanvas(refs.spacingChart, spacingPlot);
    const ctx = spacingPlot.ctx; const d = calculate(); const frame = chartFrame(spacingPlot, "y / mm", "counts");
    const bins = 36;
    const counts = Array(bins).fill(0);
    state.photonHits.forEach((ratio) => {
      const index = clamp(Math.floor(((ratio + 1) / 2) * bins), 0, bins - 1);
      counts[index] += 1;
    });
    const maxCount = Math.max(1, ...counts);
    const barWidth = frame.width / bins;
    const light = wavelengthColor(state.wavelength);

    ctx.save();
    counts.forEach((count, index) => {
      const height = (count / maxCount) * frame.height;
      ctx.fillStyle = `rgba(${light.rgb.join(",")},${0.22 + (count / maxCount) * 0.66})`;
      ctx.fillRect(frame.pad.left + index * barWidth + 1, frame.pad.top + frame.height - height, Math.max(1, barWidth - 2), height);
    });

    ctx.strokeStyle = state.whichPath ? "#f4c44e" : "#64c7d9";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let index = 0; index <= 180; index += 1) {
      const ratio = -1 + (2 * index) / 180;
      const x = frame.pad.left + ((ratio + 1) / 2) * frame.width;
      const y = frame.pad.top + frame.height - probabilityAt(ratio * d.rangeMm) * frame.height;
      if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = "rgba(240,241,232,.44)";
    ctx.font = "8px Avenir Next, sans-serif";
    [-1, 0, 1].forEach((ratio) => ctx.fillText((ratio * d.rangeMm).toFixed(0), frame.pad.left + ((ratio + 1) / 2) * frame.width - 5, frame.pad.top + frame.height + 13));
    ctx.restore();
  }

  function drawSecondaryChart() {
    if (state.mode === "photon") drawPhotonHistogram(); else drawSpacingChart();
  }

  function setRangeProgress(input, value) {
    const min = Number(input.min); const max = Number(input.max);
    input.style.setProperty("--range-progress", `${((value - min) / (max - min)) * 100}%`);
  }

  function sync() {
    const d = calculate(); const mode = MODES[state.mode]; const guide = GUIDE_STEPS[state.guideStep];
    const photonMode = state.mode === "photon";
    const classification = d.fringe === "bright" ? "亮纹" : d.fringe === "dark" ? "暗纹" : "过渡区";
    const order = d.fringe === "dark" ? d.nearestDark : d.nearestBright;
    const lastPhotonMm = state.lastPhotonRatio === null ? null : state.lastPhotonRatio * d.rangeMm;
    document.body.classList.toggle("photon-mode", photonMode);
    refs.photonControls.hidden = !photonMode;
    refs.macroActions.hidden = photonMode;
    refs.wavelengthInput.value = state.wavelength; refs.wavelengthNumber.value = state.wavelength;
    refs.slitInput.value = state.slit; refs.widthInput.value = state.slitWidth; refs.screenInput.value = state.screen;
    refs.wavelengthValue.textContent = `${state.wavelength} nm`; refs.slitValue.textContent = `${state.slit.toFixed(2)} mm`; refs.widthValue.textContent = `${state.slitWidth.toFixed(3)} mm`; refs.screenValue.textContent = `${state.screen.toFixed(2)} m`;
    refs.spacingMetricLabel.innerHTML = photonMode ? "理论间距 <i>β</i>" : "条纹间距 <i>β</i>";
    refs.positionMetricLabel.innerHTML = photonMode ? "最近落点 <i>y</i>" : "探针位置 <i>y</i>";
    refs.pathMetricLabel.innerHTML = photonMode ? "探测次数 <i>n</i>" : "路程差 <i>Δr/λ</i>";
    refs.intensityMetricLabel.innerHTML = photonMode ? "落点概率 <i>P/Pmax</i>" : "相对光强 <i>I/I₀</i>";
    refs.spacingMetric.textContent = `${d.betaMm.toFixed(2)} mm`;
    refs.positionMetric.textContent = photonMode ? lastPhotonMm === null ? "--" : `${lastPhotonMm.toFixed(2)} mm` : `${d.yMm.toFixed(2)} mm`;
    refs.pathMetric.textContent = photonMode ? String(state.photonHits.length) : d.pathWaves.toFixed(3);
    refs.intensityMetric.textContent = photonMode ? lastPhotonMm === null ? "--" : probabilityAt(lastPhotonMm).toFixed(3) : d.intensity.toFixed(3);
    refs.fringeOrder.textContent = photonMode ? state.whichPath ? "P = |ψ₁|² + |ψ₂|²" : "P = |ψ₁ + ψ₂|²" : d.fringe === "transition" ? `Δr/λ = ${d.pathWaves.toFixed(2)}` : `${d.fringe === "dark" ? "k + 1/2" : "m"} = ${order.toFixed(d.fringe === "dark" ? 1 : 0)}`;
    refs.fringeState.textContent = photonMode ? state.whichPath ? "路径可区分 · 干涉项消失" : "路径不可区分 · 概率振幅叠加" : d.fringe === "bright" ? "相长干涉 · 亮纹" : d.fringe === "dark" ? "相消干涉 · 暗纹" : "相位正在过渡";
    refs.stateBadge.textContent = classification;
    refs.stateBadge.classList.toggle("is-dark", !photonMode && d.fringe === "dark");
    refs.stateBadge.classList.toggle("is-transition", !photonMode && d.fringe === "transition");
    refs.stateBadge.classList.toggle("is-photon", photonMode);
    refs.profileStatus.textContent = photonMode ? state.whichPath ? "非相干叠加" : "概率振幅叠加" : state.showEnvelope ? "含衍射包络" : "仅显示干涉项";
    refs.modeTitle.textContent = mode.title; refs.modeGoal.textContent = mode.goal;
    refs.stageHint.textContent = photonMode ? "离散落点按理论概率逐次产生" : "拖动屏上探针测量位置";
    refs.stepIndex.textContent = guide.index; refs.stepTitle.textContent = guide.title; refs.stepPrompt.textContent = guide.prompt;
    refs.formulaLabel.textContent = photonMode ? "概率模型" : state.mode === "path" ? "当前位置" : "当前关系";
    refs.formulaReadout.textContent = photonMode ? state.whichPath ? "P(y) ∝ |ψ₁|² + |ψ₂|²" : "P(y) ∝ |ψ₁ + ψ₂|²" : state.mode === "path" ? `Δr/λ = ${d.pathWaves.toFixed(3)}, I/I₀ = ${d.intensity.toFixed(3)}` : `β ≈ ${state.wavelength} nm × ${state.screen.toFixed(2)} m / ${state.slit.toFixed(2)} mm = ${d.betaMm.toFixed(2)} mm`;
    refs.recordButton.textContent = `记录参数${state.samples.length ? ` (${state.samples.length})` : ""}`;
    refs.secondaryChartKicker.textContent = photonMode ? "DETECTION HISTOGRAM" : "FRINGE SPACING";
    refs.secondaryChartTitle.textContent = photonMode ? "单光子落点统计" : "β – λ 关系";
    refs.clearDataButton.textContent = photonMode ? "清空落点" : "清空数据";
    refs.photonSpeedInput.value = state.photonRate;
    refs.photonSpeedValue.textContent = `${state.photonRate} /s`;
    refs.photonPlayButton.textContent = state.photonsRunning ? "Ⅱ 暂停" : "▶ 播放";
    refs.photonPlayButton.setAttribute("aria-pressed", String(state.photonsRunning));
    refs.pathMeasurementButtons.forEach((button) => {
      const active = (button.dataset.pathMeasurement === "on") === state.whichPath;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    refs.raysToggle.checked = state.showRays; refs.wavesToggle.checked = state.showWaves; refs.envelopeToggle.checked = state.showEnvelope; refs.labelsToggle.checked = state.showLabels;
    refs.modeButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.mode === state.mode));
    refs.guideButtons.forEach((button) => button.classList.toggle("is-active", Number(button.dataset.guideStep) === state.guideStep));
    refs.colorButtons.forEach((button) => { const active = Number(button.dataset.wavelength) === state.wavelength; button.classList.toggle("is-active", active); button.setAttribute("aria-checked", String(active)); });
    setRangeProgress(refs.wavelengthInput, state.wavelength); setRangeProgress(refs.slitInput, state.slit); setRangeProgress(refs.widthInput, state.slitWidth); setRangeProgress(refs.screenInput, state.screen); setRangeProgress(refs.photonSpeedInput, state.photonRate);
    drawApparatus(); drawIntensityChart(); drawSecondaryChart();
    if (photonMode) updatePhotonReadout();
  }

  function setParameter(key, input, value) {
    const next = Number(value); if (!Number.isFinite(next)) return;
    state[key] = clamp(next, Number(input.min), Number(input.max));
    if (key === "slit" || key === "screen") state.samples = [];
    clearPhotonData();
    sync();
  }

  function setMode(mode) {
    state.mode = mode;
    if (mode !== "photon") { state.photonsRunning = false; state.activePhotons = []; }
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
  refs.wavelengthNumber.addEventListener("input", (event) => {
    if (event.target.value === "") return;
    setParameter("wavelength", refs.wavelengthInput, event.target.value);
  });
  refs.nudgeButtons.forEach((button) => button.addEventListener("click", () => setParameter("wavelength", refs.wavelengthInput, state.wavelength + Number(button.dataset.nudge))));
  refs.modeButtons.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
  refs.guideButtons.forEach((button) => button.addEventListener("click", () => { state.guideStep = Number(button.dataset.guideStep); sync(); }));
  refs.colorButtons.forEach((button) => button.addEventListener("click", () => { state.wavelength = Number(button.dataset.wavelength); clearPhotonData(); sync(); }));
  [[refs.raysToggle, "showRays"], [refs.wavesToggle, "showWaves"], [refs.envelopeToggle, "showEnvelope"], [refs.labelsToggle, "showLabels"]].forEach(([control, key]) => control.addEventListener("change", () => { state[key] = control.checked; sync(); }));
  refs.pathMeasurementButtons.forEach((button) => button.addEventListener("click", () => {
    state.whichPath = button.dataset.pathMeasurement === "on";
    clearPhotonData();
    sync();
  }));
  refs.photonPlayButton.addEventListener("click", () => {
    state.photonsRunning = !state.photonsRunning;
    nextPhotonEmissionAt = 0;
    if (state.photonsRunning) startAnimation();
    sync();
  });
  refs.photonStepButton.addEventListener("click", () => queuePhoton(1));
  refs.photonBurstButton.addEventListener("click", () => addPhotonBurst(100));
  refs.clearPhotonsButton.addEventListener("click", () => { clearPhotonData(); sync(); });
  refs.photonSpeedInput.addEventListener("input", (event) => {
    state.photonRate = Number(event.target.value);
    sync();
  });
  refs.darkButton.addEventListener("click", () => setMode("path")); refs.recordButton.addEventListener("click", recordSample); refs.clearDataButton.addEventListener("click", () => { if (state.mode === "photon") clearPhotonData(); else state.samples = []; sync(); });
  refs.resetButton.addEventListener("click", () => {
    Object.assign(state, { wavelength: 600, slit: .3, slitWidth: .06, screen: 1.2, cursorRatio: 0, mode: "spacing", guideStep: 0, showRays: true, showWaves: true, showEnvelope: true, showLabels: true, samples: [], whichPath: false, photonsRunning: false, photonRate: 20, photonHits: [], activePhotons: [], lastPhotonRatio: null });
    nextPhotonEmissionAt = 0;
    sync();
  });
  refs.guideButton.addEventListener("click", () => refs.guideDialog.showModal()); refs.stepButton.addEventListener("click", () => { state.guideStep = (state.guideStep + 1) % GUIDE_STEPS.length; sync(); });
  refs.focusButton.addEventListener("click", () => { const active = document.body.classList.toggle("focus-mode"); refs.focusButton.setAttribute("aria-pressed", String(active)); requestAnimationFrame(sync); });
  refs.fullscreenButton.addEventListener("click", () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.(); });

  refs.canvas.tabIndex = 0;
  refs.canvas.addEventListener("pointerdown", (event) => {
    if (!apparatus.screen || state.mode === "photon") return;
    event.preventDefault();
    draggingProbe = true; try { refs.canvas.setPointerCapture?.(event.pointerId); } catch (error) { /* Synthetic events may not own pointer capture. */ }
    setProbeFromPointer(event);
  });
  refs.canvas.addEventListener("pointermove", (event) => {
    if (!draggingProbe) return;
    event.preventDefault();
    setProbeFromPointer(event);
  });
  refs.canvas.addEventListener("pointerup", () => { draggingProbe = false; }); refs.canvas.addEventListener("pointercancel", () => { draggingProbe = false; });
  refs.canvas.addEventListener("keydown", (event) => {
    if (state.mode === "photon") return;
    if (event.key === "ArrowUp") { event.preventDefault(); state.cursorRatio = clamp(state.cursorRatio - .01, -1, 1); state.mode = "path"; sync(); }
    if (event.key === "ArrowDown") { event.preventDefault(); state.cursorRatio = clamp(state.cursorRatio + .01, -1, 1); state.mode = "path"; sync(); }
  });

  if (typeof ResizeObserver === "function") {
    const resizeObserver = new ResizeObserver(() => requestAnimationFrame(sync));
    [refs.canvas, refs.intensityChart, refs.spacingChart].forEach((canvas) => resizeObserver.observe(canvas));
  } else {
    window.addEventListener("resize", () => requestAnimationFrame(sync));
  }
  window.doubleSlitLab = {
    calculate: (patch) => calculate({ ...state, ...(patch || {}) }),
    probabilityAt,
    samplePhotonRatios: (count, whichPath) => Array.from({ length: Math.max(0, Math.min(20000, Number(count) || 0)) }, () => samplePhotonRatio(Boolean(whichPath))),
    getState: () => JSON.parse(JSON.stringify(state)),
    setState: (patch) => { Object.assign(state, patch || {}); sync(); },
    recordSample,
    addPhotonBurst,
    clearPhotonData
  };
  sync();
})();
