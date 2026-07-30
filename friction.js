const G = 9.8;
const EPSILON = 1e-6;

const state = {
  mass: 2,
  muS: 0.5,
  muK: 0.3,
  targetForce: 14,
  appliedForce: 0,
  rampRate: 3,
  velocity: 0,
  position: 0,
  time: 0,
  sliding: false,
  running: false,
  ramping: false,
  mode: "adaptive",
  guideStep: 0,
  showForces: true,
  showNet: true,
  showContact: true,
  showTrail: true,
  samples: [],
  history: [{ t: 0, v: 0 }]
};

const refs = {
  canvas: document.getElementById("frictionCanvas"),
  responseChart: document.getElementById("responseChart"),
  secondaryChart: document.getElementById("secondaryChart"),
  sceneTabs: Array.from(document.querySelectorAll(".scene-tab[data-mode]")),
  routeSteps: Array.from(document.querySelectorAll(".route-step")),
  modeTitle: document.getElementById("modeTitle"),
  modeGoal: document.getElementById("modeGoal"),
  stateBadge: document.getElementById("stateBadge"),
  stageHint: document.getElementById("stageHint"),
  massInput: document.getElementById("massInput"),
  staticMuInput: document.getElementById("staticMuInput"),
  kineticMuInput: document.getElementById("kineticMuInput"),
  forceInput: document.getElementById("forceInput"),
  rampRateInput: document.getElementById("rampRateInput"),
  massValue: document.getElementById("massValue"),
  staticMuValue: document.getElementById("staticMuValue"),
  kineticMuValue: document.getElementById("kineticMuValue"),
  forceValue: document.getElementById("forceValue"),
  rampRateValue: document.getElementById("rampRateValue"),
  timeValue: document.getElementById("timeValue"),
  appliedMetric: document.getElementById("appliedMetric"),
  frictionMetric: document.getElementById("frictionMetric"),
  maxStaticMetric: document.getElementById("maxStaticMetric"),
  accelerationMetric: document.getElementById("accelerationMetric"),
  stateNature: document.getElementById("stateNature"),
  stateExplanation: document.getElementById("stateExplanation"),
  responseStatus: document.getElementById("responseStatus"),
  secondaryKicker: document.getElementById("secondaryKicker"),
  secondaryTitle: document.getElementById("secondaryTitle"),
  sampleStatus: document.getElementById("sampleStatus"),
  stepIndex: document.getElementById("stepIndex"),
  stepTitle: document.getElementById("stepTitle"),
  stepPrompt: document.getElementById("stepPrompt"),
  formulaLabel: document.getElementById("formulaLabel"),
  formulaReadout: document.getElementById("formulaReadout"),
  resetButton: document.getElementById("resetButton"),
  scanButton: document.getElementById("scanButton"),
  pauseButton: document.getElementById("pauseButton"),
  restartButton: document.getElementById("restartButton"),
  thresholdButton: document.getElementById("thresholdButton"),
  recordButton: document.getElementById("recordButton"),
  clearDataButton: document.getElementById("clearDataButton"),
  showForcesToggle: document.getElementById("showForcesToggle"),
  showNetToggle: document.getElementById("showNetToggle"),
  showContactToggle: document.getElementById("showContactToggle"),
  showTrailToggle: document.getElementById("showTrailToggle"),
  guideButton: document.getElementById("guideButton"),
  guideDialog: document.getElementById("guideDialog"),
  stepButton: document.getElementById("stepButton"),
  focusButton: document.getElementById("focusButton"),
  fullscreenButton: document.getElementById("fullscreenButton")
};

const ctx = refs.canvas.getContext("2d");
const responseCtx = refs.responseChart.getContext("2d");
const secondaryCtx = refs.secondaryChart.getContext("2d");

const modes = {
  adaptive: { title: "静摩擦自适应", goal: "静止时，摩擦力恰好抵消外力", hint: "拖动外力滑块或开始扫描" },
  threshold: { title: "最大静摩擦", goal: "达到临界值仍可静止，再增力才开始滑动", hint: "点击定位按钮，再小幅增加外力" },
  slide: { title: "滑动与停下", goal: "降低外力后，物块要先减速至零才恢复静摩擦", hint: "先播放，再把目标外力降到滑动摩擦以下" },
  compare: { title: "参数对照", goal: "改变质量和摩擦因数，比较临界点与突降幅度", hint: "每次只改变一个参数并记录" }
};

const guide = [
  { title: "先判断接触状态", prompt: "物块静止时，静摩擦力会在 0 到最大值之间自适应。" },
  { title: "再选择摩擦模型", prompt: "只有达到临界时才有 f静,max = μsN；滑动后才用 f滑 = μkN。" },
  { title: "最后判断运动", prompt: "滑动时比较 F外 与 f滑，合力决定物块加速、减速或停下。" }
];

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function format(value, digits = 2) { return Number(value).toFixed(digits); }

function calculate(source = state) {
  const mass = Math.max(0.01, Number(source.mass));
  const muS = Math.max(0, Number(source.muS));
  const muK = clamp(Number(source.muK), 0, muS);
  const force = Math.max(0, Number(source.appliedForce));
  const normal = mass * G;
  const maxStatic = muS * normal;
  const kinetic = muK * normal;
  const moving = Boolean(source.sliding) || Math.abs(Number(source.velocity) || 0) > EPSILON;
  const sliding = moving || force > maxStatic + EPSILON;
  if (!sliding) {
    const limiting = Math.abs(force - maxStatic) < 0.025;
    return { normal, maxStatic, kinetic, friction: force, netForce: 0, acceleration: 0, sliding: false, regime: limiting ? "limit" : "static" };
  }
  const netForce = force - kinetic;
  return { normal, maxStatic, kinetic, friction: kinetic, netForce, acceleration: netForce / mass, sliding: true, regime: "sliding" };
}

function regimeInfo(derived = calculate()) {
  if (derived.regime === "limit") return { label: "临界静摩擦", nature: "F外 = fs,max", explanation: "静摩擦达到上限；此刻仍可静止，再增力才滑动", className: "is-limit" };
  if (derived.regime === "sliding") {
    if (state.velocity > EPSILON && derived.acceleration < -EPSILON) return { label: "滑动减速", nature: "F外 < fk", explanation: "仍在滑动，摩擦力用 μkN；速度降到零后才切回静摩擦", className: "is-decelerating" };
    return { label: "滑动摩擦", nature: "接触面相对滑动", explanation: derived.acceleration > EPSILON ? "F外 > fk，物块向右加速" : "滑动摩擦力取 μkN", className: "is-sliding" };
  }
  return { label: "静摩擦", nature: "F外 ≤ fs,max", explanation: "静摩擦按需要取值，不等于固定的 μsN", className: "" };
}

function resetMotion(keepForce = true) {
  state.velocity = 0;
  state.position = 0;
  state.time = 0;
  state.sliding = false;
  state.running = false;
  state.ramping = false;
  state.history = [{ t: 0, v: 0 }];
  if (!keepForce) state.appliedForce = 0;
}

function advance(dt) {
  const duration = clamp(Number(dt) || 0, 0, 2);
  if (!duration) return calculate();
  const before = calculate();
  if (!state.sliding && state.appliedForce > before.maxStatic + EPSILON) state.sliding = true;
  const derived = calculate();
  if (state.sliding) {
    if (derived.acceleration < 0 && state.velocity > 0 && state.velocity + derived.acceleration * duration <= 0) {
      const stoppingTime = -state.velocity / derived.acceleration;
      state.position += state.velocity * stoppingTime + 0.5 * derived.acceleration * stoppingTime * stoppingTime;
      state.velocity = 0;
      state.sliding = false;
    } else {
      state.position += state.velocity * duration + 0.5 * derived.acceleration * duration * duration;
      state.velocity = Math.max(0, state.velocity + derived.acceleration * duration);
      if (state.velocity <= EPSILON && state.appliedForce <= derived.maxStatic + EPSILON) {
        state.velocity = 0;
        state.sliding = false;
      }
    }
  }
  state.time += duration;
  const last = state.history[state.history.length - 1];
  if (!last || state.time - last.t >= 0.045) state.history.push({ t: state.time, v: state.velocity });
  if (state.history.length > 320) state.history.shift();
  return calculate();
}

function setCanvasSize(canvas, context) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(320, Math.round(rect.width));
  const height = Math.max(180, Math.round(rect.height));
  if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
    canvas.width = width * dpr;
    canvas.height = height * dpr;
  }
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { width, height };
}

function arrow(context, x1, y1, x2, y2, color, label, lineWidth = 3) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = lineWidth;
  context.lineCap = "round";
  context.beginPath(); context.moveTo(x1, y1); context.lineTo(x2, y2); context.stroke();
  context.beginPath(); context.moveTo(x2, y2); context.lineTo(x2 - 11 * Math.cos(angle - Math.PI / 6), y2 - 11 * Math.sin(angle - Math.PI / 6)); context.lineTo(x2 - 11 * Math.cos(angle + Math.PI / 6), y2 - 11 * Math.sin(angle + Math.PI / 6)); context.closePath(); context.fill();
  context.font = "700 12px ui-monospace, monospace";
  context.textAlign = x2 >= x1 ? "left" : "right";
  context.fillText(label, x2 + (x2 >= x1 ? 8 : -8), y2 - 8);
  context.restore();
}

function drawContactInset(width, derived) {
  if (!state.showContact || width < 590) return;
  const x = 22, y = 22, w = 188, h = 88;
  ctx.save();
  ctx.fillStyle = "rgba(18,22,20,.92)"; ctx.strokeStyle = "rgba(255,255,255,.12)"; ctx.lineWidth = 1; ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#9ca69f"; ctx.font = "700 9px ui-monospace, monospace"; ctx.fillText("CONTACT MICROVIEW", x + 10, y + 15);
  const offset = derived.sliding ? (state.time * 34) % 12 : 0;
  ctx.strokeStyle = derived.sliding ? "#ff7a68" : "#64c7d9"; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let px = x + 10; px <= x + w - 10; px += 12) { ctx.lineTo(px, y + 43 + ((px / 12) % 2 ? 7 : 0)); }
  ctx.stroke();
  ctx.strokeStyle = "#f2b84b"; ctx.beginPath();
  for (let px = x + 10 - offset; px <= x + w; px += 12) { ctx.lineTo(px, y + 68 - ((px / 12) % 2 ? 7 : 0)); }
  ctx.stroke();
  ctx.fillStyle = "#d8ded9"; ctx.font = "10px system-ui, sans-serif"; ctx.fillText(derived.sliding ? "凸起相对掠过：发生滑动" : "凸起咬合：无相对滑动", x + 10, y + 82);
  ctx.restore();
}

function drawScene() {
  const { width, height } = setCanvasSize(refs.canvas, ctx);
  const d = calculate();
  const centerY = height * 0.52;
  const trackLeft = Math.max(30, width * 0.07);
  const trackRight = width - Math.max(30, width * 0.07);
  const blockW = clamp(width * 0.18, 112, 170);
  const blockH = clamp(height * 0.19, 62, 86);
  const travel = Math.max(0, trackRight - trackLeft - blockW);
  const blockX = trackLeft + ((state.position * 45) % Math.max(1, travel));
  const blockY = centerY - blockH;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0c0f0e"; ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < 9; i += 1) { ctx.strokeStyle = `rgba(105,209,142,${0.025 + i * 0.006})`; ctx.beginPath(); ctx.moveTo(0, centerY + 42 + i * 10); ctx.lineTo(width, centerY + 42 + i * 10); ctx.stroke(); }
  ctx.strokeStyle = "#717a73"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(trackLeft, centerY); ctx.lineTo(trackRight, centerY); ctx.stroke();
  ctx.strokeStyle = "rgba(242,184,75,.32)"; ctx.lineWidth = 1;
  for (let x = trackLeft; x < trackRight; x += 13) { ctx.beginPath(); ctx.moveTo(x, centerY); ctx.lineTo(x + 6, centerY + 7); ctx.stroke(); }
  if (state.showTrail && state.position > 0.01) {
    ctx.strokeStyle = "rgba(105,209,142,.55)"; ctx.lineWidth = 2; ctx.setLineDash([3, 7]); ctx.beginPath(); ctx.moveTo(trackLeft, centerY + 29); ctx.lineTo(blockX + blockW / 2, centerY + 29); ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.fillStyle = d.sliding ? "#33231f" : "#172a2d"; ctx.strokeStyle = d.sliding ? "#ff7a68" : "#64c7d9"; ctx.lineWidth = 2; ctx.fillRect(blockX, blockY, blockW, blockH); ctx.strokeRect(blockX, blockY, blockW, blockH);
  ctx.fillStyle = "#eef3ef"; ctx.font = `700 ${clamp(width * .018, 13, 18)}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.fillText(`${format(state.mass, 1)} kg`, blockX + blockW / 2, blockY + blockH / 2 + 6);
  const horizontalScale = Math.min(8, width / 110);
  const verticalLength = Math.min(76, height * .19);
  if (state.showForces) {
    arrow(ctx, blockX + blockW, blockY + blockH * .48, blockX + blockW + 22 + state.appliedForce * horizontalScale, blockY + blockH * .48, "#69d18e", `F外 ${format(state.appliedForce,1)} N`);
    if (d.friction > .01) arrow(ctx, blockX, blockY + blockH * .62, blockX - 22 - d.friction * horizontalScale, blockY + blockH * .62, d.sliding ? "#ff7a68" : "#64c7d9", `f ${format(d.friction,1)} N`);
    arrow(ctx, blockX + blockW * .42, blockY, blockX + blockW * .42, blockY - verticalLength, "#64c7d9", "N");
    arrow(ctx, blockX + blockW * .58, blockY + blockH, blockX + blockW * .58, blockY + blockH + verticalLength, "#b58ce5", "mg");
  }
  if (state.showNet && Math.abs(d.netForce) > .02) arrow(ctx, blockX + blockW / 2, blockY - 15, blockX + blockW / 2 + clamp(d.netForce * horizontalScale, -120, 120), blockY - 15, "#f2b84b", `F合 ${format(d.netForce,1)} N`, 4);
  const info = regimeInfo(d);
  ctx.textAlign = "left"; ctx.fillStyle = d.sliding ? "#ff7a68" : d.regime === "limit" ? "#f2b84b" : "#64c7d9"; ctx.font = "700 13px system-ui, sans-serif"; ctx.fillText(info.label, trackLeft, height - 48);
  ctx.fillStyle = "#9ca69f"; ctx.font = "11px system-ui, sans-serif"; ctx.fillText(`x = ${format(state.position,2)} m   v = ${format(state.velocity,2)} m/s`, trackLeft, height - 29);
  drawContactInset(width, d);
}

function drawAxes(context, width, height, labels, xMax, yMax, yMin = 0) {
  const pad = { left: 44, right: 15, top: 20, bottom: 34 };
  const plotW = width - pad.left - pad.right, plotH = height - pad.top - pad.bottom;
  context.strokeStyle = "rgba(216,222,217,.16)"; context.fillStyle = "#7f8a83"; context.lineWidth = 1; context.font = "9px ui-monospace, monospace";
  for (let i = 0; i <= 4; i += 1) {
    const x = pad.left + plotW * i / 4, y = pad.top + plotH * i / 4;
    context.beginPath(); context.moveTo(x, pad.top); context.lineTo(x, pad.top + plotH); context.stroke();
    context.beginPath(); context.moveTo(pad.left, y); context.lineTo(pad.left + plotW, y); context.stroke();
    context.textAlign = "center"; context.fillText(format(xMax * i / 4, 1), x, height - 12);
    context.textAlign = "right"; context.fillText(format(yMax - (yMax - yMin) * i / 4, 1), pad.left - 7, y + 3);
  }
  context.fillStyle = "#aab3ad"; context.textAlign = "left"; context.fillText(labels.y, pad.left, 11); context.textAlign = "right"; context.fillText(labels.x, width - 6, height - 12);
  return { x: value => pad.left + value / xMax * plotW, y: value => pad.top + (yMax - value) / (yMax - yMin) * plotH, pad, plotW, plotH };
}

function drawResponseChart() {
  const { width, height } = setCanvasSize(refs.responseChart, responseCtx);
  const d = calculate();
  const xMax = Math.max(16, state.targetForce * 1.1, d.maxStatic * 1.45);
  const yMax = Math.max(8, d.maxStatic * 1.25);
  responseCtx.clearRect(0, 0, width, height); responseCtx.fillStyle = "#111512"; responseCtx.fillRect(0, 0, width, height);
  const map = drawAxes(responseCtx, width, height, { x: "F外 / N", y: "f / N" }, xMax, yMax);
  responseCtx.strokeStyle = "#64c7d9"; responseCtx.lineWidth = 2.5; responseCtx.beginPath(); responseCtx.moveTo(map.x(0), map.y(0)); responseCtx.lineTo(map.x(d.maxStatic), map.y(d.maxStatic)); responseCtx.stroke();
  responseCtx.fillStyle = "#f2b84b"; responseCtx.beginPath(); responseCtx.arc(map.x(d.maxStatic), map.y(d.maxStatic), 4, 0, Math.PI * 2); responseCtx.fill();
  responseCtx.strokeStyle = "rgba(255,122,104,.7)"; responseCtx.setLineDash([4, 4]); responseCtx.beginPath(); responseCtx.moveTo(map.x(d.maxStatic), map.y(d.maxStatic)); responseCtx.lineTo(map.x(d.maxStatic), map.y(d.kinetic)); responseCtx.stroke(); responseCtx.setLineDash([]);
  responseCtx.strokeStyle = "#ff7a68"; responseCtx.lineWidth = 2.5; responseCtx.beginPath(); responseCtx.moveTo(map.x(d.maxStatic), map.y(d.kinetic)); responseCtx.lineTo(map.x(xMax), map.y(d.kinetic)); responseCtx.stroke();
  state.samples.forEach(sample => { responseCtx.fillStyle = sample.sliding ? "#ff7a68" : "#69d18e"; responseCtx.beginPath(); responseCtx.arc(map.x(sample.force), map.y(sample.friction), 3, 0, Math.PI * 2); responseCtx.fill(); });
  responseCtx.fillStyle = d.sliding ? "#ff7a68" : d.regime === "limit" ? "#f2b84b" : "#69d18e"; responseCtx.beginPath(); responseCtx.arc(map.x(state.appliedForce), map.y(d.friction), 5, 0, Math.PI * 2); responseCtx.fill();
}

function drawSecondaryChart() {
  const { width, height } = setCanvasSize(refs.secondaryChart, secondaryCtx);
  const d = calculate();
  secondaryCtx.clearRect(0, 0, width, height); secondaryCtx.fillStyle = "#111512"; secondaryCtx.fillRect(0, 0, width, height);
  if (state.mode === "slide") {
    const xMax = Math.max(5, state.time, state.history[state.history.length - 1]?.t || 0);
    const yMax = Math.max(2, ...state.history.map(point => point.v * 1.2));
    const map = drawAxes(secondaryCtx, width, height, { x: "t / s", y: "v / (m/s)" }, xMax, yMax);
    secondaryCtx.strokeStyle = "#69d18e"; secondaryCtx.lineWidth = 2.5; secondaryCtx.beginPath();
    state.history.forEach((point, index) => { const x = map.x(point.t), y = map.y(point.v); if (index) secondaryCtx.lineTo(x, y); else secondaryCtx.moveTo(x, y); }); secondaryCtx.stroke();
    return;
  }
  const xMax = Math.max(16, state.targetForce * 1.1, d.maxStatic * 1.45);
  const yMax = Math.max(3, (xMax - d.kinetic) / state.mass * 1.12);
  const map = drawAxes(secondaryCtx, width, height, { x: "F外 / N", y: "a / (m/s²)" }, xMax, yMax);
  secondaryCtx.strokeStyle = "#64c7d9"; secondaryCtx.lineWidth = 2.5; secondaryCtx.beginPath(); secondaryCtx.moveTo(map.x(0), map.y(0)); secondaryCtx.lineTo(map.x(d.maxStatic), map.y(0)); secondaryCtx.stroke();
  secondaryCtx.strokeStyle = "#f2b84b"; secondaryCtx.setLineDash([4, 4]); secondaryCtx.beginPath(); secondaryCtx.moveTo(map.x(d.maxStatic), map.y(0)); secondaryCtx.lineTo(map.x(d.maxStatic), map.y((d.maxStatic - d.kinetic) / state.mass)); secondaryCtx.stroke(); secondaryCtx.setLineDash([]);
  secondaryCtx.strokeStyle = "#ff7a68"; secondaryCtx.lineWidth = 2.5; secondaryCtx.beginPath(); secondaryCtx.moveTo(map.x(d.maxStatic), map.y((d.maxStatic - d.kinetic) / state.mass)); secondaryCtx.lineTo(map.x(xMax), map.y((xMax - d.kinetic) / state.mass)); secondaryCtx.stroke();
  secondaryCtx.fillStyle = d.sliding ? "#ff7a68" : "#69d18e"; secondaryCtx.beginPath(); secondaryCtx.arc(map.x(state.appliedForce), map.y(Math.max(0, d.acceleration)), 5, 0, Math.PI * 2); secondaryCtx.fill();
}

function setRangeProgress(input) {
  const value = (Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100;
  input.style.setProperty("--range-progress", `${value}%`);
}

function syncUI() {
  const d = calculate(), info = regimeInfo(d), mode = modes[state.mode], task = guide[state.guideStep];
  refs.massValue.textContent = `${format(state.mass)} kg`; refs.staticMuValue.textContent = format(state.muS); refs.kineticMuValue.textContent = format(state.muK); refs.forceValue.textContent = `${format(state.targetForce, 1)} N`; refs.rampRateValue.textContent = `${format(state.rampRate, 1)} N/s`; refs.timeValue.textContent = `t = ${format(state.time)} s`;
  refs.appliedMetric.textContent = `${format(state.appliedForce)} N`; refs.frictionMetric.textContent = `${format(d.friction)} N`; refs.maxStaticMetric.textContent = `${format(d.maxStatic)} N`; refs.accelerationMetric.textContent = `${format(d.acceleration)} m/s²`;
  refs.stateNature.textContent = info.nature; refs.stateExplanation.textContent = info.explanation; refs.stateBadge.textContent = info.label; refs.stateBadge.className = `state-badge ${info.className}`.trim();
  refs.modeTitle.textContent = mode.title; refs.modeGoal.textContent = mode.goal; refs.stageHint.textContent = mode.hint;
  refs.responseStatus.textContent = `临界值 ${format(d.maxStatic)} N`; refs.sampleStatus.textContent = `${state.samples.length} 个记录点`;
  refs.secondaryKicker.textContent = state.mode === "slide" ? "MOTION HISTORY" : "ACCELERATION RESPONSE"; refs.secondaryTitle.textContent = state.mode === "slide" ? "速度 v – 时间 t" : "加速度 a – 外力 F外";
  refs.stepIndex.textContent = `0${state.guideStep + 1}`; refs.stepTitle.textContent = task.title; refs.stepPrompt.textContent = task.prompt;
  if (d.regime === "sliding") refs.formulaReadout.textContent = `f滑 = μkN = ${format(d.friction)} N，F合 = ${format(d.netForce)} N`;
  else if (d.regime === "limit") refs.formulaReadout.textContent = `f静,max = μsN = ${format(d.maxStatic)} N`;
  else refs.formulaReadout.textContent = `f静 = F外 = ${format(d.friction)} N`;
  refs.scanButton.textContent = state.running ? (state.ramping ? "扫描中…" : "运动中…") : "▶ 从零扫描"; refs.scanButton.setAttribute("aria-pressed", String(state.running));
  refs.sceneTabs.forEach(button => button.classList.toggle("is-active", button.dataset.mode === state.mode)); refs.routeSteps.forEach((button, index) => button.classList.toggle("is-active", index === state.guideStep));
  [refs.massInput, refs.staticMuInput, refs.kineticMuInput, refs.forceInput, refs.rampRateInput].forEach(setRangeProgress);
}

function render() { drawScene(); drawResponseChart(); drawSecondaryChart(); syncUI(); }

function setParameters(patch) {
  if (patch.mass !== undefined) state.mass = clamp(Number(patch.mass), .5, 5);
  if (patch.muS !== undefined) state.muS = clamp(Number(patch.muS), .1, 1);
  if (patch.muK !== undefined) state.muK = clamp(Number(patch.muK), .05, state.muS);
  if (patch.targetForce !== undefined) state.targetForce = clamp(Number(patch.targetForce), 0, 30);
  if (patch.appliedForce !== undefined) state.appliedForce = clamp(Number(patch.appliedForce), 0, 30);
  if (patch.rampRate !== undefined) state.rampRate = clamp(Number(patch.rampRate), 1, 10);
  if (patch.velocity !== undefined) state.velocity = Math.max(0, Number(patch.velocity));
  if (patch.sliding !== undefined) state.sliding = Boolean(patch.sliding);
  if (patch.position !== undefined) state.position = Math.max(0, Number(patch.position));
  if (!state.running && patch.targetForce !== undefined && patch.appliedForce === undefined) state.appliedForce = state.targetForce;
  if (!state.sliding && state.appliedForce > calculate().maxStatic + EPSILON) state.sliding = true;
  refs.massInput.value = state.mass; refs.staticMuInput.value = state.muS; refs.kineticMuInput.value = state.muK; refs.forceInput.value = state.targetForce; refs.rampRateInput.value = state.rampRate;
  render();
}

function applyMode(mode) {
  state.mode = mode;
  resetMotion();
  const baseline = calculate();
  if (mode === "adaptive") { state.targetForce = Math.max(14, baseline.maxStatic + 3); state.appliedForce = Math.min(4, baseline.maxStatic * .45); }
  if (mode === "threshold") { state.targetForce = baseline.maxStatic; state.appliedForce = baseline.maxStatic; }
  if (mode === "slide") { state.targetForce = Math.min(30, baseline.maxStatic + 4); state.appliedForce = state.targetForce; state.sliding = true; }
  if (mode === "compare") { state.targetForce = Math.min(30, baseline.maxStatic + 2); state.appliedForce = 0; }
  refs.forceInput.value = state.targetForce;
  render();
}

function startScan() { resetMotion(false); state.running = true; state.ramping = true; render(); }
function recordSample() { const d = calculate(); state.samples.push({ force: state.appliedForce, friction: d.friction, acceleration: d.acceleration, sliding: d.sliding }); if (state.samples.length > 40) state.samples.shift(); render(); }

refs.massInput.addEventListener("input", () => setParameters({ mass: refs.massInput.value }));
refs.staticMuInput.addEventListener("input", () => setParameters({ muS: refs.staticMuInput.value, muK: Math.min(state.muK, Number(refs.staticMuInput.value)) }));
refs.kineticMuInput.addEventListener("input", () => setParameters({ muK: refs.kineticMuInput.value }));
refs.forceInput.addEventListener("input", () => setParameters({ targetForce: refs.forceInput.value }));
refs.rampRateInput.addEventListener("input", () => setParameters({ rampRate: refs.rampRateInput.value }));
refs.sceneTabs.forEach(button => button.addEventListener("click", () => applyMode(button.dataset.mode)));
refs.routeSteps.forEach((button, index) => button.addEventListener("click", () => { state.guideStep = index; render(); }));
refs.scanButton.addEventListener("click", startScan);
refs.pauseButton.addEventListener("click", () => { state.running = false; state.ramping = false; render(); });
refs.restartButton.addEventListener("click", startScan);
refs.thresholdButton.addEventListener("click", () => { resetMotion(); const d = calculate(); state.targetForce = d.maxStatic; state.appliedForce = d.maxStatic; state.mode = "threshold"; refs.forceInput.value = state.targetForce; render(); });
refs.recordButton.addEventListener("click", recordSample);
refs.clearDataButton.addEventListener("click", () => { state.samples = []; state.history = [{ t: state.time, v: state.velocity }]; render(); });
refs.resetButton.addEventListener("click", () => { Object.assign(state, { mass:2, muS:.5, muK:.3, targetForce:14, appliedForce:0, rampRate:3, mode:"adaptive", guideStep:0, samples:[] }); resetMotion(); refs.massInput.value=2; refs.staticMuInput.value=.5; refs.kineticMuInput.value=.3; refs.forceInput.value=14; refs.rampRateInput.value=3; render(); });
[[refs.showForcesToggle,"showForces"],[refs.showNetToggle,"showNet"],[refs.showContactToggle,"showContact"],[refs.showTrailToggle,"showTrail"]].forEach(([input,key]) => input.addEventListener("change", () => { state[key] = input.checked; render(); }));
refs.guideButton.addEventListener("click", () => refs.guideDialog.showModal());
refs.stepButton.addEventListener("click", () => { state.guideStep = (state.guideStep + 1) % guide.length; render(); });
refs.focusButton.addEventListener("click", () => { const active = document.body.classList.toggle("focus-mode"); refs.focusButton.setAttribute("aria-pressed", String(active)); });
refs.fullscreenButton.addEventListener("click", () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());
window.addEventListener("resize", render);

let previousFrame = performance.now();
function frame(now) {
  const dt = Math.min(.05, Math.max(0, (now - previousFrame) / 1000));
  previousFrame = now;
  if (state.running) {
    if (state.ramping) {
      const oldForce = state.appliedForce;
      state.appliedForce = Math.min(state.targetForce, state.appliedForce + state.rampRate * dt);
      const threshold = calculate({ ...state, appliedForce: oldForce, sliding: false, velocity: 0 }).maxStatic;
      if (!state.sliding && oldForce <= threshold && state.appliedForce > threshold) state.sliding = true;
      if (state.appliedForce >= state.targetForce - EPSILON) state.ramping = false;
    }
    advance(dt);
    render();
  }
  requestAnimationFrame(frame);
}

window.frictionLab = {
  calculate: source => calculate({ ...state, ...source }),
  getState: () => ({ ...state, history: state.history.map(point => ({ ...point })), samples: state.samples.map(point => ({ ...point })) }),
  setState: patch => setParameters(patch),
  setMode: applyMode,
  resetMotion,
  recordSample,
  step: advance
};

render();
requestAnimationFrame(frame);
