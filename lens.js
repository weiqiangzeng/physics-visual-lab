(function () {
  "use strict";

  const MODES = {
    regions: { title: "五个区域", goal: "拖动物体跨越 2f 和 f，观察像的突变与连续变化" },
    rays: { title: "主光线", goal: "用三条特殊光线寻找像的位置和正倒" },
    screen: { title: "光屏验证", goal: "移动光屏，检验哪些像能够被真实承接" },
    relation: { title: "成像规律", goal: "记录多组物距和像距，验证薄透镜公式" }
  };

  const GUIDE_STEPS = [
    { index: "01", title: "先预测", prompt: "物体从 2f 外向透镜移动时，实像会向哪里移动、怎样变化？" },
    { index: "02", title: "再作图", prompt: "比较三条主光线的交点，区分真实会聚与反向延长线会聚。" },
    { index: "03", title: "用光屏验证", prompt: "把光屏移到理论像距，观察实像清晰度；再尝试承接虚像。" }
  ];

  const REGION_LABELS = {
    far: "u > 2f",
    double: "u = 2f",
    middle: "f < u < 2f",
    focus: "u = f",
    near: "u < f"
  };

  const state = {
    focal: 10,
    objectDistance: 30,
    objectHeight: 4,
    screenDistance: 15,
    mode: "regions",
    guideStep: 0,
    showRays: true,
    showExtensions: true,
    showMarkers: true,
    showScreen: true,
    samples: []
  };

  const refs = {
    canvas: document.getElementById("lensCanvas"),
    distanceChart: document.getElementById("distanceChart"),
    reciprocalChart: document.getElementById("reciprocalChart"),
    focalInput: document.getElementById("focalInput"),
    objectDistanceInput: document.getElementById("objectDistanceInput"),
    objectDistanceNumber: document.getElementById("objectDistanceNumber"),
    objectHeightInput: document.getElementById("objectHeightInput"),
    screenInput: document.getElementById("screenInput"),
    focalValue: document.getElementById("focalValue"),
    objectDistanceValue: document.getElementById("objectDistanceValue"),
    objectHeightValue: document.getElementById("objectHeightValue"),
    screenValue: document.getElementById("screenValue"),
    focusQuality: document.getElementById("focusQuality"),
    objectMetric: document.getElementById("objectMetric"),
    imageMetric: document.getElementById("imageMetric"),
    magnificationMetric: document.getElementById("magnificationMetric"),
    imageHeightMetric: document.getElementById("imageHeightMetric"),
    imageNature: document.getElementById("imageNature"),
    imageReality: document.getElementById("imageReality"),
    stateBadge: document.getElementById("stateBadge"),
    curveStatus: document.getElementById("curveStatus"),
    modeTitle: document.getElementById("modeTitle"),
    modeGoal: document.getElementById("modeGoal"),
    dragHint: document.getElementById("dragHint"),
    stepIndex: document.getElementById("stepIndex"),
    stepTitle: document.getElementById("stepTitle"),
    stepPrompt: document.getElementById("stepPrompt"),
    formulaLabel: document.getElementById("formulaLabel"),
    formulaReadout: document.getElementById("formulaReadout"),
    resetButton: document.getElementById("resetButton"),
    alignScreenButton: document.getElementById("alignScreenButton"),
    recordButton: document.getElementById("recordButton"),
    clearDataButton: document.getElementById("clearDataButton"),
    guideButton: document.getElementById("guideButton"),
    stepButton: document.getElementById("stepButton"),
    focusButton: document.getElementById("focusButton"),
    fullscreenButton: document.getElementById("fullscreenButton"),
    guideDialog: document.getElementById("guideDialog"),
    raysToggle: document.getElementById("showRaysToggle"),
    extensionsToggle: document.getElementById("showExtensionsToggle"),
    markersToggle: document.getElementById("showMarkersToggle"),
    screenToggle: document.getElementById("showScreenToggle"),
    modeButtons: Array.from(document.querySelectorAll("[data-mode]")),
    guideButtons: Array.from(document.querySelectorAll("[data-guide-step]")),
    regionButtons: Array.from(document.querySelectorAll("[data-region]")),
    nudgeButtons: Array.from(document.querySelectorAll("[data-nudge]"))
  };

  const apparatus = { ctx: refs.canvas.getContext("2d"), width: 0, height: 0, dpr: 1, lensX: 0, axisY: 0, scale: 1, objectX: 0, screenX: 0 };
  const distancePlot = { ctx: refs.distanceChart.getContext("2d"), width: 0, height: 0, dpr: 1 };
  const reciprocalPlot = { ctx: refs.reciprocalChart.getContext("2d"), width: 0, height: 0, dpr: 1 };
  let dragTarget = null;

  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function near(value, target, tolerance) { return Math.abs(value - target) <= tolerance; }

  function calculate(sourceState = state) {
    const focal = clamp(Number(sourceState.focal), 5, 20);
    const objectDistance = clamp(Number(sourceState.objectDistance), 3, 60);
    const objectHeight = clamp(Number(sourceState.objectHeight), 1, 8);
    const atFocus = near(objectDistance, focal, 0.025);
    const imageDistance = atFocus ? Infinity : (focal * objectDistance) / (objectDistance - focal);
    const magnification = atFocus ? -Infinity : -imageDistance / objectDistance;
    const imageHeight = atFocus ? -Infinity : magnification * objectHeight;
    const tolerance = 0.13;
    let region = "near";
    if (objectDistance > 2 * focal + tolerance) region = "far";
    else if (near(objectDistance, 2 * focal, tolerance)) region = "double";
    else if (objectDistance > focal + tolerance) region = "middle";
    else if (near(objectDistance, focal, tolerance)) region = "focus";
    const real = Number.isFinite(imageDistance) && imageDistance > 0;
    const virtual = Number.isFinite(imageDistance) && imageDistance < 0;
    const screenDistance = clamp(Number(sourceState.screenDistance), 5, 60);
    const focusWidth = real ? Math.max(1.1, imageDistance * 0.13) : 1;
    const focusQuality = real ? Math.exp(-Math.pow((screenDistance - imageDistance) / focusWidth, 2)) : 0;
    return { focal, objectDistance, objectHeight, imageDistance, magnification, imageHeight, region, atFocus, real, virtual, screenDistance, focusQuality };
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

  function lineToX(from, through, x) {
    const dx = through.x - from.x;
    if (Math.abs(dx) < 1e-6) return { x, y: through.y };
    return { x, y: from.y + ((through.y - from.y) * (x - from.x)) / dx };
  }

  function drawLine(ctx, from, to, color, width = 1, dash = [], alpha = 1) {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash); ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
    ctx.restore();
  }

  function drawArrow(ctx, x, axisY, topY, color, label) {
    const direction = topY < axisY ? -1 : 1;
    ctx.save();
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, axisY); ctx.lineTo(x, topY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, topY); ctx.lineTo(x - 6, topY + direction * 10); ctx.lineTo(x + 6, topY + direction * 10); ctx.closePath(); ctx.fill();
    ctx.font = "10px Avenir Next, sans-serif"; ctx.textAlign = "center";
    ctx.fillText(label, x, direction < 0 ? topY - 10 : topY + 17);
    ctx.restore();
  }

  function drawLens(ctx, x, axisY, height) {
    const top = axisY - height / 2; const bottom = axisY + height / 2;
    ctx.save();
    ctx.fillStyle = "rgba(100,199,217,.13)"; ctx.strokeStyle = "#64c7d9"; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, top); ctx.bezierCurveTo(x + 14, top + height * .22, x + 14, bottom - height * .22, x, bottom);
    ctx.bezierCurveTo(x - 14, bottom - height * .22, x - 14, top + height * .22, x, top); ctx.closePath();
    ctx.fill(); ctx.stroke();
    drawLine(ctx, { x: x - 9, y: top + 6 }, { x: x + 9, y: top + 6 }, "#64c7d9", 1);
    drawLine(ctx, { x: x - 9, y: bottom - 6 }, { x: x + 9, y: bottom - 6 }, "#64c7d9", 1);
    ctx.fillStyle = "rgba(240,241,232,.55)"; ctx.font = "9px Avenir Next, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("凸透镜", x, top - 10);
    ctx.restore();
  }

  function drawRayBundle(ctx, d, objectTop, lensX, axisY, scale, rightEdge, leftEdge) {
    if (!state.showRays) return;
    const focalRight = { x: lensX + d.focal * scale, y: axisY };
    const focalLeft = { x: lensX - d.focal * scale, y: axisY };
    const lensParallel = { x: lensX, y: objectTop.y };
    const center = { x: lensX, y: axisY };
    const rayOneEnd = lineToX(lensParallel, focalRight, rightEdge);
    const rayTwoEnd = lineToX(objectTop, center, rightEdge);

    drawLine(ctx, objectTop, lensParallel, "#f2b84b", 1.8);
    drawLine(ctx, lensParallel, rayOneEnd, "#f2b84b", 1.8);
    drawLine(ctx, objectTop, rayTwoEnd, "#69d18e", 1.8);

    if (!d.atFocus) {
      const lensFromFocus = lineToX(objectTop, focalLeft, lensX);
      drawLine(ctx, objectTop, lensFromFocus, "#b58ce5", 1.6);
      drawLine(ctx, lensFromFocus, { x: rightEdge, y: lensFromFocus.y }, "#b58ce5", 1.6);
    }

    if (d.virtual && state.showExtensions) {
      const imagePoint = { x: lensX + d.imageDistance * scale, y: axisY - d.imageHeight * verticalScale(d) };
      const extensionLeft = Math.max(leftEdge, imagePoint.x);
      drawLine(ctx, lensParallel, { x: extensionLeft, y: lineToX(lensParallel, focalRight, extensionLeft).y }, "#f2b84b", 1.1, [5, 5], .65);
      drawLine(ctx, center, { x: extensionLeft, y: lineToX(objectTop, center, extensionLeft).y }, "#69d18e", 1.1, [5, 5], .65);
    }
  }

  function verticalScale(d) {
    const visibleImage = Number.isFinite(d.imageHeight) && Math.abs(d.imageDistance) <= 68;
    const maxHeight = Math.max(d.objectHeight, visibleImage ? Math.abs(d.imageHeight) : d.objectHeight);
    return Math.min(13, (apparatus.height * .34) / Math.max(1, maxHeight));
  }

  function drawApparatus() {
    setupCanvas(refs.canvas, apparatus);
    const ctx = apparatus.ctx; const width = apparatus.width; const height = apparatus.height; const d = calculate();
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#0c0f0e"; ctx.fillRect(0, 0, width, height);

    const lensX = width * .53; const axisY = height * .52;
    const scale = Math.min((lensX - 34) / 65, (width - lensX - 25) / 65);
    const leftEdge = 20; const rightEdge = width - 18;
    const objectX = lensX - d.objectDistance * scale;
    const screenX = lensX + d.screenDistance * scale;
    const yScale = verticalScale(d);
    const objectTop = { x: objectX, y: axisY - d.objectHeight * yScale };
    apparatus.lensX = lensX; apparatus.axisY = axisY; apparatus.scale = scale; apparatus.objectX = objectX; apparatus.screenX = screenX;

    ctx.save();
    ctx.strokeStyle = "rgba(240,241,232,.055)"; ctx.lineWidth = 1;
    for (let cm = -60; cm <= 60; cm += 5) {
      const x = lensX + cm * scale;
      if (x < 0 || x > width) continue;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 18; y < height; y += 28) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
    ctx.restore();

    drawLine(ctx, { x: 18, y: axisY }, { x: width - 16, y: axisY }, "rgba(240,241,232,.38)", 1);
    ctx.fillStyle = "rgba(240,241,232,.42)"; ctx.font = "8px Avenir Next, sans-serif"; ctx.textAlign = "center";
    for (let cm = -60; cm <= 60; cm += 10) {
      const x = lensX + cm * scale;
      if (x < 24 || x > width - 20) continue;
      ctx.fillRect(x, axisY - 3, 1, 6); ctx.fillText(String(Math.abs(cm)), x, axisY + 17);
    }
    ctx.textAlign = "right"; ctx.fillText("cm", width - 18, axisY + 17);

    if (state.showMarkers) {
      [[-2, "2F"], [-1, "F"], [1, "F′"], [2, "2F′"]].forEach(([multiple, label]) => {
        const x = lensX + multiple * d.focal * scale;
        if (x < 18 || x > width - 18) return;
        ctx.fillStyle = multiple > 0 ? "#64c7d9" : "#f2b84b";
        ctx.beginPath(); ctx.arc(x, axisY, 3, 0, Math.PI * 2); ctx.fill();
        ctx.font = "9px Georgia, serif"; ctx.textAlign = "center"; ctx.fillText(label, x, axisY + 30);
      });
    }

    drawRayBundle(ctx, d, objectTop, lensX, axisY, scale, rightEdge, leftEdge);

    if (state.showScreen) {
      const focused = d.real && Math.abs(d.screenDistance - d.imageDistance) <= Math.max(.35, d.imageDistance * .025);
      ctx.save();
      ctx.strokeStyle = focused ? "#69d18e" : "rgba(240,241,232,.48)"; ctx.fillStyle = focused ? "rgba(105,209,142,.09)" : "rgba(240,241,232,.035)";
      ctx.lineWidth = focused ? 2 : 1;
      ctx.fillRect(screenX - 5, axisY - height * .36, 10, height * .72); ctx.strokeRect(screenX - 5, axisY - height * .36, 10, height * .72);
      ctx.fillStyle = focused ? "#69d18e" : "rgba(240,241,232,.48)"; ctx.font = "9px Avenir Next, sans-serif"; ctx.textAlign = "center";
      ctx.fillText("光屏", screenX, axisY - height * .36 - 9);
      ctx.restore();
    }

    drawLens(ctx, lensX, axisY, Math.min(height * .68, 245));
    drawArrow(ctx, objectX, axisY, objectTop.y, "#f2b84b", "物");

    const imageInFrame = Number.isFinite(d.imageDistance) && Math.abs(d.imageDistance) <= 68;
    if (imageInFrame) {
      const imageX = lensX + d.imageDistance * scale;
      const imageTop = axisY - d.imageHeight * yScale;
      drawArrow(ctx, imageX, axisY, imageTop, d.real ? "#69d18e" : "#b58ce5", d.real ? "实像" : "虚像");
    } else if (d.atFocus || Math.abs(d.imageDistance) > 68) {
      ctx.fillStyle = "#f2b84b"; ctx.font = "10px Avenir Next, sans-serif"; ctx.textAlign = d.real ? "right" : "left";
      ctx.fillText(d.atFocus ? "折射光平行 · 像在无穷远" : d.real ? "实像在画面右侧远处" : "虚像在画面左侧远处", d.real ? width - 18 : 18, 24);
    }

    ctx.fillStyle = "rgba(240,241,232,.48)"; ctx.font = "9px Avenir Next, sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`u=${d.objectDistance.toFixed(1)} cm`, 18, height - 18);
    ctx.textAlign = "right"; ctx.fillText(`f=${d.focal.toFixed(1)} cm`, width - 18, height - 18);
  }

  function drawChartFrame(surface, xLabel, yLabel) {
    setupCanvas(surface.canvas, surface);
    const ctx = surface.ctx; const width = surface.width; const height = surface.height;
    ctx.clearRect(0, 0, width, height); ctx.fillStyle = "#111512"; ctx.fillRect(0, 0, width, height);
    const pad = { left: 35, right: 12, top: 12, bottom: 25 };
    const frame = { pad, width: width - pad.left - pad.right, height: height - pad.top - pad.bottom };
    ctx.strokeStyle = "rgba(240,241,232,.09)"; ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i += 1) {
      const x = pad.left + (frame.width * i) / 5; const y = pad.top + (frame.height * i) / 5;
      ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top + frame.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + frame.width, y); ctx.stroke();
    }
    ctx.fillStyle = "rgba(240,241,232,.48)"; ctx.font = "8px Avenir Next, sans-serif";
    ctx.textAlign = "right"; ctx.fillText(yLabel, pad.left - 5, pad.top + 7);
    ctx.textAlign = "right"; ctx.fillText(xLabel, pad.left + frame.width, height - 5);
    return frame;
  }

  function drawDistanceChart() {
    distancePlot.canvas = refs.distanceChart;
    const frame = drawChartFrame(distancePlot, "u / cm", "v / cm");
    const ctx = distancePlot.ctx; const d = calculate(); const { pad } = frame;
    const xOf = (u) => pad.left + ((u - 3) / 57) * frame.width;
    const yOf = (v) => pad.top + ((65 - clamp(v, -65, 65)) / 130) * frame.height;
    const zeroY = yOf(0);
    drawLine(ctx, { x: pad.left, y: zeroY }, { x: pad.left + frame.width, y: zeroY }, "rgba(240,241,232,.3)", 1);
    const focusX = xOf(d.focal);
    drawLine(ctx, { x: focusX, y: pad.top }, { x: focusX, y: pad.top + frame.height }, "#f2b84b", 1, [4, 4], .7);

    ctx.save(); ctx.strokeStyle = "#64c7d9"; ctx.lineWidth = 1.8;
    let drawing = false; ctx.beginPath();
    for (let index = 0; index <= 320; index += 1) {
      const u = 3 + (57 * index) / 320;
      if (Math.abs(u - d.focal) < .18) { drawing = false; continue; }
      const v = (d.focal * u) / (u - d.focal);
      if (Math.abs(v) > 65) { drawing = false; continue; }
      const x = xOf(u); const y = yOf(v);
      if (!drawing) { ctx.moveTo(x, y); drawing = true; } else ctx.lineTo(x, y);
    }
    ctx.stroke(); ctx.restore();

    if (!d.atFocus && Math.abs(d.imageDistance) <= 65) {
      ctx.fillStyle = d.real ? "#69d18e" : "#b58ce5";
      ctx.beginPath(); ctx.arc(xOf(d.objectDistance), yOf(d.imageDistance), 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "rgba(240,241,232,.46)"; ctx.font = "8px Avenir Next, sans-serif"; ctx.textAlign = "center";
    [10, 20, 30, 40, 50, 60].forEach((value) => ctx.fillText(String(value), xOf(value), pad.top + frame.height + 14));
    ctx.textAlign = "right"; [-60, 0, 60].forEach((value) => ctx.fillText(String(value), pad.left - 5, yOf(value) + 3));
  }

  function drawReciprocalChart() {
    reciprocalPlot.canvas = refs.reciprocalChart;
    const frame = drawChartFrame(reciprocalPlot, "1/u", "1/v");
    const ctx = reciprocalPlot.ctx; const d = calculate(); const { pad } = frame;
    const xOf = (value) => pad.left + (value / .34) * frame.width;
    const yOf = (value) => pad.top + ((.22 - value) / .4) * frame.height;
    drawLine(ctx, { x: pad.left, y: yOf(0) }, { x: pad.left + frame.width, y: yOf(0) }, "rgba(240,241,232,.28)", 1);

    const intercept = 1 / d.focal;
    drawLine(ctx, { x: xOf(0), y: yOf(intercept) }, { x: xOf(.34), y: yOf(intercept - .34) }, "#64c7d9", 1.8);
    state.samples.forEach((sample) => {
      ctx.fillStyle = sample.real ? "#69d18e" : "#b58ce5";
      ctx.beginPath(); ctx.arc(xOf(sample.x), yOf(sample.y), 3, 0, Math.PI * 2); ctx.fill();
    });
    if (!d.atFocus) {
      ctx.fillStyle = d.real ? "#f2b84b" : "#b58ce5";
      ctx.beginPath(); ctx.arc(xOf(1 / d.objectDistance), yOf(1 / d.imageDistance), 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "rgba(240,241,232,.46)"; ctx.font = "8px Avenir Next, sans-serif"; ctx.textAlign = "center";
    [0, .1, .2, .3].forEach((value) => ctx.fillText(value.toFixed(1), xOf(value), pad.top + frame.height + 14));
    ctx.textAlign = "right"; [-.1, 0, .1, .2].forEach((value) => ctx.fillText(value.toFixed(1), pad.left - 5, yOf(value) + 3));
  }

  function regionState(d) {
    if (d.region === "far") return { badge: "倒立 · 缩小 · 实像", nature: "倒立 · 缩小", reality: "实像，可由光屏承接" };
    if (d.region === "double") return { badge: "倒立 · 等大 · 实像", nature: "倒立 · 等大", reality: "实像，位于另一侧 2f" };
    if (d.region === "middle") return { badge: "倒立 · 放大 · 实像", nature: "倒立 · 放大", reality: "实像，可由光屏承接" };
    if (d.region === "focus") return { badge: "像在无穷远", nature: "折射光平行", reality: "有限位置没有清晰像" };
    return { badge: "正立 · 放大 · 虚像", nature: "正立 · 放大", reality: "虚像，光屏无法承接" };
  }

  function setRangeProgress(input, value) {
    const min = Number(input.min); const max = Number(input.max);
    input.style.setProperty("--range-progress", `${((value - min) / (max - min)) * 100}%`);
  }

  function sync() {
    const d = calculate(); const mode = MODES[state.mode]; const guide = GUIDE_STEPS[state.guideStep]; const description = regionState(d);
    refs.focalInput.value = state.focal; refs.objectDistanceInput.value = state.objectDistance; refs.objectDistanceNumber.value = state.objectDistance;
    refs.objectHeightInput.value = state.objectHeight; refs.screenInput.value = state.screenDistance;
    refs.focalValue.textContent = `${d.focal.toFixed(1)} cm`; refs.objectDistanceValue.textContent = `${d.objectDistance.toFixed(1)} cm`;
    refs.objectHeightValue.textContent = `${d.objectHeight.toFixed(1)} cm`; refs.screenValue.textContent = `${d.screenDistance.toFixed(1)} cm`;
    refs.objectMetric.textContent = `${d.objectDistance.toFixed(1)} cm`;
    refs.imageMetric.textContent = d.atFocus ? "∞" : `${d.imageDistance.toFixed(1)} cm`;
    refs.magnificationMetric.textContent = d.atFocus ? "−∞" : `${d.magnification < 0 ? "−" : "+"}${Math.abs(d.magnification).toFixed(2)}`;
    refs.imageHeightMetric.textContent = d.atFocus ? "−∞" : `${d.imageHeight.toFixed(1)} cm`;
    refs.imageNature.textContent = description.nature; refs.imageReality.textContent = description.reality;
    refs.stateBadge.textContent = description.badge;
    refs.stateBadge.classList.toggle("is-virtual", d.virtual); refs.stateBadge.classList.toggle("is-infinite", d.atFocus);
    refs.curveStatus.textContent = REGION_LABELS[d.region];
    refs.modeTitle.textContent = mode.title; refs.modeGoal.textContent = mode.goal;
    refs.dragHint.textContent = state.mode === "screen" ? "拖动光屏寻找清晰像" : "拖动物体改变物距";
    refs.stepIndex.textContent = guide.index; refs.stepTitle.textContent = guide.title; refs.stepPrompt.textContent = guide.prompt;
    refs.formulaLabel.textContent = d.atFocus ? "焦点状态" : "当前关系";
    refs.formulaReadout.textContent = d.atFocus
      ? `u = f = ${d.focal.toFixed(1)} cm，1/v = 0`
      : `1/${d.focal.toFixed(1)} = 1/${d.objectDistance.toFixed(1)} ${d.imageDistance < 0 ? "−" : "+"} 1/${Math.abs(d.imageDistance).toFixed(1)}`;
    refs.focusQuality.textContent = d.real ? `${Math.round(d.focusQuality * 100)}%` : "无法承接";
    refs.focusQuality.style.color = d.focusQuality > .92 ? "#69d18e" : d.real ? "#f2b84b" : "#b58ce5";
    refs.alignScreenButton.disabled = !d.real || d.imageDistance < 5 || d.imageDistance > 60;
    refs.recordButton.disabled = d.atFocus;
    refs.recordButton.textContent = `记录参数${state.samples.length ? ` (${state.samples.length})` : ""}`;
    refs.raysToggle.checked = state.showRays; refs.extensionsToggle.checked = state.showExtensions; refs.markersToggle.checked = state.showMarkers; refs.screenToggle.checked = state.showScreen;
    refs.modeButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.mode === state.mode));
    refs.guideButtons.forEach((button) => button.classList.toggle("is-active", Number(button.dataset.guideStep) === state.guideStep));
    refs.regionButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.region === d.region));
    setRangeProgress(refs.focalInput, d.focal); setRangeProgress(refs.objectDistanceInput, d.objectDistance); setRangeProgress(refs.objectHeightInput, d.objectHeight); setRangeProgress(refs.screenInput, d.screenDistance);
    drawApparatus(); drawDistanceChart(); drawReciprocalChart();
  }

  function setParameter(key, input, value) {
    const next = Number(value); if (!Number.isFinite(next)) return;
    state[key] = clamp(next, Number(input.min), Number(input.max));
    sync();
  }

  function setRegion(region) {
    const focal = state.focal;
    const targets = { far: 3 * focal, double: 2 * focal, middle: 1.5 * focal, focus: focal, near: .7 * focal };
    state.objectDistance = clamp(targets[region] || state.objectDistance, 3, 60);
    sync();
  }

  function setMode(modeName) {
    if (!MODES[modeName]) return;
    state.mode = modeName;
    if (modeName === "rays") state.showRays = true;
    if (modeName === "screen") state.showScreen = true;
    sync();
  }

  function setState(patch) {
    if (!patch || typeof patch !== "object") return;
    if (Number.isFinite(Number(patch.focal))) state.focal = clamp(Number(patch.focal), 5, 20);
    if (Number.isFinite(Number(patch.objectDistance))) state.objectDistance = clamp(Number(patch.objectDistance), 3, 60);
    if (Number.isFinite(Number(patch.objectHeight))) state.objectHeight = clamp(Number(patch.objectHeight), 1, 8);
    if (Number.isFinite(Number(patch.screenDistance))) state.screenDistance = clamp(Number(patch.screenDistance), 5, 60);
    if (typeof patch.mode === "string" && MODES[patch.mode]) state.mode = patch.mode;
    if (Number.isFinite(Number(patch.guideStep))) state.guideStep = clamp(Math.round(Number(patch.guideStep)), 0, GUIDE_STEPS.length - 1);
    ["showRays", "showExtensions", "showMarkers", "showScreen"].forEach((key) => {
      if (typeof patch[key] === "boolean") state[key] = patch[key];
    });
    sync();
  }

  function recordSample() {
    const d = calculate();
    if (d.atFocus) return;
    const duplicate = state.samples.some((sample) => near(sample.focal, d.focal, 1e-6) && near(sample.objectDistance, d.objectDistance, 1e-6));
    if (!duplicate) state.samples.push({ focal: d.focal, objectDistance: d.objectDistance, imageDistance: d.imageDistance, x: 1 / d.objectDistance, y: 1 / d.imageDistance, real: d.real });
    state.mode = "relation"; state.guideStep = 2; sync();
  }

  function setFromPointer(event) {
    const rect = refs.canvas.getBoundingClientRect(); const x = event.clientX - rect.left;
    if (dragTarget === "screen") state.screenDistance = clamp((x - apparatus.lensX) / apparatus.scale, 5, 60);
    else state.objectDistance = clamp((apparatus.lensX - x) / apparatus.scale, 3, 60);
    sync();
  }

  [[refs.focalInput, "focal"], [refs.objectDistanceInput, "objectDistance"], [refs.objectHeightInput, "objectHeight"], [refs.screenInput, "screenDistance"]].forEach(([input, key]) => input.addEventListener("input", (event) => setParameter(key, input, event.target.value)));
  refs.objectDistanceNumber.addEventListener("input", (event) => { if (event.target.value !== "") setParameter("objectDistance", refs.objectDistanceInput, event.target.value); });
  refs.nudgeButtons.forEach((button) => button.addEventListener("click", () => setParameter("objectDistance", refs.objectDistanceInput, state.objectDistance + Number(button.dataset.nudge))));
  refs.modeButtons.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
  refs.guideButtons.forEach((button) => button.addEventListener("click", () => { state.guideStep = Number(button.dataset.guideStep); sync(); }));
  refs.regionButtons.forEach((button) => button.addEventListener("click", () => setRegion(button.dataset.region)));
  [[refs.raysToggle, "showRays"], [refs.extensionsToggle, "showExtensions"], [refs.markersToggle, "showMarkers"], [refs.screenToggle, "showScreen"]].forEach(([control, key]) => control.addEventListener("change", () => { state[key] = control.checked; sync(); }));
  refs.alignScreenButton.addEventListener("click", () => { const d = calculate(); if (d.real && d.imageDistance >= 5 && d.imageDistance <= 60) { state.screenDistance = d.imageDistance; state.mode = "screen"; sync(); } });
  refs.recordButton.addEventListener("click", recordSample);
  refs.clearDataButton.addEventListener("click", () => { state.samples = []; sync(); });
  refs.resetButton.addEventListener("click", () => { Object.assign(state, { focal: 10, objectDistance: 30, objectHeight: 4, screenDistance: 15, mode: "regions", guideStep: 0, showRays: true, showExtensions: true, showMarkers: true, showScreen: true, samples: [] }); sync(); });
  refs.guideButton.addEventListener("click", () => refs.guideDialog.showModal());
  refs.stepButton.addEventListener("click", () => { state.guideStep = (state.guideStep + 1) % GUIDE_STEPS.length; sync(); });
  refs.focusButton.addEventListener("click", () => { const active = document.body.classList.toggle("focus-mode"); refs.focusButton.setAttribute("aria-pressed", String(active)); requestAnimationFrame(sync); });
  refs.fullscreenButton.addEventListener("click", () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.(); });

  refs.canvas.tabIndex = 0;
  refs.canvas.addEventListener("pointerdown", (event) => {
    const rect = refs.canvas.getBoundingClientRect(); const x = event.clientX - rect.left;
    dragTarget = state.showScreen && Math.abs(x - apparatus.screenX) < 24 ? "screen" : "object";
    event.preventDefault();
    try { refs.canvas.setPointerCapture?.(event.pointerId); } catch (error) { /* Synthetic events may not own pointer capture. */ }
    setFromPointer(event);
  });
  refs.canvas.addEventListener("pointermove", (event) => { if (!dragTarget) return; event.preventDefault(); setFromPointer(event); });
  refs.canvas.addEventListener("pointerup", () => { dragTarget = null; }); refs.canvas.addEventListener("pointercancel", () => { dragTarget = null; });
  refs.canvas.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault(); const delta = event.key === "ArrowLeft" ? -.5 : .5;
    if (event.shiftKey) state.screenDistance = clamp(state.screenDistance + delta, 5, 60);
    else state.objectDistance = clamp(state.objectDistance - delta, 3, 60);
    sync();
  });

  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(() => requestAnimationFrame(sync));
    [refs.canvas, refs.distanceChart, refs.reciprocalChart].forEach((canvas) => observer.observe(canvas));
  } else window.addEventListener("resize", () => requestAnimationFrame(sync));

  window.lensLab = {
    calculate: (patch) => calculate({ ...state, ...(patch || {}) }),
    getState: () => JSON.parse(JSON.stringify(state)),
    setState,
    setMode,
    setRegion,
    recordSample
  };
  sync();
})();
