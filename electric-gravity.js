(function () {
  "use strict";
  const M = window.ElectricGravityModel;
  if (!M) throw new Error("ElectricGravityModel is required");

  const MODES = {
    balance: { title: "悬浮平衡", goal: "电场力在什么条件下恰好抵消重力", hint: "拖动时间或调节电场" },
    trajectory: { title: "带电类平抛", goal: "同一粒子如何同时完成水平匀速和竖直匀变速", hint: "拖动时间读取分运动" },
    measure: { title: "反演电荷", goal: "怎样用质量和悬浮电场测出未知电荷", hint: "点击平衡值后核对" },
    compare: { title: "关场对照", goal: "关闭电场后轨迹为什么立刻向自由落体偏离", hint: "比较青色与黄色轨迹" }
  };
  const STEPS = [
    ["先画受力", "正负电荷受到的电场力方向分别怎样判断？"],
    ["再判运动", "合力方向与速度方向不同时，轨迹如何弯曲？"],
    ["最后反演", "只知道悬浮电场和质量，能否确定电荷正负？"]
  ];
  const state = {
    mode: "balance", massNg: 1, chargeFc: .5, fieldKvM: 19.6, startHeight: 1.5,
    initialVx: 0, initialVy: 0, gravity: 9.8, time: 0, running: false,
    guideStep: 0, showForces: true, showTrail: true, showCompare: true, showEnergy: true,
    dragging: false
  };
  const $ = (id) => document.getElementById(id);
  const R = {
    motion: $("motionCanvas"), acceleration: $("accelerationChart"), height: $("heightChart"),
    massInput: $("massInput"), chargeInput: $("chargeInput"), fieldInput: $("fieldInput"),
    heightInput: $("heightInput"), vxInput: $("vxInput"), vyInput: $("vyInput"), timeInput: $("timeInput"),
    massValue: $("massValue"), chargeValue: $("chargeValue"), fieldValue: $("fieldValue"),
    heightValue: $("heightValue"), vxValue: $("vxValue"), vyValue: $("vyValue"), timeValue: $("timeValue"),
    timeMetric: $("timeMetric"), electricMetric: $("electricMetric"), weightMetric: $("weightMetric"),
    accelerationMetric: $("accelerationMetric"), chargeMetric: $("chargeMetric"), positionMetric: $("positionMetric"),
    natureText: $("natureText"), explanationText: $("explanationText"), forceStatus: $("forceStatus"),
    heightStatus: $("heightStatus"), modeTitle: $("modeTitle"), modeGoal: $("modeGoal"),
    stateBadge: $("stateBadge"), stageHint: $("stageHint"), stepIndex: $("stepIndex"),
    stepTitle: $("stepTitle"), stepPrompt: $("stepPrompt"), formulaReadout: $("formulaReadout"),
    playButton: $("playButton"), pauseButton: $("pauseButton"), keyButton: $("keyButton"),
    resetButton: $("resetButton"), guideButton: $("guideButton"), stepButton: $("stepButton"),
    focusButton: $("focusButton"), fullscreenButton: $("fullscreenButton"), guideDialog: $("guideDialog"),
    forceToggle: $("showForcesToggle"), trailToggle: $("showTrailToggle"),
    compareToggle: $("showCompareToggle"), energyToggle: $("showEnergyToggle"),
    tabs: [...document.querySelectorAll(".scene-tab[data-mode]")],
    routeSteps: [...document.querySelectorAll(".route-step")]
  };
  const ctx = R.motion.getContext("2d");
  const actx = R.acceleration.getContext("2d");
  const hctx = R.height.getContext("2d");
  const C = { bg: "#070b0c", grid: "rgba(223,229,223,.06)", cyan: "#64c7d9", amber: "#f0b951", violet: "#b58ce5", red: "#ff786e", green: "#79d992", text: "#a6b0a9", muted: "#717b75" };
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));
  const fmt = (value, digits = 2) => Number(value).toFixed(digits).replace("-", "−");
  const input = () => ({ ...state });

  function canvasSize(canvas, context, minHeight = 180) {
    const rect = canvas.getBoundingClientRect();
    const density = Math.min(devicePixelRatio || 1, 2);
    const width = Math.max(280, Math.round(rect.width));
    const height = Math.max(minHeight, Math.round(rect.height));
    if (canvas.width !== width * density || canvas.height !== height * density) {
      canvas.width = width * density;
      canvas.height = height * density;
    }
    context.setTransform(density, 0, 0, density, 0, 0);
    return { width, height };
  }

  function line(context, x1, y1, x2, y2, color, width = 1, dash = []) {
    context.save(); context.strokeStyle = color; context.lineWidth = width; context.setLineDash(dash);
    context.beginPath(); context.moveTo(x1, y1); context.lineTo(x2, y2); context.stroke(); context.restore();
  }

  function text(context, value, x, y, color = C.text, size = 10, align = "left", weight = 500) {
    context.fillStyle = color; context.font = `${weight} ${size}px ui-sans-serif,system-ui`;
    context.textAlign = align; context.fillText(value, x, y);
  }

  function background(context, width, height) {
    context.fillStyle = C.bg; context.fillRect(0, 0, width, height);
    for (let x = 18; x < width; x += 42) line(context, x, 0, x, height, C.grid);
    for (let y = 18; y < height; y += 42) line(context, 0, y, width, y, C.grid);
  }

  function arrow(context, x1, y1, x2, y2, color, label) {
    line(context, x1, y1, x2, y2, color, 2);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    context.fillStyle = color; context.beginPath(); context.moveTo(x2, y2);
    context.lineTo(x2 - 8 * Math.cos(angle - .5), y2 - 8 * Math.sin(angle - .5));
    context.lineTo(x2 - 8 * Math.cos(angle + .5), y2 - 8 * Math.sin(angle + .5)); context.fill();
    text(context, label, x2 + 8, y2 - 5, color, 10, "left", 700);
  }

  function duration() {
    const charged = M.impactTime(input());
    const off = M.impactTime({ ...input(), fieldKvM: 0 });
    const finite = [charged, off].filter(Number.isFinite);
    return clamp(finite.length ? Math.max(...finite) * 1.15 : 4, 2, 8);
  }

  function drawMotion() {
    const size = canvasSize(R.motion, ctx, 270);
    const current = M.stateAt(state.time, input());
    const end = duration();
    const samples = M.series(input(), end, 150);
    const maxX = Math.max(5, ...samples.map((sample) => sample.charged.x), ...samples.map((sample) => sample.fieldOff.x));
    const maxY = Math.max(4, state.startHeight + 1, ...samples.map((sample) => sample.charged.y), ...samples.map((sample) => sample.fieldOff.y));
    const mapX = (x) => 55 + x / maxX * (size.width - 110);
    const mapY = (y) => size.height - 45 - y / maxY * (size.height - 85);
    background(ctx, size.width, size.height);
    line(ctx, 42, mapY(0), size.width - 35, mapY(0), "rgba(223,229,223,.35)", 4);
    if (Math.abs(state.fieldKvM) > .01) {
      for (let x = 80; x < size.width - 50; x += 78) arrow(ctx, x, size.height - 58, x, 60, "rgba(100,199,217,.28)", "");
      text(ctx, state.fieldKvM > 0 ? "E ↑" : "E ↓", size.width - 42, 55, C.cyan, 11, "right", 800);
    }
    const drawPath = (key, color, dash = []) => {
      ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash(dash); ctx.beginPath();
      samples.forEach((sample, index) => {
        const point = sample[key]; const x = mapX(point.x); const y = mapY(Math.max(0, point.y));
        index ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }); ctx.stroke(); ctx.restore();
    };
    if (state.showTrail) drawPath("charged", C.cyan);
    if ((state.mode === "compare" || state.showCompare) && state.showTrail) drawPath("fieldOff", C.amber, [6, 5]);
    const px = mapX(current.x), py = mapY(current.y);
    ctx.fillStyle = "rgba(100,199,217,.18)"; ctx.beginPath(); ctx.arc(px, py, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.cyan; ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.fill();
    text(ctx, state.chargeFc >= 0 ? "+q" : "−q", px, py - 15, C.cyan, 10, "center", 800);
    if (state.showForces && !current.landed) {
      const electricLength = clamp(Math.abs(current.electricForceN) * 3e12, 20, 75);
      const weightLength = clamp(current.weightN * 3e12, 20, 75);
      const electricDirection = Math.sign(current.electricForceN) || 1;
      arrow(ctx, px + 12, py, px + 12, py - electricDirection * electricLength, C.violet, "qE");
      arrow(ctx, px - 12, py, px - 12, py + weightLength, C.amber, "mg");
    }
    if (state.mode === "compare") {
      const off = M.stateAt(state.time, { ...input(), fieldKvM: 0 });
      const ox = mapX(off.x), oy = mapY(off.y);
      ctx.fillStyle = C.amber; ctx.beginPath(); ctx.arc(ox, oy, 6, 0, Math.PI * 2); ctx.fill();
      text(ctx, "关场", ox, oy - 14, C.amber, 9, "center", 700);
    }
    if (state.showEnergy) {
      const residualPj = current.energyResidualJ * 1e12;
      text(ctx, `功—能残差 ${fmt(residualPj, 4)} pJ`, size.width - 42, size.height - 18, Math.abs(residualPj) < 1e-6 ? C.green : C.red, 9, "right", 700);
    }
  }

  function axes(context, size, xMin, xMax, yMin, yMax, xLabel, yLabel) {
    const pad = { left: 46, right: 18, top: 20, bottom: 32 };
    const x = (value) => pad.left + (value - xMin) / (xMax - xMin) * (size.width - pad.left - pad.right);
    const y = (value) => size.height - pad.bottom - (value - yMin) / (yMax - yMin) * (size.height - pad.top - pad.bottom);
    line(context, pad.left, pad.top, pad.left, size.height - pad.bottom, "rgba(223,229,223,.3)");
    line(context, pad.left, size.height - pad.bottom, size.width - pad.right, size.height - pad.bottom, "rgba(223,229,223,.3)");
    text(context, xLabel, size.width - pad.right, size.height - 5, C.muted, 8, "right");
    text(context, yLabel, 6, 13, C.muted, 8);
    return { x, y, pad };
  }

  function drawCharts() {
    let size = canvasSize(R.acceleration, actx);
    background(actx, size.width, size.height);
    const points = Array.from({ length: 121 }, (_, index) => {
      const fieldKvM = -50 + 100 * index / 120;
      return M.parameters({ ...input(), fieldKvM });
    });
    const maxA = Math.max(15, ...points.map((point) => Math.abs(point.accelerationY))) * 1.05;
    let map = axes(actx, size, -50, 50, -maxA, maxA, "E / kV·m⁻¹", "aᵧ / m·s⁻²");
    line(actx, map.x(-50), map.y(0), map.x(50), map.y(0), "rgba(223,229,223,.18)", 1, [4, 4]);
    actx.strokeStyle = C.cyan; actx.lineWidth = 2; actx.beginPath();
    points.forEach((point, index) => index ? actx.lineTo(map.x(point.fieldKvM), map.y(point.accelerationY)) : actx.moveTo(map.x(point.fieldKvM), map.y(point.accelerationY))); actx.stroke();
    const current = M.parameters(input());
    actx.fillStyle = C.green; actx.beginPath(); actx.arc(map.x(current.fieldKvM), map.y(current.accelerationY), 6, 0, Math.PI * 2); actx.fill();
    if (Number.isFinite(current.balanceFieldKvM) && Math.abs(current.balanceFieldKvM) <= 50) {
      line(actx, map.x(current.balanceFieldKvM), map.pad.top, map.x(current.balanceFieldKvM), size.height - map.pad.bottom, C.green, 1, [4, 4]);
    }

    size = canvasSize(R.height, hctx);
    background(hctx, size.width, size.height);
    const end = duration();
    const series = M.series(input(), end, 180);
    const maxY = Math.max(3, ...series.map((point) => point.charged.y), ...series.map((point) => point.fieldOff.y)) * 1.1;
    map = axes(hctx, size, 0, end, 0, maxY, "t / s", "y / m");
    const plot = (key, color, dash = []) => {
      hctx.save(); hctx.strokeStyle = color; hctx.lineWidth = 2; hctx.setLineDash(dash); hctx.beginPath();
      series.forEach((point, index) => index ? hctx.lineTo(map.x(point.time), map.y(point[key].y)) : hctx.moveTo(map.x(point.time), map.y(point[key].y))); hctx.stroke(); hctx.restore();
    };
    plot("charged", C.cyan);
    if (state.showCompare || state.mode === "compare") plot("fieldOff", C.amber, [5, 5]);
    line(hctx, map.x(state.time), map.pad.top, map.x(state.time), size.height - map.pad.bottom, C.green, 1, [4, 4]);
  }

  function setRange(element, value) {
    element.value = value;
    element.style.setProperty("--range-progress", `${(value - Number(element.min)) / (Number(element.max) - Number(element.min)) * 100}%`);
  }

  function render() {
    const current = M.stateAt(state.time, input());
    const inferred = M.inferCharge(input());
    const mode = MODES[state.mode];
    const end = duration();
    state.time = clamp(state.time, 0, end); R.timeInput.max = end;
    R.modeTitle.textContent = mode.title; R.modeGoal.textContent = mode.goal; R.stageHint.textContent = mode.hint;
    const balanced = Math.abs(current.accelerationY) < .03;
    const rising = current.accelerationY > .03;
    R.stateBadge.textContent = current.landed ? "已落地" : balanced ? "受力平衡" : rising ? "向上加速" : "向下加速";
    R.stateBadge.className = `state-badge ${current.landed ? "is-landed" : rising ? "is-rising" : balanced ? "" : "is-falling"}`;
    R.massValue.textContent = `${fmt(state.massNg)} ng`; R.chargeValue.textContent = `${fmt(state.chargeFc)} fC`;
    R.fieldValue.textContent = `${fmt(state.fieldKvM, 1)} kV/m`; R.heightValue.textContent = `${fmt(state.startHeight)} m`;
    R.vxValue.textContent = `${fmt(state.initialVx)} m/s`; R.vyValue.textContent = `${fmt(state.initialVy)} m/s`; R.timeValue.textContent = `${fmt(state.time)} s`;
    R.timeMetric.textContent = `${fmt(state.time)} s`; R.electricMetric.textContent = `${fmt(current.electricForceN * 1e12)} pN`;
    R.weightMetric.textContent = `${fmt(current.weightN * 1e12)} pN`; R.accelerationMetric.textContent = `${fmt(current.accelerationY)} m/s²`;
    R.chargeMetric.textContent = Number.isFinite(inferred.chargeFc) ? `${fmt(inferred.chargeFc)} fC` : "场为零";
    R.positionMetric.textContent = `${fmt(current.y)} m`; R.forceStatus.textContent = `aᵧ=${fmt(current.accelerationY)} m/s²`;
    R.heightStatus.textContent = current.landed ? `落地 t=${fmt(current.impactTime)}s` : balanced ? "悬浮高度不变" : rising ? "轨迹向上弯曲" : "轨迹向下弯曲";
    R.natureText.textContent = current.landed ? "粒子已与地面接触" : balanced ? "电场力与重力等大反向" : rising ? "电场力占优" : "重力占优";
    R.explanationText.textContent = current.landed ? "理想自由飞行模型在碰撞处终止" : `qE−mg=${fmt(current.netForceYN * 1e12)} pN`;
    R.stepIndex.textContent = String(state.guideStep + 1).padStart(2, "0"); R.stepTitle.textContent = STEPS[state.guideStep][0]; R.stepPrompt.textContent = STEPS[state.guideStep][1];
    R.formulaReadout.textContent = state.mode === "measure" ? `q=mg/E=${Number.isFinite(inferred.chargeFc) ? fmt(inferred.chargeFc) : "∞"} fC` : "qE−mg=maᵧ";
    [[R.massInput, state.massNg], [R.chargeInput, state.chargeFc], [R.fieldInput, state.fieldKvM], [R.heightInput, state.startHeight], [R.vxInput, state.initialVx], [R.vyInput, state.initialVy], [R.timeInput, state.time]].forEach(([element, value]) => setRange(element, value));
    R.tabs.forEach((button) => button.classList.toggle("is-active", button.dataset.mode === state.mode));
    R.routeSteps.forEach((button, index) => button.classList.toggle("is-active", index === state.guideStep));
    drawMotion(); drawCharts();
  }

  function setMode(mode) {
    if (!MODES[mode]) return;
    state.mode = mode; state.time = 0; state.running = false;
    if (mode === "balance") Object.assign(state, { massNg: 1, chargeFc: .5, fieldKvM: 19.6, startHeight: 1.5, initialVx: 0, initialVy: 0 });
    if (mode === "trajectory") Object.assign(state, { massNg: 1, chargeFc: .35, fieldKvM: 10, startHeight: 2.4, initialVx: 3, initialVy: 1 });
    if (mode === "measure") Object.assign(state, { massNg: 1.4, chargeFc: .55, fieldKvM: 25, startHeight: 1.8, initialVx: 0, initialVy: 0 });
    if (mode === "compare") Object.assign(state, { massNg: 1, chargeFc: .4, fieldKvM: 15, startHeight: 2, initialVx: 3, initialVy: 0 });
    render();
  }

  function reset() {
    Object.assign(state, { mode: "balance", massNg: 1, chargeFc: .5, fieldKvM: 19.6, startHeight: 1.5, initialVx: 0, initialVy: 0, gravity: 9.8, time: 0, running: false, guideStep: 0, showForces: true, showTrail: true, showCompare: true, showEnergy: true, dragging: false });
    [[R.forceToggle, "showForces"], [R.trailToggle, "showTrail"], [R.compareToggle, "showCompare"], [R.energyToggle, "showEnergy"]].forEach(([element, key]) => element.checked = state[key]);
    render();
  }

  function setState(next = {}) {
    const ranges = { massNg: [.1, 10], chargeFc: [-2, 2], fieldKvM: [-50, 50], startHeight: [.2, 5], initialVx: [0, 10], initialVy: [-8, 8], gravity: [1.6, 12], time: [0, 8] };
    Object.entries(ranges).forEach(([key, range]) => { if (Number.isFinite(Number(next[key]))) state[key] = clamp(next[key], range[0], range[1]); });
    if (MODES[next.mode]) state.mode = next.mode;
    if (Number.isFinite(Number(next.guideStep))) state.guideStep = clamp(Math.round(next.guideStep), 0, 2);
    ["showForces", "showTrail", "showCompare", "showEnergy"].forEach((key) => { if (typeof next[key] === "boolean") state[key] = next[key]; });
    state.running = false; state.dragging = false;
    [[R.forceToggle, "showForces"], [R.trailToggle, "showTrail"], [R.compareToggle, "showCompare"], [R.energyToggle, "showEnergy"]].forEach(([element, key]) => element.checked = state[key]);
    render();
  }

  [[R.massInput, "massNg"], [R.chargeInput, "chargeFc"], [R.fieldInput, "fieldKvM"], [R.heightInput, "startHeight"], [R.vxInput, "initialVx"], [R.vyInput, "initialVy"], [R.timeInput, "time"]].forEach(([element, key]) => element.addEventListener("input", () => { state[key] = Number(element.value); state.running = false; render(); }));
  R.tabs.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
  R.routeSteps.forEach((button, index) => button.addEventListener("click", () => { state.guideStep = index; render(); }));
  R.playButton.addEventListener("click", () => { state.running = true; render(); });
  R.pauseButton.addEventListener("click", () => { state.running = false; render(); });
  R.keyButton.addEventListener("click", () => { const p = M.parameters(input()); if (Number.isFinite(p.balanceChargeFc)) state.chargeFc = clamp(p.balanceChargeFc, -2, 2); state.running = false; render(); });
  R.resetButton.addEventListener("click", reset);
  [[R.forceToggle, "showForces"], [R.trailToggle, "showTrail"], [R.compareToggle, "showCompare"], [R.energyToggle, "showEnergy"]].forEach(([element, key]) => element.addEventListener("change", () => { state[key] = element.checked; render(); }));
  R.guideButton.addEventListener("click", () => R.guideDialog.showModal());
  R.stepButton.addEventListener("click", () => { state.guideStep = (state.guideStep + 1) % 3; render(); });
  R.focusButton.addEventListener("click", () => { const active = document.body.classList.toggle("focus-mode"); R.focusButton.setAttribute("aria-pressed", String(active)); });
  R.fullscreenButton.addEventListener("click", () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());
  function pointerTime(event) { const rect = R.motion.getBoundingClientRect(); state.time = clamp((event.clientX - rect.left) / rect.width * duration(), 0, duration()); state.running = false; render(); }
  R.motion.addEventListener("pointerdown", (event) => { state.dragging = true; R.motion.setPointerCapture?.(event.pointerId); pointerTime(event); });
  R.motion.addEventListener("pointermove", (event) => { if (state.dragging) pointerTime(event); });
  R.motion.addEventListener("pointerup", () => state.dragging = false);
  R.motion.addEventListener("pointercancel", () => state.dragging = false);
  window.addEventListener("resize", render);
  let last = performance.now();
  function frame(now) { const delta = Math.min(.05, (now - last) / 1000); last = now; if (state.running) { state.time = Math.min(duration(), state.time + delta); if (state.time >= duration()) state.running = false; render(); } requestAnimationFrame(frame); }
  window.electricGravityLab = { solve: (time, next = {}) => M.stateAt(time, { ...input(), ...next }), infer: (next = {}) => M.inferCharge({ ...input(), ...next }), getState: () => ({ ...state }), setMode, setState, reset };
  render(); requestAnimationFrame(frame);
})();
