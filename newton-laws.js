const newtonState = {
  mass: 1,
  force: 3,
  resistance: 0.5,
  time: 0,
  velocity: 0,
  position: 0,
  mode: "force",
  running: false,
  showVectors: true,
  showGraph: true,
  demoMode: false
};

const newtonRefs = {
  canvas: document.getElementById("newtonCanvas"),
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
  forceInput: document.getElementById("forceInput"),
  forceNumber: document.getElementById("forceNumber"),
  resistanceInput: document.getElementById("resistanceInput"),
  resistanceNumber: document.getElementById("resistanceNumber"),
  massValue: document.getElementById("massValue"),
  forceValue: document.getElementById("forceValue"),
  resistanceValue: document.getElementById("resistanceValue"),
  netForceMetric: document.getElementById("netForceMetric"),
  massMetric: document.getElementById("massMetric"),
  accelMetric: document.getElementById("accelMetric"),
  velocityMetric: document.getElementById("velocityMetric"),
  positionMetric: document.getElementById("positionMetric"),
  criticalCards: Array.from(document.querySelectorAll(".critical-card[data-jump]")),
  criticalStateLabel: document.getElementById("criticalStateLabel"),
  criticalStateNote: document.getElementById("criticalStateNote"),
  showVectorsToggle: document.getElementById("showVectorsToggle"),
  showGraphToggle: document.getElementById("showGraphToggle"),
  demoModeToggle: document.getElementById("demoModeToggle"),
  overviewForce: document.getElementById("overviewForce"),
  overviewAccel: document.getElementById("overviewAccel")
};

const newtonCtx = newtonRefs.canvas.getContext("2d");
const newtonWidth = 980;
const newtonHeight = 540;
const newtonDpr = window.devicePixelRatio || 1;
newtonRefs.canvas.width = newtonWidth * newtonDpr;
newtonRefs.canvas.height = newtonHeight * newtonDpr;
newtonCtx.scale(newtonDpr, newtonDpr);

const newtonModes = {
  force: { title: "改变合力", goal: "改变合力，观察加速度", prompt: "保持质量不变，逐渐增大外力，比较合力和加速度的变化。", formula: "\\(a = \\frac{F_{\\mathrm{合}}}{m}\\)" },
  mass: { title: "改变质量", goal: "改变质量，观察加速度", prompt: "保持合力不变，增加质量，观察相同时间内速度变化如何减小。", formula: "\\(a \\propto \\frac{1}{m}\\)" },
  balance: { title: "合力为零", goal: "理解 a = 0 的运动状态", prompt: "把外力和阻力调成相等，观察物体仍可保持原有速度。", formula: "\\(F_{\\mathrm{合}} = 0 \\Rightarrow a = 0\\)" }
};

let newtonLastFrame = null;

function newtonFormat(value, digits = 2, unit = "") {
  const text = Number.isFinite(value) ? value.toFixed(digits) : "--";
  return unit ? `${text} ${unit}` : text;
}

function newtonClamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function newtonDerived() {
  const netForce = newtonState.force - newtonState.resistance;
  return { netForce, acceleration: netForce / newtonState.mass };
}

function newtonArrow(fromX, fromY, toX, toY, color, label) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  newtonCtx.save();
  newtonCtx.strokeStyle = color;
  newtonCtx.fillStyle = color;
  newtonCtx.lineWidth = newtonState.demoMode ? 4 : 2.8;
  newtonCtx.beginPath();
  newtonCtx.moveTo(fromX, fromY);
  newtonCtx.lineTo(toX, toY);
  newtonCtx.stroke();
  newtonCtx.beginPath();
  newtonCtx.moveTo(toX, toY);
  newtonCtx.lineTo(toX - 12 * Math.cos(angle - Math.PI / 6), toY - 12 * Math.sin(angle - Math.PI / 6));
  newtonCtx.lineTo(toX - 12 * Math.cos(angle + Math.PI / 6), toY - 12 * Math.sin(angle + Math.PI / 6));
  newtonCtx.closePath();
  newtonCtx.fill();
  newtonCtx.font = "700 13px Avenir Next, PingFang SC, sans-serif";
  newtonCtx.fillText(label, toX + 8, toY - 8);
  newtonCtx.restore();
}

function newtonDrawTrack(derived) {
  const trackY = 144;
  const left = 80;
  const right = 900;
  const cartX = left + ((newtonState.position % 7 + 7) % 7) / 7 * (right - left);
  newtonCtx.strokeStyle = "rgba(18, 31, 36, 0.24)";
  newtonCtx.lineWidth = 2;
  newtonCtx.beginPath();
  newtonCtx.moveTo(left, trackY + 50);
  newtonCtx.lineTo(right, trackY + 50);
  newtonCtx.stroke();
  newtonCtx.fillStyle = "rgba(13, 113, 104, 0.12)";
  newtonCtx.strokeStyle = "#0d7168";
  newtonCtx.lineWidth = 2;
  newtonCtx.fillRect(cartX - 52, trackY - 4, 104, 54);
  newtonCtx.strokeRect(cartX - 52, trackY - 4, 104, 54);
  newtonCtx.fillStyle = "#121f24";
  newtonCtx.beginPath();
  newtonCtx.arc(cartX - 32, trackY + 52, 7, 0, Math.PI * 2);
  newtonCtx.arc(cartX + 32, trackY + 52, 7, 0, Math.PI * 2);
  newtonCtx.fill();
  newtonCtx.fillStyle = "#121f24";
  newtonCtx.font = "700 15px Avenir Next, PingFang SC, sans-serif";
  newtonCtx.fillText("m", cartX - 5, trackY + 30);
  if (newtonState.showVectors) {
    const forceScale = 20 + newtonState.force * 10;
    const resistanceScale = 20 + newtonState.resistance * 10;
    newtonArrow(cartX + 52, trackY + 22, cartX + 52 + forceScale, trackY + 22, "#1f78b4", "F外");
    newtonArrow(cartX - 52, trackY + 22, cartX - 52 - resistanceScale, trackY + 22, "#c96b29", "f");
    if (Math.abs(derived.acceleration) > 0.01) newtonArrow(cartX, trackY - 16, cartX + Math.sign(derived.acceleration) * (30 + Math.abs(derived.acceleration) * 24), trackY - 16, "#7b3fa0", "a");
  }
  newtonCtx.fillStyle = "#5c686d";
  newtonCtx.font = "12px Avenir Next, PingFang SC, sans-serif";
  newtonCtx.fillText("合外力决定加速度，速度是运动状态", left, trackY + 94);
}

function newtonDrawGraph(derived) {
  if (!newtonState.showGraph) return;
  const x = 86;
  const y = 284;
  const width = 810;
  const height = 188;
  const graphMode = newtonState.mode === "mass" ? "mass" : "force";
  const xMax = graphMode === "mass" ? 5 : 8;
  const xMin = graphMode === "mass" ? 0.5 : 0;
  const positiveLimit = graphMode === "mass"
    ? (newtonState.force - newtonState.resistance) / 0.5
    : (8 - newtonState.resistance) / newtonState.mass;
  const negativeLimit = graphMode === "mass"
    ? (newtonState.force - newtonState.resistance) / 5
    : -newtonState.resistance / newtonState.mass;
  const yMin = Math.min(negativeLimit, 0) * 1.2;
  const yMax = Math.max(positiveLimit, 0, 1) * 1.2;
  const mapX = (value) => x + ((value - xMin) / (xMax - xMin)) * width;
  const mapY = (value) => y + height - ((value - yMin) / (yMax - yMin || 1)) * height;
  newtonCtx.strokeStyle = "rgba(18, 31, 36, 0.22)";
  newtonCtx.lineWidth = 1.4;
  newtonCtx.beginPath();
  newtonCtx.moveTo(x, y);
  newtonCtx.lineTo(x, y + height);
  newtonCtx.lineTo(x + width, y + height);
  newtonCtx.stroke();
  for (let index = 0; index <= 5; index += 1) {
    const value = xMin + ((xMax - xMin) * index) / 5;
    const px = mapX(value);
    newtonCtx.strokeStyle = "rgba(18, 31, 36, 0.06)";
    newtonCtx.beginPath();
    newtonCtx.moveTo(px, y);
    newtonCtx.lineTo(px, y + height);
    newtonCtx.stroke();
    newtonCtx.fillStyle = "#5c686d";
    newtonCtx.font = "11px Avenir Next, PingFang SC, sans-serif";
    newtonCtx.fillText(value.toFixed(1), px - 8, y + height + 18);
  }
  for (let index = 0; index <= 4; index += 1) {
    const value = yMin + ((yMax - yMin) * index) / 4;
    const py = mapY(value);
    newtonCtx.strokeStyle = "rgba(18, 31, 36, 0.06)";
    newtonCtx.beginPath();
    newtonCtx.moveTo(x, py);
    newtonCtx.lineTo(x + width, py);
    newtonCtx.stroke();
    newtonCtx.fillStyle = "#5c686d";
    newtonCtx.fillText(value.toFixed(1), x - 34, py + 4);
  }
  newtonCtx.fillStyle = "#121f24";
  newtonCtx.font = "700 13px Avenir Next, PingFang SC, sans-serif";
  newtonCtx.fillText(graphMode === "mass" ? "a / (m/s²)" : "a / (m/s²)", x, y - 12);
  newtonCtx.font = "12px Avenir Next, PingFang SC, sans-serif";
  newtonCtx.fillText(graphMode === "mass" ? "质量 m / kg" : "外力 F外 / N", x + width - 70, y + height + 38);
  newtonCtx.strokeStyle = "#0d7168";
  newtonCtx.lineWidth = newtonState.demoMode ? 4 : 2.8;
  newtonCtx.beginPath();
  for (let index = 0; index <= 70; index += 1) {
    const input = xMin + ((xMax - xMin) * index) / 70;
    const acceleration = graphMode === "mass" ? (newtonState.force - newtonState.resistance) / input : (input - newtonState.resistance) / newtonState.mass;
    const px = mapX(input);
    const py = mapY(acceleration);
    if (index === 0) newtonCtx.moveTo(px, py);
    else newtonCtx.lineTo(px, py);
  }
  newtonCtx.stroke();
  const currentInput = graphMode === "mass" ? newtonState.mass : newtonState.force;
  const currentAccel = derived.acceleration;
  newtonCtx.fillStyle = "#c96b29";
  newtonCtx.beginPath();
  newtonCtx.arc(mapX(currentInput), mapY(currentAccel), newtonState.demoMode ? 8 : 6, 0, Math.PI * 2);
  newtonCtx.fill();
}

function newtonCriticalState(derived) {
  if (Math.abs(derived.netForce) < 0.01) return { key: "balance", label: "合力为零", note: "加速度为零，物体可以保持静止或匀速直线运动。" };
  if (newtonState.mode === "mass") return { key: "mass", label: "质量影响加速度", note: "合力相同，质量越大，加速度越小。" };
  if (derived.netForce < 0) return { key: "force", label: "向左加速", note: "合力方向与加速度方向相同，速度向右时会逐渐减小。" };
  return { key: "force", label: "正在加速", note: "合力方向与加速度方向相同，速度正在改变。" };
}

function newtonSyncReadouts() {
  const derived = newtonDerived();
  const critical = newtonCriticalState(derived);
  newtonRefs.massValue.textContent = newtonFormat(newtonState.mass, 2, "kg");
  newtonRefs.forceValue.textContent = newtonFormat(newtonState.force, 2, "N");
  newtonRefs.resistanceValue.textContent = newtonFormat(newtonState.resistance, 2, "N");
  newtonRefs.netForceMetric.textContent = newtonFormat(derived.netForce, 2, "N");
  newtonRefs.massMetric.textContent = newtonFormat(newtonState.mass, 2, "kg");
  newtonRefs.accelMetric.textContent = newtonFormat(derived.acceleration, 2, "m/s²");
  newtonRefs.velocityMetric.textContent = newtonFormat(newtonState.velocity, 2, "m/s");
  newtonRefs.positionMetric.textContent = newtonFormat(newtonState.position, 2, "m");
  newtonRefs.overviewForce.textContent = newtonFormat(derived.netForce, 2, "N");
  newtonRefs.overviewAccel.textContent = newtonFormat(derived.acceleration, 2, "m/s²");
  newtonRefs.startButton.textContent = newtonState.running ? "运行中" : "开始";
  newtonRefs.startButton.classList.toggle("primary", !newtonState.running);
  newtonRefs.criticalStateLabel.textContent = critical.label;
  newtonRefs.criticalStateNote.textContent = critical.note;
  newtonRefs.criticalCards.forEach((card) => card.classList.toggle("active", card.dataset.jump === critical.key));
}

function newtonSyncInputs() {
  newtonRefs.massInput.value = newtonState.mass;
  newtonRefs.massNumber.value = newtonState.mass;
  newtonRefs.forceInput.value = newtonState.force;
  newtonRefs.forceNumber.value = newtonState.force;
  newtonRefs.resistanceInput.value = newtonState.resistance;
  newtonRefs.resistanceNumber.value = newtonState.resistance;
  newtonRefs.showVectorsToggle.checked = newtonState.showVectors;
  newtonRefs.showGraphToggle.checked = newtonState.showGraph;
  newtonRefs.demoModeToggle.checked = newtonState.demoMode;
  const config = newtonModes[newtonState.mode];
  newtonRefs.presetTitle.textContent = config.title;
  newtonRefs.modeGoal.textContent = config.goal;
  newtonRefs.modePrompt.textContent = config.prompt;
  newtonRefs.modeFormula.textContent = config.formula;
  window.physicsTypesetMath?.();
  newtonRefs.presetButtons.forEach((button) => button.classList.toggle("active", button.dataset.mode === newtonState.mode));
}

function newtonRender() {
  const derived = newtonDerived();
  newtonCtx.clearRect(0, 0, newtonWidth, newtonHeight);
  newtonCtx.fillStyle = "#fbfcfa";
  newtonCtx.fillRect(0, 0, newtonWidth, newtonHeight);
  newtonDrawTrack(derived);
  newtonDrawGraph(derived);
  newtonSyncReadouts();
}

function newtonSetValue(key, value) {
  const limits = { mass: [0.5, 5], force: [0, 8], resistance: [0, 3] };
  newtonState[key] = newtonClamp(Number(value) || 0, limits[key][0], limits[key][1]);
  if (key === "force" && newtonState.mode === "balance") newtonState.resistance = newtonState.force;
  newtonSyncInputs();
  newtonRender();
}

function newtonBindPair(range, number, key) {
  range.addEventListener("input", () => newtonSetValue(key, range.value));
  number.addEventListener("change", () => newtonSetValue(key, number.value));
}

function newtonApplyMode(mode) {
  newtonState.mode = mode;
  if (mode === "balance") newtonState.resistance = newtonState.force;
  if (mode === "force") { newtonState.force = 3; newtonState.resistance = 0.5; }
  if (mode === "mass") { newtonState.mass = 2; newtonState.force = 4; newtonState.resistance = 0.5; }
  newtonState.time = 0;
  newtonState.velocity = 0;
  newtonState.position = 0;
  newtonState.running = false;
  newtonSyncInputs();
  newtonRender();
}

function newtonFrame(now) {
  if (newtonState.running) {
    if (newtonLastFrame === null) newtonLastFrame = now;
    const delta = Math.min((now - newtonLastFrame) / 1000, 0.05);
    const acceleration = newtonDerived().acceleration;
    newtonState.velocity += acceleration * delta;
    newtonState.position += newtonState.velocity * delta;
    newtonState.time += delta;
    newtonLastFrame = now;
    newtonRender();
  } else {
    newtonLastFrame = null;
  }
  requestAnimationFrame(newtonFrame);
}

newtonBindPair(newtonRefs.massInput, newtonRefs.massNumber, "mass");
newtonBindPair(newtonRefs.forceInput, newtonRefs.forceNumber, "force");
newtonBindPair(newtonRefs.resistanceInput, newtonRefs.resistanceNumber, "resistance");
newtonRefs.startButton.addEventListener("click", () => { newtonState.running = true; newtonRender(); });
newtonRefs.pauseButton.addEventListener("click", () => { newtonState.running = false; newtonRender(); });
newtonRefs.resetButton.addEventListener("click", () => { newtonState.time = 0; newtonState.velocity = 0; newtonState.position = 0; newtonState.running = false; newtonRender(); });
newtonRefs.presetButtons.forEach((button) => button.addEventListener("click", () => newtonApplyMode(button.dataset.mode)));
newtonRefs.criticalCards.forEach((card) => card.addEventListener("click", () => newtonApplyMode(card.dataset.jump)));
newtonRefs.showVectorsToggle.addEventListener("change", () => { newtonState.showVectors = newtonRefs.showVectorsToggle.checked; newtonRender(); });
newtonRefs.showGraphToggle.addEventListener("change", () => { newtonState.showGraph = newtonRefs.showGraphToggle.checked; newtonRender(); });
newtonRefs.demoModeToggle.addEventListener("change", () => { newtonState.demoMode = newtonRefs.demoModeToggle.checked; document.body.classList.toggle("demo-mode", newtonState.demoMode); newtonRender(); });
newtonSyncInputs();
newtonRender();
requestAnimationFrame(newtonFrame);
