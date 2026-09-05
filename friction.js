const G = 9.8;
const EPSILON = 1e-6;

const state = {
  mass: 2, muS: .5, muK: .3, targetForce: 14, appliedForce: 0,
  rampRate: 3, velocity: 0, position: 0, time: 0,
  phase: "static", sliding: false, running: false, ramping: false, replayTime: 0,
  dragging: false, mode: "adaptive", guideStep: 0,
  showForces: true, showNet: true, showContact: true, showTrail: true,
  samples: [], history: [{ t: 0, v: 0 }]
};

const refs = {
  canvas: document.getElementById("frictionCanvas"), responseChart: document.getElementById("responseChart"), secondaryChart: document.getElementById("secondaryChart"),
  sceneTabs: [...document.querySelectorAll(".scene-tab[data-mode]")], routeSteps: [...document.querySelectorAll(".route-step")],
  modeTitle: document.getElementById("modeTitle"), modeGoal: document.getElementById("modeGoal"), stateBadge: document.getElementById("stateBadge"), stageHint: document.getElementById("stageHint"),
  massInput: document.getElementById("massInput"), staticMuInput: document.getElementById("staticMuInput"), kineticMuInput: document.getElementById("kineticMuInput"), forceInput: document.getElementById("forceInput"), rampRateInput: document.getElementById("rampRateInput"),
  massValue: document.getElementById("massValue"), staticMuValue: document.getElementById("staticMuValue"), kineticMuValue: document.getElementById("kineticMuValue"), forceValue: document.getElementById("forceValue"), rampRateValue: document.getElementById("rampRateValue"), timeValue: document.getElementById("timeValue"),
  appliedMetric: document.getElementById("appliedMetric"), frictionMetric: document.getElementById("frictionMetric"), maxStaticMetric: document.getElementById("maxStaticMetric"), accelerationMetric: document.getElementById("accelerationMetric"), stateNature: document.getElementById("stateNature"), stateExplanation: document.getElementById("stateExplanation"),
  responseStatus: document.getElementById("responseStatus"), secondaryKicker: document.getElementById("secondaryKicker"), secondaryTitle: document.getElementById("secondaryTitle"), sampleStatus: document.getElementById("sampleStatus"), stepIndex: document.getElementById("stepIndex"), stepTitle: document.getElementById("stepTitle"), stepPrompt: document.getElementById("stepPrompt"), formulaReadout: document.getElementById("formulaReadout"),
  resetButton: document.getElementById("resetButton"), scanButton: document.getElementById("scanButton"), pauseButton: document.getElementById("pauseButton"), restartButton: document.getElementById("restartButton"), thresholdButton: document.getElementById("thresholdButton"), breakButton: document.getElementById("breakButton"), recordButton: document.getElementById("recordButton"), clearDataButton: document.getElementById("clearDataButton"),
  showForcesToggle: document.getElementById("showForcesToggle"), showNetToggle: document.getElementById("showNetToggle"), showContactToggle: document.getElementById("showContactToggle"), showTrailToggle: document.getElementById("showTrailToggle"), guideButton: document.getElementById("guideButton"), guideDialog: document.getElementById("guideDialog"), stepButton: document.getElementById("stepButton"), focusButton: document.getElementById("focusButton"), fullscreenButton: document.getElementById("fullscreenButton")
};

const ctx = refs.canvas.getContext("2d");
const responseCtx = refs.responseChart.getContext("2d");
const secondaryCtx = refs.secondaryChart.getContext("2d");
const geometry = { handle: null, forceHandle: null, block: null, forceScale: 1, forceBaseX: 0, forceOriginX: 0 };
let releaseTimer = null;
const C = { bg: "#0b0f0d", grid: "rgba(216,222,217,.055)", cyan: "#68c9d8", amber: "#f2b84b", red: "#ff786e", green: "#75d491", violet: "#b58ce5", text: "#edf2ed", muted: "#8d9991" };
const modes = {
  adaptive: { title: "静摩擦自适应", goal: "物块不动，摩擦力跟随外力改变", hint: "拖动右侧测力计拉环" },
  threshold: { title: "最大静摩擦", goal: "物块仍静止，但摩擦力已到上限", hint: "临界点已经定格" },
  slide: { title: "起滑瞬间", goal: "只增加一点外力，看清摩擦力跳落", hint: "事件回放会自动停住" },
  compare: { title: "参数对照", goal: "改变接触面，比较临界点和跳落幅度", hint: "一次只改变一个参数" }
};
const guide = [
  { title: "先看物块", prompt: "物块不动，不代表没有摩擦；摩擦力会跟随外力改变。" },
  { title: "再找临界点", prompt: "慢慢拉动测力计，物块仍静止时，摩擦力箭头会逐渐变长。" },
  { title: "最后看突变", prompt: "只增加 0.1 N，摩擦模型切换；画面把这个瞬间展开并定格。" }
];
const clamp = (v, min, max) => Math.min(max, Math.max(min, Number(v)));
const format = (v, digits = 2) => Number(v).toFixed(digits);

function calculate(source = state) {
  const mass = Math.max(.01, Number(source.mass));
  const muS = Math.max(0, Number(source.muS));
  const muK = clamp(Number(source.muK), 0, muS);
  const force = Math.max(0, Number(source.appliedForce));
  const normal = mass * G, maxStatic = muS * normal, kinetic = muK * normal;
  const phase = source.phase || ((source.sliding || Math.abs(Number(source.velocity) || 0) > EPSILON || force > maxStatic + EPSILON) ? "sliding" : "static");
  if (phase === "static" && force <= maxStatic + EPSILON) {
    const regime = Math.abs(force - maxStatic) < .025 ? "limit" : "static";
    return { normal, maxStatic, kinetic, friction: force, netForce: 0, acceleration: 0, sliding: false, regime };
  }
  const netForce = force - kinetic;
  return { normal, maxStatic, kinetic, friction: kinetic, netForce, acceleration: netForce / mass, sliding: true, regime: "sliding" };
}

function regimeInfo(d = calculate()) {
  if (state.phase === "release") return { label: "起滑回放", nature: "f 从上限跳落", explanation: "摩擦力已切换到 μkN；时间被展开，画面将在短暂位移后定格", className: "is-release" };
  if (d.regime === "limit") return { label: "临界静止", nature: "F外 = fs,max", explanation: "物块仍未移动，静摩擦刚好达到可提供的上限", className: "is-limit" };
  if (d.regime === "sliding") return { label: "滑动摩擦", nature: "接触面相对滑动", explanation: "起滑后摩擦力取 μkN；本页只播放短暂起滑片段，不研究持续加速", className: "is-sliding" };
  return { label: "静摩擦", nature: "F外 ≤ fs,max", explanation: "物块未移动，静摩擦按平衡需要取值，不等于固定的 μsN", className: "" };
}

function resetMotion(keepForce = true) {
  if (releaseTimer) { clearTimeout(releaseTimer); releaseTimer = null; }
  state.velocity = 0; state.position = 0; state.time = 0; state.phase = "static"; state.sliding = false; state.running = false; state.ramping = false; state.replayTime = 0; state.history = [{ t: 0, v: 0 }];
  if (!keepForce) state.appliedForce = 0;
}
function finishRelease() {
  if (state.phase !== "release") return;
  state.phase = "sliding"; state.sliding = true; state.running = false; state.ramping = false; state.position = .18; state.velocity = 0; state.replayTime = .8; state.time = .8; releaseTimer = null; render();
}
function beginRelease(force) {
  if (releaseTimer) clearTimeout(releaseTimer);
  state.appliedForce = clamp(force, 0, 30); state.targetForce = state.appliedForce; state.phase = "release"; state.sliding = true; state.running = true; state.ramping = false; state.replayTime = 0; state.position = 0; state.velocity = 0; state.time = 0;
  releaseTimer = setTimeout(finishRelease, 900);
}
function advance(dt) {
  const duration = clamp(dt || 0, 0, 2);
  if (!duration) return calculate();
  if (state.phase === "release") {
    state.replayTime += duration;
    const progress = clamp(state.replayTime / .8, 0, 1);
    state.position = .18 * progress * progress; state.velocity = progress < 1 ? .22 : 0; state.time = state.replayTime;
    if (progress >= .98) finishRelease();
  }
  return calculate();
}

function resize(canvas, context) {
  const rect = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2), width = Math.max(320, Math.round(rect.width)), height = Math.max(180, Math.round(rect.height));
  if (canvas.width !== width * dpr || canvas.height !== height * dpr) { canvas.width = width * dpr; canvas.height = height * dpr; }
  context.setTransform(dpr, 0, 0, dpr, 0, 0); return { width, height };
}
function line(x1, y1, x2, y2, color, width = 1, dash = []) { ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore(); }
function arrow(context, x1, y1, x2, y2, color, text, width = 3) { const angle = Math.atan2(y2 - y1, x2 - x1), size = 10; context.save(); context.strokeStyle = color; context.fillStyle = color; context.lineWidth = width; context.lineCap = "round"; context.beginPath(); context.moveTo(x1, y1); context.lineTo(x2, y2); context.stroke(); context.beginPath(); context.moveTo(x2, y2); context.lineTo(x2 - size * Math.cos(angle - Math.PI / 6), y2 - size * Math.sin(angle - Math.PI / 6)); context.lineTo(x2 - size * Math.cos(angle + Math.PI / 6), y2 - size * Math.sin(angle + Math.PI / 6)); context.closePath(); context.fill(); if (text) { context.font = "700 11px ui-monospace, monospace"; context.textAlign = x2 >= x1 ? "left" : "right"; context.fillText(text, x2 + (x2 >= x1 ? 7 : -7), y2 - 8); } context.restore(); }
function roundedRect(context, x, y, w, h, r, fill, stroke) { context.beginPath(); context.roundRect(x, y, w, h, r); context.fillStyle = fill; context.fill(); if (stroke) { context.strokeStyle = stroke; context.stroke(); } }
function spring(context, x1, x2, y, color) { context.save(); context.strokeStyle = color; context.lineWidth = 2; context.beginPath(); context.moveTo(x1, y); const turns = 9, span = Math.max(18, x2 - x1); for (let i = 0; i <= turns * 2; i += 1) context.lineTo(x1 + span * i / (turns * 2), y + (i === 0 || i === turns * 2 ? 0 : (i % 2 ? -7 : 7))); context.stroke(); context.restore(); }
function text(value, x, y, color = C.muted, size = 10, align = "left") { ctx.save(); ctx.fillStyle = color; ctx.font = `${size}px system-ui, sans-serif`; ctx.textAlign = align; ctx.fillText(value, x, y); ctx.restore(); }

function drawGauge(width, d) {
  const x = Math.max(38, width * .34), y = 24, w = Math.min(330, width * .42), h = 28, max = Math.max(8, d.maxStatic * 1.15), progress = clamp(state.appliedForce / max, 0, 1), limit = clamp(d.maxStatic / max, 0, 1);
  text("外力与摩擦力 · 同一比例尺", x, y - 8, C.muted, 10); roundedRect(ctx, x, y, w, h, 14, "#17201b", "rgba(255,255,255,.13)"); ctx.save(); ctx.beginPath(); ctx.roundRect(x + 4, y + 7, (w - 8) * progress, h - 14, 8); ctx.fillStyle = state.phase === "release" || d.sliding ? C.red : d.regime === "limit" ? C.amber : C.cyan; ctx.fill(); ctx.restore(); line(x + 4 + (w - 8) * limit, y - 4, x + 4 + (w - 8) * limit, y + h + 6, C.amber, 2, [3, 3]); text("fs,max", x + 4 + (w - 8) * limit, y + h + 18, C.amber, 10, "center"); text(`F外 ${format(state.appliedForce, 1)} N`, x + 8 + (w - 8) * progress, y + 19, C.text, 10); text("← 静止区", x, y + h + 34, C.cyan, 9); text("起滑区 →", x + w, y + h + 34, C.red, 9, "right");
}
function drawContact(width, height, d) {
  if (!state.showContact) return;
  const x = Math.max(16, width * .045), y = height - 105, w = width - x * 2, h = 78, sliding = d.sliding || state.phase === "release";
  roundedRect(ctx, x, y, w, h, 8, "rgba(14,19,17,.96)", "rgba(255,255,255,.14)"); text("接触微区 · 放大模型", x + 12, y + 17, C.muted, 9); const mid = y + 43, offset = sliding ? clamp(state.position * 70, 0, 18) : 0; line(x + 15, mid - 11, x + w - 15, mid - 11, C.cyan, 2); line(x + 15, mid + 13, x + w - 15, mid + 13, C.amber, 2);
  for (let px = x + 22; px < x + w - 18; px += 28) { ctx.save(); ctx.strokeStyle = sliding && px < x + 170 ? C.red : "rgba(242,184,75,.7)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px + offset, mid - 11); ctx.lineTo(px + 8 + offset, mid - 21); ctx.lineTo(px + 16 + offset, mid - 11); ctx.stroke(); ctx.restore(); }
  for (let px = x + 24; px < x + w - 18; px += 34) { ctx.save(); ctx.strokeStyle = "rgba(104,201,216,.78)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px - offset, mid + 13); ctx.lineTo(px + 8 - offset, mid + 23); ctx.lineTo(px + 16 - offset, mid + 13); ctx.stroke(); ctx.restore(); }
  text(sliding ? "凸起相对掠过 · 接触点断开并重建" : state.phase === "static" && d.regime === "limit" ? "接触点被拉伸到极限 · 尚未滑动" : "凸起咬合 · 没有相对滑动", x + 12, y + h - 10, sliding ? C.red : state.phase === "static" && d.regime === "limit" ? C.amber : C.text, 10);
}
function drawDynamometer(blockX, blockY, blockW, blockH, width, d) {
  const bodyW = clamp(width * .2, 126, 210), bodyH = 36;
  const bodyX = Math.min(width - bodyW - 42, blockX + blockW + Math.max(28, width * .04));
  const bodyY = blockY + blockH * .28, midY = bodyY + bodyH / 2;
  const maxDragForce = Math.max(16, Math.min(30, state.targetForce + 6));
  const forceScale = clamp((width - bodyX - bodyW - 28) / maxDragForce, 3.5, 8);
  const forceOriginX = bodyX + bodyW + 18;
  const ringX = forceOriginX + state.appliedForce * forceScale;
  const deviceColor = state.phase === "release" ? C.red : C.amber;
  spring(ctx, blockX + blockW, bodyX, midY, deviceColor);
  line(bodyX + bodyW, midY, ringX - 8, midY, "rgba(227,233,228,.8)", 2);
  roundedRect(ctx, bodyX, bodyY, bodyW, bodyH, 16, "#e3e9e4", state.phase === "release" ? C.red : "#95a49a");
  roundedRect(ctx, bodyX + 15, bodyY + 10, bodyW - 34, 16, 8, "#31413a", "#65766d");
  const needleX = bodyX + 15 + (bodyW - 34) * clamp(state.appliedForce / Math.max(1, d.maxStatic * 1.15), 0, 1);
  line(needleX, bodyY + 9, needleX, bodyY + 27, state.phase === "release" ? C.red : C.green, 2);
  ctx.save(); ctx.fillStyle = "#1b2821"; ctx.beginPath(); ctx.arc(ringX, midY, 8, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = state.dragging ? C.text : C.green; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  text("测力计", bodyX + bodyW / 2, bodyY - 9, C.text, 10, "center"); text("拖动拉环", ringX, midY + 25, state.dragging ? C.text : C.green, 9, "center");
  geometry.forceBaseX = forceOriginX; geometry.forceOriginX = forceOriginX; geometry.forceScale = forceScale; geometry.handle = { x: ringX, y: midY }; geometry.forceHandle = geometry.handle;
}

function drawScene() {
  const { width, height } = resize(refs.canvas, ctx), d = calculate(), centerY = height * .49, trackLeft = Math.max(26, width * .055), trackRight = width - Math.max(26, width * .055), blockW = clamp(width * .15, 100, 148), blockH = clamp(height * .2, 62, 84), blockOffset = clamp(width * .1, 34, 72), travel = Math.max(0, trackRight - trackLeft - blockW - 170 - blockOffset), blockX = trackLeft + blockOffset + clamp(state.position * 52, 0, travel), blockY = centerY - blockH;
  geometry.block = { x: blockX, y: blockY, width: blockW, height: blockH }; ctx.clearRect(0, 0, width, height); ctx.fillStyle = C.bg; ctx.fillRect(0, 0, width, height); for (let i = 0; i < 8; i += 1) line(0, centerY + 48 + i * 11, width, centerY + 48 + i * 11, `rgba(105,209,142,${.02 + i * .006})`); drawGauge(width, d);
  const surfaceY = centerY + 8; ctx.fillStyle = "#b18a51"; ctx.fillRect(trackLeft, surfaceY, trackRight - trackLeft, 10); ctx.fillStyle = "#e3c37f"; ctx.fillRect(trackLeft, surfaceY, trackRight - trackLeft, 4); for (let x = trackLeft; x < trackRight; x += 14) line(x, surfaceY + 9, x + 7, surfaceY + 16, "rgba(54,42,24,.5)", 1);
  if (state.showTrail && state.position > .01) line(trackLeft, surfaceY + 27, blockX + blockW / 2, surfaceY + 27, "rgba(117,212,145,.7)", 2, [3, 7]);
  const activeColor = state.phase === "release" || d.sliding ? C.red : d.regime === "limit" ? C.amber : C.cyan; ctx.save(); ctx.shadowColor = activeColor; ctx.shadowBlur = state.phase === "release" || d.regime === "limit" ? 18 : 0; roundedRect(ctx, blockX, blockY, blockW, blockH, 5, state.phase === "release" || d.sliding ? "#35221f" : "#193036", activeColor); ctx.restore(); text(`${format(state.mass, 1)} kg`, blockX + blockW / 2, blockY + blockH / 2 + 5, C.text, 15, "center"); drawDynamometer(blockX, blockY, blockW, blockH, width, d);
  const forceY = blockY + blockH * .5, scale = geometry.forceScale; if (state.showForces) { const pullLen = Math.max(24, state.appliedForce * scale); arrow(ctx, blockX + blockW + 10, forceY - 48, blockX + blockW + 10 + pullLen, forceY - 48, C.green, `F外 ${format(state.appliedForce, 1)} N`); if (d.friction > .01) { const frictionLen = Math.max(24, d.friction * scale), frictionY = blockY + blockH * .66; arrow(ctx, blockX - 10, frictionY, blockX - 10 - frictionLen, frictionY, d.sliding ? C.red : C.cyan); text(`f ${format(d.friction, 1)} N`, blockX - 10 - frictionLen * .5, frictionY - 10, d.sliding ? C.red : C.cyan, 10, "center"); } arrow(ctx, blockX + blockW * .4, blockY, blockX + blockW * .4, blockY - 54, C.cyan, "N"); arrow(ctx, blockX + blockW * .6, blockY + blockH, blockX + blockW * .6, blockY + blockH + 54, C.violet, "mg"); }
  if (state.showNet && state.phase === "release") arrow(ctx, blockX + blockW / 2, blockY - 19, blockX + blockW / 2 + 42, blockY - 19, C.amber, "起滑", 3);
  const info = regimeInfo(d); text(info.label, trackLeft, height - 119, activeColor, 13); text(state.phase === "release" ? "时间展开：只播放起滑位移，随后自动定格" : `物块位移 ${format(state.position, 2)} m · v = ${format(state.velocity, 2)} m/s`, trackLeft, height - 101, C.muted, 10);
  const stages = [{ text: "静止", color: C.cyan }, { text: "临界", color: C.amber }, { text: "起滑后", color: C.red }], stage = state.phase === "release" || d.sliding ? 2 : d.regime === "limit" ? 1 : 0, sx = width - 224, sy = height - 119; stages.forEach((s, i) => { ctx.save(); ctx.fillStyle = i === stage ? s.color : "rgba(255,255,255,.18)"; ctx.beginPath(); ctx.arc(sx + i * 86, sy, i === stage ? 5 : 3, 0, Math.PI * 2); ctx.fill(); if (i < stages.length - 1) line(sx + i * 86 + 8, sy, sx + (i + 1) * 86 - 8, sy, i < stage ? s.color : "rgba(255,255,255,.16)", 1); ctx.restore(); text(s.text, sx + i * 86, sy + 17, i === stage ? s.color : C.muted, 9, "center"); }); drawContact(width, height, d);
}

function chartAxes(context, width, height, xMax, yMax) { const p = { l: 42, r: 14, t: 18, b: 30 }, w = width - p.l - p.r, h = height - p.t - p.b; context.strokeStyle = "rgba(216,222,217,.14)"; context.fillStyle = "#7f8a83"; context.font = "9px ui-monospace, monospace"; for (let i = 0; i <= 4; i += 1) { const x = p.l + w * i / 4, y = p.t + h * i / 4; context.beginPath(); context.moveTo(x, p.t); context.lineTo(x, p.t + h); context.stroke(); context.beginPath(); context.moveTo(p.l, y); context.lineTo(p.l + w, y); context.stroke(); context.textAlign = "center"; context.fillText(format(xMax * i / 4, 1), x, height - 9); context.textAlign = "right"; context.fillText(format(yMax * (4 - i) / 4, 1), p.l - 6, y + 3); } return { x: v => p.l + v / xMax * w, y: v => p.t + (yMax - v) / yMax * h }; }
function drawResponseChart() { const { width, height } = resize(refs.responseChart, responseCtx), d = calculate(), xMax = Math.max(16, state.targetForce * 1.1, d.maxStatic * 1.45), yMax = Math.max(8, d.maxStatic * 1.25); responseCtx.clearRect(0, 0, width, height); responseCtx.fillStyle = "#111512"; responseCtx.fillRect(0, 0, width, height); const m = chartAxes(responseCtx, width, height, xMax, yMax); responseCtx.lineWidth = 2.5; responseCtx.strokeStyle = C.cyan; responseCtx.beginPath(); responseCtx.moveTo(m.x(0), m.y(0)); responseCtx.lineTo(m.x(d.maxStatic), m.y(d.maxStatic)); responseCtx.stroke(); responseCtx.strokeStyle = C.red; responseCtx.beginPath(); responseCtx.moveTo(m.x(d.maxStatic), m.y(d.kinetic)); responseCtx.lineTo(m.x(xMax), m.y(d.kinetic)); responseCtx.stroke(); responseCtx.strokeStyle = "rgba(255,120,110,.7)"; responseCtx.setLineDash([4, 4]); responseCtx.beginPath(); responseCtx.moveTo(m.x(d.maxStatic), m.y(d.maxStatic)); responseCtx.lineTo(m.x(d.maxStatic), m.y(d.kinetic)); responseCtx.stroke(); responseCtx.setLineDash([]); responseCtx.fillStyle = state.phase === "release" || d.sliding ? C.red : d.regime === "limit" ? C.amber : C.green; responseCtx.beginPath(); responseCtx.arc(m.x(state.appliedForce), m.y(d.friction), 5, 0, Math.PI * 2); responseCtx.fill(); }
function drawEventChart() { const { width, height } = resize(refs.secondaryChart, secondaryCtx), d = calculate(), max = Math.max(1, d.maxStatic * 1.16), p = { l: 35, r: 22, t: 22, b: 38 }, w = width - p.l - p.r, h = height - p.t - p.b; secondaryCtx.clearRect(0, 0, width, height); secondaryCtx.fillStyle = "#111512"; secondaryCtx.fillRect(0, 0, width, height); secondaryCtx.strokeStyle = "rgba(216,222,217,.14)"; for (let i = 0; i <= 4; i += 1) { const y = p.t + h * i / 4; secondaryCtx.beginPath(); secondaryCtx.moveTo(p.l, y); secondaryCtx.lineTo(p.l + w, y); secondaryCtx.stroke(); } secondaryCtx.fillStyle = C.muted; secondaryCtx.font = "9px ui-monospace, monospace"; secondaryCtx.textAlign = "right"; for (let i = 0; i <= 4; i += 1) secondaryCtx.fillText(format(max * (4 - i) / 4, 1), p.l - 6, p.t + h * i / 4 + 3); secondaryCtx.textAlign = "left"; secondaryCtx.fillText("摩擦力 f / N", p.l, 13); const bars = [{ x: p.l + w * .2, value: d.maxStatic, color: C.amber, title: "临界前" }, { x: p.l + w * .5, value: d.maxStatic, color: C.amber, title: "临界" }, { x: p.l + w * .8, value: d.kinetic, color: C.red, title: "起滑后" }]; bars.forEach((b, i) => { const top = p.t + h * (max - b.value) / max; secondaryCtx.fillStyle = `${b.color}cc`; secondaryCtx.fillRect(b.x - 24, top, 48, p.t + h - top); secondaryCtx.fillStyle = b.color; secondaryCtx.font = "700 10px ui-monospace, monospace"; secondaryCtx.textAlign = "center"; secondaryCtx.fillText(`${format(b.value, 2)} N`, b.x, top - 8); secondaryCtx.fillStyle = C.text; secondaryCtx.font = "10px system-ui, sans-serif"; secondaryCtx.fillText(b.title, b.x, height - 14); if (i === 1) { secondaryCtx.strokeStyle = C.red; secondaryCtx.setLineDash([3, 3]); secondaryCtx.beginPath(); secondaryCtx.moveTo(b.x + 31, top); secondaryCtx.lineTo(b.x + 31, p.t + h * (max - d.kinetic) / max); secondaryCtx.stroke(); secondaryCtx.setLineDash([]); } }); secondaryCtx.fillStyle = C.red; secondaryCtx.font = "700 10px system-ui, sans-serif"; secondaryCtx.textAlign = "center"; secondaryCtx.fillText(`跳落 ${format(d.maxStatic - d.kinetic, 2)} N`, p.l + w * .65, p.t + h * .55); }

function rangeProgress(input) { const p = (Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100; input.style.setProperty("--range-progress", `${p}%`); }
function syncUI() { const d = calculate(), info = regimeInfo(d), mode = modes[state.mode], task = guide[state.guideStep]; refs.massValue.textContent = `${format(state.mass)} kg`; refs.staticMuValue.textContent = format(state.muS); refs.kineticMuValue.textContent = format(state.muK); refs.forceValue.textContent = `${format(state.targetForce, 1)} N`; refs.rampRateValue.textContent = `${format(state.rampRate, 1)} N/s`; refs.timeValue.textContent = state.phase === "release" ? `慢放 ${format(state.replayTime, 1)} s` : state.phase === "sliding" ? "已定格" : d.regime === "limit" ? "临界" : "静止"; refs.appliedMetric.textContent = `${format(state.appliedForce)} N`; refs.frictionMetric.textContent = `${format(d.friction)} N`; refs.maxStaticMetric.textContent = `${format(d.maxStatic)} N`; refs.accelerationMetric.textContent = state.phase === "release" ? "慢放" : "0.00 m/s²"; refs.stateNature.textContent = info.nature; refs.stateExplanation.textContent = info.explanation; refs.stateBadge.textContent = info.label; refs.stateBadge.className = `state-badge ${info.className}`.trim(); refs.modeTitle.textContent = mode.title; refs.modeGoal.textContent = mode.goal; refs.stageHint.textContent = mode.hint; refs.responseStatus.textContent = `临界 ${format(d.maxStatic)} N · 跳落 ${format(d.maxStatic - d.kinetic)} N`; refs.sampleStatus.textContent = state.samples.length ? `${state.samples.length} 个记录点` : "拖动装置看变化"; refs.secondaryKicker.textContent = "EVENT REPLAY"; refs.secondaryTitle.textContent = "起滑事件回放"; refs.stepIndex.textContent = `0${state.guideStep + 1}`; refs.stepTitle.textContent = task.title; refs.stepPrompt.textContent = task.prompt; refs.formulaReadout.textContent = d.sliding ? `f滑 = μkN = ${format(d.friction)} N` : d.regime === "limit" ? `f静,max = μsN = ${format(d.maxStatic)} N` : `f静 = F外 = ${format(d.friction)} N`; refs.scanButton.textContent = state.ramping ? "加力中…" : "▶ 慢慢加力"; refs.breakButton.disabled = !(state.mode === "threshold" || state.mode === "slide") || state.phase === "release"; refs.sceneTabs.forEach(b => b.classList.toggle("is-active", b.dataset.mode === state.mode)); refs.routeSteps.forEach((b, i) => b.classList.toggle("is-active", i === state.guideStep)); [refs.massInput, refs.staticMuInput, refs.kineticMuInput, refs.forceInput, refs.rampRateInput].forEach(rangeProgress); }
function render() { drawScene(); drawResponseChart(); drawEventChart(); syncUI(); }

function setParameters(patch) { const structural = patch.mass !== undefined || patch.muS !== undefined || patch.muK !== undefined; if (patch.mass !== undefined) state.mass = clamp(patch.mass, .5, 5); if (patch.muS !== undefined) state.muS = clamp(patch.muS, .1, 1); if (patch.muK !== undefined) state.muK = clamp(patch.muK, .05, state.muS); if (patch.targetForce !== undefined) state.targetForce = clamp(patch.targetForce, 0, 30); if (patch.appliedForce !== undefined) state.appliedForce = clamp(patch.appliedForce, 0, 30); if (patch.rampRate !== undefined) state.rampRate = clamp(patch.rampRate, 1, 10); if (patch.guideStep !== undefined) state.guideStep = clamp(Math.round(patch.guideStep), 0, guide.length - 1); if (patch.phase !== undefined) { state.phase = patch.phase; state.sliding = patch.phase === "release" || patch.phase === "sliding"; } if (patch.sliding !== undefined) { state.sliding = Boolean(patch.sliding); state.phase = state.sliding ? "sliding" : "static"; } if (patch.position !== undefined) state.position = Math.max(0, Number(patch.position)); if (structural && state.phase !== "static") { state.phase = "static"; state.sliding = false; state.position = 0; state.velocity = 0; } if (!state.running && patch.targetForce !== undefined && patch.appliedForce === undefined) state.appliedForce = state.targetForce; if (state.phase === "static" && state.appliedForce > calculate({ ...state, phase: "static" }).maxStatic + EPSILON) beginRelease(state.appliedForce); refs.massInput.value = state.mass; refs.staticMuInput.value = state.muS; refs.kineticMuInput.value = state.muK; refs.forceInput.value = state.targetForce; refs.rampRateInput.value = state.rampRate; render(); }
function applyMode(mode) { state.mode = mode; resetMotion(); const d = calculate(); if (mode === "adaptive") state.appliedForce = Math.min(4, d.maxStatic * .45); if (mode === "threshold") state.appliedForce = state.targetForce = d.maxStatic; if (mode === "slide") beginRelease(Math.min(30, d.maxStatic + .1)); if (mode === "compare") state.appliedForce = 0; refs.forceInput.value = state.targetForce; render(); }
function startScan() { resetMotion(false); state.targetForce = calculate().maxStatic; state.running = true; state.ramping = true; render(); }
function recordSample() { const d = calculate(); state.samples.push({ force: state.appliedForce, friction: d.friction, acceleration: d.acceleration, sliding: d.sliding }); if (state.samples.length > 40) state.samples.shift(); render(); }

refs.massInput.addEventListener("input", () => setParameters({ mass: refs.massInput.value })); refs.staticMuInput.addEventListener("input", () => setParameters({ muS: refs.staticMuInput.value, muK: Math.min(state.muK, Number(refs.staticMuInput.value)) })); refs.kineticMuInput.addEventListener("input", () => setParameters({ muK: refs.kineticMuInput.value })); refs.forceInput.addEventListener("input", () => setParameters({ targetForce: refs.forceInput.value })); refs.rampRateInput.addEventListener("input", () => setParameters({ rampRate: refs.rampRateInput.value })); refs.sceneTabs.forEach(b => b.addEventListener("click", () => applyMode(b.dataset.mode))); refs.routeSteps.forEach((b, i) => b.addEventListener("click", () => setParameters({ guideStep: i })));
let forceDragging = false;
function pointerForce(event) { const rect = refs.canvas.getBoundingClientRect(), localX = event.clientX - rect.left, force = clamp((localX - geometry.forceOriginX) / geometry.forceScale, 0, 30), maxStatic = calculate({ ...state, phase: "static" }).maxStatic; state.running = false; state.ramping = false; state.targetForce = force; if (state.phase === "release") return; if (force > maxStatic + EPSILON) beginRelease(force); else { state.appliedForce = force; state.phase = "static"; state.sliding = false; } render(); }
refs.canvas.addEventListener("pointerdown", event => { const rect = refs.canvas.getBoundingClientRect(), p = { x: event.clientX - rect.left, y: event.clientY - rect.top }, h = geometry.handle; if (!h || Math.hypot(p.x - h.x, p.y - h.y) > 32 || state.phase === "release") return; forceDragging = true; state.dragging = true; refs.canvas.classList.add("is-dragging"); refs.canvas.setPointerCapture?.(event.pointerId); });
refs.canvas.addEventListener("pointermove", event => { const rect = refs.canvas.getBoundingClientRect(), p = { x: event.clientX - rect.left, y: event.clientY - rect.top }, h = geometry.handle; if (!forceDragging) { refs.canvas.style.cursor = h && Math.hypot(p.x - h.x, p.y - h.y) <= 32 ? "grab" : "default"; return; } refs.canvas.style.cursor = "grabbing"; pointerForce(event); });
refs.canvas.addEventListener("pointerup", event => { forceDragging = false; state.dragging = false; refs.canvas.classList.remove("is-dragging"); refs.canvas.style.cursor = "default"; if (refs.canvas.hasPointerCapture?.(event.pointerId)) refs.canvas.releasePointerCapture(event.pointerId); render(); }); refs.canvas.addEventListener("pointercancel", () => { forceDragging = false; state.dragging = false; refs.canvas.classList.remove("is-dragging"); render(); });
refs.scanButton.addEventListener("click", startScan); refs.pauseButton.addEventListener("click", () => { state.running = false; state.ramping = false; render(); }); refs.restartButton.addEventListener("click", startScan); refs.thresholdButton.addEventListener("click", () => { state.mode = "threshold"; resetMotion(); const d = calculate(); state.targetForce = state.appliedForce = d.maxStatic; refs.forceInput.value = state.targetForce; render(); }); refs.breakButton.addEventListener("click", () => { state.mode = "slide"; const d = calculate({ ...state, phase: "static" }); beginRelease(Math.min(30, d.maxStatic + .1)); render(); }); refs.recordButton.addEventListener("click", recordSample); refs.clearDataButton.addEventListener("click", () => { state.samples = []; render(); }); refs.resetButton.addEventListener("click", () => { Object.assign(state, { mass: 2, muS: .5, muK: .3, targetForce: 14, appliedForce: 0, rampRate: 3, mode: "adaptive", guideStep: 0, samples: [] }); resetMotion(); refs.massInput.value = 2; refs.staticMuInput.value = .5; refs.kineticMuInput.value = .3; refs.forceInput.value = 14; refs.rampRateInput.value = 3; render(); }); [[refs.showForcesToggle, "showForces"], [refs.showNetToggle, "showNet"], [refs.showContactToggle, "showContact"], [refs.showTrailToggle, "showTrail"]].forEach(([input, key]) => input.addEventListener("change", () => { state[key] = input.checked; render(); })); refs.guideButton.addEventListener("click", () => refs.guideDialog.showModal()); refs.stepButton.addEventListener("click", () => { state.guideStep = (state.guideStep + 1) % guide.length; render(); }); refs.focusButton.addEventListener("click", () => { const active = document.body.classList.toggle("focus-mode"); refs.focusButton.setAttribute("aria-pressed", String(active)); }); refs.fullscreenButton.addEventListener("click", () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()); window.addEventListener("resize", render);
let previousFrame = performance.now(); function frame(now) { const dt = Math.min(.05, Math.max(0, (now - previousFrame) / 1000)); previousFrame = now; if (state.running && state.ramping) { state.appliedForce = Math.min(state.targetForce, state.appliedForce + state.rampRate * dt); if (state.appliedForce >= state.targetForce - EPSILON) { state.appliedForce = state.targetForce; state.ramping = false; state.running = false; state.phase = "static"; } } if (state.running && !state.ramping) advance(dt); if (state.running || state.phase === "release") render(); requestAnimationFrame(frame); }
window.frictionLab = { calculate: source => calculate({ ...state, ...source }), getState: () => ({ ...state, history: state.history.map(p => ({ ...p })), samples: state.samples.map(p => ({ ...p })) }), getInteractionGeometry: () => JSON.parse(JSON.stringify(geometry)), setState: patch => setParameters(patch), setMode: applyMode, resetMotion, recordSample, step: advance };
render(); requestAnimationFrame(frame);
