(function () {
  const state = { wavelength: 600, slit: 0.30, screen: 1.20, mode: "spacing", showWaves: true, showPath: true, showLabels: true };
  const refs = {
    canvas: document.getElementById("doubleSlitCanvas"), reset: document.getElementById("resetButton"),
    wavelengthInput: document.getElementById("wavelengthInput"), wavelengthNumber: document.getElementById("wavelengthNumber"), wavelengthValue: document.getElementById("wavelengthValue"),
    slitInput: document.getElementById("slitInput"), slitNumber: document.getElementById("slitNumber"), slitValue: document.getElementById("slitValue"),
    screenInput: document.getElementById("screenInput"), screenNumber: document.getElementById("screenNumber"), screenValue: document.getElementById("screenValue"),
    spacingMetric: document.getElementById("spacingMetric"), pathMetric: document.getElementById("pathMetric"), wavelengthMetric: document.getElementById("wavelengthMetric"), slitMetric: document.getElementById("slitMetric"), screenMetric: document.getElementById("screenMetric"), orderMetric: document.getElementById("orderMetric"),
    brightValue: document.getElementById("brightCardValue"), darkValue: document.getElementById("darkCardValue"), stateLabel: document.getElementById("stateLabel"), stateNote: document.getElementById("stateNote"), overviewSpacing: document.getElementById("overviewSpacing"), overviewOrder: document.getElementById("overviewOrder"), formulaNote: document.getElementById("formulaNote"), formulaReadout: document.getElementById("formulaReadout"),
    showWaves: document.getElementById("showWavesToggle"), showPath: document.getElementById("showPathToggle"), showLabels: document.getElementById("showLabelsToggle"), modeGoal: document.getElementById("modeGoal"), modePrompt: document.getElementById("modePrompt"), modeFormula: document.getElementById("modeFormula"), presetTitle: document.getElementById("presetTitle"), buttons: Array.from(document.querySelectorAll(".preset-button")), cards: Array.from(document.querySelectorAll(".critical-card[data-jump]"))
  };
  const ctx = refs.canvas.getContext("2d"); const width = 980; const height = 560; const dpr = window.devicePixelRatio || 1; refs.canvas.width = width * dpr; refs.canvas.height = height * dpr; ctx.scale(dpr, dpr);
  const configs = {
    spacing: { title: "条纹间距", goal: "观察条纹间距的变化", prompt: "先固定双缝和屏距，改变波长，比较相邻亮纹之间的距离。", formula: "\\(\\beta=\\frac{\\lambda L}{d}\\)" },
    path: { title: "路程差", goal: "用路程差判断明暗条纹", prompt: "拖动屏上观察位置，比较路程差与波长的关系，判断此处是亮纹还是暗纹。", formula: "\\(\\Delta r=d\\sin\\theta\\)" },
    compare: { title: "参数比较", goal: "比较三个参数对条纹的影响", prompt: "每次只改变一个参数，观察条纹间距和强度分布如何响应。", formula: "\\(\\beta\\propto\\frac{\\lambda L}{d}\\)" }
  };
  function derived() { const lambda = state.wavelength * 1e-9; const d = state.slit * 1e-3; const beta = lambda * state.screen / d; return { beta, lambda, d }; }
  function intensity(x) { const { beta } = derived(); return Math.pow(Math.cos(Math.PI * x / beta), 2); }
  function drawText(text, x, y, color = "#121f24", size = 13, weight = "400") { ctx.fillStyle = color; ctx.font = `${weight} ${size}px Avenir Next, PingFang SC, sans-serif`; ctx.fillText(text, x, y); }
  function draw() {
    const d = derived(); const split = { x: 285, y: 270 }; const screenX = 720; const graph = { x: 470, y: 350, w: 420, h: 150 };
    ctx.clearRect(0, 0, width, height); ctx.fillStyle = "#fbfcfa"; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#eaf5fb"; ctx.fillRect(28, 30, 380, 450); ctx.fillStyle = "#f4f8f4"; ctx.fillRect(430, 30, 520, 450);
    ctx.strokeStyle = "rgba(18,31,36,.13)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(split.x, 50); ctx.lineTo(split.x, 490); ctx.stroke(); ctx.beginPath(); ctx.moveTo(screenX, 50); ctx.lineTo(screenX, 490); ctx.stroke();
    ctx.fillStyle = "#121f24"; ctx.fillRect(split.x - 8, split.y - 58, 16, 42); ctx.fillRect(split.x - 8, split.y + 16, 16, 42);
    ctx.fillStyle = "#0d7168"; ctx.fillRect(screenX - 4, 62, 8, 416);
    if (refs.showLabels.checked) { drawText("相干光源", 58, 78, "#5c686d", 13, "700"); drawText("双缝", split.x - 18, 145, "#5c686d", 13, "700"); drawText("观察屏", screenX - 24, 50, "#5c686d", 13, "700"); }
    ctx.fillStyle = "#c96b29"; ctx.beginPath(); ctx.arc(78, split.y, 9, 0, Math.PI * 2); ctx.fill();
    for (let sy of [split.y - 38, split.y + 38]) { ctx.strokeStyle = "#c96b29"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(90, split.y); ctx.lineTo(split.x - 8, sy); ctx.stroke(); if (refs.showWaves.checked) { for (let r = 45; r < 230; r += 38) { ctx.strokeStyle = "rgba(201,107,41,.18)"; ctx.beginPath(); ctx.arc(90, split.y, r, -0.5, 0.5); ctx.stroke(); } } }
    const maxBeta = Math.max(d.beta, 0.001); for (let i = -12; i <= 12; i += 1) { const y = split.y + i * Math.min(16, 150 * d.beta / 0.0024); const val = intensity(i * d.beta); ctx.fillStyle = `rgba(13,113,104,${0.18 + val * 0.76})`; ctx.fillRect(screenX - 16, y - 5, 32, 10); }
    ctx.strokeStyle = "rgba(123,63,160,.55)"; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(screenX, split.y); ctx.lineTo(screenX, split.y + 180); ctx.stroke(); ctx.setLineDash([]);
    drawText("屏上亮暗条纹", 752, 80, "#0d7168", 14, "700");
    ctx.strokeStyle = "rgba(18,31,36,.16)"; ctx.strokeRect(graph.x, graph.y, graph.w, graph.h); drawText("屏上强度 I", graph.x, graph.y - 10, "#5c686d", 13, "700"); drawText("位置 y", graph.x + graph.w - 42, graph.y + graph.h + 24, "#5c686d", 12);
    ctx.beginPath(); for (let i = 0; i <= 240; i += 1) { const x = -6 * d.beta + (12 * d.beta * i) / 240; const px = graph.x + (i / 240) * graph.w; const py = graph.y + graph.h - intensity(x) * (graph.h - 18); if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.strokeStyle = "#0d7168"; ctx.lineWidth = 2.5; ctx.stroke();
    if (refs.showPath.checked) { drawText(`β = ${(d.beta * 1000).toFixed(2)} mm`, 48, 455, "#0d7168", 14, "700"); drawText("中央亮纹", screenX + 12, split.y + 5, "#7b3fa0", 12); }
  }
  function sync() {
    const d = derived(); const betaMm = d.beta * 1000; const path = state.mode === "path" ? 0.5 : 0; const order = state.mode === "path" ? 1 : 0; const cfg = configs[state.mode];
    refs.wavelengthValue.textContent = `${state.wavelength} nm`; refs.slitValue.textContent = `${state.slit.toFixed(2)} mm`; refs.screenValue.textContent = `${state.screen.toFixed(2)} m`; refs.spacingMetric.textContent = `${betaMm.toFixed(2)} mm`; refs.pathMetric.textContent = `${path.toFixed(2)} λ`; refs.wavelengthMetric.textContent = `${state.wavelength} nm`; refs.slitMetric.textContent = `${state.slit.toFixed(2)} mm`; refs.screenMetric.textContent = `${state.screen.toFixed(2)} m`; refs.orderMetric.textContent = `m = ${order}`; refs.brightValue.textContent = `β = ${betaMm.toFixed(2)} mm`; refs.darkValue.textContent = `β/2 = ${(betaMm / 2).toFixed(2)} mm`; refs.overviewSpacing.textContent = `β ${betaMm.toFixed(2)} mm`; refs.overviewOrder.textContent = `m = ${order}`;
    refs.stateLabel.textContent = state.mode === "path" ? "正在检查路程差" : "条纹清晰"; refs.stateNote.textContent = state.mode === "path" ? "观察位置改变时，路程差决定相位差和明暗。" : "中央亮纹位于屏幕中线，两侧亮纹近似等间距。"; refs.formulaNote.textContent = `计算值：${state.wavelength} nm × ${state.screen.toFixed(2)} m ÷ ${state.slit.toFixed(2)} mm = ${betaMm.toFixed(2)} mm`; refs.formulaReadout.textContent = cfg.formula; refs.modeGoal.textContent = cfg.goal; refs.modePrompt.textContent = cfg.prompt; refs.modeFormula.textContent = cfg.formula; refs.presetTitle.textContent = cfg.title;
    refs.wavelengthInput.value = state.wavelength; refs.wavelengthNumber.value = state.wavelength; refs.slitInput.value = state.slit; refs.slitNumber.value = state.slit; refs.screenInput.value = state.screen; refs.screenNumber.value = state.screen; refs.buttons.forEach((button) => button.classList.toggle("active", button.dataset.mode === state.mode)); window.physicsTypesetMath?.(); draw();
  }
  function bind(key, input, number) { const update = (event) => { const value = Number(event.target.value); if (Number.isFinite(value)) state[key] = Math.min(Number(input.max), Math.max(Number(input.min), value)); sync(); }; input.addEventListener("input", update); number.addEventListener("input", update); number.addEventListener("change", update); }
  bind("wavelength", refs.wavelengthInput, refs.wavelengthNumber); bind("slit", refs.slitInput, refs.slitNumber); bind("screen", refs.screenInput, refs.screenNumber);
  [["showWaves", refs.showWaves], ["showPath", refs.showPath], ["showLabels", refs.showLabels]].forEach(([key, control]) => control.addEventListener("change", () => { state[key] = control.checked; sync(); }));
  refs.buttons.forEach((button) => button.addEventListener("click", () => { state.mode = button.dataset.mode; sync(); })); refs.cards.forEach((card) => { const selectCard = () => { state.mode = card.dataset.jump === "dark" ? "path" : "spacing"; sync(); }; card.addEventListener("click", selectCard); card.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectCard(); } }); });
  refs.reset.addEventListener("click", () => { Object.assign(state, { wavelength: 600, slit: 0.30, screen: 1.20, mode: "spacing", showWaves: true, showPath: true, showLabels: true }); sync(); }); sync();
})();
