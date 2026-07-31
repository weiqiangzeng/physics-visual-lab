(function () {
  "use strict";
  const M = window.HookeMeasurementModel;
  if (!M) throw new Error("HookeMeasurementModel is required");

  const MODES = {
    loading: ["逐个加码", "每次只增加一个砝码，待静止后记录总长与伸长"],
    reading: ["标尺读数", "比较原长和加载总长，让共同零误差在相减中抵消"],
    fit: ["F–x 拟合", "只选择弹性区数据，以斜率得到劲度系数并检查残差"],
    limit: ["弹性限度", "把加载推进到非线性区，再沿卸载线观察永久伸长"],
  };
  const STEPS = [
    ["先测原长", "为什么每次应使用总长减去同一次实验测得的原长，而不是直接读“伸长”？"],
    ["再逐个加码", "砝码质量怎样转换成弹簧受到的载荷，为什么要等系统静止？"],
    ["最后筛选拟合", "超过弹性限度的数据为什么不能继续并入同一条直线？"],
  ];
  const state = {
    mode: "loading", springConstantNm: 40, naturalLengthCm: 12, massStepG: 50, gravityMs2: 9.8,
    pointCount: 8, loadIndex: 5, elasticLimitN: 3.2, postYieldRatio: .3, rulerResolutionMm: .5,
    readingNoiseMm: .3, zeroErrorMm: .6, seed: 31, guideStep: 0,
    showIdeal: true, showFit: true, showInvalid: true, showRuler: true, dragging: false,
  };
  const $ = (id) => document.getElementById(id);
  const R = {
    main: $("springCanvas"), force: $("forceChart"), evidence: $("evidenceChart"),
    spring: $("springInput"), natural: $("naturalInput"), massStep: $("massStepInput"), points: $("pointsInput"), load: $("loadInput"),
    limit: $("limitInput"), resolution: $("resolutionInput"), noise: $("noiseInput"), zero: $("zeroInput"), seed: $("seedInput"),
    springValue: $("springValue"), naturalValue: $("naturalValue"), massStepValue: $("massStepValue"), pointsValue: $("pointsValue"),
    loadValue: $("loadValue"), limitValue: $("limitValue"), resolutionValue: $("resolutionValue"), noiseValue: $("noiseValue"), zeroValue: $("zeroValue"), seedValue: $("seedValue"),
    massMetric: $("massMetric"), forceMetric: $("forceMetric"), lengthMetric: $("lengthMetric"), extensionMetric: $("extensionMetric"), fitMetric: $("fitMetric"), setMetric: $("setMetric"),
    nature: $("natureText"), explanation: $("explanationText"), modeTitle: $("modeTitle"), modeGoal: $("modeGoal"), badge: $("stateBadge"),
    dataTitle: $("dataTitle"), dataStatus: $("dataStatus"), evidenceKicker: $("evidenceKicker"), evidenceTitle: $("evidenceTitle"), evidenceStatus: $("evidenceStatus"),
    stepIndex: $("stepIndex"), stepTitle: $("stepTitle"), stepPrompt: $("stepPrompt"), formula: $("formulaReadout"),
    ideal: $("showIdealToggle"), fit: $("showFitToggle"), invalid: $("showInvalidToggle"), ruler: $("showRulerToggle"),
    add: $("addButton"), remove: $("removeButton"), reset: $("resetButton"), guide: $("guideButton"), step: $("stepButton"), focus: $("focusButton"), fullscreen: $("fullscreenButton"), dialog: $("guideDialog"),
    tabs: [...document.querySelectorAll(".scene-tab[data-mode]")], route: [...document.querySelectorAll(".route-step")],
  };
  const ctx = R.main.getContext("2d"), fctx = R.force.getContext("2d"), ectx = R.evidence.getContext("2d");
  const C = { bg: "#070b0c", grid: "rgba(223,229,223,.055)", cyan: "#64c7d9", amber: "#f0b951", violet: "#b58ce5", green: "#79d992", red: "#ff786e", text: "#a6b0a9", muted: "#717b75" };
  const clamp = M.clamp;
  const fmt = (value, digits = 2) => Number(value).toFixed(digits).replace("-", "−");
  const signed = (value, digits = 2) => `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(digits)}`;

  function size(canvas, context, minHeight = 180) {
    const box = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    const width = Math.max(280, Math.round(box.width)), height = Math.max(minHeight, Math.round(box.height));
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) { canvas.width = width * dpr; canvas.height = height * dpr; }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width, height };
  }
  function line(context, x1, y1, x2, y2, color, width = 1, dash = []) { context.save(); context.strokeStyle = color; context.lineWidth = width; context.setLineDash(dash); context.beginPath(); context.moveTo(x1, y1); context.lineTo(x2, y2); context.stroke(); context.restore(); }
  function text(context, value, x, y, color = C.text, px = 9, align = "left", weight = 600) { context.fillStyle = color; context.font = `${weight} ${px}px ui-sans-serif,system-ui`; context.textAlign = align; context.fillText(value, x, y); }
  function background(context, width, height) { context.fillStyle = C.bg; context.fillRect(0, 0, width, height); for (let x = 16; x < width; x += 42) line(context, x, 0, x, height, C.grid); for (let y = 16; y < height; y += 42) line(context, 0, y, width, y, C.grid); }
  function axes(context, viewport, xmin, xmax, ymin, ymax) { const p = { l: 43, r: 14, t: 20, b: 29 }; const x = (v) => p.l + (v - xmin) / (xmax - xmin || 1) * (viewport.width - p.l - p.r); const y = (v) => viewport.height - p.b - (v - ymin) / (ymax - ymin || 1) * (viewport.height - p.t - p.b); line(context, p.l, p.t, p.l, viewport.height - p.b, "rgba(223,229,223,.28)"); line(context, p.l, viewport.height - p.b, viewport.width - p.r, viewport.height - p.b, "rgba(223,229,223,.28)"); return { x, y, p }; }
  function range(element, value) { element.value = value; element.style.setProperty("--range-progress", `${(value - +element.min) / (+element.max - +element.min) * 100}%`); }

  function springPath(x, y1, y2, color) {
    const turns = 12, amplitude = 16;
    ctx.strokeStyle = color; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(x, y1);
    for (let index = 1; index <= turns * 2; index += 1) ctx.lineTo(x + (index % 2 ? amplitude : -amplitude), y1 + (y2 - y1) * index / (turns * 2 + 1));
    ctx.lineTo(x, y2); ctx.stroke();
  }

  function drawMain(solution) {
    const q = solution.experiment, viewport = size(R.main, ctx, 280); background(ctx, viewport.width, viewport.height);
    const x = viewport.width < 520 ? viewport.width * .32 : viewport.width * .30, top = 30, bottom = viewport.height - 42;
    const maxExtension = Math.max(.12, q.maximum.maximumExtensionM * 1.12), naturalPixels = Math.min(130, (bottom - top) * .34);
    const scale = Math.max(400, (bottom - top - naturalPixels - 42) / maxExtension);
    const naturalEnd = top + naturalPixels;
    const currentEnd = Math.min(bottom - 34, naturalEnd + q.current.trueExtensionM * scale);
    ctx.fillStyle = "#4e5852"; ctx.fillRect(x - 70, top - 8, 140, 8); line(ctx, x - 70, top, x + 70, top, C.text, 2);
    springPath(x, top, currentEnd, q.current.withinElasticLimit ? C.cyan : C.red);
    line(ctx, x - 32, currentEnd, x + 32, currentEnd, C.amber, 3);
    const visibleWeights = Math.min(q.current.index, 7);
    for (let index = 0; index < visibleWeights; index += 1) {
      const y = currentEnd + 8 + index * 13;
      ctx.fillStyle = index % 2 ? "#3d4741" : "#52605a"; ctx.strokeStyle = C.amber; ctx.lineWidth = 1;
      ctx.fillRect(x - 25, y, 50, 10); ctx.strokeRect(x - 25, y, 50, 10);
    }
    if (q.current.index === 0) text(ctx, "空挂钩", x, currentEnd + 24, C.muted, 9, "center");
    else text(ctx, `${q.current.index} × ${fmt(state.massStepG, 0)}g`, x, Math.min(bottom - 4, currentEnd + 24 + visibleWeights * 13), C.amber, 9, "center", 700);
    line(ctx, x - 55, naturalEnd, x + 58, naturalEnd, C.violet, 1, [4, 4]); text(ctx, "原长末端", x + 62, naturalEnd + 3, C.violet, 8);

    if (state.showRuler) {
      const rulerX = x + 100, y0 = top;
      line(ctx, rulerX, y0, rulerX, bottom, C.muted, 2);
      const maxLengthMm = state.naturalLengthCm * 10 + maxExtension * 1000;
      for (let mm = 0; mm <= maxLengthMm; mm += 10) {
        const y = y0 + mm / maxLengthMm * (bottom - y0);
        line(ctx, rulerX, y, rulerX + (mm % 50 === 0 ? 14 : 8), y, C.text, 1);
        if (mm % 50 === 0) text(ctx, String(mm), rulerX + 18, y + 3, C.muted, 8);
      }
      text(ctx, "L/mm", rulerX + 18, top - 9, C.muted, 8);
      const readingY = y0 + q.current.readingMm / maxLengthMm * (bottom - y0);
      line(ctx, rulerX - 8, readingY, rulerX + 34, readingY, C.green, 2);
      text(ctx, fmt(q.current.readingMm, 1), rulerX + 38, readingY + 3, C.green, 8);
    }

    if (state.mode === "limit" && q.maximum.overloaded) {
      const ghostEnd = naturalEnd + q.maximum.permanentSetM * scale;
      springPath(x - 62, top, ghostEnd, "rgba(181,140,229,.55)");
      line(ctx, x - 85, ghostEnd, x - 39, ghostEnd, C.violet, 2);
      text(ctx, `卸载后 +${fmt(q.maximum.permanentSetM * 1000, 1)}mm`, 14, ghostEnd + 18, C.violet, 8);
    }

    const panelX = viewport.width < 520 ? viewport.width * .63 : viewport.width * .59;
    text(ctx, "数据记录", panelX, 34, C.text, 10, "left", 700);
    q.data.slice(0, 8).forEach((point, index) => {
      const y = 58 + index * 27;
      line(ctx, panelX, y + 8, viewport.width - 15, y + 8, "rgba(223,229,223,.08)");
      text(ctx, `${point.massG}g`, panelX, y, C.muted, 8);
      text(ctx, `${fmt(point.measuredExtensionM * 1000, 1)}mm`, viewport.width - 18, y, point.withinElasticLimit ? C.cyan : C.red, 8, "right", 700);
    });
    text(ctx, "上下拖动挂钩改变砝码数", 16, viewport.height - 10, C.muted, 8);
  }

  function drawForceChart(solution) {
    const q = solution.experiment, viewport = size(R.force, fctx); background(fctx, viewport.width, viewport.height);
    const xmax = Math.max(.02, ...q.data.map((point) => point.measuredExtensionM), q.maximum.maximumExtensionM) * 1.08;
    const ymax = q.maximum.maximumForceN * 1.12 || 1, a = axes(fctx, viewport, 0, xmax, 0, ymax);
    if (state.showIdeal) line(fctx, a.x(0), a.y(0), a.x(xmax), a.y(state.springConstantNm * xmax), C.violet, 1.3, [5, 4]);
    if (state.showFit) line(fctx, a.x(0), a.y(q.fit.intercept), a.x(xmax), a.y(q.fit.intercept + q.fit.slope * xmax), C.amber, 2);
    q.data.forEach((point) => {
      if (!point.withinElasticLimit && !state.showInvalid) return;
      fctx.fillStyle = point.withinElasticLimit ? C.cyan : C.red; fctx.beginPath(); fctx.arc(a.x(point.measuredExtensionM), a.y(point.forceN), point.index === state.loadIndex ? 5.5 : 4, 0, Math.PI * 2); fctx.fill();
    });
    line(fctx, a.x(0), a.y(state.elasticLimitN), a.x(xmax), a.y(state.elasticLimitN), "rgba(255,120,110,.5)", 1, [4, 4]);
    text(fctx, "F/N", 7, 13, C.cyan); text(fctx, "x/m", viewport.width - 8, viewport.height - 6, C.muted, 8, "right");
  }

  function drawResiduals(solution) {
    const q = solution.experiment, viewport = size(R.evidence, ectx); background(ectx, viewport.width, viewport.height);
    const values = q.fit.residuals, maxAbs = Math.max(.01, ...values.map(Math.abs)) * 1.3, a = axes(ectx, viewport, 0, values.length - 1, -maxAbs, maxAbs);
    line(ectx, a.x(0), a.y(0), a.x(values.length - 1), a.y(0), C.muted, 1);
    values.forEach((value, index) => { const x = a.x(index); line(ectx, x, a.y(0), x, a.y(value), value >= 0 ? C.green : C.violet, 6); });
    text(ectx, "F残差/N", 7, 13, C.violet); text(ectx, "有效点序号", viewport.width - 8, viewport.height - 6, C.muted, 8, "right");
  }

  function drawHysteresis(solution) {
    const q = solution.hysteresis, viewport = size(R.evidence, ectx); background(ectx, viewport.width, viewport.height);
    const xmax = Math.max(.02, q.maximumExtensionM) * 1.08, ymax = q.maximumForceN * 1.12 || 1, a = axes(ectx, viewport, 0, xmax, 0, ymax);
    [[q.loading, C.red], [q.unloading, C.violet]].forEach(([points, color]) => { ectx.strokeStyle = color; ectx.lineWidth = 2; ectx.beginPath(); points.forEach((point, index) => index ? ectx.lineTo(a.x(point.extensionM), a.y(point.forceN)) : ectx.moveTo(a.x(point.extensionM), a.y(point.forceN))); ectx.stroke(); });
    line(ectx, a.x(q.permanentSetM), a.y(0), a.x(q.permanentSetM), a.y(ymax * .18), C.green, 2);
    text(ectx, "加载", 8, 13, C.red); text(ectx, "卸载", 48, 13, C.violet); text(ectx, "x/m", viewport.width - 8, viewport.height - 6, C.muted, 8, "right");
  }

  function render() {
    state.loadIndex = Math.min(state.loadIndex, state.pointCount - 1);
    R.load.max = String(state.pointCount - 1);
    const solution = M.solve(state), q = solution.experiment, current = q.current, overloaded = !current.withinElasticLimit;
    [[R.spring, state.springConstantNm], [R.natural, state.naturalLengthCm], [R.massStep, state.massStepG], [R.points, state.pointCount], [R.load, state.loadIndex], [R.limit, state.elasticLimitN], [R.resolution, state.rulerResolutionMm], [R.noise, state.readingNoiseMm], [R.zero, state.zeroErrorMm], [R.seed, state.seed]].forEach(([element, value]) => range(element, value));
    R.springValue.textContent = `${fmt(state.springConstantNm, 0)} N/m`; R.naturalValue.textContent = `${fmt(state.naturalLengthCm, 1)} cm`; R.massStepValue.textContent = `${fmt(state.massStepG, 0)} g`; R.pointsValue.textContent = String(state.pointCount); R.loadValue.textContent = String(state.loadIndex); R.limitValue.textContent = `${fmt(state.elasticLimitN, 2)} N`; R.resolutionValue.textContent = `${fmt(state.rulerResolutionMm, 2)} mm`; R.noiseValue.textContent = `${fmt(state.readingNoiseMm, 2)} mm`; R.zeroValue.textContent = `${signed(state.zeroErrorMm, 2)} mm`; R.seedValue.textContent = String(state.seed);
    R.massMetric.textContent = `${fmt(current.massG, 0)} g`; R.forceMetric.textContent = `${fmt(current.forceN, 3)} N`; R.lengthMetric.textContent = `${fmt(current.readingMm, 1)} mm`; R.extensionMetric.textContent = `${fmt(current.measuredExtensionM * 1000, 1)} mm`; R.fitMetric.textContent = `${fmt(q.estimatedSpringConstantNm, 2)} N/m`; R.setMetric.textContent = `${fmt(q.maximum.permanentSetM * 1000, 1)} mm`;
    R.nature.textContent = overloaded ? "当前点已超过线性弹性限度" : "当前点位于线性弹性区";
    R.explanation.textContent = state.mode === "reading" ? `共同零误差 ${signed(state.zeroErrorMm, 2)}mm 在 L−L₀ 中抵消` : state.mode === "limit" ? (q.maximum.overloaded ? "过载点使卸载后留下永久伸长" : "当前最大载荷尚未越过弹性限度") : "只将弹性限度内的数据用于斜率拟合";
    R.badge.textContent = `${overloaded ? "超限" : "弹性区"} · n=${state.loadIndex}`; R.badge.className = `state-badge${overloaded ? " is-over" : ""}`;
    R.modeTitle.textContent = MODES[state.mode][0]; R.modeGoal.textContent = MODES[state.mode][1]; R.tabs.forEach((button) => button.classList.toggle("is-active", button.dataset.mode === state.mode)); R.route.forEach((button, index) => button.classList.toggle("is-active", index === state.guideStep));
    R.stepIndex.textContent = String(state.guideStep + 1).padStart(2, "0"); R.stepTitle.textContent = STEPS[state.guideStep][0]; R.stepPrompt.textContent = STEPS[state.guideStep][1]; R.formula.textContent = state.mode === "reading" ? "x=L−L₀" : state.mode === "limit" ? "F>Flim：线性模型失效" : "k=ΔF/Δx";
    R.dataTitle.textContent = state.mode === "reading" ? "总长相减与 F–x 数据" : "F–x 测量与有效拟合"; R.dataStatus.textContent = `k测=${fmt(q.estimatedSpringConstantNm, 2)}N/m`;
    if (state.mode === "limit") { R.evidenceKicker.textContent = "LOAD / UNLOAD"; R.evidenceTitle.textContent = "过载与卸载回线"; R.evidenceStatus.textContent = `永久伸长 ${fmt(q.maximum.permanentSetM * 1000, 1)}mm`; }
    else { R.evidenceKicker.textContent = "READING RESIDUALS"; R.evidenceTitle.textContent = "弹性区拟合残差"; R.evidenceStatus.textContent = `R²=${fmt(q.fit.rSquared, 5)}`; }
    drawMain(solution); drawForceChart(solution); state.mode === "limit" ? drawHysteresis(solution) : drawResiduals(solution);
  }

  function setMode(mode) { if (!MODES[mode]) return; state.mode = mode; if (mode === "limit") state.loadIndex = state.pointCount - 1; render(); }
  function reset() { Object.assign(state, { mode: "loading", springConstantNm: 40, naturalLengthCm: 12, massStepG: 50, gravityMs2: 9.8, pointCount: 8, loadIndex: 5, elasticLimitN: 3.2, postYieldRatio: .3, rulerResolutionMm: .5, readingNoiseMm: .3, zeroErrorMm: .6, seed: 31, guideStep: 0, showIdeal: true, showFit: true, showInvalid: true, showRuler: true, dragging: false }); [[R.ideal, "showIdeal"], [R.fit, "showFit"], [R.invalid, "showInvalid"], [R.ruler, "showRuler"]].forEach(([element, key]) => { element.checked = state[key]; }); render(); }
  function setState(next = {}) { if (MODES[next.mode]) state.mode = next.mode; Object.assign(state, M.normalize({ ...state, ...next })); if (Number.isFinite(+next.guideStep)) state.guideStep = Math.round(clamp(+next.guideStep, 0, 2)); ["showIdeal", "showFit", "showInvalid", "showRuler"].forEach((key) => { if (typeof next[key] === "boolean") state[key] = next[key]; }); state.dragging = false; render(); }

  [[R.spring, "springConstantNm"], [R.natural, "naturalLengthCm"], [R.massStep, "massStepG"], [R.points, "pointCount"], [R.load, "loadIndex"], [R.limit, "elasticLimitN"], [R.resolution, "rulerResolutionMm"], [R.noise, "readingNoiseMm"], [R.zero, "zeroErrorMm"], [R.seed, "seed"]].forEach(([element, key]) => element.addEventListener("input", () => { state[key] = +element.value; render(); }));
  [[R.ideal, "showIdeal"], [R.fit, "showFit"], [R.invalid, "showInvalid"], [R.ruler, "showRuler"]].forEach(([element, key]) => element.addEventListener("change", () => { state[key] = element.checked; render(); }));
  R.tabs.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode))); R.route.forEach((button, index) => button.addEventListener("click", () => { state.guideStep = index; render(); }));
  R.add.addEventListener("click", () => { state.loadIndex = Math.min(state.pointCount - 1, state.loadIndex + 1); render(); }); R.remove.addEventListener("click", () => { state.loadIndex = Math.max(0, state.loadIndex - 1); render(); }); R.reset.addEventListener("click", reset); R.guide.addEventListener("click", () => R.dialog.showModal()); R.step.addEventListener("click", () => { state.guideStep = (state.guideStep + 1) % 3; render(); }); R.focus.addEventListener("click", () => { const active = document.body.classList.toggle("focus-mode"); R.focus.setAttribute("aria-pressed", String(active)); }); R.fullscreen.addEventListener("click", () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());
  function dragLoad(event) { const box = R.main.getBoundingClientRect(); const ratio = clamp((event.clientY - box.top) / box.height, .08, .92); state.loadIndex = Math.round((ratio - .08) / .84 * (state.pointCount - 1)); render(); }
  R.main.addEventListener("pointerdown", (event) => { state.dragging = true; R.main.setPointerCapture?.(event.pointerId); dragLoad(event); }); R.main.addEventListener("pointermove", (event) => { if (state.dragging) dragLoad(event); }); R.main.addEventListener("pointerup", () => { state.dragging = false; }); R.main.addEventListener("pointercancel", () => { state.dragging = false; }); window.addEventListener("resize", render);
  window.hookeMeasurementLab = { experiment: (next) => M.experiment(next), hysteresis: (next) => M.hysteresis(next), loadingExtension: (force, next) => M.loadingExtension(force, next), unloadingExtension: (force, next) => M.unloadingExtension(force, next), solve: (next) => M.solve(next), getState: () => ({ ...state }), setState, setMode, reset };
  render();
})();
