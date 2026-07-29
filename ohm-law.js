const ohmState = {
  mode: "voltage",
  commonValue: 6,
  compareValue: 6
};

const ohmModeConfig = {
  voltage: {
    title: "保持电阻相同",
    badge: "I 同比变化",
    baseline: "Uₐ = 3.00 V",
    commonLabel: "共同电阻",
    commonMath: "\\(R / \\Omega\\)",
    commonUnit: "Ω",
    commonMin: 1,
    commonMax: 12,
    compareLabel: "电路 B 电压",
    compareMath: "\\(U_B / \\mathrm{V}\\)",
    compareUnit: "V",
    compareMin: 0,
    compareMax: 12,
    changedRatioLabel: "电压倍数",
    conclusion: "电阻相同时，电流随电压同比例变化。",
    formula: "\\(R\\text{ 相同}:\\ \\frac{I_B}{I_A}=\\frac{U_B}{U_A}\\)"
  },
  resistance: {
    title: "保持电压相同",
    badge: "I 反比变化",
    baseline: "Rₐ = 3.00 Ω",
    commonLabel: "共同电压",
    commonMath: "\\(U / \\mathrm{V}\\)",
    commonUnit: "V",
    commonMin: 1,
    commonMax: 12,
    compareLabel: "电路 B 电阻",
    compareMath: "\\(R_B / \\Omega\\)",
    compareUnit: "Ω",
    compareMin: 1,
    compareMax: 12,
    changedRatioLabel: "电阻倍数",
    conclusion: "电压相同时，电流随电阻增大而减小。",
    formula: "\\(U\\text{ 相同}:\\ \\frac{I_B}{I_A}=\\frac{R_A}{R_B}\\)"
  }
};

const ohmRefs = {
  canvas: document.getElementById("ohmCanvas"),
  resetButton: document.getElementById("resetButton"),
  modeButtons: Array.from(document.querySelectorAll("[data-mode]")),
  controlTitle: document.getElementById("controlTitle"),
  overviewRelation: document.getElementById("overviewRelation"),
  baselineText: document.getElementById("baselineText"),
  commonLabel: document.getElementById("commonLabel"),
  commonMath: document.getElementById("commonMath"),
  commonValue: document.getElementById("commonValue"),
  commonInput: document.getElementById("commonInput"),
  commonNumber: document.getElementById("commonNumber"),
  commonUnit: document.getElementById("commonUnit"),
  compareLabel: document.getElementById("compareLabel"),
  compareMath: document.getElementById("compareMath"),
  compareValue: document.getElementById("compareValue"),
  compareInput: document.getElementById("compareInput"),
  compareNumber: document.getElementById("compareNumber"),
  compareUnit: document.getElementById("compareUnit"),
  changedRatioLabel: document.getElementById("changedRatioLabel"),
  changedRatio: document.getElementById("changedRatio"),
  currentRatio: document.getElementById("currentRatio"),
  conclusionText: document.getElementById("conclusionText"),
  circuitAMetric: document.getElementById("circuitAMetric"),
  circuitBMetric: document.getElementById("circuitBMetric"),
  relationFormula: document.getElementById("relationFormula")
};

const ohmCtx = ohmRefs.canvas.getContext("2d");
const ohmDpr = window.devicePixelRatio || 1;
let ohmWidth = 980;
let ohmHeight = 520;
let ohmCompact = false;
let ohmCanvasMode = null;
let ohmRenderedMode = null;

function ohmConfigureCanvas() {
  const compact = window.matchMedia("(max-width: 760px)").matches;
  if (compact === ohmCanvasMode) return;
  ohmCanvasMode = compact;
  ohmCompact = compact;
  ohmWidth = compact ? 440 : 980;
  ohmHeight = compact ? 940 : 520;
  ohmRefs.canvas.width = ohmWidth * ohmDpr;
  ohmRefs.canvas.height = ohmHeight * ohmDpr;
  ohmCtx.setTransform(ohmDpr, 0, 0, ohmDpr, 0, 0);
}

function ohmClamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function ohmFormat(value, unit) {
  return `${value.toFixed(2)} ${unit}`;
}

function ohmLine(x1, y1, x2, y2, color = "#315057", width = 2) {
  ohmCtx.strokeStyle = color;
  ohmCtx.lineWidth = width;
  ohmCtx.beginPath();
  ohmCtx.moveTo(x1, y1);
  ohmCtx.lineTo(x2, y2);
  ohmCtx.stroke();
}

function ohmText(text, x, y, size = 13, color = "#607075", weight = "400", align = "left") {
  ohmCtx.fillStyle = color;
  ohmCtx.font = `${weight} ${size}px Avenir Next, PingFang SC, sans-serif`;
  ohmCtx.textAlign = align;
  ohmCtx.fillText(text, x, y);
  ohmCtx.textAlign = "left";
}

function ohmNiceScale(value) {
  const target = Math.max(value * 1.12, 0.2);
  const exponent = 10 ** Math.floor(Math.log10(target));
  const normalized = target / exponent;
  const factor = [1, 2, 2.5, 5, 10].find((item) => item >= normalized) || 10;
  return factor * exponent;
}

function ohmDrawBattery(x, y) {
  ohmLine(x - 20, y, x + 20, y, "#7b3fa0", 4);
  ohmLine(x - 11, y + 30, x + 11, y + 30, "#7b3fa0", 2);
  ohmText("+", x + 27, y + 5, 14, "#7b3fa0", "700");
  ohmText("−", x + 27, y + 36, 14, "#7b3fa0", "700");
}

function ohmDrawAmmeterSymbol(x, y) {
  ohmCtx.strokeStyle = "#1f78b4";
  ohmCtx.lineWidth = 2.5;
  ohmCtx.beginPath();
  ohmCtx.arc(x, y, 25, 0, Math.PI * 2);
  ohmCtx.stroke();
  ohmText("A", x, y + 7, 18, "#1f78b4", "700", "center");
}

function ohmDrawGauge(cx, cy, radius, current, scaleMax) {
  ohmCtx.strokeStyle = "rgba(49,80,87,.28)";
  ohmCtx.lineWidth = 2;
  ohmCtx.beginPath();
  ohmCtx.arc(cx, cy, radius, Math.PI, Math.PI * 2);
  ohmCtx.stroke();

  for (let index = 0; index <= 5; index += 1) {
    const ratio = index / 5;
    const angle = Math.PI + ratio * Math.PI;
    const outerX = cx + Math.cos(angle) * radius;
    const outerY = cy + Math.sin(angle) * radius;
    const innerX = cx + Math.cos(angle) * (radius - 11);
    const innerY = cy + Math.sin(angle) * (radius - 11);
    ohmLine(innerX, innerY, outerX, outerY, "#607075", 1.5);
    ohmText((scaleMax * ratio).toFixed(scaleMax < 1 ? 2 : 1), cx + Math.cos(angle) * (radius - 28), cy + Math.sin(angle) * (radius - 28) + 4, 10, "#607075", "400", "center");
  }

  const normalized = ohmClamp(current / scaleMax, 0, 1);
  const needleAngle = Math.PI + normalized * Math.PI;
  ohmLine(cx, cy, cx + Math.cos(needleAngle) * (radius - 18), cy + Math.sin(needleAngle) * (radius - 18), "#c96b29", 3);
  ohmCtx.fillStyle = "#c96b29";
  ohmCtx.beginPath();
  ohmCtx.arc(cx, cy, 6, 0, Math.PI * 2);
  ohmCtx.fill();
  ohmText(`${current.toFixed(2)} A`, cx, cy + 27, 16, "#1a2b31", "700", "center");
}

function ohmDrawCircuitPanel(x, panelY, label, circuit, scaleMax, changedKey) {
  const panelWidth = 420;
  const panelHeight = 410;
  ohmCtx.fillStyle = label === "A" ? "rgba(31,120,180,.045)" : "rgba(13,113,104,.055)";
  ohmCtx.strokeStyle = label === "A" ? "rgba(31,120,180,.24)" : "rgba(13,113,104,.28)";
  ohmCtx.lineWidth = 1.5;
  ohmCtx.fillRect(x, panelY, panelWidth, panelHeight);
  ohmCtx.strokeRect(x, panelY, panelWidth, panelHeight);

  ohmText(`电路 ${label}`, x + 24, panelY + 35, 18, "#1a2b31", "700");
  const voltageColor = changedKey === "voltage" ? "#7b3fa0" : "#607075";
  const resistanceColor = changedKey === "resistance" ? "#147d73" : "#607075";
  ohmText(`U = ${circuit.voltage.toFixed(2)} V`, x + 24, panelY + 62, 13, voltageColor, "700");
  ohmText(`R = ${circuit.resistance.toFixed(2)} Ω`, x + 210, panelY + 62, 13, resistanceColor, "700");

  const left = x + 62;
  const right = x + 358;
  const top = panelY + 106;
  const bottom = panelY + 191;
  ohmLine(left, top, x + 166, top);
  ohmCtx.strokeStyle = "#147d73";
  ohmCtx.lineWidth = 2.5;
  ohmCtx.strokeRect(x + 166, top - 18, 88, 36);
  ohmText("R", x + 210, top + 6, 15, "#147d73", "700", "center");
  ohmLine(x + 254, top, right - 25, top);
  ohmDrawAmmeterSymbol(right, top);
  ohmLine(right + 25, top, right + 25, bottom);
  ohmLine(right + 25, bottom, left, bottom);
  ohmLine(left, bottom, left, top + 55);
  ohmLine(left, top + 25, left, top);
  ohmDrawBattery(left, top + 25);

  ohmText("同一量程电流表", x + panelWidth / 2, panelY + 239, 12, "#607075", "400", "center");
  ohmDrawGauge(x + panelWidth / 2, panelY + 348, 82, circuit.current, scaleMax);
}

function ohmDraw() {
  ohmConfigureCanvas();
  const result = OhmLawModel.calculate(ohmState.mode, ohmState.commonValue, ohmState.compareValue);
  const config = ohmModeConfig[ohmState.mode];
  const possibleMax = ohmState.mode === "voltage"
    ? config.compareMax / ohmState.commonValue
    : ohmState.commonValue / config.compareMin;
  const scaleMax = ohmNiceScale(Math.max(result.a.current, result.b.current, possibleMax));

  ohmCtx.clearRect(0, 0, ohmWidth, ohmHeight);
  ohmCtx.fillStyle = "#fbfcfa";
  ohmCtx.fillRect(0, 0, ohmWidth, ohmHeight);
  ohmText(`两只电流表共用 0–${scaleMax.toFixed(scaleMax < 1 ? 2 : 1)} A 量程`, ohmWidth / 2, 34, 13, "#607075", "600", "center");
  if (ohmCompact) {
    ohmDrawCircuitPanel(10, 48, "A", result.a, scaleMax, ohmState.mode);
    ohmDrawCircuitPanel(10, 488, "B", result.b, scaleMax, ohmState.mode);
  } else {
    ohmDrawCircuitPanel(40, 64, "A", result.a, scaleMax, ohmState.mode);
    ohmDrawCircuitPanel(520, 64, "B", result.b, scaleMax, ohmState.mode);
  }
}

function ohmApplyInputConfig(input, numberInput, min, max, value) {
  [input, numberInput].forEach((element) => {
    element.min = min;
    element.max = max;
    element.step = 0.1;
    element.value = value;
  });
}

function ohmSync() {
  const config = ohmModeConfig[ohmState.mode];
  const result = OhmLawModel.calculate(ohmState.mode, ohmState.commonValue, ohmState.compareValue);

  if (ohmRenderedMode !== ohmState.mode) {
    ohmRenderedMode = ohmState.mode;
    ohmRefs.modeButtons.forEach((button) => {
      const active = button.dataset.mode === ohmState.mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    ohmRefs.controlTitle.textContent = config.title;
    ohmRefs.overviewRelation.textContent = config.badge;
    ohmRefs.baselineText.textContent = config.baseline;
    ohmRefs.commonLabel.textContent = config.commonLabel;
    ohmRefs.commonMath.textContent = config.commonMath;
    ohmRefs.commonUnit.textContent = config.commonUnit;
    ohmRefs.compareLabel.textContent = config.compareLabel;
    ohmRefs.compareMath.textContent = config.compareMath;
    ohmRefs.compareUnit.textContent = config.compareUnit;
    ohmRefs.changedRatioLabel.textContent = config.changedRatioLabel;
    ohmRefs.conclusionText.textContent = config.conclusion;
    ohmRefs.relationFormula.textContent = config.formula;
    if (window.physicsTypesetMath) window.physicsTypesetMath();
  }
  ohmRefs.changedRatio.textContent = `${result.changedRatio.toFixed(2)} 倍`;
  ohmRefs.currentRatio.textContent = `${result.currentRatio.toFixed(2)} 倍`;
  ohmRefs.commonValue.textContent = ohmFormat(ohmState.commonValue, config.commonUnit);
  ohmRefs.compareValue.textContent = ohmFormat(ohmState.compareValue, config.compareUnit);
  ohmRefs.circuitAMetric.textContent = `U = ${ohmFormat(result.a.voltage, "V")}　R = ${ohmFormat(result.a.resistance, "Ω")}　I = ${ohmFormat(result.a.current, "A")}`;
  ohmRefs.circuitBMetric.textContent = `U = ${ohmFormat(result.b.voltage, "V")}　R = ${ohmFormat(result.b.resistance, "Ω")}　I = ${ohmFormat(result.b.current, "A")}`;
  ohmApplyInputConfig(ohmRefs.commonInput, ohmRefs.commonNumber, config.commonMin, config.commonMax, ohmState.commonValue);
  ohmApplyInputConfig(ohmRefs.compareInput, ohmRefs.compareNumber, config.compareMin, config.compareMax, ohmState.compareValue);
  ohmDraw();
}

function ohmSetValue(key, rawValue) {
  const config = ohmModeConfig[ohmState.mode];
  const min = key === "commonValue" ? config.commonMin : config.compareMin;
  const max = key === "commonValue" ? config.commonMax : config.compareMax;
  const value = Number(rawValue);
  if (!Number.isFinite(value)) return;
  ohmState[key] = ohmClamp(value, min, max);
  ohmSync();
}

function ohmBindValue(key, range, numberInput) {
  range.addEventListener("input", () => ohmSetValue(key, range.value));
  numberInput.addEventListener("change", () => ohmSetValue(key, numberInput.value));
  numberInput.addEventListener("blur", () => ohmSetValue(key, numberInput.value));
}

ohmRefs.modeButtons.forEach((button) => button.addEventListener("click", () => {
  ohmState.mode = button.dataset.mode;
  ohmState.commonValue = 6;
  ohmState.compareValue = 6;
  ohmSync();
}));
ohmBindValue("commonValue", ohmRefs.commonInput, ohmRefs.commonNumber);
ohmBindValue("compareValue", ohmRefs.compareInput, ohmRefs.compareNumber);
ohmRefs.resetButton.addEventListener("click", () => {
  ohmState.mode = "voltage";
  ohmState.commonValue = 6;
  ohmState.compareValue = 6;
  ohmSync();
});
window.addEventListener("resize", ohmDraw);

ohmSync();
