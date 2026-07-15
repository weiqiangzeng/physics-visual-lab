const frictionState = {
  mass: 1,
  staticMu: 0.5,
  kineticMu: 0.35,
  forceTarget: 5,
  force: 0,
  running: false,
  mode: "increase",
  showVectors: true,
  showGraph: true,
  demoMode: false
};

const frictionRefs = {
  canvas: document.getElementById("frictionCanvas"),
  startButton: document.getElementById("startButton"),
  pauseButton: document.getElementById("pauseButton"),
  resetButton: document.getElementById("resetButton"),
  presetTitle: document.getElementById("presetTitle"),
  presetButtons: Array.from(document.querySelectorAll(".preset-button")),
  modeGoal: document.getElementById("modeGoal"),
  modePrompt: document.getElementById("modePrompt"),
  modeFormula: document.getElementById("modeFormula"),
  massInput: document.getElementById("massInput"),
  massNumber: document.getElementById("massNumber"),
  staticMuInput: document.getElementById("staticMuInput"),
  staticMuNumber: document.getElementById("staticMuNumber"),
  kineticMuInput: document.getElementById("kineticMuInput"),
  kineticMuNumber: document.getElementById("kineticMuNumber"),
  forceInput: document.getElementById("forceInput"),
  forceNumber: document.getElementById("forceNumber"),
  massValue: document.getElementById("massValue"),
  staticMuValue: document.getElementById("staticMuValue"),
  kineticMuValue: document.getElementById("kineticMuValue"),
  forceValue: document.getElementById("forceValue"),
  appliedMetric: document.getElementById("appliedMetric"),
  frictionMetric: document.getElementById("frictionMetric"),
  maxStaticMetric: document.getElementById("maxStaticMetric"),
  accelMetric: document.getElementById("accelMetric"),
  stateMetric: document.getElementById("stateMetric"),
  criticalCards: Array.from(document.querySelectorAll(".critical-card[data-jump]")),
  criticalStateLabel: document.getElementById("criticalStateLabel"),
  criticalStateNote: document.getElementById("criticalStateNote"),
  showVectorsToggle: document.getElementById("showVectorsToggle"),
  showGraphToggle: document.getElementById("showGraphToggle"),
  demoModeToggle: document.getElementById("demoModeToggle"),
  overviewForce: document.getElementById("overviewForce"),
  overviewState: document.getElementById("overviewState")
};

const frictionCtx = frictionRefs.canvas.getContext("2d");
const frictionWidth = 980;
const frictionHeight = 540;
const frictionDpr = window.devicePixelRatio || 1;
frictionRefs.canvas.width = frictionWidth * frictionDpr;
frictionRefs.canvas.height = frictionHeight * frictionDpr;
frictionCtx.scale(frictionDpr, frictionDpr);

const frictionModes = {
  increase: { title: "逐渐增大外力", goal: "找到最大静摩擦力", prompt: "让外力从 0 增大，比较外力、摩擦力和加速度的读数。", formula: "0 ≤ f静 ≤ μsN" },
  threshold: { title: "临界状态", goal: "定位开始滑动的瞬间", prompt: "把目标外力调到最大静摩擦力附近，观察物体即将运动的状态。", formula: "fmax = μsN" },
  slide: { title: "滑动后比较", goal: "比较静摩擦力与滑动摩擦力", prompt: "让外力超过临界值，观察滑动摩擦力不再随外力增加。", formula: "f滑 = μkN" }
};

let frictionLastFrame = null;

function frictionFormat(value, digits = 2, unit = "") {
  const text = Number.isFinite(value) ? value.toFixed(digits) : "--";
  return unit ? `${text} ${unit}` : text;
}

function frictionClamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function frictionDerived() {
  const normal = frictionState.mass * 9.8;
  const maxStatic = frictionState.staticMu * normal;
  const kinetic = Math.min(frictionState.kineticMu, frictionState.staticMu) * normal;
  const sliding = frictionState.force > maxStatic + 0.001;
  const friction = sliding ? kinetic : frictionState.force;
  const acceleration = sliding ? (frictionState.force - friction) / frictionState.mass : 0;
  return { normal, maxStatic, kinetic, sliding, friction, acceleration };
}

function frictionArrow(fromX, fromY, toX, toY, color, label) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  frictionCtx.save();
  frictionCtx.strokeStyle = color;
  frictionCtx.fillStyle = color;
  frictionCtx.lineWidth = frictionState.demoMode ? 4 : 2.8;
  frictionCtx.beginPath();
  frictionCtx.moveTo(fromX, fromY);
  frictionCtx.lineTo(toX, toY);
  frictionCtx.stroke();
  frictionCtx.beginPath();
  frictionCtx.moveTo(toX, toY);
  frictionCtx.lineTo(toX - 12 * Math.cos(angle - Math.PI / 6), toY - 12 * Math.sin(angle - Math.PI / 6));
  frictionCtx.lineTo(toX - 12 * Math.cos(angle + Math.PI / 6), toY - 12 * Math.sin(angle + Math.PI / 6));
  frictionCtx.closePath();
  frictionCtx.fill();
  frictionCtx.font = "700 13px Avenir Next, PingFang SC, sans-serif";
  frictionCtx.fillText(label, toX + (toX >= fromX ? 8 : -32), toY - 8);
  frictionCtx.restore();
}

function frictionDrawTop(derived) {
  const blockX = 285;
  const blockY = 92;
  const blockWidth = 190;
  const blockHeight = 84;
  const trackY = 218;
  frictionCtx.strokeStyle = "rgba(18, 31, 36, 0.25)";
  frictionCtx.lineWidth = 2;
  frictionCtx.beginPath();
  frictionCtx.moveTo(80, trackY);
  frictionCtx.lineTo(900, trackY);
  frictionCtx.stroke();
  frictionCtx.fillStyle = "rgba(13, 113, 104, 0.12)";
  frictionCtx.strokeStyle = "#0d7168";
  frictionCtx.lineWidth = 2;
  frictionCtx.fillRect(blockX, blockY, blockWidth, blockHeight);
  frictionCtx.strokeRect(blockX, blockY, blockWidth, blockHeight);
  frictionCtx.fillStyle = "#121f24";
  frictionCtx.font = "700 17px Avenir Next, PingFang SC, sans-serif";
  frictionCtx.fillText("物体", blockX + 72, blockY + 48);
  frictionCtx.fillStyle = "#121f24";
  frictionCtx.beginPath();
  frictionCtx.arc(blockX + 40, trackY + 1, 7, 0, Math.PI * 2);
  frictionCtx.arc(blockX + blockWidth - 40, trackY + 1, 7, 0, Math.PI * 2);
  frictionCtx.fill();
  frictionCtx.fillStyle = "#5c686d";
  frictionCtx.font = "12px Avenir Next, PingFang SC, sans-serif";
  frictionCtx.fillText("接触面", 80, trackY + 28);
  if (frictionState.showVectors) {
    const forceScale = 16 + frictionState.force * 6;
    const frictionScale = 16 + derived.friction * 6;
    frictionArrow(blockX + blockWidth, blockY + blockHeight / 2, blockX + blockWidth + forceScale, blockY + blockHeight / 2, "#1f78b4", "F外");
    frictionArrow(blockX, blockY + blockHeight / 2, blockX - frictionScale, blockY + blockHeight / 2, "#c96b29", "f");
    frictionArrow(blockX + blockWidth / 2, blockY, blockX + blockWidth / 2, blockY - 62, "#7b3fa0", "N");
    frictionArrow(blockX + blockWidth / 2, blockY + blockHeight, blockX + blockWidth / 2, blockY + blockHeight + 62, "#121f24", "mg");
  }
  frictionCtx.fillStyle = derived.sliding ? "#c96b29" : "#0d7168";
  frictionCtx.font = "700 16px Avenir Next, PingFang SC, sans-serif";
  frictionCtx.fillText(derived.sliding ? "已发生相对滑动" : "相对静止", 680, 108);
  frictionCtx.fillStyle = "#5c686d";
  frictionCtx.font = "12px Avenir Next, PingFang SC, sans-serif";
  frictionCtx.fillText("受力图：先判断接触状态，再决定摩擦力模型", 680, 132);
}

function frictionDrawGraph(derived) {
  if (!frictionState.showGraph) return;
  const x = 86;
  const y = 284;
  const width = 810;
  const height = 190;
  const maxForce = 12;
  const maxValue = Math.max(derived.maxStatic, derived.kinetic, 1) * 1.35;
  const mapX = (value) => x + (value / maxForce) * width;
  const mapY = (value) => y + height - (value / maxValue) * height;
  frictionCtx.strokeStyle = "rgba(18, 31, 36, 0.22)";
  frictionCtx.lineWidth = 1.4;
  frictionCtx.beginPath();
  frictionCtx.moveTo(x, y);
  frictionCtx.lineTo(x, y + height);
  frictionCtx.lineTo(x + width, y + height);
  frictionCtx.stroke();
  for (let index = 0; index <= 6; index += 1) {
    const value = (maxForce * index) / 6;
    const px = mapX(value);
    frictionCtx.strokeStyle = "rgba(18, 31, 36, 0.06)";
    frictionCtx.beginPath();
    frictionCtx.moveTo(px, y);
    frictionCtx.lineTo(px, y + height);
    frictionCtx.stroke();
    frictionCtx.fillStyle = "#5c686d";
    frictionCtx.font = "11px Avenir Next, PingFang SC, sans-serif";
    frictionCtx.fillText(value.toFixed(1), px - 8, y + height + 18);
  }
  for (let index = 0; index <= 3; index += 1) {
    const value = (maxValue * index) / 3;
    const py = mapY(value);
    frictionCtx.strokeStyle = "rgba(18, 31, 36, 0.06)";
    frictionCtx.beginPath();
    frictionCtx.moveTo(x, py);
    frictionCtx.lineTo(x + width, py);
    frictionCtx.stroke();
    frictionCtx.fillStyle = "#5c686d";
    frictionCtx.fillText(value.toFixed(1), x - 34, py + 4);
  }
  frictionCtx.fillStyle = "#121f24";
  frictionCtx.font = "700 13px Avenir Next, PingFang SC, sans-serif";
  frictionCtx.fillText("摩擦力 f / N", x, y - 12);
  frictionCtx.font = "12px Avenir Next, PingFang SC, sans-serif";
  frictionCtx.fillText("外力 F外 / N", x + width - 66, y + height + 38);
  frictionCtx.strokeStyle = "#c96b29";
  frictionCtx.lineWidth = frictionState.demoMode ? 4 : 2.8;
  frictionCtx.beginPath();
  frictionCtx.moveTo(mapX(0), mapY(0));
  frictionCtx.lineTo(mapX(derived.maxStatic), mapY(derived.maxStatic));
  frictionCtx.lineTo(mapX(maxForce), mapY(derived.kinetic));
  frictionCtx.stroke();
  frictionCtx.fillStyle = "#c96b29";
  frictionCtx.beginPath();
  frictionCtx.arc(mapX(frictionState.force), mapY(derived.friction), frictionState.demoMode ? 8 : 6, 0, Math.PI * 2);
  frictionCtx.fill();
  frictionCtx.strokeStyle = "rgba(13, 113, 104, 0.55)";
  frictionCtx.setLineDash([6, 5]);
  frictionCtx.beginPath();
  frictionCtx.moveTo(mapX(frictionState.force), y);
  frictionCtx.lineTo(mapX(frictionState.force), y + height);
  frictionCtx.stroke();
  frictionCtx.setLineDash([]);
  frictionCtx.fillStyle = "#0d7168";
  frictionCtx.font = "700 12px Avenir Next, PingFang SC, sans-serif";
  frictionCtx.fillText("fmax", mapX(derived.maxStatic) + 8, mapY(derived.maxStatic) - 8);
}

function frictionCriticalState(derived) {
  if (derived.sliding) return { key: "slide", label: "滑动", note: "滑动摩擦力近似保持为 μkN，合力使物体加速。" };
  if (Math.abs(frictionState.force - derived.maxStatic) < 0.08) return { key: "limit", label: "临界状态", note: "静摩擦力已达到最大值，再增大外力就会滑动。" };
  return { key: "static", label: "静止", note: "外力被静摩擦力完全抵消，物体没有加速度。" };
}

function frictionSyncReadouts() {
  const derived = frictionDerived();
  const critical = frictionCriticalState(derived);
  frictionRefs.massValue.textContent = frictionFormat(frictionState.mass, 2, "kg");
  frictionRefs.staticMuValue.textContent = frictionFormat(frictionState.staticMu, 2);
  frictionRefs.kineticMuValue.textContent = frictionFormat(frictionState.kineticMu, 2);
  frictionRefs.forceValue.textContent = frictionFormat(frictionState.forceTarget, 2, "N");
  frictionRefs.appliedMetric.textContent = frictionFormat(frictionState.force, 2, "N");
  frictionRefs.frictionMetric.textContent = frictionFormat(derived.friction, 2, "N");
  frictionRefs.maxStaticMetric.textContent = frictionFormat(derived.maxStatic, 2, "N");
  frictionRefs.accelMetric.textContent = frictionFormat(derived.acceleration, 2, "m/s²");
  frictionRefs.stateMetric.textContent = critical.label;
  frictionRefs.overviewForce.textContent = frictionFormat(frictionState.force, 2, "N");
  frictionRefs.overviewState.textContent = critical.label;
  frictionRefs.criticalStateLabel.textContent = critical.label;
  frictionRefs.criticalStateNote.textContent = critical.note;
  frictionRefs.criticalCards.forEach((card) => card.classList.toggle("active", card.dataset.jump === critical.key));
}

function frictionSyncInputs() {
  frictionRefs.massInput.value = frictionState.mass;
  frictionRefs.massNumber.value = frictionState.mass;
  frictionRefs.staticMuInput.value = frictionState.staticMu;
  frictionRefs.staticMuNumber.value = frictionState.staticMu;
  frictionRefs.kineticMuInput.value = frictionState.kineticMu;
  frictionRefs.kineticMuNumber.value = frictionState.kineticMu;
  frictionRefs.forceInput.value = frictionState.forceTarget;
  frictionRefs.forceNumber.value = frictionState.forceTarget;
  frictionRefs.showVectorsToggle.checked = frictionState.showVectors;
  frictionRefs.showGraphToggle.checked = frictionState.showGraph;
  frictionRefs.demoModeToggle.checked = frictionState.demoMode;
  const config = frictionModes[frictionState.mode];
  frictionRefs.presetTitle.textContent = config.title;
  frictionRefs.modeGoal.textContent = config.goal;
  frictionRefs.modePrompt.textContent = config.prompt;
  frictionRefs.modeFormula.textContent = config.formula;
  frictionRefs.presetButtons.forEach((button) => button.classList.toggle("active", button.dataset.mode === frictionState.mode));
}

function frictionRender() {
  const derived = frictionDerived();
  frictionCtx.clearRect(0, 0, frictionWidth, frictionHeight);
  frictionCtx.fillStyle = "#fbfcfa";
  frictionCtx.fillRect(0, 0, frictionWidth, frictionHeight);
  frictionDrawTop(derived);
  frictionDrawGraph(derived);
  frictionSyncReadouts();
}

function frictionSetValue(key, value) {
  const limits = { mass: [0.5, 5], staticMu: [0.1, 1], kineticMu: [0.05, 0.8], forceTarget: [0, 12] };
  frictionState[key] = frictionClamp(Number(value) || 0, limits[key][0], limits[key][1]);
  if (key === "staticMu" && frictionState.kineticMu > frictionState.staticMu) frictionState.kineticMu = frictionState.staticMu;
  if (!frictionState.running) frictionState.force = frictionState.forceTarget;
  frictionSyncInputs();
  frictionRender();
}

function frictionBindPair(range, number, key) {
  range.addEventListener("input", () => frictionSetValue(key, range.value));
  number.addEventListener("change", () => frictionSetValue(key, number.value));
}

function frictionApplyMode(mode) {
  frictionState.mode = mode;
  const derived = frictionDerived();
  if (mode === "threshold") frictionState.forceTarget = derived.maxStatic;
  if (mode === "slide") frictionState.forceTarget = Math.min(12, derived.maxStatic + 2);
  if (mode === "increase") frictionState.forceTarget = 5;
  frictionState.force = mode === "increase" ? 0 : frictionState.forceTarget;
  frictionState.running = false;
  frictionSyncInputs();
  frictionRender();
}

function frictionFrame(now) {
  if (frictionState.running) {
    if (frictionLastFrame === null) frictionLastFrame = now;
    frictionState.force = Math.min(frictionState.forceTarget, frictionState.force + ((now - frictionLastFrame) / 1000) * 3);
    if (frictionState.force >= frictionState.forceTarget - 0.001) frictionState.running = false;
    frictionLastFrame = now;
    frictionRender();
  } else {
    frictionLastFrame = null;
  }
  requestAnimationFrame(frictionFrame);
}

frictionBindPair(frictionRefs.massInput, frictionRefs.massNumber, "mass");
frictionBindPair(frictionRefs.staticMuInput, frictionRefs.staticMuNumber, "staticMu");
frictionBindPair(frictionRefs.kineticMuInput, frictionRefs.kineticMuNumber, "kineticMu");
frictionBindPair(frictionRefs.forceInput, frictionRefs.forceNumber, "forceTarget");
frictionRefs.startButton.addEventListener("click", () => { frictionState.running = true; frictionRender(); });
frictionRefs.pauseButton.addEventListener("click", () => { frictionState.running = false; frictionRender(); });
frictionRefs.resetButton.addEventListener("click", () => { frictionState.force = 0; frictionState.running = false; frictionRender(); });
frictionRefs.presetButtons.forEach((button) => button.addEventListener("click", () => frictionApplyMode(button.dataset.mode)));
frictionRefs.criticalCards.forEach((card) => card.addEventListener("click", () => {
  const mode = card.dataset.jump === "static" ? "increase" : card.dataset.jump;
  frictionApplyMode(mode === "limit" ? "threshold" : mode === "slide" ? "slide" : "increase");
}));
frictionRefs.showVectorsToggle.addEventListener("change", () => { frictionState.showVectors = frictionRefs.showVectorsToggle.checked; frictionRender(); });
frictionRefs.showGraphToggle.addEventListener("change", () => { frictionState.showGraph = frictionRefs.showGraphToggle.checked; frictionRender(); });
frictionRefs.demoModeToggle.addEventListener("change", () => { frictionState.demoMode = frictionRefs.demoModeToggle.checked; document.body.classList.toggle("demo-mode", frictionState.demoMode); frictionRender(); });
frictionSyncInputs();
frictionRender();
requestAnimationFrame(frictionFrame);
