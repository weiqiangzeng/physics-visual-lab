(function () {
  "use strict";

  const model = window.ElectricFieldModel;
  if (!model) throw new Error("ElectricFieldModel is required");

  const refs = {
    canvas: document.getElementById("fieldCanvas"),
    profileChart: document.getElementById("profileChart"),
    vectorChart: document.getElementById("vectorChart"),
    source1Input: document.getElementById("source1Input"),
    source2Input: document.getElementById("source2Input"),
    separationInput: document.getElementById("separationInput"),
    uniformInput: document.getElementById("uniformInput"),
    testChargeInput: document.getElementById("testChargeInput"),
    progressInput: document.getElementById("progressInput"),
    source1Value: document.getElementById("source1Value"),
    source2Value: document.getElementById("source2Value"),
    separationValue: document.getElementById("separationValue"),
    uniformValue: document.getElementById("uniformValue"),
    testChargeValue: document.getElementById("testChargeValue"),
    progressValue: document.getElementById("progressValue"),
    progressLabel: document.getElementById("progressLabel"),
    source1Section: document.getElementById("source1Section"),
    source2Section: document.getElementById("source2Section"),
    separationSection: document.getElementById("separationSection"),
    uniformSection: document.getElementById("uniformSection"),
    pathSection: document.getElementById("pathSection"),
    playButton: document.getElementById("playButton"),
    pauseButton: document.getElementById("pauseButton"),
    keyButton: document.getElementById("keyButton"),
    resetButton: document.getElementById("resetButton"),
    guideButton: document.getElementById("guideButton"),
    stepButton: document.getElementById("stepButton"),
    focusButton: document.getElementById("focusButton"),
    fullscreenButton: document.getElementById("fullscreenButton"),
    guideDialog: document.getElementById("guideDialog"),
    modeTitle: document.getElementById("modeTitle"),
    modeGoal: document.getElementById("modeGoal"),
    stateBadge: document.getElementById("stateBadge"),
    stageHint: document.getElementById("stageHint"),
    fieldMetric: document.getElementById("fieldMetric"),
    directionMetric: document.getElementById("directionMetric"),
    potentialMetric: document.getElementById("potentialMetric"),
    forceMetric: document.getElementById("forceMetric"),
    energyMetric: document.getElementById("energyMetric"),
    fieldNature: document.getElementById("fieldNature"),
    fieldExplanation: document.getElementById("fieldExplanation"),
    profileKicker: document.getElementById("profileKicker"),
    profileTitle: document.getElementById("profileTitle"),
    profileStatus: document.getElementById("profileStatus"),
    vectorKicker: document.getElementById("vectorKicker"),
    vectorTitle: document.getElementById("vectorTitle"),
    vectorStatus: document.getElementById("vectorStatus"),
    stepIndex: document.getElementById("stepIndex"),
    stepTitle: document.getElementById("stepTitle"),
    stepPrompt: document.getElementById("stepPrompt"),
    formulaReadout: document.getElementById("formulaReadout"),
    showFieldLinesToggle: document.getElementById("showFieldLinesToggle"),
    showVectorsToggle: document.getElementById("showVectorsToggle"),
    showEquipotentialToggle: document.getElementById("showEquipotentialToggle"),
    showForceToggle: document.getElementById("showForceToggle"),
    showPotentialMapToggle: document.getElementById("showPotentialMapToggle"),
    sceneTabs: [...document.querySelectorAll("[data-mode]")],
    routeSteps: [...document.querySelectorAll(".route-step")],
    pathButtons: [...document.querySelectorAll("[data-path]")],
    presetButtons: [...document.querySelectorAll("[data-preset]")],
    rateButtons: [...document.querySelectorAll("[data-rate]")]
  };

  const COLORS = {
    background: "#0b0f0e",
    grid: "rgba(138,151,143,.12)",
    text: "#dce5df",
    muted: "#7e8b83",
    positive: "#ff7468",
    negative: "#7392ff",
    field: "#64c7d9",
    force: "#f2b84b",
    potential: "#b58ce5",
    green: "#79d992"
  };
  const WORLD = { xMin: -4.5, xMax: 4.5, yMin: -3, yMax: 3 };
  const modes = {
    single: { title: "单电荷场", goal: "电场先存在，试探电荷只负责测量", hint: "拖动探针，比较 E、F 和 V", q1: 6, q2: -6, separation: 3, probeX: 2.4, probeY: 1.2, key: "◎ 半径 2 m" },
    superposition: { title: "电场矢量叠加", goal: "同一点的合场来自各源电荷场强的矢量和", hint: "定位中垂线，寻找 V=0 但 E≠0", q1: 6, q2: -6, separation: 3, probeX: 0, probeY: 2, key: "◎ 偶极中垂线" },
    potential: { title: "电势与等势线", goal: "电势是标量，场强由电势空间变化决定", hint: "定位同号电荷中点，比较 E 与 V", q1: 6, q2: 6, separation: 3, probeX: 0, probeY: 0, key: "◎ 同号电荷中点" },
    work: { title: "静电场做功", goal: "同一对端点间电场力做功与路径无关", hint: "比较直达与绕行路径的终点功", q1: 6, q2: -6, separation: 3, probeX: -3, probeY: -1.5, key: "◎ 到达共同终点" }
  };
  const guide = [
    { title: "先定义场强", prompt: "把 q₀ 变为零，空间中的 E 和 V 是否消失？" },
    { title: "比较标量与矢量", prompt: "为什么某一点可以 V=0 但 E 不等于零，或 E=0 但 V 不等于零？" },
    { title: "核对做功与能量", prompt: "两条路径形状不同，为什么终点的 W 和 ΔU 仍完全一致？" }
  ];
  const state = {
    mode: "single",
    q1: 6,
    q2: -6,
    separation: 3,
    testCharge: 2,
    uniformField: 12,
    probeX: 2.4,
    probeY: 1.2,
    path: "direct",
    progress: 0,
    running: false,
    playbackRate: 0.5,
    guideStep: 0,
    dragging: false,
    showFieldLines: true,
    showVectors: true,
    showEquipotential: true,
    showForce: true,
    showPotentialMap: true
  };

  const canvasContext = refs.canvas.getContext("2d");
  const profileContext = refs.profileChart.getContext("2d");
  const vectorContext = refs.vectorChart.getContext("2d");
  const clamp = model.clamp;
  const signed = (value, digits = 1) => `${value > 1e-10 ? "+" : value < -1e-10 ? "−" : ""}${Math.abs(value).toFixed(digits)}`;
  const finite = (value) => Number.isFinite(value) ? value : 0;

  function inputState(extra = {}) {
    return {
      mode: state.mode,
      q1: state.q1,
      q2: state.q2,
      separation: state.separation,
      testCharge: state.testCharge,
      uniformField: state.uniformField,
      path: state.path,
      x: state.probeX,
      y: state.probeY,
      ...extra
    };
  }

  function solve() {
    return state.mode === "work" ? model.workState(inputState(), state.progress) : model.pointState(inputState());
  }

  function resizeCanvas(canvas, context) {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { width: rect.width, height: rect.height };
  }

  function worldMap(width, height) {
    const pad = { left: 28, right: 24, top: 24, bottom: 28 };
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;
    return {
      x: (value) => pad.left + (value - WORLD.xMin) / (WORLD.xMax - WORLD.xMin) * innerW,
      y: (value) => pad.top + (WORLD.yMax - value) / (WORLD.yMax - WORLD.yMin) * innerH,
      wx: (pixel) => WORLD.xMin + (pixel - pad.left) / innerW * (WORLD.xMax - WORLD.xMin),
      wy: (pixel) => WORLD.yMax - (pixel - pad.top) / innerH * (WORLD.yMax - WORLD.yMin),
      pad,
      innerW,
      innerH
    };
  }

  function line(context, x1, y1, x2, y2, color, width = 1, dash = []) {
    context.save();
    context.strokeStyle = color;
    context.lineWidth = width;
    context.setLineDash(dash);
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
    context.restore();
  }

  function text(context, value, x, y, color = COLORS.text, size = 10, align = "left", weight = "500") {
    context.save();
    context.fillStyle = color;
    context.font = `${weight} ${size}px system-ui, sans-serif`;
    context.textAlign = align;
    context.textBaseline = "middle";
    context.fillText(value, x, y);
    context.restore();
  }

  function arrow(context, x1, y1, x2, y2, color, label, width = 2) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    line(context, x1, y1, x2, y2, color, width);
    context.save();
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(x2, y2);
    context.lineTo(x2 - 8 * Math.cos(angle - Math.PI / 6), y2 - 8 * Math.sin(angle - Math.PI / 6));
    context.lineTo(x2 - 8 * Math.cos(angle + Math.PI / 6), y2 - 8 * Math.sin(angle + Math.PI / 6));
    context.closePath();
    context.fill();
    context.restore();
    if (label) text(context, label, x2 + 7 * Math.cos(angle), y2 + 7 * Math.sin(angle) - 9, color, 9, "center", "700");
  }

  function fieldAt(x, y) {
    if (state.mode === "work") return { ex: state.uniformField, ey: 0, magnitude: Math.abs(state.uniformField), potential: -state.uniformField * x, nearest: null, singular: false };
    return model.fieldFromSources(model.pointSources(inputState()), x, y);
  }

  function drawGrid(context, width, height, map) {
    context.fillStyle = COLORS.background;
    context.fillRect(0, 0, width, height);
    for (let x = -4; x <= 4; x += 1) line(context, map.x(x), map.pad.top, map.x(x), height - map.pad.bottom, COLORS.grid);
    for (let y = -2; y <= 2; y += 1) line(context, map.pad.left, map.y(y), width - map.pad.right, map.y(y), COLORS.grid);
    line(context, map.pad.left, map.y(0), width - map.pad.right, map.y(0), "rgba(198,211,203,.25)");
    line(context, map.x(0), map.pad.top, map.x(0), height - map.pad.bottom, "rgba(198,211,203,.25)");
    text(context, "x / m", width - map.pad.right, height - 10, COLORS.muted, 9, "right");
    text(context, "y", map.x(0) + 8, map.pad.top + 5, COLORS.muted, 9);
  }

  function drawPotentialMap(context, width, height, map) {
    if (!state.showPotentialMap) return;
    const cell = Math.max(18, Math.round(width / 32));
    for (let py = map.pad.top; py < height - map.pad.bottom; py += cell) {
      for (let px = map.pad.left; px < width - map.pad.right; px += cell) {
        const sample = fieldAt(map.wx(px + cell / 2), map.wy(py + cell / 2));
        if (!Number.isFinite(sample.potential) || sample.nearest !== null && sample.nearest < .28) continue;
        const strength = Math.min(.16, .025 + Math.abs(sample.potential) / 450);
        context.fillStyle = sample.potential >= 0 ? `rgba(255,116,104,${strength})` : `rgba(115,146,255,${strength})`;
        context.fillRect(px, py, Math.min(cell + 1, width - map.pad.right - px), Math.min(cell + 1, height - map.pad.bottom - py));
      }
    }
  }

  function contourIntersection(a, b, level) {
    if (!Number.isFinite(a.value) || !Number.isFinite(b.value)) return null;
    const da = a.value - level;
    const db = b.value - level;
    if (da === 0) return { x: a.x, y: a.y };
    if (db === 0) return { x: b.x, y: b.y };
    if (da * db > 0) return null;
    const t = da / (da - db);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  function drawEquipotentials(context, width, height, map) {
    if (!state.showEquipotential) return;
    const nx = 42;
    const ny = 28;
    const values = [];
    for (let j = 0; j <= ny; j += 1) {
      const row = [];
      for (let i = 0; i <= nx; i += 1) {
        const x = WORLD.xMin + (WORLD.xMax - WORLD.xMin) * i / nx;
        const y = WORLD.yMin + (WORLD.yMax - WORLD.yMin) * j / ny;
        const sample = fieldAt(x, y);
        row.push(sample.nearest !== null && sample.nearest < .3 ? NaN : sample.potential);
      }
      values.push(row);
    }
    const levels = state.mode === "work" ? [-36, -24, -12, 0, 12, 24, 36] : [-60, -40, -24, -12, 0, 12, 24, 40, 60];
    for (const level of levels) {
      context.save();
      context.strokeStyle = level === 0 ? "rgba(220,229,223,.62)" : level > 0 ? "rgba(255,116,104,.46)" : "rgba(115,146,255,.5)";
      context.lineWidth = level === 0 ? 1.35 : .85;
      context.beginPath();
      for (let j = 0; j < ny; j += 1) {
        for (let i = 0; i < nx; i += 1) {
          const x0 = WORLD.xMin + (WORLD.xMax - WORLD.xMin) * i / nx;
          const x1 = WORLD.xMin + (WORLD.xMax - WORLD.xMin) * (i + 1) / nx;
          const y0 = WORLD.yMin + (WORLD.yMax - WORLD.yMin) * j / ny;
          const y1 = WORLD.yMin + (WORLD.yMax - WORLD.yMin) * (j + 1) / ny;
          const p00 = { x: map.x(x0), y: map.y(y0), value: values[j][i] };
          const p10 = { x: map.x(x1), y: map.y(y0), value: values[j][i + 1] };
          const p11 = { x: map.x(x1), y: map.y(y1), value: values[j + 1][i + 1] };
          const p01 = { x: map.x(x0), y: map.y(y1), value: values[j + 1][i] };
          const points = [contourIntersection(p00, p10, level), contourIntersection(p10, p11, level), contourIntersection(p11, p01, level), contourIntersection(p01, p00, level)].filter(Boolean);
          if (points.length === 2) {
            context.moveTo(points[0].x, points[0].y);
            context.lineTo(points[1].x, points[1].y);
          } else if (points.length === 4) {
            context.moveTo(points[0].x, points[0].y);
            context.lineTo(points[1].x, points[1].y);
            context.moveTo(points[2].x, points[2].y);
            context.lineTo(points[3].x, points[3].y);
          }
        }
      }
      context.stroke();
      context.restore();
    }
  }

  function traceFieldLine(start, direction, sources) {
    const points = [start];
    let point = { ...start };
    for (let index = 0; index < 190; index += 1) {
      const sample = model.fieldFromSources(sources, point.x, point.y);
      if (!Number.isFinite(sample.magnitude) || sample.magnitude < 1e-6) break;
      point = { x: point.x + direction * sample.ex / sample.magnitude * .07, y: point.y + direction * sample.ey / sample.magnitude * .07 };
      if (point.x < WORLD.xMin || point.x > WORLD.xMax || point.y < WORLD.yMin || point.y > WORLD.yMax) break;
      if (index > 4 && sources.some((source) => Math.hypot(point.x - source.x, point.y - source.y) < .27)) {
        points.push(point);
        break;
      }
      points.push(point);
    }
    return points;
  }

  function drawFieldLine(context, points, map, reverse = false) {
    if (points.length < 4) return;
    const ordered = reverse ? [...points].reverse() : points;
    context.save();
    context.strokeStyle = "rgba(100,199,217,.55)";
    context.lineWidth = 1.05;
    context.beginPath();
    context.moveTo(map.x(ordered[0].x), map.y(ordered[0].y));
    for (let index = 1; index < ordered.length; index += 1) context.lineTo(map.x(ordered[index].x), map.y(ordered[index].y));
    context.stroke();
    context.restore();
    const marker = Math.min(ordered.length - 2, Math.max(1, Math.floor(ordered.length * .55)));
    const a = ordered[marker - 1];
    const b = ordered[marker + 1];
    arrow(context, map.x(a.x), map.y(a.y), map.x(b.x), map.y(b.y), "rgba(100,199,217,.82)", "", 1.2);
  }

  function drawFieldLines(context, width, height, map) {
    if (!state.showFieldLines) return;
    if (state.mode === "work") {
      const direction = state.uniformField >= 0 ? 1 : -1;
      for (let y = -2.4; y <= 2.4; y += .8) {
        const x1 = direction > 0 ? WORLD.xMin + .3 : WORLD.xMax - .3;
        const x2 = direction > 0 ? WORLD.xMax - .3 : WORLD.xMin + .3;
        arrow(context, map.x(x1), map.y(y), map.x(x2), map.y(y), "rgba(100,199,217,.55)", "", 1);
      }
      return;
    }
    const sources = model.pointSources(inputState()).filter((source) => Math.abs(source.qNanoC) > 1e-9);
    const positives = sources.filter((source) => source.qNanoC > 0);
    const seeds = positives.length ? positives : sources;
    for (const source of seeds) {
      const outward = source.qNanoC > 0 ? 1 : -1;
      for (let index = 0; index < 14; index += 1) {
        const angle = Math.PI * 2 * index / 14;
        const start = { x: source.x + .31 * Math.cos(angle), y: source.y + .31 * Math.sin(angle) };
        drawFieldLine(context, traceFieldLine(start, outward, sources), map, outward < 0);
      }
    }
  }

  function drawVectorGrid(context, width, height, map) {
    if (!state.showVectors) return;
    for (let y = -2.3; y <= 2.3; y += .92) {
      for (let x = -3.9; x <= 3.9; x += 1.12) {
        const sample = fieldAt(x, y);
        if (!Number.isFinite(sample.magnitude) || sample.magnitude < 1e-5 || sample.nearest !== null && sample.nearest < .48) continue;
        const length = 8 + Math.min(13, Math.log10(1 + sample.magnitude) * 6);
        const dx = sample.ex / sample.magnitude * length;
        const dy = -sample.ey / sample.magnitude * length;
        arrow(context, map.x(x) - dx * .45, map.y(y) - dy * .45, map.x(x) + dx * .55, map.y(y) + dy * .55, "rgba(100,199,217,.42)", "", .8);
      }
    }
  }

  function drawCharge(context, map, source, label) {
    const x = map.x(source.x);
    const y = map.y(source.y);
    const color = source.qNanoC > 0 ? COLORS.positive : source.qNanoC < 0 ? COLORS.negative : COLORS.muted;
    context.save();
    context.shadowColor = color;
    context.shadowBlur = 14;
    context.fillStyle = color;
    context.beginPath();
    context.arc(x, y, 18, 0, Math.PI * 2);
    context.fill();
    context.restore();
    text(context, source.qNanoC > 0 ? "+" : source.qNanoC < 0 ? "−" : "0", x, y - 1, "#0d1110", 18, "center", "800");
    text(context, `${label} ${signed(source.qNanoC)} nC`, x, y + 30, color, 9, "center", "700");
  }

  function drawPath(context, map, path, color, width, dash = []) {
    context.save();
    context.strokeStyle = color;
    context.lineWidth = width;
    context.setLineDash(dash);
    context.beginPath();
    for (let index = 0; index <= 90; index += 1) {
      const point = model.pathPoint(path, index / 90);
      if (index === 0) context.moveTo(map.x(point.x), map.y(point.y));
      else context.lineTo(map.x(point.x), map.y(point.y));
    }
    context.stroke();
    context.restore();
  }

  function drawWorkScene(context, map) {
    const leftPositive = state.uniformField >= 0;
    const leftX = map.x(-4.15);
    const rightX = map.x(4.15);
    context.save();
    context.lineWidth = 6;
    context.strokeStyle = leftPositive ? COLORS.positive : COLORS.negative;
    context.beginPath(); context.moveTo(leftX, map.y(2.6)); context.lineTo(leftX, map.y(-2.6)); context.stroke();
    context.strokeStyle = leftPositive ? COLORS.negative : COLORS.positive;
    context.beginPath(); context.moveTo(rightX, map.y(2.6)); context.lineTo(rightX, map.y(-2.6)); context.stroke();
    context.restore();
    text(context, leftPositive ? "+" : "−", leftX + 10, map.y(2.45), leftPositive ? COLORS.positive : COLORS.negative, 16, "center", "800");
    text(context, leftPositive ? "−" : "+", rightX - 10, map.y(2.45), leftPositive ? COLORS.negative : COLORS.positive, 16, "center", "800");
    drawPath(context, map, "direct", state.path === "direct" ? COLORS.force : "rgba(242,184,75,.28)", state.path === "direct" ? 2.2 : 1.1, state.path === "direct" ? [] : [5, 5]);
    drawPath(context, map, "curve", state.path === "curve" ? COLORS.potential : "rgba(181,140,229,.25)", state.path === "curve" ? 2.2 : 1.1, state.path === "curve" ? [] : [5, 5]);
    const a = model.PATH_START;
    const b = model.PATH_END;
    text(context, "A", map.x(a.x) - 12, map.y(a.y) + 14, COLORS.text, 11, "center", "800");
    text(context, "B", map.x(b.x) + 12, map.y(b.y) - 14, COLORS.text, 11, "center", "800");
  }

  function drawProbe(context, map, sample) {
    const x = map.x(sample.x);
    const y = map.y(sample.y);
    const color = state.testCharge > 0 ? COLORS.force : state.testCharge < 0 ? COLORS.potential : COLORS.text;
    context.save();
    context.fillStyle = "rgba(10,14,13,.92)";
    context.strokeStyle = color;
    context.lineWidth = 2.4;
    context.beginPath();
    context.arc(x, y, 11, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.restore();
    text(context, state.testCharge > 0 ? "+" : state.testCharge < 0 ? "−" : "0", x, y - 1, color, 12, "center", "800");
    text(context, `q₀=${signed(state.testCharge)} nC`, x + 16, y + 17, color, 8, "left", "700");
    if (sample.magnitude > 1e-8) {
      const fieldLength = 42;
      const ex = sample.ex / sample.magnitude;
      const ey = sample.ey / sample.magnitude;
      arrow(context, x, y, x + ex * fieldLength, y - ey * fieldLength, COLORS.field, "E", 2);
      if (state.showForce && Math.abs(state.testCharge) > 1e-9) {
        const sign = Math.sign(state.testCharge);
        arrow(context, x, y, x + sign * ex * 58, y - sign * ey * 58, COLORS.force, "F", 2.4);
      }
    }
  }

  function drawScene(sample) {
    const { width, height } = resizeCanvas(refs.canvas, canvasContext);
    const map = worldMap(width, height);
    drawGrid(canvasContext, width, height, map);
    drawPotentialMap(canvasContext, width, height, map);
    drawEquipotentials(canvasContext, width, height, map);
    drawFieldLines(canvasContext, width, height, map);
    drawVectorGrid(canvasContext, width, height, map);
    if (state.mode === "work") drawWorkScene(canvasContext, map);
    else sample.sources.forEach((source, index) => drawCharge(canvasContext, map, source, `Q${index + 1}`));
    drawProbe(canvasContext, map, sample);
    const location = state.mode === "work" ? `路径 ${state.path === "direct" ? "A" : "B"} · ${(state.progress * 100).toFixed(0)}%` : `探针 (${sample.x.toFixed(2)}, ${sample.y.toFixed(2)}) m`;
    text(canvasContext, location, map.pad.left + 4, height - 12, COLORS.green, 9, "left", "700");
    text(canvasContext, "红/蓝底图表示正/负电势；等势线不是运动轨迹", width - map.pad.right, 12, COLORS.muted, 8, "right");
  }

  function drawGraph(canvas, context, series, options) {
    const { width, height } = resizeCanvas(canvas, context);
    context.fillStyle = "#111512";
    context.fillRect(0, 0, width, height);
    const pad = { left: 45, right: 16, top: 18, bottom: 26 };
    const all = series.flatMap((item) => item.points).filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
    let xMin = options.xMin ?? Math.min(...all.map((point) => point.x));
    let xMax = options.xMax ?? Math.max(...all.map((point) => point.x));
    let yMin = Math.min(0, ...all.map((point) => point.y));
    let yMax = Math.max(0, ...all.map((point) => point.y));
    if (!Number.isFinite(xMin) || xMin === xMax) { xMin = 0; xMax = 1; }
    if (!Number.isFinite(yMin) || yMin === yMax) { yMin = -1; yMax = 1; }
    const yPad = Math.max(1e-9, (yMax - yMin) * .12);
    yMin -= yPad;
    yMax += yPad;
    const px = (x) => pad.left + (x - xMin) / (xMax - xMin) * (width - pad.left - pad.right);
    const py = (y) => pad.top + (yMax - y) / (yMax - yMin) * (height - pad.top - pad.bottom);
    for (let index = 0; index <= 4; index += 1) {
      const gx = pad.left + (width - pad.left - pad.right) * index / 4;
      const gy = pad.top + (height - pad.top - pad.bottom) * index / 4;
      line(context, gx, pad.top, gx, height - pad.bottom, "rgba(129,143,134,.12)");
      line(context, pad.left, gy, width - pad.right, gy, "rgba(129,143,134,.12)");
    }
    if (yMin < 0 && yMax > 0) line(context, pad.left, py(0), width - pad.right, py(0), "rgba(210,221,214,.28)");
    for (const item of series) {
      context.save();
      context.strokeStyle = item.color;
      context.lineWidth = item.width || 1.8;
      context.setLineDash(item.dash || []);
      context.beginPath();
      let drawing = false;
      for (const point of item.points) {
        if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) { drawing = false; continue; }
        if (!drawing) { context.moveTo(px(point.x), py(point.y)); drawing = true; }
        else context.lineTo(px(point.x), py(point.y));
      }
      context.stroke();
      context.restore();
    }
    if (Number.isFinite(options.cursorX)) line(context, px(options.cursorX), pad.top, px(options.cursorX), height - pad.bottom, COLORS.green, 1.2, [4, 4]);
    text(context, options.yLabel, pad.left, 8, COLORS.muted, 8);
    text(context, options.xLabel, width - pad.right, height - 8, COLORS.muted, 8, "right");
    series.slice(0, 3).forEach((item, index) => text(context, item.label, width - pad.right - index * 80, 9, item.color, 8, "right", "700"));
  }

  function pointProfile() {
    const points = [];
    for (let index = 0; index <= 140; index += 1) {
      const radius = .5 + 4.5 * index / 140;
      const sample = model.pointState(inputState({ mode: "single", x: radius, y: 0 }));
      points.push({ r: radius, e: sample.magnitude, v: sample.potential });
    }
    return points;
  }

  function axisProfile(y) {
    const potential = [];
    const ex = [];
    const ey = [];
    const sources = model.pointSources(inputState());
    for (let index = 0; index <= 180; index += 1) {
      const x = -4.2 + 8.4 * index / 180;
      const sample = model.fieldFromSources(sources, x, y);
      const valid = (sample.nearest === null || sample.nearest >= .3) && Number.isFinite(sample.potential);
      potential.push({ x, y: valid ? sample.potential : NaN });
      ex.push({ x, y: valid ? sample.ex : NaN });
      ey.push({ x, y: valid ? sample.ey : NaN });
    }
    return { potential, ex, ey };
  }

  function workProfile() {
    const result = { directV: [], curveV: [], directW: [], curveW: [], selectedMinusU: [] };
    for (let index = 0; index <= 120; index += 1) {
      const progress = index / 120;
      const direct = model.workState(inputState({ path: "direct" }), progress);
      const curve = model.workState(inputState({ path: "curve" }), progress);
      const selected = state.path === "direct" ? direct : curve;
      result.directV.push({ x: progress, y: direct.potential });
      result.curveV.push({ x: progress, y: curve.potential });
      result.directW.push({ x: progress, y: direct.workNanoJ });
      result.curveW.push({ x: progress, y: curve.workNanoJ });
      result.selectedMinusU.push({ x: progress, y: -selected.deltaEnergyNanoJ });
    }
    return result;
  }

  function drawCharts(sample) {
    if (state.mode === "single") {
      const profile = pointProfile();
      const radius = Math.hypot(sample.x, sample.y);
      drawGraph(refs.profileChart, profileContext, [{ label: "E", color: COLORS.field, points: profile.map((point) => ({ x: point.r, y: point.e })) }], { xLabel: "r / m", yLabel: "E / (N/C)", cursorX: radius, xMin: .5, xMax: 5 });
      drawGraph(refs.vectorChart, vectorContext, [{ label: "V", color: COLORS.potential, points: profile.map((point) => ({ x: point.r, y: point.v })) }], { xLabel: "r / m", yLabel: "V / V", cursorX: radius, xMin: .5, xMax: 5 });
      return;
    }
    if (state.mode === "work") {
      const profile = workProfile();
      drawGraph(refs.profileChart, profileContext, [{ label: "路径 A", color: COLORS.force, points: profile.directV }, { label: "路径 B", color: COLORS.potential, points: profile.curveV, dash: [5, 4] }], { xLabel: "路径进度", yLabel: "V / V", cursorX: state.progress, xMin: 0, xMax: 1 });
      drawGraph(refs.vectorChart, vectorContext, [{ label: "W_A", color: COLORS.force, points: profile.directW }, { label: "W_B", color: COLORS.potential, points: profile.curveW, dash: [5, 4] }, { label: "−ΔU", color: COLORS.field, points: profile.selectedMinusU, dash: [2, 3] }], { xLabel: "路径进度", yLabel: "能量 / nJ", cursorX: state.progress, xMin: 0, xMax: 1 });
      return;
    }
    const profile = axisProfile(state.probeY);
    drawGraph(refs.profileChart, profileContext, [{ label: "V(x)", color: COLORS.potential, points: profile.potential }], { xLabel: `x / m（y=${state.probeY.toFixed(2)} m）`, yLabel: "V / V", cursorX: state.probeX, xMin: -4.2, xMax: 4.2 });
    drawGraph(refs.vectorChart, vectorContext, [{ label: "Eₓ", color: COLORS.field, points: profile.ex }, { label: "Eᵧ", color: COLORS.force, points: profile.ey, dash: [5, 4] }], { xLabel: `x / m（y=${state.probeY.toFixed(2)} m）`, yLabel: "E / (N/C)", cursorX: state.probeX, xMin: -4.2, xMax: 4.2 });
  }

  function rangeProgress(input) {
    const value = Number(input.value);
    const min = Number(input.min);
    const max = Number(input.max);
    input.style.setProperty("--range-progress", `${(value - min) / (max - min) * 100}%`);
  }

  function statusFor(sample) {
    if (state.mode === "work") {
      return state.progress >= .999 ? { badge: "路径终点一致", className: "is-special", nature: "W = −ΔU", explanation: `路径 A、B 的总功均为 ${signed(sample.finalWorkNanoJ, 1)} nJ` } : { badge: "路径比较中", className: "is-special", nature: "静电场力是保守力", explanation: "沿途过程可以不同，端点决定总功和势能变化" };
    }
    if (state.mode === "superposition" && Math.abs(sample.potential) < 1e-8 && sample.magnitude > 1e-6) return { badge: "V=0，E≠0", className: "is-special", nature: "电势相消，场强未相消", explanation: "电势按标量相加；场强仍需按方向做矢量和" };
    if (state.mode === "potential" && sample.magnitude < 1e-8 && Math.abs(sample.potential) > 1e-6) return { badge: "E=0，V≠0", className: "is-special", nature: "场强相消，电势仍为正", explanation: "零场强只表示电势局部斜率为零，不表示电势为零" };
    if (sample.magnitude < 1e-8 && Math.abs(sample.potential) < 1e-8) return { badge: "场与电势均为零", className: "is-zero", nature: "源电荷贡献相消或为零", explanation: "改变源电荷后重新观察空间分布" };
    if (Math.abs(state.testCharge) < 1e-9) return { badge: "q₀=0，场仍存在", className: "is-special", nature: "E 与 q₀ 无关", explanation: "试探电荷为零时 F=U=0，但源电荷建立的 E、V 不变" };
    return { badge: sample.potential >= 0 ? "正电势区域" : "负电势区域", className: sample.potential >= 0 ? "is-positive" : "is-negative", nature: state.testCharge > 0 ? "F 与 E 同向" : "F 与 E 反向", explanation: "E 的方向按正试探电荷受力方向定义" };
  }

  function renderControls(sample) {
    const workMode = state.mode === "work";
    const twoSource = state.mode === "superposition" || state.mode === "potential";
    refs.source1Section.hidden = workMode;
    refs.source2Section.hidden = !twoSource;
    refs.separationSection.hidden = !twoSource;
    refs.uniformSection.hidden = !workMode;
    refs.pathSection.hidden = !workMode;
    refs.source1Input.value = state.q1;
    refs.source2Input.value = state.q2;
    refs.separationInput.value = state.separation;
    refs.uniformInput.value = state.uniformField;
    refs.testChargeInput.value = state.testCharge;
    refs.progressInput.value = state.progress;
    refs.source1Value.textContent = `${signed(state.q1)} nC`;
    refs.source2Value.textContent = `${signed(state.q2)} nC`;
    refs.separationValue.textContent = `${state.separation.toFixed(1)} m`;
    refs.uniformValue.textContent = `${signed(state.uniformField)} N/C`;
    refs.testChargeValue.textContent = `${signed(state.testCharge)} nC`;
    refs.progressLabel.textContent = workMode ? "路径进度" : "探针坐标";
    refs.progressValue.textContent = workMode ? `${(state.progress * 100).toFixed(1)}% · ${state.path === "direct" ? "路径 A" : "路径 B"}` : `x = ${sample.x.toFixed(2)} m · y = ${sample.y.toFixed(2)} m`;
    refs.progressInput.disabled = !workMode;
    refs.playButton.disabled = !workMode;
    refs.pauseButton.disabled = !workMode;
    refs.playButton.setAttribute("aria-pressed", String(state.running));
    refs.playButton.textContent = state.running ? "▶ 运行中" : "▶ 播放";
    refs.keyButton.textContent = modes[state.mode].key;
    refs.sceneTabs.forEach((button) => button.classList.toggle("is-active", button.dataset.mode === state.mode));
    refs.pathButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.path === state.path));
    refs.rateButtons.forEach((button) => button.classList.toggle("is-active", Number(button.dataset.rate) === state.playbackRate));
    [refs.source1Input, refs.source2Input, refs.separationInput, refs.uniformInput, refs.testChargeInput, refs.progressInput].forEach(rangeProgress);
  }

  function renderReadouts(sample) {
    const angle = sample.magnitude > 1e-8 ? Math.atan2(sample.ey, sample.ex) * 180 / Math.PI : null;
    refs.fieldMetric.textContent = `${finite(sample.magnitude).toFixed(3)} N/C`;
    refs.directionMetric.textContent = angle === null ? "无确定方向" : `${signed(angle, 1)}°`;
    refs.potentialMetric.textContent = `${signed(finite(sample.potential), 3)} V`;
    refs.forceMetric.textContent = `${finite(sample.forceNanoN).toFixed(3)} nN`;
    refs.energyMetric.textContent = `${signed(finite(sample.energyNanoJ), 3)} nJ`;
    const status = statusFor(sample);
    refs.stateBadge.textContent = status.badge;
    refs.stateBadge.className = `state-badge ${status.className}`;
    refs.fieldNature.textContent = status.nature;
    refs.fieldExplanation.textContent = status.explanation;
    if (state.mode === "work") refs.formulaReadout.textContent = `W = ${signed(sample.workNanoJ, 2)} nJ = −ΔU`;
    else if (state.mode === "single") refs.formulaReadout.textContent = `E = k|Q|/r² = ${sample.magnitude.toFixed(3)} N/C`;
    else refs.formulaReadout.textContent = `E = E₁ + E₂ = ${sample.magnitude.toFixed(3)} N/C`;
  }

  function renderLabels(sample) {
    const config = modes[state.mode];
    refs.modeTitle.textContent = config.title;
    refs.modeGoal.textContent = config.goal;
    refs.stageHint.textContent = config.hint;
    if (state.mode === "single") {
      refs.profileKicker.textContent = "RADIAL PROFILE";
      refs.profileTitle.textContent = "场强 E(r)";
      refs.profileStatus.textContent = "E ∝ 1/r²";
      refs.vectorKicker.textContent = "POTENTIAL PROFILE";
      refs.vectorTitle.textContent = "电势 V(r)";
      refs.vectorStatus.textContent = "V ∝ 1/r";
    } else if (state.mode === "work") {
      refs.profileKicker.textContent = "PATH POTENTIAL";
      refs.profileTitle.textContent = "两条路径上的 V(s)";
      refs.profileStatus.textContent = `Vᴀ=${sample.start.potential.toFixed(1)} V · Vʙ=${sample.end.potential.toFixed(1)} V`;
      refs.vectorKicker.textContent = "CONSERVATIVE WORK";
      refs.vectorTitle.textContent = "W(s) 与 −ΔU(s)";
      refs.vectorStatus.textContent = `终点 W=${signed(sample.finalWorkNanoJ, 1)} nJ`;
    } else {
      refs.profileKicker.textContent = "SCALAR PROFILE";
      refs.profileTitle.textContent = "探针高度上的 V(x)";
      refs.profileStatus.textContent = state.mode === "superposition" ? "电势按代数和叠加" : "等势线越密，|∇V| 越大";
      refs.vectorKicker.textContent = "VECTOR COMPONENTS";
      refs.vectorTitle.textContent = "场强分量 Eₓ(x)、Eᵧ(x)";
      refs.vectorStatus.textContent = "E = −∇V";
    }
    refs.stepIndex.textContent = String(state.guideStep + 1).padStart(2, "0");
    refs.stepTitle.textContent = guide[state.guideStep].title;
    refs.stepPrompt.textContent = guide[state.guideStep].prompt;
    refs.routeSteps.forEach((button, index) => button.classList.toggle("is-active", index === state.guideStep));
  }

  function render() {
    const sample = solve();
    renderControls(sample);
    renderReadouts(sample);
    renderLabels(sample);
    drawScene(sample);
    drawCharts(sample);
  }

  function setState(next) {
    if ("q1" in next) state.q1 = clamp(next.q1, -8, 8);
    if ("q2" in next) state.q2 = clamp(next.q2, -8, 8);
    if ("separation" in next) state.separation = clamp(next.separation, 1.2, 5);
    if ("uniformField" in next) state.uniformField = clamp(next.uniformField, -20, 20);
    if ("testCharge" in next) state.testCharge = clamp(next.testCharge, -4, 4);
    if ("probeX" in next) state.probeX = clamp(next.probeX, WORLD.xMin + .2, WORLD.xMax - .2);
    if ("probeY" in next) state.probeY = clamp(next.probeY, WORLD.yMin + .2, WORLD.yMax - .2);
    if ("progress" in next) state.progress = clamp(next.progress, 0, 1);
    if ("running" in next) state.running = Boolean(next.running);
    render();
  }

  function setMode(modeName) {
    const config = modes[modeName];
    if (!config) return;
    Object.assign(state, { mode: modeName, q1: config.q1, q2: config.q2, separation: config.separation, probeX: config.probeX, probeY: config.probeY, progress: 0, running: false, path: "direct" });
    render();
  }

  function keyState() {
    if (state.mode === "single") setState({ probeX: 2, probeY: 0, running: false });
    else if (state.mode === "superposition") setState({ probeX: 0, probeY: 2, running: false });
    else if (state.mode === "potential") setState({ probeX: 0, probeY: 0, running: false });
    else setState({ progress: 1, running: false });
  }

  [[refs.source1Input, "q1"], [refs.source2Input, "q2"], [refs.separationInput, "separation"], [refs.uniformInput, "uniformField"], [refs.testChargeInput, "testCharge"]].forEach(([input, key]) => input.addEventListener("input", () => setState({ [key]: input.value, running: false })));
  refs.progressInput.addEventListener("input", () => setState({ progress: refs.progressInput.value, running: false }));
  refs.sceneTabs.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
  refs.routeSteps.forEach((button, index) => button.addEventListener("click", () => { state.guideStep = index; render(); }));
  refs.pathButtons.forEach((button) => button.addEventListener("click", () => { state.path = button.dataset.path; state.progress = 0; state.running = false; render(); }));
  refs.rateButtons.forEach((button) => button.addEventListener("click", () => { state.playbackRate = Number(button.dataset.rate); render(); }));
  refs.presetButtons.forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.preset === "positive") setMode("single");
    else if (button.dataset.preset === "dipole") setMode("superposition");
    else if (button.dataset.preset === "like") setMode("potential");
    else { state.testCharge = state.testCharge === 0 ? -2 : -state.testCharge; state.running = false; render(); }
  }));
  refs.playButton.addEventListener("click", () => { if (state.mode !== "work") return; if (state.progress >= .999) state.progress = 0; setState({ running: true }); });
  refs.pauseButton.addEventListener("click", () => setState({ running: false }));
  refs.keyButton.addEventListener("click", keyState);
  refs.resetButton.addEventListener("click", () => {
    Object.assign(state, { mode: "single", q1: 6, q2: -6, separation: 3, testCharge: 2, uniformField: 12, probeX: 2.4, probeY: 1.2, path: "direct", progress: 0, running: false, playbackRate: .5, guideStep: 0, showFieldLines: true, showVectors: true, showEquipotential: true, showForce: true, showPotentialMap: true });
    [refs.showFieldLinesToggle, refs.showVectorsToggle, refs.showEquipotentialToggle, refs.showForceToggle, refs.showPotentialMapToggle].forEach((input) => { input.checked = true; });
    render();
  });
  [[refs.showFieldLinesToggle, "showFieldLines"], [refs.showVectorsToggle, "showVectors"], [refs.showEquipotentialToggle, "showEquipotential"], [refs.showForceToggle, "showForce"], [refs.showPotentialMapToggle, "showPotentialMap"]].forEach(([input, key]) => input.addEventListener("change", () => { state[key] = input.checked; render(); }));
  refs.guideButton.addEventListener("click", () => refs.guideDialog.showModal());
  refs.stepButton.addEventListener("click", () => { state.guideStep = (state.guideStep + 1) % guide.length; render(); });
  refs.focusButton.addEventListener("click", () => { const active = document.body.classList.toggle("focus-mode"); refs.focusButton.setAttribute("aria-pressed", String(active)); });
  refs.fullscreenButton.addEventListener("click", () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());

  function pointerToState(event) {
    const rect = refs.canvas.getBoundingClientRect();
    const map = worldMap(rect.width, rect.height);
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    if (state.mode === "work") {
      let bestProgress = 0;
      let bestDistance = Infinity;
      for (let index = 0; index <= 100; index += 1) {
        const progress = index / 100;
        const point = model.pathPoint(state.path, progress);
        const distance = Math.hypot(map.x(point.x) - px, map.y(point.y) - py);
        if (distance < bestDistance) { bestDistance = distance; bestProgress = progress; }
      }
      setState({ progress: bestProgress, running: false });
      return;
    }
    const x = clamp(map.wx(px), WORLD.xMin + .2, WORLD.xMax - .2);
    const y = clamp(map.wy(py), WORLD.yMin + .2, WORLD.yMax - .2);
    const sources = model.pointSources(inputState());
    if (sources.some((source) => Math.hypot(x - source.x, y - source.y) < .42)) return;
    setState({ probeX: x, probeY: y, running: false });
  }

  refs.canvas.addEventListener("pointerdown", (event) => { state.dragging = true; refs.canvas.setPointerCapture(event.pointerId); pointerToState(event); });
  refs.canvas.addEventListener("pointermove", (event) => { if (state.dragging) pointerToState(event); });
  refs.canvas.addEventListener("pointerup", (event) => { state.dragging = false; refs.canvas.releasePointerCapture(event.pointerId); });
  refs.canvas.addEventListener("pointercancel", () => { state.dragging = false; });
  window.addEventListener("resize", render);

  let lastFrame = performance.now();
  function frame(now) {
    const delta = Math.min(.05, (now - lastFrame) / 1000);
    lastFrame = now;
    if (state.running && state.mode === "work") {
      state.progress += delta * state.playbackRate / 4;
      if (state.progress >= 1) { state.progress = 1; state.running = false; }
      render();
    }
    requestAnimationFrame(frame);
  }

  window.electricFieldLab = {
    solve: (input = {}) => input.mode === "work" ? model.workState({ ...inputState(), ...input }, input.progress ?? state.progress) : model.pointState({ ...inputState(), ...input }),
    getState: () => ({ ...state }),
    setState,
    setMode
  };
  render();
  requestAnimationFrame(frame);
})();
