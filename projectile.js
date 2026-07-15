const state = {
  speed: 18,
  angle: 45,
  gravity: 9.8,
  time: 0,
  timeScale: 1,
  mode: "decompose",
  running: false,
  paused: false,
  showComponents: true,
  showTrail: true,
  demoMode: false
};

const refs = {
  canvas: document.getElementById("projectileCanvas"),
  startButton: document.getElementById("startButton"),
  pauseButton: document.getElementById("pauseButton"),
  resetButton: document.getElementById("resetButton"),
  presetTitle: document.getElementById("presetTitle"),
  presetButtons: Array.from(document.querySelectorAll(".preset-button")),
  modeGoal: document.getElementById("modeGoal"),
  modePrompt: document.getElementById("modePrompt"),
  modeFormula: document.getElementById("modeFormula"),
  speedInput: document.getElementById("speedInput"),
  angleInput: document.getElementById("angleInput"),
  gravityInput: document.getElementById("gravityInput"),
  timeInput: document.getElementById("timeInput"),
  speedNumber: document.getElementById("speedNumber"),
  angleNumber: document.getElementById("angleNumber"),
  gravityNumber: document.getElementById("gravityNumber"),
  timeNumber: document.getElementById("timeNumber"),
  speedValue: document.getElementById("speedValue"),
  angleValue: document.getElementById("angleValue"),
  gravityValue: document.getElementById("gravityValue"),
  timeValue: document.getElementById("timeValue"),
  xMetric: document.getElementById("xMetric"),
  yMetric: document.getElementById("yMetric"),
  vxMetric: document.getElementById("vxMetric"),
  vyMetric: document.getElementById("vyMetric"),
  rangeMetric: document.getElementById("rangeMetric"),
  timeMetric: document.getElementById("timeMetric"),
  launchCard: document.getElementById("launchCard"),
  apexCard: document.getElementById("apexCard"),
  landingCard: document.getElementById("landingCard"),
  criticalCards: Array.from(document.querySelectorAll(".critical-card[data-jump]")),
  criticalStateLabel: document.getElementById("criticalStateLabel"),
  criticalStateNote: document.getElementById("criticalStateNote"),
  showComponentsToggle: document.getElementById("showComponentsToggle"),
  showTrailToggle: document.getElementById("showTrailToggle"),
  demoModeToggle: document.getElementById("demoModeToggle"),
  speedButtons: Array.from(document.querySelectorAll(".speed-button")),
  overviewSpeed: document.getElementById("overviewSpeed"),
  overviewTime: document.getElementById("overviewTime"),
  demoBadge: document.getElementById("demoBadge")
};

refs.metricCards = [
  refs.xMetric.parentElement,
  refs.yMetric.parentElement,
  refs.vxMetric.parentElement,
  refs.vyMetric.parentElement,
  refs.rangeMetric.parentElement,
  refs.timeMetric.parentElement
];

const ctx = refs.canvas.getContext("2d");
const dpr = window.devicePixelRatio || 1;
const width = 980;
const height = 500;
refs.canvas.width = width * dpr;
refs.canvas.height = height * dpr;
ctx.scale(dpr, dpr);

const padding = { left: 62, right: 42, top: 42, bottom: 64 };
let lastFrameTime = null;
let animationFrame = 0;

const modeConfigs = {
  decompose: {
    title: "运动分解",
    goal: "观察抛体运动如何分解成两个方向",
    prompt: "水平方向速度保持不变，竖直方向速度被重力连续改变。",
    formula: "\\(x = v_0 \\cos\\theta \\cdot t\\)"
  },
  apex: {
    title: "最高点",
    goal: "观察最高点处竖直速度为 0",
    prompt: "最高点不是静止点，物体仍有水平速度，所以还会继续向前运动。",
    formula: "\\(v_y = 0\\)"
  },
  range: {
    title: "射程",
    goal: "比较角度和初速度如何影响射程",
    prompt: "在同一高度落回地面时，飞行时间和水平速度共同决定射程。",
    formula: "\\(R = \\frac{v_0^2 \\sin 2\\theta}{g}\\)"
  }
};

function getDerived() {
  const angleRad = (state.angle * Math.PI) / 180;
  const vx0 = state.speed * Math.cos(angleRad);
  const vy0 = state.speed * Math.sin(angleRad);
  const flightTime = (2 * vy0) / state.gravity;
  const apexTime = vy0 / state.gravity;
  const range = vx0 * flightTime;
  const maxHeight = (vy0 * vy0) / (2 * state.gravity);
  return { angleRad, vx0, vy0, flightTime, apexTime, range, maxHeight };
}

function getPoint(time = state.time) {
  const { vx0, vy0, flightTime } = getDerived();
  const t = Math.max(0, Math.min(flightTime, time));
  return {
    t,
    x: vx0 * t,
    y: vy0 * t - 0.5 * state.gravity * t * t,
    vx: vx0,
    vy: vy0 - state.gravity * t
  };
}

function formatNumber(value, digits = 2, unit = "") {
  if (!Number.isFinite(value)) return "--";
  const text = Math.abs(value) >= 1000 || (Math.abs(value) > 0 && Math.abs(value) < 0.01)
    ? value.toExponential(2).replace("+", "")
    : value.toFixed(digits);
  return unit ? `${text} ${unit}` : text;
}

function worldToCanvas(point) {
  const { range, maxHeight } = getDerived();
  const xMax = Math.max(10, range * 1.12);
  const yMax = Math.max(5, maxHeight * 1.35);
  return {
    x: padding.left + (point.x / xMax) * (width - padding.left - padding.right),
    y: height - padding.bottom - (point.y / yMax) * (height - padding.top - padding.bottom)
  };
}

function drawArrow(from, vector, color, label, scale = 1) {
  const len = Math.hypot(vector.x, vector.y);
  if (len < 0.001) return;
  const to = { x: from.x + vector.x * scale, y: from.y + vector.y * scale };
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = state.demoMode ? 3.4 : 2.4;
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

function getScreenVelocityVectors(point) {
  const dt = 0.18;
  const current = worldToCanvas(point);
  const vxEnd = worldToCanvas({ x: point.x + point.vx * dt, y: point.y });
  const vyEnd = worldToCanvas({ x: point.x, y: point.y + point.vy * dt });
  const vEnd = worldToCanvas({ x: point.x + point.vx * dt, y: point.y + point.vy * dt });
  return {
    v: { x: vEnd.x - current.x, y: vEnd.y - current.y },
    vx: { x: vxEnd.x - current.x, y: vxEnd.y - current.y },
    vy: { x: vyEnd.x - current.x, y: vyEnd.y - current.y }
  };
}

function drawLabelBox(text, x, y, color) {
  ctx.save();
  ctx.font = "700 13px Avenir Next, PingFang SC, sans-serif";
  const widthText = ctx.measureText(text).width;
  const boxWidth = widthText + 22;
  const boxHeight = 30;
  ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(x, y, boxWidth, boxHeight, 14);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillText(text, x + 11, y + 20);
  ctx.restore();
}

function drawAxes() {
  const { range, maxHeight } = getDerived();
  const xMax = Math.max(10, range * 1.12);
  const yMax = Math.max(5, maxHeight * 1.35);
  ctx.strokeStyle = "rgba(18, 31, 36, 0.1)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= xMax; x += Math.max(2, Math.round(xMax / 8))) {
    const p = worldToCanvas({ x, y: 0 });
    ctx.beginPath();
    ctx.moveTo(p.x, padding.top);
    ctx.lineTo(p.x, height - padding.bottom);
    ctx.stroke();
    ctx.fillStyle = "rgba(18, 31, 36, 0.48)";
    ctx.font = "12px Avenir Next, PingFang SC, sans-serif";
    ctx.fillText(x.toFixed(0), p.x - 8, height - padding.bottom + 24);
  }
  for (let y = 0; y <= yMax; y += Math.max(1, Math.round(yMax / 5))) {
    const p = worldToCanvas({ x: 0, y });
    ctx.beginPath();
    ctx.moveTo(padding.left, p.y);
    ctx.lineTo(width - padding.right, p.y);
    ctx.stroke();
    ctx.fillStyle = "rgba(18, 31, 36, 0.48)";
    ctx.fillText(y.toFixed(0), padding.left - 34, p.y + 4);
  }
  const origin = worldToCanvas({ x: 0, y: 0 });
  ctx.strokeStyle = "rgba(18, 31, 36, 0.3)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding.left, origin.y);
  ctx.lineTo(width - padding.right, origin.y);
  ctx.stroke();
  ctx.fillStyle = "rgba(18, 31, 36, 0.62)";
  ctx.fillText("x / m", width - padding.right - 34, origin.y - 10);
  ctx.fillText("y / m", padding.left + 8, padding.top + 12);
}

function drawTrajectory() {
  if (!state.showTrail) return;
  const { flightTime, apexTime, range, maxHeight } = getDerived();
  ctx.strokeStyle = "#0d7168";
  ctx.lineWidth = state.demoMode ? 4 : 3;
  ctx.beginPath();
  for (let i = 0; i <= 180; i += 1) {
    const p = getPoint((flightTime * i) / 180);
    const c = worldToCanvas(p);
    if (i === 0) ctx.moveTo(c.x, c.y);
    else ctx.lineTo(c.x, c.y);
  }
  ctx.stroke();

  const apex = worldToCanvas({ x: getDerived().vx0 * apexTime, y: maxHeight });
  const landing = worldToCanvas({ x: range, y: 0 });
  ctx.setLineDash([7, 7]);
  ctx.strokeStyle = "rgba(123, 63, 160, 0.48)";
  ctx.beginPath();
  ctx.moveTo(apex.x, padding.top + 10);
  ctx.lineTo(apex.x, height - padding.bottom);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#7b3fa0";
  ctx.beginPath();
  ctx.arc(apex.x, apex.y, state.demoMode ? 6 : 5, 0, Math.PI * 2);
  ctx.fill();
  drawLabelBox("最高点 vy=0", apex.x - 52, apex.y - 42, "#7b3fa0");
  drawLabelBox("落地点", landing.x - 38, landing.y - 44, "#c96b29");
}

function getCriticalState() {
  const { apexTime, flightTime } = getDerived();
  if (Math.abs(state.time - apexTime) < flightTime * 0.06) {
    return { key: "apex", label: "最高点附近", note: "竖直速度接近 0，但水平速度仍保持不变。" };
  }
  if (state.time > flightTime * 0.9) {
    return { key: "landing", label: "接近落地", note: "物体回到地面高度，竖直速度方向向下。" };
  }
  return { key: "launch", label: state.time < apexTime ? "上升阶段" : "下降阶段", note: state.time < apexTime ? "竖直速度向上，但正在被重力减小。" : "竖直速度转向向下，水平速度仍不变。" };
}

function render() {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfcfa";
  ctx.fillRect(0, 0, width, height);
  drawAxes();
  drawTrajectory();

  const point = getPoint();
  const c = worldToCanvas(point);
  const vectors = getScreenVelocityVectors(point);
  ctx.fillStyle = "#121f24";
  ctx.beginPath();
  ctx.arc(c.x, c.y, state.demoMode ? 9 : 7, 0, Math.PI * 2);
  ctx.fill();

  const scale = state.demoMode ? 1.18 : 1;
  drawArrow(c, vectors.v, "#0d7168", "v", scale);
  if (state.showComponents) {
    drawArrow(c, vectors.vx, "#1f78b4", "vx", scale);
    drawArrow(c, vectors.vy, "#c96b29", "vy", scale);
  }
  drawArrow({ x: c.x + 28, y: c.y - 18 }, { x: 0, y: 1 }, "#7b3fa0", "g", 36);
  syncReadouts();
}

function syncReadouts() {
  const d = getDerived();
  if (state.time > d.flightTime) state.time = d.flightTime;
  const p = getPoint();
  const critical = getCriticalState();
  refs.speedValue.textContent = formatNumber(state.speed, 1, "m/s");
  refs.angleValue.textContent = `${state.angle.toFixed(0)}°`;
  refs.gravityValue.textContent = formatNumber(state.gravity, 1, "m/s²");
  refs.timeValue.textContent = formatNumber(p.t, 2, "s");
  refs.xMetric.textContent = formatNumber(p.x, 2, "m");
  refs.yMetric.textContent = formatNumber(Math.max(0, p.y), 2, "m");
  refs.vxMetric.textContent = formatNumber(p.vx, 2, "m/s");
  refs.vyMetric.textContent = formatNumber(p.vy, 2, "m/s");
  refs.rangeMetric.textContent = formatNumber(d.range, 2, "m");
  refs.timeMetric.textContent = formatNumber(p.t, 2, "s");
  refs.overviewSpeed.textContent = `${state.timeScale}x`;
  refs.overviewTime.textContent = formatNumber(p.t, 2, "s");
  refs.startButton.textContent = state.running ? "运行中" : "开始";
  refs.startButton.classList.toggle("primary", !state.running);
  refs.launchCard.classList.toggle("active", critical.key === "launch");
  refs.apexCard.classList.toggle("active", critical.key === "apex");
  refs.landingCard.classList.toggle("active", critical.key === "landing");
  refs.criticalStateLabel.textContent = critical.label;
  refs.criticalStateNote.textContent = critical.note;
  syncFocus(critical.key);
}

function syncInputs() {
  const { flightTime } = getDerived();
  refs.speedInput.value = state.speed;
  refs.angleInput.value = state.angle;
  refs.gravityInput.value = state.gravity;
  refs.speedNumber.value = state.speed;
  refs.angleNumber.value = state.angle;
  refs.gravityNumber.value = state.gravity;
  refs.timeInput.max = flightTime.toFixed(3);
  refs.timeNumber.max = flightTime.toFixed(3);
  refs.timeInput.value = Math.min(state.time, flightTime);
  refs.timeNumber.value = Math.min(state.time, flightTime).toFixed(2);
  refs.showComponentsToggle.checked = state.showComponents;
  refs.showTrailToggle.checked = state.showTrail;
  refs.demoModeToggle.checked = state.demoMode;
  refs.speedButtons.forEach((button) => button.classList.toggle("active", Number(button.dataset.speed) === state.timeScale));
  refs.presetTitle.textContent = modeConfigs[state.mode].title;
  refs.modeGoal.textContent = modeConfigs[state.mode].goal;
  refs.modePrompt.textContent = modeConfigs[state.mode].prompt;
  refs.modeFormula.textContent = modeConfigs[state.mode].formula;
  window.physicsTypesetMath?.();
  refs.presetButtons.forEach((button) => button.classList.toggle("active", button.dataset.mode === state.mode));
  document.body.classList.toggle("demo-mode", state.demoMode);
  refs.demoBadge.textContent = state.demoMode ? "教学演示中" : "";
}

function syncFocus(key) {
  refs.metricCards.forEach((card) => card.classList.remove("focused"));
  refs.modeFormula.classList.toggle("focused", key === "apex" || key === "landing");
  const focusMap = {
    launch: [refs.vxMetric.parentElement, refs.vyMetric.parentElement],
    apex: [refs.vyMetric.parentElement, refs.vxMetric.parentElement],
    landing: [refs.rangeMetric.parentElement, refs.timeMetric.parentElement, refs.yMetric.parentElement]
  };
  (focusMap[key] || []).forEach((card) => card.classList.add("focused"));
}

function pauseForObservation() {
  state.running = false;
  state.paused = false;
  refs.pauseButton.textContent = "暂停";
}

function setObservationTime(time) {
  state.time = Math.min(getDerived().flightTime, Math.max(0, Number(time)));
  pauseForObservation();
  syncInputs();
  render();
}

function jumpTo(kind) {
  const { apexTime, flightTime } = getDerived();
  if (kind === "apex") {
    state.mode = "apex";
    setObservationTime(apexTime);
  } else if (kind === "landing") {
    state.mode = "range";
    setObservationTime(flightTime);
  } else {
    state.mode = "decompose";
    setObservationTime(0);
  }
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

bindRange(refs.speedInput, refs.speedNumber, "speed");
bindRange(refs.angleInput, refs.angleNumber, "angle");
bindRange(refs.gravityInput, refs.gravityNumber, "gravity");

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
    if (state.mode === "apex") jumpTo("apex");
    else if (state.mode === "range") jumpTo("landing");
    syncInputs();
    render();
  });
});
refs.startButton.addEventListener("click", () => {
  const { flightTime } = getDerived();
  if (state.time >= flightTime - 0.01) {
    state.time = 0;
  }
  state.running = true;
  state.paused = false;
  refs.pauseButton.textContent = "暂停";
  syncInputs();
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
refs.showComponentsToggle.addEventListener("change", (event) => {
  state.showComponents = event.target.checked;
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
    if (state.time >= getDerived().flightTime) {
      state.time = getDerived().flightTime;
      state.running = false;
    }
  }
  render();
  animationFrame = requestAnimationFrame(animate);
}

syncInputs();
render();
cancelAnimationFrame(animationFrame);
animationFrame = requestAnimationFrame(animate);
