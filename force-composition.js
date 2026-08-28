(function () {
  "use strict";

  const M = window.ForceCompositionModel;
  if (!M) throw new Error("ForceCompositionModel is required");

  const MODES = {
    compose: ["变量控制", "保持 F₁、F₂ 大小不变，只拖动夹角，观察合力怎样变化"],
    decompose: ["逆向分解", "固定两条分力方向，只改变合力大小，观察两个分力怎样变化"],
    multi: ["三力合成", "拖动 F₁、F₂、F₃，观察多个共点力仍怎样按分量合成"],
    apparatus: ["实验装置", "拖动两支测力计，读取平衡力并检查圆环闭合残差"],
    boundary: ["模型边界", "分别拖动目标大小、方向和两条分力方向，观察误差怎样被放大"],
  };
  const STEPS = [
    ["先控制变量", "两分力大小不变时，夹角从 0° 增大到 180°，合力为什么持续减小？"],
    ["再做逆问题", "固定两条分力方向后，合力大小增大一倍，两个分力会怎样变化？"],
    ["推广到多力", "三个力按不同顺序首尾相接，为什么最终合力仍然相同？"],
  ];
  const PRESETS = {
    angleStudy: {
      mode: "compose", composeControl: "angle", force1N: 6, force2N: 8,
      direction1Deg: 0, direction2Deg: 90,
    },
    magnitudeStudy: {
      mode: "decompose", force1N: 6, force2N: 6, direction1Deg: 25,
      direction2Deg: 155, targetForceN: 8, targetDirectionDeg: 90,
    },
    threeForces: {
      mode: "multi", force1N: 6, force2N: 6, force3N: 6,
      direction1Deg: 0, direction2Deg: 120, direction3Deg: -120,
    },
    collinear: {
      mode: "boundary", force1N: 5, force2N: 5, direction1Deg: 30,
      direction2Deg: 31, targetForceN: 10, targetDirectionDeg: 30.5,
      angleResolutionDeg: .5,
    },
  };
  const DEFAULT_STATE = {
    mode: "compose", composeControl: "angle", force1N: 6, force2N: 8,
    force3N: 5, direction1Deg: 0, direction2Deg: 90, direction3Deg: -120,
    targetForceN: 10, targetDirectionDeg: 53.13010235415598,
    forceResolutionN: .1, angleResolutionDeg: .5, readingNoise: .25,
    seed: 41, guideStep: 0, showComponents: true, showParallelogram: true,
    showValues: true, showUncertainty: true, dragging: false, dragRole: null,
  };
  const state = { ...DEFAULT_STATE };
  const $ = (id) => document.getElementById(id);
  const R = {
    main: $("forceCanvas"), response: $("responseChart"), evidence: $("evidenceChart"),
    force1: $("force1Input"), force2: $("force2Input"), force3: $("force3Input"),
    direction1: $("direction1Input"), direction2: $("direction2Input"), direction3: $("direction3Input"),
    target: $("targetInput"), targetDirection: $("targetDirectionInput"),
    forceResolution: $("forceResolutionInput"), angleResolution: $("angleResolutionInput"),
    noise: $("noiseInput"), seed: $("seedInput"),
    force1Value: $("force1Value"), force2Value: $("force2Value"), force3Value: $("force3Value"),
    direction1Value: $("direction1Value"), direction2Value: $("direction2Value"), direction3Value: $("direction3Value"),
    targetValue: $("targetValue"), targetDirectionValue: $("targetDirectionValue"),
    forceResolutionValue: $("forceResolutionValue"), angleResolutionValue: $("angleResolutionValue"),
    noiseValue: $("noiseValue"), seedValue: $("seedValue"),
    force1Metric: $("force1Metric"), force2Metric: $("force2Metric"), force3Metric: $("force3Metric"),
    resultantMetric: $("resultantMetric"), angleMetric: $("angleMetric"),
    closureMetric: $("closureMetric"), conditionMetric: $("conditionMetric"),
    modeTitle: $("modeTitle"), modeGoal: $("modeGoal"), interactionHint: $("interactionModeHint"),
    stageHint: document.querySelector(".drag-hint"), badge: $("stateBadge"),
    nature: $("natureText"), explanation: $("explanationText"),
    dataKicker: $("dataKicker"), dataTitle: $("dataTitle"), dataStatus: $("dataStatus"),
    evidenceKicker: $("evidenceKicker"), evidenceTitle: $("evidenceTitle"), evidenceStatus: $("evidenceStatus"),
    stepIndex: $("stepIndex"), stepTitle: $("stepTitle"), stepPrompt: $("stepPrompt"), formula: $("formulaReadout"),
    components: $("showComponentsToggle"), parallelogram: $("showParallelogramToggle"),
    values: $("showValuesToggle"), uncertainty: $("showUncertaintyToggle"),
    tabs: [...document.querySelectorAll(".scene-tab[data-mode]")],
    route: [...document.querySelectorAll(".route-step")],
    presets: [...document.querySelectorAll(".preset-button")],
    composeControls: [...document.querySelectorAll("[data-compose-control]")],
    reset: $("resetButton"), guide: $("guideButton"), step: $("stepButton"),
    focus: $("focusButton"), fullscreen: $("fullscreenButton"), dialog: $("guideDialog"),
  };
  const ctx = R.main.getContext("2d");
  const rctx = R.response.getContext("2d");
  const ectx = R.evidence.getContext("2d");
  const C = {
    bg: "#070b0c", grid: "rgba(223,229,223,.045)", text: "#dfe5df",
    muted: "#7f8d86", cyan: "#63cfda", amber: "#f2bd5a",
    violet: "#b991e8", green: "#76d6a0", red: "#ff7f72",
  };
  const clamp = M.clamp;
  const fmt = (value, digits = 2) => Number.isFinite(value) ? Number(value).toFixed(digits) : "—";
  const rad = (degrees) => degrees * M.DEG;

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
  function text(context, value, x, y, color = C.text, px = 9, align = "left", weight = 600) {
    context.fillStyle = color;
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
    const padding = { left: 43, right: 14, top: 20, bottom: 29 };
    const x = (value) => padding.left + (value - xmin) / (xmax - xmin || 1)
      * (viewport.width - padding.left - padding.right);
    const y = (value) => viewport.height - padding.bottom - (value - ymin) / (ymax - ymin || 1)
      * (viewport.height - padding.top - padding.bottom);
    line(context, padding.left, padding.top, padding.left, viewport.height - padding.bottom, "rgba(223,229,223,.28)");
    line(context, padding.left, viewport.height - padding.bottom, viewport.width - padding.right, viewport.height - padding.bottom, "rgba(223,229,223,.28)");
    return { x, y };
  }
  function range(element, value) {
    element.value = value;
    element.style.setProperty("--range-progress", `${(value - +element.min) / (+element.max - +element.min) * 100}%`);
  }
  function arrow(context, origin, vector, scale, color, label, dashed = false) {
    const end = { x: origin.x + vector.x * scale, y: origin.y - vector.y * scale };
    line(context, origin.x, origin.y, end.x, end.y, color, 2.6, dashed ? [6, 4] : []);
    const angle = Math.atan2(end.y - origin.y, end.x - origin.x);
    const head = 10;
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(end.x, end.y);
    context.lineTo(end.x - head * Math.cos(angle - .42), end.y - head * Math.sin(angle - .42));
    context.lineTo(end.x - head * Math.cos(angle + .42), end.y - head * Math.sin(angle + .42));
    context.closePath();
    context.fill();
    if (label && state.showValues) {
      text(context, label, end.x + 7 * Math.cos(angle - 1.1), end.y + 7 * Math.sin(angle - 1.1), color, 9, "left", 700);
    }
    return end;
  }
  function arcDirection(context, origin, angleDeg, radius, color) {
    context.save();
    context.strokeStyle = color;
    context.lineWidth = 1.2;
    context.beginPath();
    context.arc(origin.x, origin.y, radius, 0, -rad(angleDeg), angleDeg > 0);
    context.stroke();
    context.restore();
  }
  function pointAt(origin, angleDeg, radius) {
    return { x: origin.x + Math.cos(rad(angleDeg)) * radius, y: origin.y - Math.sin(rad(angleDeg)) * radius };
  }
  function endpoint(origin, vector, scale) {
    return { x: origin.x + vector.x * scale, y: origin.y - vector.y * scale };
  }

  function current() {
    if (state.mode === "compose") return { kind: "compose", result: M.compose(state) };
    if (state.mode === "multi") return { kind: "multi", result: M.composeMany(state) };
    if (state.mode === "apparatus") return { kind: "apparatus", result: M.apparatus(state) };
    return { kind: "decompose", result: M.decompose(state), sensitivity: M.sensitivity(state) };
  }

  function mainGeometry(solution, viewport) {
    const origin = { x: viewport.width * .42, y: viewport.height * .57 };
    const q = solution.result;
    const f1 = solution.kind === "decompose" ? q.force1 : solution.kind === "apparatus" ? q.measured.force1 : q.force1;
    const f2 = solution.kind === "decompose" ? q.force2 : solution.kind === "apparatus" ? q.measured.force2 : q.force2;
    const f3 = solution.kind === "multi" ? q.force3 : null;
    const resultant = solution.kind === "decompose" ? q.target : solution.kind === "apparatus" ? q.measured.resultant : q.resultant;
    // Reserve the full possible vector sum so the N->px mapping stays stable
    // while values change and the largest valid state remains inside the stage.
    const displayMaxN = solution.kind === "multi" ? 60 : 40;
    const scale = Math.min(viewport.width * .34, viewport.height * .39) / displayMaxN;
    const f1End = endpoint(origin, f1, scale);
    const f2End = endpoint(origin, f2, scale);
    const f3End = f3 ? endpoint(origin, f3, scale) : null;
    const resultEnd = endpoint(origin, resultant, scale);
    const handleRadius = Math.max(58, Math.min(viewport.width, viewport.height) * .18);
    let handles;
    if (solution.kind === "decompose") {
      const directionRadius = Math.min(
        Math.max(handleRadius + 42, state.targetForceN * scale + 38),
        Math.min(viewport.width, viewport.height) * .4,
      );
      handles = {
        target: resultEnd,
        targetDirection: pointAt(origin, state.targetDirectionDeg, directionRadius),
        direction1: pointAt(origin, state.direction1Deg, handleRadius),
        direction2: pointAt(origin, state.direction2Deg, handleRadius + 22),
      };
    } else if (solution.kind === "multi") {
      handles = { force1: f1End, force2: f2End, force3: f3End };
    } else if (solution.kind === "compose" && state.composeControl === "angle") {
      handles = { includedAngle: pointAt(origin, state.direction2Deg, Math.max(handleRadius, state.force2N * scale + 38)) };
    } else if (solution.kind === "compose" && state.composeControl === "magnitude") {
      handles = { force1: f1End, force2: f2End };
    } else {
      handles = { force1: f1End, force2: f2End };
    }
    return {
      viewport, origin, scale, scaleReferenceN: 10, f1, f2, f3, resultant,
      f1End, f2End, f3End, resultEnd, handles,
    };
  }

  function drawHandle(point, color, label, active) {
    if (!point) return;
    ctx.save();
    ctx.strokeStyle = active ? C.text : color;
    ctx.lineWidth = active ? 2.5 : 1.5;
    ctx.fillStyle = active ? color : "rgba(7,11,12,.9)";
    ctx.beginPath();
    ctx.arc(point.x, point.y, active ? 10 : 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = `${color}99`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 14, 0, Math.PI * 2);
    ctx.stroke();
    text(ctx, label, point.x + 17, point.y - 10, active ? C.text : color, 9, "left", 700);
    ctx.restore();
  }
  function drawSpringScale(origin, end, color) {
    const dx = end.x - origin.x;
    const dy = end.y - origin.y;
    const length = Math.hypot(dx, dy);
    if (length < 24) return;
    const angle = Math.atan2(dy, dx);
    const bodyCenter = { x: origin.x + dx * .43, y: origin.y + dy * .43 };
    ctx.save();
    ctx.translate(bodyCenter.x, bodyCenter.y);
    ctx.rotate(angle);
    ctx.strokeStyle = `${color}aa`;
    ctx.lineWidth = 1.2;
    ctx.fillStyle = "rgba(11,17,17,.94)";
    ctx.beginPath();
    ctx.rect(-26, -8, 52, 16);
    ctx.fill();
    ctx.stroke();
    for (let tick = -16; tick <= 16; tick += 8) line(ctx, tick, -5, tick, 5, `${color}70`, 1);
    ctx.restore();
    line(ctx, origin.x, origin.y, bodyCenter.x - Math.cos(angle) * 27, bodyCenter.y - Math.sin(angle) * 27, `${color}70`, 1.2);
    line(ctx, bodyCenter.x + Math.cos(angle) * 27, bodyCenter.y + Math.sin(angle) * 27, end.x, end.y, `${color}70`, 1.2);
  }
  function drawScaleLegend(geometry) {
    const { viewport, scale, scaleReferenceN } = geometry;
    const length = scale * scaleReferenceN;
    const x2 = viewport.width - 18;
    const x1 = x2 - length;
    const y = 24;
    line(ctx, x1, y, x2, y, C.text, 1.5);
    line(ctx, x1, y - 4, x1, y + 4, C.text, 1.5);
    line(ctx, x2, y - 4, x2, y + 4, C.text, 1.5);
    text(ctx, `比例尺 ${scaleReferenceN} N`, x2, y + 14, C.muted, 8, "right", 700);
  }

  function drawMain(solution) {
    const viewport = size(R.main, ctx, 300);
    background(ctx, viewport.width, viewport.height);
    const geometry = mainGeometry(solution, viewport);
    state.mainGeometry = geometry;
    const { origin, scale, f1, f2, f3, resultant } = geometry;
    const q = solution.result;

    line(ctx, 24, origin.y, viewport.width - 24, origin.y, "rgba(223,229,223,.16)");
    line(ctx, origin.x, 24, origin.x, viewport.height - 24, "rgba(223,229,223,.16)");
    text(ctx, "+x", viewport.width - 30, origin.y - 7, C.muted);
    text(ctx, "+y", origin.x + 7, 31, C.muted);
    drawScaleLegend(geometry);

    if (state.showComponents && resultant) {
      line(ctx, origin.x, origin.y, origin.x + resultant.x * scale, origin.y, "rgba(242,189,90,.45)", 1, [4, 4]);
      line(ctx, origin.x + resultant.x * scale, origin.y, origin.x + resultant.x * scale, origin.y - resultant.y * scale, "rgba(242,189,90,.45)", 1, [4, 4]);
    }
    if (state.showParallelogram && solution.kind !== "multi" && f1 && f2) {
      const p1 = geometry.f1End;
      const p2 = geometry.f2End;
      line(ctx, p1.x, p1.y, p1.x + f2.x * scale, p1.y - f2.y * scale, "rgba(185,145,232,.55)", 1.4, [5, 4]);
      line(ctx, p2.x, p2.y, p2.x + f1.x * scale, p2.y - f1.y * scale, "rgba(185,145,232,.55)", 1.4, [5, 4]);
    }
    if (solution.kind === "multi" && state.showParallelogram) {
      let cursor = { ...origin };
      [f1, f2, f3].forEach((force, index) => {
        const next = endpoint(cursor, force, scale);
        line(ctx, cursor.x, cursor.y, next.x, next.y, [C.violet, C.cyan, C.green][index], 1.5, [5, 4]);
        cursor = next;
      });
      text(ctx, "虚线：F₁→F₂→F₃ 的首尾相接", 18, 47, C.muted, 9, "left", 700);
    }
    if (solution.kind === "apparatus") {
      drawSpringScale(origin, geometry.f1End, C.violet);
      drawSpringScale(origin, geometry.f2End, C.cyan);
      text(ctx, "两支测力计共同拉住同一圆环", 18, 47, C.muted, 9, "left", 700);
    }

    if (Number.isFinite(f1?.x)) arrow(ctx, origin, f1, scale, C.violet, "F₁");
    if (Number.isFinite(f2?.x)) arrow(ctx, origin, f2, scale, C.cyan, "F₂");
    if (Number.isFinite(f3?.x)) arrow(ctx, origin, f3, scale, C.green, "F₃");
    if (resultant) arrow(ctx, origin, resultant, scale, C.amber, solution.kind === "decompose" ? "目标 R" : "R");

    if (solution.kind === "apparatus") {
      arrow(ctx, origin, q.balancing, scale, C.green, "平衡力");
      ctx.strokeStyle = C.text;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(origin.x, origin.y, 13, 0, Math.PI * 2);
      ctx.stroke();
      text(ctx, `仪器闭合残差 ${fmt(q.closureResidualN, 3)} N`, 18, 64, q.closureResidualN < state.forceResolutionN ? C.green : C.red, 9, "left", 700);
    } else if (solution.kind === "decompose" && state.showUncertainty) {
      const targetLow = M.vector(state.targetForceN, state.targetDirectionDeg - state.angleResolutionDeg);
      const targetHigh = M.vector(state.targetForceN, state.targetDirectionDeg + state.angleResolutionDeg);
      arrow(ctx, origin, targetLow, scale, "rgba(242,189,90,.28)", "", true);
      arrow(ctx, origin, targetHigh, scale, "rgba(242,189,90,.28)", "", true);
    }

    arcDirection(ctx, origin, state.direction1Deg, 28, C.violet);
    arcDirection(ctx, origin, state.direction2Deg, 42, C.cyan);
    if (solution.kind === "multi") arcDirection(ctx, origin, state.direction3Deg, 56, C.green);

    if (solution.kind === "decompose") {
      drawHandle(geometry.handles.target, C.amber, "R大小", state.dragRole === "target");
      drawHandle(geometry.handles.targetDirection, C.amber, "φ", state.dragRole === "targetDirection");
      drawHandle(geometry.handles.direction1, C.violet, "θ₁", state.dragRole === "direction1");
      drawHandle(geometry.handles.direction2, C.cyan, "θ₂", state.dragRole === "direction2");
    } else if (solution.kind === "multi") {
      drawHandle(geometry.handles.force1, C.violet, "F₁", state.dragRole === "force1");
      drawHandle(geometry.handles.force2, C.cyan, "F₂", state.dragRole === "force2");
      drawHandle(geometry.handles.force3, C.green, "F₃", state.dragRole === "force3");
    } else if (solution.kind === "compose" && state.composeControl === "angle") {
      drawHandle(geometry.handles.includedAngle, C.cyan, "θ", state.dragRole === "includedAngle");
    } else {
      drawHandle(geometry.handles.force1, C.violet, "F₁", state.dragRole === "force1");
      drawHandle(geometry.handles.force2, C.cyan, "F₂", state.dragRole === "force2");
    }

    let hint = "拖动 F₁ / F₂ 端点：同时改变大小与方向";
    if (solution.kind === "compose" && state.composeControl === "angle") hint = "F₁、F₂ 大小已锁定；拖动外侧 θ 手柄改夹角";
    if (solution.kind === "compose" && state.composeControl === "magnitude") hint = "夹角已锁定；拖动 F₁/F₂ 端点只改大小";
    if (solution.kind === "decompose") hint = "拖动 R大小只改合力大小；拖动 φ、θ₁、θ₂ 才改方向";
    if (solution.kind === "multi") hint = "拖动三个端点；所有箭长共用当前固定比例尺";
    if (solution.kind === "apparatus") hint = "拖动两支测力计端点；比例尺不会随读数自动缩放";
    text(ctx, hint, 16, viewport.height - 10, C.muted, 8);
  }

  function drawResponse(solution) {
    const viewport = size(R.response, rctx);
    background(rctx, viewport.width, viewport.height);
    if (state.mode === "compose" || state.mode === "apparatus") {
      const points = Array.from({ length: 181 }, (_, angle) => ({
        angle,
        value: M.compose({ ...state, direction1Deg: 0, direction2Deg: angle }).resultantN,
      }));
      const ymax = state.force1N + state.force2N || 1;
      const axis = axes(rctx, viewport, 0, 180, 0, ymax * 1.08);
      rctx.strokeStyle = C.cyan;
      rctx.lineWidth = 2;
      rctx.beginPath();
      points.forEach((point, index) => index ? rctx.lineTo(axis.x(point.angle), axis.y(point.value)) : rctx.moveTo(axis.x(point.angle), axis.y(point.value)));
      rctx.stroke();
      const delta = Math.abs(M.directionSeparation(state.direction1Deg, state.direction2Deg));
      const value = M.compose(state).resultantN;
      line(rctx, axis.x(delta), axis.y(0), axis.x(delta), axis.y(value), C.amber, 1.5, [4, 4]);
      rctx.fillStyle = C.amber;
      rctx.beginPath();
      rctx.arc(axis.x(delta), axis.y(value), 4, 0, Math.PI * 2);
      rctx.fill();
      text(rctx, "R/N", 7, 13, C.cyan);
      text(rctx, "夹角/°", viewport.width - 8, viewport.height - 6, C.muted, 8, "right");
      return;
    }
    if (state.mode === "multi") {
      const points = Array.from({ length: 341 }, (_, index) => {
        const direction = -170 + index;
        return { direction, value: M.composeMany({ ...state, direction3Deg: direction }).resultantN };
      });
      const ymax = state.force1N + state.force2N + state.force3N || 1;
      const axis = axes(rctx, viewport, -170, 170, 0, ymax * 1.08);
      rctx.strokeStyle = C.green;
      rctx.lineWidth = 2;
      rctx.beginPath();
      points.forEach((point, index) => index ? rctx.lineTo(axis.x(point.direction), axis.y(point.value)) : rctx.moveTo(axis.x(point.direction), axis.y(point.value)));
      rctx.stroke();
      line(rctx, axis.x(state.direction3Deg), axis.y(0), axis.x(state.direction3Deg), axis.y(solution.result.resultantN), C.amber, 1.5, [4, 4]);
      text(rctx, "R/N", 7, 13, C.green);
      text(rctx, "θ₃/°", viewport.width - 8, viewport.height - 6, C.muted, 8, "right");
      return;
    }

    const low = Math.min(state.direction1Deg, state.direction2Deg);
    const high = Math.max(state.direction1Deg, state.direction2Deg);
    const span = Math.max(1, high - low);
    const points = Array.from({ length: 121 }, (_, index) => M.decompose({
      ...state,
      targetDirectionDeg: low + span * index / 120,
    }));
    const ymax = Math.max(
      state.targetForceN,
      ...points.flatMap((point) => [point.force1N, point.force2N]).filter((value) => Number.isFinite(value) && value < 100),
    ) * 1.1;
    const axis = axes(rctx, viewport, low, high, 0, ymax);
    [["force1N", C.violet], ["force2N", C.cyan]].forEach(([key, color]) => {
      rctx.strokeStyle = color;
      rctx.lineWidth = 2;
      rctx.beginPath();
      points.forEach((point, index) => {
        const y = clamp(point[key], 0, ymax);
        index ? rctx.lineTo(axis.x(point.targetDirectionDeg), axis.y(y)) : rctx.moveTo(axis.x(point.targetDirectionDeg), axis.y(y));
      });
      rctx.stroke();
    });
    line(rctx, axis.x(state.targetDirectionDeg), axis.y(0), axis.x(state.targetDirectionDeg), axis.y(ymax), C.amber, 1, [4, 4]);
    text(rctx, "F/N", 7, 13, C.violet);
    text(rctx, "目标方向/°", viewport.width - 8, viewport.height - 6, C.muted, 8, "right");
  }

  function drawEvidence(solution) {
    const viewport = size(R.evidence, ectx);
    background(ectx, viewport.width, viewport.height);
    if (state.mode === "boundary") {
      const points = Array.from({ length: 160 }, (_, index) => {
        const separation = .5 + index * 179 / 159;
        return { separation, condition: M.decompose({ ...state, direction2Deg: state.direction1Deg + separation }).conditionNumber };
      });
      const axis = axes(ectx, viewport, .5, 180, 0, 120);
      ectx.strokeStyle = C.red;
      ectx.lineWidth = 2;
      ectx.beginPath();
      points.forEach((point, index) => index
        ? ectx.lineTo(axis.x(point.separation), axis.y(Math.min(120, point.condition)))
        : ectx.moveTo(axis.x(point.separation), axis.y(Math.min(120, point.condition))));
      ectx.stroke();
      const separation = Math.abs(M.directionSeparation(state.direction1Deg, state.direction2Deg));
      line(ectx, axis.x(separation), axis.y(0), axis.x(separation), axis.y(Math.min(120, solution.result.conditionNumber)), C.amber, 1.5, [4, 4]);
      text(ectx, "条件数", 7, 13, C.red);
      text(ectx, "方向夹角/°", viewport.width - 8, viewport.height - 6, C.muted, 8, "right");
      return;
    }

    const q = solution.result;
    const f1 = solution.kind === "decompose" ? q.force1 : solution.kind === "apparatus" ? q.measured.force1 : q.force1;
    const f2 = solution.kind === "decompose" ? q.force2 : solution.kind === "apparatus" ? q.measured.force2 : q.force2;
    const f3 = solution.kind === "multi" ? q.force3 : null;
    const target = solution.kind === "decompose" ? q.target : solution.kind === "apparatus" ? q.measured.resultant : q.resultant;
    const values = f3
      ? [f1.x, f2.x, f3.x, target.x, f1.y, f2.y, f3.y, target.y]
      : [f1.x, f2.x, target.x, f1.y, f2.y, target.y];
    const labels = f3
      ? ["F₁x", "F₂x", "F₃x", "Rx", "F₁y", "F₂y", "F₃y", "Ry"]
      : ["F₁x", "F₂x", "Rx", "F₁y", "F₂y", "Ry"];
    const colors = f3
      ? [C.violet, C.cyan, C.green, C.amber, C.violet, C.cyan, C.green, C.amber]
      : [C.violet, C.cyan, C.amber, C.violet, C.cyan, C.amber];
    const max = Math.max(1, ...values.map(Math.abs)) * 1.2;
    const axis = axes(ectx, viewport, 0, values.length + 1, -max, max);
    line(ectx, axis.x(0), axis.y(0), axis.x(values.length + 1), axis.y(0), C.muted, 1);
    values.forEach((value, index) => {
      const x = axis.x(index + 1);
      line(ectx, x, axis.y(0), x, axis.y(value), colors[index], f3 ? 9 : 12);
      text(ectx, labels[index], x, viewport.height - 10, C.muted, 8, "center");
    });
    text(ectx, "分量/N", 7, 13, C.violet);
  }

  function pointerPoint(event) {
    const box = R.main.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }
  function hitTest(point) {
    const geometry = state.mainGeometry;
    if (!geometry) return null;
    let entries;
    if (state.mode === "decompose" || state.mode === "boundary") {
      entries = [
        ["target", geometry.handles.target],
        ["targetDirection", geometry.handles.targetDirection],
        ["direction1", geometry.handles.direction1],
        ["direction2", geometry.handles.direction2],
      ];
    } else if (state.mode === "multi") {
      entries = [["force1", geometry.handles.force1], ["force2", geometry.handles.force2], ["force3", geometry.handles.force3]];
    } else if (state.mode === "compose" && state.composeControl === "angle") {
      entries = [["includedAngle", geometry.handles.includedAngle]];
    } else if (state.mode === "compose" && state.composeControl === "magnitude") {
      entries = [["force1", geometry.handles.force1], ["force2", geometry.handles.force2]];
    } else {
      entries = [["force1", geometry.handles.force1], ["force2", geometry.handles.force2]];
    }
    return entries
      .filter(([, handle]) => handle)
      .map(([role, handle]) => ({ role, distance: Math.hypot(point.x - handle.x, point.y - handle.y) }))
      .filter((entry) => entry.distance <= 24)
      .sort((a, b) => a.distance - b.distance)[0]?.role || null;
  }
  function applyDrag(event) {
    const geometry = state.mainGeometry;
    if (!geometry || !state.dragRole) return;
    const point = pointerPoint(event);
    const dx = point.x - geometry.origin.x;
    const dy = geometry.origin.y - point.y;
    const angle = clamp(Math.atan2(dy, dx) / M.DEG, -170, 170);
    const magnitude = clamp(Math.hypot(dx, dy) / geometry.scale, 0, 20);
    if (state.dragRole === "force1") {
      state.force1N = state.composeControl === "magnitude"
        ? clamp((dx * Math.cos(rad(state.direction1Deg)) + dy * Math.sin(rad(state.direction1Deg))) / geometry.scale, 0, 20)
        : magnitude;
      if (state.composeControl === "free") state.direction1Deg = angle;
    }
    if (state.dragRole === "force2") {
      state.force2N = state.composeControl === "magnitude"
        ? clamp((dx * Math.cos(rad(state.direction2Deg)) + dy * Math.sin(rad(state.direction2Deg))) / geometry.scale, 0, 20)
        : magnitude;
      if (state.composeControl === "free") state.direction2Deg = angle;
    }
    if (state.dragRole === "force3") {
      state.force3N = magnitude;
      state.direction3Deg = angle;
    }
    if (state.dragRole === "includedAngle") state.direction2Deg = angle;
    if (state.dragRole === "target") {
      const unit = M.vector(1, state.targetDirectionDeg);
      const projected = dx * unit.x + dy * unit.y;
      state.targetForceN = clamp(projected / geometry.scale, .5, 20);
    }
    if (state.dragRole === "targetDirection") state.targetDirectionDeg = angle;
    if (state.dragRole === "direction1") state.direction1Deg = angle;
    if (state.dragRole === "direction2") state.direction2Deg = angle;
    render();
  }

  function render() {
    const solution = current();
    const q = solution.result;
    [
      [R.force1, state.force1N], [R.force2, state.force2N], [R.force3, state.force3N],
      [R.direction1, state.direction1Deg], [R.direction2, state.direction2Deg], [R.direction3, state.direction3Deg],
      [R.target, state.targetForceN], [R.targetDirection, state.targetDirectionDeg],
      [R.forceResolution, state.forceResolutionN], [R.angleResolution, state.angleResolutionDeg],
      [R.noise, state.readingNoise], [R.seed, state.seed],
    ].forEach(([element, value]) => range(element, value));

    R.force1Value.textContent = `${fmt(state.force1N, 1)} N`;
    R.force2Value.textContent = `${fmt(state.force2N, 1)} N`;
    R.force3Value.textContent = `${fmt(state.force3N, 1)} N`;
    R.direction1Value.textContent = `${fmt(state.direction1Deg, 1)}°`;
    R.direction2Value.textContent = `${fmt(state.direction2Deg, 1)}°`;
    R.direction3Value.textContent = `${fmt(state.direction3Deg, 1)}°`;
    R.targetValue.textContent = `${fmt(state.targetForceN, 1)} N`;
    R.targetDirectionValue.textContent = `${fmt(state.targetDirectionDeg, 1)}°`;
    R.forceResolutionValue.textContent = `${fmt(state.forceResolutionN, 2)} N`;
    R.angleResolutionValue.textContent = `${fmt(state.angleResolutionDeg, 2)}°`;
    R.noiseValue.textContent = `${fmt(state.readingNoise * 100, 0)}%`;
    R.seedValue.textContent = String(state.seed);

    const f1 = solution.kind === "decompose" ? q.force1N : solution.kind === "apparatus" ? q.measuredForce1N : state.force1N;
    const f2 = solution.kind === "decompose" ? q.force2N : solution.kind === "apparatus" ? q.measuredForce2N : state.force2N;
    const f3 = solution.kind === "multi" ? state.force3N : NaN;
    const resultN = solution.kind === "decompose" ? state.targetForceN : solution.kind === "apparatus" ? q.measuredResultantN : q.resultantN;
    const angle = solution.kind === "decompose" ? state.targetDirectionDeg : solution.kind === "apparatus" ? q.measuredResultantDirectionDeg : q.resultantDirectionDeg;
    const closure = solution.kind === "decompose" || solution.kind === "apparatus"
      ? q.closureResidualN
      : Math.hypot(q.componentResidualX, q.componentResidualY);
    const condition = solution.kind === "decompose" ? M.decompose(state).conditionNumber : 1;

    R.force1Metric.textContent = `${fmt(f1, 2)} N`;
    R.force2Metric.textContent = `${fmt(f2, 2)} N`;
    R.force3Metric.textContent = `${fmt(f3, 2)} N`;
    R.resultantMetric.textContent = `${fmt(resultN, 2)} N`;
    R.angleMetric.textContent = `${fmt(angle, 2)}°`;
    R.closureMetric.textContent = `${fmt(closure, 3)} N`;
    R.conditionMetric.textContent = solution.kind === "decompose" ? (condition > 999 ? ">999" : fmt(condition, 2)) : "—";

    const invalid = solution.kind === "decompose" && !q.validTensions;
    const unstable = solution.kind === "decompose" && condition > 20;
    if (invalid) {
      R.badge.textContent = "绳张力不可实现";
      R.nature.textContent = "目标方向超出两条拉力的可实现扇区";
      R.explanation.textContent = "负解意味着其中一条绳必须提供推力";
    } else if (unstable) {
      R.badge.textContent = "误差高度放大";
      R.nature.textContent = "当前分解几何处于病态区";
      R.explanation.textContent = `条件数 ${fmt(condition, 1)}：微小测角误差会被显著放大`;
    } else if (state.mode === "compose" && state.composeControl === "angle") {
      R.badge.textContent = "变量已锁定";
      R.nature.textContent = "F₁、F₂ 大小保持不变";
      R.explanation.textContent = "画布只改变夹角，合力变化可直接归因于 cosθ";
    } else if (state.mode === "compose" && state.composeControl === "magnitude") {
      R.badge.textContent = "变量已锁定";
      R.nature.textContent = "θ 保持不变，分力大小独立变化";
      R.explanation.textContent = "画布端点沿原方向移动，合力变化只由分力大小造成";
    } else if (state.mode === "multi") {
      R.badge.textContent = "三力闭合";
      R.nature.textContent = "多个共点力仍分别相加 x、y 分量";
      R.explanation.textContent = "改变首尾相接顺序不会改变最终合力";
    } else if (state.mode === "apparatus") {
      R.badge.textContent = "有限精度闭合";
      R.nature.textContent = "仪器读数存在有限闭合残差";
      R.explanation.textContent = "改变分度值与实验编号，可比较重复读数";
    } else if (state.mode === "decompose") {
      R.badge.textContent = "方向已锁定";
      R.nature.textContent = "两条分力方向不变，大小由目标合力决定";
      R.explanation.textContent = "拖动 R大小时，φ、θ₁、θ₂ 均保持不变";
    } else {
      R.badge.textContent = "自由合成";
      R.nature.textContent = "两分力与合力满足矢量闭合";
      R.explanation.textContent = "端点拖动同时改变力的大小和方向";
    }
    R.badge.className = `state-badge${invalid || unstable ? " is-warning" : ""}`;

    const labRoot = document.querySelector(".force-composition-lab");
    labRoot.dataset.mode = state.mode;
    labRoot.dataset.composeControl = state.composeControl;
    R.modeTitle.textContent = MODES[state.mode][0];
    R.modeGoal.textContent = MODES[state.mode][1];
    if (state.mode === "compose" && state.composeControl === "angle") {
      R.interactionHint.textContent = "固定 F₁、F₂，只拖动夹角";
      R.stageHint.textContent = "拖动 θ 端点只改变夹角";
    } else if (state.mode === "compose" && state.composeControl === "magnitude") {
      R.interactionHint.textContent = "固定夹角，只拖动 F₁、F₂ 大小";
      R.stageHint.textContent = "拖动 F₁/F₂ 端点只改变大小";
    } else if (state.mode === "compose") {
      R.interactionHint.textContent = "画布可自由拖动 F₁、F₂";
      R.stageHint.textContent = "拖动 F₁、F₂ 同时改变大小和方向";
    } else if (state.mode === "multi") {
      R.interactionHint.textContent = "画布可拖动 F₁、F₂、F₃";
      R.stageHint.textContent = "三个力共用固定比例尺";
    } else if (state.mode === "apparatus") {
      R.interactionHint.textContent = "画布可拖动两支测力计";
      R.stageHint.textContent = "拖动两支测力计端点";
    } else {
      R.interactionHint.textContent = "R大小、φ、θ₁、θ₂ 独立可调";
      R.stageHint.textContent = "拖动 R大小不会改变合力方向";
    }
    R.tabs.forEach((button) => button.classList.toggle("is-active", button.dataset.mode === state.mode));
    R.route.forEach((button, index) => button.classList.toggle("is-active", index === state.guideStep));
    R.composeControls.forEach((button) => {
      const active = button.dataset.composeControl === state.composeControl;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    R.stepIndex.textContent = String(state.guideStep + 1).padStart(2, "0");
    R.stepTitle.textContent = STEPS[state.guideStep][0];
    R.stepPrompt.textContent = STEPS[state.guideStep][1];
    R.formula.textContent = state.mode === "compose"
      ? "R²=F₁²+F₂²+2F₁F₂cosθ"
      : state.mode === "multi"
        ? "R=F₁+F₂+F₃"
        : state.mode === "apparatus"
          ? "F₁+F₂+F₃≈0"
          : "[F₁ F₂]·c=R";

    if (state.mode === "compose" || state.mode === "apparatus") {
      R.dataKicker.textContent = "ANGLE RESPONSE";
      R.dataTitle.textContent = "固定分力时，合力随夹角变化";
      R.dataStatus.textContent = `R=${fmt(resultN, 2)}N`;
      R.evidenceKicker.textContent = "COMPONENT LEDGER";
      R.evidenceTitle.textContent = "x / y 分量账本";
      R.evidenceStatus.textContent = `残差 ${fmt(closure, 3)}N`;
    } else if (state.mode === "multi") {
      R.dataKicker.textContent = "THIRD FORCE RESPONSE";
      R.dataTitle.textContent = "F₃ 方向改变时的合力";
      R.dataStatus.textContent = `R=${fmt(resultN, 2)}N`;
      R.evidenceKicker.textContent = "MULTI-FORCE LEDGER";
      R.evidenceTitle.textContent = "三个力的分量闭合";
      R.evidenceStatus.textContent = `残差 ${fmt(closure, 3)}N`;
    } else if (state.mode === "boundary") {
      R.dataKicker.textContent = "INVERSE RESPONSE";
      R.dataTitle.textContent = "目标方向改变时的分力";
      R.dataStatus.textContent = `波动 ${fmt(solution.sensitivity.spreadN, 2)}N`;
      R.evidenceKicker.textContent = "GEOMETRY CONDITION";
      R.evidenceTitle.textContent = "方向夹角与误差放大";
      R.evidenceStatus.textContent = `κ=${condition > 999 ? ">999" : fmt(condition, 1)}`;
    } else {
      R.dataKicker.textContent = "INVERSE RESPONSE";
      R.dataTitle.textContent = "目标方向改变时的分力";
      R.dataStatus.textContent = invalid ? "存在负拉力" : `F₁=${fmt(f1, 2)}N`;
      R.evidenceKicker.textContent = "COMPONENT CLOSURE";
      R.evidenceTitle.textContent = "逆向分解的分量闭合";
      R.evidenceStatus.textContent = `κ=${fmt(condition, 2)}`;
    }

    drawMain(solution);
    drawResponse(solution);
    drawEvidence(solution);
  }

  function setMode(mode) {
    if (!MODES[mode]) return;
    state.mode = mode;
    if (mode === "boundary" && Math.abs(M.directionSeparation(state.direction1Deg, state.direction2Deg)) > 8) {
      Object.assign(state, PRESETS.collinear);
    }
    render();
  }
  function reset() {
    Object.assign(state, DEFAULT_STATE);
    [[R.components, "showComponents"], [R.parallelogram, "showParallelogram"], [R.values, "showValues"], [R.uncertainty, "showUncertainty"]]
      .forEach(([element, key]) => { element.checked = state[key]; });
    render();
  }
  function setState(next = {}) {
    Object.assign(state, M.normalize({ ...state, ...next }));
    if (MODES[next.mode]) state.mode = next.mode;
    if (["angle", "magnitude", "free"].includes(next.composeControl)) state.composeControl = next.composeControl;
    if (Number.isFinite(+next.guideStep)) state.guideStep = Math.round(clamp(+next.guideStep, 0, 2));
    ["showComponents", "showParallelogram", "showValues", "showUncertainty"].forEach((key) => {
      if (typeof next[key] === "boolean") state[key] = next[key];
    });
    state.dragging = false;
    state.dragRole = null;
    render();
  }

  [
    [R.force1, "force1N"], [R.force2, "force2N"], [R.force3, "force3N"],
    [R.direction1, "direction1Deg"], [R.direction2, "direction2Deg"], [R.direction3, "direction3Deg"],
    [R.target, "targetForceN"], [R.targetDirection, "targetDirectionDeg"],
    [R.forceResolution, "forceResolutionN"], [R.angleResolution, "angleResolutionDeg"],
    [R.noise, "readingNoise"], [R.seed, "seed"],
  ].forEach(([element, key]) => element.addEventListener("input", () => {
    const previous = state[key];
    state[key] = +element.value;
    if (state.mode === "compose" && state.composeControl === "magnitude" && key === "direction1Deg") {
      state.direction2Deg = clamp(state.direction2Deg + state.direction1Deg - previous, -170, 170);
    }
    if (state.mode === "compose" && state.composeControl === "magnitude" && key === "direction2Deg") {
      state.direction1Deg = clamp(state.direction1Deg + state.direction2Deg - previous, -170, 170);
    }
    render();
  }));
  [[R.components, "showComponents"], [R.parallelogram, "showParallelogram"], [R.values, "showValues"], [R.uncertainty, "showUncertainty"]]
    .forEach(([element, key]) => element.addEventListener("change", () => {
      state[key] = element.checked;
      render();
    }));
  R.composeControls.forEach((button) => button.addEventListener("click", () => {
    state.composeControl = button.dataset.composeControl;
    render();
  }));
  R.tabs.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
  R.route.forEach((button, index) => button.addEventListener("click", () => {
    state.guideStep = index;
    render();
  }));
  R.presets.forEach((button) => button.addEventListener("click", () => {
    Object.assign(state, PRESETS[button.dataset.preset]);
    render();
  }));
  R.reset.addEventListener("click", reset);
  R.guide.addEventListener("click", () => R.dialog.showModal());
  R.step.addEventListener("click", () => {
    state.guideStep = (state.guideStep + 1) % 3;
    render();
  });
  R.focus.addEventListener("click", () => {
    const active = document.body.classList.toggle("focus-mode");
    R.focus.setAttribute("aria-pressed", String(active));
  });
  R.fullscreen.addEventListener("click", () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());
  R.main.addEventListener("pointerdown", (event) => {
    const role = hitTest(pointerPoint(event));
    if (!role) return;
    state.dragRole = role;
    state.dragging = true;
    R.main.classList.add("is-dragging");
    R.main.setPointerCapture?.(event.pointerId);
    applyDrag(event);
  });
  R.main.addEventListener("pointermove", (event) => {
    if (state.dragging) applyDrag(event);
    else R.main.style.cursor = hitTest(pointerPoint(event)) ? "grab" : "default";
  });
  R.main.addEventListener("pointerup", () => {
    state.dragging = false;
    state.dragRole = null;
    R.main.classList.remove("is-dragging");
    render();
  });
  R.main.addEventListener("pointercancel", () => {
    state.dragging = false;
    state.dragRole = null;
    R.main.classList.remove("is-dragging");
    render();
  });
  window.addEventListener("resize", render);

  window.forceCompositionLab = {
    compose: M.compose,
    composeMany: M.composeMany,
    decompose: M.decompose,
    apparatus: M.apparatus,
    sensitivity: M.sensitivity,
    workEquivalence: M.workEquivalence,
    getState: () => ({ ...state }),
    getInteractionGeometry: () => state.mainGeometry ? {
      origin: state.mainGeometry.origin,
      scale: state.mainGeometry.scale,
      scaleReferenceN: state.mainGeometry.scaleReferenceN,
      handles: state.mainGeometry.handles,
    } : null,
    setState,
    setMode,
    reset,
  };
  render();
})();
