const state = {
  mass: 1,
  radius: 1.2,
  speed: 2.4,
  time: 0,
  timeScale: 1,
  mode: "vectors",
  running: false,
  paused: false,
  showVectors: true,
  showTrail: true,
  demoMode: false
};

const refs = {
  canvas: document.getElementById("circularCanvas"),
  startButton: document.getElementById("startButton"),
  pauseButton: document.getElementById("pauseButton"),
  resetButton: document.getElementById("resetButton"),
  presetTitle: document.getElementById("presetTitle"),
  presetButtons: Array.from(document.querySelectorAll(".preset-button")),
  modeGoal: document.getElementById("modeGoal"),
  modePrompt: document.getElementById("modePrompt"),
  modeFormula: document.getElementById("modeFormula"),
  massInput: document.getElementById("massInput"),
  radiusInput: document.getElementById("radiusInput"),
  speedInput: document.getElementById("speedInput"),
  timeInput: document.getElementById("timeInput"),
  massNumber: document.getElementById("massNumber"),
  radiusNumber: document.getElementById("radiusNumber"),
  speedNumber: document.getElementById("speedNumber"),
  timeNumber: document.getElementById("timeNumber"),
  massValue: document.getElementById("massValue"),
  radiusValue: document.getElementById("radiusValue"),
  speedValue: document.getElementById("speedValue"),
  timeValue: document.getElementById("timeValue"),
  radiusMetric: document.getElementById("radiusMetric"),
  speedMetric: document.getElementById("speedMetric"),
  omegaMetric: document.getElementById("omegaMetric"),
  accelMetric: document.getElementById("accelMetric"),
  forceMetric: document.getElementById("forceMetric"),
  periodMetric: document.getElementById("periodMetric"),
  rightCard: document.getElementById("rightCard"),
  topCard: document.getElementById("topCard"),
  leftCard: document.getElementById("leftCard"),
  criticalCards: Array.from(document.querySelectorAll(".critical-card[data-jump]")),
  criticalStateLabel: document.getElementById("criticalStateLabel"),
  criticalStateNote: document.getElementById("criticalStateNote"),
  showVectorsToggle: document.getElementById("showVectorsToggle"),
  showTrailToggle: document.getElementById("showTrailToggle"),
  demoModeToggle: document.getElementById("demoModeToggle"),
  speedButtons: Array.from(document.querySelectorAll(".speed-button")),
  overviewSpeed: document.getElementById("overviewSpeed"),
  overviewTime: document.getElementById("overviewTime"),
  demoBadge: document.getElementById("demoBadge")
};

const ctx = refs.canvas.getContext("2d");
const dpr = window.devicePixelRatio || 1;
const width = 980;
const height = 500;
refs.canvas.width = width * dpr;
refs.canvas.height = height * dpr;
ctx.scale(dpr, dpr);

const center = { x: width * 0.5, y: height * 0.52 };
let lastFrameTime = null;
let animationFrame = 0;

const modeConfigs = {
  vectors: {
    title: "方向关系",
    goal: "观察速度切向、加速度指向圆心",
    prompt: "暂停到任意位置，速度箭头总沿切线，加速度箭头总指向圆心。",
    formula: "a_c = v² / r"
  },
  force: {
    title: "向心力",
    goal: "比较速度、半径和质量怎样影响向心力",
    prompt: "速度加倍时向心力变为四倍；半径越小，保持同样速度需要的向心力越大。",
    formula: "F_c = mv² / r"
  },
  period: {
    title: "周期频率",
    goal: "观察转一圈所需时间",
    prompt: "速度越大周期越短；半径越大，同样速度下一圈路径更长。",
    formula: "T = 2πr / v"
  }
};

function getDerived() {
  const omega = state.speed / state.radius;
  const period = (2 * Math.PI) / omega;
  const accel = (state.speed * state.speed) / state.radius;
  const force = state.mass * accel;
  return { omega, period, accel, force };
}

function getPoint(time = state.time) {
  const { omega } = getDerived();
  const theta = omega * time;
  return {
    theta,
    x: state.radius * Math.cos(theta),
    y: state.radius * Math.sin(theta),
    vx: -state.speed * Math.sin(theta),
    vy: state.speed * Math.cos(theta),
    ax: -((state.speed * state.speed) / state.radius) * Math.cos(theta),
    ay: -((state.speed * state.speed) / state.radius) * Math.sin(theta)
  };
}

function formatNumber(value, digits = 2, unit = "") {
  if (!Number.isFinite(value)) return "--";
  const text = Math.abs(value) >= 1000 || (Math.abs(value) > 0 && Math.abs(value) < 0.01)
    ? value.toExponential(2).replace("+", "")
    : value.toFixed(digits);
  return unit ? `${text} ${unit}` : text;
}

function toCanvas(point) {
  const scale = 136;
  return {
    x: center.x + point.x * scale,
    y: center.y - point.y * scale
  };
}

function drawArrow(from, vector, color, label, scale = 1) {
  const len = Math.hypot(vector.x, vector.y);
  if (len < 0.001) return;
  const to = { x: from.x + vector.x * scale, y: from.y - vector.y * scale };
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = state.demoMode ? 3.5 : 2.5;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - 12 * Math.cos(angle - Math.PI / 6), to.y - 12 * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(to.x - 12 * Math.cos(angle + Math.PI / 6), to.y - 12 * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  ctx.font = "13px Avenir Next, PingFang SC, sans-serif";
  ctx.fillText(label, to.x + 8, to.y - 8);
  ctx.restore();
}

function drawGrid() {
  ctx.strokeStyle = "rgba(18, 31, 36, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 80; x <= width - 80; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 40);
    ctx.lineTo(x, height - 52);
    ctx.stroke();
  }
  for (let y = 52; y <= height - 52; y += 48) {
    ctx.beginPath();
    ctx.moveTo(70, y);
    ctx.lineTo(width - 70, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(18, 31, 36, 0.22)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(70, center.y);
  ctx.lineTo(width - 70, center.y);
  ctx.moveTo(center.x, 40);
  ctx.lineTo(center.x, height - 52);
  ctx.stroke();
}

function drawCircle() {
  const radiusPx = state.radius * 136;
  if (state.showTrail) {
    ctx.strokeStyle = "#0d7168";
    ctx.lineWidth = state.demoMode ? 4 : 3;
    ctx.beginPath();
    ctx.arc(center.x, center.y, radiusPx, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = "#121f24";
  ctx.beginPath();
  ctx.arc(center.x, center.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(18, 31, 36, 0.58)";
  ctx.font = "13px Avenir Next, PingFang SC, sans-serif";
  ctx.fillText("圆心", center.x + 10, center.y - 10);
}

function getCriticalState() {
  const theta = ((getPoint().theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  if (Math.abs(theta) < 0.22 || Math.abs(theta - 2 * Math.PI) < 0.22) {
    return { key: "right", label: "最右点", note: "速度向上，加速度向左指向圆心。" };
  }
  if (Math.abs(theta - Math.PI / 2) < 0.22) {
    return { key: "top", label: "最高点", note: "速度向左，加速度向下指向圆心。" };
  }
  if (Math.abs(theta - Math.PI) < 0.22) {
    return { key: "left", label: "最左点", note: "速度向下，加速度向右指向圆心。" };
  }
  return { key: "none", label: "速度切向", note: "速度方向沿切线，加速度方向沿半径指向圆心。" };
}

function render() {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfcfa";
  ctx.fillRect(0, 0, width, height);
  drawGrid();
  drawCircle();

  const point = getPoint();
  const c = toCanvas(point);
  ctx.strokeStyle = "rgba(123, 63, 160, 0.45)";
  ctx.setLineDash([7, 7]);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(center.x, center.y);
  ctx.lineTo(c.x, c.y);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#121f24";
  ctx.beginPath();
  ctx.arc(c.x, c.y, state.demoMode ? 10 : 8, 0, Math.PI * 2);
  ctx.fill();

  if (state.showVectors) {
    drawArrow(c, { x: point.vx, y: point.vy }, "#0d7168", "v", state.demoMode ? 30 : 24);
    drawArrow(c, { x: point.ax, y: point.ay }, "#7b3fa0", "a_c", state.demoMode ? 18 : 14);
    if (state.mode === "force") drawArrow(c, { x: point.ax, y: point.ay }, "#c96b29", "F_c", state.demoMode ? 26 : 20);
  }
  syncReadouts();
}

function syncReadouts() {
  const d = getDerived();
  const localTime = ((state.time % d.period) + d.period) % d.period;
  const critical = getCriticalState();
  refs.massValue.textContent = formatNumber(state.mass, 2, "kg");
  refs.radiusValue.textContent = formatNumber(state.radius, 2, "m");
  refs.speedValue.textContent = formatNumber(state.speed, 2, "m/s");
  refs.timeValue.textContent = formatNumber(localTime, 2, "s");
  refs.radiusMetric.textContent = formatNumber(state.radius, 2, "m");
  refs.speedMetric.textContent = formatNumber(state.speed, 2, "m/s");
  refs.omegaMetric.textContent = formatNumber(d.omega, 2, "rad/s");
  refs.accelMetric.textContent = formatNumber(d.accel, 2, "m/s²");
  refs.forceMetric.textContent = formatNumber(d.force, 2, "N");
  refs.periodMetric.textContent = formatNumber(d.period, 2, "s");
  refs.overviewSpeed.textContent = `${state.timeScale}x`;
  refs.overviewTime.textContent = formatNumber(localTime, 2, "s");
  refs.startButton.textContent = state.running ? "运行中" : "开始";
  refs.startButton.classList.toggle("primary", !state.running);
  refs.rightCard.classList.toggle("active", critical.key === "right");
  refs.topCard.classList.toggle("active", critical.key === "top");
  refs.leftCard.classList.toggle("active", critical.key === "left");
  refs.criticalStateLabel.textContent = critical.label;
  refs.criticalStateNote.textContent = critical.note;
}

function syncInputs() {
  const { period } = getDerived();
  const localTime = ((state.time % period) + period) % period;
  refs.massInput.value = state.mass;
  refs.radiusInput.value = state.radius;
  refs.speedInput.value = state.speed;
  refs.massNumber.value = state.mass;
  refs.radiusNumber.value = state.radius;
  refs.speedNumber.value = state.speed;
  refs.timeInput.max = period.toFixed(3);
  refs.timeNumber.max = period.toFixed(3);
  refs.timeInput.value = localTime;
  refs.timeNumber.value = localTime.toFixed(2);
  refs.showVectorsToggle.checked = state.showVectors;
  refs.showTrailToggle.checked = state.showTrail;
  refs.demoModeToggle.checked = state.demoMode;
  refs.speedButtons.forEach((button) => button.classList.toggle("active", Number(button.dataset.speed) === state.timeScale));
  refs.presetTitle.textContent = modeConfigs[state.mode].title;
  refs.modeGoal.textContent = modeConfigs[state.mode].goal;
  refs.modePrompt.textContent = modeConfigs[state.mode].prompt;
  refs.modeFormula.textContent = modeConfigs[state.mode].formula;
  refs.presetButtons.forEach((button) => button.classList.toggle("active", button.dataset.mode === state.mode));
  document.body.classList.toggle("demo-mode", state.demoMode);
  refs.demoBadge.textContent = state.demoMode ? "教学演示中" : "";
}

function pauseForObservation() {
  state.running = false;
  state.paused = false;
  refs.pauseButton.textContent = "暂停";
}

function setObservationTime(time) {
  state.time = Math.min(getDerived().period, Math.max(0, Number(time)));
  pauseForObservation();
  syncInputs();
  render();
}

function jumpTo(kind) {
  const { period } = getDerived();
  if (kind === "top") setObservationTime(period / 4);
  else if (kind === "left") setObservationTime(period / 2);
  else setObservationTime(0);
}

function bindRange(range, number, key) {
  range.addEventListener("input", (event) => {
    state[key] = Number(event.target.value);
    state.time = 0;
    syncInputs();
    render();
  });
  number.addEventListener("change", (event) => {
    const next = Number(event.target.value);
    if (!Number.isFinite(next)) return syncInputs();
    state[key] = Math.min(Number(number.max), Math.max(Number(number.min), next));
    state.time = 0;
    syncInputs();
    render();
  });
}

bindRange(refs.massInput, refs.massNumber, "mass");
bindRange(refs.radiusInput, refs.radiusNumber, "radius");
bindRange(refs.speedInput, refs.speedNumber, "speed");
refs.timeInput.addEventListener("input", (event) => setObservationTime(event.target.value));
refs.timeNumber.addEventListener("change", (event) => setObservationTime(event.target.value));
refs.criticalCards.forEach((card) => {
  card.addEventListener("click", () => jumpTo(card.dataset.jump));
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      jumpTo(card.dataset.jump);
    }
  });
});
refs.presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.mode = button.dataset.mode;
    syncInputs();
    render();
  });
});
refs.startButton.addEventListener("click", () => {
  state.running = true;
  state.paused = false;
  refs.pauseButton.textContent = "暂停";
  syncReadouts();
});
refs.pauseButton.addEventListener("click", () => {
  if (!state.running) return;
  state.paused = !state.paused;
  refs.pauseButton.textContent = state.paused ? "已暂停" : "暂停";
});
refs.resetButton.addEventListener("click", () => {
  state.time = 0;
  state.running = false;
  state.paused = false;
  refs.pauseButton.textContent = "暂停";
  syncInputs();
  render();
});
refs.showVectorsToggle.addEventListener("change", (event) => {
  state.showVectors = event.target.checked;
  render();
});
refs.showTrailToggle.addEventListener("change", (event) => {
  state.showTrail = event.target.checked;
  render();
});
refs.demoModeToggle.addEventListener("change", (event) => {
  state.demoMode = event.target.checked;
  syncInputs();
  render();
});
refs.speedButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.timeScale = Number(button.dataset.speed);
    syncInputs();
    syncReadouts();
  });
});

function animate(timestamp) {
  if (lastFrameTime == null) lastFrameTime = timestamp;
  const elapsed = Math.min(0.05, (timestamp - lastFrameTime) / 1000);
  lastFrameTime = timestamp;
  if (state.running && !state.paused) {
    state.time += elapsed * state.timeScale;
  }
  render();
  animationFrame = requestAnimationFrame(animate);
}

syncInputs();
render();
cancelAnimationFrame(animationFrame);
animationFrame = requestAnimationFrame(animate);
