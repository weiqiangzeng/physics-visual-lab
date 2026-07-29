const ohmState = {
  voltage: 6,
  resistance: 3,
  running: false,
  phase: 0
};

const ohmRefs = {
  canvas: document.getElementById("ohmCanvas"),
  startButton: document.getElementById("startButton"),
  pauseButton: document.getElementById("pauseButton"),
  resetButton: document.getElementById("resetButton"),
  voltageInput: document.getElementById("voltageInput"),
  voltageNumber: document.getElementById("voltageNumber"),
  resistanceInput: document.getElementById("resistanceInput"),
  resistanceNumber: document.getElementById("resistanceNumber"),
  voltageValue: document.getElementById("voltageValue"),
  resistanceValue: document.getElementById("resistanceValue"),
  voltageMetric: document.getElementById("voltageMetric"),
  resistanceMetric: document.getElementById("resistanceMetric"),
  currentMetric: document.getElementById("currentMetric"),
  powerMetric: document.getElementById("powerMetric"),
  overviewCurrent: document.getElementById("overviewCurrent")
};

const ohmCtx = ohmRefs.canvas.getContext("2d");
const ohmWidth = 980;
const ohmHeight = 540;
const ohmDpr = window.devicePixelRatio || 1;
ohmRefs.canvas.width = ohmWidth * ohmDpr;
ohmRefs.canvas.height = ohmHeight * ohmDpr;
ohmCtx.scale(ohmDpr, ohmDpr);

function ohmValues() {
  const current = ohmState.voltage / ohmState.resistance;
  return { current, power: ohmState.voltage * current };
}

function ohmClamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function ohmFormat(value, unit) {
  return `${value.toFixed(2)} ${unit}`;
}

function ohmLine(x1, y1, x2, y2, color = "#1a2b31", width = 2) {
  ohmCtx.strokeStyle = color;
  ohmCtx.lineWidth = width;
  ohmCtx.beginPath();
  ohmCtx.moveTo(x1, y1);
  ohmCtx.lineTo(x2, y2);
  ohmCtx.stroke();
}

function ohmText(text, x, y, size = 13, color = "#607075", weight = "400") {
  ohmCtx.fillStyle = color;
  ohmCtx.font = `${weight} ${size}px Avenir Next, PingFang SC, sans-serif`;
  ohmCtx.fillText(text, x, y);
}

function ohmArrow(x1, y1, x2, y2, color) {
  ohmLine(x1, y1, x2, y2, color, 2.5);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ohmCtx.fillStyle = color;
  ohmCtx.beginPath();
  ohmCtx.moveTo(x2, y2);
  ohmCtx.lineTo(x2 - 9 * Math.cos(angle - Math.PI / 6), y2 - 9 * Math.sin(angle - Math.PI / 6));
  ohmCtx.lineTo(x2 - 9 * Math.cos(angle + Math.PI / 6), y2 - 9 * Math.sin(angle + Math.PI / 6));
  ohmCtx.closePath();
  ohmCtx.fill();
}

function ohmCircuitPoint(distance) {
  const left = 105;
  const top = 130;
  const right = 455;
  const bottom = 370;
  const segments = [right - left, bottom - top, right - left, bottom - top];
  const perimeter = segments.reduce((sum, item) => sum + item, 0);
  let remaining = ((distance % perimeter) + perimeter) % perimeter;
  if (remaining <= segments[0]) return { x: left + remaining, y: top };
  remaining -= segments[0];
  if (remaining <= segments[1]) return { x: right, y: top + remaining };
  remaining -= segments[1];
  if (remaining <= segments[2]) return { x: right - remaining, y: bottom };
  remaining -= segments[2];
  return { x: left, y: bottom - remaining };
}

function ohmDrawCircuit(values) {
  const left = 105;
  const top = 130;
  const right = 455;
  const bottom = 370;
  const wire = "#315057";
  ohmLine(left, top, 250, top, wire, 3);
  ohmLine(360, top, right, top, wire, 3);
  ohmLine(right, top, right, bottom, wire, 3);
  ohmLine(right, bottom, left, bottom, wire, 3);
  ohmLine(left, bottom, left, 290, wire, 3);
  ohmLine(left, 210, left, top, wire, 3);

  ohmCtx.strokeStyle = "#147d73";
  ohmCtx.lineWidth = 3;
  ohmCtx.strokeRect(250, 108, 110, 44);
  ohmText("R", 299, 137, 17, "#147d73", "700");
  ohmText(`${ohmState.resistance.toFixed(1)} Ω`, 271, 90, 13, "#607075");

  ohmCtx.strokeStyle = "#1f78b4";
  ohmCtx.lineWidth = 3;
  ohmCtx.beginPath();
  ohmCtx.arc(right, 250, 38, 0, Math.PI * 2);
  ohmCtx.stroke();
  ohmText("A", right - 7, 257, 20, "#1f78b4", "700");
  ohmText("电流表", right - 25, 306, 13);

  ohmLine(left - 20, 230, left + 20, 230, "#7b3fa0", 4);
  ohmLine(left - 11, 270, left + 11, 270, "#7b3fa0", 2);
  ohmText("U", left - 6, 258, 16, "#7b3fa0", "700");
  ohmText(`${ohmState.voltage.toFixed(1)} V`, left - 26, 306, 13);

  const flowColor = values.current > 0 ? "#c96b29" : "#a4afb2";
  ohmArrow(150, 106, 210, 106, flowColor);
  ohmText("约定电流方向", 106, 82, 12, "#607075");
  if (values.current > 0) {
    const count = 7;
    for (let index = 0; index < count; index += 1) {
      const point = ohmCircuitPoint(ohmState.phase * 260 * Math.min(values.current, 3) + index * 145);
      ohmCtx.fillStyle = "#c96b29";
      ohmCtx.beginPath();
      ohmCtx.arc(point.x, point.y, 4.5, 0, Math.PI * 2);
      ohmCtx.fill();
    }
  }
  ohmText("电路图", 105, 432, 15, "#1a2b31", "700");
  ohmText("动画只表示约定电流方向；读数由 U、R 实时计算。", 105, 456, 12);
}

function ohmNiceCeil(value) {
  const base = 10 ** Math.floor(Math.log10(Math.max(value, 0.01)));
  return Math.ceil(value / base) * base;
}

function ohmDrawGraph(values) {
  const x = 570;
  const y = 92;
  const graphWidth = 330;
  const graphHeight = 330;
  const xMax = 12;
  const yMax = ohmNiceCeil(12 / ohmState.resistance * 1.18);
  const mapX = (voltage) => x + (voltage / xMax) * graphWidth;
  const mapY = (current) => y + graphHeight - (current / yMax) * graphHeight;

  for (let index = 0; index <= 6; index += 1) {
    const px = x + (index / 6) * graphWidth;
    const py = y + graphHeight - (index / 6) * graphHeight;
    ohmLine(px, y, px, y + graphHeight, "rgba(26,43,49,.07)", 1);
    ohmLine(x, py, x + graphWidth, py, "rgba(26,43,49,.07)", 1);
    ohmText((xMax * index / 6).toFixed(index === 0 ? 0 : 1), px - 8, y + graphHeight + 20, 11);
    ohmText((yMax * index / 6).toFixed(2), x - 43, py + 4, 11);
  }
  ohmLine(x, y, x, y + graphHeight, "#50636a", 1.5);
  ohmLine(x, y + graphHeight, x + graphWidth, y + graphHeight, "#50636a", 1.5);
  ohmText("I / A", x, y - 15, 14, "#1a2b31", "700");
  ohmText("U / V", x + graphWidth - 34, y + graphHeight + 42, 14, "#1a2b31", "700");
  ohmText("I-U 图像（当前 R）", x, y - 44, 15, "#1a2b31", "700");

  ohmLine(mapX(0), mapY(0), mapX(xMax), mapY(xMax / ohmState.resistance), "#147d73", 3);
  ohmCtx.setLineDash([5, 5]);
  ohmLine(mapX(ohmState.voltage), y + graphHeight, mapX(ohmState.voltage), mapY(values.current), "rgba(31,120,180,.75)", 1.5);
  ohmLine(x, mapY(values.current), mapX(ohmState.voltage), mapY(values.current), "rgba(31,120,180,.75)", 1.5);
  ohmCtx.setLineDash([]);
  ohmCtx.fillStyle = "#c96b29";
  ohmCtx.beginPath();
  ohmCtx.arc(mapX(ohmState.voltage), mapY(values.current), 6.5, 0, Math.PI * 2);
  ohmCtx.fill();
  ohmText(`(${ohmState.voltage.toFixed(1)} V, ${values.current.toFixed(2)} A)`, x + 12, y + graphHeight + 68, 12, "#607075");
}

function ohmDraw() {
  const values = ohmValues();
  ohmCtx.clearRect(0, 0, ohmWidth, ohmHeight);
  ohmCtx.fillStyle = "#fbfcfa";
  ohmCtx.fillRect(0, 0, ohmWidth, ohmHeight);
  ohmDrawCircuit(values);
  ohmDrawGraph(values);
}

function ohmSync() {
  const values = ohmValues();
  ohmRefs.voltageInput.value = ohmState.voltage;
  ohmRefs.voltageNumber.value = ohmState.voltage;
  ohmRefs.resistanceInput.value = ohmState.resistance;
  ohmRefs.resistanceNumber.value = ohmState.resistance;
  ohmRefs.voltageValue.textContent = ohmFormat(ohmState.voltage, "V");
  ohmRefs.resistanceValue.textContent = ohmFormat(ohmState.resistance, "Ω");
  ohmRefs.voltageMetric.textContent = ohmFormat(ohmState.voltage, "V");
  ohmRefs.resistanceMetric.textContent = ohmFormat(ohmState.resistance, "Ω");
  ohmRefs.currentMetric.textContent = ohmFormat(values.current, "A");
  ohmRefs.powerMetric.textContent = ohmFormat(values.power, "W");
  ohmRefs.overviewCurrent.textContent = ohmFormat(values.current, "A");
  ohmRefs.startButton.textContent = ohmState.running ? "运行中" : "开始";
  ohmDraw();
}

function ohmSetParameter(key, rawValue) {
  const input = key === "voltage" ? ohmRefs.voltageInput : ohmRefs.resistanceInput;
  const value = Number(rawValue);
  if (!Number.isFinite(value)) return;
  ohmState[key] = ohmClamp(value, Number(input.min), Number(input.max));
  ohmSync();
}

function ohmBindParameter(key, range, number) {
  range.addEventListener("input", () => ohmSetParameter(key, range.value));
  number.addEventListener("change", () => ohmSetParameter(key, number.value));
  number.addEventListener("blur", () => ohmSetParameter(key, number.value));
}

ohmBindParameter("voltage", ohmRefs.voltageInput, ohmRefs.voltageNumber);
ohmBindParameter("resistance", ohmRefs.resistanceInput, ohmRefs.resistanceNumber);
ohmRefs.startButton.addEventListener("click", () => { ohmState.running = true; ohmSync(); });
ohmRefs.pauseButton.addEventListener("click", () => { ohmState.running = false; ohmSync(); });
ohmRefs.resetButton.addEventListener("click", () => { ohmState.voltage = 6; ohmState.resistance = 3; ohmState.running = false; ohmState.phase = 0; ohmSync(); });

let ohmPreviousFrame = performance.now();
function ohmAnimate(now) {
  const dt = Math.min((now - ohmPreviousFrame) / 1000, 0.05);
  ohmPreviousFrame = now;
  if (ohmState.running) {
    ohmState.phase += dt;
    ohmDraw();
  }
  requestAnimationFrame(ohmAnimate);
}

ohmSync();
requestAnimationFrame(ohmAnimate);
