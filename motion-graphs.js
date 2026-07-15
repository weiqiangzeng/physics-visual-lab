const motionState = {
  initialSpeed: 2,
  acceleration: 1,
  time: 0,
  duration: 6,
  timeScale: 1,
  mode: "accelerate",
  running: false,
  showPosition: true,
  showVelocity: true,
  demoMode: false
};

const motionRefs = {
  canvas: document.getElementById("motionCanvas"),
  startButton: document.getElementById("startButton"),
  pauseButton: document.getElementById("pauseButton"),
  resetButton: document.getElementById("resetButton"),
  presetTitle: document.getElementById("presetTitle"),
  presetButtons: Array.from(document.querySelectorAll(".preset-button")),
  modeGoal: document.getElementById("modeGoal"),
  modePrompt: document.getElementById("modePrompt"),
  modeFormula: document.getElementById("modeFormula"),
  initialSpeedInput: document.getElementById("initialSpeedInput"),
  initialSpeedNumber: document.getElementById("initialSpeedNumber"),
  accelerationInput: document.getElementById("accelerationInput"),
  accelerationNumber: document.getElementById("accelerationNumber"),
  timeInput: document.getElementById("timeInput"),
  timeNumber: document.getElementById("timeNumber"),
  initialSpeedValue: document.getElementById("initialSpeedValue"),
  accelerationValue: document.getElementById("accelerationValue"),
  timeValue: document.getElementById("timeValue"),
  timeMetric: document.getElementById("timeMetric"),
  positionMetric: document.getElementById("positionMetric"),
  velocityMetric: document.getElementById("velocityMetric"),
  accelMetric: document.getElementById("accelMetric"),
  displacementMetric: document.getElementById("displacementMetric"),
  criticalCards: Array.from(document.querySelectorAll(".critical-card[data-jump]")),
  criticalStateLabel: document.getElementById("criticalStateLabel"),
  criticalStateNote: document.getElementById("criticalStateNote"),
  showPositionToggle: document.getElementById("showPositionToggle"),
  showVelocityToggle: document.getElementById("showVelocityToggle"),
  demoModeToggle: document.getElementById("demoModeToggle"),
  speedButtons: Array.from(document.querySelectorAll(".speed-button")),
  overviewSpeed: document.getElementById("overviewSpeed"),
  overviewTime: document.getElementById("overviewTime")
};

const motionCtx = motionRefs.canvas.getContext("2d");
const motionWidth = 980;
const motionHeight = 560;
const motionDpr = window.devicePixelRatio || 1;
motionRefs.canvas.width = motionWidth * motionDpr;
motionRefs.canvas.height = motionHeight * motionDpr;
motionCtx.scale(motionDpr, motionDpr);

const motionModes = {
  uniform: { title: "匀速运动", goal: "观察 x-t 图像的斜率", prompt: "速度保持不变，x-t 图像是直线，v-t 图像与时间轴平行。", formula: "v = 常量", initialSpeed: 2, acceleration: 0 },
  accelerate: { title: "匀变速运动", goal: "观察斜率和面积的含义", prompt: "x-t 图像逐渐变陡，v-t 图像的斜率就是加速度。", formula: "v = v₀ + at", initialSpeed: 2, acceleration: 1 },
  brake: { title: "减速到停", goal: "观察速度变号和运动方向", prompt: "先前进后停下，再继续观察速度变号后位置的变化。", formula: "x = v₀t + 1/2at²", initialSpeed: 4, acceleration: -1 }
};

let motionLastFrame = null;

function motionClamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function motionFormat(value, digits = 2, unit = "") {
  const text = Number.isFinite(value) ? value.toFixed(digits) : "--";
  return unit ? `${text} ${unit}` : text;
}

function motionAt(time = motionState.time) {
  return {
    time,
    position: motionState.initialSpeed * time + 0.5 * motionState.acceleration * time * time,
    velocity: motionState.initialSpeed + motionState.acceleration * time,
    acceleration: motionState.acceleration
  };
}

function motionRange(field) {
  const values = Array.from({ length: 61 }, (_, index) => motionAt((index / 60) * motionState.duration)[field]);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const padding = Math.max((max - min) * 0.12, 1);
  return { min: min - padding, max: max + padding };
}

function motionMap(value, min, max, start, length) {
  return start + ((value - min) / (max - min || 1)) * length;
}

function motionDrawText(text, x, y, color = "#5c686d", size = 12, weight = "400") {
  motionCtx.save();
  motionCtx.fillStyle = color;
  motionCtx.font = `${weight} ${size}px Avenir Next, PingFang SC, sans-serif`;
  motionCtx.fillText(text, x, y);
  motionCtx.restore();
}

function motionDrawAxes(x, y, width, height, range, yLabel, xLabel) {
  motionCtx.strokeStyle = "rgba(18, 31, 36, 0.2)";
  motionCtx.lineWidth = 1.2;
  motionCtx.beginPath();
  motionCtx.moveTo(x, y);
  motionCtx.lineTo(x, y + height);
  motionCtx.lineTo(x + width, y + height);
  motionCtx.stroke();
  for (let step = 0; step <= 4; step += 1) {
    const value = range.min + ((range.max - range.min) * step) / 4;
    const py = y + height - (height * step) / 4;
    motionCtx.strokeStyle = "rgba(18, 31, 36, 0.07)";
    motionCtx.beginPath();
    motionCtx.moveTo(x, py);
    motionCtx.lineTo(x + width, py);
    motionCtx.stroke();
    motionDrawText(value.toFixed(1), x - 42, py + 4);
  }
  for (let step = 0; step <= 6; step += 1) {
    const px = x + (width * step) / 6;
    motionCtx.strokeStyle = "rgba(18, 31, 36, 0.06)";
    motionCtx.beginPath();
    motionCtx.moveTo(px, y);
    motionCtx.lineTo(px, y + height);
    motionCtx.stroke();
    motionDrawText(`${step}s`, px - 7, y + height + 20);
  }
  motionDrawText(yLabel, x, y - 10, "#121f24", 13, "700");
  motionDrawText(xLabel, x + width - 42, y + height + 38, "#5c686d", 12, "400");
}

function motionDrawChart(x, y, width, height, field, color, label, show) {
  const range = motionRange(field);
  motionDrawAxes(x, y, width, height, range, label, "t / s");
  if (!show) {
    motionDrawText("已隐藏", x + width - 48, y - 10, "#5c686d", 11, "400");
    return;
  }
  motionCtx.strokeStyle = color;
  motionCtx.lineWidth = motionState.demoMode ? 4 : 2.8;
  motionCtx.beginPath();
  for (let index = 0; index <= 90; index += 1) {
    const time = (index / 90) * motionState.duration;
    const pointX = x + (width * time) / motionState.duration;
    const pointY = y + height - motionMap(motionAt(time)[field], range.min, range.max, 0, height);
    if (index === 0) motionCtx.moveTo(pointX, pointY);
    else motionCtx.lineTo(pointX, pointY);
  }
  motionCtx.stroke();
  const current = motionAt();
  const currentX = x + (width * current.time) / motionState.duration;
  const currentY = y + height - motionMap(current[field], range.min, range.max, 0, height);
  motionCtx.fillStyle = color;
  motionCtx.beginPath();
  motionCtx.arc(currentX, currentY, motionState.demoMode ? 7 : 5, 0, Math.PI * 2);
  motionCtx.fill();
}

function motionDrawTrack() {
  const range = motionRange("position");
  const left = 86;
  const right = motionWidth - 86;
  const y = 92;
  motionCtx.strokeStyle = "rgba(18, 31, 36, 0.24)";
  motionCtx.lineWidth = 2;
  motionCtx.beginPath();
  motionCtx.moveTo(left, y);
  motionCtx.lineTo(right, y);
  motionCtx.stroke();
  motionDrawText("运动方向", left, y - 24, "#121f24", 13, "700");
  for (let index = 0; index <= 6; index += 1) {
    const value = range.min + ((range.max - range.min) * index) / 6;
    const x = motionMap(value, range.min, range.max, left, right - left);
    motionCtx.strokeStyle = "rgba(18, 31, 36, 0.12)";
    motionCtx.beginPath();
    motionCtx.moveTo(x, y - 7);
    motionCtx.lineTo(x, y + 7);
    motionCtx.stroke();
    motionDrawText(value.toFixed(1), x - 12, y + 26);
  }
  const point = motionAt();
  const cartX = motionMap(point.position, range.min, range.max, left, right - left);
  motionCtx.fillStyle = "#0d7168";
  motionCtx.fillRect(cartX - 18, y - 21, 36, 22);
  motionCtx.fillStyle = "#121f24";
  motionCtx.beginPath();
  motionCtx.arc(cartX - 10, y + 3, 5, 0, Math.PI * 2);
  motionCtx.arc(cartX + 10, y + 3, 5, 0, Math.PI * 2);
  motionCtx.fill();
  if (Math.abs(point.velocity) > 0.01) {
    const direction = Math.sign(point.velocity);
    motionCtx.strokeStyle = "#1f78b4";
    motionCtx.lineWidth = 3;
    motionCtx.beginPath();
    motionCtx.moveTo(cartX, y - 30);
    motionCtx.lineTo(cartX + direction * 34, y - 30);
    motionCtx.stroke();
    motionDrawText("v", cartX + direction * 40, y - 25, "#1f78b4", 13, "700");
  }
}

function motionCriticalState() {
  const point = motionAt();
  if (Math.abs(point.velocity) < 0.05 && Math.abs(point.acceleration) > 0.01) {
    return { key: "turn", label: "速度为零的瞬间", note: "运动方向即将改变，但加速度仍然存在。" };
  }
  if (point.velocity < 0) return { key: "area", label: "反向运动", note: "v-t 图像在时间轴下方，对应位移增量为负。" };
  if (point.acceleration === 0) return { key: "slope", label: "匀速运动", note: "x-t 图像斜率不变，v-t 图像保持水平。" };
  return { key: "slope", label: "正在加速", note: "x-t 图像斜率逐渐变大，v-t 图像斜率为正。" };
}

function motionSyncReadouts() {
  const point = motionAt();
  const critical = motionCriticalState();
  motionRefs.initialSpeedValue.textContent = motionFormat(motionState.initialSpeed, 2, "m/s");
  motionRefs.accelerationValue.textContent = motionFormat(motionState.acceleration, 2, "m/s²");
  motionRefs.timeValue.textContent = motionFormat(motionState.time, 2, "s");
  motionRefs.timeMetric.textContent = motionFormat(point.time, 2, "s");
  motionRefs.positionMetric.textContent = motionFormat(point.position, 2, "m");
  motionRefs.velocityMetric.textContent = motionFormat(point.velocity, 2, "m/s");
  motionRefs.accelMetric.textContent = motionFormat(point.acceleration, 2, "m/s²");
  motionRefs.displacementMetric.textContent = motionFormat(point.position, 2, "m");
  motionRefs.overviewSpeed.textContent = `${motionState.timeScale}x`;
  motionRefs.overviewTime.textContent = motionFormat(motionState.time, 2, "s");
  motionRefs.startButton.textContent = motionState.running ? "运行中" : "开始";
  motionRefs.startButton.classList.toggle("primary", !motionState.running);
  motionRefs.criticalStateLabel.textContent = critical.label;
  motionRefs.criticalStateNote.textContent = critical.note;
  motionRefs.criticalCards.forEach((card) => card.classList.toggle("active", card.dataset.jump === critical.key));
}

function motionSyncInputs() {
  motionRefs.initialSpeedInput.value = motionState.initialSpeed;
  motionRefs.initialSpeedNumber.value = motionState.initialSpeed;
  motionRefs.accelerationInput.value = motionState.acceleration;
  motionRefs.accelerationNumber.value = motionState.acceleration;
  motionRefs.timeInput.value = motionState.time;
  motionRefs.timeNumber.value = motionState.time.toFixed(2);
  motionRefs.showPositionToggle.checked = motionState.showPosition;
  motionRefs.showVelocityToggle.checked = motionState.showVelocity;
  motionRefs.demoModeToggle.checked = motionState.demoMode;
  motionRefs.speedButtons.forEach((button) => button.classList.toggle("active", Number(button.dataset.speed) === motionState.timeScale));
  const config = motionModes[motionState.mode];
  motionRefs.presetTitle.textContent = config.title;
  motionRefs.modeGoal.textContent = config.goal;
  motionRefs.modePrompt.textContent = config.prompt;
  motionRefs.modeFormula.textContent = config.formula;
  motionRefs.presetButtons.forEach((button) => button.classList.toggle("active", button.dataset.mode === motionState.mode));
}

function motionRender() {
  motionCtx.clearRect(0, 0, motionWidth, motionHeight);
  motionCtx.fillStyle = "#fbfcfa";
  motionCtx.fillRect(0, 0, motionWidth, motionHeight);
  motionDrawTrack();
  motionDrawText("x-t 图像", 58, 166, "#121f24", 14, "700");
  motionDrawText("v-t 图像", 548, 166, "#121f24", 14, "700");
  motionDrawChart(96, 188, 390, 250, "position", "#0d7168", "x / m", motionState.showPosition);
  motionDrawChart(586, 188, 330, 250, "velocity", "#1f78b4", "v / (m/s)", motionState.showVelocity);
  const cursorX1 = 96 + (390 * motionState.time) / motionState.duration;
  const cursorX2 = 586 + (330 * motionState.time) / motionState.duration;
  motionCtx.strokeStyle = "rgba(201, 107, 41, 0.7)";
  motionCtx.setLineDash([6, 5]);
  motionCtx.beginPath();
  motionCtx.moveTo(cursorX1, 188);
  motionCtx.lineTo(cursorX1, 438);
  motionCtx.moveTo(cursorX2, 188);
  motionCtx.lineTo(cursorX2, 438);
  motionCtx.stroke();
  motionCtx.setLineDash([]);
  motionDrawText("同一时刻", cursorX1 - 22, 466, "#c96b29", 11, "700");
  motionSyncReadouts();
}

function motionSetValue(key, value) {
  const limits = { initialSpeed: [-5, 5], acceleration: [-3, 3], time: [0, motionState.duration] };
  motionState[key] = motionClamp(Number(value) || 0, limits[key][0], limits[key][1]);
  if (key === "time") motionState.running = false;
  motionSyncInputs();
  motionRender();
}

function motionBindPair(range, number, key) {
  range.addEventListener("input", () => motionSetValue(key, range.value));
  number.addEventListener("change", () => motionSetValue(key, number.value));
}

function motionApplyMode(mode) {
  const config = motionModes[mode];
  motionState.mode = mode;
  motionState.initialSpeed = config.initialSpeed;
  motionState.acceleration = config.acceleration;
  motionState.time = 0;
  motionState.running = false;
  motionSyncInputs();
  motionRender();
}

function motionFrame(now) {
  if (motionState.running) {
    if (motionLastFrame === null) motionLastFrame = now;
    motionState.time += ((now - motionLastFrame) / 1000) * motionState.timeScale;
    if (motionState.time >= motionState.duration) {
      motionState.time = motionState.duration;
      motionState.running = false;
    }
    motionLastFrame = now;
    motionRender();
  } else {
    motionLastFrame = null;
  }
  requestAnimationFrame(motionFrame);
}

motionBindPair(motionRefs.initialSpeedInput, motionRefs.initialSpeedNumber, "initialSpeed");
motionBindPair(motionRefs.accelerationInput, motionRefs.accelerationNumber, "acceleration");
motionBindPair(motionRefs.timeInput, motionRefs.timeNumber, "time");
motionRefs.startButton.addEventListener("click", () => { motionState.running = true; motionRender(); });
motionRefs.pauseButton.addEventListener("click", () => { motionState.running = false; motionRender(); });
motionRefs.resetButton.addEventListener("click", () => { motionState.time = 0; motionState.running = false; motionRender(); motionSyncInputs(); });
motionRefs.presetButtons.forEach((button) => button.addEventListener("click", () => motionApplyMode(button.dataset.mode)));
motionRefs.criticalCards.forEach((card) => card.addEventListener("click", () => {
  if (card.dataset.jump === "turn") motionApplyMode("brake");
  else motionState.time = card.dataset.jump === "area" ? 4 : 2;
  motionState.running = false;
  motionRender();
  motionSyncInputs();
}));
motionRefs.showPositionToggle.addEventListener("change", () => { motionState.showPosition = motionRefs.showPositionToggle.checked; motionRender(); });
motionRefs.showVelocityToggle.addEventListener("change", () => { motionState.showVelocity = motionRefs.showVelocityToggle.checked; motionRender(); });
motionRefs.demoModeToggle.addEventListener("change", () => { motionState.demoMode = motionRefs.demoModeToggle.checked; document.body.classList.toggle("demo-mode", motionState.demoMode); motionRender(); });
motionRefs.speedButtons.forEach((button) => button.addEventListener("click", () => { motionState.timeScale = Number(button.dataset.speed); motionSyncInputs(); }));
motionSyncInputs();
motionRender();
requestAnimationFrame(motionFrame);
