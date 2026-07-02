const state = {
  mass: 1,
  spring: 16,
  amplitude: 0.8,
  phase: 0,
  time: 0,
  timeScale: 1,
  running: false,
  paused: false,
  showVectors: true,
  showGraphs: true,
  demoMode: false
};

const refs = {
  motionCanvas: document.getElementById("motionCanvas"),
  graphCanvas: document.getElementById("graphCanvas"),
  phaseCanvas: document.getElementById("phaseCanvas"),
  startButton: document.getElementById("startButton"),
  pauseButton: document.getElementById("pauseButton"),
  resetButton: document.getElementById("resetButton"),
  massInput: document.getElementById("massInput"),
  springInput: document.getElementById("springInput"),
  amplitudeInput: document.getElementById("amplitudeInput"),
  phaseInput: document.getElementById("phaseInput"),
  timeInput: document.getElementById("timeInput"),
  massNumber: document.getElementById("massNumber"),
  springNumber: document.getElementById("springNumber"),
  amplitudeNumber: document.getElementById("amplitudeNumber"),
  phaseNumber: document.getElementById("phaseNumber"),
  timeNumber: document.getElementById("timeNumber"),
  massValue: document.getElementById("massValue"),
  springValue: document.getElementById("springValue"),
  amplitudeValue: document.getElementById("amplitudeValue"),
  phaseValue: document.getElementById("phaseValue"),
  timeValue: document.getElementById("timeValue"),
  stageXMetric: document.getElementById("stageXMetric"),
  stageVMetric: document.getElementById("stageVMetric"),
  stageAMetric: document.getElementById("stageAMetric"),
  stagePeriodMetric: document.getElementById("stagePeriodMetric"),
  stageEnergyMetric: document.getElementById("stageEnergyMetric"),
  leftCriticalCard: document.getElementById("leftCriticalCard"),
  centerCriticalCard: document.getElementById("centerCriticalCard"),
  rightCriticalCard: document.getElementById("rightCriticalCard"),
  criticalCards: Array.from(document.querySelectorAll(".critical-card[data-jump]")),
  criticalStateLabel: document.getElementById("criticalStateLabel"),
  criticalStateNote: document.getElementById("criticalStateNote"),
  kineticBar: document.getElementById("kineticBar"),
  potentialBar: document.getElementById("potentialBar"),
  totalBar: document.getElementById("totalBar"),
  kineticMetric: document.getElementById("kineticMetric"),
  potentialMetric: document.getElementById("potentialMetric"),
  totalMetric: document.getElementById("totalMetric"),
  showVectorsToggle: document.getElementById("showVectorsToggle"),
  showGraphsToggle: document.getElementById("showGraphsToggle"),
  demoModeToggle: document.getElementById("demoModeToggle"),
  speedButtons: Array.from(document.querySelectorAll(".speed-button")),
  overviewSpeed: document.getElementById("overviewSpeed"),
  overviewTime: document.getElementById("overviewTime"),
  demoBadge: document.getElementById("demoBadge")
};

const motionCtx = refs.motionCanvas.getContext("2d");
const graphCtx = refs.graphCanvas.getContext("2d");
const phaseCtx = refs.phaseCanvas.getContext("2d");
const dpr = window.devicePixelRatio || 1;
const canvases = [
  { canvas: refs.motionCanvas, ctx: motionCtx, width: 980, height: 390 },
  { canvas: refs.graphCanvas, ctx: graphCtx, width: 980, height: 300 },
  { canvas: refs.phaseCanvas, ctx: phaseCtx, width: 420, height: 300 }
];

canvases.forEach(({ canvas, ctx, width, height }) => {
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
});

let lastFrameTime = null;
let animationFrame = 0;

function getDerived() {
  const omega = Math.sqrt(state.spring / state.mass);
  const period = (2 * Math.PI) / omega;
  const phaseRad = (state.phase * Math.PI) / 180;
  const angle = omega * state.time + phaseRad;
  const x = state.amplitude * Math.cos(angle);
  const v = -state.amplitude * omega * Math.sin(angle);
  const a = -omega * omega * x;
  const kinetic = 0.5 * state.mass * v * v;
  const potential = 0.5 * state.spring * x * x;
  const total = 0.5 * state.spring * state.amplitude * state.amplitude;

  return { omega, period, phaseRad, angle, x, v, a, kinetic, potential, total };
}

function wrapTimeToPeriod(time, period = getDerived().period) {
  return ((time % period) + period) % period;
}

function getCriticalTime(target) {
  const { omega, period, phaseRad } = getDerived();
  const targetAngles = {
    right: 0,
    center: Math.PI / 2,
    left: Math.PI
  };
  const targetAngle = targetAngles[target] ?? 0;
  const rawTime = (targetAngle - phaseRad) / omega;
  return wrapTimeToPeriod(rawTime, period);
}

function pauseForObservation() {
  state.running = false;
  state.paused = false;
  refs.pauseButton.textContent = "暂停";
}

function setObservationTime(time) {
  const { period } = getDerived();
  state.time = Math.min(period, Math.max(0, Number(time)));
  pauseForObservation();
  syncInputs();
  render();
}

function formatNumber(value, digits = 2, unit = "") {
  if (!Number.isFinite(value)) return "--";
  const abs = Math.abs(value);
  const text = abs >= 1000 || (abs > 0 && abs < 0.01) ? value.toExponential(2).replace("+", "") : value.toFixed(digits);
  return unit ? `${text} ${unit}` : text;
}

function drawArrow(ctx, start, vector, color, label, scale = 1) {
  const magnitude = Math.hypot(vector.x, vector.y);
  if (!Number.isFinite(magnitude) || magnitude < 1e-8) return;

  const length = Math.min(92, Math.max(26, magnitude * scale));
  const unit = { x: vector.x / magnitude, y: vector.y / magnitude };
  const end = {
    x: start.x + unit.x * length,
    y: start.y + unit.y * length
  };
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const head = state.demoMode ? 12 : 8;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = state.demoMode ? 3 : 2;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(end.x - head * Math.cos(angle - Math.PI / 6), end.y - head * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(end.x - head * Math.cos(angle + Math.PI / 6), end.y - head * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  ctx.font = `${state.demoMode ? 16 : 12}px "Avenir Next", "PingFang SC", sans-serif`;
  ctx.fillText(label, end.x + 8, end.y - 8);
}

function drawSpring(ctx, startX, endX, y) {
  const coils = 12;
  const amplitude = 18;
  const lead = 28;
  const springStart = startX + lead;
  const springEnd = endX - 34;
  const span = Math.max(80, springEnd - springStart);

  ctx.strokeStyle = "#0d7168";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(startX, y);
  ctx.lineTo(springStart, y);
  for (let i = 0; i <= coils * 2; i += 1) {
    const x = springStart + (span * i) / (coils * 2);
    const offset = i === 0 || i === coils * 2 ? 0 : i % 2 === 0 ? -amplitude : amplitude;
    ctx.lineTo(x, y + offset);
  }
  ctx.lineTo(endX, y);
  ctx.stroke();
}

function getCriticalState(derived = getDerived()) {
  const threshold = Math.max(state.amplitude * 0.16, 0.06);
  const nearLeft = Math.abs(derived.x + state.amplitude) <= threshold;
  const nearRight = Math.abs(derived.x - state.amplitude) <= threshold;
  const nearCenter = Math.abs(derived.x) <= threshold;

  if (nearLeft) {
    return {
      key: "left",
      label: "左端点附近",
      note: "速度接近 0，回复力、加速度和弹性势能都接近最大。"
    };
  }

  if (nearRight) {
    return {
      key: "right",
      label: "右端点附近",
      note: "速度接近 0，回复力、加速度和弹性势能都接近最大。"
    };
  }

  if (nearCenter) {
    return {
      key: "center",
      label: "平衡位置附近",
      note: "速率和动能接近最大，加速度接近 0，物块不会在这里停下。"
    };
  }

  if (Math.sign(derived.x) === Math.sign(derived.v)) {
    return {
      key: "transfer",
      label: "远离平衡位置",
      note: "物块正在远离平衡位置，动能逐渐转化为弹性势能。"
    };
  }

  return {
    key: "transfer",
    label: "靠近平衡位置",
    note: "物块正在靠近平衡位置，弹性势能逐渐转化为动能。"
  };
}

function drawMotion() {
  const derived = getDerived();
  const { x, v, a, period } = derived;
  const critical = getCriticalState(derived);
  const ctx = motionCtx;
  const width = 980;
  const height = 390;
  const originX = 500;
  const originY = 205;
  const scale = Math.min(190, 250 / Math.max(state.amplitude, 0.2));
  const massX = originX + x * scale;
  const wallX = 94;
  const massWidth = state.demoMode ? 76 : 62;
  const massHeight = state.demoMode ? 76 : 62;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfcfa";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(18, 31, 36, 0.08)";
  ctx.lineWidth = 1;
  for (let gx = 80; gx < width - 40; gx += 60) {
    ctx.beginPath();
    ctx.moveTo(gx, 54);
    ctx.lineTo(gx, height - 66);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(18, 31, 36, 0.28)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(wallX, 92);
  ctx.lineTo(wallX, 318);
  ctx.stroke();
  for (let y = 104; y < 314; y += 18) {
    ctx.beginPath();
    ctx.moveTo(wallX - 18, y + 14);
    ctx.lineTo(wallX, y);
    ctx.stroke();
  }

  const leftAmp = originX - state.amplitude * scale;
  const rightAmp = originX + state.amplitude * scale;
  const markers = [
    { key: "left", x: leftAmp, label: "-A", note: "端点" },
    { key: "center", x: originX, label: "O", note: "v 最大" },
    { key: "right", x: rightAmp, label: "+A", note: "端点" }
  ];

  ctx.strokeStyle = "rgba(201, 107, 41, 0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(leftAmp, 304);
  ctx.lineTo(rightAmp, 304);
  ctx.stroke();

  markers.forEach((marker) => {
    const active = marker.key === critical.key;
    ctx.save();
    ctx.strokeStyle = active ? "#0d7168" : "rgba(18, 31, 36, 0.2)";
    ctx.fillStyle = active ? "rgba(13, 113, 104, 0.12)" : "rgba(255, 255, 255, 0)";
    ctx.lineWidth = active ? 3 : 2;
    ctx.setLineDash(active ? [] : [8, 8]);
    ctx.beginPath();
    ctx.moveTo(marker.x, 72);
    ctx.lineTo(marker.x, 330);
    ctx.stroke();
    ctx.setLineDash([]);
    if (active) {
      ctx.beginPath();
      ctx.roundRect(marker.x - 44, 72, 88, 46, 12);
      ctx.fill();
    }
    ctx.fillStyle = active ? "#0d7168" : "rgba(18, 31, 36, 0.62)";
    ctx.font = `${active ? 15 : 13}px Avenir Next, PingFang SC, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(marker.label, marker.x, 326);
    ctx.fillText(marker.note, marker.x, active ? 100 : 94);
    ctx.restore();
  });

  drawSpring(ctx, wallX, massX - massWidth / 2, originY);

  ctx.fillStyle = "#121f24";
  ctx.beginPath();
  ctx.roundRect(massX - massWidth / 2, originY - massHeight / 2, massWidth, massHeight, 12);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `${state.demoMode ? 18 : 14}px Avenir Next, PingFang SC, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("m", massX, originY);
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "#5c686d";
  ctx.font = "13px Avenir Next, PingFang SC, sans-serif";
  ctx.fillText(`t = ${state.time.toFixed(2)} s`, 34, 36);
  ctx.fillText(`周期 T = ${period.toFixed(2)} s`, 34, 58);

  if (state.showVectors) {
    drawArrow(ctx, { x: massX, y: originY - 54 }, { x: v, y: 0 }, "#1f78b4", "v", 26 / Math.max(state.amplitude * Math.sqrt(state.spring / state.mass), 0.1));
    drawArrow(ctx, { x: massX, y: originY + 58 }, { x: a, y: 0 }, "#7b3fa0", "a", 12 / Math.max(state.amplitude * state.spring / state.mass, 0.1));
  }
}

function drawAxes(ctx, width, height, padding, xLabel, yLabel) {
  ctx.strokeStyle = "rgba(18, 31, 36, 0.18)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(padding, height / 2);
  ctx.lineTo(width - padding, height / 2);
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.stroke();
  ctx.fillStyle = "rgba(18, 31, 36, 0.62)";
  ctx.font = "12px Avenir Next, PingFang SC, sans-serif";
  ctx.fillText(xLabel, width - padding - 14, height / 2 - 10);
  ctx.fillText(yLabel, padding + 10, padding + 12);
}

function drawTimeGraph() {
  const ctx = graphCtx;
  const width = 980;
  const height = 300;
  const padding = 44;
  const { omega, period } = getDerived();
  const windowLength = Math.max(period * 2, 2);
  const startTime = Math.max(0, state.time - windowLength * 0.72);
  const endTime = startTime + windowLength;
  const samples = 240;
  const maxV = Math.max(state.amplitude * omega, 0.01);
  const maxA = Math.max(state.amplitude * omega * omega, 0.01);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfcfa";
  ctx.fillRect(0, 0, width, height);
  drawAxes(ctx, width, height, padding, "t", "归一化");

  const series = [
    { color: "#0d7168", label: "x/A", fn: (t) => sampleAt(t).x / state.amplitude },
    { color: "#1f78b4", label: "v/vmax", fn: (t) => sampleAt(t).v / maxV },
    { color: "#7b3fa0", label: "a/amax", fn: (t) => sampleAt(t).a / maxA }
  ];

  series.forEach((item) => {
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let i = 0; i <= samples; i += 1) {
      const ratio = i / samples;
      const t = startTime + ratio * (endTime - startTime);
      const px = padding + ratio * (width - padding * 2);
      const py = height / 2 - item.fn(t) * 96;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  });

  const nowRatio = (state.time - startTime) / (endTime - startTime);
  const nowX = padding + nowRatio * (width - padding * 2);
  ctx.strokeStyle = "rgba(18, 31, 36, 0.28)";
  ctx.setLineDash([5, 6]);
  ctx.beginPath();
  ctx.moveTo(nowX, padding);
  ctx.lineTo(nowX, height - padding);
  ctx.stroke();
  ctx.setLineDash([]);

  series.forEach((item, index) => {
    ctx.fillStyle = item.color;
    ctx.fillRect(width - 134, 28 + index * 22, 14, 4);
    ctx.fillText(item.label, width - 112, 34 + index * 22);
  });
}

function sampleAt(time) {
  const omega = Math.sqrt(state.spring / state.mass);
  const phaseRad = (state.phase * Math.PI) / 180;
  const angle = omega * time + phaseRad;
  const x = state.amplitude * Math.cos(angle);
  const v = -state.amplitude * omega * Math.sin(angle);
  const a = -omega * omega * x;
  return { x, v, a };
}

function drawPhaseGraph() {
  const ctx = phaseCtx;
  const width = 420;
  const height = 300;
  const padding = 42;
  const { angle, x, v, omega } = getDerived();
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.31;
  const point = {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius
  };
  const projection = {
    x: cx + (x / state.amplitude) * radius,
    y: cy
  };
  const normalizedVelocity = -v / omega;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfcfa";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(18, 31, 36, 0.18)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(padding, cy);
  ctx.lineTo(width - padding, cy);
  ctx.moveTo(cx, padding);
  ctx.lineTo(cx, height - padding);
  ctx.stroke();

  ctx.fillStyle = "rgba(18, 31, 36, 0.62)";
  ctx.font = "12px Avenir Next, PingFang SC, sans-serif";
  ctx.fillText("x", width - padding - 10, cy - 10);
  ctx.fillText("-v/ω", cx + 10, padding + 12);

  ctx.strokeStyle = "rgba(13, 113, 104, 0.84)";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(31, 120, 180, 0.7)";
  ctx.setLineDash([7, 6]);
  ctx.beginPath();
  ctx.moveTo(point.x, point.y);
  ctx.lineTo(projection.x, projection.y);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = "rgba(123, 63, 160, 0.75)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(point.x, point.y);
  ctx.stroke();

  ctx.fillStyle = "rgba(201, 107, 41, 0.9)";
  ctx.beginPath();
  ctx.arc(projection.x, projection.y, state.demoMode ? 7 : 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#121f24";
  ctx.beginPath();
  ctx.arc(point.x, point.y, state.demoMode ? 7 : 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(18, 31, 36, 0.72)";
  ctx.font = "12px Avenir Next, PingFang SC, sans-serif";
  ctx.fillText("圆上点匀速转动", 22, 28);
  ctx.fillText("水平投影就是 x", projection.x + 8, projection.y + 18);
  ctx.fillText(`x = ${formatNumber(x, 2, "m")}`, 22, height - 42);
  ctx.fillText(`-v/ω = ${formatNumber(normalizedVelocity, 2, "m")}`, 22, height - 22);
}

function updateEnergyBars() {
  const { kinetic, potential, total } = getDerived();
  const kineticRatio = total > 0 ? kinetic / total : 0;
  const potentialRatio = total > 0 ? potential / total : 0;
  refs.kineticBar.style.width = `${Math.max(0, Math.min(100, kineticRatio * 100))}%`;
  refs.potentialBar.style.width = `${Math.max(0, Math.min(100, potentialRatio * 100))}%`;
  refs.totalBar.style.width = "100%";
  refs.kineticMetric.textContent = formatNumber(kinetic, 3, "J");
  refs.potentialMetric.textContent = formatNumber(potential, 3, "J");
  refs.totalMetric.textContent = formatNumber(total, 3, "J");
}

function syncReadouts() {
  const derived = getDerived();
  const { x, v, a, period, total } = derived;
  const critical = getCriticalState(derived);
  const observationTime = wrapTimeToPeriod(state.time, period);
  refs.massValue.textContent = `${state.mass.toFixed(2)} kg`;
  refs.springValue.textContent = `${state.spring.toFixed(1)} N/m`;
  refs.amplitudeValue.textContent = `${state.amplitude.toFixed(2)} m`;
  refs.phaseValue.textContent = `${state.phase.toFixed(0)}°`;
  refs.timeValue.textContent = `${observationTime.toFixed(2)} s`;
  refs.stageXMetric.textContent = formatNumber(x, 3, "m");
  refs.stageVMetric.textContent = formatNumber(v, 3, "m/s");
  refs.stageAMetric.textContent = formatNumber(a, 3, "m/s²");
  refs.stagePeriodMetric.textContent = formatNumber(period, 3, "s");
  refs.stageEnergyMetric.textContent = formatNumber(total, 3, "J");
  refs.leftCriticalCard.classList.toggle("active", critical.key === "left");
  refs.centerCriticalCard.classList.toggle("active", critical.key === "center");
  refs.rightCriticalCard.classList.toggle("active", critical.key === "right");
  refs.criticalStateLabel.textContent = critical.label;
  refs.criticalStateNote.textContent = critical.note;
  refs.overviewSpeed.textContent = `${state.timeScale}x`;
  refs.overviewTime.textContent = `${state.time.toFixed(2)} s`;
  refs.startButton.textContent = state.running ? "运行中" : "开始";
  refs.startButton.classList.toggle("primary", !state.running);
  updateEnergyBars();
}

function syncInputs() {
  const { period } = getDerived();
  const observationTime = wrapTimeToPeriod(state.time, period);
  refs.massInput.value = state.mass;
  refs.springInput.value = state.spring;
  refs.amplitudeInput.value = state.amplitude;
  refs.phaseInput.value = state.phase;
  refs.timeInput.max = period.toFixed(3);
  refs.timeInput.value = observationTime;
  refs.massNumber.value = state.mass;
  refs.springNumber.value = state.spring;
  refs.amplitudeNumber.value = state.amplitude;
  refs.phaseNumber.value = state.phase;
  refs.timeNumber.max = period.toFixed(3);
  refs.timeNumber.value = observationTime.toFixed(2);
  refs.showVectorsToggle.checked = state.showVectors;
  refs.showGraphsToggle.checked = state.showGraphs;
  refs.demoModeToggle.checked = state.demoMode;
  refs.speedButtons.forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.speed) === state.timeScale);
  });
  document.body.classList.toggle("demo-mode", state.demoMode);
  document.body.classList.toggle("hide-graphs", !state.showGraphs);
  refs.demoBadge.textContent = state.demoMode ? "教学演示中" : "";
}

function render() {
  drawMotion();
  if (state.showGraphs) {
    drawTimeGraph();
    drawPhaseGraph();
  }
  syncReadouts();
}

function animate(timestamp) {
  if (lastFrameTime == null) {
    lastFrameTime = timestamp;
  }
  const elapsed = Math.min(0.05, (timestamp - lastFrameTime) / 1000);
  lastFrameTime = timestamp;

  if (state.running && !state.paused) {
    state.time += elapsed * state.timeScale;
  }

  render();
  animationFrame = requestAnimationFrame(animate);
}

function resetSimulation() {
  state.time = 0;
  state.running = false;
  state.paused = false;
  refs.pauseButton.textContent = "暂停";
  lastFrameTime = null;
  render();
}

function applyParameterChange() {
  state.time = wrapTimeToPeriod(state.time);
  syncInputs();
  render();
}

function bindRange(range, number, key) {
  range.addEventListener("input", (event) => {
    state[key] = Number(event.target.value);
    applyParameterChange();
  });
  number.addEventListener("change", (event) => {
    const next = Number(event.target.value);
    if (!Number.isFinite(next)) {
      syncInputs();
      return;
    }
    const min = Number(number.min);
    const max = Number(number.max);
    state[key] = Math.min(max, Math.max(min, next));
    applyParameterChange();
  });
}

bindRange(refs.massInput, refs.massNumber, "mass");
bindRange(refs.springInput, refs.springNumber, "spring");
bindRange(refs.amplitudeInput, refs.amplitudeNumber, "amplitude");
bindRange(refs.phaseInput, refs.phaseNumber, "phase");

refs.timeInput.addEventListener("input", (event) => {
  setObservationTime(event.target.value);
});

refs.timeNumber.addEventListener("change", (event) => {
  const next = Number(event.target.value);
  if (!Number.isFinite(next)) {
    syncInputs();
    return;
  }
  setObservationTime(next);
});

refs.criticalCards.forEach((card) => {
  function jumpToCriticalPoint() {
    setObservationTime(getCriticalTime(card.dataset.jump));
  }

  card.addEventListener("click", jumpToCriticalPoint);
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      jumpToCriticalPoint();
    }
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

refs.resetButton.addEventListener("click", resetSimulation);

refs.showVectorsToggle.addEventListener("change", (event) => {
  state.showVectors = event.target.checked;
  syncInputs();
  render();
});

refs.showGraphsToggle.addEventListener("change", (event) => {
  state.showGraphs = event.target.checked;
  syncInputs();
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

syncInputs();
render();
cancelAnimationFrame(animationFrame);
animationFrame = requestAnimationFrame(animate);
