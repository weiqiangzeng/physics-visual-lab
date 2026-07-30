(function () {
  const refs = {
    canvas: document.getElementById("collisionCanvas"),
    momentumChart: document.getElementById("momentumChart"),
    energyChart: document.getElementById("energyChart"),
    mass1Input: document.getElementById("mass1Input"),
    velocity1Input: document.getElementById("velocity1Input"),
    mass2Input: document.getElementById("mass2Input"),
    velocity2Input: document.getElementById("velocity2Input"),
    restitutionInput: document.getElementById("restitutionInput"),
    timeInput: document.getElementById("timeInput"),
    mass1Value: document.getElementById("mass1Value"),
    velocity1Value: document.getElementById("velocity1Value"),
    mass2Value: document.getElementById("mass2Value"),
    velocity2Value: document.getElementById("velocity2Value"),
    restitutionValue: document.getElementById("restitutionValue"),
    restitutionNote: document.getElementById("restitutionNote"),
    timeValue: document.getElementById("timeValue"),
    momentumBeforeMetric: document.getElementById("momentumBeforeMetric"),
    momentumAfterMetric: document.getElementById("momentumAfterMetric"),
    energyBeforeMetric: document.getElementById("energyBeforeMetric"),
    energyAfterMetric: document.getElementById("energyAfterMetric"),
    conservationNature: document.getElementById("conservationNature"),
    conservationExplanation: document.getElementById("conservationExplanation"),
    momentumChartStatus: document.getElementById("momentumChartStatus"),
    energyChartStatus: document.getElementById("energyChartStatus"),
    modeTitle: document.getElementById("modeTitle"),
    modeGoal: document.getElementById("modeGoal"),
    stateBadge: document.getElementById("stateBadge"),
    stageHint: document.getElementById("stageHint"),
    stepIndex: document.getElementById("stepIndex"),
    stepTitle: document.getElementById("stepTitle"),
    stepPrompt: document.getElementById("stepPrompt"),
    formulaReadout: document.getElementById("formulaReadout"),
    playButton: document.getElementById("playButton"),
    pauseButton: document.getElementById("pauseButton"),
    collisionButton: document.getElementById("collisionButton"),
    resetButton: document.getElementById("resetButton"),
    guideButton: document.getElementById("guideButton"),
    stepButton: document.getElementById("stepButton"),
    focusButton: document.getElementById("focusButton"),
    fullscreenButton: document.getElementById("fullscreenButton"),
    guideDialog: document.getElementById("guideDialog"),
    showVelocityToggle: document.getElementById("showVelocityToggle"),
    showGhostsToggle: document.getElementById("showGhostsToggle"),
    showCenterToggle: document.getElementById("showCenterToggle"),
    showMomentumToggle: document.getElementById("showMomentumToggle"),
    sceneTabs: Array.from(document.querySelectorAll(".scene-tab[data-mode]")),
    routeSteps: Array.from(document.querySelectorAll(".route-step")),
    presetButtons: Array.from(document.querySelectorAll("[data-preset]"))
  };

  const context = refs.canvas.getContext("2d");
  const momentumContext = refs.momentumChart.getContext("2d");
  const energyContext = refs.energyChart.getContext("2d");
  const DURATION = 3.6;
  const COLLISION_TIME = 1.25;
  const COLORS = { a: "#64c7d9", b: "#f2b84b", total: "#69d18e", loss: "#ff7a68", center: "#b58ce5" };

  const modes = {
    elastic: { title: "弹性碰撞", goal: "总动量和总动能同时守恒", hint: "拖动小车上的速度箭头改变初速度", e: 1 },
    stick: { title: "完全非弹性碰撞", goal: "总动量守恒，但两车粘连并损失机械能", hint: "比较损失的动能与形变、内能", e: 0 },
    restitution: { title: "可调恢复系数", goal: "连续观察碰撞弹性程度如何改变能量保留率", hint: "拖动恢复系数，比较碰后速度", e: null },
    center: { title: "质心参考系", goal: "在总动量为零的参考系中观察动量重新分配", hint: "紫色标记在质心系中保持静止", e: 1 }
  };
  const guide = [
    { title: "先预测速度", prompt: "A 撞上更重的 B 后，A 会继续向前还是反弹？" },
    { title: "核对总动量", prompt: "比较碰撞前后两车动量之和，而不是只看其中一辆。" },
    { title: "追踪能量去向", prompt: "非弹性碰撞减少的机械能转化为形变、内能和声能。" }
  ];
  const presets = {
    equal: { m1: 1, m2: 1, u1: 4, u2: 0 },
    heavy: { m1: 1, m2: 3, u1: 4, u2: 0 },
    opposite: { m1: 2, m2: 1, u1: 3, u2: -2 }
  };
  const state = {
    m1: 1,
    m2: 2,
    u1: 4,
    u2: 0,
    e: 1,
    time: 0,
    running: false,
    mode: "elastic",
    guideStep: 0,
    showVelocity: true,
    showGhosts: true,
    showCenter: true,
    showMomentum: true,
    dragging: null,
    dragStartX: 0,
    dragStartVelocity: 0
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number(value)));
  }

  function fmt(value, digits = 2) {
    const safe = Math.abs(value) < 5e-10 ? 0 : value;
    return safe.toFixed(digits).replace("-", "−");
  }

  function solve(input = state) {
    const m1 = Number(input.m1);
    const m2 = Number(input.m2);
    const u1 = Number(input.u1);
    const u2 = Number(input.u2);
    const e = clamp(input.e, 0, 1);
    const approaching = u1 - u2 > 1e-8;
    const totalMass = m1 + m2;
    const momentum = m1 * u1 + m2 * u2;
    const centerVelocity = momentum / totalMass;
    const theoreticalV1 = (momentum - m2 * e * (u1 - u2)) / totalMass;
    const theoreticalV2 = (momentum + m1 * e * (u1 - u2)) / totalMass;
    const v1 = approaching ? theoreticalV1 : u1;
    const v2 = approaching ? theoreticalV2 : u2;
    const frameVelocity = input.mode === "center" ? centerVelocity : 0;
    const displayU1 = u1 - frameVelocity;
    const displayU2 = u2 - frameVelocity;
    const displayV1 = v1 - frameVelocity;
    const displayV2 = v2 - frameVelocity;
    const momentumBefore = m1 * displayU1 + m2 * displayU2;
    const momentumAfter = m1 * displayV1 + m2 * displayV2;
    const energyBefore = 0.5 * m1 * displayU1 ** 2 + 0.5 * m2 * displayU2 ** 2;
    const energyAfter = 0.5 * m1 * displayV1 ** 2 + 0.5 * m2 * displayV2 ** 2;
    const energyLoss = Math.max(0, energyBefore - energyAfter);
    const reducedMass = m1 * m2 / totalMass;
    const expectedLoss = approaching ? 0.5 * reducedMass * (1 - e ** 2) * (u1 - u2) ** 2 : 0;
    return {
      m1, m2, u1, u2, e, approaching, v1, v2, frameVelocity, centerVelocity,
      displayU1, displayU2, displayV1, displayV2,
      momentumBefore, momentumAfter, energyBefore, energyAfter, energyLoss, expectedLoss,
      momentumResidual: momentumAfter - momentumBefore,
      restitutionResidual: approaching ? (v2 - v1) - e * (u1 - u2) : 0
    };
  }

  function sampleAt(time = state.time, input = state) {
    const result = solve(input);
    const t = clamp(time, 0, DURATION);
    const frame = result.frameVelocity;
    if (!result.approaching) {
      return {
        ...result,
        time: t,
        phase: "separating",
        x1: -2.5 + (result.u1 - frame) * t,
        x2: 2.5 + (result.u2 - frame) * t,
        currentV1: result.displayU1,
        currentV2: result.displayU2,
        centerX: 0
      };
    }
    const x1Collision = -0.5;
    const x2Collision = 0.5;
    const x1Start = x1Collision - result.displayU1 * COLLISION_TIME;
    const x2Start = x2Collision - result.displayU2 * COLLISION_TIME;
    const before = t < COLLISION_TIME;
    return {
      ...result,
      time: t,
      phase: Math.abs(t - COLLISION_TIME) < 0.055 ? "contact" : before ? "before" : "after",
      x1: before ? x1Start + result.displayU1 * t : x1Collision + result.displayV1 * (t - COLLISION_TIME),
      x2: before ? x2Start + result.displayU2 * t : x2Collision + result.displayV2 * (t - COLLISION_TIME),
      currentV1: before ? result.displayU1 : result.displayV1,
      currentV2: before ? result.displayU2 : result.displayV2,
      centerX: input.mode === "center" ? 0 : result.centerVelocity * (t - COLLISION_TIME)
    };
  }

  function setCanvasSize(canvas, canvasContext) {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(320, Math.round(rect.width));
    const height = Math.max(180, Math.round(rect.height));
    if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
      canvas.width = width * ratio;
      canvas.height = height * ratio;
    }
    canvasContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { width, height };
  }

  function arrow(canvasContext, x1, y1, x2, y2, color, label) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const head = 8;
    canvasContext.strokeStyle = color;
    canvasContext.fillStyle = color;
    canvasContext.lineWidth = 2;
    canvasContext.beginPath();
    canvasContext.moveTo(x1, y1);
    canvasContext.lineTo(x2, y2);
    canvasContext.stroke();
    canvasContext.beginPath();
    canvasContext.moveTo(x2, y2);
    canvasContext.lineTo(x2 - head * Math.cos(angle - 0.55), y2 - head * Math.sin(angle - 0.55));
    canvasContext.lineTo(x2 - head * Math.cos(angle + 0.55), y2 - head * Math.sin(angle + 0.55));
    canvasContext.closePath();
    canvasContext.fill();
    if (label) {
      canvasContext.font = "10px ui-monospace, monospace";
      canvasContext.textAlign = "center";
      canvasContext.fillText(label, (x1 + x2) / 2, y1 - 8);
    }
  }

  function roundRect(canvasContext, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    canvasContext.beginPath();
    canvasContext.moveTo(x + r, y);
    canvasContext.arcTo(x + width, y, x + width, y + height, r);
    canvasContext.arcTo(x + width, y + height, x, y + height, r);
    canvasContext.arcTo(x, y + height, x, y, r);
    canvasContext.arcTo(x, y, x + width, y, r);
    canvasContext.closePath();
  }

  function worldRange(result) {
    const samples = [sampleAt(0), sampleAt(DURATION), sampleAt(COLLISION_TIME)];
    const values = samples.flatMap((entry) => [entry.x1, entry.x2]);
    const min = Math.min(...values, -3);
    const max = Math.max(...values, 3);
    const span = Math.max(7, max - min);
    return { min: min - span * 0.12, max: max + span * 0.12, result };
  }

  function drawCart(canvasContext, x, y, mass, velocity, color, label, alpha = 1, stuckSide = "") {
    const width = 48 + Math.sqrt(mass) * 9;
    const height = 30 + Math.sqrt(mass) * 5;
    canvasContext.save();
    canvasContext.globalAlpha = alpha;
    canvasContext.fillStyle = color;
    canvasContext.strokeStyle = alpha < 1 ? color : "rgba(240,241,232,.72)";
    canvasContext.lineWidth = 1;
    roundRect(canvasContext, x - width / 2, y - height, width, height, stuckSide ? 3 : 7);
    canvasContext.fill();
    canvasContext.stroke();
    canvasContext.fillStyle = "#111412";
    canvasContext.font = "700 11px ui-monospace, monospace";
    canvasContext.textAlign = "center";
    canvasContext.fillText(label, x, y - height / 2 + 4);
    [-width * 0.28, width * 0.28].forEach((offset) => {
      canvasContext.fillStyle = "#0b0d0c";
      canvasContext.beginPath();
      canvasContext.arc(x + offset, y + 5, 7, 0, Math.PI * 2);
      canvasContext.fill();
      canvasContext.strokeStyle = "rgba(240,241,232,.42)";
      canvasContext.stroke();
    });
    if (state.showVelocity && alpha === 1) {
      const length = Math.sign(velocity || 1) * Math.min(105, 18 + Math.abs(velocity) * 17);
      if (Math.abs(velocity) > 0.015) arrow(canvasContext, x, y - height - 18, x + length, y - height - 18, color, `${fmt(velocity)} m/s`);
      else {
        canvasContext.fillStyle = color;
        canvasContext.font = "10px ui-monospace, monospace";
        canvasContext.fillText("v = 0", x, y - height - 15);
      }
    }
    if (state.showMomentum && alpha === 1) {
      canvasContext.fillStyle = "rgba(240,241,232,.78)";
      canvasContext.font = "9px ui-monospace, monospace";
      canvasContext.fillText(`p = ${fmt(mass * velocity)} kg·m/s`, x, y + 25);
    }
    canvasContext.restore();
  }

  function drawScene() {
    const { width, height } = setCanvasSize(refs.canvas, context);
    const current = sampleAt();
    const range = worldRange(current);
    const left = 28;
    const right = 22;
    const trackY = Math.round(height * 0.68);
    const mapX = (value) => left + (value - range.min) / (range.max - range.min) * (width - left - right);
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#0c0f0e";
    context.fillRect(0, 0, width, height);

    context.strokeStyle = "rgba(238,241,230,.055)";
    context.lineWidth = 1;
    for (let x = 0; x < width; x += 36) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }
    for (let y = 0; y < height; y += 36) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }

    context.fillStyle = "#171b18";
    context.fillRect(0, trackY + 9, width, height - trackY - 9);
    context.strokeStyle = "rgba(238,241,230,.35)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, trackY + 9);
    context.lineTo(width, trackY + 9);
    context.stroke();
    for (let x = 12; x < width; x += 42) {
      context.strokeStyle = "rgba(238,241,230,.12)";
      context.beginPath();
      context.moveTo(x, trackY + 13);
      context.lineTo(x - 14, height);
      context.stroke();
    }

    if (state.showGhosts && current.approaching) {
      const before = sampleAt(0);
      const after = sampleAt(DURATION);
      drawCart(context, mapX(before.x1), trackY, state.m1, before.currentV1, COLORS.a, "A", 0.16);
      drawCart(context, mapX(before.x2), trackY, state.m2, before.currentV2, COLORS.b, "B", 0.16);
      drawCart(context, mapX(after.x1), trackY, state.m1, after.currentV1, COLORS.a, "A", 0.12);
      drawCart(context, mapX(after.x2), trackY, state.m2, after.currentV2, COLORS.b, "B", 0.12);
    }

    if (state.showCenter) {
      const centerX = mapX(current.centerX);
      context.strokeStyle = COLORS.center;
      context.setLineDash([5, 5]);
      context.beginPath();
      context.moveTo(centerX, 35);
      context.lineTo(centerX, trackY + 10);
      context.stroke();
      context.setLineDash([]);
      context.fillStyle = COLORS.center;
      context.beginPath();
      context.moveTo(centerX, 30);
      context.lineTo(centerX - 6, 18);
      context.lineTo(centerX + 6, 18);
      context.closePath();
      context.fill();
      context.font = "9px ui-monospace, monospace";
      context.textAlign = "center";
      context.fillText(state.mode === "center" ? "质心系原点" : `质心 v = ${fmt(current.centerVelocity)} m/s`, centerX, 48);
    }

    const stuck = current.phase === "after" && current.e < 0.001;
    drawCart(context, mapX(current.x1), trackY, state.m1, current.currentV1, COLORS.a, "A", 1, stuck ? "right" : "");
    drawCart(context, mapX(current.x2), trackY, state.m2, current.currentV2, COLORS.b, "B", 1, stuck ? "left" : "");

    if (current.phase === "contact") {
      const collisionX = (mapX(current.x1) + mapX(current.x2)) / 2;
      const pulse = 20 + Math.abs(state.time - COLLISION_TIME) * 260;
      context.strokeStyle = COLORS.loss;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(collisionX, trackY - 24, pulse, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = COLORS.loss;
      context.font = "700 10px ui-monospace, monospace";
      context.fillText("内部冲量成对出现", collisionX, trackY - 66);
    }

    context.fillStyle = "rgba(240,241,232,.75)";
    context.textAlign = "left";
    context.font = "10px ui-monospace, monospace";
    context.fillText(state.mode === "center" ? "参考系：质心系" : "参考系：实验室地面", 18, 22);
    context.fillStyle = current.approaching ? COLORS.total : COLORS.b;
    context.fillText(current.approaching ? `统一碰撞时刻 t = ${fmt(COLLISION_TIME)} s` : "u₁ ≤ u₂：两车不会接近碰撞", 18, height - 14);
  }

  function drawMomentumChart() {
    const { width, height } = setCanvasSize(refs.momentumChart, momentumContext);
    const result = solve();
    const before = [result.m1 * result.displayU1, result.m2 * result.displayU2];
    const after = [result.m1 * result.displayV1, result.m2 * result.displayV2];
    const values = [...before, ...after, result.momentumBefore, result.momentumAfter];
    const maxAbs = Math.max(1, ...values.map((value) => Math.abs(value))) * 1.18;
    const padding = { l: 45, r: 18, t: 22, b: 30 };
    const baseline = padding.t + (height - padding.t - padding.b) / 2;
    const y = (value) => baseline - value / maxAbs * (height - padding.t - padding.b) / 2;
    momentumContext.clearRect(0, 0, width, height);
    momentumContext.fillStyle = "#111512";
    momentumContext.fillRect(0, 0, width, height);
    momentumContext.strokeStyle = "rgba(238,241,230,.18)";
    momentumContext.beginPath();
    momentumContext.moveTo(padding.l, baseline);
    momentumContext.lineTo(width - padding.r, baseline);
    momentumContext.stroke();
    momentumContext.fillStyle = "#7f8a83";
    momentumContext.font = "9px ui-monospace, monospace";
    momentumContext.textAlign = "left";
    momentumContext.fillText("p / (kg·m/s)", padding.l, 12);
    momentumContext.textAlign = "right";
    momentumContext.fillText(fmt(maxAbs, 1), padding.l - 5, padding.t + 3);
    momentumContext.fillText(fmt(-maxAbs, 1), padding.l - 5, height - padding.b);

    const groups = [
      { label: "碰撞前", values: before, total: result.momentumBefore },
      { label: "碰撞后", values: after, total: result.momentumAfter }
    ];
    groups.forEach((group, groupIndex) => {
      const center = padding.l + (width - padding.l - padding.r) * (groupIndex === 0 ? 0.28 : 0.72);
      group.values.forEach((value, index) => {
        const barX = center + (index === 0 ? -28 : 8);
        const top = Math.min(baseline, y(value));
        const barHeight = Math.max(1, Math.abs(y(value) - baseline));
        momentumContext.fillStyle = index === 0 ? COLORS.a : COLORS.b;
        momentumContext.fillRect(barX, top, 20, barHeight);
        momentumContext.fillStyle = "rgba(240,241,232,.84)";
        momentumContext.font = "8px ui-monospace, monospace";
        momentumContext.textAlign = "center";
        momentumContext.fillText(index === 0 ? "p₁" : "p₂", barX + 10, height - 19);
      });
      momentumContext.fillStyle = COLORS.total;
      momentumContext.font = "700 9px ui-monospace, monospace";
      momentumContext.textAlign = "center";
      momentumContext.fillText(`Σp = ${fmt(group.total)}`, center, height - 6);
      momentumContext.fillStyle = "rgba(240,241,232,.68)";
      momentumContext.fillText(group.label, center, 14);
    });
  }

  function energyAtRestitution(e) {
    return solve({ ...state, e }).energyAfter;
  }

  function drawEnergyChart() {
    const { width, height } = setCanvasSize(refs.energyChart, energyContext);
    const result = solve();
    const padding = { l: 42, r: 15, t: 18, b: 31 };
    const plotWidth = width - padding.l - padding.r;
    const plotHeight = height - padding.t - padding.b;
    const denominator = Math.max(result.energyBefore, 1e-9);
    const x = (value) => padding.l + value * plotWidth;
    const y = (value) => padding.t + (1.05 - value) / 1.05 * plotHeight;
    energyContext.clearRect(0, 0, width, height);
    energyContext.fillStyle = "#111512";
    energyContext.fillRect(0, 0, width, height);
    energyContext.strokeStyle = "rgba(238,241,230,.13)";
    energyContext.fillStyle = "#7f8a83";
    energyContext.font = "9px ui-monospace, monospace";
    for (let i = 0; i <= 4; i += 1) {
      const gx = padding.l + plotWidth * i / 4;
      const gy = padding.t + plotHeight * i / 4;
      energyContext.beginPath();
      energyContext.moveTo(gx, padding.t);
      energyContext.lineTo(gx, padding.t + plotHeight);
      energyContext.stroke();
      energyContext.beginPath();
      energyContext.moveTo(padding.l, gy);
      energyContext.lineTo(padding.l + plotWidth, gy);
      energyContext.stroke();
      energyContext.textAlign = "center";
      energyContext.fillText((i / 4).toFixed(2), gx, height - 10);
    }
    energyContext.textAlign = "left";
    energyContext.fillText("K₁ / K₀", padding.l, 10);
    energyContext.textAlign = "right";
    energyContext.fillText("恢复系数 e", width - 5, height - 10);
    energyContext.strokeStyle = COLORS.total;
    energyContext.lineWidth = 2.2;
    energyContext.beginPath();
    for (let i = 0; i <= 100; i += 1) {
      const e = i / 100;
      const ratio = state.u1 > state.u2 ? energyAtRestitution(e) / denominator : 1;
      if (i === 0) energyContext.moveTo(x(e), y(ratio));
      else energyContext.lineTo(x(e), y(ratio));
    }
    energyContext.stroke();
    const ratio = result.energyAfter / denominator;
    energyContext.fillStyle = COLORS.loss;
    energyContext.beginPath();
    energyContext.arc(x(result.e), y(ratio), 5, 0, Math.PI * 2);
    energyContext.fill();
    energyContext.strokeStyle = "rgba(255,122,104,.46)";
    energyContext.setLineDash([4, 4]);
    energyContext.beginPath();
    energyContext.moveTo(x(result.e), y(ratio));
    energyContext.lineTo(x(result.e), padding.t + plotHeight);
    energyContext.stroke();
    energyContext.setLineDash([]);
  }

  function stateInfo(result) {
    if (!result.approaching) return { label: "不会碰撞", cls: "is-invalid", nature: "没有碰撞事件", explanation: "当前 u₁ ≤ u₂，两车间距不会缩小" };
    if (Math.abs(state.time - COLLISION_TIME) < 0.055) return { label: "接触冲量", cls: "is-contact", nature: "内力冲量成对", explanation: "系统总动量在短碰撞过程中保持不变" };
    if (state.time < COLLISION_TIME) return { label: "碰撞前", cls: "", nature: "记录初态", explanation: "先预测碰后速度，再推进到接触时刻" };
    return { label: "碰撞后", cls: "is-after", nature: `ΔP = ${fmt(result.momentumResidual, 3)}`, explanation: result.e > 0.999 ? "弹性碰撞中 ΔK = 0" : `机械能减少 ${fmt(result.energyLoss)} J，转化为内能等` };
  }

  function setProgress(input) {
    const progress = (Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100;
    input.style.setProperty("--range-progress", `${progress}%`);
  }

  function syncUI() {
    const result = solve();
    const info = stateInfo(result);
    const mode = modes[state.mode];
    const task = guide[state.guideStep];
    const energyRatio = result.energyBefore > 1e-9 ? result.energyAfter / result.energyBefore : 1;
    refs.mass1Value.textContent = `${fmt(state.m1)} kg`;
    refs.velocity1Value.textContent = `${fmt(state.u1)} m/s`;
    refs.mass2Value.textContent = `${fmt(state.m2)} kg`;
    refs.velocity2Value.textContent = `${fmt(state.u2)} m/s`;
    refs.restitutionValue.textContent = fmt(state.e);
    refs.timeValue.textContent = `t = ${fmt(state.time)} s`;
    refs.momentumBeforeMetric.textContent = `${fmt(result.momentumBefore)} kg·m/s`;
    refs.momentumAfterMetric.textContent = `${fmt(result.momentumAfter)} kg·m/s`;
    refs.energyBeforeMetric.textContent = `${fmt(result.energyBefore)} J`;
    refs.energyAfterMetric.textContent = `${fmt(result.energyAfter)} J`;
    refs.conservationNature.textContent = info.nature;
    refs.conservationExplanation.textContent = info.explanation;
    refs.momentumChartStatus.textContent = result.approaching ? `总动量保持 ${fmt(result.momentumBefore)} kg·m/s` : "当前没有碰撞事件";
    refs.energyChartStatus.textContent = `K₁ / K₀ = ${fmt(energyRatio * 100, 1)}%`;
    refs.modeTitle.textContent = mode.title;
    refs.modeGoal.textContent = mode.goal;
    refs.stateBadge.textContent = info.label;
    refs.stateBadge.className = `state-badge ${info.cls}`.trim();
    refs.stageHint.textContent = mode.hint;
    refs.stepIndex.textContent = `0${state.guideStep + 1}`;
    refs.stepTitle.textContent = task.title;
    refs.stepPrompt.textContent = task.prompt;
    refs.formulaReadout.textContent = result.approaching ? `v₁ = ${fmt(result.v1)} m/s，v₂ = ${fmt(result.v2)} m/s` : "u₁ ≤ u₂，两车不会发生追及碰撞";
    refs.playButton.textContent = state.running ? "播放中…" : "▶ 播放";
    refs.playButton.setAttribute("aria-pressed", String(state.running));
    refs.collisionButton.disabled = !result.approaching;
    refs.restitutionInput.disabled = mode.e !== null;
    refs.restitutionNote.textContent = mode.e === null ? "拖动 e 连续改变碰撞弹性程度" : mode.e === 1 ? "该场景固定 e = 1" : "该场景固定 e = 0";
    refs.restitutionInput.closest(".restitution-control").classList.toggle("is-locked", mode.e !== null);
    refs.sceneTabs.forEach((button) => button.classList.toggle("is-active", button.dataset.mode === state.mode));
    refs.routeSteps.forEach((button, index) => button.classList.toggle("is-active", index === state.guideStep));
    refs.presetButtons.forEach((button) => {
      const preset = presets[button.dataset.preset];
      button.classList.toggle("is-active", preset && ["m1", "m2", "u1", "u2"].every((key) => Math.abs(state[key] - preset[key]) < 0.01));
    });
    refs.mass1Input.value = state.m1;
    refs.velocity1Input.value = state.u1;
    refs.mass2Input.value = state.m2;
    refs.velocity2Input.value = state.u2;
    refs.restitutionInput.value = state.e;
    refs.timeInput.value = state.time;
    [refs.mass1Input, refs.velocity1Input, refs.mass2Input, refs.velocity2Input, refs.restitutionInput, refs.timeInput].forEach(setProgress);
  }

  function render() {
    drawScene();
    drawMomentumChart();
    drawEnergyChart();
    syncUI();
  }

  function setState(patch) {
    if (patch.m1 !== undefined) state.m1 = clamp(patch.m1, 0.5, 5);
    if (patch.m2 !== undefined) state.m2 = clamp(patch.m2, 0.5, 5);
    if (patch.u1 !== undefined) state.u1 = clamp(patch.u1, -2, 6);
    if (patch.u2 !== undefined) state.u2 = clamp(patch.u2, -4, 4);
    if (patch.e !== undefined) state.e = clamp(patch.e, 0, 1);
    if (patch.time !== undefined) state.time = clamp(patch.time, 0, DURATION);
    if (patch.running !== undefined) state.running = Boolean(patch.running);
    render();
  }

  function setMode(modeName) {
    if (!modes[modeName]) return;
    state.mode = modeName;
    state.running = false;
    state.time = 0;
    if (modes[modeName].e !== null) state.e = modes[modeName].e;
    if (modeName === "elastic") Object.assign(state, { m1: 1, m2: 2, u1: 4, u2: 0 });
    if (modeName === "stick") Object.assign(state, { m1: 1, m2: 2, u1: 4, u2: 0 });
    if (modeName === "restitution") Object.assign(state, { m1: 1, m2: 2, u1: 4, u2: 0, e: 0.6 });
    if (modeName === "center") Object.assign(state, { m1: 1, m2: 1, u1: 3, u2: -1, e: 1 });
    render();
  }

  [[refs.mass1Input, "m1"], [refs.velocity1Input, "u1"], [refs.mass2Input, "m2"], [refs.velocity2Input, "u2"]].forEach(([input, key]) => {
    input.addEventListener("input", () => setState({ [key]: input.value, time: 0, running: false }));
  });
  refs.restitutionInput.addEventListener("input", () => setState({ e: refs.restitutionInput.value, time: 0, running: false }));
  refs.timeInput.addEventListener("input", () => setState({ time: refs.timeInput.value, running: false }));
  refs.sceneTabs.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
  refs.routeSteps.forEach((button, index) => button.addEventListener("click", () => { state.guideStep = index; render(); }));
  refs.presetButtons.forEach((button) => button.addEventListener("click", () => {
    Object.assign(state, presets[button.dataset.preset], { time: 0, running: false });
    render();
  }));
  refs.playButton.addEventListener("click", () => setState({ running: true }));
  refs.pauseButton.addEventListener("click", () => setState({ running: false }));
  refs.collisionButton.addEventListener("click", () => setState({ time: COLLISION_TIME, running: false }));
  refs.resetButton.addEventListener("click", () => {
    Object.assign(state, { m1: 1, m2: 2, u1: 4, u2: 0, e: 1, time: 0, running: false, mode: "elastic", guideStep: 0, showVelocity: true, showGhosts: true, showCenter: true, showMomentum: true });
    [refs.showVelocityToggle, refs.showGhostsToggle, refs.showCenterToggle, refs.showMomentumToggle].forEach((input) => { input.checked = true; });
    render();
  });
  [[refs.showVelocityToggle, "showVelocity"], [refs.showGhostsToggle, "showGhosts"], [refs.showCenterToggle, "showCenter"], [refs.showMomentumToggle, "showMomentum"]].forEach(([input, key]) => {
    input.addEventListener("change", () => { state[key] = input.checked; render(); });
  });
  refs.guideButton.addEventListener("click", () => refs.guideDialog.showModal());
  refs.stepButton.addEventListener("click", () => { state.guideStep = (state.guideStep + 1) % guide.length; render(); });
  refs.focusButton.addEventListener("click", () => {
    const active = document.body.classList.toggle("focus-mode");
    refs.focusButton.setAttribute("aria-pressed", String(active));
  });
  refs.fullscreenButton.addEventListener("click", () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());

  function pointerCart(event) {
    const rect = refs.canvas.getBoundingClientRect();
    const range = worldRange(solve());
    const mapX = (value) => 28 + (value - range.min) / (range.max - range.min) * (rect.width - 50);
    const current = sampleAt();
    const localX = event.clientX - rect.left;
    return Math.abs(localX - mapX(current.x1)) <= Math.abs(localX - mapX(current.x2)) ? "u1" : "u2";
  }
  refs.canvas.addEventListener("pointerdown", (event) => {
    state.dragging = pointerCart(event);
    state.dragStartX = event.clientX;
    state.dragStartVelocity = state[state.dragging];
    state.time = 0;
    state.running = false;
    refs.canvas.setPointerCapture(event.pointerId);
    render();
  });
  refs.canvas.addEventListener("pointermove", (event) => {
    if (!state.dragging) return;
    const delta = (event.clientX - state.dragStartX) / Math.max(260, refs.canvas.getBoundingClientRect().width) * 10;
    const limits = state.dragging === "u1" ? [-2, 6] : [-4, 4];
    state[state.dragging] = clamp(state.dragStartVelocity + delta, ...limits);
    render();
  });
  refs.canvas.addEventListener("pointerup", (event) => {
    state.dragging = null;
    refs.canvas.releasePointerCapture(event.pointerId);
  });
  refs.canvas.addEventListener("pointercancel", () => { state.dragging = null; });
  window.addEventListener("resize", render);

  let lastFrame = performance.now();
  function frame(now) {
    const delta = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    if (state.running) {
      state.time += delta;
      if (state.time >= DURATION) {
        state.time = DURATION;
        state.running = false;
      }
      render();
    }
    requestAnimationFrame(frame);
  }

  window.collisionLab = {
    solve: (input = {}) => solve({ ...state, ...input }),
    sampleAt: (time, input = {}) => sampleAt(time, { ...state, ...input }),
    getState: () => ({ ...state }),
    setState,
    setMode
  };
  render();
  requestAnimationFrame(frame);
})();
