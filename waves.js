const state = {
  amplitude: 0.8,
  wavelength: 2,
  frequency: 1,
  phase: 0,
  time: 0,
  timeScale: 1,
  mode: "combined",
  running: false,
  paused: false,
  showComponents: true,
  showMarkers: true,
  demoMode: false
};

const refs = {
  waveCanvas: document.getElementById("waveCanvas"),
  startButton: document.getElementById("startButton"),
  pauseButton: document.getElementById("pauseButton"),
  resetButton: document.getElementById("resetButton"),
  presetTitle: document.getElementById("presetTitle"),
  presetButtons: Array.from(document.querySelectorAll(".preset-button")),
  modeGoal: document.getElementById("modeGoal"),
  modePrompt: document.getElementById("modePrompt"),
  modeFormula: document.getElementById("modeFormula"),
  amplitudeInput: document.getElementById("amplitudeInput"),
  wavelengthInput: document.getElementById("wavelengthInput"),
  frequencyInput: document.getElementById("frequencyInput"),
  phaseInput: document.getElementById("phaseInput"),
  timeInput: document.getElementById("timeInput"),
  amplitudeNumber: document.getElementById("amplitudeNumber"),
  wavelengthNumber: document.getElementById("wavelengthNumber"),
  frequencyNumber: document.getElementById("frequencyNumber"),
  phaseNumber: document.getElementById("phaseNumber"),
  timeNumber: document.getElementById("timeNumber"),
  amplitudeValue: document.getElementById("amplitudeValue"),
  wavelengthValue: document.getElementById("wavelengthValue"),
  frequencyValue: document.getElementById("frequencyValue"),
  phaseValue: document.getElementById("phaseValue"),
  timeValue: document.getElementById("timeValue"),
  wavelengthMetric: document.getElementById("wavelengthMetric"),
  frequencyMetric: document.getElementById("frequencyMetric"),
  speedMetric: document.getElementById("speedMetric"),
  nodeSpacingMetric: document.getElementById("nodeSpacingMetric"),
  timeMetric: document.getElementById("timeMetric"),
  nodeCard: document.getElementById("nodeCard"),
  antinodeCard: document.getElementById("antinodeCard"),
  constructiveCard: document.getElementById("constructiveCard"),
  criticalCards: Array.from(document.querySelectorAll(".critical-card[data-jump]")),
  criticalStateLabel: document.getElementById("criticalStateLabel"),
  criticalStateNote: document.getElementById("criticalStateNote"),
  showComponentsToggle: document.getElementById("showComponentsToggle"),
  showMarkersToggle: document.getElementById("showMarkersToggle"),
  demoModeToggle: document.getElementById("demoModeToggle"),
  speedButtons: Array.from(document.querySelectorAll(".speed-button")),
  overviewSpeed: document.getElementById("overviewSpeed"),
  overviewTime: document.getElementById("overviewTime"),
  demoBadge: document.getElementById("demoBadge")
};

const ctx = refs.waveCanvas.getContext("2d");
const dpr = window.devicePixelRatio || 1;
const width = 980;
const height = 470;
refs.waveCanvas.width = width * dpr;
refs.waveCanvas.height = height * dpr;
ctx.scale(dpr, dpr);

const xMin = 0;
const xMax = 8;
const yMax = 2.3;
const padding = { left: 56, right: 36, top: 44, bottom: 58 };

let lastFrameTime = null;
let animationFrame = 0;

const modeConfigs = {
  combined: {
    title: "分波合成",
    goal: "观察两列波如何叠加形成驻波",
    prompt: "先分别看入射波和反射波，再看合成波中哪些点始终不动，哪些点振幅最大。",
    formula: "\\(y = y_1 + y_2\\)"
  },
  standing: {
    title: "驻波结构",
    goal: "观察节点和腹部的位置是否会移动",
    prompt: "节点始终静止，腹部振幅最大；驻波不是波形整体向前传播。",
    formula: "\\(y = 2A\\sin(kx)\\cos(\\omega t)\\)"
  },
  interference: {
    title: "定点叠加",
    goal: "在同一个位置比较两列波如何相加或抵消",
    prompt: "看竖直探针处的 y₁、y₂ 和合位移 y：同向时相长，反向时相消。",
    formula: "某点处：\\(y = y_1 + y_2\\)"
  }
};

function getDerived() {
  const k = (2 * Math.PI) / state.wavelength;
  const omega = 2 * Math.PI * state.frequency;
  const period = 1 / state.frequency;
  const speed = state.wavelength * state.frequency;
  const phaseRad = (state.phase * Math.PI) / 180;
  return { k, omega, period, speed, phaseRad };
}

function yIncident(x, time = state.time) {
  const { k, omega } = getDerived();
  return state.amplitude * Math.sin(k * x - omega * time);
}

function yReflected(x, time = state.time) {
  const { k, omega, phaseRad } = getDerived();
  return state.amplitude * Math.sin(k * x + omega * time + phaseRad);
}

function ySum(x, time = state.time) {
  return yIncident(x, time) + yReflected(x, time);
}

function formatNumber(value, digits = 2, unit = "") {
  if (!Number.isFinite(value)) return "--";
  const text = Math.abs(value) >= 1000 || (Math.abs(value) > 0 && Math.abs(value) < 0.01)
    ? value.toExponential(2).replace("+", "")
    : value.toFixed(digits);
  return unit ? `${text} ${unit}` : text;
}

function worldToCanvas(point) {
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  return {
    x: padding.left + ((point.x - xMin) / (xMax - xMin)) * innerWidth,
    y: height - padding.bottom - ((point.y + yMax) / (2 * yMax)) * innerHeight
  };
}

function drawAxes() {
  ctx.strokeStyle = "rgba(18, 31, 36, 0.12)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= xMax + 0.001; x += 0.5) {
    const p = worldToCanvas({ x, y: 0 });
    ctx.beginPath();
    ctx.moveTo(p.x, padding.top);
    ctx.lineTo(p.x, height - padding.bottom);
    ctx.stroke();
  }
  for (let y = -2; y <= 2.001; y += 0.5) {
    const p = worldToCanvas({ x: 0, y });
    ctx.beginPath();
    ctx.moveTo(padding.left, p.y);
    ctx.lineTo(width - padding.right, p.y);
    ctx.stroke();
  }

  const origin = worldToCanvas({ x: 0, y: 0 });
  ctx.strokeStyle = "rgba(18, 31, 36, 0.28)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding.left, origin.y);
  ctx.lineTo(width - padding.right, origin.y);
  ctx.stroke();

  ctx.fillStyle = "rgba(18, 31, 36, 0.62)";
  ctx.font = "12px Avenir Next, PingFang SC, sans-serif";
  ctx.fillText("x / m", width - padding.right - 32, origin.y - 10);
  ctx.fillText("y", padding.left + 8, padding.top + 12);
}

function drawWave(fn, color, label, lineWidth = 2.4, dash = []) {
  const samples = 520;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash(dash);
  ctx.beginPath();
  for (let i = 0; i <= samples; i += 1) {
    const x = xMin + ((xMax - xMin) * i) / samples;
    const p = worldToCanvas({ x, y: fn(x) });
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = color;
  ctx.font = "13px Avenir Next, PingFang SC, sans-serif";
  ctx.fillText(label, padding.left + 12, padding.top + (label === "y₁ 入射波" ? 18 : label === "y₂ 反射波" ? 40 : 62));
  ctx.restore();
}

function getNodePositions() {
  const nodes = [];
  for (let x = 0; x <= xMax + 0.001; x += state.wavelength / 2) {
    nodes.push(x);
  }
  return nodes;
}

function getAntinodePositions() {
  const antinodes = [];
  for (let x = state.wavelength / 4; x <= xMax + 0.001; x += state.wavelength / 2) {
    antinodes.push(x);
  }
  return antinodes;
}

function drawMarkers() {
  if (!state.showMarkers) return;

  const nodePositions = getNodePositions();
  const antinodePositions = getAntinodePositions();

  nodePositions.forEach((x) => {
    const p = worldToCanvas({ x, y: 0 });
    ctx.strokeStyle = "rgba(123, 63, 160, 0.54)";
    ctx.lineWidth = 1.8;
    ctx.setLineDash([6, 7]);
    ctx.beginPath();
    ctx.moveTo(p.x, padding.top + 12);
    ctx.lineTo(p.x, height - padding.bottom - 12);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(123, 63, 160, 0.88)";
    ctx.font = "12px Avenir Next, PingFang SC, sans-serif";
    ctx.fillText("节点", p.x - 13, height - padding.bottom + 26);
  });

  antinodePositions.forEach((x) => {
    const p = worldToCanvas({ x, y: 0 });
    ctx.strokeStyle = "rgba(13, 113, 104, 0.5)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(p.x, padding.top + 22);
    ctx.lineTo(p.x, height - padding.bottom - 22);
    ctx.stroke();
    ctx.fillStyle = "rgba(13, 113, 104, 0.88)";
    ctx.font = "12px Avenir Next, PingFang SC, sans-serif";
    ctx.fillText("腹部", p.x - 13, padding.top + 16);
  });
}

function drawProbe(x, label, color) {
  const base = worldToCanvas({ x, y: 0 });
  const p1 = worldToCanvas({ x, y: yIncident(x) });
  const p2 = worldToCanvas({ x, y: yReflected(x) });
  const ps = worldToCanvas({ x, y: ySum(x) });

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.setLineDash([5, 6]);
  ctx.beginPath();
  ctx.moveTo(base.x, padding.top + 16);
  ctx.lineTo(base.x, height - padding.bottom - 16);
  ctx.stroke();
  ctx.setLineDash([]);

  [
    { point: p1, text: "y₁", fill: "#1f78b4" },
    { point: p2, text: "y₂", fill: "#c96b29" },
    { point: ps, text: "y", fill: "#0d7168" }
  ].forEach((item, index) => {
    ctx.fillStyle = item.fill;
    ctx.beginPath();
    ctx.arc(item.point.x, item.point.y, index === 2 ? 6 : 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "700 12px Avenir Next, PingFang SC, sans-serif";
    ctx.fillText(item.text, item.point.x + 8, item.point.y + 4);
  });

  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  const labelY = label.includes("腹部") ? padding.top + 16 : padding.top + 52;
  ctx.beginPath();
  ctx.roundRect(base.x - 42, labelY, 84, 28, 14);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = "700 12px Avenir Next, PingFang SC, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, base.x, labelY + 19);
  ctx.restore();
}

function getCriticalState() {
  const x = state.wavelength / 4;
  const incident = yIncident(x);
  const reflected = yReflected(x);
  const sameDirection = incident * reflected > 0;
  if (Math.abs(incident + reflected) < state.amplitude * 0.16) {
    return {
      key: "node",
      label: "相消明显",
      note: "两列波此处接近等大反向，合成位移接近 0。"
    };
  }
  if (sameDirection) {
    return {
      key: "constructive",
      label: "相长叠加",
      note: "两列波位移同号，合成位移比单列波更大。"
    };
  }
  return {
    key: "antinode",
    label: "腹部振动",
    note: "腹部位置不移动，但位移随时间在最大和最小之间变化。"
  };
}

function render() {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfcfa";
  ctx.fillRect(0, 0, width, height);
  drawAxes();
  drawMarkers();

  if (state.showComponents && state.mode !== "standing") {
    drawWave(yIncident, "#1f78b4", "y₁ 入射波", 2, [7, 6]);
    drawWave(yReflected, "#c96b29", "y₂ 反射波", 2, [3, 6]);
  }
  drawWave(ySum, "#0d7168", "y 合成波", state.demoMode ? 4 : 3);

  if (state.mode === "interference") {
    drawProbe(state.wavelength / 4, "腹部相长", "#0d7168");
    drawProbe(state.wavelength, "节点相消", "#7b3fa0");
  }

  const p = worldToCanvas({ x: state.wavelength / 4, y: ySum(state.wavelength / 4) });
  ctx.fillStyle = "#121f24";
  ctx.beginPath();
  ctx.arc(p.x, p.y, state.demoMode ? 7 : 5, 0, Math.PI * 2);
  ctx.fill();

  syncReadouts();
}

function syncReadouts() {
  const { period, speed } = getDerived();
  const critical = getCriticalState();
  refs.amplitudeValue.textContent = formatNumber(state.amplitude, 2, "m");
  refs.wavelengthValue.textContent = formatNumber(state.wavelength, 2, "m");
  refs.frequencyValue.textContent = formatNumber(state.frequency, 2, "Hz");
  refs.phaseValue.textContent = `${state.phase.toFixed(0)}°`;
  refs.timeValue.textContent = `${(state.time % period).toFixed(2)} s`;
  refs.wavelengthMetric.textContent = formatNumber(state.wavelength, 2, "m");
  refs.frequencyMetric.textContent = formatNumber(state.frequency, 2, "Hz");
  refs.speedMetric.textContent = formatNumber(speed, 2, "m/s");
  refs.nodeSpacingMetric.textContent = formatNumber(state.wavelength / 2, 2, "m");
  refs.timeMetric.textContent = `${(state.time % period).toFixed(2)} s`;
  refs.overviewSpeed.textContent = `${state.timeScale}x`;
  refs.overviewTime.textContent = `${(state.time % period).toFixed(2)} s`;
  refs.startButton.textContent = state.running ? "运行中" : "开始";
  refs.startButton.classList.toggle("primary", !state.running);
  refs.nodeCard.classList.toggle("active", critical.key === "node");
  refs.antinodeCard.classList.toggle("active", critical.key === "antinode");
  refs.constructiveCard.classList.toggle("active", critical.key === "constructive");
  refs.criticalStateLabel.textContent = critical.label;
  refs.criticalStateNote.textContent = critical.note;
}

function syncInputs() {
  const { period } = getDerived();
  const localTime = ((state.time % period) + period) % period;
  refs.amplitudeInput.value = state.amplitude;
  refs.wavelengthInput.value = state.wavelength;
  refs.frequencyInput.value = state.frequency;
  refs.phaseInput.value = state.phase;
  refs.timeInput.max = period.toFixed(3);
  refs.timeInput.value = localTime;
  refs.amplitudeNumber.value = state.amplitude;
  refs.wavelengthNumber.value = state.wavelength;
  refs.frequencyNumber.value = state.frequency;
  refs.phaseNumber.value = state.phase;
  refs.timeNumber.max = period.toFixed(3);
  refs.timeNumber.value = localTime.toFixed(2);
  refs.showComponentsToggle.checked = state.showComponents;
  refs.showMarkersToggle.checked = state.showMarkers;
  refs.demoModeToggle.checked = state.demoMode;
  refs.speedButtons.forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.speed) === state.timeScale);
  });
  refs.presetTitle.textContent = modeConfigs[state.mode].title;
  refs.modeGoal.textContent = modeConfigs[state.mode].goal;
  refs.modePrompt.textContent = modeConfigs[state.mode].prompt;
  refs.modeFormula.textContent = modeConfigs[state.mode].formula;
  window.physicsTypesetMath?.();
  refs.presetButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === state.mode);
  });
  document.body.classList.toggle("demo-mode", state.demoMode);
  refs.demoBadge.textContent = state.demoMode ? "教学演示中" : "";
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

function jumpTo(kind) {
  const { period } = getDerived();
  if (kind === "node") {
    setObservationTime(0);
  } else if (kind === "antinode") {
    setObservationTime(period / 4);
  } else {
    setObservationTime(period / 8);
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
    if (!Number.isFinite(next)) {
      syncInputs();
      return;
    }
    const min = Number(number.min);
    const max = Number(number.max);
    state[key] = Math.min(max, Math.max(min, next));
    state.time = 0;
    syncInputs();
    render();
  });
}

bindRange(refs.amplitudeInput, refs.amplitudeNumber, "amplitude");
bindRange(refs.wavelengthInput, refs.wavelengthNumber, "wavelength");
bindRange(refs.frequencyInput, refs.frequencyNumber, "frequency");
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
    state.showComponents = state.mode !== "standing";
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

refs.showComponentsToggle.addEventListener("change", (event) => {
  state.showComponents = event.target.checked;
  syncInputs();
  render();
});

refs.showMarkersToggle.addEventListener("change", (event) => {
  state.showMarkers = event.target.checked;
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

syncInputs();
render();
cancelAnimationFrame(animationFrame);
animationFrame = requestAnimationFrame(animate);
