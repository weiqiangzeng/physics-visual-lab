(function () {
  "use strict";

  const M = window.FreeFallMeasurementModel;
  if (!M) throw new Error("FreeFallMeasurementModel is required");

  const MODES = {
    gates: ["光电门采集", "读取每个门的位移和累计时间，先判断原始数据是否可信"],
    strobe: ["频闪逐差", "用等时间隔位置的二阶差直接估计重力加速度"],
    fit: ["s–t² 拟合", "把曲线关系线性化，用斜率和残差检验模型"],
    uncertainty: ["重复与不确定度", "区分单次离散、均值偏差和标准误随次数的变化"],
  };
  const STEPS = [
    ["先检查原始量", "位移从哪里起算，计时器记录的是累计时间还是相邻时间？"],
    ["再选择处理法", "逐差法与 s–t² 拟合分别利用了数据中的什么结构？"],
    ["最后报告结果", "为什么测得 g 后还应报告标准差、标准误和可能的系统误差？"],
  ];
  const state = {
    mode: "gates",
    gravityMs2: 9.8,
    heightM: 2.4,
    sampleCount: 7,
    strobeIntervalS: .08,
    timeResolutionMs: .1,
    positionNoiseMm: .5,
    repeats: 30,
    seed: 23,
    guideStep: 0,
    showIdeal: true,
    showFit: true,
    showResiduals: true,
    showUncertainty: true,
    dragging: false,
  };

  const $ = (id) => document.getElementById(id);
  const R = {
    main: $("fallCanvas"), data: $("dataChart"), evidence: $("evidenceChart"),
    height: $("heightInput"), gravity: $("gravityInput"), samples: $("samplesInput"), interval: $("intervalInput"),
    resolution: $("resolutionInput"), noise: $("noiseInput"), repeats: $("repeatsInput"), seed: $("seedInput"),
    heightValue: $("heightValue"), gravityValue: $("gravityValue"), samplesValue: $("samplesValue"), intervalValue: $("intervalValue"),
    resolutionValue: $("resolutionValue"), noiseValue: $("noiseValue"), repeatsValue: $("repeatsValue"), seedValue: $("seedValue"),
    estimate: $("estimateMetric"), truth: $("truthMetric"), error: $("errorMetric"), relative: $("relativeMetric"), impact: $("impactMetric"),
    qualityLabel: $("qualityLabel"), quality: $("qualityMetric"), nature: $("natureText"), explanation: $("explanationText"),
    modeTitle: $("modeTitle"), modeGoal: $("modeGoal"), badge: $("stateBadge"),
    dataKicker: $("dataKicker"), dataTitle: $("dataTitle"), dataStatus: $("dataStatus"),
    evidenceKicker: $("evidenceKicker"), evidenceTitle: $("evidenceTitle"), evidenceStatus: $("evidenceStatus"),
    stepIndex: $("stepIndex"), stepTitle: $("stepTitle"), stepPrompt: $("stepPrompt"), formula: $("formulaReadout"),
    ideal: $("showIdealToggle"), fit: $("showFitToggle"), residuals: $("showResidualsToggle"), uncertainty: $("showUncertaintyToggle"),
    reset: $("resetButton"), newRun: $("newRunButton"), idealButton: $("idealButton"), guide: $("guideButton"),
    step: $("stepButton"), focus: $("focusButton"), fullscreen: $("fullscreenButton"), dialog: $("guideDialog"),
    tabs: [...document.querySelectorAll(".scene-tab[data-mode]")], route: [...document.querySelectorAll(".route-step")],
  };
  const ctx = R.main.getContext("2d");
  const dctx = R.data.getContext("2d");
  const ectx = R.evidence.getContext("2d");
  const C = {
    bg: "#070b0c", grid: "rgba(223,229,223,.055)", cyan: "#64c7d9", amber: "#f0b951",
    violet: "#b58ce5", green: "#79d992", red: "#ff786e", text: "#a6b0a9", muted: "#717b75",
  };
  const clamp = M.clamp;
  const fmt = (value, digits = 3) => Number(value).toFixed(digits).replace("-", "−");
  const signed = (value, digits = 3) => `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(digits)}`;

  function size(canvas, context, minHeight = 180) {
    const box = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const width = Math.max(280, Math.round(box.width));
    const height = Math.max(minHeight, Math.round(box.height));
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width, height };
  }

  function line(context, x1, y1, x2, y2, stroke, width = 1, dash = []) {
    context.save();
    context.strokeStyle = stroke;
    context.lineWidth = width;
    context.setLineDash(dash);
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
    context.restore();
  }

  function text(context, value, x, y, fill = C.text, px = 9, align = "left", weight = 600) {
    context.fillStyle = fill;
    context.font = `${weight} ${px}px ui-sans-serif,system-ui`;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function background(context, width, height) {
    context.fillStyle = C.bg;
    context.fillRect(0, 0, width, height);
    for (let x = 16; x < width; x += 42) line(context, x, 0, x, height, C.grid);
    for (let y = 16; y < height; y += 42) line(context, 0, y, width, y, C.grid);
  }

  function axes(context, viewport, xmin, xmax, ymin, ymax) {
    const padding = { left: 42, right: 14, top: 20, bottom: 29 };
    const x = (value) => padding.left + (value - xmin) / (xmax - xmin || 1) * (viewport.width - padding.left - padding.right);
    const y = (value) => viewport.height - padding.bottom - (value - ymin) / (ymax - ymin || 1) * (viewport.height - padding.top - padding.bottom);
    line(context, padding.left, padding.top, padding.left, viewport.height - padding.bottom, "rgba(223,229,223,.28)");
    line(context, padding.left, viewport.height - padding.bottom, viewport.width - padding.right, viewport.height - padding.bottom, "rgba(223,229,223,.28)");
    return { x, y, padding };
  }

  function range(element, value) {
    element.value = value;
    element.style.setProperty("--range-progress", `${(value - +element.min) / (+element.max - +element.min) * 100}%`);
  }

  function currentResult(solution) {
    if (state.mode === "strobe") return { estimate: solution.strobe.estimatedGravityMs2, relative: solution.strobe.relativeError };
    if (state.mode === "uncertainty") return { estimate: solution.uncertainty.mean, relative: solution.uncertainty.relativeBias };
    return { estimate: solution.gate.estimatedGravityMs2, relative: solution.gate.relativeError };
  }

  function drawBall(x, y, radius = 8, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = C.amber;
    ctx.shadowColor = C.amber;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawMain(solution) {
    const viewport = size(R.main, ctx, 280);
    background(ctx, viewport.width, viewport.height);
    const top = 26;
    const bottom = viewport.height - 30;
    const releaseTravel = Math.min(96, (bottom - top) * .28);
    const releaseY = top + (5 - state.heightM) / 4.2 * releaseTravel;
    const apparatusX = viewport.width < 520 ? viewport.width * .38 : viewport.width * .32;
    const rulerX = apparatusX + 70;
    const panelX = viewport.width < 520 ? viewport.width * .62 : viewport.width * .58;

    line(ctx, apparatusX - 58, bottom, apparatusX + 94, bottom, "#59635d", 4);
    line(ctx, apparatusX - 48, top, apparatusX - 48, bottom, "#46504a", 3);
    line(ctx, apparatusX - 48, releaseY, apparatusX - 6, releaseY, C.cyan, 3);
    ctx.fillStyle = "rgba(100,199,217,.14)";
    ctx.fillRect(apparatusX - 17, releaseY - 12, 34, 13);
    drawBall(apparatusX, releaseY + 16, 9);
    text(ctx, "电磁释放器", apparatusX - 54, releaseY - 10, C.cyan, 9);

    line(ctx, rulerX, releaseY, rulerX, bottom, C.muted, 2);
    for (let i = 0; i <= 10; i += 1) {
      const y = releaseY + (bottom - releaseY) * i / 10;
      line(ctx, rulerX, y, rulerX + (i % 2 ? 8 : 14), y, C.text, 1);
      if (i % 2 === 0) text(ctx, fmt(state.heightM * i / 10, 1), rulerX + 18, y + 3, C.muted, 8);
    }
    text(ctx, "s / m", rulerX + 18, Math.max(14, releaseY - 8), C.muted, 8);

    if (state.showIdeal) {
      line(ctx, apparatusX, releaseY + 25, apparatusX, bottom, "rgba(181,140,229,.35)", 1, [5, 5]);
      text(ctx, "理想自由落体路径", apparatusX - 12, bottom - 8, C.violet, 8, "right");
    }

    if (state.mode === "strobe") {
      solution.strobe.data.forEach((point, index) => {
        const y = releaseY + point.measuredDistanceM / state.heightM * (bottom - releaseY);
        drawBall(apparatusX, y, index === 0 ? 5 : 4, .28 + .72 * index / (solution.strobe.data.length - 1));
        line(ctx, apparatusX + 12, y, rulerX - 4, y, "rgba(240,185,81,.35)", 1);
        text(ctx, `${index}T`, apparatusX - 15, y + 3, C.muted, 8, "right");
      });
    } else {
      solution.gate.data.forEach((point) => {
        const y = releaseY + point.trueDistanceM / state.heightM * (bottom - releaseY);
        line(ctx, apparatusX - 22, y, apparatusX + 24, y, C.cyan, 2);
        ctx.fillStyle = C.cyan;
        ctx.fillRect(apparatusX - 25, y - 3, 6, 6);
        ctx.fillRect(apparatusX + 21, y - 3, 6, 6);
        if (state.mode !== "uncertainty" || point.index === solution.gate.data.length) {
          text(ctx, `G${point.index}`, apparatusX - 31, y + 3, C.cyan, 8, "right");
        }
      });
    }

    const rows = state.mode === "strobe"
      ? solution.strobe.data.slice(0, 7).map((point) => [`${point.index}T`, `${fmt(point.measuredDistanceM, 4)} m`])
      : solution.gate.data.slice(0, 7).map((point) => [`G${point.index}  ${fmt(point.measuredTimeS, 4)}s`, `${fmt(point.measuredDistanceM, 4)}m`]);
    text(ctx, state.mode === "strobe" ? "等时频闪位置" : "原始观测 s / t", panelX, 34, C.text, 10, "left", 700);
    rows.forEach((row, index) => {
      const y = 58 + index * 25;
      line(ctx, panelX, y + 8, viewport.width - 18, y + 8, "rgba(223,229,223,.08)");
      text(ctx, row[0], panelX, y, C.muted, 8);
      text(ctx, row[1], viewport.width - 20, y, index % 2 ? C.violet : C.cyan, 9, "right", 700);
    });
    if (state.mode === "uncertainty") {
      const summary = solution.uncertainty;
      const y = Math.min(viewport.height - 46, 250);
      text(ctx, `重复 ${summary.estimates.length} 次`, panelX, y, C.text, 9);
      text(ctx, `σ=${fmt(summary.standardDeviation, 4)}`, panelX, y + 20, C.violet, 9);
      text(ctx, `SE=${fmt(summary.standardError, 4)}`, panelX, y + 40, C.green, 9);
    }
    text(ctx, `拖动释放器 · h=${fmt(state.heightM, 2)}m`, 16, viewport.height - 10, C.muted, 8);
  }

  function drawFitChart(solution) {
    const viewport = size(R.data, dctx);
    background(dctx, viewport.width, viewport.height);
    const points = solution.gate.data;
    const xmax = Math.max(...points.map((point) => point.timeSquaredS2)) * 1.05;
    const ymax = Math.max(...points.map((point) => point.measuredDistanceM)) * 1.08;
    const a = axes(dctx, viewport, 0, xmax, 0, ymax);
    if (state.showIdeal) {
      line(dctx, a.x(0), a.y(0), a.x(xmax), a.y(.5 * state.gravityMs2 * xmax), C.violet, 1.4, [5, 4]);
    }
    if (state.showFit) {
      const fit = solution.gate.fit;
      line(dctx, a.x(0), a.y(fit.intercept), a.x(xmax), a.y(fit.intercept + fit.slope * xmax), C.amber, 2);
    }
    points.forEach((point) => {
      dctx.fillStyle = C.cyan;
      dctx.beginPath();
      dctx.arc(a.x(point.timeSquaredS2), a.y(point.measuredDistanceM), 4, 0, Math.PI * 2);
      dctx.fill();
    });
    text(dctx, "s/m", 7, 13, C.cyan);
    text(dctx, "t²/s²", viewport.width - 8, viewport.height - 6, C.muted, 8, "right");
  }

  function drawStrobeChart(solution) {
    const viewport = size(R.data, dctx);
    background(dctx, viewport.width, viewport.height);
    const data = solution.strobe.data;
    const ymax = Math.max(...data.map((point) => point.measuredDistanceM)) * 1.12 || 1;
    const a = axes(dctx, viewport, 0, data.length - 1, 0, ymax);
    const points = data.map((point) => ({ x: a.x(point.index), y: a.y(point.measuredDistanceM) }));
    dctx.strokeStyle = C.amber;
    dctx.lineWidth = 2;
    dctx.beginPath();
    points.forEach((point, index) => index ? dctx.lineTo(point.x, point.y) : dctx.moveTo(point.x, point.y));
    dctx.stroke();
    points.forEach((point) => { dctx.fillStyle = C.cyan; dctx.beginPath(); dctx.arc(point.x, point.y, 4, 0, Math.PI * 2); dctx.fill(); });
    text(dctx, "s/m", 7, 13, C.cyan);
    text(dctx, "帧序号 n", viewport.width - 8, viewport.height - 6, C.muted, 8, "right");
  }

  function drawHistogram(solution) {
    const viewport = size(R.data, dctx);
    background(dctx, viewport.width, viewport.height);
    const values = solution.uncertainty.estimates;
    const rawMin = Math.min(...values, state.gravityMs2);
    const rawMax = Math.max(...values, state.gravityMs2);
    const padding = Math.max(.002, (rawMax - rawMin) * .15);
    const xmin = rawMin - padding;
    const xmax = rawMax + padding;
    const bins = Math.min(20, Math.max(8, Math.ceil(Math.sqrt(values.length) * 2)));
    const counts = Array(bins).fill(0);
    values.forEach((value) => counts[Math.min(bins - 1, Math.floor((value - xmin) / (xmax - xmin) * bins))] += 1);
    const ymax = Math.max(1, ...counts);
    const a = axes(dctx, viewport, xmin, xmax, 0, ymax);
    counts.forEach((count, index) => {
      const x1 = a.x(xmin + (xmax - xmin) * index / bins);
      const x2 = a.x(xmin + (xmax - xmin) * (index + 1) / bins);
      dctx.fillStyle = "rgba(100,199,217,.62)";
      dctx.fillRect(x1 + 1, a.y(count), Math.max(1, x2 - x1 - 2), a.y(0) - a.y(count));
    });
    line(dctx, a.x(state.gravityMs2), a.y(0), a.x(state.gravityMs2), a.y(ymax), C.amber, 1.5, [4, 4]);
    if (state.showUncertainty) {
      const mean = solution.uncertainty.mean;
      line(dctx, a.x(mean), a.y(0), a.x(mean), a.y(ymax), C.green, 2);
    }
    text(dctx, "计数", 7, 13, C.cyan);
    text(dctx, "g测/(m/s²)", viewport.width - 8, viewport.height - 6, C.muted, 8, "right");
  }

  function drawResidualChart(solution) {
    const viewport = size(R.evidence, ectx);
    background(ectx, viewport.width, viewport.height);
    const values = solution.gate.fit.residuals.map((value) => value * 1000);
    const maxAbs = Math.max(.1, ...values.map(Math.abs)) * 1.25;
    const a = axes(ectx, viewport, 1, values.length, -maxAbs, maxAbs);
    line(ectx, a.x(1), a.y(0), a.x(values.length), a.y(0), C.muted, 1);
    values.forEach((value, index) => {
      const x = a.x(index + 1);
      line(ectx, x, a.y(0), x, a.y(state.showResiduals ? value : 0), value >= 0 ? C.green : C.violet, 5);
    });
    text(ectx, "残差/mm", 7, 13, C.violet);
    text(ectx, "门序号", viewport.width - 8, viewport.height - 6, C.muted, 8, "right");
  }

  function drawSecondDifference(solution) {
    const viewport = size(R.evidence, ectx);
    background(ectx, viewport.width, viewport.height);
    const values = solution.strobe.secondDifferences;
    const spread = Math.max(.15, ...values.map((item) => Math.abs(item.gravityMs2 - state.gravityMs2))) * 1.3;
    const a = axes(ectx, viewport, 1, values.length, state.gravityMs2 - spread, state.gravityMs2 + spread);
    line(ectx, a.x(1), a.y(state.gravityMs2), a.x(values.length), a.y(state.gravityMs2), C.amber, 1.5, [4, 4]);
    values.forEach((item, index) => {
      const x = a.x(index + 1);
      line(ectx, x, a.y(state.gravityMs2), x, a.y(item.gravityMs2), C.cyan, 6);
      ectx.fillStyle = C.cyan;
      ectx.beginPath();
      ectx.arc(x, a.y(item.gravityMs2), 4, 0, Math.PI * 2);
      ectx.fill();
    });
    text(ectx, "gᵢ/(m/s²)", 7, 13, C.cyan);
    text(ectx, "二阶差组", viewport.width - 8, viewport.height - 6, C.muted, 8, "right");
  }

  function drawConvergence(solution) {
    const viewport = size(R.evidence, ectx);
    background(ectx, viewport.width, viewport.height);
    const values = solution.uncertainty.estimates;
    let sum = 0;
    const running = values.map((value, index) => { sum += value; return sum / (index + 1); });
    const min = Math.min(...running, state.gravityMs2);
    const max = Math.max(...running, state.gravityMs2);
    const padding = Math.max(.002, (max - min) * .2);
    const a = axes(ectx, viewport, 1, running.length, min - padding, max + padding);
    if (state.showUncertainty) {
      const se = solution.uncertainty.standardError;
      ectx.fillStyle = "rgba(121,217,146,.10)";
      ectx.fillRect(a.x(1), a.y(solution.uncertainty.mean + se), a.x(running.length) - a.x(1), a.y(solution.uncertainty.mean - se) - a.y(solution.uncertainty.mean + se));
    }
    line(ectx, a.x(1), a.y(state.gravityMs2), a.x(running.length), a.y(state.gravityMs2), C.amber, 1.5, [4, 4]);
    ectx.strokeStyle = C.green;
    ectx.lineWidth = 2;
    ectx.beginPath();
    running.forEach((value, index) => index ? ectx.lineTo(a.x(index + 1), a.y(value)) : ectx.moveTo(a.x(1), a.y(value)));
    ectx.stroke();
    text(ectx, "累计均值", 7, 13, C.green);
    text(ectx, "重复次数", viewport.width - 8, viewport.height - 6, C.muted, 8, "right");
  }

  function drawCharts(solution) {
    if (state.mode === "strobe") {
      drawStrobeChart(solution);
      drawSecondDifference(solution);
    } else if (state.mode === "uncertainty") {
      drawHistogram(solution);
      drawConvergence(solution);
    } else {
      drawFitChart(solution);
      drawResidualChart(solution);
    }
  }

  function render() {
    const solution = M.solve(state);
    const result = currentResult(solution);
    const absoluteError = result.estimate - state.gravityMs2;
    [[R.height, state.heightM], [R.gravity, state.gravityMs2], [R.samples, state.sampleCount], [R.interval, state.strobeIntervalS],
      [R.resolution, state.timeResolutionMs], [R.noise, state.positionNoiseMm], [R.repeats, state.repeats], [R.seed, state.seed]].forEach(([element, value]) => range(element, value));
    R.heightValue.textContent = `${fmt(state.heightM, 2)} m`;
    R.gravityValue.textContent = `${fmt(state.gravityMs2, 2)} m/s²`;
    R.samplesValue.textContent = String(state.sampleCount);
    R.intervalValue.textContent = `${fmt(solution.strobe.intervalS, 3)} s${solution.strobe.clippedInterval ? " · 已限幅" : ""}`;
    R.resolutionValue.textContent = `${fmt(state.timeResolutionMs, 3)} ms`;
    R.noiseValue.textContent = `${fmt(state.positionNoiseMm, 2)} mm`;
    R.repeatsValue.textContent = String(state.repeats);
    R.seedValue.textContent = String(state.seed);
    R.estimate.textContent = `${fmt(result.estimate, 4)} m/s²`;
    R.truth.textContent = `${fmt(state.gravityMs2, 4)} m/s²`;
    R.error.textContent = `${signed(absoluteError, 4)} m/s²`;
    R.relative.textContent = `${signed(result.relative * 100, 3)}%`;
    R.impact.textContent = `${fmt(solution.gate.impactTimeS, 4)} s`;

    if (state.mode === "uncertainty") {
      R.qualityLabel.textContent = "均值标准误";
      R.quality.textContent = `${fmt(solution.uncertainty.standardError, 5)} m/s²`;
    } else if (state.mode === "strobe") {
      R.qualityLabel.textContent = "理想二阶差";
      R.quality.textContent = `${fmt(solution.strobe.idealSecondDifferenceM * 1000, 3)} mm`;
    } else {
      R.qualityLabel.textContent = "拟合优度 R²";
      R.quality.textContent = fmt(solution.gate.fit.rSquared, 6);
    }
    const relativeMagnitude = Math.abs(result.relative);
    R.nature.textContent = relativeMagnitude < .002 ? "结果与设定值高度相容" : relativeMagnitude < .01 ? "随机误差仍在可控范围" : "测量精度不足，需要改进装置";
    R.explanation.textContent = state.mode === "uncertainty"
      ? `σ=${fmt(solution.uncertainty.standardDeviation, 4)}，SE=${fmt(solution.uncertainty.standardError, 4)} m/s²`
      : state.mode === "strobe" ? "多组 Δ²s/T² 的平均值给出 g" : "斜率给出 g/2，残差用于检查线性模型";
    R.badge.textContent = `g测=${fmt(result.estimate, 3)} m/s²`;
    R.modeTitle.textContent = MODES[state.mode][0];
    R.modeGoal.textContent = MODES[state.mode][1];
    R.tabs.forEach((button) => button.classList.toggle("is-active", button.dataset.mode === state.mode));
    R.route.forEach((button, index) => button.classList.toggle("is-active", index === state.guideStep));
    R.stepIndex.textContent = String(state.guideStep + 1).padStart(2, "0");
    R.stepTitle.textContent = STEPS[state.guideStep][0];
    R.stepPrompt.textContent = STEPS[state.guideStep][1];
    R.formula.textContent = state.mode === "strobe" ? "g=Δ²s/T²" : state.mode === "uncertainty" ? "SE=σ/√N" : "g=2k";

    if (state.mode === "strobe") {
      R.dataKicker.textContent = "EQUAL-TIME STROBE"; R.dataTitle.textContent = "等时位置序列"; R.dataStatus.textContent = `T=${fmt(solution.strobe.intervalS, 3)}s`;
      R.evidenceKicker.textContent = "SECOND DIFFERENCE"; R.evidenceTitle.textContent = "逐组重力估计"; R.evidenceStatus.textContent = `Δ²s理想=${fmt(solution.strobe.idealSecondDifferenceM * 1000, 2)}mm`;
    } else if (state.mode === "uncertainty") {
      R.dataKicker.textContent = "REPEATED ESTIMATES"; R.dataTitle.textContent = "重复测量分布"; R.dataStatus.textContent = `N=${state.repeats}`;
      R.evidenceKicker.textContent = "CONVERGENCE"; R.evidenceTitle.textContent = "累计均值收敛"; R.evidenceStatus.textContent = `SE=${fmt(solution.uncertainty.standardError, 4)}`;
    } else {
      R.dataKicker.textContent = "RAW DATA / FIT"; R.dataTitle.textContent = "位移—时间平方"; R.dataStatus.textContent = `k=${fmt(solution.gate.fit.slope, 4)}m/s²`;
      R.evidenceKicker.textContent = "RESIDUALS"; R.evidenceTitle.textContent = "拟合残差"; R.evidenceStatus.textContent = `RMS=${fmt(solution.gate.fit.rmsResidual * 1000, 3)}mm`;
    }
    drawMain(solution);
    drawCharts(solution);
  }

  function setMode(mode) {
    if (!MODES[mode]) return;
    state.mode = mode;
    render();
  }

  function reset() {
    Object.assign(state, {
      mode: "gates", gravityMs2: 9.8, heightM: 2.4, sampleCount: 7, strobeIntervalS: .08,
      timeResolutionMs: .1, positionNoiseMm: .5, repeats: 30, seed: 23, guideStep: 0,
      showIdeal: true, showFit: true, showResiduals: true, showUncertainty: true, dragging: false,
    });
    [[R.ideal, "showIdeal"], [R.fit, "showFit"], [R.residuals, "showResiduals"], [R.uncertainty, "showUncertainty"]]
      .forEach(([element, key]) => { element.checked = state[key]; });
    render();
  }

  function setState(next = {}) {
    if (MODES[next.mode]) state.mode = next.mode;
    const normalized = M.normalize({ ...state, ...next });
    Object.assign(state, normalized);
    if (Number.isFinite(+next.guideStep)) state.guideStep = Math.round(clamp(+next.guideStep, 0, 2));
    ["showIdeal", "showFit", "showResiduals", "showUncertainty"].forEach((key) => {
      if (typeof next[key] === "boolean") state[key] = next[key];
    });
    state.dragging = false;
    render();
  }

  [[R.height, "heightM"], [R.gravity, "gravityMs2"], [R.samples, "sampleCount"], [R.interval, "strobeIntervalS"],
    [R.resolution, "timeResolutionMs"], [R.noise, "positionNoiseMm"], [R.repeats, "repeats"], [R.seed, "seed"]]
    .forEach(([element, key]) => element.addEventListener("input", () => { state[key] = +element.value; render(); }));
  [[R.ideal, "showIdeal"], [R.fit, "showFit"], [R.residuals, "showResiduals"], [R.uncertainty, "showUncertainty"]]
    .forEach(([element, key]) => element.addEventListener("change", () => { state[key] = element.checked; render(); }));
  R.tabs.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
  R.route.forEach((button, index) => button.addEventListener("click", () => { state.guideStep = index; render(); }));
  R.reset.addEventListener("click", reset);
  R.newRun.addEventListener("click", () => { state.seed = state.seed % 100 + 1; render(); });
  R.idealButton.addEventListener("click", () => { state.timeResolutionMs = .01; state.positionNoiseMm = 0; render(); });
  R.guide.addEventListener("click", () => R.dialog.showModal());
  R.step.addEventListener("click", () => { state.guideStep = (state.guideStep + 1) % 3; render(); });
  R.focus.addEventListener("click", () => { const active = document.body.classList.toggle("focus-mode"); R.focus.setAttribute("aria-pressed", String(active)); });
  R.fullscreen.addEventListener("click", () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());

  function dragHeight(event) {
    const box = R.main.getBoundingClientRect();
    const top = 26;
    const bottom = box.height - 30;
    const localY = clamp(event.clientY - box.top, top, bottom);
    state.heightM = Math.round((.8 + (bottom - localY) / (bottom - top) * 4.2) / .05) * .05;
    render();
  }
  R.main.addEventListener("pointerdown", (event) => { state.dragging = true; R.main.setPointerCapture?.(event.pointerId); dragHeight(event); });
  R.main.addEventListener("pointermove", (event) => { if (state.dragging) dragHeight(event); });
  R.main.addEventListener("pointerup", () => { state.dragging = false; });
  R.main.addEventListener("pointercancel", () => { state.dragging = false; });
  window.addEventListener("resize", render);

  window.freeFallMeasurementLab = {
    gateMeasurement: (next) => M.gateMeasurement(next),
    strobeMeasurement: (next) => M.strobeMeasurement(next),
    uncertaintySummary: (next) => M.uncertaintySummary(next),
    solve: (next) => M.solve(next),
    getState: () => ({ ...state }),
    setState,
    setMode,
    reset,
  };
  render();
})();
